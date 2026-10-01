/* ImmoApp — Liegenschaften: Historischer Vergleich zweier Stichtage einer Liegenschaft
   Eckdaten (Grundstücksfläche, Bodenrichtwert, BGF, Baujahr, Restnutzungsdauer, Baupreisindex, Gebäudepreis, Monatsmiete)
   und Preisansätze (Grund und Boden, Bausubstanz, Mietertrag, Mittelwert) zweier Vordrucke nebeneinander, mit Veränderung
   in € und %: gestiegen grün, gesunken rot; Bausubstanz und Mittelwert hervorgehoben. Rechnung: ImmoJahresbewertung.vergleich.
   Jede Zahl ist änderbar — die Änderung gilt für den Vordruck des jeweiligen Stichtags, wie dort eingetragen (gerechnete
   Werte gelb überschrieben, „↺“ rechnet wieder); gespeichert wird erst mit „Speichern“. Bewusst ohne Namen, ohne Anschrift
   (nur Objektart und Ort) und ohne Herkunft der Mieten (nur Summen). */
'use strict';

var JB_VG=null;   // {lId, aId, bId, kopien:{bId:vordruck}, geaendert:{bId:true}}

function jbVgListe(l){ return ((l&&l.bewertungen)||[]).filter(b=>b.vordruck).sort((a,b)=>a.stichtag<b.stichtag?-1:a.stichtag>b.stichtag?1:0); }
function jbVgMoeglich(l){ return jbVgListe(l).length>=2; }
function jbVgAenderungen(){ return !!JB_VG&&Object.keys(JB_VG.geaendert).length>0; }
/* Arbeitskopie des Vordrucks (Änderungen bleiben bis „Speichern“ hier) */
function jbVgKopie(bId){
  const VG=JB_VG, l=LV.liste.find(x=>x.id===VG.lId), b=l&&(l.bewertungen||[]).find(x=>x.id===bId);
  if(!VG.kopien[bId]&&b&&b.vordruck) VG.kopien[bId]=JBK.bereinigen(JSON.parse(JSON.stringify(b.vordruck)));
  return VG.kopien[bId]||null;
}
function jbVergleichAuf(lId){
  const l=lId?LV.liste.find(x=>x.id===lId):jbObjekte().find(jbVgMoeglich); if(!l||!jbVgMoeglich(l)) return;
  const liste=jbVgListe(l);
  JB_VG={lId:l.id,aId:liste[0].id,bId:liste[liste.length-1].id,kopien:{},geaendert:{}};   // ältester gegen neuesten Stichtag
  JB_EDIT=null; LV.ansicht='uebersicht'; LV.form={typ:'vergleich'}; lvMeldung(''); lvRender(); jbNachOben();
}
function jbVgWahl(){
  const VG=JB_VG; if(!VG) return;
  const lSel=document.getElementById('jb_vg_l'), aSel=document.getElementById('jb_vg_a'), bSel=document.getElementById('jb_vg_b');
  if(lSel&&lSel.value!==VG.lId){
    if(jbVgAenderungen()&&!confirm('Die Änderungen im Vergleich sind noch nicht gespeichert. Verwerfen und eine andere Liegenschaft zeigen?')){ lSel.value=VG.lId; return; }
    jbVergleichAuf(lSel.value); return;
  }
  if(aSel) VG.aId=aSel.value; if(bSel) VG.bId=bSel.value;
  lvRender();
}
function jbVgDatum(b){ return LVK.datumDE(b.stichtag)+(b.status==='entwurf'?' (Entwurf)':''); }
function jbVgFmt(z,x){ if(x==null||!isFinite(x)) return ''; return z.jahr?String(Math.round(x)):jbFmtFrei(x,z.st,z.fest); }
function jbFmtFrei(x,st,fest){ x=+x; if(Math.abs(x)<0.5*Math.pow(10,-st)) x=0; return x.toLocaleString('de-DE',{minimumFractionDigits:fest?st:0,maximumFractionDigits:st}); }
function jbVgDiff(z){
  if(z.richtung==null) return {t:'',cls:''};
  if(z.richtung==='gleich') return {t:'unverändert',cls:'jb-vg-gleich'};
  const abs=(z.diff>0?'+':'−')+jbVgFmt(z,Math.abs(z.diff))+(z.einheit?' '+z.einheit:'');
  return {t:abs+(z.pct!=null?' ('+JBK.vergleichProzent(z.pct)+')':''),cls:z.richtung==='auf'?'jb-vg-auf':'jb-vg-ab'};
}

