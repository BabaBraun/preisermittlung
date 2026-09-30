/* ImmoApp — Liegenschaftsverwaltung: Oberfläche „WEG“ (nur bei Liegenschaften der Art WEG)
   Eigentümer · Wirtschaftsplan & Hausgeld · Jahresabrechnung · Versammlungen · Beschluss-Sammlung.
   Rechnen: js/verwaltung-weg.js (ImmoWeg). Die Kosten der Gemeinschaft stehen im Reiter „Nebenkosten“
   (Kosten aus der Erhaltungsrücklage dort mit Häkchen „aus der Rücklage bezahlt“). */
'use strict';

const LVW=ImmoWeg;
LV.wegAnsicht='eigentuemer'; LV.wegJahr=null; LV.wegEinheit=null; LV.wegVersammlung=null;

function lvWegJahr(){ return LV.wegJahr||+lvHeute().slice(0,4); }
function lvWegAbJahr(){ return LV.wegAbJahr||(+lvHeute().slice(0,4)-1); }
function lvEigentuemerText(l,eid,datum){ const o=LVW.eigentuemerAm(l,eid,datum||lvHeute()); return o.length?o.map(x=>x.name).join(', '):'–'; }
function lvWegSegmente(){ return [['eigentuemer','Eigentümer'],['hausgeld','Wirtschaftsplan & Hausgeld'],['abrechnung','Jahresabrechnung'],['versammlungen','Versammlungen'],['beschluesse','Beschluss-Sammlung']]; }
function lvWegHtml(l){
  const kopf='<div class="lv-nk-kopf"><div class="lv-segment">'+lvWegSegmente().map(([k,t])=>'<button class="'+(LV.wegAnsicht===k?'on':'')+'" onclick="LV.wegAnsicht=\''+k+'\';LV.form=null;lvRender()">'+t+'</button>').join('')+'</div></div>';
  const f={eigentuemer:lvWegEigentuemerHtml,hausgeld:lvWegHausgeldHtml,abrechnung:lvWegAbrechnungHtml,versammlungen:lvWegVersammlungenHtml,beschluesse:lvWegBeschluesseHtml}[LV.wegAnsicht]||lvWegEigentuemerHtml;
  if(!(l.einheiten||[]).length) return kopf+lvBox('WEG','<p>Zuerst die Einheiten mit ihren Miteigentumsanteilen erfassen.</p>');
  return kopf+f(l);
}
function lvW(l){ l.weg=l.weg||{}; ['eigentuemer','wirtschaftsplaene','zahlungen','sonderumlagen','abrechnungen','versammlungen','beschluesse'].forEach(k=>{ if(!Array.isArray(l.weg[k])) l.weg[k]=[]; }); return l.weg; }

/* ---------- Eigentümer ---------- */
function lvEigFelder(l){
  const kunden=(typeof KD_CACHE!=='undefined'&&Array.isArray(KD_CACHE)?KD_CACHE:[]).map(k=>[k.id,(typeof kdName==='function'?kdName(k):k.id)||k.id]);
  return [{id:'o_einheit',label:'Einheit',typ:'wahl',pflicht:true,optionen:[['','– bitte wählen –']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)+(e.mea!=null?' · '+lvZahl(e.mea,4)+' MEA':'')]))},
    {id:'o_name',label:'Name',pflicht:true},{id:'o_kunde',label:'Kunde aus der Kundenakte',typ:'wahl',optionen:[['','–']].concat(kunden)},
    {id:'o_seit',label:'Eigentümer seit (Grundbuch)',typ:'datum',wert:lvHeute(),pflicht:true,hinweis:'Miteigentümer einer Einheit mit demselben Datum eintragen'},
    {id:'o_anschrift',label:'Anschrift',breit:true},{id:'o_email',label:'E-Mail',typ:'email'},{id:'o_telefon',label:'Telefon',typ:'tel'}];
}
function lvWegEigentuemerHtml(l){
  const W=l.weg||{}, st=lvHeute(), mea=LVW.meaGesamt(l);
  let form='';
  if(LV.form&&LV.form.typ==='eigentuemer') form=lvFormRahmen('Eigentümer eintragen (auch bei Eigentümerwechsel)',lvFelder(lvEigFelder(l),'three'),'lvEigSpeichern()');
  const zeilen=(l.einheiten||[]).map(e=>{
    const akt=LVW.eigentuemerAm(l,e.id,st), frueher=(W.eigentuemer||[]).filter(o=>o.einheitId===e.id&&!akt.includes(o));
    return '<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td class="r">'+(e.mea!=null?lvZahl(e.mea,4):'<span class="lv-neg">fehlt</span>')+'</td>'
      +'<td>'+(akt.length?akt.map(o=>lvH(o.name)+(o.kundeId?' '+lvBadge('Kunde','ok'):'')+'<br><span class="lv-klein">seit '+lvH(LVK.datumDE(o.seit))+[o.telefon,o.email].filter(Boolean).map(x=>' · '+lvH(x)).join('')+'</span>').join('<br>'):lvBadge('kein Eigentümer erfasst','warn'))
      +(frueher.length?'<br><span class="lv-klein">früher: '+lvH(frueher.map(o=>o.name+(o.seit?' (ab '+LVK.datumDE(o.seit)+')':'')).join(', '))+'</span>':'')+'</td>'
      +'<td class="lv-aktionen">'+(W.eigentuemer||[]).filter(o=>o.einheitId===e.id).map(o=>'<button class="secondary" onclick="lvEigLoeschen(\''+lvQ(o.id)+'\')" aria-label="Eintrag '+lvH(o.name)+' löschen" data-ic="trash"></button>').join('')+'</td></tr>';
  });
  return form+lvBox('Eigentümer und Stimmrecht','<div class="grid three lv-form">'+lvFeld({id:'w_prinzip',label:'Stimmrecht',typ:'wahl',wert:W.stimmprinzip||'kopf',optionen:Object.entries(LVW.PRINZIPIEN),hinweis:'gesetzlich Kopfprinzip; Wert- oder Objektprinzip nur, wenn Teilungserklärung oder Vereinbarung es vorsehen'})
      +'<div class="field"><label>&nbsp;</label><button class="secondary" onclick="lvWegPrinzip()">Übernehmen</button></div></div>'
    +'<p class="hint">Summe der Miteigentumsanteile: <b>'+lvZahl(mea,4)+'</b>'+(mea&&![1000,10000,100000].includes(Math.round(mea))?' — bitte mit der Teilungserklärung abgleichen':'')+'.</p>'
    +lvTabelle(['Einheit',{t:'MEA',r:1},'Eigentümer',''],zeilen)
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'eigentuemer\'};lvRender()" data-ic="plus">Eigentümer eintragen</button></div>');
}
async function lvWegPrinzip(){ const v=(document.getElementById('lvf_w_prinzip')||{}).value; await lvAendern(l=>{ lvW(l).stimmprinzip=v; },'Stimmrecht gespeichert.'); }
async function lvEigSpeichern(){
  const l=lvAktiv(), r=lvFormLesen(lvEigFelder(l)), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const name=w.o_kunde&&typeof kdName==='function'&&!w.o_name?kdName(w.o_kunde):w.o_name;
  LV.form=null;
  await lvAendern(l=>{ lvW(l).eigentuemer.push({id:LVK.neueId('O'),einheitId:w.o_einheit,name,kundeId:w.o_kunde||null,anschrift:w.o_anschrift,email:w.o_email,telefon:w.o_telefon,seit:w.o_seit}); },'Eigentümer eingetragen.');
}
async function lvEigLoeschen(id){ if(!confirm('Diesen Eigentümereintrag löschen?')) return; await lvAendern(l=>{ lvW(l).eigentuemer=l.weg.eigentuemer.filter(o=>o.id!==id); },'Eintrag gelöscht.'); }

