/* Liegenschaftsverwaltung — WEG im Browser: Eigentümer, Wirtschaftsplan und Hausgeld, Jahresabrechnung (gegen die
   unabhängige Vergleichsrechnung), Versammlung mit Abstimmung und Beschluss-Sammlung, Word/Excel, Fristen.
   Feste Uhr: 29.09.2026. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('docx, openpyxl');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const FAELLE = JSON.parse(readFileSync('tests/referenz/verwaltung_faelle.json', 'utf8'));
const SOLL = JSON.parse(readFileSync('tests/referenz/verwaltung_sollwerte.json', 'utf8')).weg;
const eur = x => x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const lv = page => page.locator('#lv_overlay');
async function feld(page, id, wert) {
  const el = page.locator('#lvf_' + id);
  const art = await el.evaluate(e => e.tagName === 'SELECT' ? 'select' : e.type);
  if (art === 'select') await el.selectOption(typeof wert === 'object' ? wert : String(wert));
  else if (art === 'checkbox') { if (wert) await el.check(); else await el.uncheck(); }
  else await el.fill(String(wert));
}
const speichern = page => lv(page).locator('.lv-formbox button.primary').click();
const box = (page, titel) => lv(page).locator('.mdb-box', { has: page.locator('h3', { hasText: titel }) });
async function vorbereiten(page, ohneEigentuemer) {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  const l = JSON.parse(JSON.stringify(FAELLE.weg.liegenschaft));
  Object.assign(l, { strasse: 'Lindenhof 1', plz: '74360', ort: 'Ilsfeld' });
  if (ohneEigentuemer) l.weg.eigentuemer = [];
  await page.evaluate(async l => { await lvStart(); await lvSpeichern(l); await lvOeffnen(); lvLiegenschaftOeffnen('LW', 'weg'); }, l);
}
const segment = (page, name) => lv(page).locator('.lv-segment').getByRole('button', { name, exact: true }).click();

test('Eigentümer über die Oberfläche: Miteigentümer, Eigentümerwechsel, Stimmrecht', async ({ page }) => {
  await vorbereiten(page, true);
  await expect(lv(page).locator('.lv-tbl')).toContainText('kein Eigentümer erfasst');
  const eintragen = async (einheit, name, seit) => {
    await lv(page).getByRole('button', { name: 'Eigentümer eintragen' }).click();
    await feld(page, 'o_einheit', { label: einheit }); await feld(page, 'o_name', name); await feld(page, 'o_seit', seit);
    await speichern(page); await expect(lv(page).locator('.lv-ok')).toContainText('Eigentümer eingetragen');
  };
  await eintragen('W3 · 200 MEA', 'Erika Beispiel', '2012-01-01');
  await eintragen('W3 · 200 MEA', 'Hans Beispiel', '2012-01-01');
  await eintragen('W4 · 100 MEA', 'Laura Alt', '2016-01-01');
  await eintragen('W4 · 100 MEA', 'Nina Neu', '2025-07-01');
  const w3 = lv(page).locator('tr', { hasText: 'W3' }), w4 = lv(page).locator('tr', { hasText: 'W4' });
  await expect(w3).toContainText('Erika Beispiel'); await expect(w3).toContainText('Hans Beispiel');
  await expect(w4).toContainText('Nina Neu'); await expect(w4).toContainText('früher: Laura Alt (ab 01.01.2016)');
  await feld(page, 'w_prinzip', 'mea'); await lv(page).getByRole('button', { name: 'Übernehmen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Stimmrecht gespeichert');
  expect(await page.evaluate(() => LV.liste[0].weg.stimmprinzip)).toBe('mea');
  await keineSkriptfehler(page);
});

test('Wirtschaftsplan: Fortgeltung, neuer Plan aus Vorjahr, Hausgeld-Soll, Zahlung, Sonderumlage, Einzelwirtschaftspläne (Word)', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  await vorbereiten(page);
  await segment(page, 'Wirtschaftsplan & Hausgeld');
  await expect(box(page, 'Wirtschaftsplan 2026')).toContainText('Für 2026 gilt der Wirtschaftsplan 2025 fort');
  await lv(page).getByRole('button', { name: 'Positionen aus 2025 übernehmen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Wirtschaftsplan 2026 angelegt');
  await lv(page).getByRole('button', { name: 'Position hinzufügen' }).click();
  await feld(page, 'wpp_text', 'Rauchwarnmelder-Wartung'); await feld(page, 'wpp_betrag', '300'); await feld(page, 'wpp_schl', 'einheiten');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Position hinzugefügt');
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  await feld(page, 'wp_ruecklage', '6.500'); await feld(page, 'wp_beschlossen', '2026-01-15');
  await lv(page).getByRole('button', { name: 'Übernehmen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Wirtschaftsplan beschlossen');
  /* W1: 6.344,07 (Plan 2025) + 300/5 = 60 → 6.404,07; Rücklage 6.500 × 0,3 = 1.950 → 8.354,07 / 12 = 696,17 */
  await expect(box(page, 'Einzelwirtschaftspläne 2026').locator('tr', { hasText: 'W1' })).toContainText('696,17 €');
  // Hausgeldkonto W1: Soll 2025 (12 × 678,67) + Jan–Sep 2026 (9 × 696,17), bezahlt 13.200 €
  const rest = Math.round((12 * 678.67 + 9 * 696.17 - 13200) * 100) / 100;
  await expect(box(page, 'Hausgeldkonten').locator('tr', { hasText: 'W1' })).toContainText(eur(rest));
  await lv(page).locator('summary', { hasText: 'Hausgeld- oder Sonderumlagezahlung buchen' }).click();
  await feld(page, 'wz_einheit', { label: 'W1' }); await feld(page, 'wz_betrag', '1.000'); await feld(page, 'wz_text', 'Überweisung Max Muster');
  await lv(page).getByRole('button', { name: 'Zahlung buchen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Zahlung gebucht');
  await expect(box(page, 'Hausgeldkonten').locator('tr', { hasText: 'W1' })).toContainText(eur(rest - 1000));
  await lv(page).locator('summary', { hasText: 'Sonderumlage beschließen' }).click();
  await feld(page, 'su_text', 'Fassadenanstrich'); await feld(page, 'su_betrag', '10.000'); await feld(page, 'su_faellig', '2026-09-01');
  await lv(page).getByRole('button', { name: 'Sonderumlage eintragen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Sonderumlage eingetragen');
  await page.evaluate(() => { LV.wegEinheit = 'w3'; lvRender(); });
  await expect(box(page, 'Hausgeldkonto W3').locator('tr', { hasText: 'Fassadenanstrich' })).toContainText('2.000,00 €');   // 200 von 1.000 MEA

  const [wort] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Einzelwirtschaftspläne (Word)' }).click()]);
  await wort.saveAs(AUSGABE + 'einzelwirtschaftsplaene.docx');
  const d = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'einzelwirtschaftsplaene.docx']).docx;
  expect(d.absaetze.filter(a => a.stil === 'Heading 2' && a.text.startsWith('Einzelwirtschaftsplan 2026'))).toHaveLength(5);
  expect(JSON.stringify(d.tabellen)).toContain('"monatlicher Vorschuss","","fällig zum 3. Werktag","696,17 €"');
  await keineSkriptfehler(page);
});

