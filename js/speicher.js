/* ImmoApp — Speicherschicht (IndexedDB), unabhängig von der Oberfläche
   Öffnen einer Datenbank mit Aufbau der Speicher und Transaktionen, die erst als erledigt gelten, wenn sie
   wirklich auf dem Gerät gespeichert sind. Scheitert die Arbeit in einer Transaktion (z. B. voller Speicher),
   wird sie abgebrochen: Es bleibt nie ein halb geschriebener Stand zurück.
   Die App-spezifischen Aufrufe (iaTx, iaGet, iaPut, iaDel, iaAlle für „ia_bewertungen“) stehen in index.html
   und reichen an diese Funktionen weiter; Meldungen an den Nutzer kommen über die übergebenen Rückrufe. */
(function(wurzel){
'use strict';

/* stores: {name: {keyPath}|null}; hinweis(text) meldet Blockaden/Versionswechsel an die Oberfläche */
function oeffnen(name,version,stores,hinweis){
  return new Promise((ok,fehler)=>{
    const idb=typeof indexedDB!=='undefined'?indexedDB:null;
    if(!idb){ fehler(new Error('Keine IndexedDB verfügbar')); return; }
    let rq; try{ rq=idb.open(name,version); }catch(e){ fehler(e); return; }
    rq.onupgradeneeded=()=>{ const db=rq.result;
      Object.keys(stores).forEach(s=>{ if(!db.objectStoreNames.contains(s)) db.createObjectStore(s,stores[s]||undefined); }); };
    rq.onsuccess=()=>{ const db=rq.result; if(hinweis) hinweis('');
      db.onversionchange=()=>{ db.close(); if(hinweis) hinweis('Die App wurde in einem anderen Fenster aktualisiert. Bitte diese Seite neu laden.'); };
      ok(db); };
    rq.onerror=()=>fehler(rq.error||new Error('IndexedDB nicht verfügbar'));
    /* Ein älteres, noch offenes Fenster hält die Datenbank: nicht aufgeben, sondern warten und Bescheid sagen */
    rq.onblocked=()=>{ if(hinweis) hinweis('Die ImmoApp ist noch in einem anderen Fenster oder Tab geöffnet. Bitte dort schließen, dann geht es hier weiter.'); };
  });
}
/* Eine Transaktion über einen oder mehrere Speicher. arbeit(store | {name: store}) liefert optional eine
   Anfrage, deren Ergebnis zurückgegeben wird. */
function tx(db,stores,modus,arbeit){
  return new Promise((ok,fehler)=>{
    if(!db){ fehler(new Error('Keine Datenbank')); return; }
    let t, rq;
    try{
      t=db.transaction(stores,modus);
      const s=Array.isArray(stores)?Object.fromEntries(stores.map(n=>[n,t.objectStore(n)])):t.objectStore(stores);
      rq=arbeit(s);
    }catch(e){ try{ if(t) t.abort(); }catch(x){} fehler(e); return; }
    t.oncomplete=()=>ok(rq&&typeof rq==='object'&&'readyState' in rq?rq.result:undefined);
    t.onerror=()=>fehler(t.error||new Error('Speichern fehlgeschlagen'));
    t.onabort=()=>fehler(t.error||new Error('Speichern abgebrochen'));
  });
}
function fehlerText(e){
  const n=e&&(e.name||''), m=e&&(e.message||'');
  if(n==='QuotaExceededError'||/quota/i.test(m)) return 'Der Speicher des Geräts ist voll';
  return m||'unbekannter Fehler';
}

const ImmoSpeicher={oeffnen,tx,fehlerText};
wurzel.ImmoSpeicher=ImmoSpeicher;
if(typeof module==='object'&&module.exports) module.exports=ImmoSpeicher;
})(typeof globalThis!=='undefined'?globalThis:this);
