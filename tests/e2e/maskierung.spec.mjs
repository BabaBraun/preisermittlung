/* Nutzereingaben und importierte Daten dürfen in Bericht, Exposé, Präsentation und Listen nicht als HTML oder
   JavaScript wirken. Alle Textfelder werden mit einer Nutzlast gefüllt, dazu ein manipuliertes Foto. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';
import { FOTO_JPEG } from '../fixtures/medien.mjs';

const NUTZLAST = '<img src=x onerror="window.__xss=(window.__xss||0)+1">"\'><b>fett</b>';

test('keine Ausführung eingeschleuster Inhalte in Dokumenten und Listen', async ({ page }) => {
  await appOeffnen(page);
  await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await page.evaluate(({ last, foto }) => {
    // alle Freitextfelder (keine Zahlenfelder, damit die Bewertung gültig bleibt)
    document.querySelectorAll('input[type=text],input:not([type]),textarea').forEach(e => {
      if (!e.id || e.closest('#mdb_overlay,#suche,#fin_overlay,#kd_overlay,#pq_overlay,#vm_overlay,#gr_overlay,#lv_overlay')) return;
      const zahl = /^-?[\d.,\s]*$/.test(e.defaultValue) && e.defaultValue !== '';
      if (!zahl && !/_(base|val)\d?$/.test(e.id)) e.value = last;
    });
    PHOTOS = [
      { id: "x');window.__xss=99;('", cat: 'objekt', data: foto, caption: last },
      { id: 'p2', cat: 'objekt', data: 'javascript:window.__xss=98', caption: 'kaputt' },
      { id: 'p3', cat: 'schaden', data: '" onerror="window.__xss=97', caption: last }
    ];
    SIGNATURE = '" onerror="window.__xss=96';
    compute(); renderPhotos(); renderSignature();
  }, { last: NUTZLAST, foto: FOTO_JPEG });

  const pruefe = async (was) => {
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => ({ xss: window.__xss || 0, onerror: document.querySelectorAll('[onerror]').length, fett: document.querySelectorAll('#report b').length }));
    expect(r.xss, was + ': Skript ausgeführt').toBe(0);
    expect(r.onerror, was + ': onerror-Attribut im DOM').toBe(0);
  };
  await pruefe('Formular und Galerie');
  await page.evaluate(() => druckbericht());
  await expect(page.locator('#report')).toContainText('<img src=x');
  await pruefe('Bericht');
  await page.evaluate(() => exposeAnzeigen());
  await pruefe('Exposé');
  await page.evaluate(() => { try { vmBericht(); } catch (e) { window.__fehler = String(e); } });
  await pruefe('Vermarktungsbericht');
  await page.evaluate(() => { try { druckeUnterlagen(); } catch (e) {} });
  await pruefe('Unterlagenliste');
  await page.evaluate(() => { document.body.classList.remove('report-mode'); try { vpStarten(); } catch (e) {} });
  await pruefe('Präsentation');
  await page.evaluate(() => { try { vpSchliessen(); } catch (e) {} projektSichern && projektSichern(); });
  await page.evaluate(() => { try { oeffneProjekte(); } catch (e) {} });
  await pruefe('Projektliste');
  await page.evaluate(() => { try { sucheOeffnen(); } catch (e) {} });
  await page.keyboard.type('img');
  await pruefe('Suche');
});
