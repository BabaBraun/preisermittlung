/* ---------- Kachel „Geldwäsche-Prüfung“ (D55) ----------
   Je Verkauf (gesicherte Bewertung, projektId) ein Vorgang; darin je Person eine Zeile: Verkäufer, Käufer, auftretende Person
   (Bevollmächtigter, Betreuer, Testamentsvollstrecker, Eltern, Geschäftsführer) und wirtschaftlich Berechtigte. Festgehalten wird
   nur, DASS die Sorgfaltspflichten im Banksystem erledigt sind — Status, Datum und Kürzel (§ 10 Abs. 1 Nr. 1–4, § 11 Abs. 2–5,
   § 8 Abs. 2 Satz 5 GwG). Ausweisdaten, Geburtsdaten, Staatsangehörigkeit, PEP-Ergebnis, Herkunft der Mittel und Verdachtsmomente
   gibt es nicht als Feld, auch kein Freitextfeld; sie gehören ins Banksystem bzw. zum Geldwäschebeauftragten (§ 8, § 43, § 47 GwG).
   Ampeln für Käufer- und Verkäuferseite nach dem Stand des Verkaufs (Fahrplan-Stand der Bewertung, Haken im Verkaufsfahrplan,
   Maklervertrag aus „Maklerverträge“, angenommenes Gebot, Notarauftrag) und Abgleich mit den Personen im Notarauftrag. Regeln und Normen in js/gwg-regeln.js.
   Die Daten erscheinen in keinem Dokument für Dritte (kein Dokument, keine Notiz in der Kundenakte); nur in dieser Ansicht, in der
   Gesamtsicherung und in der Auskunft aus der Kundenakte (Status, Datum, Kürzel). Speicher „akten“, Art „gwg“. Bewertungen,
   Notaraufträge, Bieterverfahren und Abrechnungen werden nur gelesen. */
var GW={aktiv:null,meldung:'',meldungTimer:null,notarLaedt:false,haken:{},vorschlaege:[],datumFeld:null,datumOffen:false};
const GW_STAENDE=['Akquise','Auftrag erteilt','In Vermarktung','Reserviert','Notartermin','Verkauft'];   // wie FP_STAENDE
const GW_STUFE_TEXT={rot:'fällig',gelb:'bald fällig',offen:'noch nicht fällig',gruen:'vollständig',grau:'nicht erforderlich'};
const GW_HAKEN=[['vertretungGeprueft','vertretungAm'],['wbAbgeklaert','wbAm'],['pepImBanksystem','pepAm'],['abschluss','abschlussAm']];
/* Weitere Kacheln schlagen Personen vor (z. B. „Wer verkauft?“): Funktion (projektId) → [{kundeId, seite, rolle, art, vertretungArt, quelle}] */
var GWG_VORSCHLAG_HOOKS=[];

function gwStart(){ return {einst:{gwbName:'',gwbTelefon:'',regelwerk:'gwg'}}; }
function gwS(){ let a=wzAlle(); if(!a.gwg||typeof a.gwg!=='object'||Array.isArray(a.gwg)) a.gwg=gwStart();
  if(!a.gwg.einst||typeof a.gwg.einst!=='object') a.gwg.einst=gwStart().einst; return a.gwg; }
function gwEinst(){ return gwS().einst; }
function gwRegelwerk(){ return gwEinst().regelwerk==='amlr'?'amlr':'gwg'; }
function gwSeiteName(s){ return s==='kaeufer'?'Käufer':'Verkäufer'; }
function gwKlasse(stufe){ return stufe==='offen'||stufe==='grau'?'grau':stufe; }
function gwBeauftragter(){ let E=gwEinst(), n=String(E.gwbName||'').trim(), t=String(E.gwbTelefon||'').trim(); return [n,t?'Telefon '+t:''].filter(Boolean).join(', '); }

/* ---------- Daten: Vorgang, Zeilen, Bezüge (nur lesen) ---------- */
function gwZeileLeer(seite,rolle,kundeId){
  return {id:wzdId('gp'),kundeId:kundeId||'',rolle,seite,art:'person',vertretungArt:rolle==='vertreter'?'bevollmaechtigt':'',erforderlich:'ja',grund:'',maklerFirma:'',
    identifizierung:'offen',datum:'',kuerzel:'',vertretungGeprueft:false,vertretungAm:'',wbAbgeklaert:false,wbAm:'',pepImBanksystem:false,pepAm:'',
    zweck:rolle==='verkaeufer'?'verkauf':'',abschluss:false,abschlussAm:'',abschlussKuerzel:''};
}
function gwVorgang(pid){ return pid?wzdAkten('gwg',pid)[0]||null:null; }
function gwVorgangLeer(o){ return wzdAkteNeu('gwg',{projektId:o.id,kundeIds:[],personen:[],notarUebermittelt:'',geschaeft:'kauf',nettokaltmiete:''}); }
function gwGleich(a,b){ let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); return !!n(a)&&n(a)===n(b); }
/* Notaraufträge: im Verkaufsfahrplan dessen frisch geladene Liste, sonst die der Kachel „Notarauftrag“ */
function gwNotarListe(){
  let fp=typeof FP!=='undefined'&&FP.extra&&Array.isArray(FP.extra.notar)?FP.extra.notar:null, no=typeof NO!=='undefined'&&Array.isArray(NO.liste)?NO.liste:null;
  return (WZ.aktiv==='fahrplan'&&fp)||no||fp||[];
}
function gwNotare(o,liste){ return o?(liste||gwNotarListe()).filter(n=>n&&(gwGleich(n.anschrift,o.anschrift)||gwGleich(n.projekt,o.name))):[]; }
function gwNotarPersonen(notare){
  let l=[]; (notare||[]).forEach(n=>['verkaeufer','kaeufer'].forEach(r=>(n[r]||[]).forEach(x=>{ if(x) l.push({seite:r,kundeId:x.kundeId||'',name:x.name||''}); })));
  return l.filter((x,i)=>l.findIndex(y=>y.seite===x.seite&&(x.kundeId?y.kundeId===x.kundeId:!y.kundeId&&gwGleich(y.name,x.name)))===i);
}
function gwNotarStand(notare){ return Math.max(-1,...(notare||[]).map(n=>typeof NO_STAENDE!=='undefined'?NO_STAENDE.indexOf(n.stand||'Entwurf'):0)); }
/* Maklervertrag mit dem Verkäufer geschlossen — dieselbe Bedingung, mit der der Verkaufsfahrplan ihn erkennt (FP_AUTO_HOOKS in
   wz-maklervertrag.js). fpAuto selbst geht nicht: Es fragt über FP_AUTO_HOOKS wieder diese Kachel ab. */
