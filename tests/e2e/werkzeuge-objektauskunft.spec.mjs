/* Kachel „Objektauskunft“ (D61) im Browser: Vorbelegung aus der gesicherten Bewertung (nur lesen), Fragen mit Ampeln,
   Unterschrift je Stand, Text der Bestätigung (Vorgabe der Bank), Dokument mit Pflichtangaben, Auskunft und Löschen beim
   Kunden, Kundenakte und Verkaufsfahrplan. Nur synthetische Daten; die feste Testuhr steht auf dem 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const ABSENDER = { firma: 'Musterbank eG', sitz: 'Musterstadt', registergericht: 'Amtsgericht Musterstadt', registernr: 'GnR 123',
  vorstand: 'Erika Beispiel, Max Probe', aufsichtsrat: 'Ida Muster', name: 'Fabian Beispiel' };

/* gesicherte Bewertung „Testhaus“ in Vermarktung mit Eigentümerin aus der Kundenakte und Angaben, die die Kachel vorbelegt */
async function objekt(page, felder = {}) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async felder => {
    await kdSpeichern({ id: 'k_e', anrede: 'Frau', vorname: 'Erika', nachname: 'Eigentümerbeispiel', telefon: '07062 1', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_m', anrede: 'Herr', vorname: 'Max', nachname: 'Probeeigentümer', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 2 });
    const f = Object.assign({ ek_anschrift: 'Musterweg 7, 74360 Ilsfeld', vm_status: 'In Vermarktung', ek_kunde_id: 'k_e', od_denkmal: 'ja (Kulturdenkmal)',
      od_baulasten: 'keine Eintragungen', au_maengel: 'Feuchtefleck Kellerwand Nordseite; Dachrinne undicht', od_abt2: 'Geh- und Fahrtrecht zugunsten Flst. 12/3',
      vermietung_besch: 'EG vermietet an Herrn Muster, OG eigengenutzt', od_grundbuch: 'Ilsfeld', od_gb_blatt: '1234' }, felder);
    for (const [k, v] of Object.entries(f)) { const e = $(k); if (e) e.value = v; }
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
  }, felder);
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}
const frage = (page, key) => page.locator(`.oa-frage[data-key="${key}"]`);
const knopf = (page, key, wert) => frage(page, key).getByRole('button', { name: wert, exact: true });
async function antworten(page, key, wert, text) {
  await knopf(page, key, wert).click();
  if (text != null) await frage(page, key).locator('textarea').fill(text);
}
async function unterschreiben(page, kid) {
  const c = page.locator(`canvas.oa-pad[data-kunde="${kid}"]`); await c.scrollIntoViewIfNeeded();
  const b = await c.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 30, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(k => (((OA.aktiv.unterschriften || {})[k] || {}).bild || '').slice(0, 22), kid)).toBe('data:image/png;base64,');
}
/* alle noch offenen Fragen mit „nein“ beantworten (ohne Oberfläche) */
async function restNein(page) {
  await page.evaluate(async () => { const r = OA.aktiv;
    for (const q of ImmoObjektauskunftRegeln.fragenFuer(r)) if (!(r.antworten[q.key] || {}).wert) r.antworten[q.key] = Object.assign({ text: '' }, r.antworten[q.key], { wert: 'nein' });
    await wzdSpeichernSofort('akten', r); wzZeichnen(); });
}

