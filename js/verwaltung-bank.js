/* ImmoApp — Liegenschaftsverwaltung: Kontoauszug-Import (ohne DOM, in Node testbar)
   Liest Umsätze des Mietkontos aus
   - CAMT.053 / CAMT.052 / CAMT.054 (ISO 20022, XML — der einheitliche Standard der deutschen Banken; Volksbanken und
     Sparkassen bieten ihn im Online-Banking als „CAMT-Export“ bzw. „Kontoauszug als XML“ an) und
   - CSV-Exporten des Online-Bankings (Spalten werden am Kopf erkannt: Buchungstag, Betrag bzw. Soll/Haben,
     Name/IBAN der Gegenseite, Verwendungszweck).
   Nichts verlässt das Gerät: Die Datei wird im Browser gelesen. Zuordnung zu Mietverträgen und WEG-Hausgeld
   als Vorschlag (IBAN aus früheren Buchungen, Mietername, Einheit, Betrag); gebucht wird erst nach Bestätigung.
   Doppelte Umsätze erkennt der Import an einer Kennung aus Datum, Betrag, Gegenseite und Verwendungszweck. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const {r2,datumGueltig,monatVon,mieteAm,vertragAktiv,tagNr,isoTag,offenePosten}=V;

/* ---------- kleines XML-Lesen (ohne DOMParser, damit es auch in Node läuft) ---------- */
function entities(s){
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(m,e)=>{
    const k=e.toLowerCase();
    if(k==='amp') return '&'; if(k==='lt') return '<'; if(k==='gt') return '>'; if(k==='quot') return '"'; if(k==='apos') return "'";
    const n=k[1]==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10); return isFinite(n)&&n>0&&n<0x110000?String.fromCodePoint(n):'';
  });
}
function xmlBaum(text){
  const wurzelKnoten={n:'#',k:[],t:'',a:{}}, stapel=[wurzelKnoten];
  const re=/<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while((m=re.exec(text))){
    const oben=stapel[stapel.length-1];
    if(m[1]!=null){ oben.t+=m[1]; continue; }
    if(m[6]!=null){ oben.t+=entities(m[6]); continue; }
    if(!m[3]) continue;   // Kommentar, Verarbeitungsanweisung
    const name=m[3].replace(/^.*:/,'');
    if(m[2]==='/'){ for(let i=stapel.length-1;i>0;i--){ if(stapel[i].n===name){ stapel.length=i; break; } } continue; }
    const a={}; (m[4]||'').replace(/([\w.:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g,(x,k,y,d1,d2)=>{ a[k.replace(/^.*:/,'')]=entities(d1!=null?d1:d2); return ''; });
    const kn={n:name,k:[],t:'',a}; oben.k.push(kn);
    if(!m[5]) stapel.push(kn);
  }
  return wurzelKnoten;
}
function kind(k,...pfad){ let x=k; for(const p of pfad){ if(!x) return null; x=x.k.find(c=>c.n===p)||null; } return x; }
function kinder(k,name){ return k?k.k.filter(c=>c.n===name):[]; }
function txt(k,...pfad){ const x=kind(k,...pfad); return x?x.t.trim():''; }
function alle(k,name,aus){ aus=aus||[]; if(!k) return aus; k.k.forEach(c=>{ if(c.n===name) aus.push(c); alle(c,name,aus); }); return aus; }

/* ---------- CAMT ---------- */
function camtDatum(k){ const d=txt(k,'Dt')||txt(k,'DtTm').slice(0,10); return datumGueltig(d)?d:null; }
function camtLesen(text){
  const baum=xmlBaum(text), fehler=[];
  const auszuege=alle(baum,'Stmt').concat(alle(baum,'Rpt'),alle(baum,'Ntfctn'));
  if(!auszuege.length) return {ok:false,fehler:'Die Datei enthält keinen CAMT-Kontoauszug (Stmt/Rpt/Ntfctn).'};
  const umsaetze=[]; let konto='';
  auszuege.forEach(st=>{
    const iban=txt(st,'Acct','Id','IBAN'); if(iban&&!konto) konto=iban;
    kinder(st,'Ntry').forEach(ne=>{
      const status=txt(ne,'Sts','Cd')||txt(ne,'Sts');
      if(status&&!/^BOOK/i.test(status)) return;   // nur gebuchte Umsätze (keine Vormerkungen)
      const vorzeichen=txt(ne,'CdtDbtInd')==='DBIT'?-1:1, datum=camtDatum(kind(ne,'BookgDt'))||camtDatum(kind(ne,'ValDt')), valuta=camtDatum(kind(ne,'ValDt'));
      const betragNe=parseFloat(txt(ne,'Amt')), waehrung=(kind(ne,'Amt')||{a:{}}).a.Ccy||'EUR';
      const storno=/^true$/i.test(txt(ne,'RvslInd'));
      const zusatz=txt(ne,'AddtlNtryInf'), txs=alle(kind(ne,'NtryDtls'),'TxDtls');
      const einzel=txs.length>1&&txs.every(t=>isFinite(parseFloat(txt(t,'AmtDtls','TxAmt','Amt')))||isFinite(parseFloat(txt(t,'Amt'))));
      (einzel?txs:[txs[0]||null]).forEach(t=>{
        const betrag=einzel?parseFloat(txt(t,'AmtDtls','TxAmt','Amt')||txt(t,'Amt')):betragNe;
        const gegen=vorzeichen>0?'Dbtr':'Cdtr';
        const name=t?(txt(t,'RltdPties',gegen,'Nm')||txt(t,'RltdPties',gegen,'Pty','Nm')||txt(t,'RltdPties','Ultmt'+gegen,'Nm')):'';
        const gIban=t?(txt(t,'RltdPties',gegen+'Acct','Id','IBAN')):'';
        const zweck=t?kinder(kind(t,'RmtInf'),'Ustrd').map(x=>x.t.trim()).join(' ').trim():'';
        const e2e=t?txt(t,'Refs','EndToEndId'):'';
        if(!datum||!isFinite(betrag)){ fehler.push('Umsatz ohne Datum oder Betrag übersprungen'); return; }
        if(waehrung!=='EUR'){ fehler.push('Umsatz in '+waehrung+' übersprungen'); return; }
        umsaetze.push({datum,valuta,betrag:r2(vorzeichen*(storno?-1:1)*Math.abs(betrag)),name,iban:gIban.replace(/\s+/g,'').toUpperCase(),
          zweck:zweck||zusatz,text:txt(ne,'BkTxCd','Prtry','Cd')||zusatz,ref:e2e&&e2e!=='NOTPROVIDED'?e2e:''});
      });
    });
  });
  return {ok:true,format:'CAMT',konto:konto.replace(/\s+/g,'').toUpperCase(),umsaetze,warnungen:fehler};
}

/* ---------- CSV ---------- */
function csvZeilen(text,trenner){
  const zeilen=[]; let z=[], f='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; continue; }
    if(c==='"'&&f==='') q=true;
    else if(c===trenner){ z.push(f); f=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; z.push(f); f=''; if(z.some(x=>x.trim()!=='')) zeilen.push(z); z=[]; }
    else f+=c;
  }
  if(f!==''||z.length){ z.push(f); if(z.some(x=>x.trim()!=='')) zeilen.push(z); }
  return zeilen;
}
function kopfNorm(s){ return String(s||'').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim(); }
const SPALTEN={
  datum:['buchungstag','buchungsdatum','buchung','datum','valutadatum','wertstellung','valuta'],
  betrag:['betrag','betrag eur','betrag in eur','umsatz','umsatz in eur','betrag euro','umsatz eur'],
  soll:['soll','ausgang','belastung','soll eur'],haben:['haben','eingang','gutschrift','haben eur'],
  sh:['soll haben','s h','soll haben kennzeichen'],
  name:['name zahlungsbeteiligter','beguenstigter zahlungspflichtiger','zahlungspflichtiger beguenstigter','auftraggeber empfaenger','empfaenger auftraggeber','auftraggeber beguenstigter','beguenstigter auftraggeber','name gegenkonto','gegenkonto name','name','zahlungspflichtiger','auftraggeber','empfaenger','beguenstigter'],
  iban:['iban zahlungsbeteiligter','kontonummer iban','iban auftraggeber','iban gegenkonto','gegenkonto iban','iban','kontonummer'],
  zweck:['verwendungszweck','vorgang verwendungszweck','zweck','buchungsdetails','verwendungszweck 1'],
  text:['buchungstext','umsatzart','vorgang','transaktionstyp'],
  konto:['iban auftragskonto','auftragskonto','kontonummer auftragskonto']
};
function spalteFinden(kopf,liste,belegt){
  for(const n of liste){ const i=kopf.findIndex((k,j)=>k===n&&!belegt.has(j)); if(i>=0) return i; }
  return -1;
}
function csvDatum(s){
  const t=String(s||'').trim();
  let m=t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if(m){ const j=m[3].length===2?2000+ +m[3]:+m[3]; const d=j+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0'); return datumGueltig(d)?d:null; }
  m=t.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m&&datumGueltig(m[0].slice(0,10))) return m[0].slice(0,10);
  return null;
}
function csvBetrag(s){
  let t=String(s||'').replace(/[€\s]|EUR/g,'').replace(/[−–]/g,'-');
  if(!t) return null;
  let neg=false; if(/^\(.*\)$/.test(t)){ neg=true; t=t.slice(1,-1); } if(/-$/.test(t)){ neg=true; t=t.slice(0,-1); }
  const v=V.zahlEingabe(t);
  return v==null||!isFinite(v)?null:(neg?-Math.abs(v):v);
}
function csvLesen(text){
  text=String(text||'').replace(/^﻿/,'');
  const probe=text.split(/\r?\n/).slice(0,40).join('\n'), trenner=[';','\t',','].map(t=>[t,(probe.match(new RegExp(t==='\t'?'\\t':t,'g'))||[]).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const zeilen=csvZeilen(text,trenner);
  let kopfIdx=-1, sp=null;
  for(let i=0;i<Math.min(zeilen.length,40);i++){
    const k=zeilen[i].map(kopfNorm), belegt=new Set(), s={};
    s.datum=spalteFinden(k,SPALTEN.datum,belegt); if(s.datum>=0) belegt.add(s.datum);
    s.betrag=spalteFinden(k,SPALTEN.betrag,belegt); if(s.betrag>=0) belegt.add(s.betrag);
    s.soll=spalteFinden(k,SPALTEN.soll,belegt); s.haben=spalteFinden(k,SPALTEN.haben,belegt);
    if(s.datum>=0&&(s.betrag>=0||(s.soll>=0&&s.haben>=0))){
      ['sh','name','iban','zweck','text','konto'].forEach(x=>{ s[x]=spalteFinden(k,SPALTEN[x],belegt); if(s[x]>=0) belegt.add(s[x]); });
      if(s.sh<0&&s.betrag>=0){ const n=k[s.betrag+1]; if(n===''||n==='s h'||n==='soll haben') s.sh=s.betrag+1; }   // ältere Exporte: Kennzeichen ohne Überschrift
      kopfIdx=i; sp=s; break;
    }
  }
  if(!sp) return {ok:false,fehler:'In der CSV-Datei wurden keine Spalten für Buchungstag und Betrag gefunden. Bitte den Umsatzexport des Online-Bankings (CSV) oder einen CAMT-Auszug (XML) verwenden.'};
  const umsaetze=[], warn=[]; let konto='';
  zeilen.slice(kopfIdx+1).forEach((z,i)=>{
    const g=j=>j>=0?String(z[j]==null?'':z[j]).trim():'';
    const datum=csvDatum(g(sp.datum)); if(!datum){ if(z.filter(x=>x.trim()).length>2) warn.push('Zeile '+(kopfIdx+i+2)+': kein Datum — übersprungen'); return; }
    let b;
    if(sp.betrag>=0){ b=csvBetrag(g(sp.betrag)); const sh=g(sp.sh).toUpperCase(); if(b!=null&&sh==='S') b=-Math.abs(b); if(b!=null&&sh==='H') b=Math.abs(b); }
    else { const s=csvBetrag(g(sp.soll)), h=csvBetrag(g(sp.haben)); b=(h?Math.abs(h):0)-(s?Math.abs(s):0); if(!s&&!h) b=null; }
    if(b==null||!isFinite(b)||b===0){ warn.push('Zeile '+(kopfIdx+i+2)+': kein Betrag — übersprungen'); return; }
    if(!konto&&sp.konto>=0) konto=g(sp.konto).replace(/\s+/g,'').toUpperCase();
    umsaetze.push({datum,valuta:null,betrag:r2(b),name:g(sp.name),iban:g(sp.iban).replace(/\s+/g,'').toUpperCase(),zweck:g(sp.zweck),text:g(sp.text),ref:''});
  });
  return {ok:true,format:'CSV',konto:/^[A-Z]{2}\d{2}/.test(konto)?konto:'',umsaetze,warnungen:warn};
}
function lesen(text){
  const t=String(text||'').replace(/^﻿/,'').trimStart();
  if(t.startsWith('<')) return camtLesen(t);
  return csvLesen(t);
}

/* ---------- Kennung gegen Doppelbuchungen ---------- */
function kennung(u){
  const s=[u.datum,r2(u.betrag).toFixed(2),(u.iban||'').toUpperCase(),kopfNorm(u.name),kopfNorm(u.zweck).slice(0,140),u.ref||''].join('|');
  let h1=0x811c9dc5, h2=0x01000193;   // zwei FNV-1a-Varianten → 16 Hex-Zeichen
  for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,16777619)>>>0; h2=Math.imul(h2^(c+31),2246822519)>>>0; }
  return 'imp:'+h1.toString(16).padStart(8,'0')+h2.toString(16).padStart(8,'0');
}

/* ---------- Zuordnung ---------- */
const MONATE={januar:1,jan:1,februar:2,feb:2,maerz:3,marz:3,mar:3,april:4,apr:4,mai:5,juni:6,jun:6,juli:7,jul:7,august:8,aug:8,september:9,sep:9,sept:9,oktober:10,okt:10,november:11,nov:11,dezember:12,dez:12};
/* Monat aus dem Verwendungszweck: „Miete 03/2026“, „März 2026“, „2026-03“, „Miete Maerz“ (Jahr aus dem Buchungsdatum) */
function monatAusZweck(zweck,datum){
  const t=kopfNorm(zweck);
  let m=t.match(/\b(0?[1-9]|1[0-2])\s(20\d{2})\b/)||null;
  if(m) return m[2]+'-'+String(+m[1]).padStart(2,'0');
  m=t.match(/\b(20\d{2})\s(0[1-9]|1[0-2])\b/); if(m) return m[1]+'-'+m[2];
  m=t.match(/\b(0?[1-9]|1[0-2])\s(\d{2})\b/); if(m&&/miete|hausgeld|monat/.test(t)) return '20'+m[2]+'-'+String(+m[1]).padStart(2,'0');
  for(const [w,n] of Object.entries(MONATE)){
    const r=new RegExp('\\b'+w+'\\b(?:\\s(20\\d{2}))?'); const x=t.match(r);
    if(x&&(/miete|hausgeld/.test(t)||x[1])){ let j=x[1]?+x[1]:+datum.slice(0,4); const bm=+datum.slice(5,7); if(!x[1]&&n===1&&bm===12) j++; if(!x[1]&&n===12&&bm===1) j--; return j+'-'+String(n).padStart(2,'0'); }
  }
  return '';
}
function namensTeile(n){ return kopfNorm(n).split(' ').filter(w=>w.length>=3&&!['und','von','der','die','das','herr','frau','familie','fam','dr','gbr','mbh','gmbh'].includes(w)); }
/* Kandidaten: Mietverträge (aktiv um das Buchungsdatum oder im letzten Jahr beendet) und WEG-Einheiten */
function kandidaten(l){
  const k=[];
  (l.vertraege||[]).forEach(v=>{ const e=(l.einheiten||[]).find(x=>x.id===v.einheitId)||{};
    k.push({typ:'miete',id:v.id,v,e,namen:(v.mieter||[]).map(m=>m.name).filter(Boolean),ibans:new Set((l.zahlungen||[]).filter(z=>z.vertragId===v.id&&z.iban).map(z=>z.iban))}); });
  if(l.art==='weg'&&l.weg){
    const W=wurzel.ImmoWeg||(typeof require==='function'?(()=>{ try{ return require('./verwaltung-weg.js'); }catch(e){ return null; } })():null);
    (l.einheiten||[]).forEach(e=>{
      const eig=(l.weg.eigentuemer||[]).filter(o=>o.einheitId===e.id);
      k.push({typ:'hausgeld',id:e.id,e,namen:eig.map(o=>o.name).filter(Boolean),ibans:new Set((l.weg.zahlungen||[]).filter(z=>z.einheitId===e.id&&z.iban).map(z=>z.iban)),W});
    });
  }
  return k;
}
function erwarteteBetraege(l,c,datum){
  const b=new Set();
  if(c.typ==='miete'){ const m=mieteAm(c.v,datum); if(m.gesamt>0) b.add(r2(m.gesamt).toFixed(2)); if(m.kalt>0) b.add(r2(m.kalt).toFixed(2));
    const k=(c.v.kaution||{}).soll; if(k>0){ b.add(r2(k).toFixed(2)); if(c.v.kaution.raten) b.add(r2(Math.floor(k/3*100)/100).toFixed(2)); } }
  if(c.typ==='hausgeld'&&c.W){ try{ const p=c.W.hausgeldPosten(l,c.id,datum).filter(x=>x.art==='hausgeld').pop(); if(p) b.add(r2(p.betrag).toFixed(2)); }catch(e){} }
  return b;
}
function bewerten(l,u,c){
  let punkte=0; const gruende=[];
  if(u.iban&&c.ibans.has(u.iban)){ punkte+=60; gruende.push('IBAN aus früheren Zahlungen'); }
  const gName=new Set(namensTeile(u.name)), gZweck=new Set(namensTeile(u.zweck));
  let bestName=0;
  c.namen.forEach(n=>{ const t=namensTeile(n); if(!t.length) return; const inName=t.filter(w=>gName.has(w)).length, inZweck=t.filter(w=>gZweck.has(w)).length;
    const p=inName===t.length?40:inName>0?30:inZweck===t.length?30:inZweck>0?20:0; if(p>bestName) bestName=p; });
  if(bestName){ punkte+=bestName; gruende.push('Name'); }
  const nr=c.e&&c.e.nr?kopfNorm(c.e.nr):'';
  if(nr&&nr.length>=2&&new RegExp('(^| )'+nr.replace(/ /g,' ?')+'( |$)').test(kopfNorm(u.zweck))){ punkte+=15; gruende.push('Einheit '+c.e.nr); }
  if(erwarteteBetraege(l,c,u.datum).has(r2(Math.abs(u.betrag)).toFixed(2))){ punkte+=25; gruende.push('Betrag passt'); }
  if(c.typ==='miete'){ const v=c.v, bis=v.ende?isoTag(tagNr(v.ende)+365):null;
    if(u.datum<isoTag(tagNr(v.beginn)-31)||(bis&&u.datum>bis)) punkte-=50; }
  return {punkte,gruende};
}
/* Vorschläge für alle Umsätze: {u, kennung, doppelt, vorschlag:{typ,id,punkte,gruende}|null, alternativen, monat, art} */
function zuordnen(l,umsaetze){
  const vorhanden=new Set((l.zahlungen||[]).map(z=>z.quelle).filter(Boolean).concat(((l.weg&&l.weg.zahlungen)||[]).map(z=>z.quelle).filter(Boolean)));
  const kand=kandidaten(l), gesehen=new Set();
  return umsaetze.map(u=>{
    const id=kennung(u), doppelt=vorhanden.has(id)||gesehen.has(id); gesehen.add(id);
    const bew=kand.map(c=>Object.assign({typ:c.typ,id:c.id},bewerten(l,u,c))).filter(x=>x.punkte>0).sort((a,b)=>b.punkte-a.punkte);
    const best=bew[0]||null, eindeutig=best&&best.punkte>=50&&(!bew[1]||bew[1].punkte<best.punkte-10);
    const ruecklast=u.betrag<0&&/r(ue|u)ck(last|buch|ueberweis)|retoure|storno/i.test(kopfNorm(u.zweck+' '+u.text));
    const kaution=/kaution/i.test(u.zweck);
    return {u,kennung:id,doppelt,vorschlag:(u.betrag>0||ruecklast)&&eindeutig?best:null,alternativen:bew.slice(0,5),
      monat:monatAusZweck(u.zweck,u.datum),art:kaution?'kaution':/nachzahlung|nebenkosten|abrechnung/i.test(u.zweck)?'nk_nachzahlung':'miete',ruecklast};
  });
}
/* Buchungen für die bestätigten Zuordnungen: [{kennung, typ:'miete'|'hausgeld', id, art, monat}] → Zahlungseinträge */
function buchungen(l,vorschlaege,auswahl,neueId){
  const nach=new Map(vorschlaege.map(x=>[x.kennung,x])), miete=[], hausgeld=[];
  (auswahl||[]).forEach(a=>{
    const x=nach.get(a.kennung); if(!x||x.doppelt) return;
    const u=x.u, basis={id:neueId(a.typ==='hausgeld'?'HZ':'Z'),datum:u.datum,betrag:r2(u.betrag),monat:/^\d{4}-\d{2}$/.test(a.monat||'')?a.monat:'',
      text:[u.name,u.zweck].filter(Boolean).join(' · ').slice(0,300),quelle:x.kennung};
    if(u.iban&&/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(u.iban)) basis.iban=u.iban;
    if(a.typ==='miete'&&(l.vertraege||[]).some(v=>v.id===a.id)) miete.push(Object.assign(basis,{vertragId:a.id,art:['miete','kaution','nk_nachzahlung','sonstig'].includes(a.art)?a.art:'miete'}));
    else if(a.typ==='hausgeld'&&(l.einheiten||[]).some(e=>e.id===a.id)) hausgeld.push(Object.assign(basis,{einheitId:a.id}));
  });
  return {miete,hausgeld};
}

const ImmoBankimport={xmlBaum,camtLesen,csvLesen,csvZeilen,lesen,kennung,monatAusZweck,kandidaten,bewerten,zuordnen,buchungen,csvBetrag,csvDatum};
wurzel.ImmoBankimport=ImmoBankimport;
if(typeof module==='object'&&module.exports) module.exports=ImmoBankimport;
})(typeof globalThis!=='undefined'?globalThis:this);
