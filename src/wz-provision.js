/* ---------- Kachel „Provision“ (D42) ----------
   Abrechnung je Verkauf: Provision beider Seiten mit Umsatzsteuer, Prüfung der Teilung (§§ 656a–656d BGB) und der Fälligkeit
   (§ 652 Abs. 1 BGB; Anteil der nicht beauftragenden Seite erst nach Zahlung der beauftragenden, § 656d Abs. 1 Satz 2 BGB),
   Rechnung mit den Pflichtangaben des § 14 Abs. 4 UStG und Zahlungseingang. Maklerleistungen hängen mit einem Grundstück
   zusammen (Abschnitt 14.2 Abs. 3 UStAE): Rechnung binnen sechs Monaten (§ 14 Abs. 2 Satz 2 UStG), bei Privatpersonen mit
   Hinweis auf deren Aufbewahrungspflicht (§ 14 Abs. 4 Nr. 9, § 14b Abs. 1 Satz 5 UStG). Ist der Empfänger Unternehmer, stellt
   die Bank ab 2027 eine E-Rechnung über ihr Buchungssystem aus (§ 14 Abs. 2 Satz 2 Nr. 1, § 27 Abs. 38 UStG) — dafür gibt die
   Kachel die Angaben aus. Rechnung in js/beratung.js (provisionBetrag, provisionPruefen, rechnungsnummer).
   Die Abrechnungen enthalten Namen und Anschriften der Rechnungsempfänger: Datenbank (Speicher „abrechnungen“, Version 6),
   Teil der Gesamtsicherung, einzeln löschbar; Angaben zum Rechnungsaussteller bleiben auf dem Gerät (localStorage „ia_wz“). */
var PA={aktiv:null,dokRolle:'',notarWahl:''};
const PA_ROLLEN={verkaeufer:'Verkäufer',kaeufer:'Käufer'};
const PA_ARTEN=[['efh','Einfamilienhaus (auch Doppel- oder Reihenhaus)'],['wohnung','Wohnung'],['andere','Mehrfamilienhaus, Grundstück oder Gewerbe']];
const PA_LEISTUNG='Nachweis und Vermittlung des Kaufvertrags über das Objekt {objekt} vom {datum} (Kaufpreis {kaufpreis})';
function paStart(){ return {einst:{aussteller:'',anschrift:'',steuernr:'',bank:'',iban:'',bic:'',ziel:'14',praefix:'PR-{jahr}-',ust:'19',leistung:''},filter:'offen'}; }
function paS(){ let a=wzAlle(); if(!a.provision||typeof a.provision!=='object') a.provision=paStart();
  if(!a.provision.einst||typeof a.provision.einst!=='object') a.provision.einst=paStart().einst; return a.provision; }
function paEinst(){ return paS().einst; }
function paPartei(rolle){ return {rolle,kundeId:'',name:'',anschrift:'',privat:true,maklervertrag:rolle==='verkaeufer',art:'satz',satz:'3,57',betrag:'',
  rechnungNr:'',rechnungDatum:'',ziel:'',bezahltAm:'',bezahltBetrag:''}; }
function paLeer(){ return {id:wzdId('pa'),ts:Date.now(),projektId:'',notarId:'',objekt:'',anschrift:'',art:'efh',kaeuferVerbraucher:true,kaufpreis:'',vertragDatum:'',
  bedingung:false,bedingungDatum:'',notiz:'',parteien:[paPartei('verkaeufer'),paPartei('kaeufer')]}; }
