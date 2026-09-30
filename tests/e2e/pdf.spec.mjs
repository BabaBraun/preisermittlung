/* PDF-Erstellung (html2pdf, lokal aus vendor/) und Druckansicht mit langen Texten und vielen Fotos.
   Das Internet ist gesperrt: der PDF-Baustein muss aus dem Repository kommen. */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('pymupdf');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const pdfLesen = (datei, bilder) => {
  const r = pythonJson(PY, ['tests/referenz/pruefe_pdf.py', datei].concat(bilder ? ['--bilder', bilder] : []));
  expect(r.repariert, datei + ': MuPDF musste das PDF beim Öffnen reparieren').toBe(false);
  expect(r.warnungen, datei + ': MuPDF meldet Probleme im PDF').toEqual([]);
  return r;
};
const SATZ = 'Das Grundstück liegt in ruhiger Wohnlage mit guter Anbindung an den Ortskern; die Umgebung ist durch Ein- und Zweifamilienhäuser geprägt. ';
const LANG = Array.from({ length: 8 }, (_, i) => 'Absatz ' + (i + 1) + ': ' + SATZ.repeat(6)).join('\n\n') + 'ENDE-DES-LANGEN-TEXTES';

async function vorbereiten(page) {
  await page.route(/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await appOeffnen(page);
  // PDF_SCHRIFT=Verdana simuliert breitere Ersatzschriften (z. B. DejaVu Sans unter Linux)
  if (process.env.PDF_SCHRIFT) await page.addStyleTag({ content: '*{font-family:"' + process.env.PDF_SCHRIFT + '" !important}' });
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
  test.skip(!PY && !process.env.CI, 'PyMuPDF fehlt');   // in GitHub Actions Pflicht
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
  test.skip(!PY && !process.env.CI, 'PyMuPDF fehlt');   // in GitHub Actions Pflicht
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
  // keine Überschrift allein am Seitenende: unterste Zeile nach Koordinaten, Überschriften sind nummeriert und
  // größer gesetzt (h2 11,25 pt) als Fließtext und Inhaltsverzeichnis (≤ 10 pt); die Kopfzeile ist ausgenommen
  const kopf = /^\d{1,2}\.\s+\S/;
  const groesste = Math.max(...r.details.flatMap(s => s.groessen.filter(g => g < 14)));
  expect(groesste, 'Überschriftengröße erkannt').toBeGreaterThan(10.5);
  r.details.slice(0, -1).forEach((s, i) => {
    const z = s.letzte || { text: '', groesse: 0 };
    expect(kopf.test(z.text) && z.groesse >= 10.5, 'Seite ' + (i + 1) + ' endet mit einer Überschrift: ' + z.text).toBe(false);
  });
  expect(r.details[r.details.length - 1].letzte, 'letzte Seite ist leer').not.toBeNull();
  expect(r.details.reduce((s, x) => s + x.bilder, 0), 'eingebettete Bilder').toBeGreaterThanOrEqual(1);
  // gleiche Testfotos bettet Chromium nur einmal ein; deshalb im Dokument prüfen: alle Bilder geladen und sichtbar
  const bilder = await page.evaluate(() => [...document.querySelectorAll('#report img, #report svg.gr-svg')].map(e =>
    ({ sichtbar: getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0, geladen: e.tagName !== 'IMG' || (e.complete && e.naturalWidth > 0) })));
  expect(bilder.length, 'Titelbild, 6 Fotos, Grundriss').toBeGreaterThanOrEqual(8);
  expect(bilder.every(b => b.sichtbar && b.geladen)).toBe(true);
  await keineSkriptfehler(page);
});

test('Exposé (Hochformat) und Präsentation (Querformat) als PDF', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'PyMuPDF fehlt');   // in GitHub Actions Pflicht
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

test('Druckansicht: bei verschiedenem Textumfang nie eine Überschrift allein am Seitenende', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'PyMuPDF fehlt');   // in GitHub Actions Pflicht
  test.setTimeout(180_000);
  await vorbereiten(page);
  // Gegenprobe (einmalig am 2026-09-30): ohne die Umbruchregeln fand dieselbe Prüfung bei jedem Versatz 1–3 verwaiste Überschriften
  for (const versatz of [0, 120, 240, 360, 480]) {
    await page.evaluate(v => { druckbericht(); const d = document.createElement('div'); d.style.height = v + 'px'; const h = document.querySelector('#report h2'); (h.closest('.kopf-halt') || h).before(d); }, versatz);
    await page.emulateMedia({ media: 'print' });
    const datei = AUSGABE + 'druck_versatz_' + versatz + '.pdf';
    await page.pdf({ path: datei, format: 'A4', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    const r = pdfLesen(datei);
    const verwaist = r.details.slice(0, -1).map((s, i) => s.letzte && /^\d{1,2}\.\s+\S/.test(s.letzte.text) && s.letzte.groesse >= 10.5 ? 'Seite ' + (i + 1) + ': ' + s.letzte.text : null).filter(Boolean);
    expect(verwaist, 'Versatz ' + versatz + ' px').toEqual([]);
  }
});
