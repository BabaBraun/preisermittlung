# -*- coding: utf-8 -*-
"""Unabhängige Nachrechnung des Leibrentenbarwertfaktors aus der amtlichen Sterbetafel (js/sterbetafel.js).

Anderer Rechenweg als im Rechenkern: Kommutationszahlen D(a) = v^a · l(a), N(x) = Σ D(a) für a ≥ x,
vorschüssige Jahresrente ä(x) = N(x) / D(x), monatlich vorschüssig nach Woolhouse ä(12)(x) = ä(x) − 11/24.
Über das Alter 100 hinaus wird mit der Überlebenswahrscheinlichkeit des Alters 100 fortgesetzt (300 Jahre).

Aufruf: python tests/referenz/leibrente.py   → JSON-Liste [{alter, geschlecht, zins, faktor, ex}]
"""
import json, math, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nur_json  # noqa: E402

FAELLE = [(a, g, z) for a in (40, 65, 74, 74.6, 81, 95, 100, 103) for g in ('m', 'w') for z in (0, 2.5, 3, 5.5)]


def tafel_laden():
    pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'sterbetafel.js')
    text = open(pfad, encoding='utf-8').read()
    return json.loads(re.search(r'tafel:(\{.*?\})\};', text, re.S).group(1))


def faktor(t, alter, zins):
    x = min(int(math.floor(alter)), len(t['lx']) - 1)
    oben = len(t['lx']) - 1
    p = 1 - t['qx'][oben]
    v = 1 / (1 + zins / 100)
    l = lambda a: t['lx'][a] if a <= oben else t['lx'][oben] * p ** (a - oben)
    D = lambda a: v ** a * l(a)
    N = math.fsum(D(a) for a in range(x, oben + 300))
    return N / D(x) - 11 / 24


def main():
    ausgeben = nur_json.umlenken()
    tafel = tafel_laden()
    ausgeben([{'alter': a, 'geschlecht': g, 'zins': z, 'faktor': faktor(tafel[g], a, z),
               'ex': tafel[g]['ex'][min(int(a), len(tafel[g]['ex']) - 1)]} for a, g, z in FAELLE])


if __name__ == '__main__':
    main()
