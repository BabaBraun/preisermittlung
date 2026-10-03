/* ---------- Kachel „Fotostudio“ (D40) ----------
   Fotos für Exposé und Portale aufbereiten, ganz auf dem Gerät: drehen, begradigen, zuschneiden (frei oder im Seitenverhältnis),
   Helligkeit, Kontrast, Farbe und automatische Tonwertkorrektur, Bereiche schwärzen oder verpixeln (Personen, Kfz-Kennzeichen,
   Namensschilder, Unterlagen). Rechenteil in js/bild.js. Das Ergebnis wird als JPEG gespeichert oder geteilt; das Original
   bleibt unverändert, in eine Bewertung übernimmt man das Foto dort unter „Fotos“. Bilder werden nicht gespeichert. */
var FS={bild:null,name:'',drehung:0,winkel:0,zuschnitt:null,verh:'',regler:{hell:0,kontrast:0,saettigung:0,waerme:0},auto:false,flaechen:[],werkzeug:'',ziel:'3000',ziehen:null,raf:0};
const FS_VERH=[['','frei'],['1.3333','4 : 3'],['1.5','3 : 2'],['1.7778','16 : 9'],['1','1 : 1']];
function fsReset(alles){
  Object.assign(FS,{drehung:0,winkel:0,zuschnitt:null,verh:'',regler:{hell:0,kontrast:0,saettigung:0,waerme:0},auto:false,flaechen:[],werkzeug:''});
  if(alles) Object.assign(FS,{bild:null,name:''});
}
/* Bild laden (Datei oder data-URL); sehr große Fotos auf 3000 Pixel lange Seite verkleinern */
function fsLaden(src,name){
  let img=new Image();
  img.onload=()=>{ let m=Math.max(img.naturalWidth,img.naturalHeight), f=m>3000?3000/m:1, c=document.createElement('canvas');
    c.width=Math.round(img.naturalWidth*f); c.height=Math.round(img.naturalHeight*f); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    fsReset(false); FS.bild=c; FS.name=(name||'Foto').replace(/\.[a-z0-9]+$/i,''); if(WZ.aktiv==='foto') wzZeichnen(); };
  img.onerror=()=>alert('Das Bild lässt sich nicht öffnen.');
  img.src=src;
}
function fsDatei(files){
  let f=files&&files[0]; if(!f) return;
  if(!/^image\//.test(f.type||'')){ alert('Bitte ein Foto wählen (JPEG, PNG, HEIC wird je nach Gerät unterstützt).'); return; }
  let url=URL.createObjectURL(f); fsLaden(url,f.name); setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function fsAusBewertung(id){ let p=(typeof PHOTOS!=='undefined'?PHOTOS:[]).find(x=>x.id===id); if(p&&bildUrl(p.data)) fsLaden(p.data,p.caption||'Foto'); }
/* Größe nach 90°-Drehung */
function fsMasse(){ let b=FS.bild, q=FS.drehung%180!==0; return b?{w:q?b.height:b.width,h:q?b.width:b.height}:{w:0,h:0}; }
/* Ergebnis zeichnen: Zuschnitt (oder ganzes Bild), höchstens maxSeite Pixel, mit Licht/Farbe und Flächen */
function fsRendern(maxSeite,ohneZuschnitt){
  let b=FS.bild; if(!b) return null;
  let M=fsMasse(), z=ohneZuschnitt||!FS.zuschnitt?{x:0,y:0,w:1,h:1}:FS.zuschnitt;
  let cw=z.w*M.w, ch=z.h*M.h, sk=Math.min(1,maxSeite/Math.max(cw,ch));
  let c=document.createElement('canvas'); c.width=Math.max(1,Math.round(cw*sk)); c.height=Math.max(1,Math.round(ch*sk));
  let ctx=c.getContext('2d'), s=ImmoBild.fuellfaktor(M.w,M.h,FS.winkel);
  ctx.imageSmoothingQuality='high'; ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.save(); ctx.scale(sk,sk); ctx.translate(-z.x*M.w,-z.y*M.h); ctx.translate(M.w/2,M.h/2); ctx.rotate(FS.winkel*Math.PI/180); ctx.scale(s,s);
  ctx.rotate(FS.drehung*Math.PI/180); ctx.drawImage(b,-b.width/2,-b.height/2); ctx.restore();
  let r=FS.regler, px=null;
  if(FS.auto||r.hell||r.kontrast||r.saettigung||r.waerme||FS.flaechen.length){
    px=ctx.getImageData(0,0,c.width,c.height);
    if(FS.auto) ImmoBild.tonwert(px);
    ImmoBild.anpassen(px,r);
    FS.flaechen.forEach(f=>{ let q={x:(f.x-z.x)/z.w*c.width,y:(f.y-z.y)/z.h*c.height,w:f.w/z.w*c.width,h:f.h/z.h*c.height};
      if(f.art==='pixel') ImmoBild.verpixeln(px,q,Math.max(6,Math.round(Math.max(c.width,c.height)/60))); else ImmoBild.schwaerzen(px,q); });
    ctx.putImageData(px,0,0);
  }
  return c;
}
function fsVorschau(){
  cancelAnimationFrame(FS.raf); clearTimeout(FS.rafT);
  const malen=()=>{ let ziel=$('fs_vorschau'); if(!ziel||!FS.bild) return;
    let roh=FS.werkzeug==='zuschneiden', c=fsRendern(1100,roh); if(!c) return;
    ziel.width=c.width; ziel.height=c.height; ziel.getContext('2d').drawImage(c,0,0); fsRahmen(); };
  if(document.hidden) FS.rafT=setTimeout(malen,0); else FS.raf=requestAnimationFrame(malen);   // verborgene Seite: kein Animationsbild
}
/* Rahmen über der Vorschau: Zuschnitt und gesetzte Flächen */
function fsRahmen(){
  let box=$('fs_rahmen'); if(!box) return;
  let teile=[];
  if(FS.werkzeug==='zuschneiden'&&FS.zuschnitt){ let z=FS.zuschnitt; teile.push('<div class="fs-zuschnitt" style="left:'+z.x*100+'%;top:'+z.y*100+'%;width:'+z.w*100+'%;height:'+z.h*100+'%"></div>'); }
  if(FS.ziehen&&FS.ziehen.r){ let r=FS.ziehen.r; teile.push('<div class="fs-ziehen" style="left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.w*100+'%;height:'+r.h*100+'%"></div>'); }
  box.innerHTML=teile.join('');
}
/* Ziehen auf der Vorschau: Zuschnitt oder neue Fläche (Anteile 0 … 1 des sichtbaren Bildes) */
function fsZeiger(c){
  if(!c||c.dataset.init) return; c.dataset.init='1';
  const pt=e=>{ let b=c.getBoundingClientRect(); return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))}; };
  c.addEventListener('pointerdown',e=>{ if(!FS.werkzeug) return; FS.ziehen={a:pt(e),r:null}; try{ c.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); });
  c.addEventListener('pointermove',e=>{ if(!FS.ziehen) return; let a=FS.ziehen.a, p=pt(e), r={x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)};
    if(FS.werkzeug==='zuschneiden'&&+FS.verh>0){ let M=fsMasse(), v=+FS.verh; let hh=r.w*M.w/v/M.h; if(hh>1){ hh=1; } r.h=Math.min(hh,1); if(p.y<a.y) r.y=a.y-r.h; }
    FS.ziehen.r=r; fsRahmen(); e.preventDefault(); });
  const ende=()=>{ let z=FS.ziehen; FS.ziehen=null; if(!z||!z.r||z.r.w<0.01||z.r.h<0.01){ fsRahmen(); return; }
    if(FS.werkzeug==='zuschneiden'){ FS.zuschnitt=z.r; }
    else { let a=FS.zuschnitt||{x:0,y:0,w:1,h:1}; FS.flaechen.push({x:a.x+z.r.x*a.w,y:a.y+z.r.y*a.h,w:z.r.w*a.w,h:z.r.h*a.h,art:FS.werkzeug==='pixel'?'pixel':'schwarz'}); }
    wzZeichnen(); };
  ['pointerup','pointercancel'].forEach(t=>c.addEventListener(t,ende));
}
/* ---------- Bedienung ---------- */
function fsWerkzeug(w){ FS.werkzeug=FS.werkzeug===w?'':w; wzZeichnen(); }
function fsDrehen(d){ if(FS.flaechen.length&&!confirm('Beim Drehen werden die gesetzten Flächen entfernt. Fortfahren?')) return; FS.flaechen=[]; FS.zuschnitt=null; FS.drehung=(FS.drehung+d+360)%360; wzZeichnen(); }
function fsWinkel(v){ FS.winkel=Math.max(-10,Math.min(10,+v||0)); if(FS.flaechen.length) FS.flaechen=[]; let e=$('fs_winkel_wert'); if(e) e.textContent=wzZ(FS.winkel,1).replace('−','−')+'°'; fsVorschau(); }
function fsRegler(k,v){ FS.regler[k]=+v||0; let e=$('fs_w_'+k); if(e) e.textContent=(FS.regler[k]>0?'+':'')+FS.regler[k]; fsVorschau(); }
function fsVerh(v){ FS.verh=v; FS.zuschnitt=+v>0?ImmoBild.mittigZuschneiden(fsMasse().w,fsMasse().h,+v):null; wzZeichnen(); }
function fsFlaecheWeg(i){ FS.flaechen.splice(i,1); wzZeichnen(); }
function fsZuruecksetzen(){ if(!confirm('Alle Änderungen an diesem Foto verwerfen?')) return; fsReset(false); wzZeichnen(); }
function fsBlob(){
  return new Promise(res=>{ let c=fsRendern(+FS.ziel||3000,false); if(!c){ res(null); return; } c.toBlob(b=>res(b),'image/jpeg',0.88); });
}
async function fsSpeichern(teilen){
  if(!FS.bild) return; let b=await fsBlob(); if(!b){ alert('Das Foto konnte nicht erzeugt werden.'); return; }
  let name=wzDateiname((FS.name||'Foto')+' bearbeitet')+'.jpg';
  if(teilen) await iaTeilen(b,name,'Foto'); else iaHerunterladen(b,name);
}
function fsZeichnen(){
  let fotos=(typeof PHOTOS!=='undefined'?PHOTOS:[]).filter(p=>bildUrl(p.data));
  let quelle='<input type="file" id="fs_datei" accept="image/*" style="display:none" onchange="fsDatei(this.files)">'
    +'<div class="gr-zeile"><button type="button" class="primary" onclick="$(\'fs_datei\').value=\'\';$(\'fs_datei\').click()" data-ic="image">Foto wählen</button>'
    +(FS.bild?'<button type="button" class="secondary" onclick="fsReset(true);wzZeichnen()">Anderes Foto</button>':'')+'</div>'
    +(fotos.length&&!FS.bild?'<p class="hint" style="margin:10px 0 6px">Oder ein Foto der geöffneten Bewertung (das Original dort bleibt unverändert):</p><div class="fs-auswahl">'
      +fotos.map(p=>'<button type="button" onclick="fsAusBewertung(\''+idSicher(p.id)+'\')" aria-label="'+sEsc(p.caption||'Foto')+' bearbeiten"><img src="'+bildUrl(p.data)+'" alt=""></button>').join('')+'</div>':'');
  if(!FS.bild) return wzBox('Foto',quelle+wzHinweis('Das Foto bleibt auf dem Gerät. Gespeichert wird nur, was du am Ende als Datei sicherst.'))
    +wzBox('Datenschutz',wzHinweis('Vor der Veröffentlichung unkenntlich machen: Personen, Kfz-Kennzeichen, Namen an Klingel und Briefkasten, Hausnummern der Nachbarn, persönliche Unterlagen und Fotos an der Wand. Schwärzen ist sicherer als Verpixeln.'));
  const regler=(k,t)=>'<label class="fs-regler"><span>'+t+' <b id="fs_w_'+k+'">'+(FS.regler[k]>0?'+':'')+FS.regler[k]+'</b></span><input type="range" min="-100" max="100" step="1" value="'+FS.regler[k]+'" oninput="fsRegler(\''+k+'\',this.value)" aria-label="'+t+'"></label>';
  let M=fsMasse(), z=FS.zuschnitt, aw=Math.round((z?z.w:1)*M.w), ah=Math.round((z?z.h:1)*M.h);
  return '<div class="fs-raster"><div class="fs-buehne"><div class="fs-flaeche"><canvas id="fs_vorschau" class="'+(FS.werkzeug?'fs-aktiv':'')+'" aria-label="Vorschau des Fotos"></canvas><div id="fs_rahmen" class="fs-rahmen"></div></div>'
      +'<p class="hint">'+(FS.werkzeug==='zuschneiden'?'Rechteck aufziehen: so wird zugeschnitten. ':FS.werkzeug==='schwarz'?'Rechteck aufziehen: diese Fläche wird schwarz. ':FS.werkzeug==='pixel'?'Rechteck aufziehen: diese Fläche wird verpixelt. ':'')
      +aw+' × '+ah+' Pixel</p></div>'
    +'<div class="fs-steuer">'
    +wzBox('Foto',quelle)
    +wzBox('Drehen und Zuschnitt','<div class="gr-zeile"><button type="button" class="secondary" onclick="fsDrehen(-90)" aria-label="90 Grad nach links drehen">⟲ 90°</button><button type="button" class="secondary" onclick="fsDrehen(90)" aria-label="90 Grad nach rechts drehen">⟳ 90°</button></div>'
      +'<label class="fs-regler"><span>Begradigen <b id="fs_winkel_wert">'+wzZ(FS.winkel,1)+'°</b></span><input type="range" min="-10" max="10" step="0.5" value="'+FS.winkel+'" oninput="fsWinkel(this.value)" aria-label="Begradigen"></label>'
      +'<div class="grid"><div class="field"><label for="fs_verh">Seitenverhältnis</label><select id="fs_verh" onchange="fsVerh(this.value)">'+FS_VERH.map(([v,t])=>'<option value="'+v+'"'+(v===FS.verh?' selected':'')+'>'+t+'</option>').join('')+'</select></div></div>'
      +'<div class="gr-zeile"><button type="button" class="'+(FS.werkzeug==='zuschneiden'?'primary':'secondary')+'" onclick="fsWerkzeug(\'zuschneiden\')" aria-pressed="'+(FS.werkzeug==='zuschneiden')+'">Zuschneiden</button>'
      +(FS.zuschnitt?'<button type="button" class="secondary" onclick="FS.zuschnitt=null;FS.verh=\'\';wzZeichnen()">Zuschnitt aufheben</button>':'')+'</div>')
    +wzBox('Licht und Farbe','<label class="wz-check"><input type="checkbox"'+(FS.auto?' checked':'')+' onchange="FS.auto=this.checked;fsVorschau()"><span>Automatisch aufhellen (Tonwert)</span></label>'
      +regler('hell','Helligkeit')+regler('kontrast','Kontrast')+regler('saettigung','Sättigung')+regler('waerme','Wärme'))
    +wzBox('Unkenntlich machen','<div class="gr-zeile"><button type="button" class="'+(FS.werkzeug==='schwarz'?'primary':'secondary')+'" onclick="fsWerkzeug(\'schwarz\')" aria-pressed="'+(FS.werkzeug==='schwarz')+'">Schwärzen</button>'
      +'<button type="button" class="'+(FS.werkzeug==='pixel'?'primary':'secondary')+'" onclick="fsWerkzeug(\'pixel\')" aria-pressed="'+(FS.werkzeug==='pixel')+'">Verpixeln</button></div>'
      +(FS.flaechen.length?'<ul class="fs-liste">'+FS.flaechen.map((f,i)=>'<li>'+(f.art==='pixel'?'verpixelt':'geschwärzt')+' '+(i+1)+'<button type="button" class="weg" aria-label="Fläche '+(i+1)+' entfernen" onclick="fsFlaecheWeg('+i+')">✕</button></li>').join('')+'</ul>':'')
      +wzHinweis('Personen, Kennzeichen, Namen und Unterlagen. Schwärzen lässt sich nicht zurückrechnen, Verpixeln bei großen Blöcken kaum.'))
    +wzBox('Speichern','<div class="grid"><div class="field"><label for="fs_ziel">Größe</label><select id="fs_ziel" onchange="FS.ziel=this.value">'
      +[['3000','groß (bis 3000 Pixel)'],['2000','mittel (bis 2000 Pixel)'],['1600','für Portale (bis 1600 Pixel)']].map(([v,t])=>'<option value="'+v+'"'+(v===FS.ziel?' selected':'')+'>'+t+'</option>').join('')+'</select></div></div>'
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="fsSpeichern(false)" data-ic="download">Als JPEG speichern</button><button type="button" class="secondary" onclick="fsSpeichern(true)" data-ic="upload">Teilen</button>'
      +'<button type="button" class="secondary" onclick="fsZuruecksetzen()">Zurücksetzen</button></div>')
    +'</div></div>';
}
function fsRechnen(){ iconify($('wz_body')); let c=$('fs_vorschau'); if(c){ fsZeiger(c); fsVorschau(); } }
wzRegistrieren({id:'foto',titel:'Fotostudio',sub:'Fotos aufbereiten · Bereiche schwärzen oder verpixeln',icon:'image',ohneNeu:true,
  zeichnen:fsZeichnen,rechnen:fsRechnen,schliessen:()=>{ FS.ziehen=null; }});
