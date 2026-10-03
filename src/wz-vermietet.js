/* ---------- Kachel „Vermietet verkaufen“ (D59) ----------
   Je Verkauf (gesicherte Bewertung, nur gelesen) die Mieteinheiten OHNE Namen der Mieter: Bezeichnung, Mietbeginn, Kaltmiete,
   Kaution, Ja/Nein-Angaben zum Vertrag. Dazu Angaben zum Objekt (Aufteilung in Wohnungseigentum), zum Käufer als Auswahl ohne Namen
   und zum Ablauf nach der Beurkundung. Daraus Ampeln (js/vermietet-regeln.js, Gebietsliste js/vermietet-gebiete.js):
   Vorkaufsrecht des Mieters mit Fristrechner (§§ 577, 469 Abs. 2, 187, 188, 193 BGB), Kündigungssperrfrist (§ 577a BGB, KSpVO BW),
   Eigenbedarf (§§ 573, 573a, 573c, 574 BGB), Kaution und Mietvertrag (§§ 550, 551, 566b BGB), Mitteilung und Kaution nach der
   Umschreibung (§§ 566, 566a, 566e BGB) und eine Prüfung der Anzeigentexte (§ 566 Abs. 1, § 558 Abs. 3 BGB).
   Mitteilungen an Mieter schreiben Notariat oder Vordruck der Bank — die App speichert nur, wann was zugegangen ist.
   Ende der Vorkaufsfrist als Termin im Kalender mit Wiedervorlage sieben Tage vorher; Posten für die Kachel „Unterlagen“
   (ulPostenErgaenzen); Schritt im Verkaufsfahrplan (FP_AUTO_HOOKS, Schlüssel vv_vorkauf).
   Speicher „akten“ (art 'vermietet') in der Gerätedatenbank; Person nur als Verweis auf die Kundenakte (Eigentümer). */
var VV={aktiv:null,notar:null,laeuft:null,timer:null,kette:null,anzeige:''};
const VV_ART='vermietet';
const VV_WE=[['nein','nein, ungeteiltes Haus'],['begruendet','begründet (Wohnungsgrundbuch angelegt)'],['geplant','soll begründet werden (Aufteilung im Kaufvertrag oder Verkauf einzelner Einheiten)']];
const VV_JNU=[['unbekannt','unbekannt'],['nein','nein'],['ja','ja']];
const VV_JN=[['','–'],['ja','ja'],['nein','nein']];
const VV_KAUTION=[['','–'],['bar','Barkaution'],['buergschaft','Bürgschaft'],['sparbuch','Sparbuch']];
const VV_SEITE=[['eine','eine Person bzw. dieselbe Familie oder derselbe Haushalt'],['mehrere','mehrere Erwerber aus verschiedenen Familien oder Haushalten'],['gesellschaft','Personengesellschaft, z. B. GbR']];
const VV_NUTZUNG=[['','– noch offen –'],['kapitalanlage','Kapitalanlage (Mieter bleibt)'],['selbst','selbst oder Angehörige']];
const VV_ABSENDER=[['','–'],['verkaeufer','Verkäufer'],['kaeufer','Käufer'],['notar','Notariat']];
const VV_STUFE={rot:'handeln',gelb:'prüfen',gruen:'in Ordnung',grau:'offen'};
const VV_CHIP={rot:'pa-ueberfaellig',gelb:'pa-offen',gruen:'pa-bezahlt',grau:''};
const VV_EXPOSE=[['ex_titel','Titel'],['ex_untertitel','Untertitel'],['ex_frei','Verfügbar ab'],['ex_text_objekt','Objektbeschreibung'],['ex_text_lage','Lage'],['ex_text_ausstattung','Ausstattung'],['ex_text_sonst','Sonstiges']];

function vvS(){ let a=wzAlle(); if(!a.vermietet||typeof a.vermietet!=='object'||Array.isArray(a.vermietet)) a.vermietet={kspvoWv:''}; return a.vermietet; }
function vvLaden(neu){
  if(!VV.laeuft||neu) VV.laeuft=(async()=>{ await wzdLaden(); let n=[];
    if(typeof IA_DB_BEREIT!=='undefined'&&IA_DB_BEREIT){ try{ n=await iaAlle('notar'); }catch(e){} } VV.notar=n; })();
  return VV.laeuft;
}
function vvGleich(a,b){ let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); return !!n(a)&&n(a)===n(b); }
/* Notarauftrag zum Objekt (gleiche Anschrift oder gleicher Projektname, wie im Verkaufsfahrplan) — nur gelesen */
function vvNotarZu(o){ return o?(VV.notar||[]).filter(n=>vvGleich(n.anschrift,o.anschrift)||vvGleich(n.projekt,o.name)).sort((a,b)=>(b.geaendert||b.ts||0)-(a.geaendert||a.ts||0))[0]||null:null; }
function vvNotarVermietet(n){ return !!n&&!!n.raeumung&&n.raeumung!=='geräumt'; }
function vvAkte(pid){ return wzdAkten(VV_ART,pid)[0]||null; }
function vvEinheit(bez){ return {id:wzdId('me'),bez:bez||'',ueberlassenAm:'',kaltmiete:'',kaution:'',kautionArt:'',getrennt:'unbekannt',schriftlich:'',befristet:'',vorauszahlung:'',
  mitteilungAm:'',absender:'',zugangsnachweis:'',ausgeuebtAm:'',ausuebungSchriftlich:false}; }
