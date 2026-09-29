/* ImmoApp — Selbsttest des Rechenkerns
   Wird nur auf Knopfdruck geladen (Export-Menü → Selbsttest). Prüft Bausteine und zwei vollständige
   Referenzbewertungen gegen Sollwerte, die unabhängig nachgerechnet wurden (Python bzw. Handrechnung,
   2026-09-29). Der Test läuft auf einer Kopie des Zustands: Die offene Bewertung wird vorher gesichert und
   danach unverändert wiederhergestellt, gespeichert wird währenddessen nichts (SILENT).
   Sollwerte ändern sich nur mit Absicht — dann hier anpassen und im Commit begründen. */
(function(){
'use strict';

/* Referenzfall 1: EFH, Bj. 1985, Stichtag 01.09.2026, 650 m² × 380 €/m², 7 Modernisierungspunkte,
   PV 8.000 kWh, Energiekennwert 210 (Klasse G gegen D), Beleihungswert mit den Eingaben des BelWertV-Prüffalls */
const FALL_HAUS={"ek_modus":"haus","ek_typ":"EFH freistehend · unterkellert, DG ausgebaut","ek_vordruck":"Wohnhaus mit PV-Anlage","ek_wtyp":"Etagenwohnung","ek_stichtag":"2026-09-01","ek_gs_flaeche":"650","ek_brw":"380","ek_gs_abschlag":"0","ek_hausgeld":"0","ek_hausgeld_nu":"0","xgs1_flaeche":"0","xgs1_brw":"0","xgs1_abschlag":"0","xgs2_flaeche":"0","xgs2_brw":"0","xgs2_abschlag":"0","ek_wohnflaeche":"145","ek_nutzflaeche":"0","ek_baujahr":"1985","ek_anz_we":"1","ek_anz_stell":"0","ek_miete_wohnen":"13920","ek_miete_gewerbe":"0","ek_miete_stellplatz":"0","ek_grundsteuer":"0","rl_aktiv":false,"hg_keller":"ja","bgfhg_l0":"0","bgfhg_b0":"0","bgfhg_e0":"95","bgfhg_l1":"0","bgfhg_b1":"0","bgfhg_e1":"95","bgfhg_l2":"0","bgfhg_b2":"0","bgfhg_e2":"80","bgfhg_l3":"0","bgfhg_b3":"0","bgfhg_e3":"0","bgfhg_l4":"0","bgfhg_b4":"0","bgfhg_e4":"0","bgfhg_l5":"0","bgfhg_b5":"0","bgfhg_e5":"0","nhkhg_gnd":"80","nhkhg_rnd":"0","mod_p0":"2","mod_p1":"2","mod_p2":"0","mod_p3":"2","mod_p4":"0","mod_p5":"1","mod_p6":"0","mod_p7":"0","bpi":"131","bpi_faktor":"1.406","nhk_regional":"1,0","nhkhg_base":"655, 725, 835, 1005, 1260","nhkhg_s0":"3","nhkhg_s1":"3","nhkhg_s2":"3","nhkhg_s3":"3","nhkhg_s4":"3","nhkhg_s5":"3","nhkhg_s6":"3","nhkhg_s7":"3","nhkhg_s8":"3","anbau_aktiv":false,"an_baujahr":"0","bgfan_l0":"0","bgfan_b0":"0","bgfan_e0":"0","bgfan_l1":"0","bgfan_b1":"0","bgfan_e1":"0","bgfan_l2":"0","bgfan_b2":"0","bgfan_e2":"0","bgfan_l3":"0","bgfan_b3":"0","bgfan_e3":"0","bgfan_l4":"0","bgfan_b4":"0","bgfan_e4":"0","bgfan_l5":"0","bgfan_b5":"0","bgfan_e5":"0","nhkan_base":"655, 725, 835, 1005, 1260","nhkan_gnd":"80","nhkan_rnd":"0","nhkan_s0":"3","nhkan_s1":"3","nhkan_s2":"3","nhkan_s3":"3","nhkan_s4":"3","nhkan_s5":"3","nhkan_s6":"3","nhkan_s7":"3","nhkan_s8":"3","hg_aussen":"20000","hg_garage":"25000","xhg1_val":"0","xhg2_val":"0","xhg3_val":"0","an_aussen":"0","xan1_val":"0","xan2_val":"0","markt_faktor":"1.15","sub_zuschlag":"0","sub_abschlag":"0","xsub1_val":"0","xsub2_val":"0","xsub3_val":"0","vw_aktiv":false,"vw_preis":"0","vw_garage":"0","vw_sonst":"0","xvw1_val":"0","xvw2_val":"0","xvw3_val":"0","er_mietrolle":false,"er_zins_basis":"2.5","er_zins_adj":"0","er_gewerbe":"0","er_rnd_override":"0","er_bwmodus":false,"er_bewirt":"20","er_bw_verw_we":"300","er_bw_verw_sp":"48","er_bw_mietausfall":"2","er_bw_inst_m2":"12","er_bw_inst_sp":"100","er_bw_nuk":"0","er_aussen":"0","er_objekt":"0","xer1_val":"0","xer2_val":"0","xer3_val":"0","niess_aktiv":false,"ni_art":"niessbrauch","ni_rente":"0","ni_alter":"0","ni_geschlecht":"w","ni_leben":"0","ni_zins":"5.5","ni_kapwert":"0","ni_miete":"0","ni_grundst":"0","ni_nuk":"20","xni1_val":"0","xni2_val":"0","eb_aktiv":false,"eb_zins_eur":"0","eb_restlaufzeit":"0","eb_verzinsung":"0","eb_abschlag":"0","wk_visible":"3","pv_aktiv":true,"pv_kwp":"9","pv_ertrag_kwh":"8000","pv_erloes":"0,25","pv_bewirt":"15","pv_zins":"5","pv_rnd":"20","en_aktiv":true,"en_kennwert":"210","en_klasse":"G","en_ref_klasse":"D","en_modus":"markt","en_pct_stufe":"2,5","en_preis_kwh":"0,12","en_zins":"3","en_jahre":"20","gew_vergleich":"30","gewichtung":"0.5","verhandlung":"5","xemp1_val":"0","xemp2_val":"0","pl_markt":"0","bw_aktiv":true,"bw_nutzung":"wohnen","bw_bund":"2,5","bw_zins":"5,0","bw_objektart":"80","bw_roh":"17400","bw_bewirt":"15","bw_rnd":"44","bw_herstell":"198949","bw_aussen":"0","bw_sicher":"10","bw_bodenwert":"210000","bw_ansatz":"min","bw_besichtigung":"0","bw_abschlag":"0","re_kaufpreis":"0","re_grest":"5,0","re_notar":"2,0","re_makler":"3,57","re_sanierung":"0","re_nuk":"0"};
const SOLL_HAUS=[
  ['Bodenwert 650 m² × 380 €/m²','bodenwert',247000,0.5],
  ['Restnutzungsdauer (Anlage 2, 7 Punkte, Alter 41)','erRND',43.98717,0.0001],
  ['Vervielfältiger 2,5 % / 43,99 J','vf',26.49957,0.0001],
  ['Ertragswert','ertrag',378464.38,1],
  ['Sachwert (Substanz, mit Marktanpassung 1,15)','substanz',598367.35,1],
  ['Gewichteter Mittelwert 50 : 50','mittel',488415.86,1],
  ['Barwert PV-Anlage','pvWert',21185.76,0.5],
  ['Energetische Qualität (Klasse G gegen D, −7,5 %)','energieWert',-36631.19,1],
  ['Preisempfehlung','empfehlung',472970.43,1],
  ['BelWertV: Ertragswert','bwErtrag',285773.30,1],
  ['BelWertV: Sachwert nach Sicherheitsabschlag','bwSachwert',389054.10,1],
  ['Beleihungswert (§ 4: der niedrigere)','beleihungswert',285773.30,1]
];

/* Referenzfall 2: Eigentumswohnung, Bj. 1996, 78 m², Vergleichspreis 3.900 €/m², Miete 8.424 €/Jahr */
const FALL_ETW=Object.assign({},FALL_HAUS,{"ek_modus":"wohnung","ek_vordruck":"ETW · Ertrags- + Vergleichswert","ek_gs_flaeche":"0","ek_brw":"0","ek_wohnflaeche":"78","ek_baujahr":"1996","ek_miete_wohnen":"8424","bgfhg_e0":"0","bgfhg_e1":"0","bgfhg_e2":"0","mod_p0":"0","mod_p1":"0","mod_p3":"0","mod_p5":"0","nhkhg_base":"615, 685, 785, 945, 1180","nhkan_base":"615, 685, 785, 945, 1180","vw_preis":"3900","er_zins_basis":"3","pv_aktiv":false,"pv_kwp":"0","pv_ertrag_kwh":"0","en_aktiv":false,"en_kennwert":"0","en_klasse":"D","bw_aktiv":false,"bw_roh":"0","bw_rnd":"0","bw_herstell":"0","bw_bodenwert":"0"});
const SOLL_ETW=[
  ['Vergleichswert 78 m² × 3.900 €/m²','vergleichWert',304200,0.5],
  ['Restnutzungsdauer 80 − 30 Jahre','erRND',50,0.0001],
  ['Vervielfältiger 3 % / 50 J','vf',25.72976,0.0001],
  ['Ertragswert (ohne Bodenwert)','ertrag',173398.03,1],
  ['Preisempfehlung','empfehlung',238799.01,1]
];

/* Testgrundriss: EFH-Erdgeschoss 10,49 × 8,74 m, Flächen laut Plan (Wohnfläche 77,90 m²) */
const GRUNDRISS={"geschoss":"EG","massstab":true,"umriss":[[0,0],[1049,0],[1049,874],[0,874]],
  "raeume":[{"name":"Küche","r":[36.5,36.5,376.5,363.5],"flaeche_plan":13.69},{"name":"Diele","r":[424.5,36.5,238.5,363.5],"flaeche_plan":8.67},
    {"name":"Bad","r":[674.5,36.5,338,170],"flaeche_plan":5.75},{"name":"Abstellraum","r":[674.5,218,338,182],"flaeche_plan":6.15},
    {"name":"Wohnen","r":[36.5,424,626.5,413.5],"flaeche_plan":25.91},{"name":"Schlafen","r":[674.5,424,338,413.5],"flaeche_plan":13.98},
    {"name":"Terrasse","r":[36.5,874,500,300],"aussen":true,"anrechnung":"bal","flaeche_plan":15}],
  "oeffnungen":[{"art":"tuer","raum":"Küche","seite":"rechts","ab":250,"b":88.5},{"art":"doppeltuer","raum":"Diele","seite":"unten","ab":20,"b":126,"auf":"aussen"},
    {"art":"fenster","raum":"Wohnen","seite":"unten","ab":360,"b":151}]};

function grundzustand(){
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e=>{
    if(e.closest('#mdb_overlay,#suche,#gr_overlay,#fin_overlay,#auf_overlay,#projekt_overlay,#lock_setup_overlay,#dsgvo_overlay,#st_overlay')) return;
    if(e.type==='file') return;
    if(e.type==='checkbox'||e.type==='radio') e.checked=e.defaultChecked;
    else if(e.tagName==='SELECT'){ let o=[...e.options].find(x=>x.defaultSelected); e.value=o?o.value:(e.options[0]?e.options[0].value:''); }
    else e.value=e.defaultValue;
  });
}

window.iaSelbsttest=function(){
  const erg=[];
  const pruef=(gruppe,name,ist,soll,tol)=>{
    let ok=typeof soll==='number'?(typeof ist==='number'&&isFinite(ist)&&Math.abs(ist-soll)<=(tol==null?0.5:tol)):ist===soll;
    erg.push({gruppe:gruppe,name:name,ist:ist,soll:soll,ok:ok});
  };
  const sicher=(gruppe,name,f)=>{ try{ f(); }catch(e){ erg.push({gruppe:gruppe,name:name,ist:'Fehler: '+e.message,soll:'ohne Fehler',ok:false}); } };

  sicher('Zahlen lesen','Aufruf',()=>{
    [['450.000',true,450000,'Betrag mit Tausenderpunkt'],['450.000',false,450,'Faktorfeld: Punkt bleibt Dezimalpunkt'],
     ['1.406',false,1.406,'Umrechnungsfaktor 1.406'],['0.082',true,0.082,'0.082 €/kWh bleibt dezimal'],['12,5',false,12.5,'Komma'],
     ['1.234,56',true,1234.56,'Tausenderpunkt und Komma'],['1.234.567',false,1234567,'mehrere Punkte'],['450 000 €',true,450000,'Leerzeichen und Einheit'],
     ['ca. 1978',false,1978,'Text davor'],['2. OG',false,2,'Geschossangabe']]
      .forEach(t=>pruef('Zahlen lesen',t[3]+' („'+t[0]+'“)',zahlLesen(t[0],t[1]),t[2],1e-9));
  });

  sicher('Finanzierung','Aufruf',()=>{
    // 400.000 € Kaufpreis + 10,57 % Nebenkosten − 80.000 € Eigenkapital = 362.280 € Darlehen, 3,5 % Zins, 2 % Tilgung
    let a=finTilgungsverlauf(362280,3.5,2,0,60);
    pruef('Finanzierung','Monatsrate',a.rate,1660.45,0.01);
    pruef('Finanzierung','Restschuld nach 10 Jahren',a.restNach(10),275675.45,0.5);
    pruef('Finanzierung','Zinsen in 10 Jahren',a.zinsBis(10),112649.45,0.5);
    pruef('Finanzierung','Laufzeit in Monaten (29 Jahre)',a.monate,348,0);
    let b=finTilgungsverlauf(362280,3.5,2,5000,60);
    pruef('Finanzierung','Laufzeit mit 5.000 € Sondertilgung (20 J 7 M)',b.monate,247,0);
    pruef('Finanzierung','Zinsen gesamt mit Sondertilgung',b.zinsSumme,146959.76,0.5);
  });

  sicher('Bausteine','Aufruf',()=>{
    pruef('Bausteine','Barwertfaktor 5 % / 20 Jahre',barwertfaktor(5,20),12.46221,0.00001);
    pruef('Bausteine','Restnutzungsdauer Anlage 2: 7 Punkte, Alter 41, GND 80',computeRND(41,80,7),43.98717,0.0001);
    pruef('Bausteine','Restnutzungsdauer Anlage 2: 8 Punkte, Alter 121, GND 80 (Gutachten ALEX99)',computeRND(121,80,8),38.41,0.005);
    pruef('Bausteine','Anrechnung Balkon § 4 WoFlV',rlFaktor('bal'),0.25,0);
    pruef('Bausteine','Anrechnung lichte Höhe 1–2 m',rlFaktor('halb'),0.5,0);
    pruef('Bausteine','Anrechnung Zubehörraum',rlFaktor('zub'),0,0);
    pruef('Bausteine','Raumfläche „4,20 x 3,55“',rlFlaeche('4,20 x 3,55'),14.91,1e-9);
  });

  sicher('Förderung','Aufruf',()=>{
    // Stand: BAFA BEG EM Gebäudehülle 07/2026, KfW 458 Merkblatt 09/2026 — Antrag am 01.10.2026 bzw. 01.09.2027
    const o=(x)=>Object.assign({we:1,isfp:false,selbst:true,eink:'',kind:false,heizung:'gas',heizAlter:25,datum:new Date('2026-10-01T12:00:00')},x);
    pruef('Förderung','Hülle 41.550 € ohne iSFP: 15 % von höchstens 30.000 €',sanFoerderung(41550,0,o()).huelle,4500,0.01);
    pruef('Förderung','Hülle 41.550 € mit iSFP: 15 % + 5 % auf den Teil über 30.000 €',sanFoerderung(41550,0,o({isfp:true})).huelle,6810,0.01);
    pruef('Förderung','Wärmepumpe 33.000 €, Gaskessel 25 J, selbstgenutzt: 46 % von 28.000 €',sanFoerderung(0,33000,o()).heizung,12880,0.01);
    pruef('Förderung','… mit Einkommen bis 30.000 €: Deckel 80 %',sanFoerderung(0,33000,o({eink:'30'})).heizung,22400,0.01);
    pruef('Förderung','… vermietet: nur Grundförderung 30 %',sanFoerderung(0,33000,o({selbst:false})).heizung,8400,0.01);
    pruef('Förderung','… Gaskessel erst 12 Jahre alt: kein Klimageschwindigkeitsbonus',sanFoerderung(0,33000,o({heizAlter:12})).heizung,8400,0.01);
    pruef('Förderung','… Antrag 01.09.2027: 38 % von 26.500 €',sanFoerderung(0,33000,o({datum:new Date('2027-09-01T12:00:00')})).heizung,10070,0.01);
    pruef('Förderung','Förderfähige Kosten erste WE ab 01.08.2028',sanHeizCap1(new Date('2028-08-01T12:00:00')),25000,0);
  });

  sicher('Grundriss','Aufruf',()=>{
    let N=grNorm(GRUNDRISS);
    pruef('Grundriss','Wohnfläche laut Plan mit Terrasse zu 25 %',grSumme(N).wfl,77.90,0.005);
    let k=grKettenWerte(N,'oben').detail, teile=k.slice(1).map((v,i)=>Math.round((v-k[i])*10)/10).join(' | ');
    pruef('Grundriss','Maßkette oben',teile,'36.5 | 376.5 | 11.5 | 238.5 | 11.5 | 338 | 36.5');
    pruef('Grundriss','Wanddicke Küchentür (Innenwand)',N.oeff[0].w,11.5,0.01);
    pruef('Grundriss','Wanddicke Doppeltür Diele → Wohnen',N.oeff[1].h,24,0.01);
    pruef('Grundriss','Wanddicke Fenster Wohnen (Außenwand)',N.oeff[2].h,36.5,0.01);
    pruef('Grundriss','Fläche aus den Maßen: Wohnen',N.raeume[4].qm,25.906,0.001);
  });

  // Vollständige Bewertungen — auf einer Kopie des Zustands
  let alt=collect(), altSilent=SILENT, altSzen={lz:SZEN.lz,miete:SZEN.miete};
  SILENT=true; SZEN.lz=0; SZEN.miete=1;
  try{
    [['Referenzbewertung Wohnhaus',FALL_HAUS,SOLL_HAUS],['Referenzbewertung Eigentumswohnung',FALL_ETW,SOLL_ETW]].forEach(f=>{
      sicher(f[0],'Aufruf',()=>{
        grundzustand(); apply(f[1]); compute();
        let R=window._R;
        f[2].forEach(s=>pruef(f[0],s[0],R[s[1]],s[2],s[3]));
      });
    });
  } finally {
    grundzustand(); apply(alt); SZEN.lz=altSzen.lz; SZEN.miete=altSzen.miete; SILENT=altSilent; compute();
  }
  return erg;
};

window.iaSelbsttestZeigen=function(){
  let erg=window.iaSelbsttest(), n=erg.length, ok=erg.filter(e=>e.ok).length;
  const esc=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const zahl=v=>typeof v==='number'?v.toLocaleString('de-DE',{maximumFractionDigits:Math.abs(v)>=100?2:5}):esc(v);
  let gruppen=[...new Set(erg.map(e=>e.gruppe))];
  let html='<div class="modal" style="max-width:820px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<h2 style="margin:0">Selbsttest Rechenkern</h2><button onclick="document.getElementById(\'st_overlay\').remove()" aria-label="Schließen" style="width:40px;height:40px;padding:0;border-radius:50%">✕</button></div>'
    +'<div class="st-summe '+(ok===n?'ok':'bad')+'">'+(ok===n?'Alle '+n+' Prüfungen bestanden.':(n-ok)+' von '+n+' Prüfungen weichen ab — bitte nicht mit dieser Fassung bewerten und den Fehler melden.')+'</div>'
    +'<p class="hint">Geprüft werden Bausteine und zwei vollständige Referenzbewertungen gegen unabhängig nachgerechnete Sollwerte. Deine offene Bewertung bleibt unverändert.</p>';
  gruppen.forEach(g=>{
    let z=erg.filter(e=>e.gruppe===g), gok=z.every(e=>e.ok);
    html+='<h3 style="margin:16px 0 6px">'+(gok?'✓ ':'✗ ')+esc(g)+'</h3><table class="nhk st-tab"><tbody>'
      +z.map(e=>'<tr class="'+(e.ok?'':'st-fehler')+'"><td style="text-align:left">'+(e.ok?'✓':'✗')+' '+esc(e.name)+'</td><td>'+zahl(e.ist)+'</td>'
        +(e.ok?'':'<td>Soll: '+zahl(e.soll)+'</td>')+'</tr>').join('')+'</tbody></table>';
  });
  html+='<div style="text-align:right;margin-top:16px"><button class="primary" onclick="document.getElementById(\'st_overlay\').remove()">Schließen</button></div></div>';
  let o=document.getElementById('st_overlay'); if(o) o.remove();
  o=document.createElement('div'); o.id='st_overlay'; o.className='overlay on'; o.innerHTML=html;
  o.addEventListener('click',e=>{ if(e.target===o) o.remove(); });
  if(!document.getElementById('st_stil')){
    let st=document.createElement('style'); st.id='st_stil';
    st.textContent='.st-summe{margin:12px 0 8px;padding:12px 16px;border-radius:var(--rs);font-weight:600;font-size:14px}.st-summe.ok{background:var(--ok-bg);color:var(--ok)}.st-summe.bad{background:var(--bad-bg);color:var(--bad)}'
      +'.st-tab td{text-align:right;white-space:nowrap}.st-tab td:first-child{white-space:normal}.st-tab tr.st-fehler td{color:var(--bad);font-weight:600}';
    document.head.appendChild(st);
  }
  document.body.appendChild(o);
  return {bestanden:ok,gesamt:n};
};
})();
