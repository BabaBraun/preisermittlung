/* ImmoApp — Jahresbewertung nach dem Vordruck der Bank (ohne DOM, in Node testbar)
   Rechenweg wie die Excel-Vordrucke „Preiseinschätzung … Stichtag …“ der Bank, einschließlich ihrer Rundungen:
   - Boden: Fläche × Bodenrichtwert − Abschlag %, je Grundstücksanteil
   - Gebäude: Kostenkennwerte = Mittel zweier NHK-2010-Zeilen; NHK = Σ Wägungsanteil × Σ (Anteil je Stufe × Kostenkennwert);
     bereinigte NHK = RUNDEN(NHK − RUNDEN(NHK × Abschlag Bauweise)); Index 2010 = RUNDEN(Index × Faktor; 1);
     Alterswertminderung = RUNDEN((GND − RND) / GND × 100) %, RND = angepasste RND oder GND − Alter (Stichtagsjahr − Baujahr);
     Gebäudepreis = RUNDEN(NHK bereinigt × Index 2010 / 100 × (1 − Wertminderung)) €/m²; Wert = BGF × Preis
   - Substanz = Boden + Gebäude + Pauschalansätze + objektspezifische Merkmale + PV-Barwert
   - Ertrag je Gebäude: Jahresmiete − Bewirtschaftung % − Abschlag gewerbliche Vermietung − Boden × Liegenschaftszins,
     × Vervielfältiger (RUNDEN(Rentenbarwertfaktor; 2) bei der RND des Gebäudes), + Bodenanteil; bei mehreren Gebäuden wird
     der Boden nach dem Anteil an der Jahresmiete verteilt; + PV-Barwert
   - PV: Jahresertrag × €/kWh × (1 − Bewirtschaftung) × RUNDEN(Rentenbarwertfaktor(Zins; Restlaufzeit bis EEG-Ende); 2)
   - Ergebnis: Substanz und Ertrag gewichtet (Vordruck: 50 : 50); ohne Gebäude Bodenwert + Zu-/Abschläge.
   Die Vordrucke selbst (mit echten Zahlen) liegen nur auf dem Gerät, nicht im Repository. */
