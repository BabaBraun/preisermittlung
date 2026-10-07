/* ---------- Kachel „Eckdaten übernehmen“ (D64) ----------
   Claude (oder wer die Objektunterlagen liest) liefert nach der Anleitung der Kachel eine Eckdaten-Datei. Die Kachel zeigt jeden Wert mit
   Quelle und Prüfhinweis; man hakt an, was gilt, und legt daraus eine NEUE Bewertung an. Vorhandene Bewertungen bleiben unverändert:
   Eine angefangene wird vorher als Projekt gesichert (wie „Neue Bewertung“ aus der Kundenakte), dann beginnt ein leeres Formular
   (neuOhneFrage) und übernimmt nach dem Neustart die gewählten Werte (sessionStorage „ia_uebernahme“, danach gelöscht). Angaben des
   Aufnahmebogens gehen über dessen eigene Übertragung (auUebertragen) in die Bewertung — wie beim Eintippen.
   Die neue Bewertung wird gleich als Projekt gesichert; ein Quellennachweis (Angabe, Wert, Quelle, sicher) liegt im Speicher „akten“
   (art 'uebernahme') — ohne Personen. Die Datei selbst wird nicht gespeichert. Prüfung und Umsetzung: js/uebernahme-regeln.js. */
var ED={datei:null,dateiName:'',erg:null,wahl:{},objektart:'',typ:'',name:'',kunde:'',rlAktiv:false,fehler:'',zeigen:null,text:''};
const ED_SITZUNG='ia_uebernahme';
const ED_MAX=2*1024*1024;
function edR(){ return window.ImmoUebernahmeRegeln; }
function edGruppeTitel(g){ let x=edR().GRUPPEN.find(z=>z[0]===g); return x?x[1]:g; }

/* ---------- Datei laden und prüfen ---------- */
function edDateiWaehlen(){ let i=$('ed_datei'); if(i){ i.value=''; i.click(); } }
function edDatei(files){
  let f=files&&files[0]; if(!f) return;
  if(f.size>ED_MAX){ ED.fehler='Die Datei ist zu groß für eine Eckdaten-Datei ('+iaMB(f.size)+').'; wzZeichnen(); return; }
  let r=new FileReader();
  r.onload=()=>edLesen(String(r.result||''),f.name);
  r.onerror=()=>{ ED.fehler='Die Datei konnte nicht gelesen werden.'; wzZeichnen(); };
  r.readAsText(f);
}
function edTextPruefen(){ let t=$('ed_text'); edLesen(t?t.value:'','eingefügter Text'); }
/* JSON aus der Antwort von Claude: auch mit ```json-Umrandung oder Text davor und danach */
function edJson(text){
  let t=String(text||'').trim(), m=t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if(m) t=m[1].trim();
  if(t[0]!=='{'){ let a=t.indexOf('{'), b=t.lastIndexOf('}'); if(a>=0&&b>a) t=t.slice(a,b+1); }
  try{ return {ok:true,wert:JSON.parse(t)}; }catch(e){ return {ok:false}; }
}
function edLesen(text,name){
  ED.fehler='';
  if(!String(text||'').trim()){ ED.fehler='Es wurde nichts eingefügt.'; wzZeichnen(); return; }
  let j=edJson(text);
  if(!j.ok){ ED.fehler='Das ist keine lesbare Eckdaten-Datei (kein gültiges JSON).'; wzZeichnen(); return; }
  let art=edR().objektart(j.wert&&j.wert.objektart);
  let erg=edR().pruefen(j.wert,{heute:aufHeute(),objektart:art});
  if(!erg.ok){ ED.fehler=erg.fehler; wzZeichnen(); return; }
  Object.assign(ED,{datei:j.wert,dateiName:name||'',erg,wahl:{},objektart:erg.objektart||'wohnhaus',typ:erg.typ||'',name:erg.objekt||'',kunde:'',
    rlAktiv:false,text:'',zeigen:null});
  if(erg.objektart!==ED.objektart) ED.erg=edR().pruefen(ED.datei,{heute:aufHeute(),objektart:ED.objektart});
  wzZeichnen(); let ov=$('wz_overlay'); if(ov) ov.scrollTop=0;
}
function edVerwerfen(){ Object.assign(ED,{datei:null,dateiName:'',erg:null,wahl:{},fehler:'',zeigen:null}); wzZeichnen(); }
/* Objektart geändert (Feld mit data-zeichnen): Prüfung neu, damit „nur für Häuser/Wohnungen“ stimmt */
function edNeuPruefen(){ if(ED.datei) ED.erg=edR().pruefen(ED.datei,{heute:aufHeute(),objektart:ED.objektart}); }
function edWahl(key,an){ ED.wahl[key]=!!an; edRechnen(); }
function edAlle(an){
  let e=ED.erg; if(!e) return;
  ED.wahl={}; if(!an) [].concat(e.eintraege,e.geschosse,e.raeume).forEach(x=>{ ED.wahl[x.key]=false; });
  wzZeichnen();
}
function edAnleitungKopieren(knopf){ grKopieren(edR().anleitung(),knopf,'Anleitung kopiert ✓'); }
function edKunde(){ wzdKundeWaehlen(id=>{ ED.kunde=id; wzZeichnen(); }); }