function gwMaklervertrag(o){
  return wzdAkten('maklervertrag',o.id).some(a=>a&&a.seite==='verkaeufer'&&!wzdDatum(a.widerruf&&a.widerruf.abgesandt)&&!wzdDatum(a.widerruf&&a.widerruf.eingang)
    &&(a.wohnung!==false?!!wzdDatum(a.textform&&a.textform.datum):!!wzdDatum(a.abschluss)));
}
/* Was im Verkauf geschehen ist — Grundlage der Ampeln (js/gwg-regeln.js, REGELWERKE) */
function gwFakten(o,notare){
  let st=GW_STAENDE.indexOf(o.status), fp=((wzAlle().fahrplan||{})[o.id])||{};
  return {auftrag:st>=1||!!(fp.maklervertrag&&fp.maklervertrag.ok)||gwMaklervertrag(o),
    gebot:wzdListe('bieter').some(b=>b.projektId===o.id&&(b.gebote||[]).some(g=>g&&g.status==='angenommen')),
    reserviert:st>=3||!!(fp.kaeufer&&fp.kaeufer.ok),
    notar:(notare||gwNotare(o)).length>0};
}
function gwNameGleich(name,z){ let k=wzdKunde(z&&z.kundeId); return !!k&&wzdNameGleich(name,k); }
function gwAuswerten(v,o){
  let notare=gwNotare(o);
  return ImmoGwgRegeln.vorgangAuswerten(v,gwFakten(o,notare),{heute:aufHeute(),regelwerk:gwRegelwerk(),notarPersonen:gwNotarPersonen(notare),gleich:gwNameGleich});
}
/* Verkauf abgeschlossen = Provision eingegangen (Kachel „Provision“) → Tag der letzten Zahlung, sonst '' */
function gwAbgeschlossen(o){
  if(typeof paErledigt!=='function'||!o) return '';
  let d=''; wzdListe('abrechnungen').filter(a=>(a.projektId===o.id||gwGleich(a.anschrift,o.anschrift))&&paErledigt(a))
    .forEach(a=>(a.parteien||[]).forEach(p=>{ if(wzdDatum(p.bezahltAm)&&p.bezahltAm>d) d=p.bezahltAm; }));
  return d;
}
function gwOhneFinanzierung(o,notare){
  return (notare||[]).some(n=>n.finanzierung==='nein')
    ||wzdListe('bieter').some(b=>b.projektId===o.id&&(b.gebote||[]).some(g=>g&&g.status==='angenommen'&&g.finanzierung==='Kauf ohne Finanzierung'));
}

/* ---------- Öffnen, speichern, löschen ---------- */
function gwHakenStand(v){ let m={}; (v.personen||[]).forEach(z=>GW_HAKEN.forEach(([h])=>{ if(z[h]) m[z.id+':'+h]=true; })); return m; }
async function gwgOeffnen(pid){
  await wzdLaden(); let o=wzdObjekt(pid); if(!o) return;
  let v=gwVorgang(pid);
  if(!v){ v=gwVorgangLeer(o); if(!(await wzdSpeichern('akten',v))) return; }
  else {   // nur erlaubte Felder (eingespielte Sicherungen)
    let b=ImmoGwgRegeln.bereinigen(v), weg=Object.keys(v).filter(k=>!(k in b));
    if(weg.length||JSON.stringify(b.personen)!==JSON.stringify(v.personen)){ weg.forEach(k=>delete v[k]); v.personen=b.personen; await wzdSpeichern('akten',v); }
  }
  GW.aktiv=v; GW.haken=gwHakenStand(v);
  if(WZ.aktiv==='gwg') wzZeichnen(); let ov=$('wz_overlay'); if(ov) ov.scrollTop=0;
}
function gwZurueck(){ if(GW.aktiv) gwSpeichernSofort(); GW.aktiv=null; wzZeichnen(); }
async function gwLoeschen(){
  let v=GW.aktiv; if(!v||!confirm('Die Geldwäsche-Prüfung für dieses Objekt löschen? Die Aufzeichnungen im Banksystem bleiben davon unberührt (§ 8 GwG).')) return;
  if(await wzdLoeschen('akten',v.id)){ GW.aktiv=null; wzZeichnen(); }
}
/* nach jeder Eingabe: Haken mit Datum, kein Datum in der Zukunft, Abschluss nur wenn alles erledigt, Kürzel ohne Namen.
   vorlaeufig: Es wird gerade in einem Datumsfeld getippt. Chromium meldet jeden Zwischenstand (03.10. → 02.10. → 28.10.); Zukunft und
   Abschluss prüft die App deshalb erst beim Verlassen des Feldes (focusout unten), bis dahin nennt der Status das Datum als offen. */
