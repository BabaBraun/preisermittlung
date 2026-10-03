/* ImmoApp — Regeln der Kachel „Schlüsselbuch“, ohne Seitenbezug (in Node testbar)
   Ein Schlüsselbuch je Objekt (Speicher „akten“, art 'schluessel'):
     schluessel: [{id, art, anzahl, nummer, zurueck, zurueckAm}]      — vom Eigentümer übernommen; zurueck = Anzahl zurück an ihn
     ausgaben:   [{id, schluesselId, anzahl, rolle, modus, kundeId, firma, datum, rueckgabeBis, zurueckAm, unterschrift, stand}]
     uebernahme: {datum, unterschrift, stand}, rueckgabe: {unterschrift, stand}, kaeuferAm (Übergabe an den Käufer)
   - Bestand je Schlüssel: übernommen = beim Berater + ausgegeben + zurück an den Eigentümer (+ an den Käufer, sobald die Übergabe
     mit dem Übergabeprotokoll eingetragen ist: dann gilt, was beim Berater lag, als übergeben).
   - Ausgabe: zurück (grün), Rückgabe vereinbart und noch nicht fällig (grün), heute fällig (gelb), überfällig (rot), ohne
     vereinbarte Rückgabe (gelb).
   - Vorschläge für die Rückgabe: am selben Tag, nächster Werktag, in einer Woche; fällt der Tag auf Samstag, Sonntag oder einen
     Feiertag in Baden-Württemberg, gilt der nächste Werktag (js/fristen.js). Eine Vereinbarung, keine gesetzliche Frist.
   - Unterschriften: Die App merkt sich beim Unterschreiben den Stand (Schlüssel, Anzahl, Nummer bzw. Empfänger und Daten der
     Ausgabe). Weicht er später ab, verlangt die Prüfung eine neue Unterschrift.
   - Empfänger: Privatpersonen nur über die Kundenakte (Auskunft und Löschen), Firmen auch als Freitext. firmaPlausibel() ist
     nur ein Hinweis: Rechtsform oder Branchenwort im Namen.
   Alle Daten als ISO-Text (JJJJ-MM-TT). Texte der Prüfpunkte mit Datum über o.datum (in der App wzDatum). */
