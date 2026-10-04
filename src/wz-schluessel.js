/* ---------- Kachel „Schlüsselbuch“ ----------
   Je Objekt in Vermarktung: welche Schlüssel der Berater vom Eigentümer übernommen hat (Art, Anzahl, Nummer der Schließanlage),
   mit Unterschrift des Eigentümers; an wen er sie ausgibt (Handwerker, Fotograf, Energieberater, Hausverwaltung, Interessent),
   mit Datum, vereinbarter Rückgabe, Quittung per Unterschrift und Rückgabe mit Datum; was zurück an den Eigentümer geht.
   Bestand je Schlüssel: beim Berater, ausgegeben, zurück an den Eigentümer (nach der Übergabe: an den Käufer). Überfällige
   Rückgaben stehen rot, mit Wiedervorlage. Die Übergabe an den Käufer läuft über das Übergabeprotokoll (nur Verweis).
   Regeln (Bestand, Status, Vorschläge, Prüfpunkte) in js/schluessel-regeln.js. Speicher „akten“ (art 'schluessel'), weil
   Unterschriften und Empfänger Personenbezug haben: Privatpersonen nur als Verweis auf die Kundenakte, Firmen auch als Freitext.
   Keine eigenen Rechtstexte — Verwahrung und Haftung regeln die Vordrucke der Bank. Die Bewertung wird nur gelesen. */
var SK={aktiv:null,offen:'',dok:''};
const SK_ARTEN=['Haustür','Wohnungstür','Briefkasten','Keller','Garage / Tiefgarage','Hoftor','Nebengebäude','Transponder / Chip','Fernbedienung Garagentor','Zentralschlüssel (Schließanlage)'];
function skR(){ return window.ImmoSchluesselRegeln; }
function skS(){ let a=wzAlle(); if(!a.schluessel||typeof a.schluessel!=='object'||Array.isArray(a.schluessel)) a.schluessel={}; return a.schluessel; }
function skSchluesselNeu(art){ return {id:wzdId('sl'),art:art||'',anzahl:'',nummer:'',zurueck:'',zurueckAm:''}; }
function skLeer(o){
  return wzdAkteNeu('schluessel',{projektId:o.id,objekt:o.name,kundeId:o.kundeId&&wzdKunde(o.kundeId)?o.kundeId:'',eigentuemerGeloescht:false,
    uebernahme:{datum:'',unterschrift:'',zeit:'',stand:'',berater:'',beraterZeit:''},schluessel:[skSchluesselNeu('Haustür')],ausgaben:[],
    rueckgabe:{unterschrift:'',zeit:'',stand:''},kaeuferAm:'',notiz:''});
}
/* fehlende Teile ergänzen (ältere oder eingespielte Einträge); Interessenten nur aus der Kundenakte */
function skNorm(r){
  if(!Array.isArray(r.schluessel)) r.schluessel=[]; if(!Array.isArray(r.ausgaben)) r.ausgaben=[];
  ['uebernahme','rueckgabe'].forEach(k=>{ if(!r[k]||typeof r[k]!=='object'||Array.isArray(r[k])) r[k]={}; });
  r.schluessel=r.schluessel.filter(k=>k&&typeof k==='object'); r.ausgaben=r.ausgaben.filter(a=>a&&typeof a==='object');
  const ok=x=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x);   // Kennungen landen in onclick und data-Attributen
  r.schluessel.forEach(k=>{ if(!ok(k.id)){ let alt=k.id; k.id=wzdId('sl'); r.ausgaben.forEach(a=>{ if(alt!=null&&a.schluesselId===alt) a.schluesselId=k.id; }); } });
  r.ausgaben.forEach(a=>{ if(!ok(a.id)) a.id=wzdId('sa'); if(skR().nurAkte(a.rolle)){ a.modus='akte'; a.firma=''; } });
  return r;
}
/* nur Unterschriften als Bild-Daten (z. B. aus einer eingespielten Sicherung) */
function skBild(b){ return typeof b==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(b)?b:''; }
function skName(r){ return (wzdObjekt(r.projektId)||{}).name||r.objekt||'Objekt'; }
function skAnschrift(r){ let o=wzdObjekt(r.projektId); return (o&&o.anschrift)||skName(r); }
function skEigentuemerName(r){ return r.kundeId?wzdKundeName(r.kundeId):r.eigentuemerGeloescht?'(Kunde gelöscht)':''; }
/* Empfänger als Text; anonym=true: Privatpersonen nur mit ihrer Rolle (Dokumente für den Eigentümer, Wiedervorlagen) */
function skEmpfaenger(a,anonym){
  if(a.modus==='firma') return (a.firma||'').trim()||'Firma fehlt';
  if(a.geloescht) return '(Kunde gelöscht)';
  let k=wzdKunde(a.kundeId); if(!k) return a.kundeId?'(Kunde gelöscht)':'Empfänger fehlt';
  return anonym?((k.firma||'').trim()||skR().rolleName(a.rolle)):kdName(k);
}
function skSchluesselText(r,a){ let k=(r.schluessel||[]).find(x=>x.id===a.schluesselId); return ((k&&(k.art||'').trim())||'Schlüssel')+' ('+skR().anzahl(a.anzahl)+')'; }
function skStatusText(st){
  return st.k==='zurueck'?'zurück am '+wzDatum(st.datum):st.k==='ueberfaellig'?'überfällig seit '+wzDatum(st.datum):st.k==='heute'?'heute zurück'
    :st.k==='offen'?'zurück bis '+wzDatum(st.datum):'keine Rückgabe vereinbart';
}
function skZeit(iso){ let d=new Date(iso); return iso&&isFinite(d)?d.toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):''; }
function skPruefOpt(r){ return {heute:aufHeute(),status:(wzdObjekt(r.projektId)||{}).status||'',datum:wzDatum,empfaenger:a=>skEmpfaenger(a,false)}; }
function skAusgabe(id){ let r=SK.aktiv; return r?r.ausgaben.find(x=>x.id===id)||null:null; }

