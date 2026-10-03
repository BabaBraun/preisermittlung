/* D59 im Browser: Kachel „Vermietet verkaufen“ — Mieteinheiten ohne Namen, Vorkaufsrecht mit Fristrechner, Kalender und
   Wiedervorlage, Kündigungssperrfrist nach Gemeinde (KSpVO BW), Eigenbedarf, Kaution und Übergang, Anzeigenprüfung, Posten für
   „Unterlagen“, Schritt im Verkaufsfahrplan, Dokument, Auskunft und Löschen beim Kunden. Nur synthetische Daten; die feste
   Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const feld = (page, pfad) => page.locator('#wz_vermietet_' + pfad.replace(/[^a-zA-Z0-9]/g, '_'));

/* gesicherte Bewertung mit Kunde als Eigentümer */
async function objekt(page, { fall, name, anschrift, status, extra }) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === fall));
  await page.evaluate(async ({ name, anschrift, status, extra }) => {
    await kdSpeichern({ id: 'k_v', anrede: 'Frau', vorname: 'Erika', nachname: 'Verkaufbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_x', anrede: 'Herr', vorname: 'Max', nachname: 'Probe', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    $('ek_anschrift').value = anschrift; $('vm_status').value = status; $('ex_preis').value = '320.000'; $('ek_kunde_id').value = 'k_v';
    for (const [k, v] of Object.entries(extra || {})) $(k).value = v;
    $('pj_name').value = name; compute(); await projektSichern(); await wzdLaden(true);
  }, { name, anschrift, status, extra });
  return page.evaluate(n => pjLoad().find(p => p.name === n).id, name);
}
const wohnung = page => objekt(page, { fall: 'etw_referenz', name: 'Testwohnung', anschrift: 'Musterweg 7, 74072 Heilbronn', status: 'Notartermin',
  extra: { ex_titel: 'Helle Wohnung mit Balkon', ex_frei: 'sofort frei' } });
const fahrplan = (page, pid) => page.evaluate(pid => FP_AUTO_HOOKS.reduce((m, h) => Object.assign(m, h(wzdObjekt(pid)) || {}), {}).vv_vorkauf, pid);
const kalender = (page, pid) => page.evaluate(pid => ({
  termine: wzdListe('termine').filter(t => t.projektId === pid).map(t => [t.datum, t.titel]),
  wv: aufLoad().filter(a => /^Vorkaufsfrist/.test(a.text)).map(a => a.frist),
  kspvo: aufLoad().filter(a => /KSpVO/.test(a.text)).map(a => a.frist) }), pid);

test('Vermietete Wohnung in Heilbronn: Vorkaufsrecht rot bis zur Mitteilung, Fristrechner mit Kalender, Sperrfrist 5 Jahre, Unterlagen, Fahrplan, Dokument (D59)', async ({ page }) => {
  dialoge(page);
  const pid = await wohnung(page);
  await page.evaluate(() => wzOeffnen('vermietet'));
  await expect(page.locator('#wz_body')).toContainText('Noch kein vermietetes Objekt erfasst.');
  await page.locator('#vv_neu').selectOption(pid);
  await expect(page.locator('#wz_body .ub-status')).toHaveText('Testwohnung');
  // Vorbelegung: Wohnung → Wohnungseigentum begründet; Gemeinde aus der Anschrift
  await expect(feld(page, 'we')).toHaveValue('begruendet');
  await expect(page.locator('#wz_body')).toContainText('leer = Heilbronn (aus der Anschrift)');
  await feld(page, 'weAm').fill('2024-05-01');
  await feld(page, 'schonVerkauft').selectOption('nein');
  await feld(page, 'einheiten.0.bez').fill('EG links'); await feld(page, 'einheiten.0.bez').press('Tab');
  await expect(page.locator('.vv-einheit .no-person-kopf b')).toHaveText('EG links');
  await expect(page.locator('#vv_pruefung')).toContainText('Mietbeginn fehlt – Vorkaufsrecht und Sperrfrist nicht prüfbar.');
  await feld(page, 'einheiten.0.ueberlassenAm').fill('2019-04-01');
  await feld(page, 'einheiten.0.kaltmiete').fill('800');
  await feld(page, 'einheiten.0.kaution').fill('3.000');
  await expect(page.locator('#vv_pruefung')).toContainText('Kaution höher als drei Monatsmieten ohne Betriebskosten (§ 551 Abs. 1 BGB).');
  await expect(page.locator('#vv_pruefung')).toContainText('Kaution nicht nachweislich getrennt');
  await feld(page, 'nutzung').selectOption('selbst');
  await expect(page.locator('#vv_pruefung')).toContainText('Mieter hat ein Vorkaufsrecht (§ 577 Abs. 1 Satz 1 BGB).');
  await expect(page.locator('#vv_pruefung')).toContainText('Kündigungssperrfrist von 5 Jahren ab der Umschreibung im Grundbuch (§ 577a Abs. 1 und 2 BGB i. V. m. § 2 KSpVO BW, GBl. 2025 Nr. 146; Gemeinde Heilbronn).');
  await expect(page.locator('#vv_pruefung')).toContainText('tritt mit Ablauf des 31.12.2026 außer Kraft');
  await expect(page.locator('#vv_pruefung .wz-rot')).toContainText('Eigenbedarf erst nach Ablauf der Kündigungssperrfrist von 5 Jahren');
  // Kaufvertrag beurkundet, Mitteilung fehlt → rot
  await feld(page, 'beurkundetAm').fill('2026-09-15');
  await expect(page.locator('#vv_pruefung .wz-rot').first()).toContainText('Mieter hat Vorkaufsrecht – Mitteilung offen.');
  await expect(page.locator('#vv_kpis')).toContainText('Vorkaufsrechthandeln');
  // Mitteilung zugegangen → Frist bis 25.11.2026 mit Countdown, Termin und Wiedervorlage sieben Tage vorher
  await feld(page, 'einheiten.0.mitteilungAm').fill('2026-09-25');
  await expect(page.locator('#vv_pruefung')).toContainText('Vorkaufsfrist läuft bis 25.11.2026 – noch 57 Tage.');
  await expect(page.locator('#vv_pruefung')).toContainText('Zugang der Mitteilung nicht nachgewiesen – Fristbeginn mit Notar klären.');
  await page.evaluate(() => vvAbgleich(VV.aktiv));
  expect(await kalender(page, pid)).toEqual({ termine: [['2026-11-25', 'Ende der Vorkaufsfrist des Mieters (EG links)']], wv: ['2026-11-18'], kspvo: ['2026-12-15'] });
  await expect(page.locator('#vv_frist_0')).toContainText('Ende der Vorkaufsfrist: 25.11.2026 · im Kalender, Wiedervorlage am 18.11.2026');
  expect(await fahrplan(page, pid)).toBe(false);
  // Posten in der Kachel „Unterlagen“
  const ul = await page.evaluate(pid => wzdListe('unterlagen').find(r => r.projektId === pid).zusatz.map(z => [z.key, z.stelle, z.herkunft]), pid);
  expect(ul).toEqual([['vv_kaution', 'eigentuemer', 'Vermietet verkaufen'], ['vv_mieterhoehungen', 'eigentuemer', 'Vermietet verkaufen'],
    ['vv_mitteilung577', 'notariat', 'Vermietet verkaufen'], ['vv_mitteilung566', 'eigentuemer', 'Vermietet verkaufen']]);
  // Anzeigen: „sofort frei“ im Exposé der Bewertung, eingefügter Text
  await expect(page.locator('#wz_body .wz-rot', { hasText: 'Der Text nennt „sofort frei“' })).toBeVisible();
  await page.locator('#vv_anzeige').fill('Vermietete Wohnung mit Mietsteigerungspotenzial');
  await expect(page.locator('#vv_anzeige_ergebnis')).toContainText('Kappungsgrenze 20 % in drei Jahren, in Gebieten nach Landesverordnung 15 % (§ 558 Abs. 3 BGB)');
  // Frist ohne Ausübung abgelaufen → grün, Fahrplan erkennt den Schritt, Termin wandert mit
  await feld(page, 'einheiten.0.zugangsnachweis').selectOption('ja');
  await feld(page, 'einheiten.0.mitteilungAm').fill('2026-07-01');
  await expect(page.locator('#vv_pruefung .wz-gruen').first()).toContainText('Vorkaufsfrist am 1.9.2026 ohne Ausübung abgelaufen (§ 469 Abs. 2 BGB).');
  expect(await fahrplan(page, pid)).toBe(true);
  await page.evaluate(() => vvAbgleich(VV.aktiv));
  expect((await kalender(page, pid)).termine).toEqual([['2026-09-01', 'Ende der Vorkaufsfrist des Mieters (EG links)']]);
  // schriftliche Ausübung → rot, Notarauftrag bekommt den Hinweis
  await feld(page, 'einheiten.0.ausgeuebtAm').fill('2026-08-20');
  await expect(page.locator('#vv_pruefung')).toContainText('E-Mail oder ein Anruf genügt nicht');
  await feld(page, 'einheiten.0.ausuebungSchriftlich').check();
  await expect(page.locator('#vv_pruefung .wz-rot').first()).toContainText('Kauf mit dem Mieter zu den Bedingungen des Käufervertrags zustande gekommen (§ 464 Abs. 2 BGB)');
  expect(await page.evaluate(() => vvNotarHinweis({ anschrift: 'Musterweg 7, 74072 Heilbronn', raeumung: 'vermietet' }))).toContain('wz-rot');
  // Dokument ohne Namen
  await page.getByRole('button', { name: 'Dokument' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Vermietet verkaufen');
  for (const t of ['EG links', '1.4.2019', '800 €', '3.000 €', 'Kündigungssperrfrist', '§ 464 Abs. 2 BGB', 'Ohne Namen der Mieter']) await expect(dok).toContainText(t);
  await expect(dok).not.toContainText('Verkaufbeispiel');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#wz_body .ub-status')).toHaveText('Testwohnung');
  // Liste zeigt den Stand
  await page.locator('#wz_body .ub-kopfzeile').getByRole('button', { name: 'Alle Objekte' }).click();
  await expect(page.locator('#wz_body .kd-karte').first()).toContainText('Vorkaufsrecht: handeln');
  await keineSkriptfehler(page);
});

test('Haus in Beilstein aus dem Notarauftrag: GbR als Käufer (§ 577a Abs. 1a), 3 Jahre, Eigenbedarf, Kautionen-Abgleich, Übergang (D59)', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page, { fall: 'haus_referenz', name: 'Testhaus', anschrift: 'Hauptstraße 3, 71717 Beilstein', status: 'Notartermin' });
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_v', stand: 'Beurkundet', anschrift: 'Hauptstraße 3, 71717 Beilstein', termin: '2026-09-20', uebergabeDatum: '2026-09-25',
      raeumung: 'vermietet', mietverhaeltnisse: '2', kaltmiete: '1.500', kautionen: '4.000' }));
    wzOeffnen('vermietet');
  });
  const karte = page.locator('.mdb-box', { hasText: 'Laut Notarauftrag vermietet' });
  await expect(karte).toContainText('Notarauftrag: vermietet · 2 Mietverhältnisse · Beurkundet');
  await karte.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.locator('#wz_body .ub-status')).toHaveText('Testhaus');
  await expect(page.locator('.vv-einheit')).toHaveCount(2);
  await expect(feld(page, 'beurkundetAm')).toHaveValue('2026-09-20');
  await expect(feld(page, 'uebergabeAm')).toHaveValue('2026-09-25');
  await expect(feld(page, 'we')).toHaveValue('nein');
  await expect(page.locator('#vv_kpis')).toContainText('Vorkaufsrechtin Ordnung');
  await expect(page.locator('#vv_pruefung')).toContainText('Kein Vorkaufsrecht des Mieters: kein Wohnungs- oder Teileigentum und keine Aufteilung geplant');
  // Mieteinheiten
  await feld(page, 'einheiten.0.ueberlassenAm').fill('2015-01-01');
  await feld(page, 'einheiten.1.ueberlassenAm').fill('2023-06-01');
  await feld(page, 'einheiten.0.kaltmiete').fill('800'); await feld(page, 'einheiten.0.kaution').fill('2.000');
  await feld(page, 'einheiten.1.kaltmiete').fill('700'); await feld(page, 'einheiten.1.kaution').fill('1.500');
  await feld(page, 'einheiten.0.getrennt').selectOption('ja'); await feld(page, 'einheiten.1.getrennt').selectOption('ja');
  await expect(page.locator('#vv_pruefung')).toContainText('Summe der Kautionen (3.500 €) weicht vom Notarauftrag ab („Kautionen gesamt“ 4.000 €).');
  // Käufer: GbR, will selbst einziehen → Sperrfrist ab Umschreibung, 3 Jahre (Beilstein nicht in der KSpVO BW)
  await feld(page, 'kaeuferseite').selectOption('gesellschaft');
  await feld(page, 'nutzung').selectOption('selbst');
  await expect(page.locator('#vv_pruefung')).toContainText('Kündigungssperrfrist von 3 Jahren ab der Umschreibung im Grundbuch (§ 577a Abs. 1a BGB; Gemeinde Beilstein).');
  await feld(page, 'umschreibungAm').fill('2026-09-28');
  await expect(page.locator('#vv_pruefung')).toContainText('Kündigungssperrfrist bis 28.9.2029: 3 Jahre ab der Veräußerung am 28.9.2026 (§ 577a Abs. 1a BGB).');
  await expect(page.locator('#vv_pruefung .wz-rot', { hasText: 'Eigenbedarf' })).toContainText('Eigenbedarf erst ab 29.9.2029');
  // nach der Umschreibung: Mitteilung fehlt (gelb), Kaution nicht übertragen (rot); verfrühte Mitteilung (rot)
  await expect(page.locator('#vv_pruefung .wz-gelb', { hasText: '§ 566 Abs. 2 Satz 2 BGB' })).toBeVisible();
  await expect(page.locator('#vv_pruefung .wz-rot', { hasText: '§ 566a Satz 2 BGB' })).toBeVisible();
  await feld(page, 'mitteilungUebergangAm').fill('2026-09-21');
  await expect(page.locator('#vv_pruefung .wz-rot', { hasText: '§ 566e Abs. 1 BGB' })).toBeVisible();
  await feld(page, 'mitteilungUebergangAm').fill('2026-09-29');
  await feld(page, 'kautionUebertragenAm').fill('2026-09-29');
  await expect(page.locator('#vv_pruefung')).toContainText('Mitteilung an den Mieter und Übertragung der Kaution nach der Umschreibung erfasst');
  // Kapitalanlage statt Eigenbedarf
  await feld(page, 'nutzung').selectOption('kapitalanlage');
  await expect(page.locator('#vv_pruefung .wz-gruen', { hasText: 'Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB).' })).toBeVisible();
  // Leer verkaufen
  await feld(page, 'leerVerkaufen').check();
  await expect(page.locator('#vv_pruefung')).toContainText('Verkauf ist kein Kündigungsgrund');
  // ohne Mitteilung kein Kalendereintrag, Unterlagen ohne Nachweis nach § 577 Abs. 2
  await page.evaluate(() => vvAbgleich(VV.aktiv));
  expect((await kalender(page, pid)).termine).toEqual([]);
  expect(await page.evaluate(pid => wzdListe('unterlagen').find(r => r.projektId === pid).zusatz.map(z => z.key), pid)).toEqual(['vv_kaution', 'vv_mieterhoehungen', 'vv_mitteilung566']);
  expect(await fahrplan(page, pid)).toBe(true);
  await keineSkriptfehler(page);
});

