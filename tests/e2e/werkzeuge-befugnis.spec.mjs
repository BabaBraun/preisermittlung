/* Kachel „Wer verkauft?“ im Browser: Einstiegsfragen, Erbengemeinschaft mit minderjährigem Miterben, Genehmigungskette mit
   Rechtskraft und Mitteilung, Posten in „Unterlagen“, Betreuer und Ehegatte aus dem Notarauftrag, Testamentsvollstrecker aus
   Abt. II, Wiedervorlage zum Erbfall, Dokument für das Notariat, Auskunft und Löschen beim Kunden. Nur synthetische Daten;
   die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const KUNDEN = [['k_e1', 'Erika', 'Erbebeispiel'], ['k_e2', 'Max', 'Erbebeispiel'], ['k_kind', 'Lena', 'Kindbeispiel'], ['k_mutter', 'Eva', 'Mutterbeispiel'],
  ['k_betreuer', 'Bernd', 'Betreuerbeispiel'], ['k_tv', 'Tim', 'Vollstreckerbeispiel']];

/* gesicherte Bewertung „Nachlasshaus“ in Vermarktung; felder: zusätzliche Felder der Bewertung */
async function objekt(page, felder = {}) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async ({ kunden, felder }) => {
    let n = 1; for (const [id, vn, nn] of kunden) await kdSpeichern({ id, anrede: '', vorname: vn, nachname: nn, grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: n++ });
    $('ek_anschrift').value = 'Musterweg 9, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('vm_start').value = '2026-09-01';
    for (const [k, v] of Object.entries(felder)) $(k).value = v;
    $('pj_name').value = 'Nachlasshaus'; compute(); await projektSichern(); await wzdLaden(true);
  }, { kunden: KUNDEN, felder });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Nachlasshaus').id);
}
const feld = (page, pfad) => page.locator('#wz_befugnis_' + pfad.replace(/[^a-zA-Z0-9]/g, '_'));
const gesamt = page => page.locator('#bf_gesamt');
const zusatz = (page, pid) => page.evaluate(pid => ((wzdListe('unterlagen').find(u => u.projektId === pid) || {}).zusatz || []).map(z => [z.key, z.stelle, z.name]), pid);
const stand = (page, pid, key) => page.evaluate(({ pid, key }) => (((wzdListe('unterlagen').find(u => u.projektId === pid) || {}).posten || {})[key] || {}).stand || 'offen', { pid, key });

