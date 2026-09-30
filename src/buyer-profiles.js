/* ---------- Käuferkartei: Suchprofile in der Kundenakte und Abgleich mit Objekten ----------------------
   Ein Kunde kann ein Suchprofil haben (k.suchprofil). Der Abgleich läuft in beide Richtungen: zum offenen
   Objekt die passenden Interessenten (Exposé, Präsentation), zum Interessenten die passenden Objekte aus den
   Projekten. „Passt fast“ zeigt knappe Abweichungen mit Begründung, statt gute Kandidaten zu verstecken.
   In der Präsentation erscheinen nur Anzahlen, nie Namen. */
const KK_FINANZ=[['offen','Finanzierung noch offen'],['geprueft','Finanzierung geprüft'],['bar','Kauf ohne Finanzierung']];
var KD_FILTER='alle';
function kkObjekt(f,empfText){
  f=f||{}; let typ=f.ek_typ||'';
  let kat=(f.ek_modus||'haus')==='wohnung'?'etw':/^EFH/.test(typ)?'efh':/^(Doppel|Reihen)/.test(typ)?'rh':/^Mehrfamilienhaus/.test(typ)?'mfh':/^(Wohn-\/Geschäftshaus|Geschäftshaus mit)/.test(typ)?'wgh':'gewerbe';
  let adr=(f.ek_anschrift||'').trim(), m=adr.match(/\b\d{5}\s+([^,]+)/), ort=m?m[1].trim():(adr.split(',').map(x=>x.trim()).filter(Boolean).slice(1).pop()||'');
  let preis=zahlLesen(f.ex_preis,true)||zahlLesen(f.vp_angebot,true)||(empfText?zahlLesen(empfText,true):0);
  return {kat:kat,ort:ort,preis:preis,wf:zahlLesen(f.ek_wohnflaeche,true),zimmer:zahlLesen(f.au_zimmer,false),gs:(f.ek_modus==='wohnung'?0:zahlLesen(f.ek_gs_flaeche,true)),titel:adr||'Objekt'};
}
function kkAktuellesObjekt(){ let R=window._R||{}; return kkObjekt(collect(),R.empfehlung>0?''+Math.round(R.empfehlung):''); }
function kkPruefen(sp,o){
  if(!sp||!sp.aktiv||!o) return null;
  let ab=[];
  if(sp.arten&&sp.arten.length&&!sp.arten.includes(o.kat)) return null;
  let orte=(sp.orte||'').split(/[,;\n]+/).map(x=>x.trim().toLowerCase()).filter(Boolean), ort=(o.ort||'').toLowerCase();
  if(orte.length&&ort&&!orte.some(x=>ort.includes(x)||x.includes(ort))) return null;
  if(sp.budget>0&&o.preis>0){ if(o.preis>sp.budget*1.1) return null; if(o.preis>sp.budget) ab.push('Preis '+Math.round((o.preis/sp.budget-1)*100)+' % über dem Budget'); }
  if(sp.wf>0&&o.wf>0&&o.wf<sp.wf){ if(o.wf<sp.wf*0.9) return null; ab.push('Wohnfläche knapp unter dem Wunsch'); }
  if(sp.zimmer>0&&o.zimmer>0&&o.zimmer<sp.zimmer) ab.push(o.zimmer+' statt '+sp.zimmer+' Zimmer');
  if(sp.gs>0&&o.gs>0&&o.gs<sp.gs*0.8) ab.push('Grundstück kleiner als gewünscht');
  return {stufe:ab.length?'fast':'passt',ab:ab};
}
function kkTreffer(o){
  const rang=k=>(k.suchprofil.finanzierung==='geprueft'||k.suchprofil.finanzierung==='bar')?0:1;
  return KD_CACHE.filter(k=>k.suchprofil&&k.suchprofil.aktiv).map(k=>({k:k,t:kkPruefen(k.suchprofil,o)})).filter(x=>x.t)
    .sort((a,b)=>(a.t.stufe==='passt'?0:1)-(b.t.stufe==='passt'?0:1)||rang(a.k)-rang(b.k));
}
function kkFinanzText(sp){ return (KK_FINANZ.find(x=>x[0]===(sp&&sp.finanzierung))||KK_FINANZ[0])[1]; }
/* Suchprofil in der Akte */
function kkProfilHtml(k){
  let sp=k.suchprofil||{}, an=!!sp.aktiv;
  const f=(feld,label,ph,betrag)=>'<div class="field"><label>'+label+'</label><input value="'+sEsc(sp[feld]!=null&&sp[feld]!==0?(betrag&&sp[feld]>0?(+sp[feld]).toLocaleString('de-DE'):sp[feld]):'')+'" placeholder="'+sEsc(ph||'')+'" onchange="kkFeld(\''+feld+'\',this.value)" aria-label="'+label.replace(/<[^>]+>/g,'')+'"></div>';
  let h='<h3>Suchprofil</h3><label class="toggle"><input type="checkbox"'+(an?' checked':'')+' onchange="kkFeld(\'aktiv\',this.checked)"> sucht eine Immobilie zum Kauf</label>';
  if(!an) return h;
  h+='<div class="kk-arten">'+PQ_KAT.map(x=>'<label class="chk"><input type="checkbox"'+((sp.arten||[]).includes(x[0])?' checked':'')+' onchange="kkArt(\''+x[0]+'\',this.checked)"> '+x[1]+'</label>').join('')+'</div>'
    +'<div class="grid">'+f('orte','Orte <span class="u">mit Komma getrennt</span>','z. B. Ilsfeld, Beilstein, Abstatt')+f('budget','Budget bis <span class="u">€</span>','z. B. 500.000',true)
    +f('wf','Wohnfläche ab <span class="u">m²</span>','z. B. 120',true)+f('zimmer','Zimmer ab','z. B. 4')+f('gs','Grundstück ab <span class="u">m²</span>','z. B. 400',true)
    +'<div class="field"><label>Finanzierung</label><select onchange="kkFeld(\'finanzierung\',this.value)" aria-label="Finanzierung">'
    +KK_FINANZ.map(x=>'<option value="'+x[0]+'"'+(x[0]===(sp.finanzierung||'offen')?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></div></div>'
    +'<div class="field" style="margin-top:10px"><label>Wünsche und Ausschlüsse</label><input value="'+sEsc(sp.notiz||'')+'" placeholder="z. B. Garten, keine Hauptstraße" onchange="kkFeld(\'notiz\',this.value)" aria-label="Wünsche und Ausschlüsse"></div>';
  // passende Objekte: offene Bewertung und Projekte
  let obj=[], akt=kkAktuellesObjekt();
  if(akt.titel&&akt.titel!=='Objekt'){ let t=kkPruefen(sp,akt); if(t) obj.push({titel:akt.titel+' (in Bearbeitung)',o:akt,t:t,id:''}); }
  pjLoad().forEach(p=>{ let o=kkObjekt(p.data&&p.data.fields,p.empf); if(akt.titel&&o.titel===akt.titel) return; let t=kkPruefen(sp,o); if(t) obj.push({titel:p.name,o:o,t:t,id:p.id}); });
  h+='<h3>Passende Objekte</h3>'+(obj.length?'<div class="kd-karten">'+obj.map(x=>'<div class="kd-karte"><div><b>'+sEsc(x.titel)+' <span class="kk-stufe '+x.t.stufe+'">'+(x.t.stufe==='passt'?'passt':'passt fast')+'</span></b>'
      +'<span>'+sEsc([pqKatName(x.o.kat),x.o.wf?Math.round(x.o.wf)+' m²':'',x.o.preis?eur(x.o.preis):''].filter(Boolean).join(' · ')+(x.t.ab.length?' — '+x.t.ab.join(', '):''))+'</span></div>'
      +(x.id?'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();projektLaden(\''+x.id+'\')">Öffnen</button></div>':'')+'</div>').join('')+'</div>'
    :'<p class="hint" style="margin:0">Unter deinen Projekten passt gerade nichts. Neue Bewertungen werden automatisch abgeglichen.</p>');
  return h;
}
async function kkFeld(feld,wert){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k) return;
  k.suchprofil=k.suchprofil||{aktiv:false,arten:[],finanzierung:'offen',seit:aufHeute()};
  if(feld==='budget'||feld==='wf'||feld==='gs') wert=zahlLesen(wert,true);
  else if(feld==='zimmer') wert=zahlLesen(wert,false);
  else if(feld!=='aktiv') wert=(''+wert).trim();
  k.suchprofil[feld]=wert;
  if(await kdSpeichern(k)) kdAkte(k.id);
}
async function kkArt(kat,an){
  let k=KD_CACHE.find(x=>x.id===KD_AKTIV); if(!k||!k.suchprofil) return;
  let a=(k.suchprofil.arten||[]).filter(x=>x!==kat); if(an) a.push(kat); k.suchprofil.arten=a;
  if(await kdSpeichern(k)) kdAkte(k.id);
}
/* Treffer zum offenen Objekt: Hinweis im Exposé-Abschnitt und Liste im Kundendialog */
function kkStatus(){
  let el=$('kk_treffer'); if(!el) return;
  if(!IA_DB_BEREIT){ el.innerHTML=''; return; }
  let tr=kkTreffer(kkAktuellesObjekt()), passt=tr.filter(x=>x.t.stufe==='passt').length, fin=tr.filter(x=>['geprueft','bar'].includes(x.k.suchprofil.finanzierung)).length;
  el.innerHTML=tr.length?'<b>'+tr.length+' Interessent'+(tr.length===1?'':'en')+' aus der Käuferkartei</b><span>'+passt+(passt===1?' passt':' passen')+' genau, '+fin+' mit geprüfter Finanzierung oder ohne Finanzierungsbedarf</span>'
    +'<button class="secondary" onclick="kkTrefferZeigen()">Anzeigen</button>'
    :'<span>Kein vorgemerkter Interessent passt zu diesem Objekt.'+(KD_CACHE.some(k=>k.suchprofil&&k.suchprofil.aktiv)?'':' Suchprofile legst du in der Kundenakte an.')+'</span>';
}
function kkTrefferZeigen(){
  if(!kdVerfuegbar()) return;
  let o=kkAktuellesObjekt(), tr=kkTreffer(o);
  $('kd_overlay').classList.add('on'); document.body.style.overflow='hidden'; KD_AKTIV=null; KD_WAHL=null;
  kdInhalt('<div class="gr-kopf"><h2 id="kd_titel">Passende Interessenten</h2><button class="gr-x" onclick="kdSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<p class="hint" style="margin-top:0">Für '+sEsc(o.titel)+' — '+sEsc([pqKatName(o.kat),o.wf?Math.round(o.wf)+' m²':'',o.preis?eur(o.preis):''].filter(Boolean).join(' · '))+'</p>'
    +(tr.length?'<div class="kd-karten">'+tr.map(x=>'<div class="kd-karte"><div><b>'+sEsc(kdName(x.k))+' <span class="kk-stufe '+x.t.stufe+'">'+(x.t.stufe==='passt'?'passt':'passt fast')+'</span></b>'
      +'<span>'+sEsc([kkFinanzText(x.k.suchprofil),x.k.telefon,x.k.email].filter(Boolean).join(' · ')+(x.t.ab.length?' — '+x.t.ab.join(', '):''))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kkAngebotVermerken(\''+x.k.id+'\')">Angebot vermerken</button><button class="secondary" onclick="kdAkte(\''+x.k.id+'\')">Akte</button></div></div>').join('')+'</div>'
      :'<div class="kd-leer">Kein Suchprofil passt.</div>')
    +'<div class="gr-zeile"><button class="primary" onclick="kdSchliessen();exposeAnzeigen();pdfTeilen()" data-ic="upload">Exposé teilen</button></div>');
}
async function kkAngebotVermerken(id){
  let k=KD_CACHE.find(x=>x.id===id); if(!k) return; let o=kkAktuellesObjekt();
  k.kontakte=(k.kontakte||[]).concat([{id:'c'+Date.now().toString(36),ts:Date.now(),datum:aufHeute(),art:'Angebot',text:'Objekt angeboten: '+o.titel+(o.preis?' ('+eur(o.preis)+')':'')}]);
  if(await kdSpeichern(k)){ iaHinweis('Bei '+kdName(k)+' vermerkt'); setTimeout(()=>iaHinweis(''),2200); kkTrefferZeigen(); }
}

