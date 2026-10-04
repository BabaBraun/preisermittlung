/* ImmoApp — Geldwäsche-Prüfung je Verkauf (Kachel „Geldwäsche-Prüfung“), Prüfregeln ohne Seitenbezug
   Grundlage: GwG in der Fassung der Änderung durch Art. 12 Abs. 4 G v. 29.06.2026 (BGBl. 2026 I Nr. 197), am Wortlaut geprüft.
   - Die Bank ist als Kreditinstitut verpflichtet (§ 2 Abs. 1 Nr. 1 GwG) und mit der Immobilienvermittlung zusätzlich als
     Immobilienmakler (§ 2 Abs. 1 Nr. 14, § 1 Abs. 11 GwG). Maßgebliche Transaktion ist der vermittelte Kaufvertrag (§ 1 Abs. 5 Satz 2).
   - Beim Kauf gelten die Pflichten ohne Schwelle, bei Miete und Pacht ab 10.000 € Nettokaltmiete im Monat (§ 10 Abs. 6 GwG).
   - Je Person: identifizieren (§ 10 Abs. 1 Nr. 1, § 11 Abs. 2 und 4), Berechtigung der auftretenden Person prüfen (Nr. 1),
     wirtschaftlich Berechtigten abklären (Nr. 2, § 3, § 11 Abs. 5 und 6), Zweck (Nr. 3), PEP-Abgleich (Nr. 4). Früher von der
     Bank identifiziert: neue Identifizierung entbehrlich, Vermerk aufzeichnen (§ 11 Abs. 3, § 8 Abs. 2 Satz 5); Nr. 2 bis 4 bleiben.
   - Gegenseite mit eigenem Makler: nur die eigene Partei identifizieren (§ 11 Abs. 2 Satz 2).
   - Ohne Nr. 1 bis 4 keine Transaktion (§ 10 Abs. 9); verspätete Identifizierung ist bußgeldbewehrt (§ 56 Abs. 1 Satz 1 Nr. 27).
   Die App hält nur fest, DASS etwas im Banksystem erledigt ist — mit Datum und Kürzel. Ausweisdaten, Geburtsdaten,
   Staatsangehörigkeit, PEP-Ergebnis, Herkunft der Mittel und Verdachtsmomente gehören ins Banksystem (§ 8 Abs. 1 und 2,
   § 11 Abs. 4 GwG) bzw. ausschließlich zum Geldwäschebeauftragten (§ 43, § 47 GwG); dafür gibt es keine Felder (bereinigen()).
   Auslöser und Normen stehen als Datentabelle hier; die EU-Geldwäscheverordnung (AMLR, gilt ab 10.07.2027) ist als zweites
   Regelwerk vorgesehen, damit die Umstellung nur eine Einstellung ist. Alle Daten als ISO-Text (JJJJ-MM-TT). */
