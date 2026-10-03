// Einheitstests zu js/befugnis-regeln.js: Kachel „Wer verkauft?“ (Verfügungsbefugnis, Nachweise, Genehmigungsketten).
// Nur synthetische Daten; Normen wie in der Rechtsprüfung vom 03.10.2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../js/befugnis-regeln.js');

const NAMEN = { k1: 'Erika Beispiel', k2: 'Max Probe', k3: 'Ida Muster', kb: 'Bernd Betreuerbeispiel', ke: 'Eva Elternbeispiel', kt: 'Tim Vollstreckerbeispiel', kn: 'Nora Pflegerbeispiel' };
const ctx = (x = {}) => ({ heute: '2026-10-03', name: id => NAMEN[id] || '', stand: {}, ...x });
const person = (id, kundeId, x = {}) => ({ id, kundeId, vertretung: 'selbst', vertreterIds: [], einverstanden: 'offen', gen: {}, ...x });
const rot = pr => pr.punkte.filter(p => p.stufe === 'rot').map(p => p.text);
const gelb = pr => pr.punkte.filter(p => p.stufe === 'gelb').map(p => p.text);
const keys = pr => pr.posten.map(p => p.key);

test('Genehmigungskette: Rechtskraft = letzte Bekanntgabe + 2 Wochen, Mitteilung bis Ablauf des zweiten Monats (§ 63 FamFG, § 1856 Abs. 2 BGB)', () => {
  const g = { beantragt: '2026-09-01', beschluss: '2026-09-28', bekanntgabe: '2026-10-05', aufforderung: '2026-09-10' };
  let x = B.genehmigung(g, { heute: '2026-10-20', gericht: 'Betreuungsgericht', norm: '§ 1850 Nr. 1 und 5 BGB', wen: 'die betreute Person' });
  assert.equal(x.rkAb, '2026-10-19');
  assert.equal(x.mitteilungBis, '2026-11-10');
  assert.equal(x.stufe, 'gelb');                                       // 21 Tage bis zur Frist
  assert.match(x.punkte[0].text, /Beschwerdefrist endet am 19\.10\.2026/);
  x = B.genehmigung(g, { heute: '2026-10-27', gericht: 'Betreuungsgericht' });
  assert.equal(x.stufe, 'rot');                                        // 14 Tage vorher: Rot
  assert.match(x.punkte.find(p => p.stufe === 'rot').text, /spätestens am 10\.11\.2026 — sonst gilt die Genehmigung als verweigert \(§ 1856 Abs\. 2 BGB\)/);
  x = B.genehmigung(g, { heute: '2026-11-11', gericht: 'Betreuungsgericht' });
  assert.match(x.punkte.find(p => p.stufe === 'rot').text, /abgelaufen/);
  // § 188 Abs. 3 BGB: Monatsende
  assert.equal(B.genehmigung({ aufforderung: '2026-12-31' }, { heute: '2026-12-31' }).mitteilungBis, '2027-02-28');
  // Grün erst mit Rechtskraftzeugnis und Mitteilung
  assert.equal(B.genehmigung({ ...g, mitgeteilt: '2026-10-21' }, { heute: '2026-10-22', rk: false }).gruen, false);
  x = B.genehmigung({ ...g, mitgeteilt: '2026-10-21' }, { heute: '2026-10-22', rk: true });
  assert.equal(x.gruen, true); assert.equal(x.stufe, 'gruen');
  // Eltern: Verweis über § 1644 Abs. 3 BGB
  x = B.genehmigung({ aufforderung: '2026-10-01' }, { heute: '2026-10-03', iVm: '§ 1644 Abs. 3 BGB', gericht: 'Familiengericht' });
  assert.match(x.punkte.map(p => p.text).join(' '), /§ 1856 Abs\. 2 BGB i\. V\. m\. § 1644 Abs\. 3 BGB/);
  // ohne Antrag: Gelb mit Gericht
  assert.match(B.genehmigung({}, { heute: '2026-10-03', gericht: 'Familiengericht', norm: 'N' }).punkte[0].text, /beim Familiengericht beantragen \(N\)/);
});

