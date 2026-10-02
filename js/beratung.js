/* ImmoApp — Rechnungen der Beratungswerkzeuge (ohne DOM, in Node testbar), D38
   Jede Rechnung nennt ihre Quelle. Gesetzesstand: ErbStG, BewG, BGB, GEG wie unten angegeben; Annahmen (z. B. Zinsen,
   Wagnis und Gewinn) sind Eingaben und werden in der Oberfläche als Annahme gekennzeichnet.
   - Übergeben & Vererben: ErbStG §§ 10, 13, 13d, 14, 15, 16, 19, 22; BewG §§ 14, 16
   - Wohnen im Alter: Barwert von Leibrenten nach Sterbetafel (Statistisches Bundesamt), monatlich vorschüssig,
     Gleichverteilung der Sterbefälle im Jahr; zwei Personen: Rente bis zum Tod des Letztversterbenden
   - Mieterhöhung: BGB §§ 556d–556f, 558, 558b, 559, 559a, 559b, 559c
   - Grundstückspotenzial: deduktive Bodenwertermittlung (Residualwert), § 40 Abs. 3 ImmoWertV
   - ETW-Kaufcheck: Peters'sche Formel (Instandhaltung), GEG § 72 (Betriebsverbot alter Heizkessel)
   - Mein Jahr: Provision bei Halbteilung, § 656c BGB */
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
/* Vervielfältiger einer lebenslänglichen Nutzung (§ 14 Abs. 1 BewG): Sterbetafel des Statistischen Bundesamts,
   5,5 % Zins, Mittelwert aus jährlich vorschüssiger und nachschüssiger Zahlung = a(x) + 0,5; vollendetes Lebensalter.
   Das Finanzamt nimmt die vom BMF veröffentlichte Tabelle des Bewertungsjahres — sie kann auf einer älteren
   Sterbetafel beruhen; deshalb lässt die Oberfläche den Tabellenwert eintragen. */
function vervielfaeltigerBewG(alter,g,tafel){
  const t=tafelFuer(g,tafel); if(!t||!(alter>=0)||!Number.isFinite(+alter)) return 0;
  const x=Math.min(Math.floor(alter),t.lx.length-1), v=1/1.055;
  let a=0, vt=1;
  for(let k=1;k<=200;k++){ vt*=v; const term=vt*lx(t,x+k)/lx(t,x); a+=term; if(term<1e-12) break; }
  return Math.round((a+0.5)*1000)/1000;
}
/* Kapitalwert von Nießbrauch oder Wohnrecht: Jahreswert höchstens Steuerwert / 18,6 (§ 16 BewG); bei zwei Berechtigten,
   wenn das Recht mit dem Tod des Letztversterbenden erlischt, gilt der höchste Vervielfältiger (§ 14 Abs. 3 BewG) */
