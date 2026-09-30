/* ImmoApp — Liegenschaftsverwaltung: Oberfläche „Mieterhöhung“
   Rechnen und Prüfen: js/verwaltung-mh.js (ImmoMieterhoehung). Erzeugt die Schreiben (Word) und trägt die
   Erhöhung nach Zustimmung bzw. Wirksamwerden als Mietänderung im Vertrag ein — die Sollstellung rechnet danach
   automatisch mit der neuen Miete. */
'use strict';

const LVM=ImmoMieterhoehung;
LV.mhVertrag=null; LV.mhArt=null; LV.mhEingabe={}; LV.mhErgebnis=null;
LV_GRUND['559e']='Modernisierung Heizung mit Förderung (§ 559e BGB)';

const LV_MH_ARTEN={'558':'Vergleichsmiete (§ 558)',index:'Indexmiete (§ 557b)','559':'Modernisierung (§ 559)',staffel:'Staffelmiete (§ 557a)'};
const LV_MS_ART={einfach:'Mietspiegel',qualifiziert:'qualifizierter Mietspiegel (§ 558d BGB)',datenbank:'Auskunft aus einer Mietdatenbank (§ 558e BGB)',
  gutachten:'Gutachten eines öffentlich bestellten und vereidigten Sachverständigen',vergleich:'drei Vergleichswohnungen'};
function lvMhArtenFuer(v){ return v.mietart==='staffel'?['staffel','559']:v.mietart==='index'?['index','559']:['558','559']; }
function lvMhVertraege(l){ const st=lvHeute(); return (l.vertraege||[]).filter(v=>LVK.vertragAktiv(v,st)||v.beginn>st); }
function lvMhZahl(x,st){ if(x==null||!isFinite(x)) return '–'; const eur=/€/.test(st||''); return (eur?(+x).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}):String(LVK.r2(x)).replace('.',','))+(st||''); }

function lvMieterhoehungHtml(l){
  const st=lvHeute(), vv=lvMhVertraege(l);
  if(!vv.length) return lvBox('Mieterhöhung','<p>Es gibt keinen laufenden Mietvertrag.</p><div class="mdb-actions"><button class="primary" onclick="lvReiter(\'vertraege\')">Zu den Verträgen</button></div>');
  const zeilen=vv.map(v=>{
    const e=lvEinheit(l,v.einheitId)||{}, m=LVK.mieteAm(v,st), f=+e.flaeche||0, le=LVM.letzteErhoehung(v,st);
    const naechst=v.mietart==='fest'?LVK.plusMonate(le.datum,12):v.mietart==='index'?LVK.plusMonate(le.datum,10):null;
    return '<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td>'+lvH(lvMieterName(v))+'</td><td>'+lvH(LV_MIETART[v.mietart]||'')+'</td>'
      +'<td class="r">'+lvEur(m.kalt)+'</td><td class="r">'+(f?lvMhZahl(m.kalt/f,' €'):'–')+'</td><td class="r">'+(e.vergleichQm?lvMhZahl(e.vergleichQm,' €'):'–')+'</td>'
      +'<td>'+lvH(LVK.datumDE(le.datum))+'<br><span class="lv-klein">'+lvH(le.grund==='beginn'?'Mietbeginn':(LV_GRUND[le.grund]||le.grund))+'</span></td>'
      +'<td>'+(naechst?(naechst<=st?lvBadge('jetzt möglich','ok'):lvH(LVK.datumDE(naechst))):'–')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="lvMhWahl(\''+lvQ(v.id)+'\')">Prüfen</button></td></tr>';
  });
  const ms=l.mietspiegel||{};
  return lvBox('Mieterhöhung — Übersicht',lvTabelle(['Einheit','Mieter','Mietart',{t:'Kalt / Monat',r:1},{t:'€/m²',r:1},{t:'Vergleich €/m²',r:1},'Letzte Erhöhung','Nächste möglich',''],zeilen)
      +'<p class="hint">„Nächste möglich“: frühester Zugang eines Erhöhungsverlangens (§ 558: ein Jahr nach der letzten Erhöhung; Index: so, dass die Miete ein Jahr unverändert bleibt). Modernisierungserhöhungen (§ 559) und Vorauszahlungen (§ 560) zählen dabei nicht.</p>')
    +(LV.mhVertrag&&lvVertrag(l,LV.mhVertrag)?lvMhFormHtml(l,lvVertrag(l,LV.mhVertrag)):'')
    +lvBox('Mietspiegel dieser Liegenschaft','<div class="grid three lv-form">'
      +lvFeld({id:'ms_name',label:'Mietspiegel / Begründungsmittel',wert:ms.name,platzhalter:'z. B. Mietspiegel Heilbronn 2025'})
      +lvFeld({id:'ms_art',label:'Art',typ:'wahl',wert:ms.art||'einfach',optionen:Object.entries(LV_MS_ART)})
      +lvFeld({id:'ms_stand',label:'Stand',typ:'datum',wert:ms.stand})
      +lvFeld({id:'ms_notiz',label:'Notiz (Einordnung, Spanne, Wohnwertmerkmale)',typ:'textarea',wert:ms.notiz,breit:true,zeilen:2})+'</div>'
      +'<div class="mdb-actions"><button class="secondary" onclick="lvMietspiegelSpeichern()" data-ic="check">Speichern</button></div>'
      +'<p class="hint">Die ortsübliche Vergleichsmiete (€/m²) je Einheit wird bei der Prüfung eingetragen und an der Einheit gespeichert. Bei einem qualifizierten Mietspiegel müssen dessen Angaben im Schreiben immer genannt werden (§ 558a Abs. 3 BGB).</p>');
}
function lvMhWahl(vid){ const l=lvAktiv(), v=lvVertrag(l,vid); if(!v) return; LV.mhVertrag=vid; LV.mhArt=lvMhArtenFuer(v)[0]; LV.mhErgebnis=null; lvRender(); setTimeout(()=>{ const b=document.getElementById('lv_mh_form'); if(b) b.scrollIntoView({block:'start'}); },30); }
async function lvMietspiegelSpeichern(){
  const f=[{id:'ms_name'},{id:'ms_art'},{id:'ms_stand',typ:'datum',label:'Stand'},{id:'ms_notiz'}], r=lvFormLesen(f); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  await lvAendern(l=>{ l.mietspiegel={name:r.werte.ms_name,art:r.werte.ms_art,stand:r.werte.ms_stand,notiz:r.werte.ms_notiz}; },'Mietspiegel gespeichert.');
}

