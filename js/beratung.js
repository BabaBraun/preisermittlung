/* ImmoApp — Rechnungen der Beratungswerkzeuge (ohne DOM, in Node testbar), D38
   Jede Rechnung nennt ihre Quelle. Gesetzesstand Oktober 2026: ErbStG, BewG, BGB, GModG (seit 29.07.2026 statt GEG),
   ImmoWertV, am Wortlaut auf gesetze-im-internet.de geprüft; Annahmen (z. B. Zinsen,
   Wagnis und Gewinn) sind Eingaben und werden in der Oberfläche als Annahme gekennzeichnet.
   - Übergeben & Vererben: ErbStG §§ 10, 13, 13d, 14, 15, 16, 19, 22; BewG §§ 14, 16
   - Wohnen im Alter: Barwert von Leibrenten nach Sterbetafel (Statistisches Bundesamt), monatlich vorschüssig, Kredit mit Grundschuld,
     Gleichverteilung der Sterbefälle im Jahr; zwei Personen: Rente bis zum Tod des Letztversterbenden
   - Grundstückspotenzial: Bauträgerkalkulation (Residualwert); als Bodenwert nur deduktiv nach § 40 Abs. 3 ImmoWertV
   - ETW-Kaufcheck: Peters'sche Formel (Instandhaltung), Heizung nach GModG §§ 42a, 43 und VDI 2067 (Nutzungsdauer)
   - Mein Jahr: Provision bei Halbteilung, § 656c BGB
   - Notarauftrag (D39): Kalenderdatei nach RFC 5545; Frist für den Entwurf nach § 17 Abs. 2a Satz 2 Nr. 2 BeurkG
   - Datenstand (D39): Stand der Rechengrundlagen und Daten mit erwarteter nächster Veröffentlichung */
