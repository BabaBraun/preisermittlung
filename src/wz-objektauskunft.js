/* ---------- Kachel „Objektauskunft“ (D61) ----------
   Angaben des Eigentümers zu Beginn des Auftrags: bekannte Mängel, Feuchtigkeit, Schädlinge, Umbauten mit oder ohne Genehmigung,
   Baulasten, Altlasten, Wege- und Leitungsrechte, Denkmalschutz, Vermietung (nur Zahl und Summen, keine Namen der Mieter), bei
   Wohnungseigentum Sonderumlagen und laufende Verfahren — je Frage ja, nein oder unbekannt mit Erläuterung. Vorbelegung nur
   lesend aus der gesicherten Bewertung, mit Herkunft „aus der Bewertung“; die Bewertung bleibt unverändert. Der Eigentümer
   unterschreibt auf dem Gerät. Der Text der Bestätigung ist ein Vorschlag; die Bank hinterlegt ihre Vorgabe (mit der
   Rechtsabteilung abstimmen). Ändert sich danach eine Angabe, gilt die Unterschrift nicht mehr (Prüfsumme über den Stand,
   js/objektauskunft-regeln.js). Dokument mit Unterschrift für Interessenten und die Akte, mit den Pflichtangaben der
   Genossenschaft. Keine Aussagen zur Haftung.
   Speicher „akten“ (art 'objektauskunft'), ein Eintrag je Objekt; Personen nur als Kunden-Id. Löschen und Auskunft über die
   Kundenakte (KD_LOESCH_HOOKS, KD_AUSKUNFT_HOOKS). Die Vorgabe der Bank für den Text bleibt auf dem Gerät (localStorage „ia_wz“). */
var OA={aktiv:null,meldung:''};
const OA_TEXT='Die Fragen in dieser Objektauskunft habe ich selbst beantwortet. Ich bin einverstanden, dass {berater}{firma} die Angaben '
  +'an Kaufinteressenten und an das Notariat weitergibt. Ändert sich etwas, gebe ich Bescheid.';
function oaR(){ return window.ImmoObjektauskunftRegeln; }
function oaS(){ let a=wzAlle(); if(!a.objektauskunft||typeof a.objektauskunft!=='object'||Array.isArray(a.objektauskunft)) a.objektauskunft={vorgabe:''}; return a.objektauskunft; }
function oaObjektName(r){ return wzdObjektName(r.projektId,r.objekt||'Objekt'); }
function oaVerlauf(r,text){ r.verlauf=(Array.isArray(r.verlauf)?r.verlauf:[]).concat([{zeit:new Date().toISOString(),text}]).slice(-50); }

/* ---------- Text der Bestätigung: eigener Text des Eintrags, sonst Vorgabe der Bank, sonst Vorschlag der App ---------- */
function oaVorlage(r){ return (r&&r.text)||String(oaS().vorgabe||'').trim()||OA_TEXT; }
function oaTextQuelle(r){ return r&&r.text?(r.textQuelle||'eigen'):String(oaS().vorgabe||'').trim()?'bank':'app'; }
function oaText(r){
  let K=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():{}, o=wzdObjekt(r.projektId);
  return ImmoBeratung.vorlageFuellen(oaVorlage(r),{objekt:(o&&o.anschrift)||r.objekt||'',berater:K.name||'die Beraterin oder der Berater',firma:K.firma?' ('+K.firma+')':''}).text;
}
function oaSchluessel(r){ return oaR().inhaltSchluessel(r,oaText(r)); }
function oaPruefen(r){ return oaR().pruefen(r,aufHeute(),{schluessel:oaSchluessel(r),datum:wzDatum,textVorschlag:oaTextQuelle(r)==='app'}); }
/* ohne Unterschrift ist der Text wieder offen für die Vorgabe der Bank (beim Unterschreiben eingefroren) */
function oaTextFrei(r){ if(r.textAuto&&!Object.keys(r.unterschriften||{}).length){ r.text=''; r.textQuelle=''; r.textAuto=false; } }
/* Unterschriften, die nicht mehr zum Stand passen, entfernen (z. B. nach einer Änderung oder aus einer Sicherung) */
function oaPflege(r){
  let n=oaR().ungueltigeEntfernen(r,oaSchluessel(r));
  if(n){ oaTextFrei(r); oaVerlauf(r,'Unterschrift entfernt — Angaben geändert');
    OA.meldung='Die Unterschrift wurde entfernt, weil sich die Angaben geändert haben. Bitte neu unterschreiben lassen.'; }
  return n;
}
function oaGesperrt(r){ return oaR().gueltigeUnterschriften(r,oaSchluessel(r)).length>0; }

