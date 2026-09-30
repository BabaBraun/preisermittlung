/* ---------- Kundenakte ------------------------------------------------------------------
   Ein Kunde bündelt Bewertungen (über das versteckte Feld ek_kunde_id der Bewertung), Wiedervorlagen
   (kundeId an der Aufgabe), abgelegte Finanzierungsrechnungen und Gesprächsnotizen. Gespeichert in der
   IndexedDB „ia_bewertungen“, Speicher „kunden“ (D8) — nur auf diesem Gerät, mit Auskunft (Export) und
   Löschung je Kunde. Kundennamen gelangen nie in den Marktüberblick (D4). */
var KD_CACHE=[], KD_AKTIV=null, KD_WAHL=null, KD_SUCHE='';
const KD_GRUNDLAGEN=[['vertrag','Anbahnung oder Durchführung eines Auftrags (Art. 6 Abs. 1 lit. b DSGVO)'],
  ['einwilligung','Einwilligung des Kunden (Art. 6 Abs. 1 lit. a DSGVO)'],['sonstige','Sonstige Rechtsgrundlage (in der Notiz festhalten)']];
const KD_KONTAKTARTEN=['Gespräch','Telefonat','E-Mail','Besichtigung','Angebot','Termin','Sonstiges'];
function kdName(k){
  if(typeof k==='string') k=KD_CACHE.find(x=>x.id===k);
  if(!k) return '';
  let n=[k.vorname,k.nachname].filter(Boolean).join(' ').trim();
  return n&&k.firma?n+' ('+k.firma+')':(n||k.firma||'Ohne Namen');
}
function kdVerfuegbar(){
  if(IA_DB_BEREIT) return true;
  alert('Die Kundenakte braucht die Gerätedatenbank, die in diesem Browserfenster nicht zur Verfügung steht (z. B. privates Fenster).');
  return false;
}
async function kdSpeichern(k){
  k.geaendert=Date.now();
  try{ await iaPut('kunden',k); }catch(e){ alert('Der Kunde konnte nicht gespeichert werden: '+iaFehlerText(e)+'.'); return false; }
  let i=KD_CACHE.findIndex(x=>x.id===k.id); if(i>=0) KD_CACHE[i]=k; else KD_CACHE.push(k);
  return true;
}
function kdBewertungen(id){
  let l=pjLoad().filter(p=>p.data&&p.data.fields&&p.data.fields.ek_kunde_id===id).map(p=>({typ:'projekt',id:p.id,name:p.name,datum:p.datum,empf:p.empf}));
  if(exV('ek_kunde_id')===id&&!l.some(p=>p.name===($('pj_name').value||'').trim())) l.unshift({typ:'aktuell',name:exV('ek_anschrift')||'Aktuelle Bewertung',datum:'in Bearbeitung',empf:($('o_empfehlung')||{}).textContent||''});
  return l;
}
function kdAufgaben(id){ return aufLoad().filter(a=>a.kundeId===id); }

