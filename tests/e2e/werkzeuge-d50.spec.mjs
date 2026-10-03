/* D50 im Browser: Energieausweis nach dem GModG — Pflichtangaben je nach Ausstellungsdatum (ab 01.01.2027 Primärenergie und Datum),
   Vorlage bei der Besichtigung, Übergabe an den Käufer nach der Beurkundung, Verkaufsfahrplan. Nur synthetische Daten; die feste
   Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  page.on('dialog', async d => { await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
}

async function objektMitAusweis(page, ea) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async ea => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('vm_start').value = '2026-08-01'; $('ex_preis').value = '480.000';
    $('ex_ea_art').value = ea; $('ex_ea_wert').value = '118,4'; $('ex_ea_traeger').value = 'Erdgas'; $('ex_ea_klasse').value = 'D'; $('ex_ea_baujahr').value = '1972';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    await kdSpeichern({ id: 'k_a', anrede: '', vorname: 'Erika', nachname: 'Besichtigungsbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
  }, ea);
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}
const portalSetzen = (page, pid, e) => page.evaluate(([pid, e]) => { const a = wzAlle(); a.portal = a.portal || {}; a.portal.objekte = a.portal.objekte || {};
  a.portal.objekte[pid] = Object.assign({}, a.portal.objekte[pid] || {}, e); wzSpeichern(); }, [pid, e]);

test('Aushang und Social Media: Ausweis vom 10.01.2027 verlangt Primärenergie und Datum, alter Ausweis die bisherigen Angaben (D50)', async ({ page }) => {
  dialoge(page);
  const pid = await objektMitAusweis(page, 'Verbrauchsausweis');
  await portalSetzen(page, pid, { ausgestellt: '2019-03-01' });
  expect(await page.evaluate(pid => ahPruefen(pid), pid)).toEqual([]);
  expect(await page.evaluate(pid => ahEnergie(wzdEnergie(pid)), pid)).toBe('Verbrauchsausweis · Endenergieverbrauch 118,4 kWh/(m²·a) · Energieträger Erdgas · Baujahr 1972 · Klasse D');
  // neuer Ausweis (Ausstellungsdatum ab 01.01.2027): Primärenergie fehlt
  await portalSetzen(page, pid, { ausgestellt: '2027-01-10' });
  expect(await page.evaluate(pid => ahPruefen(pid), pid)).toEqual(['Primärenergie laut Energieausweis']);
  await page.evaluate(pid => { const S = wzAlle(); S.aushang = Object.assign(S.aushang || {}, { layout: 'einzeln', objekt: pid }); wzSpeichern(); wzOeffnen('aushang'); }, pid);
  await expect(page.locator('#wz_body .wz-ampel.wz-rot')).toContainText('Primärenergie laut Energieausweis');
  await page.evaluate(() => wzSchliessen());
  // Primärenergie im Portal-Export erfassen
  await page.evaluate(() => wzOeffnen('portal'));
  const feld = page.locator('#wz_body input[data-wz$=".primaer"]').first();
  await expect(feld).toBeVisible();
  await expect(page.locator('#wz_body .pt-ampel').first()).toContainText('Primärenergie laut Energieausweis');
  await feld.fill('96,5'); await feld.dispatchEvent('change');
  await expect(page.locator('#wz_body .pt-ampel').first()).not.toContainText('Primärenergie laut Energieausweis');   // nur die Ampel neu, Feld bleibt
  await expect(feld).toHaveValue('96,5');
  await page.evaluate(() => wzSchliessen());
  expect(await page.evaluate(pid => ahPruefen(pid), pid)).toEqual([]);
  expect(await page.evaluate(pid => ahEnergie(wzdEnergie(pid)), pid))
    .toBe('Energieausweis nach § 82 GModG (Verbrauch) · ausgestellt am 10.01.2027 · Primärenergie 96,5 kWh/(m²·a) · Klasse D · Baujahr 1972 · Energieträger Erdgas');
  // abgelaufener Ausweis: rot im Aushang
  await portalSetzen(page, pid, { ausgestellt: '2016-07-01', primaer: '' });
  await page.evaluate(() => wzOeffnen('aushang'));
  await expect(page.locator('#wz_body .wz-ampel.wz-rot')).toContainText('Energieausweis abgelaufen (gültig bis 30.06.2026)');
  await keineSkriptfehler(page);
});

test('Besichtigung hält die Vorlage des Energieausweises fest — vergangener Termin ohne Eintrag ist rot (D50)', async ({ page }) => {
  dialoge(page);
  const pid = await objektMitAusweis(page, 'Bedarfsausweis');
  await portalSetzen(page, pid, { ausgestellt: '2019-03-01' });
  await page.evaluate(async pid => {
    await wzdSpeichern('termine', { id: 't_1', art: 'Besichtigung', titel: '', datum: '2026-09-10', von: '10:00', projektId: pid, kundeIds: ['k_a'], notiz: '', erinnerung: '0' });
    wzOeffnen('kalender'); await kaTerminOeffnen('t_1');
  }, pid);
  const box = page.locator('#wz_body .mdb-box', { has: page.locator('h3', { hasText: 'Energieausweis' }) });
  await expect(box).toContainText('Bedarfsausweis · Endenergiebedarf 118,4 kWh/(m²·a)');
  await expect(box.locator('.wz-ampel.wz-rot')).toContainText('Termin vorbei');
  await box.locator('select[data-wz="eaVorlage"]').selectOption('aushang');
  await expect(box.locator('.wz-ampel.wz-gruen')).toContainText('deutlich sichtbar ausgehängt oder ausgelegt');
  await page.getByRole('button', { name: 'Nachweis als Dokument' }).click();
  await expect(page.locator('#report .wzd')).toContainText('Energieausweis: deutlich sichtbar ausgehängt oder ausgelegt.');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect.poll(() => page.evaluate(async () => (await iaGet('termine', 't_1')).eaVorlage)).toBe('aushang');
  // künftiger Termin: gelb mit Hinweis auf den Aushang
  await page.evaluate(async pid => { await wzdSpeichern('termine', { id: 't_2', art: 'Besichtigung', titel: '', datum: '2026-10-05', von: '11:00', projektId: pid, kundeIds: [], notiz: '', erinnerung: '0' });
    await kaTerminOeffnen('t_2'); }, pid);
  await expect(page.locator('#wz_body .wz-ampel.wz-gelb').first()).toContainText('Spätestens bei der Besichtigung vorlegen');
  await keineSkriptfehler(page);
});

test('Notarauftrag: nach der Beurkundung erhält der Käufer den Energieausweis — ohne Datum rot (D50)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => { wzOeffnen('notar'); await noLaden(); await noNeu(false); });
  await expect(page.locator('#no_ea')).toContainText('Direkt nach der Beurkundung');
  await page.locator('#wz_body select[data-wz="stand"]').selectOption('Beurkundet');
  await expect(page.locator('#no_ea .wz-ampel.wz-rot')).toContainText('unverzüglich an den Käufer übergeben');
  const feld = page.locator('#wz_body input[data-wz="eaUebergeben"]');
  await feld.fill('2026-09-28'); await feld.dispatchEvent('change');
  await expect(page.locator('#no_ea .wz-ampel.wz-gruen')).toContainText('Übergeben am 28.9.2026');
  await keineSkriptfehler(page);
});

test('Verkaufsfahrplan: „liegt nicht vor“ ist kein erledigter Energieausweis mehr, ein vollständiger gültiger Ausweis schon (D50)', async ({ page }) => {
  dialoge(page);
  const pid = await objektMitAusweis(page, 'liegt nicht vor');
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).energie, pid)).toBe(false);
  await page.evaluate(async () => { $('ex_ea_art').value = 'Verbrauchsausweis'; compute(); await projektSichern(); await wzdLaden(true); });
  await portalSetzen(page, pid, { ausgestellt: '2019-03-01' });
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).energie, pid)).toBe(true);
  await portalSetzen(page, pid, { ausgestellt: '2016-07-01' });   // abgelaufen
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).energie, pid)).toBe(false);
  await keineSkriptfehler(page);
});
