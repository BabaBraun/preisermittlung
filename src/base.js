/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
/* Maskieren: Bilddaten nur als data:-URL eines Rasterbilds, IDs nur aus Buchstaben, Ziffern, _ und -.
   Schützt Bericht, Exposé und Listen vor eingeschleustem HTML/JavaScript (z. B. aus einer fremden Datei). */
function bildUrl(s){ return (typeof s==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=\s]+$/.test(s))?s:''; }
function idSicher(s){ return String(s==null?'':s).replace(/[^\w-]/g,''); }
/* Zahlen lesen — eine Regel für die ganze App (vorher zwei, die „267.901“ unterschiedlich lasen).
   Komma vorhanden → deutsche Schreibweise, Punkte sind Tausender. Mehrere Punkte → Tausender.
   Ein einzelner Punkt vor genau drei Ziffern („450.000“, „1.200“) ist mehrdeutig: In Betragsfeldern
   (€, m², m³, kWh) ist er ein Tausenderpunkt, sonst ein Dezimalpunkt („1.406“ Faktor, „3.5“ %).
   Leerzeichen („450 000“) und Einheiten („450.000 €“) stören nicht; eine führende 0 („0.082“) bleibt dezimal. */
/* Betragsfeld? Aus der Einheit im Feld-Label bzw. im Tabellenkopf der Spalte (einmal ermittelt) */
var BETRAG_IDS=new Map();
function istBetrag(id){
  if(BETRAG_IDS.has(id)) return BETRAG_IDS.get(id);
  let e=$(id); if(!e) return false;
  let t='', f=e.closest('.field');
  if(f){ let l=f.querySelector('label'); t=(l?l.textContent:'')+' '+[...f.querySelectorAll('.unit')].map(x=>x.textContent).join(' '); }
  else{ let td=e.closest('td'), tb=e.closest('table');
    if(td&&tb&&tb.tHead&&tb.tHead.rows.length){ let k=tb.tHead.rows[tb.tHead.rows.length-1].cells[td.cellIndex]; t=k?k.textContent:''; } }
  let b=/€|m²|m³|kWh|EUR/.test(t)&&!/%/.test(t);
  BETRAG_IDS.set(id,b); return b;
}
function num(id){let e=$(id);if(!e)return 0;return zahlLesen(e.value,istBetrag(id));}
function parseNum(s){return zahlLesen(s,false);}
const eur = n => (Math.round(n||0)).toLocaleString('de-DE')+' €';
const num2 = n => (n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const setT=(id,v)=>{let e=$(id);if(e)e.textContent=v;};

/* ---------- Gebäudetypen: NHK 2010 €/m² BGF (Anlage 4 ImmoWertV) + GND (Anlage 1) ----------
   Stufen 3-5 amtlich; Typen mit (*) haben amtlich nur Stufen 3-5 → Stufe 1/2 = Stufe 3 als Untergrenze.
   EFH/DHH/RMH: 5 Stufen lt. NHK 2010, kreuzvalidiert. */
const TYPES = {
  'EFH freistehend · unterkellert, DG ausgebaut':      {nhk:[655,725,835,1005,1260], gnd:80, gew:'1',  amtlich:'1–5'},
  'EFH freistehend · unterkellert, DG nicht ausgeb.':  {nhk:[570,635,730,880,1100],  gnd:80, gew:'1',  amtlich:'1–5'},
  'EFH freistehend · unterkellert, Flachdach':         {nhk:[665,740,850,1025,1285], gnd:80, gew:'1',  amtlich:'1–5'},
  'EFH freistehend · nicht unterkellert, DG ausgeb.':  {nhk:[545,605,695,840,1050],  gnd:80, gew:'1',  amtlich:'1–5'},
  'Doppel-/Reihenendhaus · unterkellert, DG ausgeb.':  {nhk:[615,685,785,945,1180],  gnd:80, gew:'1',  amtlich:'1–5'},
  'Reihenmittelhaus · unterkellert, DG ausgeb.':       {nhk:[575,640,735,885,1105],  gnd:80, gew:'1',  amtlich:'1–5'},
  'Mehrfamilienhaus · bis 6 WE':                       {nhk:[825,825,825,985,1190],  gnd:80, gew:'0.4', amtlich:'3–5 *'},
  'Mehrfamilienhaus · 7–20 WE':                        {nhk:[765,765,765,915,1105],  gnd:80, gew:'0.4', amtlich:'3–5 *'},
  'Mehrfamilienhaus · über 20 WE':                     {nhk:[755,755,755,900,1090],  gnd:80, gew:'0.4', amtlich:'3–5 *'},
  'Wohn-/Geschäftshaus (Mischnutzung)':                {nhk:[860,860,860,1085,1375], gnd:80, gew:'0.4', amtlich:'3–5 *'},
  'Geschäftshaus mit Wohnungen':                       {nhk:[890,890,890,1375,1720], gnd:60, gew:'0.3', amtlich:'3–5 *'},
  'Geschäftshaus ohne Wohnungen':                      {nhk:[930,930,930,1520,1900], gnd:60, gew:'0.3', amtlich:'3–5 *'},
  'Bürogebäude · Massivbau':                           {nhk:[1040,1040,1040,1685,1900],gnd:60, gew:'0.3', amtlich:'3–5 *'},
  'Betriebs-/Werkstattgebäude · eingeschossig':        {nhk:[970,970,970,1165,1430], gnd:40, gew:'0.3', amtlich:'3–5 *'},
  'Betriebs-/Werkstattgeb. · mehrgesch., o. Hallenanteil':{nhk:[910,910,910,1090,1340],gnd:40, gew:'0.3', amtlich:'3–5 *'}
};

/* ---------- NHK-Bauteile ---------- */
function buildNHK(prefix, ownRND){
  // ownRND=true → eigene GND/RND-Felder (Anbau). Beim Hauptgebäude stehen sie in 2.2 (Restnutzungsdauer).
  let h = ownRND
   ? `<div class="grid three" style="margin-bottom:8px">
     <div class="field"><label>NHK Basiswerte €/m² Stufe 1–5</label><input id="${prefix}_base" type="text" value="615, 685, 785, 945, 1180"></div>
     <div class="field"><label>Gesamtnutzungsdauer <span class="u">Jahre</span></label><input id="${prefix}_gnd" type="text" value="80"></div>
     <div class="field"><label>Angepasste RND <span class="u">Jahre (0=autom.)</span></label><input id="${prefix}_rnd" type="text" value="0"></div>
   </div>`
   : `<div class="grid" style="margin-bottom:8px">
     <div class="field full"><label>NHK Basiswerte €/m² Stufe 1–5 <span class="u">(aus Gebäudetyp)</span></label><input id="${prefix}_base" type="text" value="615, 685, 785, 945, 1180"></div>
   </div>`;
  h += `<table class="nhk"><thead><tr><th>Bauteil</th><th>Wägung</th><th>Standardstufe 1–5</th><th>Kostenkennwert €/m²</th></tr></thead><tbody>`;
  NHK_ELEMENTS.forEach((el,i)=>{
    h += `<tr><td>${el[0]}</td><td>${num2(el[1])}</td><td><input id="${prefix}_s${i}" type="text" value="3" style="width:70px"></td><td id="${prefix}_k${i}">0</td></tr>`;
  });
  h += `</tbody><tfoot>
    <tr class="total"><th colspan="3" style="text-align:right">NHK 2010 (Kostenkennwert)</th><th id="${prefix}_nhk">0 €/m²</th></tr>
    <tr><td colspan="3" style="text-align:right">NHK zum Stichtag (× Baupreisindex × Regionalfaktor)</td><td id="${prefix}_nhkheute">0 €/m²</td></tr>
    <tr><td colspan="3" style="text-align:right" id="${prefix}_wmlbl">Alterswertminderung</td><td id="${prefix}_wm">0 %</td></tr>
    <tr class="total"><th colspan="3" style="text-align:right">Gebäudepreis €/m²</th><th id="${prefix}_preis">0 €/m²</th></tr>
    </tfoot></table>`;
  return h;
}

/* ---------- Restnutzungsdauer nach Modernisierungspunkten (ImmoWertV Anlage 2) ---------- */




/* ---------- Unterlagen-Checkliste als eigenstaendiges Dokument ---------------------------
   Zum Mitgeben oder Mailen an den Eigentuemer: was liegt vor, was fehlt noch.
   Nutzt dieselbe Druckstrecke wie der Bericht. */
function druckeUnterlagen(){
  const esc=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  let st=unterlagenStatus();
  let adr=(($('ek_anschrift')||{}).value||'').trim();
  let ag=(($('ek_ag')||{}).value||'').trim();
  let ersteller=(($('ek_ersteller')||{}).value||'').trim();
  let funktion=(($('ek_ersteller_funktion')||{}).value||'').trim();
  let kopf=(($('cfg_kopf')||{}).value||'Immobilien-Preisermittlung').trim();
  let heute=new Date().toLocaleDateString('de-DE');
  let zeilen=AU_UNTERLAGEN.map((u,i)=>{
    let da=(($('au_ul'+i)||{}).checked)===true;
    return '<div class="ul-pos'+(da?' da':'')+'"><span class="kasten">'+(da?'✓':'')+'</span>'
      +'<span class="bez">'+esc(u)+'</span>'
      +'<span class="status">'+(da?'liegt vor':'wird benötigt')+'</span></div>';
  }).join('');
  $('report').className=''; delete $('report').dataset.pdfname;
  $('report').innerHTML=
   '<div class="runhead">'+esc(kopf)+' · Unterlagen'+(adr?' · '+esc(adr):'')+'</div>'
   +'<h1>Benötigte Unterlagen</h1>'
   +'<table>'
   +(adr?'<tr><td>Objekt</td><td>'+esc(adr)+'</td></tr>':'')
   +(ag?'<tr><td>Auftraggeber(in)</td><td>'+esc(ag)+'</td></tr>':'')
   +'<tr><td>Stand</td><td>'+heute+'</td></tr>'
   +'<tr><td>Vollständigkeit</td><td>'+st.da.length+' von '+AU_UNTERLAGEN.length+' vorhanden</td></tr>'
   +'</table>'
   +'<div class="ul-liste">'+zeilen+'</div>'
   +'<div class="ul-hinweis">Bitte die noch fehlenden Unterlagen zusammenstellen — sie werden für eine belastbare '
   +'Wertermittlung und für die Vermarktung benötigt. Kopien oder Scans genügen in der Regel; Grundbuchauszug und '
   +'Baulastenauskunft sollten nicht älter als drei Monate sein.'
   +(ersteller?'<br><br>Bei Rückfragen: '+esc(ersteller)+(funktion?', '+esc(funktion):''):'')
   +'</div>';
  document.body.classList.add('report-mode');
  window.scrollTo(0,0);
}


/* ---------- Beleihungswert nach BelWertV: Vorbelegung aus der Bewertung ---------- */
function bwNutzungWechsel(){
  /* Zins und Objektart auf die Bandbreite der Nutzungsart setzen (SS 12 Abs. 4) */
  let wohnen=$('bw_nutzung').value==='wohnen';
  let min=num('bw_bund')+(wohnen?3:4);
  min=Math.min(Math.max(min,wohnen?3.5:4.5),wohnen?5.5:6.5);
  $('bw_zins').value=num2(min);
  $('bw_objektart').value=wohnen?'80':'60';
  compute();
}
function bwAusBewertung(){
  let R=window._R||{};
  if(R.roh>0) $('bw_roh').value=Math.round(R.roh);
  if(R.bodenwert>0) $('bw_bodenwert').value=Math.round(R.bodenwert);
  /* Herstellungswert: Gebaeudeanteil ohne Bodenwert und ohne Marktanpassung --
     die Marktanpassung ist ein Verkehrswertinstrument und im Beleihungswert nicht anzusetzen. */
  let herstell=(R.hgVor||0)+(R.anVor||0);
  if(herstell>0) $('bw_herstell').value=Math.round(herstell);
  if(R.erRND>0) $('bw_rnd').value=num2(R.erRND);
  /* Nutzungsart aus dem Vordruck ableiten */
  let typ=((($('ek_typ')||{}).value)||'').toLowerCase();
  if(/b(ü|ue)ro|laden|gesch(ä|ae)ft|gewerbe|betrieb|halle/.test(typ)){ $('bw_nutzung').value='gewerbe'; $('bw_objektart').value='60'; }
  compute();
  if(!(R.roh>0)&&!(herstell>0)) alert('In der Bewertung stehen noch keine übernehmbaren Werte — bitte zuerst Eckdaten, Bruttogrundfläche und Miete erfassen.');
}

/* ---------- Aufgaben und Wiedervorlagen ------------------------------------------------
   Bewusst als In-App-Liste ohne Push-Benachrichtigungen: echte Hintergrund-Benachrichtigungen
   brauchen zwingend einen Server (siehe DECISIONS.md D1). Faellige Aufgaben zeigen sich
   stattdessen beim Oeffnen der App auf der Startseite und im Zaehler der Kopfzeile. */
var AUF_KEY='ia_aufgaben', AUF_FILTER='offen';
function aufLoad(){ try{ return JSON.parse(localStorage.getItem(AUF_KEY))||[]; }catch(e){ return []; } }
function aufStore(list){ try{ localStorage.setItem(AUF_KEY,JSON.stringify(list)); try{ kdNachAufgaben(); }catch(e){} return true; }catch(e){ alert('Speicher voll — bitte erledigte Wiedervorlagen entfernen.'); return false; } }
function aufHeute(){ return new Date().toISOString().slice(0,10); }
function aufTage(frist){ if(!frist) return null; return Math.round((new Date(frist+'T00:00:00')-new Date(aufHeute()+'T00:00:00'))/86400000); }
function aufFristText(frist){
  let t=aufTage(frist);
  if(t===null) return {txt:'ohne Frist', cls:''};
  if(t<0) return {txt:Math.abs(t)+' Tag'+(Math.abs(t)===1?'':'e')+' überfällig', cls:'ueber'};
  if(t===0) return {txt:'heute fällig', cls:'heute'};
  if(t===1) return {txt:'morgen fällig', cls:'heute'};
  return {txt:'in '+t+' Tagen', cls:''};
}
function aufOffenFaellig(){ return aufLoad().filter(a=>!a.erledigt && a.frist && aufTage(a.frist)<=0); }
function aufNeu(){
  let text=($('auf_text').value||'').trim();
  if(!text){ $('auf_text').focus(); return; }
  let list=aufLoad();
  list.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), text:text,
    frist:$('auf_frist').value||'', objekt:($('auf_objekt').value||'').trim(), erledigt:false, angelegt:Date.now()});
  if(!aufStore(list)) return;
  $('auf_text').value=''; $('auf_frist').value=''; $('auf_objekt').value='';
  aufRender(); aufBadge(); $('auf_text').focus();
}
function aufToggle(id){
  let list=aufLoad(), a=list.find(x=>x.id===id); if(!a)return;
  a.erledigt=!a.erledigt; a.erledigtAm=a.erledigt?Date.now():null;
  aufStore(list); aufRender(); aufBadge(); aufStartRender();
}
function aufLoeschen(id){
  let list=aufLoad().filter(x=>x.id!==id);
  aufStore(list); aufRender(); aufBadge(); aufStartRender();
}
function aufErledigteLoeschen(){
  let list=aufLoad(), n=list.filter(x=>x.erledigt).length;
  if(!n){ alert('Es sind keine erledigten Wiedervorlagen vorhanden.'); return; }
  if(!confirm(n+' erledigte Wiedervorlage'+(n===1?'':'n')+' entfernen?')) return;
  aufStore(list.filter(x=>!x.erledigt)); aufRender(); aufBadge();
}
function aufFilter(f){ AUF_FILTER=f; aufRender(); }
function aufSortiert(list){
  return list.slice().sort((a,b)=>{
    if(a.erledigt!==b.erledigt) return a.erledigt?1:-1;
    if(!a.frist&&!b.frist) return b.angelegt-a.angelegt;
    if(!a.frist) return 1; if(!b.frist) return -1;
    return a.frist<b.frist?-1:a.frist>b.frist?1:0;
  });
}
function aufZeile(a){
  let f=aufFristText(a.frist);
  return '<div class="auf-zeile'+(a.erledigt?' fertig':'')+'">'
    +'<input type="checkbox" '+(a.erledigt?'checked':'')+' aria-label="Erledigt" onchange="aufToggle(&quot;'+a.id+'&quot;)">'
    +'<div class="txt"><div class="t">'+sEsc(a.text)+'</div><div class="m">'
    +(a.erledigt?'<span>erledigt</span>':'<span class="frist '+f.cls+'">'+sEsc(f.txt)+'</span>')
    +(a.frist?'<span>'+new Date(a.frist+'T00:00:00').toLocaleDateString('de-DE')+'</span>':'')
    +(a.objekt?'<span>'+sEsc(a.objekt)+'</span>':'')+(a.kundeId&&typeof kdName==='function'&&kdName(a.kundeId)?'<span>'+sEsc(kdName(a.kundeId))+'</span>':'')+'</div></div>'
    +'<button class="weg" aria-label="Wiedervorlage löschen" onclick="aufLoeschen(&quot;'+a.id+'&quot;)">'+iaSvg('trash')+'</button></div>';
}
function aufRender(){
  let alle=aufLoad();
  let list=aufSortiert(AUF_FILTER==='offen'?alle.filter(a=>!a.erledigt):alle);
  let el=$('auf_liste'); if(!el)return;
  el.innerHTML=list.length?list.map(aufZeile).join('')
    :'<div class="auf-leer">'+(alle.length?'Keine offenen Wiedervorlagen — gut gemacht.':'Noch keine Wiedervorlage angelegt.')+'</div>';
  let offen=alle.filter(a=>!a.erledigt).length, faellig=aufOffenFaellig().length;
  setT('auf_zusammenfassung', offen+' offen'+(faellig?' · '+faellig+' fällig':''));
  ['offen','alle'].forEach(f=>{ let b=$('auf_f_'+f); if(b) b.classList.toggle('primary',AUF_FILTER===f); });
}
function aufBadge(){
  let n=aufOffenFaellig().length;
  ['auf_btn_hdr','auf_btn_start'].forEach(id=>{
    let b=$(id); if(!b)return;
    let alt=b.querySelector('.auf-badge'); if(alt) alt.remove();
    if(n) b.insertAdjacentHTML('beforeend','<span class="auf-badge">'+(n>9?'9+':n)+'</span>');
    b.title='Wiedervorlagen'+(n?' — '+n+' fällig':'');
    b.setAttribute('aria-label',b.title);
  });
}
function aufStartRender(){
  let block=$('start_auf_block'), el=$('start_auf'); if(!block||!el)return;
  let faellig=aufSortiert(aufOffenFaellig());
  if(!faellig.length){ block.style.display='none'; return; }
  block.style.display='';
  setT('start_auf_titel', faellig.length+' Wiedervorlage'+(faellig.length===1?'':'n')+' fällig');
  el.innerHTML=faellig.slice(0,5).map(aufZeile).join('')
    +(faellig.length>5?'<div class="auf-leer" style="padding:10px">und '+(faellig.length-5)+' weitere</div>':'');
}
function aufOeffnen(){
  $('auf_overlay').classList.add('on');
  if(!$('auf_frist').value) $('auf_frist').value=aufHeute();
  let adr=(($('ek_anschrift')||{}).value||'').trim();
  if(adr && !$('auf_objekt').value && document.body.classList.contains('started')) $('auf_objekt').value=adr;
  aufRender(); setTimeout(()=>$('auf_text').focus(),50);
}
function aufSchliessen(){ $('auf_overlay').classList.remove('on'); aufStartRender(); aufBadge(); }
['input','change'].forEach(ev=>{ let o=$('auf_overlay'); if(o) o.addEventListener(ev,e=>e.stopPropagation()); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('auf_overlay'); if(o&&o.classList.contains('on')) aufSchliessen(); } });

