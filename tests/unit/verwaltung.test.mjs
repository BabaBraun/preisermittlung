/* Liegenschaftsverwaltung — Rechenkern der Mietverwaltung (js/verwaltung.js) gegen die unabhängige
   Vergleichsrechnung tests/referenz/verwaltung_sollwerte.py (erzeugt verwaltung_sollwerte.json) und gegen Grenzfälle. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const V = require('../../js/verwaltung.js');
const FAELLE = JSON.parse(readFileSync(new URL('../referenz/verwaltung_faelle.json', import.meta.url), 'utf8'));
const SOLL = JSON.parse(readFileSync(new URL('../referenz/verwaltung_sollwerte.json', import.meta.url), 'utf8'));
const ST = FAELLE.stichtag;

test('Ostersonntag 2020–2035 wie die Gaußsche Osterformel', () => {
  for (const [j, d] of Object.entries(SOLL.ostern)) assert.equal(V.ostersonntag(+j), d, 'Ostern ' + j);
});

test('Fälligkeit: dritter Werktag 2025–2027 (Samstag zählt nicht, Feiertage BW)', () => {
  for (const [m, d] of Object.entries(SOLL.dritterWerktag)) assert.equal(V.dritterWerktag(m), d, m);
  // Einzelfälle mit Begründung: 01.01. Feiertag, 03.01. Samstag, 06.01. Heilige Drei Könige
  assert.equal(V.dritterWerktag('2026-01'), '2026-01-07');
  // Karfreitag 03.04. und Ostermontag 06.04.2026
  assert.equal(V.dritterWerktag('2026-04'), '2026-04-07');
});

for (const fall of FAELLE.vertraege) {
  test('Vergleichsrechnung: ' + fall.name, () => {
    const s = SOLL.vertraege[fall.name], v = fall.vertrag;
    const sortiert = a => a.slice().sort((x, y) => (x.faellig + x.id < y.faellig + y.id ? -1 : 1));
    assert.deepEqual(V.sollstellung(v, ST).map(p => ({ id: p.id, faellig: p.faellig, betrag: p.betrag })), sortiert(s.soll), 'Sollstellung');
    const op = V.offenePosten(v, fall.zahlungen, ST, { aufschlag: fall.wohnraum ? 5 : 9 });
    assert.deepEqual(op.posten.map(p => ({ id: p.id, bezahlt: p.bezahlt, offen: p.offen, zinsen: p.zinsen, status: p.status })), s.posten, 'offene Posten');
    for (const k of ['soll', 'rueckstand', 'guthaben', 'zinsen']) assert.equal(op.summe[k], s.summe[k], 'Summe ' + k);
    const ks = V.kuendigungsschwelle(op, v, ST);
    assert.equal(ks.a, s.schwelle.a, 'Schwelle a'); assert.equal(ks.b, s.schwelle.b, 'Schwelle b');
    assert.equal(ks.monatsmiete, s.schwelle.monatsmiete);
    const k = V.kaution(v, fall.zahlungen, ST);
    assert.equal(k.hoechst, s.kaution.hoechst); assert.equal(k.ist, s.kaution.ist); assert.equal(k.faelligOffen, s.kaution.faelligOffen);
    assert.deepEqual(k.raten, s.kaution.raten);
  });
}

test('Vergleichsrechnung: Leerstand und entgangene Kaltmiete', () => {
  const l = FAELLE.leerstand;
  assert.deepEqual(V.leerstand(l.liegenschaft, l.von, l.bis), SOLL.leerstand);
});

test('Eingaben im deutschen Format; Ungültiges wird nicht still zu 0', () => {
  assert.equal(V.zahlEingabe('1.234,56'), 1234.56);
  assert.equal(V.zahlEingabe('450.000'), 450000);
  assert.equal(V.zahlEingabe('1.406'), 1406);
  assert.equal(V.zahlEingabe('0,082'), 0.082);
  assert.equal(V.zahlEingabe('12.5'), 12.5);
  assert.equal(V.zahlEingabe('−80,50 €'), -80.5);
  assert.equal(V.zahlEingabe(''), null);
  assert.ok(Number.isNaN(V.zahlEingabe('abc')));
  assert.ok(Number.isNaN(V.zahlEingabe('12,5,3')));
});

test('Datum: Monatsende wird gekappt, Schaltjahr', () => {
  assert.equal(V.plusMonate('2026-01-31', 1), '2026-02-28');
  assert.equal(V.plusMonate('2028-01-31', 1), '2028-02-29');
  assert.equal(V.ueberlappung('2026-01-01', '2026-01-31', '2026-01-15', null), 17);
  assert.equal(V.datumGueltig('2026-02-30'), false);
});

test('Verzugszinsen: Basiszins 1,27 % + 5 Pp. für 30 Tage auf 1.000 €', () => {
  // 1.000 × 6,27 % × 30 / 365 = 5,153… → 5,15 €
  assert.equal(V.r2(V.verzugszinsen(1000, '2026-03-03', '2026-04-02', 5)), 5.15);
  // über den Wechsel am 01.07.2026 (1,27 % → 1,52 %): 10 Tage zu 6,27 %, 10 Tage zu 6,52 %
  const z = V.verzugszinsen(1000, '2026-06-20', '2026-07-10', 5);
  assert.equal(V.r2(z), V.r2(1000 * (0.0627 * 10 + 0.0652 * 10) / 365));
  assert.equal(V.verzugszinsen(1000, '2026-03-03', '2026-03-03', 5), 0);
});

test('Kaution über drei Nettokaltmieten wird gemeldet (§ 551 BGB)', () => {
  const v = { id: 'v', einheitId: 'e', beginn: '2026-01-01', miete: { kalt: 800 }, kaution: { soll: 2500 } };
  const k = V.kaution(v, [], '2026-02-01');
  assert.equal(k.hoechst, 2400);
  assert.match(k.warnungen.join(' '), /§ 551/);
});

test('Kennzahlen und Fristen einer Liegenschaft', () => {
  const l = {
    id: 'L', name: 'Test', einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung', flaeche: 70 }, { id: 'e2', nr: 'W2', art: 'wohnung', flaeche: 50, sollmiete: 500 }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2025-10-01', ende: '2026-10-31', mietart: 'index', miete: { kalt: 700, nk: 150, hk: 0, zuschlag: 0, ust: 0 }, mieter: [{ name: 'A. Muster' }] }],
    zahlungen: [{ id: 'z', vertragId: 'v1', datum: '2025-10-01', betrag: 8500, art: 'miete' }]
  };
  const kz = V.kennzahlen(l, ST, { wert: 250000 });
  assert.equal(kz.vermietet, 1); assert.equal(kz.leer, 1);
  assert.equal(kz.kaltMonat, 700); assert.equal(kz.leerquoteFlaeche, V.r2(50 / 120 * 100));
  assert.equal(kz.rueckstand, 12 * 850 - 8500);   // Oktober 2025 bis September 2026
  assert.equal(kz.rendite, V.r2(8400 / 250000 * 100));
  const f = V.fristen(l, ST, 60).map(x => x.art);
  assert.ok(f.includes('vertragsende'), 'Vertragsende 31.10. liegt im Horizont');
  assert.ok(f.includes('index'), 'Indexmiete seit 12 Monaten unverändert');
  assert.ok(f.includes('rueckstand'));
});

test('Bereinigung: nur bekannte Felder, eingeschleuste Inhalte bleiben Text, ungültige Einträge fallen weg', () => {
  const z = { verworfen: 0 };
  const l = V.bereinigen({
    id: 'L1', name: '<img src=x onerror=alert(1)>', art: 'boese', fremd: 'weg',
    einheiten: [{ id: 'e1', nr: '1', flaeche: '70' }, { id: 'e 2 kaputt', nr: '2' }],
    vertraege: [{ id: 'v1', einheitId: 'e1', beginn: '2026-01-01', miete: { kalt: 700, nk: 'x' } }, { id: 'v2', einheitId: 'gibtsnicht', beginn: '2026-01-01' }],
    zahlungen: [{ id: 'z1', vertragId: 'v1', datum: '2026-01-02', betrag: 700 }, { id: 'z2', vertragId: 'v1', datum: '2026-13-01', betrag: 5 }]
  }, z);
  assert.equal(l.name, '<img src=x onerror=alert(1)>', 'Text bleibt Text — maskiert wird bei der Ausgabe');
  assert.equal(l.art, 'mfh'); assert.equal(l.fremd, undefined);
  assert.equal(l.einheiten.length, 1); assert.equal(l.einheiten[0].flaeche, null, 'Text statt Zahl wird nicht übernommen');
  assert.equal(l.vertraege.length, 1); assert.equal(l.vertraege[0].miete.nk, 0);
  assert.equal(l.zahlungen.length, 1);
  assert.equal(z.verworfen, 3);
  assert.equal(V.bereinigen({ id: 'a b' }), null);
});

test('Sicherungsdateien: fremde und beschädigte Dateien werden verständlich abgelehnt', () => {
  assert.match(V.sicherungPruefen({ typ: 'immoapp-projekte', projekte: [] }).fehler, /Projektsicherung/);
  assert.match(V.sicherungPruefen({ typ: 'vb-marktdaten', objekte: [] }).fehler, /Marktüberblick/);
  assert.match(V.sicherungPruefen([1, 2]).fehler, /keine Sicherung der Liegenschaftsverwaltung/);
  assert.match(V.sicherungPruefen({ typ: 'immoapp-verwaltung', liegenschaften: [{ id: 'a b' }] }).fehler, /beschädigt/);
  const ok = V.sicherungPruefen({ typ: 'immoapp-verwaltung', version: 1, liegenschaften: [{ id: 'L1', name: 'X' }], anhaenge: [{ id: 'a1', data: 'QUJD' }, { id: 'a2', data: 'kein base64!' }] });
  assert.equal(ok.ok, true); assert.equal(ok.liegenschaften.length, 1); assert.equal(ok.anhaenge.length, 1); assert.equal(ok.verworfen, 1);
});

/* ---------- Betriebs- und Heizkostenabrechnung (js/verwaltung-nk.js) ---------- */
const N = require('../../js/verwaltung-nk.js');

