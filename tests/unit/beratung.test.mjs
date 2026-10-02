/* Beratungswerkzeuge (js/beratung.js, D38): Sollwerte aus Handrechnung nach Gesetzestext (Zahlen eingetragen, nicht mit
   der Implementierung berechnet) und unabhängige Nachrechnung in Python (tests/referenz/beratung.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { nahe } from './hilfen.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const require_ = createRequire(import.meta.url);
const B = require_('../../js/beratung.js');
const K = require_('../../js/kern.js');
const PY = pythonMit('json');

test('Erbschaftsteuer § 19 ErbStG: Sätze, Abrundung auf 100 €, Härteausgleich', () => {
  assert.equal(B.erbstSteuer(500000, 1).steuer, 75000, 'Klasse I, 15 %');
  const h = B.erbstSteuer(310000, 1);   // 300.000 × 11 % = 33.000 + ½ × 10.000 = 38.000 statt 46.500
  assert.equal(h.steuer, 38000); assert.equal(h.haerteausgleich, true);
  assert.equal(B.erbstSteuer(80000, 2).steuer, 13750, 'Klasse II: 75.000 × 15 % + ½ × 5.000');
  assert.equal(B.erbstSteuer(6100000, 3).steuer, 1875000, 'Klasse III über 30 %: ¾ des übersteigenden Betrags');
  assert.equal(B.erbstSteuer(75099, 1).steuer, 5250, '75.099 → 75.000 (volle 100 €) × 7 %');
  assert.equal(B.erbstSteuer(0, 1).steuer, 0);
  assert.equal(B.erbstSteuer(-5, 2).steuer, 0);
});

test('Steuerklassen und Freibeträge §§ 15, 16 ErbStG', () => {
  assert.deepEqual([B.klasseFuer('kind', 'schenkung'), B.freibetragFuer('kind', 'schenkung')], [1, 400000]);
  assert.deepEqual([B.klasseFuer('ehegatte', 'erbe'), B.freibetragFuer('ehegatte', 'erbe')], [1, 500000]);
  assert.deepEqual([B.klasseFuer('enkel', 'schenkung'), B.freibetragFuer('enkel', 'schenkung')], [1, 200000]);
  assert.deepEqual([B.klasseFuer('enkel_kv', 'erbe'), B.freibetragFuer('enkel_kv', 'erbe')], [1, 400000]);
  assert.deepEqual([B.klasseFuer('eltern', 'schenkung'), B.freibetragFuer('eltern', 'schenkung')], [2, 20000], 'Eltern bei Schenkung: Klasse II');
  assert.deepEqual([B.klasseFuer('eltern', 'erbe'), B.freibetragFuer('eltern', 'erbe')], [1, 100000], 'Eltern bei Erbe: Klasse I');
  assert.deepEqual([B.klasseFuer('nichte', 'erbe'), B.freibetragFuer('nichte', 'erbe')], [2, 20000]);
  assert.deepEqual([B.klasseFuer('sonstige', 'erbe'), B.freibetragFuer('sonstige', 'erbe')], [3, 20000]);
});

test('Schenkung an ein Kind: ein Schenker oder Eltern je zur Hälfte (zwei Freibeträge)', () => {
  const basis = { art: 'schenkung', wert: 900000, nutzung: 'sonstig', empfaenger: [{ verhaeltnis: 'kind', anteil: 100 }], vorbehalt: 'keiner' };
  assert.equal(B.uebertragung(basis).steuer, 75000, '900.000 − 400.000 = 500.000 × 15 %');
  const zwei = B.uebertragung({ ...basis, zweiSchenker: true });
  assert.equal(zwei.steuer, 7000, 'je Elternteil 450.000 − 400.000 = 50.000 × 7 % = 3.500');
  assert.equal(zwei.empfaenger[0].teile.length, 2);
  const halb = B.uebertragung({ ...basis, uebertragAnteil: 50 });
  assert.equal(halb.wert, 450000); assert.equal(halb.steuer, 3500);
});

test('Vervielfältiger 2026 = Tabelle des BMF-Schreibens vom 21.10.2025; Verfahren Zeitrente über die Lebenserwartung', () => {
  const f = JSON.parse(readFileSync(new URL('../fixtures/bmf-vervielfaeltiger-2026.json', import.meta.url), 'utf8')).alter;
  for (const [a, w] of Object.entries(f)) {
    assert.equal(B.vervielfaeltigerBewG(+a, 'm', null, 2026), w[1], 'Männer ' + a);
    assert.equal(B.vervielfaeltigerBewG(+a, 'w', null, 2026), w[3], 'Frauen ' + a);
    assert.equal(B.zeitrenteBewG(w[0]), w[1], 'Verfahren Männer ' + a);
  }
  assert.equal(B.vervielfaeltigerBewG(60, 'm', null, 2026), 12.798, 'Mann 60 laut Tabelle');
  assert.equal(B.vervielfaeltigerBewG(104, 'w', null, 2026), 1.897, 'ab 100 der letzte Tabellenwert');
  assert.match(B.vervielfaeltigerQuelle(2026), /21\.10\.2025/);
  assert.match(B.vervielfaeltigerQuelle(2027), /Verfahren des BMF/);
  // Handrechnung: 21,58 Jahre, 1,055^-21,58 = 0,31492 → nachschüssig 12,456, vorschüssig 13,141, Mittel 12,798
  nahe(assert, B.zeitrenteBewG(21.58), 12.798, 0.0005, 'Zeitrente 21,58 Jahre');
});

test('Vorbehaltsnießbrauch: Kapitalwert = Jahreswert × Vervielfältiger, Jahreswert höchstens Wert / 18,6 (§§ 14, 16 BewG)', () => {
  const r = B.uebertragung({ art: 'schenkung', wert: 600000, nutzung: 'sonstig', empfaenger: [{ verhaeltnis: 'kind', anteil: 1 }],
    vorbehalt: 'niessbrauch', jahreswert: 24000, personen: [{ alter: 70, g: 'w' }], vManuell: 10 });
  assert.equal(r.recht.kapitalwert, 240000);
  assert.equal(r.empfaenger[0].bereicherung, 360000);
  assert.equal(r.steuer, 0, '360.000 unter dem Freibetrag');
  const k = B.kapitalwertNutzung({ steuerwert: 186000, jahreswert: 20000, personen: [], vManuell: 8 });
  assert.equal(k.jahreswert, 10000, '186.000 / 18,6'); assert.equal(k.begrenzt, true); assert.equal(k.kapitalwert, 80000);
  // zwei Berechtigte, Recht erlischt mit dem Letztversterbenden: der höhere Vervielfältiger (§ 14 Abs. 3 BewG)
  const z = B.kapitalwertNutzung({ steuerwert: 1e6, jahreswert: 10000, personen: [{ alter: 70, g: 'm' }, { alter: 66, g: 'w' }] });
  assert.equal(z.vervielfaeltiger, Math.max(B.vervielfaeltigerBewG(70, 'm'), B.vervielfaeltigerBewG(66, 'w')));
  assert.ok(B.vervielfaeltigerBewG(66, 'w') > B.vervielfaeltigerBewG(70, 'm'));
  // beim Erbe gibt es keinen Vorbehalt
  assert.equal(B.uebertragung({ art: 'erbe', wert: 600000, empfaenger: [{ verhaeltnis: 'kind', anteil: 1 }], vorbehalt: 'niessbrauch', jahreswert: 24000, vManuell: 10 }).recht, null);
});

test('Familienheim § 13 Abs. 1 Nr. 4a–4c und vermietete Wohnimmobilie § 13d ErbStG', () => {
  const fh = { nutzung: 'familienheim', vorbehalt: 'keiner' };
  assert.equal(B.uebertragung({ ...fh, art: 'schenkung', wert: 2e6, empfaenger: [{ verhaeltnis: 'ehegatte', anteil: 1 }] }).steuer, 0, '4a: Schenkung an Ehegatten steuerfrei');
  assert.equal(B.uebertragung({ ...fh, art: 'erbe', wert: 2e6, empfaenger: [{ verhaeltnis: 'ehegatte', anteil: 1, selbstnutzung: true }] }).steuer, 0, '4b');
  const ohne = B.uebertragung({ ...fh, art: 'erbe', wert: 2e6, empfaenger: [{ verhaeltnis: 'ehegatte', anteil: 1, selbstnutzung: false }] });
  assert.equal(ohne.empfaenger[0].familienheimFrei, 0, 'ohne Selbstnutzung keine Befreiung');
  // 4c: 250 m² → 200/250 steuerfrei; 3.000.000 × 0,2 = 600.000 − 400.000 = 200.000 × 11 % = 22.000
  const kind = B.uebertragung({ ...fh, art: 'erbe', wert: 3e6, wohnflaeche: 250, empfaenger: [{ verhaeltnis: 'kind', anteil: 1, selbstnutzung: true }] });
  assert.equal(kind.empfaenger[0].familienheimFrei, 0.8); assert.equal(kind.steuer, 22000);
  assert.equal(B.uebertragung({ ...fh, art: 'schenkung', wert: 3e6, wohnflaeche: 120, empfaenger: [{ verhaeltnis: 'kind', anteil: 1, selbstnutzung: true }] }).empfaenger[0].familienheimFrei, 0, '4c nur von Todes wegen');
  // § 13d: 1.000.000 × 90 % − 20.000 = 880.000 × 30 % (Klasse II) = 264.000
  assert.equal(B.uebertragung({ art: 'schenkung', wert: 1e6, nutzung: 'vermietet', vorbehalt: 'keiner', empfaenger: [{ verhaeltnis: 'nichte', anteil: 1 }] }).steuer, 264000);
});

test('Vorerwerbe der letzten 10 Jahre, 50-%-Grenze (§ 14 ErbStG) und Kleinbetrag (§ 22 ErbStG)', () => {
  // Kind: 300.000 vor, jetzt 400.000 → 700.000 − 400.000 = 300.000 × 11 % = 33.000; fiktive Steuer auf den Vorerwerb 0
  assert.equal(B.erwerbSteuer(400000, 300000, 0, 1, 400000).steuer, 33000);
  // tatsächlich gezahlte höhere Vorsteuer wird abgezogen
  assert.equal(B.erwerbSteuer(400000, 300000, 5000, 1, 400000).steuer, 28000);
  // Klasse III: 6.000.000 vor (5.980.000 × 30 % = 1.794.000), jetzt 100.000: 1.860.000 − 1.794.000 = 66.000 → höchstens 50.000
  const k = B.erwerbSteuer(100000, 6000000, 0, 3, 20000);
  assert.equal(k.steuerGesamt, 1860000); assert.equal(k.abzugVorerwerb, 1794000); assert.equal(k.steuer, 50000); assert.equal(k.kappung, true);
  // Mindeststeuer § 14 Abs. 1 Satz 4: Ehegatte, jetzt 650.000, vorher 1.000.000 mit 210.000 € gezahlter Steuer
  // 1.650.000 − 500.000 = 1.150.000 × 19 % = 218.500 − 210.000 = 8.500 < 150.000 × 11 % = 16.500 (letzter Erwerb allein)
  const m = B.erwerbSteuer(650000, 1000000, 210000, 1, 500000);
  assert.equal(m.steuerGesamt, 218500); assert.equal(m.mindeststeuer, 16500); assert.equal(m.steuer, 16500); assert.equal(m.mindestGreift, true);
  assert.equal(B.erwerbSteuer(400000, 300000, 0, 1, 400000).mindestGreift, false);
  const klein = B.erwerbSteuer(20100, 0, 0, 3, 20000);   // 100 € × 30 % = 30 €
  assert.equal(klein.steuer, 0); assert.equal(klein.kleinbetrag, true);
});

test('Python-Gegenrechnung: Vervielfältiger (§ 14 BewG), Leibrenten, Lebenserwartung, Steuertabelle', { skip: !PY && !process.env.CI && 'Python fehlt' }, () => {
  const soll = pythonJson(PY || 'python', ['tests/referenz/beratung.py']);
  assert.equal(soll.vervielfaeltiger.length, 20);
  // Jahre ohne eingebaute BMF-Tabelle: Verfahren des BMF mit der Lebenserwartung der eingebauten Sterbetafel
  for (const f of soll.vervielfaeltiger) assert.equal(B.vervielfaeltigerBewG(f.alter, f.geschlecht, null, 2027), f.v, f.alter + ' ' + f.geschlecht);
  // Verfahren belegt: jeder Wert der BMF-Tabelle 2026 folgt aus der dort genannten Lebenserwartung
  assert.equal(soll.bmf2026.length, 101);
  for (const z of soll.bmf2026) { assert.equal(z.vm_neu, z.vm, 'BMF Männer ' + z.alter); assert.equal(z.vw_neu, z.vw, 'BMF Frauen ' + z.alter); }
  for (const r of soll.renten) {
    nahe(assert, B.rentenfaktor(r.personen, r.zins, r.garantie), r.faktor, 1e-9, 'Rentenfaktor ' + JSON.stringify(r.personen));
    nahe(assert, B.lebenserwartung(r.personen), r.e, 1e-9, 'Lebenserwartung ' + JSON.stringify(r.personen));
  }
  for (const s of soll.steuer) assert.equal(B.erbstSteuer(s.erwerb, s.klasse).steuer, s.steuer, s.erwerb + ' Klasse ' + s.klasse);
});

test('Leibrente: nah am Faktor des Rechenkerns (Woolhouse), Garantiezeit erhöht, zweite Person erhöht', () => {
  const f = B.rentenfaktor([{ alter: 70, g: 'm' }], 3, 0);
  assert.ok(Math.abs(f - K.leibrentenfaktor(70, 'm', 3)) < 0.01, 'monatlich genau vs. Woolhouse: ' + f);
  assert.ok(B.rentenfaktor([{ alter: 70, g: 'm' }], 3, 10) > f);
  assert.ok(B.rentenfaktor([{ alter: 70, g: 'm' }, { alter: 68, g: 'w' }], 3, 0) > B.rentenfaktor([{ alter: 68, g: 'w' }], 3, 0));
  assert.ok(Math.abs(B.lebenserwartung([{ alter: 70, g: 'w' }]) - B.restLeben(70, 'w')) < 0.6, 'Lebenserwartung wie Sterbetafel (± halbes Jahr)');
  assert.equal(B.rentenfaktor([], 3, 0), 0);
});

test('Wohnen im Alter: Einmalzahlung = Wert − Wohnrecht, Rente aus derselben Summe, Erben nach Wertsteigerung', () => {
  const o = { wert: 500000, miete: 1000, personen: [{ alter: 75, g: 'w' }], zins: 3, abschlag: 0, garantie: 0, teilAnteil: 50, teilEntgelt: 5, teilGebuehr: 3,
    kreditZins: 3.5, rueckKosten: 0, wertsteigerung: 2 };
  const r = B.verrentung(o);
  nahe(assert, r.wohnrecht, 12000 * r.fLeben, 1e-6, 'Wohnrecht');
  nahe(assert, r.auszahlung, 500000 - r.wohnrecht, 1e-6, 'Einmalzahlung');
  nahe(assert, r.rente * 12 * r.fGarantie, r.auszahlung, 1e-6, 'Rente aus der Einmalzahlung');
  const teil = r.wege.find(w => w.id === 'teil');
  assert.equal(teil.sofort, 250000); nahe(assert, -teil.monatlich, 250000 * 0.05 / 12, 1e-9, 'Nutzungsentgelt');
  nahe(assert, teil.erben, 0.5 * r.wertEnde - 0.03 * r.wertEnde, 1e-6, 'Erben beim Teilverkauf');
  nahe(assert, r.wege.find(w => w.id === 'behalten').erben, 500000 * Math.pow(1.02, r.n), 1e-6, 'Behalten');
  assert.equal(r.wege.find(w => w.id === 'rueck').monatlich, -1000, 'Rückmiete = ortsübliche Miete, wenn nichts eingetragen');
  // Kredit mit Grundschuld über denselben Betrag wie der Teilverkauf: 250.000 × 3,5 % / 12
  const kredit = r.wege.find(w => w.id === 'kredit');
  assert.equal(kredit.sofort, 250000); nahe(assert, kredit.monatlich, -250000 * 0.035 / 12, 1e-9, 'Zinsen im Monat');
  nahe(assert, kredit.erben, r.wertEnde - 250000, 1e-6, 'Erben: Wert minus Kredit');
  assert.ok(kredit.erben > teil.erben, 'bei 2 % Wertsteigerung bleibt den Erben mit dem Kredit mehr als beim Teilverkauf');
});

test('Grundstückspotenzial: Residualwert nach Handrechnung', () => {
  const r = B.residualwert({ grundstueck: 1000, gfz: 0.8, wfFaktor: 75, verkaufM2: 5000, stellplaetze: 6, stellplatzPreis: 20000, baukostenM2: 3000,
    baunebenkosten: 20, abriss: 40000, erschliessung: 0, zins: 6, bauzeitMonate: 18, vermarktungMonate: 6, vermarktung: 3, wagnis: 15,
    erwerbsnebenkosten: 6.5, wartezeitJahre: 1, bodenrichtwert: 300 });
  assert.equal(r.geschossflaeche, 800); assert.equal(r.wohnflaeche, 600); assert.equal(r.erloes, 3120000);
  nahe(assert, r.finanzierungBau, 99000, 1e-6, 'Bauzinsen'); nahe(assert, r.kosten, 2860600, 1e-6, 'Kosten');
  nahe(assert, r.residual, 259400, 1e-6, 'Residuum');
  nahe(assert, r.bodenwert, 259400 / (1.065 * 1.12), 1e-6, 'Grundstückspreis zum Baubeginn');
  nahe(assert, r.heute, 259400 / (1.065 * 1.12) / 1.06, 1e-6, 'heute');
  nahe(assert, r.abweichungBRW, (r.heute - 300000) / 300000 * 100, 1e-9, 'gegen Bodenrichtwert');
  const s = B.residualSpanne({ grundstueck: 1000, gfz: 0.8, wfFaktor: 75, verkaufM2: 5000, baukostenM2: 3000, zins: 6 });
  assert.ok(s.preisPlus > s.basis && s.preisMinus < s.basis && s.kostenPlus < s.basis);
});

test('ETW-Kaufcheck: Peters\'sche Formel, MEA-Anteile, Heizung nach GModG (keine Austauschpflicht mehr)', () => {
  nahe(assert, B.petersRuecklage(3000, 0.7), 39.375, 1e-9, '3.000 × 1,5 / 80 × 70 %');
  const r = B.etwCheck({ wohnflaeche: 80, mea: 85, meaGesamt: 1000, ruecklageGesamt: 200000, zufuehrungGesamt: 30000, herstellM2: 3000, anteilGE: 70 }, 2026);
  nahe(assert, r.ruecklage, 17000, 1e-9, 'Rücklage anteilig'); nahe(assert, r.rueckM2, 212.5, 1e-9, '€/m²'); nahe(assert, r.zuM2, 31.875, 1e-9, 'Zuführung');
  assert.equal(r.gesamt, 'gelb', '81 % der Peters-Zuführung');
  const alt = B.heizungPruefen({ heizArt: 'gas', heizBaujahr: 1994 }, 2026);   // 32 Jahre
  assert.equal(alt.stufe, 'warn', 'seit dem GModG kein Betriebsverbot mehr — nur Erneuerungsbedarf');
  assert.match(alt.text, /VDI 2067/); assert.match(alt.text, /§ 43 GModG/); assert.doesNotMatch(alt.text, /GEG|Betriebsverbot nach/);
  assert.equal(B.heizungPruefen({ heizArt: 'gas', heizBaujahr: 2015 }, 2026).stufe, 'ok');
  assert.equal(B.heizungPruefen({ heizArt: 'waermepumpe', heizBaujahr: 2004 }, 2026).stufe, 'warn', 'auch Wärmepumpen haben eine Nutzungsdauer');
  assert.doesNotMatch(B.heizungPruefen({ heizArt: 'waermepumpe', heizBaujahr: 2004 }, 2026).text, /§ 43/);
  assert.equal(B.heizungPruefen({ heizArt: '' }, 2026).stufe, '');
  assert.equal(B.etwCheck({ wohnflaeche: 80, mea: 85, meaGesamt: 1000, rechtsstreit: true }, 2026).gesamt, 'rot');
  const v = B.etwCheck({ wohnflaeche: 80, verwalterBis: '2027-03-31', heute: '2026-10-02' }, 2026);
  assert.ok(v.flags.some(f => /Verwaltervertrag endet am 31.3.2027/.test(f.text)), 'Verwaltervertrag endet in weniger als 12 Monaten');
  assert.equal(B.etwCheck({ wohnflaeche: 80, verwalterBis: '2028-03-31', heute: '2026-10-02' }, 2026).flags.length, 0);
});

test('Mein Jahr: Provision bei Halbteilung, gewichtete Prognose, nur Verkäufe des Jahres', () => {
  const r = B.pipeline([
    { id: 'a', status: 'Verkauft', kaufpreis: 500000, abschluss: '2026-05-01', herkunft: 'Filiale' },
    { id: 'b', status: 'Reserviert', preis: 400000, herkunft: 'Empfehlung' },
    { id: 'c', status: 'Akquise', preis: 300000 },
    { id: 'd', status: 'Verkauft', kaufpreis: 350000, abschluss: '2025-11-20' },
    { id: 'e', status: 'Zurückgezogen', preis: 900000 }
  ], { jahr: 2026, provV: 3.57, provK: 3.57, ziel: 100000 });
  nahe(assert, r.realisiert, 35700, 1e-6, '500.000 × 7,14 %');
  nahe(assert, r.offen, 28560 * 0.8 + 21420 * 0.1, 1e-6, 'gewichtet');
  nahe(assert, r.zielQuote, (35700 + 22848 + 2142) / 1000, 1e-9, 'Zielerreichung');
  assert.equal(r.zeilen.length, 4, 'Zurückgezogen zählt nicht');
  assert.equal(r.phasen.find(p => p.phase === 'Verkauft').anzahl, 1, 'Verkauf 2025 zählt nicht für 2026');
  assert.equal(r.herkunft.Filiale.anzahl, 1);
});
