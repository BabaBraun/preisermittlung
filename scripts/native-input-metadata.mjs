import{readFileSync,writeFileSync}from'node:fs';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),K=require('../js/kern.js');const path='ios/ImmoApp/Resources/formular.json',s=JSON.parse(readFileSync(path));
const numbers=new Set();const f={...s.defaults};for(const g of s.groups)for(const x of g.fields)if(x.type==='toggle')f[x.id]=true;
const reader={n:id=>{numbers.add(id);return K.zahlLesen(f[id]);},v:id=>String(f[id]??''),an:id=>f[id]===true};K.bewerte(reader,{jahr:2026});
const integer=/^(ek_baujahr|ek_sanierung|ek_anz_we|ek_anz_stell|ni_alter|bw_verw_sp_anz|au_baeder|ex_baujahr|ex_zimmer|mod_p\d+|vgl_bj\d+)$/;
const signed=/^((x\w+\d+|wk)_val\d*|en_markt_ansatz|er_zins_adj|au_lat|au_lon)$/;
for(const g of s.groups)for(const x of g.fields){
 if(!['text'].includes(x.type))continue;
 if(/(_base|_quelle|_grund|_begruendung|_label|_name|_beschreibung|_text|_telefon|_flst|_mea)$/.test(x.id))continue;
 const numeric=numbers.has(x.id)||integer.test(x.id)||/^(bgf(?:hg|an)_[lb]\d+|rl_fl\d+|vgl_bj\d+|au_lat|au_lon|au_zimmer|au_baeder)$/.test(x.id)||(/^\d+(?:[.,]\d+)?$/.test(x.value)&&x.value!=='');
 if(!numeric)continue;
 x.inputKind=integer.test(x.id)?'integer':signed.test(x.id)||x.label.includes('±')?'signedDecimal':'decimal';
 x.unit=x.label.includes('€/m²')?'€/m²':x.label.includes('€')||/^ek_miete_|^ek_grundsteuer$/.test(x.id)?'€':x.label.includes('%')||/abschlag|verhandlung|bewirt|zins/.test(x.id)?'%':x.label.includes('m²')||/flaeche|bgf(?:hg|an)_e/.test(x.id)?'m²':x.label.includes('Jahre')?'Jahre':/^bgf(?:hg|an)_[lb]/.test(x.id)?'m':null;
}
writeFileSync(path,JSON.stringify(s,null,2)+'\n');console.log(s.groups.flatMap(g=>g.fields).filter(f=>f.inputKind).length+' echte Zahlenfelder definiert.');
