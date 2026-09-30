/* ImmoApp — Liegenschaftsverwaltung: Rechenkern Mietverwaltung (ohne DOM, in Node testbar)
   Grundlagen und Quellen stehen jeweils an der Funktion. Alle Beträge in Euro, auf Cent gerundet; Datumswerte
   als ISO-Text „JJJJ-MM-TT“, Monate als „JJJJ-MM“. Die Ergebnisse sind Arbeitshilfen für die Verwaltung und
   keine Rechtsberatung — Hinweise auf Kündigungsvoraussetzungen o. Ä. sind ausdrücklich als „prüfen“ formuliert.

   Datenmodell (ein Dokument je Liegenschaft, Speicher „liegenschaften“ der Datenbank „ia_verwaltung“):
     {id, name, strasse, plz, ort, art, eigentuemerArt, kundeId, eigentuemerName, baujahr, notiz,
      einstellungen:{kappung15, basiszins:[[ab, satz], …]},
      einheiten:[{id, nr, lage, art, flaeche, zimmer, mea, sollmiete, notiz}],
      vertraege:[{id, einheitId, mieter:[{name, telefon, email}], personen, beginn, ende, mietart,
                  miete:{kalt, nk, hk, zuschlag, ust}, aenderungen:[{id, ab, kalt?, nk?, hk?, zuschlag?, grund, notiz}],
                  index:{basisMonat, basisWert}, kaution:{soll, art, raten}, sonderposten:[{id, datum, betrag, text, art}],
                  notiz}],
      zahlungen:[{id, datum, betrag, vertragId, art, monat, text}],
      mahnungen:[{id, vertragId, datum, stufe, betrag}],
      angelegt, geaendert} */
