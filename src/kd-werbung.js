/* ---------- Werbung je Kanal und Datenschutzinformation in der Kundenakte (D51) ----------
   Regeln und Quellen stehen in js/werbung.js. Je Kanal hält die Akte Stand, Datum der Erteilung, Form, Zweck und die Fundstelle des
   Nachweises im Banksystem fest — Scans und unterschriebene Vordrucke gehören dorthin, nicht auf das Gerät. Das Erfassungsdatum
   setzt die App selbst (§ 7a Abs. 1 UWG); ein Widerruf bleibt mit Datum und Weg im Verlauf, denn die Einwilligung wirkte bis dahin
   (Art. 7 Abs. 3 DSGVO). Ein Werbewiderspruch sperrt alle Kanäle und legt die Wiedervorlage für die Bestätigung an. */
const KW_DS_LEER={art:'direkt',erhobenAm:'',erteiltAm:'',bereits:false,fundstelle:'',quelle:'',erlangtAm:''};
function kwModell(k){ let w=ImmoWerbung.norm(k); delete w.migriert; if(!w.dsinfo) delete w.dsinfo; return w; }
function kwKunde(){ return KD_CACHE.find(x=>x.id===KD_AKTIV)||null; }
function kwDe(s){ return s?String(s).split('-').reverse().join('.'):''; }
/* TT.MM.JJJJ oder JJJJ-MM-TT → ISO, sonst '' */
function kwIso(s){ s=String(s||'').trim(); let m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s), x=m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):s;
  return /^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x?x:''; }
/* neue Kunden: Verbraucher, Datenschutzinformation bei der Erhebung fällig (Art. 13 Abs. 1 DSGVO); aus einem Tipp: von Dritten
   mit Quelle und Datum (Art. 14 DSGVO) — d.dsinfoArt, d.quelle, d.erlangtAm */
