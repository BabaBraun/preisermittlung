/* Klicktest der ganzen ImmoApp (D31, D32): jeder Knopf, jedes Feld, jedes Auf- und Zuklappen — mit Musterdaten.
   Je Bereich: (1) alle Abschnitte und Blöcke auf- und zuklappen, (2) jedes Eingabefeld ausfüllen bzw. jeden Schalter und
   jede Auswahl umstellen und den Wert zurücklesen, (3) jeden Knopf und Link anklicken: Passiert etwas (Ansicht, Inhalt,
   Feldwerte, Meldung, Download, Druck, Teilen …), ohne Skriptfehler und ohne dass er verdeckt ist?
   Nur synthetische Daten, eigener Browser; fremde Seiten (BORIS-BW, Geoportal …) werden nicht aufgerufen.

   Aufruf:  npm run klicktest                 (PC, Chromium)
            npm run klicktest:iphone          (iPhone-Ansicht, WebKit)
   Optionen: --nur=Regex (nur diese Bereiche)  --ohne=Regex  --nur-knoepfe  --erwartung (Liste „ohne Wirkung“ neu schreiben)
   Umgebung: KT_URL (statt eigenem Testserver, z. B. die Live-Seite), KT_PORT (Standard 8796), KT_AUSGABE (Berichtsordner)

   Ergebnis: tests/ausgabe/klicktest/<gerät>/ergebnis.json und bericht.md. Rot (Exit-Code 1) bei Skriptfehlern, Feldern
   oder Klappbereichen, die nicht funktionieren, verdeckten Knöpfen und NaN/undefined schon mit dem Musterfall. Knöpfe
   „ohne Wirkung“ werden mit tests/klick/ohne-wirkung-<gerät>.json verglichen: neue melden sich als Warnung (aktive Reiter,
   bereits offene Ansichten, leere Eingaben und Tabellenzeilen ohne Funktion sind dort erwartet). */
import { chromium, webkit, devices } from '@playwright/test';
import { FALL_HAUS, FALL_ETW } from '../fixtures/szenarien.mjs';
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync, appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '..', '..');
const ARGS = process.argv.slice(2);
const opt = n => { const a = ARGS.find(x => x === '--' + n || x.startsWith('--' + n + '=')); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };
const GERAET = ARGS.find(a => !a.startsWith('--')) || 'desktop';
if (!['desktop', 'iphone'].includes(GERAET)) { console.error('Gerät: desktop oder iphone'); process.exit(2); }
const NUR = opt('nur') ? new RegExp(opt('nur'), 'i') : null;
// iPhone: Laden/Büro und Gewerbe haben dieselben Felder und Knöpfe wie das Wohnhaus — am PC werden sie mitgeprüft
const OHNE = opt('ohne') ? new RegExp(opt('ohne'), 'i') : (GERAET === 'iphone' && !NUR ? /Laden|Gewerbe/ : null);
const NUR_KNOEPFE = !!opt('nur-knoepfe');
const PORT = Number(process.env.KT_PORT || 8796);
const BASIS = process.env.KT_URL || 'http://localhost:' + PORT + '/';
const OUT = process.env.KT_AUSGABE || path.join(REPO, 'tests', 'ausgabe', 'klicktest', GERAET); mkdirSync(OUT, { recursive: true });
const ERWARTUNG = path.join(HIER, 'ohne-wirkung-' + GERAET + '.json');
const FALL_LV = JSON.parse(readFileSync(path.join(REPO, 'tests', 'referenz', 'jahresbewertung_faelle.json'), 'utf8')).faelle[0].vordruck;

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
/* Testdatei je nach erlaubtem Dateityp; JSON bewusst ohne gültigen Inhalt — die App muss sie verständlich abweisen */
function testdatei(acc) {
  if (/image/.test(acc)) return { name: 'test.png', mimeType: 'image/png', buffer: PNG };
  if (/pdf/.test(acc)) return { name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF };
  if (/json/.test(acc)) return { name: 'test.json', mimeType: 'application/json', buffer: Buffer.from('{"test":1}') };
  if (/csv|xls|sheet|text/.test(acc)) return { name: 'test.csv', mimeType: 'text/csv', buffer: Buffer.from('Ort;Kaufpreis\nMusterstadt;300000\n') };
  return { name: 'test.png', mimeType: 'image/png', buffer: PNG };
}

