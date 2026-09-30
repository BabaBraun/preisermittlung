/* ImmoApp — echte Word- (.docx) und Excel-Dateien (.xlsx) ohne Server und ohne fremde Bibliothek.
   Beide Formate sind Office Open XML: XML-Teile in einem ZIP-Container. Das ZIP wird hier selbst geschrieben
   (Einträge unkomprimiert, „stored“ — Office liest das problemlos; Fotos sind ohnehin JPEG-komprimiert).
   Offlinefähig, weil keine Datei nachgeladen wird. In Node testbar (tests/unit/office.test.mjs), die
   erzeugten Dateien werden dort zusätzlich mit python-docx und openpyxl geöffnet.
   Aufbau:
     zip(dateien)                 → Uint8Array
     xlsx(blaetter, meta)         → Uint8Array   blaetter: [{name, spalten:[breite], zeilen:[[zelle]]}]
     docx(bloecke, meta)          → Uint8Array   bloecke: [{typ:'h1'|'h2'|'h3'|'p'|'liste'|'tabelle'|'bild'|'umbruch', …}]
     bloeckeAusHtml(element)      → bloecke      (nur im Browser: wandelt den Bericht in Blöcke) */
(function(wurzel){
'use strict';

/* ---------- ZIP (PKZIP, Methode 0 = gespeichert) ---------- */
const CRC_TAB=(()=>{ let t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC_TAB[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
const utf8=s=>new TextEncoder().encode(s);
function zip(dateien, datum){
  const d=datum||new Date(2026,0,1);
  const zeit=((d.getHours()<<11)|(d.getMinutes()<<5)|(Math.floor(d.getSeconds()/2)))&0xFFFF;
  const tag=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  const teile=[], zentral=[]; let pos=0;
  for(const f of dateien){
    const name=utf8(f.name), daten=typeof f.daten==='string'?utf8(f.daten):f.daten, crc=crc32(daten);
    const k=new DataView(new ArrayBuffer(30));
    k.setUint32(0,0x04034b50,true); k.setUint16(4,20,true); k.setUint16(6,0x0800,true); k.setUint16(8,0,true);
    k.setUint16(10,zeit,true); k.setUint16(12,tag,true); k.setUint32(14,crc,true);
    k.setUint32(18,daten.length,true); k.setUint32(22,daten.length,true); k.setUint16(26,name.length,true); k.setUint16(28,0,true);
    teile.push(new Uint8Array(k.buffer),name,daten);
    const z=new DataView(new ArrayBuffer(46));
    z.setUint32(0,0x02014b50,true); z.setUint16(4,20,true); z.setUint16(6,20,true); z.setUint16(8,0x0800,true); z.setUint16(10,0,true);
    z.setUint16(12,zeit,true); z.setUint16(14,tag,true); z.setUint32(16,crc,true); z.setUint32(20,daten.length,true); z.setUint32(24,daten.length,true);
    z.setUint16(28,name.length,true); z.setUint16(30,0,true); z.setUint16(32,0,true); z.setUint16(34,0,true); z.setUint16(36,0,true);
    z.setUint32(38,0,true); z.setUint32(42,pos,true);
    zentral.push(new Uint8Array(z.buffer),name);
    pos+=30+name.length+daten.length;
  }
  const zGroesse=zentral.reduce((s,x)=>s+x.length,0);
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,dateien.length,true); e.setUint16(10,dateien.length,true);
  e.setUint32(12,zGroesse,true); e.setUint32(16,pos,true);
  const alle=teile.concat(zentral,[new Uint8Array(e.buffer)]);
  const out=new Uint8Array(alle.reduce((s,x)=>s+x.length,0)); let o=0;
  for(const x of alle){ out.set(x,o); o+=x.length; }
  return out;
}

/* ---------- XML ---------- */
/* Maskiert Text für XML und entfernt Zeichen, die in XML 1.0 nicht erlaubt sind */
function x(s){
  return String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const KOPF='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
function kern(meta){
  const jetzt=(meta&&meta.datum?new Date(meta.datum):new Date()).toISOString().replace(/\.\d{3}Z$/,'Z');
  return KOPF+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    +'<dc:title>'+x(meta&&meta.titel||'')+'</dc:title><dc:creator>'+x(meta&&meta.autor||'ImmoApp')+'</dc:creator><dc:language>de-DE</dc:language>'
    +'<dcterms:created xsi:type="dcterms:W3CDTF">'+jetzt+'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'+jetzt+'</dcterms:modified></cp:coreProperties>';
}
const APP=KOPF+'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ImmoApp</Application></Properties>';
const REL_PAKET=(haupt)=>KOPF+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="'+haupt+'"/>'
  +'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
  +'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';

/* ---------- XLSX ---------- */
const XLSX_STIL={normal:0,eur:1,dez:2,pct:3,fett:4,fetteur:5,titel:6,text:7,zahl:8};
function spalte(n){ let s=''; n++; while(n>0){ let m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
function blattName(n,i){ let s=String(n||('Tabelle'+(i+1))).replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,31); return s||('Tabelle'+(i+1)); }
function xlsxBlatt(b){
  const zeilen=(b.zeilen||[]).map((z,r)=>'<row r="'+(r+1)+'">'+z.map((c,s)=>{
    if(c==null||c==='') return '';
    const zelle=typeof c==='object'?c:{v:c};
    const ref=spalte(s)+(r+1), stil=XLSX_STIL[zelle.s]||0, st=stil?' s="'+stil+'"':'';
    if(typeof zelle.v==='number'&&isFinite(zelle.v)) return '<c r="'+ref+'"'+st+'><v>'+zelle.v+'</v></c>';
    if(typeof zelle.v==='boolean') return '<c r="'+ref+'" t="b"'+st+'><v>'+(zelle.v?1:0)+'</v></c>';
    return '<c r="'+ref+'" t="inlineStr"'+st+'><is><t xml:space="preserve">'+x(zelle.v)+'</t></is></c>';
  }).join('')+'</row>').join('');
  const cols=(b.spalten||[]).length?'<cols>'+b.spalten.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols>':'';
  return KOPF+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews>'+cols+'<sheetData>'+zeilen+'</sheetData></worksheet>';
}
const XLSX_STILE=KOPF+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  +'<numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0 &quot;€&quot;"/><numFmt numFmtId="165" formatCode="#,##0.00"/><numFmt numFmtId="166" formatCode="0.00&quot; %&quot;"/><numFmt numFmtId="167" formatCode="#,##0.####"/></numFmts>'
  +'<fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF1B4B7A"/><name val="Arial"/></font></fonts>'
  +'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  +'<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  +'<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  +'<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  +'<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  +'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  +'<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>'
  +'<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>'
  +'<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
  +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function xlsx(blaetter, meta){
  const b=blaetter&&blaetter.length?blaetter:[{name:'Tabelle1',zeilen:[]}];
  const namen=[]; b.forEach((bl,i)=>{ let n=blattName(bl.name,i), k=2; while(namen.includes(n)) n=blattName(bl.name,i).slice(0,28)+' '+(k++); namen.push(n); });
  const dateien=[
    {name:'[Content_Types].xml',daten:KOPF+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      +b.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      +'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      +'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'},
    {name:'_rels/.rels',daten:REL_PAKET('xl/workbook.xml')},
    {name:'docProps/core.xml',daten:kern(meta)},
    {name:'docProps/app.xml',daten:APP},
    {name:'xl/workbook.xml',daten:KOPF+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      +namen.map((n,i)=>'<sheet name="'+x(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels',daten:KOPF+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +b.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')
      +'<Relationship Id="rId'+(b.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:'xl/styles.xml',daten:XLSX_STILE}
  ].concat(b.map((bl,i)=>({name:'xl/worksheets/sheet'+(i+1)+'.xml',daten:xlsxBlatt(bl)})));
  return zip(dateien, meta&&meta.datum?new Date(meta.datum):undefined);
}

/* ---------- Bilder ---------- */
function base64ZuBytes(b64){
  const s=String(b64).replace(/\s/g,'');
  if(typeof atob==='function'){ const bin=atob(s), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
  return new Uint8Array(Buffer.from(s,'base64'));
}
function dataUrlZuBild(url){
  const m=/^data:image\/(jpeg|png);base64,(.+)$/s.exec(String(url||''));
  if(!m) return null;
  const bytes=base64ZuBytes(m[2]), masse=bildMasse(bytes);
  return masse?{art:m[1]==='png'?'png':'jpeg',bytes,breite:masse.breite,hoehe:masse.hoehe}:null;
}
/* Pixelmaße aus PNG (IHDR) bzw. JPEG (SOF-Marker) */
function bildMasse(b){
  if(b.length>24&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47){
    const d=new DataView(b.buffer,b.byteOffset,b.byteLength); return {breite:d.getUint32(16),hoehe:d.getUint32(20)};
  }
  if(b.length>4&&b[0]===0xFF&&b[1]===0xD8){
    let i=2;
    while(i+9<b.length){
      if(b[i]!==0xFF){ i++; continue; }
      const m=b[i+1], len=(b[i+2]<<8)|b[i+3];
      if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC) return {hoehe:(b[i+5]<<8)|b[i+6],breite:(b[i+7]<<8)|b[i+8]};
      i+=2+len;
    }
  }
  return null;
}

/* ---------- DOCX ---------- */
const EMU_CM=360000;
function runs(liste){
  return liste.map(r=>{
    const rpr=(r.fett?'<w:b/>':'')+(r.kursiv?'<w:i/>':'')+(r.farbe?'<w:color w:val="'+r.farbe+'"/>':'')+(r.klein?'<w:sz w:val="16"/>':'');
    const teile=String(r.text==null?'':r.text).split('\n');
    return '<w:r>'+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+teile.map((t,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+x(t)+'</w:t>').join('')+'</w:r>';
  }).join('');
}
function absatz(b){
  const pr=[];
  if(b.stil) pr.push('<w:pStyle w:val="'+b.stil+'"/>');
  if(b.rechts) pr.push('<w:jc w:val="right"/>');
  if(b.einzug) pr.push('<w:ind w:left="360" w:hanging="240"/>');
  if(b.rahmen) pr.push('<w:pBdr><w:top w:val="single" w:sz="12" w:space="4" w:color="B42318"/><w:left w:val="single" w:sz="12" w:space="4" w:color="B42318"/><w:bottom w:val="single" w:sz="12" w:space="4" w:color="B42318"/><w:right w:val="single" w:sz="12" w:space="4" w:color="B42318"/></w:pBdr>');
  const r=b.runs||[{text:b.text,fett:b.fett,klein:b.klein,farbe:b.farbe}];
  return '<w:p>'+(pr.length?'<w:pPr>'+pr.join('')+'</w:pPr>':'')+runs(r)+'</w:p>';
}
function tabelle(t){
  const breite=9638;   // 17 cm in Twips
  const n=Math.max(1,...t.zeilen.map(z=>z.reduce((s,c)=>s+(c.spalten||1),0)));
  const erste=n>1?Math.round(breite*0.55):breite, rest=n>1?Math.round((breite-erste)/(n-1)):0;
  const grid=Array.from({length:n},(_,i)=>i===0?erste:rest);
  const zeilen=t.zeilen.map(z=>{
    let belegt=0;
    const zellen=z.map((c,i)=>{
      let span=c.spalten||1; if(i===z.length-1&&belegt+span<n) span=n-belegt; belegt+=span;
      const pr='<w:tcPr><w:tcW w:w="'+grid.slice(belegt-span,belegt).reduce((s,v)=>s+v,0)+'" w:type="dxa"/>'+(span>1?'<w:gridSpan w:val="'+span+'"/>':'')+'</w:tcPr>';
      const ppr='<w:pPr><w:spacing w:before="20" w:after="20"/>'+(c.rechts?'<w:jc w:val="right"/>':'')+'</w:pPr>';
      return '<w:tc>'+pr+'<w:p>'+ppr+runs([{text:c.text,fett:c.fett||z.fett}])+'</w:p></w:tc>';
    }).join('');
    return '<w:tr><w:trPr><w:cantSplit/></w:trPr>'+zellen+'</w:tr>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="'+breite+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="DDDDDD"/></w:tblBorders>'
    +'<w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+grid.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+zeilen+'</w:tbl>'
    +'<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';
}
function bildXml(b,id){
  const max=(b.breiteCm||12)*EMU_CM, verh=b.hoehe/b.breite;
  let cx=Math.round(max), cy=Math.round(max*verh);
  const hmax=22*EMU_CM; if(cy>hmax){ cy=hmax; cx=Math.round(hmax/verh); }
  return '<w:p><w:pPr><w:keepNext/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="Bild '+id+'" descr="'+x(b.alt||'')+'"/>'
    +'<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    +'<pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="bild'+id+'.'+(b.art==='png'?'png':'jpeg')+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdBild'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    +'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
const DOCX_STILE=KOPF+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
  +'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault>'
  +'<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
  +'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
  +'<w:style w:type="paragraph" w:styleId="Titel"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="200"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="1B4B7A"/><w:sz w:val="40"/></w:rPr></w:style>'
  +'<w:style w:type="paragraph" w:styleId="berschrift1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="1B4B7A"/><w:sz w:val="32"/></w:rPr></w:style>'
  +'<w:style w:type="paragraph" w:styleId="berschrift2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="9FB4CC"/></w:pBdr><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="1B4B7A"/><w:sz w:val="26"/></w:rPr></w:style>'
  +'<w:style w:type="paragraph" w:styleId="berschrift3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="1B4B7A"/><w:sz w:val="22"/></w:rPr></w:style>'
  +'<w:style w:type="table" w:default="1" w:styleId="NormaleTabelle"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
  +'</w:styles>';
const STIL_H={h1:'berschrift1',h2:'berschrift2',h3:'berschrift3',titel:'Titel'};
function docx(bloecke, meta){
  const bilder=[]; let body='';
  for(const b of bloecke||[]){
    if(b.typ==='umbruch') body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    else if(STIL_H[b.typ]) body+=absatz({stil:STIL_H[b.typ],text:b.text});
    else if(b.typ==='p') body+=absatz(b);
    else if(b.typ==='liste') body+=absatz({einzug:true,runs:[{text:'• '}].concat(b.runs||[{text:b.text}])});
    else if(b.typ==='tabelle'&&b.zeilen&&b.zeilen.length) body+=tabelle(b);
    else if(b.typ==='bild'&&b.bytes&&b.breite>0&&b.hoehe>0){ bilder.push(b); body+=bildXml(b,bilder.length); }
  }
  body+='<w:p/>';
  const sect='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
  const dokument=KOPF+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    +' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    +'<w:body>'+body+sect+'</w:body></w:document>';
  const rels=KOPF+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rIdStile" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    +bilder.map((b,i)=>'<Relationship Id="rIdBild'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/bild'+(i+1)+'.'+(b.art==='png'?'png':'jpeg')+'"/>').join('')
    +'</Relationships>';
  const dateien=[
    {name:'[Content_Types].xml',daten:KOPF+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      +'<Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>'
      +'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      +'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      +'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      +'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'},
    {name:'_rels/.rels',daten:REL_PAKET('word/document.xml')},
    {name:'docProps/core.xml',daten:kern(meta)},
    {name:'docProps/app.xml',daten:APP},
    {name:'word/document.xml',daten:dokument},
    {name:'word/styles.xml',daten:DOCX_STILE},
    {name:'word/_rels/document.xml.rels',daten:rels}
  ].concat(bilder.map((b,i)=>({name:'word/media/bild'+(i+1)+'.'+(b.art==='png'?'png':'jpeg'),daten:b.bytes})));
  return zip(dateien, meta&&meta.datum?new Date(meta.datum):undefined);
}

/* ---------- Bericht (HTML) → Blöcke — nur im Browser ---------- */
const ZAHL_RECHTS=/^[−–+\-]?\s?[\d.,]+(\s?(€|%|m²|m³|J|Jahre|€\/m²|-fach))?(\s?[–-]\s?[\d.,]+\s?€)?$/;
function bloeckeAusHtml(wurzelEl){
  const out=[];
  const txt=el=>el.textContent.replace(/[ \t\r\f\v]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
  const flach=el=>el.textContent.replace(/\s+/g,' ').trim();
  const BLOCK=/^(DIV|P|H[1-6]|TABLE|UL|OL|FIGURE|IMG|SECTION|ARTICLE|HEADER|FOOTER|NAV|BLOCKQUOTE)$/;
  function inline(el,fett){
    const r=[];
    el.childNodes.forEach(n=>{
      if(n.nodeType===3){ const t=n.textContent.replace(/\s+/g,' '); if(t.trim()||r.length) r.push({text:t,fett}); }
      else if(n.nodeType===1){
        if(n.tagName==='BR') r.push({text:'\n'});
        else if(n.classList&&n.classList.contains('no-print')) return;
        else r.push(...inline(n,fett||n.tagName==='B'||n.tagName==='STRONG'));
      }
    });
    return r;
  }
  function bild(img,breiteCm){
    const b=dataUrlZuBild(img.getAttribute('src'));
    if(!b) return null;
    return Object.assign(b,{typ:'bild',alt:img.getAttribute('alt')||'',breiteCm});
  }
  function lauf(el){
    for(const n of el.childNodes){
      if(n.nodeType===3){ const t=n.textContent.replace(/\s+/g,' ').trim(); if(t) out.push({typ:'p',text:t}); continue; }
      if(n.nodeType!==1) continue;
      const tag=n.tagName, cls=n.classList;
      if(cls.contains('no-print')||/^(SCRIPT|STYLE|BUTTON|SELECT|INPUT|TEXTAREA|SVG)$/.test(tag)) continue;
      if(cls.contains('pagebreak')){ out.push({typ:'umbruch'}); continue; }
      if(/^H[1-6]$/.test(tag)){ const t=flach(n); if(t) out.push({typ:tag==='H1'?'h1':tag==='H2'?'h2':'h3',text:t}); continue; }
      if(tag==='TABLE'){
        const zeilen=[...n.rows].map(tr=>{
          const z=[...tr.cells].map((td,i)=>{ const t=txt(td); return {text:t,fett:td.tagName==='TH'||!!td.querySelector('b,strong')&&flach(td)===flach(td.querySelector('b,strong')),spalten:td.colSpan||1,rechts:i>0&&ZAHL_RECHTS.test(t.replace(/\n.*/s,''))}; });
          z.fett=tr.classList.contains('total'); return z;
        }).filter(z=>z.length);
        if(zeilen.length) out.push({typ:'tabelle',zeilen});
        continue;
      }
      if(tag==='IMG'){ const b=bild(n,n.classList.contains('gr')?16:n.classList.contains('sig-img')?5:12); if(b) out.push(b); continue; }
      if(tag==='FIGURE'){ const img=n.querySelector('img'), b=img&&bild(img,img.classList.contains('gr')?16:8); if(b) out.push(b);
        const fc=n.querySelector('figcaption'); if(fc&&flach(fc)) out.push({typ:'p',text:flach(fc),klein:true}); continue; }
      if(tag==='UL'||tag==='OL'){ [...n.children].filter(li=>li.tagName==='LI').forEach(li=>{ const r=inline(li,false); if(r.length) out.push({typ:'liste',runs:r}); }); continue; }
      if(cls.contains('entwurf')){ out.push({typ:'p',rahmen:true,runs:[{text:flach(n.querySelector('b')||n),fett:true,farbe:'B42318'}]});
        n.querySelectorAll('li').forEach(li=>out.push({typ:'liste',runs:[{text:flach(li),farbe:'7A271A'}]})); continue; }
      if([...n.children].some(c=>BLOCK.test(c.tagName))){ lauf(n); continue; }
      const r=inline(n,tag==='B'||tag==='STRONG'||cls.contains('val')||cls.contains('lbl'));
      while(r.length&&!String(r[r.length-1].text).trim()) r.pop();
      if(r.length) out.push({typ:'p',runs:r});
    }
  }
  lauf(wurzelEl);
  return out;
}

const ImmoOffice={zip,crc32,xlsx,docx,bildMasse,dataUrlZuBild,bloeckeAusHtml,xmlText:x,spalte};
wurzel.ImmoOffice=ImmoOffice;
if(typeof module==='object'&&module.exports) module.exports=ImmoOffice;
})(typeof globalThis!=='undefined'?globalThis:this);