test('Vergleichsrechnung: Betriebs- und Heizkostenabrechnung mit Mieterwechsel, Leerstand, § 9, CO2 und § 35a', () => {
  const fall = FAELLE.nebenkosten, s = SOLL.nebenkosten;
  const l = V.bereinigen(JSON.parse(JSON.stringify(fall.liegenschaft)));
  assert.equal(l.kosten.length, fall.liegenschaft.kosten.length, 'Bereinigung behält alle Kosten');
  const r = N.abrechnen(l, fall.cfg);
  assert.equal(r.ok, true, r.fehler.join(' '));
  for (const e of r.ergebnisse) {
    const soll = s.ergebnisse[e.vertragId];
    const ist = { tage: e.tage, kosten: e.kosten, heizung: e.heizung, warmwasser: e.warmwasser, heiz: e.heiz, co2Anteil: e.co2Anteil, co2Erstattung: e.co2Erstattung,
      vorauszahlung: e.vorauszahlung, saldo: e.saldo, neueVz: e.neueVz, p35a: V.r2(e.p35a.reduce((a, x) => a + x.betrag, 0)) };
    assert.deepEqual(ist, soll, 'Vertrag ' + e.vertragId);
  }
  assert.equal(r.ergebnisse.length, Object.keys(s.ergebnisse).length);
  assert.deepEqual(r.positionen.filter(p => p.umlage).map(p => ({ id: p.id, gesamt: p.gesamt })), s.positionen);
  assert.equal(r.positionen.find(p => !p.umlage).gesamt, 2500, 'nicht umlagefähige Reparatur bleibt beim Vermieter');
  assert.deepEqual({ heizung: r.heiz.heizung, warmwasser: r.heiz.warmwasser, leerstand: r.heiz.leerstand }, s.heiz);
  assert.deepEqual({ kgM2a: r.co2.kgM2a, vermieterProzent: r.co2.vermieterProzent }, s.co2);
  assert.deepEqual(r.vermieter, s.vermieter);
  assert.ok(Math.abs(r.pruefung.rundung) <= 0.05, 'Rundungsdifferenz ' + r.pruefung.rundung);
  assert.ok(r.hinweise.some(h => /§ 9b Abs. 3/.test(h)), 'Hinweis auf Nutzerwechsel ohne Zwischenablesung');
});

