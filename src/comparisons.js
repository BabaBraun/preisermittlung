/* ---------- Vergleichsobjekte ---------- */
const N_VGL=8;
function buildVergleich(){
  let tb=$('vgl_tbl').querySelector('tbody'); tb.innerHTML='';
  for(let i=0;i<N_VGL;i++){
    tb.insertAdjacentHTML('beforeend',
      `<tr><td><input id="vgl_adr${i}" type="text" placeholder="Adresse / Objekt" style="text-align:left"></td>
       <td><input id="vgl_bj${i}" type="text" style="width:70px"></td>
       <td><input id="vgl_zust${i}" type="text" placeholder="z.B. saniert"></td>
       <td><input id="vgl_fl${i}" type="text" value="0" style="width:80px"></td>
       <td><input id="vgl_kp${i}" type="text" value="0"></td>
       <td id="vgl_m2${i}">–</td></tr>`);
  }
}
function computeVergleich(){
  let v=ImmoKern.vergleichRechnen(eingabeLeser());
  v.zeilen.forEach((m2,i)=>setT('vgl_m2'+i, m2>0?num2(m2)+' €':'–'));
  setT('o_vgl_avg', v.avg>0?num2(v.avg)+' €/m² ('+v.anz+' Objekte)':'–');
  return v.avg;
}
function uebernehmeVergleichspreis(){
  let avg=computeVergleich();
  if(avg>0){$('vw_preis').value=num2(avg);compute();}
  else alert('Bitte zuerst Vergleichsobjekte mit Fläche und Kaufpreis erfassen.');
}

/* ---------- Marktmieten-Vergleich ---------- */
const MSP_QUELLEN=['Mietspiegel der Gemeinde','Recherche ImmoScout24','Marktbericht / Gutachterausschuss','Eigene Vermietungsdaten','Weitere Quelle'];
function buildMietspiegel(){
  let tb=$('msp_tbl').querySelector('tbody'); tb.innerHTML='';
  MSP_QUELLEN.forEach((q,i)=>{
    tb.insertAdjacentHTML('beforeend',
      `<tr><td><input id="msp_q${i}" type="text" value="${q}" style="text-align:left"></td>
       <td><input id="msp_min${i}" type="text" value="0"></td>
       <td><input id="msp_max${i}" type="text" value="0"></td>
       <td><input id="msp_avg${i}" type="text" value="0"></td></tr>`);
  });
}
/* ---------- Wertkorrekturen § 8 Abs. 3 ---------- */