/* ---------- im Browser: Zähler für Wirkungen, Finden von Knöpfen und Feldern ---------- */
const INIT = `(() => {
  const k = window.__kt = { m: 0, s: 0, print: 0, share: 0, clip: 0 };
  // nur echte Änderungen zählen: denselben Wert neu setzen (z. B. Navigationsleiste bei jedem Klick) zählt nicht
  const txt = l => [...l].map(n => n.nodeType === 3 ? n.textContent : (n.outerHTML || '')).join('');
  const mo = new MutationObserver(ms => { for (const m of ms) {
    if (m.type === 'attributes' && m.oldValue === m.target.getAttribute(m.attributeName)) continue;
    if (m.type === 'childList' && txt(m.addedNodes) === txt(m.removedNodes)) continue;
    if (m.type === 'characterData' && m.oldValue === m.target.textContent) continue;
    k.m++; } });
  const an = () => mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true, characterDataOldValue: true });
  if (document.documentElement) an(); else document.addEventListener('readystatechange', an, { once: true });
  addEventListener('scroll', () => { k.s++; }, true);
  window.print = () => { k.print++; };
  try { Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: async function () { k.share++; } });
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: function () { return true; } }); } catch (e) {}
  try { const cb = { writeText: async () => { k.clip++; }, readText: async () => '', write: async () => { k.clip++; } };
        Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => cb }); } catch (e) {}
  const KSEL = 'button, [role="button"], a[href], summary, [onclick], input[type="button"], input[type="submit"], label:has(input[type="file"])';
  const vis = el => !!el && el.isConnected && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getClientRects().length > 0;
  const visF = el => !!el && el.isConnected && el.checkVisibility({ checkVisibilityCSS: true }) && el.getClientRects().length > 0;
  const wurzeln = w => w.split('|').flatMap(s => [...document.querySelectorAll(s)]);
  // automatisch vergebene Kennungen (ia_auto_…, bei jedem Aufbau neu) taugen nicht zum Wiederfinden
  const eigeneId = el => /^ia_auto_\\d+$/.test(el.id || '') ? '' : (el.id || '');
  const name = el => { const t = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.value || '').replace(/\\s+/g, ' ').trim();
    return (t || el.id || (el.getAttribute('onclick') || '').slice(0, 50) || el.tagName).slice(0, 90); };
  function knoepfe(w, finde) {
    const seen = new Set(), out = [], z = {};
    for (const r of wurzeln(w)) for (const el of [r, ...r.querySelectorAll('*')]) {
      if (seen.has(el)) continue;
      let klickbar = el.matches(KSEL) || typeof el.onclick === 'function';
      if (!klickbar && !el.matches('input, select, textarea, option, label:has(input:not([type=file])), svg *')) {
        // per Skript klickbar gemacht (z. B. Listenzeilen): Handzeiger, nicht nur geerbt, kein Knopf darin
        const cs = getComputedStyle(el); klickbar = cs.cursor === 'pointer' && (!el.parentElement || getComputedStyle(el.parentElement).cursor !== 'pointer') && !el.querySelector(KSEL);
      }
      if (!klickbar) continue; seen.add(el);
      if (!vis(el) || el.disabled || el.closest('[inert]')) continue;
      const n = name(el), oc = (el.getAttribute('onclick') || '').replace(/\\s+/g, ' ').slice(0, 60);
      const basis = el.tagName + '|' + eigeneId(el) + '|' + n + '|' + oc; z[basis] = (z[basis] || 0) + 1;
      const key = basis + '|' + z[basis];
      if (finde) { if (key === finde) { window.__ktZiel = el; return true; } continue; }
      const href = el.tagName === 'A' ? (el.getAttribute('href') || '') : null;
      out.push({ key, name: n, tag: el.tagName.toLowerCase(), href, extern: !!href && /^(https?:|mailto:|tel:)/.test(href) && !href.startsWith(location.origin) });
    }
    return finde ? false : out;
  }
  window.__ktKnoepfe = w => knoepfe(w);
  window.__ktFinde = (w, key) => knoepfe(w, key);
  window.__ktFeldName = el => { let t = '';
    if (el.labels && el.labels.length) t = el.labels[0].innerText;
    if (!t) { const f = el.closest('.field, .f, tr, .row, .xrow'); const l = f && f.querySelector('label, th, .lbl'); if (l && !l.contains(el)) t = l.innerText; }
    t = (t || el.getAttribute('aria-label') || el.placeholder || el.title || '').replace(/\\s+/g, ' ').trim();
    return (t ? t.slice(0, 60) + ' ' : '') + '(' + (eigeneId(el) || el.name || el.dataset.jb || el.dataset.jbm || el.dataset.vgk || el.tagName.toLowerCase()) + ')'; };
  window.__ktFeldKey = el => { const d = el.dataset || {};
    return [el.tagName, el.type, eigeneId(el), el.name, d.jb, d.jbm, d.vgk, d.vgs, eigeneId(el) ? '' : window.__ktFeldName(el).replace(/\\s*\\([^)]*\\)$/, '')].join('|'); };
  // Felder über einen festen Schlüssel merken: auch Ansichten, die sich beim Ausfüllen neu aufbauen, werden ganz geprüft
  window.__ktSchluessel = w => { const z = {}, alle = [];
    for (const r of wurzeln(w)) for (const el of r.querySelectorAll('input, select, textarea')) {
      if (['hidden', 'file', 'button', 'submit', 'reset', 'image'].includes(el.type)) continue;
      const basis = window.__ktFeldKey(el); z[basis] = (z[basis] || 0) + 1; el.__ktKey = basis + '|' + z[basis]; alle.push(el); }
    return alle; };
  // Weg ab dem nächsten Vorfahren mit fester Kennung: bleibt gleich, wenn die App eine Liste gleich wieder aufbaut —
  // auch wenn sich dabei die Beschriftung ändert (Exposé-Fotos: „Titelbild“, „Als Titelbild“)
  window.__ktPfad = el => { const p = []; let e = el;
    while (e.parentElement && !eigeneId(e)) { p.unshift([...e.parentElement.children].indexOf(e)); e = e.parentElement; }
    return { id: eigeneId(e), p }; };
  // ein Feld, das die App beim Ausfüllen neu aufgebaut hat, wiederfinden: zuerst über den Weg, sonst über den Schlüssel
  window.__ktWieder = (w, q) => { let e = q.pfad.id ? document.getElementById(q.pfad.id) : document.documentElement;
    for (const i of q.pfad.p) e = e && e.children[i];
    if (e && e.tagName.toLowerCase() === q.tag && e.type === q.typ && wurzeln(w).some(r => r.contains(e))) return e;
    return window.__ktSchluessel(w).find(el => el.__ktKey === q.key) || null; };
  window.__ktFelder = w => { window.__ktGetestetK = window.__ktGetestetK || new Set(); window.__ktF = [];
    for (const el of window.__ktSchluessel(w)) {
      if (window.__ktGetestetK.has(el.__ktKey)) continue;
      if (!visF(el) || el.disabled || el.readOnly || el.closest('[inert]')) continue;
      window.__ktF.push(el); }
    return window.__ktF.length; };
  window.__ktKlappbar = w => { window.__ktK = [];
    for (const r of wurzeln(w)) { for (const b of r.querySelectorAll('.app-sec-toggle')) if (vis(b)) window.__ktK.push(b);
      for (const d of r.querySelectorAll('details')) { const s = d.querySelector(':scope>summary'); if (s && vis(s)) window.__ktK.push(s); } }
    return window.__ktK.map(e => e.classList.contains('app-sec-toggle') ? 'Abschnitt ' + ((e.closest('section') || document.body).querySelector('h2') || { innerText: '?' }).innerText.replace(/\\s+/g, ' ').trim().slice(0, 60)
      : 'Block ' + e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 60)); };
  window.__ktInhaltSichtbar = el => { if (el.classList.contains('app-sec-toggle')) { const sec = el.closest('section'); const h = sec.querySelector(':scope>h2');
      return [...sec.children].filter(c => c !== h).some(c => c.checkVisibility()); }
    const d = el.parentElement; return [...d.children].filter(c => c !== el).some(c => c.checkVisibility()); };
  window.__ktSig = () => { const b = document.body, v = id => vis(document.getElementById(id));
    const ov = [...document.querySelectorAll('[id$="_overlay"], #suche')].filter(e => e.classList.contains('on') || e.id === 'st_overlay').map(e => e.id).sort();
    const mt = (document.querySelector('#mdb_overlay.on .mdb-tabs .on') || {}).textContent || '';
    return JSON.stringify({ ov, rm: b.classList.contains('report-mode'), st: b.classList.contains('started'), tab: typeof APP_STATE !== 'undefined' ? APP_STATE.tab : '',
      s0: v('start-step0'), s1: v('start-step1'), lv: typeof LV !== 'undefined' ? [LV.ansicht, LV.form && LV.form.typ] : '', mt, rep: (document.getElementById('report') || {}).className || '' }); };
  window.__ktWerte = () => [...document.querySelectorAll('input, select, textarea')].map(e => (e.type === 'checkbox' || e.type === 'radio') ? (e.checked ? '1' : '0') : e.value);
  window.__ktWerteDiff = () => { const a = window.__ktWerteVor || [], b = window.__ktWerte(); let n = Math.abs(a.length - b.length);
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) n++; return n; };
  window.__ktNaN = w => { const bad = /\\bNaN\\b|\\bundefined\\b|\\bInfinity\\b|\\[object Object\\]/; const out = [];
    for (const r of wurzeln(w)) { const tw = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) { const n = tw.currentNode, p = n.parentElement; if (!p || p.closest('script,style,textarea,code,pre')) continue;
        if (bad.test(n.textContent) && vis(p)) out.push(n.textContent.replace(/\\s+/g, ' ').trim().slice(0, 90) + ' [' + ((p.closest('[id]') || {}).id || p.tagName) + ']'); }
      for (const i of r.querySelectorAll('input,textarea')) if (bad.test(i.value) && visF(i)) out.push('Feld ' + (i.id || i.name) + ' = ' + i.value.slice(0, 60)); }
    return [...new Set(out)].slice(0, 40); };
})();`;

