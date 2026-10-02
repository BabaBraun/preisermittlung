/* ---------- Report ---------- */
function druckbericht(){
  compute();const R=window._R;
  const w = modus()==='wohnung';
  /* Maskiert auch Anführungszeichen, weil Werte in Attributen (alt, title) landen */
  const esc=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const L=(l,v)=>`<tr><td>${l}</td><td>${v}</td></tr>`;
  const XL=(prefix,max)=>extraLines(prefix,max).map(x=>L('· '+esc(x[0]),eur(x[1]))).join('');
  let anbauRows=(!w&&$('anbau_aktiv').checked)?L('Anbau/Nebengebäude · BGF',num2(R.bgfAN)+' m² × '+num2(R.an.preis)+' €/m²')+XL('xan',2)+L('Anbau vor Marktanpassung',eur(R.anVor)):'';
  let niessRow=$('niess_aktiv').checked?`<tr><td>− Belastung Nießbrauchsrecht</td><td>${eur(R.niessWert)}</td></tr>`:'';
  const today=new Date().toLocaleDateString('de-DE');
  const kopf=$('cfg_kopf').value||'Immobilien-Preisermittlung';
  const objektTyp = w ? ($('ek_wtyp').value+' (Wohnung)') : $('ek_typ').value;
  const verfahren1 = w ? 'Vergleichswert' : 'Gebäudesubstanz';

  let bodenBlock = w ? `
   <h2>Wohnung / Gemeinschaft</h2>
   <table>
    ${L('Miteigentumsanteil',esc($('ek_mea').value||'–'))}
    ${L('Etage / Lage',esc($('ek_etage').value||'–'))}
    ${L('Wohnfläche',num2(num('ek_wohnflaeche'))+' m²')}
    ${L('Hausgeld gesamt',num2(num('ek_hausgeld'))+' €/Monat')}
    ${L('davon nicht umlagefähig',num2(num('ek_hausgeld_nu'))+' €/Monat')}
   </table>` : `
   <h2>Grundstück &amp; Bodenwert</h2>
   <table>
    ${L('Flurstück / Zone',esc($('ek_flst').value||'–'))}
    ${L('Grundstücksfläche',num2(num('ek_gs_flaeche')+num('xgs1_flaeche')+num('xgs2_flaeche'))+' m²')}
    ${L('Bodenrichtwert (Anteil I)',num2(num('ek_brw'))+' €/m²')}
    <tr class="total"><td>Bodenwert vor Marktanpassung</td><td>${eur(R.bodenwert)}</td></tr>
   </table>`;

  let wert1Block = w ? `
   <h2>Preisansatz nach Vergleichswert</h2>
   <table>
    ${L('Wohnfläche × Vergleichspreis',num2(num('ek_wohnflaeche'))+' m² × '+num2(num('vw_preis'))+' €/m²')}
    ${num('vw_garage')!==0?L('+ Garage / TG-Stellplatz',eur(num('vw_garage'))):''}
    ${num('vw_sonst')!==0?L('+ Sonstiges',eur(num('vw_sonst'))):''}
    ${XL('xvw',3)}
    <tr class="total"><td>Preis nach Vergleichswert</td><td>${eur(R.substanz)}</td></tr>
   </table>` : `
   <h2>Preisansatz nach der Gebäudesubstanz</h2>
   <table>
    ${L('Hauptgebäude · BGF',num2(R.bgfHG)+' m² × '+num2(R.hg.preis)+' €/m²')}
    ${XL('xhg',3)}
    ${L('Hauptgebäude + Außenanlagen vor MA',eur(R.hgVor))}
    ${anbauRows}
    ${L('Bodenwert vor MA',eur(R.bodenwert))}
    ${L('Vorläufiger Preisansatz',eur(R.vorlauf))}
    ${L('× Marktanpassung',num2(R.mf))}
    ${XL('xsub',3)}
    <tr class="total"><td>Preis nach Gebäudesubstanz</td><td>${eur(R.substanz)}</td></tr>
   </table>`;

  // Objektbeschreibung (Freitexte) & Fotos
  const bt=(title,id)=>{let e=$(id);let v=e?(e.value||'').trim():'';return v?`<h3>${title}</h3><div class="beschr">${esc(v)}</div>`:'';};
  // Strukturierte Objektdaten (nur befüllte Felder)
  const dl=(label,id,suffix)=>{let e=$(id);let v=e?(''+(e.value||'')).trim():'';if(!v||v==='0'||v==='–')return '';return `<tr><td>${label}</td><td>${esc(v)}${suffix||''}</td></tr>`;};
  let odGrund=[dl('Eigentumsform','od_eigentum'),dl('Entwicklungszustand','od_entwicklung'),dl('Anzahl Flurstücke','od_anz_flst'),dl('Flurstück-Nr(n).','od_flst_nrn'),dl('Grundbuch','od_grundbuch'),dl('Grundbuch-Blatt','od_gb_blatt'),dl('Abt. II','od_abt2'),dl('Abt. III','od_abt3'),dl('Erschließung','od_erschliessung'),dl('Denkmalschutz','od_denkmal'),dl('Baulasten','od_baulasten'),dl('Altlasten','od_altlasten')].join('');
  let odPlan=[dl('Flächennutzungsplan','od_fnp'),dl('Bebauungsplan','od_bplan'),dl('Art der Nutzung','od_nutzungsart'),dl('GRZ / GFZ','od_grz_gfz'),dl('zul. überbaute Fläche','od_ueberbau_zul',' m²'),dl('tatsächl. überbaute Fläche','od_ueberbau_ist',' m²')].join('');
  let odGeb=[dl('Gebäudeart','od_gebart'),dl('Bauweise','od_bauweise'),dl('Baujahr','ek_baujahr'),dl('Letzte Sanierung','ek_sanierung'),dl('Vollgeschosse','od_geschosse'),dl('Wohneinheiten','ek_anz_we'),dl('Gewerbeeinheiten','od_gewerbe_eh'),dl('Stellplätze','ek_anz_stell'),dl('Aufzug','od_aufzug'),dl('Heizungsart','od_heizung'),dl('Fenster','od_fenster'),dl('Energieausweis','od_energieausweis'),dl('Energieeffizienzklasse','od_effizienz'),dl('Gebäudegrundfläche','od_gebflaeche',' m²'),dl('Wohnfläche','ek_wohnflaeche',' m²')].join('');
  let objektBlock='';
  if(odGrund) objektBlock+='<h2>Grundstück, Grundbuch &amp; Recht</h2><table>'+odGrund+'</table>';
  if(odPlan) objektBlock+='<h2>Planungsrecht</h2><table>'+odPlan+'</table>';
  if(odGeb) objektBlock+='<h2>Gebäudedaten</h2><table>'+odGeb+'</table>';
  let beschreibungBlock=[
    bt('Makrolage','lage_makro'),bt('Mikrolage','lage_mikro'),
    bt('Grundstück','grundstueck_besch'),bt('Gebäude &amp; Ausstattung','gebaeude_besch'),
    bt('Baumängel / Bauschäden','maengel'),bt('Instandhaltungsstau','stau'),
    bt('Modernisierungen','modernisierung'),bt('Allgemeiner Eindruck','eindruck'),
    bt('Rechte &amp; Lasten','rechte_lasten'),bt('Vermietungssituation','vermietung_besch'),
    bt('Markteinschätzung','vermarktung_besch')
  ].join('');
  if(beschreibungBlock) beschreibungBlock='<h2>Objektbeschreibung</h2>'+beschreibungBlock;
  const IA_FOTOLABEL={objekt:'Objektfoto',schaden:'Schadensfoto',karte:'Kartenausschnitt'};
  const fotoGrid=cat=>{let ph=PHOTOS.filter(p=>p.cat===cat);return ph.length?`<div class="fotos">${ph.map(p=>`<figure><img src="${bildUrl(p.data)}" alt="${esc(p.caption||IA_FOTOLABEL[cat]||'Foto')}">${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>`).join('')}</div>`:'';};
  let fotoBlock=PHOTOS.some(p=>p.cat==='objekt'||p.cat==='schaden')?('<h2>Fotodokumentation</h2>'+
    (PHOTOS.some(p=>p.cat==='objekt')?'<h3>Objektfotos</h3>'+fotoGrid('objekt'):'')+
    (PHOTOS.some(p=>p.cat==='schaden')?'<h3>Schadensfotos</h3>'+fotoGrid('schaden'):'')):'';
  let kartenBlock=PHOTOS.some(p=>p.cat==='karte')?'<h2>Karten &amp; Pläne</h2>'+fotoGrid('karte'):'';
  let grBlock=GRUNDRISSE.length?'<h2>Grundrisse</h2>'+GRUNDRISSE.map(p=>{ let N=grNorm(p.d);
      return '<figure class="gr-fig">'+grSVG(N,p.darst)+'<figcaption>'+esc(grTitel(N))+(p.d.quelle?' · Grundlage: '+esc(p.d.quelle):'')
        +(N.massstab?'':' · nicht maßstäblich')+'</figcaption></figure>'; }).join('')
    +'<div class="beschr">Digital nachgezeichnet nach den vorliegenden Planunterlagen. Maßgeblich bleiben die Originalunterlagen.</div>':'';

  // Diagramm: Zusammensetzung des Preisansatzes
  let diagrammBlock='';
  if(R.empfehlung>0){
    let gebAnteil=Math.max(R.substanz-R.bodenwert,0);
    let teile=w
      ? [['Vergleichswert (inkl. Bodenanteil)',R.substanz,'b1']]
      : [['Bodenwert',R.bodenwert,'b1'],['Gebäude &amp; Außenanlagen',gebAnteil,'b2']];
    let gesamt=teile.reduce((s,t)=>s+t[1],0);
    if(gesamt>0){
      diagrammBlock='<h2>Zusammensetzung des Substanzwerts</h2><div class="chart"><div class="bar">'
        + teile.map(t=>`<span class="${t[2]}" style="width:${(t[1]/gesamt*100).toFixed(1)}%"></span>`).join('')
        + '</div><div class="legend">'
        + teile.map(t=>`<span><i class="${t[2]}"></i>${t[0]}: ${eur(t[1])} (${num2(t[1]/gesamt*100)} %)</span>`).join('')
        + '</div></div>';
    }
  }

  // Feststellungen der Ortsbesichtigung (Aufnahmebogen)
  let auRows=[dl('Besichtigung am','au_datum'),dl('Uhrzeit / Wetter','au_wetter'),dl('Anwesend','au_anwesend'),
    dl('Zimmer','au_zimmer'),dl('Bäder','au_baeder'),dl('Gäste-WC','au_gaeste_wc'),dl('Tageslichtbad','au_tageslichtbad'),
    dl('Küche','au_kueche'),dl('Keller','au_keller'),dl('Dachgeschoss','au_dg'),dl('Balkon / Terrasse','au_balkon'),
    dl('Heizungsart','au_heizung_art'),dl('Heizung Baujahr / Fabrikat','au_heizung_bj'),dl('Warmwasser','au_ww'),
    dl('Fenster','au_fenster'),dl('Dämmung Fassade','au_daemm_fassade'),dl('Dämmung Dach','au_daemm_dach'),
    dl('Elektro','au_elektro'),dl('Energieausweis','au_energieausweis'),dl('Energiekennwert','au_energiewert',' kWh/(m²·a)'),
    (($('au_lat').value||'').trim()&&($('au_lon').value||'').trim())?L('Standort (GPS)',esc($('au_lat').value)+', '+esc($('au_lon').value)):'',
    dl('Energieeffizienzklasse','au_energieklasse'),dl('Aufzug','au_aufzug'),dl('Barrierefreiheit','au_barriere')].join('');
  let auBt=aufnahmeBauteileListe();
  let auBlock='';
  if(auRows||auBt.length||($('au_maengel').value||'').trim()||($('au_notizen').value||'').trim()){
    auBlock='<h2>Feststellungen der Ortsbesichtigung</h2>';
    if(auRows) auBlock+='<table>'+auRows+'</table>';
    if(auBt.length) auBlock+='<h3>Besondere Bauteile</h3><div class="beschr">'+esc(auBt.join(' · '))+'</div>';
    auBlock+=bt('Mängel / Auffälligkeiten','au_maengel')+bt('Sonstige Notizen','au_notizen');
  }
  let rlBlock=raumlisteBericht(esc);
  if(rlBlock){ if(!auBlock) auBlock='<h2>Feststellungen der Ortsbesichtigung</h2>'; auBlock+=rlBlock; }
  let ulSt=unterlagenStatus();
  if(ulSt.da.length) auBlock+='<h3>Vorliegende Unterlagen</h3><div class="beschr">'+esc(ulSt.da.join(' · '))
    +(ulSt.fehlt.length?'\nNicht vorgelegt: '+esc(ulSt.fehlt.join(' · ')):'')+'</div>';
  let szBlock=(window._SZEN_DATA&&window._SZEN_DATA.length)
    ? '<h2>Sensitivität</h2><table><tr><td><b>Szenario (Zins · Mietniveau)</b></td><td><b>Preisansatz</b></td></tr>'
      + window._SZEN_DATA.map(d=>L(esc(d.name)+' — '+num2(d.lz)+' % · '+num2(d.miete)+' %',
          eur(d.wert)+(d.istBasis?'':' ('+(d.abw>0?'+':'')+num2(d.abw)+' %)'))).join('')
      + '</table>' : '';

  // Vergleichswert, Marktmieten, Erbbaurecht, Wertkorrekturen
  let vglRows='';
  for(let i=0;i<N_VGL;i++){
    let fl=num('vgl_fl'+i), kp=num('vgl_kp'+i);
    if(fl>0&&kp>0) vglRows+=L(esc(($('vgl_adr'+i).value||'Vergleichsobjekt '+(i+1)))
      +(($('vgl_bj'+i).value||'').trim()?', Bj. '+esc($('vgl_bj'+i).value):'')
      +(($('vgl_zust'+i).value||'').trim()?', '+esc($('vgl_zust'+i).value):''), num2(kp/fl)+' €/m²');
  }
  let vergleichBlock='';
  if(R.vwAktiv || (w && R.vergleichWert>0)){
    vergleichBlock='<h2>Vergleichswertverfahren</h2>'
      + (vglRows?'<table>'+vglRows+'<tr class="total"><td>Durchschnitt der Vergleichsobjekte</td><td>'+$('o_vgl_avg').textContent+'</td></tr></table>':'')
      + '<table>'+L('Wohnfläche × Vergleichspreis',num2(num('ek_wohnflaeche'))+' m² × '+num2(num('vw_preis'))+' €/m²')
      + (num('vw_garage')?L('+ Garage / Stellplatz',eur(num('vw_garage'))):'')
      + (num('vw_sonst')?L('+ Sonstiges',eur(num('vw_sonst'))):'')
      + '<tr class="total"><td>Preis nach Vergleichswert</td><td>'+eur(R.vergleichWert)+'</td></tr></table>';
  }
  let mspBlock=(R.mspData&&R.mspData.zeilen.length)
    ? '<h2>Marktmieten-Vergleich</h2><table><tr><td><b>Datengrundlage</b></td><td><b>€/m²</b></td></tr>'
      + R.mspData.zeilen.map(z=>L(esc(z.q), (z.mn>0&&z.mx>0?num2(z.mn)+' – '+num2(z.mx)+' · Ø ':'')+num2(z.av)+' €/m²')).join('')
      + '<tr class="total"><td>Mittelwert der Quellen</td><td>'+num2(R.mspData.avg)+' €/m²</td></tr></table>' : '';
  let erbbauBlock=R.ebAktiv?`<h2>Erbbaurecht</h2><table>
     ${L('Bodenwert (entfällt beim Erbbaurecht)',eur(R.bodenwert))}
     ${L('Angemessene Bodenverzinsung ('+num2(R.ebVpct)+' %)',eur(R.ebVz))}
     ${L('− tatsächlicher Erbbauzins',eur(R.ebZins))}
     ${L('Jährlicher Vorteil × Barwertfaktor '+num2(R.ebVf),eur(R.ebBarwert))}
     <tr class="total"><td>Korrektur für Erbbaurecht</td><td>− ${eur(R.erbbauAbzug)}</td></tr></table>`:'';
  let wkL=wkLines();
  let wkBlock=wkL.length?'<h2>Besondere objektspezifische Grundstücksmerkmale (§ 8 Abs. 3 ImmoWertV)</h2><table>'
      + wkL.map(x=>L(esc(x[0]),eur(x[1]))).join('')
      + '<tr class="total"><td>Summe Wertkorrekturen</td><td>'+eur(R.wkSumme)+'</td></tr></table>':'';

  // Plausibilisierung & Rendite
  let plausiBlock = (R.eigenM2>0) ? `<h2>Plausibilisierung</h2><table>
     ${L('Ermittelter Preis je m² Wohn-/Nutzfläche',num2(R.eigenM2)+' €/m²')}
     ${R.marktM2>0?L('Vergleichspreis lt. Marktbericht',num2(R.marktM2)+' €/m²'+($('pl_quelle').value?' ('+esc($('pl_quelle').value)+')':'')):''}
     ${R.plAbw!==null?L('Abweichung',(R.plAbw>0?'+':'')+num2(R.plAbw)+' %'):''}
    </table><div class="beschr">${esc(R.plTxt)}</div>` : '';
  let renditeBlock = (R.roh>0) ? `<h2>Rendite &amp; Investitionskosten</h2><table>
     ${L('Kaufpreis (Basis)',eur(R.reKP))}
     ${L('+ Kaufnebenkosten ('+num2(R.nkPct)+' %)',eur(R.reNK))}
     ${R.reSan?L('+ Sanierungs-/Modernisierungskosten',eur(R.reSan)):''}
     ${L('Investitionskosten gesamt',eur(R.reInvest))}
     ${L('Jahresrohertrag',eur(R.roh))}
     ${L('Jahresreinertrag',eur(R.reRein))}
     ${L('Bruttomietrendite',num2(R.reBrutto)+' %')}
     ${L('Nettomietrendite',num2(R.reNetto)+' %')}
     <tr class="total"><td>Kaufpreisfaktor</td><td>${num2(R.reFaktor)}-fach</td></tr>
    </table>` : '';

  // Unterschriftsblock
  const sigDatum = ($('ek_sign_datum').value||$('ek_stichtag').value||today);
  const sigOrt = ($('ek_ort').value||'').trim();
  const sigName = ($('ek_ersteller').value||'').trim();
  const sigFunk = ($('ek_ersteller_funktion').value||'').trim();
  let signBlock = `<div class="signblock">
     <div class="sigcol">
       <p class="sig-place">${sigOrt?esc(sigOrt)+', den '+esc(sigDatum):esc(sigDatum)}</p>
       ${bildUrl(SIGNATURE)?`<img class="sig-img" src="${bildUrl(SIGNATURE)}" alt="Unterschrift">`:''}
       <div class="sig-line${SIGNATURE?' hasimg':''}">${sigName?esc(sigName):'&nbsp;'}${sigFunk?'<br><span style="color:#666">'+esc(sigFunk)+'</span>':''}</div>
     </div>
     <div class="sigcol"></div>
   </div>`;

  // Deckblatt & Inhaltsverzeichnis
  const mitDeckblatt=$('rp_deckblatt').checked;
  const titelbild=(PHOTOS.find(p=>p.cat==='objekt')||{}).data;
  let coverBlock = mitDeckblatt ? `
   <div class="runhead">${esc(kopf)} · ${esc($('ek_anschrift').value||'')} · Stichtag ${esc($('ek_stichtag').value||today)}</div>
   <div class="cover">
     <div class="kopf">${esc(kopf)}</div>
     <h1>Rechnerische Preisermittlung</h1>
     <div class="sub">${esc(objektTyp)}</div>
     ${bildUrl(titelbild)?`<img class="titelbild" src="${bildUrl(titelbild)}" alt="Titelbild">`:''}
     <table>
      ${L('Objekt',esc($('ek_anschrift').value||'–'))}
      ${L('Auftraggeber(in)',esc($('ek_ag').value||'–'))}
      ${L('Nutzung',esc($('ek_nutzung').value||'–'))}
      ${L('Ortsbesichtigung',esc($('ek_besichtigung').value||$('au_datum').value||'–'))}
      ${L('Wertermittlungsstichtag',esc($('ek_stichtag').value||today))}
      ${sigName?L('Erstellt von',esc(sigName)):''}
     </table>
     <div class="ergebnis">
       <div class="lbl">Empfohlener Preisansatz</div>
       <div class="val">${(window._PRUEF&&window._PRUEF.status!=='ok')?'Entwurf':eur(R.empfehlung)}</div>
       <div style="font-size:12px;color:#555;margin-top:4px">Verhandlungsspanne ${eur(R.empfehlung*(1-R.vh))} – ${eur(R.empfehlung*(1+R.vh))}</div>
     </div>
   </div>
   <div class="pagebreak"></div>
   <h1 style="font-size:20px">Inhaltsverzeichnis</h1>
   <div class="toc" id="report_toc"></div>
   <div class="pagebreak"></div>` : '';

  $('report').className=''; delete $('report').dataset.pdfname;
  const P=window._PRUEF||{status:'ok',hinweise:[],fehlend:[]}, istEntwurf=P.status!=='ok';
  const entwurfBlock=istEntwurf?`<div class="entwurf"><b>Entwurf — keine belastbare Preisempfehlung.</b> ${esc(pruefStatusText(P))}<ul>${
      P.hinweise.filter(x=>x.stufe==='fehler').map(x=>'<li>'+esc((['zahl','negativ','prozent'].includes(x.art)?feldName(x.feld)+': ':'')+x.text)+'</li>').join('')
      +P.fehlend.map(x=>'<li>'+esc(x.text)+'</li>').join('')}</ul></div>`:'';
  const empfText=v=>istEntwurf?'Entwurf: '+eur(v):eur(v);
  $('report').innerHTML=`
   <button class="primary no-print" onclick="document.body.classList.remove('report-mode')">← zurück</button>
   <button class="no-print" onclick="window.print()">🖨 Drucken</button>
   <button class="no-print" onclick="downloadPDF()">⬇ PDF herunterladen</button>
   <button class="no-print" onclick="pdfTeilen()">Teilen</button>
   ${rpLeiste()}
   ${entwurfBlock}
   ${coverBlock}
   ${mitDeckblatt?'':`<p style="color:var(--muted);margin-top:14px">${esc(kopf)}</p>
   <h1>Rechnerische Preisermittlung</h1>`}
   ${$('ek_vordruck').value?`<p style="color:var(--accent);font-weight:600;margin:0 0 6px">Vordruck: ${esc($('ek_vordruck').value)}</p>`:''}
   ${mitDeckblatt?'':`<p><b>${esc(objektTyp)}</b> · ${esc($('ek_anschrift').value||'')}<br>
   Auftraggeber: ${esc($('ek_ag').value||'–')} · Stichtag: ${esc($('ek_stichtag').value||today)}<br>
   Nutzung: ${esc($('ek_nutzung').value||'–')}</p>`}
   ${objektBlock}
   ${auBlock}
   ${beschreibungBlock}
   ${lageBericht(esc)}
   ${bodenBlock}
   ${wert1Block}
   <h2>Preisansatz nach dem Gebäudeertrag</h2>
   <table>
    ${L('Jährlicher Rohertrag'+(R.mietrolleAktiv?' (Mietrolle)':''),eur(R.roh))}
    ${L('− Bewirtschaftungskosten'+(R.bwDetail?' (§ 32 detailliert)':''),eur(R.bewirt))}
    ${L('Grundstücksreinertrag',eur(R.grundRein))}
    ${L('− Bodenwertverzinsung ('+num2(R.effLZ)+' %)',eur(R.bodenwert*R.effLZ/100))}
    ${L('Gebäudereinertrag',eur(R.gebRein))}
    ${L('Restnutzungsdauer / Liegenschaftszins',(R.erGeb?'Hauptgebäude '+num2(R.erGeb.rndHG)+' J · Anbau '+num2(R.erGeb.rndAN)+' J':num2(R.erRND)+' Jahre')+' · '+num2(R.effLZ)+' %'+(R.modPunkte?' · '+num2(R.modPunkte)+' Mod.-Pkt.':''))}
    ${R.erGeb?L('davon Hauptgebäude ('+(R.erGeb.anteilHG*100).toLocaleString('de-DE',{maximumFractionDigits:1})+' % der Miete)',eur(R.erGeb.gebReinHG)+' × '+num2(R.erGeb.vfHG)+' = '+eur(R.erGeb.gebWertHG))
      +L('davon Anbau / Nebengebäude ('+(R.erGeb.anteilAN*100).toLocaleString('de-DE',{maximumFractionDigits:1})+' % der Miete)',eur(R.erGeb.gebReinAN)+' × '+num2(R.erGeb.vfAN)+' = '+eur(R.erGeb.gebWertAN)):''}
    ${L('× Vervielfältiger'+(R.erGeb?' (nach Miete gewichtet)':''),num2(R.vf))}
    ${XL('xer',3)}
    ${w?'':L('+ Bodenwert (BRW, ohne Sachwertfaktor)',eur(R.bodenwert))}
    <tr class="total"><td>Preis nach Gebäudeertrag</td><td>${eur(R.ertrag)}</td></tr>
   </table>
   ${R.mietrolleAktiv?`<h3>Mietrolle (wohnungsweise)</h3><table><tr><td><b>Einheit</b></td><td><b>Miete p.a.</b></td></tr>${(function(){let rows='';for(let i=0;i<14;i++){let bez=($('mr_bez'+i).value||'').trim();let pa=(num('mr_fl'+i)*num('mr_pm2'+i)+num('mr_pau'+i))*12;if(pa>0)rows+=L((bez||'Einheit '+(i+1))+(($('mr_gesch'+i).value||'').trim()?' ('+esc($('mr_gesch'+i).value.trim())+')':''),eur(pa));}return rows;})()}<tr class="total"><td>Summe Jahresrohertrag</td><td>${eur(R.mrSumme)}</td></tr></table>`:''}
   ${$('bw_aktiv').checked&&R.beleihungswert>0?`<h2>Beleihungsmodell nach BelWertV</h2><p><b>${window._BW?.status==='ok'?'Angaben und Nachweise vollständig':'Entwurf – keine freigegebene Beleihungswertermittlung'}</b></p>
    <p class="beschr">Der Beleihungswert ist der Wert, der unabhängig von vorübergehenden Wertschwankungen und unter
    Ausschaltung spekulativer Elemente während der gesamten Dauer der Beleihung erzielt werden kann (§ 3 BelWertV).
    Er ist nicht mit dem Verkehrswert gleichzusetzen.</p>
    <table>
    ${L('Kapitalisierungszinssatz',num2(R.bwZins)+' % (Mindestsatz § 12 Abs. 4: '+num2(R.bwZinsMin)+' %)')}
    ${L('Restnutzungsdauer',num2(R.bwRnd)+' Jahre')}
    ${R.bwRoh>0?L('Nachhaltiger Rohertrag',eur(R.bwRoh))+L('− Bewirtschaftungskosten (§ 11 Abs. 2)',eur(R.bwBewirt))+L('× Vervielfältiger',num2(R.bwVf))+L('Ertragswert',eur(R.bwErtrag)):''}
    ${R.bwHerstell>0?L('Herstellungswert inkl. Außenanlagen',eur(R.bwHerstell))+L('− Sicherheitsabschlag (§ 16 Abs. 2, '+num2(R.bwSicherP)+' %)',eur(R.bwSicherBetrag))+L('Sachwert',eur(R.bwSachwert)):''}
    ${L('Ausgangswert',eur(R.bwAusgang))}
    ${R.bwAbschlagP>0?L('− Abschläge ('+num2(R.bwAbschlagP)+' %)',eur(R.bwAbschlagBetrag)):''}
    <tr class="total"><td>${window._BW?.status==='ok'?'Beleihungswert – dokumentierter Ansatz':'Beleihungsszenario (Entwurf)'}</td><td>${eur(R.beleihungswert)}</td></tr>
   </table>`:''}
   ${$('en_aktiv').checked?`<h2>Energetische Qualität</h2><table>
    ${L('Energiekennwert',R.enKennwert>0?num2(R.enKennwert)+' kWh/(m²·a)':'–')}
    ${L('Effizienzklasse',esc($('en_klasse').value)+' (Normalzustand: '+esc($('en_ref_klasse').value)+')')}
    ${R.enModus==='kosten'
      ? L('Mehr-/Minderverbrauch',num2(R.enMehrKwh)+' kWh/Jahr')+L('Energiekostendifferenz / Jahr',eur(R.enMehrJahr))+L('× Barwertfaktor',num2(R.enVf))+L('Energiekosten-Barwert (separates Szenario)',eur(window._MODELL_DETAIL?.enKostenBarwert||0))
      : L('Abweichung',R.enStufen+' Klassenstufen')+L('Ansatz',num2(num('en_pct_stufe'))+' % je Stufe')+L('Zu-/Abschlag',num2(R.enPct)+' %')}
    <tr class="total"><td>Zusätzlich verwendeter Marktansatz</td><td>${(R.energieWert>0?'+ ':'− ')+eur(Math.abs(R.energieWert))}</td></tr>
   </table>`:''}
   ${sanBericht(esc)}
   ${$('pv_aktiv').checked?`<h2>Photovoltaik-Anlage</h2><table>${L('Reinertrag Solar / Jahr',eur(R.pvRein))}${L('× Barwertfaktor',num2(R.pvVf))}${L('Ertragsbarwert (separates Szenario)',eur(window._MODELL_DETAIL?.pvPotential||0))}<tr class="total"><td>Zusätzlich verwendeter Marktansatz</td><td>${eur(R.pvWert)}</td></tr></table>`:''}
   ${mspBlock}
   ${w ? (vglRows?'<h2>Vergleichsobjekte</h2><table>'+vglRows+'<tr class="total"><td>Durchschnitt</td><td>'+$('o_vgl_avg').textContent+'</td></tr></table>':'') : vergleichBlock}
   ${$('niess_aktiv').checked?`<h2>${R.niArt==='leibrente'?'Leibrente':R.niArt==='wohnrecht'?'Wohnungsrecht':'Nießbrauch'}</h2><table>${L(R.niArt==='leibrente'?'Jahresrente':'Reinertrag Berechtigter',eur(R.niRein))}${L('× Kapitalwert lebensl. Nutzung',num2(R.kw))}${XL('xni',2)}<tr class="total"><td>Wert des Rechts (Belastung)</td><td>${eur(R.niessWert)}</td></tr></table>`:''}
   ${erbbauBlock}
   ${wkBlock}
   ${pqBericht(esc)}
   ${modellBericht(esc)}
   <h2>Preisempfehlung</h2>
   <table>
    ${L('Preis nach '+verfahren1,eur(R.substanz))}
    ${L('Preis nach Gebäudeertrag',eur(R.ertrag))}
    ${R.vwAktiv?L('Preis nach Vergleichswert (Gewichtung '+num2(R.gv*100)+' %)',eur(R.vergleichWert)):''}
    ${L('Gewichteter Mittelwert',eur(R.mittel))}
    ${$('pv_aktiv').checked?L('+ Zusätzlicher PV-Marktansatz',eur(R.pvWert)):''}
    ${$('en_aktiv').checked&&R.energieWert!==0?L((R.energieWert>0?'+ ':'− ')+'Energetische Qualität',eur(Math.abs(R.energieWert))):''}
    ${niessRow}
    ${R.ebAktiv?L('− Korrektur Erbbaurecht',eur(R.erbbauAbzug)):''}
    ${R.wkSumme?L('− Wertkorrekturen § 8 Abs. 3',eur(R.wkSumme)):''}
    ${XL('xemp',2)}
    <tr class="total"><td>Empfohlener Preisansatz</td><td>${empfText(R.empfehlung)}</td></tr>
    ${L('Verhandlungsspanne',eur(R.empfehlung*(1-R.vh))+' – '+eur(R.empfehlung*(1+R.vh)))}
   </table>
   ${szBlock}
   ${plausiBlock}
   ${renditeBlock}
   ${ivBericht(esc)}
   ${diagrammBlock}
   ${grBlock}
   ${fotoBlock}
   ${kartenBlock}
   <p class="disc">Die rechnerische Preisermittlung ist kein Verkehrswertgutachten und dient lediglich zur Orientierung
   am aktuellen Immobilienmarkt. Für die Richtigkeit und Vollständigkeit der gemachten Angaben wird keine Haftung
   übernommen. Prüfungen der Bausubstanz sowie bau- bzw. gewerberechtlicher Belange wurden nicht vorgenommen.</p>
   ${signBlock}`;

  rpFiltern($('report'));   // abgewählte Abschnitte entfernen, bevor nummeriert wird
  // Abschnitte nummerieren & Inhaltsverzeichnis füllen
  let toc=$('report_toc');
  let h2s=[...$('report').querySelectorAll('h2')];
  h2s.forEach((h,i)=>{h.textContent=(i+1)+'.  '+h.textContent;});
  if(toc){
    toc.innerHTML = h2s.length
      ? h2s.map(h=>`<div>${esc(h.textContent)}</div>`).join('')
      : '<div style="color:#777">Keine Abschnitte vorhanden.</div>';
  }
  document.body.classList.add('report-mode');window.scrollTo(0,0);
  berichtUmbrueche($('report'));   /* nach dem Einblenden: braucht die Höhen der Blöcke */
}
