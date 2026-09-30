/* ---------- Projekt-Bibliothek und Fotospeicher --------------------------------------
   Projekte und Fotos liegen in der IndexedDB „ia_bewertungen“ (D7). Vorher lag alles im localStorage,
   der auf dem iPhone nur rund 5 MB fasst: Nach wenigen Projekten mit Fotos schlug das Sichern fehl, und
   die automatische Zwischenspeicherung ließ die Fotos stillschweigend weg.
   - projekte: vollständige Projekte samt Fotos (keyPath id)
   - arbeit:   Fotos der laufenden Bewertung (Schlüssel 'fotos'); Felder, Grundrisse und Unterschrift
               bleiben klein und schnell im localStorage 'vb_wert2' (mit fotosInDb:true)
   - meta:     z. B. letzte Gesamtsicherung
   PJ_CACHE hält die Projektliste ohne Fotos im Arbeitsspeicher, damit Startseite und Suche weiter ohne
   Warten lesen können; die Fotos eines Projekts werden erst beim Öffnen geholt. Ohne IndexedDB (manche
   privaten Fenster) arbeitet die App wie bisher mit dem localStorage, meldet volle Speicher aber sichtbar. */
const PJ_KEY='vb_projekte';
const IA_DB_NAME='ia_bewertungen', IA_DB_VER=2;   // 2: Kundenakte
var IA_DB=null, IA_DB_BEREIT=false, IA_BEREIT_P=Promise.resolve(false);
var PJ_CACHE=[];                 // {id,name,objekt,datum,empf,voll,geaendert,nFotos,data:{fields,signature,grundrisse}}
var FOTOS_IN_DB=false;           // Fotos der laufenden Bewertung liegen in der Datenbank
var FOTO_GEAENDERT=false, FOTO_TIMER=null;
var SPEICHER_FEHLER={};

/* Mechanik in js/speicher.js (ImmoSpeicher); hier nur die Datenbank der Bewertungen */
function iaDbOeffnen(){
  return ImmoSpeicher.oeffnen(IA_DB_NAME,IA_DB_VER,{projekte:{keyPath:'id'},arbeit:null,meta:null,kunden:{keyPath:'id'}},t=>speicherFehler('db',t));
}
/* Eine Transaktion; aufgelöst erst, wenn sie wirklich abgeschlossen (auf dem Gerät gespeichert) ist.
   Bei einem Fehler wird sie abgebrochen — kein halb geschriebener Stand. */
function iaTx(store,modus,arbeit){ return ImmoSpeicher.tx(IA_DB,store,modus,arbeit); }
function iaGet(store,key){ return iaTx(store,'readonly',s=>s.get(key)); }
function iaPut(store,wert,key){ return iaTx(store,'readwrite',s=>key===undefined?s.put(wert):s.put(wert,key)); }
function iaDel(store,key){ return iaTx(store,'readwrite',s=>s.delete(key)); }
function iaAlle(store){ return iaTx(store,'readonly',s=>s.getAll()); }
function iaFehlerText(e){ return ImmoSpeicher.fehlerText(e); }
function iaMB(b){ if(!(b>0)) return '0 MB'; return b>=1e9?num2(b/1e9)+' GB':(b>=1e7?Math.round(b/1e6):num2(b/1e6))+' MB'; }

/* Sichtbarer Hinweis, wenn etwas nicht gespeichert werden konnte — nie mehr stillschweigend */
function speicherFehler(bereich,text){
  if(text) SPEICHER_FEHLER[bereich]=text; else delete SPEICHER_FEHLER[bereich];
  let el=$('speicher_warn'); if(!el) return;
  let t=Object.keys(SPEICHER_FEHLER).map(k=>SPEICHER_FEHLER[k]);
  if(!t.length){ el.hidden=true; return; }
  $('speicher_warn_t').textContent=t.join(' ');
  el.hidden=false;
}

