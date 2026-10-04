/* ---------- Kachel „Tipps“ ----------
   Hinweise auf Verkaufsabsichten, Bewertungs- und Kaufwünsche oder Vermietungen aus den Filialen, von Kollegen und Partnern:
   je Tipp Datum, Tippgeber, Art, Kunde (Kundenakte), Einverständnis mit der Kontaktaufnahme, Stand bis Auftrag oder Verkauf,
   Verweis auf den Akquise- oder Anfrage-Eintrag (nur gelesen, neu über die Kachel), Tippgeberprämie nach Vorgaben der Bank.
   Datenschutzinformation bei Dritterhebung als Ampel (Art. 14 Abs. 3 DSGVO, Regeln in js/tipps-regeln.js); die Quelle steht im
   Tipp, weil Information und Auskunft sie nennen (Art. 14 Abs. 2 lit. f, Art. 15 Abs. 1 lit. g DSGVO); erteilt oder „bereits
   informiert“ übernimmt die App in die Kundenakte (k.werbung.dsinfo, D51). Rückmeldung an den Tippgeber nur mit dem Stand, ohne
   Einzelheiten zum Kunden; an externe Tippgeber über die Eingangsbestätigung hinaus nur mit Einverständnis des Kunden, jede
   Rückmeldung mit Empfänger in der Auskunft (Art. 15 Abs. 1 lit. c DSGVO). Auswertung nur je Filiale, Art und Quartal — nie je Person
   (Beschäftigtendatenschutz, Betriebsrat). Tipps liegen im Speicher „akten“ (art 'tipp'), Personen nur als Kunden-Id; die
   Tippgeber-Liste (Beschäftigte und Partner) bleibt in den Werkzeug-Eingaben auf dem Gerät (localStorage „ia_wz“). */
var TP={aktiv:null,kn:null,wartet:null};
const TP_PRAEMIE=[['','–'],['keine','keine Prämie vorgesehen'],['gemeldet','zur Prämie gemeldet'],['ausgezahlt','ausgezahlt']];
const TP_ANLASS={verkauf:'Verkauf geplant',bewertung:'Wertermittlung gewünscht',vermietung:'Vermietung'};
function tpR(){ return ImmoTippsRegeln; }
function tpStart(){ return {ansicht:'liste',filter:'offen',jahr:'',quartal:'0',geber:[]}; }
function tpS(){ let a=wzAlle(); if(!a.tipps||typeof a.tipps!=='object'||Array.isArray(a.tipps)) a.tipps=tpStart();
  if(!Array.isArray(a.tipps.geber)) a.tipps.geber=[]; return a.tipps; }
function tpSetz(k,v){ tpS()[k]=v; wzSpeichern(); wzZeichnen(); }
function tpListe(){ return wzdAkten('tipp'); }
function tpGeber(id){ return id?tpS().geber.find(g=>g.id===id)||null:null; }
/* Quelle des Tipps: aktueller Eintrag der Tippgeber-Liste, sonst der beim Tipp gemerkte Stand */
function tpQuelle(t){ let g=tpGeber(t&&t.geberId); return g?{name:g.name||'',filiale:g.filiale||'',art:g.art||''}:Object.assign({name:'',filiale:'',art:''},(t&&t.quelle)||{}); }
function tpQuelleText(q){ return [q.name,q.filiale,tpR().geberArtName(q.art)].filter(Boolean).join(', '); }
function tpDatumFmt(){ return {datum:wzDatum}; }
function tpLeer(felder){
  let heute=aufHeute();
  return wzdAkteNeu('tipp',Object.assign({datum:heute,geberId:'',quelle:{name:'',filiale:'',art:''},tippArt:'verkauf',kundeId:'',einverstandenAm:'',herkunft:'dritter',
    kontaktGeplant:'',ersterKontaktAm:'',weitergabeAm:'',weitergabeAn:'',dsinfo:{erteiltAm:'',weg:'',version:'',bereitsInformiert:false,fundstelle:''},
    stand:'neu',stufe:0,standAm:heute,verlauf:[{datum:heute,text:'Tipp erfasst'}],vorgangId:'',praemie:{stand:'',am:'',notiz:''},
    rueckmeldungAm:'',rueckmeldungStand:'',rueckmeldungEinverstandenAm:'',rueckmeldungen:[],notiz:''},felder||{}));
}

/* ---------- Anlegen, öffnen, speichern ---------- */
async function tpNeu(){
  await wzdLaden();
  let g=tpS().geber, t=tpLeer(g.length===1?{geberId:g[0].id,quelle:tpQuelle({geberId:g[0].id})}:{});
  if(!(await wzdSpeichern('akten',t))) return;
  TP.aktiv=t; TP.kn=null; wzZeichnen(); $('wz_overlay').scrollTop=0;
}
async function tpOeffnen(id){ await wzdLaden(); let t=tpListe().find(x=>x.id===id); if(!t) return; TP.aktiv=t; TP.kn=null; if(WZ.aktiv==='tipps') wzZeichnen(); $('wz_overlay').scrollTop=0; }
function tpAusAkte(id){ wzOeffnen('tipps'); tpOeffnen(id); }
function tpZurueck(){ if(TP.aktiv) wzdSpeichernSofort('akten',TP.aktiv); TP.aktiv=null; TP.kn=null; wzZeichnen(); }
async function tpLoeschen(){
  let t=TP.aktiv; if(!t||!confirm('Diesen Tipp mit Verlauf löschen? Der Kunde bleibt in der Kundenakte, ein verknüpfter Akquise- oder Anfrage-Eintrag bleibt bestehen.')) return;
  if(await wzdLoeschen('akten',t.id)){ TP.aktiv=null; wzZeichnen(); }
}
function tpSpeichern(){ if(TP.aktiv){ tpDsInAkte(TP.aktiv); wzdSpeichernBald('akten',TP.aktiv); } else wzSpeichern(); }
function tpSofort(neu){ let t=TP.aktiv; if(!t) return; wzdSpeichernSofort('akten',t); if(neu!==false) wzZeichnen(); }
function tpVerlauf(t,text){ (t.verlauf=Array.isArray(t.verlauf)?t.verlauf:[]).push({datum:aufHeute(),text}); }
function tpGeberWahl(id){ let t=TP.aktiv; if(!t) return; t.geberId=id||''; t.quelle=id?tpQuelle(t):{name:'',filiale:'',art:''}; tpSofort(); }
function tpStand(stand){ let t=TP.aktiv; if(!t) return; tpR().standSetzen(t,stand,aufHeute()); tpSofort(); }
function tpStandUebernehmen(stand){ tpStand(stand); }
/* Kunde: aus der Kundenakte oder neu (wzdKundeNeu); die Eingaben der Schnellerfassung bleiben nur im Speicher der Seite */
function tpKundeWaehlen(){ wzdKundeWaehlen(id=>{ let t=TP.aktiv; if(!t) return; t.kundeId=id; TP.kn=null; tpDsInAkte(t); tpSofort(); }); }
function tpKundeErfassen(){ TP.kn={anrede:'',vorname:'',nachname:'',telefon:'',email:''}; wzZeichnen(); }
/* Quelle für die Kundenakte: Filiale bzw. Art des Tippgebers, ohne Namen von Beschäftigten (D51) */
function tpAkteQuelle(t){ let q=tpQuelle(t); return 'Tipp'+(q.filiale?' aus '+q.filiale:q.art?' ('+tpR().geberArtName(q.art)+')':''); }
async function tpKundeNeu(){
  let t=TP.aktiv, d=TP.kn; if(!t||!d) return;
  let k=await wzdKundeNeu({anrede:d.anrede,vorname:d.vorname,nachname:d.nachname,telefon:d.telefon,email:d.email,
    dsinfoArt:'dritter',quelle:tpAkteQuelle(t),erlangtAm:wzdDatum(t.datum)||aufHeute()}); if(!k) return;
  t.kundeId=k.id; TP.kn=null; tpVerlauf(t,'Kunde in der Kundenakte angelegt'); tpDsInAkte(t); tpSofort();
}
/* Datenschutzinformation des Tipps in die Kundenakte (k.werbung.dsinfo), damit beide Ampeln übereinstimmen. Überschrieben wird nur,
   was dort nicht erledigt ist oder zuletzt aus diesem Tipp kam (Merker dsinfo.akte); eine eigene Eintragung in der Akte bleibt.
   Die Akte kennt nur das Datum bzw. „bereits informiert“ mit Fundstelle — Weg und Version bleiben im Tipp. */
