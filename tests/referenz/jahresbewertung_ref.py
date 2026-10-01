# -*- coding: utf-8 -*-
"""Unabhängige Nachrechnung des Vordrucks der Jahresbewertung (Rechenweg der Excel-Preiseinschätzungen der Bank).

Anderer Rechenweg als js/jahresbewertung.js: Dezimalarithmetik (decimal) mit Excel-Rundung ROUND_HALF_UP, Bodenanteile
über Brüche, Restlaufzeit der PV über date-Differenzen. Fälle: tests/referenz/jahresbewertung_faelle.json (synthetisch).

Aufruf: python tests/referenz/jahresbewertung_ref.py   → JSON {name: {boden, substanz, ertrag, ergebnis, preise, vf, pv}}
"""
import json, os, sys
from datetime import date
from decimal import Decimal as D, ROUND_HALF_UP, getcontext

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nur_json  # noqa: E402
ausgeben = nur_json.umlenken()

getcontext().prec = 40
GEWICHTE = [D('0.23'), D('0.15'), D('0.11'), D('0.11'), D('0.11'), D('0.05'), D('0.09'), D('0.09'), D('0.06')]


def d(x):
    return D(str(x)) if x is not None else D(0)


def runden(x, stellen=0):
    return x.quantize(D(1).scaleb(-stellen), rounding=ROUND_HALF_UP)


def rbf(zins, n):
    """Rentenbarwertfaktor (nachschüssig), n auch gebrochen"""
    p = float(zins) / 100
    n = float(n)
    if n <= 0:
        return D(0)
    if p <= 0:
        return D(str(n))
    q = (1 + p) ** n
    return D(repr((q - 1) / (q * p)))


def datum(s):
    j, m, t = map(int, s.split('-'))
    return date(j, m, t)


def rechne(v):
    jahr = int(v['stichtag'][:4])
    boden = sum((d(b['flaeche']) * d(b['brw']) * (1 - d(b.get('abschlag')) / 100) for b in v['boden']), D(0))
    preise, rnds, gebaeude = [], [], D(0)
    for g in v['gebaeude']:
        k2 = [d(x) for x in g['kosten2']]
        kk = [(d(a) + b) / 2 for a, b in zip(g['kosten1'], k2)] if any(x > 0 for x in k2) else [d(a) for a in g['kosten1']]
        nhk = sum((w * sum((d(a) * k for a, k in zip(zeile, kk)), D(0)) for w, zeile in zip(GEWICHTE, g['anteile'])), D(0))
        nhk_ber = runden(nhk + runden(-nhk * d(g.get('abschlagBauweise')) / 100))
        index = runden(d(g['bpi']) * d(g['bpiFaktor']), 1)
        gnd = d(g['gnd'])
        rnd = d(g['rnd']) if g.get('rnd') else gnd - (jahr - d(g['baujahr']))
        wm = runden((gnd - rnd) / gnd * 100)
        heute = nhk_ber * index / 100
        preis = runden(heute * (1 - wm / 100))
        preise.append(float(preis)); rnds.append(rnd)
        gebaeude += d(g['bgf']) * preis
    zu = sum((d(p['betrag']) for p in v['pauschal']), D(0)) + sum((d(p['betrag']) for p in v['objektspezifisch']), D(0))
    pv = D(0)
    if v.get('pv'):
        p = v['pv']
        rest = D((datum(p['eegEnde']) - datum(v['stichtag'])).days) / 365
        pv = d(p['kwh']) * d(p['eurKwh']) * (1 - d(p['bwk']) / 100) * runden(rbf(p['lz'], max(rest, D(0))), 2)
    aus = {'boden': float(boden), 'preise': preise, 'vf': [], 'pv': float(pv)}
    if not v['gebaeude']:
        aus.update({'substanz': None, 'ertrag': None, 'ergebnis': float(boden + zu + pv)})
        return aus
    substanz = boden + gebaeude + zu + pv
    jahresmiete = {}
    for m in v['mieten']:
        g = int(m.get('gebaeude', 0))
        jahresmiete.setdefault(g, []).append(m)
    gesamt = sum((d(m['monat']) * 12 for m in v['mieten']), D(0))
    ertrag = D(0)
    for k, g in enumerate(sorted(jahresmiete)):
        zeilen = jahresmiete[g]
        roh = sum((d(m['monat']) * 12 for m in zeilen), D(0))
        if v.get('abschlagFest') is not None:
            abschlag = d(v['abschlagFest']) if k == 0 else D(0)
        else:
            abschlag = runden(sum((d(m['monat']) * 12 * d(m.get('abschlag')) / 100 for m in zeilen), D(0)))
        anteil = boden * roh / gesamt if len(jahresmiete) > 1 else boden
        rein = roh * (1 - d(v['bwk']) / 100) - abschlag - anteil * d(v['lz']) / 100
        vf = runden(rbf(v['lz'], rnds[g]), 2)
        aus['vf'].append(float(vf))
        ertrag += rein * vf + anteil
    ertrag += pv
    gw = d(v.get('gewichtung', 50))
    aus.update({'substanz': float(substanz), 'ertrag': float(ertrag), 'ergebnis': float(substanz * gw / 100 + ertrag * (100 - gw) / 100)})
    return aus


pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jahresbewertung_faelle.json')
faelle = json.load(open(pfad, encoding='utf-8'))['faelle']
ausgeben({f['name']: rechne(f['vordruck']) for f in faelle})
