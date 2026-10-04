/* ---------- Kachel „Weitergaben“ (D57) ----------
   Kunden auf ihren Wunsch und mit Einwilligung an Kollegen der Bank übergeben: Interessenten mit Finanzierungsbedarf an die
   Baufinanzierung, nach dem Kauf Gebäudeversicherung, Modernisierungskredit, Bausparen und die Geldanlage des Verkäufers — und
   verfolgen, was daraus wird (übergeben, Termin vereinbart, Finanzierung zugesagt, abgeschlossen, nicht zustande gekommen).
   - Einwilligung oder Wunsch des Kunden mit Datum und Form ist Pflicht vor dem Speichern (Nachweis, Art. 7 Abs. 1 DSGVO); den
     Text liefert der Vordruck der Bank. Ein Widerruf wird mit Datum festgehalten.
   - Übergabeblatt (mit Pflichtangaben der Genossenschaft) nur mit dem, was der Kunde freigegeben hat: Telefon, E-Mail und Anschrift
     aus der Kundenakte, Ort, Objektart, Wohnfläche, Baujahr und Kaufpreis aus der gesicherten Bewertung (nur gelesen).
   - Wiedervorlage „Rücklauf prüfen“; Auswertung je Anlass und Stand ohne Rangliste je Kollege; Vorschläge nach dem Kauf aus
     beurkundeten Notaraufträgen, Anfragen „Gekauft“ und verkauften Objekten. Keine Aussagen zu Fristen der Versicherungen.
   - Speicher „akten“ (art 'weitergabe'), Personen nur als Kunden-Id; Löschen und Auskunft über die Kundenakte. Ansprechpartner
     (Name, Bereich, Filiale, Telefon, E-Mail) in den Eingaben der Werkzeuge (localStorage „ia_wz“). Regeln: js/weitergabe-regeln.js. */
var WG={aktiv:null,neu:null,fest:'',stand:'',ungespeichert:false,notar:null,notarLaedt:false,kollegenOffen:false,vorschlaege:[]};
const WGR=window.ImmoWeitergabeRegeln;
function wgStart(){ return {kollegen:[],filter:'offen',jahr:'',tage:'14',ausgeblendet:{}}; }
function wgS(){
  let a=wzAlle(); if(!a.weitergabe||typeof a.weitergabe!=='object'||Array.isArray(a.weitergabe)) a.weitergabe=wgStart();
  let S=a.weitergabe; if(!Array.isArray(S.kollegen)) S.kollegen=[];
  if(!S.ausgeblendet||typeof S.ausgeblendet!=='object'||Array.isArray(S.ausgeblendet)) S.ausgeblendet={};
  return S;
}
function wgTage(){ let t=Math.round(wzN(wgS().tage)); return t>0&&t<=90?t:WGR.RUECKLAUF_TAGE; }
function wgListe(){ return wzdAkten('weitergabe'); }
function wgKollege(id){ return id?wgS().kollegen.find(k=>k.id===id)||null:null; }
function wgKollegeDaten(w){ return wgKollege(w.kollegeId)||w.kollege||{}; }
function wgKollegeText(w){ let k=wgKollegeDaten(w); return (k.name||'').trim()?k.name.trim()+(k.bereich||k.filiale?' ('+[WGR.bereichName(k.bereich),k.filiale?'Filiale '+k.filiale:''].filter(Boolean).join(', ')+')':''):''; }
function wgKollegeSync(w){ let k=wgKollege(w.kollegeId); if(k) w.kollege={name:k.name||'',bereich:k.bereich||'',filiale:k.filiale||''}; else if(!w.kollegeId) w.kollege=null; }
function wgKundeAnzeige(w){ return w.kundeGeloescht?'(Kunde gelöscht)':(wzdKundeName(w.kundeId)||'(ohne Kunde)'); }
function wgWiderrufen(w){ return !!WGR.einwilligungPruefen(w.einwilligung,w.datum,aufHeute()).widerrufen; }
function wgFest(w){ return JSON.stringify({kundeId:w.kundeId,datum:w.datum,einwilligung:w.einwilligung}); }
function wgGleich(a,b){ let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); return !!n(a)&&n(a)===n(b); }
function wgLeer(v){
  return Object.assign(wzdAkteNeu('weitergabe',{kundeId:'',projektId:'',anlass:'baufinanzierung',datum:aufHeute(),kollegeId:'',kollege:null,anliegen:'',
    einwilligung:{ja:false,datum:aufHeute(),form:'',rueckmeldung:false,widerrufen:''},
    freigabe:{kontakt:false,anschrift:false,ort:false,objektart:false,wohnflaeche:false,baujahr:false,kaufpreis:false},
    kaufpreis:'',stand:'uebergeben',rueckmeldungAm:'',volumen:'',notiz:'',wvId:'',verlauf:[],wvAnlegen:true}),v||{});
}
/* Werte für Freigabe und Übergabeblatt: Kontakt aus der Kundenakte, Objekt aus der gesicherten Bewertung (nur lesen) */
function wgDaten(w){
  let k=wzdKunde(w.kundeId)||{}, o=wzdObjekt(w.projektId), f=o?o.f:{}, kp=wzN(w.kaufpreis,true);
  let wf=zahlLesen(f.ek_wohnflaeche,true), bj=zahlLesen(f.ek_baujahr,false), adr=o&&window.ImmoPortal?ImmoPortal.anschrift(o.anschrift):{};
  return {telefon:k.telefon||'',email:k.email||'',anschrift:[k.strasse,k.plzort].filter(Boolean).join(', '),
    ort:o?[adr.plz,adr.ort].filter(Boolean).join(' '):'',objektart:o?WGR.objektartText(f.ek_modus,f.ek_typ,f.ek_wtyp):'',
    wohnflaeche:wf>0?wf.toLocaleString('de-DE')+' m²':'',baujahr:bj>0?String(Math.round(bj)):'',
    kaufpreis:kp>0?wzEur(kp):o&&o.preis>0?wzEur(o.preis):'',kaufpreisLabel:kp>0?'Kaufpreis':'Angebotspreis'};
}
function wgWertText(k,d){ return k==='kontakt'?[d.telefon,d.email].filter(Boolean).join(' · '):k==='kaufpreis'?(d.kaufpreis?d.kaufpreisLabel+' '+d.kaufpreis:''):d[k]||''; }

