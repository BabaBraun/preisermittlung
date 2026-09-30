# -*- coding: utf-8 -*-
"""Die Standardausgabe der Prüfskripte gehört allein dem JSON-Ergebnis.

Bibliotheken schreiben unter Umständen Hinweise auf die Standardausgabe, PyMuPDF 1.28 etwa beim Import
des alten Modulnamens `fitz` („warning: The `fitz` API is deprecated …“); MuPDF selbst kann das auch aus
C-Code heraus. Deshalb wird Dateideskriptor 1 für die Dauer der Prüfung auf stderr umgelenkt — dort bleiben
die Meldungen sichtbar — und nur das Ergebnis geht auf die ursprüngliche Standardausgabe.
"""
import json, os, sys


def umlenken():
    """Vor dem ersten Import einer Bibliothek aufrufen. Gibt die Funktion zurück, die das Ergebnis schreibt."""
    sys.stdout.flush()
    fd = os.dup(1)          # ursprüngliche Standardausgabe
    os.dup2(2, 1)           # alles, was sonst auf stdout ginge (Python oder C), landet auf stderr
    sys.stdout.reconfigure(errors='backslashreplace')

    def ausgeben(daten):
        sys.stdout.flush()
        with os.fdopen(fd, 'w', encoding='utf-8') as aus:
            aus.write(json.dumps(daten, ensure_ascii=False, default=str) + '\n')
    return ausgeben
