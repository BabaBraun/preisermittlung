/* ---------- Kachel „Unterlagen“ (D43) ----------
   Unterlagen je Verkauf an einer Stelle: Liste nach Objektart (Haus, Wohnung, Mehrfamilienhaus oder Gewerbe, Grundstück) mit
   der Stelle, die sie ausstellt, wofür sie gebraucht wird und dem Stand (offen, angefordert, liegt vor, entfällt). Was im
   Aufnahmebogen der gesicherten Bewertung als vorhanden angehakt ist, übernimmt die App als „liegt vor“ (die Bewertung wird nur
   gelesen). Vollmacht des Eigentümers zum Einholen mit Unterschrift auf dem Gerät; Anforderung je Stelle als Schreiben; Liste
   für den Eigentümer. Grundbuch: Einsicht bei berechtigtem Interesse (§ 12 Abs. 1 GBO), Ausdruck 10 €, amtlicher Ausdruck 20 €
   (Nr. 17000, 17001 KV GNotKG). Das Baulastenverzeichnis führt die Gemeinde, Einsicht bei berechtigtem Interesse (§ 72 Abs. 3
   und 4 LBO). Speicher „unterlagen“ in der Datenbank (Version 7), weil die Vollmacht Namen und Unterschrift enthält. */
var UL={aktiv:null,dok:''};
const UL_STELLEN=[['eigentuemer','Eigentümer'],['grundbuchamt','Grundbuchamt'],['gemeinde','Gemeinde (Bauverwaltung)'],['baurecht','Baurechtsbehörde (Bauakte)'],
  ['vermessung','Vermessungsbehörde'],['landratsamt','Landratsamt (Bodenschutz)'],['verwalter','Hausverwaltung'],['bank','Bank des Eigentümers'],['gutachter','Gutachterausschuss']];
const UL_STAND=[['offen','offen'],['angefordert','angefordert'],['da','liegt vor'],['entfaellt','entfällt']];
const UL_ARTEN=[['h','Einfamilienhaus (auch Doppel- oder Reihenhaus)'],['w','Wohnung'],['m','Mehrfamilienhaus oder Gewerbe'],['g','Grundstück ohne Gebäude']];
/* [Schlüssel, Unterlage, Stelle, wofür, Objektarten, Hinweis, Nummer im Aufnahmebogen (AU_UNTERLAGEN)] */
const UL_LISTE=[
  ['grundbuch','Grundbuchauszug (aktuell)','grundbuchamt','Exposé, Notar, Bank des Käufers','hwmg','Mit Vollmacht des Eigentümers (berechtigtes Interesse, § 12 Abs. 1 GBO). Ausdruck 10 €, amtlicher Ausdruck 20 € (Nr. 17000, 17001 KV GNotKG).',0],
  ['flurkarte','Flurkarte (Auszug aus dem Liegenschaftskataster)','vermessung','Exposé, Bank des Käufers','hwmg','',1],
  ['grundrisse','Grundrisse, Schnitte und Ansichten','eigentuemer','Exposé, Bank des Käufers','hwm','Fehlen sie, hilft die Bauakte.',2],
  ['wohnflaeche','Wohnflächenberechnung','eigentuemer','Exposé, Bank des Käufers','hwm','Fehlt sie: Raumliste in der Bewertung.',3],
  ['energieausweis','Energieausweis','eigentuemer','Anzeigen, Exposé, Besichtigung','hwm','Die Kacheln „Aushang“ und „Portal-Export“ prüfen die Pflichtangaben.',4],
  ['baugenehmigung','Baugenehmigung und Baubeschreibung','baurecht','Bank des Käufers','hwm','',null],
  ['baulasten','Auskunft aus dem Baulastenverzeichnis','gemeinde','Notar, Bank des Käufers','hwmg','Das Verzeichnis führt die Gemeinde; Einsicht bei berechtigtem Interesse (§ 72 Abs. 3 und 4 LBO).',12],
  ['altlasten','Auskunft zu Altlasten','landratsamt','Notar, Käufer','hmg','',13],
  ['erschliessung','Bescheinigung über Erschließungsbeiträge','gemeinde','Notar','hmg','Offene Beiträge regelt der Kaufvertrag.',null],
  ['planungsrecht','Bebauungsplan oder Auskunft zum Planungsrecht','gemeinde','Exposé, Käufer','hmg','',null],
  ['bodenrichtwert','Bodenrichtwert','gutachter','Exposé','g','Im Internet über BORIS-BW.',null],
  ['modernisierung','Nachweise über Modernisierungen','eigentuemer','Exposé, Bank des Käufers','hwm','',11],
  ['grundsteuer','Grundsteuerbescheid','eigentuemer','Käufer','hwmg','',10],
  ['versicherung','Gebäudeversicherung (Police und Beitrag)','eigentuemer','Käufer','hm','',null],
  ['schornstein','Feuerstättenbescheid und letztes Messprotokoll','eigentuemer','Käufer','hm','',null],
  ['mietvertraege','Mietverträge und Aufstellung der Mieten','eigentuemer','Exposé, Notar, Käufer','hwm','Nur wenn vermietet. In der App ohne Namen der Mieter.',8],
  ['nebenkostenabr','Letzte Nebenkostenabrechnung','eigentuemer','Käufer','hwm','Nur wenn vermietet.',9],
  ['glaeubiger','Grundschulden: Gläubiger und Ansprechpartner für die Löschung','bank','Notar','hwmg','Für die Lastenfreistellung.',null],
  ['teilung','Teilungserklärung mit Gemeinschaftsordnung und Aufteilungsplan','verwalter','Exposé, Notar, Bank des Käufers','w','Auch aus der Grundakte beim Grundbuchamt.',5],
  ['protokolle','Protokolle der Eigentümerversammlungen (letzte drei Jahre) und Beschlusssammlung','verwalter','Käufer, Bank des Käufers','w','',6],
  ['abrechnung','Wirtschaftsplan, Hausgeldabrechnung und Stand der Erhaltungsrücklage','verwalter','Exposé, Käufer, Bank des Käufers','w','',7],
  ['verwalterzustimmung','Zustimmung der Verwaltung zum Verkauf','verwalter','Notar','w','Nur wenn die Teilungserklärung sie verlangt (§ 12 WEG).',null]];
