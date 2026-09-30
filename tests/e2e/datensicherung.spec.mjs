/* Datensicherung: vollständiger Ablauf, Datei-Export/-Import, Gesamtsicherung, Marktdaten mit PDF-Anhang,
   beschädigte Dateien, voller Speicher, fehlende Datenbank und ältere Dateiformate. Nur synthetische Daten. */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';

const AUSGABE = 'tests/ausgabe/';
mkdirSync(AUSGABE, { recursive: true });
const FALL = SZENARIEN.find(s => s.name === 'haus_anbau_niessbrauch_vergleich');

function dialoge(page) {
  const liste = [];
  page.on('dialog', async d => { liste.push(d.message()); await d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'x') : undefined); });
  return liste;
}
async function bewertungMitMedien(page, adresse) {
  await fallAnwenden(page, FALL);
  await page.evaluate(({ foto, gr, adresse }) => {
    $('ek_anschrift').value = adresse; $('pj_name').value = adresse;
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht' }, { id: 'f2', cat: 'schaden', data: foto, caption: 'Riss' }];
    GRUNDRISSE = [{ id: 'g1', darst: 'aufteilung', d: gr }];
    SIGNATURE = foto; fotosGeaendert(); compute(); renderPhotos(); grListen(); renderSignature();
  }, { foto: FOTO_JPEG, gr: GRUNDRISS_TEST, adresse });
}
const zustand = page => page.evaluate(() => JSON.stringify({ s: snapshot(), R: window._R }));
async function dateiWaehlen(page, aufruf, pfad) {
  // Die Datei wird über einen echten Klick gewählt (auch nach mehreren Importen gültige Benutzeraktivierung).
  const name=aufruf.toString();let button;
  if(name.includes('loadFile')){
    await page.getByRole('button',{name:'Export',exact:true}).click();button=page.getByRole('button',{name:'Datei öffnen',exact:true});
  }else if(name.includes('pjSicherungEinspielen')){
    await page.getByRole('navigation',{name:'Hauptbereiche'}).getByRole('button',{name:'Objekte',exact:true}).click();button=page.locator('button[onclick="pjSicherungEinspielen()"]');
  }else if(name.includes('mdbImport')){
    await page.getByRole('navigation',{name:'Hauptbereiche'}).getByRole('button',{name:'Markt',exact:true}).click();await page.locator('#mdbt_sich').click();button=page.locator('button[onclick="mdbImport()"]');
  }else throw new Error('Unbekannter Importablauf im Test.');
  const [fc]=await Promise.all([page.waitForEvent('filechooser'),button.click()]);await fc.setFiles(pfad);
}

test('vom neuen Projekt bis zum wieder geöffneten Bericht: Werte stimmen überall überein', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await bewertungMitMedien(page, 'Musterweg 7, 74360 Ilsfeld');
  const vorher = await zustand(page);
  const empf = await page.evaluate(() => $('r_empfehlung').textContent);
  await page.evaluate(() => projektSichern());
  await expect.poll(() => meldungen.join('|')).toContain('gesichert');
  await page.evaluate(() => new Promise(r => setTimeout(r, 600)));   // Fotos werden gebündelt gespeichert

  await page.reload();
  await page.waitForFunction(() => window.IA_BEREIT_P !== undefined); await page.evaluate(() => window.IA_BEREIT_P);
  expect(await zustand(page), 'offene Bewertung nach Neuladen').toBe(vorher);

  await page.evaluate(() => { $('ek_anschrift').value = 'anders'; compute(); });
  const id = await page.evaluate(() => pjLoad()[0].id);
  await page.evaluate(i => projektLaden(i), id);
  await expect.poll(() => zustand(page)).toBe(vorher);
  expect(await page.evaluate(() => pjLoad()[0].empf)).toBe(empf);
  await page.evaluate(() => druckbericht());
  const berichtWert = await page.locator('#report tr.total', { hasText: 'Empfohlener Preisansatz' }).locator('td').last().textContent();
  expect(berichtWert).toBe(empf);
  expect(await page.locator('#report .cover .val').textContent()).toBe(empf);
  expect(await page.locator('#report .fotos img').count()).toBe(2);
  await keineSkriptfehler(page);
});

