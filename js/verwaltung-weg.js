/* ImmoApp — Liegenschaftsverwaltung: Wohnungseigentümergemeinschaft (WEG) (ohne DOM, in Node testbar)
   Grundlagen (WEG in der Fassung des WEMoG, seit 01.12.2020):
   - Kostenverteilung nach Miteigentumsanteilen, soweit nichts anderes beschlossen/vereinbart ist (§ 16 Abs. 2 WEG).
   - Wirtschaftsplan: Beschluss über die Vorschüsse (Hausgeld) und die Zuführung zur Erhaltungsrücklage
     (§ 28 Abs. 1, § 19 Abs. 2 Nr. 4 WEG); Fortgeltung nur, wenn sie beschlossen ist.
   - Jahresabrechnung: Beschluss über Nachschüsse bzw. die Anpassung der Vorschüsse — die „Abrechnungsspitze“
     (Kostenanteil + Soll-Zuführung Rücklage − Soll-Vorschüsse); Vermögensbericht mit Rücklage und
     wesentlichem Vermögen (§ 28 Abs. 2 und 4 WEG).
   - Versammlung mindestens einmal jährlich, Einberufung in Textform mit mindestens drei Wochen Frist (§ 24 Abs. 1
     und 4 WEG); Beschluss mit der Mehrheit der abgegebenen Stimmen, Enthaltungen zählen nicht, jeder
     Wohnungseigentümer eine Stimme, Miteigentümer einer Einheit nur gemeinsam (§ 25 Abs. 1 und 2 WEG);
     bauliche Veränderungen mit mehr als zwei Dritteln der abgegebenen Stimmen und mehr als der Hälfte aller
     Miteigentumsanteile, damit alle die Kosten tragen (§ 21 Abs. 2 Nr. 1 WEG).
   - Beschluss-Sammlung fortlaufend nummeriert, mit Vermerken zu Anfechtung und Aufhebung (§ 24 Abs. 7 WEG). */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const N=wurzel.ImmoNebenkosten||(typeof require==='function'?require('./verwaltung-nk.js'):null);
const {r2,datumGueltig,tagNr,isoTag,monatVon,monatsliste,dritterWerktag,plusMonate,datumDE}=V;

const PRINZIPIEN={kopf:'Kopfprinzip — je Wohnungseigentümer eine Stimme (§ 25 Abs. 2 WEG)',mea:'Wertprinzip — nach Miteigentumsanteilen',objekt:'Objektprinzip — je Einheit eine Stimme'};
const MEHRHEITEN={einfach:'Mehrheit der abgegebenen Stimmen (§ 25 Abs. 1 WEG)',baulich21:'mehr als 2/3 der abgegebenen Stimmen und mehr als die Hälfte aller MEA (§ 21 Abs. 2 Nr. 1 WEG)',allstimmig:'Zustimmung aller Wohnungseigentümer'};
const SCHLUESSEL={mea:'Miteigentumsanteile',einheiten:'Einheiten',flaeche:'Wohn-/Nutzfläche',direkt:'direkt zugeordnet'};

function weg(l){ return l.weg||{}; }
function personKey(o){ return o.kundeId||String(o.name||'').trim().toLowerCase().replace(/\s+/g,' '); }
/* Eigentümer einer Einheit an einem Tag: alle Einträge mit dem jüngsten „seit“ bis zu diesem Tag (Miteigentümer
   tragen dasselbe Datum) */
function eigentuemerAm(l,eid,datum){
  const alle=(weg(l).eigentuemer||[]).filter(o=>o.einheitId===eid&&(!o.seit||o.seit<=datum));
  if(!alle.length) return [];
  const s=alle.map(o=>o.seit||'').sort().pop();
  return alle.filter(o=>(o.seit||'')===s);
}
function meaGesamt(l){ return (l.einheiten||[]).reduce((s,e)=>s+(+e.mea||0),0); }

/* Verteilung eines Betrags auf die Einheiten (unrunded) */
function verteilen(l,betrag,schl,direktId){
  const E=(l.einheiten||[]), aus={};
  let g=[];
  if(schl==='direkt') g=E.filter(e=>e.id===direktId).map(e=>[e.id,1]);
  else if(schl==='einheiten') g=E.map(e=>[e.id,1]);
  else if(schl==='flaeche') g=E.filter(e=>+e.flaeche>0).map(e=>[e.id,+e.flaeche]);
  else g=E.filter(e=>+e.mea>0).map(e=>[e.id,+e.mea]);
  const s=g.reduce((a,x)=>a+x[1],0);
  if(s>0) g.forEach(([id,w])=>aus[id]=betrag*w/s);
  return aus;
}

