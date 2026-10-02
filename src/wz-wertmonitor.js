/* ---------- Kachel „Wertmonitor“ (D38) ----------
   Gesicherte Bewertungen auf heute fortschreiben, als Gesprächsanlass:
   - vorrangig mit einer Preisindexreihe des Marktes (§ 9 Abs. 1, § 18 ImmoWertV): Wert damals × Index heute / Index damals,
     getrennt für Ein- und Zweifamilienhäuser und Eigentumswohnungen. Die Jahreswerte trägt der Berater aus dem
     Grundstücksmarktbericht des Gutachterausschusses oder dem Häuserpreisindex des Statistischen Bundesamts ein.
   - zur Information dieselbe Rechnung wie in der Bewertung (ImmoKern.bewerte) zu heute: amtlicher Baupreisindex, höheres
     Gebäudealter, neuer Bodenrichtwert. Der Baupreisindex ist ein Kostenindex — ohne neue Marktanpassung zeigt diese Rechnung
     steigende Werte auch dann, wenn die Kaufpreise fallen; sie ersetzt den Preisindex deshalb nicht.
   Wiedervorlagen ab einer Schwelle. Werbende Ansprache nur mit Einwilligung (§ 7 UWG). Die Projekte bleiben unverändert. */
function wmStart(){ return {schwelle:'5',nurKunden:false,brw:{},wv:{},index:{haus:{},wohnung:{}}}; }
const WM_GRUNDLAGE={vertrag:'Auftrag',einwilligung:'Einwilligung',sonstige:'sonstige Grundlage'};
/* Leser über gespeicherte Felder; fehlende Felder mit dem Ausgangswert des Formulars, Zahlen wie in der Bewertung gelesen */
function wmLeser(fields,ueber){
  const hat=(o,id)=>o&&Object.prototype.hasOwnProperty.call(o,id);
  const roh=id=>{
    if(hat(ueber,id)) return ueber[id];
    if(hat(fields,id)) return fields[id];
    let el=$(id); if(!el) return '';
    if(el.type==='checkbox'||el.type==='radio') return el.defaultChecked;
    if(el.tagName==='SELECT'){ let o=[...el.options].find(x=>x.defaultSelected); return o?o.value:(el.options[0]?el.options[0].value:''); }
    return el.defaultValue;
  };
  return {n:id=>{ let v=roh(id); return typeof v==='number'?v:ImmoKern.zahlLesen(v==null?'':String(v),istBetrag(id)); },
    v:id=>{ let v=roh(id); return v==null?'':String(v); },an:id=>!!roh(id)};
}
function wmStichtag(p,f){
  if(/^\d{4}-\d{2}-\d{2}$/.test(f.ek_stichtag||'')) return f.ek_stichtag;
  let m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(p.datum||'').trim());
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
}
/* Indexwert eines Jahres; fehlt das laufende Jahr, gilt das jüngste eingetragene Jahr ab dem Stichtagsjahr */
function wmIndex(S,art,jahr){ let v=wzN(wzHol(S,'index.'+art+'.'+jahr),false); return v>0?v:0; }   // Indexzahl, kein Betrag
function wmIndexHeute(S,art,abJahr){
  for(let j=new Date().getFullYear();j>=abJahr;j--){ let v=wmIndex(S,art,j); if(v>0) return {jahr:j,wert:v}; }
  return null;
}
function wmRechne(p,S){
  let f=(p.data&&p.data.fields)||{}, stich=wmStichtag(p,f), heute=aufHeute();
  let jahrAlt=stich?parseInt(stich.slice(0,4),10):new Date().getFullYear(), jahrNeu=new Date().getFullYear();
  let wohnung=(f.ek_modus||'')==='wohnung', art=wohnung?'wohnung':'haus';
  let alt=null, neu=null;
  try{ alt=ImmoKern.bewerte(wmLeser(f),{jahr:jahrAlt,szen:{lz:0,miete:1}}).R; }catch(e){}
  let bpiArt=f.bpi_art||ImmoBaupreisindex.artAusTyp(f.ek_typ||''), bpi=ImmoBaupreisindex.wertFuer(bpiArt,heute);
  let ueber={ek_stichtag:heute};
  if(bpi&&!wohnung){ ueber.bpi=String(bpi.wert).replace('.',','); ueber.bpi_faktor=String(bpi.faktor).replace('.',','); }
  let brwNeu=wzN(wzHol(S,'brw.'+p.id),true); if(brwNeu>0) ueber.ek_brw=String(brwNeu).replace('.',',');
  try{ neu=ImmoKern.bewerte(wmLeser(f,ueber),{jahr:jahrNeu,szen:{lz:0,miete:1}}).R; }catch(e){}
  let a=alt&&alt.empfehlung>0?alt.empfehlung:0, n=neu&&neu.empfehlung>0?neu.empfehlung:0;
  // Preisindex (Marktentwicklung)
  let iAlt=wmIndex(S,art,jahrAlt), iNeu=wmIndexHeute(S,art,jahrAlt), index=a>0&&iAlt>0&&iNeu?a*iNeu.wert/iAlt:0;
  let kd=f.ek_kunde_id&&typeof KD_CACHE!=='undefined'?KD_CACHE.find(k=>k.id===f.ek_kunde_id):null;
  let basis=index>0?index:n;
  return {id:p.id,name:p.name||f.ek_anschrift||'Projekt',kundeId:f.ek_kunde_id||'',kunde:kd?kdName(kd):'',grundlage:kd?(WM_GRUNDLAGE[kd.grundlage]||''):'',
    stichtag:stich,jahrAlt,art,wohnung,alt:a,kosten:n,index,indexJahr:iNeu?iNeu.jahr:null,
    aenderung:a>0&&basis>0?(basis-a)/a*100:null,nachIndex:index>0,aenderungKosten:a>0&&n>0?(n-a)/a*100:null,
    bpiAlt:wzN(f.bpi),bpiNeu:ueber.bpi?bpi.wert:null,bpiVorlaeufig:!!(bpi&&bpi.vorlaeufig),brwAlt:wzN(f.ek_brw,true),brwNeu};
}
function wmListe(S){
  let l=(typeof pjLoad==='function'?pjLoad():[]).map(p=>wmRechne(p,S));
  if(S.nurKunden) l=l.filter(x=>x.kundeId);
  return l.sort((a,b)=>(a.name||'').localeCompare(b.name||'','de'));   // feste Reihenfolge: rechnen() schreibt in die Zeilen von zeichnen()
}
function wmIndexFelder(S,l){
  let von=Math.min(new Date().getFullYear()-3,...l.map(x=>x.jahrAlt).filter(j=>j>1990)), bis=new Date().getFullYear(), jahre=[];
  for(let j=von;j<=bis;j++) jahre.push(j);
  const reihe=(art,titel)=>'<div class="wm-reihe"><span>'+titel+'</span>'+jahre.map(j=>'<label class="wm-jahr">'+j
    +'<input data-wz="index.'+art+'.'+j+'" inputmode="decimal" aria-label="Index '+titel+' '+j+'" value="'+sEsc(wzHol(S,'index.'+art+'.'+j)||'')+'"></label>').join('')+'</div>';
  return reihe('haus','Ein- und Zweifamilienhäuser')+reihe('wohnung','Eigentumswohnungen');
}
function wmZeichnen(S){
  let l=wmListe(S);
  let zeilen=l.map((x,i)=>'<tr><td><b>'+sEsc(x.name)+'</b>'+(x.kunde?'<small>'+sEsc(x.kunde)+(x.grundlage?' · '+sEsc(x.grundlage):'')+'</small>':'')+'</td><td>'+wzDatum(x.stichtag)+'</td>'
    +'<td class="r">'+(x.alt?wzEur(x.alt):'–')+'</td><td class="r" id="wz_wm_h_'+i+'">–</td><td class="r" id="wz_wm_d_'+i+'">–</td><td class="r" id="wz_wm_k_'+i+'">–</td>'
    +'<td><input data-wz="brw.'+x.id+'" inputmode="decimal" aria-label="neuer Bodenrichtwert '+sEsc(x.name)+'" placeholder="'+(x.brwAlt?wzZ(x.brwAlt,0)+' €/m²':'€/m²')+'" value="'+sEsc(wzHol(S,'brw.'+x.id)||'')+'" data-zeichnen="1"></td>'
    +'<td class="wz-aktion" id="wz_wm_a_'+i+'"></td></tr>').join('');
  return wzBox('Preisindex des Marktes',wzHinweis('Werte werden mit einer Indexreihe an die Wertverhältnisse von heute angepasst (§ 9 Abs. 1, § 18 ImmoWertV). '
      +'Jahreswerte aus dem Grundstücksmarktbericht des Gutachterausschusses oder dem Häuserpreisindex des Statistischen Bundesamts eintragen — beliebige Basis, '
      +'gerechnet wird mit dem Verhältnis „heute / Jahr des Stichtags“.')+wmIndexFelder(S,l))
    +wzBox('Fortschreibung der gesicherten Bewertungen',wzHinweis('„heute“ rechnet mit dem Preisindex. Daneben zur Information die Rechnung der Bewertung zu heute: amtlicher Baupreisindex, '
      +'höheres Gebäudealter, neuer Bodenrichtwert (falls eingetragen). Der Baupreisindex misst Baukosten, nicht Kaufpreise — ohne Preisindex ist die Fortschreibung nur ein grober Anhalt.')
    +'<div class="grid">'+wzFeld('schwelle','Wiedervorlage ab einer Änderung von',{typ:'prozent',einheit:'%'})+wzFeld('nurKunden','nur Bewertungen mit Kunde',{typ:'check',zeichnen:true})+'</div>'
    +(l.length?'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Objekt</th><th>Stichtag</th><th>Wert damals</th><th>heute (Preisindex)</th><th>Änderung</th><th>Baukosten und Alter</th><th>neuer Bodenrichtwert</th><th></th></tr></thead><tbody>'+zeilen+'</tbody></table></div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wmAlleWiedervorlagen()" data-ic="calendar">Wiedervorlagen für alle über der Schwelle</button></div>'
      :wzHinweis('Noch keine gesicherte Bewertung'+(S.nurKunden?' mit Kunde':'')+'. Bewertungen sicherst du über „Projekte“.'))
    +'<p class="hint" id="wz_wm_fuss"></p>'
    +wzHinweis('Kundenansprache: Werbende Anrufe bei Verbrauchern nur mit vorheriger ausdrücklicher Einwilligung, werbende E-Mails nur mit Einwilligung oder nach § 7 Abs. 3 UWG (§ 7 Abs. 2 UWG) — die Einwilligung zur Werbung im Bankverfahren prüfen.'));
}
function wmRechnen(S){
  let l=wmListe(S), schwelle=wzN(S.schwelle)||5, vorl=false, ohneIndex=0;
  l.forEach((x,i)=>{
    if(x.bpiVorlaeufig) vorl=true; if(!x.nachIndex) ohneIndex++;
    wzH('wz_wm_h_'+i,x.index>0?wzEur(x.index)+'<small>Index '+x.jahrAlt+' → '+x.indexJahr+'</small>':'<small>Index fehlt</small>');
    let d=x.aenderung;
    wzH('wz_wm_d_'+i,d==null?'–':'<span class="'+(Math.abs(d)>=schwelle?(d>0?'wz-plus':'wz-minus'):'')+'">'+(d>0?'+':'')+wzP(d,1)+'</span>'+(x.nachIndex?'':'<small>nur Baukosten und Alter</small>'));
    wzH('wz_wm_k_'+i,x.kosten?wzEur(x.kosten)+'<small>'+(x.aenderungKosten>0?'+':'')+wzP(x.aenderungKosten||0,1)
      +(x.bpiNeu&&x.bpiAlt?' · Baupreisindex '+wzZ(x.bpiAlt,1)+' → '+wzZ(x.bpiNeu,1):x.wohnung?' · Wohnung: Vergleichspreise aktualisieren':'')+'</small>':'–');
    let wv=wzHol(S,'wv.'+x.id);
    wzH('wz_wm_a_'+i,d!=null&&Math.abs(d)>=schwelle?(wv?'<small>Wiedervorlage am '+wzDatum(wv)+'</small>':'<button type="button" class="secondary" onclick="wmWiedervorlage(\''+idSicher(x.id)+'\')" data-ic="calendar">Wiedervorlage</button>'):'');
  });
  iconify($('wz_body'));
  wzT('wz_wm_fuss',(ohneIndex?ohneIndex+' Bewertung'+(ohneIndex>1?'en':'')+' ohne Preisindex — dort nur die Rechnung nach Baukosten und Alter. ':'')
    +(vorl?'Der Baupreisindex für das laufende Quartal ist noch nicht veröffentlicht — gerechnet mit dem neuesten Wert (vorläufig).':''));
}
function wmWiedervorlage(id,still){
  let S=wzZustand('wertmonitor'), p=pjLoad().find(x=>x.id===id); if(!p) return false;
  let x=wmRechne(p,S); if(x.aenderung==null) return false;
  let frist=new Date(); frist.setDate(frist.getDate()+7);
  let text='Wertmonitor: '+x.name+' — Wert seit '+wzDatum(x.stichtag)+' um '+(x.aenderung>0?'+':'')+wzP(x.aenderung,1)
    +(x.nachIndex?' (Preisindex, '+wzEur(x.alt)+' → '+wzEur(x.index)+')':' (nur Baukosten und Alter, Marktentwicklung prüfen)')
    +'. Gespräch anbieten (Finanzierung, Modernisierung, Verkauf) — werbende Ansprache nur mit Einwilligung (§ 7 UWG).';
  if(!aufStore(aufLoad().concat([{id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text,frist:frist.toISOString().slice(0,10),objekt:x.name,kundeId:x.kundeId,erledigt:false,angelegt:Date.now()}]))) return false;
  wzSetz(S,'wv.'+id,aufHeute()); wzSpeichern(); try{ aufBadge(); }catch(e){}
  if(!still){ wzRechnen(); alert('Wiedervorlage angelegt (fällig in 7 Tagen).'); }
  return true;
}
function wmAlleWiedervorlagen(){
  let S=wzZustand('wertmonitor'), schwelle=wzN(S.schwelle)||5;
  let l=wmListe(S).filter(x=>x.aenderung!=null&&Math.abs(x.aenderung)>=schwelle&&!wzHol(S,'wv.'+x.id));
  if(!l.length){ alert('Keine weitere Bewertung über der Schwelle.'); return; }
  if(!confirm(l.length+' Wiedervorlage'+(l.length>1?'n':'')+' anlegen?')) return;
  let n=0; l.forEach(x=>{ if(wmWiedervorlage(x.id,true)) n++; });
  wzRechnen(); alert(n+' Wiedervorlage'+(n===1?'':'n')+' angelegt.');
}
function wmDokument(S){
  let l=wmListe(S); if(!l.length){ alert('Noch keine gesicherte Bewertung.'); return null; }
  return {titel:'Wertmonitor '+new Date().toLocaleDateString('de-DE'),
    html:'<h1>Wertmonitor</h1><p class="wzd-unter">Fortschreibung der gesicherten Bewertungen auf den '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle(l.map(x=>[sEsc(x.name)+(x.kunde?' ('+sEsc(x.kunde)+')':''),wzDatum(x.stichtag),x.alt?wzEur(x.alt):'–',x.index?wzEur(x.index):'–',
        x.aenderung==null?'–':(x.aenderung>0?'+':'')+wzP(x.aenderung,1)+(x.nachIndex?'':' (nur Baukosten/Alter)')]),['Objekt','Stichtag','damals','heute (Preisindex)','Änderung'])
      +'<p class="wzd-klein">Fortgeschrieben mit einer Preisindexreihe des Marktes (§ 9 Abs. 1, § 18 ImmoWertV); wo sie fehlt, nur nach Baupreisindex, Gebäudealter und Bodenrichtwert — ein grober Anhalt. Keine neue Bewertung.</p>',
    fuss:'Fortschreibung zur Orientierung, keine neue Bewertung.'};
}
wzRegistrieren({id:'wertmonitor',titel:'Wertmonitor',sub:'Bewertungen fortschreiben · Gesprächsanlässe',icon:'activity',start:wmStart,ohneNeu:true,zeichnen:wmZeichnen,rechnen:wmRechnen,dokument:wmDokument});
