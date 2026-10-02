/* ---------- Kachel „Grundstückspotenzial“ (D38) ----------
   Großes Grundstück oder altes Haus: Was kann ein Bauträger für das Grundstück zahlen? Bauträgerkalkulation (Residualwert)
   gegen Bodenrichtwert und gegen den Verkauf des Bestands — Verhandlungsgrundlage, kein Bodenwert nach ImmoWertV.
   Rechnung in js/beratung.js (ImmoBeratung.residualwert); alle Marktannahmen sind Eingaben. */
function gsStart(){
  return {grundstueck:'',bodenrichtwert:'',gfz:'',geschossflaeche:'',wfFaktor:'75',wohnflaeche:'',verkaufM2:'',stellplaetze:'0',stellplatzPreis:'',
    baukostenM2:'',baunebenkosten:'20',abriss:'',erschliessung:'',zins:'5',bauzeitMonate:'18',vermarktungMonate:'6',vermarktung:'3',wagnis:'15',
    erwerbsnebenkosten:'6,5',wartezeitJahre:'0',bestand:''};
}
function gsEingabe(S){
  return {grundstueck:wzN(S.grundstueck,true),bodenrichtwert:wzN(S.bodenrichtwert,true),gfz:wzN(S.gfz),geschossflaeche:wzN(S.geschossflaeche,true),wfFaktor:wzN(S.wfFaktor),
    wohnflaeche:wzN(S.wohnflaeche,true),verkaufM2:wzN(S.verkaufM2,true),stellplaetze:wzN(S.stellplaetze),stellplatzPreis:wzN(S.stellplatzPreis,true),baukostenM2:wzN(S.baukostenM2,true),
    baunebenkosten:wzN(S.baunebenkosten),abriss:wzN(S.abriss,true),erschliessung:wzN(S.erschliessung,true),zins:wzN(S.zins),bauzeitMonate:wzN(S.bauzeitMonate),
    vermarktungMonate:wzN(S.vermarktungMonate),vermarktung:wzN(S.vermarktung),wagnis:wzN(S.wagnis),erwerbsnebenkosten:wzN(S.erwerbsnebenkosten),wartezeitJahre:wzN(S.wartezeitJahre)};
}
function gsZeichnen(S){
  return '<div class="wz-grid"><div>'
    +wzBox('Grundstück und Baurecht','<div class="grid">'
      +wzFeld('grundstueck','Grundstücksfläche',{typ:'betrag',einheit:'m²'})+wzFeld('bodenrichtwert','Bodenrichtwert',{typ:'betrag',einheit:'€/m²'})
      +wzFeld('gfz','Geschossflächenzahl (GFZ)',{typ:'zahl',hinweis:'aus Bebauungsplan oder Umgebung (§ 34 BauGB)'})
      +wzFeld('geschossflaeche','oder Geschossfläche direkt',{typ:'betrag',einheit:'m²'})
      +wzFeld('wfFaktor','Wohnfläche je Geschossfläche',{typ:'prozent',einheit:'% (Annahme)'})+wzFeld('wohnflaeche','oder Wohnfläche direkt',{typ:'betrag',einheit:'m²'})+'</div>')
    +wzBox('Erlös','<div class="grid">'+wzFeld('verkaufM2','Verkaufspreis Neubau',{typ:'betrag',einheit:'€/m² Wohnfläche',hinweis:'aus Marktbericht oder Vergleichsangeboten'})
      +wzFeld('stellplaetze','Stellplätze',{typ:'zahl'})+wzFeld('stellplatzPreis','Preis je Stellplatz',{typ:'betrag',einheit:'€'})+'</div>')
    +wzBox('Kosten (Annahmen)','<div class="grid">'
      +wzFeld('baukostenM2','Baukosten',{typ:'betrag',einheit:'€/m² Wohnfläche',hinweis:'Bauwerk und Technik (Kostengruppen 300 und 400)'})
      +wzFeld('baunebenkosten','Baunebenkosten',{typ:'prozent',einheit:'% der Baukosten'})
      +wzFeld('abriss','Abriss und Freilegung',{typ:'betrag',einheit:'€'})+wzFeld('erschliessung','Erschließung, Anschlüsse',{typ:'betrag',einheit:'€'})
      +wzFeld('zins','Finanzierungszins',{typ:'prozent',einheit:'% im Jahr'})+wzFeld('bauzeitMonate','Bauzeit',{typ:'zahl',einheit:'Monate'})
      +wzFeld('vermarktungMonate','Vermarktung nach Fertigstellung',{typ:'zahl',einheit:'Monate'})+wzFeld('vermarktung','Vermarktungskosten',{typ:'prozent',einheit:'% vom Erlös'})
      +wzFeld('wagnis','Wagnis und Gewinn des Bauträgers',{typ:'prozent',einheit:'% vom Erlös'})+wzFeld('erwerbsnebenkosten','Erwerbsnebenkosten Grundstück',{typ:'prozent',einheit:'% (Grunderwerbsteuer, Notar)'})
      +wzFeld('wartezeitJahre','Wartezeit bis Baubeginn',{typ:'zahl',einheit:'Jahre'})+'</div>')
    +wzBox('Vergleich mit dem Bestand','<div class="grid">'+wzFeld('bestand','Verkehrswert des Bestands',{typ:'betrag',einheit:'€',hinweis:'Verkauf mit dem alten Haus; „Aus Bewertung“ übernimmt die Preisempfehlung'})+'</div>')
    +'</div><div>'
    +wzBox('Ergebnis','<div id="wz_gs_ergebnis"></div>',{klasse:'wz-ergebnis'})
    +wzBox('Spanne','<div id="wz_gs_spanne"></div>')
    +wzBox('Hinweise','<ul class="wz-liste">'+gsHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>')
    +'</div></div>';
}
function gsHinweise(){
  return ['Bauträgerkalkulation (Residualwert): Erlös abzüglich aller Kosten, der Finanzierung sowie Wagnis und Gewinn des Bauträgers ergibt, was er für das Grundstück zahlen kann — eine Verhandlungsgrundlage.',
    'Den Verkehrswert des Bodens bestimmt die ImmoWertV vorrangig aus Vergleichspreisen und Bodenrichtwert (§ 40 Abs. 1 und 2); deduktiv nur, wenn diese fehlen, und dann mit Marktanpassung (§ 40 Abs. 3).',
    'Das Ergebnis reagiert stark auf Verkaufspreis und Baukosten (siehe Spanne) — für Gespräche als Bandbreite nennen.',
    'Baurecht vorher klären: Bebauungsplan oder Einfügen in die Umgebung (§ 34 BauGB), Abstandsflächen, Stellplatzpflicht. Wohnfläche je Geschossfläche, Zinsen sowie Wagnis und Gewinn sind Annahmen.',
    'Orientierung für das Gespräch mit Eigentümer und Bauträger, kein Verkehrswertgutachten.'];
}
function gsRechnen(S){
  let E=gsEingabe(S), r=ImmoBeratung.residualwert(E), bestand=wzN(S.bestand,true);
  if(!(r.erloes>0)){ wzH('wz_gs_ergebnis','<p class="hint" style="margin:0">Grundstück, GFZ (oder Fläche) und Verkaufspreis eintragen.</p>'); wzH('wz_gs_spanne',''); return; }
  let z=(t,w,o)=>'<div class="row-calc'+(o?' wz-summe':'')+'"><span>'+t+'</span><b>'+w+'</b></div>';
  wzH('wz_gs_ergebnis',z('Geschossfläche / Wohnfläche',wzZ(r.geschossflaeche,0)+' m² / '+wzZ(r.wohnflaeche,0)+' m²')+z('Erlös',wzEur(r.erloes))
    +z('− Baukosten',wzEur(r.bau))+z('− Baunebenkosten',wzEur(r.baunebenkosten))+(r.sonstige?z('− Abriss, Erschließung',wzEur(r.sonstige)):'')
    +z('− Finanzierung Bau',wzEur(r.finanzierungBau))+z('− Vermarktung',wzEur(r.vermarktung))+z('− Wagnis und Gewinn',wzEur(r.wagnis))
    +z('= für Grundstück, Nebenkosten und Grundstücksfinanzierung',wzEur(r.residual))
    +'<div class="subtotal"><span>Tragbarer Grundstückspreis heute</span><span>'+wzEur(r.heute)+'</span></div>'
    +(r.heute>0?z('je m² Grundstück',wzEur(r.proM2)+'/m²'):'<p class="hint wz-schlecht">Bei diesen Annahmen trägt das Projekt keinen Grundstückspreis.</p>')
    +(r.bodenrichtwertWert>0?z('Bodenrichtwert × Fläche',wzEur(r.bodenrichtwertWert)+' ('+(r.abweichungBRW>=0?'+':'')+wzZ(r.abweichungBRW,1)+' %)'):'')
    +(bestand>0?z('Verkauf des Bestands',wzEur(bestand)+' — '+(r.heute>bestand?'Bauträger zahlt '+wzEur(r.heute-bestand)+' mehr':'Bestand bringt '+wzEur(bestand-r.heute)+' mehr')):''));
  let s=ImmoBeratung.residualSpanne(E);
  wzH('wz_gs_spanne','<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th></th><th>Baukosten −10 %</th><th>Baukosten wie eingetragen</th><th>Baukosten +10 %</th></tr></thead><tbody>'
    +[['Verkaufspreis +10 %',1.1],['Verkaufspreis wie eingetragen',1],['Verkaufspreis −10 %',0.9]].map(([t,vp])=>'<tr><td>'+t+'</td>'+[0.9,1,1.1].map(bk=>'<td class="r">'+wzEur(ImmoBeratung.residualwert({...E,verkaufM2:E.verkaufM2*vp,baukostenM2:E.baukostenM2*bk}).heute)+'</td>').join('')+'</tr>').join('')
    +'</tbody></table></div><p class="hint">Basis '+wzEur(s.basis)+'.</p>');
}
function gsDokument(S){
  let E=gsEingabe(S), r=ImmoBeratung.residualwert(E); if(!(r.erloes>0)){ alert('Bitte zuerst Grundstück und Verkaufspreis eintragen.'); return null; }
  let bestand=wzN(S.bestand,true);
  return {titel:'Grundstückspotenzial '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Grundstückspotenzial</h1><p class="wzd-unter">Was kann ein Bauträger für das Grundstück zahlen? (Residualwert)</p>'
      +'<h2>Annahmen</h2>'+wzDokTabelle([['Grundstück',wzZ(E.grundstueck,0)+' m², Bodenrichtwert '+wzEur(E.bodenrichtwert)+'/m²'],['Geschossfläche / Wohnfläche',wzZ(r.geschossflaeche,0)+' m² / '+wzZ(r.wohnflaeche,0)+' m²'],
        ['Verkaufspreis Neubau',wzEur(E.verkaufM2)+'/m²'],['Baukosten',wzEur(E.baukostenM2)+'/m² zzgl. '+wzP(E.baunebenkosten,0)+' Nebenkosten'],
        ['Finanzierung',wzP(E.zins,1)+', Bauzeit '+wzZ(E.bauzeitMonate,0)+' Monate, Vermarktung '+wzZ(E.vermarktungMonate,0)+' Monate'],['Wagnis und Gewinn',wzP(E.wagnis,0)+' vom Erlös']])
      +'<h2>Rechnung</h2>'+wzDokTabelle([['Erlös',wzEur(r.erloes)],['− Baukosten und Nebenkosten',wzEur(r.bau+r.baunebenkosten)],r.sonstige?['− Abriss, Erschließung',wzEur(r.sonstige)]:null,
        ['− Finanzierung Bau',wzEur(r.finanzierungBau)],['− Vermarktung',wzEur(r.vermarktung)],['− Wagnis und Gewinn',wzEur(r.wagnis)],['= Residuum',wzEur(r.residual)],
        ['Tragbarer Grundstückspreis heute',wzEur(r.heute),{summe:true}],r.heute>0?['je m² Grundstück',wzEur(r.proM2)+'/m²']:null,
        r.bodenrichtwertWert>0?['Bodenrichtwert × Fläche',wzEur(r.bodenrichtwertWert)]:null,bestand>0?['Verkauf des Bestands',wzEur(bestand)]:null])
      +'<h2>Hinweise</h2><ul>'+gsHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>',
    fuss:'Residualwert nach Annahmen, kein Verkehrswertgutachten.'};
}
function gsKundeText(S){
  let E=gsEingabe(S), r=ImmoBeratung.residualwert(E); if(!(r.erloes>0)){ alert('Bitte zuerst Grundstück und Verkaufspreis eintragen.'); return ''; }
  return 'Grundstückspotenzial (Residualwert): '+wzZ(E.grundstueck,0)+' m², Wohnfläche '+wzZ(r.wohnflaeche,0)+' m², Erlös '+wzEur(r.erloes)+' → tragbarer Grundstückspreis '+wzEur(r.heute)
    +(r.bodenrichtwertWert>0?' (Bodenrichtwert × Fläche '+wzEur(r.bodenrichtwertWert)+')':'')+'.';
}
function gsAusBewertung(S){
  let R=wzBewertung(), f=num('ek_gs_flaeche'), b=num('ek_brw');
  if(f>0) S.grundstueck=String(Math.round(f)); if(b>0) S.bodenrichtwert=String(b).replace('.',',');
  S.bestand=String(Math.round(R.empfehlung));
}
wzRegistrieren({id:'grundstueck',titel:'Grundstückspotenzial',sub:'Residualwert · Bodenrichtwert · Bestand',icon:'layers',start:gsStart,zeichnen:gsZeichnen,rechnen:gsRechnen,
  dokument:gsDokument,kundeText:gsKundeText,ausBewertung:gsAusBewertung});
