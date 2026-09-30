/* Ungültige oder fehlende Eingaben dürfen nicht unbemerkt als plausible Bewertung erscheinen. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

const HAUS = SZENARIEN.find(s => s.name === 'haus_referenz');

test('Text statt Zahl: Feld markiert, keine Empfehlung, Bericht als Entwurf', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, HAUS);
  await expect(page.locator('#r_empfehlung')).toHaveText('472.970 €');
  await expect(page.locator('#cp_status')).toBeHidden();

  await page.locator('#ek_brw').fill('abc');
  await expect(page.locator('#r_empfehlung')).toHaveText('–');
  await expect(page.locator('#cp_status')).toContainText('ungültige Eingabe');
  await expect(page.locator('#app_validation')).toBeVisible();
  await expect(page.locator('#app_validation')).toContainText('„abc“ ist keine gültige Zahl');
  await expect(page.locator('#ek_brw')).toHaveClass(/pruef-fehler/);
  await expect(page.locator('#cp_pruef')).toContainText('„abc“ ist keine gültige Zahl');

  await page.evaluate(() => druckbericht());
  await expect(page.locator('#report .entwurf')).toContainText('Entwurf — keine belastbare Preisempfehlung');
  await expect(page.locator('#report .entwurf')).toContainText('abc');
  await expect(page.locator('#report .cover .val')).toHaveText('Entwurf');
  await page.evaluate(() => document.body.classList.remove('report-mode'));

  await page.locator('#ek_brw').fill('380');
  await expect(page.locator('#r_empfehlung')).toHaveText('472.970 €');
  await expect(page.locator('#ek_brw')).not.toHaveClass(/pruef-fehler/);
  await keineSkriptfehler(page);
});

test('Negative Werte und Prozent über 100 werden gemeldet', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, HAUS);
  await page.locator('#ek_gs_abschlag').fill('120');
  await page.locator('#ek_wohnflaeche').fill('-145');
  await expect(page.locator('#r_empfehlung')).toHaveText('–');
  await expect(page.locator('#cp_pruef')).toContainText('über 100 %');
  await expect(page.locator('#cp_pruef')).toContainText('darf nicht negativ sein');
  await keineSkriptfehler(page);
});

test('Leeres Formular: keine Empfehlung, fehlende Angaben werden genannt', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, { felder: {} });
  await expect(page.locator('#r_empfehlung')).toHaveText('–');
  await expect(page.locator('#cp_status')).toContainText('Bodenwert fehlt');
  await expect(page.locator('#mb_empf')).toHaveText('–');
  await keineSkriptfehler(page);
});
