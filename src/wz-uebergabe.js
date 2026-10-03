/* ---------- Kachel „Übergabeprotokoll“ (D38) ----------
   Übergabe nach dem Verkauf (Besitzübergang) oder bei Vermietung: Zählerstände mit Foto, Schlüssel, Zustand und Mängel mit
   Foto, übergebene Unterlagen, Unterschrift beider Seiten auf dem Gerät. Die Protokolle enthalten Namen, Fotos und
   Unterschriften — sie liegen deshalb in der Datenbank auf dem Gerät (Speicher „protokolle“, nicht im localStorage) und
   lassen sich einzeln löschen. „Abschließen“ sperrt das Protokoll; wer danach ändert, entfernt die Unterschriften. */
var UB={liste:null,aktiv:null,timer:null,fotoZiel:null};
const UB_ZAEHLER=['Strom','Gas','Wasser kalt','Wasser warm','Wärmemengenzähler','Heizöl (Tankinhalt)','Sonstiges'];
const UB_SCHLUESSEL=['Haustür','Wohnungstür','Briefkasten','Keller','Garage / Tiefgarage'];
const UB_UNTERLAGEN=['Energieausweis','Bedienungsanleitungen und Garantien','Grundrisse / Pläne','Wartungsnachweise Heizung','Protokoll des Schornsteinfegers','Hausordnung'];
const UB_ROLLEN=[['uebergeber','Übergeber'],['uebernehmer','Übernehmer']];
function ubLeer(){
  return {id:'ub'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),ts:Date.now(),geaendert:Date.now(),art:'Verkauf (Besitzübergang)',datum:aufHeute(),uhrzeit:'',
    anschrift:'',lage:'',uebergeber:'',uebernehmer:'',anwesend:'',
    zaehler:UB_ZAEHLER.slice(0,4).map(a=>({art:a,nummer:'',stand:'',foto:''})),
    schluessel:UB_SCHLUESSEL.slice(0,4).map(a=>({art:a,anzahl:''})),
    zustand:'besenrein',maengel:[],unterlagen:UB_UNTERLAGEN.map(n=>({name:n,ok:false})),bemerkung:'',ort:'',
    unterschrift:{uebergeber:'',uebernehmer:''},nachUnterschrift:false,abgeschlossen:false,abgeschlossenAm:''};
}
async function ubLaden(){
  await IA_BEREIT_P;
  if(!IA_DB_BEREIT){ UB.liste=[]; return; }
  try{ UB.liste=(await iaAlle('protokolle')).sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')||(b.ts||0)-(a.ts||0)); }catch(e){ UB.liste=[]; }
}
function ubSpeichernBald(){ if(!UB.aktiv) return; UB.aktiv.geaendert=Date.now(); clearTimeout(UB.timer); UB.timer=setTimeout(ubSpeichernJetzt,400); }
async function ubSpeichernJetzt(){
  clearTimeout(UB.timer); if(!UB.aktiv||!IA_DB_BEREIT) return;
  try{ await iaPut('protokolle',JSON.parse(JSON.stringify(UB.aktiv))); speicherFehler('ub',''); }
  catch(e){ speicherFehler('ub','Das Übergabeprotokoll konnte nicht gespeichert werden: '+iaFehlerText(e)+'.'); }
}
/* Eingabe in einem Feld: nach einer Unterschrift geändert → vor dem Abschließen neu unterschreiben lassen */
function ubGeaendert(){
  let p=UB.aktiv; if(!p) return;
  if(p.unterschrift.uebergeber||p.unterschrift.uebernehmer) p.nachUnterschrift=true;
  ubSpeichernBald(); ubStatus();
}
function ubNeu(){
  if(!IA_DB_BEREIT){ alert('Übergabeprotokolle brauchen die Gerätedatenbank, die in diesem Browserfenster nicht zur Verfügung steht (z. B. privates Fenster).'); return; }
  let p=ubLeer(); if(wzBewertung()) p.anschrift=exV('ek_anschrift')||'';
  UB.aktiv=p; UB.liste.unshift(p); ubSpeichernJetzt(); wzZeichnen();
}
function ubOeffnenProtokoll(id){ let p=(UB.liste||[]).find(x=>x.id===id); if(!p) return; UB.aktiv=p; wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function ubZurListe(){ await ubSpeichernJetzt(); UB.aktiv=null; await ubLaden(); wzZeichnen(); }
async function ubLoeschen(id){
  if(!confirm('Dieses Übergabeprotokoll mit Fotos und Unterschriften endgültig löschen?')) return;
  try{ await iaDel('protokolle',id); }catch(e){ alert('Das Protokoll konnte nicht gelöscht werden: '+iaFehlerText(e)+'.'); return; }
  if(UB.aktiv&&UB.aktiv.id===id) UB.aktiv=null;
  await ubLaden(); wzZeichnen();
}
function ubZeile(liste,neu){ let p=UB.aktiv; if(!p||p.abgeschlossen) return; p[liste].push(neu); ubGeaendert(); wzZeichnen(); }
function ubZeileWeg(liste,i){ let p=UB.aktiv; if(!p||p.abgeschlossen) return; p[liste].splice(i,1); ubGeaendert(); wzZeichnen(); }

/* ---------- Fotos ---------- */
function ubFoto(liste,i){ if(!UB.aktiv||UB.aktiv.abgeschlossen) return; UB.fotoZiel=[liste,i]; let f=$('ub_datei'); if(f){ f.value=''; f.click(); } }
function ubFotoDatei(files){
  let z=UB.fotoZiel; UB.fotoZiel=null; let f=files&&files[0];
  if(!z||!f||!f.type||!f.type.startsWith('image/')||!UB.aktiv) return;
  let r=new FileReader();
  r.onload=()=>downscale(r.result,1400,0.75,url=>{ let o=UB.aktiv&&UB.aktiv[z[0]]&&UB.aktiv[z[0]][z[1]]; if(!o) return; o.foto=url; ubGeaendert(); wzZeichnen(); });
  r.readAsDataURL(f);
}
function ubFotoWeg(liste,i){ let o=UB.aktiv&&UB.aktiv[liste]&&UB.aktiv[liste][i]; if(!o||UB.aktiv.abgeschlossen) return; o.foto=''; ubGeaendert(); wzZeichnen(); }
function ubFotoHtml(liste,i,o){
  return '<div class="ub-foto">'+(o.foto?'<img src="'+bildUrl(o.foto)+'" alt="Foto">'
      +'<button type="button" class="weg" aria-label="Foto entfernen" onclick="ubFotoWeg(\''+liste+'\','+i+')">✕</button>':'')
    +'<button type="button" class="secondary ub-foto-knopf" onclick="ubFoto(\''+liste+'\','+i+')" data-ic="camera">'+(o.foto?'Neu':'Foto')+'</button></div>';
}

/* ---------- Unterschriften ---------- */
function ubPad(c){
  if(!c||c.dataset.init) return; c.dataset.init='1';
  let rolle=c.dataset.rolle, ctx=c.getContext('2d'), r=c.getBoundingClientRect(), w=Math.max(200,Math.round(r.width)), h=Math.max(100,Math.round(r.height));
  c.width=w*2; c.height=h*2; ctx.setTransform(2,0,0,2,0,0);
  ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111';
  let bild=UB.aktiv&&UB.aktiv.unterschrift[rolle];
  if(bild){ let img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,w,h); img.src=bild; }
  let an=false, last=null;
  const pt=e=>{ let b=c.getBoundingClientRect(); return {x:(e.clientX-b.left)*w/b.width,y:(e.clientY-b.top)*h/b.height}; };
  c.addEventListener('pointerdown',e=>{ if(!UB.aktiv||UB.aktiv.abgeschlossen) return; an=true; last=pt(e); try{ c.setPointerCapture(e.pointerId); }catch(x){}
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(last.x+0.1,last.y+0.1); ctx.stroke(); e.preventDefault(); });
  c.addEventListener('pointermove',e=>{ if(!an) return; let p=pt(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; e.preventDefault(); });
  const ende=()=>{ if(!an) return; an=false; if(!UB.aktiv) return;
    UB.aktiv.unterschrift[rolle]=c.toDataURL('image/png'); UB.aktiv.unterschrift[rolle+'Zeit']=new Date().toISOString();
    UB.aktiv.nachUnterschrift=false; ubSpeichernBald(); ubStatus(); };
  ['pointerup','pointercancel','pointerleave'].forEach(t=>c.addEventListener(t,ende));
}
function ubUnterschriftWeg(rolle){
  let p=UB.aktiv; if(!p||p.abgeschlossen) return;
  p.unterschrift[rolle]=''; delete p.unterschrift[rolle+'Zeit']; ubSpeichernBald(); wzZeichnen();
}
function ubAbschliessen(){
  let p=UB.aktiv; if(!p) return;
  if(!p.unterschrift.uebergeber||!p.unterschrift.uebernehmer){ alert('Zum Abschließen müssen Übergeber und Übernehmer unterschreiben.'); return; }
  if(p.nachUnterschrift){ alert('Das Protokoll wurde nach einer Unterschrift geändert. Bitte die Unterschriften löschen und neu unterschreiben lassen.'); return; }
  p.abgeschlossen=true; p.abgeschlossenAm=new Date().toISOString(); ubSpeichernJetzt(); wzZeichnen();
}
function ubWiederOeffnen(){
  let p=UB.aktiv; if(!p) return;
  if(!confirm('Zum Bearbeiten werden beide Unterschriften entfernt. Fortfahren?')) return;
  p.abgeschlossen=false; p.abgeschlossenAm=''; p.unterschrift={uebergeber:'',uebernehmer:''}; p.nachUnterschrift=false; ubSpeichernJetzt(); wzZeichnen();
}
function ubStatusText(p){
  if(p.abgeschlossen) return 'Abgeschlossen am '+new Date(p.abgeschlossenAm).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'});
  let n=(p.unterschrift.uebergeber?1:0)+(p.unterschrift.uebernehmer?1:0);
  if(p.nachUnterschrift) return 'Nach einer Unterschrift geändert — neu unterschreiben lassen';
  return n===2?'Beide haben unterschrieben — jetzt abschließen':n===1?'Eine Unterschrift fehlt noch':'Entwurf';
}
function ubStatus(){ if(UB.aktiv) wzT('ub_status',ubStatusText(UB.aktiv)); }

/* ---------- Ansicht ---------- */
function ubZeichnen(){
  if(UB.liste===null){ ubLaden().then(()=>{ if(WZ.aktiv==='uebergabe') wzZeichnen(); }); return '<p class="hint">Protokolle werden geladen …</p>'; }
  return UB.aktiv?ubEditor(UB.aktiv):ubListe();
}
function ubListe(){
  let l=UB.liste||[];
  return wzBox('Übergabeprotokolle',wzHinweis('Für die Schlüsselübergabe nach dem Notartermin oder bei Vermietung: Zählerstände, Schlüssel, Mängel mit Fotos, beide Seiten unterschreiben auf dem Gerät. Protokolle liegen nur auf diesem Gerät.')
    +'<button type="button" class="primary" onclick="ubNeu()" data-ic="plus">Neues Protokoll</button>'
    +(l.length?'<div class="wz-tabwrap" style="margin-top:14px"><table class="nhk wz-tab"><thead><tr><th>Datum</th><th>Objekt</th><th>Art</th><th>Stand</th><th></th></tr></thead><tbody>'
      +l.map(p=>'<tr><td>'+wzDatum(p.datum)+'</td><td>'+sEsc(p.anschrift||'ohne Anschrift')+(p.lage?'<small>'+sEsc(p.lage)+'</small>':'')+'</td><td>'+sEsc(p.art||'')+'</td>'
        +'<td>'+sEsc(ubStatusText(p))+'</td><td class="wz-aktion"><button class="secondary" onclick="ubOeffnenProtokoll(\''+idSicher(p.id)+'\')">Öffnen</button>'
        +'<button class="secondary" onclick="ubLoeschen(\''+idSicher(p.id)+'\')" aria-label="Protokoll löschen" data-ic="trash"></button></td></tr>').join('')+'</tbody></table></div>'
      :'<p class="hint" style="margin-top:14px">Noch kein Protokoll.</p>'));
}
function ubEditor(p){
  let zu=!!p.abgeschlossen;
  let zaehler=p.zaehler.map((z,i)=>'<div class="wz-reihe ub-reihe">'
    +wzFeld('zaehler.'+i+'.art','Zähler',{typ:'wahl',optionen:UB_ZAEHLER.map(a=>[a,a])})+wzFeld('zaehler.'+i+'.nummer','Zählernummer',{typ:'text'})
    +wzFeld('zaehler.'+i+'.stand','Stand',{typ:'text'})+ubFotoHtml('zaehler',i,z)
    +'<button type="button" class="weg" aria-label="Zähler '+(i+1)+' entfernen" onclick="ubZeileWeg(\'zaehler\','+i+')">✕</button></div>').join('');
  let schl=p.schluessel.map((s,i)=>'<div class="wz-reihe ub-reihe-kurz">'+wzFeld('schluessel.'+i+'.art','Schlüssel',{typ:'text'})+wzFeld('schluessel.'+i+'.anzahl','Anzahl',{typ:'zahl'})
    +'<button type="button" class="weg" aria-label="Schlüssel '+(i+1)+' entfernen" onclick="ubZeileWeg(\'schluessel\','+i+')">✕</button></div>').join('');
  let maengel=p.maengel.map((m,i)=>'<div class="wz-reihe ub-reihe-mangel">'+wzFeld('maengel.'+i+'.text','Mangel '+(i+1),{typ:'lang',zeilen:2,ph:'z. B. Kratzer im Parkett Wohnzimmer'})+ubFotoHtml('maengel',i,m)
    +'<button type="button" class="weg" aria-label="Mangel '+(i+1)+' entfernen" onclick="ubZeileWeg(\'maengel\','+i+')">✕</button></div>').join('');
  let unterlagen=p.unterlagen.map((u,i)=>'<div class="wz-reihe ub-reihe-kurz">'+wzFeld('unterlagen.'+i+'.ok','übergeben',{typ:'check'})+wzFeld('unterlagen.'+i+'.name','Unterlage',{typ:'text'})
    +'<button type="button" class="weg" aria-label="Unterlage '+(i+1)+' entfernen" onclick="ubZeileWeg(\'unterlagen\','+i+')">✕</button></div>').join('');
  let pads=UB_ROLLEN.map(([r,t])=>'<div class="ub-pad"><div class="ub-pad-kopf"><b>'+t+'</b>'+(p[r]?'<span>'+sEsc(p[r])+'</span>':'')+'</div>'
    +'<canvas class="ub-canvas" data-rolle="'+r+'" aria-label="Unterschrift '+t+'"></canvas>'
    +'<button type="button" class="secondary" onclick="ubUnterschriftWeg(\''+r+'\')">Unterschrift löschen</button></div>').join('');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="ubZurListe()" data-ic="arrow-left">Alle Protokolle</button>'
      +'<span class="ub-status" id="ub_status">'+sEsc(ubStatusText(p))+'</span>'
      +(zu?'<button type="button" class="secondary" onclick="ubWiederOeffnen()">Bearbeiten</button>':'<button type="button" class="primary" onclick="ubAbschliessen()" data-ic="check">Abschließen</button>')+'</div>'
    +'<input type="file" id="ub_datei" accept="image/*" capture="environment" style="display:none" onchange="ubFotoDatei(this.files)">'
    +'<fieldset class="ub-felder"'+(zu?' disabled':'')+'>'
    +wzBox('Übergabe','<div class="grid">'+wzFeld('art','Art',{typ:'wahl',optionen:[['Verkauf (Besitzübergang)','Verkauf (Besitzübergang)'],['Vermietung (Einzug)','Vermietung (Einzug)'],['Rückgabe (Auszug)','Rückgabe (Auszug)']]})
      +wzFeld('datum','Datum',{typ:'datum'})+wzFeld('uhrzeit','Uhrzeit',{typ:'text',ph:'z. B. 10:30'})+wzFeld('anschrift','Anschrift',{typ:'text'})
      +wzFeld('lage','Lage / Einheit',{typ:'text',ph:'z. B. Wohnung 2. OG links, Stellplatz 4'})+wzFeld('uebergeber','Übergeber (Name)',{typ:'text'})
      +wzFeld('uebernehmer','Übernehmer (Name)',{typ:'text'})+wzFeld('anwesend','Weitere Anwesende',{typ:'text'})+'</div>')
    +wzBox('Zählerstände',zaehler+'<button type="button" class="plus" onclick="ubZeile(\'zaehler\',{art:\'Sonstiges\',nummer:\'\',stand:\'\',foto:\'\'})">＋ Zähler</button>')
    +wzBox('Schlüssel',schl+'<button type="button" class="plus" onclick="ubZeile(\'schluessel\',{art:\'\',anzahl:\'\'})">＋ Schlüssel</button>')
    +wzBox('Zustand und Mängel','<div class="grid">'+wzFeld('zustand','Zustand bei Übergabe',{typ:'wahl',optionen:[['besenrein','besenrein'],['renoviert','renoviert'],['wie besichtigt','wie besichtigt'],['siehe Bemerkungen','siehe Bemerkungen']]})+'</div>'
      +maengel+'<button type="button" class="plus" onclick="ubZeile(\'maengel\',{text:\'\',foto:\'\'})">＋ Mangel</button>')
    +wzBox('Übergebene Unterlagen',unterlagen+'<button type="button" class="plus" onclick="ubZeile(\'unterlagen\',{name:\'\',ok:false})">＋ Unterlage</button>')
    +wzBox('Bemerkungen und Vereinbarungen',wzFeld('bemerkung','Bemerkungen',{typ:'lang',zeilen:3,voll:true,ph:'z. B. Restarbeiten, Absprachen zu Mängeln'}))
    +'</fieldset>'
    +wzBox('Unterschriften','<fieldset class="ub-felder"'+(zu?' disabled':'')+'><div class="grid">'+wzFeld('ort','Ort',{typ:'text'})+'</div></fieldset>'
      +wzHinweis('Mit dem Finger oder Stift im Feld unterschreiben. Wer nach einer Unterschrift noch etwas ändert, muss neu unterschreiben lassen.')
      +'<div class="ub-pads">'+pads+'</div>');
}
function ubRechnen(){
  if(!UB.aktiv) return;
  document.querySelectorAll('#wz_body canvas.ub-canvas').forEach(ubPad);
  if(UB.aktiv.abgeschlossen) document.querySelectorAll('#wz_body .ub-pad button').forEach(b=>b.disabled=true);
  ubStatus();
}
function ubDokument(){
  let p=UB.aktiv; if(!p){ alert('Bitte zuerst ein Protokoll öffnen.'); return null; }
  let bild=u=>u?'<img class="wzd-bild" src="'+bildUrl(u)+'" alt="Foto">':'';
  let z=p.zaehler.filter(x=>x.nummer||x.stand||x.foto), s=p.schluessel.filter(x=>x.art||x.anzahl), m=p.maengel.filter(x=>x.text||x.foto), u=p.unterlagen.filter(x=>x.name);
  return {titel:'Übergabeprotokoll '+(p.anschrift||'')+' '+wzDatum(p.datum),
    html:'<h1>Übergabeprotokoll</h1><p class="wzd-unter">'+sEsc(p.art||'')+' · '+wzDatum(p.datum)+(p.uhrzeit?', '+sEsc(p.uhrzeit)+' Uhr':'')+'</p>'
      +wzDokTabelle([['Anschrift',sEsc(p.anschrift||'')],p.lage?['Lage / Einheit',sEsc(p.lage)]:null,['Übergeber',sEsc(p.uebergeber||'')],['Übernehmer',sEsc(p.uebernehmer||'')],p.anwesend?['Weitere Anwesende',sEsc(p.anwesend)]:null])
      +'<h2>Zählerstände</h2>'+(z.length?wzDokTabelle(z.map(x=>[sEsc(x.art),sEsc(x.nummer||'–'),sEsc(x.stand||'–')]),['Zähler','Nummer','Stand'])+'<div class="wzd-bilder">'+z.map(x=>bild(x.foto)).join('')+'</div>':'<p>Keine Zähler erfasst.</p>')
      +'<h2>Schlüssel</h2>'+(s.length?wzDokTabelle(s.map(x=>[sEsc(x.art||'Schlüssel'),sEsc(x.anzahl||'–')]),['Schlüssel','Anzahl']):'<p>Keine Schlüssel erfasst.</p>')
      +'<h2>Zustand und Mängel</h2><p>Zustand bei Übergabe: '+sEsc(p.zustand||'')+'</p>'
      +(m.length?'<ol>'+m.map(x=>'<li>'+sEsc(x.text||'')+(x.foto?'<br>'+bild(x.foto):'')+'</li>').join('')+'</ol>':'<p>Keine Mängel festgestellt.</p>')
      +'<h2>Übergebene Unterlagen</h2>'+(u.length?'<ul>'+u.map(x=>'<li>'+(x.ok?'☑':'☐')+' '+sEsc(x.name)+'</li>').join('')+'</ul>':'<p>–</p>')
      +(p.bemerkung?'<h2>Bemerkungen und Vereinbarungen</h2><p>'+sEsc(p.bemerkung).replace(/\n/g,'<br>')+'</p>':'')
      +'<h2>Unterschriften</h2><p>'+sEsc(p.ort||'')+(p.ort?', ':'')+wzDatum(p.datum)+'</p><div class="wzd-unterschriften">'
      +UB_ROLLEN.map(([r,t])=>'<div>'+(p.unterschrift[r]?'<img src="'+p.unterschrift[r]+'" alt="Unterschrift '+t+'">':'<div class="wzd-linie"></div>')+'<p>'+t+(p[r]?': '+sEsc(p[r]):'')+'</p></div>').join('')+'</div>'
      +'<p class="wzd-klein">Stand: '+sEsc(ubStatusText(p))+'.</p>',
    fuss:'Übergabeprotokoll.'};
}
wzRegistrieren({id:'uebergabe',titel:'Übergabeprotokoll',sub:'Zähler · Schlüssel · Mängel mit Foto · Unterschriften',icon:'key',ohneNeu:true,
  zustand:()=>UB.aktiv,speichern:ubGeaendert,zeichnen:ubZeichnen,rechnen:ubRechnen,dokument:ubDokument,
  schliessen:()=>{ ubSpeichernJetzt(); }});

/* ---------- Kundenakte: Auskunft und Löschen (D48) ----------
   Ein Kunde steckt in einem Protokoll, wenn es mit seiner Kunden-Id verknüpft ist (angelegt aus dem Notarauftrag) oder sein Name
   bei Übergeber, Übernehmer oder Anwesenden steht. Beim Löschen ersetzt die App seinen Namen durch „(Kunde gelöscht)“ und
   entfernt die Unterschrift der betroffenen Seite; Zählerstände, Schlüssel und Mängel bleiben. */
function ubRollenFuer(u,k){
  let ids=Array.isArray(u.kundeIds)?u.kundeIds:[];
  return UB_ROLLEN.filter(([r])=>wzdNameGleich(u[r],k)||(ids.includes(k.id)&&!String(u[r]||'').trim()));
}
function ubTreffer(k){ return (UB.liste||[]).map(u=>({u,rollen:ubRollenFuer(u,k),anwesend:wzdNameGleich(u.anwesend,k),id:(u.kundeIds||[]).includes(k.id)})).filter(x=>x.rollen.length||x.anwesend||x.id); }
function ubNameWeg(text,k){
  let t=wzdNamenTeile(text); if(!t.length) return text;
  if(!t.some(x=>wzdNameGleich(x,k))) return wzdNameGleich(text,k)?'(Kunde gelöscht)':text;   // „Muster, Erika“ als Ganzes
  return t.map(x=>wzdNameGleich(x,k)?'(Kunde gelöscht)':x).join(', ');
}
KD_AUSKUNFT_HOOKS.push(async id=>{
  let k=wzdKunde(id); if(!k) return [];
  await ubLaden();
  let l=ubTreffer(k);
  return ['','ÜBERGABEPROTOKOLLE'].concat(l.length?l.map(({u,rollen,anwesend})=>'- '+wzDatum(u.datum)+' '+(u.anschrift||'Objekt')+': '
    +(rollen.length?rollen.map(r=>r[1]).join(' und '):anwesend?'anwesend':'verknüpft')+(u.abgeschlossen?', abgeschlossen':', Entwurf')
    +(rollen.some(([r])=>u.unterschrift&&u.unterschrift[r])?'; Unterschrift gespeichert':'')):['- keine']);
});
KD_LOESCH_HOOKS.push(async id=>{
  let k=wzdKunde(id); if(!k) return;
  if(UB.aktiv){ clearTimeout(UB.timer); await ubSpeichernJetzt(); }   // offenen Stand sichern, dann frisch laden
  await ubLaden(); let treffer=ubTreffer(k);
  for(const {u,rollen} of treffer){
    rollen.forEach(([r])=>{ u[r]=ubNameWeg(u[r],k)||'(Kunde gelöscht)'; if(u.unterschrift) u.unterschrift[r]=''; });
    u.anwesend=ubNameWeg(u.anwesend,k);
    u.kundeIds=(u.kundeIds||[]).filter(x=>x!==id);
    u.geaendert=Date.now();
    try{ await iaPut('protokolle',JSON.parse(JSON.stringify(u))); }catch(e){}
  }
  if(UB.aktiv){ let t=treffer.find(x=>x.u.id===UB.aktiv.id); if(t) UB.aktiv=t.u; }
  UB.liste=null;
});
