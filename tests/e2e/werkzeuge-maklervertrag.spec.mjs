/* Kachel „Maklerverträge“ im Browser: Vertrag mit dem Verkäufer anlegen, Ampeln zu Textform und Belehrung, Widerrufsfrist mit
   § 193 BGB, Warnung bei Notartermin vor Fristende ohne Verlangen, Wiedervorlagen, Verkaufsfahrplan, Prüfbogen; Käufervertrag
   im Fernabsatz mit Widerruf und Rückzahlung; Auskunft und Löschen beim Kunden. Nur synthetische Daten; die feste Testuhr
   steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const feld = (page, pfad) => page.locator('#wz_maklervertrag_' + pfad.replace(/[^a-zA-Z0-9]/g, '_'));

/* gesicherte Bewertung „Testhaus“ (Einfamilienhaus in Vermarktung) mit Eigentümerin aus der Kundenakte und einem Kaufinteressenten */
async function objektAnlegen(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_v', anrede: 'Frau', vorname: 'Erika', nachname: 'Beispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_k', anrede: 'Herr', vorname: 'Max', nachname: 'Probe', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    const efh = [...$('ek_typ').options].find(o => /^EFH/.test(o.value)); if (efh) $('ek_typ').value = efh.value;
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000'; $('ek_kunde_id').value = 'k_v';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Verkäufervertrag: Textform, Belehrung, Widerrufsfrist mit § 193, Notartermin, Wiedervorlagen, Fahrplan und Prüfbogen', async ({ page }) => {
  dialoge(page);
  const pid = await objektAnlegen(page);
  await page.evaluate(() => wzOeffnen('maklervertrag'));
  await expect(page.locator('#wz_body')).toContainText('Noch kein Maklervertrag vermerkt');
  await page.getByRole('button', { name: 'Vertrag mit Verkäufer' }).click();
  await page.locator('#mv_objekt').selectOption(pid);
  await expect(page.locator('#wz_body .vl-empf')).toContainText('Erika Beispiel');       // Eigentümerin aus der Bewertung
  await expect(feld(page, 'wohnung')).toBeChecked();                                         // Einfamilienhaus → § 656a
  await feld(page, 'abschluss').fill('2026-09-28');
  await feld(page, 'weg').selectOption('aussen');
  await expect(page.locator('#wz_body .mv-folge')).toContainText('§ 312b Abs. 1 Satz 1 Nr. 1 und 2 BGB');
  const pruef = page.locator('#mv_pruefung');
  await expect(pruef).toContainText('Textform fehlt: ohne Textform kein Anspruch auf Provision, auch nicht aus Bereicherung (§ 656a BGB; BGH I ZR 202/25).');
  await expect(pruef).toContainText('Keine ordnungsgemäße Belehrung vermerkt (fehlt: Datum, Muster-Widerrufsformular, Form der Übergabe): Widerruf möglich bis 12.10.2027 (§ 356 Abs. 4 Satz 1 BGB)');
  await expect(page.locator('#mv_kpis')).toContainText('Höchstfrist12.10.2027');
  await expect(page.locator('#mv_kpis')).toContainText('Ampel zur ProvisionRot');
  // Textform und Belehrung: per E-Mail ohne Zustimmung und ohne Formular reicht außerhalb der Geschäftsräume nicht
  await feld(page, 'textform.datum').fill('2026-09-28');
  await feld(page, 'textform.form').selectOption('papier');
  await feld(page, 'textform.bestimmt').check();
  await expect(pruef).toContainText('Textform erfüllt am 28.9.2026 (Vertrag auf Papier unterschrieben) (§ 656a, § 126b BGB).');
  await feld(page, 'belehrung.datum').fill('2026-09-28');
  await feld(page, 'belehrung.form').selectOption('datentraeger');
  await expect(pruef).toContainText('fehlt: Muster-Widerrufsformular, Zustimmung zum dauerhaften Datenträger');
  await feld(page, 'zustimmung').fill('2026-09-28');
  await feld(page, 'belehrung.formular').check();
  await feld(page, 'belehrung.vordruck').fill('2026-06-19');
  await expect(pruef).toContainText('Belehrung mit Muster-Widerrufsformular am 28.9.2026');
  await expect(pruef).toContainText('Widerrufsfrist läuft bis 12.10.2026');
  await expect(pruef).toContainText('Abschrift oder Bestätigung des Vertrags auf Papier übergeben');
  await expect(page.locator('#mv_kpis')).toContainText('Widerrufsfrist bis12.10.2026');
  await expect(page.locator('#mv_kpis')).toContainText('Ampel zur ProvisionGelb');
  await feld(page, 'abschrift.datum').fill('2026-09-28');
  await feld(page, 'abschrift.form').selectOption('papier');
  await expect(pruef).toContainText('Abschrift oder Bestätigung übergeben am 28.9.2026 (§ 312f Abs. 1 BGB).');
  // Notartermin vor dem Fristende ohne Verlangen auf vorzeitigen Beginn → rot; mit Verlangen auf dauerhaftem Datenträger weg
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_mv', stand: 'An das Notariat übermittelt', anschrift: 'Musterweg 7, 74360 Ilsfeld', termin: '2026-10-09' }));
    NO.liste = null; wzZeichnen();
  });
  await expect(pruef).toContainText('Widerrufsfrist läuft bis 12.10.2026 – Leistung vor Fristablauf ohne Verlangen: kein Wertersatz (Notartermin 9.10.2026; § 357a Abs. 2 BGB).');
  await expect(page.locator('#wz_body')).toContainText('Notartermin laut Notarauftrag: 9.10.2026');
  await feld(page, 'verlangen.datum').fill('2026-09-28');
  await expect(pruef).toContainText('ohne Verlangen: kein Wertersatz');                       // außerhalb: nur auf dauerhaftem Datenträger
  await feld(page, 'verlangen.datentraeger').check();
  await expect(pruef).not.toContainText('ohne Verlangen: kein Wertersatz');
  await expect(pruef).toContainText('Wertersatz bei Widerruf: Voraussetzungen vermerkt');
  // Laufzeit des Alleinauftrags und Wiedervorlagen (ohne Doppelte beim zweiten Klick)
  await feld(page, 'laufzeit.bis').fill('2027-03-31');
  await page.getByRole('button', { name: 'Fristen vormerken' }).click();
  await page.getByRole('button', { name: 'Fristen vormerken' }).click();
  const wv = await page.evaluate(() => aufLoad().filter(a => a.text.startsWith('Maklervertrag Testhaus')).map(a => [a.frist, a.kundeId]));
  expect(wv).toEqual([['2026-10-12', 'k_v'], ['2027-03-17', 'k_v']]);
  expect(await page.evaluate(() => kaEintraege().some(e => e.datum === '2026-10-12' && /Maklervertrag Testhaus \(Verkäufer\): Ende der Widerrufsfrist/.test(e.titel)))).toBe(true);
  // Verkaufsfahrplan erkennt den Maklervertrag in Textform (Schritt-Schlüssel „maklervertrag“, falls noch nicht eingetragen)
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).maklervertrag, pid)).toBe(true);
  const schritt = await page.evaluate(pid => { const s = FP_PHASEN[0][1].find(x => x[0] === 'maklervertrag'); if (!s[2]) s[2] = 'maklervertrag';
    const x = fpStand(wzdObjekt(pid)).alle.find(y => y.id === 'maklervertrag'); return [x.ok, x.auto]; }, pid);
  expect(schritt).toEqual([true, true]);
  // Vermerk in der Kundenakte
  await page.getByRole('button', { name: 'In die Kundenakte' }).click();
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_v').kontakte.map(c => c.art + ': ' + c.text).join('\n'))).toContain('Maklervertrag: Maklervertrag Testhaus (Verkäufer, Alleinauftrag): Vertragsschluss 28.9.2026');
  // Prüfbogen als Dokument
  await page.getByRole('button', { name: 'Dokument' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Maklervertrag – Prüfbogen');
  for (const t of ['Erika Beispiel', 'Beim Kunden, am Objekt oder an einem anderen Ort', 'Frist endet12.10.2026', 'Ampel zur Provision: Gelb']) await expect(dok).toContainText(t);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Liste mit Ampel
  await page.getByRole('button', { name: 'Alle Verträge' }).click();
  await expect(page.locator('.mv-karte')).toContainText('Widerrufsfrist läuft bis 12.10.2026');
  await expect(page.locator('.mv-karte')).toContainText('Erika Beispiel');
  expect(await page.evaluate(() => wzdAkten('maklervertrag').length)).toBe(1);
  await keineSkriptfehler(page);
});