/* ---------- Anlegen, öffnen, ändern ---------- */
function oaLeer(o){
  let r=wzdAkteNeu('objektauskunft',{projektId:o.id,objekt:o.name,kundeIds:wzdKunde(o.kundeId)?[o.kundeId]:[],weg:null,antworten:{},
    mieten:{anzahl:'',kaltmiete:'',kaution:''},sonderumlageBetrag:'',text:'',textQuelle:'',textAuto:false,unterschriften:{},verlauf:[]});
  let n=oaR().anwenden(r,oaR().ausBewertung(o.f||{}));
  oaVerlauf(r,'Angelegt'+(n?'; '+n+' Antwort'+(n===1?'':'en')+' aus der Bewertung vorbelegt':''));
  return r;
}
async function oaOeffnen(pid){
  await wzdLaden(); let o=wzdObjekt(pid); if(!o) return;
  let r=wzdAkten('objektauskunft',pid)[0];
  if(!r){ r=oaLeer(o); if(!(await wzdSpeichern('akten',r))) return; }
  OA.aktiv=r; OA.meldung=''; if(WZ.aktiv==='objektauskunft') wzZeichnen(); let ov=$('wz_overlay'); if(ov) ov.scrollTop=0;
}
async function oaAusAkte(pid){ wzOeffnen('objektauskunft'); await oaOeffnen(pid); }
function oaZurueck(){ if(OA.aktiv) wzdSpeichernSofort('akten',OA.aktiv); OA.aktiv=null; OA.meldung=''; wzZeichnen(); }
async function oaLoeschen(){
  let r=OA.aktiv; if(!r||!confirm('Die Objektauskunft für dieses Objekt mit den Unterschriften löschen? Die Bewertung bleibt unverändert.')) return;
  if(await wzdLoeschen('akten',r.id)){ OA.aktiv=null; OA.meldung=''; wzZeichnen(); }
}
function oaSpeichern(){
  let r=OA.aktiv; if(!r){ wzSpeichern(); return; }
  let n=oaPflege(r); wzdSpeichernBald('akten',r); if(n) wzZeichnen();
}
function oaAntwort(key,wert){
  let r=OA.aktiv; if(!r||oaGesperrt(r)) return;
  r.antworten=r.antworten||{}; r.antworten[key]=Object.assign({wert:'',text:''},r.antworten[key],{wert});
  oaPflege(r); wzdSpeichernBald('akten',r); wzZeichnen();
}
function oaAendern(){
  let r=OA.aktiv; if(!r) return;
  if(!confirm('Angaben ändern? Die Unterschrift wird dabei entfernt.\nDas unterschriebene Dokument vorher als PDF zur Akte nehmen.')) return;
  r.unterschriften={}; oaTextFrei(r); oaVerlauf(r,'Unterschrift entfernt — Angaben werden geändert');
  wzdSpeichernSofort('akten',r); wzZeichnen();
}
function oaVorbelegen(){
  let r=OA.aktiv, o=r&&wzdObjekt(r.projektId); if(!r||!o||oaGesperrt(r)) return;
  let n=oaR().anwenden(r,oaR().ausBewertung(o.f||{}));
  if(n){ oaVerlauf(r,n+' Antwort'+(n===1?'':'en')+' aus der Bewertung vorbelegt'); wzdSpeichernSofort('akten',r); }
  alert(n?(n===1?'1 leere Antwort':n+' leere Antworten')+' aus der Bewertung übernommen.':'Die Bewertung enthält nichts für die noch leeren Antworten.');
  wzZeichnen();
}
function oaKundeDazu(){
  wzdKundeWaehlen(id=>{ let r=OA.aktiv; if(!r||!wzdKunde(id)) return; r.kundeIds=r.kundeIds||[];
    if(!r.kundeIds.includes(id)) r.kundeIds.push(id); wzdSpeichernSofort('akten',r); wzZeichnen(); });
}
function oaKundeWeg(id){
  let r=OA.aktiv; if(!r) return;
  if(r.unterschriften&&r.unterschriften[id]&&!confirm('Diesen Eigentümer entfernen? Seine Unterschrift wird gelöscht.')) return;
  r.kundeIds=(r.kundeIds||[]).filter(x=>x!==id); if(r.unterschriften) delete r.unterschriften[id]; oaTextFrei(r);
  wzdSpeichernSofort('akten',r); wzZeichnen();
}
function oaUnterschriftWeg(id){
  let r=OA.aktiv; if(!r||!r.unterschriften||!r.unterschriften[id]) return;
  delete r.unterschriften[id]; oaTextFrei(r); oaVerlauf(r,'Unterschrift gelöscht'); wzdSpeichernSofort('akten',r); wzZeichnen();
}
/* nach jedem Strich auf dem Unterschriftsfeld: Text einfrieren, Unterschrift mit dem Stand speichern */
function oaUnterschrieben(kid,bild){
  let r=OA.aktiv; if(!r||!(r.kundeIds||[]).includes(kid)) return;
  if(!r.text){ let q=oaTextQuelle(r), t=oaText(r); r.text=t; r.textQuelle=q; r.textAuto=true; }
  let s=oaSchluessel(r), neu=!oaR().gueltigeUnterschriften(r,s).includes(kid);
  r.unterschriften=r.unterschriften||{}; r.unterschriften[kid]={bild,zeit:new Date().toISOString(),datum:aufHeute(),inhalt:s};
  if(neu) oaVerlauf(r,'Unterschrift gespeichert ('+oaR().gueltigeUnterschriften(r,s).length+' von '+r.kundeIds.length+')');
  OA.meldung=''; wzdSpeichernBald('akten',r); oaRechnen(true);
}
function oaTextSetzen(v){
  let r=OA.aktiv; if(!r) return; v=String(v||'').trim();
  let alt=oaVorlage(r); if((v||alt)===alt) return;
  let hatte=Object.keys(r.unterschriften||{}).length>0;
  if(hatte&&!confirm('Mit dem neuen Text werden die Unterschriften entfernt. Fortfahren?')){ wzZeichnen(); return; }
  let vorgabe=String(oaS().vorgabe||'').trim()||OA_TEXT;
  r.unterschriften={}; r.textAuto=false;
  if(!v||v===vorgabe){ r.text=''; r.textQuelle=''; } else { r.text=v; r.textQuelle='eigen'; }
  oaVerlauf(r,'Text der Bestätigung geändert'+(hatte?'; Unterschrift entfernt':''));
  wzdSpeichernSofort('akten',r); wzZeichnen();
}
function oaUnterlagen(){ let r=OA.aktiv; if(!r) return; let pid=r.projektId; wzOeffnen('unterlagen'); if(typeof ulOeffnen==='function') ulOeffnen(pid); }