/* ---------- Wirtschaftsplan und Hausgeld ---------- */
function planFuerJahr(l,jahr){
  const pl=(weg(l).wirtschaftsplaene||[]).filter(p=>p.beschlossenAm);
  const genau=pl.find(p=>+p.jahr===+jahr); if(genau) return {plan:genau,fortgeltend:false};
  const frueher=pl.filter(p=>+p.jahr<+jahr).sort((a,b)=>b.jahr-a.jahr)[0];
  return frueher&&frueher.fortgeltung?{plan:frueher,fortgeltend:true}:null;
}
/* Einzelwirtschaftspläne: je Einheit Kostenanteil, Zuführung zur Rücklage, Hausgeld im Jahr und im Monat */
function einzelplaene(l,plan){
  const k={}, r={};
  (plan.positionen||[]).forEach(p=>{ const d=verteilen(l,+p.betrag||0,p.schluessel||'mea',p.einheitId); Object.entries(d).forEach(([id,b])=>k[id]=(k[id]||0)+b); });
  const d=verteilen(l,+plan.ruecklage||0,'mea'); Object.entries(d).forEach(([id,b])=>r[id]=(r[id]||0)+b);
  return (l.einheiten||[]).map(e=>{ const kosten=r2(k[e.id]||0), ruecklage=r2(r[e.id]||0), monat=r2((kosten+ruecklage)/12);
    return {einheitId:e.id,kosten,ruecklage,jahr:r2(monat*12),monat}; });
}
/* Hausgeld-Sollstellung einer Einheit bis zum Monat von bis: Vorschüsse aus dem (fortgeltenden) Wirtschaftsplan,
   fällig am dritten Werktag; Sonderumlagen; gebuchte Abrechnungsspitzen (negativ = Guthaben) */
function hausgeldPosten(l,eid,bis){
  const W=weg(l), jahre=(W.wirtschaftsplaene||[]).filter(p=>p.beschlossenAm).map(p=>+p.jahr);
  const posten=[];
  if(jahre.length){
    const start=Math.min(...jahre)+'-01';
    monatsliste(start,monatVon(bis)).forEach(ym=>{
      const pf=planFuerJahr(l,+ym.slice(0,4)); if(!pf) return;
      const ep=einzelplaene(l,pf.plan).find(x=>x.einheitId===eid); if(!ep||!ep.monat) return;
      posten.push({id:'H'+ym,art:'hausgeld',monat:ym,faellig:dritterWerktag(ym),betrag:ep.monat,text:'Hausgeld '+ym.slice(5)+'/'+ym.slice(0,4)+(pf.fortgeltend?' (Fortgeltung '+pf.plan.jahr+')':'')});
    });
  }
  (W.sonderumlagen||[]).filter(u=>datumGueltig(u.faellig)&&u.faellig<=bis).forEach(u=>{
    const b=r2((verteilen(l,+u.betrag||0,u.schluessel||'mea',u.einheitId)[eid])||0);
    if(b) posten.push({id:'U'+u.id,art:'sonderumlage',monat:monatVon(u.faellig),faellig:u.faellig,betrag:b,text:'Sonderumlage: '+(u.text||'')});
  });
  (W.abrechnungen||[]).filter(a=>a.gebuchtAm&&datumGueltig(a.faellig)&&a.faellig<=bis).forEach(a=>{
    const s=(a.spitzen||{})[eid]; if(s) posten.push({id:'A'+a.id,art:'abrechnung',monat:monatVon(a.faellig),faellig:a.faellig,betrag:s,text:'Jahresabrechnung '+a.jahr+(s>0?' – Nachschuss':' – Guthaben')});
  });
  return posten.sort((a,b)=>a.faellig<b.faellig?-1:a.faellig>b.faellig?1:(a.id<b.id?-1:1));
}
function hausgeldKonto(l,eid,stichtag,opt){
  opt=opt||{};
  const z=(weg(l).zahlungen||[]).filter(x=>x.einheitId===eid&&datumGueltig(x.datum)&&isFinite(x.betrag)&&x.datum<=stichtag);
  return V.kontoFuehren(hausgeldPosten(l,eid,stichtag),z,stichtag,{aufschlag:opt.aufschlag!=null?opt.aufschlag:5,basiszins:V.basiszinsTabelle(l.einstellungen&&l.einstellungen.basiszins)});
}

