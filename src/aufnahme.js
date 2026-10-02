/* ---------- Aufnahmebogen → Bewertung (D35) -------------------------------------------------------------------------
   Was bei der Ortsbesichtigung festgestellt wird, fließt in die Bewertung, sobald es im Aufnahmebogen eingetragen wird:
   - Ausstattungsstandard je Bauteil (Beschreibungen der Standardstufen 1–5 nach NHK 2010, Anlage 4 ImmoWertV, gekürzt)
     → Standardstufe im Gebäudepreis des Hauptgebäudes; „fehlt“ → Bauteil mit Kostenanteil 0 (D37),
   - Modernisierungen (Modernisierungselemente nach ImmoWertV Anlage 2) → Modernisierungspunkte: „vollständig erneuert“
     ergibt die Höchstpunktzahl des Elements, „nicht modernisiert“ 0; „teilweise“ und länger Zurückliegendes legt der
     Bewerter dort selbst fest (Anlage 2: dann ggf. weniger als die Höchstpunktzahl),
   - Heizung, Fenster, Energieausweis, Effizienzklasse und Aufzug → Objektdaten; Keller → Unterkellerung;
     Energiekennwert und -klasse → Energetische Qualität (wie bisher der Knopf „Aus Aufnahmebogen“).
   In der Bewertung bleibt jeder Wert änderbar (z. B. Stufe 3,5); übernommene Felder sind markiert, bis man sie dort ändert.
   Beim Laden einer Bewertung wird nichts übertragen — nur, wenn im Aufnahmebogen etwas geändert wird. Die Rechnung
   selbst ändert sich nicht: es werden nur Eingaben der Bewertung gesetzt. */
const AU_STUFEN=[
  ["Außenwände",["Holzfachwerk, einfache Putze/Verfugung, kein/minimaler Wärmeschutz",
    "einschaliges Mauerwerk, einfacher Wärmeschutz, einfacher Putz",
    "zweischalig/ WDVS, Wärmedämmung nach gültiger EnEV/GEG-Vorgänger, üblicher Putz",
    "Verblendmauerwerk, hochwertige Dämmung (z.B. KfW-Niveau), hochwertiger Putz",
    "aufwendige Fassade (Naturstein, vorgehängt), Passivhaus-Niveau"]],
  ["Dach",["Bitumen-/Wellplatten, keine Dämmung",
    "einfache Betondachsteine, geringe Dämmung",
    "Betondachsteine/Tonziegel, übliche Zwischensparrendämmung",
    "hochw. Ziegel, Aufsparren-/hochw. Dämmung, Dachflächenfenster gut",
    "Schiefer/Kupfer/aufwendige Form, beste Dämmung, aufwendige Gauben"]],
  ["Außentüren + Fenster",["Einfachverglasung, einfache Türen",
    "Zweifach alt (Bj. vor ~1995), einfache Rahmen",
    "Zweifachverglasung zeitgemäß, Kunststoff/Holz üblich",
    "Dreifachverglasung, erhöhter Schall-/Einbruchschutz",
    "Spezialverglasung, Sicherheitstüren RC-Klasse, aufwendige Elemente"]],
  ["Innenwände + -türen",["Leichtwände, einfachste Türen",
    "einfache Türblätter, dünne Wände",
    "massive/übliche Wände, Standardtüren",
    "schwere Türen, hochwertige Beschläge, tw. Glaselemente",
    "Edelholz-/Glastüren, raumhohe Elemente, aufwendige Ausführung"]],
  ["Decken + Treppen",["Holzbalkendecke ohne Estrich, einfache Treppe",
    "Holzbalken mit Estrich, einfache Stahl-/Holztreppe",
    "Betondecke, schwimmender Estrich, übliche Treppe",
    "höhere Spannweiten, gute Trittschalldämmung, hochw. Treppenbelag",
    "Sichtbeton/Naturstein, freitragende Designtreppen"]],
  ["Fußböden",["PVC/Nadelfilz einfach, ohne Belag",
    "einfacher Teppich/Linoleum",
    "Fliesen, Laminat, Teppich mittlerer Qualität",
    "Parkett, hochwertige Fliesen, großformatig",
    "Naturstein, hochw. Massivparkett, großflächig edel"]],
  ["Sanitär",["1 WC, Bad ohne Komfort, tw. außerhalb",
    "1 einfaches Bad",
    "1–2 Bäder mittlerer Qualität, zeitgemäß",
    "2+ hochwertige Bäder, Gäste-WC, gute Objekte",
    "mehrere Luxusbäder, Wellness (Sauna/Whirlpool)"]],
  ["Heizung",["Einzelöfen, keine Zentralheizung",
    "Zentralheizung alt (>30 J.), einfache Radiatoren",
    "Öl-/Gas-Zentralheizung zeitgemäß, übliche Heizkörper",
    "Brennwert + Solar, Fußbodenheizung überwiegend",
    "Wärmepumpe/Pellet/Geothermie, Klimatisierung, Lüftungsanlage mit WRG"]],
  ["Sonstige techn. Ausstattung",["minimale Elektroausstattung (je Raum 1 Steckdose)",
    "einfache Elektroinstallation, wenige Kreise",
    "zeitgemäße Elektroinstallation, ausreichend Steckdosen",
    "viele Kreise, Netzwerk, elektr. Rollläden, ggf. PV klein",
    "Smart Home/KNX, Aufzug, PV + Speicher, umfangreiche Technik"]]
];
const AU_MOD_UMFANG=[['','–'],['voll','vollständig erneuert'],['teil','teilweise'],['nein','nicht modernisiert']];
const AU_KELLER={'voll unterkellert':'ja','teilunterkellert':'teilweise','nicht unterkellert':'nein'};
const AU_AUSWEIS={'Verbrauchsausweis liegt vor':'Verbrauchsausweis','Bedarfsausweis liegt vor':'Bedarfsausweis','liegt nicht vor':'nicht vorhanden'};