(function(wurzel){
'use strict';
const BPI=wurzel.ImmoBaupreisindex||(typeof require==='function'?require('./baupreisindex.js'):null);

const BAUTEILE=[['Außenwände',0.23],['Dach',0.15],['Fenster und Außentüren',0.11],['Innenwände und -türen',0.11],['Decken und Treppen',0.11],
  ['Fußböden',0.05],['Sanitäreinrichtung',0.09],['Heizung',0.09],['Sonstige technische Ausstattung',0.06]];
const MAX={boden:4,gebaeude:3,pauschal:10,objektspezifisch:10,mieten:40};

/* Excel RUNDEN: kaufmännisch, halbe Einheiten weg von null */
function runden(x,n){ const f=Math.pow(10,n||0), s=x<0?-1:1; return s*Math.round(Math.abs(x)*f+1e-9)/f||0; }
function rbf(zinsPct,n){ const p=zinsPct/100; if(!(n>0)) return 0; if(!(p>0)) return n; const q=Math.pow(1+p,n); return (q-1)/(q*p); }
function zahl(x){ return typeof x==='number'&&isFinite(x)?x:0; }
function datumOk(s){ return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z')); }
function tage(a,b){ return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5); }
function summe(a,f){ return (a||[]).reduce((s,x)=>s+zahl(f?f(x):x),0); }

function gebaeudeRechnen(g,jahr){
  const k1=g.kosten1||[], k2=g.kosten2||[], zwei=k2.some(x=>zahl(x)>0);
  const kk=[0,1,2,3,4].map(s=>zwei?(zahl(k1[s])+zahl(k2[s]))/2:zahl(k1[s]));
  const anteile=BAUTEILE.map((_,i)=>((g.anteile||[])[i]||[]).slice(0,5).map(zahl));
  const bauteile=BAUTEILE.map(([name,w],i)=>{ const a=anteile[i]; return {name,wichtung:w,summeAnteile:runden(summe(a),4),kosten:w*a.reduce((s,x,j)=>s+x*kk[j],0)}; });
  const nhk2010=summe(bauteile,b=>b.kosten);
  const nhkBer=runden(nhk2010+runden(-nhk2010*zahl(g.abschlagBauweise)/100));
  const index2010=runden(zahl(g.bpi)*zahl(g.bpiFaktor),1);
  const gnd=zahl(g.gnd), alter=jahr-zahl(g.baujahr), rndRech=gnd-alter, rnd=zahl(g.rnd)>0?zahl(g.rnd):rndRech;
  const wm=gnd>0?runden((gnd-rnd)/gnd*100):0;
  const nhkHeute=nhkBer/100*index2010;
  const preis=runden(nhkHeute-nhkHeute/100*wm);
  const wert=zahl(g.bgf)*preis;
  return {kostenkennwerte:kk,bauteile,nhk2010,nhkBer,index2010,alter,rndRech,rnd,wm,nhkHeute,preis,wert,
    anteileFehler:bauteile.filter(b=>b.summeAnteile!==0&&b.summeAnteile!==1).map(b=>b.name)};
}
function pvRechnen(pv,stichtag){
  if(!pv||!datumOk(pv.eegEnde)||!datumOk(stichtag)) return null;
  const rest=Math.max(0,tage(stichtag,pv.eegEnde)/365);
  const roh=zahl(pv.kwh)*zahl(pv.eurKwh), rein=roh-roh*zahl(pv.bwk)/100, vf=runden(rbf(zahl(pv.lz),rest),2);
  return {rest,roh,rein,vf,wert:rein*vf};
}
function rechnen(v){
  v=v||{};
  const stichtag=datumOk(v.stichtag)?v.stichtag:null, jahr=stichtag?+stichtag.slice(0,4):new Date().getFullYear();
  const bodenZeilen=(v.boden||[]).map(b=>{ const z=zahl(b.flaeche)*zahl(b.brw); return z-z*zahl(b.abschlag)/100; });
  const boden=summe(bodenZeilen);
  const geb=(v.gebaeude||[]).map(g=>gebaeudeRechnen(g,jahr));
  const pauschal=summe(v.pauschal,p=>p.betrag), objekt=summe(v.objektspezifisch,p=>p.betrag);
  const pv=pvRechnen(v.pv,stichtag), pvWert=pv?pv.wert:0;
  const r={stichtag,boden,bodenZeilen,gebaeude:geb,gebaeudeWert:summe(geb,g=>g.wert),pauschal,objekt,pv,pvWert,teile:[],substanz:null,ertrag:null,ergebnis:0};
  if(!geb.length){ r.ergebnis=boden+pauschal+objekt+pvWert; return r; }
  r.substanz=boden+r.gebaeudeWert+pauschal+objekt+pvWert;
  // Ertrag: Mieten je Gebäude
  const mieten=(v.mieten||[]).map(m=>({jahr:zahl(m.monat)*12,g:Math.min(Math.max(Math.round(zahl(m.gebaeude)),0),geb.length-1),abschlag:zahl(m.abschlag)}));
  const rohGesamt=summe(mieten,m=>m.jahr);
  const indizes=[...new Set(mieten.filter(m=>m.jahr>0).map(m=>m.g))].sort(); if(!indizes.length) indizes.push(0);
  const fest=typeof v.abschlagFest==='number'&&isFinite(v.abschlagFest)?v.abschlagFest:null;
  indizes.forEach((gi,k)=>{
    const roh=summe(mieten.filter(m=>m.g===gi),m=>m.jahr);
    const abschlag=fest!=null?(k===0?fest:0):runden(summe(mieten.filter(m=>m.g===gi),m=>m.jahr*m.abschlag/100));
    const bodenAnteil=indizes.length>1&&rohGesamt>0?boden*roh/rohGesamt:boden;
    const bew=roh*zahl(v.bwk)/100, rein=roh-bew-abschlag, bodenZins=bodenAnteil*zahl(v.lz)/100, gebRein=rein-bodenZins;
    const vf=runden(rbf(zahl(v.lz),geb[gi].rnd),2);
    r.teile.push({gebaeude:gi,roh,bew,abschlag,rein,bodenAnteil,bodenZins,gebRein,rnd:geb[gi].rnd,vf,wert:gebRein*vf});
  });
  r.ertrag=summe(r.teile,t=>t.wert+t.bodenAnteil)+pvWert;
  const g=typeof v.gewichtung==='number'&&v.gewichtung>=0&&v.gewichtung<=100?v.gewichtung:50;
  r.gewichtung=g;
  r.ergebnis=r.substanz*g/100+r.ertrag*(100-g)/100;
  return r;
}

/* ---------- Prüfen und Bereinigen (Laden, Import) ---------- */
function bereinigen(roh){
  if(!roh||typeof roh!=='object'||Array.isArray(roh)) return null;
  const t=(x,n)=>typeof x==='string'?x.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,n||200):'';
  const z=x=>typeof x==='number'&&isFinite(x)?x:null;
  const liste=(a,max,f)=>(Array.isArray(a)?a:[]).filter(x=>x&&typeof x==='object').slice(0,max).map(f);
  const fuenf=a=>[0,1,2,3,4].map(i=>z((a||[])[i])||0);
  return {version:1,stichtag:datumOk(roh.stichtag)?roh.stichtag:null,objekt:t(roh.objekt),
    boden:liste(roh.boden,MAX.boden,b=>({text:t(b.text,120),flaeche:z(b.flaeche),brw:z(b.brw),abschlag:z(b.abschlag)||0})),
    gebaeude:liste(roh.gebaeude,MAX.gebaeude,g=>({text:t(g.text,120),baujahr:z(g.baujahr),bgf:z(g.bgf),gnd:z(g.gnd),rnd:z(g.rnd),abschlagBauweise:z(g.abschlagBauweise)||0,
      bpiArt:BPI&&BPI.ARTEN[g.bpiArt]?g.bpiArt:'wohnen',bpiText:t(g.bpiText,120),bpi:z(g.bpi),bpiFaktor:z(g.bpiFaktor),
      kosten1:fuenf(g.kosten1),kosten2:fuenf(g.kosten2),anteile:BAUTEILE.map((_,i)=>fuenf((g.anteile||[])[i]))})),
    pauschal:liste(roh.pauschal,MAX.pauschal,p=>({text:t(p.text,160),betrag:z(p.betrag)||0})),
    objektspezifisch:liste(roh.objektspezifisch,MAX.objektspezifisch,p=>({text:t(p.text,160),betrag:z(p.betrag)||0})),
    pv:roh.pv&&typeof roh.pv==='object'?{kwp:z(roh.pv.kwp),kwh:z(roh.pv.kwh),eurKwh:z(roh.pv.eurKwh),bwk:z(roh.pv.bwk),lz:z(roh.pv.lz),
      inbetrieb:datumOk(roh.pv.inbetrieb)?roh.pv.inbetrieb:null,eegEnde:datumOk(roh.pv.eegEnde)?roh.pv.eegEnde:null}:null,
    mieten:liste(roh.mieten,MAX.mieten,m=>({text:t(m.text,120),lage:t(m.lage,40),flaeche:z(m.flaeche),monat:z(m.monat)||0,gebaeude:z(m.gebaeude)||0,abschlag:z(m.abschlag)||0,hinweis:t(m.hinweis,200)})),
    bwk:z(roh.bwk),lz:z(roh.lz),abschlagFest:z(roh.abschlagFest),gewichtung:z(roh.gewichtung)!=null?roh.gewichtung:50,
    hinweise:t(roh.hinweise,4000)};
}
/* Leerer Vordruck (ein Gebäude, NHK-Zeilen leer) */
function leer(stichtag){
  return bereinigen({stichtag,boden:[{text:'Grundstück',flaeche:0,brw:0,abschlag:0}],
    gebaeude:[{text:'Hauptgebäude',gnd:80,bpiArt:'wohnen',anteile:BAUTEILE.map(()=>[0,0,1,0,0])}],pauschal:[],objektspezifisch:[],mieten:[],bwk:20,lz:4,gewichtung:50});
}

/* Vorlagen für einen neuen Vordruck — Aufbau wie die Excel-Vordrucke der Bank; Flächen, Baujahr, Bodenrichtwert und
   Mieten trägt man selbst ein, alle Werte bleiben änderbar. Kostenkennwerte NHK 2010 je Standardstufe 1–5 (€/m² BGF):
   Stufen 3–5 amtlich (Anlage 4 ImmoWertV: Geschäftshäuser ohne Wohnungen 930/1.520/1.900, Wohnhäuser mit Mischnutzung
   860/1.085/1.375), Stufen 1–2 und das Nebengebäude wie im Vordruck der Bank. Gesamtnutzungsdauer wie im Vordruck der
   Bank (Prüfbericht: Anlage 1 ImmoWertV nennt für Bürogebäude und Banken 60 Jahre). Baupreisindex: amtlicher Wert
   Baden-Württemberg zum Stichtag. Anteile je Bauteil zunächst ganz in Stufe 3. */
const VORLAGEN={
  bank:{name:'Bankgebäude / Filiale',text:'Ein Gebäude mit Bank- oder Büroräumen (Eigennutzung mit fiktiver Miete), Außenstellplätze'},
  wgh:{name:'Wohn- und Geschäftshaus',text:'Laden, Bank oder Büro im Erdgeschoss, Wohnungen darüber'},
  bank_lager:{name:'Bankgebäude mit Nebengebäude',text:'Zwei Gebäude (z. B. Lager oder Scheune), je mit eigener Restnutzungsdauer'},
  grundstueck:{name:'Grundstück / Parkplatz',text:'Ohne Gebäude: Bodenwert, Abschlag, Außenanlagen'},
  leer:{name:'Leerer Vordruck',text:'Ein Gebäude ohne Vorgaben, alles selbst eintragen'}
};
const KK={geschaeft:[655,730,930,1520,1900],misch:[605,675,860,1085,1375],lager:[245,275,350,490,640]};
function vorlage(key,stichtag){
  if(!VORLAGEN[key]||key==='leer') return leer(stichtag);
  const geb=(text,art,kk,gnd)=>{ const g={text,baujahr:null,bgf:null,gnd,rnd:null,abschlagBauweise:0,bpiArt:art,kosten1:kk.slice(),kosten2:[0,0,0,0,0],anteile:BAUTEILE.map(()=>[0,0,1,0,0])};
    const w=BPI&&datumOk(stichtag)?BPI.wertFuer(art,stichtag):null;
    if(w){ g.bpi=w.wert; g.bpiFaktor=w.faktor; g.bpiText=w.name+' '+BPI.monatText(w.monat)+(w.vorlaeufig?' (vorläufig)':''); }
    return g; };
  const miete=(text,lage,gebaeude)=>({text,lage,flaeche:null,monat:0,gebaeude:gebaeude||0,abschlag:0});
  const v={stichtag,boden:[{text:'Grundstück',flaeche:null,brw:null,abschlag:0}],gebaeude:[],pauschal:[{text:'Außenanlagen',betrag:0},{text:'Außenstellplätze',betrag:0}],
    objektspezifisch:[],mieten:[],bwk:20,lz:4,gewichtung:50};
  if(key==='bank'||key==='bank_lager'){
    v.gebaeude.push(geb('Bankgebäude','buero',KK.geschaeft,80));
    v.mieten.push(miete('Bankräume (Eigennutzung, fiktiv)','EG'),miete('Außenstellplätze (fiktiv)','außen'));
  }
  if(key==='bank_lager'){ v.gebaeude.push(geb('Nebengebäude (Lager / Scheune)','gewerbe',KK.lager,60)); v.mieten.push(miete('Nebengebäude (fiktiv)','EG',1)); }
  if(key==='wgh'){
    v.gebaeude.push(geb('Wohn- und Geschäftshaus','wohnen',KK.misch,80));
    v.mieten.push(miete('Laden / Büro (vermietet)','EG'),miete('Wohnung (vermietet)','1. OG'),miete('Wohnung (vermietet)','DG'));
  }
  if(key==='grundstueck') v.pauschal=[{text:'Außenanlagen, Befestigung (Pflaster, Schotter)',betrag:0}];
  return bereinigen(v);
}

/* Fortschreibung auf einen neuen Stichtag: amtlicher Baupreisindex je Gebäude (Gebäudeart), angepasste RND um die
   vergangenen Jahre verringert (wenn gesetzt); PV über den Stichtag automatisch. Übriges bleibt und ist zu prüfen. */
function fortschreiben(v,stichtag,opt){
  opt=opt||{};
  if(!datumOk(stichtag)) throw new Error('Kein gültiger Stichtag');
  const n=bereinigen(JSON.parse(JSON.stringify(v||{}))), hinweise=[];
  const jahre=n.stichtag?(+stichtag.slice(0,4))-(+n.stichtag.slice(0,4)):0;
  n.stichtag=stichtag;
  n.gebaeude.forEach(g=>{
    const w=BPI?BPI.wertFuer(g.bpiArt,stichtag):null;
    if(w){ g.bpi=w.wert; g.bpiFaktor=w.faktor; g.bpiText=w.name+' '+BPI.monatText(w.monat)+(w.vorlaeufig?' (vorläufig)':''); }
    if(opt.rnd!==false&&jahre>0&&g.rnd>0){ const alt=g.rnd; g.rnd=Math.max(1,g.rnd-jahre); hinweise.push((g.text||'Gebäude')+': angepasste RND '+alt+' → '+g.rnd+' Jahre'); }
  });
  if(n.gebaeude.length){ const w=BPI&&BPI.wertFuer(n.gebaeude[0].bpiArt,stichtag);
    if(w) hinweise.push('Baupreisindex '+BPI.monatText(w.monat)+(w.vorlaeufig?' — vorläufig, Quartalswert zum Stichtag nachtragen':'')); }
  if(n.abschlagFest!=null) hinweise.push('Fester Abschlag für gewerbliche Vermietung ('+String(n.abschlagFest).replace('.',',')+' €) prüfen');
  hinweise.push('Bodenrichtwert prüfen (BORIS-BW)','Mieten prüfen');
  return {vordruck:n,hinweise,jahre};
}

const ImmoJahresbewertung={BAUTEILE,MAX,VORLAGEN,runden,rbf,rechnen,gebaeudeRechnen,pvRechnen,bereinigen,leer,vorlage,fortschreiben};
wurzel.ImmoJahresbewertung=ImmoJahresbewertung;
if(typeof module==='object'&&module.exports) module.exports=ImmoJahresbewertung;
})(typeof globalThis!=='undefined'?globalThis:this);
