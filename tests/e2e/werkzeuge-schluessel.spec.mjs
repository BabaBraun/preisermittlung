/* Kachel „Schlüsselbuch“ im Browser: Übernahme mit Unterschrift des Eigentümers, Bestand je Schlüssel, Ausgabe an eine Firma und an
   einen Interessenten aus der Kundenakte, überfällige Rückgabe rot mit Wiedervorlage, Quittungen als Dokument mit Pflichtangaben,
   Rückgabe an den Eigentümer, Verweis auf das Übergabeprotokoll, Verkaufsfahrplan, Kundenakte, Auskunft und Löschen.
   Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const SIG = 'data:image/png;base64,AAAA';

/* gesicherte Bewertung „Testhaus“ in Vermarktung, Eigentümerin Erika Beispiel aus der Kundenakte, Interessent Max Probe */
async function objekt(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    for (const [id, vn, nn] of [['k_e', 'Erika', 'Beispiel'], ['k_i', 'Max', 'Probe']])
      await kdSpeichern({ id, anrede: '', vorname: vn, nachname: nn, grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ek_kunde_id').value = 'k_e';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    Object.assign(wzAlle(), { absender: { firma: 'Musterbank eG', rechtsform: 'eingetragene Genossenschaft', sitz: 'Musterstadt', registergericht: 'Amtsgericht Musterstadt',
      registernr: 'GnR 123', vorstand: 'Erika Vorstand, Max Vorstand', aufsichtsrat: 'Ida Muster', name: 'Fabian Berater' } });
    wzSpeichernJetzt();
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}
/* Schlüsselbuch mit unterschriebener Übernahme: Haustür 2 (SA-4711), Briefkasten 1; ausgaben nach Wunsch */
async function buch(page, pid, ausgaben = []) {
  await page.evaluate(async ({ pid, ausgaben, SIG }) => {
    const R = ImmoSchluesselRegeln;
    const schluessel = [{ id: 'sl_h', art: 'Haustür', anzahl: '2', nummer: 'SA-4711', zurueck: '', zurueckAm: '' }, { id: 'sl_b', art: 'Briefkasten', anzahl: '1', nummer: '', zurueck: '', zurueckAm: '' }];
    const r = wzdAkteNeu('schluessel', { id: 'sc_test', projektId: pid, objekt: 'Testhaus', kundeId: 'k_e', schluessel, rueckgabe: {}, kaeuferAm: '', notiz: '',
      uebernahme: { datum: '2026-09-01', unterschrift: SIG, zeit: '2026-09-01T10:00:00.000Z', stand: R.listenStand(schluessel), berater: SIG, beraterZeit: '2026-09-01T10:00:00.000Z' },
      ausgaben: ausgaben.map(a => { const x = Object.assign({ schluesselId: 'sl_h', anzahl: '1', rolle: 'handwerker', modus: 'firma', kundeId: '', firma: '', datum: '2026-09-20',
        rueckgabeBis: '', zurueckAm: '', notiz: '', unterschrift: SIG, zeit: '2026-09-20T08:00:00.000Z' }, a); x.stand = R.ausgabeStand(x); return x; }) });
    await wzdSpeichern('akten', r);
  }, { pid, ausgaben, SIG });
}
async function unterschreiben(page, canvas) {
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 30, { steps: 8 }); await page.mouse.move(b.x + b.width - 30, b.y + 40, { steps: 8 }); await page.mouse.up();
}
const akte = page => page.evaluate(async () => (await iaAlle('akten')).find(a => a.art === 'schluessel'));
const pruefung = page => page.locator('#sk_pruefung');