test('Jahresabrechnung über die Oberfläche entspricht der Vergleichsrechnung; Word; Spitzen buchen und zurücknehmen', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  await vorbereiten(page);
  await segment(page, 'Jahresabrechnung');
  await feld(page, 'ja_ruecklage', '25.000'); await feld(page, 'ja_konto', '18.000'); await feld(page, 'ja_verb', '1.200');
  for (const [e, v] of Object.entries(FAELLE.weg.cfg.heiz)) await feld(page, 'jh_' + e, v);
  await lv(page).getByRole('button', { name: 'Jahresabrechnung berechnen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Jahresabrechnung berechnet');
  const erg = box(page, 'Ergebnis Jahresabrechnung 2025');
  const nr = { w1: 'W1', w2: 'W2', w3: 'W3', w4: 'G1', w5: 'W4' };
  for (const [eid, s] of Object.entries(SOLL.einzel)) {
    const z = erg.locator('tbody tr', { hasText: nr[eid] });
    await expect(z).toContainText(eur(s.kosten));
    await expect(z).toContainText((s.spitze > 0 ? 'Nachschuss ' : 'Guthaben ') + eur(Math.abs(s.spitze)));
  }
  await expect(erg.locator('dl')).toContainText('Erhaltungsrücklage 31.12.' + eur(SOLL.ruecklage.ende));
  await expect(erg.locator('dl')).toContainText('Forderungen (Hausgeldrückstände)' + eur(SOLL.forderungen));

  const [wort] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Abrechnung und Einzelabrechnungen (Word)' }).click()]);
  await wort.saveAs(AUSGABE + 'jahresabrechnung.docx');
  const d = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'jahresabrechnung.docx']).docx;
  expect(d.absaetze.filter(a => a.stil === 'Heading 2' && a.text.startsWith('Einzelabrechnung 2025'))).toHaveLength(5);
  const tab = JSON.stringify(d.tabellen);
  expect(tab).toContain('"Erhaltungsrücklage am 31.12.","' + eur(SOLL.ruecklage.ende) + '"');
  expect(tab).toContain('"Guthaben (Abrechnungsspitze)","","","' + eur(-SOLL.einzel.w5.spitze) + '"');
  expect(d.absaetze.map(a => a.text).join('\n')).toContain('Davon auf Mieter umlagefähige Betriebskosten: ' + eur(SOLL.einzel.w1.umlagefaehig));

  await feld(page, 'jb_beschluss', '2026-05-20'); await feld(page, 'jb_faellig', '2026-06-30');
  await lv(page).getByRole('button', { name: 'Beschluss vermerken und buchen' }).click();
  await expect(lv(page).locator('.lv-ok').first()).toContainText('Nachschüsse und Guthaben stehen in den Hausgeldkonten');
  const posten = () => page.evaluate(() => ImmoWeg.hausgeldKonto(LV.liste[0], 'w1', lvHeute()).posten.filter(p => p.art === 'abrechnung').map(p => [p.text, p.betrag, p.faellig]));
  expect(await posten()).toEqual([['Jahresabrechnung 2025 – Nachschuss', SOLL.einzel.w1.spitze, '2026-06-30']]);
  await lv(page).getByRole('button', { name: 'Buchung zurücknehmen' }).click();
  await expect(lv(page).locator('.lv-ok').first()).toContainText('Buchung zurückgenommen');
  expect(await posten()).toEqual([]);
  await keineSkriptfehler(page);
});

