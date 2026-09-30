/* Liegenschaftsverwaltung — Rechenkern der Mietverwaltung (js/verwaltung.js) gegen die unabhängige
   Vergleichsrechnung tests/referenz/verwaltung_sollwerte.py (erzeugt verwaltung_sollwerte.json) und gegen Grenzfälle. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const V = require('../../js/verwaltung.js');
const FAELLE = JSON.parse(readFileSync(new URL('../referenz/verwaltung_faelle.json', import.meta.url), 'utf8'));
const SOLL = JSON.parse(readFileSync(new URL('../referenz/verwaltung_sollwerte.json', import.meta.url), 'utf8'));
const ST = FAELLE.stichtag;

test('Ostersonntag 2020–2035 wie die Gaußsche Osterformel', () => {
  for (const [j, d] of Object.entries(SOLL.ostern)) assert.equal(V.ostersonntag(+j), d, 'Ostern ' + j);
});

test('Fälligkeit: dritter Werktag 2025–2027 (Samstag zählt nicht, Feiertage BW)', () => {
  for (const [m, d] of Object.entries(SOLL.dritterWerktag)) assert.equal(V.dritterWerktag(m), d, m);
  // Einzelfälle mit Begründung: 01.01. Feiertag, 03.01. Samstag, 06.01. Heilige Drei Könige
  assert.equal(V.dritterWerktag('2026-01'), '2026-01-07');
  // Karfreitag 03.04. und Ostermontag 06.04.2026
  assert.equal(V.dritterWerktag('2026-04'), '2026-04-07');
});

for (const fall of FAELLE.vertraege) {
  test('Vergleichsrechnung: ' + fall.name, () => {
    const s = SOLL.vertraege[fall.name], v = fall.vertrag;
    const sortiert = a => a.slice().sort((x, y) => (x.faellig + x.id < y.faellig + y.id ? -1 : 1));
    assert.deepEqual(V.sollstellung(v, ST).map(p => ({ id: p.id, faellig: p.faellig, betrag: p.betrag })), sortiert(s.soll), 'Sollstellung');
    const op = V.offenePosten(v, fall.zahlungen, ST, { aufschlag: fall.wohnraum ? 5 : 9 });
    assert.deepEqual(op.posten.map(p => ({ id: p.id, bezahlt: p.bezahlt, offen: p.offen, zinsen: p.zinsen, status: p.status })), s.posten, 'offene Posten');
    for (const k of ['soll', 'rueckstand', 'guthaben', 'zinsen']) assert.equal(op.summe[k], s.summe[k], 'Summe ' + k);
    const ks = V.kuendigungsschwelle(op, v, ST);
    assert.equal(ks.a, s.schwelle.a, 'Schwelle a'); assert.equal(ks.b, s.schwelle.b, 'Schwelle b');
    assert.equal(ks.monatsmiete, s.schwelle.monatsmiete);
    const k = V.kaution(v, fall.zahlungen, ST);
    assert.equal(k.hoechst, s.kaution.hoechst); assert.equal(k.ist, s.kaution.ist); assert.equal(k.faelligOffen, s.kaution.faelligOffen);
    assert.deepEqual(k.raten, s.kaution.raten);
  });
}

test('Vergleichsrechnung: Leerstand und entgangene Kaltmiete', () => {
  const l = FAELLE.leerstand;
  assert.deepEqual(V.leerstand(l.liegenschaft, l.von, l.bis), SOLL.leerstand);
});

test('Eingaben im deutschen Format; Ungültiges wird nicht still zu 0', () => {
  assert.equal(V.zahlEingabe('1.234,56'), 1234.56);
  assert.equal(V.zahlEingabe('450.000'), 450000);
  assert.equal(V.zahlEingabe('1.406'), 1406);
  assert.equal(V.zahlEingabe('0,082'), 0.082);
  assert.equal(V.zahlEingabe('12.5'), 12.5);
  assert.equal(V.zahlEingabe('−80,50 €'), -80.5);
  assert.equal(V.zahlEingabe(''), null);
  assert.ok(Number.isNaN(V.zahlEingabe('abc')));
  assert.ok(Number.isNaN(V.zahlEingabe('12,5,3')));
});

test('Datum: Monatsende wird gekappt, Schaltjahr', () => {
  assert.equal(V.plusMonate('2026-01-31', 1), '2026-02-28');
  assert.equal(V.plusMonate('2028-01-31', 1), '2028-02-29');
  assert.equal(V.ueberlappung('2026-01-01', '2026-01-31', '2026-01-15', null), 17);
  assert.equal(V.datumGueltig('2026-02-30'), false);
});

test('Verzugszinsen: Basiszins 1,27 % + 5 Pp. für 30 Tage auf 1.000 €', () => {
  // 1.000 × 6,27 % × 30 / 365 = 5,153… → 5,15 €
  assert.equal(V.r2(V.verzugszinsen(1000, '2026-03-03', '2026-04-02', 5)), 5.15);
  // über den Wechsel am 01.07.2026 (1,27 % → 1,52 %): 10 Tage zu 6,27 %, 10 Tage zu 6,52 %
  const z = V.verzugszinsen(1000, '2026-06-20', '2026-07-10', 5);
  assert.equal(V.r2(z), V.r2(1000 * (0.0627 * 10 + 0.0652 * 10) / 365));
  assert.equal(V.verzugszinsen(1000, '2026-03-03', '2026-03-03', 5), 0);
});

test('Kaution über drei Nettokaltmieten wird gemeldet (§ 551 BGB)', () => {
  const v = { id: 'v', einheitId: 'e', beginn: '2026-01-01', miete: { kalt: 800 }, kaution: { soll: 2500 } };
  const k = V.kaution(v, [], '2026-02-01');
  assert.equal(k.hoechst, 2400);
  assert.match(k.warnungen.join(' '), /§ 551/);
});

test('Kennzahlen und Fristen einer Liegenschaft', () => {
  const l = {
    id: 'L', name: 'Test', einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung', flaeche: 70 }, { id: 'e2', nr: 'W2', art: 'wohnung', flaeche: 50, sollmiete: 500 }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2025-10-01', ende: '2026-10-31', mietart: 'index', miete: { kalt: 700, nk: 150, hk: 0, zuschlag: 0, ust: 0 }, mieter: [{ name: 'A. Muster' }] }],
    zahlungen: [{ id: 'z', vertragId: 'v1', datum: '2025-10-01', betrag: 8500, art: 'miete' }]
  };
  const kz = V.kennzahlen(l, ST, { wert: 250000 });
  assert.equal(kz.vermietet, 1); assert.equal(kz.leer, 1);
  assert.equal(kz.kaltMonat, 700); assert.equal(kz.leerquoteFlaeche, V.r2(50 / 120 * 100));
  assert.equal(kz.rueckstand, 12 * 850 - 8500);   // Oktober 2025 bis September 2026
  assert.equal(kz.rendite, V.r2(8400 / 250000 * 100));
  const f = V.fristen(l, ST, 60).map(x => x.art);
  assert.ok(f.includes('vertragsende'), 'Vertragsende 31.10. liegt im Horizont');
  assert.ok(f.includes('index'), 'Indexmiete seit 12 Monaten unverändert');
  assert.ok(f.includes('rueckstand'));
});

test('Bereinigung: nur bekannte Felder, eingeschleuste Inhalte bleiben Text, ungültige Einträge fallen weg', () => {
  const z = { verworfen: 0 };
  const l = V.bereinigen({
    id: 'L1', name: '<img src=x onerror=alert(1)>', art: 'boese', fremd: 'weg',
    einheiten: [{ id: 'e1', nr: '1', flaeche: '70' }, { id: 'e 2 kaputt', nr: '2' }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2026-01-01', miete: { kalt: 700, nk: 'x' } }, { id: 'v2', einheitId: 'gibtsnicht', beginn: '2026-01-01' }],
    zahlungen: [{ id: 'z1', vertragId: 'v1', datum: '2026-01-02', betrag: 700 }, { id: 'z2', vertragId: 'v1', datum: '2026-13-01', betrag: 5 }]
  }, z);
  assert.equal(l.name, '<img src=x onerror=alert(1)>', 'Text bleibt Text — maskiert wird bei der Ausgabe');
  assert.equal(l.art, 'mfh'); assert.equal(l.fremd, undefined);
  assert.equal(l.einheiten.length, 1); assert.equal(l.einheiten[0].flaeche, null, 'Text statt Zahl wird nicht übernommen');
  assert.equal(l.vertraege.length, 1); assert.equal(l.vertraege[0].miete.nk, 0);
  assert.equal(l.zahlungen.length, 1);
  assert.equal(z.verworfen, 3);
  assert.equal(V.bereinigen({ id: 'a b' }), null);
});

test('Sicherungsdateien: fremde und beschädigte Dateien werden verständlich abgelehnt', () => {
  assert.match(V.sicherungPruefen({ typ: 'immoapp-projekte', projekte: [] }).fehler, /Projektsicherung/);
  assert.match(V.sicherungPruefen({ typ: 'vb-marktdaten', objekte: [] }).fehler, /Marktüberblick/);
  assert.match(V.sicherungPruefen([1, 2]).fehler, /keine Sicherung der Liegenschaftsverwaltung/);
  assert.match(V.sicherungPruefen({ typ: 'immoapp-verwaltung', liegenschaften: [{ id: 'a b' }] }).fehler, /beschädigt/);
  const ok = V.sicherungPruefen({ typ: 'immoapp-verwaltung', version: 1, liegenschaften: [{ id: 'L1', name: 'X' }], anhaenge: [{ id: 'a1', data: 'QUJD' }, { id: 'a2', data: 'kein base64!' }] });
  assert.equal(ok.ok, true); assert.equal(ok.liegenschaften.length, 1); assert.equal(ok.anhaenge.length, 1); assert.equal(ok.verworfen, 1);
});
