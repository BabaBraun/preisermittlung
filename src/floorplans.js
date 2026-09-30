/* ---------- Grundrisse -------------------------------------------------------------
   Ein Grundriss kommt als Code (JSON) in die App: Claude liest den fotografierten Plan nach
   GR_ANLEITUNG und zeichnet ihn als Daten nach, die App zeichnet daraus den Plan, rechnet die
   Flächen und schreibt die Räume in die Raumliste. Die App liest selbst keine Bilder — sie hat
   keinen Server (DECISIONS.md, D6). Gespeichert wird der Code des Geschosses unverändert; erst
   beim Zeichnen wird er aufbereitet, so bleibt jede der vier Darstellungen aus denselben Daten
   erzeugbar. Koordinaten in cm, Ursprung links oben, y nach unten. */
var GRUNDRISSE=[];            // [{id, darst, d:{…Code eines Geschosses…}}]
var GR_TMP=null;              // beim Einfügen: gelesene, noch nicht angelegte Pläne
var GR_WAHL=null;             // beim Einfügen gewählte Darstellung
var GR_AKTIV=null;            // id des Plans, der gerade bearbeitet wird
var GR_ZURUECK=null;          // Ansicht, zu der „Zurück“ in der Anleitung führt
const GR_DARST=[
  ['aufteilung','Raumaufteilung','Nur Wände, Durchgänge und Raumnamen — ohne Maße und Flächen'],
  ['umrisse','Raumumrisse mit Maßen','Räume als Flächen mit Namen, m² und Innenmaßen'],
  ['architekt','Architektenplan','Wände, Türen, Fenster, Treppen, Flächen und Maßketten'],
  ['einrichtung','Mit Einrichtung','Architektenplan mit Bad- und Küchenobjekten']
];
const GR_OEFF_ARTEN=['tuer','doppeltuer','schiebetuer','durchgang','fenster','fenstertuer'];
const GR_SEITEN=['oben','unten','links','rechts'];
const GR_GESCHOSS_LANG={'KG':'Kellergeschoss','UG':'Untergeschoss','EG':'Erdgeschoss','1. OG':'1. Obergeschoss',
  '2. OG':'2. Obergeschoss','3. OG':'3. Obergeschoss','DG':'Dachgeschoss','Spitzboden':'Spitzboden'};
const GR_FARBE={wand:'#2A3649',linie:'#3A4658',text:'#16202E',fein:'#5F6B7D',aussen:'#EFF3F8',flaeche:'#F3F7FC'};

/* --- Geometrie --- */
function grZahl(v){ return v!==null&&v!==''&&v!==undefined&&isFinite(+v); }
function grRectPoly(r){ let x=+r[0],y=+r[1],w=+r[2],h=+r[3]; return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]; }
function grPunkte(p){ return Array.isArray(p)&&p.length>=3&&p.every(q=>Array.isArray(q)&&q.length>=2&&grZahl(q[0])&&grZahl(q[1])); }
function grFlaeche(p){ let s=0; for(let i=0;i<p.length;i++){ let a=p[i],b=p[(i+1)%p.length]; s+=a[0]*b[1]-b[0]*a[1]; } return Math.abs(s)/2; }
function grBox(polys){
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  polys.forEach(p=>p.forEach(q=>{ x1=Math.min(x1,q[0]); y1=Math.min(y1,q[1]); x2=Math.max(x2,q[0]); y2=Math.max(y2,q[1]); }));
  return {x1:x1,y1:y1,x2:x2,y2:y2,w:x2-x1,h:y2-y1};
}
function grInnen(p,x,y){
  let c=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    let a=p[i],b=p[j];
    if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])) c=!c;
  }
  return c;
}
function grSchwerpunkt(p){
  let a=0,cx=0,cy=0;
  for(let i=0;i<p.length;i++){ let s=p[i],t=p[(i+1)%p.length],f=s[0]*t[1]-t[0]*s[1]; a+=f; cx+=(s[0]+t[0])*f; cy+=(s[1]+t[1])*f; }
  if(Math.abs(a)<1e-9){ let b=grBox([p]); return [b.x1+b.w/2,b.y1+b.h/2]; }
  return [cx/(3*a),cy/(3*a)];
}
/* waagerechte ('h') bzw. senkrechte ('v') Kanten des Außenumrisses: Lage c, Bereich a…b */
function grKanten(N,art){
  let k=[];
  N.umriss.forEach(p=>{ for(let i=0;i<p.length;i++){ let a=p[i],b=p[(i+1)%p.length];
    if(art==='h'&&Math.abs(a[1]-b[1])<0.01) k.push({c:a[1],a:Math.min(a[0],b[0]),b:Math.max(a[0],b[0])});
    if(art==='v'&&Math.abs(a[0]-b[0])<0.01) k.push({c:a[0],a:Math.min(a[1],b[1]),b:Math.max(a[1],b[1])});
  }});
  return k;
}

/* --- Code aufbereiten: Räume, Umriss, Öffnungen (mit selbst ermittelter Wanddicke) --- */
function grNorm(d){
  let N={d:d,raeume:[],umriss:[],oeff:[],treppen:[],einr:[],linien:[],texte:[],warn:[],massstab:d.massstab!==false};
  (Array.isArray(d.raeume)?d.raeume:[]).forEach((r,i)=>{
    if(!r||typeof r!=='object') return;
    let poly=null;
    if(Array.isArray(r.r)&&r.r.length===4&&r.r.every(grZahl)) poly=grRectPoly(r.r);
    else if(grPunkte(r.poly)) poly=r.poly.map(q=>[+q[0],+q[1]]);
    let name=(''+(r.name||('Raum '+(i+1)))).trim();
    if(!poly){ N.warn.push('Raum „'+name+'“ hat keine Lage (r oder poly) und fehlt in der Zeichnung.'); return; }
    N.raeume.push({i:i,raw:r,name:name,poly:poly,box:grBox([poly]),rect:Array.isArray(r.r),aussen:!!r.aussen,
      qm:grFlaeche(poly)/10000,plan:grZahl(r.flaeche_plan)?+r.flaeche_plan:null});
  });
  let u=d.umriss;
  if(u&&Array.isArray(u.r)) N.umriss=[grRectPoly(u.r)];
  else if(Array.isArray(u)&&u.length){
    if(Array.isArray(u[0])&&typeof u[0][0]!=='object'){ if(grPunkte(u)) N.umriss=[u.map(q=>[+q[0],+q[1]])]; }
    else N.umriss=u.filter(grPunkte).map(p=>p.map(q=>[+q[0],+q[1]]));
  }
  let innenR=N.raeume.filter(r=>!r.aussen);
  if(!N.umriss.length&&innenR.length){
    let b=grBox(innenR.map(r=>r.poly));
    N.umriss=[grRectPoly([b.x1-24,b.y1-24,b.w+48,b.h+48])];
    N.warn.push('Kein Außenumriss angegeben — Außenwände mit 24 cm angenommen.');
  }
  (Array.isArray(d.oeffnungen)?d.oeffnungen:[]).forEach((o,i)=>{
    if(!o||typeof o!=='object') return;
    let z=grOeffnung(N,o);
    if(!z) N.warn.push('Öffnung '+(i+1)+' ('+(o.art||'?')+(o.raum?', '+o.raum:'')+') ließ sich keiner Wand zuordnen.');
    else { if(z.geschaetzt) N.warn.push('Öffnung '+(i+1)+' ('+z.art+(o.raum?', '+o.raum:'')+'): Wanddicke nicht ermittelbar, 24 cm angenommen.'); N.oeff.push(z); }
  });
  (Array.isArray(d.treppen)?d.treppen:[]).forEach(t=>{
    if(t&&Array.isArray(t.r)&&t.r.length===4&&t.r.every(grZahl))
      N.treppen.push({x:+t.r[0],y:+t.r[1],w:+t.r[2],h:+t.r[3],n:+t.stufen||0,lauf:GR_SEITEN.includes(t.lauf)?t.lauf:'oben',form:t.form||'gerade'});
  });
  (Array.isArray(d.einrichtung)?d.einrichtung:[]).forEach(e=>{
    if(e&&Array.isArray(e.r)&&e.r.length===4&&e.r.every(grZahl))
      N.einr.push({art:e.art||'sonstiges',x:+e.r[0],y:+e.r[1],w:+e.r[2],h:+e.r[3],wand:GR_SEITEN.includes(e.wand)?e.wand:'oben',text:e.text||''});
  });
  (Array.isArray(d.linien)?d.linien:[]).forEach(l=>{ if(l&&Array.isArray(l.p)&&l.p.length===4&&l.p.every(grZahl)) N.linien.push({p:l.p.map(Number),text:l.text||''}); });
  (Array.isArray(d.texte)?d.texte:[]).forEach(t=>{ if(t&&grZahl(t.x)&&grZahl(t.y)&&t.text) N.texte.push({x:+t.x,y:+t.y,text:''+t.text}); });
  if(Array.isArray(d.hinweise)) d.hinweise.forEach(h=>{ if(h) N.warn.push(''+h); });
  return N;
}
function grOeffnung(N,o){
  let art=GR_OEFF_ARTEN.includes(o.art)?o.art:'tuer', band=o.band==='ende'?'ende':'anfang';
  if(Array.isArray(o.r)&&o.r.length===4&&o.r.every(grZahl)){
    let x=+o.r[0],y=+o.r[1],w=+o.r[2],h=+o.r[3], orient=w>=h?'h':'v';
    let auf=GR_SEITEN.includes(o.auf)?o.auf:(orient==='h'?'unten':'rechts');
    return {art:art,x:x,y:y,w:w,h:h,orient:orient,band:band,auf:auf};
  }
  let R=N.raeume.find(r=>r.name.toLowerCase()===(''+(o.raum||'')).trim().toLowerCase());
  let s=o.seite, ab=+o.ab||0, b=+o.b||0;
  if(!R||!GR_SEITEN.includes(s)||!(b>0)) return null;
  const ueber=(a1,a2,b1,b2)=>Math.min(a2,b2)-Math.max(a1,b1)>0.5;
  let nachbarn=N.raeume.filter(r=>r!==R&&!r.aussen), bx=R.box, innen=o.auf!=='aussen', kand=[];
  if(s==='oben'||s==='unten'){
    let xa=bx.x1+ab, xb=xa+b, y0=s==='oben'?bx.y1:bx.y2;
    nachbarn.forEach(r=>{ if(!ueber(r.box.x1,r.box.x2,xa,xb)) return;
      if(s==='oben'&&r.box.y2<=y0+0.5) kand.push(r.box.y2); if(s==='unten'&&r.box.y1>=y0-0.5) kand.push(r.box.y1); });
    grKanten(N,'h').forEach(k=>{ if(!ueber(k.a,k.b,xa,xb)) return;
      if(s==='oben'&&k.c<=y0+0.5) kand.push(k.c); if(s==='unten'&&k.c>=y0-0.5) kand.push(k.c); });
    let yN=kand.length?(s==='oben'?Math.max(...kand):Math.min(...kand)):null, dicke=yN===null?0:Math.abs(y0-yN), gesch=false;
    if(!(dicke>0.5&&dicke<=100)){ dicke=24; gesch=true; }
    return {art:art,x:xa,y:s==='oben'?y0-dicke:y0,w:b,h:dicke,orient:'h',band:band,
      auf:s==='oben'?(innen?'unten':'oben'):(innen?'oben':'unten'),geschaetzt:gesch};
  }
  let ya=bx.y1+ab, yb=ya+b, x0=s==='links'?bx.x1:bx.x2;
  nachbarn.forEach(r=>{ if(!ueber(r.box.y1,r.box.y2,ya,yb)) return;
    if(s==='links'&&r.box.x2<=x0+0.5) kand.push(r.box.x2); if(s==='rechts'&&r.box.x1>=x0-0.5) kand.push(r.box.x1); });
  grKanten(N,'v').forEach(k=>{ if(!ueber(k.a,k.b,ya,yb)) return;
    if(s==='links'&&k.c<=x0+0.5) kand.push(k.c); if(s==='rechts'&&k.c>=x0-0.5) kand.push(k.c); });
  let xN=kand.length?(s==='links'?Math.max(...kand):Math.min(...kand)):null, dicke=xN===null?0:Math.abs(x0-xN), gesch=false;
  if(!(dicke>0.5&&dicke<=100)){ dicke=24; gesch=true; }
  return {art:art,x:s==='links'?x0-dicke:x0,y:ya,w:dicke,h:b,orient:'v',band:band,
    auf:s==='links'?(innen?'rechts':'links'):(innen?'links':'rechts'),geschaetzt:gesch};
}

