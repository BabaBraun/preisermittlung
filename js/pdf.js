/* ImmoApp — Seitenaufteilung für den PDF-Download (html2pdf)
   html2pdf rendert den Bericht als ein langes Bild und schneidet es in A4-Streifen. Seine eingebaute
   Umbruchlogik misst relativ zum Fenster und kennt keine Raster (Fotogitter) — Grundriss und Fotos wurden
   zerschnitten, Überschriften standen allein am Seitenende. Deshalb verteilt seitenAufteilen() die Blöcke
   selbst: Es misst ab der Oberkante des Berichts, setzt vor jeden Block, der über eine Seitengrenze ragen
   würde, einen Abstand, hält Überschriften mit dem folgenden Block zusammen, teilt Raster in Zeilen und
   lange Texte in Absätze und erzwingt Umbrüche an .pagebreak. Nur im Browser (braucht Layout). */
(function(wurzel){
'use strict';

/* Raster (display:grid mit mehreren Spalten) in einzelne Zeilen zerlegen, damit Zeilen als Block wandern */
function rasterZeilen(root){
  root.querySelectorAll('*').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display!=='grid') return;
    const spalten=cs.gridTemplateColumns.split(' ').filter(Boolean).length, kinder=[...el.children];
    if(spalten<2||kinder.length<=spalten) return;
    const vorlage={cols:cs.gridTemplateColumns,gap:cs.columnGap,zeile:cs.rowGap&&cs.rowGap!=='normal'?cs.rowGap:'0px'};
    el.style.display='block';
    for(let i=0;i<kinder.length;i+=spalten){
      const z=document.createElement('div');
      z.className='pdf-zeile';
      z.style.cssText='display:grid;grid-template-columns:'+vorlage.cols+';column-gap:'+vorlage.gap+';margin-bottom:'+vorlage.zeile;
      kinder.slice(i,i+spalten).forEach(k=>z.appendChild(k));
      el.appendChild(z);
    }
  });
}
/* Lange Fließtexte (white-space: pre-wrap) in Absätze teilen */
function absaetze(root){
  root.querySelectorAll('.beschr,.ex-text').forEach(el=>{
    if(el.children.length) return;
    const teile=el.textContent.split(/\n\s*\n/);
    if(teile.length<2) return;
    el.textContent='';
    teile.forEach((t,i)=>{ const d=document.createElement('div'); d.textContent=t; d.style.whiteSpace='pre-wrap'; if(i) d.style.marginTop='0.8em'; el.appendChild(d); });
  });
}
function abstand(el,hoehe,vorher){
  let d;
  if(el.tagName==='TR'){
    d=document.createElement('tr'); const td=document.createElement('td');
    td.colSpan=99; td.style.cssText='height:'+hoehe+'px;padding:0;border:0;background:transparent'; d.appendChild(td);
  } else { d=document.createElement('div'); d.style.cssText='height:'+hoehe+'px;margin:0;padding:0;border:0'; }
  d.className='pdf-abstand';
  el.parentNode.insertBefore(d,vorher?el:el.nextSibling);
}
/* Blöcke in Dokumentreihenfolge; Blöcke höher als eine Seite werden in ihre Teile zerlegt */
function bloecke(el,P,out){
  for(const k of el.children){
    const cs=getComputedStyle(k);
    if(cs.display==='none'||cs.position==='fixed'||cs.position==='absolute') continue;
    if(k.classList.contains('pagebreak')){ out.push({el:k,umbruch:true}); continue; }
    const h=k.getBoundingClientRect().height;
    const danach=/^(page|always|left|right)$/.test(cs.breakAfter||'')||/^(always|left|right)$/.test(cs.pageBreakAfter||'');
    if(h===0) continue;
    if(h>P+1&&!danach){
      if(k.tagName==='TABLE'){ [...k.rows].forEach(tr=>out.push({el:tr})); continue; }
      if(k.children.length){ bloecke(k,P,out); continue; }
    }
    out.push({el:k,danach});
  }
  return out;
}
/* P = Seitenhöhe in CSS-Pixeln bei der Breite des Berichts */
function seitenAufteilen(root,P){
  /* Präsentation: jede Folie genau eine Seite hoch */
  if(root.querySelector('.vp-folie')){ root.style.padding='0'; root.style.margin='0'; root.style.maxWidth='none'; root.style.width='100%'; }
  root.querySelectorAll('.vp-folie').forEach(f=>{ f.style.aspectRatio='auto'; f.style.height=Math.floor(P-2)+'px'; f.style.margin='0'; f.style.overflow='hidden'; })
  /* html2canvas lässt .no-print beim Rendern weg — vorher entfernen, sonst verschiebt sich alles um deren Höhe */
  root.querySelectorAll('.no-print').forEach(e=>e.remove());
  absaetze(root); rasterZeilen(root);
  const liste=bloecke(root,P,[]), kopf=el=>/^H[1-6]$/.test(el.tagName);
  let eingefuegt=0;
  for(let i=0;i<liste.length;i++){
    const b=liste[i], t0=root.getBoundingClientRect().top, r=b.el.getBoundingClientRect();
    const oben=r.top-t0; let unten=r.bottom-t0;
    if(b.umbruch){ const rest=P-(oben%P); if(rest>1&&rest<P){ abstand(b.el,rest,false); eingefuegt++; } continue; }
    const ende=(Math.floor(oben/P)+1)*P;
    /* Überschrift(en): zusammen mit dem Anfang des nächsten Inhaltsblocks. Wird dieser Block gleich auf die
       nächste Seite verschoben, wandert die Überschrift mit; sonst müssen mindestens 80 px davon mit auf die Seite. */
    if(kopf(b.el)){
      let j=i+1; while(liste[j]&&kopf(liste[j].el)) j++;
      if(liste[j]&&!liste[j].umbruch){
        const n=liste[j].el.getBoundingClientRect(), nOben=n.top-t0, nEnde=(Math.floor(nOben/P)+1)*P;
        const wirdVerschoben=n.bottom-t0>nEnde+1&&n.height<=P;
        if(wirdVerschoben&&nEnde===ende){ abstand(b.el,ende-oben,true); eingefuegt++; continue; }
        unten=Math.min(nOben+Math.min(n.height,80),oben+P);
      }
    }
    if(unten>ende+1&&unten-oben<=P){ abstand(b.el,ende-oben,true); eingefuegt++; }
    /* erzwungener Umbruch nach dem Block (break-after: page, z. B. Präsentationsfolien) */
    if(b.danach&&liste[i+1]){
      const u=b.el.getBoundingClientRect().bottom-root.getBoundingClientRect().top+(parseFloat(getComputedStyle(b.el).marginBottom)||0), rest=P-(u%P);
      if(rest>1&&rest<P){ abstand(b.el,rest,false); eingefuegt++; }
    }
  }
  return eingefuegt;
}

const ImmoPdf={seitenAufteilen};
wurzel.ImmoPdf=ImmoPdf;
})(typeof globalThis!=='undefined'?globalThis:this);
