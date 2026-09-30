/* Liegenschaftsverwaltung im Browser: Ablauf über die Oberfläche, Eingabeprüfung, Maskierung, Office-Dateien,
   Datensicherung und Rückfall ohne Datenbank. Die Sollwerte hier sind von Hand hergeleitet (Rechenweg im
   Kommentar); den Rechenkern selbst prüft tests/unit/verwaltung.test.mjs gegen die unabhängige Python-Rechnung.
   Feste Uhr: 29.09.2026 (helfer.mjs). Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';
import { LIEGENSCHAFT_TEST } from '../fixtures/verwaltung.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('docx, openpyxl');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const lv = page => page.locator('#lv_overlay');
async function feld(page, id, wert) {
  const el = page.locator('#lvf_' + id);
  const art = await el.evaluate(e => e.tagName === 'SELECT' ? 'select' : e.type);
  if (art === 'select') await el.selectOption(typeof wert === 'object' ? wert : String(wert));
  else if (art === 'checkbox') { if (wert) await el.check(); else await el.uncheck(); }
  else await el.fill(String(wert));
}
const speichern = page => lv(page).locator('.lv-formbox button.primary').click();
async function testdatenLaden(page, l) {
  await page.evaluate(async x => { await lvStart(); await lvSpeichern(JSON.parse(JSON.stringify(x))); lvStartHinweis(); }, l);
}
const kpi = (page, n) => lv(page).locator('.kpi').nth(n).locator('.v');

test('Ablauf über die Oberfläche: Liegenschaft, Einheiten, Vertrag, Zahlungen, Rückstand, Kaution und Fristen', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaftsverwaltung' }).click();
  await expect(lv(page)).toBeVisible();
  await lv(page).getByRole('button', { name: 'Erste Liegenschaft anlegen' }).click();
  for (const [k, v] of [['name', 'Lindenstraße 12'], ['strasse', 'Lindenstraße 12'], ['plz', '74360'], ['ort', 'Ilsfeld'], ['eigentuemerArt', 'eigen'],
    ['eigentuemerName', 'Testeigentümer GbR'], ['wert', '1.150.000'], ['iban', 'DE89 3704 0044 0532 0130 00']]) await feld(page, k, v);
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Liegenschaft angelegt');

  // Einheiten: Text statt Zahl wird gemeldet, nichts gespeichert
  await feld(page, 'nr', 'W1'); await feld(page, 'lage', 'EG links'); await feld(page, 'flaeche', 'abc');
  await speichern(page);
  await expect(lv(page).locator('#lv_formfehler')).toContainText('Wohn-/Nutzfläche (m²): keine gültige Zahl');
  expect(await page.evaluate(() => LV.liste[0].einheiten.length)).toBe(0);
  await feld(page, 'flaeche', '72,5'); await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Einheit „W1“ angelegt');
  await feld(page, 'nr', 'W2'); await feld(page, 'flaeche', '64'); await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Einheit „W2“ angelegt');
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  await expect(lv(page).locator('.lv-tbl')).toContainText('72,5 m²');

  // Vertrag W1 ab 15.11.2025: Festmiete 750 + 150 + 90 = 990 €, Kaution 2.250 € in drei Raten
  await lv(page).locator('#lvt_vertraege').click();
  await lv(page).getByRole('button', { name: 'Mietvertrag anlegen' }).click();
  await feld(page, 'einheitId', { label: 'W1 · EG links' }); await feld(page, 'name1', 'Erika Beispiel'); await feld(page, 'personen', '2');
  await feld(page, 'beginn', '2025-11-15'); await feld(page, 'mietart', 'staffel');
  await feld(page, 'kalt', '750'); await feld(page, 'nk', '150'); await feld(page, 'hk', '90');
  await feld(page, 'kautionSoll', '2.250'); await feld(page, 'kautionRaten', true);
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Mietvertrag angelegt');
  // Staffelstufe ab 15.11.2026 (ein Jahr nach Beginn, § 557a Abs. 2 BGB)
  await feld(page, 'a_ab', '2026-11-15'); await feld(page, 'a_grund', 'staffel'); await feld(page, 'a_kalt', '780');
  await lv(page).getByRole('button', { name: 'Änderung eintragen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Mietänderung eingetragen');
  // zweiter Vertrag auf dieselbe Einheit im selben Zeitraum wird abgelehnt
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  await lv(page).getByRole('button', { name: 'Mietvertrag anlegen' }).click();
  await feld(page, 'einheitId', { label: 'W1 · EG links' }); await feld(page, 'name1', 'Doppelt'); await feld(page, 'beginn', '2026-01-01'); await feld(page, 'kalt', '500');
  await speichern(page);
  await expect(lv(page).locator('#lv_formfehler')).toContainText('läuft in diesem Zeitraum bereits der Vertrag mit Erika Beispiel');
  expect(await page.evaluate(() => LV.liste[0].vertraege.length)).toBe(1);
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();

  // Zahlungen im Mietkonto
  await lv(page).locator('#lvt_mietkonto').click();
  const buche = async (datum, betrag, art) => {
    await feld(page, 'z_datum', datum); await feld(page, 'z_betrag', betrag); if (art) await feld(page, 'z_art', art);
    await lv(page).getByRole('button', { name: 'Zahlung buchen' }).click();
    await expect(lv(page).locator('.lv-ok')).toContainText('gebucht');
  };
  for (const [d, b] of [['2025-11-17', '520'], ['2025-12-02', '990'], ['2026-01-12', '990'], ['2026-02-02', '900'], ['2026-04-01', '990'], ['2026-04-20', '-990'], ['2026-05-04', '1.500']]) await buche(d, b);
  await buche('2025-11-15', '750', 'kaution');
  /* Sollstellung bis 29.09.2026: November anteilig 16/30 × 990 = 528 €, Dezember bis September 10 × 990 = 9.900 €,
     dazu die Rücklastschrift als neue Forderung 990 € → 11.418 €. Zahlungen 520 + 990 + 990 + 900 + 990 + 1.500
     = 5.890 € → Rückstand 5.528 €. Kaution: Raten 750 € am 15.11., 03.12., 07.01. fällig, 750 € gezahlt. */
  await expect(kpi(page, 0)).toHaveText('5.528,00 €');
  await expect(kpi(page, 3)).toHaveText('750,00 € von 2.250,00 €');
  await expect(lv(page).locator('.lv-warn').first()).toContainText('§ 543 Abs. 2 Satz 1 Nr. 3 BGB');
  await expect(lv(page).locator('.lv-warn').first()).toContainText('Kaution nicht vollständig gezahlt: 1.500,00 € offen');
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('Rücklastschrift');
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('Miete 11/2025 (anteilig)');

  // Fristen: Staffel in 47 Tagen, Rückstand, Kaution
  await lv(page).locator('.mdb-tabs').getByRole('button', { name: 'Alle', exact: true }).click();
  // Übersicht: 30 Tage; Reiter „Fristen“: 90 Tage (die Staffel liegt 47 Tage entfernt)
  await expect(lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: 'Fristen und Hinweise' }) })).not.toContainText('Staffelmiete steigt');
  await lv(page).locator('#lvt_fristen').click();
  const fristen = lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: 'Fristen und Hinweise' }) });
  await expect(fristen).toContainText('Staffelmiete steigt');
  await expect(fristen).toContainText('Mietrückstand 5.528,00 €');
  await expect(fristen).toContainText('Kaution offen 1.500,00 €');

  // Nach dem Neuladen ist alles noch da (eigene Datenbank), die Startseite zeigt den Hinweis
  await page.reload();
  await page.waitForFunction(() => typeof lvOeffnen === 'function' && LV.bereit);
  await page.evaluate(() => { document.body.classList.remove('started'); startStep0(); });   // Tests überspringen sonst die Startseite
  await expect(page.locator('#start_lv')).toBeVisible();
  await expect(page.locator('#start_lv')).toContainText('Liegenschaften:');
  await page.evaluate(() => lvOeffnen('uebersicht'));
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('Lindenstraße 12');
  await keineSkriptfehler(page);
});

