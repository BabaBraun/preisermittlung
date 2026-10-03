// Einheitstests zu js/schluessel-regeln.js (Kachel „Schlüsselbuch“): Bestand, Rückgabe, Vorschläge mit Feiertagen BW, Prüfpunkte
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/schluessel-regeln.js');

const HEUTE = '2026-09-29';
function buch(extra = {}) {
  const schluessel = [{ id: 'h', art: 'Haustür', anzahl: '3', nummer: 'SA-4711' }, { id: 'b', art: 'Briefkasten', anzahl: '1', nummer: '' }];
  return Object.assign({ id: 'sc1', art: 'schluessel', projektId: 'p1', kundeId: 'k_e', schluessel,
    uebernahme: { datum: '2026-09-01', unterschrift: 'data:image/png;base64,AAAA', stand: R.listenStand(schluessel) },
    ausgaben: [], rueckgabe: {}, kaeuferAm: '' }, extra);
}
function ausgabe(extra = {}) {
  const a = Object.assign({ id: 'a1', schluesselId: 'h', anzahl: '1', rolle: 'handwerker', modus: 'firma', firma: 'Malerbetrieb Muster GmbH', kundeId: '',
    datum: '2026-09-20', rueckgabeBis: '2026-10-02', zurueckAm: '', unterschrift: 'data:image/png;base64,BBBB' }, extra);
  if (a.stand === undefined) a.stand = R.ausgabeStand(a);
  return a;
}
const codes = r => r.liste.map(x => x.code);

test('Anzahl und Datum: nur ganze Zahlen ab 0, nur gültige Tage', () => {
  assert.deepEqual(['2', 2, '2,0', '', 'abc', -1, '1.5', null].map(R.anzahl), [2, 2, 2, 0, 0, 0, 1, 0]);
  assert.equal(R.datum('2026-02-30'), '');
  assert.equal(R.datum('2026-09-29'), '2026-09-29');
  assert.equal(R.de('2026-09-05'), '05.09.2026');
  assert.equal(R.rolleName('energieberater'), 'Energieberater');
  assert.equal(R.rolleName('unbekannt'), 'Sonstige');
  assert.equal(R.nurAkte('interessent'), true);
  assert.equal(R.nurAkte('handwerker'), false);
});

test('Bestand je Schlüssel: beim Berater, ausgegeben, zurück an den Eigentümer, an den Käufer', () => {
  const r = buch({ ausgaben: [ausgabe(), ausgabe({ id: 'a2', zurueckAm: '2026-09-22' }), ausgabe({ id: 'a3', schluesselId: 'b' })] });
  r.schluessel[0].zurueck = '1'; r.schluessel[0].zurueckAm = '2026-09-28';
  let b = R.bestand(r);
  assert.deepEqual(b.liste.map(x => [x.art, x.anzahl, x.beimBerater, x.ausgegeben, x.zurueck, x.kaeufer]), [['Haustür', 3, 1, 1, 1, 0], ['Briefkasten', 1, 0, 1, 0, 0]]);
  assert.deepEqual(b.gesamt, { anzahl: 4, ausgegeben: 2, zurueck: 1, kaeufer: 0, beimBerater: 1 });
  assert.equal(b.arten, 2);
  assert.equal(R.verfuegbar(r, 'h'), 1);
  assert.equal(R.verfuegbar(r, 'b'), 0);
  // nach der Übergabe an den Käufer: was beim Berater lag, ist übergeben
  b = R.bestand({ ...r, kaeuferAm: '2026-10-15' });
  assert.deepEqual(b.liste.map(x => [x.beimBerater, x.kaeufer]), [[0, 1], [0, 0]]);
  // mehr ausgegeben als übernommen
  b = R.bestand(buch({ ausgaben: [ausgabe({ schluesselId: 'b', anzahl: '2' })] }));
  assert.deepEqual(b.fehler.map(x => x.art), ['Briefkasten']);
  assert.equal(b.gesamt.beimBerater, 3);
});

test('Status einer Ausgabe: überfällig rot, heute gelb, ohne Vereinbarung gelb, zurück grün', () => {
  assert.deepEqual(R.ausgabeStatus(ausgabe({ rueckgabeBis: '2026-09-25' }), HEUTE), { k: 'ueberfaellig', stufe: 'rot', datum: '2026-09-25', tage: 4 });
  assert.deepEqual(R.ausgabeStatus(ausgabe({ rueckgabeBis: HEUTE }), HEUTE), { k: 'heute', stufe: 'gelb', datum: HEUTE, tage: 0 });
  assert.deepEqual(R.ausgabeStatus(ausgabe({ rueckgabeBis: '2026-10-02' }), HEUTE), { k: 'offen', stufe: 'gruen', datum: '2026-10-02', tage: 3 });
  assert.deepEqual(R.ausgabeStatus(ausgabe({ rueckgabeBis: '' }), HEUTE), { k: 'ohneFrist', stufe: 'gelb', datum: '' });
  assert.deepEqual(R.ausgabeStatus(ausgabe({ rueckgabeBis: '2026-09-25', zurueckAm: '2026-09-26' }), HEUTE), { k: 'zurueck', stufe: 'gruen', datum: '2026-09-26' });
});

