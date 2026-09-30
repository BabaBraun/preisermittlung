/* ImmoApp — Liegenschaftsverwaltung: Reiter „Jahresbericht“ (Eigentümerbericht als Word, Zusammenstellung für die
   Anlage V als Excel). Rechnen: js/verwaltung-bericht.js (ImmoBericht). */
'use strict';

const LVR=ImmoBericht;
LV.berichtJahr=null;

function lvBerichtStandardJahr(){ const d=lvHeute(); return +d.slice(5,7)<=6?+d.slice(0,4)-1:+d.slice(0,4); }
function lvBerichtJahre(l){
  const j=new Set([+lvHeute().slice(0,4),lvBerichtStandardJahr()]);
  (l.vertraege||[]).forEach(v=>{ if(v.beginn) for(let y=+v.beginn.slice(0,4);y<=+lvHeute().slice(0,4);y++) j.add(y); });
  return [...j].filter(y=>y>1990).sort((a,b)=>b-a).slice(0,15);
}
function lvJahresberichtHtml(l){
  const J=LV.berichtJahr||lvBerichtStandardJahr(), b=LVR.jahresbericht(l,J,{stichtag:lvHeute()}), laufend=b.vorlaeufig, bisT=LVK.datumDE(b.bis).slice(0,6);
  const wahl='<div class="field lv-vertragwahl"><label for="lv_berichtjahr">Jahr</label><select id="lv_berichtjahr" onchange="LV.berichtJahr=+this.value;lvRender()">'
    +lvBerichtJahre(l).map(y=>'<option value="'+y+'"'+(y===J?' selected':'')+'>'+y+'</option>').join('')+'</select></div>';
  const vz=b.vertraege.map(x=>{ const v=lvVertrag(l,x.vertragId), e=lvEinheit(l,x.einheitId);
    return '<tr><td class="strong">'+lvH(lvEinheitName(e))+'</td><td>'+lvH(v?lvMieterName(v):'')+'</td><td class="r">'+lvEur(x.sollGesamt)+'</td><td class="r">'+lvEur(x.ist)+'</td>'
      +'<td class="r">'+lvEur(x.istTeile.kalt)+'</td><td class="r">'+lvEur(x.istTeile.umlagen)+'</td><td class="r">'+(x.rueckstandEnde>0?lvBadge(lvEur(x.rueckstandEnde),'bad'):'–')+'</td></tr>'; });
  if(vz.length>1) vz.push('<tr class="lv-summe"><td class="strong">Summe</td><td></td><td class="r strong">'+lvEur(b.summeSoll)+'</td><td class="r strong">'+lvEur(b.summeEin)+'</td><td class="r">'+lvEur(b.einnahmen.wohnen.kalt+b.einnahmen.gewerbe.kalt)+'</td><td class="r">'+lvEur(b.einnahmen.wohnen.umlagen+b.einnahmen.gewerbe.umlagen)+'</td><td class="r">'+(b.rueckstandEnde>0?lvEur(b.rueckstandEnde):'–')+'</td></tr>');
  const gz=b.gruppen.map(g=>'<tr><td>'+lvH(g.name)+'</td><td class="r">'+g.posten.length+'</td><td class="r">'+lvEur(g.betrag)+'</td></tr>');
  gz.push('<tr class="lv-summe"><td class="strong">Summe Ausgaben</td><td></td><td class="r strong">'+lvEur(b.summeAus)+'</td></tr>');
  const av=LVR.anlageV(b).map(z=>'<tr><td>'+lvH(z.abschnitt)+'</td><td>'+lvH(z.text)+'</td><td class="r">'+(z.betrag==null?'<span class="lv-klein">selbst ergänzen</span>':lvEur(z.betrag))+'</td></tr>');
  return wahl+(laufend?'<div class="lv-warn">Das Jahr '+J+' ist noch nicht abgeschlossen — Zahlen bis '+LVK.datumDE(b.bis)+', vorläufig.</div>':'')
    +'<div class="kpis">'+lvKpi('Einnahmen (Zufluss)',lvEur(b.summeEin),'Soll '+lvEur(b.summeSoll))
    +lvKpi('Ausgaben',lvEur(b.summeAus),b.lohn35a?'davon Arbeitskosten § 35a: '+lvEur(b.lohn35a):'')
    +lvKpi('Überschuss vor AfA und Zinsen',lvEur(b.ueberschuss),'',b.ueberschuss<0?'lv-kpi-bad':'')
    +lvKpi('Rückstände zum '+bisT,lvEur(b.rueckstandEnde),b.leer.tage?'Leerstand '+b.leer.tage+' Tage · '+lvEur(b.leer.entgangen)+' entgangen':'kein Leerstand',b.rueckstandEnde>0?'lv-kpi-bad':'')+'</div>'
    +lvBox('Einnahmen je Mietverhältnis '+J,lvTabelle(['Einheit','Mieter',{t:'Soll',r:1},{t:'Zufluss',r:1},{t:'davon Miete',r:1},{t:'davon Umlagen',r:1},{t:'Rückstand '+bisT,r:1}],vz,'Keine Mieteinnahmen in diesem Jahr.')
      +(b.verschoben.length?'<p class="hint">Zehn-Tage-Regel (§ 11 Abs. 1 Satz 2 EStG): '+b.verschoben.map(x=>lvH(LVK.datumDE(x.datum)+' '+lvEur(x.betrag)+' für '+x.monat.slice(5)+'/'+x.monat.slice(0,4)+' → '+x.jahr)).join('; ')+'.</p>':''))
    +lvBox('Ausgaben '+J,lvTabelle(['Gruppe',{t:'Posten',r:1},{t:'Betrag',r:1}],gz)+'<p class="hint">Nach dem Datum in den Kosten (Reiter „Nebenkosten“ und abgerechnete Vorgänge der Instandhaltung). Kosten ohne Datum mit Leistungszeitraum zählen zum Beginn des Zeitraums.</p>')
    +lvBox('Zusammenstellung für die Anlage V '+J,lvTabelle(['Abschnitt','Posten',{t:'Betrag',r:1}],av)
      +'<p class="hint">Bezeichnungen wie im Formular Anlage V; die Zeilennummern ändern sich jährlich. Einnahmen nach Zufluss, aufgeteilt im Verhältnis der Sollmiete. Arbeitshilfe, keine Steuerberatung — AfA, Schuldzinsen und eigene Kosten ergänzt der Eigentümer bzw. die Steuerberatung.</p>'
      +'<div class="mdb-actions"><button class="primary" onclick="lvEigentuemerberichtWord()" data-ic="file-text">Eigentümerbericht (Word)</button><button class="secondary" onclick="lvAnlageVExcel()" data-ic="download">Anlage V und Einzelposten (Excel)</button></div>');
}
function lvEigentuemerberichtWord(){
  const l=lvAktiv(); if(!l) return;
  const J=LV.berichtJahr||lvBerichtStandardJahr(), st=lvHeute(), b=LVR.jahresbericht(l,J,{stichtag:st}), ab=LV.einst||{}, d=[], bisT=LVK.datumDE(b.bis);
  if(ab.name||ab.anschrift) d.push({typ:'p',runs:[{text:[ab.name,ab.anschrift].filter(Boolean).join(' · '),klein:true}]});
  d.push({typ:'titel',text:'Eigentümerbericht '+J});
  d.push({typ:'p',text:l.name+(lvAdresse(l)?' · '+lvAdresse(l):'')+'\nEigentümer: '+lvEigentuemer(l)+'\nStand: '+LVK.datumDE(st)+(b.vorlaeufig?' (Jahr noch nicht abgeschlossen — Zahlen bis '+bisT+', vorläufig)':'')});
  d.push({typ:'h2',text:'1. Überblick'});
  d.push({typ:'tabelle',zeilen:[[{text:'Einnahmen (Zufluss)'},{text:lvEur(b.summeEin),rechts:true}],[{text:'Sollmiete des Jahres'},{text:lvEur(b.summeSoll),rechts:true}],
    [{text:'Ausgaben'},{text:lvEur(b.summeAus),rechts:true}],Object.assign([{text:'Überschuss vor AfA und Finanzierungskosten'},{text:lvEur(b.ueberschuss),rechts:true}],{fett:true}),
    [{text:'Mietrückstände zum '+bisT},{text:lvEur(b.rueckstandEnde),rechts:true}],[{text:'Leerstand'},{text:b.leer.tage?b.leer.tage+' Tage, entgangene Nettokaltmiete '+lvEur(b.leer.entgangen):'kein Leerstand',rechts:true}],
    [{text:'Gehaltene Kautionen zum '+bisT},{text:lvEur(b.kautionen),rechts:true}]]});
  d.push({typ:'h2',text:'2. Mieteinnahmen je Mietverhältnis'});
  d.push({typ:'tabelle',zeilen:[[{text:'Einheit · Mieter'},{text:'Soll',rechts:true},{text:'Zufluss',rechts:true},{text:'Rückstand '+bisT,rechts:true}]].concat(b.vertraege.map(x=>{ const v=lvVertrag(l,x.vertragId);
    return [{text:lvEinheitName(lvEinheit(l,x.einheitId))+' · '+(v?lvMieterName(v):'')},{text:lvEur(x.sollGesamt),rechts:true},{text:lvEur(x.ist),rechts:true},{text:x.rueckstandEnde>0?lvEur(x.rueckstandEnde):'–',rechts:true}]; }))
    .concat([Object.assign([{text:'Summe'},{text:lvEur(b.summeSoll),rechts:true},{text:lvEur(b.summeEin),rechts:true},{text:lvEur(b.rueckstandEnde),rechts:true}],{fett:true})])});
  if(b.aenderungen.length){ d.push({typ:'h3',text:'Mietänderungen '+J}); b.aenderungen.forEach(a=>{ const v=lvVertrag(l,a.vertragId); d.push({typ:'liste',text:LVK.datumDE(a.ab)+': '+lvEinheitName(lvEinheit(l,a.einheitId))+(v?' ('+lvMieterName(v)+')':'')+' — Nettokaltmiete '+lvEur(a.vorher)+' → '+lvEur(a.kalt)+(LV_GRUND[a.grund]?' · '+LV_GRUND[a.grund]:'')}); }); }
  d.push({typ:'h2',text:'3. Ausgaben'});
  b.gruppen.filter(g=>g.posten.length).forEach(g=>{
    d.push({typ:'h3',text:g.name+' — '+lvEur(g.betrag)});
    d.push({typ:'tabelle',zeilen:g.posten.map(p=>[{text:LVK.datumDE(p.datum)+' · '+p.name+(p.text?' · '+p.text:'')+(p.beleg?' (Beleg '+p.beleg+')':'')},{text:lvEur(p.betrag),rechts:true}])});
  });
  if(!b.gruppen.some(g=>g.posten.length)) d.push({typ:'p',text:'Im Jahr '+J+' sind keine Kosten erfasst.'});
  if(b.vorgaenge.length){ d.push({typ:'h2',text:'4. Instandhaltung'}); b.vorgaenge.forEach(v=>d.push({typ:'liste',text:(v.gemeldetAm?LVK.datumDE(v.gemeldetAm)+': ':'')+v.titel+' — '+((LVI_STATUS_NAME(v.status))||'')+(v.rechnung>0?' · Rechnung '+lvEur(v.rechnung):'')})); }
  d.push({typ:'h2',text:(b.vorgaenge.length?'5':'4')+'. Zusammenstellung für die Anlage V'});
  d.push({typ:'tabelle',zeilen:LVR.anlageV(b).map(z=>[{text:z.abschnitt+': '+z.text},{text:z.betrag==null?'vom Eigentümer':lvEur(z.betrag),rechts:true}])});
  d.push({typ:'p',runs:[{text:'Hinweise: Einnahmen nach dem Zuflussprinzip (§ 11 EStG) einschließlich der Zehn-Tage-Regel für Mietzahlungen um den Jahreswechsel; Aufteilung in Miete und Umlagen im Verhältnis der Sollmiete. Ausgaben nach Rechnungs- bzw. Zahlungsdatum. AfA, Schuldzinsen und eigene Kosten des Eigentümers sind nicht enthalten. Erstellt mit ImmoApp — Arbeitshilfe, keine Steuerberatung.',klein:true,farbe:'666666'}]});
  const x=ImmoOffice.docx(d,{titel:'Eigentümerbericht '+J+' '+l.name});
  lvHerunterladen(x,LV_DOCX,lvDateiname('Eigentümerbericht '+J+' '+l.name)+'.docx');
}
function LVI_STATUS_NAME(s){ const st=window.ImmoInstandhaltung&&ImmoInstandhaltung.STATUS; return st?((st.find(x=>x[0]===s)||[,s])[1]):s; }
function lvAnlageVExcel(){
  const l=lvAktiv(); if(!l) return;
  const J=LV.berichtJahr||lvBerichtStandardJahr(), b=LVR.jahresbericht(l,J,{stichtag:lvHeute()}), f=t=>({v:t,s:'fett'});
  const z1=[[{v:'Zusammenstellung für die Anlage V '+J,s:'titel'}],[l.name+' · '+lvAdresse(l)+' · Eigentümer: '+lvEigentuemer(l)],[],[f('Abschnitt'),f('Posten'),f('Betrag')]]
    .concat(LVR.anlageV(b).map(z=>[z.abschnitt,z.text,z.betrag==null?'vom Eigentümer ergänzen':{v:z.betrag,s:'eurc'}]))
    .concat([[],['Überschuss vor AfA und Finanzierungskosten','',{v:b.ueberschuss,s:'fetteurc'}],['davon Arbeitskosten § 35a EStG (Info)','',{v:b.lohn35a,s:'eurc'}],[],
      ['Einnahmen nach Zufluss (§ 11 EStG) mit Zehn-Tage-Regel; Aufteilung im Verhältnis der Sollmiete. Arbeitshilfe, keine Steuerberatung.']]);
  const z2=[[f('Einheit'),f('Mieter'),f('Wohnraum'),f('Soll'),f('Zufluss'),f('davon Miete'),f('davon Umlagen'),f('davon USt'),f('Rückstand '+LVK.datumDE(b.bis))]].concat(b.vertraege.map(x=>{ const v=lvVertrag(l,x.vertragId);
    return [lvEinheitName(lvEinheit(l,x.einheitId)),v?lvMieterName(v):'',x.wohnraum?'ja':'nein',{v:x.sollGesamt,s:'eurc'},{v:x.ist,s:'eurc'},{v:x.istTeile.kalt,s:'eurc'},{v:x.istTeile.umlagen,s:'eurc'},{v:x.istTeile.ust,s:'eurc'},{v:x.rueckstandEnde,s:'eurc'}]; }));
  const z3=[[f('Datum'),f('Gruppe'),f('Kostenart'),f('Text'),f('Beleg'),f('Betrag'),f('Arbeitskosten § 35a')]];
  b.gruppen.forEach(g=>g.posten.forEach(p=>z3.push([LVK.datumDE(p.datum),g.name,p.name,p.text,p.beleg,{v:p.betrag,s:'eurc'},p.lohn35a?{v:p.lohn35a,s:'eurc'}:''])));
  const x=ImmoOffice.xlsx([{name:'Anlage V',spalten:[26,70,16],zeilen:z1},{name:'Einnahmen',spalten:[18,26,10,13,13,13,13,12,14],zeilen:z2},{name:'Ausgaben',spalten:[12,34,30,34,14,13,16],zeilen:z3}],{titel:'Anlage V '+J+' '+l.name});
  lvHerunterladen(x,LV_XLSX,lvDateiname('Anlage V '+J+' '+l.name)+'.xlsx');
}

lvReiterRegistrieren('jahresbericht','Jahresbericht',l=>lvJahresberichtHtml(l),l=>(l.vertraege||[]).length>0||(l.kosten||[]).length>0);