/* ---------- Ansicht ---------- */
function oaStatusText(pr){
  return pr.fertig?'unterschrieben am '+wzDatum(pr.am):pr.offen.length?pr.beantwortet+' von '+pr.gesamt+' Fragen beantwortet':pr.kunden?'Unterschrift fehlt':'Eigentümer fehlt';
}
function oaListeHtml(){
  let aktiv=wzdObjekte(false), alle=wzdObjekte(true), akten=wzdAkten('objektauskunft');
  const karte=(o,r)=>{ let pr=r?oaPruefen(r):null, chips='';
    if(pr){ chips='<span class="pa-chip '+(pr.fertig?'pa-bezahlt':pr.rot?'pa-ueberfaellig':'pa-offen')+'">'+sEsc(oaStatusText(pr))+'</span>'
      +(pr.ja.length?'<span class="pa-chip">'+pr.ja.length+'× ja</span>':'')+(pr.unbekannt.length?'<span class="pa-chip pa-offen">'+pr.unbekannt.length+'× unbekannt</span>':''); }
    return '<div class="kd-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc([o.status||'nicht in Vermarktung',pr?'':'noch nicht begonnen'].filter(Boolean).join(' · '))+'</span>'
      +(chips?'<div class="pa-chips">'+chips+'</div>':'')+'</div>'
      +'<div class="kd-k"><button class="secondary" onclick="oaOeffnen(\''+idSicher(o.id)+'\')">Öffnen</button></div></div>'; };
  let karten=aktiv.map(o=>karte(o,akten.find(r=>r.projektId===o.id)))
    .concat(akten.map(r=>({r,o:alle.find(o=>o.id===r.projektId)})).filter(x=>x.o&&!aktiv.some(a=>a.id===x.o.id)).map(x=>karte(x.o,x.r)));
  let weitere=alle.filter(o=>!aktiv.some(a=>a.id===o.id)&&!akten.some(r=>r.projektId===o.id));
  return (karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein Objekt in Vermarktung. Den Stand „Auftrag erteilt“ oder „In Vermarktung“ setzt man in der Bewertung unter „Vermarktung“.'))
    +(weitere.length?'<div class="field" style="max-width:420px;margin-top:12px"><label for="oa_weitere">Andere gesicherte Bewertung</label><select id="oa_weitere" onchange="if(this.value)oaOeffnen(this.value)"><option value="">– wählen –</option>'
      +weitere.map(o=>'<option value="'+sEsc(o.id)+'">'+sEsc(o.name)+'</option>').join('')+'</select></div>':'')
    +wzHinweis('Zu Beginn des Auftrags: Der Eigentümer beantwortet die Fragen und unterschreibt auf dem Gerät. Was die gesicherte Bewertung schon enthält, steht als Vorschlag drin — die Bewertung selbst bleibt unverändert.')
    +wzBox('Text der Bestätigung — Vorgabe der Bank',wzFeld('vorgabe','Text unter den Antworten',{typ:'lang',zeilen:4,voll:true,ph:OA_TEXT,
        hinweis:'Leer = Vorschlag der App. Platzhalter {berater}, {firma}, {objekt}. Gilt für alle Auskünfte, die noch nicht unterschrieben sind.'})
      +wzAmpel('gelb','Text mit der Rechtsabteilung abstimmen — Vorgaben der Bank verwenden. Die App macht keine Aussagen zur Haftung.'));
}
function oaWahlHtml(q,a,gesperrt){
  return '<div class="ka-schalter oa-wahl" role="group" aria-label="Antwort: '+sEsc(q.kurz)+'">'+oaR().ANTWORTEN.map(([w,t])=>'<button type="button" class="'+(a.wert===w?'primary':'secondary')
    +'" aria-pressed="'+(a.wert===w)+'"'+(gesperrt?' disabled':'')+' onclick="oaAntwort(\''+q.key+'\',\''+w+'\')">'+t+'</button>').join('')+'</div>';
}
function oaHerkunftText(h){ return h==='bewertung'?'aus der Bewertung':h==='geaendert'?'aus der Bewertung, geändert':''; }
function oaFrageHtml(r,q,gesperrt){
  let a=(r.antworten||{})[q.key]||{}, h=oaR().herkunft(a), extra='';
  if(q.key==='vermietet'&&a.wert==='ja') extra='<div class="grid oa-zusatz">'+wzFeld('mieten.anzahl','Vermietete Einheiten',{typ:'zahl'})
    +wzFeld('mieten.kaltmiete','Nettokaltmiete zusammen',{typ:'betrag',einheit:'€ je Monat'})+wzFeld('mieten.kaution','Kautionen zusammen',{typ:'betrag',einheit:'€'})+'</div>'
    +wzHinweis('Nur Zahl und Summen — keine Namen der Mieter. Mietverträge stehen in der Kachel „Unterlagen“.');
  if(q.key==='sonderumlage'&&a.wert==='ja') extra='<div class="grid oa-zusatz">'+wzFeld('sonderumlageBetrag','Anteil dieser Wohnung',{typ:'betrag',einheit:'€'})+'</div>';
  return '<div class="oa-frage" data-key="'+q.key+'"><div class="oa-frage-kopf"><span>'+sEsc(q.frage)+'</span>'
      +'<span class="oa-herkunft'+(h==='geaendert'?' oa-geaendert':'')+'"'+(h?'':' hidden')+' title="'+sEsc(a.bw&&a.bw.von||'')+'">'+oaHerkunftText(h)+'</span></div>'
    +oaWahlHtml(q,a,gesperrt)+wzFeld('antworten.'+q.key+'.text','Erläuterung',{typ:'lang',zeilen:2,voll:true,ph:q.ph||''})+extra+'</div>';
}
function oaAmpelnHtml(pr){
  return pr.liste.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join('')
    +(pr.liste.some(x=>x.ul)?'<div class="gr-zeile"><button type="button" class="secondary" onclick="oaUnterlagen()" data-ic="folder-open">Unterlagen öffnen</button></div>':'');
}
function oaKpisHtml(pr){
  return wzdKpi('Beantwortet',pr.beantwortet+' von '+pr.gesamt,pr.offen.length?pr.offen.length+' offen':'alle beantwortet')
    +wzdKpi('Mit „ja“',String(pr.ja.length),'')+wzdKpi('Unbekannt',String(pr.unbekannt.length),'')
    +wzdKpi('Unterschrift',pr.fertig?wzDatum(pr.am):pr.unterschrieben+' von '+pr.kunden,pr.fertig?'gültig':'');
}
function oaEditor(r){
  if(oaPflege(r)) wzdSpeichernBald('akten',r);
  let pr=oaPruefen(r), gesperrt=pr.gueltig.length>0, u=r.unterschriften||{}, kunden=r.kundeIds||[];
  let gruppen=oaR().GRUPPEN.map(([g,titel])=>{ let l=pr.fragen.filter(q=>q.gruppe===g); if(!l.length) return '';
    return wzBox(titel,l.map(q=>oaFrageHtml(r,q,gesperrt)).join(''),{klasse:'oa-gruppe'}); }).join('');
  let pads=pr.offen.length?wzHinweis('Erst alle Fragen beantworten — dann unterschreibt der Eigentümer hier auf dem Gerät.')
    :!kunden.length?wzHinweis('Erst den Eigentümer aus der Kundenakte wählen.')
    :'<div class="ub-pads">'+kunden.map(kid=>{ let ok=pr.gueltig.includes(kid);
      return '<div class="ub-pad"><div class="ub-pad-kopf"><b>'+sEsc(wzdKundeName(kid))+'</b>'+(ok?'<span>unterschrieben '+new Date(u[kid].zeit).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})+'</span>':'')+'</div>'
        +'<canvas class="ub-canvas oa-pad" data-kunde="'+sEsc(kid)+'" aria-label="Unterschrift '+sEsc(wzdKundeName(kid))+'"></canvas>'
        +(ok?'<button type="button" class="secondary" onclick="oaUnterschriftWeg(\''+idSicher(kid)+'\')">Unterschrift löschen</button>':'')+'</div>'; }).join('')+'</div>';
  let verlauf=Array.isArray(r.verlauf)?r.verlauf:[];
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="oaZurueck()" data-ic="arrow-left">Alle Objekte</button>'
      +'<span class="ub-status">'+sEsc(oaObjektName(r))+'</span><button type="button" class="secondary" onclick="oaLoeschen()" data-ic="trash">Löschen</button></div>'
    +(OA.meldung?wzAmpel('rot',sEsc(OA.meldung)):'')
    +'<div class="wz-kpis grid" id="oa_kpis">'+oaKpisHtml(pr)+'</div>'
    +wzBox('Prüfung','<div id="oa_pruefung">'+oaAmpelnHtml(pr)+'</div>')
    +wzBox('Eigentümer',(kunden.length?'<div class="kd-karten">'+kunden.map(kid=>'<div class="kd-karte"><div><b>'+sEsc(wzdKundeName(kid))+'</b><span>'+sEsc(wzdKundeKontakt(kid)||'')+'</span></div>'
        +'<div class="kd-k"><button class="secondary" onclick="oaKundeWeg(\''+idSicher(kid)+'\')" aria-label="'+sEsc(wzdKundeName(kid))+' entfernen">Entfernen</button></div></div>').join('')+'</div>'
        :wzHinweis('Noch kein Eigentümer gewählt.'))
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="oaKundeDazu()" data-ic="users">Eigentümer aus der Kundenakte</button>'
      +'<button type="button" class="secondary oa-vorbelegen" onclick="oaVorbelegen()" data-ic="arrow-down"'+(gesperrt?' hidden':'')+'>Leere Antworten aus der Bewertung</button></div>'
      +'<div class="grid">'+wzFeld('weg','Wohnungs- oder Teileigentum (Fragen zur Eigentümergemeinschaft)',{typ:'check',zeichnen:true,voll:true})+'</div>'
      +wzHinweis('Vorschläge aus der gesicherten Bewertung (Mängel, Baulasten, Altlasten, Rechte in Abt. II, Denkmalschutz, Vermietung) sind mit „aus der Bewertung“ markiert. Die Bewertung bleibt unverändert.'))
    +'<div class="oa-fragen'+(gesperrt?' oa-gesperrt':'')+'">'+gruppen+'</div>'
    +wzBox('Bestätigung und Unterschrift','<p class="ka-nachweis-text" id="oa_text">'+sEsc(oaText(r))+'</p>'+pads
      +'<div class="gr-zeile oa-aendern"'+(gesperrt?'':' hidden')+'><button type="button" class="secondary" onclick="oaAendern()" data-ic="pen">Angaben ändern</button></div>'
      +'<details class="ka-nachweis-aendern"><summary>Text ändern</summary><textarea id="oa_text_eingabe" rows="4" aria-label="Text der Bestätigung" onchange="oaTextSetzen(this.value)">'+sEsc(oaVorlage(r))+'</textarea>'
      +'<p class="hint">Platzhalter {objekt}, {berater}, {firma}. Text mit der Rechtsabteilung abstimmen; die Vorgabe der Bank steht in der Übersicht der Kachel. Wer den Text nach der Unterschrift ändert, muss neu unterschreiben lassen.</p></details>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wzDokument()" data-ic="file-text">Objektauskunft als Dokument</button></div>')
    +(verlauf.length?wzBox('','<details class="ka-nachweis-aendern oa-verlauf"><summary>Verlauf ('+verlauf.length+')</summary><ul class="wz-liste">'
      +verlauf.slice().reverse().map(v=>'<li>'+sEsc(new Date(v.zeit).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}))+' — '+sEsc(v.text)+'</li>').join('')+'</ul></details>'):'');
}
function oaZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='objektauskunft') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(OA.aktiv) OA.aktiv=wzdAkten('objektauskunft').find(x=>x.id===OA.aktiv.id)||null;   // nach Neuladen derselbe Eintrag; gelöscht → Übersicht
  return OA.aktiv?oaEditor(OA.aktiv):oaListeHtml();
}
/* nach jeder Eingabe: Prüfung, Kennzahlen und Herkunft neu, Felder nach der Unterschrift gesperrt, Unterschriftsfelder bereit */
function oaRechnen(nurStatus){
  let box=$('wz_body'), r=OA.aktiv; if(!box) return; iconify(box); if(!r) return;
  let pr=oaPruefen(r), gesperrt=pr.gueltig.length>0;
  wzH('oa_kpis',oaKpisHtml(pr)); wzH('oa_pruefung',oaAmpelnHtml(pr)); iconify($('oa_pruefung'));
  box.querySelectorAll('.oa-frage').forEach(el=>{ let c=el.querySelector('.oa-herkunft'), h=oaR().herkunft((r.antworten||{})[el.dataset.key]); if(c){ c.textContent=oaHerkunftText(h); c.hidden=!h; c.classList.toggle('oa-geaendert',h==='geaendert'); } });
  box.querySelectorAll('.oa-fragen [data-wz],.oa-fragen .oa-wahl button,[data-wz="weg"]').forEach(e=>{ e.disabled=gesperrt; });
  let f=box.querySelector('.oa-fragen'); if(f) f.classList.toggle('oa-gesperrt',gesperrt);
  box.querySelectorAll('.oa-vorbelegen').forEach(e=>{ e.hidden=gesperrt; }); box.querySelectorAll('.oa-aendern').forEach(e=>{ e.hidden=!gesperrt; });
  if(nurStatus===true) return;
  box.querySelectorAll('canvas.oa-pad').forEach(c=>{ let kid=c.dataset.kunde;
    const start=()=>wzUnterschriftPad(c,((r.unterschriften||{})[kid]||{}).bild||'',bild=>oaUnterschrieben(kid,bild));
    if(c.getBoundingClientRect().width>0) start(); else setTimeout(start,60); });
}

