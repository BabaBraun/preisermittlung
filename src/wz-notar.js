/* ---------- Kachel „Notarauftrag“ (D39) ----------
   Alles, was das Notariat für den Entwurf des Kaufvertrags braucht, an einer Stelle: Objekt und Grundbuch, Verkäufer und
   Käufer, Kaufpreis mit beweglichen Gegenständen, Finanzierung, Besitzübergang, Mietverhältnisse, Belastungen,
   Maklerprovision, Notariat und Wunschtermin. Daraus: Datenblatt für das Notariat (PDF, Word), Termin als Kalenderdatei,
   Wiedervorlagen und zum Besitzübergang das Übergabeprotokoll mit den Namen der Beteiligten.
   Die Aufträge enthalten Namen und Anschriften — Datenbank auf dem Gerät (Speicher „notar“), einzeln löschbar, Teil der
   Gesamtsicherung. Geburtsdaten und Steuer-Identifikationsnummern erhebt das Notariat selbst (Anzeige nach § 20 GrEStG);
   sie gehören nicht in die App. Am Wortlaut geprüft: § 17 Abs. 2a BeurkG, §§ 656b–656d und 1365 BGB, § 12 WEG. */
var NO={liste:null,aktiv:null,timer:null};
const NO_STAENDE=['Entwurf','An das Notariat übermittelt','Vertragsentwurf liegt vor','Beurkundet','Erledigt'];
const NO_ARTEN=['Einfamilienhaus (auch Doppel- oder Reihenhaus)','Wohnung','Mehrfamilienhaus','Grundstück','Gewerbe oder gemischt genutzt'];
const NO_FAMILIE=['','ledig','verheiratet','eingetragene Lebenspartnerschaft','geschieden','verwitwet'];
const NO_GUETER=['','Zugewinngemeinschaft (gesetzlich)','Gütertrennung','Gütergemeinschaft','anderer oder ausländischer Güterstand'];
const NO_ERWERB=['','Alleineigentum','Miteigentum je zur Hälfte','Miteigentum zu anderen Anteilen','Gesellschaft bürgerlichen Rechts'];
const NO_UNTERLAGEN=['Energieausweis','Grundrisse und Wohnflächenberechnung','Baulastenauskunft','Finanzierungsbestätigung des Käufers',
  'Gläubiger der Grundschulden (Abt. III) für die Löschung'];
const NO_UNTERLAGEN_WEG=['Teilungserklärung mit Aufteilungsplan','Protokolle der Eigentümerversammlungen (letzte drei Jahre)',
  'Wirtschaftsplan und letzte Hausgeldabrechnung','Bescheinigung der Verwaltung (Hausgeld, Rücklage, Rückstände)'];
