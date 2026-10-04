/* ImmoApp — Regeln der Kachel „Maklerverträge“ (D54), ohne Seitenbezug, in Node testbar. Rechtsstand 03.10.2026.
   Geprüft am Wortlaut und an der Rechtsprechung (Rechtsprüfung „Widerruf beim Maklervertrag“):
   - Widerrufsrecht nur für Verbraucher (§ 13 BGB) und nur, wenn der Kunde eine Provision verspricht (§ 312 Abs. 1 BGB);
     Maklerverträge fallen nicht unter § 312 Abs. 2 Nr. 2 BGB (BGH I ZR 30/15, Rn. 69 f.).
   - Abschlussweg: Filiale ohne vorherige Ansprache außerhalb → kein Widerrufsrecht (§ 312b Abs. 2, § 312g Abs. 1 BGB);
     beim Kunden, am Objekt oder nach Ansprache außerhalb → außerhalb von Geschäftsräumen (§ 312b Abs. 1 Satz 1 Nr. 1–3 BGB);
     nur E-Mail, Brief oder Telefon → Fernabsatz (§ 312c BGB; BGH I ZR 30/15); Online-Oberfläche → zusätzlich § 312j Abs. 3
     und 4 BGB (BGH I ZR 159/24) und die Widerrufsfunktion nach § 356a BGB; fehlt in der Belehrung der Hinweis darauf, beginnt die
     Frist nicht (§ 356 Abs. 3 Satz 1 BGB, Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB). Unklarer Weg: Die App setzt ein Widerrufsrecht voraus.
   - Frist 14 Tage ab Vertragsschluss (§ 355 Abs. 2 BGB), nicht vor der ordnungsgemäßen Belehrung (§ 356 Abs. 3 Satz 1 BGB).
     Außerhalb von Geschäftsräumen zählt die Belehrung nur auf Papier oder mit Zustimmung auf einem dauerhaften Datenträger und
     mit Muster-Widerrufsformular (Art. 246a § 4 Abs. 2 EGBGB; BGH I ZR 169/19). Tag des Ereignisses zählt nicht (§ 187 Abs. 1),
     Ende mit Ablauf des 14. Tages (§ 188 Abs. 1), Samstag, Sonntag oder Feiertag in Baden-Württemberg → nächster Werktag (§ 193).
   - Höchstfrist ohne ordnungsgemäße Belehrung: 12 Monate und 14 Tage nach Vertragsschluss (§ 356 Abs. 4 Satz 1 BGB, bis
     18.06.2026 § 356 Abs. 3 Satz 2 BGB a. F.). Zwei Rechenwege, das spätere Datum gilt, danach § 193 BGB: (a) 12 Monate ab Ablauf
     der 14-Tage-Frist (Art. 10 Abs. 1 RL 2011/83/EU, wiedergegeben in BGH I ZR 169/19 Rn. 35), (b) 12 Monate ab Vertragsschluss
     (§ 188 Abs. 2 und 3 BGB) und dann 14 Tage. Belehrung nachgeholt: 14 Tage ab Belehrung, höchstens bis zur Höchstfrist.
   - Erlöschen vor Fristablauf nur, wenn alles dokumentiert ist (§ 356 Abs. 5 Nr. 2 BGB, bis 18.06.2026 Abs. 4 a. F.);
     Wertersatz nur mit Verlangen, außerhalb von Geschäftsräumen auf einem dauerhaften Datenträger, und Belehrung (§ 357a Abs. 2 BGB).
   - Textform nur bei Wohnung oder Einfamilienhaus (§ 656a, § 126b BGB; BGH I ZR 32/24, I ZR 202/25).
   - Abschrift oder Bestätigung (§ 312f Abs. 1 und 2 BGB). Rückzahlung nach Widerruf binnen 14 Tagen ab Eingang (§ 357 Abs. 1,
     § 355 Abs. 3 Satz 2 BGB). Für die Frist zählt die Absendung (§ 355 Abs. 1 Satz 5 BGB): nach dem Fristende 5 Werktage Puffer
     (Empfehlung, keine Norm).
   Keine Rechtstexte: Vertrag, Belehrung und Formular sind die Vordrucke der Bank. Alle Daten als ISO-Text (JJJJ-MM-TT). */
