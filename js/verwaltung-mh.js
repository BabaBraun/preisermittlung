/* ImmoApp — Liegenschaftsverwaltung: Mieterhöhung (ohne DOM, in Node testbar)
   Grundlagen (Wortlaut geprüft auf gesetze-im-internet.de, Stand 30.09.2026):
   - § 558 BGB: Zustimmung zur Erhöhung bis zur ortsüblichen Vergleichsmiete, wenn die Miete zum Zeitpunkt der
     Erhöhung seit 15 Monaten unverändert ist; Verlangen frühestens ein Jahr nach der letzten Erhöhung;
     Erhöhungen nach §§ 559–560 zählen nicht. Kappungsgrenze 20 % in drei Jahren, 15 % in Gebieten nach
     Landesverordnung; Drittmittel nach § 558 Abs. 5 abziehen. § 558a: Textform, Begründung (Mietspiegel u. a.).
     § 558b: erhöhte Miete ab Beginn des dritten Kalendermonats nach Zugang; Zustimmungsfrist bis Ende des zweiten
     Kalendermonats; Klage innerhalb weiterer drei Monate.
   - § 557a BGB (Staffelmiete): jede Staffel mindestens ein Jahr; §§ 558–559b ausgeschlossen.
   - § 557b BGB (Indexmiete): Verbraucherpreisindex des Statistischen Bundesamts; Miete mindestens ein Jahr
     unverändert (ohne §§ 559–560); Erklärung in Textform mit Indexänderung und Betrag; fällig ab Beginn des
     übernächsten Monats nach Zugang; § 558 ausgeschlossen.
   - § 559 BGB: 8 % der für die Wohnung aufgewendeten Kosten jährlich, ohne Erhaltungsanteil (Abs. 2),
     Kappung in sechs Jahren 3 €/m² (unter 7 €/m² Ausgangsmiete: 2 €/m²), Heizungsanlage 0,50 €/m² (Abs. 3a);
     § 559a Drittmittel; § 559b fällig ab Beginn des dritten Monats nach Zugang, sechs Monate später ohne
     ordnungsgemäße Ankündigung oder bei mehr als 10 % über der angekündigten Erhöhung; § 559c vereinfachtes
     Verfahren bis 10.000 € mit 30 % Pauschale; § 559e Förderfähige Heizung: 10 % abzüglich Drittmittel,
     15 % Pauschale, höchstens 0,50 €/m² in sechs Jahren.
   - Kappungsgrenzenverordnung Baden-Württemberg (KappVO BW) vom 16.12.2025, GBl. 2025 Nr. 145, gilt vom
     01.01.2026 bis 31.12.2026. Außerhalb der Geltung oder außerhalb Baden-Württembergs: Häkchen in den Stammdaten.
   Arbeitshilfe, keine Rechtsberatung: Mietspiegel, Wohnwertmerkmale und Formalien im Einzelfall prüfen. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const {r2,datumGueltig,tagNr,isoTag,monatVon,monatsErster,monatsLetzter,plusMonate,datumDE,mieteAm,istWohnraum}=V;

/* ---------- Kappungsgrenze: Gemeinden nach Landesverordnung ---------- */
const KAPPVO=[{land:'Baden-Württemberg',von:'2026-01-01',bis:'2026-12-31',
  quelle:'Kappungsgrenzenverordnung Baden-Württemberg (KappVO BW) vom 16.12.2025, GBl. 2025 Nr. 145',
  gemeinden:['Achern','Aitrach','Altbach','Asperg','Backnang','Bad Bellingen','Bad Krozingen','Bad Schussenried','Baienfurt','Böblingen',
    'Bodman-Ludwigshafen','Bötzingen','Deggenhausertal','Denkendorf','Dettingen an der Erms','Dielheim','Dietenheim','Edingen-Neckarhausen',
    'Ehrenkirchen','Eisenbach (Hochschwarzwald)','Eislingen/Fils','Ellhofen','Emmendingen','Eningen u. Achalm','Esslingen am Neckar','Fellbach',
    'Filderstadt','Freiamt','Freiburg i. Br.','Frickingen','Friedrichshafen','Friesenheim','Göppingen','Gottenheim','Graben-Neudorf','Güglingen',
    'Gundelfingen','Häg-Ehrsberg','Heddesheim','Heidelberg','Heilbronn','Heiligenberg','Heitersheim','Holzgerlingen','Hoßkirch','Hülben',
    'Ittlingen','Jagsthausen','Kappel-Grafenhausen','Karlsruhe','Kenzingen','Kernen im Remstal','Kippenheim','Kirchardt','Kirchheim unter Teck',
    'Kirchzarten','Kißlegg','Korb','Korntal-Münchingen','Kornwestheim','Lahr/Schwarzwald','Leonberg','Lichtenstein','Lörrach','Ludwigsburg',
    'Mahlberg','Mahlstetten','Malsburg-Marzell','Malterdingen','March','Maselheim','Massenbachhausen','Meckenbeuren','Meißenheim','Merklingen',
    'Merzhausen','Metzingen','Möglingen','Mühlacker','Mühlhausen-Ehingen','Mühlingen','Neuhausen auf den Fildern','Neulußheim','Nürtingen',
    'Oberhausen-Rheinhausen','Offenburg','Ostfildern','Pfaffenhofen','Pfaffenweiler','Pfedelbach','Pforzheim','Philippsburg','Reichenau',
    'Reilingen','Reutlingen','Rheinhausen','Riederich','Riegel am Kaiserstuhl','Salach','Sasbach','Sasbach am Kaiserstuhl','Schallstadt',
    'Schutterwald','Schwaikheim','Schwarzach','Sindelfingen','St. Leon-Rot','Stegen','Steinenbronn','Stockach','Stuttgart','Teningen','Tübingen',
    'Ulm','Umkirch','Untermarchtal','Utzenfeld','Vogt','Vogtsburg im Kaiserstuhl','Waldkirch','Weil am Rhein','Weingarten','Wembach',
    'Wernau (Neckar)','Widdern','Wiesloch','Wittnau','Wolfegg','Wutach','Zwiefalten']}];
