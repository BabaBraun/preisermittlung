/* ---------- PDF-Download ---------- */
function pdfName(){
  let r=$('report'); if(r&&r.dataset.pdfname) return r.dataset.pdfname+'.pdf';
  let n=($('ek_anschrift').value||'Preisermittlung').replace(/[^\wäöüÄÖÜß -]/g,'').trim()||'Preisermittlung';
  return 'Preisermittlung '+n+'.pdf';
}
/* PDF-Baustein (html2pdf 0.10.1) liegt im Repository (vendor/) und im Service-Worker-Cache — die
   PDF-Erstellung funktioniert damit auch offline. Integritätsprüfung wie bisher (D3); fehlt die lokale
   Datei (z. B. einzeln hochgeladene index.html), wird wie früher das CDN versucht. */
const HTML2PDF_SRI='sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==';
function html2pdfLaden(){
  if(window.html2pdf) return Promise.resolve();
  const laden=src=>new Promise((ok,fehler)=>{
    let s=document.createElement('script');
    s.src=src; s.integrity=HTML2PDF_SRI; s.crossOrigin='anonymous';
    s.onload=()=>window.html2pdf?ok():fehler(new Error('leer')); s.onerror=()=>{ s.remove(); fehler(new Error('nicht geladen')); };
    document.body.appendChild(s);
  });
  return laden('vendor/html2pdf.bundle.min.js')
    .catch(()=>laden('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'));
}
/* Seitenumbrüche: Überschrift und folgender Block bleiben zusammen (Druck und PDF). Grundrisse werden für das
   PDF zu Bildern, weil html2canvas die SVG-Pläne falsch skaliert. */
function berichtUmbrueche(r){
  const zusammen=(els,kl)=>{ let w=document.createElement('div'); w.className=kl||'kopf-halt'; els[0].before(w); w.append(...els); };
  /* Überschrift + folgender Block, wenn dieser klein ist (unter ~ einer halben Seite); große Blöcke laufen
     über Seiten weiter, die Überschrift hält dort über break-after:avoid Anschluss */
  r.querySelectorAll('h2,h3').forEach(h=>{
    if(h.parentElement&&h.parentElement.classList.contains('kopf-halt')) return;
    let n=h.nextElementSibling; if(!n||/^H[1-3]$/.test(n.tagName)||n.classList.contains('pagebreak')) return;
    if(n.getBoundingClientRect().height<450) zusammen([h,n]);
  });
  /* Haftungshinweis und Unterschrift gemeinsam, damit die Unterschrift nie allein auf der letzten Seite steht */
  let sig=r.querySelector('.signblock'), disc=sig&&sig.previousElementSibling;
  if(sig) zusammen(disc&&disc.classList.contains('disc')?[disc,sig]:[sig],'schluss-halt');
}
async function pdfVorbereiten(){ try{ await grSvgAlsBild($('report')); }catch(e){} }
function pdfOptionen(){
  return {margin:[12,12,14,12],filename:pdfName(),
    pagebreak:{mode:[]},   /* Umbrüche setzt js/pdf.js (seitenAufteilen), siehe pdfErstellen() */
    html2canvas:{scale:2,useCORS:true,ignoreElements:el=>el.classList&&el.classList.contains('no-print')},
    jsPDF:{unit:'mm',format:'a4',orientation:$('report').className==='praesentation'?'landscape':'portrait'}};
}
/* PDF über html2pdf mit eigener Seitenaufteilung (js/pdf.js). ziel: 'speichern' oder 'blob' */
async function pdfErstellen(ziel){
  await html2pdfLaden(); await pdfVorbereiten();
  let w=html2pdf().set(pdfOptionen()).from($('report')).toContainer().then(function(){
    /* Seitenhöhe aus der Breite des Containers: html2canvas rendert den ganzen Container, nicht nur den Bericht */
    let c=this.prop.container, root=c.firstElementChild||c;
    ImmoPdf.seitenAufteilen(root,c.getBoundingClientRect().width*this.prop.pageSize.inner.ratio);
  });
  return ziel==='blob'?w.outputPdf('blob'):w.save();
}
async function downloadPDF(){
  try{
    if(ImmoNative.isNative())return await iaHerunterladen(await pdfErstellen('blob'),pdfName());
    return await pdfErstellen('speichern');
  }catch(e){
    if(ImmoNative.isNative()){alert('Die PDF-Datei konnte nicht erstellt oder geteilt werden: '+(e.message||e));return 'fehlgeschlagen';}
    alert('Der PDF-Baustein ließ sich nicht laden. Es öffnet sich der Druckdialog – dort „Als PDF sichern“ wählen.');window.print();
  }
}

