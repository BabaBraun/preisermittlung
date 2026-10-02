const CACHE = 'immoapp-cc12a82fca26';
const ASSETS = [
  './',
  './Wertermittlung.html',
  './assets/app-shell.css',
  './assets/app.css',
  './assets/fonts.css',
  './assets/fonts/IBM-Plex-Sans-LICENSE.txt',
  './assets/fonts/IBM-Plex-Serif-LICENSE.txt',
  './assets/fonts/ibm-plex-sans-latin-400-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-500-normal.woff2',
  './assets/fonts/ibm-plex-sans-latin-600-normal.woff2',
  './assets/fonts/ibm-plex-serif-latin-600-normal.woff2',
  './assets/liegenschaften.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512-maskable.png',
  './icons/icon-512.png',
  './index.html',
  './js/baupreisindex.js',
  './js/daten.js',
  './js/jahresbewertung-dok.js',
  './js/jahresbewertung-editor.js',
  './js/jahresbewertung-ui.js',
  './js/jahresbewertung.js',
  './js/kern.js',
  './js/liegenschaften-ui.js',
  './js/liegenschaften-vergleich.js',
  './js/liegenschaften.js',
  './js/modell.js',
  './js/office.js',
  './js/pdf.js',
  './js/speicher.js',
  './js/sterbetafel.js',
  './manifest.webmanifest',
  './selbsttest.js',
  './src/app-shell.js',
  './src/aufnahme.js',
  './src/base.js',
  './src/budget.js',
  './src/buyer-profiles.js',
  './src/comparisons.js',
  './src/customers.js',
  './src/exports.js',
  './src/expose.js',
  './src/floorplans.js',
  './src/form.js',
  './src/init.js',
  './src/investment.js',
  './src/location.js',
  './src/market.js',
  './src/marketing.js',
  './src/modell-ui.js',
  './src/office-adapter.js',
  './src/parameters.js',
  './src/persistence.js',
  './src/photos.js',
  './src/presentation.js',
  './src/projects.js',
  './src/pwa.js',
  './src/renovation.js',
  './src/report-options.js',
  './src/report.js',
  './src/rooms.js',
  './src/sensitivity.js',
  './src/ui.js',
  './src/valuation.js',
  './vendor/html2pdf.bundle.min.js'
];
// Fehlende Dateien dürfen keine unvollständige neue Version aktivieren. Frisch vom Server laden (cache: 'reload'):
// sonst könnte der Browser-Cache (GitHub Pages erlaubt 10 Minuten) alte Dateien in die neue Version legen.
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'}))))));
// Eine neue Version wartet, bis alle alten Fenster geschlossen sind — oder bis die App sie auf Tipp übernimmt
// (Hinweis „Neue Version“, src/pwa.js): Am iPhone werden Home-Bildschirm-Apps selten ganz geschlossen.
self.addEventListener('message',e=>{ if(e.data&&e.data.typ==='aktualisieren') self.skipWaiting(); });
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('preisermittlung-')||k.startsWith('immoapp-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){e.respondWith(caches.match(new URL('./index.html',self.location.href).href).then(hit=>hit||fetch(req)));return;}
 e.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
