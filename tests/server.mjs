/* Kleiner statischer Server für die Tests (keine Abhängigkeiten).
   Liefert das Repository-Verzeichnis aus, wie GitHub Pages es tut. Port über PORT (Standard 8790). */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 8790);
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.pdf': 'application/pdf'
};

/* Nur für Tests (TEST_STEUERUNG=1): eine neue sw.js-Fassung simulieren, um das Update zu prüfen */
let swCacheName = null;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (process.env.TEST_STEUERUNG === '1' && url.pathname === '/__test/sw') {
      swCacheName = url.searchParams.get('cache') || null;
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return;
    }
    let pfad = decodeURIComponent(url.pathname);
    if (swCacheName && pfad === '/sw.js') {
      const text = (await readFile(join(WURZEL, 'sw.js'), 'utf8')).replace(/const CACHE = '[^']+'/, "const CACHE = '" + swCacheName + "'");
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' }).end(text); return;
    }
    if (pfad.endsWith('/')) pfad += 'index.html';
    const datei = normalize(join(WURZEL, pfad));
    if (!datei.startsWith(WURZEL)) { res.writeHead(403).end(); return; }
    const s = await stat(datei);
    if (!s.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(datei));
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('nicht gefunden');
  }
}).listen(PORT, () => console.log('ImmoApp-Testserver auf http://localhost:' + PORT));
