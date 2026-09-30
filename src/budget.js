/* ---------- Budget-Check „Was kann ich mir leisten?“ und Finanzierungsgespräch ------------------------
   Haushaltsrechnung im Finanzierungsrechner. Die Einkommensangaben landen nicht im Projekt (fin_b_* ist von
   collect() ausgenommen) — sie gehören dem Kaufinteressenten, nicht zur Bewertung des Verkäufers. In die
   Kundenakte kommen sie nur über „Beim Kunden ablegen“ oder als Budget im Suchprofil. Die Pauschalen sind
   Einstellungen des Beraters und bleiben auf dem Gerät. Konkrete Raten erscheinen nicht im Exposé: Werbung
   mit Kreditkonditionen verlangt die Pflichtangaben des § 17 PAngV. */
const FIN_PAUSCH_KEY='ia_fin_pauschalen', FIN_PAUSCH_FELDER=['fin_b_pausch_erw','fin_b_pausch_kind','fin_b_wohnen','fin_b_puffer'];
function finPauschLaden(){ try{ let p=JSON.parse(localStorage.getItem(FIN_PAUSCH_KEY)||'{}'); FIN_PAUSCH_FELDER.forEach(f=>{ if(p[f]!=null&&$(f)) $(f).value=p[f]; }); }catch(e){} }
function finPauschSpeichern(){ try{ let p={}; FIN_PAUSCH_FELDER.forEach(f=>{ if($(f)) p[f]=$(f).value; }); localStorage.setItem(FIN_PAUSCH_KEY,JSON.stringify(p)); }catch(e){} }
/* Budget-Felder zurücksetzen, damit keine Einkommensdaten eines Kunden bei der nächsten Rechnung stehen bleiben */
function finBudgetLeeren(){ ['fin_b_netto','fin_b_sonst','fin_b_raten'].forEach(f=>{ if($(f)) $(f).value=''; }); if($('fin_b_erw')) $('fin_b_erw').value='2'; if($('fin_b_kinder')) $('fin_b_kinder').value='0'; finPauschLaden(); finBudget(); }
/* reine Rechnung (im Selbsttest geprüft): tragbare Rate → Darlehen → Kaufpreis nach Nebenkosten */
function finBudget(){
  let el=$('fin_b_ergebnis'); if(!el) return null;
  let netto=num('fin_b_netto'), sonst=num('fin_b_sonst'), erw=Math.max(0,num('fin_b_erw')), kinder=Math.max(0,num('fin_b_kinder'));
  let raten=num('fin_b_raten'), wohnen=num('fin_b_wohnen'), puffer=num('fin_b_puffer'), mod=num('fin_moderni'), kp=num('fin_kaufpreis');
  let B=finBudgetRechnen({netto,sonst,erw,kinder,pErw:num('fin_b_pausch_erw'),pKind:num('fin_b_pausch_kind'),raten,wohnen,puffer,
    zins:num('fin_zins'),tilgung:num('fin_tilgung'),nkPct:num('fin_grest')+num('fin_notar')+num('fin_makler'),ek:num('fin_ek'),mod});
  let {rate,darlehen,maxKp,quote,leben}=B; window._FINB=B;
  if(!(netto>0)){ el.innerHTML='<p class="hint" style="margin:0">Nettoeinkommen eintragen, dann rechnet der Check.</p>'; return B; }
  const z=(a,b,c)=>'<div class="fin-zeile'+(c?' '+c:'')+'"><span>'+a+'</span><b>'+b+'</b></div>';
  el.innerHTML=z('Einnahmen im Monat',eur(netto+sonst))+z('− Lebenshaltung ('+(erw===1?'1 Erwachsener':erw+' Erwachsene')+(kinder?', '+(kinder===1?'1 Kind':kinder+' Kinder'):'')+')',eur(leben))
    +(raten?z('− bestehende Kreditraten',eur(raten)):'')+z('− Neben- und Instandhaltungskosten der Immobilie',eur(wohnen))+z('− Sicherheitspuffer',eur(puffer))
    +z('<b>Tragbare Monatsrate</b>','<b>'+eur(Math.max(0,rate))+'</b>')
    +(rate>0?z('Darlehen bei '+num2(num('fin_zins'))+' % Zins und '+num2(num('fin_tilgung'))+' % Tilgung',eur(darlehen))
      +z('<b>Darstellbarer Kaufpreis</b> <span class="sub">inkl. Eigenkapital, abzüglich Nebenkosten'+(mod?' und Modernisierung':'')+'</span>','<b>'+eur(vpRund(maxKp,1000))+'</b>','fin-budget-top')
      +z('Anteil der Rate an den Einnahmen','<span class="'+(quote>40?'fin-b-warn':'')+'">'+num2(quote)+' %</span>')
      +(kp>0?'<p class="fin-b-vgl '+(kp<=maxKp?'ok':'warn')+'">Der Kaufpreis von '+eur(kp)+(kp<=maxKp?' liegt im Budget.':' liegt rund '+eur(vpRund(kp-maxKp,1000))+' über dem Budget — mehr Eigenkapital, eine niedrigere Anfangstilgung oder ein Förderdarlehen prüfen.')+'</p>':'')
      :'<p class="fin-b-vgl warn">Nach den Ausgaben bleibt keine Rate übrig. Ausgaben und Pauschalen prüfen.</p>')
    +(quote>40?'<p class="hint" style="margin:6px 0 0">Mehr als 40 % der Einnahmen für die Rate sind knapp; Banken prüfen das im Einzelfall.</p>':'');
  return B;
}
function finBudgetUebernehmen(){
  let B=finBudget(); if(!B||!(B.maxKp>0)){ alert('Erst den Budget-Check ausfüllen.'); return; }
  if(!kdVerfuegbar()) return;
  let budget=Math.floor(B.maxKp/5000)*5000;
  kdOeffnen(null,async id=>{ let k=KD_CACHE.find(x=>x.id===id); if(!k) return;
    k.suchprofil=Object.assign({aktiv:true,arten:[],orte:'',finanzierung:'offen',seit:aufHeute()},k.suchprofil||{},{aktiv:true,budget:budget});
    if(await kdSpeichern(k)) alert('Budget '+eur(budget)+' im Suchprofil von '+kdName(k)+' eingetragen.'); });
}
/* Finanzierungsgespräch: Wiedervorlage, Vermerk in der Akte, Kalendereintrag (.ics) */
function finTerminOeffnen(){
  let o=$('fin_termin'); if(!o) return;
  let sel=$('fin_t_kunde'); sel.innerHTML='<option value="">ohne Kundenakte</option>'+KD_CACHE.slice().sort((a,b)=>kdName(a).localeCompare(kdName(b))).map(k=>'<option value="'+k.id+'">'+sEsc(kdName(k))+'</option>').join('');
  if(!$('fin_t_datum').value){ let d=new Date(Date.now()+2*864e5), p=n=>(''+n).padStart(2,'0'); $('fin_t_datum').value=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  o.hidden=false; appScrollIntoView(o,{behavior:'smooth',block:'center'});
}
function finTerminIcs(titel,datum,zeit,dauerMin,text){
  let [h,m]=(zeit||'10:00').split(':').map(Number), d0=datum.replace(/-/g,'');
  let ende=new Date(2000,0,1,h,m+(dauerMin||60)), p=n=>(''+n).padStart(2,'0');
  let esc=s=>(''+s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  let jetzt=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ImmoApp//DE','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+Date.now().toString(36)+'@immoapp','DTSTAMP:'+jetzt,
    'DTSTART:'+d0+'T'+p(h)+p(m)+'00','DTEND:'+d0+'T'+p(ende.getHours())+p(ende.getMinutes())+'00','SUMMARY:'+esc(titel),'DESCRIPTION:'+esc(text||''),'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
async function finTerminAnlegen(){
  let datum=$('fin_t_datum').value, zeit=$('fin_t_zeit').value||'10:00', kid=$('fin_t_kunde').value, notiz=($('fin_t_notiz').value||'').trim();
  if(!datum){ alert('Bitte ein Datum wählen.'); return; }
  let k=kid?KD_CACHE.find(x=>x.id===kid):null, name=k?kdName(k):'Kaufinteressent';
  let titel='Finanzierungsgespräch '+name, objekt=num('fin_kaufpreis')>0?'Kaufpreis '+eur(num('fin_kaufpreis')):'';
  let list=aufLoad(); list.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:titel+' um '+zeit+' Uhr'+(notiz?' — '+notiz:''),frist:datum,objekt:objekt,kundeId:k?k.id:undefined,erledigt:false,angelegt:Date.now()});
  aufStore(list); aufBadge();
  if(k&&IA_DB_BEREIT){ k.kontakte=(k.kontakte||[]).concat([{id:'c'+Date.now().toString(36),ts:Date.now(),datum:aufHeute(),art:'Termin',text:'Finanzierungsgespräch vereinbart für '+new Date(datum+'T00:00:00').toLocaleDateString('de-DE')+', '+zeit+' Uhr'+(objekt?' ('+objekt+')':'')+(notiz?' — '+notiz:'')}]); await kdSpeichern(k); }
  let ics=finTerminIcs(titel,datum,zeit,60,[objekt,notiz].filter(Boolean).join('\n'));
  iaHerunterladen(new Blob([ics],{type:'text/calendar;charset=utf-8'}),'Termin '+name.replace(/[^\wäöüÄÖÜß -]/g,'').trim()+'.ics');
  $('fin_termin').hidden=true; $('fin_t_notiz').value='';
  iaHinweis('Termin angelegt: Wiedervorlage'+(k?', Kundenakte':'')+' und Kalendereintrag'); setTimeout(()=>iaHinweis(''),2800);
}
/* Aus dem Exposé: Finanzierungs-Check mit dem Objektpreis öffnen */
function finAusExpose(){
  let R=window._R||{}, p=num('ex_preis')||num('vp_angebot')||(R.empfehlung>0?vpRund(R.empfehlung,1000):0);
  finOeffnen(); if(p>0){ $('fin_kaufpreis').value=Math.round(p).toLocaleString('de-DE'); finRechnen(); }
  setTimeout(()=>{ let b=$('fin_budget_box'); if(b) appScrollIntoView(b,{behavior:'smooth',block:'start'}); },150);
}

