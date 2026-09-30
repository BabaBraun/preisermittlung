// Ausschließlich fiktive Testdaten; keine Bewertung einer realen Immobilie.
import{readFileSync,writeFileSync}from'node:fs';import{randomUUID}from'node:crypto';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),K=require('../js/kern.js');
const schema=JSON.parse(readFileSync('ios/ImmoApp/Resources/formular.json'));
const house=JSON.parse(readFileSync('tests/fixtures/fall_haus.json')),apartment=JSON.parse(readFileSync('tests/fixtures/fall_etw.json'));
const now=Date.now()/1000-978307200;
const rows=[];
function add(name,base,changes,description){
 const fields={...schema.defaults,...base,...changes,pj_name:'TEST – '+name,ek_anschrift:'Fiktive Testadresse · '+name,ek_nutzung:description,native_testdata:true};
 const project={id:randomUUID().toUpperCase(),name:fields.pj_name,fields,attachments:{},updated:now+rows.length};
 const e={n:id=>K.zahlLesen(fields[id]),v:id=>String(fields[id]??''),an:id=>fields[id]===true};
 const{R,D}=K.bewerte(e,{jahr:2026});const price=K.pruefen(e,R,D),bw=K.pruefeBeleihung(e,R,D);
 rows.push({project,check:{name:project.name,preisStatus:price.status,beleihungsStatus:bw.status,preis:Math.round(R.empfehlung),begründung:description}});
}
add('Einfamilienhaus mit PV',house,{},'Fiktives EFH, 145 m², Garage und zusätzliche PV. Alle Quellen sind synthetische Testannahmen.');
add('Vermietete Eigentumswohnung',apartment,{ek_wohnflaeche:'78',ek_miete_wohnen:'8424',vw_preis:'3900',pv_aktiv:false,en_aktiv:false,bw_aktiv:false},'Fiktive vermietete ETW, 78 m². Vergleichs- und Ertragsansätze dienen ausschließlich dem Test.');
const type=schema.types['Mehrfamilienhaus · bis 6 WE'];
const multi={ek_typ:'Mehrfamilienhaus · bis 6 WE',ek_wohnflaeche:'360',ek_anz_we:'6',ek_gs_flaeche:'820',ek_brw:'350',ek_baujahr:'1998',bgfhg_e0:'160',bgfhg_e1:'160',bgfhg_e2:'160',bgfhg_e3:'0',nhkhg_base:type.nhk.join(', '),nhkhg_gnd:String(type.gnd),er_zins_basis:'3,2',markt_faktor:'1,08',er_mietrolle:true,pv_aktiv:false,en_aktiv:false,bw_aktiv:false,ek_miete_wohnen:'41040'};
for(let i=0;i<6;i++)Object.assign(multi,{['mr_bez'+i]:'TEST Wohnung '+(i+1),['mr_fl'+i]:'60',['mr_pm2'+i]:'9,5',['mr_pau'+i]:'0'});
add('Mehrfamilienhaus mit sechs Wohnungen',house,multi,'Fiktives MFH mit sechs Mieteinheiten und aktiver Mietrolle. 360 m² Wohnfläche, 41.040 € Jahresmiete.');
const old={ek_baujahr:'1910',nhkhg_rnd:'30',er_rnd_override:'30',en_aktiv:true,en_modus:'kosten',en_klasse:'H',en_kennwert:'280',en_markt_ansatz:'-45000',pv_aktiv:false,bw_aktiv:false};for(let i=0;i<8;i++)old['mod_p'+i]='0';
add('Sanierungsbedürftiges Altbauhaus',house,old,'Fiktiver Altbau mit expliziter Restnutzungsdauer und getrenntem Energiekosten-Szenario. Marktabschlag ist eine Testannahme.');
add('Wohnrecht und kurze Restnutzung',house,{pv_aktiv:false,en_aktiv:false,niess_aktiv:true,ni_art:'wohnrecht',ni_umfang:'teil',ni_miete:'4800',ni_leben:'12',ni_kapital_quelle:'Synthetisch festgelegte Laufzeit von 12 Jahren.',bw_rnd:'20',bw_kurzverfahren:'gesamt',bw_abbruch:'45000',bw_freilegung:'20',bw_abbruch_quelle:'Fiktiver Freilegungskostenansatz von 45.000 Euro nach 20 Jahren.'},'Fiktives Teilwohnrecht mit 12 Jahren Laufzeit und separatem Beleihungssonderfall bei 20 Jahren Restnutzung.');
add('Unvollständige Erstaufnahme',{}, {ek_modus:'haus',ek_stichtag:'2026-09-30',ek_wohnflaeche:'110',ek_baujahr:'1980'},'Absichtlich unvollständig: fehlende Marktdaten und Quellen sollen sichtbar als Entwurf erscheinen.');
const archive={version:1,projects:rows.map(r=>r.project),legacyMetadata:{}};
writeFileSync('beispiele/Testimmobilien.json',JSON.stringify(archive,null,2)+'\n');
writeFileSync('beispiele/Testimmobilien-Prüfung.json',JSON.stringify(rows.map(r=>r.check),null,2)+'\n');
if(rows.slice(0,5).some(r=>r.check.preisStatus!=='ok')||rows.at(-1).check.preisStatus==='ok')throw new Error('Unerwarteter Prüfstatus der Testfälle.');
console.log(rows.map(r=>r.check.name+': '+r.check.preisStatus+' / '+r.check.preis+' €').join('\n'));
