/* ---------- Kachel „Maklerverträge“ (D54) ----------
   Je Maklervertrag (Verkäufer- oder Käuferseite) die Tatsachen, an denen der Anspruch auf Provision hängt: Vertragspartner aus
   der Kundenakte, Objekt, Seite und Art, Verbraucher (§ 13 BGB), Wohnung oder Einfamilienhaus (§ 656a BGB), Datum und Weg des
   Abschlusses, Textform, Belehrung mit Muster-Widerrufsformular und Stand des Bank-Vordrucks, Verlangen auf vorzeitigen Beginn,
   Bestätigung zum Erlöschen, Abschrift oder Bestätigung (§ 312f BGB), Widerruf und Laufzeit des Alleinauftrags. Daraus rechnet
   js/maklervertrag-regeln.js Widerrufsrecht, Frist mit Feiertagen in Baden-Württemberg, Höchstfrist und die Ampeln.
   Keine eigenen Rechtstexte: Vertrag, Belehrung und Formular sind die Vordrucke der Bank. Gespeichert im Speicher „akten“
   (Art „maklervertrag“); Personen nur als Kunden-Id. Bewertungen, Notaraufträge und Provisionsabrechnungen werden nur gelesen.
   Fristen gehen als Wiedervorlagen in den Kalender; der Verkaufsfahrplan erkennt den Maklervertrag (FP_AUTO_HOOKS). */
var MV={aktiv:null,notarLaedt:false};
function mvS(){ let a=wzAlle(); if(!a.maklervertrag||typeof a.maklervertrag!=='object'||Array.isArray(a.maklervertrag)) a.maklervertrag={filter:'alle'}; return a.maklervertrag; }
function mvR(){ return ImmoMaklervertragRegeln; }
function mvText(liste,k){ return (liste.find(x=>x[0]===k)||['',''])[1]; }
function mvNorm(x){ return String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); }
function mvLeer(seite){
  return wzdAkteNeu('maklervertrag',{projektId:'',objekt:'',kundeId:'',seite:seite==='kaeufer'?'kaeufer':'verkaeufer',vertragsart:seite==='kaeufer'?'nachweis':'allein',
    verbraucher:true,provision:true,wohnung:true,satz:'',abschluss:'',weg:'',ausserhalbBW:false,kaeufer:{expose:'',link:'',bitte:'',vereinbarung:''},
    textform:{datum:'',form:'',bestimmt:false},belehrung:{datum:'',form:'',formular:false,vordruck:'',online:false},zustimmung:'',
    online:{zahlungspflichtig:false,widerrufsfunktion:false},verlangen:{datum:'',datentraeger:false},erloeschen:'',beginn:'',beurkundet:'',
    abschrift:{datum:'',form:''},widerruf:{abgesandt:'',eingang:''},laufzeit:{bis:'',vorlauf:'14'},notiz:'',wv:{}});
}
/* Wohnung oder Einfamilienhaus (auch Doppel- oder Reihenhaus) aus der Bewertung — wie die Kachel „Provision“ */
function mvWohnungAus(f){ f=f||{}; return (f.ek_modus||'')==='wohnung'||/^(EFH|Doppel|Reihen)/.test(f.ek_typ||''); }
function mvObjektSetzen(a,id){
  a.projektId=id||''; let o=wzdObjekt(id); if(!o) return;
  a.objekt=o.name; a.wohnung=mvWohnungAus(o.f);
  if(a.seite==='verkaeufer'&&!a.kundeId&&o.kundeId) a.kundeId=o.kundeId;
  if(a.seite==='kaeufer'&&!a.satz&&typeof nkSatzAusText==='function'){ let s=nkSatzAusText(o.f.ex_provision); if(s!=='') a.satz=s+' % inkl. USt'; }
}
function mvObjektName(a){ return wzdObjektName(a.projektId,'')||(a.objekt||'').trim()||'ohne Objekt'; }
function mvTitel(a){ return mvObjektName(a)+' · '+mvText(mvR().SEITEN,a.seite); }
/* Notarauftrag zum Objekt (nur gelesen): Termin und Beurkundung */
function mvNotar(a){
  let l=(typeof NO!=='undefined'&&NO.liste)||[], o=wzdObjekt(a.projektId), namen=[o&&o.anschrift,o&&o.name,a.objekt].map(mvNorm).filter(Boolean);
  let t=l.filter(n=>wzdDatum(n.termin)&&(namen.includes(mvNorm(n.anschrift))||namen.includes(mvNorm(n.projekt)))).sort((x,y)=>y.termin.localeCompare(x.termin));
  if(!t.length) return {};
  let n=t[0], st=typeof NO_STAENDE!=='undefined'?NO_STAENDE.indexOf(n.stand):-1;
  return {notarTermin:n.termin,beurkundet:st>=3?n.termin:'',notarStand:n.stand||''};
}
/* Provisionsabrechnung dieser Seite (nur gelesen): gezahlt? */
function mvBezahlt(a){
  let o=wzdObjekt(a.projektId), anschr=mvNorm(o&&o.anschrift), treffer=null;
  wzdListe('abrechnungen').filter(x=>(a.projektId&&x.projektId===a.projektId)||(anschr&&mvNorm(x.anschrift)===anschr)).forEach(x=>(x.parteien||[]).forEach(y=>{
    if(!treffer&&y.rolle===a.seite&&(!a.kundeId||!y.kundeId||y.kundeId===a.kundeId)) treffer=y; }));
  return treffer?{abrechnung:true,bezahltAm:wzdDatum(treffer.bezahltAm)}:{abrechnung:false,bezahltAm:''};
}
function mvPruef(a){ let n=mvNotar(a); return mvR().pruefen(a,aufHeute(),{datum:wzDatum,notarTermin:n.notarTermin,beurkundet:n.beurkundet}); }