const UL_VOLLMACHT='Ich bevollmächtige {berater}{firma}, für den Verkauf des Objekts {objekt} Auskünfte und Unterlagen bei Grundbuchamt, Gemeinde, '
  +'Baurechts- und Vermessungsbehörde, Landratsamt, Hausverwaltung und meiner Bank einzuholen und Einsicht in Grundbuch, Grundakten, '
  +'Bauakten und Baulastenverzeichnis zu nehmen. Die Vollmacht gilt bis auf Widerruf, längstens bis zum Abschluss des Verkaufs.';
function ulStellenName(k){ return (UL_STELLEN.find(s=>s[0]===k)||['',k])[1]; }
function ulStandName(k){ return (UL_STAND.find(s=>s[0]===k)||UL_STAND[0])[1]; }
/* Objektart aus der Bewertung: Wohnung, Ein-/Zweifamilien-, Doppel- oder Reihenhaus, sonst Mehrfamilienhaus oder Gewerbe */
function ulArtAus(f){ f=f||{}; return (f.ek_modus||'')==='wohnung'?'w':/^(EFH|ZFH|Doppel|Reihen)/.test(f.ek_typ||'')?'h':'m'; }
function ulPosten(r){ return UL_LISTE.filter(x=>x[4].includes(r.art||'h')).map(x=>({x,s:(r.posten||{})[x[0]]||{stand:'offen'}})); }
function ulFortschritt(r){ let l=ulPosten(r).filter(p=>p.s.stand!=='entfaellt'); return {da:l.filter(p=>p.s.stand==='da').length,angefordert:l.filter(p=>p.s.stand==='angefordert').length,gesamt:l.length}; }
/* „liegt vor“ aus dem Aufnahmebogen der gesicherten Bewertung (Felder au_ul0 … au_ul13) */
function ulAusBewertung(r,f){
  let n=0; UL_LISTE.forEach(x=>{ if(x[6]==null) return; let v=f['au_ul'+x[6]]; if(v===true||v==='true'||v==='on'||v===1){
    let s=r.posten[x[0]]; if(!s||s.stand==='offen'){ r.posten[x[0]]={stand:'da',datum:aufHeute(),notiz:(s&&s.notiz)||'',quelle:'Aufnahmebogen'}; n++; } } });
  return n;
}
function ulLeer(o){
  let r={id:wzdId('ul'),projektId:o.id,objekt:o.name,art:ulArtAus(o.f),posten:{},kundeId:o.kundeId||'',vollmacht:{text:'',name:'',unterschrift:'',zeit:''}};
  ulAusBewertung(r,o.f||{});
  let kd=wzdKunde(o.kundeId); if(kd) r.vollmacht.name=kdName(kd);
  return r;
}
async function ulOeffnen(pid){
  await wzdLaden(); let o=wzdObjekt(pid); if(!o) return;
  let r=wzdListe('unterlagen').find(x=>x.projektId===pid);
  if(!r){ r=ulLeer(o); if(!(await wzdSpeichern('unterlagen',r))) return; }
  else { let n=ulAusBewertung(r,o.f||{}); if(n) wzdSpeichernBald('unterlagen',r); }
  UL.aktiv=r; if(WZ.aktiv==='unterlagen') wzZeichnen(); $('wz_overlay').scrollTop=0;
}
function ulZurueck(){ if(UL.aktiv) wzdSpeichernSofort('unterlagen',UL.aktiv); UL.aktiv=null; wzZeichnen(); }
async function ulLoeschen(){
  let r=UL.aktiv; if(!r||!confirm('Den Stand der Unterlagen und die Vollmacht für dieses Objekt löschen? Die Bewertung bleibt unverändert.')) return;
  if(await wzdLoeschen('unterlagen',r.id)){ UL.aktiv=null; wzZeichnen(); }
}
function ulSetz(key,feld,wert){
  let r=UL.aktiv; if(!r) return; let s=r.posten[key]||(r.posten[key]={stand:'offen'});
  s[feld]=String(wert||'').slice(0,300); if(feld==='stand'){ s.datum=s.stand==='offen'?'':aufHeute(); s.quelle=''; }
  wzdSpeichernBald('unterlagen',r); if(feld==='stand') wzZeichnen();
}
/* alle offenen Unterlagen einer Stelle als angefordert vermerken und das Schreiben zeigen */
function ulAnfordern(stelle){
  let r=UL.aktiv; if(!r) return;
  let offen=ulPosten(r).filter(p=>p.x[2]===stelle&&p.s.stand==='offen');
  if(!offen.length){ alert('Bei dieser Stelle ist nichts mehr offen.'); return; }
  offen.forEach(p=>{ r.posten[p.x[0]]=Object.assign({},p.s,{stand:'angefordert',datum:aufHeute()}); });
  wzdSpeichernSofort('unterlagen',r);
  UL.dok='anf:'+stelle+':'+offen.map(p=>p.x[0]).join(','); wzDokument();
}
function ulVollmachtText(r){
  let ber=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}, pk=(wzAlle().portal||{}).kontakt||{}, name=ber.name||pk.name||'', firma=ber.firma||(((wzAlle().portal||{}).anbieter)||{}).firma||'';
  let o=wzdObjekt(r.projektId);
  return ImmoBeratung.vorlageFuellen(r.vollmacht.text||UL_VOLLMACHT,{objekt:(o&&o.anschrift)||r.objekt||'',berater:name||'die Beraterin oder den Berater',firma:firma?' ('+firma+')':''}).text;
}
function ulVollmachtTextSetzen(v){
  let r=UL.aktiv; if(!r) return; v=String(v||'').trim(); let alt=r.vollmacht.text||UL_VOLLMACHT; if((v||UL_VOLLMACHT)===alt) return;
  if(r.vollmacht.unterschrift&&!confirm('Mit dem neuen Text wird die Unterschrift entfernt. Fortfahren?')){ wzZeichnen(); return; }
  r.vollmacht.text=v===UL_VOLLMACHT?'':v; r.vollmacht.unterschrift=''; r.vollmacht.zeit=''; wzdSpeichernSofort('unterlagen',r); wzZeichnen();
}
function ulUnterschriftWeg(){ let r=UL.aktiv; if(!r) return; r.vollmacht.unterschrift=''; r.vollmacht.zeit=''; wzdSpeichernSofort('unterlagen',r); wzZeichnen(); }
function ulVollmachtKunde(){ wzdKundeWaehlen(id=>{ let r=UL.aktiv, kd=wzdKunde(id); if(!r||!kd) return; r.kundeId=id; r.vollmacht.name=kdName(kd); wzdSpeichernSofort('unterlagen',r); wzZeichnen(); }); }

