// Einheitstests zu js/werbung.js (D51): Werbung je Kanal (§§ 7, 7a UWG), Werbewiderspruch (Art. 21 DSGVO), Datenschutzinformation
// (Art. 13, 14 DSGVO). Nur synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../../js/fristen.js');
const W = require('../../js/werbung.js');

const kanal = x => Object.assign({ stand: 'einwilligung', erteiltAm: '2026-09-01', erfasstAm: '2026-09-01', form: 'Vordruck der Bank', nachweis: 'DMS 4711', zweck: 'Angebote zu Immobilien' }, x);

test('altes gemeinsames Feld wird E-Mail und Telefon — gelb, bis der Nachweis geprüft ist', () => {
  const alt = { grundlage: 'einwilligung', einwilligungAm: '2026-09-01' };
  const w = W.norm(alt);
  assert.equal(w.migriert, true);
  assert.deepEqual([w.email.stand, w.telefon.stand, w.email.form], ['einwilligung', 'einwilligung', W.ALT]);
  const e = W.darfEmail(alt);
  assert.equal(e.ok, true); assert.equal(e.stufe, 'gelb'); assert.match(e.grund, /Nachweis prüfen: Form, Fundstelle des Nachweises/);
  assert.equal(W.darfEmail({ grundlage: 'vertrag' }).ok, false);
  assert.equal(W.darfPost({ grundlage: 'vertrag' }).ok, true);
  assert.equal(W.marke({ grundlage: 'vertrag' }), 'Werbung: E ✗ · T ✗ · P ✓');
});

test('E-Mail: Einwilligung oder alle Bedingungen für Bestandskunden (§ 7 Abs. 3 UWG)', () => {
  assert.equal(W.darfEmail({ werbung: { email: kanal() } }).stufe, 'gruen');
  const bk = b => ({ werbung: { email: { stand: 'bestandskunde', bk: b } } });
  assert.equal(W.darfEmail(bk({ erhalten: true, aehnlich: true, hinweisAm: '' })).ok, false);
  assert.match(W.darfEmail(bk({ erhalten: true, aehnlich: false, hinweisAm: '2026-09-01' })).grund, /eigene ähnliche Leistungen/);
  const ok = W.darfEmail(bk({ erhalten: true, aehnlich: true, hinweisAm: '2026-09-01' }));
  assert.equal(ok.ok, true); assert.equal(ok.bestandskunde, true);
  assert.equal(W.darfEmail({ werbung: { email: kanal({ stand: 'widerrufen', widerrufAm: '2026-09-20' }) } }).grund, 'Einwilligung widerrufen am 20.09.2026');
});

test('Telefon: Verbraucher nur mit ausdrücklicher Einwilligung, Unternehmer auch mutmaßlich (§ 7 Abs. 2 Nr. 1 UWG)', () => {
  assert.equal(W.darfTelefon({ werbung: { telefon: { stand: 'mutmasslich', mutmasslichGrund: 'Hausverwaltung' } } }).ok, false);
  assert.equal(W.darfTelefon({ werbung: { verbraucher: false, telefon: { stand: 'mutmasslich', mutmasslichGrund: '' } } }).ok, false);
  assert.equal(W.darfTelefon({ werbung: { verbraucher: false, telefon: { stand: 'mutmasslich', mutmasslichGrund: 'Hausverwaltung' } } }).ok, true);
  assert.equal(W.darfTelefon({ werbung: { telefon: kanal() } }).stufe, 'gruen');
});

test('§ 7a Abs. 2 UWG: fünf Jahre ab Erteilung und nach jeder Verwendung, auch nach dem Widerruf', () => {
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: kanal({ erteiltAm: '2026-10-03' }) } }), '2031-10-03');
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: kanal({ erteiltAm: '2026-10-03', verwendungen: ['2027-11-15', '2027-02-01'] }) } }), '2032-11-15');
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: kanal({ erteiltAm: '2028-02-29' }) } }), '2033-02-28');
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: kanal({ stand: 'widerrufen', erteiltAm: '2026-10-03', widerrufAm: '2026-12-01' }) } }), '2031-10-03');
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: { stand: 'keine' } } }), '');
});

