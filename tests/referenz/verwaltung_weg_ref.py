# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung für die WEG-Verwaltung (js/verwaltung-weg.js).

Unmittelbar aus den Vorschriften gerechnet, ohne die Aufteilung der App:
- Einzelwirtschaftsplan: Anteil jeder Position nach ihrem Schlüssel, Rücklagenzuführung nach MEA (§ 16 Abs. 2,
  § 19 Abs. 2 Nr. 4, § 28 Abs. 1 WEG); Monatsvorschuss = Jahresbetrag / 12 auf Cent.
- Jahresabrechnung: Kostenanteil + Soll-Zuführung − Soll-Vorschüsse = Abrechnungsspitze (§ 28 Abs. 2 WEG);
  Kosten aus der Erhaltungsrücklage werden nicht umgelegt, sondern mindern die Rücklage.
- Hausgeldrückstand am Jahresende = fällige Vorschüsse − Zahlungen (alle Vorschüsse sind fällig).
- Abstimmung: § 25 Abs. 1 und 2 WEG (Köpfe; Miteigentümer einer Einheit gemeinsam; Enthaltungen zählen nicht),
  § 21 Abs. 2 Nr. 1 WEG (mehr als 2/3 der abgegebenen Stimmen und mehr als die Hälfte aller MEA).
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction as F


def cent(x):
    x = F(x)
    d = Decimal(x.numerator) / Decimal(x.denominator)
    q = d.copy_abs().quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return float(q if d >= 0 else -q)


def anteile(einheiten, schluessel, direkt=None):
    if schluessel == 'direkt':
        gew = {e['id']: F(1) for e in einheiten if e['id'] == direkt}
    elif schluessel == 'einheiten':
        gew = {e['id']: F(1) for e in einheiten}
    elif schluessel == 'flaeche':
        gew = {e['id']: F(str(e['flaeche'])) for e in einheiten if e.get('flaeche')}
    else:
        gew = {e['id']: F(str(e['mea'])) for e in einheiten if e.get('mea')}
    s = sum(gew.values())
    return {k: v / s for k, v in gew.items()}


def eigentuemer(weg, eid, tag):
    alle = [o for o in weg['eigentuemer'] if o['einheitId'] == eid and o['seit'] <= tag]
    neu = max(o['seit'] for o in alle)
    return [o for o in alle if o['seit'] == neu]