test('Objektauskunft: Vorbelegung aus der Bewertung, Fragen mit Ampeln, Unterschrift, Dokument — Bewertung unverändert (D61)', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page);
  const vorher = await page.evaluate(async pid => JSON.stringify((await iaGet('projekte', pid)).data.fields), pid);
  await page.evaluate(a => { Object.assign(abS(), a); wzSpeichernJetzt(); }, ABSENDER);
  await page.evaluate(() => wzOeffnen('objektauskunft'));
  const karte = page.locator('#wz_body .kd-karte', { hasText: 'Testhaus' });
  await expect(karte).toContainText('noch nicht begonnen');
  await karte.getByRole('button', { name: 'Öffnen' }).click();

  // Vorbelegung nur lesend aus der gesicherten Bewertung, mit Herkunft
  await expect(knopf(page, 'denkmal', 'ja')).toHaveAttribute('aria-pressed', 'true');
  await expect(frage(page, 'denkmal').locator('.oa-herkunft')).toHaveText('aus der Bewertung');
  await expect(knopf(page, 'baulasten', 'nein')).toHaveAttribute('aria-pressed', 'true');
  await expect(frage(page, 'maengel').locator('textarea')).toHaveValue('Feuchtefleck Kellerwand Nordseite; Dachrinne undicht');
  await expect(frage(page, 'feuchtigkeit').locator('textarea')).toHaveValue('Feuchtefleck Kellerwand Nordseite');
  await expect(frage(page, 'rechte').locator('textarea')).toHaveValue('Grundbuch Abt. II: Geh- und Fahrtrecht zugunsten Flst. 12/3');
  await expect(knopf(page, 'vermietet', 'ja')).toHaveAttribute('aria-pressed', 'true');
  await expect(frage(page, 'vermietet').locator('textarea')).toHaveValue('');          // Text der Bewertung enthält einen Namen — nicht übernommen
  await expect(frage(page, 'schaedlinge').locator('.oa-herkunft')).toBeHidden();
  await expect(frage(page, 'sonderumlage')).toHaveCount(0);                            // kein Wohnungseigentum
  await expect(page.locator('#wz_body .kd-karte', { hasText: 'Erika Eigentümerbeispiel' })).toBeVisible();   // Eigentümerin aus der Bewertung
  const pruef = page.locator('#oa_pruefung');
  await expect(pruef).toContainText('Fragen sind noch nicht beantwortet');
  await expect(pruef).toContainText('aus der Bewertung vorbelegt');
  await expect(pruef).toContainText('Vorschlag der App — mit der Rechtsabteilung abstimmen');
  await expect(page.locator('canvas.oa-pad')).toHaveCount(0);                          // unterschreiben erst, wenn alles beantwortet ist

  // Antworten, Ampeln und Hinweis auf die Kachel „Unterlagen“
  await antworten(page, 'schaedlinge', 'nein');
  await antworten(page, 'umbauten', 'ja', 'Dachgeschoss 1998 ausgebaut');
  await antworten(page, 'ohneGenehmigung', 'unbekannt');
  await expect(pruef).toContainText('„Umbauten ohne Genehmigung“ unbekannt — Baugenehmigung und Baubeschreibung in der Kachel „Unterlagen“ anfordern.');
  await expect(pruef.getByRole('button', { name: 'Unterlagen öffnen' })).toBeVisible();
  await antworten(page, 'ohneGenehmigung', 'nein');
  await antworten(page, 'altlasten', 'nein');
  await antworten(page, 'sonstiges', 'nein');
  await expect(pruef).toContainText('Zahl der vermieteten Einheiten und Summe der Nettokaltmieten');
  await page.locator('#wz_objektauskunft_mieten_anzahl').fill('1');
  await page.locator('#wz_objektauskunft_mieten_kaltmiete').fill('650');
  await frage(page, 'vermietet').locator('textarea').fill('EG an Herrn Muster vermietet');
  await expect(pruef).toContainText('bitte keine Namen von Mietern');
  await frage(page, 'vermietet').locator('textarea').fill('EG vermietet seit 2019, unbefristet');
  await expect(pruef).not.toContainText('Namen von Mietern');
  await expect(pruef).not.toContainText('Zahl der vermieteten');
  // Wohnungseigentum bringt zwei Fragen mit
  await page.locator('#wz_objektauskunft_weg').check();
  await expect(frage(page, 'sonderumlage')).toHaveCount(1);
  await expect(frage(page, 'verfahren')).toHaveCount(1);
  await page.locator('#wz_objektauskunft_weg').uncheck();
  await expect(frage(page, 'sonderumlage')).toHaveCount(0);
  // geänderter Vorschlag bleibt als solcher erkennbar
  await frage(page, 'maengel').locator('textarea').fill('Dachrinne undicht (2026 repariert)');
  await expect(frage(page, 'maengel').locator('.oa-herkunft')).toHaveText('aus der Bewertung, geändert');
  await expect(page.locator('#oa_kpis')).toContainText('11 von 11');
  await expect(pruef).toContainText('Noch nicht unterschrieben.');

  // Unterschrift auf dem Gerät sperrt die Angaben
  await unterschreiben(page, 'k_e');
  await expect(pruef).toContainText(/Vom Eigentümer unterschrieben am 29\.0?9\.2026/);
  await expect(pruef).not.toContainText('Vorschlag der App');
  await expect(frage(page, 'maengel').locator('textarea')).toBeDisabled();
  await expect(knopf(page, 'maengel', 'nein')).toBeDisabled();
  await expect(page.locator('#wz_objektauskunft_weg')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Angaben ändern' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leere Antworten aus der Bewertung' })).toBeHidden();

  // Dokument für Interessenten und Akte: mit Unterschrift und Pflichtangaben der Genossenschaft
  await page.locator('#wz_aktionen').getByRole('button', { name: 'Dokument' }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Objektauskunft');
  for (const t of ['Angaben des Eigentümers', 'Musterweg 7, 74360 Ilsfeld', 'Grundbuch von Ilsfeld, Blatt 1234', 'Kulturdenkmal', 'Dachrinne undicht (2026 repariert)',
    'Vermietete Einheiten', '650 € je Monat', 'Erika Eigentümerbeispiel', 'Die Fragen in dieser Objektauskunft habe ich selbst beantwortet',
    'Fabian Beispiel (Musterbank eG)']) await expect(dok).toContainText(t);
  await expect(dok.locator('.wzd-unterschriften img')).toHaveCount(1);
  await expect(dok.locator('.pa-entwurf')).toHaveCount(0);
  await expect(dok.locator('.wzd-pflicht')).toContainText('GnR 123');
  await expect(dok).not.toContainText(/Haftung|Gewähr/);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();

  // „Angaben ändern“ entfernt die Unterschrift …
  await page.getByRole('button', { name: 'Angaben ändern' }).click();
  await expect(pruef).toContainText('Noch nicht unterschrieben.');
  await expect(frage(page, 'maengel').locator('textarea')).toBeEnabled();
  // … ebenso jede andere Änderung am unterschriebenen Stand (z. B. aus einer Sicherung)
  await unterschreiben(page, 'k_e');
  await page.evaluate(() => { OA.aktiv.antworten.schaedlinge.wert = 'ja'; wzZeichnen(); });
  await expect(page.locator('#wz_body')).toContainText('Die Unterschrift wurde entfernt, weil sich die Angaben geändert haben.');
  expect(await page.evaluate(() => Object.keys(OA.aktiv.unterschriften))).toEqual([]);
  await expect(page.locator('#wz_body details', { hasText: 'Verlauf' })).toContainText('Unterschrift entfernt — Angaben geändert');

  // gespeichert im Speicher „akten“, nur mit Kunden-Id; die Bewertung ist unverändert
  await page.evaluate(() => wzSchliessen());
  await expect.poll(() => page.evaluate(async () => (await iaAlle('akten')).filter(x => x.art === 'objektauskunft').map(x => [x.kundeIds, x.antworten.schaedlinge.wert]))).toEqual([[['k_e'], 'ja']]);
  const akte = await page.evaluate(async () => JSON.stringify((await iaAlle('akten')).find(x => x.art === 'objektauskunft')));
  expect(akte).not.toMatch(/Erika|Eigentümerbeispiel|Muster(?!weg)/);
  expect(await page.evaluate(async pid => JSON.stringify((await iaGet('projekte', pid)).data.fields), pid)).toBe(vorher);
  await keineSkriptfehler(page);
});

