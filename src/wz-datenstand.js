/* ---------- Kachel „Datenstand“ (D39) ----------
   Wie aktuell sind die Rechengrundlagen der App (Baupreisindex, Sterbetafel, BMF-Tabelle), die Marktdaten (Bodenrichtwerte,
   Marktberichte, Preisindex des Wertmonitors) und die eigenen Daten (Sicherung, Liegenschaften, Löschprüfungen)? Je Eintrag
   Stand, erwartete nächste Veröffentlichung und was zu tun ist; fällige Punkte zählt die Kachel auf der Startseite.
   Die Regeln stehen in js/beratung.js (datenstand) und sind dort getestet. Das Dokument dient als Nachweis der Datenstände. */
var DS={erg:null,laeuft:null,weg:false};
const DS_GRUPPEN=[['rechnen','Rechengrundlagen der App'],['markt','Marktdaten'],['daten','Deine Daten'],['recht','Rechtsstand']];
const DS_STATUS={ok:['gruen','aktuell'],bald:['gelb','bald prüfen'],faellig:['rot','fällig'],info:['grau','nicht hinterlegt']};
const DS_AKTION={sicherung:['Jetzt sichern','dsSichern()','download'],markt:['Marktdaten öffnen','wzSchliessen();pqOeffnen()','book'],
  index:['Wertmonitor öffnen',"wzOeffnen('wertmonitor')",'activity'],liegenschaften:['Liegenschaften öffnen',"wzSchliessen();lvOeffnen('uebersicht')",'building'],
  loeschen:['Kunden öffnen','wzSchliessen();kdOeffnen()','users'],notar:['Notaraufträge öffnen',"wzOeffnen('notar')",'pen'],
  abrechnungen:['Provision öffnen',"wzOeffnen('provision')",'receipt'],vollmachten:['Unterlagen öffnen',"wzOeffnen('unterlagen')",'folder-open']};   // D45