/* ---------- Ansicht ---------- */
function ulListeHtml(){
  let objekte=wzdObjekte(false), alle=wzdObjekte(true);
  let mit=wzdListe('unterlagen').map(r=>({r,o:alle.find(o=>o.id===r.projektId)})).filter(x=>x.o);
  let karten=objekte.map(o=>{ let r=wzdListe('unterlagen').find(x=>x.projektId===o.id), f=r?ulFortschritt(r):null;
    return '<div class="kd-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc([o.status,f?f.da+' von '+f.gesamt+' liegen vor'+(f.angefordert?', '+f.angefordert+' angefordert':''):'noch nicht begonnen'].filter(Boolean).join(' · '))+'</span>'
      +(f?'<div class="fp-balken"><i style="width:'+(f.gesamt?Math.round(f.da/f.gesamt*100):0)+'%"></i></div>':'')+'</div>'
      +'<div class="kd-k"><button class="secondary" onclick="ulOeffnen(\''+idSicher(o.id)+'\')">Öffnen</button></div></div>'; });
  mit.filter(x=>!objekte.some(o=>o.id===x.o.id)).forEach(({r,o})=>{ let f=ulFortschritt(r);
    karten.push('<div class="kd-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc([o.status||'nicht in Vermarktung',f.da+' von '+f.gesamt+' liegen vor'].join(' · '))+'</span></div>'
      +'<div class="kd-k"><button class="secondary" onclick="ulOeffnen(\''+idSicher(o.id)+'\')">Öffnen</button></div></div>'); });
  let weitere=alle.filter(o=>!objekte.some(a=>a.id===o.id)&&!mit.some(x=>x.o.id===o.id));
  return (karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein Objekt in Vermarktung. Den Stand „Auftrag erteilt“ oder „In Vermarktung“ setzt man in der Bewertung unter „Vermarktung“.'))
    +(weitere.length?'<div class="field" style="max-width:420px;margin-top:12px"><label for="ul_weitere">Andere gesicherte Bewertung</label><select id="ul_weitere" onchange="if(this.value)ulOeffnen(this.value)"><option value="">– wählen –</option>'
      +weitere.map(o=>'<option value="'+sEsc(o.id)+'">'+sEsc(o.name)+'</option>').join('')+'</select></div>':'')
    +wzHinweis('Die Liste richtet sich nach der Objektart. Was im Aufnahmebogen der Bewertung als vorhanden angehakt ist, steht schon auf „liegt vor“.');
}
function ulEditor(r){
  let f=ulFortschritt(r), o=wzdObjekt(r.projektId), posten=ulPosten(r), v=r.vollmacht||{};
  let gruppen=UL_STELLEN.map(([k,name])=>{ let l=posten.filter(p=>p.x[2]===k); if(!l.length) return '';
    let offen=l.filter(p=>p.s.stand==='offen').length;
    return '<div class="ul-gruppe"><div class="ul-gruppe-kopf"><h4>'+sEsc(name)+'</h4>'
      +(offen&&k!=='eigentuemer'&&k!=='gutachter'?'<button type="button" class="secondary" onclick="ulAnfordern(\''+k+'\')" data-ic="mail">Anfordern ('+offen+')</button>':'')+'</div>'
      +l.map(p=>{ let key=p.x[0], s=p.s;
        return '<div class="ul-posten ul-'+s.stand+'"><div class="ul-name"><b>'+sEsc(p.x[1])+'</b><small>'+sEsc(p.x[3])+(p.x[5]?' · '+sEsc(p.x[5]):'')+'</small></div>'
          +'<select aria-label="Stand: '+sEsc(p.x[1])+'" onchange="ulSetz(\''+key+'\',\'stand\',this.value)">'+UL_STAND.map(([w,t])=>'<option value="'+w+'"'+(s.stand===w?' selected':'')+'>'+t+'</option>').join('')+'</select>'
          +'<span class="ul-datum">'+(s.datum?wzDatum(s.datum)+(s.quelle?' · '+sEsc(s.quelle):''):'')+'</span>'
          +'<input class="ul-notiz" aria-label="Notiz: '+sEsc(p.x[1])+'" placeholder="Notiz" value="'+sEsc(s.notiz||'')+'" onchange="ulSetz(\''+key+'\',\'notiz\',this.value)"></div>'; }).join('')+'</div>'; }).join('');
  return '<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="ulZurueck()" data-ic="arrow-left">Alle Objekte</button>'
      +'<span class="ub-status">'+sEsc(o?o.name:r.objekt||'Objekt')+'</span><button type="button" class="secondary" onclick="UL.dok=\'liste\';wzDokument()" data-ic="file-text">Liste</button>'
      +'<button type="button" class="secondary" onclick="ulLoeschen()" data-ic="trash">Löschen</button></div>'
    +'<div class="wz-kpis grid">'+wzdKpi('Liegen vor',f.da+' von '+f.gesamt,f.gesamt?Math.round(f.da/f.gesamt*100)+' %':'')+wzdKpi('Angefordert',String(f.angefordert),'')
      +wzdKpi('Offen',String(f.gesamt-f.da-f.angefordert),'')+'</div>'
    +'<div class="fp-balken"><i style="width:'+(f.gesamt?Math.round(f.da/f.gesamt*100):0)+'%"></i></div>'
    +wzBox('',wzFeld('art','Objektart',{typ:'wahl',optionen:UL_ARTEN,zeichnen:true})
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="UL.dok=\'eigentuemer\';wzDokument()" data-ic="file-text">Liste für den Eigentümer</button></div>')
    +gruppen
    +wzBox('Vollmacht des Eigentümers','<p class="ka-nachweis-text">'+sEsc(ulVollmachtText(r))+'</p>'
      +'<div class="grid"><div class="field"><label>Eigentümer</label><div class="vl-empf"><b>'+sEsc(v.name||'–')+'</b><button type="button" class="secondary" onclick="ulVollmachtKunde()" data-ic="users">'+(v.name?'Ändern':'Aus der Kundenakte')+'</button></div></div></div>'
      +'<div class="ub-pads"><div class="ub-pad"><div class="ub-pad-kopf"><b>Unterschrift</b>'+(v.zeit?'<span>unterschrieben '+new Date(v.zeit).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})+'</span>':'')+'</div>'
      +'<canvas class="ub-canvas ul-pad" aria-label="Unterschrift des Eigentümers"></canvas><button type="button" class="secondary" onclick="ulUnterschriftWeg()">Unterschrift löschen</button></div></div>'
      +'<details class="ka-nachweis-aendern"><summary>Text ändern</summary><textarea id="ul_vollmacht_text" rows="4" onchange="ulVollmachtTextSetzen(this.value)">'+sEsc(v.text||UL_VOLLMACHT)+'</textarea>'
      +'<p class="hint">Platzhalter {objekt}, {berater}, {firma}. Vorgaben der Bank beachten. Wer den Text nach der Unterschrift ändert, muss neu unterschreiben lassen.</p></details>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="UL.dok=\'vollmacht\';wzDokument()" data-ic="file-text">Vollmacht als Dokument</button></div>'
      +wzHinweis('Die Stellen verlangen meist eine Kopie der unterschriebenen Vollmacht — sie geht mit der Anforderung mit.'));
}
function ulZeichnen(){
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='unterlagen') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  return UL.aktiv?ulEditor(UL.aktiv):ulListeHtml();
}
function ulRechnen(){
  iconify($('wz_body'));
  let r=UL.aktiv, c=document.querySelector('#wz_body .ul-pad'); if(!r||!c) return;
  const start=()=>wzUnterschriftPad(c,r.vollmacht.unterschrift,bild=>{ r.vollmacht.unterschrift=bild; r.vollmacht.zeit=new Date().toISOString(); wzdSpeichernBald('unterlagen',r); });
  if(c.getBoundingClientRect().width>0) start(); else setTimeout(start,60);
}
function ulSpeichern(){ if(UL.aktiv) wzdSpeichernBald('unterlagen',UL.aktiv); }