/* ---------- Anlegen, öffnen, löschen ---------- */
async function mvNeu(seite,vorlage){
  await wzdLaden(); let a=mvLeer(seite); vorlage=vorlage||{};
  if(vorlage.kundeId) a.kundeId=vorlage.kundeId;
  if(vorlage.projektId) mvObjektSetzen(a,vorlage.projektId);
  if(!(await wzdSpeichern('akten',a))) return;
  MV.aktiv=a; if(WZ.aktiv==='maklervertrag') wzZeichnen(); $('wz_overlay').scrollTop=0;
}
async function mvOeffnen(id){ await wzdLaden(); let a=wzdAkten('maklervertrag').find(x=>x.id===id); if(!a) return; MV.aktiv=a; if(WZ.aktiv==='maklervertrag') wzZeichnen(); $('wz_overlay').scrollTop=0; }
/* aus dem Verkaufsfahrplan: Vertrag mit dem Verkäufer zum Objekt öffnen oder anlegen */
async function mvFuerObjekt(pid){
  await wzdLaden(); let l=wzdAkten('maklervertrag',pid).filter(a=>a.seite==='verkaeufer');
  if(l.length) await mvOeffnen(l[0].id); else await mvNeu('verkaeufer',{projektId:pid});
}
function mvAusAkte(id){ wzOeffnen('maklervertrag'); mvOeffnen(id); }
/* beim Verlassen: schon vorgemerkte Fristen mit den aktuellen Daten fortschreiben, dann speichern */
function mvAbschluss(){ let a=MV.aktiv; if(!a) return; if(a.wv&&Object.keys(a.wv).length) mvFristenVormerken(true); wzdSpeichernSofort('akten',a); }
function mvZurueck(){ mvAbschluss(); MV.aktiv=null; wzZeichnen(); }
async function mvLoeschen(){
  let a=MV.aktiv; if(!a||!confirm('Diesen Vermerk zum Maklervertrag löschen? Der Vertrag selbst und die Vordrucke der Bank bleiben davon unberührt.')) return;
  if(await wzdLoeschen('akten',a.id)){ MV.aktiv=null; wzZeichnen(); }
}
function mvSpeichern(){ if(MV.aktiv) wzdSpeichernBald('akten',MV.aktiv); else wzSpeichern(); }
function mvObjektWaehlen(id){ let a=MV.aktiv; if(!a) return; mvObjektSetzen(a,id); mvSpeichern(); wzZeichnen(); }
function mvKundeWaehlen(){ wzdKundeWaehlen(id=>{ let a=MV.aktiv; if(!a||!wzdKunde(id)) return; a.kundeId=id; wzdSpeichernSofort('akten',a); wzZeichnen(); }); }
function mvFilter(f){ mvS().filter=f; wzSpeichern(); wzZeichnen(); }

/* ---------- Wiedervorlagen: Fristen in den Kalender (Liste „Wiedervorlagen“) ----------
   Je Frist ein Eintrag; schon angelegte, offene Einträge werden mit neuem Datum fortgeschrieben statt verdoppelt.
   Überholte Fristen (z. B. „frist“ nach Wegfall der Belehrung, nach Widerruf) werden aus der Liste entfernt, wenn noch offen. */