(function(wurzel){
'use strict';
const Tafel=typeof module==='object'&&module.exports?require('./sterbetafel.js'):wurzel.ImmoSterbetafel;

const zahl=x=>{ x=+x; return Number.isFinite(x)?x:0; };
const pos=x=>Math.max(0,zahl(x));
const anteil=x=>{ x=zahl(x); return x>1?x/100:Math.max(0,x); };   // 50 oder 0,5 → 0,5

/* ---------- Sterbetafel ---------- */
function tafelFuer(g,tafel){ const T=tafel||Tafel; return T&&T.tafel?T.tafel[g==='m'?'m':'w']:null; }
/* l(x) für ganze Alter; über 100 mit der Überlebenswahrscheinlichkeit des Alters 100 fortgesetzt (wie js/kern.js) */
function lx(t,a){ const max=t.lx.length-1; if(a<=max) return t.lx[a]; const p100=1-t.qx[max]; return t.lx[max]*Math.pow(p100,a-max); }
/* unterjährig: Gleichverteilung der Sterbefälle innerhalb eines Altersjahres */
function lxStetig(t,a){ const k=Math.floor(a), f=a-k; return lx(t,k)-f*(lx(t,k)-lx(t,k+1)); }

/* ========== Übergeben & Vererben ========== */
/* § 15 ErbStG (Steuerklassen), § 16 Abs. 1 ErbStG (persönliche Freibeträge) */
const ERB_VERHAELTNIS={
  ehegatte:{name:'Ehegatte / eingetragener Lebenspartner',klasse:1,freibetrag:500000},
  kind:{name:'Kind / Stiefkind',klasse:1,freibetrag:400000},
  enkel_kv:{name:'Enkel, dessen Elternteil verstorben ist',klasse:1,freibetrag:400000},
  enkel:{name:'Enkel',klasse:1,freibetrag:200000},
  urenkel:{name:'Urenkel',klasse:1,freibetrag:100000},
  eltern:{name:'Eltern / Großeltern',klasse:{schenkung:2,erbe:1},freibetrag:{schenkung:20000,erbe:100000}},
  geschwister:{name:'Geschwister',klasse:2,freibetrag:20000},
  nichte:{name:'Nichte / Neffe',klasse:2,freibetrag:20000},
  schwieger:{name:'Schwiegerkind / Schwiegereltern',klasse:2,freibetrag:20000},
  stiefeltern:{name:'Stiefeltern',klasse:2,freibetrag:20000},
  geschieden:{name:'Geschiedener Ehegatte / Lebenspartner',klasse:2,freibetrag:20000},
  sonstige:{name:'Andere Person (z. B. Lebensgefährte ohne Trauschein)',klasse:3,freibetrag:20000}
};
/* § 19 Abs. 1 ErbStG: Wertgrenze (einschließlich) und Steuersätze der Klassen I, II, III in Prozent */
const ERB_SAETZE=[[75000,7,15,30],[300000,11,20,30],[600000,15,25,30],[6000000,19,30,30],[13000000,23,35,50],[26000000,27,40,50],[Infinity,30,43,50]];
function verhaeltnis(id){ return ERB_VERHAELTNIS[id]||ERB_VERHAELTNIS.sonstige; }
function klasseFuer(id,art){ const d=verhaeltnis(id); return typeof d.klasse==='object'?d.klasse[art==='erbe'?'erbe':'schenkung']:d.klasse; }
function freibetragFuer(id,art){ const d=verhaeltnis(id); return typeof d.freibetrag==='object'?d.freibetrag[art==='erbe'?'erbe':'schenkung']:d.freibetrag; }
/* Steuer nach § 19 ErbStG auf den steuerpflichtigen Erwerb: auf volle 100 € abgerundet (§ 10 Abs. 1 Satz 6),
   Härteausgleich nach § 19 Abs. 3 (über der Wertgrenze nur aus der Hälfte bzw. — über 30 % — drei Vierteln des
   übersteigenden Betrags) */
function erbstSteuer(erwerb,klasse){
  const e=Math.floor(pos(erwerb)/100+1e-7)*100, k=[1,2,3].includes(klasse)?klasse:3;   // Rundungsreste der Gleitkommarechnung nicht abrunden
  if(!(e>0)) return {erwerb:0,satz:0,steuer:0,haerteausgleich:false};
  const i=ERB_SAETZE.findIndex(z=>e<=z[0]), p=ERB_SAETZE[i][k]/100;
  let steuer=e*p, haerte=false;
  if(i>0){ const g=ERB_SAETZE[i-1][0], pv=ERB_SAETZE[i-1][k]/100, f=p<=0.3?0.5:0.75, grenze=g*pv+f*(e-g);
    if(grenze<steuer-1e-9){ steuer=grenze; haerte=true; } }
  return {erwerb:e,satz:p*100,steuer:Math.floor(steuer+1e-9),haerteausgleich:haerte};
}
/* Vervielfältiger einer lebenslänglichen Nutzung (§ 14 Abs. 1 BewG). Das BMF rechnet ihn als Barwert einer Zeitrente über die
   durchschnittliche Lebenserwartung der Sterbetafel (vollendetes Lebensalter), 5,5 % Zins, Mittelwert aus jährlich vorschüssiger
   und nachschüssiger Zahlung; alle 202 Werte der Tabelle 2026 lassen sich so aus der dort genannten Lebenserwartung exakt
   nachrechnen (Test). Für Stichtage 2026 gilt die eingebaute Tabelle des BMF-Schreibens vom 21.10.2025 (Sterbetafel 2022/2024);
   für andere Jahre rechnet die App nach demselben Verfahren mit der Lebenserwartung der eingebauten Sterbetafel — maßgeblich
   bleibt die BMF-Tabelle des jeweiligen Jahres (Wert eintragbar). */
const BMF_VERVIELFAELTIGER={
  2026:{quelle:'BMF-Schreiben vom 21.10.2025 (IV D 4 - S 3104/00002/013/003), Sterbetafel 2022/2024',
    m:[18.402,18.391,18.375,18.359,18.341,18.322,18.303,18.282,18.26,18.237,18.213,18.187,18.16,18.132,18.101,18.07,18.037,18.002,17.965,17.926,17.886,17.843,17.799,17.751,17.701,17.649,17.593,17.535,17.473,17.409,17.34,17.269,17.193,17.113,17.03,16.942,16.85,16.753,16.652,16.545,16.434,16.317,16.193,16.065,15.93,15.788,15.64,15.485,15.323,15.155,14.977,14.794,14.605,14.406,14.199,13.983,13.762,13.533,13.293,13.048,12.798,12.538,12.272,12.002,11.725,11.444,11.155,10.86,10.561,10.251,9.938,9.619,9.293,8.96,8.627,8.282,7.936,7.586,7.23,6.868,6.509,6.158,5.798,5.441,5.089,4.743,4.411,4.086,3.778,3.496,3.234,2.984,2.764,2.566,2.393,2.226,2.076,1.951,1.843,1.771,1.68],
    w:[18.465,18.456,18.443,18.43,18.417,18.402,18.387,18.371,18.354,18.336,18.317,18.297,18.276,18.254,18.23,18.206,18.18,18.152,18.124,18.093,18.062,18.028,17.992,17.955,17.915,17.873,17.829,17.783,17.735,17.683,17.629,17.572,17.511,17.448,17.382,17.312,17.238,17.16,17.078,16.993,16.903,16.808,16.709,16.604,16.494,16.379,16.258,16.13,15.997,15.856,15.711,15.557,15.398,15.23,15.054,14.873,14.68,14.481,14.273,14.058,13.832,13.601,13.359,13.108,12.849,12.583,12.306,12.02,11.725,11.421,11.107,10.78,10.447,10.105,9.754,9.393,9.022,8.648,8.271,7.885,7.49,7.1,6.703,6.305,5.908,5.512,5.133,4.765,4.418,4.086,3.77,3.48,3.217,2.975,2.764,2.558,2.384,2.226,2.094,1.987,1.897]}
};
function zeitrenteBewG(n){ n=Math.max(0,+n||0); const an=(1-Math.pow(1/1.055,n))/0.055; return Math.round(an*(1+1.055)/2*1000)/1000; }
function vervielfaeltigerBewG(alter,g,tafel,jahr){
  if(!(alter>=0)||!Number.isFinite(+alter)) return 0;
  const x=Math.min(Math.floor(alter),100), tab=BMF_VERVIELFAELTIGER[jahr||new Date().getFullYear()];
  if(tab) return tab[g==='m'?'m':'w'][x];
  const t=tafelFuer(g,tafel); if(!t) return 0;
  return zeitrenteBewG(Math.round(t.ex[Math.min(x,t.ex.length-1)]*100)/100);   // Lebenserwartung wie das BMF auf zwei Stellen
}
function vervielfaeltigerQuelle(jahr,tafel){
  const tab=BMF_VERVIELFAELTIGER[jahr||new Date().getFullYear()], T=tafel||Tafel;
  return tab?'BMF-Tabelle: '+tab.quelle:'nach dem Verfahren des BMF berechnet aus der Sterbetafel '+(T&&T.zeitraum||'')+' — maßgeblich ist die BMF-Tabelle des Jahres';
}
/* Kapitalwert von Nießbrauch oder Wohnrecht: Jahreswert höchstens Steuerwert / 18,6 (§ 16 BewG); bei zwei Berechtigten,
   wenn das Recht mit dem Tod des Letztversterbenden erlischt, gilt der höchste Vervielfältiger (§ 14 Abs. 3 BewG) */
function kapitalwertNutzung(o){
  const steuerwert=pos(o.steuerwert), roh=pos(o.jahreswert), grenze=steuerwert>0?steuerwert/18.6:roh;
  const jahreswert=Math.min(roh,grenze);
  const vs=(o.personen||[]).filter(p=>p&&zahl(p.alter)>0).map(p=>vervielfaeltigerBewG(zahl(p.alter),p.g,o.tafel,o.jahr));
  const manuell=pos(o.vManuell);
  const v=manuell>0?manuell:(vs.length?(o.erstVersterbend?Math.min(...vs):Math.max(...vs)):0);
  return {jahreswert,begrenzt:roh>jahreswert+1e-9,vervielfaeltiger:v,vervielfaeltigerBerechnet:vs,kapitalwert:jahreswert*v,
    quelle:manuell>0?'eingetragen':vervielfaeltigerQuelle(o.jahr,o.tafel)};
}
/* Steuerfreier Anteil des Familienheims (§ 13 Abs. 1 Nr. 4a, 4b, 4c ErbStG) */
function familienheimFrei(art,verh,selbstnutzung,wohnflaeche){
  if(verh==='ehegatte'&&art==='schenkung') return {frei:1,pflichtig:0,norm:'§ 13 Abs. 1 Nr. 4a ErbStG'};
  if(verh==='ehegatte'&&art==='erbe'&&selbstnutzung) return {frei:1,pflichtig:0,norm:'§ 13 Abs. 1 Nr. 4b ErbStG (10 Jahre Selbstnutzung)'};
  if((verh==='kind'||verh==='enkel_kv')&&art==='erbe'&&selbstnutzung){
    const wf=pos(wohnflaeche); return {frei:wf>200?200/wf:1,pflichtig:wf>200?(wf-200)/wf:0,norm:'§ 13 Abs. 1 Nr. 4c ErbStG (bis 200 m², 10 Jahre Selbstnutzung)'}; }
  return {frei:0,pflichtig:1,norm:''};
}
/* Ein Erwerb von einer Person: Zusammenrechnung mit Vorerwerben der letzten 10 Jahre (§ 14 ErbStG), Freibetrag (§ 16),
   Steuer (§ 19), Abzug der Steuer auf die Vorerwerbe (fiktiv oder tatsächlich, die höhere; § 14 Abs. 1 Sätze 2 und 3),
   mindestens die Steuer auf den letzten Erwerb allein mit vollem Freibetrag (§ 14 Abs. 1 Satz 4), höchstens 50 % des
   Erwerbs (§ 14 Abs. 3), Kleinbetrag bis 50 € (§ 22). Bei der fiktiven Steuer zählt nur der verbrauchte Freibetrag. */
function erwerbSteuer(bereicherung,vorerwerb,vorsteuer,klasse,freibetrag){
  const b=pos(bereicherung), vor=pos(vorerwerb);
  const gesamt=b+vor, nachFb=Math.max(0,gesamt-freibetrag), st=erbstSteuer(nachFb,klasse);
  const vorFiktiv=erbstSteuer(Math.max(0,vor-freibetrag),klasse).steuer, abzug=Math.max(vorFiktiv,pos(vorsteuer));
  let steuer=Math.max(0,st.steuer-abzug), kappung=false, klein=false, mindestGreift=false;
  const mindest=vor>0?erbstSteuer(Math.max(0,b-freibetrag),klasse).steuer:0;
  if(vor>0&&steuer<mindest){ steuer=mindest; mindestGreift=true; }
  if(steuer>0.5*b){ steuer=Math.floor(0.5*b); kappung=true; }
  if(steuer>0&&steuer<=50){ steuer=0; klein=true; }
  return {bereicherung:b,vorerwerb:vor,gesamt,freibetrag,freibetragGenutzt:Math.min(gesamt,freibetrag),steuerpflichtig:st.erwerb,satz:st.satz,
    steuerGesamt:st.steuer,abzugVorerwerb:abzug,mindeststeuer:mindest,mindestGreift,steuer,haerteausgleich:st.haerteausgleich,kappung,kleinbetrag:klein};
}
/* Übertragung einer Immobilie (Schenkung heute oder Erbe):
   e={art:'schenkung'|'erbe', wert, uebertragAnteil, zweiSchenker, nutzung:'familienheim'|'vermietet'|'sonstig', wohnflaeche,
      empfaenger:[{verhaeltnis, anteil, vorerwerb, vorsteuer, selbstnutzung}], vorbehalt:'keiner'|'niessbrauch'|'wohnrecht',
      jahreswert, personen:[{alter,g}], vManuell} */
function uebertragung(e,tafel){
  const art=e.art==='erbe'?'erbe':'schenkung';
  const ua=e.uebertragAnteil==null||e.uebertragAnteil===''?1:anteil(e.uebertragAnteil);
  const wert=pos(e.wert)*ua;
  const vorbehalt=art==='schenkung'&&['niessbrauch','wohnrecht'].includes(e.vorbehalt)?e.vorbehalt:'keiner';
  const recht=vorbehalt!=='keiner'?kapitalwertNutzung({steuerwert:wert,jahreswert:pos(e.jahreswert)*ua,personen:e.personen,vManuell:e.vManuell,tafel,jahr:e.jahr}):null;
  const K=recht?recht.kapitalwert:0;
  const schenker=art==='schenkung'&&e.zweiSchenker?2:1;
  const liste=(e.empfaenger||[]).filter(r=>r&&anteil(r.anteil)>0);
  const summeAnteile=liste.reduce((s,r)=>s+anteil(r.anteil),0);
  const empfaenger=liste.map(r=>{
    const ant=anteil(r.anteil), d=verhaeltnis(r.verhaeltnis), kl=klasseFuer(r.verhaeltnis,art), fb=freibetragFuer(r.verhaeltnis,art);
    const W=wert*ant, Kr=Math.min(K*ant,W);
    const fh=e.nutzung==='familienheim'?familienheimFrei(art,r.verhaeltnis,!!r.selbstnutzung,e.wohnflaeche):{frei:0,pflichtig:1,norm:''};
    const f13d=e.nutzung==='vermietet'?0.9:1;   // § 13d ErbStG: zu Wohnzwecken vermietet, 10 % steuerfrei
    // Lasten nur im Verhältnis des steuerpflichtigen Teils abziehbar (§ 10 Abs. 6 Satz 3 und 5 ErbStG)
    const bereicherung=Math.round(Math.max(0,W-Kr)*fh.pflichtig*f13d*100)/100;
    const teile=[];
    for(let s=0;s<schenker;s++) teile.push(erwerbSteuer(bereicherung/schenker,pos(r.vorerwerb)/schenker,pos(r.vorsteuer)/schenker,kl,fb));
    const steuer=teile.reduce((a,t)=>a+t.steuer,0);
    return {verhaeltnis:r.verhaeltnis,name:d.name,anteil:ant,klasse:kl,freibetrag:fb,wert:W,kapitalwert:Kr,familienheimFrei:fh.frei,familienheimNorm:fh.norm,
      vermietet13d:f13d<1,bereicherung,teile,schenker,steuer};
  });
  const steuer=empfaenger.reduce((a,r)=>a+r.steuer,0);
  return {art,wert,vorbehalt,recht,schenker,empfaenger,steuer,summeAnteile,anteileOk:Math.abs(summeAnteile-1)<1e-6};
}
/* Fernere Lebenserwartung (vollendetes Alter) aus der Sterbetafel */
function restLeben(alter,g,tafel){ const t=tafelFuer(g,tafel); if(!t||!(alter>=0)) return 0; return t.ex[Math.min(Math.floor(alter),t.ex.length-1)]; }

/* ========== Wohnen im Alter ========== */
/* Überlebenswahrscheinlichkeit nach t Jahren; zwei Personen: mindestens eine lebt (Letztversterbender) */
function ueberleben(personen,tafel){
  const ps=(personen||[]).filter(p=>p&&zahl(p.alter)>0).map(p=>{ const t=tafelFuer(p.g,tafel); return {t,x:Math.min(Math.floor(zahl(p.alter)),t.lx.length-1)}; });
  if(!ps.length) return null;
  return t=>{ let alleTot=1; for(const q of ps) alleTot*=1-lxStetig(q.t,q.x+t)/lx(q.t,q.x); return 1-alleTot; };
}
/* Barwert einer monatlich vorschüssigen Zahlung von 1 je Jahr (1/12 je Monat), solange jemand lebt; die ersten
   garantie Jahre wird in jedem Fall gezahlt (Rentengarantiezeit) */
function rentenfaktor(personen,zinsPct,garantieJahre,tafel){
  const p=ueberleben(personen,tafel); if(!p) return 0;
  const v=1/(1+Math.max(zahl(zinsPct),0)/100), g=pos(garantieJahre);
  let f=0;
  for(let m=0;m<12*130;m++){ const t=m/12, w=t<g-1e-9?1:p(t), term=Math.pow(v,t)*w/12; f+=term; if(t>=g&&term<1e-11) break; }
  return f;
}
/* Erwartete Restlebensdauer (Jahre), bei zwei Personen bis zum Tod des Letztversterbenden (Trapezregel, monatlich) */
function lebenserwartung(personen,tafel){
  const p=ueberleben(personen,tafel); if(!p) return 0;
  let e=0, alt=1;
  for(let m=1;m<12*130;m++){ const neu=p(m/12); e+=(alt+neu)/2/12; alt=neu; }
  return e;
}
/* Vergleich der Wege für Eigentümer im Alter (Modellrechnung, keine Angebote von Anbietern):
   o={wert, miete, personen, zins, abschlag, garantie, teilAnteil, teilEntgelt, teilGebuehr, kreditZins, rueckMiete, rueckKosten, wertsteigerung} */
function verrentung(o,tafel){
  const wert=pos(o.wert), miete=pos(o.miete), zins=pos(o.zins), g=zahl(o.wertsteigerung)/100;
  const n=lebenserwartung(o.personen,tafel), fLeben=rentenfaktor(o.personen,zins,0,tafel), fGarantie=rentenfaktor(o.personen,zins,o.garantie,tafel);
  const wohnrecht=12*miete*fLeben;   // Barwert des lebenslangen Wohnrechts (Mietwert)
  const wertEnde=wert*Math.pow(1+g,n);
  const auszahlung=Math.max(0,wert*(1-anteil(o.abschlag))-wohnrecht);
  const rente=fGarantie>0?auszahlung/(12*fGarantie):0;
  const ta=anteil(o.teilAnteil), teilBetrag=wert*ta, entgelt=teilBetrag*anteil(o.teilEntgelt)/12;
  const kreditZins=o.kreditZins==null||o.kreditZins===''?0:pos(o.kreditZins), kreditMonat=teilBetrag*kreditZins/100/12;
  const rueckErloes=wert*(1-anteil(o.rueckKosten)), rueckMiete=o.rueckMiete===''||o.rueckMiete==null?miete:pos(o.rueckMiete);
  const rueckRente=fLeben>0?rueckErloes/(12*fLeben):0;
  const wege=[
    {id:'einmal',name:'Verkauf mit lebenslangem Wohnrecht',sofort:auszahlung,monatlich:0,summe:auszahlung,erben:0,wohnen:'Wohnrecht, mietfrei'},
    {id:'rente',name:'Verkauf gegen Leibrente mit Wohnrecht',sofort:0,monatlich:rente,summe:rente*12*n,erben:0,wohnen:'Wohnrecht, mietfrei'},
    {id:'teil',name:'Teilverkauf ('+Math.round(ta*100)+' %)',sofort:teilBetrag,monatlich:-entgelt,summe:teilBetrag-entgelt*12*n,
      erben:Math.max(0,(1-ta)*wertEnde-anteil(o.teilGebuehr)*wertEnde),wohnen:'Nießbrauch, Nutzungsentgelt'},
    {id:'kredit',name:'Kredit mit Grundschuld über denselben Betrag',sofort:teilBetrag,monatlich:-kreditMonat,summe:teilBetrag-kreditMonat*12*n,
      erben:Math.max(0,wertEnde-teilBetrag),wohnen:'Eigentum bleibt'},
    {id:'rueck',name:'Verkaufen und zurückmieten',sofort:rueckErloes,monatlich:-rueckMiete,summe:rueckErloes-rueckMiete*12*n,erben:0,wohnen:'Mietvertrag',
      monatlichVerrentet:rueckRente-rueckMiete},
    {id:'behalten',name:'Behalten und vererben',sofort:0,monatlich:0,summe:0,erben:wertEnde,wohnen:'Eigentum'}
  ];
  return {n,fLeben,fGarantie,wohnrecht,wertEnde,auszahlung,rente,wege};
}

/* ========== Datumshilfen ========== */
const datum=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
function plusMonate(d,m){ const r=new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); if(r.getDate()!==d.getDate()) r.setDate(0); return r; }

/* ========== Grundstückspotenzial (Residualwert) ========== */
/* Was kann ein Bauträger für das Grundstück zahlen? Erlös − Baukosten − Nebenkosten − Finanzierung − Vermarktung −
   Wagnis und Gewinn = tragbare Grundstückskosten; daraus der Kaufpreis ohne Erwerbsnebenkosten und Grundstücksfinanzierung,
   abgezinst über die Wartezeit bis Baubeginn (deduktive Bodenwertermittlung, § 40 Abs. 3 ImmoWertV) */
function residualwert(o){
  const fl=pos(o.grundstueck), gf=pos(o.geschossflaeche)>0?pos(o.geschossflaeche):fl*pos(o.gfz);
  const wfl=pos(o.wohnflaeche)>0?pos(o.wohnflaeche):gf*anteil(o.wfFaktor);
  const erloes=wfl*pos(o.verkaufM2)+pos(o.stellplaetze)*pos(o.stellplatzPreis);
  const bau=wfl*pos(o.baukostenM2), bnk=bau*anteil(o.baunebenkosten), sonst=pos(o.abriss)+pos(o.erschliessung);
  const i=anteil(o.zins), bauzeit=pos(o.bauzeitMonate), vermZeit=pos(o.vermarktungMonate);
  const finBau=(bau+bnk+sonst)*i*bauzeit/12*0.5;          // Baukosten im Mittel zur Hälfte finanziert
  const vermarktung=erloes*anteil(o.vermarktung), wagnis=erloes*anteil(o.wagnis);
  const kosten=bau+bnk+sonst+finBau+vermarktung+wagnis, residual=erloes-kosten;
  const nk=anteil(o.erwerbsnebenkosten), finGrund=i*(bauzeit+vermZeit)/12;
  const bodenwert=residual>0?residual/((1+nk)*(1+finGrund)):residual;
  const warte=pos(o.wartezeitJahre), heute=bodenwert>0?bodenwert/Math.pow(1+i,warte):bodenwert;
  const brw=pos(o.bodenrichtwert)*fl;
  return {geschossflaeche:gf,wohnflaeche:wfl,erloes,bau,baunebenkosten:bnk,sonstige:sonst,finanzierungBau:finBau,vermarktung,wagnis,kosten,residual,
    bodenwert,heute,proM2:fl>0?heute/fl:0,bodenrichtwertWert:brw,abweichungBRW:brw>0?(heute-brw)/brw*100:null};
}
/* Empfindlichkeit: Verkaufspreis und Baukosten je ±10 % */
function residualSpanne(o){
  const r=(vp,bk)=>residualwert({...o,verkaufM2:pos(o.verkaufM2)*vp,baukostenM2:pos(o.baukostenM2)*bk}).heute;
  return {basis:r(1,1),preisMinus:r(0.9,1),preisPlus:r(1.1,1),kostenPlus:r(1,1.1),kostenMinus:r(1,0.9)};
}

/* ========== ETW-Kaufcheck ========== */
/* Peters'sche Formel: jährliche Instandhaltung je m² Wohnfläche = Herstellungskosten je m² × 1,5 / 80 Jahre, davon der
   Anteil des Gemeinschaftseigentums (Peters: 65–70 %) */
function petersRuecklage(herstellM2,anteilGE){ return pos(herstellM2)*1.5/80*anteil(anteilGE); }
/* Heizung im ETW-Kaufcheck. Seit 29.07.2026 gilt das Gebäudemodernisierungsgesetz (GModG) statt des GEG: Die Austauschpflicht
   für alte Kessel und die 65-%-Regel sind weggefallen (§§ 71–73). Wird nach dem 29.07.2026 eine Öl-, Gas- oder Flüssiggasheizung
   eingebaut, muss sie ab 2029 steigende Anteile klimafreundlicher Brennstoffe nutzen: 10 %, ab 2030 15 %, ab 2035 30 %, ab 2040
   60 % (§ 43); die Versorger sollen bis 2045 vollständig auf klimaneutrale Brennstoffe umstellen (§ 42a). Geprüft wird deshalb
   nur der absehbare Erneuerungsbedarf: rechnerische Nutzungsdauer von Öl- und Gaskesseln 18 bis 20 Jahre (VDI 2067). */
function heizungPruefen(o,jahr){
  const art=o.heizArt||'', bj=zahl(o.heizBaujahr), j=jahr||new Date().getFullYear();
  if(!art) return {stufe:'',text:''};
  const fossil=['gas','oel'].includes(art);
  if(!(bj>0)) return {stufe:'warn',text:'Baujahr der Heizung erfragen — davon hängt ab, wann die Gemeinschaft erneuern muss.'};
  const alter=j-bj;
  if(alter>=20) return {stufe:'warn',text:'Heizung von '+bj+' ('+alter+' Jahre): rechnerische Nutzungsdauer (VDI 2067: 18–20 Jahre) erreicht — Erneuerung absehbar, Kosten für die Gemeinschaft'
    +(fossil?'; eine neue Öl- oder Gasheizung muss ab 2029 steigende Anteile klimafreundlicher Brennstoffe nutzen (§ 43 GModG).':'.')+' Eine gesetzliche Austauschpflicht besteht seit dem GModG nicht mehr.'};
  return {stufe:'ok',text:'Heizung von '+bj+' ('+alter+' Jahre): keine gesetzliche Austauschpflicht.'+(fossil?' Öl und Gas können durch die Quote für klimafreundliche Brennstoffe (§ 42a GModG) teurer werden.':'')};
}
const ETW_UNTERLAGEN=['Grundbuchauszug','Teilungserklärung mit Gemeinschaftsordnung','Aufteilungsplan','Protokolle der Eigentümerversammlungen (3 Jahre)',
  'Beschlusssammlung','Wirtschaftsplan','Jahresabrechnung (Hausgeld)','Stand der Erhaltungsrücklage','Energieausweis','Verwaltervertrag','Wohnflächenberechnung','Mietvertrag (falls vermietet)'];
function etwCheck(o,jahr){
  const wfl=pos(o.wohnflaeche), q=pos(o.meaGesamt)>0?pos(o.mea)/pos(o.meaGesamt):0;
  const ruecklage=pos(o.ruecklageGesamt)*q, zufuehrung=pos(o.zufuehrungGesamt)*q;
  const peters=petersRuecklage(o.herstellM2,o.anteilGE==null||o.anteilGE===''?0.7:o.anteilGE);
  const zuM2=wfl>0?zufuehrung/wfl:0, rueckM2=wfl>0?ruecklage/wfl:0, hausgeldM2=wfl>0?pos(o.hausgeld)/wfl:0;
  const flags=[];
  const heiz=heizungPruefen(o,jahr); if(heiz.stufe==='rot'||heiz.stufe==='warn') flags.push({stufe:heiz.stufe,text:heiz.text});
  if(peters>0&&wfl>0){ const quote=zuM2/peters;
    if(quote<0.6) flags.push({stufe:'rot',text:'Zuführung zur Rücklage '+zuM2.toFixed(2).replace('.',',')+' €/m² im Jahr — deutlich unter der Peters\'schen Formel ('+peters.toFixed(2).replace('.',',')+' €/m²).'});
    else if(quote<1) flags.push({stufe:'warn',text:'Zuführung zur Rücklage unter der Peters\'schen Formel ('+Math.round(quote*100)+' %).'}); }
  if(pos(o.sonderumlage)>0) flags.push({stufe:'rot',text:'Sonderumlage beschlossen: '+Math.round(pos(o.sonderumlage)*q).toLocaleString('de-DE')+' € Anteil dieser Wohnung.'});
  if(pos(o.massnahmenKosten)>0) flags.push({stufe:'warn',text:'Geplante Maßnahmen: rund '+Math.round(pos(o.massnahmenKosten)*q).toLocaleString('de-DE')+' € Anteil dieser Wohnung'+(ruecklage>0?' (Rücklagenanteil '+Math.round(ruecklage).toLocaleString('de-DE')+' €)':'')+'.'});
  if(o.rechtsstreit) flags.push({stufe:'rot',text:'Laufender Rechtsstreit in der Gemeinschaft.'});
  if(o.rueckstaende) flags.push({stufe:'warn',text:'Hausgeldrückstände anderer Eigentümer.'});
  const verw=datum(o.verwalterBis), heute=datum(o.heute)||new Date();   // o.heute nur für Tests
  if(verw&&verw<plusMonate(heute,12)) flags.push({stufe:'warn',text:'Verwaltervertrag endet am '+verw.toLocaleDateString('de-DE')+'.'});
  const unterlagen=(o.unterlagen||[]).filter(Boolean).length;
  const gesamt=flags.some(f=>f.stufe==='rot')?'rot':flags.some(f=>f.stufe==='warn')?'gelb':'gruen';
  return {anteil:q,ruecklage,zufuehrung,rueckM2,zuM2,hausgeldM2,peters,heizung:heiz,flags,unterlagen,unterlagenGesamt:ETW_UNTERLAGEN.length,gesamt};
}

/* ========== Mein Jahr ========== */
const JAHR_PHASEN=['Akquise','Auftrag erteilt','In Vermarktung','Reserviert','Notartermin','Verkauft'];
const JAHR_WAHRSCHEINLICHKEIT={'Akquise':10,'Auftrag erteilt':40,'In Vermarktung':60,'Reserviert':80,'Notartermin':95,'Verkauft':100};
/* objekte=[{id,name,status,preis,kaufpreis,abschluss,herkunft,provV,provK}], e={jahr, provV, provK, wahrscheinlichkeit, ziel} */
function pipeline(objekte,e){
  const jahr=zahl(e.jahr)||new Date().getFullYear(), w=Object.assign({},JAHR_WAHRSCHEINLICHKEIT,e.wahrscheinlichkeit||{});
  const zeilen=(objekte||[]).filter(o=>o&&JAHR_PHASEN.includes(o.status)).map(o=>{
    const preis=o.status==='Verkauft'&&pos(o.kaufpreis)>0?pos(o.kaufpreis):pos(o.preis);
    const satz=(o.provV==null||o.provV===''?pos(e.provV):pos(o.provV))+(o.provK==null||o.provK===''?pos(e.provK):pos(o.provK));
    const provision=preis*satz/100, p=Math.min(100,pos(w[o.status]))/100;
    const abschlussJahr=o.abschluss?parseInt(String(o.abschluss).slice(0,4),10):null;
    const verkauftImJahr=o.status==='Verkauft'&&(!abschlussJahr||abschlussJahr===jahr);
    return {...o,preis,satz,provision,wahrscheinlichkeit:p*100,gewichtet:o.status==='Verkauft'?(verkauftImJahr?provision:0):provision*p,verkauftImJahr};
  });
  const phasen=JAHR_PHASEN.map(s=>{ const l=zeilen.filter(z=>z.status===s&&(s!=='Verkauft'||z.verkauftImJahr));
    return {phase:s,anzahl:l.length,volumen:l.reduce((a,z)=>a+z.preis,0),provision:l.reduce((a,z)=>a+z.provision,0),gewichtet:l.reduce((a,z)=>a+z.gewichtet,0)}; });
  const realisiert=zeilen.filter(z=>z.verkauftImJahr).reduce((a,z)=>a+z.provision,0);
  const offen=zeilen.filter(z=>z.status!=='Verkauft').reduce((a,z)=>a+z.gewichtet,0);
  const herkunft={}; zeilen.forEach(z=>{ const h=z.herkunft||'ohne Angabe'; herkunft[h]=herkunft[h]||{anzahl:0,provision:0}; herkunft[h].anzahl++; herkunft[h].provision+=z.provision; });
  const ziel=pos(e.ziel);
  return {jahr,zeilen,phasen,realisiert,offen,prognose:realisiert+offen,ziel,zielQuote:ziel>0?(realisiert+offen)/ziel*100:null,realisiertQuote:ziel>0?realisiert/ziel*100:null,herkunft};
}

/* ========== Notarauftrag: Kalenderdatei und Entwurfsfrist (D39) ========== */
/* Text nach RFC 5545 maskieren; Zeilen höchstens 75 Oktette, Fortsetzung mit einem Leerzeichen */
function icsText(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }
function icsFalten(z){
  const enc=new TextEncoder(), teile=[]; let teil='', n=0;
  for(const ch of z){ const b=enc.encode(ch).length; if(n+b>(teile.length?74:75)){ teile.push(teil); teil=''; n=0; } teil+=ch; n+=b; }
  teile.push(teil); return teile.join('\r\n ');
}
/* t = {uid, titel, ort, beschreibung, datum 'JJJJ-MM-TT', uhrzeit 'hh:mm' (leer = ganztägig), dauerMin, erinnerungMin, jetzt}
   Uhrzeit als Ortszeit ohne Zeitzone („floating“): der Kalender zeigt sie so, wie eingetragen. */
function icsEreignis(t,jetzt){
  t=t||{}; const d=String(t.datum||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!isFinite(new Date(d+'T00:00:00Z'))) return null;
  const z2=n=>String(n).padStart(2,'0'), j=t.jetzt instanceof Date?t.jetzt:jetzt instanceof Date?jetzt:new Date();
  const stempel=x=>x.getUTCFullYear()+z2(x.getUTCMonth()+1)+z2(x.getUTCDate())+'T'+z2(x.getUTCHours())+z2(x.getUTCMinutes())+z2(x.getUTCSeconds());
  const tag=x=>x.getUTCFullYear()+z2(x.getUTCMonth()+1)+z2(x.getUTCDate());
  const basis=new Date(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)));
  const z=['BEGIN:VEVENT','UID:'+icsText(t.uid||('ia-'+d+'@immoapp')),'DTSTAMP:'+stempel(j)+'Z'];
  const m=/^(\d{1,2})[:.](\d{2})$/.exec(String(t.uhrzeit||'').trim());
  if(m&&+m[1]<24&&+m[2]<60){
    const start=new Date(basis.getTime()+(+m[1]*60+(+m[2]))*60000), ende=new Date(start.getTime()+(t.dauerMin>0?t.dauerMin:60)*60000);
    z.push('DTSTART:'+stempel(start),'DTEND:'+stempel(ende));
  } else z.push('DTSTART;VALUE=DATE:'+tag(basis),'DTEND;VALUE=DATE:'+tag(new Date(basis.getTime()+864e5)));
  z.push('SUMMARY:'+icsText(t.titel||'Termin'));
  if(t.ort) z.push('LOCATION:'+icsText(t.ort));
  if(t.beschreibung) z.push('DESCRIPTION:'+icsText(t.beschreibung));
  if(t.erinnerungMin>0) z.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsText(t.titel||'Termin'),'TRIGGER:-PT'+Math.round(t.erinnerungMin)+'M','END:VALARM');
  z.push('END:VEVENT');
  return z;
}
/* mehrere Termine in einer Datei (D40, Kalender); leere Liste oder nur ungültige Daten → '' */
function icsKalender(liste,jetzt){
  const ev=(liste||[]).map(t=>icsEreignis(t,jetzt)).filter(Boolean);
  if(!ev.length) return '';
  const z=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ImmoApp//Termine//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH'].concat(...ev,['END:VCALENDAR']);
  return z.map(icsFalten).join('\r\n')+'\r\n';
}
function ics(t){ return icsKalender([t||{}]); }
/* Kalenderblatt: Wochen (Montag bis Sonntag) mit den Tagen 'JJJJ-MM-TT', die den Monat 'JJJJ-MM' abdecken */
function monatsRaster(ym){
  const j=+String(ym).slice(0,4), m=+String(ym).slice(5,7);
  if(!(j>1900)||!(m>=1&&m<=12)) return [];
  const erster=new Date(Date.UTC(j,m-1,1)), wt=(erster.getUTCDay()+6)%7, start=new Date(erster.getTime()-wt*864e5), wochen=[];
  for(let w=0;w<6;w++){
    const woche=[]; for(let t=0;t<7;t++){ const d=new Date(start.getTime()+(w*7+t)*864e5); woche.push(d.toISOString().slice(0,10)); }
    if(w>0&&woche[0].slice(0,7)!==String(ym).slice(0,7)&&woche[0]>String(ym)) break;
    wochen.push(woche);
  }
  return wochen;
}
/* Tage zwischen zwei Kalenderdaten 'JJJJ-MM-TT' (b − a) */
function tageZwischen(a,b){ const x=Date.parse(a+'T00:00:00Z'), y=Date.parse(b+'T00:00:00Z'); return isFinite(x)&&isFinite(y)?Math.round((y-x)/864e5):null; }
function tagePlus(iso,n){ const d=new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
/* Verbrauchern soll der Notar den beabsichtigten Text im Regelfall zwei Wochen vor der Beurkundung zur Verfügung stellen
   (§ 17 Abs. 2a Satz 2 Nr. 2 BeurkG). Liefert den spätesten Tag dafür und ob die Zeit bis zum Termin reicht. */
function notarFrist(termin,heute){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(termin||'')) return null;
  heute=/^\d{4}-\d{2}-\d{2}$/.test(heute||'')?heute:new Date().toISOString().slice(0,10);
  const entwurfBis=tagePlus(termin,-14), rest=tageZwischen(heute,termin);
  return {entwurfBis,tageBisTermin:rest,tageBisEntwurf:tageZwischen(heute,entwurfBis),
    stufe:rest<0?'vorbei':rest<14?'knapp':tageZwischen(heute,entwurfBis)<=7?'bald':'ok'};
}

