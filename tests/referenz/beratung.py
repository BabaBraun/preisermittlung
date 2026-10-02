# -*- coding: utf-8 -*-
"""Unabhängige Nachrechnung für die Beratungswerkzeuge (js/beratung.js), D38.

Anderer Rechenweg als im JavaScript:
- Vervielfältiger nach § 14 Abs. 1 BewG wie das BMF: Zeitrente über die durchschnittliche Lebenserwartung (zwei Stellen),
  5,5 %, Mittel aus vorschüssiger (Summe v^k, k = 0 … ) und nachschüssiger Zahlung (Summe v^k, k = 1 … ), für gebrochene
  Laufzeiten über die geschlossene Formel; dazu der Abgleich mit allen Werten der BMF-Tabelle 2026
  (tests/fixtures/bmf-vervielfaeltiger-2026.json).
- Leibrente monatlich vorschüssig (Gleichverteilung der Sterbefälle im Jahr): Summe über Jahre und darin über Monate
  mit der Überlebenswahrscheinlichkeit aus der linear interpolierten Überlebendenzahl; zwei Personen: 1 − (1 − p1)(1 − p2).
- Erbschaftsteuer nach § 19 ErbStG mit Härteausgleich über eine eigene Tabellensuche.

Aufruf: python tests/referenz/beratung.py   → JSON {vervielfaeltiger:[...], renten:[...], steuer:[...]}
"""
import json, math, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nur_json  # noqa: E402


def tafel_laden():
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'sterbetafel.js')
    text = open(pfad, encoding='utf-8').read()
    return json.loads(re.search(r'tafel:(\{.*?\})\};', text, re.S).group(1))


def l_funktion(t):
    oben = len(t['lx']) - 1
    p = 1 - t['qx'][oben]
    return lambda a: t['lx'][a] if a <= oben else t['lx'][oben] * p ** (a - oben)


def zeitrente(n):
    q = 1.055
    nach = (1 - q ** -n) / (q - 1)          # nachschüssig
    vor = nach * q                          # vorschüssig
    return round((vor + nach) / 2 + 1e-12, 3)


def vervielfaeltiger(t, alter):
    x = min(int(math.floor(alter)), len(t['ex']) - 1)
    return zeitrente(round(t['ex'][x], 2))


def bmf_abgleich():
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fixtures', 'bmf-vervielfaeltiger-2026.json')
    d = json.load(open(pfad, encoding='utf-8'))['alter']
    return [{'alter': int(a), 'em': w[0], 'vm': w[1], 'ew': w[2], 'vw': w[3], 'vm_neu': zeitrente(w[0]), 'vw_neu': zeitrente(w[2])}
            for a, w in d.items()]


def p_person(t, alter):
    l = l_funktion(t)
    x = min(int(math.floor(alter)), len(t['lx']) - 1)
    def p(s):
        k = int(math.floor(s)); f = s - k
        return (l(x + k) - f * (l(x + k) - l(x + k + 1))) / l(x)
    return p


def rentenfaktor(tafel, personen, zins, garantie):
    ps = [p_person(tafel[g], a) for a, g in personen]
    v = 1 / (1 + zins / 100)
    summe = 0.0
    for jahr in range(0, 130):
        for monat in range(12):
            s = jahr + monat / 12
            tot = 1.0
            for p in ps:
                tot *= 1 - p(s)
            w = 1.0 if s < garantie - 1e-9 else 1 - tot
            summe += v ** s * w / 12
    return summe


def lebenserwartung(tafel, personen):
    ps = [p_person(tafel[g], a) for a, g in personen]
    def p(s):
        tot = 1.0
        for q in ps:
            tot *= 1 - q(s)
        return 1 - tot
    werte = [p(m / 12) for m in range(0, 12 * 130)]
    return math.fsum((werte[i] + werte[i + 1]) / 2 / 12 for i in range(len(werte) - 1))


GRENZEN = [75000, 300000, 600000, 6000000, 13000000, 26000000]
SAETZE = {1: [7, 11, 15, 19, 23, 27, 30], 2: [15, 20, 25, 30, 35, 40, 43], 3: [30, 30, 30, 30, 50, 50, 50]}


def steuer(erwerb, klasse):
    e = math.floor(max(0, erwerb) / 100) * 100
    if e <= 0:
        return 0
    stufe = 0
    while stufe < len(GRENZEN) and e > GRENZEN[stufe]:
        stufe += 1
    satz = SAETZE[klasse][stufe] / 100
    voll = e * satz
    if stufe == 0:
        return math.floor(voll + 1e-9)
    g = GRENZEN[stufe - 1]
    an_grenze = g * SAETZE[klasse][stufe - 1] / 100
    faktor = 0.5 if satz <= 0.30 else 0.75
    return math.floor(min(voll, an_grenze + faktor * (e - g)) + 1e-9)


def main():
    ausgeben = nur_json.umlenken()
    tafel = tafel_laden()
    vv = [{'alter': a, 'geschlecht': g, 'v': vervielfaeltiger(tafel[g], a)} for a in (50, 60, 66, 68, 70, 75, 80, 85, 90, 99) for g in ('m', 'w')]
    renten = []
    for personen, zins, garantie in [([(70, 'm')], 3, 0), ([(75, 'w')], 3, 0), ([(72, 'm'), (70, 'w')], 3, 0),
                                     ([(78, 'w')], 2.5, 10), ([(80, 'm'), (77, 'w')], 4, 5)]:
        renten.append({'personen': [{'alter': a, 'g': g} for a, g in personen], 'zins': zins, 'garantie': garantie,
                       'faktor': rentenfaktor(tafel, personen, zins, garantie), 'e': lebenserwartung(tafel, personen)})
    st = [{'erwerb': e, 'klasse': k, 'steuer': steuer(e, k)}
          for e in (0, 99, 75000, 75100, 82000, 300000, 310000, 590000, 600100, 650000, 6000000, 6100000, 13100000, 26500000)
          for k in (1, 2, 3)]
    ausgeben({'vervielfaeltiger': vv, 'renten': renten, 'steuer': st, 'bmf2026': bmf_abgleich()})


if __name__ == '__main__':
    main()