function tpDsWerte(ds){ ds=ds||{}; return ds.bereitsInformiert?{erteiltAm:'',bereits:true,fundstelle:String(ds.fundstelle||'').trim()}:{erteiltAm:wzdDatum(ds.erteiltAm),bereits:false,fundstelle:''}; }
function tpDsSig(x){ x=x||{}; return [wzdDatum(x.erteiltAm),x.bereits?1:0,x.bereits?String(x.fundstelle||'').trim():''].join('|'); }
function tpDsInAkte(t){
  let k=t&&!t.kundeGeloescht?wzdKunde(t.kundeId):null; if(!k||typeof kwModell!=='function') return;
  let ds=t.dsinfo=t.dsinfo||{}, neu=tpDsWerte(ds), w=kwModell(k), a=w.dsinfo, jetzt=tpDsSig(a), soll=tpDsSig(neu);
  if(jetzt===soll) return;
  let unsere=ds.akte===k.id+'|'+jetzt, fertig=a&&(wzdDatum(a.erteiltAm)||(a.bereits&&String(a.fundstelle||'').trim()));
  if(soll==='|0|'?!unsere:!(unsere||!fertig)) return;   // Tipp geleert: nur zurücknehmen, was von hier kam
  if(!a) a=w.dsinfo={art:t.herkunft==='bank'?'zweckaenderung':'dritter',erhobenAm:aufHeute(),erteiltAm:'',bereits:false,fundstelle:'',
    quelle:tpAkteQuelle(t),erlangtAm:wzdDatum(t.datum)};
  Object.assign(a,neu); k.werbung=w; ds.akte=k.id+'|'+soll;
  kdSpeichern(k);
}
/* umgekehrt: in der Akte vermerkt, im Tipp nicht — anbieten, nicht selbst übernehmen (eine Information vor dem Tipp nennt dessen Quelle nicht) */
function tpDsAkteWerte(t){
  let k=t&&!t.kundeGeloescht?wzdKunde(t.kundeId):null, a=k&&typeof ImmoWerbung!=='undefined'?ImmoWerbung.norm(k).dsinfo:null;
  if(!a||tpR().dsinfoErledigt(t)) return null;
  let dat=wzdDatum(a.erteiltAm), fs=a.bereits?String(a.fundstelle||'').trim():'';
  if(dat&&wzdDatum(t.datum)&&dat<t.datum) dat='';
  return dat?{erteiltAm:dat}:fs?{fundstelle:fs}:null;
}
function tpDsAkteHtml(t){
  let a=tpDsAkteWerte(t); if(!a) return '';
  return wzAmpel('gelb','In der Kundenakte ist '+(a.erteiltAm?'die Datenschutzinformation am '+wzDatum(a.erteiltAm)+' vermerkt':'„bereits informiert“ vermerkt ('+sEsc(a.fundstelle)+')')
      +'. Übernehmen, wenn sie auch diesen Tipp abdeckt (sie nennt die Quelle, Art. 14 Abs. 2 lit. f DSGVO).')
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpDsAusAkte()" data-ic="check">Aus der Kundenakte übernehmen</button></div>';
}
function tpDsAusAkte(){
  let t=TP.aktiv, a=tpDsAkteWerte(t); if(!a) return;
  let ds=t.dsinfo=Object.assign({erteiltAm:'',weg:'',version:'',bereitsInformiert:false,fundstelle:''},t.dsinfo||{});
  if(a.erteiltAm){ ds.erteiltAm=a.erteiltAm; ds.bereitsInformiert=false; } else { ds.bereitsInformiert=true; ds.fundstelle=a.fundstelle; }
  tpVerlauf(t,'Datenschutzinformation aus der Kundenakte übernommen'); tpSofort();
}
function tpKundeLoesen(){ let t=TP.aktiv; if(!t||!confirm('Die Verknüpfung mit dem Kunden lösen? Der Kunde bleibt in der Kundenakte.')) return; t.kundeId=''; tpSofort(); }

