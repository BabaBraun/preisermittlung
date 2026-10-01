/* Liegenschaften im Browser: Übersicht Liegenschaften × Stichtage, Vordruck öffnen, Zahl ändern (sofort neu gerechnet),
   speichern, alle fortschreiben, Excel-Übersicht, Liegenschaft bearbeiten. Nur synthetische Daten
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

test('Liegenschaften: Übersicht, Vordruck ändern und speichern, fortschreiben, Excel', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  await expect(lv(page).locator('#lvt_uebersicht')).toHaveClass(/on/);
  await expect(lv(page)).toContainText('Hier stehen die Liegenschaften mit ihren Preiseinschätzungen');
  await expect(lv(page).locator('#lv_titel_t')).toHaveText('Liegenschaften');
  await expect(page.locator('.tile.q', { hasText: 'Liegenschaftsverwaltung' })).toHaveCount(0);
  await page.evaluate(async v => {
    await lvStart();
    const b = ImmoLiegenschaften.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: 'Muster.xls', notiz: '', vordruck: ImmoJahresbewertung.bereinigen(v) });
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
  await expect(ed.locator('[data-jbm="g.0.preis"]').first()).toHaveValue('1.363');
  await expect(ed.locator('[data-jbm="g.0.b.0"]')).toHaveValue('240,12');
  await ed.locator('[data-jb="boden.0.brw"]').first().fill('340');
  await expect(ed.locator('[data-jbo="boden"]')).toHaveText('126.225,00 €');
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.224.141,25 €');
  await ed.locator('[data-jb="boden.0.brw"]').first().fill('3x');
  await expect(ed.locator('[data-jb="boden.0.brw"]').first()).toHaveClass(/lv-fehler/);
  await ed.locator('[data-jb="boden.0.brw"]').first().fill('340');
  // Mietzeile hinzufügen (Struktur ändert sich, Eingaben bleiben)
  await ed.getByRole('button', { name: 'Mietzeile' }).click();
  await expect(ed.locator('[data-jb="boden.0.brw"]').first()).toHaveValue('340');
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
  expect((await dl).suggestedFilename()).toMatch(/^Liegenschaften Bewertungen \d{4}-\d{2}-\d{2}\.xlsx$/);
  // Liegenschaft bearbeiten (Stammdaten)
  await lv(page).getByRole('button', { name: 'Liegenschaft Musterfiliale bearbeiten' }).click();
  await expect(lv(page).locator('#lvf_name')).toHaveValue('Musterfiliale');
  await lv(page).locator('#lvf_ort').fill('Neustadt');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Liegenschaft gespeichert');
  await expect(tab).toContainText('Musterweg 1, 74000 Neustadt');
  await keineSkriptfehler(page);
});

test('Liegenschaften: Vordruck ohne vorhandene Liegenschaft — Vorlage wählen, Liegenschaft im Formular anlegen, Kopie zum nächsten Stichtag', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  await lv(page).getByRole('button', { name: 'Vordruck anlegen' }).click();
  await expect(lv(page).locator('#lvf_jn_objekt')).toHaveValue('__neu');
  await expect(lv(page).locator('input[name=jn_vorlage]:checked')).toHaveValue('bank');
  // ohne Bezeichnung und Anschrift: Meldung und Feld sichtbar (nicht unter Kopfzeile und Reitern)
  await lv(page).getByRole('button', { name: 'Vordruck öffnen', exact: true }).click();
  await expect(lv(page).locator('#lv_formfehler')).toContainText('Bezeichnung der Liegenschaft fehlt');
  await expect(lv(page).locator('#lvf_jn_name')).toHaveClass(/lv-fehler/);
  expect(await sichtbarOben(page, '#lv_formfehler')).toBe(true);
  await lv(page).locator('#lvf_jn_name').fill('Musterfiliale'); await lv(page).locator('#lvf_jn_ort').fill('Musterstadt');
  await expect(lv(page).locator('#jb_vorlagen label', { hasText: 'Leerer Vordruck' })).toHaveCount(0);   // ergab ohne NHK, Index und Mieten 0
  await lv(page).locator('#jb_vorlagen label', { hasText: 'Bankgebäude mit Nebengebäude' }).click();
  await lv(page).getByRole('button', { name: 'Vordruck öffnen', exact: true }).click();
  const ed = lv(page).locator('#jb_editor');
  await expect(ed.locator('h3').first()).toContainText('Musterfiliale (neue Liegenschaft)');
  await expect(ed.locator('#jb_offen')).toContainText('Grundstücksanteil I m² (1.2)');
  await expect(ed.locator('#jb_offen')).toContainText('Mieterträge (1.3)');
  // Bodenrichtwert wie in der Mappe unter 2.1 „Richtwert“: der Preisansatz übernimmt ihn
  await ed.locator('[data-jb="boden.0.richtwert"]').fill('400');
  await expect(ed.locator('[data-jb="boden.0.brw"]')).toHaveCount(4);   // 1.2, 2.1, 4.1, 5.5 — überall dieselbe Angabe
  for (const f of await ed.locator('[data-jb="boden.0.brw"]').all()) await expect(f).toHaveValue('400');
  await expect(ed.locator('#jb_offen')).not.toContainText('Bodenrichtwert');
  await expect(ed.locator('[data-jb="gebaeude.1.text"]')).toHaveValue('Nebengebäude (Lager / Scheune)');
  await expect(ed.locator('[data-jb="gebaeude.0.bpi"]')).toHaveValue('143,1');
  // Werte der Hand-Rechnung aus tests/unit/jahresbewertung.test.mjs (Nebengebäude ohne BGF und Miete)
  for (const [p, w] of [['boden.0.flaeche', '800'], ['gebaeude.0.baujahr', '1975'], ['gebaeude.0.bgf', '900'], ['mieten.0.monat', '6000']]) await ed.locator('[data-jb="' + p + '"]').first().fill(w);
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.012.202,00 €');
  await expect(ed.locator('#jb_offen')).toHaveText('Noch offen: Baujahr Nebengebäude (Lager / Scheune) (1.3) · BGF Nebengebäude (Lager / Scheune) (1.3)');
  await ed.getByRole('button', { name: 'Speichern' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Liegenschaft „Musterfiliale“ angelegt. Vordruck zum 31.12.2026 gespeichert: Ergebnis 1.012.202 €');
  const l = await page.evaluate(() => LV.liste.map(x => ({ name: x.name, ort: x.ort, art: x.art, n: x.bewertungen.length, status: x.bewertungen[0].status })));
  expect(l).toEqual([{ name: 'Musterfiliale', ort: 'Musterstadt', art: 'gewerbe', n: 1, status: 'entwurf' }]);
  // zweiter Vordruck: Vorschlag Kopie, Angaben übernommen
  await lv(page).getByRole('button', { name: 'Vordruck anlegen für Musterfiliale' }).click();
  await expect(lv(page).locator('input[name=jn_vorlage]:checked')).toHaveValue('kopie');
  await lv(page).locator('#lvf_jn_stichtag').fill('2027-12-31');
  await lv(page).getByRole('button', { name: 'Vordruck öffnen', exact: true }).click();
  await expect(ed.locator('[data-jb="gebaeude.0.bgf"]').first()).toHaveValue('900');
  await expect(ed.locator('[data-jb="@quelle"]')).toHaveValue('Kopie des Vordrucks zum 31.12.2026');
  await ed.getByRole('button', { name: 'Speichern' }).click();
  await expect(lv(page).locator('.lv-tbl thead')).toContainText('31.12.2027');
  // neue Liegenschaft wählen blendet die Kopie aus
  await lv(page).getByRole('button', { name: 'Vordruck anlegen', exact: true }).click();
  await expect(lv(page).locator('#jb_neu_l')).toBeHidden();
  await lv(page).locator('#lvf_jn_objekt').selectOption('__neu');
  await expect(lv(page).locator('#jb_neu_l')).toBeVisible();
  await expect(lv(page).locator('input[name=jn_vorlage][value=kopie]')).toHaveCount(0);
  await keineSkriptfehler(page);
});

test('Liegenschaften: Sicherung mit Vordrucken direkt einspielen; Liegenschaft ohne Bezeichnung', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  const b = await page.evaluate(v => ImmoLiegenschaften.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: '', notiz: '', vordruck: ImmoJahresbewertung.bereinigen(v) }), FALL);
  const datei = { typ: 'immoapp-verwaltung', version: 1, liegenschaften: [{ id: 'LJB', name: 'Musterfiliale', ort: 'Musterstadt', art: 'gewerbe', eigentuemerArt: 'bank', einheiten: [], vertraege: [], zahlungen: [], mahnungen: [], einstellungen: {}, bewertungen: [b], geaendert: 1 }] };
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  const fc = page.waitForEvent('filechooser');
  await lv(page).getByRole('button', { name: 'Sicherung einspielen' }).click();
  await (await fc).setFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(datei)) });
  await expect(lv(page).locator('.lv-ok')).toContainText('Sicherung eingespielt: 1 neu');
  await expect(lv(page).locator('#lvt_uebersicht')).toHaveClass(/on/);
  await expect(lv(page).locator('.lv-tbl')).toContainText('1.220.052 €');
  // Liegenschaft ohne Bezeichnung: Anschrift wird Bezeichnung; ganz leer: Meldung sichtbar
  await lv(page).getByRole('button', { name: 'Liegenschaft anlegen' }).click();
  await lv(page).locator('#lvf_strasse').fill('Hauptstraße 1'); await lv(page).locator('#lvf_ort').fill('Musterstadt');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Liegenschaft „Hauptstraße 1, Musterstadt“ angelegt. Jetzt den ersten Vordruck anlegen.');
  await expect(lv(page).locator('#lvf_jn_objekt')).toHaveValue(/^L/);   // gleich weiter zum Vordruck dieser Liegenschaft
  expect(await page.evaluate(() => LV.liste.map(l => l.name).sort())).toEqual(['Hauptstraße 1, Musterstadt', 'Musterfiliale']);
  await lv(page).getByRole('button', { name: 'Abbrechen' }).click();
  await page.evaluate(() => lvNeueLiegenschaft());
  await lv(page).locator('.lv-formbox button.primary').scrollIntoViewIfNeeded();
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('#lv_formfehler')).toContainText('Bezeichnung fehlt');
  expect(await sichtbarOben(page, '#lv_formfehler')).toBe(true);
  await keineSkriptfehler(page);
});

/* Element liegt im sichtbaren Bereich und nicht unter der festen Kopfzeile bzw. den Reitern */
async function sichtbarOben(page, sel) {
  return page.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 10, r.top + Math.min(r.height / 2, 12)); return !!hit && (hit === e || e.contains(hit)); }, sel);
}