/* ---------- Wirtschaftsplan & Hausgeld ---------- */
function lvWegPlan(l,jahr){ return ((l.weg||{}).wirtschaftsplaene||[]).find(p=>+p.jahr===+jahr)||null; }
function lvWegHausgeldHtml(l){
  const j=lvWegJahr(), plan=lvWegPlan(l,j), pf=LVW.planFuerJahr(l,j), st=lvHeute();
  const jahre=[...new Set([j-1,j,j+1].concat(((l.weg||{}).wirtschaftsplaene||[]).map(p=>+p.jahr)))].sort((a,b)=>b-a);
  const kopf='<div class="lv-nk-kopf"><div class="field"><label for="lv_weg_jahr">Wirtschaftsjahr</label><select id="lv_weg_jahr" onchange="LV.wegJahr=+this.value;LV.form=null;lvRender()">'+jahre.map(x=>'<option value="'+x+'"'+(x===j?' selected':'')+'>'+x+'</option>').join('')+'</select></div></div>';
  let html=kopf;
  if(!plan){
    html+=lvBox('Wirtschaftsplan '+j,(pf?'<div class="lv-hinweisbox">Für '+j+' gilt der Wirtschaftsplan '+pf.plan.jahr+' fort (Fortgeltungsbeschluss).</div>':'<p>Für '+j+' ist noch kein Wirtschaftsplan angelegt.</p>')
      +'<div class="mdb-actions"><button class="primary" onclick="lvWegPlanNeu('+j+',false)" data-ic="plus">Wirtschaftsplan '+j+' anlegen</button>'
      +(lvWegPlan(l,j-1)?'<button class="secondary" onclick="lvWegPlanNeu('+j+',true)">Positionen aus '+(j-1)+' übernehmen</button>':'')+'</div>');
  } else {
    let form='';
    if(LV.form&&LV.form.typ==='wegpos') form=lvFormRahmen('Position hinzufügen',lvFelder(lvWegPosFelder(l),'three'),'lvWegPosSpeichern('+j+')');
    const pos=(plan.positionen||[]).map(p=>'<tr><td>'+lvH(p.text)+'<br><span class="lv-klein">'+lvH((ImmoNebenkosten.KAT[p.kategorie]||{}).name||'')+'</span></td><td>'+lvH(LVW.SCHLUESSEL[p.schluessel]||'')+(p.einheitId?' · '+lvH(lvEinheitName(lvEinheit(l,p.einheitId))):'')+'</td><td class="r">'+lvEur(p.betrag)+'</td>'
      +'<td class="lv-aktionen">'+(plan.beschlossenAm?'':'<button class="secondary" onclick="lvWegPosLoeschen('+j+',\''+lvQ(p.id)+'\')" aria-label="Position löschen" data-ic="trash"></button>')+'</td></tr>');
    const summe=(plan.positionen||[]).reduce((s,p)=>s+p.betrag,0);
    pos.push('<tr class="strong"><td>Zuführung zur Erhaltungsrücklage (nach MEA)</td><td></td><td class="r">'+lvEur(plan.ruecklage||0)+'</td><td></td></tr><tr class="strong"><td>Summe</td><td></td><td class="r">'+lvEur(summe+(plan.ruecklage||0))+'</td><td></td></tr>');
    const ep=LVW.einzelplaene(l,plan).map(x=>'<tr><td class="strong">'+lvH(lvEinheitName(lvEinheit(l,x.einheitId)))+'<br><span class="lv-klein">'+lvH(lvEigentuemerText(l,x.einheitId,j+'-01-01'))+'</span></td><td class="r">'+lvEur(x.kosten)+'</td><td class="r">'+lvEur(x.ruecklage)+'</td><td class="r">'+lvEur(x.jahr)+'</td><td class="r strong">'+lvEur(x.monat)+'</td></tr>');
    html+=form+lvBox('Wirtschaftsplan '+j+(plan.beschlossenAm?' — beschlossen am '+LVK.datumDE(plan.beschlossenAm):' — Entwurf'),
      lvTabelle(['Position','Verteilung',{t:'Betrag',r:1},''],pos)
      +'<div class="grid four lv-form">'+[{id:'wp_ruecklage',label:'Zuführung Erhaltungsrücklage (€)',typ:'betrag',wert:plan.ruecklage,min:0},{id:'wp_beschlossen',label:'Beschlossen am',typ:'datum',wert:plan.beschlossenAm},
        {id:'wp_fortgeltung',label:'Fortgeltung bis zum nächsten Plan beschlossen',typ:'check',wert:plan.fortgeltung}].map(lvFeld).join('')
      +'<div class="field"><label>&nbsp;</label><button class="secondary" onclick="lvWegPlanKopf('+j+')" data-ic="check">Übernehmen</button></div></div><div id="lv_formfehler" class="lv-warn" hidden></div>'
      +'<div class="mdb-actions">'+(plan.beschlossenAm?'':'<button class="primary" onclick="LV.form={typ:\'wegpos\'};lvRender()" data-ic="plus">Position hinzufügen</button>')
      +'<button class="secondary" onclick="lvWegPlanWord('+j+')" data-ic="file-text">Einzelwirtschaftspläne (Word)</button><button class="secondary" onclick="lvWegPlanLoeschen('+j+')" data-ic="trash">Plan löschen</button></div>'
      +'<p class="hint">Hausgeld wird erst ab dem Beschluss als Soll gestellt. Ohne abweichenden Beschluss werden die Kosten nach Miteigentumsanteilen verteilt (§ 16 Abs. 2 WEG).</p>')
      +lvBox('Einzelwirtschaftspläne '+j,lvTabelle(['Einheit / Eigentümer',{t:'Kostenanteil',r:1},{t:'Rücklage',r:1},{t:'Hausgeld im Jahr',r:1},{t:'Hausgeld / Monat',r:1}],ep));
  }
  // Hausgeldkonten
  const konten=(l.einheiten||[]).map(e=>({e,k:LVW.hausgeldKonto(l,e.id,st)}));
  const kz=konten.map(({e,k})=>'<tr class="lv-klick" onclick="LV.wegEinheit=\''+lvQ(e.id)+'\';lvRender()"><td class="strong">'+lvH(lvEinheitName(e))+'<br><span class="lv-klein">'+lvH(lvEigentuemerText(l,e.id))+'</span></td>'
    +'<td class="r">'+lvEur(k.summe.soll)+'</td><td class="r">'+lvEur(k.summe.bezahlt)+'</td><td class="r">'+(k.summe.rueckstand>0?lvBadge(lvEur(k.summe.rueckstand),'bad'):'–')+'</td><td class="r">'+(k.summe.guthaben>0?lvEur(k.summe.guthaben):'–')+'</td></tr>');
  html+=lvBox('Hausgeldkonten (Stand '+LVK.datumDE(st)+')',lvTabelle(['Einheit / Eigentümer',{t:'fällig',r:1},{t:'bezahlt',r:1},{t:'Rückstand',r:1},{t:'Guthaben',r:1}],kz)+lvWegZahlungForm(l)+lvWegSonderumlageForm(l));
  if(LV.wegEinheit&&lvEinheit(l,LV.wegEinheit)){ const k=LVW.hausgeldKonto(l,LV.wegEinheit,st);
    html+=lvBox('Hausgeldkonto '+lvEinheitName(lvEinheit(l,LV.wegEinheit)),lvTabelle(['Posten','fällig',{t:'Soll',r:1},{t:'bezahlt',r:1},{t:'offen',r:1},'Stand'],k.posten.slice().reverse().map(p=>'<tr><td>'+lvH(p.text||p.art)+'</td><td>'+lvH(LVK.datumDE(p.faellig))+'</td><td class="r">'+lvEur(p.betrag)+'</td><td class="r">'+lvEur(p.bezahlt)+'</td><td class="r">'+(p.offen>0?lvEur(p.offen):'–')+'</td><td>'+lvBadge((LV_STATUS[p.status]||[p.status])[0],(LV_STATUS[p.status]||[,''])[1])+'</td></tr>'),'Noch keine Sollstellung — erst mit beschlossenem Wirtschaftsplan.')
      +lvTabelle(['Datum',{t:'Betrag',r:1},'Art','Text',''],((l.weg||{}).zahlungen||[]).filter(z=>z.einheitId===LV.wegEinheit).sort((a,b)=>a.datum<b.datum?1:-1).map(z=>'<tr><td>'+lvH(LVK.datumDE(z.datum))+'</td><td class="r">'+lvEur(z.betrag)+'</td><td>'+lvH(z.art)+'</td><td>'+lvH(z.text)+'</td><td><button class="secondary" onclick="lvWegZahlungLoeschen(\''+lvQ(z.id)+'\')" aria-label="Zahlung löschen" data-ic="trash"></button></td></tr>'),'Noch keine Zahlungen.')); }
  return html;
}
function lvWegPosFelder(l){ return [{id:'wpp_text',label:'Position',pflicht:true,platzhalter:'z. B. Gebäudeversicherung'},{id:'wpp_kat',label:'Kostenart',typ:'wahl',optionen:[['','–']].concat(ImmoNebenkosten.KATEGORIEN.map(k=>[k.key,(k.nr?k.nr+'. ':'')+k.name]))},
  {id:'wpp_betrag',label:'Betrag im Jahr (€)',typ:'betrag',pflicht:true,min:0},{id:'wpp_schl',label:'Verteilung',typ:'wahl',wert:'mea',optionen:Object.entries(LVW.SCHLUESSEL)},
  {id:'wpp_einheit',label:'Einheit bei direkter Zuordnung',typ:'wahl',optionen:[['','–']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]))}]; }