/* ---------- Akquise- oder Anfrage-Eintrag (Speicher „vorgaenge“, nur gelesen; neu über die Kachel) ---------- */
function tpVorgang(t){ return t&&t.vorgangId?wzdListe('vorgaenge').find(v=>v.id===t.vorgangId)||null:null; }
function tpVorgangName(v){ return (v.typ==='akquise'?'Akquise':'Anfrage')+' vom '+wzDatum(v.datum)+' · '+(v.status||'')+(v.projektId?' · '+wzdObjektName(v.projektId,''):''); }
function tpVorgangStand(v){ let o=v&&v.projektId?wzdObjekt(v.projektId):null; return v?tpR().standAusVorgang(v.typ,v.status,o?o.status:''):''; }
function tpVorgangWahl(id){ let t=TP.aktiv; if(!t) return; t.vorgangId=id||''; if(id){ let v=tpVorgang(t); if(v) tpVerlauf(t,'Verknüpft: '+tpVorgangName(v)); } tpSofort(); }
function tpVorgangNeu(){
  let t=TP.aktiv; if(!t) return;
  if(!t.kundeId){ alert('Bitte zuerst den Kunden aus der Kundenakte wählen oder neu anlegen.'); return; }
  let typ=t.tippArt==='kauf'?'anfrage':'akquise', q=tpQuelle(t);
  wzdSpeichernSofort('akten',t);
  TP.wartet={id:t.id,ts:Date.now(),typ,kundeId:t.kundeId};
  wzOeffnen(typ==='akquise'?'akquise':'interessenten');
  vgNeuEntwurf(typ,{datum:wzdDatum(t.datum)||aufHeute(),quelle:q.art==='extern'?'Empfehlung':'Filiale',anlass:TP_ANLASS[t.tippArt]||'Sonstiges',
    notiz:'Tipp vom '+wzDatum(t.datum)+(q.filiale?' aus '+q.filiale:''),
    person:{modus:'akte',anrede:'',vorname:'',nachname:'',telefon:'',email:'',einwilligung:false,kundeId:t.kundeId}});
}
/* zurück in der Kachel: den eben angelegten Eintrag verknüpfen und den Tipp wieder öffnen */
function tpWartetPruefen(){
  let w=TP.wartet; if(!w) return; TP.wartet=null;
  let t=tpListe().find(x=>x.id===w.id); if(!t) return;
  let v=wzdListe('vorgaenge').filter(x=>x.typ===w.typ&&x.kundeId===w.kundeId&&(x.ts||0)>=w.ts).sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
  if(v&&!t.vorgangId){ t.vorgangId=v.id; tpVerlauf(t,(v.typ==='akquise'?'Akquise-Kontakt':'Anfrage')+' angelegt'); wzdSpeichernSofort('akten',t); }
  TP.aktiv=t;
}

/* ---------- Rückmeldung an den Tippgeber ---------- */
/* gemeldet wird nur der meldbare Stand: an einen externen Tippgeber ohne Einverständnis des Kunden nur die Eingangsbestätigung */
function tpRueck(t){
  let q=tpQuelle(t), K=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():{};
  return tpR().rueckmeldungText({geberName:q.name,datum:t.datum,tippArt:t.tippArt,stand:tpR().rueckmeldungMeldbar(t,{quelle:q}),berater:K.name||''},tpDatumFmt());
}
function tpRueckMitPflicht(t){ let r=tpRueck(t); return typeof wzMitPflicht==='function'?wzMitPflicht(r.text,{mail:true}):r.text; }
function tpMailLink(){
  let t=TP.aktiv; if(!t) return ''; let g=tpGeber(t.geberId), r=tpRueck(t);
  return 'mailto:'+encodeURIComponent(g&&g.email||'')+'?subject='+encodeURIComponent(r.betreff)+'&body='+encodeURIComponent(tpRueckMitPflicht(t));
}
function tpRueckVermerken(wie){
  let t=TP.aktiv; if(!t) return; let R=tpR(), q=tpQuelle(t), s=R.rueckmeldungMeldbar(t,{quelle:q}), am=aufHeute();
  t.rueckmeldungen=R.rueckmeldungen(t).concat([{am,stand:s,wie,an:tpQuelleText(q)}]);   // für die Auskunft (Art. 15 Abs. 1 lit. c DSGVO)
  t.rueckmeldungAm=am; t.rueckmeldungStand=s; tpVerlauf(t,'Rückmeldung an den Tippgeber ('+wie+'): '+R.standName(s)); tpSofort();
}
function tpMail(){
  let t=TP.aktiv; if(!t) return; let g=tpGeber(t.geberId);
  if(!(g&&g.email)&&!confirm('Für den Tippgeber ist keine E-Mail-Adresse eingetragen. Trotzdem im Mailprogramm öffnen?')) return;
  let a=document.createElement('a'); a.href=tpMailLink(); a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
  tpRueckVermerken('E-Mail');
}
function tpKopieren(){
  let t=TP.aktiv; if(!t) return; let r=tpRueck(t), text='Betreff: '+r.betreff+'\n\n'+tpRueckMitPflicht(t);
  try{ navigator.clipboard.writeText(text).then(()=>{ iaHinweis('Text kopiert'); setTimeout(()=>iaHinweis(''),1800); },()=>alert('Kopieren nicht möglich — bitte den Text markieren und kopieren.')); }
  catch(e){ alert('Kopieren nicht möglich — bitte den Text markieren und kopieren.'); }
  tpRueckVermerken('kopiert');
}
function tpWiedervorlage(){
  let t=TP.aktiv; if(!t) return; let ds=tpR().dsinfoPruefen(t,aufHeute(),tpDatumFmt());
  if(!ds.bis){ alert('Erst das Datum des Tipps eintragen — davon hängt die Frist ab.'); return; }
  if(wzdWiedervorlage('Tipp vom '+wzDatum(t.datum)+': Datenschutzinformation an den Kunden (Art. 14 DSGVO)',ds.bis,'',t.kundeId||''))
    alert('Wiedervorlage zum '+wzDatum(ds.bis)+' angelegt.');
}

