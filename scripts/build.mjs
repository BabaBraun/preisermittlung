/* Service Worker erzeugen: Version = Inhalts-Hash aller Offline-Dateien, vollständige Dateiliste aus sw.template.js.
   Aufruf: npm run build — danach sw.js committen; GitHub Actions prüft, dass sie zum Inhalt passt. */
import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const WURZEL=['index.html','Wertermittlung.html','manifest.webmanifest','selbsttest.js','icons','assets','js','src','vendor'];
async function dateien(p){ const s=await stat(p); if(!s.isDirectory()) return [p];
  const aus=[]; for(const e of await readdir(p,{withFileTypes:true})) aus.push(...await dateien(p+'/'+e.name)); return aus; }
const alle=(await Promise.all(WURZEL.map(dateien))).flat().filter(p=>!(p.endsWith('.mjs')&&!p.startsWith('vendor/'))&&!p.endsWith('.md')).sort();   // .mjs nur aus vendor/ (pdf.js, D53)
/* Textdateien mit einheitlichen Zeilenenden hashen: Windows (CRLF) und GitHub Actions (LF) ergeben dieselbe Version */
const TEXT=/\.(html|js|css|json|webmanifest|txt|svg)$/i;
const hash=createHash('sha256');
for(const p of alle){ hash.update(p); const b=await readFile(p); hash.update(TEXT.test(p)&&!p.startsWith('vendor/')?b.toString('utf8').replace(/\r\n/g,'\n'):b); }
let sw=await readFile('sw.template.js','utf8');
sw=sw.replace('__VERSION__','immoapp-'+hash.digest('hex').slice(0,12))
  .replace('__ASSETS__','[\n'+['./',...alle.map(p=>'./'+p)].map(p=>"  '"+p+"'").join(',\n')+'\n]');
await writeFile('sw.js',sw);
console.log('sw.js erzeugt: '+alle.length+' Offline-Dateien.');
