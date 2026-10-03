/* Kachel „Social Media“ (D44) im Browser: Bild aus dem Titelbild des Exposés in drei Formaten, Hinweis, Preis, Pflichtangaben
   zum Energieausweis im Text, JPEG zum Speichern. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';

const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());

test('Social Media: Bild in drei Formaten mit Hinweis und Preis, Text mit Pflichtangaben, JPEG speichern (D44)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async foto => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000'; $('ex_provision').value = '3,57 % inkl. MwSt.';
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht' }]; $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
  }, FOTO_JPEG);
  await page.evaluate(() => wzOeffnen('social'));
  const text = page.locator('#so_text');
  await expect(text).toHaveValue(/Neu im Angebot: /);
  await expect(text).toHaveValue(/Kaufpreis: 480\.000 €/);
  await expect(text).toHaveValue(/Käuferprovision: 3,57 %/);
  await expect(text).toHaveValue(/#ilsfeld/);
  const pflicht = await page.evaluate(async () => { const d = await soLaden(soS().objekt); return { fehlt: ImmoPortal.energiePflicht(d.o.energie), zeile: ahEnergie(d.o.energie) }; });
  if (pflicht.zeile) await expect(text).toHaveValue(new RegExp('Energieausweis: ' + pflicht.zeile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(page.locator('#so_pflicht .wz-ampel')).toHaveClass(pflicht.fehlt.length ? /wz-rot/ : /wz-gruen/);
  // Bild: Titelbild gemalt (nicht nur Hintergrundfarbe), Maße je Format
  const masse = () => page.evaluate(() => { const c = $('so_canvas'); return [c.width, c.height]; });
  expect(await masse()).toEqual([1080, 1080]);
  const bunt = await page.evaluate(() => { const c = $('so_canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height / 3).data; let n = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (Math.abs(d[i] - 0x24) + Math.abs(d[i + 1] - 0x30) + Math.abs(d[i + 2] - 0x3f) > 30) n++; return n; });
  expect(bunt).toBeGreaterThan(20);
  await page.locator('#wz_social_format').selectOption('story');
  await expect.poll(masse).toEqual([1080, 1920]);
  await page.locator('#wz_social_format').selectOption('hoch');
  await expect.poll(masse).toEqual([1080, 1350]);
  // Verkauft: ohne Preis
  await page.locator('#wz_social_hinweis').selectOption('verkauft');
  await page.getByRole('button', { name: 'Vorschlag neu' }).click();
  await expect(text).toHaveValue(/^Verkauft: /);
  await expect(text).not.toHaveValue(/Kaufpreis:/);
  // eigener Text bleibt, bis „Vorschlag neu“
  await text.fill('Mein eigener Text');
  await page.evaluate(() => { wzSchliessen(); wzOeffnen('social'); });
  await expect(text).toHaveValue('Mein eigener Text');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Bild speichern' }).click()]);
  const jpg = await inhalt(dl);
  expect(dl.suggestedFilename()).toMatch(/^Social Media Testhaus hoch\.jpg$/);
  expect(jpg.slice(0, 3).toString('hex')).toBe('ffd8ff');
  expect(jpg.length).toBeGreaterThan(20000);
  await keineSkriptfehler(page);
});