test('Übernahme vom Eigentümer: Schlüssel eintragen, unterschreiben, Bestand, geänderte Liste, Übernahmequittung', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await page.evaluate(() => wzOeffnen('schluessel'));
  const karte = page.locator('.sk-karte', { hasText: 'Testhaus' });
  await expect(karte).toContainText('noch kein Schlüsselbuch');
  await karte.getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Erika Beispiel');
  await expect(page.locator('#wz_schluessel_schluessel_0_art')).toHaveValue('Haustür');
  await page.locator('#wz_schluessel_schluessel_0_anzahl').fill('2');
  await page.locator('#wz_schluessel_schluessel_0_nummer').fill('SA-4711');
  await page.locator('#wz_body button.plus', { hasText: 'Schlüssel' }).click();
  await page.locator('#wz_schluessel_schluessel_1_art').fill('Briefkasten');
  await page.locator('#wz_schluessel_schluessel_1_anzahl').fill('1');
  await expect(pruefung(page)).toContainText('Die Übernahme ist noch nicht vom Eigentümer unterschrieben.');
  await expect(pruefung(page)).toContainText('Datum der Übernahme fehlt.');
  await unterschreiben(page, page.locator('canvas[data-sk="eigentuemer"]'));
  await expect(page.locator('#sk_zeit_eigentuemer')).toContainText('unterschrieben');
  await expect(page.locator('#wz_schluessel_uebernahme_datum')).toHaveValue('2026-09-29');
  await unterschreiben(page, page.locator('canvas[data-sk="berater"]'));
  await expect(pruefung(page)).toContainText('Alles erfasst: 3 Schlüssel, davon 3 beim Berater.');
  await expect(page.locator('#sk_kpis')).toContainText('Übernommen3');
  await expect(page.locator('#sk_bestand tbody tr').first()).toContainText('HaustürNr. SA-4711');
  // Liste nach der Unterschrift geändert → neu unterschreiben
  await page.locator('#wz_schluessel_schluessel_1_anzahl').fill('2');
  await expect(pruefung(page)).toContainText('Schlüsselliste nach der Unterschrift geändert — neu unterschreiben lassen.');
  await page.locator('.ub-pad', { has: page.locator('canvas[data-sk="eigentuemer"]') }).getByRole('button', { name: 'Unterschrift löschen' }).click();
  await expect(pruefung(page)).toContainText('noch nicht vom Eigentümer unterschrieben');
  await unterschreiben(page, page.locator('canvas[data-sk="eigentuemer"]'));
  await expect(pruefung(page)).toContainText('Alles erfasst: 4 Schlüssel, davon 4 beim Berater.');
  await expect.poll(async () => (await akte(page)).uebernahme.unterschrift).toMatch(/^data:image\/png;base64,/);
  const r = await akte(page);
  expect([r.projektId, r.kundeId, r.uebernahme.datum, r.schluessel.map(k => [k.art, k.anzahl, k.nummer])]).toEqual([pid, 'k_e', '2026-09-29', [['Haustür', '2', 'SA-4711'], ['Briefkasten', '2', '']]]);
  expect(r.uebernahme.stand).toBe(await page.evaluate(() => ImmoSchluesselRegeln.listenStand(SK.aktiv.schluessel)));
  // Übernahmequittung mit beiden Unterschriften und den Pflichtangaben der Genossenschaft
  await page.getByRole('button', { name: 'Übernahmequittung' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Übernahme von Schlüsseln');
  for (const t of ['Musterweg 7, 74360 Ilsfeld', 'Erika Beispiel', 'SA-4711', 'Briefkasten', 'Übergeben: Erika Beispiel', 'Übernommen: Fabian Berater']) await expect(dok).toContainText(t);
  await expect(dok.locator('.wzd-unterschriften img')).toHaveCount(2);
  await expect(dok.locator('.wzd-pflicht')).toContainText('GnR 123');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Schlüsselbuch');
  await expect(page.locator('#wz_schluessel_schluessel_0_nummer')).toHaveValue('SA-4711');
  await keineSkriptfehler(page);
});

test('Ausgabe an eine Firma: überfällig rot, Quittung, Wiedervorlage, Rückgabe; Interessent nur aus der Kundenakte', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await objekt(page);
  await buch(page, pid);
  await page.evaluate(async pid => { wzOeffnen('schluessel'); await skOeffnen(pid); }, pid);
  await page.getByRole('button', { name: 'Schlüssel ausgeben' }).click();
  await page.locator('#wz_schluessel_ausgaben_0_firma').fill('Malerbetrieb Muster GmbH');
  await page.locator('#wz_schluessel_ausgaben_0_datum').fill('2026-09-20');
  await page.locator('#wz_schluessel_ausgaben_0_rueckgabeBis').fill('2026-09-25');
  await expect(pruefung(page)).toContainText('Rückgabe überfällig seit 25.9.2026: Haustür (1) — Malerbetrieb Muster GmbH.');
  await expect(pruefung(page).locator('.wz-rot')).toHaveCount(1);
  await expect(pruefung(page)).toContainText('Ausgabe ohne Quittung (Unterschrift des Empfängers)');
  const chip = page.locator('.sk-ausgabe .sk-chip').first();
  await expect(chip).toHaveText('überfällig seit 25.9.2026');
  await expect(chip).toHaveClass(/sk-rot/);
  await unterschreiben(page, page.locator('canvas[data-sk^="a:"]'));
  await expect(pruefung(page)).not.toContainText('ohne Quittung');
  await expect(page.locator('#sk_kpis')).toContainText('Ausgegeben1');
  await expect(page.locator('#sk_kpis')).toContainText('1 überfällig');
  await expect(page.locator('#sk_bestand tbody tr').first()).toContainText(/Haustür.*2\s*1\s*1\s*0/);
  // Wiedervorlage: überfällig → heute
  await page.getByRole('button', { name: 'Wiedervorlage zur Rückgabe' }).click();
  await expect.poll(() => meldungen.at(-1)).toBe('Wiedervorlage zum 29.9.2026 angelegt.');
  const wv = await page.evaluate(() => aufLoad().filter(a => /^Schlüsselbuch/.test(a.text)));
  expect(wv.map(a => [a.text, a.frist, a.objekt])).toEqual([['Schlüsselbuch Testhaus: Haustür (1) zurück von Malerbetrieb Muster GmbH (vereinbart bis 25.9.2026)', '2026-09-29', 'Testhaus']]);
  await page.getByRole('button', { name: /Wiedervorlage am 29\.9\.2026 angelegt/ }).click();
  await expect.poll(() => meldungen.at(-1)).toMatch(/schon angelegt/);
  // Ausgabequittung
  await page.locator('.sk-ausgabe').first().getByRole('button', { name: 'Ausgabequittung' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Ausgabe von Schlüsseln');
  for (const t of ['Malerbetrieb Muster GmbH', 'Handwerker', '20.9.2026', '25.9.2026', 'SA-4711', 'Empfangen: Malerbetrieb Muster GmbH', 'Ausgegeben von']) await expect(dok).toContainText(t);
  await expect(dok.locator('.wzd-unterschriften img')).toHaveCount(1);
  await expect(dok.locator('.wzd-pflicht')).toContainText('Vorstand: Erika Vorstand, Max Vorstand');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Rückgabe heute
  await page.locator('.sk-ausgabe').first().getByRole('button', { name: 'Heute zurück' }).click();
  await expect(page.locator('.sk-ausgabe .sk-chip').first()).toHaveText('zurück am 29.9.2026');
  await expect(pruefung(page)).not.toContainText('überfällig');
  await expect(page.locator('#sk_kpis')).toContainText('Beim Berater3');
  // zweite Ausgabe: Freitext sieht nach Privatperson aus → Hinweis; als Interessent nur aus der Kundenakte
  await page.getByRole('button', { name: 'Schlüssel ausgeben' }).click();
  await page.locator('#wz_schluessel_ausgaben_1_firma').fill('Max Probe');
  await expect(pruefung(page)).toContainText('„Max Probe“ sieht nicht nach einer Firma aus. Privatpersonen nur über die Kundenakte');
  await page.locator('#wz_schluessel_ausgaben_1_rolle').selectOption('interessent');
  await expect(page.locator('#wz_schluessel_ausgaben_1_modus')).toHaveCount(0);
  await expect(page.locator('#wz_schluessel_ausgaben_1_firma')).toHaveCount(0);
  await expect(pruefung(page)).toContainText('Empfänger fehlt: Haustür (1).');
  await expect.poll(async () => (await akte(page)).ausgaben[1].firma).toBe('');
  await page.locator('.sk-auf').getByRole('button', { name: 'Aus der Kundenakte' }).click();
  await page.locator('#kd_overlay .kd-zeile', { hasText: 'Max Probe' }).click();
  await expect(page.locator('#kd_overlay')).not.toHaveClass(/on/);
  await expect(page.locator('.sk-auf .vl-empf')).toContainText('Max Probe');
  await expect(pruefung(page)).not.toContainText('Empfänger fehlt');
  await page.locator('.sk-auf').getByRole('button', { name: 'nächster Werktag' }).click();
  await expect(page.locator('#wz_schluessel_ausgaben_1_rueckgabeBis')).toHaveValue('2026-09-30');
  await expect(page.locator('.sk-auf .sk-chip')).toHaveText('zurück bis 30.9.2026');
  await expect.poll(async () => (await akte(page)).ausgaben.map(a => [a.rolle, a.modus, a.kundeId, a.firma, a.zurueckAm])).toEqual([['handwerker', 'firma', '', 'Malerbetrieb Muster GmbH', '2026-09-29'], ['interessent', 'akte', 'k_i', '', '']]);
  // Übersicht für den Eigentümer: Privatperson ohne Namen
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(dok.locator('h1')).toHaveText('Schlüsselbuch');
  await expect(dok).toContainText('Malerbetrieb Muster GmbH');
  await expect(dok).toContainText('Interessent');
  await expect(dok).not.toContainText('Max Probe');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Liste aller Objekte
  await page.getByRole('button', { name: 'Alle Objekte', exact: true }).click();
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('Ausgegeben1');
  await expect(page.locator('.sk-karte', { hasText: 'Testhaus' })).toContainText('1 ausgegeben');
  await keineSkriptfehler(page);
});

test('Rückgabe an den Eigentümer, Übergabe an den Käufer über das Übergabeprotokoll, Verkaufsfahrplan', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await buch(page, pid, [{ id: 'sa_1', firma: 'Foto Studio Probe', rolle: 'fotograf', rueckgabeBis: '2026-10-02' }]);
  await page.evaluate(() => fpLaden());
  expect(await page.evaluate(pid => { const a = fpAuto(wzdObjekt(pid)); return [a.schluessel_uebernommen, a.schluessel_zurueck]; }, pid)).toEqual([true, false]);
  await page.evaluate(async pid => { wzOeffnen('schluessel'); await skOeffnen(pid); }, pid);
  await expect(page.locator('.sk-ausgabe .sk-chip')).toHaveText('zurück bis 2.10.2026');
  await expect(pruefung(page)).toContainText('Alles erfasst: 3 Schlüssel, davon 2 beim Berater, 1 ausgegeben.');
  // Übergabe an den Käufer, obwohl noch ein Schlüssel draußen ist → rot
  await page.locator('#wz_schluessel_kaeuferAm').fill('2026-10-15');
  await expect(pruefung(page).locator('.wz-rot')).toContainText('Vor der Übergabe an den Käufer alle ausgegebenen Schlüssel zurückholen — noch 1 ausgegeben.');
  await expect(page.locator('#sk_bestand thead')).toContainText('An den Käufer');
  await expect(page.locator('#sk_kpis')).toContainText('An den Käufer2');
  await page.locator('#wz_schluessel_kaeuferAm').fill('');
  await page.locator('.sk-ausgabe').getByRole('button', { name: 'Heute zurück' }).click();
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).schluessel_zurueck, pid)).toBe(true);
  // alles zurück an den Eigentümer, mit seiner Unterschrift
  await page.locator('summary', { hasText: 'Rückgabe an den Eigentümer' }).click();
  await page.getByRole('button', { name: 'Alles beim Berater zurück an den Eigentümer' }).click();
  await expect(page.locator('#sk_kpis')).toContainText('Zurück an den Eigentümer3');
  await expect(pruefung(page)).toContainText('Rückgabe an den Eigentümer noch nicht von ihm unterschrieben.');
  await unterschreiben(page, page.locator('canvas[data-sk="rueckgabe"]'));
  await expect(pruefung(page)).toContainText('Alles erfasst: 3 Schlüssel, davon 0 beim Berater, 3 zurück an den Eigentümer.');
  await expect.poll(async () => (await akte(page)).schluessel.map(k => [k.zurueck, k.zurueckAm])).toEqual([['2', '2026-09-29'], ['1', '2026-09-29']]);
  await page.getByRole('button', { name: 'Übernahmequittung' }).click();
  await expect(page.locator('#report .wzd h2')).toHaveText('Rückgabe an den Eigentümer');
  await expect(page.locator('#report .wzd')).toContainText('Zurückerhalten: Erika Beispiel');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // nur ein Verweis auf das Übergabeprotokoll
  await page.getByRole('button', { name: 'Übergabeprotokoll öffnen' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Übergabeprotokoll');
  await keineSkriptfehler(page);
});

