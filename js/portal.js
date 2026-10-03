/* ImmoApp — Portal-Export (ohne DOM, in Node testbar), D39
   Immobilienportale (z. B. ImmoScout24, Immowelt) und Maklersoftware tauschen Objekte im XML-Austauschformat OpenImmo aus:
   eine XML-Datei mit den Objekten, daneben die Bilder, zusammen in einem ZIP. Elementfolge und Wertelisten hier folgen dem
   Schema der Version 1.2.7d (Mai 2026); erzeugte Beispieldateien wurden gegen dieses Schema geprüft. Das Schema selbst liegt
   nicht im Repository (Lizenz des Herausgebers), die Tests prüfen Aufbau und Werte unabhängig davon.
     objekt(f, o)          Felder einer gesicherten Bewertung (data.fields) → Objekt für den Export
     bildAuswahl(f, fotos) Fotos wie im Exposé: gewählte (ex_fotos) oder alle Objektfotos, Titelbild zuerst
     pruefen(obj)          fehlt etwas, das Portale verlangen? Pflichtangaben zum Energieausweis nach § 87 GModG
     xml(objekte, anbieter, o) → Text der XML-Datei
   Zahlen mit Dezimalpunkt (xsd:decimal), Texte maskiert, leere Angaben weggelassen.
   Datenschutz: Ohne Freigabe der Anschrift gehen nur PLZ und Ort hinaus (keine Straße, keine Koordinaten).
   Namen von Kunden kommen nicht vor — Ansprechpartner ist der Berater. */
