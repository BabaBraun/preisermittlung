/* „Mein Jahr“ (D47): eingegangene Provision aus den Abrechnungen neben der Prognose. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

test('Mein Jahr zeigt die eingegangene Provision aus den Abrechnungen (D47)', async ({ page }) => {
  await appOeffnen(page);
  await page.evaluate(async () => {
    await wzdLaden();
    const a = Object.assign(paLeer(), { id: 'pa_j', objekt: 'Musterhaus', kaufpreis: '400.000', vertragDatum: '2026-09-15' });
    Object.assign(a.parteien[0], { bezahltAm: '2026-09-20', bezahltBetrag: '14.280,00' });
    Object.assign(a.parteien[1], { maklervertrag: true, bezahltAm: '2026-09-25' });   // ohne erfassten Betrag: Rechnungsbetrag
    await wzdSpeichern('abrechnungen', a);
    const alt = Object.assign(paLeer(), { id: 'pa_alt', objekt: 'Altbau', kaufpreis: '300.000', vertragDatum: '2025-05-01' });
    Object.assign(alt.parteien[0], { bezahltAm: '2025-05-20' });
    await wzdSpeichern('abrechnungen', alt);
  });
  await page.evaluate(() => wzOeffnen('jahr'));
  await expect(page.locator('#wz_jahr_kpis')).toContainText('Eingegangen 2026');
  await expect(page.locator('#wz_jahr_kpis')).toContainText(await page.evaluate(() => wzEur(28560)));
  await keineSkriptfehler(page);
});
