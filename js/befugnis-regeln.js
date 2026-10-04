/* ImmoApp — Prüfregeln der Kachel „Wer verkauft?“ (Verfügungsbefugnis), ohne Seitenbezug, in Node testbar
   Aus einem Datensatz je Verkauf (Einstiegsfragen, Verkäufer mit Vertretung, Nachweise, Genehmigungsketten) ergeben sich die
   Fälle, die Prüfpunkte als Ampel und die Posten für die Kachel „Unterlagen“. Alle Rechtsaussagen stammen aus der Rechtsprüfung
   vom 03.10.2026 (Wortlaut gelesen auf gesetze-im-internet.de, EuErbVO über publications.europa.eu):
   - Erben: § 2032, § 2033, § 2034, § 2040 Abs. 1, § 2042 Abs. 1, § 753 Abs. 1, § 2353, § 2366 BGB; § 35, § 39, § 40 GBO;
     § 348, § 352b FamFG; Art. 70 Abs. 3 EuErbVO; Nr. 14110 Anm. Abs. 1 KV GNotKG; § 180 ZVG
   - Testamentsvollstrecker: § 2202, § 2205, § 2211, § 2368 BGB; § 35 Abs. 2, § 52 GBO
   - Vor- und Nacherbe: § 2113, § 2120, § 2136, § 1882 BGB; § 51 GBO
   - Betreuer, Eltern, Nachlasspfleger: § 1823, § 1824, § 1833, § 1850, § 1855, § 1856, § 1629, § 1643, § 1644, § 1809, § 1817,
     § 1960, § 1962, § 1888 BGB; § 40 Abs. 2, § 41 Abs. 3, § 45, § 46 Abs. 2, § 63, § 290 FamFG
   - Bevollmächtigter: § 167, § 168, § 172, § 181, § 672, § 1820 Abs. 4 BGB; § 29 GBO; § 7 BtOG
   - Ehegatte: § 1358, § 1365, § 1366, § 1424 BGB; § 6 LPartG
   Fristen nach §§ 187, 188 BGB über js/fristen.js (ImmoFristen). Endet eine Frist an einem Samstag, Sonntag oder Feiertag (BW),
   tritt der nächste Werktag an seine Stelle: Mitteilung (§ 1856 Abs. 2 BGB) und Genehmigung des Ehegatten (§ 1366 Abs. 3 BGB)
   nach § 193 BGB, Beschwerdefrist (§ 63 FamFG) nach § 16 Abs. 2 FamFG, § 222 Abs. 2 ZPO (Wortlaut geprüft am 04.10.2026).
   Daten als ISO-Text (JJJJ-MM-TT). Keine Gesundheitsangaben,
   keine Geburtsdaten: Die Regeln fragen nur Rolle, Stand und Datum ab. Unklares steht als Hinweis „mit dem Notariat klären“. */
(function(wurzel){
'use strict';
const F=typeof module==='object'&&module.exports?require('./fristen.js'):wurzel.ImmoFristen;

const EIGENTUEMER=[['','– bitte wählen –'],['lebt','ja, er lebt'],['verstorben','nein, er ist verstorben']];
const ERBEN=[['','– bitte wählen –'],['einer','ein Erbe (Alleinerbe)'],['mehrere','mehrere Erben (Erbengemeinschaft)'],['unbekannt','Erben unbekannt (Nachlasspfleger)']];
const JA_NEIN=[['','– bitte wählen –'],['nein','nein'],['ja','ja']];
const VERTRETUNG=[['selbst','handelt selbst'],['bevollmaechtigt','vertreten durch Bevollmächtigten'],['betreuer','vertreten durch Betreuer'],
  ['eltern','minderjährig, vertreten durch die Eltern'],['pfleger','vertreten durch Ergänzungspfleger']];
const EINVERSTANDEN=[['offen','offen'],['ja','ja'],['nein','nein']];
const NACHWEIS=[['','– bitte wählen –'],['erbschein','a) Erbschein'],['enz','b) Europäisches Nachlasszeugnis'],
  ['notariell','c) notarielles Testament oder Erbvertrag mit Eröffnungsniederschrift'],['privat','d) handschriftliches Testament oder gesetzliche Erbfolge: Erbschein beantragen']];
const TV_NACHWEIS=[['','– bitte wählen –'],['zeugnis','Testamentsvollstreckerzeugnis'],['enz','Europäisches Nachlasszeugnis'],
  ['testament','notarielles Testament mit Eröffnungsniederschrift und Bestätigung der Amtsannahme']];
const VORERBE_WEG=[['','– bitte wählen –'],['zustimmung','Zustimmung aller Nacherben, öffentlich beglaubigt'],['befreit','Notariat bestätigt: befreiter Vorerbe und entgeltlicher Verkauf']];
const EINGETRAGEN=[['','– bitte wählen –'],['nein','nein'],['beantragt','beantragt'],['ja','ja']];
const VM_FORM=[['','– bitte wählen –'],['beurkundet','notariell beurkundet'],['beglaubigt','notariell beglaubigt'],['behoerde','von der Betreuungsbehörde beglaubigt'],['privat','nur privatschriftlich']];
const SORGE=[['','– bitte wählen –'],['beide','beide Eltern gemeinsam'],['allein','ein Elternteil allein']];
const FAMILIE=[['','– bitte wählen –'],['ledig','ledig, geschieden oder verwitwet'],['verheiratet','verheiratet'],['verpartnert','eingetragene Lebenspartnerschaft']];
const GUETER=[['','– bitte wählen –'],['zugewinn','Zugewinngemeinschaft (gesetzlich)'],['trennung','Gütertrennung'],['gemeinschaft','Gütergemeinschaft'],['anders','anderer oder ausländischer Güterstand']];
const GERICHT={betreuer:'Betreuungsgericht',eltern:'Familiengericht',pfleger:'Familiengericht',np:'Nachlassgericht'};
const STELLE={betreuer:'betreuungsgericht',eltern:'familiengericht',pfleger:'familiengericht',np:'nachlassgericht'};
const STAND_TEXT={offen:'offen',angefordert:'angefordert',da:'liegt vor',entfaellt:'entfällt'};

const dOk=x=>{ x=String(x||''); return /^\d{4}-\d{2}-\d{2}$/.test(x)&&F.plusTage(x,0)===x?x:''; };
/* Datum wie toLocaleDateString('de-DE'): 1.1.2027 */
const datumText=iso=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||'')); return m?(+m[3])+'.'+(+m[2])+'.'+m[1]:'–'; };
const text=(liste,w)=>(liste.find(x=>x[0]===w)||['',''])[1];
const zahl=x=>{ x=+String(x==null?'':x).replace(',','.'); return Number.isFinite(x)?x:0; };

