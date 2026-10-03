// Einheitstests zu js/maklervertrag-regeln.js (Kachel „Maklerverträge“): Widerrufsrecht nach Abschlussweg, Fristen mit
// §§ 187, 188, 193 BGB und Feiertagen in Baden-Württemberg, Höchstfrist (§ 356 Abs. 4 Satz 1 BGB) auf beiden Rechenwegen,
// Ampeln zu Textform, Belehrung, Frist und Puffer. Beispiele aus der Rechtsprüfung; nur synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/maklervertrag-regeln.js');

/* vollständig belehrter Vertrag beim Kunden zu Hause (Weg 2), Einfamilienhaus mit Textform */
const BASIS = {
  seite: 'verkaeufer', vertragsart: 'allein', verbraucher: true, provision: true, wohnung: true, weg: 'aussen', abschluss: '2026-10-05',
  textform: { datum: '2026-10-05', form: 'papier', bestimmt: true },
  belehrung: { datum: '2026-10-05', form: 'papier', formular: true, vordruck: '2026-06-19' },
  abschrift: { datum: '2026-10-05', form: 'papier' }, laufzeit: { bis: '2027-04-05', vorlauf: '14' }
};
const mit = (aend) => { const v = structuredClone(BASIS); for (const [k, w] of Object.entries(aend)) v[k] = w && typeof w === 'object' && !Array.isArray(w) ? Object.assign({}, v[k], w) : w; return v; };
const ampel = (p, id) => p.ampeln.find(a => a.id === id);

test('Höchstfrist (§ 356 Abs. 4 Satz 1 BGB): beide Rechenwege, späteres Datum, dann § 193', () => {
  assert.deepEqual(R.hoechstfrist('2026-10-05'), { a: '2027-10-19', b: '2027-10-19', ohne193: '2027-10-19', ende: '2027-10-19' });
  assert.deepEqual(R.hoechstfrist('2026-12-11'), { a: '2027-12-25', b: '2027-12-25', ohne193: '2027-12-25', ende: '2027-12-27' });   // Sa → Mo
  assert.deepEqual(R.hoechstfrist('2027-02-14'), { a: '2028-02-29', b: '2028-02-28', ohne193: '2028-02-29', ende: '2028-02-29' });   // Sonderfall Schaltjahr
  assert.equal(R.monateAbBeginn('2027-03-01', 12), '2028-02-29');
  assert.equal(R.monateAbBeginn('2028-02-29', 12), '2029-02-28');
  assert.equal(R.monateAbBeginn('2026-10-20', 12), '2027-10-19');
  assert.equal(R.hoechstfrist('kein Datum').ende, '');
});

test('Widerrufsfrist: 14 Tage ab Vertragsschluss oder Belehrung, § 193 mit Feiertagen BW, höchstens bis zur Höchstfrist', () => {
  const e = (V, B) => R.fristEnde(V, B).ende;
  assert.equal(e('2026-10-05', '2026-10-05'), '2026-10-19');
  assert.equal(e('2026-10-05', '2026-10-08'), '2026-10-22');   // Belehrung nachgereicht
  assert.equal(R.fristEnde('2026-10-05', '2026-10-08').nachgeholt, true);
  assert.equal(e('2026-12-11', '2026-12-11'), '2026-12-28');   // 1. Weihnachtstag
  assert.equal(e('2026-12-23', '2026-12-23'), '2027-01-07');   // Erscheinungsfest
  assert.equal(e('2026-10-10', '2026-10-10'), '2026-10-26');   // Samstag
  assert.equal(e('2027-10-18', '2027-10-18'), '2027-11-02');   // Allerheiligen
  assert.equal(e('2026-10-05', ''), '2027-10-19');             // ohne Belehrung: Höchstfrist
  assert.equal(e('2025-01-02', '2026-09-01'), R.hoechstfrist('2025-01-02').ende);   // Belehrung nach der Höchstfrist
  assert.equal(R.werktagePlus('2026-10-19', 5), '2026-10-26');
  assert.equal(R.werktagePlus('2026-12-23', 5), '2026-12-31');
});