/* ---------- Öffnen, Speichern, Löschen ---------- */
async function skOeffnen(pid){
  await wzdLaden(); let r=wzdAkten('schluessel',pid)[0];
  if(!r){ let o=wzdObjekt(pid); if(!o) return; r=skLeer(o); if(!(await wzdSpeichern('akten',r))) return; }
  SK.aktiv=skNorm(r); SK.offen=''; if(WZ.aktiv==='schluessel') wzZeichnen(); $('wz_overlay').scrollTop=0;
}
/* aus der Kundenakte oder der Liste der Rückgaben: Objekt öffnen, Ausgabe aufklappen */
async function skAusAkte(pid,aid){ if(WZ.aktiv!=='schluessel') wzOeffnen('schluessel'); await skOeffnen(pid); SK.offen=aid||''; wzZeichnen(); }
function skZurueck(){ if(SK.aktiv) wzdSpeichernSofort('akten',SK.aktiv); SK.aktiv=null; SK.offen=''; wzZeichnen(); }
async function skLoeschen(){
  let r=SK.aktiv; if(!r||!confirm('Das Schlüsselbuch für dieses Objekt mit allen Ausgaben und Unterschriften löschen? Die Bewertung bleibt unverändert.')) return;
  let aus=skR().bestand(r).gesamt.ausgegeben;
  if(aus&&!confirm('Noch '+aus+' Schlüssel sind ausgegeben. Trotzdem löschen?')) return;
  if(await wzdLoeschen('akten',r.id)){ SK.aktiv=null; SK.offen=''; wzZeichnen(); }
}
function skSpeichern(){ let r=SK.aktiv; if(!r){ wzSpeichern(); return; } skNorm(r); wzdSpeichernBald('akten',r); }
function skSofort(neu){ let r=SK.aktiv; if(!r) return; wzdSpeichernSofort('akten',r); if(neu!==false) wzZeichnen(); }

/* ---------- Übernahme vom Eigentümer ---------- */
function skSchluesselDazu(){ let r=SK.aktiv; if(!r) return; r.schluessel.push(skSchluesselNeu('')); skSofort(); }
function skSchluesselWeg(id){
  let r=SK.aktiv; if(!r) return;
  if(r.ausgaben.some(a=>a.schluesselId===id)){ alert('Zu diesem Schlüssel gibt es Ausgaben. Bitte zuerst die Ausgaben löschen.'); return; }
  r.schluessel=r.schluessel.filter(k=>k.id!==id); skSofort();
}
function skEigentuemer(){
  wzdKundeWaehlen(id=>{ let r=SK.aktiv; if(!r||!wzdKunde(id)) return;
    if(r.kundeId!==id&&(r.uebernahme.unterschrift||r.rueckgabe.unterschrift)){
      if(!confirm('Die Unterschriften stammen vom bisherigen Eigentümer und werden entfernt. Fortfahren?')) return;
      Object.assign(r.uebernahme,{unterschrift:'',zeit:'',stand:''}); Object.assign(r.rueckgabe,{unterschrift:'',zeit:'',stand:''}); }
    r.kundeId=id; r.eigentuemerGeloescht=false; skSofort(); });
}
/* alles, was beim Berater liegt, zurück an den Eigentümer */
function skAllesZurueck(){
  let r=SK.aktiv, R=skR(); if(!r) return; let b=R.bestand(r);
  if(!b.gesamt.beimBerater){ alert('Beim Berater liegen keine Schlüssel.'); return; }
  if(!confirm((b.gesamt.ausgegeben?'Noch '+b.gesamt.ausgegeben+' Schlüssel sind ausgegeben — diese Ausgaben bleiben offen.\n':'')
    +b.gesamt.beimBerater+' Schlüssel beim Berater als heute an den Eigentümer zurückgegeben eintragen?')) return;
  b.liste.forEach(x=>{ if(x.beimBerater>0){ let k=r.schluessel.find(y=>y.id===x.id); k.zurueck=String(R.anzahl(k.zurueck)+x.beimBerater); k.zurueckAm=aufHeute(); } });
  skSofort();
}

/* ---------- Ausgaben ---------- */
function skAusgabeNeu(){
  let r=SK.aktiv, R=skR(); if(!r) return;
  let k=r.schluessel.find(x=>R.verfuegbar(r,x.id)>0);
  if(!k){ alert(r.schluessel.some(x=>R.anzahl(x.anzahl)>0)?'Es liegt kein Schlüssel mehr beim Berater.':'Bitte zuerst die übernommenen Schlüssel mit Anzahl eintragen.'); return; }
  let a={id:wzdId('sa'),schluesselId:k.id,anzahl:'1',rolle:'handwerker',modus:'firma',kundeId:'',firma:'',datum:aufHeute(),rueckgabeBis:'',zurueckAm:'',notiz:'',
    unterschrift:'',zeit:'',stand:'',wv:''};
  r.ausgaben.push(a); SK.offen=a.id; skSofort();
}
function skAusgabeAuf(id){ SK.offen=SK.offen===id?'':id; wzZeichnen(); }
function skAusgabeKunde(id){
  wzdKundeWaehlen(kid=>{ let a=skAusgabe(id); if(!a||!wzdKunde(kid)) return;
    a.kundeId=kid; a.modus='akte'; a.firma=''; a.geloescht=false; skSofort(); });
}
function skAusgabeZurueck(id){ let a=skAusgabe(id); if(!a) return; a.zurueckAm=aufHeute(); skSofort(); }
function skAusgabeWeg(id){
  let r=SK.aktiv; if(!r||!confirm('Diese Ausgabe mit Quittung löschen?')) return;
  r.ausgaben=r.ausgaben.filter(a=>a.id!==id); if(SK.offen===id) SK.offen=''; skSofort();
}
function skRueckgabeVorschlag(id,art){ let a=skAusgabe(id); if(!a) return; a.rueckgabeBis=skR().rueckgabeVorschlag(skR().datum(a.datum)||aufHeute(),art); skSofort(); }
function skWiedervorlage(id){
  let r=SK.aktiv, a=skAusgabe(id), R=skR(); if(!a) return;
  if(!R.offen(a)){ alert('Die Schlüssel sind schon zurück.'); return; }
  let bis=R.datum(a.rueckgabeBis); if(!bis){ alert('Bitte zuerst eine Rückgabe vereinbaren.'); return; }
  if(a.wv===bis){ alert('Die Wiedervorlage zur Rückgabe am '+wzDatum(bis)+' ist schon angelegt.'); return; }
  let heute=aufHeute(), frist=bis<heute?heute:bis, name=skName(r);
  if(wzdWiedervorlage('Schlüsselbuch '+name+': '+skSchluesselText(r,a)+' zurück von '+skEmpfaenger(a,true)+' (vereinbart bis '+wzDatum(bis)+')',frist,name,a.kundeId||'')){
    a.wv=bis; a.wvFrist=frist; skSofort(); alert('Wiedervorlage zum '+wzDatum(frist)+' angelegt.'); }
}

