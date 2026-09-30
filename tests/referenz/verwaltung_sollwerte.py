# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung für den Rechenkern der Mietverwaltung (js/verwaltung.js).

Bewusst anders gebaut als die App, damit ein Denkfehler nicht in beiden steckt:
- Ostersonntag nach der Gaußschen Osterformel mit Lichtenbergs Ergänzung (die App nutzt Meeus/Jones/Butcher)
- Sollstellung Tag für Tag mit exakten Brüchen (die App rechnet abschnittsweise mit Gleitkommazahlen)
- Verzugszinsen Tag für Tag mit dem jeweils gültigen Basiszins (die App rechnet je Zinsabschnitt)
- Rundung kaufmännisch mit Decimal (ROUND_HALF_UP)

Rechtsgrundlagen (dieselben wie in der App): § 556b Abs. 1 BGB (Fälligkeit 3. Werktag; Samstag zählt nicht,
BGH VIII ZR 129/09), § 366 BGB (Anrechnung), § 288 Abs. 1/2 BGB (5 bzw. 9 Prozentpunkte über Basiszins),
§ 543 Abs. 2 Nr. 3 i. V. m. § 569 Abs. 3 Nr. 1 BGB (Kündigungsschwelle), § 551 BGB (Kaution).

  python tests/referenz/verwaltung_sollwerte.py   → schreibt tests/referenz/verwaltung_sollwerte.json
