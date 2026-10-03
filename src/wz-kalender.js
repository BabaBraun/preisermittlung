/* ---------- Kachel „Kalender“ (D40) ----------
   Alle Termine an einer Stelle: eigene Termine (Besichtigung, Beratung, Bewertung, Akquise …) und — nur gelesen — fällige
   Wiedervorlagen, Notartermine und Übergaben aus Notarauftrag und Übergabeprotokoll, Gebotsfristen der Bieterverfahren und
   Besichtigungen aus der Vermarktung gesicherter Bewertungen. Ansicht als Liste (Agenda) oder Monatsblatt. Termine gehen
   einzeln oder gesammelt als Kalenderdatei (.ics, RFC 5545) in den Kalender des Geräts — Kundennamen nur auf Wunsch,
   weil Gerätekalender oft mit einem Online-Dienst abgleichen. Eigene Termine liegen in der Datenbank (Speicher „termine“). */
var KA={extra:null,aktiv:null,tag:null,laeuft:null};
const KA_ARTEN=['Besichtigung','Beratungsgespräch','Bewertungstermin','Akquise-Gespräch','Notartermin','Übergabe','Sonstiges'];
const KA_QUELLEN=[['termin','Eigene Termine'],['wv','Wiedervorlagen'],['notar','Notartermine'],['uebergabe','Übergaben'],['bieter','Gebotsfristen'],['besichtigung','Besichtigungen aus der Vermarktung']];
const KA_TAGE=['Mo','Di','Mi','Do','Fr','Sa','So'];
function kaStart(){ return {ansicht:'liste',monat:'',vergangen:false,namen:false,quellen:{}}; }
function kaS(){ let a=wzAlle(); if(!a.kalender||typeof a.kalender!=='object'||Array.isArray(a.kalender)) a.kalender=kaStart(); let s=a.kalender; if(!s.quellen||typeof s.quellen!=='object') s.quellen={}; return s; }
function kaSetz(k,v){ kaS()[k]=v; wzSpeichern(); KA.aktiv=null; wzZeichnen(); }
function kaQuelle(q,an){ kaS().quellen[q]=!!an; wzSpeichern(); wzZeichnen(); }
/* ein Ladevorgang zur Zeit: alle Aufrufer warten auf dasselbe Versprechen (sonst zeichnet die Ansicht in einer Schleife neu) */
function kaLaden(){
  if(!KA.laeuft) KA.laeuft=(async()=>{
    try{ await wzdLaden(); let notar=[],prot=[];
      if(IA_DB_BEREIT){ try{ notar=await iaAlle('notar'); }catch(e){} try{ prot=await iaAlle('protokolle'); }catch(e){} }
      KA.extra={notar,prot}; }
    catch(e){ KA.extra={notar:[],prot:[]}; }
    KA.laeuft=null; })();
  return KA.laeuft;
}
/* alle Einträge (unabhängig vom Zeitraum), sortiert nach Datum und Uhrzeit */
function kaEintraege(){
  let q=kaS().quellen, an=x=>q[x]!==false, l=[];
  const neu=o=>l.push(Object.assign({von:'',bis:'',ort:'',info:'',objekt:'',aktion:''},o));
  if(an('termin')) wzdListe('termine').forEach(t=>{ if(!wzdDatum(t.datum)) return;
    let was=t.titel||wzdObjektName(t.projektId,'');
    neu({quelle:'termin',id:t.id,datum:t.datum,von:wzdZeit(t.von),bis:wzdZeit(t.bis),art:t.art||'Termin',titel:(t.art||'Termin')+(was?': '+was:''),ort:t.ort||'',
      info:(t.kundeIds||[]).map(wzdKundeName).filter(Boolean).join(', '),objekt:wzdObjektName(t.projektId,''),aktion:"kaTerminOeffnen('"+idSicher(t.id)+"')",erinnerung:+t.erinnerung||0}); });
  if(an('wv')) aufLoad().filter(a=>!a.erledigt&&wzdDatum(a.frist)).forEach(a=>neu({quelle:'wv',id:a.id,datum:a.frist,art:'Wiedervorlage',titel:'Wiedervorlage: '+a.text,
    info:a.kundeId?wzdKundeName(a.kundeId):'',objekt:a.objekt||'',aktion:'wzSchliessen();aufOeffnen()'}));
  if(KA.extra){
    KA.extra.notar.forEach(n=>{
      if(an('notar')&&wzdDatum(n.termin)) neu({quelle:'notar',id:n.id,datum:n.termin,von:wzdZeit(n.uhrzeit),art:'Notartermin',titel:'Notartermin: '+(n.anschrift||'Kaufvertrag'),
        ort:[n.notar,n.notarOrt].filter(Boolean).join(', '),objekt:n.anschrift||'',aktion:"kaNotar('"+idSicher(n.id)+"')"});
      if(an('uebergabe')&&wzdDatum(n.uebergabeDatum)) neu({quelle:'uebergabe',id:n.id+'_ue',datum:n.uebergabeDatum,art:'Übergabe',titel:'Übergabe laut Notarauftrag: '+(n.anschrift||''),
        ort:n.anschrift||'',objekt:n.anschrift||'',aktion:"kaNotar('"+idSicher(n.id)+"')"}); });
    if(an('uebergabe')) KA.extra.prot.forEach(p=>{ if(wzdDatum(p.datum)) neu({quelle:'uebergabe',id:p.id,datum:p.datum,von:wzdZeit(p.uhrzeit),art:'Übergabe',
      titel:'Übergabeprotokoll: '+(p.anschrift||''),ort:p.anschrift||'',info:p.abgeschlossen?'abgeschlossen':'Entwurf',objekt:p.anschrift||'',aktion:"kaProtokoll('"+idSicher(p.id)+"')"}); });
  }
  if(an('bieter')) wzdListe('bieter').filter(b=>b.status!=='beendet'&&wzdDatum(b.ende)).forEach(b=>neu({quelle:'bieter',id:b.id,datum:b.ende,von:wzdZeit(b.endeZeit),art:'Gebotsfrist',
    titel:'Gebotsfrist: '+wzdObjektName(b.projektId,b.objekt||'Objekt'),objekt:wzdObjektName(b.projektId,b.objekt||''),info:b.gebote.length+' Gebot'+(b.gebote.length===1?'':'e'),aktion:"kaBieter('"+idSicher(b.id)+"')"}));
  if(an('besichtigung')) wzdObjekte(true).forEach(o=>{ let ev=[]; try{ ev=JSON.parse(o.f.vm_daten||'{}').ev||[]; }catch(e){}
    (Array.isArray(ev)?ev:[]).filter(e=>e&&/Besichtigung/.test(e.art||'')&&wzdDatum(e.d)).forEach(e=>neu({quelle:'besichtigung',id:o.id+'_'+(e.id||''),datum:e.d,art:e.art,
      titel:e.art+': '+o.name,ort:o.anschrift,info:e.wer||'',objekt:o.name})); });
  return l.sort((a,b)=>a.datum.localeCompare(b.datum)||(a.von||'99:99').localeCompare(b.von||'99:99')||a.titel.localeCompare(b.titel,'de'));
}
async function kaNotar(id){ wzOeffnen('notar'); await noLaden(); noOeffnenAuftrag(id); }
async function kaProtokoll(id){ wzOeffnen('uebergabe'); await ubLaden(); ubOeffnenProtokoll(id); }
function kaBieter(id){ wzOeffnen('bieter'); if(typeof biOeffnen==='function') biOeffnen(id); }