test('Mahnung (Word), Mietkonto und Mieterliste (Excel) sind echte Office-Dateien', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await testdatenLaden(page, LIEGENSCHAFT_TEST);
  await page.evaluate(async () => { await lvOeffnen('einstellungen'); });
  await feld(page, 'e_name', 'Testverwaltung „Ä & Ö“'); await feld(page, 'e_anschrift', 'Musterweg 1, 74360 Ilsfeld'); await feld(page, 'e_ort', 'Ilsfeld');
  await lv(page).getByRole('button', { name: 'Speichern' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Absender gespeichert');
  await page.evaluate(() => { lvLiegenschaftOeffnen('Ltest1', 'mietkonto'); LV.vertragId = 'Vt1'; lvRender(); });
  /* Vertrag Vt1: 01.04.2024 bis heute = 30 Monate × 1.035 € = 31.050 €, gezahlt 2 × 1.035 € → 28.980 € */
  await expect(kpi(page, 0)).toHaveText('28.980,00 €');
  const [wort] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: /Letzte Mahnung \(Word\)/ }).click()]);
  expect(wort.suggestedFilename()).toBe('Letzte Mahnung Anna Test 2026-09-29.docx');
  await wort.saveAs(AUSGABE + 'mahnung.docx');
  const d = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'mahnung.docx']).docx;
  const text = d.absaetze.map(a => a.text).join('\n');
  expect(d.absaetze.some(a => a.stil === 'Heading 2' && a.text === 'Letzte Mahnung — Mietverhältnis Testweg 5, W1 · EG links')).toBe(true);
  expect(text).toContain('Testverwaltung „Ä & Ö“');
  expect(text).toContain('IBAN DE89 3704 0044 0532 0130 00');
  expect(text).toContain('bis zum 06.10.2026');
  expect(d.tabellen[0].at(-1)).toEqual(['Summe', '', '28.980,00 €']);
  await expect(lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: 'Mahnverlauf' }) })).toContainText('Letzte Mahnung');

  const [konto] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Mietkonto (Excel)' }).click()]);
  await konto.saveAs(AUSGABE + 'mietkonto.xlsx');
  const b = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'mietkonto.xlsx']).xlsx.blaetter;
  expect(Object.keys(b)).toEqual(['Mietkonto', 'Zahlungen']);
  const rueck = b.Mietkonto.find(c => c.wert === 'Rückstand'), zeile = rueck.ref.slice(1);
  const summe = b.Mietkonto.find(c => c.ref === 'E' + zeile);
  expect(summe.wert).toBe(28980); expect(summe.format).toBe('#,##0.00 "€"');

  await page.evaluate(() => lvReiter('ueberblick'));
  const [liste] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Mieterliste (Excel)' }).click()]);
  await liste.saveAs(AUSGABE + 'mieterliste.xlsx');
  const m = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'mieterliste.xlsx']).xlsx.blaetter.Mieterliste.map(c => c.wert);
  expect(m).toContain('Anna Test'); expect(m).toContain('Bernd Beispiel'); expect(m).toContain('leer');
  await keineSkriptfehler(page);
});

