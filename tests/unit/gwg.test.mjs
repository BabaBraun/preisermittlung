// Einheitstests zu js/gwg-regeln.js (Kachel „Geldwäsche-Prüfung“): Auslöser je Seite, Checkliste je Person, Ausnahmen,
// Abgleich mit dem Notarauftrag, nachträgliche Identifizierung, Aufbewahrung, Regelwerk und erlaubte Felder. Nur synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../js/gwg-regeln.js');

const HEUTE = '2026-09-29';
let n = 0;
const zeile = (seite, rolle, o = {}) => ({ id: 'z' + (++n), kundeId: o.kundeId || 'k' + n, rolle, seite, art: 'person', vertretungArt: '', erforderlich: 'ja', grund: '', maklerFirma: '',
  identifizierung: 'offen', datum: '', kuerzel: '', vertretungGeprueft: false, vertretungAm: '', wbAbgeklaert: false, wbAm: '', pepImBanksystem: false, pepAm: '',
  zweck: '', abschluss: false, abschlussAm: '', abschlussKuerzel: '', ...o });
const fertig = (seite, rolle, o = {}) => zeile(seite, rolle, { identifizierung: 'erledigt', datum: '2026-09-20', kuerzel: 'FB', wbAbgeklaert: true, wbAm: '2026-09-20',
  pepImBanksystem: true, pepAm: '2026-09-20', zweck: rolle === 'verkaeufer' ? 'verkauf' : 'eigennutzung', vertretungGeprueft: true, vertretungAm: '2026-09-20',
  abschluss: true, abschlussAm: '2026-09-21', abschlussKuerzel: 'FB', ...o });

test('Rechtsstand und Normen als Datentabelle', () => {
  assert.match(G.FASSUNG, /Art\. 12 Abs\. 4 des Gesetzes vom 29\. Juni 2026 \(BGBl\. 2026 I Nr\. 197\)/);
  assert.equal(G.FASSUNG_KURZ, 'GwG, zuletzt geändert am 29.06.2026');
  assert.equal(G.NORMEN.zeitpunkt, '§ 11 Abs. 2 Satz 1 GwG');
  assert.equal(G.NORMEN.makler, '§ 11 Abs. 2 Satz 2 GwG');
  assert.equal(G.NORMEN.bargeld, '§ 16a Abs. 1 GwG');
  assert.equal(G.REGELWERKE.amlr.ab, '2027-07-10');
});

test('Auslöser: ab angenommenem Gebot, Reservierung oder Notarauftrag beide Seiten rot (§ 11 Abs. 2 Satz 1 GwG); Verkäufer gelb ab Auftrag', () => {
  assert.deepEqual(G.seitenAusloeser('kaeufer', {}, 'gwg').stufe, '');
  assert.equal(G.seitenAusloeser('kaeufer', { auftrag: true }, 'gwg').stufe, '');
  // ernsthaftes Interesse und bestimmte Vertragsparteien: fällig, nicht erst „bald fällig“
  const g = G.seitenAusloeser('kaeufer', { gebot: true }, 'gwg');
  assert.deepEqual([g.stufe, g.gruende], ['rot', ['Gebot im Bieterverfahren angenommen']]);
  assert.equal(G.seitenAusloeser('kaeufer', { reserviert: true }, 'gwg').stufe, 'rot');
  assert.deepEqual(G.REGELWERKE.gwg.kaeufer.gelb, []);
  const k = G.seitenAusloeser('kaeufer', { gebot: true, notar: true }, 'gwg');
  assert.deepEqual([k.stufe, k.gruende], ['rot', ['Gebot im Bieterverfahren angenommen', 'Notarauftrag angelegt']]);
  assert.match(k.norm, /§ 11 Abs\. 2 Satz 1 GwG, § 10 Abs\. 9 GwG/);
  assert.equal(G.seitenAusloeser('verkaeufer', { auftrag: true }, 'gwg').stufe, 'gelb');
  assert.equal(G.seitenAusloeser('verkaeufer', { auftrag: true }, 'gwg').gruende[0], 'Auftrag erteilt oder Maklervertrag geschlossen');
  assert.equal(G.seitenAusloeser('verkaeufer', { auftrag: true, gebot: true }, 'gwg').stufe, 'rot');
  assert.equal(G.seitenAusloeser('verkaeufer', { auftrag: true, reserviert: true }, 'gwg').stufe, 'rot');
  assert.equal(G.seitenAusloeser('verkaeufer', { notar: true }, 'gwg').stufe, 'rot');
  // dieselbe Tatsache, dieselbe Norm: beide Seiten gleich
  const x = G.vorgangAuswerten({ personen: [zeile('verkaeufer', 'verkaeufer'), zeile('kaeufer', 'kaeufer')] }, { reserviert: true }, { heute: HEUTE });
  assert.deepEqual([x.seiten.verkaeufer.stufe, x.seiten.kaeufer.stufe, x.zeilen.map(z => z.stufe)], ['rot', 'rot', ['rot', 'rot']]);
  // AMLR ab 10.07.2027: das angenommene Angebot löst die Prüfung aus — nur eine Einstellung
  assert.equal(G.seitenAusloeser('kaeufer', { gebot: true }, 'amlr').stufe, 'rot');
  assert.equal(G.seitenAusloeser('verkaeufer', { gebot: true }, 'amlr').stufe, 'rot');
  assert.equal(G.seitenAusloeser('kaeufer', {}, 'unbekannt').stufe, '');   // unbekanntes Regelwerk → GwG
});

