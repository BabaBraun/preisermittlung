/* Neue Kacheln D40 im Browser: Interessenten mit Abgleich und Kundenakte, Kalender mit Kalenderdatei, Vorlagen, Akquise,
   Bieterverfahren mit Übersicht ohne Namen, Fotostudio (Schwärzen durch Ziehen), Verkaufsfahrplan, Kaufen oder Mieten,
   Löschen und Auskunft beim Kunden, Gesamtsicherung hin und zurück. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler, JETZT } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());
async function objektInVermarktung(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async foto => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000'; $('ex_provision').value = '3,57 % inkl. MwSt.';
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht' }]; $('pj_name').value = 'Testhaus'; compute(); await projektSichern();
    await kdSpeichern({ id: 'k_such', anrede: 'Frau', vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@example.org', telefon: '07062 1', grundlage: 'einwilligung', einwilligungAm: '2026-09-01',
      kontakte: [], finanzierungen: [], erstellt: 1, suchprofil: { aktiv: true, arten: PQ_KAT.map(x => x[0]), orte: '', budget: 900000, finanzierung: 'geprueft' } });
    await wzdLaden(true);
  }, FOTO_JPEG);
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Interessenten: Abgleich, neue Anfrage mit Kundenakte, Besichtigung im Kalender, Vorlage, Löschen beim Kunden (D40)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(() => wzOeffnen('interessenten'));
  await page.getByRole('button', { name: 'Abgleich', exact: true }).click();
  await expect(page.locator('#wz_body')).toContainText('Erika Musterfrau');
  await expect(page.locator('#wz_body')).toContainText('Einwilligung zur Werbung liegt vor');
  await page.getByRole('button', { name: 'Als Anfrage übernehmen' }).click();
  await page.locator('#vg_status').selectOption('Kontaktiert');
  await expect(page.locator('.vg-verlauf')).toContainText('Status: Kontaktiert');
  await page.getByRole('button', { name: 'Alle Anfragen' }).click();
  // neue Anfrage mit neuer Person: landet in der Kundenakte
  await page.getByRole('button', { name: 'Neue Anfrage' }).click();
  await page.locator('#vg_neu_objekt').selectOption(pid);
  await page.locator('#wz_interessenten_quelle').selectOption('Immowelt');
  await page.locator('#wz_interessenten_person_anrede').selectOption('Herr');
  await page.locator('#wz_interessenten_person_vorname').fill('Max');
  await page.locator('#wz_interessenten_person_nachname').fill('Beispiel');
  await page.locator('#wz_interessenten_person_email').fill('max@example.org');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Max Beispiel');
  const kid = await page.evaluate(() => KD_CACHE.find(k => k.nachname === 'Beispiel').id);
  expect(await page.evaluate(id => KD_CACHE.find(k => k.id === id).grundlage, kid)).toBe('vertrag');
  await page.getByRole('button', { name: 'Exposé versendet' }).click();
  await expect(page.locator('#vg_status')).toHaveValue('Exposé versendet');
  // Besichtigung planen → Kalender
  await page.getByRole('button', { name: 'Besichtigung planen' }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Kalender');
  await page.locator('#wz_kalender_datum').fill('2026-10-02');
  await page.locator('#wz_kalender_von').fill('14:00');
  await page.locator('#wz_kalender_bis').fill('14:45');
  await expect(page.locator('#ka_objekt')).toHaveValue(pid);
  await expect(page.locator('#wz_kalender_ort')).toHaveValue('Musterweg 7, 74360 Ilsfeld');
  // Bestätigung aus der Vorlage
  await page.getByRole('button', { name: 'Bestätigung schreiben' }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Vorlagen');
  await expect(page.locator('#vl_betreff')).toHaveValue('Ihr Besichtigungstermin am 2.10.2026');
  await expect(page.locator('#vl_text')).toHaveValue(/Sehr geehrter Herr Beispiel,[\s\S]*Freitag, 2\.10\.2026 um 14:00 Uhr/);
  expect(await page.evaluate(() => vlMailLink())).toMatch(/^mailto:max%40example\.org\?subject=Ihr%20Besichtigungstermin/);
  const [docx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Word', exact: true }).click()]);
  expect(docx.suggestedFilename()).toBe('Ihr Besichtigungstermin am 2.10.2026.docx');
  // Kalender: Liste und Kalenderdatei ohne Kundennamen
  await page.evaluate(() => wzOeffnen('kalender'));
  await expect(page.locator('.ka-eintrag.ka-termin')).toContainText('Besichtigung: Testhaus');
  await expect(page.locator('.ka-eintrag.ka-termin')).toContainText('Max Beispiel');
  const [ics] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Kalenderdatei' }).click()]);
  const t = (await inhalt(ics)).toString('utf8');
  expect(t).toContain('DTSTART:20261002T140000'); expect(t).toContain('DTEND:20261002T144500'); expect(t).not.toContain('Beispiel');
  await page.getByRole('button', { name: 'Monat', exact: true }).click();
  await expect(page.locator('.ka-zelle.heute')).toHaveCount(1);
  await expect(page.locator('.ka-punkt.ka-termin')).toHaveCount(1);
  // Auskunft und Löschen beim Kunden
  await page.evaluate(() => wzSchliessen());
  const [aus] = await Promise.all([page.waitForEvent('download'), page.evaluate(id => kdExport(id), kid)]);
  const a = (await inhalt(aus)).toString('utf8');
  expect(a).toContain('ANFRAGEN UND AKQUISE'); expect(a).toContain('Anfrage: Testhaus'); expect(a).toContain('TERMINE');
  await page.evaluate(id => kdLoeschen(id), kid);
  await expect.poll(() => page.evaluate(id => !KD_CACHE.some(k => k.id === id), kid)).toBe(true);
  await expect.poll(() => page.evaluate(async id => (await iaAlle('vorgaenge')).filter(v => v.kundeId === id).length, kid)).toBe(0);
  expect(await page.evaluate(async id => (await iaAlle('termine')).some(t => t.kundeIds.includes(id)), kid)).toBe(false);
  expect(meldungen.some(m => m.includes('Anfragen, Akquise-Einträge und Gebote dieses Kunden werden mitgelöscht'))).toBe(true);
  await keineSkriptfehler(page);
});

test('Akquise und Bieterverfahren: Übersicht nach Status, Gebote mit Rang, Übersicht für den Eigentümer ohne Namen (D40)', async ({ page }) => {
  dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(() => wzOeffnen('akquise'));
  await page.getByRole('button', { name: 'Neuer Kontakt' }).click();
  await page.locator('#wz_akquise_objektOrt').fill('Abstatt');
  await page.locator('#wz_akquise_wert').fill('450.000');
  await page.locator('#wz_akquise_person_vorname').fill('Karl');
  await page.locator('#wz_akquise_person_nachname').fill('Beispielmann');
  await page.getByRole('button', { name: 'Anlegen' }).click();
  await page.locator('#vg_status').selectOption('Termin vereinbart');
  await page.getByRole('button', { name: 'Alle Kontakte' }).click();
  await expect(page.locator('.vg-spalte').nth(1)).toContainText('Karl Beispielmann');
  await expect(page.locator('.vg-spalte').nth(1)).toContainText('Provision 16.065 €');     // 450.000 € × 3,57 %
  // Bieterverfahren
  await page.evaluate(() => wzOeffnen('bieter'));
  await page.getByRole('button', { name: 'Neues Bieterverfahren' }).click();
  await page.locator('#bi_neu_objekt').selectOption(pid);
  await page.getByRole('button', { name: 'Anlegen' }).click();
  for (const [vn, nn, betrag] of [['Max', 'Beispiel', '495.000'], ['Lena', 'Muster', '505.000']]) {
    await page.getByRole('button', { name: 'Gebot', exact: true }).click();
    await page.locator('#bi_g_vorname').fill(vn); await page.locator('#bi_g_nachname').fill(nn); await page.locator('#bi_g_betrag').fill(betrag);
    await page.getByRole('button', { name: 'Gebot eintragen' }).click();
  }
  await expect(page.locator('.bi-tab tbody tr')).toHaveCount(2);
  await expect(page.locator('.bi-tab tr.bi-erstes')).toContainText('Lena Muster');
  await expect(page.locator('.wz-kpis')).toContainText('+5,2 % zum Angebotspreis');
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd')).toContainText('Bieter A');
  await expect(page.locator('#report .wzd')).toContainText('505.000 €');
  await expect(page.locator('#report .wzd')).not.toContainText('Muster');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Gebotsfrist erscheint im Kalender
  await page.evaluate(() => wzOeffnen('kalender'));
  await expect(page.locator('#wz_body')).toContainText('Gebotsfrist: Testhaus');
  await keineSkriptfehler(page);
});

test('Fotostudio: Foto wählen, Fläche durch Ziehen schwärzen, als JPEG speichern (D40)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(() => wzOeffnen('foto'));
  const wahl = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Foto wählen' }).click();
  await (await wahl).setFiles({ name: 'ansicht.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(FOTO_JPEG.split(',')[1], 'base64') });
  await expect(page.locator('#fs_vorschau')).toBeVisible();
  await page.getByRole('button', { name: 'Schwärzen', exact: true }).click();
  const c = page.locator('#fs_vorschau'); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox();
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3); await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.7, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('.fs-liste li')).toHaveCount(1);
  const px = await page.evaluate(() => { const c = fsRendern(400); const d = c.getContext('2d').getImageData(Math.round(c.width * 0.45), Math.round(c.height * 0.5), 1, 1).data; return [d[0], d[1], d[2]]; });
  expect(Math.max(...px)).toBeLessThan(8);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als JPEG speichern' }).click()]);
  expect(dl.suggestedFilename()).toBe('ansicht bearbeitet.jpg');
  const bytes = await inhalt(dl); expect(bytes[0]).toBe(0xFF); expect(bytes[1]).toBe(0xD8);
  await keineSkriptfehler(page);
});

test('Verkaufsfahrplan erkennt Schritte selbst; Kaufen oder Mieten rechnet wie ImmoBeratung (D40)', async ({ page }) => {
  dialoge(page);
  await objektInVermarktung(page);
  await page.evaluate(() => wzOeffnen('fahrplan'));
  await expect(page.locator('.fp-karte')).toContainText('Testhaus');
  await page.locator('.fp-karte').getByRole('button', { name: 'Öffnen' }).click();
  for (const t of ['Bewertung erstellt', 'Fotos aufgenommen und bearbeitet', 'Angebotspreis mit dem Eigentümer abgestimmt'])
    await expect(page.locator('.fp-schritt', { hasText: t })).toContainText('erkannt');
  await page.locator('.fp-schritt', { hasText: 'Maklervertrag in Textform' }).locator('input[type="checkbox"]').check();
  await expect(page.locator('.fp-schritt', { hasText: 'Maklervertrag in Textform' })).toHaveClass(/ok/);
  expect(await page.evaluate(() => wzAlle().fahrplan[FP.aktiv].maklervertrag.ok)).toBe(true);
  // Kaufen oder Mieten
  await page.evaluate(() => wzOeffnen('kaufmiete'));
  const soll = await page.evaluate(() => ImmoBeratung.kaufMiete(kmEingabe(wzZustand('kaufmiete'))));
  await expect(page.locator('#wz_km_ergebnis .wz-kpis')).toContainText(await page.evaluate(x => wzEur(x), soll.rate));
  await expect(page.locator('#wz_km_ergebnis .wz-kpis')).toContainText(await page.evaluate(x => wzEur(x), soll.ende.kauf));
  await page.locator('#wz_kaufmiete_miete').fill('1.600');
  const mehr = await page.evaluate(() => ImmoBeratung.kaufMiete(kmEingabe(wzZustand('kaufmiete'))).vorteil);
  expect(mehr).toBeGreaterThan(soll.vorteil);
  await page.getByRole('button', { name: 'Aus Bewertung' }).click();
  expect(await page.evaluate(() => wzZustand('kaufmiete').preis)).toBe(await page.evaluate(() => String(Math.round(window._R.empfehlung / 1000) * 1000)));
  await keineSkriptfehler(page);
});

test('Farbschema über „Mehr → Darstellung“, bleibt nach dem Neuladen; Startseite „Heute und morgen“; Suche findet Termine (D40)', async ({ page }) => {
  dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(() => appSetTab('more'));
  await page.locator('#app_more').getByRole('button', { name: 'Darstellung', exact: true }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Farben');
  await page.getByRole('button', { name: /Blau/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-farbe', 'blau');
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim())).toBe('#1a5cad');
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim())).toBe('#8bb8f2');
  // Termin heute → Startseite; Neuladen behält das Schema
  await page.evaluate(async pid => { await wzdSpeichern('termine', { id: 't_h', art: 'Besichtigung', titel: '', datum: aufHeute(), von: '16:00', bis: '', ort: '', projektId: pid, kundeIds: ['k_such'], notiz: '', erinnerung: '0' }); }, pid);
  await page.reload(); await page.waitForFunction(() => typeof window.compute === 'function'); await page.evaluate(() => window.IA_BEREIT_P);
  await expect(page.locator('html')).toHaveAttribute('data-farbe', 'blau');
  await page.evaluate(async () => { appSetTab('home'); await startHeuteRender(); });
  await expect(page.locator('#start_heute')).toContainText('heute 16:00');
  await expect(page.locator('#start_heute')).toContainText('Besichtigung: Testhaus');
  await page.evaluate(() => { sucheOeffnen(); $('suche_q').value = 'Besichtigung'; sucheLauf(); });
  await expect(page.locator('#suche_liste')).toContainText('Anfragen und Termine');
  await page.locator('#suche_liste .suche-row', { hasText: 'Besichtigung: Testhaus' }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Kalender');
  await expect(page.locator('#wz_kalender_von')).toHaveValue('16:00');
  // zurück auf Petrol
  await page.evaluate(() => faSetzen('petrol'));
  await expect(page.locator('html')).not.toHaveAttribute('data-farbe', /./);
  await keineSkriptfehler(page);
});

test('Aushang: ein Objekt mit Titelbild, Preis und Pflichtangaben; Übersicht mit mehreren Objekten (D40)', async ({ page }) => {
  dialoge(page);
  await objektInVermarktung(page);
  await page.evaluate(async () => { $('ex_ea_art').value = 'Verbrauchsausweis'; $('ex_ea_wert').value = '118,4'; $('ex_ea_traeger').value = 'Erdgas'; $('ex_ea_klasse').value = 'D';
    $('ex_ea_baujahr').value = '1972'; $('ex_k_name').value = 'Erika Beispielberaterin'; $('ex_k_tel').value = '07062 0'; await projektSichern(); });
  await page.clock.setFixedTime(new Date(JETZT.getTime() + 5000));   // eigene Projekt-Id (p + Zeitstempel)
  await page.evaluate(async () => { $('pj_name').value = 'Zweithaus'; $('ek_anschrift').value = 'Lindenweg 5, 74232 Abstatt'; $('ex_preis').value = '390.000'; await projektSichern(); });
  await page.evaluate(() => wzOeffnen('aushang'));
  await page.locator('#ah_objekt').selectOption({ label: 'Testhaus' });
  await expect(page.locator('#wz_body .wz-ampel')).toHaveClass(/wz-gruen/);
  await page.getByRole('button', { name: 'Aushang anzeigen' }).click();
  await expect(page.locator('#report.aushang .ah-bild')).toHaveCount(1);
  await expect(page.locator('#report .ah-preis')).toContainText('480.000 €');
  await expect(page.locator('#report .ah-energie')).toContainText('Verbrauchsausweis · Endenergieverbrauch 118,4 kWh/(m²·a) · Energieträger Erdgas · Baujahr 1972 · Klasse D');
  await expect(page.locator('#report .ah-ort')).toHaveText('74360 Ilsfeld');            // Straße nur auf Wunsch
  await expect(page.locator('#report .ah-kontakt')).toContainText('Erika Beispielberaterin');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await page.getByRole('group', { name: 'Aufbau' }).getByRole('button', { name: 'Übersicht' }).click();
  for (const n of ['Testhaus', 'Zweithaus']) await page.locator('.ah-wahl label', { hasText: n }).locator('input').check();
  await page.getByRole('button', { name: 'Aushang anzeigen' }).click();
  await expect(page.locator('#report .ah-karte')).toHaveCount(2);
  await expect(page.locator('#report .ah-uebersicht')).toContainText('390.000 €');
  await keineSkriptfehler(page);
});

test('Besichtigungsnachweis: Teilnehmer unterschreibt im Termin, Dokument mit Unterschrift, Textänderung entfernt sie (D40)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(async pid => { await wzdSpeichern('termine', { id: 't_n', art: 'Besichtigung', titel: '', datum: '2026-10-01', von: '15:00', bis: '', ort: '', projektId: pid, kundeIds: ['k_such'], notiz: '', erinnerung: '0' });
    await kaTerminOeffnen('t_n'); }, pid);
  await expect(page.locator('.ka-nachweis-text')).toContainText('Hiermit bestätige ich, das Objekt Musterweg 7, 74360 Ilsfeld am 1.10.2026 besichtigt zu haben.');
  const c = page.locator('canvas.ka-pad'); await c.scrollIntoViewIfNeeded(); const b = await c.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 30, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(async () => !!((await iaGet('termine', 't_n')).nachweis || {}).unterschriften?.k_such)).toBe(true);
  await page.getByRole('button', { name: 'Nachweis als Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Besichtigungsnachweis');
  await expect(page.locator('#report .wzd-unterschriften img')).toHaveCount(1);
  await expect(page.locator('#report .wzd-unterschriften')).toContainText('Erika Musterfrau');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await page.locator('.ka-nachweis-aendern summary').click();
  await page.locator('#ka_nachweis_text').fill('Ich habe {objekt} am {datum} gesehen.'); await page.locator('#ka_nachweis_text').blur();
  await expect.poll(() => meldungen.join('|')).toContain('werden die vorhandenen Unterschriften entfernt');
  await expect(page.locator('.ka-nachweis-text')).toHaveText('Ich habe Musterweg 7, 74360 Ilsfeld am 1.10.2026 gesehen.');
  expect(await page.evaluate(async () => Object.keys((await iaGet('termine', 't_n')).nachweis.unterschriften).length)).toBe(0);
  await keineSkriptfehler(page);
});

test('Aktivitäten zählen Anfragen, Exposés, Besichtigungen und Gespräche im Zeitraum, mit Vorzeitraum (D40)', async ({ page }) => {
  dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(async pid => {
    await wzdSpeichern('vorgaenge', { id: 'v_a1', typ: 'anfrage', datum: '2026-09-22', kundeId: 'k_such', projektId: pid, quelle: 'Immowelt', status: 'Exposé versendet', stufe: 2,
      verlauf: [{ id: 'h1', datum: '2026-09-22', text: 'Anfrage über Immowelt' }, { id: 'h2', datum: '2026-09-23', text: 'Exposé versendet' }] });
    await wzdSpeichern('vorgaenge', { id: 'v_a2', typ: 'anfrage', datum: '2026-08-30', kundeId: 'k_such', projektId: pid, quelle: 'Filiale', status: 'Neu', stufe: 0, verlauf: [] });
    await wzdSpeichern('termine', { id: 't_a', art: 'Besichtigung', titel: '', datum: '2026-09-25', von: '10:00', bis: '', ort: '', projektId: pid, kundeIds: [], notiz: '', erinnerung: '0' });
    const k = KD_CACHE.find(x => x.id === 'k_such'); k.kontakte = [{ id: 'c1', ts: 1, datum: '2026-09-24', art: 'Telefonat', text: 'Rückruf' }]; await kdSpeichern(k);
  }, pid);
  await page.evaluate(() => wzOeffnen('aktivitaeten'));
  await page.getByRole('group', { name: 'Zeitraum' }).getByRole('button', { name: 'Dieser Monat' }).click();
  const zeile = t => page.locator('#wz_body tr', { hasText: t });
  await expect(zeile('Neue Anfragen').locator('td').nth(1)).toContainText('1');     // September: eine neue Anfrage (die zweite war im August)
  await expect(zeile('Neue Anfragen').locator('td').nth(2)).toHaveText('1');        // Vorzeitraum August
  await expect(zeile('Exposés versendet').locator('td').nth(1)).toContainText('1');
  await expect(zeile('Besichtigungen (Kalender)').locator('td').nth(1)).toContainText('1');
  await expect(zeile('Gesprächsnotizen: Telefonat').locator('td').nth(1)).toContainText('1');
  await expect(page.locator('#wz_body')).toContainText('Anfragen nach Quelle');
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Aktivitäten');
  await expect(page.locator('#report .wzd')).not.toContainText('Musterfrau');
  await keineSkriptfehler(page);
});

test('Gesamtsicherung enthält Termine, Anfragen und Bieterverfahren und spielt sie wieder ein (D40)', async ({ page, browser }) => {
  dialoge(page);
  const pid = await objektInVermarktung(page);
  await page.evaluate(async pid => {
    await wzdSpeichern('termine', { id: 't_s', art: 'Besichtigung', titel: '', datum: '2026-10-10', von: '10:00', bis: '', ort: '', projektId: pid, kundeIds: ['k_such'], notiz: '', erinnerung: '0' });
    await wzdSpeichern('vorgaenge', { id: 'v_s', typ: 'anfrage', datum: '2026-09-28', kundeId: 'k_such', projektId: pid, quelle: 'Filiale', status: 'Neu', stufe: 0, verlauf: [] });
    await wzdSpeichern('bieter', { id: 'b_s', projektId: pid, ende: '2026-10-20', status: 'laufend', gebote: [{ id: 'g1', kundeId: 'k_such', betrag: 490000, status: 'gültig' }] });
  }, pid);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const text = (await inhalt(dl)).toString('utf8'), d = JSON.parse(text);
  expect([d.termine.length, d.vorgaenge.length, d.bieter.length]).toEqual([1, 1, 1]);
  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(t => pjSicherungAusText(t), text);
  await expect.poll(() => m2.join('|')).toContain('Termine: 1 neu oder aktualisiert.');
  expect(m2.join('|')).toContain('Anfragen und Akquise: 1'); expect(m2.join('|')).toContain('Bieterverfahren: 1');
  expect(await p2.evaluate(async () => (await iaAlle('bieter'))[0].gebote[0].betrag)).toBe(490000);
  await ctx.close();
  await keineSkriptfehler(page);
});
