// Einheitstests zu js/fristen.js (D49): Feiertage Baden-Württemberg, §§ 187, 188, 193 BGB
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../../js/fristen.js');

test('Feiertage BW 2026 und 2027 (§ 1 FTG BW und 3. Oktober), ohne kirchliche Feiertage', () => {
  assert.equal(F.ostersonntag(2026), '2026-04-05');
  assert.equal(F.ostersonntag(2027), '2027-03-28');
  assert.equal(F.ostersonntag(2024), '2024-03-31');
  assert.deepEqual(F.feiertageBW(2026).map(x => x[0]), ['2026-01-01', '2026-01-06', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-06-04', '2026-10-03', '2026-11-01', '2026-12-25', '2026-12-26']);
  assert.deepEqual(F.feiertageBW(2027).map(x => x[0]), ['2027-01-01', '2027-01-06', '2027-03-26', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-17', '2027-05-27', '2027-10-03', '2027-11-01', '2027-12-25', '2027-12-26']);
  assert.equal(F.feiertagBW('2026-04-02'), '');        // Gründonnerstag
  assert.equal(F.feiertagBW('2026-10-31'), '');        // Reformationstag
  assert.equal(F.feiertagBW('2026-11-18'), '');        // Buß- und Bettag
  assert.equal(F.werktagBW('2026-10-03'), false);
  assert.equal(F.werktagBW('2026-10-05'), true);
});

test('Widerrufsfrist 14 Tage mit § 193 BGB — Beispiele aus der Rechtsprüfung', () => {
  const f = s => F.fristTage(s, 14, { werktag: true });
  assert.equal(f('2026-10-05'), '2026-10-19');   // Montag
  assert.equal(f('2026-10-08'), '2026-10-22');   // Belehrung nachgereicht
  assert.equal(f('2026-12-11'), '2026-12-28');   // 25.12. Feiertag, 26.12. Feiertag, 27.12. Sonntag
  assert.equal(f('2026-12-23'), '2027-01-07');   // 06.01. Erscheinungsfest
  assert.equal(f('2026-10-10'), '2026-10-26');   // Samstag → Montag
  assert.equal(f('2027-10-18'), '2027-11-02');   // 01.11. Allerheiligen
  assert.equal(F.fristTage('2026-10-10', 14), '2026-10-24');   // ohne § 193
});

test('Monatsfristen nach § 188 Abs. 2 und 3 BGB', () => {
  assert.equal(F.fristMonate('2026-03-15', 6), '2026-09-15');
  assert.equal(F.fristMonate('2027-01-31', 1), '2027-02-28');
  assert.equal(F.fristMonate('2027-08-31', 6), '2028-02-29');
  assert.equal(F.fristMonate('2026-10-05', 12), '2027-10-05');
  assert.equal(F.fristMonate('2026-12-25', 12, { werktag: true }), '2027-12-27');
  assert.equal(F.tageBis('2026-10-01', '2026-10-15'), 14);
  assert.equal(F.fristTage('kein Datum', 14), '');
});