test('Datum: leer, ungültig, Zukunft wird abgelehnt; Kürzel ohne Namen', () => {
  assert.equal(G.datumPruefen('', HEUTE), 'leer');
  assert.equal(G.datumPruefen('2026-02-30', HEUTE), 'ungueltig');
  assert.equal(G.datumPruefen('2026-09-30', HEUTE), 'zukunft');
  assert.equal(G.datumPruefen('2026-09-29', HEUTE), '');
  assert.equal(G.kuerzel(' F. B.<script> '), 'F.B.scri');
  assert.equal(G.kuerzel('Fabian Braun'), 'FabianBr');
});

test('Checkliste: Vertragspartei mit Identifizierung, wirtschaftlich Berechtigtem, Zweck und PEP; Abschluss macht grün', () => {
  const z = zeile('kaeufer', 'kaeufer');
  assert.deepEqual(G.punkte(z, [z], HEUTE).map(p => p.key), ['identifizierung', 'wb', 'zweck', 'pep']);
  let e = G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], ausloeser: { stufe: 'rot' } });
  assert.equal(e.stufe, 'rot');
  assert.equal(e.pflichtFehlt.length, 4);
  assert.equal(G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], ausloeser: { stufe: '' } }).stufe, 'offen');
  const f = fertig('kaeufer', 'kaeufer', { abschluss: false, abschlussAm: '', abschlussKuerzel: '' });
  e = G.zeileAuswerten(f, { heute: HEUTE, zeilen: [f], ausloeser: { stufe: 'rot' } });
  assert.deepEqual([e.stufe, e.pflichtFehlt.length, e.fehlt.map(x => x.key)], ['gelb', 0, ['abschluss']]);
  assert.equal(G.zeileAuswerten(fertig('kaeufer', 'kaeufer'), { heute: HEUTE, zeilen: [], ausloeser: { stufe: 'rot' } }).stufe, 'gruen');
  // Identifizierung braucht Datum und Kürzel; ein Datum in der Zukunft zählt nicht
  const ohne = fertig('kaeufer', 'kaeufer', { kuerzel: '' });
  assert.deepEqual(G.zeileAuswerten(ohne, { heute: HEUTE, zeilen: [ohne] }).pflichtFehlt.map(x => x.key), ['identifizierung']);
  const zukunft = fertig('kaeufer', 'kaeufer', { pepAm: '2026-10-05' });
  assert.deepEqual(G.zeileAuswerten(zukunft, { heute: HEUTE, zeilen: [zukunft] }).pflichtFehlt.map(x => x.key), ['pep']);
});

