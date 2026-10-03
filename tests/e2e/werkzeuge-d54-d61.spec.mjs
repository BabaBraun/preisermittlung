/* D54–D61 im Zusammenspiel: Verkaufsfahrplan mit den Schritten der neuen Kacheln (Geldwäsche nur intern), Hinweise aus anderen
   Kacheln im Notarauftrag, Kunde aus einem Tipp mit Datenschutzinformation „von Dritten“. Nur synthetische Daten; Testuhr 29.09.2026. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

async function objekt(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async () => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('vm_status').value = 'In Vermarktung'; $('ex_preis').value = '480.000';
    $('pj_name').value = 'Testhaus'; compute(); await projektSichern(); await wzdLaden(true);
    await kdSpeichern({ id: 'k_v', anrede: 'Frau', vorname: 'Erika', nachname: 'Verkaufbeispiel', grundlage: 'vertrag', kontakte: [], finanzierungen: [], erstellt: 1 });
  });
  return page.evaluate(() => pjLoad().find(p => p.name === 'Testhaus').id);
}

test('Verkaufsfahrplan: neue Schritte der Kacheln, Geldwäsche nur intern und nicht in der Übersicht für den Eigentümer', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const pid = await objekt(page);
  await page.evaluate(() => wzOeffnen('fahrplan'));
  await page.locator('.fp-karte').getByRole('button', { name: 'Öffnen' }).click();
  for (const t of ['Maklervertrag geschlossen', 'Objektauskunft des Eigentümers unterschrieben', 'Verkäuferseite geklärt']) await expect(page.locator('.fp-schritt', { hasText: t })).toHaveCount(1);
  // nur bei Eintrag im Schlüsselbuch bzw. in „Vermietet verkaufen“
  for (const t of ['Schlüssel übernommen', 'Vorkaufsrecht des Mieters']) await expect(page.locator('.fp-schritt', { hasText: t })).toHaveCount(0);
  const gwg = page.locator('.fp-schritt', { hasText: 'Geldwäsche' });
  await expect(gwg).toContainText('offen — nur intern');
  await expect(gwg.locator('input[type="checkbox"]')).toBeDisabled();
  const dok = await page.evaluate(() => fpDokument().html);
  expect(dok).not.toContain('Geldwäsche');
  expect(dok).toContain('Objektauskunft des Eigentümers unterschrieben');
  // Eintrag in „Vermietet verkaufen“ → Schritt Vorkaufsrecht erscheint
  await page.evaluate(async pid => { await vvNeu(pid); wzOeffnen('fahrplan'); FP.aktiv = pid; wzZeichnen(); }, pid);
  await expect(page.locator('.fp-schritt', { hasText: 'Vorkaufsrecht des Mieters' })).toHaveCount(1);
  await keineSkriptfehler(page);
});

test('Notarauftrag zeigt, was andere Kacheln melden: Geldwäsche-Prüfung offen, vermietet ohne Prüfung', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await objekt(page);
  await page.evaluate(async () => {
    await iaPut('notar', Object.assign(noLeer(), { id: 'no_t', anschrift: 'Musterweg 7, 74360 Ilsfeld', raeumung: 'vermietet',
      verkaeufer: [Object.assign(noPerson(), { kundeId: 'k_v', name: 'Erika Verkaufbeispiel' })] }));
    wzOeffnen('notar'); await noLaden(); noOeffnenAuftrag('no_t');
  });
  const box = page.locator('#no_pruef');
  await expect(box).toContainText('Geldwäsche-Prüfung: noch nicht identifiziert — Erika Verkaufbeispiel');
  await expect(box).toContainText('Vorkaufsrecht, Sperrfrist und Kaution in der Kachel „Vermietet verkaufen“ prüfen');
  // Datenblatt für das Notariat enthält davon nichts
  const dok = await page.evaluate(() => WZ.reg.notar.dokument(NO.aktiv).html);
  expect(dok).not.toContain('Geldwäsche');
  await box.getByRole('button', { name: 'Vermietet verkaufen' }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Vermietet verkaufen');
  await keineSkriptfehler(page);
});

test('Kunde aus einem Tipp: Datenschutzinformation „von Dritten“ mit Quelle und Datum in der Kundenakte (Art. 14 DSGVO)', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  await page.evaluate(async () => {
    wzOeffnen('tipps'); await wzdLaden();
    tpS().geber = [{ id: 'tg_1', name: 'Erika Beispiel', filiale: 'Filiale Musterstadt', art: 'kundenberater', email: 'erika.beispiel@example.org' }]; wzSpeichernJetzt();
    const t = tpLeer({ datum: '2026-09-20', geberId: 'tg_1' }); await wzdSpeichern('akten', t); await tpOeffnen(t.id);
    TP.kn = { anrede: 'Herr', vorname: 'Max', nachname: 'Tippbeispiel', telefon: '07062 3', email: '' }; await tpKundeNeu();
  });
  const k = await page.evaluate(() => KD_CACHE.find(x => x.nachname === 'Tippbeispiel'));
  expect([k.werbung.dsinfo.art, k.werbung.dsinfo.quelle, k.werbung.dsinfo.erlangtAm]).toEqual(['dritter', 'Tipp aus Filiale Musterstadt', '2026-09-20']);
  expect(JSON.stringify(k)).not.toContain('Erika Beispiel');   // kein Name des Tippgebers in der Akte des Kunden
  const st = await page.evaluate(() => ImmoWerbung.dsinfoStand(KD_CACHE.find(x => x.nachname === 'Tippbeispiel'), '2026-09-29'));
  expect([st.stufe, st.faelligBis]).toEqual(['gelb', '2026-10-20']);
  await keineSkriptfehler(page);
});
