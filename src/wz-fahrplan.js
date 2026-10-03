/* ---------- Kachel „Verkaufsfahrplan“ (D40) ----------
   Jeder Verkaufsauftrag Schritt für Schritt: Auftrag, Unterlagen, Vermarktung, Besichtigungen, Notar, Übergabe. Viele Schritte
   erkennt die App selbst aus den vorhandenen Daten (gesicherte Bewertung mit Fotos und Exposé, Vermarktungsstand, Portal-Export,
   Anfragen, Notarauftrag, Übergabeprotokoll); die übrigen hakt der Berater ab. Fortschritt je Auftrag, nächster offener Schritt,
   Wiedervorlage und eine Übersicht für den Eigentümer ohne Namen. Gespeichert werden nur Haken, Datum und Notiz je Schritt
   (Eingaben der Werkzeuge, keine Personen). Die Bewertungen werden nur gelesen. */
var FP={aktiv:null,extra:null,laeuft:null};
const FP_PHASEN=[
  ['Auftrag',[['bewertung','Bewertung erstellt','bewertung'],['maklervertrag','Maklervertrag in Textform geschlossen (§ 656a BGB)'],['unterlagen','Unterlagen beim Eigentümer angefordert','ul_angefordert']]],
  ['Unterlagen',[['grundbuch','Grundbuchauszug liegt vor','ul_grundbuch'],['flurkarte','Flurkarte oder Lageplan liegt vor','ul_flurkarte'],['energieausweis','Energieausweis mit allen Pflichtangaben','energie'],
    ['grundrisse','Grundrisse und Wohnflächenberechnung','grundrisse'],['baulasten','Auskunft aus dem Baulastenverzeichnis','ul_baulasten'],['weg','Teilungserklärung, Protokolle, Wirtschaftsplan (Wohnungseigentum)','ul_weg',1]]],
  ['Vermarktung',[['fotos','Fotos aufgenommen und bearbeitet','fotos'],['expose','Exposé erstellt','expose'],['preis','Angebotspreis mit dem Eigentümer abgestimmt','preis'],
    ['portal','Auf Immobilienportalen veröffentlicht','portal'],['gesuche','Vorgemerkte Interessenten informiert','gesuche']]],
  ['Besichtigungen und Angebote',[['besichtigung','Besichtigungen durchgeführt','besichtigung'],['bericht','Eigentümer über den Stand informiert','bericht'],
    ['finanzierung','Finanzierungsbestätigung des Käufers liegt vor'],['kaeufer','Käufer gefunden, Objekt reserviert','kaeufer']]],
  ['Notar',[['notarauftrag','Angaben an das Notariat übermittelt','notar1'],['entwurf','Vertragsentwurf liegt den Parteien vor','notar2'],['beurkundung','Kaufvertrag beurkundet','notar3']]],
  ['Übergabe und Abschluss',[['uebergabe','Übergabe mit Protokoll','uebergabe'],['provision','Provision abgerechnet und eingegangen','provision'],['nachbetreuung','Nachbetreuung: Glückwunsch, Löschprüfung in der Kundenakte gesetzt']]]
];
const FP_STAENDE=['Akquise','Auftrag erteilt','In Vermarktung','Reserviert','Notartermin','Verkauft'];
const FP_UL="wzOeffnen('unterlagen');ulOeffnen(FP.aktiv)";
const FP_LINK={unterlagen:FP_UL,grundbuch:FP_UL,flurkarte:FP_UL,baulasten:FP_UL,weg:FP_UL,fotos:"wzOeffnen('foto')",portal:"wzOeffnen('portal')",gesuche:"wzOeffnen('interessenten');vgSetz('ansicht','abgleich')",
  bericht:"wzOeffnen('eigentuemerbericht');ebObjekt(FP.aktiv)",notarauftrag:"wzOeffnen('notar')",entwurf:"wzOeffnen('notar')",uebergabe:"wzOeffnen('uebergabe')",nachbetreuung:"vlOeffnenMit({vorlage:'glueckwunsch',projektId:FP.aktiv})"};
