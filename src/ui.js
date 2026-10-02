/* =========================================================================
   OBERFLÄCHE — Icons, Dunkelmodus, Statusnavigation, Cockpit, Startseite
   Alles hier ist Darstellung: keine Rechenlogik, keine Speicherformate.
   Funktionen mit bekanntem Namen (buildNav, startStep0, …) werden hier neu
   definiert und lösen die früheren Fassungen ab.
   ========================================================================= */

/* ---------- Icons: ein Linien-Set als Inline-SVG statt Emoji ---------- */
var IA_ICONS={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
  factory:'<path d="M3 21V10l5 3V10l5 3V10l5 3v8H3z"/><path d="M7 21v-4M12 21v-4M17 21v-4"/><path d="M17 3h3v10"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  chart:'<path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.3a3 3 0 0 1 0 5.4M17.5 14.3c1.7.6 2.8 2.2 3.1 4.7"/>',
  'folder-open':'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H7l-3 9"/><path d="M4 19h14l3-9"/>',
  save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><path d="M8 21v-6h8v6"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  'file-text':'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
  download:'<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  upload:'<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
  printer:'<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 21v-6h10v6"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  wrench:'<path d="M14.5 6.5a4 4 0 0 0 5 5L9 22l-3-3L16.5 8.5a4 4 0 0 1 -2-2z"/>',
  map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pen:'<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M13 7l4 4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  x:'<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  alert:'<path d="M12 3 2 20h20z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".7"/>',
  'arrow-up':'<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  'arrow-down':'<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  'arrow-left':'<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  'arrow-right':'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'chevron-up':'<path d="m6 15 6-6 6 6"/>',
  'chevron-right':'<path d="m9 6 6 6-6 6"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/>',
  more:'<circle cx="12" cy="5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="12" cy="19" r="1.1"/>',
  export:'<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  calendar:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4M8 3v4M4 10h16"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h2M12 11h2M16 11h.01"/><path d="M8 15h2M12 15h2M16 15h.01"/><path d="M8 18h6"/>'
};
var IA_EMOJI={'🏠':'home','🏢':'building','🏬':'store','🏭':'factory','☀':'sun','📊':'chart','📁':'folder','📂':'folder-open',
  '💾':'save','🗎':'file','📄':'file','📝':'file-text','⬇':'download','🖨':'printer','📲':'download','📷':'camera','🛠':'wrench',
  '🗺':'map','✒':'pen','🔍':'search','🗃':'archive','📥':'download','🗑':'trash','＋':'plus','✕':'x','📖':'book','⚠':'alert',
  '↑':'arrow-up','←':'arrow-left','→':'arrow-right','◀':'arrow-left','⤵':'arrow-down','⤴':'arrow-up','✓':'check'};
function iaSvg(name){ if(!window.IA_ICONS)return ''; let p=IA_ICONS[name]; return p?'<svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>':''; }
var IA_EMOJI_RE=/^\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FF0B}\u{25C0}\u{2934}\u{2935}])\u{FE0F}?\s*/u;
function iconify(root){
  if(!window.IA_ICONS)return;
  root=root||document;
  if(root.querySelectorAll){
    root.querySelectorAll('[data-ic]').forEach(el=>{ if(!el.querySelector(':scope>svg.ic-svg')) el.insertAdjacentHTML('afterbegin',iaSvg(el.dataset.ic)); });
    root.querySelectorAll('button, .tile .ic, .mdb-head h2, .pdfrow>span:first-child, summary, .drop').forEach(el=>{
      let t=el.firstChild; if(!t||t.nodeType!==3)return;
      let m=t.nodeValue.match(IA_EMOJI_RE); if(!m)return;
      let name=IA_EMOJI[m[1]]; if(!name)return;
      t.nodeValue=t.nodeValue.slice(m[0].length);
      el.insertAdjacentHTML('afterbegin',iaSvg(name));
    });
  }
  if(root.matches&&root.matches('[data-ic]')&&!root.querySelector(':scope>svg.ic-svg')) root.insertAdjacentHTML('afterbegin',iaSvg(root.dataset.ic));
}


/* ---------- Barrierefreiheit: Label-Feld-Kopplung + aria-label aus title ---------- */
let IA_AUTOID=0;
function a11yLabels(root){
  (root||document).querySelectorAll('.field, .mdb-filter .field').forEach(f=>{
    let lab=f.querySelector(':scope>label'); if(!lab||lab.hasAttribute('for'))return;
    let inp=f.querySelector(':scope>input,:scope>select,:scope>textarea,:scope>.inwrap>input');
    if(!inp)return;
    if(!inp.id) inp.id='ia_auto_'+(IA_AUTOID++);
    lab.setAttribute('for',inp.id);
  });
  (root||document).querySelectorAll('button[title]:not([aria-label])').forEach(b=>b.setAttribute('aria-label',b.title));
}




/* Kennwert und Klasse aus dem Aufnahmebogen uebernehmen, damit nichts doppelt erfasst wird */
/* Effizienzklasse von Hand: schon beim „input“-Ereignis als eingetragen merken — sonst rechnet die allgemeine
   Neuberechnung (document „input“) vorher und ersetzt die Auswahl durch die Klasse aus dem Energiekennwert */
function enKlasseManuell(){ $('en_klasse').dataset.manuell='1'; compute(); }
function enAusAufnahme(){
  let k=num('au_energiewert'), kl=($('au_energieklasse')||{value:'–'}).value;
  if(k>0){ $('en_kennwert').value=num2(k); $('en_klasse').dataset.manuell=''; }
  if(kl && kl!=='–'){ $('en_klasse').value=kl; $('en_klasse').dataset.manuell='1'; }
  if(!(k>0) && (!kl||kl==='–')){ alert('Im Aufnahmebogen sind weder Energiekennwert noch Effizienzklasse eingetragen.'); return; }
  compute();
}

