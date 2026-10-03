/* ---------- Kacheln „Interessenten“ und „Akquise“ (D40) ----------
   Interessenten: Anfragen zu Objekten in Vermarktung — Quelle, Status bis Kauf oder Absage, Verlauf, Wiedervorlagen,
   Besichtigung im Kalender, Schreiben aus den Vorlagen — und der Abgleich aller Suchprofile der Kundenakte mit allen Objekten
   in Vermarktung (Regeln der Käuferkartei, src/buyer-profiles.js). Akquise: Eigentümer, die verkaufen oder bewerten lassen
   wollen, vom Erstkontakt bis zum Auftrag. Beide teilen sich den Speicher „vorgaenge“ (typ anfrage | akquise); Personen
   stehen in der Kundenakte. Auswertungen und Dokumente nennen keine Namen. Werbende Ansprache nur mit Einwilligung (§ 7 UWG). */
var VG={aktiv:null,neu:null};
const VG_TYPEN={
  anfrage:{kachel:'interessenten',titel:'Interessenten',person:'Interessent',
    status:['Neu','Kontaktiert','Exposé versendet','Besichtigung','Angebot','Gekauft','Abgesagt'],abbruch:'Abgesagt',ziel:'Gekauft',
    quellen:['ImmoScout24','Immowelt','Anderes Portal','Website der Bank','Filiale','Empfehlung','Schild am Objekt','Zeitung','Suchprofil (Abgleich)','Sonstiges'],
    gruende:['','Preis','Lage','Zustand','Grundriss','Größe','Finanzierung','anderes Objekt gekauft','kein Interesse mehr','Sonstiges']},
  akquise:{kachel:'akquise',titel:'Akquise',person:'Eigentümer',
    status:['Erstkontakt','Termin vereinbart','Bewertung erstellt','Angebot abgegeben','Auftrag erteilt','Kein Auftrag'],abbruch:'Kein Auftrag',ziel:'Auftrag erteilt',
    quellen:['Filiale','Empfehlung','Bewertungsanfrage','Website der Bank','Bestandskunde','Eigene Ansprache','Sonstiges'],
    gruende:['','Preisvorstellung','anderer Makler','Verkauf privat','Verkauf verschoben','Sonstiges']}
};
const VG_ANLASS=['Verkauf geplant','Wertermittlung gewünscht','Vermietung','Sonstiges'];
const VG_ARTEN=['Einfamilienhaus','Doppel- oder Reihenhaus','Eigentumswohnung','Mehrfamilienhaus','Wohn- und Geschäftshaus','Grundstück','Gewerbe'];
function vgTyp(){ return WZ.aktiv==='akquise'?'akquise':'anfrage'; }
function vgT(typ){ return VG_TYPEN[typ||vgTyp()]; }
function vgS(typ){ let k=vgT(typ).kachel, a=wzAlle(); if(!a[k]||typeof a[k]!=='object'||Array.isArray(a[k])) a[k]={ansicht:typ==='akquise'?'pipeline':'liste',objekt:'',status:'offen',satz:'3,57'}; return a[k]; }
function vgSetz(k,v){ vgS(vgTyp())[k]=v; wzSpeichern(); wzZeichnen(); }
function vgOffen(v){ let t=vgT(v.typ); return v.status!==t.abbruch&&v.status!==t.ziel; }
function vgListe(typ){ return wzdListe('vorgaenge').filter(v=>v.typ===typ); }
/* Statuswechsel: höchste erreichte Stufe merken (Auswertung als Trichter) */
function vgStatusFolge(v,status){
  let t=vgT(v.typ), i=t.status.indexOf(status); if(i<0) return;
  if(status===t.abbruch) v.abgesagt=true; else { v.abgesagt=false; v.stufe=Math.max(+v.stufe||0,i); }
  if(v.status!==status) (v.verlauf=v.verlauf||[]).push({id:wzdId('h'),datum:aufHeute(),text:'Status: '+status});
  v.status=status;
}
function vgNaechste(v){ return aufSortiert(aufLoad().filter(a=>!a.erledigt&&a.kundeId&&a.kundeId===v.kundeId&&(!v.projektId||!a.objekt||a.objekt===wzdObjektName(v.projektId,a.objekt))))[0]||null; }

