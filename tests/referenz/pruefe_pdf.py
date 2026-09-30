# -*- coding: utf-8 -*-
"""Öffnet ein PDF mit PyMuPDF und gibt Seitenzahl, Seitengröße und Text je Seite als JSON aus.
Optional: --bilder ordner  speichert jede Seite als PNG (für die Sichtkontrolle)."""
import json, sys, os


def main():
    try:
        import pymupdf as fitz          # aktueller Modulname
    except ImportError:
        import fitz
    # MuPDF-Warnungen nicht auf die Standardausgabe (sie stünden sonst vor dem JSON)
    try:
        fitz.TOOLS.mupdf_display_warnings(False)
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass
    pfad = sys.argv[1]
    d = fitz.open(pfad)
    seiten = []
    for i, s in enumerate(d):
        # unterste Textzeile nach Koordinaten (ohne laufende Kopfzeile) mit Schriftgröße — für die Prüfung,
        # ob eine Überschrift allein am Seitenende steht (die Reihenfolge von get_text() ist nicht verlässlich)
        zeilen = []
        for blk in s.get_text('dict')['blocks']:
            for ln in blk.get('lines', []):
                t = ''.join(sp['text'] for sp in ln['spans']).strip()
                if not t or ('Stichtag' in t and '·' in t):
                    continue
                zeilen.append({'text': t, 'y': round(ln['bbox'][3], 1), 'groesse': round(max(sp['size'] for sp in ln['spans']), 2)})
        letzte = max(zeilen, key=lambda z: z['y']) if zeilen else None
        seiten.append({'breite_mm': round(s.rect.width / 72 * 25.4), 'hoehe_mm': round(s.rect.height / 72 * 25.4),
                       'text': s.get_text(), 'bilder': len(s.get_images()), 'letzte': letzte,
                       'groessen': sorted({z['groesse'] for z in zeilen})})
    if '--bilder' in sys.argv:
        ziel = sys.argv[sys.argv.index('--bilder') + 1]
        os.makedirs(ziel, exist_ok=True)
        for i, s in enumerate(d):
            s.get_pixmap(dpi=50).save(os.path.join(ziel, 'seite_%02d.png' % (i + 1)))
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({'seiten': len(d), 'details': seiten}, ensure_ascii=False))


if __name__ == '__main__':
    main()