function ortNorm(s){
  return String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/\bi\.?\s*br\.?/g,'im breisgau').replace(/\bu\.\s*/g,'unter ').replace(/\bst\.\s*/g,'sankt ')
    .replace(/[^a-z]+/g,' ').trim();
}
/* übliche Kurzformen der amtlichen Namen (nur eindeutige) */
const ALIAS={'freiburg':'freiburg im breisgau','esslingen':'esslingen am neckar','lahr':'lahr schwarzwald','eislingen':'eislingen fils',
  'wernau':'wernau neckar','eisenbach':'eisenbach hochschwarzwald','kernen':'kernen im remstal'};
function kappVoFuer(datum){ return KAPPVO.find(k=>k.von<=datum&&datum<=k.bis)||null; }
function inKappVo(ort,vo){
  if(!vo) return false;
  let o=ortNorm(ort); if(!o) return false;
  const liste=new Set(vo.gemeinden.map(ortNorm)), versuche=[o,ALIAS[o]];
  if(/-/.test(String(ort))){ const vorn=ortNorm(String(ort).split('-')[0]); versuche.push(vorn,ALIAS[vorn]); }   // Ortsteil: „Heilbronn-Sontheim“
  return versuche.some(x=>x&&liste.has(x));
}
/* Kappungsgrenze in Prozent für eine Liegenschaft zu einem Datum (Wirksamwerden der Erhöhung) */
function kappung(l,datum){
  const ort=l&&l.ort||'', vo=kappVoFuer(datum), eig=l&&l.einstellungen&&l.einstellungen.kappung15;
  if(eig) return {prozent:15,grund:'in den Stammdaten als Gemeinde mit abgesenkter Kappungsgrenze markiert',quelle:'§ 558 Abs. 3 Satz 2 BGB'};
  if(vo&&inKappVo(ort,vo)) return {prozent:15,grund:ort+' steht in der '+vo.quelle.split(' vom ')[0]+' (gültig bis '+datumDE(vo.bis)+')',quelle:vo.quelle};
  const letzte=KAPPVO[KAPPVO.length-1];
  if(!vo&&datum>letzte.bis) return {prozent:20,grund:'Die '+letzte.quelle.split(' vom ')[0]+' galt bis '+datumDE(letzte.bis)+'. Nachfolgeregelung prüfen und bei Bedarf das Häkchen in den Stammdaten setzen.',quelle:'§ 558 Abs. 3 Satz 1 BGB',pruefen:true};
  return {prozent:20,grund:(ort?ort+' steht nicht in der '+letzte.quelle.split(' vom ')[0]:'Ort fehlt in den Stammdaten')+' — gesetzliche Kappungsgrenze. Liegt das Objekt außerhalb Baden-Württembergs, das Häkchen in den Stammdaten nach der Landesverordnung setzen.',quelle:'§ 558 Abs. 3 Satz 1 BGB'};
}