/* ---------- neu anlegen ---------- */
function vgNeuEntwurf(typ,vorgabe){
  VG.aktiv=null;
  VG.neu=Object.assign({typ,datum:aufHeute(),quelle:vgT(typ).quellen[0],projektId:'',objektArt:VG_ARTEN[0],objektOrt:'',wert:'',anlass:VG_ANLASS[0],notiz:'',
    person:{modus:'neu',anrede:'',vorname:'',nachname:'',telefon:'',email:'',einwilligungEmail:false,einwilligungTelefon:false,einwilligungForm:'',dsinfo:false,kundeId:''}},vorgabe||{});
  wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function vgNeuAbbrechen(){ VG.neu=null; wzZeichnen(); }
function vgNeuKunde(){ wzdKundeWaehlen(id=>{ if(!VG.neu) return; VG.neu.person.kundeId=id; VG.neu.person.modus='akte'; wzZeichnen(); }); }
async function vgNeuAnlegen(){
  let n=VG.neu; if(!n) return; await wzdLaden();
  let kid=n.person.modus==='akte'?n.person.kundeId:'';
  if(n.person.modus==='akte'&&!kid){ alert('Bitte den '+vgT(n.typ).person+' aus der Kundenakte wählen.'); return; }
  if(!kid){ let k=await wzdKundeNeu(n.person); if(!k) return; kid=k.id; }
  let v={id:wzdId('v'),typ:n.typ,datum:wzdDatum(n.datum)||aufHeute(),kundeId:kid,projektId:n.projektId||'',quelle:n.quelle,status:vgT(n.typ).status[0],stufe:0,abgesagt:false,
    grund:'',notiz:n.notiz||'',verlauf:[{id:wzdId('h'),datum:wzdDatum(n.datum)||aufHeute(),text:(n.typ==='akquise'?'Kontakt':'Anfrage')+' über '+n.quelle}]};
  if(n.typ==='akquise') Object.assign(v,{objektArt:n.objektArt,objektOrt:n.objektOrt,wert:n.wert,anlass:n.anlass});
  if(!(await wzdSpeichern('vorgaenge',v))) return;
  VG.neu=null; VG.aktiv=v; wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function vgNeuHtml(n){
  let t=vgT(n.typ), p=n.person;
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="vgNeuAbbrechen()" data-ic="arrow-left">Abbrechen</button><span class="ub-status">'
      +(n.typ==='akquise'?'Neuer Eigentümer-Kontakt':'Neue Anfrage')+'</span><button type="button" class="primary" onclick="vgNeuAnlegen()" data-ic="check">Anlegen</button></div>'
    +wzBox(n.typ==='akquise'?'Kontakt':'Anfrage','<div class="grid">'+wzFeld('datum','Eingang am',{typ:'datum'})+wzFeld('quelle','Quelle',{typ:'wahl',optionen:t.quellen.map(q=>[q,q])})
      +(n.typ==='akquise'?wzFeld('anlass','Anlass',{typ:'wahl',optionen:VG_ANLASS.map(a=>[a,a])})+wzFeld('objektArt','Objektart',{typ:'wahl',optionen:VG_ARTEN.map(a=>[a,a])})
        +wzFeld('objektOrt','Ort',{typ:'text',ph:'z. B. Ilsfeld'})+wzFeld('wert','Wert grob geschätzt',{typ:'betrag',einheit:'€'})
        :'<div class="field"><label for="vg_neu_objekt">Objekt</label><select id="vg_neu_objekt" onchange="VG.neu.projektId=this.value">'+wzdObjektOptionen(n.projektId,'– Objekt wählen –')+'</select></div>')
      +wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:n.typ==='akquise'?'z. B. Erbengemeinschaft, möchte bis Frühjahr verkaufen':'z. B. sucht für Familie mit zwei Kindern'})+'</div>')
    +wzBox(t.person,'<div class="vg-modus" role="group" aria-label="'+t.person+'">'
        +[['neu','Neu erfassen'],['akte','Aus der Kundenakte']].map(([m,txt])=>'<button type="button" class="'+(p.modus===m?'primary':'secondary')+'" aria-pressed="'+(p.modus===m)+'" onclick="VG.neu.person.modus=\''+m+'\';wzZeichnen()">'+txt+'</button>').join('')+'</div>'
      +(p.modus==='akte'?(p.kundeId?'<div class="kd-karte"><div><b>'+sEsc(wzdKundeName(p.kundeId))+'</b><span>'+sEsc(wzdKundeKontakt(p.kundeId))+'</span></div><div class="kd-k"><button class="secondary" onclick="vgNeuKunde()">Ändern</button></div></div>'
          :'<button type="button" class="secondary" onclick="vgNeuKunde()" data-ic="users">Aus der Kundenakte wählen</button>')
        :'<div class="grid">'+wzFeld('person.anrede','Anrede',{typ:'wahl',optionen:[['',''],['Frau','Frau'],['Herr','Herr'],['Divers','Divers'],['Firma','Firma']]})
          +wzFeld('person.vorname','Vorname',{typ:'text'})+wzFeld('person.nachname','Nachname',{typ:'text'})+wzFeld('person.telefon','Telefon',{typ:'text'})
          +wzFeld('person.email','E-Mail',{typ:'text'})
          +wzFeld('person.einwilligungEmail','Einwilligung in Werbung per E-Mail heute erteilt',{typ:'check',voll:true,zeichnen:true})
          +wzFeld('person.einwilligungTelefon','Einwilligung in Werbeanrufe heute erteilt',{typ:'check',voll:true,zeichnen:true})
          +(p.einwilligungEmail||p.einwilligungTelefon?wzFeld('person.einwilligungForm','Form der Einwilligung',{typ:'wahl',optionen:[['','– bitte wählen –']].concat(ImmoWerbung.FORMEN.filter(f=>f!==ImmoWerbung.ALT).map(f=>[f,f]))}):'')
          +wzFeld('person.dsinfo','Datenschutzinformation heute gegeben',{typ:'check',voll:true})+'</div>'
          +wzHinweis('Die Person wird in der Kundenakte angelegt — Rechtsgrundlage: '+(n.typ==='akquise'?'Anbahnung eines Auftrags':'Anfrage zu einem Objekt')+' (Art. 6 Abs. 1 lit. b DSGVO). '
            +'Einwilligungen je Kanal nur, wenn der Kunde sie ausdrücklich erteilt hat; den Nachweis (Vordruck, E-Mail) danach in der Akte eintragen (§ 7a UWG).')));
}

