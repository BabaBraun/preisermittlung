/* ---------- Kachel „Vorlagen“ (D40) ----------
   Schreiben und E-Mails aus Textbausteinen: Empfänger aus der Kundenakte, Objekt aus den gesicherten Bewertungen, Termin
   aus dem Kalender, Absender aus dem Ansprechpartner des Exposés. Platzhalter wie {anrede_brief} oder {objekt_titel};
   [[ … ]] entfällt, wenn ein Platzhalter darin leer ist (js/beratung.js, vorlageFuellen). Der fertige Text lässt sich
   vor dem Versand ändern, kopieren, als E-Mail im Mailprogramm öffnen, als Word-Datei speichern und als Notiz in der
   Kundenakte ablegen. Die App versendet selbst nichts. Eigene Vorlagen liegen in den Eingaben der Werkzeuge (ohne Namen). */
var VL={text:'',betreff:'',schluessel:''};
const VL_KATEGORIEN=['Interessenten','Eigentümer','Abschluss','Eigene'];
const VL_GRUSS='\n\nMit freundlichen Grüßen\n{berater_name}\n[[{berater_funktion}\n]][[{firma}\n]][[Telefon {berater_telefon}\n]][[{berater_email}]]';
const VL_STANDARD=[
  {id:'expose',kategorie:'Interessenten',titel:'Exposé senden',betreff:'Exposé: {objekt_titel}',
    hinweis:'Belehrung über das Widerrufsrecht und die Hinweise der Bank zum Maklervertrag beifügen.',
    text:'{anrede_brief}\n\nvielen Dank für Ihr Interesse an {objekt_titel}. Gern sende ich Ihnen das Exposé mit allen Angaben zum Objekt.\n\nAngebotspreis: {preis}\n[[Käuferprovision: {provision}\n]]\nWenn Ihnen das Objekt gefällt, vereinbaren wir gern einen Besichtigungstermin.'+VL_GRUSS},
  {id:'besichtigung',kategorie:'Interessenten',titel:'Besichtigung bestätigen',betreff:'Ihr Besichtigungstermin am {termin_datum}',
    text:'{anrede_brief}\n\nhiermit bestätige ich Ihren Besichtigungstermin:\n\n{termin_wochentag}, {termin_datum}[[ um {termin_uhrzeit} Uhr]]\n[[Treffpunkt: {termin_ort}\n]][[Objekt: {objekt_titel}\n]]\nSollte Ihnen der Termin nicht passen, geben Sie mir bitte kurz Bescheid.'+VL_GRUSS},
  {id:'nachfrage',kategorie:'Interessenten',titel:'Nach der Besichtigung',betreff:'Ihre Besichtigung: {objekt_titel}',
    text:'{anrede_brief}\n\nvielen Dank, dass Sie sich {objekt_titel} angesehen haben. Wie hat Ihnen das Objekt gefallen? Über eine kurze Rückmeldung freue ich mich — gern auch zu Fragen rund um die Finanzierung.'+VL_GRUSS},
  {id:'reserviert',kategorie:'Interessenten',titel:'Objekt reserviert',betreff:'{objekt_titel} ist reserviert',
    text:'{anrede_brief}\n\nvielen Dank für Ihr Interesse an {objekt_titel}. Das Objekt ist inzwischen reserviert. Sollte sich daran etwas ändern, melde ich mich gern bei Ihnen.\n\nWenn Sie möchten, informiere ich Sie über vergleichbare Angebote — dafür brauche ich Ihr kurzes Einverständnis.'+VL_GRUSS},
  {id:'unterlagen',kategorie:'Eigentümer',titel:'Unterlagen anfordern',betreff:'Unterlagen für den Verkauf: {objekt_titel}',
    text:'{anrede_brief}\n\nfür die Vermarktung von {objekt_titel} benötige ich noch folgende Unterlagen, soweit vorhanden:\n\n• Energieausweis\n• Grundrisse und Wohnflächenberechnung\n• Baupläne und Baubeschreibung\n• Auskunft aus dem Baulastenverzeichnis\n• Nachweise über Modernisierungen\n• bei Wohnungseigentum: Teilungserklärung, Protokolle der letzten drei Eigentümerversammlungen, Wirtschaftsplan und letzte Hausgeldabrechnung\n\nGern hole ich einzelne Unterlagen mit Ihrer Vollmacht selbst ein.'+VL_GRUSS},
  {id:'stand',kategorie:'Eigentümer',titel:'Stand der Vermarktung',betreff:'Stand der Vermarktung: {objekt_titel}',
    text:'{anrede_brief}\n\nhier der aktuelle Stand zu {objekt_titel}:\n\n[[Am Markt seit {vm_tage} Tagen\n]]Anfragen: {vm_anfragen}\nBesichtigungen: {vm_besichtigungen}\nKaufangebote: {vm_angebote}\n\nGern bespreche ich mit Ihnen die nächsten Schritte.'+VL_GRUSS},
  {id:'akquise',kategorie:'Eigentümer',titel:'Nach dem Erstkontakt',betreff:'Ihre Immobilie[[ in {objekt_ort}]]',
    text:'{anrede_brief}\n\nvielen Dank für das freundliche Gespräch. Wie besprochen biete ich Ihnen an, den Wert Ihrer Immobilie einzuschätzen und Ihnen den Ablauf eines Verkaufs zu erläutern — unverbindlich und vertraulich.\n\nFür einen Termin vor Ort erreichen Sie mich jederzeit.'+VL_GRUSS},
  {id:'bewertung',kategorie:'Eigentümer',titel:'Termin zur Wertermittlung',betreff:'Unser Termin am {termin_datum}',
    text:'{anrede_brief}\n\nhiermit bestätige ich unseren Termin zur Wertermittlung:\n\n{termin_wochentag}, {termin_datum}[[ um {termin_uhrzeit} Uhr]]\n[[Ort: {termin_ort}\n]]\nHilfreich sind, soweit vorhanden: Grundbuchauszug, Grundrisse, Wohnflächenberechnung, Energieausweis und Belege über Modernisierungen.'+VL_GRUSS},
  {id:'notar',kategorie:'Abschluss',titel:'Notartermin',betreff:'Notartermin am {termin_datum}',
    text:'{anrede_brief}\n\nder Termin zur Beurkundung des Kaufvertrags für {objekt_titel} steht:\n\n{termin_wochentag}, {termin_datum}[[ um {termin_uhrzeit} Uhr]]\n[[Ort: {termin_ort}\n]]\nBitte bringen Sie einen gültigen Personalausweis oder Reisepass mit. Den Vertragsentwurf erhalten Sie vorab vom Notariat.'+VL_GRUSS},
  {id:'glueckwunsch',kategorie:'Abschluss',titel:'Glückwunsch zum Kauf',betreff:'Herzlichen Glückwunsch!',
    text:'{anrede_brief}\n\nherzlichen Glückwunsch zum Erwerb von {objekt_titel}! Vielen Dank für Ihr Vertrauen.\n\nZur Übergabe melde ich mich rechtzeitig mit einem Termin. Bei Fragen rund um Finanzierung, Versicherung oder Modernisierung bin ich gern für Sie da.'+VL_GRUSS}
];
const VL_PLATZHALTER=[['anrede_brief','Briefanrede'],['vorname','Vorname'],['nachname','Nachname'],['objekt_titel','Objekt (Titel)'],['objekt_anschrift','Anschrift des Objekts'],
  ['objekt_ort','Ort des Objekts'],['preis','Angebotspreis'],['provision','Käuferprovision'],['wohnflaeche','Wohnfläche'],['termin_datum','Termin: Datum'],['termin_wochentag','Termin: Wochentag'],
  ['termin_uhrzeit','Termin: Uhrzeit'],['termin_ort','Termin: Ort'],['vm_tage','Tage am Markt'],['vm_anfragen','Anfragen'],['vm_besichtigungen','Besichtigungen'],['vm_angebote','Kaufangebote'],
  ['berater_name','Berater: Name'],['berater_funktion','Berater: Funktion'],['berater_telefon','Berater: Telefon'],['berater_email','Berater: E-Mail'],['firma','Firma'],['heute','Datum heute']];
