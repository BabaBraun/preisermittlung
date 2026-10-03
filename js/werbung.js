/* ImmoApp — Werbung je Kanal und Datenschutzinformation in der Kundenakte (D51), ohne Seitenbezug
   - Rechtsgrundlage der Speicherung (Art. 6 Abs. 1 DSGVO, Feld k.grundlage) und Erlaubnis zur Werbung je Kanal (k.werbung) sind
     zwei verschiedene Dinge: Ein Kunde mit Auftrag kann eine E-Mail-Einwilligung haben und umgekehrt.
   - E-Mail: nur mit vorheriger ausdrücklicher Einwilligung des Adressaten, auch bei Unternehmern (§ 7 Abs. 2 Nr. 2 UWG), oder als
     Bestandskunde, wenn alle Bedingungen des § 7 Abs. 3 Nr. 1–4 UWG erfüllt sind (Adresse beim Verkauf einer Dienstleistung
     erhalten, eigene ähnliche Leistung, kein Widerspruch, Hinweis bei der Erhebung und in jeder E-Mail).
   - Telefon: bei Verbrauchern vorherige ausdrückliche Einwilligung, bei sonstigen Marktteilnehmern genügt eine mutmaßliche
     (§ 7 Abs. 2 Nr. 1 UWG). Nachweis zum Zeitpunkt der Erteilung, fünf Jahre aufbewahren ab Erteilung und nach jeder Verwendung
     (§ 7a UWG; Fristberechnung §§ 187 Abs. 1, 188 Abs. 2 BGB).
   - Post: adressierte Werbebriefe ohne Einwilligung (Erwägungsgrund 47 DSGVO), aber nicht nach einem Widerspruch
     (§ 7 Abs. 1 Satz 2 UWG, Art. 21 Abs. 2 und 3 DSGVO).
   - Werbewiderspruch: sperrt sofort alle Kanäle ohne Abwägung (Art. 21 Abs. 3 DSGVO); Bestätigung an den Kunden innerhalb eines
     Monats (Art. 12 Abs. 3 DSGVO). Vorsichtige Vorgabe: Jeder Widerspruch gilt für alle Kanäle.
   - Datenschutzinformation: bei Erhebung beim Kunden zum Zeitpunkt der Erhebung (Art. 13 Abs. 1), bei Dritten (Tipp, Empfehlung)
     innerhalb eines Monats, spätestens beim ersten Kontakt (Art. 14 Abs. 3), bei Zweckänderung vor der Weiterverarbeitung
     (Art. 13 Abs. 3). Entfällt, wenn der Kunde die Information schon hat (Art. 13 Abs. 4, Art. 14 Abs. 5 lit. a).
   Daten aus dem alten gemeinsamen Feld (grundlage 'einwilligung') gelten als Einwilligung per E-Mail und Telefon mit dem Vermerk
   „aus altem Feld übernommen“ — gelb, bis der Nachweis geprüft ist. Alle Daten als ISO-Text (JJJJ-MM-TT). */