test('Europäisches Nachlasszeugnis: Pflichtfeld, 30 Tage vorher Gelb, Rot nach Ablauf oder Termin danach (Art. 70 Abs. 3 EuErbVO)', () => {
  assert.equal(B.enzPruefen('', '2026-10-03').stufe, 'gelb');
  assert.equal(B.enzPruefen('2026-10-02', '2026-10-03').stufe, 'rot');
  assert.equal(B.enzPruefen('2026-12-31', '2026-10-03', '2027-01-15').stufe, 'rot');
  assert.equal(B.enzPruefen('2026-11-02', '2026-10-03').stufe, 'gelb');   // 30 Tage
  assert.equal(B.enzPruefen('2026-11-03', '2026-10-03').stufe, 'gruen');  // 31 Tage
  assert.match(B.enzPruefen('2026-11-03', '2026-10-03').text, /3\.11\.2026/);
});

test('Vollmacht: privatschriftlich, Behördenbeglaubigung nach dem Tod, über den Tod hinaus, Untersagung, § 181 BGB', () => {
  const ok = { vmForm: 'beurkundet', vmUmfasst: 'ja', vmGeberLebt: 'ja' };
  assert.deepEqual(B.vollmachtPruefen(ok, 'X'), []);
  assert.match(B.vollmachtPruefen({ ...ok, vmForm: 'privat' }, 'X')[0].text, /§ 29 Abs\. 1 GBO/);
  let l = B.vollmachtPruefen({ ...ok, vmForm: 'behoerde', vmGeberLebt: 'nein' }, 'X');
  assert.equal(l[0].stufe, 'rot'); assert.match(l[0].text, /§ 7 Abs\. 1 Satz 2 BtOG/);
  l = B.vollmachtPruefen({ ...ok, vmGeberLebt: 'nein', vmUeberTod: true }, 'X');
  assert.equal(l[0].stufe, 'gelb'); assert.match(l[0].text, /§ 168 Satz 2, § 672 Satz 1 BGB/);
  assert.match(B.vollmachtPruefen({ ...ok, vmUntersagt: true }, 'X')[0].text, /§ 1820 Abs\. 4 BGB/);
  assert.equal(B.vollmachtPruefen({ ...ok, vmSelbstkauf: true }, 'X')[0].stufe, 'rot');
  assert.deepEqual(B.vollmachtPruefen({ ...ok, vmSelbstkauf: true, vm181: 'ja' }, 'X'), []);
  assert.equal(B.vollmachtPruefen({ ...ok, vmUmfasst: 'nein' }, 'X')[0].stufe, 'rot');
});

test('Einstieg: leer Rot; Eigentümer handelt selbst Grün ohne Posten', () => {
  let pr = B.pruefen({}, ctx());
  assert.equal(pr.stufe, 'rot'); assert.match(rot(pr)[0], /Frage 1/);
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [] }, ctx());
  assert.match(rot(pr)[0], /Eigentümer laut Grundbuch \(Abt\. I\) aus der Kundenakte erfassen/);
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [person('p1', 'k1')] }, ctx());
  assert.equal(pr.stufe, 'gruen'); assert.deepEqual(pr.posten, []); assert.deepEqual(pr.faelle, ['Eigentümer handelt selbst']);
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [person('p1', '')] }, ctx());
  assert.equal(pr.stufe, 'rot');
});

test('Erbengemeinschaft: alle Miterben, Einverständnis, Streit nur als Hinweis, Erbschein als Posten beim Nachlassgericht', () => {
  const r = { eigentuemer: 'verstorben', erben: 'mehrere', tv: 'nein', nacherbfolge: 'nein', nachweis: 'erbschein', anzahlErben: 3,
    personen: [person('p1', 'k1', { einverstanden: 'ja' }), person('p2', 'k2', { einverstanden: 'nein' })] };
  let pr = B.pruefen(r, ctx());
  assert.equal(pr.stufe, 'rot');
  assert.ok(rot(pr).some(t => /Laut Nachweis 3 Erben, erfasst sind 2/.test(t)));
  assert.ok(rot(pr).some(t => /Miterbe 2 \(Max Probe\): mit dem Verkauf einverstanden — nein/.test(t)));
  assert.ok(pr.punkte.some(p => p.stufe === 'grau' && /Teilungsversteigerung \(§ 2042 Abs\. 1, § 753 Abs\. 1 BGB, § 180 ZVG\)/.test(p.text)));
  assert.ok(pr.punkte.some(p => /§ 2040 Abs\. 1, § 2033, § 2034 BGB/.test(p.text)));
  assert.ok(pr.punkte.some(p => p.stufe === 'grau' && /Maklervertrag mit der Erbengemeinschaft/.test(p.text)));   // offene Frage: Hinweis, keine Regel
  assert.deepEqual(pr.posten.map(p => [p.key, p.stelle]), [['bf_erbschein', 'nachlassgericht']]);
  r.personen[1].einverstanden = 'ja'; r.personen.push(person('p3', 'k3', { einverstanden: 'ja' }));
  pr = B.pruefen(r, ctx());
  assert.equal(pr.stufe, 'gelb');                                         // Erbschein steht aus
  pr = B.pruefen(r, ctx({ stand: { bf_erbschein: 'da' } }));
  assert.equal(pr.stufe, 'gruen');
  // Posten ohne Namen (Namen nur aus der Kundenakte)
  assert.ok(pr.posten.every(p => !/Beispiel|Probe|Muster/.test(p.name)));
});

