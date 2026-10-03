/* ---------- Gemeinsame Daten der Vermarktungs-Kacheln (D40) ----------
   Termine, Vorgänge (Anfragen von Interessenten, Akquise von Eigentümern) und Bieterverfahren liegen in der Datenbank
   „ia_bewertungen“ (Speicher termine, vorgaenge, bieter; Version 5), weil sie Bezüge zu Personen und Notizen enthalten.
   Personen selbst stehen nur in der Kundenakte — die Datensätze merken sich die Kunden-Id. Löscht man einen Kunden, gehen
   seine Anfragen, Akquise-Einträge und Gebote mit, aus Terminen wird er ausgetragen; die Auskunft nach Art. 15 DSGVO aus
   der Kundenakte führt alles auf (Erweiterungspunkte in src/customers.js). Gesicherte Bewertungen werden nur gelesen. */
var WZD={termine:null,vorgaenge:null,bieter:null,abrechnungen:null,unterlagen:null,akten:null,laeuft:null};
const WZD_SPEICHER=['termine','vorgaenge','bieter','abrechnungen','unterlagen','akten'];   // abrechnungen: „Provision“ (D42), unterlagen: „Unterlagen“ (D43)
const WZD_AKTIV=['Auftrag erteilt','In Vermarktung','Reserviert','Notartermin'];
async function wzdLaden(neu){
  if(WZD.laeuft&&!neu) return WZD.laeuft;
  WZD.laeuft=(async()=>{
    try{ await IA_BEREIT_P; }catch(e){}
    for(const s of WZD_SPEICHER){ try{ WZD[s]=IA_DB_BEREIT?await iaAlle(s):[]; }catch(e){ WZD[s]=[]; } }
    return true;
  })();
  return WZD.laeuft;
}
function wzdListe(s){ return WZD[s]||[]; }
function wzdBereit(){ return WZD_SPEICHER.every(s=>Array.isArray(WZD[s])); }
function wzdId(p){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
async function wzdSpeichern(s,o){
  if(!IA_DB_BEREIT){ alert('Dafür braucht die App die Gerätedatenbank, die in diesem Browserfenster nicht zur Verfügung steht (z. B. privates Fenster).'); return false; }
  o.geaendert=Date.now(); if(!o.ts) o.ts=o.geaendert;
  try{ await iaPut(s,JSON.parse(JSON.stringify(o))); speicherFehler('wzd_'+s,''); }
  catch(e){ speicherFehler('wzd_'+s,'Konnte nicht gespeichert werden: '+iaFehlerText(e)+'.'); return false; }
  let l=WZD[s]||(WZD[s]=[]), i=l.findIndex(x=>x.id===o.id); if(i>=0) l[i]=o; else l.push(o);
  return true;
}
async function wzdLoeschen(s,id){
  try{ await iaDel(s,id); }catch(e){ alert('Konnte nicht gelöscht werden: '+iaFehlerText(e)+'.'); return false; }
  WZD[s]=(WZD[s]||[]).filter(x=>x.id!==id); return true;
}
/* ---------- Akten (D49): ein Speicher für Verträge, Prüfungen und Vorgänge der Kacheln ab D49 ----------
   Jeder Eintrag hat id, art (z. B. 'maklervertrag', 'gwg', 'tipp'), meist projektId und kundeId bzw. kundeIds. Personen stehen nur in
   der Kundenakte; Löschen und Auskunft melden die Kacheln selbst an (KD_LOESCH_HOOKS, KD_AUSKUNFT_HOOKS). */
function wzdAkten(art,projektId){ return wzdListe('akten').filter(a=>a.art===art&&(projektId==null||a.projektId===projektId)); }
function wzdAkteNeu(art,felder){ return Object.assign({id:wzdId(art.slice(0,2)),art,ts:Date.now()},felder||{}); }
/* Speichern mit Verzögerung beim Tippen (je Datensatz) */
var WZD_TIMER={};
function wzdSpeichernBald(s,o){ clearTimeout(WZD_TIMER[o.id]); WZD_TIMER[o.id]=setTimeout(()=>{ delete WZD_TIMER[o.id]; wzdSpeichern(s,o); },400); }
function wzdSpeichernSofort(s,o){ clearTimeout(WZD_TIMER[o&&o.id]); return o?wzdSpeichern(s,o):Promise.resolve(false); }

/* ---------- gesicherte Bewertungen als Objekte (nur lesen) ---------- */
function wzdObjekte(alle){
  return (typeof pjLoad==='function'?pjLoad():[]).map(p=>{ let f=(p.data&&p.data.fields)||{};
    return {id:p.id,name:p.name||f.ek_anschrift||'Projekt',anschrift:f.ek_anschrift||'',status:f.vm_status||'',
      preis:zahlLesen(f.vm_preis,true)||zahlLesen(f.ex_preis,true),empf:p.empf||'',kundeId:f.ek_kunde_id||'',f}; })
    .filter(o=>alle||WZD_AKTIV.includes(o.status)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
function wzdObjekt(id){ return id?wzdObjekte(true).find(o=>o.id===id)||null:null; }
function wzdObjektName(id,ersatz){ let o=wzdObjekt(id); return o?o.name:(ersatz||''); }
/* Auswahlliste der Objekte (Objekte in Vermarktung zuerst, dann alle übrigen) */
function wzdObjektOptionen(wahl,leer){
  let aktiv=wzdObjekte(false), rest=wzdObjekte(true).filter(o=>!aktiv.some(a=>a.id===o.id));
  const opt=o=>'<option value="'+sEsc(o.id)+'"'+(o.id===wahl?' selected':'')+'>'+sEsc(o.name)+(o.status?' ('+sEsc(o.status)+')':'')+'</option>';
  return '<option value="">'+sEsc(leer||'– kein Objekt –')+'</option>'+(aktiv.length?'<optgroup label="In Vermarktung">'+aktiv.map(opt).join('')+'</optgroup>':'')
    +(rest.length?'<optgroup label="Weitere gesicherte Bewertungen">'+rest.map(opt).join('')+'</optgroup>':'');
}

/* ---------- Vermarktung je Objekt aus allen Quellen (D48) ----------
   Protokoll der Bewertung (vm_daten, nur gelesen), Anfragen der Kachel „Interessenten“ (mit Exposé-Versand und Absagegrund),
   Besichtigungen im Kalender und Gebote im Bieterverfahren. Doppelt Erfasstes zählt einmal: gleiche Art, gleicher Tag, gleicher
   Kunde (Protokolleinträge mit Kunde aus der Kundenakte). Besichtigungen nach heute gelten als geplant. Ohne Namen — „wer“ ist
   eine Kunden-Id oder ein Schlüssel und wird im Bericht zu „Interessent 1, 2, …“. ab = nur Ereignisse ab diesem Tag zählen. */
function wzdVermarktung(o,ab,heute){
  heute=heute||aufHeute(); let f=(o&&o.f)||{}, ev=[], vm=[];
  try{ vm=(JSON.parse(f.vm_daten||'{}').ev)||[]; }catch(e){}
  const gruppe=a=>/Besichtigung/.test(a||'')?'Besichtigung':a==='Kaufangebot'||a==='Reservierung'||a==='Gebot'?'Angebot':a;
  (Array.isArray(vm)?vm:[]).filter(e=>e&&wzdDatum(e.d)).forEach((e,i)=>ev.push({d:e.d,art:e.art||'Sonstiges',gruppe:gruppe(e.art),kid:e.kid||'',
    wer:e.kid||(e.wer?'vm:'+e.wer:''),rueck:e.rueck||'',preis:+e.preis||0,quelle:'Bewertung'}));
  const dabei=(g,d,kid)=>kid?ev.find(x=>x.gruppe===g&&x.d===d&&x.kid===kid)||null:null;   // doppelt erfasst → vorhandenen Eintrag ergänzen
  if(o&&o.id){
    wzdListe('vorgaenge').filter(v=>v.typ==='anfrage'&&v.projektId===o.id).forEach(v=>{
      let grund=v.abgesagt&&v.grund?v.grund:'', da=wzdDatum(v.datum)?dabei('Anfrage',v.datum,v.kundeId):null;
      if(da){ da.herkunft=da.herkunft||v.quelle||''; da.rueck=da.rueck||grund; }
      else if(wzdDatum(v.datum)) ev.push({d:v.datum,art:'Anfrage',gruppe:'Anfrage',kid:v.kundeId||'',wer:v.kundeId||'vg:'+v.id,herkunft:v.quelle||'',rueck:grund,quelle:'Interessenten'});
      (v.verlauf||[]).forEach(h=>{ if(h&&h.text==='Exposé versendet'&&wzdDatum(h.datum)) ev.push({d:h.datum,art:'Exposé versendet',gruppe:'Exposé',kid:v.kundeId||'',wer:v.kundeId||'vg:'+v.id,quelle:'Interessenten'}); });
    });
    wzdListe('termine').filter(t=>t.projektId===o.id&&t.art==='Besichtigung'&&wzdDatum(t.datum)).forEach(t=>{
      ((t.kundeIds||[]).length?t.kundeIds:['']).forEach(kid=>{ if(!dabei('Besichtigung',t.datum,kid))
        ev.push({d:t.datum,art:'Besichtigung',gruppe:'Besichtigung',kid,wer:kid||'t:'+t.id,geplant:t.datum>heute,quelle:'Kalender'}); }); });
    wzdListe('bieter').filter(b=>b.projektId===o.id).forEach(b=>(b.gebote||[]).filter(g=>g&&wzdDatum(g.datum)&&g.status!=='zurückgezogen').forEach(g=>{
      if(!dabei('Angebot',g.datum,g.kundeId)) ev.push({d:g.datum,art:'Gebot',gruppe:'Angebot',kid:g.kundeId||'',wer:g.kundeId||'g:'+g.id,preis:+g.betrag||0,quelle:'Bieterverfahren'}); }));
  }
  ev.sort((a,b)=>a.d.localeCompare(b.d));
  let nr={}, n=0; ev.forEach(e=>{ if(e.wer&&!nr[e.wer]) nr[e.wer]=++n; e.interessent=e.wer?nr[e.wer]:0; });
  let im=ev.filter(e=>(!ab||e.d>=ab)&&!e.geplant);
  const zahl=(l,g)=>l.filter(e=>e.gruppe===g).length;
  let rueck={}, herkunft={};
  ev.forEach(e=>{ if(e.rueck) rueck[e.rueck]=(rueck[e.rueck]||0)+1; if(e.herkunft) herkunft[e.herkunft]=(herkunft[e.herkunft]||0)+1; });
  let preise=ev.filter(e=>e.gruppe==='Angebot'&&e.preis>0).map(e=>e.preis);
  return {ev,im,geplant:ev.filter(e=>e.geplant),anfragen:zahl(im,'Anfrage'),exposes:zahl(im,'Exposé'),besicht:zahl(im,'Besichtigung'),angebote:zahl(im,'Angebot'),
    gesamt:{anfragen:zahl(ev,'Anfrage'),exposes:zahl(ev,'Exposé'),besicht:zahl(ev.filter(e=>!e.geplant),'Besichtigung'),angebote:zahl(ev,'Angebot')},
    rueck,herkunft,hoechstes:preise.length?Math.max(...preise):0,tage:wzdDatum(f.vm_start)?Math.max(0,ImmoBeratung.tageZwischen(f.vm_start,heute)):0};
}

/* ---------- Kunden ---------- */
/* Gleicher Name wie der Kunde? Für ältere Einträge ohne Kunden-Id (D48). Reihenfolge und Satzzeichen egal („Muster, Erika“ =
   „Erika Muster“); in einem Feld mit mehreren Namen („Erika Muster und Max Probe“) genügt ein Teil. */
function wzdNamenTeile(text){ return String(text||'').split(/\s*(?:[,;&+\/]|\bund\b)\s*/i).map(x=>x.trim()).filter(Boolean); }
function wzdNameSchluessel(text){ return String(text||'').toLowerCase().split(/[^a-zäöüß]+/).filter(t=>t.length>1).sort().join(' '); }
function wzdNameGleich(text,k){
  if(!k||!text) return false;
  let ziele=[wzdNameSchluessel([k.vorname,k.nachname].filter(Boolean).join(' ')),wzdNameSchluessel(k.firma)].filter(Boolean);
  if(!ziele.length) return false;
  let ganz=wzdNameSchluessel(text);
  if(ziele.includes(ganz)) return true;
  return wzdNamenTeile(text).some(t=>ziele.includes(wzdNameSchluessel(t)));
}
function wzdKunde(id){ return id&&typeof KD_CACHE!=='undefined'?KD_CACHE.find(k=>k.id===id)||null:null; }
function wzdKundeName(id){ let k=wzdKunde(id); return k?kdName(k):(id?'(Kunde gelöscht)':''); }
function wzdKundeKontakt(id){ let k=wzdKunde(id); return k?[k.telefon,k.email].filter(Boolean).join(' · '):''; }
/* neuer Kunde aus einer Schnellerfassung; Rechtsgrundlage: Anfrage = Anbahnung (Art. 6 Abs. 1 lit. b DSGVO), mit Einwilligung zur Werbung lit. a */
async function wzdKundeNeu(d){
  d=d||{};
  let k={id:'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),anrede:d.anrede||'',vorname:(d.vorname||'').trim(),nachname:(d.nachname||'').trim(),
    firma:(d.firma||'').trim(),telefon:(d.telefon||'').trim(),email:(d.email||'').trim(),strasse:(d.strasse||'').trim(),plzort:(d.plzort||'').trim(),notiz:'',
    grundlage:d.einwilligung?'einwilligung':'vertrag',einwilligungAm:d.einwilligung?aufHeute():'',loeschpruefung:d.loeschpruefung||'',
    erstellt:Date.now(),kontakte:[],finanzierungen:[]};
  if(!k.vorname&&!k.nachname&&!k.firma){ alert('Bitte mindestens einen Namen eintragen.'); return null; }
  return (await kdSpeichern(k))?k:null;
}
/* Kunde aus der Kundenakte wählen (oder dort neu anlegen); danach bleibt das Werkzeug offen */
function wzdKundeWaehlen(cb){
  if(!kdVerfuegbar()) return;
  kdOeffnen(null,id=>{ if($('wz_overlay').classList.contains('on')) document.body.style.overflow='hidden'; cb(id); });
}
async function wzdNotiz(kundeId,art,text){
  let k=wzdKunde(kundeId); if(!k||!text) return false;
  k.kontakte=(k.kontakte||[]).concat([{id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),ts:Date.now(),datum:aufHeute(),art:art||'Notiz',text}]);
  return kdSpeichern(k);
}
/* Wiedervorlage wie im Wertmonitor (Liste „Wiedervorlagen“, localStorage) */
function wzdWiedervorlage(text,frist,objekt,kundeId){
  let a={id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text,frist:frist||'',objekt:objekt||'',kundeId:kundeId||'',erledigt:false,angelegt:Date.now()};
  if(!aufStore(aufLoad().concat([a]))) return null;
  try{ aufBadge(); aufStartRender(); }catch(e){}
  return a;
}
function wzdDatum(x){ x=String(x||''); return /^\d{4}-\d{2}-\d{2}$/.test(x)&&isFinite(new Date(x+'T00:00:00'))?x:''; }
function wzdZeit(x){ let m=/^(\d{1,2})[:.](\d{2})$/.exec(String(x||'').trim()); return m&&+m[1]<24&&+m[2]<60?String(+m[1]).padStart(2,'0')+':'+m[2]:''; }
/* kleine Kennzahl-Kachel */
function wzdKpi(titel,wert,unter){ return '<div class="kpi"><span>'+titel+'</span><b>'+wert+'</b>'+(unter?'<small>'+unter+'</small>':'')+'</div>'; }

/* ---------- Kundenakte: Löschen, Auskunft, Anzeige ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const v of wzdListe('vorgaenge').filter(v=>v.kundeId===id)) await wzdLoeschen('vorgaenge',v.id);
  for(const t of wzdListe('termine').filter(t=>(t.kundeIds||[]).includes(id))){ t.kundeIds=t.kundeIds.filter(x=>x!==id);
    if(t.nachweis&&t.nachweis.unterschriften) delete t.nachweis.unterschriften[id]; await wzdSpeichern('termine',t); }
  for(const b of wzdListe('bieter').filter(b=>b.gebote.some(g=>g.kundeId===id))){ b.gebote=b.gebote.filter(g=>g.kundeId!==id); await wzdSpeichern('bieter',b); }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  const d=x=>x?new Date(x+'T00:00:00').toLocaleDateString('de-DE'):'–';
  let anf=wzdListe('vorgaenge').filter(v=>v.kundeId===id), ter=wzdListe('termine').filter(t=>(t.kundeIds||[]).includes(id)),
    geb=[]; wzdListe('bieter').forEach(b=>b.gebote.filter(g=>g.kundeId===id).forEach(g=>geb.push({b,g})));
  return ['','ANFRAGEN UND AKQUISE'].concat(anf.length?anf.map(v=>'- '+d(v.datum)+' '+(v.typ==='akquise'?'Akquise':'Anfrage')+': '+(wzdObjektName(v.projektId,v.objekt||'')||'ohne Objekt')
      +' — '+(v.status||'')+(v.quelle?' (Quelle: '+v.quelle+')':'')+((v.verlauf||[]).length?'; Verlauf: '+v.verlauf.map(x=>d(x.datum)+' '+x.text).join('; '):'')):['- keine'],
    ['','TERMINE'],ter.length?ter.map(t=>'- '+d(t.datum)+(t.von?' '+t.von:'')+' '+(t.art||'')+': '+(t.titel||'')+(t.ort?' ('+t.ort+')':'')
      +(t.nachweis&&t.nachweis.unterschriften&&t.nachweis.unterschriften[id]?' — Besichtigungsnachweis unterschrieben':'')):['- keine'],
    ['','GEBOTE IN BIETERVERFAHREN'],geb.length?geb.map(x=>'- '+d(x.g.datum)+' '+(wzdObjektName(x.b.projektId,x.b.objekt)||'Objekt')+': '+eur(x.g.betrag||0)+(x.g.status?' ('+x.g.status+')':'')):['- keine']);
});
KD_AKTE_HOOKS.push(id=>{
  let knoepfe='<div class="gr-zeile"><button class="secondary" onclick="wzdAusAkte(\'anfrage\',\''+idSicher(id)+'\')" data-ic="inbox">Neue Anfrage</button>'
    +'<button class="secondary" onclick="wzdAusAkte(\'akquise\',\''+idSicher(id)+'\')" data-ic="sign">Akquise-Kontakt</button>'
    +'<button class="secondary" onclick="wzdAusAkte(\'termin\',\''+idSicher(id)+'\')" data-ic="calendar">Termin</button></div>';
  if(!wzdBereit()) return '<h3>Anfragen, Akquise und Termine</h3>'+knoepfe;
  let anf=wzdListe('vorgaenge').filter(v=>v.kundeId===id), ter=wzdListe('termine').filter(t=>(t.kundeIds||[]).includes(id)).sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
  if(!anf.length&&!ter.length) return '<h3>Anfragen, Akquise und Termine</h3>'+knoepfe;
  return '<h3>Anfragen, Akquise und Termine</h3>'+knoepfe+'<div class="kd-karten">'
    +anf.map(v=>'<div class="kd-karte"><div><b>'+(v.typ==='akquise'?'Akquise':'Anfrage')+': '+sEsc(wzdObjektName(v.projektId,v.objekt||'')||'ohne Objekt')+'</b><span>'
      +sEsc([wzDatum(v.datum),v.status,v.quelle].filter(Boolean).join(' · '))+'</span></div><div class="kd-k"><button class="secondary" onclick="kdSchliessen();wzVorgangOeffnen(\''+idSicher(v.id)+'\')">Öffnen</button></div></div>').join('')
    +ter.map(t=>'<div class="kd-karte"><div><b>'+sEsc(t.art||'Termin')+': '+sEsc(t.titel||'')+'</b><span>'+sEsc([wzDatum(t.datum),t.von?t.von+' Uhr':'',t.ort].filter(Boolean).join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();kaTerminOeffnen(\''+idSicher(t.id)+'\')">Öffnen</button></div></div>').join('')+'</div>';
});
/* aus der Kundenakte: neue Anfrage, Akquise-Kontakt oder Termin mit diesem Kunden */
async function wzdAusAkte(was,id){
  kdSchliessen(); await wzdLaden();
  if(was==='termin'){ kaTerminMit({art:'Beratungsgespräch',kundeIds:[id]}); return; }
  wzOeffnen(was==='akquise'?'akquise':'interessenten');
  vgNeuEntwurf(was,{person:{modus:'akte',anrede:'',vorname:'',nachname:'',telefon:'',email:'',einwilligung:false,kundeId:id}});
}
/* Vorgang aus der Kundenakte öffnen: in der passenden Kachel */
function wzVorgangOeffnen(id){
  let v=wzdListe('vorgaenge').find(x=>x.id===id); if(!v) return;
  if(v.typ==='akquise'){ wzOeffnen('akquise'); akOeffnen(id); } else { wzOeffnen('interessenten'); inOeffnen(id); }
}
addEventListener('load',()=>{ setTimeout(()=>{ Promise.resolve(window.IA_BEREIT_P).then(()=>wzdLaden()).catch(()=>{}); },300); });