test('Datensicherung: auf ein leeres Gerät übertragen; beschädigte und fremde Dateien ändern nichts; nur neuere Fassungen ersetzen', async ({ page, browser }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await testdatenLaden(page, LIEGENSCHAFT_TEST);
  await page.evaluate(() => lvOeffnen('sicherung'));
  await expect(lv(page)).toContainText('1 Liegenschaften · 3 Einheiten · 2 Mietverträge · 3 Zahlungen');
  const [dl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Sicherung herunterladen' }).click()]);
  expect(dl.suggestedFilename()).toBe('ImmoApp Verwaltung 2026-09-29.json');
  const text = readFileSync(await dl.path(), 'utf8');
  await expect(lv(page).locator('#lv_letzte_sicherung')).toContainText('Letzte Sicherung am 29.9.2026');

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage(), meldungen = [];
  p2.on('dialog', d => { meldungen.push(d.message()); d.accept(); });
  await appOeffnen(p2);
  await p2.evaluate(() => lvStart());
  expect(await p2.evaluate(t => lvSicherungAusText(t), text.slice(0, Math.floor(text.length / 2)))).toBe(false);
  expect(meldungen.pop()).toMatch(/beschädigt oder unvollständig[\s\S]*Es wurde nichts verändert/);
  expect(await p2.evaluate(t => lvSicherungAusText(t), JSON.stringify({ typ: 'immoapp-projekte', version: 2, projekte: [] }))).toBe(false);
  expect(meldungen.pop()).toMatch(/Projektsicherung/);
  expect(await p2.evaluate(() => LV.liste.length)).toBe(0);

  expect(await p2.evaluate(t => lvSicherungAusText(t), text)).toBe(true);
  expect(meldungen.join('\n')).toContain('Neu: 1, durch neuere Fassung ersetzt: 0, unverändert: 0');
  const stand = () => p2.evaluate(() => { const l = LV.liste[0]; return [LV.liste.length, l.name, l.einheiten.length, l.vertraege.length, l.zahlungen.length, l.iban]; });
  expect(await stand()).toEqual([1, 'Testweg 5', 3, 2, 3, 'DE89370400440532013000']);
  await p2.reload();
  await p2.waitForFunction(() => typeof lvStart === 'function');
  await p2.evaluate(() => lvStart());
  expect(await stand()).toEqual([1, 'Testweg 5', 3, 2, 3, 'DE89370400440532013000']);

  // Auf dem Gerät geändert, dann dieselbe (nicht neuere) Sicherung eingespielt: die Änderung bleibt
  await p2.evaluate(() => lvAendern(l => { l.name = 'Testweg 5 (geändert)'; }, '', 'Ltest1'));
  expect(await p2.evaluate(t => lvSicherungAusText(t), text)).toBe(true);
  expect((await stand())[1]).toBe('Testweg 5 (geändert)');
  // Eine neuere Fassung in der Datei ersetzt den Stand auf dem Gerät
  const neuer = JSON.parse(text); neuer.liegenschaften[0].geaendert += 60000; neuer.liegenschaften[0].name = 'Testweg 5 (aus Sicherung)';
  expect(await p2.evaluate(t => lvSicherungAusText(t), JSON.stringify(neuer))).toBe(true);
  expect((await stand())[1]).toBe('Testweg 5 (aus Sicherung)');
  await keineSkriptfehler(p2);
  await ctx.close();
});

test('Eingeschleuste Inhalte bleiben Text; falsche IBAN wird gemeldet und nicht gespeichert', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  const boese = JSON.parse(JSON.stringify(LIEGENSCHAFT_TEST));
  boese.name = '<img src=x onerror="window.__xss=1">'; boese.notiz = '<script>window.__xss=2</script>';
  boese.einheiten[0].nr = '"><svg onload="window.__xss=3">'; boese.vertraege[0].mieter[0].name = "'); window.__xss=4; ('";
  boese.zahlungen[0].text = '<iframe src="javascript:window.__xss=5">';
  await testdatenLaden(page, boese);
  await page.evaluate(() => lvOeffnen('uebersicht'));
  for (const r of ['ueberblick', 'einheiten', 'vertraege', 'mietkonto']) await page.evaluate(x => { lvLiegenschaftOeffnen('Ltest1', x); }, r);
  await page.evaluate(() => { LV.form = { typ: 'vertrag', id: 'Vt1' }; lvReiter('vertraege'); LV.form = { typ: 'vertrag', id: 'Vt1' }; lvRender(); });
  await page.evaluate(() => lvAnsicht('fristen'));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await page.evaluate(() => lvLiegenschaftOeffnen('Ltest1', 'ueberblick'));
  await expect(page.locator('#lv_titel_t')).toHaveText('<img src=x onerror="window.__xss=1">');

  await page.evaluate(() => { LV.form = { typ: 'stamm' }; lvRender(); });
  await feld(page, 'iban', 'DE00 1234 5678 9012 3456 78');
  await speichern(page);
  await expect(lv(page).locator('#lv_formfehler')).toContainText('IBAN: Prüfziffer stimmt nicht');
  expect(await page.evaluate(() => LV.liste[0].iban)).toBe('DE89370400440532013000');
  await keineSkriptfehler(page);
});

test('Ohne IndexedDB: Verwaltung arbeitet im Browserspeicher weiter und sagt es', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await testdatenLaden(page, LIEGENSCHAFT_TEST);
  await page.evaluate(() => lvOeffnen('uebersicht'));
  await expect(lv(page).locator('.lv-warn').first()).toContainText('Ohne Datenbank');
  await page.reload();
  await page.waitForFunction(() => typeof lvStart === 'function');
  expect(await page.evaluate(async () => { await lvStart(); return [LV.rueckfall, LV.liste.length, LV.liste[0].name]; })).toEqual([true, 1, 'Testweg 5']);
});
