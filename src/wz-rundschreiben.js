/* ---------- Kachel „Rundschreiben“ (D46) ----------
   Ein Schreiben an viele: Serienbrief (je Empfänger eine Seite mit eigener Anrede — Word, PDF, Drucken) oder eine E-Mail an alle
   in Bcc. Empfänger: Suchkunden, deren Suchprofil zum gewählten Objekt passt; alle Kunden mit Einwilligung zur Werbung;
   Eigentümer der Objekte in Vermarktung; oder selbst gewählt. Text aus den Vorlagen (Platzhalter je Empfänger, Objekt für alle).
   Werbung per E-Mail nur mit vorheriger ausdrücklicher Einwilligung (§ 7 Abs. 2 Nr. 2 UWG): Empfänger ohne Einwilligung erhalten
   keine E-Mail, nur den Brief; jede Werbe-E-Mail nennt, wie man sich abmeldet (§ 7 Abs. 2 Nr. 3 Buchst. c UWG). Die App versendet
   nichts selbst; „In der Kundenakte vermerken“ legt bei allen Empfängern eine Notiz ab. Gespeichert werden nur die Auswahl
   (Kunden-Ids) und Einstellungen — die Personen stehen in der Kundenakte. */
const RS_GRUPPEN=[['such','Suchkunden zu einem Objekt'],['werbung','Alle mit Einwilligung zur Werbung'],['eigentuemer','Eigentümer der Objekte in Vermarktung'],['auswahl','Selbst auswählen']];
/* jederzeit widersprechen, ohne andere als die Übermittlungskosten nach den Basistarifen (§ 7 Abs. 3 Nr. 4 UWG) — erfüllt auch § 7 Abs. 2 Nr. 3 lit. c */
const RS_ABMELDEN='Sie können der Verwendung Ihrer E-Mail-Adresse für Angebote jederzeit widersprechen, zum Beispiel mit einer kurzen Antwort auf diese E-Mail; dafür entstehen Ihnen keine anderen als die Übermittlungskosten nach den Basistarifen.';
function rsStart(){ return {gruppe:'such',projektId:'',vorlage:'expose',auswahl:[],ohne:[],filter:''}; }
function rsS(){ let S=wzZustand('rundschreiben'); ['auswahl','ohne'].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; }); return S; }
function rsEinwilligung(k){ return !!k&&ImmoWerbung.darfEmail(k).ok; }   // D51: Einwilligung je Kanal (js/werbung.js)
/* Werbebrief: nicht nach einem Werbewiderspruch (Art. 21 Abs. 3 DSGVO); Schreiben an Eigentümer im laufenden Auftrag sind keine Werbung */
function rsBriefErlaubt(S,k){ return S.gruppe==='eigentuemer'||ImmoWerbung.darfPost(k).ok; }
/* Empfänger der gewählten Gruppe: [{k, info}] — ohne doppelte, ohne gelöschte */
function rsKandidaten(S){
  let l=[], kd=typeof KD_CACHE!=='undefined'?KD_CACHE:[];
  if(S.gruppe==='such'){ let o=wzdObjekt(S.projektId); if(o) kkTreffer(kkObjekt(o.f,o.empf)).filter(x=>x.k.id!==o.kundeId).forEach(x=>l.push({k:x.k,info:x.t.stufe==='passt'?'passt':'passt fast'+(x.t.ab.length?' ('+x.t.ab.join(', ')+')':'')})); }
  else if(S.gruppe==='werbung') kd.filter(rsEinwilligung).forEach(k=>l.push({k,info:''}));
  else if(S.gruppe==='eigentuemer') wzdObjekte(false).forEach(o=>{ let k=wzdKunde(o.kundeId); if(k&&!l.some(x=>x.k.id===k.id)) l.push({k,info:o.name}); });
  else S.auswahl.forEach(id=>{ let k=wzdKunde(id); if(k) l.push({k,info:''}); });
  return l.sort((a,b)=>kdName(a.k).localeCompare(kdName(b.k),'de'));
}
function rsEmpfaenger(S){ return rsKandidaten(S).filter(x=>!S.ohne.includes(x.k.id)); }
function rsVorlage(S){ return (typeof vlAlle==='function'?vlAlle():[]).find(v=>v.id===S.vorlage)||VL_STANDARD[0]; }
function rsFuellen(S,k){ let v=rsVorlage(S), w=vlWerte({kundeId:k?k.id:'',projektId:S.projektId||'',terminId:''});
  return {betreff:ImmoBeratung.vorlageFuellen(v.betreff||'',w).text,text:ImmoBeratung.vorlageFuellen(v.text||'',w).text}; }
