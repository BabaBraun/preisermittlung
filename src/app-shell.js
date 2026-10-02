/* App-Navigation. In einer Bewertung stehen alle Abschnitte untereinander (Eckdaten, Aufnahmebogen, Objektdaten, Allgemeine Angaben … Vermarktung);
   jeder Abschnitt und jeder Block darin lässt sich auf- und zuklappen (Zustand je Gerät gemerkt). Links die
   Abschnittsliste mit Status (am Handy als Leiste oben), rechts das Ergebnis. Die Formularfelder bleiben unverändert. */
const APP_GROUPS=[
 {id:'objekt',label:'Objekt',icon:'home',hint:'Grundlagen und Beschreibung',sections:['s-eck','s-technik','s-allg']},
 {id:'besichtigung',label:'Besichtigung',icon:'camera',hint:'Aufnahme, Flächen und Fotos',sections:['s-aufnahme','s-hg','s-anbau','s-fotos']},
 {id:'bewertung',label:'Bewertung',icon:'calc',hint:'Verfahren und Marktparameter',sections:['s-grundlagen','s-substanz','s-vergleich','s-ertrag','s-niess','s-erbbau','s-wk','s-pv','s-energie','s-sanierung']},
 {id:'ergebnis',label:'Ergebnis',icon:'file-text',hint:'Preis, Dokumente und Vermarktung',sections:['s-empfehlung','s-belwert','s-rendite','s-sign','s-expose','s-praesentation','s-vermarktung']}
];
const APP_LABELS={'s-eck':'Objektangaben','s-allg':'Allgemeine Angaben','s-technik':'Beschreibung & Recht','s-aufnahme':'Aufnahmebogen','s-hg':'Hauptgebäude','s-anbau':'Anbau & Nebengebäude','s-fotos':'Fotos & Grundrisse','s-grundlagen':'Marktparameter','s-substanz':'Sachwert','s-vergleich':'Vergleichswert','s-ertrag':'Ertragswert','s-niess':'Wohnrecht & Nießbrauch','s-erbbau':'Erbbaurecht','s-wk':'Wertkorrekturen','s-pv':'Photovoltaik','s-energie':'Energetischer Zustand','s-sanierung':'Sanierungsweg','s-empfehlung':'Preisempfehlung','s-belwert':'Beleihungswert','s-rendite':'Rendite & Investition','s-sign':'Bericht vorbereiten','s-expose':'Exposé','s-praesentation':'Präsentation','s-vermarktung':'Vermarktung'};
const APP_STATE={ready:false,tab:'home',section:'overview',group:'objekt',ignore:false};
const appButton=(label,icon,action,hint='')=>`<button type="button" class="app-action" aria-label="${sEsc(label)}" onclick="${action}"><span class="app-action-icon">${iaSvg(icon)}</span><span><strong>${sEsc(label)}</strong>${hint?'<small>'+sEsc(hint)+'</small>':''}</span>${iaSvg('chevron-right')}</button>`;
function appRouteSave(route,replace=false){
 const hash=route.tab==='object'?(route.section==='overview'?'#objekt':route.section.startsWith('group:')?'#'+route.section:'#'+route.section):'#'+route.tab;
 if(location.hash===hash&&!replace)return;
 (replace?history.replaceState:history.pushState).call(history,{immoRoute:route},'',hash);
}
function appRenderTabs(){
 document.querySelectorAll('#mbar [data-app-tab]').forEach(b=>{const on=b.dataset.appTab===APP_STATE.tab||(APP_STATE.tab==='object'&&b.dataset.appTab==='objects');b.setAttribute('aria-current',on?'page':'false');});
 const obj=APP_STATE.tab==='object';$('app_steps').hidden=!obj;
 document.querySelectorAll('#app_steps [data-app-group]').forEach(b=>b.setAttribute('aria-pressed',String(obj&&b.dataset.appGroup===APP_STATE.group)));
 $('app_exports').hidden=!obj;
 $('app_back').hidden=APP_STATE.tab==='home'&&$('start-step0').style.display!=='none';
 setT('app_header_title',obj?($('ek_anschrift').value.trim()||'Neue Bewertung'):({home:'ImmoApp',objects:'Deine Objekte',market:'Marktüberblick',more:'Mehr'}[APP_STATE.tab]||'ImmoApp'));
 setT('app_header_subtitle',obj?'Bewertung auf diesem Gerät':({home:'Dein Immobilienbüro',objects:'Bewertungen und Projekte',market:'Deine Vergleichsdaten',more:'Werkzeuge & Einstellungen'}[APP_STATE.tab]||''));
}
function appCloseRootPanels(){if($('mdb_overlay').classList.contains('on'))APP_ORIGINAL.closeMarket();['projekt_overlay','mdb_overlay'].forEach(id=>$(id).classList.remove('on','app-root-panel'));}
function appSetTab(tab,{record=true}={}){
 if(!APP_STATE.ready)return;
 if(tab==='objects'&&APP_STATE.tab==='objects')return;
 if(tab==='market'&&APP_STATE.tab==='market')return;
 appCloseRootPanels();APP_STATE.ignore=true;document.body.classList.remove('report-mode','cp-open');
 APP_STATE.tab=tab;document.body.dataset.appTab=tab;
 $('app_more').hidden=tab!=='more';
 if(tab==='home'){document.body.classList.remove('started');APP_ORIGINAL.showStart();}
 if(tab==='objects'){$('projekt_overlay').classList.add('app-root-panel');APP_ORIGINAL.projects();}
 if(tab==='market'){$('mdb_overlay').classList.add('app-root-panel');APP_MARKET_PROMISE=APP_ORIGINAL.market();}
 APP_STATE.ignore=false;appRenderTabs();
 appRefresh();if(record)appRouteSave({tab});window.scrollTo({top:0,behavior:'instant'});
}
function appSections(group){return group.sections.map(id=>$(id)).filter(el=>el&&navSichtbar(el));}
function appRenderObjectMenu(){
 const view=$('app_object_overview');
 const group=APP_GROUPS.find(g=>g.id===APP_STATE.group)||APP_GROUPS[0];
 const isGroup=APP_STATE.section.startsWith('group:');
 $('app_object_summary').hidden=isGroup;
 setT('app_object_heading',isGroup?group.label:'Dein Objekt');setT('app_object_hint',isGroup?group.hint:'Alles zu dieser Immobilie an einem Ort.');
 const list=$('app_object_actions');list.replaceChildren();
 if(isGroup){
  for(const el of appSections(group)){
   const optional=NAV_TOGGLE[el.id],inactive=optional&&!$(optional)?.checked;
   const row=document.createElement('div');row.innerHTML=appButton(APP_LABELS[el.id]||navLabel(el),group.icon,`appShowSection('${el.id}')`,inactive?'Optional · bei Bedarf ergänzen':'Öffnen und bearbeiten');list.append(row.firstElementChild);
  }
 }else{
  for(const g of APP_GROUPS){const row=document.createElement('div');row.innerHTML=appButton(g.id==='objekt'?'Objektangaben':g.label,g.icon,g.id==='objekt'?"appShowSection('s-eck')":`appShowGroup('${g.id}')`,g.hint);list.append(row.firstElementChild);}
 }
 iconify(view);
}
function appOpenObject(section='overview',{record=true}={}){
 if(!APP_STATE.ready)return;
 APP_STATE.ignore=true;appCloseRootPanels();document.body.classList.add('started');document.body.classList.remove('report-mode','cp-open');APP_STATE.ignore=false;
 APP_STATE.tab='object';document.body.dataset.appTab='object';$('app_more').hidden=true;
 if(section.startsWith('group:')){ const g=APP_GROUPS.find(x=>x.id===section.slice(6)); section=g&&appSections(g)[0]?appSections(g)[0].id:'overview'; }
 let el=section!=='overview'?$(section):null;
 if(section!=='overview'&&(!el||!navSichtbar(el))){ section='overview'; el=null; }
 APP_STATE.section=section;
 if(el) APP_STATE.group=(APP_GROUPS.find(g=>g.sections.includes(section))||APP_GROUPS[0]).id;
 $('app_object_overview').hidden=false;
 appRenderTabs();appRenderSideNav();appRefresh();
 if(record)appRouteSave({tab:'object',section});
 if(el){ appAbschnittOeffnen(el,true); requestAnimationFrame(()=>el.scrollIntoView({block:'start'})); }
 else window.scrollTo({top:0,behavior:'instant'});
}
function appShowSection(id,options){appOpenObject(id,options);}
function appShowGroup(id){appOpenObject('group:'+id);}
function appRenderSideNav(){
 const nav=$('nav');if(!nav)return;nav.replaceChildren();
 const gesetzt={};
 NAV_GROUPS.forEach(([titel,ids])=>{
  const items=ids.map(id=>$(id)).filter(x=>x&&navSichtbar(x));if(!items.length)return;
  const h=document.createElement('div');h.className='nav-group';h.textContent=titel;nav.append(h);
  items.forEach(x=>{nav.append(navLink(x));gesetzt[x.id]=1;});
 });
 document.querySelectorAll('main>section.card[data-nav]').forEach(x=>{if(!gesetzt[x.id]&&navSichtbar(x))nav.append(navLink(x));});
 appNummerieren();navStatus();appNavAktuell();
}
/* Abschnitt, der gerade oben im Bild ist, in der Liste markieren */
function appNavAktuell(){
 if(APP_STATE.tab!=='object')return;
 const oben=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header-height'))||72)+80;
 let akt=null;document.querySelectorAll('main>section.card').forEach(x=>{if(x.offsetParent&&x.getBoundingClientRect().top<=oben)akt=x.id;});
 if(!akt){const erste=[...document.querySelectorAll('main>section.card')].find(x=>x.offsetParent);akt=erste&&erste.id;}
 document.querySelectorAll('nav.side a[data-sec]').forEach(a=>{const on=a.dataset.sec===akt;if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
  if(on&&window.innerWidth<1100){const n=a.parentElement;if(n.scrollWidth>n.clientWidth){const l=a.offsetLeft-n.clientWidth/2+a.offsetWidth/2;if(Math.abs(n.scrollLeft-l)>40)n.scrollLeft=l;}}});
}
/* ---------- Auf- und Zuklappen ---------- */
const APP_ZU_KEY='ia_zugeklappt';
function appZuLesen(){ try{ const a=JSON.parse(localStorage.getItem(APP_ZU_KEY)||'[]'); return new Set(Array.isArray(a)?a:[]); }catch(e){ return new Set(); } }
function appZuMerken(key,zu){ const m=appZuLesen(); if(zu)m.add(key);else m.delete(key); try{ localStorage.setItem(APP_ZU_KEY,JSON.stringify([...m])); }catch(e){} }
function appAbschnittOeffnen(sec,offen){
 if(!sec)return; sec.classList.toggle('app-zu',!offen);
 const b=sec.querySelector(':scope>h2 .app-sec-toggle');if(b){b.setAttribute('aria-expanded',String(!!offen));b.setAttribute('aria-label',(offen?'Abschnitt zuklappen: ':'Abschnitt aufklappen: ')+navLabel(sec));}
 appZuMerken('s:'+sec.id,!offen);
}
function appAbschnittUmschalten(sec){ appAbschnittOeffnen(sec,sec.classList.contains('app-zu')); appNummerieren(); }
function appAlleKlappen(offen){
 document.querySelectorAll('main>section.card').forEach(sec=>appAbschnittOeffnen(sec,offen));
 document.querySelectorAll('main>section.card details.app-disclosure').forEach(d=>{d.open=offen;});
 appNummerieren();
}
function appKopfVorbereiten(sec){
 const h=sec.querySelector(':scope>h2');if(!h)return null;
 let step=h.querySelector(':scope>.step');if(!step){step=document.createElement('span');step.className='step';h.prepend(step);}
 let titel=h.querySelector(':scope>.app-sec-titel');
 if(!titel){titel=document.createElement('span');titel.className='app-sec-titel';
  const t=[...h.childNodes].filter(n=>n!==step&&!(n.nodeType===1&&n.classList.contains('app-sec-toggle'))).map(n=>n.textContent).join('');
  [...h.childNodes].forEach(n=>{if(n!==step&&!(n.nodeType===1&&n.classList.contains('app-sec-toggle')))n.remove();});
  titel.textContent=t.replace(/^\s*[\u2460-\u2473]\s?[a-z]?\s*/,'').trim();step.after(titel);}
 return h;
}
/* Nummern fortlaufend in der angezeigten Reihenfolge (Haus oder Wohnung): Abschnitte 1, 2, 3 …, Blöcke 5.1, 5.2 … */
function appSichtbarIn(el,sec){
 for(let p=el;p&&p!==sec;p=p.parentElement){
  if(p.hidden)return false;
  // nur wegen Zuklappen verborgen — aber Blöcke nur für Haus bzw. Wohnung zählen in der anderen Objektart nicht mit
  if(p.parentElement===sec&&sec.classList.contains('app-zu')){if(p.style.display==='none'||p.classList.contains(modus()==='wohnung'?'haus-only':'wohnung-only'))return false;continue;}
  if(getComputedStyle(p).display==='none')return false;
 }
 return true;
}
function appNummerieren(){
 let n=0;
 document.querySelectorAll('main>section.card').forEach(sec=>{
  const h=sec.querySelector(':scope>h2');if(!h)return;
  if(!navSichtbar(sec)||sec.hidden){delete sec.dataset.nr;return;}
  n++;sec.dataset.nr=n;const step=h.querySelector(':scope>.step');if(step&&step.textContent!==String(n))step.textContent=n;
  let i=0;
  sec.querySelectorAll('details.app-disclosure').forEach(d=>{
   const s=d.querySelector(':scope>summary');if(!s||!s.dataset.titel)return;
   const t=appSichtbarIn(d,sec)?n+'.'+(++i)+' '+s.dataset.titel:s.dataset.titel;
   if(s.textContent!==t)s.textContent=t;
  });
 });
 document.querySelectorAll('nav.side a[data-sec]').forEach(a=>{const sec=$(a.dataset.sec),sp=a.querySelector('span');if(sec&&sp){const t=(sec.dataset.nr?sec.dataset.nr+' ':'')+navLabel(sec);if(sp.textContent!==t)sp.textContent=t;}});
}
function appAbschnitteKlappbar(){
 const zu=appZuLesen();
 document.querySelectorAll('main>section.card').forEach(sec=>{
  const h=appKopfVorbereiten(sec);if(!h||h.querySelector('.app-sec-toggle'))return;
  const b=document.createElement('button');b.type='button';b.className='app-sec-toggle no-print';b.innerHTML=iaSvg('chevron-down');b.setAttribute('aria-controls',sec.id);
  b.addEventListener('click',e=>{e.stopPropagation();appAbschnittUmschalten(sec);});
  h.classList.add('app-sec-kopf');h.append(b);appSchalterBauen(sec);
  h.addEventListener('click',e=>{if(e.target.closest('a,input,select,textarea,label'))return;appAbschnittUmschalten(sec);});
  appAbschnittOeffnen(sec,!zu.has('s:'+sec.id));
 });
}
/* ---------- Schalter in der Kopfzeile (D35) ----------
   Jeder Abschnitt, den man weglassen kann, hat oben rechts einen Schalter: aus = fließt nicht in die Bewertung (und,
   wo es um Darstellung geht, nicht in den Bericht). Drei Arten:
   feld: der bisherige Schalter des Abschnitts (z. B. „Anbau vorhanden“) wandert in die Kopfzeile — gleiche Kennung,
         gleiche Rechnung;
   aus:  verstecktes Feld „…_aus“ (neu). Fehlt es in älteren Bewertungen, ist der Abschnitt an;
   gew:  Verfahren in der Gewichtung Substanz (bei der Wohnung: Vergleich) : Ertrag — der Schalter stellt die vorhandene
         Auswahl „Gewichtung“ auf „nur …“ und beim Einschalten zurück; keine neue Formel.
   ausblenden: Exposé, Präsentation, Vermarktung fließen ohnehin nicht in die Bewertung ein — aus = ausgeblendet
         (auf Wunsch des Auftraggebers), die Eingaben bleiben erhalten.
   Ohne Schalter bleiben Abschnitte, ohne die es keine Bewertung gibt (Eckdaten, Allgemeine Angaben, Hauptgebäude,
   Preisempfehlung, Ersteller). */
