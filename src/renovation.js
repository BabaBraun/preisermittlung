/* ---------- Sanierungsweg: Kosten, Förderung, Effizienzklasse vorher/nachher -------------------------
   Beratungswerkzeug, fließt nicht in die Preisempfehlung. Kosten sind Richtwerte aus Marktübersichten 2026
   und je Objekt überschreibbar. Förderung am Wortlaut geprüft:
   - Gebäudehülle (BAFA, BEG EM, Stand 07/2026): 15 % der förderfähigen Ausgaben; Höchstgrenze 30.000 € für die
     erste, je 15.000 € für die 2.–6., je 8.000 € ab der 7. Wohneinheit; mit iSFP doppelt. iSFP-Bonus 5 %
     nur auf den Betrag oberhalb der Höchstgrenze ohne iSFP (Mindestinvestition, Richtlinie ab 21.07.2026).
   - Heizung (KfW 458, Merkblatt Stand 09/2026): Grundförderung 30 %; Klimageschwindigkeitsbonus 16 % für
     Selbstnutzer beim Austausch von Öl-, Kohle-, Gas-Etagen- und Nachtspeicherheizungen (jedes Alter) bzw.
     Gas- und Biomasseheizungen ab 20 Jahren, sinkt ab 01.02.2027 halbjährlich um 4 Pp., ab 01.08.2028 null;
     Einkommensbonus 40/30/10 % bis 30/40/50 T€ zu versteuerndem Einkommen (+10 T€ mit Kind); Obergrenze 70 %,
     80 % bis 30 T€ (40 T€ mit Kind); förderfähig höchstens 28.000 € erste WE (sinkt ab 01.02.2027 halbjährlich
     um 750 €), je 15.000 € 2.–6., je 8.000 € ab 7. WE.
   Energie: vereinfachtes Modell — Heizwärme = Endenergie × Kesselnutzungsgrad, Dämmmaßnahmen senken die
   Heizwärme um typische Anteile, eine Wärmepumpe teilt sie durch die Jahresarbeitszahl. Klassen nach
   Endenergie (EN_KLASSEN). Ersetzt keine Energieberatung. */
const SAN_MASSNAHMEN=[
  {k:'fassade',name:'Fassadendämmung (WDVS)',einheit:'m² Fassade',preis:160,spanne:'120–200 €/m²',spar:20,huelle:true,schaetz:wf=>wf*1.1},
  {k:'dach',name:'Dachdämmung (Zwischensparren)',einheit:'m² Dachfläche',preis:170,spanne:'ca. 170 €/m²',spar:15,huelle:true,schaetz:wf=>wf*0.9},
  {k:'ogd',name:'Dämmung oberste Geschossdecke',einheit:'m²',preis:45,spanne:'20–70 €/m²',spar:12,huelle:true,schaetz:wf=>wf*0.5},
  {k:'fenster',name:'Fenstertausch, 3-fach verglast',einheit:'m² Fensterfläche',preis:550,spanne:'700–1.400 € je Fenster (ca. 1,8 m²)',spar:10,huelle:true,schaetz:wf=>wf*0.2},
  {k:'keller',name:'Dämmung Kellerdecke',einheit:'m²',preis:45,spanne:'20–70 €/m²',spar:6,huelle:true,schaetz:wf=>wf*0.5},
  {k:'wp',name:'Luft-Wasser-Wärmepumpe',einheit:'pauschal',preis:33000,spanne:'27.000–40.000 €',spar:0,heizung:true,schaetz:()=>1}
];
const SAN_HEIZUNG=[['gas','Gas-Kessel',0.9],['oel','Öl-Kessel',0.88],['gasetage','Gas-Etagenheizung',0.88],['strom','Nachtspeicher / Strom direkt',1],
  ['bio','Biomasse-Kessel',0.8],['fern','Fernwärme',1],['wp','Wärmepumpe',null]];
