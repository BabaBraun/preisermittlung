/* ---------- Gemischte Nutzung: Wohnen und Gewerbe in einem Gebäude (D66) -----------------------------------------
   Abschnitt „Gemischte Nutzung“ (nur Haus, Schalter mx_aktiv; die Objektart „Wohn- und Geschäftshaus“ schaltet ihn ein).
   - Nutzungsanteile aus Wohn- und Gewerbe-/Nutzfläche und aus den Mieten; die Einordnung nach § 249 BewG (Grundsteuer) steht
     nur zur Orientierung da.
   - Marktübliche Miete (§ 31 Abs. 2 ImmoWertV): €/m² × Fläche × 12, auf Knopfdruck in die Allgemeinen Angaben — wichtig, wenn
     der Eigentümer selbst oder seine Firma im Haus ist.
   - Normalherstellungskosten (Anlage 4 ImmoWertV, NHK 2010): Typ 5.1 „Wohnhäuser mit Mischnutzung“ (Wohnfläche ca. 75 %),
     Typ 5.2 „Banken und Geschäftshäuser mit Wohnungen“ (Wohnfläche ca. 20–25 %) oder Gebäudemix nach den Anteilen — Fußnote 9:
     „Bei deutlich abweichenden Nutzungsanteilen ist eine Ermittlung durch Gebäudemix sinnvoll.“ Der Abschnitt schreibt die
     Kostenkennwerte (Stufe 1–5) nach 2.3 und die Gesamtnutzungsdauer nach 2.2, wie ein Wechsel des Gebäudetyps; die Gewichtung
     bleibt. Vorschlag (eigene Schwelle, rund ±10 Prozentpunkte um die Anteile der
     Fußnoten): Wohnanteil ab 65 % Typ 5.1, 15 bis 30 % Typ 5.2, sonst Gebäudemix. „Gebäudetyp aus ①“
     lässt 2.2 und 2.3 unberührt.
   - Bewirtschaftungskosten getrennt nach Anlage 3 ImmoWertV und Liegenschaftszins anteilig rechnet der Kern (js/kern.js). */
