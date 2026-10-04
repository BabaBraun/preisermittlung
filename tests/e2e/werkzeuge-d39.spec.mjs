/* Notarauftrag, Portal-Export und Datenstand (D39) im Browser: Übernahme aus Bewertung und Kundenakte, Ampeln, Dokument,
   Kalenderdatei, Wiedervorlagen, Übergabeprotokoll, Datenbank und Gesamtsicherung; Export als ZIP mit XML und Bildern
   (unabhängig gelesen mit tests/referenz/pruefe_openimmo.py); Datenstand mit Zahl auf der Kachel. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler, JETZT } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('json');
const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
const inhalt = async dl => Buffer.concat(await (await dl.createReadStream()).toArray());
async function bewertungMitKunden(page) {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(async foto => {
    await kdSpeichern({ id: 'k_verk', vorname: 'Erika', nachname: 'Musterfrau', strasse: 'Musterweg 7', plzort: '74360 Ilsfeld', telefon: '07062 1', email: 'erika@example.org', kontakte: [], finanzierungen: [], erstellt: 1 });
    await kdSpeichern({ id: 'k_kauf', vorname: 'Max', nachname: 'Beispiel', strasse: 'Hauptstraße 1', plzort: '71717 Beilstein', email: 'max@example.org', kontakte: [], finanzierungen: [], erstellt: 2 });
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; $('ek_kunde_id').value = 'k_verk';
    $('od_grundbuch').value = 'AG Heilbronn, Grundbuch von Ilsfeld'; $('od_gb_blatt').value = '1234'; $('od_flst_nrn').value = '567/1';
    $('vm_status').value = 'In Vermarktung'; $('vm_preis').value = '489.000'; $('ex_provision').value = '3,57 % inkl. MwSt.';
    $('vm_daten').value = JSON.stringify({ ev: [{ id: 'v1', d: '2026-09-20', art: 'Reservierung', wer: 'Max Beispiel', kid: 'k_kauf', rueck: 'positiv', notiz: '', preis: 0 }] });
    $('ex_k_name').value = 'Erika Beispielberaterin'; $('ex_k_mail').value = 'beratung@example.org'; $('ex_k_tel').value = '07062 0';
    $('ex_ea_art').value = 'Verbrauchsausweis'; $('ex_ea_wert').value = '118,4'; $('ex_ea_traeger').value = 'Erdgas'; $('ex_ea_klasse').value = 'D'; $('ex_ea_baujahr').value = '1972';
    $('ex_text_objekt').value = 'Gepflegtes Haus mit Garten.';
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht Süd' }, { id: 'f2', cat: 'schaden', data: foto, caption: 'Riss im Putz' }];
    compute();
  }, FOTO_JPEG);
}

test('Notarauftrag: aus Bewertung und Kundenakte, Ampeln, Dokument, Kalender, Wiedervorlagen, Übergabe, Sicherung, Löschen (D39)', async ({ page, browser }) => {
  const meldungen = dialoge(page);
  await bewertungMitKunden(page);
  await page.evaluate(() => wzOeffnen('notar'));
  await page.getByRole('button', { name: 'Aus der geöffneten Bewertung' }).click();
  await expect(page.locator('#wz_notar_anschrift')).toHaveValue('Musterweg 7, 74360 Ilsfeld');
  await expect(page.locator('#wz_notar_grundbuch')).toHaveValue('AG Heilbronn, Grundbuch von Ilsfeld');
  await expect(page.locator('#wz_notar_verkaeufer_0_name')).toHaveValue('Erika Musterfrau');
  await expect(page.locator('#wz_notar_kaeufer_0_name')).toHaveValue('Max Beispiel');
  await expect(page.locator('#wz_notar_kaufpreis')).toHaveValue('489.000');
  // ohne oder mit unfertigem Termin (Datumsfeld im Browser) kein Absturz, sondern ein Hinweis
  await page.evaluate(() => { NO.aktiv.termin = '2026-1'; });
  await page.getByRole('button', { name: 'Wiedervorlagen anlegen' }).click();
  await page.getByRole('button', { name: 'Termin in den Kalender' }).click();
  await expect.poll(() => meldungen.filter(m => m.includes('gültigen Wunschtermin')).length).toBe(2);
  // Provision: Käufer mehr als Verkäufer bei Einfamilienhaus und Verbraucher → rot (§§ 656c, 656d BGB)
  await page.locator('#wz_notar_art').selectOption('Einfamilienhaus (auch Doppel- oder Reihenhaus)');
  await page.locator('#wz_notar_provVerkaeufer').fill('2,38 % inkl. MwSt.');
  await expect(page.locator('#no_prov .wz-ampel')).toHaveClass(/wz-rot/);
  await page.locator('#wz_notar_provVerkaeufer').fill('3,57 % inkl. MwSt.');
  await expect(page.locator('#no_prov .wz-ampel')).toHaveClass(/wz-gruen/);
  // Frist: Termin in 10 Tagen, Verkäufer Unternehmer → rot (§ 17 Abs. 2a BeurkG); in 40 Tagen → grün mit Datum
  await page.locator('#wz_notar_termin').fill('2026-10-09');
  await page.locator('#wz_notar_verkaeuferUnternehmer').check();
  await expect(page.locator('#no_frist .wz-ampel')).toHaveClass(/wz-rot/);
  await expect(page.locator('#no_frist')).toContainText('§ 17 Abs. 2a Satz 2 Nr. 2 BeurkG');
  await page.locator('#wz_notar_termin').fill('2026-11-09');
  await page.locator('#wz_notar_uhrzeit').fill('10:30');
  await page.locator('#wz_notar_notar').fill('Notariat Beispiel');
  await expect(page.locator('#no_frist .wz-ampel')).toHaveClass(/wz-gruen/);
  await expect(page.locator('#no_frist')).toContainText('26.10.2026');
  // Kalenderdatei
  const [ics] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Termin in den Kalender' }).click()]);
  expect(ics.suggestedFilename()).toBe('Notartermin Musterweg 7, 74360 Ilsfeld.ics');
  const t = (await inhalt(ics)).toString('utf8');
  expect(t).toContain('DTSTART:20261109T103000'); expect(t).toContain('LOCATION:Notariat Beispiel');
  // Wiedervorlagen: Entwurf und Termin
  await page.getByRole('button', { name: 'Wiedervorlagen anlegen' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('2 Wiedervorlagen angelegt');
  const wv = await page.evaluate(() => aufLoad().filter(a => /Musterweg 7/.test(a.objekt)).map(a => a.frist).sort());
  expect(wv).toEqual(['2026-10-26', '2026-11-09']);
  // gespeichert in der Datenbank, nicht im localStorage
  await expect.poll(async () => (await page.evaluate(async () => (await iaAlle('notar')).map(n => n.termin)))).toEqual(['2026-11-09']);
  expect(await page.evaluate(() => (localStorage.getItem('ia_wz') || '').includes('Musterfrau'))).toBe(false);
  // Dokument
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Angaben für den Kaufvertragsentwurf');
  await expect(page.locator('#report .wzd')).toContainText('Erika Musterfrau');
  await expect(page.locator('#report .wzd')).toContainText('489.000 €');
  await expect(page.locator('#report .wzd')).toContainText('Steuer-Identifikationsnummern der Beteiligten erhebt das Notariat');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  // Übergabeprotokoll mit den Namen
  await page.getByRole('button', { name: 'Übergabeprotokoll anlegen' }).click();
  await expect(page.locator('#wz_titel')).toHaveText('Übergabeprotokoll');
  await expect(page.locator('#wz_uebergabe_uebergeber')).toHaveValue('Erika Musterfrau');
  await expect(page.locator('#wz_uebergabe_uebernehmer')).toHaveValue('Max Beispiel');
  // Gesamtsicherung enthält den Auftrag und spielt ihn ein
  await page.evaluate(() => wzSchliessen());
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const text = (await inhalt(dl)).toString('utf8');
  const d = JSON.parse(text);
  expect(d.notar.length).toBe(1); expect(d.notar[0].kaeufer[0].name).toBe('Max Beispiel');
  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(t => pjSicherungAusText(t), text);
  await expect.poll(() => m2.join('|')).toContain('Notaraufträge: 1');
  expect(await p2.evaluate(async () => (await iaAlle('notar'))[0].termin)).toBe('2026-11-09');
  await ctx.close();
  // Löschen
  await page.evaluate(() => { wzOeffnen('notar'); noZurListe(); });
  await expect(page.locator('#wz_body tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Notarauftrag löschen' }).click();
  await expect(page.locator('#wz_body')).toContainText('Noch kein Notarauftrag');
  expect(await page.evaluate(async () => (await iaAlle('notar')).length)).toBe(0);
  await keineSkriptfehler(page);
});

test('Portal-Export: gesichertes Objekt als ZIP mit XML und Bild, danach Änderung und vom Markt nehmen (D39)', async ({ page }) => {
  test.skip(!PY && !process.env.CI, 'Python fehlt');   // in GitHub Actions Pflicht
  const meldungen = dialoge(page);
  await bewertungMitKunden(page);
  await page.evaluate(async () => { $('pj_name').value = 'Export Test'; await projektSichern(); });
  await page.evaluate(() => wzOeffnen('portal'));
  await expect(page.locator('.pt-karte')).toHaveCount(1);
  await expect(page.locator('.pt-karte')).toContainText('Export Test');
  await expect(page.locator('.pt-karte .wz-ampel')).toHaveClass(/wz-gelb|wz-gruen/);
  // ohne Firma kein Export
  await page.getByRole('button', { name: 'Ausgewählte exportieren' }).click();
  await expect.poll(() => meldungen.join('|')).toContain('Firma des Anbieters');
  await page.locator('#wz_portal_firma').fill('Beispielbank eG');
  await page.locator('#wz_portal_firma').blur();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ausgewählte exportieren' }).click()]);
  expect(dl.suggestedFilename()).toBe('Portal-Export 2026-09-29.zip');
  const pfad = AUSGABE + 'portal-export.zip'; await dl.saveAs(pfad);
  const r = pythonJson(PY, ['tests/referenz/pruefe_openimmo.py', pfad]);
  expect(r.uebertragung.umfang).toBe('TEIL');
  expect(r.anbieter_werte.firma).toBe('Beispielbank eG');
  const i = r.immobilien[0];
  expect(i.werte['geo/plz']).toBe('74360'); expect(i.werte['geo/strasse']).toBeUndefined();     // Anschrift nicht freigegeben
  expect(i.werte['preise/kaufpreis']).toBe('489000');
  expect(i.werte['kontaktperson/name']).toBe('Beispielberaterin');
  expect(i.werte['zustand_angaben/energiepass/energieverbrauchkennwert']).toBe('118.4');
  expect(i.attrs['anhaenge/anhang'].gruppe).toBe('TITELBILD');
  expect(r.dateien).toContain(i.werte['anhaenge/anhang/daten/pfad']);       // nur das Objektfoto, nicht das Schadensfoto
  expect(r.dateien.length).toBe(2);
  expect(JSON.stringify(r)).not.toContain('Musterfrau');                    // keine Kundennamen
  // zweiter Export: Änderung; dann vom Markt nehmen
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ausgewählte exportieren' }).click()]);
  await dl2.saveAs(AUSGABE + 'portal-export-2.zip');
  expect(pythonJson(PY, ['tests/referenz/pruefe_openimmo.py', AUSGABE + 'portal-export-2.zip']).immobilien[0].attrs['verwaltung_techn/aktion']).toEqual({ aktionart: 'CHANGE' });
  const [dl3] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Vom Portal nehmen' }).click()]);
  await dl3.saveAs(AUSGABE + 'portal-export-3.zip');
  const r3 = pythonJson(PY, ['tests/referenz/pruefe_openimmo.py', AUSGABE + 'portal-export-3.zip']);
  expect(r3.immobilien[0].attrs['verwaltung_techn/aktion']).toEqual({ aktionart: 'DELETE' }); expect(r3.dateien.length).toBe(1);
  await expect(page.locator('.pt-karte')).toContainText('vom Portal genommen am 29.9.2026');
  await keineSkriptfehler(page);
});

test('Datenstand: Zahl auf der Kachel, Einträge mit Stand und Quelle, Sicherung als fällig, Dokument (D39)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => { await dsAktualisieren(); appSetTab('home'); });
  // 29.09.2026: Baupreisindex August bald (erwartet 10.10.), BMF-Tabelle 2027 erst ab Oktober
  await expect(page.locator('#ds_badge')).toHaveText('1');
  await page.evaluate(async () => { $('pj_name').value = 'Sicherung Test'; $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld'; await projektSichern(); });
  await page.evaluate(() => wzOeffnen('datenstand'));
  // Liste und Anzeige stimmen überein — auch wenn die Prüfung kurz nach dem Start erst nach dem Öffnen fertig wird
  await expect.poll(async () => (await page.locator('#wz_body .ds-zeile').count()) === await page.evaluate(() => DS.erg.liste.length)).toBe(true);
  await page.getByRole('button', { name: 'Neu prüfen' }).click();
  const zeile = page.locator('.ds-zeile', { hasText: 'Gesamtsicherung' });
  await expect(zeile).toHaveClass(/wz-rot/);
  await expect(zeile).toContainText('Noch keine Gesamtsicherung');
  await expect(page.locator('.ds-zeile', { hasText: 'Baupreisindex' })).toContainText('Mai 2026');
  await expect(page.locator('.ds-zeile', { hasText: 'Baupreisindex' })).toHaveClass(/wz-gelb/);
  const [dl] = await Promise.all([page.waitForEvent('download'), zeile.getByRole('button', { name: 'Jetzt sichern' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^ImmoApp Projekte/);
  await expect(page.locator('.ds-zeile', { hasText: 'Gesamtsicherung' })).toHaveClass(/wz-gruen/);
  await page.getByRole('button', { name: 'Dokument' }).click();
  await expect(page.locator('#report .wzd h1')).toHaveText('Datenstand der ImmoApp');
  await expect(page.locator('#report .wzd')).toContainText('Rechengrundlagen der App');
  await page.locator('#report .ex-leiste button', { hasText: 'zurück' }).click();
  await page.evaluate(() => wzSchliessen());
  await expect(page.locator('#ds_badge')).toHaveText('1');
  await keineSkriptfehler(page);
});

test('Datenstand: offene Kachel übernimmt eine Prüfung, die erst nach dem Öffnen fertig wird (Befund der CI, 04.10.2026)', async ({ page }) => {
  dialoge(page);
  await appOeffnen(page);
  await page.evaluate(async () => { await dsAktualisieren(); wzOeffnen('datenstand'); });
  const loeschen = page.locator('#wz_body .ds-zeile', { hasText: 'Kundendaten: Löschung prüfen' });
  await expect(loeschen).toHaveCount(0);
  // neue Prüfung im Hintergrund (wie die Prüfung kurz nach dem Start), ohne dass jemand die Kachel neu aufbaut
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_lp', anrede: 'Frau', vorname: 'Ida', nachname: 'Loeschbeispiel', grundlage: 'vertrag', loeschpruefung: '2026-09-01', kontakte: [], finanzierungen: [], erstellt: 1 });
    await dsAktualisieren();
  });
  await expect(loeschen).toContainText('1 fällig');
  await expect.poll(async () => (await page.locator('#wz_body .ds-zeile').count()) === await page.evaluate(() => DS.erg.liste.length)).toBe(true);
  await keineSkriptfehler(page);
});