test('Datum in der Zukunft (z. B. Zwischenstand beim Tippen): Punkt bleibt offen und nennt den Grund, statt das Feld zu leeren', () => {
  const z = fertig('kaeufer', 'kaeufer', { pepAm: '2026-10-28', abschluss: false, abschlussAm: '', abschlussKuerzel: '' });
  const e = G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], ausloeser: { stufe: 'rot' } });
  assert.deepEqual([e.stufe, e.pflichtFehlt.map(x => x.text)], ['rot', ['PEP-Abgleich im Banksystem erledigt (Datum liegt in der Zukunft)']]);
  assert.equal(e.text, 'Offen: PEP-Abgleich im Banksystem erledigt (Datum liegt in der Zukunft)');
  assert.equal(z.pepAm, '2026-10-28');   // die Regeln ändern die Eingabe nicht
  const leer = fertig('kaeufer', 'kaeufer', { wbAm: '' });
  assert.deepEqual(G.zeileAuswerten(leer, { heute: HEUTE, zeilen: [leer] }).pflichtFehlt.map(x => x.text), ['Handelt auf eigene Rechnung — abgefragt (Datum eintragen)']);
  const id = fertig('kaeufer', 'kaeufer', { datum: '2026-09-30', kuerzel: '' });
  assert.deepEqual(G.zeileAuswerten(id, { heute: HEUTE, zeilen: [id] }).pflichtFehlt.map(x => x.text),
    ['Identifizierung im Banksystem mit Datum und Kürzel (Datum liegt in der Zukunft, Kürzel „durch wen“ eintragen)']);
  // nicht abgehakt: kein Zusatz
  assert.equal(G.punkte(zeile('kaeufer', 'kaeufer'), [], HEUTE).find(p => p.key === 'pep').text, 'PEP-Abgleich im Banksystem erledigt');
});

test('Abschluss abgehakt, aber ohne Kürzel: die App nennt das Kürzel statt erneut den Abschluss zu verlangen', () => {
  const z = fertig('kaeufer', 'kaeufer', { abschluss: true, abschlussAm: '2026-09-29', abschlussKuerzel: '' });
  let e = G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], ausloeser: { stufe: 'rot' } });
  assert.deepEqual([e.stufe, e.text, e.fehlt.map(x => x.text)], ['gelb', 'Alle Punkte erledigt — Abschluss: Kürzel „durch wen“ eintragen.', ['Abschluss: Kürzel „durch wen“ eintragen']]);
  e = G.zeileAuswerten({ ...z, abschlussAm: '2026-10-01', abschlussKuerzel: 'FB' }, { heute: HEUTE, zeilen: [z] });
  assert.equal(e.text, 'Alle Punkte erledigt — Abschluss: Datum liegt in der Zukunft.');
  e = G.zeileAuswerten({ ...z, abschluss: false, abschlussAm: '' }, { heute: HEUTE, zeilen: [z] });
  assert.deepEqual([e.text, e.fehlt.map(x => x.text)], ['Alle Punkte erledigt — Abschluss im Banksystem mit Datum und Kürzel bestätigen.', ['Abschluss: Sorgfaltspflichten im Banksystem vollständig dokumentiert']]);
  assert.equal(G.zeileAuswerten({ ...z, abschlussKuerzel: 'FB' }, { heute: HEUTE, zeilen: [z] }).stufe, 'gruen');
});

test('Keine Daten in Dokumenten für Dritte: Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO); § 47 Abs. 1 GwG nur für Meldung, Ermittlung, Auskunftsverlangen', () => {
  assert.equal(G.NORMEN.datenminimierung, 'Art. 5 Abs. 1 lit. c DSGVO');
  assert.equal(G.NORMEN.weitergabe, '§ 47 Abs. 1 GwG');
});

