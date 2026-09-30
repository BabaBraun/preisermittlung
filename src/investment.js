/* ---------- Investitionsrechnung für Kapitalanleger (⑨b) -----------------------------------------------
   Cashflow über die Haltedauer: Miete und Bewirtschaftungskosten mit eigener Steigerung, Annuitätendarlehen
   (monatlich wie im Finanzierungsrechner), AfA nach § 7 Abs. 4 EStG, Steuer mit dem persönlichen
   Grenzsteuersatz (Verluste mindern andere Einkünfte), Verkauf am Ende mit Verkaufskosten und — innerhalb der
   Zehnjahresfrist des § 23 EStG — Steuer auf den Veräußerungsgewinn. Ergebnis: Eigenkapitalrendite als
   interner Zinsfuß vor und nach Steuern, Gesamtkapitalrendite ohne Kredit (zeigt den Hebel), Kapitaldienst-
   deckung. Modellrechnung, keine Steuerberatung; fließt nicht in die Preisempfehlung ein. */
/* reine Rechnung (im Selbsttest geprüft) */
function ivEingaben(){
  let R=window._R||{}, kp=R.reKP||0, bj=num('ek_baujahr');
  let ekVor=Math.round(((R.reNK||0)+(R.reSan||0)+0.2*kp)/1000)*1000;
  /* Aufteilung wie die Arbeitshilfe des BMF: Verhältnis Bodenwert zu Sachwert (Boden + Gebäude) */
  let basis=R.substanz>0?R.substanz:R.empfehlung, bodenAnteil=basis>0&&R.bodenwert>0?Math.min(0.9,Math.max(0.05,R.bodenwert/basis)):0.2;
  const leer=id=>!($(id)&&$(id).value.trim());
  let vor={ek:ekVor,geb:(1-bodenAnteil)*100,afa:ivAfaSatz(bj)};
  return {vor,p:{kp,nk:R.reNK||0,san:R.reSan||0,roh:R.roh||0,kosten:(R.roh||0)-(R.reRein||0),
    ek:leer('iv_ek')?vor.ek:num('iv_ek'),zins:num('iv_zins'),tilg:num('iv_tilgung'),jahre:num('iv_jahre')||10,
    mietPa:num('iv_miete_pa'),kostenPa:num('iv_kosten_pa'),wertPa:num('iv_wert_pa'),verkaufPct:num('iv_verkauf'),
    gebAnteil:(leer('iv_geb')?vor.geb:num('iv_geb'))/100,afa:leer('iv_afa')?vor.afa:num('iv_afa'),steuer:num('iv_steuer')}};
}
const ivPct=v=>v==null||!isFinite(v)?'–':num2(v*100)+' %';
function ivRechnen(){
  let el=$('iv_ergebnis'); if(!el) return null;
  if(!$('iv_aktiv').checked){ window._IV=null; return null; }
  let {vor,p}=ivEingaben();
  $('iv_ek').placeholder=Math.round(vor.ek).toLocaleString('de-DE');
  $('iv_geb').placeholder=num2(vor.geb);
  $('iv_afa').placeholder=num2(vor.afa);
  if(!(p.kp>0)||!(p.roh>0)){ window._IV=null; el.innerHTML='<div class="flag">Für die Investitionsrechnung braucht es einen Kaufpreis und Mieterträge (① bzw. Mietrolle).</div>'; $('iv_tab').innerHTML=''; return null; }
  let M=ivModell(p); M.p=p; window._IV=M;
  const kpi=(k,v,s,c)=>'<div class="iv-kpi'+(c?' '+c:'')+'"><span>'+k+'</span><b>'+v+'</b>'+(s?'<small>'+s+'</small>':'')+'</div>';
  el.innerHTML='<div class="iv-kpis">'
    +kpi('Eigenkapitalrendite nach Steuern',ivPct(M.irrNach),'interner Zinsfuß über '+M.n+' Jahre','haupt')
    +kpi('vor Steuern',ivPct(M.irrVor),'')
    +kpi('Gesamtkapitalrendite',ivPct(M.irrGesamt),'ohne Kredit, vor Steuern')
    +kpi('Cashflow im 1. Jahr',eur(M.jahre[0].cfNach/12)+' / Monat','nach Steuern · vor Steuern '+eur(M.jahre[0].cfVor/12),M.jahre[0].cfNach<0?'warn':'')
    +kpi('Kapitaldienstdeckung',M.dscr!=null?num2(M.dscr)+'-fach':'–','Reinertrag ÷ Zins und Tilgung',M.dscr!=null&&M.dscr<1.2?'warn':'')
    +kpi('Vermögenszuwachs',eur(M.zuwachs),'nach '+M.n+' Jahren, nach Steuern')+'</div>'
    +'<div class="fin-zeile"><span>Eigenkapital</span><b>'+eur(M.ek)+'</b></div>'
    +'<div class="fin-zeile"><span>Darlehen <span class="sub">'+num2(p.zins)+' % Zins, '+num2(p.tilg)+' % Tilgung, Rate '+eur(M.rate)+' / Monat</span></span><b>'+eur(M.D0)+'</b></div>'
    +'<div class="fin-zeile"><span>AfA <span class="sub">'+num2(p.afa)+' % aus '+eur(M.afaBasis)+' (Gebäudeanteil '+num2(p.gebAnteil*100)+' %'+(p.san?' + Sanierung':'')+')</span></span><b>'+eur(M.afaJahr)+' / Jahr</b></div>'
    +'<div class="fin-zeile"><span>Verkauf nach '+M.n+' Jahren <span class="sub">Wert '+eur(M.V)+' − Verkaufskosten '+eur(M.vk)+' − Restschuld '+eur(M.restN)+(M.frei?' · steuerfrei nach § 23 EStG':' − Steuer auf den Gewinn '+eur(M.steuerVerk))+'</span></span><b>'+eur(M.erloes)+'</b></div>'
    +'<p class="iv-text">'+sEsc(ivText(M))+'</p>';
  let kopf=['Jahr','Miete','Bewirt­schaftung','Zinsen','Tilgung','Cashflow vor Steuern','AfA','Steuer','Cashflow nach Steuern','Restschuld','Wert'], b=v=>eur(v).replace(' €','');
  $('iv_tab').innerHTML='<thead><tr>'+kopf.map(k=>'<th>'+k+'</th>').join('')+'</tr></thead><tbody>'
    +M.jahre.map(j=>'<tr><td>'+j.t+'</td>'+[j.miete,-j.kosten,-j.zins,-j.tilgung].map(v=>'<td class="r">'+b(v)+'</td>').join('')
      +'<td class="r strong'+(j.cfVor<0?' neg':'')+'">'+b(j.cfVor)+'</td><td class="r">'+b(j.afa)+'</td><td class="r">'+b(-j.steuer)+'</td>'
      +'<td class="r strong'+(j.cfNach<0?' neg':'')+'">'+b(j.cfNach)+'</td><td class="r">'+b(j.rest)+'</td><td class="r">'+b(j.wert)+'</td></tr>').join('')+'</tbody>'
    +'<caption>Jahresübersicht in €. Steuer negativ = Zahlung, positiv = Erstattung.</caption>';
  return M;
}
function ivText(M){
  let p=M.p, t=[];
  if(M.irrGesamt!=null&&M.irrNach!=null){
    let g=M.irrGesamt*100;
    t.push('Ohne Kredit brächte das Objekt '+num2(g)+' % im Jahr. Der Kredit kostet '+num2(p.zins)+' %. '
      +(g>p.zins?'Weil das Objekt mehr abwirft als der Kredit kostet, hebt die Finanzierung die Eigenkapitalrendite (positiver Hebel).'
        :'Weil der Kredit mehr kostet als das Objekt abwirft, drückt die Finanzierung die Eigenkapitalrendite (negativer Hebel) — mehr Eigenkapital oder ein niedrigerer Preis verbessern das Ergebnis.'));
  } else if(!(M.ek>0)) t.push('Ohne Eigenkapital lässt sich keine Eigenkapitalrendite angeben.');
  if(M.jahre[0].cfNach<0) t.push('Der laufende Cashflow ist anfangs negativ'+(M.plusAb?' und wird ab Jahr '+M.plusAb+' positiv':' und bleibt es über die Haltedauer')+' — der Anleger muss monatlich zuschießen.');
  if(M.dscr!=null&&M.dscr<1.2) t.push('Die Kapitaldienstdeckung liegt unter 1,2; Banken verlangen für Anlageobjekte meist mehr.');
  if(!M.frei) t.push('Verkauf innerhalb von zehn Jahren: Der Gewinn ist nach § 23 EStG zu versteuern.');
  return t.join(' ');
}
function ivBericht(esc){
  let M=window._IV; if(!M||!$('iv_aktiv').checked) return '';
  let p=M.p, L=(a,b)=>'<tr><td>'+a+'</td><td>'+b+'</td></tr>';
  return '<h2>Investitionsrechnung über '+M.n+' Jahre</h2><table>'
    +L('Investition (Kaufpreis, Nebenkosten'+(p.san?', Sanierung':'')+')',eur(M.ak))+L('Eigenkapital',eur(M.ek))
    +L('Darlehen ('+num2(p.zins)+' % Zins, '+num2(p.tilg)+' % Tilgung)',eur(M.D0))
    +L('Annahmen','Miete +'+num2(p.mietPa)+' % p. a., Kosten +'+num2(p.kostenPa)+' % p. a., Wert +'+num2(p.wertPa)+' % p. a., Grenzsteuersatz '+num2(p.steuer)+' %')
    +L('AfA',eur(M.afaJahr)+' im Jahr ('+num2(p.afa)+' % aus '+eur(M.afaBasis)+')')
    +L('Cashflow im 1. Jahr (vor / nach Steuern)',eur(M.jahre[0].cfVor)+' / '+eur(M.jahre[0].cfNach))
    +L('Kapitaldienstdeckung im 1. Jahr',M.dscr!=null?num2(M.dscr)+'-fach':'–')
    +L('Verkaufserlös nach '+M.n+' Jahren (nach Kosten, Restschuld'+(M.frei?'':', Steuer')+')',eur(M.erloes))
    +L('Gesamtkapitalrendite (ohne Kredit, vor Steuern)',ivPct(M.irrGesamt))
    +L('Eigenkapitalrendite vor Steuern',ivPct(M.irrVor))
    +'<tr class="total"><td>Eigenkapitalrendite nach Steuern</td><td>'+ivPct(M.irrNach)+'</td></tr></table>'
    +'<table class="iv-tab"><tr>'+['Jahr','Miete','Bewirtsch.','Zinsen','Tilgung','CF vor St.','AfA','Steuer','CF nach St.','Restschuld'].map(k=>'<td><b>'+k+'</b></td>').join('')+'</tr>'
    +M.jahre.map(j=>'<tr><td>'+j.t+'</td>'+[j.miete,-j.kosten,-j.zins,-j.tilgung,j.cfVor,j.afa,-j.steuer,j.cfNach,j.rest].map(v=>'<td>'+eur(v).replace(' €','')+'</td>').join('')+'</tr>').join('')+'</table>'
    +'<div class="beschr">'+esc(ivText(M))+' Beträge in €; Steuer negativ = Zahlung, positiv = Erstattung. Modellrechnung auf Grundlage der getroffenen Annahmen; sie ersetzt keine Steuerberatung. '
    +'Bewirtschaftungskosten wie im Ertragsansatz (einschließlich Mietausfallwagnis); Verluste mindern andere Einkünfte.</div>';
}
/* eigenes Dokument für den Anleger */
function ivDokument(teilen){
  compute(); let M=window._IV;
  if(!M){ alert($('iv_aktiv').checked?'Für die Investitionsrechnung fehlen Kaufpreis oder Mieterträge.':'Bitte zuerst „Cashflow über die Haltedauer rechnen“ einschalten.'); return; }
  let K=exKontakt(), esc=sEsc, titel=exV('ex_titel')||exTitelVorschlag(), r=$('report');
  r.className='expose invest'; r.dataset.pdfname='Investitionsrechnung '+(exV('ek_anschrift')||titel).replace(/[^\wäöüÄÖÜß -]/g,'').trim()+' '+aufHeute();
  let R=window._R||{};
  r.innerHTML='<div class="ex-leiste no-print"><button class="primary" onclick="document.body.classList.remove(\'report-mode\')">← zurück</button><button onclick="window.print()">Drucken</button>'
    +'<button onclick="downloadPDF()">PDF herunterladen</button><button onclick="pdfTeilen()">Teilen</button></div>'
    +(K.firma?'<div class="ex-kopf">'+esc(K.firma)+'</div>':'')
    +'<h1>Investitionsrechnung</h1><p class="ex-sub">'+esc(exV('ek_anschrift')||titel)+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
    +'<div class="ex-fakten">'+[['Kaufpreis',eur(M.p.kp)],['Jahresnettokaltmiete',eur(M.p.roh)],['Kaufpreisfaktor',R.reFaktor?num2(R.reFaktor)+'-fach':'–'],
      ['Bruttomietrendite',R.reBrutto?num2(R.reBrutto)+' %':'–'],['Eigenkapitalrendite nach Steuern',ivPct(M.irrNach)],['Haltedauer',M.n+' Jahre']]
      .map(f=>'<div class="ex-fakt"><span>'+f[0]+'</span><b>'+esc(''+f[1])+'</b></div>').join('')+'</div>'
    +ivBericht(esc).replace(/^<h2>[^<]*<\/h2>/,'<h2>Ergebnis</h2>')
    +((K.name||K.tel||K.mail)?'<h2>Ihr Ansprechpartner</h2><div class="ex-kontakt"><div><b>'+esc(K.name||'')+'</b>'+(K.funktion?'<div>'+esc(K.funktion)+'</div>':'')+(K.tel?'<div>Telefon '+esc(K.tel)+'</div>':'')+(K.mail?'<div>'+esc(K.mail)+'</div>':'')+'</div></div>':'')
    +'<p class="ex-hinweis">Unverbindliche Modellrechnung. Mieten, Kosten, Zinsen und Wertentwicklung sind Annahmen; tatsächliche Ergebnisse können abweichen. '
    +'Keine Steuer- oder Rechtsberatung — steuerliche Fragen bitte mit dem Steuerberater klären. Darlehenskonditionen sind beispielhaft und kein Angebot.</p>';
  document.body.classList.add('report-mode'); window.scrollTo(0,0);
  if(teilen) pdfTeilen();
}