function vvLeer(o){
  let f=o.f||{}, n=vvNotarZu(o), wohnung=(f.ek_modus||'')==='wohnung', staende=typeof NO_STAENDE!=='undefined'?NO_STAENDE:[];
  let anzahl=vvNotarVermietet(n)?Math.max(1,Math.min(20,Math.round(wzN(n.mietverhaeltnisse))||1)):1;
  return wzdAkteNeu(VV_ART,{projektId:o.id,objekt:o.name,kundeId:o.kundeId||'',gemeinde:'',
    we:wohnung?'begruendet':'nein',weAm:'',teileigentum:false,schonVerkauft:'unbekannt',ersteVeraeusserung:'',paket:false,
    wohnungen:wohnung?'':String(Math.round(wzN(f.ek_anz_we))||''),
    kaeuferFamilie:false,kaeuferErbe:false,zwangsversteigerung:false,kaeuferseite:'eine',nutzung:'',leerVerkaufen:false,
    beurkundetAm:n&&staende.indexOf(n.stand)>=3&&wzdDatum(n.termin)?n.termin:'',uebergabeAm:n&&wzdDatum(n.uebergabeDatum)||'',
    umschreibungAm:'',mitteilungUebergangAm:'',kautionUebertragenAm:'',notiz:'',
    einheiten:Array.from({length:anzahl},(_,i)=>vvEinheit(anzahl>1?'Einheit '+(i+1):'')),kalender:{},ulKeys:[]});
}
function vvGemeinde(r){ let o=wzdObjekt(r.projektId); return String(r.gemeinde||'').trim()||ImmoVermietetRegeln.gemeindeAusAnschrift((o&&o.anschrift)||''); }
function vvDaten(r){
  let n=vvNotarZu(wzdObjekt(r.projektId));
  return Object.assign({},r,{gemeinde:vvGemeinde(r),wohnungen:wzN(r.wohnungen),
    kautionenNotar:vvNotarVermietet(n)&&String(n.kautionen||'').trim()?wzN(n.kautionen,true):null,
    einheiten:(r.einheiten||[]).map(e=>Object.assign({},e,{kaltmiete:wzN(e.kaltmiete,true),kaution:wzN(e.kaution,true)}))});
}
function vvPruefen(r){ return ImmoVermietetRegeln.pruefen(vvDaten(r),aufHeute(),{datum:wzDatum}); }
function vvName(r){ let o=wzdObjekt(r.projektId); return o?o.name:(r.objekt||'Objekt'); }