async function lvWegPlanNeu(j,uebernehmen){
  await lvAendern(l=>{ const W=lvW(l); const alt=uebernehmen?W.wirtschaftsplaene.find(p=>+p.jahr===j-1):null;
    W.wirtschaftsplaene.push({id:LVK.neueId('WP'),jahr:j,ruecklage:alt?alt.ruecklage:0,beschlossenAm:null,fortgeltung:true,positionen:alt?alt.positionen.map(p=>Object.assign({},p,{id:LVK.neueId('WX')})):[]}); },'Wirtschaftsplan '+j+' angelegt.');
}
async function lvWegPosSpeichern(j){
  const l=lvAktiv(), r=lvFormLesen(lvWegPosFelder(l)), w=r.werte;
  if(w.wpp_schl==='direkt'&&!w.wpp_einheit){ r.ok=false; r.fehler.push('Bei direkter Zuordnung bitte die Einheit wählen'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  await lvAendern(l=>{ lvWegPlan(l,j).positionen.push({id:LVK.neueId('WX'),text:w.wpp_text,kategorie:w.wpp_kat||null,betrag:LVK.r2(w.wpp_betrag),schluessel:w.wpp_schl,einheitId:w.wpp_schl==='direkt'?w.wpp_einheit:null}); },'Position hinzugefügt.');
  LV.form={typ:'wegpos'}; lvRender();
}
async function lvWegPosLoeschen(j,id){ await lvAendern(l=>{ const p=lvWegPlan(l,j); p.positionen=p.positionen.filter(x=>x.id!==id); },'Position gelöscht.'); }
async function lvWegPlanKopf(j){
  const r=lvFormLesen([{id:'wp_ruecklage',label:'Zuführung',typ:'betrag',min:0},{id:'wp_beschlossen',label:'Beschlossen am',typ:'datum'},{id:'wp_fortgeltung',label:'Fortgeltung',typ:'check'}]), w=r.werte;
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  await lvAendern(l=>{ Object.assign(lvWegPlan(l,j),{ruecklage:w.wp_ruecklage||0,beschlossenAm:w.wp_beschlossen,fortgeltung:w.wp_fortgeltung}); },w.wp_beschlossen?'Wirtschaftsplan beschlossen — Hausgeld wird ab '+j+' als Soll gestellt.':'Gespeichert.');
}
async function lvWegPlanLoeschen(j){ if(!confirm('Wirtschaftsplan '+j+' löschen? Die Hausgeld-Sollstellung dieses Jahres entfällt.')) return; await lvAendern(l=>{ l.weg.wirtschaftsplaene=l.weg.wirtschaftsplaene.filter(p=>+p.jahr!==j); },'Wirtschaftsplan gelöscht.'); }
function lvWegZahlungForm(l){
  return '<details class="lv-details"><summary>Hausgeld- oder Sonderumlagezahlung buchen</summary><div class="grid four lv-form">'
    +[{id:'wz_einheit',label:'Einheit',typ:'wahl',wert:LV.wegEinheit||'',optionen:[['','– bitte wählen –']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]))},{id:'wz_datum',label:'Eingang am',typ:'datum',wert:lvHeute()},
      {id:'wz_betrag',label:'Betrag (€)',typ:'betrag'},{id:'wz_art',label:'Art',typ:'wahl',optionen:[['hausgeld','Hausgeld'],['sonderumlage','Sonderumlage'],['abrechnung','Abrechnungsspitze'],['sonstig','Sonstiges']]},{id:'wz_text',label:'Text',breit:true}].map(lvFeld).join('')
    +'</div><div class="mdb-actions"><button class="secondary" onclick="lvWegZahlung()" data-ic="check">Zahlung buchen</button></div></details>';
}
async function lvWegZahlung(){
  const r=lvFormLesen([{id:'wz_einheit',label:'Einheit',typ:'wahl',pflicht:true},{id:'wz_datum',label:'Eingang am',typ:'datum',pflicht:true},{id:'wz_betrag',label:'Betrag',typ:'betrag',pflicht:true},{id:'wz_art',label:'Art',typ:'wahl'},{id:'wz_text',label:'Text'}]), w=r.werte;
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  LV.wegEinheit=w.wz_einheit;
  await lvAendern(l=>{ lvW(l).zahlungen.push({id:LVK.neueId('WZ'),einheitId:w.wz_einheit,datum:w.wz_datum,betrag:LVK.r2(w.wz_betrag),art:w.wz_art,monat:'',text:w.wz_text}); },'Zahlung gebucht.');
}
async function lvWegZahlungLoeschen(id){ if(!confirm('Zahlung löschen?')) return; await lvAendern(l=>{ l.weg.zahlungen=l.weg.zahlungen.filter(z=>z.id!==id); },'Zahlung gelöscht.'); }
function lvWegSonderumlageForm(l){
  return '<details class="lv-details"><summary>Sonderumlage beschließen und verteilen</summary><div class="grid four lv-form">'
    +[{id:'su_text',label:'Zweck',platzhalter:'z. B. Fassadensanierung'},{id:'su_betrag',label:'Gesamtbetrag (€)',typ:'betrag',min:0},{id:'su_faellig',label:'Fällig am',typ:'datum'},
      {id:'su_schl',label:'Verteilung',typ:'wahl',wert:'mea',optionen:Object.entries(LVW.SCHLUESSEL).filter(x=>x[0]!=='direkt')}].map(lvFeld).join('')
    +'</div><div class="mdb-actions"><button class="secondary" onclick="lvWegSonderumlage()" data-ic="check">Sonderumlage eintragen</button></div></details>';
}
async function lvWegSonderumlage(){
  const r=lvFormLesen([{id:'su_text',label:'Zweck',pflicht:true},{id:'su_betrag',label:'Gesamtbetrag',typ:'betrag',pflicht:true,min:0},{id:'su_faellig',label:'Fällig am',typ:'datum',pflicht:true},{id:'su_schl',label:'Verteilung',typ:'wahl'}]), w=r.werte;
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  await lvAendern(l=>{ lvW(l).sonderumlagen.push({id:LVK.neueId('SU'),faellig:w.su_faellig,betrag:LVK.r2(w.su_betrag),schluessel:w.su_schl,text:w.su_text}); },'Sonderumlage eingetragen und auf die Hausgeldkonten verteilt.');
}
function lvWegPlanWord(j){
  const l=lvAktiv(), plan=lvWegPlan(l,j); if(!plan) return;
  const ab=LV.einst||{}, ep=LVW.einzelplaene(l,plan); let b=[];
  ep.forEach((x,i)=>{ const e=lvEinheit(l,x.einheitId);
    if(i) b.push({typ:'umbruch'});
    if(ab.name) b.push({typ:'p',text:[ab.name,ab.anschrift].filter(Boolean).join(' · ')});
    b.push({typ:'h2',text:'Einzelwirtschaftsplan '+j+' — '+(l.name||'')+', '+lvEinheitName(e)});
    b.push({typ:'p',text:'Eigentümer: '+lvEigentuemerText(l,e.id,j+'-01-01')+' · Miteigentumsanteil '+lvZahl(e.mea,4)+' von '+lvZahl(LVW.meaGesamt(l),4)});
    const z=[[{text:'Position'},{text:'Gesamt',rechts:true},{text:'Verteilung'},{text:'Ihr Anteil',rechts:true}]];
    plan.positionen.forEach(p=>{ const a=LVW.verteilen(l,p.betrag,p.schluessel,p.einheitId)[e.id]||0; z.push([{text:p.text},{text:lvEur(p.betrag),rechts:true},{text:LVW.SCHLUESSEL[p.schluessel]},{text:lvEur(a),rechts:true}]); });
    z.push([{text:'Zuführung zur Erhaltungsrücklage'},{text:lvEur(plan.ruecklage),rechts:true},{text:'Miteigentumsanteile'},{text:lvEur(x.ruecklage),rechts:true}]);
    z.push(Object.assign([{text:'Hausgeld im Jahr'},{text:''},{text:''},{text:lvEur(x.jahr),rechts:true}],{fett:true}),Object.assign([{text:'monatlicher Vorschuss'},{text:''},{text:'fällig zum 3. Werktag'},{text:lvEur(x.monat),rechts:true}],{fett:true}));
    b.push({typ:'tabelle',zeilen:z});
    if(plan.beschlossenAm) b.push({typ:'p',text:'Beschlossen in der Eigentümerversammlung am '+LVK.datumDE(plan.beschlossenAm)+(plan.fortgeltung?'; gilt bis zum Beschluss eines neuen Wirtschaftsplans fort.':'.')});
  });
  lvHerunterladen(ImmoOffice.docx(b,{titel:'Einzelwirtschaftspläne '+j}),LV_DOCX,lvDateiname('Einzelwirtschaftsplaene '+j+' '+l.name)+'.docx');
}

