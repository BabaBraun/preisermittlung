/* ImmoApp — Jahresbewertung der Liegenschaften (eigener Bereich in der Liegenschaftsverwaltung)
   Übersicht: Objekte × Stichtage mit Ergebnis und Veränderung; Vordruck je Objekt und Stichtag mit allen Angaben des
   Excel-Vordrucks der Bank, jede Zahl änderbar, Rechnung sofort (js/jahresbewertung.js). Gespeichert wird der Vordruck
   bei der Liegenschaft im Bewertungsverlauf (l.bewertungen[].vordruck) — damit gilt dieselbe Datensicherung. */
'use strict';

const JBK=ImmoJahresbewertung;
var JB_EDIT=null;   // {lId, bId, v, status, quelle, notiz}

function jbZ(x,st){ return x==null||!isFinite(x)?'–':(+x).toLocaleString('de-DE',{minimumFractionDigits:st||0,maximumFractionDigits:st||0}); }
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
  const q=l&&jbLetzter(l), kopie=vorlage==='kopie'&&q;
  const v=kopie?JBK.fortschreiben(q.vordruck,w.jn_stichtag,{rnd:false}).vordruck:JBK.vorlage(vorlage,w.jn_stichtag);
  if(!v.objekt) v.objekt=(l||neuL).name;
  JB_EDIT={lId:l?l.id:null,neuL,bId:null,v,status:'entwurf',quelle:kopie?'Kopie des Vordrucks zum '+LVK.datumDE(q.stichtag):'',notiz:''};
  LV.form={typ:'vordruck'}; lvMeldung(''); lvRender(); jbNachOben();
}
function jbOeffnen(lId,bId){
  const l=LV.liste.find(x=>x.id===lId), b=l&&(l.bewertungen||[]).find(x=>x.id===bId); if(!b||!b.vordruck) return;
  JB_EDIT={lId,bId,v:JSON.parse(JSON.stringify(b.vordruck)),status:b.status,quelle:b.quelle||'',notiz:b.notiz||''};
  LV.aktivId=null; LV.ansicht='jahresbewertung'; LV.form={typ:'vordruck'}; lvMeldung(''); lvRender(); jbNachOben();
}
function jbNachOben(){ const o=document.getElementById('lv_overlay'); if(o) o.scrollTop=0; }

