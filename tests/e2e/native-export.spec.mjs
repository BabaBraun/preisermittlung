import {test,expect} from '@playwright/test';
import {appOeffnen,arbeitsflaeche,fallAnwenden} from './helfer.mjs';
import {SZENARIEN} from '../fixtures/szenarien.mjs';
test('nativer PDF-Download liefert eine echte PDF-Datei an das Teilen-Menü',async({page})=>{
 test.setTimeout(90000);await appOeffnen(page);await arbeitsflaeche(page);await fallAnwenden(page,SZENARIEN.find(s=>s.name==='haus_referenz'));
 await page.evaluate(()=>{window.ImmoNative={isNative:()=>true,shareBlob:async(blob,name)=>{window.nativeFile={name,type:blob.type,size:blob.size,header:await blob.slice(0,5).text()};return 'geteilt';}};druckbericht();downloadPDF();});
 await expect.poll(()=>page.evaluate(()=>window.nativeFile),{timeout:30000}).toEqual(expect.objectContaining({header:'%PDF-',type:'application/pdf',name:expect.stringMatching(/\.pdf$/)}));
 expect(await page.evaluate(()=>nativeFile.size)).toBeGreaterThan(1000);
});

test('fehlgeschlagenes natives Teilen zeigt einen Fehler und markiert keine Sicherung',async({page})=>{
 const messages=[];page.on('dialog',async d=>{messages.push(d.message());await d.accept();});await appOeffnen(page);
 const r=await page.evaluate(async()=>{
   await iaPut('projekte',{id:'native-test',name:'Synthetisches Objekt',data:{fields:{ek_anschrift:'Teststraße 1'}}});
   window.ImmoNative={isNative:()=>true,shareBlob:async()=>{throw new Error('Dateisystem nicht verfügbar');}};
   let rejected=false;try{await pjAlleSichern(true);}catch{rejected=true;}
   return {rejected,backup:await iaGet('meta','lastBackup')};
 });
 expect(r.rejected).toBe(false);expect(r.backup).toBeUndefined();expect(messages.join('|')).toContain('Dateisystem nicht verfügbar');
});

test('abgebrochenes natives Teilen behält den vorherigen Sicherungszeitpunkt',async({page})=>{
 await appOeffnen(page);const backup=await page.evaluate(async()=>{
  await iaPut('projekte',{id:'native-test',name:'Synthetisches Objekt',data:{fields:{ek_anschrift:'Teststraße 1'}}});await iaPut('meta',{ts:123,n:1},'lastBackup');
  window.ImmoNative={isNative:()=>true,shareBlob:async()=> 'abgebrochen'};await pjAlleSichern(true);return await iaGet('meta','lastBackup');
 });expect(backup).toEqual({ts:123,n:1});
});
