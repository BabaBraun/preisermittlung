/* ImmoApp — Jahresbewertung der Liegenschaften (eigener Bereich in der Liegenschaftsverwaltung)
   Übersicht: Objekte × Stichtage mit Ergebnis und Veränderung; Vordruck je Objekt und Stichtag mit allen Angaben des
   Excel-Vordrucks der Bank, jede Zahl änderbar, Rechnung sofort (js/jahresbewertung.js). Gespeichert wird der Vordruck
   bei der Liegenschaft im Bewertungsverlauf (l.bewertungen[].vordruck) — damit gilt dieselbe Datensicherung. */
'use strict';

const JBK=ImmoJahresbewertung;
var JB_EDIT=null;   // {lId, bId, v, status, quelle, notiz}

function jbZ(x,st){ if(x==null||!isFinite(x)) return '–'; x=+x; if(Math.abs(x)<0.5*Math.pow(10,-(st||0))) x=0; return x.toLocaleString('de-DE',{minimumFractionDigits:st||0,maximumFractionDigits:st||0}); }
function jbE(x,st){ return x==null||!isFinite(x)?'–':jbZ(x,st==null?2:st)+' €'; }
function jbW(x){ return x==null?'':String(x).replace('.',','); }
function jbObjekte(){ return LV.liste.filter(l=>(l.bewertungen||[]).some(b=>b.vordruck)||['bank','eigen'].includes(l.eigentuemerArt)).sort((a,b)=>a.name.localeCompare(b.name,'de')); }
function jbLetzter(l){ return (l.bewertungen||[]).filter(b=>b.vordruck).sort((a,b)=>a.stichtag<b.stichtag?-1:a.stichtag>b.stichtag?1:0).pop()||null; }

