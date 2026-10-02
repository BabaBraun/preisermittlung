modellUiInit();
/* ---------- Init ---------- */
Object.keys(TYPES).forEach(t=>{let o=document.createElement('option');o.textContent=t;$('ek_typ').appendChild(o);});
$('nhk_hg').innerHTML=buildNHK('nhkhg',false);   // GND/RND stehen in 2.2
$('nhk_an').innerHTML=buildNHK('nhkan',true);    // Anbau: eigenes Baujahr → eigene GND/RND
buildBGF('bgf_hg_tbl','bgfhg');
buildBGF('bgf_an_tbl','bgfan');
buildModPunkte();
buildMietrolle();
buildAufnahmeBauteile();
buildAufnahmeStandard();   // Aufnahmebogen: Standardstufen und Modernisierungen (D35)
buildUnterlagen();
buildVergleich();
buildMietspiegel();
buildWK();
buildRaumliste();
buildSanierung();
buildLageCheck();
vpFolienRender();
grListen();
rpListeRender();
kdAnzeige();
pqRender();
buildRefTable();
buildNav();
document.addEventListener('input',compute);
document.addEventListener('change',compute);
iaLockAutoStart();
let saved=localStorage.getItem('vb_wert2');
if(saved){
  try{let o=JSON.parse(saved);FOTOS_IN_DB=!!(o&&o.fotosInDb);restore(o);}catch(e){typWechsel();}
  modusWechsel();
  document.body.classList.add('started');   // gespeicherte Arbeit → direkt ins Formular
}else{
  $('ek_typ').value='Wohn-/Geschäftshaus (Mischnutzung)';typWechsel();modusWechsel();
  showStart();                               // frischer Start → Auswahlbildschirm
}
IA_BEREIT_P=iaSpeicherStart();   // Projekte und Fotos aus der Datenbank (übernimmt beim ersten Mal den Altbestand)
// Installations-Button anbieten, solange die App nicht als App läuft
// (iOS meldet kein 'beforeinstallprompt' – dort erklärt der Button den Weg über „Teilen")
if(!istInstalliert()) $('installBtn').style.display='inline-block';


/* ---------- Start ---------- */
(function(){
  try{
    let t=localStorage.getItem('ia_theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    themeApply(t);
  }catch(e){}
  iconify(document); unitsInField(document); a11yLabels(document); stepBadges();
  try{ aufBadge(); }catch(e){}
  buildNav(); cockpitUpdate();
  let ib=$('installBtn'); if(ib&&ib.style.display==='inline-block') ib.style.display='inline-flex';
  if(!document.body.classList.contains('started')) startStep0();
})();



appShellInit();
/* Neue Bewertung aus der Kundenakte: nach dem Neustart mit leerem Formular Objektart und Kunde übernehmen */
(async function(){
  let p=null; try{ p=JSON.parse(sessionStorage.getItem('ia_neu_fuer')||'null'); sessionStorage.removeItem('ia_neu_fuer'); }catch(e){}
  if(!p||!p.vordruck) return;
  try{ await IA_BEREIT_P; }catch(e){}
  pickVordruck(p.vordruck); if(p.kunde) kdAktuelleZuordnen(p.kunde);
})();
