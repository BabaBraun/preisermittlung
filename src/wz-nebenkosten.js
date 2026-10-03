/* ---------- Kachel „Kaufnebenkosten“ (D42) ----------
   Was kostet der Kauf zusätzlich — und was bleibt dem Verkäufer? Notar und Grundbuch genau nach dem GNotKG (Gebühren-
   tabelle B, Kostenverzeichnis mit Nummern), Grunderwerbsteuer nach dem Satz des Landes (Baden-Württemberg 5 %,
   § 1 GrEStFestG BW), Maklerprovision; für den Verkäufer Provision, Löschung der Grundschulden, Treuhandauflage der
   abzulösenden Bank, Vorfälligkeitsentschädigung und Ablösung. Rechnung in js/beratung.js (kaufnebenkosten,
   verkaeuferErloes), gegen alle Zeilen der Anlage 2 zum GNotKG geprüft (tests/unit/d42.test.mjs). Keine Namen. */
function nkStart(){ return {sicht:'kaeufer',preis:'400.000',inventar:'',grest:'5,0',makler:'3,57',grundschuld:'',vollzug:'voll',taetigkeiten:'1',
  betreuung:true,vormerkung:true,xml:true,auslagenKauf:'40',auslagenGs:'20',vMakler:'3,57',restschuld:'',gsNenn:'',treuhand:true,vfe:'',sonst:''}; }