/* Playwrights Begründung, warum ein echter Klick scheitert (z. B. „<header …> intercepts pointer events“) */
const grund = e => { const z = String(e && e.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').map(s => s.trim().replace(/^-\s*/, ''))
  .filter(s => /intercepts pointer events|not stable|not visible|outside of the viewport|not enabled|not attached/.test(s)).pop();
  return z ? ': ' + z.replace(/data:[^"'\s>]+/g, 'data:…').replace(/\s+/g, ' ').slice(0, 160) : ''; };

/* ---------- Protokoll ---------- */
const ERG = [];
let BEREICH = '';
function notiere(art, element, ergebnis, detail = '') {
  ERG.push({ bereich: BEREICH, art, element, ergebnis, detail });
  if (ergebnis !== 'ok') console.log('   [' + ergebnis + '] ' + art + ': ' + element + (detail ? ' — ' + detail : ''));
}
let browser, ctx, page, LOG, SHOTS = 0;
const neuesLog = () => { LOG = { fehler: [], dialoge: [], downloads: [], popups: [], dateien: [], dlWarten: [] }; };

async function starten() {
  browser = await (GERAET === 'iphone' ? webkit : chromium).launch();
  ctx = await browser.newContext({ ...(GERAET === 'iphone' ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 } }),
    locale: 'de-DE', timezoneId: 'Europe/Berlin', acceptDownloads: true, geolocation: { latitude: 49.06, longitude: 9.27 } });
  try { await ctx.grantPermissions(['geolocation']); } catch (e) {}
  await ctx.addInitScript(INIT);
  // keine Aufrufe fremder Seiten (BORIS-BW, Geoportal …): nur die App selbst und ihre Schriften
  await ctx.route(u => !['127.0.0.1', 'localhost', new URL(BASIS).hostname].includes(u.hostname) && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname), r => r.abort());
  page = await ctx.newPage();
  neuesLog();
  page.on('pageerror', e => LOG.fehler.push('Skriptfehler: ' + String(e && e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text();
    if (/Failed to load resource|net::ERR|favicon|fonts\.g/.test(t)) return; LOG.fehler.push('Konsole: ' + t.replace(/\s+/g, ' ').slice(0, 300)); });
  page.on('dialog', async d => { LOG.dialoge.push(d.type() + ': ' + d.message().replace(/\s+/g, ' ').slice(0, 220));
    try { d.type() === 'prompt' ? await d.accept('Test') : await d.accept(); } catch (e) {} });
  page.on('download', dl => { LOG.downloads.push(dl.suggestedFilename());
    LOG.dlWarten.push(dl.path().then(p => { if (!p || !statSync(p).size) LOG.fehler.push('Download leer: ' + dl.suggestedFilename()); })
      .catch(e => LOG.fehler.push('Download fehlgeschlagen: ' + dl.suggestedFilename() + ' (' + e.message + ')'))); });
  page.on('filechooser', async fc => { let acc = ''; try { acc = (await fc.element().getAttribute('accept')) || ''; } catch (e) {}
    LOG.dateien.push(acc || '*'); await fc.setFiles(testdatei(acc)).catch(e => LOG.fehler.push('Dateiauswahl: ' + e.message.split('\n')[0])); });
  ctx.on('page', p => { if (p === page) return; LOG.popups.push('neues Fenster'); setTimeout(() => p.close().catch(() => {}), 1500); });
}

/* warten, bis die Seite ruhig ist (keine Änderungen mehr) und Downloads fertig sind */
async function ruhe(max = 6000) {
  const t0 = Date.now(); let last = -1, stabil = 0;
  while (Date.now() - t0 < max) {
    await page.waitForTimeout(200);
    let m; try { m = await page.evaluate(() => window.__kt ? window.__kt.m : -2); } catch (e) { m = -3; }
    if (m === last) { if (++stabil >= 2) break; } else { stabil = 0; last = m; }
  }
  if (LOG.dlWarten.length) await Promise.race([Promise.all(LOG.dlWarten), page.waitForTimeout(25000)]);
}

async function app() {
  for (let versuch = 1; ; versuch++) {
    await page.goto(BASIS + 'index.html', { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => typeof window.compute === 'function' && window.IA_BEREIT_P !== undefined && typeof APP_STATE !== 'undefined' && APP_STATE.ready, null, { timeout: 30000 });
      break;
    } catch (e) {
      // Ein einzelner Hänger des Testrechners beim Start (GitHub-Lauf 11, lokal nicht nachvollziehbar) bricht nicht
      // gleich den Bereich ab: einmal neu laden und als Hinweis festhalten. Hängt der Start wieder, ist es ein Befund.
      if (versuch >= 2) throw e;
      notiere('Start', 'App-Start', 'Hinweis', 'nach 30 s noch nicht bereit — einmal neu geladen');
    }
  }
  await page.evaluate(() => window.IA_BEREIT_P);
  await page.waitForTimeout(250);
}

/* Musterdaten (nur synthetisch), jedes Mal geprüft und bei Bedarf neu angelegt — Knöpfe wie „Löschen“ dürfen sie entfernen */
async function musterdaten() {
  await page.evaluate(async ({ haus, lvFall, png }) => {
    try { if (!(KD_CACHE || []).some(k => k.id === 'k_test')) await kdSpeichern({ id: 'k_test', vorname: 'Erika', nachname: 'Musterfrau', telefon: '07062 000000',
      kontakte: [{ id: 'c1', ts: 1, datum: '2026-09-01', art: 'Gespräch', text: 'Erstgespräch (Muster)' }], finanzierungen: [], erstellt: 1 }); } catch (e) { console.warn('kd', e); }
    try { if (!aufLoad().some(a => a.id === 'a_test')) aufStore(aufLoad().concat([{ id: 'a_test', text: 'Unterlagen anfordern (Muster)', frist: '2026-10-05', objekt: '', kundeId: 'k_test', erledigt: false, angelegt: 1 }])); } catch (e) { console.warn('auf', e); }
    try { const alle = await mdbAll(); if (!alle.some(o => o.id === 'o_test1')) for (let i = 1; i <= 6; i++)
      await mdbPut({ id: 'o_test' + i, gemeinde: i % 2 ? 'Musterstadt' : 'Beispielort', art: 'EFH', basis: i % 2 ? 'KP' : 'AN', kp: 300000 + i * 15000, wfl: 120 + i * 5, baujahr: 1970 + i * 5, datum: '2026-0' + (i % 9 + 1) + '-01' }); } catch (e) { console.warn('mdb', e); }
    try { await lvStart(); const lt = LV.liste.find(l => l.id === 'L_test');
      if (lt && !['BW_a', 'BW_b'].every(id => (lt.bewertungen || []).some(x => x.id === id && x.vordruck))) await lvLoeschenDb('L_test');
      if (!LV.liste.some(l => l.id === 'L_test')) { const J = ImmoJahresbewertung, L = ImmoLiegenschaften;
        const a = L.ausVordruck({ id: 'BW_a', art: 'preiseinschaetzung', status: 'final', quelle: '', notiz: '', vordruck: J.bereinigen(lvFall) });
        const b = L.ausVordruck({ id: 'BW_b', art: 'preiseinschaetzung', status: 'entwurf', quelle: '', notiz: '', vordruck: J.fortschreiben(lvFall, '2026-12-31').vordruck });
        await lvSpeichern({ id: 'L_test', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', bewertungen: [a, b] }); } } catch (e) { console.warn('lv', e); }
    try { if (!pjLoad().length) { applyVordruck(VORDRUCKE.find(v => v.id === 'wh_bgf')); apply(haus); $('pj_name').value = 'Musterhaus (Test)'; await projektSichern(); } } catch (e) { console.warn('pj', e); }
    // fehlt ein Musterfoto („Foto löschen“), alle drei in der ursprünglichen Reihenfolge vorn neu anlegen — so bleiben
    // Titelbild und „Als Titelbild“ bei denselben Fotos und die Knöpfe werden wiedergefunden
    try { const data = 'data:image/png;base64,' + png;
      const muster = [{ id: 'p_muster1', cat: 'objekt', caption: 'Ansicht (Muster)', data }, { id: 'p_muster2', cat: 'objekt', caption: '', data },
        { id: 'p_muster3', cat: 'schaden', caption: '', data }];
      if (muster.some(m => !PHOTOS.some(p => p.id === m.id))) { PHOTOS = muster.concat(PHOTOS.filter(p => !/^p_muster/.test(p.id)));
        fotosGeaendert(); renderPhotos(); autosave(); } } catch (e) { console.warn('fotos', e); }
  }, { haus: FALL_HAUS, lvFall: FALL_LV, png: PNG.toString('base64') });
}

/* Bewertung mit Musterfall: alle Felder auf Vorgabe, Objektart wählen, Fall eintragen, alles aufklappen */
const bewertung = (id, felder) => async () => {
  await page.evaluate(({ id, felder }) => {
    const aus = '#mdb_overlay,#suche,#gr_overlay,#fin_overlay,#auf_overlay,#projekt_overlay,#lock_setup_overlay,#dsgvo_overlay,#st_overlay,#kd_overlay,#pq_overlay,#vm_overlay,#lv_overlay';
    document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e => { if (e.closest(aus) || e.type === 'file') return;
      if (e.type === 'checkbox' || e.type === 'radio') e.checked = e.defaultChecked;
      else if (e.tagName === 'SELECT') { const o = [...e.options].find(x => x.defaultSelected); e.value = o ? o.value : (e.options[0] ? e.options[0].value : ''); }
      else e.value = e.defaultValue; });
    pickVordruck(id); apply(felder); compute(); localStorage.removeItem('ia_zugeklappt'); appAlleKlappen(true);
  }, { id, felder });
};
const js = f => async () => { await page.evaluate(f); };

/* ---------- Bereiche ---------- */
const BEREICHE = [
  { name: 'Übersicht (Startseite)', wurzel: '#start-step0|#mbar|#app_header', auf: js(() => { appSetTab('home'); }) },
  { name: 'Neue Bewertung – Objektart', wurzel: '#start-step1', auf: js(() => { appSetTab('home'); startPreisermittlung(); }) },
  { name: 'Bewertung Wohnhaus', wurzel: '.wrap|#app_header', auf: bewertung('wh_bgf', FALL_HAUS) },
  { name: 'Bewertung Eigentumswohnung', wurzel: '.wrap|#app_header', auf: bewertung('etw_vergleich', FALL_ETW) },
  { name: 'Bewertung Laden / Büro / Praxis', wurzel: '.wrap|#app_header', auf: bewertung('laden_buero_praxis', FALL_HAUS), ohneKnoepfe: 'gleiche Knöpfe wie Wohnhaus' },
  { name: 'Bewertung Gewerbe / Betrieb', wurzel: '.wrap|#app_header', auf: bewertung('gewerbe_bgf', FALL_HAUS), ohneKnoepfe: 'gleiche Knöpfe wie Wohnhaus' },
  { name: 'Export-Menü', wurzel: '#exportMenu .menu-list', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => menuToggle('exportMenu')); } },
  { name: 'Bericht', wurzel: '#report', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => druckbericht()); } },
  { name: 'Exposé', wurzel: '#report', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => exposeAnzeigen()); } },
  { name: 'Verkäufer-Präsentation', wurzel: '#vp_overlay', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => vpStarten()); } },
  { name: 'Grundriss einfügen', wurzel: '#gr_overlay', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => grEinfuegen()); } },
  { name: 'Datengrundlagen (Marktberichte)', wurzel: '#pq_overlay', auf: async () => { await bewertung('wh_bgf', FALL_HAUS)(); await page.evaluate(() => pqOeffnen()); } },
  { name: 'Vermarktung – Übersicht', wurzel: '#vm_overlay', auf: js(() => vmUebersicht()) },
  { name: 'Objekte', wurzel: '#projekt_overlay|#mbar', auf: js(() => appSetTab('objects')) },
  { name: 'Markt – Übersicht', wurzel: '#mdb_overlay', auf: js(async () => { await mdbOeffnen(); mdbTab('dash'); }) },
  { name: 'Markt – Bestand', wurzel: '#mdb_overlay', auf: js(async () => { await mdbOeffnen(); mdbTab('liste'); }) },
  { name: 'Markt – Erfassen', wurzel: '#mdb_overlay', auf: js(async () => { await mdbOeffnen(); mdbTab('erf'); }) },
  { name: 'Markt – Vergleich', wurzel: '#mdb_overlay', auf: js(async () => { await mdbOeffnen(); mdbTab('vgl'); }) },
  { name: 'Markt – Datensicherung', wurzel: '#mdb_overlay', auf: js(async () => { await mdbOeffnen(); mdbTab('sich'); }) },
  { name: 'Mehr', wurzel: '#app_more', auf: js(() => appSetTab('more')) },
  { name: 'Finanzierung', wurzel: '#fin_overlay', auf: js(() => finOeffnen()) },
  { name: 'Kunden – Liste', wurzel: '#kd_overlay', auf: js(() => kdOeffnen()) },
  { name: 'Kunden – Akte', wurzel: '#kd_overlay', auf: js(() => kdOeffnen('k_test')) },
  { name: 'Wiedervorlagen', wurzel: '#auf_overlay', auf: js(() => aufOeffnen()) },
  { name: 'Liegenschaften – Übersicht', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); }) },
  { name: 'Liegenschaften – Vordruck', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); jbOeffnen('L_test', 'BW_a'); }) },
  { name: 'Liegenschaften – Vergleich', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); jbVergleichAuf('L_test'); }) },
  { name: 'Liegenschaften – Vordruck anlegen', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); jbFormAuf('jb_neu'); }) },
  { name: 'Liegenschaften – Liegenschaft anlegen', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); lvNeueLiegenschaft(); }) },
  { name: 'Liegenschaften – Fortschreiben', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('uebersicht'); jbFormAuf('jb_fort'); }) },
  { name: 'Liegenschaften – Ansprechpartner', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('ansprechpartner'); }) },
  { name: 'Liegenschaften – Datensicherung', wurzel: '#lv_overlay', auf: js(async () => { await lvOeffnen('sicherung'); }) },
  { name: 'Liegenschaften – Dokument', wurzel: '#report', auf: js(async () => { await lvOeffnen('uebersicht'); await jbDokAnsehen('L_test', 'BW_a'); }) },
  { name: 'Datenschutz', wurzel: '#dsgvo_overlay', auf: js(() => dsgvoOeffnen()) },
  // „Einrichten“ braucht Face ID/Touch ID — mit simuliertem Authenticator geprüft in tests/e2e/sonderablaeufe.spec.mjs
  { name: 'App-Sperre', wurzel: '#lock_setup_overlay', auf: js(() => lockSetupOeffnen()), nicht: /einrichten|aktivieren|Face ID|Touch ID|Gerätecode/i, nichtGrund: 'braucht Face ID / Touch ID — eigener Test (sonderablaeufe.spec.mjs)' },
  { name: 'Selbsttest', wurzel: '#st_overlay', auf: async () => { await page.evaluate(() => iaSelbsttestOeffnen()); await page.waitForSelector('#st_overlay', { timeout: 20000 }); } },
  { name: 'Suche', wurzel: '#suche', auf: async () => { await page.evaluate(() => sucheOeffnen()); await page.waitForTimeout(200); await page.locator('#suche_q').fill('Muster'); } },
  { name: 'Teilen-Fenster', wurzel: '#teilen_overlay', auf: js(() => teilenDialog(new File(['x'], 'Test.pdf', { type: 'application/pdf' }), 'Test')) }
];

