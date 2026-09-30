// Reproduzierbare Modellprüfung; keine Produktformeln oder Sollwerte werden geändert.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {K,leser} from '../../tests/unit/hilfen.mjs';
const f=JSON.parse(readFileSync(new URL('../../tests/fixtures/fall_haus.json',import.meta.url),'utf8'));
const cases=[
 ['Referenz',{}],['Nur Sachwert',{gewichtung:'1'}],['Nur Ertrag',{gewichtung:'0'}],
 ['Garage 25000 bei Stellplätzen 0',{ek_anz_stell:'0',hg_garage:'25000'}],['Garage 0 bei Stellplätzen 0',{ek_anz_stell:'0',hg_garage:'0'}],
 ['BW Kosten 0',{bw_bewirt:'0'}],['BW Kosten 15',{bw_bewirt:'15'}],['BW Restnutzungsdauer 20',{bw_rnd:'20'}],
 ['BW Sicherheitsabschlag 0 sachwertorientiert',{bw_ansatz:'sach',bw_sicher:'0'}],['BW Sicherheitsabschlag 10 sachwertorientiert',{bw_ansatz:'sach',bw_sicher:'10'}],
 ['Energiezuschlag deaktiviert',{en_aktiv:false}],
 ['Vergleich 100 Prozent ohne zusätzlichen PV-Wert',{vw_aktiv:true,gew_vergleich:'100',vw_preis:'4000',pv_aktiv:false,en_aktiv:false}],
 ['Vergleich 100 Prozent mit zusätzlichem PV-Wert',{vw_aktiv:true,gew_vergleich:'100',vw_preis:'4000',pv_aktiv:true,en_aktiv:false}],
 ['Nießbrauch gesamte Miete',{niess_aktiv:true,ni_alter:'65',ni_miete:'0',ni_zins:'5.5'}],
 ['Nießbrauch Teilmiete 6000',{niess_aktiv:true,ni_alter:'65',ni_miete:'6000',ni_zins:'5.5'}]
];
const round=n=>Math.round(n*100)/100;
const result=cases.map(([name,changes])=>{
 const e=leser({...f,...changes}),p=K.protokollLeser(e),{R,D}=K.bewerte(p.leser,{jahr:2026,enManuell:true});
 const check=K.pruefen(e,R,D,p.gelesen);
 return {name,changes,status:check.status,beleihungsstatus:K.pruefeBeleihung(e,R,D).status,sachwert:round(R.substanz),ertragswert:round(R.ertrag),empfehlung:round(R.empfehlung),pv:round(R.pvWert),energie:round(R.energieWert),niessbrauch:round(R.niessWert),beleihungswert:round(R.beleihungswert),bwErtragswert:round(R.bwErtrag),bwSachwert:round(R.bwSachwert),bewirtschaftungBw:round(R.bwBewirt),kapitalisierungszinsBw:R.bwZins,minimalerZinsModell:R.bwZinsMin,alternativeGesamtReinertragsKapitalisierung:round(R.bwRein*K.barwertfaktor(R.bwZins,R.bwRnd)),fehler:check.hinweise.filter(h=>h.stufe==='fehler').map(h=>h.text)};
});
console.log(JSON.stringify({datum:'2026-09-30',kernSHA256:createHash('sha256').update(readFileSync(new URL('../../js/kern.js',import.meta.url))).digest('hex'),hinweis:'Synthetische Modell-Gegenbeispiele, keine Bewertung einer realen Immobilie. Die Vergleichsvarianten sind kein pauschaler Ersatzwert für ein konkretes Gutachten.',result},null,2));
