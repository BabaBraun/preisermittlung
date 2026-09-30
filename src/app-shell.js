/* App-Navigation: gespeicherte Formulare bleiben im DOM, sichtbar ist jeweils ein Arbeitsschritt. */
const APP_GROUPS=[
 {id:'objekt',label:'Objekt',icon:'home',hint:'Grundlagen und Beschreibung',sections:['s-eck','s-technik']},
 {id:'besichtigung',label:'Besichtigung',icon:'camera',hint:'Aufnahme, Flächen und Fotos',sections:['s-aufnahme','s-hg','s-anbau','s-fotos']},
 {id:'bewertung',label:'Bewertung',icon:'calc',hint:'Verfahren und Marktparameter',sections:['s-grundlagen','s-substanz','s-vergleich','s-ertrag','s-niess','s-erbbau','s-wk','s-pv','s-energie','s-sanierung']},
 {id:'ergebnis',label:'Ergebnis',icon:'file-text',hint:'Preis, Dokumente und Vermarktung',sections:['s-empfehlung','s-belwert','s-rendite','s-sign','s-expose','s-praesentation','s-vermarktung']}
];
const APP_LABELS={'s-eck':'Objektangaben','s-technik':'Beschreibung & Recht','s-aufnahme':'Aufnahmebogen','s-hg':'Hauptgebäude','s-anbau':'Anbau & Nebengebäude','s-fotos':'Fotos & Grundrisse','s-grundlagen':'Marktparameter','s-substanz':'Sachwert','s-vergleich':'Vergleichswert','s-ertrag':'Ertragswert','s-niess':'Wohnrecht & Nießbrauch','s-erbbau':'Erbbaurecht','s-wk':'Wertkorrekturen','s-pv':'Photovoltaik','s-energie':'Energetischer Zustand','s-sanierung':'Sanierungsweg','s-empfehlung':'Preisempfehlung','s-belwert':'Beleihungswert','s-rendite':'Rendite & Investition','s-sign':'Bericht vorbereiten','s-expose':'Exposé','s-praesentation':'Präsentation','s-vermarktung':'Vermarktung'};
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
 if(section.startsWith('group:')){APP_STATE.group=section.slice(6);}
 else if(section!=='overview'){
  const el=$(section);if(!el||!navSichtbar(el))section='s-eck';
  APP_STATE.group=(APP_GROUPS.find(g=>g.sections.includes(section))||APP_GROUPS[0]).id;
 }
 APP_STATE.section=section;
 document.querySelectorAll('main>section.card').forEach(el=>el.classList.toggle('app-current-section',el.id===section));
 $('app_object_overview').hidden=section!=='overview'&&!section.startsWith('group:');
 const el=$(section);setT('app_section_title',el?APP_LABELS[section]||navLabel(el):'Objektübersicht');
 $('app_section_toolbar').hidden=!el;
 const select=$('app_section_select');select.replaceChildren();
 const group=APP_GROUPS.find(g=>g.id===APP_STATE.group)||APP_GROUPS[0];
 for(const s of appSections(group)){const option=document.createElement('option');option.value=s.id;option.textContent=APP_LABELS[s.id]||navLabel(s);select.append(option);}
 select.value=section;
 appRenderObjectMenu();appRenderTabs();appRenderSideNav();appRefresh();
 if(record)appRouteSave({tab:'object',section});window.scrollTo({top:0,behavior:'instant'});
}
function appShowSection(id,options){appOpenObject(id,options);}
function appShowGroup(id){appOpenObject('group:'+id);}
function appRenderSideNav(){
 const nav=$('nav');if(!nav)return;nav.replaceChildren();
 const heading=document.createElement('p');heading.className='app-side-caption';heading.textContent='Diese Bewertung';nav.append(heading);
 const back=document.createElement('button');back.textContent='Objektübersicht';back.onclick=()=>appOpenObject();back.className='app-side-home';nav.append(back);
 for(const g of APP_GROUPS){const btn=document.createElement('button');btn.innerHTML=iaSvg(g.icon)+'<span>'+g.label+'</span>';btn.className='app-side-group';btn.onclick=()=>appShowGroup(g.id);btn.setAttribute('aria-expanded',String(APP_STATE.group===g.id));nav.append(btn);
  if(APP_STATE.group===g.id)for(const section of appSections(g)){const a=document.createElement('a');a.href='#'+section.id;a.dataset.sec=section.id;a.innerHTML='<i class="st"></i><span>'+sEsc(APP_LABELS[section.id]||navLabel(section))+'</span><em></em>';a.onclick=e=>{e.preventDefault();appShowSection(section.id);};a.setAttribute('aria-current',APP_STATE.section===section.id?'page':'false');nav.append(a);}
 }
 navStatus();
}
function appRefresh(){
 if(!APP_STATE.ready)return;
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
 const section=el.closest('main>section.card');if(section)appShowSection(section.id);
 let parent=el.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
}
function appScrollIntoView(el,options){appReveal(el);el?.scrollIntoView(options);}
function appBack(){
 if(APP_STATE.tab==='object'){
  if(APP_STATE.section==='overview')appSetTab('objects');
  else if(APP_STATE.section.startsWith('group:'))appOpenObject();
  else appShowGroup(APP_STATE.group);
 }else if(APP_STATE.tab==='home'&&$('start-step2').style.display!=='none'){startBack();appRenderTabs();}
 else if(APP_STATE.tab==='home'&&$('start-step1').style.display!=='none'){startStep0();appRenderTabs();}
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
 const work=document.createElement('div');work.id='app_work_header';work.innerHTML=`<nav id="app_steps" aria-label="Bewertungsschritte">${APP_GROUPS.map(g=>`<button type="button" data-app-group="${g.id}" aria-label="${g.label}" onclick="appShowGroup('${g.id}')">${g.label}</button>`).join('')}</nav><div id="app_validation" class="app-validation" hidden><div><strong id="app_validation_text"></strong><span id="app_validation_detail"></span></div><button id="app_validation_go" type="button">Zu den Angaben</button></div><div id="app_section_toolbar" hidden><label for="app_section_select">Bereich</label><select id="app_section_select" onchange="appShowSection(this.value)"></select><button type="button" class="icon" onclick="appOpenObject()" aria-label="Objektübersicht">${iaSvg('home')}</button><span id="app_section_title" hidden></span></div>`;
 main.prepend(work);
 const overview=document.createElement('div');overview.id='app_object_overview';overview.innerHTML=`<div class="app-page-heading"><h1 id="app_object_heading">Dein Objekt</h1><p id="app_object_hint"></p></div><div id="app_object_summary" class="app-object-summary"><span class="app-eyebrow" id="app_object_type"></span><strong id="app_object_value">Noch nicht vollständig</strong><p id="app_object_status"></p><div class="app-progress"><span id="app_object_progress"></span><div><i id="app_object_progressbar"></i></div></div><button type="button" id="app_object_next" class="primary"></button></div><div id="app_object_actions" class="app-actions-list"></div>`;work.after(overview);
 const more=document.createElement('main');more.id='app_more';more.hidden=true;more.innerHTML=`<div class="app-page-heading"><span class="app-eyebrow">Dein Arbeitsplatz</span><h1>Werkzeuge & Einstellungen</h1><p>Alles Weitere, wenn du es brauchst.</p></div><h2>Beratung & Organisation</h2><div class="app-actions-list">${appButton('Finanzierung','calc','finOeffnen()','Rate, Budget und Tilgungsplan')}${appButton('Kunden','users','kdOeffnen()','Kundenakten und Gesprächsnotizen')}${appButton('Wiedervorlagen','calendar','aufOeffnen()','Offene Aufgaben und Termine')}</div><h2>Daten & App</h2><div class="app-actions-list">${appButton('Datensicherung','download',"appSetTab('objects')",'Projekte exportieren und wiederherstellen')}${appButton('Darstellung','moon','themeToggle()','Hell- und Dunkelmodus wechseln')}${appButton('App-Sperre','lock','lockSetupOeffnen()','Face ID, Touch ID oder Gerätecode')}${appButton('Datenschutz','shield','dsgvoOeffnen()','Wo deine Daten gespeichert werden')}${appButton('Selbsttest','check','iaSelbsttestOeffnen()','Rechenkern überprüfen')}</div>`;document.querySelector('.wrap').after(more);
 // Bestehende Einstiegspunkte führen dieselben Datenabläufe in der neuen Navigation aus.
 showStart=()=>appSetTab('home');oeffneProjekte=()=>appSetTab('objects');mdbOeffnen=async()=>{appSetTab('market');await APP_MARKET_PROMISE;};
 schliesseProjekte=()=>{APP_ORIGINAL.closeProjects();if(APP_STATE.tab==='objects'){if(document.body.classList.contains('started'))appOpenObject();else appSetTab('home');}};
 mdbClose=()=>{APP_ORIGINAL.closeMarket();if(APP_STATE.tab==='market')appSetTab('home');};
 pickVordruck=id=>{APP_ORIGINAL.pick(id);appOpenObject();};
 buildNav=()=>{if(APP_STATE.ready)appRenderSideNav();};
 cockpitUpdate=()=>{APP_ORIGINAL.cockpit();appRefresh();};
 document.addEventListener('input',appRefresh);document.addEventListener('change',()=>{appRefresh();if(APP_STATE.tab==='object')appRenderSideNav();});
 new MutationObserver(()=>{if(!APP_STATE.ready||APP_STATE.ignore)return;if(document.body.classList.contains('started')&&APP_STATE.tab==='home')appOpenObject('s-eck',{record:false});}).observe(document.body,{attributes:true,attributeFilter:['class']});
 // Neue Eingabeschritte sollen weder Fotos noch Berechnungen aus dem Formular entfernen.
 document.querySelectorAll('.tile[onclick]').forEach(tile=>{if(tile.tagName==='BUTTON')return;tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',tile.querySelector('.t')?.textContent||tile.textContent.trim());});
 document.addEventListener('keydown',event=>{const tile=event.target.closest('.tile[role="button"]');if(tile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();tile.click();}});
 const tileObserver=new MutationObserver(()=>{document.querySelectorAll('.tile[onclick]:not([role]):not(button)').forEach(tile=>{tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',tile.querySelector('.t')?.textContent||tile.textContent.trim());});});tileObserver.observe($('start-tiles'),{childList:true});
 appFormDisclosure();
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

// Überschaubare Unterabschnitte: optionale Details werden erst bei Bedarf geöffnet.
function appFormDisclosure(){
 for(const id of ['s-aufnahme','s-hg','s-technik','s-fotos','s-empfehlung','s-sign','s-expose','bw_body']){
  const section=$(id);if(!section)continue;
  const headings=[...section.children].filter(el=>el.tagName==='H3');
  headings.forEach((heading,i)=>{
   const details=document.createElement('details');details.className='app-disclosure';details.open=i===0;
   const summary=document.createElement('summary');summary.textContent=heading.textContent.replace(/^\d+(?:[a-z])?(?:\.\d+)?\s*[·.]?\s*/,'').trim();
   details.append(summary);let next=heading.nextSibling;const nodes=[];
   while(next&&!(next.nodeType===1&&next.tagName==='H3')){nodes.push(next);next=next.nextSibling;}
   heading.before(details);heading.remove();const content=document.createElement('div');content.className='app-disclosure-body';nodes.forEach(n=>content.append(n));details.append(content);
  });
 }
 document.querySelectorAll('main section table').forEach(table=>{
  if(table.parentElement.classList.contains('app-table-scroll'))return;
  const wrap=document.createElement('div');wrap.className='app-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabelle: '+(table.closest('details')?.querySelector('summary')?.textContent||table.closest('section')?.querySelector('h2')?.textContent||'Objektdaten'));table.before(wrap);wrap.append(table);
 });
}