test('Vorschlag für die Rückgabe: selber Tag, nächster Werktag, eine Woche — Wochenende und Feiertage in BW', () => {
  assert.equal(R.rueckgabeVorschlag('2026-10-02', 'tag'), '2026-10-02');
  assert.equal(R.rueckgabeVorschlag('2026-10-02', 'werktag'), '2026-10-05');   // Sa 03.10. Feiertag, So
  assert.equal(R.rueckgabeVorschlag('2026-09-29', 'werktag'), '2026-09-30');
  assert.equal(R.rueckgabeVorschlag('2026-12-18', 'woche'), '2026-12-28');     // 25./26.12. Feiertage, So 27.12.
  assert.equal(R.rueckgabeVorschlag('2026-12-30', 'werktag'), '2026-12-31');
  assert.equal(R.rueckgabeVorschlag('2026-12-31', 'werktag'), '2027-01-04');   // Neujahr, Sa, So
  assert.equal(R.rueckgabeVorschlag('kein Datum', 'woche'), '');
  assert.equal(R.rueckgabeVorschlag('2026-10-02', 'anders'), '');
});

test('Fällige Rückgaben über alle Schlüsselbücher, älteste zuerst', () => {
  const a = buch({ id: 'x', ausgaben: [ausgabe({ id: 'a1', rueckgabeBis: '2026-09-27' }), ausgabe({ id: 'a2', rueckgabeBis: '2026-10-10' })] });
  const b = buch({ id: 'y', ausgaben: [ausgabe({ id: 'a3', rueckgabeBis: '2026-09-20' }), ausgabe({ id: 'a4', rueckgabeBis: HEUTE }), ausgabe({ id: 'a5', rueckgabeBis: '2026-09-01', zurueckAm: '2026-09-02' })] });
  assert.deepEqual(R.faellige([a, b], HEUTE).map(x => [x.akte.id, x.ausgabe.id, x.status.k]), [['y', 'a3', 'ueberfaellig'], ['x', 'a1', 'ueberfaellig'], ['y', 'a4', 'heute']]);
  assert.deepEqual(R.faellige(null, HEUTE), []);
});

test('Firma oder Privatperson? Rechtsform oder Branche im Namen', () => {
  for (const t of ['Malerbetrieb Muster GmbH', 'Hausverwaltung Beispiel', 'Foto Studio Probe', 'Beispiel & Co. KG', 'Elektro Muster e.K.', 'Energieberatung Probe', 'Muster eG', 'Probe GbR'])
    assert.equal(R.firmaPlausibel(t), true, t);
  for (const t of ['Max Probe', 'Erika Beispiel', '', '  ', 'Agnes Kgu']) assert.equal(R.firmaPlausibel(t), false, t);
});

test('Stand beim Unterschreiben: Änderungen an Liste oder Ausgabe fallen auf', () => {
  const r = buch();
  assert.equal(R.listenStand(r.schluessel), r.uebernahme.stand);
  r.schluessel[0].anzahl = '2';
  assert.notEqual(R.listenStand(r.schluessel), r.uebernahme.stand);
  const a = ausgabe();
  assert.equal(R.ausgabeStand(a), a.stand);
  assert.equal(R.ausgabeStand({ ...a, notiz: 'egal', zurueckAm: HEUTE }), a.stand);   // Rückgabe und Notiz ändern die Quittung nicht
  assert.notEqual(R.ausgabeStand({ ...a, rueckgabeBis: '2026-10-09' }), a.stand);
  assert.notEqual(R.ausgabeStand({ ...a, firma: 'Andere GmbH' }), a.stand);
  assert.equal(R.rueckgabeStand([{ id: 'h', zurueck: '' }]), '[]');
});

