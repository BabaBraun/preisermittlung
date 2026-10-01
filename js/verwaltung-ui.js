/* ImmoApp — Liegenschaftsverwaltung: Oberfläche
   Rechnen: js/verwaltung.js (ImmoVerwaltung). Speichern: eigene Datenbank „ia_verwaltung“ (Speicher liegenschaften,
   anhaenge, meta) über js/speicher.js — getrennt von Bewertungen und Kundenakte, damit ein Fehler hier dort nichts
   berührt. Ohne IndexedDB (manche privaten Fenster) Rückfall auf den localStorage mit sichtbarem Hinweis.
   Alle Eingaben werden bei der Ausgabe maskiert (lvH); gespeichert wird nur, was ImmoVerwaltung.bereinigen
   durchlässt. */
'use strict';

const LVK=ImmoVerwaltung;
const LV_DB_NAME='ia_verwaltung', LV_DB_VER=1, LV_RUECKFALL='ia_lv_rueckfall', LV_EINST_KEY='ia_lv_einstellungen', LV_DL_KEY='ia_lv_dienstleister';
var LV={db:null,bereit:false,rueckfall:false,liste:[],einst:{},dienstleister:[],aktivId:null,ansicht:'uebersicht',reiter:'ueberblick',
  vertragId:null,form:null,meldung:'',start:null};

const LV_ART_L={mfh:'Mehrfamilienhaus',wohnhaus:'Ein-/Zweifamilienhaus',etw:'Eigentumswohnung (Sondereigentum)',weg:'Wohnungseigentümergemeinschaft (WEG)',
  gewerbe:'Gewerbeobjekt',gemischt:'Wohn- und Geschäftshaus',sonstig:'Sonstiges'};
const LV_EIG={kunde:'Kunde der Bank',eigen:'Eigenes Objekt',bank:'Objekt der Bank',sonstig:'Sonstiger Eigentümer'};
const LV_ART_E={wohnung:'Wohnung',gewerbe:'Gewerbe',stellplatz:'Stellplatz',garage:'Garage',lager:'Lager/Keller',sonstig:'Sonstiges'};
const LV_MIETART={fest:'Festmiete',staffel:'Staffelmiete (§ 557a BGB)',index:'Indexmiete (§ 557b BGB)'};
const LV_ZAHLART={miete:'Miete',kaution:'Kaution',nk_nachzahlung:'Nebenkosten-Nachzahlung',sonstig:'Sonstiges'};
const LV_KAUTION={bar:'Barkaution (Kautionskonto)',buergschaft:'Bürgschaft',sparbuch:'verpfändetes Sparbuch',depot:'Mietkautionsdepot',sonstig:'Sonstiges'};
const LV_GRUND={staffel:'Staffel (§ 557a BGB)',index:'Indexanpassung (§ 557b BGB)','558':'Erhöhung auf Vergleichsmiete (§ 558 BGB)',
  '559':'Modernisierung (§ 559 BGB)','560':'Anpassung Vorauszahlungen (§ 560 BGB)',vereinbarung:'Vereinbarung'};
const LV_STATUS={bezahlt:['bezahlt','ok'],verspaetet:['verspätet bezahlt','warn'],teilweise:['teilweise','bad'],offen:['offen','bad'],nicht_faellig:['noch nicht fällig','']};

