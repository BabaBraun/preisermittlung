/* ImmoApp — Liegenschaften: Fenster, Speicher, Formulare, Ansprechpartner, Datensicherung
   Kern: js/liegenschaften.js (ImmoLiegenschaften). Übersicht und Vordruck: js/jahresbewertung-ui.js, -editor.js, -dok.js.
   Speichern: eigene Datenbank „ia_verwaltung“ (Speicher liegenschaften, anhaenge, meta) über js/speicher.js — Name aus der
   früheren Liegenschaftsverwaltung, damit vorhandene Daten erhalten bleiben. Ohne IndexedDB (manche privaten Fenster)
   Rückfall auf den localStorage mit sichtbarem Hinweis. Alle Eingaben werden bei der Ausgabe maskiert (lvH). */
'use strict';

const LVK=ImmoLiegenschaften, LVBW=ImmoLiegenschaften;
const LV_DB_NAME='ia_verwaltung', LV_DB_VER=1, LV_RUECKFALL='ia_lv_rueckfall', LV_EINST_KEY='ia_lv_einstellungen';
var LV={db:null,bereit:false,rueckfall:false,liste:[],einst:{},ansicht:'uebersicht',form:null,meldung:'',start:null};
const LV_ANSICHTEN=[['uebersicht','Übersicht'],['ansprechpartner','Ansprechpartner'],['sicherung','Datensicherung']];