test('Erbengemeinschaft mit minderjährigem Miterben: Fragen, Ampeln, Posten in „Unterlagen“, Genehmigungskette bis Grün, Dokument', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await page.evaluate(() => wzOeffnen('befugnis'));
  await expect(page.locator('#wz_body .kd-karte', { hasText: 'Nachlasshaus' })).toContainText('noch nicht geprüft');
  await page.locator('#wz_body .kd-karte', { hasText: 'Nachlasshaus' }).getByRole('button', { name: 'Prüfen' }).click();
  await expect(gesamt(page)).toContainText('Rot:');
  await expect(page.locator('#wz_body')).toContainText('Frage 1 beantworten');
  // Einstiegsfragen
  await feld(page, 'eigentuemer').selectOption('verstorben');
  await feld(page, 'erben').selectOption('mehrere');
  await feld(page, 'tv').selectOption('nein');
  await feld(page, 'nacherbfolge').selectOption('nein');
  await expect(page.locator('#wz_body')).toContainText('Alle Miterben aus der Kundenakte erfassen.');
  await expect(page.locator('#wz_body')).toContainText('nur seinen Erbteil beim Notar; dann haben die anderen zwei Monate ein Vorkaufsrecht (§ 2040 Abs. 1, § 2033, § 2034 BGB)');
  // Miterbe 1 über die Kundenakte wählen, die übrigen direkt
  await page.getByRole('button', { name: 'Miterbe aus der Kundenakte' }).click();
  await page.locator('#kd_overlay .kd-zeile', { hasText: 'Erika Erbebeispiel' }).click();
  await expect(page.locator('#kd_overlay')).not.toHaveClass(/on/);
  await expect(page.locator('.bf-person').first()).toContainText('Miterbe: Erika Erbebeispiel');
  await page.evaluate(() => { bfPersonNeu('k_e2'); bfPersonNeu('k_kind'); });
  await expect(page.locator('.bf-person')).toHaveCount(3);
  for (const i of [0, 1, 2]) await feld(page, 'personen.' + i + '.einverstanden').selectOption('ja');
  await feld(page, 'personen.2.vertretung').selectOption('eltern');
  await expect(page.locator('#wz_body')).toContainText('Miterbe 3 (Lena Kindbeispiel): Vertreter aus der Kundenakte wählen');
  await page.evaluate(() => bfVertreterNeu(2, 'k_mutter'));
  await feld(page, 'personen.2.sorge').selectOption('allein');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Eva Mutterbeispiel');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Minderjähriger Miterbe');
  // Nachweis: Europäisches Nachlasszeugnis, läuft in 21 Tagen ab → Gelb
  await feld(page, 'nachweis').selectOption('enz');
  await expect(page.locator('#wz_body')).toContainText('Pflichtfeld „gültig bis“');
  await feld(page, 'enzBis').fill('2026-10-20');
  await expect(page.locator('#wz_body')).toContainText('läuft am 20.10.2026 ab');
  await expect(gesamt(page)).toContainText('Gelb:');
  await expect(gesamt(page)).toContainText('schwebend unwirksam');
  // Posten stehen in „Unterlagen“ (ohne Namen)
  const p3 = await page.evaluate(() => BF.aktiv.personen[2].id);
  await expect.poll(async () => (await zusatz(page, pid)).map(z => z[0] + ':' + z[1]).sort()).toEqual(
    ['bf_enz:nachlassgericht', 'bf_' + p3 + '_alleinsorge:eigentuemer', 'bf_' + p3 + '_gen:familiengericht', 'bf_' + p3 + '_rk:familiengericht'].sort());
  expect((await zusatz(page, pid)).map(z => z[2]).join(' ')).not.toMatch(/Beispiel/);
  // Genehmigungskette: Antrag, Beschluss, Bekanntgabe, Aufforderung des Käufers
  await feld(page, 'personen.2.gen.beantragt').fill('2026-09-01');
  await expect.poll(() => stand(page, pid, 'bf_' + p3 + '_gen')).toBe('angefordert');
  await feld(page, 'personen.2.gen.beschluss').fill('2026-09-20');
  await feld(page, 'personen.2.gen.bekanntgabe').fill('2026-09-22');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Frühestens rechtskräftig nach Ablauf des 6.10.2026');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Beschwerdefrist endet am 6.10.2026');
  await expect.poll(() => stand(page, pid, 'bf_' + p3 + '_gen')).toBe('da');
  await feld(page, 'personen.2.gen.aufforderung').fill('2026-08-10');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Mitteilung an den Käufer spätestens am 10.10.2026');
  await expect(page.locator('.bf-person').nth(2).locator('.wz-rot')).toContainText('sonst gilt die Genehmigung als verweigert (§ 1856 Abs. 2 BGB i. V. m. § 1644 Abs. 3 BGB)');
  await expect(gesamt(page)).toContainText('Rot:');
  await page.locator('.bf-person').nth(2).getByRole('button', { name: 'Wiedervorlage' }).click();
  expect(await page.evaluate(() => aufLoad().some(a => /Genehmigung des Familiengerichts \(Miterbe 3\) dem Käufer mitteilen/.test(a.text) && a.frist === '2026-09-29'))).toBe(true);
  // Rechtskraftzeugnis liegt vor, Mitteilung erfolgt, Nachweise liegen vor → Grün
  await page.locator('.bf-person').nth(2).getByLabel('Stand: Rechtskraftzeugnis').selectOption('da');
  await feld(page, 'personen.2.gen.mitgeteilt').fill('2026-09-28');
  await expect(page.locator('.bf-person').nth(2)).toContainText('Genehmigung rechtskräftig und dem Käufer am 28.9.2026 mitgeteilt.');
  await feld(page, 'enzBis').fill('2026-12-31');
  await page.getByLabel('Stand: Europäisches Nachlasszeugnis (beglaubigte Abschrift)').selectOption('da');
  await page.getByLabel('Stand: Nachweis der Alleinsorge (Miterbe 3)').selectOption('da');
  await expect(gesamt(page)).toContainText('Grün:');
  await expect(page.locator('.wz-kpis').first()).toContainText('4 von 4');
  expect(await page.evaluate(pid => bfAmpel(pid).stufe, pid)).toBe('gruen');
  // Kachel „Unterlagen“ zeigt die Posten mit demselben Stand
  await page.getByRole('button', { name: 'In „Unterlagen“ öffnen' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Unterlagen');
  const gruppe = name => page.locator('.ul-gruppe').filter({ has: page.locator('h4', { hasText: new RegExp('^' + name + '$') }) });
  const fam = gruppe('Familiengericht');
  await expect(fam).toContainText('Genehmigung des Familiengerichts (Miterbe 3)');
  await expect(fam).toContainText('Rechtskraftzeugnis zur Genehmigung (Miterbe 3)');
  await expect(gruppe('Nachlassgericht')).toContainText('Europäisches Nachlasszeugnis');
  await expect(gruppe('Eigentümer')).toContainText('Nachweis der Alleinsorge (Miterbe 3)');
  // Dokument für das Notariat: Vertretene und Vertreter getrennt
  await page.evaluate(async pid => { wzOeffnen('befugnis'); await bfOeffnen(pid); }, pid);
  await page.getByRole('button', { name: 'Für das Notariat' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Verkäuferseite');
  for (const t of ['Erbengemeinschaft', 'Eltern für Minderjährige', 'Lena Kindbeispiel', 'Eva Mutterbeispiel', 'minderjährig, vertreten durch die Eltern',
    'Genehmigung des Familiengerichts — Miterbe 3', 'frühestens rechtskräftig nach Ablauf des', '6.10.2026', 'Familiengericht']) await expect(dok).toContainText(t);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Wer verkauft?');
  await keineSkriptfehler(page);
});

test('Betreuer und Ehegatte aus dem Notarauftrag, Enddatum des Nachlasszeugnisses gegen Beurkundungstermin, Löschen entfernt die Posten', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page, { ek_kunde_id: 'k_e1' });
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_bf', anschrift: 'Musterweg 9, 74360 Ilsfeld', termin: '2026-11-20', kaufpreis: '380.000',
      verkaeufer: [Object.assign(noPerson(), { kundeId: 'k_e1', name: 'Erika Erbebeispiel', familienstand: 'verheiratet', gueterstand: 'Gütergemeinschaft' })] }));
    wzOeffnen('befugnis');
  });
  await page.locator('#wz_body .kd-karte', { hasText: 'Nachlasshaus' }).getByRole('button', { name: 'Prüfen' }).click();
  await expect(page.locator('.wz-kpis').first()).toContainText('20.11.2026');
  await feld(page, 'eigentuemer').selectOption('lebt');
  // Kunde der Bewertung steht schon als Eigentümer da
  await expect(page.locator('.bf-person').first()).toContainText('Eigentümer: Erika Erbebeispiel');
  // Ehegatte: Güterstand aus dem Notarauftrag → Einwilligung als Posten
  await expect(page.locator('.bf-person').first()).toContainText('im Notarauftrag: verheiratet');
  await expect(page.locator('.bf-person').first()).toContainText('Gütergemeinschaft — jede Verfügung über ein Grundstück des Gesamtguts braucht die Einwilligung des Ehegatten (§ 1424 Satz 1 BGB)');
  await expect(page.locator('#wz_body')).toContainText('Einwilligung des Ehegatten (Eigentümer)');
  await expect(page.locator('#wz_body')).toContainText('nur für die Gesundheitssorge');
  // Betreuer
  await feld(page, 'personen.0.vertretung').selectOption('betreuer');
  await page.evaluate(() => bfVertreterNeu(0, 'k_betreuer'));
  await feld(page, 'personen.0.aufgabenkreis').selectOption('nein');
  const p1 = page.locator('.bf-person').first();
  await expect(p1.locator('.wz-rot')).toContainText('Der Aufgabenkreis umfasst den Verkauf nicht');
  await expect(p1).toContainText('Keine Angaben zu Krankheit oder Gründen der Betreuung');
  await feld(page, 'personen.0.aufgabenkreis').selectOption('ja');
  await feld(page, 'personen.0.wohnt').check();
  await expect(p1).toContainText('dem Betreuungsgericht unverzüglich anzeigen (§ 1833 Abs. 2 BGB)');
  await expect(p1).toContainText('§ 1833 Abs. 3 Satz 1 Nr. 4 BGB');
  await feld(page, 'personen.0.vorlaeufigBis').fill('2026-11-01');
  await expect(p1).toContainText('Die vorläufige Betreuung endet am 1.11.2026, vor dem Beurkundungstermin am 20.11.2026');
  await feld(page, 'personen.0.kaeuferNahe').check();
  await expect(p1.locator('.wz-rot')).toContainText('Ergänzungsbetreuer nötig');
  await expect(page.locator('#wz_body')).toContainText('Provision: Der Anspruch entsteht erst mit dem wirksamen Kaufvertrag');
  const p0 = await page.evaluate(() => BF.aktiv.personen[0].id);
  await expect.poll(async () => (await zusatz(page, pid)).map(z => z[0]).sort()).toEqual(
    ['bf_' + p0 + '_bestellung', 'bf_' + p0 + '_ehegatte', 'bf_' + p0 + '_gen', 'bf_' + p0 + '_rk'].sort());
  // Verstorben + Nachlasszeugnis bis vor dem Termin: Rot
  await feld(page, 'eigentuemer').selectOption('verstorben');
  await feld(page, 'erben').selectOption('einer');
  await feld(page, 'nachweis').selectOption('enz');
  await feld(page, 'enzBis').fill('2026-11-10');
  await expect(page.locator('#wz_body .wz-rot', { hasText: 'Der Beurkundungstermin am 20.11.2026 liegt nach dem Ablauf der Abschrift am 10.11.2026' })).toHaveCount(1);
  // Löschen: Datensatz weg, Posten aus „Unterlagen“ entfernt, Notarauftrag unverändert
  await page.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.locator('#wz_body .kd-karte', { hasText: 'Nachlasshaus' })).toContainText('noch nicht geprüft');
  expect(await zusatz(page, pid)).toEqual([]);
  expect(await page.evaluate(async () => (await iaGet('notar', 'no_bf')).verkaeufer[0].gueterstand)).toBe('Gütergemeinschaft');
  await keineSkriptfehler(page);
});