test('CO2-Stufenmodell (Anlage CO2KostAufG): Grenzen', () => {
  assert.deepEqual([11.99, 12, 16.99, 17, 31.99, 32, 51.99, 52, 80].map(x => N.co2Stufe(x).vermieter), [0, 10, 10, 20, 40, 50, 80, 95, 95]);
});

test('Warmwasseranteil § 9 Abs. 2 HeizkostenV: gemessen, pauschal, Brennwert', () => {
  // 2,5 × 120 m³ × (60 − 10) = 15.000 kWh von 100.000 kWh
  assert.equal(N.warmwasserAnteil({ wwModus: 'messung', wwVolumen: 120, wwTemp: 60, energieKwh: 100000 }).anteil, 0.15);
  // 32 × 250 m² = 8.000 kWh, bei Erdgas brennwertbezogen × 1,11 = 8.880 kWh
  assert.equal(N.warmwasserAnteil({ wwModus: 'pauschal', wwFlaeche: 250, brennwert: true, energieKwh: 88800 }).anteil, 0.1);
});

test('Abrechnungsfrist und Prüfungen: > 12 Monate, fehlende Flächen, Heizkosten ohne Verteilung, 50–70 %', () => {
  assert.equal(N.frist('2025-12-31'), '2026-12-31');
  const l = { id: 'L', einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung' }], vertraege: [{ id: 'v', einheitId: 'e1', beginn: '2025-01-01', miete: { nk: 100 } }],
    kosten: [{ id: 'k', kategorie: 'grundsteuer', betrag: 500, datum: '2025-03-01' }, { id: 'h', kategorie: 'heizung', betrag: 900, datum: '2025-12-31' }] };
  const r = N.abrechnen(l, { von: '2025-01-01', bis: '2026-01-31' });
  assert.equal(r.ok, false);
  const t = r.fehler.join(' ');
  assert.match(t, /höchstens zwölf Monate/); assert.match(t, /Fläche W1/); assert.match(t, /Heizkosten erfasst/);
  const r2 = N.abrechnen(Object.assign({}, l, { einheiten: [{ id: 'e1', nr: 'W1', art: 'wohnung', flaeche: 50 }] }), { von: '2025-01-01', bis: '2025-12-31', heiz: { modus: 'verteilen', pvHeiz: 80 } });
  assert.match(r2.fehler.join(' '), /50 bis 70 %/);
  assert.match(r2.hinweise.join(' '), /§ 12 Abs. 1 HeizkostenV/);
});

