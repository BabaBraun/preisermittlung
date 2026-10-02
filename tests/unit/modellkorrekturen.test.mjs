import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';import {K,leser,nahe}from'./hilfen.mjs';import {createRequire}from'node:module';const M=createRequire(import.meta.url)('../../js/modell.js');
const base=JSON.parse(readFileSync(new URL('../fixtures/fall_haus.json',import.meta.url),'utf8'));
function value(overrides={}){const e=leser({...base,...overrides});return {...K.bewerte(e,{jahr:2026}),e};}
test('Beleihung: null Prozent Kosten kann den Mindestansatz nicht unterschreiten',()=>{const {R}=value({bw_bewirt:0,bw_zins:5.5});assert.ok(R.bwBewirt>=R.bwRoh*.15);});
test('Beleihung: nachgewiesene höhere Gesamtkosten werden angesetzt',()=>{const {R}=value({bw_bewirt:15,bw_kosten_gesamt:8000});assert.equal(R.bwBewirt,8000);});
test('Beleihung: Sicherheitsabschlag niemals unter zehn Prozent',()=>{const{R}=value({bw_sicher:0});assert.equal(R.bwSicherP,10);});
test('Beleihung: kurze Restnutzungsdauer kapitalisiert den gesamten Reinertrag',()=>{const{R}=value({bw_rnd:20,bw_zins:5,bw_min_offiziell:5,bw_kurzverfahren:'gesamt'});nahe(assert,R.bwErtrag,184316.090966,.01);});
test('Beleihung: Abbruchkosten werden als Barwert berücksichtigt',()=>{const{R}=value({bw_rnd:20,bw_zins:5,bw_min_offiziell:5,bw_kurzverfahren:'abbruch',bw_abbruch:50000,bw_freilegung:20});nahe(assert,R.bwErtrag,244618.408,.1);});
test('Beleihung: kein Gebäudereinertrag benötigt abgezinsten Bodenwert abzüglich Freilegung',()=>{const{R}=value({bw_roh:1000,bw_bewirt:15,bw_zins:5,bw_min_offiziell:5,bw_rnd:20,bw_abbruch:50000,bw_freilegung:20});nahe(assert,R.bwErtrag,60302.317,.1);});
test('Beleihung: der Ertragswert ist der reguläre Ausgangswert',()=>{const{R}=value({bw_ansatz:'min',bw_herstell:50000,bw_zins:5,bw_min_offiziell:5});assert.equal(R.bwAusgang,R.bwErtrag);assert.ok(R.bwErtrag>R.bwSachwert);});
test('Beleihung: Nutzungsaufschlag für Produktionsimmobilien',()=>{const{R}=value({bw_nutzung:'gewerbe',bw_nutzart:'produktion',bw_min_offiziell:5,bw_zins:5});assert.equal(R.bwZinsMin,6);assert.equal(R.bwZins,6);});
test('PV bereits im Grundwert wird nicht nochmals addiert',()=>{const {R}=value({pv_basis:'enthalten',en_aktiv:false,gewichtung:1,vw_aktiv:true,gew_vergleich:100,vw_preis:4000});assert.equal(R.pvWert,0);assert.equal(R.empfehlung,580000);});
test('Energetischer Zustand bereits im Grundwert wird nicht nochmals abgezogen',()=>{const{R}=value({en_basis:'enthalten',pv_aktiv:false});assert.equal(R.energieWert,0);assert.equal(R.empfehlung,R.mittel);});
test('Energiekosten-Barwert ist kein automatisch angenommener Marktabschlag',()=>{const{R,D}=value({en_modus:'kosten',en_kennwert:210,en_ref_klasse:'D',en_basis:'zusatz',en_markt_ansatz:-5000});assert.equal(R.energieWert,-5000);assert.ok(D.enKostenBarwert<0);});
test('Beschränktes Recht verwendet keine Gesamtmiete als stillen Ersatz',()=>{const{R}=value({niess_aktiv:true,ni_umfang:'teil',ni_miete:0,ni_leben:20,ni_zins:5});assert.equal(R.niRein,0);assert.equal(R.niessWert,0);});
test('Nießbrauch: eigene Laufzeit ohne Jahre ergibt keinen Wert, keine Schätzung aus dem Alter',()=>{const{R,D}=value({niess_aktiv:true,ni_umfang:'gesamt',ni_alter:65,ni_laufzeit:'eigen',ni_leben:0,ni_kapwert:0});assert.equal(D.leben,0);assert.equal(R.kw,0);assert.equal(D.niKwArt,'zeitrente');});
test('Nießbrauch: Sterbetafel liefert Leibrentenfaktor, ohne Alter keinen',()=>{const{R,D}=value({niess_aktiv:true,ni_umfang:'gesamt',ni_alter:65,ni_geschlecht:'m',ni_laufzeit:'sterbetafel',ni_zins:3,ni_leben:20});assert.equal(D.niKwArt,'leibrente');assert.equal(R.kw,K.leibrentenfaktor(65,'m',3));assert.equal(D.leben,K.restLeben(65,'m'));nahe(assert,R.niessWert,R.niRein*R.kw,1e-6);
  const ohne=value({niess_aktiv:true,ni_umfang:'gesamt',ni_alter:0,ni_laufzeit:'sterbetafel'});assert.equal(ohne.R.kw,0);});