test('Erbschein nennt Nacherbfolge oder Testamentsvollstrecker; Abt. II löst die Fälle aus (§ 352b FamFG, §§ 51, 52 GBO)', () => {
  const r = { eigentuemer: 'verstorben', erben: 'einer', tv: 'nein', nacherbfolge: 'nein', nachweis: 'erbschein', erbscheinNE: true, personen: [person('p1', 'k1')] };
  let pr = B.pruefen(r, ctx({ stand: { bf_erbschein: 'da' } }));
  assert.ok(pr.faelle.includes('Vorerbe'));
  assert.ok(rot(pr).some(t => /Nacherben berücksichtigen/.test(t)));
  r.vorerbeWeg = 'zustimmung';
  pr = B.pruefen(r, ctx({ stand: { bf_erbschein: 'da' } }));
  assert.ok(keys(pr).includes('bf_nacherben'));
  assert.equal(pr.posten.find(p => p.key === 'bf_nacherben').stelle, 'notariat');
  assert.equal(pr.stufe, 'rot');                                          // Rot, bis die Zustimmung vorliegt
  pr = B.pruefen(r, ctx({ stand: { bf_erbschein: 'da', bf_nacherben: 'da' } }));
  assert.equal(pr.stufe, 'gruen');
  r.nacherbenUnbekannt = true;
  assert.ok(gelb(B.pruefen(r, ctx({ stand: { bf_erbschein: 'da', bf_nacherben: 'da' } }))).some(t => /§ 1882 BGB/.test(t)));
  // Testamentsvollstreckung aus Abt. II, auch bei lebendem (eingetragenem) Erben
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [person('p1', 'k1')] }, ctx({ abt2: 'Testamentsvollstreckung ist angeordnet' }));
  assert.ok(pr.faelle.includes('Testamentsvollstrecker'));
  assert.ok(rot(pr).some(t => /Testamentsvollstrecker aus der Kundenakte erfassen/.test(t)));
  // „nein“ trotz Vermerk: Gelb
  pr = B.pruefen({ eigentuemer: 'lebt', tv: 'nein', personen: [person('p1', 'k1')] }, ctx({ abt2: 'Testamentsvollstreckervermerk' }));
  assert.ok(gelb(pr).some(t => /§ 52 GBO/.test(t)));
});

test('Testamentsvollstrecker: Nachweis, Prüfung höchstens 30 Tage vor der Beurkundung, Kaufpreis gegen Bewertung (§ 2368, § 2205 BGB)', () => {
  const r = { eigentuemer: 'verstorben', erben: 'mehrere', tv: 'ja', nacherbfolge: 'nein', nachweis: 'notariell', tvId: 'kt', tvNachweis: 'zeugnis', tvGeprueft: '2026-09-01',
    personen: [person('p1', 'k1'), person('p2', 'k2')] };
  let pr = B.pruefen(r, ctx({ termin: '2026-10-15' }));
  assert.ok(keys(pr).includes('bf_tvzeugnis'));
  assert.ok(keys(pr).includes('bf_testament') && keys(pr).includes('bf_eroeffnung'));
  assert.ok(!rot(pr).some(t => /einverstanden/.test(t)));                // der Testamentsvollstrecker verkauft (§ 2211 BGB)
  assert.ok(gelb(pr).some(t => /zuletzt geprüft am 1\.9\.2026 — mehr als 30 Tage vor dem Beurkundungstermin/.test(t)));
  assert.ok(pr.punkte.some(p => /Grundbuchamt kann trotzdem einen Erbschein verlangen/.test(p.text)));
  pr = B.pruefen({ ...r, tvGeprueft: '2026-09-20' }, ctx({ termin: '2026-10-15' }));
  assert.ok(pr.punkte.some(p => p.stufe === 'gruen' && /zuletzt geprüft am 20\.9\.2026/.test(p.text)));
  // Kaufpreis deutlich unter Bewertung: Gelb nur mit Schwelle der Bank
  pr = B.pruefen(r, ctx({ kaufpreis: 400000, wert: 500000 }));
  assert.ok(pr.punkte.some(p => p.stufe === 'grau' && /Schwelle/.test(p.text)));
  pr = B.pruefen(r, ctx({ kaufpreis: 400000, wert: 500000, schwelle: 10 }));
  assert.ok(gelb(pr).some(t => /liegt 20 % unter dem Wert der Bewertung/.test(t)));
  pr = B.pruefen(r, ctx({ kaufpreis: 400000, wert: 500000, schwelle: 25 }));
  assert.ok(pr.punkte.some(p => p.stufe === 'gruen' && /innerhalb der Schwelle/.test(p.text)));
});