/* ---------- Dokument: für Interessenten und die Akte ---------- */
function oaAntwortText(w){ return w==='ja'?'ja':w==='nein'?'nein':w==='unbekannt'?'unbekannt':'–'; }
/* Tabelle Frage · Antwort · Erläuterung mit festen Spaltenbreiten in allen Abschnitten */
function oaDokTab(zeilen){
  return '<table class="wzd-tab oa-tab"><colgroup><col class="oa-sp-frage"><col class="oa-sp-antwort"><col></colgroup><thead><tr><th>Frage</th><th>Antwort</th><th>Erläuterung</th></tr></thead><tbody>'
    +zeilen.map(z=>'<tr><td>'+z[0]+'</td><td>'+z[1]+'</td><td>'+z[2]+'</td></tr>').join('')+'</tbody></table>';
}
function oaDokument(){
  let r=OA.aktiv; if(!r){ alert('Bitte zuerst ein Objekt öffnen.'); return null; }
  if(oaPflege(r)) wzdSpeichernSofort('akten',r);
  let o=wzdObjekt(r.projektId), f=(o&&o.f)||{}, pr=oaPruefen(r), A=r.antworten||{}, u=r.unterschriften||{}, M=r.mieten||{};
  let K=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():{}, anschrift=(o&&o.anschrift)||r.objekt||oaObjektName(r);
  let kopf=[['Objekt',sEsc(anschrift)]];
  let gb=[f.od_grundbuch?'Grundbuch von '+f.od_grundbuch:'',f.od_gb_blatt?'Blatt '+f.od_gb_blatt:''].filter(Boolean).join(', '); if(gb) kopf.push(['Grundbuch',sEsc(gb)]);
  let fl=f.od_flst_nrn||f.ek_flst; if(fl) kopf.push(['Flurstück',sEsc(fl)]);
  if(r.weg===true) kopf.push(['Art','Wohnungs- oder Teileigentum']);
  const betrag=x=>wzN(x,true)>0?wzEur(wzN(x,true)):'';
  let teile=oaR().GRUPPEN.map(([g,titel])=>{ let l=pr.fragen.filter(q=>q.gruppe===g); if(!l.length) return '';
    return '<h2>'+sEsc(titel)+'</h2>'+oaDokTab(l.map(q=>{ let a=A[q.key]||{}, z=[sEsc(String(a.text||'').trim()).replace(/\n/g,'<br>')];
      if(q.key==='vermietet'&&a.wert==='ja') z.push(String(M.anzahl||'').trim()?'Vermietete Einheiten: '+sEsc(String(M.anzahl).trim()):'',
        betrag(M.kaltmiete)?'Nettokaltmiete zusammen: '+betrag(M.kaltmiete)+' je Monat':'',betrag(M.kaution)?'Kautionen zusammen: '+betrag(M.kaution):'');
      if(q.key==='sonderumlage'&&a.wert==='ja'&&betrag(r.sonderumlageBetrag)) z.push('Anteil dieser Wohnung: '+betrag(r.sonderumlageBetrag));
      return [sEsc(q.frage),a.wert==='ja'||a.wert==='unbekannt'?'<b>'+oaAntwortText(a.wert)+'</b>':oaAntwortText(a.wert),z.filter(Boolean).join('<br>')||'–']; })); }).join('');
  let kunden=r.kundeIds||[];
  // gültig heißt auch: Bild-Daten (oaR().bildGueltig); zusätzlich maskiert, falls ein Eintrag aus einer Sicherung stammt
  let unterschriften='<div class="wzd-unterschriften">'+(kunden.length?kunden:['']).map(kid=>{ let ok=kid&&pr.gueltig.includes(kid)&&oaR().bildGueltig(u[kid].bild);
    return '<div><p>'+(ok?wzDatum(u[kid].datum||String(u[kid].zeit||'').slice(0,10)):'Ort, Datum')+'</p>'+(ok?'<img src="'+sEsc(u[kid].bild)+'" alt="Unterschrift">':'<div style="height:60px"></div>')
      +'<p>'+sEsc(kid?wzdKundeName(kid):'Eigentümer')+'</p></div>'; }).join('')+'</div>';
  return {titel:'Objektauskunft '+oaObjektName(r),ohneFuss:true,pflicht:true,
    html:(K.firma?'<p class="wzd-unter">'+sEsc(K.firma)+'</p>':'')
      +(pr.fertig?'':'<p class="pa-entwurf">Entwurf — '+(pr.offen.length?'nicht alle Fragen beantwortet':'nicht unterschrieben')+'</p>')
      +'<h1>Objektauskunft</h1><p class="wzd-unter">Angaben des Eigentümers · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle(kopf)+teile
      +'<h2>Bestätigung</h2><p>'+sEsc(oaText(r))+'</p>'+unterschriften
      +((K.name||K.tel||K.mail)?'<h2>Ihr Ansprechpartner</h2><p>'+sEsc(K.name||'')+(K.funktion?'<br>'+sEsc(K.funktion):'')+(K.tel?'<br>Telefon '+sEsc(K.tel):'')+(K.mail?'<br>'+sEsc(K.mail):'')+'</p>':'')};
}

