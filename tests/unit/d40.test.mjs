/* Neue Kacheln D40: Kalenderdatei mit mehreren Terminen, Monatsblatt, Trichter, Vorlagen, Bieterrangfolge, Kaufen oder Mieten
   (gegen die unabhängige Python-Rechnung tests/referenz/kaufmiete.py) und Bildbearbeitung (js/bild.js). Sollwerte von Hand. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const require_ = createRequire(import.meta.url);
const B = require_('../../js/beratung.js');
const BILD = require_('../../js/bild.js');
const D = require_('../../js/daten.js');
const PY = pythonMit('json');

test('Kalenderdatei mit mehreren Terminen: ein Kalender, ungültige Daten entfallen, einzelner Termin unverändert', () => {
  const t = B.icsKalender([{ uid: 'a@x', titel: 'Besichtigung', datum: '2026-10-05', uhrzeit: '9:00', dauerMin: 45 }, { uid: 'b@x', titel: 'Frist', datum: '2026-10-06' }, { titel: 'kaputt', datum: '6.10.2026' }],
    new Date(Date.UTC(2026, 9, 3, 8, 0, 0)));
  const z = t.split('\r\n');
  assert.equal(z.filter(x => x === 'BEGIN:VCALENDAR').length, 1);
  assert.equal(z.filter(x => x === 'BEGIN:VEVENT').length, 2);
  assert.ok(z.includes('DTSTART:20261005T090000') && z.includes('DTEND:20261005T094500'));
  assert.ok(z.includes('DTSTART;VALUE=DATE:20261006') && z.includes('DTEND;VALUE=DATE:20261007'));
  assert.equal(B.icsKalender([], new Date()), '');
  assert.equal(B.icsKalender([{ datum: 'x' }], new Date()), '');
  // ics(t) ist weiter dieselbe Datei für einen Termin
  assert.equal(B.ics({ uid: 'u', titel: 'T', datum: '2026-10-05', jetzt: new Date(0) }), B.icsKalender([{ uid: 'u', titel: 'T', datum: '2026-10-05' }], new Date(0)));
});

test('Monatsblatt: Wochen von Montag bis Sonntag, fünf oder sechs Wochen', () => {
  const okt = B.monatsRaster('2026-10');
  assert.equal(okt.length, 5); assert.equal(okt[0][0], '2026-09-28'); assert.equal(okt[0][3], '2026-10-01'); assert.equal(okt[4][6], '2026-11-01');
  assert.equal(B.monatsRaster('2026-03').length, 6);       // 1. März 2026 ist ein Sonntag
  assert.equal(B.monatsRaster('2026-02').length, 5);
  assert.equal(B.monatsRaster('2027-02').length, 4);       // 1. Februar 2027 ist ein Montag, 28 Tage
  assert.deepEqual(B.monatsRaster('2026-13'), []);
});

test('Trichter: jede Stufe zählt alle, die sie mindestens erreicht haben; Absage nach der Besichtigung bleibt Besichtigung', () => {
  const st = ['Neu', 'Kontaktiert', 'Exposé', 'Besichtigung', 'Angebot', 'Gekauft'];
  const r = B.trichter([{ quelle: 'Portal', stufe: 3, abgesagt: true }, { quelle: 'Portal', stufe: 5 }, { quelle: 'Filiale', stufe: 0 }, { quelle: '', stufe: 99 }, null], st, 'quelle');
  assert.deepEqual(r.map(x => x.gruppe), ['Portal', 'Filiale', 'ohne Angabe']);
  assert.deepEqual(r[0], { gruppe: 'Portal', anzahl: 2, stufen: [2, 2, 2, 2, 1, 1], abgesagt: 1 });
  assert.deepEqual(r[2].stufen, [1, 1, 1, 1, 1, 1]);
});

test('Vorlagen: Platzhalter, optionale Teile, fehlende Angaben, Briefanrede', () => {
  const v = B.vorlageFuellen('{anrede_brief}\n\nPreis: {preis}\n[[Provision: {provision}\n]]Gruß\n{berater_name}\n{wer}', { anrede_brief: 'Sehr geehrte Frau Muster,', preis: '480.000 €', provision: '', berater_name: '' });
  assert.equal(v.text, 'Sehr geehrte Frau Muster,\n\nPreis: 480.000 €\nGruß');
  assert.deepEqual(v.fehlt, ['berater_name', 'wer']);
  assert.equal(B.vorlageFuellen('[[Termin {d} um {u} Uhr]]', { d: '5.10.', u: '' }).text, '');
  assert.equal(B.vorlageFuellen('A\n\n\n\nB', {}).text, 'A\n\nB');
  assert.equal(B.briefAnrede({ anrede: 'Frau', vorname: 'Erika', nachname: 'Muster' }), 'Sehr geehrte Frau Muster,');
  assert.equal(B.briefAnrede({ anrede: 'Herr', nachname: 'Beispiel' }), 'Sehr geehrter Herr Beispiel,');
  assert.equal(B.briefAnrede({ anrede: 'Divers', vorname: 'Alex', nachname: 'Kim' }), 'Guten Tag Alex Kim,');
  assert.equal(B.briefAnrede({ anrede: 'Frau' }), 'Sehr geehrte Damen und Herren,');
  assert.equal(B.briefAnrede({ anrede: 'Firma', firma: 'Muster GmbH', nachname: 'X' }), 'Sehr geehrte Damen und Herren,');
});

test('Bieterverfahren: Rangfolge nach Betrag, bei Gleichstand das frühere Gebot; zurückgezogene zählen nicht', () => {
  const r = B.bieterRang([{ id: 'a', betrag: 500000, datum: '2026-10-02' }, { id: 'b', betrag: 510000, datum: '2026-10-03' }, { id: 'c', betrag: 500000, datum: '2026-10-01', zeit: '09:00' },
    { id: 'd', betrag: 600000, status: 'zurückgezogen' }, { id: 'e', betrag: 550000, status: 'abgelehnt' }, { id: 'f', betrag: '' }], 480000);
  assert.deepEqual(r.map(x => [x.id, x.rang]), [['b', 1], ['c', 2], ['a', 3]]);
  assert.ok(Math.abs(r[0].abstandPreis - 6.25) < 1e-9);
  assert.ok(Math.abs(r[1].abstandErstes - (500000 / 510000 - 1) * 100) < 1e-9);
  assert.equal(B.bieterRang([{ betrag: 1 }], 0)[0].abstandPreis, null);
});

test('Kaufen oder Mieten: Annuität, Nebenkosten, Gleichstand-Jahr; wie die unabhängige Python-Rechnung', () => {
  const faelle = [
    { preis: 400000, nk: 10.57, ek: 100000, zins: 3.5, tilgung: 2, jahre: 30, instandhaltung: 4000, kostensteigerung: 2, wertsteigerung: 1.5, miete: 1300, mietsteigerung: 2, anlagezins: 4 },
    { preis: 300000, nk: 7, ek: 400000, zins: 3, tilgung: 2, jahre: 10, instandhaltung: 2500, kostensteigerung: 0, wertsteigerung: 0, miete: 900, mietsteigerung: 0, anlagezins: 2 },
    { preis: 500000, nk: 10, ek: 50000, zins: 4, tilgung: 1, jahre: 40, instandhaltung: 6000, kostensteigerung: 2.5, wertsteigerung: 0.5, miete: 1500, mietsteigerung: 2.5, anlagezins: 5 }];
  const r0 = B.kaufMiete(faelle[0]);
  assert.ok(Math.abs(r0.darlehen - (400000 * 1.1057 - 100000)) < 1e-6);
  assert.ok(Math.abs(r0.rate - r0.darlehen * 0.055 / 12) < 1e-9);
  assert.ok(Math.abs(r0.zeilen[0].kauf - (100000 - 400000 * 0.1057)) < 1e-6, 'zu Beginn sind die Nebenkosten verbraucht');
  assert.equal(r0.zeilen[0].miete, 100000);
  const r1 = B.kaufMiete(faelle[1]);
  assert.equal(r1.darlehen, 0); assert.equal(r1.rate, 0);
  assert.ok(Math.abs(r1.zeilen[0].kauf - (300000 + 400000 - 321000)) < 1e-6, 'überschüssiges Eigenkapital wird angelegt');
  if (!PY) return;
  const py = pythonJson(PY, ['tests/referenz/kaufmiete.py', JSON.stringify(faelle)]);
  faelle.forEach((f, i) => {
    const js = B.kaufMiete(f), p = py[i];
    assert.ok(Math.abs(js.darlehen - p.darlehen) < 1e-6); assert.ok(Math.abs(js.rate - p.rate) < 1e-9);
    assert.equal(js.abJahr, p.abJahr, 'Fall ' + i + ': Jahr, ab dem Kaufen vorn liegt');
    js.zeilen.forEach((z, j) => { assert.ok(Math.abs(z.kauf - p.kauf[j]) < 1e-6, 'Fall ' + i + ' Jahr ' + j + ' Kaufen');
      assert.ok(Math.abs(z.miete - p.miete[j]) < 1e-6, 'Fall ' + i + ' Jahr ' + j + ' Mieten'); assert.ok(Math.abs(z.restschuld - p.restschuld[j]) < 1e-6); });
  });
});

test('Bildbearbeitung: Helligkeit, Kontrast, Sättigung, Wärme, Tonwert, Schwärzen, Verpixeln, Füllfaktor', () => {
  const bild = (w, h, f) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const [r, g, b] = f(i % w, Math.floor(i / w)); d.set([r, g, b, 255], i * 4); } return { data: d, width: w, height: h }; };
  let p = bild(1, 1, () => [100, 150, 200]);
  BILD.anpassen(p, {}); assert.deepEqual([...p.data], [100, 150, 200, 255], 'ohne Regler unverändert');
  BILD.anpassen(p, { hell: 50 }); assert.deepEqual([...p.data], [164, 214, 255, 255]);   // + 64, oben begrenzt
  p = bild(1, 1, () => [100, 150, 200]); BILD.anpassen(p, { saettigung: -100 });
  const l = Math.round(0.299 * 100 + 0.587 * 150 + 0.114 * 200); assert.deepEqual([...p.data].slice(0, 3), [l, l, l]);
  p = bild(1, 1, () => [128, 64, 192]); BILD.anpassen(p, { kontrast: 50 });
  const f = 259 * (64 + 255) / (255 * (259 - 64)); assert.deepEqual([...p.data].slice(0, 3), [128, Math.round(f * (64 - 128) + 128), Math.round(f * (192 - 128) + 128)]);
  p = bild(1, 1, () => [100, 100, 100]); BILD.anpassen(p, { waerme: 100 }); assert.deepEqual([...p.data].slice(0, 3), [130, 100, 70]);
  // Tonwert: Grauwerte 50 … 200 werden auf 0 … 255 gespreizt
  p = bild(151, 1, x => [50 + x, 50 + x, 50 + x]); const t = BILD.tonwert(p, 0);
  assert.deepEqual([t.schwarz, t.weiss], [50, 200]); assert.equal(p.data[0], 0); assert.equal(p.data[150 * 4], 255);
  p = bild(4, 1, () => [90, 90, 90]); assert.equal(BILD.tonwert(p).unveraendert, true); assert.equal(p.data[0], 90);
  // Schwärzen und Verpixeln, auch über den Rand hinaus
  p = bild(4, 4, () => [200, 100, 50]); BILD.schwaerzen(p, { x: 1, y: 1, w: 10, h: 2 });
  assert.deepEqual([...p.data].slice(0, 3), [200, 100, 50]); assert.deepEqual([...p.data].slice((1 * 4 + 3) * 4, (1 * 4 + 3) * 4 + 3), [0, 0, 0]); assert.equal(p.data[(3 * 4 + 1) * 4], 200);
  p = bild(4, 2, x => x < 2 ? [0, 0, 0] : [200, 200, 200]); BILD.verpixeln(p, { x: 0, y: 0, w: 4, h: 2 }, 4);
  assert.deepEqual([...p.data].filter((v, i) => i % 4 === 0), new Array(8).fill(100), 'ein Block mit dem Mittelwert');
  // Füllfaktor: um 10° gedrehtes 400 × 300-Bild füllt den Rahmen ohne leere Ecken
  const a = 10 * Math.PI / 180, s = BILD.fuellfaktor(400, 300, 10);
  assert.ok(Math.abs(s - Math.max(Math.cos(a) + 0.75 * Math.sin(a), Math.cos(a) + (4 / 3) * Math.sin(a))) < 1e-12);
  assert.equal(BILD.fuellfaktor(400, 300, 0), 1);
  assert.deepEqual(BILD.mittigZuschneiden(400, 300, 1), { x: 0.125, y: 0, w: 0.75, h: 1 });
  assert.deepEqual(BILD.mittigZuschneiden(300, 400, 1.5), { x: 0, y: (1 - 200 / 400) / 2, w: 1, h: 0.5 });
});

test('Gesamtsicherung D40: Termine, Vorgänge und Bieterverfahren werden geprüft und beschädigte verworfen', () => {
  const r = D.projektSicherungPruefen({ typ: 'immoapp-projekte', version: 2, projekte: [],
    termine: [{ id: 't1', datum: '2026-10-05' }, { id: 't2' }], vorgaenge: [{ id: 'v1', typ: 'anfrage' }, { id: 'v2', typ: 'fremd' }], bieter: [{ id: 'b1', gebote: [] }, { id: 'b2' }] });
  assert.equal(r.ok, true, 'eine Sicherung nur mit diesen Daten ist gültig');
  assert.deepEqual([r.termine.map(x => x.id), r.vorgaenge.map(x => x.id), r.bieter.map(x => x.id)], [['t1'], ['v1'], ['b1']]);
  assert.equal(r.verworfen, 3);
});

test('Aktivitäten: Zeiträume Woche, Monat, Quartal, Jahr mit Vorzeitraum, auch über den Jahreswechsel', () => {
  assert.deepEqual(B.zeitraum('woche', '2026-10-03'), { von: '2026-09-28', bis: '2026-10-04', vorVon: '2026-09-21', vorBis: '2026-09-27' });   // Samstag → Montag davor
  assert.deepEqual(B.zeitraum('vorwoche', '2026-10-05'), { von: '2026-09-28', bis: '2026-10-04', vorVon: '2026-09-21', vorBis: '2026-09-27' }); // Montag
  assert.deepEqual(B.zeitraum('monat', '2026-02-10'), { von: '2026-02-01', bis: '2026-02-28', vorVon: '2026-01-01', vorBis: '2026-01-31' });
  assert.deepEqual(B.zeitraum('vormonat', '2026-01-15'), { von: '2025-12-01', bis: '2025-12-31', vorVon: '2025-11-01', vorBis: '2025-11-30' });
  assert.deepEqual(B.zeitraum('quartal', '2026-02-01'), { von: '2026-01-01', bis: '2026-03-31', vorVon: '2025-10-01', vorBis: '2025-12-31' });
  assert.deepEqual(B.zeitraum('jahr', '2028-02-29'), { von: '2028-01-01', bis: '2028-12-31', vorVon: '2027-01-01', vorBis: '2027-12-31' });
  assert.equal(B.zeitraum('woche', '2027-01-01').von, '2026-12-28');
});