def wegrechnung(fall):
    l, cfg = fall['liegenschaft'], fall['cfg']
    E, W = l['einheiten'], l['weg']
    plan = [p for p in W['wirtschaftsplaene'] if p['jahr'] == cfg['jahr']][0]
    # Einzelwirtschaftsplan
    ep = {}
    for e in E:
        k = sum((F(str(p['betrag'])) * anteile(E, p.get('schluessel', 'mea'), p.get('einheitId')).get(e['id'], 0) for p in plan['positionen']), F(0))
        r = F(str(plan['ruecklage'])) * anteile(E, 'mea')[e['id']]
        kosten, ruecklage = F(str(cent(k))), F(str(cent(r)))
        monat = F(str(cent((kosten + ruecklage) / 12)))
        ep[e['id']] = {'kosten': float(kosten), 'ruecklage': float(ruecklage), 'monat': float(monat), 'jahr': cent(monat * 12)}
    # Jahresabrechnung
    heiz = cfg['heiz']
    hsum = sum(F(str(v)) for v in heiz.values())
    kost = {e['id']: F(0) for e in E}
    umlage = {e['id']: F(0) for e in E}
    lohn = {e['id']: F(0) for e in E}
    entnahmen = F(0)
    nicht = ('verwaltung', 'instandhaltung', 'nicht_umlagefaehig')
    for k in l['kosten']:
        if not (cfg['von'] <= k['datum'] <= cfg['bis']):
            continue
        b = F(str(k['betrag']))
        if k.get('ausRuecklage'):
            entnahmen += b
            continue
        if k['kategorie'] in ('heizung', 'warmwasser', 'heizung_ww'):
            a = {eid: F(str(v)) / hsum for eid, v in heiz.items()}
        else:
            schl = k.get('schluessel') if k.get('schluessel') in ('mea', 'einheiten', 'flaeche', 'direkt') else 'mea'
            a = anteile(E, schl, k.get('direktEinheitId'))
        for eid, f in a.items():
            teil = F(str(cent(b * f)))
            kost[eid] += teil
            if k['kategorie'] not in nicht:
                umlage[eid] += teil
            if k.get('lohn35a'):
                lohn[eid] += F(str(cent(F(str(k['lohn35a'])) * f)))
    einzel = {}
    for e in E:
        vorschuss = F(str(ep[e['id']]['monat'])) * 12
        summe = F(str(cent(kost[e['id']]))) + F(str(ep[e['id']]['ruecklage']))
        gezahlt = sum((F(str(z['betrag'])) for z in W['zahlungen'] if z['einheitId'] == e['id'] and cfg['von'] <= z['datum'] <= cfg['bis']), F(0))
        einzel[e['id']] = {'kosten': cent(kost[e['id']]), 'umlagefaehig': cent(umlage[e['id']]), 'p35a': cent(lohn[e['id']]), 'zufuehrung': ep[e['id']]['ruecklage'],
                           'summe': cent(summe), 'vorschussSoll': cent(vorschuss), 'spitze': cent(summe - vorschuss), 'gezahlt': cent(gezahlt),
                           'rueckstand': cent(max(F(0), vorschuss - gezahlt)),
                           'eigentuemer': [o['name'] for o in eigentuemer(W, e['id'], cfg['bis'])]}
    zuf = sum(F(str(ep[e['id']]['ruecklage'])) for e in E)
    ruecklage = {'anfang': cent(F(str(cfg['ruecklageAnfang']))), 'zufuehrung': cent(zuf), 'entnahmen': cent(entnahmen),
                 'ende': cent(F(str(cfg['ruecklageAnfang'])) + zuf - entnahmen)}

    # Abstimmungen
    ergebnisse = []
    for t in fall['abstimmungen']:
        prinzip, stimmen, mehr = t['prinzip'], t['stimmen'], t['mehrheit']
        gruppen = {}
        for e in E:
            eig = eigentuemer(W, e['id'], t['datum'])
            key = '+'.join(sorted(o['name'].lower() for o in eig)) if prinzip == 'kopf' else e['id']
            g = gruppen.setdefault(key, {'stimmen': set(), 'mea': F(0), 'n': 0})
            g['mea'] += F(str(e['mea']))
            g['n'] += 1
            if stimmen.get(e['id']):
                g['stimmen'].add(stimmen[e['id']])
        ja = nein = enth = F(0)
        ungueltig = 0
        mea_ja = F(0)
        for g in gruppen.values():
            if not g['stimmen']:
                continue
            if len(g['stimmen']) > 1:
                ungueltig += 1
                continue
            s = next(iter(g['stimmen']))
            w = g['mea'] if prinzip == 'mea' else (g['n'] if prinzip == 'objekt' else 1)
            if s == 'ja':
                ja += w
                mea_ja += g['mea']
            elif s == 'nein':
                nein += w
            else:
                enth += w
        mea_ges = sum(F(str(e['mea'])) for e in E)
        if mehr == 'baulich21':
            ok = ja > F(2, 3) * (ja + nein) and mea_ja > mea_ges / 2
        else:
            ok = ja > nein
        ergebnisse.append({'ja': float(ja), 'nein': float(nein), 'enthaltung': float(enth), 'ungueltig': ungueltig, 'meaJa': float(mea_ja), 'angenommen': ok})
    return {'einzelplaene': ep, 'einzel': einzel, 'ruecklage': ruecklage, 'forderungen': cent(sum(F(str(x['rueckstand'])) for x in einzel.values())),
            'abstimmungen': ergebnisse}
