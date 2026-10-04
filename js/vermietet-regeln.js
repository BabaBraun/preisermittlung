/* ImmoApp — Prüfregeln „Vermietet verkaufen“ (D59), ohne Seitenbezug, in Node testbar
   Am Wortlaut geprüft (Rechtsprüfung vom 03.10.2026, gesetze-im-internet.de, GBl. BW, BGH):
   - Eintritt des Käufers in den Mietvertrag und in die Kaution: §§ 566 Abs. 1 und 2, 566a, 566b, 566e BGB
   - Kaution höchstens drei Monatsmieten ohne Betriebskosten, getrennt angelegt: § 551 Abs. 1 und 3 BGB; Schriftform: § 550 BGB
   - Vorkaufsrecht des Mieters: § 577 Abs. 1 bis 5 BGB, §§ 464 Abs. 2, 465, 467, 469, 470, 471 BGB; BGH VIII ZR 201/23 (Teileigentum
     zu Wohnzwecken analog, Frist ist Ausschlussfrist). Frist: zwei Monate ab Empfang der Mitteilung (§ 469 Abs. 2), §§ 187 Abs. 1,
     188 Abs. 2 und 3, 193 BGB mit den Feiertagen in Baden-Württemberg (js/fristen.js).
   - Kündigungssperrfrist: § 577a Abs. 1, 1a, 2, 2a BGB mit der Gebietsliste der KSpVO BW (js/vermietet-gebiete.js); die App rechnet
     vorsichtig ab der Eigentumsumschreibung im Grundbuch.
   - Kündigung wegen Eigenbedarf: § 573 Abs. 1, 2 Nr. 2 und 3, Abs. 3, §§ 573a, 573c Abs. 1, 574 BGB; Kappungsgrenze § 558 Abs. 3 BGB.
   Keine eigenen Rechtstexte: nur Prüfpunkte mit Normangabe. Unklares als „mit Notar/Rechtsabteilung klären“.
   Daten ohne Namen der Mieter: Bezeichnung der Einheit, Daten, Beträge, Ja/Nein. Datumswerte als ISO-Text (JJJJ-MM-TT). */
