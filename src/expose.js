/* ---------- Exposé ---------------------------------------------------------------------
   Verkaufsexposé aus den erfassten Daten, bewusst ohne Bewertungszahlen. Jedes Feld in ⑪ überschreibt;
   leer gelassene Felder füllt die App aus Eckdaten, Aufnahmebogen, Objektdaten und Beschreibung.
   Gezeichnet wird wie der Bericht in #report (Klasse „expose“), damit Drucken und PDF denselben Weg nehmen.
   Pflichtangaben zum Energieausweis nach § 87 GModG (bis 2026 GEG), am Gesetzeswortlaut geprüft. */
const EX_KONTAKT_KEY='ia_expose_kontakt';
function exV(id){ let e=$(id); return e?(''+(e.value==null?'':e.value)).trim():''; }
function exWahl(id){ let e=$(id); if(!e) return ''; if(e.tagName==='SELECT'){ let o=e.options[e.selectedIndex]; if(!o||/^[–-]?$/.test(o.text.trim())) return ''; } return exV(id); }
function exOrt(){
  let a=exV('ek_anschrift'), m=a.match(/\b\d{5}\s+([^,]+)/);
  if(m) return m[1].trim();
  let t=a.split(',').map(x=>x.trim()).filter(Boolean);
  return t.length>1?t[t.length-1]:'';
}
function exObjektart(){
  if(modus()==='wohnung') return exV('ek_wtyp')||'Eigentumswohnung';
  let t=exV('ek_typ');
  const M=[[/^EFH freistehend/,'Freistehendes Einfamilienhaus'],[/^Doppel-\/Reihenendhaus/,'Doppelhaushälfte / Reihenendhaus'],[/^Reihenmittelhaus/,'Reihenmittelhaus'],
    [/^Mehrfamilienhaus/,'Mehrfamilienhaus'],[/^Wohn-\/Geschäftshaus/,'Wohn- und Geschäftshaus'],[/^Geschäftshaus/,'Geschäftshaus'],[/^Bürogebäude/,'Bürogebäude'],[/^Betriebs/,'Gewerbeobjekt']];
  let f=M.find(x=>x[0].test(t)); return f?f[1]:(t.split(' · ')[0]||'Immobilie');
}
function exTitelVorschlag(){ let o=exOrt(); return exObjektart()+(o?' in '+o:''); }
function exWohngebaeude(){ return modus()==='wohnung'||!/^(Geschäftshaus ohne|Bürogebäude|Betriebs)/.test(exV('ek_typ')); }
function exKontaktGemerkt(){ try{ return JSON.parse(localStorage.getItem(EX_KONTAKT_KEY))||{}; }catch(e){ return {}; } }
function exKontakt(){
  let g=exKontaktGemerkt();
  return {name:exV('ex_k_name')||g.name||exV('ek_ersteller'), funktion:exV('ex_k_funktion')||g.funktion||exV('ek_ersteller_funktion'),
    tel:exV('ex_k_tel')||g.tel||'', mail:exV('ex_k_mail')||g.mail||'', firma:exV('ex_k_firma')||g.firma||exV('cfg_kopf')};
}
function exKontaktMerken(){
  if(!$('ex_k_merken')||!$('ex_k_merken').checked) return;
  let k={name:exV('ex_k_name'),funktion:exV('ex_k_funktion'),tel:exV('ex_k_tel'),mail:exV('ex_k_mail'),firma:exV('ex_k_firma')};
  if(!Object.values(k).some(Boolean)) return;
  try{ localStorage.setItem(EX_KONTAKT_KEY,JSON.stringify(Object.assign(exKontaktGemerkt(),Object.fromEntries(Object.entries(k).filter(x=>x[1]))))); }catch(e){}
}
function exTraeger(h){
  h=(h||'').toLowerCase(); if(!h) return '';
  if(/fernw/.test(h)) return 'Fernwärme'; if(/wärmepumpe|waermepumpe/.test(h)) return 'Strom (Wärmepumpe)';
  if(/pellet|holz|biomasse|hackschnitzel/.test(h)) return 'Holz (Pellets)'; if(/öl|oel/.test(h)) return 'Heizöl';
  if(/gas/.test(h)) return 'Erdgas'; if(/strom|nachtspeicher|elektro/.test(h)) return 'Strom'; return '';
}
/* Energieausweis: Pflichtangaben nach § 87 Abs. 1 GModG — nur aus eindeutig erfassten Quellen, nicht geraten */
function exEnergie(){
  let art=exV('ex_ea_art');
  if(!art){ let a=exWahl('au_energieausweis'), o=exV('od_energieausweis');
    art=/Bedarf/.test(a)?'Bedarfsausweis':/Verbrauch/.test(a)?'Verbrauchsausweis':/nicht/.test(a)?'liegt nicht vor':
        /Bedarf/.test(o)?'Bedarfsausweis':/Verbrauch/.test(o)?'Verbrauchsausweis':''; }
  return {art:art, wert:exV('ex_ea_wert')||exV('au_energiewert'), traeger:exV('ex_ea_traeger')||exTraeger(exV('au_heizung_art')),
    bj:exV('ex_ea_baujahr')||(num('ek_baujahr')>0?exV('ek_baujahr'):''), klasse:exV('ex_ea_klasse')||exWahl('au_energieklasse')||exV('od_effizienz'),
    strom:exV('ex_ea_strom'), wohn:exWohngebaeude()};
}
function exPflichtFehlt(E){
  if(!/Bedarf|Verbrauch/.test(E.art)) return E.art?[]:['Art des Energieausweises (oder „liegt nicht vor“)'];
  let f=[];
  if(!E.wert) f.push(E.wohn?'Endenergiewert':'Endenergiewert Wärme');
  if(!E.wohn&&!E.strom) f.push('Endenergiewert Strom');
  if(!E.traeger) f.push('wesentlicher Energieträger');
  if(E.wohn&&!E.bj) f.push('Baujahr laut Energieausweis');
  if(E.wohn&&!E.klasse) f.push('Energieeffizienzklasse');
  return f;
}
function exAusstattungVorschlag(){
  let z=[], w=id=>exWahl(id);
  if(exV('au_zimmer')) z.push(exV('au_zimmer')+' Zimmer');
  if(exV('au_baeder')) z.push(exV('au_baeder')+(/^1$/.test(exV('au_baeder'))?' Bad':' Bäder')+(w('au_tageslichtbad')==='ja'?', Tageslichtbad':''));
  if(w('au_gaeste_wc')==='ja') z.push('Gäste-WC');
  let k=w('au_kueche'); if(/verbleibt/.test(k)) z.push('Einbauküche (verbleibt)'); else if(/entfernt/.test(k)) z.push('Einbauküche vorhanden (wird nicht übernommen)');
  if(w('au_keller')&&!/nicht/.test(w('au_keller'))) z.push(w('au_keller').replace(/^./,c=>c.toUpperCase()));
  let dg=w('au_dg'); if(dg==='ausgebaut') z.push('Dachgeschoss ausgebaut'); else if(dg==='ausbaufähig') z.push('Dachgeschoss ausbaufähig');
  if(exV('au_balkon')) z.push(exV('au_balkon'));
  if(exV('au_heizung_art')) z.push('Heizung: '+exV('au_heizung_art')+(exV('au_heizung_bj')?' ('+exV('au_heizung_bj')+')':''));
  let ww=w('au_ww'); if(ww) z.push('Warmwasser '+ww.replace('zentral über Heizung','zentral über die Heizung'));
  if(exV('au_fenster')) z.push('Fenster: '+exV('au_fenster'));
  let fa=w('au_daemm_fassade'); if(/vorhanden|Kern/.test(fa)) z.push('Fassadendämmung'+(/WDVS/.test(fa)?' (WDVS)':/Kern/.test(fa)?' (Kerndämmung)':'')); else if(fa==='teilweise') z.push('Fassade teilweise gedämmt');
  let da=w('au_daemm_dach'); if(da==='vorhanden') z.push('Dach bzw. oberste Geschossdecke gedämmt'); else if(da==='teilweise') z.push('Dach teilweise gedämmt');
  let el=w('au_elektro'); if(el==='zeitgemäß') z.push('Elektrik zeitgemäß'); else if(el==='teilerneuert') z.push('Elektrik teilerneuert');
  if(w('au_aufzug')==='ja') z.push('Aufzug');
  let ba=w('au_barriere'); if(ba==='weitgehend') z.push('Weitgehend barrierefrei'); else if(ba==='teilweise') z.push('Teilweise barrierefrei');
  if(num('ek_anz_stell')>0) z.push(exV('ek_anz_stell')+(num('ek_anz_stell')===1?' Stellplatz':' Stellplätze'));
  let t=z.map(x=>'• '+x).join('\n');
  if(exV('modernisierung')) t+=(t?'\n\n':'')+'Modernisierungen: '+exV('modernisierung');
  return t;
}
function exVorschlag(art){
  let ziel={objekt:'ex_text_objekt',ausstattung:'ex_text_ausstattung',lage:'ex_text_lage'}[art], t='';
  if(art==='objekt') t=[exV('gebaeude_besch'),exV('grundstueck_besch'),exV('eindruck')].filter(Boolean).join('\n\n');
  if(art==='ausstattung') t=exAusstattungVorschlag();
  if(art==='lage') t=[exV('lage_mikro'),exV('lage_makro')].filter(Boolean).join('\n\n');
  if(!t){ alert(art==='ausstattung'?'Im Aufnahmebogen sind noch keine Ausstattungsmerkmale erfasst.':'In ④ Objektdaten & Beschreibung steht dazu noch kein Text.'); return; }
  if(exV(ziel)&&!confirm('Den vorhandenen Text ersetzen?')) return;
  $(ziel).value=t; autosave(); exStatus();
}
/* Fotoauswahl: ex_fotos = JSON-Liste der gewählten ids (leer = alle Objektfotos), ex_titelbild = id */
function exFotoIds(){
  let v=exV('ex_fotos');
  if(!v) return PHOTOS.filter(p=>p.cat==='objekt').map(p=>p.id);
  try{ let a=JSON.parse(v); return PHOTOS.filter(p=>a.includes(p.id)).map(p=>p.id); }catch(e){ return []; }
}
function exTitelbild(ids){ let t=exV('ex_titelbild'); return ids.includes(t)?t:(ids[0]||''); }
function exFotoWahlRender(){
  let box=$('ex_fotowahl'); if(!box) return;
  let liste=PHOTOS.filter(p=>p.cat==='objekt').concat(PHOTOS.filter(p=>p.cat==='karte'),PHOTOS.filter(p=>p.cat==='schaden'));
  if(!liste.length){ box.innerHTML='<p class="hint" style="margin:0;grid-column:1/-1">Noch keine Fotos — sie werden unter ⑧ Fotodokumentation aufgenommen.</p>'; return; }
  let ids=exFotoIds(), titel=exTitelbild(ids);
  const art={objekt:'Objektfoto',karte:'Karte / Plan',schaden:'Schadensfoto'};
  box.innerHTML=liste.map(p=>{ let an=ids.includes(p.id);
    return '<label class="ex-foto'+(an?' on':'')+'"><input type="checkbox"'+(an?' checked':'')+' onchange="exFotoSetzen(\''+idSicher(p.id)+'\',this.checked)" aria-label="'+sEsc(p.caption||art[p.cat])+' ins Exposé">'
      +'<img src="'+bildUrl(p.data)+'" alt="">'+(an&&p.id===titel?'<span class="nr">Titelbild</span>':'')
      +'<small>'+sEsc(p.caption||art[p.cat])+'</small>'
      +(an&&p.id!==titel?'<button type="button" class="ex-titel-k" onclick="event.preventDefault();exTitelSetzen(\''+idSicher(p.id)+'\')">Als Titelbild</button>':'')+'</label>'; }).join('');
}
function exFotoSetzen(id,an){
  let ids=exFotoIds(); if(an&&!ids.includes(id)) ids.push(id); if(!an) ids=ids.filter(x=>x!==id);
  $('ex_fotos').value=JSON.stringify(PHOTOS.filter(p=>ids.includes(p.id)).map(p=>p.id)); exFotoWahlRender(); autosave();
}
function exTitelSetzen(id){ $('ex_titelbild').value=id; exFotoWahlRender(); autosave(); }
/* Hinweise im Formular: Vorschläge als Platzhalter, Preisvorschlag, Pflichtangaben */
function exStatus(){
  if(!$('ex_titel')) return;
  $('ex_titel').placeholder=exTitelVorschlag();
  let g=exKontaktGemerkt();
  [['ex_k_name',g.name||exV('ek_ersteller')],['ex_k_funktion',g.funktion||exV('ek_ersteller_funktion')],['ex_k_tel',g.tel],['ex_k_mail',g.mail],['ex_k_firma',g.firma||exV('cfg_kopf')]]
    .forEach(x=>{ if($(x[0])) $(x[0]).placeholder=x[1]||''; });
  let emp=(window._R&&window._R.empfehlung)||0, info=$('ex_preis_info');
  if(info) info.innerHTML=emp>0?'Preisempfehlung der Bewertung: '+eur(Math.round(emp/1000)*1000)+(exV('ex_preis')?'':' · <a href="#" onclick="$(\'ex_preis\').value=\''+Math.round(emp/1000)*1000+'\';exStatus();autosave();return false;">übernehmen</a>'):'';
  let E=exEnergie(), f=exPflichtFehlt(E), st=$('ex_pflicht');
  if(st){ st.className='ex-pflicht '+(f.length?'fehlt':'ok');
    st.textContent=!E.art?'Art des Energieausweises fehlt — ohne Angabe erscheint im Exposé kein Energieabschnitt.'
      :E.art==='liegt nicht vor'?'Im Exposé steht: Ein Energieausweis liegt derzeit nicht vor.'
      :f.length?'Pflichtangaben unvollständig — es fehlt: '+f.join(', ')+'.':'Pflichtangaben nach § 87 GModG vollständig.'; }
  [['ex_ea_wert',exV('au_energiewert')],['ex_ea_traeger',exTraeger(exV('au_heizung_art'))],['ex_ea_baujahr',num('ek_baujahr')>0?exV('ek_baujahr'):''],
   ['ex_ea_klasse',exWahl('au_energieklasse')||exV('od_effizienz')]].forEach(x=>{ if($(x[0])) $(x[0]).placeholder=x[1]||''; });
}
function exZahl(v){ let n=zahlLesen(v,true); return n?n.toLocaleString('de-DE',{maximumFractionDigits:2}):''; }