/* ---------- Hilfen zur Mietgeschichte ---------- */
const OHNE_SPERRE=['559','559e','560'];   // zählen weder für Sperrfristen noch für die Kappungsgrenze nach § 558
function kaltAenderungen(v){ return (v.aenderungen||[]).filter(a=>datumGueltig(a.ab)&&typeof a.kalt==='number'&&isFinite(a.kalt)).slice().sort((a,b)=>a.ab<b.ab?-1:a.ab>b.ab?1:0); }
function vorTag(iso){ return isoTag(tagNr(iso)-1); }
/* letzte Änderung der Kaltmiete vor einem Tag, die für die Sperrfristen zählt (sonst Mietbeginn) */
function letzteErhoehung(v,bis,ohne){
  const a=kaltAenderungen(v).filter(x=>x.ab<bis&&!(ohne||OHNE_SPERRE).includes(x.grund)).pop();
  return a?{datum:a.ab,grund:a.grund,kalt:a.kalt}:{datum:v.beginn,grund:'beginn',kalt:(v.miete||{}).kalt||0};
}
/* Summe der Kaltmieterhöhungen aus den genannten Gründen im Zeitraum (von, bis] */
function erhoehungenIm(v,von,bis,gruende){
  let s=0;
  kaltAenderungen(v).forEach(a=>{ if(a.ab>von&&a.ab<=bis&&gruende.includes(a.grund)){ const vorher=mieteAm(v,vorTag(a.ab)).kalt; s+=a.kalt-vorher; } });
  return r2(s);
}
function erster3Monat(zugang){ return plusMonate(monatsErster(monatVon(zugang)),3); }   // „Beginn des dritten (Kalender-)Monats nach Zugang“
function flaecheVon(l,v){ const e=(l.einheiten||[]).find(x=>x.id===v.einheitId); return e&&+e.flaeche>0?+e.flaeche:0; }

/* ---------- § 558 BGB: Erhöhung auf die ortsübliche Vergleichsmiete ----------
   opt: {zugang, vergleichQm (€/m² nach Mietspiegel), flaeche?, verlangt? (gewünschte neue Kaltmiete), drittmittelJahr?} */