/* ---------- Tippgeber-Liste (Beschäftigte und Partner) ---------- */
function tpGeberDazu(){ tpS().geber.push({id:wzdId('tg'),name:'',filiale:'',art:'kundenberater',email:''}); wzSpeichern(); wzZeichnen(); }
async function tpGeberWeg(i){
  let S=tpS(), g=S.geber[i]; if(!g) return;
  if(!confirm('„'+(g.name||'Tippgeber')+'“ aus der Liste entfernen?\nVorhandene Tipps behalten Name und Filiale als Quelle — die Auskunft an den Kunden nennt sie (Art. 15 Abs. 1 lit. g DSGVO).')) return;
  await wzdLaden();
  for(const t of tpListe().filter(t=>t.geberId===g.id)){ t.quelle={name:g.name||'',filiale:g.filiale||'',art:g.art||''}; await wzdSpeichern('akten',t); }
  S.geber.splice(i,1); wzSpeichern(); wzZeichnen();
}
function tpGeberHtml(){
  let S=tpS();
  return wzBox('Tippgeber',(S.geber.length?S.geber.map((g,i)=>'<div class="grid tp-geber">'+wzFeld('geber.'+i+'.name','Name',{typ:'text',ph:'Vorname Nachname'})
      +wzFeld('geber.'+i+'.filiale','Filiale oder Bereich',{typ:'text',ph:'z. B. Filiale Ilsfeld'})
      +wzFeld('geber.'+i+'.art','Art',{typ:'wahl',optionen:tpR().GEBER_ARTEN})+wzFeld('geber.'+i+'.email','E-Mail (für die Rückmeldung)',{typ:'text'})
      +'<div class="field tp-weg"><button type="button" class="secondary" onclick="tpGeberWeg('+i+')" data-ic="trash">Entfernen</button></div></div>').join('')
      :wzHinweis('Noch kein Tippgeber eingetragen.'))
    +'<div class="gr-zeile"><button type="button" class="primary" onclick="tpGeberDazu()" data-ic="plus">Tippgeber hinzufügen</button></div>'
    +wzHinweis('Kolleginnen und Kollegen aus Filialen und Baufinanzierung sowie externe Partner. Die Liste bleibt auf diesem Gerät. '
      +'Die App wertet Tipps nur je Filiale und Art aus, nie je Person (Beschäftigtendatenschutz, Betriebsrat).'));
}

