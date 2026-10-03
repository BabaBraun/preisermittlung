/* ImmoApp — Fristen nach dem BGB und Feiertage in Baden-Württemberg (D49), ohne Seitenbezug
   - Fristbeginn mit einem Ereignis: Der Tag des Ereignisses zählt nicht mit (§ 187 Abs. 1 BGB).
   - Tagesfrist: endet mit Ablauf des letzten Tages (§ 188 Abs. 1 BGB).
   - Monats- und Jahresfrist: endet mit Ablauf des Tages, der durch seine Zahl dem Tag des Ereignisses entspricht; fehlt dieser
     Tag im letzten Monat, mit Ablauf des letzten Tages dieses Monats (§ 188 Abs. 2 und 3 BGB).
   - Ist bis zu einem Tag eine Willenserklärung abzugeben und fällt er auf einen Samstag, Sonntag oder einen am Erklärungsort
     staatlich anerkannten allgemeinen Feiertag, tritt der nächste Werktag an seine Stelle (§ 193 BGB).
   - Feiertage in Baden-Württemberg: § 1 Feiertagsgesetz BW (Neujahr, Erscheinungsfest, Karfreitag, Ostermontag, 1. Mai,
     Christi Himmelfahrt, Pfingstmontag, Fronleichnam, Allerheiligen, 1. und 2. Weihnachtstag) und der 3. Oktober (Bundesrecht).
     Gründonnerstag, Reformationstag und Buß- und Bettag sind nur kirchliche Feiertage (§ 2 FTG) und zählen nicht.
   Ostersonntag nach der Gaußschen Osterformel (gregorianisch). Alle Daten als ISO-Text (JJJJ-MM-TT), gerechnet in UTC. */
(function(wurzel){
'use strict';
const iso=d=>d.toISOString().slice(0,10);
const datum=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')); if(!m) return null; const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])); return iso(d)===s?d:null; };
function ostersonntag(J){
  const a=J%19, b=Math.floor(J/100), c=J%100, d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30, i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451);
  const monat=Math.floor((h+l-7*m+114)/31), tag=((h+l-7*m+114)%31)+1;
  return iso(new Date(Date.UTC(J,monat-1,tag)));
}
function plusTage(s,n){ const d=datum(s); if(!d) return ''; d.setUTCDate(d.getUTCDate()+n); return iso(d); }
/* gesetzliche Feiertage in Baden-Württemberg für ein Jahr: [[ISO-Datum, Name]] */
function feiertageBW(J){
  const o=ostersonntag(J);
  return [[J+'-01-01','Neujahr'],[J+'-01-06','Erscheinungsfest'],[plusTage(o,-2),'Karfreitag'],[plusTage(o,1),'Ostermontag'],[J+'-05-01','Tag der Arbeit'],
    [plusTage(o,39),'Christi Himmelfahrt'],[plusTage(o,50),'Pfingstmontag'],[plusTage(o,60),'Fronleichnam'],[J+'-10-03','Tag der Deutschen Einheit'],
    [J+'-11-01','Allerheiligen'],[J+'-12-25','1. Weihnachtstag'],[J+'-12-26','2. Weihnachtstag']].sort((a,b)=>a[0].localeCompare(b[0]));
}
function feiertagBW(s){ const d=datum(s); if(!d) return ''; const f=feiertageBW(d.getUTCFullYear()).find(x=>x[0]===s); return f?f[1]:''; }
function werktagBW(s){ const d=datum(s); if(!d) return false; const w=d.getUTCDay(); return w!==0&&w!==6&&!feiertagBW(s); }
/* § 193 BGB: Samstag, Sonntag oder Feiertag → nächster Werktag */
function naechsterWerktagBW(s){ let x=s, n=0; while(x&&!werktagBW(x)&&n<10){ x=plusTage(x,1); n++; } return x; }
/* Tagesfrist ab einem Ereignis (§§ 187 Abs. 1, 188 Abs. 1 BGB), auf Wunsch mit § 193 */
function fristTage(ereignis,tage,o){ o=o||{}; const e=plusTage(ereignis,tage); return e&&o.werktag?naechsterWerktagBW(e):e; }
/* Monatsfrist ab einem Ereignis (§§ 187 Abs. 1, 188 Abs. 2 und 3 BGB), auf Wunsch mit § 193 */
function fristMonate(ereignis,monate,o){
  o=o||{}; const d=datum(ereignis); if(!d) return '';
  const J=d.getUTCFullYear(), M=d.getUTCMonth()+monate, T=d.getUTCDate();
  const letzter=new Date(Date.UTC(J,M+1,0)).getUTCDate();
  const e=iso(new Date(Date.UTC(J,M,Math.min(T,letzter))));
  return o.werktag?naechsterWerktagBW(e):e;
}
function tageBis(von,bis){ const a=datum(von), b=datum(bis); return a&&b?Math.round((b-a)/864e5):null; }
const ImmoFristen={ostersonntag,feiertageBW,feiertagBW,werktagBW,naechsterWerktagBW,plusTage,fristTage,fristMonate,tageBis};
wurzel.ImmoFristen=ImmoFristen;
if(typeof module==='object'&&module.exports) module.exports=ImmoFristen;
})(typeof globalThis!=='undefined'?globalThis:this);