/* ---------- Übersicht ---------- */
function jbAnsichtHtml(){
  const f=LV.form||{};
  if(f.typ==='vordruck'&&JB_EDIT) return jbEditorHtml();
  const obj=jbObjekte();
  let kopf='';
  if(f.typ==='jb_fort') kopf=lvFormRahmen('Auf einen neuen Stichtag fortschreiben',lvFelder(jbFortFelder(f.lId),'two'),'jbFortschreiben()',null,
    '<p class="hint">Je Objekt entsteht aus dem letzten Vordruck ein Entwurf: neuer Stichtag, amtlicher Baupreisindex Baden-Württemberg je Gebäudeart (Stand '
    +lvH(ImmoBaupreisindex.monatText(ImmoBaupreisindex.STAND))+'), angepasste Restnutzungsdauer um die vergangenen Jahre verringert. Bodenrichtwerte, Mieten und Zinssätze bleiben stehen — im Vordruck prüfen.</p>','Entwürfe anlegen');
  if(f.typ==='jb_neu') kopf=jbNeuHtml(f.lId);
  const offen=f.typ==='jb_neu'||f.typ==='jb_fort';
  const knoepfe=offen?'':'<div class="mdb-actions">'+(obj.some(jbLetzter)?'<button class="primary" onclick="jbFormAuf(\'jb_fort\')" data-ic="calendar">Alle fortschreiben</button>':'')
    +'<button class="'+(obj.length?'secondary':'primary')+'" onclick="jbFormAuf(\'jb_neu\')" data-ic="plus">Vordruck anlegen</button>'
    +(obj.length?'<button class="secondary" onclick="jbExcel()" data-ic="download">Übersicht als Excel</button>':'')
    +'<button class="secondary" onclick="lvSicherungEinspielen()" data-ic="folder-open">Sicherung einspielen</button></div>';
  if(!obj.length) return kopf+lvBox('Jahresbewertung',
    '<p>Hier stehen die jährlichen Preiseinschätzungen der Liegenschaften der Bank (und eigener Objekte) nebeneinander — je Objekt und Stichtag ein Vordruck mit allen Angaben wie im Excel-Vordruck: Boden, Gebäude mit NHK, Baupreisindex, Restnutzungsdauer, Mieten, PV-Anlage. Jede Zahl lässt sich ändern, das Ergebnis rechnet sofort neu.</p>'
    +'<p class="hint"><b>Vorhandene Bewertungen übernehmen:</b> „Sicherung einspielen“ und die Datei mit den Vordrucken wählen (z. B. „ImmoApp Jahresbewertung – Liegenschaften der Bank.json“) — die Liegenschaften erscheinen dann hier und in der Übersicht. '
    +'<b>Neu beginnen:</b> „Vordruck anlegen“, Vorlage wählen und die Liegenschaft gleich dort anlegen.</p>'+knoepfe);
  const stichtage=[...new Set(obj.flatMap(l=>(l.bewertungen||[]).map(b=>b.stichtag)))].sort();
  const summen={}, anzahl={};
  const zeilen=obj.map(l=>{
    const v=LVBW.verlauf(l), proSt={};
    v.forEach(b=>{ const da=proSt[b.stichtag]; if(!da||(!da.vordruck&&b.vordruck)) proSt[b.stichtag]=b; });
    const zellen=stichtage.map(st=>{ const b=proSt[st]; if(!b) return '<td class="r jb-leer">–</td>';
      if(b.ergebnis>0){ summen[st]=(summen[st]||0)+b.ergebnis; anzahl[st]=(anzahl[st]||0)+1; }
      const klick=b.vordruck?'jbOeffnen(\''+lvQ(l.id)+'\',\''+lvQ(b.id)+'\')':'lvLiegenschaftOeffnen(\''+lvQ(l.id)+'\',\'bewertungen\')';
      const name=l.name+', '+LVK.datumDE(st)+': '+(b.ergebnis!=null?lvEur0(b.ergebnis):'ohne Ergebnis')+(b.status==='entwurf'?' (Entwurf)':'')+(b.vordruck?' — Vordruck öffnen':' — ohne Vordruck, im Reiter Bewertungen bearbeiten');
      return '<td class="r"><button class="jb-zelle'+(b.status==='entwurf'?' jb-entwurf':'')+'" onclick="'+klick+'" aria-label="'+lvH(name)+'">'
        +'<b>'+lvH(b.ergebnis!=null?lvEur0(b.ergebnis):'–')+'</b>'
        +(b.diffPct!=null?'<span class="lv-klein">'+lvH(lvBewProzent(b.diffPct))+'</span>':'')
        +(b.status==='entwurf'?'<span class="lv-klein">Entwurf</span>':'')+(b.vordruck?'':'<span class="lv-klein">ohne Vordruck</span>')+'</button></td>'; });
    const letzter=jbLetzter(l);
    return '<tr><td class="strong">'+lvH(l.name)+'<br><span class="lv-klein">'+lvH(lvAdresse(l))+'</span></td>'+zellen.join('')
      +'<td class="lv-aktionen">'+(letzter?'<button class="secondary" onclick="jbFormAuf(\'jb_fort\',\''+lvQ(l.id)+'\')">Fortschreiben</button>':'')
      +'<button class="secondary" onclick="jbFormAuf(\'jb_neu\',\''+lvQ(l.id)+'\')" data-ic="plus" aria-label="Vordruck anlegen für '+lvH(l.name)+'"></button></td></tr>';
  });
  zeilen.push('<tr class="lv-summe"><td class="strong">Summe</td>'+stichtage.map(st=>'<td class="r strong">'+(summen[st]?lvEur0(summen[st])+(anzahl[st]<obj.length?'<br><span class="lv-klein">'+anzahl[st]+' von '+obj.length+' Objekten</span>':''):'–')+'</td>').join('')+'<td></td></tr>');
  return kopf+lvBox('Jahresbewertung der Liegenschaften',lvTabelle(['Objekt'].concat(stichtage.map(st=>({t:LVK.datumDE(st),r:1})),['']),zeilen)
    +knoepfe+'<p class="hint">Ergebnis = Mittel aus Substanz- und Ertragsansatz nach dem Vordruck der Bank (ohne Gebäude: Bodenwert und Zu-/Abschläge); Veränderung gegenüber der vorigen abgeschlossenen Bewertung. '
    +'Ein Tipp auf einen Wert öffnet den Vordruck — alle Angaben sind änderbar. Die Werte stehen auch im Reiter „Bewertungen“ der Liegenschaft. Rechnerische Preiseinschätzung, kein Verkehrswertgutachten.</p>');
}
function jbFortFelder(lId){
  const finale=jbObjekte().flatMap(l=>(l.bewertungen||[]).filter(b=>b.vordruck).map(b=>b.stichtag)).sort();
  const st=LVBW.stichtagVorschlag(finale.pop(),lvHeute());
  return [{id:'jf_objekt',label:'Objekte',typ:'wahl',wert:lId||'',optionen:[['','alle Objekte mit Vordruck']].concat(jbObjekte().filter(jbLetzter).map(l=>[l.id,l.name]))},
    {id:'jf_stichtag',label:'Neuer Stichtag',typ:'datum',wert:st,pflicht:true},
    {id:'jf_rnd',label:'Angepasste Restnutzungsdauer um die vergangenen Jahre verringern',typ:'check',wert:true,breit:true}];
}
async function jbFortschreiben(){
  const r=lvFormLesen(jbFortFelder()); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte, ziele=jbObjekte().filter(l=>jbLetzter(l)&&(!w.jf_objekt||l.id===w.jf_objekt));
  LV.form=null; let neu=0, schon=[];
  for(const l of ziele){
    if((l.bewertungen||[]).some(b=>b.vordruck&&b.stichtag===w.jf_stichtag)){ schon.push(l.name); continue; }
    const q=jbLetzter(l); if(q.stichtag>=w.jf_stichtag){ schon.push(l.name); continue; }
    const ok=await lvAendern(x=>{ const qq=(x.bewertungen||[]).find(b=>b.id===q.id); jbNeueFassung(x,qq,w.jf_stichtag,w.jf_rnd); },'',l.id);
    if(ok) neu++;
  }
  lvMeldung(neu+' Entwurf'+(neu===1?'':'e')+' zum '+LVK.datumDE(w.jf_stichtag)+' angelegt.'+(schon.length?' Übersprungen (Vordruck zu diesem oder späterem Stichtag vorhanden): '+schon.join(', ')+'.':'')
    +(neu?' Bitte Bodenrichtwerte, Mieten und Restnutzungsdauer in den Vordrucken prüfen.':''));
  lvRender();
}
/* Neue Fassung aus einem Vordruck (für Übersicht und Reiter „Bewertungen“); x = zu ändernde Liegenschaft */
function jbNeueFassung(x,quelle,stichtag,rnd){
  const f=JBK.fortschreiben(quelle.vordruck,stichtag,{rnd:rnd!==false});
  const b={id:LVK.neueId('BW'),art:quelle.art||'preiseinschaetzung',status:'entwurf',quelle:'Fortschreibung des Vordrucks zum '+LVK.datumDE(quelle.stichtag),
    notiz:'Zu prüfen:\n– '+f.hinweise.join('\n– '),vordruck:f.vordruck};
  LVBW.ausVordruck(b); x.bewertungen=(x.bewertungen||[]).concat([b]); return b;
}
function jbFormAuf(typ,lId){ LV.form={typ,lId:lId||null}; lvMeldung(''); lvRender(); jbNachOben(); }
const JB_NEU_L='__neu';
const JB_ART_AUS_VORLAGE={bank:'gewerbe',bank_lager:'gewerbe',wgh:'gemischt',grundstueck:'sonstig',leer:'gewerbe'};
function jbNeuFelder(lId){
  const liste=LV.liste.slice().sort((a,b)=>a.name.localeCompare(b.name,'de'));
  const vor=lId||(jbObjekte()[0]||{}).id||JB_NEU_L;
  return [{id:'jn_objekt',label:'Liegenschaft',typ:'wahl',wert:vor,optionen:[[JB_NEU_L,'＋ Neue Liegenschaft anlegen']].concat(liste.map(l=>[l.id,l.name])),breit:true},
    {id:'jn_stichtag',label:'Wertermittlungsstichtag',typ:'datum',wert:lvHeute().slice(0,4)+'-12-31',pflicht:true}];
}
const JB_NEU_L_FELDER=[{id:'jn_name',label:'Bezeichnung der Liegenschaft',pflicht:true,platzhalter:'z. B. Filiale Musterstadt'},{id:'jn_strasse',label:'Straße und Hausnummer'},
  {id:'jn_plz',label:'PLZ'},{id:'jn_ort',label:'Ort'}];
