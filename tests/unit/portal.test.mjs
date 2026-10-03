/* Portal-Export (js/portal.js, D39): gesicherte Bewertung → Objekt → XML im Austauschformat OpenImmo 1.2.7 und ZIP mit Bildern.
   Reihenfolge der Elemente und Wertelisten stammen aus der Formatbeschreibung (Schema 1.2.7d, Mai 2026); das Schema selbst
   liegt nicht im Repository (Lizenz). Die erzeugte Datei liest Python unabhängig ein (tests/referenz/pruefe_openimmo.py).
   Nur synthetische Daten. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';

const require_ = createRequire(import.meta.url);
const P = require_('../../js/portal.js');
const O = require_('../../js/office.js');
const PY = pythonMit('json');
const pruefe = datei => pythonJson(PY, ['tests/referenz/pruefe_openimmo.py', datei]);

/* Reihenfolge laut Schema (Auszug: alle Elemente, die der Export schreiben kann, in Schemafolge) */
const FOLGE = {
  '.': ['objektkategorie', 'geo', 'kontaktperson', 'weitere_adresse', 'preise', 'bieterverfahren', 'versteigerung', 'flaechen', 'ausstattung',
    'zustand_angaben', 'bewertung', 'infrastruktur', 'freitexte', 'anhaenge', 'verwaltung_objekt', 'verwaltung_techn'],
  objektkategorie: ['nutzungsart', 'vermarktungsart', 'objektart'],
  geo: ['plz', 'ort', 'geokoordinaten', 'strasse', 'hausnummer', 'bundesland', 'land', 'gemeindecode', 'flur', 'flurstueck', 'gemarkung', 'etage'],
  kontaktperson: ['email_zentrale', 'email_direkt', 'tel_zentrale', 'tel_durchw', 'tel_fax', 'tel_handy', 'name', 'vorname', 'titel', 'anrede', 'position', 'anrede_brief', 'firma'],
  preise: ['kaufpreis', 'kaufpreisnetto', 'kaufpreisbrutto', 'nettokaltmiete', 'kaltmiete', 'warmmiete', 'nebenkosten', 'hausgeld', 'abstand',
    'provisionspflichtig', 'provision_teilen', 'innen_courtage', 'aussen_courtage', 'courtage_hinweis', 'provisionnetto', 'provisionbrutto', 'waehrung'],
  flaechen: ['wohnflaeche', 'nutzflaeche', 'gesamtflaeche', 'grundstuecksflaeche', 'sonstflaeche', 'anzahl_zimmer', 'anzahl_schlafzimmer', 'anzahl_badezimmer',
    'anzahl_stellplaetze', 'anzahl_wohneinheiten', 'anzahl_gewerbeeinheiten'],
  ausstattung: ['bad', 'kueche', 'boden', 'kamin', 'heizungsart', 'befeuerung', 'klimatisiert', 'fahrstuhl', 'stellplatzart', 'barrierefrei', 'unterkellert', 'gaestewc'],
  zustand_angaben: ['baujahr', 'letztemodernisierung', 'zustand', 'alter', 'energiepass'],
  'zustand_angaben/energiepass': ['epart', 'gueltig_bis', 'energieverbrauchkennwert', 'mitwarmwasser', 'endenergiebedarf', 'primaerenergietraeger', 'primaerenergiebedarf',
    'stromwert', 'waermewert', 'wertklasse', 'baujahr', 'ausstelldatum', 'jahrgang', 'gebaeudeart'],
  freitexte: ['objekttitel', 'dreizeiler', 'lage', 'ausstatt_beschr', 'objektbeschreibung', 'sonstige_angaben'],
  verwaltung_objekt: ['objektadresse_freigeben', 'verfuegbar_ab', 'abdatum', 'bisdatum', 'vermietet', 'denkmalgeschuetzt'],
  verwaltung_techn: ['objektnr_intern', 'objektnr_extern', 'aktion', 'aktiv_von', 'aktiv_bis', 'openimmo_obid', 'kennung_ursprung', 'stand_vom']
};
const PFLICHT = { '.': ['objektkategorie', 'geo', 'kontaktperson', 'verwaltung_techn'], verwaltung_techn: ['objektnr_extern', 'aktion', 'openimmo_obid', 'stand_vom'], geo: ['plz'], kontaktperson: ['name'] };
function folgeOk(kinder) {
  for (const [pfad, soll] of Object.entries(FOLGE)) {
    const ist = kinder[pfad]; if (!ist) continue;
    let letzte = -1;
    for (const t of ist) {
      const i = soll.indexOf(t);
      assert.ok(i >= 0, pfad + ': unerwartetes Element ' + t);
      assert.ok(i >= letzte, pfad + ': ' + t + ' steht vor einem Element, das laut Schema davor kommt (' + ist.join(', ') + ')');
      letzte = i;
    }
  }
  for (const [pfad, soll] of Object.entries(PFLICHT)) for (const t of soll) assert.ok((kinder[pfad] || []).includes(t), pfad + ': Pflichtelement ' + t + ' fehlt');
}

