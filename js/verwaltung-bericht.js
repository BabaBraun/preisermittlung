/* ImmoApp — Liegenschaftsverwaltung: Eigentümerbericht und Zusammenstellung für die Anlage V (ohne DOM, testbar)
   Einnahmen nach dem Zuflussprinzip (§ 11 Abs. 1 EStG): Zahlungen zählen im Jahr des Eingangs. Regelmäßig
   wiederkehrende Einnahmen, die kurze Zeit (zehn Tage) vor Beginn oder nach Ende des Kalenderjahres zufließen und
   in diesem Zeitraum auch fällig sind, gehören zum Jahr der wirtschaftlichen Zugehörigkeit (§ 11 Abs. 1 Satz 2
   EStG; Fälligkeit innerhalb des Zeitraums: BFH, Urteil vom 27.06.2018, X R 44/16). Die Zuordnung einer Zahlung
   zu einer Monatsmiete folgt der Kontoführung (§ 366 BGB). Aufteilung der Zahlungen in Miete, Umlagen und
   Umsatzsteuer im Verhältnis der Sollstellung des Jahres (vereinfachend). Kautionen sind keine Einnahmen. Für das laufende
   Jahr (opt.stichtag) zählen Soll, Zahlungen, Kosten und Leerstand nur bis zum Stichtag.
   Ausgaben nach dem Datum in den Kosten (Rechnungs- bzw. Zahlungsdatum; Abflussprinzip § 11 Abs. 2 EStG).
   AfA, Schuldzinsen und andere Kosten des Eigentümers erfasst die Verwaltung nicht — sie ergänzt der
   Eigentümer bzw. die Steuerberatung. Arbeitshilfe, keine Steuerberatung. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const N=wurzel.ImmoNebenkosten||(typeof require==='function'?require('./verwaltung-nk.js'):null);
const {r2,datumGueltig,tagNr,sollstellung,kontoFuehren,mieteAm,istWohnraum,datumDE}=V;

function imFenster(md){ return md>='12-22'||md<='01-10'; }   // zehn Tage vor bzw. nach dem Jahreswechsel
/* Steuerjahr eines auf einen Posten angerechneten Zahlungsteils */
function steuerjahr(datum,posten){
  const y=+datum.slice(0,4);
  if(!posten||!(posten.art==='miete'||posten.art==='hausgeld')) return y;
  const fy=+posten.faellig.slice(0,4);
  if(Math.abs(fy-y)===1&&imFenster(datum.slice(5))&&imFenster(posten.faellig.slice(5))&&Math.abs(tagNr(datum)-tagNr(posten.faellig))<=20) return fy;
  return y;
}
function teileSumme(){ return {kalt:0,umlagen:0,ust:0,sonstige:0}; }
function addiere(a,b,f){ Object.keys(a).forEach(k=>a[k]+=(b[k]||0)*(f==null?1:f)); return a; }
function runde(o){ Object.keys(o).forEach(k=>o[k]=r2(o[k])); return o; }