function erhoehung558(l,v,opt){
  opt=opt||{};
  const zugang=datumGueltig(opt.zugang)?opt.zugang:null, gruende=[], hinweise=[];
  const aus={art:'558',ok:false,gruende,hinweise};
  if(!zugang){ gruende.push('Zugangsdatum fehlt'); return aus; }
  if(!istWohnraum(v,l)) gruende.push('§ 558 BGB gilt nur für Wohnraum — bei Gewerbe richtet sich die Anpassung nach dem Vertrag.');
  if(v.mietart==='staffel') gruende.push('Während einer Staffelmiete ist die Erhöhung nach § 558 ausgeschlossen (§ 557a Abs. 2 BGB).');
  if(v.mietart==='index') gruende.push('Bei einer Indexmiete ist die Erhöhung nach § 558 ausgeschlossen (§ 557b Abs. 2 BGB).');
  if(v.ende&&v.ende<zugang) gruende.push('Das Mietverhältnis ist beendet.');
  const flaeche=+opt.flaeche>0?+opt.flaeche:flaecheVon(l,v);
  if(!(flaeche>0)) gruende.push('Wohnfläche der Einheit fehlt.');
  const le=letzteErhoehung(v,zugang), fruehesterZugang=plusMonate(le.datum,12);
  if(zugang<fruehesterZugang) gruende.push('Zu früh: Das Verlangen kann frühestens ein Jahr nach '+(le.grund==='beginn'?'Mietbeginn':'der letzten Erhöhung')+' ('+datumDE(le.datum)+') zugehen, also ab '+datumDE(fruehesterZugang)+' (§ 558 Abs. 1 Satz 2 BGB).');
  let wirksam=erster3Monat(zugang);
  const frist15=plusMonate(le.datum,15);
  if(wirksam<frist15){ hinweise.push('Die Miete ist erst am '+datumDE(frist15)+' seit 15 Monaten unverändert — die Erhöhung wirkt deshalb erst ab diesem Tag (§ 558 Abs. 1 Satz 1 BGB).'); wirksam=frist15; }
  const spaetere=kaltAenderungen(v).filter(a=>a.ab>=zugang);
  if(spaetere.length) hinweise.push('Nach dem Zugang ist bereits eine weitere Mietänderung zum '+datumDE(spaetere[0].ab)+' eingetragen — bitte prüfen.');
  const aktuell=r2(mieteAm(v,vorTag(wirksam)).kalt);
  const k=kappung(l,wirksam), basisDatum=plusMonate(wirksam,-36);
  const ausgang=r2(basisDatum>=v.beginn?mieteAm(v,basisDatum).kalt:(v.miete||{}).kalt||0);
  const mod=erhoehungenIm(v,basisDatum<v.beginn?vorTag(v.beginn):basisDatum,vorTag(wirksam),OHNE_SPERRE.filter(g=>g!=='560'));
  const kappungGrenze=r2(ausgang*(1+k.prozent/100)+mod);
  const vergleich=+opt.vergleichQm>0&&flaeche>0?r2(+opt.vergleichQm*flaeche):null;
  if(vergleich==null) gruende.push('Ortsübliche Vergleichsmiete (€/m²) fehlt.');
  const dmMonat=r2((+opt.drittmittelJahr||0)/12);
  let hoechst=vergleich!=null?r2(Math.min(vergleich-dmMonat,kappungGrenze)):null;
  if(hoechst!=null&&hoechst<=aktuell) hinweise.push('Die Miete liegt bereits auf oder über der zulässigen Höchstmiete — keine Erhöhung möglich.');
  let neu=hoechst!=null?Math.max(aktuell,hoechst):null;
  if(+opt.verlangt>0&&neu!=null){
    if(+opt.verlangt>hoechst+0.004) hinweise.push('Die gewünschte Miete '+V.eur(+opt.verlangt)+' übersteigt die zulässige Höchstmiete '+V.eur(hoechst)+' — sie wird auf die Höchstmiete begrenzt.');
    else neu=r2(+opt.verlangt);
    if(+opt.verlangt<=aktuell) gruende.push('Die gewünschte Miete ist nicht höher als die bisherige.');
  }
  const zustimmungBis=monatsLetzter(monatVon(plusMonate(monatsErster(monatVon(zugang)),2)));
  const klageBis=monatsLetzter(monatVon(plusMonate(monatsErster(monatVon(zustimmungBis)),3)));
  if(k.pruefen) hinweise.push(k.grund);
  Object.assign(aus,{ok:!gruende.length&&neu!=null&&neu>aktuell+0.004,zugang,fruehesterZugang,wirksam,zustimmungBis,klageBis,letzte:le,
    flaeche,aktuell,aktuellQm:flaeche?r2(aktuell/flaeche):null,vergleich,vergleichQm:+opt.vergleichQm||null,drittmittelMonat:dmMonat,
    kappungProzent:k.prozent,kappungGrund:k.grund,kappungQuelle:k.quelle,basisDatum:basisDatum>=v.beginn?basisDatum:v.beginn,ausgang,modernisierungImZeitraum:mod,kappungGrenze,
    hoechst,neu:neu!=null?r2(neu):null,erhoehung:neu!=null?r2(Math.max(0,neu-aktuell)):0,prozent:neu!=null&&aktuell>0?r2((neu-aktuell)/aktuell*100):0,
    neuQm:neu!=null&&flaeche?r2(neu/flaeche):null,begrenztDurch:hoechst==null?null:(vergleich-dmMonat<=kappungGrenze?'vergleichsmiete':'kappungsgrenze')});
  return aus;
}

