/* Liegenschaftsverwaltung — Nebenkostenabrechnung im Browser: Kosten erfassen, Abrechnung über die Oberfläche
   (Ergebnis gegen die unabhängige Vergleichsrechnung tests/referenz/verwaltung_sollwerte.json), Word/Excel,
   Buchung ins Mietkonto samt Rücknahme, Fristen. Feste Uhr: 29.09.2026. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('docx, openpyxl');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const FAELLE = JSON.parse(readFileSync('tests/referenz/verwaltung_faelle.json', 'utf8'));
const SOLL = JSON.parse(readFileSync('tests/referenz/verwaltung_sollwerte.json', 'utf8')).nebenkosten;
const MIETER = { v1: 'Anna Eins', v2: 'Bernd Zwei', v3a: 'Carla Drei', v3b: 'Dora Vier', v4: 'Firma Fünf GmbH' };
const liegenschaft = () => {
  const l = JSON.parse(JSON.stringify(FAELLE.nebenkosten.liegenschaft));
  Object.assign(l, { name: 'Gartenstraße 3', strasse: 'Gartenstraße 3', plz: '74360', ort: 'Ilsfeld', iban: 'DE89370400440532013000', kontoInhaber: 'Testeigentümer' });
  l.vertraege.forEach(v => { v.mieter = [{ name: MIETER[v.id] }]; });
  return l;
};
const eur = x => x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const lv = page => page.locator('#lv_overlay');
async function feld(page, id, wert) {
  const el = page.locator('#lvf_' + id);
  const art = await el.evaluate(e => e.tagName === 'SELECT' ? 'select' : e.type);
  if (art === 'select') await el.selectOption(String(wert));
  else if (art === 'checkbox') { if (wert) await el.check(); else await el.uncheck(); }
  else await el.fill(String(wert));
}
async function vorbereiten(page) {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async l => { await lvStart(); await lvSpeichern(l); await lvOeffnen(); lvLiegenschaftOeffnen('LN', 'nebenkosten'); LV.nkJahr = 2025; lvRender(); }, liegenschaft());
}
/* Abrechnung 2025 über die Felder einrichten — Werte wie im Referenzfall, im deutschen Zahlenformat */
async function abrechnungEinrichten(page) {
  await lv(page).getByRole('button', { name: 'Abrechnung 2025' }).click();
  for (const [k, v] of [['a_pvHeiz', '70'], ['a_pvWW', '60'], ['a_wwModus', 'messung'], ['a_energie', '98.000'], ['a_wwVol', '120'], ['a_wwTemp', '55'], ['a_brennwert', true],
    ['a_co2aktiv', true], ['a_co2kosten', '1.150'], ['a_co2kg', '9000'], ['a_co2fl', '294,5']]) await feld(page, k, v);
  for (const [e, h, w] of [['e1', 820, 38], ['e2', 610, 30], ['e3', 400, 15], ['e4', 1350, 10]]) { await feld(page, 'h_' + e, h); await feld(page, 'w_' + e, w); }
  for (const [e, v] of [['e1', 95], ['e2', 70], ['e3', 60], ['e4', 40]]) await feld(page, 'v_n_wasser_' + e, v);
  await lv(page).getByRole('button', { name: 'Abrechnung berechnen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Abrechnung berechnet');
}
const ergebnisBox = page => lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: /^Ergebnis/ }) });

