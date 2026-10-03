/* ---------- Kachel „Aktivitäten“ (D40) ----------
   Was ist im Zeitraum passiert? Akquise (neue Eigentümer-Kontakte, Termine, erteilte Aufträge), Vermarktung (neue Anfragen nach
   Quelle, versendete Exposés, Besichtigungen, Gebote), Abschluss (Notartermine, Übergaben) und Beratung (Gesprächsnotizen und
   Finanzierungsrechnungen in den Kundenakten, erledigte Wiedervorlagen) — mit Vergleich zum Vorzeitraum. Gezählt wird aus den
   Daten der anderen Kacheln; Namen erscheinen nicht. Zeiträume aus js/beratung.js (zeitraum). Für Vertriebssteuerung und
   eigene Planung; die Bewertungen werden nur gelesen. */
var AK={extra:null,laeuft:null};
const AK_ZEITRAUM=[['woche','Diese Woche'],['vorwoche','Letzte Woche'],['monat','Dieser Monat'],['vormonat','Letzter Monat'],['quartal','Dieses Quartal'],['jahr','Dieses Jahr']];
function akS(){ let S=wzZustand('aktivitaeten'); if(!AK_ZEITRAUM.some(z=>z[0]===S.zeitraum)) S.zeitraum='monat'; return S; }
function akLaden(){
  if(!AK.laeuft) AK.laeuft=(async()=>{ try{ await wzdLaden(); let notar=[],prot=[];
      if(IA_DB_BEREIT){ try{ notar=await iaAlle('notar'); }catch(e){} try{ prot=await iaAlle('protokolle'); }catch(e){} }
      AK.extra={notar,prot}; }catch(e){ AK.extra={notar:[],prot:[]}; } AK.laeuft=null; })();
  return AK.laeuft;
}
/* alle Ereignisse mit Datum: [kategorie, schlüssel, datum, zusatz] */
function akEreignisse(){
  let l=[], ex=AK.extra||{notar:[],prot:[]};
  const neu=(k,s,d,z)=>{ if(wzdDatum(d)) l.push({k,s,d,z:z||''}); };
  wzdListe('vorgaenge').forEach(v=>{
    if(v.typ==='akquise') neu('Akquise','Neue Eigentümer-Kontakte',v.datum,v.quelle); else neu('Vermarktung','Neue Anfragen',v.datum,v.quelle);
    (v.verlauf||[]).forEach(h=>{ let t=String(h.text||'');
      if(t==='Exposé versendet') neu('Vermarktung','Exposés versendet',h.datum);
      if(t==='Status: Auftrag erteilt') neu('Akquise','Aufträge erteilt',h.datum);
      if(t==='Status: Gekauft') neu('Abschluss','Käufe (Anfrage „Gekauft“)',h.datum);
      if(t==='Status: Kein Auftrag'||t==='Status: Abgesagt') neu(v.typ==='akquise'?'Akquise':'Vermarktung',v.typ==='akquise'?'Kontakte ohne Auftrag':'Absagen',h.datum); }); });
  wzdListe('termine').forEach(t=>{ let a=t.art||'Sonstiges';
    neu(a==='Besichtigung'?'Vermarktung':/Akquise|Bewertung/.test(a)?'Akquise':/Notar|Übergabe/.test(a)?'Abschluss':'Beratung',a==='Besichtigung'?'Besichtigungen (Kalender)':a+' (Kalender)',t.datum); });
  wzdListe('bieter').forEach(b=>(b.gebote||[]).forEach(g=>neu('Vermarktung','Gebote',g.datum)));
  wzdObjekte(true).forEach(o=>{ let ev=[]; try{ ev=JSON.parse(o.f.vm_daten||'{}').ev||[]; }catch(e){}
    (Array.isArray(ev)?ev:[]).forEach(e=>{ if(!e) return; if(/Besichtigung/.test(e.art||'')) neu('Vermarktung','Besichtigungen (Vermarktung)',e.d);
      else if(e.art==='Kaufangebot'||e.art==='Reservierung') neu('Vermarktung',e.art==='Kaufangebot'?'Kaufangebote':'Reservierungen',e.d); }); });
  ex.notar.forEach(n=>{ neu('Abschluss','Notartermine',n.termin); });
  ex.prot.forEach(p=>{ neu('Abschluss','Übergaben (Protokoll)',p.datum); });
  wzdListe('abrechnungen').forEach(a=>(a.parteien||[]).forEach(p=>{ neu('Abschluss','Provisionsrechnungen gestellt',p.rechnungDatum); neu('Abschluss','Provision eingegangen',p.bezahltAm); }));   // D45
  wzdListe('unterlagen').forEach(r=>Object.values(r.posten||{}).forEach(s=>{ if(s&&s.stand==='angefordert') neu('Vermarktung','Unterlagen angefordert',s.datum);
    else if(s&&s.stand==='da'&&s.quelle!=='Aufnahmebogen') neu('Vermarktung','Unterlagen eingegangen',s.datum); }));
  (typeof KD_CACHE!=='undefined'?KD_CACHE:[]).forEach(k=>{
    (k.kontakte||[]).forEach(c=>neu('Beratung','Gesprächsnotizen: '+(c.art||'Notiz'),c.datum));
    (k.finanzierungen||[]).forEach(f=>{ if(f.ts) neu('Beratung','Finanzierungsrechnungen',new Date(f.ts).toISOString().slice(0,10)); }); });
  aufLoad().filter(a=>a.erledigt&&a.erledigtAm).forEach(a=>neu('Organisation','Wiedervorlagen erledigt',new Date(a.erledigtAm).toISOString().slice(0,10)));
  return l;
}
function akZaehlen(l,von,bis){ let m={}; l.filter(e=>e.d>=von&&e.d<=bis).forEach(e=>{ let x=m[e.k+'|'+e.s]||(m[e.k+'|'+e.s]={k:e.k,s:e.s,n:0,quellen:{}}); x.n++; if(e.z) x.quellen[e.z]=(x.quellen[e.z]||0)+1; }); return m; }
function akZeichnen(){
  if(!AK.extra){ akLaden().then(()=>{ if(WZ.aktiv==='aktivitaeten') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  let S=akS(), z=ImmoBeratung.zeitraum(S.zeitraum,aufHeute()), l=akEreignisse(), jetzt=akZaehlen(l,z.von,z.bis), vor=akZaehlen(l,z.vorVon,z.vorBis);
  let schl=[...new Set(Object.keys(jetzt).concat(Object.keys(vor)))];
  const sum=(m,k)=>Object.values(m).filter(x=>x.k===k).reduce((a,x)=>a+x.n,0);
  let kats=['Akquise','Vermarktung','Abschluss','Beratung','Organisation'];
  const delta=(a,b)=>{ let d=a-b; return d?'<small class="'+(d>0?'wz-plus':'wz-minus')+'">'+(d>0?'+':'−')+Math.abs(d)+'</small>':'<small>±0</small>'; };
  let anfr=jetzt['Vermarktung|Neue Anfragen'];
  return '<div class="ka-schalter" role="group" aria-label="Zeitraum">'+AK_ZEITRAUM.map(([k,t])=>'<button type="button" class="'+(S.zeitraum===k?'primary':'secondary')+'" aria-pressed="'+(S.zeitraum===k)+'" onclick="akS().zeitraum=\''+k+'\';wzSpeichern();wzZeichnen()">'+t+'</button>').join('')+'</div>'
    +'<p class="hint">'+wzDatum(z.von)+' bis '+wzDatum(z.bis)+' · Vergleich mit '+wzDatum(z.vorVon)+' bis '+wzDatum(z.vorBis)+'</p>'
    +'<div class="wz-kpis grid">'+kats.slice(0,4).map(k=>wzdKpi(k,sum(jetzt,k),'Vorzeitraum '+sum(vor,k))).join('')+'</div>'
    +kats.map(k=>{ let zeilen=schl.filter(s=>s.startsWith(k+'|')).sort((a,b)=>((jetzt[b]||{}).n||0)-((jetzt[a]||{}).n||0)||a.localeCompare(b,'de'));
      return zeilen.length?wzBox(k,'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Aktivität</th><th>Zeitraum</th><th>Vorzeitraum</th></tr></thead><tbody>'
        +zeilen.map(s=>{ let a=(jetzt[s]||{}).n||0, b=(vor[s]||{}).n||0; return '<tr><td>'+sEsc(s.split('|')[1])+'</td><td class="r">'+a+' '+delta(a,b)+'</td><td class="r">'+b+'</td></tr>'; }).join('')+'</tbody></table></div>'):''; }).join('')
    +(anfr&&Object.keys(anfr.quellen).length?wzBox('Anfragen nach Quelle',wzDokTabelle(Object.entries(anfr.quellen).sort((a,b)=>b[1]-a[1]).map(([q,n])=>[sEsc(q),String(n)]),['Quelle','Anfragen'])):'')
    +(!schl.length?wzHinweis('Für diese Zeiträume gibt es noch keine Einträge — Anfragen, Akquise, Termine, Gebote und Gesprächsnotizen erscheinen hier, sobald du sie erfasst.'):'')
    +wzHinweis('Gezählt wird aus Interessenten, Akquise, Kalender, Bieterverfahren, Vermarktung der Bewertungen, Notarauftrag, Übergabeprotokoll, Kundenakte und Wiedervorlagen — ohne Namen.');
}
function akRechnen(){ iconify($('wz_body')); }
function akDokument(){
  let S=akS(), z=ImmoBeratung.zeitraum(S.zeitraum,aufHeute()), l=akEreignisse(), jetzt=akZaehlen(l,z.von,z.bis), vor=akZaehlen(l,z.vorVon,z.vorBis);
  let schl=[...new Set(Object.keys(jetzt).concat(Object.keys(vor)))].sort();
  return {titel:'Aktivitäten '+wzDatum(z.von)+' bis '+wzDatum(z.bis),
    html:'<h1>Aktivitäten</h1><p class="wzd-unter">'+wzDatum(z.von)+' bis '+wzDatum(z.bis)+' · Vorzeitraum '+wzDatum(z.vorVon)+' bis '+wzDatum(z.vorBis)+'</p>'
      +(schl.length?wzDokTabelle(schl.map(s=>[sEsc(s.split('|')[0]),sEsc(s.split('|')[1]),String((jetzt[s]||{}).n||0),String((vor[s]||{}).n||0)]),['Bereich','Aktivität','Zeitraum','Vorzeitraum']):'<p>Keine Einträge.</p>'),
    fuss:'Übersicht ohne personenbezogene Angaben.'};
}
wzRegistrieren({id:'aktivitaeten',titel:'Aktivitäten',sub:'Was ist in Woche, Monat, Quartal passiert — mit Vergleich',icon:'chart',start:()=>({zeitraum:'monat'}),ohneNeu:true,
  zeichnen:akZeichnen,rechnen:akRechnen,dokument:akDokument,schliessen:()=>{ AK.extra=null; }});