/* ========== Datenstand (D39) ==========
   Wie aktuell sind die Grundlagen der App und die eigenen Daten? Je Eintrag Stand, erwartete nächste Veröffentlichung
   und Status: ok · bald (in den nächsten Tagen prüfen) · faellig · info (nichts hinterlegt).
   e = {bpiStand 'JJJJ-MM', tafelZeitraum 'JJJJ/JJJJ', bmfJahre [..], marktdaten [{name, stand}], indexJahre {haus:[..], wohnung:[..]},
        bewertungenVorBrw, projekte, kunden, sicherung (ms), geaendertSeitSicherung, liegenschaften [{name, letzte}],
        loeschpruefungFaellig, notarErledigtAlt} */
const MONATE_DE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function monatPlus(ym,n){ let j=+ym.slice(0,4), m=+ym.slice(5,7)+n; j+=Math.floor((m-1)/12); m=((m-1)%12+12)%12+1; return j+'-'+String(m).padStart(2,'0'); }
function monatName(ym){ return MONATE_DE[+ym.slice(5,7)-1]+' '+ym.slice(0,4); }
function datumDE(iso){ return iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4); }
function stufeZu(heute,erwartet,vorlauf,nachlauf){ return heute<tagePlus(erwartet,-vorlauf)?'ok':heute<tagePlus(erwartet,nachlauf)?'bald':'faellig'; }
const RECHT_GEPRUEFT='2026-10-03';
function datenstand(e,heute){
  e=e||{}; heute=/^\d{4}-\d{2}-\d{2}$/.test(heute||'')?heute:new Date().toISOString().slice(0,10);
  const J=+heute.slice(0,4), l=[];
  // Baupreisindex: vierteljährlich (Februar, Mai, August, November); der Bericht für Mai 2026 erschien am 09.07.2026
  if(/^\d{4}-\d{2}$/.test(e.bpiStand||'')){
    const naechster=monatPlus(e.bpiStand,3), erwartet=monatPlus(naechster,2)+'-10', s=stufeZu(heute,erwartet,14,21);
    l.push({id:'bpi',gruppe:'rechnen',titel:'Baupreisindex Baden-Württemberg',stand:monatName(e.bpiStand),naechste:monatName(naechster)+', erwartet um den '+datumDE(erwartet),status:s,
      text:s==='ok'?'Aktuell — die Sachwerte rechnen mit dem neuesten veröffentlichten Quartal.'
        :s==='bald'?'Der Wert für '+monatName(naechster)+' erscheint in diesen Tagen. Danach in die App übernehmen (js/baupreisindex.js, mit Test).'
        :'Der Wert für '+monatName(naechster)+' sollte erschienen sein — in die App übernehmen. Bis dahin rechnet die App mit dem neuesten Wert (vorläufig).',
      quelle:'Statistisches Landesamt Baden-Württemberg, Preisindex für Bauwerke'});
  }
  // Sterbetafel: das Statistische Bundesamt veröffentlicht jährlich im Sommer eine neue Dreijahrestafel
  const zt=/^(\d{4})\/(\d{4})$/.exec(e.tafelZeitraum||'');
  if(zt){
    const bis=+zt[2], erwartet=(bis+2)+'-07-15', s=stufeZu(heute,erwartet,0,60);
    l.push({id:'sterbetafel',gruppe:'rechnen',titel:'Sterbetafel (Leibrenten, Lebenserwartung)',stand:zt[0],naechste:(+zt[1]+1)+'/'+(bis+1)+', erwartet im Sommer '+(bis+2),status:s,
      text:s==='ok'?'Aktuell. Eine GitHub-Aktion sieht einmal im Monat nach und übernimmt eine neue Tafel selbst.'
        :'Eine neue Tafel sollte erschienen sein — die GitHub-Aktion „Sterbetafel“ prüfen oder von Hand starten.',
      quelle:'Statistisches Bundesamt, Sterbetafeln'});
  }
  // Vervielfältiger § 14 BewG: BMF-Tabelle je Kalenderjahr, im Herbst des Vorjahres (für 2026: Schreiben vom 21.10.2025)
  const jahre=(e.bmfJahre||[]).map(Number).filter(x=>x>2000).sort((a,b)=>a-b), maxJ=jahre.length?jahre[jahre.length-1]:0;
  if(maxJ){
    const s=maxJ>J?'ok':maxJ===J?(heute>=J+'-10-01'?'bald':'ok'):'faellig';
    l.push({id:'bmf',gruppe:'rechnen',titel:'Vervielfältiger nach § 14 BewG',stand:'BMF-Tabelle '+jahre.join(', '),naechste:'Tabelle '+(maxJ+1)+', erwartet im Herbst '+maxJ,status:s,
      text:s==='ok'?'Aktuell für Stichtage '+(maxJ>J?'bis ':'')+maxJ+'.'
        :s==='bald'?'Die Tabelle für '+(J+1)+' erscheint üblicherweise im Oktober oder November — dann übernehmen.'
        :'Für Stichtage ab '+(maxJ+1)+' rechnet die App nach dem Verfahren des BMF aus der Sterbetafel — die amtliche Tabelle übernehmen.',
      quelle:'Bundesministerium der Finanzen, Schreiben zu § 14 Abs. 1 BewG'});
  }
  // Bodenrichtwerte: zu Beginn jedes zweiten Kalenderjahres (§ 196 Abs. 1 Satz 4 BauGB), sofern nicht häufiger bestimmt
  const brw=J%2===0?J:J-1, alt=+e.bewertungenVorBrw||0;
  l.push({id:'brw',gruppe:'markt',titel:'Bodenrichtwerte',stand:'Stichtag 01.01.'+brw,naechste:'Stichtag 01.01.'+(brw+2),status:alt?'bald':'ok',
    text:(alt?alt+' Objekt'+(alt===1?'':'e')+' in Vermarktung mit Bewertungsstichtag vor dem 01.01.'+brw+' — dort den aktuellen Bodenrichtwert prüfen. ':'')
      +'Bodenrichtwerte werden mindestens alle zwei Jahre zum Jahresbeginn ermittelt (§ 196 Abs. 1 Satz 4 BauGB).',
    quelle:'§ 196 BauGB; BORIS-BW'});
  // Marktdaten des Gutachterausschusses (Grundstücksmarktbericht)
  const md=(e.marktdaten||[]).filter(x=>x&&typeof x==='object');
  if(!md.length) l.push({id:'markt',gruppe:'markt',titel:'Marktdaten des Gutachterausschusses',stand:'keine hinterlegt',naechste:'–',status:'info',
    text:'Sachwertfaktoren und Liegenschaftszinssätze aus dem Grundstücksmarktbericht unter „Marktdaten“ eintragen.',quelle:'Grundstücksmarktbericht; § 10 ImmoWertV'});
  else {
    const monate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x.stand||'')?(J-+x.stand.slice(0,4))*12+(+heute.slice(5,7)-+x.stand.slice(5,7)):null;
    const ohne=md.filter(x=>monate(x)==null), alt30=md.filter(x=>monate(x)>30), alt24=md.filter(x=>monate(x)>24);
    const neu=md.map(x=>x.stand).filter(Boolean).sort().pop()||'';
    const s=alt30.length||ohne.length?'faellig':alt24.length?'bald':'ok';
    l.push({id:'markt',gruppe:'markt',titel:'Marktdaten des Gutachterausschusses',stand:md.length+' Datensatz'+(md.length===1?'':'e')+(neu?', neuester vom '+datumDE(neu):''),
      naechste:'je nach Gutachterausschuss jährlich oder alle zwei Jahre',status:s,
      text:s==='ok'?'Aktuell.':(ohne.length?ohne.length+' ohne Stand. ':'')+(alt24.length?'Älter als zwei Jahre: '+alt24.map(x=>x.name||'ohne Namen').join(', ')+' — neuen Marktbericht prüfen.':''),
      quelle:'Grundstücksmarktbericht; § 10 ImmoWertV'});
  }
  // Preisindex des Wertmonitors (Jahreswerte von Hand)
  const ij=e.indexJahre||{}, letzte=Math.max(0,...['haus','wohnung'].map(a=>Math.max(0,...(ij[a]||[]).map(Number).filter(x=>x>1990))));
  l.push({id:'index',gruppe:'markt',titel:'Preisindex im Wertmonitor',stand:letzte?'Jahreswerte bis '+letzte:'keine Werte',naechste:letzte?'Jahreswert '+(letzte+1):'–',
    status:!letzte?'info':letzte>=J-1?'ok':'faellig',
    text:!letzte?'Für die Fortschreibung Jahreswerte aus dem Marktbericht oder dem Häuserpreisindex eintragen.':letzte>=J-1?'Aktuell.':'Jahreswert '+(J-1)+' nachtragen.',
    quelle:'Grundstücksmarktbericht; Statistisches Bundesamt, Häuserpreisindex'});
  // eigene Daten: Sicherung
  if((+e.projekte||0)+(+e.kunden||0)>0){
    const tage=e.sicherung>0?Math.floor((Date.parse(heute+'T12:00:00Z')-e.sicherung)/864e5):null, neu=+e.geaendertSeitSicherung||0;
    const s=tage==null?'faellig':tage>14&&neu>0?'faellig':'ok';
    l.push({id:'sicherung',gruppe:'daten',titel:'Gesamtsicherung',stand:tage==null?'noch nie':'am '+datumDE(new Date(e.sicherung).toISOString().slice(0,10)),naechste:'alle 14 Tage, wenn sich etwas geändert hat',status:s,
      text:s==='ok'?'Gesichert.':tage==null?'Noch keine Gesamtsicherung — die Daten liegen nur auf diesem Gerät.':neu+' Projekt'+(neu===1?'':'e')+' seit der letzten Sicherung geändert — jetzt sichern.',
      quelle:'Projekte → Alle Projekte sichern'});
  }
  // Liegenschaften: Preiseinschätzung zum 31.12.
  const lg=(e.liegenschaften||[]).filter(x=>x&&typeof x==='object');
  if(lg.length){
    const stich=(J-1)+'-12-31', ohne=lg.filter(x=>!(x.letzte&&x.letzte>=stich));
    const s=ohne.length?(heute>tagePlus(stich,90)?'faellig':'bald'):(heute>=J+'-12-01'?'bald':'ok');
    l.push({id:'liegenschaften',gruppe:'daten',titel:'Liegenschaften: Preiseinschätzung zum 31.12.',stand:(lg.length-ohne.length)+' von '+lg.length+' zum '+datumDE(stich),
      naechste:'31.12.'+J,status:s,
      text:ohne.length?'Ohne abgeschlossene Preiseinschätzung zum '+datumDE(stich)+': '+ohne.map(x=>x.name||'ohne Namen').join(', ')+'.'
        :s==='bald'?'Die Preiseinschätzung zum 31.12.'+J+' steht an.':'Alle Liegenschaften eingeschätzt.',
      quelle:'Liegenschaften'});
  }
  // Datenschutz: Löschprüfungen und erledigte Notaraufträge
  if(+e.kunden>0||+e.loeschpruefungFaellig>0){
    const n=+e.loeschpruefungFaellig||0;
    l.push({id:'loeschen',gruppe:'daten',titel:'Kundendaten: Löschung prüfen',stand:n?n+' fällig':'keine fällig',naechste:'nach Datum in der Kundenakte',status:n?'faellig':'ok',
      text:n?'Bei '+n+' Kunde'+(n===1?'':'n')+' ist das Datum „Löschung prüfen“ erreicht — prüfen, ob die Daten noch gebraucht werden (Art. 5 Abs. 1 lit. e, Art. 17 DSGVO).':'Keine Löschprüfung fällig.',
      quelle:'Kundenakte'});
  }
  if(+e.notarErledigtAlt>0){
    const n=+e.notarErledigtAlt;
    l.push({id:'notar',gruppe:'daten',titel:'Erledigte Notaraufträge',stand:n+' seit über 6 Monaten erledigt',naechste:'–',status:'bald',
      text:'Notaraufträge enthalten Namen und Anschriften der Beteiligten — löschen, wenn sie nicht mehr gebraucht werden.',quelle:'Notarauftrag'});
  }
  // Rechtsstand der Rechnungen und Hinweise
  const wieder=tagePlus(RECHT_GEPRUEFT,182);
  l.push({id:'recht',gruppe:'recht',titel:'Rechtsstand der Rechnungen und Hinweise',stand:'geprüft am '+datumDE(RECHT_GEPRUEFT),naechste:'erneut prüfen ab '+datumDE(wieder),
    status:heute>=wieder?'bald':'ok',
    text:'Am Wortlaut geprüft: ErbStG, BewG §§ 14 und 16, GModG (seit 29.07.2026 statt GEG), BGB §§ 656b–656d und 1365, WEG § 12, BeurkG § 17, GrEStG § 20, BauGB § 196, ImmoWertV §§ 9, 18 und 40.',
    quelle:'gesetze-im-internet.de'});
  return {liste:l,faellig:l.filter(x=>x.status==='faellig').length,bald:l.filter(x=>x.status==='bald').length};
}