test('Nebenkosten-Fristen: offenes Abrechnungsjahr bis zwölf Monate nach Ende', () => {
  const l = { id: 'L', name: 'X', vertraege: [{ id: 'v', einheitId: 'e', beginn: '2024-03-01' }], nkAbrechnungen: [{ von: '2024-01-01', bis: '2024-12-31', versandtAm: '2025-06-01' }] };
  const f = N.fristen(l, '2026-09-29', 60);
  assert.deepEqual(f.map(x => [x.titel, x.datum]), [['Betriebskostenabrechnung 2025 zustellen', '2026-12-31']]);
});

/* ---------- Instandhaltung und Pflichten (js/verwaltung-ih.js) ---------- */
const IH = require('../../js/verwaltung-ih.js');

test('Pflichten: nächste Fälligkeit aus letzter Erledigung und Turnus; Fristen für fällige, fehlende und bald fällige', () => {
  assert.equal(IH.naechste({ letzte: '2025-10-15', monate: 12 }), '2026-10-15');
  assert.equal(IH.naechste({ letzte: '2024-01-31', monate: 1 }), '2024-02-29');
  assert.equal(IH.naechste({ letzte: null, monate: 12 }), null);
  const l = { id: 'L', name: 'X', einheiten: [{ id: 'e1', nr: 'W1' }], pflichten: [
    { id: 'p1', art: 'rauchmelder', letzte: '2025-10-15', monate: 12 },          // in 16 Tagen
    { id: 'p2', art: 'legionellen', letzte: '2023-06-01', monate: 36 },          // seit 2026-06-01 überfällig
    { id: 'p3', art: 'aufzug', letzte: null, monate: 24 },                       // noch nie erfasst
    { id: 'p4', art: 'gasleitung', letzte: '2020-01-01', monate: 144 },          // weit in der Zukunft
    { id: 'p5', art: 'dachrinne', letzte: '2020-01-01', monate: 12, aktiv: false } ],
    vorgaenge: [{ id: 'v1', titel: 'Wasserschaden Bad', einheitId: 'e1', prio: 'notfall', status: 'beauftragt', gemeldetAm: '2026-09-28', terminAm: '2026-10-02' },
      { id: 'v2', titel: 'Tür klemmt', status: 'erledigt', erledigtAm: '2026-09-20' }] };
  const f = IH.fristen(l, '2026-09-29', 60);
  const titel = f.map(x => x.titel);
  assert.ok(titel.includes('Rauchwarnmelder: Wartung und Funktionsprüfung fällig'));
  assert.ok(titel.includes('Trinkwasser: Untersuchung auf Legionellen überfällig'));
  assert.ok(f.find(x => x.pflichtId === 'p2').dringend, 'mehr als 30 Tage überfällig');
  assert.ok(titel.includes('Aufzug: Prüfung durch eine zugelassene Überwachungsstelle: letzte Erledigung eintragen'));
  assert.ok(!f.some(x => x.pflichtId === 'p4' || x.pflichtId === 'p5'));
  assert.ok(titel.includes('Notfall: Wasserschaden Bad'));
  assert.ok(titel.includes('Handwerkertermin: Wasserschaden Bad'));
  assert.ok(titel.includes('Rechnung erfassen: Tür klemmt'));
});

