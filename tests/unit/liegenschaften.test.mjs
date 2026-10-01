/* Baupreisindex BW und Liegenschaften (Bewertungsverlauf, Bereinigung, Sicherung).
   Indexwerte: Statistischer Bericht M I 4 – vj 2/26 des Statistischen Landesamts BW (Tabellen 2 und 3); die Prüfung
   „Jahresdurchschnitt = Mittel der vier Quartale“ sichert die Abschrift. Bewertungen: synthetische Werte. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const V = require('../../js/liegenschaften.js');
const I = require('../../js/baupreisindex.js');
const B = V;

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

function lieg(bewertungen, extra) {
  return V.bereinigen(Object.assign({ id: 'L1', name: 'Filiale Musterstadt', bewertungen }, extra || {}));
}

test('Bewertungen: Bereinigung, Verlauf mit Veränderung, aktueller Wert, Stichtagsvorschlag', () => {
  const l = lieg([
    { id: 'b2', stichtag: '2024-12-31', art: 'preiseinschaetzung', status: 'final', substanz: 260000, ertrag: 240000, ergebnis: 250000, bpi: 130.9, bpiText: 'Bürogebäude November 2024' },
    { id: 'b1', stichtag: '2023-12-31', art: 'preiseinschaetzung', ergebnis: 240000 },
    { id: 'b3', stichtag: '2026-12-31', status: 'entwurf', ergebnis: 262500 },
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
  assert.equal(B.stichtagVorschlag('2024-12-31', '2026-10-01'), '2025-12-31');
  assert.equal(B.stichtagVorschlag(null, '2026-10-01'), '2026-12-31');
  assert.equal(V.plusJahre('2024-02-29', 1), '2025-02-28');
});

test('Liegenschaft: Bereinigung, frühere Angaben bleiben erhalten, Sicherung (neu und aus der früheren Verwaltung)', () => {
  const l = lieg([{ id: 'b', stichtag: '2024-12-31', ergebnis: 100 }],
    { strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'mfh', notiz: 'x'.repeat(4000), einheiten: [{ id: 'e1', nr: 'Bank EG' }], eigentuemerArt: 'bank' });
  assert.equal(l.art, 'wohnen'); assert.equal(l.notiz.length, 3000);
  assert.deepEqual(l.einheiten, [{ id: 'e1', nr: 'Bank EG' }]);   // nicht mehr angezeigt, aber nicht verloren
  assert.equal(V.bereinigen({ id: '../x', name: 'a' }), null); assert.equal(V.bereinigen(null), null);
  assert.equal(V.bereinigen({ id: 'L2' }).name, 'Liegenschaft');
  for (const typ of ['immoapp-liegenschaften', 'immoapp-verwaltung']) {
    const sp = V.sicherungPruefen({ typ, version: 1, liegenschaften: [l, { id: '?' }], einstellungen: { name: 'Muster', telefon: '0' },
      anhaenge: [{ id: 'A1', liegenschaftId: 'L1', name: 'karte.png', typ: 'image/png', data: 'iVBORw0KGgo=' }, { id: 'A2', data: 'kein base64!' }] });
    assert.equal(sp.ok, true); assert.equal(sp.liegenschaften.length, 1); assert.equal(sp.anhaenge.length, 1); assert.equal(sp.verworfen, 2);
    assert.equal(sp.liegenschaften[0].bewertungen.length, 1); assert.equal(sp.ansprechpartner.name, 'Muster');
  }
  assert.match(V.sicherungPruefen({ typ: 'immoapp-projekte' }).fehler, /Projektsicherung/);
  assert.match(V.sicherungPruefen({ typ: 'x', liegenschaften: [] }).fehler, /keine Sicherung der Liegenschaften/);
  assert.match(V.sicherungPruefen({ typ: 'immoapp-liegenschaften', liegenschaften: [] }).fehler, /keine Liegenschaften/);
  // Zahlen wie im Vordruck eingegeben
  assert.deepEqual(['1.419', '360,00', '130,9', '255.060', '20 %', '', 'abc'].map(V.zahlEingabe), [1419, 360, 130.9, 255060, 20, null, NaN]);
});
