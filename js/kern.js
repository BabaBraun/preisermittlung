/* ImmoApp — Rechenkern ohne DOM
   Enthält alle Bewertungsformeln (Sachwert, Ertragswert, Vergleichswert, Belastungen, Erbbaurecht, PV,
   Energie, BelWertV, Rendite) sowie Finanzierung und Investitionsrechnung. Die Funktionen lesen keine
   Seitenelemente: Eingaben kommen über einen Leser {n(id), v(id), an(id)}, Ergebnisse als Objekte zurück.
   Läuft im Browser (globales Objekt ImmoKern, dazu die bisherigen Funktionsnamen) und in Node
   (module.exports) — dort prüfen die Tests unter tests/unit ihn gegen unabhängig gerechnete Sollwerte.
   Formeln nur bei nachgewiesenem Fehler ändern und die Änderung in tests/fixtures/golden-aenderungen.md
   mit Quelle und Vorher/Nachher festhalten. */
(function(wurzel){
'use strict';
const Modell=typeof module==='object'&&module.exports?require('./modell.js'):wurzel.ImmoModell;
const Tafel=typeof module==='object'&&module.exports?require('./sterbetafel.js'):wurzel.ImmoSterbetafel;

/* ---------- Zahlen ---------- */
function zahlLesen(s,betrag){
  if(typeof s==='number') return isFinite(s)?s:0;
  s=(''+(s==null?'':s)).replace(/[−‒–]/g,'-').trim().replace(/(\d)\s+(?=\d)/g,'$1').replace(/-\s+(?=[\d.,])/,'-');
  let m=/^-?[.,]\d/.test(s)?s.match(/-?[.,]\d+/):s.match(/-?\d[\d.,]*/);
  if(!m) return 0; s=m[0];
  if(s.indexOf(',')>-1) s=s.replace(/\./g,'').replace(',','.');
  else if((s.match(/\./g)||[]).length>1) s=s.replace(/\./g,'');
  else if(betrag&&/^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) s=s.replace('.','');
  let v=parseFloat(s); return isNaN(v)?0:v;
}

/* ---------- Fachtabellen ---------- */
const NHK_ELEMENTS = [
  ['Außenwände',0.23],['Dach',0.15],['Außentüren und Fenster',0.11],
  ['Innenwände und -türen',0.11],['Decken und Treppen',0.11],['Fußböden',0.05],
  ['Sanitäreinrichtung',0.09],['Heizung',0.09],['Sonstige techn. Ausstattung',0.06]
];

function interp(b,s){if(s<=1)return b[0];if(s>=5)return b[4];let lo=Math.floor(s),f=s-lo;return b[lo-1]+(b[lo]-b[lo-1])*f;}

const MOD_ELEMENTS=[
  ['Dacherneuerung inkl. Wärmedämmung',4],
  ['Fenster- und Außentürmodernisierung',2],
  ['Leitungssysteme (Strom, Gas, Wasser, Abwasser)',2],
  ['Modernisierung der Heizungsanlage',2],
  ['Wärmedämmung der Außenwände',4],
  ['Modernisierung der Bäder',2],
  ['Innenausbau (Decken, Fußböden, Treppen)',2],
  ['Wesentliche Verbesserung der Grundrissgestaltung',2]
];

// Koeffizienten a,b,c und Schwelle (rel. Alter %) je Punktzahl 0..20 (Tabelle 3, Anlage 2 ImmoWertV)
const RND_COEFF=[
  [1.2500,2.6250,1.5250,60],[1.2500,2.6250,1.5250,60],[1.0767,2.2757,1.3878,55],[0.9033,1.9263,1.2505,55],
  [0.7300,1.5770,1.1133,40],[0.6725,1.4578,1.0850,35],[0.6150,1.3385,1.0567,30],[0.5575,1.2193,1.0283,25],
  [0.5000,1.1000,1.0000,20],[0.4660,1.0270,0.9906,19],[0.4320,0.9540,0.9811,18],[0.3980,0.8810,0.9717,17],
  [0.3640,0.8080,0.9622,16],[0.3300,0.7350,0.9528,15],[0.3040,0.6760,0.9506,14],[0.2780,0.6170,0.9485,13],
  [0.2520,0.5580,0.9463,12],[0.2260,0.4990,0.9442,11],[0.2000,0.4400,0.9420,10],[0.2000,0.4400,0.9420,10],[0.2000,0.4400,0.9420,10]
];

const EN_KLASSEN=[['A+',30],['A',50],['B',75],['C',100],['D',130],['E',160],['F',200],['G',250],['H',1e9]];

/* ---------- Bausteine ---------- */
function enKlasseAusKennwert(k){ for(let i=0;i<EN_KLASSEN.length;i++){ if(k<=EN_KLASSEN[i][1]) return EN_KLASSEN[i][0]; } return 'H'; }
function enIdx(kl){ let i=EN_KLASSEN.findIndex(x=>x[0]===kl); return i<0?4:i; }
function enRefKennwert(kl){ let i=enIdx(kl); return i>=EN_KLASSEN.length-1?300:EN_KLASSEN[i][1]; }
function computeRND(alter,gnd,points){
  if(gnd<=0)return 0;
  if(alter<=0)return gnd;
  /* Hinweis: Jenseits des Scheitels (Alter > b·GND/2a, bei 0 Punkten 1,05 × GND) steigt die Formel wieder an.
     Die Anlage 2 regelt diesen Bereich nicht ausdrücklich; die Formel bleibt unverändert (auch Gutachten wenden
     sie dort an). ImmoKern.pruefen() weist auf den Fall hin, damit die RND sachverständig geprüft wird. */
  let p=Math.min(Math.max(Math.round(points),0),20);
  let co=RND_COEFF[p];
  let relAlter=alter/gnd;
  let rnd=(relAlter<=co[3]/100)?(gnd-alter):(co[0]*alter*alter/gnd - co[1]*alter + co[2]*gnd);
  return Math.min(Math.max(rnd,0),gnd);
}
function barwertfaktor(p,n){p=p/100;if(p<=0)return n;if(n<=0)return 0;return -Math.expm1(-n*Math.log1p(p))/p;}
/* Nießbrauch, Wohnungsrecht, Leibrente: amtliche Sterbetafel (js/sterbetafel.js, Statistisches Bundesamt).
   restLeben: fernere Lebenserwartung ex im vollendeten Alter (ab 100: Wert für 100); ohne Alter 0.
   leibrentenfaktor: Barwert einer monatlich vorschüssigen Zahlung von 1 je Jahr auf Lebenszeit,
   ä(12)x ≈ ax + 13/24 mit ax = Σ v^t · l(x+t)/l(x) (Woolhouse); über 100 Jahre mit der Überlebens-
   wahrscheinlichkeit des Alters 100 fortgesetzt. */
function tafelFuer(g){ return Tafel&&Tafel.tafel?Tafel.tafel[g==='m'?'m':'w']:null; }
function restLeben(alter,g){
  const t=tafelFuer(g); if(!t||!(alter>0)) return 0;
  return t.ex[Math.min(Math.floor(alter),t.ex.length-1)];
}
function leibrentenfaktor(alter,g,zinsPct){
  const t=tafelFuer(g); if(!t||!(alter>0)) return 0;
  const x=Math.min(Math.floor(alter),t.lx.length-1), max=t.lx.length-1, p100=1-t.qx[max], v=1/(1+Math.max(zinsPct,0)/100);
  const l=a=>a<=max?t.lx[a]:t.lx[max]*Math.pow(p100,a-max);
  let a=0, vt=1;
  for(let k=1;k<=200;k++){ vt*=v; const term=vt*l(x+k)/l(x); a+=term; if(term<1e-12) break; }
  return a+13/24;
}



/* ---------- Finanzierung und Investition ---------- */
function finTilgungsverlauf(betrag, zinsPct, tilgPct, sonderJahr, maxJahre){
  let rate=betrag*(zinsPct+tilgPct)/100/12;
  let rest=betrag, zinsSumme=0, jahre=[], monate=0, tilgt=true;
  const leer={rate:0, jahre:[], monate:0, zinsSumme:0, tilgt:true, restNach:()=>0, zinsBis:()=>0};
  if(!(betrag>0)||!(rate>0)) return leer;
  for(let j=1;j<=(maxJahre||60)&&rest>0.01;j++){
    let zinsJahr=0, tilgJahr=0, start=rest;
    for(let m=0;m<12&&rest>0.01;m++){
      let z=rest*zinsPct/100/12;
      let t=rate-z;
      zinsJahr+=z; monate++;
      if(t<=0.005){ tilgt=false; continue; }   /* Rate deckt nur die Zinsen: keine Tilgung */
      t=Math.min(t,rest); tilgJahr+=t; rest-=t;
    }
    let sonder=Math.min(sonderJahr||0, rest);
    if(sonder>0){ rest-=sonder; tilgJahr+=sonder; }
    zinsSumme+=zinsJahr;
    jahre.push({jahr:j, start:start, zins:zinsJahr, tilgung:tilgJahr, sonder:sonder, ende:rest});
    if(rest<=0.01) break;
    if(!tilgt) break;   /* ohne Tilgung bringen weitere Jahre keine Erkenntnis */
  }
  return {rate:rate, jahre:jahre, monate:monate, zinsSumme:zinsSumme, tilgt:tilgt,
    restNach:j=>{ if(j<=0)return betrag; let e=jahre.find(x=>x.jahr===j); return e?e.ende:(jahre.length?jahre[jahre.length-1].ende:betrag); },
    zinsBis:j=>{ let bis=jahre.filter(x=>x.jahr<=j); let s=bis.reduce((a,x)=>a+x.zins,0);
      /* laeuft das Darlehen ohne Tilgung, gelten die Zinsen des letzten Jahres fort */
      if(!tilgt&&jahre.length&&j>jahre.length) s+=jahre[jahre.length-1].zins*(j-jahre.length);
      return s; }};
}
function finBudgetRechnen(e){
  let ein=(e.netto||0)+(e.sonst||0), leben=Math.max(0,e.erw||0)*(e.pErw||0)+Math.max(0,e.kinder||0)*(e.pKind||0);
  let rate=ein-leben-(e.raten||0)-(e.wohnen||0)-(e.puffer||0), zt=((e.zins||0)+(e.tilgung||0))/100;
  let darlehen=rate>0&&zt>0?rate*12/zt:0;
  let maxKp=Math.max(0,(darlehen+(e.ek||0)-(e.mod||0))/(1+(e.nkPct||0)/100));
  return {ein,leben,rate,darlehen,maxKp,quote:ein>0?rate/ein*100:0};
}
function ivIrr(cfs){
  const npv=r=>cfs.reduce((s,c,t)=>s+c/Math.pow(1+r,t),0);
  let lo=-0.99, hi=1, flo=npv(lo), fhi=npv(hi);
  if(!isFinite(flo)||!isFinite(fhi)||flo*fhi>0){ hi=10; fhi=npv(hi); if(flo*fhi>0) return null; }
  for(let i=0;i<200;i++){ let mid=(lo+hi)/2, f=npv(mid); if(Math.abs(f)<1e-9) return mid; if(flo*f<0){ hi=mid; fhi=f; } else { lo=mid; flo=f; } }
  return (lo+hi)/2;
}
function ivAfaSatz(baujahr){ return baujahr>0&&baujahr<1925?2.5:baujahr>=2023?3:2; }
function ivModell(p){
  let n=Math.max(1,Math.min(30,Math.round(p.jahre||10))), ak=p.kp+(p.nk||0)+(p.san||0), ek=Math.max(0,p.ek||0);
  let D0=Math.max(0,ak-ek), a=finTilgungsverlauf(D0,p.zins||0,p.tilg||0,0,60);
  let afaBasis=(p.kp+(p.nk||0))*(p.gebAnteil||0)+(p.san||0), afaJahr=afaBasis*(p.afa||0)/100, st=(p.steuer||0)/100;
  let jahre=[], afaSumme=0, letzte=a.jahre.length?a.jahre[a.jahre.length-1]:null;
  for(let t=1;t<=n;t++){
    let e=a.jahre[t-1]||(a.tilgt||!letzte?{zins:0,tilgung:0,ende:0}:{zins:letzte.zins,tilgung:0,ende:letzte.ende});
    let miete=p.roh*Math.pow(1+(p.mietPa||0)/100,t-1), kosten=p.kosten*Math.pow(1+(p.kostenPa||0)/100,t-1);
    let afa=Math.min(afaJahr,Math.max(0,afaBasis-afaSumme)); afaSumme+=afa;
    let cfVor=miete-kosten-e.zins-e.tilgung, ergebnis=miete-kosten-e.zins-afa, steuer=ergebnis*st;
    jahre.push({t,miete,kosten,zins:e.zins,tilgung:e.tilgung,cfVor,afa,ergebnis,steuer,cfNach:cfVor-steuer,rest:e.ende,wert:p.kp*Math.pow(1+(p.wertPa||0)/100,t)});
  }
  let L=jahre[n-1], V=L.wert, vk=V*(p.verkaufPct||0)/100;
  let gewinn=V-vk-(ak-afaSumme), frei=n>=10, steuerVerk=frei?0:Math.max(0,gewinn)*st;
  let erloes=V-vk-L.rest-steuerVerk, erloesVor=V-vk-L.rest;
  let cfN=[-ek].concat(jahre.map(j=>j.cfNach)), cfV=[-ek].concat(jahre.map(j=>j.cfVor)), cfG=[-ak].concat(jahre.map(j=>j.miete-j.kosten));
  cfN[n]+=erloes; cfV[n]+=erloesVor; cfG[n]+=V-vk;
  let summeNach=jahre.reduce((s,j)=>s+j.cfNach,0), kd1=jahre[0].zins+jahre[0].tilgung;
  let plus=jahre.find(j=>j.cfNach>=0);
  return {n,ak,ek,D0,rate:a.rate,afaBasis,afaJahr,afaSumme,jahre,V,vk,gewinn,frei,steuerVerk,erloes,restN:L.rest,
    irrNach:ek>0?ivIrr(cfN):null,irrVor:ek>0?ivIrr(cfV):null,irrGesamt:ivIrr(cfG),
    dscr:kd1>0?(jahre[0].miete-jahre[0].kosten)/kd1:null,summeNach,zuwachs:summeNach+erloes-ek,multiple:ek>0?(summeNach+erloes)/ek:null,plusAb:plus?plus.t:null};
}

const eur=n=>(Math.round(n||0)).toLocaleString('de-DE')+' €';
const num2=n=>(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});

/* ---------- Bewertung: alle Verfahren in einem Durchlauf, ohne DOM ----------------------------------
   e  = Eingaben:  e.n(id) Zahl, e.v(id) Text/Auswahl, e.an(id) Schalter an/aus
   k  = Umgebung:  k.jahr (Bezugsjahr für das Gebäudealter), k.szen {lz, miete} (Sensitivität),
                   k.enManuell (Effizienzklasse von Hand gewählt)
   Rückgabe: {R, D} — R sind die Ergebnisse (dieselben Namen wie window._R), D sind Details für die Anzeige.
   Die Formeln sind unverändert aus compute() übernommen; Änderungen nur mit Quelle und Test. */
const ANZAHL={gesch:6,vgl:8,wk:14,mietrolle:14,msp:5};

function bgfRechnen(e,prefix){
  let geschosse=[], summe=0;
  for(let i=0;i<ANZAHL.gesch;i++){
    let f=e.n(prefix+'_l'+i)*e.n(prefix+'_b'+i)+e.n(prefix+'_e'+i);
    geschosse.push(f); summe+=f;
  }
  return {summe,geschosse};
}
function extras(e,prefix,max){ let s=0; for(let i=1;i<=max;i++) s+=e.n(prefix+i+'_val'); return s; }
function modPunkte(e){ let s=0; MOD_ELEMENTS.forEach((el,i)=>{ s+=Math.min(Math.max(e.n('mod_p'+i),0),el[1]); }); return s; }
/* NHK-Basiswerte „655, 725, 835, 1005, 1260“ (Stufe 1–5) */
function nhkBasis(text){
  let b=(''+(text||'')).split(/[,;]+/).map(x=>parseFloat(x.trim().replace(',','.'))).filter(x=>!isNaN(x));
  return b.length<5?[615,685,785,945,1180]:b;
}
function nhkRechnen(e,prefix,baujahr,punkte,jahr){
  let basis=nhkBasis(e.v(prefix+'_base')), nhk=0, k=[];
  NHK_ELEMENTS.forEach((el,i)=>{ let s=e.n(prefix+'_s'+i)||3; let w=el[1]*interp(basis,s); k.push(w); nhk+=w; });
  let gnd=e.n(prefix+'_gnd')||80;
  let alter=(baujahr>0)?Math.max(jahr-baujahr,0):0;
  let rndEingabe=e.n(prefix+'_rnd');
  let rnd=rndEingabe>0?rndEingabe:computeRND(alter,gnd,punkte);
  let wm=gnd>0?Math.min(Math.max((gnd-rnd)/gnd,0),1):0;
  let bpi=e.n('bpi')||100, fak=e.n('bpi_faktor')||1, reg=e.n('nhk_regional')||1;
  let nhkHeute=nhk*fak*bpi/100*reg;
  let preis=nhkHeute*(1-wm);
  return {erg:{preis,rnd,gnd},detail:{k,nhk,nhkHeute,wm,alter,rndManuell:rndEingabe>0}};
}
function mietrolleRechnen(e){
  let zeilen=[], summe=0;
  for(let i=0;i<ANZAHL.mietrolle;i++){ let pa=(e.n('mr_fl'+i)*e.n('mr_pm2'+i)+e.n('mr_pau'+i))*12; zeilen.push(pa); summe+=pa; }
  return {summe,zeilen};
}
function vergleichRechnen(e){
  let zeilen=[], sum=0, anz=0;
  for(let i=0;i<ANZAHL.vgl;i++){
    let fl=e.n('vgl_fl'+i), kp=e.n('vgl_kp'+i), m2=(fl>0&&kp>0)?kp/fl:0;
    zeilen.push(m2); if(m2>0){ sum+=m2; anz++; }
  }
  return {avg:anz>0?sum/anz:0,anz,zeilen};
}
const MSP_QUELLEN=['Mietspiegel der Gemeinde','Recherche ImmoScout24','Marktbericht / Gutachterausschuss','Eigene Vermietungsdaten','Weitere Quelle'];
function mietspiegelRechnen(e){
  let sum=0, anz=0, zeilen=[];
  MSP_QUELLEN.forEach((q,i)=>{
    let mn=e.n('msp_min'+i), mx=e.n('msp_max'+i), av=e.n('msp_avg'+i);
    let eff=av>0?av:((mn>0&&mx>0)?(mn+mx)/2:0);
    if(eff>0){ sum+=eff; anz++; zeilen.push({q:(e.v('msp_q'+i)||q),mn,mx,av:eff}); }
  });
  return {avg:anz>0?sum/anz:0,zeilen};
}

function bewerte(e,k){
  k=k||{};
  const szen=k.szen||{lz:0,miete:1}, jahr=k.jahr||new Date().getFullYear();
  const D={};
  let istWohnung=e.v('ek_modus')==='wohnung';
  D.istWohnung=istWohnung;
  // Bodenwert (Anteil I + optionale Anteile II/III) — bei Wohnung im Vergleichspreis enthalten
  let bodenwert=0;
  if(!istWohnung){
    bodenwert=e.n('ek_gs_flaeche')*e.n('ek_brw')*(1-e.n('ek_gs_abschlag')/100);
    bodenwert+=e.n('xgs1_flaeche')*e.n('xgs1_brw')*(1-e.n('xgs1_abschlag')/100);
    bodenwert+=e.n('xgs2_flaeche')*e.n('xgs2_brw')*(1-e.n('xgs2_abschlag')/100);
  }
  // BGF
  let bgfH=bgfRechnen(e,'bgfhg'), bgfHG=bgfH.summe;
  let anbauAktiv=e.an('anbau_aktiv');
  let bgfA=anbauAktiv?bgfRechnen(e,'bgfan'):null, bgfAN=anbauAktiv?bgfA.summe:0;
  D.bgfHG=bgfH; D.bgfAN=bgfA; D.anbauAktiv=anbauAktiv;
  // Modernisierungspunkte → Restnutzungsdauer (ImmoWertV Anlage 2), NHK
  let modP=modPunkte(e);
  let gndHG=e.n('nhkhg_gnd')||80;
  let alterHG=(e.n('ek_baujahr')>0)?Math.max(jahr-e.n('ek_baujahr'),0):0;
  D.gndHG=gndHG; D.alterHG=alterHG;
  let nhkH=nhkRechnen(e,'nhkhg',e.n('ek_baujahr'),modP,jahr), hg=nhkH.erg;
  let nhkA=anbauAktiv?nhkRechnen(e,'nhkan',e.n('an_baujahr'),modP,jahr):null;
  let an=anbauAktiv?nhkA.erg:{preis:0,rnd:0,gnd:0};
  D.nhkHG=nhkH.detail; D.nhkAN=nhkA?nhkA.detail:null;
  let rndModHG=hg.rnd;
  // 5.1 / 5.2
  let hgGeb=bgfHG*hg.preis;
  let hgVor=hgGeb+e.n('hg_aussen')+e.n('hg_garage')+extras(e,'xhg',3);
  let anGeb=bgfAN*an.preis;
  let anVor=anbauAktiv?anGeb+e.n('an_aussen')+extras(e,'xan',2):0;
  D.hgGeb=hgGeb; D.anGeb=anGeb;
  // 5.3 Substanz (Haus) bzw. Vergleichswert (Wohnung)
  let mf=e.n('markt_faktor')||1;
  let vorlauf=bodenwert+hgVor+anVor;
  let nachMA=vorlauf*mf;
  D.vergleich=vergleichRechnen(e);
  let mspData=mietspiegelRechnen(e);
  let wfl=e.n('ek_wohnflaeche');
  let vwGeb=wfl*e.n('vw_preis');
  let vergleichWert=vwGeb+e.n('vw_garage')+e.n('vw_sonst')+extras(e,'xvw',3);
  D.wfl=wfl; D.vwGeb=vwGeb;
  let vwAktiv=!istWohnung&&e.an('vw_aktiv');
  let substanz=istWohnung?vergleichWert:nachMA+e.n('sub_zuschlag')+e.n('sub_abschlag')+extras(e,'xsub',3);
  // PV-Anlage (Barwert Solarertrag)
  let pvAktiv=e.an('pv_aktiv');
  let pvRoh=e.n('pv_ertrag_kwh')*e.n('pv_erloes');
  let pvBew=pvRoh*e.n('pv_bewirt')/100;
  let pvRein=pvRoh-pvBew;
  let pvVf=barwertfaktor(e.n('pv_zins'),e.n('pv_rnd'));
  let pvPotential=Math.max(pvRein*pvVf,0);
  let pvWert=pvAktiv?(e.v('pv_basis')==='enthalten'?0:e.v('pv_basis')==='teilweise'?e.n('pv_markt_ansatz'):pvPotential):0;
  D.pvPotential=pvPotential;
  D.pvAktiv=pvAktiv; D.pvRoh=pvRoh; D.pvBew=pvBew;
  // 6 Ertrag (Bodenwert unangepasst = BRW; kein Sachwertfaktor im Ertragswertverfahren)
  let bodenMA=bodenwert*mf;
  let effLZ=e.n('er_zins_basis')+e.n('er_zins_adj')+szen.lz;
  let mietrolleAktiv=e.an('er_mietrolle');
  let mr=mietrolleRechnen(e), mrSumme=mr.summe;
  D.mietrolle=mr;
  let mieteW=e.n('ek_miete_wohnen')*szen.miete, mieteG=e.n('ek_miete_gewerbe')*szen.miete, stell=e.n('ek_miete_stellplatz')*szen.miete;
  let roh=(mietrolleAktiv?mrSumme*szen.miete:(mieteW+mieteG+stell));
  D.mieteW=mieteW; D.mieteG=mieteG;
  // Bewirtschaftungskosten: pauschal % oder detailliert nach § 32
  let bwDetail=e.an('er_bwmodus');
  let anzWE=e.n('ek_anz_we'), anzSP=e.n('ek_anz_stell'), wohnfl=e.n('ek_wohnflaeche');
  let bewirt, bwQuelle;
  if(bwDetail){
    let verw=anzWE*e.n('er_bw_verw_we')+anzSP*e.n('er_bw_verw_sp');
    let inst=wohnfl*e.n('er_bw_inst_m2')+anzSP*e.n('er_bw_inst_sp');
    let mausf=roh*e.n('er_bw_mietausfall')/100;
    let nuk=e.n('er_bw_nuk');
    bewirt=verw+inst+mausf+nuk;
    bwQuelle={art:'detail',verw,inst,mausf,nuk};
  } else if(istWohnung&&e.n('ek_hausgeld_nu')>0){
    bewirt=e.n('ek_hausgeld_nu')*12; bwQuelle={art:'hausgeld'};
  } else {
    bewirt=roh*e.n('er_bewirt')/100; bwQuelle={art:'pauschal',pct:e.n('er_bewirt')};
  }
  D.bwQuelle=bwQuelle;
  let nachBew=roh-bewirt;
  let gew=nachBew*e.n('er_gewerbe')/100;
  let grundRein=nachBew-gew;
  let bodenZins=bodenwert*effLZ/100;
  let gebRein=grundRein-bodenZins;
  let erRND=(istWohnung&&e.n('er_rnd_override')>0)?e.n('er_rnd_override'):hg.rnd;
  /* Mietertrag je Gebäude (D33) wie im Vordruck der Bank (Bank- und Lagergebäude Gronau, js/jahresbewertung.js): Der dem
     Anbau zugeordnete Teil des Rohertrags trägt Bewirtschaftung, Abschlag und Bodenwert(-verzinsung) nach seinem
     Mietanteil und wird mit der Restnutzungsdauer des Anbaus kapitalisiert, der Rest mit der des Hauptgebäudes. Ohne
     Miete für den Anbau ist der Anteil des Hauptgebäudes genau 1 — das Ergebnis bleibt wie bisher. */
  let anRoh=(!istWohnung&&anbauAktiv)?Math.min(Math.max(e.n('er_miete_anbau')*szen.miete,0),Math.max(roh,0)):0;
  let anAnteil=roh>0?anRoh/roh:0, hgAnteil=1-anAnteil;
  let vfHG=barwertfaktor(effLZ,erRND), vfAN=anAnteil>0?barwertfaktor(effLZ,an.rnd):0;
  let gebReinHG=gebRein*hgAnteil, gebReinAN=gebRein*anAnteil;
  let gebWertHG=gebReinHG*vfHG, gebWertAN=gebReinAN*vfAN;
  let vf=hgAnteil*vfHG+anAnteil*vfAN;   // Vervielfältiger nach Mietanteil gewichtet
  let gebWert=gebWertHG+gebWertAN;
  let erGeb=anAnteil>0?{anteilHG:hgAnteil,anteilAN:anAnteil,rohHG:roh-anRoh,rohAN:anRoh,bodenHG:bodenwert*hgAnteil,bodenAN:bodenwert*anAnteil,
    gebReinHG,gebReinAN,rndHG:erRND,rndAN:an.rnd,vfHG,vfAN,gebWertHG,gebWertAN}:null;
  let ertrag=gebWert+e.n('er_aussen')+e.n('er_objekt')+extras(e,'xer',3)+bodenwert;
  D.gew=gew; D.bodenZins=bodenZins;
  // 7 Nießbrauch / Wohnrecht / Leibrente
  let niessAktiv=e.an('niess_aktiv');
  let niArt=e.v('ni_art');
  let istRente=niArt==='leibrente', istWohnrecht=niArt==='wohnrecht';
  let niMiete=e.n('ni_miete')>0?e.n('ni_miete'):(e.v('ni_umfang')==='gesamt'?(mieteW+mieteG):0);
  let niGr=e.n('ni_grundst')>0?e.n('ni_grundst'):(e.v('ni_umfang')==='gesamt'?e.n('ek_grundsteuer'):0);
  let niNuk=niMiete*e.n('ni_nuk')/100;
  let niRein;
  if(istRente)          niRein=e.n('ni_rente')*12;
  else if(istWohnrecht) niRein=niMiete-niNuk;
  else                  niRein=niMiete-niGr-niNuk;
  /* Laufzeit: amtliche Sterbetafel (Leibrentenbarwertfaktor) oder eigene Laufzeit (Zeitrente); ein eingetragener
     Kapitalisierungsfaktor hat Vorrang. Ohne Auswahl (ältere Daten): eigene Laufzeit, sofern eingetragen. */
  let niQuelle=e.v('ni_laufzeit')==='eigen'||e.v('ni_laufzeit')==='sterbetafel'?e.v('ni_laufzeit'):(e.n('ni_leben')>0?'eigen':'sterbetafel');
  let leben=niQuelle==='eigen'?e.n('ni_leben'):restLeben(e.n('ni_alter'),e.v('ni_geschlecht'));
  let kw=e.n('ni_kapwert'), kwArt='eingetragen';
  if(kw<=0){ if(niQuelle==='eigen'){ kw=barwertfaktor(e.n('ni_zins'),leben); kwArt='zeitrente'; }
    else { kw=leibrentenfaktor(e.n('ni_alter'),e.v('ni_geschlecht'),e.n('ni_zins')); kwArt='leibrente'; } }
  D.niQuelle=niQuelle; D.niKwArt=kwArt; D.sterbetafel=Tafel?Tafel.zeitraum:'';
  let niSzenarioWert=niessAktiv?Math.max(niRein*kw,0)+extras(e,'xni',2):0;
  let niessWert=e.v('ni_wertart')==='steuer'?0:niSzenarioWert;D.niSzenarioWert=niSzenarioWert;
  Object.assign(D,{niessAktiv,istRente,istWohnrecht,niMiete,niGr,niNuk,leben});
  // 7c Erbbaurecht
  let ebAktiv=!istWohnung&&e.an('eb_aktiv');
  let ebVpct=e.n('eb_verzinsung')>0?e.n('eb_verzinsung'):effLZ;
  let ebVz=bodenwert*ebVpct/100;
  let ebZins=e.n('eb_zins_eur');
  let ebVorteil=ebVz-ebZins;
  let ebVf=barwertfaktor(ebVpct,e.n('eb_restlaufzeit'));
  let ebBarwert=ebVorteil*ebVf;
  let ebRoh=bodenwert-ebBarwert;                       // Abzug vom Volleigentumswert
  let ebAbsch=ebRoh*e.n('eb_abschlag')/100;
  let erbbauAbzug=ebAktiv?Math.max(ebRoh+ebAbsch,0):0;
  D.ebAbsch=ebAbsch;
  // 7d Wertkorrekturen § 8 Abs. 3
  // Abschläge positiv, Zuschläge (wk_art 'plus') mit umgekehrtem Vorzeichen; ohne Art wie früher (negativ = Zuschlag).
  // Abschnitt ausgeschaltet (wk_aus): keine Zu- und Abschläge (D35)
  let wkSumme=0; if(!e.an('wk_aus')) for(let i=0;i<ANZAHL.wk;i++){ let v=e.n('wk_val'+i); wkSumme+=e.v('wk_art'+i)==='plus'?-Math.abs(v):v; }
  // 8 Empfehlung
  let g=parseFloat(e.v('gewichtung')); if(!(g>=0&&g<=1)) g=0.5;   /* fehlt die Auswahl: Standard 50 : 50 */
  let mittelBasis=g*substanz+(1-g)*ertrag;
  let gv=vwAktiv?Math.min(Math.max(e.n('gew_vergleich'),0),100)/100:0;
  let mittel=vwAktiv?((1-gv)*mittelBasis+gv*vergleichWert):mittelBasis;
  // Energetische Qualität (§ 8 Abs. 3 ImmoWertV)
  let enAktiv=e.an('en_aktiv'), enModus=e.v('en_modus');
  let enKennwert=e.n('en_kennwert');
  let enKlasse=(enKennwert>0&&!k.enManuell)?enKlasseAusKennwert(enKennwert):e.v('en_klasse');
  let enRefKlasse=e.v('en_ref_klasse');
  let enStufen=enIdx(enKlasse)-enIdx(enRefKlasse);   /* positiv = schlechter als Referenz */
  let enRefKw=enRefKennwert(enRefKlasse);
  let enMehrKwh=0, enMehrJahr=0, enVf=0, enPct=0, energieWert=0;
  if(enModus==='kosten'){
    enMehrKwh=(enKennwert>0?enKennwert-enRefKw:0)*e.n('ek_wohnflaeche');
    enMehrJahr=enMehrKwh*e.n('en_preis_kwh');
    enVf=barwertfaktor(e.n('en_zins'),e.n('en_jahre'));
    D.enKostenBarwert=-enMehrJahr*enVf;
    energieWert=enAktiv?e.n('en_markt_ansatz'):0;
  } else {
    enPct=-enStufen*e.n('en_pct_stufe');
    energieWert=enAktiv?mittel*enPct/100:0;
  }
  if(e.v('en_basis')==='enthalten')energieWert=0;
  if(enAktiv&&e.v('en_basis')==='teilweise')energieWert=e.n('en_markt_ansatz');
  D.enKlasse=enKlasse; D.enRefKlasse=enRefKlasse;
  let empfehlung=mittel+pvWert+energieWert-niessWert-erbbauAbzug-wkSumme+extras(e,'xemp',2);
  let vh=e.n('verhandlung')/100;
  // Beleihungswert nach BelWertV
  const bw=Modell.beleihung(e);
  const {bwAktiv,bwErtrag,bwSachwert,bwAusgang,bwAbschlagP,bwAbschlagBetrag,bwZins,bwZinsMin,bwRnd,bwVf,bwRoh,bwBewirt,bwRein,bwGebRein,bwHerstell,bwSicherP,bwSicherBetrag,bwAnsatz,beleihungswert}=bw.R;
  Object.assign(D,bw.D);
  // Plausibilisierung (Ergebnis €/m² gegen Marktbericht)
  let wf=e.n('ek_wohnflaeche');
  let flaecheGes=wf+e.n('ek_nutzflaeche');
  let eigenM2=flaecheGes>0?empfehlung/flaecheGes:0;
  let marktM2=e.n('pl_markt');
  let plAbw=(eigenM2>0&&marktM2>0)?(eigenM2-marktM2)/marktM2*100:null;
  let plTxt;
  if(flaecheGes<=0) plTxt='Wohn-/Nutzfläche in ① eintragen, damit der Preis je m² berechnet werden kann.';
  else if(marktM2<=0) plTxt='Vergleichspreis eintragen für die Plausibilitätsprüfung.';
  else {
    let a=Math.abs(plAbw), ri=plAbw<0?'unter':'über', q=e.v('pl_quelle');
    plTxt='Der ermittelte Preis liegt '+num2(a)+' % '+ri+' dem Vergleichspreis'+(q?' ('+q+')':'')+'. '
      +(a<=10?'Die Abweichung ist gering — das Ergebnis ist marktkonform und plausibel.'
        :a<=25?'Die Abweichung ist erklärungsbedürftig, aber im Rahmen objektspezifischer Besonderheiten (Zustand, Lage, Belastungen) vertretbar.'
        :'Die Abweichung ist erheblich — Ansätze (Miete, Liegenschaftszins, Marktanpassung, Wertkorrekturen) bitte nochmals prüfen und im Bericht begründen.');
  }
  D.flaecheGes=flaecheGes;
  // 9b Rendite & Investitionskosten
  let reKP=e.n('re_kaufpreis')>0?e.n('re_kaufpreis'):empfehlung;
  let nkPct=e.n('re_grest')+e.n('re_notar')+e.n('re_makler');
  let reNK=reKP*nkPct/100;
  let reSan=e.n('re_sanierung');
  let reInvest=reKP+reNK+reSan;
  let reNUK=e.n('re_nuk')>0?e.n('re_nuk'):bewirt;
  let reRein=roh-reNUK;
  let reBrutto=reKP>0?roh/reKP*100:0;
  let reNetto=reInvest>0?reRein/reInvest*100:0;
  let reFaktor=roh>0?reKP/roh:0;

  const R={bodenwert,bgfHG,bgfAN,hg,an,hgVor,anVor,vorlauf,nachMA,substanz,roh,grundRein,gebRein,vf,gebWert,erGeb,ertrag,bodenMA,niessWert,niRein,kw,mittel,empfehlung,mf,g,vh,pvWert,pvRein,pvVf,beleihungswert,bwAktiv,bwErtrag,bwSachwert,bwAusgang,bwAbschlagP,bwAbschlagBetrag,bwZins,bwZinsMin,bwRnd,bwVf,bwRoh,bwBewirt,bwRein,bwGebRein,bwHerstell,bwSicherP,bwSicherBetrag,bwAnsatz,energieWert,enAktiv,enModus,enStufen,enPct,enMehrKwh,enMehrJahr,enVf,enKennwert,enRefKw,modPunkte:modP,rndModHG,erRND,effLZ,bewirt,mietrolleAktiv,mrSumme,bwDetail,anzWE,anzSP,
    eigenM2,marktM2,plAbw,plTxt,reKP,nkPct,reNK,reSan,reInvest,reRein,reBrutto,reNetto,reFaktor,
    vergleichWert,vwAktiv,gv,mittelBasis,erbbauAbzug,ebAktiv,ebVpct,ebVz,ebZins,ebVorteil,ebVf,ebBarwert,
    wkSumme,niArt,mspData};
  return {R,D};
}

/* ---------- Eingabeprüfung ---------------------------------------------------------------------------
   Ungültige oder unvollständige Eingaben dürfen nicht unbemerkt als plausible Bewertung erscheinen.
   pruefen() meldet je Feld: keine gültige Zahl, unzulässig negativ, Prozent über 100 — und für das Ergebnis:
   fehlende Mindestangaben und nicht belastbare Werte. Status: 'ok' | 'unvollstaendig' | 'fehler'.
   Die Feldliste kommt aus dem Protokoll des Lesers: geprüft wird genau, was die Rechnung gelesen hat. */
function zahlGueltig(s){
  if(s==null) return true;
  if(typeof s==='number') return isFinite(s);
  s=(''+s).replace(/[−‒–]/g,'-').trim();
  if(s==='') return true;
  s=s.replace(/^ca\.?\s*/i,'');
  for(let i=0;i<2;i++) s=s.replace(/\s*(€\/m²|€|EUR|%|m²|m2|m³|kWh|Jahre|J\.?|p\.\s?a\.|\/Jahr|\/Monat)\s*$/i,'').trim();
  s=s.replace(/(\d)\s+(?=\d{3}(\D|$))/g,'$1');
  return /^-?\s?(\d{1,3}(\.\d{3})+(,\d+)?|\d+([.,]\d+)?[.,]?|[.,]\d+)$/.test(s);
}
function protokollLeser(e){
  const gelesen=new Set();
  return {gelesen, leser:{n:id=>{ gelesen.add(id); return e.n(id); }, v:e.v, an:e.an}};
}
const NICHT_NEGATIV=/^(ek_gs_flaeche|ek_brw|xgs[12]_(flaeche|brw)|ek_wohnflaeche|ek_nutzflaeche|bgf(hg|an)_[lbe]\d|ek_baujahr|an_baujahr|ek_miete_\w+|er_miete_anbau|mr_(fl|pm2|pau)\d+|vw_(preis|garage)|pv_\w+|ni_(alter|leben|zins|miete|rente|grundst|kapwert|nuk)|eb_(restlaufzeit|zins_eur|verzinsung|abschlag)|nhk(hg|an)_(gnd|rnd|s\d)|markt_faktor|bpi|bpi_faktor|nhk_regional|verhandlung|gew_vergleich|er_bw_\w+|er_bewirt|er_gewerbe|er_zins_basis|ek_anz_\w+|bw_\w+|re_\w+|ek_hausgeld\w*|ek_grundsteuer|en_(kennwert|preis_kwh|jahre|zins|pct_stufe)|mod_p\d|vgl_(fl|kp)\d|msp_(min|max|avg)\d)$/;
const PROZENT_MAX=/^(ek_gs_abschlag|xgs[12]_abschlag|er_bewirt|er_gewerbe|er_bw_mietausfall|pv_bewirt|ni_nuk|eb_abschlag|bw_bewirt|bw_sicher|bw_besichtigung|bw_abschlag|gew_vergleich|verhandlung|re_grest|re_notar|re_makler)$/;
function pruefen(e,R,D,gelesen){
  const h=[], fehlend=[];
  const sachAnteil=D.istWohnung?0:R.g*(1-R.gv),ertragsAnteil=(1-R.g)*(1-R.gv),vergleichAnteil=D.istWohnung?R.g:R.gv;
  const kurz=s=>{ s=(''+s).trim(); return s.length>24?s.slice(0,22)+'…':s; };
  (gelesen?[...gelesen]:[]).filter(id=>!(sachAnteil===0&&/^(bgf|nhk(?:hg|an)_(?:base|s\d)|hg_(?:aussen|garage)|markt_faktor|bpi)/.test(id))&&!id.startsWith('bw_')&&!((id.startsWith('ni_')&&!e.an('niess_aktiv'))||(id.startsWith('pv_')&&!e.an('pv_aktiv'))||(id.startsWith('en_')&&!e.an('en_aktiv'))||(id.startsWith('eb_')&&!e.an('eb_aktiv')))).forEach(id=>{
    let roh=e.v(id);
    if(!zahlGueltig(roh)){ h.push({feld:id,stufe:'fehler',art:'zahl',text:'„'+kurz(roh)+'“ ist keine gültige Zahl — gerechnet würde mit '+num2(e.n(id))+'.'}); return; }
    let x=e.n(id);
    if(x<0&&NICHT_NEGATIV.test(id)) h.push({feld:id,stufe:'fehler',art:'negativ',text:'darf nicht negativ sein ('+num2(x)+').'});
    else if(x>100&&PROZENT_MAX.test(id)) h.push({feld:id,stufe:'fehler',art:'prozent',text:'über 100 % ('+num2(x)+' %).'});
  });
  let basisTxt=(e.v('nhkhg_base')||'').trim();
  if(basisTxt&&!D.istWohnung&&sachAnteil>0){
    let b=basisTxt.split(/[,;]+/).map(x=>parseFloat(x.trim().replace(',','.'))).filter(x=>!isNaN(x));
    if(b.length<5) h.push({feld:'nhkhg_base',stufe:'fehler',art:'nhk',text:'Kostenkennwerte unvollständig (5 Werte für Stufe 1–5 nötig) — es würde mit Rückfallwerten gerechnet.'});
    else if(b.some(x=>x<100)) h.push({feld:'nhkhg_base',stufe:'fehler',art:'nhk',text:'Kostenkennwert unter 100 €/m² — Tausenderpunkt? Werte ohne Punkt eintragen (z. B. 1005).'});
  }
  /* Modellgrenze der Anlage 2: Alter über der Gesamtnutzungsdauer (siehe computeRND) */
  if(!D.istWohnung&&(sachAnteil>0||ertragsAnteil>0)&&D.nhkHG&&!D.nhkHG.rndManuell&&D.nhkHG.alter>D.gndHG){
    let hoch=R.hg.rnd>0.7*D.gndHG;
    h.push({feld:'nhkhg_rnd',stufe:hoch?'fehler':'warn',art:'rnd',text:'Das Gebäude ist älter ('+D.nhkHG.alter+' J) als die Gesamtnutzungsdauer ('+num2(D.gndHG)+' J). Die Anlage 2 regelt diesen Bereich nicht eindeutig; die Formel ergibt '
      +num2(R.hg.rnd)+' J'+(hoch?' — mehr als die im Modell vorgesehenen 70 % der GND':'')+'. Restnutzungsdauer sachverständig prüfen und in 2.2 von Hand eintragen.'});
  }
  if(R.bodenwert<0) h.push({feld:'ek_brw',stufe:'fehler',art:'ergebnis',text:'Der Bodenwert ist negativ ('+eur(R.bodenwert)+').'});
  /* Mietertrag je Gebäude (D33): der Anbau-Anteil ist ein Teil des Rohertrags */
  if(!D.istWohnung&&D.anbauAktiv&&e.n('er_miete_anbau')>0&&e.n('er_miete_anbau')>R.roh+0.005)
    h.push({feld:'er_miete_anbau',stufe:'warn',art:'anbau',text:'Der Anteil des Anbaus ('+eur(e.n('er_miete_anbau'))+') ist größer als der Rohertrag ('+eur(R.roh)+') — gerechnet wird mit dem ganzen Rohertrag beim Anbau.'});
  /* Mindestangaben für eine Preisempfehlung */
  let g=R.g;
  if(D.istWohnung){
    if(!(D.wfl>0)) fehlend.push({feld:'ek_wohnflaeche',text:'Wohnfläche fehlt.'});
    if(g>0&&!(e.n('vw_preis')>0)) fehlend.push({feld:'vw_preis',text:'Vergleichspreis je m² fehlt — der Vergleichswert fließt mit '+Math.round(g*100)+' % ein.'});
  } else {
    if((sachAnteil>0||ertragsAnteil>0||e.an('eb_aktiv'))&&!(R.bodenwert>0)) fehlend.push({feld:'ek_gs_flaeche',text:'Bodenwert fehlt (Grundstücksfläche und Bodenrichtwert).'});
    if(sachAnteil>0&&!(R.bgfHG>0)) fehlend.push({feld:'bgfhg_e0',text:'Bruttogrundfläche fehlt — der Sachwert fließt mit '+Math.round(g*100)+' % ein.'});
  }
  if(ertragsAnteil>0&&!(R.roh>0)) fehlend.push({feld:'ek_miete_wohnen',text:'Keine Miete erfasst — der Ertragswert fließt mit '+Math.round((1-g)*100)+' % ein und bestünde nur aus dem Bodenwert.'});
  if(!isFinite(R.empfehlung)) h.push({feld:'gewichtung',stufe:'fehler',art:'ergebnis',text:'Die Preisempfehlung ist nicht berechenbar.'});
  else if(!fehlend.length&&R.empfehlung<=0) h.push({feld:'gewichtung',stufe:'fehler',art:'ergebnis',text:'Die Preisempfehlung ist nicht positiv ('+eur(R.empfehlung)+') — Abzüge und Eingaben prüfen.'});
  const modell=Modell.pruefePreis(e,R,D);h.push(...modell.hinweise);fehlend.push(...modell.fehlend);
  let fehler=h.filter(x=>x.stufe==='fehler').length;
  return {status:fehler?'fehler':fehlend.length?'unvollstaendig':'ok',hinweise:h,fehlend,fehler};
}

const ImmoKern={zahlLesen,interp,barwertfaktor,computeRND,restLeben,leibrentenfaktor,enKlasseAusKennwert,enIdx,enRefKennwert,
  EN_KLASSEN,NHK_ELEMENTS,MOD_ELEMENTS,RND_COEFF,MSP_QUELLEN,ANZAHL,finTilgungsverlauf,finBudgetRechnen,ivIrr,ivAfaSatz,ivModell,
  bewerte,pruefen,pruefeBeleihung:Modell.pruefeBeleihung,zahlGueltig,protokollLeser,bgfRechnen,nhkBasis,nhkRechnen,vergleichRechnen,mietspiegelRechnen,mietrolleRechnen,eur,num2};
wurzel.ImmoKern=ImmoKern;
if(typeof module==='object'&&module.exports) module.exports=ImmoKern;
else ['zahlLesen','interp','barwertfaktor','computeRND','restLeben','leibrentenfaktor','enKlasseAusKennwert','enIdx','enRefKennwert',
  'EN_KLASSEN','NHK_ELEMENTS','MOD_ELEMENTS','RND_COEFF','finTilgungsverlauf','finBudgetRechnen','ivIrr','ivAfaSatz','ivModell']
  .forEach(n=>{ wurzel[n]=ImmoKern[n]; });
})(typeof globalThis!=='undefined'?globalThis:this);
