/* Fachliche Regeln ohne DOM. Nachweise sind dokumentierte Angaben des Anwenders, keine Zertifizierung. */
(function(root){'use strict';
const text=(e,id)=>String(e.v(id)||'').trim();
const has=(e,id)=>text(e,id).length>=3;
const present=(e,id)=>text(e,id)!=='';
function barwert(z,n){if(!(n>0))return 0;const p=z/100;return p>0?-Math.expm1(-n*Math.log1p(p))/p:n;}
function beleihung(e){
 const aktiv=e.an('bw_aktiv'),art=e.v('bw_nutzart')||(e.v('bw_nutzung')==='wohnen'?'wohnen':'buero'),wohnen=art==='wohnen';
 const aufschlag=art==='produktion'?1:['spezial','lager','logistik'].includes(art)?.5:0;
 const minBase=wohnen?3.5:4.5,maxBase=wohnen?5.5:6.5;
 const modellMin=Math.min(Math.max(e.n('bw_bund')+(wohnen?3:4),minBase),maxBase);
 const offiziell=e.n('bw_min_offiziell');
 const basis=offiziell>0?Math.max(offiziell,minBase):modellMin;
 const bwZinsMin=basis+aufschlag;
 const premium=e.an('bw_erstklassig')&&['wohnen','handel','buero','lager','logistik'].includes(art)&&has(e,'bw_erstklassig_grund');
 const erlaubterZins=bwZinsMin-(premium?.5:0),beantragt=e.n('bw_zins');
 const bwZins=Math.max(beantragt,erlaubterZins);
 const bwRndMax=e.n('bw_objektart')||80,bwRnd=Math.min(Math.max(e.n('bw_rnd'),0),bwRndMax);
 const rentiert=e.v('bw_vermietet')==='ja',vertragsmiete=e.n('bw_vertragsmiete'),rohAntrag=e.n('bw_roh');
 const bwRoh=rentiert&&vertragsmiete>0&&!has(e,'bw_miete_ausnahme')?Math.min(rohAntrag,vertragsmiete):rohAntrag;
 const neu=e.n('bw_neubau'),instSatz=Math.max(e.n('bw_inst_satz')||.5,wohnen?.5:['produktion','lager','logistik'].includes(art)?.8:.4),modSatz=e.n('bw_modern_satz');
 const verwMin=wohnen?Math.max(e.n('ek_anz_we'),1)*e.n('bw_verw_satz')+Math.max(e.n('bw_verw_sp_anz'),0)*Math.max(e.n('bw_verw_sp_satz'),0):bwRoh*.01;
 const verw=Math.max(e.n('bw_verw'),verwMin),inst=Math.max(e.n('bw_inst'),neu*instSatz/100),ausfall=Math.max(e.n('bw_ausfall'),bwRoh*(wohnen?.02:.04));
 const einzel=verw+inst+ausfall,nuk=e.n('bw_nuk'),modern=Math.max(e.n('bw_modern'),neu*modSatz/100);
 const pct=Math.max(e.n('bw_bewirt'),15);
 const bwBewirt=Math.max(bwRoh*pct/100,einzel)+nuk+modern;
 const effektivKosten=Math.max(bwBewirt,e.n('bw_kosten_gesamt'));
 const bwBewirtP=bwRoh>0?effektivKosten/bwRoh*100:15,bwRein=bwRoh-effektivKosten;
 const bwBoden=e.n('bw_bodenwert'),bwBodenZins=bwBoden*bwZins/100,bwGebRein=bwRein-bwBodenZins,bwVf=barwert(bwZins,bwRnd);
 const freilegung=Math.max(e.n('bw_freilegung'),0),abbruch=Math.max(e.n('bw_abbruch'),0)/Math.pow(1+bwZins/100,freilegung);
 let bwErtrag=0,sonderfall='';
 if(bwRoh>0){
  if(bwGebRein<=0){bwErtrag=Math.max(bwBoden-e.n('bw_abbruch'),0)/Math.pow(1+bwZins/100,freilegung);sonderfall='boden';}
  else if(bwRnd>0&&bwRnd<30){
   if(e.v('bw_kurzverfahren')==='abbruch'){bwErtrag=Math.max(bwGebRein*bwVf+bwBoden-abbruch,0);sonderfall='abbruch';}
   else {bwErtrag=Math.max(bwRein*bwVf,0);sonderfall='gesamt';}
  }else if(bwRnd>0)bwErtrag=bwGebRein*bwVf+bwBoden;
 }
 const herstell=e.n('bw_herstell'),aussenAntrag=e.n('bw_aussen');
 const aussen=has(e,'bw_aussen_grund')?aussenAntrag:Math.min(aussenAntrag,Math.max(herstell,0)*.05);
 const bwHerstell=herstell+aussen,bwSicherP=Math.max(e.n('bw_sicher'),10),bwSicherBetrag=bwHerstell*bwSicherP/100;
 const bwSachwert=bwHerstell>0?Math.max(bwHerstell-bwSicherBetrag+bwBoden-(bwRnd<30?abbruch:0),0):0;
 const bwAnsatz=e.v('bw_ansatz')==='sach'?'sach':'ertrag';
 const bwAusgang=bwAnsatz==='sach'?bwSachwert:bwErtrag;
 const bwAbschlagP=Math.max(e.n('bw_besichtigung'),0)+Math.max(e.n('bw_abschlag'),0),bwAbschlagBetrag=bwAusgang*bwAbschlagP/100;
 const vermietAbzug=bwAnsatz==='sach'&&rentiert?Math.max(e.n('bw_vermiet_abzug'),0):0;
 const beleihungswert=aktiv?Math.max(bwAusgang-bwAbschlagBetrag-vermietAbzug,0):0;
 const korrekturen=[];
 if(beantragt<bwZins)korrekturen.push('Kapitalisierungszins: '+beantragt+' % angefragt, '+bwZins+' % Mindestansatz verwendet.');
 if(e.n('bw_bewirt')<15)korrekturen.push('Verwaltung/Instandhaltung/Mietausfall: Mindestansatz 15 % statt '+e.n('bw_bewirt')+' %.');
 if(e.n('bw_sicher')<10)korrekturen.push('Sicherheitsabschlag: mindestens 10 % statt '+e.n('bw_sicher')+' %.');
 if(aussen<aussenAntrag)korrekturen.push('Außenanlagen auf 5 % des Herstellungswerts begrenzt; höherer Ansatz nur mit Begründung.');
 if(bwRoh<rohAntrag)korrekturen.push('Nachhaltige Miete auf die erfasste Vertragsmiete begrenzt.');
 return {R:{bwAktiv:aktiv,bwErtrag,bwSachwert,bwAusgang,bwAbschlagP,bwAbschlagBetrag,bwZins,bwZinsMin,bwRnd,bwVf,bwRoh,bwBewirt:effektivKosten,bwRein,bwGebRein,bwHerstell,bwSicherP,bwSicherBetrag,bwAnsatz,beleihungswert},D:{bwWohnen:wohnen,bwSpanneMin:minBase,bwSpanneMax:maxBase,bwZinsOk:beantragt>=erlaubterZins,bwRndMax,bwBewirtP,bwBoden,bwBodenZins,bwAnsatzTxt:bwAnsatz==='sach'?'(Sachwertorientierung, Voraussetzungen prüfen)':'(Ertragswert — regulärer Ausgangswert)',bwSonderfall:sonderfall,bwAbbruchBarwert:abbruch,bwKosten:{verwaltung:verw,instandhaltung:inst,mietausfall:ausfall,modernisierung:modern,nuk},bwKorrekturen:korrekturen,bwPremium:premium,bwZinsBeantragt:beantragt,bwNutzart:art,bwVermietAbzug:vermietAbzug}};
}
function pruefeBeleihung(e,R,D){
 const fehlend=[],hinweise=[];const need=(id,txt)=>{if(!has(e,id))fehlend.push({feld:id,text:txt});};const fail=(id,txt)=>hinweise.push({feld:id,stufe:'fehler',text:txt});
 if(!e.an('bw_aktiv'))return {status:'inaktiv',fehlend,hinweise};
 if((e.v('bw_nutzung')==='wohnen')!==D.bwWohnen)fail('bw_nutzart','Allgemeine Nutzung und konkrete Nutzungsart widersprechen sich.');
 if(R.bwAnsatz==='ertrag'&&!(e.n('bw_roh')>0))fehlend.push({feld:'bw_roh',text:'Positiven nachhaltigen Jahresrohertrag erfassen.'});
 if(!(e.n('bw_herstell')>0))fehlend.push({feld:'bw_herstell',text:'Herstellungsansatz für Sachwert bzw. Kontrollbetrachtung fehlt.'});
 need('bw_grundlage','Quelle und Stichtag der nachhaltigen Ertrags-/Sachwertansätze fehlen.');need('bw_zins_quelle','Veröffentlichter Mindestkapitalisierungszins mit Jahr und Quelle fehlt.');
 if(!(e.n('bw_min_offiziell')>0))fehlend.push({feld:'bw_min_offiziell',text:'Veröffentlichten Mindestzins erfassen; der Modellrichtwert ist keine amtliche Jahresprüfung.'});
 need('bw_kosten_quelle','Einzelkosten und Modernisierungsrisiko anhand Anlage 1 belegen.');
 if(!(e.n('bw_neubau')>0))fehlend.push({feld:'bw_neubau',text:'Neubau-Herstellungskosten ohne Baunebenkosten/Außenanlagen für Mindestkosten fehlen.'});
 if(D.bwWohnen&&!(e.n('bw_verw_satz')>0))fehlend.push({feld:'bw_verw_satz',text:'Indexierten jährlichen Mindest-Verwaltungssatz je Einheit erfassen.'});
 if(D.bwWohnen&&e.n('bw_verw_sp_anz')>0&&!(e.n('bw_verw_sp_satz')>0))fehlend.push({feld:'bw_verw_sp_satz',text:'Indexierten Verwaltungssatz für Garage/Stellplatz erfassen.'});
 if(D.bwWohnen&&!present(e,'bw_verw_sp_anz'))fehlend.push({feld:'bw_verw_sp_anz',text:'Kostenrelevante Garagen/Tiefgaragenplätze angeben (0 ist möglich).'});
 if(![0,.2,.5,.75].includes(e.n('bw_modern_satz'))&&present(e,'bw_modern_satz'))fail('bw_modern_satz','Modernisierungs-Risikoklasse aus den vorgesehenen Ansätzen wählen.');
 if(!present(e,'bw_modern_satz'))fehlend.push({feld:'bw_modern_satz',text:'Objektspezifisches Modernisierungsrisiko wählen und belegen.'});
 if(!e.an('bw_nachweise_geprueft'))fehlend.push({feld:'bw_nachweise_geprueft',text:'Angemessenheit von Einzelkosten, Nutzungsart und Jahres-Mindestsatz ausdrücklich bestätigen.'});
 if(!present(e,'bw_vermietet'))fehlend.push({feld:'bw_vermietet',text:'Vermietungszustand angeben.'});
 if(e.v('bw_vermietet')==='ja'&&!(e.n('bw_vertragsmiete')>0))fehlend.push({feld:'bw_vertragsmiete',text:'Vertragliche Jahresmiete fehlt.'});
 if(e.an('bw_erstklassig')&&!D.bwPremium)fail('bw_erstklassig_grund','Die Zinsausnahme benötigt eine zulässige Nutzungsart und dokumentierte Kriterien.');
 if(D.bwSonderfall==='boden'){need('bw_abbruch_quelle','Freilegungskosten und Zeitpunkt für den Bodenwert-Sonderfall belegen.');if(!present(e,'bw_freilegung'))fehlend.push({feld:'bw_freilegung',text:'Zeit bis zur Freilegung erfassen, auch wenn sie 0 ist.'});}
 if(R.bwRnd<30&&R.bwRnd>0){
  if(!['gesamt','abbruch'].includes(e.v('bw_kurzverfahren')))fehlend.push({feld:'bw_kurzverfahren',text:'Verfahren für kurze Restnutzungsdauer wählen.'});
  need('bw_abbruch_quelle','Abbruchkosten/Zeitpunkt für die Sachwertkontrolle unter 30 Jahren belegen.');
  if(!present(e,'bw_abbruch')||!present(e,'bw_freilegung'))fehlend.push({feld:'bw_abbruch',text:'Freilegungskosten und Zeitpunkt erfassen; null nur mit Begründung.'});
 }
 if(R.bwAnsatz==='sach'){
  if(!e.an('bw_eigennutzung'))fehlend.push({feld:'bw_eigennutzung',text:'Dauerhafte Eigennutzungseignung für Sachwertorientierung bestätigen.'});
  need('bw_eigennutzung_grund','Eigennutzungseignung und nachhaltige Nachfrage begründen.');
  if(e.v('bw_vermietet')==='ja'&&(!has(e,'bw_mietabschlag_grund')||!present(e,'bw_vermiet_abzug')))fehlend.push({feld:'bw_mietabschlag_grund',text:'Wertminderung durch bestehende Vermietung nach § 4 Absatz 2 begründen und berücksichtigen.'});
 }
 if(R.bwAnsatz==='ertrag'&&R.bwErtrag>0&&R.bwSachwert<R.bwErtrag*.8){
  if(!e.an('bw_kontrolle'))fehlend.push({feld:'bw_kontrolle',text:'Sachwert liegt mehr als 20 % unter Ertragswert: Nachhaltigkeitskontrolle durchführen.'});
  need('bw_kontrolle_grund','Ergebnis der besonderen Nachhaltigkeitskontrolle begründen.');
 }
 const numberIds=['bw_verw_sp_anz','bw_besichtigung','bw_roh','bw_bewirt','bw_kosten_gesamt','bw_neubau','bw_verw_satz','bw_verw_sp_satz','bw_verw','bw_inst','bw_inst_satz','bw_ausfall','bw_modern','bw_modern_satz','bw_nuk','bw_min_offiziell','bw_zins','bw_rnd','bw_bodenwert','bw_herstell','bw_aussen','bw_sicher','bw_abbruch','bw_freilegung','bw_abschlag','bw_vermiet_abzug'];
 for(const id of numberIds){const raw=text(e,id);if(raw&&!/^-?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)$/.test(raw.replace(/\s+/g,'')))fail(id,'Gültige Zahl eingeben.');if(e.n(id)<0||!Number.isFinite(e.n(id)))fail(id,'Nichtnegative endliche Zahl eingeben.');}
 if(e.n('bw_min_offiziell')>0&&e.n('bw_min_offiziell')<(D.bwWohnen?3.5:4.5))fail('bw_min_offiziell','Der veröffentlichte Grund-Mindestsatz darf nicht unter der gesetzlichen Grunduntergrenze liegen.');
 if(R.bwAbschlagP>100||e.n('bw_sicher')>100||e.n('bw_bewirt')>100)fail('bw_abschlag','Prozentansätze und die Summe der Abschläge dürfen 100 % nicht überschreiten.');
 if(!present(e,'bw_zins_stand'))fehlend.push({feld:'bw_zins_stand',text:'Geltungsdatum des veröffentlichten Mindestsatzes fehlt.'});
 if(!(R.bwRnd>0)||!(R.bwBodenwert>0)&&!(D.bwBoden>0))fehlend.push({feld:'bw_rnd',text:'Restnutzungsdauer und Bodenwert vollständig erfassen.'});
 for(const [id,value] of [['bw_min_offiziell',e.n('bw_min_offiziell')],['bw_inst_satz',e.n('bw_inst_satz')],['bw_modern_satz',e.n('bw_modern_satz')]])if(value<0||!Number.isFinite(value))fail(id,'Ungültiger Kosten- oder Zinssatz.');
 return {status:hinweise.length?'fehler':fehlend.length?'entwurf':'ok',fehlend,hinweise,korrekturen:D.bwKorrekturen||[]};
}
function pruefePreis(e,R,D){
 const fehlend=[],hinweise=[];const need=(id,label)=>{if(!has(e,id))fehlend.push({feld:id,text:label});};
 const ws=D.istWohnung?0:R.g*(1-R.gv),we=(1-R.g)*(1-R.gv),wv=D.istWohnung?R.g:R.gv;
 need('gewichtung_begruendung','Verfahrenswahl und Gewichtung mit Datenqualität begründen.');
 if(ws>0){need('pq_sf_quelle','Sachwertfaktor mit örtlicher Quelle und Stand belegen.');need('pq_bpi_quelle','Baupreisindex und Basisumrechnung mit Quelle und Stand belegen.');if(!(e.n('bpi')>0&&e.n('bpi_faktor')>0&&e.n('markt_faktor')>0))fehlend.push({feld:'bpi',text:'Baupreisindex, Basisfaktor und Sachwertfaktor ausdrücklich erfassen.'});}
 if(!D.istWohnung&&(ws>0||we>0||e.an('eb_aktiv')))need('pq_brw_quelle','Bodenrichtwert mit Zone und Stichtag belegen.');
 if(we>0){need('pq_lz_quelle','Liegenschaftszins mit örtlicher Quelle und Stand belegen.');need('pq_miete_quelle','Marktüblichen Mietansatz belegen.');need('pq_bw_quelle','Bewirtschaftungskosten passend zum Ableitungsmodell belegen.');}
 if(wv>0)need('pq_vgl_quelle','Vergleichspreis, Objektvergleich und Anpassungen belegen.');
 if(!e.an('pq_modell_geprueft'))fehlend.push({feld:'pq_modell_geprueft',text:'Übereinstimmung der verwendeten Daten mit ihrem Ableitungsmodell prüfen.'});
 if(!present(e,'ek_stichtag'))fehlend.push({feld:'ek_stichtag',text:'Wertermittlungsstichtag fehlt.'});
 if(ws>0&&e.n('hg_garage')>0){if(!e.an('hg_garage_vorhanden'))hinweise.push({feld:'hg_garage_vorhanden',stufe:'fehler',text:'Garagenansatz ohne bestätigte Garage/Carport.'});need('hg_garage_quelle','Garagenwert und Zuordnung belegen.');if(!(e.n('ek_anz_stell')>0))hinweise.push({feld:'ek_anz_stell',stufe:'fehler',text:'Garagenansatz widerspricht null erfassten Stellplätzen.'});}
 if(ws>0&&e.n('hg_aussen')>0)need('hg_aussen_quelle','Außenanlagenwert belegen.');
 for(const [active,prefix]of [[e.an('pv_aktiv'),'pv'],[e.an('en_aktiv'),'en']])if(active){
  if(!['zusatz','enthalten','teilweise'].includes(e.v(prefix+'_basis')))fehlend.push({feld:prefix+'_basis',text:'Prüfen, ob '+(prefix==='pv'?'PV':'Energetik')+' bereits im Grundwert enthalten ist.'});
  if(e.v(prefix+'_basis')!=='enthalten'){need(prefix+'_quelle','Zusätzlichen '+(prefix==='pv'?'PV':'Energie')+'-Marktansatz belegen.');need(prefix+'_begruendung','Abgrenzung des zusätzlichen Ansatzes begründen.');}
 }
 if(e.an('niess_aktiv')){
  need('ni_rechtsgrundlage','Rechtsinhalt, betroffene Einheit und Kostenpflichten erfassen.');
  const tafel=D.niQuelle==='sterbetafel'&&!(e.n('ni_kapwert')>0);
  if(!tafel)need('ni_kapital_quelle','Laufzeit/Kapitalwert mit Quelle und Stichtag belegen.');
  if(!['markt','steuer'].includes(e.v('ni_wertart')))fehlend.push({feld:'ni_wertart',text:'Marktansatz und steuerlichen Kapitalwert unterscheiden.'});
  if(e.v('ni_wertart')==='steuer')hinweise.push({feld:'ni_wertart',stufe:'fehler',text:'Steuerlicher Rechtswert kann nicht ohne Marktansatz in die Preisempfehlung eingehen.'});
  if(e.v('ni_art')!=='leibrente'){
   if(!['gesamt','teil'].includes(e.v('ni_umfang')))fehlend.push({feld:'ni_umfang',text:'Umfang des Rechts ausdrücklich wählen.'});
   if(e.v('ni_umfang')==='teil'&&!(e.n('ni_miete')>0))fehlend.push({feld:'ni_miete',text:'Jahresmietwert der betroffenen Einheit fehlt; kein Ersatz durch Gesamtmiete.'});
  }
  if(tafel&&!(e.n('ni_alter')>0))fehlend.push({feld:'ni_alter',text:'Alter der berechtigten Person fehlt (für die Sterbetafel).'});
  if(!tafel&&!(e.n('ni_leben')>0||e.n('ni_kapwert')>0))fehlend.push({feld:'ni_leben',text:'Eigene Laufzeit oder Kapitalisierungsfaktor fehlt.'});
  if(!(e.n('ni_zins')>0))fehlend.push({feld:'ni_zins',text:'Kapitalisierungszins fehlt (i. d. R. der Liegenschaftszins).'});
 }
 if(e.an('eb_aktiv'))need('eb_begruendung','Erbbaurechtsvertrag, Laufzeit und Anpassungsmodell belegen.');
 return {fehlend,hinweise};
}
const api={beleihung,pruefeBeleihung,pruefePreis,barwert};root.ImmoModell=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