test('Vorgang → Kosten: Instandhaltung nicht umlagefähig, Wartung in der gewählten Kostenart, § 35a als Handwerkerleistung', () => {
  const k = IH.kostenAusVorgang({ id: 'v9', titel: 'Heizung Wartung', rechnung: 480, rechnungAm: '2026-03-02', lohn35a: 300, kostenart: 'wartung', umlageKategorie: 'heizung' });
  assert.deepEqual([k.id, k.kategorie, k.betrag, k.datum, k.lohn35a, k.art35a, k.vorgangId], ['Kv9', 'heizung', 480, '2026-03-02', 300, 'handwerker', 'v9']);
  assert.equal(IH.kostenAusVorgang({ id: 'v8', titel: 'Rohrbruch', rechnung: 1200, erledigtAm: '2026-05-05' }).kategorie, 'instandhaltung');
  assert.equal(IH.kostenAusVorgang({ id: 'v7', titel: 'offen' }), null);
});

test('Bereinigung behält Vorgänge und Pflichten; Dienstleister werden geprüft', () => {
  const l = V.bereinigen({ id: 'L', einheiten: [{ id: 'e1', nr: 'W1' }],
    vorgaenge: [{ id: 'v1', titel: 'Riss', einheitId: 'e1', prio: 'xx', status: 'erledigt', fotos: ['a1', 'kaputt id'], verlauf: [{ datum: '2026-01-02', text: 'gemeldet' }, { datum: 'x' }] }],
    pflichten: [{ id: 'p1', art: 'rauchmelder', monate: 12, letzte: '2025-10-15' }, { id: 'p 2' }] });
  assert.equal(l.vorgaenge[0].prio, 'normal'); assert.equal(l.vorgaenge[0].status, 'erledigt');
  assert.deepEqual(l.vorgaenge[0].fotos, ['a1']); assert.equal(l.vorgaenge[0].verlauf.length, 1);
  assert.equal(l.pflichten.length, 1); assert.equal(l.pflichten[0].letzte, '2025-10-15');
  assert.deepEqual(IH.dienstleisterBereinigen([{ id: 'd1', name: 'Sanitär Muster', telefon: '0000' }, { id: 'd 2' }, 5]).map(d => d.name), ['Sanitär Muster']);
});

/* ---------- WEG (js/verwaltung-weg.js) ---------- */
const WEG = require('../../js/verwaltung-weg.js');

