/* ---------- Kachel „Wertmonitor“ (D38) ----------
   Gesicherte Bewertungen fortschreiben: dieselbe Rechnung wie in der Bewertung (ImmoKern.bewerte) mit den gespeicherten
   Eingaben, einmal zum damaligen Stichtag und einmal zu heute — mit dem amtlichen Baupreisindex zum heutigen Datum, dem
   höheren Alter des Gebäudes und, falls eingetragen, einem neuen Bodenrichtwert. Marktanpassung, Mieten und Vergleichspreise
   bleiben wie in der Bewertung. Ab einer Schwelle schlägt er eine Wiedervorlage vor (Gesprächsanlass). Nur Anzeige — die
   Projekte bleiben unverändert. */
function wmStart(){ return {schwelle:'5',nurKunden:false,brw:{},wv:{}}; }
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
function wmRechne(p,S){
  let f=(p.data&&p.data.fields)||{}, stich=wmStichtag(p,f), heute=aufHeute();
  let jahrAlt=stich?parseInt(stich.slice(0,4),10):new Date().getFullYear(), jahrNeu=new Date().getFullYear();
  let alt=null, neu=null;
  try{ alt=ImmoKern.bewerte(wmLeser(f),{jahr:jahrAlt,szen:{lz:0,miete:1}}).R; }catch(e){}
  let art=f.bpi_art||ImmoBaupreisindex.artAusTyp(f.ek_typ||''), bpi=ImmoBaupreisindex.wertFuer(art,heute);
  let ueber={ek_stichtag:heute};
  if(bpi&&(f.ek_modus||'haus')!=='wohnung'){ ueber.bpi=String(bpi.wert).replace('.',','); ueber.bpi_faktor=String(bpi.faktor).replace('.',','); }
  let brwNeu=wzN(wzHol(S,'brw.'+p.id),true); if(brwNeu>0) ueber.ek_brw=String(brwNeu).replace('.',',');
  try{ neu=ImmoKern.bewerte(wmLeser(f,ueber),{jahr:jahrNeu,szen:{lz:0,miete:1}}).R; }catch(e){}
  let a=alt&&alt.empfehlung>0?alt.empfehlung:0, n=neu&&neu.empfehlung>0?neu.empfehlung:0;
  let kd=f.ek_kunde_id&&typeof KD_CACHE!=='undefined'?KD_CACHE.find(k=>k.id===f.ek_kunde_id):null;
  return {id:p.id,name:p.name||f.ek_anschrift||'Projekt',kundeId:f.ek_kunde_id||'',kunde:kd?kdName(kd):'',stichtag:stich,alt:a,neu:n,
    aenderung:a>0&&n>0?(n-a)/a*100:null,bpiAlt:wzN(f.bpi),bpiNeu:ueber.bpi?bpi.wert:null,bpiVorlaeufig:!!(bpi&&bpi.vorlaeufig),wohnung:(f.ek_modus||'')==='wohnung',
    brwAlt:wzN(f.ek_brw,true),brwNeu:brwNeu,gespeichert:wzN(p.empf,true)};
}
function wmListe(S){
  let l=(typeof pjLoad==='function'?pjLoad():[]).map(p=>wmRechne(p,S));
  if(S.nurKunden) l=l.filter(x=>x.kundeId);
  return l.sort((a,b)=>(a.name||'').localeCompare(b.name||'','de'));   // feste Reihenfolge: rechnen() schreibt in die Zeilen von zeichnen()
}
function wmZeichnen(S){
  let l=wmListe(S);
  let zeilen=l.map((x,i)=>'<tr><td><b>'+sEsc(x.name)+'</b>'+(x.kunde?'<small>'+sEsc(x.kunde)+'</small>':'')+'</td><td>'+wzDatum(x.stichtag)+'</td>'
    +'<td class="r">'+(x.alt?wzEur(x.alt):'–')+'</td><td class="r">'+(x.neu?wzEur(x.neu):'–')+'</td><td class="r" id="wz_wm_d_'+i+'">–</td>'
    +'<td><input data-wz="brw.'+x.id+'" inputmode="decimal" aria-label="neuer Bodenrichtwert '+sEsc(x.name)+'" placeholder="'+(x.brwAlt?wzZ(x.brwAlt,0)+' €/m²':'€/m²')+'" value="'+sEsc(wzHol(S,'brw.'+x.id)||'')+'" data-zeichnen="1"></td>'
    +'<td class="wz-aktion" id="wz_wm_a_'+i+'"></td></tr>').join('');
  return wzBox('Fortschreibung der gesicherten Bewertungen',wzHinweis('Jede gesicherte Bewertung wird wie in der Bewertung gerechnet — einmal zum damaligen Stichtag, einmal zu heute mit dem aktuellen Baupreisindex '
      +'(Statistisches Landesamt), dem höheren Gebäudealter und einem neuen Bodenrichtwert, falls eingetragen (bei Änderung neu gerechnet). Marktanpassung, Mieten und Vergleichspreise bleiben wie in der Bewertung.')
    +'<div class="grid">'+wzFeld('schwelle','Wiedervorlage ab einer Änderung von',{typ:'prozent',einheit:'%'})+wzFeld('nurKunden','nur Bewertungen mit Kunde',{typ:'check',zeichnen:true})+'</div>'
    +(l.length?'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Objekt</th><th>Stichtag</th><th>Wert damals</th><th>Wert heute</th><th>Änderung</th><th>neuer Bodenrichtwert</th><th></th></tr></thead><tbody>'+zeilen+'</tbody></table></div>'
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="wmAlleWiedervorlagen()" data-ic="calendar">Wiedervorlagen für alle über der Schwelle</button></div>'
      :wzHinweis('Noch keine gesicherte Bewertung'+(S.nurKunden?' mit Kunde':'')+'. Bewertungen sicherst du über „Projekte“.'))
    +'<p class="hint" id="wz_wm_fuss"></p>');
}
function wmRechnen(S){
  let l=wmListe(S), schwelle=wzN(S.schwelle)||5, vorl=false;
  l.forEach((x,i)=>{
    if(x.bpiVorlaeufig) vorl=true;
    let d=x.aenderung;
    wzH('wz_wm_d_'+i,d==null?'–':'<span class="'+(Math.abs(d)>=schwelle?(d>0?'wz-plus':'wz-minus'):'')+'">'+(d>0?'+':'')+wzP(d,1)+'</span>'
      +(x.bpiNeu&&x.bpiAlt?'<small>Baupreisindex '+wzZ(x.bpiAlt,1)+' → '+wzZ(x.bpiNeu,1)+'</small>':x.wohnung?'<small>Wohnung: Vergleichspreise aktualisieren</small>':''));
    let wv=wzHol(S,'wv.'+x.id);
    wzH('wz_wm_a_'+i,d!=null&&Math.abs(d)>=schwelle?(wv?'<small>Wiedervorlage am '+wzDatum(wv)+'</small>':'<button type="button" class="secondary" onclick="wmWiedervorlage(\''+idSicher(x.id)+'\')" data-ic="calendar">Wiedervorlage</button>'):'');
  });
  iconify($('wz_body'));
  wzT('wz_wm_fuss',vorl?'Der Baupreisindex für das laufende Quartal ist noch nicht veröffentlicht — gerechnet mit dem neuesten Wert (vorläufig).':'');
}
function wmWiedervorlage(id,still){
  let S=wzZustand('wertmonitor'), p=pjLoad().find(x=>x.id===id); if(!p) return false;
  let x=wmRechne(p,S); if(x.aenderung==null) return false;
  let frist=new Date(); frist.setDate(frist.getDate()+7);
  let text='Wertmonitor: '+x.name+' — Wert seit '+wzDatum(x.stichtag)+' um '+(x.aenderung>0?'+':'')+wzP(x.aenderung,1)+' ('+wzEur(x.alt)+' → '+wzEur(x.neu)+'). Gespräch anbieten (Finanzierung, Modernisierung, Verkauf).';
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
      +wzDokTabelle(l.map(x=>[sEsc(x.name)+(x.kunde?' ('+sEsc(x.kunde)+')':''),wzDatum(x.stichtag),x.alt?wzEur(x.alt):'–',x.neu?wzEur(x.neu):'–',x.aenderung==null?'–':(x.aenderung>0?'+':'')+wzP(x.aenderung,1)]),
        ['Objekt','Stichtag','damals','heute','Änderung'])
      +'<p class="wzd-klein">Fortgeschrieben mit dem amtlichen Baupreisindex zum heutigen Datum, dem höheren Gebäudealter und neuen Bodenrichtwerten, soweit eingetragen. Marktanpassung, Mieten und Vergleichspreise wie in der jeweiligen Bewertung. Keine neue Bewertung.</p>',
    fuss:'Fortschreibung zur Orientierung, keine neue Bewertung.'};
}
wzRegistrieren({id:'wertmonitor',titel:'Wertmonitor',sub:'Bewertungen fortschreiben · Gesprächsanlässe',icon:'activity',start:wmStart,ohneNeu:true,zeichnen:wmZeichnen,rechnen:wmRechnen,dokument:wmDokument});
