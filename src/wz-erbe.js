/* ---------- Kachel „Übergeben & Vererben“ (D38) ----------
   Schenkung heute (auch unter Vorbehalt von Nießbrauch oder Wohnrecht) oder Erbe: Steuer je Empfänger nach ErbStG,
   Vergleich mit dem späteren Erbfall. Rechnung in js/beratung.js (ImmoBeratung.uebertragung). Keine Namen. */
const ERB_OPT=Object.entries(ImmoBeratung.ERB_VERHAELTNIS).map(([k,v])=>[k,v.name]);
function erbStart(){
  return {art:'schenkung',wert:'',uebertragAnteil:'100',zweiSchenker:true,nutzung:'familienheim',wohnflaeche:'',
    empfaenger:[{verhaeltnis:'kind',anteil:'50',vorerwerb:'',vorsteuer:'',selbstnutzung:false},{verhaeltnis:'kind',anteil:'50',vorerwerb:'',vorsteuer:'',selbstnutzung:false}],
    vorbehalt:'niessbrauch',jahreswert:'',personen:[{alter:'',g:'m'},{alter:'',g:'w'}],zweiPersonen:true,vManuell:'',jahre:'',wachstum:'1,5'};
}
function erbEingabe(S,art){
  art=art||S.art;
  return {art,wert:wzN(S.wert,true),uebertragAnteil:wzN(S.uebertragAnteil)||100,zweiSchenker:art==='schenkung'&&!!S.zweiSchenker,nutzung:S.nutzung,
    wohnflaeche:wzN(S.wohnflaeche),
    empfaenger:(S.empfaenger||[]).map(r=>({verhaeltnis:r.verhaeltnis,anteil:wzN(r.anteil),vorerwerb:wzN(r.vorerwerb,true),vorsteuer:wzN(r.vorsteuer,true),selbstnutzung:!!r.selbstnutzung})),
    vorbehalt:S.vorbehalt,jahreswert:wzN(S.jahreswert,true),personen:erbPersonen(S),vManuell:wzN(S.vManuell)};
}
function erbPersonen(S){ return (S.personen||[]).slice(0,S.zweiPersonen?2:1).map(p=>({alter:wzN(p.alter),g:p.g==='m'?'m':'w'})).filter(p=>p.alter>0); }
/* Jahre bis zum Erbfall für den Vergleich: eingetragen, sonst Lebenserwartung (bei zwei Personen bis zum Letztversterbenden) */
function erbJahre(S){ let j=wzN(S.jahre); if(j>0) return j; let p=erbPersonen(S); return p.length?Math.round(ImmoBeratung.lebenserwartung(p)):0; }

