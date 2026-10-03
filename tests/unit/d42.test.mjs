// Einheitstests zu D42: Gebühren nach dem GNotKG, Kaufnebenkosten, Erlös des Verkäufers, Provision
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../js/beratung.js');

/* Anlage 2 zu § 34 Abs. 3 GNotKG (BGBl. 2025 I Nr. 109): Geschäftswert bis … €, Gebühr Tabelle A, Gebühr Tabelle B */
const ANLAGE2 = [
  [500, 40, 15],
  [1000, 61, 19],
  [1500, 82, 23],
  [2000, 103, 27],
  [3000, 125.5, 33],
  [4000, 148, 39],
  [5000, 170.5, 45],
  [6000, 193, 51],
  [7000, 215.5, 57],
  [8000, 238, 63],
  [9000, 260.5, 69],
  [10000, 283, 75],
  [13000, 313.5, 83],
  [16000, 344, 91],
  [19000, 374.5, 99],
  [22000, 405, 107],
  [25000, 435.5, 115],
  [30000, 476, 125],
  [35000, 516.5, 135],
  [40000, 557, 145],
  [45000, 597.5, 155],
  [50000, 638, 165],
  [65000, 778, 192],
  [80000, 918, 219],
  [95000, 1058, 246],
  [110000, 1198, 273],
  [125000, 1338, 300],
  [140000, 1478, 327],
  [155000, 1618, 354],
  [170000, 1758, 381],
  [185000, 1898, 408],
  [200000, 2038, 435],
  [230000, 2248, 485],
  [260000, 2458, 535],
  [290000, 2668, 585],
  [320000, 2878, 635],
  [350000, 3088, 685],
  [380000, 3298, 735],
  [410000, 3508, 785],
  [440000, 3718, 835],
  [470000, 3928, 885],
  [500000, 4138, 935],
  [550000, 4348, 1015],
  [600000, 4558, 1095],
  [650000, 4768, 1175],
  [700000, 4978, 1255],
  [750000, 5188, 1335],
  [800000, 5398, 1415],
  [850000, 5608, 1495],
  [900000, 5818, 1575],
  [950000, 6028, 1655],
  [1000000, 6238, 1735],
  [1050000, 6448, 1815],
  [1100000, 6658, 1895],
  [1150000, 6868, 1975],
  [1200000, 7078, 2055],
  [1250000, 7288, 2135],
  [1300000, 7498, 2215],
  [1350000, 7708, 2295],
  [1400000, 7918, 2375],
  [1450000, 8128, 2455],
  [1500000, 8338, 2535],
  [1550000, 8548, 2615],
  [1600000, 8758, 2695],
  [1650000, 8968, 2775],
  [1700000, 9178, 2855],
  [1750000, 9388, 2935],
  [1800000, 9598, 3015],
  [1850000, 9808, 3095],
  [1900000, 10018, 3175],
  [1950000, 10228, 3255],
  [2000000, 10438, 3335],
  [2050000, 10648, 3415],
  [2100000, 10858, 3495],
  [2150000, 11068, 3575],
  [2200000, 11278, 3655],
  [2250000, 11488, 3735],
  [2300000, 11698, 3815],
  [2350000, 11908, 3895],
  [2400000, 12118, 3975],
  [2450000, 12328, 4055],
  [2500000, 12538, 4135],
  [2550000, 12748, 4215],
  [2600000, 12958, 4295],
  [2650000, 13168, 4375],
  [2700000, 13378, 4455],
  [2750000, 13588, 4535],
  [2800000, 13798, 4615],
  [2850000, 14008, 4695],
  [2900000, 14218, 4775],
  [2950000, 14428, 4855],
  [3000000, 14638, 4935]
];

