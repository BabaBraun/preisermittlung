/* ImmoApp — Liegenschaftsverwaltung: Oberfläche „Nebenkosten“ (Betriebs- und Heizkostenabrechnung)
   Rechnen: js/verwaltung-nk.js (ImmoNebenkosten). Hängt sich als Reiter in die Verwaltung (js/verwaltung-ui.js) ein.
   Kosten werden je Liegenschaft erfasst; die Einstellungen einer Abrechnung (Zeitraum, Heizung, CO2, Verbräuche)
   werden gespeichert, das Ergebnis wird bei jeder Anzeige neu gerechnet. Erst „Zustellung vermerken und buchen“
   schreibt Nachzahlungen/Guthaben ins Mietkonto und passt auf Wunsch die Vorauszahlungen an (§ 560 Abs. 4 BGB);
   das lässt sich vollständig zurücknehmen. */
'use strict';

const LVN=ImmoNebenkosten;
LV.nkJahr=null; LV.nkAnsicht='kosten';

function lvNkJahr(){ return LV.nkJahr||(+lvHeute().slice(0,4)-1); }
function lvNkJahre(l){
  const j=new Set([+lvHeute().slice(0,4),+lvHeute().slice(0,4)-1]);
  (l.kosten||[]).forEach(k=>[k.datum,k.von,k.bis].forEach(d=>{ if(d) j.add(+d.slice(0,4)); }));
  (l.nkAbrechnungen||[]).forEach(a=>j.add(+a.von.slice(0,4)));
  return [...j].sort((a,b)=>b-a);
}
function lvNkAbr(l,von,bis){ return (l.nkAbrechnungen||[]).find(a=>a.von===von&&a.bis===bis)||null; }
function lvNkZeitraum(l){ const j=lvNkJahr(), a=LV.nkZeitraum; return a&&a.jahr===j?a:{jahr:j,von:j+'-01-01',bis:j+'-12-31'}; }
function lvNkCfg(l,a,von,bis){
  const heiz=LVN.kostenImZeitraum(l,von,bis).some(x=>(LVN.KAT[x.k.kategorie]||{}).heiz);
  return {von,bis,stichtag:lvHeute(),vzBasis:a?a.vzBasis:'soll',leerPersonen:a&&a.leerPersonen!=null?a.leerPersonen:1,
    verbrauch:a?a.verbrauch:{},heiz:a?a.heiz:{modus:heiz?'verteilen':'ohne'},co2:a?a.co2:{aktiv:false}};
}
function lvNkZeitText(von,bis){ return LVK.datumDE(von)+' – '+LVK.datumDE(bis); }
function lvZahl(x,st){ return x==null||!isFinite(x)?'–':Number(x).toLocaleString('de-DE',{maximumFractionDigits:st==null?2:st}); }

/* ---------- Reiter ---------- */
function lvNebenkostenHtml(l){
  const j=lvNkJahr();
  const kopf='<div class="lv-nk-kopf"><div class="field"><label for="lv_nk_jahr">Jahr</label><select id="lv_nk_jahr" onchange="LV.nkJahr=+this.value;LV.nkZeitraum=null;LV.form=null;lvRender()">'
    +lvNkJahre(l).map(x=>'<option value="'+x+'"'+(x===j?' selected':'')+'>'+x+'</option>').join('')+'</select></div>'
    +'<div class="lv-segment"><button class="'+(LV.nkAnsicht==='kosten'?'on':'')+'" onclick="LV.nkAnsicht=\'kosten\';LV.form=null;lvRender()">Kosten erfassen</button>'
    +'<button class="'+(LV.nkAnsicht==='abrechnung'?'on':'')+'" onclick="LV.nkAnsicht=\'abrechnung\';LV.form=null;lvRender()">Abrechnung '+j+'</button></div></div>';
  if(!(l.vertraege||[]).length) return kopf+lvBox('Nebenkosten','<p>Für eine Abrechnung braucht es Einheiten und Mietverträge.</p>');
  return kopf+(LV.nkAnsicht==='abrechnung'?lvNkAbrechnungHtml(l):lvNkKostenHtml(l));
}

