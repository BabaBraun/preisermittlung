/* ImmoApp — Baupreisindex Baden-Württemberg (ohne DOM, in Node testbar)
   Quelle: Statistisches Landesamt Baden-Württemberg, Statistischer Bericht M I 4 – vj 2/26 „Preisindex für Bauwerke in
   Baden-Württemberg im Mai 2026“ (erschienen 09.07.2026), Tabellen 2 (Jahresdurchschnitte) und 3 (Quartalsergebnisse),
   Basis 2021 = 100, einschließlich Mehrwertsteuer, Bauleistungen am Bauwerk.
   Die NHK 2010 beziehen sich auf das Jahr 2010. Umrechnung: Index (2021 = 100) × 100 / Jahresdurchschnitt 2010
   (Wohngebäude 70,6 → 1,4164; Bürogebäude 69,1 → 1,4472; gewerbliche Betriebsgebäude 69,6 → 1,4368).
   Neuere Quartale bitte nachtragen (QUARTALE, STAND) und den Test tests/unit/baupreisindex.test.mjs ergänzen. */
(function(wurzel){
'use strict';

const QUELLE='Statistisches Landesamt Baden-Württemberg, Preisindex für Bauwerke (2021 = 100)';
const STAND='2026-05';
const ARTEN={wohnen:{name:'Wohngebäude',i:0},buero:{name:'Bürogebäude',i:1},gewerbe:{name:'Gewerbliche Betriebsgebäude',i:2}};
/* Jahresdurchschnitte: Wohngebäude, Bürogebäude, gewerbliche Betriebsgebäude */
const JAHRE={2010:[70.6,69.1,69.6],2011:[72.7,71.3,72.2],2012:[74.5,73.0,74.0],2013:[75.9,74.4,75.5],2014:[77.4,76.2,77.3],
  2015:[79.0,78.0,78.9],2016:[80.9,79.9,80.6],2017:[83.4,82.7,83.5],2018:[87.4,86.7,87.3],2019:[90.7,90.1,90.7],2020:[91.7,91.3,91.9],
  2021:[100,100,100],2022:[114.4,115.4,115.0],2023:[122.8,124.3,123.7],2024:[126.9,129.4,127.8],2025:[131.2,134.5,132.4]};
/* Quartalsergebnisse (Berichtsmonate Februar, Mai, August, November) */
const QUARTALE=[
  ['2016-02',80.1,79.0,79.7],['2016-05',80.8,79.8,80.4],['2016-08',81.2,80.3,81.0],['2016-11',81.4,80.3,81.1],
  ['2017-02',82.5,81.7,82.5],['2017-05',83.2,82.5,83.3],['2017-08',83.6,82.9,83.7],['2017-11',84.3,83.7,84.5],
  ['2018-02',85.8,85.3,85.9],['2018-05',86.9,86.2,86.8],['2018-08',88.0,87.3,88.0],['2018-11',88.8,87.9,88.6],
  ['2019-02',89.9,89.3,90.0],['2019-05',90.4,89.8,90.4],['2019-08',91.0,90.3,91.0],['2019-11',91.4,90.9,91.4],
  ['2020-02',92.5,92.0,92.6],['2020-05',92.7,92.3,92.9],['2020-08',90.5,90.2,90.8],['2020-11',91.0,90.7,91.2],
  ['2021-02',94.6,94.3,94.8],['2021-05',99.1,99.1,99.0],['2021-08',102.2,102.3,102.3],['2021-11',104.1,104.2,103.9],
  ['2022-02',107.9,108.4,107.9],['2022-05',114.1,115.1,114.9],['2022-08',116.4,117.6,117.2],['2022-11',119.0,120.3,119.9],
  ['2023-02',121.5,122.8,122.5],['2023-05',122.3,123.8,123.2],['2023-08',123.3,124.9,124.2],['2023-11',123.9,125.7,124.9],
  ['2024-02',125.2,127.3,126.2],['2024-05',126.6,129.2,127.4],['2024-08',127.6,130.2,128.4],['2024-11',128.1,130.9,129.1],
  ['2025-02',129.7,132.8,130.9],['2025-05',130.7,134.0,132.0],['2025-08',131.7,135.1,132.9],['2025-11',132.7,136.2,133.8],
  ['2026-02',135.0,138.6,136.1],['2026-05',139.6,143.1,140.6]];
const MONATE={'02':'Februar','05':'Mai','08':'August','11':'November'};

function artGueltig(art){ return ARTEN[art]?art:'wohnen'; }
/* Faktor NHK 2010 → Basis 2021, auf vier Stellen wie in den Vordrucken der Bank */
function faktor2010(art){ return Math.round(100/JAHRE[2010][ARTEN[artGueltig(art)].i]*10000)/10000; }
function monatText(m){ return (MONATE[m.slice(5,7)]||m.slice(5,7))+' '+m.slice(0,4); }
function zahlDE(x,st){ return (+x).toLocaleString('de-DE',{minimumFractionDigits:st,maximumFractionDigits:st}); }
/* Maßgeblicher Quartalswert zum Stichtag: das letzte Quartal, dessen Berichtsmonat nicht nach dem Stichtag liegt.
   Ist dieses Quartal noch nicht veröffentlicht, gilt der neueste Wert — vorläufig. */
function wertFuer(art,stichtag){
  art=artGueltig(art);
  const m=/^\d{4}-\d{2}/.test(String(stichtag||''))?String(stichtag).slice(0,7):STAND;
  const i=ARTEN[art].i;
  let q=null; for(const z of QUARTALE){ if(z[0]<=m) q=z; else break; }
  if(!q) return null;
  const letzter=q===QUARTALE[QUARTALE.length-1];
  /* vorläufig, wenn nach dem neuesten Wert schon ein weiteres Quartal zum Stichtag gehören würde */
  const [j,mo]=q[0].split('-').map(Number), folge=(mo+3>12?(j+1)+'-'+String(mo-9).padStart(2,'0'):j+'-'+String(mo+3).padStart(2,'0'));
  const vorlaeufig=letzter&&folge<=m;
  const fak=faktor2010(art);
  return {art,name:ARTEN[art].name,monat:q[0],wert:q[i+1],faktor:fak,index2010:Math.round(q[i+1]*fak*10)/10,vorlaeufig};
}
function quelleText(r){
  if(!r) return '';
  return QUELLE+', '+r.name+', '+monatText(r.monat)+': '+zahlDE(r.wert,1)+'; Umrechnung auf NHK 2010 × '+zahlDE(r.faktor,4)
    +' (100 / Jahresdurchschnitt 2010)'+(r.vorlaeufig?' — vorläufig: der Wert für das Quartal des Stichtags ist noch nicht veröffentlicht':'');
}
/* Gebäudeart aus dem eingetragenen Umrechnungsfaktor bzw. dem Gebäudetyp der Bewertung */
function artAusFaktor(f){ f=+f; for(const a of Object.keys(ARTEN)) if(Math.abs(faktor2010(a)-f)<0.0006) return a; return null; }
function artAusTyp(typ){
  const t=String(typ||'').toLowerCase();
  if(/büro|buero|geschäftshaus|geschaeftshaus|bank/.test(t)) return 'buero';
  if(/betrieb|werkstatt|lager|halle|gewerb/.test(t)) return 'gewerbe';
  return 'wohnen';
}

const ImmoBaupreisindex={QUELLE,STAND,ARTEN,JAHRE,QUARTALE,faktor2010,wertFuer,quelleText,monatText,artAusFaktor,artAusTyp};
wurzel.ImmoBaupreisindex=ImmoBaupreisindex;
if(typeof module==='object'&&module.exports) module.exports=ImmoBaupreisindex;
})(typeof globalThis!=='undefined'?globalThis:this);