test('Prüfung: leer, alles in Ordnung, Unterschriften, überfällig, Verkauf, Privatperson als Freitext', () => {
  assert.deepEqual(codes(R.pruefen({}, { heute: HEUTE })), ['leer']);
  let p = R.pruefen(buch({ ausgaben: [ausgabe()] }), { heute: HEUTE });
  assert.deepEqual([p.rot, p.gelb, codes(p)], [0, 0, ['ok']]);
  assert.equal(p.liste[0].text, 'Alles erfasst: 4 Schlüssel, davon 3 beim Berater, 1 ausgegeben.');
  // Eigentümer, Datum und Unterschrift fehlen; Liste nach der Unterschrift geändert
  p = R.pruefen(buch({ kundeId: '', uebernahme: { datum: '', unterschrift: '' } }), { heute: HEUTE });
  assert.deepEqual(codes(p), ['eigentuemer', 'datum', 'unterschrift']);
  const g = buch(); g.schluessel[1].nummer = 'neu';
  assert.deepEqual(codes(R.pruefen(g, { heute: HEUTE })), ['geaendert']);
  assert.match(R.pruefen(buch({ kundeId: '', eigentuemerGeloescht: true }), { heute: HEUTE }).liste[0].text, /gelöscht/);
  // überfällig (rot zuerst), ohne Quittung, Quittung geändert, ohne Vereinbarung, heute fällig
  const a = ausgabe({ id: 'a1', rueckgabeBis: '2026-09-25', unterschrift: '' });
  const b2 = ausgabe({ id: 'a2', schluesselId: 'b' }); b2.rueckgabeBis = '2026-10-09';
  p = R.pruefen(buch({ ausgaben: [ausgabe({ id: 'a0', rueckgabeBis: '' }), a, b2, ausgabe({ id: 'a3', rueckgabeBis: HEUTE })] }), { heute: HEUTE });
  assert.deepEqual(codes(p), ['ueberfaellig', 'ohneFrist', 'quittung', 'quittungGeaendert', 'heute']);
  assert.equal(p.liste[0].text, 'Rückgabe überfällig seit 25.09.2026: Haustür (1) — Malerbetrieb Muster GmbH.');
  assert.equal(p.rot, 1);
  // eigene Datumsdarstellung und Empfänger (wie in der App)
  p = R.pruefen(buch({ ausgaben: [a] }), { heute: HEUTE, datum: d => 'am ' + d, empfaenger: () => 'Handwerker' });
  assert.equal(p.liste[0].text, 'Rückgabe überfällig seit am 2026-09-25: Haustür (1) — Handwerker.');
  // Verkauf: Notartermin gelb, verkauft oder übergeben rot
  const aus = buch({ ausgaben: [ausgabe()] });
  assert.equal(R.pruefen(aus, { heute: HEUTE, status: 'Notartermin' }).liste.find(x => x.code === 'verkauf').stufe, 'gelb');
  assert.equal(R.pruefen(aus, { heute: HEUTE, status: 'Verkauft' }).liste[0].code, 'verkauf');
  assert.equal(R.pruefen({ ...aus, kaeuferAm: '2026-10-15' }, { heute: HEUTE }).liste[0].stufe, 'rot');
  assert.deepEqual(codes(R.pruefen(buch(), { heute: HEUTE, status: 'Verkauft' })), ['ok']);
  // Freitext einer Privatperson, Interessent nicht als Freitext, Empfänger fehlt, mehr ausgegeben als übernommen
  assert.deepEqual(codes(R.pruefen(buch({ ausgaben: [ausgabe({ firma: 'Max Probe' })] }), { heute: HEUTE })), ['privat']);
  assert.match(R.pruefen(buch({ ausgaben: [ausgabe({ rolle: 'interessent' })] }), { heute: HEUTE }).liste[0].text, /^Interessent nur über die Kundenakte/);
  assert.deepEqual(codes(R.pruefen(buch({ ausgaben: [ausgabe({ modus: 'akte', firma: '' })] }), { heute: HEUTE })), ['empfaenger']);
  assert.deepEqual(codes(R.pruefen(buch({ ausgaben: [ausgabe({ modus: 'akte', firma: '', geloescht: true })] }), { heute: HEUTE })), ['ok']);
  assert.deepEqual(codes(R.pruefen(buch({ ausgaben: [ausgabe({ schluesselId: 'b', anzahl: '2' })] }), { heute: HEUTE })), ['bestand']);
});

test('Prüfung: Rückgabe an den Eigentümer mit Datum und Unterschrift', () => {
  const r = buch(); r.schluessel[0].zurueck = '3';
  assert.deepEqual(codes(R.pruefen(r, { heute: HEUTE })), ['rueckgabeDatum', 'rueckgabeUnterschrift']);
  r.schluessel[0].zurueckAm = HEUTE; r.rueckgabe = { unterschrift: 'data:image/png;base64,CCCC', stand: R.rueckgabeStand(r.schluessel) };
  const p = R.pruefen(r, { heute: HEUTE });
  assert.deepEqual(codes(p), ['ok']);
  assert.equal(p.liste[0].text, 'Alles erfasst: 4 Schlüssel, davon 1 beim Berater, 3 zurück an den Eigentümer.');
  r.schluessel[1].zurueck = '1'; r.schluessel[1].zurueckAm = HEUTE;
  assert.deepEqual(codes(R.pruefen(r, { heute: HEUTE })), ['rueckgabeGeaendert']);
});
