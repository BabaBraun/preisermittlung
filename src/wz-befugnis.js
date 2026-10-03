/* ---------- Kachel „Wer verkauft?“ (Verfügungsbefugnis) ----------
   Je Verkauf (gesicherte Bewertung) klärt die Kachel, wer über das Objekt verfügen darf und was dafür vorliegen muss:
   Eigentümer selbst, Erbe oder Erbengemeinschaft, Testamentsvollstrecker, Vorerbe, Nachlasspfleger, Betreuer, Eltern für
   Minderjährige, Ergänzungspfleger, Bevollmächtigter und Ehegatte (Güterstand). Einstiegsfragen schalten die Fälle zu; je Fall
   Prüfpunkte als Ampel mit Normangabe (Regeln in js/befugnis-regeln.js, Einheitstests), Genehmigungskette mit Rechtskraft
   (letzte Bekanntgabe + 2 Wochen) und Mitteilung an den Käufer. Jeder Nachweis und jede Genehmigung geht als Posten in die
   Kachel „Unterlagen“ (ulPostenErgaenzen; Stand dort und hier derselbe). Personen nur als Verweis auf die Kundenakte
   (kundeId) — keine Kopien von Testament, Erbschein, Bestellungsurkunde oder Vollmacht, keine Geburtsdaten, keine Angaben zu
   Krankheit oder Gründen einer Betreuung (Art. 5 Abs. 1 lit. c, Art. 9 Abs. 1 DSGVO). Keine eigenen Rechtstexte: Erklärungen,
   Vollmachten und Anträge kommen vom Notariat oder aus den Vordrucken der Bank. Gerätedatenbank, Speicher „akten“ (art
   'befugnis'); Bewertungen und Notaraufträge werden nur gelesen. Schwelle für „Kaufpreis deutlich unter Bewertung“ legt die
   Bank fest (localStorage „ia_wz“). */
var BF={aktiv:null,notar:null,notarLaedt:false,timer:null,zeichnen:false};
const BFR=()=>window.ImmoBefugnisRegeln;
function bfS(){ let a=wzAlle(); if(!a.befugnis||typeof a.befugnis!=='object'||Array.isArray(a.befugnis)) a.befugnis={schwelle:''}; return a.befugnis; }
function bfGen(){ return {beantragt:'',beschluss:'',bekanntgabe:'',mitgeteilt:'',aufforderung:''}; }
function bfPersonLeer(x){
  return Object.assign({id:wzdId('p'),kundeId:'',vertretung:'selbst',vertreterIds:[],einverstanden:'offen',familienstand:'',gueterstand:'',ganzesVermoegen:false,ehAufforderung:'',
    aufgabenkreis:'',vorlaeufigBis:'',wohnt:false,anzeigeAm:'',kaeuferNahe:false,sorge:'',volljaehrig:false,
    vmForm:'',vmUmfasst:'',vmGeberLebt:'',vmUeberTod:false,vmUntersagt:false,vmSelbstkauf:false,vm181:'',gen:bfGen()},x||{});
}
function bfLeer(o){
  return wzdAkteNeu('befugnis',{projektId:o.id,objekt:o.name,eigentuemer:'',erben:'',tv:'',nacherbfolge:'',nachweis:'',enzBis:'',erbscheinNE:false,erbscheinTV:false,
    anzahlErben:'',erbenEingetragen:'',erbfall:'',tvId:'',tvNachweis:'',tvEnzBis:'',tvGeprueft:'',vorerbeWeg:'',nacherbenUnbekannt:false,npId:'',npGen:bfGen(),
    personen:o.kundeId?[bfPersonLeer({kundeId:o.kundeId})]:[],notiz:'',ulKeys:[],ulSig:'',wv:{}});
}
function bfAkte(pid){ return wzdAkten('befugnis',pid)[0]||null; }

/* ---------- Kontext: Notarauftrag, Unterlagen, Bewertung (nur lesen) ---------- */
async function bfNotarLaden(){
  if(BF.notarLaedt) return; BF.notarLaedt=true;
  try{ await IA_BEREIT_P; BF.notar=IA_DB_BEREIT?await iaAlle('notar'):[]; }catch(e){ BF.notar=[]; }
  BF.notarLaedt=false;
}
function bfNotarListe(){ return BF.notar||(typeof FP!=='undefined'&&FP.extra&&FP.extra.notar)||[]; }
function bfGleich(a,b){ let n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9äöüß]/g,''); return !!n(a)&&n(a)===n(b); }
function bfNotarFuer(o){
  if(!o) return null;
  let l=bfNotarListe().filter(n=>bfGleich(n.anschrift,o.anschrift)||bfGleich(n.projekt,o.name));
  return l.sort((a,b)=>(a.stand==='Erledigt')-(b.stand==='Erledigt')||(b.geaendert||b.ts||0)-(a.geaendert||a.ts||0))[0]||null;
}
const BF_FAMILIE={'verheiratet':'verheiratet','eingetragene Lebenspartnerschaft':'verpartnert','ledig':'ledig','geschieden':'ledig','verwitwet':'ledig'};
const BF_GUETER={'Zugewinngemeinschaft (gesetzlich)':'zugewinn','Gütertrennung':'trennung','Gütergemeinschaft':'gemeinschaft','anderer oder ausländischer Güterstand':'anders'};
function bfStaende(pid){ let u=wzdListe('unterlagen').find(x=>x.projektId===pid), m={}; Object.entries((u&&u.posten)||{}).forEach(([k,s])=>{ if(s&&s.stand) m[k]=s.stand; }); return m; }
function bfPostenStand(pid,key){ let u=wzdListe('unterlagen').find(x=>x.projektId===pid); return (u&&u.posten&&u.posten[key])||{stand:'offen'}; }
function bfKontext(r){
  let o=wzdObjekt(r.projektId), n=bfNotarFuer(o), np={};
  ((n&&n.verkaeufer)||[]).forEach(x=>{ if(x&&x.kundeId) np[x.kundeId]={familienstand:BF_FAMILIE[x.familienstand]||'',gueterstand:BF_GUETER[x.gueterstand]||''}; });
  return {heute:aufHeute(),termin:n?wzdDatum(n.termin):'',kaufpreis:n?wzN(n.kaufpreis,true):0,wert:o?zahlLesen(o.empf||'',true):0,schwelle:wzN(bfS().schwelle),
    stand:bfStaende(r.projektId),abt2:[o&&o.f.od_abt2,n&&n.abt2].filter(Boolean).join(' '),name:wzdKundeName,datum:wzDatum,notarPersonen:np,notar:n,objekt:o};
}
function bfPruefung(r){ return BFR().pruefen(r,bfKontext(r)); }
/* für andere Kacheln (Notarauftrag, Provision, Verkaufsfahrplan): Ampel je Verkauf, null ohne Datensatz */
function bfAmpel(pid){ let r=bfAkte(pid); if(!r||!window.ImmoBefugnisRegeln) return null; let pr=bfPruefung(r); return {stufe:pr.stufe,text:pr.text,genehmigungsfall:pr.genehmigungsfall,genehmigungGruen:pr.genehmigungGruen}; }

