# -*- coding: utf-8 -*-
"""Liest einen Portal-Export (ZIP oder XML, D39) mit der Standardbibliothek und gibt den Aufbau als JSON aus.

  python tests/referenz/pruefe_openimmo.py export.zip|export.xml

- ZIP: zipfile.testzip() prüft Prüfsummen und Aufbau, die XML-Datei wird aus dem Archiv gelesen
- XML: xml.etree.ElementTree prüft die Wohlgeformtheit (unabhängig von der Erzeugung in js/portal.js)
Ausgabe je Immobilie: Reihenfolge der Kindelemente je Pfad, Texte und Attribute je Pfad (wiederholte Elemente mit [n]).
Auf die Standardausgabe geht ausschließlich das JSON (siehe nur_json.py).
"""
import sys, zipfile
import xml.etree.ElementTree as ET
import nur_json


def flach(el, pfad, kinder, werte, attrs):
    namen = [k.tag for k in el]
    kinder[pfad or '.'] = namen
    zaehler = {}
    for k in el:
        zaehler[k.tag] = zaehler.get(k.tag, 0) + 1
        mehrfach = namen.count(k.tag) > 1
        p = (pfad + '/' if pfad else '') + k.tag + ('[%d]' % zaehler[k.tag] if mehrfach else '')
        if k.attrib:
            attrs[p] = dict(k.attrib)
        if len(k):
            flach(k, p, kinder, werte, attrs)
        elif k.text is not None and k.text.strip():
            werte[p] = k.text


def lies(text):
    wurzel = ET.fromstring(text)
    ue = wurzel.find('uebertragung')
    anbieter = wurzel.find('anbieter')
    immo = []
    for i in anbieter.findall('immobilie'):
        kinder, werte, attrs = {}, {}, {}
        flach(i, '', kinder, werte, attrs)
        immo.append({'kinder': kinder, 'werte': werte, 'attrs': attrs})
    return {'wurzel': wurzel.tag, 'kinder': [k.tag for k in wurzel], 'uebertragung': dict(ue.attrib) if ue is not None else None,
            'anbieter': [k.tag for k in anbieter if k.tag != 'immobilie'],
            'anbieter_werte': {k.tag: k.text for k in anbieter if k.tag != 'immobilie'}, 'immobilien': immo}


def main(pfad):
    if pfad.lower().endswith('.zip'):
        with zipfile.ZipFile(pfad) as z:
            kaputt = z.testzip()
            if kaputt:
                raise SystemExit('ZIP-Prüfsumme falsch: ' + kaputt)
            namen = z.namelist()
            xmls = [n for n in namen if n.lower().endswith('.xml')]
            if len(xmls) != 1:
                raise SystemExit('genau eine XML-Datei erwartet, gefunden: %r' % xmls)
            erg = lies(z.read(xmls[0]))
            erg['dateien'] = namen
            erg['groessen'] = {i.filename: i.file_size for i in z.infolist()}
            return erg
    with open(pfad, 'rb') as f:
        return lies(f.read())


if __name__ == '__main__':
    ausgeben = nur_json.umlenken()
    ausgeben(main(sys.argv[1]))
