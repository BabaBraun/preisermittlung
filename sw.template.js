const CACHE = '__VERSION__';
const ASSETS = __ASSETS__;
// Fehlende Dateien dürfen keine unvollständige neue Version aktivieren. Frisch vom Server laden (cache: 'reload'):
// sonst könnte der Browser-Cache (GitHub Pages erlaubt 10 Minuten) alte Dateien in die neue Version legen.
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'}))))));
// Eine neue Version wartet bis alle alten Fenster geschlossen sind.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('preisermittlung-')||k.startsWith('immoapp-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){e.respondWith(caches.match(new URL('./index.html',self.location.href).href).then(hit=>hit||fetch(req)));return;}
 e.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
