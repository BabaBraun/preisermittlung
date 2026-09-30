import {test,expect} from '@playwright/test';
import {appOeffnen,fallAnwenden} from './helfer.mjs';
import {SZENARIEN} from '../fixtures/szenarien.mjs';
test('vier klare Hauptbereiche sind mit der Tastatur erreichbar',async({page})=>{
 await appOeffnen(page);const nav=page.getByRole('navigation',{name:'Hauptbereiche'});await expect(nav.getByRole('button')).toHaveCount(4);
 await nav.getByRole('button',{name:'Mehr',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Werkzeuge & Einstellungen'})).toBeVisible();
 await nav.getByRole('button',{name:'Übersicht',exact:true}).click();await expect(page.locator('#start-step0')).toBeVisible();
});
test('Bewertung: alle Abschnitte untereinander wie früher, Abschnitte und Blöcke auf- und zuklappbar, Eingaben bleiben',async({page})=>{
 await appOeffnen(page);await page.getByRole('button',{name:'Neue Bewertung',exact:true}).click();await page.getByRole('button',{name:'Wohnhaus',exact:true}).click();await page.getByRole('button',{name:'Wohnhaus nach BGF',exact:true}).click();
 // Reihenfolge wie früher: ① Eckdaten, ①b Aufnahmebogen, ② Hauptgebäude … mit Nummer vor der Überschrift
 const ids=await page.locator('main>section.card:visible').evaluateAll(l=>l.map(s=>s.id));
 expect(ids.slice(0,6)).toEqual(['s-eck','s-aufnahme','s-hg','s-anbau','s-technik','s-grundlagen']);expect(ids.length).toBeGreaterThanOrEqual(20);
 await expect(page.locator('#s-eck>h2 .step')).toHaveText('1');await expect(page.locator('#s-hg>h2 .step')).toHaveText('2');
 await page.locator('#ek_anschrift').fill('Übersichtstraße 7');
 // Abschnitt zuklappen: Inhalt weg, Überschrift bleibt; Zustand bleibt nach dem Neuladen erhalten
 await page.locator('#s-eck .app-sec-toggle').click();await expect(page.locator('#ek_anschrift')).toBeHidden();await expect(page.locator('#s-eck>h2')).toBeVisible();
 await expect(page.locator('#s-eck .app-sec-toggle')).toHaveAttribute('aria-expanded','false');
 // Block im Abschnitt: „4.4 Lage“ zu- und aufklappen
 const lage=page.locator('#s-technik details.app-disclosure').filter({has:page.locator('summary',{hasText:'4.4 Lage'})});
 await expect(lage).toHaveAttribute('open','');await lage.locator('summary').click();await expect(lage).not.toHaveAttribute('open','');
 await page.reload();await expect(page.locator('#s-eck')).toHaveClass(/app-zu/);await expect(lage).not.toHaveAttribute('open','');
 // Sprung über die Abschnittsliste öffnet den Abschnitt wieder; die Eingabe ist unverändert
 await page.locator('nav.side a[data-sec="s-eck"]').click();await expect(page.locator('#ek_anschrift')).toBeVisible();await expect(page.locator('#ek_anschrift')).toHaveValue('Übersichtstraße 7');
 await page.getByRole('button',{name:'Alle zuklappen'}).click();await expect(page.locator('main>section.card.app-zu:visible')).toHaveCount(ids.length);
 await page.getByRole('button',{name:'Alle aufklappen'}).click();await expect(page.locator('main>section.card.app-zu')).toHaveCount(0);await expect(lage).toHaveAttribute('open','');
});
test('Prüfhinweise öffnen das richtige Feld und Browser-Zurück behält den Kontext',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>appShowSection('s-eck'));await page.locator('#ek_anschrift').fill('Prüfstraße 4');await page.evaluate(()=>appShowSection('s-hg'));await page.goBack();await expect(page.locator('#s-eck')).toBeVisible();await expect(page.locator('#ek_anschrift')).toHaveValue('Prüfstraße 4');
});
test('Objektübersicht verwendet die berechneten Werte und keine vorgetäuschte Vollständigkeit',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));await page.evaluate(()=>appOpenObject());await expect(page.locator('#app_object_value')).toHaveText('472.970 €');
 await page.evaluate(()=>{apply({ek_brw:'kaputt'});});await expect(page.locator('#app_object_value')).toHaveText('Eingaben prüfen');
});

test('Hauptnavigation bleibt tatsächlich anklickbar und liegt vor der Startfläche',async({page})=>{
 await appOeffnen(page);const nav=page.getByRole('navigation',{name:'Hauptbereiche'});
 await nav.getByRole('button',{name:'Mehr',exact:true}).click();await expect(page.locator('#app_more')).toBeVisible();
 await nav.getByRole('button',{name:'Übersicht',exact:true}).click();await expect(page.locator('#start-step0')).toBeVisible();
});

test('globale Suche öffnet gespeicherte Projekte auch aus Mehr',async({page})=>{
 page.on('dialog',d=>d.accept());await appOeffnen(page);
 await page.evaluate(async()=>{const p={id:'suchtest1',name:'Gespeicherte Gartenstraße',data:{fields:{ek_anschrift:'Gartenstraße 9'}}};await iaPut('projekte',p);pjCacheSetzen(p);appSetTab('more');});
 await page.getByRole('button',{name:'Objekt suchen',exact:true}).click();await page.locator('#suche_q').fill('Gartenstraße');await page.locator('#suche_liste .suche-row').filter({hasText:'Gespeicherte Gartenstraße'}).click();
 await expect(page.locator('#s-eck')).toBeVisible();await expect(page.locator('#app_header_title')).toHaveText('Gartenstraße 9');
});

test('globale Suche zeigt die aktuelle Bewertung aus der Objektliste',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{apply({ek_anschrift:'Aktuelle Talstraße'});appSetTab('objects');});
 await page.getByRole('button',{name:'Objekt suchen',exact:true}).click();await page.locator('#suche_q').fill('Aktuelle Talstraße');await page.locator('#suche_liste .suche-row').filter({hasText:'Aktuelle Talstraße'}).click();await expect(page.locator('#s-eck')).toBeVisible();
});