test('Bewertung als Datei sichern und in einem leeren Browser wieder öffnen (mit Fotos, Grundriss, Unterschrift)', async ({ page, browser }) => {
  dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await bewertungMitMedien(page, 'Dateiweg 3, 74360 Ilsfeld');
  const vorher = await zustand(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => save())]);
  const pfad = AUSGABE + 'bewertung.json'; await dl.saveAs(pfad);

  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); dialoge(p2);
  await appOeffnen(p2); await arbeitsflaeche(p2);
  await dateiWaehlen(p2, () => loadFile(), pfad);
  await expect.poll(() => p2.evaluate(() => document.getElementById('ek_anschrift').value)).toBe('Dateiweg 3, 74360 Ilsfeld');
  expect(JSON.parse(await zustand(p2))).toEqual(JSON.parse(vorher));
  await ctx.close();
});

test('Gesamtsicherung: Projekte, Kunden und Wiedervorlagen wandern vollständig auf ein leeres Gerät', async ({ page, browser }) => {
  const m1 = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await bewertungMitMedien(page, 'Erstes Objekt 1');
  await page.evaluate(() => projektSichern());
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'etw_referenz'));
  await page.evaluate(() => { $('pj_name').value = 'Zweites Objekt 2'; return projektSichern(); });
  await page.evaluate(async () => {
    await kdSpeichern({ id: 'k_test', vorname: 'Erika', nachname: 'Musterfrau', kontakte: [{ id: 'c1', ts: 1, datum: '2026-09-01', art: 'Gespräch', text: 'Erstgespräch (synthetisch)' }], finanzierungen: [], erstellt: 1 });
    aufStore(aufLoad().concat([{ id: 'a_test', text: 'Unterlagen anfordern', frist: '2026-10-05', objekt: '', kundeId: 'k_test', erledigt: false, angelegt: 1 }]));
  });
  const vorher = await page.evaluate(async () => ({ p: (await iaAlle('projekte')).map(p => ({ id: p.id, name: p.name, fotos: (p.data.photos || []).length, gr: (p.data.grundrisse || []).length })).sort((a, b) => a.id < b.id ? -1 : 1),
    k: await iaAlle('kunden'), a: aufLoad() }));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => pjAlleSichern())]);
  const pfad = AUSGABE + 'gesamtsicherung.json'; await dl.saveAs(pfad);

  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); const m2 = dialoge(p2);
  await appOeffnen(p2);
  await dateiWaehlen(p2, () => pjSicherungEinspielen(), pfad);
  await expect.poll(() => m2.join('|')).toContain('Sicherung eingespielt');
  const nachher = await p2.evaluate(async () => ({ p: (await iaAlle('projekte')).map(p => ({ id: p.id, name: p.name, fotos: (p.data.photos || []).length, gr: (p.data.grundrisse || []).length })).sort((a, b) => a.id < b.id ? -1 : 1),
    k: await iaAlle('kunden'), a: aufLoad() }));
  expect(nachher.p).toEqual(vorher.p);
  expect(nachher.k).toEqual(vorher.k);
  expect(nachher.a).toEqual(vorher.a);
  await ctx.close();
});

test('Marktüberblick: Sicherung mit PDF-Anhang byte-genau übertragen', async ({ page, browser }) => {
  dialoge(page);
  await appOeffnen(page);
  const pdf = '%PDF-1.4\n% synthetisches Exposé\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n';
  await page.evaluate(async (pdf) => {
    await mdbPut({ id: 'o_test', gemeinde: 'Ilsfeld', art: 'EFH', kp: 390000, wfl: 140, datum: '2026-05-01', pdfs: [{ id: 'a_test', name: 'Exposé.pdf' }] });
    await mdbAPut({ id: 'a_test', objId: 'o_test', name: 'Exposé.pdf', size: pdf.length, blob: new Blob([pdf], { type: 'application/pdf' }) });
    await mdbLaden();
  }, pdf);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => mdbBackup(true))]);
  const pfad = AUSGABE + 'marktdaten_komplett.json'; await dl.saveAs(pfad);

  const ctx = await browser.newContext(); const p2 = await ctx.newPage(); dialoge(p2);
  await appOeffnen(p2);
  await p2.evaluate(() => mdbOeffnen());
  await dateiWaehlen(p2, () => mdbImport(), pfad);
  await expect.poll(() => p2.evaluate(async () => (await mdbAll()).length)).toBe(1);
  const r = await p2.evaluate(async () => { const o = (await mdbAll())[0], a = await mdbAGet('a_test'); return { o, text: a ? await a.blob.text() : null }; });
  expect(r.o.gemeinde).toBe('Ilsfeld');
  expect(r.o.kp).toBe(390000);
  expect(r.text).toBe(pdf);
  await ctx.close();
});

