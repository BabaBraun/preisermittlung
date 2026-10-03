// Einheitstests zu D48: Pflichtangaben der Genossenschaft (§ 25a GenG) und Stand der Bodenrichtwerte (§ 12 GuAVO BW)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../js/beratung.js');

const OK = { firma: 'Musterbank eG', sitz: 'Musterstadt', registergericht: 'Amtsgericht Musterstadt', registernr: 'GnR 123',
  vorstand: 'Erika Beispiel, Max Probe (stellv.)', aufsichtsrat: 'Ida Muster' };

test('§ 25a GenG: vollständige Angaben, Stellvertreter, Titel', () => {
  assert.deepEqual(B.pflichtangabenPruefen(OK), { fehlt: [], fehler: [], hinweise: [], ok: true });
  assert.equal(B.pflichtangabenPruefen({ ...OK, vorstand: 'Dr. Erika Beispiel und Max Probe' }).ok, true);
  assert.equal(B.pflichtangabenPruefen({ ...OK, firma: 'Musterbank eingetragene Genossenschaft' }).ok, true);
});

test('§ 25a GenG: fehlende Felder, Firma ohne „eG“, Initiale, ein Vorstand, kein Aufsichtsratsvorsitz', () => {
  const leer = B.pflichtangabenPruefen({});
  assert.deepEqual(leer.fehlt, ['Firma', 'Sitz', 'Registergericht', 'Registernummer', 'Vorstand']);
  assert.equal(leer.ok, false);
  let r = B.pflichtangabenPruefen({ ...OK, firma: 'Musterbank' });
  assert.match(r.fehler[0], /§ 3 GenG/);
  r = B.pflichtangabenPruefen({ ...OK, vorstand: 'E. Beispiel, Max Probe' });
  assert.match(r.fehler[0], /Vorname ausschreiben/);
  r = B.pflichtangabenPruefen({ ...OK, vorstand: 'Beispiel, Max Probe' });
  assert.match(r.fehler[0], /Vor- und Familienname/);
  r = B.pflichtangabenPruefen({ ...OK, vorstand: 'Erika Beispiel' });
  assert.equal(r.ok, true); assert.match(r.hinweise[0], /§ 24 Abs\. 2 GenG/);
  r = B.pflichtangabenPruefen({ ...OK, aufsichtsrat: '' });
  assert.equal(r.ok, true); assert.match(r.hinweise[0], /Aufsichtsrat/);
});

test('Bodenrichtwerte: Stichtag 01.01. ungerader Jahre, Veröffentlichung bis 30.06., jährlicher Turnus', () => {
  assert.deepEqual(B.brwStand('2026-10-03'), { turnus: 'bw2', stand: 2025, naechster: 2027, veroeffentlichtBis: '2027-06-30', wartet: false });
  assert.deepEqual(B.brwStand('2027-06-30'), { turnus: 'bw2', stand: 2025, naechster: 2027, veroeffentlichtBis: '2027-06-30', wartet: true });
  assert.deepEqual(B.brwStand('2027-07-01'), { turnus: 'bw2', stand: 2027, naechster: 2029, veroeffentlichtBis: '2029-06-30', wartet: false });
  assert.deepEqual(B.brwStand('2028-01-15'), { turnus: 'bw2', stand: 2027, naechster: 2029, veroeffentlichtBis: '2029-06-30', wartet: false });
  assert.deepEqual(B.brwStand('2026-07-01', 'jaehrlich'), { turnus: 'jaehrlich', stand: 2026, naechster: 2027, veroeffentlichtBis: '2027-06-30', wartet: false });
  assert.equal(B.datenstand({ brwTurnus: 'jaehrlich' }, '2026-10-03').liste.find(x => x.id === 'brw').stand, 'Stichtag 01.01.2026');
});
