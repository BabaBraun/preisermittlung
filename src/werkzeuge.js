/* ---------- Beratung & Werkzeuge: gemeinsame Oberfläche der acht Kacheln (D38) -------------------------------------
   Ein Fenster (#wz_overlay) für alle Werkzeuge. Jedes meldet sich mit wzRegistrieren() an:
   {id, titel, sub, icon, start() → Anfangswerte, zeichnen(S) → HTML, rechnen(S), dokument(S) → {titel, html},
    kundeText(S) → Notiz für die Kundenakte, ausBewertung(S), aktionen:[{label, icon, fn}]}
   - Eingaben stehen in WZ.s[id] und bleiben auf dem Gerät (localStorage „ia_wz“). Die Rechner fragen keine Namen ab;
     Namen, Fotos und Unterschriften gibt es nur im Übergabeprotokoll (Datenbank, Speicher „protokolle“).
   - Felder tragen data-wz="pfad" (z. B. „personen.0.alter“). Eingaben lösen nicht die Bewertung aus (stopPropagation)
     und gehören nicht zum Projekt (collect() lässt #wz_overlay aus). data-zeichnen: Änderung baut das Werkzeug neu auf.
   - „Dokument“ zeigt die Zusammenfassung im Bericht (#report) — Drucken, PDF, Word und Teilen wie bei der Liegenschaft. */
var WZ={reg:{},reihe:[],aktiv:null,s:null,timer:null,dokVon:null};
const WZ_KEY='ia_wz';
function wzRegistrieren(d){ if(!WZ.reg[d.id]) WZ.reihe.push(d.id); WZ.reg[d.id]=d; }
function wzAlle(){
  if(!WZ.s){ try{ let o=JSON.parse(localStorage.getItem(WZ_KEY)||'{}'); WZ.s=o&&typeof o==='object'&&!Array.isArray(o)?o:{}; }catch(e){ WZ.s={}; } }
  return WZ.s;
}
function wzZustand(id){
  let d0=WZ.reg[id]; if(d0&&d0.zustand) return d0.zustand();   // eigener Speicher (Übergabeprotokoll: Datenbank)
  let a=wzAlle();
  if(!a[id]||typeof a[id]!=='object'){ let d=WZ.reg[id]; a[id]=d&&d.start?d.start():{}; }
  return a[id];
}
function wzSpeichernJetzt(){
  clearTimeout(WZ.timer);
  try{ localStorage.setItem(WZ_KEY,JSON.stringify(wzAlle())); if(typeof speicherFehler==='function') speicherFehler('wz',''); }
  catch(e){ if(typeof speicherFehler==='function') speicherFehler('wz','Die Eingaben der Werkzeuge konnten nicht gespeichert werden (Speicher voll?).'); }
}
function wzSpeichern(){ clearTimeout(WZ.timer); WZ.timer=setTimeout(wzSpeichernJetzt,300); }