const MX_TYP51='Wohn-/Geschäftshaus (Mischnutzung)', MX_TYP52='Geschäftshaus mit Wohnungen';
const MX_TYP_W='Mehrfamilienhaus · bis 6 WE', MX_TYP_G='Geschäftshaus ohne Wohnungen';
function mxH(id,h){ let e=$(id); if(e) e.innerHTML=h; }
function mxAn(){ return !!($('mx_aktiv')&&$('mx_aktiv').checked)&&modus()==='haus'; }
function mxProz(x,st){ return (x*100).toLocaleString('de-DE',{maximumFractionDigits:st==null?1:st})+' %'; }
/* Wohnanteil für den Gebäudemix: eigene Angabe, sonst aus Wohn- und Nutzfläche (null = unbekannt) */
function mxAnteilW(){
  let a=num('mx_anteil_w'); if(a>0&&a<=100) return a/100;
  let w=num('ek_wohnflaeche'), g=num('ek_nutzflaeche'); return w+g>0?w/(w+g):null;
}
function mxNhkModus(a){
  let m=exV('mx_nhk')||'vorschlag'; if(m!=='vorschlag') return m;
  if(a==null) return '51';
  return a>=0.65?'51':(a>=0.15&&a<=0.3)?'52':'mix';
}
/* Kostenkennwerte (Stufe 1–5) und Gesamtnutzungsdauer nach dem gewählten Ansatz; null bei „Gebäudetyp aus ①“ */
function mxNhk(){
  let a=mxAnteilW(), m=mxNhkModus(a);
  if(m==='typ') return null;
  if(m==='51'||m==='52'){ let t=TYPES[m==='51'?MX_TYP51:MX_TYP52]; return {modus:m,a,basis:t.nhk.slice(),gnd:t.gnd}; }
  let tw=TYPES[exV('mx_typ_w')]||TYPES[MX_TYP_W], tg=TYPES[exV('mx_typ_g')]||TYPES[MX_TYP_G], x=a==null?0.5:a;
  return {modus:'mix',a:x,basis:tw.nhk.map((v,i)=>Math.round(x*v+(1-x)*tg.nhk[i])),gnd:Math.round(x*tw.gnd+(1-x)*tg.gnd),
    tw:exV('mx_typ_w')||MX_TYP_W,tg:exV('mx_typ_g')||MX_TYP_G};
}
/* in 2.2/2.3 übernehmen; true, wenn sich etwas geändert hat */
function mxNhkAnwenden(){
  if(!mxAn()) return false;
  let r=mxNhk(); if(!r) return false;
  let b=r.basis.join(', '), g=String(r.gnd), neu=false;
  if($('nhkhg_base')&&$('nhkhg_base').value!==b){ $('nhkhg_base').value=b; neu=true; }
  if($('nhkhg_gnd')&&$('nhkhg_gnd').value!==g){ $('nhkhg_gnd').value=g; neu=true; }
  return neu;
}
/* Einordnung wie im Grundsteuerrecht (§ 249 BewG) — nach Wohn- und Nutzfläche, nur zur Orientierung */
function mxBewG(flW,flG,we){
  let s=flW+flG; if(!(s>0)) return '';
  let w=flW/s, b=flG/s;
  if(we>=1&&we<=2&&b<0.5) return (we===1?'Einfamilienhaus':'Zweifamilienhaus')+', wenn die Mitbenutzung ('+mxProz(b,0)+') die Eigenart nicht wesentlich beeinträchtigt (§ 249 Abs. '+(we===1?2:3)+' BewG), sonst gemischt genutzt';
  if(w>0.8) return 'Mietwohngrundstück (mehr als 80 % Wohnen, § 249 Abs. 4 BewG)';
  if(b>0.8) return 'Geschäftsgrundstück (mehr als 80 % betrieblich, § 249 Abs. 7 BewG)';
  return 'gemischt genutztes Grundstück (§ 249 Abs. 8 BewG)';
}
function mxMieteJahr(){ return {w:num('mx_miete_w_m2')*num('ek_wohnflaeche')*12, g:num('mx_miete_g_m2')*num('ek_nutzflaeche')*12}; }
function mxMieteUebernehmen(){
  let m=mxMieteJahr();
  if(!(m.w>0)&&!(m.g>0)){ alert('Erst die Marktmiete je m² eintragen und unter „Allgemeine Angaben“ die Wohn- und die Gewerbe-/Nutzfläche.'); return; }
  if(m.w>0) $('ek_miete_wohnen').value=String(Math.round(m.w));
  if(m.g>0) $('ek_miete_gewerbe').value=String(Math.round(m.g));
  compute(); autosave();
}
function mxTypenFuellen(){
  [['mx_typ_w',MX_TYP_W],['mx_typ_g',MX_TYP_G]].forEach(([id,std])=>{ let s=$(id); if(!s||s.options.length) return; typOptionen(s,std); });
}
mxTypenFuellen();

/* Anzeige nach jeder Rechnung (src/valuation.js). Ausgaben heißen mxo_…, nicht o_…: die festgehaltenen Referenzfälle
   (tests/e2e/charakterisierung.spec.mjs) lesen alle o_-Ausgaben und sollen sich durch den neuen Abschnitt nicht ändern. */
/* Sichtbar nur beim Wohn- und Geschäftshaus oder sobald der Abschnitt in dieser Bewertung einmal eingeschaltet war (verstecktes
   Feld mx_sichtbar, gespeichert mit der Bewertung) — Ausschalten lässt ihn stehen, damit man ihn wieder einschalten kann. Bei den
   übrigen Häusern bleibt die gewohnte Gliederung (Nummern der Abschnitte) unverändert. */
