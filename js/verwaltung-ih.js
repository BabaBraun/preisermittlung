/* ImmoApp — Liegenschaftsverwaltung: Instandhaltung, Dienstleister, Wartungs- und Prüfpflichten (ohne DOM, testbar)
   Vorgänge (Schadensmeldung → Auftrag → erledigt → abgerechnet) mit Verlauf und Fotos; abgerechnete Vorgänge
   werden als Kosten übernommen (Instandhaltung nicht umlagefähig; Wartung wahlweise als umlagefähige Kostenart).
   Pflichten aus einem Katalog mit Rechtsgrundlage und üblichem Turnus; nächste Fälligkeit = letzte Erledigung +
   Turnus. Die Angaben sind Richtwerte ohne Gewähr — maßgeblich sind Bescheide, Herstellerangaben und der
   Einzelfall (z. B. Anlagengröße bei Legionellen oder Heizöltank). */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const {datumGueltig,plusMonate,tagNr,isoTag,datumDE}=V;

const KATALOG=[
  {key:'rauchmelder',name:'Rauchwarnmelder: Wartung und Funktionsprüfung',monate:12,pflicht:'Pflicht',
    quelle:'LBO Baden-Württemberg § 15 Abs. 7; Wartung nach DIN 14676-1. In BW ist für die Betriebsbereitschaft der unmittelbare Besitzer (Mieter) verantwortlich, sofern nicht der Eigentümer sie übernimmt.'},
  {key:'schornsteinfeger',name:'Schornsteinfeger: Kehrung und Überprüfung',monate:12,pflicht:'Pflicht',quelle:'Schornsteinfeger-Handwerksgesetz; Turnus laut Feuerstättenbescheid (§ 14a SchfHwG).'},
  {key:'feuerstaettenschau',name:'Feuerstättenschau',monate:42,pflicht:'Pflicht',quelle:'§ 14 SchfHwG: zweimal innerhalb von sieben Jahren durch den bevollmächtigten Bezirksschornsteinfeger.'},
  {key:'heizungswartung',name:'Heizungsanlage: Wartung',monate:12,pflicht:'Empfehlung',quelle:'Herstellerangaben; Wartungskosten sind als Heizkosten umlagefähig (§ 7 Abs. 2 HeizkostenV).'},
  {key:'legionellen',name:'Trinkwasser: Untersuchung auf Legionellen',monate:36,pflicht:'Pflicht bei Großanlage',quelle:'§ 31 TrinkwV: bei Großanlage zur Trinkwassererwärmung (> 400 l oder > 3 l Leitungsinhalt), Duschen und Vermietung mindestens alle drei Jahre.'},
  {key:'aufzug',name:'Aufzug: Prüfung durch eine zugelassene Überwachungsstelle',monate:24,pflicht:'Pflicht',quelle:'BetrSichV § 16 mit Anhang 2 Abschnitt 2: Hauptprüfung spätestens alle zwei Jahre, dazwischen Zwischenprüfung.'},
  {key:'aufzug_zwischen',name:'Aufzug: Zwischenprüfung',monate:24,pflicht:'Pflicht',quelle:'BetrSichV Anhang 2 Abschnitt 2 — in der Mitte zwischen zwei Hauptprüfungen.'},
  {key:'dachrinne',name:'Dachrinnen und Fallrohre reinigen',monate:12,pflicht:'Empfehlung',quelle:'Instandhaltungs- und Verkehrssicherungspflicht des Eigentümers.'},
  {key:'baumkontrolle',name:'Baumkontrolle',monate:12,pflicht:'Empfehlung',quelle:'Verkehrssicherungspflicht (§ 823 BGB); Regelkontrolle nach FLL-Baumkontrollrichtlinie.'},
  {key:'spielplatz',name:'Spielplatz: jährliche Hauptinspektion',monate:12,pflicht:'Empfehlung',quelle:'DIN EN 1176-7; Verkehrssicherungspflicht.'},
  {key:'gasleitung',name:'Gasleitungen: Gebrauchsfähigkeitsprüfung',monate:144,pflicht:'Empfehlung',quelle:'DVGW-TRGI 2018: Prüfung der Gasinstallation empfohlen alle zwölf Jahre.'},
  {key:'elektro',name:'Elektrische Anlage: Prüfung (E-Check)',monate:48,pflicht:'Empfehlung',quelle:'Für Arbeitsstätten/Gewerbe DGUV Vorschrift 3; für Wohnraum empfohlen.'},
  {key:'feuerloescher',name:'Feuerlöscher: Prüfung',monate:24,pflicht:'Pflicht, wenn vorhanden',quelle:'DIN 14406-4; in Arbeitsstätten ASR A2.2.'},
  {key:'blitzschutz',name:'Blitzschutzanlage: Prüfung',monate:24,pflicht:'Pflicht, wenn vorhanden',quelle:'DIN EN 62305-3 Beiblatt 3; Turnus je nach Schutzklasse (Sichtprüfung 1–2 Jahre, umfassend 2–4 Jahre).'},
  {key:'oeltank',name:'Heizöltank: Prüfung durch Sachverständige',monate:60,pflicht:'Pflicht je nach Größe und Lage',quelle:'AwSV § 46 mit Anlage 5/6: je nach Anlagengröße und Schutzgebiet wiederkehrend alle fünf Jahre.'},
  {key:'winterdienst',name:'Winterdienst organisieren (vor der Saison)',monate:12,pflicht:'Pflicht',quelle:'Räum- und Streupflicht nach Gemeindesatzung; Übertragung auf Mieter nur mit vertraglicher Vereinbarung.'},
  {key:'versicherung',name:'Versicherungsschutz prüfen (Gebäude, Haftpflicht, Elementar)',monate:12,pflicht:'Empfehlung',quelle:'Deckung, Summen und Wertanpassung jährlich prüfen.'},
  {key:'energieausweis',name:'Energieausweis: Gültigkeit',monate:120,pflicht:'Pflicht',quelle:'§§ 79, 80 GEG: zehn Jahre gültig, bei Vermietung und Verkauf vorzulegen.'}
];
const KAT_P=Object.fromEntries(KATALOG.map(k=>[k.key,k]));
const STATUS=[['gemeldet','gemeldet'],['beauftragt','beauftragt'],['in_arbeit','in Arbeit'],['erledigt','erledigt'],['abgerechnet','abgerechnet']];
const PRIO=[['normal','normal'],['dringend','dringend'],['notfall','Notfall']];
const KOSTENARTEN=[['instandhaltung','Instandhaltung / Reparatur (nicht umlagefähig)'],['wartung','Wartung (umlagefähig, wenn vereinbart)'],['modernisierung','Modernisierung (§ 559 BGB prüfen)']];
const ZUSTAENDIG=[['vermieter','Vermieter / Verwaltung'],['dienstleister','Dienstleister'],['mieter','Mieter']];