/* Referenztabelle im Hauptgebäude und Auswahl im Aufnahmebogen aus denselben Beschreibungen */
function buildAufnahmeStandard(){
  let ref=$('nhk_stufen_ref');
  if(ref) ref.innerHTML='<tr><th style="width:14%">Bauteil</th><th>Stufe 1 (einfachst)</th><th>Stufe 2</th><th>Stufe 3 (mittel/Standard)</th><th>Stufe 4 (gehoben)</th><th>Stufe 5 (stark gehoben)</th></tr>'
    +AU_STUFEN.map(([b,t])=>'<tr><td><b>'+b+'</b></td>'+t.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('');
  let box=$('au_std_box');
  if(box) box.innerHTML=AU_STUFEN.map(([b,t],i)=>'<div class="field"><label for="au_std'+i+'">'+b+'</label><select id="au_std'+i+'">'
    +'<option value="">– nicht erfasst</option>'+t.map((x,s)=>'<option value="'+(s+1)+'">'+(s+1)+' · '+x+'</option>').join('')
    +'<option value="f">fehlt — Bauteil nicht vorhanden (Kostenanteil 0)</option></select></div>').join('');
  let mod=$('au_mod_box');
  if(mod) mod.innerHTML=MOD_ELEMENTS.map(([b,max],i)=>'<div class="field"><label for="au_mod_u'+i+'">'+b+' <span class="u">max. '+max+' Punkte</span></label>'
    +'<div class="au-mod-zeile"><select id="au_mod_u'+i+'">'+AU_MOD_UMFANG.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select>'
    +'<input id="au_mod_j'+i+'" type="text" inputmode="numeric" placeholder="Jahr" aria-label="'+b+': im Jahr"></div></div>').join('')
    // Sonstige Modernisierung (D36): nur zur Dokumentation — Punkte gibt es nur für die acht Elemente der Anlage 2
    +'<div class="field full"><label for="au_mod_s_bez">Sonstige Modernisierung <span class="u">ohne Punkte, nur zur Dokumentation</span></label>'
    +'<div class="au-mod-zeile au-mod-sonst"><input id="au_mod_s_bez" placeholder="z. B. Balkonsanierung, neue Garagentore" aria-label="Sonstige Modernisierung: was">'
    +'<select id="au_mod_s_u" aria-label="Sonstige Modernisierung: Umfang">'+AU_MOD_UMFANG.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select>'
    +'<input id="au_mod_s_j" type="text" inputmode="numeric" placeholder="Jahr" aria-label="Sonstige Modernisierung: im Jahr"></div></div>';
}

/* Freitext aus dem Aufnahmebogen einer Auswahl der Objektdaten zuordnen — nur bei eindeutigem Stichwort */
function auFenster(t){ t=(t||'').toLowerCase();
  return /dreifach|3-?fach|3-?scheiben/.test(t)?'Dreifachverglasung':/kasten/.test(t)?'Kastenfenster'
    :/zweifach|2-?fach|isolier|doppel/.test(t)?'Zweifachverglasung':/einfach|1-?fach/.test(t)?'Einfachverglasung (Altbestand)':''; }
function auHeizung(t){ t=(t||'').toLowerCase();
  return /wärmepumpe|waermepumpe|\bwp\b|luft-wasser|sole/.test(t)?'Wärmepumpe':/fern|nahwärme/.test(t)?'Fernwärme'
    :/pellet|holz|biomasse|hackschnitzel/.test(t)?'Pellet / Biomasse':/nachtspeicher|elektroheiz|stromheiz/.test(t)?'Nachtspeicher / dezentral'
    :/einzelofen|einzelöfen/.test(t)?'Einzelöfen':/etage/.test(t)?'Gas-Etagenheizung':/(^|[^a-zäöüß])öl|oel/.test(t)?'Öl-Zentralheizung'
    :/gas/.test(t)?'Gas-Zentralheizung':''; }

/* Wert in ein Feld der Bewertung setzen und als übernommen markieren; Auswahlfelder nur mit vorhandener Option */
function auSetzen(id,wert){
  let e=$(id); if(!e||wert===undefined||wert===null||wert==='') return;
  wert=String(wert);
  if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===wert)) return;
  e.value=wert; e.classList.add('aus-aufnahme'); e.title='aus dem Aufnahmebogen übernommen';
}
function auUebertragen(id){
  let v=exV(id), m;
  if((m=/^au_std(\d)$/.exec(id))){ let f=$('nhkhg_f'+m[1]);
    if(v==='f'&&f){ f.checked=true; f.classList.add('aus-aufnahme'); }
    else if(v){ auSetzen('nhkhg_s'+m[1],v); if(f) f.checked=false; } }
  else if((m=/^au_mod_[uj](\d)$/.exec(id))){ let i=+m[1], u=exV('au_mod_u'+i);
    if(u==='voll') auSetzen('mod_p'+i,MOD_ELEMENTS[i][1]); else if(u==='nein') auSetzen('mod_p'+i,0); }
  else if(id==='au_keller') auSetzen('hg_keller',AU_KELLER[v]);
  else if(id==='au_aufzug'){ if(v==='ja'||v==='nein') auSetzen('od_aufzug',v); }
  else if(id==='au_energieausweis') auSetzen('od_energieausweis',AU_AUSWEIS[v]);
  else if(id==='au_energieklasse'){ if(v&&v!=='–'){ auSetzen('od_effizienz',v); auSetzen('en_klasse',v); $('en_klasse').dataset.manuell='1'; } }
  else if(id==='au_energiewert'){ let k=num('au_energiewert');
    if(k>0){ auSetzen('en_kennwert',num2(k)); let kl=exV('au_energieklasse'); if(!kl||kl==='–') $('en_klasse').dataset.manuell=''; } }
  else if(id==='au_fenster') auSetzen('od_fenster',auFenster(v));
  else if(id==='au_heizung_art') auSetzen('od_heizung',auHeizung(v));
  else return;
  auModAnzeige(); compute(); autosave();
}
/* Spalte „lt. Aufnahmebogen“ bei den Modernisierungspunkten */
function auModAnzeige(){
  let jahr=new Date().getFullYear();
  MOD_ELEMENTS.forEach((el,i)=>{ let td=$('mod_au'+i); if(!td) return;
    let u=exV('au_mod_u'+i), j=parseInt(exV('au_mod_j'+i),10), t=(AU_MOD_UMFANG.find(x=>x[0]===u)||['',''])[1];
    if(!u||u==='') t='';
    if(t&&j>1800&&j<=jahr) t+=', '+j+(jahr-j>0?' (vor '+(jahr-j)+' J.)':'');
    td.textContent=t; });
}
document.addEventListener('change',e=>{ let t=e.target; if(t&&t.id&&/^au_/.test(t.id)&&t.closest('#s-aufnahme')) auUebertragen(t.id); });
/* in der Bewertung von Hand geändert: Markierung „aus dem Aufnahmebogen“ entfernen */
document.addEventListener('input',e=>{ let t=e.target;
  if(e.isTrusted&&t&&t.classList&&t.classList.contains('aus-aufnahme')){ t.classList.remove('aus-aufnahme'); t.removeAttribute('title'); } },true);

