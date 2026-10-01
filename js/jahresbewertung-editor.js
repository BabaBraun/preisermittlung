/* ImmoApp — Jahresbewertung: Vordruck wie die Excel-Mappe der Bank
   Deckblatt, 1. Objektdaten, 2. Bodenrichtwert, 3. Bautechnische Daten, (4. PV-Anlage), Preisansatz Grund und Boden,
   Preisansatz (Bausubstanz als Grundlage), Preisansatz (Mietertrag als Grundlage), Zusammenfassung / Sonstiges — mit den
   Nummern, Beschriftungen und Zwischenzeilen der Mappe. Eingaben stehen dort, wo sie in der Mappe stehen; was die Mappe
   rechnet, rechnet jbAusgaben() beim Tippen neu (ohne die Eingaben neu aufzubauen — der Cursor bleibt im Feld).
   Zahlen: ImmoJahresbewertung.modell() (js/jahresbewertung.js), dieselben wie im Dokument (js/jahresbewertung-dok.js). */
'use strict';

const JB_ROEM=['I','II','III','IV'];
function jbN(x,max){ if(x==null||!isFinite(x)) return '–'; x=+x; const st=max==null?2:max; if(Math.abs(x)<0.5*Math.pow(10,-st)) x=0; return x.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:st}); }
function jbProz(x){ return jbN(x,2)+' %'; }