test('Testamentsvollstrecker aus Grundbuch Abt. II, Kaufpreis gegen Bewertung mit Schwelle der Bank, Wiedervorlage zum Erbfall', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page, { od_abt2: 'Testamentsvollstreckervermerk' });
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_tv', anschrift: 'Musterweg 9, 74360 Ilsfeld', termin: '2026-12-15', kaufpreis: '100.000' }));
    wzOeffnen('befugnis');
  });
  await page.locator('#wz_befugnis_schwelle').fill('10');
  await page.locator('#wz_body .kd-karte', { hasText: 'Nachlasshaus' }).getByRole('button', { name: 'Prüfen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Grundbuch Abt. II laut Bewertung oder Notarauftrag: Testamentsvollstreckervermerk');
  await feld(page, 'eigentuemer').selectOption('verstorben');
  await feld(page, 'erben').selectOption('mehrere');
  await expect(page.locator('.wz-kpis').first()).toContainText('Testamentsvollstrecker');
  await expect(page.locator('#wz_body')).not.toContainText('Frage 3 beantworten');
  await expect(page.locator('#wz_body')).toContainText('Vertragspartner für den Maklervertrag und den Verkauf ist der Testamentsvollstrecker, nicht die Erben (§ 2205 Satz 2, § 2211 Abs. 1 BGB)');
  await page.evaluate(() => bfRolleKunde('tvId', 'k_tv'));
  await expect(page.locator('.bf-rolle')).toContainText('Tim Vollstreckerbeispiel');
  await feld(page, 'tvNachweis').selectOption('zeugnis');
  await feld(page, 'tvGeprueft').fill('2026-09-28');
  await expect(page.locator('#wz_body')).toContainText('mehr als 30 Tage vor dem Beurkundungstermin');
  // Kaufpreis 100.000 € weit unter dem Wert der Bewertung → Gelb
  await expect(page.locator('#wz_body .wz-gelb', { hasText: 'unter dem Wert der Bewertung' })).toContainText('Schwelle 10 %');
  // Erbfall: Wiedervorlage drei Monate vor Ablauf der zwei Jahre
  await feld(page, 'nachweis').selectOption('notariell');
  await expect(page.locator('#wz_body')).toContainText('Das Grundbuchamt kann trotzdem einen Erbschein verlangen');
  await feld(page, 'erbfall').fill('2025-11-20');
  await expect(page.locator('#wz_body')).toContainText('Gebührenfrei bis 20.11.2027');
  await expect.poll(() => page.evaluate(() => aufLoad().filter(a => /Grundbuch auf die Erben berichtigen/.test(a.text)).map(a => a.frist))).toEqual(['2027-08-20']);
  await feld(page, 'erbenEingetragen').selectOption('ja');
  await expect.poll(() => page.evaluate(() => aufLoad().filter(a => /Grundbuch auf die Erben berichtigen/.test(a.text)).length)).toBe(0);
  // Verkaufsfahrplan-Haken (Schritt „befugnis“) bleibt aus, solange nicht Grün
  expect(await page.evaluate(pid => FP_AUTO_HOOKS.reduce((m, h) => Object.assign(m, h(wzdObjekt(pid)) || {}), {}).befugnis, pid)).toBe(false);
  await keineSkriptfehler(page);
});