function naechste(p){ return p&&datumGueltig(p.letzte)&&+p.monate>0?plusMonate(p.letzte,+p.monate):null; }
function pflichtName(p){ return p.bezeichnung||(KAT_P[p.art]||{}).name||'Pflicht'; }

/* Fristen: fällige und bald fällige Pflichten, Pflichten ohne erfasste letzte Erledigung, offene dringende Vorgänge, Handwerkertermine */
function fristen(l,stichtag,horizont){
  const grenze=isoTag(tagNr(stichtag)+(horizont||60)), aus=[], einheit=id=>((l.einheiten||[]).find(e=>e.id===id)||{}).nr||'';
  (l.pflichten||[]).filter(p=>p.aktiv!==false).forEach(p=>{
    const n=naechste(p);
    if(!n) aus.push({datum:stichtag,art:'pflicht',titel:pflichtName(p)+': letzte Erledigung eintragen',text:'Turnus '+(p.monate||'?')+' Monate',pflichtId:p.id,faellig:true});
    else if(n<=grenze) aus.push({datum:n,art:'pflicht',titel:pflichtName(p)+(n<stichtag?' überfällig':' fällig'),text:'zuletzt '+datumDE(p.letzte)+' · alle '+p.monate+' Monate',pflichtId:p.id,faellig:n<=stichtag,dringend:tagNr(stichtag)-tagNr(n)>30});
  });
  (l.vorgaenge||[]).forEach(v=>{
    const offen=!['erledigt','abgerechnet'].includes(v.status);
    if(offen&&['dringend','notfall'].includes(v.prio)) aus.push({datum:v.gemeldetAm||stichtag,art:'vorgang',titel:(v.prio==='notfall'?'Notfall: ':'Dringend: ')+v.titel,text:(einheit(v.einheitId)?einheit(v.einheitId)+' · ':'')+(STATUS.find(s=>s[0]===v.status)||[,''])[1],vorgangId:v.id,faellig:true,dringend:v.prio==='notfall'});
    if(offen&&datumGueltig(v.terminAm)&&v.terminAm>=stichtag&&v.terminAm<=grenze) aus.push({datum:v.terminAm,art:'vorgang',titel:'Handwerkertermin: '+v.titel,text:einheit(v.einheitId),vorgangId:v.id,faellig:v.terminAm<=stichtag});
    if(v.status==='erledigt'&&!(v.rechnung>0)) aus.push({datum:v.erledigtAm||stichtag,art:'vorgang',titel:'Rechnung erfassen: '+v.titel,text:'Vorgang erledigt, noch nicht abgerechnet',vorgangId:v.id,faellig:true});
  });
  aus.forEach(f=>{ f.liegenschaftId=l.id; f.liegenschaft=l.name||''; });
  return aus;
}