/* ---------- Pfade, Zahlen, Formate ---------- */
function wzHol(o,pfad){ return String(pfad).split('.').reduce((a,k)=>a==null?undefined:a[k],o); }
function wzSetz(o,pfad,w){
  let t=String(pfad).split('.'), a=o;
  for(let i=0;i<t.length-1;i++){ let k=t[i]; if(a[k]==null||typeof a[k]!=='object') a[k]=/^\d+$/.test(t[i+1])?[]:{}; a=a[k]; }
  a[t[t.length-1]]=w;
}
/* Zahl aus einem Eingabewert; betrag=true: „450.000“ ist ein Betrag (wie die Bewertung, ImmoKern.zahlLesen) */
function wzN(v,betrag){ if(typeof v==='number') return isFinite(v)?v:0; return ImmoKern.zahlLesen(v==null?'':String(v),!!betrag); }
function wzEur(x){ return eur(Math.round(x||0)).replace(/^-/,'− '); }   // echtes Minuszeichen
function wzZ(x,st){ st=st==null?2:st; return (+x||0).toLocaleString('de-DE',{minimumFractionDigits:st,maximumFractionDigits:st}).replace(/^-/,'−'); }
function wzP(x,st){ return wzZ(x,st==null?1:st)+' %'; }
function wzDatum(iso){ return iso&&/^\d{4}-\d{2}-\d{2}$/.test(iso)?new Date(iso+'T00:00:00').toLocaleDateString('de-DE'):'–'; }
function wzT(id,t){ let e=$(id); if(e) e.textContent=t; }
function wzH(id,h){ let e=$(id); if(e) e.innerHTML=h; }
function wzId(pfad){ return 'wz_'+(WZ.aktiv||'x')+'_'+String(pfad).replace(/[^a-zA-Z0-9]/g,'_'); }
function wzDateiname(t){ return String(t||'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Beratung'; }

/* ---------- Felder ----------
   o={typ:'zahl'|'betrag'|'prozent'|'text'|'datum'|'wahl'|'check'|'lang', einheit, optionen:[[wert,text]], hinweis, ph, voll,
      zeichnen:true (Änderung baut neu auf)} */
function wzFeld(pfad,label,o){
  o=o||{};
  let S=wzZustand(WZ.aktiv), w=wzHol(S,pfad), id=wzId(pfad), z=o.zeichnen?' data-zeichnen="1"':'';
  if(o.typ==='check') return '<label class="wz-check'+(o.voll?' full':'')+'"><input type="checkbox" id="'+id+'" data-wz="'+pfad+'"'+z+(w?' checked':'')+'><span>'+label+'</span></label>';
  let lbl='<label for="'+id+'">'+label+(o.einheit?' <span class="u">'+o.einheit+'</span>':'')+'</label>', feld;
  if(o.typ==='wahl') feld='<select id="'+id+'" data-wz="'+pfad+'"'+z+'>'+o.optionen.map(([v,t])=>'<option value="'+sEsc(v)+'"'+(String(w==null?'':w)===String(v)?' selected':'')+'>'+sEsc(t)+'</option>').join('')+'</select>';
  else if(o.typ==='lang') feld='<textarea id="'+id+'" data-wz="'+pfad+'" rows="'+(o.zeilen||3)+'"'+(o.ph?' placeholder="'+sEsc(o.ph)+'"':'')+'>'+sEsc(w==null?'':String(w))+'</textarea>';
  else feld='<input id="'+id+'" data-wz="'+pfad+'" type="'+(o.typ==='datum'?'date':'text')+'"'
    +(['zahl','betrag','prozent'].includes(o.typ)?' inputmode="decimal"':'')+' value="'+sEsc(w==null?'':String(w))+'"'+(o.ph?' placeholder="'+sEsc(o.ph)+'"':'')+'>';
  return '<div class="field'+(o.voll?' full':'')+'">'+lbl+feld+(o.hinweis?'<span class="wz-feldhinweis">'+o.hinweis+'</span>':'')+'</div>';
}
/* Ergebniszeile; wert per id später von rechnen() gesetzt */
function wzZeile(id,label,o){ o=o||{}; return '<div class="row-calc'+(o.summe?' wz-summe':'')+'"><span>'+label+'</span><b id="'+id+'">–</b></div>'; }
function wzBox(titel,inhalt,o){ o=o||{}; return '<div class="mdb-box'+(o.klasse?' '+o.klasse:'')+'"'+(o.id?' id="'+o.id+'"':'')+'>'+(titel?'<h3>'+titel+'</h3>':'')+inhalt+'</div>'; }
function wzHinweis(t){ return '<p class="hint">'+t+'</p>'; }
function wzAmpel(stufe,text){ return '<div class="wz-ampel wz-'+stufe+'"><span class="wz-punkt" aria-hidden="true"></span><span>'+text+'</span></div>'; }

/* ---------- Öffnen, Zeichnen, Rechnen ---------- */
function wzOeffnen(id){
  let d=WZ.reg[id], o=$('wz_overlay'); if(!d||!o) return;
  WZ.aktiv=id;
  $('wz_titel').innerHTML=iaSvg(d.icon)+sEsc(d.titel);
  wzT('wz_sub',d.sub||'');
  wzAktionen(); wzZeichnen();
  o.classList.add('on'); document.body.style.overflow='hidden'; o.scrollTop=0;
}
function wzSchliessen(){
  let o=$('wz_overlay'); if(!o) return;
  wzSpeichernJetzt();
  let d=WZ.reg[WZ.aktiv]; if(d&&d.schliessen) try{ d.schliessen(); }catch(e){}
  o.classList.remove('on'); document.body.style.overflow=''; WZ.aktiv=null;
}
function wzAktionen(){
  let d=WZ.reg[WZ.aktiv], b=[];
  const k=(fn,ic,t)=>'<button class="secondary" onclick="'+fn+'" data-ic="'+ic+'" aria-label="'+sEsc(t)+'" title="'+sEsc(t)+'"><span class="lbl">'+sEsc(t)+'</span></button>';
  if(d.ausBewertung) b.push(k('wzAusBewertung()','arrow-down','Aus Bewertung'));
  (d.aktionen||[]).forEach(a=>b.push(k(a.fn,a.icon,a.label)));
  if(d.kundeText) b.push(k('wzKundeAblegen()','users','Beim Kunden ablegen'));
  if(d.dokument) b.push(k('wzDokument()','file-text','Dokument'));
  if(d.start&&!d.ohneNeu) b.push(k('wzNeu()','file','Neu'));
  b.push('<button class="icon" onclick="wzSchliessen()" title="Schließen" aria-label="Schließen" data-ic="x"></button>');
  $('wz_aktionen').innerHTML=b.join(''); iconify($('wz_aktionen'));
}
function wzZeichnen(){
  let d=WZ.reg[WZ.aktiv], box=$('wz_body'); if(!d||!box) return;
  box.innerHTML=d.zeichnen(wzZustand(d.id)); iconify(box); wzRechnen();
}
function wzRechnen(){ let d=WZ.reg[WZ.aktiv]; if(d&&d.rechnen) try{ d.rechnen(wzZustand(d.id)); }catch(e){ console.error('Werkzeug '+d.id,e); } }
function wzNeu(){
  let d=WZ.reg[WZ.aktiv]; if(!d||!d.start) return;
  if(!confirm('Alle Eingaben in „'+d.titel+'“ zurücksetzen?')) return;
  wzAlle()[d.id]=d.start(); wzSpeichern(); wzZeichnen();
}
function wzEingabe(ev){
  let el=ev.target; if(!el||!el.dataset||!el.dataset.wz||!WZ.aktiv) return;
  let d=WZ.reg[WZ.aktiv], S=wzZustand(WZ.aktiv); if(!S) return;
  wzSetz(S,el.dataset.wz,el.type==='checkbox'?el.checked:el.value);
  if(d&&d.speichern) d.speichern(); else wzSpeichern();
  // Textfelder, die die Ansicht ändern, erst beim Verlassen neu aufbauen (sonst verlöre das Feld beim Tippen den Fokus)
  if(el.dataset.zeichnen&&!(ev.type==='input'&&el.tagName!=='SELECT'&&el.type!=='checkbox')) wzZeichnen(); else wzRechnen();
}
/* Werte der geöffneten Bewertung — nur mit berechnetem Ergebnis */
function wzBewertung(){ let R=window._R||{}; return R.empfehlung>0?R:null; }
function wzAusBewertung(){
  let d=WZ.reg[WZ.aktiv]; if(!d||!d.ausBewertung) return;
  if(!wzBewertung()){ alert('Es ist keine Bewertung mit Ergebnis geöffnet. Bitte zuerst eine Bewertung öffnen oder die Werte von Hand eintragen.'); return; }
  d.ausBewertung(wzZustand(d.id)); if(d.speichern) d.speichern(); else wzSpeichern(); wzZeichnen();
}

/* ---------- Beim Kunden ablegen: als Gesprächsnotiz in der Kundenakte ---------- */
function wzKundeAblegen(){
  let d=WZ.reg[WZ.aktiv]; if(!d||!d.kundeText||!kdVerfuegbar()) return;
  let text=d.kundeText(wzZustand(d.id)); if(!text) return;
  const ablegen=async id=>{
    let k=KD_CACHE.find(x=>x.id===id); if(!k) return;
    k.kontakte=(k.kontakte||[]).concat([{id:'c'+Date.now().toString(36),ts:Date.now(),datum:aufHeute(),art:d.titel,text:text}]);
    let ok=await kdSpeichern(k);
    if($('wz_overlay').classList.contains('on')) document.body.style.overflow='hidden';
    if(ok) alert('Die Rechnung steht jetzt als Gesprächsnotiz in der Kundenakte von '+kdName(k)+'.');
  };
  if(!KD_CACHE.length){ if(confirm('Es gibt noch keinen Kunden. Jetzt einen anlegen?')) kdOeffnen(null,id=>ablegen(id)); return; }
  kdOeffnen(null,id=>ablegen(id));
}

/* ---------- Dokument im Bericht ---------- */
async function wzDokument(){
  let d=WZ.reg[WZ.aktiv]; if(!d||!d.dokument) return;
  let dok=await d.dokument(wzZustand(d.id)); if(!dok) return;
  let r=$('report'); if(!r) return;
  r.className='wz-dok'; r.dataset.pdfname=wzDateiname(dok.titel);
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="wzDokZurueck()">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="wzDokWord()">Word</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +'<div class="wzd">'+dok.html+'<p class="wzd-fuss">Erstellt mit der ImmoApp am '+new Date().toLocaleDateString('de-DE')+'. '
    +(dok.fuss||'Modellrechnung zur Orientierung im Beratungsgespräch.')+'</p></div>';
  WZ.dokVon=WZ.aktiv; wzSpeichernJetzt();
  $('wz_overlay').classList.remove('on'); WZ.aktiv=null;
  document.body.style.overflow=''; document.body.classList.add('report-mode'); window.scrollTo(0,0);
}
function wzDokZurueck(){
  document.body.classList.remove('report-mode');
  let r=$('report'); if(r){ r.innerHTML=''; r.className=''; delete r.dataset.pdfname; }
  if(WZ.dokVon){ let id=WZ.dokVon; WZ.dokVon=null; wzOeffnen(id); }
}
function wzDokWord(){
  let r=$('report'), el=r&&r.querySelector('.wzd'); if(!el) return;
  let name=r.dataset.pdfname||'Beratung';
  iaHerunterladen(new Blob([ImmoOffice.docx(ImmoOffice.bloeckeAusHtml(el),{titel:name})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),wzDateiname(name)+'.docx');
}
/* Tabellen für Dokumente: zeilen=[[text, wert, {summe}]] */
function wzDokTabelle(zeilen,kopf){
  return '<table class="wzd-tab">'+(kopf?'<thead><tr>'+kopf.map(k=>'<th>'+k+'</th>').join('')+'</tr></thead>':'')+'<tbody>'
    +zeilen.filter(Boolean).map(z=>'<tr'+(z[2]&&z[2].summe&&!kopf?' class="summe"':'')+'>'+z.slice(0,kopf?kopf.length:2).map((c,i)=>'<td'+(i>0&&wzZahlig(c)?' class="r"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
/* rechtsbündig nur Zahlen und Beträge, Texte (z. B. Anschrift) linksbündig */
function wzZahlig(c){ return /^[−+–-]?\s?\d/.test(String(c==null?'':c).replace(/<[^>]+>/g,'').trim());
}

/* Ereignisse: im Fenster bleiben, nicht die Bewertung rechnen lassen */
(function(){
  let o=$('wz_overlay'); if(!o) return;
  o.addEventListener('input',e=>{ e.stopPropagation(); let t=e.target; if(t&&(t.tagName==='SELECT'||t.type==='checkbox')) return; wzEingabe(e); });
  o.addEventListener('change',e=>{ e.stopPropagation(); let t=e.target; if(t&&(t.tagName==='SELECT'||t.type==='checkbox'||t.type==='date'||(t.dataset&&t.dataset.zeichnen))) wzEingabe(e); });
  o.addEventListener('click',e=>{ if(e.target===o) wzSchliessen(); });
})();
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ let o=$('wz_overlay'); if(o&&o.classList.contains('on')) wzSchliessen(); } });

/* Gesamtsicherung einspielen (D38): fehlende Werkzeuge und Einträge ergänzen, vorhandene Eingaben auf dem Gerät bleiben */
function wzEinspielen(w){
  if(!w||typeof w!=='object'||Array.isArray(w)) return false;
  let a=wzAlle(), neu=false;
  const merge=(ziel,quelle)=>{ Object.keys(quelle).forEach(k=>{
    if(k==='__proto__'||k==='constructor'||k==='prototype') return;   // keine Prototyp-Manipulation aus fremden Dateien
    let q=quelle[k];
    if(!Object.prototype.hasOwnProperty.call(ziel,k)){ ziel[k]=q; neu=true; }
    else if(ziel[k]&&q&&typeof ziel[k]==='object'&&typeof q==='object'&&!Array.isArray(q)&&!Array.isArray(ziel[k])) merge(ziel[k],q); }); };
  merge(a,w); if(neu) wzSpeichernJetzt(); return neu;
}