/* ---------- Kundenakte: Löschen, Auskunft, Anzeige ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const r of wzdAkten('objektauskunft').filter(r=>(r.kundeIds||[]).includes(id)||(r.unterschriften&&r.unterschriften[id]))){
    r.kundeIds=(r.kundeIds||[]).filter(x=>x!==id); if(r.unterschriften) delete r.unterschriften[id]; oaTextFrei(r);
    oaVerlauf(r,'Ein Eigentümer wurde aus der Kundenakte gelöscht; seine Unterschrift ist entfernt');
    await wzdSpeichern('akten',r);
  }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=wzdAkten('objektauskunft').filter(r=>(r.kundeIds||[]).includes(id)), z=[];
  l.forEach(r=>{ let pr=oaPruefen(r), u=(r.unterschriften||{})[id], ok=pr.gueltig.includes(id), A=r.antworten||{};
    z.push('- '+oaObjektName(r)+': als Eigentümer, '+pr.beantwortet+' von '+pr.gesamt+' Fragen beantwortet'
      +(ok?', unterschrieben am '+wzDatum(u.datum||String(u.zeit||'').slice(0,10))+'; Unterschrift gespeichert':', nicht unterschrieben'));
    pr.fragen.filter(q=>(A[q.key]||{}).wert).forEach(q=>z.push('  '+q.kurz+': '+A[q.key].wert+(String(A[q.key].text||'').trim()?' — '+String(A[q.key].text).trim():''))); });
  return ['','OBJEKTAUSKÜNFTE (ANGABEN ALS EIGENTÜMER)'].concat(z.length?z:['- keine']);
});
KD_AKTE_HOOKS.push(id=>{
  if(!wzdBereit()) return '';
  let l=wzdAkten('objektauskunft').filter(r=>(r.kundeIds||[]).includes(id)); if(!l.length) return '';
  return '<h3>Objektauskunft</h3><div class="kd-karten">'+l.map(r=>'<div class="kd-karte"><div><b>'+sEsc(oaObjektName(r))+'</b><span>'+sEsc(oaStatusText(oaPruefen(r)))+'</span></div>'
    +'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();oaAusAkte(\''+idSicher(r.projektId)+'\')">Öffnen</button></div></div>').join('')+'</div>';
});
/* Verkaufsfahrplan (D49): Schritt „objektauskunft“ gilt als erkannt, sobald alle Eigentümer gültig unterschrieben haben */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>wzdAkten('objektauskunft',o.id).some(r=>oaPruefen(r).fertig)?{objektauskunft:true}:{});

wzRegistrieren({id:'objektauskunft',titel:'Objektauskunft',sub:'Angaben des Eigentümers zu Mängeln, Rechten und Vermietung — unterschrieben auf dem Gerät',icon:'clipboard',ohneNeu:true,
  zustand:()=>OA.aktiv||oaS(),speichern:oaSpeichern,zeichnen:oaZeichnen,rechnen:oaRechnen,dokument:oaDokument,
  schliessen:()=>{ if(OA.aktiv) wzdSpeichernSofort('akten',OA.aktiv); OA.aktiv=null; OA.meldung=''; }});