function buildSanierung(){
  let tb=$('san_tbl'); if(!tb) return; tb=tb.querySelector('tbody'); tb.innerHTML='';
  SAN_MASSNAHMEN.forEach(m=>{
    tb.insertAdjacentHTML('beforeend','<tr><td><label class="chk" style="margin:0"><input type="checkbox" id="san_m_'+m.k+'"> '+m.name+'</label><small>Richtwert '+m.spanne+'</small>'
      +(m.heizung?'<small>Einsparung über die Jahresarbeitszahl</small>':'<span class="san-spar">spart <input id="san_s_'+m.k+'" type="text" value="'+m.spar+'" aria-label="'+m.name+': Einsparung in Prozent der Heizwärme"> % Heizwärme</span>')+'</td>'
      +'<td><input id="san_q_'+m.k+'" type="text" value="" aria-label="'+m.name+': Menge"><small>'+m.einheit+'</small></td>'
      +'<td><input id="san_p_'+m.k+'" type="text" value="'+m.preis+'" aria-label="'+m.name+': Preis je Einheit"><small>€</small></td>'
      +'<td class="san-k" id="san_k_'+m.k+'">–</td></tr>');
  });
}
function sanKgbSatz(d){ let t=d.toISOString().slice(0,10); return t<'2027-02-01'?16:t<'2027-08-01'?12:t<'2028-02-01'?8:t<'2028-08-01'?4:0; }
function sanHeizCap1(d){ let t=d.toISOString().slice(0,10); if(t<'2027-02-01') return 28000;
  let n=0, y=2027, h=0; while(true){ let s=y+'-'+(h?'08':'02')+'-01'; if(t<s) break; n++; if(h){ y++; h=0; } else h=1; } return Math.max(0,28000-750*n); }
