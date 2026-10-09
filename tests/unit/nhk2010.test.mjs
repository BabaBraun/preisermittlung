/* NHK 2010 für Ein- und Zweifamilienhäuser, Doppel- und Reihenhäuser (D67): die Gebäudetypen der App gegen die amtliche Tabelle.
   Sollwerte: Anlage 4 ImmoWertV 2021, Teil II Nr. 1 (Grafik j2805-1_0090.jpg auf gesetze-im-internet.de) — am 09.10.2026 unabhängig
   gelesen aus drei Quellen, die in allen 36 Typen × 5 Stufen übereinstimmen: amtliche Grafik, Sachwertrichtlinie 2012 Anlage 1
   (BAnz AT 18.10.2012 B1, S. 12), Anlage 24 BewG. Die Zahlen stehen hier als Literal (nicht aus dem Code gelesen). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const U = require('../../js/uebernahme-regeln.js');

const NHK2010 = {
  '1.01': [655, 725, 835, 1005, 1260], '1.02': [545, 605, 695, 840, 1050], '1.03': [705, 785, 900, 1085, 1360],
  '1.11': [655, 725, 835, 1005, 1260], '1.12': [570, 635, 730, 880, 1100], '1.13': [665, 740, 850, 1025, 1285],
  '1.21': [790, 875, 1005, 1215, 1515], '1.22': [585, 650, 745, 900, 1125], '1.23': [920, 1025, 1180, 1420, 1775],
  '1.31': [720, 800, 920, 1105, 1385], '1.32': [620, 690, 790, 955, 1190], '1.33': [785, 870, 1000, 1205, 1510],
  '2.01': [615, 685, 785, 945, 1180], '2.02': [515, 570, 655, 790, 985], '2.03': [665, 735, 845, 1020, 1275],
  '2.11': [615, 685, 785, 945, 1180], '2.12': [535, 595, 685, 825, 1035], '2.13': [625, 695, 800, 965, 1205],
  '2.21': [740, 825, 945, 1140, 1425], '2.22': [550, 610, 700, 845, 1055], '2.23': [865, 965, 1105, 1335, 1670],
  '2.31': [675, 750, 865, 1040, 1300], '2.32': [580, 645, 745, 895, 1120], '2.33': [735, 820, 940, 1135, 1415],
  '3.01': [575, 640, 735, 885, 1105], '3.02': [480, 535, 615, 740, 925], '3.03': [620, 690, 795, 955, 1195],
  '3.11': [575, 640, 735, 885, 1105], '3.12': [505, 560, 640, 775, 965], '3.13': [585, 650, 750, 905, 1130],
  '3.21': [695, 770, 885, 1065, 1335], '3.22': [515, 570, 655, 790, 990], '3.23': [810, 900, 1035, 1250, 1560],
  '3.31': [635, 705, 810, 975, 1215], '3.32': [545, 605, 695, 840, 1050], '3.33': [690, 765, 880, 1060, 1325]
};

const BASE = readFileSync(new URL('../../src/base.js', import.meta.url), 'utf8');
const objekt = name => Function('return ' + BASE.match(new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n\\});'))[1])();
const TYPES = objekt('TYPES'), TYP_ALT = objekt('TYP_ALT');
const HAUS = { 1: /^EFH freistehend · /, 2: /^Doppel-\/Reihenendhaus · /, 3: /^Reihenmittelhaus · / };
const hausTypen = Object.entries(TYPES).filter(([k]) => /^(EFH|Doppel|Reihen)/.test(k));

test('Kostenkennwerte und Gesamtnutzungsdauer jedes Ein-, Doppel- und Reihenhaus-Typs wie NHK 2010 (Anlage 4 ImmoWertV)', () => {
  assert.equal(hausTypen.length, 33);
  for (const [k, t] of hausTypen) {
    assert.ok(t.nr, k + ': NHK-Nummer fehlt');
    for (const nr of t.nr.split('/')) assert.deepEqual(t.nhk, NHK2010[nr], k + ' (' + nr + ')');
    assert.equal(t.gnd, 80, k + ': Gesamtnutzungsdauer (Anlage 1 ImmoWertV)');
    assert.equal(t.amtlich, '1–5', k);
  }
});

test('jede NHK-Zeile 1.01–3.33 genau einmal; x.01 und x.11 (gleiche Werte) als ein Typ', () => {
  const vergeben = hausTypen.flatMap(([, t]) => t.nr.split('/'));
  assert.deepEqual(vergeben.slice().sort(), Object.keys(NHK2010).sort());
  assert.equal(new Set(vergeben).size, vergeben.length);
});

test('Bezeichnung passt zur NHK-Zeile: Hausart, Keller, Geschosse, Dach', () => {
  for (const [k, t] of hausTypen) {
    const [h, z] = t.nr.split('/')[0].split('.');
    assert.match(k, HAUS[h], k);
    const keller = z[0] === '0' || z[0] === '1', dach = z[1];
    assert.equal(/ · nicht unterkellert/.test(k), !keller, k + ': Keller');
    assert.match(k, / · (nicht )?unterkellert/, k);
    if (t.nr.includes('/')) assert.doesNotMatch(k, /nur EG|EG \+ OG/, k + ': x.01/x.11 gilt mit und ohne OG');
    else assert.match(k, z[0] === '0' || z[0] === '2' ? /nur EG/ : /EG \+ OG/, k + ': Geschosse');
    assert.match(k, dach === '1' ? /DG ausgeb/ : dach === '2' ? /DG nicht ausgeb/ : /Flachdach/, k + ': Dach');
    if (dach === '1') assert.doesNotMatch(k, /DG nicht ausgeb/, k);
  }
});

test('frühere Schlüssel werden umgestellt; der falsche Typ (Werte der Zeile 1.02) zeigt auf 1.21', () => {
  for (const [alt, neu] of Object.entries(TYP_ALT)) {
    assert.equal(TYPES[alt], undefined, alt + ' gibt es nicht mehr');
    assert.ok(TYPES[neu], neu);
  }
  assert.equal(TYPES[TYP_ALT['EFH freistehend · nicht unterkellert, DG ausgeb.']].nr, '1.21');
  assert.equal(TYPES[TYP_ALT['EFH freistehend · unterkellert, DG nicht ausgeb.']].nr, '1.12');   // dieselben Werte wie bisher
  assert.equal(TYPES[TYP_ALT['EFH freistehend · unterkellert, Flachdach']].nr, '1.13');
  // Eckdaten-Übernahme kennt dieselben Schlüssel und frühere Namen
  assert.deepEqual(U.TYP_ALT, TYP_ALT);
  assert.equal(U.typWert('EFH freistehend · nicht unterkellert, DG ausgeb.'), 'EFH freistehend · nicht unterkellert, nur EG, DG ausgeb.');
});