test('beschädigte und falsche Dateien: verständliche Meldung, nichts wird überschrieben', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await bewertungMitMedien(page, 'Bleibt unverändert 1');
  await page.evaluate(() => projektSichern());
  await page.evaluate(async () => { await mdbPut({ id: 'o_bleibt', gemeinde: 'Beilstein' }); await mdbLaden(); });
  const vorher = await zustand(page);
  const zaehler = () => page.evaluate(async () => ({ p: (await iaAlle('projekte')).length, m: (await mdbAll()).length }));
  const bestand = await zaehler();
  const datei = (name, inhalt) => { const p = AUSGABE + name; writeFileSync(p, inhalt); return p; };
  const gut = readFileSync(AUSGABE + 'bewertung.json', 'utf8');
  const faelle = [
    ['abgeschnitten.json', gut.slice(0, Math.floor(gut.length / 2)), /beschädigt oder unvollständig/],
    ['leer.json', '', /leer/],
    ['fremd.json', JSON.stringify({ hallo: 'welt' }), /keine Bewertung/],
    ['markt_statt_bewertung.json', JSON.stringify({ typ: 'vb-marktdaten', objekte: [] }), /Marktüberblick/]
  ];
  for (const [name, inhalt, erwartet] of faelle) {
    meldungen.length = 0;
    await dateiWaehlen(page, () => loadFile(), datei(name, inhalt));
    await expect.poll(() => meldungen.join('|')).toMatch(erwartet);
    expect(meldungen.join('|')).toContain('bleibt unverändert');
    expect(await zustand(page), name).toBe(vorher);
  }
  for (const [aufruf, name, inhalt] of [[() => pjSicherungEinspielen(), 'sicherung_kaputt.json', '{"typ":"immoapp-projekte","projekte":[{"id":"p1"'],
    [() => pjSicherungEinspielen(), 'sicherung_leer.json', JSON.stringify({ typ: 'immoapp-projekte', projekte: [{ id: 'p1' }, 7] })],
    [() => mdbImport(), 'markt_kaputt.json', '[{"id":"o1",'], [() => mdbImport(), 'markt_fremd.json', JSON.stringify({ typ: 'immoapp-projekte', projekte: [] })]]) {
    meldungen.length = 0;
    await dateiWaehlen(page, aufruf, datei(name, inhalt));
    await expect.poll(() => meldungen.join('|')).toMatch(/nichts verändert|bleibt unverändert/);
    expect(await zaehler(), name).toEqual(bestand);
  }
  await keineSkriptfehler(page);
});

test('voller Speicher: Import bricht vollständig ab, Arbeitsstand meldet den Fehler sichtbar', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  await bewertungMitMedien(page, 'Speichertest 1');
  await page.evaluate(() => projektSichern());
  await page.evaluate(async () => { await mdbPut({ id: 'o_alt', gemeinde: 'Abstatt' }); await mdbLaden(); });
  const sicherung = JSON.stringify({ typ: 'immoapp-projekte', version: 2, projekte: [{ id: 'p_neu1', name: 'Neu 1', geaendert: 5, data: { fields: { ek_brw: '1' } } }, { id: 'p_neu2', name: 'Neu 2', geaendert: 5, data: { fields: { ek_brw: '2' } } }] });
  const markt = JSON.stringify({ typ: 'vb-marktdaten', objekte: [{ id: 'o_neu1', ts: 9 }, { id: 'o_neu2', ts: 9 }] });
  const zaehler = () => page.evaluate(async () => ({ p: (await iaAlle('projekte')).length, m: (await mdbAll()).length }));
  const bestand = await zaehler();
  await page.evaluate(() => {
    window.__put = IDBObjectStore.prototype.put;
    let n = 0;
    IDBObjectStore.prototype.put = function (...a) { if (++n >= 2) throw new DOMException('Speicher voll (Test)', 'QuotaExceededError'); return window.__put.apply(this, a); };
  });
  await page.evaluate(t => pjSicherungAusText(t), sicherung);
  await expect.poll(() => meldungen.join('|')).toContain('Speicher des Geräts ist voll');
  await page.evaluate(() => { let n = 0; IDBObjectStore.prototype.put = function (...a) { if (++n >= 2) throw new DOMException('Speicher voll (Test)', 'QuotaExceededError'); return window.__put.apply(this, a); }; });
  const markErg = await page.evaluate(async t => { const s = ImmoDaten.marktSicherungPruefen(JSON.parse(t)); try { await mdbImportSchreiben(s.objekte, s.anhaenge); return 'ok'; } catch (e) { return iaFehlerText(e); } }, markt);
  expect(markErg).toContain('Speicher des Geräts ist voll');
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.__put; });
  expect(await zaehler(), 'nichts halb geschrieben').toEqual(bestand);

  // Arbeitsstand: localStorage voll
  await page.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('voll', 'QuotaExceededError'); }; });
  await page.locator('#ek_anschrift').fill('Speichertest 2');
  await expect(page.locator('#speicher_warn')).toBeVisible();
  await expect(page.locator('#speicher_warn_t')).toContainText('Speicher');
  await page.evaluate(() => { Storage.prototype.setItem = window.__set; });
  await page.locator('#ek_anschrift').fill('Speichertest 3');
  await expect(page.locator('#speicher_warn')).toBeHidden();
});

