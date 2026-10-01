/* Baupreisindex BW und Bewertungen je Liegenschaft (Verlauf, Fristen, Fortschreibung).
   Indexwerte: Statistischer Bericht M I 4 – vj 2/26 des Statistischen Landesamts BW (Tabellen 2 und 3); die Prüfung
   „Jahresdurchschnitt = Mittel der vier Quartale“ sichert die Abschrift. Bewertungen: synthetische Werte. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const V = require('../../js/verwaltung.js');
const I = require('../../js/baupreisindex.js');
const B = require('../../js/verwaltung-bew.js');

test('Baupreisindex: Abschrift stimmig (Jahresdurchschnitt = Mittel der Quartale), Faktoren auf NHK 2010', () => {
  for (let j = 2016; j <= 2025; j++) {
    const q = I.QUARTALE.filter(z => z[0].startsWith(j + '-'));
    assert.equal(q.length, 4, 'vier Quartale ' + j);
    for (let a = 0; a < 3; a++) {
      const mittel = q.reduce((s, z) => s + z[a + 1], 0) / 4;
      assert.ok(Math.abs(mittel - I.JAHRE[j][a]) <= 0.051, j + ' Art ' + a + ': Mittel ' + mittel + ' ≠ ' + I.JAHRE[j][a]);
    }
  }
  assert.equal(I.faktor2010('wohnen'), 1.4164);   // 100 / 70,6
  assert.equal(I.faktor2010('buero'), 1.4472);    // 100 / 69,1
  assert.equal(I.faktor2010('gewerbe'), 1.4368);  // 100 / 69,6
  assert.equal(I.artAusFaktor(1.4472), 'buero'); assert.equal(I.artAusFaktor('1.4164'), 'wohnen'); assert.equal(I.artAusFaktor(1.406), null);
  assert.equal(I.artAusTyp('Geschäftshaus ohne Wohnungen'), 'buero'); assert.equal(I.artAusTyp('Betriebs-/Werkstattgebäude · eingeschossig'), 'gewerbe');
  assert.equal(I.artAusTyp('EFH freistehend · unterkellert, DG ausgebaut'), 'wohnen');
});

test('Baupreisindex: maßgebliches Quartal zum Stichtag, vorläufig nach dem neuesten Wert', () => {
  const b24 = I.wertFuer('buero', '2024-12-31');
  assert.deepEqual([b24.monat, b24.wert, b24.index2010, b24.vorlaeufig], ['2024-11', 130.9, 189.4, false]);   // 130,9 × 1,4472 = 189,44
  const w24 = I.wertFuer('wohnen', '2024-12-31');
  assert.deepEqual([w24.monat, w24.wert, w24.index2010], ['2024-11', 128.1, 181.4]);                         // 128,1 × 1,4164 = 181,44
  const b23 = I.wertFuer('buero', '2023-12-31'); assert.deepEqual([b23.wert, b23.index2010], [125.7, 181.9]);
  assert.equal(I.wertFuer('gewerbe', '2025-04-30').monat, '2025-02');
  const neu = I.wertFuer('buero', '2026-12-31');
  assert.deepEqual([neu.monat, neu.wert, neu.vorlaeufig], ['2026-05', 143.1, true]);
  assert.equal(I.wertFuer('buero', '2026-06-30').vorlaeufig, false);
  assert.equal(I.wertFuer('wohnen', '2015-12-31'), null);
  assert.equal(I.wertFuer('unbekannt', '2026-05-31').art, 'wohnen');
  const q = I.quelleText(neu);
  assert.match(q, /Bürogebäude, Mai 2026: 143,1/); assert.match(q, /1,4472/); assert.match(q, /vorläufig/);
});

function lieg(bewertungen, art) {
  return V.bereinigen({ id: 'L1', name: 'Filiale Musterstadt', eigentuemerArt: art || 'bank', bewertungen });
}

test('Bewertungen: Bereinigung, Verlauf mit Veränderung, aktueller Wert', () => {
  const l = lieg([
    { id: 'b2', stichtag: '2024-12-31', art: 'preiseinschaetzung', status: 'final', substanz: 260000, ertrag: 240000, ergebnis: 250000, bpi: 130.9, bpiText: 'Bürogebäude November 2024' },
    { id: 'b1', stichtag: '2023-12-31', art: 'preiseinschaetzung', ergebnis: 240000 },
    { id: 'b3', stichtag: '2026-12-31', status: 'entwurf', ergebnis: 262500, projektId: 'p123' },
    { id: 'x', stichtag: '31.12.2022', ergebnis: 1 },           // ungültiges Datum: verworfen
    { id: 'b4', stichtag: '2022-12-31', art: 'erfunden', ergebnis: 'viel' }
  ]);
  assert.deepEqual(l.bewertungen.map(b => b.id), ['b2', 'b1', 'b3', 'b4']);
  assert.equal(l.bewertungen[1].status, 'final'); assert.equal(l.bewertungen[3].art, 'preiseinschaetzung'); assert.equal(l.bewertungen[3].ergebnis, null);
  const v = B.verlauf(l);
  assert.deepEqual(v.map(b => b.id), ['b4', 'b1', 'b2', 'b3']);
  assert.equal(v[1].diff, null);                                   // Vorgänger ohne Ergebnis
  assert.deepEqual([v[2].diff, v[2].diffPct, v[2].vorStichtag], [10000, 4.17, '2023-12-31']);   // 250.000 / 240.000 − 1 = 4,1667 %
  assert.deepEqual([v[3].diff, v[3].diffPct], [12500, 5]);         // Entwurf gegen die letzte abgeschlossene
  assert.equal(B.aktuell(l).id, 'b2');                             // Entwurf zählt nicht als aktueller Wert
  assert.equal(B.aktuell(lieg([{ id: 'e', stichtag: '2026-12-31', status: 'entwurf', ergebnis: 5 }])).id, 'e');
  assert.equal(B.aktuell(lieg([])), null);
  // Sicherung prüfen: Bewertungen bleiben erhalten
  const sp = V.sicherungPruefen({ typ: 'immoapp-verwaltung', version: 1, liegenschaften: [l] });
  assert.equal(sp.liegenschaften[0].bewertungen.length, 4);
});

test('Bewertungen: jährliche Frist nur für Objekte der Bank und eigene Objekte', () => {
  const l = lieg([{ id: 'b', stichtag: '2024-12-31', ergebnis: 100 }, { id: 'e', stichtag: '2025-12-31', status: 'entwurf', ergebnis: 110 }]);
  assert.equal(B.naechsterStichtag(l), '2025-12-31');
  const f = B.fristen(l, '2026-10-01', 60);
  assert.equal(f.length, 1);
  assert.deepEqual([f[0].datum, f[0].faellig, f[0].art], ['2025-12-31', true, 'bewertung']);
  assert.match(f[0].titel, /31\.12\.2025 \(Entwurf liegt vor\)/);
  assert.equal(B.fristen(l, '2025-09-01', 60).length, 0);          // noch außerhalb des Vorlaufs
  assert.equal(B.fristen(l, '2025-11-15', 60).length, 1);          // im Vorlauf, noch nicht fällig
  assert.equal(B.fristen(l, '2025-11-15', 60)[0].faellig, false);
  assert.equal(B.fristen(lieg(l.bewertungen, 'kunde'), '2026-10-01', 60).length, 0);
  assert.equal(B.fristen(lieg([]), '2026-10-01', 60).length, 0);
});

test('Fortschreibung: Stichtag, amtlicher Baupreisindex, Restnutzungsdauer und PV-Laufzeit; Rest bleibt stehen', () => {
  const felder = { ek_stichtag: '2024-12-31', ek_besichtigung: '2024-11-20', ek_typ: 'Geschäftshaus ohne Wohnungen', ek_brw: '340', bpi: '130,9', bpi_faktor: '1,4472',
    nhkhg_rnd: '50', nhkan_rnd: '0', anbau_aktiv: false, pv_aktiv: true, pv_rnd: '6,69', er_zins_basis: '4' };
  const r = B.fortschreiben(felder, { stichtag: '2026-12-31' });
  const f = r.felder;
  assert.equal(r.jahre, 2);
  assert.deepEqual([f.ek_stichtag, f.ek_besichtigung, f.bpi, f.bpi_faktor, f.bpi_art], ['2026-12-31', '', '143,1', '1,4472', 'buero']);
  assert.equal(f.nhkhg_rnd, '48'); assert.equal(f.nhkan_rnd, '0');
  assert.equal(f.pv_rnd, '4,69');                                  // 6,69 − 730 / 365
  assert.deepEqual([f.ek_brw, f.er_zins_basis], ['340', '4']);
  assert.match(f.pq_bpi_quelle, /Mai 2026: 143,1.*vorläufig/);
  assert.ok(r.hinweise.some(h => /Bodenrichtwert prüfen/.test(h)) && r.hinweise.some(h => /50 → 48/.test(h)));
  assert.equal(felder.bpi, '130,9', 'Ausgangsfelder unverändert');
  // ohne Fortschreibung der RND; Gebäudeart ausdrücklich; Index aus dem Gebäudetyp, wenn der Faktor unbekannt ist
  assert.equal(B.fortschreiben(felder, { stichtag: '2026-12-31', rndFortschreiben: false }).felder.nhkhg_rnd, '50');
  assert.equal(B.fortschreiben(felder, { stichtag: '2025-12-31', art: 'wohnen' }).felder.bpi, '132,7');
  assert.equal(B.fortschreiben(Object.assign({}, felder, { bpi_faktor: '1.406', ek_typ: 'Mehrfamilienhaus · bis 6 WE' }), { stichtag: '2025-12-31' }).felder.bpi_art, 'wohnen');
  assert.equal(B.fortschreiben(Object.assign({}, felder, { nhkhg_rnd: '1' }), { stichtag: '2027-12-31' }).felder.nhkhg_rnd, '1');
  assert.throws(() => B.fortschreiben(felder, { stichtag: '31.12.2026' }), /Stichtag/);
  assert.equal(B.stichtagVorschlag('2024-12-31', '2026-10-01'), '2025-12-31');
  assert.equal(B.stichtagVorschlag(null, '2026-10-01'), '2026-12-31');
});

test('Eigennutzung: eigene Filiale zählt nicht als Leerstand, bleibt beim Bereinigen erhalten', () => {
  const l = V.bereinigen({ id: 'L2', name: 'Filiale', eigentuemerArt: 'bank', einheiten: [
    { id: 'e1', nr: 'Bank EG', art: 'gewerbe', flaeche: 200, sollmiete: 2000, eigennutzung: true },
    { id: 'e2', nr: 'Laden UG', art: 'gewerbe', flaeche: 100, sollmiete: 950 },
    { id: 'e3', nr: 'W1', art: 'wohnung', flaeche: 60, eigennutzung: 'ja' }] });
  assert.deepEqual(l.einheiten.map(e => e.eigennutzung), [true, false, false]);
  const k = V.kennzahlen(l, '2026-10-01');
  assert.deepEqual([k.einheiten, k.vermietet, k.eigen, k.leer], [3, 0, 1, 2]);
  assert.equal(k.leerquoteFlaeche, 44.44);                         // (100 + 60) / 360
  const ls = V.leerstand(l, '2026-01-01', '2026-01-31');
  assert.deepEqual(ls[0], { einheitId: 'e1', leerTage: 0, entgangen: 0 });
  assert.deepEqual([ls[1].leerTage, ls[1].entgangen], [31, 950]);
});