async function herstellen(B) {
  await app();
  await musterdaten();
  await B.auf();
  await ruhe(4000);
  await page.evaluate(() => { window.__kt.m = 0; window.__ktGetestetK = new Set(); }).catch(() => {});
}

/* ---------- 1. Auf- und Zuklappen ---------- */
async function klappen(B) {
  await herstellen(B);
  const namen = await page.evaluate(w => window.__ktKlappbar(w), B.wurzel);
  for (let i = 0; i < namen.length; i++) {
    neuesLog();
    const h = (await page.evaluateHandle(i => window.__ktK[i], i)).asElement();
    if (!h) continue;
    try {
      const vor = await h.evaluate(e => window.__ktInhaltSichtbar(e));
      await h.click({ timeout: 4000 }).catch(async () => { await h.evaluate(e => e.click()); LOG.fehler.push('nur per Skript klickbar (verdeckt)'); });
      await page.waitForTimeout(120);
      const mitte = await h.evaluate(e => window.__ktInhaltSichtbar(e));
      await h.click({ timeout: 4000 }).catch(async () => { await h.evaluate(e => e.click()); });
      await page.waitForTimeout(120);
      const nach = await h.evaluate(e => window.__ktInhaltSichtbar(e));
      if (mitte === vor) notiere('Klappen', namen[i], 'Fehler', 'Inhalt ändert sich beim Klick nicht (' + (vor ? 'bleibt offen' : 'bleibt zu') + ')');
      else if (nach !== vor) notiere('Klappen', namen[i], 'Fehler', 'zweiter Klick stellt nicht wieder her');
      else if (LOG.fehler.length) notiere('Klappen', namen[i], 'Fehler', LOG.fehler.join(' | '));
      else notiere('Klappen', namen[i], 'ok', vor ? 'zu und wieder auf' : 'auf und wieder zu');
    } catch (e) { notiere('Klappen', namen[i], 'Fehler', e.message.split('\n')[0]); }
  }
  return namen.length;
}

