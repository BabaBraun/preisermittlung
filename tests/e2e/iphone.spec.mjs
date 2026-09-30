/* iPhone (WebKit, Safari-Engine, 390 × 664 Ansicht): Ansichten, Selbsttest und Rechnung.
   Simuliert — ersetzt nicht die Prüfung auf einem echten Gerät (Face ID, Kamera, GPS, Teilen-Menü). */
import { test, expect } from '@playwright/test';
import { alleAnsichten } from './ansichten.mjs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

test('iPhone: alle Ansichten ohne waagrechtes Scrollen', async ({ page }) => {
  test.setTimeout(180_000);
  await alleAnsichten(page, 'iphone');
});

test('iPhone: Selbsttest und Referenzbewertung in der Safari-Engine', async ({ page }) => {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await expect(page.locator('#mb_empf')).toHaveText('472.970 €');
  await page.addScriptTag({ url: '/selbsttest.js' });
  const erg = await page.evaluate(() => window.iaSelbsttest().filter(e => !e.ok).map(e => e.gruppe + ': ' + e.name));
  expect(erg).toEqual([]);
  await keineSkriptfehler(page);
});

test('iPhone: Bedienleiste unten ist mit dem Finger erreichbar (mind. 44 px)', async ({ page }) => {
  await appOeffnen(page); await arbeitsflaeche(page);
  const hoehen = await page.evaluate(() => [...document.querySelectorAll('#mbar button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)));
  expect(hoehen.length).toBeGreaterThanOrEqual(4);
  for (const h of hoehen) expect(h).toBeGreaterThanOrEqual(44);
});
