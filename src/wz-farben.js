/* ---------- Farben (D40) ----------
   Farbschema der App wählen — nur Farben, Formen und Aufbau bleiben. Fünf Schemata, jeweils hell und dunkel
   (assets/farben.css); „Petrol“ ist das bisherige. Die Wahl gilt für dieses Gerät (localStorage „ia_farbe“) und wird schon
   im Kopf der Seite gesetzt, damit beim Start nichts aufblitzt. Hell, dunkel oder wie das Gerät: wie bisher („ia_theme“). */
const FA_SCHEMATA=[['petrol','Petrol','bisheriges Schema',['#08766b','#e8f4f0','#f4f6f6']],['blau','Blau','klar und sachlich',['#1a5cad','#e4edf8','#f3f5f9']],
  ['bordeaux','Bordeaux','warm, klassisch',['#94283a','#f7e8eb','#f7f4f4']],['graphit','Graphit','zurückhaltend, fast ohne Farbe',['#3d4955','#eaedf1','#f4f5f6']],
  ['wald','Waldgrün','ruhig, natürlich',['#2e6a2a','#e6f1e2','#f4f6f3']]];
function faAktuell(){ let f=''; try{ f=localStorage.getItem('ia_farbe')||''; }catch(e){} return FA_SCHEMATA.some(x=>x[0]===f)?f:'petrol'; }
function faSetzen(f){
  if(!FA_SCHEMATA.some(x=>x[0]===f)) f='petrol';
  if(f==='petrol') document.documentElement.removeAttribute('data-farbe'); else document.documentElement.setAttribute('data-farbe',f);
  try{ if(f==='petrol') localStorage.removeItem('ia_farbe'); else localStorage.setItem('ia_farbe',f); }catch(e){}
  try{ let m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--bg').trim()||m.getAttribute('content')); }catch(e){}
  if(WZ.aktiv==='farben') wzZeichnen();
}
function faHellDunkel(t){ if(t==='geraet'){ try{ localStorage.removeItem('ia_theme'); }catch(e){} themeApply(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); try{ localStorage.removeItem('ia_theme'); }catch(e){} }
  else themeApply(t); wzZeichnen(); }
function faZeichnen(){
  let f=faAktuell(), dunkel=document.documentElement.getAttribute('data-theme')==='dark', gespeichert=''; try{ gespeichert=localStorage.getItem('ia_theme')||''; }catch(e){}
  return wzBox('Farbschema','<div class="fa-raster">'+FA_SCHEMATA.map(([id,name,text,p])=>'<button type="button" class="fa-wahl'+(id===f?' on':'')+'" aria-pressed="'+(id===f)+'" onclick="faSetzen(\''+id+'\')">'
      +'<span class="fa-proben" aria-hidden="true">'+p.map(c=>'<i style="background:'+c+'"></i>').join('')+'</span><b>'+sEsc(name)+'</b><small>'+sEsc(text)+'</small></button>').join('')+'</div>'
      +wzHinweis('Nur die Farben ändern sich — Aufbau, Schriften und Formen bleiben. Bericht und Exposé bleiben weiße Dokumente. Die Wahl gilt für dieses Gerät.'))
    +wzBox('Hell oder dunkel','<div class="ka-schalter" role="group" aria-label="Hell oder dunkel">'
      +[['light','Hell'],['dark','Dunkel'],['geraet','wie das Gerät']].map(([t,n])=>{ let an=t==='geraet'?!gespeichert:(gespeichert===t);
        return '<button type="button" class="'+(an?'primary':'secondary')+'" aria-pressed="'+an+'" onclick="faHellDunkel(\''+t+'\')">'+n+'</button>'; }).join('')+'</div>'
      +wzHinweis('Zurzeit: '+(dunkel?'dunkel':'hell')+'.'));
}
function faRechnen(){ iconify($('wz_body')); }
wzRegistrieren({id:'farben',titel:'Farben',sub:'Farbschema und hell oder dunkel',icon:'sun',ohneNeu:true,zeichnen:faZeichnen,rechnen:faRechnen});