/* ---------- Übernahme in die Kachel „Unterlagen“ ---------- */
async function bfStandSetzen(pid,key,stand,datum,quelle){
  await wzdLaden(); let u=wzdListe('unterlagen').find(x=>x.projektId===pid); if(!u) return false;
  if(!u.posten||typeof u.posten!=='object') u.posten={};
  let s=u.posten[key]||{stand:'offen'};
  u.posten[key]=Object.assign({},s,{stand,datum:stand==='offen'?'':(datum||aufHeute()),quelle:quelle||''});
  let ok=await wzdSpeichern('unterlagen',u);
  if(typeof UL!=='undefined'&&UL.aktiv&&UL.aktiv.id===u.id) UL.aktiv=u;
  return ok;
}
/* Posten abgleichen (neu, geändert, nicht mehr nötig) und Stand der Genehmigung aus der Kette übernehmen: beantragt → angefordert, Beschluss → liegt vor */
async function bfAbgleich(r){
  if(!r||!r.projektId||typeof ulPostenErgaenzen!=='function'||!wzdObjekt(r.projektId)||!wzdAkten('befugnis').some(x=>x.id===r.id)) return false;   // gelöscht: nichts mehr übertragen
  let pr=bfPruefung(r), sig=JSON.stringify(pr.posten), neu=false, da=wzdListe('unterlagen').some(x=>x.projektId===r.projektId);
  if(sig!==r.ulSig||(pr.posten.length&&!da)){
    let weg=(r.ulKeys||[]).filter(k=>!pr.posten.some(p=>p.key===k));
    if(pr.posten.length||weg.length){ if(!(await ulPostenErgaenzen(r.projektId,pr.posten,weg))) return false; neu=true; }   // ohne Posten kein leerer Eintrag in „Unterlagen“
    r.ulKeys=pr.posten.map(p=>p.key); r.ulSig=sig; await wzdSpeichernSofort('akten',r);
  }
  for(const k of pr.ketten){
    let s=bfPostenStand(r.projektId,k.genKey).stand, g=k.g||{};
    if(wzdDatum(g.beschluss)&&(s==='offen'||s==='angefordert')){ await bfStandSetzen(r.projektId,k.genKey,'da',g.beschluss,'Beschluss'); neu=true; }
    else if(wzdDatum(g.beantragt)&&s==='offen'){ await bfStandSetzen(r.projektId,k.genKey,'angefordert',g.beantragt,'Antrag'); neu=true; }
  }
  return neu;
}
function bfAbgleichBald(){
  clearTimeout(BF.timer); let r=BF.aktiv; if(!r) return;
  BF.timer=setTimeout(async()=>{ let neu=await bfAbgleich(r); if(neu&&WZ.aktiv==='befugnis'&&BF.aktiv===r){ if(bfTippt()) BF.zeichnen=true; else wzZeichnen(); } },350);
}
/* Eingabe läuft (Text- oder Datumsfeld): neu aufbauen erst, wenn das Feld verlassen wird — sonst verlöre es beim Tippen den Fokus */
function bfTippt(){ let a=document.activeElement; return !!a&&!!a.closest&&!!a.closest('#wz_body')&&(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&a.type!=='checkbox')); }
document.addEventListener('focusout',e=>{
  if(WZ.aktiv!=='befugnis'||!BF.zeichnen) return;
  let n=e.relatedTarget; if(n&&n.closest&&n.closest('#wz_body')&&/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)) return;
  setTimeout(()=>{ if(WZ.aktiv==='befugnis'&&BF.zeichnen&&!bfTippt()) wzZeichnen(); },0);
});

/* ---------- Anlegen, öffnen, ändern ---------- */
async function bfOeffnen(pid){
  await wzdLaden(); let o=wzdObjekt(pid); if(!o) return;
  if(BF.notar===null) await bfNotarLaden();
  let r=bfAkte(pid);
  if(!r){ r=bfLeer(o); if(!(await wzdSpeichern('akten',r))) return; }
  BF.aktiv=r; await bfAbgleich(r);
  if(WZ.aktiv==='befugnis') wzZeichnen(); let ov=$('wz_overlay'); if(ov) ov.scrollTop=0;
}
function bfZurueck(){ if(BF.aktiv){ wzdSpeichernSofort('akten',BF.aktiv); bfAbgleich(BF.aktiv); } BF.aktiv=null; wzZeichnen(); }
async function bfLoeschen(){
  let r=BF.aktiv; if(!r||!confirm('„Wer verkauft?“ für dieses Objekt löschen? Die Posten aus dieser Kachel verschwinden aus „Unterlagen“; die Bewertung bleibt unverändert.')) return;
  clearTimeout(BF.timer); if(typeof WZD_TIMER!=='undefined') clearTimeout(WZD_TIMER[r.id]);
  let weg=[...new Set((r.ulKeys||[]).concat(bfPruefung(r).posten.map(p=>p.key)))];
  if(weg.length&&typeof ulPostenErgaenzen==='function'&&wzdObjekt(r.projektId)&&wzdListe('unterlagen').some(x=>x.projektId===r.projektId)) await ulPostenErgaenzen(r.projektId,[],weg);
  bfWvEntfernen(r);
  if(await wzdLoeschen('akten',r.id)){ BF.aktiv=null; wzZeichnen(); }
}
function bfSpeichern(){
  let r=BF.aktiv; if(!r){ wzSpeichern(); return; }
  bfErbfallWv(r); wzdSpeichernBald('akten',r); bfAbgleichBald();
}
function bfAenderung(){ let r=BF.aktiv; if(!r) return; bfErbfallWv(r); wzdSpeichernSofort('akten',r); bfAbgleichBald(); if(WZ.aktiv==='befugnis') wzZeichnen(); }
function bfWaehlen(cb,kid){ if(kid){ cb(kid); return; } wzdKundeWaehlen(id=>cb(id)); }
function bfPersonNeu(kid){ bfWaehlen(id=>{ let r=BF.aktiv; if(!r) return; r.personen=(r.personen||[]).concat([bfPersonLeer({kundeId:id})]); bfAenderung(); },kid); }
function bfPersonKunde(i,kid){ bfWaehlen(id=>{ let p=BF.aktiv&&BF.aktiv.personen[i]; if(!p) return; p.kundeId=id; p.geloescht=false; bfAenderung(); },kid); }
function bfPersonWeg(i){
  let r=BF.aktiv, p=r&&r.personen[i]; if(!p) return;
  if(!confirm('„'+(wzdKundeName(p.kundeId)||'Person '+(i+1))+'“ mit allen Angaben zur Vertretung aus dieser Liste entfernen? Die Kundenakte bleibt.')) return;
  r.personen.splice(i,1); bfAenderung();
}
function bfVertreterNeu(i,kid){ bfWaehlen(id=>{ let p=BF.aktiv&&BF.aktiv.personen[i]; if(!p) return; p.vertreterIds=(p.vertreterIds||[]).filter(x=>x!==id).concat([id]); bfAenderung(); },kid); }
function bfVertreterWeg(i,j){ let p=BF.aktiv&&BF.aktiv.personen[i]; if(!p) return; p.vertreterIds.splice(j,1); bfAenderung(); }
function bfRolleKunde(feld,kid){ bfWaehlen(id=>{ let r=BF.aktiv; if(!r||!['tvId','npId'].includes(feld)) return; r[feld]=id; bfAenderung(); },kid); }
function bfRolleWeg(feld){ let r=BF.aktiv; if(!r||!['tvId','npId'].includes(feld)) return; r[feld]=''; bfAenderung(); }
async function bfStand(key,wert){
  let r=BF.aktiv; if(!r) return;
  if(!wzdListe('unterlagen').some(x=>x.projektId===r.projektId)) await bfAbgleich(r);
  await bfStandSetzen(r.projektId,key,wert,aufHeute(),'');
  if(WZ.aktiv==='befugnis') wzZeichnen();
}
function bfSchwelle(v){ bfS().schwelle=String(v||'').trim().slice(0,8); wzSpeichern(); if(WZ.aktiv==='befugnis') wzZeichnen(); }

