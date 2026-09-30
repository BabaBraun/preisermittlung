/* ImmoApp — Liegenschaftsverwaltung: Betriebs- und Heizkostenabrechnung (ohne DOM, in Node testbar)
   Grundlagen:
   - Betriebskostenarten nach § 2 BetrKV (Nr. 1–17); nur vereinbarte Kosten sind umlagefähig.
   - Umlage nach Wohnfläche, wenn nichts anderes vereinbart ist (§ 556a Abs. 1 BGB); zeitanteilig bei
     Mieterwechsel; Kosten leerstehender Einheiten trägt der Vermieter.
   - Heizung und Warmwasser nach HeizkostenV: 50–70 % nach Verbrauch, der Rest nach Fläche (§§ 7, 8);
     verbundene Anlagen: Warmwasseranteil nach § 9 Abs. 2 (Q = 2,5 · V · (tw − 10) bzw. Q = 32 · A, bei Erdgas
     brennwertbezogen × 1,11); Nutzerwechsel ohne Zwischenablesung nach § 9b Abs. 3 (Heizung nach
     Gradtagszahlen, Warmwasser zeitanteilig); Kürzungsrecht 15 % ohne Verbrauchserfassung (§ 12 Abs. 1).
   - CO2-Kosten nach dem Stufenmodell des CO2KostAufG (Anlage zu § 5; Nichtwohngebäude 50 %).
   - Abrechnungsfrist: zwölf Monate nach Ende des Abrechnungszeitraums (§ 556 Abs. 3 Satz 2 BGB).
   - Anpassung der Vorauszahlungen auf eine angemessene Höhe (§ 560 Abs. 4 BGB).
   - Arbeitskosten für haushaltsnahe Dienstleistungen und Handwerkerleistungen (§ 35a EStG) je Mieter.
   Beträge je Mieter und Position werden auf Cent gerundet; die Rundungsdifferenz wird ausgewiesen. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const {r2,tagNr,isoTag,datumGueltig,monatVon,tageImMonat,monatsErster,monatsLetzter,plusMonate,monatsliste}=V;

const KATEGORIEN=[
  {key:'grundsteuer',nr:1,name:'Grundsteuer',schluessel:'flaeche'},
  {key:'wasser',nr:2,name:'Wasserversorgung',schluessel:'personen'},
  {key:'entwaesserung',nr:3,name:'Entwässerung',schluessel:'personen'},
  {key:'heizung',nr:4,name:'Heizung',heiz:true},
  {key:'warmwasser',nr:5,name:'Warmwasserversorgung',heiz:true},
  {key:'heizung_ww',nr:6,name:'Verbundene Heizungs- und Warmwasseranlage',heiz:true},
  {key:'aufzug',nr:7,name:'Aufzug',schluessel:'flaeche'},
  {key:'strassenreinigung',nr:8,name:'Straßenreinigung',schluessel:'flaeche'},
  {key:'muell',nr:8,name:'Müllbeseitigung',schluessel:'personen'},
  {key:'gebaeudereinigung',nr:9,name:'Gebäudereinigung und Ungezieferbekämpfung',schluessel:'flaeche'},
  {key:'gartenpflege',nr:10,name:'Gartenpflege',schluessel:'flaeche'},
  {key:'beleuchtung',nr:11,name:'Beleuchtung (Allgemeinstrom)',schluessel:'flaeche'},
  {key:'schornstein',nr:12,name:'Schornsteinreinigung',schluessel:'flaeche'},
  {key:'versicherung',nr:13,name:'Sach- und Haftpflichtversicherung',schluessel:'flaeche'},
  {key:'hauswart',nr:14,name:'Hauswart',schluessel:'flaeche'},
  {key:'antenne',nr:15,name:'Antenne / Breitbandnetz',schluessel:'einheiten'},
  {key:'waeschepflege',nr:16,name:'Wäschepflege',schluessel:'personen'},
  {key:'sonstige',nr:17,name:'Sonstige Betriebskosten',schluessel:'flaeche'},
  {key:'verwaltung',nr:0,name:'Verwaltungskosten',umlage:false},
  {key:'instandhaltung',nr:0,name:'Instandhaltung und Reparaturen',umlage:false},
  {key:'nicht_umlagefaehig',nr:0,name:'Sonstige nicht umlagefähige Kosten',umlage:false}
];
const KAT=Object.fromEntries(KATEGORIEN.map(k=>[k.key,k]));
const SCHLUESSEL={flaeche:'Wohn-/Nutzfläche',einheiten:'Einheiten',personen:'Personen',mea:'Miteigentumsanteile',verbrauch:'Verbrauch',direkt:'direkt zugeordnet'};
const KREISE={alle:'alle Einheiten (ohne Stellplätze/Garagen)',wohnen:'nur Wohnungen',gewerbe:'nur Gewerbe',auswahl:'Auswahl'};
/* Gradtagszahlen in Promille je Monat (übliche Tabelle nach VDI 2067; Juni bis August zusammen 40) */
const GRADTAGE={1:170,2:150,3:130,4:80,5:40,6:40/3,7:40/3,8:40/3,9:30,10:80,11:120,12:160};
/* CO2KostAufG, Anlage: Anteile Mieter / Vermieter nach kg CO2 je m² Wohnfläche und Jahr */
const CO2_STUFEN=[[12,100,0],[17,90,10],[22,80,20],[27,70,30],[32,60,40],[37,50,50],[42,40,60],[47,30,70],[52,20,80],[Infinity,5,95]];