/* ---------- Standort erfassen (Geolocation) im Aufnahmebogen ---------- */
function ortErfassen(){
  if(!navigator.geolocation){ setT('au_ortstatus','Dieses Gerät oder dieser Browser unterstützt keine Standorterfassung.'); return; }
  setT('au_ortstatus','Standort wird ermittelt …');
  navigator.geolocation.getCurrentPosition(
    pos=>{
      let lat=pos.coords.latitude.toFixed(6), lon=pos.coords.longitude.toFixed(6);
      $('au_lat').value=lat; $('au_lon').value=lon;
      let genau=Math.round(pos.coords.accuracy||0);
      setT('au_ortstatus','Standort erfasst'+(genau?' (Genauigkeit \u00b1'+genau+' m)':'')+'.');
      let link=$('au_kartelink'); if(link){ link.href='https://www.google.com/maps?q='+lat+','+lon; link.style.display='inline'; }
      autosave();
    },
    err=>{
      let msg = err.code===1 ? 'Standortzugriff wurde verweigert \u2014 bitte in den Geräteeinstellungen für diese Seite erlauben.'
              : err.code===2 ? 'Standort konnte nicht ermittelt werden (kein Empfang/Signal).'
              : 'Zeitüberschreitung bei der Standortermittlung \u2014 bitte erneut versuchen.';
      setT('au_ortstatus',msg);
    },
    {enableHighAccuracy:true, timeout:15000, maximumAge:60000}
  );
}

/* ---------- App-Sperre: Face ID / Touch ID / Windows Hello ueber WebAuthn -----------------
   Rein lokal: kein Server verifiziert etwas. Eine erfolgreiche navigator.credentials.get()
   mit userVerification:'required' beweist, dass Betriebssystem/Browser auf DIESEM Geraet
   gerade eine Biometrie-/Code-Pruefung verlangt und bestanden haben. Das schuetzt zuverlaessig
   vor einem kurzen Blick auf das entsperrte Geraet, nicht vor technischem Zugriff auf den
   Browserspeicher (z.B. Entwicklertools) -- siehe DECISIONS.md D5. */
function iaB64(buf){ return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
function iaUnB64(s){ let bin=atob(s), a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return a; }
function iaLockVerfuegbar(){ return ImmoNative.isNative() || !!(window.PublicKeyCredential && navigator.credentials); }
async function iaLockPlattformVorhanden(){
  if(ImmoNative.isNative()){try{return await ImmoNative.biometricAvailable();}catch{return false;}}
  if(!iaLockVerfuegbar())return false;
  try{ return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }catch(e){ return false; }
}
async function iaLockEinrichten(){
  if(ImmoNative.isNative()){
    try{if(!(await ImmoNative.authenticate()))return;localStorage.setItem('ia_lock_cred','native-device');localStorage.setItem('ia_lock_enabled','1');lockSetupRender();alert('App-Sperre eingerichtet. Beim nächsten Öffnen wird Face ID, Touch ID oder der Gerätecode verlangt.');}
    catch(e){alert('App-Sperre konnte nicht eingerichtet werden: '+e.message);}return;
  }
  if(!(await iaLockPlattformVorhanden())){
    alert('Auf diesem Gerät/Browser ist keine Face ID-, Touch ID- oder Gerätecode-Sperre verfügbar.');
    return;
  }
  try{
    let cred=await navigator.credentials.create({publicKey:{
      challenge:crypto.getRandomValues(new Uint8Array(32)),
      rp:{name:'ImmoApp'},
      user:{id:crypto.getRandomValues(new Uint8Array(16)), name:'immoapp-geraet', displayName:'ImmoApp Gerätesperre'},
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'preferred'},
      timeout:60000, attestation:'none'
    }});
    if(!cred) throw new Error('abgebrochen');
    localStorage.setItem('ia_lock_cred', iaB64(cred.rawId));
    localStorage.setItem('ia_lock_enabled','1');
    lockSetupRender();
    alert('App-Sperre eingerichtet. Beim nächsten Öffnen wird Face ID/Touch ID/der Gerätecode verlangt.');
  }catch(e){
    if(e && e.name==='NotAllowedError') return;   // abgebrochen, keine Fehlermeldung noetig
    alert('Einrichtung fehlgeschlagen: '+(e.message||e));
  }
}
function iaLockDeaktivieren(){
  if(!confirm('App-Sperre wirklich deaktivieren?')) return;
  localStorage.removeItem('ia_lock_enabled'); localStorage.removeItem('ia_lock_cred');
  lockSetupRender();
}
async function iaLockPruefen(){
  if(ImmoNative.isNative()){try{return await ImmoNative.authenticate();}catch{return false;}}
  let credId=localStorage.getItem('ia_lock_cred');
  if(!credId) return true;
  try{
    let assertion=await navigator.credentials.get({publicKey:{
      challenge:crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials:[{id:iaUnB64(credId), type:'public-key'}],
      userVerification:'required', timeout:60000
    }});
    return !!assertion;
  }catch(e){ return false; }
}
async function iaLockVersuch(){
  setT('lock_status','Wird geprüft …'); $('lock_btn').disabled=true;
  let ok=await iaLockPruefen();
  if(ok){ iaLockOeffnen(); return; }
  setT('lock_status','Entsperren nicht möglich. Bitte erneut versuchen — oder, falls dieses Gerät die Sperre nicht mehr erfüllen kann, in den Geräteeinstellungen die Website-Daten löschen (siehe Hinweis bei der Einrichtung).');
  $('lock_btn').disabled=false;
}
function iaLockOeffnen(){
  let o=$('lock_overlay'); if(o)o.style.display='none';
  document.documentElement.style.overflow='';
}
async function iaLockAutoStart(){
  if(localStorage.getItem('ia_lock_enabled')!=='1') return;
  let ok=await iaLockPruefen();
  if(ok) iaLockOeffnen();
  else setT('lock_status','Zum Fortfahren mit Face ID, Touch ID oder Gerätecode entsperren.');
}
function lockSetupOeffnen(){ $('lock_setup_overlay').classList.add('on'); lockSetupRender(); }
function lockSetupSchliessen(){ $('lock_setup_overlay').classList.remove('on'); }
async function lockSetupRender(){
  let an=localStorage.getItem('ia_lock_enabled')==='1';
  let verf=await iaLockPlattformVorhanden();
  $('lock_setup_ein').style.display=an?'none':'';
  $('lock_setup_aus').style.display=an?'':'none';
  $('lock_setup_warn').style.display=an?'none':'block';
  setT('lock_setup_status', an
    ? '✓ App-Sperre ist aktiv. Beim nächsten Öffnen wird entsperrt.'
    : (verf ? 'Noch nicht eingerichtet.' : 'Dieses Gerät/dieser Browser unterstützt keine Plattform-Biometrie — „Einrichten" wird fehlschlagen.'));
}