/* ---------- Wiedervorlagen: Grundbuchberichtigung binnen zwei Jahren gebührenfrei, Mitteilung der Genehmigung ---------- */
function bfWvEntfernen(r){
  let id=r&&r.wv&&r.wv.id; if(!id) return;
  try{ let l=aufLoad(), a=l.find(x=>x.id===id); if(a&&!a.erledigt){ aufStore(l.filter(x=>x.id!==id)); aufBadge(); } }catch(e){}
}
function bfErbfallWv(r){
  let e=wzdDatum(r.erbfall), aktiv=!!e&&r.eigentuemer==='verstorben'&&r.erbenEingetragen!=='ja', alt=r.wv||{};
  if(alt.erbfall===e&&!!alt.aktiv===aktiv) return;
  bfWvEntfernen(r); r.wv={erbfall:e,aktiv,id:''};
  if(!aktiv) return;
  let frei=ImmoFristen.fristMonate(e,24), wv=ImmoFristen.fristMonate(e,21), heute=aufHeute(); if(frei<heute) return;
  let o=wzdObjekt(r.projektId), name=(o&&o.name)||r.objekt||'Objekt';
  let a=wzdWiedervorlage('Wer verkauft? '+name+': Grundbuch auf die Erben berichtigen — gebührenfrei, wenn der Antrag bis '+wzDatum(frei)+' beim Grundbuchamt eingeht (Nr. 14110 Anm. Abs. 1 KV GNotKG)',wv<heute?heute:wv,name,'');
  if(a) r.wv.id=a.id;
}
function bfKetteWv(bereich){
  let r=BF.aktiv; if(!r) return; let k=bfPruefung(r).ketten.find(x=>x.bereich===bereich&&x.mitteilungBis); if(!k) return;
  let heute=aufHeute(), am=ImmoFristen.plusTage(k.mitteilungBis,-14), o=wzdObjekt(r.projektId), name=(o&&o.name)||r.objekt||'Objekt';
  if(wzdWiedervorlage('Wer verkauft? '+name+': Genehmigung des '+k.gericht+'s'+(k.label?' ('+k.label+')':'')+' dem Käufer mitteilen — spätestens am '+wzDatum(k.mitteilungBis)+' (§ 1856 Abs. 2 BGB)',am<heute?heute:am,name,''))
    alert('Wiedervorlage zum '+wzDatum(am<heute?heute:am)+' angelegt.');
}