/* ---------- Kosten erfassen ---------- */
function lvKatOptionen(){ return LVN.KATEGORIEN.map(k=>[k.key,(k.nr?k.nr+'. ':'')+k.name+(k.umlage===false?' (nicht umlagefähig)':'')]); }
function lvKostenFelder(l,k){
  k=k||{}; const E=(l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]);
  return [
    {id:'k_kategorie',label:'Kostenart (§ 2 BetrKV)',typ:'wahl',wert:k.kategorie||'grundsteuer',optionen:lvKatOptionen(),pflicht:true},
    {id:'k_betrag',label:'Betrag laut Rechnung (€)',typ:'betrag',wert:k.betrag,pflicht:true},
    {id:'k_datum',label:'Rechnungs- oder Zahlungsdatum',typ:'datum',wert:k.datum},
    {id:'k_von',label:'Leistungszeitraum von',typ:'datum',wert:k.von,hinweis:'nur bei abweichendem Zeitraum, z. B. Versicherungsjahr — wird dann anteilig abgegrenzt'},
    {id:'k_bis',label:'Leistungszeitraum bis',typ:'datum',wert:k.bis},
    {id:'k_text',label:'Bezeichnung',wert:k.text,platzhalter:'z. B. Gebäudeversicherung 2025/26'},
    {id:'k_beleg',label:'Beleg- oder Rechnungsnummer',wert:k.beleg},
    {id:'k_schluessel',label:'Verteilerschlüssel',typ:'wahl',wert:k.schluessel||'',optionen:[['','wie für die Kostenart üblich']].concat(Object.entries(LVN.SCHLUESSEL)),hinweis:'ohne abweichende Vereinbarung nach Wohnfläche (§ 556a Abs. 1 BGB)'},
    {id:'k_kreis',label:'Umlagekreis',typ:'wahl',wert:k.kreis||'alle',optionen:Object.entries(LVN.KREISE)},
    {id:'k_direkt',label:'Einheit bei „direkt zugeordnet“',typ:'wahl',wert:k.direktEinheitId||'',optionen:[['','–']].concat(E)},
    {id:'k_lohn',label:'davon Arbeitskosten nach § 35a EStG (€)',typ:'betrag',wert:k.lohn35a,min:0},
    {id:'k_art35a',label:'Art nach § 35a EStG',typ:'wahl',wert:k.art35a||'',optionen:[['','–'],['haushaltsnah','haushaltsnahe Dienstleistung (Abs. 2)'],['handwerker','Handwerkerleistung (Abs. 3)']]},
    {id:'k_einheitIds',label:'Einheiten bei Umlagekreis „Auswahl“',typ:'mehrfach',wert:k.einheitIds||[],optionen:E,breit:true}]
    .concat(l.art==='weg'?[{id:'k_ruecklage',label:'aus der Erhaltungsrücklage bezahlt (wird nicht umgelegt, mindert die Rücklage)',typ:'check',wert:k.ausRuecklage,breit:true}]:[]);
}
function lvNkKostenHtml(l){
  const z=lvNkZeitraum(l);
  let form='';
  if(LV.form&&LV.form.typ==='kosten'){ const k=LV.form.id?(l.kosten||[]).find(x=>x.id===LV.form.id):null;
    form=lvFormRahmen(k?'Kosten bearbeiten':'Kosten erfassen',lvFelder(lvKostenFelder(l,k)),'lvKostenSpeichern(\''+lvQ(LV.form.id||'')+'\')'); }
  const idx=k=>LVN.KATEGORIEN.findIndex(x=>x.key===k.kategorie);
  const liste=LVN.kostenImZeitraum(l,z.von,z.bis).sort((a,b)=>idx(a.k)-idx(b.k)||String(a.k.datum||a.k.von).localeCompare(String(b.k.datum||b.k.von)));
  let umlage=0,nicht=0;
  const zeilen=liste.map(({k,betrag})=>{
    const kat=LVN.KAT[k.kategorie]||{}, u=kat.umlage!==false; if(u) umlage+=betrag; else nicht+=betrag;
    const schl=kat.heiz?'HeizkostenV':(LVN.SCHLUESSEL[k.schluessel||kat.schluessel]||'')+(k.kreis&&k.kreis!=='alle'?' · '+LVN.KREISE[k.kreis]:'');
    return '<tr><td>'+lvH(k.von&&k.bis?lvNkZeitText(k.von,k.bis):LVK.datumDE(k.datum))+'</td><td class="strong">'+lvH((kat.nr?kat.nr+'. ':'')+kat.name)+(u?'':' '+lvBadge('nicht umlagefähig','warn'))+'<br><span class="lv-klein">'+lvH([k.text,k.beleg].filter(Boolean).join(' · '))+'</span></td>'
      +'<td>'+lvH(k.ausRuecklage?'aus der Erhaltungsrücklage':schl)+'</td><td class="r">'+lvEur(betrag)+(k.von&&k.bis&&Math.abs(betrag-k.betrag)>0.004?'<br><span class="lv-klein">von '+lvEur(k.betrag)+'</span>':'')+'</td>'
      +'<td class="r">'+(k.lohn35a?lvEur(k.lohn35a):'–')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="LV.form={typ:\'kosten\',id:\''+lvQ(k.id)+'\'};lvRender()">Bearbeiten</button><button class="secondary" onclick="lvKostenLoeschen(\''+lvQ(k.id)+'\')" aria-label="Kosten löschen" data-ic="trash"></button></td></tr>';
  });
  return form+lvBox('Kosten '+z.jahr,'<p class="hint">Alle Rechnungen der Liegenschaft für das Jahr. Umlagefähig sind nur die im Mietvertrag vereinbarten Betriebskosten (§ 556 Abs. 1 BGB). Seit 01.07.2024 dürfen Kabel-TV-Entgelte nicht mehr umgelegt werden (§ 2 Nr. 15 BetrKV).</p>'
    +lvTabelle(['Datum / Zeitraum','Kostenart',{t:'Verteilung'},{t:'im Jahr',r:1},{t:'§ 35a',r:1},''],zeilen,'Für '+z.jahr+' sind noch keine Kosten erfasst.')
    +'<p class="hint">Umlagefähig: <b>'+lvEur(umlage)+'</b> · nicht umlagefähig: '+lvEur(nicht)+'</p>'
    +'<div class="mdb-actions"><button class="primary" onclick="LV.form={typ:\'kosten\',id:null};lvRender()" data-ic="plus">Kosten erfassen</button>'
    +'<button class="secondary" onclick="LV.nkAnsicht=\'abrechnung\';lvRender()" data-ic="arrow-right">Zur Abrechnung</button></div>');
}
async function lvKostenSpeichern(id){
  const l=lvAktiv(), r=lvFormLesen(lvKostenFelder(l)), w=r.werte;
  if(!w.k_datum&&!(w.k_von&&w.k_bis)){ r.ok=false; r.fehler.push('Bitte ein Datum oder den Leistungszeitraum angeben'); }
  if(w.k_von&&w.k_bis&&w.k_bis<w.k_von){ r.ok=false; r.fehler.push('Leistungszeitraum: Ende liegt vor dem Beginn'); }
  if((w.k_von&&!w.k_bis)||(!w.k_von&&w.k_bis)){ r.ok=false; r.fehler.push('Leistungszeitraum: bitte Beginn und Ende angeben'); }
  if(w.k_schluessel==='direkt'&&!w.k_direkt){ r.ok=false; r.fehler.push('Direkt zugeordnet: bitte die Einheit wählen'); }
  if(w.k_kreis==='auswahl'&&!(w.k_einheitIds||[]).length){ r.ok=false; r.fehler.push('Umlagekreis „Auswahl“: mindestens eine Einheit ankreuzen'); }
  if(w.k_lohn>0&&w.k_betrag!=null&&w.k_lohn>w.k_betrag){ r.ok=false; r.fehler.push('Die Arbeitskosten sind höher als der Rechnungsbetrag'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const neu=!id; LV.form=null;
  await lvAendern(l=>{
    l.kosten=l.kosten||[];
    let k=id?l.kosten.find(x=>x.id===id):null;
    if(!k){ k={id:LVK.neueId('K')}; l.kosten.push(k); }
    Object.assign(k,{kategorie:w.k_kategorie,betrag:LVK.r2(w.k_betrag),datum:w.k_datum||null,von:w.k_von||null,bis:w.k_bis||null,text:w.k_text,beleg:w.k_beleg,
      schluessel:w.k_schluessel||null,kreis:w.k_kreis,einheitIds:w.k_kreis==='auswahl'?w.k_einheitIds:[],direktEinheitId:w.k_schluessel==='direkt'?w.k_direkt:null,
      lohn35a:w.k_lohn||null,art35a:w.k_lohn>0?(w.k_art35a||'haushaltsnah'):null,ausRuecklage:!!w.k_ruecklage});
  },neu?'Kosten erfasst.':'Kosten gespeichert.');
  if(neu){ LV.form={typ:'kosten',id:null}; lvRender(); }
}
async function lvKostenLoeschen(id){
  if(!confirm('Diese Kosten löschen?')) return;
  await lvAendern(l=>{ l.kosten=(l.kosten||[]).filter(k=>k.id!==id); },'Kosten gelöscht.');
}

/* ---------- Abrechnung einrichten ---------- */
function lvNkBeheizt(l){ return (l.einheiten||[]).filter(e=>['wohnung','gewerbe'].includes(e.art)&&+e.flaeche>0); }
function lvNkEinstellFelder(l,z,cfg){
  const h=cfg.heiz||{}, c=cfg.co2||{}, fl=(l.einheiten||[]).filter(e=>e.art==='wohnung').reduce((s,e)=>s+(+e.flaeche||0),0);
  const heizE=h.einheiten||{}, ex=h.extern||{};
  const kostenV=LVN.kostenImZeitraum(l,z.von,z.bis).filter(x=>x.k.schluessel==='verbrauch');
  const verbundene=LVN.kostenImZeitraum(l,z.von,z.bis).some(x=>x.k.kategorie==='heizung_ww');
  const vertraegeZ=(l.vertraege||[]).filter(v=>LVK.ueberlappung(z.von,z.bis,v.beginn,v.ende||null)>0);
  const g={
    zeit:[{id:'a_von',label:'Abrechnungszeitraum von',typ:'datum',wert:z.von,pflicht:true},{id:'a_bis',label:'bis',typ:'datum',wert:z.bis,pflicht:true},
      {id:'a_vzBasis',label:'Vorauszahlungen',typ:'wahl',wert:cfg.vzBasis,optionen:[['soll','vereinbarte (Soll) — Rückstände bleiben im Mietkonto'],['ist','tatsächlich gezahlte (Ist)']]},
      {id:'a_leerP',label:'Personen je leerer Einheit',typ:'zahl',wert:cfg.leerPersonen,min:0,hinweis:'Leerstand bei Umlage nach Personen — trägt der Vermieter'}],
    verbrauch:[].concat(...kostenV.map(({k})=>(l.einheiten||[]).filter(e=>!['stellplatz','garage'].includes(e.art)||k.kreis==='auswahl').map(e=>({id:'v_'+k.id+'_'+e.id,label:((LVN.KAT[k.kategorie]||{}).name||'')+' · '+lvEinheitName(e),typ:'zahl',min:0,wert:((cfg.verbrauch||{})[k.id]||{})[e.id]})))),
    heizModus:[{id:'a_modus',label:'Heizung und Warmwasser',typ:'wahl',wert:h.modus||'ohne',optionen:[['ohne','keine zentrale Heizung / nicht abrechnen'],['verteilen','selbst verteilen nach HeizkostenV'],['extern','Beträge aus der Abrechnung des Messdienstes']]}],
    heizVerteilen:[{id:'a_pvHeiz',label:'Heizung: Anteil nach Verbrauch (%)',typ:'zahl',wert:h.pvHeiz!=null?h.pvHeiz:70,hinweis:'50–70 % (§ 7 HeizkostenV)'},
      {id:'a_pvWW',label:'Warmwasser: Anteil nach Verbrauch (%)',typ:'zahl',wert:h.pvWW!=null?h.pvWW:70,hinweis:'50–70 % (§ 8 HeizkostenV)'},
      {id:'a_zeitanteilig',label:'Bei Mieterwechsel zeitanteilig statt nach Gradtagszahlen',typ:'check',wert:h.zeitanteilig}]
      .concat(verbundene?[{id:'a_wwModus',label:'Warmwasseranteil der verbundenen Anlage (§ 9)',typ:'wahl',wert:h.wwModus||'messung',optionen:[['messung','aus gemessener Warmwassermenge'],['pauschal','ohne Messung: 32 kWh je m²'],['prozent','fester Anteil in %']]},
        {id:'a_energie',label:'Energieverbrauch der Anlage (kWh)',typ:'zahl',wert:h.energieKwh,min:0},{id:'a_wwVol',label:'Warmwassermenge (m³)',typ:'zahl',wert:h.wwVolumen,min:0},
        {id:'a_wwTemp',label:'Warmwassertemperatur (°C)',typ:'zahl',wert:h.wwTemp!=null?h.wwTemp:60},{id:'a_wwProz',label:'Warmwasseranteil (%) bei festem Anteil',typ:'zahl',wert:h.wwProzent,min:0},
        {id:'a_brennwert',label:'Erdgas, Energie brennwertbezogen (× 1,11)',typ:'check',wert:h.brennwert}]:[])
      .concat(...lvNkBeheizt(l).map(e=>[{id:'h_'+e.id,label:'Heizverbrauch '+lvEinheitName(e),typ:'zahl',min:0,wert:(heizE[e.id]||{}).heiz,hinweis:'Einheiten der Heizkostenverteiler oder kWh'},
        {id:'w_'+e.id,label:'Warmwasser '+lvEinheitName(e)+' (m³)',typ:'zahl',min:0,wert:(heizE[e.id]||{}).ww}])),
    heizExtern:vertraegeZ.map(v=>({id:'x_'+v.id,label:'Heiz- und Warmwasserkosten '+lvEinheitName(lvEinheit(l,v.einheitId))+' · '+lvMieterName(v)+' (€)',typ:'betrag',min:0,wert:ex[v.id]})),
    co2:[{id:'a_co2aktiv',label:'CO2-Kosten nach dem CO2KostAufG aufteilen',typ:'check',wert:c.aktiv,breit:true},
      {id:'a_co2kosten',label:'CO2-Kosten laut Brennstoffrechnung (€)',typ:'betrag',wert:c.kosten,min:0},{id:'a_co2kg',label:'CO2-Ausstoß laut Rechnung (kg)',typ:'zahl',wert:c.kg,min:0},
      {id:'a_co2fl',label:'Wohnfläche des Gebäudes (m²)',typ:'zahl',wert:c.flaeche!=null?c.flaeche:(fl||null),min:0},{id:'a_co2nw',label:'Nichtwohngebäude (Aufteilung 50 : 50)',typ:'check',wert:c.nichtwohn}]
  };
  g.alle=[].concat(g.zeit,g.verbrauch,g.heizModus,g.heizVerteilen,g.heizExtern,g.co2);
  return g;
}
function lvNkAbrechnungHtml(l){
  const z=lvNkZeitraum(l), a=lvNkAbr(l,z.von,z.bis), cfg=lvNkCfg(l,a,z.von,z.bis), g=lvNkEinstellFelder(l,z,cfg), h=cfg.heiz||{};
  const heizVorhanden=LVN.kostenImZeitraum(l,z.von,z.bis).some(x=>(LVN.KAT[x.k.kategorie]||{}).heiz);
  const gesperrt=a&&a.gebuchtAm;
  let html='';
  if(!gesperrt) html+=lvBox('Abrechnung '+lvNkZeitText(z.von,z.bis)+' einrichten',
    '<div id="lv_formfehler" class="lv-warn" hidden></div>'+lvFelder(g.zeit,'four')
    +(g.verbrauch.length?'<h3 class="sep">Verbrauchswerte (Zählerstände der Einheiten)</h3>'+lvFelder(g.verbrauch,'four'):'')
    +(heizVorhanden||h.modus!=='ohne'?'<h3 class="sep">Heizung und Warmwasser</h3>'+lvFelder(g.heizModus,'two')
      +(h.modus==='verteilen'?lvFelder(g.heizVerteilen,'four'):'')+(h.modus==='extern'?'<p class="hint">Die Beträge je Mieter aus der Heizkostenabrechnung des Messdienstes (einschließlich Zwischenablesung bei Mieterwechsel) übernehmen; der Rest der Heizkosten gilt als Leerstand.</p>'+lvFelder(g.heizExtern,'two'):'')
      +'<h3 class="sep">CO2-Kostenaufteilung</h3><p class="hint">Bei Heizung mit Öl, Gas oder Fernwärme trägt der Vermieter einen Teil der CO2-Kosten nach dem Stufenmodell (Anlage zum CO2KostAufG); die Angaben stehen auf der Brennstoff- bzw. Wärmerechnung.</p>'+lvFelder(g.co2,'four'):'')
    +'<div class="mdb-actions"><button class="primary" onclick="lvNkEinstellungenSpeichern(true)" data-ic="calc">Abrechnung berechnen</button></div>');
  if(!a) return html+lvBox('Ergebnis','<p class="hint">Einstellungen prüfen und „Abrechnung berechnen“ wählen.</p>');
  const r=LVN.abrechnen(l,cfg);
  return html+lvNkErgebnisHtml(l,a,r);
}
/* Heiz-Wahl ändert, welche Felder erscheinen — die Eingaben werden dabei mitgespeichert */
async function lvNkEinstellungenSpeichern(meldung){
  const l=lvAktiv(), z=lvNkZeitraum(l), a0=lvNkAbr(l,z.von,z.bis), cfg=lvNkCfg(l,a0,z.von,z.bis), g=lvNkEinstellFelder(l,z,cfg);
  const vorhanden=g.alle.filter(f=>document.getElementById('lvf_'+f.id));
  const r=lvFormLesen(vorhanden), w=r.werte;
  if(w.a_von&&w.a_bis&&w.a_bis<w.a_von){ r.ok=false; r.fehler.push('Zeitraum: Ende liegt vor dem Beginn'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const h=Object.assign({},cfg.heiz||{}), c=Object.assign({},cfg.co2||{}), verbrauch=JSON.parse(JSON.stringify(cfg.verbrauch||{}));
  const setz=(o,k,f)=>{ if(f in w) o[k]=w[f]; };
  setz(h,'modus','a_modus'); setz(h,'pvHeiz','a_pvHeiz'); setz(h,'pvWW','a_pvWW'); setz(h,'zeitanteilig','a_zeitanteilig'); setz(h,'wwModus','a_wwModus');
  setz(h,'energieKwh','a_energie'); setz(h,'wwVolumen','a_wwVol'); setz(h,'wwTemp','a_wwTemp'); setz(h,'wwProzent','a_wwProz'); setz(h,'brennwert','a_brennwert');
  h.einheiten=Object.assign({},h.einheiten||{}); h.extern=Object.assign({},h.extern||{});
  Object.keys(w).forEach(k=>{
    let m;
    if((m=/^h_(.+)$/.exec(k))) h.einheiten[m[1]]=Object.assign({},h.einheiten[m[1]],{heiz:w[k]});
    else if((m=/^w_(.+)$/.exec(k))) h.einheiten[m[1]]=Object.assign({},h.einheiten[m[1]],{ww:w[k]});
    else if((m=/^x_(.+)$/.exec(k))){ if(w[k]==null) delete h.extern[m[1]]; else h.extern[m[1]]=w[k]; }
    else if((m=/^v_([\w-]+?)_([\w-]+)$/.exec(k))){
      const kost=(l.kosten||[]).find(x=>k.startsWith('v_'+x.id+'_'));
      if(kost){ const eid=k.slice(('v_'+kost.id+'_').length); verbrauch[kost.id]=verbrauch[kost.id]||{}; if(w[k]==null) delete verbrauch[kost.id][eid]; else verbrauch[kost.id][eid]=w[k]; }
    }
  });
  setz(c,'aktiv','a_co2aktiv'); setz(c,'kosten','a_co2kosten'); setz(c,'kg','a_co2kg'); setz(c,'flaeche','a_co2fl'); setz(c,'nichtwohn','a_co2nw');
  const von=w.a_von||z.von, bis=w.a_bis||z.bis;
  LV.nkZeitraum={jahr:z.jahr,von,bis};
  await lvAendern(l=>{
    l.nkAbrechnungen=l.nkAbrechnungen||[];
    let a=l.nkAbrechnungen.find(x=>x.von===z.von&&x.bis===z.bis);
    if(a&&a.gebuchtAm) return false;
    if(!a){ a={id:LVK.neueId('N')}; l.nkAbrechnungen.push(a); }
    Object.assign(a,{von,bis,vzBasis:w.a_vzBasis||cfg.vzBasis,leerPersonen:'a_leerP' in w?w.a_leerP:cfg.leerPersonen,heiz:h,co2:c,verbrauch});
  },meldung?'Abrechnung berechnet.':'');
}

/* ---------- Ergebnis ---------- */
function lvNkErgebnisHtml(l,a,r){
  const zeilen=r.ergebnisse.map(e=>{ const v=lvVertrag(l,e.vertragId)||{};
    return '<tr><td class="strong">'+lvH(lvEinheitName(lvEinheit(l,e.einheitId)))+'<br><span class="lv-klein">'+lvH(lvMieterName(v))+'</span></td>'
      +'<td>'+lvH(lvNkZeitText(e.von,e.bis))+'<br><span class="lv-klein">'+e.tage+' Tage</span></td>'
      +'<td class="r">'+lvEur(e.kosten)+'</td><td class="r">'+lvEur(e.heiz)+'</td><td class="r">'+(e.co2Erstattung?'− '+lvEur(e.co2Erstattung):'–')+'</td>'
      +'<td class="r">'+lvEur(e.vorauszahlung)+'</td><td class="r strong">'+(e.saldo>0?lvBadge('Nachzahlung '+lvEur(e.saldo),'bad'):e.saldo<0?lvBadge('Guthaben '+lvEur(-e.saldo),'ok'):'ausgeglichen')+'</td>'
      +'<td class="r">'+(e.neueVz?lvEur(e.neueVz.nk)+' / '+lvEur(e.neueVz.hk):'–')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="lvNkWord(\''+lvQ(a.id)+'\',\''+lvQ(e.vertragId)+'\')" data-ic="file-text">Word</button></td></tr>'; });
  const pos=r.positionen.map(p=>'<tr><td>'+lvH(p.text)+(p.umlage?'':' '+lvBadge('nicht umlagefähig','warn'))+'</td><td>'+lvH(p.umlage?(LVN.SCHLUESSEL[p.schluessel]||'')+(p.basisGesamt!=null?' · '+lvZahl(p.basisGesamt,3)+' '+p.basisEinheit:''):'Vermieter')+'</td><td class="r">'+lvEur(p.gesamt)+'</td><td class="r">'+(p.umlage&&p.leer?lvEur(p.leer):'–')+'</td></tr>');
  if(r.heiz.heizung||r.heiz.warmwasser) pos.push('<tr><td>Heizung'+(r.heiz.wwAnteil!=null?' (verbundene Anlage, Warmwasseranteil '+lvZahl(r.heiz.wwAnteil*100,1)+' % nach § 9)':'')+'</td><td>'+(r.heiz.modus==='extern'?'laut Messdienst':'HeizkostenV')+'</td><td class="r">'+lvEur(r.heiz.heizung)+'</td><td class="r" rowspan="2">'+(r.heiz.leerstand?lvEur(r.heiz.leerstand):'–')+'</td></tr>'
    +'<tr><td>Warmwasser</td><td>'+(r.heiz.modus==='extern'?'laut Messdienst':'HeizkostenV')+'</td><td class="r">'+lvEur(r.heiz.warmwasser)+'</td></tr>');
  const summe=r.ergebnisse.reduce((s,e)=>s+e.saldo,0);
  const warn=r.fehler.length?'<div class="lv-warn"><b>Die Abrechnung ist noch nicht vollständig:</b><br>'+r.fehler.map(lvH).join('<br>')+'</div>':'';
  const hinw=r.hinweise.length?'<div class="lv-hinweisbox">'+r.hinweise.map(lvH).join('<br>')+'</div>':'';
  const co2=r.co2?'<p class="hint">CO2: '+lvZahl(r.co2.kgM2a)+' kg je m² und Jahr'+(r.co2.stufe?' → Stufe '+r.co2.stufe:' (Nichtwohngebäude)')+' · Vermieter '+r.co2.vermieterProzent+' %, Mieter '+r.co2.mieterProzent+' % der CO2-Kosten von '+lvEur(r.co2.kosten)+'.</p>':'';
  const frist='<p class="hint">Zustellfrist: '+LVK.datumDE(r.frist)+' (§ 556 Abs. 3 BGB) — danach ist eine Nachforderung ausgeschlossen, außer die Verspätung ist nicht zu vertreten.</p>';
  const gebucht=a.gebuchtAm?'<div class="lv-ok">Zugestellt am '+lvH(LVK.datumDE(a.versandtAm))+', Nachzahlungen und Guthaben am '+lvH(LVK.datumDE(a.gebuchtAm))+' im Mietkonto gebucht. <button class="secondary" onclick="lvNkStorno(\''+lvQ(a.id)+'\')">Buchung zurücknehmen</button></div>':'';
  const buchen=!a.gebuchtAm&&r.ok?'<h3 class="sep">Zustellung vermerken und buchen</h3><p class="hint">Trägt Nachzahlungen und Guthaben als Forderung bzw. Gutschrift ins Mietkonto ein und passt auf Wunsch die Vorauszahlungen an (§ 560 Abs. 4 BGB). Kann zurückgenommen werden.</p>'
    +lvFelder([{id:'b_zugang',label:'Zugang beim Mieter am',typ:'datum',wert:lvHeute()},{id:'b_ziel',label:'Zahlungsziel (Tage)',typ:'zahl',wert:30,min:0},
      {id:'b_vz',label:'Vorauszahlungen anpassen',typ:'check',wert:true},{id:'b_vzAb',label:'Neue Vorauszahlungen ab',typ:'datum',wert:LVK.plusMonate(LVK.monatsErster(LVK.monatVon(lvHeute())),2)}],'four')
    +'<div class="mdb-actions"><button class="primary" onclick="lvNkBuchen(\''+lvQ(a.id)+'\')" data-ic="check">Zustellung vermerken und buchen</button></div>':'';
  return lvBox('Ergebnis '+lvNkZeitText(r.von,r.bis),warn+hinw+gebucht
    +lvTabelle(['Einheit / Mieter','Nutzung',{t:'Betriebskosten',r:1},{t:'Heizung/WW',r:1},{t:'CO2-Anteil Vermieter',r:1},{t:'Vorauszahlungen',r:1},{t:'Ergebnis',r:1},{t:'Neue VZ BK / HK',r:1},''],zeilen,'Im Zeitraum gibt es keine Mietverhältnisse.')
    +'<p class="hint">Summe der Ergebnisse: '+lvEur(summe)+' · Vermieter: Leerstand '+lvEur(r.vermieter.leerstand)+', nicht umlagefähig '+lvEur(r.vermieter.nichtUmlagefaehig)+(r.vermieter.co2?', CO2-Anteil '+lvEur(r.vermieter.co2):'')
    +' · Kontrolle: umlagefähig '+lvEur(r.pruefung.umlagefaehig)+', verteilt '+lvEur(r.pruefung.verteilt)+(Math.abs(r.pruefung.rundung)>0.004?' (Rundung '+lvEur(r.pruefung.rundung)+')':'')+'</p>'+co2+frist
    +'<div class="mdb-actions"><button class="secondary" onclick="lvNkWord(\''+lvQ(a.id)+'\')" data-ic="file-text">Alle Abrechnungen (Word)</button><button class="secondary" onclick="lvNkExcel(\''+lvQ(a.id)+'\')" data-ic="download">Übersicht (Excel)</button></div>'
    +buchen)
    +lvBox('Kostenaufstellung',lvTabelle(['Position','Verteilung',{t:'Gesamt',r:1},{t:'davon Leerstand',r:1}],pos,'Keine Kosten im Zeitraum.'));
}
function lvNkBerechnung(aid){
  const l=lvAktiv(), a=(l.nkAbrechnungen||[]).find(x=>x.id===aid); if(!a) return null;
  const r=LVN.abrechnen(l,lvNkCfg(l,a,a.von,a.bis));
  return {l,a,r};
}
async function lvNkBuchen(aid){
  const b=lvNkBerechnung(aid); if(!b) return;
  if(!b.r.ok){ alert('Die Abrechnung ist noch nicht vollständig:\n'+b.r.fehler.join('\n')); return; }
  const f=[{id:'b_zugang',label:'Zugang',typ:'datum',pflicht:true},{id:'b_ziel',label:'Zahlungsziel',typ:'zahl',min:0},{id:'b_vz',label:'Vorauszahlungen anpassen',typ:'check'},{id:'b_vzAb',label:'Neue Vorauszahlungen ab',typ:'datum'}];
  const r=lvFormLesen(f), w=r.werte;
  if(w.b_vz&&!w.b_vzAb){ r.ok=false; r.fehler.push('Bitte das Datum für die neuen Vorauszahlungen angeben'); }
  if(w.b_vz&&w.b_vzAb&&w.b_vzAb<=w.b_zugang){ r.ok=false; r.fehler.push('Die neuen Vorauszahlungen gelten frühestens nach dem Zugang der Abrechnung'); }
  if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  if(w.b_zugang>b.r.frist&&!confirm('Der Zugang liegt nach der Abrechnungsfrist ('+LVK.datumDE(b.r.frist)+'). Nachforderungen sind dann in der Regel ausgeschlossen (§ 556 Abs. 3 BGB). Trotzdem buchen?')) return;
  const faellig=LVK.isoTag(LVK.tagNr(w.b_zugang)+(w.b_ziel!=null?w.b_ziel:30)), zt=lvNkZeitText(b.a.von,b.a.bis);
  await lvAendern(l=>{
    const a=l.nkAbrechnungen.find(x=>x.id===aid);
    b.r.ergebnisse.forEach(e=>{ const v=lvVertrag(l,e.vertragId); if(!v) return;
      v.sonderposten=v.sonderposten||[];
      if(e.saldo) v.sonderposten.push({id:'S'+aid+'_'+v.id,datum:faellig,betrag:e.saldo,text:'Betriebskostenabrechnung '+zt+(e.saldo>0?' – Nachzahlung':' – Guthaben'),art:'nk_nachzahlung'});
      if(w.b_vz&&e.neueVz&&(!v.ende||v.ende>=w.b_vzAb)) v.aenderungen.push({id:'A'+aid+'_'+v.id,ab:w.b_vzAb,nk:e.neueVz.nk,hk:e.neueVz.hk,grund:'560',notiz:'nach Betriebskostenabrechnung '+zt});
    });
    a.versandtAm=w.b_zugang; a.gebuchtAm=lvHeute();
  },'Zustellung vermerkt; Nachzahlungen und Guthaben sind im Mietkonto gebucht.');
}
async function lvNkStorno(aid){
  if(!confirm('Buchung dieser Abrechnung zurücknehmen? Forderungen, Gutschriften und angepasste Vorauszahlungen aus dieser Abrechnung werden entfernt.')) return;
  await lvAendern(l=>{
    (l.vertraege||[]).forEach(v=>{ v.sonderposten=(v.sonderposten||[]).filter(s=>s.id!=='S'+aid+'_'+v.id); v.aenderungen=(v.aenderungen||[]).filter(x=>x.id!=='A'+aid+'_'+v.id); });
    const a=l.nkAbrechnungen.find(x=>x.id===aid); a.versandtAm=null; a.gebuchtAm=null;
  },'Buchung zurückgenommen.');
}

/* ---------- Word: Abrechnung je Mieter ---------- */
function lvNkBloecke(l,a,r,e){
  const v=lvVertrag(l,e.vertragId)||{}, ein=lvEinheit(l,e.einheitId)||{}, ab=LV.einst||{}, b=[], zt=lvNkZeitText(r.von,r.bis);
  const wohn=LVK.istWohnraum(v,l);
  if(ab.name||ab.anschrift) b.push({typ:'p',text:[ab.name,ab.anschrift].filter(Boolean).join(' · ')});
  b.push({typ:'p',text:lvMieterName(v)+'\n'+(l.strasse||l.name||'')+(ein.lage?', '+ein.lage:'')+'\n'+[l.plz,l.ort].filter(Boolean).join(' ')});
  b.push({typ:'p',text:(ab.ort||l.ort||'')+((ab.ort||l.ort)?', ':'')+LVK.datumDE(lvHeute())});
  b.push({typ:'h2',text:'Betriebs- und Heizkostenabrechnung '+zt});
  b.push({typ:'p',runs:[{text:'Mietobjekt: ',fett:true},{text:(l.strasse||l.name)+', '+lvEinheitName(ein)+(ein.flaeche?' ('+lvZahl(ein.flaeche)+' m²)':'')}]});
  b.push({typ:'p',runs:[{text:'Abrechnungszeitraum: ',fett:true},{text:zt+' ('+r.tage+' Tage) · '},{text:'Ihre Nutzungszeit: ',fett:true},{text:lvNkZeitText(e.von,e.bis)+' ('+e.tage+' Tage)'}]});
  b.push({typ:'p',runs:[{text:'1. Betriebskosten',fett:true}]});
  const zeilen=[[{text:'Kostenart'},{text:'Gesamtkosten',rechts:true},{text:'Verteilung'},{text:'Ihr Anteil',rechts:true}]];
  r.positionen.filter(p=>p.umlage).forEach(p=>{
    const bas=(e.basis||{})[p.id], betrag=(e.positionen||{})[p.id];
    if(betrag==null&&!bas) return;
    const vt=(LVN.SCHLUESSEL[p.schluessel]||'')+': '+(bas?lvZahl(bas.wert,3):'0')+' von '+lvZahl(p.basisGesamt,3)+' '+p.basisEinheit+(['flaeche','mea','einheiten'].includes(p.schluessel)&&bas?', '+bas.tage+' von '+r.tage+' Tagen':'');
    zeilen.push([{text:p.text+(p.abgegrenzt?' (anteilig für den Zeitraum, Rechnung '+lvEur(p.belegGesamt)+')':'')},{text:lvEur(p.gesamt),rechts:true},{text:vt},{text:lvEur(betrag||0),rechts:true}]);
  });
  zeilen.push(Object.assign([{text:'Summe Betriebskosten'},{text:''},{text:''},{text:lvEur(e.kosten),rechts:true}],{fett:true}));
  b.push({typ:'tabelle',zeilen});
  if(r.heiz.heizung||r.heiz.warmwasser||e.heiz){
    b.push({typ:'p',runs:[{text:'2. Heizung und Warmwasser',fett:true}]});
    const h=(a.heiz||{}), hz=[[{text:'Position'},{text:'Gesamt',rechts:true},{text:'Verteilung'},{text:'Ihr Anteil',rechts:true}]];
    if(r.heiz.modus==='extern') hz.push([{text:'Heiz- und Warmwasserkosten laut Abrechnung des Messdienstes'},{text:lvEur(r.heiz.heizung+r.heiz.warmwasser),rechts:true},{text:'Messdienst'},{text:lvEur(e.heiz),rechts:true}]);
    else {
      const x=(h.einheiten||{})[e.einheitId]||{};
      hz.push([{text:'Heizung'+(r.heiz.wwAnteil!=null?' (Warmwasseranteil der verbundenen Anlage '+lvZahl(r.heiz.wwAnteil*100,1)+' % nach § 9 HeizkostenV abgezogen)':'')},{text:lvEur(r.heiz.heizung),rechts:true},
        {text:(h.pvHeiz!=null?h.pvHeiz:70)+' % nach Verbrauch (Ihr Verbrauch '+lvZahl(x.heiz)+'), '+(100-(h.pvHeiz!=null?h.pvHeiz:70))+' % nach Fläche'},{text:lvEur(e.heizung),rechts:true}]);
      hz.push([{text:'Warmwasser'},{text:lvEur(r.heiz.warmwasser),rechts:true},{text:(h.pvWW!=null?h.pvWW:70)+' % nach Verbrauch (Ihr Verbrauch '+lvZahl(x.ww)+' m³), '+(100-(h.pvWW!=null?h.pvWW:70))+' % nach Fläche'},{text:lvEur(e.warmwasser),rechts:true}]);
    }
    hz.push(Object.assign([{text:'Summe Heizung und Warmwasser'},{text:''},{text:''},{text:lvEur(e.heiz),rechts:true}],{fett:true}));
    b.push({typ:'tabelle',zeilen:hz});
  }
  if(r.co2&&e.co2Anteil){
    b.push({typ:'p',runs:[{text:'CO2-Kostenaufteilung (CO2KostAufG): ',fett:true},{text:'Kohlendioxidausstoß des Gebäudes '+lvZahl(r.co2.kg,0)+' kg bei '+lvZahl(r.co2.flaeche)+' m² Wohnfläche = '+lvZahl(r.co2.kgM2a)+' kg je m² und Jahr'
      +(r.co2.stufe?' (Stufe '+r.co2.stufe+' der Anlage zum Gesetz)':' (Nichtwohngebäude)')+'. Davon tragen der Vermieter '+r.co2.vermieterProzent+' % und der Mieter '+r.co2.mieterProzent+' %. '
      +'Die CO2-Kosten des Gebäudes betragen '+lvEur(r.co2.kosten)+'; Ihr Anteil daran '+lvEur(e.co2Anteil)+', davon übernimmt der Vermieter '+lvEur(e.co2Erstattung)+'.'}]});
  }
  b.push({typ:'p',runs:[{text:'3. Ergebnis',fett:true}]});
  const er=[[{text:'Betriebskosten'},{text:lvEur(e.kosten),rechts:true}],[{text:'Heizung und Warmwasser'},{text:lvEur(e.heiz),rechts:true}]];
  if(e.co2Erstattung) er.push([{text:'abzüglich CO2-Kostenanteil des Vermieters'},{text:'− '+lvEur(e.co2Erstattung),rechts:true}]);
  er.push([{text:'abzüglich Ihrer Vorauszahlungen'+(a.vzBasis==='ist'?' (geleistet)':'')},{text:'− '+lvEur(e.vorauszahlung),rechts:true}]);
  er.push(Object.assign([{text:e.saldo>=0?'Nachzahlung':'Guthaben'},{text:lvEur(Math.abs(e.saldo)),rechts:true}],{fett:true}));
  b.push({typ:'tabelle',zeilen:er});
  const faellig=a.versandtAm?LVK.datumDE(LVK.isoTag(LVK.tagNr(a.versandtAm)+30)):'innerhalb von 30 Tagen nach Zugang';
  if(e.saldo>0) b.push({typ:'p',text:'Bitte überweisen Sie die Nachzahlung von '+lvEur(e.saldo)+(a.versandtAm?' bis zum '+faellig:' '+faellig)+(l.iban?' auf das Konto'+(l.kontoInhaber?' von '+l.kontoInhaber:'')+', IBAN '+LVK.ibanLesbar(l.iban)+(l.bank?' ('+l.bank+')':''):'')+'.'});
  else if(e.saldo<0) b.push({typ:'p',text:'Das Guthaben von '+lvEur(-e.saldo)+' erstatten wir Ihnen bzw. verrechnen es mit der nächsten Mietzahlung.'});
  if(e.neueVz){
    const aend=(v.aenderungen||[]).find(x=>x.id==='A'+a.id+'_'+v.id);
    b.push({typ:'p',text:'Anpassung der Vorauszahlungen (§ 560 Abs. 4 BGB): Auf Grundlage dieser Abrechnung betragen die monatlichen Vorauszahlungen '+(aend?'ab dem '+LVK.datumDE(aend.ab):'künftig')
      +' '+lvEur(e.neueVz.nk)+' für Betriebskosten und '+lvEur(e.neueVz.hk)+' für Heizung und Warmwasser.'});
  }
  if(wohn&&(e.p35a||[]).length){
    b.push({typ:'p',runs:[{text:'Steuerlich absetzbare Aufwendungen nach § 35a EStG (Ihr Anteil an den Arbeitskosten)',fett:true}]});
    b.push({typ:'tabelle',zeilen:[[{text:'Leistung'},{text:'Art'},{text:'Betrag',rechts:true}]].concat(e.p35a.map(x=>[{text:x.text},{text:x.art==='handwerker'?'Handwerkerleistung (Abs. 3)':'haushaltsnahe Dienstleistung (Abs. 2)'},{text:lvEur(x.betrag),rechts:true}]))});
  }
  const hinweise=r.hinweise.filter(t=>!/^Einheit /.test(t)||t.indexOf('Einheit '+(ein.nr||'')+':')===0);
  hinweise.forEach(t=>b.push({typ:'p',text:'Hinweis: '+t}));
  b.push({typ:'p',text:'Die Belege können Sie nach Vereinbarung einsehen. Einwendungen gegen diese Abrechnung teilen Sie uns bitte spätestens bis zum Ablauf des zwölften Monats nach Zugang mit (§ 556 Abs. 3 Satz 5 BGB).'});
  b.push({typ:'p',text:'Mit freundlichen Grüßen'},{typ:'p',text:ab.name||''});
  return b;
}
function lvNkWord(aid,vid){
  const x=lvNkBerechnung(aid); if(!x) return;
  if(!x.r.ok&&!confirm('Die Abrechnung ist noch nicht vollständig:\n'+x.r.fehler.join('\n')+'\nTrotzdem als Entwurf ausgeben?')) return;
  const liste=x.r.ergebnisse.filter(e=>!vid||e.vertragId===vid);
  if(!liste.length){ alert('Keine Mietverhältnisse im Zeitraum.'); return; }
  let b=[];
  liste.forEach((e,i)=>{ if(i) b.push({typ:'umbruch'}); b=b.concat(lvNkBloecke(x.l,x.a,x.r,e)); });
  const titel='Betriebskostenabrechnung '+x.a.von.slice(0,4)+(vid?' '+lvMieterName(lvVertrag(x.l,vid)):' '+x.l.name);
  lvHerunterladen(ImmoOffice.docx(b,{titel}),LV_DOCX,lvDateiname(titel)+'.docx');
}
function lvNkExcel(aid){
  const x=lvNkBerechnung(aid); if(!x) return; const {l,r}=x;
  const kopf=['Einheit','Mieter','von','bis','Tage','Betriebskosten','Heizung','Warmwasser','CO2-Anteil Mieter','CO2 übernimmt Vermieter','Vorauszahlungen','Ergebnis','Neue VZ BK','Neue VZ HK'].map(t=>({v:t,s:'fett'}));
  const ue=[[{v:'Betriebs- und Heizkostenabrechnung '+lvNkZeitText(r.von,r.bis),s:'titel'}],[l.name+' · '+lvAdresse(l)],[],kopf].concat(r.ergebnisse.map(e=>{ const v=lvVertrag(l,e.vertragId)||{};
    return [lvEinheitName(lvEinheit(l,e.einheitId)),lvMieterName(v),LVK.datumDE(e.von),LVK.datumDE(e.bis),e.tage,{v:e.kosten,s:'eurc'},{v:e.heizung,s:'eurc'},{v:e.warmwasser,s:'eurc'},
      {v:e.co2Anteil,s:'eurc'},{v:e.co2Erstattung,s:'eurc'},{v:e.vorauszahlung,s:'eurc'},{v:e.saldo,s:'fetteurc'},e.neueVz?{v:e.neueVz.nk,s:'eurc'}:'',e.neueVz?{v:e.neueVz.hk,s:'eurc'}:''];
  }));
  ue.push([],[{v:'Vermieter',s:'fett'}],['Leerstand','',{v:r.vermieter.leerstand,s:'eurc'}],['nicht umlagefähig','',{v:r.vermieter.nichtUmlagefaehig,s:'eurc'}],['CO2-Anteil','',{v:r.vermieter.co2,s:'eurc'}],
    ['Kontrolle: umlagefähig','',{v:r.pruefung.umlagefaehig,s:'eurc'}],['Kontrolle: verteilt','',{v:r.pruefung.verteilt,s:'eurc'}]);
  const vv=r.ergebnisse;
  const pos=[[{v:'Position',s:'fett'},{v:'Schlüssel',s:'fett'},{v:'Gesamt',s:'fett'},{v:'Leerstand',s:'fett'}].concat(vv.map(e=>({v:lvEinheitName(lvEinheit(l,e.einheitId))+' '+lvMieterName(lvVertrag(l,e.vertragId)||{}),s:'fett'})))]
    .concat(r.positionen.map(p=>[p.text,p.umlage?LVN.SCHLUESSEL[p.schluessel]||'':'nicht umlagefähig',{v:p.gesamt,s:'eurc'},p.umlage?{v:p.leer,s:'eurc'}:''].concat(vv.map(e=>{ const b=(e.positionen||{})[p.id]; return b!=null?{v:b,s:'eurc'}:''; }))));
  const datei=ImmoOffice.xlsx([{name:'Übersicht',spalten:[14,24,11,11,7,14,12,12,12,14,14,13,11,11],zeilen:ue},{name:'Positionen',spalten:[34,20,12,12].concat(vv.map(()=>20)),zeilen:pos}],{titel:'Betriebskostenabrechnung '+r.von.slice(0,4)});
  lvHerunterladen(datei,LV_XLSX,lvDateiname('Betriebskosten '+r.von.slice(0,4)+' '+l.name)+'.xlsx');
}

/* ---------- Einhängen ---------- */
lvReiterRegistrieren('nebenkosten','Nebenkosten',l=>lvNebenkostenHtml(l));
lvFristenQuelleRegistrieren((l,st,h)=>LVN.fristen(l,st,h));
LV_FRIST_ZIELE.nk_frist=jahr=>{ LV.reiter='nebenkosten'; LV.nkJahr=jahr||null; LV.nkZeitraum=null; LV.nkAnsicht='abrechnung'; };