/* ---------- Unterschriften ---------- */
function skPadBild(r,rolle){
  if(rolle==='eigentuemer') return skBild(r.uebernahme.unterschrift); if(rolle==='berater') return skBild(r.uebernahme.berater); if(rolle==='rueckgabe') return skBild(r.rueckgabe.unterschrift);
  let a=r.ausgaben.find(x=>'a:'+x.id===rolle); return a?skBild(a.unterschrift):'';
}
function skPadFertig(rolle,bild){
  let r=SK.aktiv, R=skR(); if(!r) return; let jetzt=new Date().toISOString();
  if(rolle==='eigentuemer'){ Object.assign(r.uebernahme,{unterschrift:bild,zeit:jetzt,stand:R.listenStand(r.schluessel)});
    if(!R.datum(r.uebernahme.datum)){ r.uebernahme.datum=aufHeute(); let e=$(wzId('uebernahme.datum')); if(e) e.value=r.uebernahme.datum; } }
  else if(rolle==='berater') Object.assign(r.uebernahme,{berater:bild,beraterZeit:jetzt});
  else if(rolle==='rueckgabe') Object.assign(r.rueckgabe,{unterschrift:bild,zeit:jetzt,stand:R.rueckgabeStand(r.schluessel)});
  else { let a=r.ausgaben.find(x=>'a:'+x.id===rolle); if(!a) return; Object.assign(a,{unterschrift:bild,zeit:jetzt,stand:R.ausgabeStand(a)}); }
  wzdSpeichernSofort('akten',r); wzT('sk_zeit_'+rolle.replace(/\W/g,'_'),'unterschrieben '+skZeit(jetzt)); skRechnen();
}
function skUnterschriftWeg(rolle){
  let r=SK.aktiv; if(!r) return;
  if(rolle==='eigentuemer') Object.assign(r.uebernahme,{unterschrift:'',zeit:'',stand:''});
  else if(rolle==='berater') Object.assign(r.uebernahme,{berater:'',beraterZeit:''});
  else if(rolle==='rueckgabe') Object.assign(r.rueckgabe,{unterschrift:'',zeit:'',stand:''});
  else { let a=r.ausgaben.find(x=>'a:'+x.id===rolle); if(a) Object.assign(a,{unterschrift:'',zeit:'',stand:''}); }
  skSofort();
}
function skPad(rolle,titel,bild,zeit){
  return '<div class="ub-pad"><div class="ub-pad-kopf"><b>'+sEsc(titel)+'</b><span id="sk_zeit_'+rolle.replace(/\W/g,'_')+'">'+(bild&&zeit?'unterschrieben '+skZeit(zeit):'')+'</span></div>'
    +'<canvas class="ub-canvas sk-pad" data-sk="'+sEsc(rolle)+'" aria-label="'+sEsc(titel)+'"></canvas>'
    +'<button type="button" class="secondary" onclick="skUnterschriftWeg(\''+sEsc(rolle)+'\')">Unterschrift löschen</button></div>';
}
function skPads(){
  let r=SK.aktiv; if(!r) return;
  document.querySelectorAll('#wz_body canvas.sk-pad').forEach(c=>{
    if(c.dataset.init) return; let rolle=c.dataset.sk;
    const start=()=>wzUnterschriftPad(c,skPadBild(r,rolle),bild=>skPadFertig(rolle,bild));
    if(c.getBoundingClientRect().width>0) start(); else setTimeout(start,60);
  });
}

