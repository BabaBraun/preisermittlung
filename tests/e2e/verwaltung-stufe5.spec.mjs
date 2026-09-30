/* Liegenschaftsverwaltung Stufe 5 im Browser: Miete sichtbar (Schnellerfassung, Überblick, Einheiten), Mieterhöhung
   mit Schreiben, Kontoauszug-Import, Jahresbericht/Anlage V, Dokumente. Sollwerte von Hand hergeleitet (Rechenweg
   im Kommentar); den Rechenkern prüft tests/unit/verwaltung-stufe5.test.mjs gegen die Python-Rechnung.
   Feste Uhr: 29.09.2026. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('docx, openpyxl');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const FAELLE = JSON.parse(readFileSync('tests/referenz/verwaltung_faelle.json', 'utf8'));
const lv = page => page.locator('#lv_overlay');
async function feld(page, id, wert) {
  const el = page.locator('#lvf_' + id);
  const art = await el.evaluate(e => e.tagName === 'SELECT' ? 'select' : e.type);
  if (art === 'select') await el.selectOption(typeof wert === 'object' ? wert : String(wert));
  else if (art === 'checkbox') { if (wert) await el.check(); else await el.uncheck(); }
  else await el.fill(String(wert));
}
async function verwaltungOeffnen(page) {
  await appOeffnen(page);
  await page.evaluate(() => lvOeffnen('uebersicht'));
  await expect(lv(page)).toBeVisible();
}
async function laden(page, l) {
  await page.evaluate(async x => { await lvStart(); await lvSpeichern(JSON.parse(JSON.stringify(x))); lvLiegenschaftOeffnen(x.id, 'ueberblick'); }, l);
}
const text = d => d.absaetze.map(a => a.text).join('\n') + '\n' + JSON.stringify(d.tabellen);

test('Neue Liegenschaft mit Mieter und Miete; Miete in Überblick und Einheiten; „Vermieten“ für leere Einheit', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await verwaltungOeffnen(page);
  await lv(page).getByRole('button', { name: 'Erste Liegenschaft anlegen' }).click();
  await feld(page, 'name', 'Kirchstraße 3'); await feld(page, 'strasse', 'Kirchstraße 3'); await feld(page, 'plz', '74072'); await feld(page, 'ort', 'Heilbronn');
  // unvollständig: Mieter ohne Kaltmiete → Meldung, nichts gespeichert
  await feld(page, 'q_mieter', 'Erika Beispiel');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('#lv_formfehler')).toContainText('Für den Mietvertrag fehlt: Mietbeginn, Nettokaltmiete');
  expect(await page.evaluate(() => LV.liste.length)).toBe(0);
  await feld(page, 'q_nr', 'W1'); await feld(page, 'q_flaeche', '80'); await feld(page, 'q_beginn', '2023-01-01');
  await feld(page, 'q_kalt', '800'); await feld(page, 'q_nk', '150'); await feld(page, 'q_hk', '90');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('mit Einheit, Mieter und Miete');
  // Überblick: 800 + 150 + 90 = 1.040 €; 800 / 80 m² = 10,00 €/m²; im Jahr 9.600 € kalt
  const mieten = lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: 'Mieten (Stand 29.09.2026)' }) });
  await expect(mieten).toContainText('Erika Beispiel');
  await expect(mieten).toContainText('800,00 €'); await expect(mieten).toContainText('1.040,00 €'); await expect(mieten).toContainText('10,00 €/m²');
  await expect(mieten).toContainText('Nettokaltmiete 9.600,00 €');
  // zweite Einheit ohne Mieter → „Vermieten“ öffnet den Vertrag mit vorgewählter Einheit
  await lv(page).locator('#lvt_einheiten').click();
  await lv(page).getByRole('button', { name: 'Einheit hinzufügen' }).click();
  await feld(page, 'nr', 'W2'); await feld(page, 'flaeche', '60'); await feld(page, 'sollmiete', '690');
  await lv(page).locator('.lv-formbox button.primary').click();
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  const tab = lv(page).locator('.lv-tbl');
  await expect(tab).toContainText('800,00 €'); await expect(tab).toContainText('1.040,00 €'); await expect(tab).toContainText('Ziel 690,00 €');
  await lv(page).getByRole('button', { name: 'Vermieten' }).click();
  await expect(lv(page).locator('#lvt_vertraege')).toHaveClass(/on/);
  const gewaehlt = await page.locator('#lvf_einheitId').evaluate(s => s.options[s.selectedIndex].text);
  expect(gewaehlt).toBe('W2');
  await keineSkriptfehler(page);
});

test('Mieterhöhung § 558: Heilbronn (Kappung 15 %), Schreiben als Word, nach Zustimmung eintragen', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python fehlt');
  page.on('dialog', d => d.accept());
  await verwaltungOeffnen(page);
  await laden(page, { id: 'LMH', name: 'Kirchstraße 3', strasse: 'Kirchstraße 3', plz: '74072', ort: 'Heilbronn', art: 'mfh',
    einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung', flaeche: 80 }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2023-01-01', mietart: 'fest', mieter: [{ name: 'Erika Beispiel' }], miete: { kalt: 800, nk: 150, hk: 90 } }] });
  await lv(page).locator('#lvt_mieterhoehung').click();
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('jetzt möglich');
  await lv(page).getByRole('button', { name: 'Prüfen' }).click();
  // Zugang 29.09.2026 → wirksam 01.12.2026; Kappung: 800 € (01.12.2023) × 1,15 = 920 €; Vergleich 11 €/m² × 80 = 880 € → 880 €
  await feld(page, 'mh_vqm', '11');
  await lv(page).getByRole('button', { name: 'Berechnen' }).click();
  const erg = lv(page).locator('#lv_mh_erg');
  await expect(erg).toContainText('Kappungsgrenze 15 %'); await expect(erg).toContainText('920,00 €');
  await expect(erg).toContainText('880,00 € (11,00 €/m²)'); await expect(erg).toContainText('80,00 € / Monat (+10 %)');
  await expect(erg).toContainText('01.12.2026'); await expect(erg).toContainText('30.11.2026');
  expect(await page.evaluate(() => LV.liste[0].einheiten[0].vergleichQm)).toBe(11);
  const [wort] = await Promise.all([page.waitForEvent('download'), erg.getByRole('button', { name: 'Schreiben (Word)' }).click()]);
  await wort.saveAs(AUSGABE + 'mieterhoehung.docx');
  const t = text(pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'mieterhoehung.docx']).docx);
  for (const s of ['Mieterhöhungsverlangen nach § 558 BGB', 'von bisher 800,00 € auf 880,00 €', 'ab dem 01.12.2026', 'bis zum 30.11.2026', 'Kappungsgrenze von 15 %', 'Zustimmung'])
    expect(t).toContain(s);
  await erg.getByRole('button', { name: 'Nach Zustimmung eintragen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Mieterhöhung zum 01.12.2026 eingetragen');
  const a = await page.evaluate(() => LV.liste[0].vertraege[0].aenderungen[0]);
  expect([a.ab, a.kalt, a.grund, a.zugang]).toEqual(['2026-12-01', 880, '558', '2026-09-29']);
  await lv(page).locator('#lvt_ueberblick').click();
  await expect(lv(page).locator('.hint', { hasText: 'Nächste Mietänderungen' })).toContainText('01.12.2026 · W1 · Kaltmiete 880,00 €');
  await keineSkriptfehler(page);
});

test('Kontoauszug importieren (CAMT): Vorschläge prüfen, buchen, zweiter Import erkennt Doppelte', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await verwaltungOeffnen(page);
  await laden(page, { id: 'LBK', name: 'Musterstraße 5', ort: 'Ilsfeld', art: 'mfh', iban: 'DE02120300000000202051',
    einheiten: [{ id: 'e1', nr: 'W1', flaeche: 72.5 }, { id: 'e2', nr: 'W2', flaeche: 64 }, { id: 'e3', nr: 'W3', flaeche: 48 }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2020-05-01', mieter: [{ name: 'Anna Muster' }], miete: { kalt: 800, nk: 180, hk: 110 } },
      { id: 'v2', einheitId: 'e2', beginn: '2025-03-01', mieter: [{ name: 'Bernd Beispiel' }], miete: { kalt: 700, nk: 160, hk: 95 } },
      { id: 'v3', einheitId: 'e3', beginn: '2025-08-01', mieter: [{ name: 'Dora Probe' }], miete: { kalt: 520, nk: 125, hk: 75 } }] });
  await lv(page).locator('#lvt_mietkonto').click();
  const [wahl] = await Promise.all([page.waitForEvent('filechooser'), lv(page).getByRole('button', { name: 'Kontoauszug importieren (CSV / CAMT)' }).click()]);
  await wahl.setFiles('tests/fixtures/camt053_beispiel.xml');
  const box = lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: 'Kontoauszug importieren' }) });
  await expect(box).toContainText('CAMT · Konto DE02 1203 0000 0000 2020 51 · 6 Umsätze');
  await expect(box.locator('.lv-import input[type=checkbox]:checked')).toHaveCount(4);   // drei Mieten und die Rücklastschrift
  await box.getByRole('button', { name: 'Ausgewählte buchen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('4 Zahlungen aus dem Kontoauszug gebucht');
  const z = await page.evaluate(() => LV.liste[0].zahlungen.map(x => [x.vertragId, x.betrag, x.monat]));
  expect(z).toEqual([['v1', 1090, '2026-03'], ['v2', 955, '2026-03'], ['v3', 720, ''], ['v2', -955, '2026-03']]);
  const [wahl2] = await Promise.all([page.waitForEvent('filechooser'), lv(page).getByRole('button', { name: 'Kontoauszug importieren (CSV / CAMT)' }).click()]);
  await wahl2.setFiles('tests/fixtures/camt053_beispiel.xml');
  await expect(box).toContainText('4 bereits gebucht');
  await expect(box.locator('.lv-import input[type=checkbox]:checked')).toHaveCount(0);
  await keineSkriptfehler(page);
});

test('Jahresbericht 2025: Zehn-Tage-Regel, Eigentümerbericht (Word), Anlage V (Excel)', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python fehlt');
  await verwaltungOeffnen(page);
  const f = FAELLE.jahresbericht[0];
  await laden(page, Object.assign({ id: 'LJB', name: 'Lindenweg 1', ort: 'Ilsfeld', art: 'wohnhaus', eigentuemerName: 'Testeigentümer' }, f.liegenschaft,
    { vertraege: f.liegenschaft.vertraege.map(v => Object.assign({ mieter: [{ name: 'Paula Probe' }] }, v)) }));
  await lv(page).locator('#lvt_jahresbericht').click();
  await page.locator('#lv_berichtjahr').selectOption('2025');
  // Zufluss 2025: 28.12.2024 (Januarmiete, Zehn-Tage-Regel) + 11 × 1.000 € = 12.000 €; 29.12.2025 gehört zu 2026
  await expect(lv(page).locator('.kpi').first()).toContainText('12.000,00 €');
  await expect(lv(page).locator('.hint', { hasText: 'Zehn-Tage-Regel' })).toContainText('29.12.2025 1.000,00 € für 01/2026 → 2026');
  // Ausgaben: Grundsteuer 600 + Versicherung 900 = 1.500; Instandhaltung 1.200; Verwaltung 360 → 3.060 €
  await expect(lv(page).locator('.kpi').nth(1)).toContainText('3.060,00 €');
  const [wort] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Eigentümerbericht (Word)' }).click()]);
  await wort.saveAs(AUSGABE + 'eigentuemerbericht.docx');
  const t = text(pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'eigentuemerbericht.docx']).docx);
  for (const s of ['Eigentümerbericht 2025', 'Lindenweg 1', '12.000,00 €', '3.060,00 €', '8.940,00 €', 'Mieteinnahmen für Wohnungen (ohne Umlagen)', '9.600,00 €']) expect(t).toContain(s);
  const [xl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Anlage V und Einzelposten (Excel)' }).click()]);
  await xl.saveAs(AUSGABE + 'anlage_v.xlsx');
  const b = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'anlage_v.xlsx']).xlsx.blaetter;
  expect(Object.keys(b)).toEqual(['Anlage V', 'Einnahmen', 'Ausgaben']);
  const zeile = JSON.stringify(b['Anlage V']);
  expect(zeile).toContain('Mieteinnahmen für Wohnungen (ohne Umlagen)'); expect(zeile).toContain('9600'); expect(zeile).toContain('2400');
  await keineSkriptfehler(page);
});

test('Dokumente: ablegen, Energieausweis mit Frist, öffnen, löschen; Löschen der Liegenschaft entfernt die Dateien', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await verwaltungOeffnen(page);
  await laden(page, { id: 'LDK', name: 'Bachweg 2', ort: 'Beilstein', art: 'wohnhaus', einheiten: [{ id: 'e1', nr: 'W1' }], vertraege: [] });
  await lv(page).locator('#lvt_dokumente').click();
  const [wahl] = await Promise.all([page.waitForEvent('filechooser'), lv(page).locator('label.lv-datei').click()]);
  await wahl.setFiles([{ name: 'Energieausweis Bachweg 2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% synthetisch\n') },
    { name: 'Mietvertrag W1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% synthetisch 2\n') }]);
  await expect(lv(page).locator('.lv-ok')).toContainText('2 Dokumente abgelegt');
  const docs = await page.evaluate(() => LV.liste[0].dokumente.map(d => [d.kategorie, !!d.gueltigBis]));
  expect(docs.sort()).toEqual([['energieausweis', true], ['mietvertrag', false]]);
  // Frist nachträglich auf in 30 Tagen setzen → erscheint in den Fristen
  await lv(page).getByRole('button', { name: 'Bearbeiten' }).first().click();
  await feld(page, 'd_bis', '2026-10-20');
  await lv(page).locator('.lv-formbox button.primary').click();
  await lv(page).locator('#lvt_ueberblick').click();
  await expect(lv(page).locator('.mdb-box', { hasText: 'Fristen und Hinweise' })).toContainText('Dokument läuft ab');
  await lv(page).locator('#lvt_dokumente').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Öffnen' }).first().click()]);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await page.evaluate(async () => (await ImmoSpeicher.tx(LV.db, 'anhaenge', 'readonly', s => s.getAll())).filter(a => a.liegenschaftId === 'LDK').length)).toBe(2);
  await lv(page).getByRole('button', { name: 'Dokument löschen' }).first().click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Dokument gelöscht');
  expect(await page.evaluate(async () => (await ImmoSpeicher.tx(LV.db, 'anhaenge', 'readonly', s => s.getAll())).filter(a => a.liegenschaftId === 'LDK').length)).toBe(1);
  await page.evaluate(() => lvLiegenschaftLoeschen('LDK'));
  await expect(lv(page).locator('.lv-ok')).toContainText('gelöscht');
  expect(await page.evaluate(async () => (await ImmoSpeicher.tx(LV.db, 'anhaenge', 'readonly', s => s.getAll())).length)).toBe(0);
  await keineSkriptfehler(page);
});