test('ohne IndexedDB (z. B. gesperrt): App rechnet, Projekte landen im Rückfallspeicher, Hinweis bei der Kundenakte', async ({ page }) => {
  const meldungen = dialoge(page);
  await page.addInitScript(() => {
    const fehlschlag = () => { const r = {}; setTimeout(() => { r.error = new DOMException('Datenbank gesperrt (Test)', 'UnknownError'); if (r.onerror) r.onerror({ target: r }); }, 0); return r; };
    Object.defineProperty(window, 'indexedDB', { configurable: true, get: () => ({ open: fehlschlag, deleteDatabase: fehlschlag }) });
  });
  await appOeffnen(page); await arbeitsflaeche(page);
  expect(await page.evaluate(() => IA_DB_BEREIT)).toBe(false);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await expect(page.locator('#r_empfehlung')).toHaveText('472.970 €');
  await page.evaluate(() => { $('pj_name').value = 'Ohne Datenbank'; return projektSichern(); });
  await expect.poll(() => meldungen.join('|')).toContain('gesichert');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(PJ_KEY)).length)).toBe(1);
  await page.evaluate(() => kdOeffnen());
  await expect.poll(() => meldungen.join('|')).toContain('Gerätedatenbank');
  await keineSkriptfehler(page);
});

test('ältere Dateiformate: flache Bewertung und Projektsicherung Version 1', async ({ page }) => {
  const meldungen = dialoge(page);
  await appOeffnen(page); await arbeitsflaeche(page);
  const alt = AUSGABE + 'altformat.json';
  writeFileSync(alt, JSON.stringify({ ek_modus: 'haus', ek_anschrift: 'Altformat 1', ek_gs_flaeche: '600', ek_brw: '300', er_bewirt: '20', ek_miete_wohnen: '12000' }));
  await dateiWaehlen(page, () => loadFile(), alt);
  await expect.poll(() => page.evaluate(() => $('ek_anschrift').value)).toBe('Altformat 1');
  expect(await page.evaluate(() => num('ek_gs_flaeche'))).toBe(600);
  const v1 = AUSGABE + 'sicherung_v1.json';
  writeFileSync(v1, JSON.stringify([
    { id: 'p1700000000000', name: 'Alt flach', data: { ek_anschrift: 'Alt flach', ek_brw: '100' } },
    { id: 'p1700000000001', name: 'Alt mit Fotos', data: { fields: { ek_anschrift: 'Alt mit Fotos' }, photos: [{ id: 'x', cat: 'objekt', data: FOTO_JPEG }] } }
  ]));
  await dateiWaehlen(page, () => pjSicherungEinspielen(), v1);
  await expect.poll(() => meldungen.join('|')).toContain('2 neu');
  await page.evaluate(() => projektLaden('p1700000000001'));
  await expect.poll(() => page.evaluate(() => $('ek_anschrift').value)).toBe('Alt mit Fotos');
  expect(await page.evaluate(() => PHOTOS.length)).toBe(1);
  await page.evaluate(() => projektLaden('p1700000000000'));
  await expect.poll(() => page.evaluate(() => $('ek_anschrift').value)).toBe('Alt flach');
  await keineSkriptfehler(page);
});