/* ---------- Neue Bewertung anlegen ---------- */
function edNameFrei(b){
  let tag=edR().deDatum(aufHeute());
  b=String(b||'').replace(/\s+/g,' ').trim().slice(0,120)||'Übernahme '+tag;
  let namen=new Set(pjLoad().map(p=>p.name)); if(!namen.has(b)) return b;
  let n=b+' (Übernahme '+tag+')', i=2;
  while(namen.has(n)) n=b+' (Übernahme '+tag+', '+(i++)+')';
  return n;
}
function edAkteDaten(erg){
  const an=e=>edR().gewaehlt(e,ED.wahl);
  return {datei:ED.dateiName,am:aufHeute(),
    eintraege:erg.eintraege.filter(an).map(e=>({gruppe:e.gruppe,label:e.label,anzeige:e.anzeige,quelle:e.quelle,sicher:e.sicher,hinweis:e.hinweis})),
    geschosse:erg.geschosse.filter(an).map(g=>({name:g.name,anzeige:g.anzeige,quelle:g.quelle,sicher:g.sicher})),
    raeume:erg.raeume.filter(an).map(r=>({name:r.name,geschoss:r.geschoss,anzeige:r.anzeige,quelle:r.quelle,sicher:r.sicher})),
    nichtUebernommen:[].concat(erg.eintraege,erg.geschosse,erg.raeume).filter(e=>!an(e)).length,
    widersprueche:erg.widersprueche,fehlt:erg.fehlt,hinweise:erg.hinweise,unterlagen:erg.unterlagen};
}
async function edAnlegen(){
  let erg=ED.erg; if(!erg) return;
  let a=edR().anwenden(erg,ED.wahl), art=edR().OBJEKTARTEN.find(x=>x[0]===ED.objektart);
  if(!art){ alert('Bitte die Objektart wählen.'); return; }
  if(!a.n){ alert('Es ist nichts zum Übernehmen angehakt.'); return; }
  await IA_BEREIT_P;
  if(!IA_DB_BEREIT){ alert('Dafür braucht die App die Gerätedatenbank, die in diesem Browserfenster nicht zur Verfügung steht (z. B. privates Fenster).'); return; }
  let wunsch=ED.name||erg.objekt||a.felder.ek_anschrift||'';
  if(bewertungAngefangen()){
    let alt=(exV('pj_name')||exV('ek_anschrift')||'Wertermittlung '+new Date().toLocaleString('de-DE')).trim();
    if(!confirm('Die angefangene Bewertung „'+alt+'“ wird als Projekt gesichert. Danach wird eine neue Bewertung mit '+a.n+' übernommenen Angaben angelegt.')) return;
    if(!exV('pj_name')&&!exV('ek_anschrift')) $('pj_name').value=alt;
    await projektSichern();
  } else if(!confirm('Neue Bewertung mit '+a.n+' übernommenen Angaben anlegen? Sie wird gleich als Projekt gesichert.')) return;
  let name=edNameFrei(wunsch);   // erst nach dem Sichern der angefangenen Bewertung, sonst gäbe es den Namen zweimal
  let p={vordruck:art[1],typ:art[3]==='haus'?ED.typ:'',felder:a.felder,raeume:a.raeume,rlAktiv:!!(ED.rlAktiv&&a.raeume.length),portal:a.portal,
    kunde:ED.kunde||'',name,n:a.n,akte:Object.assign({objekt:name},edAkteDaten(erg))};
  try{ sessionStorage.setItem(ED_SITZUNG,JSON.stringify(p)); }
  catch(e){ alert('Die Übernahme konnte nicht vorbereitet werden ('+(e&&e.message||e)+').'); return; }
  wzSchliessen();
  await neuOhneFrage();
}
/* Neue Bewertung mit Namen sichern, ohne Rückfrage (wie projektSichern, aber eigene Id: die Testuhr steht still) */
async function edProjektSichern(name){
  if(!IA_DB_BEREIT) return null;
  let eintrag={id:'p'+Date.now()+Math.random().toString(36).slice(2,6),name,objekt:($('ek_typ').value||$('ek_wtyp').value||''),
    datum:new Date().toLocaleDateString('de-DE'),empf:(($('o_empfehlung')||{}).textContent||''),
    voll:(function(){ try{ let v=voll(); return {ok:v.ok,n:v.n}; }catch(e){ return null; } })(),geaendert:Date.now(),data:snapshot()};
  try{ await iaPut('projekte',eintrag); }
  catch(e){ alert('Die neue Bewertung konnte nicht gesichert werden: '+iaFehlerText(e)+'.\nBitte über „Projekte“ sichern.'); return null; }
  pjCacheSetzen(eintrag); return eintrag.id;
}
/* Nach dem Neustart mit leerem Formular: Objektart, Werte, Raumliste, Kunde; dann sichern und Quellennachweis ablegen */
async function edNachNeustart(){
  let p=null; try{ p=JSON.parse(sessionStorage.getItem(ED_SITZUNG)||'null'); sessionStorage.removeItem(ED_SITZUNG); }catch(e){}
  if(!p||!p.vordruck) return;
  try{ await IA_BEREIT_P; }catch(e){}
  if(typeof KD_NEU_FUER!=='undefined') KD_NEU_FUER=null;
  if(pickVordruck(p.vordruck)===false) return;   // src/app-shell.js ersetzt pickVordruck (ohne Rückgabe, öffnet die Bewertung)
  if(p.typ&&typeof TYPES!=='undefined'&&TYPES[p.typ]){ $('ek_typ').value=p.typ; typWechsel(); }
  let f=p.felder||{}, au=Object.keys(f).filter(k=>/^au_/.test(k));
  apply(f);
  au.forEach(k=>{ try{ auUebertragen(k); }catch(e){} });   // wie beim Eintippen im Aufnahmebogen
  let rest={}; Object.keys(f).filter(k=>!/^au_/.test(k)).forEach(k=>{ rest[k]=f[k]; });
  apply(rest);                                              // ausdrücklich übernommene Angaben gehen vor
  if(Array.isArray(p.raeume)&&p.raeume.length) rlSchreiben(p.raeume);
  if(p.rlAktiv&&$('rl_aktiv')) $('rl_aktiv').checked=true;
  try{ auModAnzeige(); }catch(e){}
  compute();
  if(p.kunde&&typeof KD_CACHE!=='undefined'&&KD_CACHE.some(k=>k.id===p.kunde)) kdAktuelleZuordnen(p.kunde);
  $('pj_name').value=p.name||'';
  autosave();
  let pid=await edProjektSichern(p.name||'Übernahme');
  if(pid){
    if(p.portal&&Object.keys(p.portal).length){
      let P=wzZustand('portal'); if(!P.objekte||typeof P.objekte!=='object') P.objekte={};
      P.objekte[pid]=Object.assign({},P.objekte[pid],p.portal); wzSpeichernJetzt();
    }
    await wzdLaden(); await wzdSpeichern('akten',wzdAkteNeu('uebernahme',Object.assign({projektId:pid},p.akte||{})));
  }
  if(typeof appOpenObject==='function') appOpenObject();
  window.scrollTo(0,0);
  let fehlt=((p.akte||{}).fehlt||[]).length;
  alert('Neue Bewertung „'+(p.name||'')+'“ angelegt'+(pid?' und gesichert':'')+': '+(p.n||0)+' Angaben übernommen.\n'
    +'Bitte alles prüfen — die Quellen stehen in der Kachel „Eckdaten übernehmen“.'+(fehlt?'\nIn den Unterlagen fehlten '+fehlt+' Angabe'+(fehlt===1?'':'n')+' (siehe Quellennachweis).':''));
}
window.addEventListener('load',()=>{ edNachNeustart().catch(e=>{ console.error('Eckdaten übernehmen',e);
  alert('Die Übernahme der Eckdaten ist nicht vollständig gelungen ('+(e&&e.message||e)+'). Bitte die Bewertung prüfen und über „Projekte“ sichern.'); }); });