/* ---------- Dunkelmodus ---------- */
function themeApply(t){
  document.documentElement.setAttribute('data-theme',t);
  try{ localStorage.setItem('ia_theme',t); }catch(e){}
  document.querySelectorAll('[data-ic="moon"],[data-ic="sun"]').forEach(b=>{ b.dataset.ic=(t==='dark'?'sun':'moon'); b.title=(t==='dark'?'Hellmodus':'Dunkelmodus'); let s=b.querySelector(':scope>svg.ic-svg'); if(s)s.remove(); iconify(b); });
  let m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=(t==='dark'?'#0B1422':'#FFFFFF');
}
function themeToggle(){ themeApply(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'); }

/* ---------- Ausklappmenü ---------- */
function menuToggle(id){ let m=$(id); if(!m)return; let open=!m.classList.contains('open'); document.querySelectorAll('.menu.open').forEach(x=>x.classList.remove('open')); if(open)m.classList.add('open'); }
document.addEventListener('click',e=>{ if(!e.target.closest('.menu')) document.querySelectorAll('.menu.open').forEach(x=>x.classList.remove('open')); });
document.addEventListener('click',e=>{ if(e.target.closest('.menu-list button')) document.querySelectorAll('.menu.open').forEach(x=>x.classList.remove('open')); });

/* ---------- Einheiten ins Feld, Schrittnummern als Plakette ---------- */
function unitsInField(root){
  (root||document).querySelectorAll('.field').forEach(f=>{
    if(f.dataset.unitDone)return;
    let lab=f.querySelector(':scope>label'), u=lab&&lab.querySelector('.u'), inp=f.querySelector(':scope>input[type=text]');
    f.dataset.unitDone='1';
    if(!lab||!u||!inp)return;
    let txt=u.textContent.trim(); if(!txt||txt.length>9)return;
    let w=document.createElement('div'); w.className='inwrap'; inp.parentNode.insertBefore(w,inp); w.appendChild(inp);
    let s=document.createElement('span'); s.className='unit'; s.textContent=txt; w.appendChild(s);
    u.remove(); lab.innerHTML=lab.innerHTML.replace(/\s+$/,'');
  });
}
function stepBadges(){
  document.querySelectorAll('.card h2').forEach(h=>{
    if(h.querySelector('.step'))return;
    let t=h.firstChild; if(!t||t.nodeType!==3)return;
    let m=t.nodeValue.match(/^\s*([①-⑳])\s?([a-z])?\s*/); if(!m)return;
    let n=(m[1].charCodeAt(0)-0x2460+1)+(m[2]||'');
    t.nodeValue=t.nodeValue.slice(m[0].length);
    h.insertAdjacentHTML('afterbegin','<span class="step">'+n+'</span>');
  });
}

/* ---------- Pflichtfelder & Vollständigkeit ---------- */
var PFLICHT_HAUS=['ek_anschrift','ek_ort','ek_ag','ek_stichtag','ek_besichtigung','ek_gs_flaeche','ek_brw','ek_wohnflaeche','ek_baujahr',
  {id:'bgf',lbl:'Bruttogrundfläche eintragen',sec:'s-hg',ok:()=>parseNum(($('o_bgf_hg')||{}).textContent||'')>0},
  'ek_miete_wohnen','ek_ersteller'];
var PFLICHT_WOHNUNG=['ek_anschrift','ek_ort','ek_ag','ek_stichtag','ek_besichtigung','ek_wohnflaeche','ek_baujahr','ek_mea','ek_hausgeld','vw_preis','ek_miete_wohnen','ek_ersteller'];
function feldGefuellt(id){
  let e=$(id); if(!e)return false; let v=(e.value||'').trim();
  if(v==='')return false;
  if(e.tagName==='SELECT')return e.selectedIndex>0;   /* Vorgabe in der ersten Zeile zaehlt nicht als Eingabe */
  if(e.type==='date'||e.tagName==='TEXTAREA')return true;
  return !(/^[0.,\s]*$/.test(v));
}
/* Pflichtfelder in ausgeschalteten Abschnitten zählen nicht (z. B. Ortsbesichtigung bei ausgeschaltetem Aufnahmebogen, D35) */
function pflichtListe(){ return ((modus()==='wohnung'?window.PFLICHT_WOHNUNG:window.PFLICHT_HAUS)||[]).filter(p=>{ if(typeof p!=='string') return true;
  let e=$(p), sec=e&&e.closest('main>section.card'); return !(sec&&typeof appSchalterAn==='function'&&appSchalterAn(sec.id)===false); }); }
function pflichtOk(p){ return typeof p==='string'?feldGefuellt(p):!!p.ok(); }
function pflichtLabel(p){
  if(typeof p!=='string') return p.lbl;
  let e=$(p), f=e&&e.closest('.field'), l=f&&f.querySelector('label');
  let t=l?l.textContent.replace(/\s+/g,' ').trim():p;
  let u=l&&l.querySelector('.u'); if(u) t=t.replace(u.textContent,'').trim();
  return t+' eintragen';
}
function pflichtGehe(p){
  if(typeof p!=='string'){ let s=$(p.sec); if(s)appScrollIntoView(s,{behavior:'smooth',block:'start'}); return; }
  let e=$(p); if(!e)return; appScrollIntoView(e,{behavior:'smooth',block:'center'}); setTimeout(()=>{ try{e.focus({preventScroll:true});}catch(x){} },350);
}
function voll(){
  let L=pflichtListe(), ok=0, next=null;
  L.forEach(p=>{ if(pflichtOk(p))ok++; else if(!next)next=p; });
  return {ok:ok,n:L.length,next:next?{label:pflichtLabel(next),go:()=>pflichtGehe(next)}:null};
}

/* ---------- Navigation mit Status ---------- */
/* Reihenfolge wie im Formular — die Abschnittsnummern laufen in dieser Folge */
var NAV_GROUPS=[['Erfassung',['s-eck','s-aufnahme','s-technik','s-allg','s-hg','s-anbau','s-grundlagen']],
                  ['Verfahren',['s-substanz','s-vergleich','s-ertrag','s-niess','s-erbbau','s-wk','s-pv','s-energie','s-sanierung']],
                  ['Abschluss',['s-fotos','s-empfehlung','s-belwert','s-rendite','s-sign','s-expose','s-praesentation','s-vermarktung']]];
var NAV_TOGGLE={'s-sanierung':'san_aktiv','s-anbau':'anbau_aktiv','s-niess':'niess_aktiv','s-erbbau':'eb_aktiv','s-pv':'pv_aktiv','s-vergleich':'vw_aktiv','s-energie':'en_aktiv','s-belwert':'bw_aktiv'};
var NAV_OUT={'s-substanz':'o_substanz','s-ertrag':'o_ertrag','s-vergleich':'o_vergleich','s-niess':'o_e_niess','s-pv':'o_e_pv','s-erbbau':'o_e_erbbau','s-energie':'o_energie','s-belwert':'o_beleihungswert','s-empfehlung':'o_empfehlung'};
function navLabel(s){ return (s.dataset.nav||'').replace(/^[①-⑳]\s?[a-z]?\s*/,'').replace(/^Preis n\. /,'Preis nach ').replace(/ § 8$/,''); }
function navSichtbar(s){ let w=modus()==='wohnung'; return !(w&&s.classList.contains('haus-only'))&&!(!w&&s.classList.contains('wohnung-only')); }
function navLink(s){
  let a=document.createElement('a'); a.href='#'+s.id; a.dataset.sec=s.id;
  a.innerHTML='<i class="st"></i><span>'+navLabel(s)+'</span><em></em>';
  a.onclick=e=>{ e.preventDefault(); appScrollIntoView(s,{behavior:'smooth',block:'start'}); };
  return a;
}
function buildNav(){
  if(!window.NAV_GROUPS)return;   /* alte Initialisierung ruft früher — der eigene Start holt es nach */
  let nav=$('nav'); if(!nav)return; nav.innerHTML='';
  let gesetzt={};
  NAV_GROUPS.forEach(g=>{
    let items=g[1].map(id=>$(id)).filter(s=>s&&navSichtbar(s));
    if(!items.length)return;
    let h=document.createElement('div'); h.className='nav-group'; h.textContent=g[0]; nav.appendChild(h);
    items.forEach(s=>{ nav.appendChild(navLink(s)); gesetzt[s.id]=1; });
  });
  document.querySelectorAll('section[data-nav]').forEach(s=>{ if(!gesetzt[s.id]&&navSichtbar(s)) nav.appendChild(navLink(s)); });
  navStatus();
}
function secStatus(id){
  if(typeof appSchalterAn==='function'&&appSchalterAn(id)===false) return ['off','aus'];   // Schalter in der Kopfzeile (D35)
  let tg=(window.NAV_TOGGLE||{})[id];
  if(tg){ let e=$(tg); if(e&&!e.checked&&!(id==='s-vergleich'&&modus()==='wohnung')) return ['off','aus']; }
  if(id==='s-fotos'){ let n=(typeof PHOTOS!=='undefined'&&PHOTOS)?PHOTOS.length:0; return n?['done',String(n)]:['empty','']; }
  if(id==='s-aufnahme'){ let any=[...document.querySelectorAll('#s-aufnahme input[type=checkbox]')].some(c=>c.checked)||feldGefuellt('ek_besichtigung'); return any?['done','']:['empty','']; }
  if(id==='s-rendite'){ return feldGefuellt('pl_markt')?['done','']:['empty','']; }
  if(id==='s-technik'){ let n=[...document.querySelectorAll('#s-technik input:not([type=checkbox]),#s-technik select,#s-technik textarea')].filter(e=>e.id&&feldGefuellt(e.id)).length; return n>=6?['done','']:n?['started','']:['empty','']; }
  if(id==='s-wk'){ let n=0; for(let i=0;i<(typeof N_WK!=='undefined'?N_WK:14);i++) if(feldGefuellt('wk_val'+i))n++; return n?['done',String(n)]:['empty','']; }
  let out=(window.NAV_OUT||{})[id];
  if(out){
    let hat=parseNum(($(out)||{}).textContent||'')!==0;
    /* Ergebnis allein reicht nicht: die Vorgabewerte liefern immer eine Zahl. Erst mit eigenen Eingaben gilt der Abschnitt als fertig. */
    let basis=true;
    if(id==='s-substanz') basis=parseNum(($('o_bgf_hg')||{}).textContent||'')>0;
    if(id==='s-ertrag')   basis=feldGefuellt('ek_miete_wohnen')||feldGefuellt('ek_miete_gewerbe')||!!(($('er_mietrolle')||{}).checked);
    if(id==='s-vergleich')basis=feldGefuellt('vw_preis');
    if(id==='s-empfehlung'){ let v=voll(); return v.ok>=v.n?['done','']:(hat?['started',v.ok+' / '+v.n]:['empty','']); }
    return (hat&&basis)?['done','']:(hat?['started','']:['empty','']);
  }
  let sec=$(id); if(!sec)return ['empty',''];
  let req=pflichtListe().filter(p=>{ if(typeof p==='string'){ let el=$(p); return el&&el.closest('section')===sec; } return p.sec===id; });
  if(req.length){ let ok=req.filter(pflichtOk).length; if(ok===req.length)return ['done','']; return [ok?'started':'empty', ok+' / '+req.length]; }
  return ['empty',''];
}
function navStatus(){
  document.querySelectorAll('nav.side a[data-sec]').forEach(a=>{
    let st=secStatus(a.dataset.sec);
    a.className='st-'+st[0]; let em=a.querySelector('em'); if(em)em.textContent=st[1];
  });
}

/* ---------- Cockpit ---------- */
function cockpitUpdate(){
  try{
    let adr=($('ek_anschrift')||{}).value||''; setT('hdr_proj', adr.trim()||'Neue Bewertung');
    let sp=($('o_spanne')||{}).textContent||'–'; setT('cp_spanne', sp&&sp!=='–'?'Verhandlungsspanne '+sp:'Verhandlungsspanne wird berechnet');
    let abwT=(($('o_pl_abw')||{}).textContent||'–').trim(), cls='', txt='', kurz='offen';
    if(abwT==='–'||abwT===''){ txt='Plausibilität: Vergleichspreis unter Preisempfehlung eintragen'; }
    else{ let a=Math.abs(parseNum(abwT.replace('+',''))); cls=a<=10?'ok':a<=25?'warn':'bad'; kurz=a<=10?'plausibel':a<=25?'erklärungsbedürftig':'prüfen'; txt=kurz+' · '+abwT+' zum Vergleichspreis'; }
    ['cp_plausi','mb_plausi'].forEach(id=>{ let p=$(id); if(!p)return; p.classList.remove('ok','warn','bad'); if(cls)p.classList.add(cls); });
    setT('cp_plausi_t',txt); setT('mb_plausi_t',kurz);
    let w=modus()==='wohnung', vwOn=w||(($('vw_aktiv')||{}).checked);
    setT('cp_vgl', vwOn?(($('o_vergleich')||{}).textContent||'–'):'–');
    let R=window._R||{}, g=(typeof R.g==='number')?R.g:0.5; if(g>1)g=g/100; if(g<0)g=0;
    let gv=vwOn&&!w?Math.min(1,Math.max(0,parseNum(($('gew_vergleich')||{}).value||'0')/100)):0;
    let a=Math.round(g*(1-gv)*100), b=Math.round((1-g)*(1-gv)*100), c=Math.max(0,100-a-b);
    setT('cp_sub_w',a+' %'); setT('cp_er_w',b+' %'); setT('cp_vgl_w', vwOn?(w?'':c+' %'):'aus');
    let bar=$('cp_bar'); if(bar){ let i=bar.children; if(i[0])i[0].style.width=a+'%'; if(i[1])i[1].style.width=b+'%'; if(i[2])i[2].style.width=c+'%'; }
    if(w){ setT('cp_sub_w',''); let r=$('cp_vgl_row'); if(r)r.style.display='none'; } else { let r=$('cp_vgl_row'); if(r)r.style.display=''; }
    let v=voll(); setT('cp_voll', v.ok+' / '+v.n+' Pflichtfelder'); let pr=$('cp_prog'); if(pr)pr.style.width=(v.n?Math.round(v.ok/v.n*100):0)+'%';
    let nx=$('cp_next'); if(nx){ nx.textContent=v.next?v.next.label:'alle Pflichtfelder sind erfasst'; nx.onclick=e=>{ e.preventDefault(); if(v.next)v.next.go(); }; }
    setT('mb_empf', ($('r_empfehlung')||{}).textContent||'0 €');
    plausiRender();
    navStatus();
  }catch(e){}
}
function mbarToggle(){ document.body.classList.toggle('cp-open'); }
document.addEventListener('input',cockpitUpdate);
document.addEventListener('change',cockpitUpdate);
document.addEventListener('click',e=>{ if(document.body.classList.contains('cp-open')&&!e.target.closest('#mbar')&&!e.target.closest('aside.result')) document.body.classList.remove('cp-open'); });

/* ---------- Startseite als Arbeitsplatz ---------- */
function startGreeting(){
  let h=new Date().getHours(), g=h<11?'Guten Morgen':h<18?'Guten Tag':'Guten Abend';
  let n=''; try{ n=(($('ek_ersteller')||{}).value||'').trim().split(/\s+/)[0]||''; }catch(e){}
  if(/^(herr|frau|dr\.?|prof\.?)$/i.test(n)) n='';
  return g+(n?', '+n:'')+'.';
}
function startRecent(){
  let el=$('start_recent'); if(!el)return;
  let rows=[], cur=null;
  try{ cur=JSON.parse(localStorage.getItem('vb_wert2')); }catch(e){}
  if(cur&&cur.fields&&(cur.fields.ek_anschrift||'').trim()){
    let v=null; try{ v=voll(); }catch(e){}
    rows.push({name:(cur.fields.ek_anschrift||'').trim()||'Aktuelle Bewertung', ort:(cur.fields.ek_ort||'').trim(), typ:cur.fields.ek_vordruck||cur.fields.ek_typ||'',
      empf:($('o_empfehlung')||{}).textContent||'', when:'zuletzt geöffnet', voll:v?{ok:v.ok,n:v.n}:null, fertig:false,
      go:()=>{ document.body.classList.add('started'); if(typeof appOpenObject==='function')appOpenObject();window.scrollTo(0,0); cockpitUpdate(); }});
  }
  let pj=[]; try{ pj=pjLoad(); }catch(e){}
  pj.slice().sort((a,b)=>(''+b.id).localeCompare(''+a.id)).forEach(p=>{
    if(rows.length&&rows[0].name===p.name)return;
    let f=(p.data&&p.data.fields)||{};
    rows.push({name:p.name, ort:(f.ek_ort||'').trim(), typ:p.objekt||f.ek_vordruck||'', empf:p.empf||'', when:p.datum||'', voll:p.voll||null, fertig:!!(p.voll&&p.voll.n&&p.voll.ok>=p.voll.n),
      go:()=>projektLaden(p.id)});
  });
  rows=rows.slice(0,5);
  const esc=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  if(!rows.length){ el.innerHTML='<div class="recent-empty">Noch keine Bewertung vorhanden — mit „Neue Bewertung" geht es los.</div>'; return; }
  let h='<div class="rrow head"><div>Objekt</div><div>Vordruck</div><div>Stand</div><div>Preisempfehlung</div><div>Geändert</div><div></div></div>';
  rows.forEach((r,i)=>{
    let stand = r.fertig ? '<div class="done">'+iaSvg('check')+'Vollständig</div>'
              : r.voll&&r.voll.n ? '<div class="prog"><i><b style="width:'+Math.round(r.voll.ok/r.voll.n*100)+'%"></b></i>'+r.voll.ok+' / '+r.voll.n+'</div>'
              : '<div class="prog" style="color:var(--muted)">–</div>';
    h+='<div class="rrow" data-i="'+i+'"><div><div class="nm">'+esc(r.name)+'</div>'+(r.ort?'<div class="ort">'+esc(r.ort)+'</div>':'')+'</div>'+
       '<div class="typ">'+esc(r.typ||'–')+'</div>'+stand+'<div class="empf">'+(r.empf&&r.empf!=='0 €'?esc(r.empf):'<span style="color:var(--muted)">–</span>')+'</div>'+
       '<div class="when">'+esc(r.when)+'</div><div class="go">'+iaSvg('chevron-right')+'</div></div>';
  });
  el.innerHTML=h;
  el.querySelectorAll('.rrow[data-i]').forEach(r=>{ r.onclick=()=>rows[+r.dataset.i].go(); });
}
function startFoot(){
  let t='Alle Daten bleiben auf diesem Gerät.';
  setT('start_foot_t',t);
  try{ if(typeof mdbMGet==='function') mdbMGet('lastBackup').then(lb=>{ if(lb&&lb.ts) setT('start_foot_t','Alle Daten bleiben auf diesem Gerät · Letzte Sicherung des Marktüberblicks: '+new Date(lb.ts).toLocaleDateString('de-DE')); }).catch(()=>{}); }catch(e){}
  try{ pjSicherungsHinweis(); }catch(e){}
  try{ vmStartRender(); }catch(e){}
}
function startStep0(){
  KD_NEU_FUER=null; kdNeuHinweis();
  $('start-step0').style.display=''; $('start-step1').style.display='none';
  setT('start_greet', startGreeting());
  let n=0; try{ n=pjLoad().length; }catch(e){}
  setT('start-lead', new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})+(n?' · '+n+' gesicherte Projekt'+(n===1?'':'e'):''));
  startRecent(); startFoot();
  try{ aufStartRender(); aufBadge(); }catch(e){}
  window.scrollTo(0,0);
}
function startPreisermittlung(){
  kdNeuHinweis();
  $('start-step0').style.display='none'; $('start-step1').style.display='';
  window.scrollTo(0,0);
}
function showStart(){ document.body.classList.remove('started'); document.body.classList.remove('cp-open'); startStep0(); }