(function(wurzel){
'use strict';
const NODE=typeof module==='object'&&module.exports&&typeof require==='function';
const fr=()=>wurzel.ImmoFristen||(NODE?require('./fristen.js'):null);
const gb=()=>wurzel.ImmoVermietetGebiete||(NODE?require('./vermietet-gebiete.js'):null);

const RANG={gruen:0,grau:1,gelb:2,rot:3};
const schlimmste=l=>l.reduce((a,s)=>RANG[s]>RANG[a]?s:a,'gruen');
function iso(x){ x=String(x||''); if(!/^\d{4}-\d{2}-\d{2}$/.test(x)) return ''; const d=new Date(x+'T00:00:00Z'); return isFinite(d)&&d.toISOString().slice(0,10)===x?x:''; }
/* Datum wie toLocaleDateString('de-DE') (in der Oberfläche: wzDatum) */
function dText(x){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x||''); return m?(+m[3])+'.'+(+m[2])+'.'+m[1]:'–'; }
const plusJahre=(s,n)=>fr().fristMonate(s,12*n);

/* ---------- Gemeinde und Gebietsliste ---------- */
function gemeindeAusAnschrift(a){
  a=String(a||'').trim(); if(!a) return '';
  let m=/\b\d{5}\s+([^,;\n]+)/.exec(a), ort=m?m[1]:(a.includes(',')?a.split(',').pop():'');
  return String(ort||'').replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim();
}
function schluessel(n){ return String(n||'').normalize('NFC').toLowerCase().replace(/\(.*?\)/g,'').replace(/^stadt\s+/,'').replace(/\s+/g,' ').trim(); }
/* gleicher Name oder Ortsteil mit Bindestrich („Ilsfeld-Auenstein“ → Ilsfeld) */
function gemeindeIn(name,liste){ let k=schluessel(name); if(!k) return ''; return (liste||[]).find(g=>{ let s=schluessel(g); return k===s||k.startsWith(s+'-'); })||''; }
/* Sperrfrist in Jahren für eine Gemeinde an einem Prüfdatum: 5 (Liste), 3 (Bundesrecht) oder null (ungeklärt) */
function sperrfristJahre(gemeinde,datum,gebiete){
  gebiete=gebiete||gb(); let d=iso(datum);
  let f=((gebiete&&gebiete.fassungen)||[]).find(x=>d&&x.gueltigAb<=d&&d<=x.gueltigBis);
  if(!f) return {jahre:null,status:'keineListe',text:'Gebietsliste nicht aktuell – Sperrfrist 3 oder 5 Jahre ungeklärt'};
  if(!String(gemeinde||'').trim()) return {jahre:null,status:'keineGemeinde',text:'Gemeinde fehlt – Sperrfrist 3 oder 5 Jahre ungeklärt',fassung:f};
  let treffer=gemeindeIn(gemeinde,(gebiete.gemeinden||[]).filter(g=>g.gueltigAb<=d&&d<=g.gueltigBis).map(g=>g.gemeinde));
  if(treffer) return {jahre:f.jahre||5,status:'liste',gemeinde:treffer,fassung:f};
  if(gemeindeIn(gemeinde,f.nichtEnthalten)||f.vollstaendig) return {jahre:3,status:'bund',fassung:f};
  return {jahre:null,status:'ungeprueft',text:'Gemeinde nicht in der hinterlegten Gebietsliste (Auszug) – Sperrfrist 3 oder 5 Jahre im '+f.fundstelle+' prüfen',fassung:f};
}

/* ---------- Fristen ---------- */
/* Ende der Vorkaufsfrist: Zugang + 2 Monate (§ 469 Abs. 2 S. 1, §§ 187 Abs. 1, 188 Abs. 2 und 3 BGB), Wochenende/Feiertag BW → nächster Werktag (§ 193) */
function vorkaufsfrist(zugang){ return iso(zugang)?fr().fristMonate(zugang,2,{werktag:true}):''; }
/* Kündigungsfrist des Vermieters in Monaten nach dem Stand „heute“ (§ 573c Abs. 1 BGB): 3, nach 5 Jahren 6, nach 8 Jahren 9 */
function kuendigungsfristMonate(ueberlassen,heute){
  if(!iso(ueberlassen)||!iso(heute)) return null;
  let m=3; if(plusJahre(ueberlassen,5)<heute) m+=3; if(plusJahre(ueberlassen,8)<heute) m+=3; return m;
}

/* ---------- Eingaben vereinheitlichen ---------- */
const JN=v=>v==='ja'||v==='nein'?v:'';
function norm(d){
  d=d||{}; const z=v=>{ v=+v; return isFinite(v)&&v>0?v:0; };
  return {we:['begruendet','geplant'].includes(d.we)?d.we:'nein',weAm:iso(d.weAm),teileigentum:!!d.teileigentum,
    schonVerkauft:['ja','nein'].includes(d.schonVerkauft)?d.schonVerkauft:'unbekannt',ersteVeraeusserung:iso(d.ersteVeraeusserung),paket:!!d.paket,
    wohnungen:Math.round(z(d.wohnungen)),gemeinde:String(d.gemeinde||'').trim(),
    kaeuferFamilie:!!d.kaeuferFamilie,kaeuferErbe:!!d.kaeuferErbe,zwangsversteigerung:!!d.zwangsversteigerung,
    kaeuferseite:['mehrere','gesellschaft'].includes(d.kaeuferseite)?d.kaeuferseite:'eine',nutzung:['kapitalanlage','selbst'].includes(d.nutzung)?d.nutzung:'',
    leerVerkaufen:!!d.leerVerkaufen,beurkundetAm:iso(d.beurkundetAm),umschreibungAm:iso(d.umschreibungAm),uebergabeAm:iso(d.uebergabeAm),
    mitteilungUebergangAm:iso(d.mitteilungUebergangAm),kautionUebertragenAm:iso(d.kautionUebertragenAm),
    kautionenNotar:d.kautionenNotar==null||d.kautionenNotar===''?null:z(d.kautionenNotar),
    einheiten:(Array.isArray(d.einheiten)?d.einheiten:[]).filter(Boolean).map((e,i)=>({id:String(e.id||'e'+i),bez:String(e.bez||'').trim(),
      ueberlassenAm:iso(e.ueberlassenAm),kaltmiete:z(e.kaltmiete),kaution:z(e.kaution),kautionArt:['bar','buergschaft','sparbuch'].includes(e.kautionArt)?e.kautionArt:'',
      getrennt:JN(e.getrennt)||'unbekannt',schriftlich:JN(e.schriftlich),befristet:JN(e.befristet),vorauszahlung:JN(e.vorauszahlung),
      mitteilungAm:iso(e.mitteilungAm),absender:String(e.absender||''),zugangsnachweis:JN(e.zugangsnachweis),ausgeuebtAm:iso(e.ausgeuebtAm),ausuebungSchriftlich:!!e.ausuebungSchriftlich}))};
}
/* Aufteilung im Verhältnis zur Überlassung: 'nach' | 'vor' | 'keine' | 'unbekannt' */
function aufteilung(d,e){
  if(d.we==='geplant') return 'nach';
  if(d.we!=='begruendet') return 'keine';
  if(!d.weAm||!e.ueberlassenAm) return 'unbekannt';
  return d.weAm<e.ueberlassenAm?'vor':'nach';
}

/* ---------- Vorkaufsrecht je Mieteinheit (§ 577 BGB) ---------- */
function vorkaufEinheit(d,e,heute,dt){
  const r={id:e.id,bez:e.bez,stufe:'gelb',besteht:'unklar',text:'',hinweise:[],fristEnde:'',tage:null,ausgeuebt:false};
  const fertig=(stufe,text,besteht)=>Object.assign(r,{stufe,text,besteht});
  if(d.zwangsversteigerung) return fertig('gruen','Kein Vorkaufsrecht: Zwangsversteigerung oder Verkauf aus der Insolvenzmasse (§ 471 BGB).',false);
  if(d.kaeuferFamilie) return fertig('gruen','Kein Vorkaufsrecht: Der Käufer ist Familien- oder Haushaltsangehöriger des Verkäufers (§ 577 Abs. 1 Satz 2 BGB).',false);
  if(d.we==='nein'&&!d.paket) return fertig('gruen','Kein Vorkaufsrecht des Mieters: kein Wohnungs- oder Teileigentum und keine Aufteilung geplant (§ 577 Abs. 1 Satz 1 BGB).',false);
  if(!e.ueberlassenAm) return fertig('gelb','Mietbeginn fehlt – Vorkaufsrecht und Sperrfrist nicht prüfbar.','unklar');
  let a=aufteilung(d,e);
  if(a==='unbekannt') return fertig('gelb','Datum der Begründung des Wohnungseigentums fehlt (Anlegung des Wohnungsgrundbuchs) – Vorkaufsrecht nicht prüfbar.','unklar');
  if(a==='vor') return fertig('gruen','Kein Vorkaufsrecht des Mieters: Das Wohnungseigentum wurde vor der Überlassung begründet (§ 577 Abs. 1 Satz 1 BGB).',false);
  let unklar=[];
  if(a==='nach'&&d.schonVerkauft!=='nein') unklar.push(d.schonVerkauft==='ja'?'seit der Aufteilung schon einmal verkauft':'unbekannt, ob seit der Aufteilung schon einmal verkauft');
  if(d.paket) unklar.push('Verkauf im Paket zum Gesamtpreis oder mit Aufteilungsabsicht; der Mieter zahlt dann den anteiligen Preis (§ 467 BGB)');
  if(d.teileigentum) unklar.push('Teileigentum zu Wohnzwecken vermietet; laut BGH auch hier Vorkaufsrecht möglich (VIII ZR 201/23)');
  if(d.kaeuferErbe) unklar.push('Verkauf an einen gesetzlichen Erben mit Blick auf das künftige Erbrecht, im Zweifel kein Vorkaufsrecht (§ 470 BGB)');
  r.besteht=unklar.length?'unklar':true;
  const unklarText='Vorkaufsrecht mit Notar klären: '+unklar.join('; ')+'.';
  if(e.mitteilungAm){
    r.fristEnde=vorkaufsfrist(e.mitteilungAm); r.tage=fr().tageBis(heute,r.fristEnde);
    if(e.zugangsnachweis!=='ja') r.hinweise.push({stufe:'gelb',text:'Zugang der Mitteilung nicht nachgewiesen – Fristbeginn mit Notar klären.'});
  }
  if(e.ausgeuebtAm){
    r.ausgeuebt=true;
    if(!e.ausuebungSchriftlich) return fertig('gelb','Ausübung erfasst, aber nicht als schriftliche, eigenhändig unterschriebene Erklärung an den Verkäufer. Eine E-Mail oder ein Anruf genügt nicht (§ 577 Abs. 3, § 126 Abs. 1 BGB) – mit Notar klären.',r.besteht);
    if(r.fristEnde&&e.ausgeuebtAm>r.fristEnde) return fertig('gelb','Ausübung nach dem Fristende ('+dt(r.fristEnde)+') zugegangen; die Frist ist eine Ausschlussfrist (BGH VIII ZR 201/23) – mit Notar klären.',r.besteht);
    return fertig('rot','Kauf mit dem Mieter zu den Bedingungen des Käufervertrags zustande gekommen (§ 464 Abs. 2 BGB) – Notar und Rechtsabteilung informieren. Vorbehalte im Kaufvertrag für diesen Fall wirken nicht gegen den Mieter (§ 465 BGB).',r.besteht);
  }
  if(e.mitteilungAm){
    if(heute<=r.fristEnde) return fertig('gelb','Vorkaufsfrist läuft bis '+dt(r.fristEnde)+' – noch '+r.tage+' Tag'+(r.tage===1?'':'e')+'. Zwei Monate ab Zugang der Mitteilung, Ausschlussfrist ohne Verlängerung (§ 469 Abs. 2 BGB; BGH VIII ZR 201/23).'+(unklar.length?' '+unklarText:''),r.besteht);
    return fertig('gruen','Vorkaufsfrist am '+dt(r.fristEnde)+' ohne Ausübung abgelaufen (§ 469 Abs. 2 BGB).',r.besteht);
  }
  if(unklar.length) return fertig('gelb',unklarText,'unklar');
  if(!d.beurkundetAm) return fertig('gelb','Mieter hat ein Vorkaufsrecht (§ 577 Abs. 1 Satz 1 BGB). Nach der Beurkundung den Vertragsinhalt mit Unterrichtung über das Vorkaufsrecht unverzüglich mitteilen (§ 469 Abs. 1, § 577 Abs. 2 BGB).',true);
  return fertig('rot','Mieter hat Vorkaufsrecht – Mitteilung offen. Vertragsinhalt mit Unterrichtung über das Vorkaufsrecht unverzüglich mitteilen (§ 577 Abs. 2, § 469 Abs. 1 BGB); den Text liefern Notariat oder Vordruck der Bank.',true);
}

/* ---------- Kündigungssperrfrist (§ 577a BGB) ---------- */
function sperrfrist(d,heute,geb,dt){
  const mehrere=d.kaeuferseite==='mehrere'||d.kaeuferseite==='gesellschaft', texte=[], hinweise=[];
  const S={gilt:false,stufe:'gruen',texte,hinweise,start:'',startOffen:false,jahre:null,ende:'',ab:'',ende3:'',ende5:'',laeuft:false,abs:'',liste:null};
  if(!d.einheiten.length) return Object.assign(S,{gilt:'unklar',stufe:'gelb'},{texte:['Keine Mieteinheit erfasst – Sperrfrist nicht prüfbar.']});
  if(d.we==='nein'&&!mehrere){ texte.push('Keine Kündigungssperrfrist nach § 577a BGB: keine Aufteilung in Wohnungseigentum und der Käufer ist eine Person, eine Familie oder ein Haushalt.'); return S; }
  let abs1=false, abs1a=false, offen=false;
  d.einheiten.forEach(e=>{
    if(!e.ueberlassenAm){ offen=true; return; }
    let a=aufteilung(d,e); if(a==='unbekannt'){ offen=true; return; }
    if(a==='nach') abs1=true;
    if(mehrere&&a!=='vor') abs1a=true;
  });
  if(!abs1&&!abs1a){
    if(offen) return Object.assign(S,{gilt:'unklar',stufe:'gelb',texte:['Mietbeginn oder Datum der Aufteilung fehlt – Vorkaufsrecht und Sperrfrist nicht prüfbar.']});
    texte.push('Keine Kündigungssperrfrist nach § 577a BGB: Das Wohnungseigentum wurde vor der Überlassung begründet'+(mehrere?' (§ 577a Abs. 1a Satz 2 BGB).':'.'));
    return S;
  }
  if(offen) hinweise.push({stufe:'gelb',text:'Bei einer Mieteinheit fehlt der Mietbeginn oder das Datum der Aufteilung – Sperrfrist dort nicht prüfbar.'});
  S.gilt=true;
  const absText=mit2=>{ let t=[abs1&&'1',abs1a&&'1a'].filter(Boolean); if(mit2) t.push('2'); return '§ 577a Abs. '+(t.length>1?t.slice(0,-1).join(', ')+' und '+t[t.length-1]:t[0])+' BGB'; };
  S.abs=absText(false);
  /* Beginn: erste Veräußerung nach der Aufteilung (Abs. 1) bzw. diese Veräußerung (Abs. 1a); bei mehreren das spätere Datum */
  let starts=[], fehlt=false;
  if(abs1){
    if(d.schonVerkauft==='ja'){ if(d.ersteVeraeusserung) starts.push(d.ersteVeraeusserung); else fehlt=true; }
    else { if(d.schonVerkauft==='unbekannt') hinweise.push({stufe:'gelb',text:'Unbekannt, ob seit der Aufteilung schon verkauft wurde – die App rechnet vorsichtig ab dieser Veräußerung.'}); starts.push(d.umschreibungAm||null); }
  }
  if(abs1a) starts.push(d.umschreibungAm||null);
  if(fehlt&&!starts.length){
    S.gilt='unklar'; S.stufe='gelb'; texte.push('Datum der ersten Veräußerung nach der Aufteilung fehlt (Grundbuch) – Beginn der Kündigungssperrfrist offen ('+S.abs+').'); return S;
  }
  if(fehlt) hinweise.push({stufe:'gelb',text:'Datum der ersten Veräußerung nach der Aufteilung fehlt (Grundbuch) – die App rechnet vorsichtig ab dieser Veräußerung.'});
  if(starts.includes(null)){ S.startOffen=true; S.start=''; } else S.start=starts.sort().pop();
  let pruef=S.start||heute, g=sperrfristJahre(d.gemeinde,pruef,geb); S.liste=g;
  if(S.start&&plusJahre(S.start,10)<heute){ texte.push('Kündigungssperrfrist jedenfalls abgelaufen: Veräußerung am '+dt(S.start)+', höchstens zehn Jahre (§ 577a Abs. 2 BGB).'); return S; }
  let normText=g.status==='liste'?absText(true)+' i. V. m. § 2 KSpVO BW, '+g.fassung.fundstelle:S.abs;
  S.jahre=g.jahre;   // null = ungeklärt: Ende vorsichtig mit fünf Jahren
  const jahreText=S.jahre?S.jahre+' Jahre':'3 oder 5 Jahre', jahreDat=S.jahre?S.jahre+' Jahren':'3 oder 5 Jahren';
  if(S.startOffen){
    S.laeuft=true; S.stufe='gelb';
    texte.push('Kündigungssperrfrist von '+jahreDat+' ab der Umschreibung im Grundbuch ('+normText+(d.gemeinde?'; Gemeinde '+d.gemeinde:'')+').');
  } else {
    S.ende3=plusJahre(S.start,3); S.ende5=plusJahre(S.start,5); S.ende=S.jahre===3?S.ende3:S.ende5;
    S.ab=fr().plusTage(S.ende,1); S.laeuft=S.ab>heute;
    if(S.laeuft){ S.stufe='gelb'; texte.push('Kündigungssperrfrist bis '+(S.jahre?dt(S.ende):dt(S.ende3)+' oder '+dt(S.ende5))+': '+jahreText+' ab der Veräußerung am '+dt(S.start)+' ('+normText+').'); }
    else texte.push('Kündigungssperrfrist am '+dt(S.ende)+' abgelaufen ('+jahreText+' ab '+dt(S.start)+', '+normText+').');
  }
  if(S.laeuft){
    if(g.jahre==null) hinweise.push({stufe:'gelb',text:g.text+'.'});
    if(g.status==='liste'&&abs1a&&!abs1) hinweise.push({stufe:'gelb',text:'Ob § 2 KSpVO BW auch ohne Aufteilung gilt (Verkauf an mehrere Erwerber oder eine Gesellschaft, § 577a Abs. 1a BGB), mit Rechtsabteilung klären; die App rechnet vorsichtig mit fünf Jahren.'});
    if(g.status==='liste'&&(S.startOffen||S.ende>g.fassung.gueltigBis))
      hinweise.push({stufe:'gelb',text:'Die '+g.fassung.name+' tritt mit Ablauf des '+dt(g.fassung.gueltigBis)+' außer Kraft. Ob die Sperrfrist von fünf Jahren danach weiter gilt, klärt die Rechtsabteilung.'});
  }
  return S;
}

/* ---------- Gesamtprüfung ---------- */
function pruefen(eingabe,heute,o){
  o=o||{}; const dt=o.datum||dText, geb=o.gebiete||gb(); heute=iso(heute);
  const d=norm(eingabe), E=d.einheiten, ampeln=[];
  const add=(bereich,stufe,text)=>ampeln.push({bereich,stufe,text});
  const name=e=>e.bez||'Einheit '+(E.indexOf(e)+1);
  /* gleiche Aussage für mehrere Einheiten einmal zeigen */
  const gruppiert=(bereich,l)=>{ let m=[]; l.forEach(x=>{ let g=m.find(y=>y.stufe===x.stufe&&y.text===x.text); if(g) g.namen.push(x.name); else m.push({stufe:x.stufe,text:x.text,namen:[x.name]}); });
    m.forEach(g=>add(bereich,g.stufe,(E.length>1&&g.namen.length<E.length?g.namen.join(', ')+': ':'')+g.text)); };

  // Vorkaufsrecht
  const BV='Vorkaufsrecht des Mieters (§ 577 BGB)';
  let vk=E.map(e=>Object.assign(vorkaufEinheit(d,e,heute,dt),{name:name(e)}));
  let vorkauf={einheiten:vk,stufe:vk.length?schlimmste(vk.map(x=>x.stufe)):'gelb',
    besteht:!vk.length?'unklar':vk.some(x=>x.besteht===true)?true:vk.some(x=>x.besteht==='unklar')?'unklar':false};
  if(!vk.length) add(BV,'gelb','Keine Mieteinheit erfasst – Vorkaufsrecht nicht prüfbar.');
  gruppiert(BV,vk);
  gruppiert(BV,[].concat(...vk.map(x=>x.hinweise.map(h=>({name:x.name,stufe:h.stufe,text:h.text})))));

  // Kündigungssperrfrist
  const BS='Kündigungssperrfrist (§ 577a BGB)';
  let sperr=sperrfrist(d,heute,geb,dt);
  sperr.texte.forEach(t=>add(BS,sperr.stufe,t)); sperr.hinweise.forEach(h=>add(BS,h.stufe,h.text));

  // Eigenbedarf
  const BE='Eigenbedarf des Käufers', eigen={stufe:'grau',texte:[]};
  const eAdd=(s,t)=>{ eigen.texte.push({stufe:s,text:t}); add(BE,s,t); };
  if(d.nutzung==='kapitalanlage') eAdd('gruen','Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB).');
  else if(d.nutzung==='selbst'){
    if(sperr.gilt===true&&sperr.laeuft){
      if(sperr.startOffen) eAdd('rot','Eigenbedarf erst nach Ablauf der Kündigungssperrfrist von '+(sperr.jahre?sperr.jahre+' Jahren':'3 oder 5 Jahren')+' ab der Umschreibung im Grundbuch (§ 577a BGB, § 573 Abs. 2 Nr. 2 BGB).');
      else eAdd('rot','Eigenbedarf erst ab '+dt(sperr.ab)+' (Ende der Kündigungssperrfrist'+(sperr.jahre?'':', vorsichtig mit fünf Jahren gerechnet')+'; § 577a BGB, § 573 Abs. 2 Nr. 2 BGB).');
    } else if(sperr.gilt==='unklar') eAdd('gelb','Kündigungssperrfrist ungeklärt – vor einer Kündigung wegen Eigenbedarf klären (§ 577a BGB).');
    else {
      let fr2=E.map(e=>({name:name(e),m:kuendigungsfristMonate(e.ueberlassenAm,heute)}));
      let fristText=fr2.every(x=>x.m==null)?'Kündigungsfrist je nach Dauer seit der Überlassung 3, 6 oder 9 Monate':
        'Kündigungsfrist nach heutigem Stand '+(E.length>1?fr2.map(x=>x.name+' '+(x.m==null?'– (Mietbeginn fehlt)':x.m+' Monate')).join(', '):fr2[0].m+' Monate');
      eAdd('gelb','Eigenbedarf nur mit Kündigung: berechtigtes Interesse nötig, die Gründe gehören ins Kündigungsschreiben (§ 573 Abs. 1 und 3 BGB). '+fristText
        +' (§ 573c Abs. 1 BGB). Der Mieter kann wegen Härte widersprechen (§ 574 BGB). Nur Orientierung, kein Einzugstermin.');
    }
    if(d.wohnungen===2) eAdd('gelb','Zweifamilienhaus und der Käufer zieht selbst ein: Kündigung ohne berechtigtes Interesse möglich, wenn der Vermieter selbst im Gebäude wohnt; die Frist verlängert sich um drei Monate (§ 573a Abs. 1 BGB) – mit Rechtsabteilung klären.');
  } else eAdd('grau','Geplante Nutzung des Käufers eintragen (Kapitalanlage oder selbst bzw. Angehörige).');
  eigen.stufe=schlimmste(eigen.texte.map(x=>x.stufe));

  // Kaution und Mietvertrag
  const BK='Kaution und Mietvertrag', kl=[];
  E.forEach(e=>{
    if(e.kaution>0&&e.kaltmiete>0&&e.kaution>3*e.kaltmiete+0.005) kl.push({name:name(e),stufe:'gelb',text:'Kaution höher als drei Monatsmieten ohne Betriebskosten (§ 551 Abs. 1 BGB).'});
    if(e.kaution>0&&e.kautionArt!=='buergschaft'&&e.getrennt!=='ja') kl.push({name:name(e),stufe:'gelb',text:'Kaution nicht nachweislich getrennt vom Vermögen des Vermieters angelegt (§ 551 Abs. 3 Satz 3 BGB).'});
    if(e.befristet==='ja'&&e.schriftlich!=='ja') kl.push({name:name(e),stufe:'gelb',text:'Befristung oder Kündigungsverzicht über mehr als ein Jahr ohne schriftlichen Vertrag: Der Vertrag gilt als unbefristet (§ 550 BGB) – Angaben im Exposé prüfen.'});
    if(e.vorauszahlung==='ja') kl.push({name:name(e),stufe:'gelb',text:'Mietvorauszahlung oder Abtretung von Mieten: wirkt gegenüber dem Käufer nur für den laufenden Monat, bei Eigentumsübergang nach dem 15. auch für den Folgemonat (§ 566b Abs. 1 BGB) – mit Notar klären.'});
  });
  let summe=E.reduce((s,e)=>s+e.kaution,0);
  gruppiert(BK,kl);
  if(d.kautionenNotar!=null&&Math.abs(d.kautionenNotar-summe)>0.5){ kl.push({stufe:'gelb'}); add(BK,'gelb','Summe der Kautionen ('+eur(summe)+') weicht vom Notarauftrag ab („Kautionen gesamt“ '+eur(d.kautionenNotar)+').'); }
  if(E.length&&!kl.length) add(BK,'gruen','Keine Auffälligkeiten bei Kaution und Mietvertrag (§§ 550, 551, 566b BGB).');
  let kaution={stufe:kl.length?'gelb':E.length?'gruen':'grau',summe};

  // Nach der Umschreibung
  const BU='Nach der Umschreibung', ul=[];
  const uAdd=(s,t)=>{ ul.push(s); add(BU,s,t); };
  let uebergeben=!!d.umschreibungAm||(!!d.uebergabeAm&&d.uebergabeAm<=heute);
  if(d.mitteilungUebergangAm&&(!d.umschreibungAm||d.mitteilungUebergangAm<d.umschreibungAm))
    uAdd('rot','Mitteilung des Eigentumsübergangs an den Mieter vor der Umschreibung: Der Verkäufer muss sie bei der Miete gegen sich gelten lassen, auch wenn die Übertragung nicht erfolgt oder nicht wirksam ist (§ 566e Abs. 1 BGB).');
  if(d.umschreibungAm&&!d.mitteilungUebergangAm) uAdd('gelb','Eigentum umgeschrieben, Mitteilung an den Mieter fehlt. Sie befreit den Verkäufer von der Haftung wie ein Bürge (§ 566 Abs. 2 Satz 2 BGB); Text aus dem Vordruck der Bank.');
  if(summe>0&&!d.kautionUebertragenAm&&uebergeben) uAdd('rot','Kaution noch nicht an den Käufer übertragen: Der Verkäufer bleibt zur Rückzahlung verpflichtet, wenn der Mieter sie vom Käufer nicht erhält (§ 566a Satz 2 BGB). Übergabe nachweisen.');
  if(!ul.length){
    if(d.umschreibungAm) uAdd('gruen','Mitteilung an den Mieter'+(summe>0?' und Übertragung der Kaution':'')+' nach der Umschreibung erfasst (§§ 566, 566a BGB).');
    else uAdd('grau','Nach der Umschreibung: Mitteilung des Eigentumsübergangs an den Mieter (Vordruck der Bank)'+(summe>0?' und Kaution an den Käufer übertragen':'')+' (§§ 566, 566a BGB).');
  }
  let uebergang={stufe:schlimmste(ul)};

  // Verkauf ohne Mieter
  // § 573 Abs. 2 Nr. 3 BGB: Verwertung (auch Verkauf) kann ein berechtigtes Interesse sein (Hs. 1); ausgeschlossen sind nur höhere Miete (Hs. 2) und Verkauf wegen Aufteilung (Hs. 3)
  if(d.leerVerkaufen) add('Verkauf ohne Mieter','gelb','Verkauf ist kein Kündigungsgrund für sich allein: Der Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB). '
    +'Eine Kündigung wegen wirtschaftlicher Verwertung setzt voraus, dass der Vermieter durch das Mietverhältnis an einer angemessenen Verwertung gehindert ist und dadurch erhebliche Nachteile erleiden würde (§ 573 Abs. 2 Nr. 3 Hs. 1 BGB); '
    +'ausgeschlossen ist sie, wenn im Zusammenhang mit einer beabsichtigten oder nach der Überlassung erfolgten Begründung von Wohnungseigentum verkauft werden soll (Hs. 3) – Rechtsberatung, keine Vorlage in der App.');

  let stufe=schlimmste(ampeln.map(a=>a.stufe));
  return {daten:d,vorkauf,sperr,eigenbedarf:eigen,kaution,uebergang,ampeln,stufe,rot:ampeln.filter(a=>a.stufe==='rot').length,gelb:ampeln.filter(a=>a.stufe==='gelb').length,
    geklaert:E.length>0&&vorkauf.stufe==='gruen'};
}
function eur(x){ return (Math.round(x*100)/100).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2})+' €'; }