/* Einnahmen eines Vertrags im Jahr: Soll (Sollstellung) und Ist (Zufluss) */
function vertragJahr(l,v,J,stichtag){
  const von=J+'-01-01', bis=stichtag&&stichtag<J+'-12-31'?stichtag:J+'-12-31', grenze=bis<J+'-12-31'?bis:(J+1)+'-01-10';
  const posten=sollstellung(v,(J+1)+'-01-31');
  const zahl=(l.zahlungen||[]).filter(z=>z.vertragId===v.id&&z.art!=='kaution'&&datumGueltig(z.datum)&&isFinite(z.betrag)&&z.datum<=grenze);
  const k=kontoFuehren(posten,zahl,grenze,{});
  const soll=teileSumme();
  posten.forEach(p=>{
    if(p.faellig>bis) return;   // laufendes Jahr: nur bis zum Stichtag
    if(p.art==='miete'&&p.monat.slice(0,4)===String(J)){ soll.kalt+=p.teile.kalt+p.teile.zuschlag; soll.umlagen+=p.teile.nk+p.teile.hk; soll.ust+=p.ust; }
    else if(p.art!=='miete'&&p.faellig>=von&&p.faellig<=bis){ if(p.art==='nk_nachzahlung') soll.umlagen+=p.betrag; else soll.sonstige+=p.betrag; }
  });
  runde(soll);
  const zMap=new Map(zahl.map(z=>[z.id,z])), angerechnet=new Map(), verschoben=[];
  let ist=0;
  k.posten.forEach(p=>p.zuordnungen.forEach(a=>{
    const z=zMap.get(a.id); if(!z||z.betrag<=0) return;   // Gutschriften sind keine Zahlungen
    angerechnet.set(a.id,(angerechnet.get(a.id)||0)+a.betrag);
    const y=steuerjahr(a.datum,p);
    if(y===J) ist+=a.betrag;
    if(y!==+a.datum.slice(0,4)&&(y===J||+a.datum.slice(0,4)===J)) verschoben.push({datum:a.datum,betrag:r2(a.betrag),monat:p.monat,jahr:y,vertragId:v.id});
  }));
  zahl.forEach(z=>{
    if(z.datum.slice(0,4)!==String(J)) return;
    if(z.betrag>0){ const rest=r2(z.betrag-(angerechnet.get(z.id)||0)); if(rest>0) ist+=rest; }   // Überzahlung: Zufluss im Eingangsjahr
    else ist+=z.betrag;   // Rücklastschrift mindert den Zufluss
  });
  ist=r2(ist);
  /* Aufteilung im Verhältnis der Sollstellung (ohne Sollstellung: Miete zum Jahresende bzw. Vertragsende) */
  let basis=Object.assign({},soll);
  if(!(basis.kalt+basis.umlagen+basis.ust+basis.sonstige>0)){ const m=mieteAm(v,v.ende&&v.ende<bis?v.ende:bis); basis={kalt:m.kalt+m.zuschlag,umlagen:m.nk+m.hk,ust:m.gesamt-m.netto,sonstige:0}; }
  const bs=basis.kalt+basis.umlagen+basis.ust+basis.sonstige, istTeile=teileSumme();
  if(bs>0){ Object.keys(istTeile).forEach(t=>istTeile[t]=ist*basis[t]/bs); runde(istTeile); const diff=r2(ist-istTeile.kalt-istTeile.umlagen-istTeile.ust-istTeile.sonstige); istTeile.kalt=r2(istTeile.kalt+diff); }
  else istTeile.kalt=ist;
  const rueck=kontoFuehren(sollstellung(v,bis),(l.zahlungen||[]).filter(z=>z.vertragId===v.id&&z.art!=='kaution'&&datumGueltig(z.datum)&&z.datum<=bis),bis,{}).summe.rueckstand;
  return {vertragId:v.id,einheitId:v.einheitId,wohnraum:istWohnraum(v,l),soll,sollGesamt:r2(soll.kalt+soll.umlagen+soll.ust+soll.sonstige),ist,istTeile,rueckstandEnde:rueck,verschoben};
}

const GRUPPEN=[['umlagefaehig','Laufende Betriebskosten (Grundsteuer, Wasser, Müll, Heizung, Versicherungen u. a.)'],
  ['erhaltung','Erhaltungsaufwendungen (Instandhaltung, Reparaturen)'],['verwaltung','Verwaltungskosten'],['sonstige','Sonstige Werbungskosten']];
