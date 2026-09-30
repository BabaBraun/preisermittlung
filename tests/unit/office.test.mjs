/* Office-Export: ZIP-Container, XLSX und DOCX. Die Dateien werden mit unabhängigen Bibliotheken geöffnet
   (Python: zipfile, openpyxl, python-docx). Fehlt Python, werden diese Prüfungen übersprungen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const require = createRequire(import.meta.url);
const O = require('../../js/office.js');
const AUSGABE = new URL('../ausgabe/', import.meta.url);
mkdirSync(AUSGABE, { recursive: true });

const PY = pythonMit('docx, openpyxl');
const pruefe = datei => pythonJson(PY, ['tests/referenz/pruefe_office.py', datei]);
const schreibe = (name, bytes) => { const p = new URL(name, AUSGABE); writeFileSync(p, bytes); return p.pathname.replace(/^\/([A-Za-z]:)/, '$1'); };

test('CRC-32 nach Norm (Prüfwert für „123456789“)', () => {
  assert.equal(O.crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});

test('Spaltenbuchstaben', () => {
  assert.deepEqual([0, 25, 26, 27, 701, 702].map(O.spalte), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
});

test('Bildmaße aus JPEG', () => {
  const b = O.dataUrlZuBild(FOTO_JPEG);
  assert.equal(b.art, 'jpeg');
  assert.equal(b.breite, 320);
  assert.equal(b.hoehe, 240);
  assert.equal(O.dataUrlZuBild('javascript:alert(1)'), null);
});

test('XML-Maskierung entfernt Steuerzeichen und maskiert Sonderzeichen', () => {
  assert.equal(O.xmlText('a<b>&"c"\u0001'), 'a&lt;b&gt;&amp;&quot;c&quot;');
});

test('ZIP-Container ist gültig', { skip: !PY && !process.env.CI && 'Python mit docx/openpyxl fehlt' }, () => {
  const z = O.zip([{ name: 'a.txt', daten: 'Grüße' }, { name: 'ordner/b.bin', daten: new Uint8Array([0, 1, 2, 255]) }]);
  const r = pruefe(schreibe('test.zip', z));
  assert.deepEqual(r.zip.dateien, ['a.txt', 'ordner/b.bin']);
});

test('XLSX: Zahlen bleiben Zahlen, Formate und Umlaute stimmen', { skip: !PY && !process.env.CI && 'Python mit docx/openpyxl fehlt' }, () => {
  const x = O.xlsx([
    { name: 'Ergebnis', spalten: [40, 18], zeilen: [
      [{ v: 'Rechnerische Preisermittlung', s: 'titel' }],
      ['Objekt', 'Hauptstraße 1, 74360 Ilsfeld'],
      ['Bodenwert', { v: 247000, s: 'eur' }],
      ['Bruttomietrendite', { v: 5.94, s: 'pct' }],
      ['Vervielfältiger', { v: 26.49957, s: 'dez' }],
      [{ v: 'Empfohlener Preisansatz', s: 'fett' }, { v: 472970.43, s: 'fetteur' }],
      ['Text mit <Klammern> & „Anführung“', { v: -1234.5, s: 'eur' }]
    ] },
    { name: 'Eingaben: Test/1', zeilen: [['Feld', 'Wert'], ['ek_brw', '380']] }
  ], { titel: 'Test' });
  const r = pruefe(schreibe('test.xlsx', x)).xlsx.blaetter;
  assert.deepEqual(Object.keys(r), ['Ergebnis', 'Eingaben  Test 1']);
  const z = Object.fromEntries(r.Ergebnis.map(c => [c.ref, c]));
  assert.equal(z.B2.wert, 'Hauptstraße 1, 74360 Ilsfeld');
  assert.equal(z.B3.wert, 247000);
  assert.equal(z.B3.format, '#,##0 "€"');
  assert.equal(z.B4.format, '0.00" %"');
  assert.equal(z.B6.wert, 472970.43);
  assert.equal(z.B6.fett, true);
  assert.equal(z.A7.wert, 'Text mit <Klammern> & „Anführung“');
  assert.equal(z.B7.wert, -1234.5);
});

test('DOCX: Überschriften, Tabellen, Bild und Seitenumbruch', { skip: !PY && !process.env.CI && 'Python mit docx/openpyxl fehlt' }, () => {
  const bild = Object.assign(O.dataUrlZuBild(FOTO_JPEG), { typ: 'bild', alt: 'Ansicht', breiteCm: 8 });
  const d = O.docx([
    { typ: 'h1', text: 'Rechnerische Preisermittlung' },
    { typ: 'p', runs: [{ text: 'Objekt: ' }, { text: 'Hauptstraße 1 <&>', fett: true }] },
    { typ: 'umbruch' },
    { typ: 'h2', text: 'Preisempfehlung' },
    { typ: 'tabelle', zeilen: [[{ text: 'Sachwert' }, { text: '598.367 €', rechts: true }], Object.assign([{ text: 'Empfohlener Preisansatz' }, { text: '472.970 €', rechts: true }], { fett: true })] },
    bild,
    { typ: 'liste', text: 'Grundbuchauszug fehlt' },
    { typ: 'p', text: 'Zeile 1\nZeile 2' }
  ], { titel: 'Preisermittlung Test' });
  const r = pruefe(schreibe('test.docx', d)).docx;
  assert.equal(r.titel, 'Preisermittlung Test');
  assert.equal(r.sprache, 'de-DE');
  assert.deepEqual(r.absaetze.slice(0, 3), [
    { stil: 'Heading 1', text: 'Rechnerische Preisermittlung' },
    { stil: 'Normal', text: 'Objekt: Hauptstraße 1 <&>' },
    { stil: 'Heading 2', text: 'Preisempfehlung' }]);
  assert.deepEqual(r.tabellen[0], [['Sachwert', '598.367 €'], ['Empfohlener Preisansatz', '472.970 €']]);
  assert.equal(r.bilder, 1);
  assert.deepEqual(r.bildgroessen_cm[0], [8, 6]);
  assert.ok(r.absaetze.some(a => a.text === '• Grundbuchauszug fehlt'));
  assert.ok(r.absaetze.some(a => a.text === 'Zeile 1\nZeile 2'));
});