/* Für den Bericht: Modernisierungen laut Aufnahmebogen (Umfang, Jahr), mit der sonstigen Modernisierung (D36) */
function auModBericht(){
  const um=u=>(AU_MOD_UMFANG.find(x=>x[0]===u)||['',''])[1];
  let z=MOD_ELEMENTS.map(([b],i)=>{ let u=exV('au_mod_u'+i), j=exV('au_mod_j'+i); return u?b+': '+um(u)+(j?' ('+j+')':''):''; });
  let sb=(exV('au_mod_s_bez')||'').trim(), su=exV('au_mod_s_u'), sj=exV('au_mod_s_j');
  if(sb) z.push('Sonstiges — '+sb+(su?': '+um(su):'')+(sj?' ('+sj+')':''));
  return z.filter(Boolean);
}

/* ---------- Feststellungen mit Foto (D37) ----------
   Vor Ort: Feststellung kurz beschreiben, mit „Foto“ ein Bild aufnehmen. Die Feststellungen stehen als Liste im versteckten
   Feld au_fest (JSON, reist mit der Bewertung); die Fotos sind gewöhnliche Schadensfotos mit Verweis auf die Feststellung
   (fest) — im Bericht stehen sie bei ihrer Feststellung statt noch einmal unter den Schadensfotos. */