/* ---------- 2. Eingabefelder ---------- */
const NEU_AUFGEBAUT = 'nach dem Neuaufbau der Ansicht nicht wiedergefunden — nicht geprüft';
function testwert(info) {
  const v = info.wert;
  if (info.typ === 'date') return v || '2026-10-01';
  if (info.typ === 'month') return v || '2026-10';
  if (info.typ === 'time') return v || '10:30';
  if (info.typ === 'number') return v || '12';
  if (info.typ === 'email') return v || 'test@example.org';
  if (info.typ === 'tel') return v || '07062 123456';
  if (info.typ === 'url') return v || 'https://example.org';
  if (v) return v;   // vorhandenen Wert neu eintippen: prüft die Eingabe, ohne den Musterfall zu verfälschen
  if (/decimal|numeric/.test(info.im) || /^[\d.,\s€%-]+$/.test(info.ph || '')) return '12';
  return 'Test';
}
async function felder(B) {
  await herstellen(B);
  let n = 0;
  for (let runde = 0; runde < 400; runde++) {   // neu aufgebaute Ansichten: nächste Runde nimmt die übrigen Felder
    const anzahl = await page.evaluate(w => window.__ktFelder(w), B.wurzel);
    if (!anzahl) break;
    for (let i = 0; i < anzahl; i++) {
      const h = (await page.evaluateHandle(i => window.__ktF[i], i)).asElement(); if (!h) continue;
      const info = await h.evaluate(e => { if (!e.isConnected) return null; window.__ktGetestetK.add(e.__ktKey);
        return { key: e.__ktKey, pfad: window.__ktPfad(e), tag: e.tagName.toLowerCase(), typ: e.type, wert: e.value, an: e.checked, im: e.inputMode || '', ph: e.placeholder || '', name: window.__ktFeldName(e),
          opts: e.tagName === 'SELECT' ? [...e.options].filter(o => !o.disabled).map(o => o.value) : null,
          ok: e.isConnected && e.checkVisibility({ checkVisibilityCSS: true }) && !e.disabled && !e.readOnly }; }).catch(() => null);
      if (!info || !info.ok) continue;
      n++; neuesLog();
      let detail = '';
      try {
        if (info.typ === 'checkbox' || info.typ === 'radio') {
          // die App baut manche Listen beim Umschalten neu auf (Berichtsumfang, Exposé-Fotos): das Feld dann neu holen
          const da = x => x.evaluate(e => e.isConnected).catch(() => false);
          const frisch = async alt => (await da(alt)) ? alt
            : ((await page.evaluateHandle(([w, q]) => window.__ktWieder(w, q), [B.wurzel, { key: info.key, pfad: info.pfad, tag: info.tag, typ: info.typ }])).asElement() || alt);
          let feld = h;
          // „verdeckt“ nur, wenn ein Klick auf das vorhandene Feld scheitert — nicht, wenn es gerade neu aufgebaut wurde
          const klick = async () => {
            for (let v = 0; v < 3; v++) {
              feld = await frisch(feld); if (!(await da(feld))) break;
              try { await feld.click({ timeout: 3000 }); return; }
              catch (e) { if (await da(feld)) { await feld.evaluate(x => x.click()); detail = 'nur per Skript klickbar (verdeckt' + grund(e) + ') · '; return; } }
            }
            throw new Error(NEU_AUFGEBAUT); };
          await klick(); await ruhe(2000); feld = await frisch(feld);
          const nach1 = await feld.evaluate(e => e.checked);
          if (info.typ === 'radio') { if (!nach1) throw new Error('lässt sich nicht auswählen'); detail += 'ausgewählt'; }
          else {
            // bleibt der Haken und die App sagt warum (z. B. „Mindestens ein Verfahren …“), ist das gewollt
            if (nach1 === info.an && LOG.dialoge.length) detail += 'abgelehnt mit Meldung';
            else if (nach1 === info.an) throw new Error('Haken ändert sich nicht');
            // Schalter bleiben eingeschaltet, damit abhängige Felder sichtbar werden
            else if (!info.an) detail += 'ein (bleibt an)';
            else { await klick(); await ruhe(2000); feld = await frisch(feld); if ((await feld.evaluate(e => e.checked)) !== info.an) throw new Error('Haken lässt sich nicht zurücksetzen'); detail += 'aus und wieder an'; }
          }
        } else if (info.tag === 'select') {
          const andere = info.opts.find(o => o !== info.wert);
          if (andere === undefined) detail = 'nur eine Auswahl';
          else { await h.selectOption(andere, { timeout: 3000 }); await ruhe(2000);
            const v = await h.evaluate(e => e.value).catch(() => null);
            if (v !== andere && v !== null) throw new Error('Auswahl bleibt nicht (' + v + ' statt ' + andere + ')');
            if (await h.evaluate(e => e.isConnected && !e.disabled).catch(() => false)) { await h.selectOption(info.wert, { timeout: 3000 }).catch(() => {}); await ruhe(2000); }
            detail = info.opts.length + ' Einträge, umgestellt und zurück'; }
        } else if (info.typ === 'range') {
          await h.evaluate(e => { e.value = e.max || 1; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
          await ruhe(1500); detail = 'Regler bewegt';
        } else if (info.typ === 'color') { detail = 'Farbfeld';
        } else {
          const w = testwert(info);
          await h.fill('', { timeout: 3000 }); await h.fill(w, { timeout: 3000 });
          await h.evaluate(e => { e.dispatchEvent(new Event('change', { bubbles: true })); e.blur(); }).catch(() => {});
          await ruhe(2000);
          const nach = await h.evaluate(e => e.isConnected ? e.value : null).catch(() => null);
          if (nach === '') throw new Error('Feld ist nach der Eingabe leer');
          const ziff = s => String(s).replace(/\D/g, '');
          if (nach !== null && nach !== w && ziff(nach).indexOf(ziff(w).replace(/0+$/, '')) < 0 && !/date|month|time/.test(info.typ)) detail = 'eingegeben „' + w + '“, steht „' + nach + '“';
          else detail = '„' + w + '“' + (nach !== null && nach !== w ? ' → „' + nach + '“' : '');
        }
      } catch (e) { notiere('Feld', info.name, e.message === NEU_AUFGEBAUT ? 'Hinweis' : 'Fehler', e.message.split('\n')[0]); continue; }
      if (LOG.fehler.length) notiere('Feld', info.name, 'Fehler', LOG.fehler.join(' | '));
      else if (/steht „|verdeckt/.test(detail)) notiere('Feld', info.name, 'prüfen', detail);
      else notiere('Feld', info.name, 'ok', detail + (LOG.dialoge.length ? ' · Meldung: ' + LOG.dialoge.join(' / ') : ''));
    }
  }
  // nach dem Ausfüllen mit Testwerten nur ein Hinweis (z. B. Datumsfelder, die eine Testumgebung als Textfeld zeigt)
  const nan = await page.evaluate(w => window.__ktNaN(w), B.wurzel).catch(() => []);
  for (const x of nan) notiere('Anzeige', x, 'Hinweis', 'NaN/undefined nach dem Ausfüllen mit Testwerten');
  return n;
}

/* ---------- 3. Knöpfe und Links ---------- */
async function knoepfe(B) {
  await herstellen(B);
  const nanStart = await page.evaluate(w => window.__ktNaN(w), B.wurzel).catch(() => []);
  for (const x of nanStart) notiere('Anzeige', x, 'Fehler', 'NaN/undefined schon mit dem Musterfall');
  const liste = await page.evaluate(w => window.__ktKnoepfe(w), B.wurzel);
  let zustandOk = true;
  for (const k of liste) {
    if (k.extern) { notiere('Link', k.name, 'ok', 'externer Link ' + k.href + ' (nicht geöffnet)'); continue; }
    if (B.nicht && B.nicht.test(k.name)) { notiere('Knopf', k.name, 'übersprungen', B.nichtGrund || ''); continue; }
    if (!zustandOk) { await herstellen(B); zustandOk = true; }
    let gef = await page.evaluate(([w, key]) => window.__ktFinde(w, key), [B.wurzel, k.key]).catch(() => false);
    if (!gef) { await herstellen(B); gef = await page.evaluate(([w, key]) => window.__ktFinde(w, key), [B.wurzel, k.key]).catch(() => false); }
    if (!gef) { notiere('Knopf', k.name, 'nicht gefunden', 'nach Neuladen nicht mehr da (z. B. durch einen vorherigen Knopf entfernt)'); continue; }
    const h = (await page.evaluateHandle(() => window.__ktZiel)).asElement();
    neuesLog();
    // erst hinscrollen und warten (auch weiches Scrollen), dann zählen: das Hinscrollen ist keine Wirkung des Knopfs
    await h.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(450);
    await page.evaluate(() => { const k = window.__kt; k.m = 0; k.s = 0; k.print = 0; k.share = 0; k.clip = 0;
      window.__ktSigVor = window.__ktSig(); window.__ktUrlVor = location.href; window.__ktWerteVor = window.__ktWerte(); });
    let verdeckt = '';
    try { await h.click({ timeout: 4000 }); }
    catch (e) { verdeckt = 'nur per Skript klickbar (verdeckt oder außerhalb' + grund(e) + ')';
      try { await h.evaluate(el => el.click()); } catch (e2) { notiere('Knopf', k.name, 'Fehler', 'nicht klickbar: ' + e2.message.split('\n')[0]); zustandOk = false; continue; } }
    await ruhe();
    let w;
    try { w = await page.evaluate(() => ({ m: window.__kt.m, s: window.__kt.s, print: window.__kt.print, share: window.__kt.share, clip: window.__kt.clip,
      sigVor: window.__ktSigVor, sigNach: window.__ktSig(), url: location.href, urlVor: window.__ktUrlVor, werte: window.__ktWerteDiff() })); }
    catch (e) { w = { neu: true }; }
    const wirk = [];
    if (w.neu || w.urlVor === undefined) wirk.push('Seite neu geladen');
    else {
      if (w.sigNach !== w.sigVor) wirk.push('Ansicht: ' + sigText(w.sigVor, w.sigNach));
      if (w.url !== w.urlVor) wirk.push('Adresse ' + w.url.replace(BASIS, ''));
      if (w.print) wirk.push('Druck'); if (w.share) wirk.push('Teilen'); if (w.clip) wirk.push('kopiert');
      if (w.s && w.sigNach === w.sigVor) wirk.push('scrollt');
      if (w.m > 0) wirk.push(w.m + ' Änderungen');
      if (w.werte > 0) wirk.push(w.werte + ' Feldwerte geändert');
    }
    if (LOG.dialoge.length) wirk.push('Meldung: ' + LOG.dialoge.join(' / '));
    if (LOG.downloads.length) wirk.push('Download: ' + LOG.downloads.join(', '));
    if (LOG.popups.length) wirk.push('neues Fenster');
    if (LOG.dateien.length) wirk.push('Dateiauswahl (' + LOG.dateien.join(', ') + ') mit Testdatei');
    const detail = (verdeckt ? verdeckt + ' · ' : '') + wirk.join(' · ');
    if (LOG.fehler.length) notiere('Knopf', k.name, 'Fehler', LOG.fehler.join(' | ') + (detail ? ' · ' + detail : ''));
    else if (!wirk.length) notiere('Knopf', k.name, 'ohne Wirkung', verdeckt);
    else notiere('Knopf', k.name, verdeckt ? 'prüfen' : 'ok', detail);
    if (w.neu || w.sigNach !== w.sigVor || w.url !== w.urlVor || LOG.dialoge.length || LOG.fehler.length || LOG.dateien.length) zustandOk = false;
    if ((LOG.fehler.length || verdeckt) && SHOTS < 40) { SHOTS++; await page.screenshot({ path: path.join(OUT, 'befund-' + SHOTS + '.png') }).catch(() => {}); }
  }
  return liste.length;
}
function sigText(a, b) {
  try { const x = JSON.parse(a), y = JSON.parse(b), d = [];
    const auf = y.ov.filter(o => !x.ov.includes(o)), zu = x.ov.filter(o => !y.ov.includes(o));
    if (auf.length) d.push('öffnet ' + auf.join(', ')); if (zu.length) d.push('schließt ' + zu.join(', '));
    if (x.rm !== y.rm) d.push(y.rm ? 'Bericht/Dokument' : 'zurück aus Bericht');
    if (x.tab !== y.tab) d.push('Reiter ' + y.tab); if (x.st !== y.st) d.push(y.st ? 'Bewertung geöffnet' : 'Bewertung verlassen');
    if (x.s1 !== y.s1 && y.s1) d.push('Objektart-Wahl'); if (x.s0 !== y.s0 && y.s0) d.push('Startseite');
    if (JSON.stringify(x.lv) !== JSON.stringify(y.lv)) d.push('Liegenschaften ' + JSON.stringify(y.lv));
    if (x.mt !== y.mt) d.push('Markt-Reiter ' + y.mt.trim());
    return d.join(', ') || 'geändert'; } catch (e) { return 'geändert'; }
}

/* ---------- Testserver ---------- */
let server = null;
async function serverStarten() {
  if (process.env.KT_URL) return;
  server = spawn(process.execPath, [path.join(REPO, 'tests', 'server.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) { try { if ((await fetch(BASIS + 'index.html')).ok) return; } catch (e) {} await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Testserver auf Port ' + PORT + ' startet nicht');
}

/* ---------- Ablauf ---------- */
const t0 = Date.now();
await serverStarten();
try {
  await starten();
  for (const B of BEREICHE) {
    if (NUR && !NUR.test(B.name)) continue;
    if (OHNE && OHNE.test(B.name)) continue;
    BEREICH = B.name;
    console.log('\n## ' + B.name);
    try {
      const nk = NUR_KNOEPFE ? 0 : await klappen(B);
      const nf = NUR_KNOEPFE ? 0 : await felder(B);
      const nb = B.ohneKnoepfe ? 0 : await knoepfe(B);
      if (B.ohneKnoepfe) notiere('Knopf', '(alle)', 'übersprungen', B.ohneKnoepfe);
      console.log('   ' + nk + ' klappbar, ' + nf + ' Felder, ' + nb + ' Knöpfe/Links');
    } catch (e) { notiere('Bereich', B.name, 'Fehler', 'Test abgebrochen: ' + e.message.split('\n')[0]); }
    writeFileSync(path.join(OUT, 'ergebnis.json'), JSON.stringify(ERG, null, 1));
  }
  await browser.close();
} finally { if (server) server.kill(); }

/* ---------- Auswertung ---------- */
const minuten = Math.round((Date.now() - t0) / 60000);
// Monat und Datum im Namen (z. B. Titelfolie „Ihr Haus Oktober 2026“) ändern sich von selbst — für den Vergleich ersetzen
const MONATE = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const schluessel = r => r.bereich + ' | ' + r.element.replace(new RegExp('\\b(' + MONATE + ') \\d{4}\\b', 'g'), '‹Monat›')
  .replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, '‹Datum›').replace(/\b\d{4}-\d{2}-\d{2}\b/g, '‹Datum›');
const ohne = ERG.filter(r => r.ergebnis === 'ohne Wirkung').map(schluessel);
if (opt('erwartung')) writeFileSync(ERWARTUNG, JSON.stringify([...new Set(ohne)].sort(), null, 1) + '\n');
const erwartet = new Set(existsSync(ERWARTUNG) ? JSON.parse(readFileSync(ERWARTUNG, 'utf8')) : []);
const neuOhne = [...new Set(ohne)].filter(x => !erwartet.has(x));
// rot: Skriptfehler, nicht funktionierende Felder/Klappbereiche, verdeckte Knöpfe, NaN schon mit dem Musterfall
const befunde = ERG.filter(r => r.ergebnis === 'Fehler' || (r.ergebnis === 'prüfen' && r.art !== 'Anzeige'));
const zaehl = {}; for (const r of ERG) { const z = zaehl[r.bereich] = zaehl[r.bereich] || { Klappen: 0, Feld: 0, Knopf: 0, befunde: 0 };
  const a = r.art === 'Link' ? 'Knopf' : r.art; if (a in z) z[a]++; if (befunde.includes(r)) z.befunde++; }
const md = ['# Klicktest ' + (GERAET === 'iphone' ? 'iPhone-Ansicht (WebKit)' : 'PC (Chromium)') + ' — ' + new Date().toLocaleString('de-DE') + ' (' + minuten + ' min)', '',
  '| Bereich | Auf-/Zuklappen | Felder | Knöpfe/Links | Befunde |', '|---|---:|---:|---:|---:|',
  ...Object.entries(zaehl).map(([b, z]) => '| ' + b + ' | ' + z.Klappen + ' | ' + z.Feld + ' | ' + z.Knopf + ' | ' + (z.befunde || '') + ' |'), '',
  '## Befunde' + (befunde.length ? ' (' + befunde.length + ')' : ' — keine'), ...befunde.map(r => '- **' + r.bereich + '** · ' + r.art + ' „' + r.element + '“: ' + r.detail), '',
  '## Neu „ohne Wirkung“' + (neuOhne.length ? ' (' + neuOhne.length + ') — bitte ansehen' : ' — keine'), ...neuOhne.map(x => '- ' + x), '',
  '## Hinweise', ...ERG.filter(r => r.ergebnis === 'Hinweis').map(r => '- ' + r.bereich + ': ' + r.element + ' — ' + r.detail),
  '', 'Erwartet „ohne Wirkung“: ' + erwartet.size + ' (aktive Reiter, bereits offene Ansichten, leere Eingaben, Tabellenzeilen) · Liste: tests/klick/' + path.basename(ERWARTUNG)];
writeFileSync(path.join(OUT, 'bericht.md'), md.join('\n') + '\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
if (process.env.GITHUB_ACTIONS) {
  for (const r of befunde.slice(0, 30)) console.log('::error title=Klicktest ' + GERAET + '::' + r.bereich + ' · ' + r.element + ': ' + r.detail.replace(/\n/g, ' '));
  for (const x of neuOhne.slice(0, 30)) console.log('::warning title=Klicktest ' + GERAET + ' – ohne Wirkung::' + x);
}
const summe = a => ERG.filter(r => (r.art === 'Link' ? 'Knopf' : r.art) === a).length;
console.log('\n==== Klicktest ' + GERAET + ': ' + summe('Klappen') + ' Klappbereiche, ' + summe('Feld') + ' Felder, ' + summe('Knopf') + ' Knöpfe/Links in ' + minuten + ' min — '
  + (befunde.length ? befunde.length + ' Befunde' : 'keine Befunde') + (neuOhne.length ? ', ' + neuOhne.length + ' neu „ohne Wirkung“' : '') + ' ====');
console.log('Bericht: ' + path.relative(REPO, path.join(OUT, 'bericht.md')));
process.exitCode = befunde.length ? 1 : 0;
