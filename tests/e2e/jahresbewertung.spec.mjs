/* Jahresbewertung im Browser: Übersicht Objekte × Stichtage, Vordruck öffnen, Zahl ändern (sofort neu gerechnet),
   speichern, alle fortschreiben, Excel-Übersicht, Sprung aus dem Reiter „Bewertungen“. Nur synthetische Daten
   (Fall „buero_mit_pv“ aus tests/referenz/jahresbewertung_faelle.json; Ergebnis 1.220.052,49 € laut Python-Rechnung).
   Bodenrichtwert 320 → 340: Boden + 412,5 × 20 × 0,9 = +7.425 €; Ertrag +7.425 − 7.425 × 4,5 % × 19,97 = +752,52 €;
   Ergebnis + (7.425 + 752,52) / 2 = 1.224.141,25 €. */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

const require = createRequire(import.meta.url);
const J = require('../../js/jahresbewertung.js');
const FALL = JSON.parse(readFileSync('tests/referenz/jahresbewertung_faelle.json', 'utf8')).faelle[0].vordruck;
const lv = page => page.locator('#lv_overlay');

test('Jahresbewertung: Übersicht, Vordruck ändern und speichern, fortschreiben, Excel', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Jahresbewertung' }).click();
  await expect(lv(page).locator('#lvt_jahresbewertung')).toHaveClass(/on/);
  await expect(lv(page)).toContainText('Hier stehen die jährlichen Preiseinschätzungen');
  await page.evaluate(async v => {
    await lvStart();
    const b = ImmoLvBewertung.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: 'Muster.xls', notiz: '', vordruck: ImmoJahresbewertung.bereinigen(v) });
    await lvSpeichern({ id: 'LJB', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', eigentuemerArt: 'bank', bewertungen: [b] });
    lvRender();
  }, FALL);
  const tab = lv(page).locator('.lv-tbl');
  await expect(tab.locator('thead')).toContainText('31.12.2025');
  await expect(tab).toContainText('1.220.052 €');
  // Vordruck öffnen, Bodenrichtwert ändern → sofort neu gerechnet
  await tab.getByRole('button', { name: /1\.220\.052 €/ }).click();
  const ed = lv(page).locator('#jb_editor');
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.220.052,49 €');
  await expect(ed.locator('[data-jbo="g.0.preis"]')).toHaveText('1.363 €/m²');
  await expect(ed.locator('[data-jbo="g.0.b.0.kosten"]')).toHaveText('240,12');
  await ed.locator('[data-jb="boden.0.brw"]').fill('340');
  await expect(ed.locator('[data-jbo="boden"]')).toHaveText('126.225,00 €');
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.224.141,25 €');
  await ed.locator('[data-jb="boden.0.brw"]').fill('3x');
  await expect(ed.locator('[data-jb="boden.0.brw"]')).toHaveClass(/lv-fehler/);
  await ed.locator('[data-jb="boden.0.brw"]').fill('340');
  // Mietzeile hinzufügen (Struktur ändert sich, Eingaben bleiben)
  await ed.getByRole('button', { name: 'Mietzeile' }).click();
  await expect(ed.locator('[data-jb="boden.0.brw"]')).toHaveValue('340');
  await expect(ed.locator('[data-jb="mieten.2.monat"]')).toHaveValue('0');
  await ed.getByRole('button', { name: 'Speichern' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Vordruck zum 31.12.2025 gespeichert: Ergebnis 1.224.141 €');
  await expect(tab).toContainText('1.224.141 €');
  // alle fortschreiben
  await lv(page).getByRole('button', { name: 'Alle fortschreiben' }).click();
  await expect(lv(page).locator('#lvf_jf_stichtag')).toHaveValue('2026-12-31');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('1 Entwurf zum 31.12.2026 angelegt');
  const soll = await page.evaluate(() => { const l = LV.liste.find(x => x.id === 'LJB'); return l.bewertungen.find(b => b.stichtag === '2026-12-31'); });
  expect(soll.status).toBe('entwurf');
  expect(soll.vordruck.gebaeude[0].bpi).toBe(143.1); expect(soll.vordruck.gebaeude[0].rnd).toBe(51);
  expect(Math.abs(soll.ergebnis - J.rechnen(soll.vordruck).ergebnis)).toBeLessThan(0.01);
  await expect(tab.locator('thead')).toContainText('31.12.2026');
  await expect(tab).toContainText('Entwurf');
  // nochmals fortschreiben: übersprungen, weil schon vorhanden
  await lv(page).getByRole('button', { name: 'Alle fortschreiben' }).click();
  await lv(page).locator('#lvf_jf_stichtag').fill('2026-12-31');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Übersprungen');
  // Excel-Übersicht
  const dl = page.waitForEvent('download');
  await lv(page).getByRole('button', { name: 'Übersicht als Excel' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^Jahresbewertung Liegenschaften \d{4}-\d{2}-\d{2}\.xlsx$/);
  // aus dem Reiter „Bewertungen“ in den Vordruck
  await page.evaluate(() => lvLiegenschaftOeffnen('LJB', 'bewertungen'));
  await lv(page).locator('.lv-tbl tbody tr').first().getByRole('button', { name: 'Vordruck' }).click();
  await expect(lv(page).locator('#jb_editor h3').first()).toContainText('Vordruck · Musterfiliale');
  await expect(lv(page).locator('#jb_editor [data-jb="stichtag"]')).toHaveValue('2026-12-31');
  await keineSkriptfehler(page);
});
