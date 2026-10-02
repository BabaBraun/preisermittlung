/* Rechenkern gegen die unabhängige Python-Vergleichsrechnung (tests/referenz/sollwerte.py):
   Gewerbe mit Mietrolle, Wohnhaus mit Nießbrauch/Vergleichswert/Energie, Wohnungsrecht mit Erbbaurecht und PV,
   Eigentumswohnung mit Leibrente, Zins 0 %, sehr altes Gebäude, leere Eingaben, Wohnhaus mit Anbau und Mietertrag
   je Gebäude (D33). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { K, leser, nahe } from './hilfen.mjs';

const lade = n => JSON.parse(readFileSync(new URL('../referenz/' + n, import.meta.url), 'utf8'));
const FAELLE = lade('faelle.json'), SOLL = lade('sollwerte.json');

const WERTE = {
  bodenwert: (R) => R.bodenwert, bgf: (R) => R.bgfHG, nhk2010: (R, D) => D.nhkHG.nhk, punkte: (R) => R.modPunkte,
  rnd: (R) => R.hg.rnd, gebaeude_je_m2: (R) => R.hg.preis, vergleichswert: (R) => R.vergleichWert,
  substanz: (R) => R.substanz, roh: (R) => R.roh, bewirt: (R) => R.bewirt, vf: (R) => R.vf, ertrag: (R) => R.ertrag,
  mittel: (R) => R.mittel, pvWert: (R) => R.pvWert, energieWert: (R) => R.energieWert, niessWert: (R) => R.niessWert,
  erbbauAbzug: (R) => R.erbbauAbzug, wkSumme: (R) => R.wkSumme, empfehlung: (R) => R.empfehlung,
  spanne_unten: (R) => R.empfehlung * (1 - R.vh), spanne_oben: (R) => R.empfehlung * (1 + R.vh),
  reBrutto: (R) => R.reBrutto, reFaktor: (R) => R.reFaktor,
  rnd_anbau: (R) => R.an.rnd, anbau_je_m2: (R) => R.an.preis   // Anbau mit eigener Restnutzungsdauer (D33)
};

for (const [name, fall] of Object.entries(FAELLE)) {
  if (name.startsWith('_')) continue;
  test('Vergleichsrechnung: ' + name, () => {
    const { R, D } = K.bewerte(leser(fall.felder), { jahr: fall.jahr });
    const soll = SOLL[name];
    assert.ok(soll, 'Sollwerte fehlen — python tests/referenz/sollwerte.py ausführen');
    for (const [k, s] of Object.entries(soll)) {
      const f = WERTE[k]; assert.ok(f, 'unbekannter Sollwert ' + k);
      const tol = Math.max(0.01, Math.abs(s) * 1e-9);
      nahe(assert, f(R, D), s, tol, name + ' · ' + k);
    }
  });
}