/* Rechtskraft und Mitteilungsfrist einer gerichtlichen Genehmigung (Betreuer, Eltern, Ergänzungs- und Nachlasspfleger)
   g = {beantragt, beschluss, bekanntgabe, mitgeteilt, aufforderung}; o = {heute, rk: Rechtskraftzeugnis liegt vor, gericht, norm, wen, iVm, datum} */
function genehmigung(g,o){
  g=g||{}; o=o||{};
  const heute=o.heute||'', D=o.datum||datumText, punkte=[], P=(stufe,t)=>punkte.push({stufe,text:t});
  const n1856='§ 1856 Abs. 1 Satz 2 BGB'+(o.iVm?' i. V. m. '+o.iVm:''), n1856b='§ 1856 Abs. 2 BGB'+(o.iVm?' i. V. m. '+o.iVm:'');
  const rkAb=dOk(g.bekanntgabe)?F.fristTage(g.bekanntgabe,14,{werktag:true}):'';   // § 63 Abs. 2 Nr. 2 und Abs. 3 FamFG: zwei Wochen ab Bekanntgabe; § 16 Abs. 2 FamFG, § 222 Abs. 2 ZPO
  const mitteilungBis=dOk(g.aufforderung)?F.fristMonate(g.aufforderung,2,{werktag:true}):'';   // § 1856 Abs. 2 BGB: bis zum Ablauf des zweiten Monats; § 193 BGB
  const rkWt=rkAb&&rkAb!==F.fristTage(g.bekanntgabe,14)?' (nächster Werktag, § 16 Abs. 2 FamFG, § 222 Abs. 2 ZPO)':'';
  const mWt=mitteilungBis&&mitteilungBis!==F.fristMonate(g.aufforderung,2)?' (nächster Werktag, § 193 BGB)':'';
  const gericht=o.gericht||'Gericht';
  if(!dOk(g.beantragt)&&!dOk(g.beschluss)) P('gelb','Genehmigung beim '+gericht+' beantragen ('+(o.norm||'')+'). Bis dahin ist der Kaufvertrag schwebend unwirksam.');
  else if(!dOk(g.beschluss)) P('gelb','Genehmigung beantragt am '+D(g.beantragt)+' — der Beschluss steht aus.');
  else if(!rkAb) P('gelb','Beschluss vom '+D(g.beschluss)+': Tag der letzten schriftlichen Bekanntgabe eintragen'+(o.wen?' — auch an '+o.wen+' (§ 41 Abs. 3 FamFG)':'')+'.');
  if(rkAb&&!o.rk) P('gelb','Beschwerdefrist endet am '+D(rkAb)+rkWt+' — frühestens danach rechtskräftig (§ 63 Abs. 2 Nr. 2 und Abs. 3, § 45 FamFG). Wirksam erst mit Rechtskraft; das Rechtskraftzeugnis fehlt noch (§ 40 Abs. 2, § 46 Abs. 2 FamFG).');
  if(!dOk(g.mitgeteilt)){
    if(mitteilungBis){
      const t=F.tageBis(heute,mitteilungBis);
      if(t!=null&&t<0) P('rot','Mitteilungsfrist am '+D(mitteilungBis)+mWt+' abgelaufen — die Genehmigung gilt als verweigert ('+n1856b+'). Mit dem Notariat klären.');
      else if(t!=null&&t<=14) P('rot','Mitteilung an den Käufer spätestens am '+D(mitteilungBis)+mWt+' — sonst gilt die Genehmigung als verweigert ('+n1856b+').');
      else P('gelb','Der Käufer hat zur Mitteilung aufgefordert: Mitteilung spätestens am '+D(mitteilungBis)+mWt+', sonst gilt die Genehmigung als verweigert ('+n1856b+').');
    } else if(o.rk) P('gelb','Die rechtskräftige Genehmigung dem Käufer mitteilen — erst dann wird der Vertrag wirksam ('+n1856+').');
  } else if(!o.rk) P('gelb','Dem Käufer am '+D(g.mitgeteilt)+' mitgeteilt — wirksam wird nur die Mitteilung der wirksam gewordenen, also rechtskräftigen Genehmigung ('+n1856+').');
  const gruen=!!o.rk&&!!dOk(g.mitgeteilt);
  if(gruen) P('gruen','Genehmigung rechtskräftig und dem Käufer am '+D(g.mitgeteilt)+' mitgeteilt.');
  return {punkte,gruen,rkAb,mitteilungBis,stufe:punkte.some(p=>p.stufe==='rot')?'rot':gruen?'gruen':'gelb'};
}
/* Europäisches Nachlasszeugnis: beglaubigte Abschrift gilt sechs Monate, Ablaufdatum steht darauf (Art. 70 Abs. 3 EuErbVO) */
function enzPruefen(bis,heute,termin,D){
  D=D||datumText; bis=dOk(bis); termin=dOk(termin);
  if(!bis) return {stufe:'gelb',text:'Europäisches Nachlasszeugnis: Pflichtfeld „gültig bis“ eintragen — das Ablaufdatum steht auf der beglaubigten Abschrift (Art. 70 Abs. 3 EuErbVO).'};
  if(heute&&heute>bis) return {stufe:'rot',text:'Die beglaubigte Abschrift des Europäischen Nachlasszeugnisses galt bis '+D(bis)+' — neue Abschrift anfordern (Art. 70 Abs. 3 EuErbVO).'};
  if(termin&&termin>bis) return {stufe:'rot',text:'Der Beurkundungstermin am '+D(termin)+' liegt nach dem Ablauf der Abschrift am '+D(bis)+' — neue Abschrift anfordern (Art. 70 Abs. 3 EuErbVO).'};
  const t=heute?F.tageBis(heute,bis):null;
  if(t!=null&&t<=30) return {stufe:'gelb',text:'Die beglaubigte Abschrift des Europäischen Nachlasszeugnisses läuft am '+D(bis)+' ab (Art. 70 Abs. 3 EuErbVO).'};
  return {stufe:'gruen',text:'Europäisches Nachlasszeugnis: Abschrift gültig bis '+D(bis)+'.'};
}
/* Vollmacht: Form, Umfang, Tod des Vollmachtgebers, Untersagung, Insichgeschäft */
function vollmachtPruefen(p,L){
  const l=[], P=(stufe,t)=>l.push({stufe,text:L+': '+t});
  if(!p.vmForm) P('rot','Form der Vollmacht angeben.');
  else if(p.vmForm==='privat') P('rot','Die Vollmacht ist nur privatschriftlich — für das Grundbuch braucht es eine öffentliche oder öffentlich beglaubigte Urkunde (§ 29 Abs. 1 GBO). Ob sie nachträglich beglaubigt werden kann, beurteilt der Notar.');
  if(!p.vmUmfasst) P('rot','angeben, ob die Vollmacht den Grundstücksverkauf umfasst.');
  else if(p.vmUmfasst==='nein') P('rot','Die Vollmacht umfasst den Grundstücksverkauf nicht — die Vertretung ist ungeklärt.');
  if(!p.vmGeberLebt) P('rot','angeben, ob der Vollmachtgeber lebt.');
  else if(p.vmGeberLebt==='nein'){
    if(p.vmForm==='behoerde') P('rot','Der Vollmachtgeber ist verstorben: Die Beglaubigung durch die Betreuungsbehörde wirkt nicht mehr (§ 7 Abs. 1 Satz 2 BtOG).');
    else if(p.vmForm!=='privat') P('gelb','Der Vollmachtgeber ist verstorben: Eine Vollmacht über den Tod hinaus können die Erben widerrufen (§ 168 Satz 2, § 672 Satz 1 BGB)'
      +(p.vmUeberTod?'':'; ob sie über den Tod hinaus gilt,')+' — mit dem Notariat klären.');
  }
  if(p.vmUntersagt) P('rot','Das Betreuungsgericht hat die Ausübung der Vollmacht untersagt (§ 1820 Abs. 4 BGB).');
  if(p.vmSelbstkauf&&p.vm181!=='ja') P('rot','Der Bevollmächtigte kauft selbst — nur mit Befreiung von § 181 BGB in der Vollmacht.');
  return l;
}