function mvFristenVormerken(still){
  let a=MV.aktiv; if(!a) return 0;
  let p=mvPruef(a), bz=mvBezahlt(a), l=mvR().wiedervorlagen(a,p,{datum:wzDatum,bezahlt:bz.abrechnung?!!bz.bezahltAm:undefined});
  if(!a.wv||typeof a.wv!=='object') a.wv={};
  let auf=aufLoad(), name=mvObjektName(a), neu=[], geaendert=0, weg=Object.keys(a.wv).filter(k=>!l.some(x=>x.key===k)), entfernt=0;
  if(!l.length&&!weg.length){ if(!still) alert('Keine Frist zum Vormerken. Erst Vertragsschluss, Belehrung, Widerruf oder Laufzeit eintragen.'); return 0; }
  weg.forEach(k=>{ let i=auf.findIndex(y=>y.id===a.wv[k]&&!y.erledigt); if(i>=0){ auf.splice(i,1); entfernt++; } });
  l.forEach(x=>{ let text='Maklervertrag '+name+' ('+mvText(mvR().SEITEN,a.seite)+'): '+x.text, alt=a.wv[x.key]&&auf.find(y=>y.id===a.wv[x.key]&&!y.erledigt);
    if(alt){ if(alt.frist!==x.datum||alt.text!==text){ alt.frist=x.datum; alt.text=text; geaendert++; } } else neu.push({x,text}); });
  if((geaendert||entfernt)&&!aufStore(auf)) return 0;
  weg.forEach(k=>{ delete a.wv[k]; });
  neu.forEach(({x,text})=>{ let w=wzdWiedervorlage(text,x.datum,name,a.kundeId); if(w) a.wv[x.key]=w.id; });
  try{ aufBadge(); aufStartRender(); }catch(e){}
  wzdSpeichernSofort('akten',a);
  let hinweis=entfernt?'\n\n'+(entfernt===1?'Eine überholte Wiedervorlage':entfernt+' überholte Wiedervorlagen')+' entfernt.':'';
  if(!still) alert(l.length?l.map(x=>wzDatum(x.datum)+': '+x.text).join('\n')+'\n\nIm Kalender und unter „Wiedervorlagen“ vorgemerkt.'+hinweis:'Keine Frist zum Vormerken.'+hinweis);
  return l.length;
}
function mvZusammenfassung(a,p){
  return 'Maklervertrag '+mvObjektName(a)+' ('+mvText(mvR().SEITEN,a.seite)+', '+mvText(mvR().ARTEN,a.vertragsart)+'): Vertragsschluss '+wzDatum(p.vertragsschluss)
    +(a.weg?', '+mvText(mvR().WEGE,a.weg):'')+'; Textform '+(wzdDatum(a.textform&&a.textform.datum)?wzDatum(a.textform.datum):'–')
    +'; Belehrung '+(wzdDatum(a.belehrung&&a.belehrung.datum)?wzDatum(a.belehrung.datum)+(a.belehrung.formular?' mit Muster-Widerrufsformular':''):'–')
    +(p.widerrufsrecht?'; Widerrufsfrist bis '+wzDatum(p.ende):'; kein Widerrufsrecht')+'.';
}
async function mvKundeVermerk(){
  let a=MV.aktiv; if(!a) return;
  if(!wzdKunde(a.kundeId)){ alert('Bitte zuerst den Vertragspartner aus der Kundenakte wählen.'); return; }
  if(await wzdNotiz(a.kundeId,'Maklervertrag',mvZusammenfassung(a,mvPruef(a)))) alert('Vermerk in der Kundenakte von '+wzdKundeName(a.kundeId)+' abgelegt.');
}
/* Widerruf eingegangen: Vermerk in der Kundenakte und Wiedervorlage „Rückzahlung bis …“ */
async function mvWiderrufVermerken(){
  let a=MV.aktiv; if(!a) return; let p=mvPruef(a);
  if(!p.widerrufen){ alert('Erst Absendung oder Eingang des Widerrufs eintragen.'); return; }
  let text='Widerruf des Maklervertrags '+mvObjektName(a)+(wzdDatum(a.widerruf.abgesandt)?' abgesandt am '+wzDatum(a.widerruf.abgesandt):'')+(wzdDatum(a.widerruf.eingang)?', eingegangen am '+wzDatum(a.widerruf.eingang):'')
    +(p.rueckzahlungBis?'; gezahlte Provision spätestens bis '+wzDatum(p.rueckzahlungBis)+' zurückzahlen':'')+'.';
  if(wzdKunde(a.kundeId)) await wzdNotiz(a.kundeId,'Maklervertrag',text);
  mvFristenVormerken(true);
  alert(text+(wzdKunde(a.kundeId)?'\n\nIn der Kundenakte vermerkt.':'')+(p.rueckzahlungBis?'\nWiedervorlage zur Rückzahlung angelegt.':''));
  wzZeichnen();
}

