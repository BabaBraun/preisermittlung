/* ---------- Datengrundlagen: Marktdaten des Gutachterausschusses mit Quelle, Stand und Modell ----------
   § 10 ImmoWertV (Grundsatz der Modellkonformität): Sachwertfaktoren und Liegenschaftszinssätze dürfen nur
   in dem Modell angewendet werden, in dem der Gutachterausschuss sie abgeleitet hat. Die App hält deshalb
   je Marktbericht einen Datensatz mit Quelle, Stand, Gebiet, Modell und den Tabellen; die Bewertung merkt
   sich, welcher Satz gilt (pq_satz) und woher jeder Ansatz stammt (pq_*_quelle). Werte werden NICHT
   vorbelegt — sie kommen aus dem Marktbericht des zuständigen Gutachterausschusses. */
const PQ_KEY='ia_parameter';
const PQ_KAT=[['efh','Ein-/Zweifamilienhaus freistehend'],['rh','Reihen- und Doppelhaus'],['mfh','Mehrfamilienhaus'],
  ['wgh','Wohn- und Geschäftshaus'],['etw','Eigentumswohnung'],['gewerbe','Gewerbe / Büro']];
function pqSets(){ try{ return JSON.parse(localStorage.getItem(PQ_KEY))||[]; }catch(e){ return []; } }
function pqSpeichern(l){ try{ localStorage.setItem(PQ_KEY,JSON.stringify(l)); return true; }catch(e){ alert('Die Marktdaten konnten nicht gespeichert werden.'); return false; } }
function pqSatz(){ let id=exV('pq_satz'); return id?pqSets().find(s=>s.id===id)||null:null; }
function pqKategorie(){
  if(modus()==='wohnung') return 'etw';
  let t=exV('ek_typ');
  if(/^EFH/.test(t)) return 'efh';
  if(/^(Doppel|Reihen)/.test(t)) return 'rh';
  if(/^Mehrfamilienhaus/.test(t)) return 'mfh';
  if(/^(Wohn-\/Geschäftshaus|Geschäftshaus mit Wohnungen)/.test(t)) return 'wgh';
  return 'gewerbe';
}
function pqKatName(k){ let x=PQ_KAT.find(a=>a[0]===k); return x?x[1]:k; }
function pqStandText(s){ return s&&s.stand?new Date(s.stand+'T00:00:00').toLocaleDateString('de-DE'):'ohne Stand'; }
/* Sachwertfaktor: Zeile der Kategorie, in deren Spanne der vorläufige Sachwert fällt; sonst die nächste */
function pqSachwertfaktor(s,kat,vorlauf){
  let z=(s&&s.sachwert||[]).filter(r=>r.kat===kat&&r.faktor>0);
  if(!z.length) return null;
  let t=z.find(r=>vorlauf>=(r.von||0)&&(!(r.bis>0)||vorlauf<r.bis));
  if(t) return {zeile:t,exakt:true};
  let n=z.slice().sort((a,b)=>Math.min(Math.abs(vorlauf-(a.von||0)),Math.abs(vorlauf-(a.bis||a.von||0)))-Math.min(Math.abs(vorlauf-(b.von||0)),Math.abs(vorlauf-(b.bis||b.von||0))))[0];
  return {zeile:n,exakt:false};
}
function pqLiegenschaftszins(s,kat){ let z=(s&&s.lz||[]).filter(r=>r.kat===kat&&r.lz>0); return z.length?z[0]:null; }
function pqSpanneText(r){ return (r.von>0?'ab '+eur(r.von):'')+(r.von>0&&r.bis>0?' ':'')+(r.bis>0?'bis unter '+eur(r.bis):''); }
function pqQuelleText(s){ return s?[s.titel,'Stand '+pqStandText(s)].filter(Boolean).join(', '):''; }
/* Modellkonformität: was im Modell des Gutachterausschusses anders ist als in dieser Bewertung */
function pqKonformitaet(){
  let s=pqSatz(), w=modus()==='wohnung', erg=[];
  if(!s){ erg.push({ok:false,t:'Kein Marktbericht gewählt — Sachwertfaktor und Liegenschaftszins sind nicht belegt.'}); return erg; }
  let m=s.modell||{};
  if(!w){
    let gnd=num('nhkhg_gnd');
    if(m.gnd>0) erg.push(gnd===m.gnd?{ok:true,t:'Gesamtnutzungsdauer '+gnd+' Jahre wie im Modell des Gutachterausschusses.'}
      :{ok:false,t:'Gesamtnutzungsdauer: Bewertung '+gnd+' Jahre, Modell des Gutachterausschusses '+m.gnd+' Jahre — der Sachwertfaktor ist so nicht modellkonform (§ 10 ImmoWertV).'});
    if(m.nhk) erg.push(/2010/.test(m.nhk)?{ok:true,t:'Normalherstellungskosten NHK 2010 wie im Modell.'}:{ok:false,t:'Modell nutzt '+m.nhk+', die App rechnet mit NHK 2010.'});
    if(m.rnd) erg.push(/Anlage 2/.test(m.rnd)?{ok:true,t:'Restnutzungsdauer nach Anlage 2 ImmoWertV wie im Modell.'}:{ok:false,t:'Modell ermittelt die Restnutzungsdauer '+m.rnd+' — die App nach Anlage 2 ImmoWertV.'});
    if(m.awm) erg.push(/linear/.test(m.awm)?{ok:true,t:'Lineare Alterswertminderung wie im Modell.'}:{ok:false,t:'Modell rechnet die Alterswertminderung '+m.awm+' — die App linear.'});
  }
  let st=exV('ek_stichtag'), jahre=s.stand&&st?(new Date(st)-new Date(s.stand))/31557600000:null;
  if(jahre!=null) erg.push(jahre>2.5?{ok:false,t:'Die Marktdaten sind zum Stichtag '+num2(jahre).replace(/,\d+$/,'')+' Jahre alt — gibt es einen neueren Marktbericht?'}
    :jahre<-0.1?{ok:false,t:'Die Marktdaten liegen nach dem Wertermittlungsstichtag.'}:{ok:true,t:'Marktdaten zeitnah zum Stichtag.'});
  if(m.bemerkung) erg.push({ok:true,t:'Hinweis zum Modell: '+m.bemerkung});
  return erg;
}
/* Abschnitt ④b im Formular */
function pqRender(){
  try{ bpiAmtlichInfo(); }catch(e){}
  let box=$('pq_tabelle'); if(!box) return;
  let s=pqSatz(), R=window._R||{}, w=modus()==='wohnung', kat=pqKategorie();
  let chip=$('pq_chip'); if(chip) chip.innerHTML=s?'<b>'+sEsc(s.titel||'Marktbericht')+'</b><span>'+sEsc([s.gebiet,'Stand '+pqStandText(s)].filter(Boolean).join(' · '))+'</span>'
    :'<b>Kein Marktbericht gewählt</b><span>'+(pqSets().length?'Einen gespeicherten wählen oder neu anlegen.':'Die Werte aus dem Immobilienmarktbericht deines Gutachterausschusses einmal anlegen.')+'</span>';
  let sf=s&&!w?pqSachwertfaktor(s,kat,R.vorlauf||0):null, lz=s?pqLiegenschaftszins(s,kat):null;
  let miete=num('ek_wohnflaeche')>0&&num('ek_miete_wohnen')>0?num('ek_miete_wohnen')/12/num('ek_wohnflaeche'):0;
  let zeilen=[];
  const zeile=(k,label,wert,laut,quelleId,ph,knopf,sichtbar)=>zeilen.push({k,label,wert,laut,quelleId,ph,knopf,sichtbar:sichtbar!==false});
  let lautSf=sf?num2(sf.zeile.faktor)+'<small>'+sEsc(pqKatName(kat))+(pqSpanneText(sf.zeile)?', '+pqSpanneText(sf.zeile):'')+(sf.exakt?'':' — außerhalb der Spannen, nächste Klasse')+'</small>':(s&&!w?'<span class="u">keine Angabe für '+sEsc(pqKatName(kat))+'</span>':'');
  let gleich=sf&&Math.abs(num('markt_faktor')-sf.zeile.faktor)<0.0005;
  zeile('sf','Sachwertfaktor',num2(num('markt_faktor')),lautSf,'pq_sf_quelle','z. B. Immobilienmarktbericht 2025, Abschnitt Sachwertfaktoren',
    sf&&!gleich?'<button class="secondary" onclick="pqUebernehmen(\'sf\')">übernehmen</button>':(sf?'<span class="pq-ok">✓</span>':''),!w);
  let lautLz=lz?num2(lz.lz)+' %<small>'+sEsc(pqKatName(kat))+(lz.spanne?', Spanne '+sEsc(lz.spanne):'')+'</small>':(s?'<span class="u">keine Angabe für '+sEsc(pqKatName(kat))+'</span>':'');
  let lzGleich=lz&&Math.abs(num('er_zins_basis')-lz.lz)<0.0005;
  zeile('lz','Liegenschaftszins',num2(num('er_zins_basis'))+' %'+(num('er_zins_adj')?'<small>'+(num('er_zins_adj')>0?'+':'')+num2(num('er_zins_adj'))+' Pp. Zu-/Abschlag</small>':''),lautLz,'pq_lz_quelle','z. B. Immobilienmarktbericht 2025, Abschnitt Liegenschaftszinssätze',
    lz&&!lzGleich?'<button class="secondary" onclick="pqUebernehmen(\'lz\')">übernehmen</button>':(lz?'<span class="pq-ok">✓</span>':''));
  zeile('brw','Bodenrichtwert',num('ek_brw')>0?eur(num('ek_brw')).replace(' €',' €/m²'):'–','','pq_brw_quelle','z. B. BORIS-BW, Bodenrichtwert zum 01.01.2025, Zone …',
    typeof lageOeffnen==='function'?'<button class="secondary" onclick="lageOeffnen(\'brw\')">BORIS-BW</button>':'',!w);
  let ba=bpiAmtlich(), baGleich=ba&&Math.abs(num('bpi')-ba.wert)<0.05&&Math.abs(num('bpi_faktor')-ba.faktor)<0.0006;
  zeile('bpi','Baupreisindex',num2(num('bpi'))+'<small>Basis 2021 = 100</small>',ba?num2(ba.wert)+'<small>'+sEsc(ba.name+', '+ImmoBaupreisindex.monatText(ba.monat))+(ba.vorlaeufig?' — vorläufig':'')+', Stat. Landesamt BW</small>':'','pq_bpi_quelle','z. B. Statistisches Landesamt BW, Wohngebäude, Mai 2026',
    ba&&!baGleich?'<button class="secondary" onclick="bpiAmtlichUebernehmen()">übernehmen</button>':(ba?'<span class="pq-ok">✓</span>':''),!w);
  let gnd=num('nhkhg_gnd'), mg=s&&s.modell&&s.modell.gnd;
  zeile('gnd','Gesamtnutzungsdauer',gnd+' Jahre',mg?mg+' Jahre<small>Modell des Gutachterausschusses</small>':'','pq_gnd_quelle','Anlage 1 ImmoWertV bzw. Modell des Gutachterausschusses',
    mg&&mg!==gnd?'<button class="secondary" onclick="pqUebernehmen(\'gnd\')">übernehmen</button>':(mg?'<span class="pq-ok">✓</span>':''),!w);
  zeile('miete','Marktmiete',miete>0?num2(miete)+' €/m²<small>je Monat, aus der Jahresmiete</small>':'–','','pq_miete_quelle','z. B. Mietspiegel Ilsfeld 2025, eigene Vermietungsdaten','');
  // Tabelle nur einmal aufbauen — danach bleiben die Quellenfelder stehen (sonst springt beim Tippen der Cursor heraus)
  if(!box.querySelector('table')){
    box.innerHTML='<table class="nhk pq-tab"><thead><tr><th>Ansatz</th><th>in dieser Bewertung</th><th>laut Marktbericht</th><th></th></tr></thead>'
      +zeilen.map(r=>'<tbody data-k="'+r.k+'"><tr><td class="pq-a">'+r.label+'</td><td class="pq-w"></td><td class="pq-l"></td><td class="pq-k"></td></tr>'
        +'<tr class="pq-q"><td colspan="4"><input id="'+r.quelleId+'" value="" placeholder="Quelle / Stand — '+sEsc(r.ph)+'" aria-label="Quelle '+r.label+'"></td></tr></tbody>').join('')+'</table>';
  }
  zeilen.forEach(r=>{ let tr=box.querySelector('tbody[data-k="'+r.k+'"]'); if(!tr) return;
    tr.style.display=r.sichtbar?'':'none'; tr.querySelector('.pq-w').innerHTML=r.wert; tr.querySelector('.pq-l').innerHTML=r.laut||'<span class="u">–</span>'; tr.querySelector('.pq-k').innerHTML=r.knopf||''; });
  let k=pqKonformitaet(), el=$('pq_konform');
  if(el) el.innerHTML='<b>Modellkonformität (§ 10 ImmoWertV)</b><ul>'+k.map(x=>'<li class="'+(x.ok?'ok':'warn')+'">'+sEsc(x.t)+'</li>').join('')+'</ul>';
}
function pqUebernehmen(was){
  let s=pqSatz(), R=window._R||{}, kat=pqKategorie(); if(!s) return;
  if(was==='sf'){ let sf=pqSachwertfaktor(s,kat,R.vorlauf||0); if(!sf) return; $('markt_faktor').value=(''+sf.zeile.faktor).replace('.',',');
    $('pq_sf_quelle').value=pqQuelleText(s)+', '+pqKatName(kat)+(pqSpanneText(sf.zeile)?', vorl. Sachwert '+pqSpanneText(sf.zeile):''); }
  if(was==='lz'){ let lz=pqLiegenschaftszins(s,kat); if(!lz) return; $('er_zins_basis').value=(''+lz.lz).replace('.',',');
    $('pq_lz_quelle').value=pqQuelleText(s)+', '+pqKatName(kat)+(lz.spanne?', Spanne '+lz.spanne:''); }
  if(was==='gnd'){ let g=s.modell&&s.modell.gnd; if(!(g>0)) return; $('nhkhg_gnd').value=g; $('pq_gnd_quelle').value='Modell '+pqQuelleText(s); }
  compute(); autosave();
}
/* Amtlicher Baupreisindex BW (js/baupreisindex.js) zum Wertermittlungsstichtag für die gewählte Gebäudeart */
function bpiAmtlich(){
  if(typeof ImmoBaupreisindex==='undefined') return null;
  let art=($('bpi_art')||{}).value||ImmoBaupreisindex.artAusTyp(($('ek_typ')||{}).value);
  return ImmoBaupreisindex.wertFuer(art,exV('ek_stichtag')||new Date().toISOString().slice(0,10));
}
function bpiAmtlichUebernehmen(){
  let r=bpiAmtlich(); if(!r) return;
  $('bpi').value=(''+r.wert).replace('.',',');
  $('bpi_faktor').value=(''+r.faktor).replace('.',',');
  if($('pq_bpi_quelle')) $('pq_bpi_quelle').value=ImmoBaupreisindex.quelleText(r);
  compute(); autosave(); bpiAmtlichInfo();
}
function bpiAmtlichInfo(){
  let el=$('bpi_amtlich_info'), r=bpiAmtlich(); if(!el) return;
  el.textContent=r?r.name+', '+ImmoBaupreisindex.monatText(r.monat)+': '+(''+r.wert).replace('.',',')+' × '+(''+r.faktor).replace('.',',')+(r.vorlaeufig?' (vorläufig — neueres Quartal noch nicht eingebaut)':''):'';
  let s=$('bpi_stand'); if(s&&typeof ImmoBaupreisindex!=='undefined') s.textContent=ImmoBaupreisindex.monatText(ImmoBaupreisindex.STAND);
}
/* Bericht: Datengrundlagen und Modellkonformität */
function pqBericht(esc){
  let w=modus()==='wohnung', s=pqSatz();
  let zeilen=[];
  const z=(a,b,q)=>zeilen.push('<tr><td>'+a+'</td><td>'+b+'</td><td>'+esc(q||'–')+'</td></tr>');
  if(!w) z('Sachwertfaktor',num2(num('markt_faktor')),exV('pq_sf_quelle'));
  z('Liegenschaftszins',num2(num('er_zins_basis')+num('er_zins_adj'))+' %',exV('pq_lz_quelle')+(num('er_zins_adj')?' (inkl. '+(num('er_zins_adj')>0?'+':'')+num2(num('er_zins_adj'))+' Pp. Zu-/Abschlag)':''));
  if(!w){ z('Bodenrichtwert',eur(num('ek_brw'))+'/m²',exV('pq_brw_quelle')); z('Baupreisindex',num2(num('bpi'))+' (2021 = 100)',exV('pq_bpi_quelle')); z('Gesamtnutzungsdauer',num('nhkhg_gnd')+' Jahre',exV('pq_gnd_quelle')); }
  if(num('ek_miete_wohnen')>0) z('Marktmiete (Jahresrohertrag)',eur(num('ek_miete_wohnen')),exV('pq_miete_quelle'));
  if(!zeilen.some(x=>!/<td>–<\/td><\/tr>$/.test(x))&&!s) return '';
  let k=pqKonformitaet();
  return '<h2>Datengrundlagen und Modellkonformität</h2>'
    +'<table class="pq-bericht"><tr><td><b>Ansatz</b></td><td><b>Wert</b></td><td><b>Quelle / Stand</b></td></tr>'+zeilen.join('')+'</table>'
    +(w?'':'<div class="beschr">Modell der Wertermittlung: Normalherstellungskosten NHK 2010, hochgerechnet mit dem Baupreisindex; Restnutzungsdauer nach Anlage 2 ImmoWertV; lineare Alterswertminderung; Marktanpassung über den Sachwertfaktor.</div>')
    +'<div class="beschr">'+k.map(x=>(x.ok?'✓ ':'⚠ ')+esc(x.t)).join('\n')+'</div>';
}