(function(wurzel){
'use strict';
const FASSUNG='Geldwäschegesetz vom 23. Juni 2017 (BGBl. I S. 1822), zuletzt geändert durch Art. 12 Abs. 4 des Gesetzes vom 29. Juni 2026 (BGBl. 2026 I Nr. 197)';
const FASSUNG_KURZ='GwG, zuletzt geändert am 29.06.2026';
const NORMEN={
  verpflichtet:'§ 1 Abs. 11, § 2 Abs. 1 Nr. 1 und 14 GwG',
  kauf:'§ 10 Abs. 6 Nr. 1 GwG',
  miete:'§ 10 Abs. 6 Nr. 2 GwG',
  identifizierung:'§ 10 Abs. 1 Nr. 1, § 11 Abs. 2 und 4 GwG',
  vertretung:'§ 10 Abs. 1 Nr. 1 GwG',
  wb:'§ 10 Abs. 1 Nr. 2, § 11 Abs. 6 Satz 3 und 5 GwG',
  wbGesellschaft:'§ 10 Abs. 1 Nr. 2, § 11 Abs. 5 Satz 3, § 12 Abs. 3 GwG',
  wbZeile:'§ 10 Abs. 1 Nr. 2, § 3 GwG',
  zweck:'§ 10 Abs. 1 Nr. 3 GwG',
  pep:'§ 10 Abs. 1 Nr. 4 GwG',
  ueberwachung:'§ 10 Abs. 1 Nr. 5 GwG',
  frueher:'§ 11 Abs. 3 Satz 1, § 8 Abs. 2 Satz 5 GwG',
  frueherNeu:'§ 11 Abs. 3 Satz 2 GwG',
  makler:'§ 11 Abs. 2 Satz 2 GwG',
  zeitpunkt:'§ 11 Abs. 2 Satz 1 GwG',
  geschaeftsbeziehung:'§ 10 Abs. 3 Satz 1 Nr. 1, § 11 Abs. 1 GwG',
  abbruch:'§ 10 Abs. 9 GwG',
  verspaetet:'§ 56 Abs. 1 Satz 1 Nr. 27 GwG',
  aufzeichnung:'§ 8 Abs. 1 und 2, § 11 Abs. 4 GwG',
  aufbewahrung:'§ 8 Abs. 3 und 4 GwG',
  bargeld:'§ 16a Abs. 1 GwG',
  zahlungsnachweis:'§ 16a Abs. 2 Satz 2 GwG',
  verdacht:'§ 43 Abs. 1 GwG',
  offenlegung:'§ 43 Abs. 1 Nr. 3 GwG',
  unstimmigkeit:'§ 23a Abs. 1 GwG',
  weitergabe:'§ 47 Abs. 1 GwG',   // nur Meldung, Ermittlungsverfahren, Auskunftsverlangen — nicht der Identifizierungsstand
  datenminimierung:'Art. 5 Abs. 1 lit. c DSGVO',
  beauftragter:'§ 7 Abs. 1 GwG',
  technik:'§ 6 Abs. 2 Nr. 4 GwG',
  amlr:'Art. 23 Abs. 1 UAbs. 2, Art. 90 VO (EU) 2024/1624'
};
/* Auslöser: was im Verkauf geschehen ist (Fakten aus Fahrplan-Stand, Bieterverfahren und Notarauftrag) */
const AUSLOESER={
  auftrag:'Auftrag erteilt oder Maklervertrag geschlossen',
  gebot:'Gebot im Bieterverfahren angenommen',
  reserviert:'Käufer gefunden, Objekt reserviert',
  notar:'Notarauftrag angelegt'
};
/* Regelwerke: ab wann eine Seite gelb (bald fällig) oder rot (fällig) ist. Rot, sobald ernsthaftes Interesse besteht und die
   Vertragsparteien hinreichend bestimmt sind (§ 11 Abs. 2 Satz 1 GwG): angenommenes Gebot, Reservierung, Notarauftrag — für beide
   Seiten. Gelb (Verkäufer ab Auftrag) ist eine Vorwarnung der App; der Geldwäschebeauftragte bestätigt oder ändert die Grenzen. */
const REGELWERKE={
  gwg:{titel:'Geldwäschegesetz (Stand 29.06.2026)',ab:'',
    kaeufer:{gelb:[],rot:['gebot','reserviert','notar'],norm:NORMEN.zeitpunkt+', '+NORMEN.abbruch},
    verkaeufer:{gelb:['auftrag'],rot:['gebot','reserviert','notar'],norm:NORMEN.geschaeftsbeziehung+'; '+NORMEN.zeitpunkt}},
  amlr:{titel:'EU-Geldwäscheverordnung AMLR (ab 10.07.2027)',ab:'2027-07-10',
    kaeufer:{gelb:[],rot:['gebot','reserviert','notar'],norm:NORMEN.amlr},
    verkaeufer:{gelb:['auftrag'],rot:['gebot','reserviert','notar'],norm:NORMEN.amlr+'; '+NORMEN.geschaeftsbeziehung}}
};
const ROLLEN=[['verkaeufer','Verkäufer'],['kaeufer','Käufer'],['vertreter','Auftretende Person'],['wb','Wirtschaftlich Berechtigter']];
const SEITEN=[['verkaeufer','Verkäufer'],['kaeufer','Käufer']];
const ARTEN=[['person','natürliche Person'],['gesellschaft','Gesellschaft oder juristische Person']];
const VERTRETUNG=[['bevollmaechtigt','Bevollmächtigter'],['betreuer','Betreuer'],['tv','Testamentsvollstrecker'],['eltern','Eltern (gesetzliche Vertreter)'],
  ['organ','Geschäftsführer oder Vorstand'],['andere','andere auftretende Person']];
const IDENT=[['offen','offen'],['erledigt','im Banksystem erledigt'],['frueher','bereits früher identifiziert, Vermerk im Banksystem']];
const ZWECK=[['','– wählen –'],['eigennutzung','Eigennutzung'],['kapitalanlage','Kapitalanlage'],['verkauf','Verkauf']];
const GRUENDE=[['makler','Gegenseite hat eigenen Makler'],['miete','Mietvermittlung unter 10.000 € Nettokaltmiete im Monat']];
const MIETE_SCHWELLE=10000;
const RANG={gruen:0,grau:0,offen:1,gelb:2,rot:3};
const STUFE_NACH_RANG=['gruen','offen','gelb','rot'];
/* nur diese Felder gibt es — alles andere (Ausweis, Geburtsdaten, PEP-Ergebnis, Verdacht, Freitext) wird beim Speichern verworfen */
const ZEILE_FELDER=['id','kundeId','rolle','seite','art','vertretungArt','erforderlich','grund','maklerFirma','identifizierung','datum','kuerzel',
  'vertretungGeprueft','vertretungAm','wbAbgeklaert','wbAm','pepImBanksystem','pepAm','zweck','abschluss','abschlussAm','abschlussKuerzel'];
const VORGANG_FELDER=['id','art','ts','geaendert','projektId','kundeIds','personen','notarUebermittelt','geschaeft','nettokaltmiete'];

const istDatum=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')); if(!m) return false; const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); return d.toISOString().slice(0,10)===s; };
const name=(liste,k)=>(liste.find(x=>x[0]===k)||['',''])[1];
/* Datum einer Erledigung: '' = in Ordnung, sonst 'leer', 'ungueltig' oder 'zukunft' (ein Datum in der Zukunft wird abgelehnt) */
function datumPruefen(d,heute){ if(!d) return 'leer'; if(!istDatum(d)) return 'ungueltig'; return heute&&d>heute?'zukunft':''; }
/* abgehakter Punkt: was noch fehlt (Datum leer, ungültig oder in der Zukunft; Kürzel, wenn kz===false) → {ok, m:[Texte], zusatz} */
function haken(an,d,kz,heute){
  const p=datumPruefen(d,heute), m=an?[p==='zukunft'?'Datum liegt in der Zukunft':p?'Datum eintragen':'',kz===false?'Kürzel „durch wen“ eintragen':''].filter(Boolean):[];
  return {ok:!!an&&!m.length,m,zusatz:m.length?' ('+m.join(', ')+')':''};
}
/* Kürzel „durch wen“: nur Buchstaben, Ziffern, Punkt und Bindestrich, höchstens acht Zeichen — keine Namen */
function kuerzel(t){ return String(t||'').replace(/[^A-Za-zÄÖÜäöüß0-9.\-]/g,'').slice(0,8); }
function zahl(x){ if(typeof x==='number') return isFinite(x)?x:0; const s=String(x||'').trim().replace(/\s|€/g,''); if(!s) return 0;
  const n=Number(/,/.test(s)?s.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s); return isFinite(n)?n:0; }

/* Auslöser je Seite: {stufe:'rot'|'gelb'|'', gruende:[Texte], norm} */
function seitenAusloeser(seite,fakten,regelwerk){
  const R=(REGELWERKE[regelwerk]||REGELWERKE.gwg)[seite]; fakten=fakten||{};
  if(!R) return {stufe:'',gruende:[],norm:''};
  const rot=R.rot.filter(k=>fakten[k]), gelb=R.gelb.filter(k=>fakten[k]);
  if(rot.length) return {stufe:'rot',gruende:rot.map(k=>AUSLOESER[k]),norm:R.norm};
  if(gelb.length) return {stufe:'gelb',gruende:gelb.map(k=>AUSLOESER[k]),norm:R.norm};
  return {stufe:'',gruende:[],norm:R.norm};
}
/* Punkte der Checkliste, die für eine Zeile gelten (ohne Abschluss): [{key, text, norm, ok}] */
function punkte(z,zeilen,heute){
  z=z||{}; zeilen=Array.isArray(zeilen)?zeilen:[];
  const partei=z.rolle==='verkaeufer'||z.rolle==='kaeufer', ges=partei&&z.art==='gesellschaft', l=[];
  const id=haken(z.identifizierung==='erledigt'||z.identifizierung==='frueher',z.datum,!!kuerzel(z.kuerzel),heute);
  l.push({key:'identifizierung',text:(z.identifizierung==='frueher'?'Vermerk „bereits früher identifiziert“ mit Datum und Kürzel':'Identifizierung im Banksystem mit Datum und Kürzel')+id.zusatz,
    norm:z.identifizierung==='frueher'?NORMEN.frueher:NORMEN.identifizierung,ok:id.ok});
  if(z.rolle==='vertreter'){ const h=haken(z.vertretungGeprueft,z.vertretungAm,undefined,heute);
    l.push({key:'vertretung',text:'Berechtigung der auftretenden Person geprüft'+h.zusatz,norm:NORMEN.vertretung,ok:h.ok}); }
  if(partei){
    const h=haken(z.wbAbgeklaert,z.wbAm,undefined,heute);
    l.push({key:'wb',text:(ges?'Wirtschaftlich Berechtigte beim Vertragspartner erhoben und mit dem Transparenzregister abgeglichen':'Handelt auf eigene Rechnung — abgefragt')+h.zusatz,
      norm:ges?NORMEN.wbGesellschaft:NORMEN.wb,ok:h.ok});
    if(ges){
      l.push({key:'wbZeile',text:'Wirtschaftlich Berechtigte als eigene Zeile erfasst',norm:NORMEN.wbZeile,ok:zeilen.some(x=>x&&x.rolle==='wb'&&x.seite===z.seite)});
      l.push({key:'vertreterZeile',text:'Für die Gesellschaft auftretende Person (z. B. Geschäftsführer) als eigene Zeile erfasst',norm:NORMEN.vertretung,ok:zeilen.some(x=>x&&x.rolle==='vertreter'&&x.seite===z.seite)});
    }
    l.push({key:'zweck',text:'Zweck geklärt (Eigennutzung, Kapitalanlage oder Verkauf)',norm:NORMEN.zweck,ok:ZWECK.some(x=>x[0]&&x[0]===z.zweck)});
  }
  if(partei||z.rolle==='wb'){ const h=haken(z.pepImBanksystem,z.pepAm,undefined,heute); l.push({key:'pep',text:'PEP-Abgleich im Banksystem erledigt'+h.zusatz,norm:NORMEN.pep,ok:h.ok}); }
  return l;
}
/* Ausnahme „nicht erforderlich“ gültig? → {gilt, text, fehlt} */
function ausnahme(z,ctx){
  ctx=ctx||{};
  if(z.erforderlich!=='nein') return {gilt:false,text:'',fehlt:''};
  if(z.grund==='makler') return (String(z.maklerFirma||'').trim()
    ?{gilt:true,text:'nicht erforderlich: Gegenseite hat eigenen Makler ('+String(z.maklerFirma).trim()+') — '+NORMEN.makler,fehlt:''}
    :{gilt:false,text:'',fehlt:'Name der Maklerfirma der Gegenseite'});
  if(z.grund==='miete'){
    const m=zahl(ctx.nettokaltmiete);
    if(ctx.geschaeft!=='miete') return {gilt:false,text:'',fehlt:'Ausnahme gilt nur für Miet- oder Pachtverträge'};
    if(!(m>0)) return {gilt:false,text:'',fehlt:'Nettokaltmiete im Monat'};
    if(m>=MIETE_SCHWELLE) return {gilt:false,text:'',fehlt:'Ab 10.000 € Nettokaltmiete gilt dieselbe Liste wie beim Kauf ('+NORMEN.miete+')'};
    return {gilt:true,text:'nicht erforderlich: Mietvermittlung unter 10.000 € Nettokaltmiete im Monat — '+NORMEN.miete,fehlt:''};
  }
  return {gilt:false,text:'',fehlt:'Grund, warum die Prüfung nicht erforderlich ist'};
}
/* eine Zeile auswerten. ctx={heute, zeilen, ausloeser:{stufe}, geschaeft, nettokaltmiete, notarUebermittelt}
   → {id, seite, rolle, stufe:'gruen'|'grau'|'offen'|'gelb'|'rot', fehlt:[Punkte], pflichtFehlt:[Punkte], text, nachtraeglich, identifiziert} */
function zeileAuswerten(z,ctx){
  z=z||{}; ctx=ctx||{};
  const heute=ctx.heute, ausl=(ctx.ausloeser&&ctx.ausloeser.stufe)||'';
  const basis={id:z.id||'',seite:z.seite||'',rolle:z.rolle||'',nachtraeglich:false};
  const a=ausnahme(z,ctx);
  if(a.gilt) return Object.assign(basis,{stufe:'grau',fehlt:[],pflichtFehlt:[],text:a.text,identifiziert:true});
  const p=punkte(z,ctx.zeilen,heute), pflichtFehlt=p.filter(x=>!x.ok);
  if(a.fehlt) pflichtFehlt.unshift({key:'ausnahme',text:a.fehlt,norm:z.grund==='makler'?NORMEN.makler:NORMEN.miete,ok:false});
  const identOk=p.find(x=>x.key==='identifizierung').ok;
  const ab=haken(z.abschluss,z.abschlussAm,!!kuerzel(z.abschlussKuerzel),heute), abschlussOk=ab.ok;   // abgehakt, aber z. B. ohne Kürzel: genau das nennen
  const fehlt=pflichtFehlt.concat(!pflichtFehlt.length&&!abschlussOk?[{key:'abschluss',text:'Abschluss: '+(ab.m.length?ab.m.join(', '):'Sorgfaltspflichten im Banksystem vollständig dokumentiert'),norm:NORMEN.aufzeichnung,ok:false}]:[]);
  const nachtraeglich=identOk&&istDatum(ctx.notarUebermittelt)&&z.datum>ctx.notarUebermittelt;
  let stufe, text;
  if(pflichtFehlt.length){ stufe=ausl||'offen'; text=(ausl?'Offen: ':'Noch nicht fällig — offen: ')+pflichtFehlt.map(x=>x.text).join('; '); }
  else if(!abschlussOk){ stufe='gelb'; text='Alle Punkte erledigt — '+(ab.m.length?'Abschluss: '+ab.m.join(', '):'Abschluss im Banksystem mit Datum und Kürzel bestätigen')+'.'; }
  else { stufe='gruen'; text='Vollständig im Banksystem dokumentiert.'; }
  return Object.assign(basis,{stufe,fehlt,pflichtFehlt,text,nachtraeglich,identifiziert:identOk&&(z.rolle!=='vertreter'||p.find(x=>x.key==='vertretung').ok)});
}
/* Abgleich mit dem Notarauftrag: jede Person in notar.verkaeufer[] und notar.kaeufer[] braucht eine Zeile auf ihrer Seite, deren
   Identifizierung nicht mehr „offen“ ist (§ 11 Abs. 2, § 10 Abs. 1 Nr. 5 GwG). Zuordnung über kundeId, sonst gleich(name, zeile).
   notarPersonen=[{seite, kundeId, name}] → [{seite, name, kundeId, zeile (Index oder -1), ok, grund:''|'fehlt'|'offen'|'seite'}] */
function notarAbgleich(notarPersonen,zeilen,gleich,ctx){
  zeilen=Array.isArray(zeilen)?zeilen:[]; gleich=typeof gleich==='function'?gleich:()=>false; ctx=ctx||{};
  return (Array.isArray(notarPersonen)?notarPersonen:[]).filter(n=>n&&(n.kundeId||String(n.name||'').trim())&&!(!n.kundeId&&/^\(Kunde gelöscht\)$/.test(String(n.name||'').trim())))
    .map(n=>{
      const trifft=z=>!!z&&((!!n.kundeId&&z.kundeId===n.kundeId)||(!!String(n.name||'').trim()&&gleich(n.name,z)));
      let i=zeilen.findIndex(z=>trifft(z)&&z.seite===n.seite), grund='';
      if(i<0){ const j=zeilen.findIndex(trifft); grund=j<0?'fehlt':'seite'; return {seite:n.seite,name:String(n.name||'').trim(),kundeId:n.kundeId||'',zeile:j,ok:false,grund}; }
      const z=zeilen[i], ok=ausnahme(z,ctx).gilt||z.identifizierung==='erledigt'||z.identifizierung==='frueher';
      return {seite:n.seite,name:String(n.name||'').trim(),kundeId:n.kundeId||'',zeile:i,ok,grund:ok?'':'offen'};
    });
}
/* ganzer Vorgang: v={personen, notarUebermittelt, geschaeft, nettokaltmiete}, fakten={auftrag, gebot, reserviert, notar},
   o={heute, regelwerk, notarPersonen, gleich} → {zeilen, abgleich, seiten:{verkaeufer, kaeufer}, identifiziert, stufe} */
function vorgangAuswerten(v,fakten,o){
  v=v||{}; o=o||{};
  const zeilen=Array.isArray(v.personen)?v.personen:[];
  const ausl={verkaeufer:seitenAusloeser('verkaeufer',fakten,o.regelwerk),kaeufer:seitenAusloeser('kaeufer',fakten,o.regelwerk)};
  const ctx={heute:o.heute,zeilen,geschaeft:v.geschaeft||'kauf',nettokaltmiete:v.nettokaltmiete,notarUebermittelt:v.notarUebermittelt};
  const ergebnis=zeilen.map(z=>zeileAuswerten(z,Object.assign({},ctx,{ausloeser:ausl[z&&z.seite]||{stufe:''}})));
  const abgleich=notarAbgleich(o.notarPersonen,zeilen,o.gleich,ctx);
  const seiten={};
  SEITEN.forEach(([s])=>{
    const rows=ergebnis.filter(r=>r.seite===s), parteien=rows.filter(r=>r.rolle===s), fehlen=abgleich.filter(a=>a.seite===s&&!a.ok);
    let rang=Math.max(0,...rows.map(r=>RANG[r.stufe]||0));
    if(!parteien.length) rang=Math.max(rang,RANG[ausl[s].stufe||'offen']);
    if(fehlen.length) rang=RANG.rot;
    const fertig=rows.filter(r=>r.stufe==='gruen'||r.stufe==='grau').length;
    seiten[s]={stufe:STUFE_NACH_RANG[rang],ausloeser:ausl[s],personen:rows.length,parteien:parteien.length,fertig,fehlenImNotar:fehlen,
      nachtraeglich:rows.filter(r=>r.nachtraeglich).length};
  });
  const identifiziert=SEITEN.every(([s])=>seiten[s].parteien>0)&&ergebnis.every(r=>r.stufe==='grau'||!r.pflichtFehlt.length)&&abgleich.every(a=>a.ok);
  const stufe=STUFE_NACH_RANG[Math.max(RANG[seiten.verkaeufer.stufe],RANG[seiten.kaeufer.stufe])];
  return {zeilen:ergebnis,abgleich,seiten,identifiziert,stufe:stufe==='gruen'&&!identifiziert?'offen':stufe};
}
/* Aufbewahrung der Aufzeichnungen im Banksystem: 5 Jahre ab Ende des Kalenderjahres, Vernichtung spätestens nach 10 Jahren
   (§ 8 Abs. 4 GwG). Der Vermerk in der App ist keine Aufzeichnung nach § 8 — er kann nach Abschluss gelöscht werden. */
function aufbewahrung(datum){
  if(!istDatum(datum)) return null; const J=+datum.slice(0,4);
  return {fristBeginn:J+'-12-31',aufbewahrenBis:(J+5)+'-12-31',vernichtenSpaetestens:(J+10)+'-12-31'};
}
/* Hinweis zum Regelwerk am Stichtag: '' oder Text */
function regelwerkHinweis(heute,regelwerk){
  const ab=REGELWERKE.amlr.ab;
  if(regelwerk==='amlr'&&heute&&heute<ab) return 'Die AMLR gilt erst ab 10.07.2027 ('+NORMEN.amlr+'). Bis dahin gilt das Geldwäschegesetz.';
  if(regelwerk!=='amlr'&&heute&&heute>=ab) return 'Seit 10.07.2027 gilt die EU-Geldwäscheverordnung (AMLR): Makler prüfen die Identität, sobald der Verkäufer ein Angebot angenommen hat ('+NORMEN.amlr+'). Einstellung mit dem Geldwäschebeauftragten prüfen; die Normen vorher erneut am Wortlaut prüfen.';
  return '';
}
/* nur erlaubte Felder behalten (Datensparsamkeit; schützt auch vor eingespielten fremden Feldern) */
function bereinigen(v){
  if(!v||typeof v!=='object') return v;
  const aus={}; VORGANG_FELDER.forEach(k=>{ if(Object.prototype.hasOwnProperty.call(v,k)) aus[k]=v[k]; });
  aus.personen=(Array.isArray(v.personen)?v.personen:[]).filter(z=>z&&typeof z==='object').map(z=>{ const x={}; ZEILE_FELDER.forEach(k=>{ if(Object.prototype.hasOwnProperty.call(z,k)) x[k]=z[k]; }); return x; });
  if(aus.notarUebermittelt!=null&&!istDatum(aus.notarUebermittelt)) aus.notarUebermittelt='';
  return aus;
}
const ImmoGwgRegeln={FASSUNG,FASSUNG_KURZ,NORMEN,AUSLOESER,REGELWERKE,ROLLEN,SEITEN,ARTEN,VERTRETUNG,IDENT,ZWECK,GRUENDE,MIETE_SCHWELLE,ZEILE_FELDER,VORGANG_FELDER,
  name,istDatum,datumPruefen,kuerzel,zahl,seitenAusloeser,punkte,ausnahme,zeileAuswerten,notarAbgleich,vorgangAuswerten,aufbewahrung,regelwerkHinweis,bereinigen};
wurzel.ImmoGwgRegeln=ImmoGwgRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoGwgRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