/* ---------- Jahresabrechnung ---------- */
function jahresabrechnung(l,jahr,cfg){
  cfg=cfg||{};
  const von=jahr+'-01-01', bis=jahr+'-12-31', hinweise=[], E=l.einheiten||[], W=weg(l);
  const je={}; E.forEach(e=>je[e.id]={kosten:0,umlagefaehig:0,p35a:0,positionen:{}});
  const positionen=[]; let entnahmen=0, ausgaben=0;
  const heizE=cfg.heiz||{}, heizSumme=Object.values(heizE).reduce((s,x)=>s+(+x||0),0);
  N.kostenImZeitraum(l,von,bis).forEach(({k,betrag})=>{
    const kat=N.KAT[k.kategorie]||{}; ausgaben+=betrag;
    if(k.ausRuecklage){ entnahmen+=betrag; positionen.push({id:k.id,text:k.text||kat.name,gesamt:r2(betrag),schluessel:'ruecklage'}); return; }
    let schl=SCHLUESSEL[k.schluessel]?k.schluessel:'mea', d;
    if(kat.heiz&&heizSumme>0){ schl='heiz'; d={}; Object.entries(heizE).forEach(([id,x])=>{ if(je[id]) d[id]=betrag*(+x||0)/heizSumme; }); }
    else { if(kat.heiz) hinweise.push('Heizkosten ohne Einzelwerte des Messdienstes nach MEA verteilt — die HeizkostenV verlangt eine verbrauchsabhängige Verteilung.');
      d=verteilen(l,betrag,schl,k.direktEinheitId); }
    const lohn=+k.lohn35a||0, lohnImZ=lohn&&+k.betrag?lohn*betrag/(+k.betrag):0;
    Object.entries(d).forEach(([id,b])=>{ const rb=r2(b); je[id].kosten+=rb; je[id].positionen[k.id]=rb; if(kat.umlage!==false) je[id].umlagefaehig+=rb;
      if(lohnImZ) je[id].p35a+=r2(lohnImZ*b/betrag); });
    positionen.push({id:k.id,text:k.text||kat.name,kategorie:k.kategorie,gesamt:r2(betrag),schluessel:schl,umlagefaehig:kat.umlage!==false});
  });
  const pf=planFuerJahr(l,jahr), ep=pf?einzelplaene(l,pf.plan):[];
  if(!pf) hinweise.push('Für '+jahr+' gibt es keinen beschlossenen Wirtschaftsplan — Soll-Vorschüsse und Rücklagenzuführung sind 0.');
  const einzel=E.map(e=>{
    const x=je[e.id], p=ep.find(y=>y.einheitId===e.id)||{ruecklage:0,monat:0};
    const soll=hausgeldPosten(l,e.id,bis).filter(q=>q.art==='hausgeld'&&q.monat.startsWith(jahr+'-')).reduce((s,q)=>s+q.betrag,0);
    const gezahlt=(W.zahlungen||[]).filter(z=>z.einheitId===e.id&&z.datum>=von&&z.datum<=bis&&(z.art||'hausgeld')==='hausgeld').reduce((s,z)=>s+z.betrag,0);
    const kosten=r2(x.kosten), summe=r2(kosten+p.ruecklage), vorschuss=r2(soll);
    return {einheitId:e.id,mea:+e.mea||0,eigentuemer:eigentuemerAm(l,e.id,bis).map(o=>o.name),kosten,umlagefaehig:r2(x.umlagefaehig),p35a:r2(x.p35a),
      zufuehrung:p.ruecklage,summe,vorschussSoll:vorschuss,spitze:r2(summe-vorschuss),gezahlt:r2(gezahlt),positionen:x.positionen};
  });
  const einnahmen=(W.zahlungen||[]).filter(z=>z.datum>=von&&z.datum<=bis).reduce((s,z)=>s+z.betrag,0);
  const zufuehrung=r2(einzel.reduce((s,x)=>s+x.zufuehrung,0)), anfang=+cfg.ruecklageAnfang||0;
  const forderungen=E.reduce((s,e)=>s+hausgeldKonto(l,e.id,bis).summe.rueckstand,0);
  return {jahr,von,bis,plan:pf?{jahr:pf.plan.jahr,fortgeltend:pf.fortgeltend}:null,positionen,einzel,hinweise:[...new Set(hinweise)],
    gesamt:{ausgaben:r2(ausgaben),einnahmen:r2(einnahmen),verteilt:r2(einzel.reduce((s,x)=>s+x.kosten,0)),entnahmenRuecklage:r2(entnahmen)},
    ruecklage:{anfang:r2(anfang),zufuehrung,entnahmen:r2(entnahmen),ende:r2(anfang+zufuehrung-entnahmen)},
    vermoegen:{kontostand:cfg.kontoEnde!=null?r2(+cfg.kontoEnde):null,forderungen:r2(forderungen),verbindlichkeiten:cfg.verbindlichkeiten!=null?r2(+cfg.verbindlichkeiten):null},
    spitzeSumme:r2(einzel.reduce((s,x)=>s+x.spitze,0))};
}

