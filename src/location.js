/* ---------- Lage-Check: amtliche Karten per Tipp, mit dokumentiertem Ergebnis --------------------------
   Die Kartendienste des Landes nehmen keine Koordinaten über die Adresse entgegen (BORIS-BW nur die Gemeinde,
   der LUBW-Dienst UDO springt nach Eingabe von UTM-Koordinaten ins Suchfeld). Deshalb legt die App vor dem
   Öffnen die passende Angabe in die Zwischenablage: die Adresse bzw. die Koordinaten in ETRS89 / UTM 32N
   (EPSG:25832). Eine Adresssuche über einen fremden Dienst gibt es bewusst nicht — die Objektadresse soll das
   Gerät nicht verlassen. Je Prüfpunkt werden Ergebnis, Notiz und Prüfdatum gespeichert und im Bericht gezeigt. */
/* WGS84/ETRS89 geografisch → UTM Zone 32 (Krüger-Reihe, Genauigkeit im Millimeterbereich) */
function lageUtm32(lat,lon){
  const a=6378137, f=1/298.257222101, k0=0.9996, lon0=9*Math.PI/180;
  const n=f/(2-f), A=a/(1+n)*(1+n*n/4+Math.pow(n,4)/64);
  const al=[0,n/2-2*n*n/3+5*Math.pow(n,3)/16,13*n*n/48-3*Math.pow(n,3)/5,61*Math.pow(n,3)/240];
  const phi=lat*Math.PI/180, lam=lon*Math.PI/180-lon0, e=Math.sqrt(f*(2-f));
  const t=Math.sinh(Math.atanh(Math.sin(phi))-e*Math.atanh(e*Math.sin(phi)));
  const xi=Math.atan2(t,Math.cos(lam)), eta=Math.atanh(Math.sin(lam)/Math.sqrt(1+t*t));
  let x=xi, y=eta; for(let j=1;j<=3;j++){ x+=al[j]*Math.sin(2*j*xi)*Math.cosh(2*j*eta); y+=al[j]*Math.cos(2*j*xi)*Math.sinh(2*j*eta); }
  return {ost:500000+k0*A*y, nord:k0*A*x};
}
function lageKoord(){
  let lat=zahlLesen(exV('au_lat'),false), lon=zahlLesen(exV('au_lon'),false);
  if(!(lat>47&&lat<56&&lon>5&&lon<16)) return null;
  let u=lageUtm32(lat,lon); return {lat:lat,lon:lon,ost:Math.round(u.ost),nord:Math.round(u.nord)};
}
const LAGE_PRUEFUNGEN=[
  {k:'brw',name:'Bodenrichtwert',dienst:'BORIS-BW',ablage:'adresse',
   url:()=>'https://www.gutachterausschuesse-bw.de/borisbw/?app=boris_bw'+(exOrt()?'&commune='+encodeURIComponent(exOrt()):''),
   tipp:'Nutzungsbedingungen bestätigen, Adresse in die Suche einfügen. Bodenrichtwert unter „Allgemeine Angaben“, Stichtag in den Eckdaten und unter „Datengrundlagen“ eintragen.'},
  {k:'hochwasser',name:'Hochwasser',dienst:'LUBW, Hochwassergefahrenkarte',ablage:'utm',url:()=>'https://udo.lubw.baden-wuerttemberg.de/public/',
   tipp:'Thema „Hochwassergefahrenkarte“ öffnen, Koordinaten ins Suchfeld einfügen, Eingabe drücken. Liegt das Grundstück in HQ100 oder HQextrem?'},
  {k:'starkregen',name:'Starkregen',dienst:'Gemeinde, Starkregengefahrenkarte',ablage:'adresse',url:()=>'https://www.lubw.baden-wuerttemberg.de/wasser/starkregenrisikomanagement',
   tipp:'Starkregengefahrenkarten erstellen die Gemeinden. Bei der Gemeinde nachfragen oder auf deren Website nachsehen.'},
  {k:'laerm',name:'Umgebungslärm',dienst:'LUBW, Lärmkartierung',ablage:'utm',url:()=>'https://udo.lubw.baden-wuerttemberg.de/public/',
   tipp:'Thema „Umgebungslärm“ (Straße, Schiene) öffnen, Koordinaten ins Suchfeld einfügen.'},
  {k:'bplan',name:'Bebauungsplan',dienst:'Geoportal Baden-Württemberg',ablage:'adresse',url:()=>'https://www.geoportal-bw.de/',
   tipp:'Im Kartenviewer die Bauleitplanung einblenden, Adresse suchen; sonst bei der Gemeinde nachfragen. Ergebnis unter „Objektdaten & Beschreibung“ → Planungsrecht eintragen.'},
  {k:'baugrund',name:'Baugrund und Hangrutschungen',dienst:'LGRB-Kartenviewer',ablage:'adresse',url:()=>'https://maps.lgrb-bw.de/',
   tipp:'Ingenieurgeologie, Hangbewegungen und Erdfälle prüfen.'},
  {k:'altlasten',name:'Altlasten',dienst:'Landratsamt, Bodenschutz- und Altlastenkataster',ablage:'',url:null,
   tipp:'Auskunft beim Landratsamt; in der Regel mit Zustimmung des Eigentümers.'},
  {k:'baulasten',name:'Baulasten',dienst:'Baurechtsbehörde, Baulastenverzeichnis',ablage:'',url:null,
   tipp:'Auskunft bei der Baurechtsbehörde der Gemeinde bzw. des Landratsamts.'},
  // eigener Prüfpunkt (D36): Bezeichnung und Quelle selbst eintragen
  {k:'sonst',name:'Sonstiges',dienst:'eigene Quelle',ablage:'',url:null,eigen:true,
   tipp:'Eigener Prüfpunkt, z. B. Denkmalliste, Fluglärm, Trinkwasserschutzgebiet — Bezeichnung und Quelle selbst eintragen.'}
];
const LAGE_ERGEBNIS=[['','nicht geprüft'],['ok','unauffällig'],['auff','auffällig'],['na','nicht relevant']];
function buildLageCheck(){
  let box=$('lage_check'); if(!box) return;
  box.innerHTML=LAGE_PRUEFUNGEN.map(p=>'<div class="lage-zeile" data-k="'+p.k+'">'
    +'<div class="lage-kopf"><div>'+(p.eigen?'<input id="lg_bez_'+p.k+'" placeholder="Eigener Prüfpunkt" aria-label="Eigener Prüfpunkt: Bezeichnung">'
       +'<input id="lg_qu_'+p.k+'" placeholder="Quelle, z. B. Landesamt für Denkmalpflege" aria-label="Eigener Prüfpunkt: Quelle">':'<b>'+p.name+'</b><span>'+p.dienst+'</span>')+'</div>'
    +(p.url?'<button type="button" class="secondary no-print" onclick="lageOeffnen(\''+p.k+'\')" data-ic="map">Öffnen</button>':'')+'</div>'
    +'<p class="hint lage-tipp">'+p.tipp+'</p>'
    +'<div class="lage-erg"><select id="lg_st_'+p.k+'" aria-label="'+p.name+': Ergebnis" onchange="lageStatus(\''+p.k+'\')">'+LAGE_ERGEBNIS.map(e=>'<option value="'+e[0]+'">'+e[1]+'</option>').join('')+'</select>'
    +'<input id="lg_no_'+p.k+'" placeholder="Notiz, z. B. Zone, HQ-Stufe, Quelle" aria-label="'+p.name+': Notiz">'
    +'<input id="lg_dt_'+p.k+'" type="date" aria-label="'+p.name+': geprüft am"></div></div>').join('');
}
function lageStatus(k){ let d=$('lg_dt_'+k); if(d&&!d.value&&exV('lg_st_'+k)) d.value=aufHeute(); lageAnzeige(); autosave(); }
function lageAnzeige(){
  let el=$('lage_koord'); if(!el) return;
  let c=lageKoord();
  el.innerHTML=c?'UTM 32 (EPSG:25832): <b>'+c.ost.toLocaleString('de-DE')+' / '+c.nord.toLocaleString('de-DE')+'</b> · geografisch '+c.lat.toFixed(5).replace('.',',')+' / '+c.lon.toFixed(5).replace('.',',')
    +' · <a href="https://www.openstreetmap.org/?mlat='+c.lat+'&mlon='+c.lon+'#map=18/'+c.lat+'/'+c.lon+'" target="_blank" rel="noopener">Karte</a>'
    :'Keine Koordinaten — im Aufnahmebogen den Standort erfassen oder Breiten- und Längengrad eintragen (z. B. aus einer Karte).';
  document.querySelectorAll('#lage_check .lage-zeile').forEach(z=>{ let s=exV('lg_st_'+z.dataset.k); z.className='lage-zeile'+(s?' st-'+s:''); });
}
function lageOeffnen(k){
  let p=LAGE_PRUEFUNGEN.find(x=>x.k===k); if(!p||!p.url) return;
  let c=lageKoord(), text='';
  if(p.ablage==='utm'&&c) text=c.ost+' '+c.nord;
  else if(p.ablage) text=exV('ek_anschrift');
  const auf=()=>window.open(p.url(),'_blank','noopener');
  if(text&&navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>{ iaHinweis((p.ablage==='utm'?'Koordinaten':'Adresse')+' kopiert — dort einfügen'); setTimeout(()=>iaHinweis(''),2600); },()=>{});
  } else if(p.ablage==='utm'&&!c) { iaHinweis('Ohne Koordinaten: dort die Adresse suchen'); setTimeout(()=>iaHinweis(''),2600); }
  auf();
}
function lageBericht(esc){
  let z=LAGE_PRUEFUNGEN.filter(p=>exV('lg_st_'+p.k)||exV('lg_no_'+p.k)||(p.eigen&&exV('lg_bez_'+p.k)));
  const nm=p=>p.eigen?(exV('lg_bez_'+p.k)||p.name):p.name, qu=p=>p.eigen?(exV('lg_qu_'+p.k)||''):p.dienst;
  if(!z.length) return '';
  const erg=k=>(LAGE_ERGEBNIS.find(e=>e[0]===exV('lg_st_'+k))||['',''])[1];
  let c=lageKoord();
  return '<h2>Lage-Check</h2><table><tr><td><b>Prüfpunkt</b></td><td><b>Quelle</b></td><td><b>Ergebnis</b></td></tr>'
    +z.map(p=>'<tr><td>'+esc(nm(p))+'</td><td>'+esc(qu(p))+(exV('lg_dt_'+p.k)?(qu(p)?', ':'')+'geprüft am '+new Date(exV('lg_dt_'+p.k)+'T00:00:00').toLocaleDateString('de-DE'):'')+'</td>'
      +'<td>'+esc(erg(p.k))+(exV('lg_no_'+p.k)?' — '+esc(exV('lg_no_'+p.k)):'')+'</td></tr>').join('')+'</table>'
    +(c?'<div class="beschr">Lage des Objekts: UTM 32 (EPSG:25832) '+c.ost+' / '+c.nord+'.</div>':'');
}
