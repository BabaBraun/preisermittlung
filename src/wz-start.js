/* ---------- Kacheln auf der Startseite und unter „Mehr“, nach Bereichen (D40) ----------
   Eine Liste für beide Stellen: Bereich → Kacheln [id, Name (weiche Trennstellen erlaubt), Symbol, Text Startseite, Text „Mehr“].
   Jeder Bereich hat eine eigene Farbe (assets/werkzeuge.css, data-gruppe). Kacheln, deren Werkzeug nicht geladen ist,
   entfallen. Die Kacheln der Bewertung und der Liegenschaften stehen unverändert darüber. */
const WZ_GRUPPEN=[
  {id:'vermarkten',titel:'Akquise & Vermarktung',kacheln:[
    ['akquise','Akquise','sign','Eigentümer vom ersten Kontakt bis zum Auftrag — mit Termin, Wiedervorlage und Bewertung.','Eigentümer bis zum Auftrag'],
    ['unterlagen','Unterlagen','folder-open','Was liegt vor, was fehlt? Je Verkauf mit Vollmacht des Eigentümers und Anforderung je Stelle.','Unterlagen je Verkauf, Vollmacht, Anforderung'],
    ['interessenten','Interessenten','inbox','Anfragen, Besichtigungen und der Abgleich aller Suchprofile mit den Objekten in Vermarktung.','Anfragen, Abgleich mit Suchprofilen'],
    ['bieter','Bieter­verfahren','trending-up','Gebote sammeln und vergleichen — Übersicht für den Eigentümer ohne Namen.','Gebote sammeln und vergleichen'],
    ['foto','Fotostudio','image','Fotos aufhellen, gerade richten, zuschneiden — Personen und Kennzeichen unkenntlich machen.','Fotos bearbeiten, Bereiche schwärzen'],
    ['portal','Portal-Export','upload','Objekte in Vermarktung mit Bildern als Datei für Immobilienportale.','Objekte mit Bildern für Immobilienportale'],
    ['aushang','Aushang','printer','Eine Seite für Schaufenster und Filiale — Bild, Preis, Pflichtangaben, Ansprechpartner.','Aushang für Schaufenster und Filiale'],
    ['vorlagen','Vorlagen','mail','Schreiben und E-Mails mit Kunde, Objekt und Termin — kopieren, mailen, als Word.','Schreiben und E-Mails']]},
  {id:'abschluss',titel:'Abschluss',kacheln:[
    ['fahrplan','Verkaufs­fahrplan','list-check','Jeder Auftrag Schritt für Schritt — vom Auftrag bis zur Übergabe, mit Fortschritt.','Schritte je Auftrag bis zur Übergabe'],
    ['notar','Notarauftrag','pen','Alle Angaben für den Kaufvertragsentwurf — Datenblatt, Termin im Kalender, Übergabe.','Angaben für den Kaufvertragsentwurf, Termin, Übergabe'],
    ['provision','Provision','receipt','Abrechnung je Verkauf — Teilung geprüft, Rechnung mit Pflichtangaben, Zahlungseingang.','Abrechnung, Rechnung, Zahlungseingang'],
    ['uebergabe','Übergabe­protokoll','key','Zählerstände, Schlüssel und Mängel mit Fotos — beide Seiten unterschreiben auf dem Gerät.','Zähler, Schlüssel, Mängel, Unterschriften']]},
  {id:'beraten',titel:'Beratung',kacheln:[
    ['erbe','Übergeben & Vererben','gift','Schenkung oder Erbe, mit Nießbrauch oder Wohnrecht — Freibeträge und Steuer im Vergleich.','Schenkung oder Erbe, Nießbrauch, Freibeträge'],
    ['rente','Wohnen im Alter','hourglass','Einmalzahlung, Leibrente, Teilverkauf oder Rückmiete — was bleibt monatlich und für die Erben?','Einmalzahlung, Leibrente, Teilverkauf, Rückmiete'],
    ['kaufmiete','Kaufen oder Mieten','scale','Vermögen nach Jahren: Eigentum mit Finanzierung gegen Miete und Geldanlage.','Vermögensvergleich über die Jahre'],
    ['nebenkosten','Kauf­neben­kosten','percent','Notar und Grundbuch genau nach Gebührentabelle, Grunderwerbsteuer, Provision — und was dem Verkäufer bleibt.','Notar, Grundbuch, Steuer; Erlös des Verkäufers'],
    ['grundstueck','Grundstücks­potenzial','layers','Was kann ein Bauträger zahlen? Residualwert gegen Bodenrichtwert und Bestand.','Residualwert gegen Bodenrichtwert'],
    ['etw','ETW-Kaufcheck','clipboard','Rücklage, Beschlüsse, Heizung und Unterlagen — als Ampel für Käufer und Finanzierung.','Rücklage, Beschlüsse, Heizung, Unterlagen'],
    ['wertmonitor','Wertmonitor','activity','Gesicherte Bewertungen fortschreiben — Wiedervorlage bei deutlicher Wertänderung.','Bewertungen fortschreiben, Gesprächsanlässe']]},
  {id:'organisieren',titel:'Organisation',kacheln:[
    ['kalender','Kalender','calendar','Termine, Fristen und Wiedervorlagen an einer Stelle — auch für den Gerätekalender.','Termine, Fristen, Wiedervorlagen'],
    ['aktivitaeten','Aktivitäten','chart','Was ist passiert? Anfragen, Besichtigungen, Gebote und Gespräche je Woche, Monat oder Quartal.','Aktivitäten je Zeitraum, mit Vergleich'],
    ['jahr','Mein Jahr','target','Aufträge je Phase, erwartete Provision, Ziel und Herkunft der Aufträge.','Aufträge, Provision, Ziel, Herkunft'],
    ['datenstand','Datenstand','clock','Baupreisindex, Sterbetafel, Marktdaten, Sicherung — was ist aktuell, was steht an?','Rechengrundlagen und Daten: was ist aktuell?']]}
];
function wzStartKacheln(){
  let box=$('start_wz'); if(!box) return;
  box.innerHTML=WZ_GRUPPEN.map(g=>{ let k=g.kacheln.filter(x=>WZ.reg[x[0]]); if(!k.length) return '';
    return '<div class="wz-gruppe" data-gruppe="'+g.id+'"><div class="recent-head"><h2>'+sEsc(g.titel)+'</h2></div><div class="quick wz-quick">'
      +k.map(([id,name,ic,text])=>'<div class="tile q" onclick="wzOeffnen(\''+id+'\')"><span class="qi" data-ic="'+ic+'"></span>'
        +(id==='datenstand'?'<span class="ds-badge" id="ds_badge" hidden></span>':'')
        +'<div class="t">'+sEsc(name)+'</div><div class="d">'+sEsc(text)+'</div></div>').join('')+'</div></div>'; }).join('');
  iconify(box);
  try{ dsBadge(); }catch(e){}
}
/* Liste für „Mehr“ (src/app-shell.js) */
function wzMehrHtml(){
  return WZ_GRUPPEN.map(g=>{ let k=g.kacheln.filter(x=>WZ.reg[x[0]]); if(!k.length) return '';
    return '<h2>'+sEsc(g.titel)+'</h2><div class="app-actions-list" data-gruppe="'+g.id+'">'+k.map(([id,name,ic,,hint])=>appButton(name.replace(/­/g,''),ic,"wzOeffnen('"+id+"')",hint)).join('')+'</div>'; }).join('');
}
wzStartKacheln();