(function(wurzel){
'use strict';
const Fristen=typeof module==='object'&&module.exports?require('./fristen.js'):wurzel.ImmoFristen;

const ROLLEN=[['handwerker','Handwerker'],['fotograf','Fotograf'],['energieberater','Energieberater'],['hausverwaltung','Hausverwaltung'],
  ['interessent','Interessent'],['sonstige','Sonstige']];
const NUR_AKTE=['interessent'];   // Privatpersonen: nur aus der Kundenakte
const STAENDE_VERKAUF=['Notartermin','Verkauft'];

function datum(s){ s=String(s==null?'':s); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''; const d=new Date(s+'T00:00:00Z'); return isFinite(d)&&d.toISOString().slice(0,10)===s?s:''; }
/* Anzahl: ganze Zahl ab 0 („2“, 2, „2,0“); alles andere 0 */
function anzahl(x){ const n=Number(String(x==null?'':x).replace(',','.').trim()); return Number.isFinite(n)&&n>0?Math.min(Math.floor(n),999):0; }
function de(iso){ const d=datum(iso); return d?d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4):''; }
function rolleName(k){ return (ROLLEN.find(r=>r[0]===k)||ROLLEN[ROLLEN.length-1])[1]; }
function nurAkte(rolle){ return NUR_AKTE.includes(rolle); }
const liste=x=>Array.isArray(x)?x.filter(y=>y&&typeof y==='object'):[];
const text=x=>String(x==null?'':x).trim();

/* ---------- Bestand ---------- */
function offen(a){ return !!a&&!datum(a.zurueckAm); }
function bestand(r){
  r=r||{}; const ks=liste(r.schluessel), as=liste(r.ausgaben), kaeufer=datum(r.kaeuferAm);
  const zeilen=ks.map(k=>{
    const n=anzahl(k.anzahl), aus=as.filter(a=>a.schluesselId===k.id&&offen(a)).reduce((s,a)=>s+anzahl(a.anzahl),0), zur=anzahl(k.zurueck);
    let beim=n-aus-zur, anKaeufer=0;
    if(kaeufer&&beim>0){ anKaeufer=beim; beim=0; }
    return {id:k.id,art:text(k.art)||'Schlüssel',nummer:text(k.nummer),anzahl:n,ausgegeben:aus,zurueck:zur,kaeufer:anKaeufer,beimBerater:beim,fehler:n-aus-zur<0};
  });
  const summe=f=>zeilen.reduce((s,x)=>s+Math.max(0,x[f]),0);
  return {liste:zeilen,gesamt:{anzahl:summe('anzahl'),ausgegeben:summe('ausgegeben'),zurueck:summe('zurueck'),kaeufer:summe('kaeufer'),beimBerater:summe('beimBerater')},
    fehler:zeilen.filter(x=>x.fehler),arten:zeilen.filter(x=>x.anzahl>0).length};
}
/* wie viele Schlüssel einer Art noch beim Berater liegen (für eine neue Ausgabe) */
function verfuegbar(r,schluesselId){ const z=bestand(r).liste.find(x=>x.id===schluesselId); return z?Math.max(0,z.beimBerater):0; }

/* ---------- Ausgaben ---------- */
function ausgabeStatus(a,heute){
  const zur=datum(a&&a.zurueckAm), bis=datum(a&&a.rueckgabeBis);
  if(zur) return {k:'zurueck',stufe:'gruen',datum:zur};
  if(!bis) return {k:'ohneFrist',stufe:'gelb',datum:''};
  const t=datum(heute)?Fristen.tageBis(heute,bis):null;
  if(t!=null&&t<0) return {k:'ueberfaellig',stufe:'rot',datum:bis,tage:-t};
  if(t===0) return {k:'heute',stufe:'gelb',datum:bis,tage:0};
  return {k:'offen',stufe:'gruen',datum:bis,tage:t};
}
/* Vorschlag für die vereinbarte Rückgabe: 'tag' (am selben Tag), 'werktag' (nächster Werktag), 'woche' (eine Woche, auf Werktag) */
function rueckgabeVorschlag(ausgabe,art){
  const d=datum(ausgabe); if(!d) return '';
  if(art==='tag') return d;
  if(art==='werktag') return Fristen.fristTage(d,1,{werktag:true});
  if(art==='woche') return Fristen.fristTage(d,7,{werktag:true});
  return '';
}
/* fällige und überfällige Rückgaben aus mehreren Schlüsselbüchern, älteste zuerst */
function faellige(akten,heute){
  const aus=[];
  liste(akten).forEach(r=>liste(r.ausgaben).forEach(a=>{ const st=ausgabeStatus(a,heute); if(st.k==='ueberfaellig'||st.k==='heute') aus.push({akte:r,ausgabe:a,status:st}); }));
  return aus.sort((x,y)=>x.status.datum.localeCompare(y.status.datum));
}

/* ---------- Stand beim Unterschreiben ---------- */
function listenStand(ks){ return JSON.stringify(liste(ks).map(k=>[text(k.art),anzahl(k.anzahl),text(k.nummer)])); }
function ausgabeStand(a){ a=a||{}; return JSON.stringify([a.schluesselId||'',anzahl(a.anzahl),a.modus==='firma'?'f:'+text(a.firma):'k:'+(a.kundeId||''),datum(a.datum),datum(a.rueckgabeBis)]); }
function rueckgabeStand(ks){ return JSON.stringify(liste(ks).filter(k=>anzahl(k.zurueck)>0).map(k=>[k.id,anzahl(k.zurueck),datum(k.zurueckAm)])); }

/* ---------- Empfänger ---------- */
const RECHTSFORM=/(^|[\s,(])(gmbh|ggmbh|mbh|ag|kg|kgaa|ohg|gbr|ug|eg|se|ltd|inc|e\.\s?k\.?|e\.\s?kfm\.?|e\.\s?kfr\.?|e\.\s?v\.?|partg(mbb)?)(?=$|[\s,.)&])/i;
const BRANCHE=/(betrieb|werkstatt|service|technik|bauunternehm|baugesch|holzbau|hochbau|tiefbau|gartenbau|landschaftsbau|verwaltung|immobilien|studio|fotografie|photography|energieberatung|beratung|handwerk|elektro|sanitär|heizung|maler|schreinerei|schlosserei|zimmerei|dachdecker|reinigung|gärtnerei|stadtwerke|gemeinde|bank|versicherung|gesellschaft|firma|& ?co\b|und co\b)/i;
function firmaPlausibel(t){ t=text(t); return !!t&&(RECHTSFORM.test(t)||BRANCHE.test(t)); }
function empfaengerFehlt(a){ return a.modus==='firma'?!text(a.firma):!a.kundeId&&!a.geloescht; }

/* ---------- Prüfung ----------
   o = {heute, status (Vermarktungsstand der Bewertung), datum: ISO → Text, empfaenger: Ausgabe → Text, eigentuemerGeloescht}
   → {liste:[{stufe, code, text}], rot, gelb} — rot vor gelb, grün nur ohne Befund */
function pruefen(r,o){
  r=r||{}; o=o||{}; const heute=o.heute||'', dt=o.datum||de, wer=o.empfaenger||(a=>a.modus==='firma'?text(a.firma)||'Firma':rolleName(a.rolle));
  const b=bestand(r), ks=liste(r.schluessel), as=liste(r.ausgaben), ue=r.uebernahme||{}, rg=r.rueckgabe||{}, aus=[];
  const art=a=>{ const k=ks.find(x=>x.id===a.schluesselId); return (k?text(k.art)||'Schlüssel':'Schlüssel')+' ('+anzahl(a.anzahl)+')'; };
  const dazu=(stufe,code,t)=>aus.push({stufe,code,text:t});
  if(!b.gesamt.anzahl&&!as.length){ dazu('gelb','leer','Noch keine Schlüssel eingetragen: Art, Anzahl und Nummer der Schließanlage.'); return {liste:aus,rot:0,gelb:1}; }
  // rot
  b.fehler.forEach(x=>dazu('rot','bestand',x.art+': mehr ausgegeben oder zurückgegeben als übernommen.'));
  as.forEach(a=>{ const st=ausgabeStatus(a,heute); if(st.k==='ueberfaellig') dazu('rot','ueberfaellig','Rückgabe überfällig seit '+dt(st.datum)+': '+art(a)+' — '+wer(a)+'.'); });
  const verkauf=STAENDE_VERKAUF.includes(o.status)||!!datum(r.kaeuferAm);
  if(verkauf&&b.gesamt.ausgegeben>0) dazu(datum(r.kaeuferAm)||o.status==='Verkauft'?'rot':'gelb','verkauf','Vor der Übergabe an den Käufer alle ausgegebenen Schlüssel zurückholen — noch '+b.gesamt.ausgegeben+' ausgegeben.');
  // gelb: Übernahme
  if(!r.kundeId) dazu('gelb','eigentuemer',o.eigentuemerGeloescht||r.eigentuemerGeloescht?'Der Eigentümer wurde aus der Kundenakte gelöscht.':'Eigentümer aus der Kundenakte wählen — für die Quittung.');
  if(b.gesamt.anzahl&&!datum(ue.datum)) dazu('gelb','datum','Datum der Übernahme fehlt.');
  if(b.gesamt.anzahl&&!ue.unterschrift) dazu('gelb','unterschrift','Die Übernahme ist noch nicht vom Eigentümer unterschrieben.');
  else if(ue.unterschrift&&ue.stand&&ue.stand!==listenStand(ks)) dazu('gelb','geaendert','Schlüsselliste nach der Unterschrift geändert — neu unterschreiben lassen.');
  // gelb: Ausgaben
  as.forEach(a=>{
    const st=ausgabeStatus(a,heute), w=art(a)+' — '+wer(a);
    if(nurAkte(a.rolle)&&a.modus==='firma') dazu('gelb','privat',rolleName(a.rolle)+' nur über die Kundenakte erfassen: '+w+'.');
    else if(a.modus==='firma'&&text(a.firma)&&!firmaPlausibel(a.firma)) dazu('gelb','privat','„'+text(a.firma)+'“ sieht nicht nach einer Firma aus. Privatpersonen nur über die Kundenakte — dann greifen Auskunft und Löschen.');
    if(empfaengerFehlt(a)) dazu('gelb','empfaenger','Empfänger fehlt: '+art(a)+'.');
    if(!offen(a)) return;
    if(st.k==='heute') dazu('gelb','heute','Rückgabe heute fällig: '+w+'.');
    if(st.k==='ohneFrist') dazu('gelb','ohneFrist','Keine Rückgabe vereinbart: '+w+'.');
    if(!a.unterschrift) dazu('gelb','quittung','Ausgabe ohne Quittung (Unterschrift des Empfängers): '+w+'.');
    else if(a.stand&&a.stand!==ausgabeStand(a)) dazu('gelb','quittungGeaendert','Ausgabe nach der Quittung geändert — neu unterschreiben lassen: '+w+'.');
  });
  // gelb: Rückgabe an den Eigentümer
  const zur=ks.filter(k=>anzahl(k.zurueck)>0);
  if(zur.some(k=>!datum(k.zurueckAm))) dazu('gelb','rueckgabeDatum','Datum der Rückgabe an den Eigentümer fehlt.');
  if(zur.length&&!rg.unterschrift) dazu('gelb','rueckgabeUnterschrift','Rückgabe an den Eigentümer noch nicht von ihm unterschrieben.');
  else if(zur.length&&rg.stand&&rg.stand!==rueckgabeStand(ks)) dazu('gelb','rueckgabeGeaendert','Rückgabe nach der Unterschrift geändert — neu unterschreiben lassen.');
  const rot=aus.filter(x=>x.stufe==='rot').length, gelb=aus.filter(x=>x.stufe==='gelb').length;
  aus.sort((x,y)=>(x.stufe==='rot'?0:1)-(y.stufe==='rot'?0:1));
  if(!aus.length) dazu('gruen','ok','Alles erfasst: '+b.gesamt.anzahl+' Schlüssel, davon '+b.gesamt.beimBerater+' beim Berater'
    +(b.gesamt.ausgegeben?', '+b.gesamt.ausgegeben+' ausgegeben':'')+(b.gesamt.zurueck?', '+b.gesamt.zurueck+' zurück an den Eigentümer':'')+(b.gesamt.kaeufer?', '+b.gesamt.kaeufer+' an den Käufer':'')+'.');
  return {liste:aus,rot,gelb};
}

const ImmoSchluesselRegeln={ROLLEN,STAENDE_VERKAUF,datum,anzahl,de,rolleName,nurAkte,offen,bestand,verfuegbar,ausgabeStatus,rueckgabeVorschlag,faellige,
  listenStand,ausgabeStand,rueckgabeStand,firmaPlausibel,empfaengerFehlt,pruefen};
wurzel.ImmoSchluesselRegeln=ImmoSchluesselRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoSchluesselRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