(function(wurzel){
'use strict';

/* ---------- Hilfen ---------- */
const ID=/^[\w-]{1,80}$/;
function istObj(x){ return !!x&&typeof x==='object'&&!Array.isArray(x); }
function r2(x){ if(!isFinite(x)) return 0; const s=x<0?-1:1; return s*Math.round(Math.abs(x)*100+1e-7)/100||0; }
function neueId(p){ return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function summe(a,f){ return a.reduce((s,x)=>s+(f?f(x):x),0); }

/* Eingabe im deutschen Format: „1.234,56“, „450.000“ (Betrag), „12,5“, „-80“, „−80“. Ungültiges ergibt NaN
   (nie stillschweigend 0) — so kann die Oberfläche das Feld markieren. Leer ergibt null. */
function zahlEingabe(s){
  if(typeof s==='number') return isFinite(s)?s:NaN;
  let t=(''+(s==null?'':s)).replace(/[−‒–]/g,'-').replace(/\s|€|%|m²|qm/g,'');
  if(t==='') return null;
  if(!/^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(t)&&!/^-?\d+\.\d+$/.test(t)&&!/^-?,\d+$/.test(t)) return NaN;
  if(t.indexOf(',')>-1) t=t.replace(/\./g,'').replace(',','.');
  else if((t.match(/\./g)||[]).length>1||/^-?[1-9]\d{0,2}\.\d{3}$/.test(t)) t=t.replace(/\./g,'');
  const v=parseFloat(t); return isFinite(v)?v:NaN;
}
function eur(x){ return (r2(x)).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }

/* ---------- Datum (Tagesnummern in UTC, keine Zeitzonenfehler) ---------- */
const TAG=864e5;
function datumGueltig(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [j,m,t]=s.split('-').map(Number), d=new Date(Date.UTC(j,m-1,t));
  return d.getUTCFullYear()===j&&d.getUTCMonth()===m-1&&d.getUTCDate()===t&&j>1800&&j<2200;
}
function tagNr(s){ const [j,m,t]=s.split('-').map(Number); return Date.UTC(j,m-1,t)/TAG; }
function isoTag(n){ return new Date(n*TAG).toISOString().slice(0,10); }
function monatVon(iso){ return iso.slice(0,7); }
function tageImMonat(ym){ const [j,m]=ym.split('-').map(Number); return new Date(Date.UTC(j,m,0)).getUTCDate(); }
function monatsErster(ym){ return ym+'-01'; }
function monatsLetzter(ym){ return ym+'-'+String(tageImMonat(ym)).padStart(2,'0'); }
function plusMonate(iso,n){   // Monatsende wird gekappt: 31.01. + 1 Monat = 28./29.02.
  const [j,m,t]=iso.split('-').map(Number), z=new Date(Date.UTC(j,m-1+n,1)), ym=z.toISOString().slice(0,7);
  return ym+'-'+String(Math.min(t,tageImMonat(ym))).padStart(2,'0');
}
function naechsterMonat(ym){ return plusMonate(ym+'-01',1).slice(0,7); }
function monatsliste(von,bis){ const a=[]; for(let m=von;m<=bis&&a.length<2400;m=naechsterMonat(m)) a.push(m); return a; }
/* Überlappung zweier Zeiträume in Tagen, beide Enden eingeschlossen; fehlendes Ende = unbegrenzt */
function ueberlappung(a1,b1,a2,b2){
  const s=Math.max(tagNr(a1),tagNr(a2)), e=Math.min(b1?tagNr(b1):Infinity,b2?tagNr(b2):Infinity);
  return e>=s?e-s+1:0;
}
function datumDE(iso){ return datumGueltig(iso)?iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4):''; }

/* ---------- Feiertage Baden-Württemberg und Werktage ----------
   Gesetzliche Feiertage in BW (Feiertagsgesetz BW § 1): Neujahr, Heilige Drei Könige, Karfreitag, Ostermontag,
   1. Mai, Christi Himmelfahrt, Pfingstmontag, Fronleichnam, Tag der Deutschen Einheit, Allerheiligen,
   1. und 2. Weihnachtstag. Ostersonntag nach der gregorianischen Osterformel (Meeus/Jones/Butcher). */
function ostersonntag(j){
  const a=j%19,b=Math.floor(j/100),c=j%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    monat=Math.floor((h+l-7*m+114)/31),tag=((h+l-7*m+114)%31)+1;
  return j+'-'+String(monat).padStart(2,'0')+'-'+String(tag).padStart(2,'0');
}
const FT_CACHE={};
function feiertageBW(j){
  if(FT_CACHE[j]) return FT_CACHE[j];
  const o=tagNr(ostersonntag(j)), f=new Map();
  [['01-01','Neujahr'],['01-06','Heilige Drei Könige'],['05-01','Tag der Arbeit'],['10-03','Tag der Deutschen Einheit'],
   ['11-01','Allerheiligen'],['12-25','1. Weihnachtstag'],['12-26','2. Weihnachtstag']].forEach(([t,n])=>f.set(j+'-'+t,n));
  [[-2,'Karfreitag'],[1,'Ostermontag'],[39,'Christi Himmelfahrt'],[50,'Pfingstmontag'],[60,'Fronleichnam']].forEach(([d,n])=>f.set(isoTag(o+d),n));
  return FT_CACHE[j]=f;
}
/* Zahlungswerktag: Montag bis Freitag ohne Feiertag. Der Samstag zählt für die Zahlungsfrist der Miete nicht
   (BGH, Urteil vom 13.07.2010, VIII ZR 129/09). */
function istZahlungsWerktag(iso){
  const wt=new Date(tagNr(iso)*TAG).getUTCDay();
  return wt>=1&&wt<=5&&!feiertageBW(+iso.slice(0,4)).has(iso);
}
/* Fälligkeit der Miete: spätestens am dritten Werktag des Monats (§ 556b Abs. 1 BGB) */
function dritterWerktag(ym){
  let n=tagNr(monatsErster(ym)), z=0;
  for(;;n++){ if(istZahlungsWerktag(isoTag(n))&&++z===3) return isoTag(n); }
}

/* ---------- Basiszinssatz (§ 247 BGB, Deutsche Bundesbank) und Verzugszinsen ----------
   Stand 01.07.2026; in den Einstellungen der Liegenschaft ergänzbar. Verzugszinssatz (§ 288 BGB):
   Basiszins + 5 Prozentpunkte, wenn ein Verbraucher beteiligt ist (Wohnraum), + 9 Prozentpunkte bei
   Geschäften ohne Verbraucher (Gewerbemiete). */
const BASISZINS=[['2016-07-01',-0.88],['2023-01-01',1.62],['2023-07-01',3.12],['2024-01-01',3.62],['2024-07-01',3.37],
  ['2025-01-01',2.27],['2025-07-01',1.27],['2026-01-01',1.27],['2026-07-01',1.52]];
function basiszinsTabelle(eigene){
  const t=BASISZINS.slice();
  (Array.isArray(eigene)?eigene:[]).forEach(x=>{ if(Array.isArray(x)&&datumGueltig(x[0])&&isFinite(x[1])){ const i=t.findIndex(y=>y[0]===x[0]); if(i>=0) t[i]=[x[0],+x[1]]; else t.push([x[0],+x[1]]); } });
  return t.sort((a,b)=>a[0]<b[0]?-1:1);
}
function basiszinsAm(iso,tab){ tab=tab||BASISZINS; let s=tab[0][1]; for(const [ab,v] of tab){ if(ab<=iso) s=v; else break; } return s; }
/* Zinsen auf betrag für die Tage nach faellig bis einschließlich bis (act/365), abschnittsweise je Basiszins */
function verzugszinsen(betrag,faellig,bis,aufschlag,tab){
  if(!(betrag>0)||!datumGueltig(faellig)||!datumGueltig(bis)) return 0;
  tab=tab||BASISZINS;
  let von=tagNr(faellig)+1, ende=tagNr(bis), z=0;
  if(ende<von) return 0;
  const wechsel=tab.map(x=>tagNr(x[0])).filter(n=>n>von&&n<=ende);
  const grenzen=[von].concat(wechsel,[ende+1]);
  for(let i=0;i<grenzen.length-1;i++){
    const tage=grenzen[i+1]-grenzen[i], satz=basiszinsAm(isoTag(grenzen[i]),tab)+aufschlag;
    z+=betrag*Math.max(0,satz)/100*tage/365;
  }
  return z;
}

/* ---------- Miete eines Vertrags ---------- */
const TEILE=['kalt','nk','hk','zuschlag'];
const TEIL_NAMEN={kalt:'Nettokaltmiete',nk:'Betriebskosten-Vorauszahlung',hk:'Heizkosten-Vorauszahlung',zuschlag:'Zuschläge (Stellplatz u. a.)'};
function aenderungenSortiert(v){ return (v.aenderungen||[]).filter(a=>datumGueltig(a.ab)).slice().sort((a,b)=>a.ab<b.ab?-1:a.ab>b.ab?1:0); }
/* Miete, die an einem Tag gilt: Anfangsmiete, danach alle Änderungen (Staffel, Index, Erhöhung) bis zu diesem Tag */
function mieteAm(v,iso){
  const m=Object.assign({kalt:0,nk:0,hk:0,zuschlag:0,ust:0},v.miete||{});
  aenderungenSortiert(v).forEach(a=>{ if(a.ab<=iso) TEILE.concat(['ust']).forEach(t=>{ if(typeof a[t]==='number'&&isFinite(a[t])) m[t]=a[t]; }); });
  const netto=summe(TEILE,t=>+m[t]||0);
  return {kalt:+m.kalt||0,nk:+m.nk||0,hk:+m.hk||0,zuschlag:+m.zuschlag||0,ust:+m.ust||0,netto,gesamt:netto*(1+(+m.ust||0)/100)};
}
function vertragAktiv(v,iso){ return datumGueltig(v.beginn)&&v.beginn<=iso&&(!v.ende||iso<=v.ende); }
function istWohnraum(v,l){ const e=l&&(l.einheiten||[]).find(x=>x.id===v.einheitId); return !e||!['gewerbe'].includes(e.art); }

/* Sollstellung bis zum Monat von bisIso: je Monat ein Posten, anteilig nach Kalendertagen bei Beginn, Ende oder
   Änderung innerhalb des Monats; Fälligkeit am dritten Werktag (bei Beginn im Monat frühestens am Beginn). */
function sollstellung(v,bisIso){
  if(!datumGueltig(v.beginn)||!datumGueltig(bisIso)) return [];
  const letzter=v.ende&&v.ende<bisIso?v.ende:bisIso, posten=[];
  if(letzter<v.beginn) return (v.sonderposten||[]).filter(s=>datumGueltig(s.datum)).map(s=>sonderPosten(s));
  const aend=aenderungenSortiert(v).map(a=>a.ab);
  monatsliste(monatVon(v.beginn),monatVon(letzter)).forEach(ym=>{
    const tim=tageImMonat(ym), s=Math.max(tagNr(monatsErster(ym)),tagNr(v.beginn)), e=Math.min(tagNr(monatsLetzter(ym)),v.ende?tagNr(v.ende):Infinity);
    if(e<s) return;
    const punkte=[s].concat(aend.map(tagNr).filter(n=>n>s&&n<=e),[e+1]), teile={kalt:0,nk:0,hk:0,zuschlag:0}; let ust=0;
    for(let i=0;i<punkte.length-1;i++){
      const m=mieteAm(v,isoTag(punkte[i])), f=(punkte[i+1]-punkte[i])/tim;
      TEILE.forEach(t=>teile[t]+=m[t]*f); ust+=m.netto*m.ust/100*f;
    }
    TEILE.forEach(t=>teile[t]=r2(teile[t])); ust=r2(ust);
    const dw=dritterWerktag(ym), beginnIso=isoTag(s);
    posten.push({id:'M'+ym,art:'miete',monat:ym,faellig:beginnIso>dw?beginnIso:dw,teile,ust,
      betrag:r2(summe(TEILE,t=>teile[t])+ust),anteilig:(e-s+1)<tim||punkte.length>2});
  });
  (v.sonderposten||[]).filter(s=>datumGueltig(s.datum)).forEach(s=>posten.push(sonderPosten(s)));
  return posten.sort((a,b)=>a.faellig<b.faellig?-1:a.faellig>b.faellig?1:(a.id<b.id?-1:1));
}
function sonderPosten(s){ return {id:'X'+s.id,art:s.art||'sonstig',monat:monatVon(s.datum),faellig:s.datum,teile:null,ust:0,betrag:r2(+s.betrag||0),text:s.text||''}; }

/* Offene Posten eines Vertrags zum Stichtag. Zahlungen werden zuerst auf den bestimmten Monat angerechnet
   (Tilgungsbestimmung, § 366 Abs. 1 BGB), sonst auf die älteste fällige Schuld (§ 366 Abs. 2 BGB) und danach
   auf die nächste noch nicht fällige. Rücklastschriften (negative Zahlungen) werden wie neue Forderungen am
   Buchungstag behandelt, Gutschriften (negative Sonderposten) wie Zahlungen. Kautionszahlungen zählen nicht. */
function offenePosten(v,zahlungen,stichtag,opt){
  opt=opt||{};
  const aufschlag=opt.aufschlag!=null?opt.aufschlag:5, tab=opt.basiszins||BASISZINS;
  const bis=opt.bis||stichtag;
  let posten=sollstellung(v,bis).map(p=>Object.assign({},p,{bezahlt:0,zuordnungen:[]}));
  const eigene=(zahlungen||[]).filter(z=>z.vertragId===v.id&&z.art!=='kaution'&&datumGueltig(z.datum)&&isFinite(z.betrag)&&z.datum<=bis);
  const gutschriften=posten.filter(p=>p.betrag<0);
  posten=posten.filter(p=>p.betrag>=0);
  eigene.filter(z=>z.betrag<0).forEach(z=>posten.push({id:'R'+z.id,art:'ruecklast',monat:monatVon(z.datum),faellig:z.datum,teile:null,ust:0,betrag:r2(-z.betrag),text:'Rücklastschrift / Rückbuchung',bezahlt:0,zuordnungen:[]}));
  posten.sort((a,b)=>a.faellig<b.faellig?-1:a.faellig>b.faellig?1:(a.id<b.id?-1:1));
  const eingaenge=eigene.filter(z=>z.betrag>0).map(z=>({id:z.id,datum:z.datum,betrag:z.betrag,monat:z.monat||''}))
    .concat(gutschriften.map(g=>({id:g.id,datum:g.faellig,betrag:-g.betrag,monat:'',gutschrift:true})))
    .sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:(a.id<b.id?-1:1));
  let guthaben=0;
  const anrechnen=(p,z,rest)=>{ const o=r2(p.betrag-p.bezahlt); if(o<=0) return rest; const b=Math.min(o,rest); p.bezahlt=r2(p.bezahlt+b); p.zuordnungen.push({id:z.id,datum:z.datum,betrag:r2(b)}); return r2(rest-b); };
  eingaenge.forEach(z=>{
    let rest=r2(z.betrag);
    if(z.monat){ const p=posten.find(x=>x.id==='M'+z.monat); if(p) rest=anrechnen(p,z,rest); }
    for(const p of posten){ if(rest<=0) break; rest=anrechnen(p,z,rest); }
    guthaben=r2(guthaben+rest);
  });
  let zinsen=0;
  posten.forEach(p=>{
    p.offen=r2(p.betrag-p.bezahlt); p.faelligJa=p.faellig<=stichtag;
    let z=0;
    p.zuordnungen.forEach(a=>{ if(a.datum>p.faellig) z+=verzugszinsen(a.betrag,p.faellig,a.datum,aufschlag,tab); });
    if(p.offen>0&&stichtag>p.faellig) z+=verzugszinsen(p.offen,p.faellig,stichtag,aufschlag,tab);
    p.zinsen=r2(z); zinsen+=p.zinsen;
    p.verzugTage=p.offen>0&&p.faelligJa?tagNr(stichtag)-tagNr(p.faellig):0;
    p.status=p.offen<=0?(p.zuordnungen.some(a=>a.datum>p.faellig)?'verspaetet':'bezahlt'):!p.faelligJa?'nicht_faellig':p.bezahlt>0?'teilweise':'offen';
  });
  const faellige=posten.filter(p=>p.faelligJa);
  return {posten,guthaben,summe:{soll:r2(summe(faellige,p=>p.betrag)),bezahlt:r2(summe(posten,p=>p.bezahlt)),
    rueckstand:r2(summe(faellige,p=>p.offen)),vorausOffen:r2(summe(posten.filter(p=>!p.faelligJa),p=>p.offen)),
    guthaben:r2(guthaben),zinsen:r2(zinsen),saldo:r2(summe(faellige,p=>p.offen)-guthaben)}};
}

/* Hinweis auf die Voraussetzungen einer fristlosen Kündigung wegen Zahlungsverzugs (§ 543 Abs. 2 Satz 1 Nr. 3
   BGB; bei Wohnraum ist der Rückstand nach § 569 Abs. 3 Nr. 1 BGB erst „nicht unerheblich“, wenn er eine
   Monatsmiete übersteigt). a) zwei aufeinanderfolgende Termine im Verzug mit zusammen mehr als einer
   Monatsmiete, b) über mehr als zwei Termine ein Rückstand von mindestens zwei Monatsmieten.
   Nur ein Warnsignal — Schonfristzahlung, Mietminderung u. a. sind hier nicht berücksichtigt. */
function kuendigungsschwelle(op,v,stichtag){
  const mm=r2(mieteAm(v,stichtag).gesamt), termine=op.posten.filter(p=>p.art==='miete'&&p.faelligJa);
  let a=false;
  for(let i=0;i+1<termine.length;i++){ const x=termine[i],y=termine[i+1]; if(x.offen>0&&y.offen>0&&x.offen+y.offen>mm+0.004){ a=true; break; } }
  const mitRueckstand=op.posten.filter(p=>p.faelligJa&&p.offen>0).length;
  const b=mitRueckstand>2&&op.summe.rueckstand>=2*mm-0.004;
  return {erreicht:a||b,a,b,monatsmiete:mm,rueckstand:op.summe.rueckstand};
}
/* Mahnstufe nach dem ältesten Verzug: 1 Zahlungserinnerung, 2 Mahnung, 3 letzte Mahnung */
const MAHNSTUFEN=[{stufe:1,ab:7,name:'Zahlungserinnerung'},{stufe:2,ab:21,name:'Mahnung'},{stufe:3,ab:35,name:'Letzte Mahnung'}];
function mahnvorschlag(op){
  const tage=Math.max(0,...op.posten.filter(p=>p.faelligJa&&p.offen>0).map(p=>p.verzugTage));
  let s=null; MAHNSTUFEN.forEach(m=>{ if(tage>=m.ab) s=m; });
  return {tage,stufe:s?s.stufe:0,name:s?s.name:''};
}

/* Kaution (§ 551 BGB): höchstens drei Monatsmieten ohne Betriebskosten (Nettokaltmiete); der Mieter darf in drei
   gleichen monatlichen Teilzahlungen leisten, die erste zu Beginn des Mietverhältnisses, die weiteren mit den
   unmittelbar folgenden Mietzahlungen. */
function kaution(v,zahlungen,stichtag){
  const k=v.kaution||{}, soll=r2(+k.soll||0), kalt0=datumGueltig(v.beginn)?mieteAm(v,v.beginn).kalt:0, hoechst=r2(3*kalt0);
  const eingaenge=(zahlungen||[]).filter(z=>z.vertragId===v.id&&z.art==='kaution'&&datumGueltig(z.datum)&&z.datum<=stichtag);
  const ist=r2(summe(eingaenge,z=>+z.betrag||0));
  const raten=[];
  if(soll>0&&datumGueltig(v.beginn)){
    if(k.raten){
      const r=Math.floor(soll/3*100)/100;
      const folge=sollstellung(v,plusMonate(v.beginn,3)).filter(p=>p.art==='miete'&&p.monat>monatVon(v.beginn)).slice(0,2);
      const termine=[v.beginn].concat(folge.map(p=>p.faellig));
      termine.forEach((t,i)=>raten.push({faellig:t,betrag:i===termine.length-1?r2(soll-r*i):r}));
    } else raten.push({faellig:v.beginn,betrag:soll});
  }
  const faelligSoll=r2(summe(raten.filter(x=>x.faellig<=stichtag),x=>x.betrag));
  const warn=[];
  if(soll>hoechst+0.004&&hoechst>0) warn.push('Kaution über drei Nettokaltmieten ('+eur(hoechst)+') — § 551 Abs. 1 BGB');
  if(faelligSoll-ist>0.004) warn.push('Kaution nicht vollständig gezahlt: '+eur(faelligSoll-ist)+' offen');
  return {soll,hoechst,ist,raten,faelligOffen:r2(Math.max(0,faelligSoll-ist)),warnungen:warn,art:k.art||'bar'};
}

/* ---------- Einheiten, Leerstand, Kennzahlen ---------- */
function vertraegeDerEinheit(l,eid){ return (l.vertraege||[]).filter(v=>v.einheitId===eid&&datumGueltig(v.beginn)); }
function aktiverVertrag(l,eid,iso){ return vertraegeDerEinheit(l,eid).find(v=>vertragAktiv(v,iso))||null; }
/* Leerstand je Einheit im Zeitraum: Tage ohne laufenden Vertrag; entgangene Nettokaltmiete nach Zielmiete
   (sonst letzte vereinbarte Kaltmiete), monatsgenau anteilig nach Kalendertagen */
function leerstand(l,von,bis){
  return (l.einheiten||[]).map(e=>{
    const vv=vertraegeDerEinheit(l,e.id);
    let leer=0, entgangen=0;
    monatsliste(monatVon(von),monatVon(bis)).forEach(ym=>{
      const a=ym===monatVon(von)?von:monatsErster(ym), b=ym===monatVon(bis)?bis:monatsLetzter(ym);
      const tage=tagNr(b)-tagNr(a)+1, belegt=Math.min(tage,summe(vv,v=>ueberlappung(a,b,v.beginn,v.ende||null)));
      const l2=tage-belegt;
      if(l2>0){
        leer+=l2;
        const letzte=vv.filter(v=>v.beginn<=b).sort((x,y)=>x.beginn<y.beginn?1:-1)[0];
        const ziel=+e.sollmiete>0?+e.sollmiete:letzte?mieteAm(letzte,letzte.ende||b).kalt:0;
        entgangen+=ziel*l2/tageImMonat(ym);
      }
    });
    return {einheitId:e.id,leerTage:leer,entgangen:r2(entgangen)};
  });
}
function kennzahlen(l,stichtag,opt){
  opt=opt||{};
  const E=l.einheiten||[], tab=basiszinsTabelle(l.einstellungen&&l.einstellungen.basiszins);
  let vermietet=0,flaeche=0,flaecheLeer=0,kalt=0,gesamt=0,rueckstand=0,zinsen=0,kautionOffen=0,schwelle=0;
  E.forEach(e=>{ const f=+e.flaeche||0; flaeche+=f; const v=aktiverVertrag(l,e.id,stichtag);
    if(v){ vermietet++; const m=mieteAm(v,stichtag); kalt+=m.kalt; gesamt+=m.gesamt; } else flaecheLeer+=f; });
  (l.vertraege||[]).forEach(v=>{ if(!datumGueltig(v.beginn)) return;
    const op=offenePosten(v,l.zahlungen,stichtag,{aufschlag:istWohnraum(v,l)?5:9,basiszins:tab});
    rueckstand+=op.summe.rueckstand; zinsen+=op.summe.zinsen;
    if(kuendigungsschwelle(op,v,stichtag).erreicht) schwelle++;
    kautionOffen+=kaution(v,l.zahlungen,stichtag).faelligOffen; });
  return {einheiten:E.length,vermietet,leer:E.length-vermietet,flaeche:r2(flaeche),leerquoteFlaeche:flaeche?r2(flaecheLeer/flaeche*100):0,
    kaltMonat:r2(kalt),gesamtMonat:r2(gesamt),kaltJahr:r2(kalt*12),rueckstand:r2(rueckstand),zinsen:r2(zinsen),
    kautionOffen:r2(kautionOffen),kuendigungsschwelle:schwelle,
    rendite:opt.wert>0?r2(kalt*12/opt.wert*100):null};
}

/* ---------- Fristen und Hinweise ---------- */
function fristen(l,stichtag,horizont){
  horizont=horizont||60;
  const grenze=isoTag(tagNr(stichtag)+horizont), aus=[], tab=basiszinsTabelle(l.einstellungen&&l.einstellungen.basiszins);
  const einheit=id=>(l.einheiten||[]).find(e=>e.id===id)||{};
  const wer=v=>{ const e=einheit(v.einheitId), n=(v.mieter||[]).map(m=>m.name).filter(Boolean).join(', '); return (e.nr?e.nr+(n?' · ':''):'')+(n||''); };
  (l.vertraege||[]).forEach(v=>{
    if(!datumGueltig(v.beginn)) return;
    if(v.ende&&v.ende>=stichtag&&v.ende<=grenze) aus.push({datum:v.ende,art:'vertragsende',titel:'Mietvertrag endet',text:wer(v),vertragId:v.id});
    aenderungenSortiert(v).forEach(a=>{ if(a.ab>stichtag&&a.ab<=grenze) aus.push({datum:a.ab,art:'aenderung',titel:(a.grund==='staffel'?'Staffelmiete steigt':'Mietänderung wird wirksam'),text:wer(v)+(typeof a.kalt==='number'?' · Kaltmiete '+eur(a.kalt):''),vertragId:v.id}); });
    if(v.mietart==='index'&&vertragAktiv(v,stichtag)){
      const letzte=aenderungenSortiert(v).filter(a=>a.ab<=stichtag&&typeof a.kalt==='number').map(a=>a.ab).pop()||v.beginn, ab=plusMonate(letzte,12);
      if(ab<=grenze) aus.push({datum:ab,art:'index',titel:'Indexanpassung möglich (§ 557b BGB)',text:wer(v)+' · Miete seit '+datumDE(letzte)+' unverändert',vertragId:v.id});
    }
    if(vertragAktiv(v,stichtag)||(v.ende&&v.ende>=isoTag(tagNr(stichtag)-365))){
      const op=offenePosten(v,l.zahlungen,stichtag,{aufschlag:istWohnraum(v,l)?5:9,basiszins:tab});
      if(op.summe.rueckstand>0){
        const aelteste=op.posten.find(p=>p.faelligJa&&p.offen>0), mv=mahnvorschlag(op), ks=kuendigungsschwelle(op,v,stichtag);
        aus.push({datum:aelteste.faellig,art:'rueckstand',titel:'Mietrückstand '+eur(op.summe.rueckstand),
          text:wer(v)+(mv.stufe?' · Vorschlag: '+mv.name:'')+(ks.erreicht?' · Kündigungsvoraussetzungen prüfen (§ 543 BGB)':''),vertragId:v.id,dringend:ks.erreicht});
      }
      const k=kaution(v,l.zahlungen,stichtag);
      if(k.faelligOffen>0) aus.push({datum:(k.raten.filter(r=>r.faellig<=stichtag).pop()||{}).faellig||v.beginn,art:'kaution',titel:'Kaution offen '+eur(k.faelligOffen),text:wer(v),vertragId:v.id});
    }
  });
  aus.forEach(f=>{ f.liegenschaftId=l.id; f.liegenschaft=l.name||''; f.faellig=f.datum<=stichtag; });
  return aus.sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0);
}

