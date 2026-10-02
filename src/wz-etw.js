/* ---------- Kachel „ETW-Kaufcheck“ (D38) ----------
   Für Käufer und Finanzierung einer Eigentumswohnung: Erhaltungsrücklage und Zuführung nach Miteigentumsanteil, Vergleich
   mit der Peters'schen Formel, Erneuerungsbedarf der Heizung (GModG, VDI 2067), Beschlüsse und Risiken, Unterlagen — als Ampel.
   Rechnung in js/beratung.js (ImmoBeratung.etwCheck). */
function etwStart(){
  return {wohnflaeche:'',mea:'',meaGesamt:'1000',ruecklageGesamt:'',zufuehrungGesamt:'',hausgeld:'',herstellM2:'',anteilGE:'70',baujahr:'',einheiten:'',
    heizArt:'',heizBaujahr:'',kessel:'',sonderumlage:'',massnahmenText:'',massnahmenKosten:'',rechtsstreit:false,rueckstaende:false,verwalterBis:'',
    unterlagen:ImmoBeratung.ETW_UNTERLAGEN.map(()=>false),notiz:''};
}
function etwEingabe(S){
  return {wohnflaeche:wzN(S.wohnflaeche,true),mea:wzN(S.mea),meaGesamt:wzN(S.meaGesamt,true),ruecklageGesamt:wzN(S.ruecklageGesamt,true),zufuehrungGesamt:wzN(S.zufuehrungGesamt,true),
    hausgeld:wzN(S.hausgeld,true),herstellM2:wzN(S.herstellM2,true),anteilGE:wzN(S.anteilGE),heizArt:S.heizArt,heizBaujahr:wzN(S.heizBaujahr),
    sonderumlage:wzN(S.sonderumlage,true),massnahmenKosten:wzN(S.massnahmenKosten,true),rechtsstreit:!!S.rechtsstreit,rueckstaende:!!S.rueckstaende,verwalterBis:S.verwalterBis,
    unterlagen:(S.unterlagen||[]).map(Boolean)};
}
function etwZeichnen(S){
  return '<div class="wz-grid"><div>'
    +wzBox('Wohnung und Gemeinschaft','<div class="grid">'+wzFeld('wohnflaeche','Wohnfläche',{typ:'betrag',einheit:'m²'})
      +wzFeld('mea','Miteigentumsanteil',{typ:'zahl',hinweis:'Zähler, z. B. 85'})+wzFeld('meaGesamt','von insgesamt',{typ:'betrag',hinweis:'Nenner, z. B. 1.000 oder 10.000'})
      +wzFeld('baujahr','Baujahr',{typ:'zahl'})+wzFeld('einheiten','Einheiten in der Anlage',{typ:'zahl'})+wzFeld('hausgeld','Hausgeld der Wohnung',{typ:'betrag',einheit:'€/Monat'})+'</div>')
    +wzBox('Erhaltungsrücklage','<div class="grid">'+wzFeld('ruecklageGesamt','Rücklage der Gemeinschaft',{typ:'betrag',einheit:'€',hinweis:'Stand laut Jahresabrechnung'})
      +wzFeld('zufuehrungGesamt','Zuführung der Gemeinschaft',{typ:'betrag',einheit:'€/Jahr',hinweis:'laut Wirtschaftsplan'})
      +wzFeld('herstellM2','Herstellungskosten heute',{typ:'betrag',einheit:'€/m² Wohnfläche',hinweis:'für die Peters\'sche Formel (Neubaukosten)'})
      +wzFeld('anteilGE','Anteil Gemeinschaftseigentum',{typ:'prozent',einheit:'% (Peters: 65–70)'})+'</div>')
    +wzBox('Heizung','<div class="grid">'+wzFeld('heizArt','Heizungsart',{typ:'wahl',optionen:[['','– bitte wählen'],['gas','Gas'],['oel','Öl'],['fernwaerme','Fernwärme'],['waermepumpe','Wärmepumpe'],['pellets','Pellets / Holz'],['sonstige','Sonstige']]})
      +wzFeld('heizBaujahr','Baujahr der Heizung',{typ:'zahl'})+'</div>')
    +wzBox('Beschlüsse und Risiken','<div class="grid">'+wzFeld('sonderumlage','Beschlossene Sonderumlage (gesamt)',{typ:'betrag',einheit:'€'})
      +wzFeld('massnahmenKosten','Geplante Maßnahmen (gesamt)',{typ:'betrag',einheit:'€'})+wzFeld('massnahmenText','Welche Maßnahmen?',{typ:'text',ph:'z. B. Dach, Fassade, Heizung'})
      +wzFeld('verwalterBis','Verwaltervertrag bis',{typ:'datum'})+wzFeld('rechtsstreit','Laufender Rechtsstreit in der Gemeinschaft',{typ:'check',voll:true})
      +wzFeld('rueckstaende','Hausgeldrückstände anderer Eigentümer',{typ:'check',voll:true})+'</div>')
    +wzBox('Unterlagen','<div class="wz-checkliste">'+ImmoBeratung.ETW_UNTERLAGEN.map((u,i)=>wzFeld('unterlagen.'+i,sEsc(u),{typ:'check'})).join('')+'</div>'
      +wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. aus den Protokollen'}))
    +'</div><div>'
    +wzBox('Ergebnis','<div id="wz_etw_ergebnis"></div>',{klasse:'wz-ergebnis'})
    +wzBox('Hinweise','<ul class="wz-liste">'+etwHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>')
    +'</div></div>';
}
function etwHinweise(){
  return ['Peters\'sche Formel: Herstellungskosten je m² × 1,5 ÷ 80 Jahre, davon der Anteil des Gemeinschaftseigentums — eine von mehreren Orientierungen für die jährliche Zuführung zur Rücklage.',
    'Heizung: Seit 29.07.2026 gilt das Gebäudemodernisierungsgesetz (GModG) statt des GEG — die Austauschpflicht für alte Kessel und die 65-%-Regel sind entfallen. Neue Öl- und Gasheizungen müssen ab 2029 steigende Anteile klimafreundlicher Brennstoffe nutzen (§ 43 GModG: 10 %, 2030 15 %, 2035 30 %, 2040 60 %). Rechnerische Nutzungsdauer von Öl- und Gaskesseln: 18–20 Jahre (VDI 2067).',
    'Protokolle der letzten drei Jahre und die Beschlusssammlung zeigen geplante Maßnahmen, Streit und Rückstände — sie gehören vor jeder Kaufentscheidung auf den Tisch.',
    'Orientierung für Käufer und Finanzierung, keine Rechtsberatung.'];
}
function etwRechnen(S){
  let E=etwEingabe(S), r=ImmoBeratung.etwCheck(E,new Date().getFullYear());
  let z=(t,w)=>'<div class="row-calc"><span>'+t+'</span><b>'+w+'</b></div>';
  let gesamt={rot:['rot','Genau prüfen: es gibt Warnzeichen'],gelb:['gelb','Einzelne Punkte klären'],gruen:['gruen','Keine Auffälligkeiten aus den Angaben']}[r.gesamt];
  wzH('wz_etw_ergebnis',wzAmpel(gesamt[0],'<b>'+gesamt[1]+'</b>')
    +(r.anteil>0?z('Anteil an der Gemeinschaft',wzP(r.anteil*100,2)):wzHinweis('Miteigentumsanteil eintragen, dann rechnet der Check die Anteile der Wohnung.'))
    +(r.anteil>0&&E.ruecklageGesamt>0?z('Rücklage, Anteil der Wohnung',wzEur(r.ruecklage)+(r.rueckM2?' ('+wzZ(r.rueckM2,2)+' €/m²)':'')):'')
    +(r.anteil>0&&E.zufuehrungGesamt>0?z('Zuführung, Anteil der Wohnung',wzEur(r.zufuehrung)+' im Jahr'+(r.zuM2?' ('+wzZ(r.zuM2,2)+' €/m²)':'')):'')
    +(r.peters>0?z('Peters\'sche Formel',wzZ(r.peters,2)+' €/m² im Jahr'):'')
    +(r.hausgeldM2>0?z('Hausgeld',wzZ(r.hausgeldM2,2)+' €/m² im Monat'):'')
    +z('Unterlagen',r.unterlagen+' von '+r.unterlagenGesamt)
    +(r.heizung.text?'<h4 class="wz-unter">Heizung</h4>'+wzAmpel(r.heizung.stufe==='rot'?'rot':r.heizung.stufe==='warn'?'gelb':'gruen',sEsc(r.heizung.text)):'')
    +(r.flags.length?'<h4 class="wz-unter">Zu klären</h4>'+r.flags.filter(f=>f.text!==r.heizung.text).map(f=>wzAmpel(f.stufe==='rot'?'rot':'gelb',sEsc(f.text))).join(''):''));
}
function etwDokument(S){
  let E=etwEingabe(S), r=ImmoBeratung.etwCheck(E,new Date().getFullYear());
  let gesamt={rot:'Genau prüfen: es gibt Warnzeichen',gelb:'Einzelne Punkte klären',gruen:'Keine Auffälligkeiten aus den Angaben'}[r.gesamt];
  return {titel:'ETW-Kaufcheck '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>ETW-Kaufcheck</h1><p class="wzd-unter">Prüfung der Gemeinschaft vor dem Kauf einer Eigentumswohnung</p>'
      +'<p><b>Gesamteindruck: '+gesamt+'</b></p>'
      +'<h2>Kennzahlen</h2>'+wzDokTabelle([['Wohnfläche',E.wohnflaeche?wzZ(E.wohnflaeche,2)+' m²':'–'],['Miteigentumsanteil',E.mea&&E.meaGesamt?wzZ(E.mea,0)+' / '+wzZ(E.meaGesamt,0)+' ('+wzP(r.anteil*100,2)+')':'–'],
        ['Rücklage, Anteil der Wohnung',r.ruecklage?wzEur(r.ruecklage)+' ('+wzZ(r.rueckM2,2)+' €/m²)':'–'],['Zuführung, Anteil der Wohnung',r.zufuehrung?wzEur(r.zufuehrung)+' im Jahr ('+wzZ(r.zuM2,2)+' €/m²)':'–'],
        ['Peters\'sche Formel',r.peters?wzZ(r.peters,2)+' €/m² im Jahr':'–'],['Hausgeld',r.hausgeldM2?wzZ(r.hausgeldM2,2)+' €/m² im Monat':'–'],
        ['Heizung',sEsc(r.heizung.text||'–')]])
      +'<h2>Zu klären</h2>'+(r.flags.length?'<ul>'+r.flags.map(f=>'<li>'+sEsc(f.text)+'</li>').join('')+'</ul>':'<p>Keine Punkte aus den Angaben.</p>')
      +(S.massnahmenText?'<p>Geplante Maßnahmen: '+sEsc(S.massnahmenText)+'</p>':'')
      +'<h2>Unterlagen</h2><ul>'+ImmoBeratung.ETW_UNTERLAGEN.map((u,i)=>'<li>'+(E.unterlagen[i]?'☑':'☐')+' '+sEsc(u)+'</li>').join('')+'</ul>'
      +(S.notiz?'<h2>Notiz</h2><p>'+sEsc(S.notiz).replace(/\n/g,'<br>')+'</p>':'')
      +'<h2>Hinweise</h2><ul>'+etwHinweise().map(h=>'<li>'+h+'</li>').join('')+'</ul>',
    fuss:'Prüfliste nach den Angaben, keine Rechtsberatung.'};
}
function etwKundeText(S){
  let E=etwEingabe(S), r=ImmoBeratung.etwCheck(E,new Date().getFullYear());
  return 'ETW-Kaufcheck: '+{rot:'Warnzeichen',gelb:'einzelne Punkte klären',gruen:'keine Auffälligkeiten'}[r.gesamt]
    +(r.ruecklage?'; Rücklagenanteil '+wzEur(r.ruecklage):'')+(r.flags.length?'; zu klären: '+r.flags.map(f=>f.text).join(' '):'')+'; Unterlagen '+r.unterlagen+'/'+r.unterlagenGesamt+'.';
}
function etwAusBewertung(S){
  let wf=num('ek_wohnflaeche'), bj=num('ek_baujahr'), mea=exV('ek_mea'), hg=num('ek_hausgeld');
  if(wf>0) S.wohnflaeche=String(wf).replace('.',','); if(bj>0) S.baujahr=String(bj); if(hg>0) S.hausgeld=String(hg).replace('.',',');
  let m=/^\s*([\d.,]+)\s*\/\s*([\d.,]+)/.exec(mea||''); if(m){ S.mea=m[1]; S.meaGesamt=m[2]; }
}
wzRegistrieren({id:'etw',titel:'ETW-Kaufcheck',sub:'Rücklage · Beschlüsse · Heizung · Unterlagen',icon:'clipboard',start:etwStart,zeichnen:etwZeichnen,rechnen:etwRechnen,
  dokument:etwDokument,kundeText:etwKundeText,ausBewertung:etwAusBewertung});
