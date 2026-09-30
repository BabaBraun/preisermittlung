function nativeCalculate(fields, year) {
 const k=ImmoKern;
 const reader={v:id=>fields[id]==null?'':String(fields[id]),an:id=>fields[id]===true||fields[id]==='true',n:id=>k.zahlLesen(fields[id],nativeAmountFields.has(id))};
 const p=k.protokollLeser(reader),result=k.bewerte(p.leser,{jahr:year,enManuell:true});
 return {R:result.R,D:result.D,price:k.pruefen(reader,result.R,result.D,p.gelesen),lending:k.pruefeBeleihung(reader,result.R,result.D)};
}
function nativeImport(raw){
 if(Array.isArray(raw)||raw&&raw.typ==='immoapp-projekte')return ImmoDaten.projektSicherungPruefen(raw);
 return ImmoDaten.projektDateiPruefen(raw);
}
