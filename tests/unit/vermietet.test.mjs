// Einheitstests zu js/vermietet-regeln.js (D59): Vorkaufsrecht des Mieters (§ 577 BGB) mit Frist (§ 469 Abs. 2, §§ 187, 188, 193 BGB),
// Kündigungssperrfrist (§ 577a BGB, KSpVO BW), Eigenbedarf (§§ 573, 573a, 573c, 574 BGB), Kaution (§§ 550, 551, 566a, 566b BGB),
// Mitteilung nach der Umschreibung (§§ 566, 566e BGB), Anzeigen (§ 566 Abs. 1, § 558 Abs. 3 BGB). Nur synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/vermietet-regeln.js');
const G = require('../../js/vermietet-gebiete.js');

const HEUTE = '2026-09-29';
const einheit = x => Object.assign({ id: 'e1', bez: 'EG links', ueberlassenAm: '2019-04-01', kaltmiete: 800, kaution: 2400, kautionArt: 'bar', getrennt: 'ja', schriftlich: 'ja', befristet: 'nein', vorauszahlung: 'nein' }, x || {});
const fall = x => Object.assign({ we: 'begruendet', weAm: '2024-05-01', schonVerkauft: 'nein', gemeinde: 'Heilbronn', kaeuferseite: 'eine', nutzung: 'kapitalanlage', einheiten: [einheit()] }, x || {});
const bereich = (r, b) => r.ampeln.filter(a => a.bereich.startsWith(b));
const texte = (r, b) => bereich(r, b).map(a => a.stufe + ': ' + a.text).join('\n');

test('Fristrechner Vorkaufsrecht: Zugang + 2 Monate, Monatsende, § 193 BGB mit Feiertagen BW', () => {
  assert.equal(R.vorkaufsfrist('2026-10-01'), '2026-12-01');   // Dienstag
  assert.equal(R.vorkaufsfrist('2026-10-05'), '2026-12-07');   // 05.12. Samstag → Montag
  assert.equal(R.vorkaufsfrist('2026-12-31'), '2027-03-01');   // 28.02.2027 (Monatsletzter, § 188 Abs. 3) ist Sonntag
  assert.equal(R.vorkaufsfrist('2026-08-31'), '2026-11-02');   // 31.10. Samstag, 01.11. Allerheiligen (Sonntag)
  assert.equal(R.vorkaufsfrist('2026-10-24'), '2026-12-24');   // Heiligabend ist kein Feiertag
  assert.equal(R.vorkaufsfrist('2026-10-25'), '2026-12-28');   // 25. und 26.12. Feiertage, 27.12. Sonntag
  assert.equal(R.vorkaufsfrist(''), '');
});

test('Gemeinde aus der Anschrift und Gebietsliste KSpVO BW (GBl. 2025 Nr. 146) als Daten', () => {
  assert.equal(R.gemeindeAusAnschrift('Musterweg 7, 74072 Heilbronn'), 'Heilbronn');
  assert.equal(R.gemeindeAusAnschrift('Musterweg 7, 74360 Ilsfeld-Auenstein'), 'Ilsfeld-Auenstein');
  assert.equal(R.gemeindeAusAnschrift('Musterweg 7, Beilstein'), 'Beilstein');
  assert.equal(R.gemeindeAusAnschrift('Musterweg 7'), '');
  assert.ok(G.gemeinden.every(g => g.gueltigAb === '2026-01-01' && g.gueltigBis === '2026-12-31' && g.fundstelle === 'GBl. 2025 Nr. 146'));
  const j = (g, d) => R.sperrfristJahre(g, d || '2026-10-03');
  assert.equal(j('Heilbronn').jahre, 5);
  for (const g of ['Beilstein', 'Ilsfeld', 'Abstatt', 'Ilsfeld-Auenstein', 'Abstatt-Happenbach']) assert.equal(j(g).jahre, 3, g);
  assert.equal(j('Heilbronn-Böckingen').jahre, 5);
  assert.equal(j('Musterstadt').status, 'ungeprueft');   // Auszug der Liste: nicht stillschweigend 3 Jahre
  assert.equal(j('Musterstadt').jahre, null);
  assert.equal(j('').status, 'keineGemeinde');
  // nach dem 31.12.2026 keine gültige Liste → ungeklärt
  assert.deepEqual([j('Heilbronn', '2027-01-01').status, j('Beilstein', '2027-01-01').jahre], ['keineListe', null]);
  assert.equal(j('Beilstein', '2025-12-31').status, 'keineListe');
});