/* ---------- Ansicht ---------- */
function kaTagText(iso){
  let h=aufHeute(), d=ImmoBeratung.tageZwischen(h,iso), dt=new Date(iso+'T00:00:00');
  let wt=dt.toLocaleDateString('de-DE',{weekday:'long'}), dat=dt.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:dt.getFullYear()!==new Date().getFullYear()?'numeric':undefined});
  return (d===0?'Heute, ':d===1?'Morgen, ':d===-1?'Gestern, ':'')+wt+', '+dat;
}
function kaZeile(e){
  return '<div class="ka-eintrag ka-'+e.quelle+'"'+(e.aktion?' role="button" tabindex="0" onclick="'+e.aktion+'" onkeydown="if(event.key===\'Enter\'){'+e.aktion+'}"':'')+'>'
    +'<span class="ka-zeit">'+(e.von?sEsc(e.von)+(e.bis?'–'+sEsc(e.bis):''):'ganztägig')+'</span>'
    +'<span class="ka-text"><b>'+sEsc(e.titel)+'</b>'+((e.ort||e.info)?'<small>'+sEsc([e.ort,e.info].filter(Boolean).join(' · '))+'</small>':'')+'</span></div>';
}
function kaListe(alle){
  let S=kaS(), h=aufHeute(), von=S.vergangen?ImmoBeratung.tagePlus(h,-30):h, bis=ImmoBeratung.tagePlus(h,60);
  let l=alle.filter(e=>e.datum>=von&&e.datum<=bis), ueber=alle.filter(e=>e.quelle==='wv'&&e.datum<h).length;
  if(!l.length) return wzHinweis('In den nächsten 60 Tagen steht nichts an.'+(S.vergangen?'':' Frühere Termine zeigt „auch vergangene“.'));
  let tage=[...new Set(l.map(e=>e.datum))];
  return (ueber&&!S.vergangen?wzAmpel('gelb',ueber+' überfällige Wiedervorlage'+(ueber===1?'':'n')+' — „auch vergangene“ zeigt sie.'):'')
    +tage.map(t=>'<div class="ka-tag'+(t===h?' heute':t<h?' vorbei':'')+'"><h4>'+sEsc(kaTagText(t))+'</h4>'+l.filter(e=>e.datum===t).map(kaZeile).join('')+'</div>').join('');
}
function kaMonat(alle){
  let S=kaS(), ym=/^\d{4}-\d{2}$/.test(S.monat||'')?S.monat:aufHeute().slice(0,7), h=aufHeute();
  let wochen=ImmoBeratung.monatsRaster(ym), name=new Date(ym+'-01T00:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  let tag=KA.tag&&KA.tag.slice(0,7)===ym?KA.tag:(h.slice(0,7)===ym?h:ym+'-01');
  let raster='<div class="ka-monat" role="grid" aria-label="'+sEsc(name)+'"><div class="ka-kopf" role="row">'+KA_TAGE.map(t=>'<span role="columnheader">'+t+'</span>').join('')+'</div>'
    +wochen.map(w=>'<div class="ka-woche" role="row">'+w.map(d=>{ let e=alle.filter(x=>x.datum===d);
      return '<button type="button" role="gridcell" class="ka-zelle'+(d.slice(0,7)!==ym?' fremd':'')+(d===h?' heute':'')+(d===tag?' gewaehlt':'')+'" onclick="KA.tag=\''+d+'\';wzZeichnen()" aria-label="'+sEsc(kaTagText(d)+(e.length?', '+e.length+' Einträge':''))+'">'
        +'<span class="ka-nr">'+(+d.slice(8))+'</span>'+e.slice(0,3).map(x=>'<span class="ka-punkt ka-'+x.quelle+'">'+sEsc((x.von?x.von+' ':'')+(x.art||''))+'</span>').join('')
        +(e.length>3?'<span class="ka-mehr">+'+(e.length-3)+'</span>':'')+'</button>'; }).join('')+'</div>').join('')+'</div>';
  let am=alle.filter(e=>e.datum===tag);
  return '<div class="ka-nav"><button type="button" class="secondary" onclick="kaMonatWechsel(-1)" aria-label="Voriger Monat" data-ic="arrow-left"></button><b>'+sEsc(name)+'</b>'
      +'<button type="button" class="secondary" onclick="kaMonatWechsel(1)" aria-label="Nächster Monat" data-ic="arrow-right"></button>'
      +'<button type="button" class="secondary" onclick="KA.tag=null;kaSetz(\'monat\',\'\')">Heute</button></div>'
    +raster+'<div class="ka-tag"><h4>'+sEsc(kaTagText(tag))+'</h4>'+(am.length?am.map(kaZeile).join(''):'<p class="hint" style="margin:0">Keine Einträge.</p>')
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="kaNeu(\''+tag+'\')" data-ic="plus">Termin an diesem Tag</button></div></div>';
}
function kaMonatWechsel(n){
  let S=kaS(), ym=/^\d{4}-\d{2}$/.test(S.monat||'')?S.monat:aufHeute().slice(0,7);
  let j=+ym.slice(0,4), m=+ym.slice(5,7)+n; if(m<1){ m=12; j--; } if(m>12){ m=1; j++; }
  KA.tag=null; kaSetz('monat',j+'-'+String(m).padStart(2,'0'));
}
function kaZeichnen(){
  if(!KA.extra||!wzdBereit()){ kaLaden().then(()=>{ if(WZ.aktiv==='kalender') wzZeichnen(); }); return '<p class="hint">Termine werden geladen …</p>'; }
  if(KA.aktiv) return kaEditor(KA.aktiv);
  let S=kaS(), alle=kaEintraege(), h=aufHeute(), heute=alle.filter(e=>e.datum===h), woche=alle.filter(e=>e.datum>h&&e.datum<=ImmoBeratung.tagePlus(h,7));
  return '<div class="wz-kpis grid">'+wzdKpi('Heute',heute.length,heute.length?sEsc(heute.slice(0,2).map(e=>(e.von?e.von+' ':'')+e.titel).join(' · ')):'nichts geplant')
      +wzdKpi('Nächste 7 Tage',woche.length,'')+wzdKpi('Eigene Termine',wzdListe('termine').filter(t=>wzdDatum(t.datum)>=h).length,'ab heute')+'</div>'
    +'<div class="ka-leiste"><div class="ka-schalter" role="group" aria-label="Ansicht">'
      +[['liste','Liste'],['monat','Monat']].map(([k,t])=>'<button type="button" class="'+(S.ansicht===k?'primary':'secondary')+'" aria-pressed="'+(S.ansicht===k)+'" onclick="kaSetz(\'ansicht\',\''+k+'\')">'+t+'</button>').join('')+'</div>'
      +'<button type="button" class="primary" onclick="kaNeu()" data-ic="plus">Neuer Termin</button>'
      +'<button type="button" class="secondary" onclick="kaIcsAlle()" data-ic="calendar">Kalenderdatei</button></div>'
    +'<div class="ka-quellen">'+KA_QUELLEN.map(([q,t])=>'<label class="wz-check ka-q ka-'+q+'"><input type="checkbox"'+(S.quellen[q]!==false?' checked':'')+' onchange="kaQuelle(\''+q+'\',this.checked)"><span>'+t+'</span></label>').join('')
      +(S.ansicht==='liste'?'<label class="wz-check"><input type="checkbox"'+(S.vergangen?' checked':'')+' onchange="kaSetz(\'vergangen\',this.checked)"><span>auch vergangene (30 Tage)</span></label>':'')+'</div>'
    +wzBox('',S.ansicht==='monat'?kaMonat(alle):kaListe(alle))
    +wzHinweis('Wiedervorlagen, Notartermine, Übergaben, Gebotsfristen und Besichtigungen aus der Vermarktung erscheinen hier automatisch; ändern lassen sie sich in ihrer Kachel. '
      +'Die Kalenderdatei nimmt die eigenen Termine, Notartermine, Übergaben und Gebotsfristen der nächsten 90 Tage mit — Kundennamen nur, wenn du es einschaltest.')
    +'<label class="wz-check"><input type="checkbox"'+(S.namen?' checked':'')+' onchange="kaS().namen=this.checked;wzSpeichern()"><span>Kundennamen in die Kalenderdatei übernehmen (Gerätekalender gleichen oft mit einem Online-Dienst ab)</span></label>';
}

/* ---------- eigener Termin ---------- */
function kaLeer(datum){
  return {id:wzdId('t'),art:'Besichtigung',titel:'',datum:wzdDatum(datum)||aufHeute(),von:'10:00',bis:'11:00',ort:'',projektId:'',kundeIds:[],notiz:'',erinnerung:'60'};
}
async function kaNeu(datum){ await wzdLaden(); let t=kaLeer(datum); if(!(await wzdSpeichern('termine',t))) return; KA.aktiv=t; wzZeichnen(); $('wz_overlay').scrollTop=0; }
async function kaTerminOeffnen(id){
  if(WZ.aktiv!=='kalender') wzOeffnen('kalender');
  await kaLaden(); let t=wzdListe('termine').find(x=>x.id===id); if(!t) return;
  KA.aktiv=t; wzZeichnen(); $('wz_overlay').scrollTop=0;
}
/* von außen (Interessenten, Akquise, Bieterverfahren): Termin mit Vorgaben anlegen und öffnen */
async function kaTerminMit(v){
  wzOeffnen('kalender'); await kaLaden();
  let t=Object.assign(kaLeer(v&&v.datum),v||{}); if(t.projektId&&!t.ort) t.ort=(wzdObjekt(t.projektId)||{}).anschrift||'';
  if(!(await wzdSpeichern('termine',t))) return; KA.aktiv=t; wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function kaZurueck(){ if(KA.aktiv) wzdSpeichernSofort('termine',KA.aktiv); KA.aktiv=null; wzZeichnen(); }
async function kaLoeschen(){
  let t=KA.aktiv; if(!t||!confirm('Diesen Termin löschen?')) return;
  if(await wzdLoeschen('termine',t.id)){ KA.aktiv=null; wzZeichnen(); }
}
function kaKundeDazu(){ let t=KA.aktiv; if(!t) return; wzdKundeWaehlen(id=>{ if(!t.kundeIds.includes(id)) t.kundeIds.push(id); wzdSpeichernSofort('termine',t); wzZeichnen(); }); }
function kaKundeWeg(id){ let t=KA.aktiv; if(!t) return; t.kundeIds=t.kundeIds.filter(x=>x!==id); wzdSpeichernSofort('termine',t); wzZeichnen(); }
function kaObjektWahl(id){
  let t=KA.aktiv; if(!t) return; let o=wzdObjekt(id);
  if(o&&(!t.ort||t.ort===(wzdObjekt(t.projektId)||{}).anschrift)) t.ort=o.anschrift;
  t.projektId=id; wzdSpeichernSofort('termine',t); wzZeichnen();
}
function kaEditor(t){
  let objekt=wzdObjekt(t.projektId), ph=(t.art||'Termin')+(objekt?' '+objekt.anschrift:'');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="kaZurueck()" data-ic="arrow-left">Kalender</button>'
      +'<span class="ub-status">'+sEsc(kaTagText(wzdDatum(t.datum)||aufHeute()))+(wzdZeit(t.von)?', '+sEsc(wzdZeit(t.von))+' Uhr':'')+'</span>'
      +'<button type="button" class="secondary" onclick="kaLoeschen()" data-ic="trash">Löschen</button></div>'
    +wzBox('Termin','<div class="grid">'+wzFeld('art','Art',{typ:'wahl',optionen:KA_ARTEN.map(a=>[a,a]),zeichnen:true})
      +wzFeld('titel','Titel',{typ:'text',ph:ph})+wzFeld('datum','Datum',{typ:'datum',zeichnen:true})
      +wzFeld('von','von',{typ:'text',ph:'z. B. 10:00'})+wzFeld('bis','bis',{typ:'text',ph:'z. B. 11:00'})
      +wzFeld('erinnerung','Erinnerung im Gerätekalender',{typ:'wahl',optionen:[['0','keine'],['15','15 Minuten vorher'],['60','1 Stunde vorher'],['1440','1 Tag vorher']]})
      +'<div class="field"><label for="ka_objekt">Objekt</label><select id="ka_objekt" onchange="kaObjektWahl(this.value)">'+wzdObjektOptionen(t.projektId)+'</select></div>'
      +wzFeld('ort','Ort',{typ:'text',ph:'Anschrift oder Treffpunkt'})+'</div>')
    +wzBox('Teilnehmer',(t.kundeIds.length?'<div class="kd-karten">'+t.kundeIds.map(id=>'<div class="kd-karte"><div><b>'+sEsc(wzdKundeName(id))+'</b><span>'+sEsc(wzdKundeKontakt(id))+'</span></div>'
        +'<div class="kd-k"><button class="secondary" onclick="kdOeffnen(\''+idSicher(id)+'\')">Akte</button><button class="secondary" onclick="kaKundeWeg(\''+idSicher(id)+'\')" aria-label="Teilnehmer entfernen" data-ic="x"></button></div></div>').join('')+'</div>'
        :'<p class="hint" style="margin:0 0 8px">Noch niemand eingetragen.</p>')
      +'<button type="button" class="plus" onclick="kaKundeDazu()">＋ Kunde aus der Kundenakte</button>')
    +(t.art==='Besichtigung'?kaNachweisHtml(t):'')
    +wzBox('Notiz',wzFeld('notiz','Notiz',{typ:'lang',zeilen:3,voll:true,ph:'z. B. Schlüssel beim Nachbarn, Unterlagen mitbringen'}))
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="kaIcsEiner()" data-ic="calendar">In den Gerätekalender</button>'
    +'<button type="button" class="secondary" onclick="kaSchreiben()" data-ic="pen">Bestätigung schreiben</button></div>';
}
function kaSpeichern(){ if(KA.aktiv) wzdSpeichernBald('termine',KA.aktiv); }
function kaRechnen(){ iconify($('wz_body')); document.querySelectorAll('#wz_body canvas.ka-pad').forEach(kaPad); }

/* ---------- Besichtigungsnachweis: Teilnehmer bestätigen mit Unterschrift auf dem Gerät, dass ihnen das Objekt gezeigt wurde ----------
   Beleg für die Nachweis- und Vermittlungstätigkeit. Der Text ist ein Vorschlag und lässt sich je Termin anpassen (Vorgaben der
   Bank beachten). Unterschriften liegen beim Termin in der Datenbank; ändert man danach den Text, werden sie entfernt. */
const KA_NACHWEIS='Hiermit bestätige ich, das Objekt {objekt} am {datum} besichtigt zu haben. Das Objekt wurde mir von {berater}{firma} gezeigt; die Angaben zum Objekt habe ich von dort erhalten.';
function kaNachweisText(t){
  let o=wzdObjekt(t.projektId), ber=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}, pk=((wzAlle().portal||{}).kontakt)||{};
  let name=ber.name||pk.name||'', firma=ber.firma||(((wzAlle().portal||{}).anbieter)||{}).firma||'';
  return ImmoBeratung.vorlageFuellen((t.nachweis&&t.nachweis.text)||KA_NACHWEIS,{objekt:o?o.anschrift||o.name:(t.ort||'(Objekt)'),datum:wzDatum(t.datum),
    berater:name||'der Beraterin oder dem Berater',firma:firma?' ('+firma+')':''}).text;
}
function kaNachweisHtml(t){
  let n=t.nachweis||{}, u=n.unterschriften||{};
  if(!t.kundeIds.length) return wzBox('Besichtigungsnachweis',wzHinweis('Erst Teilnehmer aus der Kundenakte eintragen — dann unterschreibt jeder hier auf dem Gerät.'));
  return wzBox('Besichtigungsnachweis','<p class="ka-nachweis-text">'+sEsc(kaNachweisText(t))+'</p>'
    +'<div class="ub-pads">'+t.kundeIds.map(id=>'<div class="ub-pad"><div class="ub-pad-kopf"><b>'+sEsc(wzdKundeName(id))+'</b>'+(u[id]&&u[id].zeit?'<span>unterschrieben '+new Date(u[id].zeit).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})+'</span>':'')+'</div>'
      +'<canvas class="ub-canvas ka-pad" data-kunde="'+sEsc(id)+'" aria-label="Unterschrift '+sEsc(wzdKundeName(id))+'"></canvas>'
      +'<button type="button" class="secondary" onclick="kaUnterschriftWeg(\''+idSicher(id)+'\')">Unterschrift löschen</button></div>').join('')+'</div>'
    +'<details class="ka-nachweis-aendern"><summary>Text ändern</summary><textarea id="ka_nachweis_text" rows="4" onchange="kaNachweisTextSetzen(this.value)">'+sEsc(n.text||KA_NACHWEIS)+'</textarea>'
      +'<p class="hint">Platzhalter {objekt}, {datum}, {berater}, {firma}. Wer den Text nach einer Unterschrift ändert, muss neu unterschreiben lassen.</p></details>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wzDokument()" data-ic="file-text">Nachweis als Dokument</button></div>');
}
function kaNachweisTextSetzen(v){
  let t=KA.aktiv; if(!t) return; t.nachweis=t.nachweis||{}; let alt=t.nachweis.text||KA_NACHWEIS; v=String(v||'').trim()||KA_NACHWEIS;
  if(v===alt) return;
  if(Object.keys(t.nachweis.unterschriften||{}).length&&!confirm('Mit dem neuen Text werden die vorhandenen Unterschriften entfernt. Fortfahren?')){ wzZeichnen(); return; }
  t.nachweis.text=v; t.nachweis.unterschriften={}; wzdSpeichernSofort('termine',t); wzZeichnen();
}
function kaUnterschriftWeg(id){ let t=KA.aktiv; if(!t||!t.nachweis||!t.nachweis.unterschriften) return; delete t.nachweis.unterschriften[id]; wzdSpeichernSofort('termine',t); wzZeichnen(); }
function kaPad(c){
  if(!c||c.dataset.init) return; c.dataset.init='1';
  let kid=c.dataset.kunde, ctx=c.getContext('2d'), r=c.getBoundingClientRect(), w=Math.max(200,Math.round(r.width)), h=Math.max(100,Math.round(r.height));
  c.width=w*2; c.height=h*2; ctx.setTransform(2,0,0,2,0,0); ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#111';
  let t=KA.aktiv, bild=t&&t.nachweis&&t.nachweis.unterschriften&&t.nachweis.unterschriften[kid]&&t.nachweis.unterschriften[kid].bild;
  if(bild){ let img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,w,h); img.src=bild; }
  let an=false, last=null;
  const pt=e=>{ let b=c.getBoundingClientRect(); return {x:(e.clientX-b.left)*w/b.width,y:(e.clientY-b.top)*h/b.height}; };
  c.addEventListener('pointerdown',e=>{ an=true; last=pt(e); try{ c.setPointerCapture(e.pointerId); }catch(x){} ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(last.x+0.1,last.y+0.1); ctx.stroke(); e.preventDefault(); });
  c.addEventListener('pointermove',e=>{ if(!an) return; let p=pt(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; e.preventDefault(); });
  const ende=()=>{ if(!an) return; an=false; let t=KA.aktiv; if(!t) return;
    t.nachweis=t.nachweis||{}; t.nachweis.unterschriften=t.nachweis.unterschriften||{};
    t.nachweis.unterschriften[kid]={bild:c.toDataURL('image/png'),zeit:new Date().toISOString()}; wzdSpeichernBald('termine',t); };
  ['pointerup','pointercancel','pointerleave'].forEach(x=>c.addEventListener(x,ende));
}
function kaNachweisDokument(t){
  let u=(t.nachweis&&t.nachweis.unterschriften)||{}, o=wzdObjekt(t.projektId);
  return {titel:'Besichtigungsnachweis '+(o?o.name:(t.ort||''))+' '+wzDatum(t.datum),
    html:'<h1>Besichtigungsnachweis</h1><p class="wzd-unter">'+sEsc(o?o.anschrift||o.name:(t.ort||''))+' · '+wzDatum(t.datum)+(wzdZeit(t.von)?', '+sEsc(wzdZeit(t.von))+' Uhr':'')+'</p>'
      +'<p>'+sEsc(kaNachweisText(t))+'</p><div class="wzd-unterschriften">'
      +t.kundeIds.map(id=>'<div>'+(u[id]?'<img src="'+u[id].bild+'" alt="Unterschrift">':'<div class="wzd-linie"></div>')+'<p>'+sEsc(wzdKundeName(id))+(u[id]?' · '+new Date(u[id].zeit).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):'')+'</p></div>').join('')+'</div>',
    fuss:'Besichtigungsnachweis.'};
}

