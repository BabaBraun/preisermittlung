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
        loeschpruefungFaellig, notarErledigtAlt, abrechnungenAlt, vollmachtenAlt} */
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
  if(+e.abrechnungenAlt>0){   // D45
    const n=+e.abrechnungenAlt;
    l.push({id:'abrechnungen',gruppe:'daten',titel:'Bezahlte Provisionsabrechnungen',stand:n+' seit über 12 Monaten bezahlt',naechste:'–',status:'bald',
      text:'Sie enthalten Namen und Anschriften. Die Rechnungen bewahrt die Bank in ihrer Buchhaltung auf (§ 14b UStG) — die Arbeitskopie in der App löschen.',quelle:'Provision'});
  }
  if(+e.vollmachtenAlt>0){
    const n=+e.vollmachtenAlt;
    l.push({id:'vollmachten',gruppe:'daten',titel:'Vollmachten verkaufter Objekte',stand:n+' Objekt'+(n===1?'':'e')+' seit über 6 Monaten verkauft',naechste:'–',status:'bald',
      text:'Die Vollmacht zum Einholen der Unterlagen gilt bis zum Abschluss des Verkaufs und enthält Name und Unterschrift — Unterlagen-Eintrag löschen.',quelle:'Unterlagen'});
  }
  // Rechtsstand der Rechnungen und Hinweise
  const wieder=tagePlus(RECHT_GEPRUEFT,182);
  l.push({id:'recht',gruppe:'recht',titel:'Rechtsstand der Rechnungen und Hinweise',stand:'geprüft am '+datumDE(RECHT_GEPRUEFT),naechste:'erneut prüfen ab '+datumDE(wieder),
    status:heute>=wieder?'bald':'ok',
    text:'Am Wortlaut geprüft: ErbStG, BewG §§ 14 und 16, GModG (seit 29.07.2026 statt GEG), BGB §§ 652 und 656a–656d und 1365, WEG § 12, BeurkG § 17, GrEStG §§ 2, 8, 9, 11 und 20, GrEStFestG BW § 1, GNotKG §§ 34, 45, 47, 53, 112, 113 mit Kostenverzeichnis, UStG §§ 12, 14 und 14b, BauGB § 196, ImmoWertV §§ 9, 18 und 40.',
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

/* ========== Aktivitäten: Zeiträume (D40) ==========
   art: woche | vorwoche | monat | vormonat | quartal | jahr — Kalenderwoche ab Montag, Monat, Quartal, Jahr; dazu der gleich lange
   Vorzeitraum für den Vergleich. Alle Daten als 'JJJJ-MM-TT', beide Grenzen eingeschlossen. */
function zeitraum(art,heute){
  heute=/^\d{4}-\d{2}-\d{2}$/.test(heute||'')?heute:new Date().toISOString().slice(0,10);
  const d=new Date(heute+'T00:00:00Z'), iso=x=>x.toISOString().slice(0,10), tag=(j,m,t)=>new Date(Date.UTC(j,m,t));
  const J=d.getUTCFullYear(), M=d.getUTCMonth(), wt=(d.getUTCDay()+6)%7;
  let von, bis, vorVon, vorBis;
  if(art==='woche'||art==='vorwoche'){
    const mo=new Date(d.getTime()-wt*864e5), s=art==='vorwoche'?-7:0;
    von=new Date(mo.getTime()+s*864e5); bis=new Date(von.getTime()+6*864e5); vorVon=new Date(von.getTime()-7*864e5); vorBis=new Date(von.getTime()-864e5);
  } else if(art==='monat'||art==='vormonat'){
    const m=art==='vormonat'?M-1:M; von=tag(J,m,1); bis=tag(J,m+1,0); vorVon=tag(J,m-1,1); vorBis=tag(J,m,0);
  } else if(art==='quartal'){
    const q=Math.floor(M/3)*3; von=tag(J,q,1); bis=tag(J,q+3,0); vorVon=tag(J,q-3,1); vorBis=tag(J,q,0);
  } else { von=tag(J,0,1); bis=tag(J,11,31); vorVon=tag(J-1,0,1); vorBis=tag(J-1,11,31); }
  return {von:iso(von),bis:iso(bis),vorVon:iso(vorVon),vorBis:iso(vorBis)};
}

/* ========== Notar und Grundbuch nach dem GNotKG, Kaufnebenkosten, Erlös des Verkäufers (D42) ==========
   Wertgebühr nach § 34 Abs. 2 GNotKG (Fassung BGBl. 2025 I Nr. 109): Grundbetrag bis 500 € und Zuschlag je angefangenem
   Schritt; auf den Cent gerundet (§ 34 Abs. 4), mindestens 15 € (§ 34 Abs. 5). Notare und Grundbuchämter rechnen nach
   Tabelle B (Kostenverzeichnis Teil 1 Hauptabschnitt 4 und Teil 2). Gegen alle 92 Zeilen der Anlage 2 geprüft
   (tests/unit/d42.test.mjs). Zeilen: [bis Geschäftswert, Schritt, Zuschlag je angefangenem Schritt]; erste Zeile = Grundbetrag. */
const GNOTKG_A=[[500,0,40],[2000,500,21],[10000,1000,22.5],[25000,3000,30.5],[50000,5000,40.5],[200000,15000,140],[500000,30000,210],[Infinity,50000,210]];
const GNOTKG_B=[[500,0,15],[2000,500,4],[10000,1000,6],[25000,3000,8],[50000,5000,10],[200000,15000,27],[500000,30000,50],
  [5000000,50000,80],[10000000,200000,130],[20000000,250000,150],[30000000,500000,280],[Infinity,1000000,120]];
function gnotkgTabelle(wert,tabelle){
  const st=tabelle==='A'?GNOTKG_A:GNOTKG_B;
  const cent=Math.max(0,Math.round((+wert||0)*100));   // in Cent rechnen: „angefangener Betrag“ ohne Rundungsfehler
  let g=st[0][2], unten=st[0][0]*100;
  for(let i=1;i<st.length&&cent>unten;i++){
    const bis=st[i][0]*100, schritt=st[i][1]*100, teil=Math.min(cent,bis)-unten;
    g+=Math.ceil(teil/schritt)*st[i][2]; unten=bis;
  }
  return Math.round(g*100)/100;
}
/* Gebühr mit Satz (z. B. 2,0) und Grenzen des Kostenverzeichnisses: o={min, max, tabelle} */
function gnotkgGebuehr(wert,satz,o){
  o=o||{}; if(!(+satz>0)||!(+wert>0)) return 0;
  let g=Math.round(satz*gnotkgTabelle(wert,o.tabelle)*100+1e-6)/100;   // 0,5 Cent werden aufgerundet
  g=Math.max(g,15,+o.min||0);
  if(+o.max>0) g=Math.min(g,+o.max);
  return g;
}
const cent2=x=>Math.round((+x||0)*100+1e-6)/100;
const deSatz=(x,min)=>(+x||0).toLocaleString('de-DE',{minimumFractionDigits:min||0,maximumFractionDigits:2});
/* Kaufnebenkosten des Käufers.
   e={preis, inventar, grestSatz, maklerSatz (% inkl. USt), grundschuld, vollzug:'voll'|'begrenzt'|'kein', vollzugTaetigkeiten,
      betreuung, vormerkung, xml, auslagenKauf, auslagenGs (netto, geschätzt), ust}
   Geschäftswert: Kaufpreis (§ 47 GNotKG) für Beurkundung, Vollzug (§ 112), Betreuung (§ 113 Abs. 1), Vormerkung (§ 45 Abs. 3)
   und Eigentumsumschreibung; Grundschuld: Nennbetrag (§ 53 Abs. 1). Grunderwerbsteuer: Kaufpreis ohne bewegliche Gegenstände
   (§§ 2, 8, 9 GrEStG), auf volle Euro abgerundet (§ 11 Abs. 2 GrEStG). Umsatzsteuer nur auf die Notarkosten (Nr. 32014 KV). */
function kaufnebenkosten(e){
  e=e||{};
  const pos=x=>Math.max(0,+x||0), preis=pos(e.preis), inventar=Math.min(pos(e.inventar),preis), gs=pos(e.grundschuld);
  const ust=e.ust==null||e.ust===''?19:pos(e.ust), posten=[];
  const add=(gruppe,text,nr,wert,satz,betrag)=>{ betrag=cent2(betrag); if(betrag>0) posten.push({gruppe,text,nr,wert,satz,betrag}); return betrag; };
  const notar=(gruppe,gebuehren,auslagen)=>{
    const pauschale=gebuehren>0?Math.min(20,cent2(gebuehren*0.2)):0;   // Nr. 32005: 20 % der Gebühren, höchstens 20 €
    add(gruppe,'Pauschale für Post und Telekommunikation','32005',null,null,pauschale);
    const ausl=gebuehren>0?cent2(pos(auslagen)):0;
    add(gruppe,'Kopien, Grundbuchabrufe und andere Auslagen (geschätzt)','32001, 32011',null,null,ausl);
    const netto=cent2(gebuehren+pauschale+ausl), steuer=cent2(netto*ust/100);
    add(gruppe,'Umsatzsteuer '+deSatz(ust)+' %','32014',null,null,steuer);
    return {gebuehren:cent2(gebuehren),pauschale,auslagen:ausl,netto,ust:steuer,brutto:cent2(netto+steuer)};
  };
  // Notar: Kaufvertrag
  let g=0;
  g+=add('notarKauf','Beurkundung des Kaufvertrags','21100',preis,2,gnotkgGebuehr(preis,2,{min:120}));
  let vollzug=0;
  if(e.vollzug==='voll') vollzug=gnotkgGebuehr(preis,0.5);
  else if(e.vollzug==='begrenzt') vollzug=Math.min(gnotkgGebuehr(preis,0.5),50*Math.max(1,Math.round(+e.vollzugTaetigkeiten||1)));
  g+=add('notarKauf',e.vollzug==='begrenzt'?'Vollzug: nur Bescheinigungen nach öffentlichem Recht, höchstens 50 € je Tätigkeit':'Vollzug: Genehmigungen, Vorkaufsrecht, Löschungsunterlagen',
    e.vollzug==='begrenzt'?'22110, 22112':'22110',preis,0.5,vollzug);
  if(e.betreuung) g+=add('notarKauf','Betreuung: Fälligkeitsmitteilung, Überwachung der Umschreibung','22200',preis,0.5,gnotkgGebuehr(preis,0.5));
  if(e.xml) g+=add('notarKauf','Strukturdaten (XML) für das Grundbuchamt',vollzug>0?'22114, 22115':'22114',preis,vollzug>0?0.1:0.2,gnotkgGebuehr(preis,vollzug>0?0.1:0.2,{max:125}));
  const notarKauf=preis>0?notar('notarKauf',g,e.auslagenKauf):{gebuehren:0,pauschale:0,auslagen:0,netto:0,ust:0,brutto:0};
  // Notar: Grundschuld für die Finanzierung
  let notarGs={gebuehren:0,pauschale:0,auslagen:0,netto:0,ust:0,brutto:0};
  if(gs>0){
    let h=add('notarGs','Beurkundung der Grundschuld','21200',gs,1,gnotkgGebuehr(gs,1,{min:60}));
    if(e.xml) h+=add('notarGs','Strukturdaten (XML) für das Grundbuchamt','22114',gs,0.2,gnotkgGebuehr(gs,0.2,{max:125}));
    notarGs=notar('notarGs',h,e.auslagenGs);
  }
  // Grundbuchamt (ohne Umsatzsteuer)
  let gb=0;
  if(preis>0){
    if(e.vormerkung) gb+=add('grundbuch','Eintragung der Auflassungsvormerkung','14150',preis,0.5,gnotkgGebuehr(preis,0.5));
    gb+=add('grundbuch','Eintragung des Käufers als Eigentümer','14110',preis,1,gnotkgGebuehr(preis,1));
    if(e.vormerkung) gb+=add('grundbuch','Löschung der Vormerkung','14152',null,null,25);
  }
  if(gs>0) gb+=add('grundbuch','Eintragung der Grundschuld','14121',gs,1,gnotkgGebuehr(gs,1));
  // Grunderwerbsteuer und Makler
  const grestBasis=preis-inventar, grest=Math.floor(grestBasis*pos(e.grestSatz)/100+1e-9);
  add('steuer','Grunderwerbsteuer '+deSatz(pos(e.grestSatz),1)+' % auf '+Math.round(grestBasis).toLocaleString('de-DE')+' €','',grestBasis,null,grest);
  const makler=cent2(preis*pos(e.maklerSatz)/100);
  add('makler','Maklerprovision '+deSatz(pos(e.maklerSatz),2)+' % inkl. Umsatzsteuer','',preis,null,makler);
  const summe=cent2(notarKauf.brutto+notarGs.brutto+gb+grest+makler);
  return {posten,notarKauf,notarGs,grundbuch:cent2(gb),grest,grestBasis,makler,summe,quote:preis>0?summe/preis*100:0,
    notarGrundbuchQuote:preis>0?(notarKauf.brutto+notarGs.brutto+gb)/preis*100:0};
}
/* Was bleibt dem Verkäufer? e={preis, maklerSatz (% inkl. USt), restschuld (Ablösebetrag), vorfaelligkeit, grundschuldNenn
   (Nennbetrag der zu löschenden Grundschulden), treuhand (Treuhandauflage der Bank), sonstiges, ust}
   Löschung in Abt. III: 0,5 nach dem Nennbetrag (Nr. 14140 KV, § 53 Abs. 1 GNotKG); Treuhandgebühr 0,5 nach dem Ablösebetrag
   (Nr. 22201 KV, § 113 Abs. 2 GNotKG) zuzüglich Umsatzsteuer. */
function verkaeuferErloes(e){
  e=e||{};
  const pos=x=>Math.max(0,+x||0), preis=pos(e.preis), rest=pos(e.restschuld), nenn=pos(e.grundschuldNenn), ust=e.ust==null||e.ust===''?19:pos(e.ust);
  const makler=cent2(preis*pos(e.maklerSatz)/100);
  const loeschung=nenn>0?gnotkgGebuehr(nenn,0.5):0;
  const treuhandNetto=e.treuhand&&rest>0?gnotkgGebuehr(rest,0.5):0, treuhand=cent2(treuhandNetto*(1+ust/100));
  const vfe=cent2(pos(e.vorfaelligkeit)), sonst=cent2(pos(e.sonstiges));
  const kosten=cent2(makler+loeschung+treuhand+vfe+sonst);
  return {preis,makler,loeschung,treuhandNetto,treuhand,vorfaelligkeit:vfe,sonstiges:sonst,restschuld:rest,kosten,
    erloesVorAbloese:cent2(preis-kosten),erloes:cent2(preis-kosten-rest)};
}

/* ========== Provision: Beträge, Teilung nach §§ 656b–656d BGB, Fälligkeit, Rechnungsfrist (D42) ==========
   Satz in % inklusive Umsatzsteuer (so steht er im Exposé) oder ein fester Betrag inklusive Umsatzsteuer. Auf der Rechnung
   steht das Entgelt netto, die Steuer auf das Entgelt und der Gesamtbetrag (§ 14 Abs. 4 Nr. 7 und 8 UStG). */
function provisionBetrag(preis,o){
  o=o||{}; const ust=o.ust==null||o.ust===''?19:Math.max(0,+o.ust||0);
  let brutto=o.art==='fest'?Math.max(0,+o.betrag||0):Math.max(0,+preis||0)*Math.max(0,+o.satz||0)/100;
  const netto=cent2(brutto*100/(100+ust)), steuer=cent2(netto*ust/100);
  return {netto,ust:steuer,brutto:cent2(netto+steuer),satzNetto:o.art==='fest'||!(+preis>0)?null:netto/preis*100};
}
/* a={art:'efh'|'wohnung'|'andere', kaeuferVerbraucher, vertragDatum, bedingung, bedingungDatum,
      parteien:[{rolle:'verkaeufer'|'kaeufer', maklervertrag, brutto, bezahltAm, rechnungDatum, rechnungNr}]}
   Liefert Prüfpunkte {stufe:'gruen'|'gelb'|'rot', text} und je Partei den frühesten Fälligkeitstag. */
function provisionPruefen(a,heute){
  a=a||{}; heute=heute||new Date().toISOString().slice(0,10);
  const l=[], P=(a.parteien||[]).filter(p=>p&&(p.rolle==='verkaeufer'||p.rolle==='kaeufer'));
  const v=P.find(p=>p.rolle==='verkaeufer')||{}, k=P.find(p=>p.rolle==='kaeufer')||{};
  const betrag=p=>Math.max(0,+p.brutto||0), datum=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x:'';
  const wohnen=a.art==='efh'||a.art==='wohnung', gilt=wohnen&&a.kaeuferVerbraucher!==false;
  if(wohnen) l.push({stufe:'gruen',text:'Maklerverträge über eine Wohnung oder ein Einfamilienhaus brauchen die Textform, z. B. E-Mail (§ 656a BGB).'});
  // Entstehung: Kaufvertrag wirksam, bei aufschiebender Bedingung erst mit deren Eintritt (§ 652 Abs. 1 BGB)
  let basis=datum(a.vertragDatum);
  if(!basis) l.push({stufe:'gelb',text:'Datum des Kaufvertrags fehlt — der Anspruch entsteht erst, wenn der Kaufvertrag zustande gekommen ist (§ 652 Abs. 1 Satz 1 BGB).'});
  if(a.bedingung){
    if(datum(a.bedingungDatum)) basis=basis&&basis>a.bedingungDatum?basis:datum(a.bedingungDatum);
    else { l.push({stufe:'gelb',text:'Der Kaufvertrag steht unter einer aufschiebenden Bedingung: Provision erst, wenn sie eingetreten ist (§ 652 Abs. 1 Satz 2 BGB).'}); basis=''; }
  }
  const faellig={verkaeufer:basis,kaeufer:basis}, grund={verkaeufer:'',kaeufer:''};
  if(gilt){
    const vV=!!v.maklervertrag, vK=!!k.maklervertrag;
    if(vV&&vK){
      if(Math.abs(betrag(v)-betrag(k))>0.005)
        l.push({stufe:'rot',text:'Der Makler ist für beide Seiten tätig: Provision nur in gleicher Höhe (§ 656c Abs. 1 Satz 1 BGB). Ein abweichender Maklervertrag ist unwirksam (§ 656c Abs. 2 BGB).'});
      else if(betrag(v)>0) l.push({stufe:'gruen',text:'Beide Seiten zahlen gleich viel — entspricht § 656c Abs. 1 BGB.'});
    } else if(vV!==vK){
      const auftrag=vV?v:k, andere=vV?k:v, an=vV?'kaeufer':'verkaeufer', wer=vV?'Verkäufer':'Käufer', wem=vV?'Käufer':'Verkäufer';
      if(betrag(andere)>0){
        if(betrag(andere)-betrag(auftrag)>0.005)
          l.push({stufe:'rot',text:'Nur der '+wer+' hat den Makler beauftragt: Der '+wem+' darf höchstens so viel tragen wie der '+wer+' (§ 656d Abs. 1 Satz 1 BGB).'});
        else l.push({stufe:'gruen',text:'Der '+wem+' trägt nicht mehr als der beauftragende '+wer+' (§ 656d Abs. 1 Satz 1 BGB).'});
        const bez=datum(auftrag.bezahltAm);
        faellig[an]=bez&&basis?(bez>basis?bez:basis):'';
        grund[an]=bez?'seit Zahlung des '+wer+'s am '+bez.split('-').reverse().join('.')+' (§ 656d Abs. 1 Satz 2 BGB)':'erst, wenn der '+wer+' gezahlt hat und das nachgewiesen ist (§ 656d Abs. 1 Satz 2 BGB)';
        if(!bez) l.push({stufe:'gelb',text:'Der Anteil des '+wem+'s wird erst fällig, wenn der '+wer+' seine Provision gezahlt hat und das nachgewiesen ist (§ 656d Abs. 1 Satz 2 BGB).'});
      }
    } else if(betrag(v)>0||betrag(k)>0)
      l.push({stufe:'gelb',text:'Bei keiner Seite ist ein Maklervertrag vermerkt — ohne Maklervertrag kein Anspruch (§ 652 Abs. 1 BGB).'});
  } else if(wohnen) l.push({stufe:'gruen',text:'Der Käufer ist kein Verbraucher: Die Teilungsregeln der §§ 656c und 656d BGB gelten nicht (§ 656b BGB).'});
  else l.push({stufe:'gruen',text:'Kein Einfamilienhaus und keine Wohnung: Die Teilungsregeln der §§ 656c und 656d BGB gelten nicht.'});
  // Rechnung innerhalb von sechs Monaten nach der Leistung (§ 14 Abs. 2 Satz 2 UStG, Abschnitt 14.2 UStAE: Makler)
  const vd=datum(a.vertragDatum);
  if(vd){
    const frist=isoPlusMonate(vd,6);
    P.filter(p=>betrag(p)>0&&!datum(p.rechnungDatum)).forEach(p=>{
      const rest=tageZwischen(heute,frist), wer=p.rolle==='verkaeufer'?'Verkäufer':'Käufer';
      if(rest<0) l.push({stufe:'rot',text:'Rechnung an den '+wer+' fehlt: Sie war bis '+frist.split('-').reverse().join('.')+' fällig — sechs Monate nach der Leistung (§ 14 Abs. 2 Satz 2 UStG).'});
      else if(rest<=30) l.push({stufe:'gelb',text:'Rechnung an den '+wer+' bis '+frist.split('-').reverse().join('.')+' stellen (sechs Monate nach der Leistung, § 14 Abs. 2 Satz 2 UStG).'});
    });
  }
  return {liste:l,faellig,grund,rot:l.filter(x=>x.stufe==='rot').length};
}
/* ISO-Datum plus Monate; gibt es den Tag im Zielmonat nicht, dessen letzter Tag (§ 188 Abs. 3 BGB) */
function isoPlusMonate(iso,m){ const [J,M,T]=String(iso).split('-').map(Number), r=new Date(Date.UTC(J,M-1+m,T)); if(r.getUTCDate()!==T) r.setUTCDate(0); return r.toISOString().slice(0,10); }
/* Nächste Rechnungsnummer: fortlaufend je Präfix (§ 14 Abs. 4 Nr. 4 UStG) — höchste vergebene Zahl + 1 */
function rechnungsnummer(praefix,vergeben,jahr){
  praefix=String(praefix==null?'':praefix).replace(/\{jahr\}/g,String(jahr||new Date().getFullYear()));
  let max=0; (vergeben||[]).forEach(n=>{ n=String(n||''); if(n.startsWith(praefix)){ const m=/^(\d+)$/.exec(n.slice(praefix.length)); if(m) max=Math.max(max,+m[1]); } });
  return praefix+String(max+1).padStart(3,'0');
}

const ImmoBeratung={ERB_VERHAELTNIS,ERB_SAETZE,erbstSteuer,klasseFuer,freibetragFuer,BMF_VERVIELFAELTIGER,zeitrenteBewG,vervielfaeltigerBewG,vervielfaeltigerQuelle,kapitalwertNutzung,familienheimFrei,erwerbSteuer,uebertragung,restLeben,
  ueberleben,rentenfaktor,lebenserwartung,verrentung,residualwert,residualSpanne,
  petersRuecklage,heizungPruefen,etwCheck,ETW_UNTERLAGEN,JAHR_PHASEN,JAHR_WAHRSCHEINLICHKEIT,pipeline,plusMonate,
  ics,icsText,icsFalten,icsEreignis,icsKalender,monatsRaster,trichter,vorlageFuellen,briefAnrede,bieterRang,kaufMiete,zeitraum,notarFrist,tageZwischen,tagePlus,datenstand,RECHT_GEPRUEFT,
  GNOTKG_A,GNOTKG_B,gnotkgTabelle,gnotkgGebuehr,kaufnebenkosten,verkaeuferErloes,provisionBetrag,provisionPruefen,rechnungsnummer,isoPlusMonate};
wurzel.ImmoBeratung=ImmoBeratung;
if(typeof module==='object'&&module.exports) module.exports=ImmoBeratung;
})(typeof globalThis!=='undefined'?globalThis:this);
