/* ImmoApp — Regeln der Kachel „Tipps“: Hinweise aus Filialen, von Kollegen und Partnern (ohne Seitenbezug)
   - Datenschutzinformation bei Dritterhebung (Art. 14 Abs. 3 DSGVO): längstens einen Monat nach Erlangung der Daten (lit. a),
     spätestens beim ersten Kontakt mit dem Kunden (lit. b) und spätestens bei der ersten Weitergabe an einen anderen Empfänger,
     z. B. die Baufinanzierung (lit. c). Es gilt der früheste Zeitpunkt; ein geplanter erster Kontakt zählt schon. Die Monatsfrist
     rechnet die App vorsichtig: gleiche Tageszahl wie der Tag des Tipps, fehlt sie im Folgemonat, der Monatsletzte, ohne
     Verschiebung vom Wochenende (ImmoFristen.fristMonate ohne werktag).
   - Ampel: gelb ab dem Tipp, rot nach Fristende oder sobald ein Kontakt ohne Datenschutzinformation eingetragen ist. „Bereits
     informiert“ mit Fundstelle ersetzt die Information (Art. 14 Abs. 5 lit. a, Art. 13 Abs. 4 DSGVO). Zum Nachweis gehören Datum,
     Weg und Fundstelle bzw. Version des Vordrucks (Art. 5 Abs. 2 DSGVO).
   - Daten aus der Kundenbeziehung der Bank für die Vermittlung (Zweckänderung): Information vor der Weiterverarbeitung
     (Art. 13 Abs. 3 DSGVO) — rot, bis sie erteilt ist. Ob ein Tipp aus der Filiale Dritterhebung oder Zweckänderung ist und ob er
     ohne Einverständnis des Kunden weitergegeben werden darf (Bankgeheimnis), klärt die Bank; die App vermerkt nur.
   - Die Quelle (Tippgeber) gehört in die Information (Art. 14 Abs. 2 lit. f) und in die Auskunft (Art. 15 Abs. 1 lit. g DSGVO).
   - Auswertung nur je Filiale, Art des Tippgebers und Art des Tipps, nie je Person (Beschäftigtendatenschutz).
   Alle Daten als ISO-Text (JJJJ-MM-TT); Texte mit Datum über o.datum (Vorgabe TT.MM.JJJJ). */