function erbZeichnen(S){
  let schenkung=S.art==='schenkung';
  let personen=(S.personen||[]).slice(0,S.zweiPersonen?2:1).map((p,i)=>'<div class="wz-reihe wz-reihe-2">'
    +wzFeld('personen.'+i+'.alter',(schenkung?'Schenkende(r) ':'Person ')+(i+1)+': Alter',{typ:'zahl',einheit:'Jahre'})
    +wzFeld('personen.'+i+'.g','Geschlecht',{typ:'wahl',optionen:[['w','weiblich'],['m','männlich']]})+'</div>').join('');
  let empf=(S.empfaenger||[]).map((r,i)=>'<div class="wz-reihe wz-empf">'
    +wzFeld('empfaenger.'+i+'.verhaeltnis','Empfänger '+(i+1),{typ:'wahl',optionen:ERB_OPT})
    +wzFeld('empfaenger.'+i+'.anteil','Anteil',{typ:'prozent',einheit:'%'})
    +((S.empfaenger||[]).length>1?'<button type="button" class="weg" aria-label="Empfänger '+(i+1)+' entfernen" onclick="erbWeg('+i+')">✕</button>':'<span></span>')
    +wzFeld('empfaenger.'+i+'.vorerwerb','Schenkungen der letzten 10 Jahre',{typ:'betrag',einheit:'€'})
    +wzFeld('empfaenger.'+i+'.vorsteuer','dafür gezahlte Steuer',{typ:'betrag',einheit:'€'})
    +(!schenkung&&S.nutzung==='familienheim'?wzFeld('empfaenger.'+i+'.selbstnutzung','zieht ein und wohnt 10 Jahre selbst darin',{typ:'check'}):'')+'</div>').join('');
  return '<div class="wz-grid">'
    +'<div>'
    +wzBox('Immobilie','<div class="grid">'
      +wzFeld('wert','Wert der Immobilie',{typ:'betrag',einheit:'€',hinweis:'Verkehrswert als Näherung für den Steuerwert'})
      +wzFeld('uebertragAnteil','davon übertragen',{typ:'prozent',einheit:'%'})
      +wzFeld('nutzung','Nutzung',{typ:'wahl',zeichnen:true,optionen:[['familienheim','selbst bewohnt (Familienheim)'],['vermietet','zu Wohnzwecken vermietet'],['sonstig','sonstige Nutzung']]})
      +(S.nutzung==='familienheim'?wzFeld('wohnflaeche','Wohnfläche',{typ:'zahl',einheit:'m²'}):'')
      +'</div>')
    +wzBox('Übertragung','<div class="grid">'
      +wzFeld('art','Art',{typ:'wahl',zeichnen:true,optionen:[['schenkung','Schenkung zu Lebzeiten'],['erbe','Erbe (von Todes wegen)']]})
      +(schenkung?wzFeld('zweiSchenker','Ehepaar schenkt, beide je zur Hälfte Eigentümer (zwei Freibeträge je Empfänger)',{typ:'check',voll:true}):'')
      +'</div>'+empf+'<button type="button" class="plus" onclick="erbNeu()">＋ Empfänger</button><p class="hint" id="wz_erbe_anteile"></p>')
    +(schenkung?wzBox('Vorbehalt der Schenkenden','<div class="grid">'
      +wzFeld('vorbehalt','Recht',{typ:'wahl',zeichnen:true,optionen:[['keiner','kein Vorbehalt'],['niessbrauch','Nießbrauch (weiter wohnen oder vermieten)'],['wohnrecht','Wohnrecht']]})
      +(S.vorbehalt!=='keiner'?wzFeld('jahreswert','Jahreswert',{typ:'betrag',einheit:'€/Jahr',hinweis:S.vorbehalt==='niessbrauch'?'Jahresmiete (ortsüblich) abzüglich der Kosten, die die Schenkenden tragen':'Mietwert der genutzten Räume im Jahr'}):'')
      +(S.vorbehalt!=='keiner'?wzFeld('vManuell','Vervielfältiger laut BMF-Tabelle',{typ:'zahl',hinweis:'leer = aus der Sterbetafel berechnet'}):'')
      +'</div>'):'')
    +wzBox(schenkung?'Schenkende / Berechtigte':'Für den Vergleich','<div class="grid">'+wzFeld('zweiPersonen','zwei Personen (Recht erlischt mit dem Tod des Letztversterbenden)',{typ:'check',voll:true,zeichnen:true})+'</div>'+personen
      +(schenkung?'<div class="grid">'+wzFeld('jahre','Jahre bis zum Erbfall',{typ:'zahl',ph:'Lebenserwartung',hinweis:'leer = Lebenserwartung nach Sterbetafel'})
        +wzFeld('wachstum','Wertsteigerung bis dahin',{typ:'prozent',einheit:'% im Jahr (Annahme)'})+'</div>':''))
    +'</div>'
    +'<div>'
    +wzBox('Ergebnis','<div id="wz_erbe_ergebnis"></div>',{klasse:'wz-ergebnis'})
    +(schenkung?wzBox('Schenkung heute oder Erbe später?','<div id="wz_erbe_vergleich"></div>'):'')
    +wzBox('Hinweise','<ul class="wz-liste">'+erbHinweise(S).map(h=>'<li>'+h+'</li>').join('')+'</ul>')
    +'</div></div>';
}
function erbHinweise(S){
  return ['Orientierungsrechnung mit den gesetzlichen Tarifen zur Vorbereitung des Gesprächs mit Steuerberatung und Notar — keine Hilfeleistung in Steuersachen (§ 5 StBerG). Die konkrete Gestaltung gehört zu Steuerberatung und Notar.',
    'Das Finanzamt bewertet nach §§ 176 ff. BewG; ist der Verkehrswert nachweislich niedriger (Gutachten), gilt dieser (§ 198 BewG).',
    'Freibeträge (§ 16 ErbStG) gelten je Schenker und Empfänger und alle 10 Jahre neu; frühere Schenkungen innerhalb von 10 Jahren werden zusammengerechnet. Die Steuer auf den neuen Erwerb allein ist dabei die Untergrenze (§ 14 Abs. 1 Satz 4 ErbStG).',
    'Nießbrauch und Wohnrecht: Kapitalwert = Jahreswert × Vervielfältiger (§ 14 Abs. 1 BewG, 5,5 %, Sterbetafel), Jahreswert höchstens Wert / 18,6 (§ 16 BewG). Endet das Recht durch frühen Tod, wird auf Antrag berichtigt (§ 14 Abs. 2 BewG). Die App rechnet nach diesem Verfahren mit der Sterbetafel '+(window.ImmoSterbetafel?ImmoSterbetafel.zeitraum:'')+'; das Finanzamt nimmt die BMF-Tabelle des Bewertungsjahres (Stichtage 2026: BMF-Schreiben vom 21.10.2025, Sterbetafel 2022/2024) — den Tabellenwert eintragen.',
    'Familienheim: Schenkung an den Ehegatten steuerfrei (§ 13 Abs. 1 Nr. 4a). Beim Erbe steuerfrei für den Ehegatten (4b) und für Kinder bis 200 m² Wohnfläche (4c) — nur, wenn der Erblasser selbst darin gewohnt hat und der Erbe unverzüglich einzieht und 10 Jahre selbst wohnt; sonst entfällt die Befreiung rückwirkend.',
    'Zu Wohnzwecken vermietet: 10 % des Werts steuerfrei (§ 13d ErbStG). Versorgungsfreibetrag beim Erbe (§ 17 ErbStG) ist hier nicht berücksichtigt.',
    'Grunderwerbsteuer: Schenkung und Erbe sind befreit (§ 3 Nr. 2 GrEStG), zwischen Ehegatten und Verwandten in gerader Linie auch ein entgeltlicher Teil (§ 3 Nr. 4 und 6 GrEStG).'];
}
function erbNeu(){ let S=wzZustand('erbe'); S.empfaenger.push({verhaeltnis:'kind',anteil:'',vorerwerb:'',vorsteuer:'',selbstnutzung:false}); wzSpeichern(); wzZeichnen(); }
function erbWeg(i){ let S=wzZustand('erbe'); S.empfaenger.splice(i,1); wzSpeichern(); wzZeichnen(); }