/* ========== Interessenten und Akquise: Trichter je Quelle oder Objekt (D40) ==========
   v.stufe = höchste erreichte Stufe (0 = erste), v.abgesagt = beendet ohne Abschluss. Gezählt wird je Gruppe, wie viele
   Vorgänge jede Stufe mindestens erreicht haben — eine Absage nach der Besichtigung zählt also als Besichtigung. */
function trichter(liste,stufen,schluessel){
  const n=(stufen||[]).length, gruppen={};
  (liste||[]).forEach(v=>{ if(!v||typeof v!=='object') return;
    const g=String(v[schluessel]||'ohne Angabe'), r=gruppen[g]||(gruppen[g]={gruppe:g,anzahl:0,stufen:new Array(n).fill(0),abgesagt:0});
    r.anzahl++; const s=Math.max(0,Math.min(n-1,Math.floor(+v.stufe||0))); for(let i=0;i<=s;i++) r.stufen[i]++; if(v.abgesagt) r.abgesagt++; });
  return Object.values(gruppen).sort((a,b)=>b.anzahl-a.anzahl||a.gruppe.localeCompare(b.gruppe,'de'));
}

/* ========== Vorlagen: Platzhalter füllen (D40) ==========
   {name} wird ersetzt; [[ … ]] ist ein optionaler Teil, der ganz entfällt, wenn ein Platzhalter darin leer ist.
   Leere Pflicht-Platzhalter (außerhalb von [[ ]]) meldet „fehlt“. Mehr als eine Leerzeile wird zusammengezogen. */