test('Abschlussweg und Verbraucher: wann ein Widerrufsrecht besteht', () => {
  const H = '2026-10-10';
  assert.equal(R.pruefen(mit({ weg: 'filiale' }), H).widerrufsrecht, false);
  assert.equal(R.pruefen(mit({ weg: 'filiale' }), H).provision.text, 'Kein Widerrufsrecht');
  assert.equal(R.pruefen(mit({ weg: 'aussen' }), H).widerrufsrecht, true);
  assert.equal(R.pruefen(mit({ weg: 'ansprache' }), H).typ, 'aussen');
  assert.equal(R.pruefen(mit({ weg: 'fern' }), H).typ, 'fern');
  assert.equal(R.pruefen(mit({ weg: '' }), H).widerrufsrecht, true);                 // unklar → Widerrufsrecht
  assert.equal(R.pruefen(mit({ weg: '' }), H).typ, 'unklar');
  assert.equal(R.pruefen(mit({ verbraucher: false }), H).widerrufsrecht, false);    // § 13 BGB
  assert.match(R.pruefen(mit({ verbraucher: false }), H).grund, /§ 13 BGB/);
  assert.equal(R.pruefen(mit({ provision: false }), H).widerrufsrecht, false);      // § 312 Abs. 1 BGB
});

test('Belehrung: außerhalb nur Papier oder Datenträger mit Zustimmung, immer mit Formular; im Fernabsatz angepasste Form', () => {
  const H = '2026-10-10';
  let p = R.pruefen(mit({ belehrung: { form: 'datentraeger' } }), H);
  assert.equal(p.belehrt, false); assert.deepEqual(p.belehrungFehlt, ['Zustimmung zum dauerhaften Datenträger']);
  assert.equal(ampel(p, 'belehrung').stufe, 'rot');
  assert.match(ampel(p, 'belehrung').text, /Widerruf möglich bis 19\.10\.2027 \(§ 356 Abs\. 4 Satz 1 BGB\)/);
  assert.equal(p.provision.stufe, 'rot');
  p = R.pruefen(mit({ belehrung: { form: 'datentraeger' }, zustimmung: '2026-10-05' }), H);
  assert.equal(p.belehrt, true); assert.equal(p.ende, '2026-10-19');
  p = R.pruefen(mit({ belehrung: { formular: false } }), H);
  assert.deepEqual(p.belehrungFehlt, ['Muster-Widerrufsformular']);                 // BGH I ZR 169/19
  assert.equal(R.pruefen(mit({ belehrung: { form: 'angepasst' } }), H).belehrt, false);
  assert.equal(R.pruefen(mit({ weg: 'fern', belehrung: { form: 'angepasst' } }), H).belehrt, true);
  assert.equal(R.pruefen(mit({ weg: '', belehrung: { form: 'angepasst' } }), H).belehrt, false);   // unklar: streng
  p = R.pruefen(mit({ belehrung: { datum: '2026-10-08' } }), H);
  assert.equal(p.ende, '2026-10-22'); assert.equal(ampel(p, 'nachgeholt').stufe, 'gelb');
});

test('Textform (§ 656a BGB): rot bei Wohnung oder Einfamilienhaus ohne Textform, sonst keine Formvorschrift', () => {
  const H = '2026-10-10';
  let p = R.pruefen(mit({ textform: { datum: '' } }), H);
  assert.equal(ampel(p, 'textform').stufe, 'rot'); assert.equal(p.provision.text, 'Textform fehlt – kein Provisionsanspruch');
  assert.equal(ampel(R.pruefen(mit({ textform: { bestimmt: false } }), H), 'textform').stufe, 'gelb');   // BGH I ZR 202/25
  p = R.pruefen(mit({ wohnung: false, textform: { datum: '' } }), H);
  assert.equal(ampel(p, 'textform').stufe, 'gruen'); assert.match(ampel(p, 'textform').text, /Keine Formvorschrift/);
});

