import {test,expect} from '@playwright/test';
import {appOeffnen,fallAnwenden,keineSkriptfehler} from './helfer.mjs';
import {SZENARIEN} from '../fixtures/szenarien.mjs';
test('vier klare Hauptbereiche sind mit der Tastatur erreichbar',async({page})=>{
 await appOeffnen(page);const nav=page.getByRole('navigation',{name:'Hauptbereiche'});await expect(nav.getByRole('button')).toHaveCount(4);
 await nav.getByRole('button',{name:'Mehr',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Werkzeuge & Einstellungen'})).toBeVisible();
 await nav.getByRole('button',{name:'Übersicht',exact:true}).click();await expect(page.locator('#start-step0')).toBeVisible();
});
test('Bewertung: Gliederung Eckdaten, Aufnahmebogen, Objektdaten, Allgemeine Angaben, Hauptgebäude …, Abschnitte und Blöcke auf- und zuklappbar, Eingaben bleiben',async({page})=>{
 await appOeffnen(page);await page.getByRole('button',{name:'Neue Bewertung',exact:true}).click();await page.getByRole('button',{name:'Wohnhaus',exact:true}).click();
 // Gliederung (D35): Eckdaten, Aufnahmebogen, Objektdaten & Beschreibung, Allgemeine Angaben, Hauptgebäude, Anbau,
 // Datengrundlagen …, Nummern fortlaufend 1, 2, 3 …
 const ids=await page.locator('main>section.card:visible').evaluateAll(l=>l.map(s=>s.id));
 expect(ids.slice(0,10)).toEqual(['s-eck','s-aufnahme','s-technik','s-allg','s-hg','s-anbau','s-grundlagen','s-substanz','s-vergleich','s-ertrag']);expect(ids.length).toBe(24);
 expect(ids.slice(10)).toEqual(['s-niess','s-erbbau','s-wk','s-pv','s-energie','s-sanierung','s-fotos','s-empfehlung','s-belwert','s-rendite','s-sign','s-expose','s-praesentation','s-vermarktung']);
 await expect(page.locator('#s-eck>h2 .step')).toHaveText('1');await expect(page.locator('#s-aufnahme>h2 .step')).toHaveText('2');await expect(page.locator('#s-technik>h2 .step')).toHaveText('3');
 await expect(page.locator('#s-allg>h2 .step')).toHaveText('4');await expect(page.locator('#s-hg>h2 .step')).toHaveText('5');await expect(page.locator('#s-vermarktung>h2 .step')).toHaveText('24');
 await page.locator('#ek_anschrift').fill('Übersichtstraße 7');
 // Abschnitt zuklappen: Inhalt weg, Überschrift bleibt; Zustand bleibt nach dem Neuladen erhalten
 await page.locator('#s-eck .app-sec-toggle').click();await expect(page.locator('#ek_anschrift')).toBeHidden();await expect(page.locator('#s-eck>h2')).toBeVisible();
 await expect(page.locator('#s-eck .app-sec-toggle')).toHaveAttribute('aria-expanded','false');
 // Block im Abschnitt „Objektdaten & Beschreibung“ (Abschnitt 3): „3.1 Lage“ zu- und aufklappen; Reihenfolge der Blöcke
 const lage=page.locator('#s-technik details.app-disclosure').filter({has:page.locator('summary[data-titel="Lage"]')});
 await expect(lage.locator('summary')).toHaveText('3.1 Lage');
 expect(await page.locator('#s-technik details.app-disclosure>summary').evaluateAll(l=>l.map(s=>s.dataset.titel))).toEqual(['Lage','Lage-Check mit amtlichen Karten',
  'Gebäudedaten','Grundstück, Grundbuch & Recht','Planungsrecht','Grundstück & Gebäude (Beschreibung)','Zustand & Bautechnik','Rechtliches & Vermarktung']);
 // Grundrisse und Raumliste stehen unter „Allgemeine Angaben“ hinter „Flächen & Baujahr“ (D36)
 const titel=sel=>page.locator(sel+' details.app-disclosure>summary').evaluateAll(l=>l.filter(s=>s.checkVisibility()).map(s=>s.dataset.titel));
 expect(await titel('#s-aufnahme')).toEqual(['Räume & Flächen','Technik & Ausstattung','Bauteile & Ausstattungsstandard (fließt in den Gebäudepreis)',
  'Modernisierungen (fließen in die Restnutzungsdauer)','Besondere Bauteile (anhaken, was vorhanden ist)','Unterlagen (anhaken, was vorliegt)','Feststellungen vor Ort']);
 expect(await titel('#s-allg')).toEqual(['Grundstück','Flächen & Baujahr','Grundrisse','Raumliste & Wohnfläche nach WoFlV','Erträge (Netto-Kaltmiete je Jahr)']);
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
test('Neue Bewertung: nur die Objektart wählen, danach öffnet sich gleich die Bewertung; Zusätze schaltet man dort zu',async({page})=>{
 await appOeffnen(page);await page.getByRole('button',{name:'Neue Bewertung',exact:true}).click();
 await expect(page.locator('#start-step1 .tile')).toHaveText([/Eigentumswohnung/,/^Wohnhaus/,/Wohn- und Geschäftshaus/,/Laden \/ Büro \/ Praxis/,/Gewerbe \/ Betrieb/]);
 await expect(page.locator('#start-step2')).toHaveCount(0);
 await page.getByRole('button',{name:'Eigentumswohnung',exact:true}).click();
 await expect(page.locator('body')).toHaveClass(/started/);await expect(page.locator('#app_object_type')).toHaveText('Eigentumswohnung');
 expect(await page.evaluate(()=>[$('ek_modus').value,$('ek_wtyp').value,$('niess_aktiv').checked,$('pv_aktiv').checked])).toEqual(['wohnung','Etagenwohnung',false,false]);
 // Nießbrauch und PV-Anlage in der Bewertung zuschalten
 await page.locator('#niess_aktiv').check();await page.locator('#pv_aktiv').check();
 expect(await page.evaluate(()=>[$('niess_aktiv').checked,$('pv_aktiv').checked])).toEqual([true,true]);
 // Gewerbe: Gebäudeart passend vorbelegt, Anbau im Abschnitt „Anbau / Nebengebäude“
 await page.getByRole('navigation',{name:'Hauptbereiche'}).getByRole('button',{name:'Übersicht',exact:true}).click();
 await page.getByRole('button',{name:'Neue Bewertung',exact:true}).click();await page.getByRole('button',{name:'Gewerbe / Betrieb',exact:true}).click();
 expect(await page.evaluate(()=>[$('ek_modus').value,$('ek_typ').value,$('gewichtung').value])).toEqual(['haus','Betriebs-/Werkstattgebäude · eingeschossig','0.3']);
 await expect(page.locator('#s-anbau')).toBeVisible();
});
test('Effizienzklasse von Hand bleibt schon beim ersten Auswählen, auch mit eingetragenem Energiekennwert',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);$('en_aktiv').checked=true;$('en_kennwert').value='210';delete $('en_klasse').dataset.manuell;compute();});
 await expect(page.locator('#en_klasse')).toHaveValue('G');   // aus dem Energiekennwert
 await page.locator('#en_klasse').selectOption('B');
 await expect(page.locator('#en_klasse')).toHaveValue('B');
 expect(await page.evaluate(()=>{compute();return [$('en_klasse').value,$('en_klasse').dataset.manuell];})).toEqual(['B','1']);
});
test('Sanierungsweg: Übernahme sagt Bescheid, wenn nichts einzutragen ist, und übernimmt sonst den Kennwert',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{pickVordruck('wh_bgf');appAlleKlappen(true);});await page.locator('#san_aktiv').check();
 const knopf=page.getByRole('button',{name:'Aus Aufnahmebogen und Energetischer Qualität übernehmen'});
 const meldung=new Promise(r=>page.once('dialog',d=>{r(d.message());d.accept();}));
 await knopf.click();expect(await meldung).toMatch(/nichts zum Übernehmen/);
 await page.evaluate(()=>{$('en_kennwert').value='180';});
 await knopf.click();await expect(page.locator('#san_e0')).toHaveValue('180');
});
test('Dateinamen: ohne Anschrift einfach „Preisermittlung“, mit Anschrift wie bisher',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{pickVordruck('wh_bgf');$('ek_anschrift').value='';compute();});
 expect(await page.evaluate(()=>pdfName())).toBe('Preisermittlung.pdf');
 const [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>exportExcel())]);
 expect(dl.suggestedFilename()).toBe('Preisermittlung.xlsx');
 await page.evaluate(()=>{$('ek_anschrift').value='Musterweg 7, 74360 Ilsfeld';});
 expect(await page.evaluate(()=>pdfName())).toBe('Preisermittlung Musterweg 7 74360 Ilsfeld.pdf');
});
test('Handzeiger nur bei klickbaren Tabellen: Markt-Bestand ja, Tilgungsplan nein',async({page})=>{
 await appOeffnen(page);
 await page.evaluate(()=>finOeffnen());await expect(page.locator('#fin_plan tbody tr').first()).toBeAttached();
 expect(await page.evaluate(()=>['#fin_plan th','#fin_plan tbody tr'].map(s=>getComputedStyle(document.querySelector(s)).cursor))).toEqual(['auto','auto']);
 await page.evaluate(()=>finSchliessen());
 await page.evaluate(async()=>{await mdbPut({id:'o_t1',gemeinde:'Musterstadt',art:'EFH',basis:'KP',kp:300000,wfl:120,baujahr:1990,datum:'2026-05-01'});await mdbOeffnen();mdbTab('liste');});
 await expect(page.locator('#mdb_tbl tbody tr').first()).toBeVisible();
 expect(await page.evaluate(()=>['#mdb_tbl th','#mdb_tbl tbody tr'].map(s=>getComputedStyle(document.querySelector(s)).cursor))).toEqual(['pointer','pointer']);
});
test('Neue Bewertung aus der Kundenakte: Objektart wählen, Kunde zugeordnet und als Auftraggeber eingetragen',async({page})=>{
 await appOeffnen(page);
 await page.evaluate(async()=>{await kdSpeichern({id:'k_neu',vorname:'Erika',nachname:'Musterfrau',kontakte:[],finanzierungen:[],erstellt:1});kdOeffnen('k_neu');});
 await page.locator('#kd_overlay').getByRole('button',{name:'Neue Bewertung für diesen Kunden'}).click();
 await expect(page.locator('#start_fuer')).toHaveText(/Neue Bewertung für Erika Musterfrau/);
 await page.getByRole('button',{name:'Eigentumswohnung',exact:true}).click();
 await expect(page.locator('body')).toHaveClass(/started/);
 expect(await page.evaluate(()=>[$('ek_kunde_id').value,$('ek_ag').value,$('ek_modus').value])).toEqual(['k_neu','Erika Musterfrau','wohnung']);
 // die Akte zeigt die Bewertung; ein späteres „Neue Bewertung“ über die Startseite ist wieder ohne Kunde
 await page.evaluate(()=>kdOeffnen('k_neu'));await expect(page.locator('#kd_overlay')).toContainText('in Bearbeitung');
 await page.evaluate(()=>{kdSchliessen();appSetTab('home');startPreisermittlung();});await expect(page.locator('#start_fuer')).toBeHidden();
});
test('Neue Bewertung aus der Kundenakte: angefangene Bewertung wird vorher als Projekt gesichert, Abbrechen ändert nichts',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(async()=>{$('ek_anschrift').value='Altweg 1, Musterstadt';compute();autosave();
  await kdSpeichern({id:'k_neu',vorname:'Erika',nachname:'Musterfrau',kontakte:[],finanzierungen:[],erstellt:1});kdOeffnen('k_neu');});
 await page.locator('#kd_overlay').getByRole('button',{name:'Neue Bewertung für diesen Kunden'}).click();
 // abbrechen: nichts gesichert, nichts verloren, Objektart-Wahl bleibt offen
 let frage='';page.once('dialog',d=>{frage=d.message();d.dismiss();});
 await page.getByRole('button',{name:'Wohnhaus',exact:true}).click();
 expect(frage).toMatch(/„Altweg 1, Musterstadt“ wird als Projekt gesichert.*neue, leere Bewertung für Erika Musterfrau/);
 await expect(page.locator('#start_fuer')).toBeVisible();
 expect(await page.evaluate(()=>[$('ek_anschrift').value,pjLoad().length])).toEqual(['Altweg 1, Musterstadt',0]);
 // bestätigen: Projekt gesichert, Neustart mit leerem Formular für den Kunden
 page.on('dialog',d=>d.accept());
 await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Wohnhaus',exact:true}).click()]);
 await page.waitForFunction(()=>typeof APP_STATE!=='undefined'&&APP_STATE.ready&&$('ek_kunde_id').value==='k_neu',null,{timeout:20000});
 expect(await page.evaluate(()=>[$('ek_anschrift').value,$('ek_ag').value,$('ek_modus').value,document.body.classList.contains('started'),pjLoad().map(p=>p.name)]))
  .toEqual(['','Erika Musterfrau','haus',true,['Altweg 1, Musterstadt']]);
});
test('Mietertrag je Gebäude (D33): Feld nur mit Anbau, Zeilen je Gebäude in der Bewertung und im Bericht',async({page})=>{
 await appOeffnen(page);
 await fallAnwenden(page,{felder:{ek_modus:'haus',ek_gs_flaeche:'1000',ek_brw:'100',ek_miete_wohnen:'12.000',er_bewirt:'20',er_zins_basis:'4',nhkhg_rnd:'20',nhkan_rnd:'40'}});
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);});
 await expect(page.locator('#er_anbau_box')).toBeHidden();await expect(page.locator('#o_ertrag')).toHaveText('176.106 €');
 await page.locator('#anbau_aktiv').check();
 await expect(page.locator('#er_anbau_box')).toBeVisible();
 await page.locator('#er_miete_anbau').fill('3.000');await page.locator('#er_miete_anbau').blur();
 // 4.200 × 13,590326 + 1.400 × 19,792774 + 100.000 (Handrechnung im Unit-Test)
 await expect(page.locator('#er_geb_zeilen')).toBeVisible();
 await expect(page.locator('#o_er_hg_info')).toContainText('75 % der Miete');await expect(page.locator('#o_er_an_info')).toContainText('25 % der Miete');
 await expect(page.locator('#o_er_hg_wert')).toHaveText('57.079 €');await expect(page.locator('#o_er_an_wert')).toHaveText('27.710 €');
 await expect(page.locator('#o_ertrag')).toHaveText('184.789 €');
 await page.evaluate(()=>druckbericht());
 await expect(page.locator('#report')).toContainText('davon Anbau / Nebengebäude (25 % der Miete)');
 await expect(page.locator('#report')).toContainText('Hauptgebäude 20,00 J · Anbau 40,00 J');
});
test('Vermarktung: ungültiges Datum (z. B. aus einer fremden Projektdatei) zeigt „–“ statt NaN',async({page})=>{
 await appOeffnen(page);
 // ein Datumsfeld nimmt nur gültige Werte an — ungültige kommen nur über gespeicherte Projektdaten herein
 const t=await page.evaluate(()=>{ pickVordruck('wh_bgf');
   PJ_CACHE.push({id:'p_vm',name:'Fremdes Projekt',data:{fields:{vm_status:'In Vermarktung',vm_start:'Test',vm_preis:'300.000'}}});
   vmUebersicht(); return [vmDatum('Test'),vmDatum('2026-13-01'),vmDatum('2026-09-01'),vmTage('Test'),vmTage('2026-09-01'),$('vm_inhalt').innerText]; });
 expect(t.slice(0,5)).toEqual(['','','2026-09-01',0,28]);
 expect(t[5]).toContain('Fremdes Projekt');expect(t[5]).not.toMatch(/NaN|Tage am Markt/);
});
/* ---------- Gliederung neu (D35) ---------- */
test('Aufnahmebogen → Bewertung: Standardstufe, Modernisierung, Heizung, Fenster, Keller werden übernommen',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);$('nhkhg_s2').value='3';$('mod_p1').value='0';compute();});
 const preis=await page.evaluate(()=>_R.hg.preis), rnd=await page.evaluate(()=>_R.hg.rnd);
 // Fenster vor Ort: Dreifachverglasung → Stufe 4 im Gebäudepreis, als übernommen markiert
 await page.locator('#au_std2').selectOption('4');
 await expect(page.locator('#nhkhg_s2')).toHaveValue('4');await expect(page.locator('#nhkhg_s2')).toHaveClass(/aus-aufnahme/);
 expect(await page.evaluate(()=>_R.hg.preis)).toBeGreaterThan(preis);
 // Fenster vollständig erneuert → volle 2 Punkte (ImmoWertV Anlage 2), längere Restnutzungsdauer; Jahr in der Punktetabelle
 await page.locator('#au_mod_u1').selectOption('voll');await page.locator('#au_mod_j1').fill('2019');await page.locator('#au_mod_j1').blur();
 await expect(page.locator('#mod_p1')).toHaveValue('2');await expect(page.locator('#mod_au1')).toContainText('vollständig erneuert, 2019');
 expect(await page.evaluate(()=>_R.hg.rnd)).toBeGreaterThan(rnd);
 // Technik → Objektdaten, Keller → Hauptgebäude
 await page.locator('#au_fenster').fill('Kunststoff, 3-fach, 2019');await page.locator('#au_fenster').blur();
 await page.locator('#au_heizung_art').fill('Luft-Wasser-Wärmepumpe');await page.locator('#au_heizung_art').blur();
 await page.locator('#au_keller').selectOption('teilunterkellert');await page.locator('#au_aufzug').selectOption('nein');
 expect(await page.evaluate(()=>[$('od_fenster').value,$('od_heizung').value,$('hg_keller').value,$('od_aufzug').value]))
  .toEqual(['Dreifachverglasung','Wärmepumpe','teilweise','nein']);
 // in der Bewertung von Hand verfeinert: Wert bleibt, Markierung weg
 await page.locator('#nhkhg_s2').fill('3,5');await expect(page.locator('#nhkhg_s2')).not.toHaveClass(/aus-aufnahme/);
 // Wohnung: die Blöcke für den Gebäudepreis gibt es nicht
 await page.evaluate(()=>{pickVordruck('etw_vergleich');appAlleKlappen(true);});await expect(page.locator('#au_std_box')).toBeHidden();await expect(page.locator('#au_mod_box')).toBeHidden();
 await keineSkriptfehler(page);
});
test('Schalter in der Kopfzeile: Substanz aus = nur Ertrag, nie beide aus; § 8 und Aufnahmebogen ausschaltbar',async({page})=>{
 const dialoge=[];page.on('dialog',d=>{dialoge.push(d.message());d.accept();});
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);$('gewichtung').value='0.6';compute();appRefresh();});
 const nurErtrag=await page.evaluate(()=>{const g=$('gewichtung').value;$('gewichtung').value='0';compute();const e=_R.empfehlung;$('gewichtung').value=g;compute();return e;});
 const sub=page.locator('#s-substanz>h2 .sec-schalter input'), er=page.locator('#s-ertrag>h2 .sec-schalter input');
 await expect(sub).toBeChecked();await expect(er).toBeChecked();
 await sub.uncheck();
 await expect(page.locator('#gewichtung')).toHaveValue('0');await expect(page.locator('#s-substanz')).toHaveClass(/sec-aus/);
 expect(await page.evaluate(()=>_R.empfehlung)).toBeCloseTo(nurErtrag,6);
 await er.click();expect(dialoge.pop()).toMatch(/Mindestens ein Verfahren/);await expect(er).toBeChecked();await expect(page.locator('#gewichtung')).toHaveValue('0');
 await sub.check();await expect(page.locator('#gewichtung')).toHaveValue('0.6');   // vorige Gewichtung zurück
 // § 8: Abschlag und Zuschlag, ausgeschaltet ohne Zu- und Abschläge
 await page.locator('#s-wk .wk-kopf button',{hasText:'Abschlag'}).click();
 await page.locator('#wk_minus input[aria-label="Merkmal"]').last().fill('Feuchtigkeitsschäden');await page.locator('#wk_minus input[aria-label="Betrag in €"]').last().fill('12.000');
 await page.locator('#s-wk .wk-kopf button',{hasText:'Zuschlag'}).click();
 await page.locator('#wk_plus input[aria-label="Merkmal"]').last().fill('Mehrmiete (über Marktmiete)');await page.locator('#wk_plus input[aria-label="Betrag in €"]').last().fill('3.000');
 await page.locator('#wk_plus input[aria-label="Betrag in €"]').last().blur();
 const mit=await page.evaluate(()=>[_R.wkSumme,_R.empfehlung]);expect(mit[0]).toBe(9000);
 await expect(page.locator('#o_wk_summe')).toHaveText('− 9.000 €');
 await page.locator('#s-wk>h2 .sec-schalter input').uncheck();
 expect(await page.evaluate(()=>[_R.wkSumme,$('wk_aus').checked])).toEqual([0,true]);
 expect(await page.evaluate(()=>_R.empfehlung)).toBeCloseTo(mit[1]+9000,6);
 await expect(page.locator('#wk_minus')).toBeHidden();await expect(page.locator('#s-wk>.sec-aus-hinweis')).toBeVisible();
 await page.locator('#s-wk>h2 .sec-schalter input').check();expect(await page.evaluate(()=>_R.wkSumme)).toBe(9000);
 // Position entfernen
 await page.locator('#wk_plus button[aria-label="Position entfernen"]').last().click();expect(await page.evaluate(()=>_R.wkSumme)).toBe(12000);
 // Aufnahmebogen aus: nicht im Bericht, Ortsbesichtigung zählt nicht als Pflichtfeld
 await page.evaluate(()=>{$('au_wetter').value='sonnig';$('ek_besichtigung').value='';compute();appRefresh();});
 expect(await page.evaluate(()=>pflichtListe().includes('ek_besichtigung'))).toBe(true);
 await page.locator('#s-aufnahme>h2 .sec-schalter input').uncheck();
 expect(await page.evaluate(()=>pflichtListe().includes('ek_besichtigung'))).toBe(false);
 await page.evaluate(()=>druckbericht());await expect(page.locator('#report')).not.toContainText('Feststellungen der Ortsbesichtigung');
 await page.evaluate(()=>document.body.classList.remove('report-mode'));await page.locator('#s-aufnahme>h2 .sec-schalter input').check();
 await page.evaluate(()=>druckbericht());await expect(page.locator('#report')).toContainText('Feststellungen der Ortsbesichtigung');
 await keineSkriptfehler(page);
});
test('Ältere Bewertung: negativer Betrag erscheint als Zuschlag, Besichtigung am → Ortsbesichtigung, alle Abschnitte an',async({page})=>{
 await appOeffnen(page);
 await page.evaluate(()=>restore({fields:{ek_modus:'haus',wk_bez0:'Feuchtigkeit',wk_val0:'12.000',wk_bez1:'Carport',wk_val1:'-3.000',au_datum:'2026-09-12'}}));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);compute();appRefresh();});
 expect(await page.evaluate(()=>[_R.wkSumme,$('ek_besichtigung').value])).toEqual([9000,'2026-09-12']);
 await expect(page.locator('#wk_plus input[aria-label="Merkmal"]')).toHaveValue('Carport');
 await expect(page.locator('#wk_plus input[aria-label="Betrag in €"]')).toHaveValue('3.000,00');
 expect(await page.evaluate(()=>Object.keys(APP_SCHALTER).filter(id=>APP_SCHALTER[id].aus).map(id=>appSchalterAn(id)))).toEqual(Array(9).fill(true));
});
test('Eckdaten: Anschrift, Telefon und E-Mail des Auftraggebers aus der Kundenakte',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{pickVordruck('wh_bgf');appOpenObject();});
 await expect(page.locator('#ek_kunde_anzeige')).toContainText('kommen aus der Kundenakte');
 await page.evaluate(async()=>{await kdSpeichern({id:'k_kontakt',vorname:'Erika',nachname:'Musterfrau',strasse:'Musterweg 1',plzort:'74000 Musterstadt',telefon:'07062 000000',email:'erika@example.org',kontakte:[],finanzierungen:[],erstellt:1});kdAktuelleZuordnen('k_kontakt');});
 const z=page.locator('#ek_kunde_anzeige');
 await expect(z).toContainText('Erika Musterfrau');await expect(z).toContainText('Musterweg 1, 74000 Musterstadt');
 await expect(z.locator('a[href^="tel:"]')).toHaveText('07062 000000');await expect(z.locator('a[href^="mailto:"]')).toHaveText('erika@example.org');
 // die Kontaktdaten stehen nur in der Akte, nicht in der Bewertung (D8)
 expect(await page.evaluate(()=>JSON.stringify(collect()))).not.toContain('Musterweg');
});
test('Exposé, Präsentation und Vermarktung lassen sich ausblenden, die Eingaben bleiben',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{pickVordruck('wh_bgf');appOpenObject();appAlleKlappen(true);});
 await page.locator('#ex_titel').fill('Sonniges Einfamilienhaus');
 for(const id of ['s-expose','s-praesentation','s-vermarktung']){
  const sw=page.locator('#'+id+'>h2 .sec-schalter input');await expect(sw).toBeChecked();
  await sw.uncheck();await expect(page.locator('#'+id)).toHaveClass(/sec-aus/);
  await expect(page.locator('#'+id+'>.sec-aus-hinweis')).toContainText('Ausgeblendet');
  await expect(page.locator('nav.side a[data-sec="'+id+'"] em')).toHaveText('aus');
 }
 await expect(page.locator('#ex_titel')).toBeHidden();
 expect(await page.evaluate(()=>[$('ex_aus').checked,$('vp_aus').checked,$('vm_aus').checked,collect().ex_aus])).toEqual([true,true,true,true]);
 await page.locator('#s-expose>h2 .sec-schalter input').check();
 await expect(page.locator('#ex_titel')).toBeVisible();await expect(page.locator('#ex_titel')).toHaveValue('Sonniges Einfamilienhaus');
 await keineSkriptfehler(page);
});
test('Wohnfläche: Raumliste übernimmt, das Feld bleibt änderbar; eigene Zahl gilt (D36)',async({page})=>{
 await appOeffnen(page);await page.evaluate(()=>{pickVordruck('wh_bgf');appOpenObject();appAlleKlappen(true);});
 await page.locator('#rl_name0').fill('Wohnen');await page.locator('#rl_fl0').fill('5 x 6');
 await page.locator('#rl_name1').fill('Küche');await page.locator('#rl_fl1').fill('12,5');await page.locator('#rl_fl1').blur();
 await page.locator('#rl_aktiv').check();
 await expect(page.locator('#ek_wohnflaeche')).toHaveValue('42,50');await expect(page.locator('#ek_wohnflaeche')).toBeEditable();
 // von Hand: eigene Zahl gilt, Übernahme aus, Hinweis mit „übernehmen“
 await page.locator('#ek_wohnflaeche').fill('44');await page.locator('#ek_wohnflaeche').blur();
 await expect(page.locator('#rl_aktiv')).not.toBeChecked();await expect(page.locator('#rl_eck_hint')).toContainText('Raumliste: 42,50 m²');
 expect(await page.evaluate(()=>num('ek_wohnflaeche'))).toBe(44);
 // die Raumliste ändert sich — die eigene Zahl bleibt
 await page.locator('#rl_fl1').fill('20');await page.locator('#rl_fl1').blur();
 expect(await page.evaluate(()=>num('ek_wohnflaeche'))).toBe(44);
 // wieder übernehmen
 await page.locator('#rl_eck_hint a',{hasText:'übernehmen'}).click();
 await expect(page.locator('#ek_wohnflaeche')).toHaveValue('50,00');await expect(page.locator('#rl_aktiv')).toBeChecked();
 await keineSkriptfehler(page);
});
test('Sonstiges selbst eintragen: Planungsrecht, Modernisierung, Bauteile, Unterlagen, Lage-Check — im Bericht (D36)',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);});
 await page.locator('#od_plan_sonst').fill('Sanierungsgebiet Ortskern');
 await page.locator('#au_mod_s_bez').fill('Balkonsanierung');await page.locator('#au_mod_s_u').selectOption('voll');await page.locator('#au_mod_s_j').fill('2021');
 await page.locator('#au_bt_sonst').fill('Batteriespeicher, Brunnen');
 await page.locator('#au_ul0').check();await page.locator('#au_ul_sonst_txt').fill('Statik');
 await page.locator('#lg_bez_sonst').fill('Denkmalliste');await page.locator('#lg_qu_sonst').fill('Landesamt für Denkmalpflege');
 await page.locator('#lg_st_sonst').selectOption('ok');await page.locator('#lg_no_sonst').fill('kein Kulturdenkmal');await page.locator('#lg_no_sonst').blur();
 // die sonstige Modernisierung gibt keine Punkte
 expect(await page.evaluate(()=>_R.modPunkte)).toBe(await page.evaluate(()=>{let s=0;for(let i=0;i<8;i++)s+=num('mod_p'+i);return Math.min(s,20);}));
 await page.evaluate(()=>druckbericht());const r=page.locator('#report');
 for(const t of ['Sanierungsgebiet Ortskern','Sonstiges — Balkonsanierung: vollständig erneuert (2021)','Batteriespeicher','Brunnen','Statik','Denkmalliste','Landesamt für Denkmalpflege','kein Kulturdenkmal'])
  await expect(r).toContainText(t);
 await page.evaluate(()=>{document.body.classList.remove('report-mode');druckeUnterlagen();});
 await expect(page.locator('#report')).toContainText('Statik');await expect(page.locator('#report')).toContainText('1 von 15 vorhanden');
 await keineSkriptfehler(page);
});
test('Bericht: Objektteile in der Reihenfolge des Formulars (Feststellungen, Lage, Lage-Check, Gebäudedaten …)',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{for(const [id,v] of [['lage_makro','Kleinstadt'],['lage_mikro','ruhige Straße'],['od_grundbuch','Musterstadt'],['od_fnp','Wohnbaufläche'],
  ['gebaeude_besch','Massivbau'],['au_wetter','sonnig'],['lg_st_hochwasser','ok'],['od_gebart','Einfamilienhaus']]) $(id).value=v;compute();druckbericht();});
 const h2=()=>page.locator('#report h2').evaluateAll(l=>l.map(h=>h.textContent.replace(/^\d+\.\s+/,'').trim()));
 const t=await h2();const i=x=>t.indexOf(x);
 const reihe=['Feststellungen der Ortsbesichtigung','Lage','Lage-Check','Gebäudedaten','Grundstück, Grundbuch & Recht','Planungsrecht','Objektbeschreibung','Grundstück & Bodenwert'];
 for(const x of reihe) expect(i(x),x).toBeGreaterThanOrEqual(0);
 expect(reihe.map(i)).toEqual([...reihe.map(i)].sort((a,b)=>a-b));
 // Berichtsumfang „Objektbeschreibung (mit Lage)“ abgewählt: Lage und Beschreibung fehlen, Lage-Check bleibt
 await page.evaluate(()=>{document.body.classList.remove('report-mode');$('rp_abschnitte').value=JSON.stringify(['beschreibung']);druckbericht();});
 const o=await h2();expect(o).not.toContain('Lage');expect(o).not.toContain('Objektbeschreibung');expect(o).toContain('Lage-Check');
 await keineSkriptfehler(page);
});
test('Nummern der Blöcke ohne Lücke, auch wenn der Abschnitt beim Nummerieren zugeklappt war (Haus und Wohnung)',async({page})=>{
 await appOeffnen(page);
 for(const [vordruck,anzahlAllg,anzahlAu,erster] of [['etw_vergleich',5,5,'4.1 Wohnung / Gemeinschaft'],['wh_bgf',5,7,'4.1 Grundstück']]){
  await page.evaluate(v=>{pickVordruck(v);appOpenObject();appAlleKlappen(false);appRefresh();appAbschnittOeffnen($('s-allg'),true);appAbschnittOeffnen($('s-aufnahme'),true);},vordruck);
  const nr=id=>page.evaluate(id=>[...document.querySelectorAll('#'+id+' details.app-disclosure')].filter(d=>d.checkVisibility()).map(d=>d.querySelector('summary').textContent),id);
  const allg=await nr('s-allg'), au=await nr('s-aufnahme');
  expect(allg[0],vordruck).toBe(erster);
  expect(allg.map(t=>t.split(' ')[0]),vordruck).toEqual(Array.from({length:anzahlAllg},(x,i)=>'4.'+(i+1)));
  expect(au.map(t=>t.split(' ')[0]),vordruck).toEqual(Array.from({length:anzahlAu},(x,i)=>'2.'+(i+1)));
 }
});
/* ---------- D37: Foto an der Feststellung, fehlende Bauteile, Prüfhinweise, Vergleichswert im Beleihungswert ---------- */
test('Feststellung mit Foto: Foto bei der Feststellung im Bericht, nicht doppelt unter den Schadensfotos (D37)',async({page})=>{
 page.on('dialog',d=>d.accept());
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);});
 await page.getByRole('button',{name:'Feststellung mit Foto'}).click();
 await page.locator('#au_fest_liste textarea').first().fill('Feuchtefleck Kellerwand Nordseite');
 const wahl=page.waitForEvent('filechooser');
 await page.locator('#au_fest_liste button',{hasText:'Foto'}).first().click();
 await (await wahl).setFiles({name:'mangel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
 await expect.poll(()=>page.evaluate(()=>PHOTOS.filter(p=>p.fest).length)).toBe(1);
 await expect(page.locator('#au_fest_liste img')).toHaveCount(1);
 expect(await page.evaluate(()=>PHOTOS.find(p=>p.fest).caption)).toBe('Feuchtefleck Kellerwand Nordseite');
 // Text nachträglich ergänzt: Die Bildunterschrift folgt (auch in der Fotodokumentation), das Textfeld behält den Fokus
 const feld=page.locator('#au_fest_liste textarea').first();
 await feld.fill('Feuchtefleck Kellerwand Nordseite, ca. 1 m²');
 await expect(feld).toBeFocused();
 const fotoId=await page.evaluate(()=>PHOTOS.find(p=>p.fest).id);
 await expect(page.locator('#gal_schaden .photo[data-foto="'+fotoId+'"] input')).toHaveValue('Feuchtefleck Kellerwand Nordseite, ca. 1 m²');
 // selbst geänderte Bildunterschrift bleibt
 await page.locator('#gal_schaden .photo[data-foto="'+fotoId+'"] input').fill('Wasserschaden Keller');
 await feld.fill('Feuchtefleck Kellerwand Nordseite');
 expect(await page.evaluate(()=>PHOTOS.find(p=>p.fest).caption)).toBe('Wasserschaden Keller');
 await page.evaluate(()=>druckbericht());
 await expect(page.locator('#report')).toContainText('Feststellungen mit Foto');
 await expect(page.locator('#report .fest-bericht img')).toHaveCount(1);
 await expect(page.locator('#report .fest-bericht figcaption')).toHaveText('Wasserschaden Keller');   // eigene Bildunterschrift
 await expect(page.locator('#report h3',{hasText:'Schadensfotos'})).toHaveCount(0);
 await page.evaluate(()=>document.body.classList.remove('report-mode'));
 await page.locator('#au_fest_liste button[aria-label="Feststellung entfernen"]').first().click();
 expect(await page.evaluate(()=>[auFestDaten().length,PHOTOS.filter(p=>p.fest).length])).toEqual([0,0]);
 await keineSkriptfehler(page);
});
test('Fehlende Bauteile: Haken „fehlt“ setzt den Kostenanteil auf 0, auch aus dem Aufnahmebogen (D37)',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);for(let i=0;i<9;i++){$('nhkhg_s'+i).value='3';$('nhkhg_f'+i).checked=false;}compute();});
 const vorher=await page.evaluate(()=>_MODELL_DETAIL.nhkHG.nhk);
 await page.locator('#nhkhg_f7').check();   // Heizung fehlt
 expect(await page.evaluate(()=>_MODELL_DETAIL.nhkHG.nhk)).toBeCloseTo(vorher*(1-0.09),6);
 await expect(page.locator('#nhkhg_k7')).toHaveText('0,00 (fehlt)');
 await page.locator('#au_std6').selectOption('f');   // Sanitär fehlt laut Aufnahmebogen
 await expect(page.locator('#nhkhg_f6')).toBeChecked();
 expect(await page.evaluate(()=>_MODELL_DETAIL.nhkHG.nhk)).toBeCloseTo(vorher*(1-0.09-0.09),6);
 await page.locator('#au_std6').selectOption('3');   // doch vorhanden
 await expect(page.locator('#nhkhg_f6')).not.toBeChecked();
 await keineSkriptfehler(page);
});
test('Prüfhinweise: Plausibilisierung und Gegenproben aus dem Aufnahmebogen in einer Liste (D37)',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 const texte=()=>page.evaluate(()=>plausiPruefen().map(h=>h.stufe+': '+h.text));
 await page.evaluate(()=>{$('ek_typ').value='EFH freistehend · unterkellert, DG ausgebaut';$('ek_baujahr').value='1985';compute();});
 const vorher=await texte();
 expect(vorher.some(t=>/Plausibilisierung|Aufnahmebogen|Effizienzklasse/.test(t))).toBe(false);
 await page.evaluate(()=>{ $('pl_markt').value=String(Math.round(_R.eigenM2/1.3));
  $('au_mod_j1').value='1970';$('au_mod_u1').value='voll';$('nhkhg_s2').value='2';
  $('au_keller').value='nicht unterkellert';$('au_energiewert').value='145';$('au_energieklasse').value='B';compute(); });
 const t=await texte();
 expect(t.some(x=>/^fehler: Plausibilisierung: .*über dem Vergleichspreis/.test(x))).toBe(true);
 expect(t.some(x=>/^fehler: „Fenster- und Außentürmodernisierung“ \(1970, Aufnahmebogen\) liegt vor dem Baujahr/.test(x))).toBe(true);
 expect(t.some(x=>/vollständig erneuert.*Standardstufe für Außentüren und Fenster ist aber 2/.test(x))).toBe(true);
 expect(t.some(x=>/laut Aufnahmebogen aber nicht unterkellert/.test(x))).toBe(true);
 expect(t.some(x=>/Effizienzklasse B passt nicht zum Energiekennwert/.test(x))).toBe(true);
 // Aufnahmebogen ausgeschaltet: seine Gegenproben entfallen, die Plausibilisierung bleibt
 await page.evaluate(()=>{$('au_aus').checked=true;compute();});
 const aus=await texte();expect(aus.some(x=>/Aufnahmebogen|Effizienzklasse/.test(x))).toBe(false);expect(aus.some(x=>/Plausibilisierung/.test(x))).toBe(true);
 await keineSkriptfehler(page);
});
test('Beleihungswert: Vergleichswert nach § 19 BelWertV mit Sicherheitsabschlag, Übernahme aus der Bewertung (D37)',async({page})=>{
 await appOeffnen(page);await fallAnwenden(page,{...SZENARIEN.find(s=>s.name==='etw_referenz'),});
 await page.evaluate(()=>{appOpenObject();appAlleKlappen(true);});
 await page.locator('#bw_aktiv').check();
 await page.evaluate(()=>bwAusBewertung());
 const vgl=await page.evaluate(()=>_R.vergleichWert);expect(vgl).toBeGreaterThan(0);
 expect(await page.evaluate(()=>num('bw_vgl'))).toBe(Math.round(vgl));
 await page.locator('#bw_vgl_sicher').fill('5');await page.locator('#bw_vgl_sicher').blur();
 expect(await page.evaluate(()=>_R.bwVglSicherP)).toBe(10);   // mindestens 10 %
 expect(await page.evaluate(()=>_R.bwVergleich)).toBeCloseTo(Math.round(vgl)*0.9,6);
 await page.locator('#bw_ansatz').selectOption('vergleich');
 expect(await page.evaluate(()=>[_R.bwAnsatz,_R.bwAusgang===_R.bwVergleich])).toEqual(['vergleich',true]);
 await expect(page.locator('#o_bw_vergleich')).not.toHaveText('0 €');
 await page.evaluate(()=>druckbericht());await expect(page.locator('#report')).toContainText('− Sicherheitsabschlag (§ 19 Abs. 1, 10,00 %)');
 await keineSkriptfehler(page);
});
