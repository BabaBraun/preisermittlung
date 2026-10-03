/* Kachel „Tipps“ im Browser: Tippgeber-Liste, Tipp mit neuem Kunden, Ampeln der Datenschutzinformation (Art. 14 Abs. 3 DSGVO),
   Rückmeldung ohne Kundendaten, Akquise-Eintrag anlegen und verknüpfen, Auswertung je Filiale und Quartal ohne Namen,
   Auskunft und Löschen beim Kunden. Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const GEBER = [{ id: 'tg_e', name: 'Erika Beispiel', filiale: 'Filiale Musterstadt', art: 'kundenberater', email: 'erika.beispiel@example.org' },
  { id: 'tg_m', name: 'Max Probe', filiale: 'Filiale Musterstadt', art: 'baufinanzierung', email: '' },
  { id: 'tg_i', name: 'Ida Muster', filiale: 'Filiale Beispielort', art: 'kundenberater', email: '' }];
async function geberAnlegen(page) {
  await page.evaluate(g => { tpS().geber = JSON.parse(JSON.stringify(g)); wzSpeichernJetzt(); }, GEBER);
}

test('Tipp: Tippgeber, neuer Kunde, Ampeln der Datenschutzinformation, Rückmeldung ohne Kundendaten', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('tipps'));
  await page.locator('#wz_body .ka-schalter button', { hasText: 'Tippgeber' }).click();
  await page.getByRole('button', { name: 'Tippgeber hinzufügen' }).click();
  await page.locator('#wz_tipps_geber_0_name').fill('Erika Beispiel');
  await page.locator('#wz_tipps_geber_0_filiale').fill('Filiale Musterstadt');
  await page.locator('#wz_tipps_geber_0_email').fill('erika.beispiel@example.org');
  await page.getByRole('button', { name: 'Tippgeber hinzufügen' }).click();
  await page.locator('#wz_tipps_geber_1_name').fill('Max Probe');
  await page.locator('#wz_tipps_geber_1_filiale').fill('Filiale Musterstadt');
  await page.locator('#wz_tipps_geber_1_art').selectOption('baufinanzierung');
  await expect(page.locator('#wz_body')).toContainText('nie je Person');
  await page.locator('#wz_body .ka-schalter button', { hasText: 'Tipps' }).click();
  await page.getByRole('button', { name: 'Neuer Tipp' }).click();
  // ohne Tippgeber: rot (Quelle gehört in die Information)
  await expect(page.locator('#tp_pruefung .wz-rot').first()).toContainText('Tippgeber fehlt');
  await page.locator('#tp_geber').selectOption({ label: 'Erika Beispiel — Filiale Musterstadt, Kundenberater' });
  await expect(page.locator('#tp_pruefung')).not.toContainText('Tippgeber fehlt');
  await page.locator('#tp_geber').selectOption('');
  await expect(page.locator('#tp_pruefung')).toContainText('Tippgeber fehlt');
  await page.locator('#tp_geber').selectOption({ label: 'Erika Beispiel — Filiale Musterstadt, Kundenberater' });
  await expect(page.locator('#tp_ds .wz-gelb')).toContainText('spätestens 29.10.2026');
  await expect(page.locator('#tp_ds')).toContainText('Art. 14 Abs. 3 lit. a');
  // Kunde neu in der Kundenakte
  await page.getByRole('button', { name: 'Neu erfassen' }).click();
  await page.locator('#tp_kn_vorname').fill('Ida');
  await page.locator('#tp_kn_nachname').fill('Tippbeispiel');
  await page.getByRole('button', { name: 'In der Kundenakte anlegen' }).click();
  await expect(page.locator('#wz_body .kd-karte').first()).toContainText('Ida Tippbeispiel');
  expect(await page.evaluate(() => KD_CACHE.filter(k => k.nachname === 'Tippbeispiel').map(k => k.grundlage + '|' + (k.einwilligungAm || '')))).toEqual(['vertrag|']);
  // geplanter Kontakt zieht die Frist vor, Kontakt ohne Information ist rot
  await page.locator('#wz_tipps_kontaktGeplant').fill('2026-10-05');
  await expect(page.locator('#tp_ds .wz-gelb')).toContainText('spätestens 5.10.2026');
  await expect(page.locator('#tp_ds')).toContainText('lit. b');
  await page.locator('#tp_stand').selectOption('kontakt');
  await expect(page.locator('#tp_ds .wz-rot')).toContainText('Kontakt am 29.9.2026 eingetragen, aber keine Datenschutzinformation');
  await expect(page.locator('#wz_tipps_ersterKontaktAm')).toHaveValue('2026-09-29');
  await page.locator('#wz_tipps_dsinfo_erteiltAm').fill('2026-09-29');
  await expect(page.locator('#tp_ds .wz-gelb')).toContainText('Weg und Version des Vordrucks');
  await page.locator('#wz_tipps_dsinfo_weg').selectOption('E-Mail');
  await page.locator('#wz_tipps_dsinfo_version').fill('DSI Immobilien 01/2026');
  await expect(page.locator('#tp_ds .wz-gruen')).toContainText('am 29.9.2026 erteilt (E-Mail, DSI Immobilien 01/2026)');
  await expect(page.locator('#tp_pruefung')).toContainText('Bankgeheimnis');
  await page.locator('#wz_tipps_einverstandenAm').fill('2026-09-28');
  await expect(page.locator('#tp_pruefung .wz-gruen')).toHaveCount(2);
  await expect(page.locator('#tp_pruefung .wz-rot')).toHaveCount(0);
  // „bereits informiert“ braucht eine Fundstelle
  await page.locator('#wz_tipps_dsinfo_bereitsInformiert').check();
  await expect(page.locator('#tp_ds .wz-gelb')).toContainText('Fundstelle eintragen');
  await page.locator('#wz_tipps_dsinfo_fundstelle').fill('Datenschutzinformation der Bank 2025');
  await expect(page.locator('#tp_ds .wz-gruen')).toContainText('Art. 14 Abs. 5 lit. a');
  await page.locator('#wz_tipps_dsinfo_bereitsInformiert').uncheck();
  // Rückmeldung an den Tippgeber: nur Stand, ohne Kunde
  await expect(page.locator('#tp_rueck_text')).toContainText('Guten Tag Erika Beispiel,');
  await expect(page.locator('#tp_rueck_text')).toContainText('Zum Stand: Ich habe Kontakt aufgenommen.');
  await expect(page.locator('#tp_rueck')).toContainText('steht aus');
  const mail = await page.evaluate(() => decodeURIComponent(tpMailLink()));
  expect(mail).toMatch(/^mailto:erika\.beispiel@example\.org\?subject=Ihr Tipp vom 29\.9\.2026: Kontakt aufgenommen&body=Guten Tag Erika Beispiel,/);
  expect(mail).not.toContain('Tippbeispiel');
  await page.getByRole('button', { name: 'Kopieren' }).click();
  await expect(page.locator('#tp_rueck .wz-gruen')).toContainText('Rückmeldung zum Stand „Kontakt aufgenommen“ am 29.9.2026 gegeben');
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  expect(kopiert).toContain('Betreff: Ihr Tipp vom 29.9.2026');
  expect(kopiert).not.toContain('Tippbeispiel');
  await expect(page.locator('#wz_body .vg-verlauf')).toContainText('Rückmeldung an den Tippgeber (kopiert): Kontakt aufgenommen');
  // gespeichert im Speicher „akten“: Kunde nur als Id
  const t = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 600)); return (await iaAlle('akten')).filter(a => a.art === 'tipp'); });
  expect(t).toHaveLength(1);
  expect(t[0].kundeId).toMatch(/^k/);
  expect(JSON.stringify(t[0])).not.toContain('Tippbeispiel');
  expect([t[0].stand, t[0].stufe, t[0].geberId, t[0].quelle.filiale, t[0].dsinfo.weg]).toEqual(['kontakt', 1, expect.any(String), 'Filiale Musterstadt', 'E-Mail']);
  // Liste: Karte mit Chips
  await page.getByRole('button', { name: 'Alle Tipps' }).click();
  await expect(page.locator('#wz_body .kd-karte').first()).toContainText('Ida Tippbeispiel — Verkaufsabsicht');
  await expect(page.locator('#wz_body .kd-karte').first()).toContainText('Datenschutzinfo erledigt');
  await keineSkriptfehler(page);
});

test('Tipp: Akquise-Kontakt anlegen, zurück verknüpfen, Stand aus der Akquise übernehmen', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await geberAnlegen(page);
  const id = await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_t', anrede: 'Frau', vorname: 'Erika', nachname: 'Verkaufsbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await wzdLaden(); const t = tpLeer({ datum: '2026-09-20', geberId: 'tg_i', kundeId: 'k_t' }); await wzdSpeichern('akten', t); return t.id; });
  await page.evaluate(async id => { wzOeffnen('tipps'); await tpOeffnen(id); }, id);
  await page.getByRole('button', { name: 'Akquise-Kontakt anlegen' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Akquise');
  await expect(page.locator('#wz_body')).toContainText('Neuer Eigentümer-Kontakt');
  await expect(page.locator('#wz_body')).toContainText('Erika Verkaufsbeispiel');
  await expect(page.locator('#wz_akquise_notiz')).toHaveValue('Tipp vom 20.9.2026 aus Filiale Beispielort');
  await page.locator('#wz_body .ub-kopfzeile').getByRole('button', { name: 'Anlegen' }).click();
  await page.locator('#vg_status').selectOption('Auftrag erteilt');
  const v = await page.evaluate(() => wzdListe('vorgaenge').map(x => [x.typ, x.kundeId, x.quelle, x.anlass, x.datum]));
  expect(v).toEqual([['akquise', 'k_t', 'Filiale', 'Verkauf geplant', '2026-09-20']]);
  // zurück in „Tipps“: der neue Eintrag ist verknüpft, der Stand lässt sich übernehmen
  await page.evaluate(() => wzOeffnen('tipps'));
  await expect(page.locator('#wz_body')).toContainText('Akquise vom 20.9.2026 · Auftrag erteilt');
  await expect(page.locator('#wz_body')).toContainText('Dort ist der Stand weiter');
  await page.getByRole('button', { name: 'Stand „Auftrag“ übernehmen' }).click();
  await expect(page.locator('#tp_stand')).toHaveValue('auftrag');
  await expect(page.locator('#wz_body')).not.toContainText('Dort ist der Stand weiter');
  await expect(page.locator('#wz_body .vg-verlauf')).toContainText('Akquise-Kontakt angelegt');
  await expect(page.locator('#wz_body .vg-verlauf')).toContainText('Stand: Auftrag');
  // Kaufwunsch führt zur Anfrage in „Interessenten“
  await page.locator('#wz_tipps_tippArt').selectOption('kauf');
  await expect(page.getByRole('button', { name: 'Anfrage anlegen' })).toBeVisible();
  await keineSkriptfehler(page);
});

test('Tipps: Auswertung je Filiale und Quartal ohne Namen, Hinweis bei nur einem Tippgeber, Dokument', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await geberAnlegen(page);
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_1', vorname: 'Anna', nachname: 'Kundenbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await wzdLaden();
    const ds = { erteiltAm: '2026-01-01', weg: 'Post', version: 'V1', bereitsInformiert: false, fundstelle: '' };
    for (const x of [
      { datum: '2026-02-10', geberId: 'tg_e', stand: 'verkauf', stufe: 4, dsinfo: ds, kundeId: 'k_1' },
      { datum: '2026-05-10', geberId: 'tg_m', stand: 'kein', stufe: 2, dsinfo: ds },
      { datum: '2026-08-01', geberId: 'tg_i', stand: 'auftrag', stufe: 3, tippArt: 'bewertung', dsinfo: ds },
      { datum: '2026-09-15', geberId: 'tg_i', stand: 'neu', stufe: 0 },
      { datum: '2026-08-20', geberId: 'tg_e', stand: 'neu', stufe: 0 },
      { datum: '2025-11-03', geberId: 'tg_e', stand: 'auftrag', stufe: 3, dsinfo: ds }])
      await wzdSpeichern('akten', tpLeer(x));
  });
  await page.evaluate(() => { wzOeffnen('tipps'); tpSetz('ansicht', 'liste'); });
  // 20.08.2026 ohne Information: Frist am 20.09.2026 abgelaufen
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Datenschutzinfo fehlt1');
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Aufträge 20262');
  await page.locator('#wz_body .ka-schalter button', { hasText: 'Auswertung' }).click();
  await page.locator('#tp_jahr').selectOption('2026');
  const tab = page.locator('#wz_body .mdb-box', { hasText: 'Je Filiale — Jahr 2026' }).locator('tbody tr');
  await expect(tab).toHaveCount(3);
  await expect(tab.nth(0)).toHaveText(/Filiale Beispielort \*\s*2\s*1\s*1\s*1\s*0\s*0\s*50 %/);
  await expect(tab.nth(1)).toHaveText(/Filiale Musterstadt\s*3\s*2\s*2\s*1\s*1\s*1\s*33 %/);
  await expect(tab.nth(2)).toHaveText(/Summe\s*5\s*3\s*3\s*2\s*1\s*1\s*40 %/);
  const quartal = page.locator('#wz_body .mdb-box', { hasText: 'Je Quartal 2026' }).locator('tbody tr').nth(1);
  await expect(quartal).toContainText('1 1 Auftrag · 1 Verkauf');
  await expect(page.locator('#wz_body')).toContainText('Nur ein Tippgeber in dieser Filiale');
  await expect(page.locator('#wz_body .mdb-box', { hasText: 'Nach Art des Tippgebers' })).toContainText('Baufinanzierung');
  for (const n of ['Erika Beispiel', 'Max Probe', 'Ida Muster', 'Kundenbeispiel']) await expect(page.locator('#wz_body')).not.toContainText(n);
  await page.locator('#tp_quartal').selectOption('3');
  await expect(page.locator('#wz_body .wz-kpis').last()).toContainText('Tipps33. Quartal 2026');
  await page.locator('#tp_quartal').selectOption('0');
  await page.getByRole('button', { name: 'Dokument' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Tipps aus Filialen und von Partnern');
  for (const t of ['Filiale Musterstadt', 'Filiale Beispielort', 'Je Quartal 2026', 'Nur ein Tippgeber']) await expect(dok).toContainText(t);
  for (const n of ['Erika Beispiel', 'Max Probe', 'Ida Muster', 'Kundenbeispiel']) await expect(dok).not.toContainText(n);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#wz_overlay')).toHaveClass(/on/);
  await keineSkriptfehler(page);
});

test('Tipps beim Kunden: Akte, Auskunft mit Herkunft der Daten, Löschen entfernt den Personenbezug', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await geberAnlegen(page);
  const id = await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_l', anrede: 'Herr', vorname: 'Max', nachname: 'Löschbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await wzdLaden();
    const t = tpLeer({ datum: '2026-09-15', geberId: 'tg_e', kundeId: 'k_l', einverstandenAm: '2026-09-14', ersterKontaktAm: '2026-09-18', weitergabeAm: '2026-09-20', weitergabeAn: 'Baufinanzierung',
      dsinfo: { erteiltAm: '2026-09-17', weg: 'ausgehändigt', version: 'DSI 01/2026', bereitsInformiert: false, fundstelle: '' }, stand: 'termin', stufe: 2, notiz: 'möchte bis Frühjahr verkaufen' });
    await wzdSpeichern('akten', t); return t.id; });
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_l')))).flat().join('\n'));
  expect(auskunft).toContain('TIPPS (HINWEISE AUS FILIALEN UND VON PARTNERN)\n- 15.9.2026 Verkaufsabsicht — Herkunft der Daten: Erika Beispiel, Filiale Musterstadt, Kundenberater; '
    + 'Einverständnis mit der Kontaktaufnahme: 14.9.2026; Datenschutzinformation: erteilt am 17.9.2026, ausgehändigt, DSI 01/2026; erster Kontakt am 18.9.2026; '
    + 'weitergegeben am 20.9.2026 an Baufinanzierung; Stand: Termin; Notiz: möchte bis Frühjahr verkaufen');
  // in der Kundenakte: Abschnitt „Tipps“ mit Quelle, „Öffnen“ führt in die Kachel
  await page.evaluate(() => kdOeffnen('k_l'));
  await expect(page.locator('#kd_inhalt')).toContainText('Quelle: Erika Beispiel, Filiale Musterstadt, Kundenberater · Termin');
  await page.locator('#kd_inhalt .kd-karte', { hasText: 'Tipp vom 15.9.2026' }).getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#tp_stand')).toHaveValue('termin');
  await page.evaluate(() => wzSchliessen());
  // Kunde löschen (wie in der Akte): Tipp bleibt für die Auswertung, ohne Personenbezug
  await page.evaluate(() => kdLoeschen('k_l'));
  await expect.poll(() => page.evaluate(() => KD_CACHE.some(k => k.id === 'k_l'))).toBe(false);
  const t = await page.evaluate(async id => (await iaAlle('akten')).find(a => a.id === id), id);
  expect([t.kundeId, t.notiz, t.einverstandenAm, t.ersterKontaktAm, t.weitergabeAn, t.dsinfo.erteiltAm, t.dsinfo.version, t.kundeGeloescht]).toEqual(['', '', '', '', '', '', '', '2026-09-29']);
  expect([t.datum, t.tippArt, t.stand, t.quelle.filiale]).toEqual(['2026-09-15', 'verkauf', 'termin', 'Filiale Musterstadt']);
  expect(t.verlauf.map(h => h.text)).toEqual(['Tipp erfasst', 'Kunde gelöscht']);
  const nachher = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_l')))).flat().join('\n'));
  expect(nachher).toContain('TIPPS (HINWEISE AUS FILIALEN UND VON PARTNERN)\n- keine');
  await page.evaluate(async id => { wzOeffnen('tipps'); await tpOeffnen(id); }, id);
  await expect(page.locator('#tp_pruefung')).toContainText('Kunde am 29.9.2026 gelöscht');
  await expect(page.locator('#wz_body')).not.toContainText('Löschbeispiel');
  const a = await page.evaluate(() => tpAuswertungDaten().summe.gesamt.tipps);
  expect(a).toBe(1);
  await keineSkriptfehler(page);
});
