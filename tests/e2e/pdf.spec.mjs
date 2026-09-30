/* PDF-Erstellung (html2pdf, lokal aus vendor/) und Druckansicht mit langen Texten und vielen Fotos.
   Das Internet ist gesperrt: der PDF-Baustein muss aus dem Repository kommen. */
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';

const PY = ['python', 'python3'].find(p => spawnSync(p, ['-c', 'import fitz'], { encoding: 'utf8' }).status === 0);
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const pdfLesen = (datei, bilder) => {
  const r = spawnSync(PY, ['tests/referenz/pruefe_pdf.py', datei].concat(bilder ? ['--bilder', bilder] : []), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  expect(r.status, 'PDF lässt sich nicht öffnen: ' + r.stderr).toBe(0);
  return JSON.parse(r.stdout);
};
const SATZ = 'Das Grundstück liegt in ruhiger Wohnlage mit guter Anbindung an den Ortskern; die Umgebung ist durch Ein- und Zweifamilienhäuser geprägt. ';
const LANG = Array.from({ length: 8 }, (_, i) => 'Absatz ' + (i + 1) + ': ' + SATZ.repeat(6)).join('\n\n') + 'ENDE-DES-LANGEN-TEXTES';

async function vorbereiten(page) {
  await page.route(/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(({ foto, gr, lang }) => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld';
    ['lage_makro', 'maengel', 'eindruck'].forEach(id => { if ($(id)) $(id).value = lang; });
    PHOTOS = Array.from({ length: 6 }, (_, i) => ({ id: 'f' + i, cat: i < 4 ? 'objekt' : 'schaden', data: foto, caption: 'Foto ' + (i + 1) }));
    GRUNDRISSE = [{ id: 'g1', darst: 'aufteilung', d: gr }];
    compute(); renderPhotos(); grListen();
  }, { foto: FOTO_JPEG, gr: GRUNDRISS_TEST, lang: LANG });
}

test('PDF-Download funktioniert ohne Internet und enthält alle Seiten', async ({ page }) => {
  test.skip(!PY, 'PyMuPDF fehlt');
  test.setTimeout(120_000);
  await vorbereiten(page);
  await page.evaluate(() => druckbericht());
  const b64 = await page.evaluate(async () => {
    const blob = await pdfErstellen('blob');
    return await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(blob); });
  });
  const quelle = await page.evaluate(() => [...document.scripts].map(s => s.src).find(s => /html2pdf/.test(s)));
  expect(quelle).toMatch(/\/vendor\/html2pdf\.bundle\.min\.js$/);
  const datei = AUSGABE + 'bericht_html2pdf.pdf';
  writeFileSync(datei, Buffer.from(b64, 'base64'));
  const r = pdfLesen(datei, AUSGABE + 'html2pdf_seiten');
  expect(r.seiten).toBeGreaterThanOrEqual(6);
  expect(r.details.every(s => s.breite_mm === 210 && s.hoehe_mm === 297)).toBe(true);
  await keineSkriptfehler(page);
});

test('Druckansicht: A4, Bedienelemente ausgeblendet, langer Text vollständig', async ({ page }) => {
  test.skip(!PY, 'PyMuPDF fehlt');
  test.setTimeout(120_000);
  await vorbereiten(page);
  await page.evaluate(() => druckbericht());
  await page.emulateMedia({ media: 'print' });
  const sichtbar = await page.evaluate(() => [...document.querySelectorAll('#report .no-print')].filter(e => getComputedStyle(e).display !== 'none').length);
  expect(sichtbar, 'Bedienelemente im Druck').toBe(0);
  const datei = AUSGABE + 'bericht_druck.pdf';
  await page.pdf({ path: datei, format: 'A4', printBackground: true });
  const r = pdfLesen(datei, AUSGABE + 'druck_seiten');
  const text = r.details.map(s => s.text).join('\n');
  expect(text).toContain('Rechnerische Preisermittlung');
  expect(text.replace(/\s+/g, '')).toContain('ENDE-DES-LANGEN-TEXTES');
  expect(text).toContain('472.970 €');
  // keine Überschrift allein am Seitenende, keine leere letzte Seite
  const kopf = /^\d{1,2}\.\s+\S/;
  const zeilenVon = t => t.split(/\r?\n/).map(z => z.trim()).filter(Boolean);
  r.details.slice(0, -1).forEach((s, i) => {
    const zeilen = zeilenVon(s.text);
    expect(kopf.test(zeilen[zeilen.length - 1] || ''), 'Seite ' + (i + 1) + ' endet mit einer Überschrift: ' + zeilen[zeilen.length - 1]).toBe(false);
  });
  const letzte = zeilenVon(r.details[r.details.length - 1].text);
  expect(letzte.length, 'letzte Seite ist leer').toBeGreaterThan(2);
  expect(r.details.reduce((s, x) => s + x.bilder, 0), 'eingebettete Bilder').toBeGreaterThanOrEqual(1);
  // gleiche Testfotos bettet Chromium nur einmal ein; deshalb im Dokument prüfen: alle Bilder geladen und sichtbar
  const bilder = await page.evaluate(() => [...document.querySelectorAll('#report img, #report svg.gr-svg')].map(e =>
    ({ sichtbar: getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0, geladen: e.tagName !== 'IMG' || (e.complete && e.naturalWidth > 0) })));
  expect(bilder.length, 'Titelbild, 6 Fotos, Grundriss').toBeGreaterThanOrEqual(8);
  expect(bilder.every(b => b.sichtbar && b.geladen)).toBe(true);
  await keineSkriptfehler(page);
});

test('Exposé (Hochformat) und Präsentation (Querformat) als PDF', async ({ page }) => {
  test.skip(!PY, 'PyMuPDF fehlt');
  test.setTimeout(180_000);
  await vorbereiten(page);
  const erzeugen = async (vorher, name) => {
    const b64 = await page.evaluate(async (v) => {
      if (v === 'expose') exposeAnzeigen(); else await vpAlsDokument();
      const blob = await pdfErstellen('blob');
      return await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(blob); });
    }, vorher);
    const datei = AUSGABE + name; writeFileSync(datei, Buffer.from(b64, 'base64'));
    return pdfLesen(datei);
  };
  const ex = await erzeugen('expose', 'expose.pdf');
  expect(ex.seiten).toBeGreaterThanOrEqual(1);
  expect(ex.details[0].breite_mm).toBe(210);
  const vp = await erzeugen('praesentation', 'praesentation.pdf');
  const folien = await page.evaluate(() => document.querySelectorAll('#report .vp-folie').length);
  expect(folien).toBeGreaterThanOrEqual(4);
  expect(vp.seiten, 'eine Seite je Folie').toBe(folien);
  expect(vp.details.every(s => s.breite_mm === 297 && s.hoehe_mm === 210), 'Folien im Querformat').toBe(true);
  await keineSkriptfehler(page);
});