/* ---------- Versammlung und Abstimmung ---------- */
function einladungsfrist(einladungAm,datum){
  if(!datumGueltig(einladungAm)||!datumGueltig(datum)) return {tage:null,ok:false};
  const t=tagNr(datum)-tagNr(einladungAm);
  return {tage:t,ok:t>=21};
}
/* Abstimmung zu einem Tagesordnungspunkt: stimmen {einheitId: 'ja'|'nein'|'enthaltung'} (fehlend = nicht vertreten) */
function abstimmung(l,top,datum,prinzip){
  prinzip=prinzip||weg(l).stimmprinzip||'kopf';
  const E=(l.einheiten||[]), st=top.stimmen||{}, hinweise=[], gesamtMea=meaGesamt(l);
  const gruppen={};
  E.forEach(e=>{
    const eig=eigentuemerAm(l,e.id,datum);
    if(!eig.length){ hinweise.push('Einheit '+(e.nr||'')+': kein Eigentümer erfasst'); return; }
    const key=prinzip==='kopf'?eig.map(personKey).sort().join('+'):e.id;
    const g=gruppen[key]||(gruppen[key]={einheiten:[],namen:eig.map(o=>o.name).join(', '),stimmen:new Set(),mea:0});
    g.einheiten.push(e.id); g.mea+=+e.mea||0;
    if(['ja','nein','enthaltung'].includes(st[e.id])) g.stimmen.add(st[e.id]);
  });
  let ja=0,nein=0,enth=0,ungueltig=0,meaJa=0;
  Object.values(gruppen).forEach(g=>{
    if(!g.stimmen.size) return;
    if(g.stimmen.size>1){ ungueltig++; hinweise.push(g.namen+': widersprüchliche Stimmen für mehrere Einheiten — nach dem Kopfprinzip nur eine Stimme; nicht gewertet'); return; }
    const s=[...g.stimmen][0];
    const gew=prinzip==='mea'?g.mea:prinzip==='objekt'?g.einheiten.length:1;
    if(s==='ja'){ ja+=gew; meaJa+=g.mea; } else if(s==='nein') nein+=gew; else enth+=gew;
  });
  const abgegeben=ja+nein, art=top.mehrheit||'einfach';
  let angenommen;
  if(art==='baulich21') angenommen=ja>2/3*abgegeben&&meaJa>gesamtMea/2;
  else if(art==='allstimmig') angenommen=Object.values(gruppen).every(g=>g.stimmen.size===1&&g.stimmen.has('ja'))&&Object.keys(gruppen).length>0;
  else angenommen=ja>nein;
  return {prinzip,mehrheit:art,ja:r2(ja),nein:r2(nein),enthaltung:r2(enth),ungueltig,abgegeben:r2(abgegeben),meaJa:r2(meaJa),meaGesamt:r2(gesamtMea),
    stimmberechtigte:Object.keys(gruppen).length,angenommen,hinweise};
}
function naechsteBeschlussNr(l){ return (weg(l).beschluesse||[]).reduce((m,b)=>Math.max(m,+b.nr||0),0)+1; }