function jbStandardVorlage(l){ return !l?'bank':l.art==='gemischt'?'wgh':l.art==='sonstig'?'grundstueck':'bank'; }
function jbVorlagenHtml(lId,gewaehlt){
  const l=LV.liste.find(x=>x.id===lId), q=l&&jbLetzter(l);
  const wahl=[].concat(q?[['kopie','Kopie des letzten Vordrucks','Vordruck zum '+LVK.datumDE(q.stichtag)+' mit allen Angaben, Baupreisindex zum neuen Stichtag']]:[],
    Object.entries(JBK.VORLAGEN).map(([k,x])=>[k,x.name,x.text]));
  if(!wahl.some(w=>w[0]===gewaehlt)) gewaehlt=q?'kopie':jbStandardVorlage(l);
  return wahl.map(([k,t,h])=>'<label class="jb-vorlage'+(k===gewaehlt?' on':'')+'"><input type="radio" name="jn_vorlage" value="'+k+'"'+(k===gewaehlt?' checked':'')
    +' onchange="jbVorlageWahl()"> <span><b>'+lvH(t)+'</b><span class="lv-klein">'+lvH(h)+'</span></span></label>').join('');
}
function jbNeuHtml(lId){
  const felder=jbNeuFelder(lId), vor=felder[0].wert;
  return lvFormRahmen('Vordruck anlegen',lvFelder(felder,'two')
    +'<div id="jb_neu_l"'+(vor===JB_NEU_L?'':' hidden')+'>'+lvFelder(JB_NEU_L_FELDER,'four')+'<p class="hint">Die Liegenschaft wird als „Objekt der Bank“ mit dem Vordruck gespeichert; Einheiten, Mieter und weitere Angaben lassen sich später in der Übersicht ergänzen.</p></div>'
    +'<fieldset class="jb-vorlagen"><legend>Vordruck</legend><div id="jb_vorlagen">'+jbVorlagenHtml(vor===JB_NEU_L?null:vor,null)+'</div></fieldset>',
    'jbNeuAnlegen()',null,'<p class="hint">Die Vorlagen sind wie die Excel-Vordrucke der Bank aufgebaut (NHK 2010, amtlicher Baupreisindex Baden-Württemberg zum Stichtag, Bewirtschaftung 20 %, Liegenschaftszins 4 %); Flächen, Baujahr, Bodenrichtwert und Mieten im Vordruck eintragen. Gespeichert wird erst mit „Speichern“ im Vordruck.</p>','Vordruck öffnen');
}
function jbVorlageWahl(){ document.querySelectorAll('#jb_vorlagen .jb-vorlage').forEach(x=>x.classList.toggle('on',!!x.querySelector('input:checked'))); }
function jbNeuWahl(){
  const sel=document.getElementById('lvf_jn_objekt'); if(!sel) return;
  const neu=sel.value===JB_NEU_L, box=document.getElementById('jb_neu_l'), vl=document.getElementById('jb_vorlagen');
  if(box) box.hidden=!neu;
  const alt=(document.querySelector('input[name="jn_vorlage"]:checked')||{}).value;
  if(vl) vl.innerHTML=jbVorlagenHtml(neu?null:sel.value,neu&&alt==='kopie'?null:alt);
}
function jbNeuAnlegen(){
  const r=lvFormLesen(jbNeuFelder()); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte, vorlage=(document.querySelector('input[name="jn_vorlage"]:checked')||{}).value||'bank';
  let l=null, neuL=null;
  if(w.jn_objekt===JB_NEU_L){
    const nm=document.getElementById('lvf_jn_name');
    if(nm&&!nm.value.trim()){ const t=['strasse','ort'].map(k=>((document.getElementById('lvf_jn_'+k)||{}).value||'').trim()).filter(Boolean).join(', '); if(t) nm.value=t; }
    const rl=lvFormLesen(JB_NEU_L_FELDER); if(!rl.ok){ lvFehlerZeigen(rl.fehler); return; }
    neuL={name:rl.werte.jn_name,strasse:rl.werte.jn_strasse||'',plz:rl.werte.jn_plz||'',ort:rl.werte.jn_ort||'',art:JB_ART_AUS_VORLAGE[vorlage]||'gewerbe'};
  } else {
    l=LV.liste.find(x=>x.id===w.jn_objekt); if(!l){ lvFehlerZeigen(['Bitte eine Liegenschaft wählen.']); return; }
  }
  if(neuL) neuL.id=LVK.neueId('L');   // schon jetzt, damit Bilder der Kartenausschnitte zugeordnet werden können
  const q=l&&jbLetzter(l), kopie=vorlage==='kopie'&&q;
  const v=kopie?JBK.fortschreiben(q.vordruck,w.jn_stichtag,{rnd:false}).vordruck:JBK.vorlage(vorlage,w.jn_stichtag);
  if(!kopie) jbVorgabenUebernehmen(v,l||neuL);
  JB_EDIT={lId:l?l.id:null,neuL,bId:null,v,status:'entwurf',quelle:kopie?'Kopie des Vordrucks zum '+LVK.datumDE(q.stichtag):'',notiz:''};
  LV.form={typ:'vordruck'}; lvMeldung(''); lvRender(); jbNachOben();
}
/* Neuer Vordruck aus Vorlage: Objektanschrift aus der Liegenschaft; Auftraggeber, Erläuterungstexte, 3.1 und Ort wie im
   zuletzt bearbeiteten Vordruck (so bleiben die Texte der eingespielten Vordrucke der Bank erhalten) */
