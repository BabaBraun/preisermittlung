import {test,expect} from '@playwright/test';
import {appOeffnen,fallAnwenden} from './helfer.mjs';
import {SZENARIEN} from '../fixtures/szenarien.mjs';
test('vier klare Hauptbereiche sind mit der Tastatur erreichbar',async({page})=>{
 await appOeffnen(page);const nav=page.getByRole('navigation',{name:'Hauptbereiche'});await expect(nav.getByRole('button')).toHaveCount(4);
 await nav.getByRole('button',{name:'Mehr',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Werkzeuge & Einstellungen'})).toBeVisible();
 await nav.getByRole('button',{name:'Übersicht',exact:true}).click();await expect(page.locator('#start-step0')).toBeVisible();
});
test('Bewertung zeigt gezielte Schritte und bewahrt Eingaben beim Wechsel',async({page})=>{
 await appOeffnen(page);await page.getByRole('button',{name:'Neue Bewertung',exact:true}).click();await page.getByRole('button',{name:'Wohnhaus',exact:true}).click();await page.getByRole('button',{name:'Wohnhaus nach BGF',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Dein Objekt'})).toBeVisible();await page.getByRole('button',{name:'Objektangaben',exact:true}).click();
 await expect(page.locator('main section.card:visible')).toHaveCount(1);await page.locator('#ek_anschrift').fill('Übersichtstraße 7');
 await page.getByRole('navigation',{name:'Bewertungsschritte'}).getByRole('button',{name:'Besichtigung',exact:true}).click();await page.getByRole('button',{name:'Aufnahmebogen',exact:true}).click();await expect(page.locator('#s-aufnahme')).toBeVisible();await expect(page.locator('#s-ertrag')).toBeHidden();
 await page.getByRole('navigation',{name:'Bewertungsschritte'}).getByRole('button',{name:'Objekt',exact:true}).click();await page.getByRole('button',{name:'Objektangaben',exact:true}).click();await expect(page.locator('#ek_anschrift')).toHaveValue('Übersichtstraße 7');
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
 await expect(page.getByRole('heading',{name:'Dein Objekt',exact:true})).toBeVisible();await expect(page.locator('#app_header_title')).toHaveText('Gartenstraße 9');
});

test('globale Suche zeigt die aktuelle Bewertung aus der Objektliste',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{apply({ek_anschrift:'Aktuelle Talstraße'});appSetTab('objects');});
 await page.getByRole('button',{name:'Objekt suchen',exact:true}).click();await page.locator('#suche_q').fill('Aktuelle Talstraße');await page.locator('#suche_liste .suche-row').filter({hasText:'Aktuelle Talstraße'}).click();await expect(page.getByRole('heading',{name:'Dein Objekt',exact:true})).toBeVisible();
});