/* --- Flächen und Anrechnung, wie sie in die Raumliste gehen --- */
function grAnrechnung(raw,name){
  if(raw&&RL_FAKTOREN.some(f=>f[0]===raw.anrechnung)) return {key:raw.anrechnung,fest:true};
  return {key:rlVorschlagKey(name),fest:false};
}
function grRaumQm(N,R){ return R.plan!=null?R.plan:(N.massstab?R.qm:null); }
function grSumme(N){
  let wfl=0, n=0, alleLautPlan=true;
  N.raeume.forEach(R=>{
    if(R.raw.liste===false) return;
    if(Array.isArray(R.raw.teile)&&R.raw.teile.length){
      R.raw.teile.forEach(t=>{ n++; if(grZahl(t.flaeche_plan)) wfl+=+t.flaeche_plan*rlFaktor(grAnrechnung(t,R.name+' '+(t.name||'')).key); else alleLautPlan=false; });
      return;
    }
    n++; let q=grRaumQm(N,R); if(R.plan==null) alleLautPlan=false;
    if(q!=null) wfl+=q*rlFaktor(grAnrechnung(R.raw,R.name).key);
  });
  return {wfl:wfl,n:n,lautPlan:alleLautPlan};
}
function grTitel(N){
  let d=N.d, g=grGeschossRL(d.geschoss);
  return (''+(d.titel||GR_GESCHOSS_LANG[g]||d.geschoss||'Grundriss')).trim();
}
function grGeschossRL(g){
  let s=(''+(g||'')).toLowerCase().replace(/\s+/g,'').replace(/\./g,'');
  if(!s) return '';
  if(/^(kg|keller|kellergeschoss)$/.test(s)) return 'KG';
  if(/^(ug|untergeschoss|souterrain)$/.test(s)) return 'UG';
  if(/^(eg|erdgeschoss|hochparterre)$/.test(s)) return 'EG';
  let m=s.match(/^([123])(og|obergeschoss)$/); if(m) return m[1]+'. OG';
  if(/^(og|obergeschoss)$/.test(s)) return '1. OG';
  if(/^(dg|dachgeschoss)$/.test(s)) return 'DG';
  if(/^(sb|spitzboden)$/.test(s)) return 'Spitzboden';
  return '';
}