test('Versammlung: Einladungsfrist, Abstimmung nach Kopfprinzip, Beschluss-Sammlung, Einladung und Niederschrift (Word)', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  await vorbereiten(page);
  await segment(page, 'Versammlungen');
  await lv(page).getByRole('button', { name: 'Versammlung planen' }).click();
  await feld(page, 'vs_datum', '2026-10-20'); await feld(page, 'vs_uhrzeit', '18:30'); await feld(page, 'vs_ort', 'Gemeindesaal Ilsfeld'); await feld(page, 'vs_einladung', '2026-10-05');
  await speichern(page);
  await expect(lv(page).locator('.lv-warn')).toContainText('Einladungsfrist nur 15 Tage');
  await lv(page).getByRole('button', { name: 'Tagesordnungspunkt' }).click();
  await feld(page, 'tp_titel', 'Anstrich Treppenhaus'); await feld(page, 'tp_antrag', 'Das Treppenhaus wird bis 30.06.2027 gestrichen; Kosten aus der Erhaltungsrücklage.');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Tagesordnungspunkt hinzugefügt');
  const tid = await page.evaluate(() => LV.liste[0].weg.versammlungen[0].tops[0].id);
  for (const [e, s] of [['w1', 'ja'], ['w2', 'ja'], ['w3', 'nein'], ['w4', 'enthaltung'], ['w5', 'ja']]) await page.locator('#lvs_' + tid + '_' + e).selectOption(s);
  await lv(page).locator('.lv-top').first().getByRole('button', { name: 'Stimmen speichern' }).click();
  // Kopfprinzip: Max Muster (W1 + W2) eine Stimme → Ja 2, Nein 1, Enthaltung 1
  await expect(lv(page).locator('.lv-top').first()).toContainText('Ja 2 · Nein 1 · Enthaltung 1');
  await expect(lv(page).locator('.lv-top').first()).toContainText('angenommen');
  await lv(page).locator('.lv-top').first().getByRole('button', { name: 'Ergebnis verkünden und eintragen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Beschluss Nr. 1 verkündet und eingetragen');
  const [einl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Einladung (Word)' }).click()]);
  await einl.saveAs(AUSGABE + 'einladung.docx');
  const e = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'einladung.docx']).docx.absaetze.map(a => a.text).join('\n');
  expect(e).toContain('TOP 1: Anstrich Treppenhaus'); expect(e).toContain('Textform (§ 25 Abs. 3 WEG)');
  const [nied] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Niederschrift (Word)' }).click()]);
  await nied.saveAs(AUSGABE + 'niederschrift.docx');
  const n = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'niederschrift.docx']).docx.absaetze.map(a => a.text).join('\n');
  expect(n).toContain('Abstimmung: Ja 2, Nein 1, Enthaltungen 1.'); expect(n).toContain('Der Beschluss ist angenommen. (Beschluss-Sammlung Nr. 1)'); expect(n).toContain('§ 24 Abs. 6 WEG');
  await segment(page, 'Beschluss-Sammlung');
  await lv(page).getByRole('button', { name: 'Umlaufbeschluss / Urteil eintragen' }).click();
  await feld(page, 'bs_datum', '2026-09-01'); await feld(page, 'bs_art', 'umlauf'); await feld(page, 'bs_wortlaut', 'Die Verwaltung wird ermächtigt, Angebote für neue Briefkästen einzuholen.');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Als Nr. 2 eingetragen');
  await lv(page).locator('tr', { hasText: 'Anstrich Treppenhaus' }).getByRole('button', { name: 'Vermerk' }).click();
  await feld(page, 'vm_text', 'angefochten (Testvermerk)'); await speichern(page);
  await expect(lv(page).locator('tr', { hasText: 'Anstrich Treppenhaus' })).toContainText('angefochten (Testvermerk)');
  const [xl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Beschluss-Sammlung (Excel)' }).click()]);
  await xl.saveAs(AUSGABE + 'beschluesse.xlsx');
  const b = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'beschluesse.xlsx']).xlsx.blaetter['Beschluss-Sammlung'];
  expect(b.filter(c => c.ref.startsWith('A') && typeof c.wert === 'number').map(c => c.wert)).toEqual([1, 2]);
  const fr = await page.evaluate(() => lvFristenL(LV.liste[0], lvHeute(), 60).map(f => f.titel));
  expect(fr).toContain('Jahresabrechnung 2025 erstellen und beschließen lassen');
  expect(fr.some(t => /^Hausgeldrückstand/.test(t))).toBe(true);
  await keineSkriptfehler(page);
});
