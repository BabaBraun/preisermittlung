/* ---------- Persistence ---------- */
function collect(){let o={};document.querySelectorAll('input,select,textarea').forEach(e=>{if(!e.id||e.type==='file'||e.closest('#app_work_header,#app_more,#app_header,#app_object_overview,#lv_overlay'))return;if(e.closest('#mdb_overlay')||e.closest('#suche')||e.closest('#gr_overlay')||e.closest('#kd_overlay')||e.closest('#pq_overlay')||/^(vm_n_|fin_b_|fin_t_)/.test(e.id))return;o[e.id]=(e.type==='checkbox')?e.checked:e.value;});return o;}
function apply(o){if(o&&!('ni_laufzeit' in o)&&parseFloat(String(o.ni_leben||'0').replace(',','.'))>0)o=Object.assign({},o,{ni_laufzeit:'eigen'});if(o&&o.au_datum&&!o.ek_besichtigung)o=Object.assign({},o,{ek_besichtigung:o.au_datum});Object.keys(o).forEach(k=>{let e=$(k);if(e&&e.type!=='file'){if(e.type==='checkbox')e.checked=o[k];else e.value=o[k];}});revealUsedExtras();compute();}
function snapshot(){return {fields:collect(),photos:PHOTOS,signature:SIGNATURE,grundrisse:GRUNDRISSE};}
function restore(obj){
  if(obj&&obj.fields){GRUNDRISSE=Array.isArray(obj.grundrisse)?obj.grundrisse:[];apply(obj.fields);PHOTOS=Array.isArray(obj.photos)?obj.photos:[];SIGNATURE=obj.signature||null;}
  else{GRUNDRISSE=[];apply(obj);PHOTOS=[];SIGNATURE=null;}   // Altformat (flache Feldliste)
  FOTO_GEAENDERT=!(obj&&obj.fotosInDb);   // Fotos kommen aus Datei/Projekt → in die Datenbank schreiben
  renderPhotos();renderSignature();renderWKRows();grListen();rpListeRender();kdAnzeige();vpFolienRender();auModAnzeige();autosave();
}
function autosave(){
  if(SILENT)return;
  let s=snapshot();
  if(IA_DB_BEREIT||FOTOS_IN_DB){
    try{ localStorage.setItem('vb_wert2',JSON.stringify({fields:s.fields,signature:s.signature,grundrisse:s.grundrisse,fotosInDb:true})); speicherFehler('arbeit',''); }
    catch(e){ speicherFehler('arbeit','Der Arbeitsstand konnte nicht gespeichert werden ('+iaFehlerText(e)+'). Bitte über „Als Datei sichern“ sichern.'); }
    if(IA_DB_BEREIT&&FOTO_GEAENDERT) fotosSpeichernBald();
    return;
  }
  // Rückfall ohne Datenbank: wie früher im localStorage, aber ein voller Speicher wird jetzt gemeldet
  try{ localStorage.setItem('vb_wert2',JSON.stringify(s)); speicherFehler('arbeit',''); }
  catch(e){
    try{ localStorage.setItem('vb_wert2',JSON.stringify({fields:s.fields,photos:[],signature:s.signature,grundrisse:s.grundrisse}));
      speicherFehler('arbeit','Der Gerätespeicher ist voll: Die Fotos dieser Bewertung sind nur bis zum Schließen der App vorhanden. Bitte über „Als Datei sichern“ sichern.'); }
    catch(e2){ speicherFehler('arbeit','Der Arbeitsstand konnte nicht gespeichert werden. Bitte über „Als Datei sichern“ sichern.'); }
  }
}
function save(){let name=($('ek_anschrift').value||'Wertermittlung').replace(/[^\wäöüÄÖÜß -]/g,'').trim()||'Wertermittlung';return iaHerunterladen(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),name+'.json');}
function loadFile(){
  let i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{ let f=i.files[0]; if(!f) return; let r=new FileReader();
    r.onerror=()=>alert('Die Datei konnte nicht gelesen werden. Die offene Bewertung bleibt unverändert.');
    r.onload=()=>projektDateiEinlesen(r.result,f.name); r.readAsText(f); };
  i.click();
}
/* Datei vollständig prüfen (js/daten.js), bevor die offene Bewertung ersetzt wird */
function projektDateiEinlesen(text,name){
  let j=ImmoDaten.jsonLesen(text); if(!j.ok){ alert(j.fehler+'\nDie offene Bewertung bleibt unverändert.'); return false; }
  let p=ImmoDaten.projektDateiPruefen(j.wert); if(!p.ok){ alert(p.fehler+'\nDie offene Bewertung bleibt unverändert.'); return false; }
  if(!confirm('Bewertung aus „'+(name||'Datei')+'“ öffnen? Der aktuelle Stand wird ersetzt.')) return false;
  let vorher=snapshot();
  try{ restore(p.altformat?p.daten.fields:p.daten); }
  catch(e){ try{ restore(vorher); }catch(x){} alert('Die Bewertung konnte nicht geladen werden ('+(e&&e.message||e)+'). Der vorherige Stand wurde wiederhergestellt.'); return false; }
  let v=p.verworfen, n=v.felder+v.fotos+v.grundrisse+v.unterschrift;
  if(n) alert('Geladen. '+n+' unlesbare Einträge wurden übersprungen (z. B. beschädigte Fotos).');
  document.body.classList.add('started');
  return true;
}
async function neu(){
  if(!confirm('Neue leere Wertermittlung? Ungespeicherte Daten gehen verloren.'))return;
  await neuOhneFrage();
}
/* Leeres Formular: Arbeitsstand und Fotos der offenen Bewertung löschen und neu laden (Projekte bleiben erhalten) */
async function neuOhneFrage(){
  SILENT=true; localStorage.removeItem('vb_wert2');
  try{ await IA_BEREIT_P; if(IA_DB_BEREIT){ clearTimeout(FOTO_TIMER); FOTO_GEAENDERT=false; await iaPut('arbeit',[],'fotos'); } }catch(e){}
  location.reload();
}
/* Enthält die offene Bewertung eigene Angaben? Auswahlfelder, Schalter und die Vorgaben der Objektart zählen nicht. */
function bewertungAngefangen(){
  if(PHOTOS.length||GRUNDRISSE.length||SIGNATURE) return true;
  const vorgabe=/^(nhk(hg|an)_(base|gnd)|bpi|bpi_faktor|ek_vordruck|ek_kunde_id|vm_n_\w+)$/;   // vm_n_…: Eingabe für einen neuen Vermarktungs-Eintrag (Datum vorbelegt)
  return [...document.querySelectorAll('main input[id], main textarea[id]')].some(e=>!vorgabe.test(e.id)&&!e.readOnly
    &&!['checkbox','radio','file','button','hidden','range'].includes(e.type)&&(e.value||'').trim()!==(e.defaultValue||'').trim());
}