test('Betreuer: Aufgabenkreis, vorläufige Betreuung, Wohnraum, Interessenkonflikt, Kette beim Betreuungsgericht', () => {
  const p = person('p1', 'k1', { vertretung: 'betreuer', vertreterIds: ['kb'], aufgabenkreis: 'nein', vorlaeufigBis: '2026-10-01', wohnt: true, kaeuferNahe: true,
    gen: { beantragt: '2026-09-01' } });
  let pr = B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx());
  assert.deepEqual(pr.posten.map(x => [x.key, x.stelle]), [['bf_p1_bestellung', 'betreuungsgericht'], ['bf_p1_gen', 'betreuungsgericht'], ['bf_p1_rk', 'betreuungsgericht']]);
  const t = rot(pr).join('\n');
  assert.match(t, /Aufgabenkreis umfasst den Verkauf nicht/);
  assert.match(t, /vorläufige Betreuung endete am 1\.10\.2026/);
  assert.match(t, /Ergänzungsbetreuer nötig \(§ 1824 Abs\. 1 Nr\. 1, § 1817 Abs\. 5 BGB\)/);
  assert.ok(gelb(pr).some(x => /§ 1833 Abs\. 2 BGB/.test(x)));
  assert.match(pr.posten.find(x => x.key === 'bf_p1_gen').hinweis, /§ 1833 Abs\. 3 Satz 1 Nr\. 4 BGB/);
  assert.ok(pr.faelle.includes('Betreuer'));
  assert.ok(pr.punkte.some(x => /Provision: Der Anspruch entsteht erst mit dem wirksamen Kaufvertrag/.test(x.text)));
  // alles geklärt
  const q = { ...p, aufgabenkreis: 'ja', vorlaeufigBis: '', wohnt: false, kaeuferNahe: false, gen: { beantragt: '2026-08-01', beschluss: '2026-09-01', bekanntgabe: '2026-09-03', mitgeteilt: '2026-09-25' } };
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [q] }, ctx({ stand: { bf_p1_bestellung: 'da', bf_p1_gen: 'da', bf_p1_rk: 'da' } }));
  assert.equal(pr.stufe, 'gruen'); assert.equal(pr.genehmigungGruen, true);
  assert.match(pr.posten.find(x => x.key === 'bf_p1_gen').hinweis, /§ 1850 Nr\. 1 und 5 BGB/);
});

test('Minderjähriger Miterbe: Familiengericht, Alleinsorge, Volljährigkeit; Nachlasspfleger beim Nachlassgericht', () => {
  const r = { eigentuemer: 'verstorben', erben: 'mehrere', tv: 'nein', nacherbfolge: 'nein', nachweis: 'erbschein',
    personen: [person('p1', 'k1', { einverstanden: 'ja' }), person('p2', 'k2', { einverstanden: 'ja', vertretung: 'eltern', vertreterIds: ['ke'], sorge: 'allein' })] };
  let pr = B.pruefen(r, ctx());
  assert.ok(keys(pr).includes('bf_p2_alleinsorge'));
  assert.equal(pr.posten.find(x => x.key === 'bf_p2_gen').stelle, 'familiengericht');
  assert.ok(pr.punkte.some(x => /Minderjähriger Miterbe/.test(x.text) && /Notariat oder Rechtsabteilung bestätigen/.test(x.text)));
  assert.ok(pr.faelle.includes('Eltern für Minderjährige'));
  r.personen[1].volljaehrig = true;
  pr = B.pruefen(r, ctx());
  assert.ok(keys(pr).includes('bf_p2_kindgen') && !keys(pr).includes('bf_p2_gen'));
  // beide Eltern: zweiter Elternteil fehlt
  r.personen[1].sorge = 'beide'; r.personen[1].volljaehrig = false;
  assert.ok(gelb(B.pruefen(r, ctx())).some(x => /beide Elternteile/.test(x)));
  // Nachlasspfleger
  pr = B.pruefen({ eigentuemer: 'verstorben', erben: 'unbekannt', tv: 'nein', nacherbfolge: 'nein', npGen: {} }, ctx());
  assert.deepEqual(pr.posten.map(x => [x.key, x.stelle]), [['bf_np_bestellung', 'nachlassgericht'], ['bf_np_gen', 'nachlassgericht'], ['bf_np_rk', 'nachlassgericht']]);
  assert.ok(rot(pr).some(x => /Nachlasspfleger aus der Kundenakte erfassen/.test(x)));
  assert.ok(!rot(pr).some(x => /Den Erben/.test(x)));
});