/* ---------- Jahresabrechnung ---------- */
function lvWegAbr(l,j){ return ((l.weg||{}).abrechnungen||[]).find(a=>+a.jahr===+j)||null; }
function lvWegAbrFelder(l,a){ a=a||{}; const h=a.heiz||{};
  return [{id:'ja_ruecklage',label:'Erhaltungsrücklage am 01.01. (€)',typ:'betrag',wert:a.ruecklageAnfang},{id:'ja_konto',label:'Kontostand am 31.12. (€)',typ:'betrag',wert:a.kontoEnde},
    {id:'ja_verb',label:'Verbindlichkeiten am 31.12. (€)',typ:'betrag',wert:a.verbindlichkeiten,min:0}]
    .concat((l.einheiten||[]).map(e=>({id:'jh_'+e.id,label:'Heizkosten '+lvEinheitName(e)+' laut Messdienst (€)',typ:'betrag',min:0,wert:h[e.id]}))); }
function lvWegAbrechnungHtml(l){
  const j=lvWegAbJahr(), a=lvWegAbr(l,j);
  const kopf='<div class="lv-nk-kopf"><div class="field"><label for="lv_weg_abjahr">Abrechnungsjahr</label><select id="lv_weg_abjahr" onchange="LV.wegAbJahr=+this.value;lvRender()">'
    +[j+1,j,j-1,j-2].filter(x=>x<=+lvHeute().slice(0,4)).map(x=>'<option value="'+x+'"'+(x===j?' selected':'')+'>'+x+'</option>').join('')+'</select></div></div>';
  let html=kopf+lvBox('Jahresabrechnung '+j+' einrichten','<p class="hint">Grundlage sind die Kosten '+j+' im Reiter „Nebenkosten“ (aus der Rücklage bezahlte Kosten dort kennzeichnen) und der beschlossene Wirtschaftsplan. Heizkosten je Einheit aus der Abrechnung des Messdienstes eintragen; sonst werden sie nach MEA verteilt.</p>'
    +'<div id="lv_formfehler" class="lv-warn" hidden></div>'+lvFelder(lvWegAbrFelder(l,a),'four')+(a&&a.gebuchtAm?'':'<div class="mdb-actions"><button class="primary" onclick="lvWegAbrSpeichern('+j+')" data-ic="calc">Jahresabrechnung berechnen</button></div>'));
  if(!a) return html;
  const r=LVW.jahresabrechnung(l,j,{ruecklageAnfang:a.ruecklageAnfang,kontoEnde:a.kontoEnde,verbindlichkeiten:a.verbindlichkeiten,heiz:a.heiz});
  const ez=r.einzel.map(x=>'<tr><td class="strong">'+lvH(lvEinheitName(lvEinheit(l,x.einheitId)))+'<br><span class="lv-klein">'+lvH(x.eigentuemer.join(', '))+'</span></td><td class="r">'+lvEur(x.kosten)+'<br><span class="lv-klein">umlagefähig '+lvEur(x.umlagefaehig)+'</span></td>'
    +'<td class="r">'+lvEur(x.zufuehrung)+'</td><td class="r">'+lvEur(x.vorschussSoll)+'</td><td class="r strong">'+(x.spitze>0?lvBadge('Nachschuss '+lvEur(x.spitze),'bad'):x.spitze<0?lvBadge('Guthaben '+lvEur(-x.spitze),'ok'):'–')+'</td><td class="r">'+lvEur(x.gezahlt)+'</td></tr>');
  const pz=r.positionen.map(p=>'<tr><td>'+lvH(p.text)+'</td><td>'+lvH(p.schluessel==='ruecklage'?'aus der Erhaltungsrücklage':p.schluessel==='heiz'?'laut Messdienst':LVW.SCHLUESSEL[p.schluessel]||'')+'</td><td class="r">'+lvEur(p.gesamt)+'</td></tr>');
  const v=r.vermoegen, rl=r.ruecklage;
  html+=lvBox('Ergebnis Jahresabrechnung '+j+(a.beschlossenAm?' — beschlossen am '+LVK.datumDE(a.beschlossenAm):''),(r.hinweise.length?'<div class="lv-hinweisbox">'+r.hinweise.map(lvH).join('<br>')+'</div>':'')
    +(a.gebuchtAm?'<div class="lv-ok">Abrechnungsspitzen am '+lvH(LVK.datumDE(a.gebuchtAm))+' in die Hausgeldkonten gebucht (fällig '+lvH(LVK.datumDE(a.faellig))+'). <button class="secondary" onclick="lvWegAbrStorno('+j+')">Buchung zurücknehmen</button></div>':'')
    +lvTabelle(['Einheit / Eigentümer',{t:'Kostenanteil',r:1},{t:'Rücklage (Soll)',r:1},{t:'Vorschüsse (Soll)',r:1},{t:'Abrechnungsspitze',r:1},{t:'gezahlt',r:1}],ez)
    +'<p class="hint">Einnahmen '+lvEur(r.gesamt.einnahmen)+' · Ausgaben '+lvEur(r.gesamt.ausgaben)+' (davon aus der Rücklage '+lvEur(r.gesamt.entnahmenRuecklage)+') · verteilt '+lvEur(r.gesamt.verteilt)+' · Summe der Spitzen '+lvEur(r.spitzeSumme)+'</p>'
    +'<h3 class="sep">Vermögensbericht (§ 28 Abs. 4 WEG)</h3><dl class="lv-dl"><dt>Erhaltungsrücklage 01.01.</dt><dd>'+lvEur(rl.anfang)+'</dd><dt>+ Zuführung (Soll)</dt><dd>'+lvEur(rl.zufuehrung)+'</dd><dt>− Entnahmen</dt><dd>'+lvEur(rl.entnahmen)+'</dd><dt><b>Erhaltungsrücklage 31.12.</b></dt><dd><b>'+lvEur(rl.ende)+'</b></dd>'
    +'<dt>Kontostand 31.12.</dt><dd>'+(v.kontostand!=null?lvEur(v.kontostand):'–')+'</dd><dt>Forderungen (Hausgeldrückstände)</dt><dd>'+lvEur(v.forderungen)+'</dd><dt>Verbindlichkeiten</dt><dd>'+(v.verbindlichkeiten!=null?lvEur(v.verbindlichkeiten):'–')+'</dd></dl>'
    +'<div class="mdb-actions"><button class="secondary" onclick="lvWegAbrWord('+j+')" data-ic="file-text">Abrechnung und Einzelabrechnungen (Word)</button></div>'
    +(a.gebuchtAm?'':'<h3 class="sep">Beschluss vermerken und Spitzen buchen</h3><p class="hint">Nach dem Beschluss der Eigentümer (§ 28 Abs. 2 WEG) werden Nachschüsse und Guthaben in die Hausgeldkonten gebucht.</p>'
      +lvFelder([{id:'jb_beschluss',label:'Beschlossen am',typ:'datum',wert:lvHeute()},{id:'jb_faellig',label:'Fällig am',typ:'datum',wert:LVK.isoTag(LVK.tagNr(lvHeute())+30)}],'four')
      +'<div class="mdb-actions"><button class="primary" onclick="lvWegAbrBuchen('+j+')" data-ic="check">Beschluss vermerken und buchen</button></div>'))
    +lvBox('Gesamtabrechnung: Ausgaben '+j,lvTabelle(['Position','Verteilung',{t:'Betrag',r:1}],pz,'Keine Kosten im Jahr.'));
  return html;
}
async function lvWegAbrSpeichern(j){
  const l=lvAktiv(), r=lvFormLesen(lvWegAbrFelder(l)), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const heiz={}; (l.einheiten||[]).forEach(e=>{ if(w['jh_'+e.id]!=null) heiz[e.id]=w['jh_'+e.id]; });
  await lvAendern(l=>{ const W=lvW(l); let a=W.abrechnungen.find(x=>+x.jahr===j); if(!a){ a={id:LVK.neueId('JA'),jahr:j}; W.abrechnungen.push(a); }
    Object.assign(a,{ruecklageAnfang:w.ja_ruecklage,kontoEnde:w.ja_konto,verbindlichkeiten:w.ja_verb,heiz}); },'Jahresabrechnung berechnet.');
}
async function lvWegAbrBuchen(j){
  const r=lvFormLesen([{id:'jb_beschluss',label:'Beschlossen am',typ:'datum',pflicht:true},{id:'jb_faellig',label:'Fällig am',typ:'datum',pflicht:true}]), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const l=lvAktiv(), a=lvWegAbr(l,j), ja=LVW.jahresabrechnung(l,j,{ruecklageAnfang:a.ruecklageAnfang,kontoEnde:a.kontoEnde,verbindlichkeiten:a.verbindlichkeiten,heiz:a.heiz});
  const sp={}; ja.einzel.forEach(x=>{ if(x.spitze) sp[x.einheitId]=x.spitze; });
  await lvAendern(l=>{ Object.assign(lvWegAbr(l,j),{beschlossenAm:w.jb_beschluss,faellig:w.jb_faellig,gebuchtAm:lvHeute(),spitzen:sp}); },'Beschluss vermerkt; Nachschüsse und Guthaben stehen in den Hausgeldkonten.');
}
async function lvWegAbrStorno(j){ if(!confirm('Buchung der Abrechnungsspitzen zurücknehmen?')) return; await lvAendern(l=>{ Object.assign(lvWegAbr(l,j),{gebuchtAm:null,beschlossenAm:null,faellig:null,spitzen:{}}); },'Buchung zurückgenommen.'); }
function lvWegAbrWord(j){
  const l=lvAktiv(), a=lvWegAbr(l,j); if(!a) return;
  const r=LVW.jahresabrechnung(l,j,{ruecklageAnfang:a.ruecklageAnfang,kontoEnde:a.kontoEnde,verbindlichkeiten:a.verbindlichkeiten,heiz:a.heiz}), ab=LV.einst||{};
  const b=[{typ:'h1',text:'Jahresabrechnung '+j+' — '+(l.name||'')},{typ:'p',text:lvAdresse(l)+(ab.name?' · Verwaltung: '+ab.name:'')}];
  b.push({typ:'h2',text:'Gesamtabrechnung (Einnahmen und Ausgaben)'});
  b.push({typ:'tabelle',zeilen:[[{text:'Position'},{text:'Verteilung'},{text:'Betrag',rechts:true}]].concat(r.positionen.map(p=>[{text:p.text},{text:p.schluessel==='ruecklage'?'aus der Erhaltungsrücklage':p.schluessel==='heiz'?'laut Messdienst':LVW.SCHLUESSEL[p.schluessel]||''},{text:lvEur(p.gesamt),rechts:true}]))
    .concat([Object.assign([{text:'Ausgaben gesamt'},{text:''},{text:lvEur(r.gesamt.ausgaben),rechts:true}],{fett:true}),[{text:'Einnahmen (Hausgeld und Umlagen)'},{text:''},{text:lvEur(r.gesamt.einnahmen),rechts:true}]])});
  b.push({typ:'h2',text:'Vermögensbericht (§ 28 Abs. 4 WEG)'});
  b.push({typ:'tabelle',zeilen:[[{text:'Erhaltungsrücklage am 01.01.'},{text:lvEur(r.ruecklage.anfang),rechts:true}],[{text:'Zuführung laut Wirtschaftsplan'},{text:lvEur(r.ruecklage.zufuehrung),rechts:true}],[{text:'Entnahmen'},{text:'− '+lvEur(r.ruecklage.entnahmen),rechts:true}],
    Object.assign([{text:'Erhaltungsrücklage am 31.12.'},{text:lvEur(r.ruecklage.ende),rechts:true}],{fett:true}),[{text:'Kontostand am 31.12.'},{text:r.vermoegen.kontostand!=null?lvEur(r.vermoegen.kontostand):'–',rechts:true}],
    [{text:'Forderungen gegen Eigentümer (Hausgeldrückstände)'},{text:lvEur(r.vermoegen.forderungen),rechts:true}],[{text:'Verbindlichkeiten'},{text:r.vermoegen.verbindlichkeiten!=null?lvEur(r.vermoegen.verbindlichkeiten):'–',rechts:true}]]});
  r.einzel.forEach(x=>{ const e=lvEinheit(l,x.einheitId);
    b.push({typ:'umbruch'},{typ:'h2',text:'Einzelabrechnung '+j+' — '+lvEinheitName(e)});
    b.push({typ:'p',text:'Eigentümer: '+x.eigentuemer.join(', ')+' · Miteigentumsanteil '+lvZahl(x.mea,4)+' von '+lvZahl(LVW.meaGesamt(l),4)});
    const z=[[{text:'Position'},{text:'Gesamt',rechts:true},{text:'Verteilung'},{text:'Ihr Anteil',rechts:true}]];
    r.positionen.filter(p=>p.schluessel!=='ruecklage').forEach(p=>z.push([{text:p.text+(p.umlagefaehig?'':' (nicht umlagefähig)')},{text:lvEur(p.gesamt),rechts:true},{text:p.schluessel==='heiz'?'laut Messdienst':LVW.SCHLUESSEL[p.schluessel]||''},{text:lvEur(x.positionen[p.id]||0),rechts:true}]));
    z.push(Object.assign([{text:'Ihr Kostenanteil'},{text:''},{text:''},{text:lvEur(x.kosten),rechts:true}],{fett:true}),[{text:'Zuführung zur Erhaltungsrücklage'},{text:''},{text:'Wirtschaftsplan'},{text:lvEur(x.zufuehrung),rechts:true}],
      [{text:'abzüglich Vorschüsse laut Wirtschaftsplan'},{text:''},{text:''},{text:'− '+lvEur(x.vorschussSoll),rechts:true}],Object.assign([{text:x.spitze>=0?'Nachschuss (Abrechnungsspitze)':'Guthaben (Abrechnungsspitze)'},{text:''},{text:''},{text:lvEur(Math.abs(x.spitze)),rechts:true}],{fett:true}));
    b.push({typ:'tabelle',zeilen:z});
    b.push({typ:'p',text:'Davon auf Mieter umlagefähige Betriebskosten: '+lvEur(x.umlagefaehig)+(x.p35a?' · Arbeitskosten nach § 35a EStG (Ihr Anteil): '+lvEur(x.p35a):'')+'. Tatsächlich gezahlte Vorschüsse '+j+': '+lvEur(x.gezahlt)+' — Rückstände aus Vorschüssen bleiben gesondert geschuldet.'});
  });
  lvHerunterladen(ImmoOffice.docx(b,{titel:'Jahresabrechnung '+j}),LV_DOCX,lvDateiname('Jahresabrechnung '+j+' '+l.name)+'.docx');
}

