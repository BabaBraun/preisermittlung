/* ImmoApp — Liegenschaften: Vordruck wie die Excel-Mappe der Bank
   Deckblatt, 1. Objektdaten, 2. Bodenrichtwert, 3. Bautechnische Daten, (4. PV-Anlage), Preisansatz Grund und Boden,
   Preisansatz (Bausubstanz als Grundlage), Preisansatz (Mietertrag als Grundlage), Zusammenfassung / Sonstiges — mit den
   Nummern, Beschriftungen und Zwischenzeilen der Mappe. Jede Zahl ist ein Eingabefeld, auch jede gerechnete: Gerechnete
   Felder sind mit dem Ergebnis vorbelegt; wer etwas einträgt, überschreibt es wie eine Excel-Zelle (gelb, „↺“ stellt die
   Rechnung wieder her), und alle folgenden Zeilen rechnen mit dem eingetragenen Wert weiter (v.manuell, js/jahresbewertung.js).
   Eine Angabe, die an mehreren Stellen steht (z. B. Bodenrichtwert in 1.2, 2.1, 5.1), ist überall dieselbe. jbAusgaben()
   aktualisiert beim Tippen alle anderen Felder, ohne das Feld zu stören, in dem gerade geschrieben wird. */
'use strict';

const JB_ROEM=['I','II','III','IV'];
function jbN(x,max){ if(x==null||!isFinite(x)) return '–'; x=+x; const st=max==null?2:max; if(Math.abs(x)<0.5*Math.pow(10,-st)) x=0; return x.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:st}); }
function jbProz(x){ return jbN(x,2)+' %'; }
/* Anzeige gerechneter Felder mit festen Nachkommastellen und Tausenderpunkten (liest zahlEingabe wieder richtig) */
function jbFmt(x,st){ if(x==null||!isFinite(x)) return ''; x=+x; if(Math.abs(x)<0.5*Math.pow(10,-st)) x=0; return x.toLocaleString('de-DE',{minimumFractionDigits:st,maximumFractionDigits:st}); }