const KONTAKT = { name: 'Erika Beispiel', funktion: 'Immobilienberaterin', tel: '07062 000-0', mail: 'beratung@example.org', firma: 'Beispielbank eG' };
const HAUS = { ek_modus: 'haus', ek_typ: 'EFH freistehend · unterkellert, DG ausgebaut', ek_anschrift: 'Musterweg 7a, 74360 Ilsfeld', ek_wohnflaeche: '142,5',
  ek_gs_flaeche: '1.250', ek_baujahr: '1972', ek_anz_stell: '2', au_zimmer: '5,5', au_baeder: '2', au_kueche: 'EBK vorhanden (verbleibt)', au_keller: 'voll unterkellert',
  au_gaeste_wc: 'ja', au_heizung_art: 'Gas-Brennwert', au_heizung_bj: '2012', au_energieausweis: 'Verbrauchsausweis liegt vor', au_energiewert: '118,4',
  au_energieklasse: 'D', ex_preis: '489.000', ex_provision: '3,57 % inkl. MwSt.', ex_adresse: 'voll', au_lat: '49.0331', au_lon: '9.2502',
  ex_text_objekt: 'Gepflegtes Haus <mit> „Garten“ & Garage.', lage_mikro: 'Ruhige Lage.', ex_frei: 'nach Vereinbarung', od_denkmal: 'nein' };
const FOTOS = [{ id: 'f1', cat: 'objekt', caption: 'Ansicht', data: FOTO_JPEG }, { id: 'f2', cat: 'objekt', caption: '', data: FOTO_JPEG },
  { id: 'f3', cat: 'karte', caption: 'Lageplan', data: FOTO_JPEG }, { id: 'f4', cat: 'schaden', caption: 'Riss', data: FOTO_JPEG }];

test('Anschrift: Straße, Hausnummer, PLZ und Ort', () => {
  assert.deepEqual(P.anschrift('Musterweg 7a, 74360 Ilsfeld'), { plz: '74360', ort: 'Ilsfeld', strasse: 'Musterweg', hausnummer: '7a' });
  assert.deepEqual(P.anschrift('Am Alten Markt 12-14, 71717 Beilstein-Schmidhausen'), { plz: '71717', ort: 'Beilstein-Schmidhausen', strasse: 'Am Alten Markt', hausnummer: '12-14' });
  assert.deepEqual(P.anschrift('Lindenweg 5 74232 Abstatt'), { plz: '74232', ort: 'Abstatt', strasse: 'Lindenweg', hausnummer: '5' });
  assert.deepEqual(P.anschrift('Hauptstraße 3, Beilstein'), { plz: '', ort: 'Beilstein', strasse: 'Hauptstraße', hausnummer: '3' });
  assert.deepEqual(P.anschrift(''), { plz: '', ort: '', strasse: '', hausnummer: '' });
});

