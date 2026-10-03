/* ---------- Kachel „PDF schwärzen“ (D53) ----------
   Unterlagen (Grundbuchauszug, Mietvertrag, Kontoauszug, Ausweis-Kopie des Eigentümers …) vor der Weitergabe an Interessenten,
   Portale oder Dritte unkenntlich machen — ganz auf dem Gerät. pdf.js (Mozilla, vendor/pdfjs, Apache-2.0) zeigt die Seiten; Flächen
   setzt man von Hand oder über die Suche (Text, IBAN, E-Mail, Telefon, Datum). Gespeichert wird eine neue PDF aus Bildern der
   Seiten (js/pdfbild.js): Der Text unter den Balken ist damit entfernt, die Datei enthält keine Textebene und keine Metadaten.
   Die Original-PDF wird nicht verändert und nicht gespeichert; beim Schließen der Kachel ist alles weg. */
var PS={lib:null,ladeNr:0,name:'',seiten:[],flaechen:{},weg:{},seite:0,laedt:'',ziehen:null,suche:'',meldung:null};
const PS_DPI=150, PS_MAX_SEITEN=40, PS_MAX_PIXEL=2400;
const PS_MUSTER=[['iban','IBAN'],['email','E-Mail-Adressen'],['telefon','Telefonnummern'],['datum','Daten (TT.MM.JJJJ)']];
/* jedes Zurücksetzen macht ein noch laufendes Laden ungültig (zweite PDF, „Andere PDF“, Schließen) */
function psReset(){ PS.ladeNr++; Object.assign(PS,{name:'',seiten:[],flaechen:{},weg:{},seite:0,laedt:'',ziehen:null,suche:'',meldung:null}); }
async function psPdfjs(){
  if(PS.lib) return PS.lib;
  const m=await import(new URL('vendor/pdfjs/pdf.min.mjs',location.href).href);
  m.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs',location.href).href;
  PS.lib=m; return m;
}
async function psDatei(files){
  let f=files&&files[0]; if(!f) return;
  if(!/pdf$/i.test(f.type||'')&&!/\.pdf$/i.test(f.name||'')){ alert('Bitte eine PDF-Datei wählen. Fotos von Unterlagen schwärzt das Fotostudio.'); return; }
  psReset(); const nr=PS.ladeNr, gilt=()=>nr===PS.ladeNr;
  PS.name=(f.name||'Dokument').replace(/\.pdf$/i,''); PS.laedt='PDF wird geöffnet …'; wzZeichnen();
  let doc=null, seiten=[];
  try{
    const lib=await psPdfjs(), daten=new Uint8Array(await f.arrayBuffer());
    if(!gilt()) return;
    doc=await lib.getDocument({data:daten,isEvalSupported:false,enableXfa:false,disableFontFace:false}).promise;
    if(!gilt()) return;
    if(doc.numPages>PS_MAX_SEITEN) alert('Die PDF hat '+doc.numPages+' Seiten — die App nimmt die ersten '+PS_MAX_SEITEN+'. Längere Dokumente vorher teilen.');
    const n=Math.min(doc.numPages,PS_MAX_SEITEN), AM=lib.AnnotationMode||{};
    for(let i=1;i<=n;i++){
      if(!gilt()) return;
      PS.laedt='Seite '+i+' von '+n+' …'; psStatus();
      const page=await doc.getPage(i), v1=page.getViewport({scale:1});
      let sk=PS_DPI/72; if(Math.max(v1.width,v1.height)*sk>PS_MAX_PIXEL) sk=PS_MAX_PIXEL/Math.max(v1.width,v1.height);
      const vp=page.getViewport({scale:sk}), c=document.createElement('canvas');
      c.width=Math.round(vp.width); c.height=Math.round(vp.height);
      const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
      // ausgefüllte Formularfelder ins Bild zeichnen (sonst zeigt pdf.js sie nur in einer eigenen Ebene)
      await page.render({canvasContext:ctx,viewport:vp,annotationMode:AM.ENABLE_STORAGE!=null?AM.ENABLE_STORAGE:3}).promise;
      let items=[];
      try{ const tc=await page.getTextContent();
        items=tc.items.filter(t=>t&&t.str).map(t=>{
          const m=lib.Util.transform(v1.transform,t.transform), s=Math.hypot(m[0],m[1])||1, h=Math.hypot(m[2],m[3])||Math.abs(t.height)||8;
          const geo={ox:m[4],oy:m[5],dx:m[0]/s,dy:m[1]/s,ux:m[2]/h,uy:m[3]/h,len:Math.abs(t.width)||h*t.str.length*0.5,h,W:v1.width,H:v1.height};
          return Object.assign({str:t.str,geo},ImmoPdfBild.huelle(geo,0,geo.len)); }); }catch(e){}
      try{ (await page.getAnnotations()).forEach(a=>{   // Werte von Formularfeldern und Kommentaren durchsuchbar machen
          let s=typeof a.fieldValue==='string'?a.fieldValue:Array.isArray(a.fieldValue)?a.fieldValue.join(' '):(a.contentsObj&&a.contentsObj.str)||a.contents||'';
          if(!s||!Array.isArray(a.rect)) return; let r=v1.convertToViewportRectangle(a.rect), x0=Math.min(r[0],r[2]), y0=Math.min(r[1],r[3]);
          items.push({str:String(s),x:x0/v1.width,y:y0/v1.height,w:Math.abs(r[2]-r[0])/v1.width,h:Math.abs(r[3]-r[1])/v1.height,feld:true}); }); }catch(e){}
      seiten.push({canvas:c,breitePt:v1.width,hoehePt:v1.height,items});
      page.cleanup();
    }
    if(!gilt()) return;
    PS.seiten=seiten;
  }catch(e){
    if(!gilt()) return;
    psReset(); wzZeichnen();
    alert(e&&e.name==='PasswordException'?'Die PDF ist mit einem Kennwort geschützt. Bitte ungeschützt speichern und erneut wählen.':'Die PDF lässt sich nicht öffnen'+(e&&e.message?' ('+e.message+')':'')+'.');
  }finally{ if(doc) try{ await doc.destroy(); }catch(e){} if(gilt()) PS.laedt=''; }
  if(gilt()&&WZ.aktiv==='schwaerzen') wzZeichnen();
}
function psStatus(){ let e=$('ps_status'); if(e) e.textContent=PS.laedt; }
function psFl(i){ return PS.flaechen[i]||(PS.flaechen[i]=[]); }
function psAnzahl(){ return Object.keys(PS.flaechen).reduce((s,k)=>s+PS.flaechen[k].length,0); }
/* Suche über alle Seiten → Flächen (doppelte nicht noch einmal) */
function psSuchen(was){
  if(!PS.seiten.length) return;
  let neu=0, gesamt=0, text=was||String(($('ps_suche')||{}).value||'').trim(); if(!was) PS.suche=text;
  if(!was&&text.length<2){ PS.meldung={stufe:'gelb',text:'Bitte mindestens zwei Zeichen eingeben.'}; wzZeichnen(); return; }
  PS.seiten.forEach((s,i)=>ImmoPdfBild.treffer(s.items,text).forEach(r=>{
    gesamt++; let l=psFl(i); if(l.some(q=>Math.abs(q.x-r.x)<0.002&&Math.abs(q.y-r.y)<0.002&&Math.abs(q.w-r.w)<0.002)) return;
    l.push({x:r.x,y:r.y,w:r.w,h:r.h,quelle:was?(PS_MUSTER.find(m=>m[0]===was)||['',was])[1]:'„'+text+'“'}); neu++; }));
  PS.meldung=!neu&&gesamt?{stufe:'gruen',text:'Alle '+gesamt+' Treffer sind schon geschwärzt.'}:neu?{stufe:'gruen',text:neu+' Stelle'+(neu===1?'':'n')+' geschwärzt ('+(was?(PS_MUSTER.find(m=>m[0]===was)||['',was])[1]:'„'+text+'“')+'). Bitte jede Seite ansehen.'}
    :{stufe:'gelb',text:'Nichts gefunden'+(was?'':' für „'+text+'“')+'. Bei gescannten Seiten (Bild statt Text) die Stellen von Hand schwärzen.'};
  wzZeichnen();
}
function psSeite(n){ PS.seite=Math.max(0,Math.min(PS.seiten.length-1,n)); wzZeichnen(); }
function psFlaecheWeg(i){ psFl(PS.seite).splice(i,1); wzZeichnen(); }
function psSeiteWeg(an){ if(an) PS.weg[PS.seite]=true; else delete PS.weg[PS.seite]; wzZeichnen(); }
function psZeichnen(){
  let quelle='<input type="file" id="ps_datei" accept="application/pdf,.pdf" style="display:none" onchange="psDatei(this.files)">'
    +'<div class="gr-zeile"><button type="button" class="primary" onclick="$(\'ps_datei\').value=\'\';$(\'ps_datei\').click()" data-ic="file"'+(PS.laedt?' disabled':'')+'>PDF wählen</button>'
    +(PS.seiten.length?'<button type="button" class="secondary" onclick="psReset();wzZeichnen()">Andere PDF</button>':'')+'</div>'
    +'<p class="hint" id="ps_status" aria-live="polite">'+sEsc(PS.laedt)+'</p>';
  if(!PS.seiten.length) return wzBox('PDF',quelle+wzHinweis('Die PDF bleibt auf dem Gerät und wird nicht gespeichert. Gespeichert wird nur die geschwärzte Fassung, die du am Ende als Datei sicherst.'))
    +wzBox('Wofür?',wzHinweis('Vor der Weitergabe von Unterlagen an Interessenten, Portale oder Dritte: Namen und Anschriften anderer Personen, Geburtsdaten, Kontonummern, Unterschriften, Mieterdaten und Ausweisdaten unkenntlich machen. Nur weitergeben, was der Empfänger braucht.'));
  let s=PS.seiten[PS.seite], l=psFl(PS.seite), n=PS.seiten.length, raus=Object.keys(PS.weg).length;
  return '<div class="fs-raster"><div class="fs-buehne"><div class="gr-zeile ps-blaettern"><button type="button" class="secondary" onclick="psSeite('+(PS.seite-1)+')"'+(PS.seite?'':' disabled')+' aria-label="Vorige Seite" data-ic="arrow-left"></button>'
      +'<span>Seite '+(PS.seite+1)+' von '+n+(PS.weg[PS.seite]?' · wird weggelassen':'')+'</span><button type="button" class="secondary" onclick="psSeite('+(PS.seite+1)+')"'+(PS.seite<n-1?'':' disabled')+' aria-label="Nächste Seite" data-ic="arrow-right"></button></div>'
      +'<div class="fs-flaeche"><canvas id="ps_vorschau" class="fs-aktiv'+(PS.weg[PS.seite]?' ps-weg':'')+'" aria-label="Seite '+(PS.seite+1)+' — Rechteck aufziehen zum Schwärzen"></canvas><div id="ps_rahmen" class="fs-rahmen"></div></div>'
      +'<p class="hint">Rechteck aufziehen: diese Fläche wird schwarz.</p></div>'
    +'<div class="fs-steuer">'
    +wzBox('PDF','<p class="wzd-klein"><b>'+sEsc(PS.name)+'</b> · '+n+' Seite'+(n===1?'':'n')+'</p>'+quelle)
    +wzBox('Suchen und schwärzen','<div class="grid"><div class="field"><label for="ps_suche">Text</label><input id="ps_suche" value="'+sEsc(PS.suche)+'" placeholder="z. B. Name oder Anschrift" onkeydown="if(event.key===\'Enter\')psSuchen()"></div></div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="psSuchen()" data-ic="search">Alle Treffer schwärzen</button></div>'
      +'<div class="gr-zeile ps-muster">'+PS_MUSTER.map(m=>'<button type="button" class="secondary" onclick="psSuchen(\''+m[0]+'\')">'+m[1]+'</button>').join('')+'</div>'
      +(PS.meldung?wzAmpel(PS.meldung.stufe,sEsc(PS.meldung.text)):'')
      +wzHinweis('Die Suche findet echten Text und ausgefüllte Formularfelder. Gescannte Seiten (Bild) bitte von Hand schwärzen.'))
    +wzBox('Diese Seite',(l.length?'<ul class="fs-liste">'+l.map((f,i)=>'<li>'+sEsc(f.quelle||'von Hand')+' '+(i+1)+'<button type="button" class="weg" aria-label="Fläche '+(i+1)+' entfernen" onclick="psFlaecheWeg('+i+')">✕</button></li>').join('')+'</ul>':'<p class="hint">Noch keine Fläche auf dieser Seite.</p>')
      +'<label class="wz-check"><input type="checkbox"'+(PS.weg[PS.seite]?' checked':'')+' onchange="psSeiteWeg(this.checked)"><span>Seite weglassen</span></label>')
    +wzBox('Speichern','<p class="wzd-klein">'+psAnzahl()+' Fläche'+(psAnzahl()===1?'':'n')+' geschwärzt'+(raus?', '+raus+' Seite'+(raus===1?'':'n')+' weggelassen':'')+'.</p>'
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="psSpeichern(false)" data-ic="download">Geschwärzte PDF speichern</button><button type="button" class="secondary" onclick="psSpeichern(true)" data-ic="upload">Teilen</button></div>'
      +wzHinweis('Die neue PDF besteht aus Bildern der Seiten: Der Text unter den Balken ist entfernt, die Datei ist nicht mehr durchsuchbar. Autor, Titel und andere Angaben der Original-Datei werden nicht übernommen.'))
    +'</div></div>';
}
function psVorschau(){
  let ziel=$('ps_vorschau'), s=PS.seiten[PS.seite]; if(!ziel||!s) return;
  let sk=Math.min(1,1100/Math.max(s.canvas.width,s.canvas.height)); ziel.width=Math.round(s.canvas.width*sk); ziel.height=Math.round(s.canvas.height*sk);
  let ctx=ziel.getContext('2d'); ctx.drawImage(s.canvas,0,0,ziel.width,ziel.height);
  ctx.fillStyle='#000'; psFl(PS.seite).forEach(f=>ctx.fillRect(f.x*ziel.width,f.y*ziel.height,f.w*ziel.width,f.h*ziel.height));
  psRahmen();
}
function psRahmen(){ let box=$('ps_rahmen'); if(!box) return; let r=PS.ziehen&&PS.ziehen.r;
  box.innerHTML=r?'<div class="fs-ziehen" style="left:'+r.x*100+'%;top:'+r.y*100+'%;width:'+r.w*100+'%;height:'+r.h*100+'%"></div>':''; }