test('Kundenakte zeigt ausgegebene Schlüssel; Auskunft und Löschen für Eigentümer und Empfänger', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await buch(page, pid, [{ id: 'sa_i', rolle: 'interessent', modus: 'akte', kundeId: 'k_i', rueckgabeBis: '2026-09-25' },
    { id: 'sa_f', schluesselId: 'sl_b', firma: 'Hausverwaltung Beispiel', rolle: 'hausverwaltung', rueckgabeBis: '2026-10-09' }]);
  // Kundenakte: Schlüssel beim Interessenten, Sprung in die Kachel
  await page.evaluate(() => kdOeffnen('k_i'));
  const kd = page.locator('#kd_inhalt');
  await expect(kd.locator('h3', { hasText: 'Schlüssel' })).toBeVisible();
  await expect(kd).toContainText('Haustür (1): Testhaus');
  await expect(kd).toContainText('überfällig seit 25.9.2026');
  // überfällig rot wie im Schlüsselbuch (D60, D63)
  const kdChip = kd.locator('.kd-karte', { hasText: 'Haustür (1): Testhaus' }).locator('.sk-chip');
  await expect(kdChip).toHaveText('überfällig seit 25.9.2026');
  await expect(kdChip).toHaveClass(/\bsk-rot\b/);
  expect(await kdChip.evaluate(e => getComputedStyle(e).color)).toBe(await kd.locator('h3', { hasText: 'Schlüssel' }).evaluate(h => {
    const p = document.createElement('span'); p.style.color = 'var(--bad)'; h.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; }));
  await expect(kd.locator('.kd-karte', { hasText: 'Haustür (1): Testhaus' })).toContainText('ausgegeben 20.9.2026');
  await kd.locator('.kd-karte', { hasText: 'Haustür (1): Testhaus' }).getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#wz_titel')).toContainText('Schlüsselbuch');
  await expect(page.locator('.sk-auf .vl-empf')).toContainText('Max Probe');
  // Liste: überfällige Rückgabe mit Name des Empfängers für den Berater
  await page.getByRole('button', { name: 'Alle Objekte', exact: true }).click();
  await expect(page.locator('#wz_body .wz-rot')).toContainText('Überfällig seit 25.9.2026: Haustür (1) — Max Probe (Testhaus)');
  // Auskunft
  const auskunft = id => page.evaluate(async id => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h(id)))).flat().join('\n'), id);
  expect(await auskunft('k_i')).toContain('SCHLÜSSELBUCH\n- Testhaus: Haustür (1) erhalten am 20.9.2026 als Interessent, Rückgabe vereinbart bis 25.9.2026, noch nicht zurück; Unterschrift (Quittung) gespeichert');
  expect(await auskunft('k_e')).toContain('SCHLÜSSELBUCH\n- Testhaus: Eigentümer; 3 Schlüssel übergeben am 1.9.2026, Unterschrift gespeichert');
  expect(await auskunft('k_x')).toContain('SCHLÜSSELBUCH\n- keine');
  // Löschen über die Kundenakte: Verknüpfung und Unterschriften weg, Bestand bleibt
  await page.evaluate(async () => { wzSchliessen(); await kdLoeschen('k_i'); await kdLoeschen('k_e'); });
  const r = await akte(page);
  expect(r.ausgaben.map(a => [a.id, a.kundeId, !!a.geloescht, a.unterschrift, a.firma])).toEqual([['sa_i', '', true, '', ''], ['sa_f', '', false, SIG, 'Hausverwaltung Beispiel']]);
  expect([r.kundeId, r.eigentuemerGeloescht, r.uebernahme.unterschrift, r.uebernahme.berater, r.schluessel.length]).toEqual(['', true, '', SIG, 2]);
  expect(JSON.stringify(r)).not.toMatch(/k_i|k_e/);
  await page.evaluate(async pid => { wzOeffnen('schluessel'); await skOeffnen(pid); }, pid);
  await expect(page.locator('#wz_body')).toContainText('(Kunde gelöscht)');
  await expect(pruefung(page)).toContainText('Der Eigentümer wurde aus der Kundenakte gelöscht.');
  await expect(page.locator('#sk_kpis')).toContainText('Ausgegeben2');
  // die Sicherung nimmt das Schlüsselbuch mit, die Prüfung beim Einspielen lässt es durch
  const ok = await page.evaluate(async () => ImmoDaten.projektSicherungPruefen({ typ: 'immoapp-projekte', version: 3, projekte: [], kunden: [{ id: 'k_z' }], akten: await iaAlle('akten') }).akten.length);
  expect(ok).toBe(1);
  await keineSkriptfehler(page);
});

