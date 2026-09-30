/* Rechenkern: Bausteine, Zahlenformate, Grenzfälle und die bisherigen Referenzfälle.
   Sollwerte stammen aus Handrechnung bzw. unabhängiger Rechnung in Python (Werte als Zahlen eingetragen,
   nicht mit der Implementierung berechnet). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { K, leser, nahe } from './hilfen.mjs';

const fall = n => JSON.parse(readFileSync(new URL('../fixtures/' + n, import.meta.url), 'utf8'));

test('Zahlen lesen: deutsche Formate, Beträge und Faktoren', () => {
  const faelle = [
    ['450.000', true, 450000, 'Betrag mit Tausenderpunkt'],
    ['450.000', false, 450, 'Faktorfeld: einzelner Punkt bleibt Dezimalpunkt'],
    ['1.234,56', true, 1234.56, 'Tausenderpunkt und Komma'],
    ['1.234,56', false, 1234.56, 'Komma entscheidet auch im Faktorfeld'],
    ['1.406', false, 1.406, 'Umrechnungsfaktor 1.406'],
    ['0,082', true, 0.082, 'Erlös 0,082 €/kWh'],
    ['0.082', true, 0.082, 'führende 0 bleibt dezimal'],
    ['1.234.567', false, 1234567, 'mehrere Punkte = Tausender'],
    ['1.234.567,89', true, 1234567.89, 'Millionen mit Komma'],
    ['450 000 €', true, 450000, 'Leerzeichen und Einheit'],
    ['12,5 %', false, 12.5, 'Prozentzeichen'],
    ['3.5', false, 3.5, 'Dezimalpunkt im Zinsfeld'],
    ['-3.000', true, -3000, 'Minus mit Bindestrich'],
    ['−3.000', true, -3000, 'typografisches Minus (U+2212)'],
    ['– 2.500 €', true, -2500, 'Gedankenstrich als Minus'],
    ['ca. 1978', false, 1978, 'Text davor'],
    ['', true, 0, 'leer'],
    ['abc', true, 0, 'keine Zahl → 0 (wird von der Eingabeprüfung gemeldet)'],
    [null, true, 0, 'null'],
    [42, false, 42, 'bereits Zahl'],
    [Infinity, false, 0, 'unendlich → 0']
  ];
  for (const [s, b, soll, text] of faelle) assert.equal(K.zahlLesen(s, b), soll, text + ' („' + s + '“)');
});

test('Barwertfaktor (Anlage 1 ImmoWertV) inklusive Zins 0 % und Laufzeit 0', () => {
  nahe(assert, K.barwertfaktor(5, 20), 12.462210, 1e-6, '5 % / 20 J');
  nahe(assert, K.barwertfaktor(5, 60), 18.929290, 1e-6, '5 % / 60 J');
  nahe(assert, K.barwertfaktor(3, 50), 25.729764, 1e-6, '3 % / 50 J');
  assert.equal(K.barwertfaktor(0, 20), 20, 'Zins 0 % → Anzahl der Jahre');
  assert.equal(K.barwertfaktor(-1, 20), 20, 'negativer Zins → Anzahl der Jahre');
  assert.equal(K.barwertfaktor(5, 0), 0, 'Laufzeit 0');
  assert.equal(K.barwertfaktor(5, -3), 0, 'negative Laufzeit');
});

test('Restnutzungsdauer nach Anlage 2 ImmoWertV', () => {
  nahe(assert, K.computeRND(41, 80, 7), 43.98717, 1e-4, '7 Punkte, Alter 41');
  nahe(assert, K.computeRND(42, 80, 7), 43.346275, 1e-6, '7 Punkte, Alter 42');
  nahe(assert, K.computeRND(121, 80, 8), 38.40625, 1e-6, 'Gutachten ALEX99: 8 Punkte, Alter 121');
  assert.equal(K.computeRND(20, 80, 0), 60, 'relatives Alter 25 % < 60 % → GND − Alter');
  assert.equal(K.computeRND(48, 80, 0), 32, 'relatives Alter genau 60 % → GND − Alter');
  nahe(assert, K.computeRND(60, 80, 0), 20.75, 1e-9, '0 Punkte, Alter 60 → Formel');
  nahe(assert, K.computeRND(60, 80, 25), 57.96, 1e-9, 'mehr als 20 Punkte zählen wie 20');
  nahe(assert, K.computeRND(60, 80, -3), 20.75, 1e-9, 'negative Punkte zählen wie 0');
  assert.equal(K.computeRND(0, 80, 5), 80, 'Neubau');
  assert.equal(K.computeRND(30, 0, 5), 0, 'GND 0');
  assert.equal(K.computeRND(176, 80, 0), 80, 'Alter weit über GND: Formel steigt wieder, auf GND begrenzt (siehe Eingabeprüfung)');
});

test('Interpolation der Standardstufen und NHK-Basiswerte', () => {
  const b = [655, 725, 835, 1005, 1260];
  assert.equal(K.interp(b, 3), 835);
  assert.equal(K.interp(b, 3.5), 920);
  assert.equal(K.interp(b, 0.5), 655);
  assert.equal(K.interp(b, 6), 1260);
  assert.deepEqual(K.nhkBasis('655, 725, 835, 1005, 1260'), b);
  assert.deepEqual(K.nhkBasis('655; 725; 835'), [615, 685, 785, 945, 1180], 'unvollständig → Rückfallwerte');
});

test('Effizienzklassen nach Kennwert', () => {
  assert.equal(K.enKlasseAusKennwert(30), 'A+');
  assert.equal(K.enKlasseAusKennwert(131), 'E');
  assert.equal(K.enKlasseAusKennwert(250), 'G');
  assert.equal(K.enKlasseAusKennwert(251), 'H');
});

test('Keine erfundene Restlebenserwartung aus Alter allein',()=>{for(const age of [0,65,74,81,110])assert.equal(K.restLeben(age,'w'),0);});

test('Referenzbewertung Wohnhaus (Sollwerte aus dem Selbsttest, unabhängig nachgerechnet)', () => {
  const { R } = K.bewerte(leser(fall('fall_haus.json')), { jahr: 2026 });
  nahe(assert, R.bodenwert, 247000, 0.5, 'Bodenwert');
  nahe(assert, R.erRND, 43.98717, 1e-4, 'Restnutzungsdauer');
  nahe(assert, R.vf, 26.49957, 1e-4, 'Vervielfältiger');
  nahe(assert, R.ertrag, 378464.38, 1, 'Ertragswert');
  nahe(assert, R.substanz, 598367.35, 1, 'Sachwert');
  nahe(assert, R.mittel, 488415.86, 1, 'gewichteter Mittelwert');
  nahe(assert, R.pvWert, 21185.76, 0.5, 'PV-Barwert');
  nahe(assert, R.energieWert, -36631.19, 1, 'Energie Klasse G gegen D');
  nahe(assert, R.empfehlung, 472970.43, 1, 'Preisempfehlung');
  nahe(assert, R.bwErtrag, 263323.44, 1, 'BelWertV Ertragswert');
  nahe(assert, R.bwSachwert, 389054.10, 1, 'BelWertV Sachwert');
  nahe(assert, R.beleihungswert, 263323.44, 1, 'Beleihungswert');
});

test('Referenzbewertung Eigentumswohnung', () => {
  const { R } = K.bewerte(leser(fall('fall_etw.json')), { jahr: 2026 });
  nahe(assert, R.vergleichWert, 304200, 0.5, 'Vergleichswert');
  nahe(assert, R.erRND, 50, 1e-9, 'Restnutzungsdauer 80 − 30');
  nahe(assert, R.vf, 25.72976, 1e-4, 'Vervielfältiger');
  nahe(assert, R.ertrag, 173398.03, 1, 'Ertragswert');
  nahe(assert, R.empfehlung, 238799.01, 1, 'Preisempfehlung');
});

test('Alter bezieht sich auf das Stichtagsjahr (§ 4 Abs. 1 ImmoWertV)', () => {
  const felder = fall('fall_haus.json');
  const a = K.bewerte(leser(felder), { jahr: 2026 }).R, b = K.bewerte(leser(felder), { jahr: 2027 }).R;
  nahe(assert, a.erRND, 43.98717, 1e-4, 'Stichtag 2026 → Alter 41');
  nahe(assert, b.erRND, 43.346275, 1e-6, 'Bezugsjahr 2027 → Alter 42');
  assert.ok(a.empfehlung !== b.empfehlung, 'das Bezugsjahr wirkt auf das Ergebnis');
});

test('Höchst-Restnutzungsdauer im Beleihungswert je Objektart (Anlage 2 BelWertV)', () => {
  const f = { bw_aktiv: true, bw_objektart: '60', bw_rnd: 70, bw_roh: 50000, bw_bewirt: 15, bw_zins: 5, bw_bodenwert: 100000, bw_ansatz: 'ertrag', bw_nutzung: 'gewerbe' };
  const { R } = K.bewerte(leser(f), { jahr: 2026 });
  assert.equal(R.bwRnd, 60, 'Geschäftshaus: 70 J auf 60 J gekürzt');
  nahe(assert, R.bwErtrag, 809848.36, 0.01, '(42.500 − 5.000) × 18,929290 + 100.000');
  const w = K.bewerte(leser(Object.assign({}, f, { bw_objektart: '80' })), { jahr: 2026 }).R;
  assert.equal(w.bwRnd, 70, 'Wohnhaus: 70 J bleiben');
});

test('Leere Eingaben: keine NaN, Empfehlung 0', () => {
  const { R } = K.bewerte(leser({}), { jahr: 2026 });
  for (const [k, v] of Object.entries(R)) if (typeof v === 'number') assert.ok(Number.isFinite(v) || v === null, k + ' ist ' + v);
  assert.equal(R.empfehlung, 0);
  assert.equal(R.g, 0.5, 'fehlende Gewichtung → 50 : 50');
});

test('Extreme Werte bleiben endlich', () => {
  const f = { ek_modus: 'haus', ek_gs_flaeche: 1e7, ek_brw: 1e5, ek_baujahr: 1500, ek_miete_wohnen: 1e9, bgfhg_e0: 1e6,
    nhkhg_base: '655, 725, 835, 1005, 1260', er_bewirt: 20, er_zins_basis: 0.01, gewichtung: '0.5' };
  const { R } = K.bewerte(leser(f), { jahr: 2026 });
  for (const k of ['bodenwert', 'substanz', 'ertrag', 'mittel', 'empfehlung']) assert.ok(Number.isFinite(R[k]), k + ' endlich');
});

test('Finanzierung: Referenzfall und Grenzfälle (Zins 0 %, keine Tilgung, Betrag 0)', () => {
  const a = K.finTilgungsverlauf(362280, 3.5, 2, 0, 60);
  nahe(assert, a.rate, 1660.45, 0.01, 'Monatsrate');
  nahe(assert, a.restNach(10), 275675.45, 0.5, 'Restschuld nach 10 Jahren');
  nahe(assert, a.zinsBis(10), 112649.45, 0.5, 'Zinsen in 10 Jahren');
  assert.equal(a.monate, 348, 'Laufzeit 29 Jahre');
  const b = K.finTilgungsverlauf(362280, 3.5, 2, 5000, 60);
  assert.equal(b.monate, 247, 'mit 5.000 € Sondertilgung 20 J 7 M');
  nahe(assert, b.zinsSumme, 146959.76, 0.5, 'Zinsen gesamt mit Sondertilgung');
  const null0 = K.finTilgungsverlauf(120000, 0, 2, 0, 60);
  nahe(assert, null0.rate, 200, 1e-9, 'Zins 0 %: nur Tilgung');
  assert.equal(null0.monate, 600, 'Zins 0 %: 50 Jahre');
  nahe(assert, null0.zinsSumme, 0, 1e-9, 'Zins 0 %: keine Zinsen');
  const ohne = K.finTilgungsverlauf(120000, 3.5, 0, 0, 60);
  assert.equal(ohne.tilgt, false, 'ohne Tilgung wird nie getilgt');
  nahe(assert, ohne.restNach(10), 120000, 1e-6, 'Restschuld bleibt');
  assert.equal(K.finTilgungsverlauf(0, 3.5, 2, 0, 60).rate, 0, 'Betrag 0');
});

test('Budget-Check', () => {
  const c = K.finBudgetRechnen({ netto: 4500, erw: 2, pErw: 1000, wohnen: 350, puffer: 150, zins: 3.5, tilgung: 2, nkPct: 10.57, ek: 80000 });
  nahe(assert, c.rate, 2000, 1e-9, 'tragbare Rate');
  nahe(assert, c.darlehen, 436363.64, 0.01, 'Darlehen');
  nahe(assert, c.maxKp, 467001.57, 0.01, 'Kaufpreis nach Nebenkosten');
  const z = K.finBudgetRechnen({ netto: 1500, erw: 2, pErw: 1000 });
  assert.equal(z.darlehen, 0, 'keine tragbare Rate → kein Darlehen');
  assert.equal(z.maxKp, 0);
});

test('Investitionsrechnung (Sollwerte aus unabhängiger Python-Rechnung)', () => {
  nahe(assert, K.ivIrr([-100, 10, 110]), 0.10, 1e-9, 'interner Zinsfuß');
  assert.equal(K.ivIrr([-100, -10, -5]), null, 'ohne Vorzeichenwechsel kein Zinsfuß');
  assert.deepEqual([1910, 1985, 2024].map(K.ivAfaSatz), [2.5, 2, 3], 'AfA-Satz nach § 7 Abs. 4 EStG');
  const M = K.ivModell({ kp: 1000000, nk: 105700, san: 0, roh: 60000, kosten: 12000, ek: 305700, zins: 3.8, tilg: 2, jahre: 10,
    mietPa: 1.5, kostenPa: 2, wertPa: 1, verkaufPct: 3, gebAnteil: 0.75, afa: 2, steuer: 35 });
  nahe(assert, M.jahre[0].cfVor, 1600, 0.01, 'Cashflow 1. Jahr vor Steuern');
  nahe(assert, M.jahre[0].cfNach, 1146.35, 0.01, 'Cashflow 1. Jahr nach Steuern');
  nahe(assert, M.restN, 605723.41, 0.5, 'Restschuld nach 10 Jahren');
  nahe(assert, M.irrNach * 100, 4.8384, 0.001, 'Eigenkapitalrendite nach Steuern');
  nahe(assert, M.irrGesamt * 100, 4.3437, 0.001, 'Gesamtkapitalrendite');
  const kurz = K.ivModell({ kp: 1000000, nk: 105700, roh: 60000, kosten: 12000, ek: 305700, zins: 3.8, tilg: 2, jahre: 5, wertPa: 3, verkaufPct: 3, gebAnteil: 0.75, afa: 2, steuer: 35 });
  assert.equal(kurz.frei, false, 'Verkauf nach 5 Jahren nicht steuerfrei (§ 23 EStG)');
  assert.ok(kurz.steuerVerk > 0, 'Steuer auf den Veräußerungsgewinn');
});

test('Eingabeprüfung: gültige und ungültige Zahlen', () => {
  for (const s of ['450.000', '1.234,56', '1.406', '0,082', '-3.000', '− 2.500 €', '12,5 %', 'ca. 1978', '450 000 €', '', '0'])
    assert.equal(K.zahlGueltig(s), true, '„' + s + '“ gültig');
  for (const s of ['abc', '1e5', '12-15', '12.34.56', '2. OG', 'zwölf'])
    assert.equal(K.zahlGueltig(s), false, '„' + s + '“ ungültig');
});

test('Eingabeprüfung: Status für gültige, fehlerhafte und unvollständige Bewertungen', () => {
  const pruefe = f => { const e = leser(f), p = K.protokollLeser(e), { R, D } = K.bewerte(p.leser, { jahr: 2026 }); return K.pruefen(e, R, D, p.gelesen); };
  const haus = fall('fall_haus.json');
  assert.equal(pruefe(haus).status, 'ok', 'Referenzfall Wohnhaus ist gültig');
  assert.equal(pruefe(fall('fall_etw.json')).status, 'ok', 'Referenzfall Wohnung ist gültig');
  const text = pruefe(Object.assign({}, haus, { ek_brw: 'abc' }));
  assert.equal(text.status, 'fehler');
  assert.ok(text.hinweise.some(h => h.feld === 'ek_brw' && h.art === 'zahl'));
  const neg = pruefe(Object.assign({}, haus, { ek_wohnflaeche: '-145', ek_gs_abschlag: '120' }));
  assert.ok(neg.hinweise.some(h => h.feld === 'ek_wohnflaeche' && h.art === 'negativ'));
  assert.ok(neg.hinweise.some(h => h.feld === 'ek_gs_abschlag' && h.art === 'prozent'));
  const leer = pruefe({});
  assert.equal(leer.status, 'unvollstaendig');
  assert.deepEqual(leer.fehlend.map(f=>f.feld),['ek_gs_flaeche','bgfhg_e0','ek_miete_wohnen','gewichtung_begruendung','pq_sf_quelle','pq_bpi_quelle','bpi','pq_brw_quelle','pq_lz_quelle','pq_miete_quelle','pq_bw_quelle','pq_modell_geprueft','ek_stichtag']);
  const nhk = pruefe(Object.assign({}, haus, { nhkhg_base: '655, 725, 835, 1.005, 1.260' }));
  assert.ok(nhk.hinweise.some(h => h.art === 'nhk'), 'Tausenderpunkt in den Kostenkennwerten wird erkannt');
  const alt = pruefe(Object.assign({}, haus, { ek_baujahr: '1850' }));
  assert.ok(alt.hinweise.some(h => h.art === 'rnd'), 'Alter über GND wird gemeldet');
  const altManuell = pruefe(Object.assign({}, haus, { ek_baujahr: '1850', nhkhg_rnd: '15' }));
  assert.ok(!altManuell.hinweise.some(h => h.art === 'rnd'), 'von Hand gesetzte RND: kein Hinweis');
});