test('Vorkaufsrecht GRÜN: kein Wohnungseigentum, Aufteilung vor dem Einzug, Familienangehöriger, Zwangsversteigerung', () => {
  let r = R.pruefen(fall({ we: 'nein' }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'gruen'); assert.equal(r.vorkauf.besteht, false);
  assert.match(texte(r, 'Vorkauf'), /kein Wohnungs- oder Teileigentum und keine Aufteilung geplant \(§ 577 Abs\. 1 Satz 1 BGB\)/);
  r = R.pruefen(fall({ weAm: '2015-01-01' }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'gruen'); assert.match(texte(r, 'Vorkauf'), /vor der Überlassung begründet/);
  r = R.pruefen(fall({ kaeuferFamilie: true, beurkundetAm: '2026-09-15' }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'gruen'); assert.match(texte(r, 'Vorkauf'), /§ 577 Abs\. 1 Satz 2 BGB/);
  r = R.pruefen(fall({ zwangsversteigerung: true }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /^gruen: .*§ 471 BGB/);
  assert.equal(r.geklaert, true);
});

test('Vorkaufsrecht GELB: gesetzlicher Erbe höchstens gelb, schon verkauft/unbekannt, Paket, Teileigentum, Mietbeginn fehlt', () => {
  let r = R.pruefen(fall({ kaeuferErbe: true, beurkundetAm: '2026-09-15' }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'gelb'); assert.match(texte(r, 'Vorkauf'), /mit Notar klären: .*§ 470 BGB/);
  assert.equal(R.pruefen(fall({ schonVerkauft: 'unbekannt' }), HEUTE).vorkauf.stufe, 'gelb');
  assert.equal(R.pruefen(fall({ schonVerkauft: 'ja' }), HEUTE).vorkauf.besteht, 'unklar');
  r = R.pruefen(fall({ we: 'nein', paket: true }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /^gelb: .*§ 467 BGB/);
  r = R.pruefen(fall({ teileigentum: true }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /VIII ZR 201\/23/);
  r = R.pruefen(fall({ einheiten: [einheit({ ueberlassenAm: '' })] }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /^gelb: Mietbeginn fehlt – Vorkaufsrecht und Sperrfrist nicht prüfbar\./);
  assert.match(texte(r, 'Kündigungssperrfrist'), /nicht prüfbar/);
  // Mietbeginn ohne Bedeutung, wenn der Käufer zur Familie gehört
  assert.equal(R.pruefen(fall({ kaeuferFamilie: true, einheiten: [einheit({ ueberlassenAm: '' })] }), HEUTE).vorkauf.stufe, 'gruen');
});

test('Vorkaufsrecht ROT nach Beurkundung ohne Mitteilung; Frist mit Countdown, danach GRÜN; Ausübung', () => {
  let r = R.pruefen(fall(), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /^gelb: Mieter hat ein Vorkaufsrecht/);   // noch kein Kaufvertrag
  r = R.pruefen(fall({ beurkundetAm: '2026-09-15' }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'rot'); assert.match(texte(r, 'Vorkauf'), /^rot: Mieter hat Vorkaufsrecht – Mitteilung offen/);
  const mit = x => fall({ beurkundetAm: '2026-09-15', einheiten: [einheit(Object.assign({ mitteilungAm: '2026-09-25', zugangsnachweis: 'ja' }, x))] });
  r = R.pruefen(mit(), HEUTE);
  assert.equal(r.vorkauf.einheiten[0].fristEnde, '2026-11-25');
  assert.match(texte(r, 'Vorkauf'), /^gelb: Vorkaufsfrist läuft bis 25\.11\.2026 – noch 57 Tage\./);
  assert.doesNotMatch(texte(r, 'Vorkauf'), /Zugang der Mitteilung nicht nachgewiesen/);
  assert.match(texte(R.pruefen(mit({ zugangsnachweis: 'nein' }), HEUTE), 'Vorkauf'), /Zugang der Mitteilung nicht nachgewiesen/);
  r = R.pruefen(mit(), '2026-11-26');
  assert.equal(r.vorkauf.stufe, 'gruen'); assert.match(texte(r, 'Vorkauf'), /am 25\.11\.2026 ohne Ausübung abgelaufen/); assert.equal(r.geklaert, true);
  assert.equal(R.pruefen(mit(), '2026-11-25').vorkauf.stufe, 'gelb');   // letzter Tag der Frist
  r = R.pruefen(mit({ ausgeuebtAm: '2026-10-20', ausuebungSchriftlich: true }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'rot'); assert.match(texte(r, 'Vorkauf'), /§ 464 Abs\. 2 BGB.*Notar und Rechtsabteilung informieren.*§ 465 BGB/);
  r = R.pruefen(mit({ ausgeuebtAm: '2026-10-20' }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /^gelb: .*E-Mail oder ein Anruf genügt nicht \(§ 577 Abs\. 3, § 126 Abs\. 1 BGB\)/);
  r = R.pruefen(mit({ ausgeuebtAm: '2026-11-30', ausuebungSchriftlich: true }), HEUTE);
  assert.match(texte(r, 'Vorkauf'), /nach dem Fristende.*Ausschlussfrist/);
});

test('Mehrere Mieteinheiten: Ergebnis je Einheit, gleiche Aussagen zusammengefasst', () => {
  const r = R.pruefen(fall({ beurkundetAm: '2026-09-15', einheiten: [einheit(), einheit({ id: 'e2', bez: 'OG', ueberlassenAm: '2010-01-01' }), einheit({ id: 'e3', bez: 'DG', ueberlassenAm: '2025-01-01' })] }), HEUTE);
  assert.equal(r.vorkauf.stufe, 'rot');
  assert.deepEqual(r.vorkauf.einheiten.map(e => e.stufe), ['rot', 'rot', 'gruen']);
  assert.match(texte(r, 'Vorkauf'), /^rot: EG links, OG: Mieter hat Vorkaufsrecht/m);
  assert.match(texte(r, 'Vorkauf'), /^gruen: DG: Kein Vorkaufsrecht/m);
});

test('Kündigungssperrfrist: 5 Jahre in Heilbronn, 3 Jahre in Beilstein, Abs. 1a, Liste nicht aktuell, alte Veräußerung', () => {
  let r = R.pruefen(fall({ umschreibungAm: '2026-03-01' }), HEUTE);
  assert.deepEqual([r.sperr.gilt, r.sperr.jahre, r.sperr.ende, r.sperr.ab], [true, 5, '2031-03-01', '2031-03-02']);
  assert.match(texte(r, 'Kündigungssperrfrist'), /bis 1\.3\.2031: 5 Jahre ab der Veräußerung am 1\.3\.2026 \(§ 577a Abs\. 1 und 2 BGB i\. V\. m\. § 2 KSpVO BW, GBl\. 2025 Nr\. 146\)/);
  assert.match(texte(r, 'Kündigungssperrfrist'), /tritt mit Ablauf des 31\.12\.2026 außer Kraft.*Rechtsabteilung/);
  r = R.pruefen(fall({ gemeinde: 'Beilstein', umschreibungAm: '2026-03-01' }), HEUTE);
  assert.deepEqual([r.sperr.jahre, r.sperr.ende], [3, '2029-03-01']);
  assert.doesNotMatch(texte(r, 'Kündigungssperrfrist'), /KSpVO/);
  // Sperrfrist beginnt erst mit der Umschreibung
  r = R.pruefen(fall({ gemeinde: 'Ilsfeld' }), HEUTE);
  assert.equal(r.sperr.startOffen, true); assert.match(texte(r, 'Kündigungssperrfrist'), /von 3 Jahren ab der Umschreibung im Grundbuch \(§ 577a Abs\. 1 BGB; Gemeinde Ilsfeld\)/);
  // § 577a Abs. 1a: GbR oder mehrere Erwerber auch ohne Aufteilung; nicht bei einer Familie
  r = R.pruefen(fall({ we: 'nein', kaeuferseite: 'gesellschaft', gemeinde: 'Abstatt', umschreibungAm: '2026-06-01' }), HEUTE);
  assert.deepEqual([r.sperr.gilt, r.sperr.ende], [true, '2029-06-01']); assert.match(texte(r, 'Kündigungssperrfrist'), /§ 577a Abs\. 1a BGB/);
  r = R.pruefen(fall({ we: 'nein', kaeuferseite: 'mehrere', gemeinde: 'Heilbronn', umschreibungAm: '2026-06-01' }), HEUTE);
  assert.match(texte(r, 'Kündigungssperrfrist'), /auch ohne Aufteilung gilt.*Rechtsabteilung/);
  r = R.pruefen(fall({ we: 'nein', kaeuferseite: 'eine' }), HEUTE);
  assert.equal(r.sperr.gilt, false); assert.match(texte(r, 'Kündigungssperrfrist'), /^gruen: Keine Kündigungssperrfrist/);
  assert.equal(R.pruefen(fall({ weAm: '2015-01-01', kaeuferseite: 'mehrere' }), HEUTE).sperr.gilt, false);   // Abs. 1a Satz 2
  // Veräußerung 2027: keine gültige Gebietsliste → gelb, vorsichtig 5 Jahre
  r = R.pruefen(fall({ gemeinde: 'Beilstein', umschreibungAm: '2027-02-01' }), '2027-03-01');
  assert.deepEqual([r.sperr.jahre, r.sperr.ende3, r.sperr.ende5, r.sperr.ende], [null, '2030-02-01', '2032-02-01', '2032-02-01']);
  assert.match(texte(r, 'Kündigungssperrfrist'), /Gebietsliste nicht aktuell – Sperrfrist 3 oder 5 Jahre ungeklärt/);
  // erste Veräußerung nach der Aufteilung lange her: jedenfalls abgelaufen (höchstens zehn Jahre)
  r = R.pruefen(fall({ weAm: '2009-01-01', einheiten: [einheit({ ueberlassenAm: '2005-01-01' })], schonVerkauft: 'ja', ersteVeraeusserung: '2010-05-01' }), HEUTE);
  assert.match(texte(r, 'Kündigungssperrfrist'), /^gruen: Kündigungssperrfrist jedenfalls abgelaufen/);
  // erste Veräußerung fehlt
  r = R.pruefen(fall({ schonVerkauft: 'ja' }), HEUTE);
  assert.equal(r.sperr.gilt, 'unklar');
});

test('Eigenbedarf: ROT während der Sperrfrist, GELB mit Kündigungsfrist nach § 573c, § 573a, GRÜN bei Kapitalanlage', () => {
  let r = R.pruefen(fall({ nutzung: 'selbst', umschreibungAm: '2026-03-01' }), HEUTE);
  assert.match(texte(r, 'Eigenbedarf'), /^rot: Eigenbedarf erst ab 2\.3\.2031/);
  r = R.pruefen(fall({ nutzung: 'selbst' }), HEUTE);
  assert.match(texte(r, 'Eigenbedarf'), /^rot: Eigenbedarf erst nach Ablauf der Kündigungssperrfrist von 5 Jahren ab der Umschreibung/);
  r = R.pruefen(fall({ we: 'nein', nutzung: 'selbst', einheiten: [einheit({ ueberlassenAm: '2018-01-01' })] }), HEUTE);
  assert.match(texte(r, 'Eigenbedarf'), /^gelb: Eigenbedarf nur mit Kündigung: .*§ 573 Abs\. 1 und 3 BGB.*nach heutigem Stand 9 Monate \(§ 573c Abs\. 1 BGB\).*§ 574 BGB/);
  assert.equal(R.kuendigungsfristMonate('2023-01-01', HEUTE), 3);
  assert.equal(R.kuendigungsfristMonate('2021-09-28', HEUTE), 6);
  assert.equal(R.kuendigungsfristMonate('2021-09-29', HEUTE), 3);   // genau fünf Jahre: noch nicht „nach“ fünf Jahren
  assert.equal(R.kuendigungsfristMonate('2018-09-28', HEUTE), 9);
  r = R.pruefen(fall({ we: 'nein', nutzung: 'selbst', wohnungen: 2 }), HEUTE);
  assert.match(texte(r, 'Eigenbedarf'), /§ 573a Abs\. 1 BGB/);
  assert.doesNotMatch(texte(R.pruefen(fall({ we: 'nein', nutzung: 'selbst', wohnungen: 1 }), HEUTE), 'Eigenbedarf'), /§ 573a/);
  r = R.pruefen(fall({ nutzung: 'kapitalanlage' }), HEUTE);
  assert.equal(texte(r, 'Eigenbedarf'), 'gruen: Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB).');
  assert.match(texte(R.pruefen(fall({ nutzung: '' }), HEUTE), 'Eigenbedarf'), /^grau: Geplante Nutzung/);
});

test('Kaution und Mietvertrag: drei Monatsmieten, getrennte Anlage, Schriftform, Vorauszahlung, Abgleich mit dem Notarauftrag', () => {
  let r = R.pruefen(fall(), HEUTE);
  assert.equal(texte(r, 'Kaution'), 'gruen: Keine Auffälligkeiten bei Kaution und Mietvertrag (§§ 550, 551, 566b BGB).');
  r = R.pruefen(fall({ einheiten: [einheit({ kaution: 2500, getrennt: 'unbekannt', befristet: 'ja', schriftlich: 'nein', vorauszahlung: 'ja' })] }), HEUTE);
  const t = texte(r, 'Kaution');
  for (const n of ['§ 551 Abs. 1 BGB', '§ 551 Abs. 3 Satz 3 BGB', '§ 550 BGB', '§ 566b Abs. 1 BGB']) assert.ok(t.includes(n), n);
  assert.doesNotMatch(texte(R.pruefen(fall({ einheiten: [einheit({ kautionArt: 'buergschaft', getrennt: 'unbekannt' })] }), HEUTE), 'Kaution'), /getrennt/);
  r = R.pruefen(fall({ kautionenNotar: 3000 }), HEUTE);
  assert.match(texte(r, 'Kaution'), /Summe der Kautionen \(2\.400 €\) weicht vom Notarauftrag ab \(„Kautionen gesamt“ 3\.000 €\)/);
  assert.doesNotMatch(texte(R.pruefen(fall({ kautionenNotar: 2400 }), HEUTE), 'Kaution'), /Notarauftrag/);
});

test('Nach der Umschreibung: verfrühte Mitteilung ROT (§ 566e), fehlende Mitteilung GELB (§ 566 Abs. 2), Kaution ROT (§ 566a)', () => {
  let r = R.pruefen(fall(), HEUTE);
  assert.match(texte(r, 'Nach der Umschreibung'), /^grau: /);
  r = R.pruefen(fall({ mitteilungUebergangAm: '2026-09-20' }), HEUTE);
  assert.match(texte(r, 'Nach der Umschreibung'), /^rot: .*§ 566e Abs\. 1 BGB/);
  r = R.pruefen(fall({ umschreibungAm: '2026-09-01', mitteilungUebergangAm: '2026-08-20', kautionUebertragenAm: '2026-09-02' }), HEUTE);
  assert.equal(r.uebergang.stufe, 'rot');
  r = R.pruefen(fall({ umschreibungAm: '2026-09-01' }), HEUTE);
  assert.match(texte(r, 'Nach der Umschreibung'), /^gelb: .*§ 566 Abs\. 2 Satz 2 BGB/m);
  assert.match(texte(r, 'Nach der Umschreibung'), /^rot: Kaution noch nicht an den Käufer übertragen.*§ 566a Satz 2 BGB/m);
  r = R.pruefen(fall({ uebergabeAm: '2026-09-15' }), HEUTE);
  assert.match(texte(r, 'Nach der Umschreibung'), /^rot: Kaution noch nicht/m);
  r = R.pruefen(fall({ umschreibungAm: '2026-09-01', mitteilungUebergangAm: '2026-09-05', kautionUebertragenAm: '2026-09-02' }), HEUTE);
  assert.equal(r.uebergang.stufe, 'gruen');
});

test('Leer verkaufen, Anzeigen und Posten für die Kachel „Unterlagen“', () => {
  // D63: Verwertungskündigung bei erheblichen Nachteilen möglich (§ 573 Abs. 2 Nr. 3 Hs. 1 BGB), ausgeschlossen nur bei Aufteilung (Hs. 3)
  const leer = texte(R.pruefen(fall({ leerVerkaufen: true }), HEUTE), 'Verkauf ohne Mieter');
  assert.match(leer, /^gelb: Verkauf ist kein Kündigungsgrund für sich allein: Der Käufer tritt in den Mietvertrag ein \(§ 566 Abs\. 1 BGB\)/);
  assert.match(leer, /angemessenen Verwertung gehindert .* erhebliche Nachteile .*\(§ 573 Abs\. 2 Nr\. 3 Hs\. 1 BGB\)/);
  assert.match(leer, /Begründung von Wohnungseigentum verkauft werden soll \(Hs\. 3\) – Rechtsberatung, keine Vorlage in der App\.$/);
  assert.doesNotMatch(leer, /Verkauf ist kein Kündigungsgrund;/);
  assert.equal(bereich(R.pruefen(fall(), HEUTE), 'Verkauf ohne Mieter').length, 0);
  assert.deepEqual(R.anzeigePruefen('Schöne Wohnung, sofort frei!', true).map(x => x.stufe), ['rot']);
  assert.match(R.anzeigePruefen('Bezugsfrei ab Januar', true)[0].text, /„Bezugsfrei“.*§ 566 Abs\. 1 BGB/);
  assert.equal(R.anzeigePruefen('Frei ab 01.03.2027', true)[0].stufe, 'rot');
  assert.equal(R.anzeigePruefen('Mietfrei ab März, vermietet', true).length, 0);
  assert.deepEqual(R.anzeigePruefen('Gepflegte Wohnung', true).map(x => x.stufe), ['gelb']);
  assert.deepEqual(R.anzeigePruefen('Wohnung, sofort frei', false), []);
  assert.match(R.anzeigePruefen('Vermietet, mit Mietsteigerungspotenzial', true)[0].text, /20 %.*15 % \(§ 558 Abs\. 3 BGB\).*Rechtsabteilung/);
  let p = R.unterlagenPosten(R.pruefen(fall({ beurkundetAm: '2026-09-15' }), HEUTE));
  assert.deepEqual(p.map(x => x.key), ['vv_kaution', 'vv_mieterhoehungen', 'vv_mitteilung577', 'vv_mitteilung566']);
  assert.ok(p.every(x => x.name && x.stelle && R.UL_SCHLUESSEL.includes(x.key)));
  p = R.unterlagenPosten(R.pruefen(fall({ we: 'nein' }), HEUTE));
  assert.deepEqual(p.map(x => x.key), ['vv_kaution', 'vv_mieterhoehungen', 'vv_mitteilung566']);
});