/* ---------- Formulare je Art ---------- */
function lvMhFelder(art,l,v){
  const e=lvEinheit(l,v.einheitId)||{}, w=LV.mhEingabe[art+':'+v.id]||{}, heute=lvHeute();
  if(art==='558') return [
    {id:'mh_zugang',label:'Zugang beim Mieter',typ:'datum',wert:w.zugang||heute,pflicht:true,hinweis:'Datum, an dem das Schreiben voraussichtlich zugeht'},
    {id:'mh_vqm',label:'Ortsübliche Vergleichsmiete (€/m²)',typ:'zahl',wert:w.vergleichQm!=null?w.vergleichQm:e.vergleichQm,min:0,pflicht:true,hinweis:'laut Mietspiegel für diese Wohnung'},
    {id:'mh_flaeche',label:'Wohnfläche (m²)',typ:'zahl',wert:w.flaeche!=null?w.flaeche:e.flaeche,min:0,pflicht:true},
    {id:'mh_verlangt',label:'Gewünschte neue Kaltmiete (€, optional)',typ:'betrag',wert:w.verlangt,min:0,hinweis:'leer = zulässige Höchstmiete'},
    {id:'mh_dm',label:'Drittmittel: Jahresbetrag (€, § 558 Abs. 5)',typ:'betrag',wert:w.drittmittelJahr,min:0,hinweis:'Zuschuss: 8 % des Zuschusses'}];
  if(art==='index') return [
    {id:'mh_zugang',label:'Zugang beim Mieter',typ:'datum',wert:w.zugang||heute,pflicht:true},
    {id:'mh_monat',label:'Neuer Indexmonat (JJJJ-MM)',wert:w.monatNeu,pflicht:true,platzhalter:'2026-08',hinweis:'letzter veröffentlichter Monat'},
    {id:'mh_vpi',label:'Verbraucherpreisindex im neuen Monat',typ:'zahl',wert:w.vpiNeu,min:0,pflicht:true,hinweis:'Destatis, Tabelle 61111-0002 (2020 = 100)'}];
  if(art==='559') return [
    {id:'mh_zugang',label:'Zugang beim Mieter',typ:'datum',wert:w.zugang||heute,pflicht:true},
    {id:'mh_verfahren',label:'Verfahren',typ:'wahl',wert:w.verfahren||'regel',optionen:[['regel','Regelverfahren (§ 559)'],['vereinfacht','vereinfachtes Verfahren bis 10.000 € (§ 559c)'],['559e','Heizung mit Förderung (§ 559e)']]},
    {id:'mh_kosten',label:'Kosten für diese Wohnung (€)',typ:'betrag',wert:w.kosten,min:0,pflicht:true,hinweis:'bei mehreren Wohnungen: unten nach Fläche aufteilen'},
    {id:'mh_erhaltung',label:'davon Erhaltungsanteil (€)',typ:'betrag',wert:w.erhaltung,min:0,hinweis:'Regelverfahren: geschätzt (§ 559 Abs. 2); sonst pauschal'},
    {id:'mh_zuschuss',label:'Zuschüsse / Drittmittel (€)',typ:'betrag',wert:w.zuschuss,min:0,hinweis:'§ 559a Abs. 1 BGB, z. B. KfW-/BAFA-Zuschuss'},
    {id:'mh_zins',label:'Zinsvorteil aus Förderdarlehen (€/Jahr)',typ:'betrag',wert:w.zinsvorteilJahr,min:0,hinweis:'§ 559a Abs. 2 BGB'},
    {id:'mh_frueher',label:'Frühere Modernisierungskosten in 5 Jahren (€)',typ:'betrag',wert:w.fruehereKosten5J,min:0,hinweis:'nur vereinfachtes Verfahren (§ 559c Abs. 2)'},
    {id:'mh_ank_monat',label:'Angekündigte Erhöhung (€/Monat)',typ:'betrag',wert:w.angekuendigtMonat,min:0},
    {id:'mh_ank',label:'Maßnahme ordnungsgemäß angekündigt (§ 555c BGB)',typ:'check',wert:w.angekuendigt!==false},
    {id:'mh_heizung',label:'Einbau einer Heizungsanlage (§ 559 Abs. 3a Satz 3)',typ:'check',wert:w.heizung},
    {id:'mh_gmodg',label:'Heizungsanlage nach § 43 GModG (§ 559e: keine Pauschale)',typ:'check',wert:w.heizungGmodg},
    {id:'mh_massnahme',label:'Beschreibung der Maßnahme (für das Schreiben)',typ:'textarea',wert:w.massnahme,breit:true,zeilen:2}];
  return [];
}
function lvMhOpt(art,r){
  const w=r.werte;
  if(art==='558') return {zugang:w.mh_zugang,vergleichQm:w.mh_vqm,flaeche:w.mh_flaeche,verlangt:w.mh_verlangt,drittmittelJahr:w.mh_dm};
  if(art==='index') return {zugang:w.mh_zugang,monatNeu:w.mh_monat,vpiNeu:w.mh_vpi};
  return {zugang:w.mh_zugang,verfahren:w.mh_verfahren,kosten:w.mh_kosten,erhaltung:w.mh_erhaltung,zuschuss:w.mh_zuschuss,zinsvorteilJahr:w.mh_zins,fruehereKosten5J:w.mh_frueher,
    angekuendigtMonat:w.mh_ank_monat,angekuendigt:w.mh_ank,heizung:w.mh_heizung,heizungGmodg:w.mh_gmodg,massnahme:w.mh_massnahme};
}
function lvMhRechnen(l,v,art,o){
  if(art==='558') return LVM.erhoehung558(l,v,o);
  if(art==='index') return LVM.indexAnpassung(l,v,o);
  if(art==='559') return LVM.modernisierung(l,v,o);
  return null;
}
async function lvMhBerechnen(){
  const l=lvAktiv(), v=l&&lvVertrag(l,LV.mhVertrag); if(!v) return;
  const art=LV.mhArt, f=lvMhFelder(art,l,v), r=lvFormLesen(f);
  if(art==='index'&&r.werte.mh_monat&&!/^\d{4}-\d{2}$/.test(r.werte.mh_monat)){ r.ok=false; r.fehler.push('Neuer Indexmonat bitte als JJJJ-MM'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const o=lvMhOpt(art,r); LV.mhEingabe[art+':'+v.id]=o;
  LV.mhErgebnis={art,vid:v.id,r:lvMhRechnen(l,v,art,o),o};
  if(art==='558'&&o.vergleichQm>0){ const e=lvEinheit(l,v.einheitId); if(e&&e.vergleichQm!==o.vergleichQm) await lvAendern(x=>{ const ee=lvEinheit(x,v.einheitId); ee.vergleichQm=o.vergleichQm; },'Vergleichsmiete an der Einheit gespeichert.'); }
  lvRender();
  setTimeout(()=>{ const b=document.getElementById('lv_mh_erg'); if(b) b.scrollIntoView({block:'nearest'}); },30);
}
function lvMhAufteilen(){
  const l=lvAktiv(), v=l&&lvVertrag(l,LV.mhVertrag), el=document.getElementById('lvf_mh_gesamt'); if(!v||!el) return;
  const g=LVK.zahlEingabe(el.value); if(!(g>0)){ alert('Bitte die Gesamtkosten der Maßnahme eintragen.'); return; }
  const a=LVM.aufteilenNachFlaeche(g,(l.einheiten||[]).filter(e=>e.art==='wohnung'||e.id===v.einheitId)), b=a[v.einheitId];
  if(b==null){ alert('Für diese Einheit ist keine Wohnfläche erfasst.'); return; }
  const k=document.getElementById('lvf_mh_kosten'); if(k) k.value=lvZahlText(b);
}
function lvMhFormHtml(l,v){
  const arten=lvMhArtenFuer(v); if(!arten.includes(LV.mhArt)) LV.mhArt=arten[0];
  const art=LV.mhArt, e=lvEinheit(l,v.einheitId);
  const kopf='<div class="lv-segment" style="margin-bottom:10px">'+arten.map(a=>'<button class="'+(a===art?'on':'')+'" onclick="LV.mhArt=\''+a+'\';LV.mhErgebnis=null;lvRender()">'+lvH(LV_MH_ARTEN[a])+'</button>').join('')+'</div>';
  let inhalt;
  if(art==='staffel') inhalt=lvMhStaffelHtml(l,v);
  else {
    inhalt='<div id="lv_formfehler" class="lv-warn" hidden></div>'+lvFelder(lvMhFelder(art,l,v))
      +(art==='559'?'<details class="lv-details"><summary>Gesamtkosten auf die Wohnungen aufteilen (nach Wohnfläche, § 559 Abs. 3 BGB)</summary><div class="grid three lv-form">'
        +lvFeld({id:'mh_gesamt',label:'Gesamtkosten der Maßnahme (€)',typ:'betrag'})+'<div class="field"><label>&nbsp;</label><button class="secondary" onclick="lvMhAufteilen()">Anteil dieser Wohnung übernehmen</button></div></div></details>':'')
      +'<div class="mdb-actions"><button class="primary" onclick="lvMhBerechnen()" data-ic="calc">Berechnen</button><button class="secondary" onclick="LV.mhVertrag=null;LV.mhErgebnis=null;lvRender()">Schließen</button></div>';
    const erg=LV.mhErgebnis&&LV.mhErgebnis.vid===v.id&&LV.mhErgebnis.art===art?LV.mhErgebnis:null;
    if(erg) inhalt+=lvMhErgebnisHtml(l,v,erg);
  }
  return '<div class="mdb-box lv-formbox" id="lv_mh_form"><h3>'+lvH(lvEinheitName(e)+' · '+lvMieterName(v))+'</h3>'+kopf+inhalt+'</div>';
}
function lvMhZeilen(liste){ return '<table class="mdb-tbl lv-tbl lv-mh-tbl"><tbody>'+liste.filter(Boolean).map(z=>'<tr'+(z[2]?' class="strong"':'')+'><td>'+lvH(z[0])+'</td><td class="r">'+lvH(z[1])+'</td></tr>').join('')+'</tbody></table>'; }
function lvMhErgebnisHtml(l,v,erg){
  const r=erg.r, h=[];
  let tab='';
  if(r.art==='558') tab=lvMhZeilen([['Bisherige Nettokaltmiete',lvEur(r.aktuell)+(r.aktuellQm!=null?' ('+lvMhZahl(r.aktuellQm,' €/m²')+')':'')],
    r.vergleich!=null&&['Ortsübliche Vergleichsmiete',lvEur(r.vergleich)+' ('+lvMhZahl(r.vergleichQm,' €/m²')+' × '+lvMhZahl(r.flaeche,' m²')+')'],
    r.drittmittelMonat>0&&['− Drittmittel (§ 558 Abs. 5)',lvEur(r.drittmittelMonat)],
    ['Ausgangsmiete vor drei Jahren ('+LVK.datumDE(r.basisDatum)+')',lvEur(r.ausgang)],
    ['Kappungsgrenze '+r.kappungProzent+' %'+(r.modernisierungImZeitraum?' + Modernisierung '+lvEur(r.modernisierungImZeitraum):''),lvEur(r.kappungGrenze)],
    r.hoechst!=null&&['Zulässige Höchstmiete ('+(r.begrenztDurch==='kappungsgrenze'?'Kappungsgrenze':'Vergleichsmiete')+')',lvEur(r.hoechst)],
    r.neu!=null&&['Neue Nettokaltmiete',lvEur(r.neu)+(r.neuQm!=null?' ('+lvMhZahl(r.neuQm,' €/m²')+')':''),true],
    ['Erhöhung',lvEur(r.erhoehung)+' / Monat (+'+lvMhZahl(r.prozent,' %')+')',true],
    ['Wirksam ab (§ 558b Abs. 1)',LVK.datumDE(r.wirksam)],['Zustimmungsfrist bis',LVK.datumDE(r.zustimmungBis)],['Klagefrist bis',LVK.datumDE(r.klageBis)]])
    +'<p class="hint">Kappungsgrenze: '+lvH(r.kappungGrund.replace(/\.$/,''))+'.</p>';
  if(r.art==='index'&&r.basis) tab=lvMhZeilen([['Basis: Index '+(r.basis.monat||'?')+' / Miete',lvMhZahl(r.basis.wert)+' / '+lvEur(r.basis.kalt)],
    r.vpiNeu&&['Neuer Index '+r.monatNeu,lvMhZahl(r.vpiNeu)+(r.aenderungProzent!=null?' ('+(r.aenderungProzent>=0?'+':'')+lvMhZahl(r.aenderungProzent,' %')+')':'')],
    r.festeZuschlaege?['+ spätere Erhöhungen (fest)',lvEur(r.festeZuschlaege)]:null,
    ['Bisherige Nettokaltmiete',lvEur(r.aktuell)],r.neu!=null&&['Neue Nettokaltmiete',lvEur(r.neu),true],['Änderung',lvEur(r.erhoehung)+' / Monat',true],
    ['Zu zahlen ab (§ 557b Abs. 3)',LVK.datumDE(r.wirksam)]]);
  if(r.art==='559'||r.art==='559e') tab=lvMhZeilen([['Kosten für die Wohnung',lvEur(r.kosten)],r.geltend!==r.kosten&&['geltend gemacht',lvEur(r.geltend)],
    ['− Erhaltungsanteil'+(r.verfahren==='vereinfacht'?' (30 % pauschal)':r.verfahren==='559e'&&!erg.o.heizungGmodg?' (15 % pauschal)':''),lvEur(r.erhaltung)],
    ['− Zuschüsse / Drittmittel',lvEur(r.zuschuss)],['Anrechenbare Kosten',lvEur(r.anrechenbar)],
    ['× '+r.satz+' % jährlich'+(r.zinsvorteil?' − Zinsvorteil '+lvEur(r.zinsvorteil):''),lvEur(r.jahr)],['monatlich',lvEur(r.monatRoh)],
    ['Kappung: noch zulässig in sechs Jahren',lvEur(r.kappungRest)],['Erhöhung monatlich',lvEur(r.monat),true],
    ['Neue Nettokaltmiete',lvEur(r.neu),true],['Zu zahlen ab (§ 559b Abs. 2)',LVK.datumDE(r.wirksam)]]);
  r.gruende.forEach(t=>h.push('<div class="lv-warn">'+lvH(t)+'</div>'));
  const hin=r.hinweise.length?'<ul class="lv-hinweise">'+r.hinweise.map(t=>'<li>'+lvH(t)+'</li>').join('')+'</ul>':'';
  const knoepfe=r.ok?'<div class="mdb-actions"><button class="primary" onclick="lvMhSchreiben()" data-ic="file-text">Schreiben (Word)</button>'
    +'<button class="secondary" onclick="lvMhEintragen()" data-ic="check">'+(r.art==='558'?'Nach Zustimmung eintragen':'Als Mietänderung eintragen')+'</button></div>'
    +'<p class="hint">'+(r.art==='558'?'Der Mieter muss zustimmen. Erst nach Zustimmung (oder Urteil) eintragen — dann rechnet das Mietkonto ab '+LVK.datumDE(r.wirksam)+' mit der neuen Miete.':'Nach Zugang des Schreibens eintragen — das Mietkonto rechnet ab '+LVK.datumDE(r.wirksam)+' mit der neuen Miete.')+' Schreiben vor dem Versand prüfen; Arbeitshilfe, keine Rechtsberatung.</p>':'';
  return '<div id="lv_mh_erg" class="lv-mh-erg"><h3 class="sep">Ergebnis</h3>'+h.join('')+tab+hin+knoepfe+'</div>';
}
function lvMhStaffelHtml(l,v){
  const st=lvHeute(), staffeln=(v.aenderungen||[]).filter(a=>a.grund==='staffel'&&typeof a.kalt==='number').sort((a,b)=>a.ab<b.ab?-1:1);
  let vor=v.beginn, vorKalt=(v.miete||{}).kalt||0;
  const zeilen=staffeln.map(a=>{ const ok=LVK.plusMonate(vor,12)<=a.ab, z='<tr><td>'+lvH(LVK.datumDE(a.ab))+'</td><td class="r">'+lvEur(a.kalt)+'</td><td class="r">'+lvEur(a.kalt-vorKalt)+'</td><td>'+(ok?lvBadge('≥ 1 Jahr','ok'):lvBadge('unter einem Jahr','bad'))+'</td><td>'+(a.ab<=st?'gilt':lvBadge('kommt','warn'))+'</td></tr>'; vor=a.ab; vorKalt=a.kalt; return z; });
  return lvTabelle(['Ab','Kaltmiete',{t:'Erhöhung',r:1},'Abstand (§ 557a Abs. 2)','Stand'],zeilen,'Noch keine Staffeln eingetragen — im Vertrag unter „Mietänderungen“ mit Grund „Staffel“ erfassen.')
    +'<p class="hint">Staffeln stehen im Mietvertrag und werden automatisch wirksam — ein Schreiben ist nicht nötig. Während der Staffelmiete sind Erhöhungen nach §§ 558 bis 559b ausgeschlossen; nach der letzten Staffel die Mietart auf „Festmiete“ stellen.</p>'
    +'<div class="mdb-actions"><button class="secondary" onclick="lvReiter(\'vertraege\',{typ:\'vertrag\',id:\''+lvQ(v.id)+'\'})">Staffeln im Vertrag bearbeiten</button></div>';
}

/* ---------- Eintragen und Schreiben ---------- */
async function lvMhEintragen(){
  const l=lvAktiv(), erg=LV.mhErgebnis, v=l&&erg&&lvVertrag(l,erg.vid); if(!v||!erg.r.ok) return;
  const r=erg.r, neu=r.neu, grund=r.art;
  if((v.aenderungen||[]).some(a=>a.ab===r.wirksam&&typeof a.kalt==='number')&&!confirm('Zum '+LVK.datumDE(r.wirksam)+' ist bereits eine Änderung der Kaltmiete eingetragen. Trotzdem zusätzlich eintragen?')) return;
  if(!confirm('Neue Nettokaltmiete '+lvEur(neu)+' ab '+LVK.datumDE(r.wirksam)+' im Vertrag eintragen?'+(r.art==='558'?'\nNur eintragen, wenn der Mieter zugestimmt hat.':''))) return;
  await lvAendern(x=>{ const vv=lvVertrag(x,v.id); const a={id:LVK.neueId('A'),ab:r.wirksam,grund,kalt:neu,zugang:r.zugang,
      notiz:r.art==='558'?'Vergleichsmiete '+lvMhZahl(r.vergleichQm,' €/m²'):r.art==='index'?'VPI '+r.monatNeu+': '+lvMhZahl(r.vpiNeu):'Modernisierung '+lvEur(r.kosten)};
    if(r.art==='index'){ a.indexMonat=r.monatNeu; a.indexWert=r.vpiNeu; }
    vv.aenderungen.push(a); },'Mieterhöhung zum '+LVK.datumDE(r.wirksam)+' eingetragen.');
  LV.mhErgebnis=null;
}
function lvMhKopf(l,v,b){
  const ab=LV.einst||{}, e=lvEinheit(l,v.einheitId);
  if(ab.name||ab.anschrift) b.push({typ:'p',runs:[{text:[ab.name,ab.anschrift].filter(Boolean).join(' · '),klein:true}]});
  b.push({typ:'p',text:lvMieterName(v)+'\n'+(l.strasse||'')+(e&&e.lage?', '+e.lage:'')+'\n'+[l.plz,l.ort].filter(Boolean).join(' ')});
  b.push({typ:'p',text:(ab.ort||l.ort||'')+(ab.ort||l.ort?', ':'')+LVK.datumDE(lvHeute()),rechts:true});
  return e;
}
function lvMhSchreiben(){
  const l=lvAktiv(), erg=LV.mhErgebnis, v=l&&erg&&lvVertrag(l,erg.vid); if(!v||!erg.r.ok) return;
  const r=erg.r, o=erg.o, b=[], ab=LV.einst||{}, ms=l.mietspiegel||{};
  const e=lvMhKopf(l,v,b), objekt=(l.strasse||l.name)+(e?', '+lvEinheitName(e):''), fl=r.flaeche?lvMhZahl(r.flaeche,' m²'):'';
  let titel;
  if(r.art==='558'){
    titel='Mieterhöhungsverlangen';
    b.push({typ:'h2',text:'Mieterhöhungsverlangen nach § 558 BGB — '+objekt});
    b.push({typ:'p',text:'Sehr geehrte Damen und Herren,'});
    b.push({typ:'p',text:'wir bitten Sie um Zustimmung zur Erhöhung der Nettokaltmiete für die von Ihnen gemietete Wohnung'+(fl?' ('+fl+' Wohnfläche)':'')+' von bisher '+lvEur(r.aktuell)+' auf '+lvEur(r.neu)+' monatlich, also um '+lvEur(r.erhoehung)+', mit Wirkung ab dem '+LVK.datumDE(r.wirksam)+'. Die Vorauszahlungen auf die Betriebs- und Heizkosten bleiben unverändert.'});
    b.push({typ:'h3',text:'Begründung'});
    b.push({typ:'p',text:'Die ortsübliche Vergleichsmiete für Ihre Wohnung beträgt '+lvMhZahl(r.vergleichQm,' €/m²')+' monatlich'+(ms.name?' nach dem '+ms.name+(ms.stand?' (Stand '+LVK.datumDE(ms.stand)+')':''):'')+'. '
      +'Das ergibt bei '+fl+' eine Vergleichsmiete von '+lvEur(r.vergleich)+'. Die verlangte Miete von '+lvEur(r.neu)+' ('+lvMhZahl(r.neuQm,' €/m²')+') übersteigt die ortsübliche Vergleichsmiete nicht.'
      +(ms.art==='qualifiziert'?' Der Mietspiegel ist ein qualifizierter Mietspiegel im Sinne des § 558d BGB.':'')+(ms.notiz?' '+ms.notiz:'')});
    b.push({typ:'p',text:'Die Miete ist seit dem '+LVK.datumDE(r.letzte.datum)+' unverändert. Die Kappungsgrenze von '+r.kappungProzent+' % (§ 558 Abs. 3 BGB) ist eingehalten: Die Miete vor drei Jahren betrug '+lvEur(r.ausgang)+'; die neue Miete liegt nicht über '+lvEur(r.kappungGrenze)+'.'});
    b.push({typ:'tabelle',zeilen:[[{text:'bisherige Nettokaltmiete'},{text:lvEur(r.aktuell),rechts:true}],[{text:'Erhöhung'},{text:lvEur(r.erhoehung),rechts:true}],
      Object.assign([{text:'neue Nettokaltmiete ab '+LVK.datumDE(r.wirksam)},{text:lvEur(r.neu),rechts:true}],{fett:true})]});
    b.push({typ:'p',text:'Wir bitten Sie, Ihre Zustimmung bis zum '+LVK.datumDE(r.zustimmungBis)+' in Textform zu erklären, zum Beispiel mit dem unten stehenden Abschnitt. Die erhöhte Miete ist dann ab dem '+LVK.datumDE(r.wirksam)+' zu zahlen (§ 558b Abs. 1 BGB). '
      +'Stimmen Sie bis dahin nicht zu, können wir innerhalb von drei weiteren Monaten auf Zustimmung klagen (§ 558b Abs. 2 BGB).'});
    b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
    b.push({typ:'p',text:'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'});
    b.push({typ:'p',runs:[{text:'Zustimmung',fett:true}]});
    b.push({typ:'p',text:'Ich/Wir stimme(n) der Erhöhung der Nettokaltmiete für die Wohnung '+objekt+' auf '+lvEur(r.neu)+' monatlich ab dem '+LVK.datumDE(r.wirksam)+' zu.\n\n\n______________________________        ______________________________\nOrt, Datum                                          Unterschrift(en) Mieter'});
  } else if(r.art==='index'){
    titel='Mietanpassung Indexmiete';
    b.push({typ:'h2',text:'Anpassung der Indexmiete nach § 557b BGB — '+objekt});
    b.push({typ:'p',text:'Sehr geehrte Damen und Herren,'});
    b.push({typ:'p',text:'in Ihrem Mietvertrag ist vereinbart, dass sich die Miete nach dem vom Statistischen Bundesamt ermittelten Verbraucherpreisindex für Deutschland richtet (Indexmiete, § 557b BGB). '
      +'Der Index ist von '+lvMhZahl(r.basis.wert)+' Punkten ('+r.basis.monat.slice(5)+'/'+r.basis.monat.slice(0,4)+') auf '+lvMhZahl(r.vpiNeu)+' Punkte ('+r.monatNeu.slice(5)+'/'+r.monatNeu.slice(0,4)+') '+(r.aenderungProzent>=0?'gestiegen':'gesunken')+'; das entspricht einer Änderung um '+lvMhZahl(Math.abs(r.aenderungProzent),' %')+' (Basis 2020 = 100).'});
    b.push({typ:'tabelle',zeilen:[[{text:'Nettokaltmiete zur letzten Anpassung'},{text:lvEur(r.basis.kalt),rechts:true}],[{text:'× '+lvMhZahl(r.vpiNeu)+' / '+lvMhZahl(r.basis.wert)},{text:lvEur(r.basis.kalt*r.vpiNeu/r.basis.wert),rechts:true}]]
      .concat(r.festeZuschlaege?[[{text:'+ spätere Erhöhungen'},{text:lvEur(r.festeZuschlaege),rechts:true}]]:[])
      .concat([[{text:'bisherige Nettokaltmiete'},{text:lvEur(r.aktuell),rechts:true}],[{text:'Änderung'},{text:lvEur(r.erhoehung),rechts:true}],Object.assign([{text:'neue Nettokaltmiete'},{text:lvEur(r.neu),rechts:true}],{fett:true})])});
    b.push({typ:'p',text:'Die geänderte Miete ist ab dem '+LVK.datumDE(r.wirksam)+' zu zahlen (§ 557b Abs. 3 BGB). Die Vorauszahlungen auf die Betriebs- und Heizkosten bleiben unverändert. Bitte passen Sie Ihren Dauerauftrag entsprechend an.'});
    b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  } else {
    titel='Mieterhöhung Modernisierung';
    const verf=r.verfahren==='vereinfacht'?' im vereinfachten Verfahren (§ 559c BGB)':r.verfahren==='559e'?' nach § 559e BGB':'';
    b.push({typ:'h2',text:'Mieterhöhung nach Modernisierung (§ 559'+(r.verfahren==='559e'?'e':'')+' BGB) — '+objekt});
    b.push({typ:'p',text:'Sehr geehrte Damen und Herren,'});
    b.push({typ:'p',text:'wie angekündigt haben wir folgende Modernisierungsmaßnahme durchgeführt: '+(o.massnahme||'[Maßnahme beschreiben]')+'. Wir erhöhen die Nettokaltmiete deshalb'+verf+' wie folgt:'});
    b.push({typ:'tabelle',zeilen:[[{text:'Kosten der Maßnahme für Ihre Wohnung'},{text:lvEur(r.kosten),rechts:true}]]
      .concat(r.geltend!==r.kosten?[[{text:'davon geltend gemacht'},{text:lvEur(r.geltend),rechts:true}]]:[])
      .concat([[{text:'abzüglich Erhaltungsanteil'+(r.verfahren==='vereinfacht'?' (pauschal 30 %)':r.verfahren==='559e'&&!o.heizungGmodg?' (pauschal 15 %)':'')},{text:lvEur(r.erhaltung),rechts:true}],
        [{text:'abzüglich Zuschüsse und Drittmittel'},{text:lvEur(r.zuschuss),rechts:true}],[{text:'anrechenbare Kosten'},{text:lvEur(r.anrechenbar),rechts:true}],
        [{text:r.satz+' % jährlich'+(r.zinsvorteil?' abzüglich Zinsvorteil '+lvEur(r.zinsvorteil):'')},{text:lvEur(r.jahr),rechts:true}],
        [{text:'monatlich'},{text:lvEur(r.monatRoh),rechts:true}]])
      .concat(r.monat<r.monatRoh?[[{text:'begrenzt nach § 559 Abs. 3a BGB auf'},{text:lvEur(r.monat),rechts:true}]]:[])
      .concat([[{text:'bisherige Nettokaltmiete'},{text:lvEur(r.aktuell),rechts:true}],Object.assign([{text:'neue Nettokaltmiete ab '+LVK.datumDE(r.wirksam)},{text:lvEur(r.neu),rechts:true}],{fett:true})])});
    b.push({typ:'p',text:'Die Kosten sind nach Rechnungen ermittelt; die Aufteilung auf die Wohnungen erfolgte nach der Wohnfläche. Die erhöhte Miete ist ab dem '+LVK.datumDE(r.wirksam)+' zu zahlen (§ 559b Abs. 2 BGB).'
      +(r.verfahren==='vereinfacht'?' Die Mieterhöhung ist nach dem vereinfachten Verfahren nach § 559c BGB berechnet.':'')});
    b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  }
  b.push({typ:'p',runs:[{text:'Erstellt mit ImmoApp — vor dem Versand prüfen. Arbeitshilfe, keine Rechtsberatung.',klein:true,farbe:'777777'}]});
  const x=ImmoOffice.docx(b,{titel:titel+' '+lvMieterName(v)});
  lvHerunterladen(x,LV_DOCX,lvDateiname(titel+' '+lvMieterName(v)+' '+lvHeute())+'.docx');
}

lvReiterRegistrieren('mieterhoehung','Mieterhöhung',l=>lvMieterhoehungHtml(l),l=>(l.vertraege||[]).length>0,'nebenkosten');
lvFristenQuelleRegistrieren((l,st,h)=>LVM.fristen(l,st,h));
LV_FRIST_ZIELE.mh558=(jahr,vid)=>{ LV.reiter='mieterhoehung'; LV.mhVertrag=vid||null; LV.mhArt='558'; LV.mhErgebnis=null; };
LV_FRIST_ZIELE.kappvo=()=>{ LV.reiter='mieterhoehung'; };