/* ---------- Finanzierungsrechner: Annuitaetendarlehen mit Nebenkosten und Tilgungsplan ----
   Deutsche Bankpraxis: Annuitaet = Darlehen x (Sollzins + anfaengliche Tilgung) / 100,
   monatlich nachschuessig gezahlt. Sondertilgung jeweils am Jahresende. */
function finRechnen(){
  try{
    let kp=num('fin_kaufpreis'), mod=num('fin_moderni');
    let grest=kp*num('fin_grest')/100, notar=kp*num('fin_notar')/100, makler=kp*num('fin_makler')/100;
    let gesamt=kp+grest+notar+makler+mod;
    let ek=num('fin_ek'), bedarf=Math.max(gesamt-ek,0);
    let kfw=Math.min(num('fin_kfw'),bedarf), bank=Math.max(bedarf-kfw,0);
    let bindung=Math.max(Math.round(num('fin_bindung')),0);

    setT('fin_o_kp',eur(kp));
    setT('fin_o_grest',eur(grest)); setT('fin_o_grest_p',num2(num('fin_grest'))+' %');
    setT('fin_o_notar',eur(notar)); setT('fin_o_notar_p',num2(num('fin_notar'))+' %');
    setT('fin_o_makler',eur(makler)); setT('fin_o_makler_p',num2(num('fin_makler'))+' %');
    setT('fin_o_moderni',eur(mod)); setT('fin_o_gesamt',eur(gesamt));
    setT('fin_o_ek','− '+eur(ek)); setT('fin_o_ek_p',gesamt>0?num2(ek/gesamt*100)+' % der Gesamtkosten':'');
    setT('fin_o_bedarf',eur(bedarf)); setT('fin_o_kfw',eur(kfw)); setT('fin_o_bank',eur(bank));
    setT('fin_o_auslauf',kp>0?num2(bedarf/kp*100)+' %':'–');
    let bwWert=parseNum((($('o_beleihungswert')||{}).textContent)||'')?mdbNum((($('o_beleihungswert')||{}).textContent)||''):0;
    $('fin_zeile_bw').style.display=bwWert>0?'':'none';
    setT('fin_o_bw_wert',bwWert>0?'('+eur(bwWert)+')':'');
    setT('fin_o_auslauf_bw',bwWert>0?num2(bedarf/bwWert*100)+' %':'–');

    let a=finTilgungsverlauf(bank,num('fin_zins'),num('fin_tilgung'),num('fin_sonder'),60);
    let b=finTilgungsverlauf(kfw,num('fin_kfw_zins'),num('fin_kfw_tilgung'),0,60);
    let rate=a.rate+b.rate;
    setT('fin_rate',eur(rate));
    setT('fin_rate_sub', bedarf>0
      ? eur(bank)+' Bankdarlehen'+(kfw>0?' + '+eur(kfw)+' Förderdarlehen':'')+' · '+num2(num('fin_zins'))+' % Zins, '+num2(num('fin_tilgung'))+' % Tilgung'
      : 'Kaufpreis und Eigenkapital eintragen');

    let z1=bank*num('fin_zins')/100/12 + kfw*num('fin_kfw_zins')/100/12;
    setT('fin_o_z1',eur(z1)); setT('fin_o_t1',eur(Math.max(rate-z1,0)));
    let restA=a.restNach(bindung), restB=b.restNach(bindung);
    setT('fin_o_rest',eur(restA+restB));
    setT('fin_o_zins_bindung',eur(a.zinsBis(bindung)+b.zinsBis(bindung)));
    let monate=Math.max(a.monate,b.monate);
    let getilgt=(!bank||a.tilgt)&&(!kfw||b.tilgt);
    let voll=getilgt&&(!bank||(a.jahre.length&&a.jahre[a.jahre.length-1].ende<=0.01))&&(!kfw||(b.jahre.length&&b.jahre[b.jahre.length-1].ende<=0.01));
    setT('fin_o_laufzeit', !(bedarf>0) ? '–'
      : !getilgt ? 'keine Tilgung — die Rate deckt nur die Zinsen'
      : voll ? Math.floor(monate/12)+' Jahre '+(monate%12)+' Monate'
      : 'über 60 Jahre');
    setT('fin_o_zins_gesamt',eur(a.zinsSumme+b.zinsSumme));

    let hinweise=[];
    if(bank>0&&num('fin_tilgung')<1) hinweise.push('Anfängliche Tilgung unter 1 % — die Laufzeit wird sehr lang und die Zinslast entsprechend hoch.');
    if(kp>0&&ek<grest+notar+makler) hinweise.push('Das Eigenkapital deckt nicht einmal die Kaufnebenkosten — die Bank verlangt in der Regel mindestens deren Finanzierung aus Eigenmitteln.');
    if(kp>0&&bedarf/kp>1) hinweise.push('Der Finanzierungsbedarf übersteigt den Kaufpreis (Auslauf über 100 %) — Vollfinanzierung mit deutlichem Zinsaufschlag.');
    if(kp>0&&bedarf/kp>0.8&&bedarf/kp<=1) hinweise.push('Auslauf über 80 % — üblicherweise mit Zinsaufschlag verbunden.');
    $('fin_hinweis').innerHTML=hinweise.map(h=>'<div class="mdb-warn">'+sEsc(h)+'</div>').join('');

    finPlanRender(a,b,bindung);
    finBudget();
  }catch(e){}
}
function finPlanRender(a,b,bindung){
  let n=Math.max(a.jahre.length,b.jahre.length);
  let thead=$('fin_plan').querySelector('thead'), tb=$('fin_plan').querySelector('tbody');
  thead.innerHTML='<tr><th>Jahr</th><th>Restschuld Jahresanfang</th><th>Zinsen</th><th>Tilgung</th><th>Restschuld Jahresende</th></tr>';
  if(!n){ tb.innerHTML='<tr><td colspan="5"><div class="mdb-empty">Kaufpreis, Eigenkapital und Konditionen eintragen.</div></td></tr>'; return; }
  let zeilen='';
  for(let j=1;j<=Math.min(n,60);j++){
    let ea=a.jahre.find(x=>x.jahr===j), eb=b.jahre.find(x=>x.jahr===j);
    let start=(ea?ea.start:0)+(eb?eb.start:0);
    let zins=(ea?ea.zins:0)+(eb?eb.zins:0);
    let tilg=(ea?ea.tilgung:0)+(eb?eb.tilgung:0);
    let ende=(ea?ea.ende:0)+(eb?eb.ende:0);
    let markiert=(j===bindung);
    zeilen+='<tr'+(markiert?' style="background:var(--tint);font-weight:600"':'')+'><td>'+j+(markiert?' · Ende Zinsbindung':'')+'</td>'
      +'<td class="r">'+eur(start)+'</td><td class="r">'+eur(zins)+'</td><td class="r">'+eur(tilg)+'</td><td class="r strong">'+eur(ende)+'</td></tr>';
  }
  tb.innerHTML=zeilen;
}
function finOeffnen(){
  $('fin_overlay').classList.add('on'); document.body.style.overflow='hidden';
  if(!num('fin_kaufpreis')) finAusBewertung(true);
  finRechnen();
}
function finSchliessen(){
  $('fin_overlay').classList.remove('on'); document.body.style.overflow='';
  if(!document.body.classList.contains('started')) startStep0();
}
function finAusBewertung(still){
  /* mdbNum statt parseNum: parseNum liest "267.901" als 267,901 (Punkt = Dezimaltrenner ohne Komma) */
  let emp=mdbNum((($('o_empfehlung')||{}).textContent)||'');
  if(emp>0){ $('fin_kaufpreis').value=Math.round(emp).toLocaleString('de-DE'); finRechnen(); }
  else if(!still) alert('In der Bewertung steht noch keine Preisempfehlung — bitte zuerst die Eckdaten ausfüllen oder den Kaufpreis von Hand eintragen.');
}
function finDrucken(){ window.print(); }
['input','change'].forEach(ev=>{ let f=$('fin_overlay'); if(f) f.addEventListener(ev,e=>e.stopPropagation()); });
try{ finPauschLaden(); }catch(e){}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let f=$('fin_overlay'); if(f&&f.classList.contains('on')) finSchliessen(); } });

