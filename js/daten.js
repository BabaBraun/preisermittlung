/* ImmoApp — Prüfung von Sicherungs- und Projektdateien vor dem Einlesen (ohne DOM, in Node testbar)
   Grundsatz: Eine Datei wird vollständig geprüft, bevor irgendetwas überschrieben wird. Ungültige Einträge
   werden übersprungen und gezählt, unbrauchbare Dateien abgelehnt — mit einer verständlichen Begründung.
   Unterstützte Formate (auch ältere Fassungen):
     Projektdatei   {fields, photos, signature, grundrisse}  — „Als Datei sichern“ (seit 2026-07)
                    flache Feldliste {ek_…: …}                — Altformat vor den Fotos
     Gesamtsicherung {typ:'immoapp-projekte', version:2, projekte, kunden, aufgaben, parameter}
                    [ {id, name, data}, … ]                   — Version 1 (reine Projektliste)
     Marktdaten     {typ:'vb-marktdaten', version:1, objekte, anhaenge?}  bzw. [ {…}, … ] */
(function(wurzel){
'use strict';

const ID=/^[\w-]{1,80}$/;
const FELD=/^[A-Za-z_][\w-]{0,79}$/;
const FOTO_ARTEN=['objekt','schaden','karte'];
function istObjekt(x){ return !!x&&typeof x==='object'&&!Array.isArray(x); }
function idGueltig(x){ return typeof x==='string'&&ID.test(x); }
function bildGueltig(s){ return typeof s==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=\s]+$/.test(s); }
function base64Gueltig(s){ return typeof s==='string'&&s.length>0&&s.length%4===0&&/^[A-Za-z0-9+\/]+={0,2}$/.test(s); }

/* Feldwerte: nur Texte, Zahlen, Wahrheitswerte; unbekannte Namen mit Sonderzeichen verwerfen */
function felderPruefen(f){
  const aus={}; let verworfen=0;
  for(const [k,v] of Object.entries(f)){
    if(!FELD.test(k)){ verworfen++; continue; }
    if(typeof v==='string') aus[k]=v.length>200000?v.slice(0,200000):v;
    else if(typeof v==='number'&&isFinite(v)) aus[k]=String(v);
    else if(typeof v==='boolean') aus[k]=v;
    else verworfen++;
  }
  return {felder:aus,verworfen};
}
function fotosPruefen(liste){
  const aus=[]; let verworfen=0;
  (Array.isArray(liste)?liste:[]).forEach((p,i)=>{
    if(!istObjekt(p)||!bildGueltig(p.data)){ verworfen++; return; }
    aus.push({id:idGueltig(p.id)?p.id:'p'+i+'x'+Math.random().toString(36).slice(2,7),cat:FOTO_ARTEN.includes(p.cat)?p.cat:'objekt',
      caption:typeof p.caption==='string'?p.caption.slice(0,500):'',data:p.data});
  });
  return {fotos:aus,verworfen};
}
function grundrissePruefen(liste){
  const aus=[]; let verworfen=0;
  (Array.isArray(liste)?liste:[]).forEach(g=>{
    if(istObjekt(g)&&idGueltig(g.id)&&istObjekt(g.d)&&typeof(g.darst||'aufteilung')==='string') aus.push({id:g.id,darst:String(g.darst||'aufteilung'),d:g.d});
    else verworfen++;
  });
  return {grundrisse:aus,verworfen};
}

/* Einzelne Bewertung („Als Datei sichern“) */
function projektDateiPruefen(o){
  if(Array.isArray(o)||(istObjekt(o)&&o.typ==='immoapp-projekte')) return {ok:false,fehler:'Das ist eine Gesamtsicherung aller Projekte. Sie wird in der Projekte-Übersicht über „Sicherung einspielen“ geladen.'};
  if(istObjekt(o)&&o.typ==='vb-marktdaten') return {ok:false,fehler:'Das ist eine Sicherung des Marktüberblicks. Sie wird im Marktüberblick unter „Datensicherung“ eingelesen.'};
  if(!istObjekt(o)) return {ok:false,fehler:'Die Datei enthält keine Bewertung.'};
  let roh=istObjekt(o.fields)?o.fields:o, alt=!istObjekt(o.fields);
  if(!Object.keys(roh).some(k=>/^(ek|er|nhkhg|bgfhg)_/.test(k))) return {ok:false,fehler:'Die Datei enthält keine Bewertung der ImmoApp (keine bekannten Felder).'};
  const f=felderPruefen(roh), ph=fotosPruefen(alt?[]:o.photos), gr=grundrissePruefen(alt?[]:o.grundrisse);
  const sig=!alt&&bildGueltig(o.signature)?o.signature:null;
  return {ok:true,altformat:alt,daten:{fields:f.felder,photos:ph.fotos,signature:sig,grundrisse:gr.grundrisse},
    verworfen:{felder:f.verworfen,fotos:ph.verworfen,grundrisse:gr.verworfen,unterschrift:!alt&&o.signature&&!sig?1:0}};
}

/* Gesamtsicherung der Projekte, Kunden, Wiedervorlagen und Marktberichte */
function projektSicherungPruefen(o){
  let liste=null, version=0;
  if(Array.isArray(o)){ liste=o; version=1; }
  else if(istObjekt(o)&&o.typ==='immoapp-projekte'&&Array.isArray(o.projekte)){ liste=o.projekte; version=o.version||2; }
  if(!liste){
    if(istObjekt(o)&&(o.fields||Object.keys(o).some(k=>/^ek_/.test(k)))) return {ok:false,fehler:'Das ist eine einzelne Bewertung. Sie wird über „Datei öffnen“ im Export-Menü geladen.'};
    if(istObjekt(o)&&o.typ==='vb-marktdaten') return {ok:false,fehler:'Das ist eine Sicherung des Marktüberblicks. Sie wird im Marktüberblick unter „Datensicherung“ eingelesen.'};
    return {ok:false,fehler:'Die Datei ist keine Projektsicherung der ImmoApp.'};
  }
  const projekte=[]; let uebersprungen=0;
  liste.forEach(p=>{
    if(!istObjekt(p)||!idGueltig(p.id)||!istObjekt(p.data)){ uebersprungen++; return; }
    const d=p.data, datei=projektDateiPruefen(d);
    if(!datei.ok){ uebersprungen++; return; }
    const daten=datei.altformat?datei.daten.fields:datei.daten;
    projekte.push({id:p.id,name:typeof p.name==='string'&&p.name.trim()?p.name.slice(0,200):'Projekt',objekt:typeof p.objekt==='string'?p.objekt.slice(0,200):'',
      datum:typeof p.datum==='string'?p.datum.slice(0,40):'',empf:typeof p.empf==='string'?p.empf.slice(0,40):'',voll:istObjekt(p.voll)?{ok:+p.voll.ok||0,n:+p.voll.n||0}:null,
      geaendert:typeof p.geaendert==='number'&&isFinite(p.geaendert)?p.geaendert:(parseInt(String(p.id).slice(1))||0),data:daten});
  });
  const kunden=(istObjekt(o)&&Array.isArray(o.kunden)?o.kunden:[]).filter(k=>istObjekt(k)&&idGueltig(k.id));
  const aufgaben=(istObjekt(o)&&Array.isArray(o.aufgaben)?o.aufgaben:[]).filter(a=>istObjekt(a)&&idGueltig(a.id)&&typeof a.text==='string');
  const parameter=(istObjekt(o)&&Array.isArray(o.parameter)?o.parameter:[]).filter(x=>istObjekt(x)&&idGueltig(x.id));
  // Beratung & Werkzeuge (D38): Übergabeprotokolle und Eingaben der Rechner
  const protokolle=(istObjekt(o)&&Array.isArray(o.protokolle)?o.protokolle:[]).filter(x=>istObjekt(x)&&idGueltig(x.id));
  const notar=(istObjekt(o)&&Array.isArray(o.notar)?o.notar:[]).filter(x=>istObjekt(x)&&idGueltig(x.id)&&Array.isArray(x.verkaeufer)&&Array.isArray(x.kaeufer));   // Notaraufträge (D39)
  // Termine, Vorgänge (Anfragen, Akquise) und Bieterverfahren (D40)
  const liste_=n=>istObjekt(o)&&Array.isArray(o[n])?o[n]:[];
  const termine=liste_('termine').filter(x=>istObjekt(x)&&idGueltig(x.id)&&typeof x.datum==='string');
  const vorgaenge=liste_('vorgaenge').filter(x=>istObjekt(x)&&idGueltig(x.id)&&(x.typ==='anfrage'||x.typ==='akquise'));
  const bieter=liste_('bieter').filter(x=>istObjekt(x)&&idGueltig(x.id)&&Array.isArray(x.gebote));
  const abrechnungen=liste_('abrechnungen').filter(x=>istObjekt(x)&&idGueltig(x.id)&&Array.isArray(x.parteien));   // Provisionsabrechnungen (D42)
  const werkzeuge=istObjekt(o)&&istObjekt(o.werkzeuge)?o.werkzeuge:null;
  const verworfen=uebersprungen+((istObjekt(o)&&Array.isArray(o.kunden)?o.kunden.length:0)-kunden.length)+((istObjekt(o)&&Array.isArray(o.aufgaben)?o.aufgaben.length:0)-aufgaben.length)
    +((istObjekt(o)&&Array.isArray(o.protokolle)?o.protokolle.length:0)-protokolle.length)+((istObjekt(o)&&Array.isArray(o.notar)?o.notar.length:0)-notar.length)
    +(liste_('termine').length-termine.length)+(liste_('vorgaenge').length-vorgaenge.length)+(liste_('bieter').length-bieter.length)+(liste_('abrechnungen').length-abrechnungen.length);
  if(!projekte.length&&!kunden.length&&!protokolle.length&&!notar.length&&!termine.length&&!vorgaenge.length&&!bieter.length&&!abrechnungen.length&&!werkzeuge) return {ok:false,fehler:uebersprungen?'Keiner der '+uebersprungen+' Einträge ist lesbar — die Datei ist beschädigt.':'In der Sicherung stehen keine Projekte oder Kunden.'};
  return {ok:true,version,projekte,kunden,aufgaben,parameter,protokolle,notar,termine,vorgaenge,bieter,abrechnungen,werkzeuge,verworfen};
}

/* Sicherung des Marktüberblicks (schlank oder mit PDF-Anhängen) */
function marktSicherungPruefen(o){
  const objekte=istObjekt(o)&&Array.isArray(o.objekte)?o.objekte:Array.isArray(o)?o:istObjekt(o)&&Array.isArray(o.data)?o.data:null;
  if(!objekte){
    if(istObjekt(o)&&o.typ==='immoapp-projekte') return {ok:false,fehler:'Das ist eine Projektsicherung. Sie wird in der Projekte-Übersicht über „Sicherung einspielen“ geladen.'};
    return {ok:false,fehler:'Die Datei enthält keine Objektdaten des Marktüberblicks.'};
  }
  const gut=[]; let verworfen=0;
  objekte.forEach(x=>{
    if(!istObjekt(x)){ verworfen++; return; }
    const kopie={};
    for(const [k,v] of Object.entries(x)){ if(FELD.test(k)&&(v==null||['string','number','boolean'].includes(typeof v)||Array.isArray(v)||istObjekt(v))) kopie[k]=v; }
    if(kopie.id!=null&&!idGueltig(String(kopie.id))){ verworfen++; return; }
    if(kopie.id!=null) kopie.id=String(kopie.id);
    gut.push(kopie);
  });
  const anhaenge=[]; let anVerworfen=0;
  (istObjekt(o)&&Array.isArray(o.anhaenge)?o.anhaenge:[]).forEach(a=>{
    if(istObjekt(a)&&idGueltig(a.id)&&base64Gueltig(a.data)) anhaenge.push({id:a.id,objId:a.objId!=null?String(a.objId):'',name:typeof a.name==='string'?a.name.slice(0,200):'anhang.pdf',size:+a.size||0,data:a.data});
    else anVerworfen++;
  });
  if(!gut.length) return {ok:false,fehler:objekte.length?'Keines der '+objekte.length+' Objekte ist lesbar — die Datei ist beschädigt.':'Die Datei enthält keine Objektdaten.'};
  return {ok:true,objekte:gut,anhaenge,verworfen:{objekte:verworfen,anhaenge:anVerworfen}};
}

/* JSON lesen mit verständlicher Meldung */
function jsonLesen(text){
  if(typeof text!=='string'||!text.trim()) return {ok:false,fehler:'Die Datei ist leer.'};
  try{ return {ok:true,wert:JSON.parse(text.replace(/^﻿/,''))}; }
  catch(e){ return {ok:false,fehler:'Die Datei ist beschädigt oder unvollständig (kein gültiges JSON) — vermutlich wurde sie nicht vollständig gespeichert oder übertragen.'}; }
}

const ImmoDaten={jsonLesen,projektDateiPruefen,projektSicherungPruefen,marktSicherungPruefen,idGueltig,bildGueltig,base64Gueltig};
wurzel.ImmoDaten=ImmoDaten;
if(typeof module==='object'&&module.exports) module.exports=ImmoDaten;
})(typeof globalThis!=='undefined'?globalThis:this);