/* ---------- Quellennachweis einer früheren Übernahme ---------- */
function edZeigen(id){ ED.zeigen=id; wzZeichnen(); let ov=$('wz_overlay'); if(ov) ov.scrollTop=0; }
function edZurueck(){ ED.zeigen=null; wzZeichnen(); }
async function edAkteLoeschen(){
  let r=wzdAkten('uebernahme').find(x=>x.id===ED.zeigen); if(!r) return;
  if(!confirm('Den Quellennachweis zu „'+(r.objekt||'Objekt')+'“ löschen? Die Bewertung bleibt unverändert.')) return;
  if(await wzdLoeschen('akten',r.id)){ ED.zeigen=null; wzZeichnen(); }
}
function edBewertungOeffnen(pid){ if(!pjLoad().some(p=>p.id===pid)){ alert('Diese Bewertung gibt es nicht mehr.'); return; } wzSchliessen(); projektLaden(pid); }

/* ---------- Ansicht ---------- */
function edWarnHtml(e){
  return (e.quelle?'<span>'+sEsc(e.quelle)+'</span>':'<i>ohne Quelle</i>')+(e.hinweis?'<div class="ed-hinweis">'+sEsc(e.hinweis)+'</div>':'')
    +(e.warnungen||[]).map(w=>'<div class="ed-w">'+sEsc(w)+'</div>').join('');
}
function edZeile(e,label){
  let an=edR().gewaehlt(e,ED.wahl);
  return '<tr class="'+(e.warnungen.length?'ed-warn':'')+'"><td class="ed-wahl"><input type="checkbox" aria-label="'+sEsc(label)+' übernehmen"'+(an?' checked':'')
    +' onchange="edWahl(\''+e.key+'\',this.checked)"></td><td class="ed-label">'+sEsc(label)+'</td>'
    +'<td class="ed-wert">'+(e.typ==='lang'?'<div class="ed-lang">'+sEsc(e.anzeige)+'</div>':sEsc(e.anzeige))+'</td><td class="ed-quelle">'+edWarnHtml(e)+'</td></tr>';
}
function edTabelle(zeilen){ return '<table class="ed-tab"><thead><tr><th scope="col" aria-label="übernehmen"></th><th>Angabe</th><th>Wert</th><th>Quelle</th></tr></thead><tbody>'+zeilen.join('')+'</tbody></table>'; }
function edListe(titel,l,stufe){ return l.length?wzBox(titel,'<ul class="wz-liste">'+l.map(t=>'<li>'+sEsc(t)+'</li>').join('')+'</ul>',{klasse:stufe?'ed-'+stufe:''}):''; }
function edKpisHtml(){
  let z=edR().zaehlen(ED.erg,ED.wahl);
  return wzdKpi('In der Datei',String(z.gesamt),'Angaben')+wzdKpi('Angehakt',String(z.gewaehlt),'werden übernommen')
    +wzdKpi('Prüfen',String(z.warnungen),'mit Hinweis')+wzdKpi('Verworfen',String(z.verworfen),z.verworfen?'siehe unten':'');
}
function edRechnen(){
  if(!ED.erg||ED.zeigen) return;
  wzH('ed_kpis',edKpisHtml());
  let n=edR().anwenden(ED.erg,ED.wahl).n, k=$('ed_anlegen');
  if(k){ k.textContent='Als neue Bewertung anlegen ('+n+')'; k.disabled=!n; }
}
function edStartHtml(){
  let akten=wzdAkten('uebernahme').slice().sort((a,b)=>(b.ts||0)-(a.ts||0)), projekte=new Set(pjLoad().map(p=>p.id));
  return (ED.fehler?wzAmpel('rot',sEsc(ED.fehler)):'')
    +wzBox('So geht es','<ol class="ed-schritte"><li>Objektunterlagen sammeln (Grundbuch, Flurkarte, Baubeschreibung, Wohnflächenberechnung, Grundrisse, Energieausweis, '
        +'Teilungserklärung, Mietaufstellung, Modernisierungen). Namen, Geburtsdaten und Kontonummern vorher schwärzen.</li>'
        +'<li>„Anleitung für Claude“ kopieren und zusammen mit den Unterlagen an Claude geben. Claude liefert eine Eckdaten-Datei mit Quelle je Wert.</li>'
        +'<li>Die Datei hier laden oder ihren Inhalt einfügen, jede Angabe mit Quelle prüfen und daraus eine neue Bewertung anlegen.</li></ol>'
      +'<input type="file" id="ed_datei" accept=".json,application/json,text/plain" style="display:none" onchange="edDatei(this.files)">'
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="edDateiWaehlen()" data-ic="upload">Eckdaten-Datei laden</button>'
      +'<button type="button" class="secondary" onclick="edAnleitungKopieren(this)" data-ic="clipboard">Anleitung für Claude kopieren</button>'
      +'<button type="button" class="secondary" onclick="wzOeffnen(\'schwaerzen\')" data-ic="file">PDF schwärzen</button></div>'
      +wzAmpel('gelb','Datenschutz: Was Claude liest, wird zur Verarbeitung an Anthropic übertragen. Ob echte Kundenunterlagen so verarbeitet werden dürfen, '
        +'mit dem Datenschutzbeauftragten der Bank klären — bis dahin nur geschwärzte Unterlagen verwenden.'))
    +wzBox('Antwort einfügen','<textarea id="ed_text" rows="5" aria-label="Eckdaten-Datei als Text" placeholder="Antwort von Claude hier einfügen (der Teil mit { &quot;immoapp_eckdaten&quot;: 1, … })"></textarea>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="edTextPruefen()" data-ic="check">Prüfen</button></div>'
      +wzHinweis('Am Handy: Antwort in der Claude-App kopieren und hier einfügen.'))
    +wzBox('Bisherige Übernahmen',akten.length?'<div class="kd-karten">'+akten.map(r=>'<div class="kd-karte"><div><b>'+sEsc(r.objekt||'Objekt')+'</b><span>'
        +sEsc(wzDatum(r.am)+' · '+(r.eintraege||[]).length+' Angaben'+((r.geschosse||[]).length?' · '+r.geschosse.length+' Geschosse':'')+((r.raeume||[]).length?' · '+r.raeume.length+' Räume':'')
        +(projekte.has(r.projektId)?'':' · Bewertung gelöscht'))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="edZeigen(\''+idSicher(r.id)+'\')">Quellen</button>'
      +(projekte.has(r.projektId)?'<button class="secondary" onclick="edBewertungOeffnen(\''+idSicher(r.projektId)+'\')">Bewertung öffnen</button>':'')+'</div></div>').join('')+'</div>'
      :wzHinweis('Noch keine Übernahme. Jede neue Bewertung aus einer Eckdaten-Datei erscheint hier mit ihrem Quellennachweis.'));
}
function edPruefHtml(){
  let e=ED.erg, R=edR(), haus=R.modusVon(ED.objektart)==='haus', n=R.anwenden(e,ED.wahl).n;
  let gruppen=R.GRUPPEN.map(([g,t])=>{ let l=e.eintraege.filter(x=>x.gruppe===g); return l.length?wzBox(t,edTabelle(l.map(x=>edZeile(x,x.label)))
      +(g==='energie'&&l.some(x=>/^ex_ea_(art|wert|klasse)$/.test(x.feld))?wzHinweis('Art, Kennwert und Klasse stehen danach auch im Aufnahmebogen und in den Objektdaten.'):'')
      +(g==='modernisierung'?wzHinweis('Die Punkte nach Anlage 2 ImmoWertV setzt die Bewertung daraus: vollständig erneuert = Höchstpunkte, nicht modernisiert = 0, teilweise trägst du selbst ein.'):'')):''; }).join('');
  let bgf=e.geschosse.length?wzBox('Bruttogrundfläche je Geschoss',edTabelle(e.geschosse.map(g=>edZeile(g,g.name)))):'';
  let raeume=e.raeume.length?wzBox('Räume für die Raumliste (WoFlV)',edTabelle(e.raeume.map(r=>edZeile(r,r.name+(r.geschoss?' ('+r.geschoss+')':''))))
      +wzHinweis('Anrechnung je Raum steht hinter der Fläche; ohne Angabe in der Datei aus dem Raumnamen vorgeschlagen.')):'';
  let verworfen=e.verworfen.length?wzBox('Nicht übernehmbar ('+e.verworfen.length+')','<ul class="wz-liste">'+e.verworfen.map(v=>'<li><b>'+sEsc(v.was)+'</b>: '+sEsc(v.grund)+'</li>').join('')+'</ul>'):'';
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="edVerwerfen()" data-ic="arrow-left">Andere Datei</button>'
      +'<span class="ub-status">'+sEsc(ED.dateiName||'Eckdaten')+(e.objekt?' · '+sEsc(e.objekt):'')+'</span></div>'
    +'<div class="wz-kpis grid" id="ed_kpis">'+edKpisHtml()+'</div>'
    +e.widersprueche.map(t=>wzAmpel('gelb','Widerspruch in den Unterlagen: '+sEsc(t))).join('')
    +(e.typWarnung?wzAmpel('gelb',sEsc(e.typWarnung)):'')
    +wzBox('Neue Bewertung','<div class="grid">'
        +wzFeld('objektart','Objektart',{typ:'wahl',zeichnen:true,optionen:R.OBJEKTARTEN.map(a=>[a[0],a[2]])})
        +(haus?wzFeld('typ','Gebäudetyp',{typ:'wahl',optionen:[['','wie bei der Objektart']].concat(R.TYPEN.map(t=>[t,t]))}):'')
        +wzFeld('name','Name des Projekts',{ph:'z. B. Anschrift'})+'</div>'
      +(e.raeume.length?'<div class="grid">'+wzFeld('rlAktiv','Wohnfläche aus der Raumliste berechnen (statt der Wohnfläche aus der Datei)',{typ:'check',voll:true})+'</div>':'')
      +'<div class="gr-zeile">'+(ED.kunde&&wzdKunde(ED.kunde)?'<span class="ub-status">Kunde: '+sEsc(wzdKundeName(ED.kunde))+'</span>'
          +'<button type="button" class="secondary" onclick="ED.kunde=\'\';wzZeichnen()">Kunde entfernen</button>'
        :'<button type="button" class="secondary" onclick="edKunde()" data-ic="users">Kunde aus der Kundenakte</button>')+'</div>'
      +wzHinweis('Angehakt sind sichere Angaben mit Quelle, die zur Objektart passen. Unsichere, ohne Quelle oder mit Hinweis hakst du nach Prüfung selbst an. '
        +'Eine angefangene Bewertung wird vorher als Projekt gesichert; bestehende Bewertungen bleiben unverändert.')
      +'<div class="gr-zeile"><button type="button" class="primary" id="ed_anlegen" onclick="edAnlegen()" data-ic="check"'+(n?'':' disabled')+'>Als neue Bewertung anlegen ('+n+')</button>'
      +'<button type="button" class="secondary" onclick="edAlle(true)">Vorauswahl</button><button type="button" class="secondary" onclick="edAlle(false)">Nichts anhaken</button></div>')
    +gruppen+bgf+raeume
    +edListe('In den Unterlagen nicht gefunden',e.fehlt)+edListe('Hinweise',e.hinweise)+verworfen
    +(e.unterlagen.length?wzBox('','<details class="ka-nachweis-aendern"><summary>Gelesene Unterlagen ('+e.unterlagen.length+')</summary><ul class="wz-liste">'
      +e.unterlagen.map(t=>'<li>'+sEsc(t)+'</li>').join('')+'</ul></details>'):'');
}
function edNachweisTabellen(r){
  let R=edR(), z=[];
  R.GRUPPEN.forEach(([g,t])=>{ let l=(r.eintraege||[]).filter(x=>x.gruppe===g); if(l.length) z.push('<h3>'+sEsc(t)+'</h3>'+wzDokTabelle(l.map(x=>[sEsc(x.label),sEsc(x.anzeige),
    sEsc(x.quelle||'ohne Quelle')+(x.sicher?'':' (unsicher)')]),['Angabe','Wert','Quelle'])); });
  if((r.geschosse||[]).length) z.push('<h3>Bruttogrundfläche je Geschoss</h3>'+wzDokTabelle(r.geschosse.map(x=>[sEsc(x.name),sEsc(x.anzeige),sEsc(x.quelle||'ohne Quelle')+(x.sicher?'':' (unsicher)')]),['Geschoss','Fläche','Quelle']));
  if((r.raeume||[]).length) z.push('<h3>Räume</h3>'+wzDokTabelle(r.raeume.map(x=>[sEsc(x.name+(x.geschoss?' ('+x.geschoss+')':'')),sEsc(x.anzeige),sEsc(x.quelle||'ohne Quelle')+(x.sicher?'':' (unsicher)')]),['Raum','Fläche','Quelle']));
  const liste=(t,l)=>(l||[]).length?'<h3>'+t+'</h3><ul>'+l.map(x=>'<li>'+sEsc(x)+'</li>').join('')+'</ul>':'';
  return z.join('')+liste('Widersprüche in den Unterlagen',r.widersprueche)+liste('In den Unterlagen nicht gefunden',r.fehlt)+liste('Hinweise',r.hinweise)+liste('Gelesene Unterlagen',r.unterlagen);
}
function edZeigenHtml(r){
  let da=pjLoad().some(p=>p.id===r.projektId);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="edZurueck()" data-ic="arrow-left">Alle Übernahmen</button>'
      +'<span class="ub-status">'+sEsc(r.objekt||'Objekt')+'</span><button type="button" class="secondary" onclick="edAkteLoeschen()" data-ic="trash">Löschen</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Übernommen am',wzDatum(r.am),r.datei||'')+wzdKpi('Angaben',String((r.eintraege||[]).length+(r.geschosse||[]).length+(r.raeume||[]).length),
        r.nichtUebernommen?r.nichtUebernommen+' nicht übernommen':'')+wzdKpi('Bewertung',da?'vorhanden':'gelöscht','')+'</div>'
    +'<div class="gr-zeile">'+(da?'<button type="button" class="primary" onclick="edBewertungOeffnen(\''+idSicher(r.projektId)+'\')" data-ic="home">Bewertung öffnen</button>':'')
      +'<button type="button" class="secondary" onclick="wzDokument()" data-ic="file-text">Quellennachweis als Dokument</button></div>'
    +wzHinweis('Stand bei der Übernahme. Was du danach in der Bewertung änderst, steht hier nicht.')
    +wzBox('',edNachweisTabellen(r),{klasse:'ed-nachweis'});
}
function edZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='uebernahme') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(ED.zeigen){ let r=wzdAkten('uebernahme').find(x=>x.id===ED.zeigen); if(r) return edZeigenHtml(r); ED.zeigen=null; }
  if(ED.erg){ let alt=ED.erg.objektart; if(alt!==ED.objektart) edNeuPruefen(); return edPruefHtml(); }
  return edStartHtml();
}
function edDokument(){
  let r=ED.zeigen?wzdAkten('uebernahme').find(x=>x.id===ED.zeigen):null;
  if(!r&&ED.erg) r=Object.assign({objekt:ED.name||ED.erg.objekt},edAkteDaten(ED.erg));
  if(!r){ alert('Erst eine Eckdaten-Datei laden oder eine frühere Übernahme öffnen.'); return null; }
  return {titel:'Quellennachweis '+(r.objekt||'Objekt'),ohneFuss:false,fuss:'Angaben aus den Objektunterlagen mit Quelle — vor der Verwendung prüfen.',
    html:'<h1>Quellennachweis der Eckdaten</h1><p>'+sEsc(r.objekt||'')+(r.am?' · übernommen am '+wzDatum(r.am):'')+'</p>'+edNachweisTabellen(r)};
}
wzRegistrieren({id:'uebernahme',titel:'Eckdaten übernehmen',sub:'Eckdaten aus den Objektunterlagen mit Quelle prüfen und als neue Bewertung anlegen',icon:'upload',ohneNeu:true,
  zustand:()=>ED,speichern:()=>{},zeichnen:edZeichnen,rechnen:edRechnen,dokument:edDokument,
  schliessen:()=>{ ED.zeigen=null; ED.fehler=''; }});
