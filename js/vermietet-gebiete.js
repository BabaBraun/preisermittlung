/* ImmoApp — Gebietsliste der Kündigungssperrfristverordnung Baden-Württemberg als Daten (D59), ohne Seitenbezug
   In den Gemeinden der Liste beträgt die Kündigungssperrfrist nach einer Umwandlung in Wohnungseigentum fünf Jahre
   (§ 577a Abs. 2 BGB i. V. m. §§ 1, 2 KSpVO BW), sonst gilt die Bundesfrist von drei Jahren (§ 577a Abs. 1 BGB).
   - Fassung: KSpVO BW vom 16.12.2025, GBl. 2025 Nr. 146; in Kraft 01.01.2026, außer Kraft mit Ablauf des 31.12.2026 (§ 3).
   - Erfasst sind nur die Namen, die in der Rechtsprüfung am 03.10.2026 wörtlich aus dem GBl. gelesen wurden (Auszug, 25 von 130).
     Deshalb vollstaendig:false: Eine Gemeinde, die weder in „liste“ noch in „nichtEnthalten“ steht, bekommt GELB, nicht stillschweigend
     drei Jahre. Wer die vollständige Liste aus dem GBl. überträgt, setzt vollstaendig:true.
   - nichtEnthalten: geprüft, dass diese Gemeinden nicht in § 1 stehen (alle 130 Namen gelesen) — dort drei Jahre.
   - Der Entwurf ab 2027 (133 Gemeinden, 01.01.2027 bis 31.12.2029, Anhörung ab 22.09.2026) wird erst nach der Verkündung im GBl.
     übernommen. Bis dahin zeigt die App für Prüfdaten ab 01.01.2027 GELB „Gebietsliste nicht aktuell“.
   Neue Fassung: einen weiteren Eintrag in FASSUNGEN anlegen — der Code bleibt unverändert. */
(function(wurzel){
'use strict';
const FASSUNGEN=[
  {fundstelle:'GBl. 2025 Nr. 146',name:'Kündigungssperrfristverordnung BW vom 16.12.2025',gueltigAb:'2026-01-01',gueltigBis:'2026-12-31',jahre:5,anzahl:130,vollstaendig:false,
    liste:['Achern','Aitrach','Altbach','Asperg','Backnang','Bad Bellingen','Bad Krozingen','Bad Schussenried','Baienfurt','Böblingen','Ellhofen','Güglingen',
      'Gundelfingen','Häg-Ehrsberg','Heddesheim','Heidelberg','Heilbronn','Holzgerlingen','Hoßkirch','Hülben','Ittlingen','Jagsthausen','Kirchardt',
      'Massenbachhausen','Widdern'],
    nichtEnthalten:['Abstatt','Beilstein','Ilsfeld']}
];
/* Tabelle {gemeinde, gueltigAb, gueltigBis, fundstelle} — eine Zeile je Gemeinde und Fassung */
const GEMEINDEN=[].concat(...FASSUNGEN.map(f=>f.liste.map(g=>({gemeinde:g,gueltigAb:f.gueltigAb,gueltigBis:f.gueltigBis,fundstelle:f.fundstelle}))));
const ImmoVermietetGebiete={stand:'2026-10-03',fassungen:FASSUNGEN,gemeinden:GEMEINDEN,
  pruefenAm:'2026-12-15',pruefenText:'Neufassung KSpVO, Mietpreisbremse und Kappungsgrenze BW verkündet? Liste aktualisieren'};
wurzel.ImmoVermietetGebiete=ImmoVermietetGebiete;
if(typeof module==='object'&&module.exports) module.exports=ImmoVermietetGebiete;
})(typeof globalThis!=='undefined'?globalThis:this);
