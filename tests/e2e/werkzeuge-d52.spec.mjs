/* D52 im Browser: Anfrage aus einer eingefügten Anfrage-Mail — Angaben ins Formular, Objekt über die Objektnummer, vorhandener Kunde
   statt zweiter Akte. Frei erfundener Mailtext, nur synthetische Daten; feste Testuhr 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

const MAIL = `Neue Anfrage über ImmobilienScout24
Objekt-Nr.: IA-TEST-77
Anrede: Frau
Vorname: Erika
Nachname: Mailbeispiel
E-Mail: erika.mail@example.org
Telefon: 07062 4711
Nachricht:
Ist das Haus noch frei?
Wir würden es gern ansehen.`;

async function objekt(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    const pid = pjLoad().find(p => p.name === 'Testhaus').id, a = wzAlle(); a.portal = { objekte: { [pid]: { nr: 'IA-TEST-77' } } }; wzSpeichern();
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Anfrage-Mail einfügen: Name, Kontakt, Objekt und Nachricht landen im Formular, erst „Anlegen“ speichert (D52)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const pid = await objekt(page);
  await page.evaluate(() => { wzOeffnen('interessenten'); vgNeuEntwurf('anfrage'); });
  await page.locator('#vg_mail').fill(MAIL);
  await page.getByRole('button', { name: 'Angaben übernehmen' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-gelb').first()).toContainText('Übernommen: Name, E-Mail, Telefon, Objektnummer, Nachricht, Portal · Objekt: Testhaus');
  await expect(page.locator('#wz_interessenten_quelle')).toHaveValue('ImmoScout24');
  await expect(page.locator('#vg_neu_objekt')).toHaveValue(pid);
  await expect(page.locator('#wz_interessenten_person_vorname')).toHaveValue('Erika');
  await expect(page.locator('#wz_interessenten_person_nachname')).toHaveValue('Mailbeispiel');
  await expect(page.locator('#wz_interessenten_person_email')).toHaveValue('erika.mail@example.org');
  await expect(page.locator('#wz_interessenten_notiz')).toHaveValue('Ist das Haus noch frei?\nWir würden es gern ansehen.');
  expect(await page.evaluate(() => (KD_CACHE || []).some(k => k.nachname === 'Mailbeispiel'))).toBe(false);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Erika Mailbeispiel');
  const v = await page.evaluate(() => wzdListe('vorgaenge').find(x => x.typ === 'anfrage'));
  expect([v.quelle, v.projektId === (await page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id))]).toEqual(['ImmoScout24', true]);
  // zweite Mail derselben Person: keine zweite Akte
  await page.evaluate(() => { vgZurueck && vgZurueck(); vgNeuEntwurf('anfrage'); });
  await page.locator('#vg_mail').fill('Name: Erika Mailbeispiel\nE-Mail: ERIKA.MAIL@example.org\nNachricht: Gibt es einen Grundriss?');
  await page.getByRole('button', { name: 'Angaben übernehmen' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-gelb').first()).toContainText('bereits in der Kundenakte: Erika Mailbeispiel');
  await page.locator('#vg_neu_objekt').selectOption(pid);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  expect(await page.evaluate(() => KD_CACHE.filter(k => k.nachname === 'Mailbeispiel').length)).toBe(1);
  await keineSkriptfehler(page);
});

test('Anfrage-Mail ohne erkennbare Angaben: rote Ampel, nichts übernommen (D52)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(() => { wzOeffnen('interessenten'); vgNeuEntwurf('anfrage'); });
  await page.locator('#vg_mail').fill('Hallo, schönes Haus!');
  await page.getByRole('button', { name: 'Angaben übernehmen' }).click();
  await expect(page.locator('#wz_body .wz-ampel.wz-rot')).toContainText('Im Text war nichts zu erkennen');
  await keineSkriptfehler(page);
});
