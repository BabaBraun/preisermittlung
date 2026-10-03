/* Kachel „Geldwäsche-Prüfung“ im Browser: Vorgang je Verkauf, Personen aus Vorschlag und Kundenakte, Ampeln nach Stand
   (Fahrplan-Stand, angenommenes Gebot, Notarauftrag), Checkliste mit Datum und Kürzel, Datum in der Zukunft, Bestandskunde,
   Ausnahme „eigener Makler“, Abgleich mit dem Notarauftrag samt Warnung beim Übermitteln, nachträgliche Identifizierung,
   Verkaufsfahrplan (FP_AUTO_HOOKS), Löschprüfung, Auskunft und Löschen beim Kunden, keine Daten in Dokumenten für Dritte.
   Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}

/* gesicherte Bewertung „Testhaus“ in Vermarktung, Eigentümerin Erika Verkaufbeispiel aus der Kundenakte */
async function verkauf(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    for (const [id, vn, nn] of [['k_v', 'Erika', 'Verkaufbeispiel'], ['k_e', 'Hans', 'Verkaufbeispiel'], ['k_k', 'Max', 'Kaufbeispiel'], ['k_b', 'Ida', 'Vollmachtbeispiel']])
      await kdSpeichern({ id, anrede: '', vorname: vn, nachname: nn, grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000'; $('ek_kunde_id').value = 'k_v';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}
/* eine fertige Zeile (alle Punkte im Banksystem erledigt) */
const fertig = (seite, rolle, kundeId, o = {}) => ({ id: 'gp_' + kundeId + seite, kundeId, rolle, seite, art: 'person', vertretungArt: '', erforderlich: 'ja', grund: '', maklerFirma: '',
  identifizierung: 'erledigt', datum: '2026-09-20', kuerzel: 'FB', vertretungGeprueft: false, vertretungAm: '', wbAbgeklaert: true, wbAm: '2026-09-20',
  pepImBanksystem: true, pepAm: '2026-09-20', zweck: rolle === 'verkaeufer' ? 'verkauf' : 'eigennutzung', abschluss: true, abschlussAm: '2026-09-21', abschlussKuerzel: 'FB', ...o });

test('Geldwäsche-Prüfung: Personen aus Vorschlag und Kundenakte, Ampeln nach Stand, Checkliste, Zukunftsdatum, Bestandskunde', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await verkauf(page);
  expect(await page.evaluate(() => wzMehrHtml().split(String.fromCharCode(173)).join(''))).toContain('Geldwäsche-Prüfung');
  await page.evaluate(() => wzOeffnen('gwg'));
  await expect(page.locator('#wz_titel')).toContainText('Geldwäsche-Prüfung');
  const karte = page.locator('.gwg-karte', { hasText: 'Testhaus' });
  await expect(karte).toContainText('Verkäufer: bald fällig');
  await expect(karte).toContainText('Käufer: noch nicht fällig');
  await expect(page.locator('#wz_body')).toContainText('§ 16a Abs. 1 GwG');
  await expect(page.locator('#wz_body')).toContainText('nicht in der App festhalten');
  await karte.getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#gw_seite_verkaeufer')).toContainText('bald fällig — Auftrag erteilt oder Maklervertrag abgehakt');
  await expect(page.locator('#gw_seite_kaeufer')).toContainText('noch nicht fällig');
  // Vorschlag: Eigentümerin aus der Bewertung
  const vorschlag = page.locator('.gwg-abgleich', { hasText: 'Eigentümer in der Bewertung' });
  await expect(vorschlag).toContainText('Erika Verkaufbeispiel');
  await vorschlag.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.locator('#gw_z_0')).toContainText('Erika Verkaufbeispiel');
  await expect(page.locator('#wz_gwg_personen_0_zweck')).toHaveValue('verkauf');
  // Käufer aus der Kundenakte wählen
  await page.getByRole('button', { name: 'Käufer hinzufügen', exact: true }).click();
  await expect(page.locator('#kd_titel')).toHaveText('Kunde auswählen');
  await page.locator('#kd_overlay .kd-zeile', { hasText: 'Max Kaufbeispiel' }).click();
  await expect(page.locator('#gw_z_1')).toContainText('Max Kaufbeispiel');
  await expect(page.locator('#kd_overlay')).not.toHaveClass(/\bon\b/);
  // angenommenes Gebot (Kauf ohne Finanzierung): Käuferseite gelb, Hinweis zum Barzahlungsverbot
  await page.evaluate(async pid => { await wzdSpeichern('bieter', { id: 'b_1', projektId: pid, ende: '2026-10-20', status: 'laufend',
    gebote: [{ id: 'g1', kundeId: 'k_k', betrag: 470000, datum: '2026-09-20', status: 'angenommen', finanzierung: 'Kauf ohne Finanzierung' }] }); wzZeichnen(); }, pid);
  await expect(page.locator('#gw_seite_kaeufer')).toContainText('bald fällig — Gebot im Bieterverfahren angenommen');
  await expect(page.locator('#wz_body')).toContainText('Kauf ohne Finanzierung: Den Kaufpreis nur unbar zahlen lassen');
  await expect(page.locator('#gw_z_1')).toHaveClass(/gwg-gelb/);
  // Checkliste der Verkäuferin: Identifizierung mit Datum und Kürzel, Haken mit Datum (heute), Abschluss → grün
  await page.locator('#wz_gwg_personen_0_identifizierung').selectOption('erledigt');
  await page.locator('#wz_gwg_personen_0_datum').fill('2026-09-25');
  await page.locator('#wz_gwg_personen_0_kuerzel').fill('FB');
  await page.locator('#wz_gwg_personen_0_wbAbgeklaert').check();
  await expect(page.locator('#wz_gwg_personen_0_wbAm')).toHaveValue('2026-09-29');
  await page.locator('#wz_gwg_personen_0_pepImBanksystem').check();
  await expect(page.locator('#gw_st_0')).toContainText('Alle Punkte erledigt — Abschluss im Banksystem bestätigen.');
  await page.locator('#wz_gwg_personen_0_abschluss').check();
  await page.locator('#wz_gwg_personen_0_abschlussKuerzel').fill('FB');
  await expect(page.locator('#gw_st_0')).toContainText('Vollständig im Banksystem dokumentiert.');
  await expect(page.locator('#gw_z_0')).toHaveClass(/gwg-gruen/);
  await expect(page.locator('#gw_seite_verkaeufer')).toContainText('alle Personen vollständig');
  // Datum in der Zukunft wird abgelehnt
  await page.locator('#wz_gwg_personen_1_identifizierung').selectOption('erledigt');
  await page.locator('#wz_gwg_personen_1_datum').fill('2026-10-05');
  await expect.poll(() => meldungen.join('\n')).toContain('Ein Datum in der Zukunft ist nicht möglich');
  await expect(page.locator('#wz_gwg_personen_1_datum')).toHaveValue('');
  // Abschluss erst, wenn alles erledigt ist
  await page.locator('#wz_gwg_personen_1_abschluss').click();   // wird abgelehnt, bleibt leer
  await expect.poll(() => meldungen.join('\n')).toContain('Den Abschluss erst bestätigen, wenn alle Punkte erledigt sind');
  await expect(page.locator('#wz_gwg_personen_1_abschluss')).not.toBeChecked();
  // Bestandskunde: Hinweis auf Vermerk und erneute Identifizierung
  await page.locator('#wz_gwg_personen_1_identifizierung').selectOption('frueher');
  await expect(page.locator('#gw_z_1')).toContainText('Bestandskunde: Im Banksystem vermerken');
  await expect(page.locator('#gw_z_1')).toContainText('§ 11 Abs. 3 Satz 2 GwG');
  await page.locator('#wz_gwg_personen_1_datum').fill('2026-09-15');
  await page.locator('#wz_gwg_personen_1_kuerzel').fill('FB');
  await expect(page.locator('#gw_st_1')).toContainText('Handelt auf eigene Rechnung');
  await expect(page.locator('#gw_st_1')).not.toContainText('Identifizierung im Banksystem');
  // gespeichert: nur Kunden-Ids, Status, Datum, Kürzel
  await page.waitForTimeout(600);
  const v = await page.evaluate(async () => (await iaAlle('akten')).find(a => a.art === 'gwg'));
  expect(v.projektId).toBe(pid);
  expect(v.kundeIds).toEqual(['k_v', 'k_k']);
  expect(v.personen.map(z => [z.rolle, z.identifizierung, z.datum, z.kuerzel])).toEqual([['verkaeufer', 'erledigt', '2026-09-25', 'FB'], ['kaeufer', 'frueher', '2026-09-15', 'FB']]);
  expect(JSON.stringify(v)).not.toMatch(/Verkaufbeispiel|Kaufbeispiel/);
  await keineSkriptfehler(page);
});

test('Geldwäsche-Prüfung: Abgleich mit dem Notarauftrag, Warnung beim Übermitteln, nachträglich, Verkaufsfahrplan', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await verkauf(page);
  await page.evaluate(async ({ pid, zv, zk }) => {
    await wzdSpeichern('akten', wzdAkteNeu('gwg', { projektId: pid, kundeIds: ['k_v', 'k_k'], personen: [zv, zk], notarUebermittelt: '', geschaeft: 'kauf', nettokaltmiete: '' }));
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_t', stand: 'Entwurf', anschrift: 'Musterweg 7, 74360 Ilsfeld', projekt: 'Testhaus', finanzierung: 'ja',
      verkaeufer: [Object.assign(noPerson(), { kundeId: 'k_v', name: 'Erika Verkaufbeispiel' }), Object.assign(noPerson(), { name: 'Verkaufbeispiel, Hans' })],
      kaeufer: [Object.assign(noPerson(), { kundeId: 'k_k', name: 'Max Kaufbeispiel' })] }));
    NO.liste = null;
  }, { pid, zv: fertig('verkaeufer', 'verkaeufer', 'k_v'), zk: fertig('kaeufer', 'kaeufer', 'k_k', { identifizierung: 'offen', datum: '', kuerzel: '', abschluss: false, abschlussAm: '', abschlussKuerzel: '' }) });
  expect(await page.evaluate(async pid => { await fpLaden(); return fpAuto(wzdObjekt(pid)).gwg; }, pid)).toBe(false);
  // Notarauftrag: Wechsel von „Entwurf“ auf „An das Notariat übermittelt“ warnt mit den fehlenden Personen, sperrt aber nicht
  await page.evaluate(async () => { wzOeffnen('notar'); await noLaden(); noOeffnenAuftrag('no_t'); });
  await page.locator('#wz_notar_stand').selectOption('An das Notariat übermittelt');
  await expect.poll(() => meldungen.join('\n')).toContain('Noch nicht identifiziert');
  const warnung = meldungen.find(m => m.includes('Noch nicht identifiziert'));
  expect(warnung).toContain('Verkaufbeispiel, Hans (Verkäufer)');
  expect(warnung).toContain('Max Kaufbeispiel (Käufer)');
  expect(warnung).not.toContain('Erika');
  expect(warnung).toContain('§ 10 Abs. 9 GwG');
  expect(await page.evaluate(() => NO.aktiv.stand)).toBe('An das Notariat übermittelt');
  expect(await page.evaluate(() => gwgNotarAmpelHtml(NO.aktiv))).toContain('noch nicht identifiziert');
  // Datenblatt für das Notariat: keine Angaben aus der Geldwäsche-Prüfung
  expect(await page.evaluate(() => noDokument().html)).not.toMatch(/Geldwäsche|identifiziert|Kürzel/);
  // Kachel: beide Seiten rot, Abgleich zeigt fehlende und offene Personen
  await page.evaluate(async pid => { wzOeffnen('gwg'); await gwgOeffnen(pid); }, pid);
  await expect(page.locator('#gw_seite_verkaeufer')).toContainText('Im Notarauftrag, aber nicht identifiziert: Verkaufbeispiel, Hans');
  await expect(page.locator('#gw_seite_kaeufer .wz-ampel')).toHaveClass(/wz-rot/);
  const hans = page.locator('.gwg-abgleich', { hasText: 'Verkaufbeispiel, Hans' });
  await expect(hans).toContainText('fehlt in der Prüfung');
  await expect(page.locator('.gwg-abgleich', { hasText: 'Max Kaufbeispiel' })).toContainText('Identifizierung offen');
  await expect(page.locator('#wz_body')).toContainText('bitte den Tag der Übermittlung eintragen');
  await hans.getByRole('button', { name: 'Aus der Kundenakte zuordnen' }).click();
  await page.locator('#kd_overlay .kd-zeile', { hasText: 'Hans' }).click();
  await expect(page.locator('.gwg-abgleich', { hasText: 'Verkaufbeispiel, Hans' })).toContainText('Identifizierung offen');
  await page.locator('#wz_gwg_notarUebermittelt').fill('2026-09-24');
  // Hans und Max im Banksystem erledigt; Max erst nach der Übermittlung → nachträglich
  await page.evaluate(async () => { const v = GW.aktiv;
    v.personen.forEach(z => Object.assign(z, { identifizierung: 'erledigt', datum: z.kundeId === 'k_k' ? '2026-09-26' : '2026-09-23', kuerzel: 'FB', wbAbgeklaert: true, wbAm: '2026-09-23',
      pepImBanksystem: true, pepAm: '2026-09-23', zweck: z.zweck || 'eigennutzung' }));
    GW.haken = {}; await gwSpeichernSofort(); wzZeichnen(); });
  await expect(page.locator('#wz_body')).toContainText('Alle Personen des Notarauftrags sind in der Prüfung und nicht mehr offen.');
  const max = page.locator('.gwg-zeile', { hasText: 'Max Kaufbeispiel' });
  await expect(max.locator('.gwg-orange')).toContainText('Nachträglich: identifiziert nach der Übermittlung an das Notariat am 24.9.2026');
  await expect(max.locator('.gwg-orange')).toContainText('§ 56 Abs. 1 Satz 1 Nr. 27 GwG');
  expect(await page.evaluate(async pid => { FP.extra = null; await fpLaden(); return fpAuto(wzdObjekt(pid)).gwg; }, pid)).toBe(true);
  expect(await page.evaluate(() => gwgNotarAmpelHtml((NO.liste || []).find(n => n.id === 'no_t')))).toContain('Alle Personen dieses Notarauftrags sind identifiziert');
  // Käuferwechsel im Notarauftrag: neue Person → automatisch wieder rot
  await page.evaluate(async () => { const n = (await iaAlle('notar')).find(x => x.id === 'no_t');
    n.kaeufer.push(Object.assign(noPerson(), { kundeId: 'k_b', name: 'Ida Vollmachtbeispiel' })); await iaPut('notar', n); NO.liste = null; wzZeichnen(); });
  await expect(page.locator('.gwg-abgleich', { hasText: 'Ida Vollmachtbeispiel' })).toContainText('fehlt in der Prüfung');
  await expect(page.locator('#gw_seite_kaeufer .wz-ampel')).toHaveClass(/wz-rot/);
  await keineSkriptfehler(page);
});