/* ---------- Hilfen ---------- */
function lvH(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function lvQ(id){ return LVK.ID.test(String(id))?String(id):''; }   // nur sichere Kennungen in onclick
function lvHeute(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function lvEur0(x){ return (Math.round(x)||0).toLocaleString('de-DE')+' €'; }
function lvZahlText(x){ return typeof x==='number'&&isFinite(x)?String(x).replace('.',','):(x==null?'':String(x)); }
function lvAdresse(l){ return [l.strasse,[l.plz,l.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
function lvBewProzent(x){ return x==null?'':(x>0?'+':'')+String(LVK.r2(x)).replace('.',',')+' %'; }
function lvMeldung(t){ LV.meldung=t||''; }
function lvLeer(t){ return '<div class="lv-leer">'+lvH(t)+'</div>'; }
function lvBox(titel,inhalt,extra){ return '<div class="mdb-box'+(extra?' '+extra:'')+'">'+(titel?'<h3>'+lvH(titel)+'</h3>':'')+inhalt+'</div>'; }
function lvTabelle(kopf,zeilen,leer){
  if(!zeilen.length) return lvLeer(leer||'Noch keine Einträge.');
  return '<div class="mdb-scroll"><table class="mdb-tbl lv-tbl"><thead><tr>'+kopf.map(k=>'<th'+(k.r?' class="r"':'')+'>'+lvH(k.t||k)+'</th>').join('')+'</tr></thead><tbody>'+zeilen.join('')+'</tbody></table></div>';
}
function lvHerunterladen(bytes,mime,name){ if(typeof iaHerunterladen==='function') iaHerunterladen(new Blob([bytes],{type:mime}),name); }
const LV_XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', LV_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function lvDateiname(t){ return String(t||'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Liegenschaften'; }

/* ---------- Formulare: {id, label, typ:text|zahl|datum|wahl|check|textarea|email|tel, wert, optionen, hinweis, pflicht, breit, min} ---------- */
function lvFeld(f){
  const id='lvf_'+f.id, w=f.wert==null?'':f.wert;
  if(f.typ==='check') return '<label class="lv-check'+(f.breit?' full':'')+'"><input type="checkbox" id="'+id+'"'+(w?' checked':'')+'> <span>'+lvH(f.label)+'</span>'+(f.hinweis?'<span class="lv-hinweis">'+lvH(f.hinweis)+'</span>':'')+'</label>';
  let inp;
  if(f.typ==='wahl') inp='<select id="'+id+'">'+f.optionen.map(o=>'<option value="'+lvH(o[0])+'"'+(String(o[0])===String(w)?' selected':'')+'>'+lvH(o[1])+'</option>').join('')+'</select>';
  else if(f.typ==='textarea') inp='<textarea id="'+id+'" rows="'+(f.zeilen||3)+'">'+lvH(w)+'</textarea>';
  else {
    const typ=f.typ==='datum'?'date':f.typ==='email'?'email':f.typ==='tel'?'tel':'text', zahl=f.typ==='zahl'||f.typ==='betrag';
    inp='<input id="'+id+'" type="'+typ+'"'+(zahl?' inputmode="decimal"':'')+' value="'+lvH(zahl?lvZahlText(w):w)+'"'+(f.platzhalter?' placeholder="'+lvH(f.platzhalter)+'"':'')+'>';
  }
  return '<div class="field'+(f.breit?' full':'')+'"><label for="'+id+'">'+lvH(f.label)+(f.pflicht?' *':'')+'</label>'+inp+(f.hinweis?'<span class="lv-hinweis">'+lvH(f.hinweis)+'</span>':'')+'</div>';
}
function lvFelder(liste,spalten){ return '<div class="grid '+(spalten||'three')+' lv-form">'+liste.map(lvFeld).join('')+'</div>'; }
function lvFormLesen(liste){
  const w={}, fehler=[];
  liste.forEach(f=>{
    const el=document.getElementById('lvf_'+f.id); if(!el) return;
    el.classList.remove('lv-fehler');
    let v;
    if(f.typ==='check') v=el.checked;
    else if(f.typ==='zahl'||f.typ==='betrag'){
      v=LVK.zahlEingabe(el.value);
      if(Number.isNaN(v)){ fehler.push(f.label+': keine gültige Zahl'); el.classList.add('lv-fehler'); }
      else if(v!=null&&f.min!=null&&v<f.min){ fehler.push(f.label+': darf nicht kleiner als '+String(f.min).replace('.',',')+' sein'); el.classList.add('lv-fehler'); }
    }
    else if(f.typ==='datum'){ v=el.value||null; if(v&&!LVK.datumGueltig(v)){ fehler.push(f.label+': kein gültiges Datum'); el.classList.add('lv-fehler'); } }
    else v=(el.value||'').trim();
    if(f.pflicht&&(v==null||v===''||(typeof v==='number'&&Number.isNaN(v)))){ if(!el.classList.contains('lv-fehler')) fehler.push(f.label+' fehlt'); el.classList.add('lv-fehler'); }
    w[f.id]=Number.isNaN(v)?null:v;
  });
  return {ok:!fehler.length,werte:w,fehler};
}
/* Fehler oben im Formular und direkt über den Knöpfen zeigen; das erste rot markierte Feld (sonst die Meldung) so in den
   sichtbaren Bereich holen, dass es nicht unter der festen Kopfzeile und den Reitern liegt */
function lvFehlerZeigen(fehler){
  const el=document.getElementById('lv_formfehler'), unten=document.getElementById('lv_formfehler_unten');
  const html=fehler.length?'<b>Bitte prüfen:</b> '+fehler.map(lvH).join(' · '):'';
  if(unten){ unten.innerHTML=html; unten.hidden=!fehler.length; }
  if(el){ el.innerHTML=html; el.hidden=!fehler.length;
    if(fehler.length){ const box=el.closest('.lv-formbox'), feld=box&&box.querySelector('.lv-fehler');
      if(feld&&feld.getBoundingClientRect().bottom-el.getBoundingClientRect().top>lvSichtHoehe()-24) lvZeigen(feld); else lvZeigen(el,12);
      if(feld){ try{ feld.focus({preventScroll:true}); }catch(e){} } } }
  else if(fehler.length) alert('Bitte prüfen:\n'+fehler.join('\n'));
}
function lvFestHoehe(){ const o=document.getElementById('lv_overlay'), kopf=o&&o.querySelector('.mdb-head'), tabs=document.getElementById('lv_tabs'); return (kopf?kopf.offsetHeight:0)+(tabs?tabs.offsetHeight:0); }
function lvSichtHoehe(){ const o=document.getElementById('lv_overlay'); return o?o.clientHeight-lvFestHoehe():0; }
function lvZeigen(el,rand){
  const o=document.getElementById('lv_overlay'); if(!o||!el) return;
  const fest=lvFestHoehe(), r=el.getBoundingClientRect(), ro=o.getBoundingClientRect();
  if(rand==null) rand=Math.max(16,(o.clientHeight-fest-r.height)/3);
  o.scrollTop=Math.max(0,o.scrollTop+(r.top-ro.top)-fest-rand);
}
function lvFormRahmen(titel,felderHtml,speichern,abbrechen,zusatz,knopf,extraKnoepfe){
  return '<div class="mdb-box lv-formbox"><h3>'+lvH(titel)+'</h3><div id="lv_formfehler" class="lv-warn" hidden></div>'+felderHtml+(zusatz||'')
    +'<div id="lv_formfehler_unten" class="lv-warn" hidden></div>'
    +'<div class="mdb-actions"><button class="primary" onclick="'+speichern+'" data-ic="check">'+lvH(knopf||'Speichern')+'</button><button class="secondary" onclick="'+(abbrechen||'lvFormZu()')+'">Abbrechen</button>'+(extraKnoepfe||'')+'</div></div>';
}
function lvFormZu(){ LV.form=null; lvRender(); }

/* ---------- Speichern ---------- */
async function lvStart(){
  if(LV.start) return LV.start;
  LV.start=(async()=>{
    try{
      LV.db=await ImmoSpeicher.oeffnen(LV_DB_NAME,LV_DB_VER,{liegenschaften:{keyPath:'id'},anhaenge:{keyPath:'id'},meta:null},
        t=>{ if(typeof speicherFehler==='function') speicherFehler('lv_db',t); });
      const roh=await ImmoSpeicher.tx(LV.db,'liegenschaften','readonly',s=>s.getAll());
      LV.liste=roh.map(x=>LVK.bereinigen(x)).filter(Boolean);
      try{ LV.einst=LVK.ansprechpartnerBereinigen(await ImmoSpeicher.tx(LV.db,'meta','readonly',s=>s.get('einstellungen'))); }catch(e){ LV.einst={}; }
    }catch(e){
      LV.db=null; LV.rueckfall=true;
      try{ LV.liste=(JSON.parse(localStorage.getItem(LV_RUECKFALL))||[]).map(x=>LVK.bereinigen(x)).filter(Boolean); }catch(x){ LV.liste=[]; }
      try{ LV.einst=LVK.ansprechpartnerBereinigen(JSON.parse(localStorage.getItem(LV_EINST_KEY))); }catch(x){ LV.einst={}; }
    }
    LV.bereit=true;
    return true;
  })();
  return LV.start;
}
async function lvSpeichern(l){
  l.geaendert=Date.now(); if(!l.angelegt) l.angelegt=l.geaendert;
  const sauber=LVK.bereinigen(l); if(!sauber) throw new Error('Die Daten sind ungültig');
  if(LV.db) await ImmoSpeicher.tx(LV.db,'liegenschaften','readwrite',s=>s.put(sauber));
  else localStorage.setItem(LV_RUECKFALL,JSON.stringify(LV.liste.filter(x=>x.id!==sauber.id).concat([sauber])));
  const i=LV.liste.findIndex(x=>x.id===sauber.id); if(i>=0) LV.liste[i]=sauber; else LV.liste.push(sauber);
  return sauber;
}
function lvFehlerText(e){ return ImmoSpeicher.fehlerText(e); }
/* Änderung an einer Kopie; erst nach erfolgreichem Speichern gilt sie — sonst bleibt alles wie vorher */
async function lvAendern(arbeit,meldung,lId){
  const alt=LV.liste.find(x=>x.id===lId); if(!alt) return false;
  const l=JSON.parse(JSON.stringify(alt));
  if(arbeit(l)===false) return false;
  try{ await lvSpeichern(l); }
  catch(e){ alert('Die Änderung konnte nicht gespeichert werden ('+lvFehlerText(e)+'). Es wurde nichts verändert.'); return false; }
  lvMeldung(meldung||''); lvRender();
  return true;
}
async function lvLoeschenDb(id){
  if(LV.db) await ImmoSpeicher.tx(LV.db,'liegenschaften','readwrite',s=>s.delete(id));
  else localStorage.setItem(LV_RUECKFALL,JSON.stringify(LV.liste.filter(x=>x.id!==id)));
  LV.liste=LV.liste.filter(x=>x.id!==id);
}
async function lvMetaSetzen(key,wert){
  if(LV.db) await ImmoSpeicher.tx(LV.db,'meta','readwrite',s=>s.put(wert,key));
  else if(key==='einstellungen') localStorage.setItem(LV_EINST_KEY,JSON.stringify(wert));
}
async function lvMetaLesen(key){ if(!LV.db) return null; try{ return await ImmoSpeicher.tx(LV.db,'meta','readonly',s=>s.get(key)); }catch(e){ return null; } }
/* Anhänge (Bilder der Bodenrichtwertkarte) im Speicher „anhaenge“: {id, liegenschaftId, name, typ, size, datum, data(base64)} */
async function lvAnhangSpeichern(a){
  if(!LV.db) throw new Error('Bilder brauchen die Datenbank des Browsers — in diesem Fenster ist sie nicht verfügbar');
  await ImmoSpeicher.tx(LV.db,'anhaenge','readwrite',s=>s.put(a));
}
async function lvAnhangLesen(id){ if(!LV.db) return null; try{ return await ImmoSpeicher.tx(LV.db,'anhaenge','readonly',s=>s.get(id)); }catch(e){ return null; } }
async function lvAnhaengeLoeschen(ids){ if(!LV.db||!ids.length) return; await ImmoSpeicher.tx(LV.db,'anhaenge','readwrite',s=>{ ids.forEach(id=>s.delete(id)); }); }
function lvDataUrl(a){ return a&&a.data?'data:'+(a.typ||'application/octet-stream')+';base64,'+a.data:''; }

/* ---------- Öffnen, Navigation ---------- */
async function lvOeffnen(ansicht){
  const o=document.getElementById('lv_overlay'); if(!o) return;
  o.classList.add('on'); document.body.style.overflow='hidden';
  await lvStart();
  LV.ansicht=LV_ANSICHTEN.some(a=>a[0]===ansicht)?ansicht:'uebersicht';
  LV.form=null; JB_EDIT=null; lvMeldung('');
  lvRender();
}
function lvSchliessen(){ const o=document.getElementById('lv_overlay'); if(o) o.classList.remove('on'); document.body.style.overflow=''; LV.form=null; }
function lvAnsicht(a){ LV.ansicht=a; LV.form=null; JB_EDIT=null; lvMeldung(''); lvRender(); }
const LV_ANSICHT_HTML={uebersicht:()=>jbAnsichtHtml(),ansprechpartner:()=>lvAnsprechpartnerHtml(),sicherung:()=>lvSicherungHtml()};
function lvRender(){
  const o=document.getElementById('lv_overlay'); if(!o||!o.classList.contains('on')) return;
  document.getElementById('lv_headinfo').textContent=LV.liste.length+' Liegenschaft'+(LV.liste.length===1?'':'en')+(LV.rueckfall?' · ohne Datenbank':'');
  document.getElementById('lv_tabs').innerHTML=LV_ANSICHTEN.map(([k,t])=>'<button id="lvt_'+k+'" class="'+(LV.ansicht===k?'on':'')+'" onclick="lvAnsicht(\''+k+'\')">'+t+'</button>').join('');
  let html='';
  try{ html=(LV_ANSICHT_HTML[LV.ansicht]||LV_ANSICHT_HTML.uebersicht)(); }
  catch(e){ console.error(e); html=lvBox('Ansicht nicht verfügbar','<p>Die Ansicht konnte nicht aufgebaut werden: '+lvH(e&&e.message)+'</p>'); }
  const warn=LV.rueckfall?'<div class="lv-warn">Ohne Datenbank: Die Liegenschaften werden nur im Browserspeicher gesichert (begrenzt, ohne Bilder). Bitte regelmäßig über „Datensicherung“ sichern.</div>':'';
  document.getElementById('lv_body').innerHTML=warn+(LV.meldung?'<div class="lv-ok" role="status">'+lvH(LV.meldung)+'</div>':'')+html;
  if(typeof iconify==='function') iconify(o);
  if(typeof a11yLabels==='function') a11yLabels(o);
  const kopf=o.querySelector('.mdb-head'); if(kopf) o.style.setProperty('--lv-kopf',kopf.offsetHeight+'px');   // Reiter kleben unter der (am Handy höheren) Kopfzeile
}

/* ---------- Liegenschaft anlegen, bearbeiten, löschen ---------- */
function lvStammFelder(l){
  l=l||{};
  return [{id:'name',label:'Bezeichnung',wert:l.name,pflicht:true,platzhalter:'z. B. Filiale Musterstadt'},
    {id:'strasse',label:'Straße und Hausnummer',wert:l.strasse},{id:'plz',label:'PLZ',wert:l.plz},{id:'ort',label:'Ort',wert:l.ort},
    {id:'art',label:'Art',typ:'wahl',wert:l.art||'gewerbe',optionen:LVK.ARTEN_L},
    {id:'notiz',label:'Notiz',typ:'textarea',wert:l.notiz,breit:true}];
}
function lvNeueLiegenschaft(){ LV.ansicht='uebersicht'; JB_EDIT=null; LV.form={typ:'stamm',id:null}; lvMeldung(''); lvRender(); jbNachOben(); }
function lvLiegenschaftBearbeiten(id){ LV.ansicht='uebersicht'; JB_EDIT=null; LV.form={typ:'stamm',id}; lvMeldung(''); lvRender(); jbNachOben(); }
function lvStammHtml(id){
  const l=id?LV.liste.find(x=>x.id===id):null;
  return lvFormRahmen(l?'Liegenschaft bearbeiten':'Neue Liegenschaft',lvFelder(lvStammFelder(l)),'lvStammSpeichern(\''+lvQ(id||'')+'\')',null,
    l?'':'<p class="hint">Danach geht es gleich weiter zum ersten Vordruck dieser Liegenschaft.</p>',l?'Speichern':'Anlegen',
    l?'<button class="danger" onclick="lvLiegenschaftLoeschen(\''+lvQ(l.id)+'\')" data-ic="trash">Liegenschaft löschen</button>':'');
}
async function lvStammSpeichern(id){
  // ohne Bezeichnung die Anschrift verwenden (Straße, Ort), statt das Speichern abzulehnen
  const nm=document.getElementById('lvf_name');
  if(nm&&!nm.value.trim()){ const t=['strasse','ort'].map(k=>((document.getElementById('lvf_'+k)||{}).value||'').trim()).filter(Boolean).join(', '); if(t) nm.value=t; }
  const r=lvFormLesen(lvStammFelder()); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte, setzen=l=>{ ['name','strasse','plz','ort','art','notiz'].forEach(k=>l[k]=w[k]||''); };
  if(!id){
    const l={id:LVK.neueId('L'),bewertungen:[]}; setzen(l);
    try{ await lvSpeichern(l); }catch(e){ alert('Die Liegenschaft konnte nicht gespeichert werden ('+lvFehlerText(e)+').'); return; }
    LV.form={typ:'jb_neu',lId:l.id}; lvMeldung('Liegenschaft „'+l.name+'“ angelegt. Jetzt den ersten Vordruck anlegen.'); lvRender(); jbNachOben(); return;
  }
  LV.form=null;
  await lvAendern(l=>{ setzen(l); },'Liegenschaft gespeichert.',id);
}
async function lvLiegenschaftLoeschen(id){
  const l=LV.liste.find(x=>x.id===id); if(!l) return;
  const n=(l.bewertungen||[]).length;
  if(!confirm('Liegenschaft „'+l.name+'“ mit '+n+' Bewertung'+(n===1?'':'en')+' endgültig löschen?\nTipp: vorher über „Datensicherung“ sichern.')) return;
  try{ await lvLoeschenDb(id); }catch(e){ alert('Die Liegenschaft konnte nicht gelöscht werden ('+lvFehlerText(e)+').'); return; }
  try{ if(LV.db){ const alle=await ImmoSpeicher.tx(LV.db,'anhaenge','readonly',s=>s.getAll()); await lvAnhaengeLoeschen(alle.filter(a=>a.liegenschaftId===id).map(a=>a.id)); } }
  catch(e){ console.error(e); }
  LV.form=null; lvMeldung('Liegenschaft „'+l.name+'“ gelöscht.'); lvRender();
}

/* ---------- Ansprechpartner (Deckblatt des Vordrucks) ---------- */
function lvApFelder(){ const e=LV.einst||{};
  return [{id:'e_name',label:'Name',wert:e.name},{id:'e_anschrift',label:'Firma / Anschrift',wert:e.anschrift,breit:true},{id:'e_ort',label:'Ort',wert:e.ort},
    {id:'e_telefon',label:'Telefon',typ:'tel',wert:e.telefon},{id:'e_email',label:'E-Mail',typ:'email',wert:e.email}]; }
function lvAnsprechpartnerHtml(){
  return lvFormRahmen('Ansprechpartner auf dem Deckblatt',lvFelder(lvApFelder()),'lvApSpeichern()','lvAnsicht(\'uebersicht\')',
    '<p class="hint">Erscheint auf dem Deckblatt jedes Vordrucks unter „Ihr persönlicher Ansprechpartner“. Bleibt nur auf diesem Gerät.</p>');
}
async function lvApSpeichern(){
  const w=lvFormLesen(lvApFelder()).werte;
  const e=LVK.ansprechpartnerBereinigen({name:w.e_name,anschrift:w.e_anschrift,ort:w.e_ort,telefon:w.e_telefon,email:w.e_email});
  try{ await lvMetaSetzen('einstellungen',e); }catch(x){ alert('Nicht gespeichert ('+lvFehlerText(x)+').'); return; }
  LV.einst=e; lvMeldung('Ansprechpartner gespeichert.'); lvRender();
}

/* ---------- Datensicherung ---------- */
function lvSicherungHtml(){
  const n=LV.liste.length, b=LV.liste.reduce((s,l)=>s+(l.bewertungen||[]).length,0);
  return lvBox('Datensicherung der Liegenschaften',
    '<p>'+n+' Liegenschaften · '+b+' Bewertungen'+(LV.rueckfall?' · ohne Datenbank (Browserspeicher)':'')+'</p>'
    +'<p class="hint" id="lv_letzte_sicherung"></p>'
    +'<p class="hint">Die Daten liegen nur in diesem Browser auf diesem Gerät. Die Sicherungsdatei enthält alle Liegenschaften mit ihren Vordrucken und Bildern — sie ist <b>nicht verschlüsselt</b> und gehört an einen geschützten Ort (z. B. das Laufwerk der Bank), nicht in private Cloud-Ordner. Beim Einspielen wird die Datei vollständig geprüft; vorhandene Einträge werden nur durch neuere Fassungen ersetzt. Sicherungen der früheren Liegenschaftsverwaltung lassen sich ebenfalls einspielen.</p>'
    +'<div class="mdb-actions"><button class="primary" onclick="lvSicherungErstellen(false)" data-ic="download">Sicherung herunterladen</button>'
    +'<button class="secondary" onclick="lvSicherungErstellen(true)" data-ic="upload">Sicherung teilen</button>'
    +'<button class="secondary" onclick="lvSicherungEinspielen()" data-ic="folder-open">Sicherung einspielen</button></div>');
}
async function lvLetzteSicherungZeigen(){
  const el=document.getElementById('lv_letzte_sicherung'); if(!el) return;
  const m=await lvMetaLesen('lastBackup');
  el.textContent=m&&m.ts?'Letzte Sicherung am '+new Date(m.ts).toLocaleDateString('de-DE')+'.':'Noch keine Sicherung erstellt.';
}
async function lvSicherungErstellen(teilen){
  await lvStart();
  if(!LV.liste.length){ alert('Es sind noch keine Liegenschaften erfasst.'); return; }
  let anhaenge=[];
  if(LV.db){ try{ anhaenge=await ImmoSpeicher.tx(LV.db,'anhaenge','readonly',s=>s.getAll()); }catch(e){ anhaenge=[]; } }
  const datei={typ:'immoapp-liegenschaften',version:1,erstellt:new Date().toISOString(),liegenschaften:LV.liste,ansprechpartner:LV.einst||{},anhaenge};
  const b=new Blob([JSON.stringify(datei)],{type:'application/json'}), name='ImmoApp Liegenschaften '+lvHeute()+'.json';
  if(teilen&&typeof iaTeilen==='function'){ if(await iaTeilen(b,name,'Sicherung Liegenschaften')==='abgebrochen') return; }
  else if(typeof iaHerunterladen==='function') iaHerunterladen(b,name);
  try{ await lvMetaSetzen('lastBackup',{ts:Date.now(),n:LV.liste.length}); }catch(e){}
  lvMeldung('Sicherung „'+name+'“ erstellt.'); lvRender();
}
function lvSicherungEinspielen(){
  const i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{ const f=i.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>lvSicherungAusText(r.result); r.onerror=()=>alert('Die Datei konnte nicht gelesen werden.'); r.readAsText(f); };
  i.click();
}
async function lvSicherungAusText(text){
  await lvStart();
  const jl=ImmoDaten.jsonLesen(text); if(!jl.ok){ alert(jl.fehler+'\nEs wurde nichts verändert.'); return false; }
  const sp=LVK.sicherungPruefen(jl.wert); if(!sp.ok){ alert(sp.fehler+'\nEs wurde nichts verändert.'); return false; }
  const neu=[], n={neu:0,ersetzt:0,gleich:0};
  sp.liegenschaften.forEach(l=>{ const da=LV.liste.find(x=>x.id===l.id);
    if(!da){ n.neu++; neu.push(l); } else if((l.geaendert||0)>(da.geaendert||0)){ n.ersetzt++; neu.push(l); } else n.gleich++; });
  if(!confirm(sp.liegenschaften.length+' Liegenschaften aus der Sicherung übernehmen?\nNeu: '+n.neu+', durch neuere Fassung ersetzt: '+n.ersetzt+', unverändert: '+n.gleich+'.'
    +(sp.verworfen?'\n'+sp.verworfen+' unlesbare Einträge werden übersprungen.':''))) return false;
  try{
    if(LV.db) await ImmoSpeicher.tx(LV.db,['liegenschaften','anhaenge'],'readwrite',s=>{ neu.forEach(l=>s.liegenschaften.put(l)); sp.anhaenge.forEach(a=>s.anhaenge.put(a)); });
    else localStorage.setItem(LV_RUECKFALL,JSON.stringify(LV.liste.filter(x=>!neu.some(l=>l.id===x.id)).concat(neu)));
  }catch(e){ alert('Die Sicherung konnte nicht eingespielt werden ('+lvFehlerText(e)+'). Es wurde nichts verändert.'); return false; }
  neu.forEach(l=>{ const i=LV.liste.findIndex(x=>x.id===l.id); if(i>=0) LV.liste[i]=l; else LV.liste.push(l); });
  if(sp.ansprechpartner&&!(LV.einst&&LV.einst.name)&&sp.ansprechpartner.name){ try{ await lvMetaSetzen('einstellungen',sp.ansprechpartner); LV.einst=sp.ansprechpartner; }catch(e){} }
  LV.ansicht='uebersicht'; LV.form=null;
  lvMeldung('Sicherung eingespielt: '+n.neu+' neu, '+n.ersetzt+' ersetzt, '+n.gleich+' unverändert.'); lvRender();
  return true;
}

/* Eingaben im Fenster lösen keine Neuberechnung der Bewertung aus; Escape schließt Formular bzw. Fenster */
(function(){
  const einrichten=()=>{
    const o=document.getElementById('lv_overlay');
    if(o) ['input','change'].forEach(ev=>o.addEventListener(ev,e=>e.stopPropagation()));
    const body=document.getElementById('lv_body');
    if(body) new MutationObserver(()=>{ if(document.getElementById('lv_letzte_sicherung')) lvLetzteSicherungZeigen(); }).observe(body,{childList:true});
    lvStart().catch(()=>{});
  };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const x=document.getElementById('lv_overlay'); if(x&&x.classList.contains('on')){ if(LV.form) { JB_EDIT=null; lvFormZu(); } else lvSchliessen(); } } });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