function kapitalwertNutzung(o){
  const steuerwert=pos(o.steuerwert), roh=pos(o.jahreswert), grenze=steuerwert>0?steuerwert/18.6:roh;
  const jahreswert=Math.min(roh,grenze);
  const vs=(o.personen||[]).filter(p=>p&&zahl(p.alter)>0).map(p=>vervielfaeltigerBewG(zahl(p.alter),p.g,o.tafel));
  const manuell=pos(o.vManuell);
  const v=manuell>0?manuell:(vs.length?(o.erstVersterbend?Math.min(...vs):Math.max(...vs)):0);
  return {jahreswert,begrenzt:roh>jahreswert+1e-9,vervielfaeltiger:v,vervielfaeltigerBerechnet:vs,kapitalwert:jahreswert*v};
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
   Steuer (§ 19), Abzug der Steuer auf die Vorerwerbe (fiktiv oder tatsächlich, die höhere), höchstens 50 % des
   Erwerbs (§ 14 Abs. 3), Kleinbetrag bis 50 € (§ 22) */
function erwerbSteuer(bereicherung,vorerwerb,vorsteuer,klasse,freibetrag){
  const b=pos(bereicherung), vor=pos(vorerwerb);
  const gesamt=b+vor, nachFb=Math.max(0,gesamt-freibetrag), st=erbstSteuer(nachFb,klasse);
  const vorFiktiv=erbstSteuer(Math.max(0,vor-freibetrag),klasse).steuer, abzug=Math.max(vorFiktiv,pos(vorsteuer));
  let steuer=Math.max(0,st.steuer-abzug), kappung=false, klein=false;
  if(steuer>0.5*b){ steuer=Math.floor(0.5*b); kappung=true; }
  if(steuer>0&&steuer<=50){ steuer=0; klein=true; }
  return {bereicherung:b,vorerwerb:vor,gesamt,freibetrag,freibetragGenutzt:Math.min(gesamt,freibetrag),steuerpflichtig:st.erwerb,satz:st.satz,
    steuerGesamt:st.steuer,abzugVorerwerb:abzug,steuer,haerteausgleich:st.haerteausgleich,kappung,kleinbetrag:klein};
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
  const recht=vorbehalt!=='keiner'?kapitalwertNutzung({steuerwert:wert,jahreswert:pos(e.jahreswert)*ua,personen:e.personen,vManuell:e.vManuell,tafel}):null;
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
   o={wert, miete, personen, zins, abschlag, garantie, teilAnteil, teilEntgelt, teilGebuehr, rueckMiete, rueckKosten, wertsteigerung} */
function verrentung(o,tafel){
  const wert=pos(o.wert), miete=pos(o.miete), zins=pos(o.zins), g=zahl(o.wertsteigerung)/100;
  const n=lebenserwartung(o.personen,tafel), fLeben=rentenfaktor(o.personen,zins,0,tafel), fGarantie=rentenfaktor(o.personen,zins,o.garantie,tafel);
  const wohnrecht=12*miete*fLeben;   // Barwert des lebenslangen Wohnrechts (Mietwert)
  const wertEnde=wert*Math.pow(1+g,n);
  const auszahlung=Math.max(0,wert*(1-anteil(o.abschlag))-wohnrecht);
  const rente=fGarantie>0?auszahlung/(12*fGarantie):0;
  const ta=anteil(o.teilAnteil), teilBetrag=wert*ta, entgelt=teilBetrag*anteil(o.teilEntgelt)/12;
  const rueckErloes=wert*(1-anteil(o.rueckKosten)), rueckMiete=o.rueckMiete===''||o.rueckMiete==null?miete:pos(o.rueckMiete);
  const rueckRente=fLeben>0?rueckErloes/(12*fLeben):0;
  const wege=[
    {id:'einmal',name:'Verkauf mit lebenslangem Wohnrecht',sofort:auszahlung,monatlich:0,summe:auszahlung,erben:0,wohnen:'Wohnrecht, mietfrei'},
    {id:'rente',name:'Verkauf gegen Leibrente mit Wohnrecht',sofort:0,monatlich:rente,summe:rente*12*n,erben:0,wohnen:'Wohnrecht, mietfrei'},
    {id:'teil',name:'Teilverkauf ('+Math.round(ta*100)+' %)',sofort:teilBetrag,monatlich:-entgelt,summe:teilBetrag-entgelt*12*n,
      erben:Math.max(0,(1-ta)*wertEnde-anteil(o.teilGebuehr)*wertEnde),wohnen:'Nießbrauch, Nutzungsentgelt'},
    {id:'rueck',name:'Verkaufen und zurückmieten',sofort:rueckErloes,monatlich:-rueckMiete,summe:rueckErloes-rueckMiete*12*n,erben:0,wohnen:'Mietvertrag',
      monatlichVerrentet:rueckRente-rueckMiete},
    {id:'behalten',name:'Behalten und vererben',sofort:0,monatlich:0,summe:0,erben:wertEnde,wohnen:'Eigentum'}
  ];
  return {n,fLeben,fGarantie,wohnrecht,wertEnde,auszahlung,rente,wege};
}

/* ========== Mieterhöhung ========== */
const iso=d=>d instanceof Date&&!isNaN(d)?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):'';
const datum=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
const monatsErster=(d,plus)=>new Date(d.getFullYear(),d.getMonth()+plus,1);
const monatsLetzter=(d,plus)=>new Date(d.getFullYear(),d.getMonth()+plus+1,0);
function plusMonate(d,m){ const r=new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); if(r.getDate()!==d.getDate()) r.setDate(0); return r; }
/* § 558 BGB: bis zur ortsüblichen Vergleichsmiete, Kappungsgrenze 20 % (15 % in Gebieten nach Landesverordnung) in drei
   Jahren ohne Erhöhungen nach §§ 559–560; Wirkung ab Beginn des dritten Kalendermonats nach Zugang (§ 558b Abs. 1),
   Zustimmungsfrist bis Ende des zweiten Kalendermonats (§ 558b Abs. 2); Miete seit 15 Monaten unverändert und
   Verlangen frühestens ein Jahr nach der letzten Erhöhung (§ 558 Abs. 1) */
