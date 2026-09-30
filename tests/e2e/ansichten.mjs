/* Gemeinsame Prüfung der Oberfläche für Desktop (Chromium) und iPhone (WebKit): alle Hauptansichten öffnen,
   kein waagrechtes Scrollen, keine Skriptfehler, Bildschirmfotos zur Sichtkontrolle nach tests/ausgabe/. */
import { expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG, GRUNDRISS_TEST } from '../fixtures/medien.mjs';
import { LIEGENSCHAFT_TEST } from '../fixtures/verwaltung.mjs';

export async function alleAnsichten(page, geraet) {
  const ordner = 'tests/ausgabe/ansichten_' + geraet + '/';
  mkdirSync(ordner, { recursive: true });
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  const breite = page.viewportSize().width;
  const pruefe = async (name, vorher, arg) => {
    if (vorher) await page.evaluate(vorher, arg);
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const d = document.documentElement, zuBreit = [];
      document.querySelectorAll('body *').forEach(e => {
        const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
        let p = e.parentElement, geclippt = false;
        while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o !== 'visible') { geclippt = true; break; } p = p.parentElement; }
        if (geclippt) return;
        const b = e.getBoundingClientRect(); if (b.width > 0 && b.right > d.clientWidth + 1) zuBreit.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(b.right));
      });
      return { scroll: d.scrollWidth, sicht: d.clientWidth, zuBreit: zuBreit.slice(0, 5) };
    });
    await page.screenshot({ path: ordner + name + '.png' });
    expect(r.scroll, name + ': waagrechtes Scrollen, zu breit: ' + r.zuBreit.join(', ')).toBeLessThanOrEqual(r.sicht + 1);
  };
  await pruefe('01_startseite');
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_anbau_niessbrauch_vergleich'));
  await page.evaluate(({ foto, gr }) => {
    $('ek_anschrift').value = 'Musterweg 7, 74360 Ilsfeld';
    PHOTOS = [{ id: 'f1', cat: 'objekt', data: foto, caption: 'Ansicht' }]; GRUNDRISSE = [{ id: 'g1', darst: 'aufteilung', d: gr }];
    compute(); renderPhotos(); grListen();
  }, { foto: FOTO_JPEG, gr: GRUNDRISS_TEST });
  const abschnitte = await page.evaluate(() => [...document.querySelectorAll('main section.card[id]')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id));
  expect(abschnitte.length).toBeGreaterThan(15);
  for (const id of abschnitte) await pruefe('abschnitt_' + id, i => { document.getElementById(i).scrollIntoView(); }, id);
  if (breite < 800) await pruefe('10_cockpit_blatt', () => { document.body.classList.add('cp-open'); });
  await page.evaluate(() => document.body.classList.remove('cp-open'));
  await pruefe('11_bericht', () => { druckbericht(); window.scrollTo(0, 0); });
  await pruefe('12_expose', () => { exposeAnzeigen(); window.scrollTo(0, 0); });
  await page.evaluate(() => document.body.classList.remove('report-mode'));
  await pruefe('13_finanzierung', () => finOeffnen());
  await page.evaluate(() => finSchliessen());
  await pruefe('14_kundenakte', () => kdOeffnen());
  await page.evaluate(() => kdSchliessen());
  await pruefe('15_projekte', () => oeffneProjekte());
  await page.evaluate(() => schliesseProjekte());
  await pruefe('16_marktueberblick', () => mdbOeffnen());
  await page.evaluate(() => mdbClose());
  await page.evaluate(async x => { await lvStart(); await lvSpeichern(JSON.parse(JSON.stringify(x))); }, LIEGENSCHAFT_TEST);
  await pruefe('16a_verwaltung_uebersicht', () => lvOeffnen('uebersicht'));
  await pruefe('16b_verwaltung_ueberblick', () => lvLiegenschaftOeffnen('Ltest1', 'ueberblick'));
  await pruefe('16c_verwaltung_einheiten', () => { lvReiter('einheiten'); LV.form = { typ: 'einheit', id: null }; lvRender(); });
  await pruefe('16d_verwaltung_vertrag', () => { lvReiter('vertraege'); LV.form = { typ: 'vertrag', id: 'Vt1' }; lvRender(); });
  await pruefe('16e_verwaltung_mietkonto', () => { LV.vertragId = 'Vt1'; lvReiter('mietkonto'); });
  await pruefe('16f_verwaltung_fristen', () => lvAnsicht('fristen'));
  await pruefe('16g_verwaltung_sicherung', () => lvAnsicht('sicherung'));
  const nk = JSON.parse(readFileSync('tests/referenz/verwaltung_faelle.json', 'utf8')).nebenkosten;
  await page.evaluate(async ({ l, cfg }) => { l.name = 'Gartenstraße 3'; l.nkAbrechnungen = [Object.assign({ id: 'Nx1' }, cfg)]; await lvSpeichern(l); }, { l: nk.liegenschaft, cfg: nk.cfg });
  await pruefe('16h_verwaltung_nk_kosten', () => { lvLiegenschaftOeffnen('LN', 'nebenkosten'); LV.nkJahr = 2025; LV.nkAnsicht = 'kosten'; LV.form = { typ: 'kosten', id: null }; lvRender(); });
  await pruefe('16i_verwaltung_nk_abrechnung', () => { LV.form = null; LV.nkAnsicht = 'abrechnung'; lvRender(); });
  await page.evaluate(() => lvSchliessen());
  await pruefe('17_suche', () => sucheOeffnen());
  await page.keyboard.press('Escape');
  await pruefe('18_praesentation', () => vpStarten());
  await page.evaluate(() => vpSchliessen());
  await keineSkriptfehler(page);
}