(function(wurzel){
'use strict';
const F=wurzel.ImmoFristen||(typeof require==='function'?require('./fristen.js'):null);
const ALT='aus altem Feld übernommen';
const FORMEN=['Vordruck der Bank','E-Mail des Kunden','Formular (Website oder Portal)','mündlich (mit Gesprächsnotiz)',ALT];
const STAND={email:[['keine','keine Einwilligung'],['einwilligung','Einwilligung liegt vor'],['bestandskunde','Bestandskunde (§ 7 Abs. 3 UWG)'],['widerrufen','widerrufen']],
  telefon:[['keine','keine Einwilligung'],['einwilligung','Einwilligung liegt vor'],['mutmasslich','mutmaßliche Einwilligung (nur Unternehmer)'],['widerrufen','widerrufen']]};
const DS_ARTEN=[['direkt','beim Kunden selbst erhoben (Anfrage, Gespräch)'],['dritter','von Dritten (Tipp, Empfehlung)'],['zweckaenderung','aus der Bankbeziehung (anderer Zweck)']];
const iso=s=>{ s=String(s||''); return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:''; };
const de=s=>s?s.split('-').reverse().join('.'):'';
const isoAus=ts=>{ const d=new Date(+ts); return isFinite(d)?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):''; };
function kanal(x,extra){ return Object.assign({stand:'keine',erteiltAm:'',erfasstAm:'',form:'',nachweis:'',zweck:'Angebote zu Immobilien',widerrufAm:'',widerrufWeg:''},extra||{},x&&typeof x==='object'?x:{}); }
/* vollständiges Modell (Kopie) — für Anzeige und Prüfung; speichern erst beim Ändern */
function norm(k){
  k=k||{}; const w=k.werbung&&typeof k.werbung==='object'?k.werbung:{};
  const e=kanal(w.email), t=kanal(w.telefon,{mutmasslichGrund:'',verwendungen:[]});
  e.bk=Object.assign({erhalten:false,aehnlich:false,hinweisAm:''},e.bk&&typeof e.bk==='object'?e.bk:{});
  t.verwendungen=(Array.isArray(t.verwendungen)?t.verwendungen:[]).map(iso).filter(Boolean).sort();
  let migriert=false;
  if(!w.email&&!w.telefon&&k.grundlage==='einwilligung'){
    [e,t].forEach(x=>{ x.stand='einwilligung'; x.erteiltAm=iso(k.einwilligungAm); x.form=ALT; }); migriert=true; }
  const ds=w.dsinfo&&typeof w.dsinfo==='object'?Object.assign({art:'direkt',erhobenAm:'',erteiltAm:'',bereits:false,fundstelle:'',quelle:'',erlangtAm:''},w.dsinfo):null;
  return {verbraucher:w.verbraucher!==false,email:e,telefon:t,widerspruch:Object.assign({am:'',weg:'',bestaetigtAm:''},w.widerspruch||{}),dsinfo:ds,migriert};
}
function sperre(w){ return w.widerspruch.am?{ok:false,stufe:'rot',grund:'Werbewiderspruch vom '+de(w.widerspruch.am)+' — keine Werbung über alle Kanäle (Art. 21 Abs. 3 DSGVO)'}:null; }
/* Nachweis vollständig? (§ 7a Abs. 1 UWG, Art. 7 Abs. 1 DSGVO) */
function nachweisFehlt(x){ const f=[]; if(!iso(x.erteiltAm)) f.push('erteilt am'); if(!x.form||x.form===ALT) f.push('Form'); if(!String(x.nachweis||'').trim()) f.push('Fundstelle des Nachweises'); return f; }
function darfEmail(k){
  const w=norm(k), s=sperre(w); if(s) return s; const e=w.email;
  if(e.stand==='einwilligung'){ const f=nachweisFehlt(e);
    return {ok:true,stufe:f.length?'gelb':'gruen',grund:'Einwilligung'+(e.erteiltAm?' vom '+de(e.erteiltAm):'')+(f.length?' — Nachweis prüfen: '+f.join(', '):'')}; }
  if(e.stand==='bestandskunde'){ const b=e.bk, f=[];
    if(!b.erhalten) f.push('Adresse beim Verkauf einer Dienstleistung erhalten'); if(!b.aehnlich) f.push('Werbung nur für eigene ähnliche Leistungen');
    if(!iso(b.hinweisAm)) f.push('Hinweis auf das Widerspruchsrecht bei der Erhebung');
    return f.length?{ok:false,stufe:'rot',grund:'Bestandskunde — es fehlt: '+f.join(', ')+' (§ 7 Abs. 3 UWG)'}
      :{ok:true,stufe:'gruen',bestandskunde:true,grund:'Bestandskunde (§ 7 Abs. 3 UWG) — in jeder E-Mail auf das Widerspruchsrecht hinweisen'}; }
  if(e.stand==='widerrufen') return {ok:false,stufe:'rot',grund:'Einwilligung widerrufen'+(e.widerrufAm?' am '+de(e.widerrufAm):'')};
  return {ok:false,stufe:'grau',grund:'keine Einwilligung — keine Werbung per E-Mail (§ 7 Abs. 2 Nr. 2 UWG)'};
}
function darfTelefon(k){
  const w=norm(k), s=sperre(w); if(s) return s; const t=w.telefon;
  if(t.stand==='einwilligung'){ const f=nachweisFehlt(t);
    return {ok:true,stufe:f.length?'gelb':'gruen',grund:'Einwilligung'+(t.erteiltAm?' vom '+de(t.erteiltAm):'')+(f.length?' — Nachweis prüfen: '+f.join(', ')+' (§ 7a UWG)':'')}; }
  if(t.stand==='mutmasslich'){
    if(w.verbraucher) return {ok:false,stufe:'rot',grund:'Verbraucher brauchen eine ausdrückliche Einwilligung (§ 7 Abs. 2 Nr. 1 UWG)'};
    return String(t.mutmasslichGrund||'').trim()?{ok:true,stufe:'gelb',grund:'mutmaßliche Einwilligung (Unternehmer): '+t.mutmasslichGrund}
      :{ok:false,stufe:'rot',grund:'mutmaßliche Einwilligung: Grund eintragen'}; }
  if(t.stand==='widerrufen') return {ok:false,stufe:'rot',grund:'Einwilligung widerrufen'+(t.widerrufAm?' am '+de(t.widerrufAm):'')};
  return {ok:false,stufe:'grau',grund:'keine Einwilligung — keine Werbeanrufe'+(w.verbraucher?' (§ 7 Abs. 2 Nr. 1 UWG)':'')};
}
function darfPost(k){ const w=norm(k), s=sperre(w); return s||{ok:true,stufe:'gruen',grund:'Werbebriefe ohne Einwilligung zulässig, solange kein Widerspruch vorliegt'}; }
/* § 7a Abs. 2 UWG: fünf Jahre ab Erteilung und nach jeder Verwendung; der Widerruf beendet die Frist nicht */
function aufbewahrenBis(k){
  const t=norm(k).telefon; if(t.stand!=='einwilligung'&&t.stand!=='widerrufen') return '';
  const l=[iso(t.erteiltAm)].concat(t.verwendungen).filter(Boolean).sort(); if(!l.length||!F) return '';
  return F.fristMonate(l[l.length-1],60);
}
/* Datenschutzinformation: {stufe:'gruen'|'gelb'|'rot', text, faelligBis} oder null (ältere Akten ohne Angabe) */
function dsinfoStand(k,heute){
  const w=norm(k), d=w.dsinfo; if(!d) return null; heute=iso(heute);
  if(iso(d.erteiltAm)) return {stufe:'gruen',text:'Datenschutzinformation gegeben am '+de(d.erteiltAm),faelligBis:''};
  if(d.bereits) return String(d.fundstelle||'').trim()?{stufe:'gruen',text:'Kunde ist bereits informiert ('+d.fundstelle+')',faelligBis:''}
    :{stufe:'gelb',text:'„bereits informiert“: Fundstelle eintragen (z. B. Datenschutzinformation der Bank, Stand)',faelligBis:''};
  const kontakte=(Array.isArray(k.kontakte)?k.kontakte:[]).map(c=>iso(c&&c.datum)).filter(Boolean).sort();
  if(d.art==='zweckaenderung') return {stufe:'rot',text:'Daten aus der Bankbeziehung: vor der Nutzung für die Vermittlung informieren (Art. 13 Abs. 3 DSGVO)',faelligBis:''};
  if(d.art==='dritter'){
    const erl=iso(d.erlangtAm), f=[]; if(!String(d.quelle||'').trim()) f.push('Quelle'); if(!erl) f.push('erhalten am');
    if(f.length) return {stufe:'rot',text:'Daten von Dritten: '+f.join(' und ')+' eintragen — die Information muss die Quelle nennen (Art. 14 Abs. 2 lit. f DSGVO)',faelligBis:''};
    const monat=F?F.fristMonate(erl,1):erl, erster=kontakte.find(x=>x>=erl)||'', bis=erster&&erster<monat?erster:monat;
    return {stufe:heute&&heute>bis?'rot':'gelb',faelligBis:bis,text:'Datenschutzinformation spätestens '+(erster&&erster<monat?'beim ersten Kontakt am '+de(erster):'bis '+de(monat))+' geben (Art. 14 Abs. 3 DSGVO)'};
  }
  const erh=iso(d.erhobenAm)||isoAus(k.erstellt);
  return {stufe:heute&&erh&&heute>erh?'rot':'gelb',faelligBis:erh,text:'Datenschutzinformation bei der Erhebung geben'+(erh?' ('+de(erh)+')':'')+' (Art. 13 Abs. 1 DSGVO)'};
}
/* kurze Marke für Listen: „Werbung: E ✓ · T ✗ · P ✓“ oder „Werbesperre“ */
function marke(k){
  const w=norm(k); if(w.widerspruch.am) return 'Werbesperre';
  const z=x=>x.ok?'✓':'✗';
  return 'Werbung: E '+z(darfEmail(k))+' · T '+z(darfTelefon(k))+' · P '+z(darfPost(k));
}
/* Zeilen für die Auskunft (Art. 15 DSGVO) */
function auskunft(k){
  const w=norm(k), z=[], kz=(n,x,extra)=>{ z.push(n+': '+((STAND[n==='E-Mail'?'email':'telefon'].find(s=>s[0]===x.stand)||['',x.stand])[1])
    +(x.erteiltAm?', erteilt am '+de(x.erteiltAm):'')+(x.erfasstAm?', erfasst am '+de(x.erfasstAm):'')+(x.form?', Form: '+x.form:'')+(x.nachweis?', Nachweis: '+x.nachweis:'')
    +(x.zweck?', Zweck: '+x.zweck:'')+(x.widerrufAm?', widerrufen am '+de(x.widerrufAm)+(x.widerrufWeg?' ('+x.widerrufWeg+')':''):'')+(extra||'')); };
  z.push('Verbraucher: '+(w.verbraucher?'ja':'nein (Unternehmer)'));
  kz('E-Mail',w.email,w.email.stand==='bestandskunde'?', Hinweis auf das Widerspruchsrecht am '+(de(w.email.bk.hinweisAm)||'–'):'');
  kz('Telefon',w.telefon,(w.telefon.verwendungen.length?', werbliche Anrufe: '+w.telefon.verwendungen.map(de).join(', '):'')+(w.telefon.mutmasslichGrund?', Grund: '+w.telefon.mutmasslichGrund:''));
  z.push('Post: '+(w.widerspruch.am?'gesperrt':'Werbebriefe ohne Einwilligung, solange kein Widerspruch'));
  z.push('Werbewiderspruch: '+(w.widerspruch.am?'am '+de(w.widerspruch.am)+(w.widerspruch.weg?' ('+w.widerspruch.weg+')':'')+(w.widerspruch.bestaetigtAm?', bestätigt am '+de(w.widerspruch.bestaetigtAm):''):'keiner'));
  const d=w.dsinfo;
  if(d) z.push('Datenschutzinformation: '+((DS_ARTEN.find(a=>a[0]===d.art)||['',d.art])[1])+(d.quelle?', Quelle: '+d.quelle:'')+(d.erlangtAm?', erhalten am '+de(d.erlangtAm):'')
    +(d.erteiltAm?', gegeben am '+de(d.erteiltAm):d.bereits?', bereits informiert ('+(d.fundstelle||'–')+')':', noch nicht gegeben'));
  const b=aufbewahrenBis(k); if(b) z.push('Nachweis der Telefon-Einwilligung aufbewahren bis '+de(b)+' (§ 7a Abs. 2 UWG)');
  return z;
}
const ImmoWerbung={ALT,FORMEN,STAND,DS_ARTEN,norm,nachweisFehlt,darfEmail,darfTelefon,darfPost,aufbewahrenBis,dsinfoStand,marke,auskunft};
wurzel.ImmoWerbung=ImmoWerbung;
if(typeof module==='object'&&module.exports) module.exports=ImmoWerbung;
})(typeof globalThis!=='undefined'?globalThis:this);
