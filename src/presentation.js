/* ---------- Verkäufer-Präsentation für das Akquisegespräch --------------------------------------------
   Folien aus Bewertung, Exposé-Angaben und dem eigenen Marktüberblick. Zahlen aus dem Marktüberblick
   erscheinen nur ab MDB_MIN_N Fällen; darunter sagt die Folie das offen, statt dünne Zahlen zu zeigen.
   Vergleichsobjekte ohne Hausnummer (Datenschutz der früheren Verkäufer). Anzeige im Vollbild
   (#vp_overlay) oder als Querformat-Seiten in #report für Drucken, PDF und Teilen. */
const VP_FOLIEN=[['titel','Titel'],['wert','Was ist Ihr Haus wert?'],['markt','Der Markt vor Ort'],['vergleich','Vergleichbare Verkäufe'],
  ['strategie','Angebot ist nicht Verkauf'],['kaeufer','Vorgemerkte Käufer'],['plan','Vermarktungsplan'],['vorteile','Ihre Vorteile'],['kontakt','Kontakt']];
const VP_PLAN='Woche 1–2: Unterlagen zusammenstellen, Fotos, Grundrisse und Exposé\nWoche 2–3: Vorvermarktung an vorgemerkte Interessenten mit geprüfter Finanzierung\nWoche 3–6: Veröffentlichung, Besichtigungen, wöchentlicher Bericht an Sie\nDanach: Verhandlung, Finanzierungsbestätigung des Käufers, Notartermin, Übergabe';
const VP_VORTEILE='Käufer mit geprüfter Finanzierung — Beratung und Finanzierung aus einer Hand\nRegionale Kartei vorgemerkter Kaufinteressenten\nPreisermittlung nach den anerkannten Verfahren der ImmoWertV\nWöchentlicher Bericht über Anfragen, Besichtigungen und Rückmeldungen\nBegleitung bis zum Notartermin und zur Übergabe';
const VP_ART={efh:['Einfamilienhaus','Zweifamilienhaus'],rh:['Doppelhaushälfte','Reihenhaus'],mfh:['Mehrfamilienhaus'],wgh:['Wohn-/Geschäftshaus'],etw:['Eigentumswohnung'],gewerbe:['Gewerbeobjekt']};
var VP_DATEN=null, VP_INDEX=0;
function vpAus(){ try{ let a=JSON.parse(exV('vp_folien')||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function vpFolienRender(){
  let box=$('vp_folienwahl'); if(!box) return; let aus=vpAus();
  box.innerHTML=VP_FOLIEN.map(f=>'<label class="chk"><input type="checkbox" data-f="'+f[0]+'"'+(aus.includes(f[0])?'':' checked')+' onchange="vpFolieSchalten(this)"> '+f[1]+'</label>').join('');
}
function vpFolieSchalten(cb){ let a=vpAus().filter(x=>x!==cb.dataset.f); if(!cb.checked) a.push(cb.dataset.f); $('vp_folien').value=a.length?JSON.stringify(a):''; autosave(); }
function vpObjektwort(){ let k=pqKategorie(); return k==='etw'?'Ihre Wohnung':k==='mfh'||k==='wgh'||k==='gewerbe'?'Ihre Immobilie':'Ihr Haus'; }
function vpRund(v,s){ return Math.round(v/s)*s; }
/* Marktzahlen aus dem eigenen Marktüberblick */
async function vpMarkt(){
  let alle=[]; try{ alle=(typeof MDB_INIT!=='undefined'&&MDB_INIT)?MDBALL:await mdbAll(); }catch(e){ alle=[]; }
  let arten=VP_ART[pqKategorie()]||[], ort=exOrt(), wf=num('ek_wohnflaeche'), bj=num('ek_baujahr');
  let passend=alle.filter(o=>arten.includes(o.art));
  let kp=passend.filter(o=>mdbDeriv(o).basis==='KP'&&mdbDeriv(o).eurm2>0);
  let imOrt=kp.filter(o=>ort&&(o.gemeinde||'').trim().toLowerCase()===ort.toLowerCase());
  let basis=imOrt.length>=MDB_MIN_N?imOrt:kp, gebiet=imOrt.length>=MDB_MIN_N?ort:'der Region';
  let heute=new Date(), vor12=new Date(heute-365.25*864e5).toISOString().slice(0,10), vor24=new Date(heute-2*365.25*864e5).toISOString().slice(0,10);
  let j1=basis.filter(o=>(o.kp_datum||o.datum||'')>=vor12), j0=basis.filter(o=>{ let d=o.kp_datum||o.datum||''; return d>=vor24&&d<vor12; });
  let med=l=>l.length?mdbMedian(l.map(o=>mdbDeriv(o).eurm2)):0;
  // €/m² je Quartal, letzte 8 Quartale
  let quartale=[]; for(let i=7;i>=0;i--){ let d=new Date(heute.getFullYear(),heute.getMonth()-3*i,1), q=d.getFullYear()+' Q'+(Math.floor(d.getMonth()/3)+1); if(!quartale.includes(q)) quartale.push(q); }
  let proQ=quartale.map(q=>{ let l=basis.filter(o=>{ let d=o.kp_datum||o.datum; if(!d) return false; let x=new Date(d); return x.getFullYear()+' Q'+(Math.floor(x.getMonth()/3)+1)===q; }); return {q:q,n:l.length,wert:med(l)}; });
  // Vergleichsobjekte: Kaufpreise, ähnliche Fläche, jüngere zuerst, Ort bevorzugt
  let vgl=kp.filter(o=>!(wf>0)||Math.abs(mdbDeriv(o).wf-wf)/wf<=0.35)
    .map(o=>({o:o,d:mdbDeriv(o),s:(ort&&(o.gemeinde||'').trim().toLowerCase()===ort.toLowerCase()?100:0)-(bj&&mdbNum(o.baujahr)?Math.abs(mdbNum(o.baujahr)-bj)/2:10)+((o.kp_datum||'')>=vor24?20:0)}))
    .sort((a,b)=>b.s-a.s).slice(0,6);
  // Angebot → Kaufpreis, Vermarktungsdauer mit/ohne Reduzierung (alle eigenen Fälle)
  let ab=[]; alle.forEach(o=>{ let k=mdbNum(o.kaufpreis), a=mdbNum(o.preis); if(k>0&&a>0) ab.push((k-a)/a*100); });
  let verkauft=alle.filter(o=>mdbNum(o.kaufpreis)>0&&o.kp_datum&&o.datum).map(o=>mdbDeriv(o)).filter(d=>d.dauer>0);
  let mitRed=verkauft.filter(d=>d.reduziert).map(d=>d.dauer), ohneRed=verkauft.filter(d=>!d.reduziert).map(d=>d.dauer);
  return {n:basis.length,gebiet:gebiet,j1:{n:j1.length,wert:med(j1)},j0:{n:j0.length,wert:med(j0)},proQ:proQ,vgl:vgl,
    abschlag:{n:ab.length,pct:ab.length?mdbMedian(ab):null},dauer:{mit:{n:mitRed.length,t:mdbMedian(mitRed)},ohne:{n:ohneRed.length,t:mdbMedian(ohneRed)}}};
}
function vpSvgBalken(werte,breite,hoehe){
  let max=Math.max(...werte.map(w=>w.wert||0),1), n=werte.length, bw=breite/n*0.62, s='';
  werte.forEach((w,i)=>{ let h=w.wert>0?Math.max(4,w.wert/max*(hoehe-44)):0, x=i*breite/n+(breite/n-bw)/2, y=hoehe-24-h;
    s+=(w.wert>0?'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="6" fill="#1D5BC4" opacity="'+(i===n-1?1:0.55)+'"/>'
      +'<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y-6).toFixed(1)+'" font-size="12" text-anchor="middle" fill="#0F1E36">'+Math.round(w.wert).toLocaleString('de-DE')+'</text>':'')
      +'<text x="'+(x+bw/2).toFixed(1)+'" y="'+(hoehe-6)+'" font-size="11" text-anchor="middle" fill="#5E6F88">'+w.q.replace(/^20/,'')+'</text>'; });
  return '<svg viewBox="0 0 '+breite+' '+hoehe+'" class="vp-chart" role="img" aria-label="Kaufpreise je Quadratmeter nach Quartal">'+s+'</svg>';
}
function vpMonate(t){ return t>0?(t/30.44).toLocaleString('de-DE',{maximumFractionDigits:1})+' Monate':'–'; }
/* Folien als HTML */
function vpFolien(M){
  const e=sEsc, R=window._R||{}, K=exKontakt(), aus=vpAus(), ort=exOrt(), w=modus()==='wohnung';
  let emp=R.empfehlung||0, vh=R.vh||0.05, von=vpRund(emp*(1-vh),1000), bis=vpRund(emp*(1+vh),1000);
  let angebot=num('vp_angebot')||vpRund(emp*(1+vh),5000);
  let fotoIds=exFotoIds(), titel=PHOTOS.find(p=>p.id===exTitelbild(fotoIds))||PHOTOS.find(p=>p.cat==='objekt');
  let T=exV('vp_titel')||(vpObjektwort()+(ort?' in '+ort:'')), f=[];
  const fuss='<div class="vp-fuss">'+e([K.firma,K.name].filter(Boolean).join(' · '))+'</div>';
  const add=(k,h)=>{ if(!aus.includes(k)) f.push({k:k,html:'<section class="vp-folie vp-'+k+'">'+h+fuss+'</section>'}); };
  add('titel',(titel&&bildUrl(titel.data)?'<div class="vp-bild" style="background-image:url('+bildUrl(titel.data)+')"></div>':'')
    +'<div class="vp-titeltext"><p class="vp-kicker">Marktwert und Vermarktung</p><h1>'+e(T)+'</h1>'
    +(exV('vp_fuer')?'<p class="vp-sub">'+e(exV('vp_fuer'))+'</p>':'')+'<p class="vp-sub">'+new Date().toLocaleDateString('de-DE',{month:'long',year:'numeric'})+'</p></div>');
  let fakten=[['Wohnfläche',num('ek_wohnflaeche')>0?exZahl(exV('ek_wohnflaeche'))+' m²':''],[w?'Etage':'Grundstück',w?exV('ek_etage'):(num('ek_gs_flaeche')>0?exZahl(exV('ek_gs_flaeche'))+' m²':'')],
    ['Baujahr',num('ek_baujahr')>0?exV('ek_baujahr'):''],['Effizienzklasse',exEnergie().klasse]].filter(x=>x[1]);
  let verfahren=[[w?'Vergleichswert':'Sachwert',R.substanz],['Ertragswert',R.ertrag]].concat(!w&&R.vwAktiv?[['Vergleichswert',R.vergleichWert]]:[]).filter(v=>v[1]>0);
  add('wert','<p class="vp-kicker">Was ist '+e(vpObjektwort())+' wert?</p>'
    +'<div class="vp-gross">'+eur(von)+' – '+eur(bis)+'</div><p class="vp-sub">erwarteter Verkaufspreis · Preisansatz '+eur(vpRund(emp,1000))+'</p>'
    +(fakten.length?'<div class="vp-chips">'+fakten.map(x=>'<span><small>'+x[0]+'</small>'+e(x[1])+'</span>').join('')+'</div>':'')
    +(M&&M.n>=MDB_MIN_N&&M.j1.wert>0&&num('ek_wohnflaeche')>0?'<div class="vp-kennzahlen"><div><b>'+Math.round(emp/num('ek_wohnflaeche')).toLocaleString('de-DE')+' €/m²</b><span>Ihr Preisansatz je Quadratmeter Wohnfläche</span></div>'
      +'<div><b>'+Math.round(M.j1.wert).toLocaleString('de-DE')+' €/m²</b><span>mittlerer Kaufpreis in '+e(M.gebiet)+' in den letzten 12 Monaten ('+M.j1.n+' Verkäufe)</span></div></div>':'')
    +'<p class="vp-klein">Grundlage: '+e(verfahren.map(v=>v[0]).join(', '))+' nach den Verfahren der ImmoWertV'+(M&&M.n?', abgeglichen mit '+M.n+' eigenen Verkäufen':'')+'. Rechnerische Preisermittlung, kein Verkehrswertgutachten.</p>');
  if(M){
    let genug=M.n>=MDB_MIN_N, trend=M.j1.n&&M.j0.n&&M.j0.wert?(M.j1.wert-M.j0.wert)/M.j0.wert*100:null;
    add('markt','<p class="vp-kicker">Der Markt in '+e(M.gebiet)+'</p>'
      +(genug?'<div class="vp-kennzahlen"><div><b>'+(M.j1.wert?Math.round(M.j1.wert).toLocaleString('de-DE')+' €/m²':'–')+'</b><span>mittlerer Kaufpreis der letzten 12 Monate ('+M.j1.n+' Verkäufe)</span></div>'
        +(trend!=null?'<div><b>'+(trend>0?'+':'')+num2(trend)+' %</b><span>gegenüber den 12 Monaten davor ('+M.j0.n+' Verkäufe)</span></div>':'')
        +'<div><b>'+M.n+'</b><span>ausgewertete eigene Kaufpreise</span></div></div>'+vpSvgBalken(M.proQ,760,230)
        :'<p class="vp-leer">Für belastbare Marktzahlen braucht es mindestens '+MDB_MIN_N+' eigene Kaufpreise dieser Objektart — bisher '+M.n+'. Die Auswertung füllt sich mit jedem Eintrag im Marktüberblick.</p>'));
    add('vergleich','<p class="vp-kicker">Vergleichbare Verkäufe</p>'
      +(M.vgl.length?'<table class="vp-tab"><tr><th>Lage</th><th>Objekt</th><th>Baujahr</th><th>Wohnfläche</th><th>Kaufpreis je m²</th><th>Verkauft</th></tr>'
        +M.vgl.map(v=>'<tr><td>'+e([v.o.gemeinde,v.o.ortsteil].filter(Boolean).join(', ')||'–')+'</td><td>'+e(v.o.art||'')+'</td><td>'+e(v.o.baujahr||'–')+'</td><td>'+(v.d.wf?Math.round(v.d.wf)+' m²':'–')+'</td>'
          +'<td><b>'+Math.round(v.d.eurm2).toLocaleString('de-DE')+' €</b></td><td>'+(v.o.kp_datum?new Date(v.o.kp_datum).toLocaleDateString('de-DE',{month:'short',year:'numeric'}):'–')+'</td></tr>').join('')+'</table>'
        +'<p class="vp-klein">Aus der eigenen Kaufpreissammlung, ohne Hausnummern.</p>'
        :'<p class="vp-leer">Im Marktüberblick sind noch keine passenden Kaufpreise erfasst.</p>'));
    let ab=M.abschlag, d=M.dauer;
    add('strategie','<p class="vp-kicker">Angebot ist nicht Verkauf</p><div class="vp-kennzahlen">'
      +(ab.n>=MDB_MIN_N?'<div><b>'+(ab.pct>0?'+':'')+num2(ab.pct)+' %</b><span>Kaufpreis gegenüber dem letzten Angebotspreis (Median aus '+ab.n+' eigenen Verkäufen)</span></div>':'')
      +(d.mit.n>=3&&d.ohne.n>=3?'<div><b>'+vpMonate(d.ohne.t)+'</b><span>Vermarktung ohne Preisreduzierung</span></div><div><b>'+vpMonate(d.mit.t)+'</b><span>mit Preisreduzierung</span></div>':'')
      +'</div><div class="vp-empf"><span>Unsere Empfehlung</span><b>Angebotspreis '+eur(angebot)+'</b><small>erwarteter Verkaufspreis '+eur(von)+' – '+eur(bis)+'</small></div>'
      +'<p class="vp-sub">Ein realistischer Startpreis verkauft schneller und am Ende oft besser: Objekte, die zu teuer starten, bleiben liegen und werden später mit Abschlag verkauft.</p>'
      +(ab.n<MDB_MIN_N?'<p class="vp-klein">Eigene Auswertungen zu Abschlag und Vermarktungsdauer erscheinen ab '+MDB_MIN_N+' erfassten Verkäufen.</p>':''));
  }
  let kt=(typeof kkTreffer==='function'&&IA_DB_BEREIT)?kkTreffer(kkAktuellesObjekt()):[];
  if(kt.length){ let fin=kt.filter(x=>['geprueft','bar'].includes(x.k.suchprofil.finanzierung)).length, genau=kt.filter(x=>x.t.stufe==='passt').length;
    add('kaeufer','<p class="vp-kicker">Vorgemerkte Kaufinteressenten</p><div class="vp-gross">'+kt.length+'</div>'
      +'<p class="vp-sub">Interessent'+(kt.length===1?'':'en')+' aus unserer Kartei '+(kt.length===1?'sucht':'suchen')+' eine Immobilie wie '+e(vpObjektwort().replace(/^Ihr(e)? /,'Ihr$1 '))+' — '
      +genau+' '+(genau===1?'passt':'passen')+' in allen Punkten, '+fin+' mit geprüfter Finanzierung oder ohne Finanzierungsbedarf.</p>'
      +'<p class="vp-klein">Wir können '+e(vpObjektwort())+' diesen Interessenten vor der Veröffentlichung anbieten. Namen nennen wir nur mit deren Einwilligung.</p>'); }
  let plan=(exV('vp_plan')||VP_PLAN).split('\n').filter(x=>x.trim());
  add('plan','<p class="vp-kicker">So vermarkten wir '+e(vpObjektwort())+'</p><ol class="vp-plan">'
    +plan.map(z=>{ let m=z.match(/^([^:]{1,30}):\s*(.*)$/); return '<li>'+(m?'<b>'+e(m[1])+'</b><span>'+e(m[2])+'</span>':'<span>'+e(z)+'</span>')+'</li>'; }).join('')+'</ol>');
  let vt=(exV('vp_vorteile')||VP_VORTEILE).split('\n').map(x=>x.replace(/^[•\-–]\s*/,'').trim()).filter(Boolean);
  add('vorteile','<p class="vp-kicker">Ihre Vorteile'+(K.firma?' mit '+e(K.firma):'')+'</p><ul class="vp-liste">'+vt.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>');
  let ini=(K.name||'').split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  add('kontakt','<p class="vp-kicker">Sprechen wir über '+e(vpObjektwort())+'</p>'
    +'<div class="vp-kontakt">'+(ini?'<div class="ini">'+e(ini)+'</div>':'')+'<div>'+(K.name?'<b>'+e(K.name)+'</b>':'')+(K.funktion?'<div>'+e(K.funktion)+'</div>':'')
    +(K.firma?'<div>'+e(K.firma)+'</div>':'')+(K.tel?'<div>Telefon '+e(K.tel)+'</div>':'')+(K.mail?'<div>'+e(K.mail)+'</div>':'')+'</div></div>');
  return f;
}
async function vpStarten(){
  compute(); iaHinweis('Präsentation wird vorbereitet …');
  let M=null; try{ M=await vpMarkt(); }catch(e){}
  iaHinweis('');
  VP_DATEN=vpFolien(M); VP_INDEX=0;
  if(!VP_DATEN.length){ alert('Alle Folien sind abgewählt.'); return; }
  $('vp_folien_box').innerHTML=VP_DATEN.map((x,i)=>'<div class="vp-slot'+(i===0?' on':'')+'">'+x.html+'</div>').join('');
  $('vp_punkte').innerHTML=VP_DATEN.map((x,i)=>'<button aria-label="Folie '+(i+1)+'" onclick="vpGehe('+i+')"'+(i===0?' class="on"':'')+'></button>').join('');
  $('vp_overlay').classList.add('on'); document.body.style.overflow='hidden'; vpGehe(0);
  try{ if($('vp_overlay').requestFullscreen) $('vp_overlay').requestFullscreen().catch(()=>{}); }catch(e){}
}
function vpGehe(i){
  if(!VP_DATEN) return; VP_INDEX=Math.max(0,Math.min(VP_DATEN.length-1,i));
  document.querySelectorAll('#vp_folien_box .vp-slot').forEach((s,j)=>s.classList.toggle('on',j===VP_INDEX));
  document.querySelectorAll('#vp_punkte button').forEach((b,j)=>b.classList.toggle('on',j===VP_INDEX));
  setT('vp_zaehler',(VP_INDEX+1)+' / '+VP_DATEN.length);
}
function vpSchliessen(){ $('vp_overlay').classList.remove('on'); document.body.style.overflow=''; try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){} }
/* Querformat-Seiten in #report — für Drucken, PDF und Teilen */
async function vpAlsDokument(teilen){
  compute(); let M=null; try{ M=await vpMarkt(); }catch(e){}
  let F=vpFolien(M), r=$('report'); if(!F.length){ alert('Alle Folien sind abgewählt.'); return; }
  r.className='praesentation'; r.dataset.pdfname='Präsentation '+((exV('vp_titel')||vpObjektwort()+' '+exOrt()).replace(/[^\wäöüÄÖÜß -]/g,'').trim()); r.dataset.quer='1';
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="document.body.classList.remove(\'report-mode\')">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="pdfTeilen()">Teilen</button></div>'+F.map(x=>x.html).join('');
  document.body.classList.add('report-mode'); window.scrollTo(0,0);
  if(teilen) await pdfTeilen();
}
document.addEventListener('keydown',e=>{ let o=$('vp_overlay'); if(!o||!o.classList.contains('on')) return;
  if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){ e.preventDefault(); vpGehe(VP_INDEX+1); }
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); vpGehe(VP_INDEX-1); }
  else if(e.key==='Escape') vpSchliessen(); });
(function(){ let x0=null; document.addEventListener('touchstart',e=>{ if($('vp_overlay')&&$('vp_overlay').classList.contains('on')) x0=e.touches[0].clientX; },{passive:true});
  document.addEventListener('touchend',e=>{ if(x0==null) return; let dx=e.changedTouches[0].clientX-x0; x0=null; if(Math.abs(dx)>50) vpGehe(VP_INDEX+(dx<0?1:-1)); },{passive:true}); })();

function vpStatus(){
  if(!$('vp_titel')) return;
  let R=window._R||{}, ort=exOrt();
  $('vp_titel').placeholder=vpObjektwort()+(ort?' in '+ort:'');
  $('vp_angebot').placeholder=R.empfehlung>0?'Vorschlag '+eur(vpRund(R.empfehlung*(1+(R.vh||0.05)),5000)):'';
  $('vp_plan').placeholder=VP_PLAN; $('vp_vorteile').placeholder=VP_VORTEILE;
}