/* ---------- Vorgang bearbeiten ---------- */
function vgOeffnenId(id){ let v=wzdListe('vorgaenge').find(x=>x.id===id); if(!v) return; VG.neu=null; VG.aktiv=v; wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function inOeffnen(id){ await wzdLaden(); vgOeffnenId(id); }
async function akOeffnen(id){ await wzdLaden(); vgOeffnenId(id); }
function vgZurueck(){ if(VG.aktiv) wzdSpeichernSofort('vorgaenge',VG.aktiv); VG.aktiv=null; wzZeichnen(); }
async function vgLoeschen(){
  let v=VG.aktiv; if(!v||!confirm('Diesen Eintrag mit Verlauf löschen? Die Person bleibt in der Kundenakte.')) return;
  if(await wzdLoeschen('vorgaenge',v.id)){ VG.aktiv=null; wzZeichnen(); }
}
function vgSpeichern(){ let v=VG.aktiv; if(!v) return; wzdSpeichernBald('vorgaenge',v); }
/* Status per Auswahl im Editor (data-wz „status“) läuft über vgSpeichern; hier die Folge (Stufe, Verlauf) */
function vgStatusWahl(wert){ let v=VG.aktiv; if(!v) return; vgStatusFolge(v,wert); wzdSpeichernSofort('vorgaenge',v); wzZeichnen(); }
async function vgStatusListe(id,wert){ let v=wzdListe('vorgaenge').find(x=>x.id===id); if(!v) return; vgStatusFolge(v,wert); await wzdSpeichern('vorgaenge',v); wzZeichnen(); }
function vgObjektWahl(id){ let v=VG.aktiv; if(!v) return; v.projektId=id; wzdSpeichernSofort('vorgaenge',v); wzZeichnen(); }
function vgVerlaufDazu(){
  let v=VG.aktiv, e=$('vg_verlauf_neu'), d=$('vg_verlauf_datum'); if(!v||!e) return;
  let t=(e.value||'').trim(); if(!t){ e.focus(); return; }
  (v.verlauf=v.verlauf||[]).push({id:wzdId('h'),datum:wzdDatum(d&&d.value)||aufHeute(),text:t}); wzdSpeichernSofort('vorgaenge',v); wzZeichnen();
}
function vgVerlaufWeg(hid){ let v=VG.aktiv; if(!v) return; v.verlauf=(v.verlauf||[]).filter(h=>h.id!==hid); wzdSpeichernSofort('vorgaenge',v); wzZeichnen(); }
function vgWiedervorlage(){
  let v=VG.aktiv, t=$('vg_wv_text'), d=$('vg_wv_datum'); if(!v||!t) return;
  let text=(t.value||'').trim()||t.placeholder, frist=wzdDatum(d&&d.value);
  if(!frist){ alert('Bitte ein gültiges Datum für die Wiedervorlage wählen.'); return; }
  if(wzdWiedervorlage(text,frist,wzdObjektName(v.projektId,v.objektOrt||''),v.kundeId)){ (v.verlauf=v.verlauf||[]).push({id:wzdId('h'),datum:aufHeute(),text:'Wiedervorlage am '+wzDatum(frist)+': '+text}); wzdSpeichernSofort('vorgaenge',v); wzZeichnen(); }
}
function vgExposeVersendet(){ let v=VG.aktiv; if(!v) return; (v.verlauf=v.verlauf||[]).push({id:wzdId('h'),datum:aufHeute(),text:'Exposé versendet'});
  if((+v.stufe||0)<2&&!v.abgesagt) vgStatusFolge(v,'Exposé versendet'); wzdSpeichernSofort('vorgaenge',v); wzZeichnen(); }
function vgTermin(){
  let v=VG.aktiv; if(!v) return; wzdSpeichernSofort('vorgaenge',v);
  kaTerminMit({art:v.typ==='akquise'?'Akquise-Gespräch':'Besichtigung',projektId:v.projektId||'',kundeIds:v.kundeId?[v.kundeId]:[],titel:v.typ==='akquise'?(v.objektArt||'')+(v.objektOrt?' in '+v.objektOrt:''):'',
    ort:v.typ==='akquise'?(v.objektOrt||''):''});
}
function vgSchreiben(){ let v=VG.aktiv; if(!v) return; wzdSpeichernSofort('vorgaenge',v); vlOeffnenMit({vorlage:v.typ==='akquise'?'akquise':'expose',kundeId:v.kundeId,projektId:v.projektId||''}); }
function vgBewertung(){
  let v=VG.aktiv; if(!v||!v.kundeId) return;
  if(!confirm('Eine neue Bewertung für '+wzdKundeName(v.kundeId)+' beginnen? Die App wechselt zur Objektart-Auswahl.')) return;
  (v.verlauf=v.verlauf||[]).push({id:wzdId('h'),datum:aufHeute(),text:'Bewertung begonnen'}); wzdSpeichernSofort('vorgaenge',v);
  wzSchliessen(); kdNeueBewertung(v.kundeId);
}
function vgVerlaufHtml(v){
  let l=(v.verlauf||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
  return (l.length?'<ul class="vg-verlauf">'+l.map(h=>'<li><span>'+wzDatum(h.datum)+'</span><span>'+sEsc(h.text)+'</span><button type="button" class="weg" aria-label="Eintrag löschen" onclick="vgVerlaufWeg(\''+idSicher(h.id)+'\')">✕</button></li>').join('')+'</ul>':'')
    +'<div class="kd-neu"><input id="vg_verlauf_datum" type="date" value="'+aufHeute()+'" aria-label="Datum"><input id="vg_verlauf_neu" placeholder="z. B. Rückruf: Finanzierung wird geprüft" aria-label="Neuer Eintrag">'
    +'<button type="button" class="secondary" onclick="vgVerlaufDazu()" data-ic="plus">Eintragen</button></div>';
}
function vgEditor(v){
  let t=vgT(v.typ), k=wzdKunde(v.kundeId), nx=vgNaechste(v), wvPh=(v.typ==='akquise'?'Nachfassen: ':'Nachfassen: ')+(wzdObjektName(v.projektId,'')||v.objektOrt||wzdKundeName(v.kundeId));
  let gl=k?((KD_GRUNDLAGEN.find(x=>x[0]===k.grundlage)||['',''])[1]+(k.einwilligungAm?' (Einwilligung vom '+wzDatum(k.einwilligungAm)+')':'')+' · '+ImmoWerbung.marke(k)):'';
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="vgZurueck()" data-ic="arrow-left">'+(v.typ==='akquise'?'Alle Kontakte':'Alle Anfragen')+'</button>'
      +'<span class="ub-status">'+sEsc(v.status)+(nx?' · Wiedervorlage '+wzDatum(nx.frist):'')+'</span>'
      +'<button type="button" class="secondary" onclick="vgLoeschen()" data-ic="trash">Löschen</button></div>'
    +wzBox(t.person,k?'<div class="kd-karte"><div><b>'+sEsc(kdName(k))+'</b><span>'+sEsc([k.telefon,k.email,[k.strasse,k.plzort].filter(Boolean).join(', ')].filter(Boolean).join(' · ')||'keine Kontaktdaten')+'</span>'
        +'<span>Rechtsgrundlage: '+sEsc(gl||'–')+'</span></div><div class="kd-k"><button class="secondary" onclick="kdOeffnen(\''+idSicher(k.id)+'\')">Akte'+(v.typ==='anfrage'?' und Suchprofil':'')+'</button></div></div>'
      :wzAmpel('gelb','Die Person ist nicht mehr in der Kundenakte.'))
    +wzBox(v.typ==='akquise'?'Kontakt':'Anfrage','<div class="grid">'
      +'<div class="field"><label for="vg_status">Status</label><select id="vg_status" onchange="vgStatusWahl(this.value)">'+t.status.map(s=>'<option'+(s===v.status?' selected':'')+'>'+sEsc(s)+'</option>').join('')+'</select></div>'
      +(v.status===t.abbruch?wzFeld('grund','Grund',{typ:'wahl',optionen:t.gruende.map(g=>[g,g||'–'])}):'')
      +wzFeld('datum','Eingang am',{typ:'datum'})+wzFeld('quelle','Quelle',{typ:'wahl',optionen:t.quellen.map(q=>[q,q])})
      +(v.typ==='akquise'?wzFeld('anlass','Anlass',{typ:'wahl',optionen:VG_ANLASS.map(a=>[a,a])})+wzFeld('objektArt','Objektart',{typ:'wahl',optionen:VG_ARTEN.map(a=>[a,a])})
        +wzFeld('objektOrt','Ort',{typ:'text'})+wzFeld('wert','Wert grob geschätzt',{typ:'betrag',einheit:'€'}):'')
      +'<div class="field"><label for="vg_objekt">'+(v.typ==='akquise'?'Bewertung dazu':'Objekt')+'</label><select id="vg_objekt" onchange="vgObjektWahl(this.value)">'+wzdObjektOptionen(v.projektId,v.typ==='akquise'?'– noch keine –':'– kein Objekt –')+'</select></div>'
      +wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true})+'</div>')
    +wzBox('Nächste Schritte','<div class="gr-zeile">'
      +(v.typ==='anfrage'?'<button type="button" class="secondary" onclick="vgExposeVersendet()" data-ic="file-text">Exposé versendet</button><button type="button" class="secondary" onclick="vgTermin()" data-ic="calendar">Besichtigung planen</button>'
        :'<button type="button" class="secondary" onclick="vgTermin()" data-ic="calendar">Termin planen</button><button type="button" class="secondary" onclick="vgBewertung()" data-ic="plus">Bewertung beginnen</button>')
      +'<button type="button" class="secondary" onclick="vgSchreiben()" data-ic="pen">Schreiben</button>'
      +(v.typ==='anfrage'&&v.projektId?'<button type="button" class="secondary" onclick="vgGebot()" data-ic="target">Gebot erfassen</button>':'')+'</div>'
      +'<div class="kd-neu"><input id="vg_wv_text" placeholder="'+sEsc(wvPh)+'" aria-label="Wiedervorlage"><input id="vg_wv_datum" type="date" value="'+ImmoBeratung.tagePlus(aufHeute(),3)+'" aria-label="Fällig am">'
      +'<button type="button" class="secondary" onclick="vgWiedervorlage()" data-ic="clock">Wiedervorlage</button></div>'
      +(nx?'<p class="hint" style="margin:8px 0 0">Nächste Wiedervorlage: '+wzDatum(nx.frist)+' — '+sEsc(nx.text)+'</p>':''))
    +wzBox('Verlauf',vgVerlaufHtml(v));
}
function vgGebot(){ let v=VG.aktiv; if(!v||!v.projektId) return; wzdSpeichernSofort('vorgaenge',v); biGebotFuer(v.projektId,v.kundeId); }

