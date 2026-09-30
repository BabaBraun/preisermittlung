/* ---------- Sensitivität ---------- */
function sensitivitaet(){
  let dLZ=num('sz_lz'), dM=num('sz_miete')/100;
  let basisLZ=num('er_zins_basis')+num('er_zins_adj');
  let szenarien=[
    ['Basisannahme',0,1],
    ['Liegenschaftszins −'+num2(dLZ)+' Pp.',-dLZ,1],
    ['Liegenschaftszins +'+num2(dLZ)+' Pp.',dLZ,1],
    ['Miete −'+num2(dM*100)+' %',0,1-dM],
    ['Miete +'+num2(dM*100)+' %',0,1+dM],
    ['ungünstig (Zins +, Miete −)',dLZ,1-dM],
    ['günstig (Zins −, Miete +)',-dLZ,1+dM]
  ];
  SILENT=true;
  let basis=null, data=[];
  szenarien.forEach(s=>{
    SZEN.lz=s[1];SZEN.miete=s[2];compute();
    let v=window._R.empfehlung;
    if(basis===null)basis=v;
    data.push({name:s[0],lz:basisLZ+s[1],miete:s[2]*100,wert:v,abw:basis?((v-basis)/basis*100):0,istBasis:data.length===0});
  });
  SZEN.lz=0;SZEN.miete=1;SILENT=false;compute();
  let t=$('sz_tbl'); t.style.display='';
  t.querySelector('tbody').innerHTML=data.map(d=>
    `<tr><td style="text-align:left">${d.name}</td><td>${num2(d.lz)} %</td><td>${num2(d.miete)} %</td>`
    +`<td>${eur(d.wert)}</td><td>${d.istBasis?'–':(d.abw>0?'+':'')+num2(d.abw)+' %'}</td></tr>`).join('');
  window._SZEN_DATA=data;
}
