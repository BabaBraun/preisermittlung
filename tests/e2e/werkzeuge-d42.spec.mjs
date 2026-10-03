/* Neue Kacheln D42 im Browser: Kaufnebenkosten (Notar und Grundbuch nach GNotKG, Erlös des Verkäufers) und Provision
   (Abrechnung, Prüfung nach §§ 656c/656d BGB, Rechnung mit Pflichtangaben, Zahlungseingang, Verkaufsfahrplan, Kundenakte,
   Gesamtsicherung). Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());
async function verkauftesObjekt(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'Notartermin'; $('ex_preis').value = '480.000'; $('ex_provision').value = '3,57 % inkl. MwSt.';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern();
    await kdSpeichern({ id: 'k_kauf', anrede: 'Herr', vorname: 'Max', nachname: 'Kaufbeispiel', strasse: 'Probeweg 3', plzort: '74001 Probedorf', grundlage: 'vertrag',
      kontakte: [], finanzierungen: [], erstellt: 1 });
    await wzdLaden(true);
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Kaufnebenkosten: Notar und Grundbuch nach GNotKG, Grunderwerbsteuer, Dokument; Erlös des Verkäufers (D42)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('nebenkosten'));
  await page.locator('#wz_nebenkosten_preis').fill('400.000');
  await page.locator('#wz_nebenkosten_grundschuld').fill('320.000');
  // Handrechnung: Notar Kaufvertrag 2.967,27, Grundschuld 952, Grundbuch 1.837,50, Steuer 20.000, Provision 14.280
  await expect(page.locator('#wz_nk_ergebnis .wz-kpis')).toContainText('40.037 €');
  await expect(page.locator('#wz_nk_ergebnis .wz-kpis')).toContainText('5.757 €');
  const tab = page.locator('#wz_nk_ergebnis .nk-tab');
  await expect(tab.locator('tr', { hasText: 'Beurkundung des Kaufvertrags' })).toContainText('1.570,00 €');
  await expect(tab.locator('tr', { hasText: 'Eintragung des Käufers als Eigentümer' })).toContainText('Nr. 14110');
  await expect(tab.locator('tr', { hasText: 'Beurkundung des Kaufvertrags' })).toContainText('2,0');
  // bewegliche Gegenstände mindern nur die Grunderwerbsteuer
  await page.locator('#wz_nebenkosten_inventar').fill('10.000');
  await expect(page.locator('#wz_nk_ergebnis .wz-kpis')).toContainText('19.500 €');
  await expect(page.locator('#wz_nk_ergebnis .wz-kpis')).toContainText('39.537 €');
  // nur Bescheinigungen: Vollzug höchstens 50 € je Tätigkeit
  await page.locator('summary', { hasText: 'Notar im Einzelnen' }).click();
  await page.locator('#wz_nebenkosten_vollzug').selectOption('begrenzt');
  await expect(tab.locator('tr', { hasText: 'Vollzug' })).toContainText('50,00 €');
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Kaufnebenkosten');
  await expect(page.locator('#report .wzd')).toContainText('Nr. 22110, 22112');
  await expect(page.locator('#report .wzd')).toContainText('§ 125 GNotKG');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Verkäufer
  await page.getByRole('button', { name: 'Verkäufer: Was bleibt?' }).click();
  await page.locator('#wz_nebenkosten_restschuld').fill('100.000');
  await page.locator('#wz_nebenkosten_gsNenn').fill('150.000');
  const soll = await page.evaluate(() => ImmoBeratung.verkaeuferErloes(nkVerkaeuferEingabe(wzZustand('nebenkosten'))));
  expect(soll.loeschung).toBe(177);                       // 0,5 × 354 (Nr. 14140)
  expect(soll.treuhand).toBe(162.44);                     // 0,5 × 273 = 136,50 zzgl. 19 % USt
  await expect(page.locator('#wz_nk_ergebnis .wz-kpis')).toContainText(await page.evaluate(x => wzEur(x), soll.erloes));
  await expect(page.locator('#wz_nk_ergebnis')).toContainText('Treuhandauflage der Bank');
  await keineSkriptfehler(page);
});

test('Provision: Abrechnung aus dem Objekt, § 656d BGB, Rechnungsnummern, Zahlung, Rechnung mit Pflichtangaben, Fahrplan (D42)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await verkauftesObjekt(page);
  await page.evaluate(() => wzOeffnen('provision'));
  for (const [id, v] of [['aussteller', 'Musterbank eG'], ['anschrift', 'Hauptstraße 1, 74360 Ilsfeld'], ['steuernr', '65000/00000'], ['iban', 'DE00 0000 0000 0000 0000 00']])
    await page.locator('#wz_provision_einst_' + id).fill(v);
  await page.getByRole('button', { name: 'Neue Abrechnung' }).click();
  await page.locator('#pa_objekt').selectOption(pid);
  await expect(page.locator('#wz_provision_kaufpreis')).toHaveValue('480.000');
  await expect(page.locator('#wz_provision_parteien_1_satz')).toHaveValue('3,57');
  await page.locator('#wz_provision_vertragDatum').fill('2026-09-15');
  await page.locator('#wz_provision_parteien_0_name').fill('Erika Verkaufbeispiel');
  await page.locator('#wz_provision_parteien_0_anschrift').fill('Testweg 2, 74360 Ilsfeld');
  await page.locator('#wz_provision_parteien_1_name').fill('Max Kaufbeispiel');
  await page.locator('#wz_provision_parteien_1_anschrift').fill('Probeweg 3, 74001 Probedorf');
  await expect(page.locator('#pa_betrag_0')).toContainText('17.136,00 €');   // 480.000 × 3 % = 14.400 netto + 2.736 USt
  // nur der Verkäufer hat beauftragt: Käufer zahlt höchstens gleich viel, fällig nach Zahlung des Verkäufers
  await page.locator('#wz_provision_parteien_1_maklervertrag').uncheck();
  await expect(page.locator('#pa_pruefung')).toContainText('§ 656d Abs. 1 Satz 2 BGB');
  await expect(page.locator('#pa_status_1')).toContainText('noch nicht fällig');
  await page.locator('#wz_provision_parteien_1_satz').fill('4');
  await expect(page.locator('#pa_pruefung .wz-rot')).toContainText('höchstens so viel');
  await page.locator('#wz_provision_parteien_1_satz').fill('3,57');
  await expect(page.locator('#pa_pruefung .wz-rot')).toHaveCount(0);
  // Verkäufer: Nummer, Zahlung
  await page.locator('.pa-partei').nth(0).getByRole('button', { name: 'Nummer vergeben' }).click();
  await expect(page.locator('#wz_provision_parteien_0_rechnungNr')).toHaveValue('PR-2026-001');
  await expect(page.locator('#wz_provision_parteien_0_rechnungDatum')).toHaveValue('2026-09-29');
  await page.locator('.pa-partei').nth(0).getByRole('button', { name: 'Zahlung heute erfasst' }).click();
  await expect(page.locator('#pa_status_0')).toHaveText('bezahlt am 29.9.2026');
  await expect(page.locator('#wz_provision_parteien_0_bezahltBetrag')).toHaveValue('17.136,00');
  // Käufer: jetzt fällig, Rechnung mit Nachweis nach § 656d und Hinweis auf die Aufbewahrungspflicht
  await expect(page.locator('#pa_status_1')).toContainText('Rechnung fehlt');
  await page.locator('.pa-partei').nth(1).getByRole('button', { name: 'Nummer vergeben' }).click();
  await expect(page.locator('#wz_provision_parteien_1_rechnungNr')).toHaveValue('PR-2026-002');
  await expect(page.locator('#pa_status_1')).toContainText('zahlbar bis 13.10.2026');
  await page.locator('.pa-partei').nth(1).getByRole('button', { name: 'Rechnung', exact: true }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Rechnung');
  for (const t of ['Musterbank eG', 'Max Kaufbeispiel', 'PR-2026-002', '65000/00000', '15.9.2026 (Kaufvertrag)', '14.400,00 €', '2.736,00 €', '17.136,00 €',
    'Musterweg 7, 74360 Ilsfeld', '§ 656d Abs. 1 Satz 2 BGB', '§ 14b Abs. 1 Satz 5 UStG', 'bis zum 13.10.2026'])
    await expect(dok).toContainText(t);
  await expect(page.locator('#report .wzd-fuss')).toHaveCount(0);
  await expect(page.locator('#report .pa-entwurf')).toHaveCount(0);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#pa_pruefung')).toBeVisible();
  // Unternehmer als Empfänger: Hinweis auf die E-Rechnung
  await page.locator('#wz_provision_parteien_1_privat').uncheck();
  await expect(page.locator('.pa-partei').nth(1)).toContainText('§ 27 Abs. 38 UStG');
  await page.locator('#wz_provision_parteien_1_privat').check();
  // Käufer zahlt → Verkaufsfahrplan erkennt „Provision abgerechnet und eingegangen“
  await page.locator('.pa-partei').nth(1).getByRole('button', { name: 'Zahlung heute erfasst' }).click();
  await page.getByRole('button', { name: 'Alle Abrechnungen' }).click();
  await page.getByRole('button', { name: 'Bezahlt', exact: true }).click();
  await expect(page.locator('#wz_body .kd-karte')).toContainText('Testhaus');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('34.272 €');   // eingegangen 2026
  await page.evaluate(() => wzOeffnen('fahrplan'));
  await page.locator('.fp-karte').getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('.fp-schritt', { hasText: 'Provision abgerechnet und eingegangen' })).toContainText('erkannt');
  expect(meldungen.filter(m => /Pflichtangaben/.test(m))).toEqual([]);
  await keineSkriptfehler(page);
});

test('Provision: Rechnungsentwurf bei fehlenden Angaben, aus dem Notarauftrag, Kunde löschen und Auskunft, Gesamtsicherung (D42)', async ({ page, browser }) => {
  const meldungen = dialoge(page);
  await verkauftesObjekt(page);
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_t', stand: 'Beurkundet', anschrift: 'Musterweg 7, 74360 Ilsfeld', art: 'Wohnung', kaufpreis: '300.000', termin: '2026-09-20',
      verkaeufer: [Object.assign(noPerson(), { name: 'Erika Verkaufbeispiel', anschrift: 'Testweg 2, 74360 Ilsfeld' })],
      kaeufer: [Object.assign(noPerson(), { name: 'Max Kaufbeispiel', anschrift: 'Probeweg 3, 74001 Probedorf' })],
      provKaeufer: '3,57 % inkl. MwSt.', provVerkaeufer: '3,57 % inkl. MwSt.' }));
    NO.liste = null;
  });
  await page.evaluate(() => wzOeffnen('provision'));
  await page.locator('#pa_notar').selectOption('no_t');
  await expect(page.locator('#wz_provision_kaufpreis')).toHaveValue('300.000');
  await expect(page.locator('#wz_provision_vertragDatum')).toHaveValue('2026-09-20');
  await expect(page.locator('#wz_provision_art')).toHaveValue('wohnung');
  await expect(page.locator('#wz_provision_parteien_1_name')).toHaveValue('Max Kaufbeispiel');
  await expect(page.locator('#pa_pruefung')).toContainText('§ 656d Abs. 1 Satz 2 BGB');   // ohne Haken beim Käufer: nur der Verkäufer hat beauftragt
  await page.locator('#wz_provision_parteien_1_maklervertrag').check();
  await expect(page.locator('#pa_pruefung')).toContainText('§ 656c Abs. 1 BGB');
  // ohne Angaben zum Aussteller: Rückfrage, dann Entwurf
  await page.locator('.pa-partei').nth(0).getByRole('button', { name: 'Rechnung', exact: true }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Steuernummer oder USt-IdNr.');
  await expect(page.locator('#report .pa-entwurf')).toBeVisible();
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Käufer aus der Kundenakte verknüpfen, dann Kunde löschen: Name und Anschrift verschwinden aus der Abrechnung
  await page.evaluate(async () => { let a = PA.aktiv; a.parteien[1].kundeId = 'k_kauf'; await wzdSpeichernSofort('abrechnungen', a); });
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_kauf')))).flat().join('\n'));
  expect(auskunft).toContain('PROVISIONSABRECHNUNGEN');
  expect(auskunft).toContain('Rechnungsanschrift: Max Kaufbeispiel, Probeweg 3, 74001 Probedorf');
  // Gesamtsicherung enthält die Abrechnung und spielt sie wieder ein
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const text = (await inhalt(dl)).toString('utf8'), d = JSON.parse(text);
  expect(d.abrechnungen.length).toBe(1);
  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(t => pjSicherungAusText(t), text);
  await expect.poll(() => m2.join('|')).toContain('Provisionsabrechnungen: 1 neu oder aktualisiert.');
  expect(await p2.evaluate(async () => (await iaAlle('abrechnungen'))[0].parteien[1].name)).toBe('Max Kaufbeispiel');
  await ctx.close();
  await page.evaluate(() => wzSchliessen());
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_kauf'); });
  const nachher = await page.evaluate(async () => (await iaAlle('abrechnungen'))[0].parteien[1]);
  expect([nachher.name, nachher.anschrift, nachher.kundeId]).toEqual(['(Kunde gelöscht)', '', '']);
  await keineSkriptfehler(page);
});