"""
import json, os
from verwaltung_nk_ref import nebenkosten
from verwaltung_weg_ref import wegrechnung
from verwaltung_mh_ref import mieterhoehung
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction as F

HIER = os.path.dirname(os.path.abspath(__file__))
BASISZINS = [('2016-07-01', '-0.88'), ('2023-01-01', '1.62'), ('2023-07-01', '3.12'), ('2024-01-01', '3.62'),
             ('2024-07-01', '3.37'), ('2025-01-01', '2.27'), ('2025-07-01', '1.27'), ('2026-01-01', '1.27'),
             ('2026-07-01', '1.52')]


def cent(x):
    x = F(x)
    d = Decimal(x.numerator) / Decimal(x.denominator)
    q = d.copy_abs().quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return float(q if d >= 0 else -q)


def tag(s):
    return date.fromisoformat(s)


def ostern(j):   # Gaußsche Osterformel (Lichtenberg)
    k = j // 100
    m = 15 + (3 * k + 3) // 4 - (8 * k + 13) // 25
    s = 2 - (3 * k + 3) // 4
    a = j % 19
    d = (19 * a + m) % 30
    r = (d + a // 11) // 29
    og = 21 + d - r
    sz = 7 - (j + j // 4 + s) % 7
    oe = 7 - (og - sz) % 7
    return date(j, 3, 1) + timedelta(days=og + oe - 1)


def feiertage(j):
    o = ostern(j)
    fest = {date(j, 1, 1), date(j, 1, 6), date(j, 5, 1), date(j, 10, 3), date(j, 11, 1), date(j, 12, 25), date(j, 12, 26)}
    return fest | {o + timedelta(days=d) for d in (-2, 1, 39, 50, 60)}


def werktag(d):
    return d.weekday() < 5 and d not in feiertage(d.year)


def dritter_werktag(j, m):
    d, n = date(j, m, 1), 0
    while True:
        if werktag(d):
            n += 1
            if n == 3:
                return d
        d += timedelta(days=1)


def tage_im_monat(j, m):
    return ((date(j + (m == 12), m % 12 + 1, 1)) - date(j, m, 1)).days


def miete_am(v, d):
    m = {k: F(str(v['miete'].get(k, 0) or 0)) for k in ('kalt', 'nk', 'hk', 'zuschlag', 'ust')}
    for a in sorted(v.get('aenderungen', []), key=lambda a: a['ab']):
        if tag(a['ab']) <= d:
            for k in m:
                if k in a:
                    m[k] = F(str(a[k]))
    return m


def sollstellung(v, bis):
    beginn, ende = tag(v['beginn']), tag(v['ende']) if v.get('ende') else None
    letzter = min(ende, bis) if ende else bis
    posten = []
    j, m = beginn.year, beginn.month
    while date(j, m, 1) <= letzter:
        tim = tage_im_monat(j, m)
        teile = {k: F(0) for k in ('kalt', 'nk', 'hk', 'zuschlag')}
        ust = F(0)
        erster_aktiv = None
        for t in range(1, tim + 1):
            d = date(j, m, t)
            if d < beginn or (ende and d > ende):   # laufender Monat voll, anteilig nur bei Beginn/Ende
                continue
            erster_aktiv = erster_aktiv or d
            mm = miete_am(v, d)
            for k in teile:
                teile[k] += mm[k] / tim
            ust += sum(mm[k] for k in teile) * mm['ust'] / 100 / tim
        if erster_aktiv:
            gerundet = {k: cent(x) for k, x in teile.items()}
            betrag = cent(sum(F(str(x)) for x in gerundet.values()) + F(str(cent(ust))))
            faellig = max(dritter_werktag(j, m), erster_aktiv)
            posten.append({'id': 'M%04d-%02d' % (j, m), 'art': 'miete', 'faellig': faellig, 'betrag': betrag, 'teile': gerundet, 'ust': cent(ust)})
        j, m = (j + 1, 1) if m == 12 else (j, m + 1)
    for s in v.get('sonderposten', []):
        posten.append({'id': 'X' + s['id'], 'art': s.get('art', 'sonstig'), 'faellig': tag(s['datum']), 'betrag': float(s['betrag'])})
    return posten


def basiszins(d):
    satz = F(BASISZINS[0][1])
    for ab, s in BASISZINS:
        if tag(ab) <= d:
            satz = F(s)
    return satz


def zinsen(betrag, faellig, bis, aufschlag):
    z, d = F(0), faellig + timedelta(days=1)
    while d <= bis:
        z += F(str(betrag)) * max(F(0), basiszins(d) + aufschlag) / 100 / 365
        d += timedelta(days=1)
    return z


def offene_posten(v, zahlungen, stichtag, aufschlag):
    posten = [dict(p, bezahlt=F(0), zu=[]) for p in sollstellung(v, stichtag) if p['betrag'] >= 0]
    gutschriften = [p for p in sollstellung(v, stichtag) if p['betrag'] < 0]
    eigene = [z for z in zahlungen if z['vertragId'] == v['id'] and z['art'] != 'kaution' and tag(z['datum']) <= stichtag]
    for z in eigene:
        if z['betrag'] < 0:
            posten.append({'id': 'R' + z['id'], 'art': 'ruecklast', 'faellig': tag(z['datum']), 'betrag': -z['betrag'], 'bezahlt': F(0), 'zu': []})
    posten.sort(key=lambda p: (p['faellig'], p['id']))
    eingaenge = [{'id': z['id'], 'datum': tag(z['datum']), 'betrag': F(str(z['betrag'])), 'monat': z.get('monat', '')} for z in eigene if z['betrag'] > 0]
    eingaenge += [{'id': g['id'], 'datum': g['faellig'], 'betrag': -F(str(g['betrag'])), 'monat': ''} for g in gutschriften]
    eingaenge.sort(key=lambda z: (z['datum'], z['id']))
    guthaben = F(0)
    for z in eingaenge:
        rest = z['betrag']
        reihenfolge = [p for p in posten if z['monat'] and p['id'] == 'M' + z['monat']] + posten
        for p in reihenfolge:
            offen = F(str(p['betrag'])) - p['bezahlt']
            if rest <= 0 or offen <= 0 or (p['art'] == 'ruecklast' and p['faellig'] > z['datum']):
                continue
            b = min(offen, rest)
            p['bezahlt'] += b
            p['zu'].append((z['datum'], b))
            p.setdefault('zi', []).append((z['id'], z['datum'], b))
            rest -= b
        guthaben += rest
    aus, rueckstand, zins_summe, soll = [], F(0), F(0), F(0)
    for p in posten:
        offen = F(str(p['betrag'])) - p['bezahlt']
        faellig_ja = p['faellig'] <= stichtag
        z = sum((zinsen(b, p['faellig'], d, aufschlag) for d, b in p['zu'] if d > p['faellig']), F(0))
        if offen > 0 and stichtag > p['faellig']:
            z += zinsen(offen, p['faellig'], stichtag, aufschlag)
        if offen <= 0:
            status = 'verspaetet' if any(d > p['faellig'] for d, _ in p['zu']) else 'bezahlt'
        else:
            status = 'nicht_faellig' if not faellig_ja else ('teilweise' if p['bezahlt'] > 0 else 'offen')
        zins_summe += F(str(cent(z)))
        if faellig_ja:
            rueckstand += offen
            soll += F(str(p['betrag']))
        aus.append({'id': p['id'], 'art': p['art'], 'faellig': p['faellig'].isoformat(), 'betrag': p['betrag'], 'bezahlt': cent(p['bezahlt']),
                    'offen': cent(offen), 'zinsen': cent(z), 'status': status, 'faelligJa': faellig_ja})
    return {'posten': aus, 'roh': posten, 'summe': {'soll': cent(soll), 'rueckstand': cent(rueckstand), 'guthaben': cent(guthaben), 'zinsen': cent(zins_summe)}}


def schwelle(op, v, stichtag):
    mm = miete_am(v, stichtag)
    monat = F(str(cent(sum(mm[k] for k in ('kalt', 'nk', 'hk', 'zuschlag')) * (1 + mm['ust'] / 100))))
    termine = [p for p in op['posten'] if p['art'] == 'miete' and p['faelligJa']]
    a = any(x['offen'] > 0 and y['offen'] > 0 and F(str(x['offen'])) + F(str(y['offen'])) > monat for x, y in zip(termine, termine[1:]))
    mit = [p for p in op['posten'] if p['faelligJa'] and p['offen'] > 0]
    b = len(mit) > 2 and F(str(op['summe']['rueckstand'])) >= 2 * monat
    return {'a': a, 'b': b, 'monatsmiete': float(monat)}


def kaution(v, zahlungen, stichtag):
    k = v.get('kaution', {})
    soll = F(str(k.get('soll', 0)))
    hoechst = 3 * miete_am(v, tag(v['beginn']))['kalt']
    ist = sum((F(str(z['betrag'])) for z in zahlungen if z['vertragId'] == v['id'] and z['art'] == 'kaution' and tag(z['datum']) <= stichtag), F(0))
    raten = []
    if soll > 0:
        if k.get('raten'):
            r = F(int(soll / 3 * 100), 100)
            folgende = [p for p in sollstellung(v, stichtag + timedelta(days=400)) if p['art'] == 'miete' and p['faellig'] > tag(v['beginn'])]
            termine = [tag(v['beginn'])] + [p['faellig'] for p in folgende[:2]]
            raten = [(t, r if i < len(termine) - 1 else soll - r * i) for i, t in enumerate(termine)]
        else:
            raten = [(tag(v['beginn']), soll)]
    faellig = sum((b for t, b in raten if t <= stichtag), F(0))
    return {'hoechst': cent(hoechst), 'ist': cent(ist), 'faelligOffen': cent(max(F(0), faellig - ist)),
            'raten': [{'faellig': t.isoformat(), 'betrag': cent(b)} for t, b in raten]}


def leerstand(l, von, bis):
    aus = []
    for e in l['einheiten']:
        vv = [v for v in l['vertraege'] if v['einheitId'] == e['id']]
        leer, entgangen, d = 0, F(0), von
        while d <= bis:
            aktiv = any(tag(v['beginn']) <= d and (not v.get('ende') or d <= tag(v['ende'])) for v in vv)
            if not aktiv:
                leer += 1
                monatsende = date(d.year, d.month, tage_im_monat(d.year, d.month))
                b = min(monatsende, bis)
                if e.get('sollmiete'):
                    ziel = F(str(e['sollmiete']))
                else:
                    kandidaten = sorted([v for v in vv if tag(v['beginn']) <= b], key=lambda v: v['beginn'])
                    if kandidaten:
                        letzte = kandidaten[-1]
                        ziel = miete_am(dict(letzte, miete=dict({'nk': 0, 'hk': 0, 'zuschlag': 0, 'ust': 0}, **letzte['miete'])),
                                        tag(letzte['ende']) if letzte.get('ende') else b)['kalt']
                    else:
                        ziel = F(0)
                entgangen += ziel / tage_im_monat(d.year, d.month)
            d += timedelta(days=1)
        aus.append({'einheitId': e['id'], 'leerTage': leer, 'entgangen': cent(entgangen)})
    return aus


def main():
    with open(os.path.join(HIER, 'verwaltung_faelle.json'), encoding='utf-8') as f:
        faelle = json.load(f)
    st = tag(faelle['stichtag'])
    erg = {'stichtag': faelle['stichtag'],
           'ostern': {str(j): ostern(j).isoformat() for j in range(2020, 2036)},
           'dritterWerktag': {'%04d-%02d' % (j, m): dritter_werktag(j, m).isoformat() for j in (2025, 2026, 2027) for m in range(1, 13)},
           'vertraege': {}}
    for fall in faelle['vertraege']:
        v, z = fall['vertrag'], fall['zahlungen']
        op = offene_posten(v, z, st, 5 if fall['wohnraum'] else 9)
        erg['vertraege'][fall['name']] = {
            'soll': [{'id': p['id'], 'faellig': p['faellig'].isoformat(), 'betrag': p['betrag']} for p in sollstellung(v, st)],
            'posten': [{k: p[k] for k in ('id', 'bezahlt', 'offen', 'zinsen', 'status')} for p in op['posten']],
            'summe': op['summe'], 'schwelle': schwelle(op, v, st), 'kaution': kaution(v, z, st)}
    erg['nebenkosten'] = nebenkosten(faelle['nebenkosten'])
    erg['weg'] = wegrechnung(faelle['weg'])
    erg['mieterhoehung'] = mieterhoehung(faelle['mieterhoehung'])
    from verwaltung_bericht_ref import jahresbericht
    erg['jahresbericht'] = {f['name']: jahresbericht(f, offene_posten, sollstellung, miete_am) for f in faelle['jahresbericht']}
    ls = faelle['leerstand']
    erg['leerstand'] = leerstand(ls['liegenschaft'], tag(ls['von']), tag(ls['bis']))
    with open(os.path.join(HIER, 'verwaltung_sollwerte.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(erg, f, ensure_ascii=False, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