const NO_ROLLEN=[['verkaeufer','Verkäufer'],['kaeufer','Käufer']];
/* nur echte Kalenderdaten: ein Datumsfeld kann je nach Browser und Eingabe auch Unfertiges liefern */
function noDatum(x){ x=String(x||''); return /^\d{4}-\d{2}-\d{2}$/.test(x)&&isFinite(new Date(x+'T00:00:00'))?x:''; }
function noPerson(){ return {kundeId:'',name:'',anschrift:'',telefon:'',email:'',familienstand:'',gueterstand:''}; }
function noLeer(){
  return {id:'no'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),ts:Date.now(),geaendert:Date.now(),stand:'Entwurf',projekt:'',kundeId:'',
    anschrift:'',art:NO_ARTEN[0],grundbuch:'',blatt:'',flurstuecke:'',flaeche:'',mea:'',wohnungNr:'',sondernutzung:'',verwaltung:'',zustimmung:'unbekannt',
    verkaeufer:[noPerson()],kaeufer:[noPerson()],erwerb:'',kaeuferVerbraucher:'ja',verkaeuferUnternehmer:false,
    kaufpreis:'',inventar:'',inventarListe:'',faelligkeit:'nach Mitteilung des Notariats, dass die üblichen Voraussetzungen vorliegen',
    finanzierung:'ja',bank:'',darlehen:'',grundschuld:'ja',bestaetigung:'',
    uebergabeDatum:'',uebergabeRegel:'nach vollständiger Zahlung des Kaufpreises',raeumung:'geräumt',
    vermietet:'nein',mietverhaeltnisse:'',kaltmiete:'',kautionen:'',
    abt2:'',abt2Uebernahme:'',abt3:'',abt3Loeschung:'ja',baulasten:'',erschliessung:'',
    provKaeufer:'',provVerkaeufer:'',
    notar:'',notarOrt:'',termin:'',uhrzeit:'',entwurfAn:'Verkäufer, Käufer und die finanzierende Bank des Käufers',
    sonstiges:'',eaUebergeben:'',unterlagen:NO_UNTERLAGEN.map(n=>({name:n,ok:false}))};
}
async function noLaden(){
  await IA_BEREIT_P;
  if(!IA_DB_BEREIT){ NO.liste=[]; return; }
  try{ NO.liste=(await iaAlle('notar')).sort((a,b)=>(a.stand==='Erledigt')-(b.stand==='Erledigt')||(b.termin||'').localeCompare(a.termin||'')||(b.ts||0)-(a.ts||0)); }catch(e){ NO.liste=[]; }
}
function noSpeichernBald(){ if(!NO.aktiv) return; NO.aktiv.geaendert=Date.now(); clearTimeout(NO.timer); NO.timer=setTimeout(noSpeichernJetzt,400); }
async function noSpeichernJetzt(){
  clearTimeout(NO.timer); if(!NO.aktiv||!IA_DB_BEREIT) return;
  try{ await iaPut('notar',JSON.parse(JSON.stringify(NO.aktiv))); speicherFehler('notar',''); }
  catch(e){ speicherFehler('notar','Der Notarauftrag konnte nicht gespeichert werden: '+iaFehlerText(e)+'.'); }
}
function noPersonAus(k){ return Object.assign(noPerson(),{kundeId:k.id,name:kdName(k),anschrift:[k.strasse,k.plzort].filter(Boolean).join(', '),telefon:k.telefon||'',email:k.email||''}); }
/* Vorbelegung aus der geöffneten Bewertung: Objektdaten, Kunde als Verkäufer, Interessent mit Reservierung/Kaufangebot als Käufer */
function noAusBewertung(p){
  let w=modus()==='wohnung', t=exV('ek_typ');
  p.anschrift=exV('ek_anschrift');
  p.art=w?'Wohnung':/^Mehrfamilienhaus/.test(t)?'Mehrfamilienhaus':/^(EFH|Doppel|Reihen)/.test(t)?NO_ARTEN[0]:NO_ARTEN[4];
  p.grundbuch=exV('od_grundbuch'); p.blatt=exV('od_gb_blatt'); p.flurstuecke=exV('od_flst_nrn')||exV('ek_flst');
  p.flaeche=w?'':exV('ek_gs_flaeche'); p.mea=w?exV('ek_mea'):'';
  p.abt2=exV('od_abt2'); p.abt3=exV('od_abt3'); p.baulasten=exV('od_baulasten');
  p.kaufpreis=exV('vm_preis')||exV('ex_preis'); p.provKaeufer=exV('ex_provision');
  p.projekt=(($('pj_name')||{}).value||'').trim();
  let kid=exV('ek_kunde_id'), k=kid&&KD_CACHE.find(x=>x.id===kid);
  if(k){ p.kundeId=kid; p.verkaeufer=[noPersonAus(k)]; }
  try{
    let ev=vmDaten().ev.filter(e=>['Reservierung','Kaufangebot'].includes(e.art)&&e.kid).sort((a,b)=>(b.d||'').localeCompare(a.d||''));
    let kk=ev.length&&KD_CACHE.find(x=>x.id===ev[0].kid); if(kk) p.kaeufer=[noPersonAus(kk)];
  }catch(e){}
  if(w) p.unterlagen=p.unterlagen.concat(NO_UNTERLAGEN_WEG.map(n=>({name:n,ok:false})));
}
async function noNeu(ausBewertung){
  if(!IA_DB_BEREIT){ alert('Notaraufträge brauchen die Gerätedatenbank, die in diesem Browserfenster nicht zur Verfügung steht (z. B. privates Fenster).'); return; }
  let p=noLeer();
  if(ausBewertung){
    if(!exV('ek_anschrift')){ alert('Es ist keine Bewertung mit Anschrift geöffnet.'); return; }
    noAusBewertung(p);
  }
  NO.aktiv=p; NO.liste.unshift(p); await noSpeichernJetzt(); wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function noOeffnenAuftrag(id){ let p=(NO.liste||[]).find(x=>x.id===id); if(!p) return; NO.aktiv=p; wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function noZurListe(){ await noSpeichernJetzt(); NO.aktiv=null; await noLaden(); wzZeichnen(); }
async function noLoeschen(id){
  if(!confirm('Diesen Notarauftrag mit allen Namen und Angaben endgültig löschen?')) return;
  try{ await iaDel('notar',id); }catch(e){ alert('Der Notarauftrag konnte nicht gelöscht werden: '+iaFehlerText(e)+'.'); return; }
  if(NO.aktiv&&NO.aktiv.id===id) NO.aktiv=null;
  await noLaden(); wzZeichnen();
}
function noPersonNeu(rolle){ let p=NO.aktiv; if(!p) return; p[rolle].push(noPerson()); noSpeichernBald(); wzZeichnen(); }
/* Person aus der Kundenakte übernehmen (D48): verknüpft den Auftrag mit dem Kunden für Auskunft und Löschen */
function noPersonKunde(rolle,i){ wzdKundeWaehlen(id=>{ let p=NO.aktiv, k=wzdKunde(id); if(!p||!k||!p[rolle][i]) return;
  let alt=p[rolle][i]; p[rolle][i]=Object.assign(noPersonAus(k),{familienstand:alt.familienstand||'',gueterstand:alt.gueterstand||''}); noSpeichernBald(); wzZeichnen(); }); }
function noPersonWeg(rolle,i){ let p=NO.aktiv; if(!p||p[rolle].length<2) return; p[rolle].splice(i,1); noSpeichernBald(); wzZeichnen(); }
function noUnterlageNeu(){ let p=NO.aktiv; if(!p) return; p.unterlagen.push({name:'',ok:false}); noSpeichernBald(); wzZeichnen(); }
function noUnterlageWeg(i){ let p=NO.aktiv; if(!p) return; p.unterlagen.splice(i,1); noSpeichernBald(); wzZeichnen(); }

/* ---------- Prüfungen ---------- */
function noNamen(l){ return (l||[]).map(x=>(x.name||'').trim()).filter(Boolean); }
/* §§ 656b–656d BGB: Wohnung oder Einfamilienhaus, Käufer Verbraucher → gleiche Teile oder höchstens die Hälfte abgewälzt */
function noProvisionPruefen(p){
  let k=wzN(p.provKaeufer), v=wzN(p.provVerkaeufer), gilt=(p.art==='Wohnung'||p.art===NO_ARTEN[0])&&p.kaeuferVerbraucher==='ja';
  if(!p.provKaeufer&&!p.provVerkaeufer) return null;
  if(!gilt) return wzAmpel('gruen','Die Regeln zur Teilung der Maklerprovision (§§ 656c, 656d BGB) gelten nur für Wohnungen und Einfamilienhäuser, wenn der Käufer Verbraucher ist (§ 656b BGB).');
  if(k>0&&v>0&&k>v+1e-9) return wzAmpel('rot','Der Käufer soll mehr zahlen als der Verkäufer. Bei Wohnung oder Einfamilienhaus und einem Käufer als Verbraucher: Ist der Makler für beide tätig, nur gleiche Teile (§ 656c BGB); hat nur der Verkäufer beauftragt, trägt der Käufer höchstens so viel wie der Verkäufer, fällig erst nach dessen Zahlung (§ 656d BGB).');
  if(k>0&&!(v>0)) return wzAmpel('gelb','Nur der Käufer zahlt Provision. Das passt, wenn allein der Käufer den Makler beauftragt hat. Hat der Verkäufer beauftragt, darf der Käufer höchstens so viel tragen wie der Verkäufer (§ 656d BGB).');
  if(k>0&&v>0&&Math.abs(k-v)<1e-9) return wzAmpel('gruen','Provision zu gleichen Teilen — entspricht § 656c BGB.');
  return wzAmpel('gruen','Der Käufer trägt nicht mehr als der Verkäufer (§§ 656c, 656d BGB).');
}
function noFristPruefen(p){
  let f=ImmoBeratung.notarFrist(p.termin,aufHeute()); if(!f) return wzHinweis('Mit Wunschtermin rechnet die App aus, bis wann der Vertragsentwurf bei den Beteiligten sein sollte.');
  let vv=!!p.verkaeuferUnternehmer&&p.kaeuferVerbraucher==='ja';
  if(f.stufe==='vorbei') return wzAmpel('gelb','Der Termin liegt in der Vergangenheit.');
  let regel='Bei einem Verbrauchervertrag (ein Unternehmer verkauft an einen Verbraucher) soll der Verbraucher den beabsichtigten Vertragstext im Regelfall zwei Wochen vor der Beurkundung erhalten (§ 17 Abs. 2a Satz 2 Nr. 2 BeurkG).';
  if(f.stufe==='knapp') return wzAmpel(vv?'rot':'gelb','Bis zum Termin sind es nur '+f.tageBisTermin+' Tage. '+(vv?regel+' Den Termin mit dem Notariat abstimmen.':'Für den Entwurf bleibt wenig Zeit — mit dem Notariat abstimmen.'));
  return wzAmpel(f.stufe==='bald'?'gelb':'gruen','Entwurf an die Beteiligten bis spätestens '+wzDatum(f.entwurfBis)+' (zwei Wochen vor dem Termin). '+(vv?regel:'Bei privaten Verkäufen ist die Frist nicht vorgeschrieben, gibt aber Zeit zum Prüfen.'));
}

/* ---------- Ansicht ---------- */
function noZeichnen(){
  if(NO.liste===null){ noLaden().then(()=>{ if(WZ.aktiv==='notar') wzZeichnen(); }); return '<p class="hint">Notaraufträge werden geladen …</p>'; }
  return NO.aktiv?noEditor(NO.aktiv):noListe();
}
function noListe(){
  let l=NO.liste||[], offen=document.body.classList.contains('started')&&exV('ek_anschrift');
  return wzBox('Notaraufträge',wzHinweis('Die Angaben für den Kaufvertragsentwurf sammeln und als Datenblatt an das Notariat geben. Geburtsdaten und Steuer-Identifikationsnummern erhebt das Notariat selbst — sie gehören nicht in die App. Aufträge liegen nur auf diesem Gerät.')
    +'<div class="gr-zeile">'+(offen?'<button type="button" class="primary" onclick="noNeu(true)" data-ic="arrow-down">Aus der geöffneten Bewertung</button>':'')
    +'<button type="button" class="'+(offen?'secondary':'primary')+'" onclick="noNeu(false)" data-ic="plus">Neuer Auftrag</button></div>'
    +(l.length?'<div class="wz-tabwrap" style="margin-top:14px"><table class="nhk wz-tab"><thead><tr><th>Objekt</th><th>Notartermin</th><th>Stand</th><th></th></tr></thead><tbody>'
      +l.map(p=>'<tr><td>'+sEsc(p.anschrift||'ohne Anschrift')+'<small>'+sEsc([noNamen(p.verkaeufer).join(', '),noNamen(p.kaeufer).join(', ')].filter(Boolean).join(' → '))+'</small></td>'
        +'<td>'+(noDatum(p.termin)?wzDatum(p.termin)+(p.uhrzeit?', '+sEsc(p.uhrzeit)+' Uhr':''):'–')+'</td><td>'+sEsc(p.stand||'Entwurf')+'</td>'
        +'<td class="wz-aktion"><button class="secondary" onclick="noOeffnenAuftrag(\''+idSicher(p.id)+'\')">Öffnen</button>'
        +'<button class="secondary" onclick="noLoeschen(\''+idSicher(p.id)+'\')" aria-label="Notarauftrag löschen" data-ic="trash"></button></td></tr>').join('')+'</tbody></table></div>'
      :'<p class="hint" style="margin-top:14px">Noch kein Notarauftrag.</p>'));
}
function noPersonen(p,rolle,titel){
  return p[rolle].map((x,i)=>'<div class="no-person"><div class="no-person-kopf"><b>'+titel+(p[rolle].length>1?' '+(i+1):'')+'</b>'
      +(p[rolle].length>1?'<button type="button" class="weg" aria-label="'+titel+' '+(i+1)+' entfernen" onclick="noPersonWeg(\''+rolle+'\','+i+')">✕</button>':'')+'</div>'
    +'<div class="grid">'+wzFeld(rolle+'.'+i+'.name','Name, Vorname bzw. Firma',{typ:'text'})+wzFeld(rolle+'.'+i+'.anschrift','Anschrift',{typ:'text'})
    +wzFeld(rolle+'.'+i+'.telefon','Telefon',{typ:'text'})+wzFeld(rolle+'.'+i+'.email','E-Mail',{typ:'text'})
    +wzFeld(rolle+'.'+i+'.familienstand','Familienstand',{typ:'wahl',optionen:NO_FAMILIE.map(a=>[a,a||'–'])})
    +wzFeld(rolle+'.'+i+'.gueterstand','Güterstand',{typ:'wahl',optionen:NO_GUETER.map(a=>[a,a||'–'])})+'</div>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="noPersonKunde(\''+rolle+'\','+i+')" data-ic="users">'+(x.kundeId&&wzdKunde(x.kundeId)?'Verknüpft mit der Kundenakte — ändern':'Aus der Kundenakte')+'</button></div></div>').join('')
    +'<button type="button" class="plus" onclick="noPersonNeu(\''+rolle+'\')">＋ '+titel+'</button>';
}
function noEditor(p){
  let w=p.art==='Wohnung', unterlagen=p.unterlagen.map((u,i)=>'<div class="wz-reihe no-reihe-unterlage">'+wzFeld('unterlagen.'+i+'.ok','liegt vor',{typ:'check'})
    +wzFeld('unterlagen.'+i+'.name','Unterlage',{typ:'text'})+'<button type="button" class="weg" aria-label="Unterlage '+(i+1)+' entfernen" onclick="noUnterlageWeg('+i+')">✕</button></div>').join('');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="noZurListe()" data-ic="arrow-left">Alle Aufträge</button>'
      +'<span class="ub-status">'+sEsc(p.stand||'Entwurf')+(p.projekt?' · '+sEsc(p.projekt):'')+'</span>'
      +'<div class="no-stand">'+wzFeld('stand','Stand',{typ:'wahl',optionen:NO_STAENDE.map(a=>[a,a]),zeichnen:true})+'</div></div>'
    +'<div id="no_pruef" class="no-pruef"></div>'   // D54–D61: Prüfungen aus anderen Kacheln, nur in der Ansicht (nie im Datenblatt)
    +wzBox('Objekt','<div class="grid">'+wzFeld('anschrift','Anschrift',{typ:'text'})
      +wzFeld('art','Art',{typ:'wahl',optionen:NO_ARTEN.map(a=>[a,a]),zeichnen:true})
      +wzFeld('grundbuch','Amtsgericht / Grundbuch von',{typ:'text'})+wzFeld('blatt','Blatt',{typ:'text'})
      +wzFeld('flurstuecke','Flurstück(e)',{typ:'text'})
      +(w?wzFeld('mea','Miteigentumsanteil',{typ:'text',ph:'z. B. 85/1.000'})+wzFeld('wohnungNr','Nr. laut Aufteilungsplan',{typ:'text'})
        +wzFeld('sondernutzung','Sondernutzungsrechte',{typ:'text',ph:'z. B. Stellplatz Nr. 4, Gartenanteil'})+wzFeld('verwaltung','Hausverwaltung (Firma, Kontakt)',{typ:'text'})
        +wzFeld('zustimmung','Zustimmung der Verwaltung nötig (§ 12 WEG)',{typ:'wahl',optionen:[['unbekannt','unbekannt — Teilungserklärung prüfen'],['ja','ja'],['nein','nein']]})
        :wzFeld('flaeche','Grundstücksfläche',{typ:'betrag',einheit:'m²'}))+'</div>'
      +(w?wzHinweis('Steht in der Teilungserklärung, dass der Verkauf der Zustimmung der Verwaltung bedarf (§ 12 WEG), holt das Notariat sie ein — dafür den Kontakt der Verwaltung angeben.'):''))
    +wzBox('Verkäufer',noPersonen(p,'verkaeufer','Verkäufer')
      +'<div class="grid">'+wzFeld('verkaeuferUnternehmer','Verkäufer handelt als Unternehmer (z. B. Bauträger oder die Bank mit einer eigenen Liegenschaft)',{typ:'check',voll:true,zeichnen:true})+'</div>'
      +wzHinweis('Verheiratet im gesetzlichen Güterstand und das Objekt ist im Wesentlichen das ganze Vermögen? Dann braucht der Verkauf die Einwilligung des Ehegatten (§ 1365 BGB) — das Notariat klärt es.'))
    +wzBox('Käufer',noPersonen(p,'kaeufer','Käufer')
      +'<div class="grid">'+wzFeld('erwerb','Erwerb bei mehreren Käufern',{typ:'wahl',optionen:NO_ERWERB.map(a=>[a,a||'–'])})
      +wzFeld('kaeuferVerbraucher','Käufer kauft als Verbraucher',{typ:'wahl',optionen:[['ja','ja (privat)'],['nein','nein (gewerblich)']],zeichnen:true})+'</div>')
    +wzBox('Kaufpreis','<div class="grid">'+wzFeld('kaufpreis','Kaufpreis gesamt',{typ:'betrag',einheit:'€'})
      +wzFeld('inventar','davon bewegliche Gegenstände',{typ:'betrag',einheit:'€'})+wzFeld('inventarListe','welche',{typ:'text',ph:'z. B. Einbauküche, Markise'})
      +wzFeld('faelligkeit','Fälligkeit',{typ:'text',voll:true})+'</div>'
      +wzHinweis('Bewegliche Gegenstände gehören nicht zum Grundstück; der Notar weist sie im Vertrag gesondert aus. Nur einen realistischen Zeitwert ansetzen — das Finanzamt kann die Aufteilung prüfen. Steuerliche Fragen klärt der Steuerberater.'))
    +wzBox('Finanzierung des Käufers','<div class="grid">'+wzFeld('finanzierung','Kaufpreis wird finanziert',{typ:'wahl',optionen:[['ja','ja'],['nein','nein (Eigenmittel)'],['teilweise','teilweise']],zeichnen:true})
      +(p.finanzierung!=='nein'?wzFeld('bank','Finanzierende Bank',{typ:'text'})+wzFeld('darlehen','Darlehen',{typ:'betrag',einheit:'€'})
        +wzFeld('grundschuld','Finanzierungsgrundschuld vor Eigentumsumschreibung (Belastungsvollmacht)',{typ:'wahl',optionen:[['ja','ja'],['nein','nein']]})
        +wzFeld('bestaetigung','Finanzierungsbestätigung vom',{typ:'datum'}):'')+'</div>')
    +wzBox('Besitzübergang und Mietverhältnisse','<div class="grid">'+wzFeld('uebergabeDatum','Übergabe am',{typ:'datum'})
      +wzFeld('uebergabeRegel','Regel',{typ:'text'})+wzFeld('raeumung','Zustand',{typ:'wahl',optionen:[['geräumt','geräumt'],['vermietet','vermietet (Käufer tritt in die Mietverträge ein)'],['teilweise vermietet','teilweise vermietet']],zeichnen:true})
      +(p.raeumung!=='geräumt'?wzFeld('mietverhaeltnisse','Anzahl Mietverhältnisse',{typ:'zahl'})+wzFeld('kaltmiete','Kaltmiete gesamt',{typ:'betrag',einheit:'€/Monat'})
        +wzFeld('kautionen','Kautionen gesamt',{typ:'betrag',einheit:'€'}):'')+'</div>'
      +(p.raeumung!=='geräumt'?wzHinweis('Mieter nicht namentlich erfassen — die Mietverträge gehen direkt an das Notariat.'):''))
    +wzBox('Belastungen und Sonstiges zum Grundstück','<div class="grid">'+wzFeld('abt2','Grundbuch Abt. II (Rechte, Lasten)',{typ:'text',ph:'z. B. Wegerecht'})
      +wzFeld('abt2Uebernahme','übernimmt der Käufer',{typ:'wahl',optionen:[['','–'],['ja','ja'],['nein','nein, Löschung']]})
      +wzFeld('abt3','Grundbuch Abt. III (Grundschulden)',{typ:'text'})
      +wzFeld('abt3Loeschung','Löschung auf Kosten des Verkäufers',{typ:'wahl',optionen:[['ja','ja'],['nein','nein'],['','–']]})
      +wzFeld('baulasten','Baulasten',{typ:'text'})
      +wzFeld('erschliessung','Erschließungsbeiträge',{typ:'text',ph:'z. B. bis Vertragsschluss festgesetzte trägt der Verkäufer'})+'</div>')
    +wzBox('Maklerprovision','<div class="grid">'+wzFeld('provKaeufer','Käufer',{typ:'text',ph:'z. B. 3,57 % inkl. MwSt.'})
      +wzFeld('provVerkaeufer','Verkäufer',{typ:'text',ph:'z. B. 3,57 % inkl. MwSt.'})+'</div><div id="no_prov"></div>')
    +wzBox('Notariat und Termin','<div class="grid">'+wzFeld('notar','Notariat',{typ:'text'})+wzFeld('notarOrt','Ort',{typ:'text'})
      +wzFeld('termin','Wunschtermin',{typ:'datum'})+wzFeld('uhrzeit','Uhrzeit',{typ:'text',ph:'z. B. 10:30'})
      +wzFeld('entwurfAn','Entwurf an',{typ:'text',voll:true})+'</div><div id="no_frist"></div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="noKalender()" data-ic="calendar">Termin in den Kalender</button>'
      +'<button type="button" class="secondary" onclick="noWiedervorlagen()" data-ic="clipboard">Wiedervorlagen anlegen</button>'
      +'<button type="button" class="secondary" onclick="noUebergabe()" data-ic="key">Übergabeprotokoll anlegen</button></div>')
    +wzBox('Energieausweis an den Käufer','<div class="grid">'+wzFeld('eaUebergeben','Energieausweis (oder Kopie) übergeben am',{typ:'datum'})+'</div><div id="no_ea"></div>')
    +wzBox('Unterlagen für das Notariat',unterlagen+'<button type="button" class="plus" onclick="noUnterlageNeu()">＋ Unterlage</button>')
    +wzBox('Weitere Vereinbarungen',wzFeld('sonstiges','Was soll noch in den Vertrag?',{typ:'lang',zeilen:3,voll:true,ph:'z. B. Übernahme der Gartenmöbel, Rücktrittsrecht bei Nichtfinanzierung, Termin der Räumung'}))
    +wzHinweis('Geburtsdaten und Steuer-Identifikationsnummern der Beteiligten erhebt das Notariat selbst (Anzeige an das Finanzamt, § 20 GrEStG). Zum Termin einen gültigen Ausweis mitbringen.');
}
function noRechnen(){
  let p=NO.aktiv; if(!p) return;
  wzH('no_prov',noProvisionPruefen(p)||''); wzH('no_frist',noFristPruefen(p)); wzH('no_ea',noEaPruefen(p));
  if(typeof wzdBereit==='function'&&!wzdBereit()) wzdLaden().then(()=>{ if(NO.aktiv===p&&$('no_pruef')){ wzH('no_pruef',noPruefHtml(p)); iconify($('no_pruef')); } });
  else wzH('no_pruef',noPruefHtml(p));
  iconify($('wz_body'));
}
/* Was andere Kacheln zu diesem Verkauf melden (D54–D61): Geldwäsche-Prüfung, „Wer verkauft?“, Vorkaufsrecht des Mieters und
   Widerrufsfrist der Maklerverträge. Zuordnung über Anschrift oder Projektname wie im Verkaufsfahrplan. Nur rote und gelbe Punkte. */
function noPruefHtml(p){
  if(typeof wzdObjekte!=='function') return '';
  let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''), gleich=(a,b)=>!!n(a)&&n(a)===n(b);
  let o=wzdObjekte(true).find(x=>gleich(p.anschrift,x.anschrift)||gleich(p.projekt,x.name))||null, l=[];
  const los=(t,fn)=>' <button type="button" class="secondary fp-los" onclick="'+fn+'">'+t+'</button>';
  try{ if(typeof gwgNotarAmpelHtml==='function') l.push(gwgNotarAmpelHtml(p)); }catch(e){}
  try{ let a=o&&typeof bfAmpel==='function'?bfAmpel(o.id):null;
    if(a&&a.stufe!=='gruen') l.push(wzAmpel(a.stufe==='rot'?'rot':'gelb','Wer verkauft?: '+sEsc(a.text)+los('Wer verkauft?',"wzOeffnen('befugnis');bfOeffnen('"+idSicher(o.id)+"')"))); }catch(e){}
  try{ if(p.raeumung&&p.raeumung!=='geräumt'&&typeof vvNotarHinweis==='function'){ let h=vvNotarHinweis(p);
    if(h) l.push(h.replace(/<\/div>$/,'')+(typeof vvAusNotar==='function'?los('Vermietet verkaufen',"noSpeichernJetzt().then(()=>vvAusNotar('"+idSicher(p.id)+"'))"):'')+'</div>'); } }catch(e){}
  try{ if(o&&typeof mvPruef==='function') wzdAkten('maklervertrag',o.id).forEach(a=>((mvPruef(a)||{}).ampeln||[]).filter(x=>x.stufe==='rot'&&['notar','widerruf','textform'].includes(x.id))
    .forEach(x=>l.push(wzAmpel('rot','Maklervertrag '+sEsc(typeof mvTitel==='function'?mvTitel(a):'')+': '+sEsc(x.text)+los('Maklerverträge',"wzOeffnen('maklervertrag');mvOeffnen('"+idSicher(a.id)+"')"))))); }catch(e){}
  l=l.filter(Boolean);
  return l.length?wzBox('Aus anderen Kacheln',l.join('')+wzHinweis('Nur für dich — erscheint nicht im Datenblatt für das Notariat.')):'';
}

/* Unverzüglich nach Abschluss des Kaufvertrags erhält der Käufer den Energieausweis oder eine Kopie (§ 80 Abs. 4 Satz 5 GModG),
   nicht erst bei der Besitzübergabe. Verstoß: Bußgeld bis 10.000 Euro (§ 108 Abs. 1 Nr. 19, Abs. 2 Nr. 2). D50 */
function noEaPruefen(p){
  let ueb=noDatum(p.eaUebergeben), beurkundet=/Beurkundet|Erledigt/.test(p.stand||'')||(noDatum(p.termin)&&noDatum(p.termin)<aufHeute());
  if(ueb) return wzAmpel('gruen','Übergeben am '+wzDatum(ueb)+'.');
  return beurkundet?wzAmpel('rot','Kaufvertrag beurkundet — Energieausweis oder Kopie jetzt unverzüglich an den Käufer übergeben und das Datum eintragen (§ 80 Abs. 4 Satz 5 GModG).')
    :wzHinweis('Direkt nach der Beurkundung bekommt der Käufer den Energieausweis oder eine Kopie — nicht erst bei der Schlüsselübergabe (§ 80 Abs. 4 Satz 5 GModG).');
}

/* ---------- Kalender, Wiedervorlagen, Übergabeprotokoll ---------- */
function noOrt(p){ return [p.notar,p.notarOrt].filter(Boolean).join(', '); }
function noKalender(){
  let p=NO.aktiv; if(!p) return;
  if(!noDatum(p.termin)){ alert('Bitte zuerst einen gültigen Wunschtermin eintragen.'); return; }
  let text=ImmoBeratung.ics({uid:p.id+'@immoapp',titel:'Notartermin '+(p.anschrift||'Kaufvertrag'),ort:noOrt(p),datum:p.termin,uhrzeit:p.uhrzeit,dauerMin:90,erinnerungMin:1440,
    beschreibung:'Beurkundung des Kaufvertrags. Gültigen Ausweis mitbringen.'});
  if(!text){ alert('Der Termin ist kein gültiges Datum.'); return; }
  iaHerunterladen(new Blob([text],{type:'text/calendar;charset=utf-8'}),wzDateiname('Notartermin '+(p.anschrift||''))+'.ics');
}
function noWiedervorlagen(){
  let p=NO.aktiv; if(!p) return;
  if(!noDatum(p.termin)){ alert('Bitte zuerst einen gültigen Wunschtermin eintragen.'); return; }
  let f=ImmoBeratung.notarFrist(p.termin,aufHeute()), objekt=p.anschrift||'Notarauftrag', heute=aufHeute(), neu=[];
  const dazu=(text,frist)=>neu.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),text,frist:frist<heute?heute:frist,objekt,kundeId:p.kundeId||'',erledigt:false,angelegt:Date.now()});
  dazu('Notarauftrag '+objekt+': Liegt der Vertragsentwurf bei Verkäufer, Käufer und Bank? Termin am '+wzDatum(p.termin)+'.',f.entwurfBis);
  dazu('Notartermin '+objekt+' am '+wzDatum(p.termin)+(p.uhrzeit?' um '+p.uhrzeit+' Uhr':'')+(noOrt(p)?' — '+noOrt(p):''),p.termin);
  if(noDatum(p.uebergabeDatum)) dazu('Übergabe '+objekt+' — Übergabeprotokoll mit Zählerständen und Schlüsseln',p.uebergabeDatum);
  if(!aufStore(aufLoad().concat(neu))) return;
  try{ aufBadge(); }catch(e){}
  alert(neu.length+' Wiedervorlage'+(neu.length===1?'':'n')+' angelegt.');
}
async function noUebergabe(){
  let p=NO.aktiv; if(!p) return;
  if(typeof ubLeer!=='function') return;
  await noSpeichernJetzt();
  if(UB.liste===null) await ubLaden();
  let u=ubLeer();
  u.art='Verkauf (Besitzübergang)'; u.datum=noDatum(p.uebergabeDatum)||aufHeute(); u.anschrift=p.anschrift||'';
  u.lage=p.wohnungNr?'Wohnung Nr. '+p.wohnungNr+' laut Aufteilungsplan':'';
  u.uebergeber=noNamen(p.verkaeufer).join(', '); u.uebernehmer=noNamen(p.kaeufer).join(', ');
  u.kundeIds=p.verkaeufer.concat(p.kaeufer).map(x=>x.kundeId).filter(Boolean).concat(p.kundeId?[p.kundeId]:[]).filter((x,i,a)=>a.indexOf(x)===i);   // D48
  UB.aktiv=u; UB.liste.unshift(u); await ubSpeichernJetzt();
  wzOeffnen('uebergabe');
}