function gwNormalisieren(v,vorlaeufig){
  let R=ImmoGwgRegeln, heute=aufHeute(), meldung='', alt=GW.haken||{}, neu={};
  const tag=(o,k)=>{ if(!vorlaeufig&&o[k]&&R.datumPruefen(o[k],heute)==='zukunft'){ o[k]=''; meldung='Ein Datum in der Zukunft ist nicht möglich. Bitte den Tag eintragen, an dem es im Banksystem erledigt wurde.'; } };
  tag(v,'notarUebermittelt');
  (v.personen||[]).forEach(z=>{
    GW_HAKEN.forEach(([h,d])=>{ z[h]=!!z[h]; if(z[h]&&!alt[z.id+':'+h]&&!z[d]) z[d]=heute; if(!z[h]) z[d]=''; });
    ['datum','vertretungAm','wbAm','pepAm','abschlussAm'].forEach(k=>tag(z,k));
    z.kuerzel=R.kuerzel(z.kuerzel); z.abschlussKuerzel=R.kuerzel(z.abschlussKuerzel); z.maklerFirma=String(z.maklerFirma||'').slice(0,80);
    if(z.abschluss&&!vorlaeufig){
      let e=R.zeileAuswerten(Object.assign({},z,{abschluss:false}),{heute,zeilen:v.personen,geschaeft:v.geschaeft,nettokaltmiete:v.nettokaltmiete});
      if(e.pflichtFehlt.length){
        meldung=(meldung?meldung+'\n\n':'')+(alt[z.id+':abschluss']?'Der Abschluss wurde zurückgenommen, weil wieder etwas offen ist: ':'Den Abschluss erst bestätigen, wenn alle Punkte erledigt sind. Offen: ')+e.pflichtFehlt.map(x=>x.text).join('; ')+'.';
        z.abschluss=false; z.abschlussAm='';
      }
    }
    GW_HAKEN.forEach(([h])=>{ if(z[h]) neu[z.id+':'+h]=true; });
  });
  GW.haken=neu;
  v.kundeIds=(v.personen||[]).map(z=>z.kundeId).filter((x,i,a)=>x&&a.indexOf(x)===i);
  return meldung;
}
function gwMelden(m){
  GW.meldung=m; clearTimeout(GW.meldungTimer);
  GW.meldungTimer=setTimeout(()=>{ let t=GW.meldung; GW.meldung=''; if(t) alert(t); if(WZ.aktiv==='gwg') wzZeichnen(); },0);
}
/* Datumsfeld, in dem gerade getippt wird: von focusin bis focusout (document.activeElement ist beim Wechsel von Tag zu Monat kurz body) */
function gwTipptDatum(){ let f=GW.datumFeld; return !!f&&f.isConnected&&!!$('wz_body')&&$('wz_body').contains(f); }
function gwSpeichern(endgueltig){
  let v=GW.aktiv; if(!v){ wzSpeichern(); return; }
  let vorl=endgueltig!==true&&gwTipptDatum(); if(vorl) GW.datumOffen=true;
  let m=gwNormalisieren(v,vorl); wzdSpeichernBald('akten',v); if(m) gwMelden(m);
}
document.addEventListener('focusin',e=>{ let t=e.target; if(WZ.aktiv==='gwg'&&t&&t.type==='date'&&t.dataset&&t.dataset.wz) GW.datumFeld=t; },true);
/* Datumsfeld verlassen: jetzt Zukunft und Abschluss prüfen */
document.addEventListener('focusout',e=>{ let t=e.target; if(!t||t!==GW.datumFeld) return; GW.datumFeld=null;
  if(WZ.aktiv==='gwg'&&GW.aktiv&&GW.datumOffen){ GW.datumOffen=false; gwSpeichern(true); } },true);
function gwSpeichernSofort(){ let v=GW.aktiv; if(!v) return Promise.resolve(false); gwNormalisieren(v); return wzdSpeichernSofort('akten',v); }

/* ---------- Personen ---------- */
function gwPersonNeu(seite,rolle){ wzdKundeWaehlen(id=>gwPersonHinzu(seite,rolle,id)); }
async function gwPersonHinzu(seite,rolle,kundeId,extra){
  let v=GW.aktiv; if(!v||!kundeId||!wzdKunde(kundeId)) return false;
  seite=seite==='kaeufer'?'kaeufer':'verkaeufer'; if(!['verkaeufer','kaeufer','vertreter','wb'].includes(rolle)) rolle=seite;
  if(v.personen.some(z=>z.kundeId===kundeId&&z.seite===seite&&z.rolle===rolle)){ alert('Diese Person steht schon in der Liste.'); return false; }
  let z=gwZeileLeer(seite,rolle,kundeId);
  if(extra){ if(extra.art==='gesellschaft'&&(rolle==='verkaeufer'||rolle==='kaeufer')) z.art='gesellschaft';
    if(rolle==='vertreter'&&ImmoGwgRegeln.VERTRETUNG.some(x=>x[0]===extra.vertretungArt)) z.vertretungArt=extra.vertretungArt; }
  v.personen.push(z);
  await gwSpeichernSofort(); if(WZ.aktiv==='gwg') wzZeichnen(); return true;
}
async function gwZeileWeg(i){
  let v=GW.aktiv, z=v&&v.personen[i]; if(!z) return;
  if(!confirm('„'+(wzdKundeName(z.kundeId)||'Person')+'“ aus der Geldwäsche-Prüfung entfernen?')) return;
  v.personen.splice(i,1); await gwSpeichernSofort(); wzZeichnen();
}
function gwVorschlaege(v,o){
  let l=[];
  const dazu=(kundeId,seite,rolle,quelle,extra)=>{ if(!kundeId||!wzdKunde(kundeId)) return;
    if(v.personen.some(z=>z.kundeId===kundeId&&z.seite===seite&&z.rolle===rolle)||l.some(x=>x.kundeId===kundeId&&x.seite===seite&&x.rolle===rolle)) return;
    l.push({kundeId,seite,rolle,quelle,extra:extra||{}}); };
  dazu(o.kundeId,'verkaeufer','verkaeufer','Eigentümer in der Bewertung');
  wzdListe('bieter').filter(b=>b.projektId===o.id).forEach(b=>(b.gebote||[]).filter(g=>g&&g.status==='angenommen').forEach(g=>dazu(g.kundeId,'kaeufer','kaeufer','Gebot angenommen')));
  GWG_VORSCHLAG_HOOKS.forEach(h=>{ try{ (h(o.id)||[]).forEach(p=>{ if(!p) return; let s=p.seite==='kaeufer'?'kaeufer':'verkaeufer';
    dazu(p.kundeId,s,['verkaeufer','kaeufer','vertreter','wb'].includes(p.rolle)?p.rolle:s,String(p.quelle||'Vorschlag'),{art:p.art,vertretungArt:p.vertretungArt}); }); }catch(e){} });
  return l;
}
async function gwVorschlagUebernehmen(i){
  let x=GW.vorschlaege[i]; if(!x) return;
  await gwPersonHinzu(x.seite,x.rolle,x.kundeId,x.extra);
}