test('Bestandskunde: „bereits früher identifiziert“ nur mit Datum und Kürzel; wirtschaftlich Berechtigter, Zweck und PEP bleiben offen', () => {
  const z = zeile('verkaeufer', 'verkaeufer', { identifizierung: 'frueher', datum: '2026-09-15' });
  let e = G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], ausloeser: { stufe: 'gelb' } });
  assert.deepEqual(e.pflichtFehlt.map(x => x.key), ['identifizierung', 'wb', 'zweck', 'pep']);
  // Vermerk „bei früherer Gelegenheit identifiziert“: § 8 Abs. 2 Satz 5 GwG (Satz 6 ist der elektronische Identitätsnachweis)
  assert.equal(G.NORMEN.frueher, '§ 11 Abs. 3 Satz 1, § 8 Abs. 2 Satz 5 GwG');
  assert.match(e.pflichtFehlt[0].norm, /§ 11 Abs\. 3 Satz 1, § 8 Abs\. 2 Satz 5 GwG/);
  assert.equal(e.pflichtFehlt[0].text, 'Vermerk „bereits früher identifiziert“ mit Datum und Kürzel (Kürzel „durch wen“ eintragen)');
  const z2 = { ...z, kuerzel: 'FB' };
  e = G.zeileAuswerten(z2, { heute: HEUTE, zeilen: [z2], ausloeser: { stufe: 'gelb' } });
  assert.deepEqual([e.stufe, e.pflichtFehlt.map(x => x.key)], ['gelb', ['wb', 'zweck', 'pep']]);
});

test('Auftretende Person: Berechtigung geprüft; wirtschaftlich Berechtigter: PEP; Gesellschaft braucht eigene Zeilen', () => {
  const v = zeile('verkaeufer', 'vertreter', { vertretungArt: 'betreuer' });
  assert.deepEqual(G.punkte(v, [v], HEUTE).map(p => p.key), ['identifizierung', 'vertretung']);
  const fv = fertig('verkaeufer', 'vertreter', { vertretungGeprueft: false, vertretungAm: '' });
  const ev = G.zeileAuswerten(fv, { heute: HEUTE, zeilen: [fv] });
  assert.deepEqual([ev.pflichtFehlt.map(x => x.key), ev.identifiziert], [['vertretung'], false]);
  const wb = zeile('kaeufer', 'wb');
  assert.deepEqual(G.punkte(wb, [wb], HEUTE).map(p => p.key), ['identifizierung', 'pep']);
  const ges = fertig('kaeufer', 'kaeufer', { art: 'gesellschaft' });
  let e = G.zeileAuswerten(ges, { heute: HEUTE, zeilen: [ges] });
  assert.deepEqual(e.pflichtFehlt.map(x => x.key), ['wbZeile', 'vertreterZeile']);
  assert.match(G.punkte(ges, [ges], HEUTE).find(p => p.key === 'wb').text, /Transparenzregister/);
  const alle = [ges, fertig('kaeufer', 'wb'), fertig('kaeufer', 'vertreter', { vertretungArt: 'organ' })];
  e = G.zeileAuswerten(ges, { heute: HEUTE, zeilen: alle });
  assert.equal(e.stufe, 'gruen');
});

