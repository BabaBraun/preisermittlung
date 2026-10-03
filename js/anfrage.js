/* ImmoApp — Anfrage-Mail eines Immobilienportals lesen (D52), ohne Seitenbezug
   Liest aus dem eingefügten Text einer Anfrage-Mail (Portal, Website-Formular) die Angaben „Bezeichnung: Wert“: Anrede, Name, E-Mail,
   Telefon, Anschrift, Objektnummer und die Nachricht. Erkennt das Portal am Text. Fehlt eine Bezeichnung, sucht die App die
   E-Mail-Adresse im ganzen Text (ohne Absender-Adressen der Portale) und die Telefonnummer nur in Zeilen mit „Tel“, „Mobil“ oder
   „Handy“. Die Formate der Portale ändern sich; die App übernimmt deshalb nichts ohne Prüfung — der Berater sieht die Angaben im
   Formular und legt die Anfrage selbst an. Kein Netzzugriff; der eingefügte Text wird nicht gespeichert. */
(function(wurzel){
'use strict';
const QUELLEN=[[/immobilienscout|immoscout|scout24/i,'ImmoScout24'],[/immowelt|immonet/i,'Immowelt'],[/kleinanzeigen|ivd24|immobilien\.de|meinestadt|kalaydo/i,'Anderes Portal']];
const LABEL={
  anrede:/^anrede$/i,
  vorname:/^vorname$/i,
  nachname:/^(nachname|familienname)$/i,
  name:/^(name|vor- und nachname|ihr name|kontaktperson|absender)$/i,
  email:/^(e-?mail|e-?mail-?adresse|mail|ihre e-?mail(-adresse)?)$/i,
  telefon:/^(telefon|telefonnummer|tel\.?|mobil|mobilnummer|handy|handynummer|rufnummer|telefon \(mobil\)|ihre telefonnummer)$/i,
  strasse:/^(straße|strasse|straße und hausnummer|straße, hausnummer|anschrift|adresse)$/i,
  plzort:/^(plz und ort|plz\/ort|plz, ort|wohnort|plz ort)$/i,
  objektnr:/^(objekt-?nr\.?|objektnummer|ihre objektnummer|objekt-?id|ihre objekt-?id|anbieter-?objekt-?id|externe objekt-?id|scout-?id|kennung|objektkennung)$/i,
  nachricht:/^(nachricht|ihre nachricht|mitteilung|anfrage|ihre anfrage|kommentar|anmerkung|text der anfrage)$/i
};
const ZEILE=/^\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß .,\/()-]{0,40}?)\s*:\s*(.*)$/;
const PORTAL_ADRESSE=/(no-?reply|noreply|donotreply|immobilienscout24|immowelt|immonet|kleinanzeigen|ivd24|mailer-daemon)/i;
function art(l){ for(const k in LABEL) if(LABEL[k].test(l)) return k; return ''; }
function anrede(s){ return /^frau/i.test(s)?'Frau':/^herr/i.test(s)?'Herr':/^divers/i.test(s)?'Divers':/^firma/i.test(s)?'Firma':''; }
function mail(s){ const m=String(s||'').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]; return m.find(x=>!PORTAL_ADRESSE.test(x))||''; }
function telefon(s){ const m=/(?:\+\d{2}|\(?0)[\d\s\/().-]{5,}\d/.exec(String(s||'')); return m?m[0].replace(/\s+/g,' ').trim():''; }
function lesen(text){
  text=String(text||'').replace(/\r\n?/g,'\n').replace(/ /g,' ');
  const r={quelle:'',anrede:'',vorname:'',nachname:'',email:'',telefon:'',strasse:'',plzort:'',objektnr:'',nachricht:'',gefunden:[]};
  for(const [re,q] of QUELLEN) if(re.test(text)){ r.quelle=q; break; }
  const z=text.split('\n'); let name='';
  for(let i=0;i<z.length;i++){
    const m=ZEILE.exec(z[i]); if(!m) continue;
    const k=art(m[1].trim()); let w=m[2].trim(); if(!k) continue;
    if(k==='nachricht'){   // Nachricht: auch die folgenden Zeilen bis zur nächsten bekannten Bezeichnung
      const l=[w]; for(let j=i+1;j<z.length;j++){ const n=ZEILE.exec(z[j]); if(n&&art(n[1].trim())) break; l.push(z[j]); }
      if(!r.nachricht) r.nachricht=l.join('\n').replace(/\n{3,}/g,'\n\n').trim(); continue; }
    if(!w&&i+1<z.length&&!ZEILE.exec(z[i+1])) w=z[i+1].trim();   // Wert in der nächsten Zeile
    if(!w) continue;
    if(k==='name'){ if(!name) name=w; continue; }
    if(k==='email') w=mail(w)||w.replace(/^mailto:/i,'').replace(/[<>]/g,'').trim();
    if(k==='telefon') w=telefon(w)||w;
    if(k==='anrede') w=anrede(w)||w;
    if(!r[k]) r[k]=w;
  }
  if(name&&!r.nachname){
    let n=name, a=/^(Frau|Herr|Divers)\s+/i.exec(n); if(a){ r.anrede=r.anrede||anrede(a[1]); n=n.slice(a[0].length).trim(); }
    if(/,/.test(n)){ const t=n.split(',').map(s=>s.trim()); r.nachname=t[0]; r.vorname=r.vorname||t[1]||''; }
    else { const t=n.split(/\s+/); r.nachname=t.pop()||''; r.vorname=r.vorname||t.join(' '); }
  }
  if(!r.email) r.email=mail(text);
  if(!r.telefon){ const l=z.find(x=>/\b(tel|telefon|mobil|handy|fon)\b/i.test(x)&&telefon(x)); if(l) r.telefon=telefon(l); }
  if(r.nachricht.length>1500) r.nachricht=r.nachricht.slice(0,1500)+' …';
  r.gefunden=[[r.vorname||r.nachname,'Name'],[r.email,'E-Mail'],[r.telefon,'Telefon'],[r.strasse||r.plzort,'Anschrift'],[r.objektnr,'Objektnummer'],[r.nachricht,'Nachricht'],[r.quelle,'Portal']]
    .filter(x=>x[0]).map(x=>x[1]);
  return r;
}
/* Objekt zur Objektnummer: liste=[{id, nr}]; sonst eine der Nummern irgendwo im Text */
function objektFinden(r,liste,text){
  const n=s=>String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
  const nr=n(r&&r.objektnr), l=(liste||[]).filter(o=>n(o.nr).length>=3);
  if(nr){ const t=l.find(o=>n(o.nr)===nr)||l.find(o=>nr.includes(n(o.nr))&&n(o.nr).length>=5); if(t) return t.id; }
  const g=n(text); const t=l.find(o=>n(o.nr).length>=5&&g.includes(n(o.nr)));
  return t?t.id:'';
}
/* gleicher Kunde? gleiche E-Mail oder gleiche Telefonnummer (mindestens 6 Ziffern, ohne Vorwahl-Unterschied +49/0) */
function ziffern(s){ return String(s||'').replace(/^\s*\+49/,'0').replace(/\D/g,''); }
function kundeFinden(r,kunden){
  const e=String(r.email||'').toLowerCase(), t=ziffern(r.telefon);
  return (kunden||[]).find(k=>(e&&String(k.email||'').toLowerCase()===e)||(t.length>=6&&ziffern(k.telefon)===t))||null;
}
const ImmoAnfrage={lesen,objektFinden,kundeFinden,ziffern};
wurzel.ImmoAnfrage=ImmoAnfrage;
if(typeof module==='object'&&module.exports) module.exports=ImmoAnfrage;
})(typeof globalThis!=='undefined'?globalThis:this);
