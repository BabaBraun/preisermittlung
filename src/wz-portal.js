/* ---------- Kachel „Portal-Export“ (D39) ----------
   Gesicherte Objekte in Vermarktung als ZIP für Immobilienportale: XML im Austauschformat OpenImmo 1.2.7 (js/portal.js) und
   die Bilder aus der Fotoauswahl des Exposés. Vorbereitet für den Tag, an dem die App über einen Server läuft — bis dahin
   nimmt das Portal die Datei über seine Import-Schnittstelle an (meist ein FTP-Zugang, den das Portal einrichtet).
   - Exportiert wird der gesicherte Stand der Projekte (Projekte → Sichern), nicht die geöffnete Bewertung.
   - Je Objekt bleiben Objektnummer, Freigabe der Anschrift, Objektart und Angaben zum Energieausweis in den Eingaben der
     Werkzeuge (localStorage „ia_wz“); ebenso, wann ein Objekt zuletzt exportiert wurde (danach „Änderung“ statt „neu“).
   - Fehlen Pflichtangaben (Anschrift, Ansprechpartner, Energieausweis nach § 87 GModG), bleibt das Objekt draußen. */
const PT_STAENDE=['Auftrag erteilt','In Vermarktung','Reserviert'];
function ptStart(){ return {anbieter:{firma:'',nr:'',anid:''},kontakt:{name:'',funktion:'',tel:'',mail:''},alle:false,objekte:{},export:{}}; }
/* ältere oder eingespielte Eingaben vervollständigen */
function ptNorm(S){ ['anbieter','kontakt','objekte','export'].forEach(k=>{ if(!S[k]||typeof S[k]!=='object'||Array.isArray(S[k])) S[k]={}; }); return S; }
function ptGemerkt(){ try{ return typeof exKontaktGemerkt==='function'?exKontaktGemerkt():{}; }catch(e){ return {}; } }
function ptAnbieter(S){ let g=ptGemerkt(); return {firma:(S.anbieter.firma||'').trim()||g.firma||exV('cfg_kopf')||'',nr:S.anbieter.nr||'',anid:S.anbieter.anid||''}; }
/* Ansprechpartner: Angaben im Exposé des Projekts vor den Angaben hier, dann der gemerkte Kontakt des Exposés */
function ptKontakt(S,f){
  let g=ptGemerkt(), k=S.kontakt||{}, v=id=>String(f&&f[id]||'').trim();
  return {name:v('ex_k_name')||k.name||g.name||v('ek_ersteller'),funktion:v('ex_k_funktion')||k.funktion||g.funktion||v('ek_ersteller_funktion'),
    tel:v('ex_k_tel')||k.tel||g.tel||'',mail:v('ex_k_mail')||k.mail||g.mail||'',firma:v('ex_k_firma')||(S.anbieter.firma||'').trim()||g.firma||''};
}
function ptEinstellung(S,id){ let e=S.objekte&&S.objekte[id]; return e&&typeof e==='object'?e:{}; }
function ptExportiert(S,id){ let x=S.export&&S.export[id]; return x&&typeof x==='object'?x:null; }
function ptListe(S){
  return (typeof pjLoad==='function'?pjLoad():[]).map(p=>{
    let f=(p.data&&p.data.fields)||{}, st=f.vm_status||'', e=ptEinstellung(S,p.id), ex=ptExportiert(S,p.id);
    let imExport=typeof e.an==='boolean'?e.an:['In Vermarktung','Reserviert'].includes(st);
    return {p,f,id:p.id,name:p.name||f.ek_anschrift||'Projekt',status:st,an:imExport,ex};
  }).filter(x=>S.alle||PT_STAENDE.includes(x.status)||(x.ex&&x.ex.aktion!=='DELETE'))
    .sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
function ptObjekt(S,x,fotos,aktion){
  return ImmoPortal.objekt(x.f,{projektId:x.id,geaendert:x.p.geaendert,kontakt:ptKontakt(S,x.f),einstellung:ptEinstellung(S,x.id),fotos:fotos,aktion:aktion});
}
function ptAktion(S,id){ let ex=ptExportiert(S,id); return ex&&ex.aktion!=='DELETE'?'CHANGE':''; }

function ptZeichnen(S){
  ptNorm(S);
  let A=ptAnbieter(S), g=ptGemerkt(), l=ptListe(S), offen=document.body.classList.contains('started')&&exV('ek_anschrift');
  let einst='<div class="grid">'
    +'<div class="field"><label for="wz_portal_firma">Anbieter (Firma)</label><input id="wz_portal_firma" data-wz="anbieter.firma" value="'+sEsc(S.anbieter.firma||'')+'" placeholder="'+sEsc(g.firma||exV('cfg_kopf')||'z. B. Name der Bank')+'" data-zeichnen="1"></div>'
    +wzFeld('anbieter.nr','Anbieternummer beim Portal',{typ:'text',ph:'vergibt das Portal'})
    +'<div class="field"><label for="wz_portal_kname">Ansprechpartner</label><input id="wz_portal_kname" data-wz="kontakt.name" value="'+sEsc(S.kontakt.name||'')+'" placeholder="'+sEsc(g.name||exV('ek_ersteller')||'Vor- und Nachname')+'" data-zeichnen="1"></div>'
    +'<div class="field"><label for="wz_portal_kfunktion">Funktion</label><input id="wz_portal_kfunktion" data-wz="kontakt.funktion" value="'+sEsc(S.kontakt.funktion||'')+'" placeholder="'+sEsc(g.funktion||'')+'"></div>'
    +'<div class="field"><label for="wz_portal_ktel">Telefon</label><input id="wz_portal_ktel" data-wz="kontakt.tel" value="'+sEsc(S.kontakt.tel||'')+'" placeholder="'+sEsc(g.tel||'')+'" data-zeichnen="1"></div>'
    +'<div class="field"><label for="wz_portal_kmail">E-Mail für Anfragen</label><input id="wz_portal_kmail" data-wz="kontakt.mail" value="'+sEsc(S.kontakt.mail||'')+'" placeholder="'+sEsc(g.mail||'')+'" data-zeichnen="1"></div>'
    +'</div>'+wzHinweis('Leere Felder übernimmt die App aus dem Ansprechpartner des Exposés. Anbieter-Kennung: '+(S.anbieter.anid?sEsc(S.anbieter.anid):'entsteht beim ersten Export')+'.');
  let karten=l.map(x=>ptKarte(S,x)).join('');
  return wzBox('So funktioniert es',wzHinweis('Die App schreibt die Objekte mit Bildern in eine ZIP-Datei im Austauschformat OpenImmo (Version 1.2.7), das Portale wie ImmoScout24 und Immowelt über ihre Import-Schnittstelle annehmen. '
      +'Exportiert wird der <b>gesicherte</b> Stand der Projekte mit Texten, Preis und Fotoauswahl aus dem Exposé. Die direkte Übertragung an ein Portal braucht einen Server — das ist der nächste Schritt, wenn die App einmal über den Server der Bank läuft.')
      +(offen?'<div class="gr-zeile"><button type="button" class="secondary" onclick="ptSichern()" data-ic="save">Geöffnete Bewertung jetzt sichern</button></div>':''))
    +wzBox('Anbieter und Ansprechpartner',einst)
    +wzBox('Objekte',wzFeld('alle','auch Projekte ohne Vermarktungsstand zeigen',{typ:'check',zeichnen:true})
      +(l.length?karten:wzHinweis('Hier erscheinen gesicherte Projekte mit dem Stand „Auftrag erteilt“, „In Vermarktung“ oder „Reserviert“ (Bewertung → ⑬ Vermarktung).'))
      +(l.length?'<div class="gr-zeile"><button type="button" class="primary" onclick="ptExport(false)" data-ic="download">Ausgewählte exportieren</button>'
        +'<button type="button" class="secondary" onclick="ptExport(true)" data-ic="archive">Als Gesamtbestand exportieren</button></div>'
        +wzHinweis('„Ausgewählte“ ergänzt oder ändert nur diese Objekte im Portal. Beim <b>Gesamtbestand</b> nimmt das Portal alle Objekte des Anbieters vom Markt, die nicht in der Datei stehen.'):''))
    +wzBox('Datenschutz',wzHinweis('Fotos vor dem Export ansehen: keine Personen, keine Kfz-Kennzeichen, keine Namen an Klingel oder Briefkasten, keine Unterlagen mit persönlichen Daten. '
      +'Ohne Freigabe der Anschrift gehen nur PLZ und Ort an das Portal; die vollständige Anschrift nur mit Einverständnis des Eigentümers. Namen von Kunden enthält die Datei nicht.'));
}
function ptKarte(S,x){
  let e=ptEinstellung(S,x.id), o=ptObjekt(S,x,null,''), pr=ImmoPortal.pruefen(o), pfad='objekte.'+x.id+'.';
  let frei=o.geo.frei, art=ImmoPortal.artVorschlag(ImmoPortal.leser(x.f)), artName=(ImmoPortal.ARTEN.find(a=>a[0]===art)||['',''])[1];
  let ex=x.ex, fotos=x.p.nFotos||0;
  let ampel=!pr.ok?wzAmpel('rot','Fehlt: '+pr.fehler.map(sEsc).join(' · ')+'<br>Ohne diese Angaben bleibt das Objekt beim Export draußen.')
    :pr.hinweise.length?wzAmpel('gelb',pr.hinweise.map(sEsc).join('<br>')):wzAmpel('gruen','Bereit für den Export.');
  const id=s=>'wz_portal_'+idSicher(x.id)+'_'+s;
  return '<div class="wz-karte pt-karte"><div class="wz-karte-kopf"><label class="wz-check"><input type="checkbox" data-wz="'+pfad+'an"'+(x.an?' checked':'')+' aria-label="'+sEsc(x.name)+' exportieren"><b>'+sEsc(x.name)+'</b></label>'
      +'<span>'+sEsc([x.status||'ohne Stand',o.preis>0?wzEur(o.preis):'',fotos?fotos+' Foto'+(fotos===1?'':'s'):'keine Fotos'].filter(Boolean).join(' · '))+'</span>'
      +'<span>'+(ex?(ex.aktion==='DELETE'?'vom Portal genommen am ':'zuletzt exportiert am ')+wzDatum(ex.datum):'noch nicht exportiert')+'</span></div>'
    +'<div class="grid">'
    +'<div class="field"><label for="'+id('nr')+'">Objektnummer</label><input id="'+id('nr')+'" data-wz="'+pfad+'nr" value="'+sEsc(e.nr||'')+'" placeholder="'+sEsc(ImmoPortal.objektnrVorschlag(x.id))+'"></div>'
    +'<div class="field"><label for="'+id('art')+'">Objektart im Portal</label><select id="'+id('art')+'" data-wz="'+pfad+'art" data-zeichnen="1"><option value="">automatisch: '+sEsc(artName)+'</option>'
      +ImmoPortal.ARTEN.map(a=>'<option value="'+a[0]+'"'+(e.art===a[0]?' selected':'')+'>'+sEsc(a[1])+'</option>').join('')+'</select></div>'
    +'<div class="field"><label for="'+id('aus')+'">Energieausweis ausgestellt am</label><input id="'+id('aus')+'" type="date" data-wz="'+pfad+'ausgestellt" value="'+sEsc(e.ausgestellt||'')+'"></div>'
    +'<div class="field"><label for="'+id('bis')+'">gültig bis</label><input id="'+id('bis')+'" type="date" data-wz="'+pfad+'gueltigBis" value="'+sEsc(e.gueltigBis||'')+'"></div>'
    +'<div class="field"><label for="'+id('jg')+'">Energieausweis</label><select id="'+id('jg')+'" data-wz="'+pfad+'jahrgang" data-zeichnen="1">'
      +ImmoPortal.JAHRGAENGE.map(j=>'<option value="'+j[0]+'"'+((e.jahrgang||'')===j[0]?' selected':'')+'>'+sEsc(j[1])+'</option>').join('')+'</select></div>'
    +'<label class="wz-check"><input type="checkbox" data-wz="'+pfad+'adresse" data-zeichnen="1"'+(frei?' checked':'')+'><span>vollständige Anschrift im Portal zeigen</span></label>'
    +'</div>'+ampel
    +(ex&&ex.aktion!=='DELETE'?'<div class="gr-zeile"><button type="button" class="secondary" onclick="ptVomPortal(\''+idSicher(x.id)+'\')" data-ic="trash">Vom Portal nehmen</button></div>':'')
    +'</div>';
}
function ptRechnen(){ iconify($('wz_body')); }
async function ptSichern(){ if(typeof projektSichern!=='function') return; await projektSichern(); wzZeichnen(); }

/* ---------- Export ---------- */
function ptAnidSichern(S){ if(!S.anbieter.anid){ S.anbieter.anid=ImmoPortal.anid(new Date(),Math.random().toString(36).slice(2,12)); wzSpeichernJetzt(); } }
async function ptVoll(x){
  let r=x.p;
  if(IA_DB_BEREIT){ try{ r=await iaGet('projekte',x.id)||x.p; }catch(e){} }
  return {f:(r.data&&r.data.fields)||x.f,fotos:(r.data&&Array.isArray(r.data.photos))?r.data.photos:[],geaendert:r.geaendert||x.p.geaendert};
}
async function ptExport(voll){
  let S=ptNorm(wzZustand('portal')), A=ptAnbieter(S);
  if(!A.firma){ alert('Bitte oben die Firma des Anbieters eintragen.'); return; }
  let liste=ptListe(S).filter(x=>x.an);
  if(!liste.length){ alert('Kein Objekt für den Export ausgewählt.'); return; }
  if(voll&&!confirm('Als Gesamtbestand exportieren?\nDas Portal nimmt dann alle Objekte des Anbieters vom Markt, die nicht in dieser Datei stehen ('+liste.length+' Objekt'+(liste.length===1?'':'e')+').')) return;
  await IA_BEREIT_P; ptAnidSichern(S); A=ptAnbieter(S);
  let objekte=[], dateien=[], draussen=[];
  for(const x of liste){
    let v=await ptVoll(x), o=ImmoPortal.objekt(v.f,{projektId:x.id,geaendert:v.geaendert,kontakt:ptKontakt(S,v.f),einstellung:ptEinstellung(S,x.id),fotos:v.fotos,aktion:ptAktion(S,x.id)});
    let pr=ImmoPortal.pruefen(o,A);
    if(!pr.ok){ draussen.push(x.name+': '+pr.fehler.join(', ')); continue; }
    o.bilder=o.bilder.filter(b=>{ let p=v.fotos.find(q=>q.id===b.id), bild=p&&ImmoOffice.dataUrlZuBild(p.data);
      if(!bild) return false; dateien.push({name:b.datei,daten:bild.bytes}); return true; });
    objekte.push(o);
  }
  if(!objekte.length){ alert('Kein Objekt konnte exportiert werden:\n'+draussen.join('\n')); return; }
  let jetzt=new Date(), text=ImmoPortal.xml(objekte,A,{voll:!!voll,jetzt});
  let zip=ImmoOffice.zip([{name:'immobilien.xml',daten:text}].concat(dateien),jetzt);
  let name='Portal-Export '+aufHeute()+(voll?' Gesamtbestand':'')+'.zip';
  let erg=await iaHerunterladen(new Blob([zip],{type:'application/zip'}),name);
  if(erg==='abgebrochen'||erg==='fehlgeschlagen') return;
  objekte.forEach(o=>{ S.export[o.projektId]={datum:aufHeute(),aktion:o.aktion||'ADD'}; });
  wzSpeichernJetzt(); wzZeichnen();
  alert(objekte.length+' Objekt'+(objekte.length===1?'':'e')+' mit '+dateien.length+' Bild'+(dateien.length===1?'':'ern')+' exportiert („'+name+'“).'
    +(draussen.length?'\n\nNicht exportiert (Angaben fehlen):\n'+draussen.join('\n'):''));
}
async function ptVomPortal(id){
  let S=ptNorm(wzZustand('portal')), A=ptAnbieter(S), x=ptListe(Object.assign({},S,{alle:true})).find(y=>y.id===id); if(!x) return;
  if(!A.firma){ alert('Bitte oben die Firma des Anbieters eintragen.'); return; }
  if(!confirm('Datei erzeugen, mit der das Portal „'+x.name+'“ vom Markt nimmt?')) return;
  await IA_BEREIT_P; ptAnidSichern(S); A=ptAnbieter(S);
  let v=await ptVoll(x), o=ImmoPortal.objekt(v.f,{projektId:id,geaendert:v.geaendert,kontakt:ptKontakt(S,v.f),einstellung:ptEinstellung(S,id),fotos:[],aktion:'DELETE'});
  let jetzt=new Date(), zip=ImmoOffice.zip([{name:'immobilien.xml',daten:ImmoPortal.xml([o],A,{jetzt})}],jetzt);
  let name='Portal-Export '+aufHeute()+' vom Markt '+ImmoPortal.dateiTeil(o.nr)+'.zip';
  let erg=await iaHerunterladen(new Blob([zip],{type:'application/zip'}),name);
  if(erg==='abgebrochen'||erg==='fehlgeschlagen') return;
  S.export[id]={datum:aufHeute(),aktion:'DELETE'}; wzSetz(S,'objekte.'+id+'.an',false); wzSpeichernJetzt(); wzZeichnen();
}
wzRegistrieren({id:'portal',titel:'Portal-Export',sub:'Objekte mit Bildern für Immobilienportale · OpenImmo 1.2.7',icon:'upload',start:ptStart,ohneNeu:true,
  zeichnen:ptZeichnen,rechnen:ptRechnen,aktionen:[{label:'Exportieren',icon:'download',fn:'ptExport(false)'}]});