function jbVergleichHtml(){
  const VG=JB_VG, l=LV.liste.find(x=>x.id===VG.lId);
  if(!l||!jbVgMoeglich(l)){ JB_VG=null; LV.form=null; return jbAnsichtHtml(); }
  const liste=jbVgListe(l);
  if(!liste.some(b=>b.id===VG.aId)) VG.aId=liste[0].id;
  if(!liste.some(b=>b.id===VG.bId)) VG.bId=liste[liste.length-1].id;
  const A=liste.find(b=>b.id===VG.aId), B=liste.find(b=>b.id===VG.bId);
  const opt=(id)=>liste.map(b=>'<option value="'+lvH(b.id)+'"'+(b.id===id?' selected':'')+'>'+lvH(jbVgDatum(b))+'</option>').join('');
  const wahl='<div class="grid two jb-vg-wahl">'
    +'<div class="field full"><label for="jb_vg_l">Liegenschaft</label><select id="jb_vg_l">'+jbObjekte().filter(jbVgMoeglich).map(x=>'<option value="'+lvH(x.id)+'"'+(x.id===l.id?' selected':'')+'>'+lvH(x.name)+'</option>').join('')+'</select></div>'
    +'<div class="field"><label for="jb_vg_a">Stichtag (früher)</label><select id="jb_vg_a">'+opt(VG.aId)+'</select></div>'
    +'<div class="field"><label for="jb_vg_b">Stichtag (später)</label><select id="jb_vg_b">'+opt(VG.bId)+'</select></div></div>';
  const knoepfe='<div class="mdb-actions"><button class="primary" onclick="jbVgSpeichern()" data-ic="check">Speichern</button>'
    +'<button class="secondary" onclick="jbVgDokument()" data-ic="printer">Als Dokument (Drucken, PDF, Word)</button>'
    +'<button class="secondary" onclick="jbVgSchliessen()">Schließen</button></div>';
  let inhalt;
  if(A.id===B.id) inhalt='<p class="lv-warn">Bitte zwei verschiedene Stichtage wählen.</p>';
  else {
    const va=jbVgKopie(A.id), vb=jbVgKopie(B.id), zeilen=JBK.vergleich(va,vb);
    const objekt=vb.objekt||va.objekt||'';
    let gruppe='', rows='';
    zeilen.forEach(z=>{
      if(z.gruppe!==gruppe){ gruppe=z.gruppe; rows+='<tr class="jb-vg-gruppe"><th colspan="4">'+lvH(gruppe)+'</th></tr>'; }
      const zelle=j=>{ if(!z.da[j]) return '<span class="lv-klein">–</span>';
        const stt=jbVgDatum(j?B:A);
        return '<span class="jb-mw'+(z.eingabe?' jb-vg-ein':'')+'"><input data-vgk="'+lvH(z.key)+'" data-vgs="'+j+'" type="text" inputmode="decimal" aria-label="'+lvH(z.label+', '+stt)+'">'
          +(z.einheit?'<span class="jb-eh">'+lvH(z.einheit)+'</span>':'')
          +(z.eingabe?'':'<button type="button" class="jb-reset" data-vgreset="'+j+'" data-vgk="'+lvH(z.key)+'" hidden title="Gerechneten Wert wieder verwenden" aria-label="Gerechneten Wert wieder verwenden">↺</button>')+'</span>'; };
      rows+='<tr class="jb-vg-z'+(z.hervor?' jb-vg-hervor'+(z.hervor==='stark'?' jb-vg-stark':''):'')+'"><td class="jb-vg-l">'+lvH(z.label)+'</td>'
        +'<td class="r" data-stichtag="'+lvH(jbVgDatum(A))+'">'+zelle(0)+'</td><td class="r" data-stichtag="'+lvH(jbVgDatum(B))+'">'+zelle(1)+'</td>'
        +'<td class="r jb-vg-d" data-vgd="'+lvH(z.key)+'"></td></tr>';
    });
    inhalt='<p class="jb-vg-objekt"><b>'+lvH(objekt||'Objekt')+'</b>'+(l.ort?' · '+lvH(l.ort):'')+'</p>'
      +'<div class="mdb-scroll"><table class="mdb-tbl lv-tbl jb-vg-tab" id="jb_vergleich"><thead><tr><th>Kennzahl</th><th class="r">'+lvH(jbVgDatum(A))+'</th><th class="r">'+lvH(jbVgDatum(B))+'</th><th class="r">Veränderung</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table></div>'
      +'<div class="jb-vg-text" id="jb_vg_text" aria-live="polite"></div>'
      +'<div id="jb_vg_fehler" class="lv-warn" hidden></div>';
  }
  return lvBox('Historischer Vergleich',wahl+inhalt
    +'<p class="hint">Jede Zahl ist änderbar. Eine Änderung gilt für den Vordruck des jeweiligen Stichtags, genau wie dort eingetragen: '
    +'Angaben (Fläche, Bodenrichtwert, BGF, Baujahr, Restnutzungsdauer) werden übernommen, gerechnete Werte wie eine Excel-Zelle überschrieben (gelb, „↺“ rechnet wieder). '
    +'Alles Folgende rechnet sofort neu; gespeichert wird mit „Speichern“. Gezeigt werden nur Zahlen — ohne Namen, ohne Anschrift und ohne Angaben, woher eine Miete stammt. '
    +'Baupreisindex auf Basis 2010 (Index × Faktor wie im Vordruck), damit verschiedene Basisjahre vergleichbar sind.</p>'+knoepfe,'jb-vg');
}
/* Felder, Veränderung und Text auf den Stand bringen — außer dem Feld, in dem gerade geschrieben wird */
function jbVgAusgaben(){
  const tab=document.getElementById('jb_vergleich'), VG=JB_VG; if(!tab||!VG) return;
  const va=jbVgKopie(VG.aId), vb=jbVgKopie(VG.bId); if(!va||!vb) return;
  const zeilen=JBK.vergleich(va,vb), nach=Object.fromEntries(zeilen.map(z=>[z.key,z])), aktiv=document.activeElement;
  tab.querySelectorAll('input[data-vgk]').forEach(el=>{
    const z=nach[el.dataset.vgk]; if(!z) return; const j=+el.dataset.vgs, man=z.manuell[j];
    el.classList.toggle('jb-manuell',man);
    el.title=z.eingabe?'Angabe im Vordruck':man?'Von Hand eingetragen — „↺“ verwendet wieder den gerechneten Wert':'Gerechnet — zum Überschreiben einfach eintragen';
    const knopf=el.parentNode.querySelector('.jb-reset'); if(knopf) knopf.hidden=!man;
    if(el!==aktiv&&!el.classList.contains('lv-fehler')){ const t=jbVgFmt(z,z.werte[j]); if(el.value!==t) el.value=t; } });
  tab.querySelectorAll('[data-vgd]').forEach(el=>{ const z=nach[el.dataset.vgd]; if(!z) return; const d=jbVgDiff(z);
    if(el.textContent!==d.t) el.textContent=d.t; el.className='r jb-vg-d '+d.cls; });
  const txt=document.getElementById('jb_vg_text');
  if(txt){ const s=JBK.vergleichText(zeilen), html=s.length?'<b>Hinweis:</b> '+s.map(lvH).join(' '):''; if(txt.innerHTML!==html) txt.innerHTML=html; }
}
function jbVgEingabe(el){
  const VG=JB_VG; if(!VG||!el.dataset||el.dataset.vgk==null||el.tagName!=='INPUT') return;
  const j=+el.dataset.vgs, bId=j?VG.bId:VG.aId, v=jbVgKopie(bId); if(!v) return;
  const z=JBK.vergleich(jbVgKopie(VG.aId),jbVgKopie(VG.bId)).find(x=>x.key===el.dataset.vgk); if(!z) return;
  const x=LVK.zahlEingabe(el.value);
  if(Number.isNaN(x)){ el.classList.add('lv-fehler'); return; }
  el.classList.remove('lv-fehler');
  if(JBK.vergleichSetzen(v,z.key,x,z.faktor)) VG.geaendert[bId]=true;
  jbVgAusgaben();
}
function jbVgZuruecksetzen(knopf){
  const VG=JB_VG; if(!VG) return; const j=+knopf.dataset.vgreset, bId=j?VG.bId:VG.aId, v=jbVgKopie(bId); if(!v) return;
  JBK.vergleichSetzen(v,knopf.dataset.vgk,null); VG.geaendert[bId]=true;
  const f=knopf.parentNode.querySelector('input'); if(f) f.classList.remove('lv-fehler');
  jbVgAusgaben();
}
async function jbVgSpeichern(){
  const VG=JB_VG; if(!VG) return;
  const box=document.getElementById('jb_vg_fehler');
  if(document.querySelector('#jb_vergleich .lv-fehler')){ if(box){ box.hidden=false; box.textContent='Ungültige Zahl in einem rot markierten Feld — bitte korrigieren.'; box.scrollIntoView({block:'nearest'}); } return; }
  const ids=Object.keys(VG.geaendert); if(!ids.length){ lvMeldung('Keine Änderungen zu speichern.'); lvRender(); return; }
  const l=LV.liste.find(x=>x.id===VG.lId), daten=ids.map(id=>((l&&l.bewertungen)||[]).find(b=>b.id===id)).filter(Boolean).map(b=>LVK.datumDE(b.stichtag));
  const ok=await lvAendern(x=>{ ids.forEach(id=>{ const b=(x.bewertungen||[]).find(y=>y.id===id); if(!b||!VG.kopien[id]) return;
      b.vordruck=JBK.bereinigen(VG.kopien[id]); LVBW.ausVordruck(b); }); },
    'Gespeichert: Vordruck'+(daten.length===1?' zum ':'e zum ')+daten.join(' und ')+' geändert.',VG.lId);
  if(ok){ VG.kopien={}; VG.geaendert={}; lvRender(); }
}
function jbVgSchliessen(){
  if(jbVgAenderungen()&&!confirm('Die Änderungen im Vergleich sind noch nicht gespeichert. Verwerfen?')) return;
  JB_VG=null; LV.form=null; lvRender();
}