test('Ehegatte: Zugewinn mit ganzem Vermögen, Gütergemeinschaft, Angaben aus dem Notarauftrag, Frist § 1366 Abs. 3 BGB', () => {
  let p = person('p1', 'k1', { familienstand: 'verheiratet', gueterstand: 'zugewinn' });
  let pr = B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx());
  assert.equal(pr.stufe, 'gruen'); assert.ok(pr.punkte.some(x => x.stufe === 'grau' && /§ 1365 Abs\. 1 BGB/.test(x.text)));
  p.ganzesVermoegen = true;
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx());
  assert.equal(pr.stufe, 'gelb'); assert.equal(pr.posten[0].key, 'bf_p1_ehegatte'); assert.ok(pr.schwebend);
  assert.ok(pr.faelle.includes('Ehegatte (Güterstand)'));
  p.ehAufforderung = '2026-09-15';
  assert.ok(rot(B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx())).some(x => /nur bis 29\.9\.2026 erklärt werden \(§ 1366 Abs\. 3 BGB\)/.test(x)));
  // Gütergemeinschaft aus dem Notarauftrag, Lebenspartner
  p = person('p1', 'k1');
  pr = B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx({ notarPersonen: { k1: { familienstand: 'verpartnert', gueterstand: 'gemeinschaft' } } }));
  assert.equal(pr.posten[0].name, 'Einwilligung des Lebenspartners (Eigentümer)');
  assert.match(pr.posten[0].hinweis, /§ 1424 Satz 1 BGB/);
  assert.equal(B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx({ notarPersonen: { k1: { familienstand: 'verpartnert', gueterstand: 'gemeinschaft' } }, stand: { bf_p1_ehegatte: 'da' } })).stufe, 'gruen');
});

test('Bevollmächtigter in der Prüfung; Erbfall: gebührenfreie Berichtigung binnen zwei Jahren (Nr. 14110 KV GNotKG)', () => {
  const p = person('p1', 'k1', { vertretung: 'bevollmaechtigt', vertreterIds: ['k2'], vmForm: 'privat', vmUmfasst: 'ja', vmGeberLebt: 'ja' });
  let pr = B.pruefen({ eigentuemer: 'lebt', personen: [p] }, ctx());
  assert.equal(pr.posten[0].key, 'bf_p1_vollmacht'); assert.equal(pr.posten[0].stelle, 'notariat');
  assert.match(pr.posten[0].hinweis, /§ 172 Abs\. 1 BGB/);
  assert.ok(rot(pr).some(x => /Eigentümer \(Erika Beispiel\): Die Vollmacht ist nur privatschriftlich/.test(x)));
  assert.ok(rot(B.pruefen({ eigentuemer: 'lebt', personen: [{ ...p, vertreterIds: [] }] }, ctx())).some(x => /Vertreter aus der Kundenakte wählen/.test(x)));
  pr = B.pruefen({ eigentuemer: 'verstorben', erben: 'einer', tv: 'nein', nacherbfolge: 'nein', nachweis: 'privat', erbfall: '2025-11-20', personen: [person('p1', 'k1')] }, ctx());
  assert.deepEqual(pr.fristen, { gebuehrenfreiBis: '2027-11-20', wvErbfall: '2027-08-20' });
  assert.ok(pr.punkte.some(x => /bis 20\.11\.2027 gebührenfrei/.test(x.text)));
  assert.equal(pr.posten[0].name, 'Erbschein (beantragen)');
  assert.ok(pr.punkte.some(x => /§ 40 Abs\. 1 GBO/.test(x.text)));
});
