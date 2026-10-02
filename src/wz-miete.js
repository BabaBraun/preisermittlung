/* ---------- Kachel „Mieterhöhung“ (D38) ----------
   Für Vermieter: Anpassung an die ortsübliche Vergleichsmiete (§ 558 BGB) mit Kappungsgrenze und Fristen,
   Modernisierungsumlage (§§ 559–559c BGB) und Neuvermietung mit Mietpreisbremse (§§ 556d–556f BGB).
   Rechnung in js/beratung.js. Keine Namen von Mietern. */
function mieteStart(){
  return {modus:'558',wohnflaeche:'',miete:'',mieteVor3:'',vergleichM2:'',quelle:'Mietspiegel',kappung15:false,letzteErhoehung:'',zugang:aufHeute(),
    kosten:'',erhaltung:'',drittmittel:'',vereinfacht:false,bisherM2:'',angekuendigt:true,vormiete:'',ausnahme:false};
}
function mieteEingabe(S){
  return {wohnflaeche:wzN(S.wohnflaeche,true),miete:wzN(S.miete,true),mieteVor3:wzN(S.mieteVor3,true),vergleichM2:wzN(S.vergleichM2,true),kappung15:!!S.kappung15,
    letzteErhoehung:S.letzteErhoehung,zugang:S.zugang,kosten:wzN(S.kosten,true),erhaltung:wzN(S.erhaltung,true),drittmittel:wzN(S.drittmittel,true),vereinfacht:!!S.vereinfacht,
    bisherM2:wzN(S.bisherM2,true),angekuendigt:S.angekuendigt!==false,vormiete:wzN(S.vormiete,true),ausnahme:!!S.ausnahme};
}
function mieteZeichnen(S){
  let m=S.modus, teil='';
  if(m==='558') teil=wzBox('Vergleichsmiete und Fristen','<div class="grid">'
    +wzFeld('vergleichM2','Ortsübliche Vergleichsmiete',{typ:'betrag',einheit:'€/m² netto kalt'})
    +wzFeld('quelle','Begründung',{typ:'wahl',optionen:[['Mietspiegel','Mietspiegel'],['Mietdatenbank','Auskunft aus einer Mietdatenbank'],['Gutachten','Gutachten eines Sachverständigen'],['Vergleichswohnungen','drei Vergleichswohnungen']]})
    +wzFeld('mieteVor3','Miete vor drei Jahren',{typ:'betrag',einheit:'€/Monat',ph:'wie heute',hinweis:'ohne Erhöhungen wegen Modernisierung oder Betriebskosten'})
    +wzFeld('letzteErhoehung','Letzte Mieterhöhung wirksam seit',{typ:'datum'})+wzFeld('zugang','Zugang des Verlangens beim Mieter',{typ:'datum'})
    +wzFeld('kappung15','Gemeinde mit abgesenkter Kappungsgrenze (15 %, Landesverordnung)',{typ:'check',voll:true})+'</div>');
  else if(m==='559') teil=wzBox('Modernisierung','<div class="grid">'
    +wzFeld('kosten','Kosten für diese Wohnung',{typ:'betrag',einheit:'€'})+wzFeld('vereinfacht','vereinfachtes Verfahren (bis 10.000 €, 30 % Erhaltungspauschale, § 559c)',{typ:'check',voll:true,zeichnen:true})
    +(S.vereinfacht?'':wzFeld('erhaltung','darin ersparte Erhaltungskosten',{typ:'betrag',einheit:'€'}))
    +wzFeld('drittmittel','Fördermittel / Drittmittel',{typ:'betrag',einheit:'€',hinweis:'werden abgezogen (§ 559a)'})
    +wzFeld('bisherM2','Erhöhungen wegen Modernisierung in den letzten 6 Jahren',{typ:'betrag',einheit:'€/m²'})
    +wzFeld('zugang','Zugang der Erhöhungserklärung',{typ:'datum'})+wzFeld('angekuendigt','Maßnahme ordnungsgemäß angekündigt (§ 555c)',{typ:'check',voll:true})+'</div>');
  else teil=wzBox('Neuvermietung','<div class="grid">'
    +wzFeld('vergleichM2','Ortsübliche Vergleichsmiete',{typ:'betrag',einheit:'€/m² netto kalt'})+wzFeld('vormiete','Miete des Vormieters',{typ:'betrag',einheit:'€/Monat'})
    +wzFeld('ausnahme','Ausnahme: Neubau (erstmals genutzt nach dem 1.10.2014) oder erste Vermietung nach umfassender Modernisierung (§ 556f)',{typ:'check',voll:true})+'</div>'
    +wzHinweis('Die Mietpreisbremse gilt nur in Gemeinden, die die Landesregierung als angespannten Wohnungsmarkt bestimmt hat — vorher prüfen.'));
  return '<div class="wz-grid"><div>'
    +wzBox('Wohnung','<div class="grid">'+wzFeld('modus','Was soll gerechnet werden?',{typ:'wahl',zeichnen:true,optionen:[['558','Anpassung an die Vergleichsmiete (§ 558)'],['559','Modernisierungsumlage (§ 559)'],['556d','Neuvermietung mit Mietpreisbremse (§ 556d)']]})
      +wzFeld('wohnflaeche','Wohnfläche',{typ:'betrag',einheit:'m²'})+(m==='556d'?'':wzFeld('miete','Heutige Miete',{typ:'betrag',einheit:'€/Monat netto kalt'}))+'</div>')
    +teil+'</div><div>'
    +wzBox('Ergebnis','<div id="wz_miete_ergebnis"></div>',{klasse:'wz-ergebnis'})
    +wzBox('Hinweise','<ul class="wz-liste">'+mieteHinweise(m).map(h=>'<li>'+h+'</li>').join('')+'</ul>')
    +'</div></div>';
}
function mieteHinweise(m){
  if(m==='558') return ['Erhöhung bis zur ortsüblichen Vergleichsmiete; in drei Jahren höchstens 20 % (15 % in Gemeinden mit abgesenkter Kappungsgrenze), Erhöhungen wegen Modernisierung oder Betriebskosten zählen nicht mit (§ 558 Abs. 3 BGB).',
    'Die Miete muss beim Wirksamwerden seit 15 Monaten unverändert sein; das Verlangen frühestens ein Jahr nach der letzten Erhöhung (§ 558 Abs. 1).',
    'In Textform mit Begründung: Mietspiegel, Mietdatenbank, Gutachten oder drei Vergleichswohnungen (§ 558a). Stimmt der Mieter bis Ende des zweiten Kalendermonats nicht zu, kann innerhalb von drei weiteren Monaten auf Zustimmung geklagt werden (§ 558b).',
    'Orientierung, keine Rechtsberatung.'];
  if(m==='559') return ['Jährlich 8 % der für die Wohnung aufgewendeten Kosten, ohne ersparte Erhaltungskosten und ohne Fördermittel (§§ 559, 559a BGB).',
    'In sechs Jahren höchstens 3 €/m² mehr, bei einer Miete unter 7 €/m² höchstens 2 €/m² (§ 559 Abs. 3a). Härtefälle beim Mieter können die Erhöhung ausschließen (§ 559 Abs. 4).',
    'Wirkung ab Beginn des dritten Monats nach Zugang der Erklärung, ohne ordnungsgemäße Ankündigung sechs Monate später (§ 559b Abs. 2).',
    'Für den Einbau einer Heizung nach dem GEG gelten Sonderregeln (§ 559e BGB) — hier nicht gerechnet.','Orientierung, keine Rechtsberatung.'];
  return ['Bei Wiedervermietung in Gebieten mit angespanntem Wohnungsmarkt höchstens 10 % über der ortsüblichen Vergleichsmiete (§ 556d BGB).',
    'Eine höhere Miete des Vormieters darf weiter verlangt werden (§ 556e); nicht anzuwenden bei Neubau und erster Vermietung nach umfassender Modernisierung (§ 556f).',
    'Orientierung, keine Rechtsberatung.'];
}
function mieteRechnen(S){
  let E=mieteEingabe(S), z=(t,w,o)=>'<div class="row-calc'+(o?' wz-summe':'')+'"><span>'+t+'</span><b>'+w+'</b></div>', h='';
  if(!(E.wohnflaeche>0)){ wzH('wz_miete_ergebnis',wzHinweis('Wohnfläche eintragen.')); return; }
  if(S.modus==='558'){
    let r=ImmoBeratung.mieterhoehung558(E);
    h=z('Heutige Miete',wzEur(r.alt)+' ('+wzZ(r.altM2,2)+' €/m²)')+z('Ortsübliche Vergleichsmiete',wzEur(r.vergleichsmiete))+z('Kappungsgrenze ('+wzZ(r.kappungProzent,0)+' % in 3 Jahren)',wzEur(r.kappGrenze))
      +'<div class="subtotal"><span>Neue Miete</span><span>'+wzEur(r.neu)+'</span></div>'+z('Erhöhung',wzEur(r.erhoehung)+' im Monat ('+wzP(r.prozent,1)+')')+z('je m²',wzZ(r.neuM2,2)+' €/m²')
      +(r.begrenzt==='kappung'?wzHinweis('Begrenzt durch die Kappungsgrenze.'):r.begrenzt==='vergleichsmiete'?wzHinweis('Die Miete liegt schon auf oder über der Vergleichsmiete — keine Erhöhung nach § 558.'):'')
      +(r.wirksam?z('Zustimmung bis',wzDatum(r.zustimmungBis))+z('Neue Miete ab',wzDatum(r.wirksam))+z('Klage auf Zustimmung bis',wzDatum(r.klageBis)):'')
      +(r.fristOk?'':wzAmpel('rot','Zu früh: Sperrfrist oder 15-Monats-Frist ist nicht eingehalten'+(r.fruehesterZugang?' — frühestens Zugang am '+wzDatum(r.fruehesterZugang):'')+'.'));
  } else if(S.modus==='559'){
    let r=ImmoBeratung.modernisierung559(E);
    h=z('Kosten',wzEur(r.kosten))+z('− ersparte Erhaltung'+(r.vereinfacht?' (30 % pauschal)':''),wzEur(r.erhaltung))+z('− Fördermittel',wzEur(r.drittmittel))
      +z('umlagefähig',wzEur(r.umlagefaehig))+z('8 % im Jahr',wzEur(r.jahr))+z('im Monat',wzEur(r.monatRoh))+z('Kappung ('+r.grenzeM2+' €/m² in 6 Jahren)',wzEur(r.kappMonat))
      +'<div class="subtotal"><span>Erhöhung im Monat</span><span>'+wzEur(r.erhoehung)+'</span></div>'+z('Neue Miete',wzEur(r.neu)+' ('+wzZ(r.neuM2,2)+' €/m²)')
      +(r.gekappt?wzHinweis('Durch die Kappung begrenzt.'):'')+(r.wirksam?z('Neue Miete ab',wzDatum(r.wirksam)):'')
      +(r.zuVielFuerVereinfacht?wzAmpel('rot','Vereinfachtes Verfahren nur bis 10.000 € Kosten (§ 559c) — gerechnet wurde ohne Pauschale.'):'');
  } else {
    let r=ImmoBeratung.mietpreisbremse(E);
    h=r.gilt?z('Vergleichsmiete + 10 %',wzEur(r.grenze)+' ('+wzZ(r.grenze/E.wohnflaeche,2)+' €/m²)')+(E.vormiete>0?z('Miete des Vormieters',wzEur(E.vormiete)):'')
      +'<div class="subtotal"><span>Höchstens zulässig</span><span>'+wzEur(r.hoechst)+'</span></div>'+(r.vormieteHoeher?wzHinweis('Die höhere Vormiete darf weiter verlangt werden (§ 556e).'):'')
      :wzAmpel('gruen','Die Mietpreisbremse gilt hier nicht (§ 556f) — die Miete ist frei vereinbar (Grenze: Mietwucher).');
  }
  wzH('wz_miete_ergebnis',h);
}
function mieteDokument(S){
  let E=mieteEingabe(S); if(!(E.wohnflaeche>0)){ alert('Bitte zuerst die Wohnfläche eintragen.'); return null; }
  let titel={558:'Mieterhöhung auf die Vergleichsmiete',559:'Mieterhöhung nach Modernisierung','556d':'Neuvermietung mit Mietpreisbremse'}[S.modus], t;
  if(S.modus==='558'){ let r=ImmoBeratung.mieterhoehung558(E);
    t=wzDokTabelle([['Wohnfläche',wzZ(E.wohnflaeche,2)+' m²'],['Heutige Miete',wzEur(r.alt)],['Vergleichsmiete ('+sEsc(S.quelle||'')+')',wzZ(E.vergleichM2,2)+' €/m² = '+wzEur(r.vergleichsmiete)],
      ['Kappungsgrenze',wzZ(r.kappungProzent,0)+' % = '+wzEur(r.kappGrenze)],['Neue Miete',wzEur(r.neu)+' ('+wzZ(r.neuM2,2)+' €/m²)',{summe:true}],['Erhöhung',wzEur(r.erhoehung)+' ('+wzP(r.prozent,1)+')'],
      r.wirksam?['Zustimmung bis / neue Miete ab',wzDatum(r.zustimmungBis)+' / '+wzDatum(r.wirksam)]:null]); }
  else if(S.modus==='559'){ let r=ImmoBeratung.modernisierung559(E);
    t=wzDokTabelle([['Kosten für die Wohnung',wzEur(r.kosten)],['− ersparte Erhaltung',wzEur(r.erhaltung)],['− Fördermittel',wzEur(r.drittmittel)],['umlagefähig',wzEur(r.umlagefaehig)],
      ['8 % im Jahr / Monat',wzEur(r.jahr)+' / '+wzEur(r.monatRoh)],['Erhöhung im Monat (nach Kappung)',wzEur(r.erhoehung),{summe:true}],['Neue Miete',wzEur(r.neu)],r.wirksam?['Neue Miete ab',wzDatum(r.wirksam)]:null]); }
  else { let r=ImmoBeratung.mietpreisbremse(E);
    t=r.gilt?wzDokTabelle([['Vergleichsmiete',wzZ(E.vergleichM2,2)+' €/m²'],['Grenze (+10 %)',wzEur(r.grenze)],E.vormiete?['Miete des Vormieters',wzEur(E.vormiete)]:null,['Höchstens zulässig',wzEur(r.hoechst),{summe:true}]]):'<p>Die Mietpreisbremse gilt nicht (§ 556f BGB).</p>'; }
  return {titel:titel+' '+new Date().toLocaleDateString('de-DE'),html:'<h1>'+titel+'</h1><p class="wzd-unter">Berechnung für den Vermieter</p>'+t
    +'<h2>Hinweise</h2><ul>'+mieteHinweise(S.modus).map(h=>'<li>'+h+'</li>').join('')+'</ul>',fuss:'Orientierung nach BGB, keine Rechtsberatung.'};
}
function mieteKundeText(S){
  let E=mieteEingabe(S); if(!(E.wohnflaeche>0)){ alert('Bitte zuerst die Wohnfläche eintragen.'); return ''; }
  if(S.modus==='558'){ let r=ImmoBeratung.mieterhoehung558(E); return 'Mieterhöhung § 558: von '+wzEur(r.alt)+' auf '+wzEur(r.neu)+' (+'+wzP(r.prozent,1)+')'+(r.wirksam?', ab '+wzDatum(r.wirksam):'')+'.'; }
  if(S.modus==='559'){ let r=ImmoBeratung.modernisierung559(E); return 'Modernisierungsumlage § 559: +'+wzEur(r.erhoehung)+' im Monat, neue Miete '+wzEur(r.neu)+'.'; }
  let r=ImmoBeratung.mietpreisbremse(E); return r.gilt?'Neuvermietung: höchstens '+wzEur(r.hoechst)+' im Monat (Mietpreisbremse).':'Neuvermietung: Mietpreisbremse gilt nicht (§ 556f).';
}
function mieteAusBewertung(S){
  let wf=num('ek_wohnflaeche'), m=num('ek_miete_wohnen');
  if(wf>0) S.wohnflaeche=String(wf).replace('.',','); if(m>0) S.miete=String(Math.round(m/12));
}
wzRegistrieren({id:'miete',titel:'Mieterhöhung',sub:'Vergleichsmiete · Modernisierung · Mietpreisbremse',icon:'trending-up',start:mieteStart,zeichnen:mieteZeichnen,rechnen:mieteRechnen,
  dokument:mieteDokument,kundeText:mieteKundeText,ausBewertung:mieteAusBewertung});