function paUst(){ let u=wzN(paEinst().ust); return u>=0&&u<100?u:19; }
function paBetrag(a,p){ return ImmoBeratung.provisionBetrag(wzN(a.kaufpreis,true),{art:p.art==='fest'?'fest':'satz',satz:wzN(p.satz),betrag:wzN(p.betrag,true),ust:paUst()}); }
function paPruefDaten(a){
  return {art:a.art,kaeuferVerbraucher:a.kaeuferVerbraucher!==false,vertragDatum:wzdDatum(a.vertragDatum),bedingung:!!a.bedingung,bedingungDatum:wzdDatum(a.bedingungDatum),
    parteien:a.parteien.map(p=>({rolle:p.rolle,maklervertrag:!!p.maklervertrag,brutto:paBetrag(a,p).brutto,bezahltAm:wzdDatum(p.bezahltAm),rechnungDatum:wzdDatum(p.rechnungDatum)}))};
}
function paPruefen(a){ return ImmoBeratung.provisionPruefen(paPruefDaten(a),aufHeute()); }
/* Zahlungsziel: frühestens ab Fälligkeit, sonst ab Rechnungsdatum */
function paZielTag(a,p,pr){
  pr=pr||paPruefen(a); let ab=pr.faellig[p.rolle], rd=wzdDatum(p.rechnungDatum); if(!ab||!rd) return '';
  let ziel=Math.max(0,Math.round(wzN(p.ziel||paEinst().ziel)||0));
  return ImmoBeratung.tagePlus(rd>ab?rd:ab,ziel);
}
function paZahltAktiv(a){ return a.parteien.filter(p=>paBetrag(a,p).brutto>0); }
function paErledigt(a){ let l=paZahltAktiv(a); return l.length>0&&l.every(p=>wzdDatum(p.bezahltAm)); }
function paStatus(a,p,pr){
  if(wzdDatum(p.bezahltAm)) return {k:'bezahlt',t:'bezahlt am '+wzDatum(p.bezahltAm)};
  pr=pr||paPruefen(a);
  if(!pr.faellig[p.rolle]) return {k:'wartet',t:pr.grund[p.rolle]?'noch nicht fällig':'Kaufvertrag oder Bedingung fehlt'};
  if(!wzdDatum(p.rechnungDatum)) return {k:'offen',t:'Rechnung fehlt'};
  let z=paZielTag(a,p,pr);
  return z&&z<aufHeute()?{k:'ueberfaellig',t:'überfällig seit '+wzDatum(z)}:{k:'gestellt',t:'Rechnung '+(p.rechnungNr||'')+(z?' · zahlbar bis '+wzDatum(z):'')};
}
function paStatusText(st,grund){ return st.t+(grund&&st.k==='wartet'?' — fällig '+grund:grund&&st.k!=='bezahlt'?' (Anspruch '+grund+')':''); }
function paObjektName(a){ return (a.objekt||'').trim()||wzdObjektName(a.projektId,'')||(a.anschrift||'').trim()||'Verkauf'; }
function paErsetzen(t,a,p){
  return String(t||'').replace(/\{objekt\}/g,(a.anschrift||'').trim()||paObjektName(a))
    .replace(/\{datum\}/g,wzdDatum(a.vertragDatum)?wzDatum(a.vertragDatum):'…').replace(/\{kaufpreis\}/g,wzN(a.kaufpreis,true)>0?wzEur(wzN(a.kaufpreis,true)):'…')
    .replace(/\{rolle\}/g,p?PA_ROLLEN[p.rolle]:'');
}