test('Werbewiderspruch sperrt alle Kanäle trotz Einwilligung (Art. 21 Abs. 3 DSGVO)', () => {
  const k = { werbung: { email: kanal(), telefon: kanal(), widerspruch: { am: '2026-10-03', weg: 'Brief' } } };
  for (const f of [W.darfEmail, W.darfTelefon, W.darfPost]) assert.equal(f(k).ok, false);
  assert.equal(W.marke(k), 'Werbesperre');
  assert.ok(W.auskunft(k).includes('Werbewiderspruch: am 03.10.2026 (Brief)'));
});

test('Datenschutzinformation: bei Erhebung, von Dritten spätestens nach einem Monat oder beim ersten Kontakt (Art. 13, 14 DSGVO)', () => {
  assert.equal(W.dsinfoStand({ grundlage: 'vertrag' }, '2026-10-03'), null);
  const direkt = { werbung: { dsinfo: { art: 'direkt', erhobenAm: '2026-10-03' } } };
  assert.equal(W.dsinfoStand(direkt, '2026-10-03').stufe, 'gelb');
  assert.equal(W.dsinfoStand(direkt, '2026-10-04').stufe, 'rot');
  assert.equal(W.dsinfoStand({ werbung: { dsinfo: { art: 'direkt', erhobenAm: '2026-10-03', erteiltAm: '2026-10-03' } } }, '2026-12-01').stufe, 'gruen');
  assert.equal(W.dsinfoStand({ werbung: { dsinfo: { art: 'direkt', bereits: true, fundstelle: '' } } }, '2026-12-01').stufe, 'gelb');
  assert.equal(W.dsinfoStand({ werbung: { dsinfo: { art: 'dritter', quelle: '', erlangtAm: '2026-10-03' } } }, '2026-10-03').stufe, 'rot');
  const tipp = { werbung: { dsinfo: { art: 'dritter', quelle: 'Tipp aus der Filiale', erlangtAm: '2026-10-03' } } };
  assert.deepEqual([W.dsinfoStand(tipp, '2026-11-03').stufe, W.dsinfoStand(tipp, '2026-11-03').faelligBis, W.dsinfoStand(tipp, '2026-11-04').stufe], ['gelb', '2026-11-03', 'rot']);
  const mitAnruf = Object.assign({ kontakte: [{ datum: '2026-10-10' }] }, tipp);
  assert.equal(W.dsinfoStand(mitAnruf, '2026-10-05').faelligBis, '2026-10-10');
  assert.match(W.dsinfoStand(mitAnruf, '2026-10-05').text, /beim ersten Kontakt am 10\.10\.2026/);
  assert.equal(W.dsinfoStand({ werbung: { dsinfo: { art: 'zweckaenderung' } } }, '2026-10-03').stufe, 'rot');
});

test('Befunde: Rechtsgrundlage „Einwilligung“ bei neuen Akten ist keine Werbeerlaubnis; Verlauf und § 7a-Frist bleiben', () => {
  const neu = { grundlage: 'einwilligung', werbung: { verbraucher: true, dsinfo: { art: 'direkt', erhobenAm: '2026-10-03' } } };
  assert.equal(W.norm(neu).migriert, false);
  for (const f of [W.darfEmail, W.darfTelefon]) assert.equal(f(neu).ok, false);
  assert.equal(W.marke(neu), 'Werbung: E ✗ · T ✗ · P ✓');
  const v = { werbung: { verlauf: [{ am: '2026-05-04', weg: 'Brief', aufgehobenAm: '2026-08-01' }] } };
  assert.ok(W.auskunft(v).includes('Früherer Werbewiderspruch: am 04.05.2026 (Brief), aufgehoben am 01.08.2026'));
  assert.equal(W.norm(v).verlauf.length, 1);
  // Nachweis bleibt aufzubewahren, auch wenn der Stand später anders steht; nicht bei mutmaßlicher Einwilligung
  assert.equal(W.aufbewahrenBis({ werbung: { telefon: { stand: 'keine', erteiltAm: '2026-10-03' } } }), '2031-10-03');
  assert.equal(W.aufbewahrenBis({ werbung: { verbraucher: false, telefon: { stand: 'mutmasslich', erteiltAm: '2026-10-03' } } }), '');
});
