/* ---------- MAIN ---------- */
/* ---------- compute(): Eingaben lesen → Rechenkern (js/kern.js) → Anzeige ----------------------------
   Die Rechnung selbst steht in ImmoKern.bewerte() und greift nicht auf die Seite zu. Hier bleiben nur das
   Lesen der Felder, die Anzeige und das Speichern. */
/* als Funktion: compute() läuft beim Start, bevor spätere const-Zeilen ausgeführt sind */
function eingabeLeser(){ return {n:num, v:id=>{ let el=$(id); return el?el.value:''; }, an:id=>{ let el=$(id); return !!(el&&el.checked); }}; }
/* Alter nach § 4 Abs. 1 ImmoWertV: Kalenderjahr des Wertermittlungsstichtags minus Baujahr.
   Ohne Stichtag gilt das laufende Jahr (wie bisher). */
function bewertungsJahr(){
  let s=(($('ek_stichtag')||{}).value||'').trim(), j=parseInt(s.slice(0,4),10);
  return (j>1800&&j<2200)?j:new Date().getFullYear();
}
function compute(){
  raumlisteSync();   /* zuerst: füllt ggf. die Wohnfläche, die alles Weitere liest */
  const e=eingabeLeser(), pl=ImmoKern.protokollLeser(e);
  const {R,D}=ImmoKern.bewerte(pl.leser,{jahr:bewertungsJahr(),szen:SZEN,enManuell:!!$('en_klasse').dataset.manuell});
  const P=ImmoKern.pruefen(e,R,D,pl.gelesen);
  anzeigen(R,D);
  pruefStatusAnzeigen(P);
  window._R=R; window._MODELL_DETAIL=D; window._PRUEF=P;window._BW=ImmoKern.pruefeBeleihung(e,R,D);modellStatusAnzeigen(window._BW);
  try{ exStatus(); }catch(e){}
  try{ pqRender(); }catch(e){}
  try{ sanRechnen(); }catch(e){}
  try{ ivRechnen(); }catch(e){}
  try{ lageAnzeige(); }catch(e){}
  try{ vpStatus(); }catch(e){}
  try{ kkStatus(); }catch(e){}
  try{ vmRender(); if($('vm_n_datum')&&!$('vm_n_datum').value) $('vm_n_datum').value=aufHeute(); }catch(e){}
  /* Seitenleiste und Handyleiste auch nach Vorlagenwechsel, Import und Selbsttest nachziehen
     (vorher nur bei Tastatur-/Auswahlereignissen — sie zeigten dann einen veralteten Wert) */
  if(!SILENT) try{ cockpitUpdate(); }catch(e){}
  autosave();
}
function anzeigen(R,D){
  let istWohnung=D.istWohnung;
  setT('e_baujahr', num('ek_baujahr'));
  // BGF
  D.bgfHG.geschosse.forEach((f,i)=>setT('bgfhg_f'+i,num2(f))); setT('o_bgf_hg',num2(R.bgfHG));
  $('anbau_body').style.opacity=D.anbauAktiv?1:.4;
  if(D.bgfAN){ D.bgfAN.geschosse.forEach((f,i)=>setT('bgfan_f'+i,num2(f))); setT('o_bgf_an',num2(R.bgfAN)); }
  // NHK und Restnutzungsdauer
  setT('o_modpunkte',num2(R.modPunkte)+' Punkte');
  setT('o_mod_alter', D.alterHG+' J / '+num2(D.gndHG)+' J');
  nhkAnzeigen('nhkhg',D.nhkHG,R.hg);
  if(D.nhkAN) nhkAnzeigen('nhkan',D.nhkAN,R.an);
  setT('o_mod_rnd', num2(R.rndModHG)+' Jahre'+(num('nhkhg_rnd')>0?' (manuell)':''));
  setT('e_bgf_hg',num2(R.bgfHG));setT('e_preis_hg',num2(R.hg.preis));
  setT('e_bgf_an',num2(R.bgfAN));setT('e_preis_an',num2(R.an.preis));
  // 5.1 / 5.2
  setT('o_hg_geb',eur(D.hgGeb));setT('o_hg_vorMA',eur(R.hgVor));
  setT('o_an_geb',eur(D.anGeb));setT('o_an_vorMA',eur(R.anVor));
  // Vergleichswert
  D.vergleich.zeilen.forEach((m2,i)=>setT('vgl_m2'+i, m2>0?num2(m2)+' €':'–'));
  setT('o_vgl_avg', D.vergleich.avg>0?num2(D.vergleich.avg)+' €/m² ('+D.vergleich.anz+' Objekte)':'–');
  setT('o_msp_avg', R.mspData.avg>0?num2(R.mspData.avg)+' €/m² ('+R.mspData.zeilen.length+' Quellen)':'–');
  setT('e_wf',num2(D.wfl));setT('o_vw_geb',eur(D.vwGeb));setT('o_vergleich',eur(R.vergleichWert));
  { const hv=$('h_vergleich'), t=istWohnung?'Preisansatz nach Vergleichswert (Wohnung)':'Preisansatz nach Vergleichswert (optional)', ti=hv&&hv.querySelector('.app-sec-titel');
    if(ti){ if(ti.textContent!==t) ti.textContent=t; } else if(hv&&!hv.querySelector('.step')) hv.textContent=(istWohnung?'⑤ ':'⑤b ')+t; }
  setT('vw_hinweis', istWohnung
    ? 'Beim Wohnungs-Vordruck ersetzt der Vergleichswert den Substanzwert (§§ 24–26 ImmoWertV — für ETW das Standardverfahren). Der Bodenwert ist im Vergleichspreis bereits enthalten.'
    : (R.vwAktiv?'Der Vergleichswert wird mit der unten gewählten Gewichtung in die Preisempfehlung einbezogen. Der Bodenwert ist im Vergleichspreis bereits enthalten.'
             :'Aktuell nur informativ. Zum Einbeziehen oben ankreuzen und unter „Preisempfehlung“ die Gewichtung setzen.'));
  // PV
  $('pv_body').style.opacity=D.pvAktiv?1:.4;
  setT('o_pv_roh',eur(D.pvRoh));setT('o_pv_bewirt','− '+eur(D.pvBew));setT('o_pv_rein',eur(R.pvRein));
  setT('o_pv_vf','('+num2(R.pvVf)+' bei '+num2(num('pv_rnd'))+' J / '+num2(num('pv_zins'))+' %)');
  setT('o_pv_bw',num2(R.pvVf));setT('o_pv',eur(R.pvWert));
  setT('o_sub_boden',eur(R.bodenwert));setT('o_sub_hg',eur(R.hgVor));setT('o_sub_an',eur(R.anVor));
  setT('o_sub_vorlauf',eur(R.vorlauf));setT('o_sub_faktor','× '+num2(R.mf));
  setT('o_sub_nachMA',eur(R.nachMA));setT('o_substanz',eur(R.substanz));
  // 6 Ertrag
  $('mietrolle_body').style.display=R.mietrolleAktiv?'':'none';
  D.mietrolle.zeilen.forEach((pa,i)=>setT('mr_pa'+i,eur(pa))); setT('o_mr_summe',eur(R.mrSumme));
  setT('o_er_rohsrc', R.mietrolleAktiv?'(aus Mietrolle)':'(Wohnen + Gewerbe + Stellplätze aus den Allgemeinen Angaben)');
  $('bw_pausch').style.display=R.bwDetail?'none':'';
  $('bw_detail').style.display=R.bwDetail?'':'none';
  let q=D.bwQuelle, bwInfo;
  if(q.art==='detail'){
    bwInfo='(§ 32: Verw. '+eur(q.verw)+' + Inst. '+eur(q.inst)+' + Mietausf. '+eur(q.mausf)+(q.nuk?' + n.uml. '+eur(q.nuk):'')+')';
    setT('o_bw_basis','WE '+num2(R.anzWE)+' · Stellpl. '+num2(R.anzSP)+' · Wohnfl. '+num2(num('ek_wohnflaeche'))+' m²');
  } else if(q.art==='hausgeld') bwInfo='(aus nicht-umlagef. Hausgeld)';
  else bwInfo='('+num2(q.pct)+' % pauschal)';
  setT('o_er_roh',eur(R.roh));setT('o_er_bewirt','− '+eur(R.bewirt));setT('o_er_bwinfo',bwInfo);setT('o_er_gew','− '+eur(D.gew));
  setT('o_er_grund',eur(R.grundRein));setT('o_er_zinsp',num2(R.effLZ)+' % aus '+eur(R.bodenwert));
  setT('o_er_bodenz','− '+eur(D.bodenZins));setT('o_er_gebrein',eur(R.gebRein));
  setT('o_er_vf','('+num2(R.vf)+' bei '+num2(R.erRND)+' J)');setT('o_er_gebwert',eur(R.gebWert));
  // Mietertrag je Gebäude (D33): Anteil des Anbaus, je Gebäude eigener Vervielfältiger
  $('er_anbau_box').style.display=(!D.istWohnung&&D.anbauAktiv)?'':'none';
  let eg=R.erGeb, proz=x=>(x*100).toLocaleString('de-DE',{maximumFractionDigits:1})+' %';
  $('er_geb_zeilen').style.display=eg?'':'none';
  if(eg){
    setT('o_er_vf','('+num2(R.vf)+', nach Miete gewichtet)');
    setT('o_er_hg_info','('+proz(eg.anteilHG)+' der Miete: '+eur(eg.gebReinHG)+' × '+num2(eg.vfHG)+' bei '+num2(eg.rndHG)+' J)'); setT('o_er_hg_wert',eur(eg.gebWertHG));
    setT('o_er_an_info','('+proz(eg.anteilAN)+' der Miete: '+eur(eg.gebReinAN)+' × '+num2(eg.vfAN)+' bei '+num2(eg.rndAN)+' J)'); setT('o_er_an_wert',eur(eg.gebWertAN));
  }
  setT('o_er_boden',eur(R.bodenwert));setT('o_ertrag',eur(R.ertrag));
  // 7 Nießbrauch / Wohnrecht / Leibrente
  $('niess_body').style.opacity=D.niessAktiv?1:.4;
  let istRente=D.istRente, istWohnrecht=D.istWohnrecht;
  $('fld_ni_rente').style.display=istRente?'':'none';
  ['row_ni_miete','row_ni_gr','row_ni_nuk'].forEach(id=>{$(id).style.display=istRente?'none':'';});
  $('row_ni_gr').style.display=(istRente||istWohnrecht)?'none':'';   // Wohnrecht: Grundsteuer bleibt beim Eigentümer
  setT('lbl_ni_miete', istWohnrecht?'Jahresmietwert der Wohnung':'Mietertrag / Jahr');
  setT('lbl_ni_rein', istRente?'Jahresrente':'Reinertrag Berechtigter / Jahr');
  setT('lbl_ni_summe','Wert des '+(istRente?'Rentenrechts':istWohnrecht?'Wohnungsrechts':'Nießbrauchsrechts')+' (Belastung)');
  setT('ni_hinweis', (istRente
      ? 'Leibrente: Jahresrente × Kapitalwert der lebenslänglichen Leistung.'
      : istWohnrecht
      ? 'Wohnungsrecht (§ 1093 BGB): Angesetzt wird der Jahresmietwert der überlassenen Fläche abzüglich der vom Berechtigten getragenen Kosten. Grundsteuer und Instandhaltung verbleiben regelmäßig beim Eigentümer und werden daher nicht abgezogen.'
      : 'Nießbrauch (§ 1030 BGB): Der Berechtigte zieht die Nutzungen und trägt die gewöhnlichen Lasten — Grundsteuer und nicht umlagefähige Kosten werden abgezogen.')
    +' Der Wert wird in der Preisempfehlung als Belastung abgezogen (§§ 46–47 ImmoWertV). '+(D.niKwArt==='leibrente'?'Kapitalisiert mit dem Leibrentenbarwertfaktor nach der amtlichen Sterbetafel '+D.sterbetafel+' (Statistisches Bundesamt), monatlich vorschüssig.':D.niKwArt==='zeitrente'?'Kapitalisiert als Zeitrente über die eigene Laufzeit — Quelle der Laufzeit belegen.':'Kapitalisierungsfaktor laut eigener Angabe — Quelle belegen.'));
  setT('o_ni_miete',eur(D.niMiete));setT('o_ni_gr','− '+eur(D.niGr));setT('o_ni_nuk','− '+eur(D.niNuk));
  setT('o_ni_rein',eur(R.niRein));setT('o_ni_kw',num2(R.kw));
  setT('o_ni_kwinfo', !D.niessAktiv?'':D.niKwArt==='leibrente'&&!(D.leben>0)?'(Sterbetafel: Alter der berechtigten Person fehlt)':D.niKwArt==='leibrente'?'(Leibrente, Sterbetafel '+D.sterbetafel+'; fernere Lebenserwartung '+num2(D.leben)+' J)':D.niKwArt==='zeitrente'?'(Zeitrente über '+num2(D.leben)+' J)':'(eingetragen)');
  setT('o_niess',eur(R.niessWert));
  // 7c Erbbaurecht
  $('eb_body').style.opacity=R.ebAktiv?1:.4;
  setT('o_eb_boden',eur(R.bodenwert));
  setT('o_eb_vpct','('+num2(R.ebVpct)+' % aus Bodenwert)');
  setT('o_eb_vz',eur(R.ebVz));setT('o_eb_zins','− '+eur(R.ebZins));
  setT('o_eb_vorteil',eur(R.ebVorteil));
  setT('o_eb_vf','('+num2(R.ebVf)+' bei '+num2(num('eb_restlaufzeit'))+' J)');
  setT('o_eb_barwert',eur(R.ebBarwert));
  setT('o_eb_absch','− '+eur(D.ebAbsch));
  setT('o_erbbau',eur(R.erbbauAbzug));
  // 7d Wertkorrekturen § 8 Abs. 3
  renderWKRows();
  setT('o_wk_summe',R.wkSumme>0?'− '+eur(R.wkSumme):R.wkSumme<0?'+ '+eur(-R.wkSumme):eur(0));
  // Energetische Qualität
  $('en_body').style.opacity=R.enAktiv?1:.4;
  if(R.enKennwert>0 && !$('en_klasse').dataset.manuell) $('en_klasse').value=D.enKlasse;
  let enRef=D.enRefKlasse, enStufen=R.enStufen;
  setT('o_en_stufen', enStufen===0?'entspricht dem Normalzustand ('+enRef+')'
      : (enStufen>0? enStufen+' Klasse'+(enStufen>1?'n':'')+' schlechter als '+enRef
                   : Math.abs(enStufen)+' Klasse'+(Math.abs(enStufen)>1?'n':'')+' besser als '+enRef));
  setT('o_en_kwh',num2(R.enMehrKwh)+' kWh/Jahr');
  setT('o_en_jahr',eur(R.enMehrJahr));
  setT('o_en_vf',num2(R.enVf));
  setT('o_en_vf_txt','('+num2(num('en_jahre'))+' J / '+num2(num('en_zins'))+' %)');
  setT('o_en_pct',(R.enPct>0?'+':'')+num2(R.enPct)+' %');
  let enW=R.energieWert;
  setT('o_energie',(enW>0?'+ ':enW<0?'− ':'')+eur(Math.abs(enW)));
  document.querySelectorAll('.en-markt').forEach(el=>el.style.display=R.enModus==='markt'?'':'none');
  document.querySelectorAll('.en-kosten').forEach(el=>el.style.display=R.enModus==='kosten'?'':'none');
  $('row_e_energie').style.display=R.enAktiv&&enW!==0?'':'none';
  setT('o_e_energie',(enW>0?'+ ':enW<0?'− ':'')+eur(Math.abs(enW)));
  // 8 Empfehlung
  $('row_e_vgl').style.display=R.vwAktiv?'':'none';
  $('row_e_erbbau').style.display=R.ebAktiv?'':'none';
  $('row_e_wk').style.display=R.wkSumme!==0?'':'none';
  $('fld_gew_vergleich').style.display=R.vwAktiv?'':'none';
  setT('o_e_vgl',num2(R.gv*100)+' % · '+eur(R.vergleichWert));
  setT('o_e_erbbau','− '+eur(R.erbbauAbzug));
  setT('o_e_wk',R.wkSumme<0?'+ '+eur(-R.wkSumme):'− '+eur(R.wkSumme));
  $('row_e_pv').style.display=D.pvAktiv?'':'none';
  setT('o_e_sub',eur(R.substanz));setT('o_e_er',eur(R.ertrag));setT('o_e_mittel',eur(R.mittel));
  setT('o_e_pv','+ '+eur(R.pvWert));
  setT('o_e_niess','− '+eur(R.niessWert));setT('o_empfehlung',eur(R.empfehlung));
  // Beleihungswert nach BelWertV
  let bwAktiv=R.bwAktiv;
  $('bw_body').style.opacity=bwAktiv?1:.4;   /* wie PV: ausgeschaltete Abschnitte gedimmt */
  setT('o_bw_zins_regel','(mind. '+(D.bwWohnen?3:4)+' Prozentpunkte über der Bundesanleihe, Bandbreite '+num2(D.bwSpanneMin)+'–'+num2(D.bwSpanneMax)+' %)');
  setT('o_bw_zins_min',num2(R.bwZinsMin)+' %');
  $('bw_zins_warn').style.display=(bwAktiv&&!D.bwZinsOk)?'':'none';
  $('bw_zins_warn').textContent='Der eingegebene Kapitalisierungszins von '+num2(D.bwZinsBeantragt)+' % liegt unter dem Mindestsatz von '
    +num2(R.bwZinsMin)+' % nach § 12 Abs. 4 BelWertV. Eine Unterschreitung ist nur bei erstklassigen Immobilien und nur um bis zu 0,5 Prozentpunkte zulässig (§ 12 Abs. 5) und muss begründet werden.';
  setT('o_bw_roh',eur(R.bwRoh));
  setT('o_bw_bewirt','− '+eur(R.bwBewirt)); setT('o_bw_bewirt_p','('+num2(D.bwBewirtP)+' %, mind. 15 % nach § 11 Abs. 2)');
  setT('o_bw_rein',eur(R.bwRein));
  setT('o_bw_bodenzins','− '+eur(D.bwBodenZins)); setT('o_bw_bodenzins_p','('+eur(D.bwBoden)+' × '+num2(R.bwZins)+' %)');
  setT('o_bw_gebrein',eur(R.bwGebRein));
  setT('o_bw_vf',num2(R.bwVf)); setT('o_bw_vf_txt','('+num2(R.bwRnd)+' J'+(num('bw_rnd')>D.bwRndMax?' — auf Höchstwert der Anlage 2 gekürzt':'')+' / '+num2(R.bwZins)+' %)');
  setT('o_bw_boden',eur(D.bwBoden)); setT('o_bw_boden2',eur(D.bwBoden));
  setT('o_bw_ertrag',eur(R.bwErtrag));
  setT('o_bw_hw',eur(R.bwHerstell));
  setT('o_bw_sicherbetrag','− '+eur(R.bwSicherBetrag)); setT('o_bw_sicher_p','('+num2(R.bwSicherP)+' %)');
  setT('o_bw_sachwert',eur(R.bwSachwert));
  $('bw_sicher_warn').style.display=(bwAktiv&&R.bwSicherP<10&&R.bwHerstell>0)?'':'none';
  $('bw_sicher_warn').textContent='Der Sicherheitsabschlag von '+num2(R.bwSicherP)+' % unterschreitet den Mindestabschlag von 10 % nach § 16 Abs. 2 BelWertV.';
  setT('o_bw_vgl_sicherbetrag','− '+eur(R.bwVglSicherBetrag)); setT('o_bw_vgl_sicher_p','('+num2(R.bwVglSicherP)+' %, mind. 10 % nach § 19 Abs. 1)');
  setT('o_bw_vergleich',eur(R.bwVergleich));
  setT('o_bw_e_ertrag',eur(R.bwErtrag)); setT('o_bw_e_sach',eur(R.bwSachwert)); setT('o_bw_e_vgl',eur(R.bwVergleich));
  setT('o_bw_ausgang',eur(R.bwAusgang)); setT('o_bw_ansatz_txt',D.bwAnsatzTxt);
  setT('o_bw_abschlag_betrag','− '+eur(R.bwAbschlagBetrag)); setT('o_bw_abschlag_p',R.bwAbschlagP>0?'('+num2(R.bwAbschlagP)+' %)':'');
  setT('o_beleihungswert',eur(R.beleihungswert));
  setT('o_bw_quote', (R.beleihungswert>0&&R.empfehlung>0) ? num2(R.beleihungswert/R.empfehlung*100)+' % der Preisempfehlung' : '–');
  let bwHin=[], bwAnsatz=R.bwAnsatz;
  if(bwAktiv){
    if(bwAnsatz==='min'&&R.bwErtrag>0&&R.bwSachwert>0&&R.bwSachwert<R.bwErtrag)
      bwHin.push('Der Sachwert liegt unter dem Ertragswert und ist damit maßgeblich. Nach § 4 Abs. 1 darf der Ertragswert ohnehin nicht überschritten werden.');
    if(bwAnsatz==='sach'||bwAnsatz==='vergleich')
      bwHin.push((bwAnsatz==='sach'?'Sachwertorientierung':'Vergleichswertorientierung')+' nach § 4 Abs. 2 ist nur zulässig, wenn das Objekt nach Objekt- und Standortqualität zweifelsfrei zur Eigennutzung geeignet ist — im Bericht festhalten.');
    if(bwAnsatz==='ertrag'&&R.bwKontroll==='vergleich'&&R.bwVergleich>0&&R.bwErtrag>0&&R.bwVergleich<R.bwErtrag*.8)
      bwHin.push('Der Vergleichswert liegt mehr als 20 % unter dem Ertragswert — die Nachhaltigkeit der Erträge und ihrer Kapitalisierung ist besonders zu prüfen (§ 4 Abs. 1).');
    if(R.beleihungswert>0&&R.empfehlung>0&&R.beleihungswert>R.empfehlung)
      bwHin.push('Der Beleihungswert liegt über der Preisempfehlung. Das widerspricht dem nachhaltigen Wertbegriff des § 3 BelWertV und ist zu prüfen.');
    if(R.beleihungswert>0&&R.beleihungswert<=600000)
      bwHin.push('Bei einem abzusichernden Darlehensbetrag bis 600.000 € einschließlich aller Vorlasten ist das Kleindarlehensverfahren nach § 24 BelWertV zulässig.');
    if(R.bwRoh>0&&R.bwGebRein<0)
      bwHin.push('Der Gebäudereinertrag ist negativ: die Bodenwertverzinsung von '+eur(D.bwBodenZins)+' übersteigt den Reinertrag von '+eur(R.bwRein)+'. Der Ertragswert entspricht dann rechnerisch dem Bodenwert. Bitte Mietansatz, Kapitalisierungszins und Bodenwert prüfen.');
    if(R.bwRoh<=0&&R.bwHerstell<=0)
      bwHin.push('Noch keine Werte erfasst — „Werte übernehmen" holt Rohertrag, Herstellungswert, Bodenwert und Restnutzungsdauer aus der Bewertung.');
  }
  $('bw_hinweise').innerHTML=bwHin.map(t=>'<div style="margin:4px 0">'+t+'</div>').join('');
  $('bw_hinweise').style.display=bwHin.length?'':'none';
  setT('o_spanne',eur(R.empfehlung*(1-R.vh))+'  –  '+eur(R.empfehlung*(1+R.vh)));
  // Miete-Plausibilität
  let wf=num('ek_wohnflaeche');
  setT('miete_plausi', wf>0 && D.mieteW>0 ? 'Wohnmiete ≈ '+num2(D.mieteW/12/wf)+' €/m²·Monat' : 'Wohnfläche & Miete Wohnen eintragen für €/m²-Plausibilität.');
  // Unterlagen-Status
  let ul=unterlagenStatus();
  setT('o_unterlagen_fehlt', ul.da.length===0
    ? 'Noch keine Unterlagen angehakt.'
    : (ul.fehlt.length===0 ? '✓ Alle Unterlagen liegen vor.'
       : ul.da.length+' von '+AU_UNTERLAGEN.length+' vorhanden · offen: '+ul.fehlt.join(', ')));
  // 9.1 Plausibilisierung
  setT('o_pl_eigen', R.eigenM2>0 ? num2(R.eigenM2)+' €/m²' : '–');
  setT('o_pl_markt', R.marktM2>0 ? num2(R.marktM2)+' €/m²' : '–');
  setT('o_pl_abw', R.plAbw===null ? '–' : (R.plAbw>0?'+':'')+num2(R.plAbw)+' %');
  setT('o_pl_text', R.plTxt);
  // 9b Rendite & Investitionskosten
  setT('o_re_kp',eur(R.reKP));
  setT('o_re_nkpct','('+num2(R.nkPct)+' % vom Kaufpreis)');
  setT('o_re_nk',eur(R.reNK));setT('o_re_san',eur(R.reSan));setT('o_re_invest',eur(R.reInvest));
  setT('o_re_roh',eur(R.roh));setT('o_re_rein',eur(R.reRein));
  setT('o_re_brutto', R.roh>0?num2(R.reBrutto)+' %':'–');
  setT('o_re_netto',  R.roh>0?num2(R.reNetto)+' %':'–');
  setT('o_re_faktor', R.roh>0?num2(R.reFaktor)+'-fach':'–');
  setT('o_re_hinweis', R.roh>0
    ? 'Bei '+eur(R.reKP)+' Kaufpreis und '+eur(R.roh)+' Jahresrohertrag ergibt sich das '+num2(R.reFaktor)+'-fache der Jahresmiete. Kaufnebenkosten '+num2(R.nkPct)+' % = '+eur(R.reNK)+'.'
    : 'Mieterträge in ① bzw. der Mietrolle eintragen, damit die Renditen berechnet werden.');
  // Seitenleiste
  setT('r_empfehlung',eur(R.empfehlung));setT('r_sub',eur(R.substanz));setT('r_er',eur(R.ertrag));
  setT('r_mittel',eur(R.mittel));setT('r_niess',eur(R.niessWert));setT('r_boden',eur(R.bodenwert));
}
/* Ergebnis der Eingabeprüfung: ohne gültige und vollständige Eingaben keine Preisempfehlung anzeigen */
function pruefStatusAnzeigen(P){
  let ok=P.status==='ok';
  if(!ok){ setT('o_empfehlung','–'); setT('r_empfehlung','–'); setT('o_spanne','–'); }
  let t=ok?'':pruefStatusText(P);
  ['cp_status','o_empf_status'].forEach(id=>{ let el=$(id); if(!el) return; el.textContent=t; el.hidden=ok; el.classList.toggle('fehler',P.status==='fehler'); });
}
function pruefStatusText(P){
  if(P.status==='fehler') return 'Keine belastbare Preisempfehlung: '+P.fehler+' ungültige Eingabe'+(P.fehler>1?'n':'')+' — siehe Prüfhinweise.';
  if(P.status==='unvollstaendig') return 'Noch keine Preisempfehlung: '+P.fehlend.map(f=>f.text.split(' — ')[0].replace(/\.$/,'')).join(' · ')+'.';
  return '';
}
/* Feldbezeichnung für Hinweise: Label ohne Einheit, in Tabellen Zeile · Spalte */
function feldName(id){
  let e=$(id); if(!e) return id;
  let f=e.closest('.field');
  if(f){ let l=f.querySelector('label'); if(l){ let c=l.cloneNode(true); c.querySelectorAll('.u,.unit').forEach(x=>x.remove()); let t=c.textContent.replace(/\s+/g,' ').trim(); if(t) return t; } }
  let td=e.closest('td'), tr=e.closest('tr'), tb=e.closest('table');
  if(td&&tr&&tb){
    let zeile=tr.cells[0]&&tr.cells[0]!==td?tr.cells[0].textContent.replace(/\s+/g,' ').trim():'';
    let kopf=tb.tHead&&tb.tHead.rows.length?tb.tHead.rows[tb.tHead.rows.length-1].cells[td.cellIndex]:null;
    let t=[zeile,kopf?kopf.textContent.replace(/\s+/g,' ').trim():''].filter(Boolean).join(' · ');
    if(t) return t;
  }
  let l=document.querySelector('label[for="'+id+'"]'); if(l) return l.textContent.replace(/\s+/g,' ').trim();
  return id;
}
function nhkAnzeigen(prefix,d,erg){
  d.k.forEach((w,i)=>{ let f=$(prefix+'_f'+i), z=$(prefix+'_z'+i), fehlt=!!(f&&f.checked);
    setT(prefix+'_k'+i,fehlt?'0,00 (fehlt)':num2(w)); if(z) z.classList.toggle('nhk-fehlt',fehlt); });
  setT(prefix+'_nhk',num2(d.nhk)+' €/m²');
  setT(prefix+'_nhkheute',num2(d.nhkHeute)+' €/m²');
  setT(prefix+'_wmlbl','Alterswertminderung bei RND '+num2(erg.rnd)+' Jahre');
  setT(prefix+'_wm',num2(d.wm*100)+' %');
  setT(prefix+'_preis',num2(erg.preis)+' €/m²');
}
