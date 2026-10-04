/* ImmoApp — Objektauskunft: Angaben des Eigentümers (D61), ohne Seitenbezug
   - Fragen je ja, nein oder unbekannt mit Erläuterung. Wohnungs- oder Teileigentum bringt zwei Fragen zur Eigentümergemeinschaft
     mit; die Nachfrage „ohne Genehmigung“ entfällt, wenn nichts umgebaut wurde.
   - Vorbelegung nur aus Feldern der gesicherten Bewertung (gelesen, nie geschrieben):
     Mängel (Aufnahmebogen au_maengel, Objektdaten maengel), Feuchtigkeit und Schädlinge (Stichworte darin), Baulasten
     (od_baulasten), Altlasten (od_altlasten), Rechte (od_abt2, rechte_lasten), Denkmalschutz (od_denkmal), Vermietung
     (vermietung_besch, nur ob vermietet), Wohnungseigentum (ek_modus, od_eigentum).
     Nicht übernommen: der Standardsatz der Bewertung zu Baumängeln (Beobachtung bei der Besichtigung, keine Angabe des
     Eigentümers), „nein“ beim Denkmalschutz (Vorgabe des Auswahlfelds — ob jemand es geprüft hat, lässt sich nicht erkennen)
     und Texte zur Vermietung (sie können Namen von Mietern enthalten).
   - Eine Unterschrift gilt für einen Stand: Prüfsumme über Objekt, Antworten, Mieten und Text der Bestätigung. Ändert sich
     etwas davon, gilt sie nicht mehr. Wer unterschreibt (Kunden-Ids), gehört nicht zum Stand. Gültig nur mit Bild-Daten
     (data:image/png, jpeg oder webp; D63) — die Prüfsumme lässt sich nachrechnen und schützt nicht vor fremden Werten.
   - Keine Rechtsaussagen: Hinweise verweisen auf Unterlagen, Gemeinde oder Notariat.
   Daten als ISO-Text (JJJJ-MM-TT); Monatsfrist über ImmoFristen (§§ 187, 188 BGB). */