async function dsEingaben(){
  await IA_BEREIT_P;
  const pj=typeof pjLoad==='function'?pjLoad():[], heute=aufHeute(), J=+heute.slice(0,4), brw=(J%2===0?J:J-1)+'-01-01';
  const kunden=typeof KD_CACHE!=='undefined'?KD_CACHE:[];
  let lb=null, notar=[], lg=[];
  if(IA_DB_BEREIT){ try{ lb=await iaGet('meta','lastBackup'); }catch(e){} try{ notar=await iaAlle('notar'); }catch(e){} }
  let abr=[], ul=[]; if(IA_DB_BEREIT){ try{ abr=await iaAlle('abrechnungen'); }catch(e){} try{ ul=await iaAlle('unterlagen'); }catch(e){} }
  const vor12=ImmoBeratung.isoPlusMonate(heute,-12);
  try{ if(typeof lvStart==='function'){ await lvStart();
    lg=(LV.liste||[]).map(l=>({name:l.name,letzte:(l.bewertungen||[]).filter(b=>b.status!=='entwurf').map(b=>b.stichtag).sort().pop()||''})); } }catch(e){}
  const idx=(wzAlle().wertmonitor||{}).index||{};
  const jahre=o=>Object.keys(o&&typeof o==='object'?o:{}).filter(j=>/^\d{4}$/.test(j)&&wzN(o[j])>0).map(Number);
  const aktiv=pj.filter(p=>['Auftrag erteilt','In Vermarktung','Reserviert'].includes(((p.data&&p.data.fields)||{}).vm_status));
  const ts=lb&&lb.ts||0;
  const BPI=window.ImmoBaupreisindex||{}, ST=window.ImmoSterbetafel||{}, BER=window.ImmoBeratung||{};
  return {bpiStand:BPI.STAND||'',tafelZeitraum:ST.zeitraum||'',bmfJahre:Object.keys(BER.BMF_VERVIELFAELTIGER||{}).map(Number),
    marktdaten:typeof pqSets==='function'?pqSets().map(s=>({name:s.titel||s.gebiet||s.quelle||'',stand:s.stand||''})):[],
    indexJahre:{haus:jahre(idx.haus),wohnung:jahre(idx.wohnung)},
    bewertungenVorBrw:aktiv.filter(p=>{ let s=typeof wmStichtag==='function'?wmStichtag(p,(p.data&&p.data.fields)||{}):''; return s&&s<brw; }).length,
    projekte:pj.length,kunden:kunden.length,sicherung:ts,geaendertSeitSicherung:ts?pj.filter(p=>(p.geaendert||0)>ts).length:pj.length,
    liegenschaften:lg,loeschpruefungFaellig:kunden.filter(k=>k.loeschpruefung&&k.loeschpruefung<=heute).length,
    notarErledigtAlt:notar.filter(n=>n.stand==='Erledigt'&&(Date.now()-(n.geaendert||0))>182*864e5).length,
    abrechnungenAlt:abr.filter(a=>{ let b=(a.parteien||[]).filter(p=>p.bezahltAm).map(p=>p.bezahltAm).sort().pop(); return typeof paErledigt==='function'&&paErledigt(a)&&b&&b<=vor12; }).length,
    vollmachtenAlt:ul.filter(r=>{ let p=pj.find(x=>x.id===r.projektId), st=p&&((p.data&&p.data.fields)||{}).vm_status; return r.vollmacht&&r.vollmacht.unterschrift&&(!p||st==='Verkauft')&&(Date.now()-(r.geaendert||0))>182*864e5; }).length};
}
async function dsAktualisieren(){
  if(DS.laeuft) return DS.laeuft;
  DS.laeuft=(async()=>{ try{ DS.erg=ImmoBeratung.datenstand(await dsEingaben(),aufHeute()); }catch(e){ if(!DS.weg) console.error('Datenstand',e); DS.erg=DS.erg||{liste:[],faellig:0,bald:0}; } DS.laeuft=null; dsBadge(); return DS.erg; })();
  return DS.laeuft;
}
/* Zahl auf der Kachel der Startseite: fällige und bald zu prüfende Punkte */
function dsBadge(){
  let b=$('ds_badge'); if(!b) return;
  let n=DS.erg?DS.erg.faellig+DS.erg.bald:0;
  b.textContent=n?String(n):''; b.hidden=!n; b.classList.toggle('rot',!!(DS.erg&&DS.erg.faellig));
  b.title=DS.erg?(DS.erg.faellig?DS.erg.faellig+' fällig':'')+(DS.erg.faellig&&DS.erg.bald?', ':'')+(DS.erg.bald?DS.erg.bald+' bald prüfen':''):'';
}
function dsZeichnen(){
  if(!DS.erg){ dsAktualisieren().then(()=>{ if(WZ.aktiv==='datenstand') wzZeichnen(); }); return '<p class="hint">Datenstände werden gelesen …</p>'; }
  let l=DS.erg.liste;
  let kopf=wzAmpel(DS.erg.faellig?'rot':DS.erg.bald?'gelb':'gruen',DS.erg.faellig||DS.erg.bald
    ?[DS.erg.faellig?DS.erg.faellig+' Punkt'+(DS.erg.faellig===1?'':'e')+' fällig':'',DS.erg.bald?DS.erg.bald+' bald zu prüfen':''].filter(Boolean).join(', ')+'.'
    :'Alles aktuell.');
  return kopf+DS_GRUPPEN.map(([g,t])=>{ let z=l.filter(x=>x.gruppe===g); if(!z.length) return '';
    return wzBox(t,z.map(x=>{ let st=DS_STATUS[x.status]||DS_STATUS.info, a=DS_AKTION[x.id];
      return '<div class="ds-zeile wz-ampel wz-'+st[0]+'"><span class="wz-punkt" aria-hidden="true"></span><div class="ds-inhalt"><div class="ds-kopf"><b>'+sEsc(x.titel)+'</b><span class="ds-st">'+st[1]+'</span></div>'
        +'<div class="ds-werte"><span>Stand: '+sEsc(x.stand)+'</span><span>Nächste: '+sEsc(x.naechste)+'</span></div>'
        +'<div>'+sEsc(x.text)+'</div><small>Quelle: '+sEsc(x.quelle)+'</small>'
        +(a&&x.status!=='ok'?'<div class="gr-zeile"><button type="button" class="secondary" onclick="'+a[1]+'" data-ic="'+a[2]+'">'+a[0]+'</button></div>':'')+'</div></div>'; }).join('')); }).join('')
    +wzHinweis('Die Zeitpunkte der nächsten Veröffentlichungen sind Erfahrungswerte (Baupreisindex vierteljährlich etwa sechs Wochen nach dem Berichtsmonat, Sterbetafel im Sommer, BMF-Tabelle im Herbst). Neue Werte der Rechengrundlagen kommen mit einer neuen Fassung der App.');
}
function dsRechnen(){ iconify($('wz_body')); }
async function dsSichern(){ await pjAlleSichern(); DS.erg=null; if(WZ.aktiv==='datenstand') wzZeichnen(); else dsAktualisieren(); }
function dsDokument(){
  if(!DS.erg){ alert('Die Datenstände werden noch gelesen.'); return null; }
  let l=DS.erg.liste;
  return {titel:'Datenstand '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Datenstand der ImmoApp</h1><p class="wzd-unter">Stand der Rechengrundlagen und Daten am '+new Date().toLocaleDateString('de-DE')+'</p>'
      +DS_GRUPPEN.map(([g,t])=>{ let z=l.filter(x=>x.gruppe===g); return z.length?'<h2>'+t+'</h2>'+wzDokTabelle(z.map(x=>[sEsc(x.titel),sEsc(x.stand),sEsc(x.naechste),(DS_STATUS[x.status]||DS_STATUS.info)[1]]),['Grundlage','Stand','Nächste','Status']):''; }).join('')
      +'<p class="wzd-klein">Quellen: Statistisches Landesamt Baden-Württemberg (Baupreisindex), Statistisches Bundesamt (Sterbetafel), Bundesministerium der Finanzen (Vervielfältiger nach § 14 BewG), Gutachterausschüsse (Bodenrichtwerte, Marktberichte). Rechtsstand am Gesetzeswortlaut geprüft am '+wzDatum(ImmoBeratung.RECHT_GEPRUEFT)+'.</p>',
    fuss:'Übersicht der Datenstände.'};
}
wzRegistrieren({id:'datenstand',titel:'Datenstand',sub:'Rechengrundlagen und Daten · was ist aktuell, was steht an',icon:'clock',ohneNeu:true,
  zeichnen:dsZeichnen,rechnen:dsRechnen,dokument:dsDokument,aktionen:[{label:'Neu prüfen',icon:'check',fn:'DS.erg=null;wzZeichnen()'}],
  schliessen:()=>{ dsBadge(); }});
/* beim Start einmal prüfen (für die Zahl auf der Kachel): erst nach dem Laden aller Skripte und der Datenbank, nicht mehr
   beim Verlassen der Seite (sonst läuft die Prüfung in eine Seite, die gerade abgebaut wird) */
addEventListener('pagehide',()=>{ DS.weg=true; });
addEventListener('load',()=>{ setTimeout(()=>{ if(DS.weg) return; Promise.resolve(window.IA_BEREIT_P).then(()=>{ if(!DS.weg) dsAktualisieren(); }).catch(()=>{}); },600); });