/* ---------- Übersicht ---------- */
function tpChip(k,text){ return '<span class="pa-chip'+(k?' pa-'+k:'')+'">'+sEsc(text)+'</span>'; }
function tpDsChip(ds){ return ds.stufe==='gruen'?tpChip('bezahlt','Datenschutzinfo erledigt'):ds.stufe==='rot'?tpChip('ueberfaellig','Datenschutzinfo fehlt'):tpChip('offen','Datenschutzinfo bis '+wzDatum(ds.bis)); }
function tpKarte(t,heute){
  let q=tpQuelle(t), R=tpR(), ds=R.dsinfoPruefen(t,heute,tpDatumFmt()), st=t.stand||'neu';
  let kunde=t.kundeGeloescht?'(Kunde gelöscht)':t.kundeId?wzdKundeName(t.kundeId):'ohne Kunde';
  return '<div class="kd-karte"><div><b>'+sEsc(kunde)+' — '+sEsc(R.artName(t.tippArt))+'</b><span>'+sEsc([wzDatum(t.datum),q.filiale,q.name].filter(x=>x&&x!=='–').join(' · '))+'</span>'
    +'<div class="pa-chips">'+tpChip(['auftrag','verkauf'].includes(st)?'bezahlt':'',R.standName(st))+(t.kundeGeloescht?'':tpDsChip(ds))
    +(R.rueckmeldungOffen(t,{quelle:q})?tpChip('offen','Rückmeldung offen'):'')+'</div></div>'
    +'<div class="kd-k"><button class="secondary" onclick="tpOeffnen(\''+idSicher(t.id)+'\')">Öffnen</button></div></div>';
}
function tpListeHtml(){
  let S=tpS(), R=tpR(), heute=aufHeute(), f=['offen','erledigt','alle'].includes(S.filter)?S.filter:'offen';
  let l=tpListe().filter(t=>f==='alle'||(f==='offen'?R.offen(t):!R.offen(t))).sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')||(b.ts||0)-(a.ts||0));
  return '<div class="ka-schalter" role="group" aria-label="Filter">'+[['offen','Offen'],['erledigt','Abgeschlossen'],['alle','Alle']]
      .map(([k,x])=>'<button type="button" class="'+(f===k?'primary':'secondary')+'" aria-pressed="'+(f===k)+'" onclick="tpSetz(\'filter\',\''+k+'\')">'+x+'</button>').join('')+'</div>'
    +(l.length?'<div class="kd-karten">'+l.map(t=>tpKarte(t,heute)).join('')+'</div>'
      :wzHinweis(tpListe().length?'Kein Tipp in dieser Auswahl.':'Noch kein Tipp erfasst. „Neuer Tipp“, sobald eine Filiale, ein Kollege oder ein Partner einen Hinweis gibt.'))
    +(S.geber.length?'':wzHinweis('Zuerst die Tippgeber eintragen — Ansicht „Tippgeber“.'));
}
function tpJahre(){ let j=new Set([aufHeute().slice(0,4)]); tpListe().forEach(t=>{ if(wzdDatum(t.datum)) j.add(t.datum.slice(0,4)); }); return [...j].sort().reverse(); }
function tpAuswertungDaten(){
  let S=tpS(), jahre=tpJahre(), jahr=jahre.includes(String(S.jahr))?String(S.jahr):jahre[0], q=+S.quartal||0;
  return tpR().auswertung(tpListe(),{jahr,quartal:q,filiale:t=>tpQuelle(t).filiale,geberArt:t=>tpQuelle(t).art,geber:t=>t.geberId||tpQuelle(t).name});
}
function tpZeitraumText(a){ return a.quartal?a.quartal+'. Quartal '+a.jahr:'Jahr '+a.jahr; }
const TP_TRICHTER=[['tipps','Tipps'],['kontakt','Kontakt'],['termin','Termin'],['auftrag','Auftrag'],['verkauf','Verkauf'],['kein','kein Interesse']];
function tpTabellen(a,dok){
  const z=n=>String(n||0), quote=g=>g.tipps?Math.round(g.auftrag/g.tipps*100)+' %':'–', stern=r=>r.geber===1?' *':'';
  const trichter=rows=>rows.map(r=>[sEsc(r.name||r.filiale)+(r.filiale?stern(r):'')].concat(TP_TRICHTER.map(([k])=>z(r.gesamt[k])),[quote(r.gesamt)]));
  const kopf=['Filiale'].concat(TP_TRICHTER.map(x=>x[1]),['Quote Auftrag']);
  const summe=['<b>Summe</b>'].concat(TP_TRICHTER.map(([k])=>'<b>'+z(a.summe.gesamt[k])+'</b>'),['<b>'+quote(a.summe.gesamt)+'</b>']);
  const zelle=x=>x.tipps?'<span class="tp-zelle">'+x.tipps+' <small>'+x.auftrag+' Auftrag · '+x.verkauf+' Verkauf</small></span>':'–';
  const quartale=a.filialen.map(r=>[sEsc(r.filiale)+stern(r)].concat(r.q.map(zelle))).concat([['<b>Summe</b>'].concat(a.summe.q.map(zelle))]);
  const tab=(rows,k)=>dok?wzDokTabelle(rows,k):'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr>'+k.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'
    +rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' class="r"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const h=t=>dok?'<h2>'+t+'</h2>':'';
  let teile=[
    [ 'Je Filiale — '+tpZeitraumText(a),a.filialen.length?tab(trichter(a.filialen).concat([summe]),kopf):'<p class="hint">Keine Tipps im Zeitraum.</p>'],
    [ 'Je Quartal '+a.jahr+' — Tipps und was daraus wurde',a.filialen.length?tab(quartale,['Filiale','1. Quartal','2. Quartal','3. Quartal','4. Quartal']):'<p class="hint">Keine Tipps im Jahr.</p>'],
    [ 'Nach Art des Tippgebers',a.geberArten.length?tab(trichter(a.geberArten),['Art'].concat(TP_TRICHTER.map(x=>x[1]),['Quote Auftrag'])):'<p class="hint">Keine Tipps im Zeitraum.</p>'],
    [ 'Nach Art des Tipps',a.tippArten.length?tab(trichter(a.tippArten),['Art'].concat(TP_TRICHTER.map(x=>x[1]),['Quote Auftrag'])):'<p class="hint">Keine Tipps im Zeitraum.</p>']];
  let fuss=a.filialen.some(r=>r.geber===1)?'* Nur ein Tippgeber in dieser Filiale — die Zeile lässt auf eine Person schließen. Vor einer Weitergabe Filialen zusammenfassen oder mit dem Betriebsrat abstimmen.':'';
  return {teile:teile.map(([t,x])=>dok?h(t)+x:wzBox(t,x)).join(''),fuss};
}
function tpAuswertungHtml(){
  let S=tpS(), a=tpAuswertungDaten(), t=tpTabellen(a,false);
  return '<div class="grid tp-schmal"><div class="field"><label for="tp_jahr">Jahr</label><select id="tp_jahr" onchange="tpSetz(\'jahr\',this.value)">'
      +tpJahre().map(j=>'<option'+(j===a.jahr?' selected':'')+'>'+j+'</option>').join('')+'</select></div>'
      +'<div class="field"><label for="tp_quartal">Zeitraum</label><select id="tp_quartal" onchange="tpSetz(\'quartal\',this.value)">'
      +[['0','ganzes Jahr'],['1','1. Quartal'],['2','2. Quartal'],['3','3. Quartal'],['4','4. Quartal']].map(([k,x])=>'<option value="'+k+'"'+(String(a.quartal)===k?' selected':'')+'>'+x+'</option>').join('')+'</select></div></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Tipps',String(a.summe.gesamt.tipps),tpZeitraumText(a))+wzdKpi('Bis zum Auftrag',String(a.summe.gesamt.auftrag),a.summe.gesamt.tipps?Math.round(a.summe.gesamt.auftrag/a.summe.gesamt.tipps*100)+' % der Tipps':'')
      +wzdKpi('Bis zum Verkauf',String(a.summe.gesamt.verkauf),'')+wzdKpi('Filialen',String(a.filialen.filter(r=>r.gesamt.tipps).length),'mit Tipps im Zeitraum')+'</div>'
    +t.teile+(t.fuss?wzHinweis(sEsc(t.fuss)):'')
    +wzHinweis('Je Spalte: wie viele Tipps diese Stufe mindestens erreicht haben. Ohne Namen — die Auswertung zeigt Filialen und Arten, keine Personen. „Dokument“ gibt sie aus.');
}
function tpUebersicht(){
  let S=tpS(), R=tpR(), l=tpListe(), heute=aufHeute(), jahr=heute.slice(0,4);
  if(!['liste','auswertung','tippgeber'].includes(S.ansicht)) S.ansicht='liste';
  let aktiv=l.filter(t=>!t.kundeGeloescht);
  let kpi=wzdKpi('Offene Tipps',String(l.filter(R.offen).length),'')
    +wzdKpi('Datenschutzinfo fehlt',String(aktiv.filter(t=>R.dsinfoPruefen(t,heute).stufe==='rot').length),'rot: Frist abgelaufen oder Kontakt ohne Information')
    +wzdKpi('Rückmeldung offen',String(l.filter(t=>R.rueckmeldungOffen(t,{quelle:tpQuelle(t)})).length),'an Tippgeber')
    +wzdKpi('Aufträge '+jahr,String(l.filter(t=>(t.datum||'').slice(0,4)===jahr&&R.erreicht(t)>=3).length),'aus Tipps dieses Jahres');
  return '<div class="wz-kpis grid">'+kpi+'</div>'
    +'<div class="ka-leiste"><div class="ka-schalter" role="group" aria-label="Ansicht">'+[['liste','Tipps'],['auswertung','Auswertung'],['tippgeber','Tippgeber']]
      .map(([k,x])=>'<button type="button" class="'+(S.ansicht===k?'primary':'secondary')+'" aria-pressed="'+(S.ansicht===k)+'" onclick="tpSetz(\'ansicht\',\''+k+'\')">'+x+'</button>').join('')+'</div>'
    +'<button type="button" class="primary" onclick="tpNeu()" data-ic="plus">Neuer Tipp</button></div>'
    +(S.ansicht==='auswertung'?tpAuswertungHtml():S.ansicht==='tippgeber'?tpGeberHtml():tpListeHtml());
}