/* ---------- Bausteine ---------- */
function jbIn(pfad,wert,art,breite,platz){
  art=art||'zahl';
  return '<input data-jb="'+pfad+'" data-art="'+art+'" type="'+(art==='datum'?'date':'text')+'"'+(art==='zahl'?' inputmode="decimal"':'')+(breite?' style="width:'+breite+'"':'')
    +(platz?' placeholder="'+lvH(platz)+'"':'')+' value="'+lvH(art==='zahl'?jbW(wert):(wert==null?'':wert))+'" aria-label="'+lvH(pfad)+'">';
}
/* gerechnetes, überschreibbares Feld: k = Schlüssel in v.manuell, st = Nachkommastellen */
function jbM(k,einheit,st,breite){
  return '<span class="jb-mw"><input data-jbm="'+k+'" data-st="'+(st==null?2:st)+'" type="text" inputmode="decimal"'+(breite?' style="width:'+breite+'"':'')+' aria-label="'+lvH(k)+'">'
    +(einheit?'<span class="jb-eh">'+einheit+'</span>':'')
    +'<button type="button" class="jb-reset" data-reset="'+k+'" hidden title="Gerechneten Wert wieder verwenden" aria-label="Gerechneten Wert wieder verwenden">↺</button></span>';
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
  h+='<p class="hint jb-hinweis-manuell">Jede Zahl ist änderbar. Gerechnete Felder lassen sich überschreiben (dann gelb); „↺“ stellt die Rechnung wieder her.</p>';
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
    +jbZeile('Art der Bebauung:',jbIn('objekt',v.objekt,'text'),'','breit')+jbZeile('Objektanschrift:',jbIn('deckblatt.anschrift',v.deckblatt.anschrift,'text'),'','breit')
    +(v.boden.length?jbZeile('Nutzung:',jbIn('boden.0.nutzbarkeit',v.boden[0].nutzbarkeit,'text'),'','breit'):'');
  o+=jbU('1.2','Grundstück');
  v.boden.forEach((b,i)=>{ o+=jbZeile((i?'Ggf. ':'')+'Grundstücksanteil '+JB_ROEM[i],jbIn('boden.'+i+'.flaeche',b.flaeche,'zahl','7em')+' m²',i?jbEntf('boden',i,'Grundstücksanteil entfernen'):'')
    +jbZeile('Aktueller Bodenrichtwert:',jbIn('boden.'+i+'.brw',b.brw,'zahl','6em')+' €/m²','(Ableitung aus öffentlicher Bodenrichtwerttabelle)'); });
  if(v.boden.length<JBK.MAX.boden) o+=jbZeile('Ggf. Grundstücksanteil '+JB_ROEM[v.boden.length],jbPlus('boden','Grundstücksanteil '+JB_ROEM[v.boden.length]));
  o+=jbZeile('Gesamtgrundstück',jbM('b.flaeche','m²',2),'','summe');
  if(!ohneGeb){
    o+=jbU('1.3','Gebäude');
    G.forEach((g,i)=>{ const zu=mehrere?' '+jbGebName(v,i):'';
      o+=jbZeile('Baujahr'+lvH(zu)+':','ca. '+jbIn('gebaeude.'+i+'.baujahr',g.baujahr,'zahl','5em'),jbIn('gebaeude.'+i+'.baujahrText',g.baujahrText,'text',null,'z. B. (fiktives Baujahr aufgrund Modernisierung)'))
        +jbZeile('BGF (Bruttogrundfläche)'+lvH(zu),'ca. '+jbIn('gebaeude.'+i+'.bgf',g.bgf,'zahl','6em')+' m²',jbIn('gebaeude.'+i+'.bgfText',g.bgfText,'text',null,'z. B. (abgeleitet aus den Grundrissen)')); });
  } else o+=jbU('1.3','Bebauung')+jbTx('objektdaten.bebauung',v.objektdaten.bebauung,4,'z. B. Bebauung nach § 34 BauGB, Bebauungsplan …');
  v.objektdaten.merkmale.forEach((m,k)=>{ o+=jbZeile(jbIn('objektdaten.merkmale.'+k+'.label',m.label,'text',null,'Bezeichnung'),jbIn('objektdaten.merkmale.'+k+'.wert',m.wert,'text'),jbEntf('merkmale',k),'merkmal'); });
  o+='<div class="mdb-actions">'+jbPlus('merkmale','Zeile')+'</div>';
  if(!ohneGeb){
    o+=jbZeile('Mietertrag / Jahr:',jbM('m.jahr','€',2),'(ansetzbare Nettokaltmiete, s. Ziffer '+kap.ertrag+')');
    o+=jbU('','Aufstellung der monatlichen Mieterträge (netto, ohne Nebenkosten):')
      +jbTab(['Einheit / Mieter',{t:'€ / Monat',r:1},'Bemerkung'].concat(mehrere?['Gebäude']:[],[{t:'gewerblich'},{t:'Abschlag %',r:1},'']),
        v.mieten.map((m,i)=>[jbIn('mieten.'+i+'.text',m.text,'text'),jbIn('mieten.'+i+'.monat',m.monat,'zahl','7em'),jbIn('mieten.'+i+'.hinweis',m.hinweis,'text',null,'(lt. Mietvertrag)')].concat(
          mehrere?['<select data-jb="mieten.'+i+'.gebaeude" data-art="zahl">'+G.map((g,k)=>'<option value="'+k+'"'+(m.gebaeude===k?' selected':'')+'>'+lvH(jbGebName(v,k))+'</option>').join('')+'</select>']:[],
          [jbCheck('mieten.'+i+'.gewerblich',m.gewerblich,''),jbIn('mieten.'+i+'.abschlag',m.abschlag,'zahl','4em'),jbEntf('mieten',i)])))
      +jbZeile('Summe monatlich',jbM('m.monat','€',2),'','summe')+jbZeile('Summe jährlich',jbM('m.jahr','€',2),'','gesamt')
      +'<div class="mdb-actions">'+jbPlus('mieten','Mietzeile')+'</div>'
      +'<p class="hint">„gewerblich“ zählt zum Anteil gewerbliche Kaltmiete (Ziffer '+kap.ertrag+'); „Abschlag %“ ergibt den Abschlag für gewerbliche Vermietung — oder den Betrag dort direkt eintragen.</p>';
  }
  h+=jbKap(1,'Objektdaten',o);

  // 2. Bodenrichtwert
  let w=jbErl('bodenrichtwert')+jbZeile('Grundstückslage:',jbIn('deckblatt.anschrift',v.deckblatt.anschrift,'text'),'','breit');
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
      +jbZeile('Laufzeit seit Inbetriebnahme (ca.):',jbM('pv.laufzeit','Jahre',1))+jbZeile('Restnutzungsdauer (ca.):',jbM('pv.rest','Jahre',1))
      +jbZeile('Barwertfaktor (in Relation Restnutzungsdauer und Liegenschaftszins):',jbM('pv.vf','',2))
      +jbU('','Barwertermittlung des Solarertrags')
      +jbZeile('Rohertrag',jbIn('pv.kwh',P.kwh,'zahl','6em')+' kWh × '+jbIn('pv.eurKwh',P.eurKwh,'zahl','5.5em')+' € =',jbM('pv.roh','€',2),'rechn')
      +jbZeile('./. Bewirtschaftungskosten',jbIn('pv.bwk',P.bwk,'zahl','4em')+' % aus Rohertrag =',jbM('pv.bew','€',2),'rechn')
      +jbZeile('Zwischensumme Reinertrag','',jbM('pv.rein','€',2),'rechn summe')+jbZeile('x Barwertfaktor',jbM('pv.vf','',2),'','rechn')
      +jbZeile('= Barwert der PV-Anlage zum Stichtag','',jbM('pv.wert','€',2),'rechn gesamt'));
  }

  // Preisansatz Grund und Boden
  { const n=kap.boden; let b='';
    v.boden.forEach((x,i)=>{ b+=jbU(n+'.'+(i+1),'Preisansatz Grundstücksanteil '+JB_ROEM[i])
      +jbZeile('Grundstücksanteil '+JB_ROEM[i],jbIn('boden.'+i+'.flaeche',x.flaeche,'zahl','7em')+' m²','','rechn')
      +jbZeile('x Aktueller Bodenrichtwert:',jbIn('boden.'+i+'.brw',x.brw,'zahl','6em')+' €/m²','','rechn')
      +jbZeile('Zwischensumme','',jbM('b.'+i+'.zw','€',2),'rechn summe')
      +jbZeile('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbIn('boden.'+i+'.abschlag',x.abschlag,'zahl','4em')+' %',jbM('b.'+i+'.ab','€',2),'rechn')
      +jbZeile(v.boden.length>1?'Preisansatz Grundstücksanteil '+JB_ROEM[i]:'Preisansatz Grund und Boden','',jbM('b.'+i+'.wert','€',2),'rechn gesamt'); });
    if(v.boden.length>1||ohneGeb){
      b+=jbU(n+'.'+(v.boden.length+1),'Preisansatz Grund und Boden')+v.boden.map((x,i)=>jbZeile('Preisansatz Grundstücksanteil '+JB_ROEM[i],'',jbM('b.'+i+'.wert','€',2),'rechn')).join('')
        +jbZeile('Preisansatz Grund und Boden',jbM('b.flaeche','m²',2),jbM('boden','€',2),'rechn summe');
      if(ohneGeb){
        b+=v.pauschal.map((p,i)=>jbZeile('+ '+jbIn('pauschal.'+i+'.text',p.text,'text'),'',jbIn('pauschal.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('pauschal',i),'rechn merkmal')).join('')
          +v.objektspezifisch.map((p,i)=>jbZeile('± '+jbIn('objektspezifisch.'+i+'.text',p.text,'text'),'',jbIn('objektspezifisch.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('objektspezifisch',i),'rechn merkmal')).join('')
          +'<div class="mdb-actions">'+jbPlus('objektspezifisch','objektspezifisches Merkmal (+ / −)')+'</div>'
          +(v.pv?jbZeile('+ objektspezifische Merkmale (PV-Anlage)','',jbM('pv.wert','€',2),'rechn'):'')
          +jbZeile('Preisansatz Grundstück inkl. Außenanlagen','',jbM('ergebnis','€',2),'rechn gesamt');
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
      // NHK 2010 nach Standardstufen — wie im Blatt „Preis m² BGF“ oben, vor 6.1
      const st=[1,2,3,4,5];
      const nhk=[['NHK 2010 nach Standard','',st.map(x=>jbIn(p+'kosten1.'+(x-1),g.kosten1[x-1],'zahl','5em')),'',''],
        ['NHK 2010 nach Standard (2. Zeile, gemittelt)','',st.map(x=>jbIn(p+'kosten2.'+(x-1),g.kosten2[x-1],'zahl','5em')),'',''],
        ['Kostenkennwerte','',st.map(x=>jbM('g.'+i+'.kk.'+(x-1),'',2,'5.5em')),'','']]
        .concat(JBK.BAUTEILE.map(([nm,wt],r)=>[nm,jbIn(p+'waegung.'+r,(g.waegung||[])[r]!=null?g.waegung[r]:wt,'zahl','4.2em'),st.map(x=>jbIn(p+'anteile.'+r+'.'+(x-1),g.anteile[r][x-1],'zahl','3.6em')),jbOut('g.'+i+'.b.'+r+'.summe','jb-pruef'),jbM('g.'+i+'.b.'+r,'',2,'6em')]),
          [['NHK 2010 (Summe)','',st.map(()=>''),'',jbM('g.'+i+'.nhk2010','',2,'6em')]]);
      s+='<div class="jb-nhk"><p class="jb-nhk-t">NHK 2010 nach Standardstufen'+lvH(zu)+' — Anteil je Stufe (Summe je Bauteil 1; 0 = Bauteil fehlt)</p>'
        +jbTab(['Bauteil',{t:'Wägungsanteil',r:1},{t:'Stufe 1',r:1},{t:'2',r:1},{t:'3',r:1},{t:'4',r:1},{t:'5',r:1},{t:'Anteile',r:1},{t:'€/m²',r:1}],nhk.map(z=>[lvH(z[0]),z[1]].concat(z[2],[z[3],z[4]])))+'</div>';
      s+=jbU(N.rnd[i],'Berechnung der Restnutzungsdauer und Alterswertminderung'+zu)
        +jbZeile('Baujahr des Gebäudes:',jbIn(p+'baujahr',g.baujahr,'zahl','5em'),jbIn(p+'baujahrText',g.baujahrText,'text',null,'(fiktives Baujahr …)'))
        +jbZeile('Gesamtnutzungsdauer:',jbIn(p+'gnd',g.gnd,'zahl','4em')+' Jahre')
        +jbZeile('Gebäudealter',jbM('g.'+i+'.alter','Jahre',0,'5em'))+jbZeile('Restnutzungsdauer (RND):',jbM('g.'+i+'.rndRech','Jahre',0,'5em'))
        +jbZeile('Angepasste RND:',jbIn(p+'rnd',g.rnd,'zahl','4em','= RND')+' Jahre',jbIn(p+'rndText',g.rndText,'text',null,'(auf Grundlage des aktuellen Zustands)'))
        +jbZeile('Technische Wertminderung ca.',jbM('g.'+i+'.wm','%',0,'5em'),'(lt. Sachwertrichtlinie)')
        +jbZeile('Baupreisindex',jbIn(p+'bpi',g.bpi,'zahl','5em'),jbIn(p+'bpiText',g.bpiText,'text',null,'z. B. Bürogebäude November 2024'))
        +jbZeile('',' ','<select data-jb="'+p+'bpiArt" data-art="text" aria-label="Amtlicher Index für">'+arten.map(a=>'<option value="'+a+'"'+(g.bpiArt===a?' selected':'')+'>'+lvH(ImmoBaupreisindex.ARTEN[a].name)+'</option>').join('')+'</select>'
          +' <button class="secondary" onclick="jbIndexAmtlich('+i+')">Amtlichen Wert zum Stichtag übernehmen</button>')
        +jbU(N.preis[i],'Berechnung des Gebäudepreis in Abhängigkeit der Restnutzungsdauer'+zu)
        +jbZeile('Normalherstellungskosten',jbM('g.'+i+'.nhk2010','€/m²',2),'(lt. NHK 2010, Tabelle oben)')
        +jbZeile('./. Abschlag für Bauweise',jbIn(p+'abschlagBauweise',g.abschlagBauweise,'zahl','4em')+' %',jbM('g.'+i+'.abEur','€/m²',0)+' <span class="lv-klein">(z. B. Holzständerbauweise 1960–1972 bis zu 20 %)</span>')
        +jbZeile('Bereinigte NHK',jbM('g.'+i+'.nhkBer','€/m²',0),'(gerundet)','summe')
        +jbZeile('Baupreisindex (umgerechnet)',jbM('g.'+i+'.index','',1),'Umrechnungsfaktor '+jbIn(p+'bpiFaktor',g.bpiFaktor,'zahl','5.5em'))
        +jbZeile('Normalherstellungskosten',jbM('g.'+i+'.heute','€/m²',2),'zum heutigen Stichtag')
        +jbZeile('./. Technische Wertminderung',jbM('g.'+i+'.wmEur','€/m²',2),jbOut('g.'+i+'.wmText','lv-klein'))
        +jbZeile('Gebäudepreis'+lvH(mehrere?' '+jbGebName(v,i):''),jbM('g.'+i+'.preis','€/m²',0),'zum heutigen Stichtag','gesamt');
    });
    if(G.length<JBK.MAX.gebaeude) s+='<div class="mdb-actions">'+jbPlus('gebaeude','Weiteres Gebäude (z. B. Lager, Scheune)')+'</div>';
    s+=jbU(N.boden,'Preisansatz Grund und Boden');
    v.boden.forEach((x,i)=>{ s+=jbZeile('Grundstücksanteil '+JB_ROEM[i],jbIn('boden.'+i+'.flaeche',x.flaeche,'zahl','7em')+' m²','','rechn')
      +jbZeile('x Aktueller Bodenrichtwert:',jbIn('boden.'+i+'.brw',x.brw,'zahl','6em')+' €/m²','','rechn')
      +jbZeile('Zwischensumme Grundstücksanteil '+JB_ROEM[i],'',jbM('b.'+i+'.zw','€',2),'rechn summe')
      +jbZeile('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbIn('boden.'+i+'.abschlag',x.abschlag,'zahl','4em')+' %',jbM('b.'+i+'.ab','€',2),'rechn'); });
    s+=jbZeile('Preisansatz Grund und Boden','',jbM('boden','€',2),'rechn gesamt');
    s+=jbU(N.geb,'Preisansatz Gebäude und Außenanlagen (Bausubstanz als Grundlage)');
    G.forEach((g,i)=>{ const zu=mehrere?' '+jbGebName(v,i):''; s+=jbZeile('Bruttogrundfläche'+lvH(zu)+' (BGF)',jbIn('gebaeude.'+i+'.bgf',g.bgf,'zahl','6em')+' m²','','rechn')
      +jbZeile('x Preis / m² in Abhängigkeit der RND',jbM('g.'+i+'.preis','€/m²',0),'','rechn')+jbZeile('Zwischensumme'+lvH(mehrere?zu:' Gebäude'),'',jbM('g.'+i+'.wert','€',2),'rechn summe'); });
    if(mehrere) s+=jbZeile('Zwischensumme '+lvH(G.map((g,i)=>jbGebName(v,i)).join(' und ')),'',jbM('s.geb','€',2),'rechn summe');
    s+=v.pauschal.map((p,i)=>jbZeile('+ '+jbIn('pauschal.'+i+'.text',p.text,'text')+' (Pauschalansatz)','',jbIn('pauschal.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('pauschal',i),'rechn merkmal')).join('')
      +'<div class="mdb-actions">'+jbPlus('pauschal','Pauschalansatz')+'</div>'
      +jbZeile('Preisansatz Gebäude und Außenanlagen','',jbM('s.gebAussen','€',2),'rechn gesamt');
    s+=jbU(N.summe,'Preisansatz (Bausubstanz als Grundlage)')
      +jbZeile('Preisansatz Grund und Boden','',jbM('boden','€',2),'rechn')+jbZeile('Preisansatz Gebäude und Außenanlagen','',jbM('s.gebAussen','€',2),'rechn')
      +jbZeile('Vorläufiger Preisansatz','',jbM('s.vorlaeufig','€',2),'rechn summe')
      +(v.pv?jbZeile('+ objektspezifische Merkmale (PV-Anlage)','',jbM('pv.wert','€',2),'rechn'):'')
      +v.objektspezifisch.map((p,i)=>jbZeile('± '+jbIn('objektspezifisch.'+i+'.text',p.text,'text',null,'objektspezifische Merkmale (z. B. Grundstückslasten)'),'',jbIn('objektspezifisch.'+i+'.betrag',p.betrag,'zahl','8em')+' €'+jbEntf('objektspezifisch',i),'rechn merkmal')).join('')
      +'<div class="mdb-actions">'+jbPlus('objektspezifisch','objektspezifisches Merkmal (+ / −)')+'</div>'
      +jbZeile('Preisansatz (Bausubstanz als Grundlage)','',jbM('substanz','€',2),'rechn gesamt');
    h+=jbKap(kap.substanz,'Preisansatz (Bausubstanz als Grundlage)',s);
  }

  // Preisansatz (Mietertrag als Grundlage)
  if(!ohneGeb){ const N=jbErtragNummern(kap.ertrag,G.length); let e=jbErl('mietertrag');
    G.forEach((g,i)=>{ const nm=mehrere?jbGebName(v,i):'', fuer=mehrere?'für '+nm:'für Gebäude', p='gebaeude.'+i+'.', k='e.'+i+'.';
      e+=jbU(N.rnd[i],'Berechnung Restnutzungsdauer '+fuer)
        +jbZeile('Baujahr'+(mehrere?'':' Hauptgebäude')+':',jbIn(p+'baujahr',g.baujahr,'zahl','5em'),jbIn(p+'baujahrText',g.baujahrText,'text',null,'(fiktives Baujahr …)'))
        +jbZeile('Gesamtnutzungsdauer:',jbIn(p+'gnd',g.gnd,'zahl','4em')+' Jahre')
        +jbZeile('Restnutzungsdauer (RND):',jbM('g.'+i+'.rndRech','Jahre',0,'5em'))
        +jbZeile('Angepasste RND:',jbIn(p+'rnd',g.rnd,'zahl','4em','= RND')+' Jahre',jbIn(p+'rndText',g.rndText,'text',null,'(auf Grundlage des aktuellen Zustands)'))
        +jbU(N.daten[i],'Daten für die Preisermittlung auf Grundlage des Gebäudeertrags'+(mehrere?' – '+nm:''))
        +jbZeile('Gesamte Jahreskaltmiete / Rohertrag:',jbM(k+'roh','€',2),mehrere?'('+lvH(nm)+')':'')
        +jbZeile('Abschlag Bewirtschaftungskosten',jbIn('bwk',v.bwk,'zahl','4em')+' %','(aus dem jährlichen Rohertrag)')
        +jbZeile('Anteil gewerbliche Kaltmiete',jbM(k+'gew','€',2))
        +jbZeile('- Abschlag für gewerbliche Vermietung',jbM(k+'ab','€',2),i?'':jbIn('abschlagText',v.abschlagText,'text',null,'(z. B. 5 % aus dem jährlichen Rohertrag Laden)'))
        +jbZeile('Bodenwertverzinsung',jbIn('lz',v.lz,'zahl','4em')+' %','(aus dem Bodenwert)')
        +jbZeile('Preisansatz Grund und Boden:',jbM(k+'boden','€',2),mehrere?'(anteilig zum Rohertrag)':'')
        +jbZeile('Angepasste RND',jbIn(p+'rnd',g.rnd,'zahl','4em','= RND')+' Jahre')
        +jbZeile('Vervielfältiger für Gebäude',jbM(k+'vf','',2,'6em'),'(Barwertfaktor für die Kapitalisierung)'); });
    G.forEach((g,i)=>{ const nm=mehrere?jbGebName(v,i):'Gebäude', p='gebaeude.'+i+'.', k='e.'+i+'.';
      e+=jbU(N.preis[i],'Preisansatz '+nm+' (Mietertrag als Grundlage)')
        +jbZeile('Gesamte Jahreskaltmiete / Rohertrag:',jbM(k+'roh','€ / Jahr',2),'','rechn')
        +jbZeile('- Abschlag für Bewirtschaftungskosten',jbIn('bwk',v.bwk,'zahl','4em')+' %',jbM(k+'bew','€',2),'rechn')
        +jbZeile('Zwischensumme','',jbM(k+'zw','€',2),'rechn summe')+jbZeile('- Abschlag für gewerbliche Vermietung','',jbM(k+'ab','€',2),'rechn')
        +jbZeile('Grundstücksreinertrag (Gebäude inkl. Grund und Boden)','',jbM(k+'rein','€',2),'rechn summe')
        +jbZeile('- Ertragsanteil Grund und Boden',jbIn('lz',v.lz,'zahl','3.6em')+' % aus '+jbM(k+'boden','€',2,'8.5em'),jbM(k+'bodenZins','€',2),'rechn')
        +jbZeile((mehrere?'Reinertrag '+lvH(nm):'Gebäudereinertrag')+' (nur Gebäude ohne Anteil Grund und Boden)','',jbM(k+'gebRein','€',2),'rechn summe')
        +jbZeile('x Vervielfältiger für Gebäude (Barwertfaktor)',jbM(k+'vf','',2,'5em')+' bei '+jbIn(p+'rnd',g.rnd,'zahl','3.6em','RND')+' Jahre RND','','rechn')
        +jbZeile('Preisansatz '+lvH(nm)+' (Mietertrag als Grundlage)','',jbM(k+'wert','€',2),'rechn gesamt'); });
    e+=jbU(N.summe,'Preisansatz (Mietertrag als Grundlage)')+jbZeile('Preisansatz Grund und Boden','',jbM('e.boden','€',2),'rechn')
      +G.map((g,i)=>jbZeile('Preisansatz '+lvH(mehrere?jbGebName(v,i):'Gebäude')+' (Mietertrag als Grundlage)','',jbM('e.'+i+'.wert','€',2),'rechn')).join('')
      +(v.pv?jbZeile('PV-Anlage','',jbM('pv.wert','€',2),'rechn'):'')+jbZeile('Preisansatz (Mietertrag als Grundlage)','',jbM('ertrag','€',2),'rechn gesamt');
    h+=jbKap(kap.ertrag,'Preisansatz (Mietertrag als Grundlage)',e);
  }

  // Zusammenfassung / Sonstiges
  { const n=kap.summe; let z=jbU(n+'.1','Die einzelnen Preiskomponenten für Sie im Überblick');
    z+=ohneGeb?'<div class="jb-ueberblick">'+jbZeile('Preisansatz Grund und Boden','',jbM('boden','€',2),'rechn')+jbZeile('Summe der objektspezifischen Eigenschaften','',jbM('s.objektLand','€',2),'rechn')
        +jbZeile('Preisansatz Grundstück inkl. Außenanlagen','',jbM('ergebnis','€',2),'rechn gesamt')+'</div>'
      :'<div class="jb-ueberblick">'+jbZeile('Preisansatz (Bausubstanz als Grundlage)','',jbM('substanz','€',2),'rechn')+jbZeile('Preisansatz (Mietertrag als Grundlage)','',jbM('ertrag','€',2),'rechn')
        +jbZeile(jbOut('t.mittel'),'',jbM('ergebnis','€',2),'rechn gesamt')+'</div>'
        +jbZeile('Gewichtung Bausubstanz',jbIn('gewichtung',v.gewichtung,'zahl','4em')+' %','<span class="lv-klein">Vordruck: 50 % (Mittel); Mietertrag = Rest</span>');
    z+=jbU(n+'.2','Sonstiges / Hinweise')+jbTx('texte.hinweise',v.texte.hinweise,7)
      +jbZeile('Ort, Datum:',jbIn('ort',v.ort,'text','12em','Ort'),jbIn('stichtag',v.stichtag,'datum'));
    h+=jbKap(n,'Zusammenfassung / Sonstiges',z);
  }
  h+='<div class="grid lv-form">'+jbFeld('Interne Notiz zur Bewertung (nicht im Vordruck)',jbTx('@notiz',E.notiz,3),true)+'</div>';
  h+='<div id="lv_formfehler_unten" class="lv-warn" hidden></div><div class="mdb-actions"><button class="primary" onclick="jbSpeichern()" data-ic="check">Speichern</button>'
    +'<button class="secondary" onclick="jbDokAnsehen()" data-ic="file">Vordruck ansehen</button><button class="secondary" onclick="jbAbbrechen()">Abbrechen</button>'
    +(E.bId?'<button class="danger" onclick="jbLoeschen()" data-ic="trash">Vordruck löschen</button>':'')+'</div></div>';
  return h;
}

/* Gerechnete Zahlen je Schlüssel (mit den eingetragenen Werten) und Texte */
function jbWerte(v){
  const M=JBK.modell(v), r=M.r, N={}, o={};
  r.bodenTeile.forEach((b,i)=>{ N['b.'+i+'.zw']=b.zw; N['b.'+i+'.ab']=b.abschlagEur; N['b.'+i+'.wert']=b.wert; });
  N.boden=r.boden; N['b.flaeche']=r.flaeche; N['m.monat']=r.mMonat; N['m.jahr']=r.mJahr;
  r.gebaeude.forEach((g,i)=>{ const p='g.'+i+'.';
    g.kostenkennwerte.forEach((x,s)=>{ N[p+'kk.'+s]=x; });
    g.bauteile.forEach((b,j)=>{ N[p+'b.'+j]=b.kosten; o[p+'b.'+j+'.summe']=b.summeAnteile===1?'✓':b.summeAnteile===0?'fehlt':'⚠ Summe der Anteile '+jbZ(b.summeAnteile,2)+' statt 1'; });
    Object.assign(N,{[p+'nhk2010']:g.nhk2010,[p+'abEur']:g.abschlagEur,[p+'nhkBer']:g.nhkBer,[p+'index']:g.index2010,[p+'alter']:g.alter,[p+'rndRech']:g.rndRech,
      [p+'wm']:g.wm,[p+'heute']:g.nhkHeute,[p+'wmEur']:g.wmEur,[p+'preis']:g.preis,[p+'wert']:g.wert});
    o[p+'wmText']='entspricht ca. '+jbN(g.wm)+' % aus '+jbN(g.nhkHeute,2)+' €/m²';
    const t=r.teile.find(x=>x.gebaeude===i)||{roh:0,gew:0,bew:0,zw:0,abschlag:0,rein:0,bodenAnteil:0,bodenZins:0,gebRein:0,vf:0,wert:0}, e='e.'+i+'.';
    Object.assign(N,{[e+'roh']:t.roh,[e+'gew']:t.gew,[e+'bew']:-t.bew,[e+'zw']:t.zw,[e+'ab']:-t.abschlag,[e+'rein']:t.rein,[e+'boden']:t.bodenAnteil,
      [e+'bodenZins']:-t.bodenZins,[e+'gebRein']:t.gebRein,[e+'vf']:t.vf,[e+'wert']:t.wert});
  });
  N['s.geb']=r.gebaeudeWert; N['s.gebAussen']=r.gebAussen; N['s.vorlaeufig']=r.vorlaeufig; N.substanz=r.substanz; N['s.objektLand']=r.objektLand;
  if(r.pv) ['laufzeit','rest','roh','bew','rein','vf','wert'].forEach(k=>{ N['pv.'+k]=r.pv[k]; });
  N['e.boden']=r.ertragBoden; N.ertrag=r.ertrag; N.ergebnis=r.ergebnis;
  o.boden=jbE(r.boden); o.substanz=r.substanz==null?'–':jbE(r.substanz); o.ertrag=r.ertrag==null?'–':jbE(r.ertrag); o.ergebnis=jbE(r.ergebnis);
  o['t.mittel']=M.gewichtung===50?'Mittel aus den o.g. Preisansätzen':'Gewichtetes Mittel (Bausubstanz '+jbN(M.gewichtung)+' %, Mietertrag '+jbN(100-M.gewichtung)+' %)';
  return {o,N,M};
}
function jbHol(pfad){
  if(pfad[0]==='@') return JB_EDIT[pfad.slice(1)];
  return pfad.split('.').reduce((x,k)=>x==null?undefined:x[/^\d+$/.test(k)?+k:k],JB_EDIT.v);
}
/* Alle Felder auf den Stand bringen — außer dem, in dem gerade geschrieben wird, und rot markierten */
function jbAusgaben(){
  const ed=document.getElementById('jb_editor'); if(!ed||!JB_EDIT) return;
  const erg=ed.querySelector('.jb-erg'), kopf=document.querySelector('#lv_overlay .mdb-head'), tabs=document.getElementById('lv_tabs');
  if(erg) erg.style.top=((kopf?kopf.offsetHeight:0)+(tabs?tabs.offsetHeight:0))+'px';   // unter Kopfzeile und Reitern kleben
  const {o,N,M}=jbWerte(JB_EDIT.v), MAN=JB_EDIT.v.manuell||{}, aktiv=document.activeElement;
  ed.querySelectorAll('[data-jbo]').forEach(el=>{ const t=o[el.dataset.jbo]; if(t!=null&&el.textContent!==t) el.textContent=t; });
  ed.querySelectorAll('[data-jbm]').forEach(el=>{
    const k=el.dataset.jbm, man=typeof MAN[k]==='number', wert=man?MAN[k]:N[k], knopf=el.parentNode.querySelector('.jb-reset');
    el.classList.toggle('jb-manuell',man); el.title=man?'Von Hand eingetragen — „↺“ verwendet wieder den gerechneten Wert':'Gerechnet — zum Überschreiben einfach eintragen';
    if(knopf) knopf.hidden=!man;
    if(el!==aktiv&&!el.classList.contains('lv-fehler')){ const t=jbFmt(wert,+el.dataset.st); if(el.value!==t) el.value=t; } });
  ed.querySelectorAll('[data-jb]').forEach(el=>{
    if(el===aktiv||el.classList.contains('lv-fehler')||el.type==='file') return;
    const x=jbHol(el.dataset.jb), art=el.dataset.art;
    if(art==='check'){ if(el.checked!==!!x) el.checked=!!x; return; }
    const t=art==='zahl'&&el.tagName!=='SELECT'?jbW(x):x==null?'':String(x);
    if(el.value!==t) el.value=t; });
  const off=document.getElementById('jb_offen'), fehlt=jbFehlt(JB_EDIT.v,M);
  if(off){ off.hidden=!fehlt.length; off.textContent=fehlt.length?'Noch offen: '+fehlt.join(' · '):''; }
  jbBilderLaden(ed);
}
/* Angaben, ohne die ein Teil des Ergebnisses 0 bleibt — mit der Ziffer im Vordruck */
function jbFehlt(v,M){
  const k=M.kap, f=[], G=v.gebaeude, MAN=v.manuell||{}, hat=x=>typeof MAN[x]==='number';
  v.boden.forEach((b,i)=>{ if(!(b.flaeche>0)&&!hat('b.'+i+'.zw')&&!hat('b.'+i+'.wert')&&!hat('boden')) f.push('Grundstücksanteil '+JB_ROEM[i]+' m² (1.2)');
    if(!(b.brw>0)&&!hat('b.'+i+'.zw')&&!hat('b.'+i+'.wert')&&!hat('boden')) f.push('Bodenrichtwert (1.2 / 2.'+(i+1)+')'); });
  const N=G.length?jbSubstanzNummern(k.substanz,G.length):null;
  G.forEach((g,i)=>{ const zu=G.length>1?' '+jbGebName(v,i):'', p='g.'+i+'.', fertig=hat(p+'preis')||hat(p+'wert');
    if(!(g.baujahr>0)&&!fertig&&!hat(p+'alter')) f.push('Baujahr'+zu+' (1.3)'); if(!(g.bgf>0)&&!hat(p+'wert')) f.push('BGF'+zu+' (1.3)');
    if(!(M.geb[i].nhk2010>0)&&!fertig) f.push('NHK-Tabelle'+zu+' ('+k.substanz+')');
    if((!(g.bpi>0)||!(g.bpiFaktor>0))&&!fertig&&!hat(p+'index')&&!hat(p+'heute')) f.push('Baupreisindex'+zu+' ('+N.rnd[i]+')'); });
  if(G.length&&!(M.miete.monat>0)&&!M.teile.some(t=>t.roh>0)) f.push('Mieterträge (1.3)');
  if(G.length&&v.lz==null) f.push('Bodenwertverzinsung ('+k.ertrag+')');
  return f;
}
function jbSetzen(obj,pfad,wert){
  const t=pfad.split('.'); let o=obj;
  for(let i=0;i<t.length-1;i++){ const k=/^\d+$/.test(t[i])?+t[i]:t[i]; if(o[k]==null) o[k]=/^\d+$/.test(t[i+1])?[]:{}; o=o[k]; }
  const k=/^\d+$/.test(t[t.length-1])?+t[t.length-1]:t[t.length-1]; o[k]=wert;
}
function jbEingabe(el){
  if(!JB_EDIT||!el.dataset) return;
  if(el.dataset.jbm){   // gerechnetes Feld überschreiben (leer = wieder rechnen)
    const k=el.dataset.jbm, z=LVK.zahlEingabe(el.value), MAN=JB_EDIT.v.manuell=JB_EDIT.v.manuell||{};
    if(Number.isNaN(z)){ el.classList.add('lv-fehler'); return; }
    el.classList.remove('lv-fehler');
    if(z==null) delete MAN[k]; else MAN[k]=z;
    jbAusgaben(); return;
  }
  if(!el.dataset.jb) return;
  const pfad=el.dataset.jb, art=el.dataset.art;
  let wert=el.value;
  if(art==='zahl'){ const z=LVK.zahlEingabe(el.value); if(Number.isNaN(z)){ el.classList.add('lv-fehler'); return; } el.classList.remove('lv-fehler'); wert=z; }
  if(art==='datum') wert=el.value||null;
  if(art==='check') wert=!!el.checked;
  const rw=/^boden\.(\d+)\.richtwert$/.exec(pfad);
  if(rw){ const b=JB_EDIT.v.boden[+rw[1]];   // Preisansatz folgt dem Richtwert, solange er nicht abweichend eingetragen ist
    if(b&&(!(b.brw>0)||b.brw===b.richtwert)) b.brw=wert; }
  if(pfad[0]==='@') JB_EDIT[pfad.slice(1)]=wert; else jbSetzen(JB_EDIT.v,pfad,wert);
  jbAusgaben();
}
function jbZuruecksetzen(k){ const MAN=JB_EDIT&&JB_EDIT.v.manuell; if(MAN) delete MAN[k];
  document.querySelectorAll('#jb_editor [data-jbm="'+k+'"]').forEach(el=>el.classList.remove('lv-fehler')); jbAusgaben(); }

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
    // beim Verlassen eines Feldes Zahlen einheitlich darstellen (das Feld wird dann nicht mehr bearbeitet)
    o.addEventListener('focusout',e=>{ if(e.target&&e.target.closest&&e.target.closest('#jb_editor')&&(e.target.dataset.jbm||e.target.dataset.jb)) setTimeout(jbAusgaben,0); });
    o.addEventListener('click',e=>{ const b=e.target&&e.target.closest&&e.target.closest('#jb_editor [data-reset]'); if(b) jbZuruecksetzen(b.dataset.reset); });
    new MutationObserver(()=>{ if(document.getElementById('jb_editor')) jbAusgaben(); }).observe(body,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