function erbTabelle(r){
  /* je Empfänger eine Karte — lesbar auch in der schmalen Ergebnisspalte und am Handy */
  let z=(t,w,k)=>'<div class="row-calc'+(k?' '+k:'')+'"><span>'+t+'</span><b>'+w+'</b></div>';
  return r.empfaenger.map(e=>{
    let fb=e.freibetrag*e.schenker, pflichtig=e.teile.reduce((a,t)=>a+t.steuerpflichtig,0), saetze=[...new Set(e.teile.filter(t=>t.steuerpflichtig>0).map(t=>wzP(t.satz,0)))].join(' / ');
    return '<div class="wz-karte"><div class="wz-karte-kopf"><b>'+sEsc(e.name)+'</b><span>'+wzP(e.anteil*100,0)+' · Steuerklasse '+['','I','II','III'][e.klasse]+(e.schenker>1?' · von beiden Eltern':'')+'</span></div>'
      +z('Wert des Anteils',wzEur(e.wert))+(e.kapitalwert>0?z('− '+(r.vorbehalt==='niessbrauch'?'Nießbrauch':'Wohnrecht'),wzEur(e.kapitalwert)):'')
      +(e.familienheimFrei>0?z('steuerfrei (Familienheim)',wzP(e.familienheimFrei*100,0)):'')+(e.vermietet13d?z('steuerfrei (§ 13d)','10 %'):'')
      +z('Bereicherung',wzEur(e.bereicherung))+z('Freibetrag'+(e.schenker>1?' (2 × '+wzEur(e.freibetrag)+')':''),wzEur(fb))
      +z('steuerpflichtig'+(saetze?' ('+saetze+')':''),wzEur(pflichtig))+(e.teile.some(t=>t.mindestGreift)?z('Mindeststeuer (§ 14 Abs. 1 Satz 4)','greift'):'')+z('Steuer',wzEur(e.steuer),'wz-summe')+'</div>';
  }).join('')+'<div class="subtotal"><span>Steuer zusammen</span><span>'+wzEur(r.steuer)+'</span></div>';
}
function erbRechnen(S){
  let E=erbEingabe(S), r=ImmoBeratung.uebertragung(E);
  let summe=(S.empfaenger||[]).reduce((a,x)=>a+wzN(x.anteil),0);
  wzT('wz_erbe_anteile',Math.abs(summe-100)>0.01&&summe>0?'Die Anteile ergeben zusammen '+wzZ(summe,0)+' % — gerechnet wird mit den eingetragenen Anteilen.':'');
  if(!(E.wert>0)){ wzH('wz_erbe_ergebnis','<p class="hint" style="margin:0">Wert der Immobilie eintragen (oder „Aus Bewertung“).</p>'); wzH('wz_erbe_vergleich',''); return; }
  let recht=r.recht?'<div class="row-calc"><span>'+(r.vorbehalt==='niessbrauch'?'Nießbrauch':'Wohnrecht')+': Jahreswert '+wzEur(r.recht.jahreswert)+(r.recht.begrenzt?' (begrenzt auf Wert / 18,6)':'')+' × Vervielfältiger '+wzZ(r.recht.vervielfaeltiger,3)+'</span><b>'+wzEur(r.recht.kapitalwert)+'</b></div>'
    +(r.recht.vervielfaeltiger>0?'':'<p class="hint">Alter der Berechtigten eintragen — ohne Alter kein Abzug.</p>'):'';
  wzH('wz_erbe_ergebnis',(r.art==='schenkung'?'<div class="row-calc"><span>Übertragen</span><b>'+wzEur(r.wert)+'</b></div>':'')+recht+erbTabelle(r)
    +(r.steuer===0?'<p class="hint wz-gut">Keine Steuer — die Freibeträge reichen.</p>':''));
  if(r.art==='schenkung') erbVergleich(S,r);
}
function erbVergleich(S,r){
  let n=erbJahre(S), g=wzN(S.wachstum)/100;
  if(!(n>0)){ wzH('wz_erbe_vergleich','<p class="hint" style="margin:0">Alter der Schenkenden oder Jahre bis zum Erbfall eintragen.</p>'); return; }
  let E=erbEingabe(S,'erbe'); E.wert=E.wert*Math.pow(1+g,n); E.zweiSchenker=false;
  let b=ImmoBeratung.uebertragung(E);
  let ab=new Date(); ab.setFullYear(ab.getFullYear()+10);
  let mal=1+Math.floor(n/10);
  wzH('wz_erbe_vergleich','<div class="wz-vergleich"><div><span>Schenkung heute</span><b>'+wzEur(r.steuer)+'</b><small>Steuer zusammen</small></div>'
    +'<div><span>Erbe in '+wzZ(n,0)+' Jahren</span><b>'+wzEur(b.steuer)+'</b><small>Wert dann '+wzEur(b.wert)+(S.zweiSchenker?' · Erbe vom Letztversterbenden: ein Freibetrag je Empfänger':'')+'</small></div></div>'
    +'<p class="hint">Die Freibeträge sind ab '+ab.toLocaleDateString('de-DE')+' wieder frei. Bis zum angenommenen Erbfall lassen sie sich '+mal+'-mal nutzen'
    +(mal>1?' — eine Übertragung in Teilen über mehrere Zehnjahreszeiträume spart dann Steuer.':'.')+'</p>');
}
function erbKundeText(S){
  let E=erbEingabe(S), r=ImmoBeratung.uebertragung(E); if(!(E.wert>0)) { alert('Bitte zuerst den Wert der Immobilie eintragen.'); return ''; }
  let z=['Orientierungsrechnung '+(r.art==='schenkung'?'Schenkung':'Erbe')+': Wert '+wzEur(r.wert)+(r.recht?', '+(r.vorbehalt==='niessbrauch'?'Nießbrauch':'Wohnrecht')+' Kapitalwert '+wzEur(r.recht.kapitalwert):'')+'.'];
  r.empfaenger.forEach(e=>z.push(e.name+' '+wzP(e.anteil*100,0)+': Steuer '+wzEur(e.steuer)+'.'));
  z.push('Steuer zusammen '+wzEur(r.steuer)+'.');
  if(r.art==='schenkung'){ let n=erbJahre(S); if(n>0){ let E2=erbEingabe(S,'erbe'); E2.wert*=Math.pow(1+wzN(S.wachstum)/100,n); E2.zweiSchenker=false; z.push('Vergleich Erbe in '+wzZ(n,0)+' Jahren: '+wzEur(ImmoBeratung.uebertragung(E2).steuer)+'.'); } }
  return z.join(' ');
}
function erbDokument(S){
  let E=erbEingabe(S), r=ImmoBeratung.uebertragung(E); if(!(E.wert>0)){ alert('Bitte zuerst den Wert der Immobilie eintragen.'); return null; }
  let teil=r.empfaenger.map(e=>{ let fb=e.freibetrag*e.schenker, pflichtig=e.teile.reduce((a,t)=>a+t.steuerpflichtig,0);
    return '<h3>'+sEsc(e.name)+' — Anteil '+wzP(e.anteil*100,0)+'</h3>'+wzDokTabelle([
      ['Wert des Anteils',wzEur(e.wert)],e.kapitalwert>0?['− Kapitalwert '+(r.vorbehalt==='niessbrauch'?'Nießbrauch':'Wohnrecht'),wzEur(e.kapitalwert)]:null,
      e.familienheimFrei>0?['steuerfrei: '+sEsc(e.familienheimNorm),wzP(e.familienheimFrei*100,0)]:null,e.vermietet13d?['steuerfrei nach § 13d ErbStG','10 %']:null,
      ['Bereicherung',wzEur(e.bereicherung)],['Freibetrag (Steuerklasse '+['','I','II','III'][e.klasse]+(e.schenker>1?', je Elternteil':'')+')',wzEur(fb)],
      ['steuerpflichtiger Erwerb',wzEur(pflichtig)],['Steuer',wzEur(e.steuer),{summe:true}]]); }).join('');
  let n=r.art==='schenkung'?erbJahre(S):0, vgl='';
  if(n>0){ let E2=erbEingabe(S,'erbe'); E2.wert*=Math.pow(1+wzN(S.wachstum)/100,n); E2.zweiSchenker=false; let b=ImmoBeratung.uebertragung(E2);
    vgl='<h2>Vergleich: Schenkung heute oder Erbe später</h2>'+wzDokTabelle([['Schenkung heute: Steuer zusammen',wzEur(r.steuer)],['Erbe in '+wzZ(n,0)+' Jahren (Wert dann '+wzEur(b.wert)+'): Steuer zusammen',wzEur(b.steuer)]]); }
  return {titel:'Übergeben und Vererben '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Übergeben und Vererben</h1><p class="wzd-unter">Orientierungsrechnung zur Erbschaft- und Schenkungsteuer</p>'
      +'<h2>Ausgangslage</h2>'+wzDokTabelle([['Wert der Immobilie',wzEur(E.wert)],['davon übertragen',wzP(E.uebertragAnteil>1?E.uebertragAnteil:E.uebertragAnteil*100,0)],
        ['Art',r.art==='schenkung'?'Schenkung zu Lebzeiten'+(r.schenker>1?' durch beide Eheleute (je zur Hälfte)':''):'Erbe'],
        ['Nutzung',{familienheim:'selbst bewohnt (Familienheim)',vermietet:'zu Wohnzwecken vermietet',sonstig:'sonstige Nutzung'}[E.nutzung]||''],
        r.recht?[(r.vorbehalt==='niessbrauch'?'Nießbrauch':'Wohnrecht')+': Jahreswert × Vervielfältiger',wzEur(r.recht.jahreswert)+' × '+wzZ(r.recht.vervielfaeltiger,3)+' = '+wzEur(r.recht.kapitalwert)]:null])
      +'<h2>Steuer je Empfänger</h2>'+teil+'<p><b>Steuer zusammen: '+wzEur(r.steuer)+'</b></p>'+vgl
      +'<h2>Hinweise</h2><ul>'+erbHinweise(S).map(h=>'<li>'+h+'</li>').join('')+'</ul>',
    fuss:'Orientierungsrechnung mit den gesetzlichen Tarifen (ErbStG, BewG) zur Vorbereitung des Gesprächs mit Steuerberatung und Notar; keine Hilfeleistung in Steuersachen.'};
}
function erbAusBewertung(S){
  let R=wzBewertung(); S.wert=String(Math.round(R.empfehlung));
  let wf=num('ek_wohnflaeche'); if(wf>0) S.wohnflaeche=String(wf).replace('.',',');
  if(!wzN(S.jahreswert,true)&&R.roh>0) S.jahreswert=String(Math.round(R.roh));
}
wzRegistrieren({id:'erbe',titel:'Übergeben & Vererben',sub:'Schenkung oder Erbe · Nießbrauch · Freibeträge',icon:'gift',start:erbStart,zeichnen:erbZeichnen,rechnen:erbRechnen,
  dokument:erbDokument,kundeText:erbKundeText,ausBewertung:erbAusBewertung});