/* ---------- Plausibilitaetspruefung der Eingaben --------------------------------------
   Bewusst nur Werte, die fachlich kaum vorkommen koennen (Zahlendreher, Vertipper,
   logische Widersprueche) -- keine Warnung bei blossen Ungewoehnlichkeiten, sonst werden
   die Hinweise ignoriert. Jeder Hinweis springt beim Anklicken zum betroffenen Feld. */
var PLAUSI_REGELN=[
  {f:'nhkhg_gnd', s:'warn', t:()=>{ if(modus()==='wohnung'||typeof pqSatz!=='function') return false; let s=pqSatz(); return !!(s&&s.modell&&s.modell.gnd>0&&num('nhkhg_gnd')!==s.modell.gnd); },
   m:()=>'Gesamtnutzungsdauer weicht vom Modell des Gutachterausschusses ab — der Sachwertfaktor ist so nicht modellkonform (§ 10 ImmoWertV).'},
  {f:'ek_baujahr', s:'fehler', t:()=>{let b=num('ek_baujahr');return b>0&&b>new Date().getFullYear()+2;},
   m:()=>'Baujahr liegt in der Zukunft.'},
  {f:'ek_baujahr', s:'fehler', t:()=>{let b=num('ek_baujahr');return b>0&&b<1500;},
   m:()=>'Baujahr unter 1500 — vermutlich ein Zahlendreher.'},
  {f:'ek_sanierung', s:'fehler', t:()=>{let b=num('ek_baujahr'),sa=num('ek_sanierung');return sa>0&&b>0&&sa<b;},
   m:()=>'Sanierungsjahr liegt vor dem Baujahr.'},
  {f:'ek_sanierung', s:'fehler', t:()=>{let sa=num('ek_sanierung');return sa>0&&sa>new Date().getFullYear()+2;},
   m:()=>'Sanierungsjahr liegt in der Zukunft.'},
  {f:'ek_wohnflaeche', s:'warn', t:()=>{let w=num('ek_wohnflaeche');return w>0&&w<20;},
   m:()=>'Wohnfläche unter 20 m² — bitte prüfen.'},
  {f:'ek_wohnflaeche', s:'warn', t:()=>{let w=num('ek_wohnflaeche');return w>900;},
   m:()=>'Wohnfläche über 900 m² — bitte prüfen (Zahlendreher?).'},
  {f:'ek_wohnflaeche', s:'fehler', t:()=>{let w=num('ek_wohnflaeche'),b=parseNum(($('o_bgf_hg')||{}).textContent||'');
     return w>0&&b>0&&!$('anbau_aktiv').checked&&w>b*1.05;},
   m:()=>'Wohnfläche ist größer als die Bruttogrundfläche — das kann nicht sein.'},
  {f:'ek_brw', s:'warn', t:()=>{let b=num('ek_brw');return b>0&&b<10;},
   m:()=>'Bodenrichtwert unter 10 €/m² — bitte prüfen.'},
  {f:'ek_brw', s:'warn', t:()=>num('ek_brw')>2500,
   m:()=>'Bodenrichtwert über 2.500 €/m² — außerhalb von Spitzenlagen ungewöhnlich.'},
  /* Achtung: ek_miete_wohnen ist die JAHRESmiete (Feldeinheit €/Jahr).
     Fuer die Pruefung je Quadratmeter und Monat deshalb durch 12 teilen. */
  {f:'ek_miete_wohnen', s:'warn', t:()=>{let m=num('ek_miete_wohnen'),w=num('ek_wohnflaeche');
     return m>0&&w>0&&(m/12/w)<3;},
   m:()=>{let m=num('ek_miete_wohnen'),w=num('ek_wohnflaeche');return 'Miete entspricht nur '+num2(m/12/w)+' €/m² im Monat — bitte prüfen (Monats- statt Jahresmiete eingetragen?).';}},
  {f:'ek_miete_wohnen', s:'warn', t:()=>{let m=num('ek_miete_wohnen'),w=num('ek_wohnflaeche');
     return m>0&&w>0&&(m/12/w)>30;},
   m:()=>{let m=num('ek_miete_wohnen'),w=num('ek_wohnflaeche');return 'Miete entspricht '+num2(m/12/w)+' €/m² im Monat — bitte prüfen.';}},
  {f:'nhkhg_rnd', s:'fehler', t:()=>{let r=num('nhkhg_rnd'),g=num('nhkhg_gnd');return r>0&&g>0&&r>g;},
   m:()=>'Restnutzungsdauer ist länger als die Gesamtnutzungsdauer.'},
  {f:'er_zins_basis', s:'warn', t:()=>{let z=num('er_zins_basis')+num('er_zins_adj');return z>0&&(z<0.5||z>10);},
   m:()=>{let z=num('er_zins_basis')+num('er_zins_adj');return 'Liegenschaftszins von '+num2(z)+' % liegt außerhalb der üblichen Bandbreite (rund 1–8 %).';}},
  {f:'markt_faktor', s:'warn', t:()=>{let f=num('markt_faktor');return f>0&&(f<0.5||f>1.8);},
   m:()=>'Marktanpassungsfaktor außerhalb 0,5–1,8 — bitte gegen den Sachwertfaktor des Gutachterausschusses prüfen.'},
  {f:'ek_hausgeld', s:'warn', t:()=>{let h=num('ek_hausgeld'),w=num('ek_wohnflaeche');return h>0&&w>0&&(h/w)>7;},
   m:()=>{let h=num('ek_hausgeld'),w=num('ek_wohnflaeche');return 'Hausgeld entspricht '+num2(h/w)+' €/m² im Monat — ungewöhnlich hoch.';}},
  {f:'verhandlung', s:'warn', t:()=>num('verhandlung')>25,
   m:()=>'Verhandlungsspanne über 25 % — das macht die Preisempfehlung wenig aussagekräftig.'},
  /* Bewusst KEINE Regel auf die Abweichung zwischen Substanz- und Ertragswert:
     bei eigengenutzten Ein-/Zweifamilienhaeusern liegt der Sachwert strukturell weit ueber
     dem Ertragswert. Eine Warnung darauf traefe fast jede Hausbewertung und wuerde die
     uebrigen Hinweise entwerten. Die methodisch saubere Ergebnispruefung ist die
     Plausibilisierung gegen den Marktvergleich in Abschnitt 9.1. */
  {f:'ek_miete_wohnen', s:'warn', t:()=>{let R=window._R||{}, m=num('ek_miete_wohnen')+num('ek_miete_gewerbe');
     if(!(m>0)||!(R.empfehlung>0)) return false; let fak=R.empfehlung/m; return fak<10||fak>45;},
   m:()=>{let R=window._R||{}, m=num('ek_miete_wohnen')+num('ek_miete_gewerbe');
     return 'Kaufpreisfaktor von '+num2(R.empfehlung/m)+' Jahresmieten — außerhalb der üblichen Bandbreite.';}}
];
function plausiPruefen(){
  let hinweise=[], P=window._PRUEF;
  if(P){
    P.hinweise.forEach(x=>hinweise.push({feld:x.feld, stufe:x.stufe, text:(['zahl','negativ','prozent'].includes(x.art)?feldName(x.feld)+': ':'')+x.text}));
    P.fehlend.forEach(x=>hinweise.push({feld:x.feld, stufe:'warn', text:x.text}));
  }
  PLAUSI_REGELN.forEach(r=>{ try{ if(r.t()) hinweise.push({feld:r.f, stufe:r.s, text:r.m()}); }catch(e){} });
  return hinweise;
}
function plausiRender(){
  let hinweise;
  try{ hinweise=plausiPruefen(); }catch(e){ return; }
  document.querySelectorAll('.pruef-warn,.pruef-fehler').forEach(e=>e.classList.remove('pruef-warn','pruef-fehler'));
  let block=$('cp_pruef_block'), liste=$('cp_pruef');
  if(!block||!liste) return;
  if(!hinweise.length){ block.style.display='none'; liste.innerHTML=''; return; }
  block.style.display='';
  let fehler=hinweise.filter(h=>h.stufe==='fehler').length;
  setT('cp_pruef_titel', hinweise.length+' Prüfhinweis'+(hinweise.length>1?'e':'')+(fehler?' · '+fehler+' kritisch':''));
  liste.innerHTML=hinweise.map((h,i)=>'<button type="button" class="pz'+(h.stufe==='fehler'?' fehler':'')+'" data-i="'+i+'">'
    +'<span class="pd"></span><span>'+sEsc(h.text)+'</span></button>').join('');
  liste.querySelectorAll('.pz').forEach(b=>{
    let h=hinweise[+b.dataset.i];
    b.onclick=()=>{ let e=$(h.feld); if(!e)return; appScrollIntoView(e,{behavior:'smooth',block:'center'});
      setTimeout(()=>{ try{e.focus({preventScroll:true});}catch(x){} },350); };
  });
  hinweise.forEach(h=>{ let e=$(h.feld); if(e) e.classList.add(h.stufe==='fehler'?'pruef-fehler':'pruef-warn'); });
}

/* ---------- Energetische Qualitaet: Klassengrenzen der GEG-Skala (kWh/(m2a)) ----------
   Steht bewusst bei den uebrigen Fachtabellen: compute() laeuft frueh und braucht sie
   bereits beim ersten Durchlauf. */

function buildModPunkte(){
  let tb=$('modpunkte_tbl').querySelector('tbody'); tb.innerHTML='';
  MOD_ELEMENTS.forEach((el,i)=>{
    tb.insertAdjacentHTML('beforeend',
      `<tr><td>${el[0]}</td><td>${el[1]}</td><td><input id="mod_p${i}" type="text" value="0" style="width:70px"></td></tr>`);
  });
}
