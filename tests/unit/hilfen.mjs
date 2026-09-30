/* Hilfen für die Node-Tests des Rechenkerns. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const K = require('../../js/kern.js');

/* Eingabe-Leser aus einem einfachen Objekt: Zahlen direkt, Texte wie im Formular gelesen. */
export function leser(felder, betragIds = []) {
  const b = new Set(betragIds);
  return {
    n: id => { const v = felder[id]; return typeof v === 'number' ? v : K.zahlLesen(v == null ? '' : v, b.has(id)); },
    v: id => (felder[id] == null ? '' : String(felder[id])),
    an: id => !!felder[id]
  };
}

/* Vergleich mit Toleranz, Meldung auf Deutsch */
export function nahe(assert, ist, soll, tol, text) {
  assert.ok(typeof ist === 'number' && Number.isFinite(ist), (text || '') + ': keine endliche Zahl (' + ist + ')');
  assert.ok(Math.abs(ist - soll) <= tol, (text || '') + ': ist ' + ist + ', soll ' + soll + ' (± ' + tol + ')');
}
