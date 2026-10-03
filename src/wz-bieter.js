/* ---------- Kachel „Bieterverfahren“ (D40) ----------
   Angebotsverfahren für gefragte Objekte: Frist, Mindestgebot und Regeln festlegen, Gebote mit Finanzierungsstand und
   Bedingungen erfassen, Rangfolge mit Abstand zum Angebotspreis (js/beratung.js, bieterRang), Übersicht für den Eigentümer
   ohne Namen der Bieter. Gebote sind unverbindlich — der Kauf wird erst mit dem notariellen Vertrag wirksam (§ 311b Abs. 1
   BGB), der Eigentümer entscheidet frei. Speicher „bieter“ in der Datenbank; Bieter stehen in der Kundenakte. */
var BI={aktiv:null,neu:null,gebotNeu:null};
const BI_STATUS=[['vorbereitung','In Vorbereitung'],['laufend','Läuft'],['beendet','Beendet']];
const BI_FINANZ=['Finanzierungsbestätigung liegt vor','Finanzierung in Prüfung','ohne Nachweis','Kauf ohne Finanzierung'];
const BI_GEBOT_STATUS=['gültig','zurückgezogen','abgelehnt','angenommen'];
const BI_REGELN='Gebote bitte schriftlich (E-Mail genügt) bis zum Ende der Frist, mit Angaben zur Finanzierung (Bestätigung der Bank) und zu Bedingungen. '
  +'Gebote sind unverbindlich. Der Eigentümer entscheidet frei und muss nicht an den Höchstbietenden verkaufen. Wirksam wird der Kauf erst mit dem notariellen Kaufvertrag.';
function biStatusName(s){ return (BI_STATUS.find(x=>x[0]===s)||BI_STATUS[0])[1]; }
function biListe(){ return wzdListe('bieter').slice().sort((a,b)=>(a.status==='beendet')-(b.status==='beendet')||(a.ende||'').localeCompare(b.ende||'')); }
function biPreis(b){ let o=wzdObjekt(b.projektId); return o?o.preis:0; }
function biRang(b){ return ImmoBeratung.bieterRang(b.gebote,biPreis(b)); }
function biGebotLeer(kundeId){ return {modus:kundeId?'akte':'neu',kundeId:kundeId||'',anrede:'',vorname:'',nachname:'',telefon:'',email:'',betrag:'',datum:aufHeute(),zeit:'',finanzierung:BI_FINANZ[0],bedingungen:''}; }

