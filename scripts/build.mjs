import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await build({entryPoints:['src/native.mjs'],bundle:true,format:'iife',globalName:'ImmoNative',outfile:'vendor/native.js',target:'es2020'});
await mkdir('assets/fonts',{recursive:true});let css='';
for(const [family,weights] of [['sans',[400,500,600]],['serif',[600]]])for(const weight of weights){const name=`ibm-plex-${family}-latin-${weight}-normal.woff2`;await cp(`node_modules/@fontsource/ibm-plex-${family}/files/${name}`,'assets/fonts/'+name);css+=`@font-face{font-family:'IBM Plex ${family==='sans'?'Sans':'Serif'}';font-style:normal;font-weight:${weight};font-display:swap;src:url('./fonts/${name}') format('woff2')}\n`;}
await writeFile('assets/fonts.css',css);
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','Wertermittlung.html','manifest.webmanifest','selbsttest.js','icons','assets','js','src','vendor'])await cp(file,'dist/'+file,{recursive:true});
async function files(dir){let result=[];for(const item of await readdir(dir,{withFileTypes:true})){const name=dir+'/'+item.name;result.push(...(item.isDirectory()?await files(name):[name]));}return result;}
const all=(await files('dist')).filter(p=>!p.endsWith('.mjs')&&!p.endsWith('.md')).sort();const hash=createHash('sha256');for(const p of all)hash.update(await readFile(p));
let sw=await readFile('sw.template.js','utf8');sw=sw.replace('__VERSION__','immoapp-'+hash.digest('hex').slice(0,12)).replace('__ASSETS__','[\n'+['./',...all.map(p=>'./'+p.slice(5))].map(p=>'  '+JSON.stringify(p).replaceAll("\"","'")).join(',\n')+'\n]');await writeFile('sw.js',sw);await writeFile('dist/sw.js',sw);console.log('Gebaut: '+all.length+' lokale Offline-Dateien.');
