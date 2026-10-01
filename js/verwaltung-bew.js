/* ImmoApp — Liegenschaftsverwaltung: Bewertungen je Liegenschaft (ohne DOM, in Node testbar)
   Verlauf der Preiseinschätzungen und Gutachten (z. B. jährlich zum 31.12. für Objekte der Bank), wahlweise mit
   verknüpfter Bewertung aus der Preisermittlung. Fortschreibung: eine verknüpfte Bewertung wird auf einen neuen
   Stichtag übertragen — Stichtag, Baupreisindex (amtlicher Wert BW), Restnutzungsdauer und PV-Laufzeit werden
   angepasst; Bodenrichtwert, Mieten und Zinssätze bleiben stehen und sind zu prüfen. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const BPI=wurzel.ImmoBaupreisindex||(typeof require==='function'?require('./baupreisindex.js'):null);
const {datumGueltig,tagNr,isoTag,plusMonate,datumDE,r2}=V;

const ARTEN=[['preiseinschaetzung','Rechnerische Preiseinschätzung'],['gutachten','Verkehrswertgutachten'],['beleihung','Beleihungswertermittlung'],['sonstig','Sonstige Bewertung']];
const ART=Object.fromEntries(ARTEN);
const STATUS=[['final','abgeschlossen'],['entwurf','Entwurf']];

function bereinigen(roh,l,zaehler,h){
  const {text,zahl,liste,ID}=h;
  l.bewertungen=liste(roh.bewertungen,b=>datumGueltig(b.stichtag)?{id:b.id,stichtag:b.stichtag,art:ART[b.art]?b.art:'preiseinschaetzung',
    status:b.status==='entwurf'?'entwurf':'final',boden:zahl(b.boden),substanz:zahl(b.substanz),ertrag:zahl(b.ertrag),ergebnis:zahl(b.ergebnis),
    bpi:zahl(b.bpi),bpiText:text(b.bpiText,120),projektId:typeof b.projektId==='string'&&ID.test(b.projektId)?b.projektId:null,
    quelle:text(b.quelle,300),notiz:text(b.notiz,3000)}:null);
}
/* Verlauf aufsteigend nach Stichtag; Veränderung jeweils gegenüber der vorigen abgeschlossenen Bewertung */
function verlauf(l){
  const a=(l.bewertungen||[]).slice().sort((x,y)=>x.stichtag<y.stichtag?-1:x.stichtag>y.stichtag?1:(x.status==='entwurf')-(y.status==='entwurf'));
  let vor=null;
  return a.map(b=>{
    const o=Object.assign({},b,{diff:null,diffPct:null,vorStichtag:null});
    if(vor&&vor.ergebnis>0&&b.ergebnis>0){ o.diff=r2(b.ergebnis-vor.ergebnis); o.diffPct=r2((b.ergebnis/vor.ergebnis-1)*100); o.vorStichtag=vor.stichtag; }
    if(b.status==='final'&&b.ergebnis>0) vor=b;
    return o;
  });
}
function aktuell(l){
  const v=verlauf(l).filter(b=>b.ergebnis>0);
  return v.filter(b=>b.status==='final').pop()||v.pop()||null;
}
/* Jährliche Bewertung (Objekte der Bank und eigene Objekte): nächster Stichtag ein Jahr nach der letzten
   abgeschlossenen Bewertung; Erinnerung, sobald dieser Stichtag erreicht ist bzw. im Vorlauf */
function naechsterStichtag(l){
  const f=(l.bewertungen||[]).filter(b=>b.status==='final').map(b=>b.stichtag).sort().pop();
  return f?plusMonate(f,12):null;
}
function fristen(l,stichtag,horizont){
  horizont=horizont||60;
  if(!['bank','eigen'].includes(l.eigentuemerArt)) return [];
  const n=naechsterStichtag(l); if(!n) return [];
  if(n>isoTag(tagNr(stichtag)+horizont)) return [];
  const entwurf=(l.bewertungen||[]).find(b=>b.status==='entwurf'&&b.stichtag>=n);
  return [{datum:n,art:'bewertung',titel:'Bewertung zum Stichtag '+datumDE(n)+(entwurf?' (Entwurf liegt vor)':''),
    text:'jährliche Preiseinschätzung',liegenschaftId:l.id,liegenschaft:l.name||'',faellig:n<=stichtag}];
}