test('GNotKG: Formel nach § 34 Abs. 2 trifft jede Zeile der Anlage 2 (Tabellen A und B)', () => {
  assert.equal(ANLAGE2.length, 92);
  for (const [wert, a, b] of ANLAGE2) {
    assert.equal(B.gnotkgTabelle(wert, 'A'), a, 'Tabelle A bei ' + wert);
    assert.equal(B.gnotkgTabelle(wert, 'B'), b, 'Tabelle B bei ' + wert);
  }
  assert.equal(B.gnotkgTabelle(0), 15);
  assert.equal(B.gnotkgTabelle(500), 15);
  assert.equal(B.gnotkgTabelle(500.01), 19);          // „angefangener Betrag“: ein Cent mehr ist der nächste Schritt
  assert.equal(B.gnotkgTabelle(300000), 635);
  assert.equal(B.gnotkgTabelle(320000), 635);
  assert.equal(B.gnotkgTabelle(320000.01), 685);
});

test('GNotKG: Werte über 3 Mio. € nach den Stufen des § 34 Abs. 2', () => {
  assert.equal(B.gnotkgTabelle(5000000), 4935 + 40 * 80);
  assert.equal(B.gnotkgTabelle(10000000), 4935 + 40 * 80 + 25 * 130);
  assert.equal(B.gnotkgTabelle(10000001), 4935 + 40 * 80 + 25 * 130 + 150);   // über 10 Mio. €: je angefangene 250.000 € plus 150 €
  assert.equal(B.gnotkgTabelle(20000000), 4935 + 3200 + 3250 + 40 * 150);
  assert.equal(B.gnotkgTabelle(30000000), 4935 + 3200 + 3250 + 6000 + 20 * 280);
  assert.equal(B.gnotkgTabelle(32000000), 4935 + 3200 + 3250 + 6000 + 5600 + 2 * 120);
  assert.equal(B.gnotkgTabelle(3050000, 'A'), 14638 + 210);
});

test('GNotKG: Satz, Cent-Rundung, Mindest- und Höchstbeträge', () => {
  assert.equal(B.gnotkgGebuehr(3000, 0.3, { tabelle: 'A' }), 37.65);   // 0,3 × 125,50
  assert.equal(B.gnotkgGebuehr(1000, 0.1), 15);                        // § 34 Abs. 5: mindestens 15 €
  assert.equal(B.gnotkgGebuehr(1000, 2, { min: 120 }), 120);           // Nr. 21100: mindestens 120 €
  assert.equal(B.gnotkgGebuehr(5000, 1, { min: 60 }), 60);             // Nr. 21200: mindestens 60 €
  assert.equal(B.gnotkgGebuehr(320000, 0.2, { max: 125 }), 125);       // Nr. 22114: höchstens 125 €
  assert.equal(B.gnotkgGebuehr(0, 1), 0);
  assert.equal(B.gnotkgGebuehr(100000, 0), 0);
});

test('Kaufnebenkosten: Kaufvertrag mit Finanzierungsgrundschuld (Handrechnung)', () => {
  const r = B.kaufnebenkosten({ preis: 400000, inventar: 10000, grestSatz: 5, maklerSatz: 3.57, grundschuld: 320000,
    vollzug: 'voll', betreuung: true, vormerkung: true, xml: true, auslagenKauf: 40, auslagenGs: 20 });
  const nr = (g, n) => r.posten.find(p => p.gruppe === g && p.nr === n).betrag;
  assert.equal(nr('notarKauf', '21100'), 1570);     // 2,0 × 785
  assert.equal(nr('notarKauf', '22110'), 392.5);    // 0,5 × 785
  assert.equal(nr('notarKauf', '22200'), 392.5);
  assert.equal(nr('notarKauf', '22114, 22115'), 78.5);   // neben dem Vollzug 0,1
  assert.deepEqual(r.notarKauf, { gebuehren: 2433.5, pauschale: 20, auslagen: 40, netto: 2493.5, ust: 473.77, brutto: 2967.27 });
  assert.equal(nr('notarGs', '21200'), 635);
  assert.equal(nr('notarGs', '22114'), 125);        // 0,2 × 635 = 127, höchstens 125
  assert.deepEqual(r.notarGs, { gebuehren: 760, pauschale: 20, auslagen: 20, netto: 800, ust: 152, brutto: 952 });
  assert.equal(r.grundbuch, 392.5 + 785 + 25 + 635);
  assert.equal(r.grestBasis, 390000);
  assert.equal(r.grest, 19500);
  assert.equal(r.makler, 14280);
  assert.equal(r.summe, 39536.77);                 // 2.967,27 + 952 + 1.837,50 + 19.500 + 14.280
  assert.ok(Math.abs(r.notarGrundbuchQuote - (2967.27 + 952 + 1837.5) / 4000) < 1e-9);
});

