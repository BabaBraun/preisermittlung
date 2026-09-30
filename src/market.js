/* =========================================================================
   MARKTDATENBANK — eigene Angebots- und Kaufpreissammlung
   Eigener Namensraum (mdb*), eigener Speicher (IndexedDB "vb_marktdaten").
   Vom Vordruck entkoppelt: die Initialisierung läuft erst beim Öffnen,
   Fehler werden hier abgefangen und legen die Preisermittlung nicht lahm.
   ========================================================================= */

/* ---------- Zahlen & Datum ---------- */
/* Selbsttest: liegt in selbsttest.js und wird nur bei Bedarf geladen */
function iaSelbsttestOeffnen(){
  const los=()=>{ try{ iaSelbsttestZeigen(); }catch(e){ alert('Der Selbsttest konnte nicht laufen: '+e.message); } };
  if(window.iaSelbsttestZeigen) return los();
  let sk=document.createElement('script'); sk.src='selbsttest.js'; sk.onload=los;
  sk.onerror=()=>alert('Der Selbsttest konnte nicht geladen werden. Bitte einmal mit Internetverbindung öffnen.');
  document.body.appendChild(sk);
}
function mdbNum(s){ return zahlLesen(s,true); }   /* Marktüberblick: Preise und Flächen, Punkt = Tausender */
const mdbEur = n => (Math.round(n||0)).toLocaleString('de-DE')+' €';
const mdbPlain = n => String(Math.round(n||0));   /* ohne Tausenderpunkte — der Vordruck liest sie sonst als Dezimaltrenner */
function mdbDeZahl(n){ n=+n||0; return Number.isInteger(n)? n.toLocaleString('de-DE') : n.toLocaleString('de-DE',{maximumFractionDigits:2}); }
const mdbInt = n => (Math.round(n||0)).toLocaleString('de-DE');
const mdbPct = n => (n||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
function mdbDat(s){ if(!s)return null; let d=new Date(s); return isNaN(d.getTime())?null:d; }
function mdbDatDE(s){ let d=mdbDat(s); return d?d.toLocaleDateString('de-DE'):'–'; }
function mdbHeute(){ return new Date().toISOString().slice(0,10); }
function mdbTage(a,b){ let d1=mdbDat(a),d2=mdbDat(b); if(!d1||!d2)return 0; return Math.round((d2-d1)/86400000); }
function mdbEsc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function mdbBytes(b){ if(!b)return '0 KB'; if(b<1048576)return Math.round(b/1024)+' KB'; if(b<1073741824)return (b/1048576).toFixed(1).replace('.',',')+' MB'; return (b/1073741824).toFixed(2).replace('.',',')+' GB'; }

/* ---------- Statistik ---------- */
function mdbMedian(a){ if(!a.length)return 0; let s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function mdbMittel(a){ return a.length? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function mdbQuantil(a,q){ if(!a.length)return 0; let s=a.slice().sort((x,y)=>x-y),p=(s.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p); return lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(p-lo); }
const MDB_MIN_N=5;   /* unter dieser Fallzahl gilt keine Aussage als belastbar */

/* ---------- Speicher (IndexedDB) ---------- */
const MDB_NAME='vb_marktdaten', MDB_VER=1, MDB_MIRROR='vb_markt_mirror';
let mdbDB=null, MDBALL=[], MDB_EDIT=null, MDB_PENDING=[], MDB_INIT=false;
let MDB_SORT={k:'datum',d:-1}, MDB_CHART='zeit';

function mdbOpen(){
  return new Promise((res,rej)=>{
    if(mdbDB) return res(mdbDB);
    if(!window.indexedDB) return rej(new Error('Dieser Browser stellt keine Datenbank bereit.'));
    let rq=indexedDB.open(MDB_NAME,MDB_VER);
    rq.onupgradeneeded=e=>{
      let db=e.target.result;
      if(!db.objectStoreNames.contains('objekte')){
        let s=db.createObjectStore('objekte',{keyPath:'id'});
        s.createIndex('gemeinde','gemeinde'); s.createIndex('art','art'); s.createIndex('datum','datum');
      }
      if(!db.objectStoreNames.contains('anhaenge')) db.createObjectStore('anhaenge',{keyPath:'id'});
      if(!db.objectStoreNames.contains('meta'))     db.createObjectStore('meta',{keyPath:'k'});
    };
    rq.onsuccess=e=>{ mdbDB=e.target.result; res(mdbDB); };
    rq.onerror=()=>rej(rq.error||new Error('Datenbank konnte nicht geöffnet werden'));
  });
}
function mdbR(r){ return new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function mdbS(name,mode){ return mdbDB.transaction(name,mode||'readonly').objectStore(name); }

async function mdbAll(){    await mdbOpen(); return await mdbR(mdbS('objekte').getAll()); }
async function mdbPut(o){   await mdbOpen(); o.ts=Date.now(); return await mdbR(mdbS('objekte','readwrite').put(o)); }
async function mdbDel(id){  await mdbOpen(); return await mdbR(mdbS('objekte','readwrite').delete(id)); }
async function mdbAGet(id){ await mdbOpen(); return await mdbR(mdbS('anhaenge').get(id)); }
async function mdbAPut(a){  await mdbOpen(); return await mdbR(mdbS('anhaenge','readwrite').put(a)); }
async function mdbADel(id){ await mdbOpen(); return await mdbR(mdbS('anhaenge','readwrite').delete(id)); }
async function mdbAAll(){   await mdbOpen(); return await mdbR(mdbS('anhaenge').getAll()); }
async function mdbMGet(k){  await mdbOpen(); let r=await mdbR(mdbS('meta').get(k)); return r?r.v:null; }
async function mdbMPut(k,v){await mdbOpen(); return await mdbR(mdbS('meta','readwrite').put({k:k,v:v})); }
async function mdbQuota(){
  try{ if(navigator.storage&&navigator.storage.estimate) return await navigator.storage.estimate(); }catch(e){}
  return null;
}

/* Zweitkopie im localStorage — unabhängiger Speicher. Greift, falls die
   IndexedDB verloren geht (Safari räumt sie bei Speicherdruck auf). */
function mdbMirrorWrite(){
  try{
    let lean=MDBALL.map(o=>{ let c=Object.assign({},o); delete c.pdfs; return c; });
    localStorage.setItem(MDB_MIRROR, JSON.stringify({ts:Date.now(),n:lean.length,data:lean}));
    return true;
  }catch(e){ return false; }
}
function mdbMirrorRead(){ try{ return JSON.parse(localStorage.getItem(MDB_MIRROR))||null; }catch(e){ return null; } }

/* ---------- Feldschema ---------- */
const MDB_ART=['Einfamilienhaus','Doppelhaushälfte','Reihenhaus','Zweifamilienhaus','Mehrfamilienhaus','Eigentumswohnung','Wohn-/Geschäftshaus','Gewerbeobjekt','Baugrundstück','Sonstiges'];
const MDB_STATUS=['Angebot aktuell','Preis reduziert','Verkauft','Vom Markt genommen','Archiv'];
const MDB_QUELLE=['ImmoScout24','Immowelt / Immonet','Kleinanzeigen','Anderes Portal','Eigene Akquise','Kundenunterlagen','Kollege / Marktkenntnis','Notar / Kaufvertrag','Zeitung / Aushang'];
const MDB_GUETE=['A – beurkundet / eigene Unterlagen','B – vollständiges Exposé','C – lückenhaft / Hörensagen'];
const MDB_ZUSTAND=['Neubau / neuwertig','saniert / modernisiert','gepflegt','normal','renovierungsbedürftig','sanierungsbedürftig','Abriss / Rohbau'];
const MDB_HEIZ=['Gas','Öl','Wärmepumpe','Fernwärme','Pellets / Holz','Nachtspeicher','Gas + Solarthermie','Sonstige'];
const MDB_LAGEQ=['1 – einfach','2 – mäßig','3 – mittel','4 – gut','5 – sehr gut'];
const MDB_STD=['1 – sehr einfach','2 – einfach','3 – mittel','4 – gehoben','5 – stark gehoben'];
const MDB_VERM=['frei / bezugsfrei','vermietet','teilvermietet','vom Eigentümer bewohnt'];

const MDB_SCHEMA=[
 {g:'Lage', f:[
   {k:'gemeinde', l:'Gemeinde', t:'txt', req:1, dl:'mdb_dl_gem', ph:'z.B. Ilsfeld'},
   {k:'ortsteil', l:'Ortsteil', t:'txt', dl:'mdb_dl_ot', ph:'z.B. Auenstein'},
   {k:'plz',      l:'PLZ', t:'txt'},
   {k:'strasse',  l:'Straße / Hausnr.', t:'txt', dl:'mdb_dl_str'},
   {k:'lage_q',   l:'Lagequalität', t:'sel', req:1, o:MDB_LAGEQ},
   {k:'brw',      l:'Bodenrichtwert', t:'num', u:'€/m²'}
 ]},
 {g:'Objekt', f:[
   {k:'art',       l:'Objektart', t:'sel', req:1, o:MDB_ART},
   {k:'baujahr',   l:'Baujahr', t:'num', req:1},
   {k:'mod_jahr',  l:'Modernisierung', t:'num', u:'Jahr'},
   {k:'zustand',   l:'Zustand', t:'sel', o:MDB_ZUSTAND},
   {k:'standard',  l:'Ausstattungsstandard', t:'sel', o:MDB_STD},
   {k:'zimmer',    l:'Zimmer', t:'num'},
   {k:'etage',     l:'Etage (bei ETW)', t:'txt', ph:'z.B. 2. OG'},
   {k:'geschosse', l:'Geschosse', t:'num'},
   {k:'keller',    l:'Keller', t:'sel', o:['nicht unterkellert','teilunterkellert','voll unterkellert']},
   {k:'stellplatz',l:'Stellplatz', t:'sel', o:['keiner','Außenstellplatz','Carport','Garage','Doppelgarage','TG-Stellplatz']},
   {k:'freisitz',  l:'Balkon / Terrasse', t:'sel', o:['keiner','Balkon','Terrasse','Balkon + Terrasse','Loggia','Dachterrasse']},
   {k:'dach',      l:'Dachform', t:'txt', ph:'z.B. Satteldach'}
 ]},
 {g:'Flächen', f:[
   {k:'wohnflaeche', l:'Wohnfläche', t:'num', req:1, u:'m²'},
   {k:'nutzflaeche', l:'Nutzfläche', t:'num', u:'m²'},
   {k:'grundstueck', l:'Grundstück', t:'num', u:'m²'},
   {k:'mea',         l:'Miteigentumsanteil', t:'num', u:'‰'},
   {k:'hausgeld',    l:'Hausgeld', t:'num', u:'€/Monat'},
   {k:'ruecklage',   l:'Instandhaltungsrücklage', t:'num', u:'€'}
 ]},
 {g:'Energie', f:[
   {k:'heizung',   l:'Heizung', t:'sel', o:MDB_HEIZ},
   {k:'heiz_bj',   l:'Baujahr Heizung', t:'num'},
   {k:'ekennwert', l:'Energiekennwert', t:'num', u:'kWh/m²a'},
   {k:'eklasse',   l:'Effizienzklasse', t:'sel', o:['A+','A','B','C','D','E','F','G','H']},
   {k:'ausweis',   l:'Energieausweis', t:'sel', o:['Verbrauchsausweis','Bedarfsausweis','liegt nicht vor']},
   {k:'fenster',   l:'Fenster', t:'txt', ph:'z.B. 2-fach verglast, 2015'}
 ]},
 {g:'Recht &amp; Vermietung', f:[
   {k:'vermietung', l:'Nutzung', t:'sel', o:MDB_VERM},
   {k:'miete_pa',   l:'Jahresnettomiete', t:'num', u:'€/Jahr'},
   {k:'erbbauzins', l:'Erbbauzins', t:'num', u:'€/Jahr'},
   {k:'erbbau',     l:'Erbbaurecht', t:'chk'},
   {k:'wohnrecht',  l:'Wohnrecht / Nießbrauch', t:'chk'},
   {k:'denkmal',    l:'Denkmalschutz', t:'chk'}
 ]},
 {g:'Preis &amp; Vermarktung', f:[
   {k:'status',    l:'Status', t:'sel', req:1, o:MDB_STATUS},
   {k:'datum',     l:'Erfasst / Inserat ab', t:'date', req:1},
   {k:'preis',     l:'Aktueller Angebotspreis', t:'num', req:1, u:'€'},
   {k:'kaufpreis', l:'Tatsächlicher Kaufpreis', t:'num', u:'€ — nur wenn bekannt'},
   {k:'kp_datum',  l:'Kaufvertrag / verkauft am', t:'date'},
   {k:'provision', l:'Provision', t:'txt', ph:'z.B. 3,57 % / provisionsfrei'}
 ]},
 {g:'Quelle &amp; eigene Bewertung', f:[
   {k:'quelle',  l:'Datenquelle', t:'sel', req:1, o:MDB_QUELLE},
   {k:'guete',   l:'Datengüte', t:'sel', req:1, o:MDB_GUETE},
   {k:'url',     l:'Link zum Inserat', t:'txt', ph:'optional'},
   {k:'eigene_bewertung', l:'Eigene Preisermittlung', t:'num', u:'€'},
   {k:'eb_datum',l:'Bewertung vom', t:'date'},
   {k:'notiz',   l:'Notiz', t:'ta', full:1}
 ]}
];
const MDB_KEYS=(function(){ let a=[]; MDB_SCHEMA.forEach(g=>g.f.forEach(f=>a.push(f))); return a; })();

/* ---------- Abgeleitete Kennzahlen ---------- */
function mdbDeriv(o){
  let wf=mdbNum(o.wohnflaeche), kp=mdbNum(o.kaufpreis), an=mdbNum(o.preis);
  let hist=(o.hist||[]).filter(h=>mdbNum(h.p)>0&&h.d).sort((a,b)=>(a.d<b.d?-1:1));
  let erst = hist.length? mdbNum(hist[0].p) : an;
  let wert = kp>0 ? kp : an;
  let laeuft = (o.status==='Angebot aktuell'||o.status==='Preis reduziert');
  let ende = o.kp_datum || (laeuft ? mdbHeute() : (hist.length? hist[hist.length-1].d : null));
  return {
    wf:wf, wert:wert, basis:(kp>0?'KP':'AN'), erst:erst, laeuft:laeuft,
    eurm2:  wf>0 ? wert/wf : 0,
    grdm2:  mdbNum(o.grundstueck)>0 ? wert/mdbNum(o.grundstueck) : 0,
    redPct: erst>0 && an<erst ? (erst-an)/erst*100 : 0,      /* nur Angebot gegen Angebot */
    reduziert: erst>0 && an<erst*0.995,
    dauer:  ende ? mdbTage(o.datum,ende) : 0,
    faktor: mdbNum(o.miete_pa)>0 ? wert/mdbNum(o.miete_pa) : 0,
    ref:    o.kp_datum || o.datum,
    lq:     parseInt(o.lage_q)||0,
    abw:    mdbNum(o.eigene_bewertung)>0 && kp>0 ? (mdbNum(o.eigene_bewertung)-kp)/kp*100 : null
  };
}

/* ---------- Öffnen / Schließen / Reiter ---------- */
async function mdbOeffnen(){
  $('mdb_overlay').classList.add('on');
  document.body.style.overflow='hidden';
  if(!MDB_INIT){
    MDB_INIT=true;
    try{
      mdbBuildForm(); mdbBuildFilter(); mdbBuildZiel();
      if(navigator.storage&&navigator.storage.persist){ try{ await navigator.storage.persist(); }catch(e){} }
      await mdbLaden();
      mdbNeu();
    }catch(e){
      MDB_INIT=false;
      $('mdb_banner').innerHTML='<div class="mdb-crit"><b>Die Marktdatenbank konnte nicht geöffnet werden:</b> '+mdbEsc(e.message||e)+
        '<br>Der Vordruck ist davon nicht betroffen und funktioniert unverändert weiter.</div>';
      return;
    }
  }
  mdbRender(); mdbBackupCheck();
}
function mdbClose(){
  $('mdb_overlay').classList.remove('on'); document.body.style.overflow='';
  /* vom Startbildschirm aus geoeffnet: dorthin zurueck, nicht in ein leeres Formular */
  if(!document.body.classList.contains('started')) startStep0();
}
function mdbTab(t){
  ['dash','liste','erf','vgl','sich'].forEach(x=>{
    $('mdbp_'+x).classList.toggle('on',x===t);
    $('mdbt_'+x).classList.toggle('on',x===t);
  });
  if(t==='sich') mdbSpeicherStatus();
  if(t==='dash'||t==='liste') mdbRender();
  $('mdb_overlay').scrollTop=0;
}
async function mdbLaden(){
  MDBALL=await mdbAll();
  MDBALL.sort((a,b)=>((b.datum||'')<(a.datum||'')?-1:1));
  mdbDatalists();
}
function mdbDatalists(){
  const fill=(id,key)=>{
    let s=[...new Set(MDBALL.map(o=>(o[key]||'').trim()).filter(Boolean))].sort();
    let el=$(id); if(el) el.innerHTML=s.map(v=>'<option value="'+mdbEsc(v)+'">').join('');
  };
  fill('mdb_dl_gem','gemeinde'); fill('mdb_dl_ot','ortsteil'); fill('mdb_dl_str','strasse');
}

/* ---------- Erfassungsformular ---------- */
function mdbBuildForm(){
  let h='';
  MDB_SCHEMA.forEach((g,i)=>{
    h+='<h3'+(i?' class="sep"':'')+'>'+g.g+'</h3><div class="grid three">';
    g.f.forEach(f=>{ h+=mdbFeldHtml(f,'mdbf_'); });
    h+='</div>';
  });
  $('mdb_form').innerHTML=h;
}
function mdbFeldHtml(f,pre){
  let id=pre+f.k;
  let lab=f.l+(f.req?' <span style="color:#9d2b2b">*</span>':'')+(f.u?' <span class="u">'+f.u+'</span>':'');
  let cls='field'+(f.full?' full':'');
  if(f.t==='chk') return '<div class="'+cls+'" style="justify-content:flex-end"><label class="toggle" style="margin:0"><input type="checkbox" id="'+id+'"> '+f.l+'</label></div>';
  if(f.t==='ta')  return '<div class="'+cls+'" style="grid-column:1/-1"><label>'+lab+'</label><textarea id="'+id+'" rows="2"></textarea></div>';
  if(f.t==='sel'){
    let o='<option value=""></option>'+f.o.map(x=>'<option>'+mdbEsc(x)+'</option>').join('');
    return '<div class="'+cls+'"><label>'+lab+'</label><select id="'+id+'">'+o+'</select></div>';
  }
  return '<div class="'+cls+'"><label>'+lab+'</label><input id="'+id+'" type="'+(f.t==='date'?'date':'text')+'"'+
         (f.dl?' list="'+f.dl+'"':'')+(f.ph?' placeholder="'+mdbEsc(f.ph)+'"':'')+'></div>';
}
function mdbFormLesen(){
  let o={};
  MDB_KEYS.forEach(f=>{
    let e=$('mdbf_'+f.k); if(!e)return;
    o[f.k]= f.t==='chk' ? e.checked : e.value.trim();
  });
  o.hist=mdbHistLesen();
  o.pdfs=MDB_PENDING.map(p=>({id:p.id,name:p.name,size:p.size}));
  return o;
}
function mdbFormSchreiben(o){
  MDB_KEYS.forEach(f=>{
    let e=$('mdbf_'+f.k); if(!e)return;
    if(f.t==='chk') e.checked=!!o[f.k]; else e.value=(o[f.k]==null?'':o[f.k]);
  });
  mdbHistRender(o.hist||[]);
  MDB_PENDING=(o.pdfs||[]).map(p=>({id:p.id,name:p.name,size:p.size}));
  mdbPdfRender();
}
function mdbNeu(){
  MDB_EDIT=null; MDB_PENDING=[];
  MDB_KEYS.forEach(f=>{ let e=$('mdbf_'+f.k); if(!e)return; if(f.t==='chk')e.checked=false; else e.value=''; });
  $('mdbf_datum').value=mdbHeute();
  $('mdbf_status').value='Angebot aktuell';
  $('mdbf_quelle').value='ImmoScout24';
  $('mdbf_guete').value=MDB_GUETE[1];
  mdbHistRender([]); mdbPdfRender();
  setT('mdb_formtitel','Neues Objekt'); $('mdb_delbtn').style.display='none';
  setT('mdb_saveinfo',''); setT('mdb_parseinfo','');
  $('mdb_paste').value='';
}
function mdbBearbeiten(id){
  let o=MDBALL.find(x=>x.id===id); if(!o)return;
  MDB_EDIT=id; mdbFormSchreiben(o);
  setT('mdb_formtitel','Objekt bearbeiten — '+(((o.strasse||'')+' '+(o.gemeinde||'')).trim()||'ohne Adresse'));
  $('mdb_delbtn').style.display='';
  setT('mdb_saveinfo',''); mdbTab('erf');
}
function mdbPflichtFehlt(o){
  return MDB_KEYS.filter(f=>f.req).filter(f=>{
    let v=o[f.k]; return f.t==='num' ? !(mdbNum(v)>0) : !v;
  }).map(f=>f.l);
}
async function mdbSpeichern(weiter){
  let o=mdbFormLesen();
  let fehlt=mdbPflichtFehlt(o);
  if(fehlt.length){ alert('Bitte noch ausfüllen:\n\n· '+fehlt.join('\n· ')); return; }
  o.id=MDB_EDIT||('o'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  if(!MDB_EDIT) o.angelegt=Date.now();
  try{
    for(let p of MDB_PENDING){ if(p.blob){ await mdbAPut({id:p.id,objId:o.id,name:p.name,size:p.size,blob:p.blob}); delete p.blob; } }
    if(MDB_EDIT){
      let alt=MDBALL.find(x=>x.id===MDB_EDIT);
      let weg=((alt&&alt.pdfs)||[]).filter(p=>!MDB_PENDING.some(q=>q.id===p.id));
      for(let p of weg) await mdbADel(p.id);
    }
    await mdbPut(o);
    await mdbLaden();
    let m=mdbMirrorWrite();
    if(weiter){ let g=o.gemeinde,q=o.quelle; mdbNeu(); $('mdbf_gemeinde').value=g; $('mdbf_quelle').value=q; }
    else mdbBearbeiten(o.id);
    /* erst nach mdbNeu()/mdbBearbeiten() setzen — beide leeren die Meldung */
    setT('mdb_saveinfo','✓ gespeichert — '+MDBALL.length+' Objekte im Bestand'+(m?'':' · Zweitkopie voll, bitte sichern'));
    mdbRender(); mdbBackupCheck();
  }catch(e){
    alert('Speichern fehlgeschlagen: '+(e.message||e)+'\n\nMöglicherweise ist der Browserspeicher voll. Bitte im Reiter „Datensicherung" prüfen und ggf. PDF-Anhänge löschen.');
  }
}
async function mdbLoeschen(){
  if(!MDB_EDIT)return;
  let o=MDBALL.find(x=>x.id===MDB_EDIT);
  if(!confirm('Objekt endgültig löschen?\n\n'+(((o&&o.strasse)||'')+' '+((o&&o.gemeinde)||'')).trim()))return;
  for(let p of ((o&&o.pdfs)||[])) await mdbADel(p.id);
  await mdbDel(MDB_EDIT);
  await mdbLaden(); mdbMirrorWrite(); mdbNeu(); mdbRender(); mdbTab('liste');
}

/* ---------- Preishistorie ---------- */
function mdbHistRender(list){
  let tb=$('mdb_hist').querySelector('tbody'); tb.innerHTML='';
  (list||[]).forEach(h=>mdbHistRow(h.d,h.p,h.n));
  if(!list||!list.length) mdbHistRow('','','');
}
function mdbHistRow(d,p,n){
  let tb=$('mdb_hist').querySelector('tbody');
  let tr=document.createElement('tr');
  tr.innerHTML='<td><input type="date" class="h-d" value="'+mdbEsc(d||'')+'"></td>'+
               '<td><input type="text" class="h-p" value="'+mdbEsc(p==null?'':p)+'"></td>'+
               '<td><input type="text" class="h-n" value="'+mdbEsc(n||'')+'" placeholder="z.B. Ersteinstellung, 1. Reduzierung"></td>'+
               '<td class="del"><button type="button">&#10005;</button></td>';
  tr.querySelector('button').onclick=function(){ tr.remove(); };
  tb.appendChild(tr);
}
function mdbHistAdd(){ mdbHistRow(mdbHeute(),$('mdbf_preis').value,''); }
function mdbHistLesen(){
  let out=[];
  $('mdb_hist').querySelectorAll('tbody tr').forEach(tr=>{
    let d=tr.querySelector('.h-d').value, p=mdbNum(tr.querySelector('.h-p').value), n=tr.querySelector('.h-n').value.trim();
    if(d&&p>0) out.push({d:d,p:p,n:n});
  });
  return out.sort((a,b)=>(a.d<b.d?-1:1));
}

/* ---------- PDF-Anhänge ---------- */
const MDB_PDF_MAX=15*1048576;
async function mdbAddPdf(files){
  if(!files||!files.length)return;
  let q=await mdbQuota();
  if(q && q.quota && q.usage/q.quota>0.85){
    alert('Der Speicher ist zu über 85 % belegt ('+mdbBytes(q.usage)+' von '+mdbBytes(q.quota)+').\n\n'+
          'Bitte zuerst eine vollständige Sicherung anlegen und einige PDF-Anhänge löschen (Reiter „Datensicherung"), bevor weitere Anhänge dazukommen.');
    return;
  }
  for(let f of files){
    if(f.size>MDB_PDF_MAX && !confirm('„'+f.name+'" ist '+mdbBytes(f.size)+' groß. Solche Dateien füllen den Speicher schnell.\n\nTrotzdem anhängen?')) continue;
    MDB_PENDING.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:f.name,size:f.size,blob:f});
  }
  mdbPdfRender();
}
function mdbPdfRender(){
  let el=$('mdb_pdflist');
  if(!MDB_PENDING.length){ el.innerHTML='<p class="hint" style="margin:8px 0 0">Noch kein PDF angehängt.</p>'; return; }
  el.innerHTML=MDB_PENDING.map(p=>
    '<div class="pdfrow"><span>&#128196;</span><span class="nm">'+mdbEsc(p.name)+'</span><span class="sz">'+mdbBytes(p.size)+'</span>'+
    (p.blob?'<span class="badge">neu</span>':'<button type="button" onclick="mdbPdfOeffnen(&quot;'+idSicher(p.id)+'&quot;)">Öffnen</button>')+
    '<button type="button" style="color:#9d2b2b" onclick="mdbPdfWeg(&quot;'+idSicher(p.id)+'&quot;)">Entfernen</button></div>').join('')+
    '<p class="hint" style="margin:8px 0 0">Zusammen '+mdbBytes(MDB_PENDING.reduce((s,p)=>s+p.size,0))+' — Anhänge werden beim Speichern übernommen.</p>';
}
function mdbPdfWeg(id){ MDB_PENDING=MDB_PENDING.filter(p=>p.id!==id); mdbPdfRender(); }
async function mdbPdfOeffnen(id){
  let a=await mdbAGet(id); if(!a){ alert('Anhang nicht gefunden.'); return; }
  let u=URL.createObjectURL(a.blob); window.open(u,'_blank'); setTimeout(()=>URL.revokeObjectURL(u),60000);
}

/* ---------- Schnellerfassung: Exposé-Text auswerten ---------- */
const MDB_PAT=[
 ['wohnflaeche', /wohnfl(?:ä|ae)che[^\d]{0,25}([\d.,]{1,9})\s*(?:m|qm)/i],
 ['nutzflaeche', /nutzfl(?:ä|ae)che[^\d]{0,25}([\d.,]{1,9})\s*(?:m|qm)/i],
 ['grundstueck', /grundst(?:ü|ue)ck(?:sfl(?:ä|ae)che)?[^\d]{0,25}([\d.,]{1,9})\s*(?:m|qm)/i],
 ['zimmer',      /zimmer[^\d]{0,25}([\d]{1,2}(?:[.,]5)?)\b/i],
 ['baujahr',     /baujahr[^\d]{0,25}((?:1[5-9]|20)\d\d)/i],
 ['mod_jahr',    /(?:modernisierung|sanierung|letzte modernisierung)[^\d]{0,30}((?:19|20)\d\d)/i],
 ['etage',       /etage[^\wä]{0,12}([\w.\- ]{1,16})/i],
 ['ekennwert',   /(?:energieverbrauchskennwert|endenergiebedarf|energiekennwert|energiebedarf|endenergieverbrauch)[^\d]{0,35}([\d.,]{1,7})/i],
 ['eklasse',     /energieeffizienzklasse[^A-Ha-h]{0,18}(A\+|[A-H])\b/i],
 ['hausgeld',    /(?:hausgeld|wohngeld)[^\d]{0,25}([\d.,]{1,9})/i],
 ['miete_pa',    /(?:jahresnettomiete|jahresmiete|mieteinnahmen p\.?a\.?)[^\d]{0,25}([\d.,]{1,12})/i],
 ['heiz_bj',     /heizung[^\d]{0,30}((?:19|20)\d\d)/i],
 ['plz',         /\b(\d{5})\s+[A-ZÄÖÜ]/],
 ['provision',   /(provisionsfrei|courtagefrei)/i]
];
function mdbParsePaste(){
  let t=$('mdb_paste').value; if(!t.trim()){ setT('mdb_parseinfo','Bitte zuerst Text einfügen.'); return; }
  let treffer=[];
  const setzen=(k,v)=>{ let e=$('mdbf_'+k); if(e&&v!==''&&v!=null&&!e.value){ e.value=v; treffer.push(k); } };

  MDB_PAT.forEach(p=>{
    let m=t.match(p[1]); if(!m)return;
    let v=m[1].trim();
    if(['wohnflaeche','nutzflaeche','grundstueck','zimmer','hausgeld','miete_pa','ekennwert'].indexOf(p[0])>-1) v=mdbDeZahl(mdbNum(v));
    if(p[0]==='provision') v='provisionsfrei';
    if(p[0]==='eklasse') v=v.toUpperCase();
    setzen(p[0],v);
  });

  /* Preis: erst beschriftet suchen, sonst den größten €-Betrag im Text nehmen */
  let pm=t.match(/(?:kaufpreis|kaufpreisvorstellung|preis)\s*[:\s]{0,4}([\d.\s]{3,14})(?:,\d\d)?\s*(?:€|eur)/i);
  let preis=pm?mdbNum(pm[1]):0;
  if(!preis){
    let alle=[...t.matchAll(/([\d]{1,3}(?:\.[\d]{3})+)(?:,\d\d)?\s*(?:€|eur)/gi)].map(m=>mdbNum(m[1])).filter(v=>v>=10000);
    if(alle.length) preis=Math.max.apply(null,alle);
  }
  if(preis) setzen('preis',mdbDeZahl(preis));

  /* Objektart aus Schlagwörtern */
  const artMap=[[/doppelhaush(ä|ae)lfte|dhh/i,'Doppelhaushälfte'],[/reihen(mittel|end)?haus|reihenhaus|rmh|reh/i,'Reihenhaus'],
    [/zweifamilienhaus|zfh/i,'Zweifamilienhaus'],[/mehrfamilienhaus|mfh/i,'Mehrfamilienhaus'],
    [/wohn-?\s*(und|\/)\s*gesch(ä|ae)ftshaus/i,'Wohn-/Geschäftshaus'],
    [/eigentumswohnung|etw|wohnung/i,'Eigentumswohnung'],[/einfamilienhaus|efh/i,'Einfamilienhaus'],
    [/baugrundst(ü|ue)ck|bauplatz|baugrund/i,'Baugrundstück'],[/gewerbe|laden|b(ü|ue)ro|halle/i,'Gewerbeobjekt']];
  for(let a of artMap){ if(a[0].test(t)){ setzen('art',a[1]); break; } }

  /* Heizung */
  const heizMap=[[/w(ä|ae)rmepumpe/i,'Wärmepumpe'],[/fernw(ä|ae)rme/i,'Fernwärme'],[/pellet|holz|scheitholz/i,'Pellets / Holz'],
    [/nachtspeicher/i,'Nachtspeicher'],[/(ö|oe)l/i,'Öl'],[/gas/i,'Gas']];
  for(let h of heizMap){ if(h[0].test(t)){ setzen('heizung',h[1]); break; } }

  /* Ort aus "74360 Ilsfeld" */
  let om=t.match(/\b\d{5}\s+([A-ZÄÖÜ][\wäöüß.\-]+(?:[ \-][A-ZÄÖÜ][\wäöüß.\-]+)?)/);
  if(om) setzen('gemeinde',om[1].trim());

  /* Zustand */
  const zMap=[[/kernsaniert|vollsaniert|komplett saniert/i,'saniert / modernisiert'],[/neubau|erstbezug|neuwertig/i,'Neubau / neuwertig'],
    [/sanierungsbed(ü|ue)rftig|sanierungsstau/i,'sanierungsbedürftig'],[/renovierungsbed(ü|ue)rftig/i,'renovierungsbedürftig'],
    [/gepflegt|gut erhalten/i,'gepflegt']];
  for(let z of zMap){ if(z[0].test(t)){ setzen('zustand',z[1]); break; } }

  if($('mdbf_preis').value && !mdbHistLesen().length && $('mdbf_datum').value){
    mdbHistRender([{d:$('mdbf_datum').value,p:mdbNum($('mdbf_preis').value),n:'Ersteinstellung'}]);
  }
  setT('mdb_parseinfo', treffer.length? '✓ '+treffer.length+' Felder übernommen — bitte prüfen und Lagequalität ergänzen.'
                                      : 'Keine verwertbaren Angaben gefunden — bitte von Hand erfassen.');
}


/* ---------- Filter ---------- */
let MDBF={von:'',bis:'',gem:'',art:'',basis:'',guete:'',idx:false,umr:false,rate:''};
const MDB_FILTERDEF=[
  {k:'von',   l:'Zeitraum von', t:'date'},
  {k:'bis',   l:'bis',          t:'date'},
  {k:'gem',   l:'Gemeinde',     t:'sel', dyn:'gemeinde'},
  {k:'art',   l:'Objektart',    t:'sel', o:MDB_ART},
  {k:'basis', l:'Preisbasis',   t:'sel', o:[['kp','nur echte Kaufpreise'],['an','nur Angebotspreise']]},
  {k:'guete', l:'Datengüte',    t:'sel', o:[['A','nur A'],['AB','A und B']]}
];
function mdbBuildFilter(){
  ['mdb_filter','mdb_filter2'].forEach(cid=>{
    let pre=cid==='mdb_filter'?'ff1_':'ff2_', h='';
    MDB_FILTERDEF.forEach(f=>{
      h+='<div class="field"><label>'+f.l+'</label>';
      if(f.t==='date') h+='<input type="date" id="'+pre+f.k+'" onchange="mdbFilterAendern(this)" data-k="'+f.k+'">';
      else{
        let opts='<option value="">alle</option>';
        if(f.dyn) opts+='__DYN__';
        else f.o.forEach(x=>{ let v=Array.isArray(x)?x[0]:x, t=Array.isArray(x)?x[1]:x; opts+='<option value="'+mdbEsc(v)+'">'+mdbEsc(t)+'</option>'; });
        h+='<select id="'+pre+f.k+'" onchange="mdbFilterAendern(this)" data-k="'+f.k+'">'+opts+'</select>';
      }
      h+='</div>';
    });
    h+='<div class="field" style="grid-column:1/-1;flex-direction:row;gap:18px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--line);padding-top:10px;margin-top:2px">'+
       '<label class="toggle" style="margin:0;font-size:12.5px"><input type="checkbox" id="'+pre+'idx" data-k="idx" onchange="mdbFilterAendern(this)"> Preise auf heutiges Niveau indexieren</label>'+
       '<div class="field" style="flex-direction:row;align-items:center;gap:6px"><label style="margin:0;font-size:12px">Index</label>'+
       '<input id="'+pre+'rate" data-k="rate" onchange="mdbFilterAendern(this)" style="width:78px" placeholder="% p.a."></div>'+
       '<label class="toggle" style="margin:0;font-size:12.5px"><input type="checkbox" id="'+pre+'umr" data-k="umr" onchange="mdbFilterAendern(this)"> Angebote auf Kaufpreisniveau umrechnen</label>'+
       '<button onclick="mdbFilterReset()" style="border:1px solid var(--line);font-size:12px;padding:5px 10px;margin-left:auto">Filter zurücksetzen</button></div>';
    $(cid).innerHTML=h;
  });
}
function mdbFilterGemeinden(){
  let s=[...new Set(MDBALL.map(o=>(o.gemeinde||'').trim()).filter(Boolean))].sort();
  let opts=s.map(v=>'<option value="'+mdbEsc(v)+'">'+mdbEsc(v)+'</option>').join('');
  ['ff1_gem','ff2_gem'].forEach(id=>{
    let e=$(id); if(!e)return; let cur=MDBF.gem;
    e.innerHTML='<option value="">alle</option>'+opts; e.value=cur;
  });
}
function mdbFilterAendern(el){
  let k=el.dataset.k;
  MDBF[k]= el.type==='checkbox' ? el.checked : el.value;
  mdbFilterSync(); mdbRender();
}
function mdbFilterSync(){
  ['ff1_','ff2_'].forEach(pre=>{
    Object.keys(MDBF).forEach(k=>{
      let e=$(pre+k); if(!e)return;
      if(e.type==='checkbox') e.checked=!!MDBF[k]; else e.value=MDBF[k];
    });
  });
}
function mdbFilterReset(){ MDBF={von:'',bis:'',gem:'',art:'',basis:'',guete:'',idx:false,umr:false,rate:MDBF.rate}; mdbFilterSync(); mdbRender(); }

function mdbFilter(){
  return MDBALL.filter(o=>{
    let d=mdbDeriv(o);
    if(MDBF.von && (d.ref||'')<MDBF.von) return false;
    if(MDBF.bis && (d.ref||'')>MDBF.bis) return false;
    if(MDBF.gem && o.gemeinde!==MDBF.gem) return false;
    if(MDBF.art && o.art!==MDBF.art) return false;
    if(MDBF.basis==='kp' && d.basis!=='KP') return false;
    if(MDBF.basis==='an' && d.basis!=='AN') return false;
    if(MDBF.guete==='A'  && (o.guete||'').charAt(0)!=='A') return false;
    if(MDBF.guete==='AB' && 'AB'.indexOf((o.guete||'x').charAt(0))<0) return false;
    return true;
  });
}

/* ---------- Zeitindexierung & Kalibrierung ---------- */
function mdbTrend(list){
  /* Median €/m² der letzten 12 Monate gegen die 12 Monate davor */
  let h=new Date(), g1=[], g2=[];
  list.forEach(o=>{ let d=mdbDeriv(o); if(!(d.eurm2>0)||!d.ref)return;
    let t=mdbTage(d.ref,h.toISOString().slice(0,10));
    if(t>=0&&t<365) g1.push(d.eurm2); else if(t>=365&&t<730) g2.push(d.eurm2);
  });
  let m1=mdbMedian(g1), m2=mdbMedian(g2);
  return {pct:(m1>0&&m2>0)?(m1-m2)/m2*100:null, n1:g1.length, n2:g2.length};
}
function mdbRate(){
  if(MDBF.rate!=='') return mdbNum(MDBF.rate);
  let t=mdbTrend(MDBALL);
  return (t.pct!=null && t.n1>=MDB_MIN_N && t.n2>=MDB_MIN_N) ? t.pct : 0;
}
function mdbIndexF(ref){
  if(!MDBF.idx||!ref) return 1;
  let r=mdbRate()/100; if(!r) return 1;
  let j=mdbTage(ref,mdbHeute())/365.25; if(j<=0) return 1;
  return Math.pow(1+r,j);
}
function mdbAbschlag(){
  /* eigene Quote Angebot -> Kaufpreis, aus Fällen mit beiden Angaben */
  let q=[];
  MDBALL.forEach(o=>{
    let kp=mdbNum(o.kaufpreis); if(!(kp>0))return;
    let an=mdbNum(o.preis);              /* letzter Angebotspreis vor dem Abschluss */
    if(!(an>0))return;
    q.push((kp-an)/an*100);
  });
  return {pct:q.length?mdbMedian(q):null, n:q.length};
}
/* Auswertungswert eines Objekts: indexiert und ggf. auf Kaufpreisniveau umgerechnet */
function mdbWert(o){
  let d=mdbDeriv(o); let v=d.eurm2; if(!(v>0)) return 0;
  if(MDBF.umr && d.basis==='AN'){ let a=mdbAbschlag(); if(a.pct!=null && a.n>=3) v=v*(1+a.pct/100); }
  return v*mdbIndexF(d.ref);
}

/* ---------- SVG-Diagramme (ohne externe Bibliothek, offline nutzbar) ---------- */
const MDB_W=920, MDB_H=330, MDB_ML=68, MDB_MR=18, MDB_MT=16, MDB_MB=54;
function mdbTicks(min,max,n){
  if(max<=min){ max=min+1; }
  let span=(max-min)/n, mag=Math.pow(10,Math.floor(Math.log10(span))), norm=span/mag;
  let step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag;
  let lo=Math.floor(min/step)*step, out=[];
  for(let v=lo; v<=max+step*0.001; v+=step) if(v>=min-step*0.001) out.push(v);
  return out;
}
function mdbSvgFrame(inner,xl,yl){
  return '<svg viewBox="0 0 '+MDB_W+' '+MDB_H+'" width="100%" style="max-width:100%;height:auto;overflow:visible;font-family:inherit;font-size:11.5px">'+
    inner+
    (xl?'<text x="'+(MDB_ML+(MDB_W-MDB_ML-MDB_MR)/2)+'" y="'+(MDB_H-6)+'" text-anchor="middle" fill="var(--muted)">'+mdbEsc(xl)+'</text>':'')+
    (yl?'<text x="14" y="'+(MDB_MT+(MDB_H-MDB_MT-MDB_MB)/2)+'" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 14 '+(MDB_MT+(MDB_H-MDB_MT-MDB_MB)/2)+')">'+mdbEsc(yl)+'</text>':'')+
    '</svg>';
}
function mdbAxisY(vals,fmt){
  let min=Math.min.apply(null,vals), max=Math.max.apply(null,vals);
  let pad=(max-min)*0.12||Math.abs(max)*0.1||1;
  min=Math.max(0,min-pad); max=max+pad;
  let ticks=mdbTicks(min,max,5), h=MDB_H-MDB_MT-MDB_MB;
  let lo=ticks[0], hi=ticks[ticks.length-1];
  let y=v=>MDB_MT+h-(v-lo)/(hi-lo)*h;
  let g=ticks.map(t=>'<line x1="'+MDB_ML+'" x2="'+(MDB_W-MDB_MR)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/>'+
    '<text x="'+(MDB_ML-8)+'" y="'+(y(t)+4)+'" text-anchor="end" fill="var(--muted)">'+(fmt?fmt(t):mdbInt(t))+'</text>').join('');
  return {y:y,g:g,lo:lo,hi:hi};
}
function mdbSvgLine(pts,fmt,xl,yl){
  if(pts.length<2) return '<p class="mdb-empty">Für eine Zeitreihe werden mindestens zwei Zeiträume mit Daten gebraucht.</p>';
  let ax=mdbAxisY(pts.map(p=>p.y),fmt), w=MDB_W-MDB_ML-MDB_MR;
  let x=i=>MDB_ML+(pts.length===1?w/2:i*w/(pts.length-1));
  let d=pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+ax.y(p.y).toFixed(1)).join(' ');
  let area='M'+x(0)+' '+(MDB_H-MDB_MB)+' '+pts.map((p,i)=>'L'+x(i).toFixed(1)+' '+ax.y(p.y).toFixed(1)).join(' ')+' L'+x(pts.length-1)+' '+(MDB_H-MDB_MB)+' Z';
  let dots=pts.map((p,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+ax.y(p.y).toFixed(1)+'" r="4" fill="var(--accent)"><title>'+mdbEsc(p.x)+': '+(fmt?fmt(p.y):mdbInt(p.y))+' (n='+p.n+')</title></circle>').join('');
  let step=Math.ceil(pts.length/9);
  let lab=pts.map((p,i)=>i%step?'':'<text x="'+x(i).toFixed(1)+'" y="'+(MDB_H-MDB_MB+18)+'" text-anchor="middle" fill="var(--muted)">'+mdbEsc(p.x)+'</text>'+
    '<text x="'+x(i).toFixed(1)+'" y="'+(MDB_H-MDB_MB+32)+'" text-anchor="middle" fill="var(--muted)" font-size="10">n='+p.n+'</text>').join('');
  return mdbSvgFrame(ax.g+'<path d="'+area+'" fill="var(--accent)" opacity=".08"/>'+
    '<path d="'+d+'" fill="none" stroke="var(--accent)" stroke-width="2.2"/>'+dots+lab+
    '<line x1="'+MDB_ML+'" x2="'+(MDB_W-MDB_MR)+'" y1="'+(MDB_H-MDB_MB)+'" y2="'+(MDB_H-MDB_MB)+'" stroke="var(--line-2)"/>',xl,yl);
}
function mdbSvgBars(items,fmt,xl,yl){
  if(!items.length) return '<p class="mdb-empty">Keine Daten im gewählten Filter.</p>';
  let ax=mdbAxisY(items.map(p=>p.v).concat([0]),fmt), w=MDB_W-MDB_ML-MDB_MR;
  let bw=Math.min(76,w/items.length*0.62), gap=w/items.length;
  let bars=items.map((p,i)=>{
    let cx=MDB_ML+gap*(i+0.5), y=ax.y(p.v), h=(MDB_H-MDB_MB)-y;
    let schwach=p.n!=null&&p.n<MDB_MIN_N;
    return '<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+
      '" fill="'+(schwach?'var(--tint-b)':'var(--accent)')+'"><title>'+mdbEsc(p.l)+': '+(fmt?fmt(p.v):mdbInt(p.v))+(p.n!=null?' (n='+p.n+')':'')+'</title></rect>'+
      '<text x="'+cx.toFixed(1)+'" y="'+(y-6).toFixed(1)+'" text-anchor="middle" fill="var(--text)" font-weight="600">'+(fmt?fmt(p.v):mdbInt(p.v))+'</text>'+
      '<text x="'+cx.toFixed(1)+'" y="'+(MDB_H-MDB_MB+18)+'" text-anchor="middle" fill="var(--muted)">'+mdbEsc(p.l.length>16?p.l.slice(0,15)+'…':p.l)+'</text>'+
      (p.n!=null?'<text x="'+cx.toFixed(1)+'" y="'+(MDB_H-MDB_MB+32)+'" text-anchor="middle" fill="var(--muted)" font-size="10">n='+p.n+'</text>':'');
  }).join('');
  return mdbSvgFrame(ax.g+bars+'<line x1="'+MDB_ML+'" x2="'+(MDB_W-MDB_MR)+'" y1="'+(MDB_H-MDB_MB)+'" y2="'+(MDB_H-MDB_MB)+'" stroke="var(--line-2)"/>',xl,yl);
}
function mdbSvgScatter(pts,fx,fy,xl,yl){
  if(pts.length<3) return '<p class="mdb-empty">Für eine Streuung werden mindestens drei Objekte mit vollständigen Angaben gebraucht.</p>';
  let ax=mdbAxisY(pts.map(p=>p.y),fy), w=MDB_W-MDB_ML-MDB_MR;
  let xs=pts.map(p=>p.x), xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
  let xp=(xmax-xmin)*0.06||1; xmin-=xp; xmax+=xp;
  let xt=mdbTicks(xmin,xmax,6), x=v=>MDB_ML+(v-xt[0])/(xt[xt.length-1]-xt[0])*w;
  let grid=xt.map(t=>'<line x1="'+x(t).toFixed(1)+'" x2="'+x(t).toFixed(1)+'" y1="'+MDB_MT+'" y2="'+(MDB_H-MDB_MB)+'" stroke="var(--line)"/>'+
    '<text x="'+x(t).toFixed(1)+'" y="'+(MDB_H-MDB_MB+18)+'" text-anchor="middle" fill="var(--muted)">'+(fx?fx(t):mdbInt(t))+'</text>').join('');
  let dots=pts.map(p=>'<circle cx="'+x(p.x).toFixed(1)+'" cy="'+ax.y(p.y).toFixed(1)+'" r="5" fill="'+(p.kp?'var(--accent)':'#c9a227')+'" opacity=".72"><title>'+mdbEsc(p.t)+'</title></circle>').join('');
  /* Ausgleichsgerade (kleinste Quadrate) */
  let n=pts.length, sx=0,sy=0,sxy=0,sxx=0;
  pts.forEach(p=>{sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sxx+=p.x*p.x;});
  let nen=n*sxx-sx*sx, line='';
  if(Math.abs(nen)>1e-9){
    let b=(n*sxy-sx*sy)/nen, a=(sy-b*sx)/n;
    let x1=xt[0], x2=xt[xt.length-1];
    let y1=Math.max(ax.lo,Math.min(ax.hi,a+b*x1)), y2=Math.max(ax.lo,Math.min(ax.hi,a+b*x2));
    line='<line x1="'+x(x1).toFixed(1)+'" y1="'+ax.y(y1).toFixed(1)+'" x2="'+x(x2).toFixed(1)+'" y2="'+ax.y(y2).toFixed(1)+'" stroke="#9d2b2b" stroke-width="1.6" stroke-dasharray="6 4"/>';
  }
  return mdbSvgFrame(ax.g+grid+line+dots+'<line x1="'+MDB_ML+'" x2="'+(MDB_W-MDB_MR)+'" y1="'+(MDB_H-MDB_MB)+'" y2="'+(MDB_H-MDB_MB)+'" stroke="var(--line-2)"/>',xl,yl);
}

/* ---------- Kennzahlen-Kacheln ---------- */
function mdbKpis(list){
  let d=list.map(o=>({o:o,d:mdbDeriv(o),v:mdbWert(o)}));
  let m2=d.filter(x=>x.v>0).map(x=>x.v);
  let kp=d.filter(x=>x.d.basis==='KP');
  let fertig=d.filter(x=>x.d.dauer>0 && !x.d.laeuft);
  let red=d.filter(x=>x.d.erst>0 && (x.o.hist||[]).length);
  let redJa=red.filter(x=>x.d.reduziert);
  let fak=d.filter(x=>x.d.faktor>0).map(x=>x.d.faktor);
  let t=mdbTrend(list), ab=mdbAbschlag();
  let abwL=d.filter(x=>x.d.abw!=null).map(x=>x.d.abw);

  const kachel=(k,v,s,n,chart,cls)=>{
    let dim=(n!=null&&n<MDB_MIN_N);
    return '<div class="kpi'+(dim?' dim':'')+(MDB_CHART===chart&&!dim?' on':'')+'"'+
      (dim||!chart?'':' onclick="mdbChartWahl(&quot;'+chart+'&quot;)"')+'>'+
      '<div class="k">'+k+'</div><div class="v'+(cls||'')+'">'+(dim?'–':v)+'</div>'+
      '<div class="s">'+(dim?'n = '+(n||0)+' · keine belastbare Aussage':s)+'</div></div>';
  };
  let tr = (t.pct!=null&&t.n1>=MDB_MIN_N&&t.n2>=MDB_MIN_N)
    ? '<span class="'+(t.pct>=0?'up':'dn')+'">'+(t.pct>=0?'+':'')+mdbPct(t.pct)+'</span>' : '–';

  $('mdb_kpis').innerHTML=
    kachel('Objekte im Filter', mdbInt(list.length), kp.length+' mit echtem Kaufpreis · '+(list.length-kp.length)+' Angebote', null, 'ort')+
    kachel('Median €/m²', m2.length?mdbInt(mdbMedian(m2))+' €':'–',
           m2.length?'Ø '+mdbInt(mdbMittel(m2))+' € · Spanne '+mdbInt(mdbQuantil(m2,.25))+'–'+mdbInt(mdbQuantil(m2,.75))+' €':'–', m2.length, 'zeit')+
    kachel('Trend 12 Monate', tr, t.n1+' Fälle gegen '+t.n2+' im Vorjahr', Math.min(t.n1,t.n2), 'zeit')+
    kachel('Ø Vermarktungsdauer', fertig.length?mdbInt(mdbMedian(fertig.map(x=>x.d.dauer)))+' Tage':'–',
           fertig.length?'Median abgeschlossener Vermarktungen':'–', fertig.length, 'dauer')+
    kachel('Anteil mit Reduzierung', red.length?mdbPct(redJa.length/red.length*100):'–',
           redJa.length+' von '+red.length+' mit Preisverlauf', red.length, 'dauer')+
    kachel('Ø Preisreduzierung', redJa.length?mdbPct(mdbMedian(redJa.map(x=>x.d.redPct))):'–',
           'Median über die reduzierten Objekte', redJa.length, 'dauer')+
    kachel('Eigene Abschlagsquote', ab.pct!=null?(ab.pct>=0?'+':'')+mdbPct(ab.pct):'–',
           'letzter Angebotspreis → Kaufpreis · '+ab.n+' Fälle', ab.n, 'kalib')+
    kachel('Kaufpreisfaktor', fak.length?mdbMedian(fak).toLocaleString('de-DE',{maximumFractionDigits:1}):'–',
           fak.length?'Median · Ø-Rendite '+mdbPct(100/mdbMedian(fak)):'–', fak.length, 'kalib');

  if(abwL.length>=3){
    $('mdb_kpis').insertAdjacentHTML('beforeend',
      kachel('Eigene Bewertung vs. Kaufpreis', (mdbMedian(abwL)>=0?'+':'')+mdbPct(mdbMedian(abwL)),
             'Median über '+abwL.length+' Fälle mit beidem', abwL.length, 'kalib'));
  }
}

/* ---------- Diagramme ---------- */
const MDB_CHARTS=[
  ['zeit',    'Preisentwicklung'],
  ['ort',     'Ortsvergleich'],
  ['flaeche', 'Fläche ↔ €/m²'],
  ['baujahr', 'Baujahr ↔ €/m²'],
  ['dauer',   'Vermarktung & Reduzierung'],
  ['kalib',   'Eigene Bewertung']
];
function mdbChartWahl(c){ MDB_CHART=c; mdbRender(); }
function mdbChartPick(){
  $('mdb_chartpick').innerHTML=MDB_CHARTS.map(c=>
    '<button class="'+(MDB_CHART===c[0]?'on':'')+'" onclick="mdbChartWahl(&quot;'+c[0]+'&quot;)">'+c[1]+'</button>').join('');
}
function mdbChart(list){
  let el=$('mdb_chart'), eur=v=>mdbInt(v)+' €';
  let hin=MDBF.idx?' Preise sind mit '+mdbPct(mdbRate())+' p.a. auf heute indexiert.':'';
  if(MDBF.umr){ let a=mdbAbschlag(); if(a.pct!=null&&a.n>=3) hin+=' Angebotspreise sind mit '+mdbPct(a.pct)+' auf Kaufpreisniveau umgerechnet.'; }

  if(MDB_CHART==='zeit'){
    let g={};
    list.forEach(o=>{ let d=mdbDeriv(o), v=mdbWert(o); let dt=mdbDat(d.ref); if(!(v>0)||!dt)return;
      let k=dt.getFullYear()+'-Q'+(Math.floor(dt.getMonth()/3)+1); (g[k]=g[k]||[]).push(v); });
    let keys=Object.keys(g).sort();
    let pts=keys.map(k=>({x:k.replace('-',' '),y:mdbMedian(g[k]),n:g[k].length}));
    el.innerHTML='<h3>Preisentwicklung €/m²</h3><p class="hint">Median je Quartal. Quartale unter '+MDB_MIN_N+
      ' Fällen schwanken stark — die Fallzahl steht unter jedem Punkt.'+hin+'</p>'+mdbSvgLine(pts,eur,'Quartal','€/m² Wohnfläche');
  }
  else if(MDB_CHART==='ort'){
    let g={};
    list.forEach(o=>{ let v=mdbWert(o); let k=(o.gemeinde||'ohne Angabe')+((o.ortsteil&&MDBF.gem)?' · '+o.ortsteil:''); if(v>0)(g[k]=g[k]||[]).push(v); });
    let items=Object.keys(g).map(k=>({l:k,v:mdbMedian(g[k]),n:g[k].length})).sort((a,b)=>b.v-a.v).slice(0,12);
    el.innerHTML='<h3>Ortsvergleich €/m²</h3><p class="hint">Median je Gemeinde'+(MDBF.gem?' bzw. Ortsteil':'')+
      '. Hellblaue Balken beruhen auf weniger als '+MDB_MIN_N+' Fällen.'+hin+'</p>'+mdbSvgBars(items,eur,'','€/m² Wohnfläche');
  }
  else if(MDB_CHART==='flaeche'){
    let pts=list.map(o=>{ let d=mdbDeriv(o),v=mdbWert(o);
      return (d.wf>0&&v>0)?{x:d.wf,y:v,kp:d.basis==='KP',t:(o.strasse||'')+' '+(o.gemeinde||'')+' · '+mdbInt(d.wf)+' m² · '+mdbInt(v)+' €/m²'}:null; }).filter(Boolean);
    el.innerHTML='<h3>Flächendegression</h3><p class="hint">Je größer die Wohnfläche, desto niedriger meist der Quadratmeterpreis. '+
      'Die gestrichelte Linie ist die Ausgleichsgerade. Blau = Kaufpreis, gelb = Angebotspreis.'+hin+'</p>'+
      mdbSvgScatter(pts,v=>mdbInt(v)+' m²',v=>mdbInt(v)+' €','Wohnfläche m²','€/m²');
  }
  else if(MDB_CHART==='baujahr'){
    let pts=list.map(o=>{ let d=mdbDeriv(o),v=mdbWert(o),bj=mdbNum(o.baujahr);
      return (bj>1500&&v>0)?{x:bj,y:v,kp:d.basis==='KP',t:(o.strasse||'')+' '+(o.gemeinde||'')+' · Bj. '+bj+' · '+mdbInt(v)+' €/m²'}:null; }).filter(Boolean);
    el.innerHTML='<h3>Baujahr und Quadratmeterpreis</h3><p class="hint">Blau = Kaufpreis, gelb = Angebotspreis. '+
      'Die Steigung der Ausgleichsgeraden zeigt, wie stark das Baujahr im Gebiet bezahlt wird.'+hin+'</p>'+
      mdbSvgScatter(pts,v=>String(Math.round(v)),v=>mdbInt(v)+' €','Baujahr','€/m²');
  }
  else if(MDB_CHART==='dauer'){
    let kl=[[0,250000,'bis 250 T€'],[250000,400000,'250–400 T€'],[400000,550000,'400–550 T€'],[550000,750000,'550–750 T€'],[750000,1e12,'über 750 T€']];
    let items=kl.map(k=>{
      let sel=list.map(o=>mdbDeriv(o)).filter(d=>d.erst>=k[0]&&d.erst<k[1]&&d.dauer>0&&!d.laeuft);
      return {l:k[2],v:sel.length?mdbMedian(sel.map(d=>d.dauer)):0,n:sel.length};
    }).filter(i=>i.n>0);
    let redItems=kl.map(k=>{
      let sel=list.filter(o=>{let d=mdbDeriv(o);return d.erst>=k[0]&&d.erst<k[1]&&d.reduziert;}).map(o=>mdbDeriv(o));
      return {l:k[2],v:sel.length?mdbMedian(sel.map(d=>d.redPct)):0,n:sel.length};
    }).filter(i=>i.n>0);
    el.innerHTML='<h3>Vermarktungsdauer nach Preisklasse</h3><p class="hint">Median der Tage vom Inserat bis zum Abschluss — '+
      'nur abgeschlossene Vermarktungen. Das Argument für eine realistische Preisfindung im Akquisegespräch.</p>'+
      mdbSvgBars(items,v=>mdbInt(v)+' Tg.','','Tage am Markt')+
      (redItems.length?'<h3 style="margin-top:22px">Preisreduzierung nach Preisklasse</h3><p class="hint">Median der Reduzierung gegenüber dem Einstiegspreis.</p>'+
        mdbSvgBars(redItems,v=>mdbPct(v),'','Reduzierung %'):'');
  }
  else if(MDB_CHART==='kalib'){
    let pts=list.map(o=>{ let eb=mdbNum(o.eigene_bewertung), kp=mdbNum(o.kaufpreis);
      return (eb>0&&kp>0)?{x:kp,y:eb,kp:true,t:(o.strasse||'')+' '+(o.gemeinde||'')+' · Bewertung '+mdbEur(eb)+' / Kaufpreis '+mdbEur(kp)}:null; }).filter(Boolean);
    let ab=mdbAbschlag();
    let hint='<p class="hint">Jeder Punkt ist ein Fall mit eigener Preisermittlung <i>und</i> bekanntem Kaufpreis. '+
      'Liegt die Ausgleichsgerade über der Diagonalen, bewertest du systematisch zu hoch.</p>';
    let quote=ab.pct!=null?'<div class="'+(ab.n>=MDB_MIN_N?'mdb-ok':'mdb-warn')+'"><b>Eigene Abschlagsquote: '+
      (ab.pct>=0?'+':'')+mdbPct(ab.pct)+'</b> aus '+ab.n+' Fällen mit Angebots- <i>und</i> Kaufpreis. '+
      (ab.n>=MDB_MIN_N?'Damit lassen sich Portal-Angebotspreise näherungsweise auf Kaufpreisniveau umrechnen (Schalter in der Filterleiste).'
                      :'Ab '+MDB_MIN_N+' Fällen wird die Quote belastbar.')+'</div>':
      '<div class="mdb-warn">Noch keine Quote: dafür braucht es Objekte, bei denen sowohl der Angebots- als auch der tatsächliche Kaufpreis erfasst ist — typischerweise die eigenen Vermittlungen.</div>';
    el.innerHTML='<h3>Eigene Bewertung gegen Markt</h3>'+hint+
      mdbSvgScatter(pts,v=>mdbInt(v/1000)+' T€',v=>mdbInt(v/1000)+' T€','tatsächlicher Kaufpreis','eigene Preisermittlung')+quote;
  }
}

/* ---------- Bestandstabelle ---------- */
const MDB_COLS=[
  {k:'datum', l:'Datum',    f:o=>mdbDatDE(mdbDeriv(o).ref), s:o=>mdbDeriv(o).ref||''},
  {k:'gemeinde', l:'Gemeinde', f:o=>mdbEsc(o.gemeinde||'–')+(o.ortsteil?'<br><span style="color:var(--muted);font-size:11px">'+mdbEsc(o.ortsteil)+'</span>':''), s:o=>o.gemeinde||''},
  {k:'strasse', l:'Straße',  f:o=>mdbEsc(o.strasse||'–'), s:o=>o.strasse||''},
  {k:'art',   l:'Art',       f:o=>mdbEsc((o.art||'–').replace('Einfamilienhaus','EFH').replace('Doppelhaushälfte','DHH').replace('Reihenhaus','RH').replace('Zweifamilienhaus','ZFH').replace('Mehrfamilienhaus','MFH').replace('Eigentumswohnung','ETW')), s:o=>o.art||''},
  {k:'baujahr', l:'Bj.',     f:o=>o.baujahr||'–', s:o=>mdbNum(o.baujahr), r:1},
  {k:'wohnflaeche', l:'m²',  f:o=>mdbInt(mdbNum(o.wohnflaeche)), s:o=>mdbNum(o.wohnflaeche), r:1},
  {k:'preis', l:'Preis',     f:o=>mdbEur(mdbDeriv(o).wert), s:o=>mdbDeriv(o).wert, r:1, c:'strong'},
  {k:'eurm2', l:'€/m²',      f:o=>{let d=mdbDeriv(o);return d.eurm2>0?mdbInt(d.eurm2):'–';}, s:o=>mdbDeriv(o).eurm2, r:1, c:'strong'},
  {k:'basis', l:'Basis',     f:o=>{let d=mdbDeriv(o);return '<span class="badge '+(d.basis==='KP'?'kp">Kaufpreis':'an">Angebot')+'</span>';}, s:o=>mdbDeriv(o).basis},
  {k:'status', l:'Status',   f:o=>mdbEsc(o.status||'–'), s:o=>o.status||''},
  {k:'dauer', l:'Tage',      f:o=>{let d=mdbDeriv(o);return d.dauer>0?mdbInt(d.dauer)+(d.laeuft?'*':''):'–';}, s:o=>mdbDeriv(o).dauer, r:1},
  {k:'red',   l:'Red.',      f:o=>{let d=mdbDeriv(o);return d.reduziert?'<span style="color:#9d2b2b">−'+mdbPct(d.redPct)+'</span>':'–';}, s:o=>mdbDeriv(o).redPct, r:1},
  {k:'guete', l:'Güte',      f:o=>{let g=(o.guete||'?').charAt(0);return '<span class="badge g'+g+'">'+g+'</span>';}, s:o=>o.guete||''},
  {k:'pdf',   l:'PDF',       f:o=>((o.pdfs||[]).length?'&#128196; '+o.pdfs.length:''), s:o=>(o.pdfs||[]).length, r:1}
];
function mdbSortieren(k){ MDB_SORT = (MDB_SORT.k===k)?{k:k,d:-MDB_SORT.d}:{k:k,d:1}; mdbListe(); }
function mdbListe(){
  let list=mdbFilter();
  let col=MDB_COLS.find(c=>c.k===MDB_SORT.k)||MDB_COLS[0];
  list=list.slice().sort((a,b)=>{ let x=col.s(a),y=col.s(b); return (x<y?-1:x>y?1:0)*MDB_SORT.d; });
  $('mdb_tbl').querySelector('thead').innerHTML='<tr>'+MDB_COLS.map(c=>
    '<th onclick="mdbSortieren(&quot;'+c.k+'&quot;)">'+c.l+(MDB_SORT.k===c.k?(MDB_SORT.d>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr>';
  let tb=$('mdb_tbl').querySelector('tbody');
  if(!list.length){
    tb.innerHTML='<tr><td colspan="'+MDB_COLS.length+'"><div class="mdb-empty">'+
      (MDBALL.length?'Kein Objekt passt zum Filter.':'Noch keine Objekte erfasst. Über „Erfassen" das erste Objekt anlegen — am schnellsten über das Einfügefeld für den Exposé-Text.')+'</div></td></tr>';
  }else{
    tb.innerHTML=list.map(o=>'<tr onclick="mdbBearbeiten(&quot;'+o.id+'&quot;)">'+
      MDB_COLS.map(c=>'<td class="'+(c.r?'r ':'')+(c.c||'')+'">'+c.f(o)+'</td>').join('')+'</tr>').join('');
  }
  setT('mdb_listinfo', list.length+' von '+MDBALL.length+' Objekten · Zeile anklicken zum Bearbeiten · * = noch am Markt');
}

/* ---------- Gesamt-Render ---------- */
function mdbRender(){
  try{
    mdbFilterGemeinden(); mdbFilterSync();
    let list=mdbFilter();
    let ges=MDBALL.length, kp=MDBALL.filter(o=>mdbNum(o.kaufpreis)>0).length;
    setT('mdb_headinfo', ges+' Objekte · '+kp+' mit Kaufpreis'+(list.length!==ges?' · '+list.length+' im Filter':''));
    if($('mdbp_dash').classList.contains('on')){ mdbKpis(list); mdbChartPick(); mdbChart(list); }
    if($('mdbp_liste').classList.contains('on')) mdbListe();
  }catch(e){
    $('mdb_banner').innerHTML='<div class="mdb-crit">Auswertung fehlgeschlagen: '+mdbEsc(e.message||e)+'</div>';
  }
}


/* ---------- Vergleichsmodul ---------- */
const MDB_ZIEL=[
  {k:'art',        l:'Objektart', t:'sel', o:MDB_ART},
  {k:'gemeinde',   l:'Gemeinde', t:'txt', dl:'mdb_dl_gem'},
  {k:'ortsteil',   l:'Ortsteil', t:'txt', dl:'mdb_dl_ot'},
  {k:'lage_q',     l:'Lagequalität', t:'sel', o:MDB_LAGEQ},
  {k:'baujahr',    l:'Baujahr', t:'num'},
  {k:'wohnflaeche',l:'Wohnfläche', t:'num', u:'m²'},
  {k:'grundstueck',l:'Grundstück', t:'num', u:'m²'},
  {k:'zustand',    l:'Zustand', t:'sel', o:MDB_ZUSTAND}
];
const MDB_TOL=[
  {k:'t_bj',   l:'Baujahr ±', t:'num', u:'Jahre'},
  {k:'t_fl',   l:'Wohnfläche ±', t:'num', u:'%'},
  {k:'t_mon',  l:'Zeitraum zurück', t:'num', u:'Monate'},
  {k:'t_max',  l:'Höchstens', t:'num', u:'Objekte'},
  {k:'t_gem',  l:'Nur gleiche Gemeinde', t:'chk'},
  {k:'t_art',  l:'Nur gleiche Objektart', t:'chk'},
  {k:'t_kp',   l:'Nur echte Kaufpreise', t:'chk'},
  {k:'t_idx',  l:'Auf heute indexieren', t:'chk'}
];
function mdbBuildZiel(){
  $('mdb_ziel').innerHTML=MDB_ZIEL.map(f=>mdbFeldHtml(f,'mdbz_')).join('');
  $('mdb_tol').innerHTML=MDB_TOL.map(f=>mdbFeldHtml(f,'mdbz_')).join('');
  $('mdbz_t_bj').value=15; $('mdbz_t_fl').value=35; $('mdbz_t_mon').value=36; $('mdbz_t_max').value=10;
  $('mdbz_t_art').checked=true; $('mdbz_t_idx').checked=true;
}
function mdbZielAusVordruck(){
  const g=id=>{ let e=$(id); return e?e.value:''; };
  $('mdbz_gemeinde').value=g('ek_ort')||'';
  $('mdbz_baujahr').value=g('ek_baujahr')||'';
  $('mdbz_wohnflaeche').value=g('ek_wohnflaeche')||'';
  $('mdbz_grundstueck').value=g('ek_gs_flaeche')||'';
  let t=(g('ek_typ')||'').toLowerCase(), art='';
  if((g('ek_modus')||'')==='wohnung') art='Eigentumswohnung';
  else if(/doppel/.test(t)) art='Doppelhaushälfte';
  else if(/reihen/.test(t)) art='Reihenhaus';
  else if(/zweifamilien/.test(t)) art='Zweifamilienhaus';
  else if(/mehrfamilien/.test(t)) art='Mehrfamilienhaus';
  else if(/gesch(ä|ae)fts|mischnutzung/.test(t)) art='Wohn-/Geschäftshaus';
  else if(/b(ü|ue)ro|laden|betrieb|gewerbe|halle/.test(t)) art='Gewerbeobjekt';
  else if(/einfamilien/.test(t)) art='Einfamilienhaus';
  if(art) $('mdbz_art').value=art;
  mdbVergleich();
}
function mdbZielLesen(){ let z={}; MDB_ZIEL.concat(MDB_TOL).forEach(f=>{ let e=$('mdbz_'+f.k); if(e) z[f.k]= f.t==='chk'?e.checked:e.value.trim(); }); return z; }

function mdbScore(z,o){
  let d=mdbDeriv(o), s=0;
  if(z.gemeinde && (o.gemeinde||'').toLowerCase()!==z.gemeinde.toLowerCase()) s+=22;
  else if(z.ortsteil && (o.ortsteil||'').toLowerCase()!==z.ortsteil.toLowerCase()) s+=6;
  let lz=parseInt(z.lage_q)||0; if(lz&&d.lq) s+=Math.abs(lz-d.lq)*9;
  let bz=mdbNum(z.baujahr), bo=mdbNum(o.baujahr);
  if(bz&&bo) s+=Math.min(Math.abs(bz-bo),70)*0.55;
  let fz=mdbNum(z.wohnflaeche), fo=d.wf;
  if(fz>0&&fo>0) s+=Math.min(Math.abs(fz-fo)/fz*100,80)*0.45;
  let alter=mdbTage(d.ref,mdbHeute())/365.25; if(alter>0) s+=Math.min(alter,10)*4;
  if(z.art && o.art!==z.art) s+=18;
  if(d.basis==='AN') s+=6;
  if((o.guete||'').charAt(0)==='C') s+=8;
  return s;
}
function mdbVergleich(){
  let z=mdbZielLesen(), out=$('mdb_vglout');
  let tBj=mdbNum(z.t_bj), tFl=mdbNum(z.t_fl), tMon=mdbNum(z.t_mon), tMax=mdbNum(z.t_max)||10;
  let grenze=null;
  if(tMon>0){ let d=new Date(); d.setMonth(d.getMonth()-tMon); grenze=d.toISOString().slice(0,10); }

  let cand=MDBALL.filter(o=>{
    let d=mdbDeriv(o); if(!(d.eurm2>0))return false;
    if(z.t_art && z.art && o.art!==z.art) return false;
    if(z.t_gem && z.gemeinde && (o.gemeinde||'').toLowerCase()!==z.gemeinde.toLowerCase()) return false;
    if(z.t_kp && d.basis!=='KP') return false;
    if(grenze && (d.ref||'')<grenze) return false;
    if(tBj>0 && mdbNum(z.baujahr)>0 && mdbNum(o.baujahr)>0 && Math.abs(mdbNum(o.baujahr)-mdbNum(z.baujahr))>tBj) return false;
    if(tFl>0 && mdbNum(z.wohnflaeche)>0 && d.wf>0 && Math.abs(d.wf-mdbNum(z.wohnflaeche))/mdbNum(z.wohnflaeche)*100>tFl) return false;
    return true;
  }).map(o=>{
    let d=mdbDeriv(o);
    let idx=z.t_idx?Math.pow(1+mdbRate()/100, Math.max(0,mdbTage(d.ref,mdbHeute())/365.25)):1;
    return {o:o, d:d, s:mdbScore(z,o), v:d.eurm2*idx, idx:idx};
  }).sort((a,b)=>a.s-b.s).slice(0,tMax);

  if(!cand.length){
    out.innerHTML='<div class="mdb-box"><div class="mdb-empty">Kein passendes Vergleichsobjekt gefunden. '+
      (MDBALL.length?'Die Toleranzen sind eventuell zu eng — Baujahr, Fläche oder Zeitraum weiter fassen.':'Der Bestand ist noch leer.')+'</div></div>';
    return;
  }
  let werte=cand.map(c=>c.v);
  let med=mdbMedian(werte), q1=mdbQuantil(werte,.25), q3=mdbQuantil(werte,.75);
  let fl=mdbNum(z.wohnflaeche);
  let belastbar=cand.length>=MDB_MIN_N;
  MDB_VGL_MED=med; MDB_VGL_LIST=cand;

  out.innerHTML=
   '<div class="mdb-box"><h3>Ergebnis</h3>'+
   '<div class="mdb-stat">'+
     '<div><div class="k">Median €/m²</div><div class="v">'+mdbInt(med)+' €</div></div>'+
     '<div><div class="k">Spanne (Q1–Q3)</div><div class="v">'+mdbInt(q1)+' – '+mdbInt(q3)+' €</div></div>'+
     '<div><div class="k">Fallzahl</div><div class="v">'+cand.length+'</div></div>'+
   '</div>'+
   (fl>0?'<div class="subtotal" style="font-size:15px;margin-top:12px"><span>Abgeleiteter Vergleichswert · '+mdbInt(fl)+' m² × '+mdbInt(med)+' €/m²</span><span>'+mdbEur(med*fl)+'</span></div>':'')+
   (belastbar?'<div class="mdb-ok">Die Fallzahl trägt eine Aussage. Die Spanne Q1–Q3 zeigt, wie breit der Markt in diesem Segment streut.</div>'
             :'<div class="mdb-warn"><b>Nur '+cand.length+' Vergleichsfälle</b> — unter '+MDB_MIN_N+' Fällen ist das eine Orientierung, keine belastbare Ableitung. Toleranzen weiter fassen oder mehr Objekte erfassen.</div>')+
   (z.t_idx&&mdbRate()?'<p class="hint" style="margin-top:10px">Preise mit '+mdbPct(mdbRate())+' p.a. auf heutiges Niveau indexiert.</p>':'')+
   '<div class="mdb-actions">'+
     '<button class="primary" onclick="mdbInVordruck()">⤴ Als Vergleichsobjekte in den Vordruck übernehmen</button>'+
     '<button onclick="mdbPreisInVordruck()">⤴ Nur den Vergleichspreis übernehmen</button>'+
   '</div></div>'+
   '<div class="mdb-box"><h3>Vergleichsobjekte</h3><p class="hint">Sortiert nach Ähnlichkeit. Zeile anklicken öffnet den Datensatz.</p>'+
   '<div class="mdb-scroll"><table class="mdb-tbl"><thead><tr><th>Ähnlichkeit</th><th>Objekt</th><th>Art</th><th>Bj.</th><th>m²</th><th>Preis</th><th>€/m²</th>'+
   (z.t_idx?'<th>€/m² indexiert</th>':'')+'<th>Basis</th><th>Datum</th></tr></thead><tbody>'+
   cand.map(c=>'<tr onclick="mdbBearbeiten(&quot;'+c.o.id+'&quot;)">'+
     '<td>'+Math.max(0,Math.round(100-c.s))+' %</td>'+
     '<td>'+mdbEsc(((c.o.strasse||'')+' '+(c.o.gemeinde||'')+(c.o.ortsteil?' · '+c.o.ortsteil:'')).trim()||'ohne Adresse')+'</td>'+
     '<td>'+mdbEsc(c.o.art||'–')+'</td><td class="r">'+(c.o.baujahr||'–')+'</td><td class="r">'+mdbInt(c.d.wf)+'</td>'+
     '<td class="r">'+mdbEur(c.d.wert)+'</td><td class="r strong">'+mdbInt(c.d.eurm2)+'</td>'+
     (z.t_idx?'<td class="r strong">'+mdbInt(c.v)+'</td>':'')+
     '<td><span class="badge '+(c.d.basis==='KP'?'kp">Kaufpreis':'an">Angebot')+'</span></td>'+
     '<td>'+mdbDatDE(c.d.ref)+'</td></tr>').join('')+
   '</tbody></table></div></div>';
}
let MDB_VGL_MED=0, MDB_VGL_LIST=[];
function mdbInVordruck(){
  if(!MDB_VGL_LIST.length)return;
  let n=Math.min(MDB_VGL_LIST.length, typeof N_VGL!=='undefined'?N_VGL:8);
  for(let i=0;i<(typeof N_VGL!=='undefined'?N_VGL:8);i++){
    let a=$('vgl_adr'+i); if(!a)break;
    if(i<n){
      let c=MDB_VGL_LIST[i];
      let idxAn=Math.abs(c.idx-1)>0.001;
      $('vgl_adr'+i).value=(((c.o.strasse||'')+' '+(c.o.gemeinde||'')).trim()||'Vergleichsobjekt')+(idxAn?' (Preis indexiert)':'');
      $('vgl_bj'+i).value=c.o.baujahr||'';
      $('vgl_zust'+i).value=(c.o.zustand||'').split(' /')[0];
      $('vgl_fl'+i).value=mdbPlain(c.d.wf);
      $('vgl_kp'+i).value=mdbPlain(c.v*c.d.wf);
    }else{ $('vgl_adr'+i).value=''; $('vgl_bj'+i).value=''; $('vgl_zust'+i).value=''; $('vgl_fl'+i).value='0'; $('vgl_kp'+i).value='0'; }
  }
  if(typeof computeVergleich==='function') computeVergleich();
  if(typeof compute==='function') compute();
  mdbClose();
  document.body.classList.add('started');
  let s=$('s-vergleich'); if(s) appScrollIntoView(s,{behavior:'smooth',block:'start'});
}
function mdbPreisInVordruck(){
  if(!(MDB_VGL_MED>0))return;
  let e=$('vw_preis'); if(e){ e.value=mdbPlain(MDB_VGL_MED); if(typeof compute==='function') compute(); }
  mdbClose(); document.body.classList.add('started');
  let s=$('s-vergleich'); if(s) appScrollIntoView(s,{behavior:'smooth',block:'start'});
}
/* Aus dem Vordruck ein Objekt in die Datenbank übernehmen */
async function mdbAusVordruck(){
  await mdbOeffnen(); mdbTab('erf'); mdbNeu();
  const g=id=>{ let e=$(id); return e?e.value:''; };
  $('mdbf_strasse').value=g('ek_anschrift');
  $('mdbf_gemeinde').value=g('ek_ort');
  $('mdbf_baujahr').value=g('ek_baujahr');
  $('mdbf_wohnflaeche').value=g('ek_wohnflaeche');
  $('mdbf_grundstueck').value=g('ek_gs_flaeche');
  $('mdbf_brw').value=g('ek_brw');
  $('mdbf_nutzflaeche').value=g('ek_nutzflaeche');
  $('mdbf_hausgeld').value=g('ek_hausgeld');
  $('mdbf_mea').value=g('ek_mea');
  $('mdbf_etage').value=g('ek_etage');
  $('mdbf_quelle').value='Eigene Akquise';
  $('mdbf_guete').value=MDB_GUETE[0];
  let emp=$('o_empfehlung'); if(emp) $('mdbf_eigene_bewertung').value=mdbDeZahl(mdbNum(emp.textContent));
  $('mdbf_eb_datum').value=mdbHeute();
  let t=(g('ek_typ')||'').toLowerCase(), art='';
  if((g('ek_modus')||'')==='wohnung') art='Eigentumswohnung';
  else if(/doppel/.test(t)) art='Doppelhaushälfte';
  else if(/reihen/.test(t)) art='Reihenhaus';
  else if(/zweifamilien/.test(t)) art='Zweifamilienhaus';
  else if(/mehrfamilien/.test(t)) art='Mehrfamilienhaus';
  else if(/gesch(ä|ae)fts|mischnutzung/.test(t)) art='Wohn-/Geschäftshaus';
  else if(/b(ü|ue)ro|laden|betrieb|gewerbe|halle/.test(t)) art='Gewerbeobjekt';
  else if(/einfamilien/.test(t)) art='Einfamilienhaus';
  if(art) $('mdbf_art').value=art;
  setT('mdb_saveinfo','Aus dem Vordruck übernommen — Preis, Lagequalität und Status bitte ergänzen.');
}
function mdbVergleichAusVordruck(){ mdbOeffnen().then(()=>{ mdbTab('vgl'); mdbZielAusVordruck(); }); }

/* ---------- Sicherung ---------- */
function mdbBlob2b64(b){ return new Promise((res,rej)=>{ let r=new FileReader(); r.onload=()=>res((''+r.result).split(',')[1]); r.onerror=()=>rej(r.error); r.readAsDataURL(b); }); }
function mdbB642Blob(s,t){ let bin=atob(s), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); return new Blob([u],{type:t||'application/pdf'}); }
function mdbDownload(text,name,mime){return iaHerunterladen(new Blob([text],{type:(mime||'application/json')+';charset=utf-8'}),name);}
async function mdbBackup(mitPdf){
  try{
    let paket={typ:'vb-marktdaten', version:1, erstellt:new Date().toISOString(), mitAnhaengen:!!mitPdf, objekte:MDBALL};
    if(mitPdf){
      let an=await mdbAAll();
      let ges=an.reduce((s,a)=>s+(a.size||0),0);
      if(ges>300*1048576 && !confirm('Die Anhänge sind zusammen '+mdbBytes(ges)+' groß. Eine vollständige Sicherung kann daran scheitern.\n\nEmpfehlung: schlanke Sicherung nutzen und die PDFs getrennt ablegen.\n\nTrotzdem versuchen?')) return;
      paket.anhaenge=[];
      for(let a of an) paket.anhaenge.push({id:a.id,objId:a.objId,name:a.name,size:a.size,data:await mdbBlob2b64(a.blob)});
    }
    let name='Marktdaten_'+mdbHeute()+(mitPdf?'_komplett':'')+'.json';
    let result=await mdbDownload(JSON.stringify(paket), name);if(result==='abgebrochen'||result==='fehlgeschlagen')return;
    await mdbMPut('lastBackup',{ts:Date.now(),n:MDBALL.length,full:!!mitPdf});
    mdbBackupCheck(); mdbSpeicherStatus();
    $('mdb_backupinfo').innerHTML='<div class="mdb-ok">Sicherung erstellt: <b>'+name+'</b> ('+MDBALL.length+' Objekte'+(mitPdf?' inkl. Anhänge':' ohne Anhänge')+'). Datei bitte außerhalb des Browsers ablegen — Netzlaufwerk, OneDrive oder USB-Stick.</div>';
  }catch(e){
    $('mdb_backupinfo').innerHTML='<div class="mdb-crit">Sicherung fehlgeschlagen: '+mdbEsc(e.message||e)+'. Bei großen Anhängen bitte die schlanke Sicherung verwenden.</div>';
  }
}
async function mdbBackupCheck(){
  let lb=null; try{ lb=await mdbMGet('lastBackup'); }catch(e){}
  let el=$('mdb_banner'); if(!el)return;
  if(!MDBALL.length){ el.innerHTML=''; return; }
  let tage=lb?Math.round((Date.now()-lb.ts)/86400000):null;
  let neu=lb?MDBALL.length-lb.n:MDBALL.length;
  if(lb===null){
    el.innerHTML='<div class="mdb-warn"><b>Noch keine Sicherung.</b> Die Sammlung liegt nur im Browser dieses Geräts. '+
      '<button onclick="mdbBackup(false)" style="border:1px solid var(--line);margin-left:6px">Jetzt sichern</button></div>';
  }else if(tage>=14||neu>=20){
    el.innerHTML='<div class="mdb-warn"><b>Letzte Sicherung vor '+tage+' Tagen</b>'+(neu>0?', seitdem '+neu+' Objekte dazugekommen':'')+'. '+
      '<button onclick="mdbBackup(false)" style="border:1px solid var(--line);margin-left:6px">Jetzt sichern</button></div>';
  }else el.innerHTML='';
}
function mdbImport(){
  let i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{
    let f=i.files[0]; if(!f)return;
    let r=new FileReader();
    r.onerror=()=>alert('Die Datei konnte nicht gelesen werden. Der Bestand bleibt unverändert.');
    r.onload=async()=>{
      let j=ImmoDaten.jsonLesen(r.result); if(!j.ok){ alert(j.fehler+'\nDer Bestand bleibt unverändert.'); return; }
      let sp=ImmoDaten.marktSicherungPruefen(j.wert); if(!sp.ok){ alert(sp.fehler+'\nDer Bestand bleibt unverändert.'); return; }
      let n=sp.verworfen.objekte+sp.verworfen.anhaenge;
      if(!confirm(sp.objekte.length+' Objekte'+(sp.anhaenge.length?' und '+sp.anhaenge.length+' PDF-Anhänge':'')+' einlesen?\n\nVorhandene Datensätze mit gleicher Kennung werden nur durch eine neuere Fassung ersetzt, alle anderen bleiben erhalten.'
        +(n?'\n'+n+' unlesbare Einträge werden übersprungen.':''))) return;
      try{
        let erg=await mdbImportSchreiben(sp.objekte,sp.anhaenge);
        await mdbLaden(); mdbMirrorWrite(); mdbRender(); mdbSpeicherStatus();
        $('mdb_backupinfo').innerHTML='<div class="mdb-ok">Eingelesen: '+erg.neu+' neu, '+erg.ers+' aktualisiert'+(erg.anh?', '+erg.anh+' PDF-Anhänge':'')+'. Bestand jetzt '+MDBALL.length+' Objekte.</div>';
      }catch(e){ alert('Die Sicherung konnte nicht eingelesen werden: '+iaFehlerText(e)+'. Der Bestand bleibt unverändert.'); }
    };
    r.readAsText(f);
  };
  i.click();
}
/* Alles in einer Transaktion: scheitert ein Teil (z. B. voller Speicher), wird nichts geschrieben */
async function mdbImportSchreiben(objekte,anhaenge){
  await mdbOpen();
  let vorhanden={}; MDBALL.forEach(o=>vorhanden[o.id]=o);
  let erg={neu:0,ers:0,anh:0}, jetzt=Date.now();
  let blobs=anhaenge.map(a=>({id:a.id,objId:a.objId,name:a.name,size:a.size,blob:mdbB642Blob(a.data)}));
  await ImmoSpeicher.tx(mdbDB,['objekte','anhaenge'],'readwrite',st=>{
    objekte.forEach(o=>{
      if(!o.id) o.id='o'+jetzt.toString(36)+Math.random().toString(36).slice(2,6);
      let alt=vorhanden[o.id]; if(alt&&(alt.ts||0)>=(o.ts||0)) return;
      if(!o.ts) o.ts=jetzt; st.objekte.put(o); alt?erg.ers++:erg.neu++;
    });
    blobs.forEach(a=>{ st.anhaenge.put(a); erg.anh++; });
  });
  return erg;
}
function mdbCsv(){
  let sp=';';
  let kopf=MDB_KEYS.map(f=>f.l.replace(/&amp;/g,'&')).concat(['€/m²','Preisbasis','Einstiegspreis','Reduzierung %','Tage am Markt','Kaufpreisfaktor','Anzahl PDFs']);
  const q=v=>'"'+(''+(v==null?'':v)).replace(/"/g,'""')+'"';
  let zeilen=mdbFilter().map(o=>{
    let d=mdbDeriv(o);
    return MDB_KEYS.map(f=>{
      let v=o[f.k];
      if(f.t==='chk') return v?'ja':'nein';
      if(f.t==='num') return (''+(v==null?'':v)).replace('.',',');
      return q(v);
    }).concat([
      Math.round(d.eurm2), d.basis==='KP'?'Kaufpreis':'Angebot', Math.round(d.erst),
      d.redPct.toFixed(1).replace('.',','), d.dauer, d.faktor?d.faktor.toFixed(1).replace('.',','):'', (o.pdfs||[]).length
    ]).join(sp);
  });
  mdbDownload('﻿'+kopf.map(q).join(sp)+'\n'+zeilen.join('\n'), 'Marktdaten_'+mdbHeute()+'.csv', 'text/csv');
}

/* ---------- Speicherstatus ---------- */
async function mdbSpeicherStatus(){
  let el=$('mdb_speicher'); if(!el)return;
  let q=await mdbQuota();
  let pers=false; try{ if(navigator.storage&&navigator.storage.persisted) pers=await navigator.storage.persisted(); }catch(e){}
  let an=[]; try{ an=await mdbAAll(); }catch(e){}
  let anGes=an.reduce((s,a)=>s+(a.size||0),0);
  let pct=(q&&q.quota)?q.usage/q.quota*100:0;
  let cls=pct>90?'crit':pct>70?'warn':'';

  el.innerHTML=
    '<div class="mdb-stat">'+
      '<div><div class="k">Objekte</div><div class="v">'+MDBALL.length+'</div></div>'+
      '<div><div class="k">PDF-Anhänge</div><div class="v">'+an.length+' · '+mdbBytes(anGes)+'</div></div>'+
      '<div><div class="k">Belegt</div><div class="v">'+(q?mdbBytes(q.usage):'unbekannt')+(q&&q.quota?' von '+mdbBytes(q.quota):'')+'</div></div>'+
    '</div>'+
    (q&&q.quota?'<div class="storagebar '+cls+'"><span style="width:'+Math.min(100,pct).toFixed(1)+'%"></span></div>'+
      '<p class="hint" style="margin:2px 0 0">'+pct.toFixed(1).replace('.',',')+' % des verfügbaren Speichers belegt.</p>':'')+
    (pers?'<div class="mdb-ok"><b>Dauerhafter Speicher ist aktiv.</b> Der Browser darf die Datenbank nicht mehr bei Speicherdruck verwerfen.</div>'
         :'<div class="mdb-warn"><b>Dauerhafter Speicher ist nicht bestätigt.</b> Ohne ihn kann der Browser die Datenbank bei Speichermangel löschen — besonders auf iPhone und iPad. '+
          '<button onclick="mdbPersist()" style="border:1px solid var(--line);margin-left:6px">Jetzt anfordern</button><br>'+
          'Wird die Anfrage abgelehnt, hilft es, die App zum Startbildschirm hinzuzufügen. Regelmäßige Sicherungen bleiben in jedem Fall der sicherste Schutz.</div>')+
    (pct>70?'<div class="mdb-'+(pct>90?'crit':'warn')+'"><b>Der Speicher wird knapp.</b> Bitte eine vollständige Sicherung anlegen und anschließend PDF-Anhänge älterer Objekte löschen — die Objektdaten selbst bleiben dabei erhalten.</div>':'');

  /* Zweitkopie */
  let m=mdbMirrorRead(), mel=$('mdb_mirror');
  if(mel) mel.innerHTML= m
    ? '<div class="mdb-ok">Zweitkopie vorhanden: <b>'+m.n+' Objekte</b>, Stand '+new Date(m.ts).toLocaleString('de-DE')+'.</div>'+
      '<div class="mdb-actions"><button onclick="mdbMirrorJetzt()">Zweitkopie aktualisieren</button>'+
      '<button onclick="mdbMirrorZurueck()">Aus Zweitkopie wiederherstellen</button></div>'
    : '<div class="mdb-warn">Noch keine Zweitkopie vorhanden.</div><div class="mdb-actions"><button onclick="mdbMirrorJetzt()">Zweitkopie jetzt anlegen</button></div>';

  /* Anhänge */
  let ael=$('mdb_anhaenge'); if(!ael)return;
  if(!an.length){ ael.innerHTML='<p class="hint">Keine Anhänge gespeichert.</p>'; return; }
  an.sort((a,b)=>b.size-a.size);
  ael.innerHTML=an.map(a=>{
    let o=MDBALL.find(x=>x.id===a.objId);
    return '<div class="pdfrow"><span>&#128196;</span><span class="nm">'+mdbEsc(a.name)+
      '<span style="color:var(--muted)"> — '+mdbEsc(o?(((o.strasse||'')+' '+(o.gemeinde||'')).trim()||'Objekt'):'verwaistes Anhängsel')+'</span></span>'+
      '<span class="sz">'+mdbBytes(a.size)+'</span>'+
      '<button type="button" onclick="mdbPdfOeffnen(&quot;'+a.id+'&quot;)">Öffnen</button>'+
      '<button type="button" style="color:#9d2b2b" onclick="mdbAnhangWeg(&quot;'+a.id+'&quot;)">Löschen</button></div>';
  }).join('')+'<p class="hint" style="margin-top:8px">Zusammen '+mdbBytes(anGes)+' in '+an.length+' Dateien.</p>';
}
async function mdbPersist(){
  try{
    let ok=await navigator.storage.persist();
    alert(ok?'Dauerhafter Speicher wurde gewährt. Die Datenbank ist jetzt gegen automatisches Aufräumen geschützt.'
            :'Der Browser hat die Anfrage abgelehnt. Das passiert häufig, solange die App nur im Browser läuft — nach dem Hinzufügen zum Startbildschirm klappt es meist. Bitte in jedem Fall regelmäßig sichern.');
  }catch(e){ alert('Dieser Browser unterstützt die Anfrage nicht. Bitte regelmäßig sichern.'); }
  mdbSpeicherStatus();
}
function mdbMirrorJetzt(){ alert(mdbMirrorWrite()?'Zweitkopie geschrieben.':'Zweitkopie fehlgeschlagen — der Browserspeicher ist voll. Bitte eine Sicherung als Datei anlegen.'); mdbSpeicherStatus(); }
async function mdbMirrorZurueck(){
  let m=mdbMirrorRead(); if(!m||!m.data){ alert('Keine Zweitkopie vorhanden.'); return; }
  if(!confirm('Aus der Zweitkopie wiederherstellen?\n\n'+m.n+' Objekte, Stand '+new Date(m.ts).toLocaleString('de-DE')+
              '.\nVorhandene Datensätze mit gleicher Kennung werden ersetzt. PDF-Anhänge sind in der Zweitkopie nicht enthalten.')) return;
  for(let o of m.data) await mdbPut(o);
  await mdbLaden(); mdbRender(); mdbSpeicherStatus();
  alert('Wiederhergestellt: '+m.n+' Objekte.');
}
async function mdbAnhangWeg(id){
  if(!confirm('Diesen Anhang löschen? Der Datensatz selbst bleibt vollständig erhalten.'))return;
  let a=await mdbAGet(id);
  await mdbADel(id);
  if(a&&a.objId){
    let o=MDBALL.find(x=>x.id===a.objId);
    if(o){ o.pdfs=(o.pdfs||[]).filter(p=>p.id!==id); await mdbPut(o); }
  }
  await mdbLaden(); mdbMirrorWrite(); mdbSpeicherStatus();
}

/* Ereignisse der Datenbank vom Vordruck fernhalten: sonst rechnet compute()
   bei jedem Tastendruck im Overlay die komplette Wertermittlung neu. */
['input','change'].forEach(function(ev){ var o=document.getElementById('mdb_overlay');
  if(o) o.addEventListener(ev,function(e){ e.stopPropagation(); }); });
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ var o=document.getElementById('mdb_overlay'); if(o&&o.classList.contains('on')) mdbClose(); }
});

