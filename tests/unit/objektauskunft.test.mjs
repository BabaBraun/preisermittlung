// Einheitstests zu js/objektauskunft-regeln.js (D61): Vorbelegung aus der Bewertung, Fragen, Prüfung, Unterschrift je Stand
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/objektauskunft-regeln.js');

const alle = (wert, text = '') => Object.fromEntries(R.FRAGEN.map(q => [q.key, { wert, text }]));

test('Vorbelegung: Mängel, Feuchtigkeit, Schädlinge aus Aufnahmebogen und Objektdaten — Standardsatz bleibt weg', () => {
  const v = R.ausBewertung({ au_maengel: 'Feuchtefleck Kellerwand Nordseite; Dachrinne undicht', maengel: R.STANDARD_MAENGEL });
  assert.deepEqual(v.antworten.maengel, { wert: 'ja', text: 'Feuchtefleck Kellerwand Nordseite; Dachrinne undicht', von: 'Mängel (Aufnahmebogen)' });
  assert.deepEqual(v.antworten.feuchtigkeit, { wert: 'ja', text: 'Feuchtefleck Kellerwand Nordseite', von: 'Mängel (Aufnahmebogen)' });
  assert.equal(v.antworten.schaedlinge, undefined);
  const w = R.ausBewertung({ maengel: 'Holzwurm im Dachstuhl, nicht mehr aktiv. Kein Schimmel erkennbar.' });
  assert.equal(w.antworten.maengel.von, 'Mängel (Objektdaten)');
  assert.equal(w.antworten.schaedlinge.text, 'Holzwurm im Dachstuhl');
  assert.equal(w.antworten.feuchtigkeit, undefined);           // verneint
  assert.deepEqual(R.ausBewertung({ maengel: 'Keine Mängel erkennbar.' }).antworten, {});   // Beobachtung, keine Angabe des Eigentümers
  assert.deepEqual(R.ausBewertung({}).antworten, {});
});

test('Vorbelegung: Baulasten, Altlasten, Rechte in Abt. II, Denkmalschutz', () => {
  const v = R.ausBewertung({ od_baulasten: 'keine Eintragungen', od_altlasten: 'Öltank 2010 entfernt', od_abt2: 'Geh- und Fahrtrecht zugunsten Flst. 12/3',
    rechte_lasten: 'Leitungsrecht der Netze BW', od_denkmal: 'ja (Kulturdenkmal)' }).antworten;
  assert.deepEqual([v.baulasten.wert, v.baulasten.text], ['nein', '']);
  assert.deepEqual([v.altlasten.wert, v.altlasten.text], ['ja', 'Öltank 2010 entfernt']);
  assert.deepEqual([v.rechte.wert, v.rechte.text], ['ja', 'Grundbuch Abt. II: Geh- und Fahrtrecht zugunsten Flst. 12/3; Leitungsrecht der Netze BW']);
  assert.deepEqual([v.denkmal.wert, v.denkmal.text], ['ja', 'Kulturdenkmal']);
  const w = R.ausBewertung({ od_baulasten: 'unbekannt', od_altlasten: 'kein Verdacht bekannt', od_abt2: 'keine', od_denkmal: 'nein' }).antworten;
  assert.equal(w.baulasten.wert, 'unbekannt');
  assert.equal(w.altlasten.wert, 'nein');
  assert.equal(w.rechte.wert, 'nein');
  assert.equal(w.denkmal, undefined);                          // Vorgabe des Auswahlfelds — wird nicht übernommen
  assert.equal(R.ausBewertung({ od_denkmal: 'Teil / Ensembleschutz' }).antworten.denkmal.text, 'Teil / Ensembleschutz');
  assert.equal(R.ausBewertung({ od_baulasten: 'keinerlei Eintragungen' }).antworten.baulasten.wert, 'nein');
  assert.equal(R.ausBewertung({ od_baulasten: '–' }).antworten.baulasten.wert, 'nein');
});

test('Vorbelegung: Vermietung nur ob, ohne Text; Wohnungseigentum', () => {
  const v = R.ausBewertung({ vermietung_besch: 'EG vermietet an Herrn Muster, OG eigengenutzt' });
  assert.deepEqual(v.antworten.vermietet, { wert: 'ja', text: '', von: 'Vermietungssituation (Objektdaten)' });   // kein Name übernommen
  assert.equal(R.ausBewertung({ vermietung_besch: 'Das Objekt ist nicht vermietet; bezugsfrei.' }).antworten.vermietet.wert, 'nein');
  assert.equal(R.ausBewertung({ vermietung_besch: 'EG nicht vermietet, OG vermietet' }).antworten.vermietet.wert, 'ja');
  assert.equal(R.ausBewertung({ ek_modus: 'wohnung' }).weg, true);
  assert.equal(R.ausBewertung({ od_eigentum: 'Wohnungseigentum (WEG)' }).weg, true);
  assert.equal(R.ausBewertung({ od_eigentum: 'Alleineigentum' }).weg, false);
});

