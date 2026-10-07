/* ImmoApp — Eckdaten aus Objektunterlagen übernehmen (D64), ohne Seitenbezug
   Wer die Objektunterlagen liest (Claude nach anleitung()), liefert eine Eckdaten-Datei (JSON mit „immoapp_eckdaten“: 1). Hier wird sie
   geprüft und in Feldwerte für eine NEUE Bewertung umgesetzt — bestehende Bewertungen ändert die Kachel nie.
   - Nur Felder aus FELDER. Namen von Personen gibt es dort nicht (Auftraggeber, Eigentümer, Mieter); Texte mit „Herr“, „Frau“,
     „Eheleute“ oder einem Geburtsdatum werden markiert und nicht vorausgewählt.
   - Je Wert Quelle (Unterlage, Seite) und „sicher“. Vorausgewählt sind nur sichere Werte mit Quelle, die zur Objektart passen und
     keine Warnung haben — alles andere hakt man selbst an.
   - Auswahlfelder nur mit den Werten der Bewertung (Groß- und Kleinschreibung egal). Die Listen sind Kopien aus index.html,
     src/base.js (Gebäudetypen), src/form.js (Objektarten, Bauteile, Geschosse der BGF), src/pwa.js (Unterlagen), src/rooms.js
     (Raumliste) und js/kern.js (Modernisierung) — tests/unit/uebernahme.test.mjs gleicht sie ab.
   - Zahlen: JSON-Zahl oder deutscher Text („142,5“; „1.250“ = 1250). Geschrieben werden sie ohne Tausenderpunkt mit Komma — so liest
     die Bewertung sie in jedem Feld richtig (ImmoKern.zahlLesen, auch bei Faktor- und Flächenfeldern).
   - Energieausweis: die Angaben fürs Exposé (ex_ea_*) werden in Aufnahmebogen und Objektdaten gespiegelt; Ausstellungsdatum,
     gültig bis und Primärenergie gehören zum Portal-Export (D50) und werden dort für die neue Bewertung hinterlegt (ziel 'portal'). */
