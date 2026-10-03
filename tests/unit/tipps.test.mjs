// Einheitstests zu js/tipps-regeln.js (Kachel „Tipps“): Frist der Datenschutzinformation bei Dritterhebung (Art. 14 Abs. 3 DSGVO),
// Ampeln, Rückmeldung ohne Kundendaten, Stand aus Akquise und Anfrage, Auswertung je Filiale und Quartal ohne Personen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../../js/tipps-regeln.js');

const tipp = x => Object.assign({ datum: '2026-10-03', geberId: 'tg1', quelle: { name: 'Erika Beispiel', filiale: 'Musterstadt', art: 'kundenberater' }, tippArt: 'verkauf',
  kundeId: 'k1', einverstandenAm: '', herkunft: 'dritter', kontaktGeplant: '', ersterKontaktAm: '', weitergabeAm: '', weitergabeAn: '',
  dsinfo: { erteiltAm: '', weg: '', version: '', bereitsInformiert: false, fundstelle: '' }, stand: 'neu', stufe: 0, verlauf: [] }, x || {});

test('Art. 14 Abs. 3 DSGVO: ein Monat nach dem Tipp, früher beim geplanten Kontakt, beim Kontakt oder bei der Weitergabe', () => {
  assert.deepEqual(T.dsinfoFrist(tipp()), { bis: '2026-11-03', grund: 'monat', monat: '2026-11-03' });            // Beispiel aus der Rechtsprüfung
  assert.equal(T.dsinfoFrist(tipp({ datum: '2027-01-31' })).bis, '2027-02-28');                                      // Monatsletzter
  assert.equal(T.dsinfoFrist(tipp({ datum: '2026-10-31' })).bis, '2026-11-30');
  assert.equal(T.dsinfoFrist(tipp({ datum: '2026-10-03' })).bis, '2026-11-03');                                      // keine Verschiebung vom Wochenende
  assert.deepEqual(T.dsinfoFrist(tipp({ kontaktGeplant: '2026-10-10' })), { bis: '2026-10-10', grund: 'geplant', monat: '2026-11-03' });
  assert.equal(T.dsinfoFrist(tipp({ kontaktGeplant: '2026-12-01' })).grund, 'monat');                                // später als ein Monat zählt nicht
  assert.equal(T.dsinfoFrist(tipp({ ersterKontaktAm: '2026-10-07', kontaktGeplant: '2026-10-10' })).grund, 'kontakt');
  assert.equal(T.dsinfoFrist(tipp({ weitergabeAm: '2026-10-05' })).grund, 'weitergabe');
  assert.deepEqual(T.dsinfoFrist(tipp({ datum: '' })), { bis: '', grund: '', monat: '' });
});