/* ---------- Fristen ---------- */
function fristen(l,stichtag,horizont){
  if(l.art!=='weg') return [];
  const W=weg(l), aus=[], grenze=isoTag(tagNr(stichtag)+(horizont||60));
  const vs=(W.versammlungen||[]).filter(v=>datumGueltig(v.datum));
  const letzte=vs.filter(v=>v.datum<=stichtag).map(v=>v.datum).sort().pop(), geplant=vs.filter(v=>v.datum>stichtag);
  if(!geplant.length){ const f=letzte?plusMonate(letzte,12):stichtag;
    if(f<=grenze) aus.push({datum:f,art:'weg_versammlung',titel:'Eigentümerversammlung einberufen (mindestens jährlich, § 24 Abs. 1 WEG)',text:letzte?'letzte am '+datumDE(letzte):'noch keine erfasst',faellig:f<=stichtag}); }
  geplant.forEach(v=>{ const bisEinladung=isoTag(tagNr(v.datum)-21);
    if(!v.einladungAm&&bisEinladung<=grenze) aus.push({datum:bisEinladung,art:'weg_versammlung',titel:'Einladung zur Versammlung am '+datumDE(v.datum)+' versenden',text:'mindestens drei Wochen vorher in Textform (§ 24 Abs. 4 WEG)',faellig:bisEinladung<=stichtag,dringend:bisEinladung<stichtag}); });
  const vj=+stichtag.slice(0,4)-1;
  if((W.wirtschaftsplaene||[]).some(p=>+p.jahr<=vj)&&!(W.abrechnungen||[]).some(a=>+a.jahr===vj&&a.beschlossenAm))
    aus.push({datum:vj+1+'-06-30',art:'weg_abrechnung',jahr:vj,titel:'Jahresabrechnung '+vj+' erstellen und beschließen lassen',text:'§ 28 Abs. 2 WEG — üblich im ersten Halbjahr',faellig:stichtag>vj+1+'-06-30'});
  const nj=+stichtag.slice(0,4)+1;
  if(stichtag.slice(5)>='10-01'&&!(W.wirtschaftsplaene||[]).some(p=>+p.jahr===nj)&&!((planFuerJahr(l,nj)||{}).fortgeltend))
    aus.push({datum:stichtag.slice(0,4)+'-12-01',art:'weg_plan',jahr:nj,titel:'Wirtschaftsplan '+nj+' aufstellen',text:'oder Fortgeltung beschließen (§ 28 Abs. 1 WEG)',faellig:false});
  (l.einheiten||[]).forEach(e=>{ const k=hausgeldKonto(l,e.id,stichtag); if(k.summe.rueckstand>0){ const p=k.posten.find(x=>x.faelligJa&&x.offen>0);
    aus.push({datum:p.faellig,art:'weg_hausgeld',titel:'Hausgeldrückstand '+V.eur(k.summe.rueckstand),text:(e.nr||'')+' · '+eigentuemerAm(l,e.id,stichtag).map(o=>o.name).join(', '),faellig:true,einheitId:e.id}); } });
  aus.forEach(f=>{ f.liegenschaftId=l.id; f.liegenschaft=l.name||''; });
  return aus;
}

