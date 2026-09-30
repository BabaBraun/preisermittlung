/* ---------- Aufnahmebogen ---------- */
const AU_BAUTEILE=['Kamin / Kachelofen','Wintergarten','PV-Anlage','Solarthermie','Sauna','Pool / Schwimmbad','Garage','Carport','Klimaanlage','Alarmanlage','Markise','Gartenhaus','Fußbodenheizung','Smart Home','Zisterne','Aufzug'];
function buildAufnahmeBauteile(){
  let box=$('au_bauteile'); if(!box)return; box.innerHTML='';
  AU_BAUTEILE.forEach((b,i)=>{
    box.insertAdjacentHTML('beforeend',
      `<label class="chk"><input type="checkbox" id="au_bt${i}"> ${b}</label>`);
  });
}
function aufnahmeBauteileListe(){
  return AU_BAUTEILE.filter((b,i)=>{let e=$('au_bt'+i);return e&&e.checked;});
}
function druckeAufnahmebogen(){
  document.body.classList.add('print-aufnahme');
  window.print();
  setTimeout(()=>document.body.classList.remove('print-aufnahme'),600);
}

/* ---------- Mietrolle (wohnungsweise) ---------- */
const N_MIETROLLE=14;
function buildMietrolle(){
  let tb=$('mietrolle_tbl').querySelector('tbody'); tb.innerHTML='';
  for(let i=0;i<N_MIETROLLE;i++){
    tb.insertAdjacentHTML('beforeend',
      `<tr><td><input id="mr_bez${i}" type="text" placeholder="${i<11?'Wohnung '+(i+1):'…'}" style="text-align:left"></td>`+
      `<td><input id="mr_gesch${i}" type="text" style="text-align:left"></td>`+
      `<td><input id="mr_fl${i}" type="text" value="0"></td>`+
      `<td><input id="mr_pm2${i}" type="text" value="0"></td>`+
      `<td><input id="mr_pau${i}" type="text" value="0"></td>`+
      `<td id="mr_pa${i}">0 €</td></tr>`);
  }
}
/* ---------- BGF: 4 benannte + 2 frei beschriftbare Geschosse ---------- */
const GESCHOSSE=['Untergeschoss','Erdgeschoss','Obergeschoss','Dachgeschoss'];
const N_GESCH=6;
function buildBGF(tblId,prefix){
  let tb=$(tblId).querySelector('tbody');tb.innerHTML='';
  for(let i=0;i<N_GESCH;i++){
    let name = i<GESCHOSSE.length ? GESCHOSSE[i] :
      `<input id="${prefix}_n${i}" type="text" placeholder="weiteres Geschoss …" style="text-align:left">`;
    tb.insertAdjacentHTML('beforeend',
      `<tr><td>${name}</td><td><input id="${prefix}_l${i}" type="text" value="0"></td><td><input id="${prefix}_b${i}" type="text" value="0"></td><td><input id="${prefix}_e${i}" type="text" value="0"></td><td id="${prefix}_f${i}">0</td></tr>`);
  }
}
/* ---------- Zusatzpositionen ("+"-Felder) ---------- */
function showNext(group,max){
  for(let i=1;i<=max;i++){let r=$(group+'_'+i);if(r && !r.classList.contains('on')){r.classList.add('on');return;}}
}
function sumExtras(prefix,max){
  let s=0;for(let i=1;i<=max;i++){s+=num(prefix+i+'_val');}return s;
}
function extraLines(prefix,max){ // für Bericht
  let out=[];for(let i=1;i<=max;i++){let v=num(prefix+i+'_val');if(v!==0){out.push([($(prefix+i+'_label').value||'weitere Position'),v]);}}return out;
}
function revealUsedExtras(){
  document.querySelectorAll('.xrow,.xrow3').forEach(r=>{
    let has=false;
    r.querySelectorAll('input').forEach(inp=>{let v=(''+inp.value).trim();if(v!==''&&v!=='0')has=true;});
    if(has)r.classList.add('on');
  });
}