/* ---------- Versammlungen ---------- */
function lvWegVers(l,id){ return ((l.weg||{}).versammlungen||[]).find(v=>v.id===id)||null; }
function lvVersFelder(v){ v=v||{}; return [{id:'vs_datum',label:'Datum',typ:'datum',wert:v.datum,pflicht:true},{id:'vs_uhrzeit',label:'Uhrzeit',wert:v.uhrzeit,platzhalter:'18:30'},{id:'vs_ort',label:'Ort',wert:v.ort},
  {id:'vs_art',label:'Art',typ:'wahl',wert:v.art||'ordentlich',optionen:[['ordentlich','ordentliche Versammlung'],['ausserordentlich','außerordentliche Versammlung']]},
  {id:'vs_einladung',label:'Einladung versandt am',typ:'datum',wert:v.einladungAm},{id:'vs_leitung',label:'Versammlungsleitung',wert:v.leitung},{id:'vs_protokoll',label:'Protokoll',wert:v.protokoll}]; }
function lvTopFelder(){ return [{id:'tp_titel',label:'Tagesordnungspunkt',pflicht:true},{id:'tp_typ',label:'Art',typ:'wahl',optionen:[['beschluss','Beschluss'],['info','Information / Bericht']]},
  {id:'tp_mehrheit',label:'Erforderliche Mehrheit',typ:'wahl',optionen:Object.entries(LVW.MEHRHEITEN)},{id:'tp_antrag',label:'Beschlussantrag (Wortlaut)',typ:'textarea',breit:true,zeilen:3}]; }