(function(wurzel){
'use strict';
const Kern=typeof module==='object'&&module.exports?require('./kern.js'):wurzel.ImmoKern;
const FORMAT='1.2.7', SENDER='ImmoApp', SENDER_VERSION='1.0';

/* ---------- XML ---------- */
function esc(s){
  return String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function attr(a){ return Object.keys(a||{}).filter(k=>a[k]!=null&&a[k]!=='').map(k=>' '+k+'="'+esc(a[k])+'"').join(''); }
/* Knoten: [name, inhalt (Text oder Liste von Knoten), attribute, pflicht]; leere Knoten ohne Attribute entfallen,
   außer sie sind Pflicht (z. B. <aktion/>) */
function ser(k,t){
  if(!k) return '';
  const name=k[0], inhalt=k[1], a=attr(k[2]), pflicht=!!k[3], ein='  '.repeat(t);
  if(Array.isArray(inhalt)){
    const kinder=inhalt.map(x=>ser(x,t+1)).join('');
    if(kinder) return ein+'<'+name+a+'>\n'+kinder+ein+'</'+name+'>\n';
    return a||pflicht?ein+'<'+name+a+'/>\n':'';
  }
  const s=inhalt==null?'':String(inhalt);
  if(s!=='') return ein+'<'+name+a+'>'+esc(s)+'</'+name+'>\n';
  return a||pflicht?ein+'<'+name+a+'/>\n':'';
}
/* Dezimalzahl mit Punkt; nur positive Werte (sonst leer = Angabe entfällt) */
function dez(x,st){ x=+x; if(!(x>0)||!isFinite(x)) return ''; const f=Math.pow(10,st==null?2:st); return String(Math.round(x*f)/f); }
const zwei=n=>String(n).padStart(2,'0');
function isoDatum(s){ s=String(s||''); return /^\d{4}-\d{2}-\d{2}$/.test(s)&&isFinite(new Date(s+'T00:00:00'))?s:''; }
function isoZeit(d){ return d.getFullYear()+'-'+zwei(d.getMonth()+1)+'-'+zwei(d.getDate())+'T'+zwei(d.getHours())+':'+zwei(d.getMinutes())+':'+zwei(d.getSeconds()); }

/* ---------- Kennungen ----------
   openimmo_obid / openimmo_anid nach dem Aufbau der Formatbeschreibung: Kennbuchstabe (O Objekt, A Anbieter), drei Zeichen
   Kennung, Zeitstempel JJJJMMTThhmmssttt, zehn Zeichen Zufall bzw. Prüfsumme. Die Objekt-Kennung entsteht fest aus der
   Projekt-Id — so erkennt das Portal das Objekt beim nächsten Export wieder (Änderung statt Neuanlage). */
function stempel(ms){ const d=new Date(ms); return d.getUTCFullYear()+zwei(d.getUTCMonth()+1)+zwei(d.getUTCDate())+zwei(d.getUTCHours())+zwei(d.getUTCMinutes())+zwei(d.getUTCSeconds())+String(d.getUTCMilliseconds()).padStart(3,'0'); }
function pruefsumme(s,n){
  let h1=0x811c9dc5, h2=0x9e3779b9, out='';
  for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,16777619)>>>0; h2=Math.imul(h2^c,2246822519)>>>0; }
  while(out.length<n){ out+=(h1>>>0).toString(36)+(h2>>>0).toString(36); h1=Math.imul(h1^h2,16777619)>>>0; h2=Math.imul(h2+0x6d2b79f5,2246822519)>>>0; }
  return out.slice(0,n).toUpperCase();
}
function projektZeit(id){ const m=/^p(\d{12,14})/.exec(String(id||'')); return m?+m[1]:0; }
function obid(projektId){ const id=String(projektId||''); return 'OIAP'+stempel(projektZeit(id)||0)+pruefsumme(id,10); }
function anid(jetzt,zufall){ return 'AIAP'+stempel(+(jetzt||new Date()))+String(zufall||'').replace(/[^A-Za-z0-9]/g,'').padEnd(10,'0').slice(0,10).toUpperCase(); }
/* Objektnummer, die im Portal neben dem Inserat steht (änderbar) */
function objektnrVorschlag(projektId){ const ms=projektZeit(projektId); return 'IA-'+(ms?ms.toString(36):pruefsumme(String(projektId||''),8)).toUpperCase(); }
function dateiTeil(s){ return String(s||'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'objekt'; }

/* ---------- Felder lesen ----------
   wie die Bewertung: Beträge, Flächen und kWh mit Tausenderpunkt („1.250“ = 1250), sonst Dezimalpunkt („3.5“ Zimmer) */
function leser(f){
  f=f&&typeof f==='object'?f:{};
  const v=id=>{ const x=f[id]; if(x==null||typeof x==='boolean') return ''; const s=String(x).trim(); return /^[–-]$/.test(s)?'':s; };
  return {v, n:id=>Kern.zahlLesen(v(id),true), z:id=>Kern.zahlLesen(v(id),false)};
}
/* „Hauptstraße 12, 71717 Beilstein“ → Straße, Hausnummer, PLZ, Ort */
function anschrift(a){
  a=String(a||'').replace(/\s+/g,' ').trim();
  const m=/\b(\d{5})\s+([^,]+)/.exec(a);
  let plz='', ort='', vorn=a;
  if(m){ plz=m[1]; ort=m[2].trim(); vorn=a.slice(0,m.index).replace(/[\s,]+$/,''); }
  else { const t=a.split(',').map(x=>x.trim()).filter(Boolean); if(t.length>1){ ort=t[t.length-1]; vorn=t[0]; } }
  const s=/^(.*?\S)\s+(\d+\s?[a-zA-Z]?(?:\s?[-\/]\s?\d+\s?[a-zA-Z]?)?)$/.exec(vorn);
  return {plz, ort, strasse:s?s[1]:vorn, hausnummer:s?s[2].replace(/\s+/g,''):''};
}

/* ---------- Objektart ---------- */
const ARTEN=[
  ['haus:EINFAMILIENHAUS','Einfamilienhaus'],['haus:ZWEIFAMILIENHAUS','Zweifamilienhaus'],['haus:DOPPELHAUSHAELFTE','Doppelhaushälfte'],
  ['haus:REIHENEND','Reihenendhaus'],['haus:REIHENMITTEL','Reihenmittelhaus'],['haus:BUNGALOW','Bungalow'],['haus:VILLA','Villa'],
  ['haus:BAUERNHAUS','Bauernhaus'],['haus:MEHRFAMILIENHAUS','Mehrfamilienhaus'],
  ['wohnung:ETAGE','Etagenwohnung'],['wohnung:ERDGESCHOSS','Erdgeschosswohnung'],['wohnung:DACHGESCHOSS','Dachgeschosswohnung'],
  ['wohnung:MAISONETTE','Maisonette'],['wohnung:PENTHOUSE','Penthouse'],['wohnung:APARTMENT','Apartment'],['wohnung:SOUTERRAIN','Souterrainwohnung'],
  ['zinshaus_renditeobjekt:MEHRFAMILIENHAUS','Mehrfamilienhaus als Anlage'],['zinshaus_renditeobjekt:WOHN_UND_GESCHAEFTSHAUS','Wohn- und Geschäftshaus'],
  ['zinshaus_renditeobjekt:GESCHAEFTSHAUS','Geschäftshaus'],['buero_praxen:BUEROHAUS','Bürohaus'],['buero_praxen:PRAXISHAUS','Praxishaus'],
  ['hallen_lager_prod:WERKSTATT','Werkstatt / Betrieb'],['hallen_lager_prod:HALLE','Halle']];
const TYP_ATTR={haus:'haustyp',wohnung:'wohnungtyp',buero_praxen:'buero_typ',hallen_lager_prod:'hallen_typ',zinshaus_renditeobjekt:'zins_typ'};
const HAUS=[[/^EFH freistehend/,'haus:EINFAMILIENHAUS'],[/^Doppel-\/Reihenendhaus/,'haus:DOPPELHAUSHAELFTE'],[/^Reihenmittelhaus/,'haus:REIHENMITTEL'],
  [/^Mehrfamilienhaus/,'haus:MEHRFAMILIENHAUS'],[/^(Wohn-\/Geschäftshaus|Geschäftshaus mit Wohnungen)/,'zinshaus_renditeobjekt:WOHN_UND_GESCHAEFTSHAUS'],
  [/^Geschäftshaus/,'zinshaus_renditeobjekt:GESCHAEFTSHAUS'],[/^Bürogebäude/,'buero_praxen:BUEROHAUS'],[/^Betriebs/,'hallen_lager_prod:WERKSTATT']];
const WOHNUNG={'Etagenwohnung':'wohnung:ETAGE','Erdgeschosswohnung':'wohnung:ERDGESCHOSS','Dachgeschosswohnung':'wohnung:DACHGESCHOSS',
  'Maisonette':'wohnung:MAISONETTE','Penthouse':'wohnung:PENTHOUSE','Apartment':'wohnung:APARTMENT'};
function artVorschlag(L){
  if(L.v('ek_modus')==='wohnung') return WOHNUNG[L.v('ek_wtyp')]||'wohnung:ETAGE';
  const t=L.v('ek_typ'), h=HAUS.find(x=>x[0].test(t));
  return h?h[1]:'haus:EINFAMILIENHAUS';
}
function kategorie(schluessel){
  const k=ARTEN.find(x=>x[0]===schluessel)?schluessel:'haus:EINFAMILIENHAUS', [element,typ]=k.split(':');
  const anlage=element==='zinshaus_renditeobjekt';
  const wohnen=element==='haus'||element==='wohnung'||(anlage&&/MEHRFAMILIEN|WOHN_UND/.test(typ));
  const gewerbe=element==='buero_praxen'||element==='hallen_lager_prod'||(anlage&&/GESCHAEFTS/.test(typ));
  return {schluessel:k,element,typ,attr:TYP_ATTR[element],wohnen,gewerbe,anlage,name:ARTEN.find(x=>x[0]===k)[1]};
}

/* ---------- Energieausweis: wie das Exposé (src/expose.js, exEnergie/exPflichtFehlt), aus gespeicherten Feldern ---------- */
function traegerText(h){
  h=String(h||'').toLowerCase(); if(!h) return '';
  if(/fernw/.test(h)) return 'Fernwärme'; if(/wärmepumpe|waermepumpe/.test(h)) return 'Strom (Wärmepumpe)';
  if(/pellet|holz|biomasse|hackschnitzel/.test(h)) return 'Holz (Pellets)'; if(/öl|oel/.test(h)) return 'Heizöl';
  if(/gas/.test(h)) return 'Erdgas'; if(/strom|nachtspeicher|elektro/.test(h)) return 'Strom'; return '';
}
/* Energieträger als Kennwort der Wertelisten (befeuerung); unbekannt → '' */
function traegerKennung(t){
  t=String(t||'').toLowerCase(); if(!t) return '';
  if(/fernw/.test(t)) return 'FERN'; if(/nahw/.test(t)) return 'NAHWAERME'; if(/bhkw|blockheiz/.test(t)) return 'BLOCK';
  if(/luft/.test(t)&&/pumpe/.test(t)) return 'LUFTWP'; if(/erdwärme|erdwaerme|sole|grundwasser/.test(t)) return 'ERDWAERME';
  if(/pellet/.test(t)) return 'PELLET'; if(/holz|hackschnitzel|scheit/.test(t)) return 'HOLZ';
  if(/flüssiggas|fluessiggas/.test(t)) return 'FLUESSIGGAS'; if(/öl|oel/.test(t)) return 'OEL'; if(/gas/.test(t)) return 'GAS';
  if(/kohle/.test(t)) return 'KOHLE'; if(/solar/.test(t)) return 'SOLAR';
  if(/strom|elektr|nachtspeicher|wärmepumpe|waermepumpe/.test(t)) return 'ELEKTRO';
  return '';
}
/* Jahrgang des Energieausweises (OpenImmo 1.2.7d, Element jahrgang). D50: Ausweise ab 01.01.2027 folgen § 87 GModG in der Fassung
   von Art. 2 des Gesetzes vom 23.07.2026 (BGBl. 2026 I Nr. 226) — OpenImmo-Wert '2026' (seit 1.2.7d, Mai 2026). */
const JAHRGAENGE=[['','aus dem Ausstellungsdatum'],['2008','vor dem 01.05.2014 ausgestellt (abgelaufen)'],['2014','ab 01.05.2014 bis 31.12.2026 ausgestellt'],
  ['2026','ab 01.01.2027 ausgestellt (neues Recht)'],['ohne','kein Energieausweis vorhanden'],['nicht_noetig','nicht erforderlich (kleines Gebäude bis 50 m²; Baudenkmal nur bis 31.12.2026)']];
const EA_NEU='2027-01-01';
function energie(L,e){
  e=e||{};
  let art=L.v('ex_ea_art');
  if(!art){ const a=L.v('au_energieausweis'), o=L.v('od_energieausweis');
    art=/Bedarf/.test(a)?'Bedarfsausweis':/Verbrauch/.test(a)?'Verbrauchsausweis':/nicht/.test(a)?'liegt nicht vor':
        /Bedarf/.test(o)?'Bedarfsausweis':/Verbrauch/.test(o)?'Verbrauchsausweis':''; }
  const t=L.v('ek_typ'), wohn=L.v('ek_modus')==='wohnung'||!/^(Geschäftshaus ohne|Bürogebäude|Betriebs)/.test(t);
  const traeger=L.v('ex_ea_traeger')||traegerText(L.v('au_heizung_art'));
  const ausgestellt=isoDatum(e.ausgestellt);
  let jahrgang=e.jahrgang||'';
  if(!jahrgang) jahrgang=art==='liegt nicht vor'?'ohne':ausgestellt?(ausgestellt<'2014-05-01'?'2008':ausgestellt>=EA_NEU?'2026':'2014'):'';
  return {art, wohn, wert:Kern.zahlLesen(L.v('ex_ea_wert')||L.v('au_energiewert'),true), strom:Kern.zahlLesen(L.v('ex_ea_strom'),true),
    traeger, kennung:traegerKennung(traeger)||traegerKennung(L.v('au_heizung_art')),
    bj:L.v('ex_ea_baujahr')||(L.z('ek_baujahr')>0?L.v('ek_baujahr'):''),
    klasse:L.v('ex_ea_klasse')||L.v('au_energieklasse')||L.v('od_effizienz'),
    ausgestellt, gueltigBis:isoDatum(e.gueltigBis)||(ausgestellt?zehnJahre(ausgestellt):''), gueltigBisGeschaetzt:!isoDatum(e.gueltigBis)&&!!ausgestellt,
    primaer:Kern.zahlLesen(String(e.primaer==null?'':e.primaer),true), jahrgang};
}
/* Ausweis gilt zehn Jahre (§ 79 Abs. 3 GModG): ausgestellt + 10 Jahre − 1 Tag */
function zehnJahre(iso){ const d=new Date(iso+'T00:00:00Z'); if(!isFinite(d)) return ''; d.setUTCFullYear(d.getUTCFullYear()+10); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); }
/* Ausweis nach neuem Recht? Maßgeblich ist allein das Ausstellungsdatum (§ 87 n. F., § 112 Abs. 3 n. F. GModG) */
function energieNeu(E){ return !!E&&(E.ausgestellt?E.ausgestellt>=EA_NEU:E.jahrgang==='2026'); }
/* Pflichtangaben in Immobilienanzeigen. Bis 31.12.2026 und für vorher ausgestellte Ausweise: Art, Endenergie (Nichtwohngebäude
   Wärme und Strom), Energieträger, bei Wohngebäuden Baujahr und Klasse (§ 87 GModG a. F., ab 2027 § 112 Abs. 3 und 4 n. F.).
   Ab 01.01.2027 ausgestellte Ausweise: Ausweisart nach § 81 oder § 82, Ausstellungsdatum, Primärenergie in kWh/(m²·a),
   Effizienzklasse und Baujahr (auch bei Nichtwohngebäuden), Energieträger (§ 87 n. F.). Ab 2027 braucht die App dafür das
   Ausstellungsdatum. heute = Tag der Anzeige (ISO). */
function energiePflicht(E,heute){
  heute=isoDatum(heute)||new Date().toISOString().slice(0,10);
  if(!/Bedarf|Verbrauch/.test(E.art)) return E.art?[]:['Art des Energieausweises (oder „liegt nicht vor“)'];
  const f=[];
  if(energieNeu(E)){
    if(!E.ausgestellt) f.push('Ausstellungsdatum des Energieausweises');
    if(!(E.primaer>0)) f.push('Primärenergie laut Energieausweis');
    if(!E.klasse) f.push('Energieeffizienzklasse');
    if(!E.bj) f.push('Baujahr laut Energieausweis');
    if(!E.traeger) f.push('wesentlicher Energieträger');
    return f;
  }
  if(!(E.wert>0)) f.push(E.wohn?'Endenergiewert':'Endenergiewert Wärme');
  if(!E.wohn&&!(E.strom>0)) f.push('Endenergiewert Strom');
  if(!E.traeger) f.push('wesentlicher Energieträger');
  if(E.wohn&&!E.bj) f.push('Baujahr laut Energieausweis');
  if(E.wohn&&!E.klasse) f.push('Energieeffizienzklasse');
  if(heute>=EA_NEU&&!E.ausgestellt) f.push('Ausstellungsdatum des Energieausweises (ab 01.01.2027 entscheidet es über die Pflichtangaben)');
  return f;
}
/* Hinweise zum Energieausweis: [{stufe:'rot'|'gelb', text}] — Gültigkeit (§ 79 Abs. 3), Ausnahmen (§ 79 Abs. 4), Ausweisart */
function energieHinweise(E,heute,o){
  heute=isoDatum(heute)||new Date().toISOString().slice(0,10); o=o||{}; const l=[];
  if(E.jahrgang==='2008') l.push({stufe:'rot',text:'Vor dem 01.05.2014 ausgestellte Energieausweise sind abgelaufen (zehn Jahre, § 79 Abs. 3 GModG) — für den Verkauf einen neuen ausstellen lassen.'});
  else if(/Bedarf|Verbrauch/.test(E.art)&&E.gueltigBis&&E.gueltigBis<heute) l.push({stufe:'rot',text:'Energieausweis abgelaufen (gültig bis '+E.gueltigBis.split('-').reverse().join('.')+') — für den Verkauf ist ein gültiger Ausweis nötig (§ 79 Abs. 3, § 80 Abs. 3 GModG).'});
  if(/Bedarf|Verbrauch/.test(E.art)&&!E.ausgestellt) l.push({stufe:heute>=EA_NEU?'rot':'gelb',text:'Ausstellungsdatum des Energieausweises eintragen — es bestimmt Gültigkeit und, ab 01.01.2027, die Pflichtangaben in Anzeigen.'});
  if(E.jahrgang==='nicht_noetig'&&heute>=EA_NEU) l.push({stufe:o.denkmal?'rot':'gelb',text:'Seit 01.01.2027 brauchen auch Baudenkmäler einen Energieausweis; ausgenommen bleiben kleine Gebäude bis 50 m² Nutzfläche (§ 79 Abs. 4 GModG).'});
  if(energieNeu(E)&&/Verbrauch/.test(E.art)&&!E.wohn) l.push({stufe:'gelb',text:'Verbrauchsausweise gibt es seit 01.01.2027 nur für reine Wohngebäude (§ 82 Abs. 1 GModG) — Ausweis prüfen.'});
  if(E.art==='liegt nicht vor'&&E.jahrgang!=='nicht_noetig') l.push({stufe:'gelb',text:'Beim Verkauf muss ein Energieausweis vorliegen und spätestens bei der Besichtigung vorgelegt werden (§ 80 Abs. 3 und 4 GModG).'});
  return l;
}
/* Zeile mit den Pflichtangaben für Aushang, Social Media und Exposé-Texte */
function energieZeile(E){
  if(E.art==='liegt nicht vor') return 'Ein Energieausweis liegt nicht vor.';
  if(!/Bedarf|Verbrauch/.test(E.art)) return '';
  const bed=/Bedarf/.test(E.art), z=v=>(+v).toLocaleString('de-DE',{maximumFractionDigits:1}), dat=s=>s?s.split('-').reverse().join('.'):'';
  if(energieNeu(E)) return [(bed?'Energieausweis nach § 81 GModG (Bedarf)':'Energieausweis nach § 82 GModG (Verbrauch)'),E.ausgestellt?'ausgestellt am '+dat(E.ausgestellt):'',
    E.primaer>0?'Primärenergie '+z(E.primaer)+' kWh/(m²·a)':'',E.klasse?'Klasse '+E.klasse:'',E.bj?'Baujahr '+E.bj:'',E.traeger?'Energieträger '+E.traeger:''].filter(Boolean).join(' · ');
  return [E.art,(E.wohn?(bed?'Endenergiebedarf ':'Endenergieverbrauch ')+(E.wert>0?z(E.wert)+' kWh/(m²·a)':''):'Wärme '+(E.wert>0?z(E.wert):'–')+', Strom '+(E.strom>0?z(E.strom):'–')+' kWh/(m²·a)'),
    E.traeger?'Energieträger '+E.traeger:'',E.wohn&&E.bj?'Baujahr '+E.bj:'',E.wohn&&E.klasse?'Klasse '+E.klasse:''].filter(Boolean).join(' · ');
}

/* ---------- Texte: wie die Vorschläge des Exposés ---------- */
function ausstattungText(L){
  const z=[], w=L.v;
  if(w('au_zimmer')) z.push(w('au_zimmer')+' Zimmer');
  if(w('au_baeder')) z.push(w('au_baeder')+(/^1$/.test(w('au_baeder'))?' Bad':' Bäder')+(w('au_tageslichtbad')==='ja'?', Tageslichtbad':''));
  if(w('au_gaeste_wc')==='ja') z.push('Gäste-WC');
  const k=w('au_kueche'); if(/verbleibt/.test(k)) z.push('Einbauküche (verbleibt)'); else if(/entfernt/.test(k)) z.push('Einbauküche vorhanden (wird nicht übernommen)');
  if(w('au_keller')&&!/nicht/.test(w('au_keller'))) z.push(w('au_keller').replace(/^./,c=>c.toUpperCase()));
  const dg=w('au_dg'); if(dg==='ausgebaut') z.push('Dachgeschoss ausgebaut'); else if(dg==='ausbaufähig') z.push('Dachgeschoss ausbaufähig');
  if(w('au_balkon')) z.push(w('au_balkon'));
  if(w('au_heizung_art')) z.push('Heizung: '+w('au_heizung_art')+(w('au_heizung_bj')?' ('+w('au_heizung_bj')+')':''));
  const ww=w('au_ww'); if(ww) z.push('Warmwasser '+ww.replace('zentral über Heizung','zentral über die Heizung'));
  if(w('au_fenster')) z.push('Fenster: '+w('au_fenster'));
  const fa=w('au_daemm_fassade'); if(/vorhanden|Kern/.test(fa)) z.push('Fassadendämmung'+(/WDVS/.test(fa)?' (WDVS)':/Kern/.test(fa)?' (Kerndämmung)':'')); else if(fa==='teilweise') z.push('Fassade teilweise gedämmt');
  const da=w('au_daemm_dach'); if(da==='vorhanden') z.push('Dach bzw. oberste Geschossdecke gedämmt'); else if(da==='teilweise') z.push('Dach teilweise gedämmt');
  const el=w('au_elektro'); if(el==='zeitgemäß') z.push('Elektrik zeitgemäß'); else if(el==='teilerneuert') z.push('Elektrik teilerneuert');
  if(w('au_aufzug')==='ja') z.push('Aufzug');
  const ba=w('au_barriere'); if(ba==='weitgehend') z.push('Weitgehend barrierefrei'); else if(ba==='teilweise') z.push('Teilweise barrierefrei');
  const st=L.z('ek_anz_stell'); if(st>0) z.push(w('ek_anz_stell')+(st===1?' Stellplatz':' Stellplätze'));
  let t=z.map(x=>'• '+x).join('\n');
  if(w('modernisierung')) t+=(t?'\n\n':'')+'Modernisierungen: '+w('modernisierung');
  return t;
}
/* Etage aus „2. OG mit Balkon“, „EG“, „1. Obergeschoss“ — nur wenn eindeutig */
function etage(s){
  s=String(s||'');
  const m=/(\d{1,2})\s*\.?\s*(OG|Obergeschoss|Etage|Stock)/i.exec(s); if(m) return +m[1];
  if(/\b(EG|Erdgeschoss|Hochparterre)\b/i.test(s)) return 0;
  return null;
}

/* ---------- Bilder: Auswahl wie im Exposé ---------- */
function bildAuswahl(f,fotos){
  const L=leser(f), alle=(Array.isArray(fotos)?fotos:[]).filter(p=>p&&p.id&&typeof p.data==='string');
  let ids, v=L.v('ex_fotos');
  if(!v) ids=alle.filter(p=>p.cat==='objekt').map(p=>p.id);
  else { try{ const a=JSON.parse(v); ids=Array.isArray(a)?alle.filter(p=>a.includes(p.id)).map(p=>p.id):[]; }catch(e){ ids=[]; } }
  const titel=ids.includes(L.v('ex_titelbild'))?L.v('ex_titelbild'):(ids[0]||'');
  return alle.filter(p=>ids.includes(p.id)).sort((a,b)=>(b.id===titel)-(a.id===titel))
    .map(p=>({id:p.id,cat:p.cat,titel:String(p.caption||'').trim(),istTitel:p.id===titel,format:/^data:image\/png/.test(p.data)?'png':'jpg'}));
}

/* ---------- Objekt ----------
   o = {projektId, geaendert (ms), kontakt:{name,funktion,tel,mail,firma}, einstellung:{nr, adresse (true/false), art, ausgestellt,
        gueltigBis, jahrgang}, fotos:[{id,cat,caption,data}] oder null (nur Prüfung), aktion: ''|'CHANGE'|'DELETE', heute} */
function objekt(f,o){
  o=o||{}; const L=leser(f), e=o.einstellung||{}, K=o.kontakt||{};
  const a=anschrift(L.v('ek_anschrift')), kat=kategorie(e.art||artVorschlag(L));
  const frei=typeof e.adresse==='boolean'?e.adresse:L.v('ex_adresse')==='voll';
  const nr=String(e.nr||'').trim()||objektnrVorschlag(o.projektId);
  const E=energie(L,e);
  const lat=Kern.zahlLesen(L.v('au_lat'),false), lon=Kern.zahlLesen(L.v('au_lon'),false);
  const prov=L.v('ex_provision');
  const namen=String(K.name||'').trim().split(/\s+/).filter(Boolean);
  const bilder=o.fotos?bildAuswahl(f,o.fotos).map((b,i)=>({id:b.id,datei:dateiTeil(nr)+'-'+zwei(i+1)+'.'+b.format,format:b.format,
    titel:b.titel||(b.istTitel?'Titelbild':'Bild '+(i+1)),gruppe:b.istTitel?'TITELBILD':b.cat==='karte'?'KARTEN_LAGEPLAN':'BILD'})):[];
  const keller=L.v('au_keller'), heute=isoDatum(o.heute)||new Date().toISOString().slice(0,10);
  return {
    projektId:String(o.projektId||''), nr, obid:obid(o.projektId), aktion:o.aktion||'',
    stand:o.geaendert>0?new Date(o.geaendert).toISOString().slice(0,10):heute,
    kategorie:kat,
    geo:{plz:a.plz,ort:a.ort,strasse:frei?a.strasse:'',hausnummer:frei?a.hausnummer:'',frei,
      lat:frei&&lat&&lon&&Math.abs(lat)<=90&&Math.abs(lon)<=180?lat:null,lon:frei&&lat&&lon&&Math.abs(lat)<=90&&Math.abs(lon)<=180?lon:null,
      etage:kat.element==='wohnung'?etage(L.v('ek_etage')):null},
    kontakt:{nachname:namen.length?namen[namen.length-1]:'',vorname:namen.slice(0,-1).join(' '),name:namen.join(' '),
      funktion:String(K.funktion||'').trim(),tel:String(K.tel||'').trim(),mail:String(K.mail||'').trim(),firma:String(K.firma||'').trim()},
    preis:L.n('vm_preis')||L.n('ex_preis'),
    hausgeld:kat.element==='wohnung'?L.n('ek_hausgeld'):0,
    provision:{text:prov,pflichtig:!!prov&&!/provisionsfrei|^0([,.]0+)?\s*%?$/i.test(prov),mitMwst:/inkl/i.test(prov)&&/mwst|ust/i.test(prov)},
    flaechen:{wohn:L.n('ek_wohnflaeche'),nutz:L.n('ek_nutzflaeche'),grund:kat.element==='wohnung'?0:L.n('ek_gs_flaeche'),
      zimmer:L.z('au_zimmer'),baeder:L.z('au_baeder'),stell:L.z('ek_anz_stell'),we:L.z('ek_anz_we')},
    ausstattung:{ebk:/verbleibt/.test(L.v('au_kueche')),befeuerung:E.kennung,aufzug:L.v('au_aufzug')==='ja',barrierefrei:L.v('au_barriere')==='weitgehend',
      keller:/^voll/.test(keller)?'JA':/^teil/.test(keller)?'TEIL':/^nicht/.test(keller)?'NEIN':'',gaestewc:L.v('au_gaeste_wc')==='ja'},
    baujahr:L.z('ek_baujahr')>0?L.v('ek_baujahr'):'',
    energie:E, heute,
    texte:{titel:L.v('ex_titel')||(kat.name+(a.ort?' in '+a.ort:'')),dreizeiler:L.v('ex_untertitel'),
      lage:L.v('ex_text_lage')||[L.v('lage_mikro'),L.v('lage_makro')].filter(Boolean).join('\n\n'),
      ausstattung:L.v('ex_text_ausstattung')||ausstattungText(L),
      objekt:L.v('ex_text_objekt')||[L.v('gebaeude_besch'),L.v('grundstueck_besch')].filter(Boolean).join('\n\n'),
      sonst:L.v('ex_text_sonst')},
    verfuegbar:L.v('ex_frei'), denkmal:/ja|Ensemble/.test(L.v('od_denkmal')),
    bilder, bilderGeprueft:!!o.fotos
  };
}

/* ---------- Prüfung: was Portale verlangen ---------- */
function pruefen(x,anbieter){
  const fehler=[], hinweise=[];
  if(anbieter&&!String(anbieter.firma||'').trim()) fehler.push('Firma des Anbieters (Einstellungen oben)');
  if(!x.geo.plz) fehler.push('Postleitzahl in der Anschrift (Eckdaten)');
  if(!x.geo.ort) fehler.push('Ort in der Anschrift (Eckdaten)');
  if(!x.kontakt.nachname) fehler.push('Name des Ansprechpartners');
  if(!x.kontakt.mail&&!x.kontakt.tel) fehler.push('E-Mail oder Telefon des Ansprechpartners');
  energiePflicht(x.energie,x.heute).forEach(t=>fehler.push(t+' (Pflichtangabe nach § 87 GModG)'));
  energieHinweise(x.energie,x.heute,{denkmal:x.denkmal}).forEach(h=>(h.stufe==='rot'?fehler:hinweise).push(h.text));
  if(!(x.preis>0)) hinweise.push('Kein Preis — im Portal steht „Preis auf Anfrage“.');
  if(x.bilderGeprueft&&!x.bilder.length) hinweise.push('Keine Bilder ausgewählt (Exposé → Fotos).');
  if(!x.texte.objekt) hinweise.push('Keine Objektbeschreibung.');
  if(x.kategorie.wohnen&&!(x.flaechen.wohn>0)) hinweise.push('Wohnfläche fehlt.');
  if(!x.provision.text) hinweise.push('Keine Angabe zur Käuferprovision.');
  if(x.geo.frei) hinweise.push('Die vollständige Anschrift wird im Portal gezeigt — nur mit Einverständnis des Eigentümers.');
  return {ok:!fehler.length,fehler,hinweise};
}

/* ---------- XML ---------- */
function energieKnoten(E){
  if(!E.art&&!E.jahrgang) return null;
  if(!/Bedarf|Verbrauch/.test(E.art)) return E.jahrgang?['energiepass',[['jahrgang',E.jahrgang]]]:null;
  const bed=/Bedarf/.test(E.art), w=E.wohn;
  return ['energiepass',[
    ['epart',bed?'BEDARF':'VERBRAUCH'],['gueltig_bis',E.gueltigBis],
    ['energieverbrauchkennwert',!bed&&w?dez(E.wert,1):''],['endenergiebedarf',bed&&w?dez(E.wert,1):''],
    ['primaerenergietraeger',E.kennung||E.traeger],['primaerenergiebedarf',energieNeu(E)&&E.primaer>0?dez(E.primaer,1).replace(',','.'):''],
    ['stromwert',w?'':dez(E.strom,1)],['waermewert',w?'':dez(E.wert,1)],
    ['wertklasse',w?E.klasse:''],['baujahr',E.bj],['ausstelldatum',E.ausgestellt],['jahrgang',E.jahrgang],
    ['gebaeudeart',w?'wohn':'nichtwohn']]];
}
function immobilieKnoten(x){
  const G=x.geo, K=x.kontakt, F=x.flaechen, A=x.ausstattung, T=x.texte, k=x.kategorie;
  return ['immobilie',[
    ['objektkategorie',[
      ['nutzungsart',null,{WOHNEN:String(k.wohnen),GEWERBE:String(k.gewerbe),ANLAGE:k.anlage?'true':''}],
      ['vermarktungsart',null,{KAUF:'true',MIETE_PACHT:'false'}],
      ['objektart',[[k.element,null,{[k.attr]:k.typ},true]]]]],
    ['geo',[['plz',G.plz,null,true],['ort',G.ort],
      G.lat!=null?['geokoordinaten',null,{breitengrad:String(Math.round(G.lat*1e6)/1e6),laengengrad:String(Math.round(G.lon*1e6)/1e6)}]:null,
      ['strasse',G.strasse],['hausnummer',G.hausnummer],['land',null,{iso_land:'DEU'}],['etage',G.etage!=null?String(G.etage):'']]],
    ['kontaktperson',[['email_zentrale',K.mail],['email_direkt',K.mail],['tel_durchw',K.tel],
      ['name',K.nachname,null,true],['vorname',K.vorname],['position',K.funktion],['firma',K.firma]]],
    ['preise',[x.preis>0?['kaufpreis',dez(x.preis,2)]:['kaufpreis','0',{auf_anfrage:'true'}],
      ['hausgeld',dez(x.hausgeld,2)],
      ['provisionspflichtig',x.provision.text?String(x.provision.pflichtig):''],
      ['aussen_courtage',x.provision.text,x.provision.text?{mit_mwst:String(x.provision.mitMwst)}:null],
      ['waehrung',null,{iso_waehrung:'EUR'}]]],
    ['flaechen',[['wohnflaeche',dez(F.wohn,2)],['nutzflaeche',dez(F.nutz,2)],['grundstuecksflaeche',dez(F.grund,2)],
      ['anzahl_zimmer',dez(F.zimmer,1)],['anzahl_badezimmer',dez(F.baeder,0)],
      ['anzahl_stellplaetze',F.stell>=1?String(Math.round(F.stell)):''],['anzahl_wohneinheiten',F.we>1?String(Math.round(F.we)):'']]],
    ['ausstattung',[A.ebk?['kueche',null,{EBK:'true'}]:null,A.befeuerung?['befeuerung',null,{[A.befeuerung]:'true'}]:null,
      A.aufzug?['fahrstuhl',null,{PERSONEN:'true'}]:null,A.barrierefrei?['barrierefrei','true']:null,
      A.keller?['unterkellert',null,{keller:A.keller}]:null,A.gaestewc?['gaestewc','true']:null]],
    ['zustand_angaben',[['baujahr',x.baujahr],energieKnoten(x.energie)]],
    ['freitexte',[['objekttitel',T.titel],['dreizeiler',T.dreizeiler],['lage',T.lage],['ausstatt_beschr',T.ausstattung],
      ['objektbeschreibung',T.objekt],['sonstige_angaben',T.sonst]]],
    ['anhaenge',x.bilder.map(b=>['anhang',[['anhangtitel',b.titel],['format',b.format,null,true],['daten',[['pfad',b.datei]]]],{location:'EXTERN',gruppe:b.gruppe}])],
    ['verwaltung_objekt',[['objektadresse_freigeben',String(!!G.frei)],['verfuegbar_ab',x.verfuegbar],['denkmalgeschuetzt',x.denkmal?'true':'']]],
    ['verwaltung_techn',[['objektnr_intern',x.projektId],['objektnr_extern',x.nr,null,true],['aktion',null,x.aktion?{aktionart:x.aktion}:null,true],
      ['openimmo_obid',x.obid,null,true],['kennung_ursprung',SENDER],['stand_vom',x.stand,null,true]]]]];
}
/* anbieter = {firma, nr (Anbieternummer beim Portal), anid}; o = {voll: Gesamtbestand, jetzt: Date} */
function xml(objekte,anbieter,o){
  o=o||{}; anbieter=anbieter||{};
  const jetzt=o.jetzt instanceof Date?o.jetzt:new Date();
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+ser(['openimmo',[
    ['uebertragung',null,{art:'OFFLINE',umfang:o.voll?'VOLL':'TEIL',version:FORMAT,sendersoftware:SENDER,senderversion:SENDER_VERSION,timestamp:isoZeit(jetzt)},true],
    ['anbieter',[['anbieternr',String(anbieter.nr||'').trim()],['firma',String(anbieter.firma||'').trim(),null,true],
      ['openimmo_anid',anbieter.anid||anid(jetzt,''),null,true]].concat((objekte||[]).map(immobilieKnoten))]]],0);
}

const ImmoPortal={FORMAT,ARTEN,JAHRGAENGE,EA_NEU,esc,dez,anschrift,artVorschlag,kategorie,traegerKennung,energie,energiePflicht,energieHinweise,energieZeile,energieNeu,zehnJahre,ausstattungText,etage,
  bildAuswahl,objekt,pruefen,xml,obid,anid,objektnrVorschlag,dateiTeil,leser};
wurzel.ImmoPortal=ImmoPortal;
if(typeof module==='object'&&module.exports) module.exports=ImmoPortal;
})(typeof globalThis!=='undefined'?globalThis:this);