/* Fälle aus Einstiegsfragen, Erbschein und Grundbuch Abt. II (Text aus Bewertung oder Notarauftrag) */
function faelle(r,ctx){
  r=r||{}; ctx=ctx||{};
  const abt2=String(ctx.abt2||''), lebt=r.eigentuemer==='lebt', verstorben=r.eigentuemer==='verstorben', erben=verstorben?(r.erben||''):'';
  const tvAbt2=/testamentsvollstreck/i.test(abt2), neAbt2=/nacherb/i.test(abt2), es=verstorben&&r.nachweis==='erbschein';
  const tv=r.tv==='ja'||(es&&!!r.erbscheinTV)||(tvAbt2&&r.tv!=='nein');
  const vorerbe=r.nacherbfolge==='ja'||(es&&!!r.erbscheinNE)||(neAbt2&&r.nacherbfolge!=='nein');
  const pers=Array.isArray(r.personen)?r.personen:[], v=k=>!tv&&pers.some(p=>(p.vertretung||'selbst')===k);
  return {lebt,verstorben,erbe:verstorben&&erben!=='unbekannt',erbengemeinschaft:verstorben&&erben==='mehrere',nachlasspfleger:verstorben&&erben==='unbekannt',
    tv,vorerbe,tvAbt2,neAbt2,betreuer:v('betreuer'),eltern:v('eltern'),pfleger:v('pfleger'),bevollmaechtigt:v('bevollmaechtigt')};
}
function rolle(fa){ return fa.lebt?(fa.vorerbe?'Vorerbe':'Eigentümer'):fa.erbengemeinschaft?'Miterbe':fa.vorerbe?'Vorerbe':'Erbe'; }
/* Güterstand und Familienstand einer Person: eigene Angabe, sonst aus dem Notarauftrag */
function ehe(p,ctx){ const n=((ctx||{}).notarPersonen||{})[p.kundeId]||{}; return {fam:p.familienstand||n.familienstand||'',gs:p.gueterstand||n.gueterstand||'',ausNotar:!p.familienstand&&!!n.familienstand}; }

/* Gesamtprüfung. ctx = {heute, termin (Beurkundung), kaufpreis, wert (gesicherte Bewertung), schwelle (%), stand: {Postenschlüssel: Stand},
   abt2, name(kundeId) → Name für die Anzeige, notarPersonen: {kundeId: {familienstand, gueterstand}}, datum(iso) → Text} */
