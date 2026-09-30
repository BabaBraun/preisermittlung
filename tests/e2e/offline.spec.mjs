/* PWA: Start ohne Netz nach dem ersten Besuch (Service Worker) und Übernahme einer neuen App-Fassung. */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { JETZT, fallAnwenden, arbeitsflaeche } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

const SW = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const CACHE = SW.match(/const CACHE = '([^']+)'/)[1];
const ASSETS_BLOCK = SW.slice(SW.indexOf('const ASSETS'), SW.indexOf('];', SW.indexOf('const ASSETS')));
const ASSETS = [...ASSETS_BLOCK.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);

async function erstbesuch(page) {
  await page.clock.setFixedTime(JETZT);
  await page.goto('/index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async c => { if (!(await caches.has(c))) return 0; return (await (await caches.open(c)).keys()).length; }, CACHE),
    { timeout: 20_000 }).toBeGreaterThanOrEqual(ASSETS.length);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('Offline-Start nach dem ersten Besuch: App, Rechenkern, Exporte und PDF-Baustein aus dem Cache', async ({ page, context }) => {
  test.setTimeout(90_000);
  await erstbesuch(page);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => typeof compute === 'function' && !!window.ImmoKern && !!window.ImmoOffice && !!window.ImmoPdf && !!window.ImmoDaten
    && !!window.ImmoVerwaltung && typeof lvOeffnen === 'function');
  await page.evaluate(() => window.IA_BEREIT_P);
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await expect(page.locator('#r_empfehlung')).toHaveText('472.970 €');
  expect(await page.evaluate(async () => { await html2pdfLaden(); return typeof html2pdf; })).toBe('function');
  await page.evaluate(() => lvOeffnen('uebersicht'));   // Liegenschaftsverwaltung offline
  await expect(page.locator('#lv_body')).toContainText('Erste Liegenschaft anlegen');
  await page.evaluate(() => lvSchliessen());
  const st = await page.evaluate(async () => { const r = await fetch('selbsttest.js'); return r.status; });
  expect(st).toBe(200);
  await context.setOffline(false);
});

test('Update: eine neue Fassung übernimmt die Kontrolle und räumt den alten Cache ab', async ({ page, context }) => {
  test.setTimeout(90_000);
  await erstbesuch(page);
  const NEU = CACHE + '-testupdate';
  // Der Testserver liefert ab jetzt eine sw.js mit neuer Cache-Version (Steuerpfad nur mit TEST_STEUERUNG=1)
  const st = await page.request.get('/__test/sw?cache=' + encodeURIComponent(NEU));
  expect(st.ok(), 'Testserver mit TEST_STEUERUNG=1 starten (npm run test:e2e startet ihn so)').toBe(true);
  try {
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 30_000 }).toEqual([NEU]);
    await page.reload();
    await page.waitForFunction(() => typeof compute === 'function');
    expect(await page.evaluate(async c => (await (await caches.open(c)).keys()).length, NEU)).toBeGreaterThanOrEqual(ASSETS.length);
    expect(await page.evaluate(() => navigator.serviceWorker.controller && navigator.serviceWorker.controller.state)).toBe('activated');
  } finally {
    await page.request.get('/__test/sw');
  }
});