/* ---------- Verwaltung der Marktberichte ---------- */
var PQ_EDIT=null;
function pqOeffnen(){ let o=$('pq_overlay'); o.classList.add('on'); document.body.style.overflow='hidden'; pqListe(); }
function pqSchliessen(){ let o=$('pq_overlay'); o.classList.remove('on'); document.body.style.overflow=''; PQ_EDIT=null; pqRender(); }
function pqInhalt(h){ $('pq_inhalt').innerHTML=h; $('pq_overlay').scrollTop=0; }
function pqListe(){
  PQ_EDIT=null;
  let l=pqSets(), akt=exV('pq_satz');
  pqInhalt('<div class="gr-kopf"><h2 id="pq_titel">Marktdaten der Gutachterausschüsse</h2><button class="gr-x" onclick="pqSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<p class="hint" style="margin-top:0">Je Immobilienmarktbericht ein Datensatz: Sachwertfaktoren, Liegenschaftszinssätze und das Modell, in dem der Gutachterausschuss sie abgeleitet hat. '
    +'Für Abstatt, Beilstein und Ilsfeld ist der Gemeinsame Gutachterausschuss südwestlicher Landkreis Heilbronn (Geschäftsstelle Eppingen) zuständig. Die Werte stehen in dessen Marktbericht — die App gibt keine vor.</p>'
    +(l.length?'<div class="kd-liste">'+l.map(s=>'<div class="kd-karte"><div><b>'+sEsc(s.titel||'Ohne Titel')+(s.id===akt?' <span class="pq-akt">in dieser Bewertung</span>':'')+'</b>'
      +'<span>'+sEsc([s.gebiet,'Stand '+pqStandText(s),(s.sachwert||[]).length+' Sachwertfaktoren',(s.lz||[]).length+' Liegenschaftszinsen'].filter(Boolean).join(' · '))+'</span></div>'
      +'<div class="kd-k">'+(s.id===akt?'':'<button class="primary" onclick="pqWaehlen(\''+s.id+'\')">Für diese Bewertung</button>')
      +'<button class="secondary" onclick="pqBearbeiten(\''+s.id+'\')">Bearbeiten</button></div></div>').join('')+'</div>'
      :'<div class="kd-leer">Noch kein Marktbericht angelegt.</div>')
    +'<div class="gr-zeile"><button class="primary" onclick="pqNeu()" data-ic="plus">Marktbericht anlegen</button><button class="secondary" onclick="pqImport()">Datei einlesen</button>'
    +(akt?'<button class="secondary" onclick="pqWaehlen(\'\')">Zuordnung dieser Bewertung lösen</button>':'')+'</div>');
}
function pqWaehlen(id){ $('pq_satz').value=id; compute(); autosave(); pqListe(); }
function pqNeu(){
  let s={id:'pq'+Date.now().toString(36),titel:'',quelle:'',stand:'',gebiet:'',modell:{nhk:'NHK 2010',gnd:80,rnd:'nach Anlage 2 ImmoWertV',awm:'linear',bemerkung:''},sachwert:[],lz:[]};
  let l=pqSets(); l.push(s); if(pqSpeichern(l)) pqBearbeiten(s.id);
}
function pqBearbeiten(id){
  let s=pqSets().find(x=>x.id===id); if(!s) return; PQ_EDIT=id;
  const f=(k,label,ph,typ)=>'<div class="field"><label>'+label+'</label><input'+(typ?' type="'+typ+'"':'')+' value="'+sEsc(s[k]||'')+'" placeholder="'+sEsc(ph||'')+'" onchange="pqFeld(\''+k+'\',this.value)" aria-label="'+label+'"></div>';
  const m=(k,label,ph)=>'<div class="field"><label>'+label+'</label><input value="'+sEsc((s.modell||{})[k]==null?'':s.modell[k])+'" placeholder="'+sEsc(ph||'')+'" onchange="pqModell(\''+k+'\',this.value)" aria-label="'+label+'"></div>';
  const katOpt=k=>PQ_KAT.map(x=>'<option value="'+x[0]+'"'+(x[0]===k?' selected':'')+'>'+x[1]+'</option>').join('');
  const sfZ=(r,i)=>'<tr><td><select onchange="pqZeile(\'sachwert\','+i+',\'kat\',this.value)" aria-label="Objektart">'+katOpt(r.kat)+'</select></td>'
    +'<td><input value="'+(r.von||'')+'" placeholder="0" onchange="pqZeile(\'sachwert\','+i+',\'von\',this.value)" aria-label="vorläufiger Sachwert von"></td>'
    +'<td><input value="'+(r.bis||'')+'" placeholder="offen" onchange="pqZeile(\'sachwert\','+i+',\'bis\',this.value)" aria-label="vorläufiger Sachwert bis unter"></td>'
    +'<td><input value="'+(r.faktor?(''+r.faktor).replace('.',','):'')+'" placeholder="1,20" onchange="pqZeile(\'sachwert\','+i+',\'faktor\',this.value)" aria-label="Sachwertfaktor"></td>'
    +'<td><input value="'+sEsc(r.bemerkung||'')+'" onchange="pqZeile(\'sachwert\','+i+',\'bemerkung\',this.value)" aria-label="Bemerkung"></td>'
    +'<td><button class="weg" aria-label="Zeile löschen" onclick="pqZeileWeg(\'sachwert\','+i+')">✕</button></td></tr>';
  const lzZ=(r,i)=>'<tr><td><select onchange="pqZeile(\'lz\','+i+',\'kat\',this.value)" aria-label="Objektart">'+katOpt(r.kat)+'</select></td>'
    +'<td><input value="'+(r.lz?(''+r.lz).replace('.',','):'')+'" placeholder="2,5" onchange="pqZeile(\'lz\','+i+',\'lz\',this.value)" aria-label="Liegenschaftszinssatz"></td>'
    +'<td><input value="'+sEsc(r.spanne||'')+'" placeholder="z. B. 1,8–3,2" onchange="pqZeile(\'lz\','+i+',\'spanne\',this.value)" aria-label="Spanne"></td>'
    +'<td><input value="'+sEsc(r.bemerkung||'')+'" onchange="pqZeile(\'lz\','+i+',\'bemerkung\',this.value)" aria-label="Bemerkung"></td>'
    +'<td><button class="weg" aria-label="Zeile löschen" onclick="pqZeileWeg(\'lz\','+i+')">✕</button></td></tr>';
  pqInhalt('<div class="gr-kopf"><div><button class="kd-zurueck" onclick="pqListe()" data-ic="arrow-left">Alle Marktberichte</button><h2 id="pq_titel" style="margin-top:6px">'+sEsc(s.titel||'Neuer Marktbericht')+'</h2></div>'
    +'<button class="gr-x" onclick="pqSchliessen()" aria-label="Schließen">✕</button></div>'
    +'<h3>Quelle</h3><div class="grid">'+f('titel','Titel','z. B. GGA südwestl. LK Heilbronn — Marktbericht 2025')+f('stand','Stand der Daten (Stichtag)','','date')
    +f('quelle','Quelle genau','z. B. Immobilienmarktbericht 2025, Abschnitte 6 und 7')+f('gebiet','Gebiet','z. B. Abstatt, Beilstein, Ilsfeld')+'</div>'
    +'<h3>Modell des Gutachterausschusses</h3><p class="hint" style="margin-top:0">Steht in der Modellbeschreibung des Marktberichts (§ 12 Abs. 6 ImmoWertV). Die App vergleicht damit jede Bewertung.</p>'
    +'<div class="grid">'+m('nhk','Herstellungskosten','NHK 2010')+m('gnd','Gesamtnutzungsdauer (Jahre)','80')+m('rnd','Restnutzungsdauer','nach Anlage 2 ImmoWertV')+m('awm','Alterswertminderung','linear')+'</div>'
    +'<div class="field" style="margin-top:10px"><label>Weitere Modellangaben</label><input value="'+sEsc((s.modell||{}).bemerkung||'')+'" placeholder="z. B. Außenanlagen pauschal 5 %, Bodenwert ohne Anpassung" onchange="pqModell(\'bemerkung\',this.value)" aria-label="Weitere Modellangaben"></div>'
    +'<h3>Sachwertfaktoren</h3><p class="hint" style="margin-top:0">Je Objektart und Spanne des vorläufigen Sachwerts. Die Bewertung wählt die Zeile, in deren Spanne ihr vorläufiger Sachwert fällt.</p>'
    +'<div class="gr-tabelle"><table class="nhk pq-edit"><thead><tr><th>Objektart</th><th>vorl. Sachwert ab €</th><th>bis unter €</th><th>Faktor</th><th>Bemerkung</th><th></th></tr></thead><tbody>'+(s.sachwert||[]).map(sfZ).join('')+'</tbody></table></div>'
    +'<button class="plus" onclick="pqZeileNeu(\'sachwert\')">＋ Zeile</button>'
    +'<h3>Liegenschaftszinssätze</h3><div class="gr-tabelle"><table class="nhk pq-edit"><thead><tr><th>Objektart</th><th>Zinssatz %</th><th>Spanne</th><th>Bemerkung</th><th></th></tr></thead><tbody>'+(s.lz||[]).map(lzZ).join('')+'</tbody></table></div>'
    +'<button class="plus" onclick="pqZeileNeu(\'lz\')">＋ Zeile</button>'
    +'<div class="kd-fuss"><div class="gr-zeile" style="margin:0"><button class="primary" onclick="pqWaehlen(\''+s.id+'\')">Für diese Bewertung verwenden</button><button class="secondary" onclick="pqExport(\''+s.id+'\')" data-ic="upload">Teilen</button></div>'
    +'<button class="secondary kd-loeschen" onclick="pqLoeschen(\''+s.id+'\')" data-ic="trash">Löschen</button></div>');
}
function pqAendern(fn){ let l=pqSets(), s=l.find(x=>x.id===PQ_EDIT); if(!s) return null; fn(s); pqSpeichern(l); return s; }
function pqFeld(k,v){ let s=pqAendern(x=>{ x[k]=(''+v).trim(); }); if(s&&k==='titel') $('pq_titel').textContent=s.titel||'Neuer Marktbericht'; }
function pqModell(k,v){ pqAendern(x=>{ x.modell=x.modell||{}; x.modell[k]=k==='gnd'?(Math.round(zahlLesen(v,false))||''):(''+v).trim(); }); }
function pqZeile(tab,i,k,v){ pqAendern(x=>{ let r=(x[tab]||[])[i]; if(!r) return; r[k]=(k==='von'||k==='bis')?zahlLesen(v,true):(k==='faktor'||k==='lz')?zahlLesen(v,false):(''+v).trim(); }); }
function pqZeileNeu(tab){ pqAendern(x=>{ x[tab]=x[tab]||[]; let letzte=x[tab][x[tab].length-1]; x[tab].push(tab==='sachwert'?{kat:letzte?letzte.kat:'efh',von:letzte&&letzte.bis||0,bis:0,faktor:0,bemerkung:''}:{kat:'efh',lz:0,spanne:'',bemerkung:''}); }); pqBearbeiten(PQ_EDIT); }
function pqZeileWeg(tab,i){ pqAendern(x=>{ (x[tab]||[]).splice(i,1); }); pqBearbeiten(PQ_EDIT); }
function pqLoeschen(id){
  let s=pqSets().find(x=>x.id===id); if(!s||!confirm('Marktbericht „'+(s.titel||'ohne Titel')+'“ löschen? Bewertungen behalten ihre übernommenen Werte und Quellenangaben.')) return;
  pqSpeichern(pqSets().filter(x=>x.id!==id)); if(exV('pq_satz')===id){ $('pq_satz').value=''; autosave(); } pqListe();
}
function pqExport(id){
  let s=pqSets().find(x=>x.id===id); if(!s) return;
  let b=new Blob([JSON.stringify({typ:'immoapp-marktdaten',version:1,satz:s},null,1)],{type:'application/json'});
  iaTeilen(b,'Marktdaten '+(s.titel||'Gutachterausschuss').replace(/[^\wäöüÄÖÜß .-]/g,'').trim()+'.json','Marktdaten');
}
function pqImport(){
  let i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{ let f=i.files[0]; if(!f) return; let r=new FileReader(); r.onload=()=>pqImportText(r.result); r.readAsText(f); };
  i.click();
}
function pqImportText(text){
  let o; try{ o=JSON.parse(text); }catch(e){ alert('Die Datei ist keine gültige Marktdaten-Datei.'); return; }
  let s=o&&o.typ==='immoapp-marktdaten'&&o.satz; if(!s||!s.id){ alert('Die Datei enthält keine Marktdaten der ImmoApp.'); return; }
  let l=pqSets(), da=l.findIndex(x=>x.id===s.id);
  if(da>=0&&!confirm('„'+(s.titel||'Marktbericht')+'“ ist schon vorhanden. Durch die Fassung aus der Datei ersetzen?')) return;
  if(da>=0) l[da]=s; else l.push(s);
  if(pqSpeichern(l)) pqListe();
}
