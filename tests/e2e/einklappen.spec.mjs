/* Bewertung als Liste: jeder Abschnitt und jeder Block lässt sich zu- und wieder aufklappen — in allen Vordrucken
   (Haus, Wohnung, Gewerbe), auch nach Neuberechnung; Nummern fortlaufend 1, 2, 3 … ohne Lücken, Blöcke N.1, N.2 … */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler, pruefeAlles } from './helfer.mjs';

test('Alle Abschnitte und Blöcke lassen sich zu- und aufklappen, Nummern fortlaufend (Haus, Wohnung, Gewerbe)', async ({ page }) => {
  await appOeffnen(page);
  const vordrucke = await page.evaluate(() => (window.VORDRUCKE_LISTE || VORDRUCKE).map(v => v.id));
  for (const v of vordrucke) {
    const r = await pruefeAlles(page, v);
    expect(r.nummern.length, v).toBeGreaterThanOrEqual(18);
    expect(new Set(r.bloecke).size, v + ': Blocknummern eindeutig').toBe(r.bloecke.length);
  }
  // Vergleichswert-Abschnitt: Titel wechselt mit der Neuberechnung, Pfeil und Nummer bleiben
  await page.evaluate(() => { compute(); compute(); });
  const h = page.locator('#h_vergleich');
  await expect(h.locator('.app-sec-toggle')).toHaveCount(1); await expect(h.locator('.step')).toHaveCount(1);
  await keineSkriptfehler(page);
});

test('Wohnung: Nummern ohne Lücken, Seitenleiste mit denselben Nummern', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => { const l = window.VORDRUCKE_LISTE || VORDRUCKE; pickVordruck('etw_vergleich'); });
  const titel = await page.locator('main>section.card:visible>h2').evaluateAll(l => l.map(h => h.querySelector('.step').textContent + ' ' + h.querySelector('.app-sec-titel').textContent));
  expect(titel[0]).toBe('1 Eckdaten des Objekts'); expect(titel[1]).toMatch(/^2 Aufnahmebogen/);
  expect(titel.find(t => /Vergleichswert/.test(t))).toMatch(/^\d+ Preisansatz nach Vergleichswert \(Wohnung\)$/);
  const nav = await page.locator('nav.side a[data-sec] span').allTextContents();
  expect(nav[0]).toBe('1 Eckdaten');
  expect(nav.map(t => +t.split(' ')[0])).toEqual(nav.map((_, i) => i + 1));
  await keineSkriptfehler(page);
});
