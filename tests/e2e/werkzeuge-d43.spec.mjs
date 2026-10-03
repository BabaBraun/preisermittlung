/* Kachel „Unterlagen“ (D43) im Browser: Liste nach Objektart, „liegt vor“ aus dem Aufnahmebogen, Stand ändern, Anforderung je
   Stelle als Schreiben, Vollmacht mit Unterschrift, Verkaufsfahrplan, Kundenakte und Gesamtsicherung. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());

test('Unterlagen: Aufnahmebogen, Stand, Anforderung bei der Gemeinde, Vollmacht mit Unterschrift, Fahrplan, Kundenakte, Sicherung (D43)', async ({ page, browser }) => {
  dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_eig', anrede: 'Frau', vorname: 'Erika', nachname: 'Eigentümerbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'Auftrag erteilt'; $('ek_kunde_id').value = 'k_eig';
    $('od_grundbuch').value = 'Ilsfeld'; $('od_gb_blatt').value = '1234';
    $('au_ul0').checked = true; $('au_ul4').checked = true;   // Grundbuchauszug und Energieausweis liegen laut Aufnahmebogen vor
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
  });
  await page.evaluate(() => wzOeffnen('unterlagen'));
  await expect(page.locator('#wz_body .kd-karte')).toContainText('Testhaus');
  await page.locator('#wz_body .kd-karte').getByRole('button', { name: 'Öffnen' }).click();
  const zeile = t => page.locator('.ul-posten', { hasText: t });
  await expect(zeile('Grundbuchauszug')).toHaveClass(/ul-da/);
  await expect(zeile('Grundbuchauszug')).toContainText('Aufnahmebogen');
  await expect(zeile('Energieausweis')).toHaveClass(/ul-da/);
  await expect(page.locator('.ul-posten', { hasText: 'Teilungserklärung mit Gemeinschaftsordnung' })).toHaveCount(0);   // Haus: keine Unterlagen der Wohnungseigentümer
  const gesamt = await page.locator('.ul-posten').count();
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('2 von ' + gesamt);
  await zeile('Flurkarte').locator('select').selectOption('da');
  await expect(zeile('Flurkarte')).toHaveClass(/ul-da/);
  await expect(page.locator('#wz_body .wz-kpis')).toContainText('3 von ' + gesamt);
  // Anforderung bei der Gemeinde: Schreiben mit allen offenen Unterlagen dieser Stelle, danach „angefordert“
  await page.locator('.ul-gruppe', { hasText: 'Gemeinde (Bauverwaltung)' }).getByRole('button', { name: /Anfordern/ }).click();
  const dok = page.locator('#report .wzd');
  await expect(dok.locator('h1')).toHaveText('Anforderung von Unterlagen');
  for (const t of ['Auskunft aus dem Baulastenverzeichnis', 'Bescheinigung über Erschließungsbeiträge', 'Grundbuch von Ilsfeld, Blatt 1234', 'Erika Eigentümerbeispiel'])
    await expect(dok).toContainText(t);
  await expect(dok).not.toContainText('Grundbuchauszug');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await expect(zeile('Baulastenverzeichnis')).toHaveClass(/ul-angefordert/);
  // Vollmacht: Eigentümer aus der Bewertung, Unterschrift durch Ziehen, Dokument mit Unterschrift
  const box = page.locator('.mdb-box', { hasText: 'Vollmacht des Eigentümers' });
  await expect(box).toContainText('Erika Eigentümerbeispiel');
  await expect(box).toContainText('Musterweg 7, 74360 Ilsfeld');
  const c = box.locator('canvas.ul-pad'); await c.scrollIntoViewIfNeeded();
  const b = await c.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 30); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 30, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (UL.aktiv.vollmacht.unterschrift || '').slice(0, 22))).toBe('data:image/png;base64,');
  await box.getByRole('button', { name: 'Vollmacht als Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Vollmacht');
  await expect(page.locator('#report .wzd-unterschriften img')).toHaveCount(1);
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Wohnung: Unterlagen der Wohnungseigentümer kommen dazu
  await page.locator('#wz_unterlagen_art').selectOption('w');
  await expect(zeile('Teilungserklärung mit Gemeinschaftsordnung')).toBeVisible();
  await page.locator('#wz_unterlagen_art').selectOption('h');
  await expect.poll(() => page.evaluate(async () => (await iaAlle('unterlagen'))[0].art)).toBe('h');
  // Verkaufsfahrplan erkennt die Unterlagen
  await page.evaluate(() => wzOeffnen('fahrplan'));
  await page.locator('.fp-karte').getByRole('button', { name: 'Öffnen' }).click();
  for (const t of ['Unterlagen beim Eigentümer angefordert', 'Grundbuchauszug liegt vor', 'Flurkarte oder Lageplan liegt vor'])
    await expect(page.locator('.fp-schritt', { hasText: t })).toContainText('erkannt');
  await expect(page.locator('.fp-schritt', { hasText: 'Auskunft aus dem Baulastenverzeichnis' })).not.toContainText('erkannt');
  // Auskunft und Sicherung
  const auskunft = await page.evaluate(async () => (await Promise.all(KD_AUSKUNFT_HOOKS.map(h => h('k_eig')))).flat().join('\n'));
  expect(auskunft).toContain('VOLLMACHTEN ZUM EINHOLEN VON UNTERLAGEN');
  expect(auskunft).toMatch(/Testhaus: Erika Eigentümerbeispiel, unterschrieben am/);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const text = (await inhalt(dl)).toString('utf8'), d = JSON.parse(text);
  expect(d.unterlagen.length).toBe(1);
  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(t => pjSicherungAusText(t), text);
  await expect.poll(() => m2.join('|')).toContain('Unterlagen: 1 neu oder aktualisiert.');
  await ctx.close();
  // Kunde löschen: Name und Unterschrift verschwinden aus der Vollmacht
  await page.evaluate(() => wzSchliessen());
  await page.evaluate(async () => { for (const h of KD_LOESCH_HOOKS) await h('k_eig'); });
  const v = await page.evaluate(async () => (await iaAlle('unterlagen'))[0].vollmacht);
  expect([v.name, v.unterschrift]).toEqual(['', '']);
  await keineSkriptfehler(page);
});
