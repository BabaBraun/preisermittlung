/* D64 Kachel „Eckdaten übernehmen“: Eckdaten-Datei laden, Angaben mit Quelle anhaken, neue Bewertung anlegen — eine angefangene
   Bewertung wird vorher gesichert und bleibt unverändert. Nur synthetische Daten (tests/fixtures/eckdaten-beispiel.json); Testuhr 29.09.2026. */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

const DATEI = 'tests/fixtures/eckdaten-beispiel.json';
const NAME = 'Musterweg 7, 74360 Ilsfeld';

async function nachNeustart(page, name) {
  await page.waitForFunction(() => typeof window.compute === 'function' && window.IA_BEREIT_P !== undefined);
  await expect.poll(() => page.evaluate(n => typeof pjLoad === 'function' && pjLoad().some(p => p.name === n), name), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => typeof wzdAkten === 'function' && wzdAkten('uebernahme').length)).toBeGreaterThan(0);
}

test('Eckdaten-Datei: Angaben mit Quelle prüfen, neue Bewertung anlegen, Quellennachweis', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('uebernahme'));
  await expect(page.locator('#wz_body')).toContainText('Anleitung für Claude kopieren');
  await page.locator('#ed_datei').setInputFiles(DATEI);
  await expect(page.locator('#ed_kpis')).toContainText('24');
  // Vorauswahl: sicher mit Quelle und passend zur Objektart; Name in Abt. II, Miteigentumsanteil beim Haus, unsichere Miete nicht
  const zeile = t => page.locator('.ed-tab tr').filter({ has: page.locator('td.ed-label').getByText(t, { exact: true }) });
  await expect(zeile('Abteilung II (Lasten und Beschränkungen)').locator('input')).not.toBeChecked();
  await expect(zeile('Abteilung II (Lasten und Beschränkungen)')).toContainText('vielleicht einen Namen');
  await expect(zeile('Miteigentumsanteil').locator('input')).not.toBeChecked();
  await expect(zeile('Nettokaltmiete Wohnen').locator('input')).not.toBeChecked();
  await expect(zeile('Wohnfläche').locator('input')).toBeChecked();
  await expect(page.locator('#wz_body')).toContainText('Widerspruch in den Unterlagen: Wohnfläche');
  await expect(page.locator('#wz_body')).toContainText('ek_ag');          // Auftraggeber gibt es in der Liste nicht
  // Wohnfläche abwählen und wieder an; Zähler folgt
  await zeile('Wohnfläche').locator('input').uncheck();
  await expect(page.locator('#ed_anlegen')).toHaveText('Als neue Bewertung anlegen (19)');
  await zeile('Wohnfläche').locator('input').check();
  await page.locator('#ed_anlegen').click();
  await nachNeustart(page, NAME);
  const f = await page.evaluate(() => Object.fromEntries(['ek_anschrift', 'ek_wohnflaeche', 'ek_gs_flaeche', 'ek_typ', 'ek_modus', 'od_heizung', 'od_nutzungsart', 'au_keller',
    'hg_keller', 'au_mod_u3', 'au_mod_j3', 'mod_p3', 'ex_ea_art', 'au_energieausweis', 'od_energieausweis', 'od_effizienz', 'bgfhg_l1', 'bgfhg_b1', 'bgfhg_e3',
    'bgfhg_n4', 'od_abt2', 'ek_mea', 'ek_miete_wohnen', 'rl_name0', 'rl_faktor1', 'pj_name'].map(id => [id, $(id).value]).concat([['au_ul0', $('au_ul0').checked],
    ['au_bt6', $('au_bt6').checked], ['bgf', $('o_bgf_hg').textContent]])));
  expect(f).toMatchObject({ ek_anschrift: NAME, ek_wohnflaeche: '142,5', ek_gs_flaeche: '412', ek_typ: 'Doppel-/Reihenendhaus · unterkellert, DG ausgeb.', ek_modus: 'haus',
    od_heizung: 'Wärmepumpe', od_nutzungsart: 'WA – allgemeines Wohngebiet', au_keller: 'voll unterkellert', hg_keller: 'ja', au_mod_u3: 'voll', au_mod_j3: '2021',
    mod_p3: '2', ex_ea_art: 'Bedarfsausweis', au_energieausweis: 'Bedarfsausweis liegt vor', od_energieausweis: 'Bedarfsausweis', od_effizienz: 'C',
    bgfhg_l1: '10,49', bgfhg_b1: '8,74', bgfhg_e3: '70,2', bgfhg_n4: '', od_abt2: '', ek_mea: '', rl_name0: 'Wohnzimmer', rl_faktor1: 'bal', pj_name: NAME,
    au_ul0: true, au_bt6: true });
  expect(f.ek_miete_wohnen).not.toBe('14400');
  expect(f.bgf).toMatch(/161,(88|9)/);                                          // 10,49 × 8,74 + 70,2
  // gesichert, Energieausweis-Datum beim Portal-Export, Quellennachweis ohne Personen
  const s = await page.evaluate(n => { const p = pjLoad().find(x => x.name === n), a = wzdAkten('uebernahme')[0];
    return { pid: p.id, gespeichert: p.data.fields.ek_wohnflaeche, portal: wzAlle().portal.objekte[p.id], akte: a }; }, NAME);
  expect(s.gespeichert).toBe('142,5');
  expect(s.portal).toMatchObject({ ausgestellt: '2019-05-14' });
  expect(s.akte.projektId).toBe(s.pid);
  expect(JSON.stringify(s.akte)).not.toContain('Beispiel');                // weder Name aus Abt. II noch Auftraggeber
  expect(s.akte.eintraege.find(e => e.label === 'Wohnfläche')).toMatchObject({ anzeige: '142,5 m²', quelle: 'Wohnflächenberechnung, S. 2', sicher: true });
  // in der Kachel: frühere Übernahme mit Quellen und Dokument
  await page.evaluate(() => wzOeffnen('uebernahme'));
  const karte = page.locator('.kd-karte', { hasText: NAME });
  await expect(karte).toContainText('Angaben');
  await karte.getByRole('button', { name: 'Quellen' }).click();
  await expect(page.locator('.ed-nachweis')).toContainText('Wohnflächenberechnung, S. 2');
  await expect(page.locator('.ed-nachweis')).toContainText('Bodenrichtwert');   // „In den Unterlagen nicht gefunden“
  const dok = await page.evaluate(() => WZ.reg.uebernahme.dokument().html);
  expect(dok).toContain('Quellennachweis der Eckdaten');
  await keineSkriptfehler(page);
});

