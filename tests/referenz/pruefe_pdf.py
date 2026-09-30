# -*- coding: utf-8 -*-
"""Öffnet ein PDF mit PyMuPDF und gibt Seitenzahl, Seitengröße und Text je Seite als JSON aus.
Optional: --bilder ordner  speichert jede Seite als PNG (für die Sichtkontrolle)."""
import json, sys, os


def main():
    import pymupdf as fitz
    pfad = sys.argv[1]
    d = fitz.open(pfad)
    seiten = []
    for i, s in enumerate(d):
        seiten.append({'breite_mm': round(s.rect.width / 72 * 25.4), 'hoehe_mm': round(s.rect.height / 72 * 25.4),
                       'text': s.get_text(), 'bilder': len(s.get_images())})
    if '--bilder' in sys.argv:
        ziel = sys.argv[sys.argv.index('--bilder') + 1]
        os.makedirs(ziel, exist_ok=True)
        for i, s in enumerate(d):
            s.get_pixmap(dpi=50).save(os.path.join(ziel, 'seite_%02d.png' % (i + 1)))
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({'seiten': len(d), 'details': seiten}, ensure_ascii=False))


if __name__ == '__main__':
    main()