/* ---------- Teilen: Datei an das Teilen-Menü des Geräts geben (OneDrive, Dateien, Mail …) ------------
   Das iPhone öffnet das Menü nur direkt nach einem Tipp. Dauert das Erzeugen länger, verweigert es den
   Aufruf (NotAllowedError) — dann erscheint ein kleines Fenster, dessen Knopf den Tipp neu liefert.
   Geräte ohne Teilen von Dateien laden die Datei herunter. */
var TEILEN_DATEI=null;
function iaHinweis(text){
  let el=$('ia_hinweis'); if(!el) return;
  el.textContent=text||''; el.hidden=!text;
}
function iaHerunterladen(blob,name){
  if(ImmoNative.isNative())return ImmoNative.shareBlob(blob,name,name).catch(e=>{alert('Datei konnte nicht geteilt werden: '+e.message);return 'fehlgeschlagen';});
  let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),10000);
}
function iaKannTeilen(datei){ try{ return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[datei]})); }catch(e){ return false; } }
async function iaTeilen(blob,name,titel){
  if(ImmoNative.isNative()){try{return await ImmoNative.shareBlob(blob,name,titel);}catch(e){alert('Die Datei konnte nicht geteilt werden: '+(e.message||e));return 'fehlgeschlagen';}}
  let datei=new File([blob],name,{type:blob.type||'application/octet-stream'});
  if(!iaKannTeilen(datei)){ iaHerunterladen(blob,name); return 'geladen'; }
  try{ await navigator.share({files:[datei],title:titel||name}); return 'geteilt'; }
  catch(e){
    if(e&&e.name==='AbortError') return 'abgebrochen';
    teilenDialog(datei,titel); return 'dialog';
  }
}
function teilenDialog(datei,titel){
  TEILEN_DATEI=datei;
  let o=$('teilen_overlay'); if(!o) return;
  setT('teilen_name',datei.name);
  o.classList.add('on');
}
function teilenSchliessen(){ let o=$('teilen_overlay'); if(o) o.classList.remove('on'); TEILEN_DATEI=null; }
async function teilenJetzt(){
  let d=TEILEN_DATEI; if(!d) return;
  try{ await navigator.share({files:[d],title:d.name}); teilenSchliessen(); }
  catch(e){ if(e&&e.name==='AbortError') return; iaHerunterladen(d,d.name); teilenSchliessen(); }
}
function teilenLaden(){ let d=TEILEN_DATEI; if(d) iaHerunterladen(d,d.name); teilenSchliessen(); }
/* Bericht bzw. Exposé als PDF teilen — gezeigt wird, was gerade in #report steht */
async function pdfTeilen(){
  if(!document.body.classList.contains('report-mode')||!$('report').innerHTML.trim()) druckbericht();
  let r=$('report'), titel=r.dataset.pdfname||'Preisermittlung';
  iaHinweis('PDF wird erstellt …');
  try{ await html2pdfLaden(); }
  catch(e){ iaHinweis(''); alert('Der PDF-Baustein ließ sich nicht laden.\nAlternative: „Drucken“ wählen und dort über Teilen → „In Dateien sichern“.'); return; }
  let blob;
  try{ blob=await pdfErstellen('blob'); }
  catch(e){ iaHinweis(''); alert('Das PDF konnte nicht erstellt werden.'); return; }
  iaHinweis('');
  await iaTeilen(blob,pdfName(),titel);
}

