// Entwicklungswerkzeug: exportiert Felddefinitionen als Daten, kein HTML in der nativen App.
import {chromium} from '@playwright/test';
import {writeFileSync,copyFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();await page.goto('http://127.0.0.1:49301/index.html');await page.waitForFunction(()=>window.IA_BEREIT_P);await page.evaluate(()=>window.IA_BEREIT_P);
const schema=await page.evaluate(()=>{
 const defaults=collect();
 const groups=[...document.querySelectorAll('section[id^="s-"]')].map(section=>({id:section.id,title:section.dataset.nav.replace(/^[^A-Za-zÄÖÜäöü]+/,'').replace(/^[bcdef] /,''),fields:[...section.querySelectorAll('input[id],select[id],textarea[id]')].filter(el=>!['file','button','range','radio','hidden'].includes(el.type)&&!el.id.startsWith('foto')).map(el=>{
 const label=document.querySelector('label[for="'+el.id+'"]')||el.closest('.field')?.querySelector('label')||el.closest('label');
 const td=el.closest('td'),table=el.closest('table'),row=el.closest('tr'); const column=td&&table?.tHead?.rows.length?table.tHead.rows[table.tHead.rows.length-1].cells[td.cellIndex]?.textContent:'';const rowTitle=row?.cells[0]?.textContent?.trim();const heading=[...section.querySelectorAll('h3,h4')].filter(h=>h.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent?.trim()||section.dataset.nav;
 return {id:el.id,section:heading,label:(label?.textContent||el.getAttribute('aria-label')||((rowTitle||'')+' '+(column||''))?.trim()||el.placeholder||'Weitere Angabe').replace(/\s+/g,' ').trim(),type:el.type==='checkbox'?'toggle':el.tagName==='SELECT'?'choice':el.type==='date'?'date':el.tagName==='TEXTAREA'?'note':'text',value:el.type==='checkbox'?String(el.defaultChecked):el.tagName==='SELECT'?el.value:el.defaultValue,options:el.tagName==='SELECT'?[...el.options].map(o=>({value:o.value,label:o.textContent})):[]};
 })}));
 for(const el of document.querySelectorAll('input[type=range][id]')){const group=groups.find(g=>g.id===el.closest('section')?.id);if(group)group.fields.push({id:el.id,label:el.closest('.field')?.querySelector('label')?.textContent||el.id,type:'text',value:el.defaultValue,options:[]});}
 return {defaults,groups,types:TYPES,amountIds:[...document.querySelectorAll('input[id]')].filter(el=>istBetrag(el.id)).map(el=>el.id)};
});
writeFileSync('ios/ImmoApp/Resources/formular.json',JSON.stringify(schema,null,2));
for(const file of ['kern','modell','daten'])copyFileSync('js/'+file+'.js','ios/ImmoApp/Resources/'+file+'.js');
writeFileSync('ios/ImmoApp/Resources/native-numbers.js','var nativeAmountFields=new Set('+JSON.stringify(schema.amountIds)+');');
await browser.close();console.log(schema.groups.length+' native Formulargruppen');

await import("./native-input-metadata.mjs");