function exposeAnzeigen(pdf){
  compute(); exKontaktMerken();
  const esc=sEsc;
  let w=modus()==='wohnung', ort=exOrt(), E=exEnergie(), K=exKontakt();
  let titel=exV('ex_titel')||exTitelVorschlag();
  let adresse=exV('ex_adresse')==='voll'?exV('ek_anschrift'):ort;
  if(!exV('ex_titel')&&exV('ex_adresse')!=='voll'&&ort&&titel.indexOf(ort)>=0) adresse='';   // Ort steht schon im Titel
  let unter=[exV('ex_untertitel'),adresse].filter(Boolean).join(' · ');
  let preis=num('ex_preis');
  let fotoIds=exFotoIds(), titelId=exTitelbild(fotoIds), titelFoto=PHOTOS.find(p=>p.id===titelId);
  let weitere=PHOTOS.filter(p=>fotoIds.includes(p.id)&&p.id!==titelId);
  let fakten=[['Objektart',exObjektart()],
    ['Wohnfläche',num('ek_wohnflaeche')>0?'ca. '+exZahl(exV('ek_wohnflaeche'))+' m²':''],
    ['Zimmer',exV('au_zimmer')],
    [w?'Etage':'Grundstück',w?exV('ek_etage'):(num('ek_gs_flaeche')>0?'ca. '+exZahl(exV('ek_gs_flaeche'))+' m²':'')],
    ['Baujahr',num('ek_baujahr')>0?exV('ek_baujahr'):''],
    ['Bäder',exV('au_baeder')],
    ['Heizung',exV('au_heizung_art')],
    ['Energieklasse',/Bedarf|Verbrauch/.test(E.art)&&E.wohn?E.klasse:''],
    ['Stellplätze',num('ek_anz_stell')>0?exV('ek_anz_stell'):''],
    ['Verfügbar',exV('ex_frei')]].filter(x=>x[1]);
  let tObj=exV('ex_text_objekt')||[exV('gebaeude_besch'),exV('grundstueck_besch')].filter(Boolean).join('\n\n');
  let tAus=exV('ex_text_ausstattung')||exAusstattungVorschlag();
  let tLage=exV('ex_text_lage')||[exV('lage_mikro'),exV('lage_makro')].filter(Boolean).join('\n\n');
  let tSonst=exV('ex_text_sonst');
  const block=(h,t)=>t?'<h2>'+h+'</h2>'+(/^• /m.test(t)&&!/\n\n/.test(t)?'<ul class="ex-liste">'+t.split('\n').map(z=>'<li>'+esc(z.replace(/^•\s*/,''))+'</li>').join('')+'</ul>':'<div class="ex-text">'+esc(t)+'</div>'):'';
  let energie='';
  if(E.art==='liegt nicht vor') energie='<h2>Energieausweis</h2><div class="ex-text">Ein Energieausweis liegt derzeit nicht vor.</div>';
  else if(E.art){
    let bed=/Bedarf/.test(E.art), zeilen=[['Art des Energieausweises',E.art],
      [(bed?'Endenergiebedarf':'Endenergieverbrauch')+(E.wohn?'':' Wärme'),E.wert?exZahl(E.wert)+' kWh/(m²·a)':''],
      E.wohn?null:[(bed?'Endenergiebedarf':'Endenergieverbrauch')+' Strom',E.strom?exZahl(E.strom)+' kWh/(m²·a)':''],
      ['Wesentlicher Energieträger der Heizung',E.traeger],
      E.wohn?['Baujahr laut Energieausweis',E.bj]:null,
      E.wohn?['Energieeffizienzklasse',E.klasse]:null].filter(z=>z&&z[1]);
    energie='<h2>Energieausweis</h2><table class="ex-energie">'+zeilen.map(z=>'<tr><td>'+z[0]+'</td><td>'+esc(z[1])+'</td></tr>').join('')+'</table>';
  }
  let wahl=exV('ex_gr')||'plan', grund='';
  if(wahl!=='keine'&&GRUNDRISSE.length) grund='<h2>Grundrisse</h2>'+GRUNDRISSE.map(p=>{ let N=grNorm(p.d);
    return '<figure class="gr-fig">'+grSVG(N,wahl==='plan'?p.darst:wahl)+'</figure>'; }).join('');   // Titel steht in der Zeichnung
  let bilder=weitere.length?'<h2>Bilder</h2><div class="ex-bilder">'+weitere.map(p=>'<figure><img src="'+bildUrl(p.data)+'" alt="'+esc(p.caption||'Foto')+'">'+(p.caption?'<figcaption>'+esc(p.caption)+'</figcaption>':'')+'</figure>').join('')+'</div>':'';
  let ini=(K.name||'').split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  let kontakt=(K.name||K.tel||K.mail)?'<h2>Ihr Ansprechpartner</h2><div class="ex-kontakt">'+(ini?'<div class="ini">'+esc(ini)+'</div>':'')+'<div>'
    +(K.name?'<b>'+esc(K.name)+'</b>':'')+(K.funktion?'<div>'+esc(K.funktion)+'</div>':'')+(K.firma?'<div>'+esc(K.firma)+'</div>':'')
    +(K.tel?'<div>Telefon '+esc(K.tel)+'</div>':'')+(K.mail?'<div>'+esc(K.mail)+'</div>':'')+'</div></div>':'';
  let r=$('report'); r.className='expose'; r.dataset.pdfname='Exposé '+(titel.replace(/[^\wäöüÄÖÜß -]/g,'').trim()||'Immobilie');
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="document.body.classList.remove(\'report-mode\')">← zurück</button>'
    +'<button onclick="window.print()">Drucken</button><button onclick="downloadPDF()">PDF herunterladen</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +(K.firma?'<div class="ex-kopf">'+esc(K.firma)+'</div>':'')
    +'<h1>'+esc(titel)+'</h1>'+(unter?'<p class="ex-sub">'+esc(unter)+'</p>':'')
    +(titelFoto&&bildUrl(titelFoto.data)?'<img class="ex-hero" src="'+bildUrl(titelFoto.data)+'" alt="'+esc(titelFoto.caption||titel)+'">':'')
    +'<div class="ex-preis"><span>Kaufpreis</span><b>'+(preis>0?eur(preis):'auf Anfrage')+'</b>'+(exV('ex_provision')?'<small>Käuferprovision: '+esc(exV('ex_provision'))+'</small>':'')+'</div>'
    +(fakten.length?'<div class="ex-fakten">'+fakten.map(f=>'<div class="ex-fakt"><span>'+f[0]+'</span><b>'+esc(f[1])+'</b></div>').join('')+'</div>':'')
    +block('Objektbeschreibung',tObj)+block('Ausstattung',tAus)+block('Lage',tLage)+block('Sonstiges',tSonst)
    +energie+bilder+grund+kontakt
    +'<p class="ex-hinweis">Dieses Exposé dient der Information. Die Angaben beruhen auf Informationen des Eigentümers und vorliegenden Unterlagen und wurden sorgfältig zusammengestellt; für Richtigkeit und Vollständigkeit wird keine Gewähr übernommen. Grundrisse dienen der Orientierung, maßgeblich sind die Bauunterlagen. Zwischenverkauf vorbehalten.</p>';
  document.body.classList.add('report-mode'); window.scrollTo(0,0);
  if(pdf) setTimeout(downloadPDF,150);
}
