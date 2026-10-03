/* ImmoApp — PDF aus Seitenbildern schreiben und Textstellen zum Schwärzen finden (D53), ohne Seitenbezug
   - pdfAusJpegs(seiten): kleinste gültige PDF 1.4, je Seite ein JPEG-Bild (DCTDecode) in Seitengröße. Keine Textebene, keine
     Metadaten (Autor, Titel, Programm) — was geschwärzt ist, steht danach nirgends mehr in der Datei. Aufbau nach ISO 32000-1
     (Kopf, Objekte, Querverweistabelle mit 20 Byte je Eintrag, Trailer, startxref).
   - treffer(items, suche): Textstücke einer Seite (aus pdf.js, Lage als Anteil der Seite 0 … 1), die den Suchbegriff oder ein
     Muster (IBAN, E-Mail, Telefonnummer, Datum) enthalten; die Fläche wird anteilig nach Zeichen geschätzt und um ein Zeichen
     verbreitert — lieber etwas zu viel schwärzen als zu wenig. Treffer über zwei Textstücke hinweg findet die Suche nicht. */
(function(wurzel){
'use strict';
const MUSTER={
  iban:/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g,
  email:/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  telefon:/(?:\+\d{2}|\b0)[\d ()\/-]{6,}\d/g,
  datum:/\b\d{1,2}\.\d{1,2}\.(?:19|20)?\d{2}\b/g
};
function bytes(s){ const b=new Uint8Array(s.length); for(let i=0;i<s.length;i++) b[i]=s.charCodeAt(i)&255; return b; }
/* seiten: [{jpeg: Uint8Array, breitePx, hoehePx, breitePt, hoehePt}] → Uint8Array */
function pdfAusJpegs(seiten){
  const teile=[], ab=[]; let n=0;
  const dazu=x=>{ const b=typeof x==='string'?bytes(x):x; teile.push(b); n+=b.length; };
  const obj=(nr,inhalt,strom)=>{ ab[nr]=n; dazu(nr+' 0 obj\n'+inhalt); if(strom){ dazu('\nstream\n'); dazu(strom); dazu('\nendstream'); } dazu('\nendobj\n'); };
  dazu('%PDF-1.4\n'); dazu(new Uint8Array([0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
  const kids=seiten.map((s,i)=>(3+3*i)+' 0 R').join(' ');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+kids+'] /Count '+seiten.length+' >>');
  seiten.forEach((s,i)=>{
    const p=3+3*i, w=+(+s.breitePt).toFixed(2), h=+(+s.hoehePt).toFixed(2), inhalt='q '+w+' 0 0 '+h+' 0 0 cm /Im0 Do Q';
    obj(p,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+(p+2)+' 0 R >> >> /Contents '+(p+1)+' 0 R >>');
    obj(p+1,'<< /Length '+inhalt.length+' >>',bytes(inhalt));
    obj(p+2,'<< /Type /XObject /Subtype /Image /Width '+Math.round(s.breitePx)+' /Height '+Math.round(s.hoehePx)+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+s.jpeg.length+' >>',s.jpeg);
  });
  const anzahl=3+3*seiten.length, xref=n;
  let x='xref\n0 '+anzahl+'\n0000000000 65535 f \n'; for(let i=1;i<anzahl;i++) x+=String(ab[i]).padStart(10,'0')+' 00000 n \n';
  dazu(x+'trailer\n<< /Size '+anzahl+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  const aus=new Uint8Array(n); let o=0; for(const t of teile){ aus.set(t,o); o+=t.length; } return aus;
}
/* items: [{str, x, y, w, h}] (Anteile der Seite); suche: Text oder Name eines Musters → Flächen [{x, y, w, h, text}] */
function treffer(items,suche){
  const aus=[]; let re=null;
  if(MUSTER[suche]) re=new RegExp(MUSTER[suche].source,'g');
  else { const t=String(suche||'').trim(); if(t.length<2) return aus; re=new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'),'gi'); }
  (items||[]).forEach(it=>{
    const s=String(it&&it.str||''); if(!s||!(it.w>0)||!(it.h>0)) return; re.lastIndex=0; let m;
    while((m=re.exec(s))){ if(!m[0]) { re.lastIndex++; continue; }
      if(suche==='telefon'&&/\d ?$/.test(s.slice(0,m.index))) continue;   // Ziffernblock mitten in IBAN oder Nummer
      const z=it.w/s.length, a=Math.max(0,m.index-1), e=Math.min(s.length,m.index+m[0].length+1);
      aus.push({x:it.x+a*z,y:it.y-it.h*0.15,w:(e-a)*z,h:it.h*1.35,text:m[0]}); }
  });
  return aus;
}
const ImmoPdfBild={MUSTER,pdfAusJpegs,treffer};
wurzel.ImmoPdfBild=ImmoPdfBild;
if(typeof module==='object'&&module.exports) module.exports=ImmoPdfBild;
})(typeof globalThis!=='undefined'?globalThis:this);
