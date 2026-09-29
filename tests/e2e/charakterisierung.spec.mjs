/* Charakterisierung des Rechenkerns im Browser: Für jeden synthetischen Fall werden alle Zahlen aus
   window._R und alle angezeigten Ergebnisse (o_*, r_*) mit dem festgehaltenen Stand verglichen.
   Der Stand wurde VOR dem Umbau des Rechenkerns aufgenommen (GOLDEN_SCHREIBEN=1) und sichert,
   dass die Umstrukturierung nichts am Ergebnis ändert. Fachliche Änderungen danach sind in
   tests/fixtures/golden-aenderungen.md mit Quelle und Vorher/Nachher dokumentiert. */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, ergebnisLesen, keineSkriptfehler } from './helfer.mjs';

const DATEI = new URL('../fixtures/golden.json', import.meta.url);
const SCHREIBEN = !!process.env.GOLDEN_SCHREIBEN;

test('Rechenergebnisse entsprechen dem festgehaltenen Stand', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  const ist = {};
  for (const fall of SZENARIEN) {
    await fallAnwenden(page, fall);
    ist[fall.name] = await ergebnisLesen(page);
  }
  await keineSkriptfehler(page);
  if (SCHREIBEN || !existsSync(DATEI)) {
    writeFileSync(DATEI, JSON.stringify(ist, null, 1));
    test.info().annotations.push({ type: 'hinweis', description: 'golden.json neu geschrieben' });
    return;
  }
  const soll = JSON.parse(readFileSync(DATEI, 'utf8'));
  for (const fall of SZENARIEN) {
    const s = soll[fall.name], i = ist[fall.name];
    expect(i.zahlen, 'Zahlen in Fall ' + fall.name).toEqual(s.zahlen);
    expect(i.texte, 'Anzeige in Fall ' + fall.name).toEqual(s.texte);
  }
});