/* --- Dialog --- */
function kdOeffnen(id,wahl){
  if(!kdVerfuegbar()) return;
  KD_WAHL=wahl||null; KD_AKTIV=null;
  let o=$('kd_overlay'); o.classList.add('on'); document.body.style.overflow='hidden';
  if(id) kdAkte(id); else kdListe();
}
function kdSchliessen(){ let o=$('kd_overlay'); o.classList.remove('on'); document.body.style.overflow=''; KD_WAHL=null; KD_AKTIV=null; }
function kdInhalt(html){ $('kd_inhalt').innerHTML=html; $('kd_overlay').scrollTop=0; }
function kdListe(){
  KD_AKTIV=null;
  let sperre=localStorage.getItem('ia_lock_enabled')==='1';
  kdInhalt('<div class="gr-kopf"><h2 id="kd_titel">'+(KD_WAHL?'Kunde auswählen':'Kunden')+'</h2><button class="gr-x" onclick="kdSchliessen()" aria-label="Schließen">✕</button></div>'
    +(KD_WAHL?'':'<p class="hint" style="margin-top:0">Kundendaten liegen nur auf diesem Gerät. Speichere nur, was du für die Beratung brauchst, und lösche Kunden, wenn der Vorgang abgeschlossen ist. <a href="#" onclick="dsgvoOeffnen();return false;">Datenschutz</a></p>')
    +(!KD_WAHL&&!sperre&&KD_CACHE.length?'<div class="kd-tipp">Hier stehen personenbezogene Daten. Tipp: <a href="#" onclick="lockSetupOeffnen();return false;">App-Sperre mit Face ID einschalten</a>, damit niemand am offenen Gerät mitliest.</div>':'')
    +'<div class="kd-leiste"><input type="search" id="kd_q" placeholder="Name, Ort, Telefon, E-Mail …" aria-label="Kunden suchen" value="'+sEsc(KD_SUCHE)+'" oninput="KD_SUCHE=this.value;kdListeZeilen()">'
    +'<button class="primary" onclick="kdNeu()" data-ic="plus">Neuer Kunde</button></div>'
    +'<div class="kd-filter" role="group" aria-label="Filter"><button class="'+(KD_FILTER==='alle'?'on':'')+'" onclick="KD_FILTER=\'alle\';kdListe()">Alle Kunden</button>'
    +'<button class="'+(KD_FILTER==='kauf'?'on':'')+'" onclick="KD_FILTER=\'kauf\';kdListe()">Kaufinteressenten</button></div>'
    +'<div class="kd-liste" id="kd_liste"></div>');
  kdListeZeilen();
}
function kdListeZeilen(){
  let el=$('kd_liste'); if(!el) return;
  let q=sNorm(KD_SUCHE||'').split(/\s+/).filter(Boolean), heute=aufHeute();
  let liste=KD_CACHE.filter(k=>{ if(KD_FILTER==='kauf'&&!(k.suchprofil&&k.suchprofil.aktiv)) return false;
    let hay=sNorm([kdName(k),k.firma,k.plzort,k.strasse,k.telefon,k.email,k.suchprofil&&k.suchprofil.aktiv?'sucht '+(k.suchprofil.orte||''):''].join(' ')); return q.every(t=>hay.indexOf(t)>=0); })
    .sort((a,b)=>(b.geaendert||0)-(a.geaendert||0));
  if(!liste.length){ el.innerHTML='<div class="kd-leer">'+(KD_CACHE.length?'Kein Kunde passt zur Suche.':'Noch keine Kunden angelegt.')+'</div>'; return; }
  el.innerHTML=liste.map(k=>{
    let nb=kdBewertungen(k.id).length, auf=kdAufgaben(k.id).filter(a=>!a.erledigt), faellig=auf.filter(a=>a.frist&&aufTage(a.frist)<=0).length;
    let loesch=k.loeschpruefung&&k.loeschpruefung<=heute;
    let sp=k.suchprofil&&k.suchprofil.aktiv?k.suchprofil:null;
    let marken=[sp?'sucht'+(sp.orte?' in '+sp.orte.split(/[,;]/)[0].trim():'')+(sp.budget?' bis '+eur(sp.budget):''):'',nb?nb+' Bewertung'+(nb===1?'':'en'):'', auf.length?auf.length+' Wiedervorlage'+(auf.length===1?'':'n')+(faellig?' ('+faellig+' fällig)':''):'',
      (k.kontakte||[]).length?(k.kontakte.length)+' Notiz'+(k.kontakte.length===1?'':'en'):''].filter(Boolean);
    return '<button type="button" class="kd-zeile" onclick="'+(KD_WAHL?'kdGewaehlt(\''+k.id+'\')':'kdAkte(\''+k.id+'\')')+'">'
      +'<span class="kd-ini">'+sEsc(kdInitialen(k))+'</span><span class="kd-txt"><b>'+sEsc(kdName(k))+'</b><span>'+sEsc([k.plzort,k.telefon,k.email].filter(Boolean).join(' · ')||'keine Kontaktdaten')+'</span></span>'
      +'<span class="kd-marken">'+marken.map(m=>'<i>'+sEsc(m)+'</i>').join('')+(loesch?'<i class="warn">Löschprüfung fällig</i>':'')+'</span></button>'; }).join('');
}
function kdInitialen(k){ let n=[k.vorname,k.nachname].filter(Boolean); if(!n.length&&k.firma) n=k.firma.split(/\s+/); return n.map(s=>s[0]||'').slice(0,2).join('').toUpperCase()||'?'; }
async function kdNeu(){
  let k={id:'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),anrede:'',vorname:'',nachname:'',firma:'',telefon:'',email:'',
    strasse:'',plzort:'',notiz:'',grundlage:'vertrag',einwilligungAm:'',loeschpruefung:'',erstellt:Date.now(),kontakte:[],finanzierungen:[]};
  if(!(await kdSpeichern(k))) return;
  if(KD_WAHL){ kdGewaehlt(k.id,true); return; }
  kdAkte(k.id,true);
}
function kdGewaehlt(id,neu){ let cb=KD_WAHL; KD_WAHL=null; if(cb) cb(id); if(neu) kdAkte(id,true); else kdSchliessen(); }