/* ---------- Ansicht ---------- */
function bfChip(stufe,t){ return '<span class="bf-chip bf-'+stufe+'">'+sEsc(t)+'</span>'; }
const BF_STUFE={rot:'rot',gelb:'gelb',gruen:'grün'};
function bfListe(){
  let objekte=wzdObjekte(false), alle=wzdObjekte(true), akten=wzdAkten('befugnis');
  const karte=o=>{ let r=akten.find(x=>x.projektId===o.id), pr=r?bfPruefung(r):null;
    return '<div class="kd-karte"><div><b>'+sEsc(o.name)+'</b><span>'+sEsc([o.status||'nicht in Vermarktung',pr?(pr.faelle.join(', ')||'Fall offen'):'noch nicht geprüft'].filter(Boolean).join(' · '))+'</span>'
      +(pr?'<div class="pa-chips">'+bfChip(pr.stufe,BF_STUFE[pr.stufe])+(pr.gesamt?bfChip('neutral',pr.da+' von '+pr.gesamt+' Nachweisen'):'')+'</div>':'')+'</div>'
      +'<div class="kd-k"><button class="secondary" onclick="bfOeffnen(\''+idSicher(o.id)+'\')">'+(r?'Öffnen':'Prüfen')+'</button></div></div>'; };
  let karten=objekte.map(karte).concat(akten.map(r=>alle.find(o=>o.id===r.projektId)).filter(o=>o&&!objekte.some(a=>a.id===o.id)).map(karte));
  let weitere=alle.filter(o=>!objekte.some(a=>a.id===o.id)&&!akten.some(r=>r.projektId===o.id));
  return (karten.length?'<div class="kd-karten">'+karten.join('')+'</div>':wzHinweis('Noch kein Objekt in Vermarktung. Den Stand „Auftrag erteilt“ oder „In Vermarktung“ setzt man in der Bewertung unter „Vermarktung“.'))
    +(weitere.length?'<div class="field" style="max-width:420px;margin-top:12px"><label for="bf_weitere">Andere gesicherte Bewertung</label><select id="bf_weitere" onchange="if(this.value)bfOeffnen(this.value)"><option value="">– wählen –</option>'
      +weitere.map(o=>'<option value="'+sEsc(o.id)+'">'+sEsc(o.name)+'</option>').join('')+'</select></div>':'')
    +wzBox('Vorgabe der Bank','<div class="grid">'+wzFeld('schwelle','Kaufpreis „deutlich unter Bewertung“ ab',{typ:'prozent',einheit:'%',hinweis:'Bei Testamentsvollstrecker und Vorerbe zeigt die App Gelb, wenn der Kaufpreis im Notarauftrag um so viel unter dem Wert der gesicherten Bewertung liegt. Die Schwelle legt die Bank fest.'})+'</div>')
    +wzHinweis('Je Verkauf: Wer darf verfügen, welche Nachweise und Genehmigungen braucht es? Die Posten stehen auch in der Kachel „Unterlagen“. Personen kommen aus der Kundenakte; keine Kopien von Urkunden, keine Geburtsdaten, keine Angaben zu Krankheit oder Gründen einer Betreuung.');
}
function bfStandSelect(pid,key,label){
  let s=bfPostenStand(pid,key);
  return '<select class="bf-stand" aria-label="Stand: '+sEsc(label)+'" onchange="bfStand(\''+key+'\',this.value)">'+Object.entries(BFR().STAND_TEXT).map(([w,t])=>'<option value="'+w+'"'+(s.stand===w?' selected':'')+'>'+t+'</option>').join('')+'</select>';
}
function bfKundeZeile(id,knopf,weg){
  return '<div class="vl-empf bf-rolle"><b>'+(id?sEsc(wzdKundeName(id)):'<span class="u">nicht erfasst</span>')+'</b>'+knopf+(id&&weg?weg:'')+'</div>';
}
function bfKetteHtml(r,pfad,k,wen){
  if(!k) return '';
  return '<h4 class="pa-unter">Genehmigung des '+sEsc(k.gericht)+'s</h4><div class="grid">'
    +wzFeld(pfad+'.beantragt','beantragt am',{typ:'datum',zeichnen:true})+wzFeld(pfad+'.beschluss','Beschluss vom',{typ:'datum',zeichnen:true})
    +wzFeld(pfad+'.bekanntgabe','letzte schriftliche Bekanntgabe am',{typ:'datum',zeichnen:true,hinweis:wen?'auch an '+wen+' (§ 41 Abs. 3 FamFG)':'§ 63 Abs. 3 FamFG'})
    +'<div class="field"><label>Rechtskraftzeugnis</label>'+bfStandSelect(r.projektId,k.rkKey,'Rechtskraftzeugnis')+'</div>'
    +wzFeld(pfad+'.mitgeteilt','dem Käufer mitgeteilt am',{typ:'datum',zeichnen:true,hinweis:'§ 1856 Abs. 1 Satz 2 BGB'})
    +wzFeld(pfad+'.aufforderung','Käufer hat zur Mitteilung aufgefordert am',{typ:'datum',zeichnen:true,hinweis:'§ 1856 Abs. 2 BGB'})+'</div>'
    +'<div class="bf-kfrist" data-bfk="'+sEsc(k.bereich)+'"></div>';
}
/* Fristen der Kette: nach jeder Eingabe neu (Datumsfelder bauen die Ansicht nicht neu auf) */
function bfKetteFristen(k){
  if(!k) return '';
  return (k.rkAb?'<p class="bf-frist">Frühestens rechtskräftig nach Ablauf des <b>'+wzDatum(k.rkAb)+'</b> (letzte Bekanntgabe + 2 Wochen)</p>':'')
    +(k.mitteilungBis?'<p class="bf-frist">Mitteilung an den Käufer spätestens am <b>'+wzDatum(k.mitteilungBis)+'</b>'
      +(wzdDatum(k.g.mitgeteilt)?'':' <button type="button" class="secondary" onclick="bfKetteWv(\''+k.bereich+'\')" data-ic="clock">Wiedervorlage</button>')+'</p>':'');
}
function bfPersonHtml(r,p,i,pr,K){
  let R=BFR(), pfad='personen.'+i+'.', v=p.vertretung||'selbst', fa=pr.fa, name=p.kundeId?wzdKundeName(p.kundeId):'';
  let titel=pr.rolle+((r.personen||[]).length>1?' '+(i+1):''), kette=pr.ketten.find(k=>k.bereich==='p:'+p.id);
  let e=R.ehe(p,K), verh=['verheiratet','verpartnert'].includes(p.familienstand||e.fam);
  let h='<div class="no-person bf-person"><div class="no-person-kopf"><b>'+sEsc(titel)+(name?': '+sEsc(name):'')+'</b>'
    +'<button type="button" class="weg" aria-label="'+sEsc(titel)+' entfernen" onclick="bfPersonWeg('+i+')">✕</button></div>'
    +(p.kundeId?'':'<div class="gr-zeile"><button type="button" class="secondary" onclick="bfPersonKunde('+i+')" data-ic="users">'+(p.geloescht?'(Kunde gelöscht) — neu wählen':'Aus der Kundenakte')+'</button></div>')
    +'<div class="grid">'+wzFeld(pfad+'vertretung','Vertretung',{typ:'wahl',optionen:R.VERTRETUNG,zeichnen:true})
    +(fa.erbengemeinschaft&&!fa.tv?wzFeld(pfad+'einverstanden','Mit dem Verkauf einverstanden',{typ:'wahl',optionen:R.EINVERSTANDEN,zeichnen:true}):'')+'</div>';
  if(v!=='selbst') h+='<div class="bf-vertreter"><span class="u">Vertreten durch</span>'+(p.vertreterIds||[]).map((id,j)=>'<span class="bf-name">'+sEsc(wzdKundeName(id))
      +'<button type="button" class="weg" aria-label="Vertreter entfernen" onclick="bfVertreterWeg('+i+','+j+')">✕</button></span>').join('')
    +'<button type="button" class="secondary" onclick="bfVertreterNeu('+i+')" data-ic="users">'+(v==='eltern'?'Elternteil':'Vertreter')+' aus der Kundenakte</button></div>';
  if(v==='bevollmaechtigt') h+='<div class="grid">'+wzFeld(pfad+'vmForm','Form der Vollmacht',{typ:'wahl',optionen:R.VM_FORM,zeichnen:true})
    +wzFeld(pfad+'vmUmfasst','umfasst den Grundstücksverkauf',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true})
    +wzFeld(pfad+'vmGeberLebt','Vollmachtgeber lebt',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true})
    +(p.vmGeberLebt==='nein'?wzFeld(pfad+'vmUeberTod','Vollmacht gilt laut Text über den Tod hinaus',{typ:'check',zeichnen:true}):'')
    +wzFeld(pfad+'vmUntersagt','Gericht hat die Ausübung untersagt (§ 1820 Abs. 4 BGB)',{typ:'check',zeichnen:true})
    +wzFeld(pfad+'vmSelbstkauf','Bevollmächtigter kauft selbst',{typ:'check',zeichnen:true})
    +(p.vmSelbstkauf?wzFeld(pfad+'vm181','Befreiung von § 181 BGB in der Vollmacht',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true}):'')+'</div>';
  if(v==='betreuer') h+='<div class="grid">'+'<div class="field"><label>Bestellungsurkunde</label>'+bfStandSelect(r.projektId,'bf_'+p.id+'_bestellung','Bestellungsurkunde')+'</div>'
    +wzFeld(pfad+'aufgabenkreis','Aufgabenkreis umfasst Vermögenssorge oder Grundstücke',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true})
    +wzFeld(pfad+'vorlaeufigBis','vorläufige Betreuung bis',{typ:'datum',zeichnen:true,hinweis:'nur bei vorläufiger Betreuung (§ 290 Abs. 1 Nr. 5 FamFG)'})
    +wzFeld(pfad+'wohnt','Betreute Person wohnt im Objekt',{typ:'check',zeichnen:true})
    +(p.wohnt?wzFeld(pfad+'anzeigeAm','Anzeige an das Betreuungsgericht erfolgt am',{typ:'datum',zeichnen:true,hinweis:'§ 1833 Abs. 2 BGB'}):'')
    +wzFeld(pfad+'kaeuferNahe','Käufer ist Ehegatte oder Verwandter in gerader Linie des Betreuers',{typ:'check',zeichnen:true,voll:true})+'</div>'
    +wzHinweis('Keine Angaben zu Krankheit oder Gründen der Betreuung (Art. 9 Abs. 1 DSGVO).')+bfKetteHtml(r,pfad+'gen',kette,'die betreute Person');
  if(v==='eltern') h+='<div class="grid">'+wzFeld(pfad+'sorge','Vertretung durch',{typ:'wahl',optionen:R.SORGE,zeichnen:true})
    +wzFeld(pfad+'volljaehrig','Wird vor dem Vollzug volljährig',{typ:'check',zeichnen:true,hinweis:'kein Geburtsdatum in der App'})
    +wzFeld(pfad+'kaeuferNahe','Käufer ist Ehegatte oder Verwandter in gerader Linie eines Elternteils',{typ:'check',zeichnen:true,voll:true})+'</div>'
    +(p.volljaehrig?'':bfKetteHtml(r,pfad+'gen',kette,'das Kind'));
  if(v==='pfleger') h+='<div class="grid"><div class="field"><label>Bestellung des Ergänzungspflegers</label>'+bfStandSelect(r.projektId,'bf_'+p.id+'_bestellung','Bestellung')+'</div></div>'+bfKetteHtml(r,pfad+'gen',kette,'das Kind');
  if(v!=='eltern'){
    h+='<div class="grid">'+wzFeld(pfad+'familienstand','Familienstand',{typ:'wahl',optionen:R.FAMILIE,zeichnen:true,hinweis:e.ausNotar?'im Notarauftrag: '+sEsc(BFR().text(R.FAMILIE,e.fam)):''})
      +(verh?wzFeld(pfad+'gueterstand','Güterstand',{typ:'wahl',optionen:R.GUETER,zeichnen:true,hinweis:!p.gueterstand&&e.gs?'im Notarauftrag: '+sEsc(BFR().text(R.GUETER,e.gs)):''}):'')
      +(verh&&(p.gueterstand||e.gs)==='zugewinn'?wzFeld(pfad+'ganzesVermoegen','Objekt ist im Wesentlichen das ganze Vermögen',{typ:'check',zeichnen:true}):'')
      +(verh&&['zugewinn','gemeinschaft'].includes(p.gueterstand||e.gs)?wzFeld(pfad+'ehAufforderung','Aufforderung des Käufers zur Genehmigung empfangen am',{typ:'datum',zeichnen:true,hinweis:'§ 1366 Abs. 3 BGB: zwei Wochen'}):'')+'</div>';
  }
  return h+'<div class="bf-pr" data-bf="p:'+sEsc(p.id)+'"></div></div>';
}
function bfEditor(r){
  let R=BFR(), pr=bfPruefung(r), K=bfKontext(r), o=K.objekt, fa=pr.fa, n=K.notar;
  let kopf='<div class="ub-kopfzeile"><button type="button" class="secondary" onclick="bfZurueck()" data-ic="arrow-left">Alle Objekte</button>'
    +'<span class="ub-status">'+sEsc(o?o.name:r.objekt||'Objekt')+'</span>'
    +'<button type="button" class="secondary" onclick="wzDokument()" data-ic="file-text">Für das Notariat</button>'
    +'<button type="button" class="secondary" onclick="bfLoeschen()" data-ic="trash">Löschen</button></div>';
  let kpis='<div class="wz-kpis grid">'+wzdKpi('Fall',sEsc(pr.faelle.join(', ')||'noch offen'),'')
    +wzdKpi('Nachweise',pr.da+' von '+pr.gesamt,pr.gesamt?'liegen vor':'keine nötig')
    +wzdKpi('Beurkundung',K.termin?wzDatum(K.termin):'–',n?'aus dem Notarauftrag':'kein Notarauftrag zum Objekt')+'</div>';
  let fragen=wzBox('Einstiegsfragen','<div class="grid">'
      +wzFeld('eigentuemer','1. Lebt der im Grundbuch (Abt. I) eingetragene Eigentümer?',{typ:'wahl',optionen:R.EIGENTUEMER,zeichnen:true})
      +(fa.verstorben?wzFeld('erben','2. Wer hat geerbt?',{typ:'wahl',optionen:R.ERBEN,zeichnen:true}):'')
      +wzFeld('tv','3. Testamentsvollstreckung angeordnet?',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true,hinweis:'Erbschein, Testament oder Grundbuch Abt. II (§ 52 GBO)'})
      +wzFeld('nacherbfolge','4. Vor- und Nacherbfolge angeordnet?',{typ:'wahl',optionen:R.JA_NEIN,zeichnen:true,hinweis:'Nacherbenvermerk in Abt. II (§ 51 GBO) oder Erbschein'})+'</div>'
    +wzHinweis('5. Vertretung und 6. Güterstand je Person unten. Ist der Eigentümer verstorben, zeigt der Erbschein Nacherbfolge und Testamentsvollstrecker (§ 352b FamFG).')
    +(K.abt2?'<p class="bf-frist">Grundbuch Abt. II laut Bewertung oder Notarauftrag: '+sEsc(K.abt2)+'</p>':'')
    +'<div class="bf-pr" data-bf="einstieg"></div>');
  let personen='';
  if(fa.lebt||(fa.verstorben&&!fa.nachlasspfleger)){
    let titel=fa.lebt?'Eigentümer laut Grundbuch (Abt. I)':fa.erbengemeinschaft?'Miterben':'Erbe';
    personen=wzBox(titel,(r.personen||[]).map((p,i)=>bfPersonHtml(r,p,i,pr,K)).join('')
      +'<button type="button" class="plus" onclick="bfPersonNeu()">＋ '+(fa.lebt?'Eigentümer':fa.erbengemeinschaft?'Miterbe':'Erbe')+' aus der Kundenakte</button>'
      +(fa.erbengemeinschaft&&!fa.tv?'<div class="grid">'+wzFeld('anzahlErben','Zahl der Erben laut Nachweis',{typ:'zahl',zeichnen:true})+'</div>':'')
      +'<div class="bf-pr" data-bf="personen"></div>'
      +wzHinweis('Das gesetzliche Vertretungsrecht unter Ehegatten gilt nur für die Gesundheitssorge, nicht für den Verkauf (§ 1358 BGB).'));
  }
  let erbe=fa.erbe?wzBox('Nachweis der Erbfolge','<div class="grid">'+wzFeld('nachweis','Nachweis',{typ:'wahl',optionen:R.NACHWEIS,zeichnen:true,voll:true})
      +(r.nachweis==='enz'?wzFeld('enzBis','Abschrift gültig bis',{typ:'datum',zeichnen:true,hinweis:'Pflichtfeld (Art. 70 Abs. 3 EuErbVO)'}):'')
      +(r.nachweis==='erbschein'&&(bfPostenStand(r.projektId,'bf_erbschein').stand==='da'||r.erbscheinNE||r.erbscheinTV)
        ?wzFeld('erbscheinNE','Erbschein nennt Nacherbfolge',{typ:'check',zeichnen:true})+wzFeld('erbscheinTV','Erbschein nennt Testamentsvollstrecker',{typ:'check',zeichnen:true}):'')
      +wzFeld('erbenEingetragen','Erben im Grundbuch eingetragen',{typ:'wahl',optionen:R.EINGETRAGEN,zeichnen:true})
      +wzFeld('erbfall','Erbfall am',{typ:'datum',zeichnen:true,hinweis:'nur das Datum — für die gebührenfreie Berichtigung'})+'</div>'
      +'<div class="bf-kfrist" data-bfk="erbfall"></div>'
      +'<div class="bf-pr" data-bf="erbe"></div>'):'';
  let tv=fa.tv?wzBox('Testamentsvollstrecker',bfKundeZeile(r.tvId,'<button type="button" class="secondary" onclick="bfRolleKunde(\'tvId\')" data-ic="users">'+(r.tvId?'Ändern':'Aus der Kundenakte')+'</button>',
        '<button type="button" class="weg" aria-label="Testamentsvollstrecker entfernen" onclick="bfRolleWeg(\'tvId\')">✕</button>')
      +'<div class="grid">'+wzFeld('tvNachweis','Nachweis',{typ:'wahl',optionen:R.TV_NACHWEIS,zeichnen:true,voll:true})
      +(r.tvNachweis==='enz'?wzFeld('tvEnzBis','Abschrift gültig bis',{typ:'datum',zeichnen:true,hinweis:'Pflichtfeld (Art. 70 Abs. 3 EuErbVO)'}):'')
      +wzFeld('tvGeprueft','Nachweis zuletzt geprüft am',{typ:'datum',zeichnen:true,hinweis:'spätestens 30 Tage vor der Beurkundung'})+'</div>'
      +'<div class="bf-pr" data-bf="tv"></div>'):'';
  let vorerbe=fa.vorerbe?wzBox('Vor- und Nacherbfolge','<div class="grid">'+wzFeld('vorerbeWeg','Nacherben berücksichtigt durch',{typ:'wahl',optionen:R.VORERBE_WEG,zeichnen:true,voll:true})
      +wzFeld('nacherbenUnbekannt','Nacherben unbekannt, noch nicht geboren oder minderjährig',{typ:'check',zeichnen:true,voll:true})+'</div>'
      +'<div class="bf-pr" data-bf="vorerbe"></div>'):'';
  let np=fa.nachlasspfleger?wzBox('Nachlasspfleger',bfKundeZeile(r.npId,'<button type="button" class="secondary" onclick="bfRolleKunde(\'npId\')" data-ic="users">'+(r.npId?'Ändern':'Aus der Kundenakte')+'</button>',
        '<button type="button" class="weg" aria-label="Nachlasspfleger entfernen" onclick="bfRolleWeg(\'npId\')">✕</button>')
      +'<div class="grid"><div class="field"><label>Bestellung (Nachweis)</label>'+bfStandSelect(r.projektId,'bf_np_bestellung','Bestellung des Nachlasspflegers')+'</div></div>'
      +bfKetteHtml(r,'npGen',pr.ketten.find(k=>k.bereich==='np'),'')+'<div class="bf-pr" data-bf="np"></div>'):'';
  let preis=(fa.tv||fa.vorerbe)?wzBox('Kaufpreis und Bewertung','<div class="wz-kpis grid">'+wzdKpi('Kaufpreis',K.kaufpreis>0?wzEur(K.kaufpreis):'–','aus dem Notarauftrag')
      +wzdKpi('Wert der Bewertung',K.wert>0?wzEur(K.wert):'–','gesicherte Bewertung')+'</div>'
      +'<div class="field" style="max-width:320px"><label for="bf_schwelle">Schwelle „deutlich unter Bewertung“ <span class="u">%</span></label><input id="bf_schwelle" inputmode="decimal" value="'+sEsc(bfS().schwelle||'')+'" placeholder="Vorgabe der Bank" onchange="bfSchwelle(this.value)"></div>'
      +'<div class="bf-pr" data-bf="preis"></div>'):'';
  let posten=wzBox('Nachweise und Genehmigungen','<p class="hint" style="margin-top:0">Stehen auch in der Kachel „Unterlagen“ — der Stand ist dort und hier derselbe.</p>'
      +(pr.posten.length?pr.posten.map(p=>{ let s=bfPostenStand(r.projektId,p.key);
        return '<div class="ul-posten ul-'+sEsc(s.stand||'offen')+'"><div class="ul-name"><b>'+sEsc(p.name)+'</b><small>'+sEsc([p.fuer,p.hinweis].filter(Boolean).join(' · '))+'</small></div>'
          +bfStandSelect(r.projektId,p.key,p.name)+'<span class="ul-datum">'+(s.datum?wzDatum(s.datum):'')+'</span><span class="ul-datum">'+sEsc(typeof ulStellenName==='function'?ulStellenName(p.stelle):p.stelle)+'</span></div>'; }).join('')
        :wzHinweis('Für diesen Fall sind keine weiteren Nachweise nötig.'))
      +'<div class="gr-zeile"><button type="button" class="secondary" onclick="bfZuUnterlagen()" data-ic="folder-open">In „Unterlagen“ öffnen</button></div>');
  return kopf+'<div id="bf_gesamt"></div>'+kpis+fragen+personen+erbe+tv+vorerbe+np+preis+posten
    +'<div class="bf-pr" data-bf="gesamt"></div>'
    +wzBox('Notiz',wzFeld('notiz','Notiz',{typ:'lang',zeilen:2,voll:true,ph:'z. B. Rückfrage beim Notariat zur Finanzierungsgrundschuld',hinweis:'Keine Angaben zu Krankheit oder Gründen einer Betreuung.'}))
    +wzHinweis('Die App zeigt nur Prüfpunkte mit Normangabe. Zustimmungen, Vollmachten und Anträge kommen vom Notariat oder aus den Vordrucken der Bank. Keine Kopien von Testament, Erbschein, Bestellungsurkunde oder Vollmacht, keine Geburtsdaten, keine Angaben zu Krankheit.');
}
async function bfZuUnterlagen(){ let r=BF.aktiv; if(!r) return; await bfAbgleich(r); let pid=r.projektId; wzOeffnen('unterlagen'); if(typeof ulOeffnen==='function') await ulOeffnen(pid); }
function bfZeichnen(){
  BF.zeichnen=false;
  if(!window.ImmoBefugnisRegeln) return wzHinweis('Die Prüfregeln (js/befugnis-regeln.js) sind nicht geladen.');
  if(!wzdBereit()){ wzdLaden().then(()=>{ if(WZ.aktiv==='befugnis') wzZeichnen(); }); return '<p class="hint">Wird geladen …</p>'; }
  if(BF.notar===null&&!BF.notarLaedt){ bfNotarLaden().then(()=>{ if(WZ.aktiv==='befugnis') wzZeichnen(); }); }
  if(BF.aktiv&&!wzdObjekt(BF.aktiv.projektId)) BF.aktiv=null;
  return BF.aktiv?bfEditor(BF.aktiv):bfListe();
}
/* nach jeder Eingabe: Ampeln neu, ohne die Felder neu aufzubauen */
function bfRechnen(){
  iconify($('wz_body')); let r=BF.aktiv; if(!r) return;
  let pr=bfPruefung(r), stufe=s=>s==='grau'?'grau':s;
  wzH('bf_gesamt',wzAmpel(pr.stufe,'<b>'+(pr.stufe==='rot'?'Rot':pr.stufe==='gelb'?'Gelb':'Grün')+':</b> '+sEsc(pr.text)));
  document.querySelectorAll('#wz_body .bf-pr').forEach(el=>{ let b=el.dataset.bf;
    el.innerHTML=pr.punkte.filter(x=>x.bereich===b).sort((a,c)=>bfRang(a.stufe)-bfRang(c.stufe)).map(x=>wzAmpel(stufe(x.stufe),sEsc(x.text))).join(''); });
  document.querySelectorAll('#wz_body .bf-kfrist').forEach(el=>{ let b=el.dataset.bfk;
    if(b==='erbfall') el.innerHTML=pr.fristen.gebuehrenfreiBis&&r.erbenEingetragen!=='ja'?'<p class="bf-frist">Gebührenfrei bis <b>'+wzDatum(pr.fristen.gebuehrenfreiBis)+'</b>'
      +(r.wv&&r.wv.id?' · Wiedervorlage am '+wzDatum(pr.fristen.wvErbfall<aufHeute()?aufHeute():pr.fristen.wvErbfall)+' angelegt':'')+'</p>':'';
    else el.innerHTML=bfKetteFristen(pr.ketten.find(k=>k.bereich===b));
    iconify(el); });
}
function bfRang(s){ let x={rot:0,gelb:1,gruen:2,grau:3}[s]; return x==null?4:x; }

