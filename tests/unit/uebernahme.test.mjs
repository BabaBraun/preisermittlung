// Einheitstests zu js/uebernahme-regeln.js (D64): Eckdaten-Datei prüfen, Vorauswahl, Umsetzung in Felder der neuen Bewertung,
// Anleitung für Claude — und Abgleich der kopierten Listen mit der App (index.html, src/*.js, js/kern.js). Nur synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../../js/uebernahme-regeln.js');
const K = require('../../js/kern.js');

const lies = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const HTML = lies('index.html');
const konstante = (datei, name) => {
  const m = lies(datei).match(new RegExp('const ' + name + '\\s*=\\s*([\\s\\S]*?\\]);'));
  assert.ok(m, name + ' in ' + datei);
  return Function('return ' + m[1].replace(/;$/, ''))();
};
const BEISPIEL = JSON.parse(lies('tests/fixtures/eckdaten-beispiel.json'));
const HEUTE = '2026-10-07';
const datei = (werte, mehr) => Object.assign({ immoapp_eckdaten: 1, objektart: 'wohnhaus', werte }, mehr || {});
const w = (feld, wert, mehr) => Object.assign({ feld, wert, quelle: 'Unterlage, S. 1', sicher: true }, mehr || {});

test('Abgleich: Listen der Regeln stimmen mit der App überein', () => {
  assert.deepEqual(R.UNTERLAGEN, konstante('src/pwa.js', 'AU_UNTERLAGEN'));
  assert.deepEqual(R.BAUTEILE, konstante('src/form.js', 'AU_BAUTEILE'));
  assert.deepEqual(R.MODERNISIERUNG, K.MOD_ELEMENTS);
  assert.deepEqual(R.BGF_GESCHOSSE, konstante('src/form.js', 'GESCHOSSE'));
  assert.match(lies('src/form.js'), new RegExp('const N_GESCH=' + R.N_GESCH + ';'));
  assert.deepEqual(R.RAUM_GESCHOSSE, konstante('src/rooms.js', 'RL_GESCHOSSE'));
  assert.match(lies('src/rooms.js'), new RegExp('const N_RL=' + R.N_RAEUME + ';'));
  assert.deepEqual(R.ANRECHNUNG, konstante('src/rooms.js', 'RL_FAKTOREN').map(([k, , t]) => [k, t]));
  const typen = [...lies('src/base.js').match(/const TYPES = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s*'([^']+)':/gm)].map(m => m[1]);
  assert.deepEqual(R.TYPEN, typen);
  const vordrucke = lies('src/form.js').match(/const VORDRUCKE = \[([\s\S]*?)\n\];/)[1];
  R.OBJEKTARTEN.forEach(([, id, , modus]) => assert.match(vordrucke, new RegExp("id:'" + id + "'[^}]*modus:'" + modus + "'"), id));
  const umfang = konstante('src/aufnahme.js', 'AU_MOD_UMFANG').map(x => x[0]).filter(Boolean);
  R.FELDER.filter(f => /^au_mod_u/.test(f.id)).forEach(f => assert.deepEqual(f.optionen, umfang));
});