test('Nießbrauch: eingetragener Kapitalisierungsfaktor hat Vorrang, ältere Daten mit Laufzeit bleiben Zeitrente',()=>{const a=value({niess_aktiv:true,ni_umfang:'gesamt',ni_alter:65,ni_laufzeit:'sterbetafel',ni_kapwert:9.8});assert.equal(a.R.kw,9.8);assert.equal(a.D.niKwArt,'eingetragen');
  const alt=value({niess_aktiv:true,ni_umfang:'gesamt',ni_alter:65,ni_leben:12,ni_zins:4});assert.equal(alt.D.niQuelle,'eigen');assert.equal(alt.R.kw,K.barwertfaktor(4,12));});
test('Modellprüfung: Sterbetafel ist belegt, eigene Laufzeit braucht Quelle',()=>{const q={niess_aktiv:true,ni_umfang:'gesamt',ni_wertart:'markt',ni_kapital_quelle:'',ni_rechtsgrundlage:'Synthetisch'};
  const t=value({...q,ni_laufzeit:'sterbetafel',ni_alter:70});const pt=M.pruefePreis(t.e,t.R,t.D);
  const g=value({...q,ni_laufzeit:'eigen',ni_leben:10});const pg=M.pruefePreis(g.e,g.R,g.D);
  {assert.ok(!pt.fehlend.some(f=>f.feld==='ni_kapital_quelle'),'Sterbetafel braucht keine eigene Quelle');assert.ok(pg.fehlend.some(f=>f.feld==='ni_kapital_quelle'),'eigene Laufzeit braucht Quelle');}});
test('Steuerlicher Rechtswert wird nicht als Marktbelastung abgezogen',()=>{const{R,D}=value({niess_aktiv:true,ni_wertart:'steuer',ni_umfang:'gesamt',ni_leben:20});assert.equal(R.niessWert,0);assert.ok(D.niSzenarioWert>0);});
test('Marktansatz ohne Quellen und Begründung bleibt Entwurf',()=>{const {e,R,D}=value({gewichtung_begruendung:'',pq_sf_quelle:'',pq_modell_geprueft:false});const p=K.pruefen(e,R,D);assert.notEqual(p.status,'ok');assert.ok(p.fehlend.some(x=>x.feld==='gewichtung_begruendung'));});
test('Garage ohne bestätigte Existenz darf nicht als geprüfter Ansatz erscheinen',()=>{const {e,R,D}=value({ek_anz_stell:0,hg_garage:25000,hg_garage_vorhanden:false});const p=K.pruefen(e,R,D);assert.ok(p.hinweise.some(x=>x.feld==='hg_garage_vorhanden'));});
test('Beleihung bekommt einen getrennten Prüfstatus',()=>{const{R,D,e}=value({bw_nachweise_geprueft:false,bw_grundlage:''});assert.equal(K.pruefen(e,R,D).status,'ok');const p=K.pruefeBeleihung(e,R,D);assert.notEqual(p.status,'ok');assert.ok(p.fehlend.length>0);});

