/* Liegenschaftsverwaltung Stufe 5: Mieterhöhung, Kontoauszug-Import, Jahresbericht/Anlage V, Dokumente.
   Sollwerte aus der unabhängigen Python-Rechnung (tests/referenz/verwaltung_mh_ref.py, verwaltung_bericht_ref.py →
   verwaltung_sollwerte.json); Import-Sollwerte von Hand aus den synthetischen Beispieldateien. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const V = require('../../js/verwaltung.js');
require('../../js/verwaltung-nk.js'); require('../../js/verwaltung-ih.js'); require('../../js/verwaltung-weg.js');
const M = require('../../js/verwaltung-mh.js');
const B = require('../../js/verwaltung-bank.js');
const R = require('../../js/verwaltung-bericht.js');
const D = require('../../js/verwaltung-dok.js');
const FAELLE = JSON.parse(readFileSync(new URL('../referenz/verwaltung_faelle.json', import.meta.url), 'utf8'));
const SOLL = JSON.parse(readFileSync(new URL('../referenz/verwaltung_sollwerte.json', import.meta.url), 'utf8'));

function liegenschaftAus(f) {
  const lg = f.liegenschaft;
  return V.bereinigen({ id: 'L', ort: lg.ort, einstellungen: { kappung15: !!lg.kappung15 }, einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung', flaeche: lg.flaeche }], vertraege: [f.vertrag] });
}

test('KappVO BW: 130 Gemeinden wie im Wortlaut des Gesetzblatts, Erkennung am Ort', () => {
  assert.equal(M.KAPPVO[0].gemeinden.length, 130);
  assert.deepEqual(M.KAPPVO[0].gemeinden.slice().sort(), SOLL.mieterhoehung.kappvo.slice().sort());
  const vo = M.KAPPVO[0];
  for (const [ort, ja] of [['Heilbronn', true], ['Heilbronn-Sontheim', true], ['Ilsfeld', false], ['Beilstein', false], ['Abstatt', false],
    ['Freiburg im Breisgau', true], ['St. Leon-Rot', true], ['Eningen unter Achalm', true], ['Kirchheim am Neckar', false], ['Goeppingen', true], ['', false]])
    assert.equal(M.inKappVo(ort, vo), ja, ort);
  assert.equal(M.kappung({ ort: 'Heilbronn', einstellungen: {} }, '2026-06-01').prozent, 15);
  const nach = M.kappung({ ort: 'Heilbronn', einstellungen: {} }, '2027-02-01');
  assert.equal(nach.prozent, 20); assert.ok(nach.pruefen, 'nach Ablauf der Verordnung: Hinweis zur Prüfung');
  assert.equal(M.kappung({ ort: 'München', einstellungen: { kappung15: true } }, '2027-02-01').prozent, 15, 'Häkchen in den Stammdaten');
});

test('Mieterhöhung §§ 558, 557b, 559 = unabhängige Python-Rechnung', () => {
  for (const f of FAELLE.mieterhoehung) {
    const l = liegenschaftAus(f), v = l.vertraege[0], s = SOLL.mieterhoehung.faelle[f.name];
    if (f.art === '558') {
      const r = M.erhoehung558(l, v, f.opt);
      for (const k of ['fruehesterZugang', 'wirksam', 'zustimmungBis', 'klageBis', 'aktuell', 'ausgang', 'kappungProzent', 'kappungGrenze', 'vergleich', 'hoechst', 'neu', 'erhoehung'])
        assert.equal(r[k], s[k], f.name + ': ' + k);
      assert.equal(r.gruende.some(g => /Zu früh/.test(g)), s.zuFrueh, f.name + ': zu früh');
      assert.equal(r.ok, !s.zuFrueh, f.name + ': ok');
    } else if (f.art === 'index') {
      const r = M.indexAnpassung(l, v, f.opt);
      for (const k of ['wirksam', 'aktuell', 'neu', 'aenderungProzent']) assert.equal(r[k], s[k], f.name + ': ' + k);
      assert.equal(r.gruende.some(g => /ein Jahr unverändert/.test(g)), s.sperre, f.name + ': Sperrfrist');
    } else {
      const r = M.modernisierung(l, v, f.opt);
      for (const k of ['wirksam', 'anrechenbar', 'jahr', 'monatRoh', 'kappungRest', 'monat', 'neu']) assert.equal(r[k], s[k], f.name + ': ' + k);
    }
  }
});

test('Mieterhöhung: Ausschlüsse und Hinweise', () => {
  const f = FAELLE.mieterhoehung[0], l = liegenschaftAus(f), v = l.vertraege[0];
  assert.ok(M.erhoehung558(l, Object.assign({}, v, { mietart: 'staffel' }), f.opt).gruende.some(g => /Staffelmiete/.test(g)));
  assert.ok(M.erhoehung558(l, Object.assign({}, v, { mietart: 'index' }), f.opt).gruende.some(g => /Indexmiete/.test(g)));
  const gew = V.bereinigen(Object.assign({}, l, { einheiten: [{ id: 'e1', nr: 'G1', art: 'gewerbe', flaeche: 80 }] }));
  assert.ok(M.erhoehung558(gew, gew.vertraege[0], f.opt).gruende.some(g => /nur für Wohnraum/.test(g)));
  assert.ok(M.erhoehung558(l, v, { zugang: '2026-07-10' }).gruende.some(g => /Vergleichsmiete/.test(g)), 'ohne Vergleichsmiete');
  assert.ok(M.modernisierung(l, v, { zugang: '2026-07-10', verfahren: 'vereinfacht', kosten: 12000, angekuendigt: true }).gruende.some(g => /10\.000/.test(g)));
  assert.ok(M.modernisierung(l, Object.assign({}, v, { mietart: 'staffel' }), { zugang: '2026-07-10', kosten: 5000, angekuendigt: true }).gruende.length);
  // Aufteilung nach Wohnfläche: Summe bleibt exakt
  const a = M.aufteilenNachFlaeche(10000, [{ id: 'a', flaeche: 33.3 }, { id: 'b', flaeche: 33.3 }, { id: 'c', flaeche: 33.4 }]);
  assert.equal(V.r2(a.a + a.b + a.c), 10000);
  // Frist: § 558 wird möglich (ein Jahr nach der letzten Erhöhung)
  const fr = M.fristen(l, '2025-05-15', 60);
  assert.deepEqual(fr.map(x => [x.art, x.datum]), [['mh558', '2025-06-01']]);
});

test('Bereinigung behält Indexangaben, Zugang, Import-Kennung und Vergleichsmiete', () => {
  const l = V.bereinigen({ id: 'L', einheiten: [{ id: 'e1', nr: 'W1', vergleichQm: 12.4 }], mietspiegel: { name: 'Mietspiegel Heilbronn 2025', art: 'qualifiziert', stand: '2025-04-01' },
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2024-01-01', miete: { kalt: 500 }, aenderungen: [{ id: 'a', ab: '2025-03-01', kalt: 520, grund: 'index', indexMonat: '2024-12', indexWert: 120.5, zugang: '2025-01-10' }] }],
    zahlungen: [{ id: 'z', datum: '2025-03-01', betrag: 520, vertragId: 'v1', iban: 'DE89370400440532013000', quelle: 'imp:0123456789abcdef' }, { id: 'y', datum: '2025-03-01', betrag: 5, vertragId: 'v1', iban: 'kaputt<script>', quelle: 'x y' }] });
  assert.deepEqual([l.vertraege[0].aenderungen[0].indexMonat, l.vertraege[0].aenderungen[0].indexWert, l.vertraege[0].aenderungen[0].zugang], ['2024-12', 120.5, '2025-01-10']);
  assert.equal(l.einheiten[0].vergleichQm, 12.4);
  assert.equal(l.mietspiegel.art, 'qualifiziert');
  assert.equal(l.zahlungen[0].quelle, 'imp:0123456789abcdef'); assert.equal(l.zahlungen[0].iban, 'DE89370400440532013000');
  assert.equal(l.zahlungen[1].iban, undefined); assert.equal(l.zahlungen[1].quelle, undefined);
});

test('Kontoauszug CAMT.053: gebuchte Umsätze, Sammelbuchung aufgeteilt, Vorzeichen, Vormerkung übersprungen', () => {
  const r = B.lesen(readFileSync(new URL('../fixtures/camt053_beispiel.xml', import.meta.url), 'utf8'));
  assert.ok(r.ok); assert.equal(r.format, 'CAMT'); assert.equal(r.konto, 'DE02120300000000202051');
  assert.deepEqual(r.umsaetze.map(u => [u.datum, u.betrag, u.name]), [
    ['2026-03-02', 1090, 'Anna Muster'], ['2026-03-04', 955, 'Bernd & Carla Beispiel'], ['2026-03-05', 720, 'Dora Probe'],
    ['2026-03-05', 955, 'Unbekannt GmbH'], ['2026-03-09', -955, 'Bernd Beispiel'], ['2026-03-10', -45.2, '']]);
  assert.equal(r.umsaetze[0].zweck, 'Miete 03/2026 Wohnung W1'); assert.equal(r.umsaetze[0].iban, 'DE89370400440532013000');
  assert.equal(r.umsaetze[1].ref, 'DAUERAUFTRAG-W2'); assert.equal(r.umsaetze[0].ref, '', 'NOTPROVIDED ist keine Referenz');
  assert.equal(B.lesen('<Document><Foo/></Document>').ok, false);
});

test('Kontoauszug CSV: Volksbank-, Sparkassen- und älteres Soll/Haben-Format', () => {
  const vb = 'Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Kategorie;Steuerrelevant;Glaeubiger ID;Mandatsreferenz\r\n'
    + 'Mietkonto;DE02120300000000202051;BYLADEM1001;Testbank;02.03.2026;02.03.2026;Anna Muster;DE89370400440532013000;COBADEFFXXX;Gutschrift;"Miete Maerz; W1";1.090,00;EUR;5.000,00;;;;;\r\n'
    + 'Mietkonto;DE02120300000000202051;BYLADEM1001;Testbank;05.03.2026;05.03.2026;Stadtwerke;DE12500105170648489890;;Lastschrift;Abschlag Strom;-45,20;EUR;4.954,80;;;;;\r\n';
  const a = B.lesen(vb);
  assert.ok(a.ok); assert.equal(a.konto, 'DE02120300000000202051');
  assert.deepEqual(a.umsaetze.map(u => [u.datum, u.betrag, u.name, u.zweck]), [['2026-03-02', 1090, 'Anna Muster', 'Miete Maerz; W1'], ['2026-03-05', -45.2, 'Stadtwerke', 'Abschlag Strom']]);
  const sk = '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"\n'
    + '"DE02120300000000202051";"04.03.26";"04.03.26";"GUTSCHR. UEBERWEISUNG";"Miete 03/2026";"";"";"";"";"";"";"Bernd Beispiel";"DE75512108001245126199";"GENODES1VBH";"955,00";"EUR";"Umsatz gebucht"\n';
  const b = B.lesen(sk);
  assert.deepEqual(b.umsaetze.map(u => [u.datum, u.betrag, u.name, u.iban]), [['2026-03-04', 955, 'Bernd Beispiel', 'DE75512108001245126199']]);
  const alt = 'Buchungstag;Valuta;Auftraggeber/Empfänger;Konto;Verwendungszweck;Umsatz;\n02.03.2026;02.03.2026;Anna Muster;DE89370400440532013000;Miete;1.090,00;H\n05.03.2026;05.03.2026;Stadtwerke;;Strom;45,20;S\n';
  const c = B.lesen(alt);
  assert.deepEqual(c.umsaetze.map(u => [u.betrag, u.name]), [[1090, 'Anna Muster'], [-45.2, 'Stadtwerke']]);
  const sh = 'Datum;Name;Verwendungszweck;Soll;Haben\n01.04.2026;Dora Probe;W3 Miete;;720,00\n02.04.2026;Handwerker;Rechnung;1.200,00;\n';
  assert.deepEqual(B.lesen(sh).umsaetze.map(u => u.betrag), [720, -1200]);
  assert.equal(B.lesen('a;b;c\n1;2;3\n').ok, false);
});

test('Kontoauszug: Zuordnungsvorschläge, Monat aus dem Verwendungszweck, Doppelbuchungen', () => {
  const l = V.bereinigen({ id: 'L', art: 'mfh', einheiten: [{ id: 'e1', nr: 'W1' }, { id: 'e2', nr: 'W2' }, { id: 'e3', nr: 'W3' }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2020-05-01', mieter: [{ name: 'Anna Muster' }], miete: { kalt: 800, nk: 180, hk: 110 } },
      { id: 'v2', einheitId: 'e2', beginn: '2025-03-01', mieter: [{ name: 'Bernd Beispiel' }, { name: 'Carla Beispiel' }], miete: { kalt: 700, nk: 160, hk: 95 } },
      { id: 'v3', einheitId: 'e3', beginn: '2025-08-01', mieter: [{ name: 'Dora Probe' }], miete: { kalt: 520, nk: 125, hk: 75 } }] });
  const r = B.lesen(readFileSync(new URL('../fixtures/camt053_beispiel.xml', import.meta.url), 'utf8'));
  const z = B.zuordnen(l, r.umsaetze);
  assert.deepEqual(z.map(x => x.vorschlag && x.vorschlag.id), ['v1', 'v2', 'v3', null, 'v2', null]);
  assert.deepEqual(z.map(x => x.monat), ['2026-03', '2026-03', '', '', '2026-03', '']);
  assert.ok(z[4].ruecklast); assert.ok(!z[5].ruecklast);
  const b = B.buchungen(l, z, z.filter(x => x.vorschlag).map(x => ({ kennung: x.kennung, typ: 'miete', id: x.vorschlag.id, art: 'miete', monat: x.monat })), p => p + Math.random().toString(36).slice(2, 8));
  assert.equal(b.miete.length, 4); assert.equal(b.miete[3].betrag, -955);
  const l2 = V.bereinigen(Object.assign({}, l, { zahlungen: b.miete }));
  const z2 = B.zuordnen(l2, r.umsaetze);
  assert.deepEqual(z2.map(x => x.doppelt), [true, true, true, false, true, false], 'zweiter Import erkennt die gebuchten Umsätze');
  // gelernte IBAN: neuer Name, gleiche IBAN → Vorschlag über die IBAN
  const u = { datum: '2026-04-02', betrag: 1090, name: 'A. M.', iban: 'DE89370400440532013000', zweck: 'Dauerauftrag', text: '', ref: '' };
  assert.equal(B.zuordnen(l2, [u])[0].vorschlag.id, 'v1');
  for (const [t, d, soll] of [['Miete 03/2026', '2026-03-02', '2026-03'], ['Miete Maerz', '2026-03-02', '2026-03'], ['Miete Januar', '2025-12-29', '2026-01'],
    ['Hausgeld 2026-04', '2026-04-01', '2026-04'], ['Rechnung 12 34', '2026-04-01', ''], ['Miete Dezember', '2026-01-03', '2025-12']])
    assert.equal(B.monatAusZweck(t, d), soll, t);
});

test('Kontoführung: eine Zahlung tilgt keine Rücklastschrift, die erst später entsteht', () => {
  const v = { id: 'v', einheitId: 'e', beginn: '2026-01-01', miete: { kalt: 1000 } };   // Vorauszahlung der ersten Miete am 29.12.
  const op = V.offenePosten(v, [{ id: 'a', vertragId: 'v', datum: '2025-12-29', betrag: 1000 }, { id: 'b', vertragId: 'v', datum: '2026-01-05', betrag: -1000 }], '2026-01-20');
  const jan = op.posten.find(p => p.id === 'M2026-01'), rl = op.posten.find(p => p.art === 'ruecklast');
  assert.equal(jan.bezahlt, 1000, 'die Zahlung vom 29.12. gilt der Januarmiete'); assert.equal(rl.offen, 1000);
});

test('Jahresbericht / Anlage V = unabhängige Python-Rechnung (Zufluss, Zehn-Tage-Regel, Aufteilung, Ausgaben)', () => {
  for (const f of FAELLE.jahresbericht) {
    const l = V.bereinigen(Object.assign({ id: 'L' }, f.liegenschaft)), b = R.jahresbericht(l, f.jahr), s = SOLL.jahresbericht[f.name];
    for (const x of b.vertraege) {
      const sv = s.vertraege[x.vertragId];
      assert.equal(x.ist, sv.ist, f.name + ' ' + x.vertragId + ': Zufluss');
      assert.equal(x.sollGesamt, sv.soll, f.name + ': Soll');
      for (const t of ['kalt', 'umlagen', 'ust', 'sonstige']) assert.equal(x.istTeile[t], sv[t], f.name + ': ' + t);
    }
    const ein = { kalt: 0, umlagen: 0, ust: 0, sonstige: 0 };
    for (const k of ['wohnen', 'gewerbe']) for (const t in ein) ein[t] = V.r2(ein[t] + b.einnahmen[k][t]);
    assert.deepEqual(ein, s.einnahmen, f.name + ': Einnahmen');
    const aus = Object.fromEntries(b.gruppen.filter(g => g.betrag).map(g => [g.key, g.betrag]));
    assert.deepEqual(aus, s.ausgaben, f.name + ': Ausgaben');
  }
  const b = R.jahresbericht(V.bereinigen(Object.assign({ id: 'L' }, FAELLE.jahresbericht[0].liegenschaft)), 2025);
  assert.deepEqual(b.verschoben.map(x => [x.datum, x.jahr]), [['2024-12-28', 2025], ['2025-12-29', 2026]]);
  assert.equal(b.lohn35a, 500);
  const av = R.anlageV(b);
  assert.equal(av.find(z => /Wohnungen \(ohne/.test(z.text)).betrag, 9600);
  assert.ok(av.some(z => z.abschnitt === 'Vom Eigentümer zu ergänzen' && /AfA/.test(z.text)));
  // laufendes Jahr: nur bis zum Stichtag
  const lf = R.jahresbericht(V.bereinigen(Object.assign({ id: 'L' }, FAELLE.jahresbericht[0].liegenschaft)), 2025, { stichtag: '2025-06-30' });
  assert.ok(lf.vorlaeufig); assert.equal(lf.vertraege[0].sollGesamt, 6000); assert.equal(lf.summeEin, 6000);
});

test('Dokumente: Kategorie aus dem Namen, Energieausweis zehn Jahre, Fristen, Bereinigung', () => {
  assert.equal(D.kategorieVorschlag('Energieausweis_2024.pdf'), 'energieausweis');
  assert.equal(D.kategorieVorschlag('Mietvertrag Muster W1.pdf'), 'mietvertrag');
  assert.equal(D.kategorieVorschlag('Grundsteuerbescheid 2025.pdf'), 'bescheid');
  assert.equal(D.kategorieVorschlag('Foto.jpg'), 'sonstig');
  assert.equal(D.gueltigVorschlag('energieausweis', '2024-05-10'), '2034-05-09');
  assert.equal(D.gueltigVorschlag('mietvertrag', '2024-05-10'), null);
  const l = V.bereinigen({ id: 'L', einheiten: [{ id: 'e1', nr: 'W1' }], dokumente: [
    { id: 'd1', anhangId: 'A1', titel: 'Energieausweis', kategorie: 'energieausweis', datum: '2016-10-01', gueltigBis: '2026-09-30', einheitId: 'e1' },
    { id: 'd2', anhangId: 'A2', titel: 'Police', kategorie: 'versicherung', gueltigBis: '2026-11-15', einheitId: 'gibtsnicht' },
    { id: 'd3', titel: 'ohne Anhang' }, { id: 'd4', anhangId: '<x>', titel: 'kaputt' }] });
  assert.equal(l.dokumente.length, 2); assert.equal(l.dokumente[1].einheitId, null);
  const fr = D.fristen(l, '2026-10-01', 60);
  assert.deepEqual(fr.map(f => [f.titel, f.faellig]), [['Dokument abgelaufen: Energieausweis', true], ['Dokument läuft ab: Police', false]]);
});