/* ---------- Übersichten ---------- */
function vgFilter(typ){
  let S=vgS(typ), t=vgT(typ);
  return vgListe(typ).filter(v=>(!S.objekt||v.projektId===S.objekt)&&(S.status==='alle'||(S.status==='offen'?vgOffen(v):v.status===S.status)))
    .sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')||(b.ts||0)-(a.ts||0));
}
function vgStatusSelect(v){
  let t=vgT(v.typ);
  return '<select aria-label="Status" onchange="vgStatusListe(\''+idSicher(v.id)+'\',this.value)">'+t.status.map(s=>'<option'+(s===v.status?' selected':'')+'>'+sEsc(s)+'</option>').join('')+'</select>';
}
function vgFilterLeiste(typ){
  let S=vgS(typ), t=vgT(typ);
  return '<div class="grid vg-filter">'+(typ==='anfrage'?'<div class="field"><label for="vg_f_objekt">Objekt</label><select id="vg_f_objekt" onchange="vgSetz(\'objekt\',this.value)">'+wzdObjektOptionen(S.objekt,'alle Objekte')+'</select></div>':'')
    +'<div class="field"><label for="vg_f_status">Status</label><select id="vg_f_status" onchange="vgSetz(\'status\',this.value)">'+[['offen','offen'],['alle','alle']].concat(t.status.map(s=>[s,s]))
      .map(([w,x])=>'<option value="'+sEsc(w)+'"'+(S.status===w?' selected':'')+'>'+sEsc(x)+'</option>').join('')+'</select></div></div>';
}
function vgListeHtml(typ){
  let l=vgFilter(typ), t=vgT(typ);
  return vgFilterLeiste(typ)+(l.length?'<div class="wz-tabwrap"><table class="nhk wz-tab vg-tab"><thead><tr><th>Eingang</th><th>'+t.person+'</th><th>'+(typ==='akquise'?'Objekt':'Objekt')+'</th><th>Quelle</th><th>Status</th><th>Wiedervorlage</th><th></th></tr></thead><tbody>'
    +l.map(v=>{ let nx=vgNaechste(v); return '<tr><td>'+wzDatum(v.datum)+'</td><td><b>'+sEsc(wzdKundeName(v.kundeId))+'</b><small>'+sEsc(wzdKundeKontakt(v.kundeId))+'</small></td>'
      +'<td>'+sEsc(typ==='akquise'?[v.objektArt,v.objektOrt].filter(Boolean).join(' in ')+(wzN(v.wert,true)>0?' · '+wzEur(wzN(v.wert,true)):''):wzdObjektName(v.projektId,'–'))+'</td><td>'+sEsc(v.quelle||'')+'</td>'
      +'<td>'+vgStatusSelect(v)+'</td><td>'+(nx?wzDatum(nx.frist):'–')+'</td><td class="wz-aktion"><button class="secondary" onclick="vgOeffnenId(\''+idSicher(v.id)+'\')">Öffnen</button></td></tr>'; }).join('')
    +'</tbody></table></div>':wzHinweis(vgListe(typ).length?'Keine Einträge für diesen Filter.':(typ==='akquise'?'Noch kein Eigentümer-Kontakt erfasst.':'Noch keine Anfrage erfasst.')));
}
/* Akquise als Spalten je Status (ohne „Kein Auftrag“) */
function vgPipeline(){
  let t=vgT('akquise'), S=vgS('akquise'), satz=wzN(S.satz)||0, alle=vgListe('akquise');
  let spalten=t.status.filter(s=>s!==t.abbruch).map(s=>{ let l=alle.filter(v=>v.status===s), summe=l.reduce((a,v)=>a+wzN(v.wert,true),0);
    return '<div class="vg-spalte"><h4>'+sEsc(s)+' <span class="u">'+l.length+'</span></h4><small>'+(summe>0?wzEur(summe)+' Objektwert · Provision '+wzEur(summe*satz/100):'')+'</small>'
      +l.map(v=>{ let nx=vgNaechste(v); return '<button type="button" class="vg-karte" onclick="vgOeffnenId(\''+idSicher(v.id)+'\')"><b>'+sEsc(wzdKundeName(v.kundeId))+'</b>'
        +'<span>'+sEsc([v.objektArt,v.objektOrt].filter(Boolean).join(' in '))+'</span>'+(wzN(v.wert,true)>0?'<span>'+wzEur(wzN(v.wert,true))+'</span>':'')
        +(nx?'<span class="vg-wv">Wiedervorlage '+wzDatum(nx.frist)+'</span>':'')+'</button>'; }).join('')+'</div>'; }).join('');
  let kein=alle.filter(v=>v.status===t.abbruch).length;
  return '<div class="vg-pipeline">'+spalten+'</div>'+(kein?'<p class="hint">'+kein+' Kontakt'+(kein===1?'':'e')+' ohne Auftrag — Liste mit Filter „Kein Auftrag“.</p>':'')
    +'<div class="grid" style="max-width:340px">'+'<div class="field"><label for="vg_satz">Provisionssatz Verkäufer <span class="u">% inkl. USt</span></label><input id="vg_satz" inputmode="decimal" value="'+sEsc(S.satz||'')+'" onchange="vgSetz(\'satz\',this.value)"></div></div>';
}
/* Abgleich: Suchprofile × Objekte in Vermarktung, ohne Kunden, die zu diesem Objekt schon eine Anfrage haben */
function vgAbgleichDaten(){
  let anfragen=vgListe('anfrage');
  return wzdObjekte(false).map(o=>{ let obj=kkObjekt(o.f,o.empf), tr=kkTreffer(obj).filter(x=>!anfragen.some(v=>v.kundeId===x.k.id&&v.projektId===o.id)&&x.k.id!==o.kundeId);
    return {o,obj,tr}; }).filter(x=>x.tr.length);
}
function vgAbgleich(){
  let d=vgAbgleichDaten(), mitProfil=KD_CACHE.filter(k=>k.suchprofil&&k.suchprofil.aktiv).length;
  if(!wzdObjekte(false).length) return wzHinweis('Keine Objekte in Vermarktung — der Abgleich nimmt gesicherte Bewertungen mit Stand „Auftrag erteilt“, „In Vermarktung“, „Reserviert“ oder „Notartermin“.');
  if(!mitProfil) return wzHinweis('Noch kein Suchprofil — Suchprofile legst du in der Kundenakte beim Interessenten an.');
  return wzHinweis(mitProfil+' Suchprofil'+(mitProfil===1?'':'e')+' mit '+wzdObjekte(false).length+' Objekt'+(wzdObjekte(false).length===1?'':'en')+' abgeglichen. Gezeigt werden Treffer ohne Anfrage zu diesem Objekt.')
    +(d.length?d.map(x=>wzBox(sEsc(x.o.name)+' <span class="u">'+x.tr.length+' Treffer</span>','<div class="kd-karten">'+x.tr.map(y=>{ let k=y.k, ein=ImmoWerbung.darfEmail(k).ok||ImmoWerbung.darfTelefon(k).ok;
      return '<div class="kd-karte"><div><b>'+sEsc(kdName(k))+' <span class="kk-stufe '+y.t.stufe+'">'+(y.t.stufe==='passt'?'passt':'passt fast')+'</span></b>'
        +'<span>'+sEsc([kkFinanzText(k.suchprofil),k.telefon,k.email].filter(Boolean).join(' · ')+(y.t.ab.length?' — '+y.t.ab.join(', '):''))+'</span>'
        +'<span class="'+(ein?'vg-ok':'vg-warn')+'">'+(ein?'Werbung erlaubt: '+[ImmoWerbung.darfEmail(k).ok?'E-Mail':'',ImmoWerbung.darfTelefon(k).ok?'Telefon':''].filter(Boolean).join(', '):ImmoWerbung.norm(k).widerspruch.am?'Werbesperre — nicht ansprechen':'ohne Einwilligung — nur, wenn er um Angebote gebeten hat')+'</span></div>'
        +'<div class="kd-k"><button class="secondary" onclick="vgAusAbgleich(\''+idSicher(x.o.id)+'\',\''+idSicher(k.id)+'\')">Als Anfrage übernehmen</button>'
        +'<button class="secondary" onclick="kdOeffnen(\''+idSicher(k.id)+'\')">Akte</button></div></div>'; }).join('')+'</div>')).join('')
      :wzAmpel('gruen','Keine neuen Treffer: Jeder passende Interessent hat schon eine Anfrage zu seinem Objekt.'))
    +wzHinweis('Ansprache: Werbende Anrufe und E-Mails an Verbraucher nur mit Einwilligung (§ 7 UWG). Wer selbst um passende Angebote gebeten hat, bekommt sie im Rahmen seiner Anfrage.');
}
async function vgAusAbgleich(pid,kid){
  let o=wzdObjekt(pid); if(!o) return;
  let v={id:wzdId('v'),typ:'anfrage',datum:aufHeute(),kundeId:kid,projektId:pid,quelle:'Suchprofil (Abgleich)',status:'Neu',stufe:0,abgesagt:false,grund:'',notiz:'',
    verlauf:[{id:wzdId('h'),datum:aufHeute(),text:'Aus dem Abgleich mit dem Suchprofil übernommen'}]};
  if(await wzdSpeichern('vorgaenge',v)){ VG.aktiv=v; wzZeichnen(); $('wz_overlay').scrollTop=0; }
}
function vgZahlen(typ){
  let t=vgT(typ), l=vgListe(typ), stufen=t.status.filter(s=>s!==t.abbruch);
  if(!l.length) return wzHinweis('Noch keine Daten für eine Auswertung.');
  const tab=(rows,kopf)=>'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>'+kopf+'</th><th>Anzahl</th>'+stufen.slice(1).map(s=>'<th>'+sEsc(s)+'</th>').join('')+'<th>'+sEsc(t.abbruch)+'</th></tr></thead><tbody>'
    +rows.map(r=>'<tr><td>'+sEsc(r.name||r.gruppe)+'</td><td class="r">'+r.anzahl+'</td>'+r.stufen.slice(1).map(n=>'<td class="r">'+n+' <small>'+Math.round(n/r.anzahl*100)+' %</small></td>').join('')
      +'<td class="r">'+r.abgesagt+'</td></tr>').join('')+'</tbody></table></div>';
  let qu=ImmoBeratung.trichter(l,stufen,'quelle');
  let ob=typ==='anfrage'?ImmoBeratung.trichter(l.map(v=>Object.assign({},v,{obj:wzdObjektName(v.projektId,'ohne Objekt')})),stufen,'obj'):null;
  let gr={}; l.filter(v=>v.abgesagt&&v.grund).forEach(v=>{ gr[v.grund]=(gr[v.grund]||0)+1; });
  return wzBox('Nach Quelle',tab(qu,'Quelle')+wzHinweis('Je Spalte: wie viele '+(typ==='akquise'?'Kontakte':'Anfragen')+' diese Stufe mindestens erreicht haben — so zeigt sich, welche Quelle zum Abschluss führt.'))
    +(ob?wzBox('Nach Objekt',tab(ob,'Objekt')):'')
    +(Object.keys(gr).length?wzBox(typ==='akquise'?'Gründe ohne Auftrag':'Absagegründe','<div class="wz-tabwrap"><table class="nhk wz-tab"><tbody>'+Object.entries(gr).sort((a,b)=>b[1]-a[1]).map(([g,n])=>'<tr><td>'+sEsc(g)+'</td><td class="r">'+n+'</td></tr>').join('')+'</tbody></table></div>'):'');
}
function vgZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(['interessenten','akquise'].includes(WZ.aktiv)) wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(VG.neu) return vgNeuHtml(VG.neu);
  if(VG.aktiv) return vgEditor(VG.aktiv);
  let typ=vgTyp(), S=vgS(typ), l=vgListe(typ), h=aufHeute(), woche=ImmoBeratung.tagePlus(h,-7), t=vgT(typ);
  let ansichten=typ==='akquise'?[['pipeline','Übersicht'],['liste','Liste'],['zahlen','Auswertung']]:[['liste','Anfragen'],['abgleich','Abgleich'],['zahlen','Auswertung']];
  if(!ansichten.some(a=>a[0]===S.ansicht)) S.ansicht=ansichten[0][0];
  let kpi=typ==='akquise'
    ?wzdKpi('Offene Kontakte',l.filter(vgOffen).length,'')+wzdKpi('Aufträge',l.filter(v=>v.status===t.ziel).length,'')+wzdKpi('Neu in 7 Tagen',l.filter(v=>v.datum>=woche).length,'')
      +wzdKpi('Auftragsquote',l.filter(v=>!vgOffen(v)).length?Math.round(l.filter(v=>v.status===t.ziel).length/l.filter(v=>!vgOffen(v)).length*100)+' %':'–','der abgeschlossenen Kontakte')
    :wzdKpi('Offene Anfragen',l.filter(vgOffen).length,'')+wzdKpi('Neu in 7 Tagen',l.filter(v=>v.datum>=woche).length,'')+wzdKpi('Besichtigung erreicht',l.filter(v=>(+v.stufe||0)>=3).length,'')
      +wzdKpi('Treffer im Abgleich',vgAbgleichDaten().reduce((a,x)=>a+x.tr.length,0),'ohne Anfrage');
  return '<div class="wz-kpis grid">'+kpi+'</div>'
    +'<div class="ka-leiste"><div class="ka-schalter" role="group" aria-label="Ansicht">'+ansichten.map(([k,txt])=>'<button type="button" class="'+(S.ansicht===k?'primary':'secondary')+'" aria-pressed="'+(S.ansicht===k)+'" onclick="vgSetz(\'ansicht\',\''+k+'\')">'+txt+'</button>').join('')+'</div>'
    +'<button type="button" class="primary" onclick="vgNeuEntwurf(\''+typ+'\')" data-ic="plus">'+(typ==='akquise'?'Neuer Kontakt':'Neue Anfrage')+'</button></div>'
    +(S.ansicht==='pipeline'?vgPipeline():S.ansicht==='abgleich'?vgAbgleich():S.ansicht==='zahlen'?vgZahlen(typ):vgListeHtml(typ));
}
function vgRechnen(){ iconify($('wz_body')); }
function vgDokument(){
  let typ=vgTyp(), t=vgT(typ), l=vgListe(typ), stufen=t.status.filter(s=>s!==t.abbruch);
  if(!l.length){ alert('Noch keine Einträge.'); return null; }
  let rows=typ==='anfrage'?ImmoBeratung.trichter(l.map(v=>Object.assign({},v,{obj:wzdObjektName(v.projektId,'ohne Objekt')})),stufen,'obj'):ImmoBeratung.trichter(l,stufen,'quelle');
  return {titel:(typ==='akquise'?'Akquise ':'Interessenten ')+new Date().toLocaleDateString('de-DE'),
    html:'<h1>'+(typ==='akquise'?'Akquise — Übersicht':'Interessenten — Übersicht je Objekt')+'</h1><p class="wzd-unter">Stand '+new Date().toLocaleDateString('de-DE')+' · ohne Namen</p>'
      +wzDokTabelle(rows.map(r=>[sEsc(r.gruppe),String(r.anzahl)].concat(r.stufen.slice(1).map(String),[String(r.abgesagt)])),[typ==='akquise'?'Quelle':'Objekt','Anzahl'].concat(stufen.slice(1),[t.abbruch]))
      +wzDokTabelle(ImmoBeratung.trichter(l,stufen,'quelle').map(r=>[sEsc(r.gruppe),String(r.anzahl),String(r.stufen[r.stufen.length-1])]),['Quelle','Anzahl',t.ziel]),
    fuss:'Übersicht ohne personenbezogene Angaben.'};
}
const VG_REG={zustand:()=>VG.neu||VG.aktiv,speichern:vgSpeichern,zeichnen:vgZeichnen,rechnen:vgRechnen,dokument:vgDokument,ohneNeu:true,
  schliessen:()=>{ if(VG.aktiv) wzdSpeichernSofort('vorgaenge',VG.aktiv); VG.aktiv=null; VG.neu=null; }};
wzRegistrieren(Object.assign({id:'interessenten',titel:'Interessenten',sub:'Anfragen, Besichtigungen, Abgleich mit Suchprofilen',icon:'inbox'},VG_REG));
wzRegistrieren(Object.assign({id:'akquise',titel:'Akquise',sub:'Eigentümer vom ersten Kontakt bis zum Auftrag',icon:'sign'},VG_REG));