/* --- Zeichnen --- */
function grF(v){ return (Math.round(v*10)/10).toString(); }
function grE(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* Maßzahl wie in Bauzeichnungen: unter 1 m in cm, sonst in m; halbe cm als hochgestellte 5 */
function grMass(cm){
  let v=Math.round(cm*2)/2, halb=Math.abs(v%1)>0.01, haupt;
  if(v<100) haupt=''+Math.floor(v);
  else haupt=(Math.floor(v)/100).toFixed(2).replace('.',',');
  return {haupt:haupt,halb:halb,zeichen:haupt.length+(halb?0.6:0)};
}
function grMassSvg(cm){ let m=grMass(cm); return m.haupt+(m.halb?'<tspan dy="-0.38em" font-size="68%">5</tspan>':''); }
function grLinie(x1,y1,x2,y2,sw,farbe,extra){ return '<line x1="'+grF(x1)+'" y1="'+grF(y1)+'" x2="'+grF(x2)+'" y2="'+grF(y2)+'" stroke="'+(farbe||GR_FARBE.linie)+'" stroke-width="'+grF(sw)+'"'+(extra||'')+'/>'; }
function grPfad(p){ return 'M'+p.map(q=>grF(q[0])+' '+grF(q[1])).join('L')+'Z'; }
function grRect(x,y,w,h,attr){ return '<rect x="'+grF(x)+'" y="'+grF(y)+'" width="'+grF(w)+'" height="'+grF(h)+'" '+attr+'/>'; }

function grSVG(N,darst,opt){
  opt=opt||{};
  let alle=N.umriss.concat(N.raeume.map(r=>r.poly)).concat(N.treppen.map(t=>grRectPoly([t.x,t.y,t.w,t.h])));
  if(!alle.length) return '';
  let B=grBox(alle), U=N.umriss.length?grBox(N.umriss):B, gross=Math.max(B.w,B.h,100);
  let fs=Math.min(Math.max(gross/48,12),45);
  let mitKetten=(darst==='architekt'||darst==='einrichtung')&&N.massstab&&N.umriss.length&&!opt.klein;
  let rand=mitKetten?fs*5.6:fs*1.2, fuss=opt.klein?0:fs*3.2;
  let vx=B.x1-rand, vy=B.y1-rand, vw=B.w+2*rand, vh=B.h+2*rand+fuss;
  let u=vw/1000, s=[], C=GR_FARBE;
  s.push(grRect(vx,vy,vw,vh,'fill="#FFFFFF"'));
  let wand=darst!=='umrisse';
  // Balkone, Terrassen
  N.raeume.filter(r=>r.aussen).forEach(r=>s.push('<path d="'+grPfad(r.poly)+'" fill="'+C.aussen+'" stroke="'+C.fein+'" stroke-width="'+grF(u)+'" stroke-dasharray="'+grF(u*5)+' '+grF(u*3)+'"/>'));
  if(wand){
    N.umriss.forEach(p=>s.push('<path d="'+grPfad(p)+'" fill="'+C.wand+'"/>'));
    N.raeume.filter(r=>!r.aussen).forEach(r=>s.push('<path d="'+grPfad(r.poly)+'" fill="#FFFFFF"/>'));
  } else {
    N.umriss.forEach(p=>s.push('<path d="'+grPfad(p)+'" fill="none" stroke="#98A4B4" stroke-width="'+grF(u)+'"/>'));
    N.raeume.filter(r=>!r.aussen).forEach(r=>s.push('<path d="'+grPfad(r.poly)+'" fill="'+C.flaeche+'" stroke="'+C.linie+'" stroke-width="'+grF(u*1.5)+'"/>'));
  }
  if(wand) N.oeff.forEach(o=>s.push(grOeffSvg(o,darst,u)));
  if(darst!=='umrisse'||N.treppen.length) N.treppen.forEach(t=>s.push(grTreppeSvg(t,u,fs)));
  if(darst==='einrichtung') N.einr.forEach(e=>s.push(grEinrSvg(e,u,fs)));
  if(darst!=='aufteilung') N.linien.forEach(l=>{
    s.push(grLinie(l.p[0],l.p[1],l.p[2],l.p[3],u,C.fein,' stroke-dasharray="'+grF(u*6)+' '+grF(u*4)+'"'));
    if(l.text) s.push('<text x="'+grF((l.p[0]+l.p[2])/2)+'" y="'+grF((l.p[1]+l.p[3])/2-fs*0.25)+'" font-size="'+grF(fs*0.6)+'" fill="'+C.fein+'" text-anchor="middle">'+grE(l.text)+'</text>');
  });
  N.texte.forEach(t=>s.push('<text x="'+grF(t.x)+'" y="'+grF(t.y)+'" font-size="'+grF(fs*0.7)+'" fill="'+C.fein+'" text-anchor="middle" font-style="italic">'+grE(t.text)+'</text>'));
  N.raeume.forEach(R=>s.push(grRaumText(N,R,darst,fs)));
  if(mitKetten) s.push(grKetten(N,B,U,fs,u));
  if(!opt.klein){
    let yF=vy+vh-fs*1.05;
    s.push('<text x="'+grF(vx+fs*0.7)+'" y="'+grF(yF)+'" font-size="'+grF(fs*0.95)+'" font-weight="600" fill="'+C.text+'">'+grE(grTitel(N))+'</text>');
    let xr=vx+vw-fs*0.7;
    if(!N.massstab&&darst!=='aufteilung'){ s.push('<text x="'+grF(xr)+'" y="'+grF(yF)+'" font-size="'+grF(fs*0.7)+'" fill="'+C.fein+'" text-anchor="end">nicht maßstäblich</text>'); xr-=fs*8; }
    else if(N.massstab&&darst!=='aufteilung'){ s.push(grMassstab(xr,yF,gross,fs,u)); xr-=grMassstabLaenge(gross)+fs*1.2; }
    if(grZahl(N.d.nord)) s.push(grNord(xr-fs*0.8,yF-fs*0.75,+N.d.nord,fs,u));
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" class="gr-svg" viewBox="'+grF(vx)+' '+grF(vy)+' '+grF(vw)+' '+grF(vh)+'"'
    +' font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif" role="img" aria-label="Grundriss '+grE(grTitel(N))+'">'+s.join('')+'</svg>';
}
function grOeffSvg(o,darst,u){
  let tuerArt=['tuer','doppeltuer','schiebetuer','durchgang'].includes(o.art), s='', e=u*1.2;
  if(darst==='aufteilung'&&!tuerArt) return '';
  s+= o.orient==='h' ? grRect(o.x,o.y-e,o.w,o.h+2*e,'fill="#FFFFFF"') : grRect(o.x-e,o.y,o.w+2*e,o.h,'fill="#FFFFFF"');
  if(darst==='aufteilung') return s;
  let C=GR_FARBE;
  if(o.art==='fenster'||o.art==='fenstertuer'){
    s+=grRect(o.x,o.y,o.w,o.h,'fill="none" stroke="'+C.linie+'" stroke-width="'+grF(u)+'"');
    s+= o.orient==='h' ? grLinie(o.x,o.y+o.h/2,o.x+o.w,o.y+o.h/2,u*0.9) : grLinie(o.x+o.w/2,o.y,o.x+o.w/2,o.y+o.h,u*0.9);
  }
  let a=o.orient==='h'?o.x:o.y, b=a+(o.orient==='h'?o.w:o.h);
  if(o.art==='tuer'||o.art==='fenstertuer') s+=grFluegel(o,a,b,o.band,u);
  if(o.art==='doppeltuer'){ let m=(a+b)/2; s+=grFluegel(o,a,m,'anfang',u)+grFluegel(o,m,b,'ende',u); }
  if(o.art==='schiebetuer') s+= o.orient==='h' ? grLinie(o.x,o.y+o.h/2,o.x+o.w,o.y+o.h/2,u*2.2) : grLinie(o.x+o.w/2,o.y,o.x+o.w/2,o.y+o.h,u*2.2);
  return s;
}
/* Türflügel mit Aufschlagbogen, a…b ist die Öffnung entlang der Wand */
function grFluegel(o,a,b,band,u){
  let hor=o.orient==='h';
  let flaeche=hor?(o.auf==='unten'?o.y+o.h:o.y):(o.auf==='rechts'?o.x+o.w:o.x);
  let r=(o.auf==='unten'||o.auf==='rechts')?1:-1, br=b-a;
  let hPos=band==='ende'?b:a, frei=band==='ende'?a:b;
  let H=hor?[hPos,flaeche]:[flaeche,hPos], F=hor?[hPos,flaeche+r*br]:[flaeche+r*br,hPos], E=hor?[frei,flaeche]:[flaeche,frei];
  let a1=Math.atan2(F[1]-H[1],F[0]-H[0]), a2=Math.atan2(E[1]-H[1],E[0]-H[0]), d=a2-a1;
  while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
  let pts=[]; for(let k=0;k<=18;k++){ let w=a1+d*k/18; pts.push(grF(H[0]+br*Math.cos(w))+' '+grF(H[1]+br*Math.sin(w))); }
  return grLinie(H[0],H[1],F[0],F[1],u*1.7)+'<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+GR_FARBE.fein+'" stroke-width="'+grF(u*0.8)+'"/>';
}
function grTreppeSvg(t,u,fs){
  let C=GR_FARBE, s=grRect(t.x,t.y,t.w,t.h,'fill="#FFFFFF" stroke="'+C.linie+'" stroke-width="'+grF(u)+'"');
  let laengs=(t.lauf==='oben'||t.lauf==='unten'), L=laengs?t.h:t.w, n=t.n>1?t.n:Math.max(2,Math.round(L/27));
  if(t.form!=='gewendelt') for(let k=1;k<n;k++){ let p=(laengs?t.y:t.x)+L*k/n; s+= laengs?grLinie(t.x,p,t.x+t.w,p,u*0.8):grLinie(p,t.y,p,t.y+t.h,u*0.8); }
  else s+=grLinie(t.x,t.y,t.x+t.w,t.y+t.h,u*0.8,C.fein);
  let st=L/n, cx=t.x+t.w/2, cy=t.y+t.h/2, A, Z;
  if(t.lauf==='oben'){ A=[cx,t.y+t.h-st*0.5]; Z=[cx,t.y+st*0.4]; }
  else if(t.lauf==='unten'){ A=[cx,t.y+st*0.5]; Z=[cx,t.y+t.h-st*0.4]; }
  else if(t.lauf==='links'){ A=[t.x+t.w-st*0.5,cy]; Z=[t.x+st*0.4,cy]; }
  else { A=[t.x+st*0.5,cy]; Z=[t.x+t.w-st*0.4,cy]; }
  let p=Math.min(fs*0.45,Math.min(t.w,t.h)*0.3), ang=Math.atan2(Z[1]-A[1],Z[0]-A[0]);
  let k1=[Z[0]-p*Math.cos(ang-0.45),Z[1]-p*Math.sin(ang-0.45)], k2=[Z[0]-p*Math.cos(ang+0.45),Z[1]-p*Math.sin(ang+0.45)];
  s+='<circle cx="'+grF(A[0])+'" cy="'+grF(A[1])+'" r="'+grF(p*0.28)+'" fill="'+C.linie+'"/>'+grLinie(A[0],A[1],Z[0],Z[1],u*1.1)
    +'<path d="M'+grF(k1[0])+' '+grF(k1[1])+'L'+grF(Z[0])+' '+grF(Z[1])+'L'+grF(k2[0])+' '+grF(k2[1])+'" fill="none" stroke="'+C.linie+'" stroke-width="'+grF(u*1.1)+'"/>';
  return s;
}
function grEinrSvg(e,u,fs){
  let C=GR_FARBE, st='fill="#FFFFFF" stroke="'+C.fein+'" stroke-width="'+grF(u)+'"', dn='fill="none" stroke="'+C.fein+'" stroke-width="'+grF(u*0.8)+'"';
  let x=e.x,y=e.y,w=e.w,h=e.h, hor=(e.wand==='oben'||e.wand==='unten');
  // lokale Lage: a entlang der Wand (0…1), t von der Wand weg (0…1)
  const P=(a,t)=>{ if(e.wand==='oben') return [x+a*w,y+t*h]; if(e.wand==='unten') return [x+a*w,y+h-t*h]; if(e.wand==='links') return [x+t*w,y+a*h]; return [x+w-t*w,y+a*h]; };
  const laenge=hor?w:h, tiefe=hor?h:w;
  const ell=(a,t,ra,rt,attr)=>{ let c=P(a,t); return '<ellipse cx="'+grF(c[0])+'" cy="'+grF(c[1])+'" rx="'+grF(hor?ra*laenge:rt*tiefe)+'" ry="'+grF(hor?rt*tiefe:ra*laenge)+'" '+attr+'/>'; };
  const rr=(ein,rund)=>grRect(x+ein,y+ein,Math.max(w-2*ein,1),Math.max(h-2*ein,1),dn+' rx="'+grF(rund)+'"');
  let s=grRect(x,y,w,h,st), m=Math.min(w,h);
  switch(e.art){
    case 'wc': { let a=P(0,0), b=P(1,0.26); s=grRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),st)+ell(0.5,0.62,0.36,0.36,st); break; }
    case 'waschtisch': s+=ell(0.5,0.52,0.32,0.3,dn); break;
    case 'dusche': s+=grLinie(x,y,x+w,y+h,u*0.8,C.fein)+grLinie(x+w,y,x,y+h,u*0.8,C.fein); break;
    case 'wanne': s+=rr(m*0.1,m*0.25); break;
    case 'spuele': s+=rr(m*0.14,m*0.1); break;
    case 'herd': [[0.28,0.3],[0.72,0.3],[0.28,0.7],[0.72,0.7]].forEach(q=>{ let c=P(q[0],q[1]); s+='<circle cx="'+grF(c[0])+'" cy="'+grF(c[1])+'" r="'+grF(m*0.15)+'" '+dn+'/>'; }); break;
    case 'waschmaschine': s+='<circle cx="'+grF(x+w/2)+'" cy="'+grF(y+h/2)+'" r="'+grF(m*0.32)+'" '+dn+'/>'; break;
    case 'kamin': s=grRect(x,y,w,h,'fill="#E4E8EE" stroke="'+C.fein+'" stroke-width="'+grF(u)+'"')+grLinie(x,y,x+w,y+h,u*0.8,C.fein)+grLinie(x+w,y,x,y+h,u*0.8,C.fein); break;
    case 'kuehlschrank': s+='<text x="'+grF(x+w/2)+'" y="'+grF(y+h/2+fs*0.18)+'" font-size="'+grF(Math.min(fs*0.5,m*0.4))+'" fill="'+C.fein+'" text-anchor="middle">KS</text>'; break;
    case 'kueche': break;
    default: if(e.text) s+='<text x="'+grF(x+w/2)+'" y="'+grF(y+h/2+fs*0.18)+'" font-size="'+grF(Math.min(fs*0.5,m*0.4))+'" fill="'+C.fein+'" text-anchor="middle">'+grE(e.text)+'</text>';
  }
  return s;
}
/* Raumbeschriftung: Name, Fläche, bei den Umrissen auch die Innenmaße; passt sich dem Raum an */
function grRaumText(N,R,darst,fs){
  let z=[{t:grE(R.name),n:R.name.length,k:1,fett:true}];
  if(darst!=='aufteilung'){ let q=grRaumQm(N,R); if(q!=null){ let t=num2(q)+' m²'; z.push({t:t,n:t.length,k:0.84}); } }
  if(darst==='umrisse'&&R.rect&&N.massstab){ let a=grMass(R.box.w), b=grMass(R.box.h); z.push({t:grMassSvg(R.box.w)+' × '+grMassSvg(R.box.h),n:a.zeichen+b.zeichen+3,k:0.72}); }
  // Liegt eine Treppe im Raum, die Beschriftung in den größten freien Streifen daneben setzen
  let feld={x1:R.box.x1,y1:R.box.y1,x2:R.box.x2,y2:R.box.y2};
  if(R.rect) N.treppen.forEach(t=>{
    if(t.x>=feld.x2||t.x+t.w<=feld.x1||t.y>=feld.y2||t.y+t.h<=feld.y1) return;
    let kand=[{x1:feld.x1,y1:feld.y1,x2:t.x,y2:feld.y2},{x1:t.x+t.w,y1:feld.y1,x2:feld.x2,y2:feld.y2},
              {x1:feld.x1,y1:feld.y1,x2:feld.x2,y2:t.y},{x1:feld.x1,y1:t.y+t.h,x2:feld.x2,y2:feld.y2}]
      .filter(k=>k.x2-k.x1>0&&k.y2-k.y1>0).sort((p,q)=>(q.x2-q.x1)*(q.y2-q.y1)-(p.x2-p.x1)*(p.y2-p.y1));
    if(kand.length&&(kand[0].x2-kand[0].x1)*(kand[0].y2-kand[0].y1)>0.2*R.box.w*R.box.h) feld=kand[0];
  });
  let fw=feld.x2-feld.x1, fh=feld.y2-feld.y1;
  let breit=fw*(R.rect?0.9:0.75), hoch=fh*(R.rect?0.86:0.7);
  const passt=(zl,b,h)=>Math.min(fs,b/Math.max(...zl.map(q=>q.n*0.56*q.k)),h/zl.reduce((s,q)=>s+q.k*1.22,0));
  let f=passt(z,breit,hoch), dreh=false;
  if(f<fs*0.6&&fh>fw*1.4){ let f2=passt(z,hoch,breit); if(f2>f){ f=f2; dreh=true; } }
  while(f<fs*0.42&&z.length>1){ z.pop(); f=dreh?passt(z,hoch,breit):passt(z,breit,hoch); }
  f=Math.max(f,fs*0.38);
  let c=R.rect?[feld.x1+fw/2,feld.y1+fh/2]:grSchwerpunkt(R.poly);
  if(!R.rect&&!grInnen(R.poly,c[0],c[1])) c=[R.box.x1+R.box.w/2,R.box.y1+R.box.h/2];
  let gesamt=z.reduce((s,q)=>s+q.k*f*1.22,0), y=c[1]-gesamt/2, t='';
  z.forEach(q=>{ y+=q.k*f*0.96; t+='<text x="'+grF(c[0])+'" y="'+grF(y)+'" font-size="'+grF(q.k*f)+'" text-anchor="middle" fill="'+GR_FARBE.text+'"'+(q.fett?' font-weight="600"':'')+'>'+q.t+'</text>'; y+=q.k*f*0.26; });
  return dreh?'<g transform="rotate(-90 '+grF(c[0])+' '+grF(c[1])+')">'+t+'</g>':t;
}
/* Maßketten an allen vier Seiten: innen die Kette der Räume und Wände, außen die Gesamtmaße */
function grKettenWerte(N,seite){
  let hor=(seite==='oben'||seite==='unten'), U=grBox(N.umriss), pts=[hor?U.x1:U.y1,hor?U.x2:U.y2], det=[];
  const innen=(x,y)=>N.umriss.some(p=>grInnen(p,x,y));
  N.umriss.forEach(p=>{ for(let i=0;i<p.length;i++){ let a=p[i],b=p[(i+1)%p.length];
    if(hor&&Math.abs(a[1]-b[1])<0.01){ let mx=(a[0]+b[0])/2, d=seite==='oben'?1:-1; if(innen(mx,a[1]+d)&&!innen(mx,a[1]-d)) pts.push(a[0],b[0]); }
    if(!hor&&Math.abs(a[0]-b[0])<0.01){ let my=(a[1]+b[1])/2, d=seite==='links'?1:-1; if(innen(a[0]+d,my)&&!innen(a[0]-d,my)) pts.push(a[1],b[1]); }
  }});
  let kanten=grKanten(N,hor?'h':'v'), innenR=N.raeume.filter(r=>!r.aussen);
  innenR.forEach(r=>{
    let b=r.box, m=hor?b.x1+b.w/2:b.y1+b.h/2, k0=seite==='oben'?b.y1:seite==='unten'?b.y2:seite==='links'?b.x1:b.x2;
    let vorne=(seite==='oben'||seite==='links');
    let ks=kanten.filter(k=>k.a<=m&&k.b>=m&&(vorne?k.c<=k0+0.5:k.c>=k0-0.5)).map(k=>k.c);
    if(!ks.length) return;
    let kw=vorne?Math.max(...ks):Math.min(...ks);
    if(Math.abs(k0-kw)>80) return;
    let dazwischen=innenR.some(o=>{ if(o===r) return false; let ob=o.box;
      if(hor){ if(!(ob.x1<m&&ob.x2>m)) return false; return vorne?(ob.y2<=k0+0.5&&ob.y2>kw):(ob.y1>=k0-0.5&&ob.y1<kw); }
      if(!(ob.y1<m&&ob.y2>m)) return false; return vorne?(ob.x2<=k0+0.5&&ob.x2>kw):(ob.x1>=k0-0.5&&ob.x1<kw); });
    if(!dazwischen) det.push(hor?b.x1:b.y1,hor?b.x2:b.y2);
  });
  const ordne=a=>{ a=a.slice().sort((p,q)=>p-q); let o=[]; a.forEach(v=>{ if(!o.length||v-o[o.length-1]>0.4) o.push(v); }); return o; };
  let aussen=ordne(pts), detail=ordne(pts.concat(det));
  return {aussen:aussen,detail:detail.length>aussen.length?detail:null};
}
function grKetten(N,B,U,fs,u){
  let s='';
  ['oben','unten','links','rechts'].forEach(seite=>{
    let w=grKettenWerte(N,seite), hor=(seite==='oben'||seite==='unten'), vorne=(seite==='oben'||seite==='links');
    let kante=seite==='oben'?B.y1:seite==='unten'?B.y2:seite==='links'?B.x1:B.x2, dir=vorne?-1:1;
    let bau=seite==='oben'?U.y1:seite==='unten'?U.y2:seite==='links'?U.x1:U.x2;
    if(Math.abs(kante-bau)>1) bau=kante;   // ragt dort eine Terrasse o. Ä. hinaus, Hilfslinien erst dahinter beginnen
    let reihen=w.detail?[w.detail,w.aussen]:[w.aussen];
    reihen.forEach((werte,ri)=>{
      let pos=kante+dir*fs*(2.3+ri*1.9);
      let von=bau+dir*fs*0.5, bis=pos+dir*fs*0.35;
      if(ri===1) von=kante+dir*fs*2.3;
      s+=grKette(werte,hor,pos,fs,u,von,bis);
    });
  });
  return s;
}
function grKette(werte,hor,pos,fs,u,von,bis){
  let C=GR_FARBE, s='', t=fs*0.2, f0=fs*0.6, a=werte[0], b=werte[werte.length-1];
  s+= hor?grLinie(a,pos,b,pos,u*0.8):grLinie(pos,a,pos,b,u*0.8);
  werte.forEach(v=>{
    s+= hor?grLinie(v,von,v,bis,u*0.6,C.fein):grLinie(von,v,bis,v,u*0.6,C.fein);
    s+= hor?grLinie(v-t,pos+t,v+t,pos-t,u*1.4):grLinie(pos-t,v+t,pos+t,v-t,u*1.4);
  });
  for(let i=0;i<werte.length-1;i++){
    let L=werte[i+1]-werte[i], m=(werte[i]+werte[i+1])/2, mm=grMass(L), f=f0;
    if(mm.zeichen*0.56*f>L*0.92) f=Math.max(f0*0.62,L*0.92/(mm.zeichen*0.56));
    let hoeher=(mm.zeichen*0.56*f>L*1.05&&i%2)?f*1.05:0;
    let abst=t*1.3+hoeher;
    s+= hor
      ? '<text x="'+grF(m)+'" y="'+grF(pos-abst)+'" font-size="'+grF(f)+'" text-anchor="middle" fill="'+C.text+'">'+grMassSvg(L)+'</text>'
      : '<text x="'+grF(pos-abst)+'" y="'+grF(m)+'" font-size="'+grF(f)+'" text-anchor="middle" fill="'+C.text+'" transform="rotate(-90 '+grF(pos-abst)+' '+grF(m)+')">'+grMassSvg(L)+'</text>';
  }
  return s;
}
function grMassstabLaenge(gross){ return gross>1400?500:gross>500?200:100; }
function grMassstab(xr,y,gross,fs,u){
  let L=grMassstabLaenge(gross), n=L>=500?5:4, seg=L/n, h=fs*0.28, x0=xr-L, s='';
  for(let i=0;i<n;i++) s+=grRect(x0+i*seg,y-h,seg,h,'fill="'+(i%2?'#FFFFFF':GR_FARBE.linie)+'" stroke="'+GR_FARBE.linie+'" stroke-width="'+grF(u*0.8)+'"');
  let lab=v=>(v/100).toString().replace('.',',');
  s+='<text x="'+grF(x0)+'" y="'+grF(y-h-fs*0.25)+'" font-size="'+grF(fs*0.55)+'" text-anchor="middle" fill="'+GR_FARBE.fein+'">0</text>';
  s+='<text x="'+grF(xr)+'" y="'+grF(y-h-fs*0.25)+'" font-size="'+grF(fs*0.55)+'" text-anchor="middle" fill="'+GR_FARBE.fein+'">'+lab(L)+' m</text>';
  return s;
}
function grNord(cx,cy,grad,fs,u){
  let r=fs*0.7, C=GR_FARBE;
  return '<g transform="rotate('+grF(grad)+' '+grF(cx)+' '+grF(cy)+')"><circle cx="'+grF(cx)+'" cy="'+grF(cy)+'" r="'+grF(r)+'" fill="none" stroke="'+C.fein+'" stroke-width="'+grF(u*0.8)+'"/>'
    +'<path d="M'+grF(cx)+' '+grF(cy-r*0.85)+'L'+grF(cx+r*0.32)+' '+grF(cy+r*0.55)+'L'+grF(cx)+' '+grF(cy+r*0.25)+'L'+grF(cx-r*0.32)+' '+grF(cy+r*0.55)+'Z" fill="'+C.linie+'"/>'
    +'<text x="'+grF(cx)+'" y="'+grF(cy-r*1.15)+'" font-size="'+grF(fs*0.6)+'" font-weight="600" text-anchor="middle" fill="'+C.text+'">N</text></g>';
}