function vorlageFuellen(text,werte){
  werte=werte||{}; const fehlt=[];
  const wert=k=>{ const v=werte[k]; return v==null?'':String(v); };
  let t=String(text==null?'':text).replace(/\[\[([\s\S]*?)\]\]/g,(m,inhalt)=>(inhalt.match(/\{([a-z_0-9]+)\}/g)||[]).some(p=>!wert(p.slice(1,-1)).trim())?'':inhalt);
  t=t.replace(/\{([a-z_0-9]+)\}/g,(m,k)=>{ const v=wert(k); if(!v.trim()&&!fehlt.includes(k)) fehlt.push(k); return v; });
  t=t.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  return {text:t,fehlt};
}
/* Briefanrede aus der Kundenakte (Anrede Frau/Herr/Divers/Firma) */
function briefAnrede(k){
  k=k||{}; const n=String(k.nachname||'').trim(), v=String(k.vorname||'').trim();
  if(k.anrede==='Frau'&&n) return 'Sehr geehrte Frau '+n+',';
  if(k.anrede==='Herr'&&n) return 'Sehr geehrter Herr '+n+',';
  if(k.anrede==='Firma'||(!n&&!v)) return 'Sehr geehrte Damen und Herren,';
  return 'Guten Tag '+[v,n].filter(Boolean).join(' ')+',';
}

