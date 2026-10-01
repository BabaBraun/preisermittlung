/* Jahresbewertung nach dem Vordruck der Bank: Rechnung gegen die unabhängige Python-Rechnung (Dezimalarithmetik,
   tests/referenz/jahresbewertung_ref.py) mit synthetischen Fällen, dazu Bereinigung, Fortschreibung und Speicherung
   im Bewertungsverlauf der Liegenschaft. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const require = createRequire(import.meta.url);
const V = require('../../js/liegenschaften.js');
const J = require('../../js/jahresbewertung.js');
const B = V;
const PY = pythonMit('json');
const FAELLE = JSON.parse(readFileSync(new URL('../referenz/jahresbewertung_faelle.json', import.meta.url), 'utf8')).faelle;
const nahe = (ist, soll, t) => assert.ok(Math.abs(ist - soll) < 0.005, t + ': ist ' + ist + ', soll ' + soll);

test('Vordruck: Ergebnisse wie die unabhängige Python-Rechnung (4 synthetische Fälle)', { skip: !PY && !process.env.CI && 'Python fehlt' }, () => {
  const soll = pythonJson(PY || 'python', ['tests/referenz/jahresbewertung_ref.py']);
  for (const f of FAELLE) {
    const r = J.rechnen(J.bereinigen(f.vordruck)), s = soll[f.name];
    nahe(r.boden, s.boden, f.name + ' Boden'); nahe(r.ergebnis, s.ergebnis, f.name + ' Ergebnis'); nahe(r.pvWert, s.pv, f.name + ' PV');
    if (s.substanz == null) assert.equal(r.substanz, null); else { nahe(r.substanz, s.substanz, f.name + ' Substanz'); nahe(r.ertrag, s.ertrag, f.name + ' Ertrag'); }
    assert.deepEqual(r.gebaeude.map(g => g.preis), s.preise, f.name + ' Gebäudepreise');
    assert.deepEqual(r.teile.map(t => t.vf), s.vf, f.name + ' Vervielfältiger');
  }
});

test('Vordruck: Zwischenwerte von Hand (Rundungen wie im Excel-Vordruck)', () => {
  const r = J.rechnen(J.bereinigen(FAELLE[0].vordruck)), g = r.gebaeude[0];
  // Kostenkennwerte nur Zeile 1; Außenwände 0,23 × (0,4×730 + 0,4×930 + 0,2×1900) = 240,12 (wie im Vordruck der Bank)
  assert.equal(Math.round(g.bauteile[0].kosten * 100) / 100, 240.12);
  assert.equal(Math.round(g.nhk2010 * 100) / 100, 1120.43);
  assert.equal(g.nhkBer, 1064);            // RUNDEN(1120,43 − RUNDEN(1120,43 × 5 %)) = RUNDEN(1120,43 − 56) = 1064
  assert.equal(g.index2010, 197.1);        // RUNDEN(136,2 × 1,4472; 1) = 197,1
  assert.equal(g.wm, 35);                  // RUNDEN((80 − 52) / 80 × 100) = 35
  assert.equal(g.preis, 1363);             // RUNDEN(1064 × 1,971 × 0,65) = RUNDEN(1363,15)
  assert.equal(r.bodenZeilen[0], 118800);  // 412,5 × 320 × 0,9
  assert.equal(r.teile[0].abschlag, 570);  // 5 % von 950 × 12
  assert.equal(r.teile[0].vf, 19.97);      // Rentenbarwertfaktor 4,5 % / 52 Jahre
  // zweiter Fall: Bauteile ohne Anteil (Sanitär, Heizung im Lager) zählen 0; Boden nach Mietanteil verteilt
  const z = J.rechnen(J.bereinigen(FAELLE[1].vordruck));
  assert.deepEqual(z.gebaeude[1].bauteile.map(b => b.summeAnteile), [1, 1, 1, 1, 1, 1, 0, 0, 1]);
  assert.deepEqual(z.gebaeude[0].anteileFehler, []);
  assert.equal(z.gebaeude[1].rnd, 6);      // GND 60 − (2024 − 1970)
  assert.equal(Math.round(z.teile[0].bodenAnteil), Math.round(274000 * 21600 / 31200));
  assert.deepEqual(z.teile.map(t => t.abschlag), [400, 0]);
  // ohne Gebäude: Boden + Zu-/Abschläge
  assert.equal(J.rechnen(J.bereinigen(FAELLE[2].vordruck)).ergebnis, 600 * 250 * 0.85 + 30000 - 5000);
  assert.equal(J.runden(2.5), 3); assert.equal(J.runden(-2.5), -3); assert.equal(J.runden(1.005, 2), 1.01);
});

test('Vordruck: Bereinigung, leerer Vordruck, Fortschreibung', () => {
  const v = J.bereinigen(Object.assign({}, FAELLE[0].vordruck, { stichtag: '31.12.2025', boden: [{ flaeche: 'viel', brw: 300 }], fremd: 1,
    gebaeude: [Object.assign({}, FAELLE[0].vordruck.gebaeude[0], { bpiArt: 'unbekannt', anteile: [[1]] })] }));
  assert.equal(v.stichtag, null); assert.equal(v.boden[0].flaeche, null); assert.equal(v.fremd, undefined);
  assert.equal(v.gebaeude[0].bpiArt, 'wohnen'); assert.equal(v.gebaeude[0].anteile.length, 9); assert.deepEqual(v.gebaeude[0].anteile[0], [1, 0, 0, 0, 0]);
  assert.equal(J.bereinigen(null), null);
  const leer = J.leer('2026-12-31');
  assert.equal(leer.gebaeude.length, 1); assert.equal(J.rechnen(leer).ergebnis, 0);
  const f = J.fortschreiben(FAELLE[0].vordruck, '2026-12-31');
  assert.equal(f.jahre, 1);
  assert.deepEqual([f.vordruck.stichtag, f.vordruck.gebaeude[0].bpi, f.vordruck.gebaeude[0].bpiFaktor, f.vordruck.gebaeude[0].rnd], ['2026-12-31', 143.1, 1.4472, 51]);
  assert.match(f.vordruck.gebaeude[0].bpiText, /Bürogebäude Mai 2026 \(vorläufig\)/);
  assert.equal(f.vordruck.boden[0].brw, 320);
  assert.ok(f.hinweise.some(h => /Bodenrichtwert/.test(h)));
  assert.equal(J.fortschreiben(FAELLE[0].vordruck, '2026-12-31', { rnd: false }).vordruck.gebaeude[0].rnd, 52);
  const zwei = J.fortschreiben(FAELLE[1].vordruck, '2026-12-31');
  assert.deepEqual(zwei.vordruck.gebaeude.map(g => [g.bpi, g.rnd]), [[143.1, 33], [140.6, null]]);   // Lager: Gewerbe-Index, RND bleibt rechnerisch
  assert.ok(zwei.hinweise.some(h => /Fester Abschlag/.test(h)));
  assert.throws(() => J.fortschreiben(FAELLE[0].vordruck, '2026'), /Stichtag/);
});

test('Vorlagen für neue Vordrucke: Aufbau, amtlicher Index zum Stichtag, Rechnung von Hand', () => {
  assert.deepEqual(Object.keys(J.VORLAGEN), ['bank', 'wgh', 'bank_lager', 'grundstueck', 'leer']);
  const aufbau = k => { const v = J.vorlage(k, '2026-12-31'); return [v.gebaeude.map(g => [g.bpiArt, g.gnd, g.bpi, g.kosten1[2]]), v.mieten.map(m => m.gebaeude), v.pauschal.length]; };
  assert.deepEqual(aufbau('bank'), [[['buero', 80, 143.1, 930]], [0, 0], 2]);
  assert.deepEqual(aufbau('wgh'), [[['wohnen', 80, 139.6, 860]], [0, 0, 0], 2]);
  assert.deepEqual(aufbau('bank_lager'), [[['buero', 80, 143.1, 930], ['gewerbe', 60, 140.6, 350]], [0, 0, 1], 2]);
  assert.deepEqual(aufbau('grundstueck'), [[], [], 0]);   // Außenanlagen wie im Vordruck als objektspezifisches Merkmal
  assert.equal(J.vorlage('grundstueck', '2026-12-31').objektspezifisch.length, 1);
  assert.deepEqual(J.vorlage('leer', '2026-12-31'), J.leer('2026-12-31'));
  assert.deepEqual(J.vorlage('unbekannt', '2026-12-31'), J.leer('2026-12-31'));
  for (const k of Object.keys(J.VORLAGEN)) { const v = J.vorlage(k, '2026-12-31'); assert.deepEqual(J.bereinigen(v), v, k + ' bereinigt'); assert.equal(J.rechnen(v).ergebnis, 0, k + ' leer = 0'); }
  // Bankgebäude 1975, BGF 900, alle Bauteile Stufe 3 (NHK 930), Grundstück 800 m² × 400 €, Miete 6.000 €/Monat:
  // Index 143,1 × 1,4472 = 207,1; Alter 51, RND 29, WM 64 %; Preis RUNDEN(930 × 2,071 × 0,36) = 693 €/m²; Substanz 320.000 + 623.700;
  // Ertrag (72.000 − 14.400 − 12.800) × 16,98 + 320.000 = 1.080.704; Mittel 1.012.202
  const v = J.vorlage('bank', '2026-12-31');
  Object.assign(v.boden[0], { flaeche: 800, brw: 400 }); Object.assign(v.gebaeude[0], { baujahr: 1975, bgf: 900 }); v.mieten[0].monat = 6000;
  const r = J.rechnen(v);
  assert.deepEqual([J.runden(r.gebaeude[0].nhk2010, 2), r.gebaeude[0].index2010, r.gebaeude[0].rnd, r.gebaeude[0].wm, r.gebaeude[0].preis, r.teile[0].vf], [930, 207.1, 29, 64, 693, 16.98]);
  nahe(r.substanz, 943700, 'Substanz'); nahe(r.ertrag, 1080704, 'Ertrag'); nahe(r.ergebnis, 1012202, 'Ergebnis');
});

test('Vordruck im Bewertungsverlauf: Ergebnisse übernommen, Sicherung behält den Vordruck', () => {
  const b = B.ausVordruck({ id: 'b1', status: 'final', vordruck: J.bereinigen(FAELLE[0].vordruck) });
  const r = J.rechnen(b.vordruck);
  assert.equal(b.stichtag, '2025-12-31'); assert.equal(b.ergebnis, Math.round(r.ergebnis * 100) / 100);
  assert.equal(b.bpi, 136.2);
  const l = V.bereinigen({ id: 'L', name: 'Filiale', bewertungen: [b, { id: 'b2', stichtag: '2024-12-31', ergebnis: 1 }] });
  assert.ok(l.bewertungen[0].vordruck && l.bewertungen[0].vordruck.gebaeude.length === 1);
  assert.equal(l.bewertungen[1].vordruck, null);
  const sp = V.sicherungPruefen({ typ: 'immoapp-liegenschaften', liegenschaften: [l] });
  assert.equal(J.rechnen(sp.liegenschaften[0].bewertungen[0].vordruck).ergebnis, r.ergebnis);
});

test('Vordruck wie die Excel-Mappe: Kapitelnummern, Zwischenzeilen, Gewerbeanteil, ältere Vordrucke', () => {
  const [pv, zwei, grund] = FAELLE.map(f => J.bereinigen(f.vordruck));
  // mit PV-Anlage: 4 PV, 5 Grund und Boden, 6 Bausubstanz, 7 Mietertrag, 8 Zusammenfassung (wie Mappe „Bankgebäude … mit PV“)
  assert.deepEqual(J.kapitel(pv), { objekt: 1, brw: 2, bau: 3, pv: 4, boden: 5, substanz: 6, ertrag: 7, summe: 8 });
  assert.deepEqual(J.kapitel(zwei), { objekt: 1, brw: 2, bau: 3, pv: null, boden: 4, substanz: 5, ertrag: 6, summe: 7 });
  assert.deepEqual(J.kapitel(grund), { objekt: 1, brw: 2, bau: 3, pv: null, boden: 4, substanz: null, ertrag: null, summe: 5 });
  // Zwischenzeilen 6.2 und 7.3 aus dem Modell = Rechnung; Summen wie im Vordruck
  const M = J.modell(pv), r = J.rechnen(pv), g = M.geb[0];
  assert.equal(g.abschlagEur, J.runden(-g.nhk2010 * pv.gebaeude[0].abschlagBauweise / 100));
  assert.equal(g.nhkBer, J.runden(g.nhk2010 + g.abschlagEur));
  nahe(g.nhkHeute + g.wmEur, g.nhkHeute * (1 - g.wm / 100), 'NHK abzüglich Wertminderung');
  nahe(M.vorlaeufig + M.pvWert + M.objektSumme, r.substanz, 'Bausubstanz 6.5');
  nahe(M.teile.reduce((s, t) => s + t.wert + t.bodenAnteil, 0) + M.pvWert, r.ertrag, 'Mietertrag 7.4');
  const t = M.teile[0]; nahe(t.zw - t.abschlag - t.bodenZins, t.gebRein, 'Gebäudereinertrag 7.3');
  // Anteil gewerbliche Kaltmiete = Mietzeilen mit „gewerblich“ × 12 (Mappe: Summe ausgewählter Zeilen)
  assert.equal(M.miete.gewerblich, 0);
  const v2 = J.bereinigen(Object.assign({}, FAELLE[0].vordruck, { mieten: FAELLE[0].vordruck.mieten.map((m, i) => Object.assign({}, m, { gewerblich: i === 1 })) }));
  assert.equal(J.modell(v2).miete.gewerblich, 950 * 12); assert.equal(J.modell(v2).teile[0].gewerblich, 950 * 12);
  assert.equal(J.rechnen(v2).ergebnis, r.ergebnis);   // die Markierung ändert die Rechnung nicht
  // ältere Vordrucke (ohne Angaben des Dokuments): Standardangaben, „hinweise“ wird 3.4 Allgemeiner Eindruck
  const alt = J.bereinigen({ stichtag: '2024-12-31', hinweise: 'Zustand gut', boden: [{ flaeche: 100, brw: 100 }] });
  assert.equal(alt.bautechnik.eindruck, 'Zustand gut'); assert.equal(alt.hinweise, undefined);
  assert.deepEqual(alt.objektdaten.merkmale.map(m => m.label), J.MERKMALE);
  assert.equal(alt.deckblatt.auftragsinhalt, 'Rechnerische Preisermittlung'); assert.equal(alt.texte.hinweise, J.TEXTE.hinweise);
  assert.deepEqual(J.bereinigen(alt), alt);
  // eigene Texte und leere Texte bleiben; Bilder nur gültige Kennungen
  const eigen = J.bereinigen(Object.assign({}, alt, { texte: { hinweise: '' , pv: 'Eigener Text' }, bilder: { karte: ['A-1', '../x', 7, 'A-2'] } }));
  assert.equal(eigen.texte.hinweise, ''); assert.equal(eigen.texte.pv, 'Eigener Text'); assert.equal(eigen.texte.bodenrichtwert, J.TEXTE.bodenrichtwert);
  assert.deepEqual(eigen.bilder.karte, ['A-1', 'A-2']);
  // Fortschreibung behält die Angaben des Dokuments
  const f = J.fortschreiben(Object.assign({}, FAELLE[0].vordruck, { deckblatt: { auftraggeber: 'Muster AG' }, ort: 'Musterstadt' }), '2026-12-31').vordruck;
  assert.equal(f.deckblatt.auftraggeber, 'Muster AG'); assert.equal(f.ort, 'Musterstadt');
});

