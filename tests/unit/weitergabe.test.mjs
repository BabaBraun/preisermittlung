// Einheitstests zu js/weitergabe-regeln.js (D57): Einwilligung als Pflicht (Art. 7 Abs. 1 DSGVO), Rücklauf mit Werktagen in BW,
// Übergabeblatt nur mit Freigaben, Auswertung je Anlass und Stand, Vorschläge nach dem Kauf, Fahrplan, Personenbezug entfernen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/weitergabe-regeln.js');

const EIN = { ja: true, datum: '2026-09-29', form: 'vordruck', rueckmeldung: true, widerrufen: '' };
const W = { kundeId: 'k1', anlass: 'baufinanzierung', datum: '2026-09-29', stand: 'uebergeben', kollegeId: 'c1', einwilligung: EIN, freigabe: { kontakt: true } };

test('Einwilligung: vollständig, fehlend, Zukunft, nach der Weitergabe, mündlich, Widerruf', () => {
  assert.deepEqual(R.einwilligungPruefen(EIN, '2026-09-29', '2026-09-29'), { ok: true, fehlt: [], fehler: [], hinweise: [], widerrufen: '' });
  const leer = R.einwilligungPruefen({}, '2026-09-29', '2026-09-29');
  assert.equal(leer.ok, false);
  assert.deepEqual(leer.fehlt, ['Einwilligung oder Wunsch des Kunden', 'Datum der Einwilligung', 'Form der Einwilligung']);
  assert.match(R.einwilligungPruefen({ ...EIN, datum: '2026-10-01' }, '2026-10-01', '2026-09-29').fehler[0], /Zukunft/);
  assert.match(R.einwilligungPruefen({ ...EIN, datum: '2026-09-29' }, '2026-09-20', '2026-09-29').fehler[0], /nach dem Tag der Weitergabe/);
  assert.equal(R.einwilligungPruefen({ ...EIN, datum: '2026-02-30' }, '', '').fehlt[0], 'Datum der Einwilligung');   // kein Kalendertag
  const m = R.einwilligungPruefen({ ...EIN, form: 'muendlich' }, '2026-09-29', '2026-09-29');
  assert.equal(m.ok, true); assert.match(m.hinweise[0], /Nachweis sichern/);
  assert.equal(R.einwilligungPruefen({ ...EIN, widerrufen: '2026-10-02' }, '2026-09-29', '2026-10-03').widerrufen, '2026-10-02');
  assert.match(R.einwilligungPruefen({ ...EIN, widerrufen: '2026-09-01' }, '2026-09-29', '2026-10-03').fehler[0], /vor der Einwilligung/);
});

test('Pflicht vor dem Speichern: Kunde, Tag der Weitergabe, Einwilligung', () => {
  assert.deepEqual(R.speichernPruefen(W, '2026-09-29'), { ok: true, fehlt: [], fehler: [] });
  const ohne = R.speichernPruefen({ ...W, kundeId: '', einwilligung: { ja: false } }, '2026-09-29');
  assert.equal(ohne.ok, false);
  assert.deepEqual(ohne.fehlt, ['Kunde aus der Kundenakte', 'Einwilligung oder Wunsch des Kunden', 'Datum der Einwilligung', 'Form der Einwilligung']);
  assert.match(R.speichernPruefen({ ...W, datum: '2026-10-05', einwilligung: { ...EIN, datum: '2026-09-29' } }, '2026-09-29').fehler[0], /Zukunft/);
});

