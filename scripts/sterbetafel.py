# -*- coding: utf-8 -*-
"""Amtliche Sterbetafel für Deutschland in die App übernehmen — immer die neueste Ausgabe.

Quelle: Statistisches Bundesamt (Destatis), „Statistischer Bericht – Sterbetafeln“ (Periodensterbetafel für
Deutschland nach Altersjahren, Tabellen 12613-b01 männlich und 12613-b02 weiblich, Blätter „csv-12613-b01/-b02“).

  python scripts/sterbetafel.py                 neueste Ausgabe auf destatis.de suchen; nur bei neuerer Ausgabe
                                                js/sterbetafel.js neu schreiben (Ausgabe: „aktuell“ oder „neu: …“)
  python scripts/sterbetafel.py datei.xlsx      aus einer bereits geladenen Datei erzeugen

Die GitHub-Action „Sterbetafel“ ruft das monatlich auf und übernimmt eine neue Ausgabe, wenn die Tests grün sind.
"""
import datetime, io, json, os, re, sys, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
ZIEL = os.path.join(HIER, '..', 'js', 'sterbetafel.js')
SEITE = ('https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/'
         'Publikationen/_publikationen-innen-periodensterbetafel.html')
BASIS = 'https://www.destatis.de'


def laden(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'ImmoApp-Sterbetafel/1.0 (+https://github.com/BabaBraun/preisermittlung)'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def neueste_ausgabe():
    """Link der neuesten „statistischer-bericht-sterbetafeln-….xlsx“ auf der Publikationsseite"""
    html = laden(SEITE).decode('utf-8', 'replace')
    links = sorted(set(re.findall(r'(/DE/[^"\']*statistischer-bericht-sterbetafeln-(\d+)\.xlsx)', html)), key=lambda x: int(x[1]))
    if not links:
        raise SystemExit('Keine Sterbetafel-Datei auf der Publikationsseite gefunden: ' + SEITE)
    return BASIS + links[-1][0] + '?__blob=publicationFile'


def auslesen(daten):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(daten), read_only=True, data_only=True)
    tafel, zeitraum = {}, None
    for blatt, g in (('csv-12613-b01', 'm'), ('csv-12613-b02', 'w')):
        zeilen = list(wb[blatt].iter_rows(values_only=True))
        kopf = [str(x or '').strip() for x in zeilen[0]]
        i = {k: kopf.index(k) for k in ('Gebiet', 'Geschlecht', 'Jahre', 'Alter', 'qx', 'lx', 'ex')}
        werte = [z for z in zeilen[1:] if z and z[i['Gebiet']] == 'Deutschland']
        alter = [int(z[i['Alter']]) for z in werte]
        if alter != list(range(len(alter))) or len(alter) < 100:
            raise SystemExit('Unerwarteter Aufbau in ' + blatt + ': Alter ' + str(alter[:3]) + ' … ' + str(alter[-3:]))
        zr = {str(z[i['Jahre']]) for z in werte}
        if len(zr) != 1:
            raise SystemExit('Mehrere Zeiträume in ' + blatt + ': ' + str(zr))
        zeitraum = zr.pop()
        tafel[g] = {'qx': [round(float(z[i['qx']]), 8) for z in werte], 'lx': [round(float(z[i['lx']]), 3) for z in werte],
                    'ex': [round(float(z[i['ex']]), 4) for z in werte]}
    pruefen(tafel)
    return zeitraum, tafel


def pruefen(tafel):
    """Plausibilität, bevor etwas geschrieben wird: lx fallend von 100.000, ex fallend, Frauen leben länger"""
    for g, t in tafel.items():
        if abs(t['lx'][0] - 100000) > 0.5:
            raise SystemExit(g + ': lx(0) ist nicht 100.000')
        if any(b > a + 1e-9 for a, b in zip(t['lx'], t['lx'][1:])):
            raise SystemExit(g + ': lx nicht monoton fallend')
        if not (70 < t['ex'][0] < 95) or any(b > a + 0.2 for a, b in zip(t['ex'][1:], t['ex'][2:])):
            raise SystemExit(g + ': ex unplausibel')
    if not tafel['w']['ex'][0] > tafel['m']['ex'][0]:
        raise SystemExit('Lebenserwartung Frauen nicht höher als Männer — Blätter vertauscht?')


def vorhandener_zeitraum():
    try:
        m = re.search(r"zeitraum:'(\d{4}/\d{4})'", open(ZIEL, encoding='utf-8').read())
        return m.group(1) if m else None
    except FileNotFoundError:
        return None


def schreiben(zeitraum, tafel, url):
    daten = json.dumps(tafel, separators=(',', ':'))
    text = ("/* Amtliche Sterbetafel " + zeitraum + " für Deutschland (Periodensterbetafel nach Altersjahren, 0 bis 100 Jahre)\n"
            "   Quelle: Statistisches Bundesamt (Destatis), Statistischer Bericht – Sterbetafeln " + zeitraum + ", Tabellen 12613-b01\n"
            "   (männlich) und 12613-b02 (weiblich); Datenlizenz Deutschland – Namensnennung – Version 2.0.\n"
            "   Automatisch erzeugt von scripts/sterbetafel.py — nicht von Hand ändern. Eine neuere Ausgabe ersetzt diese\n"
            "   Datei (GitHub-Action „Sterbetafel“, monatlich). qx Sterbewahrscheinlichkeit, lx Überlebende, ex fernere\n"
            "   Lebenserwartung in Jahren. */\n"
            "(function(wurzel){\n'use strict';\n"
            "const ImmoSterbetafel={zeitraum:'" + zeitraum + "',quelle:'Statistisches Bundesamt, Sterbetafel " + zeitraum + " für Deutschland',\n"
            "  url:'" + url.split('?')[0] + "',abgerufen:'" + datetime.date.today().isoformat() + "',\n"
            "  tafel:" + daten + "};\n"
            "wurzel.ImmoSterbetafel=ImmoSterbetafel;\n"
            "if(typeof module==='object'&&module.exports) module.exports=ImmoSterbetafel;\n"
            "})(typeof globalThis!=='undefined'?globalThis:this);\n")
    with open(ZIEL, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main():
    if len(sys.argv) > 1:   # datei.xlsx [Herkunfts-URL]
        zeitraum, tafel = auslesen(open(sys.argv[1], 'rb').read())
        schreiben(zeitraum, tafel, sys.argv[2] if len(sys.argv) > 2 else 'lokale Datei ' + os.path.basename(sys.argv[1]))
        print('geschrieben: ' + zeitraum)
        return
    url = neueste_ausgabe()
    zeitraum, tafel = auslesen(laden(url))
    alt = vorhandener_zeitraum()
    if alt and alt >= zeitraum:
        print('aktuell: ' + alt)
        return
    schreiben(zeitraum, tafel, url)
    print('neu: ' + zeitraum + (' (vorher ' + alt + ')' if alt else ''))


if __name__ == '__main__':
    main()