function psZeiger(c){
  if(!c||c.dataset.init) return; c.dataset.init='1';
  const pt=e=>{ let b=c.getBoundingClientRect(); return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))}; };
  c.addEventListener('pointerdown',e=>{ PS.ziehen={a:pt(e),r:null}; try{ c.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); });
  c.addEventListener('pointermove',e=>{ if(!PS.ziehen) return; let a=PS.ziehen.a, p=pt(e); PS.ziehen.r={x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)}; psRahmen(); e.preventDefault(); });
  const ende=()=>{ let z=PS.ziehen; PS.ziehen=null; if(!z||!z.r||z.r.w<0.005||z.r.h<0.005){ psRahmen(); return; }
    psFl(PS.seite).push(Object.assign({quelle:'von Hand'},z.r)); wzZeichnen(); };
  ['pointerup','pointercancel'].forEach(t=>c.addEventListener(t,ende));
}
function psRechnen(){ iconify($('wz_body')); let c=$('ps_vorschau'); if(c){ psZeiger(c); psVorschau(); } }
/* Seiten mit Balken als JPEG → neue PDF */
function psJpeg(c){ return new Promise(res=>c.toBlob(b=>res(b),'image/jpeg',0.85)); }
async function psErzeugen(){
  let seiten=[];
  for(let i=0;i<PS.seiten.length;i++){
    if(PS.weg[i]) continue; let s=PS.seiten[i], c=document.createElement('canvas'); c.width=s.canvas.width; c.height=s.canvas.height;
    let ctx=c.getContext('2d'); ctx.drawImage(s.canvas,0,0); ctx.fillStyle='#000';
    psFl(i).forEach(f=>ctx.fillRect(Math.floor(f.x*c.width),Math.floor(f.y*c.height),Math.ceil(f.w*c.width)+1,Math.ceil(f.h*c.height)+1));
    let b=await psJpeg(c); if(!b) return null;
    seiten.push({jpeg:new Uint8Array(await b.arrayBuffer()),breitePx:c.width,hoehePx:c.height,breitePt:s.breitePt,hoehePt:s.hoehePt});
  }
  return seiten.length?new Blob([ImmoPdfBild.pdfAusJpegs(seiten)],{type:'application/pdf'}):null;
}
async function psSpeichern(teilen){
  if(!PS.seiten.length) return;
  if(!psAnzahl()&&!Object.keys(PS.weg).length&&!confirm('Es ist noch nichts geschwärzt. Trotzdem speichern?')) return;
  let b=await psErzeugen(); if(!b){ alert('Keine Seite zum Speichern (alle weggelassen?).'); return; }
  let name=wzDateiname(PS.name+' geschwärzt')+'.pdf';
  if(teilen) await iaTeilen(b,name,'PDF'); else iaHerunterladen(b,name);
}
wzRegistrieren({id:'schwaerzen',titel:'PDF schwärzen',sub:'Unterlagen vor der Weitergabe unkenntlich machen',icon:'file',ohneNeu:true,
  zeichnen:psZeichnen,rechnen:psRechnen,schliessen:()=>{ psReset(); }});