test('Auskunft und Löschen beim Kunden, Löschen entfernt Termin und Wiedervorlage (D59)', async ({ page }) => {
  dialoge(page);
  const pid = await wohnung(page);
  await page.evaluate(async pid => {
    await vvNeu(pid);
    Object.assign(VV.aktiv, { weAm: '2024-05-01', schonVerkauft: 'nein', beurkundetAm: '2026-09-15', notiz: 'Eigentümerin wünscht Rückruf' });
    Object.assign(VV.aktiv.einheiten[0], { bez: 'OG rechts', ueberlassenAm: '2018-03-01', kaltmiete: '650', kaution: '1.950', mitteilungAm: '2026-09-28' });
    await wzdSpeichernSofort('akten', VV.aktiv); await vvAbgleich(VV.aktiv); wzZeichnen();
  }, pid);
  expect((await kalender(page, pid)).termine).toEqual([['2026-11-30', 'Ende der Vorkaufsfrist des Mieters (OG rechts)']]);   // 28.11.2026 ist ein Samstag
  const auskunft = id => page.evaluate(async id => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h(id)))).flat().join('\n'), id);
  expect(await auskunft('k_v')).toMatch(/VERMIETET VERKAUFEN\n- Testwohnung: Eigentümer; 1 Mieteinheit ohne Namen der Mieter, Kaufvertrag beurkundet am 15\.9\.2026; gespeichert: Angaben zu Mietverhältnissen, Fristen, Notiz: Eigentümerin wünscht Rückruf/);
  expect(await auskunft('k_x')).toMatch(/VERMIETET VERKAUFEN\n- keine/);
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_v'); });
  const a = await page.evaluate(async () => (await iaAlle('akten')).find(x => x.art === 'vermietet'));
  expect([a.kundeId, a.notiz, a.einheiten[0].bez]).toEqual(['', '', 'OG rechts']);
  expect(await auskunft('k_v')).toMatch(/VERMIETET VERKAUFEN\n- keine/);
  // Löschen der Angaben: Termin und Wiedervorlage zur Frist gehen mit
  await page.evaluate(async () => { await wzdLaden(true); await vvOeffnen((await iaAlle('akten')).find(x => x.art === 'vermietet').id); });
  await page.locator('#wz_body .ub-kopfzeile').getByRole('button', { name: 'Löschen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Noch kein vermietetes Objekt erfasst.');
  expect(await page.evaluate(async () => (await iaAlle('akten')).filter(x => x.art === 'vermietet').length)).toBe(0);
  const k = await kalender(page, pid);
  expect([k.termine, k.wv]).toEqual([[], []]);
  await keineSkriptfehler(page);
});