/* ---------- Ansicht ---------- */
function skKpis(r,b){
  let f=r.ausgaben.filter(a=>skR().ausgabeStatus(a,aufHeute()).k==='ueberfaellig').length;
  return wzdKpi('Übernommen',String(b.gesamt.anzahl),b.arten+' Art'+(b.arten===1?'':'en'))+wzdKpi('Beim Berater',String(b.gesamt.beimBerater),'')
    +wzdKpi('Ausgegeben',String(b.gesamt.ausgegeben),f?f+' überfällig':'')
    +(b.gesamt.kaeufer?wzdKpi('An den Käufer',String(b.gesamt.kaeufer),'mit dem Übergabeprotokoll'):wzdKpi('Zurück an den Eigentümer',String(b.gesamt.zurueck),''));
}
function skBestandHtml(r,b){
  if(!b.liste.length) return wzHinweis('Noch keine Schlüssel eingetragen.');
  let k=b.gesamt.kaeufer>0||!!skR().datum(r.kaeuferAm);
  return '<div class="wz-tabwrap"><table class="nhk wz-tab sk-tab"><thead><tr><th>Schlüssel</th><th>Übernommen</th><th>Beim Berater</th><th>Ausgegeben</th><th>Zurück an den Eigentümer</th>'
    +(k?'<th>An den Käufer</th>':'')+'</tr></thead><tbody>'
    +b.liste.map(x=>'<tr'+(x.fehler?' class="sk-fehler"':'')+'><td>'+sEsc(x.art)+(x.nummer?'<small>Nr. '+sEsc(x.nummer)+'</small>':'')+'</td><td>'+x.anzahl+'</td><td>'+x.beimBerater+'</td><td>'
      +x.ausgegeben+'</td><td>'+x.zurueck+'</td>'+(k?'<td>'+x.kaeufer+'</td>':'')+'</tr>').join('')+'</tbody></table></div>';
}
function skListeHtml(){
  let R=skR(), heute=aufHeute(), akten=wzdAkten('schluessel'), objekte=wzdObjekte(false), alle=wzdObjekte(true), aus=0, beim=0;
  akten.forEach(r=>{ skNorm(r); let b=R.bestand(r); aus+=b.gesamt.ausgegeben; beim+=b.gesamt.beimBerater; });
  let f=R.faellige(akten,heute), ueber=f.filter(x=>x.status.k==='ueberfaellig').length;
  const karte=(pid,name,status,r)=>{
    let b=r?R.bestand(r):null, p=r?R.pruefen(r,skPruefOpt(r)):null, chips=[];
    if(b){ chips.push(b.gesamt.anzahl+' Schlüssel'); if(b.gesamt.beimBerater) chips.push(b.gesamt.beimBerater+' beim Berater'); if(b.gesamt.ausgegeben) chips.push(b.gesamt.ausgegeben+' ausgegeben'); }
    return '<div class="kd-karte sk-karte"><div><b>'+sEsc(name)+'</b><span>'+sEsc([status,r?'':'noch kein Schlüsselbuch'].filter(Boolean).join(' · '))+'</span>'
      +(b?'<div class="sk-chips">'+chips.map(c=>'<span class="sk-chip">'+sEsc(c)+'</span>').join('')
        +(p.rot?'<span class="sk-chip sk-rot">'+p.rot+' rot</span>':p.gelb?'<span class="sk-chip sk-gelb">'+p.gelb+' offen</span>':'')+'</div>':'')+'</div>'
      +'<div class="kd-k"><button class="secondary" onclick="skOeffnen(\''+idSicher(pid)+'\')">Öffnen</button></div></div>'; };
  let karten=objekte.map(o=>karte(o.id,o.name,o.status,akten.find(r=>r.projektId===o.id)));
  akten.filter(r=>!objekte.some(o=>o.id===r.projektId)).forEach(r=>{ let o=alle.find(x=>x.id===r.projektId);
    karten.push(karte(r.projektId,o?o.name:(r.objekt||'Objekt'),o?(o.status||'nicht in Vermarktung'):'Bewertung nicht mehr gespeichert',r)); });
  let weitere=alle.filter(o=>!objekte.some(a=>a.id===o.id)&&!akten.some(r=>r.projektId===o.id));
  return '<div class="wz-kpis grid">'+wzdKpi('Ausgegeben',String(aus),aus?'Schlüssel bei Dritten':'nichts ausgegeben')
      +wzdKpi('Rückgabe überfällig',String(ueber),ueber?'zurückfordern':'nichts überfällig')+wzdKpi('Beim Berater',String(beim),'Schlüssel')+'</div>'
    +(f.length?wzBox('Rückgaben',f.map(x=>wzAmpel(x.status.stufe,sEsc((x.status.k==='heute'?'Heute zurück: ':'Überfällig seit '+wzDatum(x.status.datum)+': ')
        +skSchluesselText(x.akte,x.ausgabe)+' — '+skEmpfaenger(x.ausgabe,false)+' ('+skName(x.akte)+')')
        +' <button type="button" class="secondary sk-los" onclick="skAusAkte(\''+idSicher(x.akte.projektId)+'\',\''+idSicher(x.ausgabe.id)+'\')">Öffnen</button>')).join('')):'')
    +(karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein Objekt in Vermarktung. Den Stand „Auftrag erteilt“ oder „In Vermarktung“ setzt man in der Bewertung unter „Vermarktung“.'))
    +(weitere.length?'<div class="field" style="max-width:420px;margin-top:12px"><label for="sk_weitere">Andere gesicherte Bewertung</label><select id="sk_weitere" onchange="if(this.value)skOeffnen(this.value)"><option value="">– wählen –</option>'
      +weitere.map(o=>'<option value="'+sEsc(o.id)+'">'+sEsc(o.name)+'</option>').join('')+'</select></div>':'')
    +wzHinweis('Je Objekt: welche Schlüssel du vom Eigentümer hast, an wen du sie ausgibst und wann sie zurückkommen. Privatpersonen nur aus der Kundenakte, Firmen auch als Freitext.');
}
function skAusgabeHtml(r,a){
  let R=skR(), j=r.ausgaben.indexOf(a), p='ausgaben.'+j+'.', st=R.ausgabeStatus(a,aufHeute()), auf=SK.offen===a.id, id=idSicher(a.id), nur=R.nurAkte(a.rolle);
  let kopf='<div class="sk-ausgabe-kopf"><div><b>'+sEsc(skSchluesselText(r,a))+'</b><span>'+sEsc([skEmpfaenger(a,false),R.rolleName(a.rolle),R.datum(a.datum)?'ausgegeben '+wzDatum(a.datum):''].filter(Boolean).join(' · '))+'</span></div>'
    +'<span class="sk-chip sk-'+st.stufe+'" id="sk_st_'+id+'">'+sEsc(skStatusText(st))+'</span></div>'
    +'<div class="gr-zeile sk-knoepfe"><button type="button" class="secondary" onclick="skAusgabeAuf(\''+id+'\')">'+(auf?'Schließen':'Bearbeiten')+'</button>'
    +(R.offen(a)?'<button type="button" class="secondary" onclick="skAusgabeZurueck(\''+id+'\')" data-ic="check">Heute zurück</button>':'')
    +'<button type="button" class="secondary" onclick="SK.dok=\'a:'+id+'\';wzDokument()" data-ic="file-text">Ausgabequittung</button></div>';
  if(!auf) return '<div class="sk-ausgabe sk-'+st.k+'">'+kopf+'</div>';
  let opt=r.schluessel.map(k=>'<option value="'+sEsc(k.id)+'"'+(k.id===a.schluesselId?' selected':'')+'>'+sEsc(((k.art||'').trim()||'Schlüssel')+(k.nummer?' · Nr. '+k.nummer:''))+'</option>').join('');
  let empf=a.modus==='firma'&&!nur
    ?wzFeld(p+'firma','Firma',{typ:'text',ph:'z. B. Malerbetrieb Muster GmbH',hinweis:'Nur Firmen. Privatpersonen aus der Kundenakte.'})
    :'<div class="field"><label>Empfänger aus der Kundenakte</label><div class="vl-empf"><b>'+sEsc(a.kundeId||a.geloescht?skEmpfaenger(a,false):'–')+'</b>'
      +'<button type="button" class="secondary" onclick="skAusgabeKunde(\''+id+'\')" data-ic="users">'+(a.kundeId?'Ändern':'Aus der Kundenakte')+'</button></div></div>';
  return '<div class="sk-ausgabe sk-'+st.k+' sk-auf">'+kopf
    +'<div class="grid"><div class="field"><label for="sk_schl_'+id+'">Schlüssel</label><select id="sk_schl_'+id+'" data-wz="'+p+'schluesselId" data-zeichnen="1">'+opt+'</select></div>'
    +wzFeld(p+'anzahl','Anzahl',{typ:'zahl',zeichnen:true})
    +wzFeld(p+'rolle','Empfänger ist',{typ:'wahl',optionen:R.ROLLEN,zeichnen:true})
    +(nur?'':wzFeld(p+'modus','Empfänger erfassen',{typ:'wahl',optionen:[['firma','Firma (Freitext)'],['akte','Aus der Kundenakte']],zeichnen:true}))
    +empf
    +wzFeld(p+'datum','Ausgegeben am',{typ:'datum',zeichnen:true})
    +wzFeld(p+'rueckgabeBis','Rückgabe vereinbart bis',{typ:'datum',zeichnen:true})
    +wzFeld(p+'zurueckAm','Zurück am',{typ:'datum',zeichnen:true})
    +wzFeld(p+'notiz','Notiz',{typ:'text',ph:'z. B. Zweck, Uhrzeit'})+'</div>'
    +'<div class="ka-schalter sk-vorschlag" role="group" aria-label="Rückgabe vereinbaren"><span>Rückgabe:</span>'+[['tag','am selben Tag'],['werktag','nächster Werktag'],['woche','in einer Woche']]
      .map(([k,t])=>'<button type="button" class="secondary" onclick="skRueckgabeVorschlag(\''+id+'\',\''+k+'\')">'+t+'</button>').join('')+'</div>'
    +'<div class="ub-pads">'+skPad('a:'+id,'Quittung: Unterschrift des Empfängers',a.unterschrift,a.zeit)+'</div>'
    +'<div class="gr-zeile">'+(R.offen(a)?'<button type="button" class="secondary" onclick="skWiedervorlage(\''+id+'\')" data-ic="clock">'
        +(a.wv&&a.wv===R.datum(a.rueckgabeBis)?'Wiedervorlage am '+wzDatum(a.wvFrist||a.wv)+' angelegt':'Wiedervorlage zur Rückgabe')+'</button>':'')
      +'<button type="button" class="secondary" onclick="skAusgabeWeg(\''+id+'\')" data-ic="trash">Ausgabe löschen</button></div></div>';
}
function skEditor(r){
  let R=skR(), b=R.bestand(r), o=wzdObjekt(r.projektId), ue=r.uebernahme, rg=r.rueckgabe, eig=skEigentuemerName(r);
  let reihen=r.schluessel.map((k,i)=>'<div class="wz-reihe sk-reihe">'
      +'<div class="field"><label for="'+wzId('schluessel.'+i+'.art')+'">Schlüssel</label><input id="'+wzId('schluessel.'+i+'.art')+'" data-wz="schluessel.'+i+'.art" list="sk_arten" value="'+sEsc(k.art||'')+'" placeholder="z. B. Haustür"></div>'
      +wzFeld('schluessel.'+i+'.anzahl','Anzahl',{typ:'zahl'})+wzFeld('schluessel.'+i+'.nummer','Nummer der Schließanlage',{typ:'text',ph:'z. B. von der Sicherungskarte'})
      +'<button type="button" class="weg" aria-label="Schlüssel '+(i+1)+' entfernen" onclick="skSchluesselWeg(\''+idSicher(k.id)+'\')">✕</button></div>').join('');
  let as=r.ausgaben.slice().sort((x,y)=>(R.offen(x)?0:1)-(R.offen(y)?0:1)||String(R.datum(x.rueckgabeBis)||'9').localeCompare(String(R.datum(y.rueckgabeBis)||'9'))
    ||String(y.datum||'').localeCompare(String(x.datum||'')));
  let rueck=r.schluessel.map((k,i)=>'<div class="wz-reihe sk-reihe-rueck"><div class="sk-rueck-name"><b>'+sEsc((k.art||'').trim()||'Schlüssel')+'</b><small>'+R.anzahl(k.anzahl)+' übernommen</small></div>'
    +wzFeld('schluessel.'+i+'.zurueck','Zurück (Anzahl)',{typ:'zahl',zeichnen:true})+wzFeld('schluessel.'+i+'.zurueckAm','am',{typ:'datum',zeichnen:true})+'</div>').join('');
  let mitgeben=b.liste.filter(x=>x.beimBerater>0);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="skZurueck()" data-ic="arrow-left">Alle Objekte</button>'
      +'<span class="ub-status">'+sEsc(skName(r))+'</span><button type="button" class="secondary" onclick="skLoeschen()" data-ic="trash">Löschen</button></div>'
    +(o?'':wzHinweis('Die Bewertung zu diesem Objekt ist nicht mehr gespeichert; das Schlüsselbuch bleibt, bis du es löschst.'))
    +'<div class="wz-kpis grid" id="sk_kpis">'+skKpis(r,b)+'</div>'
    +wzBox('Prüfung','<div id="sk_pruefung"></div>')
    +wzBox('Übernahme vom Eigentümer',
      '<div class="grid"><div class="field"><label>Eigentümer</label><div class="vl-empf"><b>'+sEsc(eig||'–')+'</b><button type="button" class="secondary" onclick="skEigentuemer()" data-ic="users">'
        +(r.kundeId?'Ändern':'Aus der Kundenakte')+'</button></div></div>'+wzFeld('uebernahme.datum','Übernommen am',{typ:'datum'})+'</div>'
      +'<div class="sk-schluessel">'+reihen+'</div><button type="button" class="plus" onclick="skSchluesselDazu()">＋ Schlüssel</button>'
      +'<datalist id="sk_arten">'+SK_ARTEN.map(x=>'<option value="'+sEsc(x)+'">').join('')+'</datalist>'
      +'<div class="ub-pads">'+skPad('eigentuemer','Eigentümer: übergeben',ue.unterschrift,ue.zeit)+skPad('berater','Berater: übernommen',ue.berater,ue.beraterZeit)+'</div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="SK.dok=\'uebernahme\';wzDokument()" data-ic="file-text">Übernahmequittung</button></div>'
      +wzHinweis('Wer die Liste nach der Unterschrift ändert, lässt neu unterschreiben. Verwahrung und Haftung regeln die Vordrucke der Bank — Unklares mit der Rechtsabteilung klären.'))
    +wzBox('Ausgaben','<div class="ka-leiste"><button type="button" class="primary" onclick="skAusgabeNeu()" data-ic="plus">Schlüssel ausgeben</button></div>'
      +(as.length?as.map(a=>skAusgabeHtml(r,a)).join(''):wzHinweis('Noch nichts ausgegeben. Für Handwerker, Fotograf, Energieberater, Hausverwaltung oder Interessenten — mit Quittung und vereinbarter Rückgabe.')))
    +wzBox('Bestand je Schlüssel','<div id="sk_bestand">'+skBestandHtml(r,b)+'</div>')
    +wzBox('','<details class="sk-details"'+(b.gesamt.zurueck?' open':'')+'><summary>Rückgabe an den Eigentümer</summary>'+rueck
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="skAllesZurueck()" data-ic="arrow-left">Alles beim Berater zurück an den Eigentümer</button></div>'
      +(b.gesamt.zurueck?'<div class="ub-pads">'+skPad('rueckgabe','Eigentümer: zurückerhalten',rg.unterschrift,rg.zeit)+'</div>':'')
      +wzHinweis('Wenn der Auftrag endet oder der Eigentümer Schlüssel zurückhaben möchte. Die Übernahmequittung zeigt die Rückgabe mit.')+'</details>')
    +wzBox('Übergabe an den Käufer',wzHinweis('Die Schlüssel an den Käufer gehen mit dem Übergabeprotokoll — dort mit Anzahl je Schlüssel und Unterschrift beider Seiten.')
      +(mitgeben.length?'<p class="sk-mitgeben">Beim Berater: '+sEsc(mitgeben.map(x=>x.art+' '+x.beimBerater).join(', '))+'</p>':'')
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wzOeffnen(\'uebergabe\')" data-ic="key">Übergabeprotokoll öffnen</button></div>'
      +'<div class="grid">'+wzFeld('kaeuferAm','Mit dem Übergabeprotokoll an den Käufer übergeben am',{typ:'datum',zeichnen:true})+'</div>')
    +wzBox('Notiz',wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Schlüssel liegen im Tresor der Filiale'}));
}
function skZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='schluessel') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(!skR()) return wzHinweis('Die Regeln des Schlüsselbuchs (js/schluessel-regeln.js) sind nicht geladen.');
  return SK.aktiv?skEditor(skNorm(SK.aktiv)):skListeHtml();
}
/* nach jeder Eingabe: Kennzahlen, Bestand, Prüfung und Status neu, ohne die Felder neu aufzubauen */
function skRechnen(){
  iconify($('wz_body')); let r=SK.aktiv; if(!r||!skR()) return;
  let R=skR(), b=R.bestand(r), p=R.pruefen(r,skPruefOpt(r));
  wzH('sk_kpis',skKpis(r,b)); wzH('sk_bestand',skBestandHtml(r,b)); wzH('sk_pruefung',p.liste.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join(''));
  r.ausgaben.forEach(a=>{ let e=$('sk_st_'+idSicher(a.id)); if(e){ let st=R.ausgabeStatus(a,aufHeute()); e.className='sk-chip sk-'+st.stufe; e.textContent=skStatusText(st); } });
  skPads();
}

/* ---------- Dokumente: Übernahmequittung, Ausgabequittung, Übersicht ---------- */
function skAbsender(){ if(typeof wzAbsenderKontakt==='function') return wzAbsenderKontakt(); let g=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}; return {firma:g.firma||'',name:g.name||''}; }
function skSig(bild,zeit,unter,ohneDatum){
  bild=skBild(bild); let d=zeit?new Date(zeit):null;
  return '<div><p>'+(bild&&d&&isFinite(d)?d.toLocaleDateString('de-DE'):ohneDatum||'Ort, Datum')+'</p>'+(bild?'<img src="'+bild+'" alt="Unterschrift">':'<div style="height:60px"></div>')+'<p>'+sEsc(unter)+'</p></div>';
}
function skUebernahmeDok(r){
  let R=skR(), ue=r.uebernahme, rg=r.rueckgabe, K=skAbsender(), eig=skEigentuemerName(r);
  let ks=r.schluessel.filter(k=>R.anzahl(k.anzahl)>0||(k.art||'').trim()), zur=r.schluessel.filter(k=>R.anzahl(k.zurueck)>0);
  return {titel:'Schlüssel Übernahme '+skName(r),ohneFuss:true,pflicht:true,
    html:(K.firma?'<p class="wzd-unter">'+sEsc(K.firma)+'</p>':'')+'<h1>Übernahme von Schlüsseln</h1><p class="wzd-unter">Quittung · '+sEsc(skAnschrift(r))+'</p>'
      +wzDokTabelle([['Objekt',sEsc(skAnschrift(r))],['Eigentümer',sEsc(eig||'–')],['Übernommen am',R.datum(ue.datum)?wzDatum(ue.datum):'–'],
        ['Übernommen von',sEsc([K.name,K.firma].filter(Boolean).join(', ')||'–')]])
      +(ks.length?wzDokTabelle(ks.map(k=>[sEsc((k.art||'').trim()||'Schlüssel'),String(R.anzahl(k.anzahl)),sEsc((k.nummer||'').trim()||'–')]),['Schlüssel','Anzahl','Nummer der Schließanlage']):'<p>Keine Schlüssel eingetragen.</p>')
      +'<div class="wzd-unterschriften">'+skSig(ue.unterschrift,ue.zeit,'Übergeben: '+(eig||'Eigentümer'))+skSig(ue.berater,ue.beraterZeit,'Übernommen: '+(K.name||'Berater'))+'</div>'
      +(zur.length?'<h2>Rückgabe an den Eigentümer</h2>'+wzDokTabelle(zur.map(k=>[sEsc((k.art||'').trim()||'Schlüssel'),String(R.anzahl(k.zurueck)),R.datum(k.zurueckAm)?wzDatum(k.zurueckAm):'–']),['Schlüssel','Anzahl','Zurück am'])
        +'<div class="wzd-unterschriften">'+skSig(rg.unterschrift,rg.zeit,'Zurückerhalten: '+(eig||'Eigentümer'))+'</div>':'')};
}
function skAusgabeDok(r,a){
  let R=skR(), K=skAbsender(), k=r.schluessel.find(x=>x.id===a.schluesselId)||{}, empf=skEmpfaenger(a,false);
  return {titel:'Schlüssel Ausgabe '+skName(r)+(R.datum(a.datum)?' '+wzDatum(a.datum):''),ohneFuss:true,pflicht:true,
    html:(K.firma?'<p class="wzd-unter">'+sEsc(K.firma)+'</p>':'')+'<h1>Ausgabe von Schlüsseln</h1><p class="wzd-unter">Empfangsquittung · '+sEsc(skAnschrift(r))+'</p>'
      +wzDokTabelle([['Objekt',sEsc(skAnschrift(r))],['Empfänger',sEsc(empf)],['Empfänger ist',sEsc(R.rolleName(a.rolle))],['Ausgegeben am',R.datum(a.datum)?wzDatum(a.datum):'–'],
        ['Rückgabe vereinbart bis',R.datum(a.rueckgabeBis)?wzDatum(a.rueckgabeBis):'–'],['Ausgegeben von',sEsc([K.name,K.firma].filter(Boolean).join(', ')||'–')]])
      +wzDokTabelle([[sEsc((k.art||'').trim()||'Schlüssel'),String(R.anzahl(a.anzahl)),sEsc((k.nummer||'').trim()||'–')]],['Schlüssel','Anzahl','Nummer der Schließanlage'])
      +'<div class="wzd-unterschriften">'+skSig(a.unterschrift,a.zeit,'Empfangen: '+empf)
      +'<div><p>'+(R.datum(a.zurueckAm)?'Zurück am '+wzDatum(a.zurueckAm):'Zurück am')+'</p><div style="height:60px"></div><p>Zurückgenommen: '+sEsc(K.name||'Berater')+'</p></div></div>'};
}
/* Übersicht je Objekt für den Eigentümer: Bestand und Ausgaben, Privatpersonen ohne Namen */
function skBuchDok(r){
  let R=skR(), b=R.bestand(r), k=b.gesamt.kaeufer>0, as=r.ausgaben.slice().sort((x,y)=>String(x.datum||'').localeCompare(String(y.datum||'')));
  return {titel:'Schlüsselbuch '+skName(r),pflicht:true,fuss:'Stand des Schlüsselbuchs. Privatpersonen sind aus Datenschutzgründen nicht namentlich genannt.',
    html:'<h1>Schlüsselbuch</h1><p class="wzd-unter">'+sEsc(skAnschrift(r))+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +(b.liste.length?wzDokTabelle(b.liste.map(x=>[sEsc(x.art)+(x.nummer?' (Nr. '+sEsc(x.nummer)+')':''),String(x.anzahl),String(x.beimBerater),String(x.ausgegeben),String(x.zurueck)].concat(k?[String(x.kaeufer)]:[])),
        ['Schlüssel','Übernommen','Beim Berater','Ausgegeben','Zurück an den Eigentümer'].concat(k?['An den Käufer']:[])):'<p>Keine Schlüssel eingetragen.</p>')
      +'<h2>Ausgaben</h2>'+(as.length?wzDokTabelle(as.map(a=>[R.datum(a.datum)?wzDatum(a.datum):'–',sEsc(skSchluesselText(r,a)),sEsc(skEmpfaenger(a,true)),
        R.datum(a.rueckgabeBis)?wzDatum(a.rueckgabeBis):'–',R.datum(a.zurueckAm)?wzDatum(a.zurueckAm):'noch nicht zurück']),['Ausgegeben am','Schlüssel','Empfänger','Rückgabe bis','Zurück am']):'<p>Keine Ausgaben.</p>')};
}
/* Übersicht aller Objekte: was ist gerade ausgegeben? */
function skUebersichtDok(){
  let R=skR(), heute=aufHeute(), z=[];
  wzdAkten('schluessel').forEach(r=>{ skNorm(r); r.ausgaben.filter(R.offen).forEach(a=>z.push({r,a,st:R.ausgabeStatus(a,heute)})); });
  z.sort((x,y)=>String(x.st.datum||'9').localeCompare(String(y.st.datum||'9')));
  return {titel:'Ausgegebene Schlüssel',fuss:'Arbeitsliste; Privatpersonen ohne Namen.',
    html:'<h1>Ausgegebene Schlüssel</h1><p class="wzd-unter">Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +(z.length?wzDokTabelle(z.map(({r,a,st})=>[sEsc(skName(r)),sEsc(skSchluesselText(r,a)),sEsc(skEmpfaenger(a,true)),R.datum(a.datum)?wzDatum(a.datum):'–',sEsc(skStatusText(st))]),
        ['Objekt','Schlüssel','Empfänger','Ausgegeben am','Stand']):'<p>Zurzeit sind keine Schlüssel ausgegeben.</p>')};
}
function skDokument(){
  let r=SK.aktiv, was=SK.dok; SK.dok='';
  if(!skR()) return null;
  if(!r) return skUebersichtDok();
  if(was==='uebernahme') return skUebernahmeDok(r);
  if(was&&was.startsWith('a:')){ let a=r.ausgaben.find(x=>x.id===was.slice(2)); if(a) return skAusgabeDok(r,a); }
  return skBuchDok(r);
}

