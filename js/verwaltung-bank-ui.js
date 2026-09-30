/* ImmoApp — Liegenschaftsverwaltung: Oberfläche „Kontoauszug importieren“ (im Reiter „Mietkonto“)
   Lesen und Zuordnen: js/verwaltung-bank.js (ImmoBankimport). Die Datei wird nur im Browser gelesen; gebucht
   werden ausschließlich die bestätigten Zeilen. */
'use strict';

const LVB=ImmoBankimport;
LV.bankImport=null;

function lvBankDekodieren(buf){
  const b=new Uint8Array(buf), kopf=new TextDecoder('latin1').decode(b.slice(0,300));
  const erkl=(kopf.match(/encoding=["']([\w-]+)["']/i)||[])[1];
  if(erkl&&!/utf-?8/i.test(erkl)){ try{ return new TextDecoder(/8859-1|latin/i.test(erkl)?'windows-1252':erkl).decode(b); }catch(e){} }
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(b); }catch(e){ return new TextDecoder('windows-1252').decode(b); }   // ältere CSV-Exporte: Windows-1252
}
function lvBankDatei(){
  const i=document.createElement('input'); i.type='file'; i.accept='.csv,.xml,.txt,.sta,text/csv,application/xml,text/xml';
  i.onchange=()=>{ const f=i.files[0]; if(!f) return;
    if(f.size>20*1024*1024){ alert('Die Datei ist größer als 20 MB — bitte einen kürzeren Zeitraum exportieren.'); return; }
    const r=new FileReader(); r.onload=()=>lvBankAuswerten(f.name,lvBankDekodieren(r.result)); r.onerror=()=>alert('Die Datei konnte nicht gelesen werden.'); r.readAsArrayBuffer(f); };
  i.click();
}
function lvBankAuswerten(name,text){
  const l=lvAktiv(); if(!l) return;
  const r=LVB.lesen(text);
  if(!r.ok){ alert(r.fehler+'\nEs wurde nichts gebucht.'); return; }
  if(!r.umsaetze.length){ alert('In der Datei stehen keine gebuchten Umsätze.'); return; }
  LV.bankImport={lId:l.id,datei:name,format:r.format,konto:r.konto,warnungen:r.warnungen||[],vorschlaege:LVB.zuordnen(l,r.umsaetze),nurEingaenge:true};
  lvMeldung(''); lvRender();
}
function lvBankZiele(l){
  const st=lvHeute(), o=[['','– nicht übernehmen –']];
  (l.vertraege||[]).slice().sort((a,b)=>String((lvEinheit(l,a.einheitId)||{}).nr).localeCompare(String((lvEinheit(l,b.einheitId)||{}).nr),'de',{numeric:true})).forEach(v=>
    o.push(['miete:'+v.id,'Miete '+lvEinheitName(lvEinheit(l,v.einheitId))+' · '+lvMieterName(v)+(LVK.vertragAktiv(v,st)?'':' (beendet/künftig)')]));
  if(l.art==='weg') (l.einheiten||[]).forEach(e=>{ const eig=((l.weg&&l.weg.eigentuemer)||[]).filter(x=>x.einheitId===e.id).map(x=>x.name).join(', ');
    o.push(['hausgeld:'+e.id,'Hausgeld '+lvEinheitName(e)+(eig?' · '+eig:'')]); });
  return o;
}
function lvBankImportHtml(l){
  const bi=LV.bankImport, ziele=lvBankZiele(l);
  const liste=bi.vorschlaege.map((x,i)=>({x,i})).filter(({x})=>!bi.nurEingaenge||x.u.betrag>0||x.ruecklast);
  const kontoWarn=bi.konto&&l.iban&&bi.konto!==l.iban?'<div class="lv-warn">Der Auszug gehört zum Konto '+lvH(LVK.ibanLesbar(bi.konto))+', in den Stammdaten ist das Mietkonto '+lvH(LVK.ibanLesbar(l.iban))+' hinterlegt. Bitte prüfen, ob die richtige Datei gewählt ist.</div>':'';
  const neu=bi.vorschlaege.filter(x=>!x.doppelt).length, doppelt=bi.vorschlaege.length-neu;
  const zeilen=liste.map(({x,i})=>{
    const u=x.u, v=x.vorschlag, wert=v?v.typ+':'+v.id:'', grund=v?v.gruende.join(', '):(x.alternativen[0]?'unsicher: '+x.alternativen[0].gruende.join(', '):'');
    return '<tr class="'+(x.doppelt?'lv-doppelt':'')+'"><td><input type="checkbox" id="lvb_c'+i+'"'+(v&&!x.doppelt?' checked':'')+(x.doppelt?' disabled':'')+' aria-label="übernehmen"></td>'
      +'<td>'+lvH(LVK.datumDE(u.datum))+'</td><td class="r'+(u.betrag<0?' lv-neg':'')+'">'+lvEur(u.betrag)+'</td>'
      +'<td>'+lvH(u.name||'–')+(u.iban?'<br><span class="lv-klein">'+lvH(LVK.ibanLesbar(u.iban))+'</span>':'')+'<div class="lv-zweck">'+lvH(u.zweck||u.text||'')+'</div></td>'
      +'<td>'+(x.doppelt?lvBadge('bereits gebucht',''):'<select id="lvb_z'+i+'" onchange="document.getElementById(\'lvb_c'+i+'\').checked=!!this.value">'+ziele.map(o=>'<option value="'+lvH(o[0])+'"'+(o[0]===wert?' selected':'')+'>'+lvH(o[1])+'</option>').join('')+'</select>'
        +(grund?'<br><span class="lv-klein">'+lvH(grund)+'</span>':''))+'</td>'
      +'<td>'+(x.doppelt?'':'<select id="lvb_a'+i+'">'+Object.entries(LV_ZAHLART).map(o=>'<option value="'+o[0]+'"'+(o[0]===x.art?' selected':'')+'>'+lvH(o[1])+'</option>').join('')+'</select>')+'</td>'
      +'<td>'+(x.doppelt?'':'<input id="lvb_m'+i+'" type="month" value="'+lvH(x.monat)+'" aria-label="Für Monat" style="max-width:150px">')+'</td></tr>';
  });
  const ausg=bi.vorschlaege.filter(x=>x.u.betrag<0&&!x.ruecklast).length;
  return lvBox('Kontoauszug importieren — '+lvH(bi.datei),
    '<p>'+lvH(bi.format)+(bi.konto?' · Konto '+lvH(LVK.ibanLesbar(bi.konto)):'')+' · '+bi.vorschlaege.length+' Umsätze'+(doppelt?' · '+doppelt+' bereits gebucht':'')+'</p>'+kontoWarn
    +(bi.warnungen.length?'<details class="lv-details"><summary>'+bi.warnungen.length+' Hinweise beim Lesen</summary><ul class="lv-hinweise">'+bi.warnungen.slice(0,50).map(t=>'<li>'+lvH(t)+'</li>').join('')+'</ul></details>':'')
    +'<label class="lv-check"><input type="checkbox"'+(bi.nurEingaenge?' checked':'')+' onchange="LV.bankImport.nurEingaenge=this.checked;lvRender()"> <span>nur Zahlungseingänge und Rücklastschriften zeigen'+(ausg?' ('+ausg+' Ausgaben ausgeblendet — Kosten unter „Nebenkosten“ erfassen)':'')+'</span></label>'
    +'<div class="lv-import">'+lvTabelle(['','Datum',{t:'Betrag',r:1},'Gegenseite / Verwendungszweck','Zuordnung','Art','Für Monat'],zeilen,'Keine passenden Umsätze.')+'</div>'
    +'<p class="hint">Vorschläge beruhen auf IBAN früherer Zahlungen, Namen, Einheit und Betrag. Bitte jede Zeile prüfen — gebucht werden nur angehakte Zeilen mit Zuordnung. Beim nächsten Import erkennt die App die IBAN der Mieter wieder.</p>'
    +'<div class="mdb-actions"><button class="primary" onclick="lvBankBuchen()" data-ic="check">Ausgewählte buchen</button><button class="secondary" onclick="LV.bankImport=null;lvRender()">Abbrechen</button></div>');
}
async function lvBankBuchen(){
  const l=lvAktiv(), bi=LV.bankImport; if(!l||!bi) return;
  const auswahl=[];
  bi.vorschlaege.forEach((x,i)=>{
    const c=document.getElementById('lvb_c'+i), z=document.getElementById('lvb_z'+i); if(!c||!c.checked||!z||!z.value) return;
    const [typ,id]=z.value.split(':'), a=document.getElementById('lvb_a'+i), m=document.getElementById('lvb_m'+i);
    auswahl.push({kennung:x.kennung,typ,id,art:a?a.value:'miete',monat:m?m.value:''});
  });
  if(!auswahl.length){ alert('Keine Zeile mit Zuordnung ausgewählt.'); return; }
  const b=LVB.buchungen(l,bi.vorschlaege,auswahl,LVK.neueId), n=b.miete.length+b.hausgeld.length;
  if(!n){ alert('Es gibt nichts zu buchen.'); return; }
  if(!confirm(n+' Zahlung'+(n===1?'':'en')+' buchen?')) return;
  const ok=await lvAendern(x=>{ x.zahlungen=(x.zahlungen||[]).concat(b.miete); if(b.hausgeld.length){ x.weg=x.weg||{}; x.weg.zahlungen=(x.weg.zahlungen||[]).concat(b.hausgeld); } },
    n+' Zahlung'+(n===1?'':'en')+' aus dem Kontoauszug gebucht.');
  if(ok) { LV.bankImport=null; lvRender(); }
}

/* in den Reiter „Mietkonto“ einhängen */
const lvMietkontoOhneImport=LV_REITER_HTML.mietkonto;
LV_REITER_HTML.mietkonto=l=>{
  const knopf='<div class="mdb-actions lv-import-knopf"><button class="secondary" onclick="lvBankDatei()" data-ic="upload">Kontoauszug importieren (CSV / CAMT)</button></div>';
  const imp=LV.bankImport&&LV.bankImport.lId===l.id?lvBankImportHtml(l):knopf;
  if(l.art==='weg'&&!(l.vertraege||[]).length) return imp+lvBox('Hausgeld','<p class="hint">Importierte Hausgeldzahlungen erscheinen im Reiter „WEG“ unter „Hausgeld“.</p>');
  return imp+lvMietkontoOhneImport(l);
};