/* ---------- Anlegen (Entwurf bis zum Speichern), öffnen, verlassen ---------- */
async function wgNeu(v){
  await wzdLaden(); WG.aktiv=null; WG.ungespeichert=false; WG.neu=wgLeer(v);
  let o=wzdObjekt(WG.neu.projektId); if(!o) WG.neu.projektId='';
  if(WZ.aktiv==='weitergabe') wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function wgNeuAbbrechen(){ WG.neu=null; wzZeichnen(); }
function wgKundeWaehlen(){ wzdKundeWaehlen(id=>{ if(!WG.neu) return; WG.neu.kundeId=id; wzZeichnen(); }); }
function wgAusAnfrage(id){
  let n=WG.neu, v=wzdListe('vorgaenge').find(x=>x.id===id); if(!n||!v) return;
  n.kundeId=v.kundeId||''; n.projektId=v.projektId||''; wzZeichnen();
}
function wgAnfragen(){ return wzdListe('vorgaenge').filter(v=>v.typ==='anfrage'&&v.kundeId&&!v.abgesagt&&wzdKunde(v.kundeId)).sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')); }
async function wgNeuSpeichern(){
  let n=WG.neu; if(!n) return; await wzdLaden(); wgKollegeSync(n);
  let p=WGR.speichernPruefen(n,aufHeute());
  if(!p.ok){ alert('Noch nicht gespeichert. Es fehlt:\n– '+p.fehlt.concat(p.fehler).join('\n– ')
    +(p.fehlt.some(x=>/Einwilligung/.test(x))?'\n\nOhne Einwilligung oder Wunsch des Kunden mit Datum und Form speichert die App keine Weitergabe (Nachweis, Art. 7 Abs. 1 DSGVO).':'')); return; }
  let w=JSON.parse(JSON.stringify(n)), wv=w.wvAnlegen!==false; delete w.wvAnlegen;
  w.verlauf=[{id:wzdId('h'),datum:w.datum,text:'Übergeben'+(wgKollegeDaten(w).name?' an '+wgKollegeDaten(w).name:'')}];
  if(!(await wzdSpeichern('akten',w))) return;
  if(wv){ let a=wgWiedervorlageNeu(w); if(a){ w.wvId=a.id; await wzdSpeichern('akten',w); } }
  WG.neu=null; wgOeffnenObjekt(w);
}
function wgOeffnenObjekt(w){ WG.neu=null; WG.aktiv=w; WG.fest=wgFest(w); WG.stand=w.stand; WG.ungespeichert=false; if(WZ.aktiv==='weitergabe') wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function wgOeffnen(id){ await wzdLaden(); let w=wgListe().find(x=>x.id===id); if(w) wgOeffnenObjekt(w); }
/* Speichern nur mit vollständigen Pflichtangaben; sonst bleibt der letzte gespeicherte Stand in der Datenbank */
function wgSichern(sofort){
  let w=WG.aktiv; if(!w) return Promise.resolve(false);
  wgKollegeSync(w);
  if(!w.kundeGeloescht){
    let p=WGR.speichernPruefen(w,aufHeute());
    if(!p.ok){ WG.ungespeichert=p.fehlt.concat(p.fehler).join(', ')||'Angaben unvollständig'; clearTimeout(WZD_TIMER[w.id]); delete WZD_TIMER[w.id]; return Promise.resolve(false); }
    WG.ungespeichert=false; WG.fest=wgFest(w);
  }
  if(w.stand!==WG.stand){ wgStandFolge(w); WG.stand=w.stand; }
  if(wgWiderrufen(w)) wgWvErledigen(w);   // nach dem Widerruf nichts mehr nachfassen
  else if(WGR.offen(w.stand)) wgWvNachziehen(w);
  if(sofort) return wzdSpeichernSofort('akten',w);
  wzdSpeichernBald('akten',w); return Promise.resolve(true);
}
function wgSpeichern(){ if(WG.neu){ wgKollegeSync(WG.neu); return; } if(WG.aktiv) wgSichern(false); else wzSpeichern(); }
function wgVerlassen(){
  let w=WG.aktiv; if(!w) return;
  if(WG.ungespeichert&&!w.kundeGeloescht){
    let alt=null; try{ alt=JSON.parse(WG.fest||'null'); }catch(e){}
    if(alt) Object.assign(w,alt);
    WG.ungespeichert=false;
    alert('Kunde, Tag der Weitergabe oder Einwilligung waren unvollständig — es gilt wieder der zuletzt gespeicherte Stand dieser Angaben.');
  }
  wgSichern(true);
}
function wgZurueck(){ wgVerlassen(); WG.aktiv=null; wzZeichnen(); }
/* Stand geändert: Verlauf, Tag der Rückmeldung, Wiedervorlage nachziehen oder erledigen */
function wgStandFolge(w){
  (w.verlauf=w.verlauf||[]).push({id:wzdId('h'),datum:aufHeute(),text:'Stand: '+WGR.standName(w.stand,w.anlass)});
  if(w.stand!=='uebergeben') w.rueckmeldungAm=aufHeute();
  if(WGR.offen(w.stand)) wgWvNachziehen(w); else wgWvErledigen(w);
}
function wgObjektWahl(id){ let w=WG.neu||WG.aktiv; if(!w) return; w.projektId=id||''; if(WG.aktiv) wgSichern(true); wzZeichnen(); }
async function wgLoeschen(){
  let w=WG.aktiv; if(!w||!confirm('Diese Weitergabe löschen? Sie fehlt danach auch in der Auswertung. Die Person bleibt in der Kundenakte.')) return;
  clearTimeout(WZD_TIMER[w.id]); delete WZD_TIMER[w.id];
  let a=wgWv(w); if(a&&!a.erledigt){ aufStore(aufLoad().filter(x=>x.id!==a.id)); try{ aufBadge(); aufStartRender(); }catch(e){} }
  if(await wzdLoeschen('akten',w.id)){ WG.aktiv=null; WG.ungespeichert=false; wzZeichnen(); }
}
async function wgNotiz(){
  let w=WG.aktiv; if(!w||!w.kundeId) return;
  let e=w.einwilligung||{}, A=WGR.anlass(w.anlass);
  let t='Weitergabe '+A.lang+(wgKollegeText(w)?' an '+wgKollegeText(w):'')+' am '+wzDatum(w.datum)+'. Einwilligung vom '+wzDatum(e.datum)+' ('+WGR.formName(e.form)+')'
    +(e.rueckmeldung?', mit Rückmeldung zum Stand':'')+(wgWiderrufen(w)?', widerrufen am '+wzDatum(e.widerrufen):'')+'.';
  if(await wzdNotiz(w.kundeId,'Weitergabe',t)) alert('In der Kundenakte vermerkt.');
}

/* ---------- Wiedervorlage „Rücklauf prüfen“ (Liste „Wiedervorlagen“) ---------- */
function wgWvText(w){ return 'Rücklauf prüfen: '+WGR.anlass(w.anlass).name+(wgKollegeDaten(w).name?' bei '+wgKollegeDaten(w).name:''); }
/* neue Wiedervorlage: am Tag des Rücklaufs, ist er schon vorbei, heute */
function wgWvFrist(w){ let t=WGR.ruecklaufTag(w,wgTage()), h=aufHeute(); return t&&t>h?t:h; }
function wgWiedervorlageNeu(w){ return wzdWiedervorlage(wgWvText(w),wgWvFrist(w),wzdObjektName(w.projektId,''),w.kundeId); }
function wgWv(w){ return w&&w.wvId?aufLoad().find(a=>a.id===w.wvId)||null:null; }
async function wgWiedervorlage(){
  let w=WG.aktiv; if(!w) return; let alt=wgWv(w);
  if(alt&&!alt.erledigt){ alert('Es gibt schon eine offene Wiedervorlage am '+wzDatum(alt.frist)+'.'); return; }
  let a=wgWiedervorlageNeu(w); if(!a) return; w.wvId=a.id; await wgSichern(true); wzZeichnen();
}
function wgWvNachziehen(w){
  let l=aufLoad(), a=w&&w.wvId&&l.find(x=>x.id===w.wvId); if(!a||a.erledigt) return;
  let t=WGR.ruecklaufTag(w,wgTage()), an=a.angelegt?new Date(a.angelegt).toISOString().slice(0,10):'', frist=t&&an>t?an:t, text=wgWvText(w);   // nie vor dem Tag der Anlage
  if(frist&&(a.frist!==frist||a.text!==text)){ a.frist=frist; a.text=text; if(aufStore(l)){ try{ aufBadge(); aufStartRender(); }catch(e){} } }
}
function wgWvErledigen(w){
  let l=aufLoad(), a=w&&w.wvId&&l.find(x=>x.id===w.wvId); if(!a||a.erledigt) return;
  a.erledigt=true; a.erledigtAm=Date.now(); if(aufStore(l)){ try{ aufBadge(); aufStartRender(); }catch(e){} }
}
function wgWvHtml(w){
  if(!WGR.offen(w.stand)||w.kundeGeloescht||wgWiderrufen(w)) return '';
  let a=wgWv(w);
  return a&&!a.erledigt?'<p class="hint">Wiedervorlage „Rücklauf prüfen“ am '+wzDatum(a.frist)+'.</p>'
    :'<div class="gr-zeile"><button type="button" class="secondary" onclick="wgWiedervorlage()" data-ic="clock">Wiedervorlage „Rücklauf prüfen“ am '+wzDatum(wgWvFrist(w))+'</button></div>';
}

/* ---------- Ansprechpartner (Eingaben der Werkzeuge) ---------- */
function wgKollegeId(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function wgKollegeNeu(){
  let S=wgS(); S.kollegen.push({id:wgKollegeId(),name:'',bereich:'baufinanzierung',filiale:'',tel:'',mail:''}); WG.kollegenOffen=true; wzSpeichern(); wzZeichnen();
  let e=$(wzId('kollegen.'+(S.kollegen.length-1)+'.name')); if(e) e.focus();
}
function wgKollegeWeg(i){
  let S=wgS(), k=S.kollegen[i]; if(!k) return;
  if(!confirm('„'+((k.name||'').trim()||'Ohne Namen')+'“ aus der Liste entfernen? Bestehende Weitergaben behalten den Namen.')) return;
  S.kollegen.splice(i,1); WG.kollegenOffen=true; wzSpeichern(); wzZeichnen();
}
/* im Entwurf oder Editor: Ansprechpartner schnell anlegen und gleich wählen */
function wgKollegeSchnell(){
  let w=WG.neu||WG.aktiv, n=$('wg_schnell_name'), f=$('wg_schnell_filiale'); if(!w||!n) return;
  let name=(n.value||'').trim(); if(!name){ n.focus(); return; }
  let k={id:wgKollegeId(),name,bereich:WGR.anlass(w.anlass).bereich||'sonstiges',filiale:((f&&f.value)||'').trim(),tel:'',mail:''};
  wgS().kollegen.push(k); wzSpeichern(); w.kollegeId=k.id; wgSpeichern(); wzZeichnen();
}
function wgKollegenOptionen(w){
  let A=WGR.anlass(w.anlass), l=wgS().kollegen.filter(k=>(k.name||'').trim()).slice()
    .sort((a,b)=>((b.bereich===A.bereich)-(a.bereich===A.bereich))||String(a.name).localeCompare(String(b.name),'de'));
  let o=[['','– noch offen –']].concat(l.map(k=>[k.id,k.name.trim()+' — '+[WGR.bereichName(k.bereich),k.filiale?'Filiale '+k.filiale:''].filter(Boolean).join(', ')]));
  if(w.kollegeId&&!l.some(k=>k.id===w.kollegeId)) o.push([w.kollegeId,((w.kollege&&w.kollege.name)||'Kollege')+' (nicht mehr in der Liste)']);
  return o;
}
function wgKollegenHtml(){
  let S=wgS(), l=S.kollegen;
  return '<details class="wg-kollegen"'+(WG.kollegenOffen||!l.length?' open':'')+' ontoggle="WG.kollegenOffen=this.open"><summary>Ansprechpartner in der Bank ('+l.length+')</summary>'
    +l.map((k,i)=>'<div class="wg-kollege grid">'+wzFeld('kollegen.'+i+'.name','Name',{typ:'text',ph:'Vorname Nachname'})
      +wzFeld('kollegen.'+i+'.bereich','Bereich',{typ:'wahl',optionen:WGR.BEREICHE})+wzFeld('kollegen.'+i+'.filiale','Filiale',{typ:'text'})
      +wzFeld('kollegen.'+i+'.tel','Telefon',{typ:'text'})+wzFeld('kollegen.'+i+'.mail','E-Mail',{typ:'text'})
      +'<div class="field"><button type="button" class="secondary" onclick="wgKollegeWeg('+i+')" data-ic="trash">Entfernen</button></div></div>').join('')
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wgKollegeNeu()" data-ic="plus">Ansprechpartner hinzufügen</button></div>'
    +'<div class="grid">'+wzFeld('tage','Rücklauf prüfen nach',{typ:'wahl',optionen:[['7','7 Tagen'],['10','10 Tagen'],['14','14 Tagen'],['21','21 Tagen'],['30','30 Tagen']],zeichnen:true,
      hinweis:'Fällt der Tag auf ein Wochenende oder einen Feiertag in Baden-Württemberg, gilt der nächste Werktag.'})+'</div>'
    +wzHinweis('Die Liste bleibt auf diesem Gerät. Dienstliche Kontaktdaten genügen.')+'</details>';
}

/* ---------- Anlässe nach dem Kauf: Vorschläge ---------- */
function wgNotarLaden(){
  if(WG.notar!==null||WG.notarLaedt) return;
  WG.notarLaedt=true;
  (async()=>{ try{ await IA_BEREIT_P; WG.notar=IA_DB_BEREIT?await iaAlle('notar'):[]; }catch(e){ WG.notar=[]; }
    WG.notarLaedt=false; if(WZ.aktiv==='weitergabe'&&!WG.aktiv&&!WG.neu) wzZeichnen(); })();
}
function wgVerkaeufe(){
  let l=[], objekte=wzdObjekte(true);
  (WG.notar||[]).filter(n=>['Beurkundet','Erledigt'].includes(n.stand)).forEach(n=>{
    let o=objekte.find(x=>(n.anschrift&&wgGleich(x.anschrift,n.anschrift))||(n.projekt&&wgGleich(x.name,n.projekt))), datum=wzdDatum(n.termin);
    let basis={projektId:o?o.id:'',datum,objekt:o?o.name:((n.projekt||n.anschrift||'').trim())};
    (n.kaeufer||[]).forEach(p=>{ if(p&&p.kundeId) l.push(Object.assign({kundeId:p.kundeId,rolle:'kaeufer'},basis)); });
    (n.verkaeufer||[]).forEach(p=>{ if(p&&p.kundeId) l.push(Object.assign({kundeId:p.kundeId,rolle:'verkaeufer'},basis)); });
    if(n.kundeId) l.push(Object.assign({kundeId:n.kundeId,rolle:'verkaeufer'},basis));
  });
  wzdListe('vorgaenge').filter(v=>v.typ==='anfrage'&&v.status==='Gekauft'&&v.kundeId).forEach(v=>{
    let h=(v.verlauf||[]).filter(x=>x&&x.text==='Status: Gekauft').pop();
    l.push({kundeId:v.kundeId,rolle:'kaeufer',projektId:v.projektId||'',datum:wzdDatum(h&&h.datum)||wzdDatum(v.datum),objekt:wzdObjektName(v.projektId,'')}); });
  objekte.filter(o=>o.status==='Verkauft'&&o.kundeId).forEach(o=>{ let p=pjLoad().find(x=>x.id===o.id);
    l.push({kundeId:o.kundeId,rolle:'verkaeufer',projektId:o.id,datum:p&&p.geaendert?new Date(p.geaendert).toISOString().slice(0,10):'',objekt:o.name}); });
  return l.filter(x=>wzdKunde(x.kundeId));
}
function wgAusVorschlag(i){ let v=WG.vorschlaege[i]; if(v) wgNeu({kundeId:v.kundeId,projektId:v.projektId,anlass:v.anlass}); }
function wgVorschlagAus(i){ let v=WG.vorschlaege[i]; if(!v) return; wgS().ausgeblendet[v.schluessel]=aufHeute(); wzSpeichern(); wzZeichnen(); }
function wgVorschlaegeHtml(){
  if(WG.notar===null) return wzHinweis('Wird geladen …');
  WG.vorschlaege=WGR.vorschlaege(wgVerkaeufe(),wgListe(),aufHeute(),{ausgeblendet:wgS().ausgeblendet});
  let l=WG.vorschlaege.slice(0,8);
  return (l.length?l.map((v,i)=>'<div class="wg-vorschlag"><span><b>'+sEsc(wzdKundeName(v.kundeId))+'</b> · '+sEsc(WGR.anlass(v.anlass).lang)
      +sEsc((v.objekt?' · '+v.objekt:'')+(v.datum?' · '+(v.rolle==='kaeufer'?'gekauft ':'verkauft ')+wzDatum(v.datum):''))+'</span>'
      +'<button type="button" class="secondary" onclick="wgAusVorschlag('+i+')" data-ic="arrow-right">Weitergeben</button>'
      +'<button type="button" class="secondary" onclick="wgVorschlagAus('+i+')">Ausblenden</button></div>').join('')
      +(WG.vorschlaege.length>l.length?wzHinweis('… und '+(WG.vorschlaege.length-l.length)+' weitere.'):'')
    :wzHinweis('Keine offenen Anlässe.'))
    +wzHinweis('Aus beurkundeten Notaraufträgen, Anfragen mit Stand „Gekauft“ und verkauften Objekten der letzten zwölf Monate. Weitergeben nur, wenn der Kunde es wünscht.');
}

/* ---------- Ansicht: Übersicht ---------- */
function wgFuerAuswertung(l){ return l.map(w=>({anlass:w.anlass,stand:w.stand,datum:w.datum,volumen:wzN(w.volumen,true)})); }
function wgAuswertungZeilen(aw){
  let kurz={uebergeben:'übergeben',termin:'Termin',zugesagt:'zugesagt',abgeschlossen:'abgeschlossen',nicht:'nicht zustande'};
  let kopf=['Anlass'].concat(WGR.STAENDE.map(([k])=>kurz[k]),['Summe','Erfolgsquote','Volumen']);
  const quote=q=>q==null?'–':Math.round(q*100)+' %';
  let zeilen=aw.zeilen.map(z=>[sEsc(z.name)].concat(WGR.STAENDE.map(([k])=>String(z.staende[k])),[String(z.summe),quote(z.quote),z.volumen>0?wzEur(z.volumen):'–']));
  let erf=aw.summe.zugesagt+aw.summe.abgeschlossen, ent=erf+aw.summe.nicht;
  zeilen.push(['Summe'].concat(WGR.STAENDE.map(([k])=>String(aw.summe[k])),[String(aw.gesamt),quote(ent?erf/ent:null),'']));
  return {kopf,zeilen};
}
function wgListeHtml(){
  let S=wgS(), heute=aufHeute(), tage=wgTage(), jahr=heute.slice(0,4);
  let alle=wgListe().slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')||(b.ts||0)-(a.ts||0));
  let imJahr=WGR.auswertung(wgFuerAuswertung(alle),{jahr});
  let faellig=alle.filter(w=>{ let r=WGR.ruecklauf(w,heute,tage); return r&&r.ueberfaellig&&!wgWiderrufen(w); });
  let f=S.filter||'offen', l=alle.filter(w=>f==='alle'||(f==='erledigt'?!WGR.offen(w.stand):WGR.offen(w.stand)));
  let jahre=Array.from(new Set(alle.map(w=>String(w.datum||'').slice(0,4)).filter(j=>/^\d{4}$/.test(j)).concat([jahr]))).sort().reverse();
  let aw=WGR.auswertung(wgFuerAuswertung(alle),{jahr:S.jahr||''}), t=wgAuswertungZeilen(aw), alt=WGR.alteErledigte(alle,heute);
  return '<div class="ka-leiste"><button type="button" class="primary" onclick="wgNeu()" data-ic="plus">Neue Weitergabe</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Offen',String(alle.filter(w=>WGR.offen(w.stand)&&!w.kundeGeloescht).length),'beim Kollegen in Arbeit')
      +wzdKpi('Rücklauf fällig',String(faellig.length),faellig.length?'nachfragen':'nichts fällig')
      +wzdKpi('Erfolgreich '+jahr,String(imJahr.erfolg),'zugesagt oder abgeschlossen')+wzdKpi('Finanziert '+jahr,wzEur(imJahr.finanziert),'Volumen der Finanzierungen')+'</div>'
    +'<div class="ka-schalter" role="group" aria-label="Filter">'+[['offen','Offen'],['erledigt','Erledigt'],['alle','Alle']]
      .map(([k,tx])=>'<button type="button" class="'+(f===k?'primary':'secondary')+'" aria-pressed="'+(f===k)+'" onclick="wgS().filter=\''+k+'\';wzSpeichern();wzZeichnen()">'+tx+'</button>').join('')+'</div>'
    +(l.length?'<div class="kd-karten">'+l.map(w=>{ let A=WGR.anlass(w.anlass), r=WGR.ruecklauf(w,heute,tage), wr=wgWiderrufen(w);
        return '<div class="kd-karte wg-karte"><div><b>'+sEsc(wgKundeAnzeige(w))+'</b><span>'+sEsc([A.name,wgKollegeText(w),'übergeben am '+wzDatum(w.datum),wzdObjektName(w.projektId,'')].filter(Boolean).join(' · '))+'</span>'
          +'<div class="pa-chips"><span class="pa-chip'+(WGR.erfolg(w.stand)?' pa-bezahlt':'')+'">'+sEsc(WGR.standName(w.stand,w.anlass))+'</span>'
          +(r&&r.ueberfaellig&&!wr?'<span class="pa-chip pa-offen">Rücklauf seit '+wzDatum(r.tag)+'</span>':'')
          +(wr?'<span class="pa-chip pa-ueberfaellig">Einwilligung widerrufen</span>':'')+'</div></div>'
          +'<div class="kd-k"><button class="secondary" onclick="wgOeffnen(\''+idSicher(w.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>'
      :wzHinweis(alle.length?'Keine Weitergabe in dieser Auswahl.':'Noch keine Weitergabe. Aus der Kundenakte („An Kollegen weitergeben“), aus einer Anfrage oder hier mit „Neue Weitergabe“.'))
    +(alt.length?wzAmpel('gelb',alt.length+' erledigte Weitergabe'+(alt.length===1?' ist':'n sind')+' älter als zwölf Monate. Wird der Personenbezug noch gebraucht?')
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wgAlteAnonymisieren()" data-ic="shield">Personenbezug entfernen</button></div>':'')
    +wzBox('Auswertung je Anlass und Stand','<div class="grid">'+wzFeld('jahr','Jahr',{typ:'wahl',optionen:[['','alle Jahre']].concat(jahre.map(j=>[j,j])),zeichnen:true})+'</div>'
      +(aw.zeilen.length?'<div class="wz-tabwrap"><table class="nhk wz-tab wg-auswertung"><thead><tr>'+t.kopf.map(k=>'<th>'+k+'</th>').join('')+'</tr></thead><tbody>'
        +t.zeilen.map((z,i)=>'<tr'+(i===t.zeilen.length-1?' class="wg-summe"':'')+'>'+z.map((c,j)=>'<td'+(j?' class="r"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'
        :wzHinweis('Im gewählten Jahr keine Weitergaben.'))
      +wzHinweis('Gezählt je Anlass und Stand — bewusst nicht je Kollege. Erfolgsquote: zugesagt oder abgeschlossen im Verhältnis zu allen entschiedenen Weitergaben. Volumen: zugesagt oder abgeschlossen.'))
    +wzBox('Nach dem Kauf: Anlässe',wgVorschlaegeHtml())
    +wzBox('',wgKollegenHtml());
}
/* Wiedervorlagen „Rücklauf prüfen“ dieser Weitergaben löschen: die verknüpfte (wvId) und ältere erledigte desselben Kunden und
   Anlasses, auf die keine Weitergabe mehr verweist — sonst führten Kunden-Id und Text in der Liste zurück zum Kunden */
function wgWvWeg(l){
  let alle=wgListe(), ids=new Set(l.map(w=>w.wvId).filter(Boolean)), auf=aufLoad();
  let frei=a=>a.erledigt&&!alle.some(w=>w.wvId===a.id)&&l.some(w=>w.kundeId&&a.kundeId===w.kundeId&&String(a.text||'').startsWith('Rücklauf prüfen: '+WGR.anlass(w.anlass).name));
  let rest=auf.filter(a=>!ids.has(a.id)&&!frei(a));
  if(rest.length<auf.length&&aufStore(rest)){ try{ aufBadge(); aufStartRender(); }catch(e){} }
}
async function wgAlteAnonymisieren(){
  let l=WGR.alteErledigte(wgListe(),aufHeute()); if(!l.length) return;
  if(!confirm(l.length+' erledigte Weitergabe'+(l.length===1?'':'n')+' ohne Personenbezug behalten? Kunde, Objekt, Kaufpreis, Kollege, Freigaben, Anliegen, Notiz, Einwilligungsdaten und die Wiedervorlage „Rücklauf prüfen“ werden entfernt. Für die Auswertung bleiben Anlass, Stand, Datum und Volumen.')) return;
  wgWvWeg(l);
  for(const w of l){ clearTimeout(WZD_TIMER[w.id]); delete WZD_TIMER[w.id]; let a=WGR.anonymisieren(w); Object.keys(w).forEach(k=>delete w[k]); Object.assign(w,a); await wzdSpeichern('akten',w); }
  wzZeichnen();
}

/* ---------- Ansicht: Entwurf und Editor ---------- */
function wgKundeBox(w,neu){
  let k=wzdKunde(w.kundeId);
  return wzBox('Kunde',(w.kundeId?'<div class="kd-karte"><div><b>'+sEsc(k?kdName(k):'(nicht mehr in der Kundenakte)')+'</b><span>'+sEsc(wzdKundeKontakt(w.kundeId)||'keine Kontaktdaten in der Akte')+'</span></div>'
      +(neu?'<div class="kd-k"><button class="secondary" onclick="wgKundeWaehlen()">Ändern</button></div>':'')+'</div>'
    :'<button type="button" class="secondary" onclick="wgKundeWaehlen()" data-ic="users">Aus der Kundenakte wählen</button>')
    +(neu&&!w.kundeId&&wgAnfragen().length?'<div class="field" style="max-width:520px;margin-top:10px"><label for="wg_anfrage">Oder aus einer Anfrage übernehmen</label><select id="wg_anfrage" onchange="if(this.value)wgAusAnfrage(this.value)"><option value="">– Anfrage wählen –</option>'
      +wgAnfragen().map(v=>'<option value="'+sEsc(v.id)+'">'+sEsc([wzdKundeName(v.kundeId),wzdObjektName(v.projektId,'ohne Objekt'),v.status,wzDatum(v.datum)].filter(Boolean).join(' · '))+'</option>').join('')+'</select></div>':'')
    +wzHinweis(neu?'Die Person steht nur in der Kundenakte; die Weitergabe merkt sich den Verweis.':'Die Einwilligung gehört zu dieser Person — für jemand anderen eine neue Weitergabe anlegen.'));
}
function wgWeitergabeBox(w){
  let k=wgKollege(w.kollegeId), keine=!wgS().kollegen.some(x=>(x.name||'').trim());
  return wzBox('Weitergabe','<div class="grid">'+wzFeld('anlass','Anlass',{typ:'wahl',optionen:WGR.ANLAESSE.map(a=>[a.k,a.lang]),zeichnen:true})
      +wzFeld('datum','Weitergegeben am',{typ:'datum',zeichnen:true})
      +'<div class="field"><label for="wg_objekt">Objekt <span class="u">optional</span></label><select id="wg_objekt" onchange="wgObjektWahl(this.value)">'+wzdObjektOptionen(w.projektId,'– kein Objekt –')+'</select></div>'
      +wzFeld('kollegeId','Kollege',{typ:'wahl',optionen:wgKollegenOptionen(w),zeichnen:true})
      +wzFeld('anliegen','Anliegen des Kunden',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Finanzierung für das Objekt, Rückruf abends erwünscht',
        hinweis:'Steht auf dem Übergabeblatt. Nur, was der Kunde mitteilen möchte — keine Angaben zu Einkommen, Vermögen oder Gesundheit.'})+'</div>'
    +(k&&(k.tel||k.mail)?'<p class="hint">'+sEsc(k.name)+': '+[k.tel?'<a href="tel:'+sEsc(String(k.tel).replace(/[^\d+]/g,''))+'">'+sEsc(k.tel)+'</a>':'',k.mail?'<a href="mailto:'+sEsc(k.mail)+'">'+sEsc(k.mail)+'</a>':''].filter(Boolean).join(' · ')+'</p>':'')
    +'<details class="wg-schnell"'+(keine?' open':'')+'><summary>Neuer Ansprechpartner</summary><div class="kd-neu"><input id="wg_schnell_name" placeholder="Vorname Nachname" aria-label="Name des Ansprechpartners">'
      +'<input id="wg_schnell_filiale" placeholder="Filiale" aria-label="Filiale"><button type="button" class="secondary" onclick="wgKollegeSchnell()" data-ic="plus">Anlegen und wählen</button></div></details>');
}
function wgEinwilligungBox(w,neu){
  return wzBox('Einwilligung des Kunden',wzFeld('einwilligung.ja','Der Kunde wünscht die Weitergabe und willigt ein',{typ:'check',voll:true,zeichnen:true})
    +'<div class="grid">'+wzFeld('einwilligung.datum','Erteilt am',{typ:'datum',zeichnen:true})
      +wzFeld('einwilligung.form','Form',{typ:'wahl',optionen:[['','– wählen –']].concat(WGR.FORMEN),zeichnen:true})
      +wzFeld('einwilligung.rueckmeldung','Umfasst die Rückmeldung des Kollegen zum Stand an mich',{typ:'check',voll:true,zeichnen:true})
      +(neu?'':wzFeld('einwilligung.widerrufen','Widerrufen am',{typ:'datum',zeichnen:true,hinweis:'Widerruf jederzeit möglich (Art. 7 Abs. 3 DSGVO).'}))+'</div>'
    +wzHinweis('Text und Umfang der Einwilligung kommen aus dem Vordruck der Bank. Ohne Einwilligung mit Datum und Form speichert die App keine Weitergabe (Nachweis, Art. 7 Abs. 1 DSGVO). Im Zweifel mit dem Datenschutzbeauftragten der Bank klären.'));
}
function wgFreigabeBox(w){
  let d=wgDaten(w);
  return wzBox('Freigegeben für das Übergabeblatt','<p class="hint" style="margin-top:0">Der Name steht immer darauf, alles andere nur mit Freigabe des Kunden.</p><div class="wz-checkliste">'
    +WGR.FREIGABEN.map(([k,t])=>{ let v=wgWertText(k,d); return wzFeld('freigabe.'+k,sEsc(t)+' <span class="u">'+(v?sEsc(v):'– fehlt –')+'</span>',{typ:'check',zeichnen:true}); }).join('')+'</div>'
    +'<div class="grid">'+wzFeld('kaufpreis','Kaufpreis',{typ:'betrag',einheit:'€',zeichnen:true,hinweis:'leer = Angebotspreis aus der Bewertung'})+'</div>');
}
function wgStandBox(w){
  let A=WGR.anlass(w.anlass), verlauf=(w.verlauf||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
  return wzBox('Stand und Rücklauf','<div class="grid">'+wzFeld('stand','Stand',{typ:'wahl',optionen:WGR.STAENDE.map(([k])=>[k,WGR.standName(k,w.anlass)]),zeichnen:true})
      +wzFeld('rueckmeldungAm','Rückmeldung am',{typ:'datum',zeichnen:true})
      +(A.volumen?wzFeld('volumen',A.volumen,{typ:'betrag',einheit:'€',hinweis:'optional'}):'')
      +(w.kundeGeloescht?'':wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'nur zum Stand — keine Angaben zu Einkommen, Vermögen oder Gesundheit'}))+'</div>'
    +wgWvHtml(w)
    +(verlauf.length?'<ul class="vg-verlauf">'+verlauf.map(h=>'<li><span>'+wzDatum(h.datum)+'</span><span>'+sEsc(h.text)+'</span></li>').join('')+'</ul>':''));
}
function wgNeuHtml(n){
  let rl=wgWvFrist(n);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="wgNeuAbbrechen()" data-ic="arrow-left">Abbrechen</button>'
      +'<span class="ub-status">Neue Weitergabe</span><button type="button" class="primary" onclick="wgNeuSpeichern()" data-ic="check">Speichern</button></div>'
    +'<div id="wg_pruefung" class="wg-pruefung"></div>'
    +wgKundeBox(n,true)+wgWeitergabeBox(n)+wgEinwilligungBox(n,true)+wgFreigabeBox(n)
    +wzBox('',wzFeld('wvAnlegen','Wiedervorlage „Rücklauf prüfen“ am '+(rl?wzDatum(rl):'–')+' anlegen',{typ:'check',voll:true}));
}
function wgEditor(w){
  let A=WGR.anlass(w.anlass);
  let kopf='<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="wgZurueck()" data-ic="arrow-left">Alle Weitergaben</button>'
    +'<span class="ub-status">'+sEsc(wgKundeAnzeige(w))+' · '+sEsc(A.name)+'</span>'
    +(w.kundeGeloescht?'':'<button type="button" class="secondary" onclick="wzDokument()" data-ic="file-text">Übergabeblatt</button>'
      +'<button type="button" class="secondary" onclick="wgNotiz()" data-ic="users">In der Kundenakte vermerken</button>')
    +'<button type="button" class="secondary" onclick="wgLoeschen()" data-ic="trash">Löschen</button></div>';
  if(w.kundeGeloescht) return kopf+'<div id="wg_pruefung" class="wg-pruefung"></div>'
    +wzBox('Weitergabe',wzDokTabelle([['Anlass',sEsc(A.lang)],['Weitergegeben am',wzDatum(w.datum)]])+wzHinweis('Ohne Personenbezug: Kunde, Objekt, Kollege und Freitexte sind entfernt.'))+wgStandBox(w);
  return kopf+'<div id="wg_pruefung" class="wg-pruefung"></div>'
    +wgKundeBox(w,false)+wgWeitergabeBox(w)+wgStandBox(w)+wgEinwilligungBox(w,false)+wgFreigabeBox(w);
}
function wgZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='weitergabe') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(WG.neu) return wgNeuHtml(WG.neu);
  if(WG.aktiv){ if(wgListe().some(x=>x===WG.aktiv)) return wgEditor(WG.aktiv); WG.aktiv=null; }
  wgNotarLaden();
  return wgListeHtml();
}
function wgAmpelnHtml(w){
  let k=w.kundeId?wzdKunde(w.kundeId):null;
  let l=WGR.pruefen(w,{heute:aufHeute(),tage:wgTage(),fmt:wzDatum,kunde:w.kundeId?(k?{telefon:k.telefon||'',email:k.email||''}:null):undefined,kollege:w.kollegeId?!!wgKollege(w.kollegeId):undefined});
  return (WG.aktiv===w&&WG.ungespeichert?wzAmpel('rot','Nicht gespeichert — es fehlt: '+sEsc(String(WG.ungespeichert))+'. Beim Verlassen gilt der zuletzt gespeicherte Stand.'):'')
    +l.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join('');
}
function wgRechnen(){ iconify($('wz_body')); let w=WG.neu||WG.aktiv; if(w) wzH('wg_pruefung',wgAmpelnHtml(w)); }

/* ---------- Dokumente: Übergabeblatt (Schreiben an den Kollegen) und Auswertung ohne Namen ---------- */
function wgUebergabeblatt(w){
  let A=WGR.anlass(w.anlass), k=wzdKunde(w.kundeId), abs=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():{}, kol=wgKollegeDaten(w);
  let z=WGR.uebergabeZeilen(w.freigabe,wgDaten(w)), e=w.einwilligung||{}, rl=WGR.ruecklaufTag(w,wgTage());
  const tab=l=>wzDokTabelle(l.map(([a,b])=>[sEsc(a),sEsc(b)]));
  return {titel:'Übergabe '+A.name+' '+(k?kdName(k):''),ohneFuss:true,pflicht:true,
    html:'<div class="pa-briefkopf"><div class="pa-absender">'+sEsc([abs.name,abs.funktion,abs.firma].filter(Boolean).join(' · ')||'[Absender]')+'</div>'
      +'<div class="pa-empfaenger">'+sEsc(kol.name||'[Kollege]')+(kol.bereich?'<br>'+sEsc(WGR.bereichName(kol.bereich)):'')+(kol.filiale?'<br>Filiale '+sEsc(kol.filiale):'')+'</div>'
      +'<div class="pa-daten">'+wzDokTabelle([['Datum',new Date().toLocaleDateString('de-DE')]].concat(abs.tel?[['Telefon',sEsc(abs.tel)]]:[]).concat(abs.mail?[['E-Mail',sEsc(abs.mail)]]:[]))+'</div></div>'
      +'<h1>Übergabe: '+sEsc(A.lang)+'</h1><p class="wzd-unter">weitergegeben am '+wzDatum(w.datum)+' auf Wunsch des Kunden</p>'
      +'<h2>Kunde</h2>'+tab([['Name',k?kdName(k):'–']].concat(z.kunde))
      +((w.anliegen||'').trim()?'<h2>Anliegen</h2><p>'+sEsc(w.anliegen.trim()).replace(/\n/g,'<br>')+'</p>':'')
      +(z.objekt.length?'<h2>Objekt</h2>'+tab(z.objekt):'')
      +'<h2>Einwilligung</h2>'+tab([['Weitergabe gewünscht und eingewilligt','am '+wzDatum(e.datum)+', '+WGR.formName(e.form)],
        ['Rückmeldung zum Stand',e.rueckmeldung?'an '+(abs.name||'den Berater')+(rl?', bitte bis '+wzDatum(rl):''):'nicht vereinbart']])
      +'<p class="wzd-klein">Auf diesem Blatt stehen nur die Angaben, die der Kunde für die Weitergabe freigegeben hat. Text und Umfang der Einwilligung ergeben sich aus dem Vordruck der Bank.</p>'};
}
function wgDokument(){
  if(WG.neu){ alert('Bitte die Weitergabe zuerst speichern.'); return null; }
  let w=WG.aktiv;
  if(!w){ let S=wgS(), aw=WGR.auswertung(wgFuerAuswertung(wgListe()),{jahr:S.jahr||''}), t=wgAuswertungZeilen(aw);
    return {titel:'Weitergaben '+(S.jahr||'alle Jahre'),
      html:'<h1>Weitergaben an Kollegen</h1><p class="wzd-unter">'+(S.jahr?'Jahr '+S.jahr:'alle Jahre')+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
        +(aw.zeilen.length?wzDokTabelle(t.zeilen,t.kopf):'<p>Noch keine Weitergaben.</p>')
        +'<p class="wzd-klein">Gezählt je Anlass und Stand, ohne Namen von Kunden und Kollegen. Volumen: zugesagt oder abgeschlossen.</p>',
      fuss:'Auswertung ohne Namen.'}; }
  if(w.kundeGeloescht){ alert('Der Kunde wurde gelöscht — es gibt kein Übergabeblatt mehr.'); return null; }
  let e=WGR.einwilligungPruefen(w.einwilligung,w.datum,aufHeute());
  if(!e.ok||WG.ungespeichert){ alert('Ohne vollständige Einwilligung (Datum und Form) gibt es kein Übergabeblatt.'); return null; }
  if(e.widerrufen){ alert('Die Einwilligung wurde am '+wzDatum(e.widerrufen)+' widerrufen — kein Übergabeblatt mehr.'); return null; }
  wgSichern(true);
  return wgUebergabeblatt(w);
}

/* ---------- Kundenakte: Anzeige, Löschen (Personenbezug entfernen), Auskunft ---------- */
async function wgAusAkte(id){ kdSchliessen(); await wzdLaden(); wzOeffnen('weitergabe'); wgNeu({kundeId:id}); }
async function wgOeffnenAusAkte(wid){ kdSchliessen(); await wzdLaden(); wzOeffnen('weitergabe'); wgOeffnen(wid); }
KD_AKTE_HOOKS.push(id=>{
  let l=wzdBereit()?wgListe().filter(w=>w.kundeId===id):[];
  return '<h3>Weitergaben an Kollegen</h3>'
    +(l.length?'<div class="kd-karten">'+l.map(w=>'<div class="kd-karte"><div><b>'+sEsc(WGR.anlass(w.anlass).lang)+'</b><span>'
      +sEsc([wzDatum(w.datum),wgKollegeText(w),WGR.standName(w.stand,w.anlass)].filter(Boolean).join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="wgOeffnenAusAkte(\''+idSicher(w.id)+'\')">Öffnen</button></div></div>').join('')+'</div>':'')
    +'<div class="gr-zeile"><button class="secondary" onclick="wgAusAkte(\''+idSicher(id)+'\')" data-ic="arrow-right">An Kollegen weitergeben</button></div>';
});
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const w of wgListe().filter(w=>w.kundeId===id)){
    clearTimeout(WZD_TIMER[w.id]); delete WZD_TIMER[w.id];
    let a=WGR.anonymisieren(w); Object.keys(w).forEach(k=>delete w[k]); Object.assign(w,a); await wzdSpeichern('akten',w);
  }
  if(WG.neu&&WG.neu.kundeId===id) WG.neu.kundeId='';
  if(WG.aktiv&&WG.aktiv.kundeGeloescht) WG.ungespeichert=false;
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=wgListe().filter(w=>w.kundeId===id).sort((a,b)=>(a.datum||'').localeCompare(b.datum||'')), d=x=>wzdDatum(x)?wzDatum(x):'–';
  return ['','WEITERGABEN AN KOLLEGEN DER BANK'].concat(l.length?l.map(w=>{ let A=WGR.anlass(w.anlass), e=w.einwilligung||{}, f=w.freigabe||{};
    let frei=WGR.FREIGABEN.filter(([k])=>f[k]).map(([,t])=>t);
    return '- '+d(w.datum)+' '+A.lang+(wgKollegeText(w)?' an '+wgKollegeText(w):'')+(w.projektId?'; Objekt: '+wzdObjektName(w.projektId,'–'):'')
      +'; Stand: '+WGR.standName(w.stand,w.anlass)+(w.rueckmeldungAm?' (Rückmeldung '+d(w.rueckmeldungAm)+')':'')
      +(wzN(w.volumen,true)>0?'; '+(A.volumen||'Volumen')+' '+eur(wzN(w.volumen,true)):'')
      +'; Einwilligung vom '+d(e.datum)+' ('+(WGR.formName(e.form)||'–')+')'+(e.rueckmeldung?', mit Rückmeldung zum Stand':'')+(wzdDatum(e.widerrufen)?', widerrufen am '+d(e.widerrufen):'')
      +'; freigegeben: '+(frei.length?frei.join(', '):'nur der Name')
      +((w.anliegen||'').trim()?'; Anliegen: '+w.anliegen.trim():'')+((w.notiz||'').trim()?'; Notiz: '+w.notiz.trim():''); }):['- keine']);
});

/* ---------- Verkaufsfahrplan: „Finanzierungsbestätigung des Käufers liegt vor“ (Schlüssel wg_finanzierung) ---------- */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>{
  let ex=(typeof FP!=='undefined'&&FP.extra)||{}, kaeufer=[];
  (ex.notar||[]).filter(n=>wgGleich(n.anschrift,o.anschrift)||wgGleich(n.projekt,o.name)).forEach(n=>(n.kaeufer||[]).forEach(p=>{ if(p&&p.kundeId) kaeufer.push(p.kundeId); }));
  return {wg_finanzierung:WGR.fahrplanFinanzierung(wgListe(),o.id,{kaeuferIds:kaeufer,reserviert:['Reserviert','Notartermin','Verkauft'].includes(o.status)})};
});

wzRegistrieren({id:'weitergabe',titel:'Weitergaben',sub:'Kunden mit Einwilligung an Kollegen der Bank übergeben und den Rücklauf verfolgen',icon:'arrow-right',ohneNeu:true,
  zustand:()=>WG.neu||WG.aktiv||wgS(),speichern:wgSpeichern,zeichnen:wgZeichnen,rechnen:wgRechnen,dokument:wgDokument,
  schliessen:()=>{ wgVerlassen(); WG.aktiv=null; WG.neu=null; WG.notar=null; WG.ungespeichert=false; }});
