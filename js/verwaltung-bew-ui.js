/* ImmoApp — Liegenschaftsverwaltung: Reiter „Bewertungen“
   Rechnen: js/verwaltung-bew.js (ImmoLvBewertung), Baupreisindex: js/baupreisindex.js. Verknüpfte Bewertungen liegen in
   der Projekt-Bibliothek der Preisermittlung (src/projects.js); ihre Ergebnisse rechnet der Rechenkern (ImmoKern) aus
   den gespeicherten Feldern — dieselbe Rechnung wie beim Öffnen. */
'use strict';

const LVBW=ImmoLvBewertung;

/* Felder einer gespeicherten Bewertung so lesen wie das Formular (Beträge: Tausenderpunkt, sonst Dezimalpunkt) */
function lvBewLeser(fl){
  return {n:id=>zahlLesen(fl[id]==null?'':fl[id],typeof istBetrag==='function'&&istBetrag(id)),
    v:id=>fl[id]==null?'':String(fl[id]),an:id=>fl[id]===true};
}
function lvBewProjekte(){ return (typeof pjLoad==='function'?pjLoad():[]).slice().sort((a,b)=>(b.geaendert||0)-(a.geaendert||0)); }
function lvBewProjekt(id){ return lvBewProjekte().find(p=>p.id===id)||null; }
/* Ergebnisse einer Bewertung aus der Preisermittlung; PV-Barwert wie in den Vordrucken der Bank in beiden Ansätzen */
function lvBewErgebnisse(p){
  const fl=p&&p.data&&p.data.fields; if(!fl||typeof ImmoKern==='undefined') return null;
  const j=parseInt(String(fl.ek_stichtag||'').slice(0,4),10);
  try{
    const {R}=ImmoKern.bewerte(lvBewLeser(fl),{jahr:j>1800&&j<2200?j:new Date().getFullYear()});
    const pv=R.pvWert||0, bpi=LVBW.zahl(fl.bpi), art=ImmoBaupreisindex.artAusFaktor(LVBW.zahl(fl.bpi_faktor));
    return {stichtag:LVK.datumGueltig(fl.ek_stichtag)?fl.ek_stichtag:null,boden:LVK.r2(R.bodenwert),substanz:LVK.r2(R.substanz+pv),ertrag:LVK.r2(R.ertrag+pv),
      ergebnis:LVK.r2(R.empfehlung),bpi:bpi>0?bpi:null,bpiText:bpi>0?(art?ImmoBaupreisindex.ARTEN[art].name:'Baupreisindex')+(fl.pq_bpi_quelle&&/(Februar|Mai|August|November) \d{4}/.test(fl.pq_bpi_quelle)?' '+fl.pq_bpi_quelle.match(/(Februar|Mai|August|November) \d{4}/)[0]:''):''};
  }catch(e){ console.error(e); return null; }
}
function lvBewProzent(x){ return x==null?'':(x>0?'+':'')+String(LVK.r2(x)).replace('.',',')+' %'; }