function jbVorgabenUebernehmen(v,l){
  if(l){ if(!v.objekt) v.objekt=l.name;
    const adr=[l.strasse,[l.plz,l.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '); if(adr) v.deckblatt.anschrift=adr; }
  const alle=LV.liste.flatMap(x=>(x.bewertungen||[]).filter(b=>b.vordruck).map(b=>({b,g:x.geaendert||0}))).sort((a,c)=>c.g-a.g||(c.b.stichtag>a.b.stichtag?1:-1));
  const q=alle.length?alle[0].b.vordruck:null; if(!q) return;
  ['auftraggeber','auftraggeberAnschrift','auftragsinhalt','verwendungszweck'].forEach(k=>{ if(q.deckblatt&&q.deckblatt[k]) v.deckblatt[k]=q.deckblatt[k]; });
  if(q.texte) JBK.TEXT_ARTEN.forEach(k=>{ if(q.texte[k]) v.texte[k]=q.texte[k]; });
  if(q.bautechnik&&q.bautechnik.schaeden&&v.gebaeude.length) v.bautechnik.schaeden=q.bautechnik.schaeden;
  if(q.ort) v.ort=q.ort;
}
function jbOeffnen(lId,bId){
  const l=LV.liste.find(x=>x.id===lId), b=l&&(l.bewertungen||[]).find(x=>x.id===bId); if(!b||!b.vordruck) return;
  JB_EDIT={lId,bId,v:JBK.bereinigen(JSON.parse(JSON.stringify(b.vordruck))),status:b.status,quelle:b.quelle||'',notiz:b.notiz||'',alteBilder:(b.vordruck.bilder||{karte:[]}).karte.slice()};
  if(!JB_EDIT.v.deckblatt.anschrift) JB_EDIT.v.deckblatt.anschrift=[l.strasse,[l.plz,l.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  LV.aktivId=null; LV.ansicht='jahresbewertung'; LV.form={typ:'vordruck'}; lvMeldung(''); lvRender(); jbNachOben();
}
function jbNachOben(){ const o=document.getElementById('lv_overlay'); if(o) o.scrollTop=0; }

/* ---------- Vordruck: Editor in js/jahresbewertung-editor.js, Dokument in js/jahresbewertung-dok.js ---------- */
async function jbSpeichern(){
  const E=JB_EDIT; if(!E) return;
  const fehler=[]; if(!LVK.datumGueltig(E.v.stichtag||'')) fehler.push('Wertermittlungsstichtag fehlt');
  if(document.querySelector('#jb_editor .lv-fehler')) fehler.push('Ungültige Zahl in einem rot markierten Feld');
  if(fehler.length){ lvFehlerZeigen(fehler); return; }
  const vordruck=JBK.bereinigen(E.v), r=JBK.rechnen(vordruck);
  const meldung='Vordruck zum '+LVK.datumDE(vordruck.stichtag)+' gespeichert: Ergebnis '+lvEur0(r.ergebnis)+'.';
  if(E.neuL){
    const b={id:LVK.neueId('BW'),art:'preiseinschaetzung',status:E.status||'entwurf',quelle:E.quelle||'',notiz:E.notiz||'',vordruck}; LVBW.ausVordruck(b);
    const l=Object.assign({eigentuemerArt:'bank',eigentuemerName:'',kundeId:null,projektId:null,notiz:'',einheiten:[],vertraege:[],zahlungen:[],mahnungen:[],einstellungen:{},bewertungen:[b]},E.neuL);
    if(!l.id) l.id=LVK.neueId('L');
    try{ await lvSpeichern(l); }catch(e){ alert('Die Liegenschaft konnte nicht gespeichert werden ('+lvFehlerText(e)+'). Der Vordruck bleibt offen.'); return; }
    JB_EDIT=null; LV.form=null; lvMeldung('Liegenschaft „'+l.name+'“ angelegt. '+meldung); lvRender(); lvStartHinweis(); return;
  }
  JB_EDIT=null; LV.form=null;
  const ok=await lvAendern(x=>{ x.bewertungen=x.bewertungen||[];
    let b=E.bId?x.bewertungen.find(y=>y.id===E.bId):null;
    if(!b){ b={id:LVK.neueId('BW'),art:'preiseinschaetzung'}; x.bewertungen.push(b); }
    Object.assign(b,{status:E.status||'final',quelle:E.quelle||'',notiz:E.notiz||'',vordruck}); LVBW.ausVordruck(b); },
    meldung,E.lId);
  if(ok) await jbBilderAufraeumen(LV.liste.find(x=>x.id===E.lId),(E.alteBilder||[]).filter(id=>!vordruck.bilder.karte.includes(id)));
  else if(E.neueBilder) await jbBilderAufraeumen(LV.liste.find(x=>x.id===E.lId),E.neueBilder);
}
async function jbAbbrechen(){
  const E=JB_EDIT; JB_EDIT=null; LV.form=null; lvRender();
  if(E&&E.neueBilder&&E.neueBilder.length) await jbBilderAufraeumen(LV.liste.find(x=>x.id===E.lId),E.neueBilder);   // nicht gespeicherte Bilder
}
async function jbLoeschen(){
  const E=JB_EDIT; if(!E||!E.bId||!confirm('Vordruck zum '+LVK.datumDE(E.v.stichtag)+' löschen?')) return;
  JB_EDIT=null; LV.form=null;
  if(await lvAendern(x=>{ x.bewertungen=(x.bewertungen||[]).filter(b=>b.id!==E.bId); },'Vordruck gelöscht.',E.lId))
    await jbBilderAufraeumen(LV.liste.find(x=>x.id===E.lId),(E.alteBilder||[]).concat(E.neueBilder||[]));
}

/* ---------- Excel ---------- */
function jbExcel(){
  const obj=jbObjekte(), stichtage=[...new Set(obj.flatMap(l=>(l.bewertungen||[]).map(b=>b.stichtag)))].sort();
  const kopf=['Objekt','Anschrift'].concat(stichtage.map(st=>LVK.datumDE(st))).map(t=>({v:t,s:'fett'}));
  const z1=[[{v:'Jahresbewertung der Liegenschaften',s:'titel'}],['Stand '+LVK.datumDE(lvHeute())+' · Ergebnis je Stichtag (Mittel aus Substanz- und Ertragsansatz); E = Entwurf'],[],kopf];
  const summe=stichtage.map(()=>0);
  obj.forEach(l=>{ const v=LVBW.verlauf(l);
    z1.push([l.name,lvAdresse(l)].concat(stichtage.map((st,i)=>{ const b=v.filter(x=>x.stichtag===st).sort((a,c)=>!!c.vordruck-!!a.vordruck)[0];
      if(!b||b.ergebnis==null) return ''; summe[i]+=b.ergebnis; return b.status==='entwurf'?{v:Math.round(b.ergebnis)+' E',s:'normal'}:{v:LVK.r2(b.ergebnis),s:'eurc'}; }))); });
  z1.push([{v:'Summe',s:'fett'},''].concat(summe.map(s=>({v:LVK.r2(s),s:'fetteurc'}))));
  const z2=[[{v:'Einzelwerte',s:'titel'}],[],['Objekt','Stichtag','Stand','Bodenwert','Substanz','Ertrag','Ergebnis','Veränderung %','Baupreisindex','Quelle','Notiz'].map(t=>({v:t,s:'fett'}))];
  obj.forEach(l=>LVBW.verlauf(l).forEach(b=>z2.push([l.name,LVK.datumDE(b.stichtag),b.status==='entwurf'?'Entwurf':'abgeschlossen',
    b.boden!=null?{v:b.boden,s:'eurc'}:'',b.substanz!=null?{v:b.substanz,s:'eurc'}:'',b.ertrag!=null?{v:b.ertrag,s:'eurc'}:'',b.ergebnis!=null?{v:b.ergebnis,s:'eurc'}:'',
    b.diffPct!=null?{v:b.diffPct,s:'dez'}:'',b.bpi?(String(b.bpi).replace('.',',')+(b.bpiText?' ('+b.bpiText+')':'')):'',b.quelle||'',{v:b.notiz||'',s:'text'}])));
  const x=ImmoOffice.xlsx([{name:'Übersicht',spalten:[40,36].concat(stichtage.map(()=>16)),zeilen:z1},{name:'Einzelwerte',spalten:[36,11,13,14,14,14,14,12,30,40,60],zeilen:z2}],{titel:'Jahresbewertung der Liegenschaften'});
  lvHerunterladen(x,LV_XLSX,'Jahresbewertung Liegenschaften '+lvHeute()+'.xlsx');
}

lvAnsichtRegistrieren('jahresbewertung','Jahresbewertung',()=>jbAnsichtHtml(),'fristen');
