/* ---------- Kachel „Wohnen im Alter“ (D38) ----------
   Für Eigentümer im Alter: Verkauf mit Wohnrecht (Einmalzahlung), Leibrente, Teilverkauf, Verkaufen und zurückmieten,
   Behalten — nebeneinander, was sofort, monatlich und für die Erben bleibt. Modellrechnung mit der Sterbetafel
   (js/beratung.js, ImmoBeratung.verrentung); Angebote der Anbieter weichen ab. Keine Namen. */
function renteStart(){
  return {wert:'',miete:'',personen:[{alter:'',g:'w'},{alter:'',g:'m'}],zweiPersonen:false,zins:'3,0',abschlag:'0',garantie:'0',
    teilAnteil:'50',teilEntgelt:'5,0',teilGebuehr:'3,5',kreditZins:'3,5',rueckMiete:'',rueckKosten:'3,57',wertsteigerung:'1,5'};
}
function renteEingabe(S){
  return {wert:wzN(S.wert,true),miete:wzN(S.miete,true),personen:(S.personen||[]).slice(0,S.zweiPersonen?2:1).map(p=>({alter:wzN(p.alter),g:p.g==='m'?'m':'w'})).filter(p=>p.alter>0),
    zins:wzN(S.zins),abschlag:wzN(S.abschlag),garantie:wzN(S.garantie),teilAnteil:wzN(S.teilAnteil),teilEntgelt:wzN(S.teilEntgelt),teilGebuehr:wzN(S.teilGebuehr),kreditZins:S.kreditZins==null?3.5:wzN(S.kreditZins),
    rueckMiete:String(S.rueckMiete||'').trim()===''?'':wzN(S.rueckMiete,true),rueckKosten:wzN(S.rueckKosten),wertsteigerung:wzN(S.wertsteigerung)};
}
function renteZeichnen(S){
  let personen=(S.personen||[]).slice(0,S.zweiPersonen?2:1).map((p,i)=>'<div class="wz-reihe wz-reihe-2">'
    +wzFeld('personen.'+i+'.alter','Person '+(i+1)+': Alter',{typ:'zahl',einheit:'Jahre'})
    +wzFeld('personen.'+i+'.g','Geschlecht',{typ:'wahl',optionen:[['w','weiblich'],['m','männlich']]})+'</div>').join('');
  return '<div class="wz-grid"><div>'
    +wzBox('Eigentümer',wzFeld('zweiPersonen','Ehepaar / zwei Personen (Leistung bis zum Tod des Letztversterbenden)',{typ:'check',zeichnen:true})+personen)
    +wzBox('Immobilie','<div class="grid">'
      +wzFeld('wert','Verkehrswert',{typ:'betrag',einheit:'€'})
      +wzFeld('miete','Ortsübliche Miete (netto kalt)',{typ:'betrag',einheit:'€/Monat',hinweis:'Grundlage für den Wert des Wohnrechts'})
      +wzFeld('wertsteigerung','Wertsteigerung',{typ:'prozent',einheit:'% im Jahr (Annahme)'})
      +wzFeld('zins','Rechnungszins',{typ:'prozent',einheit:'% (Annahme)',hinweis:'je höher, desto niedriger der Wert des Wohnrechts und desto höher die Rente'})+'</div>')
    +wzBox('Annahmen zu den Wegen','<div class="grid">'
      +wzFeld('abschlag','Abschlag beim Verkauf mit Wohnrecht',{typ:'prozent',einheit:'% (Anbieter, Instandhaltung)'})
      +wzFeld('garantie','Rentengarantiezeit',{typ:'zahl',einheit:'Jahre'})
      +wzFeld('teilAnteil','Teilverkauf: verkaufter Anteil',{typ:'prozent',einheit:'%'})
      +wzFeld('teilEntgelt','Teilverkauf: Nutzungsentgelt',{typ:'prozent',einheit:'% des Anteils im Jahr',hinweis:'Marktübersichten 2025/26: etwa 4,75–5,75 %'})
      +wzFeld('teilGebuehr','Teilverkauf: Entgelt beim späteren Verkauf',{typ:'prozent',einheit:'% vom Verkaufspreis',hinweis:'üblich etwa 3–6 %'})
      +wzFeld('kreditZins','Kredit mit Grundschuld: Zins',{typ:'prozent',einheit:'% im Jahr',hinweis:'gleicher Betrag wie beim Teilverkauf; Zinsen monatlich'})
      +wzFeld('rueckMiete','Rückmiete',{typ:'betrag',einheit:'€/Monat',ph:'wie ortsübliche Miete'})
      +wzFeld('rueckKosten','Verkaufskosten bei Rückmiete',{typ:'prozent',einheit:'% (z. B. Makler)'})+'</div>')
    +'</div><div>'
    +wzBox('Ergebnis','<div id="wz_rente_kopf"></div><div id="wz_rente_tab"></div>',{klasse:'wz-ergebnis'})
    +wzBox('Hinweise','<ul class="wz-liste">'+renteHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>')
    +'</div></div>';
}
function renteHinweise(){
  return ['Modellrechnung mit der Sterbetafel des Statistischen Bundesamts '+(window.ImmoSterbetafel?ImmoSterbetafel.zeitraum:'')+' (monatliche Zahlung, bei zwei Personen bis zum Tod des Letztversterbenden). Angebote der Anbieter enthalten eigene Abschläge, Zinsen und Gebühren.',
    '„Summe“ ist der Betrag bis zur erwarteten Lebensdauer ohne Zinsen; wer länger lebt, bekommt bei der Leibrente mehr, beim Teilverkauf zahlt er länger das Nutzungsentgelt.',
    'Wohnrecht, Nießbrauch und Leibrente im Grundbuch absichern (Rangstelle). Beim Teilverkauf Laufzeit und Anpassung des Nutzungsentgelts, Rückkaufrecht und die Kosten beim späteren Verkauf prüfen.',
    'Kredit statt Teilverkauf: Die Verbraucherzentrale weist darauf hin, dass ein Darlehen gegenüber einem Nutzungsentgelt von rund 5 % plus Entgelten deutlich günstiger sein kann. Der Weg „Kredit mit Grundschuld“ rechnet denselben Betrag mit laufenden Zinsen; Tragfähigkeit und Kreditwürdigkeit prüft die Baufinanzierung.',
    'Steuer: Die Leibrente aus einem Verkauf ist nur mit dem Ertragsanteil einkommensteuerpflichtig (§ 22 Nr. 1 Satz 3 Buchst. a Doppelbuchst. bb EStG, z. B. 15 % bei Rentenbeginn mit 70, 11 % mit 75).',
    'Orientierung im Beratungsgespräch, keine Anlage- oder Rechtsberatung.'];
}
function renteRechnen(S){
  let E=renteEingabe(S);
  if(!(E.wert>0)||!E.personen.length){ wzH('wz_rente_kopf','<p class="hint" style="margin:0">Alter und Verkehrswert eintragen (Wert auch „Aus Bewertung“).</p>'); wzH('wz_rente_tab',''); return; }
  let r=ImmoBeratung.verrentung(E);
  wzH('wz_rente_kopf','<div class="kpis wz-kpis"><div class="kpi"><span>Erwartete Lebensdauer</span><b>'+wzZ(r.n,1)+' Jahre</b></div>'
    +'<div class="kpi"><span>Wert des Wohnrechts</span><b>'+wzEur(r.wohnrecht)+'</b></div><div class="kpi"><span>Rentenfaktor</span><b>'+wzZ(r.fGarantie,2)+'</b></div></div>');
  let z=(t,w,k)=>'<div class="row-calc'+(k?' '+k:'')+'"><span>'+t+'</span><b>'+w+'</b></div>', geld=x=>(x<0?'− ':'')+wzEur(Math.abs(x));
  wzH('wz_rente_tab',r.wege.map(w=>'<div class="wz-karte"><div class="wz-karte-kopf"><b>'+sEsc(w.name)+'</b><span>'+sEsc(w.wohnen)+'</span></div>'
      +(w.sofort?z('sofort',wzEur(w.sofort)):'')+(w.monatlich?z('monatlich',geld(w.monatlich)):'')
      +(w.monatlichVerrentet!=null?z('monatlich, Erlös verrentet und Miete bezahlt',geld(w.monatlichVerrentet)):'')
      +(w.summe?z('Summe bis ~'+wzZ(r.n,0)+' Jahre (ohne Zinsen)',geld(w.summe)):'')+z('für die Erben',w.erben?wzEur(w.erben):'–','wz-summe')+'</div>').join('')
    +'<p class="hint">Werte für die Erben nach '+wzZ(r.n,0)+' Jahren mit '+wzP(E.wertsteigerung,1)+' Wertsteigerung im Jahr.</p>');
}
function renteKundeText(S){
  let E=renteEingabe(S); if(!(E.wert>0)||!E.personen.length){ alert('Bitte zuerst Alter und Verkehrswert eintragen.'); return ''; }
  let r=ImmoBeratung.verrentung(E);
  return 'Modellrechnung Wohnen im Alter (Verkehrswert '+wzEur(E.wert)+', erwartete Lebensdauer '+wzZ(r.n,1)+' Jahre): '
    +r.wege.map(w=>w.name+': '+(w.sofort?'sofort '+wzEur(w.sofort):'')+(w.monatlich?(w.sofort?', ':'')+'monatlich '+(w.monatlich<0?'− ':'')+wzEur(Math.abs(w.monatlich)):'')+(w.erben?', für Erben '+wzEur(w.erben):'')).join('; ')+'.';
}
function renteDokument(S){
  let E=renteEingabe(S); if(!(E.wert>0)||!E.personen.length){ alert('Bitte zuerst Alter und Verkehrswert eintragen.'); return null; }
  let r=ImmoBeratung.verrentung(E);
  return {titel:'Wohnen im Alter '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Wohnen im Alter</h1><p class="wzd-unter">Modellrechnung: Wege, aus der eigenen Immobilie Geld zu erhalten</p>'
      +'<h2>Ausgangslage</h2>'+wzDokTabelle([['Verkehrswert',wzEur(E.wert)],['Ortsübliche Miete',wzEur(E.miete)+' im Monat'],
        ['Eigentümer',E.personen.map(p=>p.alter+' Jahre, '+(p.g==='m'?'männlich':'weiblich')).join(' und ')],['Erwartete Lebensdauer',wzZ(r.n,1)+' Jahre'],
        ['Wert des lebenslangen Wohnrechts',wzEur(r.wohnrecht)],['Rechnungszins / Wertsteigerung',wzP(E.zins,1)+' / '+wzP(E.wertsteigerung,1)+' im Jahr']])
      +'<h2>Die Wege im Vergleich</h2>'+wzDokTabelle(r.wege.map(w=>[sEsc(w.name),w.sofort?wzEur(w.sofort):'–',w.monatlich?(w.monatlich<0?'− ':'')+wzEur(Math.abs(w.monatlich)):'–',
        w.erben?wzEur(w.erben):'–',sEsc(w.wohnen)]),['Weg','sofort','monatlich','für die Erben','Wohnen'])
      +'<h2>Hinweise</h2><ul>'+renteHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>',
    fuss:'Modellrechnung mit der Sterbetafel, keine Angebote von Anbietern.'};
}
function renteAusBewertung(S){
  let R=wzBewertung(); S.wert=String(Math.round(R.empfehlung));
  let m=num('ek_miete_wohnen'); if(m>0) S.miete=String(Math.round(m/12));
}
wzRegistrieren({id:'rente',titel:'Wohnen im Alter',sub:'Einmalzahlung · Leibrente · Teilverkauf · Rückmiete',icon:'hourglass',start:renteStart,zeichnen:renteZeichnen,rechnen:renteRechnen,
  dokument:renteDokument,kundeText:renteKundeText,ausBewertung:renteAusBewertung});