/* ---------- Tipp bearbeiten ---------- */
function tpGeberOptionen(t){
  let S=tpS(), q=t.quelle||{}, weg=t.geberId&&!tpGeber(t.geberId);
  return '<option value="">– Tippgeber wählen –</option>'+S.geber.map(g=>'<option value="'+sEsc(g.id)+'"'+(g.id===t.geberId?' selected':'')+'>'
      +sEsc([g.name||'ohne Namen',[g.filiale,tpR().geberArtName(g.art)].filter(Boolean).join(', ')].filter(Boolean).join(' — '))+'</option>').join('')
    +(weg?'<option value="'+sEsc(t.geberId)+'" selected>'+sEsc((q.name||'Tippgeber')+' — nicht mehr in der Liste')+'</option>':'');
}
function tpKundeHtml(t){
  let k=wzdKunde(t.kundeId);
  if(t.kundeGeloescht) return wzAmpel('gruen','Der Kunde wurde am '+wzDatum(t.kundeGeloescht)+' gelöscht. Der Tipp zählt ohne Personenbezug in der Auswertung.');
  if(k) return '<div class="kd-karte"><div><b>'+sEsc(kdName(k))+'</b><span>'+sEsc([k.telefon,k.email,[k.strasse,k.plzort].filter(Boolean).join(', ')].filter(Boolean).join(' · ')||'keine Kontaktdaten')+'</span></div>'
    +'<div class="kd-k"><button class="secondary" onclick="kdOeffnen(\''+idSicher(k.id)+'\')">Akte</button><button class="secondary" onclick="tpKundeWaehlen()">Ändern</button>'
    +'<button class="secondary" onclick="tpKundeLoesen()">Lösen</button></div></div>';
  let n=TP.kn;
  return (t.kundeId?wzAmpel('gelb','Der verknüpfte Kunde ist nicht mehr in der Kundenakte.'):'')
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpKundeWaehlen()" data-ic="users">Aus der Kundenakte</button>'
    +(n?'':'<button type="button" class="secondary" onclick="tpKundeErfassen()" data-ic="plus">Neu erfassen</button>')+'</div>'
    +(n?'<div class="grid">'
      +'<div class="field"><label for="tp_kn_anrede">Anrede</label><select id="tp_kn_anrede" onchange="TP.kn.anrede=this.value">'+['','Frau','Herr','Divers','Firma'].map(a=>'<option'+(a===n.anrede?' selected':'')+'>'+a+'</option>').join('')+'</select></div>'
      +[['vorname','Vorname'],['nachname','Nachname'],['telefon','Telefon'],['email','E-Mail']].map(([f,l])=>'<div class="field"><label for="tp_kn_'+f+'">'+l+'</label><input id="tp_kn_'+f+'" value="'+sEsc(n[f]||'')+'" oninput="TP.kn.'+f+'=this.value"></div>').join('')
      +'</div><div class="gr-zeile"><button type="button" class="primary" onclick="tpKundeNeu()" data-ic="check">In der Kundenakte anlegen</button>'
      +'<button type="button" class="secondary" onclick="TP.kn=null;wzZeichnen()">Abbrechen</button></div>'
      +wzHinweis('Die Person wird in der Kundenakte angelegt, ohne Einwilligung in Werbung. Die Rechtsgrundlage der Speicherung prüfst du dort — bei einem Tipp mit dem Datenschutzbeauftragten klären.'):'');
}
function tpDsHtml(t){
  let ds=t.dsinfo||{}, R=tpR();
  return '<div class="grid">'+wzFeld('herkunft','Herkunft der Daten',{typ:'wahl',optionen:R.HERKUNFT,voll:true})
      +wzFeld('dsinfo.bereitsInformiert','Kunde ist bereits informiert (z. B. durch die Datenschutzinformation der Bank)',{typ:'check',voll:true,zeichnen:true})
      +(ds.bereitsInformiert?wzFeld('dsinfo.fundstelle','Fundstelle',{typ:'text',voll:true,ph:'z. B. Datenschutzinformation der Bank, Fassung 2025'})
        :wzFeld('dsinfo.erteiltAm','Datenschutzinformation erteilt am',{typ:'datum'})+wzFeld('dsinfo.weg','Weg',{typ:'wahl',optionen:[['','–']].concat(R.DS_WEGE.map(w=>[w,w]))})
          +wzFeld('dsinfo.version','Vordruck der Bank (Version)',{typ:'text',ph:'z. B. DSI Immobilien 01/2026'}))
      +wzFeld('kontaktGeplant','Erster Kontakt geplant am',{typ:'datum'})+wzFeld('ersterKontaktAm','Erster Kontakt am',{typ:'datum',hinweis:'setzt die App mit „Kontakt aufgenommen“'})
      +wzFeld('weitergabeAm','Weitergegeben am',{typ:'datum',hinweis:'an einen anderen Empfänger'})+wzFeld('weitergabeAn','an',{typ:'text',ph:'z. B. Baufinanzierung'})+'</div>'
    +'<div id="tp_ds"></div><div id="tp_ds_akte"></div>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpWiedervorlage()" data-ic="clock">Wiedervorlage zur Frist</button></div>'
    +wzHinweis('Den Text der Datenschutzinformation gibt die Bank vor (Vordruck); er nennt auch die Quelle des Tipps (Art. 14 Abs. 2 lit. f DSGVO). '
      +'Ob ein Tipp aus der Filiale als Dritterhebung (Art. 14) oder als Zweckänderung (Art. 13 Abs. 3 DSGVO) gilt, klärt die Bank mit dem Datenschutzbeauftragten.');
}
function tpVorgangHtml(t){
  let v=tpVorgang(t), R=tpR(), andere=t.kundeId?wzdListe('vorgaenge').filter(x=>x.kundeId===t.kundeId):[], neu=t.tippArt==='kauf'?'Anfrage anlegen':'Akquise-Kontakt anlegen';
  let vs=v?tpVorgangStand(v):'', vor=v?R.standVorschlag(t,vs):'';
  return (v?'<div class="kd-karte"><div><b>'+sEsc(tpVorgangName(v))+'</b><span>Stand dort: '+sEsc(v.status||'–')+'</span></div>'
        +'<div class="kd-k"><button class="secondary" onclick="wzVorgangOeffnen(\''+idSicher(v.id)+'\')">Öffnen</button></div></div>'
      :t.vorgangId?wzAmpel('gelb','Der verknüpfte Eintrag ist nicht mehr vorhanden.'):'')
    +(vor?wzAmpel('gelb','Dort ist der Stand weiter: „'+sEsc(v.status)+'“ entspricht „'+sEsc(R.standName(vor))+'“.')
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpStandUebernehmen(\''+vor+'\')" data-ic="check">Stand „'+sEsc(R.standName(vor))+'“ übernehmen</button></div>':'')
    +'<div class="grid tp-schmal"><div class="field"><label for="tp_vorgang">Verknüpfter Eintrag</label><select id="tp_vorgang" onchange="tpVorgangWahl(this.value)"><option value="">– keiner –</option>'
      +andere.map(x=>'<option value="'+sEsc(x.id)+'"'+(x.id===t.vorgangId?' selected':'')+'>'+sEsc(tpVorgangName(x))+'</option>').join('')+'</select></div></div>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpVorgangNeu()" data-ic="'+(t.tippArt==='kauf'?'inbox':'sign')+'">'+neu+'</button></div>'
    +wzHinweis(t.kundeId?'Akquise und Anfragen pflegst du in ihren Kacheln; hier steht nur der Verweis. Zurück in „Tipps“ verknüpft die App den neuen Eintrag.':'Erst den Kunden wählen — dann lassen sich seine Akquise- und Anfrage-Einträge verknüpfen.');
}
function tpRueckHtml(t){
  let r=tpRueck(t), g=tpGeber(t.geberId), R=tpR(), o={quelle:tpQuelle(t)}, m=R.rueckmeldungMeldbar(t,o), st=t.stand||'neu';
  return '<p class="tp-betreff" id="tp_rueck_betreff"><b>Betreff:</b> '+sEsc(r.betreff)+'</p><pre class="tp-text" id="tp_rueck_text">'+sEsc(r.text)+'</pre>'
    +(m!==st?wzAmpel('gelb','Externer Tippgeber: den Stand „'+sEsc(R.standName(st))+'“ erst melden, wenn der Kunde damit einverstanden ist (Bankgeheimnis; Art. 6 Abs. 1 lit. a DSGVO). '
      +'Bis dahin nur die Eingangsbestätigung.'):'')
    +(R.rueckmeldungOffen(t,o)?wzAmpel('gelb','Rückmeldung zum Stand „'+sEsc(R.standName(m))+'“ steht aus.')
      :t.rueckmeldungAm?wzAmpel('gruen','Rückmeldung zum Stand „'+sEsc(R.standName(t.rueckmeldungStand))+'“ am '+wzDatum(t.rueckmeldungAm)+' gegeben.'):'')
    +'<div class="gr-zeile"><button type="button" class="primary" onclick="tpMail()" data-ic="mail">Als E-Mail öffnen</button>'
    +'<button type="button" class="secondary" onclick="tpKopieren()" data-ic="clipboard">Kopieren</button></div>'
    +wzHinweis('Nur der Stand, ohne Einzelheiten zum Kunden.'+(g&&g.email?'':' Für die E-Mail die Adresse in der Tippgeber-Liste eintragen.'));
}
function tpVerlaufHtml(t){
  let l=(t.verlauf||[]).slice().reverse();
  return l.length?'<ul class="vg-verlauf">'+l.map(h=>'<li><span>'+wzDatum(h.datum)+'</span><span>'+sEsc(h.text)+'</span></li>').join('')+'</ul>':wzHinweis('Noch kein Eintrag.');
}
function tpEditor(t){
  let R=tpR(), S=tpS();
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="tpZurueck()" data-ic="arrow-left">Alle Tipps</button>'
      +'<span class="ub-status">'+sEsc(R.artName(t.tippArt)+' · '+R.standName(t.stand))+'</span><button type="button" class="secondary" onclick="tpLoeschen()" data-ic="trash">Löschen</button></div>'
    +wzBox('Prüfung','<div id="tp_pruefung"></div>')
    +wzBox('Tipp','<div class="grid">'+wzFeld('datum','Tipp erhalten am',{typ:'datum',hinweis:'Beginn der Frist für die Datenschutzinformation'})
      +'<div class="field"><label for="tp_geber">Tippgeber</label><select id="tp_geber" onchange="tpGeberWahl(this.value)">'+tpGeberOptionen(t)+'</select></div>'
      +wzFeld('tippArt','Art',{typ:'wahl',optionen:R.ARTEN,zeichnen:true})
      +'<div class="field"><label for="tp_stand">Stand</label><select id="tp_stand" onchange="tpStand(this.value)">'+R.STAENDE.map(([k,x])=>'<option value="'+k+'"'+((t.stand||'neu')===k?' selected':'')+'>'+sEsc(x)+'</option>').join('')+'</select></div>'
      +wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Erbengemeinschaft, möchte bis Frühjahr verkaufen — keine Gesundheitsdaten'})+'</div>'
      +(S.geber.length?'':'<div class="gr-zeile"><button type="button" class="secondary" onclick="tpZurueck();tpSetz(\'ansicht\',\'tippgeber\')" data-ic="users">Tippgeber eintragen</button></div>'))
    +wzBox('Kunde',tpKundeHtml(t)+(t.kundeGeloescht?'':'<div class="grid tp-schmal">'+wzFeld('einverstandenAm','Einverständnis mit der Kontaktaufnahme am',{typ:'datum',hinweis:'z. B. gegenüber dem Tippgeber erklärt'})+'</div>'))
    +(t.kundeGeloescht?'':wzBox('Datenschutzinformation',tpDsHtml(t)))
    +(t.kundeGeloescht?'':wzBox('Akquise oder Anfrage',tpVorgangHtml(t)))
    +wzBox('Rückmeldung an den Tippgeber',(!t.kundeGeloescht&&R.geberExtern(t,{quelle:tpQuelle(t)})?'<div class="grid tp-schmal">'
        +wzFeld('rueckmeldungEinverstandenAm','Einverständnis des Kunden mit der Rückmeldung zum Stand am',{typ:'datum',hinweis:'externer Tippgeber: ohne Einverständnis nur die Eingangsbestätigung'})+'</div>':'')
      +'<div id="tp_rueck">'+tpRueckHtml(t)+'</div>')
    +wzBox('Tippgeberprämie','<div class="grid">'+wzFeld('praemie.stand','Prämie',{typ:'wahl',optionen:TP_PRAEMIE})+wzFeld('praemie.am','am',{typ:'datum'})
      +wzFeld('praemie.notiz','Notiz',{typ:'text',ph:'z. B. an die Personalabteilung gemeldet'})+'</div>'
      +wzHinweis('Nach den Vorgaben der Bank — die App rechnet keine Prämie und wertet sie nicht je Person aus.'))
    +wzBox('Verlauf',tpVerlaufHtml(t));
}
function tpZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='tipps') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  tpWartetPruefen();
  return TP.aktiv?tpEditor(TP.aktiv):tpUebersicht();
}
/* nach jeder Eingabe: Prüfung, Datenschutz-Ampel und Rückmeldung neu, ohne die Felder neu aufzubauen (in #tp_rueck stehen nur Knöpfe) */
function tpRechnen(){
  let t=TP.aktiv; if(!t){ iconify($('wz_body')); return; }
  let heute=aufHeute(), R=tpR(), o=Object.assign(tpDatumFmt(),{quelle:tpQuelle(t)});
  wzH('tp_pruefung',R.pruefen(t,heute,o).map(x=>wzAmpel(x.stufe,sEsc(x.text))).join(''));
  let ds=R.dsinfoPruefen(t,heute,o); wzH('tp_ds',wzAmpel(ds.stufe,sEsc(ds.text)));
  wzH('tp_ds_akte',tpDsAkteHtml(t)); wzH('tp_rueck',tpRueckHtml(t));
  iconify($('wz_body'));
}

