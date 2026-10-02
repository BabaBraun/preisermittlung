/* ---------- Word- / Excel-Export ---------- */
function dlBlob(content,mime,filename){return iaHerunterladen(new Blob(['\ufeff'+content],{type:mime}),filename);}
/* Dateiname und Titel: „Preisermittlung <Anschrift>“, ohne Anschrift nur „Preisermittlung“ (nicht doppelt) */
function anschriftName(){return ($('ek_anschrift').value||'').replace(/[^\wäöüÄÖÜß -]/g,'').replace(/\s+/g,' ').trim();}
function berichtName(){let a=anschriftName();return 'Preisermittlung'+(a?' '+a:'');}
/* Word-Export: der Bericht als echte .docx-Datei (js/office.js), offline und ohne Server */
async function exportWord(){
  druckbericht();
  let inhalt=$('report').cloneNode(true);
  inhalt.querySelectorAll('.no-print,.runhead').forEach(e=>e.remove());
  await grSvgAlsBild(inhalt);   // Grundrisse als PNG, Word zeigt kein SVG
  document.body.classList.remove('report-mode');
  try{
    let bytes=ImmoOffice.docx(ImmoOffice.bloeckeAusHtml(inhalt),{titel:'Rechnerische '+berichtName(),autor:(($('ek_ersteller')||{}).value||'').trim()||'ImmoApp'});
    await dateiSpeichern(bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',berichtName()+'.docx');
  }catch(e){ alert('Das Word-Dokument konnte nicht erstellt werden: '+(e&&e.message||e)); }
}
/* Excel-Export: Kennzahlen als Zahlen mit Format, alle Eingaben und Prüfhinweise — echte .xlsx-Datei */
async function exportExcel(){
  compute(); const R=window._R, P=window._PRUEF||{status:'ok',hinweise:[],fehlend:[]};
  const eur=v=>({v:Math.round((v||0)*100)/100,s:'eur'}), dez=v=>({v:Math.round((v||0)*10000)/10000,s:'dez'}), pct=v=>({v:Math.round((v||0)*100)/100,s:'pct'});
  const t=v=>String(v==null?'':v);
  let kopf=[
    [{v:'Rechnerische Preisermittlung',s:'titel'}],
    ['Objekt',t($('ek_anschrift').value)],['Vordruck',t($('ek_vordruck').value)],
    ['Gebäudetyp',t(modus()==='wohnung'?$('ek_wtyp').value:$('ek_typ').value)],
    ['Wertermittlungsstichtag',t($('ek_stichtag').value)],['Baujahr',num('ek_baujahr')||''],
    ['Status',P.status==='ok'?'gültig':'Entwurf — '+pruefStatusText(P)],[]
  ];
  let werte=[
    ['Wohnfläche m²',dez(num('ek_wohnflaeche'))],['Nutzfläche m²',dez(num('ek_nutzflaeche'))],
    ['Grundstücksfläche m²',dez(num('ek_gs_flaeche'))],['Bodenrichtwert €/m²',eur(num('ek_brw'))],
    ['Bodenwert',eur(R.bodenwert)],['BGF Hauptgebäude m²',dez(R.bgfHG)],['Gebäudepreis €/m²',eur(R.hg.preis)],
    ['Restnutzungsdauer Jahre',dez(R.erRND)],['Modernisierungspunkte',dez(R.modPunkte)],
    ['Liegenschaftszins',pct(R.effLZ)],['Vervielfältiger',dez(R.vf)],
    ['Jahresrohertrag',eur(R.roh)],['Bewirtschaftungskosten',eur(R.bewirt)],['Gebäudereinertrag',eur(R.gebRein)],
    [modus()==='wohnung'?'Preis nach Vergleichswert':'Preis nach Gebäudesubstanz',eur(R.substanz)],['Preis nach Gebäudeertrag',eur(R.ertrag)],
    ['Vergleichswert',eur(R.vergleichWert)],['Gewichteter Mittelwert',eur(R.mittel)],
    ['Belastung Nießbrauch/Wohnrecht/Leibrente',eur(R.niessWert)],['Korrektur Erbbaurecht',eur(R.erbbauAbzug)],
    ['Wertkorrekturen § 8 Abs. 3',eur(R.wkSumme)],['Barwert PV',eur(R.pvWert)],['Energetische Qualität',eur(R.energieWert)],
    [{v:'Empfohlener Preisansatz',s:'fett'},P.status==='ok'?{v:Math.round(R.empfehlung*100)/100,s:'fetteur'}:{v:'Entwurf: '+eur(R.empfehlung).v.toLocaleString('de-DE')+' €',s:'fett'}],
    ['Verhandlungsspanne von',eur(R.empfehlung*(1-R.vh))],['Verhandlungsspanne bis',eur(R.empfehlung*(1+R.vh))],
    ['Preis je m² Wohn-/Nutzfläche',eur(R.eigenM2)],
    ['Bruttomietrendite',pct(R.reBrutto)],['Nettomietrendite',pct(R.reNetto)],['Kaufpreisfaktor',dez(R.reFaktor)],
    ['Beleihungswert',window._BW?.status==='ok'?eur(R.beleihungswert):'Entwurf: '+R.beleihungswert.toLocaleString('de-DE')+' €'],
    ['Prüfstatus Beleihungsmodell',window._BW?.status||'inaktiv']
  ];
  let felder=collect(), eingaben=[[{v:'Feld',s:'fett'},{v:'Kennung',s:'fett'},{v:'Wert',s:'fett'}]];
  Object.keys(felder).forEach(id=>{ let v=felder[id]; if(v===''||v===false||v==='0') return;
    eingaben.push([feldName(id),id,typeof v==='boolean'?'ja':{v:String(v).slice(0,32000),s:'text'}]); });
  let blaetter=[{name:'Ergebnis',spalten:[44,22],zeilen:kopf.concat(werte)},{name:'Eingaben',spalten:[44,22,60],zeilen:eingaben}];
  let hin=(P.hinweise||[]).map(h=>[h.stufe==='fehler'?'kritisch':'Hinweis',feldName(h.feld),h.text]).concat((P.fehlend||[]).map(f=>['fehlt',feldName(f.feld),f.text]));
  if(hin.length) blaetter.push({name:'Prüfhinweise',spalten:[12,34,90],zeilen:[[{v:'Stufe',s:'fett'},{v:'Feld',s:'fett'},{v:'Hinweis',s:'fett'}]].concat(hin)});
  try{
    let bytes=ImmoOffice.xlsx(blaetter,{titel:'Rechnerische '+berichtName()});
    await dateiSpeichern(bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',berichtName()+'.xlsx');
  }catch(e){ alert('Die Excel-Datei konnte nicht erstellt werden: '+(e&&e.message||e)); }
}
function dateiSpeichern(bytes,mime,name){ return iaHerunterladen(new Blob([bytes],{type:mime}),name); }