/* ---------- Fortschreibung einer Bewertung (Felder der Preisermittlung) ---------- */
function zahl(s){
  if(typeof s==='number') return isFinite(s)?s:0;
  let t=String(s==null?'':s).trim().replace(/\s|€|%/g,'');
  if(!t) return 0;
  if(t.includes(',')) t=t.replace(/\./g,'').replace(',','.');
  else if((t.match(/\./g)||[]).length>1) t=t.replace(/\./g,'');
  const x=parseFloat(t); return isFinite(x)?x:0;
}
function zahlText(x,st){ return (Math.round(x*Math.pow(10,st))/Math.pow(10,st)).toString().replace('.',','); }
/* felder: gespeicherte Felder der Bewertung; opt: {stichtag, art (Gebäudeart Baupreisindex), rndFortschreiben} */
function fortschreiben(felder,opt){
  const f=Object.assign({},felder), hinweise=[];
  const alt=datumGueltig(f.ek_stichtag)?f.ek_stichtag:null, neu=opt.stichtag;
  if(!datumGueltig(neu)) throw new Error('Kein gültiger Stichtag');
  const jahre=alt?(+neu.slice(0,4))-(+alt.slice(0,4)):0, tage=alt?tagNr(neu)-tagNr(alt):0;
  f.ek_stichtag=neu; f.ek_besichtigung='';
  const art=opt.art||BPI.artAusFaktor(zahl(f.bpi_faktor))||BPI.artAusTyp(f.ek_typ);
  const w=BPI.wertFuer(art,neu);
  if(w){ f.bpi=zahlText(w.wert,1); f.bpi_faktor=zahlText(w.faktor,4); f.pq_bpi_quelle=BPI.quelleText(w); f.bpi_art=art;
    hinweise.push('Baupreisindex '+w.name+' '+BPI.monatText(w.monat)+': '+zahlText(w.wert,1)+(w.vorlaeufig?' (vorläufig — den Wert für das Quartal des Stichtags nachtragen, sobald veröffentlicht)':'')); }
  if(opt.rndFortschreiben!==false&&jahre>0){
    ['nhkhg_rnd','nhkan_rnd'].forEach(id=>{ const r=zahl(f[id]); if(r>0){ f[id]=String(Math.max(1,r-jahre)); hinweise.push((id==='nhkhg_rnd'?'Restnutzungsdauer Hauptgebäude':'Restnutzungsdauer Anbau')+': '+r+' → '+f[id]+' Jahre (fortgeschrieben, bei Modernisierung anpassen)'); } });
  }
  if(f.pv_aktiv===true&&zahl(f.pv_rnd)>0&&tage>0){ const r=Math.max(0,zahl(f.pv_rnd)-tage/365); f.pv_rnd=zahlText(r,2); hinweise.push('PV-Anlage: Restlaufzeit '+zahlText(r,2)+' Jahre'); }
  hinweise.push('Bodenrichtwert prüfen (BORIS-BW, aktueller Richtwertstichtag)','Mieten und Leerstand auf den neuen Stichtag prüfen','Liegenschaftszins und Bewirtschaftungskosten prüfen');
  return {felder:f,hinweise,jahre,bpi:w};
}
/* Vorschlag für den nächsten Stichtag: ein Jahr nach dem bisherigen, sonst der 31.12. des laufenden Jahres */
function stichtagVorschlag(alt,heute){
  if(datumGueltig(alt)) return plusMonate(alt,12);
  return String(heute||'').slice(0,4)+'-12-31';
}

V.erweiterungRegistrieren(bereinigen);
const ImmoLvBewertung={ARTEN,ART,STATUS,bereinigen,verlauf,aktuell,naechsterStichtag,fristen,fortschreiben,stichtagVorschlag,zahl};
wurzel.ImmoLvBewertung=ImmoLvBewertung;
if(typeof module==='object'&&module.exports) module.exports=ImmoLvBewertung;
})(typeof globalThis!=='undefined'?globalThis:this);