test('Frist läuft, Puffer nach Fristende, abgelaufen — Ampel zur Provision', () => {
  let p = R.pruefen(BASIS, '2026-10-10');
  assert.equal(p.phase, 'laeuft'); assert.equal(p.provision.stufe, 'gelb'); assert.equal(p.provision.text, 'Widerrufsfrist läuft bis 19.10.2026');
  assert.equal(p.puffer, '2026-10-26');
  p = R.pruefen(BASIS, '2026-10-19'); assert.equal(p.phase, 'laeuft');                 // Ende um 24 Uhr
  p = R.pruefen(BASIS, '2026-10-22'); assert.equal(p.phase, 'puffer'); assert.match(ampel(p, 'frist').text, /kann noch eingehen \(Puffer bis 26\.10\.2026/);
  p = R.pruefen(BASIS, '2026-10-27'); assert.equal(p.phase, 'abgelaufen'); assert.equal(p.provision.stufe, 'gruen');
  assert.equal(p.provision.text, 'Widerrufsfrist abgelaufen am 19.10.2026');
  assert.equal(p.gesamt, 'gruen');
  // ohne Belehrung: rot bis zur Höchstfrist, danach grün
  p = R.pruefen(mit({ belehrung: { datum: '' } }), '2027-10-19'); assert.equal(p.provision.stufe, 'rot');
  p = R.pruefen(mit({ belehrung: { datum: '' } }), '2027-11-01'); assert.equal(p.phase, 'abgelaufen'); assert.equal(p.provision.stufe, 'gruen');
  assert.equal(ampel(R.pruefen(mit({ ausserhalbBW: true }), '2026-10-10'), 'feiertage').stufe, 'gelb');
});

test('Notartermin vor Fristende ohne Verlangen, Erlöschen (§ 356 Abs. 5 Nr. 2) und Wertersatz (§ 357a Abs. 2)', () => {
  let p = R.pruefen(BASIS, '2026-10-10', { notarTermin: '2026-10-16' });
  assert.equal(ampel(p, 'notar').stufe, 'rot');
  assert.equal(ampel(p, 'notar').text, 'Widerrufsfrist läuft bis 19.10.2026 – Leistung vor Fristablauf ohne Verlangen: kein Wertersatz (Notartermin 16.10.2026; § 357a Abs. 2 BGB).');
  assert.equal(ampel(R.pruefen(BASIS, '2026-10-10', { notarTermin: '2026-10-20' }), 'notar'), undefined);
  // außerhalb: Verlangen nur auf dauerhaftem Datenträger
  assert.ok(ampel(R.pruefen(mit({ verlangen: { datum: '2026-10-05', datentraeger: false } }), '2026-10-10', { notarTermin: '2026-10-16' }), 'notar'));
  const voll = mit({ verlangen: { datum: '2026-10-05', datentraeger: true }, erloeschen: '2026-10-05', beginn: '2026-10-06' });
  p = R.pruefen(voll, '2026-10-10', { notarTermin: '2026-10-16' });
  assert.equal(ampel(p, 'notar'), undefined); assert.equal(p.wertersatz, true); assert.equal(p.erloschen, false);
  assert.deepEqual(p.erloeschenFehlt, ['vollständige Leistung (Kaufvertrag beurkundet)']);
  p = R.pruefen(voll, '2026-10-17', { beurkundet: '2026-10-16' });
  assert.equal(p.phase, 'erloschen'); assert.equal(p.provision.text, 'Widerrufsrecht erloschen'); assert.match(ampel(p, 'frist').text, /§ 356 Abs\. 5 Nr\. 2 BGB/);
  // Bestätigung erst nach Beginn der Tätigkeit: kein Erlöschen
  p = R.pruefen(mit({ verlangen: { datum: '2026-10-05', datentraeger: true }, erloeschen: '2026-10-07', beginn: '2026-10-06' }), '2026-10-17', { beurkundet: '2026-10-16' });
  assert.equal(p.erloschen, false); assert.deepEqual(p.erloeschenFehlt, ['Bestätigung vor Beginn der Tätigkeit']);
});

test('Widerruf: Absendung zählt, Rückzahlung bis Eingang + 14 Tage, verspätet → klären', () => {
  let p = R.pruefen(mit({ abschluss: '2027-01-08', textform: { datum: '2027-01-08' }, belehrung: { datum: '2027-01-08' }, widerruf: { abgesandt: '2027-01-18', eingang: '2027-01-19' } }), '2027-01-20');
  assert.equal(p.phase, 'widerrufen'); assert.equal(p.rueckzahlungBis, '2027-02-02');
  assert.equal(p.provision.stufe, 'rot'); assert.equal(p.provision.text, 'Widerrufen – keine Provision; Rückzahlung bis 02.02.2027');
  p = R.pruefen(mit({ widerruf: { abgesandt: '2026-10-21', eingang: '2026-10-22' } }), '2026-10-23');
  assert.equal(p.verspaetet, true); assert.equal(ampel(p, 'widerruf').stufe, 'gelb');
  p = R.pruefen(mit({ weg: 'filiale', widerruf: { eingang: '2026-10-07' } }), '2026-10-08');
  assert.equal(ampel(p, 'widerruf').stufe, 'gelb'); assert.equal(p.widerrufen, false);
});

test('Käuferseite: Vorschlag erste Bitte um Besichtigung, für das Fristende das späteste Datum', () => {
  const v = mit({ seite: 'kaeufer', vertragsart: 'nachweis', weg: 'fern', abschluss: '', textform: { datum: '2026-10-07' },
    kaeufer: { expose: '2026-10-01', link: '2026-10-02', bitte: '2026-10-03', vereinbarung: '2026-10-07' },
    belehrung: { datum: '2026-10-01', form: 'datentraeger' }, abschrift: { datum: '2026-10-07', form: 'datentraeger' } });
  const p = R.pruefen(v, '2026-10-10');
  assert.equal(p.vorschlag, '2026-10-03'); assert.equal(p.vertragsschluss, '2026-10-03');
  assert.equal(p.V, '2026-10-07'); assert.equal(p.ende, '2026-10-21');
  assert.equal(ampel(p, 'nachgeholt'), undefined);
  const spaet = R.pruefen(mit({ seite: 'kaeufer', weg: 'fern', abschluss: '2026-10-05', kaeufer: { expose: '2026-10-01' }, belehrung: { datum: '2026-10-04', form: 'datentraeger' } }), '2026-10-10');
  assert.match(ampel(spaet, 'nachgeholt').text, /gehören schon zum Exposé/);
});

test('Online-Abschluss, Vordruck-Stand und Normzitate vor und nach dem 19.06.2026', () => {
  let p = R.pruefen(mit({ weg: 'online', online: {} }), '2026-10-10');
  assert.equal(ampel(p, 'online').stufe, 'rot'); assert.equal(p.provision.text, 'Schaltfläche „zahlungspflichtig …“ nicht geprüft');
  p = R.pruefen(mit({ weg: 'online', online: { zahlungspflichtig: true } }), '2026-10-27');
  assert.equal(ampel(p, 'online356a').stufe, 'gelb'); assert.equal(p.provision.text, 'Fristbeginn unsicher (Online-Abschluss)');
  p = R.pruefen(mit({ weg: 'online', online: { zahlungspflichtig: true, widerrufsfunktion: true }, belehrung: { online: true } }), '2026-10-27');
  assert.equal(ampel(p, 'online356a'), undefined); assert.equal(p.provision.stufe, 'gruen');
  p = R.pruefen(mit({ belehrung: { vordruck: '2025-03-01' } }), '2026-10-10');
  assert.equal(ampel(p, 'vordruck').text, 'Vordruck an Anlage 1 EGBGB in der Fassung vom 19.06.2026 angleichen (BGBl. 2026 I Nr. 28).');
  p = R.pruefen(mit({ abschluss: '2026-05-04', textform: { datum: '2026-05-04' }, belehrung: { datum: '' } }), '2026-10-10');
  assert.match(ampel(p, 'belehrung').text, /§ 356 Abs\. 4 Satz 1 BGB; vor dem 19\.06\.2026 § 356 Abs\. 3 Satz 2 BGB a\. F\./);
});

test('Abschrift (§ 312f), Laufzeit des Alleinauftrags und Wiedervorlagen', () => {
  assert.equal(ampel(R.pruefen(mit({ abschrift: { datum: '' } }), '2026-10-10'), 'abschrift').stufe, 'gelb');
  assert.equal(ampel(R.pruefen(mit({ abschrift: { form: 'datentraeger' } }), '2026-10-10'), 'abschrift').stufe, 'gelb');   // ohne Zustimmung
  assert.equal(ampel(R.pruefen(mit({ weg: 'fern', abschrift: { form: 'datentraeger' } }), '2026-10-10'), 'abschrift').stufe, 'gruen');
  assert.equal(ampel(R.pruefen(mit({ weg: 'filiale' }), '2026-10-10'), 'abschrift'), undefined);
  assert.equal(ampel(R.pruefen(BASIS, '2026-10-10'), 'laufzeit').stufe, 'gruen');
  assert.match(ampel(R.pruefen(BASIS, '2027-03-25'), 'laufzeit').text, /endet am 05\.04\.2027/);
  assert.match(ampel(R.pruefen(BASIS, '2027-04-06'), 'laufzeit').text, /abgelaufen am 05\.04\.2027/);
  assert.equal(ampel(R.pruefen(mit({ laufzeit: { bis: '' } }), '2026-10-10'), 'laufzeit').stufe, 'gelb');
  const p = R.pruefen(BASIS, '2026-10-10');
  assert.deepEqual(R.wiedervorlagen(BASIS, p).map(x => [x.key, x.datum]), [['frist', '2026-10-19'], ['laufzeit', '2027-03-22']]);
  const ohne = mit({ belehrung: { datum: '' } });
  assert.deepEqual(R.wiedervorlagen(ohne, R.pruefen(ohne, '2026-10-10')).map(x => [x.key, x.datum]), [['hoechst', '2027-10-19'], ['laufzeit', '2027-03-22']]);
  const w = mit({ widerruf: { abgesandt: '2026-10-12', eingang: '2026-10-13' } }), pw = R.pruefen(w, '2026-10-14');
  assert.deepEqual(R.wiedervorlagen(w, pw).map(x => x.key), ['rueckzahlung', 'laufzeit']);
  assert.deepEqual(R.wiedervorlagen(w, pw, { bezahlt: false }).map(x => x.key), ['laufzeit']);
});