function kostenGruppe(k){
  if(k.kategorie==='instandhaltung') return 'erhaltung';
  if(k.kategorie==='verwaltung') return 'verwaltung';
  if(k.kategorie==='nicht_umlagefaehig') return 'sonstige';
  return 'umlagefaehig';
}
function jahresbericht(l,jahr,opt){
  opt=opt||{};
  const J=+jahr, von=J+'-01-01', bis=datumGueltig(opt.stichtag)&&opt.stichtag<J+'-12-31'?opt.stichtag:J+'-12-31';
  const vertraege=(l.vertraege||[]).filter(v=>datumGueltig(v.beginn)&&v.beginn<=bis).map(v=>vertragJahr(l,v,J,bis))
    .filter(x=>x.sollGesamt||x.ist||x.rueckstandEnde);
  const einnahmen={wohnen:teileSumme(),gewerbe:teileSumme()};
  const soll={wohnen:teileSumme(),gewerbe:teileSumme()};
  vertraege.forEach(x=>{ addiere(einnahmen[x.wohnraum?'wohnen':'gewerbe'],x.istTeile); addiere(soll[x.wohnraum?'wohnen':'gewerbe'],x.soll); });
  runde(einnahmen.wohnen); runde(einnahmen.gewerbe); runde(soll.wohnen); runde(soll.gewerbe);
  const summeEin=r2(vertraege.reduce((s,x)=>s+x.ist,0)), summeSoll=r2(vertraege.reduce((s,x)=>s+x.sollGesamt,0));
  /* Ausgaben */
  const posten=(l.kosten||[]).filter(k=>!k.ausRuecklage).map(k=>{ const d=datumGueltig(k.datum)?k.datum:(datumGueltig(k.von)?k.von:null); return {k,d}; })
    .filter(x=>x.d&&x.d>=von&&x.d<=bis).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const gruppen=GRUPPEN.map(([key,name])=>{ const p=posten.filter(x=>kostenGruppe(x.k)===key);
    return {key,name,betrag:r2(p.reduce((s,x)=>s+(+x.k.betrag||0),0)),posten:p.map(x=>({datum:x.d,kategorie:x.k.kategorie,name:(N&&N.KAT[x.k.kategorie]||{}).name||x.k.kategorie,text:x.k.text||'',beleg:x.k.beleg||'',betrag:r2(+x.k.betrag||0),lohn35a:x.k.lohn35a||0}))}; });
  const summeAus=r2(gruppen.reduce((s,g)=>s+g.betrag,0)), lohn35a=r2(posten.reduce((s,x)=>s+(+x.k.lohn35a||0),0));
  /* weitere Angaben */
  const ls=V.leerstand(l,von,bis), leer={tage:ls.reduce((s,x)=>s+x.leerTage,0),entgangen:r2(ls.reduce((s,x)=>s+x.entgangen,0)),einheiten:ls.filter(x=>x.leerTage>0)};
  const aenderungen=[];
  (l.vertraege||[]).forEach(v=>(v.aenderungen||[]).forEach(a=>{ if(a.ab>=von&&a.ab<=bis&&typeof a.kalt==='number') aenderungen.push({ab:a.ab,vertragId:v.id,einheitId:v.einheitId,grund:a.grund,kalt:a.kalt,vorher:mieteAm(v,V.isoTag(tagNr(a.ab)-1)).kalt}); }));
  aenderungen.sort((a,b)=>a.ab<b.ab?-1:1);
  const vorgaenge=(l.vorgaenge||[]).filter(v=>[v.gemeldetAm,v.erledigtAm,v.rechnungAm].some(d=>d&&d>=von&&d<=bis));
  const kautionen=r2((l.vertraege||[]).filter(v=>V.vertragAktiv(v,bis)).reduce((s,v)=>s+V.kaution(v,l.zahlungen,bis).ist,0));
  const verschoben=[].concat(...vertraege.map(x=>x.verschoben));
  return {jahr:J,von,bis,vorlaeufig:bis<J+'-12-31',vertraege,einnahmen,soll,summeEin,summeSoll,gruppen,summeAus,lohn35a,ueberschuss:r2(summeEin-summeAus),
    rueckstandEnde:r2(vertraege.reduce((s,x)=>s+x.rueckstandEnde,0)),leer,aenderungen,vorgaenge,kautionen,verschoben};
}
/* Zeilen der Zusammenstellung für die Anlage V (Bezeichnungen wie im Formular, ohne Zeilennummern — die ändern sich jährlich) */
function anlageV(b){
  const e=b.einnahmen, z=[];
  z.push({abschnitt:'Einnahmen',text:'Mieteinnahmen für Wohnungen (ohne Umlagen)',betrag:e.wohnen.kalt});
  z.push({abschnitt:'Einnahmen',text:'Mieteinnahmen für andere Räume (ohne Umlagen, ohne Umsatzsteuer)',betrag:e.gewerbe.kalt});
  z.push({abschnitt:'Einnahmen',text:'Umlagen (Nebenkosten-Vorauszahlungen und -Nachzahlungen), Wohnungen',betrag:e.wohnen.umlagen});
  z.push({abschnitt:'Einnahmen',text:'Umlagen, andere Räume',betrag:e.gewerbe.umlagen});
  z.push({abschnitt:'Einnahmen',text:'Vereinnahmte Umsatzsteuer',betrag:r2(e.wohnen.ust+e.gewerbe.ust)});
  z.push({abschnitt:'Einnahmen',text:'Sonstige Einnahmen (z. B. Schadensersatz)',betrag:r2(e.wohnen.sonstige+e.gewerbe.sonstige)});
  b.gruppen.forEach(g=>z.push({abschnitt:'Werbungskosten',text:g.name,betrag:g.betrag}));
  ['Absetzung für Abnutzung (AfA)','Schuldzinsen und Geldbeschaffungskosten','Fahrtkosten, Kontoführung, Steuerberatung'].forEach(t=>z.push({abschnitt:'Vom Eigentümer zu ergänzen',text:t,betrag:null}));
  return z.filter(x=>x.betrag==null||x.betrag!==0||x.abschnitt!=='Einnahmen'||/Wohnungen \(ohne/.test(x.text));
}

const ImmoBericht={steuerjahr,vertragJahr,jahresbericht,anlageV,GRUPPEN,kostenGruppe};
wurzel.ImmoBericht=ImmoBericht;
if(typeof module==='object'&&module.exports) module.exports=ImmoBericht;
})(typeof globalThis!=='undefined'?globalThis:this);