(function(wurzel){
'use strict';
const KENNUNG='immoapp_eckdaten';
/* [Schlüssel in der Datei, Vordruck (src/form.js VORDRUCKE), Name, Modus] */
const OBJEKTARTEN=[['wohnhaus','wh_bgf','Wohnhaus','haus'],['wohnung','etw_vergleich','Eigentumswohnung','wohnung'],['gemischt','wgh_misch','Wohn- und Geschäftshaus','haus'],
  ['geschaeft','laden_buero_praxis','Laden / Büro / Praxis','haus'],['gewerbe','gewerbe_bgf','Gewerbe / Betrieb','haus']];
const TYPEN=['EFH freistehend · unterkellert, DG ausgebaut','EFH freistehend · unterkellert, DG nicht ausgeb.','EFH freistehend · unterkellert, Flachdach',
  'EFH freistehend · nicht unterkellert, DG ausgeb.','Doppel-/Reihenendhaus · unterkellert, DG ausgeb.','Reihenmittelhaus · unterkellert, DG ausgeb.',
  'Mehrfamilienhaus · bis 6 WE','Mehrfamilienhaus · 7–20 WE','Mehrfamilienhaus · über 20 WE','Wohn-/Geschäftshaus (Mischnutzung)',
  'Geschäftshaus mit Wohnungen','Geschäftshaus ohne Wohnungen','Bürogebäude · Massivbau','Betriebs-/Werkstattgebäude · eingeschossig',
  'Betriebs-/Werkstattgeb. · mehrgesch., o. Hallenanteil'];
const UNTERLAGEN=['Grundbuchauszug','Flurkarte / Lageplan','Bauzeichnungen / Grundrisse','Wohnflächenberechnung','Energieausweis','Teilungserklärung (WEG)',
  'Protokolle Eigentümerversammlung','Jahresabrechnung / Hausgeld','Mietverträge','Nebenkostenabrechnung','Grundsteuerbescheid','Nachweis Modernisierungen',
  'Baulastenauskunft','Altlastenauskunft'];
const BAUTEILE=['Kamin / Kachelofen','Wintergarten','PV-Anlage','Solarthermie','Sauna','Pool / Schwimmbad','Garage','Carport','Klimaanlage','Alarmanlage',
  'Markise','Gartenhaus','Fußbodenheizung','Smart Home','Zisterne','Aufzug'];
const MODERNISIERUNG=[['Dacherneuerung inkl. Wärmedämmung',4],['Fenster- und Außentürmodernisierung',2],['Leitungssysteme (Strom, Gas, Wasser, Abwasser)',2],
  ['Modernisierung der Heizungsanlage',2],['Wärmedämmung der Außenwände',4],['Modernisierung der Bäder',2],['Innenausbau (Decken, Fußböden, Treppen)',2],
  ['Wesentliche Verbesserung der Grundrissgestaltung',2]];
const BGF_GESCHOSSE=['Untergeschoss','Erdgeschoss','Obergeschoss','Dachgeschoss'], N_GESCH=6;
const RAUM_GESCHOSSE=['KG','UG','EG','1. OG','2. OG','3. OG','DG','Spitzboden'], N_RAEUME=40;
const ANRECHNUNG=[['voll','100 % — lichte Höhe ab 2 m'],['halb','50 % — lichte Höhe 1 bis unter 2 m'],['null','0 % — lichte Höhe unter 1 m'],
  ['wg','50 % — unbeheizter Wintergarten, Schwimmbad'],['bal','25 % — Balkon, Loggia, Terrasse (Regelfall)'],['balmax','50 % — Balkon, Terrasse (Höchstsatz, begründen)'],
  ['zub','0 % — Zubehörraum (Keller, Waschküche, Heizung, Garage)']];
const KLASSEN=['A+','A','B','C','D','E','F','G','H'];
const GRUPPEN=[['objekt','Objekt'],['grund','Grundstück, Grundbuch und Planungsrecht'],['gebaeude','Gebäude'],['flaechen','Flächen und Baujahr'],
  ['wohnung','Wohnung und Gemeinschaft'],['ertrag','Mieten und Kosten'],['energie','Energieausweis'],['ausstattung','Räume und Ausstattung'],
  ['modernisierung','Modernisierung (Umfang und Jahr je Bauteil)'],['texte','Beschreibungen (Entwurf)'],['unterlagen','Unterlagen liegen vor'],
  ['bauteile','Besondere Bauteile vorhanden']];

/* Feld: id (wie in der Bewertung), label, typ text|lang|zahl|betrag|jahr|wahl|check|datum, gruppe, x: einheit, optionen, nur (haus|wohnung),
   ganz, min, max, hinweis (für die Anleitung), ziel ('portal' = Portal-Export statt Bewertung) */
const FELDER=[];
const F=(id,label,typ,gruppe,x)=>FELDER.push(Object.assign({id,label,typ,gruppe},x||{}));
const JN=['ja','nein'];
F('ek_anschrift','Objektanschrift','text','objekt',{hinweis:'Straße Nr., PLZ Ort'});
F('ek_nutzung','Nutzung','text','objekt',{hinweis:'z. B. „EG Laden, OG Wohnen“'});
F('ek_wtyp','Wohnungstyp','wahl','objekt',{optionen:['Etagenwohnung','Erdgeschosswohnung','Dachgeschosswohnung','Maisonette','Penthouse','Apartment'],nur:'wohnung'});

F('ek_gs_flaeche','Grundstücksfläche','zahl','grund',{einheit:'m²',nur:'haus',min:1});
F('ek_brw','Bodenrichtwert','betrag','grund',{einheit:'€/m²',nur:'haus',min:1,hinweis:'nur aus einer Unterlage mit Stichtag des Bodenrichtwerts'});
F('ek_flst','Flurstück-Nr. / Bodenrichtwertzone','text','grund',{nur:'haus'});
[1,2].forEach(i=>{ let n=i===1?'II':'III';
  F('xgs'+i+'_label','Weiterer Grundstücksanteil '+n+': Bezeichnung','text','grund',{nur:'haus',hinweis:'z. B. Gartenland, Wegefläche'});
  F('xgs'+i+'_flaeche','Weiterer Grundstücksanteil '+n+': Fläche','zahl','grund',{einheit:'m²',nur:'haus',min:1});
  F('xgs'+i+'_brw','Weiterer Grundstücksanteil '+n+': Bodenrichtwert','betrag','grund',{einheit:'€/m²',nur:'haus'}); });
F('od_eigentum','Eigentumsform','wahl','grund',{optionen:['Alleineigentum','Miteigentum / Bruchteil','Wohnungseigentum (WEG)','Erbbaurecht']});
F('od_entwicklung','Entwicklungszustand','wahl','grund',{optionen:['baureifes Land','Rohbauland','Bauerwartungsland','Bauland (erschlossen)','Flächen der Land-/Forstwirtschaft']});
F('od_anz_flst','Anzahl Flurstücke','zahl','grund',{ganz:true,min:1});
F('od_flst_nrn','Flurstücknummern','text','grund',{hinweis:'z. B. 3285/1, 3285/6'});
F('od_grundbuch','Grundbuch (Amtsgericht, Grundbuch von)','text','grund');
F('od_gb_blatt','Grundbuchblatt','text','grund');
F('od_abt2','Abteilung II (Lasten und Beschränkungen)','text','grund',{hinweis:'ohne Namen der Berechtigten, z. B. „Wohnrecht für eine Person“'});
F('od_abt3','Abteilung III (Grundpfandrechte)','text','grund',{hinweis:'Art, Betrag und Gläubiger-Bank; keine Privatpersonen'});
F('od_erschliessung','Erschließung','wahl','grund',{optionen:['voll erschlossen, beitragsfrei','erschlossen, Beiträge offen','teilerschlossen','nicht erschlossen']});
F('od_denkmal','Denkmalschutz','wahl','grund',{optionen:['nein','ja (Kulturdenkmal)','Teil / Ensembleschutz']});
F('od_baulasten','Baulasten','text','grund');
F('od_altlasten','Altlasten','text','grund');
F('od_fnp','Flächennutzungsplan','text','grund');
F('od_bplan','Bebauungsplan','text','grund');
F('od_nutzungsart','Art der baulichen Nutzung','wahl','grund',{optionen:['WR – reines Wohngebiet','WA – allgemeines Wohngebiet','MI – Mischgebiet','MU – urbanes Gebiet',
  'GE – Gewerbegebiet','GI – Industriegebiet','Kerngebiet (MK)','Außenbereich § 35']});
F('od_grz_gfz','GRZ / GFZ','text','grund',{hinweis:'z. B. 0,35 / 0,7'});
F('od_ueberbau_zul','Überbaubare Grundstücksfläche zulässig','text','grund');
F('od_ueberbau_ist','Überbaute Fläche tatsächlich','text','grund');
F('od_plan_sonst','Sonstiges zum Planungsrecht','lang','grund');

F('od_gebart','Gebäudeart','text','gebaeude',{hinweis:'z. B. Einfamilienhaus, freistehend'});
F('od_bauweise','Bauweise','wahl','gebaeude',{optionen:['massiv','Mauerwerk verputzt','Stahlbeton-Skelett','Holzständer / Fertigbau','Mischbauweise','Fachwerk']});
F('hg_bauweise','Bauweise und Dach des Hauptgebäudes','text','gebaeude',{nur:'haus',hinweis:'z. B. massiv, Satteldach'});
F('hg_keller','Unterkellerung des Hauptgebäudes','wahl','gebaeude',{optionen:['ja','teilweise','nein'],nur:'haus'});
F('od_geschosse','Geschosse','text','gebaeude',{hinweis:'z. B. KG, EG, OG, DG'});
F('od_gewerbe_eh','Gewerbeeinheiten','text','gebaeude');
F('od_aufzug','Aufzug','wahl','gebaeude',{optionen:['nein','ja']});
F('od_heizung','Heizung','wahl','gebaeude',{optionen:['Gas-Zentralheizung','Öl-Zentralheizung','Fernwärme','Wärmepumpe','Pellet / Biomasse','Gas-Etagenheizung',
  'Nachtspeicher / dezentral','Einzelöfen']});
F('od_fenster','Fenster','wahl','gebaeude',{optionen:['Zweifachverglasung','Dreifachverglasung','Einfachverglasung (Altbestand)','Kastenfenster']});
F('od_gebflaeche','Gebäudegrundfläche','zahl','gebaeude',{einheit:'m²',min:1});

F('ek_wohnflaeche','Wohnfläche','zahl','flaechen',{einheit:'m²',min:1});
F('ek_nutzflaeche','Gewerbe- oder Nutzfläche','zahl','flaechen',{einheit:'m²',min:1});
F('ek_baujahr','Baujahr des Hauptgebäudes','jahr','flaechen');
F('ek_sanierung','Letzte Sanierung','jahr','flaechen');
F('ek_anz_we','Anzahl Wohneinheiten','zahl','flaechen',{ganz:true,min:0,max:999});
F('ek_anz_stell','Anzahl Stellplätze (außen und Garage)','zahl','flaechen',{ganz:true,min:0,max:999});

F('ek_mea','Miteigentumsanteil','text','wohnung',{nur:'wohnung',hinweis:'z. B. 78/1000'});
F('ek_etage','Etage / Lage im Haus','text','wohnung',{nur:'wohnung'});
F('ek_hausgeld','Hausgeld gesamt','betrag','wohnung',{einheit:'€ je Monat',nur:'wohnung'});
F('ek_hausgeld_nu','davon nicht umlagefähig (Verwaltung, Rücklage)','betrag','wohnung',{einheit:'€ je Monat',nur:'wohnung'});

F('ek_miete_wohnen','Nettokaltmiete Wohnen','betrag','ertrag',{einheit:'€ je Jahr',hinweis:'Jahresbetrag (12 × Monatsmiete)'});
F('ek_miete_gewerbe','Nettokaltmiete Gewerbe','betrag','ertrag',{einheit:'€ je Jahr',hinweis:'Jahresbetrag'});
F('ek_miete_stellplatz','Miete Außenstellplätze','betrag','ertrag',{einheit:'€ je Jahr',hinweis:'Jahresbetrag'});
F('ek_grundsteuer','Grundsteuer','betrag','ertrag',{einheit:'€ je Jahr'});

F('ex_ea_art','Art des Energieausweises','wahl','energie',{optionen:['Bedarfsausweis','Verbrauchsausweis','liegt nicht vor']});
F('ex_ea_wert','Endenergiebedarf bzw. -verbrauch','zahl','energie',{einheit:'kWh/(m²·a)'});
F('ex_ea_traeger','Wesentlicher Energieträger der Heizung','text','energie',{hinweis:'z. B. Erdgas, Heizöl, Strom (Wärmepumpe), Fernwärme'});
F('ex_ea_baujahr','Baujahr laut Energieausweis','jahr','energie');
F('ex_ea_klasse','Energieeffizienzklasse','wahl','energie',{optionen:KLASSEN,hinweis:'nur bei Wohngebäuden'});
F('ex_ea_strom','Endenergie Strom','zahl','energie',{einheit:'kWh/(m²·a)',hinweis:'nur bei Nichtwohngebäuden'});
F('ea_ausgestellt','Energieausweis ausgestellt am','datum','energie',{ziel:'portal',hinweis:'entscheidet, welche Angaben ab 2027 Pflicht sind'});
F('ea_gueltig_bis','Energieausweis gültig bis','datum','energie',{ziel:'portal'});
F('ea_primaer','Primärenergie laut Ausweis','zahl','energie',{einheit:'kWh/(m²·a)',ziel:'portal'});

F('au_zimmer','Anzahl Zimmer','zahl','ausstattung',{min:0,max:99});
F('au_baeder','Bäder und Duschbäder','zahl','ausstattung',{ganz:true,min:0,max:99});
F('au_gaeste_wc','Gäste-WC','wahl','ausstattung',{optionen:JN});
F('au_tageslichtbad','Tageslichtbad','wahl','ausstattung',{optionen:JN});
F('au_kueche','Küche','wahl','ausstattung',{optionen:['EBK vorhanden (verbleibt)','EBK vorhanden (wird entfernt)','keine EBK']});
F('au_keller','Keller','wahl','ausstattung',{optionen:['voll unterkellert','teilunterkellert','nicht unterkellert']});
F('au_dg','Dachgeschoss','wahl','ausstattung',{optionen:['ausgebaut','ausbaufähig','nicht ausgebaut','Flachdach']});
F('au_balkon','Balkon / Terrasse','text','ausstattung',{hinweis:'z. B. Balkon Süd 8 m²'});
F('au_heizung_art','Heizungsart','text','ausstattung',{hinweis:'z. B. Gas-Brennwert'});
F('au_heizung_bj','Heizung Baujahr / Fabrikat','text','ausstattung');
F('au_ww','Warmwasser','wahl','ausstattung',{optionen:['zentral über Heizung','dezentral (Durchlauferhitzer)','Solarthermie']});
F('au_fenster','Fenster (Material, Verglasung, Jahr)','text','ausstattung');
F('au_daemm_fassade','Dämmung Fassade','wahl','ausstattung',{optionen:['keine','teilweise','vorhanden (WDVS)','Kerndämmung']});
F('au_daemm_dach','Dämmung Dach / oberste Decke','wahl','ausstattung',{optionen:['keine','teilweise','vorhanden']});
F('au_aufzug','Aufzug (Aufnahmebogen)','wahl','ausstattung',{optionen:['nein','ja']});

/* Modernisierung wie im Aufnahmebogen: Umfang und Jahr je Bauteil (Fakten aus den Belegen). Die Punkte nach Anlage 2 ImmoWertV setzt
   die Bewertung daraus selbst (auUebertragen: vollständig = Höchstpunkte, nicht modernisiert = 0, teilweise entscheidet man selbst). */
MODERNISIERUNG.forEach(([n],i)=>{
  F('au_mod_u'+i,n+': Umfang','wahl','modernisierung',{optionen:['voll','teil','nein'],alias:{'vollständig erneuert':'voll','vollständig':'voll','teilweise':'teil','nicht modernisiert':'nein'},
    hinweis:'voll = vollständig erneuert, teil = teilweise, nein = nicht modernisiert; nur mit Beleg (Rechnung, Modernisierungsliste)'});
  F('au_mod_j'+i,n+': Jahr','jahr','modernisierung'); });

F('gebaeude_besch','Gebäudebeschreibung','lang','texte');
F('grundstueck_besch','Grundstücksbeschreibung','lang','texte');
F('modernisierung','Modernisierungen (Jahr und Maßnahme)','lang','texte');
F('rechte_lasten','Rechte und Lasten','lang','texte',{hinweis:'ohne Namen von Personen'});
F('vermietung_besch','Vermietung','lang','texte',{hinweis:'ohne Namen von Mietern'});

UNTERLAGEN.forEach((n,i)=>F('au_ul'+i,n,'check','unterlagen'));
BAUTEILE.forEach((n,i)=>F('au_bt'+i,n,'check','bauteile'));

const FELD={}; FELDER.forEach(f=>{ FELD[f.id]=f; });
/* Spiegelung des Energieausweises in Aufnahmebogen und Objektdaten (nur wenn das Exposé-Feld übernommen wird) */
const EA_SPIEGEL={
  ex_ea_art:w=>({au_energieausweis:w==='liegt nicht vor'?'liegt nicht vor':w+' liegt vor',od_energieausweis:w==='liegt nicht vor'?'nicht vorhanden':w}),
  ex_ea_wert:w=>({au_energiewert:w}),
  ex_ea_klasse:w=>({au_energieklasse:w,od_effizienz:w})};

/* ---------- Hilfen ---------- */
const s=v=>v==null?'':String(v);
const norm=v=>s(v).toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
function zahl(v){
  if(typeof v==='number') return isFinite(v)?v:NaN;
  if(typeof v!=='string') return NaN;
  let t=v.replace(/€|m²|qm|\s/g,'');
  if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t=t.replace(/\./g,'').replace(',','.');
  else if(/^-?\d+,\d+$/.test(t)) t=t.replace(',','.');
  else if(!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return parseFloat(t);
}
function deZahl(n,stellen){ let f=Math.pow(10,stellen==null?2:stellen); return String(Math.round(n*f)/f).replace('.',','); }
function anzeigeZahl(n,stellen){ return n.toLocaleString('de-DE',{maximumFractionDigits:stellen==null?2:stellen}); }
function datum(v){
  let t=s(v).trim(), m=t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if(m) t=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  let d=new Date(t+'T00:00:00Z'); return !isNaN(d)&&d.toISOString().slice(0,10)===t?t:'';
}
function deDatum(iso){ let m=s(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?m[3]+'.'+m[2]+'.'+m[1]:s(iso); }
const NAME_VERDACHT=/\b(Herrn?|Frau|Eheleute|Familie)\s+[A-ZÄÖÜ][a-zäöüß]|\bgeb\.\s*(am\s*)?\d|\bgeboren\b|\bgeb\.\s+[A-ZÄÖÜ]/;
function nameVerdacht(t){ return NAME_VERDACHT.test(s(t)); }
function wahlWert(f,v){
  let n=norm(v); if(!n) return '';
  let o=f.optionen.find(x=>norm(x)===n); if(o) return o;
  if(f.alias){ let k=Object.keys(f.alias).find(a=>norm(a)===n); if(k) return f.alias[k]; }
  if(/^[a-z]{2}$/.test(n)) o=f.optionen.find(x=>norm(x).startsWith(n+' ')||norm(x).endsWith('('+n+')'));   // Kürzel wie „WA“ oder „MK“
  return o||'';
}
function textListe(v,max){
  if(!Array.isArray(v)) v=v==null||v===''?[]:[v];
  return v.map(x=>x&&typeof x==='object'?s(x.text||x.beschreibung||''):s(x)).map(x=>x.trim().slice(0,600)).filter(Boolean).slice(0,max||50);
}
function modusVon(art){ let a=OBJEKTARTEN.find(x=>x[0]===art); return a?a[3]:''; }
function objektart(v){ let n=norm(v).replace(/ä/g,'ae'); let a=OBJEKTARTEN.find(x=>x[0]===n||norm(x[2])===norm(v)); return a?a[0]:''; }
function typWert(v){ let n=norm(v); return n?TYPEN.find(t=>norm(t)===n)||'':''; }

/* Ein Wert aus der Datei → {schreib, anzeige} oder {fehler} */
function wertLesen(f,v,heute){
  if(f.typ==='check'){
    let j=v===true||['ja','true','vorhanden','liegt vor'].includes(norm(v)), n=v===false||['nein','false'].includes(norm(v));
    if(!j&&!n) return {fehler:'ja oder nein erwartet'};
    return j?{schreib:true,anzeige:'ja'}:{leer:true};
  }
  if(f.typ==='text'||f.typ==='lang'){
    let t=s(v).replace(/\r\n?/g,'\n'); t=f.typ==='text'?t.replace(/\s+/g,' ').trim():t.trim();
    if(!t) return {fehler:'leer'};
    let max=f.typ==='text'?300:4000; if(t.length>max) return {fehler:'zu lang (höchstens '+max+' Zeichen)'};
    return {schreib:t,anzeige:t};
  }
  if(f.typ==='wahl'){
    let w=wahlWert(f,v); if(!w) return {fehler:'„'+s(v).slice(0,60)+'“ ist keiner der Werte der Bewertung ('+f.optionen.join(', ')+')'};
    return {schreib:w,anzeige:w};
  }
  if(f.typ==='datum'){
    let d=datum(v); if(!d) return {fehler:'Datum als JJJJ-MM-TT erwartet'};
    if(f.id==='ea_ausgestellt'&&heute&&d>heute) return {fehler:'liegt in der Zukunft'};
    return {schreib:d,anzeige:deDatum(d)};
  }
  let n=zahl(v); if(isNaN(n)) return {fehler:'Zahl erwartet'};
  if(f.typ==='jahr'){
    let bis=(parseInt(s(heute).slice(0,4))||2100)+5;
    if(!Number.isInteger(n)||n<1000||n>bis) return {fehler:'Jahr zwischen 1000 und '+bis+' erwartet'};
    return {schreib:String(n),anzeige:String(n)};
  }
  if(f.ganz&&!Number.isInteger(n)) return {fehler:'ganze Zahl erwartet'};
  let min=f.min==null?0:f.min, max=f.max==null?1e9:f.max;
  if(n<min||n>max) return {fehler:n<min?'zu klein (mindestens '+anzeigeZahl(min)+')':'zu groß (höchstens '+anzeigeZahl(max)+')'};
  return {schreib:deZahl(n),anzeige:anzeigeZahl(n)+(f.einheit?' '+f.einheit:f.typ==='betrag'?' €':'')};
}

/* Herkunft eines Eintrags: Quelle, sicher, Hinweis */
function herkunft(e){
  e=e&&typeof e==='object'?e:{};
  return {quelle:s(e.quelle).replace(/\s+/g,' ').trim().slice(0,300),sicher:e.sicher===true,hinweis:s(e.hinweis).replace(/\s+/g,' ').trim().slice(0,500)};
}
function vorwahl(e){ return !!(e.sicher&&e.quelle&&!e.warnungen.length); }

/* Geschoss der Bruttogrundfläche: 0 Untergeschoss, 1 Erdgeschoss, 2 Obergeschoss, 3 Dachgeschoss, sonst frei (4, 5) */
function geschossIndex(name){
  let n=norm(name).replace(/\.$/,'');
  if(/^(ug|kg|untergeschoss|kellergeschoss|keller|souterrain)$/.test(n)) return 0;
  if(/^(eg|erdgeschoss)$/.test(n)) return 1;
  if(/^(og|obergeschoss|1\. ?og|1\. ?obergeschoss)$/.test(n)) return 2;
  if(/^(dg|dachgeschoss)$/.test(n)) return 3;
  return -1;
}
/* Anrechnung nach WoFlV aus dem Raumnamen (wie rlVorschlagKey in src/rooms.js) */
function anrechnungVorschlag(name){
  let n=s(name).toLowerCase();
  if(/balkon|loggia|terrasse|dachgarten/.test(n)) return 'bal';
  if(/unbeheiz|schwimmbad|pool/.test(n)) return 'wg';
  if(/keller|waschk(ü|ue)che|heizungs|heizraum|garage|dachboden|bodenraum|trockenraum|au(ß|ss)erhalb/.test(n)) return 'zub';
  return 'voll';
}

/* ---------- Prüfen ----------
   o: {heute:'JJJJ-MM-TT', objektart (Auswahl in der Kachel, sonst aus der Datei)} */
function pruefen(d,o){
  o=o||{}; let heute=o.heute||new Date().toISOString().slice(0,10);
  if(!d||typeof d!=='object'||Array.isArray(d)) return {ok:false,fehler:'Die Datei enthält keine Eckdaten.'};
  if(d[KENNUNG]!==1) return {ok:false,fehler:d[KENNUNG]==null?'Das ist keine Eckdaten-Datei der ImmoApp (die Kennung „'+KENNUNG+'“ fehlt).'
    :'Diese Fassung der Eckdaten-Datei kennt die App nicht (Kennung '+s(d[KENNUNG]).slice(0,20)+').'};
  let verworfen=[], artDatei=objektart(d.objektart);
  if(d.objektart!=null&&d.objektart!==''&&!artDatei) verworfen.push({was:'Objektart',grund:'„'+s(d.objektart).slice(0,60)+'“ unbekannt (wohnhaus, wohnung, gemischt, geschaeft, gewerbe)'});
  let art=OBJEKTARTEN.some(a=>a[0]===o.objektart)?o.objektart:artDatei, modus=modusVon(art), typ=typWert(d.gebaeudetyp);
  if(d.gebaeudetyp&&!typ) verworfen.push({was:'Gebäudetyp',grund:'„'+s(d.gebaeudetyp).slice(0,80)+'“ ist keiner der Gebäudetypen der Bewertung'});
  const passt=(nur)=>!nur||!modus||nur===modus;
  const modusText=nur=>nur==='haus'?'gilt nur für Häuser — bei einer Wohnung nicht verwendet':'gilt nur für Wohnungen — bei einem Haus nicht verwendet';
  /* Werte */
  let eintraege=[], gesehen={}, werte=Array.isArray(d.werte)?d.werte:[];
  if(d.werte!=null&&!Array.isArray(d.werte)) verworfen.push({was:'werte',grund:'Liste erwartet'});
  werte.slice(0,500).forEach((w,i)=>{
    if(!w||typeof w!=='object'){ verworfen.push({was:'Wert '+(i+1),grund:'kein Eintrag'}); return; }
    let id=s(w.feld).trim(), f=FELD[id];
    if(!f){ verworfen.push({was:id||'Wert '+(i+1),grund:'Feld gibt es in der Liste nicht'}); return; }
    if(gesehen[id]){ verworfen.push({was:f.label,grund:'doppelt — der erste Wert gilt'}); gesehen[id].warnungen.push('In der Datei steht ein zweiter Wert — bitte prüfen.'); gesehen[id].vorwahl=false; return; }
    let r=wertLesen(f,w.wert,heute);
    if(r.fehler){ verworfen.push({was:f.label,grund:r.fehler}); return; }
    if(r.leer) return;
    let e=Object.assign({key:'f:'+id,feld:id,label:f.label,gruppe:f.gruppe,typ:f.typ,ziel:f.ziel||'feld',schreib:r.schreib,anzeige:r.anzeige,warnungen:[]},herkunft(w));
    if(!e.quelle) e.warnungen.push('Ohne Quelle.');
    if(!e.sicher) e.warnungen.push('Als unsicher markiert.');
    if(!passt(f.nur)) e.warnungen.push(modusText(f.nur));
    if((f.typ==='text'||f.typ==='lang')&&nameVerdacht(e.schreib)) e.warnungen.push('Enthält vielleicht einen Namen oder ein Geburtsdatum.');
    if(f.id==='ea_gueltig_bis'&&e.schreib<heute) e.warnungen.push('Der Energieausweis ist abgelaufen.');
    e.vorwahl=vorwahl(e); gesehen[id]=e; eintraege.push(e);
  });
  // Gebäudetyp passend zum Modus
  let typWarnung=typ&&modus==='wohnung'?'Der Gebäudetyp gilt nur für Häuser.':'';
  /* Geschosse der Bruttogrundfläche */
  let geschosse=[], belegt={}, frei=4;
  (Array.isArray(d.geschosse)?d.geschosse:[]).slice(0,20).forEach((g,i)=>{
    if(!g||typeof g!=='object'){ verworfen.push({was:'Geschoss '+(i+1),grund:'kein Eintrag'}); return; }
    let name=s(g.geschoss||g.name).replace(/\s+/g,' ').trim().slice(0,40);
    if(!name){ verworfen.push({was:'Geschoss '+(i+1),grund:'Name des Geschosses fehlt'}); return; }
    let idx=geschossIndex(name);
    if(idx<0||belegt[idx]){ if(frei>=N_GESCH){ verworfen.push({was:'Geschoss „'+name+'“',grund:'höchstens zwei weitere Geschosse'}); return; } idx=frei++; }
    let l=g.laenge==null||g.laenge===''?0:zahl(g.laenge), b=g.breite==null||g.breite===''?0:zahl(g.breite);
    let z=g.zusatz!=null&&g.zusatz!==''?zahl(g.zusatz):g.flaeche!=null&&g.flaeche!==''&&!(l>0&&b>0)?zahl(g.flaeche):0;
    if([l,b,z].some(x=>isNaN(x)||x<0)||l>300||b>300||z>50000){ verworfen.push({was:'Geschoss „'+name+'“',grund:'Länge, Breite oder Fläche ungültig'}); return; }
    if((l>0)!==(b>0)){ verworfen.push({was:'Geschoss „'+name+'“',grund:'Länge und Breite nur zusammen'}); return; }
    let flaeche=l*b+z;
    if(!(flaeche>0)){ verworfen.push({was:'Geschoss „'+name+'“',grund:'keine Fläche'}); return; }
    belegt[idx]=true;
    let e=Object.assign({key:'g:'+idx,index:idx,name:idx<4?BGF_GESCHOSSE[idx]:name,laenge:l,breite:b,zusatz:z,flaeche,warnungen:[],
      anzeige:(l>0?anzeigeZahl(l)+' × '+anzeigeZahl(b)+' m'+(z>0?' + '+anzeigeZahl(z)+' m²':'')+' = ':'')+anzeigeZahl(flaeche)+' m²'},herkunft(g));
    if(!e.quelle) e.warnungen.push('Ohne Quelle.');
    if(!e.sicher) e.warnungen.push('Als unsicher markiert.');
    if(modus==='wohnung') e.warnungen.push(modusText('haus'));
    e.vorwahl=vorwahl(e); geschosse.push(e);
  });
  geschosse.sort((a,b)=>a.index-b.index);
  /* Räume für die Raumliste (WoFlV) */
  let raeume=[], rl=Array.isArray(d.raeume)?d.raeume:[];
  rl.slice(0,200).forEach((r,i)=>{
    if(!r||typeof r!=='object'){ verworfen.push({was:'Raum '+(i+1),grund:'kein Eintrag'}); return; }
    let name=s(r.name).replace(/\s+/g,' ').trim().slice(0,60), fl=zahl(r.flaeche);
    if(!name){ verworfen.push({was:'Raum '+(i+1),grund:'Name fehlt'}); return; }
    if(isNaN(fl)||fl<=0||fl>1000){ verworfen.push({was:'Raum „'+name+'“',grund:'Fläche fehlt oder ungültig'}); return; }
    if(raeume.length>=N_RAEUME){ verworfen.push({was:'Raum „'+name+'“',grund:'höchstens '+N_RAEUME+' Räume'}); return; }
    let e=Object.assign({key:'r:'+raeume.length,name,flaeche:fl,warnungen:[]},herkunft(r));
    let gsch=RAUM_GESCHOSSE.find(x=>norm(x)===norm(r.geschoss))||'';
    if(r.geschoss&&!gsch) e.warnungen.push('Geschoss „'+s(r.geschoss).slice(0,20)+'“ unbekannt — bleibt leer.');
    e.geschoss=gsch;
    let an=s(r.anrechnung).trim().toLowerCase(), ak=ANRECHNUNG.find(x=>x[0]===an);
    if(an&&!ak) e.warnungen.push('Anrechnung „'+s(r.anrechnung).slice(0,20)+'“ unbekannt — aus dem Namen vorgeschlagen.');
    e.anrechnung=ak?ak[0]:anrechnungVorschlag(name); e.anrechnungVorgeschlagen=!ak;
    e.anzeige=anzeigeZahl(fl)+' m² · '+ANRECHNUNG.find(x=>x[0]===e.anrechnung)[1].split(' — ')[0];
    if(!e.quelle) e.warnungen.push('Ohne Quelle.');
    if(!e.sicher) e.warnungen.push('Als unsicher markiert.');
    e.vorwahl=vorwahl(e); raeume.push(e);
  });
  return {ok:true,objekt:s(d.objekt).replace(/\s+/g,' ').trim().slice(0,120),objektart:art,objektartDatei:artDatei,modus,typ,typWarnung,
    eintraege,geschosse,raeume,verworfen,widersprueche:textListe(d.widersprueche),fehlt:textListe(d.fehlt),hinweise:textListe(d.hinweise),
    unterlagen:textListe(d.unterlagen,100)};
}

/* ---------- Ausgewählte Werte → Felder der neuen Bewertung ----------
   wahl: {key: true|false}; fehlt ein Schlüssel, gilt die Vorauswahl. */
function gewaehlt(e,wahl){ return wahl&&Object.prototype.hasOwnProperty.call(wahl,e.key)?!!wahl[e.key]:!!e.vorwahl; }
function anwenden(erg,wahl){
  let felder={}, portal={}, raeume=[], n=0;
  (erg.eintraege||[]).forEach(e=>{ if(!gewaehlt(e,wahl)) return; n++;
    if(e.ziel==='portal'){ portal[{ea_ausgestellt:'ausgestellt',ea_gueltig_bis:'gueltigBis',ea_primaer:'primaer'}[e.feld]]=e.schreib; return; }
    felder[e.feld]=e.schreib; });
  Object.keys(EA_SPIEGEL).forEach(id=>{ if(felder[id]!=null) Object.assign(felder,EA_SPIEGEL[id](felder[id])); });
  (erg.geschosse||[]).forEach(g=>{ if(!gewaehlt(g,wahl)) return; n++;
    felder['bgfhg_l'+g.index]=deZahl(g.laenge); felder['bgfhg_b'+g.index]=deZahl(g.breite); felder['bgfhg_e'+g.index]=deZahl(g.zusatz);
    if(g.index>=4) felder['bgfhg_n'+g.index]=g.name; });
  (erg.raeume||[]).forEach(r=>{ if(!gewaehlt(r,wahl)) return; n++;
    raeume.push({name:r.name,gesch:r.geschoss,fl:deZahl(r.flaeche),faktor:r.anrechnung,src:'',manuell:true}); });
  return {felder,portal,raeume,n};
}
function zaehlen(erg,wahl){
  let alle=[].concat(erg.eintraege||[],erg.geschosse||[],erg.raeume||[]);
  return {gesamt:alle.length,gewaehlt:alle.filter(e=>gewaehlt(e,wahl)).length,unsicher:alle.filter(e=>!e.sicher||!e.quelle).length,
    warnungen:alle.filter(e=>e.warnungen.length).length,verworfen:(erg.verworfen||[]).length};
}

/* ---------- Anleitung für Claude (Knopf in der Kachel; als Projektanweisung oder in den Chat kopieren) ---------- */
function feldZeile(f){
  let art=f.typ==='wahl'?'einer von: '+f.optionen.map(o=>'"'+o+'"').join(', '):f.typ==='check'?'true, wenn ja':f.typ==='jahr'?'Jahr (ganze Zahl)'
    :f.typ==='datum'?'Datum "JJJJ-MM-TT"':f.typ==='lang'?'Text, mehrere Sätze':f.typ==='text'?'Text':'Zahl'+(f.ganz?' (ganze)':'')+(f.einheit?' in '+f.einheit:f.typ==='betrag'?' in €':'');
  return '- '+f.id+' — '+f.label+': '+art+(f.nur?' (nur '+(f.nur==='haus'?'Häuser':'Wohnungen')+')':'')+(f.hinweis?'; '+f.hinweis:'');
}
function anleitung(){
  return ['ImmoApp — Eckdaten aus Objektunterlagen (Datei-Format „'+KENNUNG+'“, Fassung 1)','',
    'Aufgabe: Lies die beigefügten Objektunterlagen (z. B. Grundbuchauszug, Flurkarte, Baubeschreibung, Wohnflächenberechnung, Grundrisse, '
      +'Energieausweis, Teilungserklärung, Mietaufstellung, Modernisierungsnachweise) und gib die Eckdaten als JSON-Datei in genau dem Format unten zurück '
      +'(Dateiname „Eckdaten <Objekt>.json“). Die ImmoApp legt daraus eine neue Bewertung an; jeder Wert wird dort vor der Übernahme mit seiner Quelle angezeigt.','',
    'Regeln',
    '1. Nur Werte, die in den Unterlagen stehen. Nichts schätzen, nichts aus anderen Quellen ergänzen. Was fehlt, unter "fehlt" nennen.',
    '2. Zu jedem Wert die Quelle: Unterlage und Seite, z. B. "Wohnflächenberechnung vom 12.03.1998, S. 2".',
    '3. "sicher": true nur, wenn der Wert eindeutig und gut lesbar dasteht; sonst false und den Grund in "hinweis".',
    '4. Widersprechen sich Unterlagen (z. B. zwei Wohnflächen), den belastbareren Wert nehmen und den Widerspruch unter "widersprueche" beschreiben.',
    '5. Keine Namen von Personen (Eigentümer, Mieter, Berechtigte, private Gläubiger) und keine Geburtsdaten — z. B. "Wohnrecht für eine Person". Banken als Gläubiger dürfen genannt werden.',
    '6. Zahlen als JSON-Zahl mit Punkt (142.5), Jahre als ganze Zahl, Daten als "JJJJ-MM-TT". Mieten als Nettokaltmiete im JAHR.',
    '7. Auswahlfelder nur mit einem der angegebenen Werte, genau so geschrieben. Nur Felder aus der Liste unten.',
    '8. Modernisierungen nur mit Beleg (Rechnung, Modernisierungsliste, Energieausweis): je Bauteil Umfang und Jahr. Punkte vergibt die App selbst.','',
    'Format',
    '{',
    '  "'+KENNUNG+'": 1,',
    '  "objekt": "Musterweg 7, 74360 Ilsfeld",',
    '  "objektart": "wohnhaus",            // wohnhaus | wohnung | gemischt (Wohn- und Geschäftshaus) | geschaeft | gewerbe',
    '  "gebaeudetyp": "Mehrfamilienhaus · bis 6 WE",   // nur bei Häusern, einer der Gebäudetypen unten',
    '  "unterlagen": ["Grundbuchauszug vom 02.09.2026 (4 Seiten)", "Wohnflächenberechnung vom 12.03.1998"],',
    '  "werte": [',
    '    { "feld": "ek_wohnflaeche", "wert": 142.5, "quelle": "Wohnflächenberechnung, S. 2", "sicher": true, "hinweis": "" },',
    '    { "feld": "od_heizung", "wert": "Wärmepumpe", "quelle": "Energieausweis, S. 1", "sicher": true }',
    '  ],',
    '  "geschosse": [ { "geschoss": "Erdgeschoss", "laenge": 10.49, "breite": 8.74, "quelle": "Grundriss EG", "sicher": true } ],',
    '  "raeume": [ { "name": "Wohnzimmer", "geschoss": "EG", "flaeche": 24.3, "anrechnung": "voll", "quelle": "Wohnflächenberechnung, S. 2", "sicher": true } ],',
    '  "widersprueche": ["Wohnfläche: Exposé 150 m², Wohnflächenberechnung 142,5 m² — Berechnung übernommen"],',
    '  "fehlt": ["Bodenrichtwert", "Baulastenauskunft"],',
    '  "hinweise": []',
    '}',
    '(Die Kommentare mit // gehören nicht in die Datei.)','',
    'Gebäudetypen: '+TYPEN.map(t=>'"'+t+'"').join(', '),'',
    'Geschosse (Bruttogrundfläche nach Außenmaßen, nur Häuser): '+BGF_GESCHOSSE.join(', ')+' und bis zu zwei weitere mit eigenem Namen; '
      +'Länge und Breite in m, Erker oder Anbauten als "zusatz" in m²; nur die Fläche bekannt: "flaeche" in m².',
    'Räume (Wohnflächenberechnung nach WoFlV, höchstens '+N_RAEUME+'): "geschoss" einer von '+RAUM_GESCHOSSE.map(g=>'"'+g+'"').join(', ')
      +'; "flaeche" = Grundfläche in m²; "anrechnung" einer von '+ANRECHNUNG.map(a=>'"'+a[0]+'" ('+a[1]+')').join(', ')+'.','',
    'Felder']
    .concat(...GRUPPEN.map(([g,t])=>['','## '+t].concat(FELDER.filter(f=>f.gruppe===g).map(feldZeile)))).join('\n');
}

const ImmoUebernahmeRegeln={KENNUNG,OBJEKTARTEN,TYPEN,UNTERLAGEN,BAUTEILE,MODERNISIERUNG,BGF_GESCHOSSE,N_GESCH,RAUM_GESCHOSSE,N_RAEUME,ANRECHNUNG,KLASSEN,
  GRUPPEN,FELDER,FELD,EA_SPIEGEL,pruefen,anwenden,gewaehlt,zaehlen,anleitung,zahl,deZahl,datum,deDatum,nameVerdacht,wahlWert,geschossIndex,
  anrechnungVorschlag,objektart,modusVon,typWert};
wurzel.ImmoUebernahmeRegeln=ImmoUebernahmeRegeln;
if(typeof module==='object'&&module.exports) module.exports=ImmoUebernahmeRegeln;
})(typeof globalThis!=='undefined'?globalThis:this);
