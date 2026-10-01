/* ImmoApp — Liegenschaften: Kern (ohne DOM, in Node testbar)
   Liegenschaften (z. B. der Bank) mit ihren Preiseinschätzungen je Stichtag nach dem Vordruck (js/jahresbewertung.js).
   Datenmodell (ein Dokument je Liegenschaft, Speicher „liegenschaften“ der Datenbank „ia_verwaltung“ — Name aus der
   früheren Liegenschaftsverwaltung, damit vorhandene Daten erhalten bleiben):
     {id, name, strasse, plz, ort, art, notiz, angelegt, geaendert,
      bewertungen:[{id, stichtag, art, status, boden, substanz, ertrag, ergebnis, bpi, bpiText, quelle, notiz, vordruck}]}
   Weitere Angaben früherer Fassungen (Einheiten, Verträge …) bleiben beim Bereinigen unverändert im Dokument stehen
   — sie werden nicht mehr angezeigt, gehen aber auch nicht verloren. */
(function(wurzel){
'use strict';
const JB=wurzel.ImmoJahresbewertung||(typeof require==='function'?require('./jahresbewertung.js'):null);

/* ---------- Hilfen ---------- */
const ID=/^[\w-]{1,80}$/;
function istObj(x){ return !!x&&typeof x==='object'&&!Array.isArray(x); }
function r2(x){ if(!isFinite(x)) return 0; const s=x<0?-1:1; return s*Math.round(Math.abs(x)*100+1e-7)/100||0; }
function neueId(p){ return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
/* Eingabe im deutschen Format: „1.234,56“, „450.000“, „12,5“, „-80“, „−80“; Einheiten (€, %, m²) werden überlesen.
   Ungültiges ergibt NaN (nie stillschweigend 0) — so kann die Oberfläche das Feld markieren. Leer ergibt null. */
function zahlEingabe(s){
  if(typeof s==='number') return isFinite(s)?s:NaN;
  let t=(''+(s==null?'':s)).replace(/[−‒–]/g,'-').replace(/\s|€|%|m²|qm/g,'');
  if(t==='') return null;
  if(!/^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(t)&&!/^-?\d+\.\d+$/.test(t)&&!/^-?,\d+$/.test(t)) return NaN;
  if(t.indexOf(',')>-1) t=t.replace(/\./g,'').replace(',','.');
  else if((t.match(/\./g)||[]).length>1||/^-?[1-9]\d{0,2}\.\d{3}$/.test(t)) t=t.replace(/\./g,'');
  const v=parseFloat(t); return isFinite(v)?v:NaN;
}
function datumGueltig(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [j,m,t]=s.split('-').map(Number), d=new Date(Date.UTC(j,m-1,t));
  return d.getUTCFullYear()===j&&d.getUTCMonth()===m-1&&d.getUTCDate()===t&&j>1800&&j<2200;
}
function datumDE(iso){ return datumGueltig(iso)?iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4):''; }
function plusJahre(iso,n){ const j=+iso.slice(0,4)+n, md=iso.slice(5); return md==='02-29'&&!datumGueltig(j+'-02-29')?j+'-02-28':j+'-'+md; }
function text(v,max){ return typeof v==='string'?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max||200):typeof v==='number'&&isFinite(v)?String(v):''; }
function zahl(v){ return typeof v==='number'&&isFinite(v)?v:null; }

/* ---------- Bewertungen ---------- */
const ARTEN=[['preiseinschaetzung','Rechnerische Preiseinschätzung'],['gutachten','Verkehrswertgutachten'],['beleihung','Beleihungswertermittlung'],['sonstig','Sonstige Bewertung']];
const ART=Object.fromEntries(ARTEN);
const STATUS=[['final','abgeschlossen'],['entwurf','Entwurf']];
function bewertungBereinigen(b){
  if(!istObj(b)||!datumGueltig(b.stichtag)) return null;
  return {id:typeof b.id==='string'&&ID.test(b.id)?b.id:neueId('BW'),stichtag:b.stichtag,art:ART[b.art]?b.art:'preiseinschaetzung',
    status:b.status==='entwurf'?'entwurf':'final',boden:zahl(b.boden),substanz:zahl(b.substanz),ertrag:zahl(b.ertrag),ergebnis:zahl(b.ergebnis),
    bpi:zahl(b.bpi),bpiText:text(b.bpiText,120),quelle:text(b.quelle,300),notiz:text(b.notiz,3000),vordruck:b.vordruck&&JB?JB.bereinigen(b.vordruck):null};
}
/* Ergebnisse eines Vordrucks in die Felder der Bewertung übernehmen */
function ausVordruck(b){
  if(!b||!b.vordruck||!JB) return b;
  const r=JB.rechnen(b.vordruck), g=b.vordruck.gebaeude[0], rr=x=>x==null?null:r2(x);
  return Object.assign(b,{stichtag:b.vordruck.stichtag||b.stichtag,boden:rr(r.boden),substanz:rr(r.substanz),ertrag:rr(r.ertrag),ergebnis:rr(r.ergebnis),
    bpi:g&&g.bpi||null,bpiText:g?g.bpiText||'':''});
}
/* Verlauf aufsteigend nach Stichtag; Veränderung jeweils gegenüber der vorigen abgeschlossenen Bewertung */
function verlauf(l){
  const a=((l&&l.bewertungen)||[]).slice().sort((x,y)=>x.stichtag<y.stichtag?-1:x.stichtag>y.stichtag?1:(x.status==='entwurf')-(y.status==='entwurf'));
  let vor=null;
  return a.map(b=>{
    const o=Object.assign({},b,{diff:null,diffPct:null,vorStichtag:null});
    if(vor&&vor.ergebnis>0&&b.ergebnis>0){ o.diff=r2(b.ergebnis-vor.ergebnis); o.diffPct=r2((b.ergebnis/vor.ergebnis-1)*100); o.vorStichtag=vor.stichtag; }
    if(b.status==='final'&&b.ergebnis>0) vor=b;
    return o;
  });
}
function aktuell(l){ const v=verlauf(l).filter(b=>b.ergebnis>0); return v.filter(b=>b.status==='final').pop()||v.pop()||null; }
/* Vorschlag für den nächsten Stichtag: ein Jahr nach dem bisherigen, sonst der 31.12. des laufenden Jahres */
function stichtagVorschlag(alt,heute){ return datumGueltig(alt)?plusJahre(alt,1):String(heute||'').slice(0,4)+'-12-31'; }

/* ---------- Liegenschaft ---------- */
const ARTEN_L=[['gewerbe','Bank- / Geschäftsgebäude'],['gemischt','Wohn- und Geschäftshaus'],['wohnen','Wohngebäude'],['sonstig','Grundstück / Sonstiges']];
function bereinigen(roh){
  if(!istObj(roh)||typeof roh.id!=='string'||!ID.test(roh.id)) return null;
  const l=JSON.parse(JSON.stringify(roh));   // frühere Angaben (z. B. Einheiten) bleiben unverändert stehen
  Object.assign(l,{name:text(roh.name,200)||'Liegenschaft',strasse:text(roh.strasse,200),plz:text(roh.plz,10),ort:text(roh.ort,100),
    art:ARTEN_L.some(a=>a[0]===roh.art)?roh.art:roh.art==='mfh'||roh.art==='wohnhaus'||roh.art==='etw'||roh.art==='weg'?'wohnen':'sonstig',
    notiz:text(roh.notiz,3000),angelegt:zahl(roh.angelegt),geaendert:zahl(roh.geaendert),
    bewertungen:(Array.isArray(roh.bewertungen)?roh.bewertungen:[]).slice(0,200).map(bewertungBereinigen).filter(Boolean)});
  return l;
}
function ansprechpartnerBereinigen(o){ o=istObj(o)?o:{}; return {name:text(o.name),anschrift:text(o.anschrift,300),telefon:text(o.telefon,60),email:text(o.email,120),ort:text(o.ort,80)}; }

/* ---------- Sicherungsdatei: {typ:'immoapp-liegenschaften', version, liegenschaften, ansprechpartner?, anhaenge?}
   Sicherungen der früheren Liegenschaftsverwaltung (typ 'immoapp-verwaltung') werden ebenso gelesen. */
function sicherungPruefen(o){
  if(!istObj(o)||!['immoapp-liegenschaften','immoapp-verwaltung'].includes(o.typ)||!Array.isArray(o.liegenschaften)){
    if(istObj(o)&&o.typ==='immoapp-projekte') return {ok:false,fehler:'Das ist eine Projektsicherung. Sie wird in der Projekte-Übersicht über „Sicherung einspielen“ geladen.'};
    if(istObj(o)&&o.typ==='vb-marktdaten') return {ok:false,fehler:'Das ist eine Sicherung des Marktüberblicks. Sie wird im Marktüberblick unter „Datensicherung“ eingelesen.'};
    return {ok:false,fehler:'Die Datei ist keine Sicherung der Liegenschaften.'};
  }
  let verworfen=0; const liegenschaften=[];
  o.liegenschaften.forEach(x=>{ const l=bereinigen(x); if(l) liegenschaften.push(l); else verworfen++; });
  const anhaenge=[];
  (Array.isArray(o.anhaenge)?o.anhaenge:[]).forEach(a=>{
    if(istObj(a)&&ID.test(a.id)&&typeof a.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(a.data)&&a.data.length%4===0)
      anhaenge.push({id:a.id,liegenschaftId:typeof a.liegenschaftId==='string'&&ID.test(a.liegenschaftId)?a.liegenschaftId:'',name:text(a.name,200)||'anhang',
        typ:text(a.typ,80),size:+a.size||0,datum:datumGueltig(a.datum)?a.datum:null,data:a.data});
    else verworfen++;
  });
  if(!liegenschaften.length) return {ok:false,fehler:o.liegenschaften.length?'Keine der '+o.liegenschaften.length+' Liegenschaften ist lesbar — die Datei ist beschädigt.':'In der Sicherung stehen keine Liegenschaften.'};
  const ap=istObj(o.ansprechpartner)?o.ansprechpartner:istObj(o.einstellungen)?o.einstellungen:null;
  return {ok:true,version:o.version||1,liegenschaften,anhaenge,ansprechpartner:ap?ansprechpartnerBereinigen(ap):null,verworfen};
}

const ImmoLiegenschaften={ID,r2,neueId,zahlEingabe,datumGueltig,datumDE,plusJahre,text,ARTEN,ART,STATUS,ARTEN_L,bewertungBereinigen,ausVordruck,verlauf,aktuell,
  stichtagVorschlag,bereinigen,ansprechpartnerBereinigen,sicherungPruefen};
wurzel.ImmoLiegenschaften=ImmoLiegenschaften;
if(typeof module==='object'&&module.exports) module.exports=ImmoLiegenschaften;
})(typeof globalThis!=='undefined'?globalThis:this);
