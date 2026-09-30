/* ---------- Berichtsumfang ---------------------------------------------------------------
   Der Bericht wird wie bisher vollständig erzeugt; danach entfernt rpFiltern() die abgewählten Abschnitte
   anhand ihrer Überschrift (von einer h2 bis zur nächsten). So bleibt der geprüfte Berichtsaufbau
   unangetastet. rp_abschnitte hält die abgewählten Schlüssel als JSON, rp_vorlage den Namen der Vorlage. */
const RP_ABSCHNITTE=[
  ['Objekt','objektdaten','Objektdaten (Grundbuch, Planungsrecht, Gebäude, Wohnung)',/^(Grundstück, Grundbuch|Planungsrecht|Gebäudedaten|Wohnung \/ Gemeinschaft)/],
  ['Objekt','besichtigung','Feststellungen der Ortsbesichtigung mit Wohnflächenberechnung',/^Feststellungen der Ortsbesichtigung/],
  ['Objekt','beschreibung','Objektbeschreibung',/^Objektbeschreibung/],
  ['Objekt','lagecheck','Lage-Check (Hochwasser, Lärm, Bebauungsplan …)',/^Lage-Check/],
  ['Verfahren','grundlagen','Datengrundlagen und Modellkonformität',/^Datengrundlagen/],
  ['Verfahren','boden','Grundstück und Bodenwert',/^Grundstück & Bodenwert/],
  ['Verfahren','substanz','Preisansatz nach der Gebäudesubstanz',/^Preisansatz nach der Gebäudesubstanz/],
  ['Verfahren','vergleich','Vergleichswert und Vergleichsobjekte',/^(Preisansatz nach Vergleichswert|Vergleichswertverfahren|Vergleichsobjekte)/],
  ['Verfahren','ertrag','Preisansatz nach dem Gebäudeertrag',/^Preisansatz nach dem Gebäudeertrag/],
  ['Verfahren','mieten','Marktmieten-Vergleich',/^Marktmieten-Vergleich/],
  ['Verfahren','rechte','Nießbrauch, Wohnungsrecht, Leibrente, Erbbaurecht',/^(Nießbrauch|Wohnungsrecht|Leibrente|Erbbaurecht)/],
  ['Verfahren','wk','Besondere objektspezifische Merkmale § 8 Abs. 3',/^Besondere objektspezifische/],
  ['Verfahren','energie','Energetische Qualität',/^Energetische Qualität/],
  ['Verfahren','sanierung','Sanierungsweg mit Kosten und Förderung',/^Sanierungsweg/],
  ['Verfahren','pv','Photovoltaik-Anlage',/^Photovoltaik/],
  ['Verfahren','beleihung','Beleihungswert nach BelWertV',/^Beleihungswert/],
  ['Ergebnis','sensitivitaet','Sensitivität',/^Sensitivität/],
  ['Ergebnis','plausi','Plausibilisierung',/^Plausibilisierung/],
  ['Ergebnis','rendite','Rendite und Investitionskosten',/^Rendite/],
  ['Ergebnis','investition','Investitionsrechnung (Cashflow, Eigenkapitalrendite)',/^Investitionsrechnung/],
  ['Ergebnis','diagramm','Diagramm Zusammensetzung des Substanzwerts',/^Zusammensetzung des Substanzwerts/],
  ['Anlagen','grundrisse','Grundrisse',/^Grundrisse/],
  ['Anlagen','fotos','Fotodokumentation',/^Fotodokumentation/],
  ['Anlagen','karten','Karten und Pläne',/^Karten & Pläne/]
];
const RP_VORLAGEN=[
  ['voll','Vollständiger Bericht',[]],
  ['kunde','Kurzbewertung für den Kunden',['objektdaten','besichtigung','mieten','beleihung','sensitivitaet','plausi','rendite','investition','karten']],
  ['bank','Bank intern',['rendite','diagramm']]
];
const RP_EIGENE_KEY='ia_bericht_vorlagen';
function rpEigene(){ try{ return JSON.parse(localStorage.getItem(RP_EIGENE_KEY))||[]; }catch(e){ return []; } }
function rpAlleVorlagen(){ return RP_VORLAGEN.concat(rpEigene().map(v=>['u:'+v.name,v.name,v.aus||[]])); }
function rpAus(){ try{ let a=JSON.parse(exV('rp_abschnitte')||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function rpVorlageName(){ let v=rpAlleVorlagen().find(x=>x[0]===exV('rp_vorlage')); return v?v[1]:'Eigene Auswahl'; }
function rpOptionen(wert){
  let alle=rpAlleVorlagen();
  return '<option value=""'+(alle.some(v=>v[0]===wert)?'':' selected')+'>Eigene Auswahl</option>'
    +alle.map(v=>'<option value="'+sEsc(v[0])+'"'+(v[0]===wert?' selected':'')+'>'+sEsc(v[1])+'</option>').join('');
}
function rpListeRender(neu){
  let box=$('rp_liste'); if(!box) return;
  let sel=$('rp_vorlage'), wert=neu!==undefined?neu:sel.value;
  sel.innerHTML=rpOptionen(wert);
  if($('rp_vorlage_weg')) $('rp_vorlage_weg').hidden=!/^u:/.test(sel.value);
  let aus=rpAus(), gruppen=[...new Set(RP_ABSCHNITTE.map(a=>a[0]))];
  box.innerHTML=gruppen.map(g=>'<div class="rp-gruppe"><b>'+g+'</b>'+RP_ABSCHNITTE.filter(a=>a[0]===g).map(a=>
    '<label class="chk"><input type="checkbox" data-k="'+a[1]+'"'+(aus.includes(a[1])?'':' checked')+' onchange="rpUmschalten(this)"> '+sEsc(a[2])+'</label>').join('')+'</div>').join('');
}
function rpUmschalten(cb){
  let aus=rpAus().filter(k=>k!==cb.dataset.k); if(!cb.checked) aus.push(cb.dataset.k);
  $('rp_abschnitte').value=aus.length?JSON.stringify(aus):'';
  let passt=rpAlleVorlagen().find(v=>v[2].slice().sort().join()===aus.slice().sort().join());
  $('rp_vorlage').value=passt?passt[0]:''; rpListeRender(); autosave();
}
function rpVorlageWaehlen(wert){
  let v=rpAlleVorlagen().find(x=>x[0]===wert); if(!v){ rpListeRender(); return; }
  $('rp_vorlage').value=v[0]; $('rp_abschnitte').value=v[2].length?JSON.stringify(v[2]):'';
  rpListeRender(); autosave();
}
function rpVorlageSpeichern(){
  let name=(prompt('Name der Vorlage (z. B. „Kurzfassung Erbengemeinschaft“):','')||'').trim(); if(!name) return;
  if(RP_VORLAGEN.some(v=>v[1]===name)){ alert('So heißt schon eine mitgelieferte Vorlage. Bitte einen anderen Namen wählen.'); return; }
  let liste=rpEigene().filter(v=>v.name!==name); liste.push({name:name,aus:rpAus()});
  try{ localStorage.setItem(RP_EIGENE_KEY,JSON.stringify(liste)); }catch(e){ alert('Die Vorlage konnte nicht gespeichert werden.'); return; }
  rpListeRender('u:'+name); autosave();   // erst neu aufbauen, dann gibt es die Option
}
function rpVorlageLoeschen(){
  let w=exV('rp_vorlage'); if(!/^u:/.test(w)) return;
  if(!confirm('Vorlage „'+w.slice(2)+'“ löschen? Die aktuelle Auswahl bleibt bestehen.')) return;
  try{ localStorage.setItem(RP_EIGENE_KEY,JSON.stringify(rpEigene().filter(v=>v.name!==w.slice(2)))); }catch(e){}
  $('rp_vorlage').value=''; rpListeRender(); autosave();
}
function rpSchluessel(titel){ titel=(titel||'').replace(/^\d+\.\s+/,'').trim(); let a=RP_ABSCHNITTE.find(x=>x[3].test(titel)); return a?a[1]:null; }
function rpFiltern(root){
  let aus=rpAus(); if(!aus.length) return;
  let weg=false;
  [...root.children].forEach(el=>{
    if(el.tagName==='H2'){ let k=rpSchluessel(el.textContent); weg=!!(k&&aus.includes(k)); }
    else if(el.classList.contains('disc')||el.classList.contains('signblock')) weg=false;
    if(weg) el.remove();
  });
}
function rpLeiste(){
  return '<select class="no-print rp-leiste" aria-label="Berichtsvorlage" onchange="rpVorlageWaehlen(this.value);druckbericht()">'+rpOptionen(exV('rp_vorlage'))+'</select>'
    +'<button class="no-print" onclick="rpZurAuswahl()">Abschnitte wählen</button>';
}
function rpZurAuswahl(){ document.body.classList.remove('report-mode'); document.body.classList.add('started'); let z=$('rp_liste'); if(z) setTimeout(()=>appScrollIntoView(z,{behavior:'smooth',block:'center'}),50); }