/* ---------- Kalenderdatei ---------- */
function kaIcsTermin(e,namen){
  let dauer=e.von&&e.bis?Math.max(15,(+e.bis.slice(0,2)*60+(+e.bis.slice(3)))-(+e.von.slice(0,2)*60+(+e.von.slice(3)))):e.quelle==='notar'?90:60;
  return {uid:e.quelle+'-'+e.id+'@immoapp',titel:e.titel,ort:e.ort,datum:e.datum,uhrzeit:e.von,dauerMin:dauer,erinnerungMin:e.erinnerung||0,
    beschreibung:[e.objekt&&e.objekt!==e.ort?'Objekt: '+e.objekt:'',namen&&e.info?e.info:''].filter(Boolean).join('\n')};
}
function kaIcsEiner(){
  let t=KA.aktiv; if(!t) return;
  if(!wzdDatum(t.datum)){ alert('Bitte ein gültiges Datum eintragen.'); return; }
  let e=kaEintraege().find(x=>x.quelle==='termin'&&x.id===t.id)||{quelle:'termin',id:t.id,datum:t.datum,von:wzdZeit(t.von),bis:wzdZeit(t.bis),titel:(t.art||'Termin')+(t.titel?': '+t.titel:''),ort:t.ort,info:'',objekt:''};
  e=Object.assign({},e,{erinnerung:+t.erinnerung||0});
  let text=ImmoBeratung.icsKalender([kaIcsTermin(e,kaS().namen)]);
  iaHerunterladen(new Blob([text],{type:'text/calendar;charset=utf-8'}),wzDateiname(e.titel)+'.ics');
}
function kaIcsAlle(){
  let h=aufHeute(), bis=ImmoBeratung.tagePlus(h,90), l=kaEintraege().filter(e=>['termin','notar','uebergabe','bieter'].includes(e.quelle)&&e.datum>=h&&e.datum<=bis);
  if(!l.length){ alert('In den nächsten 90 Tagen gibt es keine Termine für den Gerätekalender.'); return; }
  let text=ImmoBeratung.icsKalender(l.map(e=>kaIcsTermin(e,kaS().namen)));
  iaHerunterladen(new Blob([text],{type:'text/calendar;charset=utf-8'}),'ImmoApp Termine '+h+'.ics');
}
function kaSchreiben(){
  let t=KA.aktiv; if(!t) return; wzdSpeichernSofort('termine',t);
  if(typeof vlOeffnenMit==='function') vlOeffnenMit({vorlage:'besichtigung',kundeId:t.kundeIds[0]||'',projektId:t.projektId||'',terminId:t.id});
}
function kaDokument(){
  if(KA.aktiv&&KA.aktiv.art==='Besichtigung'&&KA.aktiv.kundeIds.length) return kaNachweisDokument(KA.aktiv);
  let h=aufHeute(), bis=ImmoBeratung.tagePlus(h,14), l=kaEintraege().filter(e=>e.datum>=h&&e.datum<=bis);
  let tage=[...new Set(l.map(e=>e.datum))];
  return {titel:'Termine '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Termine der nächsten 14 Tage</h1><p class="wzd-unter">Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +(tage.length?tage.map(t=>'<h2>'+sEsc(kaTagText(t))+'</h2>'+wzDokTabelle(l.filter(e=>e.datum===t).map(e=>[e.von?sEsc(e.von+(e.bis?'–'+e.bis:'')):'ganztägig',sEsc(e.titel)+(e.ort?'<br><small>'+sEsc(e.ort)+'</small>':'')]),['Zeit','Termin'])).join('')
        :'<p>Keine Termine.</p>'),
    fuss:'Terminübersicht.'};
}
wzRegistrieren({id:'kalender',titel:'Kalender',sub:'Termine, Fristen und Wiedervorlagen an einer Stelle',icon:'calendar',ohneNeu:true,
  zustand:()=>KA.aktiv,speichern:kaSpeichern,zeichnen:kaZeichnen,rechnen:kaRechnen,dokument:kaDokument,
  schliessen:()=>{ if(KA.aktiv) wzdSpeichernSofort('termine',KA.aktiv); KA.aktiv=null; KA.extra=null; }});

