// Einheitstests zu js/pdfbild.js (D53): PDF aus Seitenbildern (Aufbau, Querverweise, keine Metadaten) und Suche nach Textstellen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../../js/pdfbild.js');

const latin1 = b => Array.from(b, c => String.fromCharCode(c)).join('');
const JPEG = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 0xFF, 0xD9]);   // nur als Bytefolge

test('PDF: zwei Seiten, Querverweise zeigen auf die Objekte, Trailer und startxref stimmen, keine Metadaten', () => {
  const b = P.pdfAusJpegs([{ jpeg: JPEG, breitePx: 1240, hoehePx: 1754, breitePt: 595.28, hoehePt: 841.89 },
    { jpeg: JPEG, breitePx: 1754, hoehePx: 1240, breitePt: 841.89, hoehePt: 595.28 }]);
  const s = latin1(b);
  assert.ok(s.startsWith('%PDF-1.4\n%'));
  assert.ok(s.endsWith('%%EOF\n'));
  const start = +/startxref\n(\d+)\n%%EOF\n$/.exec(s)[1];
  assert.equal(s.slice(start, start + 5), 'xref\n');
  const x = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(s.slice(start));
  assert.equal(+x[1], 9);
  const eintraege = x[2].match(/.{20}/gs);
  assert.equal(eintraege.length, 9);
  eintraege.slice(1).forEach((e, i) => assert.equal(s.slice(+e.slice(0, 10), +e.slice(0, 10) + String(i + 1).length + 6), (i + 1) + ' 0 obj'));
  assert.match(s, /\/Type \/Pages \/Kids \[3 0 R 6 0 R\] \/Count 2/);
  assert.match(s, /\/MediaBox \[0 0 595.28 841.89\]/);
  assert.match(s, /\/Width 1754 \/Height 1240 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode \/Length 14/);
  assert.doesNotMatch(s, /\/Info|\/Producer|\/Author|\/Title|\/Font|BT /);
  // Bildbytes unverändert in der Datei
  const i = s.indexOf('stream\n\xFF\xD8'); assert.ok(i > 0);
  assert.deepEqual(Array.from(b.slice(i + 7, i + 7 + JPEG.length)), Array.from(JPEG));
});

test('Suche: Begriff ohne Groß- und Kleinschreibung, Muster IBAN, E-Mail, Telefon, Datum; Fläche anteilig, etwas breiter', () => {
  const items = [{ str: 'Eigentümer: Erika Musterfrau, geb. 01.02.1960', x: 0.1, y: 0.2, w: 0.5, h: 0.02 },
    { str: 'IBAN DE89 3704 0044 0532 0130 00', x: 0.1, y: 0.3, w: 0.4, h: 0.02 },
    { str: 'Tel 07062 123456 · erika@example.org', x: 0.1, y: 0.4, w: 0.4, h: 0.02 },
    { str: '', x: 0, y: 0, w: 0, h: 0 }];
  const t = P.treffer(items, 'musterfrau');
  assert.equal(t.length, 1); assert.equal(t[0].text, 'Musterfrau');
  const z = 0.5 / items[0].str.length;
  assert.ok(Math.abs(t[0].x - (0.1 + (items[0].str.indexOf('Musterfrau') - 1) * z)) < 1e-9);
  assert.ok(Math.abs(t[0].w - 12 * z) < 1e-9);
  assert.ok(t[0].y < 0.2 && t[0].h > 0.02);
  assert.deepEqual(P.treffer(items, 'iban').map(x => x.text), ['DE89 3704 0044 0532 0130 00']);
  assert.deepEqual(P.treffer(items, 'email').map(x => x.text), ['erika@example.org']);
  assert.deepEqual(P.treffer(items, 'telefon').map(x => x.text), ['07062 123456']);
  assert.deepEqual(P.treffer(items, 'datum').map(x => x.text), ['01.02.1960']);
  assert.deepEqual(P.treffer(items, 'Erika   Musterfrau').map(x => x.text), ['Erika Musterfrau']);
  assert.deepEqual(P.treffer(items, 'a'), []);
  assert.deepEqual(P.treffer(items, '(x'), []);
});