test('Ausnahmen grau: Gegenseite mit eigenem Makler (mit Firma), Miete unter 10.000 €; ab 10.000 € wie beim Kauf', () => {
  const m = zeile('kaeufer', 'kaeufer', { erforderlich: 'nein', grund: 'makler' });
  let e = G.zeileAuswerten(m, { heute: HEUTE, zeilen: [m], ausloeser: { stufe: 'rot' } });
  assert.equal(e.stufe, 'rot');
  assert.equal(e.pflichtFehlt[0].text, 'Name der Maklerfirma der Gegenseite');
  e = G.zeileAuswerten({ ...m, maklerFirma: 'Beispiel Immobilien GmbH' }, { heute: HEUTE, ausloeser: { stufe: 'rot' } });
  assert.equal(e.stufe, 'grau');
  assert.match(e.text, /Beispiel Immobilien GmbH.*§ 11 Abs\. 2 Satz 2 GwG/);
  const mi = zeile('kaeufer', 'kaeufer', { erforderlich: 'nein', grund: 'miete' });
  assert.equal(G.zeileAuswerten(mi, { heute: HEUTE, geschaeft: 'miete', nettokaltmiete: '9.500' }).stufe, 'grau');
  e = G.zeileAuswerten(mi, { heute: HEUTE, geschaeft: 'miete', nettokaltmiete: '10.000', ausloeser: { stufe: 'gelb' } });
  assert.equal(e.stufe, 'gelb');
  assert.match(e.pflichtFehlt[0].text, /Ab 10\.000 € .* dieselbe Liste wie beim Kauf/);
  assert.equal(G.zeileAuswerten(mi, { heute: HEUTE, geschaeft: 'kauf', nettokaltmiete: '900' }).stufe, 'offen');
  assert.equal(G.zahl('12.500,50'), 12500.5);
  assert.equal(G.zahl('9.500'), 9500);
});

test('Nachträglich: Identifizierung nach Übermittlung des Notarauftrags (§ 56 Abs. 1 Satz 1 Nr. 27 GwG)', () => {
  const z = fertig('kaeufer', 'kaeufer', { datum: '2026-09-25' });
  assert.equal(G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], notarUebermittelt: '2026-09-20' }).nachtraeglich, true);
  assert.equal(G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], notarUebermittelt: '2026-09-25' }).nachtraeglich, false);
  assert.equal(G.zeileAuswerten(z, { heute: HEUTE, zeilen: [z], notarUebermittelt: '' }).nachtraeglich, false);
});

test('Abgleich mit dem Notarauftrag: über Kunden-Id oder Namen, falsche Seite, offen, gelöschte Kunden', () => {
  const zeilen = [fertig('verkaeufer', 'verkaeufer', { kundeId: 'k_v' }), zeile('kaeufer', 'kaeufer', { kundeId: 'k_k' }), fertig('verkaeufer', 'verkaeufer', { kundeId: 'k_e' })];
  const namen = { k_e: 'Hans Verkaufbeispiel' };
  const gleich = (name, z) => !!namen[z.kundeId] && name.split(/[ ,]+/).sort().join(' ') === namen[z.kundeId].split(' ').sort().join(' ');
  const np = [{ seite: 'verkaeufer', kundeId: 'k_v', name: 'Erika Verkaufbeispiel' }, { seite: 'verkaeufer', kundeId: '', name: 'Verkaufbeispiel, Hans' },
    { seite: 'kaeufer', kundeId: 'k_k', name: 'Max Kaufbeispiel' }, { seite: 'kaeufer', kundeId: '', name: 'Ida Neubeispiel' }, { seite: 'kaeufer', kundeId: 'k_v', name: '' },
    { seite: 'kaeufer', kundeId: '', name: '(Kunde gelöscht)' }, { seite: 'kaeufer', kundeId: '', name: '  ' }];
  const a = G.notarAbgleich(np, zeilen, gleich);
  assert.deepEqual(a.map(x => [x.name || x.kundeId, x.ok, x.grund]), [['Erika Verkaufbeispiel', true, ''], ['Verkaufbeispiel, Hans', true, ''], ['Max Kaufbeispiel', false, 'offen'],
    ['Ida Neubeispiel', false, 'fehlt'], ['k_v', false, 'seite']]);
});