test('Vorschläge nur in leere Antworten; Herkunft „aus der Bewertung“ und „geändert“', () => {
  const r = { antworten: { baulasten: { wert: 'ja', text: 'Abstandsflächenbaulast' } } };
  const n = R.anwenden(r, R.ausBewertung({ od_baulasten: 'keine', od_denkmal: 'ja (Kulturdenkmal)', ek_modus: 'wohnung' }));
  assert.equal(n, 1);
  assert.equal(r.antworten.baulasten.wert, 'ja');               // Angabe des Eigentümers bleibt
  assert.equal(R.herkunft(r.antworten.denkmal), 'bewertung');
  assert.equal(R.herkunft(r.antworten.baulasten), '');
  assert.equal(r.weg, true);
  r.antworten.denkmal.text = 'Kulturdenkmal, Fassade';
  assert.equal(R.herkunft(r.antworten.denkmal), 'geaendert');
  assert.equal(R.anwenden(r, R.ausBewertung({ od_denkmal: 'ja (Kulturdenkmal)' })), 0);
});

test('Fragen je Eintrag: Wohnungseigentum, Nachfrage zu Umbauten', () => {
  const keys = r => R.fragenFuer(r).map(q => q.key);
  assert.equal(keys({}).includes('sonderumlage'), false);
  assert.deepEqual(keys({ weg: true }).filter(k => ['sonderumlage', 'verfahren'].includes(k)), ['sonderumlage', 'verfahren']);
  assert.equal(keys({ antworten: { umbauten: { wert: 'nein' } } }).includes('ohneGenehmigung'), false);
  assert.equal(keys({ antworten: { umbauten: { wert: 'ja' } } }).includes('ohneGenehmigung'), true);
  assert.equal(keys({}).length, 11);
});

test('Prüfung: offene Fragen, Erläuterung bei „ja“, Mieten ohne Namen, Sonderumlage, unbekannt → Unterlagen', () => {
  let p = R.pruefen({}, '2026-09-29');
  assert.equal(p.rot, 2);
  assert.match(p.liste[0].text, /Eigentümer aus der Kundenakte/);
  assert.match(p.liste[1].text, /^11 Fragen sind noch nicht beantwortet: Bekannte Mängel, /);
  const r = { kundeIds: ['k1'], weg: true, antworten: alle('nein'), mieten: {}, sonderumlageBetrag: '' };
  Object.assign(r.antworten, { maengel: { wert: 'ja', text: '' }, vermietet: { wert: 'ja', text: 'EG an Herrn Beispiel' }, sonderumlage: { wert: 'ja', text: 'Dach' },
    baulasten: { wert: 'unbekannt', text: '' }, ohneGenehmigung: { wert: 'ja', text: 'Carport' }, umbauten: { wert: 'ja', text: 'Carport 2015' }, denkmal: { wert: 'unbekannt' } });
  p = R.pruefen(r, '2026-09-29');
  const t = p.liste.map(x => x.text).join('\n');
  assert.equal(p.rot, 0);
  assert.match(t, /„Bekannte Mängel“ mit „ja“ beantwortet — bitte kurz erläutern\./);
  assert.match(t, /Zahl der vermieteten Einheiten und Summe der Nettokaltmieten/);
  assert.match(t, /keine Namen von Mietern/);
  assert.match(t, /Sonderumlage: Anteil dieser Wohnung/);
  assert.match(t, /„Baulasten“ unbekannt — Auskunft aus dem Baulastenverzeichnis in der Kachel „Unterlagen“ anfordern\./);
  assert.match(t, /Umbauten ohne Genehmigung: vor dem Notartermin mit dem Notariat klären\./);
  assert.match(t, /Denkmalschutz unbekannt — bei der Gemeinde nachfragen\./);
  assert.match(t, /Noch nicht unterschrieben\./);
  assert.equal(p.liste.find(x => x.ul).ul, 'baulasten');
  Object.assign(r, { mieten: { anzahl: '2', kaltmiete: '1.250' }, sonderumlageBetrag: '4.000' });
  r.antworten.vermietet.text = '';
  const t2 = R.pruefen(r, '2026-09-29').liste.map(x => x.text).join('\n');
  assert.doesNotMatch(t2, /Nettokaltmieten|Namen von Mietern|Sonderumlage:|„Vermietung“ mit „ja“/);   // Zahl und Summen genügen als Erläuterung
  assert.equal(R.mieterNamenVerdacht('vermietet an Frau Dr. Probe'), true);
  assert.equal(R.mieterNamenVerdacht('Frau und Herr sind ausgezogen'), false);
  assert.equal(R.zahl('1.250,50'), 1250.5);
});