test('Kaufnebenkosten: Vollzug begrenzt, ohne Grundschuld, Steuer auf volle Euro abgerundet', () => {
  let r = B.kaufnebenkosten({ preis: 20000, grestSatz: 5, vollzug: 'begrenzt', vollzugTaetigkeiten: 1 });
  assert.equal(r.posten.find(p => p.nr === '22110, 22112').betrag, 50);   // 0,5 × 107 = 53,50, höchstens 50 € je Tätigkeit
  r = B.kaufnebenkosten({ preis: 20000, grestSatz: 5, vollzug: 'begrenzt', vollzugTaetigkeiten: 2 });
  assert.equal(r.posten.find(p => p.nr === '22110, 22112').betrag, 53.5);
  r = B.kaufnebenkosten({ preis: 399999.99, grestSatz: 5, vollzug: 'kein' });
  assert.equal(r.grest, 19999);                     // § 11 Abs. 2 GrEStG
  assert.equal(r.notarGs.brutto, 0);
  assert.ok(!r.posten.some(p => p.gruppe === 'notarGs'));
  assert.ok(!r.posten.some(p => p.nr === '14150'));
  r = B.kaufnebenkosten({ preis: 0 });
  assert.equal(r.summe, 0);
  assert.equal(r.posten.length, 0);
});

test('Erlös des Verkäufers: Provision, Löschung, Treuhandauflage, Ablösung', () => {
  const r = B.verkaeuferErloes({ preis: 400000, maklerSatz: 3.57, restschuld: 120000, grundschuldNenn: 150000, treuhand: true, vorfaelligkeit: 2000, sonstiges: 500 });
  assert.equal(r.makler, 14280);
  assert.equal(r.loeschung, 177);        // 0,5 × 354 (Nr. 14140)
  assert.equal(r.treuhandNetto, 150);    // 0,5 × 300 (Nr. 22201, Wert = Ablösebetrag)
  assert.equal(r.treuhand, 178.5);
  assert.equal(r.kosten, 14280 + 177 + 178.5 + 2000 + 500);
  assert.equal(r.erloes, 400000 - 17135.5 - 120000);
  const o = B.verkaeuferErloes({ preis: 300000, maklerSatz: 0, treuhand: true });
  assert.equal(o.treuhand, 0);           // ohne Restschuld keine Treuhandauflage
  assert.equal(o.erloes, 300000);
});

test('Provision: Netto, Umsatzsteuer, Brutto', () => {
  assert.deepEqual(B.provisionBetrag(400000, { satz: 3.57 }), { netto: 12000, ust: 2280, brutto: 14280, satzNetto: 3 });
  const f = B.provisionBetrag(0, { art: 'fest', betrag: 5000 });
  assert.equal(f.netto, 4201.68); assert.equal(f.ust, 798.32); assert.equal(f.brutto, 5000); assert.equal(f.satzNetto, null);
  assert.equal(B.provisionBetrag(250000, { satz: 3.57, ust: 0 }).ust, 0);
});