/* --- Akte eines Kunden --- */
function kdAkte(id,fokus){
  let k=KD_CACHE.find(x=>x.id===id); if(!k){ kdListe(); return; }
  KD_AKTIV=id;
  const f=(feld,label,typ,ph)=>'<div class="field"><label>'+label+'</label><input'+(typ?' type="'+typ+'"':'')+' value="'+sEsc(k[feld]||'')+'"'+(ph?' placeholder="'+sEsc(ph)+'"':'')
    +' onchange="kdFeld(\''+feld+'\',this.value)" aria-label="'+sEsc(label.replace(/<[^>]+>/g,'').trim())+'"></div>';
  let bew=kdBewertungen(id), auf=aufSortiert(kdAufgaben(id)), fin=(k.finanzierungen||[]).slice().reverse(), kon=(k.kontakte||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')||(b.ts||0)-(a.ts||0));
  let zugeordnet=exV('ek_kunde_id')===id;
  kdInhalt('<div class="gr-kopf"><div><button class="kd-zurueck" onclick="kdListe()" data-ic="arrow-left">Alle Kunden</button><h2 id="kd_titel" style="margin-top:6px">'+sEsc(kdName(k))+'</h2></div>'
    +'<button class="gr-x" onclick="kdSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<h3>Stammdaten</h3><div class="grid">'
    +'<div class="field"><label>Anrede</label><select onchange="kdFeld(\'anrede\',this.value)" aria-label="Anrede">'+['','Frau','Herr','Divers','Firma'].map(a=>'<option'+(a===(k.anrede||'')?' selected':'')+'>'+a+'</option>').join('')+'</select></div>'
    +f('firma','Firma <span class="u">optional</span>')+f('vorname','Vorname')+f('nachname','Nachname')+f('telefon','Telefon','tel')+f('email','E-Mail','email')
    +f('strasse','Straße und Hausnummer')+f('plzort','PLZ und Ort')
    +'</div><div class="field" style="margin-top:10px"><label>Notiz <span class="u">nur Beratungsrelevantes</span></label><textarea rows="3" onchange="kdFeld(\'notiz\',this.value)" aria-label="Notiz">'+sEsc(k.notiz||'')+'</textarea></div>'
    +'<div class="grid" style="margin-top:10px"><div class="field"><label>Rechtsgrundlage der Speicherung</label><select onchange="kdFeld(\'grundlage\',this.value);kdAkte(\''+id+'\')" aria-label="Rechtsgrundlage">'
    +KD_GRUNDLAGEN.map(g=>'<option value="'+g[0]+'"'+(g[0]===k.grundlage?' selected':'')+'>'+g[1]+'</option>').join('')+'</select></div>'
    +(k.grundlage==='einwilligung'?'<div class="field"><label>Einwilligung erteilt am</label><input type="date" value="'+sEsc(k.einwilligungAm||'')+'" onchange="kdFeld(\'einwilligungAm\',this.value)" aria-label="Einwilligung erteilt am"></div>':'')
    +'<div class="field"><label>Löschung prüfen am</label><input type="date" value="'+sEsc(k.loeschpruefung||'')+'" onchange="kdFeld(\'loeschpruefung\',this.value)" aria-label="Löschung prüfen am"></div></div>'
    +'<p class="hint">Ist das Datum erreicht, markiert die Kundenliste den Kunden. Dann prüfen, ob die Daten noch gebraucht werden.</p>'

    +kkProfilHtml(k)
    +'<h3>Bewertungen</h3>'
    +(bew.length?'<div class="kd-karten">'+bew.map(p=>'<div class="kd-karte"><div><b>'+sEsc(p.name)+'</b><span>'+sEsc([p.datum,p.empf&&p.empf!=='0 €'?p.empf:''].filter(Boolean).join(' · '))+'</span></div>'
      +(p.typ==='projekt'?'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();projektLaden(\''+idSicher(p.id)+'\')">Öffnen</button><button class="secondary" onclick="kdProjektLoesen(\''+idSicher(p.id)+'\')">Zuordnung lösen</button></div>'
        :'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();document.body.classList.add(\'started\');window.scrollTo(0,0)">Zur Bewertung</button><button class="secondary" onclick="kdAktuelleZuordnen(\'\')">Zuordnung lösen</button></div>')+'</div>').join('')+'</div>'
      :'<p class="hint" style="margin:0">Noch keine Bewertung zugeordnet.</p>')
    +(zugeordnet?'':'<div class="gr-zeile"><button class="secondary" onclick="kdAktuelleZuordnen(\''+id+'\')">Aktuelle Bewertung diesem Kunden zuordnen</button></div>')

    +'<h3>Wiedervorlagen</h3>'
    +(auf.length?'<div class="kd-auf">'+auf.map(aufZeile).join('')+'</div>':'')
    +'<div class="kd-neu"><input id="kd_auf_text" placeholder="z. B. Unterlagen nachfragen" aria-label="Neue Wiedervorlage"><input id="kd_auf_frist" type="date" aria-label="Fällig am"><button class="secondary" onclick="kdAufgabeNeu()" data-ic="plus">Hinzufügen</button></div>'

    +'<h3>Finanzierungsrechnungen</h3>'
    +(fin.length?'<div class="kd-karten">'+fin.map(x=>'<div class="kd-karte"><div><b>'+sEsc(x.titel||'Finanzierung')+'</b><span>'+sEsc([new Date(x.ts).toLocaleDateString('de-DE'),x.rate?'Rate '+eur(x.rate):'',x.bedarf?'Darlehen '+eur(x.bedarf):'',x.budget?'Budget bis '+eur(x.budget):''].filter(Boolean).join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kdFinanzierungOeffnen(\''+x.id+'\')">Öffnen</button><button class="secondary" onclick="kdFinanzierungWeg(\''+x.id+'\')">Löschen</button></div></div>').join('')+'</div>'
      :'<p class="hint" style="margin:0">Im Finanzierungsrechner über „Beim Kunden ablegen“ speichern.</p>')
    +'<div class="gr-zeile"><button class="secondary" onclick="kdSchliessen();finOeffnen()" data-ic="calc">Finanzierungsrechner öffnen</button></div>'

    +'<h3>Gesprächsnotizen</h3>'
    +'<div class="kd-neu"><input id="kd_kon_datum" type="date" value="'+aufHeute()+'" aria-label="Datum"><select id="kd_kon_art" aria-label="Art">'+KD_KONTAKTARTEN.map(a=>'<option>'+a+'</option>').join('')+'</select>'
    +'<textarea id="kd_kon_text" rows="2" placeholder="Was wurde besprochen, was ist vereinbart?" aria-label="Notiz"></textarea><button class="secondary" onclick="kdKontaktNeu()" data-ic="plus">Notiz speichern</button></div>'
    +(kon.length?'<div class="kd-kontakte">'+kon.map(c=>'<div class="kd-kontakt"><div class="kopf"><b>'+sEsc(c.art||'Notiz')+'</b><span>'+(c.datum?new Date(c.datum+'T00:00:00').toLocaleDateString('de-DE'):'')+'</span>'
      +'<button class="weg" aria-label="Notiz löschen" onclick="kdKontaktWeg(\''+c.id+'\')">'+iaSvg('trash')+'</button></div><div class="t">'+sEsc(c.text)+'</div></div>').join('')+'</div>':'')

    +'<div class="kd-fuss"><button class="secondary" onclick="kdExport(\''+id+'\')" data-ic="download">Daten exportieren (Auskunft)</button>'
    +'<button class="secondary kd-loeschen" onclick="kdLoeschen(\''+id+'\')" data-ic="trash">Kunde löschen</button></div>');
  if(fokus){ let e=$('kd_inhalt').querySelector('input[aria-label="Vorname"]'); if(e) setTimeout(()=>e.focus(),50); }
}
async function kdFeld(feld,wert){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k) return;
  k[feld]=(''+wert).trim();
  if(await kdSpeichern(k)){ let t=$('kd_titel'); if(t) t.textContent=kdName(k); kdAnzeige(); }
}
function kdAktuelleZuordnen(id){
  $('ek_kunde_id').value=id;
  if(id&&!exV('ek_ag')) $('ek_ag').value=kdName(id);
  autosave(); kdAnzeige(); if(KD_AKTIV) kdAkte(KD_AKTIV);
}
async function kdProjektLoesen(pid){
  if(!confirm('Die Zuordnung dieser Bewertung zum Kunden lösen? Die Bewertung selbst bleibt erhalten.')) return;
  try{ let r=await iaGet('projekte',pid); if(r&&r.data&&r.data.fields){ r.data.fields.ek_kunde_id=''; await iaPut('projekte',r); pjCacheSetzen(r); } }
  catch(e){ alert('Die Zuordnung konnte nicht gelöst werden: '+iaFehlerText(e)+'.'); return; }
  kdAkte(KD_AKTIV);
}
function kdAufgabeNeu(){
  let t=($('kd_auf_text').value||'').trim(); if(!t){ $('kd_auf_text').focus(); return; }
  let list=aufLoad();
  list.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:t,frist:$('kd_auf_frist').value||'',objekt:'',kundeId:KD_AKTIV,erledigt:false,angelegt:Date.now()});
  if(aufStore(list)){ aufBadge(); try{ aufStartRender(); }catch(e){} kdAkte(KD_AKTIV); }
}
async function kdKontaktNeu(){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k) return;
  let t=($('kd_kon_text').value||'').trim(); if(!t){ $('kd_kon_text').focus(); return; }
  k.kontakte=(k.kontakte||[]).concat([{id:'c'+Date.now().toString(36),ts:Date.now(),datum:$('kd_kon_datum').value||aufHeute(),art:$('kd_kon_art').value,text:t}]);
  if(await kdSpeichern(k)) kdAkte(k.id);
}
async function kdKontaktWeg(cid){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k||!confirm('Diese Notiz löschen?')) return;
  k.kontakte=(k.kontakte||[]).filter(c=>c.id!==cid); if(await kdSpeichern(k)) kdAkte(k.id);
}
/* Finanzierungsrechnung beim Kunden ablegen und wieder öffnen */
const KD_FIN_FELDER=['fin_kaufpreis','fin_moderni','fin_grest','fin_notar','fin_makler','fin_ek','fin_zins','fin_tilgung','fin_bindung','fin_sonder','fin_kfw','fin_kfw_zins','fin_kfw_tilgung',
  'fin_b_netto','fin_b_sonst','fin_b_erw','fin_b_kinder','fin_b_pausch_erw','fin_b_pausch_kind','fin_b_raten','fin_b_wohnen','fin_b_puffer'];