function co2Stufe(kgM2a){
  for(let i=0;i<CO2_STUFEN.length;i++) if(kgM2a<CO2_STUFEN[i][0]) return {stufe:i+1,mieter:CO2_STUFEN[i][1],vermieter:CO2_STUFEN[i][2]};
  return {stufe:10,mieter:5,vermieter:95};
}
/* Warmwasseranteil verbundener Anlagen (§ 9 Abs. 2 HeizkostenV) */
function warmwasserAnteil(h){
  h=h||{};
  if(h.wwModus==='prozent') return {anteil:Math.max(0,Math.min(1,(+h.wwProzent||0)/100)),q:null};
  const f=h.brennwert?1.11:1, e=+h.energieKwh||0;
  let q=null;
  if(h.wwModus==='pauschal') q=32*(+h.wwFlaeche||0)*f;
  else q=2.5*(+h.wwVolumen||0)*((h.wwTemp!=null&&isFinite(h.wwTemp)?+h.wwTemp:60)-10)*f;
  return {anteil:e>0?Math.max(0,Math.min(1,q/e)):0,q};
}
function frist(bis){ return plusMonate(bis,12); }

/* Kosten einer Liegenschaft im Zeitraum; mit Leistungszeitraum (von/bis) anteilig abgegrenzt */
function kostenImZeitraum(l,von,bis){
  return (l.kosten||[]).map(k=>{
    let betrag=0;
    if(datumGueltig(k.von)&&datumGueltig(k.bis)&&k.bis>=k.von){ const len=tagNr(k.bis)-tagNr(k.von)+1; betrag=(+k.betrag||0)*V.ueberlappung(von,bis,k.von,k.bis)/len; }
    else if(datumGueltig(k.datum)&&k.datum>=von&&k.datum<=bis) betrag=+k.betrag||0;
    return {k,betrag};
  }).filter(x=>x.betrag!==0);
}
/* Belegung jeder Einheit im Zeitraum als lückenlose Abschnitte (Vertrag oder Leerstand) */
function belegung(l,von,bis){
  const a=tagNr(von), b=tagNr(bis), aus={};
  (l.einheiten||[]).forEach(e=>{
    const vv=V.vertraegeDerEinheit(l,e.id).filter(v=>V.ueberlappung(von,bis,v.beginn,v.ende||null)>0).sort((x,y)=>x.beginn<y.beginn?-1:1);
    const seg=[]; let t=a;
    vv.forEach(v=>{ const s=Math.max(a,tagNr(v.beginn)), en=Math.min(b,v.ende?tagNr(v.ende):b);
      if(s>t) seg.push({vertrag:null,a:t,b:s-1}); if(en>=s){ seg.push({vertrag:v,a:Math.max(s,t),b:en}); t=en+1; } });
    if(t<=b) seg.push({vertrag:null,a:t,b});
    aus[e.id]=seg.filter(s=>s.b>=s.a).map(s=>Object.assign(s,{tage:s.b-s.a+1}));
  });
  return aus;
}
function gradtage(a,b){ let g=0; for(let n=a;n<=b;n++){ const iso=isoTag(n), m=+iso.slice(5,7); g+=GRADTAGE[m]/tageImMonat(iso.slice(0,7)); } return g; }
function imKreis(e,k){
  const kreis=k.kreis||'alle';
  if(kreis==='wohnen') return e.art==='wohnung';
  if(kreis==='gewerbe') return e.art==='gewerbe';
  if(kreis==='auswahl') return (k.einheitIds||[]).includes(e.id);
  return !['stellplatz','garage'].includes(e.art);
}

