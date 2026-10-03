/* Beratung & Werkzeuge (D38): Kacheln — Öffnen, Rechnen wie js/beratung.js, Dokument, Kundenakte, Übergabeprotokoll
   mit Foto und Unterschriften in der Datenbank, Wertmonitor über gesicherte Projekte, Gesamtsicherung. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler, JETZT } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';

const WERKZEUGE = [['akquise', 'Akquise'], ['unterlagen', 'Unterlagen'], ['interessenten', 'Interessenten'], ['bieter', 'Bieterverfahren'], ['eigentuemerbericht', 'Eigentümerbericht'], ['foto', 'Fotostudio'], ['portal', 'Portal-Export'], ['aushang', 'Aushang'], ['social', 'Social Media'],
  ['vorlagen', 'Vorlagen'], ['rundschreiben', 'Rundschreiben'], ['fahrplan', 'Verkaufsfahrplan'], ['notar', 'Notarauftrag'], ['provision', 'Provision'], ['uebergabe', 'Übergabeprotokoll'], ['erbe', 'Übergeben & Vererben'],
  ['rente', 'Wohnen im Alter'], ['kaufmiete', 'Kaufen oder Mieten'], ['nebenkosten', 'Kaufnebenkosten'], ['grundstueck', 'Grundstückspotenzial'], ['etw', 'ETW-Kaufcheck'], ['wertmonitor', 'Wertmonitor'],
  ['kalender', 'Kalender'], ['aktivitaeten', 'Aktivitäten'], ['jahr', 'Mein Jahr'], ['datenstand', 'Datenstand']];   // D38–D48 — in der Reihenfolge der Bereiche
function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const feld = (page, id) => page.locator('#wz_' + id);
async function eintragen(page, werte) { for (const [id, v] of Object.entries(werte)) await feld(page, id).fill(v); }

test('Sechsundzwanzig Kacheln in vier Bereichen auf der Startseite und unter „Mehr“, jede öffnet ihr Werkzeug (D38–D48)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => appSetTab('home'));
  const kacheln = page.locator('#start_wz .tile');
  await expect(kacheln).toHaveCount(26);
  await expect(page.locator('#start_wz .wz-gruppe')).toHaveCount(4);
  expect(await kacheln.evaluateAll(l => l.map(k => k.getAttribute('onclick').match(/'(\w+)'/)[1]))).toEqual(WERKZEUGE.map(w => w[0]));
  for (const [id, titel] of WERKZEUGE) {
    await page.locator(`#start_wz .tile[onclick="wzOeffnen('${id}')"]`).click();
    await expect(page.locator('#wz_overlay')).toHaveClass(/on/);
    await expect(page.locator('#wz_titel')).toHaveText(titel);
    await page.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(page.locator('#wz_overlay')).not.toHaveClass(/on/);
  }
  await page.evaluate(() => appSetTab('more'));
  for (const [, titel] of WERKZEUGE) await expect(page.locator('#app_more').getByRole('button', { name: titel, exact: true })).toBeVisible();
  // Eingaben der Werkzeuge gehören nicht zur Bewertung
  await page.evaluate(() => wzOeffnen('etw'));
  await feld(page, 'etw_wohnflaeche').fill('77');
  expect(await page.evaluate(() => Object.keys(collect()).filter(k => k.startsWith('wz_')))).toEqual([]);
  await keineSkriptfehler(page);
});

test('Übergeben & Vererben: Rechnung wie ImmoBeratung, zwei Freibeträge, Vergleich, Dokument und Kundenakte (D38)', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('erbe'));
  await eintragen(page, { erbe_wert: '1.400.000', erbe_jahreswert: '30.000', erbe_personen_0_alter: '68', erbe_personen_1_alter: '66' });
  const soll = await page.evaluate(() => ImmoBeratung.uebertragung(erbEingabe(wzZustand('erbe'))));
  const vMax = await page.evaluate(() => Math.max(ImmoBeratung.vervielfaeltigerBewG(68, 'm'), ImmoBeratung.vervielfaeltigerBewG(66, 'w')));
  expect(soll.recht.kapitalwert).toBeCloseTo(30000 * vMax, 6);
  await expect(page.locator('#wz_erbe_ergebnis .subtotal')).toContainText(await page.evaluate(s => wzEur(s), soll.steuer));
  // ein Schenker statt zwei: nur ein Freibetrag je Kind → mehr Steuer
  await page.locator('#wz_erbe_zweiSchenker').uncheck();
  const einer = await page.evaluate(() => ImmoBeratung.uebertragung(erbEingabe(wzZustand('erbe'))).steuer);
  expect(einer).toBeGreaterThan(soll.steuer);
  await expect(page.locator('#wz_erbe_vergleich')).toContainText('Erbe in');
  // Kundenakte: Notiz anlegen
  await page.evaluate(() => kdSpeichern({ id: 'k_test', vorname: 'Erika', nachname: 'Musterfrau', kontakte: [], finanzierungen: [], erstellt: 1 }));
  await page.getByRole('button', { name: 'Beim Kunden ablegen' }).click();
  await page.locator('#kd_overlay').getByText('Erika Musterfrau').first().click();
  await expect.poll(() => meldungen.join('|')).toContain('Gesprächsnotiz');
  const notiz = await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_test').kontakte.at(-1));
  expect(notiz.art).toBe('Übergeben & Vererben'); expect(notiz.text).toContain('Steuer zusammen');
  // Dokument im Bericht und zurück
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Übergeben und Vererben');
  await expect(page.locator('#report .wzd')).toContainText('Steuer je Empfänger');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#wz_overlay')).toHaveClass(/on/);
  await keineSkriptfehler(page);
});

test('Wohnen im Alter: Wohnrecht, Einmalzahlung und Leibrente aus derselben Sterbetafel-Rechnung (D38)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('rente'));
  await page.locator('#wz_rente_zweiPersonen').check();
  await eintragen(page, { rente_wert: '450.000', rente_miete: '1.100', rente_personen_0_alter: '76', rente_personen_1_alter: '79' });
  await page.locator('#wz_rente_personen_1_g').selectOption('m');
  await expect(page.locator('#wz_rente_tab .wz-karte')).toHaveCount(6);   // fünf Wege und der Kredit mit Grundschuld
  const r = await page.evaluate(() => ImmoBeratung.verrentung(renteEingabe(wzZustand('rente'))));
  expect(r.wohnrecht).toBeCloseTo(12 * 1100 * r.fLeben, 6);
  await expect(page.locator('#wz_rente_tab .wz-karte').nth(1)).toContainText(await page.evaluate(x => wzEur(x), r.rente));
  await keineSkriptfehler(page);
});

test('Übergabeprotokoll: Zähler mit Foto, Unterschriften, Abschließen sperrt, Dokument, bleibt nach Neuladen, Löschen (D38)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('uebergabe'));
  await page.getByRole('button', { name: 'Neues Protokoll' }).click();
  await eintragen(page, { uebergabe_anschrift: 'Musterweg 3, 74000 Musterstadt', uebergabe_uebergeber: 'Erika Musterfrau', uebergabe_uebernehmer: 'Max Beispiel',
    uebergabe_zaehler_0_nummer: 'Z-1', uebergabe_zaehler_0_stand: '45.231,7 kWh' });
  const wahl = page.waitForEvent('filechooser');
  await page.locator('.ub-reihe').first().getByRole('button', { name: 'Foto' }).click();
  await (await wahl).setFiles({ name: 'zaehler.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(FOTO_JPEG.split(',')[1], 'base64') });
  await expect(page.locator('.ub-reihe').first().locator('img')).toHaveCount(1);
  // ohne Unterschriften lässt sich nicht abschließen
  await page.getByRole('button', { name: 'Abschließen' }).click();
  await expect(page.locator('#ub_status')).toHaveText('Entwurf');
  for (const c of await page.locator('canvas.ub-canvas').all()) {
    await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox();
    await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 30, { steps: 8 }); await page.mouse.up();
  }
  await expect(page.locator('#ub_status')).toHaveText(/Beide haben unterschrieben/);
  await page.getByRole('button', { name: 'Abschließen' }).click();
  await expect(page.locator('#ub_status')).toHaveText(/Abgeschlossen am/);
  await expect(page.locator('#wz_uebergabe_anschrift')).toBeDisabled();
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Übergabeprotokoll');
  await expect(page.locator('#report .wzd-unterschriften img')).toHaveCount(2);
  await expect(page.locator('#report .wzd-bild')).toHaveCount(1);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // in der Datenbank, nicht im localStorage
  expect(await page.evaluate(() => (localStorage.getItem('ia_wz') || '').includes('Musterfrau'))).toBe(false);
  await page.reload(); await page.waitForFunction(() => typeof window.compute === 'function'); await page.evaluate(() => window.IA_BEREIT_P);
  await page.evaluate(() => wzOeffnen('uebergabe'));
  await expect(page.locator('#wz_body tbody tr')).toHaveCount(1);
  await expect(page.locator('#wz_body tbody tr')).toContainText('Abgeschlossen am');
  await page.getByRole('button', { name: 'Protokoll löschen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Noch kein Protokoll');
  expect(await page.evaluate(async () => (await iaAlle('protokolle')).length)).toBe(0);
  await keineSkriptfehler(page);
});

test('Grundstückspotenzial und ETW-Kaufcheck rechnen wie js/beratung.js (D38)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('grundstueck'));
  await eintragen(page, { grundstueck_grundstueck: '1.000', grundstueck_gfz: '0,8', grundstueck_verkaufM2: '5.000', grundstueck_baukostenM2: '3.000', grundstueck_bodenrichtwert: '300' });
  const gs = await page.evaluate(() => ImmoBeratung.residualwert(gsEingabe(wzZustand('grundstueck'))).heute);
  await expect(page.locator('#wz_gs_ergebnis .subtotal')).toContainText(await page.evaluate(x => wzEur(x), gs));
  await page.evaluate(() => wzOeffnen('etw'));
  await eintragen(page, { etw_wohnflaeche: '78', etw_mea: '85', etw_heizBaujahr: '1990' });
  await page.locator('#wz_etw_heizArt').selectOption('oel');
  await expect(page.locator('#wz_etw_ergebnis')).toContainText('rechnerische Nutzungsdauer (VDI 2067');
  await expect(page.locator('#wz_etw_ergebnis')).toContainText('§ 43 GModG');
  await expect(page.locator('#wz_etw_ergebnis')).not.toContainText('GEG');
  await expect(page.locator('#wz_etw_ergebnis .wz-ampel').first()).toHaveClass(/wz-gelb/);
  await keineSkriptfehler(page);
});

test('Wertmonitor: gesicherte Bewertung zum Stichtag wie in der Bewertung, fortgeschrieben, Wiedervorlage (D38)', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  // Stichtag und Baupreisindex von 2023 — so ist die Fortschreibung bis heute deutlich
  await page.evaluate(() => { $('ek_stichtag').value = '2023-06-30'; $('bpi').value = '122,3'; $('pj_name').value = 'Wertmonitor Test'; compute(); });
  const damals = await page.evaluate(async () => { await projektSichern(); return window._R.empfehlung; });
  await page.evaluate(() => wzOeffnen('wertmonitor'));
  await expect(page.locator('#wz_body tbody tr')).toHaveCount(1);
  const x = await page.evaluate(() => wmRechne(pjLoad()[0], wzZustand('wertmonitor')));
  expect(x.alt).toBeCloseTo(damals, 6);                 // dieselbe Rechnung wie in der Bewertung
  expect(x.bpiNeu).toBeGreaterThan(x.bpiAlt);
  expect(x.kosten).toBeGreaterThan(0);                // Rechnung nach Baukosten und Alter (Information)
  expect(x.aenderung).not.toBeNull();
  // Preisindex (§ 9 Abs. 1, § 18 ImmoWertV): 2023 = 100, 2026 = 95 → Wert × 0,95
  await page.locator('input[data-wz="index.haus.2023"]').fill('100');
  await page.locator('input[data-wz="index.haus.2026"]').fill('95');
  const mitIndex = await page.evaluate(() => wmRechne(pjLoad()[0], wzZustand('wertmonitor')));
  expect(mitIndex.nachIndex).toBe(true); expect(mitIndex.index).toBeCloseTo(damals * 0.95, 6); expect(mitIndex.aenderung).toBeCloseTo(-5, 6);
  await expect(page.locator('#wz_body tbody')).toContainText('Index 2023 → 2026');
  await page.locator('#wz_wertmonitor_schwelle').fill('0,1');
  await page.locator('#wz_body tbody').getByRole('button', { name: 'Wiedervorlage' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Wiedervorlage angelegt');
  const wv = await page.evaluate(() => aufLoad().filter(a => /^Wertmonitor: Wertmonitor Test/.test(a.text)));
  expect(wv.length).toBe(1); expect(wv[0].text).toContain('Preisindex'); expect(wv[0].text).toContain('§ 7 UWG');
  await expect(page.locator('#wz_body tbody')).toContainText('Wiedervorlage am');
  await keineSkriptfehler(page);
});

test('Mein Jahr: Aufträge aus der Vermarktung, Provision, Herkunft (D38)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => { $('vm_status').value = 'Reserviert'; $('vm_preis').value = '400.000'; $('pj_name').value = 'Auftrag A'; compute(); await projektSichern(); });
  await page.clock.setFixedTime(new Date(JETZT.getTime() + 5000));   // eigene Projekt-ID (p + Zeitstempel)
  await page.evaluate(async () => { $('vm_status').value = 'Verkauft'; $('vm_preis').value = '500.000'; $('pj_name').value = 'Auftrag B'; $('ek_anschrift').value = 'Beispielweg 2, 74000 Musterstadt'; compute(); await projektSichern(); });
  await page.evaluate(() => wzOeffnen('jahr'));
  await expect(page.locator('#wz_body table').nth(1).locator('tbody tr')).toHaveCount(2);
  const zeileB = page.locator('#wz_body tr', { hasText: 'Auftrag B' });
  await zeileB.locator('input[inputmode="decimal"]').fill('480.000');
  await zeileB.locator('input[type="date"]').fill('2026-09-15');
  await zeileB.locator('select').selectOption('Empfehlung');
  await expect(page.locator('#wz_jahr_kpis')).toContainText(await page.evaluate(() => wzEur(480000 * 7.14 / 100)));
  await expect(page.locator('#wz_jahr_herkunft')).toContainText('Empfehlung');
  await keineSkriptfehler(page);
});

test('Gesamtsicherung enthält Übergabeprotokolle und Werkzeug-Eingaben und spielt sie wieder ein (D38)', async ({ page, browser }) => {
  dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => { await projektSichern(); wzOeffnen('uebergabe'); await ubLaden(); ubNeu(); UB.aktiv.anschrift = 'Musterweg 3'; await ubSpeichernJetzt();
    wzOeffnen('etw'); Object.assign(wzZustand('etw'), { wohnflaeche: '61' }); wzSpeichernJetzt(); wzSchliessen(); });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const text = await (await dl.createReadStream()).toArray().then(t => Buffer.concat(t).toString('utf8'));
  const d = JSON.parse(text);
  expect(d.protokolle.length).toBe(1); expect(d.werkzeuge.etw.wohnflaeche).toBe('61');
  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(t => pjSicherungAusText(t), text);
  await expect.poll(() => m2.join('|')).toContain('Übergabeprotokolle: 1');
  expect(await p2.evaluate(async () => (await iaAlle('protokolle'))[0].anschrift)).toBe('Musterweg 3');
  expect(await p2.evaluate(() => wzZustand('etw').wohnflaeche)).toBe('61');
  // fremde Datei darf keine Prototypen verändern
  await p2.evaluate(() => wzEinspielen(JSON.parse('{"__proto__":{"boese":1},"x":{"constructor":{"prototype":{"boese":1}}}}')));
  expect(await p2.evaluate(() => ({}).boese)).toBeUndefined();
  await ctx.close();
  await keineSkriptfehler(page);
});