/* ---------- Auswertung als Dokument (ohne Namen) ---------- */
function tpDokument(){
  let a=tpAuswertungDaten(), t=tpTabellen(a,true);
  if(!tpListe().length){ alert('Noch kein Tipp erfasst.'); return null; }
  return {titel:'Tipps Auswertung '+tpZeitraumText(a),
    html:'<h1>Tipps aus Filialen und von Partnern</h1><p class="wzd-unter">Auswertung '+sEsc(tpZeitraumText(a))+' · Stand '+new Date().toLocaleDateString('de-DE')+' · ohne Namen</p>'
      +t.teile+(t.fuss?'<p class="wzd-klein">'+sEsc(t.fuss)+'</p>':'')
      +'<p class="wzd-klein">Je Spalte: Tipps, die diese Stufe mindestens erreicht haben. Je Quartal: Tipps nach Eingang und was daraus wurde.</p>',
    fuss:'Auswertung je Filiale und Art, ohne Namen von Tippgebern und Kunden.'};
}

/* ---------- Kundenakte: Anzeige, Löschen, Auskunft ---------- */
KD_AKTE_HOOKS.push(id=>{
  if(!wzdBereit()) return '';
  let l=tpListe().filter(t=>t.kundeId===id); if(!l.length) return '';
  return '<h3>Tipps</h3><div class="kd-karten">'+l.map(t=>{ let q=tpQuelle(t);
    return '<div class="kd-karte"><div><b>'+sEsc(tpR().artName(t.tippArt))+' — Tipp vom '+wzDatum(t.datum)+'</b><span>'+sEsc(['Quelle: '+(tpQuelleText(q)||'–'),tpR().standName(t.stand)].join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="kdSchliessen();tpAusAkte(\''+idSicher(t.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>';
});
/* Kunde gelöscht: Personenbezug entfernen, der Tipp bleibt für die Auswertung je Filiale (Datum, Art, Quelle, Stand) */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const t of tpListe().filter(t=>t.kundeId===id)){
    Object.assign(t,{kundeId:'',quelle:tpQuelle(t),einverstandenAm:'',kontaktGeplant:'',ersterKontaktAm:'',weitergabeAm:'',weitergabeAn:'',vorgangId:'',notiz:'',
      rueckmeldungEinverstandenAm:'',rueckmeldungen:[],dsinfo:{erteiltAm:'',weg:'',version:'',bereitsInformiert:false,fundstelle:''},kundeGeloescht:aufHeute()});
    t.verlauf=(t.verlauf||[]).filter(h=>/^(Tipp erfasst|Stand: )/.test(h.text||'')).concat([{datum:aufHeute(),text:'Kunde gelöscht'}]);
    await wzdSpeichern('akten',t);
  }
});
/* Auskunft: mit Herkunft der Daten (Art. 15 Abs. 1 lit. g DSGVO) und Empfängern einer Weitergabe oder Rückmeldung (lit. c) */
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=tpListe().filter(t=>t.kundeId===id).sort((a,b)=>(a.datum||'').localeCompare(b.datum||''));
  return ['','TIPPS (HINWEISE AUS FILIALEN UND VON PARTNERN)'].concat(l.length?l.map(t=>{ let q=tpQuelle(t), ds=t.dsinfo||{}, R=tpR(), rm=R.rueckmeldungen(t);
    return '- '+wzDatum(t.datum)+' '+R.artName(t.tippArt)+' — Herkunft der Daten: '+(tpQuelleText(q)||'nicht angegeben')
      +(t.herkunft==='bank'?' (aus der Kundenbeziehung der Bank)':'')
      +'; Einverständnis mit der Kontaktaufnahme: '+(wzdDatum(t.einverstandenAm)?wzDatum(t.einverstandenAm):'nicht vermerkt')
      +'; Datenschutzinformation: '+(ds.bereitsInformiert?'bereits informiert ('+(ds.fundstelle||'ohne Fundstelle')+')'
        :wzdDatum(ds.erteiltAm)?'erteilt am '+wzDatum(ds.erteiltAm)+[ds.weg,ds.version].filter(Boolean).map(x=>', '+x).join(''):'noch nicht erteilt')
      +(wzdDatum(t.ersterKontaktAm)?'; erster Kontakt am '+wzDatum(t.ersterKontaktAm):'')
      +(wzdDatum(t.weitergabeAm)?'; weitergegeben am '+wzDatum(t.weitergabeAm)+(t.weitergabeAn?' an '+t.weitergabeAn:''):'')
      +(R.geberExtern(t,{quelle:q})||wzdDatum(t.rueckmeldungEinverstandenAm)?'; Einverständnis mit der Rückmeldung zum Stand an den Tippgeber: '
        +(wzdDatum(t.rueckmeldungEinverstandenAm)?wzDatum(t.rueckmeldungEinverstandenAm):'nicht vermerkt'):'')
      +(rm.length?'; Rückmeldung an den Tippgeber: '+rm.map(r=>wzDatum(r.am)+' zum Stand „'+R.standName(r.stand)+'“ an '+(r.an||tpQuelleText(q)||'den Tippgeber')).join(', '):'')
      +'; Stand: '+R.standName(t.stand)+(t.notiz?'; Notiz: '+t.notiz:''); }):['- keine']);
});

wzRegistrieren({id:'tipps',titel:'Tipps',sub:'Hinweise aus Filialen, von Kollegen und Partnern — Stand, Datenschutzinformation, Rückmeldung, Auswertung je Filiale',icon:'store',ohneNeu:true,
  zustand:()=>TP.aktiv||tpS(),speichern:tpSpeichern,zeichnen:tpZeichnen,rechnen:tpRechnen,dokument:tpDokument,
  schliessen:()=>{ if(TP.aktiv) wzdSpeichernSofort('akten',TP.aktiv); TP.aktiv=null; TP.kn=null; }});
