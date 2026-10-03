/* ---------- Absender und Pflichtangaben (D48) ----------
   Eine Stelle für die Angaben, die auf jedem Schreiben stehen: Bank, Anschrift, Berater — und die Pflichtangaben einer
   eingetragenen Genossenschaft auf Geschäftsbriefen an einen bestimmten Empfänger, „gleichviel welcher Form“, also auch E-Mails
   (§ 25a Abs. 1 GenG; BT-Drs. 16/960 S. 48): Rechtsform und Sitz, Registergericht und Registernummer, alle Vorstandsmitglieder
   einschließlich der Stellvertreter (§ 35 GenG) und der Vorsitzende des Aufsichtsrats, jeweils mit Familiennamen und mindestens
   einem ausgeschriebenen Vornamen. Die Ausnahme des § 25a Abs. 2 (Vordrucke in bestehender Geschäftsverbindung) wendet die App nicht
   an — eine Angabe zu viel schadet nie. Die App setzt den Baustein unter Vorlagen, Rundschreiben, Rechnungen, Anforderungs-
   schreiben, Listen und Berichte für den Eigentümer, das Datenblatt für das Notariat und die Gebotsübersicht; nicht unter Aushang
   und Social Media (unbestimmter Personenkreis) und nicht unter die Vollmacht (Erklärung des Eigentümers). Prüfregeln in
   js/beratung.js (pflichtangabenPruefen). Die Angaben bleiben auf dem Gerät (localStorage „ia_wz“); im Repository stehen keine
   echten Namen. */
const AB_FELDER=[['firma','Name der Bank (Firma)','z. B. Musterbank eG'],['rechtsform','Rechtsform','eingetragene Genossenschaft'],['sitz','Sitz laut Register','z. B. Musterstadt'],
  ['registergericht','Registergericht','z. B. Amtsgericht Stuttgart'],['registernr','Nummer im Genossenschaftsregister','z. B. GnR 000000'],
  ['vorstand','Vorstand — alle Mitglieder, auch Stellvertreter','Vorname Nachname, Vorname Nachname'],['aufsichtsrat','Vorsitz des Aufsichtsrats','Vorname Nachname']];
const AB_KONTAKT=[['anschrift','Anschrift der Bank','Straße, PLZ Ort'],['web','Internet','www.…'],['name','Ihr Name',''],['funktion','Funktion','z. B. Immobilienberater'],
  ['tel','Telefon',''],['mail','E-Mail','']];