/* ========== Bieterverfahren: Rangfolge der Gebote (D40) ==========
   Gültig sind Gebote mit Betrag, die nicht zurückgezogen oder abgelehnt sind. Gleich hohe Gebote: das frühere zuerst.
   Abstand zum Angebotspreis und zum Höchstgebot in Prozent. */
function bieterRang(gebote,preis){
  const p=+preis>0?+preis:0;
  const g=(gebote||[]).filter(x=>x&&!['zurückgezogen','abgelehnt'].includes(x.status)&&+x.betrag>0).map(x=>Object.assign({},x,{betrag:+x.betrag}));
  g.sort((a,b)=>b.betrag-a.betrag||String(a.datum||'').localeCompare(String(b.datum||''))||String(a.zeit||'').localeCompare(String(b.zeit||'')));
  return g.map((x,i)=>Object.assign(x,{rang:i+1,abstandPreis:p?(x.betrag/p-1)*100:null,abstandErstes:i?(x.betrag/g[0].betrag-1)*100:0}));
}

/* ========== Kaufen oder Mieten: Vermögensvergleich (D40) ==========
   Monatsweise Modellrechnung über den Betrachtungszeitraum, alle Werte sind Annahmen der Beratung:
   - Kauf: Darlehen = Kaufpreis × (1 + Nebenkosten) − Eigenkapital; Annuität = Darlehen × (Zins + anfängliche Tilgung) / 12,
     Zinsen monatlich auf die Restschuld (Zins / 12), Rest ist Tilgung, bis das Darlehen getilgt ist. Instandhaltung je Jahr,
     jährlich um die Kostensteigerung erhöht. Der Wert der Immobilie steigt jährlich um die Wertsteigerung (monatlich verteilt).
   - Miete: Kaltmiete je Monat, jährlich um die Mietsteigerung erhöht. Das Eigenkapital wird angelegt.
   - Gleiche Belastung: Wer im Monat weniger zahlt, legt den Unterschied zur Rendite der Geldanlage (nach Steuern) an.
   - Vermögen Kauf = Wert − Restschuld + angelegter Unterschied; Vermögen Miete = Depot.
   Nebenkosten der Wohnung, die Mieter und Eigentümer gleichermaßen tragen (Betriebskosten, Grundsteuer), bleiben außen vor. */
