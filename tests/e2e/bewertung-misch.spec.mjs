/* D66 Objektart „Wohn- und Geschäftshaus“: Abschnitt „Gemischte Nutzung“ — Gebäudemix in 2.2/2.3, marktübliche Miete übernehmen,
   Bewirtschaftungskosten getrennt, Bericht. Beispiel: OG privat (120 m²), EG und UG Firma (240 m²). Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

test('Wohn- und Geschäftshaus: Objektart, Gebäudemix, marktübliche Miete, getrennte Bewirtschaftung, Bericht', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.getByRole('button', { name: 'Neue Bewertung', exact: true }).click();
  await page.locator('#start-step1 .tile', { hasText: 'Wohn- und Geschäftshaus' }).click();
  await expect(page.locator('body')).toHaveClass(/started/);
  await expect(page.locator('#app_object_type')).toHaveText('Wohn- und Geschäftshaus');
  expect(await page.evaluate(() => [$('ek_modus').value, $('ek_typ').value, $('mx_aktiv').checked, $('gewichtung').value]))
    .toEqual(['haus', 'Wohn-/Geschäftshaus (Mischnutzung)', true, '0.4']);
  // eigener Abschnitt nach „Allgemeine Angaben“, Nummern fortlaufend
  await expect(page.locator('#s-misch')).toBeVisible();
  await expect(page.locator('#s-misch>h2 .step')).toHaveText('5');
  await expect(page.locator('#s-hg>h2 .step')).toHaveText('6');
  // Flächen: Wohnanteil 33 % → Vorschlag Gebäudemix (Mehrfamilienhaus / Geschäftshaus ohne Wohnungen)
  await page.evaluate(() => { appShowSection('s-allg'); });
  await page.locator('#ek_wohnflaeche').fill('120');
  await page.locator('#ek_nutzflaeche').fill('240');
  await expect.poll(() => page.evaluate(() => [$('nhkhg_base').value, $('nhkhg_gnd').value])).toEqual(['895, 895, 895, 1342, 1663', '67']);
  await expect(page.locator('#mxo_nhk')).toContainText('Gebäudemix: 33 %');
  await expect(page.locator('#mxo_anteile')).toContainText('gemischt genutztes Grundstück (§ 249 Abs. 8 BewG)');
  // marktübliche Miete (Eigentümer und eigene Firma) in die Allgemeinen Angaben
  await page.evaluate(() => { appShowSection('s-misch'); });
  await page.locator('#mx_eigen_g').check();
  await page.locator('#mx_miete_w_m2').fill('9');
  await page.locator('#mx_miete_g_m2').fill('7,50');
  await expect(page.locator('#mxo_miete')).toHaveText('Wohnen 12.960 € · Gewerbe 21.600 €');
  await page.getByRole('button', { name: 'In „Allgemeine Angaben“ übernehmen' }).click();
  expect(await page.evaluate(() => [$('ek_miete_wohnen').value, $('ek_miete_gewerbe').value])).toEqual(['12960', '21600']);
  // Bewirtschaftungskosten getrennt: Gewerbe 3 % + 100 % × 12 €/m² + 4 % (Anlage 3 ImmoWertV)
  await expect(page.locator('#mxo_bwk')).toContainText('4.392 €');
  await expect(page.locator('#o_er_bwinfo')).toContainText('Anlage 3, getrennt');
  // Ansatz Typ 5.1 und „Gebäudetyp aus ①“
  await page.locator('#mx_nhk').selectOption('51');
  await expect.poll(() => page.evaluate(() => [$('nhkhg_base').value, $('nhkhg_gnd').value])).toEqual(['860, 860, 860, 1085, 1375', '80']);
  await page.locator('#mx_nhk').selectOption('typ');
  await page.evaluate(() => { $('ek_typ').value = 'Bürogebäude · Massivbau'; typWechsel(); });
  await expect.poll(() => page.evaluate(() => $('nhkhg_base').value)).toBe('1040, 1040, 1040, 1685, 1900');
  // Ausschalten lässt den Abschnitt stehen (wieder einschaltbar), auch nach dem Neuladen
  await page.locator('#mx_aktiv').uncheck();
  await expect(page.locator('#s-misch')).toBeVisible();
  expect(await page.evaluate(() => [window._R.bwMisch, window._MODELL_DETAIL.misch])).toEqual([undefined, null]);
  await page.reload(); await page.waitForFunction(() => typeof window.compute === 'function' && window.IA_BEREIT_P !== undefined);
  await page.evaluate(() => window.IA_BEREIT_P);
  await expect(page.locator('#s-misch')).toBeAttached();
  expect(await page.evaluate(() => [$('mx_aktiv').checked, $('s-misch').hidden])).toEqual([false, false]);
  await page.evaluate(() => { $('mx_aktiv').checked = true; compute(); });
  // Bericht mit eigenem Abschnitt
  await page.locator('#mx_nhk').selectOption('mix');
  await page.evaluate(() => { $('mx_lz_modus').value = 'anteilig'; $('mx_lz_w').value = '3'; $('mx_lz_g').value = '5'; compute(); druckbericht(); });
  const bericht = page.locator('#report');
  await expect(bericht).toContainText('Gemischte Nutzung (Wohnen und Gewerbe)');
  await expect(bericht).toContainText('Gebäudemix 33 %');
  await expect(bericht).toContainText('Der Gewerbeteil wird vom Eigentümer oder seiner Firma genutzt.');
  await expect(bericht).toContainText('Wohnen und Gewerbe getrennt, Anlage 3 ImmoWertV');
  await expect(bericht).toContainText('anteilig Wohnen / Gewerbe');
  await keineSkriptfehler(page);
});

test('Wohnhaus: Abschnitt „Gemischte Nutzung“ ist ausgeblendet und ändert nichts', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => { pickVordruck('wh_bgf'); $('ek_wohnflaeche').value = '120'; $('ek_nutzflaeche').value = '240'; compute(); });
  expect(await page.evaluate(() => [$('mx_aktiv').checked, $('nhkhg_base').value, window._R.bwMisch, window._MODELL_DETAIL.misch]))
    .toEqual([false, '655, 725, 835, 1005, 1260', undefined, null]);
  // gewohnte Gliederung: Abschnitt ausgeblendet, Hauptgebäude bleibt Nr. 5
  await expect(page.locator('#s-misch')).toBeHidden();
  await expect(page.locator('#s-hg>h2 .step')).toHaveText('5');
  await expect(page.locator('nav.side a[data-sec="s-misch"]')).toHaveCount(0);
  await keineSkriptfehler(page);
});
