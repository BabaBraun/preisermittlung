/* ImmoApp — Liegenschaftsverwaltung: Reiter „Dokumente“
   Angaben: js/verwaltung-dok.js (ImmoDokumente). Dateien liegen als Anhang in der Datenbank der Verwaltung (nur auf
   diesem Gerät; in der Datensicherung enthalten, unverschlüsselt — wie alle Sicherungen). */
'use strict';

const LVD=ImmoDokumente;
LV.dokFilter='';
const LV_DOK_MAX=25*1024*1024;

function lvDokGroesse(n){ return n>=1048576?String(LVK.r2(n/1048576)).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB'; }
function lvDokumenteHtml(l){
  let form='';
  if(LV.form&&LV.form.typ==='dokument'){ const d=(l.dokumente||[]).find(x=>x.id===LV.form.id); if(d) form=lvFormRahmen('Dokument bearbeiten',lvFelder(lvDokFelder(l,d)),'lvDokSpeichern(\''+lvQ(d.id)+'\')'); }
  const alle=(l.dokumente||[]).slice().sort((a,b)=>String(b.datum||'').localeCompare(String(a.datum||''))||a.titel.localeCompare(b.titel,'de'));
  const liste=LV.dokFilter?alle.filter(d=>d.kategorie===LV.dokFilter):alle, st=lvHeute();
  const kats=[...new Set(alle.map(d=>d.kategorie))];
  const zeilen=liste.map(d=>{ const e=d.einheitId&&lvEinheit(l,d.einheitId), v=d.vertragId&&lvVertrag(l,d.vertragId);
    const ab=d.gueltigBis?(d.gueltigBis<st?lvBadge('abgelaufen '+LVK.datumDE(d.gueltigBis),'bad'):'<span class="lv-klein">gültig bis '+lvH(LVK.datumDE(d.gueltigBis))+'</span>'):'';
    return '<tr><td>'+lvH(LVK.datumDE(d.datum)||'–')+'</td><td class="strong">'+lvH(d.titel)+'<br><span class="lv-klein">'+lvH(d.name)+' · '+lvH(lvDokGroesse(d.size))+'</span></td>'
      +'<td>'+lvH(LVD.KAT[d.kategorie]||'')+(ab?'<br>'+ab:'')+'</td><td>'+lvH(v?lvEinheitName(lvEinheit(l,v.einheitId))+' · '+lvMieterName(v):e?lvEinheitName(e):'ganze Liegenschaft')+'</td>'
      +'<td class="lv-aktionen"><button class="secondary" onclick="lvDokOeffnen(\''+lvQ(d.id)+'\')" data-ic="download">Öffnen</button>'
      +'<button class="secondary" onclick="LV.form={typ:\'dokument\',id:\''+lvQ(d.id)+'\'};lvRender()">Bearbeiten</button>'
      +'<button class="secondary" onclick="lvDokLoeschen(\''+lvQ(d.id)+'\')" aria-label="Dokument löschen" data-ic="trash"></button></td></tr>'; });
  const filter=kats.length>1?'<div class="lv-segment" style="margin-bottom:10px"><button class="'+(!LV.dokFilter?'on':'')+'" onclick="LV.dokFilter=\'\';lvRender()">alle</button>'
    +kats.map(k=>'<button class="'+(LV.dokFilter===k?'on':'')+'" onclick="LV.dokFilter=\''+k+'\';lvRender()">'+lvH((LVD.KAT[k]||k).split(' (')[0].split(' / ')[0])+'</button>').join('')+'</div>':'';
  const summe=alle.reduce((s,d)=>s+(d.size||0),0);
  return form+lvBox('Dokumente'+(alle.length?' ('+alle.length+' · '+lvDokGroesse(summe)+')':''),filter
    +lvTabelle(['Datum','Dokument','Art','Betrifft',''],zeilen,'Noch keine Dokumente abgelegt.')
    +(LV.rueckfall?'<div class="lv-warn">Ohne Datenbank des Browsers können keine Dateien gespeichert werden.</div>':
      '<div class="mdb-actions"><label class="primary lv-datei">'+(typeof iaSvg==='function'?iaSvg('upload'):'')+' Dateien hinzufügen<input type="file" multiple accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt,.eml,.msg" onchange="lvDokHinzu(this.files);this.value=\'\'"></label></div>')
    +'<p class="hint">PDF, Fotos und Office-Dateien bis 25 MB je Datei. Die Dateien bleiben auf diesem Gerät und sind in der Datensicherung der Verwaltung enthalten (unverschlüsselt). Nur ablegen, was für die Verwaltung nötig ist.</p>');
}
function lvDokFelder(l,d){
  d=d||{};
  const einheiten=[['','ganze Liegenschaft']].concat((l.einheiten||[]).map(e=>[e.id,lvEinheitName(e)]));
  const vertraege=[['','–']].concat((l.vertraege||[]).map(v=>[v.id,lvEinheitName(lvEinheit(l,v.einheitId))+' · '+lvMieterName(v)]));
  return [{id:'d_titel',label:'Titel',wert:d.titel,pflicht:true},{id:'d_kat',label:'Art',typ:'wahl',wert:d.kategorie||'sonstig',optionen:LVD.KATEGORIEN},
    {id:'d_datum',label:'Datum des Dokuments',typ:'datum',wert:d.datum},{id:'d_bis',label:'Gültig bis / Frist',typ:'datum',wert:d.gueltigBis,hinweis:'erscheint in den Fristen (Energieausweis: zehn Jahre)'},
    {id:'d_einheit',label:'Einheit',typ:'wahl',wert:d.einheitId||'',optionen:einheiten},{id:'d_vertrag',label:'Mietvertrag',typ:'wahl',wert:d.vertragId||'',optionen:vertraege},
    {id:'d_notiz',label:'Notiz',typ:'textarea',wert:d.notiz,breit:true,zeilen:2}];
}
async function lvDokSpeichern(id){
  const l=lvAktiv(), r=lvFormLesen(lvDokFelder(l)); if(!r.ok){ lvFehlerZeigen(r.fehler); return; }
  const w=r.werte; LV.form=null;
  await lvAendern(x=>{ const d=(x.dokumente||[]).find(y=>y.id===id); if(!d) return false;
    Object.assign(d,{titel:w.d_titel,kategorie:w.d_kat,datum:w.d_datum,gueltigBis:w.d_bis||LVD.gueltigVorschlag(w.d_kat,w.d_datum),einheitId:w.d_einheit||null,vertragId:w.d_vertrag||null,notiz:w.d_notiz});
    if(d.vertragId&&!d.einheitId){ const v=lvVertrag(x,d.vertragId); if(v) d.einheitId=v.einheitId; } },'Dokument gespeichert.');
}
function lvDokLesen(f){ return new Promise((ok,nein)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]||''); r.onerror=()=>nein(r.error||new Error('Lesefehler')); r.readAsDataURL(f); }); }
async function lvDokHinzu(files){
  const l=lvAktiv(); if(!l||!files||!files.length) return;
  const zuGross=[...files].filter(f=>f.size>LV_DOK_MAX);
  if(zuGross.length) alert(zuGross.map(f=>f.name).join(', ')+': größer als 25 MB — nicht übernommen.');
  const ok=[...files].filter(f=>f.size<=LV_DOK_MAX); if(!ok.length) return;
  try{ const q=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;
    if(q&&q.quota&&q.usage+ok.reduce((s,f)=>s+f.size*1.4,0)>q.quota*0.9){ alert('Der Speicher des Browsers ist fast voll. Bitte zuerst eine Datensicherung erstellen und nicht mehr benötigte Dokumente löschen.'); return; } }catch(e){}
  const neu=[], st=lvHeute();
  for(const f of ok){
    let data; try{ data=await lvDokLesen(f); }catch(e){ alert(f.name+' konnte nicht gelesen werden.'); continue; }
    const aid=LVK.neueId('D'), kat=LVD.kategorieVorschlag(f.name), datum=f.lastModified?new Date(f.lastModified).toISOString().slice(0,10):st;
    try{ await lvAnhangSpeichern({id:aid,liegenschaftId:l.id,name:f.name,typ:f.type||'application/octet-stream',size:f.size,datum:st,data}); }
    catch(e){ alert(f.name+' konnte nicht gespeichert werden ('+lvFehlerText(e)+').'); continue; }
    neu.push({id:LVK.neueId('DOK'),anhangId:aid,titel:f.name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').slice(0,200),kategorie:kat,datum,gueltigBis:LVD.gueltigVorschlag(kat,datum),
      einheitId:null,vertragId:null,name:f.name,typ:f.type||'',size:f.size,notiz:''});
  }
  if(!neu.length) return;
  const gespeichert=await lvAendern(x=>{ x.dokumente=(x.dokumente||[]).concat(neu); },neu.length+' Dokument'+(neu.length===1?'':'e')+' abgelegt. Art und Zuordnung bei Bedarf über „Bearbeiten“ anpassen.');
  if(!gespeichert) await lvAnhaengeLoeschen(neu.map(d=>d.anhangId));
}
async function lvDokOeffnen(id){
  const l=lvAktiv(), d=l&&(l.dokumente||[]).find(x=>x.id===id); if(!d) return;
  const a=await lvAnhangLesen(d.anhangId); if(!a||!a.data){ alert('Die Datei ist auf diesem Gerät nicht vorhanden (z. B. nach dem Einspielen einer Sicherung ohne Anhänge).'); return; }
  const bin=atob(a.data), b=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i);
  iaHerunterladen(new Blob([b],{type:a.typ||'application/octet-stream'}),d.name||a.name||'Dokument');
}
async function lvDokLoeschen(id){
  const l=lvAktiv(), d=l&&(l.dokumente||[]).find(x=>x.id===id); if(!d) return;
  if(!confirm('Dokument „'+d.titel+'“ löschen?')) return;
  if(await lvAendern(x=>{ x.dokumente=(x.dokumente||[]).filter(y=>y.id!==id); },'Dokument gelöscht.')) try{ await lvAnhaengeLoeschen([d.anhangId]); }catch(e){ console.error(e); }
}

lvReiterRegistrieren('dokumente','Dokumente',l=>lvDokumenteHtml(l));
lvFristenQuelleRegistrieren((l,st,h)=>LVD.fristen(l,st,h));
LV_FRIST_ZIELE.dokument=()=>{ LV.reiter='dokumente'; LV.dokFilter=''; };
