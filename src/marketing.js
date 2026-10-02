/* ---------- Vermarktung und Eigentümer-Bericht ----------------------------------------------------------
   Stand, Protokoll (Anfragen, Besichtigungen, Angebote, Preisänderungen) und Rückmeldungen je Objekt. Die
   Daten liegen im versteckten Feld vm_daten der Bewertung und reisen so mit dem Projekt. Der Eigentümer-Bericht
   nennt keine Interessentennamen — nur Art, Datum und Rückmeldung. */
const VM_STATUS=['','Akquise','Auftrag erteilt','In Vermarktung','Reserviert','Notartermin','Verkauft','Zurückgezogen'];
const VM_ARTEN=['Anfrage','Besichtigung','Zweitbesichtigung','Kaufangebot','Reservierung','Preisänderung','Sonstiges'];
const VM_RUECK=['','positiv','neutral','Preis zu hoch','Lage','Zustand / Sanierungsbedarf','Grundriss','zu klein','zu groß','Finanzierung unklar','Sonstiges'];
function vmDaten(f){ let v=f?f.vm_daten:exV('vm_daten'); try{ let o=JSON.parse(v||'{}'); o.ev=Array.isArray(o.ev)?o.ev:[]; return o; }catch(e){ return {ev:[]}; } }
function vmSpeichern(d){ $('vm_daten').value=JSON.stringify(d); autosave(); vmRender(); }
// nur ein gültiges Datum zählt: das Datumsfeld lässt nichts anderes zu, eine ältere oder fremde Projektdatei schon
function vmDatum(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s||'')&&isFinite(new Date(s))?s:''; }
function vmTage(start){ start=vmDatum(start); return start?Math.max(0,Math.round((new Date(aufHeute())-new Date(start))/864e5)):0; }
function vmKennzahlen(d,start,ab){
  let ev=d.ev.filter(e=>!ab||e.d>=ab);
  const z=a=>ev.filter(e=>a.includes(e.art)).length;
  let rueck={}; ev.filter(e=>e.rueck).forEach(e=>{ rueck[e.rueck]=(rueck[e.rueck]||0)+1; });
  return {anfragen:z(['Anfrage']),besicht:z(['Besichtigung','Zweitbesichtigung']),angebote:z(['Kaufangebot','Reservierung']),rueck:rueck,tage:vmTage(start),ev:ev};
}
function vmEmpfehlung(d,start){
  let k=vmKennzahlen(d,start), zuTeuer=k.rueck['Preis zu hoch']||0;
  if(k.angebote) return 'Es liegt ein konkretes Kaufinteresse vor. Wir klären die Finanzierung des Interessenten und bereiten den Notartermin vor.';
  if(k.besicht>=5&&zuTeuer/k.besicht>=0.4) return 'Mehrere Interessenten halten den Preis für zu hoch ('+zuTeuer+' von '+k.besicht+' Besichtigungen). Wir empfehlen, den Angebotspreis gemeinsam zu überprüfen.';
  if(k.tage>=42&&k.anfragen<5) return 'Nach '+Math.round(k.tage/7)+' Wochen ist die Nachfrage gering. Preis und Präsentation sollten wir gemeinsam überprüfen.';
  return 'Die Vermarktung verläuft planmäßig. Wir setzen die Besichtigungen fort und berichten weiter regelmäßig.';
}
function vmRender(){
  let box=$('vm_log'); if(!box) return;
  let d=vmDaten(), start=vmDatum(exV('vm_start')), k=vmKennzahlen(d,start);
  setT('vm_k_tage',start?k.tage+' Tage':'–'); setT('vm_k_anfragen',k.anfragen); setT('vm_k_besicht',k.besicht); setT('vm_k_angebote',k.angebote);
  let ev=d.ev.slice().sort((a,b)=>(b.d||'').localeCompare(a.d||'')||(b.id||'').localeCompare(a.id||''));
  box.innerHTML=ev.length?'<table class="nhk vm-tab"><thead><tr><th>Datum</th><th>Art</th><th>Interessent</th><th>Rückmeldung</th><th>Notiz</th><th></th></tr></thead><tbody>'
    +ev.map(e=>'<tr><td>'+(e.d?new Date(e.d+'T00:00:00').toLocaleDateString('de-DE'):'')+'</td><td>'+sEsc(e.art)+(e.preis?' '+eur(e.preis):'')+'</td><td>'+sEsc(e.wer||'')+'</td>'
      +'<td>'+(e.rueck?'<span class="vm-rueck r-'+(e.rueck==='positiv'?'ok':e.rueck==='neutral'?'neu':'warn')+'">'+sEsc(e.rueck)+'</span>':'')+'</td><td>'+sEsc(e.notiz||'')+'</td>'
      +'<td><button class="weg" aria-label="Eintrag löschen" onclick="vmWeg(\''+e.id+'\')">✕</button></td></tr>').join('')+'</tbody></table>'
    :'<p class="hint" style="margin:0">Noch keine Einträge.</p>';
  let r=Object.keys(k.rueck).filter(x=>x!=='positiv'&&x!=='neutral').sort((a,b)=>k.rueck[b]-k.rueck[a]);
  setT('vm_rueck_kurz',r.length?'Häufigste Einwände: '+r.slice(0,3).map(x=>x+' ('+k.rueck[x]+')').join(', '):'');
  if($('vm_empfehlung')) $('vm_empfehlung').placeholder=vmEmpfehlung(d,start);
  let dl=$('vm_wer_liste'); if(dl) dl.innerHTML=KD_CACHE.filter(x=>x.suchprofil&&x.suchprofil.aktiv).concat(KD_CACHE.filter(x=>!(x.suchprofil&&x.suchprofil.aktiv))).map(x=>'<option value="'+sEsc(kdName(x))+'">').join('');
}
function vmNeu(){
  let art=exV('vm_n_art'), wer=exV('vm_n_wer'), preis=art==='Preisänderung'?zahlLesen(exV('vm_n_preis'),true):0;
  if(art==='Preisänderung'&&!(preis>0)){ alert('Bitte den neuen Angebotspreis eintragen.'); return; }
  let d=vmDaten(), kd=KD_CACHE.find(x=>kdName(x)===wer);
  d.ev.push({id:'v'+Date.now().toString(36),d:vmDatum(exV('vm_n_datum'))||aufHeute(),art:art,wer:wer,kid:kd?kd.id:'',rueck:exV('vm_n_rueck'),notiz:exV('vm_n_notiz'),preis:preis||0});
  if(preis>0) $('vm_preis').value=''+preis;
  if(!exV('vm_start')&&['Anfrage','Besichtigung'].includes(art)) $('vm_start').value=vmDatum(exV('vm_n_datum'))||aufHeute();
  ['vm_n_wer','vm_n_notiz','vm_n_preis'].forEach(i=>$(i).value=''); $('vm_n_rueck').value='';
  vmSpeichern(d);
  if(kd&&['Besichtigung','Zweitbesichtigung','Kaufangebot'].includes(art)&&IA_DB_BEREIT){   // auch in der Akte des Interessenten vermerken
    let neu=d.ev[d.ev.length-1];
    kd.kontakte=(kd.kontakte||[]).concat([{id:'c'+Date.now().toString(36),ts:Date.now(),datum:neu.d,art:art==='Kaufangebot'?'Angebot':'Besichtigung',text:(art==='Zweitbesichtigung'?'Zweitbesichtigung ':'')+(exV('ek_anschrift')||'Objekt')+(neu.rueck?' — Rückmeldung: '+neu.rueck:'')+(neu.notiz?' — '+neu.notiz:'')}]);
    kdSpeichern(kd);
  }
}
function vmWeg(id){ if(!confirm('Diesen Eintrag löschen?')) return; let d=vmDaten(); d.ev=d.ev.filter(e=>e.id!==id); vmSpeichern(d); }
function vmArtWechsel(){ let p=$('vm_n_preis_feld'); if(p) p.style.display=exV('vm_n_art')==='Preisänderung'?'':'none'; }
/* Eigentümer-Bericht */
function vmBericht(teilen){
  compute();
  let d=vmDaten(), start=vmDatum(exV('vm_start')), ab=vmDatum(exV('vm_bericht_ab')), k=vmKennzahlen(d,start,ab), kg=vmKennzahlen(d,start), K=exKontakt(), esc=sEsc;
  let titel=exV('ex_titel')||exTitelVorschlag(), preis=num('vm_preis')||num('ex_preis');
  let r=$('report'); r.className='expose eigentuemer'; r.dataset.pdfname='Vermarktungsbericht '+(exV('ek_anschrift')||titel).replace(/[^\wäöüÄÖÜß -]/g,'').trim()+' '+aufHeute();
  let rueck=Object.keys(kg.rueck).sort((a,b)=>kg.rueck[b]-kg.rueck[a]);
  let n=0, nr={}; const anonym=e=>{ if(!e.wer) return ''; if(!nr[e.wer]) nr[e.wer]=++n; return 'Interessent '+nr[e.wer]; };
  let evAlle=d.ev.slice().sort((a,b)=>(a.d||'').localeCompare(b.d||'')); evAlle.forEach(anonym);
  let evZeit=k.ev.slice().sort((a,b)=>(a.d||'').localeCompare(b.d||''));
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="document.body.classList.remove(\'report-mode\')">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +(K.firma?'<div class="ex-kopf">'+esc(K.firma)+'</div>':'')
    +'<h1>Vermarktungsbericht</h1><p class="ex-sub">'+esc(exV('ek_anschrift')||titel)+' · Stand '+new Date().toLocaleDateString('de-DE')+(ab?' · Zeitraum seit '+new Date(ab+'T00:00:00').toLocaleDateString('de-DE'):'')+'</p>'
    +'<div class="ex-fakten">'+[['Status',exV('vm_status')||'–'],['Angebotspreis',preis>0?eur(preis):'–'],['Am Markt seit',start?new Date(start+'T00:00:00').toLocaleDateString('de-DE')+' ('+kg.tage+' Tage)':'–'],
      ['Anfragen'+(ab?' im Zeitraum':''),k.anfragen+(ab?' (gesamt '+kg.anfragen+')':'')],['Besichtigungen'+(ab?' im Zeitraum':''),k.besicht+(ab?' (gesamt '+kg.besicht+')':'')],['Kaufangebote',kg.angebote]]
      .map(f=>'<div class="ex-fakt"><span>'+f[0]+'</span><b>'+esc(''+f[1])+'</b></div>').join('')+'</div>'
    +(rueck.length?'<h2>Rückmeldungen der Interessenten</h2><table>'+rueck.map(x=>'<tr><td>'+esc(x)+'</td><td>'+kg.rueck[x]+'×</td></tr>').join('')+'</table>':'')
    +'<h2>Aktivitäten'+(ab?' im Zeitraum':'')+'</h2>'+(evZeit.length?'<table><tr><td><b>Datum</b></td><td><b>Art</b></td><td><b>Rückmeldung</b></td></tr>'
      +evZeit.map(e=>'<tr><td>'+(e.d?new Date(e.d+'T00:00:00').toLocaleDateString('de-DE'):'')+'</td><td>'+esc(e.art+(e.preis?' auf '+eur(e.preis):'')+(e.wer?' · '+anonym(e):''))+'</td><td>'+esc(e.rueck||'–')+'</td></tr>').join('')+'</table>'
      :'<div class="ex-text">Im Zeitraum keine Aktivitäten.</div>')
    +'<h2>Unsere Einschätzung</h2><div class="ex-text">'+esc(exV('vm_empfehlung')||vmEmpfehlung(d,start))+'</div>'
    +((K.name||K.tel||K.mail)?'<h2>Ihr Ansprechpartner</h2><div class="ex-kontakt"><div><b>'+esc(K.name||'')+'</b>'+(K.funktion?'<div>'+esc(K.funktion)+'</div>':'')+(K.tel?'<div>Telefon '+esc(K.tel)+'</div>':'')+(K.mail?'<div>'+esc(K.mail)+'</div>':'')+'</div></div>':'')
    +'<p class="ex-hinweis">Interessenten sind aus Datenschutzgründen nicht namentlich genannt.</p>';
  $('vm_letzter').value=aufHeute(); autosave();
  document.body.classList.add('report-mode'); window.scrollTo(0,0);
  if(teilen) pdfTeilen();
}
/* Übersicht über alle Objekte in Vermarktung */
function vmObjekte(){
  let l=[], akt=collect();
  pjLoad().forEach(p=>{ let f=p.data&&p.data.fields||{}; if(f.vm_status) l.push({id:p.id,name:p.name,f:f}); });
  if(akt.vm_status&&!l.some(x=>(x.f.ek_anschrift||'')===(akt.ek_anschrift||''))) l.unshift({id:'',name:(akt.ek_anschrift||'Aktuelle Bewertung')+' (in Bearbeitung)',f:akt});
  return l;
}
function vmUebersicht(){
  let l=vmObjekte(), o=$('vm_overlay'); o.classList.add('on'); document.body.style.overflow='hidden';
  let gruppen=VM_STATUS.filter(Boolean).map(s=>[s,l.filter(x=>x.f.vm_status===s)]).filter(g=>g[1].length);
  $('vm_inhalt').innerHTML='<div class="gr-kopf"><h2 id="vm_titel">Vermarktung</h2><button class="gr-x" onclick="vmSchliessen()" aria-label="Schließen">✕</button></div>'
    +(gruppen.length?gruppen.map(g=>'<h3>'+sEsc(g[0])+' <span class="u">'+g[1].length+'</span></h3><div class="kd-karten">'+g[1].map(x=>{ let d=vmDaten(x.f), k=vmKennzahlen(d,x.f.vm_start), p=zahlLesen(x.f.vm_preis,true)||zahlLesen(x.f.ex_preis,true);
        let alt=x.f.vm_letzter?vmTage(x.f.vm_letzter):null;
        return '<div class="kd-karte"><div><b>'+sEsc(x.name)+'</b><span>'+sEsc([p?eur(p):'',vmDatum(x.f.vm_start)?k.tage+' Tage am Markt':'',k.anfragen+' Anfragen',k.besicht+' Besichtigungen',k.angebote?k.angebote+' Angebote':''].filter(Boolean).join(' · '))
          +(['In Vermarktung','Reserviert'].includes(x.f.vm_status)&&(alt==null||alt>7)?' · <em class="vm-faellig">Eigentümer-Bericht '+(alt==null?'noch nie':'vor '+alt+' Tagen')+'</em>':'')+'</span></div>'
          +(x.id?'<div class="kd-k"><button class="secondary" onclick="vmSchliessen();projektLaden(\''+x.id+'\')">Öffnen</button></div>':'<div class="kd-k"><button class="secondary" onclick="vmSchliessen();document.body.classList.add(\'started\');document.getElementById(\'s-vermarktung\').scrollIntoView()">Öffnen</button></div>')+'</div>'; }).join('')+'</div>').join('')
      :'<div class="kd-leer">Noch kein Objekt mit Vermarktungsstand. Den Stand setzt du im Abschnitt „Vermarktung“ und sicherst die Bewertung als Projekt.</div>');
}
function vmSchliessen(){ $('vm_overlay').classList.remove('on'); document.body.style.overflow=''; }
function vmStartRender(){
  let el=$('start_vm'); if(!el) return;
  let l=vmObjekte().filter(x=>['In Vermarktung','Reserviert','Notartermin'].includes(x.f.vm_status));
  if(!l.length){ el.hidden=true; return; }
  let faellig=l.filter(x=>['In Vermarktung','Reserviert'].includes(x.f.vm_status)&&(!x.f.vm_letzter||vmTage(x.f.vm_letzter)>7)).length;
  el.querySelector('span:last-child').textContent=l.length+' Objekt'+(l.length===1?'':'e')+' in Vermarktung'+(faellig?' · '+faellig+' Eigentümer-Bericht'+(faellig===1?'':'e')+' fällig':'');
  el.hidden=false;
}