/* ---------- Dokument: Verkäuferseite für das Notariat (Vertretene und Vertreter getrennt) ---------- */
function bfDokument(){
  let r=BF.aktiv; if(!r){ alert('Bitte zuerst ein Objekt öffnen.'); return null; }
  let R=BFR(), K=bfKontext(r), pr=R.pruefen(r,K), o=K.objekt, f=(o&&o.f)||{}, name=(o&&o.name)||r.objekt||'Objekt';
  const nm=id=>id?sEsc(wzdKundeName(id)):'–', vt=v=>sEsc(R.text(R.VERTRETUNG,v||'selbst'));
  let gb=[f.od_grundbuch?'Grundbuch von '+f.od_grundbuch:'',f.od_gb_blatt?'Blatt '+f.od_gb_blatt:''].filter(Boolean).join(', ');
  let ein=pr.fa.erbengemeinschaft&&!pr.fa.tv, kopf=['Beteiligter','Name','Vertretung','Vertreten durch'].concat(ein?['Einverstanden']:[]);
  let pers=(pr.fa.nachlasspfleger?[]:(r.personen||[])).map((p,i)=>[sEsc(pr.rolle+((r.personen||[]).length>1?' '+(i+1):'')),nm(p.kundeId),
    (p.vertretung||'selbst')==='selbst'?'handelt selbst':vt(p.vertretung),(p.vertreterIds||[]).map(nm).join(', ')||'–'].concat(ein?[sEsc(p.einverstanden||'offen')]:[]));
  if(pr.fa.tv) pers.push(['Testamentsvollstrecker',nm(r.tvId),'verfügt über den Nachlass (§ 2205, § 2211 BGB)','–']);
  if(pr.fa.nachlasspfleger) pers.push(['Nachlasspfleger',nm(r.npId),'für die unbekannten Erben (§ 1960 BGB)','–']);
  const st=k=>{ let s=bfPostenStand(r.projektId,k); return R.STAND_TEXT[s.stand||'offen']+(s.datum?' '+wzDatum(s.datum):''); };
  let ketten=pr.ketten.map(k=>'<h3>Genehmigung des '+sEsc(k.gericht)+'s'+(k.label?' — '+sEsc(k.label):'')+'</h3>'+wzDokTabelle([
    ['beantragt am',wzdDatum(k.g.beantragt)?wzDatum(k.g.beantragt):'–'],['Beschluss vom',wzdDatum(k.g.beschluss)?wzDatum(k.g.beschluss):'–'],
    ['letzte schriftliche Bekanntgabe am',wzdDatum(k.g.bekanntgabe)?wzDatum(k.g.bekanntgabe):'–'],['frühestens rechtskräftig nach Ablauf des',k.rkAb?wzDatum(k.rkAb):'–'],
    ['Rechtskraftzeugnis',st(k.rkKey)],['dem Käufer mitgeteilt am',wzdDatum(k.g.mitgeteilt)?wzDatum(k.g.mitgeteilt):'–'],
    k.mitteilungBis?['Mitteilung spätestens am',wzDatum(k.mitteilungBis)]:null])).join('');
  let offen=pr.punkte.filter(x=>x.stufe==='rot'||x.stufe==='gelb').sort((a,c)=>bfRang(a.stufe)-bfRang(c.stufe));
  return {titel:'Wer verkauft '+name,pflicht:true,fuss:'Angaben zur Verkäuferseite für das Notariat.',
    html:'<h1>Verkäuferseite</h1><p class="wzd-unter">Wer verkauft? · '+sEsc(name)+' · Stand '+new Date().toLocaleDateString('de-DE')+'</p>'
      +wzDokTabelle([['Objekt',sEsc((o&&o.anschrift)||name)],gb?['Grundbuch',sEsc(gb)]:null,K.termin?['Beurkundungstermin',wzDatum(K.termin)]:null,
        ['Ampel',pr.stufe==='rot'?'Rot':pr.stufe==='gelb'?'Gelb':'Grün']])
      +'<p><b>Fall:</b> '+sEsc(pr.faelle.join(', ')||'noch offen')+'</p><p>'+sEsc(pr.text)+'</p>'
      +'<h2>Vertretene und Vertreter</h2>'+(pers.length?wzDokTabelle(pers.map(z=>z.concat(ein&&z.length<5?['–']:[])),kopf):'<p>Noch niemand erfasst.</p>')
      +'<h2>Nachweise und Genehmigungen</h2>'+(pr.posten.length?wzDokTabelle(pr.posten.map(p=>[sEsc(p.name),sEsc(typeof ulStellenName==='function'?ulStellenName(p.stelle):p.stelle),st(p.key)]),['Unterlage','Stelle','Stand']):'<p>Keine weiteren Nachweise nötig.</p>')
      +ketten
      +(offen.length?'<h2>Offene Punkte</h2><ul>'+offen.map(x=>'<li>'+sEsc(x.text)+'</li>').join('')+'</ul>':'')
      +'<p class="wzd-klein">Prüfliste zur Vorbereitung; maßgeblich ist die Prüfung durch das Notariat. Erklärungen, Vollmachten und Anträge kommen vom Notariat oder aus den Vordrucken der Bank. Ohne Angaben zu Gesundheit und ohne Geburtsdaten.</p>'};
}

