/* iPhone (WebKit, Safari-Engine, 390 × 664 Ansicht): Ansichten, Selbsttest und Rechnung.
   Simuliert — ersetzt nicht die Prüfung auf einem echten Gerät (Face ID, Kamera, GPS, Teilen-Menü). */
import { test, expect } from '@playwright/test';
import { alleAnsichten } from './ansichten.mjs';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { SZENARIEN } from '../fixtures/szenarien.mjs';

test('iPhone: alle Ansichten ohne waagrechtes Scrollen', async ({ page }) => {
  test.setTimeout(180_000);
  await alleAnsichten(page, 'iphone');
});

test('iPhone: Selbsttest und Referenzbewertung in der Safari-Engine', async ({ page }) => {
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, SZENARIEN.find(s => s.name === 'haus_referenz'));
  await expect(page.locator('#mb_empf')).toHaveText('472.970 €');
  await page.addScriptTag({ url: '/selbsttest.js' });
  const erg = await page.evaluate(() => window.iaSelbsttest().filter(e => !e.ok).map(e => e.gruppe + ': ' + e.name));
  expect(erg).toEqual([]);
  await keineSkriptfehler(page);
});

test('iPhone: Bedienleiste unten ist mit dem Finger erreichbar (mind. 44 px)', async ({ page }) => {
  await appOeffnen(page); await arbeitsflaeche(page);
  const hoehen = await page.evaluate(() => [...document.querySelectorAll('#mbar button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)));
  expect(hoehen.length).toBeGreaterThanOrEqual(4);
  for (const h of hoehen) expect(h).toBeGreaterThanOrEqual(44);
});

test('iPhone: App-Bereiche, kurze Eingabeschritte und beide Farbschemata',async({page})=>{
 await appOeffnen(page);const nav=page.getByRole('navigation',{name:'Hauptbereiche'});
 for(const [name,target] of [['Objekte','#projekt_overlay'],['Markt','#mdb_overlay'],['Mehr','#app_more'],['Übersicht','#start-step0']]){
  await nav.getByRole('button',{name,exact:true}).click();await expect(page.locator(target)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 }
 await page.screenshot({animations:'disabled',path:'tests/ausgabe/app-iphone-uebersicht.png'});
 await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));await page.evaluate(()=>appOpenObject());await expect(page.locator('#app_object_value')).toHaveText('472.970 €');
 await page.screenshot({animations:'disabled',path:'tests/ausgabe/app-iphone-objekt.png'});
 // alle Abschnitte untereinander; Abschnittsleiste oben springt zum Hauptgebäude
 expect(await page.locator('main section.card:visible').count()).toBeGreaterThanOrEqual(20);
 await page.locator('nav.side a[data-sec="s-hg"]').click();await expect(page.locator('#s-hg>h2')).toBeInViewport();
 const details=page.locator('#s-hg details.app-disclosure');expect(await details.count()).toBeGreaterThanOrEqual(3);
 const rnd=page.locator('#s-hg details.app-disclosure>summary').filter({hasText:'Restnutzungsdauer'});
 await expect(page.locator('#mod_p0')).toBeVisible();await rnd.click();await expect(page.locator('#mod_p0')).toBeHidden();await rnd.click();await expect(page.locator('#mod_p0')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await page.screenshot({animations:'disabled',path:'tests/ausgabe/app-iphone-besichtigung.png'});
 await page.evaluate(()=>themeApply('dark'));await page.evaluate(()=>appOpenObject());await page.screenshot({animations:'disabled',path:'tests/ausgabe/app-iphone-dunkel.png'});
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 const colors=await page.evaluate(()=>['#mbar button[aria-current="page"]','nav.side a[aria-current="location"]','#exportMenu>button'].map(selector=>{const c=getComputedStyle(document.querySelector(selector));return {selector,fg:c.color,bg:c.backgroundColor};}));
 const lum=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 for(const c of colors){const a=lum(c.fg),b=lum(c.bg);expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05),c.selector+' Textkontrast').toBeGreaterThanOrEqual(4.5);}
 await keineSkriptfehler(page);
});