/* ---------- Beobachter: neu eingefügte Bereiche bekommen Icons und Einheiten ---------- */
new MutationObserver(ms=>{
  ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1&&!(n.tagName==='svg'||n.tagName==='SVG')){ iconify(n); unitsInField(n); a11yLabels(n); } }));
}).observe(document.body,{childList:true,subtree:true});

/* ---------- Objektsuche: Bewertungen (Projekte + aktuelle Arbeit) und Marktüberblick ---------- */
var SUCHE={offen:false,q:'',hits:[],aktiv:0,markt:[]};
function sNorm(s){ return (''+(s==null?'':s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss'); }
function sEsc(s){ return (''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
async function sucheOeffnen(){
  let o=$('suche'); if(!o)return;
  o.classList.add('on'); SUCHE.offen=true;
  let q=$('suche_q'); q.value=SUCHE.q||''; setTimeout(()=>{ q.focus(); q.select(); },30);
  sucheLauf();
  try{ SUCHE.markt=(typeof MDB_INIT!=='undefined'&&MDB_INIT)?MDBALL:await mdbAll(); }catch(e){ SUCHE.markt=[]; }
  if(SUCHE.offen) sucheLauf();
}
function sucheSchliessen(){ let o=$('suche'); if(o)o.classList.remove('on'); SUCHE.offen=false; }
function sucheQuellen(){
  let out=[];
  let cur=null; try{ cur=JSON.parse(localStorage.getItem('vb_wert2')); }catch(e){}
  if(cur&&cur.fields){
    let f=cur.fields;
    if((f.ek_anschrift||'').trim()||(f.ek_ort||'').trim()) out.push({typ:'bew',id:'__cur',
      titel:(f.ek_anschrift||'').trim()||'Aktuelle Bewertung', ort:(f.ek_ort||'').trim(),
      meta:[f.ek_vordruck||f.ek_typ||'', f.ek_ag?'Auftraggeber '+f.ek_ag:'', f.ek_baujahr?'Bj. '+f.ek_baujahr:'', f.ek_wohnflaeche?f.ek_wohnflaeche+' m²':''].filter(Boolean),
      preis:($('o_empfehlung')||{}).textContent||'', sub:'zuletzt geöffnet',
      hay:[f.ek_anschrift,f.ek_ort,f.ek_ag,f.ek_typ,f.ek_wtyp,f.ek_vordruck,f.ek_nutzung,f.ek_baujahr,f.ek_wohnflaeche,f.ek_flst,'bewertung'].join(' '), ts:Date.now(),
      go:()=>{ sucheSchliessen(); if(typeof mdbClose==='function')mdbClose(); document.body.classList.add('started'); if(typeof appOpenObject==='function')appOpenObject();window.scrollTo(0,0); cockpitUpdate(); }});
  }
  let pj=[]; try{ pj=pjLoad(); }catch(e){}
  pj.forEach(p=>{
    let f=(p.data&&p.data.fields)||{};
    if(out.length&&out[0].id==='__cur'&&out[0].titel===p.name)return;
    out.push({typ:'bew',id:p.id, titel:p.name, ort:(f.ek_ort||'').trim(),
      meta:[p.objekt||f.ek_vordruck||'', f.ek_ag?'Auftraggeber '+f.ek_ag:'', f.ek_baujahr?'Bj. '+f.ek_baujahr:'', f.ek_wohnflaeche?f.ek_wohnflaeche+' m²':''].filter(Boolean),
      preis:p.empf||'', sub:p.datum||'',
      hay:[p.name,p.objekt,f.ek_anschrift,f.ek_ort,f.ek_ag,f.ek_typ,f.ek_wtyp,f.ek_vordruck,f.ek_nutzung,f.ek_baujahr,f.ek_wohnflaeche,f.ek_flst,'bewertung projekt'].join(' '), ts:parseInt((''+p.id).slice(1))||0,
      go:()=>{ sucheSchliessen(); if(typeof mdbClose==='function')mdbClose(); projektLaden(p.id); }});
  });
  (typeof KD_CACHE!=='undefined'?KD_CACHE:[]).forEach(k=>{
    out.push({typ:'kunde',id:k.id,titel:kdName(k),ort:k.plzort||'',meta:[k.telefon,k.email].filter(Boolean),preis:'',sub:'Kunde',
      hay:[kdName(k),k.firma,k.plzort,k.strasse,k.telefon,k.email,'kunde'].join(' '),ts:k.geaendert||0,
      go:()=>{ sucheSchliessen(); if(typeof mdbClose==='function')mdbClose(); kdOeffnen(k.id); }});
  });
  (SUCHE.markt||[]).forEach(o=>{
    let d=mdbDeriv(o);
    out.push({typ:'markt',id:o.id, titel:(o.strasse||'').trim()||'ohne Straße', ort:[o.plz,o.gemeinde,o.ortsteil].filter(Boolean).join(' '),
      meta:[o.art||'', o.baujahr?'Bj. '+o.baujahr:'', d.wf?mdbInt(d.wf)+' m²':'', d.eurm2?mdbInt(d.eurm2)+' €/m²':''].filter(Boolean),
      preis:d.wert?mdbEur(d.wert):'', sub:(d.basis==='KP'?'Kaufpreis':'Angebot')+(o.status?' · '+o.status:''),
      hay:[o.strasse,o.gemeinde,o.ortsteil,o.plz,o.art,o.zustand,o.heizung,o.quelle,o.status,o.notiz,o.url,o.baujahr,o.wohnflaeche,o.preis,o.kaufpreis,'markt'].join(' '), ts:o.ts||0,
      go:()=>{ sucheSchliessen(); mdbOeffnen().then(()=>mdbBearbeiten(o.id)); }});
  });
  return out;
}
function sucheLauf(){
  let q=($('suche_q')||{}).value||''; SUCHE.q=q;
  let tokens=sNorm(q).split(/\s+/).filter(Boolean);
  let alle=sucheQuellen(), hits=[];
  if(!tokens.length){ hits=alle.sort((a,b)=>b.ts-a.ts).slice(0,8); hits.forEach(h=>h.score=0); }
  else{
    alle.forEach(h=>{
      let hay=sNorm(h.hay), tit=sNorm(h.titel+' '+h.ort), s=0;
      for(const t of tokens){ if(hay.indexOf(t)<0){ s=-1; break; } s+= tit.indexOf(t)===0?30 : tit.indexOf(t)>=0?20 : 5; }
      if(s>=0){ h.score=s; hits.push(h); }
    });
    hits.sort((a,b)=>b.score-a.score||b.ts-a.ts);
  }
  let bew=hits.filter(h=>h.typ==='bew').slice(0,8), kd=hits.filter(h=>h.typ==='kunde').slice(0,6), markt=hits.filter(h=>h.typ==='markt').slice(0,8);
  SUCHE.hits=bew.concat(kd,markt); SUCHE.aktiv=0;
  sucheRender(tokens,bew.length,markt.length,kd.length);
}
function sucheMark(text,tokens){
  let s=sEsc(text); if(!tokens.length)return s;
  tokens.forEach(t=>{ if(t.length<2)return; let re=new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'); s=s.replace(re,'<mark class="hl">$1</mark>'); });
  return s;
}
function sucheRender(tokens,nBew,nMarkt,nKd){
  let el=$('suche_liste'), hits=SUCHE.hits;
  if(!hits.length){
    el.innerHTML='<div class="suche-leer">'+(SUCHE.q?'Keine Treffer für „'+sEsc(SUCHE.q)+'".<br>Gesucht wird in Adresse, Ort, Auftraggeber, Objektart, Baujahr, Fläche, Preis und Notizen.':'Noch keine Objekte vorhanden. Bewertungen erscheinen hier, sobald sie als Projekt gesichert sind; Marktobjekte, sobald sie erfasst sind.')+'</div>';
    return;
  }
  const row=(h,i)=>'<div class="suche-row'+(i===SUCHE.aktiv?' aktiv':'')+'" data-i="'+i+'">'+
    '<div class="ico'+(h.typ==='markt'?' markt':'')+'">'+iaSvg(h.typ==='markt'?'chart':h.typ==='kunde'?'users':'file-text')+'</div>'+
    '<div class="txt"><div class="t">'+sucheMark(h.titel,tokens)+(h.ort?' <span class="o">· '+sucheMark(h.ort,tokens)+'</span>':'')+'</div>'+
    '<div class="m">'+sEsc(h.meta.join(' · '))+'</div></div>'+
    '<div class="r"><b>'+(h.preis&&h.preis!=='0 €'?sEsc(h.preis):'')+'</b><span>'+sEsc(h.sub)+'</span></div></div>';
  let h='', i=0;
  if(nBew){ h+='<div class="suche-grp">Bewertungen<em>'+nBew+'</em></div>'; for(let k=0;k<nBew;k++){ h+=row(hits[i],i); i++; } }
  if(nKd){ h+='<div class="suche-grp">Kunden<em>'+nKd+'</em></div>'; for(let k=0;k<nKd;k++){ h+=row(hits[i],i); i++; } }
  if(nMarkt){ h+='<div class="suche-grp">Marktüberblick<em>'+nMarkt+'</em></div>'; for(let k=0;k<nMarkt;k++){ h+=row(hits[i],i); i++; } }
  el.innerHTML=h;
  el.querySelectorAll('.suche-row').forEach(r=>{
    r.onclick=()=>SUCHE.hits[+r.dataset.i].go();
    r.onmousemove=()=>{ if(SUCHE.aktiv!==+r.dataset.i){ SUCHE.aktiv=+r.dataset.i; sucheAktiv(false); } };
  });
}
function sucheAktiv(scrollen){
  $('suche_liste').querySelectorAll('.suche-row').forEach(x=>{ let on=+x.dataset.i===SUCHE.aktiv; x.classList.toggle('aktiv',on); if(on&&scrollen!==false) appScrollIntoView(x,{block:'nearest'}); });
}
function sucheTaste(e){
  let n=SUCHE.hits.length;
  if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ SUCHE.aktiv=(SUCHE.aktiv+1)%n; sucheAktiv(); } }
  else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ SUCHE.aktiv=(SUCHE.aktiv-1+n)%n; sucheAktiv(); } }
  else if(e.key==='Enter'){ e.preventDefault(); if(n) SUCHE.hits[SUCHE.aktiv].go(); }
  else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sucheSchliessen(); }
}
document.addEventListener('keydown',e=>{
  let tag=(e.target.tagName||'').toLowerCase(), inFeld=tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable;
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); SUCHE.offen?sucheSchliessen():sucheOeffnen(); }
  else if(e.key==='/'&&!inFeld&&!SUCHE.offen){ e.preventDefault(); sucheOeffnen(); }
});
['input','change'].forEach(ev=>{ let s=$('suche'); if(s) s.addEventListener(ev,e=>e.stopPropagation()); });


/* ---------- Datenschutz-Hinweis (gebuendelt an einer Stelle statt verstreut) ---------- */
function dsgvoOeffnen(){ let o=$('dsgvo_overlay'); if(o)o.classList.add('on'); }
function dsgvoSchliessen(){ let o=$('dsgvo_overlay'); if(o)o.classList.remove('on'); }