test('Text der Bestätigung: Vorgabe der Bank, eingefroren mit der Unterschrift, eigener Text entfernt sie (D61)', async ({ page }) => {
  const meldungen = dialoge(page);
  const pid = await objekt(page);
  await page.evaluate(() => wzOeffnen('objektauskunft'));
  await page.locator('#wz_objektauskunft_vorgabe').fill('Vorgabe der Musterbank für {objekt}.');
  await page.evaluate(async pid => { await oaOeffnen(pid); }, pid);
  await restNein(page);
  await expect(page.locator('#oa_text')).toHaveText('Vorgabe der Musterbank für Musterweg 7, 74360 Ilsfeld.');
  await expect(page.locator('#oa_pruefung')).not.toContainText('Vorschlag der App');
  // Entwurf ohne Unterschrift
  await page.getByRole('button', { name: 'Objektauskunft als Dokument' }).click();
  await expect(page.locator('#report .pa-entwurf')).toHaveText('Entwurf — nicht unterschrieben');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await unterschreiben(page, 'k_e');
  // neue Vorgabe der Bank: die unterschriebene Auskunft behält ihren Text und ihre Unterschrift
  await page.evaluate(() => { oaS().vorgabe = 'Neue Vorgabe der Musterbank.'; wzZeichnen(); });
  await expect(page.locator('#oa_text')).toContainText('Vorgabe der Musterbank für Musterweg 7');
  await expect(page.locator('#oa_pruefung')).toContainText(/unterschrieben am 29\.0?9\.2026/);
  // eigener Text für dieses Objekt: Rückfrage, Unterschrift entfernt
  await page.locator('details', { hasText: 'Text ändern' }).locator('summary').click();
  await page.locator('#oa_text_eingabe').fill('Eigener Text für dieses Objekt.');
  await page.locator('#oa_text_eingabe').press('Tab');
  await expect(page.locator('#oa_text')).toHaveText('Eigener Text für dieses Objekt.');
  await expect(page.locator('#oa_pruefung')).toContainText('Noch nicht unterschrieben.');
  expect(meldungen).toContain('Mit dem neuen Text werden die Unterschriften entfernt. Fortfahren?');
  await keineSkriptfehler(page);
});