(function(wurzel){
'use strict';
const F=typeof module==='object'&&module.exports?require('./fristen.js'):wurzel.ImmoFristen;

const NEUFASSUNG='2026-06-19';   // § 356 BGB neu gegliedert, § 356a neu (BGBl. 2026 I Nr. 28)
const PUFFER_WERKTAGE=5;
const SEITEN=[['verkaeufer','Verkäufer'],['kaeufer','Käufer']];
const ARTEN=[['allein','Alleinauftrag'],['einfach','einfacher Maklerauftrag'],['nachweis','Nachweis- oder Vermittlungsvertrag (Käufer)']];
/* Abschlussweg: [Schlüssel, Auswahltext, Einordnung] */
const WEGE=[
  ['filiale','In der Filiale – ohne Ansprache außerhalb unmittelbar zuvor','keins'],
  ['aussen','Beim Kunden, am Objekt oder an einem anderen Ort','aussen'],
  ['ansprache','Filiale, E-Mail oder Telefon – unmittelbar zuvor persönlich außerhalb angesprochen (z. B. beim Bewertungstermin)','aussen'],
  ['fern','Nur E-Mail, Brief oder Telefon','fern'],
  ['online','Online-Oberfläche: Portal, Web-Exposé, Formular mit Schaltfläche','online']];
const WEG_FOLGE={
  '':'Abschlussweg noch offen: Die App setzt ein Widerrufsrecht voraus.',
  filiale:'Vertrag in Geschäftsräumen: kein Widerrufsrecht (§ 312b Abs. 2, § 312g Abs. 1 BGB).',
  aussen:'Außerhalb von Geschäftsräumen geschlossen (§ 312b Abs. 1 Satz 1 Nr. 1 und 2 BGB): Widerrufsrecht (§ 312g Abs. 1 BGB). Belehrung und Formular auf Papier oder mit Zustimmung auf einem dauerhaften Datenträger (Art. 246a § 4 Abs. 2 EGBGB).',
  ansprache:'Außerhalb von Geschäftsräumen geschlossen (§ 312b Abs. 1 Satz 1 Nr. 3 BGB): Widerrufsrecht. Das Gesetz nennt keine Zeitspanne für „unmittelbar zuvor“ – im Zweifel belehren.',
  fern:'Fernabsatzvertrag (§ 312c BGB; BGH I ZR 30/15): Widerrufsrecht. Belehrung in einer dem Kommunikationsmittel angepassten Form (Art. 246a § 4 Abs. 3 EGBGB).',
  online:'Fernabsatzvertrag über eine Online-Oberfläche: Widerrufsrecht. Dazu prüfen: Schaltfläche „zahlungspflichtig …“ (§ 312j Abs. 3 und 4 BGB) und Schaltfläche „Vertrag widerrufen“ (§ 356a BGB).'};
const TEXTFORMEN=[['','– wählen –'],['papier','Vertrag auf Papier unterschrieben'],['email','E-Mail-Wechsel'],['datei','PDF oder Scan per E-Mail'],['sonst','andere lesbare Erklärung auf dauerhaftem Datenträger']];
const BELEHRUNGSFORMEN=[['','– wählen –'],['papier','auf Papier übergeben'],['datentraeger','auf dauerhaftem Datenträger (z. B. PDF per E-Mail)'],['angepasst','im Fernabsatz dem Kommunikationsmittel angepasst']];
const ABSCHRIFTFORMEN=[['','– wählen –'],['papier','auf Papier'],['datentraeger','auf dauerhaftem Datenträger']];

const iso=d=>d.toISOString().slice(0,10);
function gueltig(s){ s=String(s||''); const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if(!m) return ''; const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); return iso(d)===s?s:''; }
function datumText(s){ s=gueltig(s); return s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'–'; }
const max=l=>l.filter(Boolean).sort().pop()||'';
const min=l=>l.filter(Boolean).sort()[0]||'';
function wegTyp(weg){ let w=WEGE.find(x=>x[0]===weg); return w?w[2]:'unklar'; }

/* Monatsfrist, die mit dem Beginn eines Tages anfängt (§ 187 Abs. 2, § 188 Abs. 2 Alt. 2 und Abs. 3 BGB):
   Ende am Vortag des Tages mit derselben Zahl; fehlt der maßgebende Tag im letzten Monat, am Monatsletzten. */
function monateAbBeginn(s,n){
  s=gueltig(s); if(!s) return '';
  const J=+s.slice(0,4), M=+s.slice(5,7)-1+n, T=+s.slice(8,10);
  if(T===1) return iso(new Date(Date.UTC(J,M,0)));
  const letzter=new Date(Date.UTC(J,M+1,0)).getUTCDate();
  return iso(new Date(Date.UTC(J,M,Math.min(T-1,letzter))));
}
/* Höchstfrist ohne ordnungsgemäße Belehrung (§ 356 Abs. 4 Satz 1 BGB): beide Rechenwege, das spätere Datum, dann § 193 BGB */
function hoechstfrist(V){
  V=gueltig(V); if(!V) return {a:'',b:'',ohne193:'',ende:''};
  const a=monateAbBeginn(F.plusTage(V,15),12);           // (a) 12 Monate ab Ablauf der 14-Tage-Frist
  const b=F.plusTage(F.fristMonate(V,12),14);           // (b) 12 Monate ab Vertragsschluss, dann 14 Tage
  const spaeter=a>b?a:b;
  return {a,b,ohne193:spaeter,ende:F.naechsterWerktagBW(spaeter)};
}
/* n Werktage (Baden-Württemberg) nach einem Tag */
function werktagePlus(s,n){ s=gueltig(s); if(!s) return ''; let x=s, k=0, sicher=0; while(k<n&&sicher<60){ x=F.plusTage(x,1); if(F.werktagBW(x)) k++; sicher++; } return x; }
/* Widerrufsfrist: Ende mit § 193 BGB; Belehrung nachgeholt → ab Belehrung, höchstens bis zur Höchstfrist */
function fristEnde(V,belehrung){
  V=gueltig(V); belehrung=gueltig(belehrung); if(!V) return {beginn:'',ende:'',nachgeholt:false};
  const h=hoechstfrist(V).ende;
  if(!belehrung) return {beginn:V,ende:h,nachgeholt:false,ohneBelehrung:true};
  const start=belehrung>V?belehrung:V; let ende=F.fristTage(start,14,{werktag:true});
  if(belehrung>V&&ende>h) ende=h;
  return {beginn:start,ende,nachgeholt:belehrung>V};
}
/* Käuferseite: Vorschlag für den Vertragsschluss (erste Bitte um Besichtigung, BGH I ZR 30/15) und mögliche Daten */
function kandidaten(v){
  let l=[gueltig(v.abschluss)];
  if(v.seite==='kaeufer'){ const k=v.kaeufer||{}; l.push(gueltig(k.link),gueltig(k.bitte),gueltig(k.vereinbarung)); }
  return l.filter(Boolean);
}

/* ---------- Prüfung eines Vertrags ----------
   v: Datensatz der Kachel; heute: ISO-Datum; o: {notarTermin, beurkundet (aus dem Notarauftrag), datum: Formatfunktion}
   Ergebnis: Widerrufsrecht, Fristen, Ampeln [{id, stufe: rot|gelb|gruen, text}], Ampel zur Provision und Gesamtstufe. */
function pruefen(v,heute,o){
  v=v||{}; o=o||{}; heute=gueltig(heute)||'';
  const dt=typeof o.datum==='function'?o.datum:datumText;
  const typ=wegTyp(v.weg), aussenForm=typ==='aussen'||typ==='unklar';
  const kand=kandidaten(v), V=max(kand), Vfrueh=min(kand);
  const vorschlag=v.seite==='kaeufer'&&!gueltig(v.abschluss)?gueltig((v.kaeufer||{}).bitte):'';
  const alt=V&&V<NEUFASSUNG;   // Vertrag vor der Neufassung: alte Absätze zusätzlich nennen
  const zitatHoechst='§ 356 Abs. 4 Satz 1 BGB'+(alt?'; vor dem 19.06.2026 § 356 Abs. 3 Satz 2 BGB a. F.':'');
  const zitatErloeschen='§ 356 Abs. 5 Nr. 2 BGB'+(alt?'; vor dem 19.06.2026 § 356 Abs. 4 BGB a. F.':'');
  const ampeln=[], A=(id,stufe,text)=>ampeln.push({id,stufe,text});

  /* Widerrufsrecht */
  let wr=true, grund='';
  if(v.verbraucher===false){ wr=false; grund='Kunde ist kein Verbraucher (§ 13 BGB): kein Widerrufsrecht.'; }
  else if(v.provision===false){ wr=false; grund='Kunde verspricht keine Provision: Die Vorschriften zum Widerrufsrecht gelten nicht (§ 312 Abs. 1 BGB).'; }
  else if(typ==='keins'){ wr=false; grund=WEG_FOLGE.filiale; }
  else grund=WEG_FOLGE[typ==='unklar'?'':v.weg]||'';

  /* Belehrung (nur wenn ein Widerrufsrecht besteht) */
  const B=v.belehrung||{}, Bd=gueltig(B.datum), fehlt=[];
  if(!Bd) fehlt.push('Datum');
  if(!B.formular) fehlt.push('Muster-Widerrufsformular');
  if(!B.form) fehlt.push('Form der Übergabe');
  else if(aussenForm&&B.form==='angepasst') fehlt.push('Papier oder dauerhafter Datenträger (außerhalb von Geschäftsräumen)');
  else if(aussenForm&&B.form==='datentraeger'&&!gueltig(v.zustimmung)) fehlt.push('Zustimmung zum dauerhaften Datenträger');
  // Online-Oberfläche ab 19.06.2026: ohne Hinweis auf die Widerrufsfunktion beginnt die Frist nicht (§ 356 Abs. 3 Satz 1, § 356a Abs. 1 BGB)
  if(v.weg==='online'&&wr&&!alt&&!B.online) fehlt.push('Hinweis auf die Widerrufsfunktion nach § 356a BGB (Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB)');
  const belehrt=wr&&!fehlt.length;

  /* Fristen */
  const H=hoechstfrist(V), fr=V?fristEnde(V,belehrt?Bd:''):{beginn:'',ende:'',nachgeholt:false};
  const ende=wr?fr.ende:'', puffer=ende?werktagePlus(ende,PUFFER_WERKTAGE):'';

  /* Verlangen, Erlöschen, Wertersatz */
  const L=v.verlangen||{}, Ld=gueltig(L.datum), Ed=gueltig(v.erloeschen), T=gueltig(v.beginn), U=gueltig(v.beurkundet)||gueltig(o.beurkundet);
  const verlangenOk=!!Ld&&(!aussenForm||!!L.datentraeger);
  const ef=[];
  if(!belehrt) ef.push('ordnungsgemäße Belehrung mit Formular');
  if(!Ld) ef.push('Verlangen auf Beginn vor Fristablauf');
  else if(aussenForm&&!L.datentraeger) ef.push('Verlangen auf einem dauerhaften Datenträger');
  if(!Ed) ef.push('Bestätigung zum Erlöschen');
  if(!T) ef.push('Beginn der Tätigkeit');
  else {
    if(Ld&&Ld>T) ef.push('Verlangen vor Beginn der Tätigkeit');
    if(Ed&&Ed>T) ef.push('Bestätigung vor Beginn der Tätigkeit');
    if(belehrt&&Bd>T) ef.push('Belehrung vor Beginn der Tätigkeit');
  }
  if(!U) ef.push('vollständige Leistung (Kaufvertrag beurkundet)');
  else if(heute&&U>heute) ef.push('Kaufvertrag noch nicht beurkundet');
  const erloschen=wr&&!ef.length;
  const wertersatz=wr&&verlangenOk&&belehrt;

  /* Widerruf */
  const W=v.widerruf||{}, Wa=gueltig(W.abgesandt), We=gueltig(W.eingang);
  const widerrufen=wr&&!!(Wa||We), verspaetet=widerrufen&&!!Wa&&!!ende&&Wa>ende;
  const rueckzahlungBis=widerrufen&&We?F.plusTage(We,14):'';

  let phase='keins';
  if(wr){ phase=widerrufen?'widerrufen':erloschen?'erloschen':!V?'offen':heute<=ende?'laeuft':heute<=puffer?'puffer':'abgelaufen'; }

  /* ---- Ampeln ---- */
  // Textform (§ 656a BGB)
  const Tf=v.textform||{}, Tfd=gueltig(Tf.datum);
  if(v.wohnung!==false){
    if(!Tfd) A('textform','rot','Textform fehlt: ohne Textform kein Anspruch auf Provision, auch nicht aus Bereicherung (§ 656a BGB; BGH I ZR 202/25).');
    else if(!Tf.bestimmt) A('textform','gelb','Textform am '+dt(Tfd)+' vermerkt. Prüfen: Parteien, Provisionshöhe und Objekt ergeben sich aus den Erklärungen, das Ende der Erklärung ist erkennbar (BGH I ZR 202/25).');
    else A('textform','gruen','Textform erfüllt am '+dt(Tfd)+(Tf.form?' ('+(TEXTFORMEN.find(x=>x[0]===Tf.form)||['',''])[1]+')':'')+' (§ 656a, § 126b BGB).');
  } else A('textform','gruen','Keine Formvorschrift nach § 656a BGB (keine Wohnung, kein Einfamilienhaus).'+(V?'':' Datum des Vertragsschlusses festhalten.'));
  // Online-Abschluss
  if(v.weg==='online'){
    const On=v.online||{};
    if(!On.zahlungspflichtig) A('online','rot','Schaltfläche „zahlungspflichtig …“ nicht als geprüft vermerkt: Ohne sie kommt kein Vertrag zustande (§ 312j Abs. 3 und 4 BGB); „Senden“ reicht nicht (BGH I ZR 159/24).');
    if(!wr){ /* Widerrufsfunktion nur bei Widerrufsrecht */ }
    else if(V&&V<NEUFASSUNG) A('online356a','gelb','Vertrag vor dem 19.06.2026: Ob die Widerrufsfunktion nach § 356a BGB gilt, ist ungeklärt – mit der Rechtsabteilung klären.');
    else if(!On.widerrufsfunktion) A('online356a','gelb','Fristbeginn unsicher – nicht vermerkt: Schaltfläche „Vertrag widerrufen“ beim Portal (§ 356a BGB). Den Portalanbieter prüft die Bank.');
    // fehlender Hinweis im Belehrungs-Vordruck: siehe Belehrung (fehlt → Höchstfrist)
  }
  // Belehrung
  if(!wr) A('widerrufsrecht','gruen',grund);
  else if(belehrt){
    A('belehrung','gruen','Belehrung mit Muster-Widerrufsformular am '+dt(Bd)+' ('+(BELEHRUNGSFORMEN.find(x=>x[0]===B.form)||['',''])[1]+'; Art. 246a § 1 Abs. 2 und § 4 EGBGB).');
    if(Bd>Vfrueh&&Vfrueh) A('nachgeholt','gelb','Belehrung erst nach dem '+(Vfrueh<V?'frühesten möglichen ':'')+'Vertragsschluss am '+dt(Vfrueh)+': Die Frist beginnt nicht vor der Belehrung (§ 356 Abs. 3 Satz 1 BGB); die App rechnet ab '
      +(fr.nachgeholt?'der Belehrung':'dem spätesten möglichen Vertragsschluss')+' am '+dt(fr.beginn)+'. Die Belehrung gehört vor die Vertragserklärung (Art. 246a § 4 Abs. 1 EGBGB).');
    else if(v.seite==='kaeufer'&&gueltig((v.kaeufer||{}).expose)&&Bd>gueltig(v.kaeufer.expose)) A('nachgeholt','gelb','Belehrung, Vordruck und Muster-Widerrufsformular gehören schon zum Exposé (BGH I ZR 30/15; Art. 246a § 4 Abs. 1 EGBGB).');
    if(!gueltig(B.vordruck)) A('vordruck','gelb','Stand des Belehrungs-Vordrucks der Bank eintragen.');
    else if(B.vordruck<NEUFASSUNG&&V&&V>=NEUFASSUNG) A('vordruck','gelb','Vordruck an Anlage 1 EGBGB in der Fassung vom 19.06.2026 angleichen (BGBl. 2026 I Nr. 28).');
  } else if(phase==='abgelaufen') A('belehrung','gruen','Ohne ordnungsgemäße Belehrung; das Widerrufsrecht ist mit der Höchstfrist am '+dt(ende)+' erloschen ('+zitatHoechst+').');
  else if(phase==='puffer') A('belehrung','gelb','Ohne ordnungsgemäße Belehrung; die Höchstfrist ist am '+dt(ende)+' abgelaufen ('+zitatHoechst+').');
  else if(phase==='widerrufen'){ /* siehe Widerruf */ }
  else A('belehrung','rot','Keine ordnungsgemäße Belehrung vermerkt (fehlt: '+fehlt.join(', ')+'): Widerruf möglich bis '+(ende?dt(ende):'zur Höchstfrist')+' ('+zitatHoechst+'), auch nach Notartermin und Zahlung (BGH I ZR 30/15, I ZR 169/19, I ZR 28/22).');
  // Frist
  if(wr){
    if(phase==='offen') A('frist','gelb','Datum des Vertragsschlusses eintragen – dann rechnet die App die Widerrufsfrist.');
    else if(phase==='laeuft') A('frist','gelb',(belehrt?'Widerrufsfrist läuft bis ':'Widerruf möglich bis zur Höchstfrist am ')+dt(ende)+(belehrt?' (§§ 355, 356 Abs. 3, §§ 187, 188, 193 BGB).':'.'));
    else if(phase==='puffer') A('frist','gelb','Frist abgelaufen am '+dt(ende)+' – ein rechtzeitig abgesandter Widerruf kann noch eingehen (Puffer bis '+dt(puffer)+'; § 355 Abs. 1 Satz 5 BGB).');
    else if(phase==='abgelaufen'&&belehrt) A('frist','gruen','Widerrufsfrist abgelaufen am '+dt(ende)+'.');
    else if(phase==='erloschen') A('frist','gruen','Widerrufsrecht erloschen: Leistung mit dem Kaufvertrag am '+dt(U)+' erbracht, Verlangen, Bestätigung und Belehrung vor Beginn der Tätigkeit dokumentiert ('+zitatErloeschen+').');
    else if(phase==='widerrufen'){
      if(verspaetet) A('widerruf','gelb','Widerruf am '+dt(Wa)+' abgesandt, nach dem Fristende am '+dt(ende)+' – Wirksamkeit mit der Rechtsabteilung klären.');
      else A('widerruf','rot','Widerrufen'+(Wa?' (abgesandt am '+dt(Wa)+')':'')+(We?', eingegangen am '+dt(We):'')+': keine Provision fordern; eine gezahlte Provision spätestens '+(rueckzahlungBis?'bis '+dt(rueckzahlungBis):'14 Tage nach Eingang')+' zurückzahlen (§ 357 Abs. 1, § 355 Abs. 3 Satz 2 BGB).'+(Wa?'':' Absendedatum (Poststempel, E-Mail-Zeit) eintragen.'));
    }
    if(v.ausserhalbBW&&(phase==='laeuft'||phase==='puffer')) A('feiertage','gelb','Kunde wohnt außerhalb von Baden-Württemberg: Feiertage am Wohnort prüfen (§ 193 BGB).');
    // Notartermin vor Fristende ohne Verlangen
    const N=gueltig(o.notarTermin);
    if(N&&ende&&N<=ende&&!verlangenOk&&(phase==='laeuft'||phase==='offen')) A('notar','rot','Widerrufsfrist läuft bis '+dt(ende)+' – Leistung vor Fristablauf ohne Verlangen: kein Wertersatz (Notartermin '+dt(N)+'; § 357a Abs. 2 BGB).');
  } else if(gueltig(W.abgesandt)||gueltig(W.eingang)) A('widerruf','gelb','Widerruf erfasst, obwohl laut Eingaben kein Widerrufsrecht besteht – mit der Rechtsabteilung klären.');
  // Abschrift oder Bestätigung (§ 312f BGB)
  if(v.verbraucher!==false&&v.provision!==false&&typ!=='keins'){
    const Ab=v.abschrift||{}, Abd=gueltig(Ab.datum);
    if(aussenForm){
      if(Abd&&(Ab.form==='papier'||(Ab.form==='datentraeger'&&gueltig(v.zustimmung)))) A('abschrift','gruen','Abschrift oder Bestätigung übergeben am '+dt(Abd)+' (§ 312f Abs. 1 BGB).');
      else A('abschrift','gelb','Abschrift oder Bestätigung des Vertrags auf Papier übergeben – oder mit Zustimmung auf einem dauerhaften Datenträger (§ 312f Abs. 1 BGB).');
    } else {
      if(!Abd||!Ab.form) A('abschrift','gelb','Bestätigung des Vertrags auf einem dauerhaften Datenträger senden, spätestens vor Beginn der Tätigkeit (§ 312f Abs. 2 BGB).');
      else if(T&&Abd>T) A('abschrift','gelb','Bestätigung erst nach Beginn der Tätigkeit gesendet (§ 312f Abs. 2 BGB).');
      else A('abschrift','gruen','Bestätigung auf dauerhaftem Datenträger am '+dt(Abd)+' (§ 312f Abs. 2 BGB).');
    }
  }
  // Laufzeit des Alleinauftrags (Regeln zur Laufzeit selbst nicht geprüft)
  if(v.vertragsart==='allein'){
    const Lz=v.laufzeit||{}, bis=gueltig(Lz.bis), vor=Math.max(0,Math.round(+String(Lz.vorlauf==null?'14':Lz.vorlauf).replace(',','.')||0));
    if(!bis) A('laufzeit','gelb','Laufzeit des Alleinauftrags eintragen.');
    else if(heute&&heute>bis) A('laufzeit','gelb','Alleinauftrag abgelaufen am '+dt(bis)+' – verlängern oder beenden (Vordruck der Bank).');
    else if(heute&&heute>=F.plusTage(bis,-vor)) A('laufzeit','gelb','Alleinauftrag endet am '+dt(bis)+' – mit dem Eigentümer sprechen.');
    else A('laufzeit','gruen','Alleinauftrag läuft bis '+dt(bis)+'.');
  }

  /* ---- Ampel zur Provision ---- */
  const hat=id=>ampeln.find(a=>a.id===id);
  let prov;
  if(phase==='widerrufen'&&!verspaetet) prov={stufe:'rot',text:'Widerrufen – keine Provision'+(rueckzahlungBis?'; Rückzahlung bis '+dt(rueckzahlungBis):'')};
  else if(hat('textform')&&hat('textform').stufe==='rot') prov={stufe:'rot',text:'Textform fehlt – kein Provisionsanspruch'};
  else if(hat('online')&&hat('online').stufe==='rot') prov={stufe:'rot',text:'Schaltfläche „zahlungspflichtig …“ nicht geprüft'};
  else if(hat('belehrung')&&hat('belehrung').stufe==='rot') prov={stufe:'rot',text:'Nicht belehrt – Widerruf möglich bis '+(ende?dt(ende):'zur Höchstfrist')};
  else if(phase==='laeuft') prov={stufe:'gelb',text:'Widerrufsfrist läuft bis '+dt(ende)};
  else if(phase==='puffer') prov={stufe:'gelb',text:'Frist abgelaufen, Widerruf kann noch eingehen (bis '+dt(puffer)+')'};
  else if(phase==='offen') prov={stufe:'gelb',text:'Vertragsschluss eintragen'};
  else if(verspaetet) prov={stufe:'gelb',text:'Widerruf nach Fristende – klären'};
  else if(hat('online356a')) prov={stufe:'gelb',text:'Fristbeginn unsicher (Online-Abschluss)'};
  else prov={stufe:'gruen',text:!wr?'Kein Widerrufsrecht':phase==='erloschen'?'Widerrufsrecht erloschen':'Widerrufsfrist abgelaufen am '+dt(ende)};

  const stufen=['gruen','gelb','rot'];
  const gesamt=ampeln.concat([prov]).reduce((s,a)=>stufen.indexOf(a.stufe)>stufen.indexOf(s)?a.stufe:s,'gruen');
  return {typ,widerrufsrecht:wr,grund,vertragsschluss:gueltig(v.abschluss)||vorschlag,vorschlag,V,Vfrueh,belehrt,belehrungFehlt:wr?fehlt:[],
    nachgeholt:belehrt&&!!Vfrueh&&Bd>Vfrueh,abBelehrung:belehrt&&!!fr.nachgeholt,beginn:wr?fr.beginn:'',ende,hoechst:H,puffer,phase,erloschen,erloeschenFehlt:wr?ef:[],wertersatz,verlangenOk,
    widerrufen,verspaetet,rueckzahlungBis,beurkundet:U,ampeln,provision:prov,gesamt,
    zahl:{rot:ampeln.filter(a=>a.stufe==='rot').length,gelb:ampeln.filter(a=>a.stufe==='gelb').length}};
}

/* ---------- Wiedervorlagen (Kalender über die Liste „Wiedervorlagen“) ----------
   [{key, datum, text}] — Ende der Widerrufsfrist, Höchstfrist (nur ohne Belehrung), Rückzahlung nach Widerruf (o.bezahlt: false
   = Provision nachweislich nicht gezahlt), Ende des Alleinauftrags mit Vorlauf. */
function wiedervorlagen(v,p,o){
  o=o||{}; v=v||{}; const dt=typeof o.datum==='function'?o.datum:datumText, l=[];
  if(p.widerrufsrecht&&p.ende&&(p.phase==='laeuft'||p.phase==='offen')) l.push(p.belehrt?{key:'frist',datum:p.ende,text:'Ende der Widerrufsfrist am '+dt(p.ende)+' – Eingang eines Widerrufs bis '+dt(p.puffer)+' abwarten'}
    :{key:'hoechst',datum:p.ende,text:'Ende der Höchstfrist (nicht belehrt) am '+dt(p.ende)});
  if(p.widerrufen&&p.rueckzahlungBis&&o.bezahlt!==false) l.push({key:'rueckzahlung',datum:p.rueckzahlungBis,text:'Rückzahlung der Provision nach Widerruf spätestens am '+dt(p.rueckzahlungBis)});
  if(v.vertragsart==='allein'&&gueltig((v.laufzeit||{}).bis)){
    const vor=Math.max(0,Math.round(+String(v.laufzeit.vorlauf==null?'14':v.laufzeit.vorlauf).replace(',','.')||0));
    l.push({key:'laufzeit',datum:F.plusTage(v.laufzeit.bis,-vor),text:'Alleinauftrag endet am '+dt(v.laufzeit.bis)});
  }
  return l;
}

const ImmoMaklervertragRegeln={NEUFASSUNG,PUFFER_WERKTAGE,SEITEN,ARTEN,WEGE,WEG_FOLGE,TEXTFORMEN,BELEHRUNGSFORMEN,ABSCHRIFTFORMEN,
  gueltig,datumText,wegTyp,monateAbBeginn,hoechstfrist,werktagePlus,fristEnde,kandidaten,pruefen,wiedervorlagen};
wurzel.ImmoMaklervertragRegeln=ImmoMaklervertragRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoMaklervertragRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