/* ---------- § 557b BGB: Indexanpassung ----------
   opt: {zugang, vpiNeu, monatNeu (JJJJ-MM)}. Basis ist die letzte Indexanpassung (Monat, Indexwert, Kaltmiete)
   bzw. der Vertrag (index.basisMonat/basisWert, Anfangsmiete). Spätere Erhöhungen aus anderen Gründen
   (z. B. Modernisierung) bleiben als fester Betrag erhalten. */
function indexBasis(v){
  const a=kaltAenderungen(v).filter(x=>x.grund==='index'&&x.indexWert>0&&x.indexMonat).pop();
  if(a) return {monat:a.indexMonat,wert:a.indexWert,kalt:a.kalt,datum:a.ab};
  const ix=v.index||{};
  return {monat:ix.basisMonat||null,wert:+ix.basisWert||null,kalt:(v.miete||{}).kalt||0,datum:v.beginn};
}
function indexAnpassung(l,v,opt){
  opt=opt||{};
  const gruende=[], hinweise=[], zugang=datumGueltig(opt.zugang)?opt.zugang:null, aus={art:'index',ok:false,gruende,hinweise};
  if(v.mietart!=='index') gruende.push('Im Vertrag ist keine Indexmiete vereinbart.');
  if(!zugang){ gruende.push('Zugangsdatum fehlt'); return aus; }
  const b=indexBasis(v);
  if(!b.monat||!(b.wert>0)) gruende.push('Basismonat und Indexwert fehlen (im Vertrag unter „Indexmiete“ eintragen).');
  const monatNeu=/^\d{4}-\d{2}$/.test(opt.monatNeu||'')?opt.monatNeu:null, vpiNeu=+opt.vpiNeu>0?+opt.vpiNeu:null;
  if(!monatNeu||!vpiNeu) gruende.push('Neuer Indexwert und Monat fehlen.');
  if(monatNeu&&b.monat&&monatNeu<=b.monat) gruende.push('Der neue Indexmonat muss nach dem Basismonat '+b.monat+' liegen.');
  const wirksam=plusMonate(monatsErster(monatVon(zugang)),2);   // Beginn des übernächsten Monats nach Zugang
  const le=letzteErhoehung(v,wirksam), jahr=plusMonate(le.datum,12);
  if(wirksam<jahr) gruende.push('Die Miete muss mindestens ein Jahr unverändert bleiben: letzte Änderung am '+datumDE(le.datum)+', frühestens wirksam ab '+datumDE(jahr)+' (§ 557b Abs. 2 BGB).');
  const aktuell=r2(mieteAm(v,vorTag(wirksam)).kalt);
  const fest=erhoehungenIm(v,vorTag(b.datum),vorTag(wirksam),['559','559e','vereinbarung']);
  const aenderungProzent=b.wert>0&&vpiNeu?r2((vpiNeu/b.wert-1)*100):null;
  const neu=b.wert>0&&vpiNeu?r2(b.kalt*vpiNeu/b.wert+fest):null;
  if(neu!=null&&neu<aktuell-0.004) hinweise.push('Der Index ist gesunken: Der Mieter kann eine entsprechende Senkung verlangen (§ 557b Abs. 1 BGB).');
  hinweise.push('Beide Indexwerte müssen auf derselben Basis stehen (derzeit Verbraucherpreisindex Deutschland, 2020 = 100).');
  Object.assign(aus,{ok:!gruende.length&&neu!=null&&Math.abs(neu-aktuell)>0.004,zugang,wirksam,basis:b,monatNeu,vpiNeu,aenderungProzent,festeZuschlaege:fest,
    aktuell,neu,erhoehung:neu!=null?r2(neu-aktuell):0,letzte:le});
  return aus;
}

