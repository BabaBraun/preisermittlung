/* Aufruf der Python-Prüfskripte: auf der Standardausgabe steht nur das JSON-Ergebnis; zusätzliche Ausgabe
   führt zu einer verständlichen Fehlermeldung mit stdout und stderr statt zu einem nackten SyntaxError. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pythonMit, pythonJson } from '../pythonpruefung.mjs';

const PY = pythonMit('json');
const OHNE = !PY && !process.env.CI && 'Python fehlt';
// wie die Prüfskripte: Schutz einschalten, dann schreiben „Bibliotheken“ auf die Standardausgabe —
// einmal über Python (print) und einmal direkt auf Dateideskriptor 1 (wie MuPDF aus C-Code heraus)
const MIT_SCHUTZ = [
  "import sys, os; sys.path.insert(0, 'tests/referenz'); import nur_json",
  'ausgeben = nur_json.umlenken()',
  "print('warning: The `fitz` API is deprecated (nachgestellt)')",
  "os.write(1, b'warning: aus C-Code\\n')",
  "ausgeben({'ok': True, 'text': 'Grüße'})"
].join('\n');

test('Schutz der Standardausgabe: Meldungen landen auf stderr, stdout enthält nur das JSON', { skip: OHNE }, () => {
  const r = spawnSync(PY, ['-c', MIT_SCHUTZ], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '{"ok": true, "text": "Grüße"}');
  assert.match(r.stderr, /warning: The `fitz` API is deprecated/);
  assert.match(r.stderr, /warning: aus C-Code/);
  assert.deepEqual(pythonJson(PY, ['-c', MIT_SCHUTZ]), { ok: true, text: 'Grüße' });
});

test('zusätzliche Ausgabe vor dem JSON: Fehler nennt stdout und stderr', { skip: OHNE }, () => {
  const code = "import sys; print('warning: The `fitz` API is deprecated'); print('{\"seiten\": 1}'); sys.stderr.write('Hinweis auf stderr')";
  assert.throws(() => pythonJson(PY, ['-c', code]), e =>
    /kein reines JSON/.test(e.message) && /--- stdout ---\r?\nwarning: The `fitz` API is deprecated\r?\n\{"seiten": 1\}/.test(e.message)
    && /--- stderr ---\r?\nHinweis auf stderr/.test(e.message));
});

test('Abbruch des Skripts: Fehler nennt Exit-Code und stderr', { skip: OHNE }, () => {
  const code = "import sys; sys.stderr.write('Datei kaputt'); sys.exit(3)";
  assert.throws(() => pythonJson(PY, ['-c', code]), e =>
    /Python-Prüfung fehlgeschlagen/.test(e.message) && /Exit-Code: 3/.test(e.message) && /Datei kaputt/.test(e.message));
});

test('lange Ausgaben werden in der Meldung sichtbar gekürzt, nicht still', { skip: OHNE }, () => {
  const code = "print('x' * 20000)";
  assert.throws(() => pythonJson(PY, ['-c', code]), e => /Zeichen hier ausgelassen/.test(e.message));
});