test('Kundenakte: Rückgabe heute gelb, noch nicht fällig grün; Löschen direkt nach einer Eingabe bleibt gelöscht (D63)', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  await buch(page, pid, [{ id: 'sa_h', rolle: 'interessent', modus: 'akte', kundeId: 'k_i', rueckgabeBis: '2026-09-29' },
    { id: 'sa_g', schluesselId: 'sl_b', rolle: 'interessent', modus: 'akte', kundeId: 'k_i', rueckgabeBis: '2026-10-02' }]);
  await page.evaluate(() => kdOeffnen('k_i'));
  const kd = page.locator('#kd_inhalt');
  await expect(kd.locator('.kd-karte', { hasText: 'Haustür (1)' }).locator('.sk-chip')).toHaveClass(/\bsk-gelb\b/);
  await expect(kd.locator('.kd-karte', { hasText: 'Haustür (1)' }).locator('.sk-chip')).toHaveText('heute zurück');
  await expect(kd.locator('.kd-karte', { hasText: 'Briefkasten (1)' }).locator('.sk-chip')).toHaveClass(/\bsk-gruen\b/);
  await page.evaluate(() => kdSchliessen());
  // Notiz tippen und binnen 400 ms löschen: der Timer des verzögerten Speicherns darf das Schlüsselbuch nicht zurückschreiben
  await page.evaluate(async pid => { wzOeffnen('schluessel'); await skOeffnen(pid); }, pid);
  await page.locator('#wz_schluessel_notiz').fill('Schlüssel im Tresor');
  const offen = await page.evaluate(async () => { SK.aktiv.notiz = 'Schlüssel im Tresor der Filiale'; skSpeichern();
    const id = SK.aktiv.id, war = id in WZD_TIMER; await skLoeschen(); return [war, id in WZD_TIMER, SK.aktiv]; });
  expect(offen).toEqual([true, false, null]);
  await page.waitForTimeout(800);   // länger als der Speicher-Timer
  expect(await akte(page)).toBeUndefined();
  expect(await page.evaluate(() => wzdAkten('schluessel').length)).toBe(0);
  await expect(page.locator('.sk-karte', { hasText: 'Testhaus' })).toContainText('noch kein Schlüsselbuch');
  await keineSkriptfehler(page);
});