test('Abgleich: jedes Feld gibt es in der Bewertung, Auswahlfelder mit genau den Werten der Bewertung', () => {
  const erzeugt = /^(au_ul\d+|au_bt\d+|au_mod_[uj]\d)$/;
  for (const f of R.FELDER) {
    if (f.ziel === 'portal') continue;
    if (!erzeugt.test(f.id)) assert.ok(HTML.includes('id="' + f.id + '"'), f.id + ' fehlt in index.html');
    const sel = HTML.match(new RegExp('<select id="' + f.id + '"[^>]*>([\\s\\S]*?)</select>'));
    if (f.typ === 'wahl' && sel) {
      const opt = [...sel[1].matchAll(/<option(?: value="([^"]*)")?[^>]*>([^<]*)<\/option>/g)].map(m => m[1] != null ? m[1] : m[2]).filter(v => v && v !== '–');
      assert.deepEqual(f.optionen, opt, f.id);
    }
  }
  // Spiegelung des Energieausweises nur auf vorhandene Werte
  const opt = id => [...HTML.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'))[1].matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map(m => m[1]);
  for (const art of R.FELD.ex_ea_art.optionen) {
    const s = R.EA_SPIEGEL.ex_ea_art(art);
    assert.ok(opt('au_energieausweis').includes(s.au_energieausweis), art);
    assert.ok(opt('od_energieausweis').includes(s.od_energieausweis), art);
  }
  R.KLASSEN.forEach(k => assert.ok(opt('au_energieklasse').includes(k), k));
  // keine Personenfelder
  for (const id of ['ek_ag', 'ek_kunde_id', 'ex_k_name', 'ek_ersteller']) assert.equal(R.FELD[id], undefined, id);
});

test('Zahlen: deutsch geschrieben und von der Bewertung wieder genauso gelesen', () => {
  assert.equal(R.zahl('1.250'), 1250);
  assert.equal(R.zahl('142,5'), 142.5);
  assert.equal(R.zahl('14.400,50 €'), 14400.5);
  assert.equal(R.zahl('142.5'), 142.5);
  assert.ok(Number.isNaN(R.zahl('ca. 140')));
  for (const x of [1250, 142.5, 0.35, 450000, 98.44, 3]) {
    assert.equal(K.zahlLesen(R.deZahl(x), true), x);
    assert.equal(K.zahlLesen(R.deZahl(x), false), x);
  }
  assert.equal(R.deZahl(10.49 * 8.74), '91,68');
});

test('Beispieldatei: Vorauswahl nur für sichere Angaben mit Quelle, passend zur Objektart, ohne Namen', () => {
  const e = R.pruefen(BEISPIEL, { heute: HEUTE });
  assert.equal(e.ok, true);
  assert.equal(e.objektart, 'wohnhaus');
  assert.equal(e.modus, 'haus');
  assert.equal(e.typ, 'Doppel-/Reihenendhaus · unterkellert, DG ausgeb.');
  const x = id => e.eintraege.find(z => z.feld === id);
  assert.deepEqual([x('ek_wohnflaeche').schreib, x('ek_wohnflaeche').anzeige, x('ek_wohnflaeche').vorwahl], ['142,5', '142,5 m²', true]);
  assert.deepEqual([x('ek_miete_wohnen').schreib, x('ek_miete_wohnen').vorwahl], ['14400', false]);          // unsicher
  assert.equal(x('od_heizung').schreib, 'Wärmepumpe');                                                         // Groß-/Kleinschreibung
  assert.equal(x('od_nutzungsart').schreib, 'WA – allgemeines Wohngebiet');                                   // Kürzel
  assert.equal(x('au_mod_u3').schreib, 'voll');                                                                // „vollständig erneuert“
  assert.deepEqual(x('od_abt2').warnungen, ['Enthält vielleicht einen Namen oder ein Geburtsdatum.']);
  assert.equal(x('od_abt2').vorwahl, false);
  assert.match(x('ek_mea').warnungen[0], /nur für Wohnungen/);
  assert.equal(x('ek_mea').vorwahl, false);
  assert.deepEqual(e.verworfen, [{ was: 'ek_ag', grund: 'Feld gibt es in der Liste nicht' }]);
  assert.deepEqual(e.geschosse.map(g => [g.index, g.name, g.flaeche, g.vorwahl]), [[1, 'Erdgeschoss', 10.49 * 8.74, true], [3, 'Dachgeschoss', 70.2, true], [4, 'Spitzboden', 30, false]]);
  assert.deepEqual(e.raeume.map(r => [r.name, r.geschoss, r.anrechnung, r.anrechnungVorgeschlagen]), [['Wohnzimmer', 'EG', 'voll', false], ['Balkon', 'DG', 'bal', true]]);
  assert.deepEqual(e.fehlt, ['Bodenrichtwert', 'Baulastenauskunft']);
  assert.equal(e.widersprueche.length, 1);
  assert.deepEqual(R.zaehlen(e, {}), { gesamt: 24, gewaehlt: 20, unsicher: 2, warnungen: 4, verworfen: 1 });
  // als Wohnung: Hausangaben ohne Vorauswahl, Miteigentumsanteil mit
  const wg = R.pruefen(BEISPIEL, { heute: HEUTE, objektart: 'wohnung' });
  assert.equal(wg.eintraege.find(z => z.feld === 'ek_mea').vorwahl, true);
  assert.equal(wg.eintraege.find(z => z.feld === 'ek_gs_flaeche').vorwahl, false);
  assert.ok(wg.geschosse.every(g => !g.vorwahl));
  assert.equal(wg.typWarnung, 'Der Gebäudetyp gilt nur für Häuser.');
});

test('Umsetzung: Felder, Spiegelung Energieausweis, Portal-Export, Geschosse, Räume; eigene Auswahl geht vor', () => {
  const e = R.pruefen(BEISPIEL, { heute: HEUTE });
  const a = R.anwenden(e, { 'f:ek_miete_wohnen': true, 'f:ek_baujahr': false, 'g:4': true });
  assert.equal(a.felder.ek_miete_wohnen, '14400');
  assert.equal(a.felder.ek_baujahr, undefined);
  assert.equal(a.felder.ek_mea, undefined);
  assert.equal(a.felder.od_abt2, undefined);
  assert.deepEqual([a.felder.au_energieausweis, a.felder.od_energieausweis, a.felder.au_energiewert, a.felder.au_energieklasse, a.felder.od_effizienz],
    ['Bedarfsausweis liegt vor', 'Bedarfsausweis', '98,4', 'C', 'C']);
  assert.deepEqual(a.portal, { ausgestellt: '2019-05-14' });
  assert.deepEqual([a.felder.bgfhg_l1, a.felder.bgfhg_b1, a.felder.bgfhg_e1, a.felder.bgfhg_e3, a.felder.bgfhg_e4, a.felder.bgfhg_n4], ['10,49', '8,74', '0', '70,2', '30', 'Spitzboden']);
  assert.deepEqual(a.raeume, [{ name: 'Wohnzimmer', gesch: 'EG', fl: '31,2', faktor: 'voll', src: '', manuell: true },
    { name: 'Balkon', gesch: 'DG', fl: '8', faktor: 'bal', src: '', manuell: true }]);
  assert.equal(a.felder.au_ul0, true);
  assert.equal(a.n, 21);
});

test('Prüfung: Fehler und Grenzen', () => {
  assert.equal(R.pruefen(null).ok, false);
  assert.match(R.pruefen({ objekt: 'x' }).fehler, /keine Eckdaten-Datei/);
  assert.match(R.pruefen({ immoapp_eckdaten: 2 }).fehler, /Fassung/);
  const e = R.pruefen(datei([
    w('ek_baujahr', 1998.5), w('ek_baujahr', 1999), w('ek_anz_we', 2.5), w('ek_wohnflaeche', -3), w('ek_wohnflaeche', '120'),
    w('od_heizung', 'Kohle'), w('ea_ausgestellt', '2027-01-02'), w('ea_gueltig_bis', '14.05.2026'), w('od_bauweise', 'Massiv', { quelle: '' }),
    w('au_ul3', 'nein'), w('au_ul4', 'vielleicht'), w('gebaeude_besch', 'x'.repeat(4001)), w('ek_sanierung', 2032)
  ], { objektart: 'Wohnhaus', gebaeudetyp: 'Villa' }), { heute: HEUTE });
  const v = Object.fromEntries(e.verworfen.map(x => [x.was, x.grund]));
  assert.match(v['Baujahr des Hauptgebäudes'], /Jahr zwischen/);
  assert.match(v['Anzahl Wohneinheiten'], /ganze Zahl/);
  assert.match(v['Heizung'], /keiner der Werte/);
  assert.match(v['Energieausweis ausgestellt am'], /Zukunft/);
  assert.match(v['Gebäudetyp'], /Villa/);
  assert.match(v['Gebäudebeschreibung'], /zu lang/);
  assert.match(v['Letzte Sanierung'], /2031/);
  assert.equal(v['Wohnfläche'], 'zu klein (mindestens 1)');
  assert.match(v['Unterlage liegt vor'] || v['Energieausweis'], /ja oder nein/);
  const x = id => e.eintraege.find(z => z.feld === id);
  assert.equal(x('ek_baujahr').schreib, '1999');                       // erster gültiger Wert
  assert.equal(x('ek_wohnflaeche').schreib, '120');
  assert.equal(x('au_ul3'), undefined);                                 // „nein“: nichts anzukreuzen
  assert.deepEqual([x('ea_gueltig_bis').schreib, x('ea_gueltig_bis').warnungen], ['2026-05-14', ['Der Energieausweis ist abgelaufen.']]);
  assert.deepEqual([x('od_bauweise').schreib, x('od_bauweise').vorwahl, x('od_bauweise').warnungen], ['massiv', false, ['Ohne Quelle.']]);
  assert.equal(e.objektart, 'wohnhaus');
  // doppelt: zweiter Wert verworfen, erster verliert die Vorauswahl
  const d = R.pruefen(datei([w('ek_wohnflaeche', 120), w('ek_wohnflaeche', 125)]), { heute: HEUTE });
  assert.equal(d.eintraege[0].vorwahl, false);
  assert.match(d.verworfen[0].grund, /doppelt/);
  // Geschosse: höchstens zwei freie, Länge nur mit Breite; Räume: höchstens 40
  const g = R.pruefen(datei([], { geschosse: [{ geschoss: 'EG', laenge: 10 }, { geschoss: 'EG', flaeche: 80 }, { geschoss: 'Erdgeschoss', flaeche: 81 },
    { geschoss: '2. OG', flaeche: 50 }, { geschoss: '3. OG', flaeche: 50 }], raeume: Array.from({ length: 42 }, (_, i) => ({ name: 'Raum ' + i, flaeche: 10, geschoss: 'OG' })) }), { heute: HEUTE });
  assert.deepEqual(g.geschosse.map(x => [x.index, x.name]), [[1, 'Erdgeschoss'], [4, 'Erdgeschoss'], [5, '2. OG']]);
  assert.ok(g.verworfen.some(x => /Länge und Breite nur zusammen/.test(x.grund)));
  assert.ok(g.verworfen.some(x => /höchstens zwei weitere/.test(x.grund)));
  assert.equal(g.raeume.length, 40);
  assert.match(g.raeume[0].warnungen[0], /Geschoss „OG“ unbekannt/);
});

test('Namen und Geburtsdaten in Texten werden erkannt', () => {
  for (const t of ['Wohnrecht für Herrn Muster', 'Eheleute Beispiel', 'Nießbrauch für A. B., geb. 01.02.1950', 'geboren 1950']) assert.equal(R.nameVerdacht(t), true, t);
  for (const t of ['Wohnrecht für eine Person', 'Grundschuld 200.000 € für die Volksbank', 'Frau und Mann']) assert.equal(R.nameVerdacht(t), false, t);
});

test('Anleitung für Claude: alle Felder, Gebäudetypen, Regeln ohne Namen', () => {
  const t = R.anleitung();
  for (const f of R.FELDER) assert.ok(t.includes('- ' + f.id + ' — '), f.id);
  for (const typ of R.TYPEN) assert.ok(t.includes('"' + typ + '"'), typ);
  assert.match(t, /Keine Namen von Personen/);
  assert.match(t, /Nettokaltmiete im JAHR/);
  assert.match(t, /"immoapp_eckdaten": 1/);
  // das Beispiel im Format ist selbst eine gültige Datei (ohne Kommentare)
  const json = t.slice(t.indexOf('{\n'), t.indexOf('\n}') + 2).replace(/\s*\/\/.*$/gm, '');
  const e = R.pruefen(JSON.parse(json), { heute: HEUTE });
  assert.equal(e.ok, true);
  assert.equal(e.verworfen.length, 0);
});