/* ---------- Ansicht ---------- */
function mvChip(stufe,text){ return '<span class="mv-chip mv-'+stufe+'">'+sEsc(text)+'</span>'; }
function mvListeHtml(){
  let S=mvS(), alle=wzdAkten('maklervertrag').map(a=>({a,p:mvPruef(a)}))
    .sort((x,y)=>(y.p.vertragsschluss||'').localeCompare(x.p.vertragsschluss||'')||(y.a.ts||0)-(x.a.ts||0));
  let laeuft=alle.filter(x=>x.p.phase==='laeuft'||x.p.phase==='puffer').length, rot=alle.filter(x=>x.p.gesamt==='rot').length;
  let allein=alle.filter(x=>x.a.vertragsart==='allein'&&!x.p.widerrufen), bald=allein.filter(x=>{ let l=x.p.ampeln.find(y=>y.id==='laufzeit'); return l&&l.stufe==='gelb'; }).length;
  let l=alle.filter(x=>S.filter!=='handlung'||x.p.gesamt!=='gruen');
  return '<div class="ka-leiste"><button type="button" class="primary" onclick="mvNeu(\'verkaeufer\')" data-ic="plus">Vertrag mit Verkäufer</button>'
      +'<button type="button" class="secondary" onclick="mvNeu(\'kaeufer\')" data-ic="plus">Vertrag mit Käufer</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Widerrufsfrist läuft',String(laeuft),laeuft?'Leistung vor Fristende nur mit Verlangen':'keine offene Frist')
      +wzdKpi('Prüfpunkte rot',String(rot),rot?'Vertrag'+(rot===1?'':'e')+' mit rotem Punkt':'nichts rot')
      +wzdKpi('Alleinaufträge',String(allein.length),bald?'davon '+bald+' ohne Laufzeit oder bald zu Ende':'')+'</div>'
    +'<div class="ka-schalter" role="group" aria-label="Filter">'+[['alle','Alle'],['handlung','Mit Handlungsbedarf']]
      .map(([k,t])=>'<button type="button" class="'+((S.filter||'alle')===k?'primary':'secondary')+'" aria-pressed="'+((S.filter||'alle')===k)+'" onclick="mvFilter(\''+k+'\')">'+t+'</button>').join('')+'</div>'
    +(l.length?'<div class="kd-karten">'+l.map(({a,p})=>'<div class="kd-karte mv-karte"><div><b>'+sEsc(mvObjektName(a))+'</b><span>'
        +sEsc([mvText(mvR().SEITEN,a.seite),mvText(mvR().ARTEN,a.vertragsart),wzdKundeName(a.kundeId)||'ohne Vertragspartner','Vertragsschluss '+wzDatum(p.vertragsschluss)].join(' · '))+'</span>'
        +'<div class="mv-chips">'+mvChip(p.provision.stufe,p.provision.text)+(p.zahl.rot||p.zahl.gelb?mvChip(p.zahl.rot?'rot':'gelb',[p.zahl.rot?p.zahl.rot+' rot':'',p.zahl.gelb?p.zahl.gelb+' gelb':''].filter(Boolean).join(', ')):'')+'</div></div>'
        +'<div class="kd-k"><button class="secondary" onclick="mvOeffnen(\''+idSicher(a.id)+'\')">Öffnen</button></div></div>').join('')+'</div>'
      :wzHinweis(alle.length?'Kein Vertrag mit Handlungsbedarf.':'Noch kein Maklervertrag vermerkt. Mit „Vertrag mit Verkäufer“ oder „Vertrag mit Käufer“ beginnen.'))
    +wzHinweis('Die Rechtstexte – Maklervertrag, Widerrufsbelehrung und Muster-Widerrufsformular – sind die Vordrucke der Bank. Die Kachel hält fest, wann und wie sie übergeben wurden, und rechnet die Fristen.');
}
function mvKpis(a,p){
  let typ={aussen:'außerhalb von Geschäftsräumen',fern:'Fernabsatz',online:'Fernabsatz über Online-Oberfläche',unklar:'Abschlussweg offen – angenommen',keins:''}[p.typ]||'';
  return wzdKpi('Widerrufsrecht',p.widerrufsrecht?'ja':'nein',p.widerrufsrecht?typ:(a.verbraucher===false?'kein Verbraucher':a.provision===false?'keine Provision vereinbart':'Filiale'))
    +wzdKpi('Widerrufsfrist bis',p.widerrufsrecht&&p.ende?wzDatum(p.ende):'–',p.widerrufsrecht?(p.belehrt?'ab '+(p.abBelehrung?'Belehrung':'Vertragsschluss')+' am '+wzDatum(p.beginn):p.V?'Höchstfrist – nicht belehrt':'Vertragsschluss fehlt'):'')
    +wzdKpi('Höchstfrist',p.hoechst.ende?wzDatum(p.hoechst.ende):'–',p.hoechst.ende?'§ 356 Abs. 4 Satz 1 BGB · Weg a '+wzDatum(p.hoechst.a)+', Weg b '+wzDatum(p.hoechst.b):'ohne Belehrung')
    +wzdKpi('Ampel zur Provision',{rot:'Rot',gelb:'Gelb',gruen:'Grün'}[p.provision.stufe],p.provision.text);
}
function mvPruefungHtml(a,p){
  return p.ampeln.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join('')
    +(p.widerrufsrecht&&!p.widerrufen?'<p class="hint mv-zusatz">Wertersatz bei Widerruf: '+(p.wertersatz?'Voraussetzungen vermerkt (§ 357a Abs. 2 BGB) – Höhe ungeklärt, nicht damit rechnen.':'nein – Verlangen auf vorzeitigen Beginn fehlt (§ 357a Abs. 2 BGB).')
      +(p.erloschen||wzdDatum(a.verlangen&&a.verlangen.datum)||wzdDatum(a.erloeschen)||wzdDatum(a.beginn)?' Erlöschen vor Fristende: '+(p.erloschen?'dokumentiert.':'nicht dokumentiert (fehlt: '+sEsc(p.erloeschenFehlt.join(', '))+').'):'')+'</p>':'');
}
function mvWiderrufInfo(a,p){
  if(!p.widerrufen) return '';
  let bz=mvBezahlt(a);
  return '<p class="hint">'+(bz.bezahltAm?'Provision laut Kachel „Provision“ gezahlt am '+wzDatum(bz.bezahltAm)+(p.rueckzahlungBis?' – Rückzahlung spätestens bis '+wzDatum(p.rueckzahlungBis)+'.':' – Eingang des Widerrufs eintragen.')
      :bz.abrechnung?'In der Kachel „Provision“ ist für diese Seite keine Zahlung vermerkt – keine Provision fordern.':'Keine Provisionsabrechnung zu diesem Objekt gefunden.')
    +' Die Abrechnung in der Kachel „Provision“ bitte anpassen.</p>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="mvWiderrufVermerken()" data-ic="users">Widerruf in Kundenakte und Kalender</button></div>';
}
function mvEditor(a){
  let R=mvR(), p=mvPruef(a), kaeufer=a.seite==='kaeufer', aussen=p.typ==='aussen'||p.typ==='unklar', n=mvNotar(a), name=wzdKundeName(a.kundeId);
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="mvZurueck()" data-ic="arrow-left">Alle Verträge</button>'
      +'<span class="ub-status">'+sEsc(mvTitel(a))+'</span>'
      +'<button type="button" class="secondary" onclick="mvFristenVormerken()" data-ic="clock">Fristen vormerken</button>'
      +'<button type="button" class="secondary" onclick="mvKundeVermerk()" data-ic="users">In die Kundenakte</button>'
      +'<button type="button" class="secondary" onclick="mvLoeschen()" data-ic="trash">Löschen</button></div>'
    +'<div class="wz-kpis grid" id="mv_kpis">'+mvKpis(a,p)+'</div>'
    +wzBox('Prüfung','<div id="mv_pruefung">'+mvPruefungHtml(a,p)+'</div>'
      +wzHinweis('Nur Prüfpunkte mit Normangabe – die Rechtstexte sind die Vordrucke der Bank. Unklares mit der Rechtsabteilung klären.'))
    +wzBox('Vertrag','<div class="grid">'
      +'<div class="field"><label>Vertragspartner</label><div class="vl-empf"><b>'+sEsc(name||'–')+'</b><button type="button" class="secondary" onclick="mvKundeWaehlen()" data-ic="users">'+(name?'Ändern':'Aus der Kundenakte')+'</button></div></div>'
      +'<div class="field"><label for="mv_objekt">Objekt aus den Bewertungen</label><select id="mv_objekt" onchange="mvObjektWaehlen(this.value)">'+wzdObjektOptionen(a.projektId,'– frei eintragen –')+'</select></div>'
      +(a.projektId?'':wzFeld('objekt','Bezeichnung des Objekts',{typ:'text',ph:'z. B. Einfamilienhaus Musterweg 1'}))
      +wzFeld('seite','Seite',{typ:'wahl',optionen:R.SEITEN,zeichnen:true})
      +wzFeld('vertragsart','Art',{typ:'wahl',optionen:R.ARTEN,zeichnen:true})
      +wzFeld('satz','Provision',{typ:'text',ph:'z. B. 3,57 % inkl. USt'})
      +wzFeld('verbraucher','Kunde ist Verbraucher (§ 13 BGB)',{typ:'check'})
      +wzFeld('provision','Provision mit dieser Seite vereinbart (§ 312 Abs. 1 BGB)',{typ:'check'})
      +wzFeld('wohnung','Wohnung oder Einfamilienhaus (§ 656a BGB)',{typ:'check',voll:true})
      +'</div>'+wzHinweis('Einfamilienhaus: erkennbar zum Wohnen eines Haushalts, auch mit untergeordneter Einliegerwohnung oder kleinem Büro (BGH I ZR 32/24). Für Mehrfamilienhaus, Bauplatz oder Gewerbe schreibt § 656a BGB keine Form vor.'))
    +wzBox('Abschluss','<div class="grid">'
      +wzFeld('abschluss','Vertragsschluss am',{typ:'datum',hinweis:kaeufer?'Vorschlag: Tag der ersten Bitte um Besichtigung nach dem Exposé (BGH I ZR 30/15)':''})
      +wzFeld('ausserhalbBW','Kunde wohnt außerhalb von Baden-Württemberg',{typ:'check'})
      +wzFeld('weg','Abschlussweg',{typ:'wahl',optionen:[['','– noch offen –']].concat(R.WEGE.map(w=>[w[0],w[1]])),zeichnen:true,voll:true})+'</div>'
      +'<p class="mv-folge">'+sEsc(R.WEG_FOLGE[a.weg||'']||'')+'</p>'
      +wzHinweis('Gemischte Wege oder unklar: Die App setzt ein Widerrufsrecht voraus – im Zweifel belehren. Wann eine Ansprache „unmittelbar zuvor“ war, legt die Bank fest.')
      +(kaeufer?'<h4 class="mv-unter">Käuferseite: mögliche Tage des Vertragsschlusses</h4><div class="grid">'
        +wzFeld('kaeufer.expose','Exposé mit Provisionsverlangen gesendet am',{typ:'datum'})+wzFeld('kaeufer.link','Link zum Exposé geöffnet am',{typ:'datum'})
        +wzFeld('kaeufer.bitte','Erste Bitte um Besichtigung am',{typ:'datum'})+wzFeld('kaeufer.vereinbarung','Vereinbarung unterschrieben am',{typ:'datum'})+'</div>'
        +wzHinweis('Für das Fristende nimmt die App das späteste dieser Daten (vgl. BGH I ZR 28/22). Belehrung und Muster-Widerrufsformular gehören schon zum Exposé.'):'')
      +(a.weg==='online'?'<h4 class="mv-unter">Online-Abschluss</h4>'
        +wzFeld('online.zahlungspflichtig','Schaltfläche „zahlungspflichtig …“ oder eindeutige Entsprechung geprüft (§ 312j Abs. 3 BGB)',{typ:'check',voll:true})
        +wzFeld('online.widerrufsfunktion','Schaltfläche „Vertrag widerrufen“ beim Portal vorhanden (§ 356a BGB)',{typ:'check',voll:true})
        +wzHinweis('Den Portalanbieter prüft die Bank, nicht die App.'):''))
    +wzBox('Textform (§ 656a, § 126b BGB)','<div class="grid">'+wzFeld('textform.datum','Textform erfüllt am',{typ:'datum'})+wzFeld('textform.form','Form',{typ:'wahl',optionen:R.TEXTFORMEN})
      +wzFeld('textform.bestimmt','Parteien, Provisionshöhe und Objekt ergeben sich aus den Erklärungen, das Ende der Erklärung ist erkennbar (BGH I ZR 202/25)',{typ:'check',voll:true})+'</div>')
    +wzBox('Widerrufsbelehrung und Muster-Widerrufsformular','<div class="grid">'
      +wzFeld('belehrung.datum','Übergeben am',{typ:'datum'})+wzFeld('belehrung.form','Form',{typ:'wahl',optionen:R.BELEHRUNGSFORMEN})
      +(aussen?wzFeld('zustimmung','Zustimmung zum dauerhaften Datenträger am',{typ:'datum',hinweis:'Nur nötig, wenn nicht auf Papier übergeben (Art. 246a § 4 Abs. 2 EGBGB, § 312f Abs. 1 BGB).'}):'')
      +wzFeld('belehrung.vordruck','Stand des Belehrungs-Vordrucks der Bank',{typ:'datum'})
      +wzFeld('belehrung.formular','Muster-Widerrufsformular dabei',{typ:'check'})
      +(a.weg==='online'?wzFeld('belehrung.online','Vordruck mit Hinweis auf die Widerrufsfunktion nach § 356a BGB – ohne ihn beginnt die Frist nicht (§ 356 Abs. 3 Satz 1 BGB; Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB)',{typ:'check',voll:true}):'')+'</div>'
      +wzHinweis('Die Belehrung gehört vor die Vertragserklärung des Kunden (Art. 246a § 4 Abs. 1 EGBGB). Der Schutz durch das Muster greift nur, wenn der Vordruck unverändert und richtig ausgefüllt ist (BGH I ZR 28/22).'))
    +wzBox('Vorzeitiger Beginn und Erlöschen','<div class="grid">'
      +wzFeld('verlangen.datum','Verlangen auf Beginn vor Fristablauf am',{typ:'datum'})+wzFeld('verlangen.datentraeger','Verlangen auf dauerhaftem Datenträger',{typ:'check'})
      +wzFeld('erloeschen','Bestätigung zum Erlöschen am',{typ:'datum',hinweis:'Kenntnis, dass das Widerrufsrecht mit vollständiger Erfüllung erlischt (§ 356 Abs. 5 Nr. 2 Buchst. c BGB).'})
      +wzFeld('beginn','Beginn der Tätigkeit am',{typ:'datum',hinweis:'z. B. erste Anzeige oder erstes Exposé'})
      +wzFeld('beurkundet','Kaufvertrag beurkundet am',{typ:'datum',hinweis:n.beurkundet?'laut Notarauftrag: '+wzDatum(n.beurkundet):n.notarTermin?'Notartermin laut Notarauftrag: '+wzDatum(n.notarTermin):'leer = aus dem Notarauftrag'})+'</div>'
      +wzHinweis('Ob die Bank Kunden um das Verlangen bittet, entscheidet sie selbst. Ohne Verlangen gibt es bei einem Widerruf keinen Wertersatz (§ 357a Abs. 2 BGB).'))
    +wzBox('Abschrift oder Bestätigung (§ 312f BGB)','<div class="grid">'+wzFeld('abschrift.datum','Übergeben oder gesendet am',{typ:'datum'})+wzFeld('abschrift.form','Form',{typ:'wahl',optionen:R.ABSCHRIFTFORMEN})+'</div>')
    +wzBox('Widerruf','<div class="grid">'+wzFeld('widerruf.abgesandt','Abgesandt am',{typ:'datum',hinweis:'Poststempel oder Zeit der E-Mail – für die Frist zählt die Absendung (§ 355 Abs. 1 Satz 5 BGB).'})
      +wzFeld('widerruf.eingang','Eingegangen am',{typ:'datum'})+'</div><div id="mv_widerruf">'+mvWiderrufInfo(a,p)+'</div>')
    +(a.vertragsart==='allein'?wzBox('Laufzeit des Alleinauftrags','<div class="grid">'+wzFeld('laufzeit.bis','Läuft bis',{typ:'datum'})+wzFeld('laufzeit.vorlauf','Wiedervorlage vorher',{typ:'zahl',einheit:'Tage'})+'</div>'
      +wzHinweis('Laufzeit, Verlängerung und Kündigung richten sich nach dem Vordruck der Bank; die Regeln dazu sind in der App nicht geprüft.')):'')
    +wzBox('Notiz',wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Vordruck „Maklerauftrag“ Stand 06/2026 verwendet'}));
}
function mvZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='maklervertrag') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(typeof noLaden==='function'&&typeof NO!=='undefined'&&!NO.liste&&!MV.notarLaedt){ MV.notarLaedt=true;
    noLaden().then(()=>{ MV.notarLaedt=false; if(WZ.aktiv==='maklervertrag') wzZeichnen(); }).catch(()=>{ MV.notarLaedt=false; }); }
  return MV.aktiv?mvEditor(MV.aktiv):mvListeHtml();
}
/* nach jeder Eingabe: Fristen und Ampeln neu, ohne die Felder neu aufzubauen */
function mvRechnen(){
  iconify($('wz_body')); let a=MV.aktiv; if(!a) return;
  let p=mvPruef(a);
  wzH('mv_kpis',mvKpis(a,p)); wzH('mv_pruefung',mvPruefungHtml(a,p)); wzH('mv_widerruf',mvWiderrufInfo(a,p)); iconify($('mv_widerruf'));
}

