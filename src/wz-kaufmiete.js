/* ---------- Kachel „Kaufen oder Mieten“ (D40) ----------
   Vermögensvergleich für das Beratungsgespräch: Eigentum mit Finanzierung gegen Miete mit angelegtem Eigenkapital, bei gleicher
   monatlicher Belastung (wer weniger zahlt, legt den Unterschied an). Rechnung in js/beratung.js (kaufMiete), unabhängig
   nachgerechnet in tests/referenz/kaufmiete.py. Alle Werte sind Annahmen — eine Modellrechnung, keine Anlageberatung. */
function kmStart(){ return {preis:'400.000',nk:'10,57',ek:'100.000',zins:'3,5',tilgung:'2',jahre:'30',instandhaltung:'4.000',kostensteigerung:'2',wertsteigerung:'1,5',miete:'1.300',mietsteigerung:'2',anlagezins:'3,5'}; }
function kmEingabe(S){
  return {preis:wzN(S.preis,true),nk:wzN(S.nk),ek:wzN(S.ek,true),zins:wzN(S.zins),tilgung:wzN(S.tilgung),jahre:wzN(S.jahre),instandhaltung:wzN(S.instandhaltung,true),
    kostensteigerung:wzN(S.kostensteigerung),wertsteigerung:wzN(S.wertsteigerung),miete:wzN(S.miete,true),mietsteigerung:wzN(S.mietsteigerung),anlagezins:wzN(S.anlagezins)};
}
function kmZeichnen(S){
  return '<div class="wz-grid grid">'
    +wzBox('Kaufen','<div class="grid">'+wzFeld('preis','Kaufpreis',{typ:'betrag',einheit:'€'})
      +wzFeld('nk','Kaufnebenkosten',{typ:'prozent',einheit:'%',hinweis:'Grunderwerbsteuer (Baden-Württemberg 5,0 %), Notar und Grundbuch (etwa 2 %), Maklerprovision'})
      +wzFeld('ek','Eigenkapital',{typ:'betrag',einheit:'€'})+wzFeld('zins','Sollzins',{typ:'prozent',einheit:'% p. a.'})+wzFeld('tilgung','anfängliche Tilgung',{typ:'prozent',einheit:'% p. a.'})
      +wzFeld('instandhaltung','Instandhaltung',{typ:'betrag',einheit:'€ im Jahr',hinweis:'grob 1 % des Kaufpreises im Jahr; bei Wohnungen Rücklage plus Sonderumlagen'})
      +wzFeld('kostensteigerung','Kostensteigerung',{typ:'prozent',einheit:'% p. a.'})+wzFeld('wertsteigerung','Wertsteigerung der Immobilie',{typ:'prozent',einheit:'% p. a.'})+'</div>')
    +wzBox('Mieten','<div class="grid">'+wzFeld('miete','Kaltmiete einer vergleichbaren Wohnung',{typ:'betrag',einheit:'€ im Monat'})
      +wzFeld('mietsteigerung','Mietsteigerung',{typ:'prozent',einheit:'% p. a.'})+wzFeld('anlagezins','Rendite der Geldanlage nach Steuern',{typ:'prozent',einheit:'% p. a.'})
      +wzFeld('jahre','Betrachtungszeitraum',{typ:'zahl',einheit:'Jahre'})+'</div>'
      +wzHinweis('Der Mieter legt sein Eigenkapital an. Jeden Monat legt die Seite, die weniger zahlt, den Unterschied zur anderen an — so ist die Belastung gleich.'))
    +'</div><div id="wz_km_ergebnis"></div>';
}
function kmDiagramm(r){
  let z=r.zeilen, n=z.length-1, max=Math.max(1,...z.map(x=>Math.max(x.kauf,x.miete))), min=Math.min(0,...z.map(x=>Math.min(x.kauf,x.miete)));
  const W=640,H=230,L=64,R=12,T=12,B=28, x=j=>L+(W-L-R)*j/Math.max(1,n), y=v=>T+(H-T-B)*(1-(v-min)/(max-min||1));
  const linie=k=>z.map((p,i)=>(i?'L':'M')+x(p.jahr).toFixed(1)+' '+y(p[k]).toFixed(1)).join(' ');
  let ticks=[0,0.25,0.5,0.75,1].map(t=>min+(max-min)*t), jahre=[...new Set([0,Math.round(n/4),Math.round(n/2),Math.round(3*n/4),n])];
  return '<svg class="km-diagramm" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Vermögen Kaufen und Mieten über '+n+' Jahre">'
    +ticks.map(v=>'<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" class="km-gitter"/><text x="'+(L-6)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+Math.round(v/1000).toLocaleString('de-DE')+' T€</text>').join('')
    +jahre.map(j=>'<text x="'+x(j).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+j+'</text>').join('')
    +(r.abJahr?'<line x1="'+x(r.abJahr).toFixed(1)+'" x2="'+x(r.abJahr).toFixed(1)+'" y1="'+T+'" y2="'+(H-B)+'" class="km-ab"/>':'')
    +'<path d="'+linie('miete')+'" class="km-miete"/><path d="'+linie('kauf')+'" class="km-kauf"/></svg>'
    +'<div class="km-legende"><span class="km-l-kauf">Kaufen</span><span class="km-l-miete">Mieten und anlegen</span>'+(r.abJahr?'<span class="km-l-ab">Kaufen vorn ab Jahr '+r.abJahr+'</span>':'')+'</div>';
}
function kmRechnen(S){
  let e=kmEingabe(S), box=$('wz_km_ergebnis'); if(!box) return;
  if(!(e.preis>0)||!(e.miete>0)){ box.innerHTML=wzHinweis('Kaufpreis und Miete eintragen.'); return; }
  let r=ImmoBeratung.kaufMiete(e), n=r.zeilen.length-1, schritt=n>20?5:n>10?2:1;
  let tab=r.zeilen.filter(z=>z.jahr%schritt===0||z.jahr===n).map(z=>'<tr><td>'+z.jahr+'</td><td class="r">'+wzEur(z.kauf)+'</td><td class="r">'+wzEur(z.miete)+'</td><td class="r '+(z.kauf>=z.miete?'wz-plus':'wz-minus')+'">'+(z.kauf>=z.miete?'+':'')+wzEur(z.kauf-z.miete)+'</td>'
    +'<td class="r">'+wzEur(z.restschuld)+'</td><td class="r">'+wzEur(z.mieteMonat)+'</td></tr>').join('');
  box.innerHTML='<div class="wz-kpis grid">'+wzdKpi('Monatliche Rate',wzEur(r.rate),'Darlehen '+wzEur(r.darlehen))
      +wzdKpi('Kaufnebenkosten',wzEur(r.nebenkosten),'sofort verbraucht')
      +wzdKpi('Vermögen nach '+n+' Jahren',wzEur(r.ende.kauf),'Kaufen · Mieten '+wzEur(r.ende.miete))
      +wzdKpi('Unterschied',(r.vorteil>=0?'+':'')+wzEur(r.vorteil),r.vorteil>=0?'zugunsten Kaufen':'zugunsten Mieten')+'</div>'
    +wzAmpel(r.abJahr?'gruen':'gelb',r.abJahr?'Unter diesen Annahmen liegt Kaufen ab Jahr '+r.abJahr+' vorn'+(r.getilgtNachMonaten?' — das Darlehen ist nach '+Math.floor(r.getilgtNachMonaten/12)+' Jahren und '+(r.getilgtNachMonaten%12)+' Monaten getilgt':'')+'.'
      :'Unter diesen Annahmen liegt Mieten mit Geldanlage über den ganzen Zeitraum vorn.')
    +wzBox('Vermögen über die Jahre',kmDiagramm(r))
    +wzBox('Jahresübersicht','<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Jahr</th><th>Vermögen Kaufen</th><th>Vermögen Mieten</th><th>Unterschied</th><th>Restschuld</th><th>Miete im Monat</th></tr></thead><tbody>'+tab+'</tbody></table></div>')
    +wzHinweis('Modellrechnung zur Orientierung: Zinsbindung, Anschlusszins, Steuern auf Erträge, Sondertilgung und Lebensumstände bleiben außen vor. Kleine Änderungen bei Wertsteigerung, Rendite und Mietsteigerung verschieben das Ergebnis deutlich — Annahmen gemeinsam festlegen.');
}
function kmAusBewertung(S){
  let R=wzBewertung(); if(!R) return;
  S.preis=String(Math.round(R.empfehlung/1000)*1000);
  let jm=num('ek_miete_wohnen'); if(jm>0) S.miete=String(Math.round(jm/12));   // in der Bewertung: Jahresmiete
}
function kmDokument(S){
  let e=kmEingabe(S); if(!(e.preis>0)||!(e.miete>0)){ alert('Bitte Kaufpreis und Miete eintragen.'); return null; }
  let r=ImmoBeratung.kaufMiete(e), n=r.zeilen.length-1;
  return {titel:'Kaufen oder Mieten',
    html:'<h1>Kaufen oder Mieten</h1><p class="wzd-unter">Vermögensvergleich über '+n+' Jahre · Modellrechnung</p>'
      +wzDokTabelle([['Kaufpreis',wzEur(e.preis)],['Kaufnebenkosten',wzP(e.nk,2)+' · '+wzEur(r.nebenkosten)],['Eigenkapital',wzEur(e.ek)],['Darlehen',wzEur(r.darlehen)],
        ['Sollzins / anfängliche Tilgung',wzP(e.zins,2)+' / '+wzP(e.tilgung,2)],['Monatliche Rate',wzEur(r.rate)],['Instandhaltung',wzEur(e.instandhaltung)+' im Jahr, +'+wzP(e.kostensteigerung,1)+' jährlich'],
        ['Wertsteigerung',wzP(e.wertsteigerung,1)+' im Jahr'],['Kaltmiete',wzEur(e.miete)+' im Monat, +'+wzP(e.mietsteigerung,1)+' jährlich'],['Rendite der Geldanlage nach Steuern',wzP(e.anlagezins,1)+' im Jahr']])
      +'<h2>Ergebnis</h2>'+wzDokTabelle([['Vermögen nach '+n+' Jahren — Kaufen',wzEur(r.ende.kauf)],['Vermögen nach '+n+' Jahren — Mieten',wzEur(r.ende.miete)],
        ['Unterschied',(r.vorteil>=0?'+':'')+wzEur(r.vorteil),{summe:true}],['Kaufen liegt vorn ab',r.abJahr?'Jahr '+r.abJahr:'nicht im Zeitraum']])
      +'<h2>Verlauf</h2>'+wzDokTabelle(r.zeilen.filter(z=>z.jahr%5===0||z.jahr===n).map(z=>[String(z.jahr),wzEur(z.kauf),wzEur(z.miete),wzEur(z.restschuld)]),['Jahr','Kaufen','Mieten','Restschuld'])
      +'<p class="wzd-klein">Gleiche monatliche Belastung: Die günstigere Seite legt den Unterschied an. Ohne Zinsbindungsende, Steuern auf Erträge und Sondertilgungen. Alle Werte sind Annahmen.</p>',
    fuss:'Modellrechnung zur Orientierung, keine Anlageberatung.'};
}
function kmKundeText(S){
  let e=kmEingabe(S); if(!(e.preis>0)||!(e.miete>0)) return '';
  let r=ImmoBeratung.kaufMiete(e), n=r.zeilen.length-1;
  return 'Kaufen oder Mieten: Kaufpreis '+wzEur(e.preis)+', Rate '+wzEur(r.rate)+' gegen Miete '+wzEur(e.miete)+'. Nach '+n+' Jahren Kaufen '+wzEur(r.ende.kauf)+', Mieten '+wzEur(r.ende.miete)
    +(r.abJahr?' — Kaufen vorn ab Jahr '+r.abJahr:' — Mieten vorn')+'.';
}
wzRegistrieren({id:'kaufmiete',titel:'Kaufen oder Mieten',sub:'Vermögen nach Jahren · Eigentum gegen Miete und Anlage',icon:'scale',start:kmStart,
  zeichnen:kmZeichnen,rechnen:kmRechnen,ausBewertung:kmAusBewertung,dokument:kmDokument,kundeText:kmKundeText});
