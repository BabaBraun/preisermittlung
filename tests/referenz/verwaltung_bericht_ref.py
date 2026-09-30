# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung für den Eigentümerbericht / die Anlage V (js/verwaltung-bericht.js).

- Zuflussprinzip § 11 Abs. 1 EStG: eine Zahlung zählt im Jahr des Eingangs; Mietzahlungen, die zwischen dem
  22.12. und 10.01. eingehen und auf eine Monatsmiete angerechnet werden, die ebenfalls in diesem Zeitraum fällig
  ist, zählen zum Jahr der Fälligkeit (§ 11 Abs. 1 Satz 2 EStG). Welche Monatsmiete eine Zahlung tilgt, folgt der
  Kontoführung (§ 366 BGB, Funktion offene_posten der Vergleichsrechnung).
- Überzahlungen zählen im Eingangsjahr, Rücklastschriften mindern den Zufluss im Jahr der Rückbuchung.
- Aufteilung in Miete (Kaltmiete + Zuschläge), Umlagen (Vorauszahlungen, Nachforderungen) und Umsatzsteuer im
  Verhältnis der Sollstellung des Jahres; der Rundungsrest geht an die Miete.
- Ausgaben: Kosten mit Datum (ohne Datum: Beginn des Leistungszeitraums) im Jahr, gruppiert nach Art.
"""
from datetime import date
from fractions import Fraction as F
from verwaltung_mh_ref import cent


def fenster(d):
    return (d.month == 12 and d.day >= 22) or (d.month == 1 and d.day <= 10)


def steuerjahr(d, p):
    if p['art'] != 'miete':
        return d.year
    f = p['faellig']
    if abs(f.year - d.year) == 1 and fenster(d) and fenster(f) and abs((f - d).days) <= 20:
        return f.year
    return d.year


def jahresbericht(fall, offene_posten, sollstellung, miete_am):
    l, J = fall['liegenschaft'], fall['jahr']
    grenze = date(J + 1, 1, 10)
    aus = {'vertraege': {}, 'einnahmen': {'kalt': 0, 'umlagen': 0, 'ust': 0}, 'ausgaben': {}}
    summe = {'kalt': F(0), 'umlagen': F(0), 'ust': F(0), 'sonstige': F(0)}
    for v in l['vertraege']:
        z = [x for x in l.get('zahlungen', []) if x['vertragId'] == v['id'] and x.get('art') != 'kaution' and date.fromisoformat(x['datum']) <= grenze]
        op = offene_posten(v, z, grenze, 5)
        ids = {x['id']: x for x in z}
        ist, angerechnet = F(0), {}
        for p in op['roh']:
            for zid, d, b in p.get('zi', []):
                if zid not in ids or ids[zid]['betrag'] <= 0:
                    continue
                angerechnet[zid] = angerechnet.get(zid, F(0)) + b
                if steuerjahr(d, p) == J:
                    ist += b
        for x in z:
            d = date.fromisoformat(x['datum'])
            if d.year != J:
                continue
            if x['betrag'] > 0:
                rest = F(str(x['betrag'])) - angerechnet.get(x['id'], F(0))
                if rest > 0:
                    ist += rest
            else:
                ist += F(str(x['betrag']))
        soll = {'kalt': F(0), 'umlagen': F(0), 'ust': F(0), 'sonstige': F(0)}
        for p in sollstellung(v, date(J, 12, 31)):
            if p['art'] == 'miete' and p['id'][1:5] == str(J):
                t = p['teile']
                soll['kalt'] += F(str(t['kalt'])) + F(str(t['zuschlag']))
                soll['umlagen'] += F(str(t['nk'])) + F(str(t['hk']))
                soll['ust'] += F(str(p['ust']))
            elif p['art'] != 'miete' and p['faellig'].year == J:
                soll['umlagen' if p['art'] == 'nk_nachzahlung' else 'sonstige'] += F(str(p['betrag']))
        s = sum(soll.values())
        basis = soll
        if s <= 0:   # ohne Sollstellung im Jahr: Verhältnis der Miete zum Jahres- bzw. Vertragsende
            ende = min(date.fromisoformat(v['ende']), date(J, 12, 31)) if v.get('ende') else date(J, 12, 31)
            m = miete_am(v, ende)
            netto = m['kalt'] + m['zuschlag'] + m['nk'] + m['hk']
            basis = {'kalt': m['kalt'] + m['zuschlag'], 'umlagen': m['nk'] + m['hk'], 'ust': netto * m['ust'] / 100, 'sonstige': F(0)}
        bs = sum(basis.values())
        teile = {k: F(str(cent(ist * basis[k] / bs))) if bs else F(0) for k in basis}
        teile['kalt'] += F(str(cent(ist))) - sum(teile.values())
        for k in summe:
            summe[k] += teile[k]
        aus['vertraege'][v['id']] = {'ist': cent(ist), 'kalt': cent(teile['kalt']), 'umlagen': cent(teile['umlagen']), 'ust': cent(teile['ust']),
                                     'sonstige': cent(teile['sonstige']), 'soll': cent(s)}
    aus['einnahmen'] = {k: cent(x) for k, x in summe.items()}
    gruppen = {}
    for k in l.get('kosten', []):
        d = k.get('datum') or k.get('von')
        if not d or date.fromisoformat(d).year != J or k.get('ausRuecklage'):
            continue
        g = {'instandhaltung': 'erhaltung', 'verwaltung': 'verwaltung', 'nicht_umlagefaehig': 'sonstige'}.get(k['kategorie'], 'umlagefaehig')
        gruppen[g] = gruppen.get(g, F(0)) + F(str(k['betrag']))
    aus['ausgaben'] = {g: cent(x) for g, x in gruppen.items()}
    return aus