/* ---------- Dokumente: Prüfbogen je Vertrag (intern) oder Übersicht ohne Namen ---------- */
function mvDokument(){
  let R=mvR();
  if(MV.aktiv){
    let a=MV.aktiv, p=mvPruef(a), ja=x=>x?'ja':'nein', d=x=>wzdDatum(x)?wzDatum(x):'–', B=a.belehrung||{}, k=a.kaeufer||{};
    let zeilen=[['Vertragspartner',sEsc(wzdKundeName(a.kundeId)||'–')],['Objekt',sEsc(mvObjektName(a))],['Seite',mvText(R.SEITEN,a.seite)],['Art',mvText(R.ARTEN,a.vertragsart)],
      ['Provision',sEsc(a.satz||'–')],['Kunde ist Verbraucher (§ 13 BGB)',ja(a.verbraucher!==false)],['Provision vereinbart (§ 312 Abs. 1 BGB)',ja(a.provision!==false)],
      ['Wohnung oder Einfamilienhaus (§ 656a BGB)',ja(a.wohnung!==false)],['Vertragsschluss',d(p.vertragsschluss)+(p.vorschlag?' (Vorschlag: erste Bitte um Besichtigung)':'')]];
    if(a.seite==='kaeufer') zeilen.push(['Exposé gesendet / Link geöffnet',d(k.expose)+' / '+d(k.link)],['Erste Bitte um Besichtigung / Vereinbarung',d(k.bitte)+' / '+d(k.vereinbarung)]);
    zeilen.push(['Abschlussweg',sEsc(mvText(R.WEGE,a.weg)||'noch offen')],['Textform',d(a.textform&&a.textform.datum)+(a.textform&&a.textform.form?' ('+mvText(R.TEXTFORMEN,a.textform.form)+')':'')],
      ['Belehrung',d(B.datum)+(B.form?' ('+mvText(R.BELEHRUNGSFORMEN,B.form)+')':'')+(B.formular?', mit Muster-Widerrufsformular':', ohne Muster-Widerrufsformular')+(a.weg==='online'?(B.online?', mit':', ohne')+' Hinweis auf die Widerrufsfunktion (§ 356a BGB)':'')],
      ['Stand des Belehrungs-Vordrucks',d(B.vordruck)],['Zustimmung zum dauerhaften Datenträger',d(a.zustimmung)],
      ['Verlangen auf vorzeitigen Beginn',d(a.verlangen&&a.verlangen.datum)+(a.verlangen&&a.verlangen.datentraeger?' (dauerhafter Datenträger)':'')],
      ['Bestätigung zum Erlöschen',d(a.erloeschen)],['Beginn der Tätigkeit',d(a.beginn)],['Kaufvertrag beurkundet',d(p.beurkundet)],
      ['Abschrift oder Bestätigung (§ 312f BGB)',d(a.abschrift&&a.abschrift.datum)+(a.abschrift&&a.abschrift.form?' ('+mvText(R.ABSCHRIFTFORMEN,a.abschrift.form)+')':'')],
      ['Widerruf abgesandt / eingegangen',d(a.widerruf&&a.widerruf.abgesandt)+' / '+d(a.widerruf&&a.widerruf.eingang)]);
    if(a.vertragsart==='allein') zeilen.push(['Alleinauftrag läuft bis',d(a.laufzeit&&a.laufzeit.bis)]);
    let fristen=[['Widerrufsrecht',p.widerrufsrecht?'ja':'nein – '+sEsc(p.grund)]].concat(p.widerrufsrecht?[['Frist beginnt nach',d(p.beginn)+(p.belehrt?'':' (nicht belehrt)')],['Frist endet',d(p.ende)],
      ['Höchstfrist (§ 356 Abs. 4 Satz 1 BGB)',d(p.hoechst.ende)+' (Weg a '+d(p.hoechst.a)+', Weg b '+d(p.hoechst.b)+')'],['Eingang eines Widerrufs abwarten bis',d(p.puffer)],
      ['Wertersatz (§ 357a Abs. 2 BGB)',p.wertersatz?'Voraussetzungen vermerkt':'nein'],['Erlöschen (§ 356 Abs. 5 Nr. 2 BGB)',p.erloschen?'dokumentiert':'nicht dokumentiert']]
      .concat(p.rueckzahlungBis?[['Rückzahlung bis',d(p.rueckzahlungBis)]]:[]):[]);
    const st={rot:'Rot',gelb:'Gelb',gruen:'Grün'};
    return {titel:'Prüfbogen Maklervertrag '+mvObjektName(a),
      html:'<h1>Maklervertrag – Prüfbogen</h1><p class="wzd-unter">'+sEsc(mvTitel(a))+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
        +wzDokTabelle(zeilen)+'<h2>Fristen</h2>'+wzDokTabelle(fristen)
        +'<h2>Prüfung</h2><p><b>Ampel zur Provision: '+st[p.provision.stufe]+'</b> – '+sEsc(p.provision.text)+'</p><ul>'+p.ampeln.map(x=>'<li>'+st[x.stufe]+': '+sEsc(x.text)+'</li>').join('')+'</ul>'
        +(a.notiz?'<h2>Notiz</h2><p>'+sEsc(a.notiz).replace(/\n/g,'<br>')+'</p>':'')
        +'<p class="wzd-klein">Rechtstexte (Maklervertrag, Widerrufsbelehrung, Muster-Widerrufsformular) sind die Vordrucke der Bank. Fristen mit §§ 187, 188, 193 BGB und den Feiertagen in Baden-Württemberg.</p>',
      fuss:'Interner Prüfbogen ohne Gewähr; Unklares mit der Rechtsabteilung klären.'};
  }
  let z=wzdAkten('maklervertrag').map(a=>({a,p:mvPruef(a)})).sort((x,y)=>(x.p.vertragsschluss||'').localeCompare(y.p.vertragsschluss||''))
    .map(({a,p})=>[sEsc(mvObjektName(a)),mvText(R.SEITEN,a.seite),mvText(R.ARTEN,a.vertragsart),wzDatum(p.vertragsschluss),p.widerrufsrecht?wzDatum(p.ende):'kein Widerrufsrecht',sEsc(p.provision.text)]);
  return {titel:'Maklerverträge',html:'<h1>Maklerverträge</h1><p class="wzd-unter">Fristen und Prüfpunkte · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
    +(z.length?wzDokTabelle(z,['Objekt','Seite','Art','Vertragsschluss','Widerrufsfrist bis','Ampel zur Provision']):'<p>Noch kein Maklervertrag vermerkt.</p>'),fuss:'Übersicht ohne Namen.'};
}