test('Geldwäsche-Prüfung: Ausnahme eigener Makler, Einstellungen, Regelwerk AMLR', async ({ page }) => {
  dialoge(page);
  const pid = await verkauf(page);
  await page.evaluate(() => wzOeffnen('gwg'));
  await page.locator('#wz_gwg_einst_gwbName').fill('Ida Musterbeauftragt');
  await page.locator('#wz_gwg_einst_gwbTelefon').fill('07062 0000');
  await expect(page.locator('.gwg-gwb')).toContainText('Ida Musterbeauftragt, Telefon 07062 0000');
  await page.locator('#wz_gwg_einst_regelwerk').selectOption('amlr');
  await expect(page.locator('#wz_body')).toContainText('Die AMLR gilt erst ab 10.07.2027');
  await page.evaluate(async pid => { await wzdSpeichern('bieter', { id: 'b_2', projektId: pid, ende: '2026-10-20', status: 'laufend',
    gebote: [{ id: 'g2', kundeId: 'k_k', betrag: 470000, datum: '2026-09-20', status: 'angenommen' }] }); await gwgOeffnen(pid); }, pid);
  await expect(page.locator('#gw_seite_kaeufer')).toContainText('fällig — Gebot im Bieterverfahren angenommen (Art. 23 Abs. 1 UAbs. 2');
  await page.evaluate(async () => { await gwPersonHinzu('kaeufer', 'kaeufer', 'k_k'); });
  await page.locator('#wz_gwg_personen_0_erforderlich').selectOption('nein');
  await page.locator('#wz_gwg_personen_0_grund').selectOption('makler');
  await expect(page.locator('#gw_st_0')).toContainText('Name der Maklerfirma der Gegenseite');
  await page.locator('#wz_gwg_personen_0_maklerFirma').fill('Beispiel Immobilien GmbH');
  await expect(page.locator('#gw_st_0')).toContainText('nicht erforderlich: Gegenseite hat eigenen Makler (Beispiel Immobilien GmbH)');
  await expect(page.locator('#gw_z_0')).toHaveClass(/gwg-grau/);
  await expect(page.locator('#gw_seite_kaeufer .wz-ampel')).toHaveClass(/wz-gruen/);
  await expect(page.locator('#wz_gwg_personen_0_identifizierung')).toBeHidden();
  // Gesellschaft als Verkäuferin braucht wirtschaftlich Berechtigte und auftretende Person als eigene Zeilen
  await page.evaluate(async () => { await gwPersonHinzu('verkaeufer', 'verkaeufer', 'k_v', { art: 'gesellschaft' }); });
  await expect(page.locator('#gw_st_1')).toContainText('Wirtschaftlich Berechtigte als eigene Zeile erfasst');
  await expect(page.locator('#gw_z_1')).toContainText('mit dem Transparenzregister abgeglichen');
  await page.evaluate(async () => { await gwPersonHinzu('verkaeufer', 'vertreter', 'k_b', { vertretungArt: 'organ' }); await gwPersonHinzu('verkaeufer', 'wb', 'k_e'); });
  await expect(page.locator('#gw_st_1')).not.toContainText('als eigene Zeile erfasst');
  await expect(page.locator('#gw_z_2')).toContainText('Auftretende Person — Verkäuferseite');
  await expect(page.locator('#wz_gwg_personen_2_vertretungArt')).toHaveValue('organ');
  await expect(page.locator('#gw_st_2')).toContainText('Berechtigung der auftretenden Person geprüft');
  await keineSkriptfehler(page);
});