test('Unterschrift gilt je Stand: Änderung an Antwort, Mieten oder Text macht sie ungültig, weitere Eigentümer nicht', () => {
  const r = { projektId: 'p1', kundeIds: ['k1'], antworten: alle('nein'), mieten: {}, unterschriften: {} };
  const s = R.inhaltSchluessel(r, 'Text A');
  r.unterschriften.k1 = { bild: 'data:image/png;base64,AA', zeit: '2026-03-15T09:00:00.000Z', datum: '2026-03-15', inhalt: s };
  assert.deepEqual(R.gueltigeUnterschriften(r, s), ['k1']);
  assert.equal(R.inhaltSchluessel(r, '  Text   A '), s);           // Leerraum egal
  r.kundeIds.push('k2');
  assert.equal(R.inhaltSchluessel(r, 'Text A'), s);                 // Eigentümer hinzu: Stand gleich
  let p = R.pruefen(r, '2026-03-20', { schluessel: s });
  assert.equal(p.fertig, false);
  assert.match(p.liste.map(x => x.text).join('\n'), /Unterschrieben: 1 von 2\./);
  assert.notEqual(R.inhaltSchluessel(r, 'Text B'), s);
  const r2 = JSON.parse(JSON.stringify(r)); r2.antworten.altlasten.text = 'Öltank';
  assert.notEqual(R.inhaltSchluessel(r2, 'Text A'), s);
  const r3 = JSON.parse(JSON.stringify(r)); r3.mieten.kaltmiete = '900';
  assert.notEqual(R.inhaltSchluessel(r3, 'Text A'), s);
  assert.equal(R.ungueltigeEntfernen(r2, R.inhaltSchluessel(r2, 'Text A')), 1);
  assert.deepEqual(r2.unterschriften, {});
  const r4 = JSON.parse(JSON.stringify(r)); r4.kundeIds = ['k2'];
  assert.equal(R.ungueltigeEntfernen(r4, s), 1);                     // gehört zu niemandem mehr
  assert.match(R.pruefsumme('x'), /^[0-9a-f]{14}$/);
});

test('Fertig, Vorschlag der App, Alter über sechs Monate (§ 188 Abs. 2 und 3 BGB)', () => {
  const r = { projektId: 'p1', kundeIds: ['k1'], antworten: alle('nein'), unterschriften: {} };
  const s = R.inhaltSchluessel(r, 'T');
  r.unterschriften.k1 = { bild: 'data:,', datum: '2026-03-31', inhalt: s };
  let p = R.pruefen(r, '2026-09-30', { schluessel: s, textVorschlag: true });
  assert.equal(p.fertig, true);
  assert.deepEqual(p.liste, [{ stufe: 'gruen', text: 'Vom Eigentümer unterschrieben am 31.03.2026.' }]);   // kein Vorschlag-Hinweis nach der Unterschrift
  p = R.pruefen(r, '2026-10-01', { schluessel: s });
  assert.equal(p.liste[1].text, 'Unterschrieben am 31.03.2026 — sechs Monate sind am 30.09.2026 abgelaufen. Mit dem Eigentümer prüfen, ob die Angaben noch stimmen.');
  delete r.unterschriften.k1;
  p = R.pruefen(r, '2026-10-01', { schluessel: s, textVorschlag: true, datum: x => '[' + x + ']' });
  assert.match(p.liste.map(x => x.text).join('\n'), /Vorschlag der App — mit der Rechtsabteilung abstimmen/);
  r.antworten.denkmal = { wert: 'ja', text: 'Kulturdenkmal', bw: { wert: 'ja', text: 'Kulturdenkmal', von: 'x' } };
  assert.match(R.pruefen(r, '2026-10-01').liste.map(x => x.text).join('\n'), /1 Antwort aus der Bewertung vorbelegt \(Denkmalschutz\) — mit dem Eigentümer durchgehen\./);
});