function vlStart(){ return {eigene:[],wahl:{vorlage:'expose',kundeId:'',projektId:'',terminId:''}}; }
function vlS(){ let S=wzZustand('vorlagen'); if(!Array.isArray(S.eigene)) S.eigene=[]; if(!S.wahl||typeof S.wahl!=='object') S.wahl={vorlage:'expose',kundeId:'',projektId:'',terminId:''}; return S; }
function vlAlle(){ return VL_STANDARD.concat(vlS().eigene.map(v=>Object.assign({kategorie:'Eigene'},v,{eigen:true}))); }
function vlVorlage(){ let S=vlS(); return vlAlle().find(v=>v.id===S.wahl.vorlage)||VL_STANDARD[0]; }
/* von außen: Vorlage mit Empfänger, Objekt und Termin öffnen */
function vlOeffnenMit(w){
  w=w||{}; let S=vlS();
  Object.assign(S.wahl,{vorlage:w.vorlage||S.wahl.vorlage,kundeId:w.kundeId||'',projektId:w.projektId||'',terminId:w.terminId||''});
  wzSpeichernJetzt(); VL.schluessel=''; wzOeffnen('vorlagen');
}
/* Werte für die Platzhalter */
function vlWerte(w){
  let k=wzdKunde(w.kundeId)||{}, o=wzdObjekt(w.projektId), f=o?o.f:{}, t=w.terminId?wzdListe('termine').find(x=>x.id===w.terminId):null;
  let ber=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}, pk=(wzAlle().portal||{}).kontakt||{};
  let titel=o?(f.ex_titel||(window.ImmoPortal?ImmoPortal.objekt(f,{projektId:o.id}).texte.titel:o.name)):'';
  let ort=o&&window.ImmoPortal?ImmoPortal.anschrift(f.ek_anschrift).ort:'', vm={};
  if(o){ try{ let x=wzdVermarktung(o); vm={vm_tage:x.tage?String(x.tage):'',vm_anfragen:String(x.gesamt.anfragen),vm_besichtigungen:String(x.gesamt.besicht),vm_angebote:String(x.gesamt.angebote)}; }catch(e){} }   // D48: alle Quellen
  let td=t&&wzdDatum(t.datum);
  return Object.assign({anrede_brief:ImmoBeratung.briefAnrede(k),vorname:k.vorname||'',nachname:k.nachname||'',
    objekt_titel:titel,objekt_anschrift:o?o.anschrift:'',objekt_ort:ort,preis:o?(o.preis>0?eur(o.preis):'auf Anfrage'):'',provision:f.ex_provision||'',
    wohnflaeche:zahlLesen(f.ek_wohnflaeche,true)>0?zahlLesen(f.ek_wohnflaeche,true).toLocaleString('de-DE')+' m²':'',
    termin_datum:td?new Date(td+'T00:00:00').toLocaleDateString('de-DE'):'',termin_wochentag:td?new Date(td+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long'}):'',
    termin_uhrzeit:t?wzdZeit(t.von):'',termin_ort:t?(t.ort||''):'',
    berater_name:ber.name||pk.name||'',berater_funktion:ber.funktion||pk.funktion||'',berater_telefon:ber.tel||pk.tel||'',berater_email:ber.mail||pk.mail||'',
    firma:ber.firma||((wzAlle().portal||{}).anbieter||{}).firma||'',heute:new Date().toLocaleDateString('de-DE')},vm);
}
function vlFuellen(){
  let S=vlS(), v=vlVorlage(), werte=vlWerte(S.wahl);
  return {v,betreff:ImmoBeratung.vorlageFuellen(v.betreff||'',werte),text:ImmoBeratung.vorlageFuellen(v.text||'',werte)};
}
/* der Text im Feld gehört dem Nutzer, bis Vorlage, Empfänger, Objekt oder Termin wechseln */
function vlSchluessel(){ let w=vlS().wahl, v=vlVorlage(); return [w.vorlage,w.kundeId,w.projektId,w.terminId,v.text,v.betreff].join('|'); }
function vlWahl(k,wert){ vlS().wahl[k]=wert; wzSpeichern(); wzZeichnen(); }
function vlKunde(){ wzdKundeWaehlen(id=>{ vlWahl('kundeId',id); }); }
function vlFehltText(f){
  let namen=Object.fromEntries(VL_PLATZHALTER);
  return f.length?'Noch leer: '+f.map(x=>namen[x]||x).join(', ')+'.':'';
}
function vlZeichnen(S){
  S=vlS(); let w=S.wahl, F=vlFuellen(), schl=vlSchluessel();
  if(VL.schluessel!==schl){ VL.schluessel=schl; VL.text=F.text.text; VL.betreff=F.betreff.text; }
  let fehlt=[...new Set(F.betreff.fehlt.concat(F.text.fehlt))], k=wzdKunde(w.kundeId);
  let termine=wzdListe('termine').filter(t=>wzdDatum(t.datum)>=ImmoBeratung.tagePlus(aufHeute(),-7)).sort((a,b)=>a.datum.localeCompare(b.datum));
  let liste=VL_KATEGORIEN.map(kat=>{ let l=vlAlle().filter(v=>v.kategorie===kat); return l.length?'<div class="vl-gruppe"><h4>'+kat+'</h4>'
    +l.map(v=>'<button type="button" class="vl-vorlage'+(v.id===w.vorlage?' on':'')+'" aria-pressed="'+(v.id===w.vorlage)+'" onclick="vlWahl(\'vorlage\',\''+idSicher(v.id)+'\')">'+sEsc(v.titel)+'</button>').join('')+'</div>':''; }).join('');
  return '<div class="vl-raster"><div class="vl-liste">'+liste+'<button type="button" class="plus" onclick="vlEigeneNeu()">＋ Eigene Vorlage</button></div><div class="vl-arbeit">'
    +wzBox('Für','<div class="grid">'
      +'<div class="field"><label>Empfänger</label><div class="vl-empf">'+(k?'<b>'+sEsc(kdName(k))+'</b><small>'+sEsc(k.email||'keine E-Mail in der Akte')+'</small>':'<span class="hint" style="margin:0">noch niemand</span>')
        +'<button type="button" class="secondary" onclick="vlKunde()">'+(k?'Ändern':'Aus der Kundenakte')+'</button></div></div>'
      +'<div class="field"><label for="vl_objekt">Objekt</label><select id="vl_objekt" onchange="vlWahl(\'projektId\',this.value)">'+wzdObjektOptionen(w.projektId)+'</select></div>'
      +'<div class="field"><label for="vl_termin">Termin</label><select id="vl_termin" onchange="vlWahl(\'terminId\',this.value)"><option value="">– kein Termin –</option>'
        +termine.map(t=>'<option value="'+sEsc(t.id)+'"'+(t.id===w.terminId?' selected':'')+'>'+sEsc(wzDatum(t.datum)+(t.von?' '+t.von:'')+' · '+(t.art||'')+(t.titel?': '+t.titel:''))+'</option>').join('')+'</select></div></div>')
    +wzBox('Text','<div class="field"><label for="vl_betreff">Betreff</label><input id="vl_betreff" value="'+sEsc(VL.betreff)+'" oninput="VL.betreff=this.value"></div>'
      +'<div class="field" style="margin-top:8px"><label for="vl_text">Nachricht</label><textarea id="vl_text" rows="16" oninput="VL.text=this.value">'+sEsc(VL.text)+'</textarea></div>'+vlPflichtHinweis()
      +(fehlt.length?wzAmpel('gelb',sEsc(vlFehltText(fehlt))+' Empfänger, Objekt oder Termin wählen — Absender kommt aus dem Ansprechpartner des Exposés.'):'')
      +(F.v.hinweis?wzAmpel('gelb',sEsc(F.v.hinweis)):'')
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="vlMail()" data-ic="upload">Als E-Mail öffnen</button>'
      +'<button type="button" class="secondary" onclick="vlKopieren()" data-ic="clipboard">Kopieren</button>'
      +'<button type="button" class="secondary" onclick="vlWord()" data-ic="file-text">Word</button>'
      +'<button type="button" class="secondary" onclick="vlAblegen()" data-ic="users">In der Kundenakte vermerken</button>'
      +'<button type="button" class="secondary" onclick="VL.schluessel=\'\';wzZeichnen()">Text neu aus der Vorlage</button></div>')
    +(F.v.eigen?vlEigeneEditor(F.v):'<p class="hint">Standardvorlage — „Als eigene Vorlage bearbeiten“ legt eine änderbare Kopie an. <a href="#" onclick="vlEigeneKopie();return false;">Als eigene Vorlage bearbeiten</a></p>')
    +'</div></div>';
}
/* ---------- Ausgaben ---------- */
/* Pflichtangaben der Genossenschaft unter jedes Schreiben (§ 25a Abs. 1 GenG, D48) */
function vlMitPflicht(t,mail){ return typeof wzMitPflicht==='function'?wzMitPflicht(t,{mail:!!mail}):String(t||''); }
function vlPflichtHinweis(){ if(typeof wzPflichtFehlt!=='function') return ''; let f=wzPflichtFehlt();
  return f.length?wzAmpel('gelb','Pflichtangaben der Bank fehlen ('+sEsc(f.join(', '))+') — Mehr → Absender und Pflichtangaben (§ 25a GenG).')
    :wzHinweis('Unter E-Mail, Word und Dokument setzt die App die Pflichtangaben der Bank (§ 25a GenG).'); }