/* ---------- Barwertfaktor / Lebenserwartung ---------- */
/* ---------- Modus (Haus / Wohnung) ---------- */
function modus(){return $('ek_modus')?$('ek_modus').value:'haus';}
function modusWechsel(){
  let w = modus()==='wohnung';
  document.body.classList.toggle('modus-wohnung', w);
  setT('lbl_e_sub', w?'Preis nach Vergleichswert':'Preis nach Gebäudesubstanz');
  setT('lbl_gew', w?'Gewichtung Vergleich : Ertrag':'Gewichtung Substanz : Ertrag');
  setT('r_sub_lbl', w?'Vergleichswert':'Substanzwert');
  setT('hdr_sub', w?'Vordruck Wohnung / ETW · Vergleichs- + Ertragswert':'Vordruck Haus / Gebäude · Substanz- + Ertragswert');
  if(w && num('nhkhg_gnd')===0) $('nhkhg_gnd').value=80;
  buildNav();
  compute();
}

/* ---------- Startbildschirm: Vordruck-Presets (je Vordruck ein Objekttyp) ---------- */
const VORDRUCKE = [
  // Eigentumswohnung
  {id:'etw_vergleich', kat:'wohnung', icon:'🏢', label:'ETW · Ertrags- + Vergleichswert',
   sub:'Standard-Eigentumswohnung', modus:'wohnung', wtyp:'Etagenwohnung', gew:'0.5'},
  {id:'etw_niess', kat:'wohnung', icon:'🏢', label:'ETW · mit Nießbrauch',
   sub:'Wohnung mit Nießbrauchsbelastung', modus:'wohnung', wtyp:'Etagenwohnung', niess:true, gew:'0.5'},
  // Wohnhaus
  {id:'wh_bgf', kat:'wohnhaus', icon:'🏠', label:'Wohnhaus nach BGF',
   sub:'Substanz (NHK) + Ertrag', modus:'haus', typ:'EFH freistehend · unterkellert, DG ausgebaut', gew:'0.5'},
  {id:'wh_pv', kat:'wohnhaus', icon:'☀️', label:'Wohnhaus mit PV-Anlage',
   sub:'Substanz + Ertrag + PV-Barwert', modus:'haus', typ:'EFH freistehend · unterkellert, DG ausgebaut', pv:true, gew:'0.5'},
  {id:'wh_anbau_niess_haupt', kat:'wohnhaus', icon:'🏠', label:'Wohnhaus + Anbau · Nießbrauch Hauptwohnung',
   sub:'Nießbrauch auf Hauptgebäude', modus:'haus', typ:'EFH freistehend · unterkellert, DG ausgebaut', anbau:true, niess:true, gew:'0.5'},
  {id:'wh_anbau_niess_neben', kat:'wohnhaus', icon:'🏠', label:'Wohnhaus + Anbau · Nießbrauch Einliegerwohnung',
   sub:'Nießbrauch auf Nebengebäude', modus:'haus', typ:'EFH freistehend · unterkellert, DG ausgebaut', anbau:true, niess:true, gew:'0.5'},
  {id:'wh_bgf_ertrag_anbau_niess', kat:'wohnhaus', icon:'🏠', label:'Wohnhaus BGF + Ertrag · Anbau + Nießbrauch',
   sub:'Nebengebäude / Einliegerwohnung', modus:'haus', typ:'EFH freistehend · unterkellert, DG ausgebaut', anbau:true, niess:true, gew:'0.4'},
  // Gewerbe
  {id:'laden_buero_praxis', kat:'gewerbe', icon:'🏬', label:'Laden / Büro / Praxis',
   sub:'Gewerbeobjekt · Ertragsschwerpunkt', modus:'haus', typ:'Geschäftshaus ohne Wohnungen', gew:'0.3'},
  {id:'gewerbe_bgf', kat:'gewerbe', icon:'🏭', label:'Gewerbliche Objekte nach BGF',
   sub:'Betriebs- / Werkstatt- / Bürogebäude', modus:'haus', typ:'Betriebs-/Werkstattgebäude · eingeschossig', gew:'0.3'}
];
const KAT_TITEL = {wohnung:'Eigentumswohnung – Vordruck wählen', wohnhaus:'Wohnhaus – Vordruck wählen', gewerbe:'Gewerbe – Vordruck wählen'};
function showStart(){
  document.body.classList.remove('started');
  startStep0();
  window.scrollTo(0,0);
}
/* Stufe 0 = Marktüberblick oder Preisermittlung, Stufe 1 = Kategorie, Stufe 2 = Vordruck */
function startStep0(){
  $('start-step0').style.display='';
  $('start-step1').style.display='none';
  $('start-step2').style.display='none';
  setT('start-lead','Womit möchtest du arbeiten?');
  window.scrollTo(0,0);
}
function startPreisermittlung(){
  $('start-step0').style.display='none';
  $('start-step1').style.display='';
  $('start-step2').style.display='none';
  setT('start-lead','Wähle die Art des Vordrucks – anschließend öffnet sich das passende Formular.');
  window.scrollTo(0,0);
}
function startBack(){ $('start-step1').style.display=''; $('start-step2').style.display='none'; }
function pickKategorie(kat){
  let tiles=$('start-tiles'); tiles.innerHTML='';
  $('start-step2-title').textContent=KAT_TITEL[kat]||'Vordruck wählen';
  VORDRUCKE.filter(v=>v.kat===kat).forEach(v=>{
    tiles.insertAdjacentHTML('beforeend',
      `<div class="tile" onclick="pickVordruck('${v.id}')"><div class="ic">${v.icon}</div><div class="t">${v.label}</div><div class="d">${v.sub||'&nbsp;'}</div></div>`);
  });
  $('start-step0').style.display='none';
  $('start-step1').style.display='none';
  $('start-step2').style.display='';
  window.scrollTo(0,0);
}
function pickVordruck(id){
  let v=VORDRUCKE.find(x=>x.id===id); if(!v)return;
  applyVordruck(v);
  document.body.classList.add('started');
  window.scrollTo(0,0);
}
function applyVordruck(v){
  $('ek_modus').value=v.modus;
  if(v.modus==='haus' && v.typ) $('ek_typ').value=v.typ;
  if(v.modus==='wohnung' && v.wtyp) $('ek_wtyp').value=v.wtyp;
  $('anbau_aktiv').checked=!!v.anbau;
  $('niess_aktiv').checked=!!v.niess;
  $('pv_aktiv').checked=!!v.pv;
  modusWechsel();
  if(v.modus==='haus') typWechsel();
  if(v.gew) $('gewichtung').value=v.gew;
  // Keine scheinbar örtlichen Zinssätze aus der Objektvorlage; vorhandene belegte Eingaben bleiben erhalten.
  $('ek_vordruck').value=v.label;
  setT('hdr_sub', v.label);
  compute();
}

/* ---------- Typ-Wechsel & Referenztabelle ---------- */
function typWechsel(){
  let t=TYPES[$('ek_typ').value]; if(!t)return;
  ['nhkhg','nhkan'].forEach(p=>{
    $(p+'_base').value = t.nhk.join(', ');
    $(p+'_gnd').value = t.gnd;
  });
  $('gewichtung').value = t.gew;
  compute();
}
function buildRefTable(){
  let h='<tr><th>Gebäudetyp</th><th>St. 1</th><th>St. 2</th><th>St. 3</th><th>St. 4</th><th>St. 5</th><th>GND</th><th>amtl. Stufen</th></tr>';
  Object.keys(TYPES).forEach(k=>{
    let t=TYPES[k];
    h+=`<tr><td>${k}</td>${t.nhk.map((v,i)=>`<td style="text-align:right${t.amtlich.indexOf('*')>-1&&i<2?';color:#999':''}">${v}</td>`).join('')}<td style="text-align:center">${t.gnd} J</td><td style="text-align:center">${t.amtlich}</td></tr>`;
  });
  $('nhk_ref_tbl').innerHTML=h;
}
