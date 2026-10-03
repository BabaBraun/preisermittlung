/* ---------- Kachel „Mein Jahr“ (D38) ----------
   Vertriebsübersicht über alle Aufträge mit Vermarktungsstand (Abschnitt „Vermarktung“ der gesicherten Projekte):
   Phase, Provision bei Halbteilung (§ 656c BGB), mit Erfahrungswerten gewichtete Prognose, Ziel, Herkunft der Aufträge.
   Herkunft, Kaufpreis und Abschlussdatum je Auftrag stehen nur hier (S.obj[Projekt-ID]), die Projekte bleiben unverändert. */
var JAHR_LAEDT=false;
const JAHR_HERKUNFT=['','Filiale / Kundenberater','Empfehlung','Bestandskunde','Bewertung / Preiseinschätzung','Online / Portal','Sonstiges'];
function jahrStart(){ return {jahr:String(new Date().getFullYear()),ziel:'',provV:'3,57',provK:'3,57',w:{},obj:{}}; }
function jahrObjekte(S){
  let pj=typeof pjLoad==='function'?pjLoad():[];
  return (typeof vmObjekte==='function'?vmObjekte():[]).map(x=>{
    let key=x.id||'aktuell', o=(S.obj||{})[key]||{}, f=x.f||{}, p=pj.find(y=>y.id===x.id);
    let preis=wzN(f.vm_preis,true)||wzN(f.ex_preis,true)||wzN(f.vp_angebot,true)||(p?wzN(p.empf,true):0);
    let kd=f.ek_kunde_id&&typeof KD_CACHE!=='undefined'?KD_CACHE.find(k=>k.id===f.ek_kunde_id):null;
    return {id:key,name:x.name,status:f.vm_status,preis,kaufpreis:wzN(o.kaufpreis,true),abschluss:o.abschluss||'',herkunft:o.herkunft||'',kunde:kd?kdName(kd):''};
  });
}
/* tatsächlich eingegangene Provision laut Kachel „Provision“ (D47) — Beträge inklusive Umsatzsteuer wie die Prognose */
function jahrEingang(jahr){
  if(typeof paBetrag!=='function'||!wzdBereit()) return null; let s=0;
  wzdListe('abrechnungen').forEach(a=>(a.parteien||[]).forEach(p=>{ if(String(p.bezahltAm||'').slice(0,4)===String(jahr)) s+=wzN(p.bezahltBetrag,true)||paBetrag(a,p).brutto; }));
  return s;
}
function jahrEinstellungen(S){
  let w={}; ImmoBeratung.JAHR_PHASEN.forEach(ph=>{ let v=wzHol(S,'w.'+ph); if(v!=null&&String(v).trim()!=='') w[ph]=wzN(v); });
  return {jahr:wzN(S.jahr)||new Date().getFullYear(),provV:wzN(S.provV),provK:wzN(S.provK),ziel:wzN(S.ziel,true),wahrscheinlichkeit:w};
}
function jahrZeichnen(S){
  let l=jahrObjekte(S).filter(o=>ImmoBeratung.JAHR_PHASEN.includes(o.status));
  let zeilen=l.map((o,i)=>{ let k='obj.'+o.id+'.';
    let sel='<select data-wz="'+k+'herkunft" aria-label="Herkunft '+sEsc(o.name)+'">'+JAHR_HERKUNFT.map(h=>'<option value="'+sEsc(h)+'"'+(h===o.herkunft?' selected':'')+'>'+(h||'– Herkunft')+'</option>').join('')+'</select>';
    let ab=['Verkauft','Notartermin'].includes(o.status)
      ?'<input data-wz="'+k+'kaufpreis" inputmode="decimal" placeholder="Kaufpreis €" aria-label="Kaufpreis '+sEsc(o.name)+'" value="'+sEsc(wzHol(S,k+'kaufpreis')||'')+'">'
        +'<input type="date" data-wz="'+k+'abschluss" aria-label="Notartermin '+sEsc(o.name)+'" value="'+sEsc(wzHol(S,k+'abschluss')||'')+'">':'';
    return '<tr><td><b>'+sEsc(o.name)+'</b>'+(o.kunde?'<small>'+sEsc(o.kunde)+'</small>':'')+'</td><td>'+sEsc(o.status)+'</td><td class="r">'+(o.preis?wzEur(o.preis):'–')+'</td>'
      +'<td>'+sel+'</td><td class="wz-ab">'+ab+'</td><td class="r" id="wz_jahr_prov_'+i+'">–</td><td class="r" id="wz_jahr_gew_'+i+'">–</td></tr>'; }).join('');
  let wFelder=ImmoBeratung.JAHR_PHASEN.map(ph=>wzFeld('w.'+ph,ph,{typ:'prozent',einheit:'%',ph:String(ImmoBeratung.JAHR_WAHRSCHEINLICHKEIT[ph])})).join('');
  return '<div id="wz_jahr_kpis"></div>'
    +wzBox('Aufträge nach Phase','<div id="wz_jahr_phasen"></div>')
    +wzBox('Alle Aufträge',l.length?'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Objekt</th><th>Phase</th><th>Preis</th><th>Herkunft</th><th>Kaufpreis / Notartermin</th><th>Provision</th><th>gewichtet</th></tr></thead><tbody>'+zeilen+'</tbody></table></div>'
      :wzHinweis('Noch kein Auftrag mit Vermarktungsstand. Den Stand setzt du in der Bewertung im Abschnitt „Vermarktung“ und sicherst die Bewertung als Projekt.'))
    +'<div class="wz-grid"><div>'+wzBox('Herkunft der Aufträge','<div id="wz_jahr_herkunft"></div>')+'</div><div>'
    +wzBox('Ziel und Annahmen','<div class="grid">'+wzFeld('jahr','Jahr',{typ:'zahl'})+wzFeld('ziel','Ziel Provision',{typ:'betrag',einheit:'€'})
      +wzFeld('provV','Provision Verkäufer',{typ:'prozent',einheit:'% inkl. USt'})+wzFeld('provK','Provision Käufer',{typ:'prozent',einheit:'% inkl. USt'})+'</div>'
      +wzHinweis('Halbteilung: Beim Verkauf von Wohnungen und Einfamilienhäusern an Verbraucher zahlen Käufer und Verkäufer gleich viel (§ 656c BGB).')
      +'<h3 class="sep">Abschlusswahrscheinlichkeit je Phase</h3>'+wzHinweis('Eigene Erfahrungswerte; leer = Vorgabe.')+'<div class="grid">'+wFelder+'</div>')+'</div></div>';
}
function jahrRechnen(S){
  let E=jahrEinstellungen(S), l=jahrObjekte(S), r=ImmoBeratung.pipeline(l,E);
  let offen=r.zeilen.filter(z=>z.status!=='Verkauft').length, q=r.zielQuote;
  wzH('wz_jahr_kpis','<div class="kpis wz-kpis"><div class="kpi"><span>Provision '+r.jahr+' realisiert</span><b>'+wzEur(r.realisiert)+'</b></div>'
    +'<div class="kpi"><span>Prognose (gewichtet)</span><b>'+wzEur(r.prognose)+'</b></div>'
    +'<div class="kpi"><span>Ziel</span><b>'+(r.ziel?wzEur(r.ziel):'–')+'</b>'+(q!=null?'<div class="wz-balken" role="img" aria-label="Zielerreichung '+wzZ(q,0)+' %"><i style="width:'+Math.min(100,q)+'%"></i></div><small>'+wzZ(q,0)+' % erreicht (Prognose)</small>':'')+'</div>'
    +'<div class="kpi"><span>Offene Aufträge</span><b>'+offen+'</b></div>'
    +(jahrEingang(r.jahr)!=null?'<div class="kpi"><span>Eingegangen '+r.jahr+'</span><b>'+wzEur(jahrEingang(r.jahr))+'</b><small>laut Kachel „Provision“</small></div>':'')+'</div>');
  if(!wzdBereit()&&!JAHR_LAEDT){ JAHR_LAEDT=true; wzdLaden().then(()=>{ JAHR_LAEDT=false; if(WZ.aktiv==='jahr') wzRechnen(); }); }
  wzH('wz_jahr_phasen','<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Phase</th><th>Anzahl</th><th>Volumen</th><th>Provision</th><th>gewichtet</th></tr></thead><tbody>'
    +r.phasen.map(p=>'<tr><td>'+sEsc(p.phase)+(p.phase==='Verkauft'?' ('+r.jahr+')':'')+'</td><td class="r">'+p.anzahl+'</td><td class="r">'+wzEur(p.volumen)+'</td><td class="r">'+wzEur(p.provision)+'</td><td class="r">'+wzEur(p.gewichtet)+'</td></tr>').join('')
    +'</tbody></table></div>');
  r.zeilen.forEach((z,i)=>{ wzT('wz_jahr_prov_'+i,wzEur(z.provision)); wzT('wz_jahr_gew_'+i,z.status==='Verkauft'&&!z.verkauftImJahr?'anderes Jahr':wzEur(z.gewichtet)); });
  let h=Object.entries(r.herkunft).sort((a,b)=>b[1].provision-a[1].provision);
  wzH('wz_jahr_herkunft',h.length?'<div class="wz-tabwrap"><table class="nhk wz-tab"><thead><tr><th>Herkunft</th><th>Aufträge</th><th>Provision</th></tr></thead><tbody>'
    +h.map(([k,v])=>'<tr><td>'+sEsc(k)+'</td><td class="r">'+v.anzahl+'</td><td class="r">'+wzEur(v.provision)+'</td></tr>').join('')+'</tbody></table></div>':wzHinweis('Noch keine Aufträge.'));
}
function jahrDokument(S){
  let E=jahrEinstellungen(S), r=ImmoBeratung.pipeline(jahrObjekte(S),E);
  return {titel:'Mein Jahr '+r.jahr,
    html:'<h1>Mein Jahr '+r.jahr+'</h1><p class="wzd-unter">Aufträge, Provision und Herkunft — Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle([['Provision realisiert',wzEur(r.realisiert)],['Prognose (gewichtet)',wzEur(r.prognose)],r.ziel?['Ziel',wzEur(r.ziel)+' ('+wzZ(r.zielQuote,0)+' % nach Prognose)']:null])
      +'<h2>Aufträge nach Phase</h2>'+wzDokTabelle(r.phasen.map(p=>[sEsc(p.phase),String(p.anzahl),wzEur(p.volumen),wzEur(p.provision),wzEur(p.gewichtet)]),['Phase','Anzahl','Volumen','Provision','gewichtet'])
      +'<h2>Aufträge</h2>'+wzDokTabelle(r.zeilen.map(z=>[sEsc(z.name),sEsc(z.status),z.preis?wzEur(z.preis):'–',sEsc(z.herkunft||'–'),wzEur(z.provision)]),['Objekt','Phase','Preis','Herkunft','Provision'])
      +'<h2>Herkunft der Aufträge</h2>'+wzDokTabelle(Object.entries(r.herkunft).map(([k,v])=>[sEsc(k),String(v.anzahl),wzEur(v.provision)]),['Herkunft','Aufträge','Provision'])
      +'<p class="wzd-klein">Provision je Seite: Verkäufer '+wzP(E.provV,2)+', Käufer '+wzP(E.provK,2)+'; gewichtet mit der Abschlusswahrscheinlichkeit je Phase.</p>',
    fuss:'Interne Übersicht.'};
}
wzRegistrieren({id:'jahr',titel:'Mein Jahr',sub:'Aufträge · Provision · Ziel · Herkunft',icon:'target',start:jahrStart,ohneNeu:true,zeichnen:jahrZeichnen,rechnen:jahrRechnen,dokument:jahrDokument});