test('Geldwäsche-Prüfung: Auskunft und Löschen beim Kunden, Löschprüfung nach Provision, keine Daten in Dokumenten für Dritte', async ({ page }) => {
  dialoge(page);
  const pid = await verkauf(page);
  await page.evaluate(async ({ pid, zv, zk }) => {
    const v = wzdAkteNeu('gwg', { projektId: pid, kundeIds: ['k_v', 'k_k'], personen: [zv, zk], notarUebermittelt: '', geschaeft: 'kauf', nettokaltmiete: '' });
    v.notiz = 'Freitext darf es nicht geben'; v.personen[1].ausweisNr = 'L01X00T47'; v.personen[1].geburtsdatum = '1980-01-01';
    await wzdSpeichern('akten', v);
  }, { pid, zv: fertig('verkaeufer', 'verkaeufer', 'k_v'), zk: fertig('kaeufer', 'kaeufer', 'k_k', { identifizierung: 'frueher', datum: '2026-09-15', abschluss: false, abschlussAm: '', abschlussKuerzel: '' }) });
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(auskunft).toContain('GELDWÄSCHE-PRÜFUNG\n- Testhaus: Käufer, Identifizierung: bereits früher identifiziert, Vermerk im Banksystem am 15.9.2026 (Kürzel FB)');
  const auskunftV = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_v')))).flat().join('\n'));
  expect(auskunftV).toContain('- Testhaus: Verkäufer, Identifizierung: im Banksystem erledigt am 20.9.2026 (Kürzel FB); im Banksystem vollständig dokumentiert am 21.9.2026 (Kürzel FB)');
  // Öffnen bereinigt fremde Felder (Ausweisdaten, Freitext)
  await page.evaluate(async pid => { wzOeffnen('gwg'); await gwgOeffnen(pid); }, pid);
  const gesp = await page.evaluate(async () => JSON.stringify((await iaAlle('akten')).find(a => a.art === 'gwg')));
  expect(gesp).not.toMatch(/L01X00T47|1980-01-01|Freitext/);
  // die Sicherungserinnerung zählt die Prüfung mit (Speicher „akten“)
  expect((await page.evaluate(async () => pjAenderungenSeit(Date.now() - 1))).text).toContain('Weitere Akten');
  // Vorschlag aus einer anderen Kachel (z. B. „Wer verkauft?“) über GWG_VORSCHLAG_HOOKS
  await page.evaluate(() => { GWG_VORSCHLAG_HOOKS.push(p => [{ kundeId: 'k_b', seite: 'verkaeufer', rolle: 'vertreter', vertretungArt: 'betreuer', quelle: 'Wer verkauft?' }]); wzZeichnen(); });
  const vorschlag = page.locator('.gwg-abgleich', { hasText: 'Wer verkauft?' });
  await expect(vorschlag).toContainText('Ida Vollmachtbeispiel (Auftretende Person, Verkäuferseite · Wer verkauft?)');
  await vorschlag.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.locator('#gw_z_2')).toContainText('Auftretende Person — Verkäuferseite');
  await expect(page.locator('#wz_gwg_personen_2_vertretungArt')).toHaveValue('betreuer');
  await page.evaluate(() => { GWG_VORSCHLAG_HOOKS.length = 0; });
  // Provision eingegangen → Löschprüfung mit Aufbewahrung im Banksystem
  await page.evaluate(async pid => { const a = Object.assign(paLeer(), { id: 'pa_t', projektId: pid, objekt: 'Testhaus', anschrift: 'Musterweg 7, 74360 Ilsfeld', kaufpreis: '480.000', vertragDatum: '2026-09-15' });
    a.parteien.forEach(p => { p.bezahltAm = '2026-09-28'; }); await wzdSpeichern('abrechnungen', a); wzZeichnen(); }, pid);
  await expect(page.locator('#wz_body')).toContainText('Löschprüfung: Der Verkauf ist abgeschlossen (Provision eingegangen am 28.9.2026)');
  await expect(page.locator('#wz_body')).toContainText('bis 31.12.2031, spätestens 31.12.2036');
  // keine Angaben in Dokumenten für Dritte: Eigentümerbericht und Fahrplan-Übersicht
  const dokumente = await page.evaluate(async pid => {
    wzOeffnen('eigentuemerbericht'); ebObjekt(pid); const eb = ebDokument().html;
    await fpLaden(); FP.aktiv = pid; const fp = fpDokument().html; return eb + fp; }, pid);
  expect(dokumente).not.toMatch(/Geldwäsche|identifiziert|Kürzel|PEP/);
  // Löschen beim Kunden: Zeile weg, Auskunft leer, die andere Person bleibt
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_k'); });
  const v = await page.evaluate(async () => (await iaAlle('akten')).find(a => a.art === 'gwg'));
  expect(v.personen.map(z => z.kundeId)).toEqual(['k_v', 'k_b']);
  expect(v.kundeIds).toEqual(['k_v', 'k_b']);
  const nachher = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_k')))).flat().join('\n'));
  expect(nachher).toContain('GELDWÄSCHE-PRÜFUNG\n- keine');
  // Vorgang löschen (Löschprüfung)
  await page.evaluate(async pid => { wzOeffnen('gwg'); await gwgOeffnen(pid); }, pid);
  await page.getByRole('button', { name: 'Löschprüfung: Vorgang löschen' }).click();
  await expect(page.locator('.gwg-karte', { hasText: 'Testhaus' })).toContainText('noch nicht begonnen');
  expect(await page.evaluate(async () => (await iaAlle('akten')).filter(a => a.art === 'gwg').length)).toBe(0);
  await keineSkriptfehler(page);
});