function mieterhoehung558(o){
  const wfl=pos(o.wohnflaeche), alt=pos(o.miete), vor3=pos(o.mieteVor3)>0?pos(o.mieteVor3):alt, vgl=pos(o.vergleichM2)*wfl;
  const kappung=o.kappung15?0.15:0.2, kappGrenze=vor3*(1+kappung);
  const ziel=Math.min(vgl,kappGrenze), neu=Math.max(alt,ziel);
  const zugang=datum(o.zugang), letzte=datum(o.letzteErhoehung);
  const wirksam=zugang?monatsErster(zugang,3):null, zustimmungBis=zugang?monatsLetzter(zugang,2):null, klageBis=zugang?monatsLetzter(zugang,5):null;
  const sperre=letzte?plusMonate(letzte,12):null, unveraendertAb=letzte?plusMonate(letzte,15):null;
  const fristOk=!letzte||!zugang||(zugang>=sperre&&wirksam>=unveraendertAb);
  const begrenzt=vgl>kappGrenze+1e-9?'kappung':(vgl<=alt+1e-9?'vergleichsmiete':'');
  return {wohnflaeche:wfl,alt,vergleichsmiete:vgl,kappungProzent:kappung*100,kappGrenze,neu,erhoehung:neu-alt,prozent:alt>0?(neu-alt)/alt*100:0,
    neuM2:wfl>0?neu/wfl:0,altM2:wfl>0?alt/wfl:0,begrenzt,wirksam:iso(wirksam),zustimmungBis:iso(zustimmungBis),klageBis:iso(klageBis),
    fruehesterZugang:letzte?iso(sperre>monatsErster(unveraendertAb,-3)?sperre:monatsErster(unveraendertAb,-3)):'',fristOk};
}
/* § 559 BGB: 8 % der für die Wohnung aufgewendeten Kosten jährlich, ohne Erhaltungsanteil (Abs. 2) und Drittmittel
   (§ 559a); vereinfachtes Verfahren bis 10.000 € mit 30 % Erhaltungspauschale (§ 559c); Kappung in sechs Jahren
   3 €/m², bei Miete unter 7 €/m² 2 €/m² (§ 559 Abs. 3a); Wirkung ab Beginn des dritten Monats nach Zugang, sechs Monate
   später ohne ordnungsgemäße Ankündigung (§ 559b Abs. 2) */
function modernisierung559(o){
  const wfl=pos(o.wohnflaeche), alt=pos(o.miete), kosten=pos(o.kosten), vereinfacht=!!o.vereinfacht&&kosten<=10000;
  const erhaltung=vereinfacht?0.3*kosten:Math.min(pos(o.erhaltung),kosten), dritt=Math.min(pos(o.drittmittel),kosten-erhaltung);
  const umlage=Math.max(0,kosten-erhaltung-dritt), jahr=umlage*0.08, monat=jahr/12;
  const altM2=wfl>0?alt/wfl:0, grenzeM2=altM2>0&&altM2<7?2:3, schon=pos(o.bisherM2);
  const kappMonat=Math.max(0,(grenzeM2-schon)*wfl), erhoehung=wfl>0?Math.min(monat,kappMonat):monat;
  const zugang=datum(o.zugang), wirksam=zugang?monatsErster(zugang,3+(o.angekuendigt===false?6:0)):null;
  return {kosten,erhaltung,drittmittel:dritt,umlagefaehig:umlage,jahr,monatRoh:monat,grenzeM2,kappMonat,erhoehung,gekappt:erhoehung<monat-1e-9,
    neu:alt+erhoehung,neuM2:wfl>0?(alt+erhoehung)/wfl:0,vereinfacht,wirksam:iso(wirksam),zuVielFuerVereinfacht:!!o.vereinfacht&&kosten>10000};
}
/* § 556d BGB: Wiedervermietung in Gebieten mit Mietpreisbremse höchstens 10 % über der Vergleichsmiete; höhere Vormiete
   bleibt zulässig (§ 556e); nicht bei Neubau oder erster Vermietung nach umfassender Modernisierung (§ 556f) */
