/* D48 im Browser: Eigentümerbericht aus allen Quellen, Pflichtangaben der Genossenschaft (§ 25a GenG), Sicherungserinnerung
   über alle Daten, Auskunft und Löschen für Notarauftrag und Übergabeprotokoll, Stichtag der Bodenrichtwerte. Nur synthetische
   Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler, JETZT } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());
const ABSENDER = { firma: 'Musterbank eG', sitz: 'Musterstadt', registergericht: 'Amtsgericht Musterstadt', registernr: 'GnR 123',
  vorstand: 'Erika Beispiel, Max Probe', aufsichtsrat: 'Ida Muster' };

async function objektMitVermarktung(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    for (const [id, vn, nn] of [['k_a', 'Erika', 'Anfragebeispiel'], ['k_b', 'Max', 'Bieterbeispiel']])
      await kdSpeichern({ id, anrede: '', vorname: vn, nachname: nn, grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('vm_start').value = '2026-08-01'; $('ex_preis').value = '480.000';
    $('vm_daten').value = JSON.stringify({ ev: [
      { id: 'e1', d: '2026-09-01', art: 'Anfrage', kid: 'k_a', wer: 'Erika Anfragebeispiel', rueck: '' },
      { id: 'e2', d: '2026-09-10', art: 'Besichtigung', kid: 'k_a', wer: 'Erika Anfragebeispiel', rueck: 'Preis zu hoch' }] });
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    const pid = pjLoad().find(p => p.name === 'Testhaus').id;
    await wzdSpeichern('vorgaenge', { id: 'v_a', typ: 'anfrage', datum: '2026-09-01', kundeId: 'k_a', projektId: pid, quelle: 'ImmoScout24', status: 'Besichtigung', stufe: 3, verlauf: [] });
    await wzdSpeichern('vorgaenge', { id: 'v_b', typ: 'anfrage', datum: '2026-09-05', kundeId: 'k_b', projektId: pid, quelle: 'Immowelt', status: 'Abgesagt', stufe: 2, abgesagt: true, grund: 'Lage',
      verlauf: [{ id: 'h1', datum: '2026-09-06', text: 'Exposé versendet' }] });
    await wzdSpeichern('termine', { id: 't_1', art: 'Besichtigung', titel: '', datum: '2026-09-10', von: '10:00', projektId: pid, kundeIds: ['k_a'], notiz: '', erinnerung: '0' });
    await wzdSpeichern('termine', { id: 't_2', art: 'Besichtigung', titel: '', datum: '2026-10-05', von: '11:00', projektId: pid, kundeIds: ['k_b'], notiz: '', erinnerung: '0' });
    await wzdSpeichern('bieter', { id: 'b_1', projektId: pid, ende: '2026-10-20', status: 'laufend', gebote: [{ id: 'g1', kundeId: 'k_b', betrag: 470000, datum: '2026-09-20', status: 'gültig' }] });
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Eigentümerbericht zählt Bewertungsprotokoll, Interessenten, Kalender und Gebote — doppelt Erfasstes einmal, ohne Namen (D48)', async ({ page }) => {
  dialoge(page);
  const pid = await objektMitVermarktung(page);
  const x = await page.evaluate(pid => { const r = wzdVermarktung(wzdObjekt(pid)); return { a: r.anfragen, b: r.besicht, g: r.geplant.length, an: r.angebote, h: r.hoechstes, e: r.exposes, herkunft: r.herkunft, rueck: r.rueck }; }, pid);
  expect(x).toEqual({ a: 2, b: 1, g: 1, an: 1, h: 470000, e: 1, herkunft: { ImmoScout24: 1, Immowelt: 1 }, rueck: { 'Preis zu hoch': 1, Lage: 1 } });
  await page.evaluate(() => wzOeffnen('eigentuemerbericht'));
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Anfragen2');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('1 geplant');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('höchstes 470.000 €');
  await expect(page.locator('#wz_body')).toContainText('Der Eigentümer hat noch keinen Bericht bekommen.');
  await page.getByRole('button', { name: 'Dokument' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Vermarktungsbericht');
  for (const t of ['Interessent 1', 'Interessent 2', 'ImmoScout24', 'Immowelt', 'Preis zu hoch', 'Gebot über 470.000 €', 'Exposés versendet']) await expect(dok).toContainText(t);
  for (const t of ['Anfragebeispiel', 'Bieterbeispiel']) await expect(dok).not.toContainText(t);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Fahrplan erkennt den Bericht, die Vorlage „Stand der Vermarktung“ zählt alle Quellen
  await page.evaluate(() => wzOeffnen('fahrplan'));
  await page.locator('.fp-karte').getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('.fp-schritt', { hasText: 'Eigentümer über den Stand informiert' })).toContainText('erkannt');
  const w = await page.evaluate(pid => vlWerte({ kundeId: '', projektId: pid, terminId: '' }), pid);
  expect([w.vm_anfragen, w.vm_besichtigungen, w.vm_angebote]).toEqual(['2', '1', '1']);
  await keineSkriptfehler(page);
});

test('Pflichtangaben der Genossenschaft: Prüfung, unter E-Mail, Word, Rechnung und Bericht, nicht bei Signatur im Mailprogramm (D48)', async ({ page }) => {
  dialoge(page);
  await objektMitVermarktung(page);
  await page.evaluate(() => wzOeffnen('absender'));
  for (const [k, v] of Object.entries(ABSENDER)) await page.locator('#wz_absender_' + k).fill(v);
  await expect(page.locator('#ab_pruefung')).toContainText('Vollständig');
  await expect(page.locator('#ab_vorschau')).toContainText('Musterbank eG · eingetragene Genossenschaft · Sitz Musterstadt');
  await expect(page.locator('#ab_vorschau')).toContainText('Registergericht Amtsgericht Musterstadt, GnR 123');
  await page.locator('#wz_absender_vorstand').fill('E. Beispiel');
  await expect(page.locator('#ab_pruefung')).toContainText('Vorname ausschreiben');
  await expect(page.locator('#ab_pruefung')).toContainText('mindestens zwei Personen');
  await page.locator('#wz_absender_vorstand').fill(ABSENDER.vorstand);
  // Vorlage: E-Mail und Word mit Pflichtangaben
  const mail = await page.evaluate(() => { vlOeffnenMit({ vorlage: 'expose', kundeId: 'k_a', projektId: pjLoad()[0].id }); return decodeURIComponent(vlMailLink()); });
  expect(mail).toContain('Vorstand: Erika Beispiel, Max Probe');
  expect(mail).toContain('Vorsitz des Aufsichtsrats: Ida Muster');
  await expect(page.locator('#wz_body')).toContainText('setzt die App die Pflichtangaben der Bank');
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd-pflicht')).toContainText('GnR 123');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Signatur im Mailprogramm: E-Mail ohne, Word weiter mit
  await page.evaluate(() => wzOeffnen('absender'));
  await page.locator('#ab_signatur').check();
  const ohne = await page.evaluate(() => { vlOeffnenMit({ vorlage: 'expose', kundeId: 'k_a', projektId: pjLoad()[0].id }); return { mail: decodeURIComponent(vlMailLink()), word: vlMitPflicht(VL.text) }; });
  expect(ohne.mail).not.toContain('GnR 123');
  expect(ohne.word).toContain('GnR 123');
  // Rechnung der Provision trägt die Pflichtangaben, der Rechnungsaussteller kommt aus dem Absender
  await page.evaluate(async () => {
    wzOeffnen('provision'); await wzdLaden();
    const a = Object.assign(paLeer(), { id: 'pa_t', objekt: 'Testhaus', anschrift: 'Musterweg 7, 74360 Ilsfeld', kaufpreis: '480.000', vertragDatum: '2026-09-15' });
    Object.assign(a.parteien[0], { name: 'Erika Anfragebeispiel', anschrift: 'Testweg 2, 74360 Ilsfeld', rechnungNr: 'PR-2026-001', rechnungDatum: '2026-09-20' });
    await wzdSpeichern('abrechnungen', a); await paOeffnen('pa_t');
  });
  await page.locator('.pa-partei').nth(0).getByRole('button', { name: 'Rechnung', exact: true }).click();
  await expect(page.locator('#report .pa-absender')).toContainText('Musterbank eG');
  await expect(page.locator('#report .wzd-pflicht')).toContainText('Vorstand: Erika Beispiel, Max Probe');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Beratungsausdruck: eine kompakte Zeile in der Fußzeile
  await page.evaluate(() => wzOeffnen('nebenkosten'));
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd-fuss')).toContainText('GnR 123');
  await expect(page.locator('#report .wzd-pflicht')).toHaveCount(0);
  await keineSkriptfehler(page);
});

test('Sicherungserinnerung zählt Kunden, Termine und Werkzeuge, nicht nur Projekte (D48)', async ({ page }) => {
  dialoge(page);
  await objektMitVermarktung(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  await inhalt(dl);
  await page.clock.setFixedTime(new Date(JETZT.getTime() + 20 * 864e5));
  await page.evaluate(async () => { const k = KD_CACHE.find(x => x.id === 'k_a'); k.telefon = '07062 1'; await kdSpeichern(k);
    await wzdSpeichern('termine', { id: 't_neu', art: 'Beratungsgespräch', titel: '', datum: '2026-10-25', kundeIds: [], notiz: '', erinnerung: '0' }); await pjSicherungsHinweis(); });
  await page.evaluate(() => appSetTab('home'));
  await expect(page.locator('#start_pj_backup')).toBeVisible();
  await expect(page.locator('#start_pj_backup')).toContainText('1 Kunde,');
  await expect(page.locator('#start_pj_backup')).toContainText('1 Termin');
  await expect(page.locator('#start_pj_backup')).not.toContainText('Projekte');
  const s = await page.evaluate(async () => ImmoBeratung.datenstand(await dsEingaben(), aufHeute()).liste.find(x => x.id === 'sicherung'));
  expect(s.status).toBe('faellig');
  expect(s.text).toMatch(/^Seit der letzten Sicherung geändert: 1 Kunde, 1 Termin/);
  await keineSkriptfehler(page);
});

test('Auskunft und Löschen beim Kunden erfassen Notarauftrag und Übergabeprotokoll (D48)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_k', anrede: 'Herr', vorname: 'Max', nachname: 'Kaufbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_v', anrede: 'Frau', vorname: 'Erika', nachname: 'Verkaufbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_t', stand: 'Beurkundet', anschrift: 'Musterweg 7, 74360 Ilsfeld', termin: '2026-09-20', kundeId: 'k_v',
      verkaeufer: [Object.assign(noPerson(), { kundeId: 'k_v', name: 'Erika Verkaufbeispiel', anschrift: 'Testweg 2' })],
      kaeufer: [Object.assign(noPerson(), { name: 'Kaufbeispiel, Max', anschrift: 'Probeweg 3, 74001 Probedorf', telefon: '0711 1', familienstand: 'ledig' })] }));
    await iaPut('protokolle', Object.assign(ubLeer(), { id: 'ub_t', anschrift: 'Musterweg 7, 74360 Ilsfeld', uebergeber: 'Erika Verkaufbeispiel', uebernehmer: 'Max Kaufbeispiel',
      unterschrift: { uebergeber: 'data:image/png;base64,AAAA', uebernehmer: 'data:image/png;base64,BBBB' }, abgeschlossen: true }));
    NO.liste = null; UB.liste = null;
  });
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(auskunft).toMatch(/NOTARAUFTRÄGE\n- Musterweg 7, 74360 Ilsfeld: Käufer, Stand Beurkundet, Termin 20\.9\.2026/);
  expect(auskunft).toMatch(/ÜBERGABEPROTOKOLLE\n- .*Musterweg 7, 74360 Ilsfeld: Übernehmer, abgeschlossen; Unterschrift gespeichert/);
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_k'); });
  const n = await page.evaluate(async () => (await iaAlle('notar'))[0]), u = await page.evaluate(async () => (await iaAlle('protokolle'))[0]);
  expect([n.kaeufer[0].name, n.kaeufer[0].anschrift, n.kaeufer[0].telefon, n.kaeufer[0].familienstand]).toEqual(['(Kunde gelöscht)', '', '', '']);
  expect(n.verkaeufer[0].name).toBe('Erika Verkaufbeispiel');
  expect([u.uebernehmer, u.unterschrift.uebernehmer, u.uebergeber, u.unterschrift.uebergeber]).toEqual(['(Kunde gelöscht)', '', 'Erika Verkaufbeispiel', 'data:image/png;base64,AAAA']);
  // Notarauftrag: Person aus der Kundenakte verknüpfen
  await page.evaluate(async () => { wzOeffnen('notar'); await noLaden(); noOeffnenAuftrag('no_t'); });
  await expect(page.locator('.no-person').first()).toContainText('Verknüpft mit der Kundenakte');
  await keineSkriptfehler(page);
});

test('Bodenrichtwerte: Stichtag 01.01.2025, nächster 01.01.2027; Turnus jährlich einstellbar (D48)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('datenstand'));
  const zeile = page.locator('.ds-zeile', { hasText: 'Bodenrichtwerte' });
  await expect(zeile).toContainText('Stand: Stichtag 01.01.2025');
  await expect(zeile).toContainText('Nächste: Stichtag 01.01.2027, veröffentlicht bis 30.06.2027');
  await expect(zeile).toContainText('§ 12 GuAVO BW');
  await page.locator('#ds_brw_turnus').selectOption('jaehrlich');
  await expect(page.locator('.ds-zeile', { hasText: 'Bodenrichtwerte' })).toContainText('Stand: Stichtag 01.01.2026');
  await keineSkriptfehler(page);
});
