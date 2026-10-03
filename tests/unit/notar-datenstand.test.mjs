/* Notarauftrag und Datenstand (js/beratung.js, D39): Kalenderdatei nach RFC 5545, Frist für den Vertragsentwurf nach
   § 17 Abs. 2a Satz 2 Nr. 2 BeurkG, Regeln des Datenstands. Sollwerte von Hand aus Kalender und Regeln abgeleitet. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const B = require_('../../js/beratung.js');
const ST = (e, heute) => Object.fromEntries(B.datenstand(e, heute).liste.map(x => [x.id, x.status]));

test('Kalenderdatei: CRLF, Zeilen höchstens 75 Oktette, Text maskiert, Ortszeit ohne Zeitzone', () => {
  const t = B.ics({ uid: 'no1@immoapp', titel: 'Notartermin Musterweg 7a, Ilsfeld; Kaufvertrag', ort: 'Notariat Beispiel, Heilbronn', datum: '2026-11-12', uhrzeit: '10:30',
    dauerMin: 90, erinnerungMin: 1440, beschreibung: 'Zeile 1\nZeile 2 mit Backslash \\ und einem langen Text, der über fünfundsiebzig Oktette hinausgeht — äöüß',
    jetzt: new Date(Date.UTC(2026, 9, 3, 8, 0, 0)) });
  assert.ok(t.endsWith('\r\n')); assert.ok(!/[^\r]\n/.test(t), 'nur CRLF');
  const zeilen = t.split('\r\n').slice(0, -1);
  for (const z of zeilen) assert.ok(Buffer.byteLength(z, 'utf8') <= 75, 'zu lang: ' + z);
  const ent = zeilen.reduce((a, z) => z.startsWith(' ') ? (a[a.length - 1] += z.slice(1), a) : (a.push(z), a), []);   // entfalten
  assert.deepEqual(ent.slice(0, 6), ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ImmoApp//Termine//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT']);
  assert.ok(ent.includes('DTSTAMP:20261003T080000Z'));
  assert.ok(ent.includes('DTSTART:20261112T103000')); assert.ok(ent.includes('DTEND:20261112T120000'));
  assert.ok(ent.includes('SUMMARY:Notartermin Musterweg 7a\\, Ilsfeld\\; Kaufvertrag'));
  assert.ok(ent.includes('LOCATION:Notariat Beispiel\\, Heilbronn'));
  assert.ok(ent.includes('DESCRIPTION:Zeile 1\\nZeile 2 mit Backslash \\\\ und einem langen Text\\, der über fünfundsiebzig Oktette hinausgeht — äöüß'));
  assert.ok(ent.includes('TRIGGER:-PT1440M'));
  assert.deepEqual(ent.slice(-2), ['END:VEVENT', 'END:VCALENDAR']);
  // ganztägig über das Monatsende, Termin um Mitternacht des nächsten Tages endet richtig
  const g = B.ics({ titel: 'Termin', datum: '2026-10-31', jetzt: new Date(0) });
  assert.ok(g.includes('DTSTART;VALUE=DATE:20261031\r\n')); assert.ok(g.includes('DTEND;VALUE=DATE:20261101\r\n'));
  assert.ok(B.ics({ datum: '2026-12-31', uhrzeit: '23:30', dauerMin: 60, jetzt: new Date(0) }).includes('DTEND:20270101T003000'));
  assert.ok(B.ics({ datum: '2026-03-29', uhrzeit: '9.15', jetzt: new Date(0) }).includes('DTSTART:20260329T091500'));   // Zeitumstellung: Ortszeit bleibt
  assert.ok(B.ics({ datum: '2026-10-20', uhrzeit: '25:00', jetzt: new Date(0) }).includes('DTSTART;VALUE=DATE:20261020'));
  assert.equal(B.ics({ datum: '20.10.2026' }), '');
});

test('Frist für den Vertragsentwurf: zwei Wochen vor der Beurkundung (§ 17 Abs. 2a Satz 2 Nr. 2 BeurkG)', () => {
  assert.deepEqual(B.notarFrist('2026-11-12', '2026-10-03'), { entwurfBis: '2026-10-29', tageBisTermin: 40, tageBisEntwurf: 26, stufe: 'ok' });
  assert.deepEqual(B.notarFrist('2026-10-20', '2026-10-03'), { entwurfBis: '2026-10-06', tageBisTermin: 17, tageBisEntwurf: 3, stufe: 'bald' });
  assert.equal(B.notarFrist('2026-10-16', '2026-10-03').stufe, 'knapp');     // 13 Tage
  assert.equal(B.notarFrist('2026-10-17', '2026-10-03').stufe, 'bald');      // genau 14 Tage: Entwurf heute
  assert.equal(B.notarFrist('2026-10-02', '2026-10-03').stufe, 'vorbei');
  assert.equal(B.notarFrist('2027-01-05', '2026-12-20').entwurfBis, '2026-12-22');
  assert.equal(B.notarFrist('', '2026-10-03'), null);
});

test('Datenstand: Baupreisindex erwartet um den 10. des zweiten Monats nach dem Berichtsmonat', () => {
  const e = { bpiStand: '2026-05' };
  assert.equal(ST(e, '2026-09-25').bpi, 'ok');         // 15 Tage vor dem 10.10.
  assert.equal(ST(e, '2026-09-26').bpi, 'bald');
  assert.equal(ST(e, '2026-10-30').bpi, 'bald');
  assert.equal(ST(e, '2026-10-31').bpi, 'faellig');
  const x = B.datenstand({ bpiStand: '2025-11' }, '2026-01-02').liste.find(z => z.id === 'bpi');
  assert.equal(x.naechste, 'Februar 2026, erwartet um den 10.04.2026'); assert.equal(x.stand, 'November 2025'); assert.equal(x.status, 'ok');
});

test('Datenstand: Sterbetafel, BMF-Tabelle, Bodenrichtwerte (§ 196 Abs. 1 Satz 4 BauGB)', () => {
  assert.equal(ST({ tafelZeitraum: '2023/2025' }, '2027-07-14').sterbetafel, 'ok');
  assert.equal(ST({ tafelZeitraum: '2023/2025' }, '2027-07-15').sterbetafel, 'bald');
  assert.equal(ST({ tafelZeitraum: '2023/2025' }, '2027-09-13').sterbetafel, 'faellig');
  assert.equal(ST({ bmfJahre: [2026] }, '2026-09-30').bmf, 'ok');
  assert.equal(ST({ bmfJahre: [2026] }, '2026-10-01').bmf, 'bald');
  assert.equal(ST({ bmfJahre: [2026] }, '2027-01-01').bmf, 'faellig');
  assert.equal(ST({ bmfJahre: [2026, 2027] }, '2026-12-01').bmf, 'ok');
  const b26 = B.datenstand({}, '2026-10-03').liste.find(z => z.id === 'brw'), b27 = B.datenstand({ bewertungenVorBrw: 2 }, '2027-03-01').liste.find(z => z.id === 'brw');
  // D48: Baden-Württemberg — Stichtag 01.01. ungerader Jahre, veröffentlicht bis 30.06. (§ 196 Abs. 1 Satz 5 BauGB, § 12 GuAVO BW)
  assert.deepEqual([b26.stand, b26.naechste, b26.status], ['Stichtag 01.01.2025', 'Stichtag 01.01.2027, veröffentlicht bis 30.06.2027', 'ok']);
  assert.deepEqual([b27.stand, b27.status], ['Stichtag 01.01.2025', 'bald']); assert.match(b27.text, /^Neue Bodenrichtwerte zum Stichtag 01\.01\.2027 erscheinen spätestens am 30\.06\.2027/); assert.match(b27.text, /2 Objekte in Vermarktung/);
  const b27j = B.datenstand({}, '2027-07-01').liste.find(z => z.id === 'brw'), b28 = B.datenstand({}, '2028-02-01').liste.find(z => z.id === 'brw');
  assert.deepEqual([b27j.stand, b27j.status, b28.stand], ['Stichtag 01.01.2027', 'ok', 'Stichtag 01.01.2027']);
  assert.deepEqual(B.brwStand('2026-10-03'), { turnus: 'bw2', stand: 2025, naechster: 2027, veroeffentlichtBis: '2027-06-30', wartet: false });
  assert.deepEqual(B.brwStand('2027-03-01', 'jaehrlich'), { turnus: 'jaehrlich', stand: 2026, naechster: 2027, veroeffentlichtBis: '2027-06-30', wartet: true });
});

test('Datenstand: Marktdaten, Preisindex, Sicherung, Liegenschaften, Löschprüfung, Rechtsstand', () => {
  const h = '2026-10-03';
  assert.equal(ST({}, h).markt, 'info');
  assert.equal(ST({ marktdaten: [{ name: 'A', stand: '2025-06-30' }] }, h).markt, 'ok');
  assert.equal(ST({ marktdaten: [{ name: 'A', stand: '2024-09-30' }] }, h).markt, 'bald');       // 25 Monate
  assert.equal(ST({ marktdaten: [{ name: 'A', stand: '2024-03-31' }] }, h).markt, 'faellig');    // 31 Monate
  assert.equal(ST({ marktdaten: [{ name: 'A', stand: '' }] }, h).markt, 'faellig');
  assert.equal(ST({}, h).index, 'info');
  assert.equal(ST({ indexJahre: { haus: [2024, 2025] } }, h).index, 'ok');
  assert.equal(ST({ indexJahre: { wohnung: [2024] } }, h).index, 'faellig');
  // Sicherung: nur mit Daten; nie → fällig; alt und geändert → fällig; alt ohne Änderung → ok
  assert.equal(ST({}, h).sicherung, undefined);
  assert.equal(ST({ projekte: 2 }, h).sicherung, 'faellig');
  assert.equal(ST({ projekte: 2, sicherung: Date.parse('2026-09-01T10:00:00Z'), geaendertSeitSicherung: 1 }, h).sicherung, 'faellig');
  assert.equal(ST({ projekte: 2, sicherung: Date.parse('2026-09-01T10:00:00Z'), geaendertSeitSicherung: 0 }, h).sicherung, 'ok');
  assert.equal(ST({ projekte: 2, sicherung: Date.parse('2026-09-25T10:00:00Z'), geaendertSeitSicherung: 3 }, h).sicherung, 'ok');
  // Liegenschaften: Preiseinschätzung zum 31.12. des Vorjahres; bis Ende März „bald“, danach fällig; im Dezember die nächste
  const lg = [{ name: 'Filiale A', letzte: '2025-12-31' }, { name: 'Filiale B', letzte: '2024-12-31' }];
  assert.equal(ST({ liegenschaften: lg }, '2026-02-15').liegenschaften, 'bald');
  assert.equal(ST({ liegenschaften: lg }, '2026-04-01').liegenschaften, 'faellig');
  assert.match(B.datenstand({ liegenschaften: lg }, h).liste.find(z => z.id === 'liegenschaften').text, /Filiale B\.$/);
  assert.equal(ST({ liegenschaften: [lg[0]] }, h).liegenschaften, 'ok');
  assert.equal(ST({ liegenschaften: [lg[0]] }, '2026-12-01').liegenschaften, 'bald');
  assert.equal(ST({}, h).liegenschaften, undefined);
  assert.equal(ST({ kunden: 3, loeschpruefungFaellig: 1 }, h).loeschen, 'faellig');
  assert.equal(ST({ kunden: 3 }, h).loeschen, 'ok');
  assert.equal(ST({ notarErledigtAlt: 2 }, h).notar, 'bald');
  assert.equal(ST({}, h).recht, 'ok'); assert.equal(ST({}, '2027-04-03').recht, 'bald');
  const r = B.datenstand({ projekte: 1, bpiStand: '2026-05', bmfJahre: [2026] }, h);
  assert.deepEqual([r.faellig, r.bald], [1, 2]);       // Sicherung fällig; Baupreisindex und BMF-Tabelle bald
});