/* ---------- Hilfen ---------- */
function lvH(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function lvQ(id){ return LVK.ID.test(String(id))?String(id):''; }   // nur sichere Kennungen in onclick
function lvHeute(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function lvEur(x){ return LVK.eur(x); }
function lvQm(x){ return (+x||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function lvEur0(x){ return (Math.round(x)||0).toLocaleString('de-DE')+' €'; }
function lvZahlText(x){ return typeof x==='number'&&isFinite(x)?String(x).replace('.',','):(x==null?'':String(x)); }
function lvAktiv(){ return LV.liste.find(l=>l.id===LV.aktivId)||null; }
function lvEinheit(l,id){ return (l.einheiten||[]).find(e=>e.id===id)||null; }
function lvVertrag(l,id){ return (l.vertraege||[]).find(v=>v.id===id)||null; }
function lvMieterName(v){ return (v.mieter||[]).map(m=>m.name).filter(Boolean).join(', ')||'ohne Namen'; }
function lvEinheitName(e){ return e?(e.nr||'Einheit')+(e.lage?' · '+e.lage:''):'–'; }
function lvAdresse(l){ return [l.strasse,[l.plz,l.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
function lvEigentuemer(l){
  let n=l.eigentuemerName||'';
  if(l.eigentuemerArt==='kunde'&&l.kundeId&&typeof kdName==='function') n=kdName(l.kundeId)||n;
  return (LV_EIG[l.eigentuemerArt]||'')+(n?': '+n:'');
}
function lvAufschlag(v,l){ return LVK.istWohnraum(v,l)?5:9; }
function lvOp(l,v,st){ return LVK.offenePosten(v,l.zahlungen,st||lvHeute(),{aufschlag:lvAufschlag(v,l),basiszins:LVK.basiszinsTabelle(l.einstellungen&&l.einstellungen.basiszins)}); }
function lvMeldung(t){ LV.meldung=t||''; }
function lvBadge(t,k){ return '<span class="badge'+(k?' lv-b-'+k:'')+'">'+lvH(t)+'</span>'; }
function lvLeer(t){ return '<div class="lv-leer">'+lvH(t)+'</div>'; }
function lvBox(titel,inhalt,extra){ return '<div class="mdb-box'+(extra?' '+extra:'')+'">'+(titel?'<h3>'+lvH(titel)+'</h3>':'')+inhalt+'</div>'; }
function lvTabelle(kopf,zeilen,leer){
  if(!zeilen.length) return lvLeer(leer||'Noch keine Einträge.');
  return '<div class="mdb-scroll"><table class="mdb-tbl lv-tbl"><thead><tr>'+kopf.map(k=>'<th'+(k.r?' class="r"':'')+'>'+lvH(k.t||k)+'</th>').join('')+'</tr></thead><tbody>'+zeilen.join('')+'</tbody></table></div>';
}
function lvKpi(k,v,s,cls){ return '<div class="kpi lv-kpi'+(cls?' '+cls:'')+'"><div class="k">'+lvH(k)+'</div><div class="v">'+lvH(v)+'</div>'+(s?'<div class="s">'+lvH(s)+'</div>':'')+'</div>'; }

/* Formularfelder: {id, label, typ:text|zahl|betrag|datum|wahl|check|textarea|email|tel, wert, optionen, hinweis, pflicht, breit, min} */
function lvFeld(f){
  const id='lvf_'+f.id, w=f.wert==null?'':f.wert;
  if(f.typ==='check') return '<label class="lv-check'+(f.breit?' full':'')+'"><input type="checkbox" id="'+id+'"'+(w?' checked':'')+'> <span>'+lvH(f.label)+'</span>'+(f.hinweis?'<span class="lv-hinweis">'+lvH(f.hinweis)+'</span>':'')+'</label>';
  if(f.typ==='mehrfach') return '<fieldset class="field lv-mehrfach'+(f.breit?' full':'')+'" id="'+id+'"><legend>'+lvH(f.label)+'</legend>'+f.optionen.map((o,i)=>'<label class="lv-check"><input type="checkbox" id="'+id+'_'+i+'" value="'+lvH(o[0])+'"'+((w||[]).includes(o[0])?' checked':'')+'> <span>'+lvH(o[1])+'</span></label>').join('')+(f.hinweis?'<span class="lv-hinweis">'+lvH(f.hinweis)+'</span>':'')+'</fieldset>';
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
    else if(f.typ==='mehrfach') v=[...el.querySelectorAll('input[type=checkbox]')].filter(x=>x.checked).map(x=>x.value);
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
function lvFehlerZeigen(fehler){
  const el=document.getElementById('lv_formfehler');
  if(el){ el.innerHTML=fehler.length?'<b>Bitte prüfen:</b> '+fehler.map(lvH).join(' · '):''; el.hidden=!fehler.length; if(fehler.length) el.scrollIntoView({block:'nearest'}); }
  else if(fehler.length) alert('Bitte prüfen:\n'+fehler.join('\n'));
}
function lvFormRahmen(titel,felderHtml,speichern,abbrechen,zusatz){
  return '<div class="mdb-box lv-formbox"><h3>'+lvH(titel)+'</h3><div id="lv_formfehler" class="lv-warn" hidden></div>'+felderHtml+(zusatz||'')
    +'<div class="mdb-actions"><button class="primary" onclick="'+speichern+'" data-ic="check">Speichern</button><button class="secondary" onclick="'+(abbrechen||'lvFormZu()')+'">Abbrechen</button></div></div>';
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
      try{ LV.einst=LVK.einstellungenBereinigen(await ImmoSpeicher.tx(LV.db,'meta','readonly',s=>s.get('einstellungen'))); }catch(e){ LV.einst={}; }
      try{ LV.dienstleister=lvDlBereinigen(await ImmoSpeicher.tx(LV.db,'meta','readonly',s=>s.get('dienstleister'))); }catch(e){ LV.dienstleister=[]; }
    }catch(e){
      LV.db=null; LV.rueckfall=true;
      try{ LV.liste=(JSON.parse(localStorage.getItem(LV_RUECKFALL))||[]).map(x=>LVK.bereinigen(x)).filter(Boolean); }catch(x){ LV.liste=[]; }
      try{ LV.einst=LVK.einstellungenBereinigen(JSON.parse(localStorage.getItem(LV_EINST_KEY))); }catch(x){ LV.einst={}; }
      try{ LV.dienstleister=lvDlBereinigen(JSON.parse(localStorage.getItem(LV_DL_KEY))); }catch(x){ LV.dienstleister=[]; }
    }
    LV.bereit=true;
    lvStartHinweis();
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
  const alt=lId?LV.liste.find(x=>x.id===lId):lvAktiv(); if(!alt) return false;
  const l=JSON.parse(JSON.stringify(alt));
  if(arbeit(l)===false) return false;
  try{ await lvSpeichern(l); }
  catch(e){ alert('Die Änderung konnte nicht gespeichert werden ('+lvFehlerText(e)+'). Es wurde nichts verändert.'); return false; }
  lvMeldung(meldung||''); lvRender(); lvStartHinweis();
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
  else if(key==='dienstleister') localStorage.setItem(LV_DL_KEY,JSON.stringify(wert));
}
function lvDlBereinigen(a){ return window.ImmoInstandhaltung?ImmoInstandhaltung.dienstleisterBereinigen(a):[]; }
/* Anhänge (Fotos, Dokumente) im Speicher „anhaenge“: {id, liegenschaftId, name, typ, size, datum, data(base64)} */
async function lvAnhangSpeichern(a){
  if(!LV.db) throw new Error('Anhänge brauchen die Datenbank des Browsers — in diesem Fenster ist sie nicht verfügbar');
  await ImmoSpeicher.tx(LV.db,'anhaenge','readwrite',s=>s.put(a));
}
async function lvAnhangLesen(id){ if(!LV.db) return null; try{ return await ImmoSpeicher.tx(LV.db,'anhaenge','readonly',s=>s.get(id)); }catch(e){ return null; } }
async function lvAnhaengeLoeschen(ids){ if(!LV.db||!ids.length) return; await ImmoSpeicher.tx(LV.db,'anhaenge','readwrite',s=>{ ids.forEach(id=>s.delete(id)); }); }
function lvDataUrl(a){ return a&&a.data?'data:'+(a.typ||'application/octet-stream')+';base64,'+a.data:''; }
async function lvMetaLesen(key){ if(!LV.db) return null; try{ return await ImmoSpeicher.tx(LV.db,'meta','readonly',s=>s.get(key)); }catch(e){ return null; } }

/* ---------- Öffnen, Navigation ---------- */
async function lvOeffnen(ansicht){
  const o=document.getElementById('lv_overlay'); if(!o) return;
  o.classList.add('on'); document.body.style.overflow='hidden';
  await lvStart();
  if(ansicht){ LV.aktivId=null; LV.ansicht=ansicht; }
  LV.form=null; lvMeldung('');
  lvRender();
}
function lvSchliessen(){ const o=document.getElementById('lv_overlay'); if(o) o.classList.remove('on'); document.body.style.overflow=''; LV.form=null; lvStartHinweis(); }
function lvAnsicht(a){ LV.aktivId=null; LV.ansicht=a; LV.form=null; lvMeldung(''); lvRender(); }
function lvLiegenschaftOeffnen(id,reiter){ LV.aktivId=id; LV.reiter=reiter||'ueberblick'; LV.form=null; LV.vertragId=null; lvMeldung(''); lvRender(); const o=document.getElementById('lv_overlay'); if(o) o.scrollTop=0; }
function lvReiter(r,form){ LV.reiter=r; LV.form=form||null; lvMeldung(''); lvRender(); const o=document.getElementById('lv_overlay'); if(o) o.scrollTop=0; }
function lvZurueck(){ LV.aktivId=null; LV.ansicht='uebersicht'; LV.form=null; lvMeldung(''); lvRender(); }
const LV_REITER=[['ueberblick','Überblick'],['einheiten','Einheiten'],['vertraege','Mieter & Verträge'],['mietkonto','Mietkonto']];
const LV_REITER_HTML={ueberblick:l=>lvUeberblickHtml(l),einheiten:l=>lvEinheitenHtml(l),vertraege:l=>lvVertraegeHtml(l),mietkonto:l=>lvMietkontoHtml(l)};
/* Weitere Teile (Nebenkosten, Instandhaltung, WEG) hängen sich hier ein: Reiter, Fristenquellen, Sprungziele */
function lvReiterRegistrieren(key,titel,fn,sichtbar,vor){ if(!LV_REITER.some(r=>r[0]===key)){ const i=vor?LV_REITER.findIndex(r=>r[0]===vor):-1; if(i>=0) LV_REITER.splice(i,0,[key,titel,sichtbar]); else LV_REITER.push([key,titel,sichtbar]); } LV_REITER_HTML[key]=fn; }
const LV_ANSICHTEN=[['uebersicht','Übersicht'],['fristen','Fristen'],['einstellungen','Absender'],['sicherung','Datensicherung']];
const LV_ANSICHT_HTML={uebersicht:()=>lvUebersichtHtml(),fristen:()=>lvFristenHtml(),einstellungen:()=>lvEinstellungenHtml(),sicherung:()=>lvSicherungHtml(),neu:()=>lvNeuHtml()};
function lvAnsichtRegistrieren(key,titel,fn,vor){ if(!LV_ANSICHTEN.some(a=>a[0]===key)){ const i=vor?LV_ANSICHTEN.findIndex(a=>a[0]===vor):-1; if(i>=0) LV_ANSICHTEN.splice(i,0,[key,titel]); else LV_ANSICHTEN.push([key,titel]); } LV_ANSICHT_HTML[key]=fn; }
const LV_FRISTEN_QUELLEN=[(l,st,h)=>LVK.fristen(l,st,h)];
function lvFristenQuelleRegistrieren(f){ if(!LV_FRISTEN_QUELLEN.includes(f)) LV_FRISTEN_QUELLEN.push(f); }
function lvFristenL(l,st,h){ return [].concat(...LV_FRISTEN_QUELLEN.map(q=>{ try{ return q(l,st,h)||[]; }catch(e){ console.error(e); return []; } }))
  .sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0); }

function lvRender(){
  const o=document.getElementById('lv_overlay'); if(!o||!o.classList.contains('on')) return;
  const l=lvAktiv();
  document.getElementById('lv_titel_t').textContent=l?l.name:'Liegenschaftsverwaltung';
  document.getElementById('lv_headinfo').textContent=l?lvAdresse(l):(LV.liste.length+' Liegenschaft'+(LV.liste.length===1?'':'en')+(LV.rueckfall?' · ohne Datenbank':''));
  document.getElementById('lv_tabs').innerHTML=l
    ?'<button class="lv-zurueck" onclick="lvZurueck()">← Alle</button>'+LV_REITER.filter(r=>!r[2]||r[2](l)).map(([k,t])=>'<button id="lvt_'+k+'" class="'+(LV.reiter===k?'on':'')+'" onclick="lvReiter(\''+k+'\')">'+t+'</button>').join('')
    :LV_ANSICHTEN.map(([k,t])=>'<button id="lvt_'+k+'" class="'+(LV.ansicht===k?'on':'')+'" onclick="lvAnsicht(\''+k+'\')">'+t+'</button>').join('');
  let html='';
  try{
    if(l) html=(LV_REITER_HTML[LV.reiter]||lvUeberblickHtml)(l);
    else html=(LV_ANSICHT_HTML[LV.ansicht]||lvUebersichtHtml)();
  }catch(e){ console.error(e); html=lvBox('Ansicht nicht verfügbar','<p>Die Ansicht konnte nicht aufgebaut werden: '+lvH(e&&e.message)+'</p>'); }
  const warn=LV.rueckfall?'<div class="lv-warn">Ohne Datenbank: Die Verwaltung speichert nur im Browserspeicher (begrenzt, ohne Dokumente). Bitte regelmäßig über „Datensicherung“ sichern.</div>':'';
  document.getElementById('lv_body').innerHTML=warn+(LV.meldung?'<div class="lv-ok" role="status">'+lvH(LV.meldung)+'</div>':'')+html;
  if(typeof iconify==='function') iconify(o);
  if(typeof a11yLabels==='function') a11yLabels(o);
}

/* ---------- Übersicht aller Liegenschaften ---------- */
function lvUebersichtHtml(){
  const st=lvHeute();
  if(!LV.liste.length) return lvBox('Liegenschaftsverwaltung',
    '<p>Hier verwaltest du Liegenschaften von Kunden, eigene Objekte und Objekte der Bank: Einheiten, Mieter und Verträge, Sollmieten und Zahlungseingänge mit Rückständen, Mahnungen und Kaution.</p>'
    +'<p class="hint">Alle Angaben bleiben auf diesem Gerät. Mieterdaten sind personenbezogene Daten — nur erfassen, was für die Verwaltung nötig ist, und regelmäßig über „Datensicherung“ sichern.</p>'
    +'<div class="mdb-actions"><button class="primary" onclick="lvNeueLiegenschaft()" data-ic="plus">Erste Liegenschaft anlegen</button></div>');
  let E=0,verm=0,eig=0,kalt=0,rueck=0,schwelle=0;
  const zeilen=LV.liste.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(l=>{
    const k=LVK.kennzahlen(l,st); E+=k.einheiten; verm+=k.vermietet; eig+=k.eigen; kalt+=k.kaltMonat; rueck+=k.rueckstand; schwelle+=k.kuendigungsschwelle;
    return '<tr class="lv-klick" onclick="lvLiegenschaftOeffnen(\''+lvQ(l.id)+'\')"><td class="strong">'+lvH(l.name)+'<br><span class="lv-klein">'+lvH(lvAdresse(l))+'</span></td>'
      +'<td>'+lvH(LV_ART_L[l.art]||'')+'<br><span class="lv-klein">'+lvH(lvEigentuemer(l))+'</span></td>'
      +'<td class="r">'+k.einheiten+'</td><td class="r">'+k.vermietet+(k.eigen?' '+lvBadge(k.eigen+' eigen'):'')+(k.leer?' '+lvBadge(k.leer+' leer','warn'):'')+'</td>'
      +'<td class="r">'+lvEur(k.kaltMonat)+(k.gesamtMonat>k.kaltMonat?'<br><span class="lv-klein">gesamt '+lvEur(k.gesamtMonat)+'</span>':'')+'</td><td class="r">'+(k.rueckstand>0?lvBadge(lvEur(k.rueckstand),'bad'):'–')+'</td></tr>';
  });
  const fr=lvAlleFristen(st,30), faellig=fr.filter(f=>f.faellig).length;
  return '<div class="kpis">'+lvKpi('Liegenschaften',String(LV.liste.length),E+' Einheiten')
    +lvKpi('Vermietet',verm+' von '+E,[(E-verm-eig)?(E-verm-eig)+' leer':'kein Leerstand'].concat(eig?[eig+' in Eigennutzung']:[]).join(' · '))
    +lvKpi('Sollmiete kalt / Monat',lvEur0(kalt),lvEur0(kalt*12)+' im Jahr')
    +lvKpi('Mietrückstände',lvEur(rueck),schwelle?schwelle+'× Kündigungsvoraussetzungen prüfen':'',rueck>0?'lv-kpi-bad':'')+'</div>'
    +lvBox('Liegenschaften',lvTabelle(['Liegenschaft','Art / Eigentümer',{t:'Einheiten',r:1},{t:'Vermietet',r:1},{t:'Miete / Monat',r:1},{t:'Rückstand',r:1}],zeilen)
      +'<div class="mdb-actions"><button class="secondary" onclick="lvNeueLiegenschaft()" data-ic="plus">Liegenschaft anlegen</button></div>')
    +lvBox('Fristen und Hinweise'+(faellig?' ('+faellig+' fällig)':''),lvFristenTabelle(fr.slice(0,12),true)
      +(fr.length>12?'<div class="mdb-actions"><button class="secondary" onclick="lvAnsicht(\'fristen\')">Alle '+fr.length+' anzeigen</button></div>':''));
}
function lvAlleFristen(st,horizont){ return [].concat(...LV.liste.map(l=>lvFristenL(l,st,horizont))).sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0); }
function lvFristenTabelle(fr,mitL){
  return lvTabelle(['Datum'].concat(mitL?['Liegenschaft']:[],['Frist / Hinweis','Betrifft']),fr.map(f=>
    '<tr class="lv-klick'+(f.faellig?' lv-faellig':'')+'" onclick="lvFristOeffnen(\''+lvQ(f.liegenschaftId)+'\',\''+lvQ(f.vertragId||'')+'\',\''+lvQ(f.art)+'\','+(+f.jahr||0)+')">'
    +'<td>'+lvH(LVK.datumDE(f.datum))+(f.faellig?' '+lvBadge(f.dringend?'dringend':'fällig',f.dringend?'bad':'warn'):'')+'</td>'
    +(mitL?'<td>'+lvH(f.liegenschaft)+'</td>':'')+'<td class="strong">'+lvH(f.titel)+'</td><td>'+lvH(f.text)+'</td></tr>'),'Keine Fristen in den nächsten Wochen.');
}
const LV_FRIST_ZIELE={};   // art → function(jahr, vertragId): setzt Reiter und Zustand
function lvFristOeffnen(lId,vId,art,jahr){
  LV.aktivId=lId; LV.form=null; lvMeldung('');
  if(LV_FRIST_ZIELE[art]) LV_FRIST_ZIELE[art](jahr,vId);
  else if(vId&&['rueckstand','kaution'].includes(art)){ LV.reiter='mietkonto'; LV.vertragId=vId; }
  else if(vId){ LV.reiter='vertraege'; LV.form={typ:'vertrag',id:vId}; }
  else LV.reiter='ueberblick';
  lvRender();
}
function lvFristenHtml(){
  const fr=lvAlleFristen(lvHeute(),90);
  return lvBox('Fristen und Hinweise der nächsten 90 Tage','<p class="hint">Vertragsenden, Staffel- und Indexmieten, Mietrückstände mit Mahnvorschlag und offene Kautionen aller Liegenschaften.</p>'+lvFristenTabelle(fr,true));
}

/* ---------- Liegenschaft anlegen und bearbeiten ---------- */
function lvStammFelder(l){
  l=l||{};
  const kunden=(typeof KD_CACHE!=='undefined'&&Array.isArray(KD_CACHE)?KD_CACHE:[]).map(k=>[k.id,(typeof kdName==='function'?kdName(k):k.id)||k.id]).sort((a,b)=>a[1].localeCompare(b[1],'de'));
  const projekte=(typeof pjLoad==='function'?pjLoad():[]).map(p=>[p.id,(p.name||'Projekt')+(p.empf?' ('+p.empf+')':'')]);
  return [
    {id:'name',label:'Bezeichnung',wert:l.name,pflicht:true,platzhalter:'z. B. Hauptstraße 12'},
    {id:'strasse',label:'Straße und Hausnummer',wert:l.strasse},{id:'plz',label:'PLZ',wert:l.plz},{id:'ort',label:'Ort',wert:l.ort},
    {id:'art',label:'Art',typ:'wahl',wert:l.art||'mfh',optionen:Object.entries(LV_ART_L)},
    {id:'eigentuemerArt',label:'Eigentümer',typ:'wahl',wert:l.eigentuemerArt||'kunde',optionen:Object.entries(LV_EIG)},
    {id:'kundeId',label:'Kunde aus der Kundenakte',typ:'wahl',wert:l.kundeId||'',optionen:[['','– keiner –']].concat(kunden),hinweis:kunden.length?'':'Noch keine Kunden in der Kundenakte.'},
    {id:'eigentuemerName',label:'Eigentümer (Name, falls nicht in der Kundenakte)',wert:l.eigentuemerName},
    {id:'baujahr',label:'Baujahr',typ:'zahl',wert:l.baujahr,min:1000},
    {id:'wert',label:'Verkehrswert oder Kaufpreis (€)',typ:'betrag',wert:l.wert,min:0,hinweis:'für die Rendite; leer = letzte Bewertung (Reiter „Bewertungen“) bzw. verknüpfte Bewertung'},
    {id:'projektId',label:'Verknüpfte Bewertung',typ:'wahl',wert:l.projektId||'',optionen:[['','– keine –']].concat(projekte)},
    {id:'kappung15',label:'Gemeinde mit abgesenkter Kappungsgrenze (15 %)',typ:'check',wert:l.einstellungen&&l.einstellungen.kappung15,breit:true,hinweis:'Baden-Württemberg: Gemeinden der KappVO BW erkennt die App am Ort automatisch (Verordnung gültig bis 31.12.2026). Häkchen nur für andere Bundesländer oder eine abweichende Schreibweise des Orts (§ 558 Abs. 3 BGB).'},
    {id:'kontoInhaber',label:'Mietkonto: Kontoinhaber',wert:l.kontoInhaber},{id:'iban',label:'Mietkonto: IBAN',wert:LVK.ibanLesbar(l.iban||'')},{id:'bank',label:'Mietkonto: Bank',wert:l.bank},
    {id:'notiz',label:'Notiz',typ:'textarea',wert:l.notiz,breit:true}
  ];
}
function lvNeueLiegenschaft(){ LV.aktivId=null; LV.ansicht='neu'; LV.form=null; lvMeldung(''); lvRender(); }
const LV_SCHNELL=[{id:'q_nr',label:'Einheit (Nummer)',platzhalter:'W1'},{id:'q_flaeche',label:'Wohn-/Nutzfläche (m²)',typ:'zahl',min:0},
  {id:'q_mieter',label:'Mieter(in)'},{id:'q_beginn',label:'Mietbeginn',typ:'datum'},
  {id:'q_kalt',label:'Nettokaltmiete / Monat (€)',typ:'betrag',min:0},{id:'q_nk',label:'Betriebskosten-Vorauszahlung (€)',typ:'betrag',min:0},{id:'q_hk',label:'Heizkosten-Vorauszahlung (€)',typ:'betrag',min:0}];
function lvNeuHtml(){
  return lvFormRahmen('Neue Liegenschaft',lvFelder(lvStammFelder()),'lvStammSpeichern(null)','lvAnsicht(\'uebersicht\')',
    '<h3 class="sep">Erste Einheit und Miete (optional)</h3><p class="hint">Für eine vermietete Wohnung oder ein Haus kannst du Einheit, Mieter und Miete gleich hier eintragen. '
    +'Weitere Einheiten und alle Vertragsdetails (Kaution, Staffel, Index) folgen unter „Einheiten“ und „Mieter &amp; Verträge“.</p>'+lvFelder(LV_SCHNELL,'four'));
}
/* Schnellerfassung beim Anlegen: Einheit nur mit Nummer/Fläche, Vertrag nur vollständig (Mieter, Beginn, Kaltmiete) */
function lvSchnellLesen(){
  const r=lvFormLesen(LV_SCHNELL), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return null; }
  const vertragTeile=[w.q_mieter,w.q_beginn,w.q_kalt,w.q_nk,w.q_hk].filter(x=>x!=null&&x!==''), fehlt=[];
  if(vertragTeile.length){ if(!w.q_mieter) fehlt.push('Mieter(in)'); if(!w.q_beginn) fehlt.push('Mietbeginn'); if(!(w.q_kalt>0)) fehlt.push('Nettokaltmiete'); }
  if(fehlt.length){ lvFehlerZeigen(['Für den Mietvertrag fehlt: '+fehlt.join(', ')]); return null; }
  if(!vertragTeile.length&&!w.q_nr&&w.q_flaeche==null) return {};
  const e={id:LVK.neueId('E'),nr:w.q_nr||'W1',lage:'',art:'wohnung',flaeche:w.q_flaeche,zimmer:null,mea:null,sollmiete:null,notiz:''};
  const v=vertragTeile.length?{id:LVK.neueId('V'),einheitId:e.id,beginn:w.q_beginn,ende:null,mietart:'fest',personen:null,notiz:'',mieter:[{name:w.q_mieter,telefon:'',email:''}],
    miete:{kalt:w.q_kalt,nk:w.q_nk||0,hk:w.q_hk||0,zuschlag:0,ust:0},aenderungen:[],sonderposten:[],kaution:{soll:0,art:'bar',raten:false},index:{basisMonat:null,basisWert:null}}:null;
  return {einheit:e,vertrag:v};
}
async function lvStammSpeichern(id){
  const r=lvFormLesen(lvStammFelder());
  if(r.werte.iban&&!LVK.ibanGueltig(r.werte.iban)){ r.ok=false; r.fehler.push('IBAN: Prüfziffer stimmt nicht'); const el=document.getElementById('lvf_iban'); if(el) el.classList.add('lv-fehler'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte, setzen=l=>{
    ['name','strasse','plz','ort','art','eigentuemerArt','eigentuemerName','notiz','kontoInhaber','bank'].forEach(k=>l[k]=w[k]||'');
    l.kundeId=w.kundeId||null; l.projektId=w.projektId||null; l.baujahr=w.baujahr; l.wert=w.wert; l.iban=(w.iban||'').replace(/\s+/g,'').toUpperCase();
    l.einstellungen=Object.assign({},l.einstellungen||{},{kappung15:!!w.kappung15});
  };
  if(!id){
    const q=lvSchnellLesen(); if(!q) return;
    const l={id:LVK.neueId('L'),einheiten:[],vertraege:[],zahlungen:[],mahnungen:[],einstellungen:{}};
    setzen(l);
    if(q.einheit){ l.einheiten.push(q.einheit); if(q.vertrag) l.vertraege.push(q.vertrag); }
    try{ await lvSpeichern(l); }catch(e){ alert('Die Liegenschaft konnte nicht gespeichert werden ('+lvFehlerText(e)+').'); return; }
    LV.aktivId=l.id;
    if(q.einheit){ LV.reiter='ueberblick'; LV.form=null; lvMeldung('Liegenschaft angelegt'+(q.vertrag?' mit Einheit, Mieter und Miete':' mit Einheit')+'.'); }
    else { LV.reiter='einheiten'; LV.form={typ:'einheit',id:null}; lvMeldung('Liegenschaft angelegt. Als Nächstes die Einheiten erfassen.'); }
    lvRender(); lvStartHinweis(); return;
  }
  LV.form=null;
  await lvAendern(l=>{ setzen(l); },'Stammdaten gespeichert.');
}
async function lvLiegenschaftLoeschen(id){
  const l=LV.liste.find(x=>x.id===id); if(!l) return;
  const n=(l.vertraege||[]).length, z=(l.zahlungen||[]).length;
  if(!confirm('Liegenschaft „'+l.name+'“ mit '+(l.einheiten||[]).length+' Einheiten, '+n+' Verträgen und '+z+' Zahlungen endgültig löschen?\nTipp: vorher über „Datensicherung“ sichern.')) return;
  try{ await lvLoeschenDb(id); }catch(e){ alert('Die Liegenschaft konnte nicht gelöscht werden ('+lvFehlerText(e)+').'); return; }
  try{ if(LV.db){ const alle=await ImmoSpeicher.tx(LV.db,'anhaenge','readonly',s=>s.getAll()); await lvAnhaengeLoeschen(alle.filter(a=>a.liegenschaftId===id).map(a=>a.id)); } }
  catch(e){ console.error(e); }   // Liegenschaft ist gelöscht; verwaiste Anhänge stören nicht und werden beim nächsten Löschen erneut versucht
  LV.aktivId=null; LV.ansicht='uebersicht'; lvMeldung('Liegenschaft „'+l.name+'“ gelöscht.'); lvRender(); lvStartHinweis();
}
function lvWert(l){
  if(l.wert>0) return l.wert;
  if(typeof ImmoLvBewertung!=='undefined'){ const b=ImmoLvBewertung.aktuell(l); if(b&&b.ergebnis>0) return b.ergebnis; }
  if(l.projektId&&typeof pjLoad==='function'){ const p=pjLoad().find(x=>x.id===l.projektId); if(p&&p.empf){ const w=LVK.zahlEingabe(String(p.empf).replace(/[^\d.,-]/g,'')); if(w>0) return w; } }
  return null;
}

/* Mietaufstellung zum Stichtag: Miete je Einheit mit Bestandteilen, Summen und den nächsten Änderungen */
function lvMietenHtml(l,st){
  const z=[], s={kalt:0,nk:0,hk:0,zuschlag:0,gesamt:0,flaeche:0};
  (l.einheiten||[]).forEach(e=>{
    const v=LVK.aktiverVertrag(l,e.id,st), f=+e.flaeche||0;
    if(!v&&e.eigennutzung){ z.push('<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td>'+lvBadge('Eigennutzung')+(+e.sollmiete>0?' <span class="lv-klein">fiktiv '+lvEur(e.sollmiete)+'</span>':'')+'</td><td class="r">'+(f?lvH(String(f).replace('.',','))+' m²':'–')+'</td>'
      +'<td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td></td></tr>'); return; }
    if(!v){ z.push('<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td>'+lvBadge('leer','warn')+(+e.sollmiete>0?' <span class="lv-klein">Ziel '+lvEur(e.sollmiete)+'</span>':'')+'</td><td class="r">'+(f?lvH(String(f).replace('.',','))+' m²':'–')+'</td>'
      +'<td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="r">–</td><td class="lv-aktionen"><button class="secondary" onclick="lvReiter(\'vertraege\',{typ:\'vertrag\',id:null,einheitId:\''+lvQ(e.id)+'\'})" data-ic="plus">Vermieten</button></td></tr>'); return; }
    const m=LVK.mieteAm(v,st); ['kalt','nk','hk','zuschlag','gesamt'].forEach(t=>s[t]+=m[t]); s.flaeche+=f;
    z.push('<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td>'+lvH(lvMieterName(v))+'<br><span class="lv-klein">'+lvH(LV_MIETART[v.mietart]||'')+'</span></td><td class="r">'+(f?lvH(String(f).replace('.',','))+' m²':'–')+'</td>'
      +'<td class="r">'+lvEur(m.kalt)+(f?'<br><span class="lv-klein">'+lvH(lvQm(m.kalt/f))+' €/m²</span>':'')+'</td><td class="r">'+lvEur(m.nk)+'</td><td class="r">'+lvEur(m.hk)+'</td><td class="r">'+(m.zuschlag?lvEur(m.zuschlag):'–')+'</td>'
      +'<td class="r strong">'+lvEur(m.gesamt)+(m.ust?'<br><span class="lv-klein">inkl. '+m.ust+' % USt</span>':'')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="LV.vertragId=\''+lvQ(v.id)+'\';lvReiter(\'mietkonto\')">Mietkonto</button></td></tr>');
  });
  if(s.gesamt>0) z.push('<tr class="lv-summe"><td class="strong">Summe</td><td></td><td class="r">'+(s.flaeche?lvH(String(LVK.r2(s.flaeche)).replace('.',','))+' m²':'')+'</td><td class="r strong">'+lvEur(s.kalt)+'</td><td class="r">'+lvEur(s.nk)+'</td><td class="r">'+lvEur(s.hk)+'</td><td class="r">'+(s.zuschlag?lvEur(s.zuschlag):'–')+'</td><td class="r strong">'+lvEur(s.gesamt)+'</td><td></td></tr>');
  const kuenftig=[];
  (l.vertraege||[]).forEach(v=>(v.aenderungen||[]).forEach(a=>{ if(a.ab>st&&typeof a.kalt==='number') kuenftig.push({a,v}); }));
  kuenftig.sort((x,y)=>x.a.ab<y.a.ab?-1:1);
  const kuenftigHtml=kuenftig.length?'<p class="hint"><b>Nächste Mietänderungen:</b> '+kuenftig.slice(0,5).map(x=>lvH(LVK.datumDE(x.a.ab)+' · '+lvEinheitName(lvEinheit(l,x.v.einheitId))+' · Kaltmiete '+lvEur(x.a.kalt)+' ('+(LV_GRUND[x.a.grund]||x.a.grund||'Änderung')+')')).join('; ')+'</p>':'';
  return lvBox('Mieten (Stand '+LVK.datumDE(st)+')',lvTabelle(['Einheit','Mieter / Mietart',{t:'Fläche',r:1},{t:'Kaltmiete',r:1},{t:'BK-VZ',r:1},{t:'HK-VZ',r:1},{t:'Zuschläge',r:1},{t:'Gesamt / Monat',r:1},''],z)
    +(s.gesamt>0?'<p class="hint">Im Jahr: Nettokaltmiete '+lvEur(s.kalt*12)+' · Gesamtmiete '+lvEur(s.gesamt*12)+(s.flaeche?' · Ø '+lvQm(s.kalt/s.flaeche)+' €/m² kalt':'')+'</p>':'<p class="hint">Noch keine laufenden Mietverträge — über „Vermieten“ Mieter und Miete erfassen.</p>')
    +kuenftigHtml
    +'<div class="mdb-actions"><button class="secondary" onclick="lvReiter(\'vertraege\',{typ:\'vertrag\',id:null})" data-ic="plus">Mietvertrag anlegen</button><button class="secondary" onclick="lvMieterlisteExcel()" data-ic="download">Mietaufstellung (Excel)</button></div>');
}

/* ---------- Reiter „Überblick“ ---------- */
function lvUeberblickHtml(l){
  if(LV.form&&LV.form.typ==='stamm') return lvFormRahmen('Stammdaten bearbeiten',lvFelder(lvStammFelder(l)),'lvStammSpeichern(\''+lvQ(l.id)+'\')');
  const st=lvHeute(), wert=lvWert(l), k=LVK.kennzahlen(l,st,{wert}), fr=lvFristenL(l,st,60);
  const ls=LVK.leerstand(l,st.slice(0,4)+'-01-01',st), entgangen=ls.reduce((s,x)=>s+x.entgangen,0);
  const angaben=[['Art',LV_ART_L[l.art]],['Eigentümer',lvEigentuemer(l)],['Baujahr',l.baujahr||''],['Wert für die Rendite',wert?lvEur0(wert)+(l.wert>0?'':' (aus Bewertung)'):''],
    ['Mietkonto',l.iban?LVK.ibanLesbar(l.iban)+(l.bank?' · '+l.bank:'')+(l.kontoInhaber?' · '+l.kontoInhaber:''):''],['Notiz',l.notiz]].filter(x=>x[1]);
  return '<div class="kpis">'+lvKpi('Einheiten',String(k.einheiten),k.flaeche?String(k.flaeche).replace('.',',')+' m²':'')
    +lvKpi('Vermietet',k.vermietet+' von '+k.einheiten,(k.leer?'Leerstand '+String(k.leerquoteFlaeche).replace('.',',')+' % der Fläche':'kein Leerstand')+(k.eigen?' · '+k.eigen+' in Eigennutzung':''),k.leer?'lv-kpi-warn':'')
    +lvKpi('Sollmiete kalt / Monat',lvEur(k.kaltMonat),'gesamt '+lvEur(k.gesamtMonat)+(k.rendite!=null?' · Rendite '+String(k.rendite).replace('.',',')+' %':''))
    +lvKpi('Mietrückstände',lvEur(k.rueckstand),k.kuendigungsschwelle?'Kündigungsvoraussetzungen prüfen':(k.kautionOffen?'Kaution offen: '+lvEur(k.kautionOffen):''),k.rueckstand>0?'lv-kpi-bad':'')+'</div>'
    +(!k.einheiten?'<div class="lv-warn">Noch keine Einheiten erfasst. <button class="secondary" onclick="lvReiter(\'einheiten\')">Einheiten anlegen</button></div>':lvMietenHtml(l,st))
    +lvBox('Fristen und Hinweise (60 Tage)',lvFristenTabelle(fr,false))
    +lvBox('Stammdaten','<dl class="lv-dl">'+angaben.map(a=>'<dt>'+lvH(a[0])+'</dt><dd>'+lvH(a[1])+'</dd>').join('')+'</dl>'
      +(entgangen>0?'<p class="hint">Leerstand seit Jahresbeginn: entgangene Nettokaltmiete '+lvEur(entgangen)+'.</p>':'')
      +'<div class="mdb-actions"><button class="secondary" onclick="LV.form={typ:\'stamm\'};lvRender()" data-ic="pen">Bearbeiten</button>'
      +(l.eigentuemerArt==='kunde'&&l.kundeId&&typeof kdOeffnen==='function'?'<button class="secondary" onclick="lvSchliessen();kdOeffnen(\''+lvQ(l.kundeId)+'\')" data-ic="users">Kundenakte öffnen</button>':'')
      +'<button class="secondary" onclick="lvMieterlisteExcel()" data-ic="download">Mieterliste (Excel)</button>'
      +'<button class="danger" onclick="lvLiegenschaftLoeschen(\''+lvQ(l.id)+'\')" data-ic="trash">Liegenschaft löschen</button></div>');
}

/* ---------- Reiter „Einheiten“ ---------- */
function lvEinheitFelder(e){
  e=e||{};
  return [{id:'nr',label:'Nummer / Kurzbezeichnung',wert:e.nr,pflicht:true,platzhalter:'z. B. W1, EG links, TG 3'},
    {id:'lage',label:'Lage',wert:e.lage,platzhalter:'z. B. 1. OG rechts'},
    {id:'art',label:'Art',typ:'wahl',wert:e.art||'wohnung',optionen:Object.entries(LV_ART_E)},
    {id:'flaeche',label:'Wohn-/Nutzfläche (m²)',typ:'zahl',wert:e.flaeche,min:0},
    {id:'zimmer',label:'Zimmer',typ:'zahl',wert:e.zimmer,min:0},
    {id:'mea',label:'Miteigentumsanteil (MEA)',typ:'zahl',wert:e.mea,min:0,hinweis:'für WEG und Umlage nach MEA'},
    {id:'sollmiete',label:'Zielmiete kalt / Monat (€)',typ:'betrag',wert:e.sollmiete,min:0,hinweis:'für entgangene Miete bei Leerstand; bei Eigennutzung die fiktive Miete'},
    {id:'eigennutzung',label:'Eigennutzung (z. B. eigene Filiale) — kein Leerstand, keine Vermietung',typ:'check',wert:e.eigennutzung,breit:true},
    {id:'notiz',label:'Notiz',typ:'textarea',wert:e.notiz,breit:true,zeilen:2}];
}
function lvEinheitenHtml(l){
  const st=lvHeute();
  let form='';
  if(LV.form&&LV.form.typ==='einheit'){ const e=LV.form.id?lvEinheit(l,LV.form.id):null;
    form=lvFormRahmen(e?'Einheit '+(e.nr||'')+' bearbeiten':'Neue Einheit',lvFelder(lvEinheitFelder(e)),'lvEinheitSpeichern(\''+lvQ(LV.form.id||'')+'\')'); }
  const mitMea=(l.einheiten||[]).some(e=>e.mea!=null);
  let sKalt=0,sGes=0;
  const zeilen=(l.einheiten||[]).map(e=>{
    const v=LVK.aktiverVertrag(l,e.id,st), m=v?LVK.mieteAm(v,st):null, f=+e.flaeche||0;
    if(m){ sKalt+=m.kalt; sGes+=m.gesamt; }
    return '<tr><td class="strong">'+lvH(e.nr)+(e.lage?'<br><span class="lv-klein">'+lvH(e.lage)+'</span>':'')+'</td><td>'+lvH(LV_ART_E[e.art])+'</td>'
      +'<td class="r">'+(e.flaeche!=null?lvH(String(e.flaeche).replace('.',','))+' m²':'–')+'</td>'+(mitMea?'<td class="r">'+(e.mea!=null?lvH(String(e.mea).replace('.',',')):'–')+'</td>':'')
      +'<td>'+(v?lvH(lvMieterName(v))+'<br><span class="lv-klein">seit '+lvH(LVK.datumDE(v.beginn))+'</span>':e.eigennutzung?lvBadge('Eigennutzung'):lvBadge('leer','warn'))+'</td>'
      +'<td class="r">'+(m?lvEur(m.kalt)+(f?'<br><span class="lv-klein">'+lvH(lvQm(m.kalt/f))+' €/m²</span>':''):(+e.sollmiete>0?'<span class="lv-klein">'+(e.eigennutzung?'fiktiv ':'Ziel ')+lvEur(e.sollmiete)+'</span>':'–'))+'</td>'
      +'<td class="r">'+(m?lvEur(m.gesamt):'–')+'</td>'
      +'<td class="lv-aktionen">'+(v||e.eigennutzung?'':'<button class="secondary" onclick="lvReiter(\'vertraege\',{typ:\'vertrag\',id:null,einheitId:\''+lvQ(e.id)+'\'})" data-ic="plus">Vermieten</button>')
      +'<button class="secondary" onclick="LV.form={typ:\'einheit\',id:\''+lvQ(e.id)+'\'};lvRender()">Bearbeiten</button>'
      +'<button class="secondary" onclick="lvEinheitLoeschen(\''+lvQ(e.id)+'\')" aria-label="Einheit löschen" data-ic="trash"></button></td></tr>';
  });
  if(zeilen.length>1&&sKalt>0) zeilen.push('<tr class="lv-summe"><td class="strong">Summe</td><td></td><td></td>'+(mitMea?'<td></td>':'')+'<td></td><td class="r strong">'+lvEur(sKalt)+'</td><td class="r strong">'+lvEur(sGes)+'</td><td></td></tr>');
  const summe=(l.einheiten||[]).reduce((s,e)=>s+(+e.flaeche||0),0);
  return form+lvBox('Einheiten'+(summe?' · '+String(LVK.r2(summe)).replace('.',',')+' m²':''),
    lvTabelle(['Nr.','Art',{t:'Fläche',r:1}].concat(mitMea?[{t:'MEA',r:1}]:[],['Mieter',{t:'Kaltmiete / Monat',r:1},{t:'Gesamt / Monat',r:1},'']),zeilen,'Noch keine Einheiten erfasst.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'einheit\',id:null};lvRender()" data-ic="plus">Einheit hinzufügen</button></div>');
}
async function lvEinheitSpeichern(id){
  const r=lvFormLesen(lvEinheitFelder()); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const l=lvAktiv(), w=r.werte;
  if((l.einheiten||[]).some(e=>e.id!==id&&e.nr.toLowerCase()===w.nr.toLowerCase())){ lvFehlerZeigen(['Die Nummer „'+w.nr+'“ ist schon vergeben']); return; }
  const neu=!id;
  LV.form=null;
  await lvAendern(l=>{
    let e=id?lvEinheit(l,id):null;
    if(!e){ e={id:LVK.neueId('E')}; l.einheiten.push(e); }
    Object.assign(e,{nr:w.nr,lage:w.lage,art:w.art,flaeche:w.flaeche,zimmer:w.zimmer,mea:w.mea,sollmiete:w.sollmiete,eigennutzung:w.eigennutzung===true,notiz:w.notiz});
  },neu?'Einheit „'+w.nr+'“ angelegt.':'Einheit gespeichert.');
  if(neu) { LV.form={typ:'einheit',id:null}; lvRender(); }
}
async function lvEinheitLoeschen(id){
  const l=lvAktiv(), e=lvEinheit(l,id); if(!e) return;
  if(LVK.vertraegeDerEinheit(l,id).length){ alert('Für die Einheit „'+e.nr+'“ gibt es Mietverträge. Bitte zuerst die Verträge löschen.'); return; }
  if(!confirm('Einheit „'+e.nr+'“ löschen?')) return;
  await lvAendern(l=>{ l.einheiten=l.einheiten.filter(x=>x.id!==id); },'Einheit gelöscht.');
}

/* ---------- Reiter „Mieter & Verträge“ ---------- */
function lvVertragFelder(l,v){
  v=v||{}; const m=v.miete||{}, p=(v.mieter||[]), k=v.kaution||{}, ix=v.index||{};
  return [
    {id:'einheitId',label:'Einheit',typ:'wahl',wert:v.einheitId||(LV.form&&LV.form.typ==='vertrag'&&!LV.form.id&&LV.form.einheitId)||'',pflicht:true,optionen:[['','– bitte wählen –']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]))},
    {id:'name1',label:'Mieter(in)',wert:(p[0]||{}).name,pflicht:true},{id:'telefon1',label:'Telefon',typ:'tel',wert:(p[0]||{}).telefon},{id:'email1',label:'E-Mail',typ:'email',wert:(p[0]||{}).email},
    {id:'name2',label:'Weitere(r) Mieter(in)',wert:(p[1]||{}).name},{id:'telefon2',label:'Telefon',typ:'tel',wert:(p[1]||{}).telefon},{id:'email2',label:'E-Mail',typ:'email',wert:(p[1]||{}).email},
    {id:'personen',label:'Personen im Haushalt',typ:'zahl',wert:v.personen,min:0,hinweis:'für die Umlage nach Personen'},
    {id:'beginn',label:'Mietbeginn',typ:'datum',wert:v.beginn,pflicht:true},
    {id:'ende',label:'Mietende',typ:'datum',wert:v.ende,hinweis:'leer = unbefristet / läuft'},
    {id:'mietart',label:'Mietart',typ:'wahl',wert:v.mietart||'fest',optionen:Object.entries(LV_MIETART)},
    {id:'kalt',label:'Nettokaltmiete / Monat (€)',typ:'betrag',wert:m.kalt,pflicht:true,min:0},
    {id:'nk',label:'Betriebskosten-Vorauszahlung (€)',typ:'betrag',wert:m.nk,min:0},
    {id:'hk',label:'Heizkosten-Vorauszahlung (€)',typ:'betrag',wert:m.hk,min:0},
    {id:'zuschlag',label:'Zuschläge, z. B. Stellplatz (€)',typ:'betrag',wert:m.zuschlag,min:0},
    {id:'ust',label:'Umsatzsteuer',typ:'wahl',wert:String(m.ust||0),optionen:[['0','keine (Wohnraum)'],['19','19 % (Gewerbe mit Option)']]},
    {id:'kautionSoll',label:'Kaution (€)',typ:'betrag',wert:k.soll,min:0,hinweis:'höchstens drei Nettokaltmieten (§ 551 BGB)'},
    {id:'kautionArt',label:'Art der Kaution',typ:'wahl',wert:k.art||'bar',optionen:Object.entries(LV_KAUTION)},
    {id:'kautionRaten',label:'Kaution in drei Monatsraten (§ 551 Abs. 2 BGB)',typ:'check',wert:k.raten},
    {id:'indexMonat',label:'Indexmiete: Basismonat (JJJJ-MM)',wert:ix.basisMonat,platzhalter:'2025-01'},
    {id:'indexWert',label:'Indexmiete: VPI im Basismonat',typ:'zahl',wert:ix.basisWert,min:0,hinweis:'Verbraucherpreisindex (Destatis, 2020 = 100)'},
    {id:'notiz',label:'Notiz',typ:'textarea',wert:v.notiz,breit:true,zeilen:2}];
}
function lvVertragStatus(v,st){ return !LVK.datumGueltig(v.beginn)?'':v.beginn>st?['beginnt '+LVK.datumDE(v.beginn),'']:v.ende&&v.ende<st?['beendet','']:['läuft','ok']; }
function lvVertraegeHtml(l){
  const st=lvHeute();
  if(!(l.einheiten||[]).length) return lvBox('Mieter & Verträge','<p>Zuerst die Einheiten der Liegenschaft erfassen.</p><div class="mdb-actions"><button class="primary" onclick="lvReiter(\'einheiten\')">Zu den Einheiten</button></div>');
  let form='';
  if(LV.form&&LV.form.typ==='vertrag'){ const v=LV.form.id?lvVertrag(l,LV.form.id):null; form=lvVertragFormHtml(l,v); }
  const liste=(l.vertraege||[]).slice().sort((a,b)=>{ const ea=lvEinheit(l,a.einheitId)||{}, eb=lvEinheit(l,b.einheitId)||{}; return String(ea.nr).localeCompare(String(eb.nr),'de',{numeric:true})||(a.beginn<b.beginn?1:-1); });
  const zeilen=liste.map(v=>{
    const m=LVK.mieteAm(v,v.beginn>st?v.beginn:(v.ende&&v.ende<st?v.ende:st)), s=lvVertragStatus(v,st), op=lvOp(l,v,st);
    return '<tr><td class="strong">'+lvH(lvEinheitName(lvEinheit(l,v.einheitId)))+'</td><td>'+lvH(lvMieterName(v))+'</td>'
      +'<td>'+lvH(LVK.datumDE(v.beginn))+(v.ende?' – '+lvH(LVK.datumDE(v.ende)):'')+'<br>'+lvBadge(s[0],s[1])+'</td>'
      +'<td>'+lvH(LV_MIETART[v.mietart]||'')+'</td><td class="r">'+lvEur(m.kalt)+'<br><span class="lv-klein">gesamt '+lvEur(m.gesamt)+'</span></td>'
      +'<td class="r">'+(op.summe.rueckstand>0?lvBadge(lvEur(op.summe.rueckstand),'bad'):'–')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'vertrag\',id:\''+lvQ(v.id)+'\'};lvRender()">Bearbeiten</button>'
      +'<button class="secondary" onclick="LV.vertragId=\''+lvQ(v.id)+'\';lvReiter(\'mietkonto\')">Mietkonto</button>'
      +'<button class="secondary" onclick="lvVertragLoeschen(\''+lvQ(v.id)+'\')" aria-label="Vertrag löschen" data-ic="trash"></button></td></tr>';
  });
  return form+lvBox('Mieter & Verträge',lvTabelle(['Einheit','Mieter','Laufzeit','Mietart',{t:'Miete / Monat',r:1},{t:'Rückstand',r:1},''],zeilen,'Noch keine Mietverträge erfasst.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'vertrag\',id:null};lvRender()" data-ic="plus">Mietvertrag anlegen</button></div>');
}
function lvVertragFormHtml(l,v){
  const felder=lvFelder(lvVertragFelder(l,v));
  let aend='';
  if(v){
    const zeilen=(v.aenderungen||[]).slice().sort((a,b)=>a.ab<b.ab?-1:1).map(a=>'<tr><td>'+lvH(LVK.datumDE(a.ab))+'</td><td>'+lvH(LV_GRUND[a.grund]||a.grund||'')+'</td>'
      +['kalt','nk','hk','zuschlag'].map(t=>'<td class="r">'+(typeof a[t]==='number'?lvEur(a[t]):'–')+'</td>').join('')
      +'<td>'+lvH(a.notiz)+'</td><td><button class="secondary" onclick="lvAenderungLoeschen(\''+lvQ(v.id)+'\',\''+lvQ(a.id)+'\')" aria-label="Änderung löschen" data-ic="trash"></button></td></tr>');
    aend='<h3 class="sep">Mietänderungen (Staffel, Index, Erhöhung, Vorauszahlung)</h3><p class="hint">Jede Zeile gilt ab ihrem Datum; leere Felder bleiben unverändert. Die Sollstellung rechnet danach automatisch.</p>'
      +lvTabelle(['Ab','Grund',{t:'Kalt',r:1},{t:'BK-VZ',r:1},{t:'HK-VZ',r:1},{t:'Zuschläge',r:1},'Notiz',''],zeilen,'Keine Änderungen seit Mietbeginn.')
      +'<div class="grid four lv-form lv-aend">'+[{id:'a_ab',label:'Gültig ab',typ:'datum'},{id:'a_grund',label:'Grund',typ:'wahl',wert:v.mietart==='staffel'?'staffel':v.mietart==='index'?'index':'558',optionen:Object.entries(LV_GRUND)},
        {id:'a_kalt',label:'Neue Kaltmiete (€)',typ:'betrag'},{id:'a_nk',label:'Neue BK-Vorauszahlung (€)',typ:'betrag'},{id:'a_hk',label:'Neue HK-Vorauszahlung (€)',typ:'betrag'},
        {id:'a_zuschlag',label:'Neue Zuschläge (€)',typ:'betrag'},{id:'a_notiz',label:'Notiz'}].map(lvFeld).join('')
      +'<div class="field"><label>&nbsp;</label><button class="secondary" onclick="lvAenderungSpeichern(\''+lvQ(v.id)+'\')" data-ic="plus">Änderung eintragen</button></div></div>';
  }
  return lvFormRahmen(v?'Mietvertrag '+lvMieterName(v)+' bearbeiten':'Neuer Mietvertrag',felder,'lvVertragSpeichern(\''+lvQ(v?v.id:'')+'\')',null,aend);
}
async function lvVertragSpeichern(id){
  const l=lvAktiv(), r=lvFormLesen(lvVertragFelder(l)), w=r.werte;
  if(w.beginn&&w.ende&&w.ende<w.beginn){ r.ok=false; r.fehler.push('Mietende liegt vor dem Mietbeginn'); }
  if(w.indexMonat&&!/^\d{4}-\d{2}$/.test(w.indexMonat)){ r.ok=false; r.fehler.push('Indexmiete: Basismonat bitte als JJJJ-MM'); }
  if(r.ok&&w.einheitId){
    const kollision=LVK.vertraegeDerEinheit(l,w.einheitId).find(x=>x.id!==id&&LVK.ueberlappung(w.beginn,w.ende||null,x.beginn,x.ende||null)>0);
    if(kollision){ r.ok=false; r.fehler.push('Für diese Einheit läuft in diesem Zeitraum bereits der Vertrag mit '+lvMieterName(kollision)+' ('+LVK.datumDE(kollision.beginn)+(kollision.ende?' – '+LVK.datumDE(kollision.ende):'')+')'); }
  }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  if(w.kautionSoll>3*w.kalt+0.004&&!confirm('Die Kaution ('+lvEur(w.kautionSoll)+') ist höher als drei Nettokaltmieten ('+lvEur(3*w.kalt)+'). Nach § 551 Abs. 1 BGB ist der übersteigende Teil unwirksam. Trotzdem so speichern?')) return;
  LV.form=null;
  const neu=!id, vid=id||LVK.neueId('V');
  await lvAendern(l=>{
    let v=id?lvVertrag(l,id):null;
    if(!v){ v={id:vid,aenderungen:[],sonderposten:[]}; l.vertraege.push(v); }
    Object.assign(v,{einheitId:w.einheitId,beginn:w.beginn,ende:w.ende||null,mietart:w.mietart,personen:w.personen,notiz:w.notiz,
      mieter:[{name:w.name1,telefon:w.telefon1,email:w.email1}].concat(w.name2?[{name:w.name2,telefon:w.telefon2,email:w.email2}]:[]),
      miete:{kalt:w.kalt||0,nk:w.nk||0,hk:w.hk||0,zuschlag:w.zuschlag||0,ust:+w.ust||0},
      kaution:{soll:w.kautionSoll||0,art:w.kautionArt,raten:!!w.kautionRaten},
      index:{basisMonat:w.indexMonat||null,basisWert:w.indexWert}});
  },neu?'Mietvertrag angelegt.':'Mietvertrag gespeichert.');
  if(neu){ LV.form={typ:'vertrag',id:vid}; lvRender(); }
}
async function lvAenderungSpeichern(vid){
  const f=[{id:'a_ab',label:'Gültig ab',typ:'datum',pflicht:true},{id:'a_grund',label:'Grund',typ:'wahl'},{id:'a_kalt',label:'Neue Kaltmiete',typ:'betrag',min:0},
    {id:'a_nk',label:'Neue BK-Vorauszahlung',typ:'betrag',min:0},{id:'a_hk',label:'Neue HK-Vorauszahlung',typ:'betrag',min:0},{id:'a_zuschlag',label:'Neue Zuschläge',typ:'betrag',min:0},{id:'a_notiz',label:'Notiz'}];
  const r=lvFormLesen(f), w=r.werte, v=lvVertrag(lvAktiv(),vid);
  if(r.ok&&!['a_kalt','a_nk','a_hk','a_zuschlag'].some(k=>typeof w[k]==='number')){ r.ok=false; r.fehler.push('Mindestens einen neuen Betrag eintragen'); }
  if(r.ok&&v&&w.a_ab<=v.beginn){ r.ok=false; r.fehler.push('Die Änderung muss nach dem Mietbeginn ('+LVK.datumDE(v.beginn)+') liegen'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const warn=[];
  if(w.a_grund==='staffel'){ const vor=(v.aenderungen||[]).filter(a=>a.grund==='staffel'&&a.ab<w.a_ab).map(a=>a.ab).concat([v.beginn]).sort().pop();
    if(LVK.plusMonate(vor,12)>w.a_ab) warn.push('Bei der Staffelmiete muss die Miete jeweils mindestens ein Jahr unverändert bleiben (§ 557a Abs. 2 BGB).'); }
  if(warn.length&&!confirm(warn.join('\n')+'\nTrotzdem eintragen?')) return;
  await lvAendern(l=>{ const x=lvVertrag(l,vid); const a={id:LVK.neueId('A'),ab:w.a_ab,grund:w.a_grund,notiz:w.a_notiz};
    ['kalt','nk','hk','zuschlag'].forEach(t=>{ if(typeof w['a_'+t]==='number') a[t]=w['a_'+t]; }); x.aenderungen.push(a); },'Mietänderung eingetragen.');
}
async function lvAenderungLoeschen(vid,aid){
  if(!confirm('Diese Mietänderung löschen?')) return;
  await lvAendern(l=>{ const v=lvVertrag(l,vid); v.aenderungen=v.aenderungen.filter(a=>a.id!==aid); },'Mietänderung gelöscht.');
}
async function lvVertragLoeschen(vid){
  const l=lvAktiv(), v=lvVertrag(l,vid); if(!v) return;
  const z=(l.zahlungen||[]).filter(x=>x.vertragId===vid).length;
  if(!confirm('Mietvertrag mit '+lvMieterName(v)+' löschen?'+(z?'\nDabei werden auch '+z+' gebuchte Zahlungen gelöscht.':''))) return;
  await lvAendern(l=>{ l.vertraege=l.vertraege.filter(x=>x.id!==vid); l.zahlungen=l.zahlungen.filter(x=>x.vertragId!==vid); l.mahnungen=l.mahnungen.filter(x=>x.vertragId!==vid); },'Mietvertrag gelöscht.');
}

/* ---------- Reiter „Mietkonto“ ---------- */
function lvMietkontoVertrag(l){
  const st=lvHeute(), vv=l.vertraege||[];
  let v=lvVertrag(l,LV.vertragId);
  if(!v) v=vv.find(x=>LVK.vertragAktiv(x,st))||vv[0]||null;
  LV.vertragId=v?v.id:null;
  return v;
}
function lvMietkontoHtml(l){
  const v=lvMietkontoVertrag(l), st=lvHeute();
  if(!v) return lvBox('Mietkonto','<p>Noch kein Mietvertrag erfasst.</p><div class="mdb-actions"><button class="primary" onclick="lvReiter(\'vertraege\',{typ:\'vertrag\',id:null})">Mietvertrag anlegen</button></div>');
  const op=lvOp(l,v,st), ks=LVK.kuendigungsschwelle(op,v,st), mv=LVK.mahnvorschlag(op), kt=LVK.kaution(v,l.zahlungen,st), m=LVK.mieteAm(v,st);
  const auswahl='<div class="field lv-vertragwahl"><label for="lv_vertragwahl">Mietverhältnis</label><select id="lv_vertragwahl" onchange="LV.vertragId=this.value;lvRender()">'
    +(l.vertraege||[]).map(x=>'<option value="'+lvH(x.id)+'"'+(x.id===v.id?' selected':'')+'>'+lvH(lvEinheitName(lvEinheit(l,x.einheitId))+' · '+lvMieterName(x)+' · ab '+LVK.datumDE(x.beginn)+(x.ende?' bis '+LVK.datumDE(x.ende):''))+'</option>').join('')+'</select></div>';
  const warn=[];
  if(ks.erreicht) warn.push('Rückstand '+lvEur(ks.rueckstand)+' bei einer Monatsmiete von '+lvEur(ks.monatsmiete)+': Die Voraussetzungen einer fristlosen Kündigung wegen Zahlungsverzugs (§ 543 Abs. 2 Satz 1 Nr. 3 BGB'+(LVK.istWohnraum(v,l)?', § 569 Abs. 3 BGB':'')+') könnten vorliegen — rechtlich prüfen lassen.');
  kt.warnungen.forEach(t=>warn.push(t));
  const monate=LVK.monatsliste(LVK.monatVon(v.beginn),LVK.monatVon(v.ende&&v.ende<st?v.ende:LVK.plusMonate(st,1))).reverse();
  const zform='<div class="grid four lv-form">'
    +lvFeld({id:'z_datum',label:'Eingang am',typ:'datum',wert:st})
    +lvFeld({id:'z_betrag',label:'Betrag (€)',typ:'betrag',wert:LVK.r2(m.gesamt),hinweis:'negativ = Rücklastschrift'})
    +lvFeld({id:'z_art',label:'Art',typ:'wahl',wert:'miete',optionen:Object.entries(LV_ZAHLART)})
    +lvFeld({id:'z_monat',label:'Für Monat',typ:'wahl',wert:'',optionen:[['','automatisch (älteste Schuld zuerst)']].concat(monate.map(x=>[x,x.slice(5)+'/'+x.slice(0,4)]))})
    +lvFeld({id:'z_text',label:'Verwendungszweck / Notiz',breit:true})
    +'</div><div id="lv_formfehler" class="lv-warn" hidden></div><div class="mdb-actions"><button class="primary" onclick="lvZahlungBuchen(\''+lvQ(v.id)+'\')" data-ic="check">Zahlung buchen</button></div>';
  const sform='<details class="lv-details"><summary>Forderung oder Gutschrift eintragen (z. B. Nebenkosten-Nachzahlung, Schadensersatz)</summary><div class="grid four lv-form">'
    +lvFeld({id:'s_datum',label:'Fällig am',typ:'datum',wert:st})+lvFeld({id:'s_betrag',label:'Betrag (€)',typ:'betrag',hinweis:'negativ = Gutschrift an den Mieter'})
    +lvFeld({id:'s_art',label:'Art',typ:'wahl',wert:'nk_nachzahlung',optionen:[['nk_nachzahlung','Nebenkosten-Nachzahlung'],['sonstig','Sonstiges']]})+lvFeld({id:'s_text',label:'Text'})
    +'</div><div class="mdb-actions"><button class="secondary" onclick="lvSonderpostenBuchen(\''+lvQ(v.id)+'\')" data-ic="plus">Eintragen</button></div></details>';
  const opZeilen=op.posten.slice().reverse().map(p=>{ const s=LV_STATUS[p.status]||[p.status,''];
    return '<tr><td>'+lvH(p.art==='miete'?'Miete '+p.monat.slice(5)+'/'+p.monat.slice(0,4)+(p.anteilig?' (anteilig)':''):p.text||LV_ZAHLART[p.art]||p.art)+'</td>'
      +'<td>'+lvH(LVK.datumDE(p.faellig))+'</td><td class="r">'+lvEur(p.betrag)+'</td><td class="r">'+lvEur(p.bezahlt)+'</td><td class="r strong">'+(p.offen>0?lvEur(p.offen):'–')+'</td>'
      +'<td>'+lvBadge(s[0],s[1])+(p.verzugTage?' <span class="lv-klein">'+p.verzugTage+' Tage</span>':'')+'</td><td class="r">'+(p.zinsen>0?lvEur(p.zinsen):'–')+'</td>'
      +'<td>'+(p.id.startsWith('X')?'<button class="secondary" onclick="lvSonderpostenLoeschen(\''+lvQ(v.id)+'\',\''+lvQ(p.id.slice(1))+'\')" aria-label="Forderung löschen" data-ic="trash"></button>':'')+'</td></tr>'; });
  const zZeilen=(l.zahlungen||[]).filter(z=>z.vertragId===v.id).sort((a,b)=>a.datum<b.datum?1:-1).map(z=>'<tr><td>'+lvH(LVK.datumDE(z.datum))+'</td><td class="r'+(z.betrag<0?' lv-neg':'')+'">'+lvEur(z.betrag)+'</td>'
    +'<td>'+lvH(LV_ZAHLART[z.art]||z.art)+'</td><td>'+lvH(z.monat?z.monat.slice(5)+'/'+z.monat.slice(0,4):'')+'</td><td>'+lvH(z.text)+'</td>'
    +'<td><button class="secondary" onclick="lvZahlungLoeschen(\''+lvQ(z.id)+'\')" aria-label="Zahlung löschen" data-ic="trash"></button></td></tr>');
  const mZeilen=(l.mahnungen||[]).filter(x=>x.vertragId===v.id).sort((a,b)=>a.datum<b.datum?1:-1).map(x=>'<tr><td>'+lvH(LVK.datumDE(x.datum))+'</td><td>'+lvH((LVK.MAHNSTUFEN.find(s=>s.stufe===x.stufe)||{}).name||'')+'</td><td class="r">'+lvEur(x.betrag)+'</td></tr>');
  const tab=LVK.TEILE.filter(t=>m[t]).map(t=>LVK.TEIL_NAMEN[t]+' '+lvEur(m[t])).join(' · ')+(m.ust?' · zzgl. '+m.ust+' % USt':'');
  return auswahl
    +'<div class="kpis">'+lvKpi('Rückstand',lvEur(op.summe.rueckstand),op.summe.rueckstand>0?'älteste Schuld seit '+mv.tage+' Tagen':'Konto ausgeglichen',op.summe.rueckstand>0?'lv-kpi-bad':'')
    +lvKpi('Guthaben',lvEur(op.summe.guthaben),op.summe.vorausOffen?'noch nicht fällig: '+lvEur(op.summe.vorausOffen):'')
    +lvKpi('Verzugszinsen',lvEur(op.summe.zinsen),(lvAufschlag(v,l)===5?'Basiszins + 5 Pp. (§ 288 Abs. 1 BGB)':'Basiszins + 9 Pp. (§ 288 Abs. 2 BGB)'))
    +lvKpi('Kaution',lvEur(kt.ist)+' von '+lvEur(kt.soll),LV_KAUTION[kt.art]||'',kt.faelligOffen>0?'lv-kpi-warn':'')+'</div>'
    +(warn.length?'<div class="lv-warn">'+warn.map(lvH).join('<br>')+'</div>':'')
    +lvBox('Aktuelle Miete: '+lvEur(m.gesamt)+' / Monat','<p class="hint">'+lvH(tab)+' · fällig am 3. Werktag (§ 556b BGB)</p>'
      +'<h3 class="sep">Zahlung erfassen</h3>'+zform+sform)
    +lvBox('Offene Posten',lvTabelle(['Posten','Fällig',{t:'Soll',r:1},{t:'Bezahlt',r:1},{t:'Offen',r:1},'Status',{t:'Zinsen',r:1},''],opZeilen,'Noch keine Sollstellung.')
      +'<div class="mdb-actions"><button class="secondary" onclick="lvMietkontoExcel()" data-ic="download">Mietkonto (Excel)</button>'
      +(op.summe.rueckstand>0?'<button class="secondary" onclick="lvMahnungWord('+(mv.stufe||1)+')" data-ic="file-text">'+lvH(mv.stufe?mv.name:'Zahlungserinnerung')+' (Word)</button>':'')+'</div>'
      +(op.summe.rueckstand>0?'<p class="hint">Das Schreiben wird mit den offenen Posten und der Bankverbindung der Liegenschaft erstellt und im Mahnverlauf vermerkt. Bitte vor dem Versand prüfen.</p>':''))
    +lvBox('Zahlungseingänge',lvTabelle(['Datum',{t:'Betrag',r:1},'Art','Für Monat','Text',''],zZeilen,'Noch keine Zahlungen gebucht.'))
    +(mZeilen.length?lvBox('Mahnverlauf',lvTabelle(['Datum','Stufe',{t:'Betrag',r:1}],mZeilen)):'');
}
async function lvZahlungBuchen(vid){
  const f=[{id:'z_datum',label:'Eingang am',typ:'datum',pflicht:true},{id:'z_betrag',label:'Betrag',typ:'betrag',pflicht:true},{id:'z_art',label:'Art',typ:'wahl'},{id:'z_monat',label:'Für Monat',typ:'wahl'},{id:'z_text',label:'Text'}];
  const r=lvFormLesen(f), w=r.werte;
  if(r.ok&&w.z_betrag===0){ r.ok=false; r.fehler.push('Betrag: 0 € kann nicht gebucht werden'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  if(w.z_datum>lvHeute()&&!confirm('Das Eingangsdatum liegt in der Zukunft. Trotzdem buchen?')) return;
  await lvAendern(l=>{ l.zahlungen.push({id:LVK.neueId('Z'),datum:w.z_datum,betrag:LVK.r2(w.z_betrag),vertragId:vid,art:w.z_art,monat:w.z_monat||'',text:w.z_text}); },
    'Zahlung über '+lvEur(w.z_betrag)+' gebucht.');
}
async function lvZahlungLoeschen(zid){
  if(!confirm('Diese Zahlung löschen? Das Mietkonto wird neu gerechnet.')) return;
  await lvAendern(l=>{ l.zahlungen=l.zahlungen.filter(z=>z.id!==zid); },'Zahlung gelöscht.');
}
async function lvSonderpostenBuchen(vid){
  const f=[{id:'s_datum',label:'Fällig am',typ:'datum',pflicht:true},{id:'s_betrag',label:'Betrag',typ:'betrag',pflicht:true},{id:'s_art',label:'Art',typ:'wahl'},{id:'s_text',label:'Text',pflicht:true}];
  const r=lvFormLesen(f), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  await lvAendern(l=>{ const v=lvVertrag(l,vid); v.sonderposten.push({id:LVK.neueId('S'),datum:w.s_datum,betrag:LVK.r2(w.s_betrag),text:w.s_text,art:w.s_art}); },
    (w.s_betrag<0?'Gutschrift':'Forderung')+' eingetragen.');
}
async function lvSonderpostenLoeschen(vid,sid){
  if(!confirm('Diesen Posten löschen?')) return;
  await lvAendern(l=>{ const v=lvVertrag(l,vid); v.sonderposten=v.sonderposten.filter(s=>s.id!==sid); },'Posten gelöscht.');
}

/* ---------- Exporte ---------- */
function lvDateiname(t){ return String(t||'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Verwaltung'; }
function lvHerunterladen(bytes,mime,name){ if(typeof iaHerunterladen==='function') iaHerunterladen(new Blob([bytes],{type:mime}),name); }
const LV_XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', LV_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function lvMieterlisteExcel(){
  const l=lvAktiv(); if(!l) return; const st=lvHeute();
  const kopf=['Einheit','Lage','Art','Fläche m²','Mieter','Telefon','E-Mail','Personen','Beginn','Ende','Mietart','Kalt','BK-VZ','HK-VZ','Zuschläge','USt %','Gesamt','Kaution Soll','Kaution Ist','Rückstand'].map(t=>({v:t,s:'fett'}));
  const zeilen=[[{v:'Mieterliste '+l.name,s:'titel'}],[lvAdresse(l)+' · Stand '+LVK.datumDE(st)],[],kopf];
  (l.einheiten||[]).forEach(e=>{
    const vv=LVK.vertraegeDerEinheit(l,e.id);
    if(!vv.length) zeilen.push([e.nr,e.lage,LV_ART_E[e.art],e.flaeche!=null?{v:e.flaeche,s:'dez'}:'',e.eigennutzung?'Eigennutzung':'leer']);
    vv.forEach(v=>{ const m=LVK.mieteAm(v,v.ende&&v.ende<st?v.ende:st), kt=LVK.kaution(v,l.zahlungen,st), op=lvOp(l,v,st);
      zeilen.push([e.nr,e.lage,LV_ART_E[e.art],e.flaeche!=null?{v:e.flaeche,s:'dez'}:'',lvMieterName(v),(v.mieter[0]||{}).telefon||'',(v.mieter[0]||{}).email||'',v.personen!=null?v.personen:'',
        LVK.datumDE(v.beginn),v.ende?LVK.datumDE(v.ende):'',LV_MIETART[v.mietart],{v:m.kalt,s:'eurc'},{v:m.nk,s:'eurc'},{v:m.hk,s:'eurc'},{v:m.zuschlag,s:'eurc'},m.ust||0,{v:LVK.r2(m.gesamt),s:'eurc'},
        {v:kt.soll,s:'eurc'},{v:kt.ist,s:'eurc'},{v:op.summe.rueckstand,s:'eurc'}]); });
  });
  const x=ImmoOffice.xlsx([{name:'Mieterliste',spalten:[10,16,12,10,24,16,24,9,11,11,16,11,11,11,11,7,12,12,12,12],zeilen}],{titel:'Mieterliste '+l.name});
  lvHerunterladen(x,LV_XLSX,'Mieterliste '+lvDateiname(l.name)+'.xlsx');
}
function lvMietkontoExcel(){
  const l=lvAktiv(), v=l&&lvVertrag(l,LV.vertragId); if(!v) return; const st=lvHeute(), op=lvOp(l,v,st), e=lvEinheit(l,v.einheitId);
  const zeilen=[[{v:'Mietkonto '+lvMieterName(v),s:'titel'}],[l.name+' · Einheit '+lvEinheitName(e)+' · Stand '+LVK.datumDE(st)],[],
    ['Posten','Fällig','Soll','Bezahlt','Offen','Status','Verzugstage','Zinsen'].map(t=>({v:t,s:'fett'}))];
  op.posten.forEach(p=>zeilen.push([p.art==='miete'?'Miete '+p.monat:p.text||p.art,LVK.datumDE(p.faellig),{v:p.betrag,s:'eurc'},{v:p.bezahlt,s:'eurc'},{v:p.offen,s:'eurc'},(LV_STATUS[p.status]||[p.status])[0],p.verzugTage||'',{v:p.zinsen,s:'eurc'}]));
  zeilen.push([],[{v:'Rückstand',s:'fett'},'',{v:op.summe.soll,s:'eurc'},'',{v:op.summe.rueckstand,s:'fetteurc'},'','',{v:op.summe.zinsen,s:'eurc'}],['Guthaben','','','',{v:op.summe.guthaben,s:'eurc'}]);
  const zz=[['Datum','Betrag','Art','Für Monat','Text'].map(t=>({v:t,s:'fett'}))].concat((l.zahlungen||[]).filter(z=>z.vertragId===v.id).sort((a,b)=>a.datum<b.datum?-1:1)
    .map(z=>[LVK.datumDE(z.datum),{v:z.betrag,s:'eurc'},LV_ZAHLART[z.art]||z.art,z.monat||'',z.text||'']));
  const x=ImmoOffice.xlsx([{name:'Mietkonto',spalten:[26,12,13,13,13,18,12,11],zeilen},{name:'Zahlungen',spalten:[12,13,22,11,40],zeilen:zz}],{titel:'Mietkonto '+lvMieterName(v)});
  lvHerunterladen(x,LV_XLSX,'Mietkonto '+lvDateiname(lvMieterName(v)+' '+(e?e.nr:''))+'.xlsx');
}
async function lvMahnungWord(stufe){
  const l=lvAktiv(), v=l&&lvVertrag(l,LV.vertragId); if(!v) return;
  const st=lvHeute(), op=lvOp(l,v,st), e=lvEinheit(l,v.einheitId), s=LVK.MAHNSTUFEN.find(x=>x.stufe===stufe)||LVK.MAHNSTUFEN[0];
  if(!(op.summe.rueckstand>0)){ alert('Auf diesem Mietkonto ist nichts offen.'); return; }
  const frist=LVK.isoTag(LVK.tagNr(st)+(stufe===1?10:7)), ab=LV.einst||{};
  const offen=op.posten.filter(p=>p.faelligJa&&p.offen>0);
  const b=[];
  if(ab.name||ab.anschrift) b.push({typ:'p',runs:[{text:[ab.name,ab.anschrift].filter(Boolean).join(' · '),}]});
  b.push({typ:'p',text:lvMieterName(v)+'\n'+(l.strasse||'')+(e&&e.lage?', '+e.lage:'')+'\n'+[l.plz,l.ort].filter(Boolean).join(' ')});
  b.push({typ:'p',text:(ab.ort||l.ort||'')+(ab.ort||l.ort?', ':'')+LVK.datumDE(st)});
  b.push({typ:'h2',text:s.name+' — Mietverhältnis '+(l.strasse||l.name)+(e?', '+lvEinheitName(e):'')});
  b.push({typ:'p',text:'Sehr geehrte Damen und Herren,'});
  b.push({typ:'p',text:stufe===1?'sicher haben Sie es nur übersehen: Auf Ihrem Mietkonto sind die folgenden Beträge noch offen.'
    :stufe===2?'leider sind die folgenden Beträge trotz Fälligkeit weiterhin offen. Wir bitten Sie dringend um Ausgleich.'
    :'trotz unserer bisherigen Schreiben sind die folgenden Beträge weiterhin offen. Dies ist unsere letzte Mahnung.'});
  b.push({typ:'tabelle',zeilen:[[{text:'Posten'},{text:'fällig am'},{text:'offen',rechts:true}]].concat(offen.map(p=>[{text:p.art==='miete'?'Miete '+p.monat.slice(5)+'/'+p.monat.slice(0,4):p.text||LV_ZAHLART[p.art]||p.art},{text:LVK.datumDE(p.faellig)},{text:lvEur(p.offen),rechts:true}]),
    [Object.assign([{text:'Summe'},{text:''},{text:lvEur(op.summe.rueckstand),rechts:true}],{fett:true})])});
  b.push({typ:'p',text:'Bitte überweisen Sie den Betrag von '+lvEur(op.summe.rueckstand)+' bis zum '+LVK.datumDE(frist)+(l.iban?' auf das Konto'+(l.kontoInhaber?' von '+l.kontoInhaber:'')+', IBAN '+LVK.ibanLesbar(l.iban)+(l.bank?' ('+l.bank+')':''):'')+'. Sollten Sie inzwischen gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.'});
  if(stufe>=2) b.push({typ:'p',text:'Auf die Verzugszinsen nach § 288 BGB weisen wir hin; ihre Geltendmachung behalten wir uns vor.'});
  if(stufe===3) b.push({typ:'p',text:'Sollte der Betrag nicht fristgerecht eingehen, behalten wir uns weitere rechtliche Schritte vor, einschließlich der Kündigung des Mietverhältnisses.'});
  b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  const x=ImmoOffice.docx(b,{titel:s.name+' '+lvMieterName(v)});
  lvHerunterladen(x,LV_DOCX,lvDateiname(s.name+' '+lvMieterName(v)+' '+st)+'.docx');
  await lvAendern(l=>{ l.mahnungen.push({id:LVK.neueId('M'),vertragId:v.id,datum:st,stufe:s.stufe,betrag:op.summe.rueckstand}); },s.name+' erstellt und im Mahnverlauf vermerkt.');
}

/* ---------- Absender (Einstellungen) ---------- */
function lvEinstFelder(){ const e=LV.einst||{}; return [{id:'e_name',label:'Name der Verwaltung / Absender',wert:e.name,platzhalter:'z. B. Volksbank … Immobilien'},
  {id:'e_anschrift',label:'Anschrift',wert:e.anschrift},{id:'e_ort',label:'Ort für Schreiben',wert:e.ort},{id:'e_telefon',label:'Telefon',typ:'tel',wert:e.telefon},{id:'e_email',label:'E-Mail',typ:'email',wert:e.email}]; }
function lvEinstellungenHtml(){
  return lvBox('Absender für Schreiben und Abrechnungen','<p class="hint">Erscheint auf Zahlungserinnerungen, Mahnungen und Abrechnungen. Die Bankverbindung wird je Liegenschaft unter „Stammdaten“ hinterlegt.</p>'
    +lvFelder(lvEinstFelder())+'<div id="lv_formfehler" class="lv-warn" hidden></div><div class="mdb-actions"><button class="primary" onclick="lvEinstSpeichern()" data-ic="check">Speichern</button></div>');
}
async function lvEinstSpeichern(){
  const r=lvFormLesen(lvEinstFelder()), w=r.werte;
  const e=LVK.einstellungenBereinigen({name:w.e_name,anschrift:w.e_anschrift,ort:w.e_ort,telefon:w.e_telefon,email:w.e_email});
  try{ await lvMetaSetzen('einstellungen',e); }catch(x){ alert('Nicht gespeichert ('+lvFehlerText(x)+').'); return; }
  LV.einst=e; lvMeldung('Absender gespeichert.'); lvRender();
}

/* ---------- Datensicherung ---------- */
function lvSicherungHtml(){
  const n=LV.liste.length, E=LV.liste.reduce((s,l)=>s+(l.einheiten||[]).length,0), V=LV.liste.reduce((s,l)=>s+(l.vertraege||[]).length,0), Z=LV.liste.reduce((s,l)=>s+(l.zahlungen||[]).length,0);
  return lvBox('Datensicherung der Liegenschaftsverwaltung',
    '<p>'+n+' Liegenschaften · '+E+' Einheiten · '+V+' Mietverträge · '+Z+' Zahlungen'+(LV.rueckfall?' · ohne Datenbank (Browserspeicher)':'')+'</p>'
    +'<p class="hint" id="lv_letzte_sicherung"></p>'
    +'<p class="hint">Die Daten liegen nur in diesem Browser auf diesem Gerät. Die Sicherungsdatei enthält alle Liegenschaften mit Mieter- und Zahlungsdaten — sie ist <b>nicht verschlüsselt</b> und gehört an einen geschützten Ort (z. B. das Laufwerk der Bank), nicht in private Cloud-Ordner. Beim Einspielen wird die Datei vollständig geprüft; vorhandene Einträge werden nur durch neuere Fassungen ersetzt.</p>'
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
  const datei={typ:'immoapp-verwaltung',version:1,erstellt:new Date().toISOString(),liegenschaften:LV.liste,einstellungen:LV.einst||{},dienstleister:LV.dienstleister||[],anhaenge};
  const b=new Blob([JSON.stringify(datei)],{type:'application/json'}), name='ImmoApp Verwaltung '+lvHeute()+'.json';
  if(teilen&&typeof iaTeilen==='function'){ if(await iaTeilen(b,name,'Sicherung Liegenschaftsverwaltung')==='abgebrochen') return; }
  else if(typeof iaHerunterladen==='function') iaHerunterladen(b,name);
  try{ await lvMetaSetzen('lastBackup',{ts:Date.now(),n:LV.liste.length}); }catch(e){}
  lvMeldung('Sicherung „'+name+'“ erstellt.'); lvRender(); lvStartHinweis();
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
  if(sp.einstellungen&&!(LV.einst&&LV.einst.name)){ try{ await lvMetaSetzen('einstellungen',sp.einstellungen); LV.einst=sp.einstellungen; }catch(e){} }
  const dl=lvDlBereinigen(sp.dienstleister), dlNeu=dl.filter(d=>!(LV.dienstleister||[]).some(x=>x.id===d.id));
  if(dlNeu.length){ try{ const alle=(LV.dienstleister||[]).concat(dlNeu); await lvMetaSetzen('dienstleister',alle); LV.dienstleister=alle; }catch(e){} }
  lvMeldung('Sicherung eingespielt: '+n.neu+' neu, '+n.ersetzt+' ersetzt, '+n.gleich+' unverändert.'); lvRender(); lvStartHinweis();
  return true;
}

/* ---------- Startseite ---------- */
function lvStartHinweis(){
  const el=document.getElementById('start_lv'); if(!el) return;
  if(!LV.bereit||!LV.liste.length){ el.hidden=true; return; }
  const st=lvHeute(), f=lvAlleFristen(st,14), faellig=f.filter(x=>x.faellig).length;
  if(!f.length){ el.hidden=true; return; }
  el.querySelector('span:last-child').textContent='Liegenschaften: '+(faellig?faellig+' fällig':'')+(faellig&&f.length>faellig?', ':'')+(f.length>faellig?(f.length-faellig)+' in den nächsten 14 Tagen':'');
  el.hidden=false;
}
/* Eingaben in der Verwaltung lösen keine Neuberechnung der Bewertung aus; Escape schließt Formular bzw. Ansicht */
(function(){
  const einrichten=()=>{
    const o=document.getElementById('lv_overlay');
    if(o) ['input','change'].forEach(ev=>o.addEventListener(ev,e=>e.stopPropagation()));
    const body=document.getElementById('lv_body');
    if(body) new MutationObserver(()=>{ if(document.getElementById('lv_letzte_sicherung')) lvLetzteSicherungZeigen(); }).observe(body,{childList:true});
    lvStart().catch(()=>{});
  };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const x=document.getElementById('lv_overlay'); if(x&&x.classList.contains('on')){ if(LV.form) lvFormZu(); else lvSchliessen(); } } });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