/* Startseite: Termine von heute und morgen (eigene, Notar, Übergabe, Gebotsfristen, Wiedervorlagen) — nur wenn es welche gibt */
async function startHeuteRender(){
  let box=$('start_heute'); if(!box) return;
  try{ await kaLaden(); }catch(e){ return; }
  let h=aufHeute(), m=ImmoBeratung.tagePlus(h,1), l=kaEintraege().filter(e=>(e.datum===h||e.datum===m)&&e.quelle!=='besichtigung');
  if(!l.length){ box.hidden=true; box.innerHTML=''; return; }
  const zeile=e=>'<button type="button" class="start-heute-z ka-'+e.quelle+'" onclick="'+(e.aktion||"wzOeffnen('kalender')")+'"><span>'+(e.datum===h?'heute':'morgen')+(e.von?' '+sEsc(e.von):'')+'</span><b>'+sEsc(e.titel)+'</b></button>';
  box.innerHTML='<div class="recent-head"><h2>Heute und morgen</h2><a href="#" onclick="wzOeffnen(\'kalender\');return false;">Kalender</a></div><div class="start-heute-l">'+l.slice(0,5).map(zeile).join('')+'</div>'
    +(l.length>5?'<p class="hint" style="margin:6px 0 0">und '+(l.length-5)+' weitere im Kalender</p>':'');
  box.hidden=false;
}
addEventListener('load',()=>{ setTimeout(()=>{ Promise.resolve(window.IA_BEREIT_P).then(()=>startHeuteRender()).catch(()=>{}); },700); });
