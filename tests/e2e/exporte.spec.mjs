/* Exporte aus der App: Word (.docx), Excel (.xlsx) und Projektdatei (.json).
   Die heruntergeladenen Dateien werden mit python-docx/openpyxl geöffnet (tests/referenz/pruefe_office.py). */
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';

const PY = ['python', 'python3'].find(p => spawnSync(p, ['-c', 'import docx, openpyxl'], { encoding: 'utf8' }).status === 0);
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
function pruefe(datei) {
  const r = spawnSync(PY, ['tests/referenz/pruefe_office.py', datei], { encoding: 'utf8' });
  expect(r.status, 'Datei lässt sich nicht öffnen: ' + r.stderr).toBe(0);
  // nur die JSON-Zeile lesen: Bibliotheken schreiben unter Umständen Warnungen davor
  return JSON.parse(r.stdout.split(/\r?\n/).reverse().find(z => z.trim().startsWith('{')));
}
async function vorbereiten(page) {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_anbau_niessbrauch_vergleich'));
  await page.evaluate(({ foto, gr }) => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('ek_ag').value = 'Synthetischer Auftrag „Ä & Ö“';
    $('ek_ersteller').value = 'Testperson';
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht Süd' }, { id: 'f2', cat: 'schaden', data: foto, caption: 'Riss im Putz' }];
    GRUNDRISSE = [{ id: 'g1', darst: 'aufteilung', d: gr }];
    compute(); renderPhotos(); grListen();
  }, { foto: FOTO_JPEG, gr: GRUNDRISS_TEST });
}

test('Word-Export ist eine echte .docx-Datei mit Bericht, Tabellen, Fotos und Grundriss', async ({ page }) => {
  test.skip(!PY, 'Python mit python-docx/openpyxl fehlt');
  await vorbereiten(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportWord())]);
  expect(dl.suggestedFilename()).toBe('Preisermittlung Musterweg 7 74360 Ilsfeld.docx');
  const pfad = AUSGABE + 'bericht.docx'; await dl.saveAs(pfad);
  const r = pruefe(pfad).docx;
  const texte = r.absaetze.map(a => a.text).join('\n');
  expect(texte).toContain('Rechnerische Preisermittlung');
  expect(r.absaetze.some(a => a.stil === 'Heading 2' && /Preisempfehlung/.test(a.text))).toBe(true);
  const tabellen = JSON.stringify(r.tabellen);
  expect(tabellen).toContain('Synthetischer Auftrag „Ä & Ö“');
  expect(tabellen).toContain('Empfohlener Preisansatz');
  const empf = await page.evaluate(() => eur(window._R.empfehlung));
  expect(tabellen).toContain(empf);
  expect(r.bilder, 'Titelbild, zwei Fotos und der Grundriss').toBeGreaterThanOrEqual(4);
  await keineSkriptfehler(page);
});

test('Excel-Export ist eine echte .xlsx-Datei mit Zahlenwerten und allen Eingaben', async ({ page }) => {
  test.skip(!PY, 'Python mit python-docx/openpyxl fehlt');
  await vorbereiten(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportExcel())]);
  expect(dl.suggestedFilename()).toBe('Preisermittlung Musterweg 7 74360 Ilsfeld.xlsx');
  const pfad = AUSGABE + 'kennzahlen.xlsx'; await dl.saveAs(pfad);
  const b = pruefe(pfad).xlsx.blaetter;
  expect(Object.keys(b)).toEqual(['Ergebnis', 'Eingaben']);
  const zeile = t => { const a = b.Ergebnis.find(c => c.wert === t); return a && b.Ergebnis.find(c => c.ref === 'B' + a.ref.slice(1)); };
  const R = await page.evaluate(() => window._R);
  expect(zeile('Empfohlener Preisansatz').wert).toBeCloseTo(R.empfehlung, 1);
  expect(zeile('Empfohlener Preisansatz').format).toBe('#,##0 "€"');
  expect(zeile('Bodenwert').wert).toBeCloseTo(R.bodenwert, 1);
  expect(zeile('Status').wert).toBe('gültig');
  expect(b.Eingaben.some(c => c.wert === 'Synthetischer Auftrag „Ä & Ö“')).toBe(true);
  await keineSkriptfehler(page);
});