function nkS(){ return wzZustand('nebenkosten'); }
function nkEingabe(S){
  return {preis:wzN(S.preis,true),inventar:wzN(S.inventar,true),grestSatz:wzN(S.grest),maklerSatz:wzN(S.makler),grundschuld:wzN(S.grundschuld,true),
    vollzug:['voll','begrenzt','kein'].includes(S.vollzug)?S.vollzug:'voll',vollzugTaetigkeiten:wzN(S.taetigkeiten),betreuung:!!S.betreuung,vormerkung:!!S.vormerkung,
    xml:!!S.xml,auslagenKauf:wzN(S.auslagenKauf,true),auslagenGs:wzN(S.auslagenGs,true)};
}
function nkVerkaeuferEingabe(S){
  return {preis:wzN(S.preis,true),maklerSatz:wzN(S.vMakler),restschuld:wzN(S.restschuld,true),grundschuldNenn:wzN(S.gsNenn,true),treuhand:!!S.treuhand,
    vorfaelligkeit:wzN(S.vfe,true),sonstiges:wzN(S.sonst,true)};
}
/* „3,57 % inkl. MwSt.“ → 3,57; „provisionsfrei“ → 0 */
function nkSatzAusText(t){ t=String(t||''); if(/provisionsfrei|courtagefrei/i.test(t)) return '0'; let m=/(\d+(?:[.,]\d+)?)\s*%/.exec(t); return m?m[1].replace('.',','):''; }
const NK_GRUPPEN=[['notarKauf','Notar: Kaufvertrag'],['notarGs','Notar: Grundschuld für die Finanzierung'],['grundbuch','Grundbuchamt'],['steuer','Grunderwerbsteuer'],['makler','Maklerprovision']];
function nkSicht(v){ nkS().sicht=v==='verkaeufer'?'verkaeufer':'kaeufer'; wzSpeichern(); wzZeichnen(); }
function nkZeichnen(S){
  let sicht=S.sicht==='verkaeufer'?'verkaeufer':'kaeufer';
  let schalter='<div class="ka-schalter" role="group" aria-label="Sicht">'+[['kaeufer','Käufer: Kaufnebenkosten'],['verkaeufer','Verkäufer: Was bleibt?']]
    .map(([k,t])=>'<button type="button" class="'+(sicht===k?'primary':'secondary')+'" aria-pressed="'+(sicht===k)+'" onclick="nkSicht(\''+k+'\')">'+t+'</button>').join('')+'</div>';
  if(sicht==='verkaeufer') return schalter+'<div class="wz-grid grid">'
    +wzBox('Verkauf','<div class="grid">'+wzFeld('preis','Kaufpreis',{typ:'betrag',einheit:'€'})
      +wzFeld('vMakler','Maklerprovision des Verkäufers',{typ:'prozent',einheit:'% inkl. USt',hinweis:'0 eintragen, wenn der Verkäufer keine Provision zahlt'})
      +wzFeld('sonst','Sonstige Kosten',{typ:'betrag',einheit:'€',hinweis:'z. B. Energieausweis, Räumung, Unterlagen'})+'</div>')
    +wzBox('Darlehen und Grundschulden','<div class="grid">'+wzFeld('restschuld','Restschuld zum Verkauf (Ablösebetrag)',{typ:'betrag',einheit:'€'})
      +wzFeld('vfe','Vorfälligkeitsentschädigung',{typ:'betrag',einheit:'€',hinweis:'nennt die Bank; entfällt z. B. nach Ablauf der Zinsbindung'})
      +wzFeld('gsNenn','Grundschulden, die gelöscht werden (Nennbetrag)',{typ:'betrag',einheit:'€',hinweis:'Summe aus Abteilung III des Grundbuchs'})
      +wzFeld('treuhand','Ablösung über eine Treuhandauflage der Bank an das Notariat',{typ:'check',voll:true})+'</div>')
    +'</div><div id="wz_nk_ergebnis"></div>';
  return schalter+'<div class="wz-grid grid">'
    +wzBox('Kauf','<div class="grid">'+wzFeld('preis','Kaufpreis',{typ:'betrag',einheit:'€'})
      +wzFeld('inventar','davon bewegliche Gegenstände',{typ:'betrag',einheit:'€',hinweis:'z. B. Einbauküche — gehört nicht zum Grundstück und mindert die Grunderwerbsteuer (§ 2 Abs. 1 GrEStG); nur mit realistischem Zeitwert'})
      +wzFeld('grest','Grunderwerbsteuer',{typ:'prozent',einheit:'%',hinweis:'Baden-Württemberg 5 % (§ 1 GrEStFestG BW); andere Länder: eigener Satz'})
      +wzFeld('makler','Maklerprovision des Käufers',{typ:'prozent',einheit:'% inkl. USt',hinweis:'0 eintragen, wenn provisionsfrei'})+'</div>')
    +wzBox('Finanzierung','<div class="grid">'+wzFeld('grundschuld','Grundschuld für das Darlehen',{typ:'betrag',einheit:'€',hinweis:'Nennbetrag; leer, wenn ohne Darlehen gekauft wird'})+'</div>'
      +'<details class="wz-mehr"><summary>Notar im Einzelnen</summary><div class="grid">'
      +wzFeld('vollzug','Vollzug durch das Notariat',{typ:'wahl',optionen:[['voll','voll: z. B. Löschungsunterlagen, Genehmigungen (0,5)'],['begrenzt','nur Bescheinigungen nach öffentlichem Recht, z. B. Vorkaufsrecht der Gemeinde'],['kein','kein Vollzug']],zeichnen:true})
      +(S.vollzug==='begrenzt'?wzFeld('taetigkeiten','Anzahl dieser Bescheinigungen',{typ:'zahl',hinweis:'höchstens 50 € je Bescheinigung (Nr. 22112 KV GNotKG)'}):'')
      +wzFeld('betreuung','Fälligkeitsmitteilung und Überwachung der Umschreibung (Betreuung)',{typ:'check',voll:true})
      +wzFeld('vormerkung','Auflassungsvormerkung im Grundbuch',{typ:'check',voll:true})
      +wzFeld('xml','Strukturdaten (XML) für das elektronische Grundbuch',{typ:'check',voll:true})
      +wzFeld('auslagenKauf','Auslagen Kaufvertrag (geschätzt)',{typ:'betrag',einheit:'€ netto',hinweis:'Kopien, Grundbuchabrufe'})
      +wzFeld('auslagenGs','Auslagen Grundschuld (geschätzt)',{typ:'betrag',einheit:'€ netto'})+'</div></details>')
    +'</div><div id="wz_nk_ergebnis"></div>';
}
function nkGeld(x){ return (+x||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
function nkSatzText(s){ return s==null?'':(+s).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2}); }   // Satz wie im Kostenverzeichnis: 2,0 · 0,5
function nkTabelle(r,dok){
  let z=[];
  NK_GRUPPEN.forEach(([g,titel])=>{
    let l=r.posten.filter(p=>p.gruppe===g); if(!l.length) return;
    let summe=l.reduce((a,p)=>a+p.betrag,0);
    if(dok){ z.push(['<b>'+titel+'</b>','','','<b>'+nkGeld(summe)+'</b>']);
      l.forEach(p=>z.push([sEsc(p.text)+(p.nr?' <span class="wzd-klein">(Nr. '+p.nr+')</span>':''),p.wert!=null&&p.satz!=null?wzEur(p.wert):'',p.satz!=null?nkSatzText(p.satz):'',nkGeld(p.betrag)])); return; }
    z.push('<tr class="nk-gruppe"><th colspan="4">'+titel+'</th><th class="r">'+nkGeld(summe)+'</th></tr>'
      +l.map(p=>'<tr><td>'+sEsc(p.text)+'</td><td>'+(p.nr?'Nr. '+p.nr:'')+'</td><td class="r">'+(p.wert!=null&&p.satz!=null?wzEur(p.wert):'')+'</td><td class="r">'+(p.satz!=null?nkSatzText(p.satz):'')+'</td><td class="r">'+nkGeld(p.betrag)+'</td></tr>').join(''));
  });
  if(dok) return wzDokTabelle(z,['Posten','Geschäftswert','Satz','Betrag'])+wzDokTabelle([['Kaufnebenkosten zusammen',nkGeld(r.summe),{summe:true}]]);
  return '<div class="wz-tabwrap"><table class="nhk wz-tab nk-tab"><thead><tr><th>Posten</th><th>Kostenverzeichnis</th><th>Geschäftswert</th><th>Satz</th><th>Betrag</th></tr></thead><tbody>'
    +z.join('')+'<tr class="wz-summe"><th colspan="4">Kaufnebenkosten zusammen</th><th class="r">'+nkGeld(r.summe)+'</th></tr></tbody></table></div>';
}
const NK_HINWEIS='Notar und Grundbuchamt rechnen nach dem Gerichts- und Notarkostengesetz: Die Gebühren hängen vom Kaufpreis und vom Nennbetrag '
  +'der Grundschuld ab und sind gesetzlich festgelegt — Vereinbarungen über ihre Höhe sind unwirksam (§ 125 GNotKG). Gebühren nach Tabelle B '
  +'(§ 34 GNotKG, Fassung 2025), Umsatzsteuer nur auf die Notarkosten. Auslagen sind geschätzt; die Rechnung stellen Notariat und Grundbuchamt.';