test('Vordruck wie die Excel-Mappe: Kapitel 1–8, Angaben des Dokuments, Kartenbild, Dokument mit PDF/Word', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  await page.evaluate(async v => {
    await lvStart();
    const b = ImmoLiegenschaften.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: '', notiz: '', vordruck: ImmoJahresbewertung.bereinigen(v) });
    await lvSpeichern({ id: 'LJB', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', eigentuemerArt: 'bank', bewertungen: [b] });
    jbOeffnen('LJB', 'BW1');
  }, FALL);
  const ed = lv(page).locator('#jb_editor');
  const KAP = ['Deckblatt', '1. Objektdaten', '2. Bodenrichtwert', '3. Bautechnische Daten', '4. PV-Anlage', '5. Preisansatz Grund und Boden',
    '6. Preisansatz (Bausubstanz als Grundlage)', '7. Preisansatz (Mietertrag als Grundlage)', '8. Zusammenfassung / Sonstiges'];
  await expect(ed.locator('.jb-kap-t')).toHaveText(KAP);
  for (const u of ['1.3 Gebäude', '2.1 Grundstücksmerkmale', '3.4 Allgemeiner Eindruck / Erläuterungen', '4.1 Preisansatz PV-Anlage', '6.1 Berechnung der Restnutzungsdauer und Alterswertminderung',
    '6.2 Berechnung des Gebäudepreis in Abhängigkeit der Restnutzungsdauer', '6.5 Preisansatz (Bausubstanz als Grundlage)', '7.2 Daten für die Preisermittlung auf Grundlage des Gebäudeertrags',
    '7.3 Preisansatz Gebäude (Mietertrag als Grundlage)', '7.4 Preisansatz (Mietertrag als Grundlage)', '8.1 Die einzelnen Preiskomponenten für Sie im Überblick'])
    await expect(ed.locator('.jb-u', { hasText: u })).toHaveCount(1);
  await expect(ed.locator('[data-jbm="substanz"]').first()).toHaveValue(/^[\d.]+,\d\d$/);
  // Angaben des Dokuments; Gewerbeanteil aus markierten Mietzeilen (Laden 950 € × 12)
  await ed.locator('[data-jb="deckblatt.auftraggeber"]').fill('Muster AG');
  await ed.locator('[data-jb="objekt"]').first().fill('Bürogebäude mit Laden');
  await expect(ed.locator('[data-jb="objekt"]').nth(1)).toHaveValue('Bürogebäude mit Laden');   // 1.1 Art der Bebauung = Objekt
  await ed.locator('[data-jb="objektdaten.merkmale.0.wert"]').fill('massiv');
  await ed.locator('[data-jb="boden.0.flst"]').fill('123/4');
  await ed.locator('[data-jb="mieten.1.gewerblich"]').check();
  await expect(ed.locator('[data-jbm="e.0.gew"]')).toHaveValue('11.400,00');
  await ed.locator('[data-jb="ort"]').fill('Musterstadt');
  // ohne PV-Anlage rücken die Kapitel auf (wie in der Mappe ohne PV), mit PV wieder zurück
  await ed.locator('.jb-pv-schalter input').uncheck();
  await expect(ed.locator('.jb-kap-t').nth(4)).toHaveText('4. Preisansatz Grund und Boden');
  await expect(ed.locator('[data-jb="deckblatt.auftraggeber"]')).toHaveValue('Muster AG');
  await ed.locator('.jb-pv-schalter input').check();
  await expect(ed.locator('.jb-kap-t').nth(4)).toHaveText('4. PV-Anlage');
  // Bild der Bodenrichtwertkarte
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await ed.locator('.jb-bild-neu input').setInputFiles({ name: 'karte.png', mimeType: 'image/png', buffer: png });
  await expect(ed.locator('.jb-bilder figure img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  // Dokument: Deckblatt und Kapitel wie die Mappe, Mittel 8.1, Bild; Word; zurück ohne Verlust
  await ed.getByRole('button', { name: 'Vordruck ansehen' }).last().click();
  const r = page.locator('#report.jb-dok');
  await expect(r).toBeVisible();
  await expect(r.locator('h2.jbd-titel')).toHaveText(KAP.slice(1));
  await expect(r.locator('.jbd-deck')).toContainText('Muster AG');
  await expect(r.locator('.jbd-deck')).toContainText('Bürogebäude mit Laden');
  await expect(r.locator('table.jbd-box')).toContainText('Mittel aus den o.g. Preisansätzen');
  await expect(r.locator('table.jbd-box tr.jbd-mittel')).toContainText('1.220.052 €');
  await expect(r).toContainText('Anteil gewerbliche Kaltmiete');
  await expect(r).toContainText('123/4');
  await expect(r.locator('.jbd-ort')).toHaveText('Musterstadt, 31.12.2025');
  await expect(r.locator('.jbd-bilder img')).toHaveCount(1);
  expect(await page.evaluate(() => document.getElementById('report').dataset.pdfname)).toMatch(/^Preiseinschätzung Bürogebäude mit Laden .*Stichtag 31\.12\.2025$/);
  const dl = page.waitForEvent('download');
  await r.getByRole('button', { name: 'Word' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^Preiseinschätzung Bürogebäude mit Laden.*\.docx$/);
  await r.getByRole('button', { name: 'zurück', exact: true }).click();
  await expect(lv(page)).toBeVisible();
  await expect(ed.locator('[data-jb="deckblatt.auftraggeber"]')).toHaveValue('Muster AG');
  await ed.getByRole('button', { name: 'Speichern' }).click();
  const v = await page.evaluate(() => LV.liste.find(l => l.id === 'LJB').bewertungen[0].vordruck);
  expect([v.deckblatt.auftraggeber, v.objekt, v.objektdaten.merkmale[0].wert, v.boden[0].flst, v.mieten[1].gewerblich, v.ort, v.bilder.karte.length])
    .toEqual(['Muster AG', 'Bürogebäude mit Laden', 'massiv', '123/4', true, 'Musterstadt', 1]);
  // gespeicherter Vordruck ohne Editor als Dokument
  await page.evaluate(() => jbDokAnsehen('LJB', 'BW1'));
  await expect(page.locator('#report.jb-dok h2.jbd-titel').first()).toHaveText('1. Objektdaten');
  await page.locator('#report').getByRole('button', { name: 'zurück', exact: true }).click();
  await keineSkriptfehler(page);
});

test('Vordruck: jede Zahl änderbar — gerechnete Felder überschreiben (gelb), weiterrechnen, zurücksetzen, speichern', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  await page.evaluate(async v => {
    await lvStart();
    const b = ImmoLiegenschaften.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: '', notiz: '', vordruck: ImmoJahresbewertung.bereinigen(v) });
    await lvSpeichern({ id: 'LJB', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', bewertungen: [b] });
    jbOeffnen('LJB', 'BW1');
  }, FALL);
  const ed = lv(page).locator('#jb_editor');
  // keine Zahl nur als Text: außerhalb von Eingabefeldern stehen höchstens Beschriftungen und Hinweise
  const reineZahlen = await ed.evaluate(el => { const a = []; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode, t = n.textContent.trim();
      if (/\d/.test(t) && !n.parentElement.closest('h3,h4,label,.hint,.lv-klein,summary,option,th,.jb-erg,.jb-l,button,textarea,.jb-geb-kopf,.jb-nhk-t,.jb-b,td:first-child')) a.push(t); }
    return a; });
  expect(reineZahlen).toEqual([]);
  expect(await ed.locator('[data-jbm]').count()).toBeGreaterThan(60);
  // Gebäudepreis 1.363 → 1.400 €/m²: Gebäudewert 640 × 1.400, Substanz und Ergebnis rechnen mit
  const preis = ed.locator('[data-jbm="g.0.preis"]').first();
  await preis.fill('1.400'); await preis.blur();
  await expect(preis).toHaveClass(/jb-manuell/);
  await expect(ed.locator('[data-jbm="g.0.wert"]').first()).toHaveValue('896.000,00');
  await expect(ed.locator('[data-jbm="g.0.preis"]').nth(1)).toHaveValue('1.400');          // 6.4 zeigt denselben Wert
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.231.892,49 €');          // + 37 × 640 / 2 = 11.840
  // Vervielfältiger 19,97 → 20 von Hand: Ertrag steigt um Gebäudereinertrag × 0,03
  const rein = await page.evaluate(() => ImmoJahresbewertung.rechnen(JB_EDIT.v).teile[0].gebRein);
  const vf = ed.locator('[data-jbm="e.0.vf"]').first(); await vf.fill('20'); await vf.blur();
  const r = await page.evaluate(() => ImmoJahresbewertung.rechnen(JB_EDIT.v));
  expect(Math.abs(r.teile[0].wert - rein * 20)).toBeLessThan(0.005);
  // zurücksetzen: Rechnung gilt wieder
  await ed.locator('[data-reset="g.0.preis"]').first().click();
  await expect(preis).toHaveValue('1.363'); await expect(preis).not.toHaveClass(/jb-manuell/);
  await ed.locator('[data-reset="e.0.vf"]').first().click();
  await expect(ed.locator('[data-jbo="ergebnis"]')).toHaveText('1.220.052,49 €');
  // Ergebnis von Hand, Einheiten beim Eintippen: wird gespeichert und in der Übersicht gezeigt
  await ed.locator('[data-jb="boden.0.richtwert"]').fill('320 €/m²');
  await expect(ed.locator('[data-jb="boden.0.richtwert"]')).not.toHaveClass(/lv-fehler/);
  const erg = ed.locator('[data-jbm="ergebnis"]').first(); await erg.fill('1.250.000 €'); await erg.blur();
  await ed.getByRole('button', { name: 'Speichern' }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Ergebnis 1.250.000 €');
  const v = await page.evaluate(() => LV.liste.find(l => l.id === 'LJB').bewertungen[0]);
  expect(v.ergebnis).toBe(1250000); expect(v.vordruck.manuell).toEqual({ ergebnis: 1250000 });
  await keineSkriptfehler(page);
});


test('Historischer Vergleich: zwei Stichtage nebeneinander, Veränderung farbig, Zahl ändern geht in den Vordruck, Dokument ohne Anschrift', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.locator('.tile.q', { hasText: 'Liegenschaften' }).click();
  await page.evaluate(async v => {
    await lvStart();
    const J = ImmoJahresbewertung, L = ImmoLiegenschaften;
    const a = L.ausVordruck({ id: 'BW1', art: 'preiseinschaetzung', status: 'final', quelle: '', notiz: '', vordruck: J.bereinigen(v) });
    const b = L.ausVordruck({ id: 'BW2', art: 'preiseinschaetzung', status: 'entwurf', quelle: '', notiz: '', vordruck: J.fortschreiben(v, '2026-12-31').vordruck });
    await lvSpeichern({ id: 'LJB', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', bewertungen: [a, b] });
    lvRender();
  }, FALL);
  await lv(page).getByRole('button', { name: 'Stichtage vergleichen für Musterfiliale' }).click();
  const tab = lv(page).locator('#jb_vergleich');
  await expect(tab.locator('thead')).toContainText('31.12.2025'); await expect(tab.locator('thead')).toContainText('31.12.2026 (Entwurf)');
  const zeile = t => tab.locator('tr.jb-vg-z', { has: page.locator('td.jb-vg-l', { hasText: t }) });
  const mittel = zeile('Mittelwert (Preisempfehlung)');
  // Werte wie im Vordruck: Mittelwert 1.220.052,49 € (Python-Rechnung) → 1.230.554,00 € (fortgeschrieben, Index Mai 2026; 1.230.553,997)
  await expect(mittel.locator('input').first()).toHaveValue('1.220.052,49');
  await expect(mittel.locator('input').nth(1)).toHaveValue('1.230.554,00');
  await expect(mittel).toHaveClass(/jb-vg-hervor/); await expect(zeile('Preisansatz Bausubstanz')).toHaveClass(/jb-vg-hervor/);
  await expect(mittel.locator('.jb-vg-d')).toHaveClass(/jb-vg-auf/);
  await expect(mittel.locator('.jb-vg-d')).toHaveText('+10.501,51 € (+0,9 %)');
  await expect(zeile('Restnutzungsdauer').locator('.jb-vg-d')).toHaveClass(/jb-vg-ab/);
  await expect(zeile('Bodenrichtwert').locator('.jb-vg-d')).toHaveText('unverändert');
  await expect(lv(page).locator('#jb_vg_text')).toContainText('Der Mittelwert stieg von 1.220.052 € auf 1.230.554 € (+0,9 %).');
  // keine Namen, keine Anschrift, keine Mietzeilen („Büro“, „Laden“) — nur Objektart, Gebäudeart und Ort
  expect(await lv(page).locator('.jb-vg').innerText()).not.toMatch(/Musterweg|74000|\bBüro\b|\bLaden\b/);
  // jede Zahl ein Feld: Monatsmiete 2026 +100 € → Ertrag + 1.200 × 0,8 × 19,87 = +19.075,20 €, Mittelwert + 9.537,60 € = 1.240.091,60 €
  const miete = zeile('Monatsmiete').locator('input').nth(1);
  await miete.fill('7.450'); await miete.blur();
  await expect(miete).toHaveClass(/jb-manuell/);
  await expect(mittel.locator('input').nth(1)).toHaveValue('1.240.091,60');
  await expect(zeile('Monatsmiete').locator('.jb-vg-d')).toHaveText('+100,00 € (+1,4 %)');
  // Eingabe (Bodenrichtwert) und Zurücksetzen
  const brw = zeile('Bodenrichtwert').locator('input').nth(1); await brw.fill('330 €/m²'); await brw.blur();
  await expect(zeile('Bodenrichtwert').locator('.jb-vg-d')).toHaveClass(/jb-vg-auf/);
  await zeile('Monatsmiete').locator('[data-vgreset="1"]').click();
  await expect(miete).toHaveValue('7.350,00'); await expect(miete).not.toHaveClass(/jb-manuell/);
  await miete.fill('7.450'); await miete.blur();
  // Speichern: Änderungen stehen im Vordruck des Stichtags, der frühere bleibt unverändert
  await lv(page).getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Vordruck zum 31.12.2026 geändert');
  const gesp = await page.evaluate(() => LV.liste.find(l => l.id === 'LJB').bewertungen.map(b => [b.id, b.vordruck.boden[0].brw, b.vordruck.manuell]));
  expect(gesp).toEqual([['BW1', 320, {}], ['BW2', 330, { 'm.monat': 7450 }]]);
  // Dokument: Objektart und Ort, keine Anschrift
  await lv(page).getByRole('button', { name: /Als Dokument/ }).click();
  const dok = page.locator('#report .jbd-vg');
  await expect(dok).toContainText('Historischer Vergleich'); await expect(dok).toContainText('Musterstadt');
  expect(await dok.innerText()).not.toMatch(/Musterweg|74000|\bBüro\b|\bLaden\b/);
  await expect(page.locator('#report')).toHaveAttribute('data-pdfname', /^Historischer Vergleich .*Musterstadt 31\.12\.2025 und 31\.12\.2026$/);
  await page.locator('#report').getByRole('button', { name: 'zurück' }).click();
  await expect(lv(page).locator('#jb_vergleich')).toBeVisible();
  await keineSkriptfehler(page);
});