const N_WK=14;
const WK_VORLAGE=[['Überalterung der Decken',0],['Unzureichender Brand-/Schallschutz',0],['Feuchtigkeitsschäden',0],
  ['Veraltete Heizungsanlage',0],['Undichte / veraltete Fenster',0],['Denkmalbedingte Mehraufwendungen',0]];
function buildWK(){
  let tb=$('wk_tbl').querySelector('tbody'); tb.innerHTML='';
  for(let i=0;i<N_WK;i++){
    tb.insertAdjacentHTML('beforeend',
      `<tr id="wk_row${i}"><td><input id="wk_bez${i}" type="text" placeholder="z.B. Sanierungsstau Dach" style="text-align:left"></td>
       <td><input id="wk_val${i}" type="text" value="0"></td></tr>`);
  }
}
function renderWKRows(){
  let vis=Math.max(3,Math.min(N_WK,parseInt(num('wk_visible'))||3));
  for(let i=0;i<N_WK;i++){
    let r=$('wk_row'+i); if(!r)continue;
    let hasVal=(($('wk_bez'+i).value||'').trim()!=='')||num('wk_val'+i)!==0;
    r.style.display=(i<vis||hasVal)?'':'none';
  }
}
function addWKRow(){
  let vis=Math.max(3,Math.min(N_WK,parseInt(num('wk_visible'))||3));
  $('wk_visible').value=Math.min(vis+1,N_WK); renderWKRows();
}
function wkVorlage(){
  WK_VORLAGE.forEach((v,i)=>{if(i<N_WK && !($('wk_bez'+i).value||'').trim()) $('wk_bez'+i).value=v[0];});
  $('wk_visible').value=Math.max(WK_VORLAGE.length,parseInt(num('wk_visible'))||3);
  renderWKRows();compute();
}
function wkLines(){let o=[];for(let i=0;i<N_WK;i++){let v=num('wk_val'+i);let b=($('wk_bez'+i).value||'').trim();if(v!==0)o.push([b||'Wertkorrektur',v]);}return o;}
