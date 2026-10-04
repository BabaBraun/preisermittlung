/* Kachel „Weitergaben“ (D57) im Browser: Ansprechpartner, Entwurf aus einer Anfrage, Einwilligung als Pflicht vor dem Speichern
   (Art. 7 Abs. 1 DSGVO), Wiedervorlage „Rücklauf prüfen“, Übergabeblatt nur mit Freigaben und Pflichtangaben, Stand und Volumen,
   Verkaufsfahrplan, Auswertung ohne Namen, Rücklauf überfällig, Widerruf, Vorschläge nach dem Kauf, Kundenakte mit Auskunft und
   Löschen, Gesamtsicherung. Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());
const ABSENDER = { firma: 'Musterbank eG', sitz: 'Musterstadt', registergericht: 'Amtsgericht Musterstadt', registernr: 'GnR 123',
  vorstand: 'Erika Vorstand, Max Vorstand', aufsichtsrat: 'Ida Muster', name: 'Fabian Berater', tel: '07062 000' };

async function testhaus(page, status = 'In Vermarktung') {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  return page.evaluate(async ({ status, ABSENDER }) => {
    await kdSpeichern({ id: 'k_w', anrede: 'Frau', vorname: 'Erika', nachname: 'Beispiel', telefon: '07062 123', email: 'erika@beispiel.de',
      strasse: 'Testweg 2', plzort: '74360 Ilsfeld', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = status; $('ex_preis').value = '480.000';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    Object.assign(abS(), ABSENDER); wzSpeichernJetzt();
    return pjLoad().find(p => p.name === 'Testhaus').id;
  }, { status, ABSENDER });
}
const akten = page => page.evaluate(async () => (await iaAlle('akten')).filter(a => a.art === 'weitergabe'));

test('Weitergabe: Einwilligung Pflicht, Wiedervorlage, Übergabeblatt nur mit Freigaben, Stand, Fahrplan, Auswertung ohne Namen (D57)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await testhaus(page);
  await page.evaluate(async pid => {
    await wzdSpeichern('vorgaenge', { id: 'v_w', typ: 'anfrage', datum: '2026-09-20', kundeId: 'k_w', projektId: pid, quelle: 'ImmoScout24', status: 'Besichtigung', stufe: 3, verlauf: [] });
    wzOeffnen('weitergabe');
  }, pid);
  // Ansprechpartner anlegen (Liste ist leer, darum offen)
  await expect(page.locator('#wz_body .wg-kollegen')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Ansprechpartner hinzufügen' }).click();
  await page.locator('#wz_weitergabe_kollegen_0_name').fill('Max Kollege');
  await page.locator('#wz_weitergabe_kollegen_0_filiale').fill('Ilsfeld');
  await page.locator('#wz_weitergabe_kollegen_0_tel').fill('07062 999');
  await expect.poll(() => page.evaluate(() => wgS().kollegen[0].name)).toBe('Max Kollege');
  // Entwurf aus der Anfrage: Kunde und Objekt übernommen
  await page.getByRole('button', { name: 'Neue Weitergabe' }).click();
  await page.locator('#wg_anfrage').selectOption('v_w');
  await expect(page.locator('#wz_body .mdb-box', { hasText: 'Kunde' }).first()).toContainText('Erika Beispiel');
  await expect(page.locator('#wg_objekt')).toHaveValue(pid);
  await page.locator('#wz_weitergabe_kollegeId').selectOption({ index: 1 });
  await expect(page.locator('#wz_body')).toContainText('07062 999');
  await expect(page.locator('#wg_pruefung')).toContainText('Es fehlt: Einwilligung oder Wunsch des Kunden, Form der Einwilligung');
  await expect(page.locator('#wg_pruefung')).toContainText('Art. 7 Abs. 1 DSGVO');
  // ohne Einwilligung: nichts gespeichert
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Noch nicht gespeichert');
  expect(meldungen.at(-1)).toContain('Form der Einwilligung');
  expect(await akten(page)).toHaveLength(0);
  // Einwilligung und Freigaben
  await page.locator('#wz_weitergabe_einwilligung_ja').check();
  await page.locator('#wz_weitergabe_einwilligung_form').selectOption('vordruck');
  await page.locator('#wz_weitergabe_einwilligung_rueckmeldung').check();
  for (const k of ['kontakt', 'wohnflaeche', 'kaufpreis']) await page.locator('#wz_weitergabe_freigabe_' + k).check();
  await page.locator('#wz_weitergabe_anliegen').fill('Finanzierung für das Testhaus, Rückruf abends');
  await expect(page.locator('#wg_pruefung .wz-gruen').first()).toContainText(/Einwilligung vom 29\.0?9\.2026 liegt vor \(schriftlich/);
  await expect(page.locator('#wz_body')).toContainText(/Wiedervorlage „Rücklauf prüfen“ am 13\.10\.2026 anlegen/);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('#wz_body .ub-kopfzeile')).toContainText('Erika Beispiel · Baufinanzierung');
  let a = (await akten(page))[0];
  expect([a.kundeId, a.projektId, a.anlass, a.stand, a.einwilligung.form, a.kollege.name]).toEqual(['k_w', pid, 'baufinanzierung', 'uebergeben', 'vordruck', 'Max Kollege']);
  expect(a.wvAnlegen).toBeUndefined();
  const wv = await page.evaluate(id => aufLoad().find(x => x.id === id), a.wvId);
  expect([wv.text, wv.frist, wv.kundeId, wv.objekt]).toEqual(['Rücklauf prüfen: Baufinanzierung bei Max Kollege', '2026-10-13', 'k_w', 'Testhaus']);
  // Übergabeblatt: nur Freigegebenes, Pflichtangaben der Genossenschaft
  await page.getByRole('button', { name: 'Übergabeblatt' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Übergabe: Baufinanzierung für den Kauf');
  for (const t of ['Erika Beispiel', '07062 123', 'erika@beispiel.de', '145 m²', 'Angebotspreis', '480.000 €', 'Max Kollege', 'Filiale Ilsfeld',
    'Finanzierung für das Testhaus', 'schriftlich (Vordruck der Bank)', 'an Fabian Berater, bitte bis 13.10.2026'])
    await expect(dok).toContainText(t);
  for (const t of ['Testweg 2', '1985', 'Einfamilienhaus', '74360 Ilsfeld']) await expect(dok).not.toContainText(t);
  await expect(page.locator('#report .wzd-pflicht')).toContainText('GnR 123');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Stand: Finanzierung zugesagt, Volumen, Verlauf; Wiedervorlage bleibt offen
  await page.locator('#wz_weitergabe_stand').selectOption('zugesagt');
  await expect(page.locator('#wz_body .vg-verlauf')).toContainText('Stand: Finanzierung zugesagt');
  await page.locator('#wz_weitergabe_volumen').fill('350.000');
  await expect.poll(async () => { const x = (await akten(page))[0]; return [x.stand, x.rueckmeldungAm, x.volumen]; }).toEqual(['zugesagt', '2026-09-29', '350.000']);
  // Verkaufsfahrplan: Zusage zählt erst beim reservierten Objekt (ohne Notarauftrag genau eine Zusage)
  const fp = await page.evaluate(pid => { const o = wzdObjekt(pid); return [fpAuto(o).wg_finanzierung, fpAuto(Object.assign({}, o, { status: 'Reserviert' })).wg_finanzierung]; }, pid);
  expect(fp).toEqual([false, true]);
  // abgeschlossen: Wiedervorlage erledigt
  await page.locator('#wz_weitergabe_stand').selectOption('abgeschlossen');
  await expect.poll(() => page.evaluate(id => aufLoad().find(x => x.id === id).erledigt, a.wvId)).toBe(true);
  // unvollständige Einwilligung wird nicht gespeichert; beim Verlassen gilt der letzte Stand
  await page.locator('#wz_weitergabe_einwilligung_datum').fill('');
  await expect(page.locator('#wg_pruefung')).toContainText('Nicht gespeichert — es fehlt: Datum der Einwilligung');
  await page.locator('#wz_weitergabe_notiz').fill('Zusage per Telefon');
  await page.waitForTimeout(600);
  a = (await akten(page))[0];
  expect([a.einwilligung.datum, a.notiz]).toEqual(['2026-09-29', '']);
  await page.getByRole('button', { name: 'Alle Weitergaben' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('zuletzt gespeicherte Stand');
  await expect.poll(async () => { const x = (await akten(page))[0]; return [x.einwilligung.datum, x.notiz]; }).toEqual(['2026-09-29', 'Zusage per Telefon']);
  // Übersicht und Auswertung ohne Namen
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click();
  await expect(page.locator('#wz_body .wg-karte')).toContainText('Erika Beispiel');
  await expect(page.locator('#wz_body .wg-karte')).toContainText('abgeschlossen');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Erfolgreich 20261');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('350.000 €');
  const zeile = page.locator('.wg-auswertung tbody tr', { hasText: 'Baufinanzierung' });
  await expect(zeile.locator('td')).toHaveText(['Baufinanzierung', '0', '0', '0', '1', '0', '1', '100 %', '350.000 €']);
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Weitergaben an Kollegen');
  await expect(page.locator('#report .wzd')).toContainText('350.000 €');
  for (const t of ['Erika Beispiel', 'Max Kollege', 'Ilsfeld']) await expect(page.locator('#report .wzd')).not.toContainText(t);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Gesamtsicherung: Akte und Ansprechpartner
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const d = JSON.parse((await inhalt(dl)).toString('utf8'));
  expect(d.akten.filter(x => x.art === 'weitergabe')).toHaveLength(1);
  expect(d.werkzeuge.weitergabe.kollegen[0].name).toBe('Max Kollege');
  await keineSkriptfehler(page);
});

test('Weitergabe: Rücklauf überfällig, Widerruf, Vorschläge nach dem Kauf, Kundenakte mit Auskunft und Löschen (D57)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await testhaus(page, 'Verkauft');
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_k', anrede: 'Herr', vorname: 'Max', nachname: 'Käuferbeispiel', telefon: '0711 1', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    await kdSpeichern({ id: 'k_v', anrede: 'Frau', vorname: 'Ida', nachname: 'Verkäuferbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 3 });
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_w', stand: 'Beurkundet', anschrift: 'Musterweg 7, 74360 Ilsfeld', termin: '2026-09-15',
      verkaeufer: [Object.assign(noPerson(), { kundeId: 'k_v', name: 'Ida Verkäuferbeispiel' })], kaeufer: [Object.assign(noPerson(), { kundeId: 'k_k', name: 'Max Käuferbeispiel' })] }));
    wgS().kollegen = [{ id: 'c_1', name: 'Max Kollege', bereich: 'baufinanzierung', filiale: '', tel: '', mail: '' }]; wzSpeichernJetzt();
    await wzdSpeichern('akten', wgLeer({ id: 'we_alt', kundeId: 'k_k', datum: '2026-09-01', kollegeId: 'c_1', kollege: { name: 'Max Kollege', bereich: 'baufinanzierung', filiale: '' },
      anliegen: 'Rückruf abends', einwilligung: { ja: true, datum: '2026-09-01', form: 'vordruck', rueckmeldung: true, widerrufen: '' }, freigabe: { kontakt: true } }));
    wzOeffnen('weitergabe');
  });
  // Rücklauf überfällig: 01.09. + 14 Tage = 15.09.2026
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Rücklauf fällig1');
  await expect(page.locator('#wz_body .wg-karte')).toContainText(/Rücklauf seit 15\.0?9\.2026/);
  // Vorschläge nach dem Kauf aus dem beurkundeten Notarauftrag
  const box = page.locator('#wz_body .mdb-box', { hasText: 'Nach dem Kauf: Anlässe' });
  for (const t of ['Max Käuferbeispiel · Gebäudeversicherung nach dem Kauf', 'Max Käuferbeispiel · Modernisierungskredit', 'Ida Verkäuferbeispiel · Geldanlage des Verkaufserlöses'])
    await expect(box).toContainText(t);
  await expect(box).not.toContainText('Max Käuferbeispiel · Baufinanzierung');
  await box.locator('.wg-vorschlag', { hasText: 'Gebäudeversicherung' }).getByRole('button', { name: 'Ausblenden' }).click();
  await expect(box).not.toContainText('Gebäudeversicherung');
  await box.locator('.wg-vorschlag', { hasText: 'Ida Verkäuferbeispiel' }).getByRole('button', { name: 'Weitergeben' }).click();
  await expect(page.locator('#wz_weitergabe_anlass')).toHaveValue('geldanlage');
  await expect(page.locator('#wg_objekt')).toHaveValue(pid);
  await expect(page.locator('#wz_body')).toContainText('Ida Verkäuferbeispiel');
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  // Widerruf: rot, kein Übergabeblatt
  await page.locator('#wz_body .wg-karte').getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#wg_pruefung')).toContainText(/Rücklauf prüfen: fällig seit 15\.0?9\.2026/);
  // Wiedervorlage für einen schon fälligen Rücklauf: heute, nicht in der Vergangenheit
  await page.getByRole('button', { name: /Wiedervorlage „Rücklauf prüfen“ am 29\.0?9\.2026/ }).click();
  await expect(page.locator('#wz_body')).toContainText(/Wiedervorlage „Rücklauf prüfen“ am 29\.0?9\.2026\./);
  const wvId = (await akten(page))[0].wvId;
  expect(await page.evaluate(id => aufLoad().find(x => x.id === id).frist, wvId)).toBe('2026-09-29');
  await page.locator('#wz_weitergabe_einwilligung_widerrufen').fill('2026-09-28');
  await expect(page.locator('#wg_pruefung .wz-rot')).toContainText('widerrufen — nichts mehr weitergeben');
  await expect(page.locator('#wg_pruefung')).not.toContainText('Rücklauf prüfen');
  await page.getByRole('button', { name: 'Übergabeblatt' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('widerrufen — kein Übergabeblatt');
  await expect(page.locator('#report .wzd')).toHaveCount(0);
  await expect.poll(async () => (await akten(page))[0].einwilligung.widerrufen).toBe('2026-09-28');
  expect(await page.evaluate(id => aufLoad().find(x => x.id === id).erledigt, wvId)).toBe(true);   // nach dem Widerruf kein Nachfassen
  await page.getByRole('button', { name: 'Alle Weitergaben' }).click();
  await expect(page.locator('#wz_body .wg-karte')).toContainText('Einwilligung widerrufen');
  // Kundenakte: Abschnitt mit Öffnen und „An Kollegen weitergeben“
  await page.evaluate(() => { wzSchliessen(); kdOeffnen('k_k'); });
  await expect(page.locator('#kd_inhalt')).toContainText('Weitergaben an Kollegen');
  await expect(page.locator('#kd_inhalt .kd-karte', { hasText: 'Baufinanzierung für den Kauf' })).toContainText('Max Kollege');
  await page.locator('#kd_inhalt').getByRole('button', { name: 'An Kollegen weitergeben' }).click();
  await expect(page.locator('#wz_overlay')).toHaveClass(/on/);
  await expect(page.locator('#wz_body .ub-status')).toHaveText('Neue Weitergabe');
  await expect(page.locator('#wz_body')).toContainText('Max Käuferbeispiel');
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  // Auskunft
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(auskunft).toMatch(/WEITERGABEN AN KOLLEGEN DER BANK\n- 1\.0?9\.2026 Baufinanzierung für den Kauf an Max Kollege \(Baufinanzierung\); Stand: übergeben; Einwilligung vom 1\.0?9\.2026 \(schriftlich \(Vordruck der Bank\)\), mit Rückmeldung zum Stand, widerrufen am 28\.0?9\.2026; freigegeben: Telefon und E-Mail; Anliegen: Rückruf abends/);
  // Löschen: Personenbezug entfernt, die Auswertung zählt weiter
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_k'); });
  const x = (await akten(page))[0];
  expect([x.kundeId, x.kundeGeloescht, x.anliegen, x.einwilligung.datum, x.anlass]).toEqual(['', true, '', '', 'baufinanzierung']);
  expect([x.wvId, x.kollegeId, x.kollege, x.freigabe.kontakt]).toEqual(['', '', null, false]);   // D63: kein Weg zurück über Wiedervorlage oder Kollegen
  await page.evaluate(() => wzOeffnen('weitergabe'));
  await expect(page.locator('#wz_body .wg-karte')).toContainText('(Kunde gelöscht)');
  await expect(page.locator('.wg-auswertung tbody tr', { hasText: 'Baufinanzierung' }).locator('td').nth(1)).toHaveText('1');
  await page.locator('#wz_body .wg-karte').getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#wg_pruefung')).toContainText('Der Kunde wurde gelöscht');
  await expect(page.getByRole('button', { name: 'Übergabeblatt' })).toHaveCount(0);
  const auskunft2 = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(auskunft2).toContain('WEITERGABEN AN KOLLEGEN DER BANK\n- keine');
  await keineSkriptfehler(page);
});

test('Weitergabe: Personenbezug alter erledigter Weitergaben entfernen — Objekt, Kollege und Wiedervorlage gehen mit (D63)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await testhaus(page);
  await page.evaluate(async pid => {
    const ein = { ja: true, datum: '2025-07-30', form: 'vordruck', rueckmeldung: true, widerrufen: '' };
    wgS().kollegen = [{ id: 'c_1', name: 'Max Probe', bereich: 'baufinanzierung', filiale: 'Ilsfeld', tel: '', mail: '' }]; wzSpeichernJetzt();
    aufStore(aufLoad().concat([
      { id: 'aWV0', text: 'Rücklauf prüfen: Baufinanzierung', frist: '2025-08-10', objekt: 'Testhaus', kundeId: 'k_w', erledigt: true, angelegt: 1 },
      { id: 'aWV1', text: 'Rücklauf prüfen: Baufinanzierung bei Max Probe', frist: '2025-08-15', objekt: 'Testhaus', kundeId: 'k_w', erledigt: true, angelegt: 2 },
      { id: 'aWV2', text: 'Rücklauf prüfen: Bausparen', frist: '2026-10-05', objekt: '', kundeId: 'k_w', erledigt: false, angelegt: 3 },
      { id: 'aAnders', text: 'Exposé schicken', frist: '2026-10-01', objekt: 'Testhaus', kundeId: 'k_w', erledigt: false, angelegt: 4 }]));
    await wzdSpeichern('akten', wgLeer({ id: 'we_alt', kundeId: 'k_w', projektId: pid, datum: '2025-08-01', rueckmeldungAm: '2025-09-01', stand: 'abgeschlossen',
      volumen: '350.000', kaufpreis: '420.000', freigabe: { kontakt: true, ort: true, kaufpreis: true }, kollegeId: 'c_1',
      kollege: { name: 'Max Probe', bereich: 'baufinanzierung', filiale: 'Ilsfeld' }, anliegen: 'Rückruf abends', notiz: 'Zusage telefonisch', wvId: 'aWV1', einwilligung: ein,
      verlauf: [{ id: 'h1', datum: '2025-08-01', text: 'Übergeben an Max Probe' }, { id: 'h2', datum: '2025-09-01', text: 'Stand: abgeschlossen' }] }));
    await wzdSpeichern('akten', wgLeer({ id: 'we_neu', kundeId: 'k_w', anlass: 'bausparen', datum: '2026-09-20', wvId: 'aWV2',
      einwilligung: { ...ein, datum: '2026-09-20' } }));
    wzOeffnen('weitergabe');
  }, pid);
  await expect(page.locator('#wz_body')).toContainText('1 erledigte Weitergabe ist älter als zwölf Monate');
  await page.getByRole('button', { name: 'Personenbezug entfernen' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Für die Auswertung bleiben Anlass, Stand, Datum und Volumen');
  await expect.poll(async () => (await akten(page)).find(x => x.id === 'we_alt').kundeGeloescht).toBe(true);
  const l = await akten(page), alt = l.find(x => x.id === 'we_alt'), neu = l.find(x => x.id === 'we_neu');
  expect([alt.kundeId, alt.projektId, alt.kaufpreis, alt.kollegeId, alt.kollege, alt.wvId, alt.anliegen, alt.notiz]).toEqual(['', '', '', '', null, '', '', '']);
  expect(Object.values(alt.freigabe).some(Boolean)).toBe(false);
  expect([alt.anlass, alt.stand, alt.datum, alt.rueckmeldungAm, alt.volumen]).toEqual(['baufinanzierung', 'abgeschlossen', '2025-08-01', '2025-09-01', '350.000']);
  for (const t of [pid, 'Max Probe', '420.000', 'aWV1', 'k_w', 'c_1', 'Ilsfeld']) expect(JSON.stringify(alt)).not.toContain(t);
  expect([neu.kundeId, neu.wvId]).toEqual(['k_w', 'aWV2']);                       // die offene Weitergabe bleibt, wie sie ist
  // Wiedervorlagen: die verknüpfte und die ältere erledigte zum selben Anlass sind weg, die übrigen bleiben
  expect(await page.evaluate(() => kdAufgaben('k_w').map(a => a.id).sort())).toEqual(['aAnders', 'aWV2']);
  // Auswertung zählt weiter; Karte und Editor ohne Kunde, Objekt und Kollege, ohne Notizfeld
  await expect(page.locator('.wg-auswertung tbody tr', { hasText: 'Baufinanzierung' }).locator('td')).toHaveText(['Baufinanzierung', '0', '0', '0', '1', '0', '1', '100 %', '350.000 €']);
  await expect(page.locator('#wz_body')).not.toContainText('älter als zwölf Monate');
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click();
  const karte = page.locator('#wz_body .wg-karte', { hasText: '(Kunde gelöscht)' });
  await expect(karte).not.toContainText('Testhaus'); await expect(karte).not.toContainText('Max Probe');
  await karte.getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#wg_pruefung')).toContainText('Der Kunde wurde gelöscht');
  for (const t of ['Testhaus', 'Max Probe', 'Ilsfeld']) await expect(page.locator('#wz_body')).not.toContainText(t);
  await expect(page.locator('#wz_body')).toContainText('Ohne Personenbezug');
  await expect(page.locator('#wz_weitergabe_notiz')).toHaveCount(0);
  await expect(page.locator('#wz_weitergabe_volumen')).toHaveValue('350.000');
  // Auskunft des Kunden: nur noch die offene Weitergabe, keine Wiedervorlage der alten
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_w')))).flat().join('\n'));
  expect(auskunft).toContain('Bausparen'); expect(auskunft).not.toContain('Baufinanzierung für den Kauf');
  await keineSkriptfehler(page);
});
