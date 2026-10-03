/* ---------- Kachel „Aushang“ (D40) ----------
   Eine Seite für Schaufenster und Filiale: großes Titelbild, Titel, Ort, Eckdaten, Preis, Käuferprovision, Pflichtangaben zum
   Energieausweis (§ 87 GModG gilt für Immobilienanzeigen in kommerziellen Medien — der Aushang ist eine solche) und der
   Ansprechpartner. Wahlweise ein Objekt groß oder bis zu vier Objekte als Übersicht. Quelle sind gesicherte Bewertungen in
   Vermarktung mit Texten und Fotoauswahl des Exposés (js/portal.js liest die Felder wie der Portal-Export). Ausgabe wie das
   Exposé im Bericht (#report, Klasse „aushang“): Drucken, PDF, Teilen. Die Bewertungen werden nur gelesen. */
function ahStart(){ return {layout:'einzeln',objekt:'',auswahl:[],strasse:false,zusatz:''}; }
function ahS(){ let S=wzZustand('aushang'); if(!Array.isArray(S.auswahl)) S.auswahl=[]; return S; }
function ahKontakt(f){ let S=(wzAlle().portal||{}); return typeof ptKontakt==='function'?ptKontakt(Object.assign({anbieter:{},kontakt:{}},S,{anbieter:S.anbieter||{},kontakt:S.kontakt||{}}),f||{}):{}; }
function ahNr(id){ let e=(((wzAlle().portal||{}).objekte||{})[id])||{}; return String(e.nr||'').trim()||ImmoPortal.objektnrVorschlag(id); }
function ahIds(S){ return S.layout==='uebersicht'?S.auswahl.filter(id=>wzdObjekt(id)).slice(0,4):(S.objekt&&wzdObjekt(S.objekt)?[S.objekt]:[]); }
function ahPruefen(id){ let E=wzdEnergie(id); return E?ImmoPortal.energiePflicht(E,aufHeute()):[]; }
/* abgelaufener Ausweis, fehlendes Ausstellungsdatum ab 2027, Baudenkmal ab 2027 (D50) */
function ahRot(id){ let E=wzdEnergie(id); return E?ImmoPortal.energieHinweise(E,aufHeute(),{denkmal:/ja|Ensemble/.test(String((wzdObjekt(id).f||{}).od_denkmal||''))}).filter(h=>h.stufe==='rot').map(h=>h.text):[]; }
function ahWahl(id,an){ let S=ahS(); S.auswahl=S.auswahl.filter(x=>x!==id); if(an&&S.auswahl.length<4) S.auswahl.push(id); wzSpeichern(); wzZeichnen(); }
function ahZeichnen(){
  let S=ahS(), l=wzdObjekte(false);
  if(!l.length) return wzBox('Aushang',wzHinweis('Hier erscheinen gesicherte Bewertungen mit Vermarktungsstand (Bewertung → ⑬ Vermarktung). Texte, Preis und Titelbild kommen aus dem Exposé.'));
  if(S.layout==='einzeln'&&!wzdObjekt(S.objekt)) S.objekt=l[0].id;
  let wahl=S.layout==='uebersicht'
    ?'<div class="ah-wahl">'+l.map(o=>'<label class="wz-check"><input type="checkbox"'+(S.auswahl.includes(o.id)?' checked':'')+((!S.auswahl.includes(o.id)&&S.auswahl.length>=4)?' disabled':'')
      +' onchange="ahWahl(\''+idSicher(o.id)+'\',this.checked)"><span>'+sEsc(o.name)+(o.preis>0?' · '+wzEur(o.preis):'')+'</span></label>').join('')+'</div>'+wzHinweis('Bis zu vier Objekte.')
    :'<div class="grid"><div class="field"><label for="ah_objekt">Objekt</label><select id="ah_objekt" onchange="ahS().objekt=this.value;wzSpeichern();wzZeichnen()">'
      +l.map(o=>'<option value="'+sEsc(o.id)+'"'+(o.id===S.objekt?' selected':'')+'>'+sEsc(o.name)+'</option>').join('')+'</select></div></div>';
  let pr=ahIds(S).map(id=>({id,f:ahPruefen(id),h:ahRot(id)})).filter(x=>x.f.length||x.h.length);
  return wzBox('Aushang','<div class="ka-schalter" role="group" aria-label="Aufbau">'+[['einzeln','Ein Objekt'],['uebersicht','Übersicht']].map(([k,t])=>'<button type="button" class="'+(S.layout===k?'primary':'secondary')+'" aria-pressed="'+(S.layout===k)+'" onclick="ahS().layout=\''+k+'\';wzSpeichern();wzZeichnen()">'+t+'</button>').join('')+'</div>'
      +'<div style="margin-top:10px">'+wahl+'</div>'
      +'<div class="grid" style="margin-top:6px">'+wzFeld('strasse','Straße zeigen (sonst nur der Ort)',{typ:'check'})+wzFeld('zusatz','Zusatzzeile (optional)',{typ:'text',ph:'z. B. Besichtigung nach Vereinbarung'})+'</div>'
      +(pr.length?pr.map(x=>(x.f.length?wzAmpel('rot',sEsc(wzdObjektName(x.id,''))+': Es fehlt '+sEsc(x.f.join(', '))+' (Pflichtangabe nach § 87 GModG) — im Exposé der Bewertung ergänzen, Ausstellungsdatum und Primärenergie im Portal-Export.'):'')
          +x.h.map(t=>wzAmpel('rot',sEsc(wzdObjektName(x.id,''))+': '+sEsc(t))).join('')).join('')
        :ahIds(S).length?wzAmpel('gruen','Pflichtangaben zum Energieausweis vollständig.'):'')
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="ahAnzeigen()" data-ic="printer">Aushang anzeigen</button></div>')
    +wzHinweis('Fotos vorher ansehen: keine Personen, Kennzeichen oder Namen (Fotostudio). Die Anschrift nur mit Einverständnis des Eigentümers zeigen.');
}
async function ahDaten(id){
  let p=pjLoad().find(x=>x.id===id); if(!p) return null; let r=p;
  if(IA_DB_BEREIT){ try{ r=await iaGet('projekte',id)||p; }catch(e){} }
  let f=(r.data&&r.data.fields)||{}, fotos=(r.data&&Array.isArray(r.data.photos))?r.data.photos:[];
  let S=ahS(), o=ImmoPortal.objekt(f,{projektId:id,kontakt:ahKontakt(f),fotos,einstellung:Object.assign(wzdEaEinst(id),{adresse:!!S.strasse}),heute:aufHeute()});
  let titelbild=o.bilder[0]&&fotos.find(x=>x.id===o.bilder[0].id);
  return {o,f,bild:titelbild&&bildUrl(titelbild.data)?titelbild.data:'',nr:ahNr(id)};
}
function ahEnergie(E){ return ImmoPortal.energieZeile(E); }   // D50: Zeile nach altem oder neuem Recht (js/portal.js)
function ahFakten(o){
  let F=o.flaechen, z=v=>(+v).toLocaleString('de-DE',{maximumFractionDigits:1});
  return [F.wohn>0?['Wohnfläche','ca. '+z(F.wohn)+' m²']:F.nutz>0?['Nutzfläche','ca. '+z(F.nutz)+' m²']:null,F.zimmer>0?['Zimmer',z(F.zimmer)]:null,
    F.grund>0?['Grundstück','ca. '+z(F.grund)+' m²']:null,o.baujahr?['Baujahr',o.baujahr]:null].filter(Boolean);
}
async function ahAnzeigen(){
  let S=ahS(), ids=ahIds(S); if(!ids.length){ alert('Bitte ein Objekt wählen.'); return; }
  let daten=(await Promise.all(ids.map(ahDaten))).filter(Boolean); if(!daten.length) return;
  let K=daten[0].o.kontakt, firma=K.firma||exV('cfg_kopf'), ort=o=>[o.geo.strasse&&o.geo.frei?o.geo.strasse+' '+o.geo.hausnummer:'',[o.geo.plz,o.geo.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const preis=o=>'<div class="ah-preis"><span>Kaufpreis</span><b>'+(o.preis>0?wzEur(o.preis):'auf Anfrage')+'</b>'+(o.provision.text?'<small>Käuferprovision: '+sEsc(o.provision.text)+'</small>':'')+'</div>';
  const kontakt='<div class="ah-kontakt"><b>Ihr Ansprechpartner'+(K.name?': '+sEsc(K.name):'')+'</b><span>'+sEsc([K.funktion,firma].filter(Boolean).join(' · '))+'</span>'
    +'<span>'+sEsc([K.tel?'Telefon '+K.tel:'',K.mail].filter(Boolean).join(' · '))+'</span></div>';
  let html;
  if(S.layout==='uebersicht'){
    html='<div class="ah-blatt ah-uebersicht">'+(firma?'<div class="ah-kopf">'+sEsc(firma)+'</div>':'')+'<h1>Unsere Angebote</h1><div class="ah-raster">'
      +daten.map(d=>'<div class="ah-karte">'+(d.bild?'<img src="'+bildUrl(d.bild)+'" alt="">':'<div class="ah-ohnebild"></div>')+'<h2>'+sEsc(d.o.texte.titel)+'</h2><p class="ah-ort">'+sEsc(ort(d.o))+'</p>'
        +'<p class="ah-kurz">'+sEsc(ahFakten(d.o).map(x=>x[1]+(x[0]==='Zimmer'?' Zimmer':x[0]==='Baujahr'?' gebaut':'')).join(' · '))+'</p>'+preis(d.o)
        +'<p class="ah-energie">'+sEsc(ahEnergie(d.o.energie))+'</p><p class="ah-nr">Objekt-Nr. '+sEsc(d.nr)+'</p></div>').join('')+'</div>'
      +(S.zusatz?'<p class="ah-zusatz">'+sEsc(S.zusatz)+'</p>':'')+kontakt+'</div>';
  } else {
    let d=daten[0], o=d.o, text=(o.texte.dreizeiler||o.texte.objekt||'').replace(/\s+/g,' ').trim();
    if(text.length>320) text=text.slice(0,text.lastIndexOf(' ',320))+' …';
    html='<div class="ah-blatt">'+(firma?'<div class="ah-kopf">'+sEsc(firma)+'</div>':'')
      +(d.bild?'<img class="ah-bild" src="'+bildUrl(d.bild)+'" alt="'+sEsc(o.texte.titel)+'">':'')
      +'<h1>'+sEsc(o.texte.titel)+'</h1><p class="ah-ort">'+sEsc(ort(o))+'</p>'+preis(o)
      +'<div class="ah-fakten">'+ahFakten(o).map(x=>'<div><span>'+x[0]+'</span><b>'+sEsc(x[1])+'</b></div>').join('')+'</div>'
      +(text?'<p class="ah-text">'+sEsc(text)+'</p>':'')
      +'<p class="ah-energie">'+sEsc(ahEnergie(o.energie))+'</p>'
      +(S.zusatz?'<p class="ah-zusatz">'+sEsc(S.zusatz)+'</p>':'')+kontakt+'<p class="ah-nr">Objekt-Nr. '+sEsc(d.nr)+'</p></div>';
  }
  let r=$('report'); r.className='aushang'; r.dataset.pdfname=wzDateiname('Aushang '+(S.layout==='uebersicht'?'Angebote':daten[0].o.texte.titel));
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="ahZurueck()">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="pdfTeilen()">Teilen</button></div>'+html;
  WZ.dokVon='aushang'; wzSpeichernJetzt(); $('wz_overlay').classList.remove('on'); WZ.aktiv=null;
  document.body.style.overflow=''; document.body.classList.add('report-mode'); window.scrollTo(0,0);
}
function ahZurueck(){ wzDokZurueck(); }
function ahRechnen(){ iconify($('wz_body')); }
wzRegistrieren({id:'aushang',titel:'Aushang',sub:'Schaufenster und Filiale · eine Seite mit Bild, Preis und Pflichtangaben',icon:'printer',start:ahStart,ohneNeu:true,
  zeichnen:ahZeichnen,rechnen:ahRechnen});