function pjOhneFotos(r){
  let d=r.data||{}, data=d.fields?{fields:d.fields,signature:d.signature||null,grundrisse:d.grundrisse||[]}:d;
  return {id:r.id,name:r.name,objekt:r.objekt,datum:r.datum,empf:r.empf,voll:r.voll,geaendert:r.geaendert||0,
    nFotos:Array.isArray(d.photos)?d.photos.length:0,data:data};
}
function pjLoad(){
  if(IA_DB_BEREIT) return PJ_CACHE;
  try{ return JSON.parse(localStorage.getItem(PJ_KEY))||[]; }catch(e){ return []; }
}
function pjStore(list){   // nur noch Rückfall ohne Datenbank
  try{ localStorage.setItem(PJ_KEY,JSON.stringify(list)); return true; }
  catch(e){ alert('Der Speicher dieses Browsers ist voll. Bitte ältere Projekte löschen oder als Datei sichern.'); return false; }
}
function pjCacheSetzen(r){ let c=pjOhneFotos(r), k=PJ_CACHE.findIndex(p=>p.id===c.id); if(k>=0) PJ_CACHE[k]=c; else PJ_CACHE.push(c); }

/* Beim Start: Datenbank öffnen, Altbestand aus dem localStorage übernehmen, Liste und Fotos laden */
async function iaSpeicherStart(){
  try{ IA_DB=await iaDbOeffnen(); }catch(e){ IA_DB=null; FOTOS_IN_DB=false; speicherStatus(); return false; }
  try{
    let alt=null; try{ alt=JSON.parse(localStorage.getItem(PJ_KEY)); }catch(e){}
    if(Array.isArray(alt)&&alt.length){
      let vorhanden=new Set(await iaTx('projekte','readonly',s=>s.getAllKeys()));
      await iaTx('projekte','readwrite',s=>{ alt.forEach(p=>{ if(p&&p.id&&!vorhanden.has(p.id)){
        if(!p.geaendert) p.geaendert=parseInt((''+p.id).slice(1))||Date.now(); s.put(p); } }); });
      let jetzt=new Set(await iaTx('projekte','readonly',s=>s.getAllKeys()));
      if(alt.every(p=>!p||!p.id||jetzt.has(p.id))) localStorage.removeItem(PJ_KEY);   // erst nach geprüfter Übernahme
    }
    PJ_CACHE=(await iaAlle('projekte')).map(pjOhneFotos);
    KD_CACHE=await iaAlle('kunden');
    if(FOTO_GEAENDERT){ await iaPut('arbeit',PHOTOS,'fotos'); FOTO_GEAENDERT=false; }   // Fotos aus altem Arbeitsstand
    else if(FOTOS_IN_DB){ let f=await iaGet('arbeit','fotos'); if(Array.isArray(f)){ PHOTOS=f; renderPhotos(); } }
    IA_DB_BEREIT=true; FOTOS_IN_DB=true;
    autosave();                                        // Arbeitsstand ab jetzt ohne Fotos im localStorage
    try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(e){}
    if(!document.body.classList.contains('started')) startStep0();
    if($('projekt_overlay')&&$('projekt_overlay').classList.contains('on')) renderProjekte();
    speicherStatus(); kdAnzeige(); try{ kkStatus(); }catch(e){}
    return true;
  }catch(e){
    console.warn('Datenbank nicht nutzbar, Rückfall auf localStorage',e);
    IA_DB_BEREIT=false; IA_DB=null; FOTOS_IN_DB=false; speicherStatus();
    return false;
  }
}
function fotosGeaendert(){ FOTO_GEAENDERT=true; }
function fotosSpeichernBald(){ clearTimeout(FOTO_TIMER); FOTO_TIMER=setTimeout(fotosJetztSpeichern,400); }
function fotosJetztSpeichern(){
  clearTimeout(FOTO_TIMER); FOTO_TIMER=null;
  if(!IA_DB_BEREIT||!FOTO_GEAENDERT) return Promise.resolve();
  FOTO_GEAENDERT=false;
  return iaPut('arbeit',PHOTOS,'fotos').then(()=>speicherFehler('fotos',''))
    .catch(e=>{ FOTO_GEAENDERT=true; speicherFehler('fotos','Die Fotos konnten nicht gespeichert werden ('+iaFehlerText(e)+'). Bitte über „Als Datei sichern“ sichern.'); });
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') fotosJetztSpeichern(); });

/* Belegung, dauerhafter Speicher und letzte Sicherung im Projekte-Dialog */
async function speicherStatus(){
  let el=$('pj_speicher'); if(!el) return;
  let liste=pjLoad(), n=liste.length, fotos=liste.reduce((s,p)=>s+(p.nFotos||0),0), t=[];
  t.push(n+' Projekt'+(n===1?'':'e')+(fotos?' mit '+fotos+' Foto'+(fotos===1?'':'s'):''));
  try{ if(navigator.storage&&navigator.storage.estimate){ let e=await navigator.storage.estimate(); if(e&&e.usage!=null) t.push(iaMB(e.usage)+' belegt'+(e.quota?' von '+iaMB(e.quota):'')); } }catch(e){}
  try{ if(navigator.storage&&navigator.storage.persisted){ t.push(await navigator.storage.persisted()?'dauerhaft gespeichert':'bei Platzmangel darf der Browser löschen'); } }catch(e){}
  let lb=null; if(IA_DB_BEREIT){ try{ lb=await iaGet('meta','lastBackup'); }catch(e){} }
  t.push(lb&&lb.ts?'letzte Gesamtsicherung am '+new Date(lb.ts).toLocaleDateString('de-DE'):'noch keine Gesamtsicherung');
  el.textContent=(IA_DB?'':'Ohne Datenbank (Rückfall auf den Browserspeicher) · ')+t.join(' · ');
}
function oeffneProjekte(){$('projekt_overlay').classList.add('on');if(!$('pj_name').value)$('pj_name').value=$('ek_anschrift').value||'';renderProjekte();speicherStatus();}
function schliesseProjekte(){$('projekt_overlay').classList.remove('on');}
function renderProjekte(){
  let list=pjLoad().slice().sort((a,b)=>(b.geaendert||0)-(a.geaendert||0)), tb=$('pj_tbl').querySelector('tbody'); tb.innerHTML='';
  if(!list.length){tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted)">Noch keine Projekte gesichert.</td></tr>';return;}
  const e=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  list.forEach(p=>{
    tb.insertAdjacentHTML('beforeend',
      `<tr><td style="text-align:left">${e(p.name||'ohne Namen')}${p.data&&p.data.fields&&p.data.fields.ek_kunde_id&&kdName(p.data.fields.ek_kunde_id)?'<br><span style="color:var(--muted);font-size:11.5px">Kunde: '+e(kdName(p.data.fields.ek_kunde_id))+'</span>':''}</td>
       <td style="text-align:left">${e(p.objekt||'–')}${p.nFotos?'<br><span style="color:var(--muted);font-size:11.5px">'+p.nFotos+' Foto'+(p.nFotos===1?'':'s')+'</span>':''}</td>
       <td>${e(p.datum||'')}</td>
       <td style="white-space:nowrap">
         <button onclick="projektLaden('${idSicher(p.id)}')">Öffnen</button>
         <button onclick="projektDuplizieren('${idSicher(p.id)}')">Duplizieren</button>
         <button onclick="projektLoeschen('${idSicher(p.id)}')">Löschen</button>
       </td></tr>`);
  });
}
async function projektSichern(){
  let name=($('pj_name').value||$('ek_anschrift').value||'Wertermittlung').trim();
  await IA_BEREIT_P;
  let list=pjLoad(), vorhanden=list.find(p=>p.name===name);
  let eintrag={id:vorhanden?vorhanden.id:'p'+Date.now(),name,
    objekt:($('ek_typ').value||$('ek_wtyp').value||''),
    datum:new Date().toLocaleDateString('de-DE'),empf:(($('o_empfehlung')||{}).textContent||''),
    voll:(function(){try{let v=voll();return {ok:v.ok,n:v.n};}catch(e){return null;}})(),geaendert:Date.now(),data:snapshot()};
  let meldung=vorhanden?'Projekt „'+name+'“ aktualisiert.':'Projekt „'+name+'“ gesichert.';
  if(!IA_DB_BEREIT){
    if(vorhanden) list[list.indexOf(vorhanden)]=eintrag; else list.push(eintrag);
    if(pjStore(list)){renderProjekte();alert(meldung);}
    return;
  }
  try{ await iaPut('projekte',eintrag); }
  catch(e){ alert('Das Projekt konnte nicht gesichert werden: '+iaFehlerText(e)+'.\nBitte den Stand zusätzlich über „Als Datei sichern“ ablegen.'); return; }
  pjCacheSetzen(eintrag); renderProjekte(); speicherStatus(); alert(meldung);
}
async function projektLaden(id){
  let p=pjLoad().find(x=>x.id===id); if(!p)return;
  if(!confirm('Projekt „'+p.name+'“ öffnen? Der aktuelle Stand wird ersetzt.'))return;
  let r=p;
  if(IA_DB_BEREIT){ try{ r=await iaGet('projekte',id)||p; }catch(e){ alert('Das Projekt konnte nicht gelesen werden: '+iaFehlerText(e)+'.'); return; } }
  restore(r.data);$('pj_name').value=r.name;
  document.body.classList.add('started');schliesseProjekte();if(typeof appOpenObject==='function')appOpenObject();window.scrollTo(0,0);
}
async function projektDuplizieren(id){
  let p=pjLoad().find(x=>x.id===id); if(!p)return;
  let name=prompt('Name der Kopie:',p.name+' (Kopie)'); if(!name)return;
  let r=p;
  if(IA_DB_BEREIT){ try{ r=await iaGet('projekte',id)||p; }catch(e){ alert('Das Projekt konnte nicht gelesen werden: '+iaFehlerText(e)+'.'); return; } }
  let kopie={id:'p'+Date.now(),name,objekt:r.objekt,datum:new Date().toLocaleDateString('de-DE'),empf:r.empf,voll:r.voll,geaendert:Date.now(),data:r.data};
  if(IA_DB_BEREIT){
    try{ await iaPut('projekte',kopie); }catch(e){ alert('Die Kopie konnte nicht gesichert werden: '+iaFehlerText(e)+'.'); return; }
    pjCacheSetzen(kopie); renderProjekte(); speicherStatus(); return;
  }
  let list=pjLoad(); list.push(kopie); if(pjStore(list))renderProjekte();
}
async function projektLoeschen(id){
  let p=pjLoad().find(x=>x.id===id); if(!p)return;
  if(!confirm('Projekt „'+p.name+'“ endgültig löschen?'))return;
  if(IA_DB_BEREIT){
    try{ await iaDel('projekte',id); }catch(e){ alert('Das Projekt konnte nicht gelöscht werden: '+iaFehlerText(e)+'.'); return; }
    PJ_CACHE=PJ_CACHE.filter(x=>x.id!==id); renderProjekte(); speicherStatus(); return;
  }
  if(pjStore(pjLoad().filter(x=>x.id!==id)))renderProjekte();
}
/* Gesamtsicherung aller Projekte samt Fotos als eine Datei — der Weg zurück, falls das Gerät
   verloren geht oder die App vom Home-Bildschirm gelöscht wird */
async function pjAlleSichern(teilen){
  await IA_BEREIT_P;
  let liste, kunden=[];
  try{ liste=IA_DB_BEREIT?await iaAlle('projekte'):pjLoad(); if(IA_DB_BEREIT) kunden=await iaAlle('kunden'); }
  catch(e){ alert('Die Daten konnten nicht gelesen werden: '+iaFehlerText(e)+'.'); return; }
  if(!liste.length&&!kunden.length){ alert('Es sind noch keine Projekte oder Kunden gespeichert.'); return; }
  let datei={typ:'immoapp-projekte',version:2,erstellt:new Date().toISOString(),anzahl:liste.length,projekte:liste,kunden:kunden,aufgaben:aufLoad(),parameter:pqSets()};
  let b=new Blob([JSON.stringify(datei)],{type:'application/json'}), name='ImmoApp Projekte '+new Date().toISOString().slice(0,10)+'.json';
  if(teilen){ if(['abgebrochen','fehlgeschlagen'].includes(await iaTeilen(b,name,'ImmoApp-Sicherung'))) return; }
  else {let result=await iaHerunterladen(b,name);if(result==='abgebrochen'||result==='fehlgeschlagen')return;}
  if(IA_DB_BEREIT){ try{ await iaPut('meta',{ts:Date.now(),n:liste.length},'lastBackup'); }catch(e){} }
  speicherStatus(); try{ pjSicherungsHinweis(); }catch(e){}
}
function pjSicherungEinspielen(){
  let i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{ let f=i.files[0]; if(!f) return; let r=new FileReader(); r.onload=()=>pjSicherungAusText(r.result); r.readAsText(f); };
  i.click();
}
async function pjSicherungAusText(text){
      let jl=ImmoDaten.jsonLesen(text); if(!jl.ok){ alert(jl.fehler+'\nEs wurde nichts verändert.'); return; }
      let sp=ImmoDaten.projektSicherungPruefen(jl.wert); if(!sp.ok){ alert(sp.fehler+'\nEs wurde nichts verändert.'); return; }
      let o={parameter:sp.parameter}, liste=sp.projekte, kunden=sp.kunden, aufgaben=sp.aufgaben;
      if(!confirm(liste.length+' Projekte'+(kunden.length?', '+kunden.length+' Kunden':'')+(aufgaben.length?' und '+aufgaben.length+' Wiedervorlagen':'')+' aus der Sicherung übernehmen?\nGibt es einen Eintrag schon, bleibt die neuere Fassung erhalten.'+(sp.verworfen?'\n'+sp.verworfen+' unlesbare Einträge werden übersprungen.':''))) return;
      await IA_BEREIT_P;
      let bestand=pjLoad(), neu=[], n={neu:0,ersetzt:0,gleich:0};
      liste.forEach(p=>{ let da=bestand.find(x=>x.id===p.id);
        if(!da){ n.neu++; neu.push(p); } else if((p.geaendert||0)>(da.geaendert||0)){ n.ersetzt++; neu.push(p); } else n.gleich++; });
      if(IA_DB_BEREIT){
        try{ await iaTx('projekte','readwrite',s=>{ neu.forEach(p=>s.put(p)); }); }
        catch(e){ alert('Die Sicherung konnte nicht eingespielt werden: '+iaFehlerText(e)+'. Es wurde nichts verändert.'); return; }
        neu.forEach(pjCacheSetzen);
        let kdNeu=kunden.filter(k=>{ let da=KD_CACHE.find(x=>x.id===k.id); return !da||(k.geaendert||0)>(da.geaendert||0); });
        if(kdNeu.length){ try{ await iaTx('kunden','readwrite',s=>{ kdNeu.forEach(k=>s.put(k)); }); KD_CACHE=await iaAlle('kunden'); }catch(e){ alert('Die Kunden konnten nicht eingespielt werden: '+iaFehlerText(e)+'.'); } }
        n.kunden=kdNeu.length;
      } else {
        let l=bestand.filter(x=>!neu.some(p=>p.id===x.id)).concat(neu); if(!pjStore(l)) return;
      }
      if(aufgaben.length){ let alt=aufLoad(), ids=new Set(alt.map(a=>a.id)); let dazu=aufgaben.filter(a=>!ids.has(a.id)); if(dazu.length&&aufStore(alt.concat(dazu))){ n.aufgaben=dazu.length; aufBadge(); } }
      if(o&&Array.isArray(o.parameter)){ let l=pqSets(), ids=new Set(l.map(x=>x.id)), dazu=o.parameter.filter(x=>x&&x.id&&!ids.has(x.id)); if(dazu.length) pqSpeichern(l.concat(dazu)); }
      renderProjekte(); speicherStatus(); kdAnzeige();
      alert('Sicherung eingespielt. Projekte: '+n.neu+' neu, '+n.ersetzt+' durch neuere Fassung ersetzt, '+n.gleich+' unverändert.'
        +(n.kunden!=null?'\nKunden: '+n.kunden+' neu oder aktualisiert.':'')+(n.aufgaben?'\nWiedervorlagen: '+n.aufgaben+' neu.':''));
}
/* Erinnerung auf der Startseite, wenn die Projekte länger nicht gesichert wurden */
async function pjSicherungsHinweis(){
  let el=$('start_pj_backup'); if(!el) return;
  await IA_BEREIT_P;
  let n=pjLoad().length, lb=null;
  if(IA_DB_BEREIT){ try{ lb=await iaGet('meta','lastBackup'); }catch(e){} }
  let alt=!lb||!lb.ts||(Date.now()-lb.ts)>14*864e5, neuSeit=lb&&lb.ts?pjLoad().filter(p=>(p.geaendert||0)>lb.ts).length:n;
  if(n&&alt&&neuSeit){
    el.querySelector('span:last-child').textContent=lb&&lb.ts
      ?'Projekte zuletzt am '+new Date(lb.ts).toLocaleDateString('de-DE')+' gesichert, '+neuSeit+' seitdem geändert — jetzt sichern'
      :n+' Projekt'+(n===1?'':'e')+' noch nie als Datei gesichert — jetzt sichern';
    el.hidden=false;
  } else el.hidden=true;
}