/* ---------- Ansicht ---------- */
function gwBeauftragterHtml(){ let b=gwBeauftragter(); return 'Geldwäschebeauftragter: '+(b?'<b>'+sEsc(b)+'</b>':'in den Einstellungen dieser Kachel eintragen.'); }
function gwHinweiseHtml(){
  let N=ImmoGwgRegeln.NORMEN;
  return wzBox('Verdacht und Barzahlung',
    wzAmpel('rot','<b>Auffälligkeiten</b> unverzüglich dem Geldwäschebeauftragten melden ('+N.verdacht+') — nicht in der App festhalten; Kunde, Eigentümer, Gegenpartei und Notariat nicht informieren ('+N.weitergabe+'). Den Wortlaut gibt die Arbeitsanweisung der Bank vor.')
    +wzAmpel('gelb','<b>Barzahlungsverbot:</b> Der Kaufpreis kann nicht mit Bargeld, Kryptowerten, Gold, Platin oder Edelsteinen bezahlt werden ('+N.bargeld+'). Wer bar zahlen will: an den Geldwäschebeauftragten verweisen.')
    +wzHinweis('Weicht das Transparenzregister von den eigenen Erkenntnissen ab ('+N.unstimmigkeit+') oder legt eine Partei nicht offen, ob sie für einen wirtschaftlich Berechtigten handelt ('+N.offenlegung+'): an den Geldwäschebeauftragten.')
    +'<p class="gwg-gwb" id="gw_gwb">'+gwBeauftragterHtml()+'</p>'+gwDatenHinweis(),{klasse:'gwg-hinweise'});
}
function gwDatenHinweis(){
  return wzHinweis('In die App gehören nur Status, Datum und Kürzel. Ausweisdaten und -kopien, Geburtsdaten, Staatsangehörigkeit, PEP-Ergebnis, Herkunft der Mittel und Verdachtsmomente gehören ins Banksystem ('
    +ImmoGwgRegeln.NORMEN.aufzeichnung+'). Der Vermerk hier ersetzt nicht die Aufzeichnung im Banksystem ('+ImmoGwgRegeln.NORMEN.aufbewahrung+') und erscheint in keinem Dokument für Dritte, weil Dritte ihn nicht brauchen (Datenminimierung, '
    +ImmoGwgRegeln.NORMEN.datenminimierung+'). Rechtsstand: '+ImmoGwgRegeln.FASSUNG_KURZ+'.');
}
function gwChips(x){
  return ImmoGwgRegeln.SEITEN.map(([s,t])=>{ let y=x.seiten[s];
    return '<span class="pa-chip gwg-chip gwg-'+y.stufe+'">'+t+': '+GW_STUFE_TEXT[y.stufe]+(y.personen?' · '+y.fertig+' von '+y.personen:'')+'</span>'; }).join('')
    +(x.zeilen.some(r=>r.nachtraeglich)?'<span class="pa-chip gwg-chip gwg-orange">nachträglich identifiziert</span>':'');
}
function gwListeHtml(){
  let R=ImmoGwgRegeln, aktiv=wzdObjekte(false), alle=wzdObjekte(true), vorg=wzdAkten('gwg');
  let objekte=aktiv.concat(alle.filter(o=>!aktiv.some(a=>a.id===o.id)&&vorg.some(v=>v.projektId===o.id)));
  let n={rot:0,gelb:0,fertig:0};
  let karten=objekte.map(o=>{ let v=gwVorgang(o.id), x=gwAuswerten(v||{personen:[]},o), ab=v?gwAbgeschlossen(o):'';
    if(x.stufe==='rot') n.rot++; else if(x.stufe==='gelb') n.gelb++; if(x.identifiziert) n.fertig++;
    return '<div class="kd-karte gwg-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc([o.status||'ohne Vermarktungsstand',v?v.personen.length+(v.personen.length===1?' Person':' Personen'):'noch nicht begonnen'].join(' · '))+'</span>'
      +'<div class="pa-chips">'+gwChips(x)+(ab?'<span class="pa-chip gwg-chip">Verkauf abgeschlossen — Löschprüfung</span>':'')+'</div></div>'
      +'<div class="kd-k"><button class="secondary" onclick="gwgOeffnen(\''+idSicher(o.id)+'\')">Öffnen</button></div></div>'; });
  let weitere=alle.filter(o=>!objekte.some(a=>a.id===o.id)), hw=R.regelwerkHinweis(aufHeute(),gwRegelwerk());
  return (hw?wzAmpel('gelb',sEsc(hw)):'')
    +'<div class="wz-kpis grid">'+wzdKpi('Fällig',String(n.rot),'Verkäufe mit Rot')+wzdKpi('Bald fällig',String(n.gelb),'Verkäufe mit Gelb')+wzdKpi('Identifiziert',String(n.fertig),'alle Vertragsparteien')+'</div>'
    +(karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein Objekt in Vermarktung. Den Stand „Auftrag erteilt“ oder „In Vermarktung“ setzt man in der Bewertung unter „Vermarktung“.'))
    +(weitere.length?'<div class="field" style="max-width:420px;margin-top:12px"><label for="gw_weitere">Andere gesicherte Bewertung</label><select id="gw_weitere" onchange="if(this.value)gwgOeffnen(this.value)"><option value="">– wählen –</option>'
      +weitere.map(o=>'<option value="'+sEsc(o.id)+'">'+sEsc(o.name)+'</option>').join('')+'</select></div>':'')
    +gwHinweiseHtml()
    +wzBox('Einstellungen','<div class="grid">'+wzFeld('einst.gwbName','Geldwäschebeauftragter',{typ:'text',ph:'Name laut Arbeitsanweisung'})
      +wzFeld('einst.gwbTelefon','Telefon',{typ:'text'})
      +wzFeld('einst.regelwerk','Regelwerk für die Ampeln',{typ:'wahl',optionen:Object.keys(R.REGELWERKE).map(k=>[k,R.REGELWERKE[k].titel]),zeichnen:true,
        hinweis:'Ab 10.07.2027 gilt die EU-Geldwäscheverordnung: Auslöser ist dann das angenommene Angebot ('+R.NORMEN.amlr+').'})+'</div>'
      +wzHinweis('Rot ab angenommenem Gebot, Reservierung oder Notarauftrag: Dann besteht ernsthaftes Interesse und die Vertragsparteien sind hinreichend bestimmt ('+R.NORMEN.zeitpunkt
        +'). Gelb (Verkäufer: Auftrag erteilt oder Maklervertrag geschlossen) ist eine Vorwarnung der App. Die Grenzen mit dem Geldwäschebeauftragten abstimmen, ebenso den Einsatz der App im Ablauf ('+R.NORMEN.technik+') und mit Datenschutz und Betriebsrat das Kürzel „durch wen“.'),{klasse:'gwg-einst'});
}
function gwSeitenHtml(x){
  return ImmoGwgRegeln.SEITEN.map(([s,t])=>{ let y=x.seiten[s], a=y.ausloeser, f=y.fehlenImNotar;
    let text='<b>'+t+':</b> '+(y.stufe==='gruen'?'alle Personen vollständig im Banksystem dokumentiert.'
      :(a.stufe==='rot'?'fällig — ':a.stufe==='gelb'?'bald fällig — ':'noch nicht fällig')+(a.gruende.length?sEsc(a.gruende.join('; '))+' ('+sEsc(a.norm)+')':'')+'.'
        +(y.parteien?' '+y.fertig+' von '+y.personen+' Person'+(y.personen===1?'':'en')+' vollständig.':' Noch kein '+t+' erfasst.')
        +(f.length?' Im Notarauftrag, aber nicht identifiziert: '+sEsc(f.map(z=>z.name||wzdKundeName(z.kundeId)||'ohne Namen').join(', '))+'.':''));
    return '<div id="gw_seite_'+s+'">'+wzAmpel(gwKlasse(y.stufe),text)+'</div>'; }).join('');
}
function gwHaken(z,P,h,d,label,norm,kp){
  return '<div class="gwg-haken">'+wzFeld(P+h,label+' <span class="u">'+sEsc(norm)+'</span>',{typ:'check',zeichnen:true})
    +(z[h]?'<div class="grid">'+wzFeld(P+d,'am',{typ:'datum'})+(kp?wzFeld(kp,'durch (Kürzel)',{typ:'text',ph:'z. B. FB'}):'')+'</div>':'')+'</div>';
}
function gwZeileStatusHtml(e,v){
  return wzAmpel(gwKlasse(e.stufe),sEsc(e.text))
    +(e.nachtraeglich?'<div class="wz-ampel gwg-orange"><span class="wz-punkt" aria-hidden="true"></span><span>Nachträglich: identifiziert nach der Übermittlung an das Notariat am '
      +wzDatum(v.notarUebermittelt)+' ('+sEsc(ImmoGwgRegeln.NORMEN.verspaetet)+').</span></div>':'');
}
function gwZeileHtml(v,z,i,e){
  let R=ImmoGwgRegeln, N=R.NORMEN, P='personen.'+i+'.', partei=z.rolle==='verkaeufer'||z.rolle==='kaeufer';
  let titel=R.name(R.ROLLEN,z.rolle)+(z.rolle==='vertreter'||z.rolle==='wb'?' — '+gwSeiteName(z.seite)+'seite':''), name=wzdKundeName(z.kundeId)||'(ohne Kundenakte)';
  let kopf='<div class="gwg-kopf"><div><b>'+sEsc(name)+'</b><span>'+sEsc(titel)+'</span></div><button type="button" class="weg" aria-label="'+sEsc(name)+' entfernen" onclick="gwZeileWeg('+i+')">✕</button></div>';
  let oben='<div class="grid">'+(partei?wzFeld(P+'art','Art',{typ:'wahl',optionen:R.ARTEN,zeichnen:true}):'')
    +(z.rolle==='vertreter'?wzFeld(P+'vertretungArt','Tritt auf als',{typ:'wahl',optionen:R.VERTRETUNG}):'')
    +wzFeld(P+'erforderlich','Prüfung erforderlich',{typ:'wahl',optionen:[['ja','ja'],['nein','nein — mit Grund']],zeichnen:true})
    +(z.erforderlich==='nein'?wzFeld(P+'grund','Grund',{typ:'wahl',optionen:[['','– wählen –']].concat(R.GRUENDE.filter(g=>g[0]!=='miete'||v.geschaeft==='miete')),zeichnen:true})
      +(z.grund==='makler'?wzFeld(P+'maklerFirma','Maklerfirma der Gegenseite',{typ:'text',hinweis:'Jeder Makler identifiziert nur seine Partei ('+N.makler+').'}):''):'')+'</div>'
    +(partei&&z.art==='gesellschaft'?wzHinweis('Gesellschaft: wirtschaftlich Berechtigte und die auftretende Person (z. B. Geschäftsführer) als eigene Zeilen erfassen ('+N.wbZeile+'). Bei einer neuen Geschäftsbeziehung: Nachweis der Registrierung oder Auszug aus dem Transparenzregister — im Banksystem (§ 12 Abs. 3 Satz 2 GwG).'):'');
  /* die Checkliste steht immer im Dokument; bei „nicht erforderlich“ blendet die Zeilenklasse gwg-grau sie aus (Änderung ohne Neuaufbau) */
  let liste='<ol class="gwg-liste"><li><div class="grid">'+wzFeld(P+'identifizierung','Identifizierung',{typ:'wahl',optionen:R.IDENT,zeichnen:true,hinweis:z.identifizierung==='frueher'?N.frueher:N.identifizierung})
        +(z.identifizierung!=='offen'?wzFeld(P+'datum',z.identifizierung==='frueher'?'Vermerk angelegt am':'erledigt am',{typ:'datum'})+wzFeld(P+'kuerzel','durch (Kürzel)',{typ:'text',ph:'z. B. FB'}):'')+'</div>'
        +(z.identifizierung==='frueher'?wzAmpel('gelb','Bestandskunde: Im Banksystem vermerken, dass die Person früher identifiziert wurde ('+N.frueher+'). Bei geändertem Namen, geänderter Anschrift oder abgelaufenem Ausweis laut Banksystem neu identifizieren ('
          +N.frueherNeu+'). Der Status hakt nur die Identifizierung ab — wirtschaftlich Berechtigter, PEP-Abgleich und Zweck bleiben für jeden Verkauf (§ 10 Abs. 1 Nr. 2–4 GwG). Gilt, wenn die eG selbst vermittelt; vermittelt eine andere Gesellschaft, mit dem Geldwäschebeauftragten klären (§ 17 GwG).'):'')+'</li>'
      +(z.rolle==='vertreter'?'<li>'+gwHaken(z,P,'vertretungGeprueft','vertretungAm','Berechtigung der auftretenden Person geprüft',N.vertretung)+'</li>':'')
      +(partei?'<li>'+gwHaken(z,P,'wbAbgeklaert','wbAm',z.art==='gesellschaft'?'Wirtschaftlich Berechtigte beim Vertragspartner erhoben und mit dem Transparenzregister abgeglichen':'Handelt auf eigene Rechnung — abgefragt',z.art==='gesellschaft'?N.wbGesellschaft:N.wb)+'</li>'
        +'<li><div class="grid">'+wzFeld(P+'zweck','Zweck',{typ:'wahl',optionen:R.ZWECK,zeichnen:true,hinweis:N.zweck})+'</div></li>':'')
      +(partei||z.rolle==='wb'?'<li>'+gwHaken(z,P,'pepImBanksystem','pepAm','PEP-Abgleich im Banksystem erledigt — ohne Ergebnis in der App',N.pep)+'</li>':'')
      +'<li class="gwg-abschluss">'+gwHaken(z,P,'abschluss','abschlussAm','Sorgfaltspflichten im Banksystem vollständig dokumentiert',N.aufzeichnung,P+'abschlussKuerzel')+'</li></ol>';
  return '<div class="gwg-zeile gwg-'+e.stufe+'" id="gw_z_'+i+'">'+kopf+oben+liste+'<div class="gwg-status" id="gw_st_'+i+'">'+gwZeileStatusHtml(e,v)+'</div></div>';
}
function gwUebermitteltHtml(v,stand){ return stand>=1&&!wzdDatum(v.notarUebermittelt)?wzAmpel('gelb','Der Notarauftrag ist übermittelt — bitte den Tag der Übermittlung eintragen.'):''; }
function gwAbgleichHtml(v,x,notare){
  if(!notare.length) return '';
  let N=ImmoGwgRegeln.NORMEN, stand=gwNotarStand(notare);
  let zeilen=x.abgleich.map(a=>'<div class="gwg-abgleich gwg-'+(a.ok?'gruen':'rot')+'"><span>'+sEsc(a.name||wzdKundeName(a.kundeId)||'ohne Namen')+' <small>('+gwSeiteName(a.seite)+' im Notarauftrag)</small></span>'
    +'<b>'+(a.ok?'identifiziert':a.grund==='offen'?'Identifizierung offen':a.grund==='seite'?'in der Prüfung auf der anderen Seite':'fehlt in der Prüfung')+'</b>'
    +(a.grund==='fehlt'?(a.kundeId&&wzdKunde(a.kundeId)?'<button type="button" class="secondary" onclick="gwPersonHinzu(\''+a.seite+'\',\''+a.seite+'\',\''+idSicher(a.kundeId)+'\')" data-ic="plus">Übernehmen</button>'
      :'<button type="button" class="secondary" onclick="gwPersonNeu(\''+a.seite+'\',\''+a.seite+'\')" data-ic="users">Aus der Kundenakte zuordnen</button>'):'')+'</div>').join('');
  return wzBox('Abgleich mit dem Notarauftrag',(zeilen||wzHinweis('Im Notarauftrag stehen noch keine Personen.'))
    +(x.abgleich.some(a=>!a.ok)?wzAmpel('rot','Jede Person im Notarauftrag braucht eine Zeile in der Prüfung, deren Identifizierung nicht mehr offen ist (§ 11 Abs. 2, '+N.ueberwachung
      +'). Kommt eine Person hinzu oder wechselt der Käufer, gilt das für die neue Person. Lassen sich die Pflichten nicht erfüllen, darf der Kauf nicht vermittelt werden ('+N.abbruch+').')
      :x.abgleich.length?wzAmpel('gruen','Alle Personen des Notarauftrags sind in der Prüfung und nicht mehr offen.'):'')
    +'<div class="grid">'+wzFeld('notarUebermittelt','Angaben an das Notariat übermittelt am',{typ:'datum',hinweis:'Später erfasste Identifizierungen markiert die App als „nachträglich“ ('+N.verspaetet+').'})+'</div>'
    +'<div id="gw_uebermittelt">'+gwUebermitteltHtml(v,stand)+'</div>');
}
function gwEditor(v){
  let R=ImmoGwgRegeln, N=R.NORMEN, o=wzdObjekt(v.projektId);
  let kopf='<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="gwZurueck()" data-ic="arrow-left">Alle Verkäufe</button>'
    +'<span class="ub-status">'+sEsc(o?o.name:'Bewertung nicht mehr vorhanden')+'</span><button type="button" class="secondary" onclick="gwLoeschen()" data-ic="trash">Vorgang löschen</button></div>';
  if(!o) return kopf+wzBox('',wzHinweis('Die Bewertung zu diesem Vorgang ist nicht mehr gespeichert. Den Vorgang löschen, wenn er nicht mehr gebraucht wird.'));
  let notare=gwNotare(o), x=gwAuswerten(v,o), ab=gwAbgeschlossen(o), vs=gwVorschlaege(v,o); GW.vorschlaege=vs;
  let hw=R.regelwerkHinweis(aufHeute(),gwRegelwerk());
  let seiteBox=s=>{ let l=v.personen.map((z,i)=>({z,i})).filter(y=>y.z.seite===s).sort((a,b)=>['verkaeufer','kaeufer','vertreter','wb'].indexOf(a.z.rolle)-['verkaeufer','kaeufer','vertreter','wb'].indexOf(b.z.rolle)||a.i-b.i);
    return wzBox(gwSeiteName(s)+'seite',(l.length?l.map(y=>gwZeileHtml(v,y.z,y.i,x.zeilen[y.i])).join(''):wzHinweis('Noch keine Person auf dieser Seite.'))
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="gwPersonNeu(\''+s+'\',\''+s+'\')" data-ic="plus">'+gwSeiteName(s)+' hinzufügen</button>'
      +'<button type="button" class="secondary" onclick="gwPersonNeu(\''+s+'\',\'vertreter\')" data-ic="plus">Auftretende Person</button>'
      +'<button type="button" class="secondary" onclick="gwPersonNeu(\''+s+'\',\'wb\')" data-ic="plus">Wirtschaftlich Berechtigter</button></div>'
      +wzHinweis('Jede Person einzeln — auch Ehepartner als Miteigentümer oder Mitkäufer und jeder Miterbe ('+N.kauf+', '+N.zeitpunkt+'). Dazu jede auftretende Person mit Prüfung ihrer Berechtigung ('+N.vertretung+').'),{klasse:'gwg-seite'}); };
  let ab8=ab?R.aufbewahrung(ab):null;
  return kopf+(hw?wzAmpel('gelb',sEsc(hw)):'')
    +'<div class="gwg-seiten" id="gw_seiten">'+gwSeitenHtml(x)+'</div>'
    +(ab?wzAmpel('gelb','Löschprüfung: Der Verkauf ist abgeschlossen (Provision eingegangen am '+wzDatum(ab)+'). Der Vermerk in der App ist keine Aufzeichnung nach § 8 GwG und kann gelöscht werden. Die Aufzeichnungen bewahrt die Bank im Banksystem 5 Jahre ab Ende des Kalenderjahres auf und vernichtet sie spätestens nach 10 Jahren ('
      +N.aufbewahrung+') — bei Ende der Geschäftsbeziehung '+ab.slice(0,4)+' also bis '+wzDatum(ab8.aufbewahrenBis)+', spätestens '+wzDatum(ab8.vernichtenSpaetestens)+'.')
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="gwLoeschen()" data-ic="trash">Löschprüfung: Vorgang löschen</button></div>':'')
    +(gwOhneFinanzierung(o,notare)?wzAmpel('gelb','Kauf ohne Finanzierung: Den Kaufpreis nur unbar zahlen lassen ('+N.bargeld+'). Das Notariat verlangt einen Nachweis der Zahlung, z. B. die Zahlungsbestätigung des Kreditinstituts ('
      +N.zahlungsnachweis+'). Wer bar zahlen will: an den Geldwäschebeauftragten verweisen.'):'')
    +gwAbgleichHtml(v,x,notare)
    +(vs.length?wzBox('Vorschläge',vs.map((y,i)=>'<div class="gwg-abgleich"><span>'+sEsc(wzdKundeName(y.kundeId))+' <small>('+sEsc(R.name(R.ROLLEN,y.rolle))+(y.rolle==='vertreter'||y.rolle==='wb'?', '+gwSeiteName(y.seite)+'seite':'')+' · '+sEsc(y.quelle)+')</small></span>'
      +'<button type="button" class="secondary" onclick="gwVorschlagUebernehmen('+i+')" data-ic="plus">Übernehmen</button></div>').join('')):'')
    +seiteBox('verkaeufer')+seiteBox('kaeufer')
    +wzBox('Vermittelt wird','<div class="grid">'+wzFeld('geschaeft','Vertrag',{typ:'wahl',optionen:[['kauf','Kaufvertrag'],['miete','Miet- oder Pachtvertrag']],zeichnen:true,hinweis:'Beim Kauf gelten die Pflichten immer ('+N.kauf+').'})
      +(v.geschaeft==='miete'?wzFeld('nettokaltmiete','Nettokaltmiete im Monat',{typ:'betrag',einheit:'€',hinweis:'Unter 10.000 € gelten die Pflichten nicht, ab 10.000 € wie beim Kauf ('+N.miete+').'}):'')+'</div>')
    +gwHinweiseHtml();
}
function gwZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='gwg') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(typeof noLaden==='function'&&typeof NO!=='undefined'&&NO.liste===null){
    if(!GW.notarLaedt){ GW.notarLaedt=true; noLaden().then(()=>{ GW.notarLaedt=false; if(WZ.aktiv==='gwg') wzZeichnen(); }); }
    return '<p class="hint">Wird geladen …</p>';
  }
  return GW.aktiv?gwEditor(GW.aktiv):gwListeHtml();
}
/* nach jeder Eingabe: Ampeln und Status neu, ohne die Felder neu aufzubauen */
function gwRechnen(){
  iconify($('wz_body')); wzH('gw_gwb',gwBeauftragterHtml());
  let heute=aufHeute(); ($('wz_body')?$('wz_body').querySelectorAll('input[type="date"]'):[]).forEach(el=>{ if(el.max!==heute) el.max=heute; });   // nur erledigte Tage; nicht beim Tippen neu setzen
  let v=GW.aktiv, o=v&&wzdObjekt(v.projektId); if(!v||!o) return;
  let x=gwAuswerten(v,o);
  wzH('gw_seiten',gwSeitenHtml(x)); wzH('gw_uebermittelt',gwUebermitteltHtml(v,gwNotarStand(gwNotare(o))));
  x.zeilen.forEach((e,i)=>{ let el=$('gw_z_'+i); if(el) el.className='gwg-zeile gwg-'+e.stufe; wzH('gw_st_'+i,gwZeileStatusHtml(e,v)); });
}

