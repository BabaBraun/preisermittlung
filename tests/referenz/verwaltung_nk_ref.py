# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung der Betriebs- und Heizkostenabrechnung (js/verwaltung-nk.js).

Anders gebaut als die App: Belegung Tag für Tag statt in Abschnitten, Gewichte als exakte Brüche,
Gradtagszahlen je Kalendertag, Vorauszahlungen aus den aktiven Tagen jedes Monats. Wird von
verwaltung_sollwerte.py aufgerufen.
Grundlagen: § 2 BetrKV, § 556a BGB, HeizkostenV §§ 7, 8, 9 Abs. 2, 9b Abs. 3, CO2KostAufG (Anlage),
§ 560 Abs. 4 BGB, § 35a EStG.
"""
import math
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction as F

NK_STD = {'grundsteuer': 'flaeche', 'wasser': 'personen', 'entwaesserung': 'personen', 'aufzug': 'flaeche', 'strassenreinigung': 'flaeche',
          'muell': 'personen', 'gebaeudereinigung': 'flaeche', 'gartenpflege': 'flaeche', 'beleuchtung': 'flaeche', 'schornstein': 'flaeche',
          'versicherung': 'flaeche', 'hauswart': 'flaeche', 'antenne': 'einheiten', 'waeschepflege': 'personen', 'sonstige': 'flaeche'}
NK_HEIZ = ('heizung', 'warmwasser', 'heizung_ww')
NK_NICHT = ('verwaltung', 'instandhaltung', 'nicht_umlagefaehig')
GRADTAGE = {1: F(170), 2: F(150), 3: F(130), 4: F(80), 5: F(40), 6: F(40, 3), 7: F(40, 3), 8: F(40, 3), 9: F(30), 10: F(80), 11: F(120), 12: F(160)}
CO2 = [(12, 0), (17, 10), (22, 20), (27, 30), (32, 40), (37, 50), (42, 60), (47, 70), (52, 80)]   # (Grenze, Vermieteranteil)


def cent(x):
    x = F(x)
    d = Decimal(x.numerator) / Decimal(x.denominator)
    q = d.copy_abs().quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return float(q if d >= 0 else -q)


def tag(s):
    return date.fromisoformat(s)


def tage_im_monat(j, m):
    return (date(j + (m == 12), m % 12 + 1, 1) - date(j, m, 1)).days


def co2_vermieter(kg_m2a):
    for grenze, anteil in CO2:
        if kg_m2a < grenze:
            return anteil
    return 95


def nebenkosten(fall):
    cfg, l = fall['cfg'], fall['liegenschaft']
    von, bis = tag(cfg['von']), tag(cfg['bis'])
    tage = [von + timedelta(days=i) for i in range((bis - von).days + 1)]
    n = len(tage)
    E = {e['id']: e for e in l['einheiten']}

    def mieter(eid, d):
        for v in l['vertraege']:
            if v['einheitId'] == eid and tag(v['beginn']) <= d and (not v.get('ende') or d <= tag(v['ende'])):
                return v
        return None
    beleg = {eid: [mieter(eid, d) for d in tage] for eid in E}

    def im_kreis(e, k):
        kreis = k.get('kreis', 'alle')
        if kreis == 'wohnen':
            return e['art'] == 'wohnung'
        if kreis == 'gewerbe':
            return e['art'] == 'gewerbe'
        if kreis == 'auswahl':
            return e['id'] in k.get('einheitIds', [])
        return e['art'] not in ('stellplatz', 'garage')

    erg = {v['id']: {'kosten': F(0), 'heiz': F(0), 'ww': F(0), 'p35a': F(0)} for v in l['vertraege']}
    leer, nicht, heizsumme, positionen = F(0), F(0), {k: F(0) for k in NK_HEIZ}, []
    for k in l['kosten']:
        if k.get('von'):
            a, b = tag(k['von']), tag(k['bis'])
            drin = max(0, (min(b, bis) - max(a, von)).days + 1)
            betrag = F(str(k['betrag'])) * drin / ((b - a).days + 1)
        else:
            betrag = F(str(k['betrag'])) if von <= tag(k['datum']) <= bis else F(0)
        if betrag == 0:
            continue
        if k['kategorie'] in NK_HEIZ:
            heizsumme[k['kategorie']] += betrag
            continue
        if k['kategorie'] in NK_NICHT:
            nicht += betrag
            continue
        schl = k.get('schluessel') or NK_STD[k['kategorie']]
        gew = {}
        for eid, e in E.items():
            if not im_kreis(e, k):
                continue
            for i in range(n):
                v = beleg[eid][i]
                if schl == 'flaeche':
                    g = F(str(e['flaeche']))
                elif schl == 'mea':
                    g = F(str(e['mea']))
                elif schl == 'einheiten':
                    g = F(1)
                elif schl == 'personen':
                    g = F(v['personen'] or 1) if v else F(cfg['leerPersonen'])
                else:   # Verbrauch der Einheit, gleichmäßig auf die Tage verteilt
                    g = F(str(cfg['verbrauch'][k['id']][eid])) / n
                schl_v = v['id'] if v else None
                gew[schl_v] = gew.get(schl_v, F(0)) + g
        summe = sum(gew.values())
        lohn = F(str(k.get('lohn35a') or 0))
        for vid, g in gew.items():
            if vid is None:
                leer += betrag * g / summe
            else:
                erg[vid]['kosten'] += F(str(cent(betrag * g / summe)))
                if lohn:
                    erg[vid]['p35a'] += F(str(cent(lohn * betrag / F(str(k['betrag'])) * g / summe)))
        positionen.append({'id': k['id'], 'gesamt': cent(betrag)})

    # Heizung und Warmwasser
    h = cfg['heiz']
    q = F(5, 2) * F(str(h['wwVolumen'])) * (F(str(h['wwTemp'])) - 10) * (F(111, 100) if h.get('brennwert') else 1)
    anteil = min(F(1), q / F(str(h['energieKwh'])))
    H = heizsumme['heizung'] + heizsumme['heizung_ww'] * (1 - anteil)
    W = heizsumme['warmwasser'] + heizsumme['heizung_ww'] * anteil
    beheizt = [e for e in E.values() if e['art'] in ('wohnung', 'gewerbe') and e.get('flaeche')]
    fl = sum(F(str(e['flaeche'])) for e in beheizt)
    vh = sum(F(str(h['einheiten'][e['id']]['heiz'])) for e in beheizt)
    vw = sum(F(str(h['einheiten'][e['id']]['ww'])) for e in beheizt)
    ph, pw = F(h['pvHeiz'], 100), F(h['pvWW'], 100)
    grad = [GRADTAGE[d.month] / tage_im_monat(d.year, d.month) for d in tage]
    gsum = sum(grad)
    heiz_leer = F(0)
    for e in beheizt:
        f = F(str(e['flaeche'])) / fl
        he = H * ((1 - ph) * f + ph * F(str(h['einheiten'][e['id']]['heiz'])) / vh)
        we = W * ((1 - pw) * f + pw * F(str(h['einheiten'][e['id']]['ww'])) / vw)
        for i in range(n):
            v = beleg[e['id']][i]
            teil_h, teil_w = he * grad[i] / gsum, we / n
            if v:
                erg[v['id']]['heiz'] += teil_h
                erg[v['id']]['ww'] += teil_w
            else:
                heiz_leer += teil_h + teil_w

    # CO2-Kostenaufteilung
    c = cfg['co2']
    kg_m2a = F(str(c['kg'])) / F(str(c['flaeche'])) * 365 / n
    pv = 50 if c.get('nichtwohn') else co2_vermieter(kg_m2a)
    aus, co2_summe = {}, F(0)
    for v in l['vertraege']:
        a = max(von, tag(v['beginn']))
        b = min(bis, tag(v['ende'])) if v.get('ende') else bis
        if b < a:
            continue
        tage_v = (b - a).days + 1
        r = erg[v['id']]
        co2_anteil = (r['heiz'] + r['ww']) / (H + W) * F(str(c['kosten']))
        erstattung = F(str(cent(co2_anteil * pv / 100)))
        co2_summe += erstattung
        vz, d = F(0), a
        while d <= b:   # Vorauszahlungen je Monat aus den aktiven Tagen, auf Cent gerundet
            tim = tage_im_monat(d.year, d.month)
            aktiv = sum(1 for t in range(1, tim + 1)
                        if date(d.year, d.month, t) >= tag(v['beginn']) and (not v.get('ende') or date(d.year, d.month, t) <= tag(v['ende'])))
            vz += F(str(cent(F(str(v['miete']['nk'])) * aktiv / tim))) + F(str(cent(F(str(v['miete']['hk'])) * aktiv / tim)))
            d = date(d.year, d.month, tim) + timedelta(days=1)
        kosten = F(str(cent(r['kosten'])))
        heiz = F(str(cent(r['heiz'] + r['ww'])))
        saldo = cent(kosten + heiz - erstattung - F(str(cent(vz))))
        laeuft = not v.get('ende') or tag(v['ende']) > bis
        neue = {'nk': math.ceil(kosten / tage_v * 365 / 12), 'hk': math.ceil((heiz - erstattung) / tage_v * 365 / 12)} if laeuft else None
        aus[v['id']] = {'tage': tage_v, 'kosten': float(kosten), 'heizung': cent(r['heiz']), 'warmwasser': cent(r['ww']), 'heiz': float(heiz),
                        'co2Anteil': cent(co2_anteil), 'co2Erstattung': float(erstattung), 'vorauszahlung': cent(vz), 'saldo': saldo,
                        'neueVz': neue, 'p35a': cent(r['p35a'])}
    return {'ergebnisse': aus, 'positionen': positionen,
            'heiz': {'heizung': cent(H), 'warmwasser': cent(W), 'leerstand': cent(heiz_leer)},
            'co2': {'kgM2a': cent(kg_m2a), 'vermieterProzent': pv},
            'vermieter': {'leerstand': cent(leer + heiz_leer), 'nichtUmlagefaehig': cent(nicht), 'co2': cent(co2_summe)}}