/* ---------- § 559, § 559c, § 559e BGB: Modernisierungsmieterhöhung ----------
   opt: {zugang, verfahren:'regel'|'vereinfacht'|'559e', kosten (für die Wohnung), erhaltung (Betrag, Regelverfahren),
         zuschuss (Drittmittel § 559a Abs. 1), zinsvorteilJahr (§ 559a Abs. 2), fruehereKosten5J (§ 559c Abs. 2),
         heizung (Heizungsanlage § 559 Abs. 3a Satz 3), heizungGmodg (§ 559e Abs. 2 Satz 2: keine Pauschale),
         angekuendigt (ordnungsgemäß nach § 555c), angekuendigtMonat (angekündigte monatliche Erhöhung)} */
function modernisierung(l,v,opt){
  opt=opt||{};
  const gruende=[], hinweise=[], zugang=datumGueltig(opt.zugang)?opt.zugang:null, verfahren=['regel','vereinfacht','559e'].includes(opt.verfahren)?opt.verfahren:'regel';
  const aus={art:verfahren==='559e'?'559e':'559',verfahren,ok:false,gruende,hinweise};
  if(!zugang){ gruende.push('Zugangsdatum fehlt'); return aus; }
  if(!istWohnraum(v,l)) hinweise.push('§ 559 BGB regelt Wohnraum — bei Gewerbe gilt, was im Vertrag vereinbart ist.');
  if(v.mietart==='staffel') gruende.push('Während einer Staffelmiete ist die Modernisierungsmieterhöhung ausgeschlossen (§ 557a Abs. 2 BGB).');
  if(v.mietart==='index') hinweise.push('Bei einer Indexmiete nur zulässig, wenn der Vermieter die Maßnahme nicht zu vertreten hat oder sie nach § 555b Nr. 1a durchgeführt wurde (§ 557b Abs. 2 BGB).');
  const flaeche=+opt.flaeche>0?+opt.flaeche:flaecheVon(l,v);
  if(!(flaeche>0)) gruende.push('Wohnfläche der Einheit fehlt.');
  const kosten=+opt.kosten>0?+opt.kosten:0, zuschuss=Math.max(0,+opt.zuschuss||0);
  if(!(kosten>0)) gruende.push('Modernisierungskosten für die Wohnung fehlen.');
  let erhaltung=0, satz=8, geltend=kosten;
  if(verfahren==='vereinfacht'){
    const frueher=Math.max(0,+opt.fruehereKosten5J||0), grenze=r2(10000-frueher);
    if(kosten>10000) gruende.push('Vereinfachtes Verfahren nur bis 10.000 € Kosten für die Wohnung (§ 559c Abs. 1 BGB).');
    else if(kosten>grenze){ geltend=Math.max(0,grenze); hinweise.push('Wegen früherer Modernisierungskosten in den letzten fünf Jahren ('+V.eur(frueher)+') können nur '+V.eur(geltend)+' geltend gemacht werden (§ 559c Abs. 2 BGB).'); }
    erhaltung=r2(geltend*0.30);
    hinweise.push('Im Schreiben angeben, dass nach dem vereinfachten Verfahren gerechnet wurde (§ 559c Abs. 3 BGB); fünf Jahre lang keine weitere Erhöhung nach § 559 oder § 559e (§ 559c Abs. 4 BGB).');
  } else if(verfahren==='559e'){
    satz=10;
    if(opt.heizungGmodg){ erhaltung=Math.max(0,+opt.erhaltung||0); hinweise.push('Heizungsanlage im Sinne des § 43 GModG: Erhaltungsanteil nicht pauschal, sondern geschätzt (§ 559e Abs. 2 Satz 2 BGB).'); }
    else erhaltung=r2(kosten*0.15);
    if(!(zuschuss>0)) hinweise.push('§ 559e setzt in Anspruch genommene Fördermittel voraus; ohne Förderung gilt § 559 (§ 559e Abs. 1 Satz 2 BGB).');
  } else erhaltung=Math.max(0,+opt.erhaltung||0);
  const anrechenbar=r2(Math.max(0,geltend-erhaltung-zuschuss));
  const zinsvorteil=verfahren==='vereinfacht'?0:Math.max(0,+opt.zinsvorteilJahr||0);
  const jahr=r2(Math.max(0,anrechenbar*satz/100-zinsvorteil)), monatRoh=r2(jahr/12);
  let wirksam=erster3Monat(zugang);
  const spaet=!opt.angekuendigt||(+opt.angekuendigtMonat>0&&monatRoh>+opt.angekuendigtMonat*1.1+0.004);
  if(spaet){ wirksam=plusMonate(wirksam,6); hinweise.push(!opt.angekuendigt?'Ohne ordnungsgemäße Ankündigung (§ 555c BGB) wird die Erhöhung sechs Monate später fällig (§ 559b Abs. 2 BGB).':'Die Erhöhung liegt mehr als 10 % über der angekündigten — fällig sechs Monate später (§ 559b Abs. 2 BGB).'); }
  const aktuell=r2(mieteAm(v,vorTag(wirksam)).kalt), qm0=flaeche?aktuell/flaeche:0;
  const grenzeQm=qm0>0&&qm0<7?2:3, von6=plusMonate(wirksam,-72);
  const bisher=erhoehungenIm(v,von6,vorTag(wirksam),['559','559e']);
  let kappe=flaeche?r2(grenzeQm*flaeche-bisher):0, kappeText='höchstens '+grenzeQm.toString().replace('.',',')+' €/m² in sechs Jahren (§ 559 Abs. 3a BGB)';
  if(opt.heizung||verfahren==='559e'){ const h=flaeche?r2(0.5*flaeche-(verfahren==='559e'?erhoehungenIm(v,von6,vorTag(wirksam),['559e']):0)):0; if(h<kappe){ kappe=h; kappeText='höchstens 0,50 €/m² in sechs Jahren für die Heizungsanlage ('+(verfahren==='559e'?'§ 559e Abs. 3':'§ 559 Abs. 3a Satz 3')+' BGB)'; } }
  kappe=Math.max(0,kappe);
  const monat=r2(Math.min(monatRoh,kappe));
  if(monat<monatRoh-0.004) hinweise.push('Begrenzt auf '+V.eur(monat)+' monatlich: '+kappeText+(bisher>0?'; bisherige Modernisierungserhöhungen in sechs Jahren '+V.eur(bisher):'')+'.');
  Object.assign(aus,{ok:!gruende.length&&monat>0,zugang,wirksam,flaeche,kosten,geltend,erhaltung,zuschuss,anrechenbar,satz,zinsvorteil,jahr,monatRoh,
    kappungQm:grenzeQm,bisherSechsJahre:bisher,kappungRest:kappe,monat,aktuell,neu:r2(aktuell+monat),aktuellQm:flaeche?r2(qm0):null});
  return aus;
}