/* ---------- Dokumente: Liste, Liste für den Eigentümer, Anforderung je Stelle, Vollmacht ---------- */
function ulAbsender(){ if(typeof wzAbsenderKontakt==='function') return wzAbsenderKontakt(); let ber=typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}, pk=(wzAlle().portal||{}).kontakt||{};
  return {name:ber.name||pk.name||'',firma:ber.firma||(((wzAlle().portal||{}).anbieter)||{}).firma||'',tel:ber.tel||pk.tel||'',mail:ber.mail||pk.mail||''}; }
function ulObjektZeilen(r){
  let o=wzdObjekt(r.projektId), f=o?o.f:{}, z=[];
  z.push(['Objekt',sEsc((o&&o.anschrift)||r.objekt||'–')]);
  let gb=[f.od_grundbuch?'Grundbuch von '+f.od_grundbuch:'',f.od_gb_blatt?'Blatt '+f.od_gb_blatt:''].filter(Boolean).join(', ');
  if(gb) z.push(['Grundbuch',sEsc(gb)]);
  let fl=f.od_flst_nrn||f.ek_flst; if(fl) z.push(['Flurstück',sEsc(fl)]);
  if(r.vollmacht&&r.vollmacht.name) z.push(['Eigentümer',sEsc(r.vollmacht.name)]);
  return z;
}
function ulDokument(){
  let r=UL.aktiv, was=UL.dok; UL.dok='';
  if(!r){ alert('Bitte zuerst ein Objekt öffnen.'); return null; }
  let name=(wzdObjekt(r.projektId)||{}).name||r.objekt||'Objekt', posten=ulPosten(r), abs=ulAbsender();
  if(was==='vollmacht'){
    let v=r.vollmacht||{};
    return {titel:'Vollmacht '+name,ohneFuss:true,
      html:'<h1>Vollmacht</h1><p class="wzd-unter">zum Einholen von Auskünften und Unterlagen</p>'+wzDokTabelle(ulObjektZeilen(r))
        +'<p>'+sEsc(ulVollmachtText(r))+'</p>'
        +'<div class="wzd-unterschriften"><div><p>'+(v.zeit?new Date(v.zeit).toLocaleDateString('de-DE'):'Ort, Datum')+'</p>'
        +(v.unterschrift?'<img src="'+v.unterschrift+'" alt="Unterschrift">':'<div style="height:60px"></div>')+'<p>'+sEsc(v.name||'Eigentümer')+'</p></div></div>'};
  }
  if(was&&was.startsWith('anf:')){
    let [,stelle,keys]=was.split(':'), l=keys.split(',').map(k=>UL_LISTE.find(x=>x[0]===k)).filter(Boolean);
    return {titel:'Anforderung '+ulStellenName(stelle)+' '+name,ohneFuss:true,pflicht:true,
      html:'<div class="pa-briefkopf"><div class="pa-absender">'+sEsc([abs.name,abs.firma].filter(Boolean).join(' · ')||'[Absender]')+'</div>'
        +'<div class="pa-empfaenger">'+sEsc(ulStellenName(stelle))+'<br>[Anschrift]</div><div class="pa-daten">'+wzDokTabelle([['Datum',new Date().toLocaleDateString('de-DE')]].concat(abs.tel?[['Telefon',sEsc(abs.tel)]]:[]).concat(abs.mail?[['E-Mail',sEsc(abs.mail)]]:[]))+'</div></div>'
        +'<h1>Anforderung von Unterlagen</h1>'+wzDokTabelle(ulObjektZeilen(r))
        +'<p>Sehr geehrte Damen und Herren,</p><p>im Auftrag des Eigentümers bereite ich den Verkauf des oben genannten Objekts vor und bitte um:</p>'
        +'<ul>'+l.map(x=>'<li>'+sEsc(x[1])+'</li>').join('')+'</ul>'
        +'<p>Die Vollmacht des Eigentümers liegt bei. Eine entstehende Gebühr teilen Sie mir bitte vorab mit.</p><p>Mit freundlichen Grüßen</p><p>'+sEsc(abs.name||'')+'</p>'};
  }
  if(was==='eigentuemer'){
    let l=posten.filter(p=>p.x[2]==='eigentuemer'&&p.s.stand!=='da'&&p.s.stand!=='entfaellt'), andere=posten.filter(p=>p.x[2]!=='eigentuemer'&&p.s.stand!=='da'&&p.s.stand!=='entfaellt');
    return {titel:'Unterlagen für den Verkauf '+name,pflicht:true,
      html:'<h1>Unterlagen für den Verkauf</h1><p class="wzd-unter">'+sEsc(name)+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
        +(l.length?'<h2>Bitte heraussuchen</h2><ul>'+l.map(p=>'<li>'+sEsc(p.x[1])+(p.x[5]?' <span class="wzd-klein">('+sEsc(p.x[5])+')</span>':'')+'</li>').join('')+'</ul>':'<p>Von Ihnen wird nichts mehr gebraucht — vielen Dank.</p>')
        +(andere.length?'<h2>Das hole ich mit Ihrer Vollmacht ein</h2><ul>'+andere.map(p=>'<li>'+sEsc(p.x[1])+' — '+sEsc(ulStellenName(p.x[2]))+'</li>').join('')+'</ul>':''),
      fuss:'Liste der Unterlagen für den Verkauf.'};
  }
  return {titel:'Unterlagen '+name,
    html:'<h1>Unterlagen</h1><p class="wzd-unter">'+sEsc(name)+' · '+sEsc((UL_ARTEN.find(a=>a[0]===r.art)||UL_ARTEN[0])[1])+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle(posten.map(p=>[sEsc(p.x[1]),sEsc(ulStellenName(p.x[2])),ulStandName(p.s.stand)+(p.s.datum?' '+wzDatum(p.s.datum):''),sEsc(p.s.notiz||'')]),['Unterlage','Stelle','Stand','Notiz']),
    fuss:'Arbeitsliste ohne Gewähr für Vollständigkeit; was der Notar und die Bank des Käufers brauchen, kann im Einzelfall abweichen.'};
}