function abStart(){ return {rechtsform:'eingetragene Genossenschaft',signatur:false,signaturAm:''}; }
function abS(){ let a=wzAlle(); if(!a.absender||typeof a.absender!=='object'||Array.isArray(a.absender)) a.absender=abStart(); return a.absender; }
function abWert(k){ return String(abS()[k]||'').trim(); }
/* Kontakt für Dokumente: eigene Angaben zuerst, sonst wie bisher aus dem gemerkten Ansprechpartner des Exposés und dem Portal-Export */
function wzAbsenderKontakt(){
  let g=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}, P=wzAlle().portal||{}, pk=P.kontakt||{}, pa=P.anbieter||{};
  return {firma:abWert('firma')||g.firma||pa.firma||'',name:abWert('name')||g.name||pk.name||'',funktion:abWert('funktion')||g.funktion||pk.funktion||'',
    tel:abWert('tel')||g.tel||pk.tel||'',mail:abWert('mail')||g.mail||pk.mail||'',anschrift:abWert('anschrift'),web:abWert('web')};
}
function abPruefung(){ let S=abS(); return ImmoBeratung.pflichtangabenPruefen({firma:S.firma,rechtsform:S.rechtsform,sitz:S.sitz,registergericht:S.registergericht,registernr:S.registernr,vorstand:S.vorstand,aufsichtsrat:S.aufsichtsrat}); }
/* fehlende Pflichtangaben (Namen der Felder) — für Hinweise in anderen Kacheln */
function wzPflichtFehlt(){ return abPruefung().fehlt; }
/* Zeilen der Pflichtangaben; leer, solange keine Firma eingetragen ist */
function wzPflichtZeilen(){
  if(!abWert('firma')) return [];
  return [[abWert('firma'),abWert('rechtsform')||'eingetragene Genossenschaft',abWert('sitz')?'Sitz '+abWert('sitz'):''].filter(Boolean).join(' · '),
    [abWert('registergericht')?'Registergericht '+abWert('registergericht'):'',abWert('registernr')].filter(Boolean).join(', '),
    abWert('vorstand')?'Vorstand: '+abWert('vorstand'):'',abWert('aufsichtsrat')?'Vorsitz des Aufsichtsrats: '+abWert('aufsichtsrat'):''].filter(Boolean);
}
function wzPflichtText(){ return wzPflichtZeilen().join('\n'); }
function wzPflichtFussHtml(){ let z=wzPflichtZeilen(); return z.length?'<p class="wzd-pflicht">'+z.map(sEsc).join('<br>')+'</p>':''; }
/* eine Zeile für Beratungsausdrucke (Grauzone, kostet nichts) */
function wzPflichtKurz(){ return wzPflichtZeilen().join(' · '); }
/* Text mit angehängten Pflichtangaben. mail=true: entfällt, wenn die Signatur des Mailprogramms sie bestätigt enthält. */
function wzMitPflicht(text,o){
  let p=wzPflichtText(); if(!p||(o&&o.mail&&abS().signatur)) return String(text||'');
  return String(text||'').replace(/\s+$/,'')+'\n\n--\n'+p;
}
function abSignatur(an){ let S=abS(); S.signatur=!!an; S.signaturAm=an?aufHeute():''; wzSpeichern(); wzZeichnen(); }
function abZeichnen(){
  let S=abS();
  return wzBox('Pflichtangaben der Genossenschaft','<div class="grid">'+AB_FELDER.map(([k,l,ph])=>wzFeld(k,l,{typ:'text',ph,voll:k==='vorstand'})).join('')+'</div>'
      +'<div id="ab_pruefung"></div>'
      +wzHinweis('Die Werte stehen im Impressum der Bank und im Genossenschaftsregister; sie bleiben nur auf diesem Gerät. Namen mit mindestens einem ausgeschriebenen Vornamen.'))
    +wzBox('E-Mails','<label class="wz-check full"><input type="checkbox" id="ab_signatur"'+(S.signatur?' checked':'')+' onchange="abSignatur(this.checked)"><span>Die Signatur meines Mailprogramms enthält die Pflichtangaben'
        +(S.signatur&&S.signaturAm?' (bestätigt am '+wzDatum(S.signaturAm)+')':'')+'</span></label>'
      +wzHinweis('Dann hängt die App sie nicht an E-Mails und kopierte Texte an. Briefe, Rechnungen und Berichte bekommen sie immer.'))
    +wzBox('Absender und Ansprechpartner','<div class="grid">'+AB_KONTAKT.map(([k,l,ph])=>wzFeld(k,l,{typ:'text',ph})).join('')+'</div>'
      +wzHinweis('Leere Felder übernimmt die App wie bisher aus dem gemerkten Ansprechpartner des Exposés.'))
    +wzBox('Vorschau','<div class="wzd-pflicht ab-vorschau" id="ab_vorschau"></div>');
}
function abRechnen(){
  let e=$('ab_vorschau'); if(e) e.innerHTML=wzPflichtZeilen().map(sEsc).join('<br>')||'<span class="hint">Noch keine Firma eingetragen.</span>';
  let r=abPruefung(), z=r.fehlt.length?wzAmpel('rot','Es fehlen: '+sEsc(r.fehlt.join(', '))+' — Pflicht auf Geschäftsbriefen, auch E-Mails (§ 25a Abs. 1 GenG).'):'';
  z+=r.fehler.map(t=>wzAmpel('rot',sEsc(t))).join('')+r.hinweise.map(t=>wzAmpel('gelb',sEsc(t))).join('');
  wzH('ab_pruefung',z||wzAmpel('gruen','Vollständig. Die App setzt die Angaben unter Schreiben, E-Mails, Rechnungen und Berichte.'));
}
wzRegistrieren({id:'absender',titel:'Absender und Pflichtangaben',sub:'Bank, Register, Vorstand — für Schreiben, E-Mails und Rechnungen',icon:'building',start:abStart,ohneNeu:true,
  zeichnen:abZeichnen,rechnen:abRechnen});
