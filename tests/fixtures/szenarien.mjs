/* Synthetische Bewertungsfälle für die Tests (keine echten Objekte, keine echten Personen).
   Jeder Fall: optional ein Vordruck (id aus VORDRUCKE), danach Feldwerte so, wie ein Nutzer sie eintippt
   (deutsche Schreibweise, Tausenderpunkte, Komma). */
import { readFileSync } from 'node:fs';

const lade = n => JSON.parse(readFileSync(new URL('./' + n, import.meta.url), 'utf8'));
export const FALL_HAUS = lade('fall_haus.json');
export const FALL_ETW = lade('fall_etw.json');

const mit = (basis, extra) => Object.assign({}, basis, extra);

export const SZENARIEN = [
  { name: 'haus_referenz', felder: FALL_HAUS },
  { name: 'etw_referenz', felder: FALL_ETW },
  {
    name: 'haus_anbau_niessbrauch_vergleich', felder: mit(FALL_HAUS, {
      anbau_aktiv: true, an_baujahr: '1995', bgfan_e0: '42', bgfan_e1: '42', an_aussen: '5.000',
      niess_aktiv: true, ni_art: 'niessbrauch', ni_alter: '74', ni_leben:'15,6', ni_geschlecht: 'w', ni_grundst: '450', ni_nuk: '20',
      vw_aktiv: true, vw_preis: '3.200', gew_vergleich: '30',
      en_modus: 'kosten', en_markt_ansatz:'-12000', en_preis_kwh: '0,14', en_zins: '3', en_jahre: '20',
      wk_bez0: 'Feuchtigkeit im Keller', wk_val0: '12.000', wk_bez1: 'Carport', wk_val1: '-3.000', xemp1_val: '2.500'
    })
  },
  {
    name: 'haus_wohnrecht_erbbaurecht', felder: mit(FALL_HAUS, {
      niess_aktiv: true, ni_art: 'wohnrecht', ni_alter: '81', ni_leben:'4,9', ni_umfang:'teil', ni_geschlecht: 'm', ni_miete: '7.200', ni_nuk: '10',
      eb_aktiv: true, eb_zins_eur: '1.800', eb_restlaufzeit: '55', eb_verzinsung: '0', eb_abschlag: '5',
      bw_ansatz: 'ertrag', verhandlung: '8', gewichtung: '0.4', pv_aktiv: false, en_aktiv: false
    })
  },
  {
    name: 'haus_leibrente', felder: mit(FALL_HAUS, {
      niess_aktiv: true, ni_art: 'leibrente', ni_rente: '650', ni_leben: '12', ni_zins: '4', pv_aktiv: false
    })
  },
  {
    name: 'gewerbe_mietrolle', vordruck: 'laden_buero_praxis', felder: {
      ek_stichtag: '2026-09-01', ek_gs_flaeche: '820', ek_brw: '290', ek_baujahr: '1978', ek_wohnflaeche: '0', ek_nutzflaeche: '410',
      ek_anz_we: '3', ek_anz_stell: '4', bgfhg_e0: '230', bgfhg_e1: '230', bgfhg_e2: '180',
      er_mietrolle: true, mr_fl0: '180', mr_pm20: '11,50', mr_fl1: '95', mr_pm21: '9,80', mr_pau2: '60',
      er_bwmodus: true, er_bw_verw_we: '420', er_bw_verw_sp: '48', er_bw_inst_m2: '13,50', er_bw_inst_sp: '100', er_bw_mietausfall: '4', er_bw_nuk: '1.200',
      er_gewerbe: '5', er_zins_basis: '5,5', markt_faktor: '0,95', mod_p1: '2', mod_p3: '2',
      re_kaufpreis: '1.250.000', gewichtung: '0.3', verhandlung: '6'
    }
  },
  { name: 'leer', felder: {} },
  {
    name: 'extremwerte', felder: mit(FALL_HAUS, {
      ek_baujahr: '1850', er_zins_basis: '0', ek_gs_abschlag: '120', ek_brw: '-50', ek_wohnflaeche: '0',
      verhandlung: '0', ek_miete_wohnen: '0', pv_zins: '0', mod_p0: '9', en_kennwert: '0', en_klasse: 'H'
    })
  },
  {
    name: 'etw_hausgeld_niessbrauch', felder: mit(FALL_ETW, {
      ek_hausgeld_nu: '180', er_rnd_override: '35', niess_aktiv: true, ni_art: 'niessbrauch', ni_alter: '68', ni_leben:'15,5', ni_miete:'8424', ni_geschlecht: 'm',
      pl_markt: '3.600', pl_quelle: 'Marktbericht (synthetisch)'
    })
  },
  {
    name: 'haus_mietrolle_zahlenformate', felder: mit(FALL_HAUS, {
      ek_gs_flaeche: '1.234,56', ek_brw: '412,5', bpi: '131,0', bpi_faktor: '1.406', pv_erloes: '0,082', pv_ertrag_kwh: '10.500',
      er_mietrolle: true, mr_fl0: '72,5', mr_pm20: '9,95', mr_fl1: '68', mr_pm21: '10,20', mr_pau2: '45',
      re_kaufpreis: '495.000', re_sanierung: '35.000', pl_markt: '3.450'
    })
  }
];

// Nur vollständig angegebene synthetische Testfälle erhalten synthetische Nachweise. Keine Produkt-Sonderbehandlung.
const NACHWEISE=lade('nachweise.json');
SZENARIEN.forEach(s=>{if(s.name!=='leer'){s.felder=Object.assign({},NACHWEISE,s.felder);if(s.name==='gewerbe_mietrolle'){Object.assign(s.felder,{bpi:'131',bpi_faktor:'1.406',hg_aussen:'0',hg_garage:'0'});}}});
