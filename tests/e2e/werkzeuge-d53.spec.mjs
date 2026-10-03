/* D53 im Browser: PDF schwärzen — Text-PDF öffnen (pdf.js aus vendor/), Treffer der Suche und Muster schwärzen, Fläche von Hand,
   Seite weglassen, neue PDF aus Bildern ohne Text und ohne Metadaten. Die Test-PDF entsteht hier im Test; frei erfundene Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

/* kleine Text-PDF (Helvetica, A4) mit korrekter Querverweistabelle; seiten = [[Zeile, …], …] */
function textPdf(seiten) {
  const teile = [], ab = []; let n = 0;
  const dazu = s => { teile.push(s); n += Buffer.byteLength(s, 'latin1'); };
  const obj = (nr, s) => { ab[nr] = n; dazu(nr + ' 0 obj\n' + s + '\nendobj\n'); };
  dazu('%PDF-1.4\n');
  const k = seiten.map((_, i) => (4 + 2 * i) + ' 0 R').join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [' + k + '] /Count ' + seiten.length + ' >>');
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  seiten.forEach((z, i) => {
    const strom = 'BT /F1 14 Tf 72 760 Td ' + z.map(t => '(' + t + ') Tj 0 -24 Td').join(' ') + ' ET';
    obj(4 + 2 * i, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (5 + 2 * i) + ' 0 R >>');
    obj(5 + 2 * i, '<< /Length ' + Buffer.byteLength(strom, 'latin1') + ' >>\nstream\n' + strom + '\nendstream');
  });
  const anzahl = 4 + 2 * seiten.length, x = n;
  let xr = 'xref\n0 ' + anzahl + '\n0000000000 65535 f \n'; for (let i = 1; i < anzahl; i++) xr += String(ab[i]).padStart(10, '0') + ' 00000 n \n';
  dazu(xr + 'trailer\n<< /Size ' + anzahl + ' /Root 1 0 R /Info << /Author (Erika Musterfrau) >> >>\nstartxref\n' + x + '\n%%EOF\n');
  return Buffer.from(teile.join(''), 'latin1');
}
const PDF = textPdf([['Grundbuch von Musterstadt, Blatt 4711', 'Eigentuemerin: Erika Musterfrau, geb. 01.02.1960', 'IBAN DE89 3704 0044 0532 0130 00'],
  ['Seite zwei: Mieter Max Probe', 'Telefon 07062 123456']]);

test('PDF schwärzen: Suche und Muster, Fläche von Hand, Seite weglassen — neue PDF ohne Text und ohne Metadaten (D53)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('schwaerzen'));
  await expect(page.locator('#wz_titel')).toHaveText('PDF schwärzen');
  await page.locator('#ps_datei').setInputFiles({ name: 'Grundbuch Test.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(page.locator('#wz_body')).toContainText('Grundbuch Test · 2 Seiten', { timeout: 20000 });
  await expect(page.locator('.ps-blaettern')).toContainText('Seite 1 von 2');
  // Suche: Name, dann IBAN und Datum als Muster
  await page.locator('#ps_suche').fill('Musterfrau');
  await page.getByRole('button', { name: 'Alle Treffer schwärzen' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-gruen')).toContainText('1 Stelle geschwärzt („Musterfrau“)');
  await page.getByRole('button', { name: 'IBAN' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-gruen')).toContainText('1 Stelle geschwärzt (IBAN)');
  await page.getByRole('button', { name: 'Daten (TT.MM.JJJJ)' }).click();
  await page.getByRole('button', { name: 'Telefonnummern' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-gruen')).toContainText('1 Stelle geschwärzt (Telefonnummern)');
  const fl = await page.evaluate(() => [PS.flaechen[0].map(f => f.quelle), (PS.flaechen[1] || []).map(f => f.quelle)]);
  expect(fl).toEqual([['„Musterfrau“', 'IBAN', 'Daten (TT.MM.JJJJ)'], ['Telefonnummern']]);
  // die Fläche liegt über dem Namen: Pixel in der Mitte schwarz
  const schwarz = await page.evaluate(() => { const f = PS.flaechen[0][0], c = document.getElementById('ps_vorschau');
    const p = c.getContext('2d').getImageData(Math.round((f.x + f.w / 2) * c.width), Math.round((f.y + f.h / 2) * c.height), 1, 1).data; return [p[0], p[1], p[2]]; });
  expect(schwarz).toEqual([0, 0, 0]);
  // Fläche von Hand aufziehen
  const box = await page.locator('#ps_vorschau').boundingBox();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.05); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.08, { steps: 4 }); await page.mouse.up();
  await expect(page.locator('#wz_body .fs-liste li')).toHaveCount(4);
  // Seite 2 weglassen
  await page.getByRole('button', { name: 'Nächste Seite' }).click();
  await expect(page.locator('.ps-blaettern')).toContainText('Seite 2 von 2');
  await page.getByLabel('Seite weglassen').check();
  await expect(page.locator('#wz_body')).toContainText('5 Flächen geschwärzt, 1 Seite weggelassen.');
  // speichern
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Geschwärzte PDF speichern' }).click()]);
  expect(dl.suggestedFilename()).toBe('Grundbuch Test geschwärzt.pdf');
  const aus = Buffer.concat(await (await dl.createReadStream()).toArray());
  const t = aus.toString('latin1');
  expect(t.startsWith('%PDF-1.4')).toBe(true);
  expect(t).toContain('/Count 1');
  expect(t).toContain('/Filter /DCTDecode');
  for (const w of ['Musterfrau', 'Probe', 'DE89', '/Font', '/Author', 'Erika']) expect(t).not.toContain(w);
  // pdf.js liest die neue Datei: eine Seite, kein Text
  const pruef = await page.evaluate(async b64 => {
    const daten = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), lib = await psPdfjs();
    const doc = await lib.getDocument({ data: daten, isEvalSupported: false }).promise, s = await doc.getPage(1), tc = await s.getTextContent();
    const v = s.getViewport({ scale: 1 }); return [doc.numPages, tc.items.length, Math.round(v.width), Math.round(v.height)];
  }, aus.toString('base64'));
  expect(pruef).toEqual([1, 0, 595, 842]);
  // Schließen: nichts bleibt im Speicher
  await page.evaluate(() => wzSchliessen());
  expect(await page.evaluate(() => PS.seiten.length)).toBe(0);
  await keineSkriptfehler(page);
});

test('PDF schwärzen: andere Datei als PDF wird abgelehnt, Kennwort-PDF mit Hinweis (D53)', async ({ page }) => {
  const meldungen = [];
  page.on('dialog', async d => { meldungen.push(d.message()); await d.accept(); });
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('schwaerzen'));
  await page.locator('#ps_datei').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]) });
  await expect.poll(() => meldungen.length).toBe(1);
  expect(meldungen[0]).toContain('Bitte eine PDF-Datei wählen');
  await page.locator('#ps_datei').setInputFiles({ name: 'kaputt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 kaputt') });
  await expect.poll(() => meldungen.length, { timeout: 15000 }).toBe(2);
  expect(meldungen[1]).toContain('Die PDF lässt sich nicht öffnen');
  await expect(page.locator('#wz_body')).toContainText('PDF wählen');
  await keineSkriptfehler(page);
});