test('Objektart aus Gebäudetyp und Wohnungstyp, Nutzungsart passend (Wertelisten des Formats)', () => {
  const art = f => P.artVorschlag(P.leser(f));
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'EFH freistehend · unterkellert, Flachdach' }), 'haus:EINFAMILIENHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Doppel-/Reihenendhaus · unterkellert, DG ausgeb.' }), 'haus:DOPPELHAUSHAELFTE');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Reihenmittelhaus · unterkellert, DG ausgeb.' }), 'haus:REIHENMITTEL');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Mehrfamilienhaus · bis 6 WE' }), 'haus:MEHRFAMILIENHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Wohn-/Geschäftshaus (Mischnutzung)' }), 'zinshaus_renditeobjekt:WOHN_UND_GESCHAEFTSHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Geschäftshaus mit Wohnungen' }), 'zinshaus_renditeobjekt:WOHN_UND_GESCHAEFTSHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Geschäftshaus ohne Wohnungen' }), 'zinshaus_renditeobjekt:GESCHAEFTSHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Bürogebäude · Massivbau' }), 'buero_praxen:BUEROHAUS');
  assert.equal(art({ ek_modus: 'haus', ek_typ: 'Betriebs-/Werkstattgebäude · eingeschossig' }), 'hallen_lager_prod:WERKSTATT');
  assert.equal(art({ ek_modus: 'wohnung', ek_wtyp: 'Dachgeschosswohnung' }), 'wohnung:DACHGESCHOSS');
  assert.equal(art({ ek_modus: 'wohnung', ek_wtyp: '–' }), 'wohnung:ETAGE');
  const k = P.kategorie('zinshaus_renditeobjekt:WOHN_UND_GESCHAEFTSHAUS');
  assert.deepEqual([k.wohnen, k.gewerbe, k.anlage, k.attr], [true, true, true, 'zins_typ']);
  assert.deepEqual([P.kategorie('buero_praxen:BUEROHAUS').wohnen, P.kategorie('buero_praxen:BUEROHAUS').gewerbe], [false, true]);
  assert.equal(P.kategorie('unbekannt').schluessel, 'haus:EINFAMILIENHAUS');
  for (const [s] of P.ARTEN) assert.ok(P.kategorie(s).attr, s + ' ohne Typ-Attribut');
});

test('Energieträger: Kennwörter der Werteliste, Erdgas ist keine Erdwärme', () => {
  const t = P.traegerKennung;
  assert.equal(t('Erdgas'), 'GAS'); assert.equal(t('Gas-Brennwert'), 'GAS'); assert.equal(t('Heizöl'), 'OEL'); assert.equal(t('Öl-Niedertemperatur'), 'OEL');
  assert.equal(t('Fernwärme'), 'FERN'); assert.equal(t('Holz (Pellets)'), 'PELLET'); assert.equal(t('Scheitholz'), 'HOLZ'); assert.equal(t('Flüssiggas'), 'FLUESSIGGAS');
  assert.equal(t('Luft-Wasser-Wärmepumpe'), 'LUFTWP'); assert.equal(t('Sole-Wasser-Wärmepumpe'), 'ERDWAERME'); assert.equal(t('Strom (Wärmepumpe)'), 'ELEKTRO');
  assert.equal(t('Nachtspeicher'), 'ELEKTRO'); assert.equal(t('BHKW'), 'BLOCK'); assert.equal(t('unbekannt'), ''); assert.equal(t(''), '');
});

test('Energieausweis: Angaben wie im Exposé, Jahrgang aus dem Ausstellungsdatum, Pflichtangaben nach § 87 GModG', () => {
  const E = (f, e) => P.energie(P.leser(f), e);
  assert.equal(E(HAUS, { ausgestellt: '2014-04-30' }).jahrgang, '2008');
  assert.equal(E(HAUS, { ausgestellt: '2014-05-01' }).jahrgang, '2014');
  assert.equal(E(HAUS, { ausgestellt: '2026-08-01', jahrgang: '2026' }).jahrgang, '2026');
  assert.equal(E(HAUS, {}).jahrgang, '');
  assert.equal(E({ au_energieausweis: 'liegt nicht vor' }, {}).jahrgang, 'ohne');
  const e = E(HAUS, {});
  assert.deepEqual([e.art, e.wert, e.traeger, e.kennung, e.bj, e.klasse, e.wohn], ['Verbrauchsausweis', 118.4, 'Erdgas', 'GAS', '1972', 'D', true]);
  assert.deepEqual(P.energiePflicht(e), []);
  assert.deepEqual(P.energiePflicht(E({ ek_typ: 'EFH freistehend · unterkellert, DG ausgebaut' }, {})), ['Art des Energieausweises (oder „liegt nicht vor“)']);
  assert.deepEqual(P.energiePflicht(E({ ex_ea_art: 'Bedarfsausweis' }, {})), ['Endenergiewert', 'wesentlicher Energieträger', 'Baujahr laut Energieausweis', 'Energieeffizienzklasse']);
  // Nichtwohngebäude: Wärme und Strom, keine Klasse und kein Baujahr
  assert.deepEqual(P.energiePflicht(E({ ek_typ: 'Bürogebäude · Massivbau', ex_ea_art: 'Verbrauchsausweis', ex_ea_wert: '140', ex_ea_traeger: 'Heizöl' }, {})), ['Endenergiewert Strom']);
  assert.deepEqual(P.energiePflicht(E({ au_energieausweis: 'liegt nicht vor' }, {})), []);
});