function pruefen(r,ctx){
  r=r||{}; ctx=ctx||{};
  const heute=dOk(ctx.heute), termin=dOk(ctx.termin), D=ctx.datum||datumText, name=ctx.name||(()=>'');
  const stand=k=>((ctx.stand||{})[k])||'offen', ok=k=>stand(k)==='da'||stand(k)==='entfaellt';
  const fa=faelle(r,ctx), punkte=[], posten=[], ketten=[], pers=Array.isArray(r.personen)?r.personen:[];
  const P=(stufe,t,bereich)=>punkte.push({stufe,text:t,bereich:bereich||'gesamt'});
  const post=(key,nm,stelle,fuer,hinweis)=>{ key='bf_'+key; if(!posten.some(p=>p.key===key)) posten.push({key,name:nm,stelle,fuer:fuer||'',hinweis:hinweis||'',herkunft:'Wer verkauft?'}); return key; };
  let schwebend=false, ehegatte=false;
  const R=rolle(fa);
  const kurz=(p,i)=>R+(pers.length>1?' '+(i+1):'');                                   // ohne Namen: für Posten in „Unterlagen“
  const lang=(p,i)=>{ const n=p.kundeId?name(p.kundeId):''; return kurz(p,i)+(n?' ('+n+')':''); };

  /* Einstiegsfragen */
  if(!fa.lebt&&!fa.verstorben) P('rot','Frage 1 beantworten: Lebt der im Grundbuch (Abt. I) eingetragene Eigentümer?','einstieg');
  if(fa.verstorben&&!r.erben) P('rot','Frage 2 beantworten: Wer hat geerbt — ein Erbe, mehrere Erben, oder sind die Erben unbekannt?','einstieg');
  if(fa.verstorben&&!r.tv&&!fa.tv) P('rot','Frage 3 beantworten: Ist Testamentsvollstreckung angeordnet? Das zeigen Erbschein, Testament oder Grundbuch Abt. II.','einstieg');
  if(fa.verstorben&&!r.nacherbfolge&&!fa.vorerbe) P('rot','Frage 4 beantworten: Ist Vor- und Nacherbfolge angeordnet?','einstieg');
  if(r.tv==='nein'&&fa.tvAbt2) P('gelb','Grundbuch Abt. II nennt eine Testamentsvollstreckung (§ 52 GBO) — die Angabe „nein“ prüfen.','einstieg');
  if(r.nacherbfolge==='nein'&&fa.neAbt2) P('gelb','Grundbuch Abt. II nennt einen Nacherbenvermerk (§ 51 GBO) — die Angabe „nein“ prüfen.','einstieg');

  /* Verkäufer: erfasst, Erbengemeinschaft, Vertretung, Ehegatte */
  if(!fa.nachlasspfleger&&(fa.lebt||fa.verstorben)){
    if(!pers.length) P('rot',(fa.lebt?'Eigentümer laut Grundbuch (Abt. I)':fa.erbengemeinschaft?'Alle Miterben':'Den Erben')+' aus der Kundenakte erfassen.','personen');
    pers.forEach((p,i)=>{ if(!p.kundeId) P('rot',kurz(p,i)+': nicht erfasst — Person aus der Kundenakte wählen.','p:'+p.id); });
  }
  if(fa.erbengemeinschaft){
    P('grau','Ein Miterbe allein kann das Haus nicht verkaufen, nur seinen Erbteil beim Notar; dann haben die anderen zwei Monate ein Vorkaufsrecht (§ 2040 Abs. 1, § 2033, § 2034 BGB).','personen');
    if(!fa.tv) P('grau','Maklervertrag mit der Erbengemeinschaft: Ob alle Miterben unterschreiben müssen, klärt die Rechtsabteilung (Vordrucke der Bank).','personen');
    if(fa.tv) P('grau','Bei Testamentsvollstreckung verkauft der Testamentsvollstrecker; die Erben können über das Grundstück nicht verfügen (§ 2211 Abs. 1 BGB).','personen');
    else {
      if(pers.length===1) P('rot','Erbengemeinschaft: alle Miterben erfassen — sie können nur gemeinsam verkaufen (§ 2040 Abs. 1 BGB).','personen');
      const n=Math.round(zahl(r.anzahlErben));
      if(n>pers.length) P('rot','Laut Nachweis '+n+' Erben, erfasst sind '+pers.length+' — alle Miterben müssen mitwirken (§ 2040 Abs. 1 BGB).','personen');
      pers.forEach((p,i)=>{ const e=p.einverstanden||'offen'; if(e!=='ja') P('rot',lang(p,i)+': mit dem Verkauf einverstanden — '+(e==='nein'?'nein':'offen')+'.','p:'+p.id); });
      if(pers.some(p=>p.einverstanden==='nein')) P('grau','Ohne Einigung bleibt die Teilungsversteigerung (§ 2042 Abs. 1, § 753 Abs. 1 BGB, § 180 ZVG) – rechtliche Beratung durch Notar oder Anwalt.','personen');
    }
  }
  if(fa.tv&&pers.some(p=>(p.vertretung||'selbst')!=='selbst')) P('grau','Für den Verkauf durch den Testamentsvollstrecker kommt es auf die Vertretung der Erben nicht an (§ 2211 Abs. 1 BGB). Ob Erben mitwirken sollen, klärt das Notariat.','personen');
  if(fa.lebt&&!fa.tv&&!fa.vorerbe&&pers.length&&pers.every(p=>(p.vertretung||'selbst')==='selbst')) P('grau','Der eingetragene Eigentümer handelt selbst.','personen');

  const kette=(g,art,pre,LK,norm,b,wen,iVm)=>{
    const kGen=post(pre+'gen','Genehmigung des '+GERICHT[art]+'s'+(LK?' ('+LK+')':''),STELLE[art],'Notar, Käufer','Beschluss nach '+norm+'.');
    const kRk=post(pre+'rk','Rechtskraftzeugnis zur Genehmigung'+(LK?' ('+LK+')':''),STELLE[art],'Notar','Die Genehmigung wird erst mit Rechtskraft wirksam; das Notariat erhält das Zeugnis elektronisch (§ 40 Abs. 2, § 46 Abs. 2 FamFG).');
    const x=genehmigung(g,{heute,rk:ok(kRk),gericht:GERICHT[art],norm,wen,iVm,datum:D});
    x.punkte.forEach(q=>P(q.stufe,(LK?LK+': ':'')+q.text,b));
    if(!x.gruen) schwebend=true;
    ketten.push({art,bereich:b,label:LK,gruen:x.gruen,rkAb:x.rkAb,mitteilungBis:x.mitteilungBis,g:g||{},genKey:kGen,rkKey:kRk,gericht:GERICHT[art]});
  };
  const ehePruefen=(p,i,b)=>{
    const e=ehe(p,ctx), L=lang(p,i), LK=kurz(p,i);
    if(!['verheiratet','verpartnert'].includes(e.fam)) return;
    ehegatte=true;
    const wer=e.fam==='verpartnert'?'Lebenspartners':'Ehegatten', lp=e.fam==='verpartnert'?'; § 6 LPartG':'';
    if(!e.gs){ P('gelb',L+': Güterstand angeben (hier oder im Notarauftrag).',b); return; }
    let key='';
    if(e.gs==='zugewinn'){
      if(p.ganzesVermoegen){ key=post(p.id+'_ehegatte','Einwilligung des '+wer+' ('+LK+')','eigentuemer','Notar','Verfügung über das Vermögen im Ganzen (§ 1365 Abs. 1 BGB'+lp+').');
        if(!ok(key)) P('gelb',L+': Das Objekt ist im Wesentlichen das ganze Vermögen — der Verkauf braucht die Einwilligung des '+wer+' (§ 1365 Abs. 1 BGB'+lp+').',b); }
      else P('grau',L+': Zugewinngemeinschaft — ist das Objekt im Wesentlichen das ganze Vermögen, braucht der Verkauf die Einwilligung des '+wer+' (§ 1365 Abs. 1 BGB'+lp+'). Die Schwelle prüft das Notariat.',b);
    } else if(e.gs==='gemeinschaft'){
      key=post(p.id+'_ehegatte','Einwilligung des '+wer+' ('+LK+')','eigentuemer','Notar','Gütergemeinschaft: Verfügung über ein Grundstück des Gesamtguts (§ 1424 Satz 1 BGB).');
      if(!ok(key)) P('gelb',L+': Gütergemeinschaft — jede Verfügung über ein Grundstück des Gesamtguts braucht die Einwilligung des '+wer+' (§ 1424 Satz 1 BGB).',b);
    } else if(e.gs==='anders') P('gelb',L+': anderer oder ausländischer Güterstand — mit dem Notariat klären.',b);
    if(key&&!ok(key)){
      schwebend=true;
      if(dOk(p.ehAufforderung)){ const bis=F.fristTage(p.ehAufforderung,14,{werktag:true}), wt=bis!==F.fristTage(p.ehAufforderung,14)?' (nächster Werktag, § 193 BGB)':'';
        if(heute&&heute>bis) P('rot',L+': Nach der Aufforderung des Käufers konnte die Genehmigung nur bis '+D(bis)+wt+' erklärt werden (§ 1366 Abs. 3 BGB) — mit dem Notariat klären.',b);
        else P('gelb',L+': Der Käufer hat aufgefordert — Genehmigung nur bis '+D(bis)+wt+' möglich (§ 1366 Abs. 3 BGB); wird sie verweigert, ist der Vertrag unwirksam (§ 1366 Abs. 4 BGB).',b); }
    }
  };
  if(!fa.tv) pers.forEach((p,i)=>{
    const b='p:'+p.id, L=lang(p,i), LK=kurz(p,i), v=p.vertretung||'selbst', vt=(p.vertreterIds||[]).filter(Boolean);
    if(v!=='selbst'&&!vt.length) P('rot',L+': Vertreter aus der Kundenakte wählen ('+text(VERTRETUNG,v)+').',b);
    if(v==='bevollmaechtigt'){
      post(p.id+'_vollmacht','Vollmacht für '+LK+': Urschrift oder Ausfertigung zum Notartermin','notariat','Notar','Der Bevollmächtigte legt die Vollmachtsurkunde vor; eine Kopie genügt nicht (§ 172 Abs. 1 BGB).');
      vollmachtPruefen(p,L).forEach(q=>P(q.stufe,q.text,b));
    }
    if(v==='betreuer'){
      post(p.id+'_bestellung','Bestellungsurkunde des Betreuers ('+LK+')','betreuungsgericht','Notar, Grundbuchamt','Nennt die Aufgabenbereiche, bei vorläufiger Betreuung auch das Ende (§ 290 Abs. 1 FamFG).');
      if(!p.aufgabenkreis) P('rot',L+': prüfen, ob der Aufgabenkreis Vermögenssorge oder Grundstücke umfasst (§ 1823 BGB, § 290 Abs. 1 Nr. 3 FamFG).',b);
      else if(p.aufgabenkreis==='nein') P('rot',L+': Der Aufgabenkreis umfasst den Verkauf nicht — der Betreuer vertritt nur in seinem Aufgabenkreis (§ 1823 BGB).',b);
      if(dOk(p.vorlaeufigBis)){
        if(heute&&heute>p.vorlaeufigBis) P('rot',L+': Die vorläufige Betreuung endete am '+D(p.vorlaeufigBis)+' (§ 290 Abs. 1 Nr. 5 FamFG).',b);
        else if(termin&&termin>p.vorlaeufigBis) P('gelb',L+': Die vorläufige Betreuung endet am '+D(p.vorlaeufigBis)+', vor dem Beurkundungstermin am '+D(termin)+' (§ 290 Abs. 1 Nr. 5 FamFG).',b);
      }
      if(p.wohnt){ if(!dOk(p.anzeigeAm)) P('gelb',L+': Die beabsichtigte Aufgabe des selbst genutzten Wohnraums dem Betreuungsgericht unverzüglich anzeigen (§ 1833 Abs. 2 BGB).',b);
        else P('gruen',L+': Anzeige an das Betreuungsgericht am '+D(p.anzeigeAm)+' (§ 1833 Abs. 2 BGB).',b); }
      if(p.kaeuferNahe) P('rot',L+': Der Käufer ist Ehegatte oder Verwandter in gerader Linie des Betreuers — Ergänzungsbetreuer nötig (§ 1824 Abs. 1 Nr. 1, § 1817 Abs. 5 BGB).',b);
      P('grau',L+': Ob der Betreuer schon für den Maklervertrag eine Genehmigung braucht, klärt die Rechtsabteilung (Vordrucke der Bank).',b);
      kette(p.gen,'betreuer',p.id+'_',LK,p.wohnt?'§ 1833 Abs. 3 Satz 1 Nr. 4 BGB (selbst genutzter Wohnraum)':'§ 1850 Nr. 1 und 5 BGB',b,'die betreute Person','');
    }
    if(v==='eltern'){
      if(!p.sorge) P('rot',L+': angeben, ob beide Eltern gemeinsam oder ein Elternteil allein vertreten (§ 1629 Abs. 1 BGB).',b);
      else if(p.sorge==='allein') post(p.id+'_alleinsorge','Nachweis der Alleinsorge ('+LK+')','eigentuemer','Notar, Familiengericht','Allein vertritt nur, wer die Sorge allein ausübt (§ 1629 Abs. 1 Satz 3 BGB). Welches Dokument verlangt wird, klärt das Notariat.');
      else if(vt.length===1) P('gelb',L+': beide Elternteile aus der Kundenakte wählen — die Eltern vertreten das Kind gemeinsam (§ 1629 Abs. 1 Satz 2 BGB).',b);
      if(p.kaeuferNahe) P('rot',L+': Der Käufer ist Ehegatte oder Verwandter in gerader Linie eines Elternteils — Ergänzungspfleger nötig (§ 1629 Abs. 2 Satz 1, § 1824 Abs. 1 Nr. 1, § 1809 Abs. 1 BGB).',b);
      if(fa.erbengemeinschaft) P('grau',L+': Minderjähriger Miterbe — die App nimmt die Genehmigungspflicht des Familiengerichts an (§ 1643 Abs. 1 i. V. m. § 1850 Nr. 1 BGB). Notariat oder Rechtsabteilung bestätigen das, ebenso, ob für die Verteilung des Erlöses ein Ergänzungspfleger nötig ist.',b);
      if(p.volljaehrig){
        P('grau',L+': Wird das Kind vor dem Vollzug volljährig, genehmigt es selbst (§ 1644 Abs. 3 Satz 2 BGB).',b);
        const k=post(p.id+'_kindgen','Genehmigung durch das volljährig gewordene Kind ('+LK+')','notariat','Notar','Tritt an die Stelle der Genehmigung des Familiengerichts (§ 1644 Abs. 3 Satz 2 BGB).');
        if(!ok(k)) schwebend=true;
      } else kette(p.gen,'eltern',p.id+'_',LK,'§ 1643 Abs. 1 i. V. m. § 1850 Nr. 1 und 5 BGB',b,'das Kind','§ 1644 Abs. 3 BGB');
    }
    if(v==='pfleger'){
      post(p.id+'_bestellung','Bestellung des Ergänzungspflegers ('+LK+')','familiengericht','Notar','');
      P('grau',L+': Ob und welche Genehmigung der Ergänzungspfleger braucht, mit dem Notariat klären.',b);
      kette(p.gen,'pfleger',p.id+'_',LK,'mit dem Notariat klären',b,'das Kind','');
    }
    if(v!=='eltern') ehePruefen(p,i,b);
  });

  /* Erbe: Nachweis der Erbfolge, Voreintragung, Erbfall */
  const fristen={gebuehrenfreiBis:'',wvErbfall:''};
  if(fa.erbe){
    const b='erbe';
    if(!r.nachweis) P('gelb','Nachweis der Erbfolge wählen (§ 35 Abs. 1 GBO).',b);
    else if(r.nachweis==='erbschein'){
      const k=post('erbschein','Erbschein','nachlassgericht','Notar, Grundbuchamt','Weist die Erbfolge gegenüber dem Grundbuchamt nach (§ 35 Abs. 1 Satz 1 GBO); erteilt das Nachlassgericht auf Antrag (§ 2353 BGB).');
      if(ok(k)) P('grau','Der Erbschein nennt eine angeordnete Nacherbfolge und einen Testamentsvollstrecker (§ 352b FamFG) — unten anhaken, was er nennt.',b);
    } else if(r.nachweis==='enz'){
      post('enz','Europäisches Nachlasszeugnis (beglaubigte Abschrift)','nachlassgericht','Notar, Grundbuchamt','Beglaubigte Abschriften gelten sechs Monate; das Ablaufdatum steht darauf (Art. 70 Abs. 3 EuErbVO).');
      const x=enzPruefen(r.enzBis,heute,termin,D); P(x.stufe,x.text,b);
      P('grau','Auslandsbezug (etwa letzter Wohnsitz des Erblassers im Ausland oder ausländisches Erbrecht): mit dem Notariat klären.',b);
    } else if(r.nachweis==='notariell'){
      post('testament','Notarielles Testament oder Erbvertrag (beglaubigte Abschrift)','nachlassgericht','Notar, Grundbuchamt','Genügt mit der Eröffnungsniederschrift an Stelle des Erbscheins (§ 35 Abs. 1 Satz 2 GBO).');
      post('eroeffnung','Eröffnungsniederschrift des Nachlassgerichts','nachlassgericht','Notar, Grundbuchamt','Niederschrift über die Eröffnung (§ 348 Abs. 1 FamFG).');
      P('grau','Das Grundbuchamt kann trotzdem einen Erbschein verlangen (§ 35 Abs. 1 Satz 2 Halbsatz 2 GBO).',b);
    } else if(r.nachweis==='privat'){
      post('erbschein','Erbschein (beantragen)','nachlassgericht','Notar, Grundbuchamt','Handschriftliches Testament oder gesetzliche Erbfolge: Erbschein beim Nachlassgericht beantragen (§ 35 Abs. 1 GBO, § 2353 BGB).');
      P('gelb','Handschriftliches Testament oder gesetzliche Erbfolge: Für das Grundbuch ist ein Erbschein nötig (§ 35 Abs. 1 GBO).',b);
    }
    P('grau','Für die Umschreibung auf den Käufer müssen die Erben nicht vorher eingetragen sein (§ 40 Abs. 1 GBO). Ob die Finanzierungsgrundschuld des Käufers die Voreintragung braucht, klärt das Notariat.',b);
    if(dOk(r.erbfall)){
      fristen.gebuehrenfreiBis=F.fristMonate(r.erbfall,24); fristen.wvErbfall=F.fristMonate(r.erbfall,21);
      if(r.erbenEingetragen!=='ja'){
        if(!heute||heute<=fristen.gebuehrenfreiBis) P('grau','Berichtigung des Grundbuchs auf die Erben bis '+D(fristen.gebuehrenfreiBis)+' gebührenfrei, wenn der Antrag bis dahin beim Grundbuchamt eingeht (Nr. 14110 Anm. Abs. 1 KV GNotKG).',b);
        else P('grau','Die gebührenfreie Berichtigung des Grundbuchs (zwei Jahre nach dem Erbfall) endete am '+D(fristen.gebuehrenfreiBis)+'.',b);
      }
    }
  }

  /* Testamentsvollstrecker */
  if(fa.tv){
    const b='tv';
    if(fa.tvAbt2&&r.tv!=='nein') P('grau','Grundbuch Abt. II nennt eine Testamentsvollstreckung (§ 52 GBO).',b);
    P('grau','Vertragspartner für den Maklervertrag und den Verkauf ist der Testamentsvollstrecker, nicht die Erben (§ 2205 Satz 2, § 2211 Abs. 1 BGB).',b);
    if(!r.tvId) P('rot','Testamentsvollstrecker aus der Kundenakte erfassen.',b);
    if(!r.tvNachweis) P('gelb','Nachweis des Testamentsvollstreckers wählen (§ 35 Abs. 2 GBO).',b);
    else if(r.tvNachweis==='zeugnis') post('tvzeugnis','Testamentsvollstreckerzeugnis','nachlassgericht','Notar, Grundbuchamt','Erteilt das Nachlassgericht; mit dem Ende des Amts wird es kraftlos (§ 2368 BGB, § 35 Abs. 2 GBO).');
    else if(r.tvNachweis==='enz'){
      post('tvenz','Europäisches Nachlasszeugnis für den Testamentsvollstrecker (beglaubigte Abschrift)','nachlassgericht','Notar, Grundbuchamt','Beglaubigte Abschriften gelten sechs Monate (Art. 70 Abs. 3 EuErbVO; § 35 Abs. 2 GBO).');
      const x=enzPruefen(r.tvEnzBis,heute,termin,D); P(x.stufe,x.text,b);
    } else if(r.tvNachweis==='testament'){
      post('testament','Notarielles Testament oder Erbvertrag (beglaubigte Abschrift)','nachlassgericht','Notar, Grundbuchamt','Genügt mit der Eröffnungsniederschrift (§ 35 Abs. 2, Abs. 1 Satz 2 GBO).');
      post('eroeffnung','Eröffnungsniederschrift des Nachlassgerichts','nachlassgericht','Notar, Grundbuchamt','Niederschrift über die Eröffnung (§ 348 Abs. 1 FamFG).');
      post('tvannahme','Bestätigung der Amtsannahme durch das Nachlassgericht','nachlassgericht','Notar, Grundbuchamt','Das Amt beginnt mit der Annahme gegenüber dem Nachlassgericht (§ 2202 BGB).');
    }
    if(!dOk(r.tvGeprueft)) P('gelb','Nachweis des Testamentsvollstreckers vor dem Beurkundungstermin prüfen und das Datum eintragen — endet das Amt, wird das Zeugnis kraftlos (§ 2368 BGB).',b);
    else { const ref=termin||heute, t=ref?F.tageBis(r.tvGeprueft,ref):0;
      if(t>30) P('gelb','Nachweis des Testamentsvollstreckers zuletzt geprüft am '+D(r.tvGeprueft)+' — mehr als 30 Tage vor '+(termin?'dem Beurkundungstermin':'heute')+'; erneut prüfen (§ 2368 BGB).',b);
      else P('gruen','Nachweis des Testamentsvollstreckers zuletzt geprüft am '+D(r.tvGeprueft)+'.',b); }
  }

  /* Vor- und Nacherbe */
  if(fa.vorerbe){
    const b='vorerbe';
    if(fa.neAbt2&&r.nacherbfolge!=='nein') P('grau','Grundbuch Abt. II nennt einen Nacherbenvermerk (§ 51 GBO).',b);
    P('grau','Verkauft der Vorerbe, wird der Verkauf bei Eintritt der Nacherbfolge unwirksam, soweit er die Rechte der Nacherben beeinträchtigt (§ 2113 Abs. 1 BGB).',b);
    if(!r.vorerbeWeg) P('rot','Nacherben berücksichtigen: Zustimmung aller Nacherben, öffentlich beglaubigt (§ 2120 Satz 2 BGB), oder Bestätigung des Notariats „befreiter Vorerbe und entgeltlicher Verkauf“ (§ 2136, § 2113 Abs. 1 und 2 BGB).',b);
    else {
      const k=r.vorerbeWeg==='zustimmung'?post('nacherben','Zustimmung aller Nacherben, öffentlich beglaubigt','notariat','Notar, Grundbuchamt','§ 2120 Satz 2 BGB.')
        :post('befreit','Bestätigung des Notariats: befreiter Vorerbe und entgeltlicher Verkauf','notariat','Notar','Auch der befreite Vorerbe darf nicht unentgeltlich verfügen (§ 2136, § 2113 Abs. 1 und 2 BGB).');
      if(!ok(k)) P('rot',text(VORERBE_WEG,r.vorerbeWeg)+': liegt noch nicht vor — ohne sie ist der Verkauf gegenüber den Nacherben nicht gesichert (§ 2113 BGB).',b);
      else P('gruen',text(VORERBE_WEG,r.vorerbeWeg)+': liegt vor.',b);
    }
    if(r.nacherbenUnbekannt) P('gelb','Nacherben unbekannt, noch nicht geboren oder minderjährig: Ein Pfleger und gegebenenfalls eine Genehmigung sind nötig — das verlängert den Ablauf (§ 1882 BGB).',b);
  }

  /* Nachlasspfleger bei unbekannten Erben */
  if(fa.nachlasspfleger){
    const b='np';
    P('grau','Die Erben sind unbekannt: Es verkauft der Nachlasspfleger. Für ihn gilt das Betreuungsrecht entsprechend, an die Stelle des Betreuungsgerichts tritt das Nachlassgericht (§ 1960, § 1962, § 1888 Abs. 1 BGB).',b);
    if(!r.npId) P('rot','Nachlasspfleger aus der Kundenakte erfassen.',b);
    post('np_bestellung','Bestellung des Nachlasspflegers (Nachweis)','nachlassgericht','Notar, Grundbuchamt','');
    kette(r.npGen,'np','np_','','§ 1962, § 1888 Abs. 1 i. V. m. § 1850 Nr. 1 und 5 BGB',b,'','§ 1888 Abs. 1 BGB');
  }

  /* Testamentsvollstrecker und Vorerbe: Kaufpreis gegen gesicherte Bewertung */
  if(fa.tv||fa.vorerbe){
    const b='preis', kp=zahl(ctx.kaufpreis), w=zahl(ctx.wert), s=zahl(ctx.schwelle);
    P('grau','Die gesicherte Bewertung als Beleg für einen marktgerechten (entgeltlichen) Kaufpreis bereithalten: Unentgeltliche Verfügungen sind '
      +(fa.tv?'dem Testamentsvollstrecker':'')+(fa.tv&&fa.vorerbe?' und ':'')+(fa.vorerbe?'auch dem befreiten Vorerben':'')+' verwehrt (§ 2205 Satz 3, § 2113 Abs. 2, § 2136 BGB).',b);
    if(!(w>0)) P('grau','Keine gesicherte Bewertung mit Ergebnis für dieses Objekt.',b);
    else if(!(kp>0)) P('grau','Kaufpreis noch nicht im Notarauftrag.',b);
    else if(!(s>0)) P('grau','Schwelle für „Kaufpreis deutlich unter Bewertung“ festlegen — Vorgabe der Bank.',b);
    else { const ab=(w-kp)/w*100;
      if(ab>=s) P('gelb','Kaufpreis '+geld(kp)+' liegt '+String(Math.round(ab*10)/10).replace('.',',')+' % unter dem Wert der Bewertung ('+geld(w)+', Schwelle '+String(s).replace('.',',')+' %) — Entgeltlichkeit mit dem Notariat klären.',b);
      else P('gruen','Kaufpreis '+geld(kp)+' gegen Wert der Bewertung '+geld(w)+': innerhalb der Schwelle.',b); }
  }

  /* Provision: Anspruch erst mit wirksamem Vertrag */
  const genFall=ketten.length>0, genGruen=ketten.every(k=>k.gruen);
  if(genFall&&!genGruen) P('grau','Provision: Der Anspruch entsteht erst mit dem wirksamen Kaufvertrag (§ 652 Abs. 1 Satz 1 BGB i. V. m. § 1856 Abs. 1 BGB) — bis die Genehmigung grün ist, keine Rechnung stellen. Die Rechtsauffassung bestätigt die Bank.','gesamt');

  const offen=posten.filter(p=>!ok(p.key)), rot=punkte.filter(p=>p.stufe==='rot').length, gelb=punkte.filter(p=>p.stufe==='gelb').length;
  const stufe=rot?'rot':(gelb||offen.length)?'gelb':'gruen';
  const t=stufe==='rot'?'Die Verkäuferseite ist unvollständig ('+rot+' rote'+(rot===1?'r':'')+' Punkt'+(rot===1?'':'e')+'). Rot, solange nicht alle Beteiligten erfasst sind, die Vertretung ungeklärt ist oder Testamentsvollstrecker und Nacherben nicht berücksichtigt sind (§ 2040 Abs. 1, § 2211, § 2113 BGB).'
    :stufe==='gelb'?(offen.length?offen.length+' Nachweis'+(offen.length===1?'':'e')+' oder Genehmigung'+(offen.length===1?'':'en')+' stehen aus.':'Es sind noch Punkte offen.')
      +(schwebend?' Der Vertrag kann beurkundet werden, ist aber bis zur Genehmigung schwebend unwirksam (§ 1856 Abs. 1, § 1366 BGB).':'')
    :'Die Verkäuferseite ist geklärt, alle Nachweise und Genehmigungen liegen vor.';
  const liste=[];
  if(fa.lebt&&!fa.tv&&!fa.vorerbe) liste.push('Eigentümer handelt selbst');
  if(fa.erbe&&!fa.erbengemeinschaft) liste.push('Erbe');
  if(fa.erbengemeinschaft) liste.push('Erbengemeinschaft');
  if(fa.nachlasspfleger) liste.push('Nachlasspfleger');
  if(fa.tv) liste.push('Testamentsvollstrecker');
  if(fa.vorerbe) liste.push('Vorerbe');
  if(fa.betreuer) liste.push('Betreuer');
  if(fa.eltern) liste.push('Eltern für Minderjährige');
  if(fa.pfleger) liste.push('Ergänzungspfleger');
  if(fa.bevollmaechtigt) liste.push('Bevollmächtigter');
  if(ehegatte) liste.push('Ehegatte (Güterstand)');
  return {fa,faelle:liste,rolle:R,punkte,posten,ketten,stufe,text:t,schwebend,genehmigungsfall:genFall,genehmigungGruen:genFall&&genGruen,
    offen:offen.length,da:posten.length-offen.length,gesamt:posten.length,fristen};
}
function geld(x){ return Math.round(x).toLocaleString('de-DE')+' €'; }

const ImmoBefugnisRegeln={EIGENTUEMER,ERBEN,JA_NEIN,VERTRETUNG,EINVERSTANDEN,NACHWEIS,TV_NACHWEIS,VORERBE_WEG,EINGETRAGEN,VM_FORM,SORGE,FAMILIE,GUETER,
  GERICHT,STELLE,STAND_TEXT,text,datumText,faelle,rolle,ehe,genehmigung,enzPruefen,vollmachtPruefen,pruefen};
wurzel.ImmoBefugnisRegeln=ImmoBefugnisRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoBefugnisRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