/* Die Abrechnung. cfg: {von, bis, vzBasis:'soll'|'ist', stichtag, leerPersonen, verbrauch:{kostenId:{einheitId:wert}},
   heiz:{modus:'ohne'|'verteilen'|'extern', pvHeiz, pvWW, wwModus, energieKwh, wwVolumen, wwTemp, wwProzent, brennwert,
         zeitanteilig, einheiten:{einheitId:{heiz, ww}}, extern:{vertragId:betrag}},
   co2:{aktiv, kosten, kg, flaeche, nichtwohn}} */
function abrechnen(l,cfg){
  cfg=cfg||{};
  const von=cfg.von, bis=cfg.bis, hinweise=[], fehler=[];
  if(!datumGueltig(von)||!datumGueltig(bis)||bis<von) return {ok:false,fehler:['Abrechnungszeitraum ungültig']};
  const tageZ=tagNr(bis)-tagNr(von)+1;
  if(tageZ>366) fehler.push('Der Abrechnungszeitraum darf höchstens zwölf Monate umfassen (§ 556 Abs. 3 Satz 1 BGB).');
  const E=l.einheiten||[], bel=belegung(l,von,bis), leerP=cfg.leerPersonen!=null?+cfg.leerPersonen:1;
  const vertraege={}, vermieter={leerstand:0,nicht:0,co2:0,heizLeer:0}, positionen=[];
  const plus=(vid,feld,betrag)=>{ if(!vertraege[vid]) vertraege[vid]={kosten:0,heiz:0,ww:0,co2Anteil:0,co2Erstattung:0,p35a:[],positionen:{}}; vertraege[vid][feld]+=betrag; };
  const eName=id=>(E.find(e=>e.id===id)||{}).nr||'?';
  const fehlt=new Set();

  /* ---- Betriebskosten ohne Heizung ---- */
  const kosten=kostenImZeitraum(l,von,bis);
  kosten.forEach(({k,betrag})=>{
    const kat=KAT[k.kategorie]||KAT.sonstige;
    if(kat.heiz) return;
    if(kat.umlage===false||k.umlagefaehig===false){ vermieter.nicht+=betrag; positionen.push({id:k.id,kategorie:k.kategorie,text:k.text||kat.name,gesamt:r2(betrag),umlage:false}); return; }
    const schl=k.schluessel||kat.schluessel||'flaeche';
    const gewichte=[];   // {vertragId|null, gewicht}
    E.forEach(e=>{
      if(!imKreis(e,k)&&schl!=='direkt') return;
      if(schl==='direkt'&&e.id!==k.direktEinheitId) return;
      const seg=bel[e.id]||[];
      if(schl==='verbrauch'){
        const w=((cfg.verbrauch||{})[k.id]||{})[e.id];
        if(!(w>=0)){ fehlt.add(kat.name+': Verbrauch '+eName(e.id)); return; }
        seg.forEach(s=>gewichte.push({v:s.vertrag,g:w*s.tage/tageZ,e,t:s.tage}));
        return;
      }
      seg.forEach(s=>{
        let g;
        if(schl==='flaeche'){ if(!(+e.flaeche>0)){ fehlt.add('Fläche '+eName(e.id)); return; } g=+e.flaeche*s.tage; }
        else if(schl==='mea'){ if(!(+e.mea>0)){ fehlt.add('MEA '+eName(e.id)); return; } g=+e.mea*s.tage; }
        else if(schl==='personen'){ let p=s.vertrag?s.vertrag.personen:leerP; if(s.vertrag&&!(p>0)){ fehlt.add('Personen '+eName(e.id)); p=1; } g=(+p||0)*s.tage; }
        else g=s.tage;   // einheiten, direkt
        gewichte.push({v:s.vertrag,g,e,t:s.tage});
      });
    });
    const summe=gewichte.reduce((s,x)=>s+x.g,0), anteile={}; let leer=0;
    if(summe<=0){ fehler.push(kat.name+': keine Verteilungsgrundlage (Schlüssel '+(SCHLUESSEL[schl]||schl)+')'); return; }
    gewichte.forEach(x=>{ const b=betrag*x.g/summe; if(x.v) anteile[x.v.id]=(anteile[x.v.id]||0)+b; else leer+=b; });
    const lohn=+k.lohn35a||0, lohnImZ=lohn&&+k.betrag?lohn*betrag/(+k.betrag):0;
    /* Angaben für die Abrechnung: Gesamtmenge des Schlüssels und Anteil des Mieters (Menge, Tage) */
    const einh=[...new Set(gewichte.map(x=>x.e))], proTag=schl==='personen'||schl==='verbrauch';
    const basisGesamt=schl==='flaeche'?einh.reduce((s,e)=>s+(+e.flaeche||0),0):schl==='mea'?einh.reduce((s,e)=>s+(+e.mea||0),0)
      :schl==='personen'?summe:schl==='verbrauch'?einh.reduce((s,e)=>s+(+((cfg.verbrauch||{})[k.id]||{})[e.id]||0),0):einh.length;
    const basisV={};
    gewichte.forEach(x=>{ if(!x.v) return; const b=basisV[x.v.id]||(basisV[x.v.id]={wert:0,tage:0});
      b.tage+=x.t; b.wert=proTag?b.wert+x.g:(schl==='flaeche'?+x.e.flaeche:schl==='mea'?+x.e.mea:1); });
    Object.entries(anteile).forEach(([vid,b])=>{ const rb=r2(b); plus(vid,'kosten',rb); vertraege[vid].positionen[k.id]=rb;
      vertraege[vid].basis=vertraege[vid].basis||{}; vertraege[vid].basis[k.id]={wert:Math.round(basisV[vid].wert*1000)/1000,tage:basisV[vid].tage};
      if(lohnImZ) vertraege[vid].p35a.push({text:k.text||kat.name,art:k.art35a||'haushaltsnah',betrag:r2(lohnImZ*b/betrag)}); });
    vermieter.leerstand+=leer;
    positionen.push({id:k.id,kategorie:k.kategorie,nr:kat.nr,text:k.text||kat.name,gesamt:r2(betrag),schluessel:schl,summeSchluessel:summe,umlage:true,leer:r2(leer),
      basisGesamt:Math.round(basisGesamt*1000)/1000,basisEinheit:{flaeche:'m²',mea:'MEA',personen:'Personentage',verbrauch:'Verbrauch',einheiten:'Einheiten',direkt:'Einheit'}[schl]||'',
      abgegrenzt:!!(k.von&&k.bis),belegGesamt:+k.betrag||0,zeitraum:k.von&&k.bis?[k.von,k.bis]:null});
  });

  /* ---- Heizung und Warmwasser ---- */
  const h=cfg.heiz||{modus:'ohne'}, heizKosten=kosten.filter(x=>(KAT[x.k.kategorie]||{}).heiz);
  const sum=kat=>heizKosten.filter(x=>x.k.kategorie===kat).reduce((s,x)=>s+x.betrag,0);
  let HW={H:0,W:0,wwAnteil:null,q:null,modus:h.modus||'ohne'};
  if(heizKosten.length&&(h.modus||'ohne')==='ohne') fehler.push('Es sind Heizkosten erfasst — bitte im Abschnitt „Heizung und Warmwasser“ die Verteilung wählen.');
  if(h.modus==='verteilen'||h.modus==='extern'){
    const ww=sum('heizung_ww')>0?warmwasserAnteil(Object.assign({wwFlaeche:E.filter(e=>['wohnung','gewerbe'].includes(e.art)).reduce((s,e)=>s+(+e.flaeche||0),0)},h)):{anteil:0,q:null};
    if(sum('heizung_ww')>0&&!(+h.energieKwh>0)&&h.wwModus!=='prozent') fehler.push('Verbundene Anlage: Energieverbrauch in kWh fehlt (§ 9 Abs. 2 HeizkostenV).');
    HW.H=sum('heizung')+sum('heizung_ww')*(1-ww.anteil); HW.W=sum('warmwasser')+sum('heizung_ww')*ww.anteil; HW.wwAnteil=sum('heizung_ww')>0?ww.anteil:null; HW.q=ww.q;
  }
  if(h.modus==='verteilen'&&(HW.H+HW.W)>0){
    const pvH=h.pvHeiz!=null?+h.pvHeiz:70, pvW=h.pvWW!=null?+h.pvWW:70;
    [pvH,pvW].forEach(p=>{ if(p<50||p>70) fehler.push('Verbrauchsanteil '+p+' %: nach §§ 7, 8 HeizkostenV sind 50 bis 70 % zulässig.'); });
    const beheizt=E.filter(e=>['wohnung','gewerbe'].includes(e.art)&&+e.flaeche>0), EH=h.einheiten||{};
    const flaeche=beheizt.reduce((s,e)=>s+(+e.flaeche),0);
    const vH=beheizt.reduce((s,e)=>s+(+((EH[e.id]||{}).heiz)||0),0), vW=beheizt.reduce((s,e)=>s+(+((EH[e.id]||{}).ww)||0),0);
    if(!(vH>0)&&HW.H>0) hinweise.push('Ohne erfassten Heizverbrauch wird die Heizung nur nach Fläche verteilt — der Mieter darf dann um 15 % kürzen (§ 12 Abs. 1 HeizkostenV).');
    if(!(vW>0)&&HW.W>0) hinweise.push('Ohne erfassten Warmwasserverbrauch wird das Warmwasser nur nach Fläche verteilt — Kürzungsrecht 15 % (§ 12 Abs. 1 HeizkostenV).');
    beheizt.forEach(e=>{
      const f=+e.flaeche/flaeche, x=EH[e.id]||{};
      const heizE=HW.H*(vH>0?(1-pvH/100)*f+pvH/100*(+x.heiz||0)/vH:f);
      const wwE=HW.W*(vW>0?(1-pvW/100)*f+pvW/100*(+x.ww||0)/vW:f);
      const seg=bel[e.id]||[], gGes=seg.reduce((s,t)=>s+(h.zeitanteilig?t.tage:gradtage(t.a,t.b)),0), tGes=seg.reduce((s,t)=>s+t.tage,0);
      seg.forEach(t=>{ const hA=heizE*(h.zeitanteilig?t.tage:gradtage(t.a,t.b))/gGes, wA=wwE*t.tage/tGes;
        if(t.vertrag){ plus(t.vertrag.id,'heiz',hA); plus(t.vertrag.id,'ww',wA); } else vermieter.heizLeer+=hA+wA; });
      if(seg.filter(t=>t.vertrag).length>1||(seg.length>1&&seg.some(t=>!t.vertrag))) hinweise.push('Einheit '+(e.nr||'')+': Nutzerwechsel ohne Zwischenablesung — Heizung nach Gradtagszahlen, Warmwasser zeitanteilig verteilt (§ 9b Abs. 3 HeizkostenV).');
    });
  } else if(h.modus==='extern'){
    const ex=h.extern||{}; let s=0;
    Object.entries(ex).forEach(([vid,b])=>{ if(isFinite(+b)&&(l.vertraege||[]).some(v=>v.id===vid)){ plus(vid,'heiz',+b); s+=+b; } });
    vermieter.heizLeer=(HW.H+HW.W)-s;
    if(vermieter.heizLeer<-0.005) fehler.push('Die übernommenen Heizkostenanteile übersteigen die erfassten Heizkosten um '+V.eur(-vermieter.heizLeer)+'.');
  }
  /* ---- CO2-Kosten ---- */
  const c=cfg.co2||{}; let co2=null;
  if(c.aktiv&&(+c.kosten>0)){
    const fl=+c.flaeche>0?+c.flaeche:E.filter(e=>e.art==='wohnung').reduce((s,e)=>s+(+e.flaeche||0),0);
    const kgM2a=fl>0?(+c.kg||0)/fl*365/tageZ:0, st=co2Stufe(kgM2a), pV=c.nichtwohn?50:st.vermieter;
    const basis=HW.H+HW.W;
    co2={kosten:r2(+c.kosten),kg:+c.kg||0,flaeche:fl,kgM2a:Math.round(kgM2a*100)/100,stufe:c.nichtwohn?null:st.stufe,mieterProzent:100-pV,vermieterProzent:pV,nichtwohn:!!c.nichtwohn};
    if(basis>0) Object.keys(vertraege).forEach(vid=>{ const t=vertraege[vid], anteil=(t.heiz+t.ww)/basis*(+c.kosten);
      t.co2Anteil=r2(anteil); t.co2Erstattung=r2(anteil*pV/100); vermieter.co2+=t.co2Erstattung; });
    if(!(fl>0)) fehler.push('CO2-Aufteilung: Wohnfläche fehlt.');
  }
  if(fehlt.size) fehler.push('Es fehlen Angaben: '+[...fehlt].join(', ')+'.');

  /* ---- je Vertrag: Vorauszahlungen, Ergebnis, Anpassung ---- */
  const stichtag=cfg.stichtag||bis, ergebnisse=[];
  (l.vertraege||[]).forEach(v=>{
    const tageV=V.ueberlappung(von,bis,v.beginn,v.ende||null); if(!tageV) return;
    const t=vertraege[v.id]||{kosten:0,heiz:0,ww:0,co2Anteil:0,co2Erstattung:0,p35a:[],positionen:{}};
    let vzNk=0, vzHk=0;
    const op=cfg.vzBasis==='ist'?V.offenePosten(v,l.zahlungen,stichtag,{}):null;
    V.sollstellung(v,bis).filter(p=>p.art==='miete').forEach(p=>{
      const ma=p.monat, a=monatsErster(ma)<v.beginn?v.beginn:monatsErster(ma), e=v.ende&&v.ende<monatsLetzter(ma)?v.ende:monatsLetzter(ma);
      const aktiv=tagNr(e)-tagNr(a)+1, drin=V.ueberlappung(von,bis,a,e); if(!drin||!aktiv) return;
      let f=drin/aktiv;
      if(op){ const q=op.posten.find(x=>x.id===p.id); f*=q&&q.betrag>0?q.bezahlt/q.betrag:0; }
      vzNk+=p.teile.nk*f; vzHk+=p.teile.hk*f;
    });
    const kostenV=r2(t.kosten), heizV=r2(t.heiz+t.ww), co2V=r2(t.co2Erstattung), vz=r2(r2(vzNk)+r2(vzHk));
    const saldo=r2(kostenV+heizV-co2V-vz);
    const laeuft=!v.ende||v.ende>bis;
    const jahr=x=>x/tageV*365/12;
    ergebnisse.push({vertragId:v.id,einheitId:v.einheitId,tage:tageV,basis:t.basis||{},von:v.beginn>von?v.beginn:von,bis:v.ende&&v.ende<bis?v.ende:bis,
      kosten:kostenV,heizung:r2(t.heiz),warmwasser:r2(t.ww),heiz:heizV,co2Anteil:t.co2Anteil,co2Erstattung:co2V,vorauszahlungNk:r2(vzNk),vorauszahlungHk:r2(vzHk),vorauszahlung:vz,
      saldo,positionen:t.positionen,p35a:t.p35a,
      neueVz:laeuft?{nk:Math.ceil(jahr(kostenV)-1e-9),hk:Math.ceil(jahr(heizV-co2V)-1e-9)}:null});
  });
  const summeKosten=positionen.filter(p=>p.umlage).reduce((s,p)=>s+p.gesamt,0)+HW.H+HW.W;
  const verteilt=ergebnisse.reduce((s,x)=>s+x.kosten+x.heiz,0)+vermieter.leerstand+vermieter.heizLeer;
  return {ok:!fehler.length,fehler,hinweise:[...new Set(hinweise)],von,bis,tage:tageZ,frist:frist(bis),positionen,
    heiz:{modus:HW.modus,heizung:r2(HW.H),warmwasser:r2(HW.W),wwAnteil:HW.wwAnteil,q:HW.q,leerstand:r2(vermieter.heizLeer)},co2,ergebnisse,
    vermieter:{leerstand:r2(vermieter.leerstand+vermieter.heizLeer),nichtUmlagefaehig:r2(vermieter.nicht),co2:r2(vermieter.co2)},
    pruefung:{umlagefaehig:r2(summeKosten),verteilt:r2(verteilt),rundung:r2(summeKosten-verteilt)}};
}

