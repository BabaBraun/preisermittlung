/* ImmoApp — Liegenschaftsverwaltung: Dokumente (ohne DOM, in Node testbar)
   Verträge, Protokolle, Bescheide, Nachweise je Liegenschaft; optional einer Einheit oder einem Mietvertrag
   zugeordnet. Die Datei liegt als Anhang in der Datenbank der Verwaltung (Speicher „anhaenge“) und reist mit der
   Datensicherung; hier stehen nur die Angaben dazu. Ein „gültig bis“ erscheint in den Fristen. */
(function(wurzel){
'use strict';
const V=wurzel.ImmoVerwaltung||(typeof require==='function'?require('./verwaltung.js'):null);
const {datumGueltig,tagNr,isoTag,plusMonate,datumDE}=V;

const KATEGORIEN=[['mietvertrag','Mietvertrag / Nachtrag'],['uebergabe','Übergabeprotokoll'],['nk','Nebenkostenabrechnung'],['bescheid','Bescheid (z. B. Grundsteuer)'],
  ['versicherung','Versicherung'],['energieausweis','Energieausweis'],['grundbuch','Grundbuch / Teilungserklärung'],['weg','WEG: Protokoll, Beschluss, Wirtschaftsplan'],
  ['rechnung','Rechnung / Angebot'],['pruefbericht','Prüf- und Wartungsbericht'],['korrespondenz','Schriftverkehr'],['sonstig','Sonstiges']];
const KAT=Object.fromEntries(KATEGORIEN);
/* Kategorie aus dem Dateinamen vorschlagen */
function kategorieVorschlag(name){
  const n=String(name||'').toLowerCase();
  if(/energieausweis|energie-?ausweis|geg|gmodg/.test(n)) return 'energieausweis';
  if(/mietvertrag|nachtrag|mv[_ -]/.test(n)) return 'mietvertrag';
  if(/übergabe|uebergabe|protokoll.*(einzug|auszug)|wohnungsübergabe/.test(n)) return 'uebergabe';
  if(/nebenkosten|betriebskosten|heizkosten|nk-?abrechnung/.test(n)) return 'nk';
  if(/bescheid|grundsteuer|abgaben/.test(n)) return 'bescheid';
  if(/versicherung|police|gebäudeversicherung/.test(n)) return 'versicherung';
  if(/grundbuch|teilungserkl|aufteilungsplan/.test(n)) return 'grundbuch';
  if(/eigentümerversammlung|beschluss|wirtschaftsplan|weg/.test(n)) return 'weg';
  if(/rechnung|angebot|invoice/.test(n)) return 'rechnung';
  if(/prüf|pruef|wartung|legionell|tüv|tuev|schornstein/.test(n)) return 'pruefbericht';
  return 'sonstig';
}
/* Energieausweise sind zehn Jahre gültig */
function gueltigVorschlag(kategorie,datum){ return kategorie==='energieausweis'&&datumGueltig(datum)?isoTag(tagNr(plusMonate(datum,120))-1):null; }

function fristen(l,stichtag,horizont){
  horizont=horizont||60;
  const grenze=isoTag(tagNr(stichtag)+horizont), frueh=isoTag(tagNr(stichtag)-90), aus=[];
  (l.dokumente||[]).forEach(d=>{
    if(!d.gueltigBis||d.gueltigBis>grenze||d.gueltigBis<frueh) return;
    aus.push({datum:d.gueltigBis,art:'dokument',titel:(d.gueltigBis<stichtag?'Dokument abgelaufen: ':'Dokument läuft ab: ')+(d.titel||'Dokument'),text:KAT[d.kategorie]||'',dokumentId:d.id});
  });
  aus.forEach(f=>{ f.liegenschaftId=l.id; f.liegenschaft=l.name||''; f.faellig=f.datum<=stichtag; });
  return aus;
}
function bereinigen(roh,l,zaehler,h){
  const {text,zahl,liste,ID}=h, eids=new Set((l.einheiten||[]).map(e=>e.id)), vids=new Set((l.vertraege||[]).map(v=>v.id));
  l.dokumente=liste(roh.dokumente,d=>typeof d.anhangId==='string'&&ID.test(d.anhangId)?{id:d.id,anhangId:d.anhangId,titel:text(d.titel,200)||'Dokument',
    kategorie:KAT[d.kategorie]?d.kategorie:'sonstig',datum:datumGueltig(d.datum)?d.datum:null,gueltigBis:datumGueltig(d.gueltigBis)?d.gueltigBis:null,
    einheitId:eids.has(d.einheitId)?d.einheitId:null,vertragId:vids.has(d.vertragId)?d.vertragId:null,
    name:text(d.name,200),typ:text(d.typ,80),size:zahl(d.size)||0,notiz:text(d.notiz,2000)}:null);
}

V.erweiterungRegistrieren(bereinigen);
const ImmoDokumente={KATEGORIEN,KAT,kategorieVorschlag,gueltigVorschlag,fristen,bereinigen};
wurzel.ImmoDokumente=ImmoDokumente;
if(typeof module==='object'&&module.exports) module.exports=ImmoDokumente;
})(typeof globalThis!=='undefined'?globalThis:this);