/* ---------- Anzeigen: vermietet nicht als frei darstellen (§ 566 Abs. 1 BGB), Kappungsgrenze (§ 558 Abs. 3 BGB) ---------- */
function anzeigePruefen(text,vermietet){
  let t=String(text||''), l=[]; if(!t.trim()) return l;
  if(vermietet){
    let m=/(bezugsfrei|sofort\s+frei|(?:^|[^a-zäöüß])frei\s+ab\b)/i.exec(t);
    if(m) l.push({stufe:'rot',text:'Der Text nennt „'+m[1].replace(/^[^a-zäöüß]+/i,'').trim()+'“, das Objekt ist aber vermietet. Hinweis „vermietet“ aufnehmen: Der Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB).'});
    else if(!/(?:^|[^a-zäöüß])(?:teil)?vermietet/i.test(t)) l.push({stufe:'gelb',text:'Der Hinweis „vermietet“ fehlt im Text. Der Käufer tritt in den Mietvertrag ein (§ 566 Abs. 1 BGB).'});
  }
  if(/miet[a-zäöüß]*poten[tz]ial/i.test(t)) l.push({stufe:'gelb',text:'„Mietsteigerungspotenzial“ genannt: Kappungsgrenze 20 % in drei Jahren, in Gebieten nach Landesverordnung 15 % (§ 558 Abs. 3 BGB) – welche Grenze in der Gemeinde gilt, mit Rechtsabteilung klären. Die App rechnet keine Erhöhung.'});
  return l;
}

