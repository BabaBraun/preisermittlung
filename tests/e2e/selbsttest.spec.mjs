/* Der eingebaute Selbsttest (Export-Menü) muss bestehen und darf die offene Bewertung nicht verändern —
   auch nicht Fotos, Grundrisse und Unterschrift. */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';

test('Selbsttest besteht und erhält die offene Bewertung vollständig', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_anbau_niessbrauch_vergleich'));
  await page.evaluate(({ foto, gr }) => {
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht Süd (synthetisch)' }];
    GRUNDRISSE = [{ id: 'g1', darst: 'aufteilung', d: gr }];
    SIGNATURE = foto;
    $('en_klasse').dataset.manuell = '1';
    compute();
  }, { foto: FOTO_JPEG, gr: GRUNDRISS_TEST });
  const vorher = await page.evaluate(() => JSON.stringify({ s: snapshot(), R: window._R, m: $('en_klasse').dataset.manuell }));
  const lsVorher = await page.evaluate(() => localStorage.getItem('vb_wert2'));

  await page.addScriptTag({ url: '/selbsttest.js' });
  const erg = await page.evaluate(() => window.iaSelbsttest().map(e => ({ g: e.gruppe, n: e.name, ok: e.ok, ist: e.ist, soll: e.soll })));
  const fehler = erg.filter(e => !e.ok);
  expect(fehler, 'fehlgeschlagene Selbsttest-Prüfungen').toEqual([]);
  expect(erg.length).toBeGreaterThanOrEqual(85);   // ohne die Prüfungen der entfernten Liegenschaftsverwaltung (D27)

  const nachher = await page.evaluate(() => JSON.stringify({ s: snapshot(), R: window._R, m: $('en_klasse').dataset.manuell }));
  expect(nachher).toBe(vorher);
  const lsNachher = await page.evaluate(() => localStorage.getItem('vb_wert2'));
  expect(lsNachher).toBe(lsVorher);
  await keineSkriptfehler(page);
});