/* Kosteneintrag aus einem abgerechneten Vorgang (für die Nebenkosten- bzw. Kostenübersicht) */
function kostenAusVorgang(v){
  if(!v||!(v.rechnung>0)) return null;
  const kat=v.kostenart==='wartung'&&v.umlageKategorie?v.umlageKategorie:'instandhaltung';
  return {id:'K'+v.id,kategorie:kat,betrag:v.rechnung,datum:v.rechnungAm||v.erledigtAm||null,text:v.titel,beleg:v.rechnungNr||'',lohn35a:v.lohn35a||null,
    art35a:v.lohn35a>0?'handwerker':null,   /* Reparatur und Wartung: Handwerkerleistung (§ 35a Abs. 3 EStG) */vorgangId:v.id,schluessel:null,kreis:'alle',einheitIds:[],direktEinheitId:null};
}

function bereinigen(roh,l,zaehler,h){
  const {text,zahl,liste,ID}=h, eids=new Set((l.einheiten||[]).map(e=>e.id)), idOk=x=>typeof x==='string'&&ID.test(x)?x:null;
  const wahl=(x,arr,std)=>arr.some(a=>a[0]===x)?x:std;
  l.vorgaenge=liste(roh.vorgaenge,v=>({id:v.id,titel:text(v.titel,200)||'Vorgang',beschreibung:text(v.beschreibung,5000),einheitId:eids.has(v.einheitId)?v.einheitId:null,
    gemeldetAm:datumGueltig(v.gemeldetAm)?v.gemeldetAm:null,gemeldetVon:text(v.gemeldetVon,200),prio:wahl(v.prio,PRIO,'normal'),status:wahl(v.status,STATUS,'gemeldet'),
    dienstleisterId:idOk(v.dienstleisterId),angebot:zahl(v.angebot),auftragAm:datumGueltig(v.auftragAm)?v.auftragAm:null,terminAm:datumGueltig(v.terminAm)?v.terminAm:null,
    erledigtAm:datumGueltig(v.erledigtAm)?v.erledigtAm:null,rechnung:zahl(v.rechnung),rechnungAm:datumGueltig(v.rechnungAm)?v.rechnungAm:null,rechnungNr:text(v.rechnungNr,80),lohn35a:zahl(v.lohn35a),
    kostenart:wahl(v.kostenart,KOSTENARTEN,'instandhaltung'),umlageKategorie:typeof v.umlageKategorie==='string'&&/^[a-z_]{2,30}$/.test(v.umlageKategorie)?v.umlageKategorie:null,
    fotos:(Array.isArray(v.fotos)?v.fotos:[]).map(idOk).filter(Boolean).slice(0,50),
    verlauf:(Array.isArray(v.verlauf)?v.verlauf:[]).filter(x=>x&&datumGueltig(x.datum)).slice(0,500).map(x=>({datum:x.datum,text:text(x.text,2000)}))}));
  l.pflichten=liste(roh.pflichten,p=>({id:p.id,art:typeof p.art==='string'&&(KAT_P[p.art]||p.art==='eigen')?p.art:'eigen',bezeichnung:text(p.bezeichnung,200),
    monate:zahl(p.monate),letzte:datumGueltig(p.letzte)?p.letzte:null,zustaendig:wahl(p.zustaendig,ZUSTAENDIG,'vermieter'),dienstleisterId:idOk(p.dienstleisterId),
    aktiv:p.aktiv!==false,notiz:text(p.notiz,2000),historie:(Array.isArray(p.historie)?p.historie:[]).filter(x=>x&&datumGueltig(x.datum)).slice(0,500).map(x=>({datum:x.datum,notiz:text(x.notiz,1000),kosten:zahl(x.kosten)}))}));
}
/* Dienstleister (für alle Liegenschaften gemeinsam, in den Einstellungen der Verwaltung) */
function dienstleisterBereinigen(a){
  return (Array.isArray(a)?a:[]).filter(d=>d&&typeof d==='object'&&typeof d.id==='string'&&V.ID.test(d.id)).slice(0,2000).map(d=>{
    const t=(x,m)=>typeof x==='string'?x.slice(0,m||200):'';
    return {id:d.id,name:t(d.name)||'Dienstleister',gewerk:t(d.gewerk,100),telefon:t(d.telefon,60),email:t(d.email,120),anschrift:t(d.anschrift,300),notiz:t(d.notiz,2000)};
  });
}

V.erweiterungRegistrieren(bereinigen);
const ImmoInstandhaltung={KATALOG,KAT_P,STATUS,PRIO,KOSTENARTEN,ZUSTAENDIG,naechste,pflichtName,fristen,kostenAusVorgang,bereinigen,dienstleisterBereinigen};
wurzel.ImmoInstandhaltung=ImmoInstandhaltung;
if(typeof module==='object'&&module.exports) module.exports=ImmoInstandhaltung;
})(typeof globalThis!=='undefined'?globalThis:this);