function kdFinanzierungAblegen(){
  if(!kdVerfuegbar()) return;
  const ablegen=async id=>{
    let k=KD_CACHE.find(x=>x.id===id); if(!k) return;
    finRechnen();
    let werte={}; KD_FIN_FELDER.forEach(f=>{ if($(f)) werte[f]=$(f).value; });
    let titel=(prompt('Bezeichnung der Rechnung:',exV('ek_anschrift')||'Finanzierung')||'').trim(); if(!titel) return;   // Datum steht ohnehin dabei
    k.finanzierungen=(k.finanzierungen||[]).concat([{id:'f'+Date.now().toString(36),ts:Date.now(),titel:titel,werte:werte,
      rate:mdbNum(($('fin_rate')||{}).textContent),bedarf:mdbNum(($('fin_o_bedarf')||{}).textContent),rest:mdbNum(($('fin_o_rest')||{}).textContent),
      budget:window._FINB&&num('fin_b_netto')>0&&window._FINB.maxKp>0?vpRund(window._FINB.maxKp,1000):0}]);
    if(await kdSpeichern(k)) alert('Die Rechnung liegt jetzt in der Kundenakte von '+kdName(k)+'.');
  };
  if(!KD_CACHE.length){ if(confirm('Es gibt noch keinen Kunden. Jetzt einen anlegen?')) kdOeffnen(null,id=>ablegen(id)); return; }
  kdOeffnen(null,id=>ablegen(id));
}
function kdFinanzierungOeffnen(fid){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV), x=k&&(k.finanzierungen||[]).find(f=>f.id===fid); if(!x) return;
  kdSchliessen(); finOeffnen(); finBudgetLeeren();
  Object.keys(x.werte||{}).forEach(f=>{ if($(f)) $(f).value=x.werte[f]; });
  finRechnen();
}
async function kdFinanzierungWeg(fid){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k||!confirm('Diese Finanzierungsrechnung löschen?')) return;
  k.finanzierungen=(k.finanzierungen||[]).filter(f=>f.id!==fid); if(await kdSpeichern(k)) kdAkte(k.id);
}
/* Auskunft: alles, was zu diesem Kunden gespeichert ist, als lesbare Textdatei */
function kdExport(id){
  let k=KD_CACHE.find(x=>x.id===id); if(!k) return;
  let d=v=>v?new Date(typeof v==='number'?v:v+'T00:00:00').toLocaleDateString('de-DE'):'–';
  let g=(KD_GRUNDLAGEN.find(x=>x[0]===k.grundlage)||['',''])[1];
  let z=['Gespeicherte Daten — '+kdName(k),'Stand: '+new Date().toLocaleString('de-DE'),'Gespeichert ausschließlich lokal in der ImmoApp auf dem Gerät des Beraters.','',
    'STAMMDATEN','Anrede: '+(k.anrede||'–'),'Vorname: '+(k.vorname||'–'),'Nachname: '+(k.nachname||'–'),'Firma: '+(k.firma||'–'),'Telefon: '+(k.telefon||'–'),'E-Mail: '+(k.email||'–'),
    'Anschrift: '+([k.strasse,k.plzort].filter(Boolean).join(', ')||'–'),'Notiz: '+(k.notiz||'–'),'Rechtsgrundlage: '+g+(k.einwilligungAm?' (Einwilligung vom '+d(k.einwilligungAm)+')':''),
    'Angelegt: '+d(k.erstellt),'Zuletzt geändert: '+d(k.geaendert),'Löschprüfung: '+d(k.loeschpruefung),'',
    'BEWERTUNGEN'].concat(kdBewertungen(id).map(p=>'- '+p.name+' ('+p.datum+')'),kdBewertungen(id).length?[]:['- keine'],['','WIEDERVORLAGEN'],
    kdAufgaben(id).map(a=>'- '+a.text+(a.frist?' (fällig '+d(a.frist)+')':'')+(a.erledigt?' — erledigt':'')),kdAufgaben(id).length?[]:['- keine'],['','FINANZIERUNGSRECHNUNGEN'],
    (k.finanzierungen||[]).map(x=>'- '+x.titel+' ('+d(x.ts)+')'+(x.rate?', Rate '+eur(x.rate):'')+(x.budget?', Budget bis '+eur(x.budget):'')),(k.finanzierungen||[]).length?[]:['- keine'],['','GESPRÄCHSNOTIZEN'],
    (k.kontakte||[]).map(c=>'- '+d(c.datum)+' '+(c.art||'')+': '+c.text),(k.kontakte||[]).length?[]:['- keine']);
  return iaHerunterladen(new Blob(['\ufeff'+z.join('\r\n')],{type:'text/plain;charset=utf-8'}),'Kundendaten '+kdName(k).replace(/[^\wäöüÄÖÜß -]/g,'').trim()+'.txt');
}
/* Löschen: Kunde, auf Wunsch seine Wiedervorlagen; Bewertungen bleiben, nur die Zuordnung wird gelöst */
async function kdLoeschen(id){
  let k=KD_CACHE.find(x=>x.id===id); if(!k) return;
  let bew=kdBewertungen(id), auf=kdAufgaben(id);
  if(!confirm('„'+kdName(k)+'“ mit allen Notizen und Finanzierungsrechnungen endgültig löschen?'
    +(bew.length?'\n\n'+bew.length+' zugeordnete Bewertung'+(bew.length===1?' bleibt':'en bleiben')+' erhalten, die Zuordnung wird gelöst.':''))) return;
  let aufWeg=auf.length?confirm('Auch die '+auf.length+' Wiedervorlage'+(auf.length===1?'':'n')+' zu diesem Kunden löschen?\n„Abbrechen“ behält sie ohne Kundenbezug.'):false;
  try{
    for(const p of bew.filter(p=>p.typ==='projekt')){ let r=await iaGet('projekte',p.id); if(r&&r.data&&r.data.fields){ r.data.fields.ek_kunde_id=''; await iaPut('projekte',r); pjCacheSetzen(r); } }
    await iaDel('kunden',id);
  }catch(e){ alert('Der Kunde konnte nicht vollständig gelöscht werden: '+iaFehlerText(e)+'.'); return; }
  aufStore(aufLoad().filter(a=>!(aufWeg&&a.kundeId===id)).map(a=>{ if(a.kundeId===id){ let c=Object.assign({},a); delete c.kundeId; return c; } return a; }));
  aufBadge();
  KD_CACHE=KD_CACHE.filter(x=>x.id!==id);
  if(exV('ek_kunde_id')===id){ $('ek_kunde_id').value=''; autosave(); }
  kdAnzeige(); kdListe();
}
/* Anzeige in den Eckdaten */
function kdAnzeige(){
  let el=$('ek_kunde_anzeige'); if(!el) return;
  let id=exV('ek_kunde_id'), k=id&&KD_CACHE.find(x=>x.id===id);
  el.innerHTML=k?'<span class="kd-chip">'+iaSvg('users')+sEsc(kdName(k))+'</span><a href="#" onclick="kdOeffnen(\''+k.id+'\');return false;">Akte</a> · <a href="#" onclick="kdEckWahl();return false;">ändern</a>'
    :id&&!IA_DB_BEREIT?'<span class="u">Kunde wird geladen …</span>'
    :'<a href="#" onclick="kdEckWahl();return false;">Kunde zuordnen</a>'+(id?' <span class="u">(zugeordneter Kunde nicht mehr vorhanden)</span>':'');
}
function kdEckWahl(){ kdOeffnen(null,id=>kdAktuelleZuordnen(id)); }
function kdNachAufgaben(){ if(KD_AKTIV&&$('kd_overlay').classList.contains('on')) kdAkte(KD_AKTIV); else if($('kd_liste')) kdListeZeilen(); }