/* ---------- Prüfung und Bereinigung (Import, Laden) ----------
   Nur bekannte Felder mit passenden Typen bleiben erhalten; Texte werden gekürzt, Zahlen und Daten geprüft,
   Einträge mit ungültiger Kennung verworfen und gezählt. */
const ARTEN_L=['mfh','wohnhaus','etw','weg','gewerbe','gemischt','sonstig'];
const ARTEN_E=['wohnung','gewerbe','stellplatz','garage','lager','sonstig'];
const EIGENTUEMER=['kunde','eigen','bank','sonstig'];
const MIETARTEN=['fest','staffel','index'];
const ZAHLARTEN=['miete','kaution','nk_nachzahlung','sonstig'];
const KAUTIONSARTEN=['bar','buergschaft','sparbuch','depot','sonstig'];
function text(v,max){ return typeof v==='string'?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max||200):typeof v==='number'&&isFinite(v)?String(v):''; }
function zahl(v){ return typeof v==='number'&&isFinite(v)?v:null; }
function datum(v){ return datumGueltig(v)?v:null; }
function wahl(v,liste,std){ return liste.includes(v)?v:std; }
function bereinigen(roh,zaehler){
  zaehler=zaehler||{verworfen:0};
  if(!istObj(roh)||!ID.test(roh.id)) return null;
  const liste=(a,f)=>(Array.isArray(a)?a:[]).slice(0,20000).map(x=>{ const r=istObj(x)&&ID.test(x.id)?f(x):null; if(!r) zaehler.verworfen++; return r; }).filter(Boolean);
  const e0=istObj(roh.einstellungen)?roh.einstellungen:{};
  const l={id:roh.id,name:text(roh.name,200)||'Liegenschaft',strasse:text(roh.strasse),plz:text(roh.plz,10),ort:text(roh.ort),
    art:wahl(roh.art,ARTEN_L,'mfh'),eigentuemerArt:wahl(roh.eigentuemerArt,EIGENTUEMER,'kunde'),
    kundeId:typeof roh.kundeId==='string'&&ID.test(roh.kundeId)?roh.kundeId:null,eigentuemerName:text(roh.eigentuemerName),
    baujahr:zahl(roh.baujahr),notiz:text(roh.notiz,5000),wert:zahl(roh.wert),
    projektId:typeof roh.projektId==='string'&&ID.test(roh.projektId)?roh.projektId:null,
    kontoInhaber:text(roh.kontoInhaber),iban:text(roh.iban,42).replace(/\s+/g,'').toUpperCase(),bank:text(roh.bank),
    einstellungen:{kappung15:e0.kappung15===true,basiszins:(Array.isArray(e0.basiszins)?e0.basiszins:[]).filter(x=>Array.isArray(x)&&datumGueltig(x[0])&&typeof x[1]==='number'&&isFinite(x[1])).slice(0,100).map(x=>[x[0],x[1]])},
    angelegt:zahl(roh.angelegt)||0,geaendert:zahl(roh.geaendert)||0};
  l.einheiten=liste(roh.einheiten,e=>({id:e.id,nr:text(e.nr,40),lage:text(e.lage),art:wahl(e.art,ARTEN_E,'wohnung'),flaeche:zahl(e.flaeche),
    zimmer:zahl(e.zimmer),mea:zahl(e.mea),sollmiete:zahl(e.sollmiete),notiz:text(e.notiz,2000)}));
  const eids=new Set(l.einheiten.map(e=>e.id));
  l.vertraege=liste(roh.vertraege,v=>{
    if(!eids.has(v.einheitId)||!datumGueltig(v.beginn)) return null;
    const m=istObj(v.miete)?v.miete:{}, k=istObj(v.kaution)?v.kaution:{}, ix=istObj(v.index)?v.index:{};
    return {id:v.id,einheitId:v.einheitId,beginn:v.beginn,ende:datum(v.ende),mietart:wahl(v.mietart,MIETARTEN,'fest'),
      mieter:(Array.isArray(v.mieter)?v.mieter:[]).filter(istObj).slice(0,10).map(p=>({name:text(p.name),telefon:text(p.telefon,60),email:text(p.email,120)})),
      personen:zahl(v.personen),
      miete:{kalt:zahl(m.kalt)||0,nk:zahl(m.nk)||0,hk:zahl(m.hk)||0,zuschlag:zahl(m.zuschlag)||0,ust:zahl(m.ust)||0},
      aenderungen:liste(v.aenderungen,a=>{ if(!datumGueltig(a.ab)) return null; const o={id:a.id,ab:a.ab,grund:text(a.grund,40),notiz:text(a.notiz,500)};
        TEILE.concat(['ust']).forEach(t=>{ if(typeof a[t]==='number'&&isFinite(a[t])) o[t]=a[t]; }); return o; }),
      index:{basisMonat:typeof ix.basisMonat==='string'&&/^\d{4}-\d{2}$/.test(ix.basisMonat)?ix.basisMonat:null,basisWert:zahl(ix.basisWert)},
      kaution:{soll:zahl(k.soll)||0,art:wahl(k.art,KAUTIONSARTEN,'bar'),raten:k.raten===true},
      sonderposten:liste(v.sonderposten,s=>datumGueltig(s.datum)&&typeof s.betrag==='number'&&isFinite(s.betrag)?{id:s.id,datum:s.datum,betrag:s.betrag,text:text(s.text,300),art:text(s.art,30)||'sonstig'}:null),
      notiz:text(v.notiz,5000)};
  });
  const vids=new Set(l.vertraege.map(v=>v.id));
  l.zahlungen=liste(roh.zahlungen,z=>datumGueltig(z.datum)&&typeof z.betrag==='number'&&isFinite(z.betrag)&&(z.vertragId==null||vids.has(z.vertragId))
    ?{id:z.id,datum:z.datum,betrag:z.betrag,vertragId:z.vertragId||null,art:wahl(z.art,ZAHLARTEN,'miete'),monat:typeof z.monat==='string'&&/^\d{4}-\d{2}$/.test(z.monat)?z.monat:'',text:text(z.text,300)}:null);
  l.mahnungen=liste(roh.mahnungen,m=>vids.has(m.vertragId)&&datumGueltig(m.datum)?{id:m.id,vertragId:m.vertragId,datum:m.datum,stufe:Math.max(1,Math.min(3,+m.stufe||1)),betrag:zahl(m.betrag)||0}:null);
  return l;
}
/* IBAN-Prüfziffer (ISO 13616, Modulo 97) */
function ibanGueltig(iban){
  const t=String(iban||'').replace(/\s+/g,'').toUpperCase();
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(t)||(t.startsWith('DE')&&t.length!==22)) return false;
  const u=(t.slice(4)+t.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
  let r=0; for(const z of u) r=(r*10+ +z)%97;
  return r===1;
}
function ibanLesbar(iban){ return String(iban||'').replace(/\s+/g,'').replace(/(.{4})/g,'$1 ').trim(); }
/* Absenderangaben der Verwaltung (für Schreiben und Abrechnungen) */
function einstellungenBereinigen(o){ o=istObj(o)?o:{}; return {name:text(o.name),anschrift:text(o.anschrift,300),telefon:text(o.telefon,60),email:text(o.email,120),ort:text(o.ort,80)}; }
/* Sicherungsdatei der Verwaltung: {typ:'immoapp-verwaltung', version:1, liegenschaften, einstellungen?, anhaenge?} */
function sicherungPruefen(o){
  if(!istObj(o)||o.typ!=='immoapp-verwaltung'||!Array.isArray(o.liegenschaften)){
    if(istObj(o)&&o.typ==='immoapp-projekte') return {ok:false,fehler:'Das ist eine Projektsicherung. Sie wird in der Projekte-Übersicht über „Sicherung einspielen“ geladen.'};
    if(istObj(o)&&o.typ==='vb-marktdaten') return {ok:false,fehler:'Das ist eine Sicherung des Marktüberblicks. Sie wird im Marktüberblick unter „Datensicherung“ eingelesen.'};
    return {ok:false,fehler:'Die Datei ist keine Sicherung der Liegenschaftsverwaltung.'};
  }
  const z={verworfen:0}, liegenschaften=[];
  o.liegenschaften.forEach(x=>{ const l=bereinigen(x,z); if(l) liegenschaften.push(l); else z.verworfen++; });
  const anhaenge=[]; let anV=0;
  (Array.isArray(o.anhaenge)?o.anhaenge:[]).forEach(a=>{
    if(istObj(a)&&ID.test(a.id)&&typeof a.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(a.data)&&a.data.length%4===0)
      anhaenge.push({id:a.id,liegenschaftId:typeof a.liegenschaftId==='string'&&ID.test(a.liegenschaftId)?a.liegenschaftId:'',name:text(a.name,200)||'anhang',typ:text(a.typ,80),size:+a.size||0,datum:datum(a.datum),data:a.data});
    else anV++;
  });
  if(!liegenschaften.length) return {ok:false,fehler:o.liegenschaften.length?'Keine der '+o.liegenschaften.length+' Liegenschaften ist lesbar — die Datei ist beschädigt.':'In der Sicherung stehen keine Liegenschaften.'};
  return {ok:true,version:o.version||1,liegenschaften,anhaenge,einstellungen:istObj(o.einstellungen)?einstellungenBereinigen(o.einstellungen):null,verworfen:z.verworfen+anV};
}

const ImmoVerwaltung={ID,r2,neueId,zahlEingabe,eur,datumGueltig,tagNr,isoTag,monatVon,tageImMonat,monatsErster,monatsLetzter,plusMonate,
  monatsliste,ueberlappung,datumDE,ostersonntag,feiertageBW,istZahlungsWerktag,dritterWerktag,BASISZINS,basiszinsTabelle,basiszinsAm,
  verzugszinsen,TEILE,TEIL_NAMEN,mieteAm,vertragAktiv,istWohnraum,sollstellung,offenePosten,kuendigungsschwelle,MAHNSTUFEN,mahnvorschlag,
  kaution,aktiverVertrag,vertraegeDerEinheit,leerstand,kennzahlen,fristen,bereinigen,sicherungPruefen,ibanGueltig,ibanLesbar,einstellungenBereinigen,
  ARTEN_L,ARTEN_E,EIGENTUEMER,MIETARTEN,ZAHLARTEN,KAUTIONSARTEN};
wurzel.ImmoVerwaltung=ImmoVerwaltung;
if(typeof module==='object'&&module.exports) module.exports=ImmoVerwaltung;
})(typeof globalThis!=='undefined'?globalThis:this);