function mxSichtbar(){
  if(mxAn()&&$('mx_sichtbar')&&$('mx_sichtbar').value!=='1') $('mx_sichtbar').value='1';
  return modus()==='haus'&&(mxAn()||exV('mx_sichtbar')==='1');
}
function mxAnzeige(R,D){
  let box=$('mx_body'), sec=$('s-misch'); if(!box||!sec) return;
  let sicht=mxSichtbar();
  if(sec.hidden===sicht){ sec.hidden=!sicht; try{ buildNav(); }catch(e){} try{ if(typeof appNummerieren==='function') appNummerieren(); }catch(e){} }
  let an=mxAn(); box.style.opacity=an?1:.4;
  if(an&&mxNhkAnwenden()){ setTimeout(compute,0); }   // Flächen oder Gebäudetyp geändert: Kostenkennwerte nachziehen und neu rechnen
  let M=D.misch, flW=num('ek_wohnflaeche'), flG=num('ek_nutzflaeche'), z=[];
  const zeile=(l,v)=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>';
  z.push(zeile('Wohnfläche / Gewerbe- und Nutzfläche',num2(flW)+' m² / '+num2(flG)+' m²'+(flW+flG>0?' · Wohnen '+mxProz(flW/(flW+flG)):'')));
  if(M){ z.push(zeile('Rohertrag Wohnen (mit Stellplätzen) / Gewerbe',eur(M.rohW)+' / '+eur(M.rohG)+' · Gewerbe '+mxProz(M.anteilG)
      +(M.anteilQuelle==='flaeche'?' (nach Fläche, keine Mieten)':M.anteilQuelle==='keine'?' (keine Angaben)':''))); }
  let bewg=mxBewG(flW,flG,num('ek_anz_we')); if(bewg) z.push(zeile('Einordnung wie im Bewertungsgesetz',bewg));
  mxH('mxo_anteile','<table class="mx-tab">'+z.join('')+'</table>');
  let m=mxMieteJahr();
  setT('mxo_miete',(m.w>0||m.g>0)?'Wohnen '+eur(m.w)+' · Gewerbe '+eur(m.g):'–');
  // Normalherstellungskosten
  let r=mxNhk(), a=mxAnteilW(), modus=mxNhkModus(a);
  $('mx_mix_felder').style.display=modus==='mix'?'':'none';
  setT('mxo_nhk',!r?'Kostenkennwerte und Gesamtnutzungsdauer aus dem Gebäudetyp in ① (2.2 und 2.3 unverändert).'
    :(r.modus==='mix'?'Gebäudemix: '+mxProz(r.a,0)+' wie „'+r.tw+'“, '+mxProz(1-r.a,0)+' wie „'+r.tg+'“'
      :(r.modus==='51'?'Typ 5.1 Wohnhaus mit Mischnutzung':'Typ 5.2 Geschäftshaus mit Wohnungen'))
     +' → Kostenkennwerte Stufe 1–5: '+r.basis.map(x=>x.toLocaleString('de-DE')).join(' / ')+' €/m² BGF, Gesamtnutzungsdauer '+r.gnd+' Jahre (in 2.2 und 2.3 übernommen)'
     +(exV('mx_nhk')==='vorschlag'||!exV('mx_nhk')?' — Vorschlag aus dem Wohnanteil '+(a==null?'(unbekannt)':mxProz(a,0)):'')+'.');
  // Bewirtschaftungskosten
  let q=D.bwQuelle, t='';
  if(q&&q.art==='misch'){
    const sum=o=>o.verw+o.inst+o.mausf;
    t='<table class="mx-tab mx-zahlen"><tr><td></td><td><b>Wohnen</b></td><td><b>Gewerbe</b></td></tr>'
      +'<tr><td>Verwaltung</td><td>'+eur(q.wohnen.verw)+'</td><td>'+eur(q.gewerbe.verw)+'</td></tr>'
      +'<tr><td>Instandhaltung</td><td>'+eur(q.wohnen.inst)+'</td><td>'+eur(q.gewerbe.inst)+'</td></tr>'
      +'<tr><td>Mietausfallwagnis</td><td>'+eur(q.wohnen.mausf)+'</td><td>'+eur(q.gewerbe.mausf)+'</td></tr>'
      +'<tr class="total"><td>Summe</td><td>'+eur(sum(q.wohnen))+'</td><td>'+eur(sum(q.gewerbe))+'</td></tr></table>'
      +'<p class="feld-info">Zusammen '+eur(R.bewirt)+(q.nuk?' (mit '+eur(q.nuk)+' nicht umlagefähigen Betriebskosten)':'')+(R.roh>0?' = '+mxProz(R.bewirt/R.roh)+' des Rohertrags':'')+'.</p>';
  } else if(an) t='<p class="feld-info">Ausgeschaltet — es gelten die Bewirtschaftungskosten aus ⑥.</p>';
  mxH('mxo_bwk',t);
  // Liegenschaftszins
  let anteilig=exV('mx_lz_modus')==='anteilig';
  $('mx_lz_felder').style.display=anteilig?'':'none';
  setT('mxo_lz',num2(R.effLZ)+' %'+(R.lzMisch!=null?' (anteilig '+num2(R.lzMisch)+' %'+(num('er_zins_adj')?' ± Zu-/Abschlag aus ⑥':'')+')':anteilig?' (Basiszins aus ⑥ — Zinssätze für Wohnen und Gewerbe fehlen)':' (Basiszins aus ⑥)'));
}