/* ---------- Kundenakte: Löschen und Auskunft (Vollmacht mit Name und Unterschrift) ---------- */
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const r of wzdListe('unterlagen').filter(r=>r.kundeId===id)){ r.kundeId=''; r.vollmacht=Object.assign({},r.vollmacht,{name:'',unterschrift:'',zeit:''}); await wzdSpeichern('unterlagen',r); }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let l=wzdListe('unterlagen').filter(r=>r.kundeId===id);
  return ['','VOLLMACHTEN ZUM EINHOLEN VON UNTERLAGEN'].concat(l.length?l.map(r=>'- '+((wzdObjekt(r.projektId)||{}).name||r.objekt||'Objekt')+': '+(r.vollmacht&&r.vollmacht.name||'')
    +(r.vollmacht&&r.vollmacht.zeit?', unterschrieben am '+new Date(r.vollmacht.zeit).toLocaleDateString('de-DE'):', noch nicht unterschrieben')):['- keine']);
});

wzRegistrieren({id:'unterlagen',titel:'Unterlagen',sub:'Was liegt vor, was ist angefordert — Vollmacht und Anforderung je Stelle',icon:'folder-open',ohneNeu:true,
  zustand:()=>UL.aktiv,speichern:ulSpeichern,zeichnen:ulZeichnen,rechnen:ulRechnen,dokument:ulDokument,
  schliessen:()=>{ if(UL.aktiv) wzdSpeichernSofort('unterlagen',UL.aktiv); UL.aktiv=null; UL.dok=''; }});