function mietpreisbremse(o){
  const wfl=pos(o.wohnflaeche), grenze=pos(o.vergleichM2)*wfl*1.1, vormiete=pos(o.vormiete);
  if(o.ausnahme) return {gilt:false,grenze:0,hoechst:0};
  return {gilt:true,grenze,hoechst:Math.max(grenze,vormiete),vormieteHoeher:vormiete>grenze};
}

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
/* GEG § 72: Heizkessel für flüssige oder gasförmige Brennstoffe, vor 1991 eingebaut oder älter als 30 Jahre, dürfen nicht
   mehr betrieben werden — ausgenommen Niedertemperatur- und Brennwertkessel (Abs. 3); ab 2045 keine fossilen Kessel (Abs. 4) */
function heizungPruefen(o,jahr){
  const art=o.heizArt||'', bj=zahl(o.heizBaujahr), kessel=o.kessel||'', j=jahr||new Date().getFullYear();
  const fossil=['gas','oel'].includes(art);
  if(!fossil) return {stufe:art?'ok':'',text:art?'Keine Austauschpflicht nach § 72 GEG für diese Heizungsart.':''};
  if(!(bj>0)) return {stufe:'warn',text:'Baujahr des Heizkessels erfragen — § 72 GEG verbietet alte Konstanttemperaturkessel.'};
  const alter=j-bj;
  if(kessel==='konstant'&&(bj<1991||alter>=30)) return {stufe:'rot',text:'Konstanttemperaturkessel von '+bj+': Betriebsverbot nach § 72 GEG — Austausch steht an (Kosten für die Gemeinschaft).'};
  if(kessel!=='konstant'&&kessel!=='nt'&&(bj<1991||alter>=30)) return {stufe:'warn',text:'Kessel von '+bj+': Ist es ein Niedertemperatur- oder Brennwertkessel? Sonst Betriebsverbot nach § 72 GEG.'};
  if(alter>=20) return {stufe:'warn',text:'Heizung von '+bj+' ('+alter+' Jahre): Erneuerung absehbar; eine neue Heizung muss nach § 71 GEG grundsätzlich 65 % erneuerbare Energie nutzen.'};
  return {stufe:'ok',text:'Heizung von '+bj+': derzeit keine Austauschpflicht; fossile Kessel nur bis Ende 2044 (§ 72 Abs. 4 GEG).'};
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

const ImmoBeratung={ERB_VERHAELTNIS,ERB_SAETZE,erbstSteuer,klasseFuer,freibetragFuer,vervielfaeltigerBewG,kapitalwertNutzung,familienheimFrei,erwerbSteuer,uebertragung,restLeben,
  ueberleben,rentenfaktor,lebenserwartung,verrentung,mieterhoehung558,modernisierung559,mietpreisbremse,residualwert,residualSpanne,
  petersRuecklage,heizungPruefen,etwCheck,ETW_UNTERLAGEN,JAHR_PHASEN,JAHR_WAHRSCHEINLICHKEIT,pipeline,iso,plusMonate};
wurzel.ImmoBeratung=ImmoBeratung;
if(typeof module==='object'&&module.exports) module.exports=ImmoBeratung;
})(typeof globalThis!=='undefined'?globalThis:this);