function vlKopieren(){
  let t=(VL.betreff?'Betreff: '+VL.betreff+'\n\n':'')+vlMitPflicht(VL.text,true);
  try{ navigator.clipboard.writeText(t).then(()=>{ iaHinweis('Text kopiert'); setTimeout(()=>iaHinweis(''),1800); },()=>alert('Kopieren nicht möglich — bitte im Textfeld markieren und kopieren.')); }
  catch(e){ alert('Kopieren nicht möglich — bitte im Textfeld markieren und kopieren.'); }
}
function vlMailLink(){
  let k=wzdKunde(vlS().wahl.kundeId);
  return 'mailto:'+encodeURIComponent(k&&k.email||'')+'?subject='+encodeURIComponent(VL.betreff||'')+'&body='+encodeURIComponent(vlMitPflicht(VL.text||'',true));
}
function vlMail(){
  let k=wzdKunde(vlS().wahl.kundeId);
  if(k&&!k.email&&!confirm('In der Kundenakte steht keine E-Mail-Adresse. Trotzdem im Mailprogramm öffnen?')) return;
  let a=document.createElement('a'); a.href=vlMailLink(); a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
}
function vlWord(){
  let b=[{typ:'p',text:VL.betreff?'Betreff: '+VL.betreff:''}].filter(x=>x.text).concat(vlMitPflicht(VL.text).split('\n').map(z=>({typ:'p',text:z||' '})));
  iaHerunterladen(new Blob([ImmoOffice.docx(b,{titel:VL.betreff||'Schreiben'})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),wzDateiname(VL.betreff||'Schreiben')+'.docx');
}
async function vlAblegen(){
  let w=vlS().wahl;
  if(!w.kundeId){ alert('Bitte zuerst den Empfänger aus der Kundenakte wählen.'); return; }
  if(await wzdNotiz(w.kundeId,'E-Mail','Schreiben „'+(VL.betreff||vlVorlage().titel)+'“'+(w.projektId?' zu '+wzdObjektName(w.projektId,''):''))){ iaHinweis('In der Kundenakte vermerkt'); setTimeout(()=>iaHinweis(''),1800); }
}
/* ---------- eigene Vorlagen ---------- */
function vlEigeneNeu(){ let S=vlS(), v={id:'e'+Date.now().toString(36),kategorie:'Eigene',titel:'Neue Vorlage',betreff:'',text:'{anrede_brief}\n\n'+VL_GRUSS.trim()}; S.eigene.push(v); S.wahl.vorlage=v.id; wzSpeichern(); VL.schluessel=''; wzZeichnen(); }
function vlEigeneKopie(){ let S=vlS(), q=vlVorlage(), v={id:'e'+Date.now().toString(36),kategorie:'Eigene',titel:q.titel+' (eigene)',betreff:q.betreff,text:q.text}; S.eigene.push(v); S.wahl.vorlage=v.id; wzSpeichern(); VL.schluessel=''; wzZeichnen(); }
function vlEigeneFeld(feld,wert){ let S=vlS(), v=S.eigene.find(x=>x.id===S.wahl.vorlage); if(!v) return; v[feld]=wert; wzSpeichern(); if(feld==='titel') return; VL.schluessel=''; }
function vlEigeneLoeschen(){ let S=vlS(); if(!confirm('Diese eigene Vorlage löschen?')) return; S.eigene=S.eigene.filter(x=>x.id!==S.wahl.vorlage); S.wahl.vorlage='expose'; wzSpeichern(); VL.schluessel=''; wzZeichnen(); }
function vlPlatzhalterDazu(p){ let e=$('vl_eigen_text'); if(!e) return; let a=e.selectionStart||e.value.length; e.value=e.value.slice(0,a)+'{'+p+'}'+e.value.slice(e.selectionEnd||a); vlEigeneFeld('text',e.value); e.focus(); }
function vlEigeneEditor(v){
  return wzBox('Eigene Vorlage bearbeiten','<div class="grid"><div class="field"><label for="vl_eigen_titel">Name</label><input id="vl_eigen_titel" value="'+sEsc(v.titel)+'" onchange="vlEigeneFeld(\'titel\',this.value);wzZeichnen()"></div>'
    +'<div class="field"><label for="vl_eigen_betreff">Betreff</label><input id="vl_eigen_betreff" value="'+sEsc(v.betreff||'')+'" onchange="vlEigeneFeld(\'betreff\',this.value);wzZeichnen()"></div></div>'
    +'<div class="field" style="margin-top:8px"><label for="vl_eigen_text">Vorlage</label><textarea id="vl_eigen_text" rows="10" onchange="vlEigeneFeld(\'text\',this.value);wzZeichnen()">'+sEsc(v.text||'')+'</textarea></div>'
    +'<p class="hint">Platzhalter einfügen: '+VL_PLATZHALTER.map(([p,t])=>'<a href="#" onclick="vlPlatzhalterDazu(\''+p+'\');return false;" title="'+sEsc('{'+p+'}')+'">'+sEsc(t)+'</a>').join(' · ')
    +'. Optionale Teile in [[ … ]] entfallen, wenn ein Platzhalter darin leer ist. Keine Namen von Kunden in Vorlagen schreiben.</p>'
    +'<div class="gr-zeile"><button type="button" class="secondary" onclick="vlEigeneLoeschen()" data-ic="trash">Vorlage löschen</button></div>');
}
function vlRechnen(){ iconify($('wz_body')); }
function vlDokument(){
  return {titel:VL.betreff||'Schreiben',html:'<p class="wzd-unter">'+sEsc(VL.betreff?'Betreff: '+VL.betreff:'')+'</p>'+sEsc(VL.text).split('\n').map(z=>'<p>'+(z||'&nbsp;')+'</p>').join(''),pflicht:true,ohneFuss:true};
}
wzRegistrieren({id:'vorlagen',titel:'Vorlagen',sub:'Schreiben und E-Mails mit Kunde, Objekt und Termin',icon:'mail',start:vlStart,ohneNeu:true,
  zeichnen:vlZeichnen,rechnen:vlRechnen,dokument:vlDokument});