test('Objekt: Zahlen wie die Bewertung, Anschrift nur mit Freigabe, Provision, Bilder wie im Exposé', () => {
  const o = P.objekt(Object.assign({}, HAUS, { ex_fotos: JSON.stringify(['f1', 'f2', 'f3']), ex_titelbild: 'f2' }),
    { projektId: 'p1759450000000', geaendert: 1759450000000, kontakt: KONTAKT, fotos: FOTOS, einstellung: { ausgestellt: '2019-03-01' } });
  assert.equal(o.flaechen.grund, 1250); assert.equal(o.flaechen.wohn, 142.5); assert.equal(o.flaechen.zimmer, 5.5); assert.equal(o.preis, 489000);
  assert.deepEqual([o.geo.plz, o.geo.ort, o.geo.strasse, o.geo.hausnummer, o.geo.lat, o.geo.lon], ['74360', 'Ilsfeld', 'Musterweg', '7a', 49.0331, 9.2502]);
  assert.deepEqual(o.provision, { text: '3,57 % inkl. MwSt.', pflichtig: true, mitMwst: true });
  assert.deepEqual([o.kontakt.vorname, o.kontakt.nachname], ['Erika', 'Beispiel']);
  assert.deepEqual(o.bilder.map(b => [b.id, b.gruppe, b.datei]), [['f2', 'TITELBILD', o.nr + '-01.jpg'], ['f1', 'BILD', o.nr + '-02.jpg'], ['f3', 'KARTEN_LAGEPLAN', o.nr + '-03.jpg']]);
  assert.equal(o.stand, '2025-10-03'); assert.equal(o.energie.jahrgang, '2014');
  assert.equal(o.texte.titel, 'Einfamilienhaus in Ilsfeld'); assert.match(o.texte.ausstattung, /• Einbauküche \(verbleibt\)/);
  // ohne Freigabe: nur PLZ und Ort, keine Koordinaten
  const g = P.objekt(Object.assign({}, HAUS, { ex_adresse: 'ort' }), { projektId: 'p1', kontakt: KONTAKT }).geo;
  assert.deepEqual([g.strasse, g.hausnummer, g.lat, g.lon, g.frei], ['', '', null, null, false]);
  assert.equal(P.objekt(HAUS, { projektId: 'p1', kontakt: KONTAKT, einstellung: { adresse: false } }).geo.strasse, '');
  // ohne Auswahl im Exposé: alle Objektfotos, keine Karten- oder Schadensfotos
  assert.deepEqual(P.bildAuswahl(HAUS, FOTOS).map(b => b.id), ['f1', 'f2']);
  assert.equal(P.objekt({ ex_provision: 'provisionsfrei' }, { projektId: 'p1' }).provision.pflichtig, false);
  // Wohnung: Etage und Hausgeld, keine Grundstücksfläche
  const w = P.objekt({ ek_modus: 'wohnung', ek_wtyp: 'Etagenwohnung', ek_etage: '2. OG mit Balkon', ek_hausgeld: '310', ek_gs_flaeche: '900' }, { projektId: 'p2' });
  assert.deepEqual([w.geo.etage, w.hausgeld, w.flaechen.grund], [2, 310, 0]);
  assert.equal(P.etage('EG'), 0); assert.equal(P.etage('Dachgeschoss'), null);
});

test('Prüfung: Pflichtangaben stoppen den Export, fehlende Kür nur als Hinweis', () => {
  const ok = P.pruefen(P.objekt(HAUS, { projektId: 'p1', kontakt: KONTAKT, fotos: FOTOS }), { firma: 'Beispielbank eG' });
  assert.equal(ok.ok, true); assert.deepEqual(ok.fehler, []);
  const leer = P.pruefen(P.objekt({}, { projektId: 'p1', kontakt: {} }), { firma: '' });
  assert.equal(leer.ok, false);
  for (const t of ['Firma des Anbieters', 'Postleitzahl', 'Ort', 'Name des Ansprechpartners', 'E-Mail oder Telefon', 'Art des Energieausweises']) assert.ok(leer.fehler.some(f => f.includes(t)), t);
  assert.ok(leer.hinweise.some(h => h.includes('Preis auf Anfrage')));
  assert.ok(ok.hinweise.some(h => h.includes('vollständige Anschrift')));
});