test('Rücklauf: 14 Tage, Samstag/Sonntag/Feiertag BW → nächster Werktag, ab letzter Rückmeldung', () => {
  assert.equal(R.ruecklaufTag({ datum: '2026-09-29' }), '2026-10-13');
  assert.equal(R.ruecklaufTag({ datum: '2026-09-19' }, 14), '2026-10-05');            // 03.10. Samstag und Feiertag
  assert.equal(R.ruecklaufTag({ datum: '2026-12-11' }, 14), '2026-12-28');            // 25. und 26.12., 27.12. Sonntag
  assert.equal(R.ruecklaufTag({ datum: '2026-12-23' }, 14), '2027-01-07');            // 06.01. Erscheinungsfest
  assert.equal(R.ruecklaufTag({ datum: '2026-09-01', rueckmeldungAm: '2026-09-20' }, 10), '2026-09-30');
  assert.equal(R.ruecklaufTag({ datum: '' }, 14), '');
  assert.deepEqual(R.ruecklauf(W, '2026-10-14'), { tag: '2026-10-13', ueberfaellig: true, heute: false });
  assert.deepEqual(R.ruecklauf(W, '2026-10-13'), { tag: '2026-10-13', ueberfaellig: false, heute: true });
  assert.equal(R.ruecklauf({ ...W, stand: 'abgeschlossen' }, '2026-12-01'), null);
  assert.equal(R.ruecklauf({ ...W, stand: 'nicht' }, '2026-12-01'), null);
  assert.equal(R.ruecklauf({ ...W, stand: 'zugesagt' }, '2026-12-01').ueberfaellig, true);
});