/* ---------- Anlegen, öffnen, übernehmen ---------- */
async function paNeu(vorlage){
  await wzdLaden(); let a=Object.assign(paLeer(),vorlage||{}); PA.aktiv=a;
  if(!(await wzdSpeichern('abrechnungen',a))){ PA.aktiv=null; return; }
  wzZeichnen(); $('wz_overlay').scrollTop=0;
}
async function paOeffnen(id){ await wzdLaden(); let a=wzdListe('abrechnungen').find(x=>x.id===id); if(!a) return; PA.aktiv=a; if(WZ.aktiv==='provision') wzZeichnen(); $('wz_overlay').scrollTop=0; }
function paZurueck(){ if(PA.aktiv) wzdSpeichernSofort('abrechnungen',PA.aktiv); PA.aktiv=null; wzZeichnen(); }
async function paLoeschen(){
  let a=PA.aktiv; if(!a) return;
  if(!confirm('Diese Abrechnung löschen?'+(a.parteien.some(p=>p.rechnungNr)?'\nGestellte Rechnungen bewahrt die Bank in ihrer Buchhaltung auf (§ 14b UStG) — hier geht nur die Arbeitskopie.':''))) return;
  if(await wzdLoeschen('abrechnungen',a.id)){ PA.aktiv=null; wzZeichnen(); }
}
function paSpeichern(){ if(PA.aktiv) wzdSpeichernBald('abrechnungen',PA.aktiv); else wzSpeichern(); }
/* Objekt aus den gesicherten Bewertungen: Anschrift, Art, Kaufpreis, Provision, Kunde als Verkäufer */
function paObjektWaehlen(id){
  let a=PA.aktiv, o=wzdObjekt(id); if(!a) return; a.projektId=id||'';
  if(o){ let f=o.f||{};
    a.objekt=o.name; a.anschrift=o.anschrift||a.anschrift;
    a.art=(f.ek_modus||'')==='wohnung'?'wohnung':/^(EFH|Doppel|Reihen)/.test(f.ek_typ||'')?'efh':'andere';
    if(o.preis>0&&!wzN(a.kaufpreis,true)) a.kaufpreis=Math.round(o.preis).toLocaleString('de-DE');
    let s=typeof nkSatzAusText==='function'?nkSatzAusText(f.ex_provision):''; if(s!==''){ let k=a.parteien.find(p=>p.rolle==='kaeufer'); if(k) k.satz=s; }
    let v=a.parteien.find(p=>p.rolle==='verkaeufer'), kd=wzdKunde(o.kundeId);
    if(v&&kd&&!v.name){ v.kundeId=kd.id; v.name=kdName(kd); v.anschrift=[kd.strasse,kd.plzort].filter(Boolean).join(', '); }
  }
  paSpeichern(); wzZeichnen();
}
/* aus einem Notarauftrag: Objekt, Kaufpreis, Beurkundung, Verkäufer und Käufer, Provisionssätze */
async function paAusNotar(id){
  if(!id) return;
  if(typeof noLaden==='function'&&!NO.liste) await noLaden();
  let n=(typeof NO!=='undefined'&&NO.liste||[]).find(x=>x.id===id); if(!n) return;
  const namen=l=>(l||[]).map(x=>(x.name||'').trim()).filter(Boolean).join(' und '), anschr=l=>((l||[]).find(x=>(x.anschrift||'').trim())||{}).anschrift||'';
  let v=paPartei('verkaeufer'), k=paPartei('kaeufer');
  v.name=namen(n.verkaeufer); v.anschrift=anschr(n.verkaeufer); v.kundeId=n.kundeId||'';
  k.name=namen(n.kaeufer); k.anschrift=anschr(n.kaeufer);
  let sv=typeof nkSatzAusText==='function'?nkSatzAusText(n.provVerkaeufer):'', sk=typeof nkSatzAusText==='function'?nkSatzAusText(n.provKaeufer):'';
  if(sv!=='') v.satz=sv; if(sk!=='') k.satz=sk;
  if(sv==='0') v.maklervertrag=false;
  PA.notarWahl='';
  await paNeu({notarId:n.id,projektId:'',objekt:(n.projekt||'').trim()||(n.anschrift||'').trim(),anschrift:(n.anschrift||'').trim(),
    art:n.art==='Wohnung'?'wohnung':/^Einfamilienhaus/.test(n.art||'')?'efh':'andere',kaeuferVerbraucher:n.kaeuferVerbraucher!=='nein',
    kaufpreis:n.kaufpreis||'',vertragDatum:wzdDatum(n.termin)||'',parteien:[v,k]});
}
function paKundeWaehlen(i){
  wzdKundeWaehlen(id=>{ let a=PA.aktiv, p=a&&a.parteien[i], kd=wzdKunde(id); if(!p||!kd) return;
    p.kundeId=id; p.name=kdName(kd); p.anschrift=[kd.strasse,kd.plzort].filter(Boolean).join(', '); p.privat=!kd.firma;
    paSpeichern(); wzZeichnen(); });
}
function paNummerVergeben(i){
  let a=PA.aktiv, p=a&&a.parteien[i]; if(!p) return;
  let vergeben=[]; wzdListe('abrechnungen').forEach(x=>(x.parteien||[]).forEach(y=>{ if(y.rechnungNr) vergeben.push(y.rechnungNr); }));
  a.parteien.forEach(y=>{ if(y.rechnungNr) vergeben.push(y.rechnungNr); });
  p.rechnungNr=ImmoBeratung.rechnungsnummer(paEinst().praefix,vergeben,+aufHeute().slice(0,4));
  if(!wzdDatum(p.rechnungDatum)) p.rechnungDatum=aufHeute();
  paSpeichern(); wzZeichnen();
}
function paZahlung(i){
  let a=PA.aktiv, p=a&&a.parteien[i]; if(!p) return;
  if(wzdDatum(p.bezahltAm)){ if(!confirm('Den Zahlungseingang wieder entfernen?')) return; p.bezahltAm=''; p.bezahltBetrag=''; }
  else { p.bezahltAm=aufHeute(); p.bezahltBetrag=paBetrag(a,p).brutto.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  paSpeichern(); wzZeichnen();
}
function paWiedervorlage(i){
  let a=PA.aktiv, p=a&&a.parteien[i]; if(!p) return;
  let z=paZielTag(a,p); if(!z){ alert('Erst Rechnungsdatum und Fälligkeit klären — dann lässt sich der Zahlungstermin vormerken.'); return; }
  if(wzdWiedervorlage('Provision '+paObjektName(a)+': Zahlung '+PA_ROLLEN[p.rolle]+(p.rechnungNr?' (Rechnung '+p.rechnungNr+')':'')+' prüfen',z,paObjektName(a),p.kundeId||''))
    alert('Wiedervorlage zum '+wzDatum(z)+' angelegt.');
}

/* ---------- Ansicht ---------- */
function paListeHtml(){
  let S=paS(), heute=aufHeute(), jahr=heute.slice(0,4), alle=wzdListe('abrechnungen').slice()
    .sort((a,b)=>(b.vertragDatum||'').localeCompare(a.vertragDatum||'')||(b.ts||0)-(a.ts||0));
  let offen=0, ueber=0, eingang=0, nOffen=0;
  alle.forEach(a=>{ let pr=paPruefen(a); paZahltAktiv(a).forEach(p=>{ let b=paBetrag(a,p).brutto, st=paStatus(a,p,pr);
    if(st.k==='bezahlt'){ if(String(p.bezahltAm).slice(0,4)===jahr) eingang+=wzN(p.bezahltBetrag,true)||b; }
    else { offen+=b; nOffen++; if(st.k==='ueberfaellig') ueber+=b; } }); });
  let l=alle.filter(a=>S.filter==='alle'||(S.filter==='bezahlt'?paErledigt(a):!paErledigt(a)));
  let notar=typeof NO!=='undefined'&&NO.liste?NO.liste.filter(n=>n.stand!=='Entwurf'||n.kaufpreis):[];
  return '<div class="ka-leiste"><button type="button" class="primary" onclick="paNeu()" data-ic="plus">Neue Abrechnung</button>'
      +(notar.length?'<div class="field pa-notar"><label for="pa_notar">Aus Notarauftrag übernehmen</label><select id="pa_notar" onchange="paAusNotar(this.value)"><option value="">– Notarauftrag wählen –</option>'
        +notar.map(n=>'<option value="'+sEsc(n.id)+'">'+sEsc([(n.projekt||n.anschrift||'Notarauftrag').trim(),wzdDatum(n.termin)?wzDatum(n.termin):'',n.stand].filter(Boolean).join(' · '))+'</option>').join('')+'</select></div>':'')
      +'</div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Offen',wzEur(offen),nOffen+' Posten')+wzdKpi('Überfällig',wzEur(ueber),ueber>0?'Zahlung nachhalten':'nichts überfällig')
      +wzdKpi('Eingegangen '+jahr,wzEur(eingang),'bezahlte Provision')+'</div>'
    +'<div class="ka-schalter" role="group" aria-label="Filter">'+[['offen','Offen'],['bezahlt','Bezahlt'],['alle','Alle']]
      .map(([k,t])=>'<button type="button" class="'+((S.filter||'offen')===k?'primary':'secondary')+'" aria-pressed="'+((S.filter||'offen')===k)+'" onclick="paS().filter=\''+k+'\';wzSpeichern();wzZeichnen()">'+t+'</button>').join('')+'</div>'
    +(l.length?'<div class="kd-karten">'+l.map(a=>{ let pr=paPruefen(a), teile=paZahltAktiv(a).map(p=>{ let st=paStatus(a,p,pr);
        return '<span class="pa-chip pa-'+st.k+'">'+PA_ROLLEN[p.rolle]+': '+sEsc(st.t)+'</span>'; }).join('');
      let summe=paZahltAktiv(a).reduce((s,p)=>s+paBetrag(a,p).brutto,0);
      return '<div class="kd-karte"><div><b>'+sEsc(paObjektName(a))+'</b><span>'+sEsc(['Kaufvertrag '+(wzdDatum(a.vertragDatum)?wzDatum(a.vertragDatum):'–'),'Provision '+wzEur(summe)].join(' · '))+'</span>'
        +'<div class="pa-chips">'+teile+(pr.rot?'<span class="pa-chip pa-ueberfaellig">'+pr.rot+' Prüfpunkt'+(pr.rot===1?'':'e')+' rot</span>':'')+'</div></div>'
        +'<div class="kd-k"><button class="secondary" onclick="paOeffnen(\''+idSicher(a.id)+'\')">Öffnen</button></div></div>'; }).join('')+'</div>'
      :wzHinweis(alle.length?'Keine Abrechnung in dieser Auswahl.':'Noch keine Abrechnung. Nach dem Notartermin: „Neue Abrechnung“ oder aus dem Notarauftrag übernehmen.'))
    +wzBox('Angaben auf der Rechnung','<p class="hint" style="margin-top:0">Pflichtangaben des Rechnungsausstellers (§ 14 Abs. 4 Nr. 1 und 2 UStG) — bleiben auf diesem Gerät.</p><div class="grid">'
      +wzFeld('einst.aussteller','Rechnungsaussteller',{typ:'text',ph:'Name der Bank'})+wzFeld('einst.anschrift','Anschrift',{typ:'text',ph:'Straße, PLZ Ort'})
      +wzFeld('einst.steuernr','Steuernummer oder USt-IdNr.',{typ:'text'})+wzFeld('einst.bank','Bank',{typ:'text'})
      +wzFeld('einst.iban','IBAN',{typ:'text'})+wzFeld('einst.bic','BIC',{typ:'text'})
      +wzFeld('einst.ziel','Zahlungsziel',{typ:'zahl',einheit:'Tage'})+wzFeld('einst.ust','Umsatzsteuer',{typ:'prozent',einheit:'%',hinweis:'Regelsatz 19 % (§ 12 Abs. 1 UStG)'})
      +wzFeld('einst.praefix','Rechnungsnummern beginnen mit',{typ:'text',hinweis:'{jahr} wird zum Jahr; fortlaufend (§ 14 Abs. 4 Nr. 4 UStG) — oder die Nummer aus dem Buchungssystem eintragen'})
      +wzFeld('einst.leistung','Leistung auf der Rechnung',{typ:'lang',zeilen:2,voll:true,ph:PA_LEISTUNG,hinweis:'leer = Vorschlag; Platzhalter {objekt}, {datum} (Kaufvertrag), {kaufpreis}'})+'</div>',{klasse:'pa-einst'});
}
function paParteiHtml(a,p,i,pr){
  let b=paBetrag(a,p), st=paStatus(a,p,pr), z=paZielTag(a,p,pr), eRe=paERechnung(a,p);
  return wzBox(PA_ROLLEN[p.rolle],
    '<div class="grid">'+wzFeld('parteien.'+i+'.name','Rechnungsempfänger',{typ:'text',ph:'Name, bei mehreren „und“'})
      +wzFeld('parteien.'+i+'.anschrift','Anschrift',{typ:'text',ph:'Straße, PLZ Ort'})
      +wzFeld('parteien.'+i+'.maklervertrag','Maklervertrag mit dieser Seite',{typ:'check',zeichnen:true})
      +wzFeld('parteien.'+i+'.privat','Privatperson (kein Unternehmer)',{typ:'check',zeichnen:true})
      +wzFeld('parteien.'+i+'.art','Provision',{typ:'wahl',optionen:[['satz','Prozent vom Kaufpreis'],['fest','fester Betrag']],zeichnen:true})
      +(p.art==='fest'?wzFeld('parteien.'+i+'.betrag','Betrag',{typ:'betrag',einheit:'€ inkl. USt'}):wzFeld('parteien.'+i+'.satz','Satz',{typ:'prozent',einheit:'% inkl. USt'}))+'</div>'
    +'<div class="pa-summe" id="pa_betrag_'+i+'">'+paBetragText(b)+'</div>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="paKundeWaehlen('+i+')" data-ic="users">Aus der Kundenakte</button></div>'
    +'<h4 class="pa-unter">Rechnung und Zahlung</h4><div class="grid">'
      +wzFeld('parteien.'+i+'.rechnungNr','Rechnungsnummer',{typ:'text'})+wzFeld('parteien.'+i+'.rechnungDatum','Rechnungsdatum',{typ:'datum',zeichnen:true})
      +wzFeld('parteien.'+i+'.ziel','Zahlungsziel',{typ:'zahl',einheit:'Tage',ph:String(paEinst().ziel||'14')})
      +wzFeld('parteien.'+i+'.bezahltAm','Bezahlt am',{typ:'datum',zeichnen:true})+wzFeld('parteien.'+i+'.bezahltBetrag','Eingegangen',{typ:'betrag',einheit:'€'})+'</div>'
    +'<p class="pa-status pa-'+st.k+'" id="pa_status_'+i+'">'+sEsc(paStatusText(st,pr.grund[p.rolle]))+'</p>'
    +(eRe?wzAmpel('gelb',eRe):'')
    +'<div class="gr-zeile">'+(p.rechnungNr?'':'<button type="button" class="secondary" onclick="paNummerVergeben('+i+')" data-ic="plus">Nummer vergeben</button>')
      +'<button type="button" class="secondary" onclick="paRechnung('+i+')" data-ic="file-text">'+(paERechnungPflicht(a,p)?'Angaben für die E-Rechnung':'Rechnung')+'</button>'
      +'<button type="button" class="secondary" onclick="paZahlung('+i+')" data-ic="check">'+(wzdDatum(p.bezahltAm)?'Zahlung entfernen':'Zahlung heute erfasst')+'</button>'
      +(z&&!wzdDatum(p.bezahltAm)?'<button type="button" class="secondary" onclick="paWiedervorlage('+i+')" data-ic="clock">Wiedervorlage '+wzDatum(z)+'</button>':'')+'</div>',
    {klasse:'pa-partei'});
}
function paBetragText(b){ return 'netto '+nkGeld(b.netto)+' + Umsatzsteuer '+nkGeld(b.ust)+' = <b>'+nkGeld(b.brutto)+'</b>'; }
/* Rechnung an Unternehmer: E-Rechnung für Umsätze ab 2027 (Bank mit mehr als 800.000 € Umsatz), bis Ende 2026 noch Papier möglich */
function paERechnungPflicht(a,p){ if(p.privat!==false) return false; let l=wzdDatum(a.vertragDatum)||aufHeute(); return l>='2027-01-01'||aufHeute()>='2027-01-01'; }
function paERechnung(a,p){
  if(p.privat!==false) return '';
  return paERechnungPflicht(a,p)?'Empfänger ist Unternehmer: Die Rechnung muss eine E-Rechnung sein (§ 14 Abs. 2 Satz 2 Nr. 1 UStG) — über das Buchungssystem der Bank. Die Kachel gibt dafür die Angaben aus.'
    :'Empfänger ist Unternehmer: Für Leistungen bis Ende 2026 ist die Rechnung auf Papier noch erlaubt (§ 27 Abs. 38 UStG), ab 2027 nur als E-Rechnung über das Buchungssystem der Bank.';
}
function paEditor(a){
  let pr=paPruefen(a), notizen=pr.liste.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join('');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="paZurueck()" data-ic="arrow-left">Alle Abrechnungen</button>'
      +'<span class="ub-status">'+sEsc(paObjektName(a))+'</span><button type="button" class="secondary" onclick="paLoeschen()" data-ic="trash">Löschen</button></div>'
    +wzBox('Verkauf','<div class="grid"><div class="field"><label for="pa_objekt">Objekt aus den Bewertungen</label><select id="pa_objekt" onchange="paObjektWaehlen(this.value)">'
        +wzdObjektOptionen(a.projektId,'– frei eintragen –')+'</select></div>'
      +wzFeld('objekt','Bezeichnung',{typ:'text',ph:'z. B. Einfamilienhaus Musterweg 1',zeichnen:true})+wzFeld('anschrift','Anschrift des Objekts',{typ:'text'})
      +wzFeld('art','Art',{typ:'wahl',optionen:PA_ARTEN,zeichnen:true})+wzFeld('kaeuferVerbraucher','Käufer ist Verbraucher',{typ:'check',zeichnen:true})
      +wzFeld('kaufpreis','Kaufpreis',{typ:'betrag',einheit:'€'})+wzFeld('vertragDatum','Kaufvertrag beurkundet am',{typ:'datum',zeichnen:true})
      +wzFeld('bedingung','Kaufvertrag unter aufschiebender Bedingung',{typ:'check',zeichnen:true})
      +(a.bedingung?wzFeld('bedingungDatum','Bedingung eingetreten am',{typ:'datum',zeichnen:true}):'')+'</div>')
    +'<div class="wz-grid grid">'+a.parteien.map((p,i)=>paParteiHtml(a,p,i,pr)).join('')+'</div>'
    +wzBox('Prüfung','<div id="pa_pruefung">'+notizen+'</div>')
    +wzBox('Notiz',wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Nachweis der Zahlung an den Käufer geschickt'}));
}
function paZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='provision') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(typeof noLaden==='function'&&typeof NO!=='undefined'&&!NO.liste&&!PA.notarLaedt){ PA.notarLaedt=true; noLaden().then(()=>{ PA.notarLaedt=false; if(WZ.aktiv==='provision'&&!PA.aktiv) wzZeichnen(); }); }
  return PA.aktiv?paEditor(PA.aktiv):paListeHtml();
}
/* nach jeder Eingabe: Beträge, Status und Prüfung neu, ohne die Felder neu aufzubauen */
function paRechnen(){
  let a=PA.aktiv; iconify($('wz_body')); if(!a) return;
  let pr=paPruefen(a);
  a.parteien.forEach((p,i)=>{ wzH('pa_betrag_'+i,paBetragText(paBetrag(a,p))); let st=paStatus(a,p,pr), e=$('pa_status_'+i);
    if(e){ e.className='pa-status pa-'+st.k; e.textContent=paStatusText(st,pr.grund[p.rolle]); } });
  wzH('pa_pruefung',pr.liste.map(x=>wzAmpel(x.stufe,sEsc(x.text))).join(''));
}

