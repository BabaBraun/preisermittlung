/* ImmoApp — Jahresbewertung: der Vordruck als Dokument (Ansehen, Drucken, PDF, Word)
   Aufbau wie die Excel-Mappe der Bank: Deckblatt, 1. Objektdaten, 2. Bodenrichtwert, 3. Bautechnische Daten, (4. PV-Anlage),
   Preisansatz Grund und Boden, Preisansatz (Bausubstanz als Grundlage), Preisansatz (Mietertrag als Grundlage),
   Zusammenfassung / Sonstiges — jedes Kapitel auf einer neuen Seite. Zahlen aus ImmoJahresbewertung.modell(), also
   dieselben wie im Vordruck. Angezeigt wird im Bericht (#report) wie Exposé und Präsentation; PDF über downloadPDF(). */
'use strict';

function jbDokHtml(v,ctx){
  ctx=ctx||{};
  const M=JBK.modell(v), kap=M.kap, G=v.gebaeude, mehrere=G.length>1, ohneGeb=!G.length, h=lvH;
  const e2=x=>jbE(x), jahre=x=>jbN(x)+' Jahre', datum=d=>d?LVK.datumDE(d):'–';
  const T=(zeilen,cls)=>'<table class="jbd-t'+(cls?' '+cls:'')+'"><tbody>'+zeilen.filter(Boolean).join('')+'</tbody></table>';
  const Z=(l,m,b,cls)=>'<tr'+(cls?' class="'+cls+'"':'')+'><td class="l">'+l+'</td><td class="m">'+(m==null?'':m)+'</td><td class="b">'+(b==null?'':b)+'</td></tr>';
  const KV=(l,w)=>'<tr><td class="l">'+l+'</td><td class="w" colspan="2">'+w+'</td></tr>';
  const kopf=(nr,titel)=>'<div class="pagebreak"></div><h2 class="jbd-titel">'+(nr?nr+'. ':'')+h(titel)+'</h2>';
  const U=(nr,t)=>'<h3>'+h((nr?nr+' ':'')+t)+'</h3>';
  const P=t=>'<p class="jbd-text">'+h(t&&t.trim()?t:'/')+'</p>';
  const name=i=>jbGebName(v,i), D=v.deckblatt, roem=JB_ROEM;
  let d='<div class="jbd">';

  // Deckblatt
  const A=ctx.absender||{};
  d+='<section class="jbd-deck"><div class="jbd-band">'+h(D.auftragsinhalt||'Rechnerische Preisermittlung')+'</div>'
    +T([KV('Auftraggeber(in):',h(D.auftraggeber)+(D.auftraggeberAnschrift?'<br>'+h(D.auftraggeberAnschrift):'')),KV('Auftragsinhalt:',h(D.auftragsinhalt)),
      KV('Verwendungszweck:',h(D.verwendungszweck)),KV('Objekt:',h(v.objekt)),KV('Objektanschrift:',h(D.anschrift)),KV('Ermittlung zum Stichtag:',h(datum(v.stichtag)))],'jbd-kv jbd-deck-t')
    +(A.name||A.telefon||A.email?'<div class="jbd-kontakt"><b>Ihr persönlicher Ansprechpartner:</b><br>'+[A.name,A.anschrift,A.ort,A.telefon?'Telefon '+A.telefon:'',A.email].filter(Boolean).map(h).join('<br>')+'</div>':'')
    +'</section>';

  // 1. Objektdaten
  d+=kopf(1,'Objektdaten')+U('1.1','Allgemein')
    +T([KV('Rechtsform:',h(v.objektdaten.rechtsform)),KV('Art der Bebauung:',h(v.objekt)),KV('Objektanschrift:',h(D.anschrift)),KV('Nutzung:',h((v.boden[0]||{}).nutzbarkeit||''))],'jbd-kv')
    +U('1.2','Grundstück');
  const bz=[];
  M.boden.forEach((b,i)=>{ bz.push(Z((i?'Ggf. ':'')+'Grundstücksanteil '+roem[i],jbN(b.flaeche,2)+' m²',''),Z('Aktueller Bodenrichtwert:',jbN(b.brw,2)+' €/m²','(Ableitung aus öffentlicher Bodenrichtwerttabelle)')); });
  if(M.boden.length===1) bz.push(Z('Ggf. Grundstücksanteil II','0,00 m²',''),Z('Aktueller Bodenrichtwert:','0,00 €/m²','(Ableitung aus öffentlicher Bodenrichtwerttabelle)'));
  bz.push(Z('Gesamtgrundstück',jbN(M.flaecheSumme,2)+' m²','','summe'));
  d+=T(bz);
  const merkmale=v.objektdaten.merkmale.filter(m=>(m.label||'').trim()||(m.wert||'').trim()).map(m=>KV(h((m.label||'').replace(/:?\s*$/,':')),h(m.wert)));
  if(!ohneGeb){
    const gz=[], gleichesBaujahr=G.every(g=>g.baujahr===G[0].baujahr);
    G.forEach((g,i)=>{ const zu=mehrere?' '+name(i):'';
      if(i===0||!gleichesBaujahr) gz.push(Z('Baujahr'+h(mehrere&&!gleichesBaujahr?zu:'')+':','ca. '+h(g.baujahr!=null?String(g.baujahr):'–'),h(g.baujahrText)));
      gz.push(Z('BGF (Bruttogrundfläche)'+h(zu),'ca. '+jbN(g.bgf)+' m²',h(g.bgfText))); });
    d+=U('1.3','Gebäude')+T(gz.concat(merkmale,[Z('Mietertrag / Jahr:',e2(M.miete.jahr),'(ansetzbare Nettokaltmiete, s. Ziffer '+kap.ertrag+')')]),'jbd-daten');
    d+='<p class="jbd-fett">Aufstellung der monatlichen Mieterträge (netto, ohne Nebenkosten):</p>'
      +T(v.mieten.map(m=>Z(h(m.text),e2(m.monat),h(m.hinweis?(/^\(.*\)$/.test(m.hinweis)?m.hinweis:'('+m.hinweis+')'):'')))
        .concat([Z('Summe monatlich',e2(M.miete.monat),'','summe'),Z('Summe jährlich',e2(M.miete.jahr),'','gesamt')]),'jbd-mieten');
  } else d+=U('1.3','Bebauung')+P(v.objektdaten.bebauung)+(merkmale.length?T(merkmale,'jbd-daten'):'');

  // 2. Bodenrichtwert
  d+=kopf(2,'Bodenrichtwert')+'<p class="jbd-text">'+h(v.texte.bodenrichtwert)+'</p>'+T([KV('<b>Grundstückslage:</b>',h(D.anschrift))],'jbd-kv');
  v.boden.forEach((b,i)=>{ d+=U('2.'+(i+1),i?'Merkmale Grundstücksanteil '+roem[i]:'Grundstücksmerkmale')
    +T([KV('Flst.-Nr.:',h(b.flst)),KV('Nutzbarkeit:',h(b.nutzbarkeit)),KV('Zone Nr.:',h(b.zone)),KV('Richtwert:',b.richtwert!=null?jbN(b.richtwert,2)+' €/m²':'–'),KV('Preisansatz:',jbN(b.brw,2)+' €/m²')],'jbd-kv'); });
  if((ctx.bilder||[]).length) d+='<div class="jbd-bilder">'+ctx.bilder.map(b=>'<figure><img src="'+b.src+'" alt="'+h(b.alt||'Bodenrichtwertkarte')+'"></figure>').join('')+'</div>';

  // 3. Bautechnische Daten
  d+=kopf(3,'Bautechnische Daten')+U('3.1','Bauschäden / Instandhaltung'+(ohneGeb?' / Altlasten':''))+P(v.bautechnik.schaeden)
    +U('3.2','Technischer Zustand / Instandhaltungsstau')+P(v.bautechnik.zustand)
    +U('3.3','Wesentliche Modernisierungen in den letzten 10 Jahren')+P(v.bautechnik.modernisierung)
    +U('3.4','Allgemeiner Eindruck / Erläuterungen')+P(v.bautechnik.eindruck);

  // PV-Anlage
  if(v.pv){ const p=v.pv, n=kap.pv, Q=M.pv||{laufzeit:null,rest:null,vf:null,roh:null,bewEur:null,rein:null,wert:null};
    d+=kopf(n,'PV-Anlage')+'<p class="jbd-text">'+h(v.texte.pv)+'</p>'+U(n+'.1','Preisansatz PV-Anlage')
      +T([Z('Nutzungsgrad der Einspeisung:','',p.einspeisung!=null?jbN(p.einspeisung)+' %':'–'),Z('Nutzungsgrad des Eigenverbrauchs:','',p.eigen!=null?jbN(p.eigen)+' %':'–'),
        Z('Inbetriebnahme:','',datum(p.inbetrieb)),Z('Nennleistung in kWp:','',jbN(p.kwp,2)),
        Z('Durchschnittlicher Stromertrag (in Abhängigkeit des Nutzungsgrades, der Höhe des durchschnittlichen Strompreises und der Einspeisevergütung)','',jbN(p.eurKwh,5)+' €/kWh'),
        Z('EEG-Einspeisevergütung bis:','',datum(p.eegEnde)),Z('Durchschnittliche Stromerzeugung / Jahr:','',jbN(p.kwh)+' kWh'),
        Z('Liegenschaftszins:','',jbN(p.lz,2)+' %'),Z('Bewirtschaftungskosten (Pauschalansatz):','',jbN(p.bwk,2)+' %'),
        Z('Laufzeit seit Inbetriebnahme (ca.):','',Q.laufzeit==null?'–':jbN(Q.laufzeit,1)+' Jahre'),Z('Restnutzungsdauer (ca.):','',jbN(Q.rest,1)+' Jahre'),
        Z('Barwertfaktor (in Relation Restnutzungsdauer und Liegenschaftszins):','',jbN(Q.vf,2))])
      +'<p class="jbd-fett">Barwertermittlung des Solarertrags</p>'
      +T([Z('Rohertrag',jbN(p.kwh)+' kWh × '+jbN(p.eurKwh,5)+' € =',e2(Q.roh)),Z('./. Bewirtschaftungskosten',jbN(p.bwk,2)+' % aus '+jbN(Q.roh,2)+' € =',e2(Q.bewEur)),
        Z('Zwischensumme Reinertrag','',e2(Q.rein),'summe'),Z('x Barwertfaktor',jbN(Q.vf,2),''),Z('= Barwert der PV-Anlage zum Stichtag','',e2(Q.wert),'gesamt')]);
  }

  // Preisansatz Grund und Boden
  { const n=kap.boden; d+=kopf(n,'Preisansatz Grund und Boden');
    M.boden.forEach((b,i)=>{ d+=U(n+'.'+(i+1),'Preisansatz Grundstücksanteil '+roem[i])
      +T([Z('Grundstücksanteil '+roem[i],jbN(b.flaeche)+' m²',''),Z('x Aktueller Bodenrichtwert:',jbN(b.brw,2)+' €/m²',''),Z('Zwischensumme','',e2(b.zw),'summe'),
        Z('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbN(b.abschlagPct)+' %',e2(b.abschlagEur)),Z(M.boden.length>1?'Preisansatz Grundstücksanteil '+roem[i]:'Preisansatz Grund und Boden','',e2(b.wert),'gesamt')]); });
    if(M.boden.length>1||ohneGeb){
      const z=M.boden.map((b,i)=>Z('Preisansatz Grundstücksanteil '+roem[i],'',e2(b.wert))).concat([Z('Preisansatz Grund und Boden',jbN(M.flaecheSumme)+' m²',e2(M.bodenSumme),'summe')]);
      if(ohneGeb){
        M.pauschal.concat(M.objekt).forEach(p=>z.push(Z((p.betrag<0?'- ':'+ ')+h(p.text.replace(/^[+\-±]\s*/,'')),'',e2(p.betrag))));
        if(!M.objekt.some(p=>p.betrag<0)) z.push(Z('- objektspezifische Merkmale (z. B. Grundstückslasten)','',e2(0)));
        if(M.pv) z.push(Z('+ objektspezifische Merkmale (PV-Anlage)','',e2(M.pvWert)));
        z.push(Z('Preisansatz Grundstück inkl. Außenanlagen','',e2(M.ergebnis),'gesamt'));
      }
      d+=U(n+'.'+(M.boden.length+1),'Preisansatz Grund und Boden')+T(z);
    }
    if(!ohneGeb) d+='<p class="jbd-text">Verwendung des Preisansatzes Grund und Boden siehe Ziffer '+kap.substanz+' und Ziffer '+kap.ertrag+'.</p>';
  }

  // Preisansatz (Bausubstanz als Grundlage)
  if(!ohneGeb){ const N=jbSubstanzNummern(kap.substanz,G.length), basen=new Set();
    d+=kopf(kap.substanz,'Preisansatz (Bausubstanz als Grundlage)')+'<p class="jbd-text">'+h(v.texte.bausubstanz)+'</p>';
    M.geb.forEach((g,i)=>{ const q=G[i], zu=mehrere?' – '+name(i):'', basis=Math.abs(g.bpiFaktor-1.1104)<0.001?2015:2021; basen.add(basis);
      const art=(ImmoBaupreisindex.ARTEN[q.bpiArt]||{}).name||'';
      d+=U(N.rnd[i],'Berechnung der Restnutzungsdauer und Alterswertminderung'+zu)
        +T([Z('Baujahr des Gebäudes:',h(q.baujahr!=null?String(q.baujahr):'–'),h(q.baujahrText)),Z('Gesamtnutzungsdauer:',jahre(g.gnd),''),Z('Gebäudealter',jahre(g.alter),''),
          Z('Restnutzungsdauer (RND):',jahre(g.rndRech),''),Z('Angepasste RND:',jahre(g.rnd),g.angepasst?h(q.rndText||'(auf Grundlage des aktuellen Zustands)'):''),
          Z('Technische Wertminderung ca.',jbN(g.wm)+' %','(lt. Sachwertrichtlinie)'),
          Z('Baupreisindex'+(q.bpiText?' '+h(q.bpiText):''),jbN(g.bpi,1),'(Baupreisindex für '+h(art)+' in Baden-Württemberg, Basis '+basis+' = 100)*')],'jbd-daten')
        +U(N.preis[i],'Berechnung des Gebäudepreis in Abhängigkeit der Restnutzungsdauer'+zu)
        +T([Z('Normalherstellungskosten',jbN(g.nhk2010)+' €/m²','(lt. NHK 2010)'),
          Z('./. Abschlag für Bauweise '+jbN(g.abschlagPct)+' %',jbN(g.abschlagEur)+' €/m²','(z. B. Holzständerbauweise 1960–1972 bis zu 20 %)'),
          Z('Bereinigte NHK',jbN(g.nhkBer)+' €/m²','(gerundet)','summe'),Z('Baupreisindex auf Basis 2010',jbN(g.index2010,1),'(Umrechnungsfaktor '+jbN(g.bpiFaktor,4)+')*'),
          Z('Normalherstellungskosten',jbN(g.nhkHeute)+' €/m²','zum heutigen Stichtag'),Z('./. Technische Wertminderung',jbN(g.wmEur)+' €/m²','entspricht ca. '+jbN(g.wm)+' % aus '+jbN(g.nhkHeute)+' €/m²'),
          Z('<b>Gebäudepreis'+h(mehrere?' '+name(i):'')+'</b>','<b>'+jbN(g.preis)+' €/m²</b>','<b>zum heutigen Stichtag</b>','gesamt')],'jbd-daten'); });
    d+='<p class="jbd-fuss">* Der Baupreisindex für Baden-Württemberg wird auf der Basis '+[...basen].join(' bzw. ')+' = 100 veröffentlicht; die Normalherstellungskosten beziehen sich '
      +'auf das Jahr 2010. Der Index wird deshalb mit dem angegebenen Faktor auf 2010 umgerechnet.</p>';
    d+='<p class="jbd-fett">Berechnung des Preisansatzes auf Grundlage der Bausubstanz</p>'+U(N.boden,'Preisansatz Grund und Boden')
      +T([].concat(...M.boden.map((b,i)=>[Z('Grundstücksanteil '+roem[i],jbN(b.flaeche)+' m²',''),Z('x Aktueller Bodenrichtwert:',jbN(b.brw,2)+' €/m²',''),
        Z('Zwischensumme Grundstücksanteil '+roem[i],'',e2(b.zw),'summe'),Z('- Abschlag (z. B. Beschaffenheit, Lage, etc.):',jbN(b.abschlagPct)+' %',e2(b.abschlagEur))]),
        [Z('Preisansatz Grund und Boden','',e2(M.bodenSumme),'gesamt')]));
    const gz=[].concat(...M.geb.map((g,i)=>{ const zu=mehrere?' '+name(i):''; return [Z('Bruttogrundfläche'+h(zu)+' (BGF)',jbN(g.bgf)+' m²',''),
      Z('x Preis / m² in Abhängigkeit der RND',jbN(g.preis)+' €/m²',''),Z('Zwischensumme'+h(mehrere?zu:' Gebäude'),'',e2(g.wert),'summe')]; }));
    if(mehrere) gz.push(Z('Zwischensumme '+h(G.map((g,i)=>name(i)).join(' und ')),'',e2(M.gebSumme),'summe'));
    M.pauschal.forEach(p=>gz.push(Z('+ '+h(p.text.replace(/^\+\s*/,'').replace(/\s*\(Pauschalansatz\)\s*$/,''))+' (Pauschalansatz)','',e2(p.betrag))));
    gz.push(Z('Preisansatz Gebäude und Außenanlagen','',e2(M.gebAussen),'gesamt'));
    d+=U(N.geb,'Preisansatz Gebäude und Außenanlagen (Bausubstanz als Grundlage)')+T(gz);
    const sz=[Z('Preisansatz Grund und Boden','',e2(M.bodenSumme)),Z('Preisansatz Gebäude und Außenanlagen','',e2(M.gebAussen)),Z('Vorläufiger Preisansatz','',e2(M.vorlaeufig),'summe')];
    if(M.pv) sz.push(Z('+ objektspezifische Merkmale (PV-Anlage)','',e2(M.pvWert)));
    M.objekt.forEach(p=>sz.push(Z((p.betrag<0?'- ':'+ ')+h(p.text.replace(/^[+\-±]\s*/,'')),'',e2(p.betrag))));
    if(!M.pv&&!M.objekt.some(p=>p.betrag>=0)) sz.push(Z('+ objektspezifische Merkmale (z. B. Sonderausstattung)','',e2(0)));
    if(!M.objekt.some(p=>p.betrag<0)) sz.push(Z('- objektspezifische Merkmale (z. B. Grundstückslasten)','',e2(0)));
    sz.push(Z('Preisansatz (Bausubstanz als Grundlage)','',e2(M.substanz),'gesamt'));
    d+=U(N.summe,'Preisansatz (Bausubstanz als Grundlage)')+T(sz);
  }

  // Preisansatz (Mietertrag als Grundlage)
  if(!ohneGeb){ const N=jbErtragNummern(kap.ertrag,G.length);
    const teil=i=>M.teile.find(x=>x.gebaeude===i)||{roh:0,bew:0,zw:0,abschlag:0,rein:0,bodenAnteil:0,bodenZins:0,gebRein:0,rnd:M.geb[i].rnd,vf:0,wert:0,gewerblich:0,bwkPct:+v.bwk||0,lzPct:+v.lz||0};
    d+=kopf(kap.ertrag,'Preisansatz (Mietertrag als Grundlage)')+'<p class="jbd-text">'+h(v.texte.mietertrag)+'</p>';
    M.geb.forEach((g,i)=>{ const t=teil(i), q=G[i], nm=mehrere?name(i):'';
      d+=U(N.rnd[i],'Berechnung Restnutzungsdauer für '+(mehrere?nm:'Gebäude'))
        +T([Z('Baujahr'+(mehrere?'':' Hauptgebäude')+':',h(q.baujahr!=null?String(q.baujahr):'–'),h(q.baujahrText)),Z('Gesamtnutzungsdauer:',jahre(g.gnd),''),
          Z('Restnutzungsdauer (RND):',jahre(g.rndRech),''),Z('Angepasste RND:',jahre(g.rnd),g.angepasst?h(q.rndText||'(auf Grundlage des aktuellen Zustands)'):'')],'jbd-daten')
        +U(N.daten[i],'Daten für die Preisermittlung auf Grundlage des Gebäudeertrags')
        +T([Z('Gesamte Jahreskaltmiete / Rohertrag:',e2(t.roh),mehrere?'('+h(nm)+')':''),Z('Abschlag Bewirtschaftungskosten',jbN(t.bwkPct,2)+' %','(aus dem jährlichen Rohertrag)'),
          t.gewerblich>0?Z('Anteil gewerbliche Kaltmiete',e2(t.gewerblich),''):'',
          Z('- Abschlag für gewerbliche Vermietung',e2(-t.abschlag),i===0||!mehrere?h(v.abschlagText):''),Z('Bodenwertverzinsung',jbN(t.lzPct,2)+' %','(aus dem Bodenwert)'),
          Z('Preisansatz Grund und Boden:',e2(t.bodenAnteil),mehrere?'(anteilig zum Rohertrag '+h(nm)+')':''),Z('Angepasste RND',jahre(t.rnd),''),
          Z('Vervielfältiger für Gebäude',jbN(t.vf,2),'(Barwertfaktor für die Kapitalisierung)')],'jbd-daten'); });
    d+='<p class="jbd-fett">Berechnung des Preisansatzes auf Grundlage tatsächlich erzielter bzw. fiktiver Mieterträge</p>';
    M.geb.forEach((g,i)=>{ const t=teil(i), nm=mehrere?name(i):'Gebäude';
      d+=U(N.preis[i],'Preisansatz '+nm+' (Mietertrag als Grundlage)')
        +T([Z('Gesamte Jahreskaltmiete / Rohertrag:',e2(t.roh)+' / Jahr',''),Z('- Abschlag für Bewirtschaftungskosten',jbN(t.bwkPct,2)+' %',e2(-t.bew)),
          Z('Zwischensumme','',e2(t.zw),'summe'),Z('- Abschlag für gewerbliche Vermietung','',e2(-t.abschlag)),
          Z('Grundstücksreinertrag (Gebäude inkl. Grund und Boden)','',e2(t.rein),'summe'),
          Z('- Ertragsanteil Grund und Boden',jbN(t.lzPct,1)+' % aus '+e2(t.bodenAnteil),e2(-t.bodenZins)),
          Z((mehrere?'Reinertrag '+h(nm):'Gebäudereinertrag')+' (nur Gebäude ohne Anteil Grund und Boden)','',e2(t.gebRein),'summe'),
          Z('x Vervielfältiger für Gebäude (Barwertfaktor)',jbN(t.vf,2)+' bei '+jbN(t.rnd)+' Jahre RND',''),
          Z('Preisansatz '+h(nm)+' (Mietertrag als Grundlage)','',e2(t.wert),'gesamt')]); });
    d+=U(N.summe,'Preisansatz (Mietertrag als Grundlage)')
      +T([Z('Preisansatz Grund und Boden','',e2(M.bodenSumme))].concat(M.geb.map((g,i)=>Z('Preisansatz '+h(mehrere?name(i):'Gebäude')+' (Mietertrag als Grundlage)','',e2(teil(i).wert))),
        M.pv?[Z('PV-Anlage','',e2(M.pvWert))]:[],[Z('Preisansatz (Mietertrag als Grundlage)','',e2(M.ertrag),'gesamt')]));
  }

  // Zusammenfassung / Sonstiges
  { const n=kap.summe, mittel=M.gewichtung===50?'Mittel aus den o.g. Preisansätzen':'Gewichtetes Mittel (Bausubstanz '+jbN(M.gewichtung)+' %, Mietertrag '+jbN(100-M.gewichtung)+' %)';
    const eur0=x=>jbE(x,0);
    d+=kopf(n,'Zusammenfassung / Sonstiges')+U(n+'.1','Die einzelnen Preiskomponenten für Sie im Überblick')
      +(ohneGeb?T([Z('Preisansatz Grund und Boden','',eur0(M.bodenSumme)),Z('Summe der objektspezifischen Eigenschaften','',eur0(M.pauschalSumme+M.objektSumme+M.pvWert)),
          Z('Preisansatz Grundstück inkl. Außenanlagen','',eur0(M.ergebnis),'jbd-mittel')],'jbd-box')
        :T([Z('Preisansatz (Bausubstanz als Grundlage)','',eur0(M.substanz)),Z('Preisansatz (Mietertrag als Grundlage)','',eur0(M.ertrag)),Z(h(mittel),'',eur0(M.ergebnis),'jbd-mittel')],'jbd-box'))
      +U(n+'.2','Sonstiges / Hinweise')+P(v.texte.hinweise)
      +'<p class="jbd-ort">'+h([v.ort,datum(v.stichtag)].filter(Boolean).join(', '))+'</p>';
  }
  return d+'</div>';
}

/* Dokument zeigen: aus dem offenen Vordruck (auch ungespeichert) oder aus einer gespeicherten Bewertung */
async function jbDokAnsehen(lId,bId){
  let v, l;
  if(lId&&bId){ l=LV.liste.find(x=>x.id===lId); const b=l&&(l.bewertungen||[]).find(x=>x.id===bId); if(!b||!b.vordruck) return; v=JBK.bereinigen(b.vordruck); }
  else { const E=JB_EDIT; if(!E) return; v=JBK.bereinigen(E.v); l=LV.liste.find(x=>x.id===E.lId)||E.neuL||{}; }
  const bilder=[];
  for(const id of v.bilder.karte){ const a=await lvAnhangLesen(id); if(a&&a.data) bilder.push({src:lvDataUrl(a),alt:a.name}); }
  const r=document.getElementById('report'); if(!r) return;
  r.className='jb-dok';
  r.dataset.pdfname=('Preiseinschätzung '+(v.objekt||l.name||'Liegenschaft')+' '+(v.deckblatt.anschrift||'')+' Stichtag '+(v.stichtag?LVK.datumDE(v.stichtag):'')).replace(/[^\wäöüÄÖÜß ,.-]/g,'').replace(/\s+/g,' ').trim();
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="jbDokZurueck()">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="jbDokWord()">Word</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +jbDokHtml(v,{bilder,absender:LV.einst||{}});
  const o=document.getElementById('lv_overlay'); if(o) o.classList.remove('on');
  document.body.style.overflow=''; document.body.classList.add('report-mode'); window.scrollTo(0,0);
}
function jbDokZurueck(){
  document.body.classList.remove('report-mode');
  const r=document.getElementById('report'); if(r){ r.innerHTML=''; r.className=''; delete r.dataset.pdfname; }
  const o=document.getElementById('lv_overlay'); if(o){ o.classList.add('on'); document.body.style.overflow='hidden'; }
  lvRender();
}
function jbDokWord(){
  const r=document.getElementById('report'), inhalt=r&&r.querySelector('.jbd'); if(!inhalt) return;
  const name=r.dataset.pdfname||'Preiseinschätzung';
  lvHerunterladen(ImmoOffice.docx(ImmoOffice.bloeckeAusHtml(inhalt),{titel:name}),LV_DOCX,lvDateiname(name)+'.docx');
}
