/* ImmoApp — Regeln der Kachel „Weitergaben“ (D57), ohne Seitenbezug
   Kunden mit Einwilligung an Kollegen der Bank übergeben — Baufinanzierung für den Kauf, nach dem Kauf Gebäudeversicherung,
   Modernisierungskredit, Bausparen, Geldanlage des Verkaufserlöses — und den Rücklauf verfolgen.
   - Nachweis: „Beruht die Verarbeitung auf einer Einwilligung, muss der Verantwortliche nachweisen können, dass die betroffene
     Person in die Verarbeitung ihrer personenbezogenen Daten eingewilligt hat“ (Art. 7 Abs. 1 DSGVO, Wortlaut geprüft). Darum
     speichert die App eine Weitergabe erst mit Einwilligung (oder Wunsch) des Kunden, Datum und Form. Den Text der Einwilligung
     liefert der Vordruck der Bank — hier stehen nur Prüfpunkte.
   - Rücklauf: Wiedervorlage eine einstellbare Zahl von Tagen nach der Übergabe bzw. der letzten Rückmeldung; fällt sie auf
     Samstag, Sonntag oder einen Feiertag in Baden-Württemberg, auf den nächsten Werktag (js/fristen.js). Eine Arbeitsfrist,
     keine gesetzliche.
   - Auswertung je Anlass und Stand, bewusst nicht je Kollege (keine Rangliste; Beschäftigtendatenschutz, Betriebsrat).
   - Keine Aussagen zu Fristen der Versicherungen.
   Daten als ISO-Text (JJJJ-MM-TT); Beträge als Zahl. Texte mit Datum über o.fmt (im Browser wzDatum). */
