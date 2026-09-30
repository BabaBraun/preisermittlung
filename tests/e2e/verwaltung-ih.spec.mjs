/* Liegenschaftsverwaltung — Instandhaltung, Pflichten und Dienstleister im Browser: Vorgang mit Foto bis zur
   Abrechnung (Übernahme in die Kosten), Auftrag als Word, Pflichten aus dem Katalog mit Fristen, Sicherung mit
   Fotos und Dienstleistern. Feste Uhr: 29.09.2026. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';
import { LIEGENSCHAFT_TEST } from '../fixtures/verwaltung.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';
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
async function vorbereiten(page) {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async l => { await lvStart(); await lvSpeichern(JSON.parse(JSON.stringify(l))); await lvOeffnen('dienstleister'); }, LIEGENSCHAFT_TEST);
}

test('Vorgang mit Foto bis zur Abrechnung: Kosten übernommen, Auftrag als Word, Löschen räumt auf', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python mit python-docx/openpyxl fehlt');   // in GitHub Actions Pflicht
  await vorbereiten(page);
  await lv(page).getByRole('button', { name: 'Dienstleister anlegen' }).click();
  await feld(page, 'd_name', 'Sanitär Test GmbH'); await feld(page, 'd_gewerk', 'Sanitär'); await feld(page, 'd_anschrift', 'Werkweg 1, 74360 Ilsfeld');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Dienstleister gespeichert');

  await page.evaluate(() => lvLiegenschaftOeffnen('Ltest1', 'instandhaltung'));
  await lv(page).getByRole('button', { name: 'Schaden / Auftrag erfassen' }).click();
  await feld(page, 'g_titel', 'Tropfender Wasserhahn Küche'); await feld(page, 'g_einheit', { label: 'W1 · EG links' }); await feld(page, 'g_prio', 'dringend');
  await feld(page, 'g_dienstleister', { label: 'Sanitär Test GmbH (Sanitär)' }); await feld(page, 'g_angebot', '250'); await feld(page, 'g_terminAm', '2026-10-05');
  await feld(page, 'g_beschreibung', 'Dichtung am Küchenwasserhahn erneuern.');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Vorgang erfasst');
  // Foto über das Dateifeld (auf dem iPhone: Kamera)
  const jpeg = Buffer.from(FOTO_JPEG.split(',')[1], 'base64');
  await lv(page).locator('input[type=file]').setInputFiles({ name: 'hahn.jpg', mimeType: 'image/jpeg', buffer: jpeg });
  await expect(lv(page).locator('.lv-ok')).toContainText('Foto gespeichert');
  await expect(lv(page).locator('.lv-fotos img')).toHaveCount(1);
  await expect.poll(() => lv(page).locator('.lv-fotos img').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  const fotoId = await page.evaluate(() => LV.liste[0].vorgaenge[0].fotos[0]);
  // Fristen: dringend und Termin
  const fr = await page.evaluate(() => lvFristenL(LV.liste[0], lvHeute(), 60).map(f => f.titel));
  expect(fr).toContain('Dringend: Tropfender Wasserhahn Küche');
  expect(fr).toContain('Handwerkertermin: Tropfender Wasserhahn Küche');

  // Auftrag als Word: Dienstleister, Ansprechpartner vor Ort (Mieter der Einheit), Kostenrahmen
  await lv(page).locator('.lv-formbox').getByRole('button', { name: 'Abbrechen' }).click();
  const [wort] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Auftrag', exact: true }).click()]);
  await wort.saveAs(AUSGABE + 'auftrag.docx');
  const d = pythonJson(PY, ['tests/referenz/pruefe_office.py', AUSGABE + 'auftrag.docx']).docx;
  const text = d.absaetze.map(a => a.text).join('\n'), tab = JSON.stringify(d.tabellen);
  expect(d.absaetze.some(a => a.stil === 'Heading 2' && a.text === 'Auftrag: Tropfender Wasserhahn Küche')).toBe(true);
  expect(text).toContain('Sanitär Test GmbH\nWerkweg 1, 74360 Ilsfeld');
  expect(text).toContain('Dichtung am Küchenwasserhahn erneuern.');
  expect(tab).toContain('Anna Test, Telefon 0000 000');
  expect(tab).toContain('250,00 € — bei höheren Kosten bitte vorher Rücksprache');

  // abrechnen: Rechnung 186,40 €, davon 120 € Arbeitskosten → in den Kosten als Instandhaltung
  await lv(page).getByRole('button', { name: 'Bearbeiten' }).first().click();
  await feld(page, 'g_status', 'abgerechnet'); await feld(page, 'g_rechnung', '186,40'); await feld(page, 'g_lohn', '120'); await feld(page, 'g_rechnungAm', '2026-10-06');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('Die Rechnung steht in den Kosten der Liegenschaft');
  await page.evaluate(() => { LV.nkJahr = 2026; lvReiter('nebenkosten'); });
  await expect(lv(page).locator('tr', { hasText: 'Tropfender Wasserhahn Küche' })).toContainText('186,40 €');
  await expect(lv(page).locator('tr', { hasText: 'Tropfender Wasserhahn Küche' })).toContainText('nicht umlagefähig');

  // löschen: Vorgang, Kosten und Foto sind weg
  await page.evaluate(() => { lvReiter('instandhaltung'); LV.ihFilter = 'alle'; lvRender(); });
  await lv(page).getByRole('button', { name: 'Vorgang löschen' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Vorgang gelöscht');
  expect(await page.evaluate(async id => [LV.liste[0].vorgaenge.length, LV.liste[0].kosten.length, !!(await lvAnhangLesen(id))], fotoId)).toEqual([0, 0, false]);
  await keineSkriptfehler(page);
});

test('Pflichten aus dem Katalog: Fristen ohne Datum, Erledigung mit Kosten, nächste Fälligkeit', async ({ page }) => {
  await vorbereiten(page);
  await page.evaluate(() => { lvLiegenschaftOeffnen('Ltest1', 'instandhaltung'); LV.ihAnsicht = 'pflichten'; lvRender(); });
  await lv(page).getByRole('button', { name: 'Aus Katalog übernehmen' }).click();
  for (const k of ['rauchmelder', 'heizungswartung', 'legionellen']) await lv(page).locator('#lvf_kat_auswahl input[value="' + k + '"]').check();
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('3 Pflichten übernommen');
  await expect(lv(page).locator('.lv-tbl')).toContainText('§ 31 TrinkwV');
  let fr = await page.evaluate(() => lvFristenL(LV.liste[0], lvHeute(), 60).filter(f => f.art === 'pflicht').map(f => f.titel));
  expect(fr).toHaveLength(3);
  // Heizungswartung am 15.09.2026 erledigt, 240 € als Heizkosten übernommen → nächste 15.09.2027
  await lv(page).locator('tr', { hasText: 'Heizungsanlage: Wartung' }).getByRole('button', { name: 'Erledigt' }).click();
  await feld(page, 'e_datum', '2026-09-15'); await feld(page, 'e_kosten', '240'); await feld(page, 'e_kat', 'heizung');
  await speichern(page);
  await expect(lv(page).locator('.lv-ok')).toContainText('die Kosten stehen in den Kosten der Liegenschaft');
  await expect(lv(page).locator('tr', { hasText: 'Heizungsanlage: Wartung' })).toContainText('15.09.2027');
  await expect(lv(page).locator('tr', { hasText: 'Heizungsanlage: Wartung' })).toContainText('in Ordnung');
  // Legionellen zuletzt 01.06.2023 → nach 36 Monaten seit 01.06.2026 überfällig (mehr als 30 Tage: dringend)
  await lv(page).locator('tr', { hasText: 'Legionellen' }).getByRole('button', { name: 'Bearbeiten' }).click();
  await feld(page, 'p_letzte', '2023-06-01'); await speichern(page);
  await expect(lv(page).locator('tr', { hasText: 'Legionellen' })).toContainText('überfällig');
  fr = await page.evaluate(() => lvFristenL(LV.liste[0], lvHeute(), 60).filter(f => f.art === 'pflicht').map(f => [f.titel, f.datum, !!f.dringend]));
  expect(fr).toEqual([['Trinkwasser: Untersuchung auf Legionellen überfällig', '2026-06-01', true], ['Rauchwarnmelder: Wartung und Funktionsprüfung: letzte Erledigung eintragen', '2026-09-29', false]]);
  expect(await page.evaluate(() => LV.liste[0].kosten.map(k => [k.kategorie, k.betrag, k.datum]))).toEqual([['heizung', 240, '2026-09-15']]);
  await keineSkriptfehler(page);
});

test('Datensicherung nimmt Fotos, Vorgänge, Pflichten und Dienstleister mit', async ({ page, browser }) => {
  await vorbereiten(page);
  await page.evaluate(async foto => {
    LV.dienstleister = [{ id: 'D1', name: 'Dach Test', gewerk: 'Dach' }]; await lvMetaSetzen('dienstleister', LV.dienstleister);
    await lvAnhangSpeichern({ id: 'B1', liegenschaftId: 'Ltest1', name: 'riss.jpg', typ: 'image/jpeg', size: 1, datum: '2026-09-01', data: foto.split(',')[1] });
    await lvAendern(l => { l.vorgaenge = [{ id: 'G1', titel: 'Riss Fassade', status: 'gemeldet', prio: 'normal', dienstleisterId: 'D1', fotos: ['B1'], verlauf: [] }];
      l.pflichten = [{ id: 'P1', art: 'dachrinne', monate: 12, letzte: '2025-11-01', aktiv: true, historie: [] }]; }, '', 'Ltest1');
  }, FOTO_JPEG);
  await page.evaluate(() => lvAnsicht('sicherung'));
  const [dl] = await Promise.all([page.waitForEvent('download'), lv(page).getByRole('button', { name: 'Sicherung herunterladen' }).click()]);
  const text = readFileSync(await dl.path(), 'utf8');
  const ctx = await browser.newContext(), p2 = await ctx.newPage();
  p2.on('dialog', d => d.accept());
  await appOeffnen(p2);
  await p2.evaluate(() => lvStart());
  expect(await p2.evaluate(t => lvSicherungAusText(t), text)).toBe(true);
  const r = await p2.evaluate(async () => { const l = LV.liste[0], a = await lvAnhangLesen('B1');
    return [l.vorgaenge[0].titel, l.vorgaenge[0].fotos, l.pflichten[0].art, LV.dienstleister.map(d => d.name), !!a && a.data.length > 100]; });
  expect(r).toEqual(['Riss Fassade', ['B1'], 'dachrinne', ['Dach Test'], true]);
  await ctx.close();
});