const APP_SCHALTER={
 's-aufnahme':{aus:'au_aus',text:'Aufnahmebogen verwenden'},   // Bericht: report.js lässt die Feststellungen weg, die Wohnflächenberechnung bleibt (D36)
 's-technik':{aus:'od_aus',text:'Objektdaten und Beschreibung verwenden',bericht:['objektdaten','beschreibung','lagecheck']},
 's-anbau':{feld:'anbau_aktiv'},
 's-grundlagen':{aus:'dg_aus',text:'Datengrundlagen verwenden',bericht:['grundlagen']},
 's-substanz':{gew:'sub',text:'Preisansatz nach der Gebäudesubstanz in die Preisempfehlung'},
 's-vergleich':{feld:'vw_aktiv',wohnung:{gew:'sub',text:'Vergleichswert in die Preisempfehlung'}},
 's-ertrag':{gew:'er',text:'Preisansatz nach dem Gebäudeertrag in die Preisempfehlung'},
 's-niess':{feld:'niess_aktiv'},
 's-erbbau':{feld:'eb_aktiv'},
 's-wk':{aus:'wk_aus',text:'Besondere objektspezifische Merkmale berücksichtigen',bericht:['wk']},
 's-pv':{feld:'pv_aktiv'},
 's-energie':{feld:'en_aktiv'},
 's-sanierung':{feld:'san_aktiv'},
 's-fotos':{aus:'fo_aus',text:'Fotos, Grundrisse und Karten verwenden',bericht:['fotos','karten','grundrisse']},
 's-belwert':{feld:'bw_aktiv'},
 's-rendite':{aus:'re_aus',text:'Rendite und Investitionsrechnung verwenden',bericht:['rendite','investition']},
 's-expose':{aus:'ex_aus',text:'Exposé verwenden',ausblenden:true},
 's-praesentation':{aus:'vp_aus',text:'Verkäufer-Präsentation verwenden',ausblenden:true},
 's-vermarktung':{aus:'vm_aus',text:'Vermarktung verwenden',ausblenden:true}
};
function appSchalterCfg(id){ const c=APP_SCHALTER[id]; if(!c) return null; return (c.wohnung&&modus()==='wohnung')?c.wohnung:c; }
function appGewWert(){ let g=parseFloat(exV('gewichtung')); return g>=0&&g<=1?g:0.5; }
/* an (true), aus (false) oder kein Schalter (null) */
function appSchalterAn(id){
 const c=appSchalterCfg(id); if(!c) return null;
 if(c.feld){ const e=$(c.feld); return e?e.checked:null; }
 if(c.aus){ const e=$(c.aus); return !(e&&e.checked); }
 if(c.gew){ const g=appGewWert(); return c.gew==='sub'?g>0:g<1; }
 return null;
}
/* Berichtsteile ausgeschalteter Abschnitte (für rpFiltern) */
function appSchalterBerichtAus(){ return Object.keys(APP_SCHALTER).filter(id=>APP_SCHALTER[id].bericht&&appSchalterAn(id)===false).flatMap(id=>APP_SCHALTER[id].bericht); }
function appSchalterBauen(sec){
 const c0=APP_SCHALTER[sec.id], h=sec.querySelector(':scope>h2'); if(!c0||!h||h.querySelector('.sec-schalter')) return;
 const vor=h.querySelector('.app-sec-toggle');
 const bau=(c,klasse)=>{
  const lab=document.createElement('label'); lab.className='toggle sec-schalter no-print'+(klasse?' '+klasse:'');
  let cb, text=c.text||'';
  if(c.feld){ cb=$(c.feld); if(!cb) return; const alt=cb.closest('label.toggle');
   if(alt&&!alt.classList.contains('sec-schalter')){ text=alt.textContent.replace(/\s+/g,' ').trim(); alt.remove(); } }
  // „input“ statt „change“: läuft vor dem Abgleich appRefresh (document, ebenfalls „input“), der den Schalter sonst zurückstellt
  else { cb=document.createElement('input'); cb.type='checkbox'; cb.addEventListener('input',()=>appSchalterGesetzt(sec.id,c,cb)); }
  cb.setAttribute('aria-label',text); lab.title=text; lab.append(cb); h.insertBefore(lab,vor);
  const hw=document.createElement('p'); hw.className='sec-aus-hinweis'+(klasse?' '+klasse:'');
  hw.textContent=c.ausblenden?'Ausgeblendet — die Eingaben bleiben erhalten. Zum Bearbeiten den Schalter oben rechts einschalten.'
   :'Ausgeschaltet'+(text?' („'+text+'“)':'')+' — fließt nicht in die Bewertung'+(c.bericht?' und nicht in den Bericht':'')+' ein. Zum Einbeziehen den Schalter oben rechts einschalten.';
  h.after(hw);
 };
 if(c0.wohnung){ bau(c0,'haus-only'); bau(c0.wohnung,'wohnung-only'); } else bau(c0,'');
}
function appSchalterGesetzt(id,c,cb){
 if(c.aus){ const e=$(c.aus); if(e) e.checked=!cb.checked; }
 else if(c.gew){
  const sel=$('gewichtung'), g=appGewWert();
  if(cb.checked){ const v=exV('gew_vorher'); sel.value=[...sel.options].some(o=>o.value===v)&&v!=='0'&&v!=='1'?v:'0.5'; }
  else if((c.gew==='sub'&&g>=1)||(c.gew==='er'&&g<=0)){ cb.checked=true; alert('Mindestens ein Verfahren muss in die Preisempfehlung einfließen.'); return; }
  else { if(g>0&&g<1) $('gew_vorher').value=sel.value; sel.value=c.gew==='sub'?'0':'1'; }
 }
 compute(); autosave(); appSchalterStand();
}
/* Schalter und Abschnitte nach dem Stand der Daten (nach jeder Rechnung, nach dem Laden) */
function appSchalterStand(){
 Object.keys(APP_SCHALTER).forEach(id=>{
  const sec=$(id); if(!sec) return; const an=appSchalterAn(id);
  sec.classList.toggle('sec-aus',an===false);
  sec.querySelectorAll(':scope>h2 .sec-schalter input').forEach(cb=>{ const lab=cb.closest('label');
   if(lab.classList.contains(modus()==='wohnung'?'haus-only':'wohnung-only')) return;
   if(!cb.id&&an!==null&&cb.checked!==an) cb.checked=an; });
 });
}
function appRefresh(){
 if(!APP_STATE.ready)return;
 appSchalterStand();appNummerieren();
 const P=window._PRUEF||{},v=voll();
 setT('app_object_value',P.status==='fehler'?'Eingaben prüfen':P.status==='unvollstaendig'?'Noch nicht vollständig':($('o_empfehlung').textContent||'–'));
 setT('app_object_status',P.status==='ok'?'Rechnerische Preisempfehlung':'Angaben vervollständigen, bevor du das Ergebnis verwendest.');
 setT('app_object_type',($('ek_vordruck').value||$('ek_typ').value||'Immobilie'));
 setT('app_object_progress',v.ok+' von '+v.n+' Pflichtangaben');$('app_object_progressbar').style.width=(v.n?Math.round(v.ok/v.n*100):0)+'%';
 const invalid=(P.hinweise||[]).filter(h=>h.stufe==='fehler');$('app_validation').hidden=!invalid.length;
 if(invalid.length){setT('app_validation_text',invalid.length+' Angabe'+(invalid.length>1?'n':'')+' prüfen');setT('app_validation_detail',invalid[0].text);$('app_validation_go').onclick=()=>{appReveal($(invalid[0].feld));$(invalid[0].feld)?.focus();};}
 if(APP_STATE.tab==='object')setT('app_header_title',$('ek_anschrift').value.trim()||'Neue Bewertung');
 const next=$('app_object_next');next.textContent=v.next?'Nächste Angabe: '+v.next.label:P.fehlend?.length?'Nächster Nachweis: '+P.fehlend[0].text:'Preisempfehlung ansehen';next.onclick=()=>v.next?v.next.go():P.fehlend?.length?(appReveal($(P.fehlend[0].feld)),$(P.fehlend[0].feld)?.focus()):appShowSection('s-empfehlung');
 setT('app_home_objects',String(pjLoad().length));setT('app_home_tasks',String(aufOffenFaellig().length));
}
function appReveal(el){
 if(!el||!APP_STATE.ready)return;
 const section=el.closest('main>section.card');
 if(APP_STATE.tab!=='object')appOpenObject(section?section.id:'overview');
 if(section&&section.classList.contains('app-zu'))appAbschnittOeffnen(section,true);
 let parent=el.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
}
function appScrollIntoView(el,options){appReveal(el);el?.scrollIntoView(options);}
function appBack(){
 if(APP_STATE.tab==='object'){
  appSetTab('objects');
 }else if(APP_STATE.tab==='home'&&$('start-step1').style.display!=='none'){startStep0();appRenderTabs();}
 else appSetTab('home');
}
let APP_ORIGINAL={};
function appShellInit(){
 APP_ORIGINAL={showStart,projects:oeffneProjekte,closeProjects:schliesseProjekte,market:mdbOeffnen,closeMarket:mdbClose,pick:pickVordruck,restore,compute,cockpit:cockpitUpdate};
 document.body.classList.add('app-shell');
 document.querySelector('header.app').hidden=true;
 const header=document.createElement('header');header.id='app_header';header.innerHTML=`<button id="app_back" type="button" class="icon" aria-label="Zurück" onclick="appBack()">${iaSvg('arrow-left')}</button><div class="app-brand"><strong id="app_header_title">ImmoApp</strong><span id="app_header_subtitle">Dein Immobilienbüro</span></div><div id="app_exports"></div><button type="button" class="icon" onclick="sucheOeffnen()" aria-label="Objekt suchen">${iaSvg('search')}</button>`;
 document.body.insertBefore(header,$('startscreen'));
 $('app_exports').append($('exportMenu'));$('exportMenu').querySelector(':scope>button').setAttribute('aria-label','Export');$('projekt_overlay').removeAttribute('onclick');const reportButton=document.querySelector('header.app button[onclick="druckbericht()"]');if(reportButton)$('app_exports').append(reportButton);
 const legacy=$('mbar');legacy.id='legacy_mbar';legacy.hidden=true;
 const nav=document.createElement('nav');nav.id='mbar';nav.setAttribute('aria-label','Hauptbereiche');nav.innerHTML=[['home','Übersicht','home'],['objects','Objekte','folder'],['market','Markt','chart'],['more','Mehr','more']].map(([id,label,icon])=>`<button type="button" data-app-tab="${id}" onclick="appSetTab('${id}')" aria-label="${label}">${iaSvg(icon)}<span>${label}</span></button>`).join('');document.body.append(nav);
 const main=document.querySelector('main');
 const work=document.createElement('div');work.id='app_work_header';work.innerHTML=`<nav id="app_steps" aria-label="Bewertungsschritte">${APP_GROUPS.map(g=>`<button type="button" data-app-group="${g.id}" aria-label="${g.label}" onclick="appShowGroup('${g.id}')">${g.label}</button>`).join('')}</nav><div id="app_validation" class="app-validation" hidden><div><strong id="app_validation_text"></strong><span id="app_validation_detail"></span></div><button id="app_validation_go" type="button">Zu den Angaben</button></div><div id="app_section_toolbar" hidden><label for="app_section_select">Bereich</label><select id="app_section_select" onchange="appShowSection(this.value)"></select><button type="button" class="icon" onclick="appOpenObject()" aria-label="Objektübersicht">${iaSvg('home')}</button><span id="app_section_title" hidden></span></div><div id="app_liste_werkzeuge" class="no-print"><button type="button" class="secondary" onclick="appAlleKlappen(true)">${iaSvg('chevron-down')}<span>Alle aufklappen</span></button><button type="button" class="secondary" onclick="appAlleKlappen(false)">${iaSvg('chevron-up')}<span>Alle zuklappen</span></button></div>`;
 main.prepend(work);
 const overview=document.createElement('div');overview.id='app_object_overview';overview.innerHTML=`<div class="app-page-heading"><h1 id="app_object_heading">Dein Objekt</h1><p id="app_object_hint"></p></div><div id="app_object_summary" class="app-object-summary"><span class="app-eyebrow" id="app_object_type"></span><strong id="app_object_value">Noch nicht vollständig</strong><p id="app_object_status"></p><div class="app-progress"><span id="app_object_progress"></span><div><i id="app_object_progressbar"></i></div></div><button type="button" id="app_object_next" class="primary"></button></div><div id="app_object_actions" class="app-actions-list"></div>`;work.after(overview);
 const more=document.createElement('main');more.id='app_more';more.hidden=true;more.innerHTML=`<div class="app-page-heading"><span class="app-eyebrow">Dein Arbeitsplatz</span><h1>Werkzeuge & Einstellungen</h1><p>Alles Weitere, wenn du es brauchst.</p></div><h2>Beratung & Organisation</h2><div class="app-actions-list">${appButton('Finanzierung','calc','finOeffnen()','Rate, Budget und Tilgungsplan')}${appButton('Kunden','users','kdOeffnen()','Kundenakten und Gesprächsnotizen')}${appButton('Wiedervorlagen','calendar','aufOeffnen()','Offene Aufgaben und Termine')}${appButton('Liegenschaften','building',"lvOeffnen('uebersicht')",'Liegenschaften der Bank: Preiseinschätzung je Stichtag nach dem Vordruck')}</div><h2>Beratung & Werkzeuge</h2><div class="app-actions-list">${[['erbe','Übergeben & Vererben','gift','Schenkung oder Erbe, Nießbrauch, Freibeträge'],['rente','Wohnen im Alter','hourglass','Einmalzahlung, Leibrente, Teilverkauf, Rückmiete'],['uebergabe','Übergabeprotokoll','key','Zähler, Schlüssel, Mängel, Unterschriften'],['jahr','Mein Jahr','target','Aufträge, Provision, Ziel, Herkunft'],['grundstueck','Grundstückspotenzial','layers','Residualwert gegen Bodenrichtwert'],['etw','ETW-Kaufcheck','clipboard','Rücklage, Beschlüsse, Heizung, Unterlagen'],['wertmonitor','Wertmonitor','activity','Bewertungen fortschreiben, Gesprächsanlässe']].map(([id,l,ic,h])=>appButton(l,ic,`wzOeffnen('${id}')`,h)).join('')}</div><h2>Daten & App</h2><div class="app-actions-list">${appButton('Datensicherung','download',"appSetTab('objects')",'Projekte exportieren und wiederherstellen')}${appButton('Darstellung','moon','themeToggle()','Hell- und Dunkelmodus wechseln')}${appButton('App-Sperre','lock','lockSetupOeffnen()','Face ID, Touch ID oder Gerätecode')}${appButton('Datenschutz','shield','dsgvoOeffnen()','Wo deine Daten gespeichert werden')}${appButton('Selbsttest','check','iaSelbsttestOeffnen()','Rechenkern überprüfen')}</div>`;document.querySelector('.wrap').after(more);
 // Bestehende Einstiegspunkte führen dieselben Datenabläufe in der neuen Navigation aus.
 showStart=()=>appSetTab('home');oeffneProjekte=()=>appSetTab('objects');mdbOeffnen=async()=>{appSetTab('market');await APP_MARKET_PROMISE;};
 schliesseProjekte=()=>{APP_ORIGINAL.closeProjects();if(APP_STATE.tab==='objects'){if(document.body.classList.contains('started'))appOpenObject();else appSetTab('home');}};
 mdbClose=()=>{APP_ORIGINAL.closeMarket();if(APP_STATE.tab==='market')appSetTab('home');};
 pickVordruck=id=>{if(APP_ORIGINAL.pick(id)!==false)appOpenObject();};
 buildNav=()=>{if(APP_STATE.ready)appRenderSideNav();};
 cockpitUpdate=()=>{APP_ORIGINAL.cockpit();appRefresh();};
 document.addEventListener('input',appRefresh);document.addEventListener('change',()=>{appRefresh();if(APP_STATE.tab==='object')appRenderSideNav();});
 new MutationObserver(()=>{if(!APP_STATE.ready||APP_STATE.ignore)return;if(document.body.classList.contains('started')&&APP_STATE.tab==='home')appOpenObject('s-eck',{record:false});}).observe(document.body,{attributes:true,attributeFilter:['class']});
 // Neue Eingabeschritte sollen weder Fotos noch Berechnungen aus dem Formular entfernen.
 document.querySelectorAll('.tile[onclick]').forEach(tile=>{if(tile.tagName==='BUTTON')return;tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',tile.querySelector('.t')?.textContent||tile.textContent.trim());});
 document.addEventListener('keydown',event=>{const tile=event.target.closest('.tile[role="button"]');if(tile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();tile.click();}});
 appFormDisclosure();appAbschnitteKlappbar();appNummerieren();
 let navRaf=0;window.addEventListener('scroll',()=>{if(navRaf)return;navRaf=requestAnimationFrame(()=>{navRaf=0;appNavAktuell();});},{passive:true});
 // Drucken (Aufnahmebogen, Druckansicht): zugeklappte Blöcke vorher öffnen, danach wiederherstellen
 let druckZu=[];window.addEventListener('beforeprint',()=>{druckZu=[...document.querySelectorAll('main details.app-disclosure:not([open])')];druckZu.forEach(d=>d.open=true);});
 window.addEventListener('afterprint',()=>{druckZu.forEach(d=>d.open=false);druckZu=[];});
 document.querySelectorAll('#start-step0 .quick .tile').forEach(tile=>tile.classList.toggle('app-hero-action',tile.querySelector('.t')?.textContent==='Neue Bewertung'));
 const count=document.createElement('div');count.className='app-home-stats';count.innerHTML='<span><strong id="app_home_objects">0</strong> gespeicherte Objekte</span><span><strong id="app_home_tasks">0</strong> fällige Aufgaben</span>';$('start-step0').querySelector('.greet').after(count);
 APP_STATE.ready=true;
 window.addEventListener('popstate',event=>{const r=event.state?.immoRoute;if(r?.tab==='object')appOpenObject(r.section,{record:false});else if(r)appSetTab(r.tab,{record:false});else if(location.hash.startsWith('#s-'))appShowSection(location.hash.slice(1),{record:false});else appSetTab('home',{record:false});});
 document.addEventListener('click',()=>{queueMicrotask(appRenderTabs);});
 if(['#home','#objects','#market','#more'].includes(location.hash))appSetTab(location.hash.slice(1),{record:false});else if(location.hash.startsWith('#group:'))appOpenObject(location.hash.slice(1),{record:false});else if(location.hash.startsWith('#s-'))appShowSection(location.hash.slice(1),{record:false});else if(document.body.classList.contains('started'))appOpenObject('overview',{record:false});else appSetTab('home',{record:false});
 appRouteSave({tab:APP_STATE.tab,section:APP_STATE.section},true);
 IA_BEREIT_P.then(()=>appRefresh());
}
let APP_MARKET_PROMISE=Promise.resolve();

// Blöcke innerhalb der Abschnitte (Unterüberschriften wie „4.4 Lage“) lassen sich auf- und zuklappen.
function appFormDisclosure(){
 const zu=appZuLesen();
 document.querySelectorAll('main>section.card').forEach(section=>{
  section.querySelectorAll('h3').forEach(heading=>{
   if(heading.closest('details.app-disclosure>summary'))return;
   const titel=heading.textContent.replace(/\s+/g,' ').trim().replace(/^\d+[a-z]?(?:\.\d+)?\s*[·.]?\s*/,''), key='b:'+section.id+':'+titel.slice(0,60);
   const details=document.createElement('details');details.className='app-disclosure';details.open=!zu.has(key);
   ['haus-only','wohnung-only'].forEach(c=>{if(heading.classList.contains(c))details.classList.add(c);});   // Block nur für Haus bzw. Wohnung
   const summary=document.createElement('summary');summary.textContent=titel;summary.dataset.titel=titel;
   details.append(summary);let next=heading.nextSibling;const nodes=[];
   while(next&&!(next.nodeType===1&&next.tagName==='H3')){nodes.push(next);next=next.nextSibling;}
   heading.before(details);heading.remove();const content=document.createElement('div');content.className='app-disclosure-body';nodes.forEach(n=>content.append(n));details.append(content);
   details.addEventListener('toggle',()=>appZuMerken(key,!details.open));
  });
 });
 document.querySelectorAll('main section table').forEach(table=>{
  if(table.parentElement.classList.contains('app-table-scroll'))return;
  const wrap=document.createElement('div');wrap.className='app-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabelle: '+(table.closest('details')?.querySelector('summary')?.textContent||table.closest('section')?.querySelector('h2')?.textContent||'Objektdaten'));table.before(wrap);wrap.append(table);
 });
}