test('Kosten erfassen: Prüfung der Eingaben, Abgrenzung nach Leistungszeitraum, Umlagekreis', async ({ page }) => {
  await vorbereiten(page);
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('1. Grundsteuer');
  await lv(page).getByRole('button', { name: 'Kosten erfassen' }).last().click();
  await feld(page, 'k_kategorie', 'schornstein'); await feld(page, 'k_betrag', '1.234,5'); await feld(page, 'k_kreis', 'auswahl');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('#lv_formfehler')).toContainText('Bitte ein Datum oder den Leistungszeitraum angeben');
  await expect(lv(page).locator('#lv_formfehler')).toContainText('mindestens eine Einheit ankreuzen');
  // Leistungszeitraum 01.10.2025–30.09.2026: im Jahr 2025 sind 92 von 365 Tagen enthalten → 1.234,50 × 92 / 365 = 311,16 €
  await feld(page, 'k_von', '2025-10-01'); await feld(page, 'k_bis', '2026-09-30'); await feld(page, 'k_text', 'Kehrung 2025/26');
  await page.locator('#lvf_k_einheitIds_0').check(); await page.locator('#lvf_k_einheitIds_1').check();
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Kosten erfasst');
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  const zeile = lv(page).locator('tr', { hasText: 'Kehrung 2025/26' });
  await expect(zeile).toContainText('311,16 €');
  await expect(zeile).toContainText('von 1.234,50 €');
  await expect(zeile).toContainText('01.10.2025 – 30.09.2026');
  const k = await page.evaluate(() => LV.liste[0].kosten.find(x => x.text === 'Kehrung 2025/26'));
  expect(k).toMatchObject({ kategorie: 'schornstein', betrag: 1234.5, kreis: 'auswahl', einheitIds: ['e1', 'e2'] });
  await keineSkriptfehler(page);
});

test('Abrechnung über die Oberfläche entspricht der unabhängigen Vergleichsrechnung; Word und Excel', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  await vorbereiten(page);
  await abrechnungEinrichten(page);
  const box = ergebnisBox(page);
  for (const [vid, s] of Object.entries(SOLL.ergebnisse)) {
    const zeile = box.locator('tbody tr', { hasText: MIETER[vid] });
    await expect(zeile).toContainText(eur(s.kosten));
    await expect(zeile).toContainText(eur(s.heiz));
    await expect(zeile).toContainText((s.saldo > 0 ? 'Nachzahlung ' : 'Guthaben ') + eur(Math.abs(s.saldo)));
  }
  await expect(box).toContainText('Stufe 5');
  await expect(box).toContainText('Zustellfrist: 31.12.2026');

  const [wort] = await Promise.all([page.waitForEvent('download'), box.getByRole('button', { name: 'Alle Abrechnungen (Word)' }).click()]);
  expect(wort.suggestedFilename()).toBe('Betriebskostenabrechnung 2025 Gartenstraße 3.docx');
  await wort.saveAs(AUSGABE + 'betriebskosten.docx');
  const d = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'betriebskosten.docx']).docx;
  const text = d.absaetze.map(a => a.text).join('\n');
  expect(d.absaetze.filter(a => a.stil === 'Heading 2' && a.text === 'Betriebs- und Heizkostenabrechnung 01.01.2025 – 31.12.2025')).toHaveLength(5);
  expect(text).toContain('Stufe 5 der Anlage zum Gesetz');
  expect(text).toContain('Ihre Nutzungszeit: 01.03.2025 – 31.12.2025 (306 Tage)');
  expect(text).toContain('§ 556 Abs. 3 Satz 5 BGB');
  const tabellen = JSON.stringify(d.tabellen);
  expect(tabellen).toContain('"Summe Betriebskosten","","","' + eur(SOLL.ergebnisse.v1.kosten) + '"');
  expect(tabellen).toContain('"Nachzahlung","' + eur(SOLL.ergebnisse.v1.saldo) + '"');
  expect(tabellen).toContain('Wohn-/Nutzfläche: 72,5 von 294,5 m², 365 von 365 Tagen');
  expect(tabellen).toContain('haushaltsnahe Dienstleistung (Abs. 2)');
  // § 35a nur für Wohnraum: vier Wohnungsmieter ja, der Gewerbemieter nicht
  expect(d.absaetze.filter(x => x.text === 'Steuerlich absetzbare Aufwendungen nach § 35a EStG (Ihr Anteil an den Arbeitskosten)')).toHaveLength(4);

  const [xl] = await Promise.all([page.waitForEvent('download'), box.getByRole('button', { name: 'Übersicht (Excel)' }).click()]);
  await xl.saveAs(AUSGABE + 'betriebskosten.xlsx');
  const b = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'betriebskosten.xlsx']).xlsx.blaetter;
  expect(Object.keys(b)).toEqual(['Übersicht', 'Positionen']);
  const saldi = b['Übersicht'].filter(c => c.ref.startsWith('L') && typeof c.wert === 'number').map(c => c.wert);
  expect(saldi).toEqual(Object.values(SOLL.ergebnisse).map(s => s.saldo));
  await keineSkriptfehler(page);
});