/* ---------- Verfahren anlegen und öffnen ---------- */
function biNeuEntwurf(projektId){ BI.aktiv=null; BI.gebotNeu=null; BI.neu={projektId:projektId||'',ende:ImmoBeratung.tagePlus(aufHeute(),14),endeZeit:'18:00',mindestgebot:''}; wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function biNeuAnlegen(){
  let n=BI.neu; if(!n) return;
  if(!n.projektId){ alert('Bitte das Objekt wählen.'); return; }
  if(!wzdDatum(n.ende)){ alert('Bitte die Frist mit einem gültigen Datum eintragen.'); return; }
  let b={id:wzdId('b'),projektId:n.projektId,objekt:wzdObjektName(n.projektId,''),start:aufHeute(),ende:n.ende,endeZeit:wzdZeit(n.endeZeit),mindestgebot:n.mindestgebot||'',
    regeln:BI_REGELN,status:'laufend',gebote:[]};
  if(!(await wzdSpeichern('bieter',b))) return;
  BI.neu=null; BI.aktiv=b; wzZeichnen();
}
async function biOeffnen(id){ await wzdLaden(); let b=wzdListe('bieter').find(x=>x.id===id); if(!b) return; BI.neu=null; BI.gebotNeu=null; BI.aktiv=b; if(WZ.aktiv==='bieter') wzZeichnen(); $('wz_overlay').scrollTop=0; }
/* aus den Interessenten: Gebot zu einem Objekt erfassen (Verfahren suchen oder anlegen) */
async function biGebotFuer(projektId,kundeId){
  wzOeffnen('bieter'); await wzdLaden();
  let b=wzdListe('bieter').find(x=>x.projektId===projektId&&x.status!=='beendet');
  if(!b){ if(!confirm('Für dieses Objekt läuft noch kein Bieterverfahren. Jetzt eines anlegen?')) return; biNeuEntwurf(projektId); return; }
  BI.neu=null; BI.aktiv=b; BI.gebotNeu=biGebotLeer(kundeId); wzZeichnen();
}
function biZurueck(){ if(BI.aktiv) wzdSpeichernSofort('bieter',BI.aktiv); BI.aktiv=null; BI.neu=null; BI.gebotNeu=null; wzZeichnen(); }
async function biLoeschen(){
  let b=BI.aktiv; if(!b||!confirm('Dieses Bieterverfahren mit allen Geboten löschen? Die Bieter bleiben in der Kundenakte.')) return;
  if(await wzdLoeschen('bieter',b.id)){ BI.aktiv=null; wzZeichnen(); }
}
function biSpeichern(){ if(BI.aktiv&&!BI.neu) wzdSpeichernBald('bieter',BI.aktiv); }

/* ---------- Gebote ---------- */
function biGebotNeu(){ BI.gebotNeu=biGebotLeer(''); wzZeichnen(); }
function biGebotKunde(){ wzdKundeWaehlen(id=>{ if(!BI.gebotNeu) return; BI.gebotNeu.kundeId=id; BI.gebotNeu.modus='akte'; wzZeichnen(); }); }
async function biGebotAnlegen(){
  let b=BI.aktiv, g=BI.gebotNeu; if(!b||!g) return;
  let betrag=wzN(g.betrag,true); if(!(betrag>0)){ alert('Bitte den gebotenen Betrag eintragen.'); return; }
  let kid=g.modus==='akte'?g.kundeId:'';
  if(g.modus==='akte'&&!kid){ alert('Bitte den Bieter aus der Kundenakte wählen.'); return; }
  if(!kid){ let k=await wzdKundeNeu(g); if(!k) return; kid=k.id; }
  b.gebote.push({id:wzdId('g'),kundeId:kid,betrag,datum:wzdDatum(g.datum)||aufHeute(),zeit:wzdZeit(g.zeit),finanzierung:g.finanzierung,bedingungen:(g.bedingungen||'').trim(),status:'gültig'});
  BI.gebotNeu=null; await wzdSpeichern('bieter',b); wzZeichnen();
}
async function biGebotStatus(gid,status){ let b=BI.aktiv; if(!b) return; let g=b.gebote.find(x=>x.id===gid); if(!g) return; g.status=status; await wzdSpeichern('bieter',b); wzZeichnen(); }
async function biGebotWeg(gid){ let b=BI.aktiv; if(!b||!confirm('Dieses Gebot löschen?')) return; b.gebote=b.gebote.filter(x=>x.id!==gid); await wzdSpeichern('bieter',b); wzZeichnen(); }
function biWiedervorlage(){
  let b=BI.aktiv; if(!b) return;
  if(!wzdDatum(b.ende)){ alert('Bitte zuerst die Frist eintragen.'); return; }
  if(wzdWiedervorlage('Bieterverfahren '+wzdObjektName(b.projektId,b.objekt)+': Frist endet'+(b.endeZeit?' um '+b.endeZeit+' Uhr':'')+' — Gebote dem Eigentümer vorlegen',b.ende,wzdObjektName(b.projektId,b.objekt),''))
    alert('Wiedervorlage zum Ende der Frist angelegt.');
}

/* ---------- Ansicht ---------- */
function biListeHtml(){
  let l=biListe();
  return '<div class="ka-leiste"><button type="button" class="primary" onclick="biNeuEntwurf()" data-ic="plus">Neues Bieterverfahren</button></div>'
    +(l.length?'<div class="kd-karten">'+l.map(b=>{ let r=biRang(b), h=r[0];
      return '<div class="kd-karte"><div><b>'+sEsc(wzdObjektName(b.projektId,b.objekt||'Objekt'))+'</b><span>'+sEsc([biStatusName(b.status),'Frist '+wzDatum(b.ende)+(b.endeZeit?' '+b.endeZeit+' Uhr':''),
        r.length+' Gebot'+(r.length===1?'':'e'),h?'höchstes '+wzEur(h.betrag):''].join(' · '))+'</span></div>'
        +'<div class="kd-k"><button class="secondary" onclick="biOeffnen(\''+idSicher(b.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>'
      :wzHinweis('Noch kein Bieterverfahren. Es eignet sich, wenn viele ernsthafte Interessenten da sind: Frist setzen, Gebote sammeln, dem Eigentümer eine Übersicht vorlegen.'))
    +wzHinweis('Gebote sind unverbindlich — wirksam wird der Kauf erst mit dem notariellen Kaufvertrag (§ 311b Abs. 1 BGB). Die Übersicht für den Eigentümer nennt keine Namen.');
}
function biNeuHtml(n){
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="biZurueck()" data-ic="arrow-left">Abbrechen</button><span class="ub-status">Neues Bieterverfahren</span>'
      +'<button type="button" class="primary" onclick="biNeuAnlegen()" data-ic="check">Anlegen</button></div>'
    +wzBox('Verfahren','<div class="grid"><div class="field"><label for="bi_neu_objekt">Objekt</label><select id="bi_neu_objekt" onchange="BI.neu.projektId=this.value">'+wzdObjektOptionen(n.projektId,'– Objekt wählen –')+'</select></div>'
      +wzFeld('ende','Gebote bis (Datum)',{typ:'datum'})+wzFeld('endeZeit','Uhrzeit',{typ:'text',ph:'z. B. 18:00'})+wzFeld('mindestgebot','Mindestgebot (optional)',{typ:'betrag',einheit:'€'})+'</div>'
      +wzHinweis('Die Regeln für die Bieter lassen sich nach dem Anlegen anpassen.'));
}
/* Felder des neuen Gebots: eigene Bindung an BI.gebotNeu (die Felder des Verfahrens daneben schreiben in BI.aktiv) */
function biGF(feld,label,o){
  o=o||{}; let g=BI.gebotNeu||{}, w=g[feld]==null?'':String(g[feld]), id='bi_g_'+feld, ein=' oninput="BI.gebotNeu.'+feld+'=this.value" onchange="BI.gebotNeu.'+feld+'=this.value"';
  let f=o.optionen?'<select id="'+id+'"'+ein+'>'+o.optionen.map(([v,t])=>'<option value="'+sEsc(v)+'"'+(v===w?' selected':'')+'>'+sEsc(t)+'</option>').join('')+'</select>'
    :'<input id="'+id+'"'+(o.datum?' type="date"':'')+(o.zahl?' inputmode="decimal"':'')+' value="'+sEsc(w)+'"'+(o.ph?' placeholder="'+sEsc(o.ph)+'"':'')+ein+'>';
  return '<div class="field'+(o.voll?' full':'')+'"><label for="'+id+'">'+label+(o.einheit?' <span class="u">'+o.einheit+'</span>':'')+'</label>'+f+'</div>';
}
function biGebotForm(g){
  return wzBox('Neues Gebot','<div class="vg-modus" role="group" aria-label="Bieter">'+[['neu','Neu erfassen'],['akte','Aus der Kundenakte']].map(([m,t])=>'<button type="button" class="'+(g.modus===m?'primary':'secondary')+'" aria-pressed="'+(g.modus===m)+'" onclick="BI.gebotNeu.modus=\''+m+'\';wzZeichnen()">'+t+'</button>').join('')+'</div>'
    +(g.modus==='akte'?(g.kundeId?'<div class="kd-karte"><div><b>'+sEsc(wzdKundeName(g.kundeId))+'</b><span>'+sEsc(wzdKundeKontakt(g.kundeId))+'</span></div><div class="kd-k"><button class="secondary" onclick="biGebotKunde()">Ändern</button></div></div>'
        :'<button type="button" class="secondary" onclick="biGebotKunde()" data-ic="users">Bieter aus der Kundenakte wählen</button>')
      :'<div class="grid">'+biGF('anrede','Anrede',{optionen:[['',''],['Frau','Frau'],['Herr','Herr'],['Divers','Divers'],['Firma','Firma']]})+biGF('vorname','Vorname')
        +biGF('nachname','Nachname')+biGF('telefon','Telefon')+biGF('email','E-Mail')+'</div>')
    +'<div class="grid" style="margin-top:8px">'+biGF('betrag','Gebot',{zahl:true,einheit:'€'})+biGF('datum','Eingang am',{datum:true})+biGF('zeit','Uhrzeit',{ph:'z. B. 14:30'})
      +biGF('finanzierung','Finanzierung',{optionen:BI_FINANZ.map(f=>[f,f])})+biGF('bedingungen','Bedingungen',{voll:true,ph:'z. B. Übergabe frühestens zum 1. März, Einbauküche bleibt'})+'</div>'
    +'<div class="gr-zeile"><button type="button" class="primary" onclick="biGebotAnlegen()" data-ic="check">Gebot eintragen</button><button type="button" class="secondary" onclick="BI.gebotNeu=null;wzZeichnen()">Abbrechen</button></div>');
}
function biEditor(b){
  let r=biRang(b), preis=biPreis(b), min=wzN(b.mindestgebot,true), alle=b.gebote.slice().sort((a,c)=>(a.datum||'').localeCompare(c.datum||''));
  let h=r[0], fristText=wzdDatum(b.ende)?wzDatum(b.ende)+(b.endeZeit?', '+b.endeZeit+' Uhr':''):'–';
  let rest=wzdDatum(b.ende)?ImmoBeratung.tageZwischen(aufHeute(),b.ende):null;
  let zeilen=alle.map(g=>{ let x=r.find(y=>y.id===g.id);
    return '<tr'+(x&&x.rang===1?' class="bi-erstes"':'')+'><td class="r">'+(x?x.rang:'–')+'</td><td><b>'+sEsc(wzdKundeName(g.kundeId))+'</b><small>'+sEsc(wzdKundeKontakt(g.kundeId))+'</small></td>'
      +'<td class="r">'+wzEur(g.betrag)+(x&&x.abstandPreis!=null?'<small>'+(x.abstandPreis>=0?'+':'')+wzP(x.abstandPreis,1)+' zum Angebot</small>':'')+(min>0&&g.betrag<min?'<small class="vg-warn">unter Mindestgebot</small>':'')+'</td>'
      +'<td>'+wzDatum(g.datum)+(g.zeit?' '+sEsc(g.zeit):'')+'</td><td>'+sEsc(g.finanzierung||'')+(g.bedingungen?'<small>'+sEsc(g.bedingungen)+'</small>':'')+'</td>'
      +'<td><select aria-label="Status des Gebots" onchange="biGebotStatus(\''+idSicher(g.id)+'\',this.value)">'+BI_GEBOT_STATUS.map(s=>'<option'+(s===(g.status||'gültig')?' selected':'')+'>'+s+'</option>').join('')+'</select></td>'
      +'<td class="wz-aktion"><button class="secondary" onclick="biGebotWeg(\''+idSicher(g.id)+'\')" aria-label="Gebot löschen" data-ic="trash"></button></td></tr>'; }).join('');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="biZurueck()" data-ic="arrow-left">Alle Verfahren</button>'
      +'<span class="ub-status">'+sEsc(biStatusName(b.status))+' · Frist '+sEsc(fristText)+(rest!=null&&b.status!=='beendet'?(rest>=0?' (noch '+rest+' Tag'+(rest===1?'':'e')+')':' (abgelaufen)'):'')+'</span>'
      +'<button type="button" class="secondary" onclick="biLoeschen()" data-ic="trash">Löschen</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Gebote',r.length,b.gebote.length-r.length?(b.gebote.length-r.length)+' zurückgezogen oder abgelehnt':'')
      +wzdKpi('Höchstgebot',h?wzEur(h.betrag):'–',h&&h.abstandPreis!=null?(h.abstandPreis>=0?'+':'')+wzP(h.abstandPreis,1)+' zum Angebotspreis':'')
      +wzdKpi('Angebotspreis',preis>0?wzEur(preis):'–',min>0?'Mindestgebot '+wzEur(min):'')
      +wzdKpi('Abstand zum zweiten',r.length>1?wzP(-r[1].abstandErstes,1):'–',r.length>1?wzEur(r[0].betrag-r[1].betrag):'')+'</div>'
    +wzBox('Verfahren','<div class="grid"><div class="field"><label>Objekt</label><div class="vl-empf"><b>'+sEsc(wzdObjektName(b.projektId,b.objekt||'–'))+'</b></div></div>'
      +wzFeld('status','Stand',{typ:'wahl',optionen:BI_STATUS,zeichnen:true})+wzFeld('ende','Gebote bis',{typ:'datum',zeichnen:true})+wzFeld('endeZeit','Uhrzeit',{typ:'text'})
      +wzFeld('mindestgebot','Mindestgebot',{typ:'betrag',einheit:'€'})+wzFeld('regeln','Regeln für die Bieter',{typ:'lang',zeilen:4,voll:true})+'</div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="biWiedervorlage()" data-ic="clock">Wiedervorlage zur Frist</button>'
      +'<button type="button" class="secondary" onclick="biRegelnKopieren()" data-ic="clipboard">Regeln kopieren</button></div>')
    +(BI.gebotNeu?biGebotForm(BI.gebotNeu):'')
    +wzBox('Gebote',(zeilen?'<div class="wz-tabwrap"><table class="nhk wz-tab bi-tab"><thead><tr><th>Rang</th><th>Bieter</th><th>Gebot</th><th>Eingang</th><th>Finanzierung</th><th>Status</th><th></th></tr></thead><tbody>'+zeilen+'</tbody></table></div>'
        :'<p class="hint" style="margin:0 0 8px">Noch kein Gebot.</p>')
      +(BI.gebotNeu?'':'<button type="button" class="plus" onclick="biGebotNeu()">＋ Gebot</button>'));
}
function biRegelnKopieren(){ let b=BI.aktiv; if(!b) return; try{ navigator.clipboard.writeText(b.regeln||BI_REGELN).then(()=>{ iaHinweis('Regeln kopiert'); setTimeout(()=>iaHinweis(''),1800); }); }catch(e){} }
function biZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='bieter') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(BI.neu) return biNeuHtml(BI.neu);
  return BI.aktiv?biEditor(BI.aktiv):biListeHtml();
}
function biRechnen(){ iconify($('wz_body')); }
function biDokument(){
  let b=BI.aktiv; if(!b){ alert('Bitte zuerst ein Verfahren öffnen.'); return null; }
  let r=biRang(b), preis=biPreis(b), name=wzdObjektName(b.projektId,b.objekt||'Objekt');
  const bieter=i=>'Bieter '+String.fromCharCode(65+(i%26))+(i>=26?Math.floor(i/26):'');
  return {titel:'Gebotsübersicht '+name,
    html:'<h1>Gebotsübersicht</h1><p class="wzd-unter">'+sEsc(name)+' · Frist '+(wzdDatum(b.ende)?wzDatum(b.ende)+(b.endeZeit?', '+sEsc(b.endeZeit)+' Uhr':''):'–')+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +(preis>0?'<p>Angebotspreis: '+wzEur(preis)+(wzN(b.mindestgebot,true)>0?' · Mindestgebot: '+wzEur(wzN(b.mindestgebot,true)):'')+'</p>':'')
      +(r.length?wzDokTabelle(r.map((g,i)=>[String(g.rang),bieter(i),wzEur(g.betrag),g.abstandPreis!=null?(g.abstandPreis>=0?'+':'')+wzP(g.abstandPreis,1):'–',
          wzDatum(g.datum)+(g.zeit?' '+sEsc(g.zeit):''),sEsc(g.finanzierung||''),sEsc(g.bedingungen||'–')]),['Rang','Bieter','Gebot','zum Angebot','Eingang','Finanzierung','Bedingungen']):'<p>Noch kein gültiges Gebot.</p>')
      +'<p class="wzd-klein">Die Gebote sind unverbindlich. Der Eigentümer entscheidet frei; wirksam wird der Kauf erst mit dem notariellen Kaufvertrag (§ 311b Abs. 1 BGB). Die Namen der Bieter nennt Ihnen Ihr Berater bei der Entscheidung.</p>',
    fuss:'Übersicht ohne Namen der Bieter.'};
}
wzRegistrieren({id:'bieter',titel:'Bieterverfahren',sub:'Gebote sammeln, vergleichen, dem Eigentümer vorlegen',icon:'trending-up',ohneNeu:true,
  zustand:()=>BI.neu||BI.aktiv,speichern:biSpeichern,zeichnen:biZeichnen,rechnen:biRechnen,dokument:biDokument,
  schliessen:()=>{ if(BI.aktiv) wzdSpeichernSofort('bieter',BI.aktiv); BI.aktiv=null; BI.neu=null; BI.gebotNeu=null; }});