/* ---------- Verkaufsfahrplan (D49: FP_AUTO_HOOKS) und Notarauftrag ---------- */
/* alle Vertragsparteien beider Seiten mit erledigten Pflichten Nr. 1–4 und Abgleich mit dem Notarauftrag vollständig */
function gwgIdentifiziert(o){ let v=o&&gwVorgang(o.id); return !!v&&gwAuswerten(v,o).identifiziert; }
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>({gwg:gwgIdentifiziert(o)}));
/* Notarauftrag p (Kachel „Notarauftrag“) gegen die Prüfung des passenden Objekts: {o, v, fehlen:[{seite, name, kundeId}]} */
function gwgNotarPruefen(p){
  let o=wzdObjekte(true).find(x=>gwGleich(p.anschrift,x.anschrift)||gwGleich(p.projekt,x.name))||null, v=o?gwVorgang(o.id):null;
  let a=ImmoGwgRegeln.notarAbgleich(gwNotarPersonen([p]),v?v.personen:[],gwNameGleich,v||{});
  return {o,v,fehlen:a.filter(x=>!x.ok)};
}
function gwgNotarWarnung(p){
  if(!p||!wzdBereit()) return '';
  let r=gwgNotarPruefen(p); if(!r.fehlen.length) return '';
  return 'Geldwäsche-Prüfung: Die Vertragsparteien sind zu identifizieren, sobald ernsthaftes Interesse besteht (§ 11 Abs. 2 GwG) — spätestens mit dem Versand des Kaufvertragsentwurfs. '
    +'Lassen sich die Pflichten nicht erfüllen, darf der Kauf nicht vermittelt werden (§ 10 Abs. 9 GwG).\n\nNoch nicht identifiziert:\n– '
    +r.fehlen.map(x=>(x.name||wzdKundeName(x.kundeId)||'ohne Namen')+' ('+gwSeiteName(x.seite)+')').join('\n– ')+'\n\n'
    +(r.o?'Bitte in der Kachel „Geldwäsche-Prüfung“ nachtragen.':'Zu diesem Notarauftrag gehört keine gesicherte Bewertung; die Prüfung führt die App je Bewertung. Bitte mit dem Geldwäschebeauftragten klären.');
}
/* Ampel für die Ansicht des Notarauftrags (intern, nie im Datenblatt für das Notariat) */
function gwgNotarAmpelHtml(p){
  if(!p||!wzdBereit()) return '';
  let r=gwgNotarPruefen(p), los=r.o?' <button type="button" class="secondary fp-los" onclick="wzOeffnen(\'gwg\');gwgOeffnen(\''+idSicher(r.o.id)+'\')">Geldwäsche-Prüfung</button>':'';
  if(r.fehlen.length) return wzAmpel('rot','Geldwäsche-Prüfung: noch nicht identifiziert — '+sEsc(r.fehlen.map(x=>(x.name||wzdKundeName(x.kundeId)||'ohne Namen')+' ('+gwSeiteName(x.seite)+')').join(', '))+' (§ 11 Abs. 2 GwG).'+los);
  // grün nur, wenn es zu prüfende Personen gibt (gelöschte Kunden zählen nicht)
  return ImmoGwgRegeln.notarAbgleich(gwNotarPersonen([p]),r.v?r.v.personen:[],gwNameGleich,r.v||{}).length?wzAmpel('gruen','Geldwäsche-Prüfung: Alle Personen dieses Notarauftrags sind identifiziert.'+los):'';
}
/* Warnung beim Wechsel des Notarauftrags von „Entwurf“ auf „An das Notariat übermittelt“ (oder einen späteren Stand) — nur Hinweis,
   keine Sperre (ob die App sperren darf, entscheidet die Bank, § 10 Abs. 9 GwG). Läuft in der Capture-Phase, also bevor die Kachel
   „Notarauftrag“ den neuen Stand übernimmt; an deren Code ändert sich nichts. */