function lvBewertungenHtml(l){
  let form='';
  const f=LV.form||{};
  if(f.typ==='bewertung'){ const b=(l.bewertungen||[]).find(x=>x.id===f.id)||{}; form=lvFormRahmen(b.id?'Bewertung bearbeiten':'Bewertung eintragen',lvFelder(lvBewFelder(b)),'lvBewSpeichern(\''+lvQ(b.id||'')+'\')'); }
  if(f.typ==='bew_projekt') form=lvFormRahmen('Ergebnis aus der Preisermittlung übernehmen',lvFelder(lvBewProjektFelder(l),'two'),'lvBewAusProjekt()',null,
    '<p class="hint">Die App rechnet die gewählte Bewertung mit den gespeicherten Angaben und trägt Stichtag, Bodenwert, Substanz- und Ertragsansatz sowie die Preisempfehlung ein. Die Bewertung bleibt verknüpft.</p>');
  if(f.typ==='bew_fort') form=lvFormRahmen('Bewertung auf neuen Stichtag fortschreiben',lvFelder(lvBewFortFelder(l),'two'),'lvBewFortschreiben()',null,
    '<p class="hint">Es entsteht eine Kopie der gewählten Bewertung als Entwurf: neuer Stichtag, amtlicher Baupreisindex Baden-Württemberg (Stand '
    +lvH(ImmoBaupreisindex.monatText(ImmoBaupreisindex.STAND))+'), Restnutzungsdauer und PV-Laufzeit fortgeschrieben. Bodenrichtwert, Mieten und Zinssätze bleiben stehen — bitte in der Bewertung prüfen.</p>');
  const v=LVBW.verlauf(l), akt=LVBW.aktuell(l), naechst=['bank','eigen'].includes(l.eigentuemerArt)?LVBW.naechsterStichtag(l):null, st=lvHeute();
  const mitProjekt=v.filter(b=>(b.projektId&&lvBewProjekt(b.projektId))||b.vordruck);
  const kpis=v.length?'<div class="kpis">'+lvKpi('Letzte Bewertung',akt?lvEur0(akt.ergebnis):'–',akt?'Stichtag '+LVK.datumDE(akt.stichtag)+(akt.status==='entwurf'?' (Entwurf)':''):'')
    +lvKpi('Veränderung',akt&&akt.diffPct!=null?lvBewProzent(akt.diffPct):'–',akt&&akt.diff!=null?(akt.diff>0?'+':'')+lvEur0(akt.diff)+' ggü. '+LVK.datumDE(akt.vorStichtag):'',akt&&akt.diff<0?'lv-kpi-bad':'')
    +(naechst?lvKpi('Nächste Bewertung',LVK.datumDE(naechst),naechst<=st?'fällig':'jährlich zum Stichtag',naechst<=st?'lv-kpi-bad':''):'')+'</div>':'';
  const zeilen=v.slice().reverse().map(b=>{
    const p=b.projektId&&lvBewProjekt(b.projektId);
    return '<tr><td>'+lvH(LVK.datumDE(b.stichtag))+(b.status==='entwurf'?'<br>'+lvBadge('Entwurf','warn'):'')+'</td>'
      +'<td>'+lvH(LVBW.ART[b.art]||'')+(b.quelle?'<br><span class="lv-klein">'+lvH(b.quelle)+'</span>':'')+(p&&!(b.quelle||'').includes(p.name)?'<br><span class="lv-klein">verknüpft: '+lvH(p.name)+'</span>':'')
        +(b.notiz?'<br><span class="lv-klein lv-bew-notiz" title="'+lvH(b.notiz)+'">'+lvH(b.notiz.length>220?b.notiz.slice(0,217)+'…':b.notiz)+'</span>':'')+'</td>'
      +'<td class="r">'+(b.boden!=null?lvEur0(b.boden):'')+'</td><td class="r">'+(b.substanz!=null?lvEur0(b.substanz):'')+'</td><td class="r">'+(b.ertrag!=null?lvEur0(b.ertrag):'')+'</td>'
      +'<td class="r strong">'+(b.ergebnis!=null?lvEur0(b.ergebnis):'')+'</td>'
      +'<td class="r">'+(b.diffPct!=null?lvBewProzent(b.diffPct):'')+'</td>'
      +'<td>'+(b.bpi?lvH(String(b.bpi).replace('.',','))+(b.bpiText?'<br><span class="lv-klein">'+lvH(b.bpiText)+'</span>':''):'')+'</td>'
      +'<td class="lv-aktionen">'+(p?'<button class="secondary" onclick="lvBewProjektOeffnen(\''+lvQ(p.id)+'\')" data-ic="folder-open">Öffnen</button>'
        +'<button class="secondary" onclick="lvBewNeuRechnen(\''+lvQ(b.id)+'\')" title="Ergebnis aus der verknüpften Bewertung neu übernehmen">Neu rechnen</button>':'')
      +(b.vordruck&&typeof jbOeffnen==='function'?'<button class="secondary" onclick="jbOeffnen(\''+lvQ(l.id)+'\',\''+lvQ(b.id)+'\')" data-ic="pen">Vordruck</button>'
        :'<button class="secondary" onclick="LV.form={typ:\'bewertung\',id:\''+lvQ(b.id)+'\'};lvRender()">Bearbeiten</button>')
      +'<button class="secondary" onclick="lvBewLoeschen(\''+lvQ(b.id)+'\')" aria-label="Bewertung löschen" data-ic="trash"></button></td></tr>';
  });
  const knoepfe='<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'bewertung\'};lvRender()" data-ic="plus">Bewertung eintragen</button>'
    +'<button class="secondary" onclick="LV.form={typ:\'bew_projekt\'};lvRender()">Aus Preisermittlung übernehmen</button>'
    +(mitProjekt.length?'<button class="secondary" onclick="LV.form={typ:\'bew_fort\'};lvRender()">Auf neuen Stichtag fortschreiben</button>':'')+'</div>';
  return form+lvBox('Bewertungen'+(v.length?' ('+v.length+')':''),kpis
    +lvTabelle(['Stichtag','Art / Quelle',{t:'Bodenwert',r:1},{t:'Substanz',r:1},{t:'Ertrag',r:1},{t:'Ergebnis',r:1},{t:'Veränderung',r:1},'Baupreisindex',''],zeilen,
      'Noch keine Bewertung erfasst. Ergebnisse früherer Preiseinschätzungen hier eintragen oder eine Bewertung aus der Preisermittlung übernehmen.')
    +knoepfe
    +'<p class="hint">Substanz und Ertrag einschließlich PV-Barwert, Ergebnis = Preisempfehlung. Veränderung gegenüber der vorigen abgeschlossenen Bewertung. '
    +'Für Objekte der Bank und eigene Objekte erscheint die jährliche Bewertung in den Fristen. Eine rechnerische Preiseinschätzung ist kein Verkehrswertgutachten.</p>');
}
function lvBewFelder(b){
  b=b||{};
  const projekte=[['','– keine –']].concat(lvBewProjekte().map(p=>[p.id,p.name+(p.datum?' · '+p.datum:'')]));
  return [{id:'b_stichtag',label:'Wertermittlungsstichtag',typ:'datum',wert:b.stichtag,pflicht:true},{id:'b_art',label:'Art',typ:'wahl',wert:b.art||'preiseinschaetzung',optionen:LVBW.ARTEN},
    {id:'b_status',label:'Stand',typ:'wahl',wert:b.status||'final',optionen:LVBW.STATUS},
    {id:'b_boden',label:'Bodenwert (€)',typ:'betrag',wert:b.boden,min:0},{id:'b_substanz',label:'Substanzansatz (€)',typ:'betrag',wert:b.substanz,min:0},
    {id:'b_ertrag',label:'Ertragsansatz (€)',typ:'betrag',wert:b.ertrag},{id:'b_ergebnis',label:'Ergebnis / Preisempfehlung (€)',typ:'betrag',wert:b.ergebnis,pflicht:true,min:0},
    {id:'b_bpi',label:'Baupreisindex (2021 = 100)',typ:'zahl',wert:b.bpi,min:0},{id:'b_bpitext',label:'Baupreisindex: Art und Quartal',wert:b.bpiText,platzhalter:'z. B. Bürogebäude November 2024'},
    {id:'b_projekt',label:'Verknüpfte Bewertung (Preisermittlung)',typ:'wahl',wert:b.projektId||'',optionen:projekte},
    {id:'b_quelle',label:'Quelle / Datei',wert:b.quelle,breit:true,platzhalter:'z. B. Preiseinschätzung … Stichtag 31.12.2024.xls'},
    {id:'b_notiz',label:'Notiz',typ:'textarea',wert:b.notiz,breit:true,zeilen:3}];
}
async function lvBewSpeichern(id){
  const r=lvFormLesen(lvBewFelder()); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte; LV.form=null;
  const daten={stichtag:w.b_stichtag,art:w.b_art,status:w.b_status,boden:w.b_boden,substanz:w.b_substanz,ertrag:w.b_ertrag,ergebnis:w.b_ergebnis,
    bpi:w.b_bpi,bpiText:w.b_bpitext,projektId:w.b_projekt||null,quelle:w.b_quelle,notiz:w.b_notiz};
  await lvAendern(x=>{ x.bewertungen=x.bewertungen||[];
    if(id){ const b=x.bewertungen.find(y=>y.id===id); if(!b) return false; Object.assign(b,daten); }
    else x.bewertungen.push(Object.assign({id:LVK.neueId('BW')},daten)); },'Bewertung gespeichert.');
}
async function lvBewLoeschen(id){
  const l=lvAktiv(), b=l&&(l.bewertungen||[]).find(x=>x.id===id); if(!b) return;
  if(!confirm('Bewertung zum '+LVK.datumDE(b.stichtag)+' aus der Liste löschen?'+(b.projektId?'\nDie verknüpfte Bewertung in der Preisermittlung bleibt erhalten.':''))) return;
  await lvAendern(x=>{ x.bewertungen=(x.bewertungen||[]).filter(y=>y.id!==id); },'Bewertung gelöscht.');
}
function lvBewProjektFelder(l){
  const projekte=lvBewProjekte().map(p=>[p.id,p.name+(p.datum?' · '+p.datum:'')]);
  return [{id:'bp_projekt',label:'Bewertung',typ:'wahl',wert:projekte.length?projekte[0][0]:'',optionen:projekte.length?projekte:[['','– keine gespeicherten Bewertungen –']],breit:true},
    {id:'bp_status',label:'Stand',typ:'wahl',wert:'final',optionen:LVBW.STATUS}];
}
async function lvBewAusProjekt(){
  const r=lvFormLesen(lvBewProjektFelder(lvAktiv())); const p=lvBewProjekt(r.werte.bp_projekt);
  if(!p){ lvFehlerZeigen(['Bitte eine gespeicherte Bewertung wählen (Projekte der Preisermittlung).']); return; }
  const e=lvBewErgebnisse(p);
  if(!e||!e.stichtag){ lvFehlerZeigen(['Die Bewertung hat keinen Wertermittlungsstichtag oder lässt sich nicht rechnen — bitte in der Preisermittlung ergänzen.']); return; }
  LV.form=null;
  await lvAendern(x=>{ x.bewertungen=(x.bewertungen||[]).filter(b=>b.projektId!==p.id);
    x.bewertungen.push(Object.assign({id:LVK.neueId('BW'),art:'preiseinschaetzung',status:r.werte.bp_status,projektId:p.id,quelle:'Preisermittlung: '+p.name,notiz:''},e)); },
    'Ergebnis übernommen: '+lvEur0(e.ergebnis)+' zum '+LVK.datumDE(e.stichtag)+'.');
}
async function lvBewNeuRechnen(id){
  const l=lvAktiv(), b=l&&(l.bewertungen||[]).find(x=>x.id===id), p=b&&lvBewProjekt(b.projektId); if(!p) return;
  const e=lvBewErgebnisse(p); if(!e){ alert('Die verknüpfte Bewertung lässt sich nicht rechnen.'); return; }
  await lvAendern(x=>{ const y=(x.bewertungen||[]).find(z=>z.id===id); if(!y) return false; Object.assign(y,e,{stichtag:e.stichtag||y.stichtag}); },
    'Ergebnis neu übernommen: '+lvEur0(e.ergebnis)+'.');
}
function lvBewFortFelder(l){
  const quellen=LVBW.verlauf(l).filter(b=>(b.projektId&&lvBewProjekt(b.projektId))||b.vordruck).reverse();
  const q=quellen[0], p=q&&q.projektId&&lvBewProjekt(q.projektId), fl=(p&&p.data&&p.data.fields)||{};
  const art=ImmoBaupreisindex.artAusFaktor(LVBW.zahl(fl.bpi_faktor))||ImmoBaupreisindex.artAusTyp(fl.ek_typ);
  const st=LVBW.stichtagVorschlag(q&&q.stichtag,lvHeute());
  const name=((p&&p.name)||l.name||'Bewertung').replace(/\s*[–-]\s*Stichtag\s+[\d.]+.*$/,'')+' – Stichtag '+LVK.datumDE(st);
  return [{id:'bf_quelle',label:'Ausgangsbewertung',typ:'wahl',wert:q?q.id:'',optionen:quellen.map(b=>[b.id,LVK.datumDE(b.stichtag)+' · '+(b.vordruck?'Vordruck Jahresbewertung':lvBewProjekt(b.projektId).name)]),breit:true},
    {id:'bf_stichtag',label:'Neuer Stichtag',typ:'datum',wert:st,pflicht:true},
    {id:'bf_art',label:'Baupreisindex für',typ:'wahl',wert:art,optionen:Object.keys(ImmoBaupreisindex.ARTEN).map(k=>[k,ImmoBaupreisindex.ARTEN[k].name])},
    {id:'bf_name',label:'Name der neuen Bewertung',wert:name,pflicht:true,breit:true},
    {id:'bf_rnd',label:'Angepasste Restnutzungsdauer um die vergangenen Jahre verringern',typ:'check',wert:true,breit:true}];
}
async function lvBewFortschreiben(){
  const l=lvAktiv(), r=lvFormLesen(lvBewFortFelder(l)); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte, q=(l.bewertungen||[]).find(b=>b.id===w.bf_quelle), p=q&&q.projektId&&lvBewProjekt(q.projektId);
  if(q&&q.vordruck&&!p&&typeof jbNeueFassung==='function'){ LV.form=null; let neu=null;
    await lvAendern(x=>{ const qq=(x.bewertungen||[]).find(b=>b.id===q.id); try{ neu=jbNeueFassung(x,qq,w.bf_stichtag,w.bf_rnd); }catch(e){ return false; } },
      'Entwurf zum '+LVK.datumDE(w.bf_stichtag)+' angelegt (Vordruck Jahresbewertung).');
    return; }
  if(!p){ lvFehlerZeigen(['Die Ausgangsbewertung ist nicht (mehr) in der Preisermittlung gespeichert.']); return; }
  let voll=p;
  if(typeof IA_DB_BEREIT!=='undefined'&&IA_DB_BEREIT){ try{ voll=await iaGet('projekte',p.id)||p; }catch(e){ alert('Die Bewertung konnte nicht gelesen werden: '+iaFehlerText(e)+'.'); return; } }
  let fort; try{ fort=LVBW.fortschreiben(voll.data.fields,{stichtag:w.bf_stichtag,art:w.bf_art,rndFortschreiben:w.bf_rnd}); }catch(e){ lvFehlerZeigen([e.message]); return; }
  let pid; do{ pid='p'+Date.now()+Math.random().toString(36).slice(2,6); }while(lvBewProjekt(pid));   // eindeutig, auch bei gleicher Uhrzeit
  const neu={id:pid,name:w.bf_name,objekt:voll.objekt||'',datum:new Date().toLocaleDateString('de-DE'),empf:'',voll:null,geaendert:Date.now(),
    data:Object.assign({},voll.data,{fields:fort.felder})};
  const e=lvBewErgebnisse(neu)||{};
  if(e.ergebnis>0) neu.empf=lvEur0(e.ergebnis);
  try{
    if(typeof IA_DB_BEREIT!=='undefined'&&IA_DB_BEREIT){ await iaPut('projekte',neu); pjCacheSetzen(neu); }
    else { const liste=pjLoad(); liste.push(neu); if(!pjStore(liste)) return; }
  }catch(x){ alert('Die neue Bewertung konnte nicht gespeichert werden: '+(typeof iaFehlerText==='function'?iaFehlerText(x):x.message)+'.'); return; }
  LV.form=null;
  const ok=await lvAendern(x=>{ x.bewertungen=(x.bewertungen||[]).concat([Object.assign({id:LVK.neueId('BW'),art:q.art||'preiseinschaetzung',status:'entwurf',projektId:neu.id,
    quelle:'Fortschreibung von '+p.name,notiz:'Zu prüfen:\n– '+fort.hinweise.join('\n– ')},e,{stichtag:w.bf_stichtag})]); },
    'Entwurf zum '+LVK.datumDE(w.bf_stichtag)+' angelegt'+(e.ergebnis>0?' (vorläufig '+lvEur0(e.ergebnis)+')':'')+'. Prüfen: '+fort.hinweise.join(' · '));
  if(ok&&confirm('Die neue Bewertung „'+neu.name+'“ jetzt in der Preisermittlung öffnen?')) lvBewProjektOeffnen(neu.id,true);
}
function lvBewProjektOeffnen(id,ohneRueckfrage){
  if(typeof projektLaden!=='function') return;
  if(!ohneRueckfrage){ const p=lvBewProjekt(id); if(!p||!confirm('Bewertung „'+p.name+'“ in der Preisermittlung öffnen? Der aktuelle Stand der Preisermittlung wird ersetzt.')) return; }
  lvSchliessen(); projektLaden(id,true);
}

lvReiterRegistrieren('bewertungen','Bewertungen',l=>lvBewertungenHtml(l),null,'dokumente');
lvFristenQuelleRegistrieren((l,st,h)=>LVBW.fristen(l,st,h));
LV_FRIST_ZIELE.bewertung=()=>{ LV.reiter='bewertungen'; };