(function(wurzel){
'use strict';
const FRISTEN=(typeof module==='object'&&module.exports&&typeof require==='function')?require('./fristen.js'):null;
const F=()=>FRISTEN||wurzel.ImmoFristen;

const ANTWORTEN=[['ja','ja'],['nein','nein'],['unbekannt','unbekannt']];
const GRUPPEN=[['gebaeude','Gebäude'],['recht','Grundstück und Rechte'],['miete','Vermietung'],['weg','Wohnungseigentum'],['sonst','Sonstiges']];
/* Unterlagen in der Kachel „Unterlagen“ (Schlüssel aus UL_LISTE), die bei „unbekannt“ weiterhelfen */
const UL={baugenehmigung:'Baugenehmigung und Baubeschreibung',baulasten:'Auskunft aus dem Baulastenverzeichnis',altlasten:'Auskunft zu Altlasten',
  grundbuch:'Grundbuchauszug',protokolle:'Protokolle der Eigentümerversammlungen und Beschlusssammlung'};
const FRAGEN=[
  {key:'maengel',gruppe:'gebaeude',kurz:'Bekannte Mängel',frage:'Sind Ihnen Mängel oder Schäden am Gebäude bekannt (z. B. Dach, Fassade, Fenster, Heizung, Leitungen)?',ph:'Was, wo, seit wann — und ob es behoben ist'},
  {key:'feuchtigkeit',gruppe:'gebaeude',kurz:'Feuchtigkeit',frage:'Gibt oder gab es Feuchtigkeit, Nässe oder Schimmel (z. B. im Keller, an Wänden, am Dach)?',ph:'Wo und wann; was dagegen getan wurde'},
  {key:'schaedlinge',gruppe:'gebaeude',kurz:'Schädlinge',frage:'Gibt oder gab es Befall durch Schädlinge (z. B. Holzwurm, Hausschwamm, Marder, Nagetiere)?',ph:'Was, wo, wann; ob behandelt'},
  {key:'umbauten',gruppe:'gebaeude',kurz:'Umbauten',frage:'Wurde das Gebäude umgebaut, angebaut oder erweitert, oder wurde die Nutzung geändert (z. B. Dachausbau, Wintergarten, Wohnung im Keller)?',ph:'Was und wann, z. B. Dachgeschoss 1998 ausgebaut'},
  {key:'ohneGenehmigung',gruppe:'gebaeude',kurz:'Umbauten ohne Genehmigung',frage:'Wurde davon etwas ohne Baugenehmigung oder abweichend von ihr ausgeführt?',ul:'baugenehmigung',ph:'Welcher Teil; ob eine Genehmigung beantragt ist'},
  {key:'baulasten',gruppe:'recht',kurz:'Baulasten',frage:'Sind Baulasten eingetragen oder bekannt (Baulastenverzeichnis der Gemeinde)?',ul:'baulasten',ph:'Welche Baulast, zugunsten welches Flurstücks'},
  {key:'altlasten',gruppe:'recht',kurz:'Altlasten',frage:'Gibt es Altlasten oder einen Verdacht darauf (z. B. alter Öltank, frühere gewerbliche Nutzung, Auffüllungen)?',ul:'altlasten',ph:'Was ist bekannt; gibt es Gutachten'},
  {key:'rechte',gruppe:'recht',kurz:'Wege- und Leitungsrechte',frage:'Bestehen Wege-, Leitungs- oder andere Rechte Dritter am Grundstück — auch ohne Eintrag im Grundbuch?',ul:'grundbuch',ph:'Welches Recht, zugunsten wessen (Flurstück, Versorger)'},
  {key:'denkmal',gruppe:'recht',kurz:'Denkmalschutz',frage:'Steht das Gebäude unter Denkmalschutz oder gehört es zu einer geschützten Gesamtanlage?',ph:'z. B. Kulturdenkmal, Ensembleschutz, Auflagen'},
  {key:'vermietet',gruppe:'miete',kurz:'Vermietung',frage:'Ist das Objekt ganz oder teilweise vermietet oder verpachtet?',ph:'z. B. EG vermietet seit 2019, unbefristet — ohne Namen der Mieter'},
  {key:'sonderumlage',gruppe:'weg',weg:true,kurz:'Sonderumlagen',frage:'Hat die Eigentümergemeinschaft Sonderumlagen beschlossen, die noch fällig werden oder offen sind?',ul:'protokolle',ph:'Wofür, Beschluss vom, fällig am'},
  {key:'verfahren',gruppe:'weg',weg:true,kurz:'Laufende Verfahren',frage:'Laufen Verfahren der Gemeinschaft, z. B. Anfechtung von Beschlüssen oder ein Rechtsstreit mit Verwaltung, Bauträger oder Nachbarn?',ul:'protokolle',ph:'Worum es geht, Stand'},
  {key:'sonstiges',gruppe:'sonst',kurz:'Sonstiges',frage:'Gibt es sonst etwas, das für Kaufinteressenten wichtig sein kann (z. B. Streit mit Nachbarn, Brand- oder Wasserschaden, Überschwemmung)?',ph:'Was ist passiert, wann'}
];
const STANDARD_MAENGEL='Wesentliche Bauschäden und Baumängel waren bei der Ortsbesichtigung nicht erkennbar.';

/* ---------- Texte der Bewertung lesen ---------- */
const sauber=x=>String(x==null?'':x).trim();
const UNBEKANNT=/^(?:unbekannt|nicht\s+bekannt|ungekl(?:ä|ae)rt|ungepr(?:ü|ue)ft|offen\b|\?)/i;
const NEGATIV=/^(?:[-–—\/]+(?:\s|$)|nein\b|nicht\s+vorhanden|kein(?:erlei|e|en|er|es)?\b|ohne\b)/i;
function unbekanntText(t){ return UNBEKANNT.test(sauber(t)); }
function negativ(t){ t=sauber(t); return !!t&&!unbekanntText(t)&&NEGATIV.test(t); }
function verneint(t){ return /(?:^|[^a-zäöüß])(?:kein(?:erlei|e|en|er|es)?|nicht|ohne)(?:$|[^a-zäöüß])/i.test(String(t||'')); }
/* Stichworte: getrennt an Semikolon, Komma, Zeilenende oder Satzende vor einem Großbuchstaben */
function fragmente(t){ return String(t||'').split(/[;,\n]+|\.\s+(?=[A-ZÄÖÜ])/).map(x=>x.trim().replace(/\.$/,'')).filter(Boolean); }
const FEUCHT=/feucht|n(?:ä|ae)sse|\bnass|schimmel|wasserschaden|wasserfleck|stockfleck|salpeter/i;
const SCHAED=/holzwurm|hausschwamm|schwammbefall|sch(?:ä|ae)dling|marder|ratten|m(?:ä|ae)use|termiten|wespennest|holzbock|befall/i;
const VERM=/vermietet|verpachtet|mietvertr|\bmieter/i;
const EIGEN=/eigengenutzt|eigennutzung|selbst\s?genutzt|selbstgenutzt|leer\s?stehend|leerstand|bezugsfrei|nicht\s+vermietet/i;
const einmal=l=>l.filter((x,i)=>l.indexOf(x)===i);

/* Vorschläge aus den Feldern der gesicherten Bewertung: {antworten:{schluessel:{wert,text,von}}, weg} */
function ausBewertung(f){
  f=f||{}; const a={}, t=k=>sauber(f[k]);
  const setz=(key,wert,text,von)=>{ a[key]={wert,text:text||'',von:von||''}; };
  let mae=[], von=[];
  if(t('au_maengel')&&!negativ(t('au_maengel'))){ mae.push(t('au_maengel')); von.push('Aufnahmebogen'); }
  const m=t('maengel'); if(m&&m!==STANDARD_MAENGEL&&!negativ(m)){ mae.push(m); von.push('Objektdaten'); }
  if(mae.length) setz('maengel','ja',mae.join('; '),'Mängel ('+von.join(', ')+')');
  const stellen=re=>einmal(mae.flatMap(fragmente).filter(x=>re.test(x)&&!verneint(x)));
  const fe=stellen(FEUCHT); if(fe.length) setz('feuchtigkeit','ja',fe.join('; '),'Mängel ('+von.join(', ')+')');
  const sc=stellen(SCHAED); if(sc.length) setz('schaedlinge','ja',sc.join('; '),'Mängel ('+von.join(', ')+')');
  [['baulasten','od_baulasten','Baulasten (Objektdaten)'],['altlasten','od_altlasten','Altlasten (Objektdaten)']].forEach(([k,feld,v])=>{
    const x=t(feld); if(!x) return;
    if(unbekanntText(x)) setz(k,'unbekannt','',v); else if(negativ(x)) setz(k,'nein','',v); else setz(k,'ja',x,v); });
  const abt2=t('od_abt2'), rl=t('rechte_lasten'), teile=[];
  if(abt2&&!negativ(abt2)&&!unbekanntText(abt2)) teile.push('Grundbuch Abt. II: '+abt2);
  if(rl&&!negativ(rl)&&!unbekanntText(rl)) teile.push(rl);
  if(teile.length) setz('rechte','ja',teile.join('; '),'Rechte und Lasten (Objektdaten)');
  else if(abt2&&negativ(abt2)) setz('rechte','nein','','Grundbuch Abt. II (Objektdaten)');
  else if(abt2&&unbekanntText(abt2)) setz('rechte','unbekannt','','Grundbuch Abt. II (Objektdaten)');
  const d=t('od_denkmal');
  if(/^ja\b/i.test(d)) setz('denkmal','ja',/kulturdenkmal/i.test(d)?'Kulturdenkmal':d.replace(/^ja\s*/i,'').replace(/^\((.*)\)$/,'$1'),'Denkmalschutz (Objektdaten)');
  else if(/ensemble|gesamtanlage|^teil/i.test(d)) setz('denkmal','ja',d,'Denkmalschutz (Objektdaten)');
  const vb=fragmente(t('vermietung_besch'));
  if(vb.some(x=>VERM.test(x)&&!verneint(x))) setz('vermietet','ja','','Vermietungssituation (Objektdaten)');
  else if(vb.some(x=>EIGEN.test(x))) setz('vermietet','nein','','Vermietungssituation (Objektdaten)');
  const weg=t('ek_modus')==='wohnung'||/wohnungseigentum|teileigentum|\bweg\b/i.test(t('od_eigentum'));
  return {antworten:a,weg};
}
/* Vorschläge eintragen — nur in leere Antworten; bw merkt sich den Vorschlag für die Anzeige der Herkunft. Gibt die Zahl zurück. */
function anwenden(r,v){
  if(!r||!v) return 0;
  if(!r.antworten||typeof r.antworten!=='object'||Array.isArray(r.antworten)) r.antworten={};
  let n=0;
  Object.keys(v.antworten||{}).forEach(k=>{ const a=r.antworten[k], x=v.antworten[k];
    if(!x||(a&&(a.wert||sauber(a.text)))) return;
    r.antworten[k]={wert:x.wert,text:x.text||'',bw:{wert:x.wert,text:x.text||'',von:x.von||''}}; n++; });
  if(typeof r.weg!=='boolean') r.weg=!!v.weg;
  return n;
}
/* 'bewertung' = unverändert übernommen, 'geaendert' = übernommen und geändert, '' = selbst eingetragen */
function herkunft(a){
  if(!a||!a.bw) return '';
  return a.wert===a.bw.wert&&sauber(a.text)===sauber(a.bw.text)?'bewertung':'geaendert';
}
function antwort(r,k){ return (((r||{}).antworten||{})[k]||{}).wert||''; }
/* Fragen, die für diesen Eintrag gelten */
function fragenFuer(r){ r=r||{}; return FRAGEN.filter(q=>(!q.weg||r.weg===true)&&!(q.key==='ohneGenehmigung'&&antwort(r,'umbauten')==='nein')); }

/* ---------- Unterschrift: Prüfsumme über den Stand ---------- */
/* cyrb53 — kurze, stabile Prüfsumme (kein Schutz gegen Fälschung, nur Erkennen von Änderungen) */
function pruefsumme(s){
  let h1=0xdeadbeef, h2=0x41c6ce57; s=String(s);
  for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,2654435761); h2=Math.imul(h2^c,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0');
}
/* Stand: Objekt, Wohnungseigentum, alle Antworten mit Erläuterung, Mieten, Sonderumlage und Text der Bestätigung (Leerraum egal) */
function inhaltSchluessel(r,text){
  r=r||{}; const A=r.antworten||{}, M=r.mieten||{}, n=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
  const teile=['o='+n(r.projektId),'w='+(r.weg===true?1:0)].concat(FRAGEN.map(q=>q.key+'='+n((A[q.key]||{}).wert)+'|'+n((A[q.key]||{}).text)),
    ['m='+n(M.anzahl)+'|'+n(M.kaltmiete)+'|'+n(M.kaution),'s='+n(r.sonderumlageBetrag),'t='+n(text==null?r.text:text)]);
  return pruefsumme(teile.join('\n'));
}
/* Unterschrift nur als Bild-Daten (PNG, JPEG, WebP) — alles andere (z. B. aus einer eingespielten Sicherung) gilt nicht und kommt nie ins Dokument */
const BILD=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/;
function bildGueltig(b){ return typeof b==='string'&&BILD.test(b); }
function gueltigeUnterschriften(r,schluessel){
  const u=(r&&r.unterschriften)||{};
  return ((r&&r.kundeIds)||[]).filter(k=>u[k]&&bildGueltig(u[k].bild)&&u[k].inhalt===schluessel);
}
/* Unterschriften entfernen, die nicht mehr zum Stand passen, kein Bild sind oder zu niemandem mehr gehören; gibt die Zahl zurück */
function ungueltigeEntfernen(r,schluessel){
  if(!r||!r.unterschriften||typeof r.unterschriften!=='object') return 0;
  let n=0; Object.keys(r.unterschriften).forEach(k=>{ const u=r.unterschriften[k];
    if(!u||!bildGueltig(u.bild)||u.inhalt!==schluessel||!(r.kundeIds||[]).includes(k)){ delete r.unterschriften[k]; n++; } });
  return n;
}

/* ---------- Prüfung ---------- */
function zahl(x){ const s=String(x==null?'':x).trim().replace(/\s|€/g,''); if(!s) return 0;
  const v=parseFloat(/,/.test(s)?s.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s); return isFinite(v)?v:0; }
/* Namen von Personen in einer Erläuterung? („Herr Muster“, „Frau Dr. Beispiel“, „Familie Probe“) */
function mieterNamenVerdacht(t){ return /(?:^|[^A-Za-zÄÖÜäöüß])(?:Herrn?|Frau|Fam\.|Familie|Eheleute|Ehepaar)\s+(?:Dr\.\s*)?[A-ZÄÖÜ][a-zäöüß]/.test(String(t||'')); }
function deDatum(iso){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||'')); return m?m[3]+'.'+m[2]+'.'+m[1]:'–'; }
function isoDatum(x){ return /^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):''; }
/* o = {schluessel (Stand mit dem Text der Bestätigung), datum (Formatierer), textVorschlag (Text ist der Vorschlag der App)} */
function pruefen(r,heute,o){
  r=r||{}; o=o||{}; const fmt=o.datum||deDatum, A=r.antworten||{}, l=[];
  const fragen=fragenFuer(r), wert=k=>(A[k]||{}).wert||'', text=k=>sauber((A[k]||{}).text);
  const offen=fragen.filter(q=>!ANTWORTEN.some(([w])=>w===wert(q.key)));
  const ja=fragen.filter(q=>wert(q.key)==='ja'), unb=fragen.filter(q=>wert(q.key)==='unbekannt');
  const vorbelegt=fragen.filter(q=>herkunft(A[q.key])==='bewertung');
  const kunden=(r.kundeIds||[]).filter(Boolean), schl=o.schluessel!=null?o.schluessel:inhaltSchluessel(r);
  const gueltig=gueltigeUnterschriften(r,schl);
  const daten=gueltig.map(k=>isoDatum(r.unterschriften[k].datum)||isoDatum(String(r.unterschriften[k].zeit||'').slice(0,10))).filter(Boolean).sort();
  const am=daten.length?daten[daten.length-1]:'';
  const fertig=kunden.length>0&&!offen.length&&gueltig.length===kunden.length;
  if(!kunden.length) l.push({stufe:'rot',text:'Eigentümer aus der Kundenakte wählen — er unterschreibt hier auf dem Gerät.'});
  if(offen.length) l.push({stufe:'rot',text:(offen.length===1?'1 Frage ist':offen.length+' Fragen sind')+' noch nicht beantwortet: '+offen.map(q=>q.kurz).join(', ')+'.'});
  const M=r.mieten||{}, mieten=zahl(M.anzahl)>0&&zahl(M.kaltmiete)>0;
  ja.filter(q=>!text(q.key)&&!(q.key==='vermietet'&&mieten)).forEach(q=>l.push({stufe:'gelb',text:'„'+q.kurz+'“ mit „ja“ beantwortet — bitte kurz erläutern.'}));
  if(wert('vermietet')==='ja'&&!mieten) l.push({stufe:'gelb',text:'Vermietung: Zahl der vermieteten Einheiten und Summe der Nettokaltmieten eintragen — ohne Namen der Mieter.'});
  if(mieterNamenVerdacht(text('vermietet'))) l.push({stufe:'gelb',text:'Vermietung: bitte keine Namen von Mietern eintragen — Zahl und Summen genügen.'});
  if(r.weg===true&&wert('sonderumlage')==='ja'&&!(zahl(r.sonderumlageBetrag)>0)) l.push({stufe:'gelb',text:'Sonderumlage: Anteil dieser Wohnung als Betrag eintragen.'});
  if(fragen.some(q=>q.key==='ohneGenehmigung')&&wert('ohneGenehmigung')==='ja') l.push({stufe:'gelb',text:'Umbauten ohne Genehmigung: vor dem Notartermin mit dem Notariat klären.'});
  unb.filter(q=>q.ul).forEach(q=>l.push({stufe:'gelb',text:'„'+q.kurz+'“ unbekannt — '+UL[q.ul]+' in der Kachel „Unterlagen“ anfordern.',ul:q.ul}));
  if(wert('denkmal')==='unbekannt') l.push({stufe:'gelb',text:'Denkmalschutz unbekannt — bei der Gemeinde nachfragen.'});
  if(vorbelegt.length&&!fertig) l.push({stufe:'gelb',text:(vorbelegt.length===1?'1 Antwort':vorbelegt.length+' Antworten')+' aus der Bewertung vorbelegt ('+vorbelegt.map(q=>q.kurz).join(', ')+') — mit dem Eigentümer durchgehen.'});
  if(o.textVorschlag&&!fertig) l.push({stufe:'gelb',text:'Der Text der Bestätigung ist ein Vorschlag der App — mit der Rechtsabteilung abstimmen und als Vorgabe der Bank hinterlegen.'});
  if(kunden.length&&!offen.length&&!fertig) l.push({stufe:'gelb',text:(gueltig.length?'Unterschrieben: '+gueltig.length+' von '+kunden.length+'.':'Noch nicht unterschrieben.')+' Die Eigentümer unterschreiben unten auf dem Gerät.'});
  if(fertig){
    l.push({stufe:'gruen',text:(kunden.length>1?'Von allen '+kunden.length+' Eigentümern unterschrieben, zuletzt am ':'Vom Eigentümer unterschrieben am ')+fmt(am)+'.'});
    const bis=am&&F()?F().fristMonate(am,6):'';
    if(bis&&heute&&heute>bis) l.push({stufe:'gelb',text:'Unterschrieben am '+fmt(am)+' — sechs Monate sind am '+fmt(bis)+' abgelaufen. Mit dem Eigentümer prüfen, ob die Angaben noch stimmen.'});
  }
  return {liste:l,fragen,gesamt:fragen.length,beantwortet:fragen.length-offen.length,offen:offen.map(q=>q.key),ja:ja.map(q=>q.key),
    unbekannt:unb.map(q=>q.key),vorbelegt:vorbelegt.map(q=>q.key),kunden:kunden.length,gueltig,unterschrieben:gueltig.length,am,fertig,
    rot:l.filter(x=>x.stufe==='rot').length};
}

const ImmoObjektauskunftRegeln={FRAGEN,ANTWORTEN,GRUPPEN,UL,STANDARD_MAENGEL,ausBewertung,anwenden,herkunft,fragenFuer,antwort,pruefsumme,
  inhaltSchluessel,bildGueltig,gueltigeUnterschriften,ungueltigeEntfernen,pruefen,mieterNamenVerdacht,negativ,unbekanntText,fragmente,zahl,deDatum};
wurzel.ImmoObjektauskunftRegeln=ImmoObjektauskunftRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoObjektauskunftRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