function sanHoechst(erste,we){ return erste+15000*Math.min(Math.max(we-1,0),5)+8000*Math.max(we-6,0); }
/* Förderung: kH = Kosten Gebäudehülle, kW = Kosten Heizung; o = {we, isfp, selbst, eink ('30'|'40'|'50'|'60'|'hoch'|''), kind, heizung, heizAlter, datum} */
function sanFoerderung(kH,kW,o){
  let we=Math.max(1,Math.round(o.we)||1), d=o.datum||new Date();
  let capH=sanHoechst(30000,we), capHi=capH*2;
  let fH=0.15*Math.min(kH,o.isfp?capHi:capH)+(o.isfp?0.05*Math.max(0,Math.min(kH,capHi)-capH):0);
  let kgb=0, eb=0, max=0.7, eff=null;
  if(o.selbst){
    let alt=['oel','gasetage','strom'].includes(o.heizung)||(['gas','bio'].includes(o.heizung)&&o.heizAlter>=20);
    kgb=alt?sanKgbSatz(d):0;
    if(o.eink&&o.eink!=='hoch'){ eff=(+o.eink)-(o.kind?10:0); eb=eff<=30?40:eff<=40?30:eff<=50?10:0; if(eff<=30) max=0.8; }
  }
  let satz=Math.min((30+kgb+eb)/100,max), capW=sanHoechst(sanHeizCap1(d),we), fW=kW>0?satz*Math.min(kW,capW):0;
  return {huelle:fH,heizung:fW,satzHeizung:satz,kgb:kgb,eb:eb,capH:o.isfp?capHi:capH,capW:capW};
}
function sanRechnen(){
  let el=$('san_ergebnis'); if(!el) return null;
  if(!$('san_aktiv').checked){ window._SAN=null; return null; }
  let wf=num('ek_wohnflaeche'), heiz=exV('san_heizung')||'gas', h=SAN_HEIZUNG.find(x=>x[0]===heiz)||SAN_HEIZUNG[0];
  let e0=num('san_e0')||num('en_kennwert')||zahlLesen(exV('au_energiewert'),false);
  let jaz=zahlLesen(exV('san_jaz'),false)||3, pAlt=zahlLesen(exV('san_preis_alt'),false)||0.12, pWp=zahlLesen(exV('san_preis_wp'),false)||0.28;
  let heizJahr=zahlLesen(exV('san_heizjahr'),false)||parseInt((exV('au_heizung_bj').match(/(19|20)\d\d/)||[''])[0])||0;
  let alter=heizJahr?new Date().getFullYear()-heizJahr:0;
  let kH=0, kW=0, faktor=1, wpNeu=false, massn=[];
  SAN_MASSNAHMEN.forEach(m=>{
    let an=$('san_m_'+m.k)&&$('san_m_'+m.k).checked, schaetz=Math.round(m.schaetz(wf||0));
    let q=zahlLesen(exV('san_q_'+m.k),true)||schaetz, p=zahlLesen(exV('san_p_'+m.k),true), k=an?q*p:0;
    if($('san_q_'+m.k)) $('san_q_'+m.k).placeholder=schaetz?'ca. '+schaetz:'';
    setT('san_k_'+m.k,an?eur(k):'–');
    if(!an) return;
    if(m.heizung){ if(heiz!=='wp'){ kW+=k; wpNeu=true; } }
    else { kH+=k; faktor*=1-(zahlLesen(exV('san_s_'+m.k),false)||0)/100; }
    massn.push({name:m.name,menge:m.heizung?'pauschal':num2(q).replace(/,00$/,'')+' '+m.einheit,preis:p,kosten:k});
  });
  let wpDanach=wpNeu||heiz==='wp';
  let q0=heiz==='wp'?e0*jaz:e0*(h[2]||1), q1=q0*faktor, e1=wpDanach?q1/jaz:q1/(h[2]||1);
  let kosten0=e0*wf*(heiz==='wp'?pWp:pAlt), kosten1=e1*wf*(wpDanach?pWp:pAlt);
  let f=sanFoerderung(kH,kW,{we:num('ek_anz_we')||1,isfp:$('san_isfp').checked,selbst:exV('san_nutzung')!=='vermietet',eink:exV('san_einkommen'),kind:$('san_kind').checked,heizung:heiz,heizAlter:alter});
  let kl0=e0>0?enKlasseAusKennwert(e0):'', kl1=e0>0?enKlasseAusKennwert(e1):'';
  let idx=k=>EN_KLASSEN.findIndex(x=>x[0]===k), stufen=kl0&&kl1?idx(kl0)-idx(kl1):0;
  let R=window._R||{}, wert=stufen>0&&R.mittel>0?R.mittel*stufen*(zahlLesen(exV('en_pct_stufe'),false)||2.5)/100:0;
  let S={e0,e1,kl0,kl1,stufen,kH,kW,f,foerder:f.huelle+f.heizung,kosten:kH+kW,eigen:kH+kW-f.huelle-f.heizung,kosten0,kosten1,wert,massn,wpDanach,heizName:h[1],alter,jaz};
  window._SAN=S;
  if(!e0){ el.innerHTML='<p class="hint">Für die Rechnung fehlt der Energiekennwert (Endenergie) — hier, unter „Energetische Qualität“ oder im Aufnahmebogen eintragen.</p>'; return S; }
  const z=(a,b,c)=>'<div class="row-calc'+(c?' '+c:'')+'"><span>'+a+'</span><b>'+b+'</b></div>';
  el.innerHTML=z('Kosten der gewählten Maßnahmen',eur(S.kosten))
    +(kH?z('− Förderung Gebäudehülle (BAFA, 15 %'+($('san_isfp').checked?' + iSFP-Bonus':'')+', förderfähig bis '+eur(f.capH)+')',eur(f.huelle)):'')
    +(kW?z('− Förderung Heizung (KfW 458, '+Math.round(f.satzHeizung*100)+' %'+(f.kgb?' inkl. '+f.kgb+' % Klimageschwindigkeitsbonus':'')+(f.eb?' und '+f.eb+' % Einkommensbonus':'')+', förderfähig bis '+eur(f.capW)+')',eur(f.heizung)):'')
    +'<div class="subtotal"><span>Eigenanteil</span><span>'+eur(S.eigen)+'</span></div>'
    +z('Endenergie','<span class="san-kl kl-'+kl0+'">'+kl0+'</span> '+Math.round(e0)+' → <span class="san-kl kl-'+kl1+'">'+kl1+'</span> '+Math.round(e1)+' kWh/(m²·a)')
    +(wf>0?z('Heizkosten im Jahr',eur(kosten0)+' → '+eur(kosten1)+' <small>('+(kosten0-kosten1>=0?'−':'+')+eur(Math.abs(kosten0-kosten1))+')</small>'):'')
    +(wert>0?z('Wertwirkung, grob ('+stufen+' Klassenstufe'+(stufen===1?'':'n')+' × '+num2(zahlLesen(exV('en_pct_stufe'),false)||2.5)+' % laut Energetischer Qualität)','+ '+eur(wert)):'')
    +(wert>0&&S.eigen>0?'<p class="hint">Die grobe Wertwirkung deckt rund '+Math.round(wert/S.eigen*100)+' % des Eigenanteils. Dazu kommen die geringeren Heizkosten.</p>':'');
  return S;
}
function sanBericht(esc){
  let S=window._SAN; if(!S||!$('san_aktiv').checked||!S.e0) return '';
  return '<h2>Sanierungsweg</h2>'
    +'<table><tr><td><b>Maßnahme</b></td><td><b>Menge</b></td><td><b>Kosten</b></td></tr>'
    +S.massn.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.menge)+'</td><td>'+eur(m.kosten)+'</td></tr>').join('')
    +'<tr class="total"><td>Kosten gesamt</td><td></td><td>'+eur(S.kosten)+'</td></tr></table>'
    +'<table>'+(S.kH?'<tr><td>Förderung Gebäudehülle (BAFA, BEG EM)</td><td>'+eur(S.f.huelle)+'</td></tr>':'')
    +(S.kW?'<tr><td>Förderung Heizung (KfW 458, '+Math.round(S.f.satzHeizung*100)+' %)</td><td>'+eur(S.f.heizung)+'</td></tr>':'')
    +'<tr class="total"><td>Eigenanteil</td><td>'+eur(S.eigen)+'</td></tr>'
    +'<tr><td>Endenergie / Effizienzklasse</td><td>'+Math.round(S.e0)+' kWh/(m²·a), Klasse '+S.kl0+' → '+Math.round(S.e1)+' kWh/(m²·a), Klasse '+S.kl1+'</td></tr>'
    +(S.kosten0?'<tr><td>Heizkosten im Jahr</td><td>'+eur(S.kosten0)+' → '+eur(S.kosten1)+'</td></tr>':'')
    +(S.wert>0?'<tr><td>Wertwirkung (grobe Orientierung)</td><td>+ '+eur(S.wert)+'</td></tr>':'')+'</table>'
    +'<div class="beschr">Richtwerte für Kosten und Einsparung, vereinfachte Energiebilanz (Jahresarbeitszahl der Wärmepumpe '+num2(S.jaz)+'). '
    +'Förderbedingungen: BAFA BEG EM Gebäudehülle (Stand 07/2026), KfW 458 Heizungsförderung (Merkblatt Stand 09/2026), jeweils bei Antrag zum heutigen Datum. '
    +'Die Aufstellung ersetzt keine Energieberatung und keine Handwerkerangebote und ist nicht Teil des Preisansatzes.</div>';
}
function sanAusEnergie(){
  let e=num('en_kennwert')||zahlLesen(exV('au_energiewert'),false);
  let h=(exV('au_heizung_art')||'').toLowerCase(), k=/wärmepumpe/.test(h)?'wp':/etage/.test(h)?'gasetage':/öl|oel/.test(h)?'oel':/gas/.test(h)?'gas':/fernw/.test(h)?'fern':/pellet|holz|bio/.test(h)?'bio':/nachtspeicher|strom/.test(h)?'strom':'';
  let j=(exV('au_heizung_bj').match(/(19|20)\d\d/)||[''])[0];
  // wie „Aus Aufnahmebogen“ unter Energetische Qualität: sagen, wenn es nichts zu übernehmen gibt
  if(!(e>0)&&!k&&!j){ alert('Im Aufnahmebogen und unter „Energetische Qualität“ ist nichts zum Übernehmen eingetragen (Energiekennwert, Heizungsart, Baujahr der Heizung).'); return; }
  if(e>0) $('san_e0').value=(''+Math.round(e));
  if(k) $('san_heizung').value=k;
  if(j) $('san_heizjahr').value=j;
  compute(); autosave();
}