/* ---------- Vordruck ---------- */
function jbIn(pfad,wert,art,breite){
  art=art||'zahl';
  return '<input data-jb="'+pfad+'" data-art="'+art+'" type="'+(art==='datum'?'date':'text')+'"'+(art==='zahl'?' inputmode="decimal"':'')+(breite?' style="width:'+breite+'"':'')
    +' value="'+lvH(art==='zahl'?jbW(wert):(wert==null?'':wert))+'" aria-label="'+lvH(pfad)+'">';
}
function jbFeld(label,inner,full){ return '<div class="field'+(full?' full':'')+'"><label>'+lvH(label)+'</label>'+inner+'</div>'; }
function jbOut(k,cls){ return '<span data-jbo="'+k+'"'+(cls?' class="'+cls+'"':'')+'></span>'; }
function jbTab(kopf,zeilen){ return '<div class="mdb-scroll"><table class="mdb-tbl lv-tbl jb-tbl"><thead><tr>'+kopf.map(k=>'<th'+(k.r?' class="r"':'')+'>'+lvH(k.t||k)+'</th>').join('')+'</tr></thead><tbody>'
  +zeilen.map(z=>'<tr>'+z.map((c,i)=>'<td'+(kopf[i]&&kopf[i].r?' class="r"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'; }
function jbEntf(liste,i,text){ return '<button class="secondary jb-x" onclick="jbEntfernen(\''+liste+'\','+i+')" aria-label="'+lvH(text||'Zeile entfernen')+'" data-ic="trash"></button>'; }
function jbPlus(liste,text){ return '<button class="secondary" onclick="jbHinzu(\''+liste+'\')" data-ic="plus">'+lvH(text)+'</button>'; }
function jbEditorHtml(){
  const E=JB_EDIT, v=E.v, l=LV.liste.find(x=>x.id===E.lId), mehrere=v.gebaeude.length>1;
  let h='<div class="mdb-box lv-formbox jb-editor" id="jb_editor"><h3>'+lvH((E.bId?'Vordruck · ':'Neuer Vordruck · ')+(l?l.name:E.neuL?E.neuL.name+' (neue Liegenschaft)':''))+'</h3><div id="lv_formfehler" class="lv-warn" hidden></div>';
  h+='<div class="jb-erg">'+[['Bodenwert','boden'],['Substanz','substanz'],['Ertrag','ertrag'],['Ergebnis','ergebnis']].map(([t,k])=>'<div><span>'+t+'</span><b data-jbo="'+k+'"></b></div>').join('')+'</div>';
  h+='<div class="grid three lv-form">'+jbFeld('Wertermittlungsstichtag',jbIn('stichtag',v.stichtag,'datum'))
    +jbFeld('Stand','<select data-jb="@status" data-art="text">'+LVBW.STATUS.map(([k,t])=>'<option value="'+k+'"'+(E.status===k?' selected':'')+'>'+t+'</option>').join('')+'</select>')
    +jbFeld('Gewichtung Substanz %',jbIn('gewichtung',v.gewichtung))
    +jbFeld('Objekt / Beschreibung',jbIn('objekt',v.objekt,'text'),true)+jbFeld('Quelle / Datei',jbIn('@quelle',E.quelle,'text'),true)+'</div>';
  // 1 Boden
  h+='<h3 class="sep">Grund und Boden</h3>'+jbTab(['Bezeichnung',{t:'Fläche m²',r:1},{t:'Bodenrichtwert €/m²',r:1},{t:'Abschlag %',r:1},{t:'Wert',r:1},''],
    v.boden.map((b,i)=>[jbIn('boden.'+i+'.text',b.text,'text'),jbIn('boden.'+i+'.flaeche',b.flaeche,'zahl','7em'),jbIn('boden.'+i+'.brw',b.brw,'zahl','6em'),jbIn('boden.'+i+'.abschlag',b.abschlag,'zahl','4em'),jbOut('boden.'+i),jbEntf('boden',i)]))
    +'<div class="mdb-actions">'+(v.boden.length<JBK.MAX.boden?jbPlus('boden','Grundstücksanteil'):'')+'</div>';
  // 2 Gebäude
  const arten=Object.keys(ImmoBaupreisindex.ARTEN);
  v.gebaeude.forEach((g,i)=>{
    const p='gebaeude.'+i+'.';
    h+='<h3 class="sep">Gebäude '+(i+1)+': '+lvH(g.text||'')+'</h3><div class="grid three lv-form">'
      +jbFeld('Bezeichnung',jbIn(p+'text',g.text,'text'))+jbFeld('Baujahr (ggf. fiktiv)',jbIn(p+'baujahr',g.baujahr))+jbFeld('BGF m²',jbIn(p+'bgf',g.bgf))
      +jbFeld('Gesamtnutzungsdauer (Jahre)',jbIn(p+'gnd',g.gnd))+jbFeld('Angepasste RND (leer = GND − Alter)',jbIn(p+'rnd',g.rnd))+jbFeld('Abschlag Bauweise %',jbIn(p+'abschlagBauweise',g.abschlagBauweise))
      +jbFeld('Baupreisindex',jbIn(p+'bpi',g.bpi))+jbFeld('Umrechnungsfaktor auf 2010',jbIn(p+'bpiFaktor',g.bpiFaktor))+jbFeld('Index: Art und Quartal',jbIn(p+'bpiText',g.bpiText,'text'))
      +jbFeld('Amtlicher Index BW für','<select data-jb="'+p+'bpiArt" data-art="text">'+arten.map(a=>'<option value="'+a+'"'+(g.bpiArt===a?' selected':'')+'>'+lvH(ImmoBaupreisindex.ARTEN[a].name)+'</option>').join('')+'</select>')
      +jbFeld(' ','<button class="secondary" onclick="jbIndexAmtlich('+i+')">Amtlichen Wert zum Stichtag übernehmen</button>',true)+'</div>';
    const st=[1,2,3,4,5];
    const nhk=[['Kostenkennwerte Zeile 1','',st.map(s=>jbIn(p+'kosten1.'+(s-1),g.kosten1[s-1],'zahl','5em')),'',''],
      ['Zeile 2 (optional, gemittelt)','',st.map(s=>jbIn(p+'kosten2.'+(s-1),g.kosten2[s-1],'zahl','5em')),'',''],
      ['Kostenkennwert (Mittel)','',st.map(s=>jbOut('g.'+i+'.kk.'+(s-1))),'','']]
      .concat(JBK.BAUTEILE.map(([name,wt],r)=>[name,jbZ(wt,2),st.map(s=>jbIn(p+'anteile.'+r+'.'+(s-1),g.anteile[r][s-1],'zahl','3.6em')),jbOut('g.'+i+'.b.'+r+'.summe'),jbOut('g.'+i+'.b.'+r+'.kosten')]));
    h+='<p class="hint">Anteil je Standardstufe (Summe je Bauteil 1; 0 = Bauteil nicht vorhanden).</p>'
      +jbTab(['Bauteil',{t:'Wägung',r:1},{t:'Stufe 1',r:1},{t:'2',r:1},{t:'3',r:1},{t:'4',r:1},{t:'5',r:1},{t:'Summe',r:1},{t:'€/m²',r:1}],nhk.map(z=>[lvH(z[0]),z[1]].concat(z[2],[z[3],z[4]])))
      +jbTab(['Rechnung',{t:'Wert',r:1}],[['Alter (Stichtagsjahr − Baujahr)',jbOut('g.'+i+'.alter')],['Restnutzungsdauer rechnerisch / verwendet',jbOut('g.'+i+'.rnd')],
        ['Alterswertminderung (gerundet)',jbOut('g.'+i+'.wm')],['NHK 2010 / bereinigt (gerundet)',jbOut('g.'+i+'.nhk')],['Baupreisindex auf 2010 (gerundet)',jbOut('g.'+i+'.index')],
        ['NHK zum Stichtag',jbOut('g.'+i+'.heute')],['Gebäudepreis €/m² BGF (gerundet)',jbOut('g.'+i+'.preis','strong')],['Gebäudewert (BGF × Preis)',jbOut('g.'+i+'.wert','strong')]])
      +'<div class="mdb-actions">'+jbEntf('gebaeude',i,'Gebäude entfernen').replace('></button>','>Gebäude entfernen</button>')+'</div>';
  });
  h+='<div class="mdb-actions">'+(v.gebaeude.length<JBK.MAX.gebaeude?jbPlus('gebaeude',v.gebaeude.length?'Weiteres Gebäude (z. B. Lager)':'Gebäude hinzufügen'):'')+'</div>';
  // 3 Pauschal, objektspezifisch, PV
  h+='<h3 class="sep">Pauschalansätze und objektspezifische Merkmale</h3>'
    +jbTab(['Pauschalansatz (z. B. Außenanlagen, Stellplätze)',{t:'Betrag €',r:1},''],v.pauschal.map((p,i)=>[jbIn('pauschal.'+i+'.text',p.text,'text'),jbIn('pauschal.'+i+'.betrag',p.betrag,'zahl','8em'),jbEntf('pauschal',i)]))
    +'<div class="mdb-actions">'+jbPlus('pauschal','Pauschalansatz')+'</div>'
    +jbTab(['Objektspezifisches Merkmal (+ / −)',{t:'Betrag €',r:1},''],v.objektspezifisch.map((p,i)=>[jbIn('objektspezifisch.'+i+'.text',p.text,'text'),jbIn('objektspezifisch.'+i+'.betrag',p.betrag,'zahl','8em'),jbEntf('objektspezifisch',i)]))
    +'<div class="mdb-actions">'+jbPlus('objektspezifisch','Merkmal')+'</div>';
  h+='<h3 class="sep">PV-Anlage</h3><label class="lv-check"><input type="checkbox" '+(v.pv?'checked ':'')+'onchange="jbPv(this.checked)"> <span>PV-Anlage bewerten (Barwert der Vergütung bis Ende EEG, in Substanz und Ertrag)</span></label>';
  if(v.pv) h+='<div class="grid three lv-form">'+jbFeld('Nennleistung kWp',jbIn('pv.kwp',v.pv.kwp))+jbFeld('Stromertrag kWh/Jahr',jbIn('pv.kwh',v.pv.kwh))+jbFeld('Vergütung €/kWh',jbIn('pv.eurKwh',v.pv.eurKwh))
    +jbFeld('Bewirtschaftung %',jbIn('pv.bwk',v.pv.bwk))+jbFeld('Zinssatz %',jbIn('pv.lz',v.pv.lz))+jbFeld('Inbetriebnahme',jbIn('pv.inbetrieb',v.pv.inbetrieb,'datum'))
    +jbFeld('EEG-Vergütung bis',jbIn('pv.eegEnde',v.pv.eegEnde,'datum'))+jbFeld('Restlaufzeit / Barwertfaktor',jbOut('pv.rest'))+jbFeld('Barwert',jbOut('pv.wert','strong'))+'</div>';
  // 4 Ertrag
  if(v.gebaeude.length){
    h+='<h3 class="sep">Ertrag</h3>'+jbTab(['Einheit / Fläche','Lage'].concat(mehrere?['Gebäude']:[],[{t:'Fläche m²',r:1},{t:'Miete €/Monat',r:1},{t:'€/m²',r:1},{t:'Abschlag gewerbl. %',r:1},'']),
      v.mieten.map((m,i)=>[jbIn('mieten.'+i+'.text',m.text,'text'),jbIn('mieten.'+i+'.lage',m.lage,'text','5em')].concat(
        mehrere?['<select data-jb="mieten.'+i+'.gebaeude" data-art="zahl">'+v.gebaeude.map((g,k)=>'<option value="'+k+'"'+(m.gebaeude===k?' selected':'')+'>'+lvH(g.text||'Gebäude '+(k+1))+'</option>').join('')+'</select>']:[],
        [jbIn('mieten.'+i+'.flaeche',m.flaeche,'zahl','5.5em'),jbIn('mieten.'+i+'.monat',m.monat,'zahl','6.5em'),jbOut('m.'+i),jbIn('mieten.'+i+'.abschlag',m.abschlag,'zahl','3.6em'),jbEntf('mieten',i)])))
      +'<div class="mdb-actions">'+jbPlus('mieten','Mietzeile')+'</div>'
      +'<div class="grid three lv-form">'+jbFeld('Bewirtschaftungskosten % der Jahresmiete',jbIn('bwk',v.bwk))+jbFeld('Liegenschaftszins %',jbIn('lz',v.lz))
      +jbFeld('Fester Abschlag gewerbl. Vermietung €/Jahr (leer = aus den Zeilen)',jbIn('abschlagFest',v.abschlagFest))+'</div>'
      +'<div id="jb_teile"></div>';
  } else h+='<p class="hint">Ohne Gebäude: Ergebnis = Bodenwert + Pauschalansätze und objektspezifische Merkmale (z. B. befestigter Parkplatz).</p>';
  h+='<div class="grid lv-form">'+jbFeld('Zustand, Modernisierungen, Eindruck','<textarea data-jb="hinweise" data-art="text" rows="4">'+lvH(v.hinweise||'')+'</textarea>',true)
    +jbFeld('Notiz zur Bewertung','<textarea data-jb="@notiz" data-art="text" rows="3">'+lvH(E.notiz||'')+'</textarea>',true)+'</div>';
  h+='<div id="lv_formfehler_unten" class="lv-warn" hidden></div><div class="mdb-actions"><button class="primary" onclick="jbSpeichern()" data-ic="check">Speichern</button><button class="secondary" onclick="jbAbbrechen()">Abbrechen</button>'
    +(E.bId?'<button class="danger" onclick="jbLoeschen()" data-ic="trash">Vordruck löschen</button>':'')+'</div></div>';
  return h;
}
/* Ausgaben neu berechnen (ohne die Eingaben neu aufzubauen — der Cursor bleibt im Feld) */
function jbAusgaben(){
  const ed=document.getElementById('jb_editor'); if(!ed||!JB_EDIT) return;
  const erg=ed.querySelector('.jb-erg'), kopf=document.querySelector('#lv_overlay .mdb-head'), tabs=document.getElementById('lv_tabs');
  if(erg) erg.style.top=((kopf?kopf.offsetHeight:0)+(tabs?tabs.offsetHeight:0))+'px';   // unter Kopfzeile und Reitern kleben
  const v=JB_EDIT.v, r=JBK.rechnen(v), o={};
  o.boden=jbE(r.boden); o.substanz=r.substanz==null?'–':jbE(r.substanz); o.ertrag=r.ertrag==null?'–':jbE(r.ertrag); o.ergebnis=jbE(r.ergebnis);
  r.bodenZeilen.forEach((x,i)=>{ o['boden.'+i]=jbE(x); });
  r.gebaeude.forEach((g,i)=>{
    g.kostenkennwerte.forEach((k,s)=>{ o['g.'+i+'.kk.'+s]=jbZ(k,2); });
    g.bauteile.forEach((b,k)=>{ o['g.'+i+'.b.'+k+'.summe']=jbZ(b.summeAnteile,2)+(b.summeAnteile!==0&&b.summeAnteile!==1?' ⚠':''); o['g.'+i+'.b.'+k+'.kosten']=jbZ(b.kosten,2); });
    o['g.'+i+'.alter']=jbZ(g.alter)+' Jahre'; o['g.'+i+'.rnd']=jbZ(g.rndRech)+' / '+jbZ(g.rnd)+' Jahre'; o['g.'+i+'.wm']=jbZ(g.wm)+' %';
    o['g.'+i+'.nhk']=jbZ(g.nhk2010,2)+' / '+jbZ(g.nhkBer)+' €/m²'; o['g.'+i+'.index']=jbZ(g.index2010,1); o['g.'+i+'.heute']=jbZ(g.nhkHeute,2)+' €/m²';
    o['g.'+i+'.preis']=jbZ(g.preis)+' €/m²'; o['g.'+i+'.wert']=jbE(g.wert);
  });
  (v.mieten||[]).forEach((m,i)=>{ o['m.'+i]=m.flaeche>0&&m.monat>0?jbZ(m.monat/m.flaeche,2):'–'; });
  if(r.pv){ o['pv.rest']=jbZ(r.pv.rest,2)+' Jahre / '+jbZ(r.pv.vf,2); o['pv.wert']=jbE(r.pv.wert); }
  ed.querySelectorAll('[data-jbo]').forEach(el=>{ const t=o[el.dataset.jbo]; if(t!=null&&el.textContent!==t) el.textContent=t; });
  const teile=document.getElementById('jb_teile');
  if(teile) teile.innerHTML=r.teile.length?jbTab(['Ertragsansatz'+(r.teile.length>1?' je Gebäude':''),{t:'Jahresmiete',r:1},{t:'− Bewirtschaftung',r:1},{t:'− Abschlag',r:1},{t:'− Bodenverzinsung',r:1},{t:'= Gebäudereinertrag',r:1},{t:'Vervielfältiger',r:1},{t:'+ Boden',r:1},{t:'Wert',r:1}],
    r.teile.map(t=>[lvH((v.gebaeude[t.gebaeude]||{}).text||'Gebäude'),jbE(t.roh),jbE(t.bew),jbE(t.abschlag),jbE(t.bodenZins)+'<br><span class="lv-klein">aus '+jbE(t.bodenAnteil,0)+'</span>',jbE(t.gebRein),jbZ(t.vf,2)+'<br><span class="lv-klein">RND '+jbZ(t.rnd)+' J.</span>',jbE(t.bodenAnteil),'<b>'+jbE(t.wert+t.bodenAnteil)+'</b>']))
    +(r.pvWert?'<p class="hint">Zuzüglich PV-Barwert '+jbE(r.pvWert)+'.</p>':''):'';
}
function jbSetzen(obj,pfad,wert){
  const t=pfad.split('.'); let o=obj;
  for(let i=0;i<t.length-1;i++){ const k=/^\d+$/.test(t[i])?+t[i]:t[i]; if(o[k]==null) o[k]=/^\d+$/.test(t[i+1])?[]:{}; o=o[k]; }
  const k=/^\d+$/.test(t[t.length-1])?+t[t.length-1]:t[t.length-1]; o[k]=wert;
}
function jbEingabe(el){
  if(!JB_EDIT||!el.dataset||!el.dataset.jb) return;
  const pfad=el.dataset.jb, art=el.dataset.art;
  let wert=el.value;
  if(art==='zahl'){ const z=LVK.zahlEingabe(el.value); if(Number.isNaN(z)){ el.classList.add('lv-fehler'); return; } el.classList.remove('lv-fehler'); wert=z; }
  if(art==='datum') wert=el.value||null;
  if(pfad[0]==='@') JB_EDIT[pfad.slice(1)]=wert; else jbSetzen(JB_EDIT.v,pfad,wert);
  jbAusgaben();
}
function jbHinzu(liste){
  const v=JB_EDIT.v;
  if(liste==='boden') v.boden.push({text:'Grundstücksanteil '+(v.boden.length+1),flaeche:0,brw:0,abschlag:0});
  if(liste==='gebaeude'){ const vor=v.gebaeude[v.gebaeude.length-1];
    v.gebaeude.push({text:v.gebaeude.length?'Nebengebäude':'Hauptgebäude',baujahr:vor?vor.baujahr:null,bgf:0,gnd:vor?vor.gnd:80,rnd:null,abschlagBauweise:0,bpiArt:vor?vor.bpiArt:'wohnen',
      bpiText:vor?vor.bpiText:'',bpi:vor?vor.bpi:null,bpiFaktor:vor?vor.bpiFaktor:null,kosten1:[0,0,0,0,0],kosten2:[0,0,0,0,0],anteile:JBK.BAUTEILE.map(()=>[0,0,1,0,0])}); }
  if(liste==='pauschal') v.pauschal.push({text:'',betrag:0});
  if(liste==='objektspezifisch') v.objektspezifisch.push({text:'',betrag:0});
  if(liste==='mieten') v.mieten.push({text:'',lage:'',flaeche:null,monat:0,gebaeude:0,abschlag:0});
  lvRender();
}
function jbEntfernen(liste,i){
  const v=JB_EDIT.v;
  if(liste==='gebaeude'&&!confirm('Gebäude „'+(v.gebaeude[i].text||'')+'“ aus dem Vordruck entfernen?')) return;
  v[liste].splice(i,1);
  if(liste==='gebaeude') v.mieten.forEach(m=>{ if(m.gebaeude>=i) m.gebaeude=Math.max(0,m.gebaeude-(m.gebaeude>i?1:0)); });
  lvRender();
}
function jbPv(an){ JB_EDIT.v.pv=an?(JB_EDIT.v.pv||{kwp:null,kwh:null,eurKwh:null,bwk:15,lz:5,inbetrieb:null,eegEnde:null}):null; lvRender(); }
function jbIndexAmtlich(i){
  const g=JB_EDIT.v.gebaeude[i], w=ImmoBaupreisindex.wertFuer(g.bpiArt,JB_EDIT.v.stichtag||lvHeute()); if(!w) return;
  g.bpi=w.wert; g.bpiFaktor=w.faktor; g.bpiText=w.name+' '+ImmoBaupreisindex.monatText(w.monat)+(w.vorlaeufig?' (vorläufig)':''); lvRender();
}
async function jbSpeichern(){
  const E=JB_EDIT; if(!E) return;
  const fehler=[]; if(!LVK.datumGueltig(E.v.stichtag||'')) fehler.push('Wertermittlungsstichtag fehlt');
  if(document.querySelector('#jb_editor .lv-fehler')) fehler.push('Ungültige Zahl in einem rot markierten Feld');
  if(fehler.length){ lvFehlerZeigen(fehler); return; }
  const vordruck=JBK.bereinigen(E.v), r=JBK.rechnen(vordruck);
  const meldung='Vordruck zum '+LVK.datumDE(vordruck.stichtag)+' gespeichert: Ergebnis '+lvEur0(r.ergebnis)+'.';
  if(E.neuL){
    const b={id:LVK.neueId('BW'),art:'preiseinschaetzung',status:E.status||'entwurf',quelle:E.quelle||'',notiz:E.notiz||'',vordruck}; LVBW.ausVordruck(b);
    const l=Object.assign({id:LVK.neueId('L'),eigentuemerArt:'bank',eigentuemerName:'',kundeId:null,projektId:null,notiz:'',einheiten:[],vertraege:[],zahlungen:[],mahnungen:[],einstellungen:{},bewertungen:[b]},E.neuL);
    try{ await lvSpeichern(l); }catch(e){ alert('Die Liegenschaft konnte nicht gespeichert werden ('+lvFehlerText(e)+'). Der Vordruck bleibt offen.'); return; }
    JB_EDIT=null; LV.form=null; lvMeldung('Liegenschaft „'+l.name+'“ angelegt. '+meldung); lvRender(); lvStartHinweis(); return;
  }
  JB_EDIT=null; LV.form=null;
  await lvAendern(x=>{ x.bewertungen=x.bewertungen||[];
    let b=E.bId?x.bewertungen.find(y=>y.id===E.bId):null;
    if(!b){ b={id:LVK.neueId('BW'),art:'preiseinschaetzung'}; x.bewertungen.push(b); }
    Object.assign(b,{status:E.status||'final',quelle:E.quelle||'',notiz:E.notiz||'',vordruck}); LVBW.ausVordruck(b); },
    meldung,E.lId);
}
function jbAbbrechen(){ JB_EDIT=null; LV.form=null; lvRender(); }
async function jbLoeschen(){
  const E=JB_EDIT; if(!E||!E.bId||!confirm('Vordruck zum '+LVK.datumDE(E.v.stichtag)+' löschen?')) return;
  JB_EDIT=null; LV.form=null;
  await lvAendern(x=>{ x.bewertungen=(x.bewertungen||[]).filter(b=>b.id!==E.bId); },'Vordruck gelöscht.',E.lId);
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
(function(){
  const einrichten=()=>{
    const o=document.getElementById('lv_overlay'), body=document.getElementById('lv_body'); if(!o||!body) return;
    ['input','change'].forEach(ev=>o.addEventListener(ev,e=>{ if(e.target&&e.target.closest&&e.target.closest('#jb_editor')) jbEingabe(e.target); }));
    o.addEventListener('change',e=>{ if(e.target&&e.target.id==='lvf_jn_objekt') jbNeuWahl(); });
    new MutationObserver(()=>{ if(document.getElementById('jb_editor')) jbAusgaben(); }).observe(body,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
