/* ---------- Kachel „Bericht für den Eigentümer“ (D48) ----------
   Vermarktungsbericht je Objekt aus allen Quellen: Protokoll der Bewertung, Anfragen in „Interessenten“ (Herkunft, Exposé,
   Absagegrund), Besichtigungen im Kalender und Gebote im Bieterverfahren (wzdVermarktung in src/wz-daten.js). Der Bericht der
   Bewertung (Abschnitt „Vermarktung“) bleibt unverändert; dieser hier führt alles zusammen, damit der Eigentümer nicht „0 Anfragen“
   liest, wenn die Anfragen in der Kachel gepflegt werden. Ohne Namen der Interessenten. Gespeichert werden nur Zeitraum,
   Einschätzung und das Datum des letzten Berichts je Objekt (localStorage „ia_wz“). */
function ebStart(){ return {objekt:'',ab:'',gebote:true,einschaetzung:{},letzter:{}}; }
function ebS(){ let S=wzZustand('eigentuemerbericht'); ['einschaetzung','letzter'].forEach(k=>{ if(!S[k]||typeof S[k]!=='object'||Array.isArray(S[k])) S[k]={}; }); return S; }
function ebObjekt(id){ let S=ebS(); if(id&&wzdObjekt(id)){ S.objekt=id; wzSpeichern(); } if(WZ.aktiv==='eigentuemerbericht') wzZeichnen(); }
function ebAb(art){
  let S=ebS(), o=wzdObjekt(S.objekt);
  S.ab=art==='14'?ImmoBeratung.tagePlus(aufHeute(),-14):art==='letzter'?(S.letzter[S.objekt]||(o&&o.f.vm_letzter)||''):'';
  wzSpeichern(); wzZeichnen();
}
/* Vorschlag für die Einschätzung — sachlich aus den Zahlen, frei änderbar */
function ebVorschlag(x){
  let g=x.gesamt, preis=(x.rueck['Preis']||0)+(x.rueck['Preis zu hoch']||0);
  if(g.angebote) return 'Es liegen '+g.angebote+' Kaufangebot'+(g.angebote===1?'':'e')+' vor. Gern besprechen wir mit Ihnen die nächsten Schritte.';
  if(preis>=2) return preis+' Interessenten nennen den Preis als Grund für ihre Absage. Wir sollten gemeinsam über den Angebotspreis sprechen.';
  if(x.tage>=60&&g.besicht<3) return 'Das Objekt ist seit '+x.tage+' Tagen am Markt, mit bisher wenigen Besichtigungen. Wir schlagen vor, Präsentation und Preis gemeinsam zu prüfen.';
  if(g.anfragen) return 'Die Nachfrage ist da: '+g.anfragen+' Anfrage'+(g.anfragen===1?'':'n')+(g.besicht?' und '+g.besicht+' Besichtigung'+(g.besicht===1?'':'en'):'')+'. Wir bleiben dran und melden uns mit dem nächsten Stand.';
  return 'Wir haben die Vermarktung begonnen und melden uns mit dem nächsten Stand.';
}
function ebDatum(d){ return wzdDatum(d)?wzDatum(d):'–'; }
function ebArtText(e){ return e.art+(e.preis&&e.gruppe==='Angebot'?' über '+wzEur(e.preis):''); }
function ebZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='eigentuemerbericht') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  let S=ebS(), l=wzdObjekte(false);
  if(!l.length) return wzBox('Bericht für den Eigentümer',wzHinweis('Hier erscheinen gesicherte Bewertungen mit Vermarktungsstand (Bewertung → Vermarktung).'));
  if(!wzdObjekt(S.objekt)) S.objekt=l[0].id;
  let o=wzdObjekt(S.objekt), x=wzdVermarktung(o,wzdDatum(S.ab)), g=x.gesamt, letzter=S.letzter[o.id]||o.f.vm_letzter||'';
  let tab=x.im.slice().reverse().map(e=>'<tr><td>'+ebDatum(e.d)+'</td><td>'+sEsc(ebArtText(e))+'</td><td>'+(e.interessent?'Interessent '+e.interessent:'–')+'</td><td>'+sEsc(e.rueck||'–')+'</td><td><small>'+sEsc(e.quelle)+'</small></td></tr>').join('');
  return '<div class="grid"><div class="field"><label for="eb_objekt">Objekt</label><select id="eb_objekt" onchange="ebObjekt(this.value)">'
      +l.map(y=>'<option value="'+sEsc(y.id)+'"'+(y.id===o.id?' selected':'')+'>'+sEsc(y.name)+'</option>').join('')+'</select></div>'
      +wzFeld('ab','Zeitraum ab',{typ:'datum',zeichnen:true,hinweis:'leer = seit Beginn der Vermarktung'})+'</div>'
    +'<div class="ka-schalter" role="group" aria-label="Zeitraum"><button type="button" class="secondary" onclick="ebAb(\'14\')">Letzte 14 Tage</button>'
      +'<button type="button" class="secondary" onclick="ebAb(\'letzter\')">Seit dem letzten Bericht</button><button type="button" class="secondary" onclick="ebAb(\'\')">Alles</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Am Markt',x.tage?x.tage+' Tage':'–',wzdDatum(o.f.vm_start)?'seit '+wzDatum(o.f.vm_start):'Start in der Bewertung eintragen')
      +wzdKpi('Anfragen',String(x.anfragen),S.ab?'gesamt '+g.anfragen:'')+wzdKpi('Besichtigungen',String(x.besicht),x.geplant.length?x.geplant.length+' geplant':(S.ab?'gesamt '+g.besicht:''))
      +wzdKpi('Angebote und Gebote',String(x.angebote),x.hoechstes?'höchstes '+wzEur(x.hoechstes):'')+'</div>'
    +(letzter?wzHinweis('Letzter Bericht an den Eigentümer: '+wzDatum(letzter)+'.'):wzAmpel('gelb','Der Eigentümer hat noch keinen Bericht bekommen.'))
    +'<div class="wz-grid grid">'
    +wzBox('Herkunft der Anfragen',Object.keys(x.herkunft).length?wzDokTabelle(Object.entries(x.herkunft).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[sEsc(k),String(n)]),['Quelle','Anfragen']):wzHinweis('Keine Angabe.'))
    +wzBox('Rückmeldungen',Object.keys(x.rueck).length?wzDokTabelle(Object.entries(x.rueck).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[sEsc(k),n+'×']),['Rückmeldung','Anzahl']):wzHinweis('Noch keine Rückmeldungen.'))
    +'</div>'
    +wzBox('Aktivitäten'+(S.ab?' ab '+wzDatum(S.ab):''),tab?'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Datum</th><th>Art</th><th>Interessent</th><th>Rückmeldung</th><th>Quelle</th></tr></thead><tbody>'+tab+'</tbody></table></div>':wzHinweis('Im Zeitraum keine Aktivitäten.'))
    +wzBox('Unsere Einschätzung','<textarea id="eb_text" rows="4" aria-label="Unsere Einschätzung" oninput="ebTextSetzen(this.value)">'+sEsc(S.einschaetzung[o.id]||o.f.vm_empfehlung||ebVorschlag(x))+'</textarea>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="ebTextNeu()" data-ic="file">Vorschlag aus den Zahlen</button>'
      +'<button type="button" class="secondary" onclick="ebWiedervorlage()" data-ic="clock">Nächster Bericht in 14 Tagen</button></div>')
    +wzBox('',wzFeld('gebote','Gebote mit Betrag im Bericht zeigen',{typ:'check',voll:true})
      +wzHinweis('Quellen: Protokoll der Bewertung, Interessenten, Kalender und Bieterverfahren. Wer eine Anfrage im Protokoll der Bewertung und in „Interessenten“ erfasst, wählt im Protokoll den Kunden aus der Kundenakte — dann zählt sie einmal.'));
}
function ebTextSetzen(v){ let S=ebS(); S.einschaetzung[S.objekt]=String(v||'').slice(0,3000); wzSpeichern(); }
function ebTextNeu(){ let S=ebS(), o=wzdObjekt(S.objekt); if(!o) return; delete S.einschaetzung[o.id]; let t=$('eb_text'); if(t) t.value=ebVorschlag(wzdVermarktung(o)); S.einschaetzung[o.id]=t?t.value:''; wzSpeichern(); }
function ebWiedervorlage(){
  let o=wzdObjekt(ebS().objekt); if(!o) return;
  if(wzdWiedervorlage('Bericht für den Eigentümer: '+o.name,ImmoBeratung.tagePlus(aufHeute(),14),o.name,o.kundeId)) alert('Wiedervorlage in 14 Tagen angelegt.');
}
function ebDokument(){
  let S=ebS(), o=wzdObjekt(S.objekt); if(!o){ alert('Bitte ein Objekt wählen.'); return null; }
  let x=wzdVermarktung(o,wzdDatum(S.ab)), g=x.gesamt, K=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():{}, ab=wzdDatum(S.ab);
  let preis=zahlLesen(o.f.vm_preis,true)||zahlLesen(o.f.ex_preis,true);
  let text=($('eb_text')&&$('eb_text').value)||S.einschaetzung[o.id]||o.f.vm_empfehlung||ebVorschlag(x);
  S.letzter[o.id]=aufHeute(); wzSpeichern();
  const zeile=e=>[ebDatum(e.d),sEsc(e.gruppe==='Angebot'&&!S.gebote?e.art:ebArtText(e)),e.interessent?'Interessent '+e.interessent:'–',sEsc(e.rueck||'–')];
  return {titel:'Vermarktungsbericht '+(o.anschrift||o.name),
    html:(K.firma?'<p class="wzd-unter">'+sEsc(K.firma)+'</p>':'')+'<h1>Vermarktungsbericht</h1><p class="wzd-unter">'+sEsc(o.anschrift||o.name)+' · Stand '+new Date().toLocaleDateString('de-DE')+(ab?' · Zeitraum ab '+wzDatum(ab):'')+'</p>'
      +wzDokTabelle([['Stand der Vermarktung',sEsc(o.status||'–')],['Angebotspreis',preis>0?wzEur(preis):'–'],['Am Markt seit',wzdDatum(o.f.vm_start)?wzDatum(o.f.vm_start)+' ('+x.tage+' Tage)':'–'],
        ['Anfragen'+(ab?' im Zeitraum':''),x.anfragen+(ab?' (gesamt '+g.anfragen+')':'')],['Exposés versendet',String(ab?x.exposes:g.exposes)],
        ['Besichtigungen'+(ab?' im Zeitraum':''),x.besicht+(ab?' (gesamt '+g.besicht+')':'')+(x.geplant.length?', '+x.geplant.length+' geplant':'')],
        ['Kaufangebote und Gebote',String(g.angebote)+(S.gebote&&x.hoechstes?', höchstes '+wzEur(x.hoechstes):'')]])
      +(Object.keys(x.herkunft).length?'<h2>Woher die Anfragen kamen</h2>'+wzDokTabelle(Object.entries(x.herkunft).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[sEsc(k),String(n)]),['Quelle','Anfragen']):'')
      +(Object.keys(x.rueck).length?'<h2>Rückmeldungen der Interessenten</h2>'+wzDokTabelle(Object.entries(x.rueck).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[sEsc(k),n+'×']),['Rückmeldung','Anzahl']):'')
      +'<h2>Aktivitäten'+(ab?' im Zeitraum':'')+'</h2>'+(x.im.length?wzDokTabelle(x.im.map(zeile),['Datum','Art','Interessent','Rückmeldung']):'<p>Im Zeitraum keine Aktivitäten.</p>')
      +'<h2>Unsere Einschätzung</h2>'+String(text).split(/\n{2,}/).map(p=>'<p>'+sEsc(p).replace(/\n/g,'<br>')+'</p>').join('')
      +((K.name||K.tel||K.mail)?'<h2>Ihr Ansprechpartner</h2><p>'+sEsc(K.name||'')+(K.funktion?'<br>'+sEsc(K.funktion):'')+(K.tel?'<br>Telefon '+sEsc(K.tel):'')+(K.mail?'<br>'+sEsc(K.mail):'')+'</p>':'')
      +'<p class="wzd-klein">Interessenten sind aus Datenschutzgründen nicht namentlich genannt.</p>',
    ohneFuss:true,pflicht:true};
}
function ebKundeText(){
  let S=ebS(), o=wzdObjekt(S.objekt); if(!o) return '';
  let x=wzdVermarktung(o), g=x.gesamt;
  return 'Vermarktungsbericht '+o.name+': '+g.anfragen+' Anfragen, '+g.besicht+' Besichtigungen, '+g.angebote+' Angebote'+(x.tage?', '+x.tage+' Tage am Markt':'')+'.';
}
wzRegistrieren({id:'eigentuemerbericht',titel:'Eigentümerbericht',sub:'Vermarktungsbericht aus allen Kacheln — Anfragen, Besichtigungen, Gebote, ohne Namen',icon:'file-text',start:ebStart,ohneNeu:true,
  zeichnen:ebZeichnen,rechnen:()=>iconify($('wz_body')),dokument:ebDokument,kundeText:ebKundeText});