/* ---------- Bereinigung ---------- */
function bereinigen(roh,l,zaehler,h){
  const {text,zahl,liste,ID}=h, W=roh.weg&&typeof roh.weg==='object'?roh.weg:{}, eids=new Set(l.einheiten.map(e=>e.id));
  const d=x=>datumGueltig(x)?x:null, idOk=x=>typeof x==='string'&&ID.test(x)?x:null;
  const w={stimmprinzip:PRINZIPIEN[W.stimmprinzip]?W.stimmprinzip:'kopf'};
  w.eigentuemer=liste(W.eigentuemer,o=>eids.has(o.einheitId)?{id:o.id,einheitId:o.einheitId,name:text(o.name)||'Eigentümer',kundeId:idOk(o.kundeId),anschrift:text(o.anschrift,300),email:text(o.email,120),telefon:text(o.telefon,60),seit:d(o.seit)}:null);
  w.wirtschaftsplaene=liste(W.wirtschaftsplaene,p=>+p.jahr>1900&&+p.jahr<2200?{id:p.id,jahr:+p.jahr,ruecklage:zahl(p.ruecklage)||0,beschlossenAm:d(p.beschlossenAm),fortgeltung:p.fortgeltung===true,
    positionen:liste(p.positionen,x=>typeof x.betrag==='number'&&isFinite(x.betrag)?{id:x.id,text:text(x.text,200)||'Position',kategorie:typeof x.kategorie==='string'&&N.KAT[x.kategorie]?x.kategorie:null,betrag:x.betrag,schluessel:SCHLUESSEL[x.schluessel]?x.schluessel:'mea',einheitId:eids.has(x.einheitId)?x.einheitId:null}:null)}:null);
  w.zahlungen=liste(W.zahlungen,z=>eids.has(z.einheitId)&&d(z.datum)&&typeof z.betrag==='number'&&isFinite(z.betrag)?{id:z.id,einheitId:z.einheitId,datum:z.datum,betrag:z.betrag,art:['hausgeld','sonderumlage','abrechnung','sonstig'].includes(z.art)?z.art:'hausgeld',monat:typeof z.monat==='string'&&/^\d{4}-\d{2}$/.test(z.monat)?z.monat:'',text:text(z.text,300)}:null);
  w.sonderumlagen=liste(W.sonderumlagen,u=>d(u.faellig)&&typeof u.betrag==='number'&&isFinite(u.betrag)?{id:u.id,faellig:u.faellig,betrag:u.betrag,schluessel:SCHLUESSEL[u.schluessel]?u.schluessel:'mea',einheitId:eids.has(u.einheitId)?u.einheitId:null,text:text(u.text,300),beschlussNr:zahl(u.beschlussNr)}:null);
  w.abrechnungen=liste(W.abrechnungen,a=>+a.jahr>1900&&+a.jahr<2200?{id:a.id,jahr:+a.jahr,ruecklageAnfang:zahl(a.ruecklageAnfang),kontoEnde:zahl(a.kontoEnde),verbindlichkeiten:zahl(a.verbindlichkeiten),
    heiz:(()=>{ const o={}; if(a.heiz&&typeof a.heiz==='object') Object.entries(a.heiz).forEach(([k,v])=>{ if(eids.has(k)&&typeof v==='number'&&isFinite(v)) o[k]=v; }); return o; })(),
    beschlossenAm:d(a.beschlossenAm),faellig:d(a.faellig),gebuchtAm:d(a.gebuchtAm),
    spitzen:(()=>{ const o={}; if(a.spitzen&&typeof a.spitzen==='object') Object.entries(a.spitzen).forEach(([k,v])=>{ if(eids.has(k)&&typeof v==='number'&&isFinite(v)) o[k]=v; }); return o; })()}:null);
  w.versammlungen=liste(W.versammlungen,v=>d(v.datum)?{id:v.id,datum:v.datum,uhrzeit:text(v.uhrzeit,10),ort:text(v.ort,200),art:v.art==='ausserordentlich'?'ausserordentlich':'ordentlich',einladungAm:d(v.einladungAm),
    leitung:text(v.leitung,120),protokoll:text(v.protokoll,120),notiz:text(v.notiz,5000),
    tops:liste(v.tops,t=>({id:t.id,titel:text(t.titel,300)||'Tagesordnungspunkt',antrag:text(t.antrag,5000),typ:t.typ==='info'?'info':'beschluss',mehrheit:MEHRHEITEN[t.mehrheit]?t.mehrheit:'einfach',
      stimmen:(()=>{ const o={}; if(t.stimmen&&typeof t.stimmen==='object') Object.entries(t.stimmen).forEach(([k,s])=>{ if(eids.has(k)&&['ja','nein','enthaltung'].includes(s)) o[k]=s; }); return o; })(),
      beschlussNr:zahl(t.beschlussNr),notiz:text(t.notiz,2000)}))}:null);
  w.beschluesse=liste(W.beschluesse,b=>+b.nr>0&&d(b.datum)?{id:b.id,nr:+b.nr,datum:b.datum,art:['versammlung','umlauf','urteil'].includes(b.art)?b.art:'versammlung',versammlungId:idOk(b.versammlungId),
    wortlaut:text(b.wortlaut,10000),ergebnis:b.ergebnis==='abgelehnt'?'abgelehnt':'angenommen',eingetragenAm:d(b.eingetragenAm),
    vermerke:(Array.isArray(b.vermerke)?b.vermerke:[]).filter(x=>x&&d(x.datum)).slice(0,50).map(x=>({datum:x.datum,text:text(x.text,1000)}))}:null);
  l.weg=w;
}

V.erweiterungRegistrieren(bereinigen);
const ImmoWeg={PRINZIPIEN,MEHRHEITEN,SCHLUESSEL,eigentuemerAm,personKey,meaGesamt,verteilen,planFuerJahr,einzelplaene,hausgeldPosten,hausgeldKonto,jahresabrechnung,einladungsfrist,abstimmung,naechsteBeschlussNr,fristen,bereinigen};
wurzel.ImmoWeg=ImmoWeg;
if(typeof module==='object'&&module.exports) module.exports=ImmoWeg;
})(typeof globalThis!=='undefined'?globalThis:this);