/* ---------- Dokument und Kundenakte ---------- */
function noDokument(){
  let p=NO.aktiv; if(!p){ alert('Bitte zuerst einen Auftrag öffnen.'); return null; }
  const z=(a,b)=>b?[a,sEsc(String(b))]:null, eu=v=>wzN(v,true)>0?wzEur(wzN(v,true)):'';
  const person=(x,t)=>'<h3>'+t+'</h3>'+wzDokTabelle([z('Name',x.name),z('Anschrift',x.anschrift),z('Telefon',x.telefon),z('E-Mail',x.email),z('Familienstand',x.familienstand),z('Güterstand',x.gueterstand)]);
  let w=p.art==='Wohnung', vermietet=p.raeumung!=='geräumt';
  let unterlagen=p.unterlagen.filter(u=>u.name);
  return {titel:'Notarauftrag '+(p.anschrift||''),pflicht:true,
    html:'<h1>Angaben für den Kaufvertragsentwurf</h1><p class="wzd-unter">'+(noOrt(p)?'An: '+sEsc(noOrt(p))+' · ':'')+'Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +'<h2>Objekt</h2>'+wzDokTabelle([z('Anschrift',p.anschrift),z('Art',p.art),z('Grundbuch',[p.grundbuch,p.blatt?'Blatt '+p.blatt:''].filter(Boolean).join(', ')),z('Flurstück(e)',p.flurstuecke),
        w?z('Miteigentumsanteil',p.mea):z('Grundstücksfläche',wzN(p.flaeche,true)>0?wzZ(wzN(p.flaeche,true),0)+' m²':''),w?z('Nr. laut Aufteilungsplan',p.wohnungNr):null,
        w?z('Sondernutzungsrechte',p.sondernutzung):null,w?z('Hausverwaltung',p.verwaltung):null,w?z('Zustimmung der Verwaltung (§ 12 WEG)',p.zustimmung):null])
      +'<h2>Beteiligte</h2>'+p.verkaeufer.map((x,i)=>person(x,'Verkäufer'+(p.verkaeufer.length>1?' '+(i+1):''))).join('')
      +(p.verkaeuferUnternehmer?'<p>Der Verkäufer handelt als Unternehmer.</p>':'')
      +p.kaeufer.map((x,i)=>person(x,'Käufer'+(p.kaeufer.length>1?' '+(i+1):''))).join('')
      +wzDokTabelle([z('Erwerb',p.erwerb),z('Käufer kauft als Verbraucher',p.kaeuferVerbraucher)])
      +'<h2>Kaufpreis und Finanzierung</h2>'+wzDokTabelle([z('Kaufpreis gesamt',eu(p.kaufpreis)),z('davon bewegliche Gegenstände',eu(p.inventar)+(p.inventarListe?' ('+p.inventarListe+')':'')),
        z('Fälligkeit',p.faelligkeit),z('Finanzierung',p.finanzierung),p.finanzierung!=='nein'?z('Finanzierende Bank',p.bank):null,p.finanzierung!=='nein'?z('Darlehen',eu(p.darlehen)):null,
        p.finanzierung!=='nein'?z('Finanzierungsgrundschuld vor Umschreibung',p.grundschuld):null,p.finanzierung!=='nein'&&noDatum(p.bestaetigung)?z('Finanzierungsbestätigung vom',wzDatum(p.bestaetigung)):null])
      +'<h2>Besitzübergang</h2>'+wzDokTabelle([z('Übergabe am',noDatum(p.uebergabeDatum)?wzDatum(p.uebergabeDatum):''),z('Regel',p.uebergabeRegel),z('Zustand',p.raeumung),
        vermietet?z('Mietverhältnisse',p.mietverhaeltnisse):null,vermietet?z('Kaltmiete gesamt',eu(p.kaltmiete)?eu(p.kaltmiete)+' im Monat':''):null,vermietet?z('Kautionen gesamt',eu(p.kautionen)):null])
      +'<h2>Belastungen</h2>'+wzDokTabelle([z('Abt. II',p.abt2),z('übernimmt der Käufer',p.abt2Uebernahme),z('Abt. III',p.abt3),z('Löschung auf Kosten des Verkäufers',p.abt3Loeschung),
        z('Baulasten',p.baulasten),z('Erschließungsbeiträge',p.erschliessung)])
      +((p.provKaeufer||p.provVerkaeufer)?'<h2>Maklerprovision</h2>'+wzDokTabelle([z('Käufer',p.provKaeufer),z('Verkäufer',p.provVerkaeufer)]):'')
      +'<h2>Termin</h2>'+wzDokTabelle([z('Wunschtermin',noDatum(p.termin)?wzDatum(p.termin)+(p.uhrzeit?', '+p.uhrzeit+' Uhr':''):''),z('Entwurf an',p.entwurfAn)])
      +(p.sonstiges?'<h2>Weitere Vereinbarungen</h2><p>'+sEsc(p.sonstiges).replace(/\n/g,'<br>')+'</p>':'')
      +(unterlagen.length?'<h2>Unterlagen</h2><ul>'+unterlagen.map(u=>'<li>'+(u.ok?'☑':'☐')+' '+sEsc(u.name)+'</li>').join('')+'</ul>':'')
      +'<p class="wzd-klein">Geburtsdaten und Steuer-Identifikationsnummern der Beteiligten erhebt das Notariat direkt. Maßgeblich ist allein der beurkundete Vertrag.</p>',
    fuss:'Angaben zur Vorbereitung des Vertragsentwurfs.'};
}
function noKundeText(){
  let p=NO.aktiv; if(!p){ alert('Bitte zuerst einen Auftrag öffnen.'); return ''; }
  return 'Notarauftrag '+(p.anschrift||'')+': Kaufpreis '+(wzN(p.kaufpreis,true)>0?wzEur(wzN(p.kaufpreis,true)):'offen')
    +(noDatum(p.termin)?', Notartermin '+wzDatum(p.termin)+(p.uhrzeit?' um '+p.uhrzeit+' Uhr':''):'')+(noOrt(p)?' ('+noOrt(p)+')':'')+'. Stand: '+(p.stand||'Entwurf')+'.';
}
wzRegistrieren({id:'notar',titel:'Notarauftrag',sub:'Angaben für den Kaufvertragsentwurf · Termin · Übergabe',icon:'pen',ohneNeu:true,
  zustand:()=>NO.aktiv,speichern:noSpeichernBald,zeichnen:noZeichnen,rechnen:noRechnen,dokument:noDokument,kundeText:noKundeText,
  schliessen:()=>{ noSpeichernJetzt(); }});