function kwNeu(d){
  d=d||{}; let heute=aufHeute(), w={verbraucher:d.anrede!=='Firma',dsinfo:Object.assign({},KW_DS_LEER,{art:d.dsinfoArt==='dritter'?'dritter':'direkt',erhobenAm:heute,
    erteiltAm:d.dsinfo?heute:'',quelle:String(d.quelle||''),erlangtAm:String(d.erlangtAm||'')})};
  const ein=x=>({stand:'einwilligung',erteiltAm:heute,erfasstAm:heute,form:d.einwilligungForm||'',nachweis:'',zweck:'Angebote zu Immobilien',widerrufAm:'',widerrufWeg:''});
  if(d.einwilligungEmail||d.einwilligung) w.email=ein();
  if(d.einwilligungTelefon||d.einwilligung) w.telefon=Object.assign(ein(),{mutmasslichGrund:'',verwendungen:[]});
  return w;
}
async function kwSetz(pfad,wert){
  let k=kwKunde(); if(!k) return;
  let w=kwModell(k), teile=pfad.split('.');
  if(teile[0]==='dsinfo'&&!w.dsinfo) w.dsinfo=Object.assign({},KW_DS_LEER);
  let o=w; for(let i=0;i<teile.length-1;i++){ if(!o[teile[i]]||typeof o[teile[i]]!=='object') o[teile[i]]={}; o=o[teile[i]]; }
  let key=teile[teile.length-1], vorher=o[key];
  if(/^(email|telefon)\.stand$/.test(pfad)&&wert==='keine'&&(o.erteiltAm||(o.verwendungen||[]).length)){
    alert('Eine erteilte Einwilligung lässt sich nicht auf „keine“ zurücksetzen — bitte „Widerruf eintragen“. Der Nachweis bleibt für die Aufbewahrung (§ 7a UWG, Art. 7 Abs. 1 DSGVO).');
    kwNeuZeichnen(k); return; }
  if(pfad==='verbraucher') wert=wert==='ja';
  o[key]=typeof wert==='string'?wert.trim():wert;
  if(/^(email|telefon)\.stand$/.test(pfad)&&wert!==vorher){
    if(wert==='einwilligung'||wert==='bestandskunde'){ o.erfasstAm=aufHeute(); o.widerrufAm=''; o.widerrufWeg=''; if(vorher==='widerrufen'){ o.erteiltAm=''; o.nachweis=''; } }
    if(wert==='keine'){ o.erteiltAm=''; o.form=''; o.nachweis=''; }
  }
  k.werbung=w; if(await kdSpeichern(k)) kwNeuZeichnen(k);
}
/* nur den Kasten „Werbung und Datenschutz“ neu aufbauen: Akte, Scrollstand und Eingaben anderer Felder bleiben; Fokus wandert mit */
function kwNeuZeichnen(k){
  let box=document.querySelector('#kd_inhalt .kw-box'); if(!box){ kdAkte(k.id); return; }
  let a=document.activeElement, an=a&&box.contains(a)&&a.getAttribute?a.getAttribute('onchange'):'';
  box.innerHTML=kwHtml(k); if(typeof iconify==='function') iconify(box);
  if(an){ let n=[...box.querySelectorAll('[onchange]')].find(x=>x.getAttribute('onchange')===an); if(n) n.focus(); }
}
async function kwWiderruf(kanal){
  let k=kwKunde(); if(!k) return;
  let weg=prompt('Widerruf der Einwilligung ('+(kanal==='email'?'E-Mail':'Telefon')+'): Wie kam er? (z. B. Anruf, E-Mail, Brief)','');
  if(weg===null) return;
  let w=kwModell(k); w[kanal].stand='widerrufen'; w[kanal].widerrufAm=aufHeute(); w[kanal].widerrufWeg=String(weg).trim();
  k.werbung=w;
  if(k.grundlage==='einwilligung'&&!k.loeschpruefung){ k.loeschpruefung=aufHeute();
    alert('Die Speicherung beruhte auf der Einwilligung. Prüfen, ob eine andere Rechtsgrundlage bleibt (z. B. laufender Auftrag) — sonst Daten löschen (Art. 17 Abs. 1 lit. b DSGVO). Die Löschprüfung steht auf heute.'); }
  if(await kdSpeichern(k)) kwNeuZeichnen(k);
}
async function kwWiderspruch(){
  let k=kwKunde(); if(!k) return;
  if(!confirm('„'+kdName(k)+'“ widerspricht der Werbung?\nDie App sperrt Werbung per E-Mail, Telefon und Post sofort (Art. 21 Abs. 3 DSGVO). Schreiben im laufenden Auftrag bleiben möglich.')) return;
  let weg=prompt('Wie kam der Widerspruch? (z. B. mündlich, Brief, E-Mail)',''); if(weg===null) return;
  let heute=aufHeute(), ein=prompt('Eingegangen am (TT.MM.JJJJ) — die Monatsfrist für die Bestätigung läuft ab Eingang (Art. 12 Abs. 3 DSGVO):',kwDe(heute)); if(ein===null) return;
  let am=kwIso(ein)||heute; if(am>heute) am=heute;
  let w=kwModell(k); w.widerspruch={am,weg:String(weg).trim(),bestaetigtAm:'',erfasstAm:heute};
  k.werbung=w; if(!(await kdSpeichern(k))) return;
  let frist=ImmoFristen.fristMonate(am,1);
  wzdWiedervorlage('Werbewiderspruch von '+kdName(k)+' bestätigen und in die Werbesperre der Bank eintragen (Art. 12 Abs. 3 DSGVO, Frist bis '+kwDe(frist)+')',frist<heute?heute:frist,'',k.id);
  kwNeuZeichnen(k);
}
async function kwWiderspruchBestaetigt(){ let k=kwKunde(); if(!k) return; let w=kwModell(k); w.widerspruch.bestaetigtAm=aufHeute(); k.werbung=w; if(await kdSpeichern(k)) kwNeuZeichnen(k); }
async function kwWiderspruchAufheben(){
  let k=kwKunde(); if(!k) return;
  if(!confirm('Werbesperre aufheben? Nur, wenn der Kunde ausdrücklich wieder Werbung wünscht — dann die neue Einwilligung je Kanal eintragen.')) return;
  let w=kwModell(k); w.verlauf=w.verlauf.concat([Object.assign({aufgehobenAm:aufHeute()},w.widerspruch)]); w.widerspruch={am:'',weg:'',bestaetigtAm:''};
  k.werbung=w; if(await kdSpeichern(k)) kwNeuZeichnen(k);
}
function kwAmpel(r){ return r.stufe==='grau'?'<p class="hint kw-hinweis">'+sEsc(r.grund)+'.</p>':wzAmpel(r.stufe,sEsc(r.grund)); }
function kwWahl(pfad,label,wert,optionen){
  return '<div class="field"><label>'+label+'</label><select onchange="kwSetz(\''+pfad+'\',this.value)" aria-label="'+sEsc(label)+'">'
    +optionen.map(o=>'<option value="'+sEsc(o[0])+'"'+(String(wert)===String(o[0])?' selected':'')+'>'+sEsc(o[1])+'</option>').join('')+'</select></div>';
}
function kwText(pfad,label,wert,typ,ph){
  return '<div class="field"><label>'+label+'</label><input'+(typ?' type="'+typ+'"':'')+' value="'+sEsc(wert||'')+'"'+(ph?' placeholder="'+sEsc(ph)+'"':'')
    +' onchange="kwSetz(\''+pfad+'\',this.value)" aria-label="'+sEsc(label.replace(/<[^>]+>/g,'').trim())+'"></div>';
}
function kwCheck(pfad,label,an){ return '<label class="wz-check full"><input type="checkbox"'+(an?' checked':'')+' onchange="kwSetz(\''+pfad+'\',this.checked)"><span>'+label+'</span></label>'; }
function kwKanal(k,w,kanal){
  let x=w[kanal], r=kanal==='email'?ImmoWerbung.darfEmail(k):ImmoWerbung.darfTelefon(k), p=kanal+'.', mitNachweis=x.stand==='einwilligung'||x.stand==='widerrufen';
  let formen=ImmoWerbung.FORMEN.filter(f=>f!==ImmoWerbung.ALT||x.form===ImmoWerbung.ALT).map(f=>[f,f]);
  let h='<div class="kw-kanal"><h4>'+(kanal==='email'?'E-Mail':'Telefon')+'</h4><div class="grid">'
    +kwWahl(p+'stand','Stand',x.stand,ImmoWerbung.STAND[kanal].filter(s=>s[0]!=='widerrufen'||x.stand==='widerrufen'))
    +(mitNachweis?kwText(p+'erteiltAm','erteilt am',x.erteiltAm,'date')+kwWahl(p+'form','Form',x.form,[['','– bitte wählen –']].concat(formen))
      +kwText(p+'nachweis','Nachweis im Banksystem <span class="u">Fundstelle</span>',x.nachweis,'','z. B. Vordruck Werbung 2026, Scan im DMS')
      +kwText(p+'zweck','Zweck',x.zweck,'','z. B. Angebote zu Immobilien'):'')
    +(kanal==='telefon'&&x.stand==='mutmasslich'?kwText(p+'mutmasslichGrund','Grund der mutmaßlichen Einwilligung',x.mutmasslichGrund,'','z. B. Hausverwaltung, bittet um Angebote für Kunden'):'')
    +'</div>'
    +(kanal==='email'&&x.stand==='bestandskunde'?'<div class="kw-bk">'+kwCheck(p+'bk.erhalten','Adresse beim Verkauf einer Dienstleistung erhalten (z. B. Maklervertrag)',x.bk.erhalten)
      +kwCheck(p+'bk.aehnlich','Werbung nur für eigene ähnliche Leistungen',x.bk.aehnlich)
      +'<div class="grid">'+kwText(p+'bk.hinweisAm','Hinweis auf das Widerspruchsrecht bei der Erhebung am',x.bk.hinweisAm,'date')+'</div></div>':'')
    +(x.erfasstAm?'<p class="hint">In der App erfasst am '+kwDe(x.erfasstAm)+(x.erteiltAm&&x.erteiltAm<x.erfasstAm?' — nachträglich erfasst; maßgeblich ist der Nachweis im Banksystem.':'.')+'</p>':'')
    +(x.widerrufAm?'<p class="hint">Widerrufen am '+kwDe(x.widerrufAm)+(x.widerrufWeg?' ('+sEsc(x.widerrufWeg)+')':'')+'.</p>':'');
  if(kanal==='telefon'&&mitNachweis){ let bis=ImmoWerbung.aufbewahrenBis(k);
    h+='<p class="hint">Werbliche Anrufe: '+(x.verwendungen.length?x.verwendungen.map(kwDe).join(', '):'noch keine')+(bis?' · Nachweis aufbewahren bis '+kwDe(bis)+' (§ 7a Abs. 2 UWG)':'')+'</p>'; }
  return h+kwAmpel(r)+(x.stand==='einwilligung'||x.stand==='bestandskunde'?'<div class="gr-zeile"><button type="button" class="secondary" onclick="kwWiderruf(\''+kanal+'\')">Widerruf eintragen</button></div>':'')+'</div>';
}
function kwHtml(k){
  let w=ImmoWerbung.norm(k), ds=w.dsinfo||KW_DS_LEER, st=ImmoWerbung.dsinfoStand(k,aufHeute()), wi=w.widerspruch;
  return '<h3>Werbung und Datenschutz</h3>'
    +(w.migriert?wzAmpel('gelb','Aus der früheren Angabe „Einwilligung“ übernommen — gilt hier für E-Mail und Telefon. Bitte je Kanal Form und Nachweis prüfen.'):'')
    +'<div class="grid">'+kwWahl('verbraucher','Kunde ist',w.verbraucher?'ja':'nein',[['ja','Verbraucher (privat)'],['nein','Unternehmer oder Firma']])+'</div>'
    +'<div class="kw-kanaele">'+kwKanal(k,w,'email')+kwKanal(k,w,'telefon')
    +'<div class="kw-kanal"><h4>Post</h4>'+kwAmpel(ImmoWerbung.darfPost(k))+'<p class="hint">Adressierte Werbebriefe brauchen keine Einwilligung (Erwägungsgrund 47 DSGVO) — nach einem Widerspruch nicht mehr (§ 7 Abs. 1 UWG).</p></div></div>'
    +'<div class="kw-widerspruch">'+(wi.am?wzAmpel('rot','Werbesperre: Widerspruch am '+kwDe(wi.am)+(wi.weg?' ('+sEsc(wi.weg)+')':'')+(wi.bestaetigtAm?', bestätigt am '+kwDe(wi.bestaetigtAm):', Bestätigung an den Kunden offen (spätestens '+kwDe(ImmoFristen.fristMonate(wi.am,1))+')')+'.')
        +'<div class="gr-zeile">'+(wi.bestaetigtAm?'':'<button type="button" class="secondary" onclick="kwWiderspruchBestaetigt()">Bestätigung verschickt</button>')
        +'<button type="button" class="secondary" onclick="kwWiderspruchAufheben()">Sperre aufheben</button></div>'
      :'<div class="gr-zeile"><button type="button" class="secondary" onclick="kwWiderspruch()" data-ic="x">Widerspricht Werbung</button></div>')+'</div>'
    +(w.verlauf.length?'<p class="hint">Frühere Werbewidersprüche: '+w.verlauf.map(v=>kwDe(v.am)+(v.aufgehobenAm?' (aufgehoben am '+kwDe(v.aufgehobenAm)+')':'')).join(', ')+'</p>':'')
    +'<h4>Datenschutzinformation</h4><div class="grid">'
    +kwWahl('dsinfo.art','Daten stammen',ds.art,ImmoWerbung.DS_ARTEN)
    +(ds.art==='dritter'?kwText('dsinfo.quelle','Quelle',ds.quelle,'','z. B. Tipp aus der Filiale, Empfehlung eines Kunden')+kwText('dsinfo.erlangtAm','erhalten am',ds.erlangtAm,'date'):'')
    +kwText('dsinfo.erteiltAm','Datenschutzinformation gegeben am',ds.erteiltAm,'date')+'</div>'
    +kwCheck('dsinfo.bereits','Kunde hat die Information schon (z. B. Datenschutzinformation der Bank, die die Vermittlung abdeckt)',ds.bereits)
    +(ds.bereits?'<div class="grid">'+kwText('dsinfo.fundstelle','Welche Information, Stand',ds.fundstelle,'','z. B. Datenschutzhinweise der Bank, Stand 05/2026')+'</div>':'')
    +(st?wzAmpel(st.stufe,sEsc(st.text)+'.'):'<p class="hint">Für diese Akte ist nicht festgehalten, wann der Kunde die Datenschutzinformation bekommen hat.</p>');
}
/* Marken für die Kundenliste: [{text, warn}] */
function kwMarken(k){
  let w=ImmoWerbung.norm(k), l=[];
  if(w.widerspruch.am) l.push({text:'Werbesperre',warn:true});
  else { let e=ImmoWerbung.darfEmail(k).ok, t=ImmoWerbung.darfTelefon(k).ok; if(e||t) l.push({text:'Werbung: '+[e?'E-Mail':'',t?'Telefon':''].filter(Boolean).join(', '),warn:false}); }
  let st=ImmoWerbung.dsinfoStand(k,aufHeute()); if(st&&st.stufe==='rot') l.push({text:'Datenschutzinfo fällig',warn:true});
  return l;
}
/* Gesprächsnotiz „werblicher Anruf“: Datum als Verwendung der Telefon-Einwilligung (§ 7a Abs. 2 UWG). false = abbrechen */
function kwAnrufVermerken(k,datum){
  if(!ImmoWerbung.darfTelefon(k).ok&&!confirm('Für Werbeanrufe liegt keine gültige Einwilligung vor ('+ImmoWerbung.darfTelefon(k).grund+'). Notiz trotzdem speichern?')) return false;
  let w=kwModell(k); w.telefon.verwendungen=(w.telefon.verwendungen||[]).concat([datum]); k.werbung=w; return true;
}
/* Löschen: Nachweis der Telefon-Einwilligung muss bis zum Fristende bleiben (Art. 17 Abs. 3 lit. b DSGVO, § 7a Abs. 2 UWG) */
function kwLoeschenErlaubt(k){
  let bis=ImmoWerbung.aufbewahrenBis(k); if(!bis||bis<aufHeute()) return true;
  let t=ImmoWerbung.norm(k).telefon;
  return confirm('Der Nachweis der Telefon-Einwilligung ist bis '+kwDe(bis)+' aufzubewahren (§ 7a Abs. 2 UWG).\n'
    +(t.nachweis?'Fundstelle im Banksystem: '+t.nachweis+'.\n':'In der Akte ist keine Fundstelle im Banksystem eingetragen.\n')
    +'Nur löschen, wenn der Nachweis dort liegt. Fortfahren?');
}
