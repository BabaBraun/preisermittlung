/* D51 im Browser: Werbung je Kanal (E-Mail, Telefon, Post), Werbewiderspruch, Datenschutzinformation in der Kundenakte; Interessenten,
   Rundschreiben und Auskunft nutzen dasselbe Modell. Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? 'Brief' : undefined); });
  return liste;
}
const akte = page => page.locator('#kd_inhalt');
const kanal = (page, name) => akte(page).locator('.kw-kanal', { has: page.locator('h4', { hasText: name }) });

test('Neue Kundin: Einwilligung je Kanal mit Nachweis, Datenschutzinformation fällig, Marke in der Liste (D51)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => { kdOeffnen(); await kdNeu(); });
  await akte(page).locator('input[aria-label="Vorname"]').fill('Erika'); await akte(page).locator('input[aria-label="Vorname"]').dispatchEvent('change');
  await akte(page).locator('input[aria-label="Nachname"]').fill('Kanalbeispiel'); await akte(page).locator('input[aria-label="Nachname"]').dispatchEvent('change');
  await expect(akte(page).locator('.kw-box .wz-ampel.wz-gelb').last()).toContainText('Datenschutzinformation bei der Erhebung geben (29.09.2026)');
  // E-Mail: Einwilligung → Erfassungsdatum automatisch, gelb bis Form und Fundstelle eingetragen sind
  await kanal(page, 'E-Mail').locator('select[aria-label="Stand"]').selectOption('einwilligung');
  await expect(kanal(page, 'E-Mail')).toContainText('In der App erfasst am 29.09.2026');
  await expect(kanal(page, 'E-Mail').locator('.wz-ampel.wz-gelb')).toContainText('Nachweis prüfen: erteilt am, Form, Fundstelle des Nachweises');
  await kanal(page, 'E-Mail').locator('input[aria-label="erteilt am"]').fill('2026-09-29');
  await kanal(page, 'E-Mail').locator('input[aria-label="erteilt am"]').dispatchEvent('change');
  await kanal(page, 'E-Mail').locator('select[aria-label="Form"]').selectOption('Vordruck der Bank');
  const nw = kanal(page, 'E-Mail').locator('input[aria-label="Nachweis im Banksystem Fundstelle"]');
  await nw.fill('Vordruck Werbung 2026, DMS'); await nw.dispatchEvent('change');
  await expect(kanal(page, 'E-Mail').locator('.wz-ampel.wz-gruen')).toContainText('Einwilligung vom 29.09.2026');
  await expect(kanal(page, 'Telefon')).toContainText('keine Einwilligung — keine Werbeanrufe (§ 7 Abs. 2 Nr. 1 UWG)');
  const ds = akte(page).locator('input[aria-label="Datenschutzinformation gegeben am"]');
  await ds.fill('2026-09-29'); await ds.dispatchEvent('change');
  await expect(akte(page).locator('.kw-box')).toContainText('Datenschutzinformation gegeben am 29.09.2026');
  const k = await page.evaluate(() => KD_CACHE.find(x => x.nachname === 'Kanalbeispiel').werbung);
  expect([k.email.stand, k.email.erfasstAm, k.telefon ? k.telefon.stand : 'keine', k.dsinfo.erteiltAm]).toEqual(['einwilligung', '2026-09-29', 'keine', '2026-09-29']);
  await page.locator('#kd_inhalt .kd-zurueck').click();
  await expect(page.locator('.kd-zeile', { hasText: 'Kanalbeispiel' }).locator('.kd-marken')).toContainText('Werbung: E-Mail');
  await keineSkriptfehler(page);
});

test('Werbewiderspruch sperrt alle Kanäle, legt die Bestätigung als Wiedervorlage an und gilt im Rundschreiben (D51)', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_w', anrede: 'Herr', vorname: 'Max', nachname: 'Widerspruchbeispiel', email: 'max@example.org', strasse: 'Testweg 1', plzort: '74360 Ilsfeld',
      grundlage: 'einwilligung', einwilligungAm: '2026-09-01', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_p', anrede: 'Frau', vorname: 'Ida', nachname: 'Postbeispiel', strasse: 'Testweg 2', plzort: '74360 Ilsfeld', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    kdOeffnen('k_w');
  });
  // frühere gemeinsame Einwilligung: gilt für E-Mail und Telefon, gelb
  await expect(akte(page).locator('.kw-box')).toContainText('Aus der früheren Angabe „Einwilligung“ übernommen');
  await expect(kanal(page, 'Telefon').locator('.wz-ampel.wz-gelb')).toContainText('Einwilligung vom 01.09.2026 — Nachweis prüfen: Form, Fundstelle des Nachweises (§ 7a UWG)');
  await akte(page).getByRole('button', { name: 'Widerspricht Werbung' }).click();
  await expect(akte(page).locator('.kw-widerspruch .wz-ampel.wz-rot')).toContainText('Werbesperre: Widerspruch am 29.09.2026 (Brief), Bestätigung an den Kunden offen (spätestens 29.10.2026)');
  for (const n of ['E-Mail', 'Telefon', 'Post']) await expect(kanal(page, n).locator('.wz-ampel.wz-rot')).toContainText('Werbewiderspruch vom 29.09.2026');
  const wv = await page.evaluate(() => aufLoad().find(a => a.kundeId === 'k_w'));
  expect([wv.frist, /Werbewiderspruch von Max Widerspruchbeispiel bestätigen/.test(wv.text)]).toEqual(['2026-10-29', true]);
  await akte(page).getByRole('button', { name: 'Bestätigung verschickt' }).click();
  await expect(akte(page).locator('.kw-widerspruch')).toContainText('bestätigt am 29.09.2026');
  // Auskunft enthält Werbung und Datenschutz
  const z = await page.evaluate(() => ImmoWerbung.auskunft(KD_CACHE.find(x => x.id === 'k_w')).join('\n'));
  expect(z).toContain('Werbewiderspruch: am 29.09.2026 (Brief), bestätigt am 29.09.2026');
  expect(z).toContain('Post: gesperrt');
  await page.evaluate(() => kdSchliessen());
  // Rundschreiben: „Alle mit Einwilligung“ ohne Max, Auswahl zeigt die Sperre, Brief nur an Ida
  await page.evaluate(() => { const S = wzAlle(); S.rundschreiben = { gruppe: 'werbung', projektId: '', vorlage: 'expose', auswahl: [], ohne: [], filter: '' }; wzSpeichern(); wzOeffnen('rundschreiben'); });
  await expect(page.locator('#wz_body')).toContainText('Noch kein Kunde mit Einwilligung zur Werbung.');
  await page.evaluate(() => { const S = rsS(); S.gruppe = 'auswahl'; S.auswahl = ['k_w', 'k_p']; wzSpeichern(); wzZeichnen(); });
  const max = page.locator('.rs-tab tr', { hasText: 'Widerspruchbeispiel' });
  await expect(max).toContainText('Werbesperre'); await expect(max).toContainText('Widerspruch');
  await expect(page.locator('.rs-tab tr', { hasText: 'Postbeispiel' })).toContainText('Brief');
  expect(await page.evaluate(() => rsMailEmpfaenger(rsS()).length)).toBe(0);
  await keineSkriptfehler(page);
});

test('Interessenten: zwei getrennte Häkchen je Kanal; werblicher Anruf zählt für § 7a UWG (D51)', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => { wzOeffnen('interessenten'); vgNeuEntwurf('anfrage'); });
  await page.locator('#wz_interessenten_person_vorname').fill('Ida');
  await page.locator('#wz_interessenten_person_nachname').fill('Telefonbeispiel');
  await page.locator('#wz_interessenten_person_telefon').fill('07062 2');
  await page.locator('#wz_interessenten_person_einwilligungTelefon').check();
  await expect(page.locator('#wz_interessenten_person_einwilligungForm')).toBeVisible();
  await page.locator('#wz_interessenten_person_einwilligungForm').selectOption('E-Mail des Kunden');
  await page.locator('#wz_interessenten_person_dsinfo').check();
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Ida Telefonbeispiel');
  const w = await page.evaluate(() => KD_CACHE.find(k => k.nachname === 'Telefonbeispiel').werbung);
  expect([w.telefon.stand, w.telefon.form, w.telefon.erfasstAm, w.email ? w.email.stand : 'keine', w.dsinfo.erteiltAm]).toEqual(['einwilligung', 'E-Mail des Kunden', '2026-09-29', 'keine', '2026-09-29']);
  // Gesprächsnotiz „werblicher Anruf“ → Verwendung, Aufbewahrung fünf Jahre ab dem Anruf
  const kid = await page.evaluate(() => KD_CACHE.find(k => k.nachname === 'Telefonbeispiel').id);
  await page.evaluate(id => { wzSchliessen(); kdOeffnen(id); }, kid);
  await page.locator('#kd_kon_art').selectOption('Telefonat');
  await page.locator('#kd_kon_text').fill('Neues Angebot in Ilsfeld vorgestellt');
  await page.locator('#kd_kon_werb').check();
  await page.getByRole('button', { name: 'Notiz speichern' }).click();
  await expect(kanal(page, 'Telefon')).toContainText('Werbliche Anrufe: 29.09.2026 · Nachweis aufbewahren bis 29.09.2031 (§ 7a Abs. 2 UWG)');
  // Löschen fragt nach dem Nachweis im Banksystem
  meldungen.length = 0;
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { meldungen.push(d.message()); await d.dismiss(); });
  await page.evaluate(id => kdLoeschen(id), kid);
  expect(meldungen[0]).toContain('bis 29.09.2031 aufzubewahren (§ 7a Abs. 2 UWG)');
  expect(await page.evaluate(id => !!KD_CACHE.find(k => k.id === id), kid)).toBe(true);
  await keineSkriptfehler(page);
});