function kaufMiete(e){
  e=e||{};
  const preis=pos(e.preis), nk=pos(e.nk)/100, ek=pos(e.ek), zins=pos(e.zins)/100, tilg=pos(e.tilgung)/100, jahre=Math.max(1,Math.min(60,Math.round(zahl(e.jahre)||30)));
  const inst0=pos(e.instandhaltung), kost=zahl(e.kostensteigerung)/100, wert=zahl(e.wertsteigerung)/100, miete0=pos(e.miete), mst=zahl(e.mietsteigerung)/100, anl=zahl(e.anlagezins)/100;
  const gesamt=preis*(1+nk), darlehen=Math.max(0,gesamt-ek);
  const rate=darlehen*(zins+tilg)/12, im=Math.pow(1+anl,1/12)-1, wm=Math.pow(1+wert,1/12)-1;
  let rest=darlehen, depotKauf=Math.max(0,ek-gesamt), depotMiete=ek, w=preis, zinsenSumme=0, getilgtMonat=null;
  const zeilen=[{jahr:0,wert:preis,restschuld:rest,kauf:w-rest+depotKauf,miete:depotMiete,mieteMonat:miete0,belastungKauf:rate+inst0/12}];
  for(let j=1;j<=jahre;j++){
    const m0=miete0*Math.pow(1+mst,j-1), inst=inst0*Math.pow(1+kost,j-1)/12;
    let belastung=0;
    for(let m=1;m<=12;m++){
      let r=0;
      if(rest>0){ const z=rest*zins/12; r=Math.min(rate,rest+z); rest=Math.max(0,rest+z-r); zinsenSumme+=z; if(rest<=1e-6&&getilgtMonat==null){ rest=0; getilgtMonat=(j-1)*12+m; } }
      const kosten=r+inst; belastung=kosten;
      depotKauf*=1+im; depotMiete*=1+im;
      if(kosten>m0) depotMiete+=kosten-m0; else depotKauf+=m0-kosten;
      w*=1+wm;
    }
    zeilen.push({jahr:j,wert:w,restschuld:rest,kauf:w-rest+depotKauf,miete:depotMiete,mieteMonat:m0,belastungKauf:belastung});
  }
  let ab=null; for(let i=1;i<zeilen.length;i++){ if(zeilen[i].kauf>=zeilen[i].miete){ if(ab==null) ab=zeilen[i].jahr; } else ab=null; }
  const ende=zeilen[zeilen.length-1];
  return {darlehen,rate,nebenkosten:preis*nk,zeilen,abJahr:ab,ende,vorteil:ende.kauf-ende.miete,zinsen:zinsenSumme,getilgtNachMonaten:getilgtMonat};
}

const ImmoBeratung={ERB_VERHAELTNIS,ERB_SAETZE,erbstSteuer,klasseFuer,freibetragFuer,BMF_VERVIELFAELTIGER,zeitrenteBewG,vervielfaeltigerBewG,vervielfaeltigerQuelle,kapitalwertNutzung,familienheimFrei,erwerbSteuer,uebertragung,restLeben,
  ueberleben,rentenfaktor,lebenserwartung,verrentung,residualwert,residualSpanne,
  petersRuecklage,heizungPruefen,etwCheck,ETW_UNTERLAGEN,JAHR_PHASEN,JAHR_WAHRSCHEINLICHKEIT,pipeline,plusMonate,
  ics,icsText,icsFalten,icsEreignis,icsKalender,monatsRaster,trichter,vorlageFuellen,briefAnrede,bieterRang,kaufMiete,notarFrist,tageZwischen,tagePlus,datenstand,RECHT_GEPRUEFT};
wurzel.ImmoBeratung=ImmoBeratung;
if(typeof module==='object'&&module.exports) module.exports=ImmoBeratung;
})(typeof globalThis!=='undefined'?globalThis:this);
