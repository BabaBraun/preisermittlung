/* ImmoApp — Bildbearbeitung ohne Seitenbezug (in Node testbar), D40, Kachel „Fotostudio“
   Alle Funktionen arbeiten auf Pixeldaten wie ImageData: {data: Uint8ClampedArray (RGBA), width, height}.
   - anpassen(px, {hell, kontrast, saettigung, waerme})  je −100 … +100, 0 = unverändert
       Helligkeit: + hell × 1,28 je Kanal; Kontrast: Faktor f = 259·(c + 255) / (255·(259 − c)) mit c = kontrast × 1,28 um die
       Mitte 128; Sättigung: Abstand zur Leuchtdichte (Rec. 601: 0,299 R + 0,587 G + 0,114 B) × (1 + s/100);
       Wärme: R + w × 0,3, B − w × 0,3.
   - tonwert(px, anteil)   automatische Tonwertkorrektur: hellster und dunkelster Anteil (Vorgabe 0,5 %) der Leuchtdichte
       werden auf Weiß und Schwarz gespreizt, gleich für alle Kanäle (keine Farbverschiebung).
   - verpixeln(px, r, block)   Rechteck r = {x, y, w, h} in Pixeln, Blöcke mit dem Mittelwert ihrer Farbe
   - schwaerzen(px, r)   Rechteck schwarz — unumkehrbar, sicherer als Verpixeln
   - fuellfaktor(w, h, winkel)   Vergrößerung, damit ein um winkel (Grad) gedrehtes Bild den Rahmen w × h ohne leere Ecken füllt */
(function(wurzel){
'use strict';
const k=v=>v<0?0:v>255?255:v;
function anpassen(px,o){
  o=o||{}; const d=px.data, hell=(+o.hell||0)*1.28, c=Math.max(-254,Math.min(254,(+o.kontrast||0)*1.28)), s=1+(+o.saettigung||0)/100, w=(+o.waerme||0)*0.3;
  if(!hell&&!c&&s===1&&!w) return px;
  const f=259*(c+255)/(255*(259-c));
  for(let i=0;i<d.length;i+=4){
    let r=d[i]+hell, g=d[i+1]+hell, b=d[i+2]+hell;
    r=f*(r-128)+128; g=f*(g-128)+128; b=f*(b-128)+128;
    if(s!==1){ const l=0.299*r+0.587*g+0.114*b; r=l+(r-l)*s; g=l+(g-l)*s; b=l+(b-l)*s; }
    d[i]=k(r+w); d[i+1]=k(g); d[i+2]=k(b-w);
  }
  return px;
}
function tonwert(px,anteil){
  const d=px.data, n=d.length/4; if(!n) return {schwarz:0,weiss:255};
  const hist=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4) hist[Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])]++;
  const grenze=Math.floor(n*(anteil==null?0.005:anteil));
  let lo=0, hi=255, sum=0;
  for(let v=0;v<256;v++){ sum+=hist[v]; if(sum>grenze){ lo=v; break; } }
  sum=0; for(let v=255;v>=0;v--){ sum+=hist[v]; if(sum>grenze){ hi=v; break; } }
  if(hi-lo<16) return {schwarz:lo,weiss:hi,unveraendert:true};   // fast einfarbig: nicht spreizen
  const f=255/(hi-lo);
  for(let i=0;i<d.length;i+=4){ d[i]=k((d[i]-lo)*f); d[i+1]=k((d[i+1]-lo)*f); d[i+2]=k((d[i+2]-lo)*f); }
  return {schwarz:lo,weiss:hi};
}
function rechteck(px,r){
  const x0=Math.max(0,Math.floor(r.x)), y0=Math.max(0,Math.floor(r.y)), x1=Math.min(px.width,Math.ceil(r.x+r.w)), y1=Math.min(px.height,Math.ceil(r.y+r.h));
  return x1>x0&&y1>y0?{x0,y0,x1,y1}:null;
}
function schwaerzen(px,r){
  const q=rechteck(px,r); if(!q) return px; const d=px.data, W=px.width;
  for(let y=q.y0;y<q.y1;y++) for(let x=q.x0;x<q.x1;x++){ const i=(y*W+x)*4; d[i]=0; d[i+1]=0; d[i+2]=0; d[i+3]=255; }
  return px;
}
function verpixeln(px,r,block){
  const q=rechteck(px,r); if(!q) return px; const d=px.data, W=px.width, b=Math.max(2,Math.round(block||Math.max(8,Math.min(q.x1-q.x0,q.y1-q.y0)/6)));
  for(let by=q.y0;by<q.y1;by+=b) for(let bx=q.x0;bx<q.x1;bx+=b){
    const ex=Math.min(bx+b,q.x1), ey=Math.min(by+b,q.y1); let sr=0,sg=0,sb=0,n=0;
    for(let y=by;y<ey;y++) for(let x=bx;x<ex;x++){ const i=(y*W+x)*4; sr+=d[i]; sg+=d[i+1]; sb+=d[i+2]; n++; }
    sr=Math.round(sr/n); sg=Math.round(sg/n); sb=Math.round(sb/n);
    for(let y=by;y<ey;y++) for(let x=bx;x<ex;x++){ const i=(y*W+x)*4; d[i]=sr; d[i+1]=sg; d[i+2]=sb; }
  }
  return px;
}
function fuellfaktor(w,h,winkel){
  const a=Math.abs(+winkel||0)*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  if(!(w>0&&h>0)) return 1;
  return Math.max(c+(h/w)*s,c+(w/h)*s);
}
/* Seitenverhältnis-Zuschnitt in der Bildmitte: liefert {x,y,w,h} in Anteilen (0 … 1) */
function mittigZuschneiden(w,h,verh){
  if(!(verh>0)||!(w>0&&h>0)) return {x:0,y:0,w:1,h:1};
  if(w/h>verh){ const nw=h*verh/w; return {x:(1-nw)/2,y:0,w:nw,h:1}; }
  const nh=w/verh/h; return {x:0,y:(1-nh)/2,w:1,h:nh};
}
const ImmoBild={anpassen,tonwert,schwaerzen,verpixeln,fuellfaktor,mittigZuschneiden};
wurzel.ImmoBild=ImmoBild;
if(typeof module==='object'&&module.exports) module.exports=ImmoBild;
})(typeof globalThis!=='undefined'?globalThis:this);