function fpS(){ let a=wzAlle(); if(!a.fahrplan||typeof a.fahrplan!=='object'||Array.isArray(a.fahrplan)) a.fahrplan={}; return a.fahrplan; }
function fpLaden(){
  if(!FP.laeuft) FP.laeuft=(async()=>{ try{ await wzdLaden(); let notar=[],prot=[];
      if(IA_DB_BEREIT){ try{ notar=await iaAlle('notar'); }catch(e){} try{ prot=await iaAlle('protokolle'); }catch(e){} }
      FP.extra={notar,prot}; }catch(e){ FP.extra={notar:[],prot:[]}; } FP.laeuft=null; })();
  return FP.laeuft;
}
function fpAuftraege(){ return wzdObjekte(true).filter(o=>FP_STAENDE.includes(o.status)); }
function fpGleich(a,b){ let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); return !!n(a)&&n(a)===n(b); }
/* automatisch erkannte Schritte aus den vorhandenen Daten */
function fpAuto(o){
  let f=o.f, p=pjLoad().find(x=>x.id===o.id)||{}, E=null, ex=FP.extra||{notar:[],prot:[]}, ev=[];
  try{ E=window.ImmoPortal?ImmoPortal.energie(ImmoPortal.leser(f),{}):null; }catch(e){}
  try{ ev=(JSON.parse(f.vm_daten||'{}').ev)||[]; }catch(e){}
  let notar=ex.notar.filter(n=>fpGleich(n.anschrift,o.anschrift)||fpGleich(n.projekt,o.name)), stand=Math.max(-1,...notar.map(n=>NO_STAENDE.indexOf(n.stand)));
  let st=FP_STAENDE.indexOf(o.status), portal=((wzAlle().portal||{}).export||{})[o.id];
  let ul=wzdListe('unterlagen').find(r=>r.projektId===o.id), us=k=>!!(ul&&ul.posten&&ul.posten[k]&&ul.posten[k].stand==='da');   // Kachel „Unterlagen“ (D43)
  return {
    bewertung:!!(p.empf&&!/^0\s*€?$/.test(String(p.empf).trim())),
    energie:!!(E&&(E.art==='liegt nicht vor'||(E.art&&!ImmoPortal.energiePflicht(E).length))),
    grundrisse:!!(p.data&&Array.isArray(p.data.grundrisse)&&p.data.grundrisse.length)||(us('grundrisse')&&us('wohnflaeche')),
    ul_angefordert:!!(ul&&(Object.values(ul.posten||{}).some(s=>s&&(s.stand==='angefordert'||(s.stand==='da'&&s.quelle!=='Aufnahmebogen')))||(ul.vollmacht&&ul.vollmacht.unterschrift))),
    ul_grundbuch:us('grundbuch'), ul_flurkarte:us('flurkarte'), ul_baulasten:us('baulasten'), ul_weg:us('teilung')&&us('protokolle')&&us('abrechnung'),
    fotos:(p.nFotos||0)>0,
    expose:!!(String(f.ex_text_objekt||'').trim()||String(f.ex_titel||'').trim()),
    preis:zahlLesen(f.vm_preis,true)>0||zahlLesen(f.ex_preis,true)>0,
    portal:!!(portal&&portal.aktion!=='DELETE'),
    gesuche:wzdListe('vorgaenge').some(v=>v.typ==='anfrage'&&v.projektId===o.id&&v.quelle==='Suchprofil (Abgleich)'),
    besichtigung:ev.some(e=>/Besichtigung/.test(e&&e.art||''))||wzdListe('vorgaenge').some(v=>v.typ==='anfrage'&&v.projektId===o.id&&(+v.stufe||0)>=3),
    bericht:!!f.vm_letzter||!!(((wzAlle().eigentuemerbericht||{}).letzter||{})[o.id]),
    kaeufer:st>=3,
    notar1:stand>=1||st>=4, notar2:stand>=2, notar3:stand>=3||st>=5,
    uebergabe:ex.prot.some(x=>x.abgeschlossen&&fpGleich(x.anschrift,o.anschrift)),
    provision:typeof paErledigt==='function'&&wzdListe('abrechnungen').some(a=>(a.projektId===o.id||fpGleich(a.anschrift,o.anschrift))&&paErledigt(a))
  };
}
function fpSchritte(o){
  let wohnung=(o.f.ek_modus||'')==='wohnung';
  return FP_PHASEN.map(([phase,l])=>[phase,l.filter(s=>!s[3]||wohnung)]);
}
function fpStand(o){
  let auto=fpAuto(o), m=fpS()[o.id]||{}, alle=[], offen=null;
  fpSchritte(o).forEach(([phase,l])=>l.forEach(s=>{ let a=s[2]&&auto[s[2]], ok=!!a||!!(m[s[0]]&&m[s[0]].ok);
    let x={id:s[0],text:s[1],phase,auto:!!a,ok,datum:m[s[0]]&&m[s[0]].datum||'',notiz:m[s[0]]&&m[s[0]].notiz||''}; alle.push(x); if(!ok&&!offen) offen=x; }));
  return {alle,offen,erledigt:alle.filter(x=>x.ok).length,gesamt:alle.length};
}
function fpHaken(sid,an){
  let S=fpS(), m=S[FP.aktiv]||(S[FP.aktiv]={}); m[sid]=Object.assign(m[sid]||{},{ok:!!an,datum:an?aufHeute():''}); wzSpeichern(); wzZeichnen();
}
function fpNotiz(sid,t){ let S=fpS(), m=S[FP.aktiv]||(S[FP.aktiv]={}); m[sid]=Object.assign(m[sid]||{},{notiz:String(t||'').slice(0,500)}); wzSpeichern(); }
function fpWiedervorlage(){
  let o=wzdObjekt(FP.aktiv); if(!o) return; let st=fpStand(o); if(!st.offen){ alert('Alle Schritte sind erledigt.'); return; }
  if(wzdWiedervorlage('Verkaufsfahrplan '+o.name+': '+st.offen.text,ImmoBeratung.tagePlus(aufHeute(),3),o.name,o.kundeId)) alert('Wiedervorlage in drei Tagen angelegt: '+st.offen.text+'.');
}
function fpBalken(st){ let q=st.gesamt?Math.round(st.erledigt/st.gesamt*100):0; return '<div class="fp-balken" role="progressbar" aria-valuenow="'+q+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+q+'%"></i></div>'; }
function fpZeichnen(){
  if(!FP.extra){ fpLaden().then(()=>{ if(WZ.aktiv==='fahrplan') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  let l=fpAuftraege();
  if(FP.aktiv){ let o=wzdObjekt(FP.aktiv); if(o) return fpEditor(o); FP.aktiv=null; }
  return (l.length?'<div class="kd-karten">'+l.map(o=>{ let st=fpStand(o);
      return '<div class="kd-karte fp-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc(o.status)+' · '+st.erledigt+' von '+st.gesamt+' Schritten'+(st.offen?' · als Nächstes: '+st.offen.text:' · fertig')+'</span>'+fpBalken(st)+'</div>'
        +'<div class="kd-k"><button class="secondary" onclick="FP.aktiv=\''+idSicher(o.id)+'\';wzZeichnen()">Öffnen</button></div></div>'; }).join('')+'</div>'
    :wzHinweis('Hier erscheinen gesicherte Bewertungen mit einem Vermarktungsstand (Akquise bis Verkauft, Bewertung → ⑬ Vermarktung).'))
    +wzHinweis('Schritte mit „erkannt“ hakt die App selbst ab: aus Bewertung, Fotos, Exposé, Vermarktung, Portal-Export, Interessenten, Notarauftrag und Übergabeprotokoll.');
}
function fpEditor(o){
  let st=fpStand(o);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="FP.aktiv=null;wzZeichnen()" data-ic="arrow-left">Alle Aufträge</button>'
      +'<span class="ub-status">'+sEsc(o.name)+' · '+st.erledigt+' von '+st.gesamt+'</span>'
      +'<button type="button" class="secondary" onclick="fpWiedervorlage()" data-ic="clock">Wiedervorlage</button></div>'
    +fpBalken(st)
    +(st.offen?wzAmpel('gelb','Als Nächstes: '+sEsc(st.offen.text)+' ('+sEsc(st.offen.phase)+')'):wzAmpel('gruen','Alle Schritte erledigt.'))
    +fpSchritte(o).map(([phase,l])=>{ let x=st.alle.filter(s=>s.phase===phase), fertig=x.filter(s=>s.ok).length;
      return wzBox(sEsc(phase)+' <span class="u">'+fertig+'/'+x.length+'</span>',x.map(s=>'<div class="fp-schritt'+(s.ok?' ok':'')+'">'
        +'<label class="wz-check"><input type="checkbox"'+(s.ok?' checked':'')+(s.auto?' disabled':'')+' onchange="fpHaken(\''+s.id+'\',this.checked)"><span>'+sEsc(s.text)+'</span></label>'
        +(s.auto?'<span class="fp-auto">erkannt</span>':s.ok&&s.datum?'<span class="fp-auto">'+wzDatum(s.datum)+'</span>':'')
        +(FP_LINK[s.id]?'<button type="button" class="secondary fp-los" onclick="'+FP_LINK[s.id]+'">Öffnen</button>':'')
        +(s.auto?'':'<input class="fp-notiz" value="'+sEsc(s.notiz)+'" placeholder="Notiz" aria-label="Notiz zu '+sEsc(s.text)+'" onchange="fpNotiz(\''+s.id+'\',this.value)">')+'</div>').join('')); }).join('');
}
function fpRechnen(){ iconify($('wz_body')); }
function fpDokument(){
  let o=FP.aktiv&&wzdObjekt(FP.aktiv); if(!o){ alert('Bitte zuerst einen Auftrag öffnen.'); return null; }
  let st=fpStand(o);
  return {titel:'Stand des Verkaufs '+o.name,
    html:'<h1>Stand des Verkaufs</h1><p class="wzd-unter">'+sEsc(o.name)+' · '+new Date().toLocaleDateString('de-DE')+' · '+st.erledigt+' von '+st.gesamt+' Schritten erledigt</p>'
      +fpSchritte(o).map(([phase])=>'<h2>'+sEsc(phase)+'</h2><ul>'+st.alle.filter(s=>s.phase===phase).map(s=>'<li>'+(s.ok?'☑':'☐')+' '+sEsc(s.text)+'</li>').join('')+'</ul>').join(''),
    fuss:'Übersicht für den Eigentümer.'};
}
wzRegistrieren({id:'fahrplan',titel:'Verkaufsfahrplan',sub:'Jeder Auftrag Schritt für Schritt bis zur Übergabe',icon:'list-check',ohneNeu:true,
  zeichnen:fpZeichnen,rechnen:fpRechnen,dokument:fpDokument,schliessen:()=>{ FP.extra=null; }});