/* --- Code einlesen --- */
function grLesen(text){
  let t=(''+(text||'')).trim();
  if(!t) throw new Error('Es wurde noch nichts eingefügt.');
  let m=t.match(/```(?:json)?\s*([\s\S]*?)```/i); if(m) t=m[1].trim();
  let a=t.search(/[\[{]/), b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));
  if(a<0) throw new Error('Im eingefügten Text steht kein Grundriss-Code. Bitte den ganzen Codeblock aus der Antwort von Claude kopieren.');
  if(b<a) throw new Error('Der Code ist unvollständig — vermutlich wurde nur ein Teil kopiert. Bitte den ganzen Codeblock noch einmal kopieren, vom ersten { bis zum letzten }.');
  t=t.slice(a,b+1);
  let o;
  try{ o=JSON.parse(t); }
  catch(e1){
    let milde=t.split('\n').map(z=>z.replace(/(^|[\s,\[{])\/\/.*$/,'$1')).join('\n').replace(/\/\*[\s\S]*?\*\//g,'').replace(/,\s*([}\]])/g,'$1');
    try{ o=JSON.parse(milde); }
    catch(e2){ throw new Error('Der Code ist unvollständig oder beschädigt. Bitte den ganzen Codeblock noch einmal kopieren — vom ersten { bis zum letzten }.'); }
  }
  let liste=Array.isArray(o)?o:(o&&Array.isArray(o.grundrisse))?o.grundrisse:(o&&o.raeume)?[o]:null;
  if(!liste||!liste.length) throw new Error('Der Code enthält keinen Grundriss (es fehlen „grundrisse“ bzw. „raeume“).');
  let plaene=[], warn=[];
  liste.forEach((d,i)=>{
    if(!d||typeof d!=='object') return;
    let N=grNorm(d), name=d.geschoss||d.titel||('Plan '+(i+1));
    if(!N.raeume.length){ warn.push(name+': keine Räume mit Lage, übersprungen.'); return; }
    plaene.push(d);
    N.warn.forEach(w=>warn.push(name+': '+w));
  });
  if(!plaene.length) throw new Error('Kein Plan im Code enthält Räume mit Lage.');
  return {plaene:plaene,warn:warn};
}

/* --- Raumliste --- */
function grRaumlisteZeilen(p){
  let N=grNorm(p.d), g=grGeschossRL(p.d.geschoss), z=[];
  N.raeume.forEach(R=>{
    if(R.raw.liste===false) return;
    if(Array.isArray(R.raw.teile)&&R.raw.teile.length){
      R.raw.teile.forEach(t=>{ let nm=R.name+(t.name?' – '+t.name:''), an=grAnrechnung(t,nm);
        z.push({name:nm,gesch:g,fl:grZahl(t.flaeche_plan)?num2(+t.flaeche_plan):'',faktor:an.key,src:p.id,manuell:an.fest}); });
      return;
    }
    let q=grRaumQm(N,R), an=grAnrechnung(R.raw,R.name);
    z.push({name:R.name,gesch:g,fl:q!=null?num2(q):'',faktor:an.key,src:p.id,manuell:an.fest});
  });
  return z;
}
function grInRaumliste(p,leeren){
  let neu=grRaumlisteZeilen(p), alt=leeren?[]:rlLesen();
  let pos=alt.findIndex(z=>z.src===p.id);
  alt=alt.filter(z=>z.src!==p.id);
  if(pos<0||pos>alt.length) pos=alt.length;
  alt.splice.apply(alt,[pos,0].concat(neu));
  if(alt.length>N_RL){ alert('Die Raumliste fasst '+N_RL+' Zeilen. '+(alt.length-N_RL)+' Räume passen nicht mehr hinein.'); alt=alt.slice(0,N_RL); }
  rlSchreiben(alt);
  return neu.length;
}
function grAusRaumliste(id){ let alt=rlLesen(), rest=alt.filter(z=>z.src!==id); if(rest.length!==alt.length) rlSchreiben(rest); return alt.length-rest.length; }

/* --- Listen im Aufnahmebogen und bei den Fotos --- */
function grPlan(id){ return GRUNDRISSE.find(p=>p.id===id); }
function grInfo(p){
  let N=grNorm(p.d), s=grSumme(N), dn=(GR_DARST.find(x=>x[0]===p.darst)||GR_DARST[2])[1];
  return {N:N,text:s.n+' Räume · '+grFlaechenText(N,s)+' · '+dn};
}
function grFlaechenText(N,s){
  if(!N.massstab&&!(s.wfl>0)) return 'nicht maßstäblich, Flächen folgen nach dem Maßstab';
  return 'Wohnfläche '+num2(s.wfl)+' m²'+(s.lautPlan?' laut Plan':'')+(N.massstab?'':' · nicht maßstäblich');
}
function grListen(){
  document.querySelectorAll('[data-gr-liste]').forEach(box=>{
    if(!GRUNDRISSE.length){ box.innerHTML=box.dataset.grLeer?'<p class="hint" style="margin:6px 0 0">'+box.dataset.grLeer+'</p>':''; return; }
    box.innerHTML=GRUNDRISSE.map(p=>{ let i=grInfo(p);
      return '<button type="button" class="gr-karte" onclick="grBearbeiten(\''+idSicher(p.id)+'\')" aria-label="Grundriss '+grE(grTitel(i.N))+' ansehen und bearbeiten">'
        +'<span class="gr-bild">'+grSVG(i.N,p.darst,{klein:true})+'</span>'
        +'<span class="gr-info"><b>'+grE(grTitel(i.N))+'</b><span>'+grE(i.text)+'</span></span></button>'; }).join('');
  });
}

/* --- Dialog --- */
function grOverlay(html,halten){
  let o=$('gr_overlay'), y=o.scrollTop; $('gr_inhalt').innerHTML=html;
  if(!o.classList.contains('on')){ o.classList.add('on'); document.body.style.overflow='hidden'; }
  o.scrollTop=halten?y:0;
}
function grSchliessen(){ let o=$('gr_overlay'); o.classList.remove('on'); document.body.style.overflow=''; GR_TMP=null; GR_AKTIV=null; }
function grEinfuegen(vorher){
  GR_ZURUECK='einfuegen';
  grOverlay('<div class="gr-kopf"><h2 id="gr_titel">Grundriss einfügen</h2><button class="gr-x" onclick="grSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<ol class="gr-schritte"><li><b>Grundriss fotografieren</b>: senkrecht von oben, ganzes Blatt, gleichmäßiges Licht. Den Plankopf mit Eigentümer und Adresse abdecken.</li>'
    +'<li><b>Foto oder PDF an Claude schicken</b>: im Projekt „ImmoApp Grundrisse“ oder zusammen mit der <a href="#" onclick="grAnleitungZeigen();return false;">Anleitung für Claude</a>. Fehlen Maße, ein bekanntes Maß dazuschreiben.</li>'
    +'<li><b>Den Codeblock aus der Antwort kopieren</b> und hier einfügen.</li></ol>'
    +'<textarea id="gr_code" rows="8" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Code aus der Antwort von Claude hier einfügen …" aria-label="Grundriss-Code"></textarea>'
    +'<div class="gr-zeile"><button class="secondary" onclick="grAusZwischenablage()">Aus Zwischenablage einfügen</button><button class="secondary" onclick="grDateiOeffnen()">Datei öffnen</button></div>'
    +'<div id="gr_fehler" class="gr-fehler" role="alert" style="display:none"></div>'
    +'<div class="gr-fuss"><button onclick="grSchliessen()">Abbrechen</button><button class="primary" onclick="grWeiter()">Weiter</button></div>');
  if(vorher) $('gr_code').value=vorher;
}
function grAusZwischenablage(){
  if(!navigator.clipboard||!navigator.clipboard.readText){ grFehler('Einfügen aus der Zwischenablage erlaubt dieser Browser nicht. Bitte ins Feld tippen und „Einsetzen“ wählen.'); return; }
  navigator.clipboard.readText().then(t=>{ $('gr_code').value=t; grWeiter(); })
    .catch(()=>grFehler('Kein Zugriff auf die Zwischenablage. Bitte ins Feld tippen und „Einsetzen“ wählen.'));
}
function grDateiOeffnen(){
  let i=document.createElement('input'); i.type='file'; i.accept='.json,.txt,application/json,text/plain';
  i.onchange=()=>{ let f=i.files[0]; if(!f) return; let r=new FileReader(); r.onload=()=>{ $('gr_code').value=r.result; grWeiter(); }; r.readAsText(f); };
  i.click();
}
function grFehler(t){ let e=$('gr_fehler'); if(!e) return; e.textContent=t; e.style.display=t?'block':'none'; }
function grWeiter(){
  let text=$('gr_code').value;
  try{ GR_TMP=grLesen(text); GR_TMP.text=text; }
  catch(e){ grFehler(e.message); return; }
  GR_WAHL=null; grDarstellungWahl();
}
function grDarstellungWahl(){
  let T=GR_TMP, N0=grNorm(T.plaene[0]);
  let uebersicht=T.plaene.map(d=>{ let N=grNorm(d), s=grSumme(N), alt=d.id&&grPlan(d.id);
    return '<li><b>'+grE(grTitel(N))+'</b>: '+s.n+' Räume · '+grFlaechenText(N,s)+(alt?' — <i>ersetzt den vorhandenen Plan</i>':'')+'</li>'; }).join('');
  let karten=GR_DARST.map(x=>'<button type="button" class="gr-wahl-karte'+(GR_WAHL===x[0]?' on':'')+'" onclick="grWahl(\''+x[0]+'\')" aria-pressed="'+(GR_WAHL===x[0])+'">'
    +'<span class="gr-wahl-bild">'+grSVG(N0,x[0],{klein:true})+'</span><b>'+x[1]+'</b><span>'+x[2]+'</span></button>').join('');
  let fremd=rlLesen().filter(z=>!T.plaene.some(d=>d.id&&z.src===d.id)).length;
  grOverlay('<div class="gr-kopf"><h2 id="gr_titel">Welche Darstellung möchtest du anlegen?</h2><button class="gr-x" onclick="grSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<ul class="gr-uebersicht">'+uebersicht+'</ul>'
    +'<div class="gr-wahl" role="group" aria-label="Darstellung">'+karten+'</div>'
    +'<p class="hint">Die Darstellung lässt sich später jederzeit wechseln. Alle vier kommen aus denselben Daten.</p>'
    +grWarnBox(T.warn)
    +'<h3>Raumliste</h3>'
    +'<label class="toggle"><input type="checkbox" id="gr_opt_rl" checked> Räume in die Raumliste übernehmen (Fläche laut Plan)</label>'
    +(fremd?'<label class="chk" style="margin-top:8px"><input type="checkbox" id="gr_opt_leeren"> Die '+fremd+' vorhandenen Einträge der Raumliste vorher löschen</label>':'')
    +'<div class="gr-fuss"><button onclick="grEinfuegen(GR_TMP&&GR_TMP.text)">Zurück</button><button class="primary" id="gr_anlegen" onclick="grAnlegen()"'+(GR_WAHL?'':' disabled')+'>Grundriss anlegen</button></div>');
}
function grWahl(k){ GR_WAHL=k; document.querySelectorAll('#gr_overlay .gr-wahl-karte').forEach((b,i)=>{ let on=GR_DARST[i][0]===k; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); let a=$('gr_anlegen'); if(a) a.disabled=false; }
function grWarnBox(w){
  if(!w||!w.length) return '';
  return '<div class="gr-warn"><b>Hinweise zum Code</b><ul>'+w.map(x=>'<li>'+grE(x)+'</li>').join('')+'</ul></div>';
}
function grAnlegen(){
  if(!GR_TMP||!GR_WAHL) return;
  let rl=$('gr_opt_rl')&&$('gr_opt_rl').checked, leeren=$('gr_opt_leeren')&&$('gr_opt_leeren').checked, erste=null;
  GR_TMP.plaene.forEach((d,i)=>{
    d=JSON.parse(JSON.stringify(d));
    let id=d.id&&grPlan(d.id)?d.id:(d.id||('gr'+Date.now().toString(36)+i)); delete d.id;
    let p={id:id,darst:GR_WAHL,d:d}, k=GRUNDRISSE.findIndex(x=>x.id===id);
    if(k>=0) GRUNDRISSE[k]=p; else GRUNDRISSE.push(p);
    if(rl) grInRaumliste(p,leeren&&i===0);
    if(!erste) erste=id;
  });
  grSchliessen(); grListen(); compute(); autosave();
  let z=document.querySelector('#s-aufnahme [data-gr-liste]'); if(z) appScrollIntoView(z,{behavior:'smooth',block:'center'});
}

/* --- Ansehen und bearbeiten --- */
function grBearbeiten(id,halten){
  let p=grPlan(id); if(!p) return; GR_AKTIV=id; GR_ZURUECK='bearbeiten';
  let N=grNorm(p.d), g=grGeschossRL(p.d.geschoss);
  let seg=GR_DARST.map(x=>'<button type="button" class="'+(p.darst===x[0]?'on':'')+'" onclick="grDarstSetzen(\''+x[0]+'\')" aria-pressed="'+(p.darst===x[0])+'">'+x[1]+'</button>').join('');
  let gOpt='<option value="">—</option>'+RL_GESCHOSSE.map(x=>'<option'+(x===g?' selected':'')+'>'+x+'</option>').join('');
  let fOpt=k=>RL_FAKTOREN.map(f=>'<option value="'+f[0]+'"'+(f[0]===k?' selected':'')+'>'+f[2]+'</option>').join('');
  let zeilen=N.raeume.map(R=>{ let an=grAnrechnung(R.raw,R.name), abw=(R.plan!=null&&N.massstab&&R.qm>0)?(R.plan-R.qm)/R.qm*100:null;
    return '<tr><td><input value="'+grE(R.name)+'" aria-label="Raumname" onchange="grRaumSetzen('+R.i+',\'name\',this.value)"></td>'
      +'<td><select aria-label="Anrechnung '+grE(R.name)+'" onchange="grRaumSetzen('+R.i+',\'anrechnung\',this.value)">'+fOpt(an.key)+'</select></td>'
      +'<td><input value="'+(R.plan!=null?num2(R.plan):'')+'" placeholder="—" aria-label="Fläche laut Plan '+grE(R.name)+'" onchange="grRaumSetzen('+R.i+',\'flaeche_plan\',this.value)"></td>'
      +'<td class="gr-calc">'+(N.massstab?num2(R.qm)+' m²':'—')+(abw!=null&&Math.abs(abw)>3?'<span class="gr-abw">'+(abw>0?'+':'')+num2(abw)+' %</span>':'')+'</td>'
      +'<td class="gr-mitte"><input type="checkbox"'+(R.raw.liste===false?'':' checked')+' aria-label="'+grE(R.name)+' in die Raumliste" onchange="grRaumSetzen('+R.i+',\'liste\',this.checked)"></td></tr>'; }).join('');
  let rechteck=N.raeume.filter(R=>R.rect);
  let mass=N.massstab?'':'<div class="gr-mass"><b>Maßstab festlegen</b><p class="hint" style="margin:2px 0 8px">Dieser Plan ist nur nach den Proportionen gezeichnet. Ein einziges bekanntes Maß genügt, um ihn maßstäblich zu machen.</p>'
    +'<div class="gr-zeile"><select id="gr_mass_raum" aria-label="Raum">'+rechteck.map(R=>'<option value="'+R.i+'">'+grE(R.name)+'</option>').join('')+'</select>'
    +'<select id="gr_mass_seite" aria-label="Richtung"><option value="w">Breite (links–rechts)</option><option value="h">Tiefe (oben–unten)</option></select>'
    +'<input id="gr_mass_wert" placeholder="z. B. 4,20" aria-label="Maß in Metern" style="max-width:120px"><span class="u" style="align-self:center">m</span>'
    +'<button class="secondary" onclick="grMassstabSetzen()">Übernehmen</button></div></div>';
  grOverlay('<div class="gr-kopf"><h2 id="gr_titel">'+grE(grTitel(N))+'</h2><button class="gr-x" onclick="grSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<div class="gr-seg" role="group" aria-label="Darstellung">'+seg+'</div>'
    +'<div class="gr-gross" id="gr_gross">'+grSVG(N,p.darst)+'</div>'
    +'<div class="grid" style="margin-top:14px"><div class="field"><label>Geschoss</label><select id="gr_f_gesch" onchange="grMetaSetzen()">'+gOpt+'</select></div>'
    +'<div class="field"><label>Bezeichnung</label><input id="gr_f_titel" value="'+grE(p.d.titel||'')+'" placeholder="'+grE(grTitel(N))+'" onchange="grMetaSetzen()"></div></div>'
    +mass
    +'<h3>Räume</h3><div class="gr-tabelle"><table class="nhk gr-raeume"><thead><tr><th>Raum</th><th>Anrechnung § 4 WoFlV</th><th>Fläche laut Plan m²</th><th>aus den Maßen</th><th>Liste</th></tr></thead><tbody>'+zeilen+'</tbody></table></div>'
    +'<p class="hint">In die Raumliste geht die Fläche laut Plan, ohne Angabe die aus den Maßen berechnete. Weicht beides um mehr als 3 % ab, ist es markiert: Das kann ein Lesefehler sein oder ein älterer Plan mit Putzabzug.</p>'
    +grWarnBox(N.warn)
    +'<div class="gr-aktionen"><button class="primary" onclick="grListeAktualisieren()">Räume in die Raumliste übernehmen</button>'
    +'<button class="secondary" onclick="grCodeKopieren(this)">Code für Korrekturen kopieren</button>'
    +'<button class="secondary" onclick="grAlsBild()">Als Bild speichern</button>'
    +'<button class="secondary gr-loeschen" onclick="grLoeschen()">Löschen</button></div>'
    +'<p class="hint">Wände oder Maße ändern: Code kopieren, an Claude schicken und dazuschreiben, was geändert werden soll. Den neuen Code wieder über „Grundriss einfügen“ einsetzen: Er ersetzt diesen Plan.</p>',halten);
}
function grNeuZeichnen(){
  let p=grPlan(GR_AKTIV); if(!p) return;
  let g=$('gr_gross'); if(g) g.innerHTML=grSVG(grNorm(p.d),p.darst);
  grListen(); autosave();
}
function grDarstSetzen(k){
  let p=grPlan(GR_AKTIV); if(!p) return; p.darst=k;
  document.querySelectorAll('#gr_overlay .gr-seg button').forEach((b,i)=>{ let on=GR_DARST[i][0]===k; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  grNeuZeichnen();
}
function grRaumSetzen(i,feld,wert){
  let p=grPlan(GR_AKTIV); if(!p) return; let r=p.d.raeume[i]; if(!r) return;
  if(feld==='name'){
    let alt=(''+(r.name||'')).trim(), neu=(''+wert).trim(); if(!neu) return;
    (p.d.oeffnungen||[]).forEach(o=>{ if(o&&(''+(o.raum||'')).trim().toLowerCase()===alt.toLowerCase()) o.raum=neu; });
    r.name=neu;
  } else if(feld==='anrechnung') r.anrechnung=wert;
  else if(feld==='flaeche_plan'){ let t=(''+wert).trim(); if(t) r.flaeche_plan=Math.round(parseNum(t)*100)/100; else delete r.flaeche_plan; grBearbeiten(p.id,true); }
  else if(feld==='liste'){ if(wert) delete r.liste; else r.liste=false; }
  grNeuZeichnen();
}
function grMetaSetzen(){
  let p=grPlan(GR_AKTIV); if(!p) return;
  let g=$('gr_f_gesch').value, t=$('gr_f_titel').value.trim();
  if(g) p.d.geschoss=g; if(t) p.d.titel=t; else delete p.d.titel;
  $('gr_titel').textContent=grTitel(grNorm(p.d));
  grNeuZeichnen();
}
function grSkalieren(d,f){
  const r1=v=>Math.round(v*f*10)/10, P=p=>p.map(q=>[r1(+q[0]),r1(+q[1])]), R=a=>a.map(v=>r1(+v));
  (d.raeume||[]).forEach(r=>{ if(Array.isArray(r.r)) r.r=R(r.r); if(Array.isArray(r.poly)) r.poly=P(r.poly); });
  if(d.umriss&&Array.isArray(d.umriss.r)) d.umriss.r=R(d.umriss.r);
  else if(Array.isArray(d.umriss)&&d.umriss.length){ d.umriss=(Array.isArray(d.umriss[0])&&typeof d.umriss[0][0]!=='object')?P(d.umriss):d.umriss.map(P); }
  (d.oeffnungen||[]).forEach(o=>{ if(Array.isArray(o.r)) o.r=R(o.r); if(grZahl(o.ab)) o.ab=r1(+o.ab); if(grZahl(o.b)) o.b=r1(+o.b); });
  (d.treppen||[]).forEach(t=>{ if(Array.isArray(t.r)) t.r=R(t.r); });
  (d.einrichtung||[]).forEach(e=>{ if(Array.isArray(e.r)) e.r=R(e.r); });
  (d.linien||[]).forEach(l=>{ if(Array.isArray(l.p)) l.p=R(l.p); });
  (d.texte||[]).forEach(t=>{ if(grZahl(t.x)) t.x=r1(+t.x); if(grZahl(t.y)) t.y=r1(+t.y); });
  d.massstab=true;
}
function grMassstabSetzen(){
  let p=grPlan(GR_AKTIV); if(!p) return;
  let N=grNorm(p.d), R=N.raeume.find(r=>r.i===+$('gr_mass_raum').value), m=parseNum($('gr_mass_wert').value);
  if(!R||!(m>0)){ alert('Bitte einen Raum wählen und sein Maß in Metern eintragen, z. B. 4,20.'); return; }
  let ist=$('gr_mass_seite').value==='h'?R.box.h:R.box.w; if(!(ist>0)) return;
  grSkalieren(p.d,m*100/ist);
  p.d.hinweise=(Array.isArray(p.d.hinweise)?p.d.hinweise:[]).concat(['Maßstab aus einem Maß festgelegt: '+R.name+' '+(''+Math.round(m*1000)/1000).replace('.',',')+' m.']);
  grBearbeiten(p.id); grListen(); autosave();
}
function grListeAktualisieren(){
  let p=grPlan(GR_AKTIV); if(!p) return;
  let n=grInRaumliste(p,false); compute(); autosave();
  alert(n+' Räume stehen jetzt in der Raumliste (Aufnahmebogen ①b). Frühere Einträge dieses Grundrisses wurden ersetzt, eigene Einträge bleiben.');
}
function grCodeText(p){ return JSON.stringify({immoapp_grundriss:1,grundrisse:[Object.assign({id:p.id},p.d)]},null,1); }
function grKopieren(text,knopf,fertig){
  const ok=()=>{ if(knopf){ let t=knopf.textContent; knopf.textContent=fertig||'Kopiert ✓'; setTimeout(()=>knopf.textContent=t,2200); } };
  const alt=()=>{ let ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); let erfolg=false; try{ erfolg=document.execCommand('copy'); }catch(e){} ta.remove(); if(erfolg) ok(); else alert('Kopieren hat nicht geklappt. Bitte den Text von Hand markieren und kopieren.'); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok,alt); else alt();
}
function grCodeKopieren(knopf){ let p=grPlan(GR_AKTIV); if(p) grKopieren(grCodeText(p),knopf); }
function grPng(svg,breite){
  return new Promise((ok,fehler)=>{
    let m=svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/), w=breite, h=m?Math.round(breite*(+m[4])/(+m[3])):breite;
    let s=svg.replace('<svg ','<svg width="'+w+'" height="'+h+'" '), img=new Image();
    img.onload=()=>{ let c=document.createElement('canvas'); c.width=w; c.height=h; let g=c.getContext('2d'); g.fillStyle='#FFFFFF'; g.fillRect(0,0,w,h); g.drawImage(img,0,0,w,h); try{ ok(c.toDataURL('image/png')); }catch(e){ fehler(e); } };
    img.onerror=()=>fehler(new Error('Bild konnte nicht erzeugt werden'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
  });
}
function grAlsBild(){
  let p=grPlan(GR_AKTIV); if(!p) return; let N=grNorm(p.d);
  grPng(grSVG(N,p.darst),2400).then(async url=>iaHerunterladen(await (await fetch(url)).blob(),'Grundriss '+grTitel(N).replace(/[^\wäöüÄÖÜß .-]/g,'')+'.png'))
    .catch(()=>alert('Das Bild konnte nicht erzeugt werden.'));
}
function grLoeschen(){
  let p=grPlan(GR_AKTIV); if(!p) return;
  if(!confirm('Grundriss „'+grTitel(grNorm(p.d))+'“ löschen?')) return;
  let n=rlLesen().filter(z=>z.src===p.id).length;
  if(n&&confirm('Auch die '+n+' Räume dieses Grundrisses aus der Raumliste entfernen?')) grAusRaumliste(p.id);
  GRUNDRISSE=GRUNDRISSE.filter(x=>x.id!==p.id);
  grSchliessen(); grListen(); compute(); autosave();
}
/* Word kann kein SVG: Grundrisse vor dem Export in Bilder umwandeln */
async function grSvgAlsBild(wurzel){
  for(const svg of [...wurzel.querySelectorAll('svg.gr-svg')]){
    try{ let url=await grPng(svg.outerHTML,1600), img=document.createElement('img'); img.src=url; img.setAttribute('width','600'); img.className='gr'; img.alt='Grundriss'; svg.replaceWith(img); }catch(e){}
  }
}

/* --- Anleitung für Claude --- */
function grAnleitung(){ GR_ZURUECK=null; GR_AKTIV=null; grAnleitungZeigen(); }
function grAnleitungZeigen(){
  let zurueck=GR_ZURUECK==='bearbeiten'&&GR_AKTIV?'grBearbeiten(\''+GR_AKTIV+'\')':GR_ZURUECK==='einfuegen'?'grEinfuegen()':'grSchliessen()';
  grOverlay('<div class="gr-kopf"><h2 id="gr_titel">Anleitung für Claude</h2><button class="gr-x" onclick="grSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<p>Die ImmoApp liest selbst keine Bilder. Das übernimmt Claude nach dieser Anleitung. Einmal einrichten, dann immer gleich:</p>'
    +'<ol class="gr-schritte"><li>Auf <b>claude.ai</b> ein Projekt „ImmoApp Grundrisse“ anlegen und die Anleitung unten als <b>Projektanweisung</b> einfügen. Das Projekt steht dann auch in der Claude-App auf dem Handy bereit.</li>'
    +'<li>Im Projekt einen Chat beginnen und Foto oder PDF des Grundrisses schicken. Fehlen Maße im Plan, ein bekanntes Maß dazuschreiben, z. B. „Außenlänge 10,49 m“.</li>'
    +'<li>Claude nennt die gelesenen Maße und fragt bei Unklarem nach. Den Codeblock am Ende kopieren und in der ImmoApp unter „Grundriss einfügen“ einsetzen.</li></ol>'
    +'<p class="hint">Ohne Projekt geht es auch: Anleitung kopieren und zusammen mit dem Foto in einen neuen Chat schicken.<br>'
    +'Datenschutz: Den Plankopf mit Eigentümer und Adresse vor dem Fotografieren abdecken, und klär einmal mit dem Datenschutzbeauftragten, ob Kundenunterlagen mit Claude verarbeitet werden dürfen.</p>'
    +'<div class="gr-zeile"><button class="primary" onclick="grKopieren(GR_ANLEITUNG,this,\'Anleitung kopiert ✓\')">Anleitung kopieren</button></div>'
    +'<textarea readonly rows="12" class="gr-anleitung" aria-label="Anleitung für Claude">'+grE(GR_ANLEITUNG)+'</textarea>'
    +'<div class="gr-fuss"><button onclick="'+zurueck+'">Zurück</button></div>');
}
['input','change'].forEach(ev=>{ let o=$('gr_overlay'); if(o) o.addEventListener(ev,e=>e.stopPropagation()); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('gr_overlay'); if(o&&o.classList.contains('on')) grSchliessen(); } });
['input','change'].forEach(ev=>{ let o=$('kd_overlay'); if(o) o.addEventListener(ev,e=>e.stopPropagation()); });
['input','change'].forEach(ev=>{ let o=$('pq_overlay'); if(o) o.addEventListener(ev,e=>e.stopPropagation()); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('vm_overlay'); if(o&&o.classList.contains('on')) vmSchliessen(); } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('pq_overlay'); if(o&&o.classList.contains('on')) pqSchliessen(); } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('kd_overlay'); if(o&&o.classList.contains('on')) kdSchliessen(); } });

