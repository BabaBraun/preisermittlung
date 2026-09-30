/* ImmoApp — Liegenschaftsverwaltung: Oberfläche „Instandhaltung“ (Vorgänge, Pflichten & Wartung) und „Dienstleister“
   Rechnen und Prüfen: js/verwaltung-ih.js (ImmoInstandhaltung). Fotos zu Vorgängen liegen als Anhänge in der
   Datenbank der Verwaltung und reisen mit der Datensicherung. Abgerechnete Vorgänge und Pflichten mit Kosten
   erscheinen automatisch in den Kosten der Liegenschaft (Reiter „Nebenkosten“). */
'use strict';

const LVI=ImmoInstandhaltung;
LV.ihAnsicht='vorgaenge'; LV.ihFilter='offen';

function lvDl(id){ return (LV.dienstleister||[]).find(d=>d.id===id)||null; }
function lvDlOptionen(){ return [['','– keiner –']].concat((LV.dienstleister||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(d=>[d.id,d.name+(d.gewerk?' ('+d.gewerk+')':'')])); }
function lvStatusName(s){ return (LVI.STATUS.find(x=>x[0]===s)||[,s])[1]; }
function lvUmlageOptionen(){ return [['','–']].concat(ImmoNebenkosten.KATEGORIEN.filter(k=>k.umlage!==false).map(k=>[k.key,k.nr+'. '+k.name])); }

function lvInstandhaltungHtml(l){
  const kopf='<div class="lv-nk-kopf"><div class="lv-segment"><button class="'+(LV.ihAnsicht==='vorgaenge'?'on':'')+'" onclick="LV.ihAnsicht=\'vorgaenge\';LV.form=null;lvRender()">Vorgänge</button>'
    +'<button class="'+(LV.ihAnsicht==='pflichten'?'on':'')+'" onclick="LV.ihAnsicht=\'pflichten\';LV.form=null;lvRender()">Pflichten &amp; Wartung</button></div></div>';
  return kopf+(LV.ihAnsicht==='pflichten'?lvPflichtenHtml(l):lvVorgaengeHtml(l));
}

/* ---------- Vorgänge ---------- */
function lvVorgangFelder(l,v){
  v=v||{};
  return [{id:'g_titel',label:'Kurzbeschreibung',wert:v.titel,pflicht:true,platzhalter:'z. B. Wasserfleck an der Decke im Bad'},
    {id:'g_einheit',label:'Betrifft',typ:'wahl',wert:v.einheitId||'',optionen:[['','Gemeinschaftseigentum / ganzes Haus']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]))},
    {id:'g_prio',label:'Dringlichkeit',typ:'wahl',wert:v.prio||'normal',optionen:LVI.PRIO},
    {id:'g_status',label:'Stand',typ:'wahl',wert:v.status||'gemeldet',optionen:LVI.STATUS},
    {id:'g_gemeldetAm',label:'Gemeldet am',typ:'datum',wert:v.gemeldetAm||lvHeute()},{id:'g_gemeldetVon',label:'Gemeldet von',wert:v.gemeldetVon},
    {id:'g_dienstleister',label:'Dienstleister',typ:'wahl',wert:v.dienstleisterId||'',optionen:lvDlOptionen(),hinweis:(LV.dienstleister||[]).length?'':'Dienstleister unter „Alle“ → „Dienstleister“ anlegen'},
    {id:'g_angebot',label:'Angebot / Kostenrahmen (€)',typ:'betrag',wert:v.angebot,min:0},
    {id:'g_auftragAm',label:'Beauftragt am',typ:'datum',wert:v.auftragAm},{id:'g_terminAm',label:'Termin vor Ort',typ:'datum',wert:v.terminAm},
    {id:'g_erledigtAm',label:'Erledigt am',typ:'datum',wert:v.erledigtAm},
    {id:'g_rechnung',label:'Rechnungsbetrag (€)',typ:'betrag',wert:v.rechnung,min:0},{id:'g_rechnungAm',label:'Rechnungsdatum',typ:'datum',wert:v.rechnungAm},
    {id:'g_rechnungNr',label:'Rechnungsnummer',wert:v.rechnungNr},{id:'g_lohn',label:'davon Arbeitskosten § 35a (€)',typ:'betrag',wert:v.lohn35a,min:0},
    {id:'g_kostenart',label:'Art der Kosten',typ:'wahl',wert:v.kostenart||'instandhaltung',optionen:LVI.KOSTENARTEN},
    {id:'g_umlage',label:'Bei Wartung: umlagen als',typ:'wahl',wert:v.umlageKategorie||'',optionen:lvUmlageOptionen(),hinweis:'nur wenn im Mietvertrag als Betriebskosten vereinbart'},
    {id:'g_beschreibung',label:'Beschreibung',typ:'textarea',wert:v.beschreibung,breit:true,zeilen:3}];
}
function lvVorgaengeHtml(l){
  let form='';
  if(LV.form&&LV.form.typ==='vorgang'){ const v=LV.form.id?(l.vorgaenge||[]).find(x=>x.id===LV.form.id):null; form=lvVorgangFormHtml(l,v); }
  const alle=(l.vorgaenge||[]).slice(), offen=alle.filter(v=>!['erledigt','abgerechnet'].includes(v.status));
  const liste=(LV.ihFilter==='offen'?offen:alle).sort((a,b)=>{ const p={notfall:0,dringend:1,normal:2}; return (p[a.prio]-p[b.prio])||String(b.gemeldetAm).localeCompare(String(a.gemeldetAm)); });
  const zeilen=liste.map(v=>{ const d=lvDl(v.dienstleisterId), e=lvEinheit(l,v.einheitId);
    return '<tr><td>'+lvH(LVK.datumDE(v.gemeldetAm))+'</td><td class="strong">'+lvH(v.titel)+'<br><span class="lv-klein">'+lvH(e?lvEinheitName(e):'Gemeinschaftseigentum')+(v.fotos&&v.fotos.length?' · '+v.fotos.length+' Foto'+(v.fotos.length===1?'':'s'):'')+'</span></td>'
      +'<td>'+(v.prio!=='normal'?lvBadge(v.prio==='notfall'?'Notfall':'dringend','bad'):'')+' '+lvBadge(lvStatusName(v.status),['erledigt','abgerechnet'].includes(v.status)?'ok':'warn')+(v.terminAm&&!['erledigt','abgerechnet'].includes(v.status)?'<br><span class="lv-klein">Termin '+lvH(LVK.datumDE(v.terminAm))+'</span>':'')+'</td>'
      +'<td>'+lvH(d?d.name:'–')+'</td><td class="r">'+(v.rechnung>0?lvEur(v.rechnung):v.angebot>0?'<span class="lv-klein">Angebot</span> '+lvEur(v.angebot):'–')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'vorgang\',id:\''+lvQ(v.id)+'\'};lvRender()">Bearbeiten</button>'
      +(d?'<button class="secondary" onclick="lvAuftragWord(\''+lvQ(v.id)+'\')" data-ic="file-text">Auftrag</button>':'')
      +'<button class="secondary" onclick="lvVorgangLoeschen(\''+lvQ(v.id)+'\')" aria-label="Vorgang löschen" data-ic="trash"></button></td></tr>'; });
  return form+lvBox('Vorgänge ('+offen.length+' offen)',
    '<div class="lv-segment" style="margin-bottom:10px"><button class="'+(LV.ihFilter==='offen'?'on':'')+'" onclick="LV.ihFilter=\'offen\';lvRender()">offen</button><button class="'+(LV.ihFilter==='alle'?'on':'')+'" onclick="LV.ihFilter=\'alle\';lvRender()">alle</button></div>'
    +lvTabelle(['Gemeldet','Vorgang','Stand','Dienstleister',{t:'Kosten',r:1},''],zeilen,LV.ihFilter==='offen'?'Keine offenen Vorgänge.':'Noch keine Vorgänge erfasst.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'vorgang\',id:null};lvRender()" data-ic="plus">Schaden / Auftrag erfassen</button></div>');
}
function lvVorgangFormHtml(l,v){
  let zusatz='';
  if(v){
    const verlauf=(v.verlauf||[]).slice().reverse().map(x=>'<li><b>'+lvH(LVK.datumDE(x.datum))+'</b> '+lvH(x.text)+'</li>').join('');
    zusatz='<h3 class="sep">Fotos</h3><div class="lv-fotos" id="lv_fotos">'+(v.fotos||[]).map(id=>'<figure><img data-anhang="'+lvH(id)+'" alt="Foto zum Vorgang"><button class="secondary" onclick="lvVorgangFotoLoeschen(\''+lvQ(v.id)+'\',\''+lvQ(id)+'\')" aria-label="Foto löschen" data-ic="trash"></button></figure>').join('')+'</div>'
      +'<label class="secondary lv-datei">'+iaSvg('camera')+' Foto aufnehmen oder wählen<input type="file" accept="image/*" capture="environment" multiple onchange="lvVorgangFotos(\''+lvQ(v.id)+'\',this.files);this.value=\'\'"></label>'
      +'<h3 class="sep">Verlauf</h3>'+(verlauf?'<ul class="lv-verlauf">'+verlauf+'</ul>':'<p class="hint">Noch keine Einträge.</p>')
      +'<div class="grid four lv-form">'+lvFeld({id:'g_notiz',label:'Notiz zum Verlauf',breit:true})+'<div class="field"><label>&nbsp;</label><button class="secondary" onclick="lvVorgangNotiz(\''+lvQ(v.id)+'\')" data-ic="plus">Notiz hinzufügen</button></div></div>';
  }
  return lvFormRahmen(v?'Vorgang bearbeiten':'Schaden oder Auftrag erfassen',lvFelder(lvVorgangFelder(l,v),'four'),'lvVorgangSpeichern(\''+lvQ(v?v.id:'')+'\')',null,zusatz);
}
async function lvVorgangSpeichern(id){
  const l=lvAktiv(), r=lvFormLesen(lvVorgangFelder(l)), w=r.werte;
  if(w.g_status==='abgerechnet'&&!(w.g_rechnung>0)){ r.ok=false; r.fehler.push('Für „abgerechnet“ bitte den Rechnungsbetrag eintragen'); }
  if(w.g_lohn>0&&w.g_rechnung>0&&w.g_lohn>w.g_rechnung){ r.ok=false; r.fehler.push('Die Arbeitskosten sind höher als die Rechnung'); }
  if(w.g_kostenart==='wartung'&&w.g_status==='abgerechnet'&&!w.g_umlage&&!confirm('Wartung ohne umlagefähige Kostenart: Die Kosten werden als nicht umlagefähig verbucht. Fortfahren?')) return;
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const heute=lvHeute(), neu=!id, vid=id||LVK.neueId('G');
  await lvAendern(l=>{
    l.vorgaenge=l.vorgaenge||[];
    let v=l.vorgaenge.find(x=>x.id===vid);
    if(!v){ v={id:vid,fotos:[],verlauf:[{datum:heute,text:'erfasst'}]}; l.vorgaenge.push(v); }
    else if(v.status!==w.g_status) v.verlauf.push({datum:heute,text:'Stand: '+lvStatusName(w.g_status)});
    Object.assign(v,{titel:w.g_titel,einheitId:w.g_einheit||null,prio:w.g_prio,status:w.g_status,gemeldetAm:w.g_gemeldetAm,gemeldetVon:w.g_gemeldetVon,
      dienstleisterId:w.g_dienstleister||null,angebot:w.g_angebot,auftragAm:w.g_auftragAm||(w.g_status!=='gemeldet'&&!v.auftragAm?heute:v.auftragAm||null),terminAm:w.g_terminAm,
      erledigtAm:w.g_erledigtAm||(['erledigt','abgerechnet'].includes(w.g_status)?heute:null),rechnung:w.g_rechnung,rechnungAm:w.g_rechnungAm,rechnungNr:w.g_rechnungNr,
      lohn35a:w.g_lohn,kostenart:w.g_kostenart,umlageKategorie:w.g_umlage||null,beschreibung:w.g_beschreibung});
    /* Kosten: abgerechnete Vorgänge erscheinen in den Kosten der Liegenschaft */
    l.kosten=(l.kosten||[]).filter(k=>k.vorgangId!==v.id);
    if(v.status==='abgerechnet'){ const k=LVI.kostenAusVorgang(v); if(k) l.kosten.push(k); }
  },neu?'Vorgang erfasst.':'Vorgang gespeichert.'+(w.g_status==='abgerechnet'?' Die Rechnung steht in den Kosten der Liegenschaft.':''));
  if(neu){ LV.form={typ:'vorgang',id:vid}; lvRender(); }
}
async function lvVorgangNotiz(id){
  const t=(document.getElementById('lvf_g_notiz')||{}).value||''; if(!t.trim()) return;
  await lvAendern(l=>{ const v=l.vorgaenge.find(x=>x.id===id); v.verlauf.push({datum:lvHeute(),text:t.trim()}); },'Notiz hinzugefügt.');
}
async function lvVorgangLoeschen(id){
  const l=lvAktiv(), v=(l.vorgaenge||[]).find(x=>x.id===id); if(!v) return;
  if(!confirm('Vorgang „'+v.titel+'“ mit '+(v.fotos||[]).length+' Fotos löschen?'+(v.status==='abgerechnet'?'\nDie zugehörige Rechnung wird aus den Kosten entfernt.':''))) return;
  const fotos=(v.fotos||[]).slice();
  if(await lvAendern(l=>{ l.vorgaenge=l.vorgaenge.filter(x=>x.id!==id); l.kosten=(l.kosten||[]).filter(k=>k.vorgangId!==id); },'Vorgang gelöscht.')){ try{ await lvAnhaengeLoeschen(fotos); }catch(e){} }
}
function lvVorgangFotos(id,files){
  const l=lvAktiv(); if(!l) return;
  if(!LV.db){ alert('Fotos brauchen die Datenbank des Browsers — in diesem Fenster ist sie nicht verfügbar.'); return; }
  [...files].filter(f=>f.type&&f.type.startsWith('image/')).forEach(f=>{
    const r=new FileReader();
    r.onload=()=>{ const fertig=async url=>{
      const aid=LVK.neueId('B'), data=String(url).replace(/^data:[^,]*,/,'');
      try{ await lvAnhangSpeichern({id:aid,liegenschaftId:l.id,name:f.name||'Foto.jpg',typ:'image/jpeg',size:Math.round(data.length*0.75),datum:lvHeute(),data}); }
      catch(e){ alert('Das Foto konnte nicht gespeichert werden ('+lvFehlerText(e)+').'); return; }
      await lvAendern(l=>{ const v=l.vorgaenge.find(x=>x.id===id); v.fotos.push(aid); },'Foto gespeichert.');
    };
    if(typeof downscale==='function') downscale(r.result,1400,0.75,fertig); else fertig(r.result); };
    r.readAsDataURL(f);
  });
}
async function lvVorgangFotoLoeschen(id,aid){
  if(!confirm('Foto löschen?')) return;
  if(await lvAendern(l=>{ const v=l.vorgaenge.find(x=>x.id===id); v.fotos=v.fotos.filter(x=>x!==aid); },'Foto gelöscht.')){ try{ await lvAnhaengeLoeschen([aid]); }catch(e){} }
}
/* Bilder der Anhänge nach dem Zeichnen nachladen */
async function lvBilderLaden(){
  const imgs=[...document.querySelectorAll('#lv_body img[data-anhang]')];
  for(const img of imgs){ if(img.src) continue; const a=await lvAnhangLesen(img.dataset.anhang); if(a) img.src=lvDataUrl(a); else img.alt='Foto nicht gefunden'; }
}
/* Auftrag an den Dienstleister (Word) */
function lvAuftragWord(id){
  const l=lvAktiv(), v=(l.vorgaenge||[]).find(x=>x.id===id); if(!v) return;
  const d=lvDl(v.dienstleisterId)||{}, e=lvEinheit(l,v.einheitId), ab=LV.einst||{}, b=[];
  const mv=e?LVK.aktiverVertrag(l,e.id,lvHeute()):null, m=mv&&mv.mieter&&mv.mieter[0];
  if(ab.name||ab.anschrift) b.push({typ:'p',text:[ab.name,ab.anschrift,ab.telefon,ab.email].filter(Boolean).join(' · ')});
  b.push({typ:'p',text:[d.name,d.anschrift].filter(Boolean).join('\n')});
  b.push({typ:'p',text:(ab.ort||l.ort||'')+((ab.ort||l.ort)?', ':'')+LVK.datumDE(lvHeute())});
  b.push({typ:'h2',text:'Auftrag: '+v.titel});
  b.push({typ:'tabelle',zeilen:[[{text:'Objekt'},{text:lvAdresse(l)||l.name}],[{text:'Betrifft'},{text:e?lvEinheitName(e):'Gemeinschaftseigentum'}]]
    .concat(m?[[{text:'Ansprechpartner vor Ort'},{text:m.name+(m.telefon?', Telefon '+m.telefon:'')}]]:[])
    .concat(v.terminAm?[[{text:'Termin'},{text:LVK.datumDE(v.terminAm)}]]:[])
    .concat(v.angebot>0?[[{text:'Kostenrahmen'},{text:lvEur(v.angebot)+' — bei höheren Kosten bitte vorher Rücksprache'}]]:[])});
  b.push({typ:'p',text:'Sehr geehrte Damen und Herren,'});
  b.push({typ:'p',text:'hiermit beauftragen wir Sie mit folgenden Arbeiten:'});
  b.push({typ:'p',text:v.beschreibung||v.titel});
  b.push({typ:'p',text:'Bitte stimmen Sie den Termin direkt mit dem Ansprechpartner vor Ort ab. Die Rechnung richten Sie bitte an '+(l.kontoInhaber||l.eigentuemerName||ab.name||'den Eigentümer')
    +' und weisen darin die Arbeitskosten gesondert aus (§ 35a EStG).'});
  b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  lvHerunterladen(ImmoOffice.docx(b,{titel:'Auftrag '+v.titel}),LV_DOCX,lvDateiname('Auftrag '+v.titel+' '+(l.strasse||l.name))+'.docx');
}

/* ---------- Pflichten & Wartung ---------- */
function lvPflichtFelder(p){
  p=p||{}; const k=LVI.KAT_P[p.art];
  return [{id:'p_bezeichnung',label:'Bezeichnung',wert:p.bezeichnung||(k?k.name:''),pflicht:true},
    {id:'p_monate',label:'Turnus (Monate)',typ:'zahl',wert:p.monate!=null?p.monate:(k?k.monate:12),min:1,pflicht:true},
    {id:'p_letzte',label:'Zuletzt erledigt am',typ:'datum',wert:p.letzte},
    {id:'p_zustaendig',label:'Zuständig',typ:'wahl',wert:p.zustaendig||'vermieter',optionen:LVI.ZUSTAENDIG},
    {id:'p_dienstleister',label:'Dienstleister',typ:'wahl',wert:p.dienstleisterId||'',optionen:lvDlOptionen()},
    {id:'p_aktiv',label:'Aktiv (in den Fristen zeigen)',typ:'check',wert:p.aktiv!==false},
    {id:'p_notiz',label:'Notiz',typ:'textarea',wert:p.notiz,breit:true,zeilen:2}];
}
function lvPflichtenHtml(l){
  const st=lvHeute(); let form='';
  if(LV.form&&LV.form.typ==='pflicht'){ const p=LV.form.id?(l.pflichten||[]).find(x=>x.id===LV.form.id):null; form=lvFormRahmen(p?'Pflicht bearbeiten':'Eigene Pflicht anlegen',lvFelder(lvPflichtFelder(p),'three'),'lvPflichtSpeichern(\''+lvQ(p?p.id:'')+'\')'); }
  if(LV.form&&LV.form.typ==='pflichtErledigt'){ const p=(l.pflichten||[]).find(x=>x.id===LV.form.id);
    form=lvFormRahmen(LVI.pflichtName(p)+': erledigt',lvFelder([{id:'e_datum',label:'Erledigt am',typ:'datum',wert:st,pflicht:true},{id:'e_notiz',label:'Notiz (z. B. Prüfbericht Nr.)'},
      {id:'e_kosten',label:'Kosten (€)',typ:'betrag',min:0},{id:'e_kat',label:'Kosten übernehmen als',typ:'wahl',wert:p&&p.art==='heizungswartung'?'heizung':'',optionen:[['','nicht als Kosten übernehmen'],['instandhaltung','Instandhaltung (nicht umlagefähig)']].concat(lvUmlageOptionen().slice(1))}],'four'),'lvPflichtErledigt(\''+lvQ(p.id)+'\')'); }
  if(LV.form&&LV.form.typ==='katalog'){ const da=new Set((l.pflichten||[]).map(p=>p.art));
    form=lvFormRahmen('Pflichten aus dem Katalog übernehmen','<p class="hint">Nur ankreuzen, was für diese Liegenschaft zutrifft. Turnus und Rechtsgrundlage sind Richtwerte — maßgeblich sind Bescheide, Herstellerangaben und die Anlage vor Ort.</p>'
      +lvFelder([{id:'kat_auswahl',label:'Pflichten',typ:'mehrfach',breit:true,wert:[],optionen:LVI.KATALOG.filter(k=>!da.has(k.key)).map(k=>[k.key,k.name+' — '+k.pflicht+', alle '+k.monate+' Monate'])}],'one'),'lvKatalogUebernehmen()'); }
  const zeilen=(l.pflichten||[]).slice().sort((a,b)=>String(LVI.naechste(a)||'0').localeCompare(String(LVI.naechste(b)||'0'))).map(p=>{
    const n=LVI.naechste(p), k=LVI.KAT_P[p.art], d=lvDl(p.dienstleisterId);
    const zustand=p.aktiv===false?lvBadge('inaktiv',''):!n?lvBadge('letzte Erledigung fehlt','warn'):n<st?lvBadge('überfällig','bad'):LVK.tagNr(n)-LVK.tagNr(st)<=60?lvBadge('bald fällig','warn'):lvBadge('in Ordnung','ok');
    return '<tr><td class="strong">'+lvH(LVI.pflichtName(p))+(k?'<br><span class="lv-klein">'+lvH(k.pflicht+' · '+k.quelle)+'</span>':'')+'</td>'
      +'<td class="r">'+lvH(p.monate||'–')+' Mon.</td><td>'+lvH(LVK.datumDE(p.letzte)||'–')+'</td><td>'+lvH(LVK.datumDE(n)||'–')+'<br>'+zustand+'</td>'
      +'<td>'+lvH((LVI.ZUSTAENDIG.find(z=>z[0]===p.zustaendig)||[,''])[1])+(d?'<br><span class="lv-klein">'+lvH(d.name)+'</span>':'')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'pflichtErledigt\',id:\''+lvQ(p.id)+'\'};lvRender()" data-ic="check">Erledigt</button>'
      +'<button class="secondary" onclick="LV.form={typ:\'pflicht\',id:\''+lvQ(p.id)+'\'};lvRender()">Bearbeiten</button>'
      +'<button class="secondary" onclick="lvPflichtLoeschen(\''+lvQ(p.id)+'\')" aria-label="Pflicht löschen" data-ic="trash"></button></td></tr>'; });
  return form+lvBox('Pflichten und Wartung',lvTabelle(['Pflicht',{t:'Turnus',r:1},'Zuletzt','Nächste','Zuständig',''],zeilen,'Noch keine Pflichten angelegt — am schnellsten über „Aus Katalog übernehmen“.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'katalog\'};lvRender()" data-ic="plus">Aus Katalog übernehmen</button><button class="secondary" onclick="LV.form={typ:\'pflicht\',id:null};lvRender()" data-ic="plus">Eigene Pflicht</button></div>');
}
async function lvKatalogUebernehmen(){
  const r=lvFormLesen([{id:'kat_auswahl',label:'Pflichten',typ:'mehrfach'}]), aus=r.werte.kat_auswahl||[];
  if(!aus.length){ lvFehlerZeigen(['Bitte mindestens eine Pflicht ankreuzen']); return; }
  LV.form=null;
  await lvAendern(l=>{ l.pflichten=l.pflichten||[]; aus.forEach(key=>{ const k=LVI.KAT_P[key]; l.pflichten.push({id:LVK.neueId('P'),art:key,bezeichnung:'',monate:k.monate,letzte:null,zustaendig:'vermieter',aktiv:true,historie:[]}); }); },
    aus.length+' Pflicht'+(aus.length===1?'':'en')+' übernommen. Bitte jeweils die letzte Erledigung eintragen.');
}
async function lvPflichtSpeichern(id){
  const r=lvFormLesen(lvPflichtFelder()), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  LV.form=null;
  await lvAendern(l=>{ l.pflichten=l.pflichten||[]; let p=id?l.pflichten.find(x=>x.id===id):null;
    if(!p){ p={id:LVK.neueId('P'),art:'eigen',historie:[]}; l.pflichten.push(p); }
    const k=LVI.KAT_P[p.art];
    Object.assign(p,{bezeichnung:k&&w.p_bezeichnung===k.name?'':w.p_bezeichnung,monate:w.p_monate,letzte:w.p_letzte,zustaendig:w.p_zustaendig,dienstleisterId:w.p_dienstleister||null,aktiv:w.p_aktiv,notiz:w.p_notiz}); },'Pflicht gespeichert.');
}
async function lvPflichtErledigt(id){
  const f=[{id:'e_datum',label:'Erledigt am',typ:'datum',pflicht:true},{id:'e_notiz',label:'Notiz'},{id:'e_kosten',label:'Kosten',typ:'betrag',min:0},{id:'e_kat',label:'Kosten übernehmen als',typ:'wahl'}];
  const r=lvFormLesen(f), w=r.werte;
  if(w.e_kat&&!(w.e_kosten>0)){ r.ok=false; r.fehler.push('Für die Übernahme in die Kosten bitte den Betrag eintragen'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  LV.form=null;
  await lvAendern(l=>{ const p=l.pflichten.find(x=>x.id===id);
    p.historie.push({datum:w.e_datum,notiz:w.e_notiz,kosten:w.e_kosten});
    if(!p.letzte||w.e_datum>p.letzte) p.letzte=w.e_datum;
    if(w.e_kat&&w.e_kosten>0){ l.kosten=l.kosten||[]; l.kosten.push({id:LVK.neueId('K'),kategorie:w.e_kat,betrag:LVK.r2(w.e_kosten),datum:w.e_datum,text:LVI.pflichtName(p),beleg:w.e_notiz||'',kreis:'alle',einheitIds:[]}); }
  },'Erledigung eingetragen'+(w.e_kat?'; die Kosten stehen in den Kosten der Liegenschaft.':'.'));
}
async function lvPflichtLoeschen(id){
  if(!confirm('Diese Pflicht löschen? Die Erledigungen gehen dabei verloren.')) return;
  await lvAendern(l=>{ l.pflichten=l.pflichten.filter(p=>p.id!==id); },'Pflicht gelöscht.');
}

/* ---------- Dienstleister (für alle Liegenschaften) ---------- */
function lvDlFelder(d){ d=d||{}; return [{id:'d_name',label:'Firma / Name',wert:d.name,pflicht:true},{id:'d_gewerk',label:'Gewerk',wert:d.gewerk,platzhalter:'z. B. Sanitär, Elektro, Dach'},
  {id:'d_telefon',label:'Telefon',typ:'tel',wert:d.telefon},{id:'d_email',label:'E-Mail',typ:'email',wert:d.email},{id:'d_anschrift',label:'Anschrift',wert:d.anschrift,breit:true},{id:'d_notiz',label:'Notiz',typ:'textarea',wert:d.notiz,breit:true,zeilen:2}]; }
function lvDienstleisterHtml(){
  let form='';
  if(LV.form&&LV.form.typ==='dienstleister'){ const d=LV.form.id?lvDl(LV.form.id):null; form=lvFormRahmen(d?'Dienstleister bearbeiten':'Neuer Dienstleister',lvFelder(lvDlFelder(d),'four'),'lvDlSpeichern(\''+lvQ(d?d.id:'')+'\')'); }
  const nutzung=id=>LV.liste.reduce((s,l)=>s+(l.vorgaenge||[]).filter(v=>v.dienstleisterId===id).length+(l.pflichten||[]).filter(p=>p.dienstleisterId===id).length,0);
  const zeilen=(LV.dienstleister||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(d=>'<tr><td class="strong">'+lvH(d.name)+'<br><span class="lv-klein">'+lvH(d.gewerk)+'</span></td><td>'+lvH(d.telefon)+'</td><td>'+lvH(d.email)+'</td><td class="r">'+nutzung(d.id)+'</td>'
    +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'dienstleister\',id:\''+lvQ(d.id)+'\'};lvRender()">Bearbeiten</button><button class="secondary" onclick="lvDlLoeschen(\''+lvQ(d.id)+'\')" aria-label="Dienstleister löschen" data-ic="trash"></button></td></tr>');
  return form+lvBox('Dienstleister und Handwerker','<p class="hint">Gilt für alle Liegenschaften; wird bei Vorgängen und Pflichten ausgewählt und reist mit der Datensicherung.</p>'
    +lvTabelle(['Name / Gewerk','Telefon','E-Mail',{t:'Einsätze',r:1},''],zeilen,'Noch keine Dienstleister angelegt.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'dienstleister\',id:null};lvRender()" data-ic="plus">Dienstleister anlegen</button></div>');
}
async function lvDlSpeichern(id){
  const r=lvFormLesen(lvDlFelder()), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const alle=JSON.parse(JSON.stringify(LV.dienstleister||[]));
  let d=id?alle.find(x=>x.id===id):null; if(!d){ d={id:LVK.neueId('D')}; alle.push(d); }
  Object.assign(d,{name:w.d_name,gewerk:w.d_gewerk,telefon:w.d_telefon,email:w.d_email,anschrift:w.d_anschrift,notiz:w.d_notiz});
  const sauber=lvDlBereinigen(alle);
  try{ await lvMetaSetzen('dienstleister',sauber); }catch(e){ alert('Nicht gespeichert ('+lvFehlerText(e)+').'); return; }
  LV.dienstleister=sauber; LV.form=null; lvMeldung('Dienstleister gespeichert.'); lvRender();
}
async function lvDlLoeschen(id){
  const d=lvDl(id); if(!d) return;
  if(!confirm('Dienstleister „'+d.name+'“ löschen? Bei Vorgängen und Pflichten wird er dann nicht mehr angezeigt.')) return;
  const alle=(LV.dienstleister||[]).filter(x=>x.id!==id);
  try{ await lvMetaSetzen('dienstleister',alle); }catch(e){ alert('Nicht gelöscht ('+lvFehlerText(e)+').'); return; }
  LV.dienstleister=alle; lvMeldung('Dienstleister gelöscht.'); lvRender();
}

/* ---------- Einhängen ---------- */
lvReiterRegistrieren('instandhaltung','Instandhaltung',l=>lvInstandhaltungHtml(l));
lvAnsichtRegistrieren('dienstleister','Dienstleister',()=>lvDienstleisterHtml(),'einstellungen');
lvFristenQuelleRegistrieren((l,st,h)=>LVI.fristen(l,st,h));
LV_FRIST_ZIELE.pflicht=()=>{ LV.reiter='instandhaltung'; LV.ihAnsicht='pflichten'; };
LV_FRIST_ZIELE.vorgang=()=>{ LV.reiter='instandhaltung'; LV.ihAnsicht='vorgaenge'; LV.ihFilter='alle'; };
(function(){ const b=document.getElementById('lv_body'); if(b) new MutationObserver(()=>{ if(b.querySelector('img[data-anhang]')) lvBilderLaden(); }).observe(b,{childList:true}); })();