/* Modernisierungskosten auf mehrere Wohnungen aufteilen (§ 559 Abs. 3 BGB) — nach Wohnfläche */
function aufteilenNachFlaeche(gesamt,einheiten){
  const e=(einheiten||[]).filter(x=>+x.flaeche>0), f=e.reduce((s,x)=>s+ +x.flaeche,0), aus={};
  if(!(f>0)) return aus;
  let rest=r2(gesamt);
  e.forEach((x,i)=>{ const b=i===e.length-1?rest:r2(gesamt*x.flaeche/f); aus[x.id]=b; rest=r2(rest-b); });
  return aus;
}

/* ---------- Fristen: wann ist die nächste Erhöhung möglich? ---------- */
function fristen(l,stichtag,horizont){
  horizont=horizont||60;
  const grenze=isoTag(tagNr(stichtag)+horizont), aus=[];
  const vo=KAPPVO[KAPPVO.length-1];
  (l.vertraege||[]).forEach(v=>{
    if(!V.vertragAktiv(v,stichtag)||v.mietart!=='fest'||!istWohnraum(v,l)) return;
    const le=letzteErhoehung(v,grenze), ab=plusMonate(le.datum,12);
    if(ab>stichtag&&ab<=grenze){
      const e=(l.einheiten||[]).find(x=>x.id===v.einheitId)||{}, n=(v.mieter||[]).map(m=>m.name).filter(Boolean).join(', ');
      aus.push({datum:ab,art:'mh558',titel:'Mieterhöhung nach § 558 BGB möglich',text:(e.nr?e.nr+' · ':'')+n+' · Miete seit '+datumDE(le.datum)+' unverändert',vertragId:v.id});
    }
  });
  if(inKappVo(l.ort,vo)&&vo.bis>=stichtag&&vo.bis<=grenze) aus.push({datum:vo.bis,art:'kappvo',titel:'Kappungsgrenzenverordnung läuft aus',text:vo.quelle+' — Nachfolgeregelung prüfen'});
  aus.forEach(f=>{ f.liegenschaftId=l.id; f.liegenschaft=l.name||''; f.faellig=f.datum<=stichtag; });
  return aus;
}