(function(wurzel){
'use strict';
const F=wurzel.ImmoFristen||(typeof require==='function'?require('./fristen.js'):null);
const STAENDE=[['neu','neu'],['kontakt','Kontakt aufgenommen'],['termin','Termin'],['auftrag','Auftrag'],['verkauf','Verkauf'],['kein','kein Interesse']];
const FOLGE=['neu','kontakt','termin','auftrag','verkauf'];   // „kein Interesse“ ist keine Stufe
const ARTEN=[['verkauf','Verkaufsabsicht'],['bewertung','Bewertungswunsch'],['kauf','Kaufwunsch'],['vermietung','Vermietung']];
const GEBER_ARTEN=[['kundenberater','Kundenberater'],['baufinanzierung','Baufinanzierung'],['extern','extern']];
const HERKUNFT=[['dritter','Hinweis eines Dritten (Art. 14 DSGVO)'],['bank','Daten aus der Kundenbeziehung der Bank (Art. 13 Abs. 3 DSGVO)']];
const DS_WEGE=['ausgehändigt','E-Mail','Post','Link'];
const GRUND={monat:'ein Monat nach dem Tipp (Art. 14 Abs. 3 lit. a DSGVO)',geplant:'beim geplanten ersten Kontakt (Art. 14 Abs. 3 lit. b DSGVO)',
  kontakt:'beim ersten Kontakt (Art. 14 Abs. 3 lit. b DSGVO)',weitergabe:'bei der ersten Weitergabe an einen anderen Empfänger (Art. 14 Abs. 3 lit. c DSGVO)'};
const iso=s=>{ s=String(s||''); return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:''; };
const tt=s=>{ s=iso(s); return s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'–'; };
const txt=s=>String(s==null?'':s).trim();
function name(liste,k){ const x=liste.find(a=>a[0]===k); return x?x[1]:''; }
function stufe(stand){ return FOLGE.indexOf(stand||'neu'); }
function standName(k){ return name(STAENDE,k)||'neu'; }
function artName(k){ return name(ARTEN,k)||'Tipp'; }
function geberArtName(k){ return name(GEBER_ARTEN,k); }
function offen(t){ return ['neu','kontakt','termin'].includes((t&&t.stand)||'neu'); }
function quartal(d){ d=iso(d); return d?Math.floor((+d.slice(5,7)-1)/3)+1:0; }
/* höchste erreichte Stufe (für die Auswertung als Trichter) */
function erreicht(t){ return Math.max(+(t&&t.stufe)||0,stufe(t&&t.stand)); }

/* Stand setzen: Verlauf, höchste Stufe, erster Kontakt (ab „Kontakt aufgenommen“, wenn noch kein Datum eingetragen ist) */
function standSetzen(t,stand,heute){
  if(!t||!STAENDE.some(s=>s[0]===stand)) return t;
  if((t.stand||'neu')!==stand){ (t.verlauf=Array.isArray(t.verlauf)?t.verlauf:[]).push({datum:heute,text:'Stand: '+standName(stand)}); t.standAm=heute; }
  t.stand=stand;
  const i=stufe(stand); if(i>=0) t.stufe=Math.max(+t.stufe||0,i);
  if(i>=1&&!iso(t.ersterKontaktAm)) t.ersterKontaktAm=heute;
  return t;
}

/* Frist der Datenschutzinformation: frühester von Monatsfrist, geplantem oder erstem Kontakt und erster Weitergabe */
function dsinfoFrist(t){
  const erlangt=iso(t&&t.datum); if(!erlangt||!F) return {bis:'',grund:'',monat:''};
  const monat=F.fristMonate(erlangt,1), k=[['monat',monat]];
  if(iso(t.kontaktGeplant)) k.push(['geplant',t.kontaktGeplant]);
  if(iso(t.ersterKontaktAm)) k.push(['kontakt',t.ersterKontaktAm]);
  if(iso(t.weitergabeAm)) k.push(['weitergabe',t.weitergabeAm]);
  k.sort((a,b)=>a[1].localeCompare(b[1]));   // stabil: bei gleichem Tag gilt die zuerst genannte Regel
  return {bis:k[0][1],grund:k[0][0],monat};
}
function dsinfoErledigt(t){ const ds=(t&&t.dsinfo)||{}; return !!(iso(ds.erteiltAm)||(ds.bereitsInformiert&&txt(ds.fundstelle))); }
/* Ampel der Datenschutzinformation → {stufe:'rot'|'gelb'|'gruen', text, bis} */
function dsinfoPruefen(t,heute,o){
  const d=(o&&o.datum)||tt, ds=(t&&t.dsinfo)||{}, fr=dsinfoFrist(t||{}), bank=t&&t.herkunft==='bank';
  if(ds.bereitsInformiert) return txt(ds.fundstelle)
    ?{stufe:'gruen',text:'Der Kunde ist bereits informiert ('+txt(ds.fundstelle)+'; '+(bank?'Art. 13 Abs. 4':'Art. 14 Abs. 5 lit. a')+' DSGVO).',bis:fr.bis}
    :{stufe:'gelb',text:'„Bereits informiert“: Fundstelle eintragen (z. B. Datenschutzinformation der Bank mit Version) — sonst fehlt der Nachweis (Art. 5 Abs. 2 DSGVO).',bis:fr.bis};
  if(iso(ds.erteiltAm)){
    if(!bank&&fr.bis&&ds.erteiltAm>fr.bis) return {stufe:'gelb',text:'Datenschutzinformation am '+d(ds.erteiltAm)+' erteilt — nach der Frist (spätestens '+d(fr.bis)+', '+GRUND[fr.grund]+').',bis:fr.bis};
    const fehlt=[txt(ds.weg)?'':'Weg',txt(ds.version)?'':'Version des Vordrucks'].filter(Boolean);
    if(fehlt.length) return {stufe:'gelb',text:'Datenschutzinformation am '+d(ds.erteiltAm)+' erteilt. Für den Nachweis noch eintragen: '+fehlt.join(' und ')+' (Art. 5 Abs. 2 DSGVO).',bis:fr.bis};
    return {stufe:'gruen',text:'Datenschutzinformation am '+d(ds.erteiltAm)+' erteilt ('+txt(ds.weg)+', '+txt(ds.version)+').',bis:fr.bis};
  }
  if(bank) return {stufe:'rot',text:'Daten aus der Kundenbeziehung der Bank für einen anderen Zweck: vor der Weiterverarbeitung informieren (Art. 13 Abs. 3 DSGVO).',bis:''};
  if(!fr.bis) return {stufe:'rot',text:'Datum des Tipps fehlt — davon hängt die Frist der Datenschutzinformation ab (Art. 14 Abs. 3 DSGVO).',bis:''};
  if(iso(t.ersterKontaktAm)) return {stufe:'rot',text:'Kontakt am '+d(t.ersterKontaktAm)+' eingetragen, aber keine Datenschutzinformation — sie ist spätestens beim ersten Kontakt fällig (Art. 14 Abs. 3 lit. b DSGVO).',bis:fr.bis};
  if(stufe(t.stand)>=1) return {stufe:'rot',text:'Stand „'+standName(t.stand)+'“, aber keine Datenschutzinformation — sie ist spätestens beim ersten Kontakt fällig (Art. 14 Abs. 3 lit. b DSGVO). Datum des ersten Kontakts eintragen.',bis:fr.bis};
  if(heute>fr.bis) return {stufe:'rot',text:'Frist der Datenschutzinformation am '+d(fr.bis)+' abgelaufen ('+GRUND[fr.grund]+').',bis:fr.bis};
  return {stufe:'gelb',text:'Datenschutzinformation fällig spätestens '+(heute===fr.bis?'heute, ':'')+d(fr.bis)+' — '+GRUND[fr.grund]+'.',bis:fr.bis};
}
/* alle Prüfpunkte eines Tipps → [{stufe, text}] (rot zuerst) */
function pruefen(t,heute,o){
  const d=(o&&o.datum)||tt, q=(o&&o.quelle)||(t&&t.quelle)||{}, l=[];
  if(t.kundeGeloescht) return [{stufe:'gruen',text:'Kunde am '+d(t.kundeGeloescht)+' gelöscht — der Tipp bleibt ohne Personenbezug für die Auswertung je Filiale.'}];
  if(!txt(t.geberId)&&!txt(q.name)) l.push({stufe:'rot',text:'Tippgeber fehlt — die Quelle gehört in die Datenschutzinformation (Art. 14 Abs. 2 lit. f DSGVO) und in die Auskunft (Art. 15 Abs. 1 lit. g DSGVO).'});
  if(!txt(t.kundeId)) l.push({stufe:'gelb',text:'Kunde fehlt: aus der Kundenakte wählen oder neu anlegen.'});
  l.push(iso(t.einverstandenAm)?{stufe:'gruen',text:'Einverständnis mit der Kontaktaufnahme am '+d(t.einverstandenAm)+' vermerkt.'}
    :{stufe:'gelb',text:'Einverständnis des Kunden mit der Kontaktaufnahme nicht vermerkt. Ob der Tipp ohne Einverständnis weitergegeben werden darf (Bankgeheimnis), mit Rechtsabteilung und Datenschutzbeauftragtem klären.'});
  l.push(dsinfoPruefen(t,heute,o));
  if(iso(t.weitergabeAm)&&!txt(t.weitergabeAn)) l.push({stufe:'gelb',text:'Weitergabe am '+d(t.weitergabeAm)+': Empfänger eintragen (gehört in die Auskunft).'});
  if(t.stand==='kein') l.push({stufe:'gelb',text:'Kein Interesse: prüfen, ob die Daten in der Kundenakte noch gebraucht werden (Löschung prüfen).'});
  const rang={rot:0,gelb:1,gruen:2};
  return l.sort((a,b)=>rang[a.stufe]-rang[b.stufe]);
}

/* Rückmeldung an den Tippgeber: nur der Stand, ohne Einzelheiten zum Kunden */
const RUECK={neu:'Der Tipp ist angekommen und vorgemerkt.',kontakt:'Ich habe Kontakt aufgenommen.',termin:'Ein Termin ist vereinbart.',
  auftrag:'Daraus ist ein Auftrag geworden. Vielen Dank!',verkauf:'Das Objekt ist verkauft. Vielen Dank!',kein:'Derzeit ergibt sich daraus kein Auftrag.'};
function rueckmeldungText(x,o){
  x=x||{}; const d=(o&&o.datum)||tt, n=txt(x.geberName);
  const stand=x.tippArt==='kauf'&&x.stand==='verkauf'?'Der Kauf ist zustande gekommen. Vielen Dank!':(RUECK[x.stand]||RUECK.neu);
  return {betreff:'Ihr Tipp vom '+d(x.datum)+': '+standName(x.stand),
    text:'Guten Tag'+(n?' '+n:'')+',\n\nvielen Dank für Ihren Tipp vom '+d(x.datum)+' ('+artName(x.tippArt)+'). Zum Stand: '+stand
      +'\n\nEinzelheiten zum Kunden nenne ich hier aus Datenschutzgründen nicht.\n\nViele Grüße'+(txt(x.berater)?'\n'+txt(x.berater):'')};
}
function rueckmeldungOffen(t){ return !!t&&(t.rueckmeldungStand||'')!==((t.stand)||'neu'); }

/* Stand aus dem verknüpften Akquise- oder Anfrage-Eintrag (nur lesen) */
const VG_STAND={akquise:{'Erstkontakt':'kontakt','Termin vereinbart':'termin','Bewertung erstellt':'termin','Angebot abgegeben':'termin','Auftrag erteilt':'auftrag','Kein Auftrag':'kein'},
  anfrage:{'Neu':'neu','Kontaktiert':'kontakt','Exposé versendet':'kontakt','Besichtigung':'termin','Angebot':'termin','Gekauft':'verkauf','Abgesagt':'kein'}};
function standAusVorgang(typ,status,objektStatus){
  let s=(VG_STAND[typ]||{})[status]||'';
  if(typ==='akquise'&&objektStatus==='Verkauft'&&s&&s!=='kein') s='verkauf';
  return s;
}
/* Vorschlag nur, wenn der Eintrag weiter ist als der Tipp (oder abgesagt, solange der Tipp offen ist) */
function standVorschlag(t,vgStand){
  if(!vgStand||!t||vgStand===(t.stand||'neu')) return '';
  if(vgStand==='kein') return offen(t)?'kein':'';
  return stufe(vgStand)>stufe(t.stand)&&t.stand!=='kein'?vgStand:'';
}

/* Auswertung je Filiale (Trichter im Zeitraum), je Quartal des Jahres, je Art des Tippgebers und des Tipps — ohne Personen.
   o={jahr, quartal (0 = ganzes Jahr), filiale(t), geberArt(t), geber(t)}; geber = Zahl verschiedener Tippgeber je Filiale (für den
   Hinweis, dass eine Zeile mit nur einem Tippgeber auf eine Person schließen lässt). */
function auswertung(tipps,o){
  o=o||{}; const jahr=String(o.jahr||''), q=+o.quartal||0;
  const fil=o.filiale||(t=>txt(t.quelle&&t.quelle.filiale)), gart=o.geberArt||(t=>txt(t.quelle&&t.quelle.art)), gid=o.geber||(t=>txt(t.geberId)||txt(t.quelle&&t.quelle.name));
  const leer=()=>({tipps:0,kontakt:0,termin:0,auftrag:0,verkauf:0,kein:0});
  const zaehl=(z,t)=>{ const s=erreicht(t); z.tipps++; if(s>=1) z.kontakt++; if(s>=2) z.termin++; if(s>=3) z.auftrag++; if(s>=4) z.verkauf++; if(t.stand==='kein') z.kein++; };
  const jahrL=(Array.isArray(tipps)?tipps:[]).filter(t=>t&&iso(t.datum)&&(!jahr||t.datum.slice(0,4)===jahr)), imZ=jahrL.filter(t=>!q||quartal(t.datum)===q);
  const fm=new Map();
  const zeile=f=>{ if(!fm.has(f)) fm.set(f,{filiale:f,gesamt:leer(),q:[0,1,2,3].map(()=>({tipps:0,auftrag:0,verkauf:0})),_g:new Set()}); return fm.get(f); };
  jahrL.forEach(t=>{ const r=zeile(fil(t)||'ohne Filiale'), z=r.q[quartal(t.datum)-1], s=erreicht(t); z.tipps++; if(s>=3) z.auftrag++; if(s>=4) z.verkauf++; });
  imZ.forEach(t=>{ const r=zeile(fil(t)||'ohne Filiale'); zaehl(r.gesamt,t); const g=gid(t); if(g) r._g.add(g); });
  const filialen=[...fm.values()].sort((a,b)=>a.filiale.localeCompare(b.filiale,'de')).map(r=>({filiale:r.filiale,gesamt:r.gesamt,q:r.q,geber:r._g.size}));
  const nach=(fn,liste)=>liste.map(([k,nm])=>{ const z=leer(); imZ.filter(t=>fn(t)===k).forEach(t=>zaehl(z,t)); return {art:k,name:nm,gesamt:z}; }).filter(r=>r.gesamt.tipps);
  const summe={gesamt:leer(),q:[0,1,2,3].map(()=>({tipps:0,auftrag:0,verkauf:0}))};
  imZ.forEach(t=>zaehl(summe.gesamt,t));
  jahrL.forEach(t=>{ const z=summe.q[quartal(t.datum)-1], s=erreicht(t); z.tipps++; if(s>=3) z.auftrag++; if(s>=4) z.verkauf++; });
  return {jahr,quartal:q,filialen,geberArten:nach(gart,GEBER_ARTEN.concat([['','ohne Angabe']])),tippArten:nach(t=>t.tippArt||'',ARTEN),summe};
}

const ImmoTippsRegeln={STAENDE,ARTEN,GEBER_ARTEN,HERKUNFT,DS_WEGE,GRUND,stufe,standName,artName,geberArtName,offen,quartal,erreicht,standSetzen,
  dsinfoFrist,dsinfoErledigt,dsinfoPruefen,pruefen,rueckmeldungText,rueckmeldungOffen,standAusVorgang,standVorschlag,auswertung};
wurzel.ImmoTippsRegeln=ImmoTippsRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoTippsRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
