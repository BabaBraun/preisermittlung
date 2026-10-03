/* Verknüpfungen D45 im Browser: Zahlungsziel der Provision im Kalender, Provision und Unterlagen in den Aktivitäten, Suche nach
   der Rechnungsnummer, Datenstand meldet alte Abrechnungen, Unterlagen-Eintrag löschen. Nur synthetische Daten (Testuhr 29.09.2026). */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

test('Provision im Kalender, in den Aktivitäten und in der Suche; Datenstand meldet alte Abrechnungen; Unterlagen löschen (D45)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async () => {
    await wzdLaden();
    const a = Object.assign(paLeer(), { id: 'pa_1', objekt: 'Musterhaus', anschrift: 'Musterweg 1, 74360 Ilsfeld', kaufpreis: '400.000', vertragDatum: '2026-09-15' });
    Object.assign(a.parteien[0], { name: 'Erika Verkaufbeispiel', rechnungNr: 'PR-2026-007', rechnungDatum: '2026-09-20', bezahltAm: '2026-09-25', bezahltBetrag: '14.280,00' });
    Object.assign(a.parteien[1], { name: 'Max Kaufbeispiel', maklervertrag: true, rechnungNr: 'PR-2026-008', rechnungDatum: '2026-09-22' });
    await wzdSpeichern('abrechnungen', a);
    const alt = Object.assign(paLeer(), { id: 'pa_alt', objekt: 'Altbau', kaufpreis: '300.000', vertragDatum: '2025-03-01' });
    Object.assign(alt.parteien[0], { rechnungNr: 'PR-2025-001', rechnungDatum: '2025-03-05', bezahltAm: '2025-03-20' });
    alt.parteien[1].satz = '0';
    await wzdSpeichern('abrechnungen', alt);
    await wzdSpeichern('unterlagen', { id: 'ul_1', projektId: 'p_x', objekt: 'Musterhaus', art: 'h', kundeId: '',
      posten: { grundbuch: { stand: 'angefordert', datum: '2026-09-28' }, flurkarte: { stand: 'da', datum: '2026-09-29' } }, vollmacht: { text: '', name: '', unterschrift: '', zeit: '' } });
  });
  // Kalender: Zahlungsziel des Käufers (Rechnung 22.09. + 14 Tage = 06.10.2026)
  await page.evaluate(async () => { wzOeffnen('kalender'); await kaLaden(); KA.aktiv = null; kaSetz('ansicht', 'liste'); });
  const eintrag = page.locator('.ka-eintrag', { hasText: 'Provision fällig: Musterhaus (Käufer)' });
  await expect(eintrag).toContainText('Rechnung PR-2026-008');
  await expect(page.locator('.ka-eintrag', { hasText: 'Provision fällig: Musterhaus (Verkäufer)' })).toHaveCount(0);   // bezahlt
  // Aktivitäten im Monat September 2026
  await page.evaluate(async () => { wzOeffnen('aktivitaeten'); await akLaden(); akS().zeitraum = 'monat'; wzZeichnen(); });
  for (const [t, n] of [['Provisionsrechnungen gestellt', '2'], ['Provision eingegangen', '1'], ['Unterlagen angefordert', '1'], ['Unterlagen eingegangen', '1']])
    await expect(page.locator('#wz_body tr', { hasText: t }).locator('td').nth(1)).toContainText(n);
  // Suche nach der Rechnungsnummer
  await page.evaluate(() => { wzSchliessen(); sucheOeffnen(); });
  await page.locator('#suche_q').fill('PR-2026-008');
  await expect(page.locator('#suche_liste')).toContainText('Provision: Musterhaus');
  await expect(page.locator('#suche_liste')).toContainText('Abrechnungen');
  await page.locator('#suche_liste .suche-row').first().click();
  await expect(page.locator('#wz_titel')).toHaveText('Provision');
  await expect(page.locator('#pa_pruefung')).toBeVisible();
  // Datenstand: eine Abrechnung seit über 12 Monaten bezahlt
  const ds = await page.evaluate(async () => ImmoBeratung.datenstand(await dsEingaben(), aufHeute()).liste.find(x => x.id === 'abrechnungen'));
  expect(ds && ds.stand).toMatch(/^1 seit über 12 Monaten bezahlt/);
  // Unterlagen-Eintrag löschen
  await page.evaluate(async () => { wzOeffnen('unterlagen'); await wzdLaden(); UL.aktiv = wzdListe('unterlagen').find(x => x.id === 'ul_1'); wzZeichnen(); });
  await page.locator('.ub-kopfzeile').getByRole('button', { name: 'Löschen' }).click();
  await expect.poll(() => page.evaluate(async () => (await iaAlle('unterlagen')).length)).toBe(0);
  await keineSkriptfehler(page);
});