test('Vergleichsrechnung WEG: Einzelwirtschaftspläne, Jahresabrechnung mit Rücklage, Hausgeldrückstände, Abstimmungen', () => {
  const fall = FAELLE.weg, s = SOLL.weg;
  const l = V.bereinigen(JSON.parse(JSON.stringify(fall.liegenschaft)));
  assert.equal(l.weg.eigentuemer.length, 7); assert.equal(l.weg.zahlungen.length, fall.liegenschaft.weg.zahlungen.length);
  assert.equal(l.kosten.find(k => k.id === 'wk7').ausRuecklage, true);
  const plan = l.weg.wirtschaftsplaene[0];
  for (const e of WEG.einzelplaene(l, plan)) assert.deepEqual({ kosten: e.kosten, ruecklage: e.ruecklage, monat: e.monat, jahr: e.jahr }, s.einzelplaene[e.einheitId], 'Einzelplan ' + e.einheitId);
  const ja = WEG.jahresabrechnung(l, 2025, fall.cfg);
  for (const e of ja.einzel) {
    const soll = s.einzel[e.einheitId];
    assert.deepEqual({ kosten: e.kosten, umlagefaehig: e.umlagefaehig, p35a: e.p35a, zufuehrung: e.zufuehrung, summe: e.summe, vorschussSoll: e.vorschussSoll, spitze: e.spitze, gezahlt: e.gezahlt, eigentuemer: e.eigentuemer },
      { kosten: soll.kosten, umlagefaehig: soll.umlagefaehig, p35a: soll.p35a, zufuehrung: soll.zufuehrung, summe: soll.summe, vorschussSoll: soll.vorschussSoll, spitze: soll.spitze, gezahlt: soll.gezahlt, eigentuemer: soll.eigentuemer }, 'Einzelabrechnung ' + e.einheitId);
    assert.equal(WEG.hausgeldKonto(l, e.einheitId, '2025-12-31').summe.rueckstand, soll.rueckstand, 'Hausgeldrückstand ' + e.einheitId);
  }
  assert.deepEqual(ja.ruecklage, s.ruecklage);
  assert.equal(ja.vermoegen.forderungen, s.forderungen);
  assert.equal(ja.gesamt.entnahmenRuecklage, 8000);
  fall.abstimmungen.forEach((t, i) => {
    const r = WEG.abstimmung(l, { stimmen: t.stimmen, mehrheit: t.mehrheit }, t.datum, t.prinzip);
    assert.deepEqual({ ja: r.ja, nein: r.nein, enthaltung: r.enthaltung, ungueltig: r.ungueltig, meaJa: r.meaJa, angenommen: r.angenommen }, s.abstimmungen[i], 'Abstimmung ' + (i + 1));
  });
});

test('WEG: Fortgeltung des Wirtschaftsplans, Einladungsfrist drei Wochen, Beschlussnummern, Fristen', () => {
  const l = V.bereinigen(JSON.parse(JSON.stringify(FAELLE.weg.liegenschaft)));
  assert.deepEqual(WEG.planFuerJahr(l, 2026), { plan: l.weg.wirtschaftsplaene[0], fortgeltend: true });
  l.weg.wirtschaftsplaene[0].fortgeltung = false;
  assert.equal(WEG.planFuerJahr(l, 2026), null);
  assert.equal(WEG.hausgeldPosten(l, 'w1', '2026-03-31').filter(p => p.monat.startsWith('2026')).length, 0, 'ohne Fortgeltung kein Hausgeld 2026');
  assert.deepEqual(WEG.einladungsfrist('2026-04-29', '2026-05-20'), { tage: 21, ok: true });
  assert.deepEqual(WEG.einladungsfrist('2026-05-01', '2026-05-20'), { tage: 19, ok: false });
  l.weg.beschluesse = [{ nr: 7 }, { nr: 12 }];
  assert.equal(WEG.naechsteBeschlussNr(l), 13);
  const f = WEG.fristen(Object.assign(l, { weg: Object.assign(l.weg, { versammlungen: [{ id: 'v', datum: '2026-10-20' }] }) }), '2026-09-29', 60);
  const t = f.map(x => x.titel);
  assert.ok(t.includes('Einladung zur Versammlung am 20.10.2026 versenden'));
  assert.ok(t.includes('Jahresabrechnung 2025 erstellen und beschließen lassen'));
  assert.ok(t.some(x => /^Hausgeldrückstand/.test(x)));
});