test('Zustellung buchen: Nachzahlung im Mietkonto, Vorauszahlungen angepasst, Frist erledigt; Rücknahme stellt alles wieder her', async ({ page }) => {
  await vorbereiten(page);
  await expect.poll(() => page.evaluate(() => lvFristenL(LV.liste[0], lvHeute(), 60).map(f => f.titel))).toContain('Betriebskostenabrechnung 2025 zustellen');
  await abrechnungEinrichten(page);
  await feld(page, 'b_zugang', '2026-03-10'); await feld(page, 'b_ziel', '30'); await feld(page, 'b_vzAb', '2026-05-01');
  await lv(page).getByRole('button', { name: 'Zustellung vermerken und buchen' }).click();
  await expect(lv(page).locator('.lv-ok').first()).toContainText('im Mietkonto gebucht');
  const stand = () => page.evaluate(() => { const v = LV.liste[0].vertraege.find(x => x.id === 'v1');
    return { sonder: v.sonderposten.map(s => [s.datum, s.betrag, s.text]), aend: v.aenderungen.map(a => [a.ab, a.nk, a.hk, a.grund]),
      fristen: lvFristenL(LV.liste[0], lvHeute(), 60).map(f => f.titel) }; });
  const s1 = await stand();
  expect(s1.sonder).toEqual([['2026-04-09', SOLL.ergebnisse.v1.saldo, 'Betriebskostenabrechnung 01.01.2025 – 31.12.2025 – Nachzahlung']]);
  expect(s1.aend).toEqual([['2026-05-01', SOLL.ergebnisse.v1.neueVz.nk, SOLL.ergebnisse.v1.neueVz.hk, '560']]);
  expect(s1.fristen).not.toContain('Betriebskostenabrechnung 2025 zustellen');
  // im Mietkonto erscheint die Nachzahlung als Posten, die neue Vorauszahlung in der Miete ab Mai
  await page.evaluate(() => { LV.vertragId = 'v1'; lvReiter('mietkonto'); });
  await expect(lv(page).locator('.lv-tbl').first()).toContainText('Betriebskostenabrechnung 01.01.2025 – 31.12.2025 – Nachzahlung');
  await expect(lv(page).locator('.mdb-box', { hasText: 'Aktuelle Miete' }).locator('h3').first())
    .toHaveText('Aktuelle Miete: ' + eur(800 + SOLL.ergebnisse.v1.neueVz.nk + SOLL.ergebnisse.v1.neueVz.hk) + ' / Monat');
  // bleibt beim Sichern und Einspielen erhalten
  const rund = await page.evaluate(() => { const s = ImmoVerwaltung.sicherungPruefen(JSON.parse(JSON.stringify({ typ: 'immoapp-verwaltung', version: 1, liegenschaften: LV.liste })));
    const l = s.liegenschaften[0]; return [l.kosten.length, l.nkAbrechnungen.length, l.nkAbrechnungen[0].versandtAm, l.nkAbrechnungen[0].heiz.einheiten.e1.heiz]; });
  expect(rund).toEqual([12, 1, '2026-03-10', 820]);
  // Rücknahme
  await page.evaluate(() => { lvReiter('nebenkosten'); LV.nkAnsicht = 'abrechnung'; lvRender(); });
  await lv(page).getByRole('button', { name: 'Buchung zurücknehmen' }).click();
  await expect(lv(page).locator('.lv-ok').first()).toContainText('Buchung zurückgenommen');
  const s2 = await stand();
  expect(s2.sonder).toEqual([]); expect(s2.aend).toEqual([]);
  expect(s2.fristen).toContain('Betriebskostenabrechnung 2025 zustellen');
  await keineSkriptfehler(page);
});