/* ---------- Verkaufsfahrplan: Schritt „befugnis“ (sobald der Fahrplan ihn führt) ---------- */
if(typeof FP_AUTO_HOOKS!=='undefined') FP_AUTO_HOOKS.push(o=>{ let a=bfAmpel(o.id); return {befugnis:!!a&&a.stufe==='gruen'}; });

/* ---------- Kundenakte: Löschen und Auskunft ---------- */
function bfKundeIds(r){ let s=new Set(); (r.personen||[]).forEach(p=>{ if(p.kundeId) s.add(p.kundeId); (p.vertreterIds||[]).forEach(v=>{ if(v) s.add(v); }); });
  if(r.tvId) s.add(r.tvId); if(r.npId) s.add(r.npId); return [...s]; }
KD_LOESCH_HOOKS.push(async id=>{
  await wzdLaden();
  for(const r of wzdAkten('befugnis').filter(x=>bfKundeIds(x).includes(id))){
    r.personen=(r.personen||[]).map(p=>p.kundeId===id?bfPersonLeer({id:p.id,geloescht:true}):Object.assign(p,{vertreterIds:(p.vertreterIds||[]).filter(v=>v!==id)}));
    if(r.tvId===id) r.tvId=''; if(r.npId===id) r.npId='';
    await wzdSpeichern('akten',r);
    if(BF.aktiv&&BF.aktiv.id===r.id) BF.aktiv=r;
  }
});
KD_AUSKUNFT_HOOKS.push(async id=>{
  await wzdLaden();
  let R=window.ImmoBefugnisRegeln, z=[];
  const d=x=>wzdDatum(x)?wzDatum(x):'';
  const kette=g=>{ g=g||{}; let t=[['beantragt',g.beantragt],['Beschluss',g.beschluss],['Bekanntgabe',g.bekanntgabe],['dem Käufer mitgeteilt',g.mitgeteilt],['Aufforderung des Käufers',g.aufforderung]]
    .filter(x=>d(x[1])).map(x=>x[0]+' '+d(x[1])); return t.length?'; Genehmigung: '+t.join(', '):''; };
  wzdAkten('befugnis').filter(r=>bfKundeIds(r).includes(id)).forEach(r=>{
    let obj=wzdObjektName(r.projektId,r.objekt||'Objekt'), fa=R?R.faelle(r,{}):{}, rolle=R?R.rolle(fa):'Verkäufer';
    (r.personen||[]).forEach((p,i)=>{ let v=R?R.text(R.VERTRETUNG,p.vertretung||'selbst'):p.vertretung;
      if(p.kundeId===id) z.push('- '+obj+': '+rolle+((r.personen||[]).length>1?' '+(i+1):'')+', '+v
        +(fa.erbengemeinschaft?', mit dem Verkauf einverstanden: '+(p.einverstanden||'offen'):'')
        +(p.familienstand?', Familienstand: '+(R?R.text(R.FAMILIE,p.familienstand):p.familienstand):'')+(p.gueterstand?', Güterstand: '+(R?R.text(R.GUETER,p.gueterstand):p.gueterstand):'')
        +(p.vertretung==='bevollmaechtigt'&&p.vmForm?', Vollmacht '+(R?R.text(R.VM_FORM,p.vmForm):p.vmForm):'')
        +(p.vertretung==='betreuer'&&d(p.vorlaeufigBis)?', vorläufig bis '+d(p.vorlaeufigBis):'')+(p.wohnt?', wohnt im Objekt'+(d(p.anzeigeAm)?' (Anzeige '+d(p.anzeigeAm)+')':''):'')
        +kette(p.gen)+'; gespeichert: Rolle, Vertretung, Stand und Daten der Nachweise und Genehmigungen');
      if((p.vertreterIds||[]).includes(id)) z.push('- '+obj+': Vertreter ('+v+') für '+rolle+((r.personen||[]).length>1?' '+(i+1):''));
    });
    if(r.tvId===id) z.push('- '+obj+': Testamentsvollstrecker'+(r.tvNachweis&&R?', Nachweis: '+R.text(R.TV_NACHWEIS,r.tvNachweis):'')+(d(r.tvGeprueft)?', zuletzt geprüft '+d(r.tvGeprueft):''));
    if(r.npId===id) z.push('- '+obj+': Nachlasspfleger'+kette(r.npGen));
    if(String(r.notiz||'').trim()) z.push('  Notiz zum Objekt: '+String(r.notiz).trim());
  });
  return ['','WER VERKAUFT? (VERFÜGUNGSBEFUGNIS)'].concat(z.length?z:['- keine']);
});

wzRegistrieren({id:'befugnis',titel:'Wer verkauft?',sub:'Erben, Vertreter, Ehegatte — Nachweise und Genehmigungen je Verkauf',icon:'users',ohneNeu:true,
  zustand:()=>BF.aktiv||bfS(),speichern:bfSpeichern,zeichnen:bfZeichnen,rechnen:bfRechnen,dokument:bfDokument,
  schliessen:()=>{ if(BF.aktiv){ wzdSpeichernSofort('akten',BF.aktiv); bfAbgleich(BF.aktiv); } BF.aktiv=null; BF.notar=null; clearTimeout(BF.timer); }});