(function(wurzel){
'use strict';
const F=wurzel.ImmoFristen||(typeof require==='function'?require('./fristen.js'):null);

/* Anlässe: k, Name, Langname, passender Bereich der Kollegen, Finanzierung (Stand „Finanzierung zugesagt“, Volumen zählt als
   finanziert), nach dem Kauf (Vorschlag), Rolle beim Verkauf, Bezeichnung des Volumens ('' = kein Volumen) */
const ANLAESSE=[
  {k:'baufinanzierung',name:'Baufinanzierung',lang:'Baufinanzierung für den Kauf',bereich:'baufinanzierung',finanzierung:true,nachKauf:false,rolle:'kaeufer',volumen:'Finanziertes Volumen'},
  {k:'versicherung',name:'Gebäudeversicherung',lang:'Gebäudeversicherung nach dem Kauf',bereich:'versicherung',finanzierung:false,nachKauf:true,rolle:'kaeufer',volumen:''},
  {k:'modernisierung',name:'Modernisierungskredit',lang:'Modernisierungskredit',bereich:'baufinanzierung',finanzierung:true,nachKauf:true,rolle:'kaeufer',volumen:'Finanziertes Volumen'},
  {k:'bausparen',name:'Bausparen',lang:'Bausparen',bereich:'bausparen',finanzierung:false,nachKauf:true,rolle:'kaeufer',volumen:'Bausparsumme'},
  {k:'geldanlage',name:'Geldanlage',lang:'Geldanlage des Verkaufserlöses',bereich:'geldanlage',finanzierung:false,nachKauf:true,rolle:'verkaeufer',volumen:'Anlagebetrag'},
  {k:'sonstiges',name:'Sonstiges',lang:'Sonstiger Anlass',bereich:'',finanzierung:false,nachKauf:false,rolle:'',volumen:'Volumen'}];
const STAENDE=[['uebergeben','übergeben'],['termin','Termin vereinbart'],['zugesagt','Finanzierung zugesagt'],['abgeschlossen','abgeschlossen'],['nicht','nicht zustande gekommen']];
const FORMEN=[['vordruck','schriftlich (Vordruck der Bank)'],['elektronisch','elektronisch (E-Mail, Online-Banking)'],['muendlich','mündlich oder telefonisch']];
const BEREICHE=[['baufinanzierung','Baufinanzierung'],['versicherung','Versicherungen'],['bausparen','Bausparen'],['geldanlage','Geldanlage und Vermögen'],['sonstiges','Sonstiges']];
/* was auf das Übergabeblatt darf — nur, was der Kunde freigegeben hat */
const FREIGABEN=[['kontakt','Telefon und E-Mail'],['anschrift','Anschrift des Kunden'],['ort','Ort des Objekts (ohne Straße)'],['objektart','Objektart'],
  ['wohnflaeche','Wohnfläche'],['baujahr','Baujahr'],['kaufpreis','Kaufpreis']];
const RUECKLAUF_TAGE=14;

const istDatum=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!!F&&F.plusTage(s,0)===s;
const tt=s=>istDatum(s)?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'–';
function anlass(k){ return ANLAESSE.find(a=>a.k===k)||ANLAESSE[ANLAESSE.length-1]; }
function standKey(k){ return STAENDE.some(s=>s[0]===k)?k:'uebergeben'; }
function standName(k,anlassK){ k=standKey(k); if(k==='zugesagt'&&!anlass(anlassK).finanzierung) return 'zugesagt'; return STAENDE.find(s=>s[0]===k)[1]; }
function formName(k){ return (FORMEN.find(f=>f[0]===k)||['',''])[1]; }
function bereichName(k){ return (BEREICHE.find(b=>b[0]===k)||['',''])[1]; }
/* offen: der Kollege ist noch dran; erfolgreich: zugesagt oder abgeschlossen */
function offen(stand){ return ['uebergeben','termin','zugesagt'].includes(standKey(stand)); }
function erfolg(stand){ return stand==='zugesagt'||stand==='abgeschlossen'; }

/* Einwilligung oder Wunsch des Kunden: vollständig (ok) = angehakt, Datum, Form; nicht in der Zukunft, nicht nach der Weitergabe */
function einwilligungPruefen(e,datum,heute){
  e=e&&typeof e==='object'?e:{}; const fehlt=[], fehler=[], hinweise=[];
  if(!e.ja) fehlt.push('Einwilligung oder Wunsch des Kunden');
  if(!istDatum(e.datum)) fehlt.push('Datum der Einwilligung');
  if(!FORMEN.some(f=>f[0]===e.form)) fehlt.push('Form der Einwilligung');
  if(istDatum(e.datum)&&istDatum(heute)&&e.datum>heute) fehler.push('Die Einwilligung ist in der Zukunft datiert.');
  if(istDatum(e.datum)&&istDatum(datum)&&e.datum>datum) fehler.push('Die Einwilligung ist nach dem Tag der Weitergabe datiert — sie muss vorher vorliegen.');
  if(e.form==='muendlich') hinweise.push('Mündlich erteilt: den Nachweis sichern — Notiz in der Kundenakte, Vordruck der Bank nachreichen lassen.');
  const widerrufen=istDatum(e.widerrufen)?e.widerrufen:'';
  if(widerrufen&&istDatum(e.datum)&&widerrufen<e.datum) fehler.push('Der Widerruf liegt vor der Einwilligung — Datum prüfen.');
  return {ok:!fehlt.length&&!fehler.length,fehlt,fehler,hinweise,widerrufen};
}
/* Pflicht vor dem Speichern: Kunde, Tag der Weitergabe, vollständige Einwilligung */
function speichernPruefen(w,heute){
  w=w||{}; const e=einwilligungPruefen(w.einwilligung,w.datum,heute), fehlt=[];
  if(!w.kundeId&&!w.kundeGeloescht) fehlt.push('Kunde aus der Kundenakte');
  if(!istDatum(w.datum)) fehlt.push('Tag der Weitergabe');
  if(istDatum(w.datum)&&istDatum(heute)&&w.datum>heute) e.fehler.push('Der Tag der Weitergabe liegt in der Zukunft.');
  const alle=fehlt.concat(e.fehlt);
  return {ok:!alle.length&&!e.fehler.length,fehlt:alle,fehler:e.fehler};
}

/* Rücklauf: Tage nach der Übergabe oder der letzten Rückmeldung, auf den nächsten Werktag in BW */
function ruecklaufTag(w,tage){
  tage=Math.max(1,Math.round(+tage||RUECKLAUF_TAGE));
  const basis=[w&&w.datum,w&&w.rueckmeldungAm].filter(istDatum).sort().pop();
  return basis&&F?F.fristTage(basis,tage,{werktag:true}):'';
}
function ruecklauf(w,heute,tage){
  if(!w||w.kundeGeloescht||!offen(w.stand)) return null;
  const tag=ruecklaufTag(w,tage); if(!tag) return null;
  return {tag,ueberfaellig:istDatum(heute)&&heute>tag,heute:heute===tag};
}

/* Prüfpunkte als Ampel: [{stufe:'rot'|'gelb'|'gruen', text}].
   o={heute, tage, fmt(iso)→Text, kunde:{telefon,email}|null (null = nicht mehr in der Kundenakte), kollege:true|false} */
function pruefen(w,o){
  o=o||{}; w=w||{}; const l=[], d=o.fmt||tt, heute=o.heute||'';
  if(w.kundeGeloescht) return [{stufe:'gelb',text:'Der Kunde wurde gelöscht — der Eintrag zählt nur noch in der Auswertung, ohne Personenbezug.'}];
  if(!w.kundeId) l.push({stufe:'rot',text:'Kunde aus der Kundenakte wählen.'});
  else if(o.kunde===null) l.push({stufe:'rot',text:'Der Kunde steht nicht mehr in der Kundenakte.'});
  const e=einwilligungPruefen(w.einwilligung,w.datum,heute), ein=w.einwilligung||{};
  if(e.fehlt.length) l.push({stufe:'rot',text:'Es fehlt: '+e.fehlt.join(', ')+' — ohne Nachweis keine Weitergabe (Art. 7 Abs. 1 DSGVO).'});
  e.fehler.forEach(t=>l.push({stufe:'rot',text:t}));
  if(e.widerrufen) l.push({stufe:'rot',text:'Einwilligung am '+d(e.widerrufen)+' widerrufen — nichts mehr weitergeben und den Kollegen informieren. Was mit bereits übergebenen Angaben geschieht, mit dem Datenschutzbeauftragten der Bank klären.'});
  else if(e.ok) l.push({stufe:'gruen',text:'Einwilligung vom '+d(ein.datum)+' liegt vor ('+formName(ein.form)+').'});
  e.hinweise.forEach(t=>l.push({stufe:'gelb',text:t}));
  if(!e.widerrufen&&e.ok&&!ein.rueckmeldung) l.push({stufe:'gelb',text:'Die Einwilligung umfasst keine Rückmeldung des Kollegen an mich — den Stand nur eintragen, wenn der Kunde selbst berichtet.'});
  if(!w.kollegeId&&!(w.kollege&&w.kollege.name)) l.push({stufe:'gelb',text:'Noch kein Kollege gewählt.'});
  else if(o.kollege===false) l.push({stufe:'gelb',text:'Der Kollege steht nicht mehr in der Liste der Ansprechpartner.'});
  if(o.kunde&&w.freigabe&&w.freigabe.kontakt&&!o.kunde.telefon&&!o.kunde.email) l.push({stufe:'gelb',text:'Telefon und E-Mail sind freigegeben, fehlen aber in der Kundenakte.'});
  if(w.freigabe&&!w.freigabe.kontakt&&!w.freigabe.anschrift) l.push({stufe:'gelb',text:'Kein Kontaktweg freigegeben — der Kollege erreicht den Kunden nur über mich.'});
  const r=e.widerrufen?null:ruecklauf(w,heute,o.tage);
  if(r) l.push(r.ueberfaellig?{stufe:'gelb',text:'Rücklauf prüfen: fällig seit '+d(r.tag)+'.'}:{stufe:'gruen',text:'Rücklauf prüfen am '+d(r.tag)+'.'});
  return l;
}

/* Übergabeblatt: nur freigegebene und vorhandene Angaben. d = vorformatierte Werte {telefon, email, anschrift, ort, objektart,
   wohnflaeche, baujahr, kaufpreis, kaufpreisLabel} → {kunde:[[Bezeichnung, Wert]], objekt:[[…]]} */
function uebergabeZeilen(freigabe,d){
  const f=freigabe&&typeof freigabe==='object'?freigabe:{}, x=d||{}, kunde=[], objekt=[];
  const dazu=(l,label,wert)=>{ wert=String(wert==null?'':wert).trim(); if(wert) l.push([label,wert]); };
  if(f.kontakt){ dazu(kunde,'Telefon',x.telefon); dazu(kunde,'E-Mail',x.email); }
  if(f.anschrift) dazu(kunde,'Anschrift',x.anschrift);
  if(f.ort) dazu(objekt,'Ort',x.ort);
  if(f.objektart) dazu(objekt,'Objektart',x.objektart);
  if(f.wohnflaeche) dazu(objekt,'Wohnfläche',x.wohnflaeche);
  if(f.baujahr) dazu(objekt,'Baujahr',x.baujahr);
  if(f.kaufpreis) dazu(objekt,x.kaufpreisLabel||'Kaufpreis',x.kaufpreis);
  return {kunde,objekt};
}
/* Objektart aus der Bewertung (ek_modus, ek_typ, ek_wtyp) in Worten */
function objektartText(modus,typ,wtyp){
  if(modus==='wohnung') return 'Eigentumswohnung'+(wtyp?' ('+wtyp+')':'');
  typ=String(typ||'').trim();
  if(/^EFH/.test(typ)) return 'Einfamilienhaus';
  if(/^ZFH/.test(typ)) return 'Zweifamilienhaus';
  if(/^Doppel/.test(typ)) return 'Doppelhaushälfte oder Reihenendhaus';
  if(/^Reihenmittel/.test(typ)) return 'Reihenmittelhaus';
  if(/^Mehrfamilienhaus/.test(typ)) return 'Mehrfamilienhaus';
  return typ.split(' · ')[0].trim();
}

/* Auswertung je Anlass und Stand (Jahr nach dem Tag der Weitergabe; '' = alle). Volumen als Zahl je Eintrag.
   Bewusst ohne Kollegen: keine Rangliste. */
function auswertung(liste,o){
  o=o||{}; const l=(liste||[]).filter(w=>w&&(!o.jahr||String(w.datum||'').slice(0,4)===String(o.jahr)));
  const zeilen=ANLAESSE.map(a=>{
    const x=l.filter(w=>anlass(w.anlass).k===a.k), st={};
    STAENDE.forEach(([k])=>{ st[k]=x.filter(w=>standKey(w.stand)===k).length; });
    const erf=st.zugesagt+st.abgeschlossen, ent=erf+st.nicht;
    return {anlass:a.k,name:a.name,staende:st,summe:x.length,volumen:x.filter(w=>erfolg(w.stand)).reduce((s,w)=>s+(+w.volumen||0),0),quote:ent?erf/ent:null};
  }).filter(z=>z.summe>0);
  const summe={}; STAENDE.forEach(([k])=>{ summe[k]=zeilen.reduce((s,z)=>s+z.staende[k],0); });
  return {zeilen,summe,gesamt:l.length,offen:l.filter(w=>offen(w.stand)).length,erfolg:summe.zugesagt+summe.abgeschlossen,
    finanziert:l.filter(w=>erfolg(w.stand)&&anlass(w.anlass).finanzierung).reduce((s,w)=>s+(+w.volumen||0),0)};
}

/* Anlässe nach dem Kauf: verkaeufe=[{kundeId, rolle:'kaeufer'|'verkaeufer', projektId, datum, objekt}] (Notarauftrag beurkundet,
   Anfrage „Gekauft“, Objekt verkauft). Je Person und passendem Anlass ein Vorschlag — nicht, wenn es schon eine Weitergabe mit
   diesem Anlass gibt, der Verkauf länger als `monate` zurückliegt oder der Vorschlag ausgeblendet ist. */
function vorschlaege(verkaeufe,weitergaben,heute,o){
  o=o||{}; const monate=o.monate||12, aus=o.ausgeblendet||{}, ab=istDatum(heute)&&F?F.fristMonate(heute,-monate):'', m={};
  (verkaeufe||[]).forEach(v=>{
    if(!v||!v.kundeId||!['kaeufer','verkaeufer'].includes(v.rolle)) return;
    if(ab&&istDatum(v.datum)&&v.datum<ab) return;
    ANLAESSE.filter(a=>a.nachKauf&&a.rolle===v.rolle).forEach(a=>{
      const schluessel=v.kundeId+':'+a.k;
      if(aus[schluessel]||(weitergaben||[]).some(w=>w&&w.kundeId===v.kundeId&&w.anlass===a.k)) return;
      const alt=m[schluessel];
      if(!alt||String(v.datum||'')>String(alt.datum||'')) m[schluessel]={schluessel,kundeId:v.kundeId,anlass:a.k,rolle:v.rolle,projektId:v.projektId||'',datum:istDatum(v.datum)?v.datum:'',objekt:v.objekt||''};
    });
  });
  return Object.values(m).sort((a,b)=>String(b.datum).localeCompare(String(a.datum))||ANLAESSE.findIndex(x=>x.k===a.anlass)-ANLAESSE.findIndex(x=>x.k===b.anlass));
}

/* Verkaufsfahrplan „Finanzierungsbestätigung des Käufers liegt vor“: zugesagte oder abgeschlossene Baufinanzierung zu diesem Objekt
   für einen Käufer aus dem Notarauftrag — ohne Notarauftrag nur bei reserviertem Objekt und genau einer Zusage */
function fahrplanFinanzierung(liste,projektId,o){
  o=o||{}; if(!projektId) return false;
  const z=(liste||[]).filter(w=>w&&w.projektId===projektId&&w.anlass==='baufinanzierung'&&erfolg(w.stand));
  if(!z.length) return false;
  const k=(o.kaeuferIds||[]).filter(Boolean);
  if(k.length) return z.some(w=>k.includes(w.kundeId));
  return !!o.reserviert&&z.length===1;
}

/* Personenbezug entfernen (Kunde gelöscht oder nicht mehr gebraucht): Auswertung bleibt, Name und Freitexte gehen */
function anonymisieren(w){
  w=w||{}; const e=w.einwilligung||{};
  return Object.assign({},w,{kundeId:'',kundeGeloescht:true,anliegen:'',notiz:'',einwilligung:{ja:!!e.ja,datum:'',form:'',rueckmeldung:false,widerrufen:''},
    verlauf:(Array.isArray(w.verlauf)?w.verlauf:[]).filter(h=>h&&/^Stand: /.test(h.text||'')).map(h=>({datum:h.datum,text:h.text}))});
}
/* erledigte Weitergaben, deren letzter Tag länger als `monate` zurückliegt (noch mit Personenbezug) */
function alteErledigte(liste,heute,monate){
  const ab=istDatum(heute)&&F?F.fristMonate(heute,-(monate||12)):''; if(!ab) return [];
  return (liste||[]).filter(w=>w&&!w.kundeGeloescht&&!offen(w.stand)&&([w.datum,w.rueckmeldungAm].filter(istDatum).sort().pop()||'')<ab);
}

const ImmoWeitergabeRegeln={ANLAESSE,STAENDE,FORMEN,BEREICHE,FREIGABEN,RUECKLAUF_TAGE,istDatum,anlass,standKey,standName,formName,bereichName,offen,erfolg,
  einwilligungPruefen,speichernPruefen,ruecklaufTag,ruecklauf,pruefen,uebergabeZeilen,objektartText,auswertung,vorschlaege,fahrplanFinanzierung,anonymisieren,alteErledigte};
wurzel.ImmoWeitergabeRegeln=ImmoWeitergabeRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoWeitergabeRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
