/* ---------- Persistence ---------- */
/* ---------- Fotos ---------- */
let PHOTOS=[]; // {id, cat:'objekt'|'schaden', caption, data(JPEG-DataURL)}
const FOTO_LABEL={objekt:'Objektfoto',schaden:'Schadensfoto',karte:'Kartenausschnitt'};   // Alt-Text ohne Bildunterschrift
function addPhotos(files, cat){
  [...files].forEach(f=>{
    if(!f.type||!f.type.startsWith('image/'))return;
    let r=new FileReader();
    r.onload=()=>downscale(r.result,1400,0.75,dataUrl=>{
      PHOTOS.push({id:'p'+Date.now()+Math.random().toString(36).slice(2,6),cat,caption:'',data:dataUrl});
      fotosGeaendert();renderPhotos();autosave();
    });
    r.readAsDataURL(f);
  });
  let inp=$('file_'+cat); if(inp) inp.value='';
}
function downscale(src,maxDim,quality,cb,fmt){
  let img=new Image();
  img.onload=()=>{
    let w=img.width,h=img.height;
    if(Math.max(w,h)>maxDim){let s=maxDim/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
    let c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    try{cb(c.toDataURL(fmt||'image/jpeg',quality));}catch(e){cb(src);}
  };
  img.onerror=()=>cb(src);
  img.src=src;
}
function renderPhotos(){
  ['objekt','schaden','karte'].forEach(cat=>{
    let g=$('gal_'+cat); if(!g)return; g.innerHTML='';
    PHOTOS.filter(p=>p.cat===cat).forEach(p=>{
      let d=document.createElement('div'); d.className='photo'; d.dataset.foto=idSicher(p.id);
      d.innerHTML=`<button class="del no-print" aria-label="Foto löschen" onclick="delPhoto('${idSicher(p.id)}')">✕</button><img src="${bildUrl(p.data)}" alt="${sEsc(p.caption||FOTO_LABEL[p.cat]||'Foto')}"><input class="no-print" placeholder="Bildunterschrift…" value="${sEsc(p.caption||'')}" oninput="capPhoto('${idSicher(p.id)}',this.value)">`;
      g.appendChild(d);
    });
  });
  try{ exFotoWahlRender(); }catch(e){}
  try{ auFestRender(); }catch(e){}
}
function delPhoto(id){PHOTOS=PHOTOS.filter(p=>p.id!==id);fotosGeaendert();renderPhotos();autosave();}
function capPhoto(id,v){let p=PHOTOS.find(x=>x.id===id);if(p){p.caption=v;fotosGeaendert();autosave();}}

/* ---------- Unterschrift-Scan (einzelnes Bild, PNG) ---------- */
let SIGNATURE=null;
function addSignature(files){
  let f=files&&files[0]; if(!f||!f.type.startsWith('image/'))return;
  let r=new FileReader();
  r.onload=()=>downscale(r.result,600,1,dataUrl=>{SIGNATURE=dataUrl;renderSignature();autosave();},'image/png');
  r.readAsDataURL(f);
  let inp=$('file_sig'); if(inp) inp.value='';
}
function renderSignature(){
  let box=$('sig_preview'); if(!box)return;
  box.innerHTML = SIGNATURE
    ? `<img src="${bildUrl(SIGNATURE)}" alt="Unterschrift"> <button class="del no-print" aria-label="Unterschrift entfernen" style="position:static;display:inline-block;vertical-align:top;margin-left:8px" onclick="clearSignature()">✕ entfernen</button>`
    : '<span style="color:var(--muted);font-size:12px">Kein Unterschrift-Bild eingefügt.</span>';
}
function clearSignature(){SIGNATURE=null;renderSignature();autosave();}