/* ---------- Kundenakte: Auskunft und Löschen (D48) ----------
   Ein Kunde steckt in einem Notarauftrag, wenn eine Person mit seiner Kunden-Id verknüpft ist oder — bei älteren Aufträgen —
   denselben Namen trägt. Beim Löschen bleiben vom Eintrag nur „(Kunde gelöscht)“ und die Rolle; der Auftrag selbst bleibt. */
function noTrifft(x,k){ return !!x&&((!!x.kundeId&&x.kundeId===k.id)||wzdNameGleich(x.name,k)); }
function noTreffer(k){ return (NO.liste||[]).map(p=>({p,rollen:NO_ROLLEN.filter(([r])=>(p[r]||[]).some(x=>noTrifft(x,k))||(r==='verkaeufer'&&p.kundeId===k.id))})).filter(x=>x.rollen.length); }
KD_AUSKUNFT_HOOKS.push(async id=>{
  let k=wzdKunde(id); if(!k) return [];
  await noLaden();
  let l=noTreffer(k);
  return ['','NOTARAUFTRÄGE'].concat(l.length?l.map(({p,rollen})=>'- '+(p.anschrift||'Objekt')+': '+rollen.map(r=>r[1]).join(' und ')+', Stand '+(p.stand||'–')
    +(noDatum(p.termin)?', Termin '+wzDatum(p.termin):'')+'; gespeichert: Name, Anschrift, Telefon, E-Mail, Familienstand, Güterstand'):['- keine']);
});
KD_LOESCH_HOOKS.push(async id=>{
  let k=wzdKunde(id); if(!k) return;
  await noLaden();
  for(const {p} of noTreffer(k)){
    NO_ROLLEN.forEach(([r])=>{ p[r]=(p[r]||[]).map(x=>noTrifft(x,k)?Object.assign(noPerson(),{name:'(Kunde gelöscht)'}):x); });
    if(p.kundeId===id) p.kundeId='';
    p.geaendert=Date.now();
    try{ await iaPut('notar',JSON.parse(JSON.stringify(p))); }catch(e){}
  }
  NO.liste=null;
});