const NK_FAELLIG='Die Grunderwerbsteuer wird einen Monat nach dem Steuerbescheid fällig (§ 15 GrEStG); erst danach bescheinigt das Finanzamt, '
  +'dass der Eintragung nichts entgegensteht, und der Käufer kann als Eigentümer eingetragen werden (§ 22 GrEStG).';
function nkRechnen(S){
  let box=$('wz_nk_ergebnis'); if(!box) return;
  if(S.sicht==='verkaeufer'){ nkRechnenVerkaeufer(S,box); return; }
  let e=nkEingabe(S); if(!(e.preis>0)){ box.innerHTML=wzHinweis('Kaufpreis eintragen.'); return; }
  let r=ImmoBeratung.kaufnebenkosten(e), ng=r.notarKauf.brutto+r.notarGs.brutto+r.grundbuch;
  box.innerHTML='<div class="wz-kpis grid">'+wzdKpi('Kaufnebenkosten',wzEur(r.summe),wzP(r.quote,2)+' des Kaufpreises')
      +wzdKpi('Notar und Grundbuch',wzEur(ng),wzP(r.notarGrundbuchQuote,2)+' · nach GNotKG')
      +wzdKpi('Grunderwerbsteuer',wzEur(r.grest),wzP(e.grestSatz,1)+(e.inventar>0?' auf '+wzEur(r.grestBasis):''))
      +wzdKpi('Gesamtaufwand',wzEur(e.preis+r.summe),'Kaufpreis und Nebenkosten')+'</div>'
    +wzAmpel('gelb','Die Nebenkosten sind sofort fällig und erhöhen den Wert der Immobilie nicht — in der Finanzierung kommen sie meist aus dem Eigenkapital.')
    +wzBox('Die Kosten im Einzelnen',nkTabelle(r,false))
    +wzHinweis(NK_HINWEIS)+wzHinweis(NK_FAELLIG);
}
function nkRechnenVerkaeufer(S,box){
  let e=nkVerkaeuferEingabe(S); if(!(e.preis>0)){ box.innerHTML=wzHinweis('Kaufpreis eintragen.'); return; }
  let r=ImmoBeratung.verkaeuferErloes(e);
  box.innerHTML='<div class="wz-kpis grid">'+wzdKpi('Es bleibt',wzEur(r.erloes),'nach Kosten und Ablösung')
      +wzdKpi('Kosten des Verkaufs',wzEur(r.kosten),wzP(r.kosten/e.preis*100,2)+' des Kaufpreises')
      +wzdKpi('Ablösung der Bank',wzEur(r.restschuld+r.vorfaelligkeit),r.vorfaelligkeit>0?'mit Vorfälligkeitsentschädigung':'Restschuld')+'</div>'
    +(r.erloes<0?wzAmpel('rot','Der Kaufpreis deckt Kosten und Ablösung nicht — der Verkäufer muss '+wzEur(-r.erloes)+' zuschießen.'):'')
    +wzBox('Rechnung','<div class="wz-tabwrap"><table class="nhk wz-tab"><tbody>'
      +[['Kaufpreis',r.preis],['− Maklerprovision',-r.makler],['− Löschung der Grundschulden im Grundbuch (Nr. 14140 KV GNotKG)',-r.loeschung],
        ['− Treuhandauflage der Bank beim Notariat (Nr. 22201 KV GNotKG, mit USt)',-r.treuhand],['− Vorfälligkeitsentschädigung',-r.vorfaelligkeit],['− Sonstige Kosten',-r.sonstiges],
        ['= vor Ablösung',r.erloesVorAbloese,1],['− Ablösung der Restschuld',-r.restschuld],['= Es bleibt',r.erloes,1]]
      .filter(z=>z[2]||z[1]!==0||z[0]==='Kaufpreis').map(z=>'<tr'+(z[2]?' class="wz-summe"':'')+'><td>'+z[0]+'</td><td class="r">'+nkGeld(z[1]).replace(/^-/,'− ')+'</td></tr>').join('')
      +'</tbody></table></div>')
    +wzHinweis('Die Kosten der Lastenfreistellung trägt üblicherweise der Verkäufer, die Kosten des Kaufvertrags und seines Vollzugs der Käufer — '
      +'maßgeblich ist der Kaufvertrag. Löschung nach dem Nennbetrag der Grundschuld (§ 53 Abs. 1 GNotKG), Treuhandgebühr nach dem Ablösebetrag '
      +'(§ 113 Abs. 2 GNotKG). Steuern auf einen Gewinn (z. B. Verkauf innerhalb von zehn Jahren, § 23 EStG) klärt der Steuerberater.');
}
function nkAusBewertung(S){
  let R=wzBewertung(); if(!R) return;
  let preis=zahlLesen(exV('vm_preis'),true)||zahlLesen(exV('ex_preis'),true)||Math.round(R.empfehlung/1000)*1000;
  S.preis=String(Math.round(preis));
  let p=nkSatzAusText(exV('ex_provision')); if(p!=='') S.makler=p;
}
function nkDokument(S){
  if(S.sicht==='verkaeufer'){
    let e=nkVerkaeuferEingabe(S); if(!(e.preis>0)){ alert('Bitte den Kaufpreis eintragen.'); return null; }
    let r=ImmoBeratung.verkaeuferErloes(e);
    return {titel:'Erlös aus dem Verkauf',
      html:'<h1>Was bleibt vom Verkauf?</h1><p class="wzd-unter">Kosten des Verkäufers und Ablösung · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
        +wzDokTabelle([['Kaufpreis',nkGeld(r.preis)],['Maklerprovision ('+wzP(e.maklerSatz,2)+' inkl. USt)',nkGeld(-r.makler)],
          r.loeschung?['Löschung der Grundschulden im Grundbuch',nkGeld(-r.loeschung)]:null,r.treuhand?['Treuhandauflage der Bank beim Notariat (inkl. USt)',nkGeld(-r.treuhand)]:null,
          r.vorfaelligkeit?['Vorfälligkeitsentschädigung',nkGeld(-r.vorfaelligkeit)]:null,r.sonstiges?['Sonstige Kosten',nkGeld(-r.sonstiges)]:null,
          ['Vor Ablösung des Darlehens',nkGeld(r.erloesVorAbloese),{summe:true}],r.restschuld?['Ablösung der Restschuld',nkGeld(-r.restschuld)]:null,
          ['Es bleibt',nkGeld(r.erloes),{summe:true}]].map(z=>z&&[z[0],String(z[1]).replace(/^-/,'− '),z[2]]))
        +'<p class="wzd-klein">Grundbuch- und Notarkosten nach dem GNotKG (Nr. 14140 und 22201 des Kostenverzeichnisses). Steuern auf einen Veräußerungsgewinn sind nicht berücksichtigt.</p>',
      fuss:'Überschlag zur Orientierung; maßgeblich sind Kaufvertrag, Ablöseschreiben der Bank und die Kostenrechnungen.'};
  }
  let e=nkEingabe(S); if(!(e.preis>0)){ alert('Bitte den Kaufpreis eintragen.'); return null; }
  let r=ImmoBeratung.kaufnebenkosten(e);
  return {titel:'Kaufnebenkosten',
    html:'<h1>Kaufnebenkosten</h1><p class="wzd-unter">Kaufpreis '+wzEur(e.preis)+(e.grundschuld>0?' · Grundschuld '+wzEur(e.grundschuld):'')+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle([['Kaufnebenkosten zusammen',nkGeld(r.summe)+' ('+wzP(r.quote,2)+')',{summe:true}],['davon Notar und Grundbuch',nkGeld(r.notarKauf.brutto+r.notarGs.brutto+r.grundbuch)],
        ['davon Grunderwerbsteuer',nkGeld(r.grest)],r.makler?['davon Maklerprovision',nkGeld(r.makler)]:null,['Kaufpreis und Nebenkosten',nkGeld(e.preis+r.summe),{summe:true}]])
      +'<h2>Im Einzelnen</h2>'+nkTabelle(r,true)
      +'<p class="wzd-klein">'+NK_HINWEIS+' '+NK_FAELLIG+'</p>',
    fuss:'Berechnet nach dem GNotKG (Fassung 2025); Auslagen geschätzt.'};
}
function nkKundeText(S){
  if(S.sicht==='verkaeufer'){ let e=nkVerkaeuferEingabe(S); if(!(e.preis>0)) return ''; let r=ImmoBeratung.verkaeuferErloes(e);
    return 'Erlös aus dem Verkauf: Kaufpreis '+wzEur(e.preis)+', Kosten '+wzEur(r.kosten)+(r.restschuld?', Ablösung '+wzEur(r.restschuld):'')+' — es bleiben '+wzEur(r.erloes)+'.'; }
  let e=nkEingabe(S); if(!(e.preis>0)) return ''; let r=ImmoBeratung.kaufnebenkosten(e);
  return 'Kaufnebenkosten bei '+wzEur(e.preis)+': '+wzEur(r.summe)+' ('+wzP(r.quote,2)+') — Notar und Grundbuch '+wzEur(r.notarKauf.brutto+r.notarGs.brutto+r.grundbuch)
    +', Grunderwerbsteuer '+wzEur(r.grest)+(r.makler?', Provision '+wzEur(r.makler):'')+'.';
}
wzRegistrieren({id:'nebenkosten',titel:'Kaufnebenkosten',sub:'Notar und Grundbuch nach GNotKG · Grunderwerbsteuer · Erlös des Verkäufers',icon:'percent',start:nkStart,
  zeichnen:nkZeichnen,rechnen:nkRechnen,ausBewertung:nkAusBewertung,dokument:nkDokument,kundeText:nkKundeText});