test('Zwei Eigentümer, Wohnungseigentum, Fahrplan, Kundenakte; Auskunft und Löschen beim Kunden (D61)', async ({ page }) => {
  dialoge(page);
  const pid = await objekt(page, { od_eigentum: 'Wohnungseigentum (WEG)' });
  await page.evaluate(async pid => {
    wzOeffnen('objektauskunft'); await oaOeffnen(pid);
    const r = OA.aktiv; r.kundeIds = ['k_e', 'k_m'];
    r.antworten.sonderumlage = { wert: 'ja', text: 'Dachsanierung, Beschluss vom 12.05.2026' }; r.sonderumlageBetrag = '4.000';
  }, pid);
  await restNein(page);
  await expect(frage(page, 'sonderumlage')).toHaveCount(1);                            // Wohnungseigentum aus der Bewertung
  await expect(page.locator('#wz_objektauskunft_sonderumlageBetrag')).toHaveValue('4.000');
  await unterschreiben(page, 'k_e');
  await expect(page.locator('#oa_pruefung')).toContainText('Unterschrieben: 1 von 2.');
  await unterschreiben(page, 'k_m');
  await expect(page.locator('#oa_pruefung')).toContainText(/Von allen 2 Eigentümern unterschrieben, zuletzt am 29\.0?9\.2026/);
  // Verkaufsfahrplan: Erweiterungspunkt meldet den Schritt
  expect(await page.evaluate(pid => fpAuto(wzdObjekt(pid)).objektauskunft, pid)).toBe(true);
  await page.evaluate(() => wzSchliessen());
  await page.evaluate(() => wzOeffnen('objektauskunft'));
  await expect(page.locator('#wz_body .kd-karte', { hasText: 'Testhaus' })).toContainText('unterschrieben am');
  await page.evaluate(() => wzSchliessen());
  // Kundenakte zeigt die Auskunft
  await page.evaluate(() => kdOeffnen('k_m'));
  await expect(page.locator('#kd_overlay')).toContainText('Objektauskunft');
  await expect(page.locator('#kd_overlay .kd-karte', { hasText: 'Testhaus' })).toContainText('unterschrieben am');
  await page.evaluate(() => kdSchliessen());
  // Auskunft nach Art. 15 DSGVO
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_e')))).flat().join('\n'));
  expect(auskunft).toMatch(/OBJEKTAUSKÜNFTE \(ANGABEN ALS EIGENTÜMER\)\n- Testhaus: als Eigentümer, 12 von 12 Fragen beantwortet, unterschrieben am 29\.0?9\.2026; Unterschrift gespeichert/);
  expect(auskunft).toContain('  Sonderumlagen: ja — Dachsanierung, Beschluss vom 12.05.2026');
  // Löschen: Verweis und Unterschrift der gelöschten Person weg, die andere Unterschrift bleibt gültig
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_e'); });
  const r = await page.evaluate(async () => (await iaAlle('akten')).find(x => x.art === 'objektauskunft'));
  expect(r.kundeIds).toEqual(['k_m']);
  expect(Object.keys(r.unterschriften)).toEqual(['k_m']);
  expect(JSON.stringify(r)).not.toMatch(/k_e|Erika|Probeeigentümer/);
  expect(await page.evaluate(() => oaPruefen(wzdAkten('objektauskunft')[0]).gueltig)).toEqual(['k_m']);
  const nach = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_e')))).flat().join('\n'));
  expect(nach).toMatch(/OBJEKTAUSKÜNFTE \(ANGABEN ALS EIGENTÜMER\)\n- keine/);
  await keineSkriptfehler(page);
});
