/* Aufruf der Python-Prüfskripte (tests/referenz/pruefe_*.py) aus Node- und Browsertests.
   Die Skripte schreiben auf die Standardausgabe ausschließlich ihr JSON-Ergebnis. Alles andere — Exit-Code
   ungleich 0 oder zusätzliche Ausgabe — ist ein Fehler und wird mit stdout und stderr gemeldet; es wird
   nichts weggeschnitten, das einen echten Fehler verdecken könnte. */
import { spawnSync } from 'node:child_process';

/** erster Python-Befehl, mit dem sich die Module importieren lassen, sonst undefined */
export function pythonMit(module) {
  return ['python', 'python3'].find(p => spawnSync(p, ['-c', 'import ' + module], { encoding: 'utf8' }).status === 0);
}

const kuerzen = (t, max = 4000) => !t ? '(leer)'
  : t.length <= max ? t
  : t.slice(0, max - 1000) + '\n… (' + (t.length - max) + ' Zeichen hier ausgelassen) …\n' + t.slice(-1000);

/** führt Python mit den Argumenten aus und liest die gesamte Standardausgabe als JSON */
export function pythonJson(py, argumente) {
  const r = spawnSync(py, argumente, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const bericht = () => ['Aufruf: ' + [py, ...argumente].join(' '),
    'Exit-Code: ' + r.status + (r.error ? ' (' + r.error.message + ')' : ''),
    '--- stdout ---', kuerzen(r.stdout), '--- stderr ---', kuerzen(r.stderr)].join('\n');
  if (r.status !== 0) throw new Error('Python-Prüfung fehlgeschlagen\n' + bericht());
  try { return JSON.parse(r.stdout); }
  catch (e) { throw new Error('Ausgabe der Python-Prüfung ist kein reines JSON (' + e.message + ')\n' + bericht()); }
}