/* ---------- Bereinigung: Mietspiegel der Liegenschaft, Vergleichsmiete je Einheit ---------- */
function bereinigen(roh,l,zaehler,h){
  const {text,zahl}=h, m=roh.mietspiegel&&typeof roh.mietspiegel==='object'?roh.mietspiegel:{};
  l.mietspiegel={name:text(m.name,200),stand:datumGueltig(m.stand)?m.stand:null,art:['einfach','qualifiziert','datenbank','gutachten','vergleich'].includes(m.art)?m.art:'einfach',notiz:text(m.notiz,1000)};
  const qm={}; (Array.isArray(roh.einheiten)?roh.einheiten:[]).forEach(e=>{ if(e&&typeof e==='object'&&typeof e.id==='string') qm[e.id]=zahl(e.vergleichQm); });
  (l.einheiten||[]).forEach(e=>{ e.vergleichQm=qm[e.id]!=null&&qm[e.id]>0?qm[e.id]:null; });
}

V.erweiterungRegistrieren(bereinigen);
const ImmoMieterhoehung={KAPPVO,ortNorm,kappVoFuer,inKappVo,kappung,letzteErhoehung,erhoehungenIm,indexBasis,erhoehung558,indexAnpassung,modernisierung,aufteilenNachFlaeche,fristen,bereinigen};
wurzel.ImmoMieterhoehung=ImmoMieterhoehung;
if(typeof module==='object'&&module.exports) module.exports=ImmoMieterhoehung;
})(typeof globalThis!=='undefined'?globalThis:this);