test('Käufervertrag im Fernabsatz: Vorschlag Vertragsschluss, Widerruf mit Rückzahlung, Auskunft und Löschen beim Kunden', async ({ page }) => {
  dialoge(page);
  const pid = await objektAnlegen(page);
  await page.evaluate(async pid => {
    const a = Object.assign(paLeer(), { id: 'pa_mv', projektId: pid, objekt: 'Testhaus', anschrift: 'Musterweg 7, 74360 Ilsfeld', kaufpreis: '480.000', vertragDatum: '2026-09-24' });
    Object.assign(a.parteien[1], { kundeId: 'k_k', name: 'Max Probe', anschrift: 'Probeweg 3, 74001 Probedorf', bezahltAm: '2026-09-25', bezahltBetrag: '17.136,00' });
    await wzdSpeichern('abrechnungen', a);
    wzOeffnen('maklervertrag'); await mvNeu('kaeufer', { projektId: pid, kundeId: 'k_k' });
  }, pid);
  await expect(page.locator('#wz_body .vl-empf')).toContainText('Max Probe');
  await expect(feld(page, 'vertragsart')).toHaveValue('nachweis');
  await feld(page, 'kaeufer.expose').fill('2026-09-14');
  await feld(page, 'kaeufer.bitte').fill('2026-09-16');
  await feld(page, 'weg').selectOption('fern');
  await expect(page.locator('#wz_body')).not.toContainText('Zustimmung zum dauerhaften Datenträger am');   // nur außerhalb nötig
  await feld(page, 'textform.datum').fill('2026-09-16');
  await feld(page, 'textform.bestimmt').check();
  await feld(page, 'belehrung.datum').fill('2026-09-14');
  await feld(page, 'belehrung.form').selectOption('angepasst');
  await feld(page, 'belehrung.formular').check();
  await feld(page, 'belehrung.vordruck').fill('2026-06-19');
  const pruef = page.locator('#mv_pruefung');
  await expect(pruef).toContainText('Widerrufsfrist läuft bis 30.9.2026');
  await expect(page.locator('#mv_kpis')).toContainText('ab Vertragsschluss am 16.9.2026');
  await expect(pruef).toContainText('Bestätigung des Vertrags auf einem dauerhaften Datenträger senden');
  // Widerruf: Absendung zählt, Rückzahlung der gezahlten Provision bis Eingang + 14 Tage
  await feld(page, 'widerruf.abgesandt').fill('2026-09-28');
  await feld(page, 'widerruf.eingang').fill('2026-09-29');
  await expect(pruef).toContainText('Widerrufen (abgesandt am 28.9.2026), eingegangen am 29.9.2026: keine Provision fordern; eine gezahlte Provision spätestens bis 13.10.2026 zurückzahlen (§ 357 Abs. 1, § 355 Abs. 3 Satz 2 BGB).');
  await expect(page.locator('#mv_kpis')).toContainText('Widerrufen – keine Provision; Rückzahlung bis 13.10.2026');
  await expect(page.locator('#mv_widerruf')).toContainText('Provision laut Kachel „Provision“ gezahlt am 25.9.2026 – Rückzahlung spätestens bis 13.10.2026.');
  await page.getByRole('button', { name: 'Widerruf in Kundenakte und Kalender' }).click();
  expect(await page.evaluate(() => aufLoad().filter(a => a.kundeId === 'k_k').map(a => a.frist + ' ' + a.text)))
    .toEqual(['2026-10-13 Maklervertrag Testhaus (Käufer): Rückzahlung der Provision nach Widerruf spätestens am 13.10.2026']);
  expect(await page.evaluate(() => KD_CACHE.find(k => k.id === 'k_k').kontakte[0].text)).toContain('Widerruf des Maklervertrags Testhaus abgesandt am 28.9.2026, eingegangen am 29.9.2026');
  // Kundenakte zeigt den Vertrag; Auskunft führt ihn auf
  await page.evaluate(() => { wzSchliessen(); kdOeffnen('k_k'); });
  await expect(page.locator('#kd_inhalt')).toContainText('Maklerverträge');
  await expect(page.locator('#kd_inhalt')).toContainText('Testhaus · Käufer');
  await page.evaluate(() => kdSchliessen());
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(auskunft).toMatch(/MAKLERVERTRÄGE\n- Testhaus: Käufer, Nachweis- oder Vermittlungsvertrag \(Käufer\)(, Provision [^;]*)?; Vertragsschluss 16\.9\.2026 \(Nur E-Mail, Brief oder Telefon\); Verbraucher ja; Textform 16\.9\.2026; Belehrung 14\.9\.2026 mit Muster-Widerrufsformular; Widerrufsfrist bis 30\.9\.2026; Widerruf abgesandt 28\.9\.2026, eingegangen 29\.9\.2026/);
  expect(await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_v')))).flat().join('\n'))).toMatch(/MAKLERVERTRÄGE\n- keine/);
  // Löschen: Vermerk bleibt ohne Personenbezug
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_k'); });
  const rest = await page.evaluate(async () => (await iaAlle('akten')).filter(a => a.art === 'maklervertrag').map(a => ({ kundeId: a.kundeId, geloescht: a.kundeGeloescht, notiz: a.notiz })));
  expect(rest).toEqual([{ kundeId: '', geloescht: true, notiz: '' }]);
  expect(await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'))).toMatch(/MAKLERVERTRÄGE\n- keine/);
  await keineSkriptfehler(page);
});

test('Abschlussweg mit Folgen: Filiale ohne Widerrufsrecht, Mehrfamilienhaus ohne Formvorschrift, Online-Abschluss, Filter', async ({ page }) => {
  dialoge(page);
  await objektAnlegen(page);
  await page.evaluate(async () => { wzOeffnen('maklervertrag'); await mvNeu('verkaeufer', { kundeId: 'k_v' }); });
  await feld(page, 'objekt').fill('Mehrfamilienhaus Probeweg 3');
  await feld(page, 'abschluss').fill('2026-09-21');
  await feld(page, 'weg').selectOption('filiale');
  await expect(page.locator('#mv_kpis')).toContainText('Widerrufsrechtnein');
  await expect(page.locator('#mv_pruefung')).toContainText('Vertrag in Geschäftsräumen: kein Widerrufsrecht (§ 312b Abs. 2, § 312g Abs. 1 BGB).');
  await feld(page, 'wohnung').uncheck();
  await expect(page.locator('#mv_pruefung')).toContainText('Keine Formvorschrift nach § 656a BGB');
  await feld(page, 'laufzeit.bis').fill('2027-03-21');
  await expect(page.locator('#mv_kpis')).toContainText('Ampel zur ProvisionGrün');
  await expect(page.locator('#mv_kpis')).toContainText('Kein Widerrufsrecht');
  // Online-Oberfläche: Schaltfläche „zahlungspflichtig …“ und Widerrufsfunktion
  await feld(page, 'weg').selectOption('online');
  await expect(page.locator('#mv_pruefung')).toContainText('Schaltfläche „zahlungspflichtig …“ nicht als geprüft vermerkt');
  await feld(page, 'online.zahlungspflichtig').check();
  await expect(page.locator('#mv_pruefung')).not.toContainText('nicht als geprüft vermerkt');
  await expect(page.locator('#mv_pruefung')).toContainText('Fristbeginn unsicher – nicht vermerkt: Schaltfläche „Vertrag widerrufen“ beim Portal (§ 356a BGB)');
  // Kunde ist kein Verbraucher → kein Widerrufsrecht
  await feld(page, 'verbraucher').uncheck();
  await expect(page.locator('#mv_pruefung')).toContainText('Kunde ist kein Verbraucher (§ 13 BGB): kein Widerrufsrecht.');
  // Liste: Filter „Mit Handlungsbedarf“
  await page.getByRole('button', { name: 'Alle Verträge' }).click();
  await expect(page.locator('.mv-karte')).toHaveCount(1);
  await expect(page.locator('.mv-karte')).toContainText('Mehrfamilienhaus Probeweg 3');
  await page.getByRole('button', { name: 'Mit Handlungsbedarf' }).click();
  await expect(page.locator('#wz_body')).toContainText('Kein Vertrag mit Handlungsbedarf.');
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Maklerverträge');
  await expect(page.locator('#report .wzd')).toContainText('Mehrfamilienhaus Probeweg 3');
  await expect(page.locator('#report .wzd')).not.toContainText('Erika Beispiel');
  await keineSkriptfehler(page);
});