/* ---------- Posten für die Kachel „Unterlagen“ ---------- */
const UL_SCHLUESSEL=['vv_kaution','vv_mieterhoehungen','vv_mitteilung577','vv_mitteilung566'];
function unterlagenPosten(erg){
  let p=[{key:'vv_kaution',name:'Kautionsnachweis mit Anlagekonto',stelle:'eigentuemer',fuer:'Notar, Käufer',hinweis:'Getrennte Anlage (§ 551 Abs. 3 BGB); der Käufer tritt in die Kaution ein (§ 566a BGB).'},
    {key:'vv_mieterhoehungen',name:'Mieterhöhungen der letzten drei Jahre',stelle:'eigentuemer',fuer:'Exposé, Käufer',hinweis:'Für die Kappungsgrenze (§ 558 Abs. 3 BGB).'}];
  if(erg&&erg.vorkauf&&erg.vorkauf.besteht!==false) p.push({key:'vv_mitteilung577',name:'Nachweis der Mitteilung an den Mieter mit Unterrichtung über das Vorkaufsrecht',stelle:'notariat',fuer:'Notar, Beginn der Vorkaufsfrist',hinweis:'Zugang belegen; ab Zugang zwei Monate (§ 469 Abs. 2, § 577 Abs. 2 BGB).'});
  p.push({key:'vv_mitteilung566',name:'Nachweis der Mitteilung des Eigentumsübergangs an den Mieter',stelle:'eigentuemer',fuer:'Verkäufer',hinweis:'Erst nach der Umschreibung (§ 566e BGB); befreit den Verkäufer von der Haftung (§ 566 Abs. 2 BGB). Text aus dem Vordruck der Bank.'});
  return p;
}

const ImmoVermietetRegeln={gemeindeAusAnschrift,gemeindeIn,sperrfristJahre,vorkaufsfrist,kuendigungsfristMonate,pruefen,anzeigePruefen,unterlagenPosten,UL_SCHLUESSEL,schlimmste,iso};
wurzel.ImmoVermietetRegeln=ImmoVermietetRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoVermietetRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