/* Offene Abrechnungen als Fristen: jedes abgelaufene Kalenderjahr mit Mietverhältnis, für das noch keine
   Abrechnung als zugestellt vermerkt ist: ab 180 Tagen vor Fristablauf, danach als überfällig */
function fristen(l,stichtag,horizont){
  const aus=[], jahre=new Set(), erledigt=new Set((l.nkAbrechnungen||[]).filter(a=>a.versandtAm).map(a=>a.von+'|'+a.bis));
  (l.vertraege||[]).forEach(v=>{ if(!datumGueltig(v.beginn)) return; for(let j=+v.beginn.slice(0,4);j<=+stichtag.slice(0,4);j++){ if(!v.ende||+v.ende.slice(0,4)>=j) jahre.add(j); } });
  [...jahre].sort().forEach(j=>{
    const von=j+'-01-01', bis=j+'-12-31', f=frist(bis);
    if(bis>=stichtag||erledigt.has(von+'|'+bis)) return;
    if(tagNr(f)-tagNr(stichtag)>Math.max(180,horizont||0)) return;
    if(tagNr(stichtag)-tagNr(f)>400) return;   // lange verjährt: nicht mehr als Aufgabe zeigen
    aus.push({datum:f,art:'nk_frist',jahr:j,titel:'Betriebskostenabrechnung '+j+' zustellen',text:'Frist: '+V.datumDE(f)+' (§ 556 Abs. 3 BGB) — danach keine Nachforderung mehr',liegenschaftId:l.id,liegenschaft:l.name||'',faellig:f<=stichtag,dringend:f<stichtag});
  });
  return aus;
}