test('Eckdaten übernehmen: angefangene Bewertung wird vorher gesichert und bleibt unverändert, Name doppelt → eigener Name', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(n => { document.body.classList.add('started'); pickVordruck('wh_bgf'); $('ek_anschrift').value = n; $('ek_wohnflaeche').value = '99'; compute(); autosave(); }, NAME);
  await page.evaluate(() => wzOeffnen('uebernahme'));
  // Antwort von Claude mit Umrandung eingefügt
  const text = 'Hier die Eckdaten:\n```json\n' + readFileSync(DATEI, 'utf8') + '\n```\nBitte prüfen.';
  await page.locator('#ed_text').fill(text);
  await page.getByRole('button', { name: 'Prüfen', exact: true }).click();
  await expect(page.locator('#ed_kpis')).toContainText('24');
  await page.locator('#ed_anlegen').click();
  const neu = NAME + ' (Übernahme 29.09.2026)';
  await nachNeustart(page, neu);
  const p = await page.evaluate(n => pjLoad().filter(x => x.name.startsWith(n)).map(x => [x.name, x.data.fields.ek_wohnflaeche]).sort((a, b) => a[0].length - b[0].length), NAME);
  expect(p).toEqual([[NAME, '99'], [neu, '142,5']]);
  expect(await page.evaluate(() => $('pj_name').value)).toBe(neu);
  await keineSkriptfehler(page);
});

test('Eckdaten übernehmen: keine Eckdaten-Datei, falsche Fassung, Wohnung statt Haus', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('uebernahme'));
  await page.locator('#ed_text').fill('{"objekt":"x"}');
  await page.getByRole('button', { name: 'Prüfen', exact: true }).click();
  await expect(page.locator('.wz-ampel.wz-rot')).toContainText('keine Eckdaten-Datei');
  await page.locator('#ed_text').fill('kein json');
  await page.getByRole('button', { name: 'Prüfen', exact: true }).click();
  await expect(page.locator('.wz-ampel.wz-rot')).toContainText('kein gültiges JSON');
  await page.locator('#ed_text').fill(readFileSync(DATEI, 'utf8'));
  await page.getByRole('button', { name: 'Prüfen', exact: true }).click();
  // Objektart umstellen: Hausangaben verlieren die Vorauswahl, Miteigentumsanteil bekommt sie
  await page.locator('#wz_uebernahme_objektart').selectOption('wohnung');
  const zeile = t => page.locator('.ed-tab tr').filter({ has: page.locator('td.ed-label').getByText(t, { exact: true }) });
  await expect(zeile('Miteigentumsanteil').locator('input')).toBeChecked();
  await expect(zeile('Grundstücksfläche').locator('input')).not.toBeChecked();
  await expect(zeile('Grundstücksfläche')).toContainText('gilt nur für Häuser');
  await expect(page.locator('#wz_uebernahme_typ')).toHaveCount(0);
  await keineSkriptfehler(page);
});

test('Eckdaten übernehmen steht oben bei den Schnellaktionen (sechste Kachel, alle gleich groß) und unter „Mehr“ (D65)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => appSetTab('home'));
  const oben = page.locator('#start-step0 > .quick > .tile');
  await expect(oben.locator('.t')).toHaveText(['Neue Bewertung', 'Objekt erfassen', 'Finanzierung', 'Marktüberblick', 'Liegenschaften', 'Eckdaten übernehmen']);
  const groessen = await oben.evaluateAll(l => l.map(t => { const r = t.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  expect(new Set(groessen.map(g => g.join('x'))).size).toBe(1);                   // „Neue Bewertung“ nicht mehr breiter
  await expect(page.locator('#start_wz .tile[onclick="wzOeffnen(\'uebernahme\')"]')).toHaveCount(0);   // nicht doppelt
  await oben.nth(5).click();
  await expect(page.locator('#wz_titel')).toHaveText('Eckdaten übernehmen');
  await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.evaluate(() => appSetTab('more'));
  await page.locator('#app_more').getByRole('button', { name: 'Eckdaten übernehmen', exact: true }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Eckdaten übernehmen');
  await keineSkriptfehler(page);
});