/* ---------- Verkaufsfahrplan: Maklervertrag mit dem Verkäufer erkannt (Textform, bei anderen Objekten das Datum) ---------- */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>({maklervertrag:wzdAkten('maklervertrag',o.id).some(a=>a.seite==='verkaeufer'
  &&!wzdDatum(a.widerruf&&a.widerruf.abgesandt)&&!wzdDatum(a.widerruf&&a.widerruf.eingang)
  &&(a.wohnung!==false?!!wzdDatum(a.textform&&a.textform.datum):!!wzdDatum(a.abschluss)))}));

/* ---------- Kundenakte: Löschen, Auskunft, Anzeige ----------
   Beim Löschen bleibt der Vermerk zum Objekt ohne Personenbezug (Kunden-Id und Notiz entfallen). */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const a of wzdAkten('maklervertrag').filter(a=>a.kundeId===id)){ a.kundeId=''; a.kundeGeloescht=true; a.notiz=''; a.wv={}; await wzdSpeichern('akten',a); }
  if(MV.aktiv&&MV.aktiv.kundeId===id) MV.aktiv=null;
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let R=mvR(), l=wzdAkten('maklervertrag').filter(a=>a.kundeId===id), d=x=>wzdDatum(x)?wzDatum(x):'–';
  return ['','MAKLERVERTRÄGE'].concat(l.length?l.map(a=>{ let p=mvPruef(a);
    return '- '+mvObjektName(a)+': '+mvText(R.SEITEN,a.seite)+', '+mvText(R.ARTEN,a.vertragsart)+(a.satz?', Provision '+a.satz:'')+'; Vertragsschluss '+d(p.vertragsschluss)
      +(a.weg?' ('+mvText(R.WEGE,a.weg)+')':'')+'; Verbraucher '+(a.verbraucher!==false?'ja':'nein')+'; Textform '+d(a.textform&&a.textform.datum)
      +'; Belehrung '+d(a.belehrung&&a.belehrung.datum)+(a.belehrung&&a.belehrung.formular?' mit Muster-Widerrufsformular':'')
      +(wzdDatum(a.verlangen&&a.verlangen.datum)?'; Verlangen auf vorzeitigen Beginn '+d(a.verlangen.datum):'')+(wzdDatum(a.erloeschen)?'; Bestätigung zum Erlöschen '+d(a.erloeschen):'')
      +(p.widerrufsrecht?'; Widerrufsfrist bis '+d(p.ende):'; kein Widerrufsrecht')
      +(p.widerrufen?'; Widerruf abgesandt '+d(a.widerruf.abgesandt)+', eingegangen '+d(a.widerruf.eingang):'')
      +(a.vertragsart==='allein'&&wzdDatum(a.laufzeit&&a.laufzeit.bis)?'; Alleinauftrag bis '+d(a.laufzeit.bis):'')+(a.notiz?'; Notiz: '+a.notiz:''); }):['- keine']);
});
KD_AKTE_HOOKS.push(id=>{
  if(!wzdBereit()) return '';
  let l=wzdAkten('maklervertrag').filter(a=>a.kundeId===id); if(!l.length) return '';
  return '<h3>Maklerverträge</h3><div class="kd-karten">'+l.map(a=>{ let p=mvPruef(a);
    return '<div class="kd-karte"><div><b>'+sEsc(mvTitel(a))+'</b><span>'+sEsc([mvText(mvR().ARTEN,a.vertragsart),'Vertragsschluss '+wzDatum(p.vertragsschluss),p.provision.text].join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();mvAusAkte(\''+idSicher(a.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>';
});

wzRegistrieren({id:'maklervertrag',titel:'Maklerverträge',sub:'Abschlussweg, Textform, Belehrung und Widerrufsfrist je Vertrag – mit Ampel zur Provision',icon:'shield',ohneNeu:true,
  zustand:()=>MV.aktiv||mvS(),speichern:mvSpeichern,zeichnen:mvZeichnen,rechnen:mvRechnen,dokument:mvDokument,
  schliessen:()=>{ mvAbschluss(); MV.aktiv=null; }});