test('Wohnung verlangt Vergleichsdaten, keine fiktiven NHK-/Sachwertquellen',()=>{const f={...base,ek_modus:'wohnung',pv_aktiv:false,en_aktiv:false,pq_sf_quelle:'',pq_bpi_quelle:''};const e=leser(f),{R,D}=K.bewerte(e,{jahr:2026}),p=K.pruefen(e,R,D);assert.ok(!p.fehlend.some(h=>h.feld==='pq_sf_quelle'));assert.ok(!p.fehlend.some(h=>h.feld==='pq_bpi_quelle'));});
test('Reiner Vergleichswert verlangt keine ungenutzten Boden-/Garagenansätze',()=>{const{e,R,D}=value({vw_aktiv:true,gew_vergleich:100,vw_preis:4000,ek_gs_flaeche:0,ek_brw:0,hg_garage_vorhanden:false,pv_aktiv:false,en_aktiv:false});const p=K.pruefen(e,R,D);assert.ok(!p.fehlend.some(x=>x.feld==='ek_gs_flaeche'));assert.ok(!p.hinweise.some(x=>x.feld==='hg_garage_vorhanden'));});
test('Wohnungsbau-Instandhaltung kann nicht auf den hochwertigen Büro-Satz abgesenkt werden',()=>{const{D}=value({bw_inst_satz:.4,bw_neubau:1000000});assert.ok(D.bwKosten.instandhaltung>=5000);});
test('Beleihung: falsch formatierte Kosten bleiben fehlerhaft statt freigegeben',()=>{const{e,R,D}=value({bw_verw:'kaputt'});assert.equal(K.pruefeBeleihung(e,R,D).status,'fehler');});
test('Widersprüchliche Nutzungsarten dürfen nicht vollständig geprüft erscheinen',()=>{const{e,R,D}=value({bw_nutzung:'wohnen',bw_nutzart:'produktion',bw_min_offiziell:3.5,bw_zins:0});assert.equal(K.pruefeBeleihung(e,R,D).status,'fehler');assert.ok(R.bwZins>=5.5);});
test('Fehlender nachhaltiger Ertrag bleibt beim Ertragsverfahren unvollständig',()=>{const{e,R,D}=value({bw_roh:''});assert.notEqual(K.pruefeBeleihung(e,R,D).status,'ok');});
test('Negative Kosten-Garagenzahl und negativer Besichtigungsabschlag werden erkannt',()=>{const{e,R,D}=value({bw_verw_sp_anz:-100,bw_besichtigung:-50});assert.equal(K.pruefeBeleihung(e,R,D).status,'fehler');assert.ok(D.bwKosten.verwaltung>=300);});
test('Sachwertorientierung verlangt einen Herstellungsansatz',()=>{const{e,R,D}=value({bw_ansatz:'sach',bw_herstell:0,bw_eigennutzung:true,bw_eigennutzung_grund:'Dokumentierter synthetischer Fall.'});assert.notEqual(K.pruefeBeleihung(e,R,D).status,'ok');});

/* D37: Vergleichswert im Beleihungswert — § 19 Abs. 1 (Sicherheitsabschlag mind. 10 %), § 4 Abs. 1 und 2 BelWertV */
test('Beleihung: Vergleichswert mit Sicherheitsabschlag, nie unter zehn Prozent (§ 19 Abs. 1)',()=>{
  const a=value({bw_vgl:500000,bw_vgl_sicher:15});assert.equal(a.R.bwVglSicherP,15);nahe(assert,a.R.bwVergleich,425000,1e-6);
  const b=value({bw_vgl:500000,bw_vgl_sicher:5});assert.equal(b.R.bwVglSicherP,10);nahe(assert,b.R.bwVergleich,450000,1e-6);
  assert.ok(b.D.bwKorrekturen.some(t=>/Vergleichswert: mindestens 10 %/.test(t)));
  const ohne=value({bw_vgl:0});assert.equal(ohne.R.bwVergleich,0);});
