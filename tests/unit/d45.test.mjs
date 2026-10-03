// Einheitstests zu D45: Datenstand meldet Arbeitskopien mit Namen zum Löschen (Provisionsabrechnungen, Vollmachten)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../js/beratung.js');

test('Datenstand: bezahlte Provisionsabrechnungen und Vollmachten verkaufter Objekte zum Löschen', () => {
  const h = '2026-10-03';
  let l = B.datenstand({}, h).liste;
  assert.ok(!l.some(x => x.id === 'abrechnungen' || x.id === 'vollmachten'));
  l = B.datenstand({ abrechnungenAlt: 2, vollmachtenAlt: 1 }, h).liste;
  const a = l.find(x => x.id === 'abrechnungen'), v = l.find(x => x.id === 'vollmachten');
  assert.equal(a.status, 'bald'); assert.match(a.stand, /^2 seit über 12 Monaten/); assert.match(a.text, /§ 14b UStG/);
  assert.equal(v.status, 'bald'); assert.match(v.stand, /^1 Objekt seit/);
  assert.equal(B.isoPlusMonate('2026-10-03', -12), '2025-10-03');
  assert.equal(B.isoPlusMonate('2024-02-29', -12), '2023-02-28');
});
