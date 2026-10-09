/* D67 NHK 2010 für Ein-, Doppel- und Reihenhäuser: Auswahlliste nach Hausart mit NHK-Nummer, frühere Gebäudetypen werden beim Öffnen
   umgestellt, Hinweis bei den alten (falschen) Kostenkennwerten der Zeile 1.02, Wechsel des Typs übernimmt die richtigen Werte. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

const ALT_FALSCH = 'EFH freistehend · nicht unterkellert, DG ausgeb.';
const NEU_121 = 'EFH freistehend · nicht unterkellert, nur EG, DG ausgeb.';
const NEU_131 = 'EFH freistehend · nicht unterkellert, EG + OG, DG ausgeb.';

test('Gebäudetyp: Auswahl nach Hausart mit NHK-Nummer, alte Bewertung umgestellt, Hinweis auf alte Werte, neue Werte beim Wechsel', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(() => { pickVordruck('wh_bgf'); });
  // Auswahlliste: fünf Gruppen, Anzeige mit NHK-Nummer, Wert bleibt der Schlüssel
  expect(await page.evaluate(() => [...$('ek_typ').querySelectorAll('optgroup')].map(g => g.label)))
    .toEqual(['Ein- und Zweifamilienhaus, freistehend', 'Doppel- und Reihenendhaus', 'Reihenmittelhaus', 'Mehrfamilienhaus', 'Gemischt, Geschäft, Büro, Gewerbe']);
  expect(await page.evaluate(k => { const o = [...$('ek_typ').options].find(x => x.value === k); return o && o.textContent; }, NEU_121)).toBe(NEU_121 + ' — NHK 1.21');
  expect(await page.evaluate(() => $('ek_typ').options.length)).toBe(42);
  // gespeicherte Bewertung mit dem früheren, falschen Typ (Werte der Zeile 1.02)
  await page.evaluate(alt => { const f = collect(); f.ek_typ = alt; f.nhkhg_base = '545, 605, 695, 840, 1050'; restore({ fields: f }); }, ALT_FALSCH);
  expect(await page.evaluate(() => [$('ek_typ').value, $('nhkhg_base').value])).toEqual([NEU_121, '545, 605, 695, 840, 1050']);   // Werte bleiben
  expect((await page.evaluate(() => plausiPruefen().map(h => h.text))).join(' ')).toContain('NHK-Zeile 1.02');
  // nur EG (1.21 ist schon gewählt — erneutes Wählen löst nichts aus): Knopf in 2.3 übernimmt die Werte des gewählten Typs
  await page.evaluate(() => appShowSection('s-hg'));
  await page.locator('#nhk_aus_typ').click();
  expect(await page.evaluate(() => $('nhkhg_base').value)).toBe('790, 875, 1005, 1215, 1515');
  expect((await page.evaluate(() => plausiPruefen().map(h => h.text))).join(' ')).not.toContain('NHK-Zeile 1.02');
  // EG + OG: Gebäudetyp neu wählen → Kostenkennwerte 1.31
  await page.evaluate(k => { $('ek_typ').value = k; typWechsel(); }, NEU_131);
  expect(await page.evaluate(() => [$('nhkhg_base').value, $('nhkhg_gnd').value])).toEqual(['720, 800, 920, 1105, 1385', '80']);
  expect((await page.evaluate(() => plausiPruefen().map(h => h.text))).join(' ')).not.toContain('NHK-Zeile 1.02');
  // die beiden nur missverständlich benannten Typen: neuer Name, Werte unverändert
  await page.evaluate(() => { const f = collect(); f.ek_typ = 'EFH freistehend · unterkellert, Flachdach'; f.nhkhg_base = '665, 740, 850, 1025, 1285'; restore({ fields: f }); });
  expect(await page.evaluate(() => [$('ek_typ').value, $('nhkhg_base').value])).toEqual(['EFH freistehend · unterkellert, EG + OG, Flachdach', '665, 740, 850, 1025, 1285']);
  // Gebäudemix (D66) mit früherem Schlüssel: umgestellt und mit den Werten von 1.13 gemischt (50 % Wohnen)
  await page.evaluate(() => { const f = collect(); Object.assign(f, { mx_aktiv: true, mx_sichtbar: '1', mx_nhk: 'mix', mx_anteil_w: '50',
    mx_typ_w: 'EFH freistehend · unterkellert, Flachdach', mx_typ_g: 'Geschäftshaus ohne Wohnungen' }); restore({ fields: f }); });
  await expect.poll(() => page.evaluate(() => [$('mx_typ_w').value, $('nhkhg_base').value]))
    .toEqual(['EFH freistehend · unterkellert, EG + OG, Flachdach', '798, 835, 890, 1273, 1593']);   // (665+930)/2 … (1285+1900)/2, gerundet
  // Dachgeschoss „ausbaufähig“ (Aufnahmebogen) passt nicht zu „DG ausgeb.“
  await page.evaluate(() => { const f = collect(); Object.assign(f, { mx_aktiv: false, au_aus: false, ek_typ: 'EFH freistehend · unterkellert, DG ausgebaut', au_dg: 'ausbaufähig' }); restore({ fields: f }); });
  expect((await page.evaluate(() => plausiPruefen().map(h => h.text))).join(' ')).toContain('Dachgeschoss: ausbaufähig');
  // Referenztabelle mit NHK-Spalte
  await expect(page.locator('#nhk_ref_tbl')).toContainText('1.21');
  await keineSkriptfehler(page);
});