test('Beleihung: Vergleichswertorientierung als Ausgangswert, Vermietungsabzug wie beim Sachwert (§ 4 Abs. 2)',()=>{
  const{R}=value({bw_ansatz:'vergleich',bw_vgl:500000,bw_vgl_sicher:10,bw_vermietet:'ja',bw_vermiet_abzug:20000,bw_besichtigung:0,bw_abschlag:0});
  assert.equal(R.bwAnsatz,'vergleich');nahe(assert,R.bwAusgang,450000,1e-6);nahe(assert,R.beleihungswert,430000,1e-6);});
test('Beleihung: Vergleichswert nur bei EFH/ZFH und Wohnungseigentum, beim EFH mit mindestens fünf Vergleichspreisen',()=>{
  const mfh=value({bw_ansatz:'vergleich',bw_vgl:500000,ek_typ:'Mehrfamilienhaus · bis 6 WE',ek_anz_we:4});
  assert.ok(K.pruefeBeleihung(mfh.e,mfh.R,mfh.D).hinweise.some(h=>h.feld==='bw_ansatz'&&/§ 4 Abs. 1/.test(h.text)));
  const efh=value({bw_ansatz:'vergleich',bw_vgl:500000,ek_typ:'EFH freistehend · unterkellert, DG ausgebaut',ek_anz_we:1,bw_vgl_anzahl:3});
  const p=K.pruefeBeleihung(efh.e,efh.R,efh.D);
  assert.ok(!p.hinweise.some(h=>h.feld==='bw_ansatz'));assert.ok(p.fehlend.some(f=>f.feld==='bw_vgl_anzahl'));
  const efh5=value({bw_ansatz:'vergleich',bw_vgl:500000,ek_typ:'EFH freistehend · unterkellert, DG ausgebaut',ek_anz_we:1,bw_vgl_anzahl:5});
  assert.ok(!K.pruefeBeleihung(efh5.e,efh5.R,efh5.D).fehlend.some(f=>f.feld==='bw_vgl_anzahl'));
  const etw=value({ek_modus:'wohnung',bw_ansatz:'vergleich',bw_vgl:300000,bw_vgl_anzahl:2});
  const pe=K.pruefeBeleihung(etw.e,etw.R,etw.D);assert.ok(!pe.hinweise.some(h=>h.feld==='bw_ansatz'));assert.ok(!pe.fehlend.some(f=>f.feld==='bw_vgl_anzahl'));});
test('Beleihung: Vergleichswert als Kontrollwert — mehr als 20 % unter dem Ertragswert verlangt die Nachhaltigkeitskontrolle',()=>{
  const{R}=value({bw_zins:5,bw_min_offiziell:5});assert.ok(R.bwErtrag>0);
  const niedrig=value({bw_zins:5,bw_min_offiziell:5,bw_kontrollwert:'vergleich',bw_vgl:R.bwErtrag*0.5,ek_typ:'EFH freistehend · unterkellert, DG ausgebaut',ek_anz_we:1,bw_kontrolle:false});
  assert.equal(niedrig.R.bwKontroll,'vergleich');assert.equal(niedrig.R.bwAusgang,niedrig.R.bwErtrag);
  assert.ok(K.pruefeBeleihung(niedrig.e,niedrig.R,niedrig.D).fehlend.some(f=>f.feld==='bw_kontrolle'&&/Vergleichswert/.test(f.text)));
  const hoch=value({bw_zins:5,bw_min_offiziell:5,bw_kontrollwert:'vergleich',bw_vgl:R.bwErtrag*1.5,ek_typ:'EFH freistehend · unterkellert, DG ausgebaut',ek_anz_we:1,bw_kontrolle:false});
  assert.ok(!K.pruefeBeleihung(hoch.e,hoch.R,hoch.D).fehlend.some(f=>f.feld==='bw_kontrolle'));});