/* ---------- Rechnung und Übersicht als Dokument ---------- */
function paFehlend(a,p){
  let E=paEinst(), f=[];
  if(!(E.aussteller||'').trim()||!(E.anschrift||'').trim()) f.push('Name und Anschrift des Rechnungsausstellers');
  if(!(E.steuernr||'').trim()) f.push('Steuernummer oder USt-IdNr.');
  if(!(p.name||'').trim()||!(p.anschrift||'').trim()) f.push('Name und Anschrift des Empfängers');
  if(!(p.rechnungNr||'').trim()) f.push('Rechnungsnummer');
  if(!wzdDatum(p.rechnungDatum)) f.push('Rechnungsdatum');
  if(!wzdDatum(a.vertragDatum)) f.push('Zeitpunkt der Leistung (Tag des Kaufvertrags)');
  if(!(paBetrag(a,p).brutto>0)) f.push('Betrag');
  return f;
}
function paRechnung(i){
  let a=PA.aktiv, p=a&&a.parteien[i]; if(!p) return;
  let f=paFehlend(a,p);
  if(f.length&&!confirm('Es fehlen Pflichtangaben (§ 14 Abs. 4 UStG):\n– '+f.join('\n– ')+'\n\nTrotzdem als Entwurf anzeigen?')) return;
  PA.dokRolle=p.rolle; wzDokument();
}
function paRechnungHtml(a,p){
  let E=paEinst(), b=paBetrag(a,p), pr=paPruefen(a), z=paZielTag(a,p,pr), entwurf=paFehlend(a,p).length>0, eRe=paERechnungPflicht(a,p);
  let andere=a.parteien.find(x=>x!==p), paragraph656d=!p.maklervertrag&&andere&&andere.maklervertrag&&wzdDatum(andere.bezahltAm)&&['efh','wohnung'].includes(a.art)&&a.kaeuferVerbraucher!==false;
  let satz=p.art==='fest'?'':' — '+String(wzN(p.satz)).replace('.',',')+' % inkl. Umsatzsteuer aus dem Kaufpreis';
  let kopf='<div class="pa-briefkopf"><div class="pa-absender">'+sEsc((E.aussteller||'').trim()||'[Rechnungsaussteller]')+' · '+sEsc((E.anschrift||'').trim()||'[Anschrift]')+'</div>'
    +'<div class="pa-empfaenger">'+sEsc((p.name||'').trim()||'[Empfänger]')+'<br>'+sEsc((p.anschrift||'').trim()||'[Anschrift]').replace(/,\s*/g,'<br>')+'</div>'
    +'<div class="pa-daten">'+wzDokTabelle([['Rechnungsnummer',sEsc(p.rechnungNr||'–')],['Rechnungsdatum',wzdDatum(p.rechnungDatum)?wzDatum(p.rechnungDatum):'–'],
      ['Steuernummer / USt-IdNr.',sEsc((E.steuernr||'').trim()||'–')],['Leistungsdatum',wzdDatum(a.vertragDatum)?wzDatum(a.vertragDatum)+' (Kaufvertrag)':'–']])+'</div></div>';
  if(eRe) return '<h1>Angaben für die E-Rechnung</h1><p class="wzd-unter">'+sEsc(paObjektName(a))+' · '+PA_ROLLEN[p.rolle]+' · Empfänger ist Unternehmer</p>'+kopf
    +wzDokTabelle([['Leistung',sEsc(paErsetzen(E.leistung||PA_LEISTUNG,a,p))+satz],['Entgelt netto',nkGeld(b.netto)],['Umsatzsteuer '+wzZ(paUst(),0)+' %',nkGeld(b.ust)],['Gesamtbetrag',nkGeld(b.brutto),{summe:true}],
      ['Zahlungsziel',z?wzDatum(z):'–']])
    +'<p class="wzd-klein">Rechnungen an Unternehmer sind als E-Rechnung im strukturierten Format auszustellen (§ 14 Abs. 1 und Abs. 2 Satz 2 Nr. 1 UStG). Diese Angaben sind die Vorlage für das Buchungssystem — selbst keine Rechnung.</p>';
  return (entwurf?'<p class="pa-entwurf">Entwurf — Pflichtangaben fehlen</p>':'')+kopf
    +'<h1>Rechnung</h1>'
    +wzDokTabelle([['Maklerprovision: '+sEsc(paErsetzen(E.leistung||PA_LEISTUNG,a,p))+satz,nkGeld(b.netto)],['zuzüglich Umsatzsteuer '+wzZ(paUst(),0)+' %',nkGeld(b.ust)],
      ['Gesamtbetrag',nkGeld(b.brutto),{summe:true}]])
    +(paragraph656d?'<p>Der '+PA_ROLLEN[andere.rolle]+' hat die auf ihn entfallende Provision am '+wzDatum(andere.bezahltAm)+' gezahlt (Nachweis nach § 656d Abs. 1 Satz 2 BGB).</p>':'')
    +'<p>Bitte überweisen Sie den Gesamtbetrag '+(z?'bis zum '+wzDatum(z):'innerhalb von '+(wzN(p.ziel||E.ziel)||14)+' Tagen')+' unter Angabe der Rechnungsnummer'
      +((E.iban||'').trim()?' auf das Konto IBAN '+sEsc(E.iban.trim())+((E.bic||'').trim()?', BIC '+sEsc(E.bic.trim()):'')+((E.bank||'').trim()?' ('+sEsc(E.bank.trim())+')':''):'')+'.</p>'
    +(p.privat!==false?'<p class="wzd-klein">Hinweis: Sind Sie Privatperson oder verwenden Sie die Leistung nicht für Ihr Unternehmen, sind Sie verpflichtet, diese Rechnung, einen Zahlungsbeleg oder eine andere beweiskräftige Unterlage zwei Jahre aufzubewahren (§ 14b Abs. 1 Satz 5 UStG).</p>':'');
}
function paUebersichtHtml(){
  let jahr=aufHeute().slice(0,4), z=[];
  wzdListe('abrechnungen').slice().sort((a,b)=>(a.vertragDatum||'').localeCompare(b.vertragDatum||'')).forEach(a=>{ let pr=paPruefen(a);
    paZahltAktiv(a).forEach(p=>{ let st=paStatus(a,p,pr), b=paBetrag(a,p);
      z.push([sEsc(paObjektName(a)),wzdDatum(a.vertragDatum)?wzDatum(a.vertragDatum):'–',PA_ROLLEN[p.rolle],sEsc(p.rechnungNr||'–'),nkGeld(b.brutto),sEsc(st.t)]); }); });
  return '<h1>Provisionen</h1><p class="wzd-unter">Abrechnungen und Zahlungseingang · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
    +(z.length?wzDokTabelle(z,['Objekt','Kaufvertrag','Seite','Rechnung','Betrag','Stand']):'<p>Noch keine Abrechnung.</p>')
    +'<p class="wzd-klein">Beträge inklusive Umsatzsteuer. Ohne Namen der Rechnungsempfänger; Jahr '+jahr+'.</p>';
}
function paDokument(){
  if(PA.dokRolle&&PA.aktiv){ let a=PA.aktiv, p=a.parteien.find(x=>x.rolle===PA.dokRolle); PA.dokRolle='';
    if(!p) return null;
    let eRe=paERechnungPflicht(a,p);
    return {titel:(eRe?'Angaben E-Rechnung ':'Rechnung ')+(p.rechnungNr||paObjektName(a)),html:paRechnungHtml(a,p),ohneFuss:!eRe,fuss:eRe?'Vorlage für das Buchungssystem.':''}; }
  PA.dokRolle='';
  return {titel:'Provisionen',html:paUebersichtHtml(),fuss:'Übersicht ohne Namen.'};
}

