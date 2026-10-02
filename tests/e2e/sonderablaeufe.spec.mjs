/* Abläufe, die der Klicktest (tests/klick) nur anstößt, hier Schritt für Schritt bis zum Ergebnis (D31, D32):
   App-Sperre mit simuliertem Face ID (virtueller Authenticator von Chromium), Grundriss aus Plan-Code, Foto hinzufügen,
   Präsentation blättern, Übernahme-Knöpfe in Exposé, Sanierungsweg und Finanzierung, Vergleichssuche im Marktüberblick.
   Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { GRUNDRISS_TEST } from '../fixtures/medien.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const HAUS = SZENARIEN.find(s => s.name === 'haus_referenz');
const bereit = page => page.waitForFunction(() => typeof window.compute === 'function' && typeof APP_STATE !== 'undefined' && APP_STATE.ready);
const gesperrt = page => page.evaluate(() => getComputedStyle(document.getElementById('lock_overlay')).display !== 'none');

test('App-Sperre: mit Face ID/Touch ID einrichten, gesperrt ohne, entsperrt mit Bestätigung, wieder ausschalten', async ({ page }) => {
  // WebAuthn verlangt einen Namen statt einer IP-Adresse: darum localhost statt 127.0.0.1
  const url = 'http://localhost:' + (process.env.PORT || 8790) + '/index.html';
  const fehler = []; page.on('pageerror', e => fehler.push(e.message));
  const meldungen = []; page.on('dialog', d => { meldungen.push(d.message()); d.accept(); });
  await page.goto(url); await bereit(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal',
    hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await page.evaluate(() => lockSetupOeffnen());
  await page.locator('#lock_setup_ein').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ia_lock_enabled'))).toBe('1');
  expect(meldungen.join(' ')).toMatch(/App-Sperre eingerichtet/);
  // neu öffnen: entsperrt sich mit bestätigtem Face ID von selbst
  await page.goto(url); await bereit(page);
  await expect.poll(() => gesperrt(page)).toBe(false);
  // Face ID schlägt fehl: die App bleibt gesperrt
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });
  await page.goto(url); await bereit(page);
  await expect(page.locator('#lock_status')).toContainText('entsperren');
  expect(await gesperrt(page)).toBe(true);
  // erneut versuchen mit Face ID: „Entsperren“
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: true });
  await page.locator('#lock_btn').click();
  await expect.poll(() => gesperrt(page)).toBe(false);
  await page.evaluate(() => lockSetupOeffnen());
  await page.locator('#lock_setup_aus').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ia_lock_enabled'))).toBe(null);
  expect(fehler).toEqual([]);
});

test('Grundriss aus Plan-Code: vier Darstellungen, Raumliste, Darstellung wechseln, Raumname ändern', async ({ page }) => {
  await appOeffnen(page); await fallAnwenden(page, HAUS);
  await page.evaluate(() => { appOpenObject(); grEinfuegen(); });
  await page.locator('#gr_code').fill(JSON.stringify({ immoapp_grundriss: 1, grundrisse: [GRUNDRISS_TEST] }));
  await page.locator('#gr_overlay').getByRole('button', { name: 'Weiter' }).click();
  const karten = page.locator('#gr_overlay .gr-wahl-karte');
  await expect(karten).toHaveCount(4);
  await expect(page.locator('#gr_anlegen')).toBeDisabled();
  await karten.nth(2).click();
  await page.locator('#gr_anlegen').click();
  expect(await page.evaluate(() => [GRUNDRISSE.length, rlLesen().length > 0])).toEqual([1, true]);
  await page.locator('.gr-karte').first().click();
  const schalter = page.locator('#gr_overlay button[onclick^="grDarstSetzen"]');
  await expect(schalter).toHaveCount(4);
  for (let i = 0; i < 4; i++) { await schalter.nth(i).click(); expect(await page.evaluate(i => GRUNDRISSE[0].darst === GR_DARST[i][0], i)).toBe(true); }
  const raum = page.locator('#gr_overlay input[aria-label="Raumname"]').first();
  await raum.fill('Wohnzimmer Test'); await raum.dispatchEvent('change');
  expect(await page.evaluate(() => JSON.stringify(GRUNDRISSE[0].d).includes('Wohnzimmer Test'))).toBe(true);
  await keineSkriptfehler(page);
});

test('Foto hinzufügen über die Dateiauswahl: Bild in der Galerie', async ({ page }) => {
  await appOeffnen(page); await fallAnwenden(page, HAUS);
  await page.evaluate(() => { appOpenObject(); appAlleKlappen(true); });
  const wahl = page.waitForEvent('filechooser');
  await page.locator('#s-fotos').getByText('Objektfotos hier klicken').click();
  await (await wahl).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
  await expect.poll(() => page.evaluate(() => PHOTOS.length)).toBe(1);
  await expect(page.locator('#s-fotos img').first()).toBeVisible();
  await keineSkriptfehler(page);
});

test('Exposé-Fotos: Haken ab und wieder an — auch über dem blassen Bild eines nicht gewählten Fotos', async ({ page }) => {
  await appOeffnen(page); await fallAnwenden(page, HAUS);
  await page.evaluate(() => { appOpenObject(); appAlleKlappen(true); });
  await page.setInputFiles('#file_objekt', [{ name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.png', mimeType: 'image/png', buffer: PNG }]);
  await expect(page.locator('#ex_fotowahl input[type=checkbox]')).toHaveCount(2);
  const haken = page.locator('#ex_fotowahl input[type=checkbox]').nth(1);
  // echter Mausklick: scheitert, wenn das Bild (opacity < 1) über dem Haken liegt
  await haken.click({ timeout: 3000 }); await expect(haken).not.toBeChecked();
  await haken.click({ timeout: 3000 }); await expect(haken).toBeChecked();
  await expect(page.locator('#ex_fotowahl .ex-foto.on')).toHaveCount(2);
  await keineSkriptfehler(page);
});

test('Präsentation: vor und zurück blättern, auch mit der Pfeiltaste', async ({ page }) => {
  await appOeffnen(page); await fallAnwenden(page, HAUS);
  await page.evaluate(() => vpStarten());
  await expect(page.locator('#vp_overlay')).toHaveClass(/on/);
  const folie = () => page.evaluate(() => VP_INDEX);
  await page.getByRole('button', { name: 'Nächste Folie' }).click(); expect(await folie()).toBe(1);
  await page.getByRole('button', { name: 'Nächste Folie' }).click(); expect(await folie()).toBe(2);
  await page.getByRole('button', { name: 'Vorige Folie' }).click(); expect(await folie()).toBe(1);
  await page.keyboard.press('ArrowRight'); expect(await folie()).toBe(2);
  await keineSkriptfehler(page);
});

test('Übernahme-Knöpfe: Ausstattung ins Exposé, Kennwert in den Sanierungsweg, Preis in die Finanzierung', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page); await fallAnwenden(page, HAUS);
  await page.evaluate(() => { appOpenObject(); appAlleKlappen(true); $('ex_text_ausstattung').value = ''; $('au_zimmer').value = '5'; });
  await page.getByRole('button', { name: 'Ausstattung aus dem Aufnahmebogen' }).click();
  await expect(page.locator('#ex_text_ausstattung')).toHaveValue(/5 Zimmer/);
  await page.locator('#san_aktiv').check();   // ausgeschaltete Abschnitte zeigen nur die Kopfzeile (D35)
  await page.evaluate(() => { $('san_e0').value = ''; $('en_kennwert').value = '210'; });
  await page.getByRole('button', { name: 'Aus Aufnahmebogen und Energetischer Qualität übernehmen' }).click();
  await expect(page.locator('#san_e0')).toHaveValue('210');
  await page.evaluate(() => finOeffnen());
  await page.evaluate(() => { $('fin_kaufpreis').value = ''; });
  await page.locator('#fin_overlay').getByRole('button', { name: 'Aus Bewertung' }).click();
  await expect(page.locator('#fin_kaufpreis')).toHaveValue('472.970');
  await keineSkriptfehler(page);
});

test('Marktüberblick: Vergleichsobjekte suchen findet passende Objekte', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(async () => { for (let i = 1; i <= 6; i++) await mdbPut({ id: 'o_v' + i, gemeinde: 'Musterstadt', art: 'EFH', basis: 'KP', kp: 300000 + i * 15000, wfl: 130, baujahr: 1985, datum: '2026-0' + i + '-01' }); });
  await page.evaluate(async () => { await mdbOeffnen(); mdbTab('vgl'); });
  await page.evaluate(() => { $('mdbz_gemeinde').value = 'Musterstadt'; $('mdbz_wohnflaeche').value = '130'; $('mdbz_baujahr').value = '1985';
    const s = $('mdbz_art'); const o = [...s.options].find(x => /EFH|Einfamilien/.test(x.value + x.text)); if (o) s.value = o.value; });
  await page.locator('#mdb_overlay').getByRole('button', { name: 'Vergleichsobjekte suchen' }).click();
  await expect(page.locator('#mdb_overlay')).toContainText(/6 Objekte|6 Vergleichsobjekte/);
  await keineSkriptfehler(page);
});