/* ---------- Kundenakte: Löschen, Auskunft, Anzeige ----------
   Ein Kunde steckt im Schlüsselbuch als Eigentümer (kundeId) oder als Empfänger einer Ausgabe (kundeId der Ausgabe). Beim Löschen
   entfernt die App die Verknüpfung und seine Unterschriften; Schlüssel, Anzahl und Daten der Ausgabe bleiben (Bestand). */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const r of wzdAkten('schluessel')){
    let neu=false;
    if(r.kundeId===id){ r.kundeId=''; r.eigentuemerGeloescht=true; neu=true;
      r.uebernahme=Object.assign({},r.uebernahme,{unterschrift:'',zeit:'',stand:''}); r.rueckgabe=Object.assign({},r.rueckgabe,{unterschrift:'',zeit:'',stand:''}); }
    (Array.isArray(r.ausgaben)?r.ausgaben:[]).forEach(a=>{ if(a&&a.kundeId===id){ Object.assign(a,{kundeId:'',geloescht:true,unterschrift:'',zeit:'',stand:''}); neu=true; } });
    if(neu) await wzdSpeichern('akten',r);
  }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden(); let R=skR(), z=[]; if(!R) return [];
  wzdAkten('schluessel').forEach(r=>{ skNorm(r); let name=skName(r);
    if(r.kundeId===id){ let b=R.bestand(r);
      z.push('- '+name+': Eigentümer; '+b.gesamt.anzahl+' Schlüssel übergeben'+(R.datum(r.uebernahme.datum)?' am '+wzDatum(r.uebernahme.datum):'')
        +(r.uebernahme.unterschrift?', Unterschrift gespeichert':'')+(b.gesamt.zurueck?'; '+b.gesamt.zurueck+' zurückerhalten'+(r.rueckgabe.unterschrift?', Unterschrift gespeichert':''):'')); }
    r.ausgaben.filter(a=>a.kundeId===id).forEach(a=>z.push('- '+name+': '+skSchluesselText(r,a)+' erhalten am '+(R.datum(a.datum)?wzDatum(a.datum):'–')+' als '+R.rolleName(a.rolle)
      +(R.datum(a.rueckgabeBis)?', Rückgabe vereinbart bis '+wzDatum(a.rueckgabeBis):'')+(R.datum(a.zurueckAm)?', zurück am '+wzDatum(a.zurueckAm):', noch nicht zurück')
      +(a.unterschrift?'; Unterschrift (Quittung) gespeichert':'')));
  });
  return ['','SCHLÜSSELBUCH'].concat(z.length?z:['- keine']);
});
KD_AKTE_HOOKS.push(id=>{
  if(!wzdBereit()||!skR()) return '';
  let R=skR(), l=[]; wzdAkten('schluessel').forEach(r=>(Array.isArray(r.ausgaben)?r.ausgaben:[]).filter(a=>a&&a.kundeId===id&&R.offen(a)).forEach(a=>l.push({r,a})));
  if(!l.length) return '';
  // Status als Chip wie im Schlüsselbuch: überfällig rot, heute oder ohne Rückgabe gelb (D60, D63)
  return '<h3>Schlüssel</h3><div class="kd-karten">'+l.map(({r,a})=>{ let st=R.ausgabeStatus(a,aufHeute());
    return '<div class="kd-karte"><div><b>'+sEsc(skSchluesselText(r,a))+': '+sEsc(skName(r))+'</b>'
      +(R.datum(a.datum)?'<span>ausgegeben '+sEsc(wzDatum(a.datum))+'</span>':'')
      +'<div class="sk-chips"><span class="sk-chip sk-'+st.stufe+'">'+sEsc(skStatusText(st))+'</span></div></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();skAusAkte(\''+idSicher(r.projektId)+'\',\''+idSicher(a.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>';
});
/* Verkaufsfahrplan (D49): Schlüssel übernommen und quittiert; alle ausgegebenen Schlüssel zurück */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>{
  let r=wzdAkten('schluessel',o.id)[0], R=skR(); if(!r||!R) return {};
  let b=R.bestand(r);
  return {schluessel_uebernommen:b.gesamt.anzahl>0&&!!(r.uebernahme&&r.uebernahme.unterschrift),schluessel_zurueck:b.gesamt.anzahl>0&&b.gesamt.ausgegeben===0};
});

wzRegistrieren({id:'schluessel',titel:'Schlüsselbuch',sub:'Übernahme, Ausgabe und Rückgabe je Objekt — mit Quittung und vereinbarter Rückgabe',icon:'key',ohneNeu:true,
  zustand:()=>SK.aktiv||skS(),speichern:skSpeichern,zeichnen:skZeichnen,rechnen:skRechnen,dokument:skDokument,
  schliessen:()=>{ if(SK.aktiv) wzdSpeichernSofort('akten',SK.aktiv); SK.aktiv=null; SK.offen=''; SK.dok=''; }});