/* ---------- Kundenakte: Löschen und Auskunft ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const a of wzdListe('abrechnungen').filter(a=>(a.parteien||[]).some(p=>p.kundeId===id))){
    a.parteien.forEach(p=>{ if(p.kundeId===id){ p.kundeId=''; p.name='(Kunde gelöscht)'; p.anschrift=''; } });
    await wzdSpeichern('abrechnungen',a);
  }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=[]; wzdListe('abrechnungen').forEach(a=>(a.parteien||[]).filter(p=>p.kundeId===id).forEach(p=>l.push({a,p})));
  return ['','PROVISIONSABRECHNUNGEN'].concat(l.length?l.map(({a,p})=>'- '+paObjektName(a)+': '+PA_ROLLEN[p.rolle]+', Kaufvertrag '+(wzdDatum(a.vertragDatum)?wzDatum(a.vertragDatum):'–')
    +', '+eur(paBetrag(a,p).brutto)+(p.rechnungNr?', Rechnung '+p.rechnungNr:'')+(wzdDatum(p.bezahltAm)?', bezahlt am '+wzDatum(p.bezahltAm):'')+'; Rechnungsanschrift: '+(p.name||'')+(p.anschrift?', '+p.anschrift:'')):['- keine']);
});

wzRegistrieren({id:'provision',titel:'Provision',sub:'Abrechnung, Rechnung und Zahlungseingang je Verkauf',icon:'receipt',ohneNeu:true,
  zustand:()=>PA.aktiv||paS(),speichern:paSpeichern,zeichnen:paZeichnen,rechnen:paRechnen,dokument:paDokument,
  schliessen:()=>{ if(PA.aktiv) wzdSpeichernSofort('abrechnungen',PA.aktiv); PA.aktiv=null; PA.dokRolle=''; }});