test('Provision: Teilung nach §§ 656b–656d BGB und Fälligkeit', () => {
  const basis = { art: 'efh', kaeuferVerbraucher: true, vertragDatum: '2026-09-15' };
  const V = (o) => Object.assign({ rolle: 'verkaeufer', maklervertrag: true, brutto: 14280 }, o);
  const K = (o) => Object.assign({ rolle: 'kaeufer', maklervertrag: true, brutto: 14280 }, o);
  let r = B.provisionPruefen({ ...basis, parteien: [V(), K()] }, '2026-10-03');
  assert.equal(r.rot, 0); assert.ok(r.liste.some(x => /656c Abs\. 1/.test(x.text)));
  assert.equal(r.faellig.kaeufer, '2026-09-15');
  r = B.provisionPruefen({ ...basis, parteien: [V({ brutto: 10000 }), K()] }, '2026-10-03');
  assert.equal(r.rot, 1);
  // nur der Verkäufer hat beauftragt: Käufer höchstens gleich viel, fällig erst nach Zahlung des Verkäufers
  r = B.provisionPruefen({ ...basis, parteien: [V(), K({ maklervertrag: false })] }, '2026-10-03');
  assert.equal(r.rot, 0); assert.equal(r.faellig.kaeufer, ''); assert.equal(r.faellig.verkaeufer, '2026-09-15');
  r = B.provisionPruefen({ ...basis, parteien: [V({ bezahltAm: '2026-09-30' }), K({ maklervertrag: false })] }, '2026-10-03');
  assert.equal(r.faellig.kaeufer, '2026-09-30'); assert.match(r.grund.kaeufer, /656d/);
  r = B.provisionPruefen({ ...basis, parteien: [V({ brutto: 10000 }), K({ maklervertrag: false })] }, '2026-10-03');
  assert.equal(r.rot, 1);
  // nur der Käufer hat beauftragt: spiegelbildlich
  r = B.provisionPruefen({ ...basis, parteien: [V({ maklervertrag: false, brutto: 5000 }), K()] }, '2026-10-03');
  assert.equal(r.rot, 0); assert.equal(r.faellig.verkaeufer, '');
  // Käufer kein Verbraucher, Mehrfamilienhaus: Teilungsregeln gelten nicht
  r = B.provisionPruefen({ ...basis, kaeuferVerbraucher: false, parteien: [V({ brutto: 1 }), K({ brutto: 2 })] }, '2026-10-03');
  assert.equal(r.rot, 0); assert.ok(r.liste.some(x => /656b/.test(x.text)));
  r = B.provisionPruefen({ ...basis, art: 'andere', parteien: [V({ brutto: 1 }), K({ brutto: 2 })] }, '2026-10-03');
  assert.equal(r.rot, 0);
  // aufschiebende Bedingung: erst mit Eintritt
  r = B.provisionPruefen({ ...basis, bedingung: true, parteien: [V()] }, '2026-10-03');
  assert.equal(r.faellig.verkaeufer, ''); assert.ok(r.liste.some(x => /652 Abs\. 1 Satz 2/.test(x.text)));
  r = B.provisionPruefen({ ...basis, bedingung: true, bedingungDatum: '2026-10-01', parteien: [V()] }, '2026-10-03');
  assert.equal(r.faellig.verkaeufer, '2026-10-01');
});

test('Provision: Rechnung innerhalb von sechs Monaten (§ 14 Abs. 2 Satz 2 UStG), Rechnungsnummern', () => {
  const p = [{ rolle: 'verkaeufer', maklervertrag: true, brutto: 14280 }];
  let r = B.provisionPruefen({ art: 'efh', kaeuferVerbraucher: true, vertragDatum: '2026-03-15', parteien: p }, '2026-10-03');
  assert.ok(r.liste.some(x => x.stufe === 'rot' && /15\.09\.2026/.test(x.text)));
  r = B.provisionPruefen({ art: 'efh', kaeuferVerbraucher: true, vertragDatum: '2026-04-20', parteien: p }, '2026-10-03');
  assert.ok(r.liste.some(x => x.stufe === 'gelb' && /20\.10\.2026/.test(x.text)));
  r = B.provisionPruefen({ art: 'efh', kaeuferVerbraucher: true, vertragDatum: '2026-03-15', parteien: [{ ...p[0], rechnungDatum: '2026-03-20' }] }, '2026-10-03');
  assert.equal(r.rot, 0);
  assert.equal(B.isoPlusMonate('2026-08-31', 6), '2027-02-28');
  assert.equal(B.isoPlusMonate('2027-08-31', 6), '2028-02-29');
  assert.equal(B.isoPlusMonate('2026-03-15', 6), '2026-09-15');
  assert.equal(B.rechnungsnummer('PR-{jahr}-', ['PR-2026-001', 'PR-2026-007', 'PR-2025-099', 'X'], 2026), 'PR-2026-008');
  assert.equal(B.rechnungsnummer('', [], 2026), '001');
  assert.equal(B.rechnungsnummer('R', ['R12', 'R9'], 2026), 'R013');
});
