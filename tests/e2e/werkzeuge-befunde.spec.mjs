/* Befunde der Prüfung D48–D53 im Browser: Löschen eines Kunden bei offenem Notarauftrag, Eingaben in „Werbung und Datenschutz“
   ohne Neuaufbau der Akte, Anfrage-Mail ohne Reste der vorigen, Rundschreiben-Notiz nur bei echten Empfängern. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

test('Kunde löschen, während ein Notarauftrag mit ihm offen war: Der Editor schreibt die Namen nicht zurück', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_k', anrede: 'Herr', vorname: 'Max', nachname: 'Kaufbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_t', anschrift: 'Musterweg 7, 74360 Ilsfeld',
      kaeufer: [Object.assign(noPerson(), { kundeId: 'k_k', name: 'Max Kaufbeispiel', telefon: '0711 1' })] }));
    wzOeffnen('notar'); await noLaden(); noOeffnenAuftrag('no_t'); wzSchliessen();   // NO.aktiv bleibt gesetzt
    for (const h of KD_LOESCH_HOOKS) await h('k_k');
    wzOeffnen('notar');
  });
  await expect(page.locator('#wz_body input[data-wz="kaeufer.0.name"]')).toHaveValue('(Kunde gelöscht)');
  await page.evaluate(async () => { await noSpeichernJetzt(); wzSchliessen(); });
  const n = await page.evaluate(async () => (await iaGet('notar', 'no_t')).kaeufer[0]);
  expect([n.name, n.telefon, n.kundeId]).toEqual(['(Kunde gelöscht)', '', '']);
  await keineSkriptfehler(page);
});

test('Werbung und Datenschutz: Feld ändern baut nur den Kasten neu — Notiz-Entwurf und Fokus bleiben', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async () => { await kdSpeichern({ id: 'k_w', anrede: 'Frau', vorname: 'Ida', nachname: 'Fokusbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1,
    werbung: { verbraucher: true, email: { stand: 'einwilligung', erteiltAm: '2026-09-01', erfasstAm: '2026-09-01', form: '', nachweis: '' } } }); kdOeffnen('k_w'); });
  await page.locator('#kd_kon_text').fill('Entwurf einer Notiz');
  const kanal = page.locator('#kd_inhalt .kw-kanal', { has: page.locator('h4', { hasText: 'E-Mail' }) });
  const nw = kanal.locator('input[aria-label="Nachweis im Banksystem Fundstelle"]');
  await nw.fill('DMS 4711'); await nw.press('Tab');
  await expect(kanal.locator('.wz-ampel')).toContainText('Nachweis prüfen: Form');
  await expect(page.locator('#kd_kon_text')).toHaveValue('Entwurf einer Notiz');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))).toBe('Zweck');
  // „keine“ löscht keinen Nachweis
  await kanal.locator('select[aria-label="Stand"]').selectOption('keine');
  await expect(kanal.locator('select[aria-label="Stand"]')).toHaveValue('einwilligung');
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_w').werbung.email.erteiltAm)).toBe('2026-09-01');
  // Datum Ziffer für Ziffer tippen: Feld bleibt beim Tippen stehen (Chromium meldet jeden Zwischenstand), Kasten erst beim Verlassen neu
  const erteilt = kanal.locator('input[aria-label="erteilt am"]');
  await erteilt.click(); await page.keyboard.press('Home');
  await page.keyboard.type('28092026', { delay: 30 });
  expect(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))).toBe('erteilt am');
  await expect(erteilt).toHaveValue('2026-09-28');
  await erteilt.blur();   // Feld verlassen (Tab springt im Datumsfeld erst zwischen Tag, Monat und Jahr)
  await expect(kanal.locator('.wz-ampel')).toContainText('Einwilligung vom 28.09.2026');
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_w').werbung.email.erteiltAm)).toBe('2026-09-28');
  await keineSkriptfehler(page);
});

test('Anfrage-Mail: zweites Einfügen lässt keine Reste der ersten Mail, Anschrift steht sichtbar im Formular', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => { wzOeffnen('interessenten'); vgNeuEntwurf('anfrage'); });
  await page.locator('#vg_mail').fill('Name: Erika Erstmail\nE-Mail: erika@example.org\nStraße: Testweg 1\nPLZ/Ort: 74360 Ilsfeld');
  await page.getByRole('button', { name: 'Angaben übernehmen' }).click();
  await expect(page.locator('#wz_interessenten_person_strasse')).toHaveValue('Testweg 1');
  await page.locator('#vg_mail').fill('Name: Max Zweitmail\nTelefon: 07062 5');
  await page.getByRole('button', { name: 'Angaben übernehmen' }).click();
  await expect(page.locator('#wz_interessenten_person_nachname')).toHaveValue('Zweitmail');
  for (const f of ['email', 'strasse', 'plzort']) await expect(page.locator('#wz_interessenten_person_' + f)).toHaveValue('');
  await keineSkriptfehler(page);
});

test('Rundschreiben: Notiz nur bei Empfängern, die etwas bekommen; Werbesperre bleibt draußen', async ({ page }) => {
  const meldungen = [];
  page.on('dialog', async d => { meldungen.push(d.message()); await d.accept(); });
  await appOeffnen(page);
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_a', anrede: 'Frau', vorname: 'Ida', nachname: 'Briefbeispiel', strasse: 'Testweg 2', plzort: '74360 Ilsfeld', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_s', anrede: 'Herr', vorname: 'Max', nachname: 'Sperrbeispiel', strasse: 'Testweg 3', plzort: '74360 Ilsfeld', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2,
      werbung: { widerspruch: { am: '2026-09-01', weg: 'Brief' } } });
    const S = wzAlle(); S.rundschreiben = { gruppe: 'auswahl', projektId: '', vorlage: 'expose', auswahl: ['k_a', 'k_s'], ohne: [], filter: '' }; wzSpeichern(); wzOeffnen('rundschreiben');
    await rsVermerken();
  });
  expect(meldungen.some(m => /Bei 1 Empfänger eine Notiz/.test(m))).toBe(true);
  const n = await page.evaluate(() => [KD_CACHE.find(k => k.id === 'k_a').kontakte.length, KD_CACHE.find(k => k.id === 'k_s').kontakte.length]);
  expect(n).toEqual([1, 0]);
  await keineSkriptfehler(page);
});
