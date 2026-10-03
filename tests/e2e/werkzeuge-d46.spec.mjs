/* Kachel „Rundschreiben“ (D46) im Browser: Suchkunden zum Objekt, Einwilligung, Serienbrief mit einer Seite je Empfänger, E-Mail
   in Bcc nur mit Einwilligung, Notiz in der Kundenakte. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

test('Rundschreiben: Suchkunden zum Objekt, Serienbrief je Empfänger, Bcc nur mit Einwilligung, Notiz (D46)', async ({ page }) => {
  const meldungen = []; page.on('dialog', async d => { meldungen.push(d.message()); await d.accept(); });
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern();
    const sp = { aktiv: true, arten: PQ_KAT.map(x => x[0]), orte: '', budget: 900000, finanzierung: 'geprueft' };
    await kdSpeichern({ id: 'k_a', anrede: 'Frau', vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@example.org', strasse: 'Testweg 2', plzort: '74360 Ilsfeld',
      grundlage: 'einwilligung', einwilligungAm: '2026-09-01', kontakte: [], finanzierungen: [], erstellt: 1, suchprofil: sp });
    await kdSpeichern({ id: 'k_b', anrede: 'Herr', vorname: 'Max', nachname: 'Beispiel', email: 'max@example.org', strasse: 'Probeweg 3', plzort: '74001 Probedorf',
      grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2, suchprofil: sp });
    await kdSpeichern({ id: 'k_c', anrede: 'Frau', vorname: 'Ida', nachname: 'Ohneprofil', email: 'ida@example.org', grundlage: 'einwilligung', einwilligungAm: '2026-09-01',
      kontakte: [], finanzierungen: [], erstellt: 3 });
    await wzdLaden(true);
  });
  await page.evaluate(() => wzOeffnen('rundschreiben'));
  const tab = page.locator('.rs-tab');
  await expect(tab).toContainText('Erika Musterfrau');
  await expect(tab).toContainText('Max Beispiel');
  await expect(tab).not.toContainText('Ida Ohneprofil');            // kein Suchprofil
  await expect(tab.locator('tr', { hasText: 'Max Beispiel' })).toContainText('nur Brief');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Per E-Mail1');
  await page.locator('#rs_vorlage').selectOption('expose');
  await expect(page.locator('#rs_vorschau')).toContainText('Sehr geehrte Frau Musterfrau');
  // Serienbrief: zwei Seiten, je eigene Anrede
  await page.getByRole('button', { name: 'Serienbrief' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok).toContainText('Sehr geehrte Frau Musterfrau');
  await expect(dok).toContainText('Sehr geehrter Herr Beispiel');
  await expect(page.locator('#report .pagebreak')).toHaveCount(1);
  await expect(page.locator('#report .wzd-fuss')).toHaveCount(0);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // E-Mail: nur mit Einwilligung, neutrale Anrede, Abmeldehinweis
  const mail = await page.evaluate(() => { const S = rsS(); return { an: rsMailEmpfaenger(S).map(k => k.email), text: rsMailText(S).text }; });
  expect(mail.an).toEqual(['erika@example.org']);
  expect(mail.text.startsWith('Guten Tag,\n')).toBe(true);
  expect(mail.text).toContain('jederzeit widersprechen, zum Beispiel mit einer kurzen Antwort auf diese E-Mail');
  // alle mit Einwilligung: Ida kommt dazu, Max nicht
  await page.locator('#wz_rundschreiben_gruppe').selectOption('werbung');
  await expect(tab).toContainText('Ida Ohneprofil');
  await expect(tab).not.toContainText('Max Beispiel');
  // abwählen und vermerken
  await tab.locator('tr', { hasText: 'Ida Ohneprofil' }).locator('input[type="checkbox"]').uncheck();
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Empfänger1');
  await page.getByRole('button', { name: 'In der Kundenakte vermerken' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Notiz bei 1 Empfänger abgelegt.');
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_a').kontakte.some(c => c.art === 'Rundschreiben'))).toBe(true);
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_c').kontakte.length)).toBe(0);
  await keineSkriptfehler(page);
});