test('Ampel der Datenschutzinformation: gelb ab dem Tipp, rot nach Fristende oder bei Kontakt ohne Information', () => {
  let r = T.dsinfoPruefen(tipp(), '2026-10-03');
  assert.equal(r.stufe, 'gelb'); assert.match(r.text, /spätestens heute|spätestens 03\.11\.2026/);
  assert.match(T.dsinfoPruefen(tipp(), '2026-11-03').text, /spätestens heute, 03\.11\.2026/);
  r = T.dsinfoPruefen(tipp(), '2026-11-04');
  assert.equal(r.stufe, 'rot'); assert.match(r.text, /am 03\.11\.2026 abgelaufen/);
  r = T.dsinfoPruefen(tipp({ ersterKontaktAm: '2026-10-05' }), '2026-10-05');
  assert.equal(r.stufe, 'rot'); assert.match(r.text, /Art\. 14 Abs\. 3 lit\. b/);
  assert.equal(T.dsinfoPruefen(tipp({ stand: 'termin' }), '2026-10-05').stufe, 'rot');
  r = T.dsinfoPruefen(tipp({ weitergabeAm: '2026-10-04' }), '2026-10-05');
  assert.equal(r.stufe, 'rot'); assert.match(r.text, /lit\. c/);
  // erteilt: grün mit Weg und Version, gelb ohne Nachweis oder nach der Frist
  assert.equal(T.dsinfoPruefen(tipp({ dsinfo: { erteiltAm: '2026-10-04', weg: 'E-Mail', version: 'DSI 2026-01' } }), '2026-10-10').stufe, 'gruen');
  r = T.dsinfoPruefen(tipp({ dsinfo: { erteiltAm: '2026-10-04' } }), '2026-10-10');
  assert.equal(r.stufe, 'gelb'); assert.match(r.text, /Weg und Version des Vordrucks/);
  r = T.dsinfoPruefen(tipp({ ersterKontaktAm: '2026-10-05', dsinfo: { erteiltAm: '2026-10-08', weg: 'Post', version: 'V1' } }), '2026-10-10');
  assert.equal(r.stufe, 'gelb'); assert.match(r.text, /nach der Frist \(spätestens 05\.10\.2026/);
  // bereits informiert: nur mit Fundstelle grün
  assert.equal(T.dsinfoPruefen(tipp({ dsinfo: { bereitsInformiert: true, fundstelle: 'DSI der Bank 2025' } }), '2026-12-10').stufe, 'gruen');
  assert.equal(T.dsinfoPruefen(tipp({ dsinfo: { bereitsInformiert: true, fundstelle: '' } }), '2026-10-10').stufe, 'gelb');
  // Zweckänderung (Art. 13 Abs. 3): rot bis zur Information
  r = T.dsinfoPruefen(tipp({ herkunft: 'bank' }), '2026-10-03');
  assert.equal(r.stufe, 'rot'); assert.match(r.text, /Art\. 13 Abs\. 3/);
  assert.match(T.dsinfoPruefen(tipp({ herkunft: 'bank', dsinfo: { bereitsInformiert: true, fundstelle: 'X' } }), '2026-10-03').text, /Art\. 13 Abs\. 4/);
  assert.equal(T.dsinfoPruefen(tipp({ datum: '' }), '2026-10-03').stufe, 'rot');
  // eigenes Datumsformat
  assert.match(T.dsinfoPruefen(tipp(), '2026-10-03', { datum: d => '[' + d + ']' }).text, /\[2026-11-03\]/);
});

test('Prüfpunkte: Tippgeber, Kunde, Einverständnis, Weitergabe, kein Interesse, gelöschter Kunde', () => {
  let l = T.pruefen(tipp({ geberId: '', quelle: {}, kundeId: '' }), '2026-10-03');
  assert.equal(l[0].stufe, 'rot'); assert.match(l[0].text, /Art\. 14 Abs\. 2 lit\. f/);
  assert.ok(l.some(x => /Kunde fehlt/.test(x.text)));
  assert.ok(l.some(x => /Bankgeheimnis/.test(x.text) && x.stufe === 'gelb'));
  l = T.pruefen(tipp({ einverstandenAm: '2026-10-02' }), '2026-10-03');
  assert.ok(l.some(x => x.stufe === 'gruen' && /Einverständnis mit der Kontaktaufnahme am 02\.10\.2026/.test(x.text)));
  assert.ok(T.pruefen(tipp({ weitergabeAm: '2026-10-03' }), '2026-10-03').some(x => /Empfänger eintragen/.test(x.text)));
  assert.ok(T.pruefen(tipp({ stand: 'kein' }), '2026-10-03').some(x => /Löschung prüfen/.test(x.text)));
  assert.deepEqual(T.pruefen(tipp({ kundeGeloescht: '2026-10-05', kundeId: '' }), '2026-10-06').map(x => x.stufe), ['gruen']);
  const r = T.pruefen(tipp(), '2026-12-01').map(x => x.stufe);
  assert.deepEqual(r, [...r].sort((a, b) => ({ rot: 0, gelb: 1, gruen: 2 })[a] - ({ rot: 0, gelb: 1, gruen: 2 })[b]));
});

test('Stand: Verlauf, höchste Stufe, erster Kontakt automatisch', () => {
  const t = tipp();
  T.standSetzen(t, 'kontakt', '2026-10-05');
  assert.equal(t.ersterKontaktAm, '2026-10-05'); assert.equal(t.stufe, 1); assert.equal(t.standAm, '2026-10-05');
  T.standSetzen(t, 'auftrag', '2026-10-20'); T.standSetzen(t, 'kein', '2026-11-02');
  assert.equal(t.stufe, 3); assert.equal(t.stand, 'kein'); assert.equal(t.ersterKontaktAm, '2026-10-05');
  assert.deepEqual(t.verlauf.map(v => v.text), ['Stand: Kontakt aufgenommen', 'Stand: Auftrag', 'Stand: kein Interesse']);
  T.standSetzen(t, 'unbekannt', '2026-11-03'); assert.equal(t.stand, 'kein');
  const k = T.standSetzen(tipp(), 'kein', '2026-10-05'); assert.equal(k.ersterKontaktAm, '');
});

test('Rückmeldung an den Tippgeber: nur Datum, Art und Stand', () => {
  const r = T.rueckmeldungText({ geberName: 'Erika Beispiel', datum: '2026-10-03', tippArt: 'verkauf', stand: 'auftrag', berater: 'Max Probe' });
  assert.equal(r.betreff, 'Ihr Tipp vom 03.10.2026: Auftrag');
  assert.match(r.text, /^Guten Tag Erika Beispiel,/);
  assert.match(r.text, /Tipp vom 03\.10\.2026 \(Verkaufsabsicht\)\. Zum Stand: Daraus ist ein Auftrag geworden/);
  assert.match(r.text, /Viele Grüße\nMax Probe$/);
  assert.match(T.rueckmeldungText({ tippArt: 'kauf', stand: 'verkauf', datum: '2026-10-03' }).text, /Der Kauf ist zustande gekommen/);
  assert.match(T.rueckmeldungText({}).text, /^Guten Tag,/);
  assert.equal(T.rueckmeldungOffen({ stand: 'neu' }), true);
  assert.equal(T.rueckmeldungOffen({ stand: 'termin', rueckmeldungStand: 'termin' }), false);
  assert.equal(T.rueckmeldungOffen({ stand: 'auftrag', rueckmeldungStand: 'termin' }), true);
});

test('Stand aus Akquise und Anfrage: Vorschlag nur, wenn der Eintrag weiter ist', () => {
  assert.equal(T.standAusVorgang('akquise', 'Auftrag erteilt', 'In Vermarktung'), 'auftrag');
  assert.equal(T.standAusVorgang('akquise', 'Auftrag erteilt', 'Verkauft'), 'verkauf');
  assert.equal(T.standAusVorgang('akquise', 'Kein Auftrag', 'Verkauft'), 'kein');
  assert.equal(T.standAusVorgang('anfrage', 'Gekauft', ''), 'verkauf');
  assert.equal(T.standAusVorgang('anfrage', 'Unbekannt', ''), '');
  assert.equal(T.standVorschlag(tipp({ stand: 'kontakt' }), 'auftrag'), 'auftrag');
  assert.equal(T.standVorschlag(tipp({ stand: 'auftrag' }), 'termin'), '');
  assert.equal(T.standVorschlag(tipp({ stand: 'termin' }), 'kein'), 'kein');
  assert.equal(T.standVorschlag(tipp({ stand: 'auftrag' }), 'kein'), '');
  assert.equal(T.standVorschlag(tipp({ stand: 'kein' }), 'auftrag'), '');
});

test('Auswertung je Filiale, Quartal und Art — ohne Personen, mit Zahl der Tippgeber für den Hinweis', () => {
  const l = [
    tipp({ datum: '2026-02-10', stand: 'verkauf', stufe: 4 }),
    tipp({ datum: '2026-05-10', stand: 'kein', stufe: 2, geberId: 'tg2', quelle: { name: 'Max Probe', filiale: 'Musterstadt', art: 'baufinanzierung' } }),
    tipp({ datum: '2026-08-01', stand: 'auftrag', stufe: 3, geberId: 'tg3', quelle: { name: 'Ida Muster', filiale: 'Beispielort', art: 'kundenberater' }, tippArt: 'bewertung' }),
    tipp({ datum: '2026-09-15', stand: 'kontakt', stufe: 1, geberId: 'tg3', quelle: { name: 'Ida Muster', filiale: 'Beispielort', art: 'kundenberater' } }),
    tipp({ datum: '2025-12-20', stand: 'auftrag', stufe: 3 })];
  const a = T.auswertung(l, { jahr: '2026' });
  assert.deepEqual(a.filialen.map(r => r.filiale), ['Beispielort', 'Musterstadt']);
  const m = a.filialen[1], b = a.filialen[0];
  assert.deepEqual(m.gesamt, { tipps: 2, kontakt: 2, termin: 2, auftrag: 1, verkauf: 1, kein: 1 });
  assert.equal(m.geber, 2); assert.equal(b.geber, 1);
  assert.deepEqual(m.q.map(z => z.tipps), [1, 1, 0, 0]);
  assert.deepEqual(b.q, [{ tipps: 0, auftrag: 0, verkauf: 0 }, { tipps: 0, auftrag: 0, verkauf: 0 }, { tipps: 2, auftrag: 1, verkauf: 0 }, { tipps: 0, auftrag: 0, verkauf: 0 }]);
  assert.deepEqual(a.summe.gesamt, { tipps: 4, kontakt: 4, termin: 3, auftrag: 2, verkauf: 1, kein: 1 });
  assert.deepEqual(a.geberArten.map(r => [r.art, r.gesamt.tipps]), [['kundenberater', 3], ['baufinanzierung', 1]]);
  assert.deepEqual(a.tippArten.map(r => [r.art, r.gesamt.tipps]), [['verkauf', 3], ['bewertung', 1]]);
  // Quartal: Trichter nur im Quartal, Quartalsmatrix bleibt das ganze Jahr
  const q3 = T.auswertung(l, { jahr: '2026', quartal: 3 });
  assert.deepEqual(q3.summe.gesamt.tipps, 2); assert.deepEqual(q3.summe.q.map(z => z.tipps), [1, 1, 2, 0]);
  assert.equal(q3.filialen.find(r => r.filiale === 'Musterstadt').gesamt.tipps, 0);
  // keine Personennamen in der Auswertung
  assert.doesNotMatch(JSON.stringify(a), /Erika|Max Probe|Ida Muster|tg\d/);
  // eigene Zuordnung (z. B. aktuelle Tippgeber-Liste) und ohne Filiale
  const c = T.auswertung([tipp({ quelle: {} })], { jahr: '2026', filiale: () => '' });
  assert.equal(c.filialen[0].filiale, 'ohne Filiale');
  assert.equal(T.quartal('2026-12-31'), 4); assert.equal(T.quartal('x'), 0);
});