test('Kennungen: Objekt-Kennung fest aus der Projekt-Id, Aufbau wie in der Formatbeschreibung', () => {
  const a = P.obid('p1759450000000');
  assert.match(a, /^OIAP\d{17}[0-9A-Z]{10}$/);
  assert.equal(a, P.obid('p1759450000000')); assert.notEqual(a, P.obid('p1759450000001'));
  assert.equal(a.slice(4, 21), '20251003000640000');
  assert.match(P.anid(new Date(Date.UTC(2026, 9, 3, 10, 0, 0)), 'abc123def4'), /^AIAP20261003100000000ABC123DEF4$/);
  assert.equal(P.objektnrVorschlag('p1759450000000'), 'IA-' + (1759450000000).toString(36).toUpperCase());
  assert.equal(P.dateiTeil('IA 2026/001'), 'IA_2026_001');
});

test('XML: Aufbau und Reihenfolge laut Schema, Zahlen mit Punkt, Texte maskiert; ZIP mit Bildern liest Python', () => {
  const jetzt = new Date(2026, 9, 3, 12, 0, 0);
  const haus = P.objekt(Object.assign({}, HAUS, { ex_fotos: JSON.stringify(['f1', 'f2', 'f3']), ex_titelbild: 'f2' }),
    { projektId: 'p1759450000000', geaendert: 1759450000000, kontakt: KONTAKT, fotos: FOTOS, einstellung: { ausgestellt: '2019-03-01', gueltigBis: '2029-02-28' } });
  const etw = P.objekt({ ek_modus: 'wohnung', ek_wtyp: 'Dachgeschosswohnung', ek_anschrift: 'Lindenstraße 3, 71717 Beilstein', ek_wohnflaeche: '78', ek_hausgeld: '310',
    ek_etage: '2. OG', ex_ea_art: 'Bedarfsausweis', ex_ea_wert: '92', ex_ea_traeger: 'Fernwärme', ex_ea_klasse: 'C', ex_ea_baujahr: '1995' },
    { projektId: 'p1759460000000', kontakt: { name: 'Erika Beispiel', tel: '07062 1' }, fotos: [], aktion: 'CHANGE' });
  const buero = P.objekt({ ek_modus: 'haus', ek_typ: 'Bürogebäude · Massivbau', ek_anschrift: 'Gewerbestraße 1, 74232 Abstatt', ek_nutzflaeche: '640',
    ex_ea_art: 'Verbrauchsausweis', ex_ea_wert: '140', ex_ea_strom: '35', ex_ea_traeger: 'Heizöl' }, { projektId: 'p1759470000000', kontakt: KONTAKT, aktion: 'DELETE' });
  const xml = P.xml([haus, etw, buero], { firma: 'Beispielbank eG', nr: '12345', anid: 'AIAP20261003100000000ABC123DEF4' }, { jetzt });
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<openimmo>'));
  assert.ok(xml.includes('<objektbeschreibung>Gepflegtes Haus &lt;mit&gt; „Garten“ &amp; Garage.</objektbeschreibung>'));
  assert.ok(!/<(wohnflaeche|grundstuecksflaeche|anzahl_zimmer|kaufpreis)>[^<]*,/.test(xml), 'Dezimalkomma in einer Zahl');
  // Datei schreiben, als ZIP mit Bildern verpacken und unabhängig lesen
  const dir = mkdtempSync(join(tmpdir(), 'portal-'));
  const bild = O.dataUrlZuBild(FOTO_JPEG).bytes;
  const zip = O.zip([{ name: 'immobilien.xml', daten: xml }].concat(haus.bilder.map(b => ({ name: b.datei, daten: bild }))), jetzt);
  writeFileSync(join(dir, 'export.zip'), zip);
  const r = pruefe(join(dir, 'export.zip'));
  assert.equal(r.wurzel, 'openimmo'); assert.deepEqual(r.kinder, ['uebertragung', 'anbieter']);
  assert.deepEqual(r.uebertragung, { art: 'OFFLINE', umfang: 'TEIL', version: '1.2.7', sendersoftware: 'ImmoApp', senderversion: '1.0', timestamp: '2026-10-03T12:00:00' });
  assert.deepEqual(r.anbieter, ['anbieternr', 'firma', 'openimmo_anid']);
  assert.equal(r.immobilien.length, 3);
  r.immobilien.forEach(i => folgeOk(i.kinder));
  const [h, e, b] = r.immobilien;
  assert.deepEqual(h.attrs['objektkategorie/objektart/haus'], { haustyp: 'EINFAMILIENHAUS' });
  assert.deepEqual(h.attrs['objektkategorie/nutzungsart'], { WOHNEN: 'true', GEWERBE: 'false' });
  assert.deepEqual([h.werte['flaechen/wohnflaeche'], h.werte['flaechen/grundstuecksflaeche'], h.werte['flaechen/anzahl_zimmer'], h.werte['preise/kaufpreis']], ['142.5', '1250', '5.5', '489000']);
  assert.deepEqual([h.werte['geo/strasse'], h.werte['geo/hausnummer']], ['Musterweg', '7a']);
  assert.deepEqual(h.attrs['geo/geokoordinaten'], { breitengrad: '49.0331', laengengrad: '9.2502' });
  assert.deepEqual([h.werte['zustand_angaben/energiepass/epart'], h.werte['zustand_angaben/energiepass/energieverbrauchkennwert'], h.werte['zustand_angaben/energiepass/jahrgang'],
    h.werte['zustand_angaben/energiepass/gebaeudeart']], ['VERBRAUCH', '118.4', '2014', 'wohn']);
  assert.deepEqual(h.attrs['preise/aussen_courtage'], { mit_mwst: 'true' });
  assert.deepEqual(['anhaenge/anhang[1]', 'anhaenge/anhang[2]', 'anhaenge/anhang[3]'].map(p => h.attrs[p].gruppe), ['TITELBILD', 'BILD', 'KARTEN_LAGEPLAN']);
  for (let n = 1; n <= 3; n++) assert.ok(r.dateien.includes(h.werte['anhaenge/anhang[' + n + ']/daten/pfad']), 'Bild ' + n + ' fehlt im ZIP');
  assert.equal(h.attrs['verwaltung_techn/aktion'], undefined);              // neu: <aktion/> ohne Attribut
  assert.ok(h.kinder['verwaltung_techn'].includes('aktion'));
  assert.equal(h.werte['verwaltung_techn/stand_vom'], '2025-10-03');
  // Wohnung: ohne Freigabe nur PLZ und Ort, Etage, Hausgeld, Änderung
  assert.deepEqual(e.kinder.geo, ['plz', 'ort', 'land', 'etage']);
  assert.deepEqual([e.werte['geo/etage'], e.werte['preise/hausgeld'], e.werte['zustand_angaben/energiepass/endenergiebedarf'], e.werte['zustand_angaben/energiepass/primaerenergietraeger']], ['2', '310', '92', 'FERN']);
  assert.deepEqual(e.attrs['verwaltung_techn/aktion'], { aktionart: 'CHANGE' });
  assert.deepEqual(e.attrs['preise/kaufpreis'], { auf_anfrage: 'true' }); assert.equal(e.werte['preise/kaufpreis'], '0');
  assert.deepEqual(e.kinder.kontaktperson, ['tel_durchw', 'name', 'vorname']);
  // Büro: Gewerbe, Wärme und Strom statt Klasse, Löschen
  assert.deepEqual(b.attrs['objektkategorie/objektart/buero_praxen'], { buero_typ: 'BUEROHAUS' });
  assert.deepEqual([b.werte['zustand_angaben/energiepass/waermewert'], b.werte['zustand_angaben/energiepass/stromwert'], b.werte['zustand_angaben/energiepass/gebaeudeart']], ['140', '35', 'nichtwohn']);
  assert.equal(b.werte['zustand_angaben/energiepass/wertklasse'], undefined);
  assert.deepEqual(b.attrs['verwaltung_techn/aktion'], { aktionart: 'DELETE' });
  // Gesamtbestand
  assert.match(P.xml([haus], { firma: 'X', anid: 'A' }, { voll: true, jetzt }), /umfang="VOLL"/);
});