test('Vorgang: Seiten, Notar fehlt → rot, identifiziert für den Verkaufsfahrplan', () => {
  const zv = fertig('verkaeufer', 'verkaeufer', { kundeId: 'k_v' }), zk = fertig('kaeufer', 'kaeufer', { kundeId: 'k_k', abschluss: false, abschlussAm: '', abschlussKuerzel: '' });
  let x = G.vorgangAuswerten({ personen: [] }, { auftrag: true }, { heute: HEUTE });
  assert.deepEqual([x.seiten.verkaeufer.stufe, x.seiten.kaeufer.stufe, x.identifiziert, x.stufe], ['gelb', 'offen', false, 'gelb']);
  x = G.vorgangAuswerten({ personen: [zv, zk] }, { auftrag: true, gebot: true }, { heute: HEUTE });
  assert.deepEqual([x.seiten.verkaeufer.stufe, x.seiten.kaeufer.stufe, x.identifiziert], ['gruen', 'gelb', true]);
  // Notarauftrag mit einer weiteren Käuferin (z. B. Ehepartnerin tritt dazu): automatisch rot, nicht mehr identifiziert
  x = G.vorgangAuswerten({ personen: [zv, zk] }, { notar: true }, { heute: HEUTE, notarPersonen: [{ seite: 'kaeufer', kundeId: 'k_k2', name: 'Eva Kaufbeispiel' }, { seite: 'kaeufer', kundeId: 'k_k', name: '' }] });
  assert.deepEqual([x.seiten.kaeufer.stufe, x.seiten.kaeufer.fehlenImNotar.map(f => f.name), x.identifiziert, x.stufe], ['rot', ['Eva Kaufbeispiel'], false, 'rot']);
  // Gegenseite mit eigenem Makler: grau zählt als erledigt
  const zm = zeile('kaeufer', 'kaeufer', { erforderlich: 'nein', grund: 'makler', maklerFirma: 'Beispiel Immobilien GmbH' });
  x = G.vorgangAuswerten({ personen: [zv, zm] }, { notar: true }, { heute: HEUTE });
  assert.deepEqual([x.seiten.kaeufer.stufe, x.identifiziert], ['gruen', true]);
});

test('Aufbewahrung im Banksystem: 5 Jahre ab Jahresende, Vernichtung spätestens nach 10 Jahren (§ 8 Abs. 4 GwG)', () => {
  assert.deepEqual(G.aufbewahrung('2026-11-15'), { fristBeginn: '2026-12-31', aufbewahrenBis: '2031-12-31', vernichtenSpaetestens: '2036-12-31' });
  assert.equal(G.aufbewahrung(''), null);
});

test('Regelwerk: Hinweis ab 10.07.2027 und bei verfrühter Umstellung', () => {
  assert.equal(G.regelwerkHinweis('2026-09-29', 'gwg'), '');
  assert.match(G.regelwerkHinweis('2027-07-10', 'gwg'), /Seit 10\.07\.2027 gilt die EU-Geldwäscheverordnung/);
  assert.match(G.regelwerkHinweis('2027-07-09', 'amlr'), /gilt erst ab 10\.07\.2027/);
  assert.equal(G.regelwerkHinweis('2027-08-01', 'amlr'), '');
});

test('Nur erlaubte Felder: keine Ausweisdaten, kein PEP-Ergebnis, kein Verdacht, kein Freitext', () => {
  const roh = { id: 'gw1', art: 'gwg', projektId: 'p1', notiz: 'Freitext', verdacht: 'x', notarUebermittelt: '2026-13-01',
    personen: [{ ...zeile('kaeufer', 'kaeufer'), ausweisNr: 'L01X00T47', geburtsdatum: '1980-01-01', staatsangehoerigkeit: 'x', pepErgebnis: 'ja', mittelherkunft: 'x' }, null] };
  const b = G.bereinigen(roh);
  assert.deepEqual(Object.keys(b).sort(), ['art', 'id', 'notarUebermittelt', 'personen', 'projektId']);
  assert.equal(b.notarUebermittelt, '');
  assert.equal(b.personen.length, 1);
  assert.deepEqual(Object.keys(b.personen[0]), G.ZEILE_FELDER);
  for (const verboten of ['ausweis', 'geburt', 'staat', 'pepErgebnis', 'herkunft', 'verdacht', 'notiz', 'steuer']) {
    assert.ok(!G.ZEILE_FELDER.some(f => f.toLowerCase().includes(verboten.toLowerCase())), verboten);
    assert.ok(!G.VORGANG_FELDER.some(f => f.toLowerCase().includes(verboten.toLowerCase())), verboten);
  }
});