let AU_FEST_ZIEL=null;
function auFestDaten(){ try{ let a=JSON.parse(exV('au_fest')||'[]'); return Array.isArray(a)?a.filter(x=>x&&x.id):[]; }catch(e){ return []; } }
function auFestSpeichern(l){ $('au_fest').value=l.length?JSON.stringify(l):''; autosave(); }
function auFestNeu(){
  let l=auFestDaten(), id='f'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  l.push({id,text:''}); auFestSpeichern(l); auFestRender();
  let t=document.querySelector('.au-fest[data-fest="'+id+'"] textarea'); if(t) t.focus();
}
function auFestText(id,v){ let l=auFestDaten(), x=l.find(y=>y.id===id); if(!x) return;
  let alt=(x.text||'').trim(), neu=v.trim(), geaendert=false; x.text=v; $('au_fest').value=JSON.stringify(l);
  // Bildunterschrift der Fotos mitführen (Foto oft vor dem Text aufgenommen) — außer sie wurde selbst geändert.
  // Nur das Feld in der Fotodokumentation anpassen, nichts neu zeichnen: sonst verlöre das Textfeld den Fokus.
  PHOTOS.forEach(p=>{ if(p.fest!==id||(p.caption&&p.caption!==alt)) return; p.caption=neu; geaendert=true;
    let inp=document.querySelector('.photo[data-foto="'+idSicher(p.id)+'"] input'); if(inp) inp.value=neu; });
  if(geaendert) fotosGeaendert();
  autosave(); }
function auFestWeg(id){
  let n=PHOTOS.filter(p=>p.fest===id).length;
  if(n&&!confirm('Feststellung mit '+n+' Foto'+(n>1?'s':'')+' löschen? Die Fotos werden ebenfalls gelöscht.')) return;
  if(n){ PHOTOS=PHOTOS.filter(p=>p.fest!==id); fotosGeaendert(); renderPhotos(); }
  auFestSpeichern(auFestDaten().filter(x=>x.id!==id)); auFestRender();
}
function auFestFoto(id){ AU_FEST_ZIEL=id; let f=$('au_fest_datei'); if(f){ f.value=''; f.click(); } }
function auFestFotos(files){
  let id=AU_FEST_ZIEL; AU_FEST_ZIEL=null; if(!id||!files) return;
  let text=((auFestDaten().find(x=>x.id===id)||{}).text||'').trim();
  [...files].forEach(f=>{ if(!f.type||!f.type.startsWith('image/')) return;
    let r=new FileReader();
    r.onload=()=>downscale(r.result,1400,0.75,dataUrl=>{
      PHOTOS.push({id:'p'+Date.now()+Math.random().toString(36).slice(2,6),cat:'schaden',caption:text,data:dataUrl,fest:id});
      fotosGeaendert(); renderPhotos(); autosave(); });
    r.readAsDataURL(f); });
  let inp=$('au_fest_datei'); if(inp) inp.value='';
}
function auFestRender(){
  let box=$('au_fest_liste'); if(!box) return;
  let l=auFestDaten();
  box.innerHTML=l.length?l.map(x=>{ let id=idSicher(x.id), fotos=PHOTOS.filter(p=>p.fest===x.id);
    return '<div class="au-fest" data-fest="'+id+'"><textarea aria-label="Feststellung" placeholder="z. B. Feuchtefleck Kellerwand Nordseite" oninput="auFestText(\''+id+'\',this.value)">'+sEsc(x.text||'')+'</textarea>'
      +'<div class="au-fest-rechts"><div class="au-fest-fotos">'+fotos.map(p=>'<img src="'+bildUrl(p.data)+'" alt="'+sEsc(p.caption||'Foto zur Feststellung')+'">').join('')+'</div>'
      +'<div class="au-fest-knoepfe no-print"><button type="button" class="secondary" onclick="auFestFoto(\''+id+'\')" data-ic="camera">Foto'+(fotos.length?' ('+fotos.length+')':'')+'</button>'
      +'<button type="button" class="weg" aria-label="Feststellung entfernen" onclick="auFestWeg(\''+id+'\')">✕</button></div></div></div>'; }).join('')
    :'<p class="hint" style="margin:0">Noch keine Feststellung mit Foto.</p>';
  if(typeof iconify==='function') try{ iconify(box); }catch(e){}
}
/* Für den Bericht: Feststellungen mit Text oder Foto */
function auFestBericht(){ return auFestDaten().map(x=>({text:(x.text||'').trim(),fotos:PHOTOS.filter(p=>p.fest===x.id)})).filter(x=>x.text||x.fotos.length); }

