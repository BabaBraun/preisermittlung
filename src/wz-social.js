/* ---------- Kachel „Social Media“ (D44) ----------
   Ein Bild und ein Begleittext je Objekt für Instagram, Facebook, LinkedIn oder den WhatsApp-Status: Titelbild des Exposés,
   Titel, Ort, Eckdaten, Preis und ein Hinweis wie „Neu im Angebot“ oder „Reserviert“, in der Farbe des gewählten Farbschemas.
   Formate: quadratisch 1080 × 1080, hoch 1080 × 1350, Story 1080 × 1920. Ein Beitrag in sozialen Medien ist eine Anzeige in
   einem kommerziellen Medium — die Pflichtangaben zum Energieausweis (§ 87 GModG) stehen im Bild und im Text; fehlen sie, zeigt
   die Kachel das rot. Quelle wie beim Aushang (gesicherte Bewertungen in Vermarktung, js/portal.js); die App veröffentlicht
   nichts — Bild speichern oder teilen, Text kopieren. Keine Kundennamen; die Anschrift nur mit Einverständnis (wie im Exposé). */
var SO={daten:null,fuer:'',bild:null,laeuft:0};
const SO_FORMATE=[['quadrat','Quadrat 1080 × 1080 (Beitrag)',1080,1080],['hoch','Hochformat 1080 × 1350 (Beitrag)',1080,1350],['story','Story 1080 × 1920',1080,1920]];
const SO_HINWEISE=[['neu','Neu im Angebot'],['','ohne Hinweis'],['besichtigung','Besichtigung'],['reserviert','Reserviert'],['verkauft','Verkauft'],['eigen','eigener Text']];
function soStart(){ return {objekt:'',format:'quadrat',hinweis:'neu',eigen:'',besichtigung:'',preis:true,texte:{}}; }
function soS(){ let S=wzZustand('social'); if(!S.texte||typeof S.texte!=='object') S.texte={}; return S; }
function soHinweisText(S){
  if(S.hinweis==='eigen') return String(S.eigen||'').trim();
  if(S.hinweis==='besichtigung') return 'Besichtigung'+(String(S.besichtigung||'').trim()?' '+String(S.besichtigung).trim():'');
  return (SO_HINWEISE.find(h=>h[0]===S.hinweis)||['',''])[1].replace('ohne Hinweis','');
}
function soOrt(o){ return [o.geo.strasse&&o.geo.frei?o.geo.strasse+' '+o.geo.hausnummer:'',[o.geo.plz,o.geo.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
/* Begleittext: Titel, Ort, Eckdaten, Preis, Pflichtangaben, Ansprechpartner, Schlagworte */
function soText(d,S){
  let o=d.o, K=o.kontakt||{}, ort=soOrt(o), fakten=ahFakten(o).map(x=>x[0]+': '+x[1]).join(' · '), energie=ahEnergie(o.energie), h=soHinweisText(S);
  let tags=['#immobilien','#zuhause',o.geo.ort?'#'+String(o.geo.ort).toLowerCase().replace(/[^a-zäöüß0-9]/g,''):'','#kaufen'].filter(Boolean);
  return [(h?h+': ':'')+o.texte.titel,ort,fakten,S.preis!==false&&S.hinweis!=='verkauft'?'Kaufpreis: '+(o.preis>0?wzEur(o.preis):'auf Anfrage')+(o.provision&&o.provision.text?' · Käuferprovision: '+o.provision.text:''):'',
    energie?'Energieausweis: '+energie:'',
    K.name||K.tel||K.mail?'Ihr Ansprechpartner'+(K.name?': '+K.name:'')+[K.tel?', Telefon '+K.tel:'',K.mail?', '+K.mail:''].join(''):'',tags.join(' ')].filter(Boolean).join('\n\n');
}
function soZeichnen(){
  let S=soS(), l=wzdObjekte(false);
  if(!l.length) return wzBox('Social Media',wzHinweis('Hier erscheinen gesicherte Bewertungen mit Vermarktungsstand (Bewertung → Vermarktung). Titelbild, Texte und Preis kommen aus dem Exposé.'));
  if(!wzdObjekt(S.objekt)) S.objekt=l[0].id;
  let f=SO_FORMATE.find(x=>x[0]===S.format)||SO_FORMATE[0];
  return '<div class="wz-grid grid so-raster">'
    +wzBox('Beitrag','<div class="grid"><div class="field full"><label for="so_objekt">Objekt</label><select id="so_objekt" onchange="soS().objekt=this.value;SO.daten=null;wzSpeichern();wzZeichnen()">'
        +l.map(o=>'<option value="'+sEsc(o.id)+'"'+(o.id===S.objekt?' selected':'')+'>'+sEsc(o.name)+'</option>').join('')+'</select></div>'
      +wzFeld('format','Format',{typ:'wahl',optionen:SO_FORMATE.map(x=>[x[0],x[1]]),zeichnen:true})
      +wzFeld('hinweis','Hinweis im Bild',{typ:'wahl',optionen:SO_HINWEISE,zeichnen:true})
      +(S.hinweis==='eigen'?wzFeld('eigen','Eigener Hinweis',{typ:'text',ph:'z. B. Preis angepasst'}):'')
      +(S.hinweis==='besichtigung'?wzFeld('besichtigung','Wann',{typ:'text',ph:'z. B. am Samstag, 10. Oktober'}):'')
      +wzFeld('preis','Preis zeigen',{typ:'check',voll:true})+'</div>'
      +'<div id="so_pflicht"></div>'
      +wzHinweis('Fotos vorher ansehen: keine Personen, Kennzeichen oder Namen (Fotostudio). Die Anschrift zeigt die App nur, wenn sie im Exposé freigegeben ist.'))
    +wzBox('Vorschau','<canvas id="so_canvas" class="so-canvas" width="'+f[2]+'" height="'+f[3]+'" role="img" aria-label="Vorschau des Bildes"></canvas>'
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="soSpeichern()" data-ic="download">Bild speichern</button>'
      +'<button type="button" class="secondary" onclick="soTeilen()" data-ic="export">Teilen</button></div>')
    +'</div>'
    +wzBox('Text zum Beitrag','<textarea id="so_text" rows="9" aria-label="Text zum Beitrag" oninput="soTextSetzen(this.value)"></textarea>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="soKopieren()" data-ic="clipboard">Text kopieren</button>'
      +'<button type="button" class="secondary" onclick="soTextNeu()" data-ic="file">Vorschlag neu</button></div>');
}
function soTextSetzen(v){ let S=soS(); S.texte[S.objekt]=String(v||'').slice(0,4000); wzSpeichern(); }
function soTextNeu(){ let S=soS(); delete S.texte[S.objekt]; wzSpeichern(); soRechnen(S); }
async function soLaden(id){
  if(SO.daten&&SO.fuer===id) return SO.daten;
  let d=await ahDaten(id); SO.daten=d; SO.fuer=id; SO.bild=null;
  if(d&&d.bild) SO.bild=await new Promise(ok=>{ let i=new Image(); i.onload=()=>ok(i); i.onerror=()=>ok(null); i.src=bildUrl(d.bild); });
  return d;
}
async function soRechnen(S){
  S=S||soS(); if(!$('so_canvas')||!wzdObjekt(S.objekt)) return;
  let lauf=++SO.laeuft, d=await soLaden(S.objekt); if(lauf!==SO.laeuft||!d) return;
  let E=d.o.energie, h=aufHeute(), norm=ImmoPortal.energieNorm(E,h), fehlt=ImmoPortal.energiePflicht(E,h), rot=ImmoPortal.energieHinweise(E,h,{denkmal:d.o.denkmal}).filter(x=>x.stufe==='rot');
  if(rot.some(x=>/^Ausstellungsdatum/.test(x.text))) fehlt=fehlt.filter(x=>!/^Ausstellungsdatum/.test(x));   // nicht doppelt melden
  wzH('so_pflicht',(fehlt.length?wzAmpel('rot','Pflichtangaben zum Energieausweis fehlen ('+norm+'): '+sEsc(fehlt.join(', '))+' — im Exposé der Bewertung ergänzen, Ausstellungsdatum und Primärenergie im Portal-Export.'):'')
    +rot.map(x=>wzAmpel('rot',sEsc(x.text))).join('')
    +(!fehlt.length&&!rot.length?wzAmpel('gruen','Pflichtangaben zum Energieausweis vollständig ('+norm+').'):''));
  let t=$('so_text'); if(t&&document.activeElement!==t) t.value=S.texte[S.objekt]||soText(d,S);
  soMalen($('so_canvas'),d,S);
}
/* Bild: Foto füllt die Fläche, unten ein Verlauf mit Titel, Ort, Eckdaten, Preis und Pflichtangaben, oben links der Hinweis */
function soMalen(c,d,S){
  let f=SO_FORMATE.find(x=>x[0]===S.format)||SO_FORMATE[0], W=f[2], H=f[3];
  if(c.width!==W) c.width=W; if(c.height!==H) c.height=H;
  let g=c.getContext('2d'), o=d.o, cs=getComputedStyle(document.body), akzent=(cs.getPropertyValue('--accent-btn')||cs.getPropertyValue('--accent')||'#1D5BC4').trim()||'#1D5BC4';
  let schrift=(cs.fontFamily||'sans-serif');
  g.fillStyle='#24303f'; g.fillRect(0,0,W,H);
  if(SO.bild){ let b=SO.bild, s=Math.max(W/b.width,H/b.height), bw=b.width*s, bh=b.height*s; g.drawImage(b,(W-bw)/2,(H-bh)/2,bw,bh); }
  let unten=Math.round(H*(S.format==='story'?0.42:0.5)), verlauf=g.createLinearGradient(0,H-unten,0,H);
  verlauf.addColorStop(0,'rgba(10,16,24,0)'); verlauf.addColorStop(0.35,'rgba(10,16,24,.62)'); verlauf.addColorStop(1,'rgba(10,16,24,.9)');
  g.fillStyle=verlauf; g.fillRect(0,H-unten,W,unten);
  const rand=64, breite=W-2*rand;
  const zeilen=(text,px,gewicht,max)=>{ g.font=gewicht+' '+px+'px '+schrift; let w=String(text||'').split(/\s+/), l=[], z='';
    w.forEach(x=>{ let t=z?z+' '+x:x; if(g.measureText(t).width>breite&&z){ l.push(z); z=x; } else z=t; }); if(z) l.push(z);
    if(l.length>max){ l=l.slice(0,max); l[max-1]=l[max-1].replace(/\s*\S*$/,'')+' …'; } return l; };
  // Hinweis oben links
  let h=soHinweisText(S);
  if(h){ g.font='700 40px '+schrift; let tw=g.measureText(h).width; g.fillStyle=akzent; soRund(g,rand,rand,tw+56,76,38); g.fill(); g.fillStyle='#fff'; g.textBaseline='middle'; g.fillText(h,rand+28,rand+39); }
  // Text unten, von unten nach oben gesetzt
  g.textBaseline='alphabetic'; let y=H-rand;
  let firma=(o.kontakt&&o.kontakt.firma)||exV('cfg_kopf')||'', energie=ahEnergie(o.energie);
  g.fillStyle='rgba(255,255,255,.82)';
  if(firma){ g.font='500 26px '+schrift; g.fillText(firma,rand,y); y-=44; }
  if(energie){ let l=zeilen('Energieausweis: '+energie,24,'400',3); for(let i=l.length-1;i>=0;i--){ g.fillText(l[i],rand,y); y-=32; } y-=14; }
  let zeigPreis=S.preis!==false&&S.hinweis!=='verkauft';
  if(zeigPreis){ g.fillStyle='#fff'; g.font='700 64px '+schrift; g.fillText(o.preis>0?wzEur(o.preis):'Preis auf Anfrage',rand,y);
    let pw=g.measureText(o.preis>0?wzEur(o.preis):'Preis auf Anfrage').width; g.font='400 28px '+schrift; g.fillStyle='rgba(255,255,255,.82)'; g.fillText('Kaufpreis',rand+pw+20,y); y-=86; }
  let fakten=ahFakten(o).filter(x=>x[0]!=='Baujahr').map(x=>x[0]==='Zimmer'?x[1]+' Zimmer':x[1]+' '+x[0]).join('  ·  ');
  if(fakten){ g.fillStyle='#fff'; g.font='500 34px '+schrift; g.fillText(zeilen(fakten,34,'500',1)[0],rand,y); y-=56; }
  let ort=soOrt(o); if(ort){ g.fillStyle='rgba(255,255,255,.9)'; g.font='400 32px '+schrift; g.fillText(zeilen(ort,32,'400',1)[0],rand,y); y-=58; }
  let titel=zeilen(o.texte.titel||'',56,'700',2); g.fillStyle='#fff'; g.font='700 56px '+schrift;
  for(let i=titel.length-1;i>=0;i--){ g.fillText(titel[i],rand,y); y-=66; }
  // Akzentlinie über dem Titel
  g.fillStyle=akzent; g.fillRect(rand,y,140,10);
}
function soRund(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function soDateiname(){ let S=soS(), o=wzdObjekt(S.objekt); return wzDateiname('Social Media '+(o?o.name:'Objekt')+' '+S.format)+'.jpg'; }
function soBlob(){ let c=$('so_canvas'); return new Promise(ok=>{ if(!c) return ok(null); c.toBlob(b=>ok(b),'image/jpeg',0.9); }); }
async function soSpeichern(){ await soRechnen(); let b=await soBlob(); if(b) iaHerunterladen(b,soDateiname()); }
async function soTeilen(){ await soRechnen(); let b=await soBlob(); if(b) iaTeilen(b,soDateiname(),'Objekt'); }
function soKopieren(){ let t=$('so_text'); if(!t) return; try{ navigator.clipboard.writeText(t.value).then(()=>{ iaHinweis('Text kopiert'); setTimeout(()=>iaHinweis(''),1800); }); }catch(e){} }
wzRegistrieren({id:'social',titel:'Social Media',sub:'Bild und Text je Objekt — mit Pflichtangaben zum Energieausweis',icon:'megaphone',start:soStart,ohneNeu:true,
  zeichnen:soZeichnen,rechnen:soRechnen,schliessen:()=>{ SO.daten=null; SO.fuer=''; SO.bild=null; }});