document.addEventListener('change',e=>{ try{
  let t=e.target; if(WZ.aktiv!=='notar'||!t||!t.dataset||t.dataset.wz!=='stand'||typeof NO==='undefined'||!NO.aktiv||typeof NO_STAENDE==='undefined') return;
  if((NO.aktiv.stand||'Entwurf')!=='Entwurf'||NO_STAENDE.indexOf(t.value)<1) return;
  let w=gwgNotarWarnung(NO.aktiv); if(w) alert(w);
}catch(x){} },true);

/* ---------- Kundenakte: Löschen und Auskunft ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const v of wzdAkten('gwg').filter(v=>(v.personen||[]).some(z=>z&&z.kundeId===id))){
    v.personen=v.personen.filter(z=>!z||z.kundeId!==id); v.kundeIds=(v.kundeIds||[]).filter(x=>x!==id);
    await wzdSpeichern('akten',v);
  }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden(); let R=ImmoGwgRegeln, l=[];
  wzdAkten('gwg').forEach(v=>(v.personen||[]).filter(z=>z&&z.kundeId===id).forEach(z=>l.push({v,z})));
  return ['','GELDWÄSCHE-PRÜFUNG'].concat(l.length?l.map(({v,z})=>'- '+(wzdObjektName(v.projektId,'')||'Objekt')+': '+R.name(R.ROLLEN,z.rolle)
      +(z.rolle==='vertreter'||z.rolle==='wb'?' ('+gwSeiteName(z.seite)+'seite)':'')
      +(z.erforderlich==='nein'?', Prüfung nicht erforderlich':', Identifizierung: '+(R.name(R.IDENT,z.identifizierung)||'offen')
        +(z.identifizierung!=='offen'&&wzdDatum(z.datum)?' am '+wzDatum(z.datum):'')+(z.identifizierung!=='offen'&&z.kuerzel?' (Kürzel '+z.kuerzel+')':''))
      +(z.abschluss&&wzdDatum(z.abschlussAm)?'; im Banksystem vollständig dokumentiert am '+wzDatum(z.abschlussAm)+(z.abschlussKuerzel?' (Kürzel '+z.abschlussKuerzel+')':''):'')):['- keine']);
});

wzRegistrieren({id:'gwg',titel:'Geldwäsche-Prüfung',sub:'Je Verkauf: wer ist identifiziert, wann und durch wen — die Daten selbst liegen im Banksystem',icon:'shield',ohneNeu:true,
  zustand:()=>GW.aktiv||gwS(),speichern:gwSpeichern,zeichnen:gwZeichnen,rechnen:gwRechnen,
  schliessen:()=>{ if(GW.aktiv) gwSpeichernSofort(); GW.aktiv=null; }});