function lvWegVersammlungenHtml(l){
  const W=l.weg||{};
  let form='';
  if(LV.form&&LV.form.typ==='versammlung'){ const v=LV.form.id?lvWegVers(l,LV.form.id):null; form=lvFormRahmen(v?'Versammlung bearbeiten':'Versammlung planen',lvFelder(lvVersFelder(v),'four'),'lvVersSpeichern(\''+lvQ(v?v.id:'')+'\')'); }
  const v=LV.wegVersammlung?lvWegVers(l,LV.wegVersammlung):null;
  if(v) return form+lvWegVersammlungHtml(l,v);
  const zeilen=(W.versammlungen||[]).slice().sort((a,b)=>a.datum<b.datum?1:-1).map(x=>{ const f=LVW.einladungsfrist(x.einladungAm,x.datum);
    return '<tr class="lv-klick" onclick="LV.wegVersammlung=\''+lvQ(x.id)+'\';LV.form=null;lvRender()"><td class="strong">'+lvH(LVK.datumDE(x.datum))+(x.uhrzeit?' '+lvH(x.uhrzeit)+' Uhr':'')+'</td><td>'+lvH(x.art==='ausserordentlich'?'außerordentlich':'ordentlich')+'</td>'
      +'<td>'+(x.einladungAm?(f.ok?lvBadge('Einladung '+LVK.datumDE(x.einladungAm),'ok'):lvBadge('Frist nur '+f.tage+' Tage','bad')):lvBadge('Einladung offen','warn'))+'</td><td class="r">'+(x.tops||[]).length+'</td></tr>'; });
  return form+lvBox('Eigentümerversammlungen',lvTabelle(['Datum','Art','Einladung',{t:'TOPs',r:1}],zeilen,'Noch keine Versammlung erfasst.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'versammlung\',id:null};lvRender()" data-ic="plus">Versammlung planen</button></div>'
    +'<p class="hint">Mindestens einmal im Jahr (§ 24 Abs. 1 WEG); Einladung in Textform mindestens drei Wochen vorher (§ 24 Abs. 4 WEG). Jede ordnungsgemäß einberufene Versammlung ist beschlussfähig.</p>');
}
function lvWegVersammlungHtml(l,v){
  const f=LVW.einladungsfrist(v.einladungAm,v.datum), prinzip=(l.weg||{}).stimmprinzip||'kopf';
  let tform=''; if(LV.form&&LV.form.typ==='top') tform=lvFormRahmen('Tagesordnungspunkt hinzufügen',lvFelder(lvTopFelder(),'three'),'lvTopSpeichern(\''+lvQ(v.id)+'\')');
  const tops=(v.tops||[]).map((t,i)=>{
    let abst='';
    if(t.typ==='beschluss'){
      const r=LVW.abstimmung(l,t,v.datum,prinzip);
      abst='<div class="lv-stimmen">'+(l.einheiten||[]).map(e=>'<label class="field"><span class="lv-klein">'+lvH(lvEinheitName(e))+' · '+lvH(lvEigentuemerText(l,e.id,v.datum))+'</span><select id="lvs_'+lvH(t.id)+'_'+lvH(e.id)+'">'
        +[['','nicht vertreten'],['ja','Ja'],['nein','Nein'],['enthaltung','Enthaltung']].map(o=>'<option value="'+o[0]+'"'+((t.stimmen||{})[e.id]===o[0]||(!(t.stimmen||{})[e.id]&&!o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>').join('')+'</div>'
        +'<p class="hint">'+lvH(LVW.PRINZIPIEN[r.prinzip])+' · '+lvH(LVW.MEHRHEITEN[r.mehrheit])+'<br><b>Ja '+lvZahl(r.ja,4)+' · Nein '+lvZahl(r.nein,4)+' · Enthaltung '+lvZahl(r.enthaltung,4)+'</b>'+(r.ungueltig?' · ungültig '+r.ungueltig:'')+(r.mehrheit==='baulich21'?' · MEA der Ja-Stimmen '+lvZahl(r.meaJa,4)+' von '+lvZahl(r.meaGesamt,4):'')
        +' → '+(r.ja+r.nein+r.enthaltung>0?(r.angenommen?lvBadge('angenommen','ok'):lvBadge('abgelehnt','bad')):'noch keine Stimmen')+'</p>'+(r.hinweise.length?'<div class="lv-hinweisbox">'+r.hinweise.map(lvH).join('<br>')+'</div>':'')
        +'<div class="mdb-actions"><button class="secondary" onclick="lvStimmenSpeichern(\''+lvQ(v.id)+'\',\''+lvQ(t.id)+'\')">Stimmen speichern</button>'
        +(t.beschlussNr?lvBadge('Beschluss-Sammlung Nr. '+t.beschlussNr,'ok'):(r.ja+r.nein+r.enthaltung>0?'<button class="primary" onclick="lvBeschlussVerkuenden(\''+lvQ(v.id)+'\',\''+lvQ(t.id)+'\')" data-ic="check">Ergebnis verkünden und eintragen</button>':''))+'</div>';
    }
    return '<div class="mdb-box lv-top"><h3>TOP '+(i+1)+': '+lvH(t.titel)+'</h3>'+(t.antrag?'<p class="lv-antrag">'+lvH(t.antrag)+'</p>':'')+abst
      +'<div class="mdb-actions"><button class="secondary" onclick="lvTopLoeschen(\''+lvQ(v.id)+'\',\''+lvQ(t.id)+'\')" data-ic="trash">TOP entfernen</button></div></div>';
  }).join('');
  return tform+lvBox('Versammlung am '+LVK.datumDE(v.datum)+(v.uhrzeit?', '+v.uhrzeit+' Uhr':'')+(v.ort?' — '+v.ort:''),
    (v.einladungAm&&!f.ok?'<div class="lv-warn">Einladungsfrist nur '+f.tage+' Tage — mindestens drei Wochen sind vorgeschrieben (§ 24 Abs. 4 WEG); Beschlüsse sind anfechtbar.</div>':'')
    +'<div class="mdb-actions"><button class="secondary" onclick="LV.wegVersammlung=null;LV.form=null;lvRender()" data-ic="arrow-left">Alle Versammlungen</button><button class="secondary" onclick="LV.form={typ:\'versammlung\',id:\''+lvQ(v.id)+'\'};lvRender()">Bearbeiten</button>'
    +'<button class="secondary" onclick="LV.form={typ:\'top\'};lvRender()" data-ic="plus">Tagesordnungspunkt</button><button class="secondary" onclick="lvEinladungWord(\''+lvQ(v.id)+'\')" data-ic="file-text">Einladung (Word)</button>'
    +'<button class="secondary" onclick="lvNiederschriftWord(\''+lvQ(v.id)+'\')" data-ic="file-text">Niederschrift (Word)</button><button class="secondary" onclick="lvVersLoeschen(\''+lvQ(v.id)+'\')" data-ic="trash">Löschen</button></div>')+tops;
}
async function lvVersSpeichern(id){
  const r=lvFormLesen(lvVersFelder()), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const f=LVW.einladungsfrist(w.vs_einladung,w.vs_datum);
  if(w.vs_einladung&&!f.ok&&!confirm('Zwischen Einladung und Versammlung liegen nur '+f.tage+' Tage. Vorgeschrieben sind mindestens drei Wochen (§ 24 Abs. 4 WEG). Trotzdem speichern?')) return;
  const vid=id||LVK.neueId('VS'); LV.form=null; LV.wegVersammlung=vid;
  await lvAendern(l=>{ const W=lvW(l); let v=W.versammlungen.find(x=>x.id===vid); if(!v){ v={id:vid,tops:[]}; W.versammlungen.push(v); }
    Object.assign(v,{datum:w.vs_datum,uhrzeit:w.vs_uhrzeit,ort:w.vs_ort,art:w.vs_art,einladungAm:w.vs_einladung,leitung:w.vs_leitung,protokoll:w.vs_protokoll}); },'Versammlung gespeichert.');
}
async function lvVersLoeschen(id){ if(!confirm('Versammlung löschen? Bereits eingetragene Beschlüsse bleiben in der Beschluss-Sammlung.')) return; LV.wegVersammlung=null; await lvAendern(l=>{ l.weg.versammlungen=l.weg.versammlungen.filter(v=>v.id!==id); },'Versammlung gelöscht.'); }
async function lvTopSpeichern(vid){
  const r=lvFormLesen(lvTopFelder()), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  LV.form=null;
  await lvAendern(l=>{ lvWegVers(l,vid).tops.push({id:LVK.neueId('T'),titel:w.tp_titel,antrag:w.tp_antrag,typ:w.tp_typ,mehrheit:w.tp_mehrheit,stimmen:{}}); },'Tagesordnungspunkt hinzugefügt.');
}
async function lvTopLoeschen(vid,tid){ if(!confirm('Tagesordnungspunkt entfernen?')) return; await lvAendern(l=>{ const v=lvWegVers(l,vid); v.tops=v.tops.filter(t=>t.id!==tid); },'Tagesordnungspunkt entfernt.'); }
async function lvStimmenSpeichern(vid,tid){
  const l=lvAktiv(), st={};
  (l.einheiten||[]).forEach(e=>{ const el=document.getElementById('lvs_'+tid+'_'+e.id); if(el&&el.value) st[e.id]=el.value; });
  await lvAendern(l=>{ lvWegVers(l,vid).tops.find(t=>t.id===tid).stimmen=st; },'Stimmen gespeichert.');
}
async function lvBeschlussVerkuenden(vid,tid){
  await lvStimmenSpeichern(vid,tid);
  const l=lvAktiv(), v=lvWegVers(l,vid), t=v.tops.find(x=>x.id===tid), r=LVW.abstimmung(l,t,v.datum,(l.weg||{}).stimmprinzip);
  if(!confirm('Ergebnis „'+(r.angenommen?'angenommen':'abgelehnt')+'“ verkünden und in die Beschluss-Sammlung eintragen?')) return;
  const nr=LVW.naechsteBeschlussNr(l);
  await lvAendern(l=>{ const W=lvW(l), v=W.versammlungen.find(x=>x.id===vid), t=v.tops.find(x=>x.id===tid);
    t.beschlussNr=nr;
    W.beschluesse.push({id:LVK.neueId('BS'),nr,datum:v.datum,art:'versammlung',versammlungId:v.id,wortlaut:t.titel+(t.antrag?': '+t.antrag:'')+' — Abstimmung: Ja '+lvZahl(r.ja,4)+', Nein '+lvZahl(r.nein,4)+', Enthaltung '+lvZahl(r.enthaltung,4)+' ('+LVW.PRINZIPIEN[r.prinzip].split(' —')[0]+')',
      ergebnis:r.angenommen?'angenommen':'abgelehnt',eingetragenAm:lvHeute(),vermerke:[]}); },'Beschluss Nr. '+nr+' verkündet und eingetragen.');
}
function lvEinladungWord(vid){
  const l=lvAktiv(), v=lvWegVers(l,vid), ab=LV.einst||{}, f=LVW.einladungsfrist(v.einladungAm,v.datum);
  const b=[];
  if(ab.name) b.push({typ:'p',text:[ab.name,ab.anschrift].filter(Boolean).join(' · ')});
  b.push({typ:'p',text:'An alle Wohnungseigentümerinnen und Wohnungseigentümer der Gemeinschaft '+(l.name||'')+', '+lvAdresse(l)});
  b.push({typ:'p',text:(ab.ort||l.ort||'')+((ab.ort||l.ort)?', ':'')+LVK.datumDE(v.einladungAm||lvHeute())});
  b.push({typ:'h2',text:'Einladung zur '+(v.art==='ausserordentlich'?'außerordentlichen':'ordentlichen')+' Eigentümerversammlung'});
  b.push({typ:'tabelle',zeilen:[[{text:'Datum'},{text:LVK.datumDE(v.datum)+(v.uhrzeit?', '+v.uhrzeit+' Uhr':'')}],[{text:'Ort'},{text:v.ort||'wird noch mitgeteilt'}]]});
  b.push({typ:'p',runs:[{text:'Tagesordnung',fett:true}]});
  (v.tops||[]).forEach((t,i)=>{ b.push({typ:'p',runs:[{text:'TOP '+(i+1)+': ',fett:true},{text:t.titel}]}); if(t.antrag) b.push({typ:'p',text:'Beschlussantrag: '+t.antrag}); });
  b.push({typ:'p',text:'Sie können sich in der Versammlung vertreten lassen. Die Vollmacht bedarf der Textform (§ 25 Abs. 3 WEG). Jede ordnungsgemäß einberufene Versammlung ist beschlussfähig.'});
  b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  if(v.einladungAm&&!f.ok) alert('Achtung: Zwischen Einladung und Versammlung liegen nur '+f.tage+' Tage (mindestens drei Wochen vorgeschrieben).');
  lvHerunterladen(ImmoOffice.docx(b,{titel:'Einladung Eigentümerversammlung'}),LV_DOCX,lvDateiname('Einladung Eigentuemerversammlung '+v.datum+' '+l.name)+'.docx');
}
function lvNiederschriftWord(vid){
  const l=lvAktiv(), v=lvWegVers(l,vid), prinzip=(l.weg||{}).stimmprinzip||'kopf', b=[];
  b.push({typ:'h1',text:'Niederschrift der Eigentümerversammlung'});
  b.push({typ:'p',text:(l.name||'')+', '+lvAdresse(l)});
  b.push({typ:'tabelle',zeilen:[[{text:'Datum'},{text:LVK.datumDE(v.datum)+(v.uhrzeit?', '+v.uhrzeit+' Uhr':'')}],[{text:'Ort'},{text:v.ort||''}],[{text:'Versammlungsleitung'},{text:v.leitung||''}],[{text:'Protokoll'},{text:v.protokoll||''}],
    [{text:'Einladung'},{text:v.einladungAm?'versandt am '+LVK.datumDE(v.einladungAm):'—'}],[{text:'Stimmrecht'},{text:LVW.PRINZIPIEN[prinzip]}]]});
  (v.tops||[]).forEach((t,i)=>{
    b.push({typ:'p',runs:[{text:'TOP '+(i+1)+': '+t.titel,fett:true}]});
    if(t.antrag) b.push({typ:'p',text:'Beschlussantrag: '+t.antrag});
    if(t.typ==='beschluss'){ const r=LVW.abstimmung(l,t,v.datum,prinzip);
      b.push({typ:'p',text:'Abstimmung: Ja '+lvZahl(r.ja,4)+', Nein '+lvZahl(r.nein,4)+', Enthaltungen '+lvZahl(r.enthaltung,4)+(r.ungueltig?', ungültig '+r.ungueltig:'')+'. Erforderlich: '+LVW.MEHRHEITEN[r.mehrheit]+'.'});
      b.push({typ:'p',runs:[{text:'Verkündetes Ergebnis: ',fett:true},{text:(r.angenommen?'Der Beschluss ist angenommen.':'Der Beschlussantrag ist abgelehnt.')+(t.beschlussNr?' (Beschluss-Sammlung Nr. '+t.beschlussNr+')':'')}]}); }
  });
  b.push({typ:'p',text:'\n\n______________________________        ______________________________        ______________________________\nVersammlungsleitung                          Wohnungseigentümer(in)                     ggf. Vorsitz Verwaltungsbeirat'});
  b.push({typ:'p',text:'Die Niederschrift ist von der vorsitzenden Person, einem Wohnungseigentümer und ggf. dem Vorsitzenden des Verwaltungsbeirats zu unterschreiben (§ 24 Abs. 6 WEG).'});
  lvHerunterladen(ImmoOffice.docx(b,{titel:'Niederschrift '+v.datum}),LV_DOCX,lvDateiname('Niederschrift Eigentuemerversammlung '+v.datum+' '+l.name)+'.docx');
}

/* ---------- Beschluss-Sammlung ---------- */
function lvBeschlussFelder(){ return [{id:'bs_datum',label:'Datum',typ:'datum',wert:lvHeute(),pflicht:true},{id:'bs_art',label:'Art',typ:'wahl',optionen:[['umlauf','Umlaufbeschluss (§ 23 Abs. 3 WEG)'],['urteil','Urteil (Urteilsformel)'],['versammlung','Versammlungsbeschluss']]},
  {id:'bs_ergebnis',label:'Ergebnis',typ:'wahl',optionen:[['angenommen','angenommen'],['abgelehnt','abgelehnt']]},{id:'bs_wortlaut',label:'Wortlaut',typ:'textarea',breit:true,pflicht:true,zeilen:3}]; }
function lvWegBeschluesseHtml(l){
  const W=l.weg||{}; let form='';
  if(LV.form&&LV.form.typ==='beschluss') form=lvFormRahmen('Eintrag in die Beschluss-Sammlung',lvFelder(lvBeschlussFelder(),'three'),'lvBeschlussSpeichern()');
  if(LV.form&&LV.form.typ==='vermerk') form=lvFormRahmen('Vermerk zu Beschluss Nr. '+((W.beschluesse||[]).find(b=>b.id===LV.form.id)||{}).nr,lvFelder([{id:'vm_datum',label:'Datum',typ:'datum',wert:lvHeute(),pflicht:true},{id:'vm_text',label:'Vermerk',pflicht:true,platzhalter:'z. B. angefochten, Az. …; aufgehoben durch Beschluss Nr. …'}],'two'),'lvVermerkSpeichern(\''+lvQ(LV.form.id)+'\')');
  const zeilen=(W.beschluesse||[]).slice().sort((a,b)=>b.nr-a.nr).map(b=>'<tr><td class="strong r">'+b.nr+'</td><td>'+lvH(LVK.datumDE(b.datum))+'<br><span class="lv-klein">'+lvH({versammlung:'Versammlung',umlauf:'Umlaufbeschluss',urteil:'Urteil'}[b.art])+'</span></td>'
    +'<td>'+lvH(b.wortlaut)+(b.vermerke.length?'<br><span class="lv-klein">'+b.vermerke.map(x=>lvH(LVK.datumDE(x.datum)+': '+x.text)).join('<br>')+'</span>':'')+'</td><td>'+lvBadge(b.ergebnis,b.ergebnis==='angenommen'?'ok':'bad')+'</td>'
    +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'vermerk\',id:\''+lvQ(b.id)+'\'};lvRender()">Vermerk</button></td></tr>');
  return form+lvBox('Beschluss-Sammlung (§ 24 Abs. 7 WEG)','<p class="hint">Fortlaufend nummeriert; Eintragungen, Vermerke zu Anfechtung und Aufhebung unverzüglich mit Datum.</p>'
    +lvTabelle([{t:'Nr.',r:1},'Datum / Art','Wortlaut','Ergebnis',''],zeilen,'Noch keine Beschlüsse eingetragen.')
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'beschluss\'};lvRender()" data-ic="plus">Umlaufbeschluss / Urteil eintragen</button><button class="secondary" onclick="lvBeschluesseExcel()" data-ic="download">Beschluss-Sammlung (Excel)</button></div>');
}
async function lvBeschlussSpeichern(){
  const r=lvFormLesen(lvBeschlussFelder()), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const nr=LVW.naechsteBeschlussNr(lvAktiv()); LV.form=null;
  await lvAendern(l=>{ lvW(l).beschluesse.push({id:LVK.neueId('BS'),nr,datum:w.bs_datum,art:w.bs_art,wortlaut:w.bs_wortlaut,ergebnis:w.bs_ergebnis,eingetragenAm:lvHeute(),vermerke:[]}); },'Als Nr. '+nr+' eingetragen.');
}
async function lvVermerkSpeichern(id){
  const r=lvFormLesen([{id:'vm_datum',label:'Datum',typ:'datum',pflicht:true},{id:'vm_text',label:'Vermerk',pflicht:true}]), w=r.werte; if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  LV.form=null;
  await lvAendern(l=>{ l.weg.beschluesse.find(b=>b.id===id).vermerke.push({datum:w.vm_datum,text:w.vm_text}); },'Vermerk eingetragen.');
}
function lvBeschluesseExcel(){
  const l=lvAktiv(), W=l.weg||{};
  const z=[[{v:'Beschluss-Sammlung '+(l.name||''),s:'titel'}],[lvAdresse(l)],[],['Nr.','Datum','Art','Wortlaut','Ergebnis','Vermerke','eingetragen am'].map(t=>({v:t,s:'fett'}))]
    .concat((W.beschluesse||[]).slice().sort((a,b)=>a.nr-b.nr).map(b=>[b.nr,LVK.datumDE(b.datum),{versammlung:'Versammlung',umlauf:'Umlaufbeschluss',urteil:'Urteil'}[b.art],{v:b.wortlaut,s:'text'},b.ergebnis,{v:b.vermerke.map(x=>LVK.datumDE(x.datum)+': '+x.text).join('\n'),s:'text'},LVK.datumDE(b.eingetragenAm)]));
  lvHerunterladen(ImmoOffice.xlsx([{name:'Beschluss-Sammlung',spalten:[6,12,16,70,12,40,14],zeilen:z}],{titel:'Beschluss-Sammlung'}),LV_XLSX,lvDateiname('Beschluss-Sammlung '+l.name)+'.xlsx');
}

/* ---------- Einhängen ---------- */
lvReiterRegistrieren('weg','WEG',l=>lvWegHtml(l),l=>l.art==='weg');
lvFristenQuelleRegistrieren((l,st,h)=>LVW.fristen(l,st,h));
LV_FRIST_ZIELE.weg_versammlung=()=>{ LV.reiter='weg'; LV.wegAnsicht='versammlungen'; LV.wegVersammlung=null; };
LV_FRIST_ZIELE.weg_abrechnung=jahr=>{ LV.reiter='weg'; LV.wegAnsicht='abrechnung'; LV.wegAbJahr=jahr||null; };
LV_FRIST_ZIELE.weg_plan=jahr=>{ LV.reiter='weg'; LV.wegAnsicht='hausgeld'; LV.wegJahr=jahr||null; };
LV_FRIST_ZIELE.weg_hausgeld=()=>{ LV.reiter='weg'; LV.wegAnsicht='hausgeld'; };