/* ---------- Als Dokument (Drucken, PDF, Word): nur Objektart und Ort, keine Namen, keine Anschrift ---------- */
function jbVgDokHtml(l,A,B,va,vb){
  const h=lvH, zeilen=JBK.vergleich(va,vb), objekt=vb.objekt||va.objekt||'Objekt';
  const kv=(k,w)=>'<tr><td class="l">'+h(k)+'</td><td class="w" colspan="3">'+h(w)+'</td></tr>';
  let gruppe='', rows='';
  zeilen.forEach(z=>{
    if(z.gruppe!==gruppe){ gruppe=z.gruppe; rows+='<tr class="jbd-vg-gruppe"><td colspan="4"><b>'+h(gruppe)+'</b></td></tr>'; }
    const w=j=>z.da[j]&&z.werte[j]!=null?jbVgFmt(z,z.werte[j])+(z.einheit?' '+z.einheit:''):'–', d=jbVgDiff(z);
    rows+='<tr class="'+(z.hervor?'jbd-vg-hervor'+(z.hervor==='stark'?' total':''):'')+'"><td class="l">'+h(z.label)+'</td><td class="b">'+h(w(0))+'</td><td class="b">'+h(w(1))+'</td>'
      +'<td class="b '+d.cls+'">'+h(d.t)+'</td></tr>';
  });
  const text=JBK.vergleichText(zeilen);
  return '<div class="jbd jbd-vg"><h2 class="jbd-titel">Historischer Vergleich</h2>'
    +'<table class="jbd-t jbd-kv"><tbody>'+kv('Objekt:',objekt)+(l.ort?kv('Ort:',l.ort):'')+kv('Vergleich der Stichtage:',jbVgDatum(A)+' und '+jbVgDatum(B))+'</tbody></table>'
    +'<table class="jbd-t jbd-vg-t"><thead><tr><th class="l">Kennzahl</th><th class="b">'+h(jbVgDatum(A))+'</th><th class="b">'+h(jbVgDatum(B))+'</th><th class="b">Veränderung</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +(text.length?'<p class="jbd-text"><b>Hinweis:</b> '+h(text.join(' '))+'</p>':'')
    +'<p class="jbd-fuss">Rechnerische Preiseinschätzung nach dem Vordruck der Bank, kein Verkehrswertgutachten. Baupreisindex auf Basis 2010. Stand '+h(LVK.datumDE(lvHeute()))+'.</p></div>';
}
function jbVgDokument(){
  const VG=JB_VG; if(!VG||VG.aId===VG.bId) return;
  const l=LV.liste.find(x=>x.id===VG.lId), liste=jbVgListe(l), A=liste.find(b=>b.id===VG.aId), B=liste.find(b=>b.id===VG.bId);
  const va=jbVgKopie(VG.aId), vb=jbVgKopie(VG.bId); if(!l||!A||!B||!va||!vb) return;
  const r=document.getElementById('report'); if(!r) return;
  r.className='jb-dok';
  r.dataset.pdfname=('Historischer Vergleich '+(vb.objekt||'')+' '+(l.ort||'')+' '+LVK.datumDE(A.stichtag)+' und '+LVK.datumDE(B.stichtag)).replace(/[^\wäöüÄÖÜß ,.-]/g,'').replace(/\s+/g,' ').trim();
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="jbDokZurueck()">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="jbDokWord()">Word</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +jbVgDokHtml(l,A,B,va,vb);
  const o=document.getElementById('lv_overlay'); if(o) o.classList.remove('on');
  document.body.style.overflow=''; document.body.classList.add('report-mode'); window.scrollTo(0,0);
}

(function(){
  const einrichten=()=>{
    const o=document.getElementById('lv_overlay'), body=document.getElementById('lv_body'); if(!o||!body) return;
    o.addEventListener('input',e=>{ if(e.target&&e.target.closest&&e.target.closest('#jb_vergleich')) jbVgEingabe(e.target); });
    o.addEventListener('change',e=>{ const t=e.target; if(!t) return;
      if(t.id==='jb_vg_l'||t.id==='jb_vg_a'||t.id==='jb_vg_b') jbVgWahl();
      else if(t.closest&&t.closest('#jb_vergleich')) jbVgEingabe(t); });
    // beim Verlassen eines Feldes Zahlen einheitlich darstellen
    o.addEventListener('focusout',e=>{ if(e.target&&e.target.closest&&e.target.closest('#jb_vergleich')) setTimeout(jbVgAusgaben,0); });
    o.addEventListener('click',e=>{ const b=e.target&&e.target.closest&&e.target.closest('#jb_vergleich [data-vgreset]'); if(b) jbVgZuruecksetzen(b); });
    new MutationObserver(()=>{ if(document.getElementById('jb_vergleich')) jbVgAusgaben(); }).observe(body,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',einrichten); else einrichten();
})();