test('Auskunft und Löschen beim Kunden: Rolle, Vertretung und Genehmigung; Personenbezug entfernt', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await page.evaluate(async pid => {
    const p1 = bfPersonLeer({ id: 'p_a', kundeId: 'k_e1', einverstanden: 'ja', vertretung: 'betreuer', vertreterIds: ['k_betreuer'], aufgabenkreis: 'ja',
      gen: { beantragt: '2026-09-01', beschluss: '2026-09-20', bekanntgabe: '', mitgeteilt: '', aufforderung: '' } });
    const p2 = bfPersonLeer({ id: 'p_b', kundeId: 'k_e2', einverstanden: 'offen', familienstand: 'verheiratet', gueterstand: 'zugewinn' });
    const r = Object.assign(bfLeer(wzdObjekt(pid)), { id: 'bf_t', eigentuemer: 'verstorben', erben: 'mehrere', tv: 'nein', nacherbfolge: 'nein', tvId: 'k_tv', tvNachweis: 'zeugnis', personen: [p1, p2] });
    await wzdSpeichern('akten', r);
  }, pid);
  const auskunft = id => page.evaluate(async id => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h(id)))).flat().join('\n'), id);
  let a = await auskunft('k_e1');
  expect(a).toMatch(/WER VERKAUFT\? \(VERFÜGUNGSBEFUGNIS\)\n- Nachlasshaus: Miterbe 1, vertreten durch Betreuer, mit dem Verkauf einverstanden: ja/);
  expect(a).toMatch(/Genehmigung: beantragt 1\.9\.2026, Beschluss 20\.9\.2026/);
  a = await auskunft('k_betreuer');
  expect(a).toMatch(/- Nachlasshaus: Vertreter \(vertreten durch Betreuer\) für Miterbe 1/);
  a = await auskunft('k_e2');
  expect(a).toMatch(/Miterbe 2, handelt selbst, mit dem Verkauf einverstanden: offen, Familienstand: verheiratet, Güterstand: Zugewinngemeinschaft \(gesetzlich\)/);
  a = await auskunft('k_tv');
  expect(a).toMatch(/- Nachlasshaus: Testamentsvollstrecker, Nachweis: Testamentsvollstreckerzeugnis/);
  expect(await auskunft('k_kind')).toMatch(/WER VERKAUFT\? \(VERFÜGUNGSBEFUGNIS\)\n- keine/);
  // Löschen über die Kundenakte
  await page.evaluate(async () => { await kdLoeschen('k_e1'); await kdLoeschen('k_betreuer'); await kdLoeschen('k_tv'); });
  const r = await page.evaluate(async () => (await iaAlle('akten')).find(x => x.id === 'bf_t'));
  expect([r.personen[0].kundeId, r.personen[0].geloescht, r.personen[0].vertretung, r.personen[0].gen.beschluss]).toEqual(['', true, 'selbst', '']);
  expect([r.personen[1].kundeId, r.tvId]).toEqual(['k_e2', '']);
  expect(JSON.stringify(r)).not.toMatch(/k_e1|k_betreuer|k_tv/);
  // Anzeige: gelöschte Person ist neu zu wählen
  await page.evaluate(async pid => { wzOeffnen('befugnis'); await bfOeffnen(pid); }, pid);
  await expect(page.locator('.bf-person').first()).toContainText('(Kunde gelöscht) — neu wählen');
  await expect(page.locator('#wz_body')).toContainText('Miterbe 1: nicht erfasst');
  await keineSkriptfehler(page);
});