test('Ampeln: grün mit Einwilligung, rot ohne, Widerruf, keine Rückmeldung, Kontakt fehlt, Rücklauf', () => {
  const t = l => l.map(x => x.stufe + ': ' + x.text);
  let l = R.pruefen(W, { heute: '2026-09-29', kunde: { telefon: '07062 1' }, kollege: true });
  assert.deepEqual(l.map(x => x.stufe), ['gruen', 'gruen']);
  assert.match(t(l)[0], /Einwilligung vom 29\.09\.2026 liegt vor \(schriftlich/);
  assert.match(t(l)[1], /Rücklauf prüfen am 13\.10\.2026/);
  l = R.pruefen({ ...W, einwilligung: {} }, { heute: '2026-09-29' });
  assert.match(t(l)[0], /^rot: Es fehlt: .*Art\. 7 Abs\. 1 DSGVO/);
  l = R.pruefen({ ...W, einwilligung: { ...EIN, widerrufen: '2026-10-01' } }, { heute: '2026-10-02', fmt: s => 'am ' + s });
  assert.equal(l[0].stufe, 'rot'); assert.match(l[0].text, /widerrufen — nichts mehr weitergeben/); assert.match(l[0].text, /Datenschutzbeauftragten/);
  assert.ok(!l.some(x => /Rücklauf/.test(x.text)));
  l = R.pruefen({ ...W, einwilligung: { ...EIN, rueckmeldung: false } }, { heute: '2026-09-29', kunde: {} });
  assert.ok(l.some(x => x.stufe === 'gelb' && /keine Rückmeldung/.test(x.text)));
  assert.ok(l.some(x => x.stufe === 'gelb' && /fehlen aber in der Kundenakte/.test(x.text)));
  l = R.pruefen({ ...W, kollegeId: '' }, { heute: '2026-10-20', kunde: { email: 'a@b' } });
  assert.ok(l.some(x => /Noch kein Kollege/.test(x.text)));
  assert.ok(l.some(x => x.stufe === 'gelb' && /fällig seit 13\.10\.2026/.test(x.text)));
  assert.match(R.pruefen({ ...W, kundeId: 'k1' }, { heute: '2026-09-29', kunde: null })[0].text, /nicht mehr in der Kundenakte/);
  assert.ok(R.pruefen({ ...W, freigabe: { kaufpreis: true } }, { heute: '2026-09-29' }).some(x => x.stufe === 'gelb' && /Kein Kontaktweg/.test(x.text)));
  assert.match(R.pruefen(R.anonymisieren(W), {})[0].text, /Kunde wurde gelöscht/);
});

test('Übergabeblatt: nur freigegebene und vorhandene Angaben', () => {
  const d = { telefon: '07062 1', email: 'erika@beispiel.de', anschrift: 'Testweg 2, 74360 Ilsfeld', ort: '74360 Ilsfeld', objektart: 'Einfamilienhaus',
    wohnflaeche: '145 m²', baujahr: '1985', kaufpreis: '480.000 €', kaufpreisLabel: 'Angebotspreis' };
  assert.deepEqual(R.uebergabeZeilen({}, d), { kunde: [], objekt: [] });
  assert.deepEqual(R.uebergabeZeilen({ kontakt: true, kaufpreis: true, wohnflaeche: true }, d),
    { kunde: [['Telefon', '07062 1'], ['E-Mail', 'erika@beispiel.de']], objekt: [['Wohnfläche', '145 m²'], ['Angebotspreis', '480.000 €']] });
  assert.deepEqual(R.uebergabeZeilen({ kontakt: true, baujahr: true }, { telefon: '', email: 'x@y', baujahr: '' }), { kunde: [['E-Mail', 'x@y']], objekt: [] });
  assert.equal(R.objektartText('haus', 'EFH freistehend · unterkellert, DG ausgebaut'), 'Einfamilienhaus');
  assert.equal(R.objektartText('wohnung', '', 'Etagenwohnung'), 'Eigentumswohnung (Etagenwohnung)');
  assert.equal(R.objektartText('haus', 'Reihenmittelhaus · unterkellert, DG ausgeb.'), 'Reihenmittelhaus');
  assert.equal(R.objektartText('haus', 'Wohn-/Geschäftshaus (Mischnutzung)'), 'Wohn-/Geschäftshaus (Mischnutzung)');
});

test('Auswertung je Anlass und Stand, Quote, finanziertes Volumen, Jahr — ohne Kollegen', () => {
  const l = [
    { anlass: 'baufinanzierung', stand: 'abgeschlossen', datum: '2026-03-01', volumen: 300000, kollegeId: 'c1' },
    { anlass: 'baufinanzierung', stand: 'zugesagt', datum: '2026-05-01', volumen: 200000, kollegeId: 'c2' },
    { anlass: 'baufinanzierung', stand: 'nicht', datum: '2026-06-01', kollegeId: 'c1' },
    { anlass: 'baufinanzierung', stand: 'uebergeben', datum: '2026-09-01', kollegeId: 'c1' },
    { anlass: 'geldanlage', stand: 'abgeschlossen', datum: '2026-07-01', volumen: 150000 },
    { anlass: 'versicherung', stand: 'termin', datum: '2025-12-01' },
    { anlass: 'unbekannt', datum: '2026-01-05' }];
  const a = R.auswertung(l, { jahr: '2026' });
  assert.equal(a.gesamt, 6);
  assert.deepEqual(a.zeilen.map(z => z.anlass), ['baufinanzierung', 'geldanlage', 'sonstiges']);
  const b = a.zeilen[0];
  assert.deepEqual(b.staende, { uebergeben: 1, termin: 0, zugesagt: 1, abgeschlossen: 1, nicht: 1 });
  assert.equal(b.volumen, 500000); assert.equal(Math.round(b.quote * 100), 67);
  assert.equal(a.zeilen[2].staende.uebergeben, 1);                  // ohne Stand = übergeben
  assert.equal(a.finanziert, 500000);                               // Geldanlage zählt nicht als finanziert
  assert.equal(a.erfolg, 3); assert.equal(a.offen, 3);
  assert.ok(!JSON.stringify(a).includes('c1'));                     // keine Kollegen in der Auswertung
  assert.equal(R.auswertung(l).gesamt, 7);
  assert.equal(R.standName('zugesagt', 'baufinanzierung'), 'Finanzierung zugesagt');
  assert.equal(R.standName('zugesagt', 'versicherung'), 'zugesagt');
  assert.equal(R.standName('', 'versicherung'), 'übergeben');
});

test('Vorschläge nach dem Kauf: Käufer und Verkäufer, schon weitergegeben, ausgeblendet, älter als zwölf Monate', () => {
  const v = [
    { kundeId: 'kK', rolle: 'kaeufer', projektId: 'p1', datum: '2026-09-15', objekt: 'Testhaus' },
    { kundeId: 'kV', rolle: 'verkaeufer', projektId: 'p1', datum: '2026-09-15' },
    { kundeId: 'kAlt', rolle: 'kaeufer', datum: '2025-08-01' },
    { kundeId: '', rolle: 'kaeufer', datum: '2026-09-15' }];
  let l = R.vorschlaege(v, [{ kundeId: 'kK', anlass: 'bausparen' }], '2026-09-29', { ausgeblendet: { 'kK:modernisierung': true } });
  assert.deepEqual(l.map(x => x.schluessel), ['kK:versicherung', 'kV:geldanlage']);
  assert.equal(l[0].projektId, 'p1');
  l = R.vorschlaege(v, [], '2026-09-29');
  assert.deepEqual(l.map(x => x.schluessel), ['kK:versicherung', 'kK:modernisierung', 'kK:bausparen', 'kV:geldanlage']);
  // doppelt (Notarauftrag und Anfrage): einmal, mit dem neueren Datum
  l = R.vorschlaege([{ kundeId: 'kK', rolle: 'kaeufer', datum: '2026-09-01' }, { kundeId: 'kK', rolle: 'kaeufer', datum: '2026-09-20', projektId: 'p2' }], [], '2026-09-29');
  assert.equal(l.length, 3); assert.equal(l[0].datum, '2026-09-20'); assert.equal(l[0].projektId, 'p2');
});

test('Verkaufsfahrplan: Finanzierung des Käufers zugesagt', () => {
  const l = [{ projektId: 'p1', anlass: 'baufinanzierung', stand: 'zugesagt', kundeId: 'kK' }, { projektId: 'p1', anlass: 'baufinanzierung', stand: 'uebergeben', kundeId: 'kX' }];
  assert.equal(R.fahrplanFinanzierung(l, 'p1', { kaeuferIds: ['kK'] }), true);
  assert.equal(R.fahrplanFinanzierung(l, 'p1', { kaeuferIds: ['kX'] }), false);
  assert.equal(R.fahrplanFinanzierung(l, 'p1', { reserviert: true }), true);
  assert.equal(R.fahrplanFinanzierung(l, 'p1', {}), false);
  assert.equal(R.fahrplanFinanzierung(l.concat([{ projektId: 'p1', anlass: 'baufinanzierung', stand: 'abgeschlossen', kundeId: 'kY' }]), 'p1', { reserviert: true }), false);
  assert.equal(R.fahrplanFinanzierung([{ projektId: 'p1', anlass: 'modernisierung', stand: 'zugesagt' }], 'p1', { reserviert: true }), false);
  assert.equal(R.fahrplanFinanzierung(l, '', { reserviert: true }), false);
});

test('Personenbezug entfernen und alte erledigte Weitergaben', () => {
  const w = { ...W, anliegen: 'Finanzierung mit Eigenkapital', notiz: 'ruft abends an', stand: 'abgeschlossen', volumen: '300.000',
    verlauf: [{ id: 'h1', datum: '2026-09-29', text: 'Übergeben an Max Kollege' }, { id: 'h2', datum: '2026-10-10', text: 'Stand: abgeschlossen' }] };
  const a = R.anonymisieren(w);
  assert.equal(a.kundeId, ''); assert.equal(a.kundeGeloescht, true); assert.equal(a.anliegen, ''); assert.equal(a.notiz, '');
  assert.deepEqual(a.einwilligung, { ja: true, datum: '', form: '', rueckmeldung: false, widerrufen: '' });
  assert.deepEqual(a.verlauf, [{ datum: '2026-10-10', text: 'Stand: abgeschlossen' }]);
  assert.equal(a.anlass, 'baufinanzierung'); assert.equal(a.volumen, '300.000');
  assert.equal(w.kundeId, 'k1');                                    // Original unverändert
  const l = [{ ...w, datum: '2025-08-01', rueckmeldungAm: '2025-09-01' }, { ...w, datum: '2025-08-01', rueckmeldungAm: '2025-10-15' }, { ...w, stand: 'termin', datum: '2025-01-01' }, a];
  assert.deepEqual(R.alteErledigte(l, '2026-10-03').map(x => x.rueckmeldungAm), ['2025-09-01']);
});