function rsDabei(id,an){ let S=rsS(); S.ohne=S.ohne.filter(x=>x!==id); if(!an) S.ohne.push(id); wzSpeichern(); wzZeichnen(); }
function rsAuswahlDazu(){ wzdKundeWaehlen(id=>{ let S=rsS(); if(!S.auswahl.includes(id)) S.auswahl.push(id); S.ohne=S.ohne.filter(x=>x!==id); wzSpeichern(); wzZeichnen(); }); }
function rsAuswahlWeg(id){ let S=rsS(); S.auswahl=S.auswahl.filter(x=>x!==id); wzSpeichern(); wzZeichnen(); }
function rsZeichnen(){
  let S=rsS(), l=rsKandidaten(S), objekte=wzdObjekte(false), mails=0, briefe=0;
  if(S.gruppe==='such'&&!wzdObjekt(S.projektId)&&objekte.length) S.projektId=objekte[0].id;
  l=rsKandidaten(S);
  let vorl=(typeof vlAlle==='function'?vlAlle():[]);
  let zeilen=l.map(({k,info})=>{ let dabei=!S.ohne.includes(k.id), mail=dabei&&rsEinwilligung(k)&&!!k.email, brief=dabei&&!!(k.strasse&&k.plzort)&&rsBriefErlaubt(S,k), sperre=!!ImmoWerbung.norm(k).widerspruch.am;
    if(mail) mails++; if(brief) briefe++;
    return '<tr'+(dabei?'':' class="rs-ohne"')+'><td><label class="wz-check"><input type="checkbox"'+(dabei?' checked':'')+' onchange="rsDabei(\''+idSicher(k.id)+'\',this.checked)"><span><b>'+sEsc(kdName(k))+'</b></span></label>'
      +(info?'<small>'+sEsc(info)+'</small>':'')+'</td>'
      +'<td>'+(sperre?'<span class="pa-chip pa-ueberfaellig">Werbesperre</span>':rsEinwilligung(k)?'<span class="pa-chip pa-bezahlt">'+(ImmoWerbung.darfEmail(k).bestandskunde?'Bestandskunde':'Einwilligung')+'</span>':'<span class="pa-chip">ohne Einwilligung</span>')+'</td>'
      +'<td>'+(k.email?(rsEinwilligung(k)?sEsc(k.email):'<small>nur Brief</small>'):'<small>keine E-Mail</small>')+'</td>'
      +'<td>'+(!(k.strasse&&k.plzort)?'<small>Anschrift fehlt</small>':rsBriefErlaubt(S,k)?'Brief':'<small>Widerspruch</small>')+'</td>'
      +(S.gruppe==='auswahl'?'<td class="wz-aktion"><button class="secondary" onclick="rsAuswahlWeg(\''+idSicher(k.id)+'\')" aria-label="Aus der Auswahl entfernen" data-ic="x"></button></td>':'')+'</tr>'; }).join('');
  return wzBox('Empfänger','<div class="grid">'
      +wzFeld('gruppe','Wer bekommt das Schreiben?',{typ:'wahl',optionen:RS_GRUPPEN,zeichnen:true})
      +(S.gruppe==='such'?(objekte.length?'<div class="field"><label for="rs_objekt">Objekt</label><select id="rs_objekt" onchange="rsS().projektId=this.value;rsS().ohne=[];wzSpeichern();wzZeichnen()">'
          +objekte.map(o=>'<option value="'+sEsc(o.id)+'"'+(o.id===S.projektId?' selected':'')+'>'+sEsc(o.name)+'</option>').join('')+'</select></div>':'<p class="hint">Noch kein Objekt in Vermarktung.</p>')
        :'<div class="field"><label for="rs_objekt2">Objekt im Text (optional)</label><select id="rs_objekt2" onchange="rsS().projektId=this.value;wzSpeichern();wzZeichnen()">'+wzdObjektOptionen(S.projektId,'– ohne Objekt –')+'</select></div>')
      +'<div class="field"><label for="rs_vorlage">Vorlage</label><select id="rs_vorlage" onchange="rsS().vorlage=this.value;wzSpeichern();wzZeichnen()">'
        +vorl.map(v=>'<option value="'+sEsc(v.id)+'"'+(v.id===S.vorlage?' selected':'')+'>'+sEsc(v.kategorie+': '+v.titel)+'</option>').join('')+'</select></div></div>'
      +(S.gruppe==='auswahl'?'<div class="gr-zeile"><button type="button" class="secondary" onclick="rsAuswahlDazu()" data-ic="plus">Kunden hinzufügen</button></div>':'')
      +(zeilen?'<div class="wz-tabwrap"><table class="nhk wz-tab rs-tab"><thead><tr><th>Empfänger</th><th>Werbung</th><th>E-Mail</th><th>Post</th>'+(S.gruppe==='auswahl'?'<th></th>':'')+'</tr></thead><tbody>'+zeilen+'</tbody></table></div>'
        :wzHinweis(S.gruppe==='such'?'Kein Suchprofil passt zu diesem Objekt.':S.gruppe==='werbung'?'Noch kein Kunde mit Einwilligung zur Werbung.':S.gruppe==='eigentuemer'?'Bei den Objekten in Vermarktung ist kein Kunde als Eigentümer eingetragen.':'Noch niemand ausgewählt.'))
      +'<div class="wz-kpis grid">'+wzdKpi('Empfänger',String(rsEmpfaenger(S).length),'')+wzdKpi('Per E-Mail',String(mails),'mit Einwilligung und Adresse')+wzdKpi('Per Brief',String(briefe),'mit Anschrift')+'</div>')
    +wzBox('Text','<div id="rs_vorschau" class="rs-vorschau"></div>'
      +wzHinweis('Der Brief erhält je Empfänger die eigene Anrede. Die E-Mail geht an alle in Bcc mit „Guten Tag,“ — und nur an Kunden mit Einwilligung zur Werbung (§ 7 Abs. 2 Nr. 2 UWG); sie nennt, wie man sich abmeldet.')
      +'<div class="gr-zeile"><button type="button" class="primary" onclick="wzDokument()" data-ic="file-text">Serienbrief</button>'
      +'<button type="button" class="secondary" onclick="rsMail()" data-ic="mail">E-Mail an alle (Bcc)</button>'
      +'<button type="button" class="secondary" onclick="rsAdressen()" data-ic="clipboard">E-Mail-Adressen kopieren</button>'
      +'<button type="button" class="secondary" onclick="rsVermerken()" data-ic="users">In der Kundenakte vermerken</button></div>');
}
function rsRechnen(){
  iconify($('wz_body'));
  let S=rsS(), e=rsEmpfaenger(S), box=$('rs_vorschau'); if(!box) return;
  let f=rsFuellen(S,e[0]?e[0].k:null);
  box.innerHTML='<p><b>Betreff:</b> '+sEsc(f.betreff)+'</p><pre class="rs-text">'+sEsc(f.text)+'</pre>'+(e.length>1?'<p class="hint">Vorschau für '+sEsc(kdName(e[0].k))+' — die Anrede passt sich je Empfänger an.</p>':'');
}
/* E-Mail: gemeinsamer Text mit neutraler Anrede, alle in Bcc, Abmeldehinweis */
function rsMailEmpfaenger(S){ return rsEmpfaenger(S).filter(x=>rsEinwilligung(x.k)&&x.k.email).map(x=>x.k); }
function rsMailText(S){
  let f=rsFuellen(S,null), t=f.text.replace(/^[^\n]*,\s*\n/,'Guten Tag,\n');   // erste Zeile (Anrede) neutral
  return {betreff:f.betreff,text:(typeof wzMitPflicht==='function'?wzMitPflicht(t+'\n\n'+RS_ABMELDEN,{mail:true}):t+'\n\n'+RS_ABMELDEN)};   // D48: § 25a GenG
}
function rsMail(){
  let S=rsS(), l=rsMailEmpfaenger(S); if(!l.length){ alert('Keiner der Empfänger hat eine Einwilligung zur Werbung und eine E-Mail-Adresse.'); return; }
  let m=rsMailText(S), link='mailto:?bcc='+encodeURIComponent(l.map(k=>k.email).join(','))+'&subject='+encodeURIComponent(m.betreff)+'&body='+encodeURIComponent(m.text);
  if(link.length>1900&&!confirm('Die E-Mail ist für manche Mailprogramme zu lang (viele Empfänger oder langer Text). Trotzdem öffnen? Sonst „E-Mail-Adressen kopieren“ und den Text aus der Vorschau nehmen.')) return;
  location.href=link;
}
function rsAdressen(){
  let l=rsMailEmpfaenger(rsS()); if(!l.length){ alert('Keine E-Mail-Adresse mit Einwilligung zur Werbung.'); return; }
  try{ navigator.clipboard.writeText(l.map(k=>k.email).join('; ')).then(()=>{ iaHinweis(l.length+' Adressen kopiert — ins Bcc-Feld einfügen'); setTimeout(()=>iaHinweis(''),2400); }); }catch(e){}
}
async function rsVermerken(){
  let S=rsS(), v=rsVorlage(S), e=rsEmpfaenger(S).filter(x=>(rsEinwilligung(x.k)&&x.k.email)||(x.k.strasse&&x.k.plzort&&rsBriefErlaubt(S,x.k)));   // nur, wer etwas bekommt
  if(!e.length){ alert('Kein ausgewählter Empfänger bekommt das Schreiben (keine Einwilligung per E-Mail, keine Anschrift oder Werbewiderspruch).'); return; }
  if(!confirm('Bei '+e.length+' Empfänger'+(e.length===1?'':'n')+' eine Notiz „Rundschreiben: '+v.titel+'“ in der Kundenakte ablegen?')) return;
  let n=0; for(const x of e){ if(await wzdNotiz(x.k.id,'Rundschreiben',v.titel+(S.projektId?' — '+wzdObjektName(S.projektId,''):''))) n++; }
  alert('Notiz bei '+n+' Empfänger'+(n===1?'':'n')+' abgelegt.');
}
/* Serienbrief: je Empfänger eine Seite (Seitenumbruch auch im Word-Export) */
function rsDokument(){
  let S=rsS(), e=rsEmpfaenger(S).filter(x=>x.k.strasse&&x.k.plzort&&rsBriefErlaubt(S,x.k));
  if(!e.length){ alert('Kein Empfänger darf einen Brief bekommen (Anschrift fehlt oder Werbewiderspruch) — für E-Mails „E-Mail an alle (Bcc)“ nehmen.'); return null; }
  let abs=typeof wzAbsenderKontakt==='function'?wzAbsenderKontakt():typeof ulAbsender==='function'?ulAbsender():{}, v=rsVorlage(S);
  return {titel:'Serienbrief '+v.titel,ohneFuss:true,
    html:e.map(({k},i)=>{ let f=rsFuellen(S,k);
      return (i?'<div class="pagebreak"></div>':'')+'<div class="pa-briefkopf"><div class="pa-absender">'+sEsc([abs.name,abs.firma].filter(Boolean).join(' · ')||'')+'</div>'
        +'<div class="pa-empfaenger">'+sEsc(kdName(k))+'<br>'+sEsc(k.strasse)+'<br>'+sEsc(k.plzort)+'</div><div class="pa-daten">'+wzDokTabelle([['Datum',new Date().toLocaleDateString('de-DE')]])+'</div></div>'
        +'<h2>'+sEsc(f.betreff)+'</h2>'+f.text.split(/\n{2,}/).map(p=>'<p>'+sEsc(p).replace(/\n/g,'<br>')+'</p>').join('')
        +(typeof wzPflichtFussHtml==='function'?wzPflichtFussHtml():''); }).join('')};
}
wzRegistrieren({id:'rundschreiben',titel:'Rundschreiben',sub:'Serienbrief und E-Mail an viele — mit Einwilligung',icon:'send',start:rsStart,ohneNeu:true,
  zeichnen:rsZeichnen,rechnen:rsRechnen,dokument:rsDokument});