/* ---------- Bausteine ---------- */
function jbIn(pfad,wert,art,breite,platz){
  art=art||'zahl';
  return '<input data-jb="'+pfad+'" data-art="'+art+'" type="'+(art==='datum'?'date':'text')+'"'+(art==='zahl'?' inputmode="decimal"':'')+(breite?' style="width:'+breite+'"':'')
    +(platz?' placeholder="'+lvH(platz)+'"':'')+' value="'+lvH(art==='zahl'?jbW(wert):(wert==null?'':wert))+'" aria-label="'+lvH(pfad)+'">';
}
function jbTx(pfad,wert,zeilen,platz){ return '<textarea data-jb="'+pfad+'" data-art="text" rows="'+(zeilen||3)+'" aria-label="'+lvH(pfad)+'"'+(platz?' placeholder="'+lvH(platz)+'"':'')+'>'+lvH(wert||'')+'</textarea>'; }
function jbCheck(pfad,an,text){ return '<label class="lv-check jb-check"><input type="checkbox" data-jb="'+pfad+'" data-art="check"'+(an?' checked':'')+' aria-label="'+lvH(text||pfad)+'">'+(text?' <span>'+lvH(text)+'</span>':'')+'</label>'; }
function jbFeld(label,inner,full){ return '<div class="field'+(full?' full':'')+'"><label>'+lvH(label)+'</label>'+inner+'</div>'; }
function jbOut(k,cls){ return '<span data-jbo="'+k+'"'+(cls?' class="'+cls+'"':'')+'></span>'; }
function jbTab(kopf,zeilen){ return '<div class="mdb-scroll"><table class="mdb-tbl lv-tbl jb-tbl"><thead><tr>'+kopf.map(k=>'<th'+(k.r?' class="r"':'')+'>'+lvH(k.t||k)+'</th>').join('')+'</tr></thead><tbody>'
  +zeilen.map(z=>'<tr>'+z.map((c,i)=>'<td'+(kopf[i]&&kopf[i].r?' class="r"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'; }
function jbEntf(liste,i,text){ return '<button class="secondary jb-x" onclick="jbEntfernen(\''+liste+'\','+i+')" aria-label="'+lvH(text||'Zeile entfernen')+'" data-ic="trash"></button>'; }
function jbPlus(liste,text){ return '<button class="secondary" onclick="jbHinzu(\''+liste+'\')" data-ic="plus">'+lvH(text)+'</button>'; }
/* Zeile wie in der Mappe: Bezeichnung | Menge, Satz oder Angabe | Betrag oder Erläuterung; cls: rechn (Betrag rechtsbündig), summe, gesamt, breit */
function jbZeile(l,m,b,cls){ return '<div class="jb-z'+(cls?' '+cls:'')+'"><span class="jb-l">'+l+'</span><span class="jb-m">'+(m||'')+'</span><span class="jb-b">'+(b||'')+'</span></div>'; }
function jbKap(nr,titel,inhalt,extra){ return '<section class="jb-kap"><h3 class="jb-kap-t">'+(nr!=null?'<span class="jb-nr">'+nr+'.</span> ':'')+lvH(titel)+(extra||'')+'</h3>'+inhalt+'</section>'; }
function jbU(nr,titel){ return '<h4 class="jb-u">'+lvH((nr?nr+' ':'')+titel)+'</h4>'; }
function jbErl(k){ return '<details class="jb-erl"><summary>Erläuterungstext des Vordrucks</summary>'+jbTx('texte.'+k,JB_EDIT.v.texte[k],5)+'</details>'; }
function jbGebName(v,i){ return (v.gebaeude[i]||{}).text||('Gebäude '+(i+1)); }

/* Ertragsabschnitte: je Gebäude ein Teil (auch ohne Miete, dann mit 0 — so ändert sich der Aufbau beim Tippen nicht) */
function jbErtragNummern(kap,n){
  if(n<=1) return {rnd:[kap+'.1'],daten:[kap+'.2'],preis:[kap+'.3'],summe:kap+'.4'};
  const a=[...Array(n).keys()];
  return {rnd:a.map(i=>kap+'.'+(i+1)),daten:a.map(i=>kap+'.'+(i+1)+'.1'),preis:a.map(i=>kap+'.'+(n+i+1)),summe:kap+'.'+(2*n+1)};
}
function jbSubstanzNummern(kap,n){ const a=[...Array(n).keys()]; return {rnd:a.map(i=>kap+'.'+(2*i+1)),preis:a.map(i=>kap+'.'+(2*i+2)),boden:kap+'.'+(2*n+1),geb:kap+'.'+(2*n+2),summe:kap+'.'+(2*n+3)}; }

/* ---------- Vordruck ---------- */
function jbEditorHtml(){
  const E=JB_EDIT, v=E.v, l=LV.liste.find(x=>x.id===E.lId), kap=JBK.kapitel(v), G=v.gebaeude, mehrere=G.length>1, ohneGeb=!G.length;
  const name=l?l.name:E.neuL?E.neuL.name+' (neue Liegenschaft)':'';
  let h='<div class="mdb-box lv-formbox jb-editor" id="jb_editor"><h3>'+lvH((E.bId?'Vordruck · ':'Neuer Vordruck · ')+name)+'</h3><div id="lv_formfehler" class="lv-warn" hidden></div>';
  h+='<div class="jb-erg">'+[['Bodenwert','boden'],['Substanz','substanz'],['Ertrag','ertrag'],['Ergebnis','ergebnis']].map(([t,k])=>'<div><span>'+t+'</span><b data-jbo="'+k+'"></b></div>').join('')
    +'<p class="jb-offen" id="jb_offen" hidden></p></div>';
  h+='<div class="grid three lv-form jb-verw">'
    +jbFeld('Stand','<select data-jb="@status" data-art="text">'+LVBW.STATUS.map(([k,t])=>'<option value="'+k+'"'+(E.status===k?' selected':'')+'>'+t+'</option>').join('')+'</select>')
    +jbFeld('Quelle / Datei',jbIn('@quelle',E.quelle,'text'))
    +jbFeld(' ','<button class="secondary" onclick="jbDokAnsehen()" data-ic="file">Vordruck ansehen, drucken, PDF</button>')+'</div>';

  // Deckblatt
  h+=jbKap(null,'Deckblatt',
    jbZeile('Auftraggeber(in):',jbIn('deckblatt.auftraggeber',v.deckblatt.auftraggeber,'text'),'','breit')
    +jbZeile('',jbIn('deckblatt.auftraggeberAnschrift',v.deckblatt.auftraggeberAnschrift,'text',null,'Anschrift'),'','breit')
    +jbZeile('Auftragsinhalt:',jbIn('deckblatt.auftragsinhalt',v.deckblatt.auftragsinhalt,'text'),'','breit')
    +jbZeile('Verwendungszweck:',jbIn('deckblatt.verwendungszweck',v.deckblatt.verwendungszweck,'text'),'','breit')
    +jbZeile('Objekt:',jbIn('objekt',v.objekt,'text',null,'z. B. Bankgebäude mit Laden'),'','breit')
    +jbZeile('Objektanschrift:',jbIn('deckblatt.anschrift',v.deckblatt.anschrift,'text',null,'Straße Nr., PLZ Ort'),'','breit')
    +jbZeile('Ermittlung zum Stichtag:',jbIn('stichtag',v.stichtag,'datum')));

  // 1. Objektdaten
  let o=jbU('1.1','Allgemein')
    +jbZeile('Rechtsform:',jbIn('objektdaten.rechtsform',v.objektdaten.rechtsform,'text'),'','breit')
    +jbZeile('Art der Bebauung:',jbOut('t.objekt'),'','breit')+jbZeile('Objektanschrift:',jbOut('t.anschrift'),'','breit')
    +jbZeile('Nutzung:',jbOut('t.nutzung'),'<span class="lv-klein">= Nutzbarkeit unter 2.1</span>');
  o+=jbU('1.2','Grundstück');
  v.boden.forEach((b,i)=>{ o+=jbZeile((i?'Ggf. ':'')+'Grundstücksanteil '+JB_ROEM[i],jbIn('boden.'+i+'.flaeche',b.flaeche,'zahl','7em')+' m²',i?jbEntf('boden',i,'Grundstücksanteil entfernen'):'')
    +jbZeile('Aktueller Bodenrichtwert:',jbOut('b.'+i+'.brw'),'(Ableitung aus öffentlicher Bodenrichtwerttabelle, Preisansatz unter 2.'+(i+1)+')'); });
  if(v.boden.length<JBK.MAX.boden) o+=jbZeile('Ggf. Grundstücksanteil '+JB_ROEM[v.boden.length],jbPlus('boden','Grundstücksanteil '+JB_ROEM[v.boden.length]));
  o+=jbZeile('Gesamtgrundstück',jbOut('b.flaeche'),'','summe');
  if(!ohneGeb){
    o+=jbU('1.3','Gebäude');
    G.forEach((g,i)=>{ const zu=mehrere?' '+jbGebName(v,i):'';
      o+=jbZeile('Baujahr'+lvH(zu)+':','ca. '+jbIn('gebaeude.'+i+'.baujahr',g.baujahr,'zahl','5em'),jbIn('gebaeude.'+i+'.baujahrText',g.baujahrText,'text',null,'z. B. (fiktives Baujahr aufgrund Modernisierung)'))
        +jbZeile('BGF (Bruttogrundfläche)'+lvH(zu),'ca. '+jbIn('gebaeude.'+i+'.bgf',g.bgf,'zahl','6em')+' m²',jbIn('gebaeude.'+i+'.bgfText',g.bgfText,'text',null,'z. B. (abgeleitet aus den Grundrissen)')); });
  } else o+=jbU('1.3','Bebauung')+jbTx('objektdaten.bebauung',v.objektdaten.bebauung,4,'z. B. Bebauung nach § 34 BauGB, Bebauungsplan …');
  v.objektdaten.merkmale.forEach((m,k)=>{ o+=jbZeile(jbIn('objektdaten.merkmale.'+k+'.label',m.label,'text',null,'Bezeichnung'),jbIn('objektdaten.merkmale.'+k+'.wert',m.wert,'text'),jbEntf('merkmale',k),'merkmal'); });
  o+='<div class="mdb-actions">'+jbPlus('merkmale','Zeile')+'</div>';
  if(!ohneGeb){
    o+=jbZeile('Mietertrag / Jahr:',jbOut('m.jahr'),'(ansetzbare Nettokaltmiete, s. Ziffer '+kap.ertrag+')');
    o+=jbU('','Aufstellung der monatlichen Mieterträge (netto, ohne Nebenkosten):')
      +jbTab(['Einheit / Mieter',{t:'€ / Monat',r:1},'Bemerkung'].concat(mehrere?['Gebäude']:[],[{t:'gewerblich'},{t:'Abschlag %',r:1},'']),
        v.mieten.map((m,i)=>[jbIn('mieten.'+i+'.text',m.text,'text'),jbIn('mieten.'+i+'.monat',m.monat,'zahl','7em'),jbIn('mieten.'+i+'.hinweis',m.hinweis,'text',null,'(lt. Mietvertrag)')].concat(
          mehrere?['<select data-jb="mieten.'+i+'.gebaeude" data-art="zahl">'+G.map((g,k)=>'<option value="'+k+'"'+(m.gebaeude===k?' selected':'')+'>'+lvH(jbGebName(v,k))+'</option>').join('')+'</select>']:[],
          [jbCheck('mieten.'+i+'.gewerblich',m.gewerblich,''),jbIn('mieten.'+i+'.abschlag',m.abschlag,'zahl','4em'),jbEntf('mieten',i)])))
      +jbZeile('Summe monatlich',jbOut('m.monat'),'','summe')+jbZeile('Summe jährlich',jbOut('m.jahr'),'','gesamt')
      +'<div class="mdb-actions">'+jbPlus('mieten','Mietzeile')+'</div>'
      +'<p class="hint">„gewerblich“ zählt zum Anteil gewerbliche Kaltmiete (Ziffer '+kap.ertrag+'); „Abschlag %“ ergibt den Abschlag für gewerbliche Vermietung, wenn dort kein fester Betrag steht.</p>';
  }
  h+=jbKap(1,'Objektdaten',o);

  // 2. Bodenrichtwert
  let w=jbErl('bodenrichtwert')+jbZeile('Grundstückslage:',jbOut('t.anschrift'),'','breit');
  v.boden.forEach((b,i)=>{ const p='boden.'+i+'.';
    w+=jbU('2.'+(i+1),i?'Merkmale Grundstücksanteil '+JB_ROEM[i]:'Grundstücksmerkmale')
      +jbZeile('Flst.-Nr.:',jbIn(p+'flst',b.flst,'text','9em'))+jbZeile('Nutzbarkeit:',jbIn(p+'nutzbarkeit',b.nutzbarkeit,'text'),'','breit')
      +jbZeile('Zone Nr.:',jbIn(p+'zone',b.zone,'text','9em'))+jbZeile('Richtwert:',jbIn(p+'richtwert',b.richtwert,'zahl','6em')+' €/m²')
      +jbZeile('Preisansatz:',jbIn(p+'brw',b.brw,'zahl','6em')+' €/m²','<span class="lv-klein">geht in die Rechnung ein; übernimmt den Richtwert, solange hier nichts anderes steht</span>'); });
  w+=jbU('','Bodenrichtwertkarte')+'<div class="jb-bilder">'+v.bilder.karte.map((id,i)=>'<figure data-anhang="'+lvH(id)+'"><img alt="Bodenrichtwertkarte '+(i+1)+'"><button class="secondary jb-x" onclick="jbBildWeg('+i+')" aria-label="Bild entfernen" data-ic="trash"></button></figure>').join('')
    +(v.bilder.karte.length<8?'<label class="secondary lv-datei jb-bild-neu">'+(typeof iaSvg==='function'?iaSvg('upload'):'')+' Bild hinzufügen<input type="file" accept="image/*" multiple onchange="jbBildHinzu(this.files);this.value=\'\'"></label>':'')+'</div>'
    +'<p class="hint">Ausschnitt der Bodenrichtwertkarte und Auszug aus BORIS-BW (Bildschirmfoto) — erscheinen im Vordruck unter Ziffer 2.</p>';
  h+=jbKap(2,'Bodenrichtwert',w);

  // 3. Bautechnische Daten
  h+=jbKap(3,'Bautechnische Daten',jbU('3.1','Bauschäden / Instandhaltung'+(ohneGeb?' / Altlasten':''))+jbTx('bautechnik.schaeden',v.bautechnik.schaeden,4)
    +jbU('3.2','Technischer Zustand / Instandhaltungsstau')+jbTx('bautechnik.zustand',v.bautechnik.zustand,3)
    +jbU('3.3','Wesentliche Modernisierungen in den letzten 10 Jahren')+jbTx('bautechnik.modernisierung',v.bautechnik.modernisierung,2,'/')
    +jbU('3.4','Allgemeiner Eindruck / Erläuterungen')+jbTx('bautechnik.eindruck',v.bautechnik.eindruck,6)
    +'<label class="lv-check jb-pv-schalter"><input type="checkbox" '+(v.pv?'checked ':'')+'onchange="jbPv(this.checked)"> <span>PV-Anlage vorhanden (eigenes Kapitel „PV-Anlage“ wie im Vordruck)</span></label>');

  // 4. PV-Anlage
  if(v.pv){ const P=v.pv, n=kap.pv;
    h+=jbKap(n,'PV-Anlage',jbErl('pv')+jbU(n+'.1','Preisansatz PV-Anlage')
      +jbZeile('Nutzungsgrad der Einspeisung:',jbIn('pv.einspeisung',P.einspeisung,'zahl','5em')+' %')+jbZeile('Nutzungsgrad des Eigenverbrauchs:',jbIn('pv.eigen',P.eigen,'zahl','5em')+' %')
      +jbZeile('Inbetriebnahme:',jbIn('pv.inbetrieb',P.inbetrieb,'datum'))+jbZeile('Nennleistung in kWp:',jbIn('pv.kwp',P.kwp,'zahl','6em'))
      +jbZeile('Durchschnittlicher Stromertrag (in Abhängigkeit des Nutzungsgrades, der Höhe des durchschnittlichen Strompreises und der Einspeisevergütung)',jbIn('pv.eurKwh',P.eurKwh,'zahl','6em')+' €/kWh')
      +jbZeile('EEG-Einspeisevergütung bis:',jbIn('pv.eegEnde',P.eegEnde,'datum'))+jbZeile('Durchschnittliche Stromerzeugung / Jahr:',jbIn('pv.kwh',P.kwh,'zahl','7em')+' kWh')
      +jbZeile('Liegenschaftszins:',jbIn('pv.lz',P.lz,'zahl','5em')+' %')+jbZeile('Bewirtschaftungskosten (Pauschalansatz):',jbIn('pv.bwk',P.bwk,'zahl','5em')+' %')
      +jbZeile('Laufzeit seit Inbetriebnahme (ca.):',jbOut('pv.laufzeit'))+jbZeile('Restnutzungsdauer (ca.):',jbOut('pv.rest'))
      +jbZeile('Barwertfaktor (in Relation Restnutzungsdauer und Liegenschaftszins):',jbOut('pv.vf'))
      +jbU('','Barwertermittlung des Solarertrags')
      +jbZeile('Rohertrag',jbOut('pv.rohText'),jbOut('pv.roh'),'rechn')+jbZeile('./. Bewirtschaftungskosten',jbOut('pv.bewText'),jbOut('pv.bew'),'rechn')
      +jbZeile('Zwischensumme Reinertrag','',jbOut('pv.rein'),'rechn summe')+jbZeile('x Barwertfaktor',jbOut('pv.vf2'),'','rechn')
      +jbZeile('= Barwert der PV-Anlage zum Stichtag','',jbOut('pv.wert'),'rechn gesamt'));
  }

  // Preisansatz Grund und Boden
  { const n=kap.boden; let b='';
    v.boden.forEach((x,i)=>{ b+=jbU(n+'.'+(i+1),'Preisansatz Grundstücksanteil '+JB_ROEM[i])
      +jbZeile('Grundstücksanteil '+JB_ROEM[i],jbOut('b.'+i+'.flaeche'),'','rechn')+jbZeile('x Aktueller Bodenrichtwert:',jbOut('b.'+i+'.brw'),'','rechn')
      +jbZeile('Zwischensumme','',jbOut('b.'+i+'.zw'),'rechn summe')
      +jbZeile('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbIn('boden.'+i+'.abschlag',x.abschlag,'zahl','4em')+' %',jbOut('b.'+i+'.ab'),'rechn')
      +jbZeile(v.boden.length>1?'Preisansatz Grundstücksanteil '+JB_ROEM[i]:'Preisansatz Grund und Boden','',jbOut('b.'+i+'.wert'),'rechn gesamt'); });
    if(v.boden.length>1||ohneGeb){
      b+=jbU(n+'.'+(v.boden.length+1),'Preisansatz Grund und Boden')+v.boden.map((x,i)=>jbZeile('Preisansatz Grundstücksanteil '+JB_ROEM[i],'',jbOut('b.'+i+'.wert'),'rechn')).join('')
        +jbZeile('Preisansatz Grund und Boden',jbOut('b.flaeche'),jbOut('b.summe'),'rechn summe');
      if(ohneGeb){
        b+=v.pauschal.map((p,i)=>jbZeile('+ '+jbIn('pauschal.'+i+'.text',p.text,'text'),'',jbIn('pauschal.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('pauschal',i),'rechn merkmal')).join('')
          +v.objektspezifisch.map((p,i)=>jbZeile('± '+jbIn('objektspezifisch.'+i+'.text',p.text,'text'),'',jbIn('objektspezifisch.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('objektspezifisch',i),'rechn merkmal')).join('')
          +'<div class="mdb-actions">'+jbPlus('objektspezifisch','objektspezifisches Merkmal (+ / −)')+'</div>'
          +(v.pv?jbZeile('+ objektspezifische Merkmale (PV-Anlage)','',jbOut('s.pv'),'rechn'):'')
          +jbZeile('Preisansatz Grundstück inkl. Außenanlagen','',jbOut('ergebnis2'),'rechn gesamt');
      }
    }
    h+=jbKap(n,'Preisansatz Grund und Boden',b);
  }

  // Preisansatz (Bausubstanz als Grundlage)
  if(!ohneGeb){ const N=jbSubstanzNummern(kap.substanz,G.length); let s=jbErl('bausubstanz');
    const arten=Object.keys(ImmoBaupreisindex.ARTEN);
    G.forEach((g,i)=>{ const p='gebaeude.'+i+'.', zu=mehrere?' – '+jbGebName(v,i):'';
      s+=(mehrere?'<div class="jb-geb-kopf"><b>Gebäude '+(i+1)+'</b>'+jbEntf('gebaeude',i,'Gebäude entfernen').replace('></button>','>Gebäude entfernen</button>')+'</div>':'')
        +jbZeile('Bezeichnung des Gebäudes:',jbIn(p+'text',g.text,'text'),'','breit');
      const st=[1,2,3,4,5];
      const nhk=[['NHK 2010 nach Standard','',st.map(x=>jbIn(p+'kosten1.'+(x-1),g.kosten1[x-1],'zahl','5em')),'',''],
        ['NHK 2010 nach Standard (2. Zeile, gemittelt)','',st.map(x=>jbIn(p+'kosten2.'+(x-1),g.kosten2[x-1],'zahl','5em')),'',''],
        ['Kostenkennwerte','',st.map(x=>jbOut('g.'+i+'.kk.'+(x-1))),'','']]
        .concat(JBK.BAUTEILE.map(([nm,wt],r)=>[nm,jbZ(wt,2),st.map(x=>jbIn(p+'anteile.'+r+'.'+(x-1),g.anteile[r][x-1],'zahl','3.6em')),jbOut('g.'+i+'.b.'+r+'.summe'),jbOut('g.'+i+'.b.'+r+'.kosten')]),
          [['NHK 2010 (Summe)','',st.map(()=>''),'',jbOut('g.'+i+'.nhkSumme','strong')]]);
      s+='<div class="jb-nhk"><p class="jb-nhk-t">NHK 2010 nach Standardstufen'+lvH(zu)+' — Anteil je Stufe (Summe je Bauteil 1; 0 = Bauteil fehlt)</p>'
        +jbTab(['Bauteil',{t:'Wägungsanteil',r:1},{t:'Stufe 1',r:1},{t:'2',r:1},{t:'3',r:1},{t:'4',r:1},{t:'5',r:1},{t:'Summe',r:1},{t:'€/m²',r:1}],nhk.map(z=>[lvH(z[0]),z[1]].concat(z[2],[z[3],z[4]])))+'</div>';
      s+=jbU(N.rnd[i],'Berechnung der Restnutzungsdauer und Alterswertminderung'+zu)
        +jbZeile('Baujahr des Gebäudes:',jbOut('g.'+i+'.baujahr'),jbOut('g.'+i+'.baujahrText'))
        +jbZeile('Gesamtnutzungsdauer:',jbIn(p+'gnd',g.gnd,'zahl','4em')+' Jahre')
        +jbZeile('Gebäudealter',jbOut('g.'+i+'.alter'))+jbZeile('Restnutzungsdauer (RND):',jbOut('g.'+i+'.rndRech'))
        +jbZeile('Angepasste RND:',jbIn(p+'rnd',g.rnd,'zahl','4em','= RND')+' Jahre',jbIn(p+'rndText',g.rndText,'text',null,'(auf Grundlage des aktuellen Zustands)'))
        +jbZeile('Technische Wertminderung ca.',jbOut('g.'+i+'.wm'),'(lt. Sachwertrichtlinie)')
        +jbZeile('Baupreisindex',jbIn(p+'bpi',g.bpi,'zahl','5em'),jbIn(p+'bpiText',g.bpiText,'text',null,'z. B. Bürogebäude November 2024'))
        +jbZeile('',' ','<select data-jb="'+p+'bpiArt" data-art="text" aria-label="Amtlicher Index für">'+arten.map(a=>'<option value="'+a+'"'+(g.bpiArt===a?' selected':'')+'>'+lvH(ImmoBaupreisindex.ARTEN[a].name)+'</option>').join('')+'</select>'
          +' <button class="secondary" onclick="jbIndexAmtlich('+i+')">Amtlichen Wert zum Stichtag übernehmen</button>')
        +jbU(N.preis[i],'Berechnung des Gebäudepreis in Abhängigkeit der Restnutzungsdauer'+zu)
        +jbZeile('Normalherstellungskosten',jbOut('g.'+i+'.nhk'),'(lt. NHK 2010, Tabelle oben)')
        +jbZeile('./. Abschlag für Bauweise',jbIn(p+'abschlagBauweise',g.abschlagBauweise,'zahl','4em')+' %',jbOut('g.'+i+'.abEur'))
        +jbZeile('Bereinigte NHK',jbOut('g.'+i+'.nhkBer'),'(gerundet)','summe')
        +jbZeile('Baupreisindex (umgerechnet)',jbOut('g.'+i+'.index'),'Umrechnungsfaktor '+jbIn(p+'bpiFaktor',g.bpiFaktor,'zahl','5.5em'))
        +jbZeile('Normalherstellungskosten',jbOut('g.'+i+'.heute'),'zum heutigen Stichtag')
        +jbZeile('./. Technische Wertminderung',jbOut('g.'+i+'.wmEur'),jbOut('g.'+i+'.wmText'))
        +jbZeile('Gebäudepreis'+lvH(mehrere?' '+jbGebName(v,i):''),jbOut('g.'+i+'.preis','strong'),'zum heutigen Stichtag','gesamt');
    });
    if(G.length<JBK.MAX.gebaeude) s+='<div class="mdb-actions">'+jbPlus('gebaeude','Weiteres Gebäude (z. B. Lager, Scheune)')+'</div>';
    s+=jbU(N.boden,'Preisansatz Grund und Boden');
    v.boden.forEach((x,i)=>{ s+=jbZeile('Grundstücksanteil '+JB_ROEM[i],jbOut('b.'+i+'.flaeche'),'','rechn')+jbZeile('x Aktueller Bodenrichtwert:',jbOut('b.'+i+'.brw'),'','rechn')
      +jbZeile('Zwischensumme Grundstücksanteil '+JB_ROEM[i],'',jbOut('b.'+i+'.zw'),'rechn summe')+jbZeile('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbOut('b.'+i+'.abPct'),jbOut('b.'+i+'.ab'),'rechn'); });
    s+=jbZeile('Preisansatz Grund und Boden','',jbOut('b.summe'),'rechn gesamt');
    s+=jbU(N.geb,'Preisansatz Gebäude und Außenanlagen (Bausubstanz als Grundlage)');
    G.forEach((g,i)=>{ const zu=mehrere?' '+jbGebName(v,i):''; s+=jbZeile('Bruttogrundfläche'+lvH(zu)+' (BGF)',jbOut('g.'+i+'.bgf'),'','rechn')
      +jbZeile('x Preis / m² in Abhängigkeit der RND',jbOut('g.'+i+'.preis2'),'','rechn')+jbZeile('Zwischensumme'+lvH(mehrere?zu:' Gebäude'),'',jbOut('g.'+i+'.wert'),'rechn summe'); });
    if(mehrere) s+=jbZeile('Zwischensumme '+lvH(G.map((g,i)=>jbGebName(v,i)).join(' und ')),'',jbOut('s.geb'),'rechn summe');
    s+=v.pauschal.map((p,i)=>jbZeile('+ '+jbIn('pauschal.'+i+'.text',p.text,'text')+' (Pauschalansatz)','',jbIn('pauschal.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('pauschal',i),'rechn merkmal')).join('')
      +'<div class="mdb-actions">'+jbPlus('pauschal','Pauschalansatz')+'</div>'
      +jbZeile('Preisansatz Gebäude und Außenanlagen','',jbOut('s.gebAussen'),'rechn gesamt');
    s+=jbU(N.summe,'Preisansatz (Bausubstanz als Grundlage)')
      +jbZeile('Preisansatz Grund und Boden','',jbOut('b.summe2'),'rechn')+jbZeile('Preisansatz Gebäude und Außenanlagen','',jbOut('s.gebAussen2'),'rechn')
      +jbZeile('Vorläufiger Preisansatz','',jbOut('s.vorlaeufig'),'rechn summe')
      +(v.pv?jbZeile('+ objektspezifische Merkmale (PV-Anlage)','',jbOut('s.pv'),'rechn'):'')
      +v.objektspezifisch.map((p,i)=>jbZeile('± '+jbIn('objektspezifisch.'+i+'.text',p.text,'text',null,'objektspezifische Merkmale (z. B. Grundstückslasten)'),'',jbIn('objektspezifisch.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('objektspezifisch',i),'rechn merkmal')).join('')
      +'<div class="mdb-actions">'+jbPlus('objektspezifisch','objektspezifisches Merkmal (+ / −)')+'</div>'
      +jbZeile('Preisansatz (Bausubstanz als Grundlage)','',jbOut('s.substanz'),'rechn gesamt');
    h+=jbKap(kap.substanz,'Preisansatz (Bausubstanz als Grundlage)',s);
  }

  // Preisansatz (Mietertrag als Grundlage)
  if(!ohneGeb){ const N=jbErtragNummern(kap.ertrag,G.length); let e=jbErl('mietertrag');
    G.forEach((g,i)=>{ const nm=mehrere?jbGebName(v,i):'', fuer=mehrere?'für '+nm:'für Gebäude';
      e+=jbU(N.rnd[i],'Berechnung Restnutzungsdauer '+fuer)
        +jbZeile('Baujahr'+(mehrere?'':' Hauptgebäude')+':',jbOut('g.'+i+'.baujahr2'),jbOut('g.'+i+'.baujahrText2'))+jbZeile('Gesamtnutzungsdauer:',jbOut('g.'+i+'.gnd'))
        +jbZeile('Restnutzungsdauer (RND):',jbOut('g.'+i+'.rndRech2'))+jbZeile('Angepasste RND:',jbOut('g.'+i+'.rnd'),jbOut('g.'+i+'.rndText'))
        +jbU(N.daten[i],'Daten für die Preisermittlung auf Grundlage des Gebäudeertrags'+(mehrere?' – '+nm:''))
        +jbZeile('Gesamte Jahreskaltmiete / Rohertrag:',jbOut('e.'+i+'.roh'),mehrere?'('+lvH(nm)+')':'')
        +jbZeile('Abschlag Bewirtschaftungskosten',i?jbOut('e.'+i+'.bwkPct'):jbIn('bwk',v.bwk,'zahl','4em')+' %','(aus dem jährlichen Rohertrag)')
        +jbZeile('Anteil gewerbliche Kaltmiete',jbOut('e.'+i+'.gew'))
        +jbZeile('- Abschlag für gewerbliche Vermietung',jbOut('e.'+i+'.ab'),i?'':jbIn('abschlagText',v.abschlagText,'text',null,'(z. B. 5 % aus dem jährlichen Rohertrag Laden)'))
        +(i?'':jbZeile('',' fester Betrag: '+jbIn('abschlagFest',v.abschlagFest,'zahl','7em','aus % je Zeile')+' € / Jahr','<span class="lv-klein">leer = Summe aus „Abschlag %“ der Mietzeilen</span>'))
        +jbZeile('Bodenwertverzinsung',i?jbOut('e.'+i+'.lzPct'):jbIn('lz',v.lz,'zahl','4em')+' %','(aus dem Bodenwert)')
        +jbZeile('Preisansatz Grund und Boden:',jbOut('e.'+i+'.boden'),mehrere?'(anteilig zum Rohertrag)':'')
        +jbZeile('Angepasste RND',jbOut('e.'+i+'.rnd'))+jbZeile('Vervielfältiger für Gebäude',jbOut('e.'+i+'.vf'),'(Barwertfaktor für die Kapitalisierung)'); });
    G.forEach((g,i)=>{ const nm=mehrere?jbGebName(v,i):'Gebäude';
      e+=jbU(N.preis[i],'Preisansatz '+nm+' (Mietertrag als Grundlage)')
        +jbZeile('Gesamte Jahreskaltmiete / Rohertrag:',jbOut('e.'+i+'.roh2'),'','rechn')
        +jbZeile('- Abschlag für Bewirtschaftungskosten',jbOut('e.'+i+'.bwkPct2'),jbOut('e.'+i+'.bew'),'rechn')
        +jbZeile('Zwischensumme','',jbOut('e.'+i+'.zw'),'rechn summe')+jbZeile('- Abschlag für gewerbliche Vermietung','',jbOut('e.'+i+'.ab2'),'rechn')
        +jbZeile('Grundstücksreinertrag (Gebäude inkl. Grund und Boden)','',jbOut('e.'+i+'.rein'),'rechn summe')
        +jbZeile('- Ertragsanteil Grund und Boden',jbOut('e.'+i+'.lzText'),jbOut('e.'+i+'.bodenZins'),'rechn')
        +jbZeile((mehrere?'Reinertrag '+lvH(nm):'Gebäudereinertrag')+' (nur Gebäude ohne Anteil Grund und Boden)','',jbOut('e.'+i+'.gebRein'),'rechn summe')
        +jbZeile('x Vervielfältiger für Gebäude (Barwertfaktor)',jbOut('e.'+i+'.vfText'),'','rechn')
        +jbZeile('Preisansatz '+lvH(nm)+' (Mietertrag als Grundlage)','',jbOut('e.'+i+'.wert'),'rechn gesamt'); });
    e+=jbU(N.summe,'Preisansatz (Mietertrag als Grundlage)')+jbZeile('Preisansatz Grund und Boden','',jbOut('e.boden'),'rechn')
      +G.map((g,i)=>jbZeile('Preisansatz '+lvH(mehrere?jbGebName(v,i):'Gebäude')+' (Mietertrag als Grundlage)','',jbOut('e.'+i+'.wert2'),'rechn')).join('')
      +(v.pv?jbZeile('PV-Anlage','',jbOut('e.pv'),'rechn'):'')+jbZeile('Preisansatz (Mietertrag als Grundlage)','',jbOut('e.ertrag'),'rechn gesamt');
    h+=jbKap(kap.ertrag,'Preisansatz (Mietertrag als Grundlage)',e);
  }

  // Zusammenfassung / Sonstiges
  { const n=kap.summe; let z=jbU(n+'.1','Die einzelnen Preiskomponenten für Sie im Überblick');
    z+=ohneGeb?'<div class="jb-ueberblick">'+jbZeile('Preisansatz Grund und Boden','',jbOut('b.summe3'),'rechn')+jbZeile('Summe der objektspezifischen Eigenschaften','',jbOut('s.objektLand'),'rechn')
        +jbZeile('Preisansatz Grundstück inkl. Außenanlagen','',jbOut('ergebnis3'),'rechn gesamt')+'</div>'
      :'<div class="jb-ueberblick">'+jbZeile('Preisansatz (Bausubstanz als Grundlage)','',jbOut('s.substanz2'),'rechn')+jbZeile('Preisansatz (Mietertrag als Grundlage)','',jbOut('e.ertrag2'),'rechn')
        +jbZeile(jbOut('t.mittel'),'',jbOut('ergebnis3'),'rechn gesamt')+'</div>'
        +jbZeile('Gewichtung Bausubstanz',jbIn('gewichtung',v.gewichtung,'zahl','4em')+' %','<span class="lv-klein">Vordruck: 50 % (Mittel); Mietertrag = Rest</span>');
    z+=jbU(n+'.2','Sonstiges / Hinweise')+jbTx('texte.hinweise',v.texte.hinweise,7)
      +jbZeile('Ort, Datum:',jbIn('ort',v.ort,'text','12em','Ort'),jbOut('t.datum'));
    h+=jbKap(n,'Zusammenfassung / Sonstiges',z);
  }
  h+='<div class="grid lv-form">'+jbFeld('Interne Notiz zur Bewertung (nicht im Vordruck)',jbTx('@notiz',E.notiz,3),true)+'</div>';
  h+='<div id="lv_formfehler_unten" class="lv-warn" hidden></div><div class="mdb-actions"><button class="primary" onclick="jbSpeichern()" data-ic="check">Speichern</button>'
    +'<button class="secondary" onclick="jbDokAnsehen()" data-ic="file">Vordruck ansehen</button><button class="secondary" onclick="jbAbbrechen()">Abbrechen</button>'
    +(E.bId?'<button class="danger" onclick="jbLoeschen()" data-ic="trash">Vordruck löschen</button>':'')+'</div></div>';
  return h;
}

/* Ausgaben neu berechnen (ohne die Eingaben neu aufzubauen) — Zahlen aus ImmoJahresbewertung.modell() */
function jbWerte(v){
  const M=JBK.modell(v), o={}, E2=x=>jbE(x), qm=x=>jbN(x,2)+' €/m²';
  o.boden=jbE(M.bodenSumme); o.substanz=M.substanz==null?'–':jbE(M.substanz); o.ertrag=M.ertrag==null?'–':jbE(M.ertrag); o.ergebnis=jbE(M.ergebnis);
  o.ergebnis2=o.ergebnis3=o.ergebnis;
  o['t.objekt']=v.objekt||'–'; o['t.anschrift']=v.deckblatt.anschrift||'–'; o['t.nutzung']=(v.boden[0]||{}).nutzbarkeit||'–';
  o['t.datum']=v.stichtag?LVK.datumDE(v.stichtag):'–';
  o['t.mittel']=M.gewichtung===50?'Mittel aus den o.g. Preisansätzen':'Gewichtetes Mittel (Bausubstanz '+jbN(M.gewichtung)+' %, Mietertrag '+jbN(100-M.gewichtung)+' %)';
  M.boden.forEach((b,i)=>{ o['b.'+i+'.brw']=qm(b.brw); o['b.'+i+'.flaeche']=jbN(b.flaeche)+' m²'; o['b.'+i+'.zw']=E2(b.zw); o['b.'+i+'.ab']=E2(b.abschlagEur); o['b.'+i+'.abPct']=jbProz(b.abschlagPct); o['b.'+i+'.wert']=E2(b.wert); });
  o['b.flaeche']=jbN(M.flaecheSumme)+' m²'; o['b.summe']=o['b.summe2']=o['b.summe3']=E2(M.bodenSumme);
  o['m.monat']=E2(M.miete.monat); o['m.jahr']=E2(M.miete.jahr);
  M.geb.forEach((g,i)=>{ const q=v.gebaeude[i], k='g.'+i+'.';
    g.kostenkennwerte.forEach((x,s)=>{ o[k+'kk.'+s]=jbZ(x,2); });
    g.bauteile.forEach((b,r)=>{ o[k+'b.'+r+'.summe']=jbZ(b.summeAnteile,2)+(b.summeAnteile!==0&&b.summeAnteile!==1?' ⚠':''); o[k+'b.'+r+'.kosten']=jbZ(b.kosten,2); });
    o[k+'nhkSumme']=jbZ(g.nhk2010,2);
    o[k+'baujahr']=o[k+'baujahr2']=q.baujahr!=null?String(q.baujahr):'–'; o[k+'baujahrText']=o[k+'baujahrText2']=q.baujahrText||'';
    o[k+'gnd']=jbN(g.gnd)+' Jahre'; o[k+'alter']=jbN(g.alter)+' Jahre'; o[k+'rndRech']=o[k+'rndRech2']=jbN(g.rndRech)+' Jahre';
    o[k+'rnd']=jbN(g.rnd)+' Jahre'; o[k+'rndText']=g.angepasst?(q.rndText||'(auf Grundlage des aktuellen Zustands)'):'(= rechnerische RND)';
    o[k+'wm']=jbN(g.wm)+' %'; o[k+'nhk']=jbN(g.nhk2010,2)+' €/m²'; o[k+'abEur']=jbN(g.abschlagEur)+' €/m² (z. B. Holzständerbauweise 1960–1972 bis zu 20 %)';
    o[k+'nhkBer']=jbN(g.nhkBer)+' €/m²'; o[k+'index']=jbN(g.index2010,1); o[k+'heute']=jbN(g.nhkHeute,2)+' €/m²';
    o[k+'wmEur']=jbN(g.wmEur,2)+' €/m²'; o[k+'wmText']='entspricht ca. '+jbN(g.wm)+' % aus '+jbN(g.nhkHeute,2)+' €/m²';
    o[k+'preis']=o[k+'preis2']=jbN(g.preis)+' €/m²'; o[k+'bgf']=jbN(g.bgf,2)+' m²'; o[k+'wert']=E2(g.wert);
    const t=M.teile.find(x=>x.gebaeude===i)||{roh:0,bew:0,zw:0,abschlag:0,rein:0,bodenAnteil:0,bodenZins:0,gebRein:0,rnd:g.rnd,vf:0,wert:0,gewerblich:0,bwkPct:+v.bwk||0,lzPct:+v.lz||0};
    const e='e.'+i+'.';
    o[e+'roh']=o[e+'roh2']=E2(t.roh); o[e+'bwkPct']=o[e+'bwkPct2']=jbProz(t.bwkPct); o[e+'bew']=E2(-t.bew); o[e+'zw']=E2(t.zw);
    o[e+'gew']=E2(t.gewerblich); o[e+'ab']=o[e+'ab2']=E2(-t.abschlag); o[e+'rein']=E2(t.rein); o[e+'lzPct']=jbProz(t.lzPct);
    o[e+'boden']=E2(t.bodenAnteil); o[e+'lzText']=jbN(t.lzPct,1)+' % aus '+jbN(t.bodenAnteil,2)+' €'; o[e+'bodenZins']=E2(-t.bodenZins);
    o[e+'gebRein']=E2(t.gebRein); o[e+'rnd']=jbN(t.rnd)+' Jahre'; o[e+'vf']=jbN(t.vf,2); o[e+'vfText']=jbN(t.vf,2)+' bei '+jbN(t.rnd)+' Jahre RND';
    o[e+'wert']=o[e+'wert2']=E2(t.wert);
  });
  o['s.geb']=E2(M.gebSumme); o['s.gebAussen']=o['s.gebAussen2']=E2(M.gebAussen); o['s.vorlaeufig']=E2(M.vorlaeufig);
  o['s.pv']=o['e.pv']=E2(M.pvWert); o['s.substanz']=o['s.substanz2']=M.substanz==null?'–':E2(M.substanz);
  o['s.objektLand']=E2(M.pauschalSumme+M.objektSumme+M.pvWert);
  o['e.boden']=E2(M.bodenSumme); o['e.ertrag']=o['e.ertrag2']=M.ertrag==null?'–':E2(M.ertrag);
  if(M.pv){ const P=v.pv; o['pv.laufzeit']=M.pv.laufzeit==null?'–':jbN(M.pv.laufzeit,1)+' Jahre'; o['pv.rest']=jbN(M.pv.rest,1)+' Jahre'; o['pv.vf']=o['pv.vf2']=jbN(M.pv.vf,2);
    o['pv.rohText']=jbN(P.kwh)+' kWh × '+jbN(P.eurKwh,5)+' €'; o['pv.roh']=E2(M.pv.roh); o['pv.bewText']=jbProz(P.bwk)+' aus '+jbN(M.pv.roh,2)+' €';
    o['pv.bew']=E2(M.pv.bewEur); o['pv.rein']=E2(M.pv.rein); o['pv.wert']=E2(M.pv.wert); }
  else ['pv.laufzeit','pv.rest','pv.vf','pv.vf2','pv.rohText','pv.roh','pv.bewText','pv.bew','pv.rein','pv.wert'].forEach(k=>{ o[k]='–'; });
  return {o,M};
}
function jbAusgaben(){
  const ed=document.getElementById('jb_editor'); if(!ed||!JB_EDIT) return;
  const erg=ed.querySelector('.jb-erg'), kopf=document.querySelector('#lv_overlay .mdb-head'), tabs=document.getElementById('lv_tabs');
  if(erg) erg.style.top=((kopf?kopf.offsetHeight:0)+(tabs?tabs.offsetHeight:0))+'px';   // unter Kopfzeile und Reitern kleben
  const {o,M}=jbWerte(JB_EDIT.v);
  ed.querySelectorAll('[data-jbo]').forEach(el=>{ const t=o[el.dataset.jbo]; if(t!=null&&el.textContent!==t) el.textContent=t; });
  const off=document.getElementById('jb_offen'), fehlt=jbFehlt(JB_EDIT.v,M);
  if(off){ off.hidden=!fehlt.length; off.textContent=fehlt.length?'Noch offen: '+fehlt.join(' · '):''; }
  jbBilderLaden(ed);
}
/* Angaben, ohne die ein Teil des Ergebnisses 0 bleibt — mit der Ziffer im Vordruck */
function jbFehlt(v,M){
  const k=M.kap, f=[], G=v.gebaeude;
  v.boden.forEach((b,i)=>{ if(!(b.flaeche>0)) f.push('Grundstücksanteil '+JB_ROEM[i]+' m² (1.2)'); if(!(b.brw>0)) f.push('Bodenrichtwert / Preisansatz (2.'+(i+1)+')'); });
  const N=G.length?jbSubstanzNummern(k.substanz,G.length):null;
  G.forEach((g,i)=>{ const zu=G.length>1?' '+jbGebName(v,i):'';
    if(!(g.baujahr>0)) f.push('Baujahr'+zu+' (1.3)'); if(!(g.bgf>0)) f.push('BGF'+zu+' (1.3)');
    if(!(M.geb[i].nhk2010>0)) f.push('NHK-Tabelle'+zu+' ('+k.substanz+')'); if(!(g.bpi>0)||!(g.bpiFaktor>0)) f.push('Baupreisindex'+zu+' ('+N.rnd[i]+')'); });
  if(G.length&&!(M.miete.monat>0)) f.push('Mieterträge (1.3)');
  if(G.length&&v.lz==null) f.push('Bodenwertverzinsung ('+k.ertrag+')');
  return f;
}
function jbSetzen(obj,pfad,wert){
  const t=pfad.split('.'); let o=obj;
  for(let i=0;i<t.length-1;i++){ const k=/^\d+$/.test(t[i])?+t[i]:t[i]; if(o[k]==null) o[k]=/^\d+$/.test(t[i+1])?[]:{}; o=o[k]; }
  const k=/^\d+$/.test(t[t.length-1])?+t[t.length-1]:t[t.length-1]; o[k]=wert;
}
function jbEingabe(el){
  if(!JB_EDIT||!el.dataset||!el.dataset.jb) return;
  const pfad=el.dataset.jb, art=el.dataset.art;
  let wert=el.value;
  if(art==='zahl'){ const z=LVK.zahlEingabe(el.value); if(Number.isNaN(z)){ el.classList.add('lv-fehler'); return; } el.classList.remove('lv-fehler'); wert=z; }
  if(art==='datum') wert=el.value||null;
  if(art==='check') wert=!!el.checked;
  const rw=/^boden\.(\d+)\.richtwert$/.exec(pfad);
  if(rw){ const b=JB_EDIT.v.boden[+rw[1]];   // Preisansatz folgt dem Richtwert, solange er nicht abweichend eingetragen ist
    if(b&&(!(b.brw>0)||b.brw===b.richtwert)){ b.brw=wert; const f=document.querySelector('#jb_editor [data-jb="boden.'+rw[1]+'.brw"]'); if(f) f.value=jbW(wert); } }
  if(pfad[0]==='@') JB_EDIT[pfad.slice(1)]=wert; else jbSetzen(JB_EDIT.v,pfad,wert);
  jbAusgaben();
}
function jbHinzu(liste){
  const v=JB_EDIT.v;
  if(liste==='boden') v.boden.push({text:'Grundstücksanteil '+JB_ROEM[v.boden.length],flaeche:0,brw:0,abschlag:0,flst:'',nutzbarkeit:'',zone:'',richtwert:null});
  if(liste==='gebaeude'){ const vor=v.gebaeude[v.gebaeude.length-1];
    v.gebaeude.push({text:v.gebaeude.length?'Nebengebäude':'Hauptgebäude',baujahr:vor?vor.baujahr:null,baujahrText:'',bgf:0,bgfText:'',gnd:vor?vor.gnd:80,rnd:null,rndText:'',abschlagBauweise:0,bpiArt:vor?vor.bpiArt:'wohnen',
      bpiText:vor?vor.bpiText:'',bpi:vor?vor.bpi:null,bpiFaktor:vor?vor.bpiFaktor:null,kosten1:[0,0,0,0,0],kosten2:[0,0,0,0,0],anteile:JBK.BAUTEILE.map(()=>[0,0,1,0,0])}); }
  if(liste==='pauschal') v.pauschal.push({text:'',betrag:0});
  if(liste==='objektspezifisch') v.objektspezifisch.push({text:'',betrag:0});
  if(liste==='mieten') v.mieten.push({text:'',lage:'',flaeche:null,monat:0,gebaeude:0,abschlag:0,gewerblich:false,hinweis:''});
  if(liste==='merkmale') v.objektdaten.merkmale.push({label:'',wert:''});
  lvRender();
}
function jbEntfernen(liste,i){
  const v=JB_EDIT.v;
  if(liste==='gebaeude'&&!confirm('Gebäude „'+(v.gebaeude[i].text||'')+'“ aus dem Vordruck entfernen?')) return;
  (liste==='merkmale'?v.objektdaten.merkmale:v[liste]).splice(i,1);
  if(liste==='gebaeude') v.mieten.forEach(m=>{ if(m.gebaeude>=i) m.gebaeude=Math.max(0,m.gebaeude-(m.gebaeude>i?1:0)); });
  lvRender();
}
function jbPv(an){   // Ausschalten merkt sich die Angaben bis zum Speichern
  const E=JB_EDIT; if(!an){ E.pvAlt=E.v.pv||E.pvAlt; E.v.pv=null; }
  else E.v.pv=E.v.pv||E.pvAlt||{kwp:null,kwh:null,eurKwh:null,bwk:15,lz:5,inbetrieb:null,eegEnde:null,einspeisung:100,eigen:0};
  lvRender(); }
function jbIndexAmtlich(i){
  const g=JB_EDIT.v.gebaeude[i], w=ImmoBaupreisindex.wertFuer(g.bpiArt,JB_EDIT.v.stichtag||lvHeute()); if(!w) return;
  g.bpi=w.wert; g.bpiFaktor=w.faktor; g.bpiText=w.name+' '+ImmoBaupreisindex.monatText(w.monat)+(w.vorlaeufig?' (vorläufig)':''); lvRender();
}

/* ---------- Bilder (Bodenrichtwertkarte): Anhänge der Liegenschaft in der Datenbank der Verwaltung ---------- */
function jbBilderLaden(wurzel){
  (wurzel||document).querySelectorAll('figure[data-anhang]:not([data-geladen])').forEach(async f=>{
    f.dataset.geladen='1';
    const a=await lvAnhangLesen(f.dataset.anhang), img=f.querySelector('img');
    if(img) { if(a&&a.data) img.src=lvDataUrl(a); else { img.alt='Bild nicht auf diesem Gerät'; f.classList.add('jb-fehlt'); } }
  });
}
function jbBildVerkleinern(datei){
  return new Promise((ok,nein)=>{ const r=new FileReader(); r.onerror=()=>nein(r.error||new Error('Lesefehler'));
    r.onload=()=>{ const url=String(r.result);
      if(typeof downscale!=='function'||datei.size<350*1024) return ok({url,typ:datei.type||'image/png'});
      downscale(url,1800,0.85,x=>ok({url:x,typ:x.slice(5,x.indexOf(';'))||'image/jpeg'})); };
    r.readAsDataURL(datei); });
}
async function jbBildHinzu(files){
  const E=JB_EDIT; if(!E||!files||!files.length) return;
  if(LV.rueckfall){ alert('Ohne Datenbank des Browsers können keine Bilder gespeichert werden.'); return; }
  const lId=E.lId||(E.neuL&&E.neuL.id);
  for(const f of [...files].slice(0,8-E.v.bilder.karte.length)){
    if(!/^image\//.test(f.type||'')){ alert(f.name+' ist kein Bild.'); continue; }
    try{ const b=await jbBildVerkleinern(f), data=b.url.split(',')[1]||'', id=LVK.neueId('A');
      await lvAnhangSpeichern({id,liegenschaftId:lId,name:f.name,typ:b.typ,size:Math.round(data.length*0.75),datum:lvHeute(),data});
      E.v.bilder.karte.push(id); (E.neueBilder=E.neueBilder||[]).push(id); }
    catch(e){ alert(f.name+' konnte nicht gespeichert werden ('+lvFehlerText(e)+').'); }
  }
  lvRender();
}
function jbBildWeg(i){ JB_EDIT.v.bilder.karte.splice(i,1); lvRender(); }
/* Bilder, die kein Vordruck der Liegenschaft mehr nennt, aus der Datenbank löschen */
async function jbBilderAufraeumen(l,kandidaten){
  if(!kandidaten||!kandidaten.length) return;
  const genutzt=new Set(((l&&l.bewertungen)||[]).flatMap(b=>b.vordruck&&b.vordruck.bilder?b.vordruck.bilder.karte:[]));
  try{ await lvAnhaengeLoeschen(kandidaten.filter(id=>!genutzt.has(id))); }catch(e){ console.error(e); }
}

(function(){
  const einrichten=()=>{
    const o=document.getElementById('lv_overlay'), body=document.getElementById('lv_body'); if(!o||!body) return;
    ['input','change'].forEach(ev=>o.addEventListener(ev,e=>{ if(e.target&&e.target.closest&&e.target.closest('#jb_editor')) jbEingabe(e.target); }));
    o.addEventListener('change',e=>{ if(e.target&&e.target.id==='lvf_jn_objekt') jbNeuWahl(); });
    new MutationObserver(()=>{ if(document.getElementById('jb_editor')) jbAusgaben(); }).observe(body,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
