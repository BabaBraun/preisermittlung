/* Prüfung von Projekt-, Gesamt- und Marktdatensicherungen vor dem Einlesen, auch ältere Formate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';

const require = createRequire(import.meta.url);
const D = require('../../js/daten.js');

const PROJEKT = { fields: { ek_anschrift: 'Musterweg 7', ek_brw: '380', rl_aktiv: false },
  photos: [{ id: 'p1', cat: 'objekt', caption: 'Süd', data: FOTO_JPEG }], signature: null,
  grundrisse: [{ id: 'g1', darst: 'aufteilung', d: GRUNDRISS_TEST }] };

test('JSON lesen: leer, beschädigt, mit BOM', () => {
  assert.equal(D.jsonLesen('').ok, false);
  assert.match(D.jsonLesen('{"fields":{"ek_brw":"3').fehler, /beschädigt oder unvollständig/);
  assert.deepEqual(D.jsonLesen('﻿{"a":1}').wert, { a: 1 });
});

test('Projektdatei: aktuelles Format bleibt vollständig erhalten', () => {
  const r = D.projektDateiPruefen(JSON.parse(JSON.stringify(PROJEKT)));
  assert.equal(r.ok, true);
  assert.equal(r.altformat, false);
  assert.deepEqual(r.daten.fields, PROJEKT.fields);
  assert.equal(r.daten.photos.length, 1);
  assert.equal(r.daten.photos[0].data, FOTO_JPEG);
  assert.deepEqual(r.daten.grundrisse[0].d, GRUNDRISS_TEST);
});

test('Projektdatei: Altformat (flache Feldliste) wird erkannt', () => {
  const r = D.projektDateiPruefen({ ek_anschrift: 'Altbau 1', ek_brw: '200', er_bewirt: '20' });
  assert.equal(r.ok, true);
  assert.equal(r.altformat, true);
  assert.equal(r.daten.fields.ek_anschrift, 'Altbau 1');
});

test('Projektdatei: manipulierte Inhalte werden verworfen', () => {
  const r = D.projektDateiPruefen({
    fields: { ek_brw: '380', 'x"><img': 'a', ek_obj: { boese: 1 } },
    photos: [{ id: "x');alert(1);('", cat: 'objekt', data: FOTO_JPEG }, { id: 'p2', data: 'javascript:alert(1)' }, 'kaputt'],
    signature: '" onerror="alert(1)', grundrisse: [{ id: 'g"1', d: {} }]
  });
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.daten.fields), ['ek_brw']);
  assert.equal(r.daten.photos.length, 1);
  assert.match(r.daten.photos[0].id, /^[\w-]+$/);
  assert.equal(r.daten.signature, null);
  assert.equal(r.daten.grundrisse.length, 0);
  assert.deepEqual(r.verworfen, { felder: 2, fotos: 2, grundrisse: 1, unterschrift: 1 });
});

test('Projektdatei: falsche Dateiarten mit Hinweis', () => {
  assert.match(D.projektDateiPruefen({ typ: 'immoapp-projekte', projekte: [] }).fehler, /Gesamtsicherung/);
  assert.match(D.projektDateiPruefen({ typ: 'vb-marktdaten', objekte: [] }).fehler, /Marktüberblick/);
  assert.match(D.projektDateiPruefen({ foo: 1 }).fehler, /keine Bewertung/);
  assert.equal(D.projektDateiPruefen('text').ok, false);
});

test('Gesamtsicherung Version 2 und Version 1 (reine Projektliste)', () => {
  const v2 = D.projektSicherungPruefen({ typ: 'immoapp-projekte', version: 2, projekte: [{ id: 'p1', name: 'A', data: PROJEKT, geaendert: 5 }],
    kunden: [{ id: 'k1', nachname: 'Beispiel' }, { nachname: 'ohne id' }], aufgaben: [{ id: 'a1', text: 'Anrufen' }], parameter: [{ id: 'm1' }] });
  assert.equal(v2.ok, true);
  assert.equal(v2.projekte.length, 1);
  assert.equal(v2.projekte[0].data.photos.length, 1);
  assert.equal(v2.kunden.length, 1);
  assert.equal(v2.aufgaben.length, 1);
  assert.equal(v2.verworfen, 1);
  const v1 = D.projektSicherungPruefen([{ id: 'p1700000000000', name: 'Alt', data: { ek_anschrift: 'Alt 1', ek_brw: '100' } }]);
  assert.equal(v1.ok, true);
  assert.equal(v1.version, 1);
  assert.equal(v1.projekte[0].data.ek_anschrift, 'Alt 1', 'Altformat bleibt flach');
  assert.equal(v1.projekte[0].geaendert, 1700000000000, 'Änderungszeit aus der Kennung');
});

test('Gesamtsicherung mit Notaraufträgen (D39): gültige bleiben, beschädigte werden verworfen', () => {
  const n = { id: 'no1', anschrift: 'Musterweg 7a', verkaeufer: [{ name: 'A' }], kaeufer: [{ name: 'B' }], geaendert: 3 };
  const r = D.projektSicherungPruefen({ typ: 'immoapp-projekte', version: 2, projekte: [], notar: [n, { id: 'no2', verkaeufer: 'x', kaeufer: [] }, { id: '../x', verkaeufer: [], kaeufer: [] }, 'x'] });
  assert.equal(r.ok, true, 'eine Sicherung nur mit Notaraufträgen ist gültig');
  assert.deepEqual(r.notar.map(x => x.id), ['no1']);
  assert.equal(r.verworfen, 3);
  assert.deepEqual(D.projektSicherungPruefen({ typ: 'immoapp-projekte', version: 2, projekte: [{ id: 'p1', name: 'A', data: PROJEKT }] }).notar, []);
});

test('Gesamtsicherung: beschädigte und fremde Dateien', () => {
  assert.match(D.projektSicherungPruefen({ typ: 'immoapp-projekte', projekte: [{ id: 'p1' }, 'x'] }).fehler, /beschädigt/);
  assert.match(D.projektSicherungPruefen({ fields: {} }).fehler, /einzelne Bewertung/);
  assert.match(D.projektSicherungPruefen({ typ: 'vb-marktdaten', objekte: [] }).fehler, /Marktüberblick/);
  assert.equal(D.projektSicherungPruefen(null).ok, false);
});

test('Marktdaten: Objekte und PDF-Anhänge, beschädigte Anhänge werden verworfen', () => {
  const r = D.marktSicherungPruefen({ typ: 'vb-marktdaten', version: 1, objekte: [{ id: 'o1', gemeinde: 'Ilsfeld', kp: 390000, pdfs: [{ id: 'a1' }] }, 'kaputt'],
    anhaenge: [{ id: 'a1', objId: 'o1', name: 'Exposé.pdf', size: 12, data: 'JVBERi0xLjQK' }, { id: 'a2', data: '###' }] });
  assert.equal(r.ok, true);
  assert.equal(r.objekte.length, 1);
  assert.equal(r.anhaenge.length, 1);
  assert.deepEqual(r.verworfen, { objekte: 1, anhaenge: 1 });
  assert.equal(D.marktSicherungPruefen([{ id: 'o2' }]).ok, true, 'ältere Form: reine Liste');
  assert.match(D.marktSicherungPruefen({ typ: 'immoapp-projekte', projekte: [] }).fehler, /Projektsicherung/);
  assert.match(D.marktSicherungPruefen({ objekte: ['x', 1] }).fehler, /beschädigt/);
});