/* ---------- Anlegen, öffnen, löschen ---------- */
async function vvNeu(pid){
  if(!pid) return;
  await vvLaden(); let o=wzdObjekt(pid); if(!o) return;
  let r=vvAkte(pid);
  if(!r){ r=vvLeer(o); if(!(await wzdSpeichern('akten',r))) return; vvKspvoWiedervorlage(); }
  if(WZ.aktiv!=='vermietet') wzOeffnen('vermietet');
  VV.aktiv=r; wzZeichnen(); $('wz_overlay').scrollTop=0;
  return vvAbgleich(r);
}
/* aus einem Notarauftrag mit „vermietet“ oder „teilweise vermietet“ (auch für einen Knopf in der Kachel „Notarauftrag“) */
async function vvAusNotar(notarId){
  await vvLaden(true); let n=(VV.notar||[]).find(x=>x.id===notarId); if(!n) return;
  let o=wzdObjekte(true).find(x=>vvGleich(n.anschrift,x.anschrift)||vvGleich(n.projekt,x.name));
  if(!o){ alert('Zu diesem Notarauftrag gibt es keine gesicherte Bewertung mit gleicher Anschrift. Bitte die Bewertung sichern oder das Objekt in der Liste wählen.'); return; }
  return vvNeu(o.id);
}
async function vvOeffnen(id){ await vvLaden(); let r=wzdListe('akten').find(x=>x.id===id&&x.art===VV_ART); if(!r) return; VV.aktiv=r; if(WZ.aktiv==='vermietet') wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function vvZurueck(){ let r=VV.aktiv; VV.aktiv=null; VV.anzeige=''; if(r){ clearTimeout(VV.timer); await wzdSpeichernSofort('akten',r); vvAbgleich(r); } wzZeichnen(); }
async function vvLoeschen(){
  let r=VV.aktiv; if(!r||!confirm('Die Angaben „Vermietet verkaufen“ für dieses Objekt löschen? Termine zur Vorkaufsfrist werden entfernt. Die Bewertung und die Kachel „Unterlagen“ bleiben unverändert.')) return;
  clearTimeout(VV.timer);
  for(const k of Object.values(r.kalender||{})) await vvFristWeg(k);
  if(await wzdLoeschen('akten',r.id)){ VV.aktiv=null; wzZeichnen(); }
}
function vvSpeichern(){ if(VV.aktiv){ wzdSpeichernBald('akten',VV.aktiv); clearTimeout(VV.timer); let r=VV.aktiv; VV.timer=setTimeout(()=>vvAbgleich(r),700); } else wzSpeichern(); }
function vvEinheitNeu(){ let r=VV.aktiv; if(!r) return; r.einheiten.push(vvEinheit('Einheit '+(r.einheiten.length+1))); vvSpeichern(); wzZeichnen(); }
function vvEinheitWeg(i){ let r=VV.aktiv; if(!r||r.einheiten.length<2||!confirm('Diese Mieteinheit entfernen?')) return; r.einheiten.splice(i,1); vvSpeichern(); wzZeichnen(); }
function vvKundeWaehlen(){ wzdKundeWaehlen(id=>{ let r=VV.aktiv; if(!r||!wzdKunde(id)) return; r.kundeId=id; wzdSpeichernSofort('akten',r); wzZeichnen(); }); }
/* Angaben aus dem Notarauftrag übernehmen (Beurkundung, Übergabe) — der Notarauftrag wird nur gelesen */
function vvAusNotarDaten(){
  let r=VV.aktiv, n=r&&vvNotarZu(wzdObjekt(r.projektId)); if(!n) return;
  let staende=typeof NO_STAENDE!=='undefined'?NO_STAENDE:[];
  if(staende.indexOf(n.stand)>=3&&wzdDatum(n.termin)) r.beurkundetAm=n.termin;
  if(wzdDatum(n.uebergabeDatum)) r.uebergabeAm=n.uebergabeDatum;
  vvSpeichern(); wzZeichnen();
}
/* Wiedervorlage am 15.12.2026: Neufassung der Gebietsliste verkündet? (einmal je Gerät) */
function vvKspvoWiedervorlage(){
  let S=vvS(), G=window.ImmoVermietetGebiete; if(!G||S.kspvoWv||aufHeute()>G.pruefenAm) return;
  let a=wzdWiedervorlage(G.pruefenText,G.pruefenAm,'Gebietsliste Kündigungssperrfrist BW',''); if(a){ S.kspvoWv=a.id; wzSpeichern(); }
}

/* ---------- Abgleich: Fristende im Kalender (Wiedervorlage 7 Tage vorher), Posten in „Unterlagen“ ---------- */
function vvAbgleich(r){ VV.kette=(VV.kette||Promise.resolve()).then(()=>vvAbgleichJetzt(r)).catch(e=>console.warn('Vermietet verkaufen',e)); return VV.kette; }
async function vvAbgleichJetzt(r){
  if(!r||!wzdListe('akten').some(x=>x.id===r.id)) return;
  let erg=vvPruefen(r), o=wzdObjekt(r.projektId), neu=false, ids=new Set();
  if(!r.kalender||typeof r.kalender!=='object'||Array.isArray(r.kalender)) r.kalender={};
  for(const u of erg.vorkauf.einheiten){
    ids.add(u.id);
    let soll=u.fristEnde&&u.besteht!==false?u.fristEnde:'', k=r.kalender[u.id];
    if(soll&&(!k||k.datum!==soll||(k.bez||'')!==(u.bez||''))){ await vvFristEintragen(r,u,soll,k,o); neu=true; }
    else if(!soll&&k){ await vvFristWeg(k); delete r.kalender[u.id]; neu=true; }
  }
  for(const id of Object.keys(r.kalender)) if(!ids.has(id)){ await vvFristWeg(r.kalender[id]); delete r.kalender[id]; neu=true; }
  let posten=ImmoVermietetRegeln.unterlagenPosten(erg), keys=posten.map(p=>p.key);
  if(o&&typeof ulPostenErgaenzen==='function'&&JSON.stringify(keys)!==JSON.stringify(r.ulKeys||[])){
    let ok=await ulPostenErgaenzen(r.projektId,posten.map(p=>Object.assign({herkunft:'Vermietet verkaufen'},p)),ImmoVermietetRegeln.UL_SCHLUESSEL.filter(k=>!keys.includes(k)));
    if(ok){ r.ulKeys=keys; neu=true; }
  }
  if(neu){ await wzdSpeichernSofort('akten',r); if(WZ.aktiv==='vermietet'&&VV.aktiv===r) vvRechnen(); }
}
async function vvFristEintragen(r,u,datum,k,o){
  let objekt=o?o.name:(r.objekt||''), zusatz=u.bez?' ('+u.bez+')':'';
  let t=k&&wzdListe('termine').find(x=>x.id===k.terminId);
  if(!t) t={id:wzdId('t'),art:'Sonstiges',titel:'',datum:'',von:'',bis:'',ort:(o&&o.anschrift)||'',projektId:r.projektId,kundeIds:[],notiz:'',erinnerung:'0'};
  Object.assign(t,{titel:'Ende der Vorkaufsfrist des Mieters'+zusatz,datum,notiz:'Zwei Monate ab Zugang der Mitteilung (§ 469 Abs. 2 BGB), Ausschlussfrist. Aus der Kachel „Vermietet verkaufen“.'});
  await wzdSpeichern('termine',t);
  let frist=ImmoFristen.plusTage(datum,-7), text='Vorkaufsfrist des Mieters endet am '+wzDatum(datum)+': '+objekt+zusatz;
  let l=aufLoad(), w=k&&k.wvId?l.find(a=>a.id===k.wvId):null, wvId='';
  if(w){ Object.assign(w,{frist,text,erledigt:false}); aufStore(l); wvId=w.id; try{ aufBadge(); }catch(e){} }
  else { let a=wzdWiedervorlage(text,frist,objekt,r.kundeId||''); wvId=a?a.id:''; }
  r.kalender[u.id]={terminId:t.id,wvId,datum,bez:u.bez||''};
}
async function vvFristWeg(k){
  if(!k) return;
  if(k.terminId&&wzdListe('termine').some(t=>t.id===k.terminId)) await wzdLoeschen('termine',k.terminId);
  if(k.wvId){ aufStore(aufLoad().filter(a=>a.id!==k.wvId)); try{ aufBadge(); }catch(e){} }
}

/* ---------- Ansicht ---------- */
function vvChip(text,stufe){ return '<span class="pa-chip '+(VV_CHIP[stufe]||'')+'">'+sEsc(text)+'</span>'; }
function vvSperrKurz(s){ return s.gilt===true?(s.startOffen?'Sperrfrist ab Umschreibung':s.laeuft?'Sperrfrist bis '+(s.jahre?wzDatum(s.ende):wzDatum(s.ende5)):'Sperrfrist abgelaufen'):s.gilt==='unklar'?'Sperrfrist ungeklärt':'keine Sperrfrist'; }
function vvListeHtml(){
  let alle=wzdAkten(VV_ART).slice().sort((a,b)=>vvName(a).localeCompare(vvName(b),'de'));
  let karten=alle.map(r=>{ let o=wzdObjekt(r.projektId), erg=vvPruefen(r), n=(r.einheiten||[]).length;
    return '<div class="kd-karte"><div><b>'+sEsc(vvName(r))+'</b><span>'+sEsc([o&&o.status,n+' Mieteinheit'+(n===1?'':'en'),vvGemeinde(r)].filter(Boolean).join(' · '))+'</span>'
      +'<div class="pa-chips">'+vvChip('Vorkaufsrecht: '+VV_STUFE[erg.vorkauf.stufe],erg.vorkauf.stufe)+vvChip(vvSperrKurz(erg.sperr),erg.sperr.stufe)
      +(erg.rot?vvChip(erg.rot+' Prüfpunkt'+(erg.rot===1?'':'e')+' rot','rot'):'')+'</div></div>'
      +'<div class="kd-k"><button class="secondary" onclick="vvOeffnen(\''+idSicher(r.id)+'\')">Öffnen</button></div></div>'; });
  let objekte=wzdObjekte(true);
  let vorschlaege=(VV.notar||[]).filter(vvNotarVermietet).map(n=>({n,o:objekte.find(o=>vvGleich(n.anschrift,o.anschrift)||vvGleich(n.projekt,o.name))}))
    .filter((x,i,l)=>x.o&&!alle.some(r=>r.projektId===x.o.id)&&l.findIndex(y=>y.o&&y.o.id===x.o.id)===i);
  return (karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein vermietetes Objekt erfasst.'))
    +(vorschlaege.length?wzBox('Laut Notarauftrag vermietet','<div class="kd-karten">'+vorschlaege.map(({n,o})=>'<div class="kd-karte"><div><b>'+sEsc(o.name)+'</b><span>'
      +sEsc(['Notarauftrag: '+n.raeumung,n.mietverhaeltnisse?n.mietverhaeltnisse+' Mietverhältnis'+(String(n.mietverhaeltnisse)==='1'?'':'se'):'',n.stand||''].filter(Boolean).join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="primary" onclick="vvNeu(\''+idSicher(o.id)+'\')">Anlegen</button></div></div>').join('')+'</div>'):'')
    +'<div class="field" style="max-width:460px;margin-top:12px"><label for="vv_neu">Vermietetes Objekt erfassen</label><select id="vv_neu" onchange="vvNeu(this.value)">'
      +wzdObjektOptionen('','– gesicherte Bewertung wählen –')+'</select></div>'
    +wzHinweis('Je Mieteinheit nur Bezeichnung, Daten und Beträge — keine Namen oder Kontaktdaten der Mieter. Mitteilungen an Mieter schreiben Notariat oder Vordruck der Bank; die App merkt sich nur, wann was zugegangen ist.');
}
function vvFristText(r,e,vk){
  let k=(r.kalender||{})[e.id]; if(!vk||!vk.fristEnde) return '';
  return 'Ende der Vorkaufsfrist: <b>'+wzDatum(vk.fristEnde)+'</b>'+(k&&k.datum===vk.fristEnde?' · im Kalender, Wiedervorlage am '+wzDatum(ImmoFristen.plusTage(vk.fristEnde,-7)):'');
}
function vvEinheitHtml(r,e,i,vk){
  let p='einheiten.'+i+'.';
  return '<div class="no-person vv-einheit"><div class="no-person-kopf"><b id="vv_bez_'+i+'">'+sEsc(e.bez||'Mieteinheit '+(i+1))+'</b>'
      +(r.einheiten.length>1?'<button type="button" class="weg" aria-label="Mieteinheit '+(i+1)+' entfernen" onclick="vvEinheitWeg('+i+')">✕</button>':'')+'</div>'
    +'<div class="grid">'+wzFeld(p+'bez','Bezeichnung',{typ:'text',ph:'z. B. EG links'})
      +wzFeld(p+'ueberlassenAm','Überlassen am (Einzug)',{typ:'datum'})
      +wzFeld(p+'kaltmiete','Kaltmiete',{typ:'betrag',einheit:'€/Monat'})+wzFeld(p+'kaution','Kaution',{typ:'betrag',einheit:'€'})
      +wzFeld(p+'kautionArt','Art der Kaution',{typ:'wahl',optionen:VV_KAUTION,zeichnen:true})+wzFeld(p+'getrennt','Kaution getrennt angelegt',{typ:'wahl',optionen:VV_JNU,zeichnen:true})
      +wzFeld(p+'schriftlich','Mietvertrag schriftlich mit allen Nachträgen',{typ:'wahl',optionen:VV_JN,zeichnen:true})
      +wzFeld(p+'befristet','Befristet oder Kündigungsverzicht über mehr als ein Jahr',{typ:'wahl',optionen:VV_JN,zeichnen:true})
      +wzFeld(p+'vorauszahlung','Mietvorauszahlung oder Abtretung von Mieten',{typ:'wahl',optionen:VV_JN,zeichnen:true})+'</div>'
    +'<div class="vv-vorkauf" id="vv_vk_'+i+'"'+(vk&&vk.besteht===false?' hidden':'')+'><h4>Vorkaufsrecht: Mitteilung und Ausübung</h4><div class="grid">'
      +wzFeld(p+'mitteilungAm','Mitteilung mit Unterrichtung über das Vorkaufsrecht zugegangen am',{typ:'datum'})
      +wzFeld(p+'absender','Absender der Mitteilung',{typ:'wahl',optionen:VV_ABSENDER})+wzFeld(p+'zugangsnachweis','Zugangsnachweis',{typ:'wahl',optionen:VV_JN,zeichnen:true})
      +wzFeld(p+'ausgeuebtAm','Ausübung durch den Mieter zugegangen am',{typ:'datum'})
      +wzFeld(p+'ausuebungSchriftlich','Ausübung schriftlich und eigenhändig unterschrieben, an den Verkäufer (§ 577 Abs. 3, § 126 Abs. 1 BGB)',{typ:'check',zeichnen:true,voll:true})+'</div>'
      +'<p class="vv-frist" id="vv_frist_'+i+'">'+vvFristText(r,e,vk)+'</p>'
      +wzHinweis('Den Text der Mitteilung schreiben Notariat oder Vordruck der Bank, nicht die App. Es zählt nur eine schriftliche Erklärung des Mieters — eine E-Mail oder ein Anruf genügt nicht.')+'</div>'
    +'</div>';
}
function vvAnzeigeHtml(r){
  let o=wzdObjekt(r.projektId), f=(o&&o.f)||{}, teile=VV_EXPOSE.filter(([k])=>String(f[k]||'').trim());
  let l=teile.length?ImmoVermietetRegeln.anzeigePruefen(teile.map(([k])=>f[k]).join('\n'),true):[];
  return (teile.length?(l.length?l.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join(''):wzAmpel('gruen','Exposé-Text der Bewertung: kein „bezugsfrei“, „sofort frei“ oder „frei ab“, Hinweis „vermietet“ vorhanden.'))
      :wzHinweis('Die Bewertung hat noch keinen Exposé-Text.'))
    +'<div class="field full"><label for="vv_anzeige">Anzeigentext prüfen (Portal, Aushang, Social Media)</label><textarea id="vv_anzeige" rows="3" placeholder="Text einfügen — wird nicht gespeichert" oninput="vvAnzeigeText(this.value)">'+sEsc(VV.anzeige)+'</textarea></div>'
    +'<div id="vv_anzeige_ergebnis">'+vvAnzeigeErgebnis(VV.anzeige)+'</div>';
}
function vvAnzeigeErgebnis(t){ if(!String(t||'').trim()) return ''; let l=ImmoVermietetRegeln.anzeigePruefen(t,true);
  return l.length?l.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join(''):wzAmpel('gruen','Keine Auffälligkeiten im eingefügten Text.'); }
function vvAnzeigeText(v){ VV.anzeige=String(v||''); wzH('vv_anzeige_ergebnis',vvAnzeigeErgebnis(VV.anzeige)); }
function vvPruefungHtml(erg){
  let gr=[]; erg.ampeln.forEach(a=>{ let g=gr.find(x=>x.b===a.bereich); if(!g) gr.push(g={b:a.bereich,l:[]}); g.l.push(a); });
  return gr.map(g=>'<h4 class="vv-bereich">'+sEsc(g.b)+'</h4>'+g.l.map(a=>wzAmpel(a.stufe,sEsc(a.text))).join('')).join('');
}
function vvKpiHtml(erg){
  let s=erg.sperr;
  return wzdKpi('Vorkaufsrecht',VV_STUFE[erg.vorkauf.stufe],erg.vorkauf.besteht===true?'Mieter hat Vorkaufsrecht':erg.vorkauf.besteht===false?'kein Vorkaufsrecht':'mit Notar klären')
    +wzdKpi('Kündigungssperrfrist',s.gilt===true?(s.startOffen?(s.jahre||'3 oder 5')+' Jahre':s.laeuft?'bis '+wzDatum(s.jahre?s.ende:s.ende5):'abgelaufen'):s.gilt==='unklar'?'ungeklärt':'keine',
      s.gilt===true&&s.startOffen?'ab der Umschreibung':vvGemeinde(VV.aktiv||{})||'Gemeinde fehlt')
    +wzdKpi('Prüfpunkte',erg.rot+' rot · '+erg.gelb+' gelb',erg.rot?'zuerst die roten klären':'');
}
function vvEditor(r){
  let o=wzdObjekt(r.projektId), f=(o&&o.f)||{}, erg=vvPruefen(r), n=vvNotarZu(o), ausAdresse=ImmoVermietetRegeln.gemeindeAusAnschrift((o&&o.anschrift)||'');
  let kd=wzdKunde(r.kundeId);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="vvZurueck()" data-ic="arrow-left">Alle Objekte</button>'
      +'<span class="ub-status">'+sEsc(vvName(r))+'</span>'
      +(o?'<button type="button" class="secondary" onclick="vvUnterlagen()" data-ic="folder-open">Unterlagen</button>':'')
      +'<button type="button" class="secondary" onclick="vvLoeschen()" data-ic="trash">Löschen</button></div>'
    +'<div class="wz-kpis grid" id="vv_kpis">'+vvKpiHtml(erg)+'</div>'
    +wzBox('Prüfung','<div id="vv_pruefung">'+vvPruefungHtml(erg)+'</div>'
      +wzHinweis('Prüfpunkte mit Normangabe, keine Rechtsberatung. Die App rechnet die Sperrfrist vorsichtig ab der Umschreibung im Grundbuch; Unklares mit Notariat oder Rechtsabteilung klären.'))
    +wzBox('Objekt','<div class="grid">'
      +wzFeld('gemeinde','Gemeinde',{typ:'text',ph:ausAdresse||'Gemeinde der Objektanschrift',hinweis:ausAdresse?'leer = '+sEsc(ausAdresse)+' (aus der Anschrift)':'für die Gebietsliste der KSpVO BW'})
      +wzFeld('we','Wohnungs- oder Teileigentum',{typ:'wahl',optionen:VV_WE,zeichnen:true})
      +(r.we==='begruendet'?wzFeld('weAm','Begründet am',{typ:'datum',hinweis:'Anlegung des Wohnungsgrundbuchs'}):'')
      +(r.we!=='nein'?wzFeld('schonVerkauft','Seit der Aufteilung schon einmal verkauft',{typ:'wahl',optionen:VV_JNU,zeichnen:true})
        +(r.schonVerkauft==='ja'?wzFeld('ersteVeraeusserung','Erste Veräußerung nach der Aufteilung',{typ:'datum',hinweis:'Umschreibung laut Grundbuch'}):'')
        +wzFeld('teileigentum','Teileigentum, zu Wohnzwecken vermietet',{typ:'check',zeichnen:true}):'')
      +wzFeld('wohnungen','Wohnungen im Gebäude',{typ:'zahl',hinweis:'für § 573a BGB (höchstens zwei Wohnungen)'})
      +wzFeld('paket','Mehrfamilienhaus im Paket zum Gesamtpreis oder der Käufer will aufteilen',{typ:'check',zeichnen:true,voll:true})+'</div>'
      +(String(f.vermietung_besch||'').trim()?wzHinweis('Aus der Bewertung (nur gelesen): '+sEsc(String(f.vermietung_besch).trim())):''))
    +wzBox('Mieteinheiten <span class="u">ohne Namen der Mieter</span>',r.einheiten.map((e,i)=>vvEinheitHtml(r,e,i,erg.vorkauf.einheiten[i])).join('')
      +'<button type="button" class="plus" onclick="vvEinheitNeu()">＋ Mieteinheit</button>')
    +wzBox('Käufer <span class="u">ohne Namen</span>','<div class="grid">'
      +wzFeld('kaeuferseite','Käuferseite',{typ:'wahl',optionen:VV_SEITE,zeichnen:true})+wzFeld('nutzung','Geplante Nutzung',{typ:'wahl',optionen:VV_NUTZUNG,zeichnen:true})
      +wzFeld('kaeuferFamilie','Käufer ist Familien- oder Haushaltsangehöriger des Verkäufers (§ 577 Abs. 1 Satz 2 BGB)',{typ:'check',zeichnen:true,voll:true})
      +wzFeld('kaeuferErbe','Verkauf an einen gesetzlichen Erben mit Blick auf das künftige Erbrecht (§ 470 BGB)',{typ:'check',zeichnen:true,voll:true})
      +wzFeld('zwangsversteigerung','Zwangsversteigerung oder Verkauf durch den Insolvenzverwalter (§ 471 BGB)',{typ:'check',zeichnen:true,voll:true})+'</div>')
    +wzBox('Kaufvertrag und Übergang','<div class="grid">'
      +wzFeld('beurkundetAm','Kaufvertrag beurkundet am',{typ:'datum'})+wzFeld('uebergabeAm','Übergabe (Besitz) am',{typ:'datum'})
      +wzFeld('umschreibungAm','Eigentum umgeschrieben am',{typ:'datum'})
      +wzFeld('mitteilungUebergangAm','Mitteilung des Eigentumsübergangs an den Mieter am',{typ:'datum'})
      +wzFeld('kautionUebertragenAm','Kaution an den Käufer übertragen am',{typ:'datum'})
      +wzFeld('leerVerkaufen','Verkäufer möchte leer (ohne Mieter) verkaufen',{typ:'check',zeichnen:true,voll:true})+'</div>'
      +(n?wzHinweis('Notarauftrag (nur gelesen): Stand '+sEsc(n.stand||'Entwurf')+', Zustand „'+sEsc(n.raeumung||'–')+'“'
          +(String(n.kautionen||'').trim()?', Kautionen gesamt '+sEsc(wzEur(wzN(n.kautionen,true))):'')+(wzdDatum(n.termin)?', Termin '+wzDatum(n.termin):'')+'.')
        +'<div class="gr-zeile"><button type="button" class="secondary" onclick="vvAusNotarDaten()" data-ic="arrow-down">Daten aus dem Notarauftrag</button></div>'
        :wzHinweis('Kein Notarauftrag mit dieser Anschrift. „Kautionen gesamt“ im Notarauftrag wird mit der Summe der Kautionen abgeglichen.')))
    +wzBox('Anzeigen',vvAnzeigeHtml(r))
    +wzBox('Eigentümer und Notiz','<div class="grid"><div class="field"><label>Eigentümer</label><div class="vl-empf"><b>'+sEsc(kd?kdName(kd):r.kundeId?'(Kunde gelöscht)':'–')+'</b>'
        +'<button type="button" class="secondary" onclick="vvKundeWaehlen()" data-ic="users">'+(kd?'Ändern':'Aus der Kundenakte')+'</button></div></div></div>'
      +wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'ohne Namen der Mieter'}));
}
function vvUnterlagen(){ let r=VV.aktiv; if(!r) return; let pid=r.projektId; vvAbgleich(r).then(()=>{ wzOeffnen('unterlagen'); if(typeof ulOeffnen==='function') ulOeffnen(pid); }); }
function vvZeichnen(){
  if(!wzdBereit()||!VV.notar){ vvLaden().then(()=>{ if(WZ.aktiv==='vermietet') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(VV.aktiv&&!wzdListe('akten').some(x=>x.id===VV.aktiv.id)) VV.aktiv=null;
  return VV.aktiv?vvEditor(VV.aktiv):vvListeHtml();
}
/* nach jeder Eingabe: Ampeln und Kennzahlen neu, ohne die Felder neu aufzubauen */
function vvRechnen(){
  iconify($('wz_body')); let r=VV.aktiv; if(!r) return;
  let erg=vvPruefen(r); wzH('vv_pruefung',vvPruefungHtml(erg)); wzH('vv_kpis',vvKpiHtml(erg));
  // Datums- und Textfelder bauen die Ansicht nicht neu auf: Name, Vorkaufsteil und Fristende je Einheit hier nachführen
  r.einheiten.forEach((e,i)=>{ let vk=erg.vorkauf.einheiten[i], box=$('vv_vk_'+i);
    wzT('vv_bez_'+i,e.bez||'Mieteinheit '+(i+1)); if(box) box.hidden=!!vk&&vk.besteht===false; wzH('vv_frist_'+i,vvFristText(r,e,vk)); });
}

/* ---------- Dokument: Prüfliste ohne Namen der Mieter ---------- */
function vvDokument(){
  let r=VV.aktiv;
  if(!r){ let z=wzdAkten(VV_ART).map(x=>{ let e=vvPruefen(x); return [sEsc(vvName(x)),String((x.einheiten||[]).length),VV_STUFE[e.vorkauf.stufe],sEsc(vvSperrKurz(e.sperr)),String(e.rot)]; });
    return {titel:'Vermietet verkaufen',html:'<h1>Vermietet verkaufen</h1><p class="wzd-unter">Übersicht · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +(z.length?wzDokTabelle(z,['Objekt','Mieteinheiten','Vorkaufsrecht','Kündigungssperrfrist','rot']):'<p>Noch kein vermietetes Objekt erfasst.</p>'),fuss:'Übersicht ohne Namen der Mieter.'}; }
  let o=wzdObjekt(r.projektId), erg=vvPruefen(r), d=erg.daten, jn=v=>v==='ja'?'ja':v==='nein'?'nein':v==='unbekannt'?'unbekannt':'–', t=(l,v)=>(l.find(x=>x[0]===v)||['','–'])[1];
  let einheiten=r.einheiten.map((e,i)=>[sEsc(e.bez||'Einheit '+(i+1)),wzdDatum(e.ueberlassenAm)?wzDatum(e.ueberlassenAm):'–',wzN(e.kaltmiete,true)>0?wzEur(wzN(e.kaltmiete,true)):'–',
    wzN(e.kaution,true)>0?wzEur(wzN(e.kaution,true)):'–',sEsc(t(VV_KAUTION,e.kautionArt)),jn(e.getrennt),jn(e.schriftlich),jn(e.befristet),jn(e.vorauszahlung)]);
  let fristen=erg.vorkauf.einheiten.filter(u=>u.fristEnde).map(u=>['Ende der Vorkaufsfrist'+(u.bez?' ('+sEsc(u.bez)+')':''),wzDatum(u.fristEnde)]);
  if(erg.sperr.gilt===true) fristen.push(['Kündigungssperrfrist',sEsc(vvSperrKurz(erg.sperr))]);
  return {titel:'Vermietet verkaufen '+vvName(r),pflicht:true,
    html:'<h1>Vermietet verkaufen</h1><p class="wzd-unter">'+sEsc((o&&o.anschrift)||vvName(r))+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle([['Objekt',sEsc((o&&o.anschrift)||vvName(r))],['Gemeinde',sEsc(d.gemeinde||'–')],['Wohnungs- oder Teileigentum',sEsc(t(VV_WE,r.we))],
        r.we==='begruendet'?['begründet am',wzdDatum(r.weAm)?wzDatum(r.weAm):'–']:null,r.we!=='nein'?['Seit der Aufteilung schon verkauft',jn(r.schonVerkauft)]:null,
        r.teileigentum?['Teileigentum zu Wohnzwecken vermietet','ja']:null,r.paket?['Paket oder Aufteilungsabsicht','ja']:null])
      +'<h2>Mieteinheiten</h2>'+wzDokTabelle(einheiten,['Einheit','Überlassen am','Kaltmiete','Kaution','Art','getrennt angelegt','schriftlich','befristet/Verzicht','Vorauszahlung/Abtretung'])
      +'<h2>Käufer</h2>'+wzDokTabelle([['Käuferseite',sEsc(t(VV_SEITE,r.kaeuferseite))],['Geplante Nutzung',sEsc(t(VV_NUTZUNG,r.nutzung))],
        r.kaeuferFamilie?['Familien- oder Haushaltsangehöriger','ja']:null,r.kaeuferErbe?['Gesetzlicher Erbe (künftiges Erbrecht)','ja']:null,r.zwangsversteigerung?['Zwangsversteigerung oder Insolvenz','ja']:null])
      +'<h2>Ablauf</h2>'+wzDokTabelle([['Kaufvertrag beurkundet',wzdDatum(r.beurkundetAm)?wzDatum(r.beurkundetAm):'–'],['Übergabe',wzdDatum(r.uebergabeAm)?wzDatum(r.uebergabeAm):'–'],
        ['Eigentum umgeschrieben',wzdDatum(r.umschreibungAm)?wzDatum(r.umschreibungAm):'–'],['Mitteilung des Eigentumsübergangs an den Mieter',wzdDatum(r.mitteilungUebergangAm)?wzDatum(r.mitteilungUebergangAm):'–'],
        ['Kaution an den Käufer übertragen',wzdDatum(r.kautionUebertragenAm)?wzDatum(r.kautionUebertragenAm):'–']].concat(fristen))
      +'<h2>Prüfung</h2>'+wzDokTabelle(erg.ampeln.map(a=>[sEsc(a.bereich),VV_STUFE[a.stufe],sEsc(a.text)]),['Bereich','Ergebnis','Prüfpunkt'])
      +'<p class="wzd-klein">Ohne Namen der Mieter. Prüfpunkte mit Normangabe, keine Rechtsberatung. Mitteilungen an Mieter: Text vom Notariat oder aus dem Vordruck der Bank. Offene Fragen mit Notariat oder Rechtsabteilung klären.</p>',
    fuss:'Prüfliste zur Vorbereitung; maßgeblich sind der beurkundete Vertrag und die Auskunft des Notariats.'};
}
function vvKundeText(){
  let r=VV.aktiv; if(!r){ alert('Bitte zuerst ein Objekt öffnen.'); return ''; }
  let erg=vvPruefen(r);
  return 'Vermietet verkaufen '+vvName(r)+': '+r.einheiten.length+' Mieteinheit'+(r.einheiten.length===1?'':'en')+', Vorkaufsrecht '+VV_STUFE[erg.vorkauf.stufe]+', '+vvSperrKurz(erg.sperr)+'.';
}

/* ---------- Für andere Kacheln: Notarauftrag (Abschnitt „Besitzübergang und Mietverhältnisse“) ---------- */
function vvNotarHinweis(n){
  if(!n||typeof wzdObjekte!=='function') return '';
  let o=wzdObjekte(true).find(x=>vvGleich(n.anschrift,x.anschrift)||vvGleich(n.projekt,x.name)), r=o&&vvAkte(o.id);
  if(!r) return vvNotarVermietet(n)?wzAmpel('gelb','Vermietet: Vorkaufsrecht, Sperrfrist und Kaution in der Kachel „Vermietet verkaufen“ prüfen.'):'';
  let erg=vvPruefen(r);
  return erg.vorkauf.stufe==='rot'?wzAmpel('rot','Vorkaufsrecht des Mieters: Mitteilung offen oder Vorkaufsrecht ausgeübt — Kachel „Vermietet verkaufen“ (§§ 577, 469 BGB).'):'';
}

/* ---------- Verkaufsfahrplan: Schritt „Vorkaufsrecht des Mieters geklärt“ (Schlüssel vv_vorkauf) ---------- */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>{ let r=vvAkte(o.id); return r?{vv_vorkauf:vvPruefen(r).geklaert}:{}; });

/* ---------- Kundenakte: Löschen und Auskunft (Verweis auf den Eigentümer; Mieter ohne Namen) ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const r of wzdAkten(VV_ART).filter(r=>r.kundeId===id)){ r.kundeId=''; r.notiz=''; await wzdSpeichern('akten',r); }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=wzdAkten(VV_ART).filter(r=>r.kundeId===id);
  return ['','VERMIETET VERKAUFEN'].concat(l.length?l.map(r=>'- '+vvName(r)+': Eigentümer; '+(r.einheiten||[]).length+' Mieteinheit'+((r.einheiten||[]).length===1?'':'en')+' ohne Namen der Mieter'
    +(wzdDatum(r.beurkundetAm)?', Kaufvertrag beurkundet am '+wzDatum(r.beurkundetAm):'')+(wzdDatum(r.umschreibungAm)?', Eigentum umgeschrieben am '+wzDatum(r.umschreibungAm):'')
    +'; gespeichert: Angaben zu Mietverhältnissen, Fristen'+(String(r.notiz||'').trim()?', Notiz: '+String(r.notiz).trim():'')):['- keine']);
});

wzRegistrieren({id:'vermietet',titel:'Vermietet verkaufen',sub:'Mieter ohne Namen — Vorkaufsrecht, Sperrfrist, Eigenbedarf, Kaution und Übergang',icon:'building',ohneNeu:true,
  zustand:()=>VV.aktiv||vvS(),speichern:vvSpeichern,zeichnen:vvZeichnen,rechnen:vvRechnen,dokument:vvDokument,kundeText:vvKundeText,
  schliessen:()=>{ let r=VV.aktiv; if(r){ clearTimeout(VV.timer); wzdSpeichernSofort('akten',r); vvAbgleich(r); } VV.aktiv=null; VV.notar=null; VV.laeuft=null; VV.anzeige=''; }});