/* Bericht: eigener Abschnitt vor dem Ertragswert */
function mxBericht(R,D,esc){
  if(!R.mxAktiv||!D||!D.misch) return '';
  let M=D.misch, r=mxNhk(), q=D.bwQuelle, L=(l,v)=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>';
  let bewg=mxBewG(M.flW,M.flG,num('ek_anz_we')), m=[];
  if($('mx_eigen_w')&&$('mx_eigen_w').checked) m.push('Der Wohnteil wird vom Eigentümer selbst genutzt.');
  if($('mx_eigen_g')&&$('mx_eigen_g').checked) m.push('Der Gewerbeteil wird vom Eigentümer oder seiner Firma genutzt.');
  if(m.length) m.push('Angesetzt ist die marktüblich erzielbare Miete (§ 31 Abs. 2 ImmoWertV).');
  return '<h2>Gemischte Nutzung (Wohnen und Gewerbe)</h2><table>'
    +L('Wohnfläche / Gewerbe- und Nutzfläche',num2(M.flW)+' m² / '+num2(M.flG)+' m²'+(M.anteilFlW!=null?' (Wohnen '+mxProz(M.anteilFlW)+')':''))
    +L('Rohertrag Wohnen / Gewerbe',eur(M.rohW)+' / '+eur(M.rohG)+' (Gewerbe '+mxProz(M.anteilG)+')')
    +(bewg?L('Einordnung wie im Bewertungsgesetz',esc(bewg)):'')
    +L('Normalherstellungskosten',!r?'Gebäudetyp '+esc(exV('ek_typ')):r.modus==='mix'?'Gebäudemix '+mxProz(r.a,0)+' '+esc(r.tw)+' / '+mxProz(1-r.a,0)+' '+esc(r.tg)
      :r.modus==='51'?'Typ 5.1 Wohnhaus mit Mischnutzung':'Typ 5.2 Geschäftshaus mit Wohnungen')
    +(q&&q.art==='misch'?L('Bewirtschaftungskosten Wohnen',eur(q.wohnen.verw+q.wohnen.inst+q.wohnen.mausf)+' (Verwaltung, Instandhaltung, Mietausfallwagnis '+num2(num('er_bw_mietausfall'))+' %)')
      +L('Bewirtschaftungskosten Gewerbe',eur(q.gewerbe.verw+q.gewerbe.inst+q.gewerbe.mausf)+' (Verwaltung '+num2(num('mx_verw_g'))+' %, Instandhaltung '+num2(q.instPct)+' % des Wohnansatzes je m², Mietausfallwagnis '+num2(num('mx_maw_g'))+' %)'):'')
    +(M.lzMisch!=null?L('Liegenschaftszins anteilig',num2(M.lzW)+' % Wohnen / '+num2(M.lzG)+' % Gewerbe → '+num2(M.lzMisch)+' %'):'')
    +'</table>'+(m.length?'<p class="beschr">'+m.join(' ')+'</p>':'')
    +'<p class="beschr">Bewirtschaftungskosten nach Anlage 3 ImmoWertV getrennt für Wohnen und Gewerbe'
    +(r&&r.modus==='mix'?'; Normalherstellungskosten als Gebäudemix nach den Nutzungsanteilen (Anlage 4 ImmoWertV, NHK 2010)':'')+'.</p>';
}