/* Bereinigung der neuen Felder (Kosten und gespeicherte Abrechnungen) — wird von ImmoVerwaltung.bereinigen genutzt */
function bereinigen(roh,l,zaehler,hilfen){
  const {text,zahl,liste,ID}=hilfen, eids=new Set(l.einheiten.map(e=>e.id)), vids=new Set(l.vertraege.map(v=>v.id));
  l.kosten=liste(roh.kosten,k=>{
    if(!KAT[k.kategorie]||typeof k.betrag!=='number'||!isFinite(k.betrag)) return null;
    const o={id:k.id,kategorie:k.kategorie,betrag:k.betrag,datum:datumGueltig(k.datum)?k.datum:null,von:datumGueltig(k.von)?k.von:null,bis:datumGueltig(k.bis)?k.bis:null,
      text:text(k.text,300),beleg:text(k.beleg,80),schluessel:SCHLUESSEL[k.schluessel]?k.schluessel:null,kreis:KREISE[k.kreis]?k.kreis:'alle',
      einheitIds:(Array.isArray(k.einheitIds)?k.einheitIds:[]).filter(x=>eids.has(x)),direktEinheitId:eids.has(k.direktEinheitId)?k.direktEinheitId:null,
      lohn35a:zahl(k.lohn35a),art35a:['haushaltsnah','handwerker'].includes(k.art35a)?k.art35a:null,umlagefaehig:k.umlagefaehig===false?false:undefined,vorgangId:typeof k.vorgangId==='string'&&ID.test(k.vorgangId)?k.vorgangId:null};
    if(!o.datum&&!(o.von&&o.bis)) return null;
    return o;
  });
  const kids=new Set(l.kosten.map(k=>k.id));
  const zahlenMap=(m,schl)=>{ const aus={}; if(m&&typeof m==='object') Object.entries(m).forEach(([k,v])=>{ if(schl.has(k)&&typeof v==='number'&&isFinite(v)) aus[k]=v; }); return aus; };
  l.nkAbrechnungen=liste(roh.nkAbrechnungen,a=>{
    if(!datumGueltig(a.von)||!datumGueltig(a.bis)) return null;
    const h=a.heiz&&typeof a.heiz==='object'?a.heiz:{}, c=a.co2&&typeof a.co2==='object'?a.co2:{}, ein={};
    if(h.einheiten&&typeof h.einheiten==='object') Object.entries(h.einheiten).forEach(([e,x])=>{ if(eids.has(e)&&x&&typeof x==='object') ein[e]={heiz:zahl(x.heiz),ww:zahl(x.ww)}; });
    const verbr={}; if(a.verbrauch&&typeof a.verbrauch==='object') Object.entries(a.verbrauch).forEach(([k,m])=>{ if(kids.has(k)) verbr[k]=zahlenMap(m,eids); });
    return {id:a.id,von:a.von,bis:a.bis,vzBasis:a.vzBasis==='ist'?'ist':'soll',leerPersonen:zahl(a.leerPersonen),
      heiz:{modus:['ohne','verteilen','extern'].includes(h.modus)?h.modus:'ohne',pvHeiz:zahl(h.pvHeiz),pvWW:zahl(h.pvWW),wwModus:['messung','pauschal','prozent'].includes(h.wwModus)?h.wwModus:'messung',
        energieKwh:zahl(h.energieKwh),wwVolumen:zahl(h.wwVolumen),wwTemp:zahl(h.wwTemp),wwProzent:zahl(h.wwProzent),brennwert:h.brennwert===true,zeitanteilig:h.zeitanteilig===true,
        einheiten:ein,extern:zahlenMap(h.extern,vids)},
      co2:{aktiv:c.aktiv===true,kosten:zahl(c.kosten),kg:zahl(c.kg),flaeche:zahl(c.flaeche),nichtwohn:c.nichtwohn===true},
      verbrauch:verbr,versandtAm:datumGueltig(a.versandtAm)?a.versandtAm:null,gebuchtAm:datumGueltig(a.gebuchtAm)?a.gebuchtAm:null};
  });
}

V.erweiterungRegistrieren(bereinigen);
const ImmoNebenkosten={KATEGORIEN,KAT,SCHLUESSEL,KREISE,GRADTAGE,CO2_STUFEN,co2Stufe,warmwasserAnteil,frist,kostenImZeitraum,belegung,abrechnen,fristen,bereinigen};
wurzel.ImmoNebenkosten=ImmoNebenkosten;
if(typeof module==='object'&&module.exports) module.exports=ImmoNebenkosten;
})(typeof globalThis!=='undefined'?globalThis:this);
