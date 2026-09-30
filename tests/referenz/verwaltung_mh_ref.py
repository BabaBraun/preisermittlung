# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung für die Mieterhöhung (js/verwaltung-mh.js), unmittelbar aus dem Gesetzestext:

- § 558 BGB: Verlangen frühestens ein Jahr nach der letzten Erhöhung (bzw. Mietbeginn); Miete zum Zeitpunkt der
  Erhöhung seit 15 Monaten unverändert; Erhöhungen nach §§ 559–560 zählen nicht. Höchstmiete = Minimum aus
  Vergleichsmiete (abzüglich Drittmittel § 558 Abs. 5) und Kappungsgrenze (Miete drei Jahre vor dem Wirksamwerden
  × 1,20 bzw. 1,15 plus Modernisierungserhöhungen in diesen drei Jahren). § 558b: wirksam ab Beginn des dritten
  Kalendermonats nach Zugang; Zustimmung bis Ende des zweiten Monats; Klage binnen drei weiteren Monaten.
- § 557b BGB: neue Miete = Miete der letzten Anpassung × Index neu / Index alt (+ spätere feste Erhöhungen);
  zu zahlen ab Beginn des übernächsten Monats nach Zugang; ein Jahr unverändert.
- § 559, § 559c, § 559e BGB: 8 % (§ 559e: 10 %) der Kosten ohne Erhaltungsanteil und Drittmittel, Pauschalen 30 %
  bzw. 15 %, Kappung in sechs Jahren 3 €/m² (unter 7 €/m²: 2 €/m²), Heizung 0,50 €/m²; § 559b: dritter Monat nach
  Zugang, sechs Monate später ohne Ankündigung.
- KappVO BW: Gemeindeliste aus dem Wortlaut von § 1 (GBl. 2025 Nr. 145), gültig 01.01.–31.12.2026.
Rechnet mit Brüchen und rundet erst am Ende auf Cent.
"""
import re
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction as F

KAPPVO_TEXT = ('Achern, Aitrach, Altbach, Asperg, Backnang, Bad Bellingen, Bad Krozingen, Bad Schussenried, Baienfurt, Böblingen, Bodman-'
  'Ludwigshafen, Bötzingen, Deggenhausertal, Denkendorf, Dettingen an der Erms, Dielheim, Dietenheim, Edingen-Neckarhausen, Ehrenkirchen, Eisenbach '
  '(Hochschwarzwald), Eislingen/Fils, Ellhofen, Emmendingen, Eningen u. Achalm, Esslingen am Neckar, Fellbach, Filderstadt, Freiamt, Freiburg i. Br., Frickingen, '
  'Friedrichshafen, Friesenheim, Göppingen, Gottenheim, Graben-Neudorf, Güglingen, Gundelfingen, Häg-Ehrsberg, Heddesheim, Heidelberg, Heilbronn, '
  'Heiligenberg, Heitersheim, Holzgerlingen, Hoßkirch, Hülben, Ittlingen, Jagsthausen, Kappel-Grafenhausen, Karlsruhe, Kenzingen, Kernen im Remstal, '
  'Kippenheim, Kirchardt, Kirchheim unter Teck, Kirchzarten, Kißlegg, Korb, Korntal-Münchingen, Kornwestheim, Lahr/Schwarzwald, Leonberg, Lichtenstein, Lörrach, '
  'Ludwigsburg, Mahlberg, Mahlstetten, Malsburg-Marzell, Malterdingen, March, Maselheim, Massenbachhausen, Meckenbeuren, Meißenheim, Merklingen, '
  'Merzhausen, Metzingen, Möglingen, Mühlacker, Mühlhausen-Ehingen, Mühlingen, Neuhausen auf den Fildern, Neulußheim, Nürtingen, Oberhausen-Rheinhausen, '
  'Offenburg, Ostfildern, Pfaffenhofen, Pfaffenweiler, Pfedelbach, Pforzheim, Philippsburg, Reichenau, Reilingen, Reutlingen, Rheinhausen, Riederich, Riegel am '
  'Kaiserstuhl, Salach, Sasbach, Sasbach am Kaiserstuhl, Schallstadt, Schutterwald, Schwaikheim, Schwarzach, Sindelfingen, St. Leon-Rot, Stegen, Steinenbronn, '
  'Stockach, Stuttgart, Teningen, Tübingen, Ulm, Umkirch, Untermarchtal, Utzenfeld, Vogt, Vogtsburg im Kaiserstuhl, Waldkirch, Weil am Rhein, Weingarten, Wembach, '
  'Wernau (Neckar), Widdern, Wiesloch, Wittnau, Wolfegg, Wutach und Zwiefalten')
KAPPVO = [g.strip() for g in re.split(r', | und ', KAPPVO_TEXT)]
KAPPVO_BIS = date(2026, 12, 31)
OHNE = ('559', '559e', '560')


def cent(x):
    x = F(x)
    d = Decimal(x.numerator) / Decimal(x.denominator)
    q = d.copy_abs().quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return float(q if d >= 0 else -q)


def tag(s):
    return date.fromisoformat(s)


def plus_monate(d, n):
    m = d.month - 1 + n
    j, m = d.year + m // 12, m % 12 + 1
    letzter = (date(j + (m == 12), m % 12 + 1, 1) - timedelta(days=1)).day
    return date(j, m, min(d.day, letzter))


def erster(d, n):   # Erster des n-ten Monats nach dem Monat von d
    return plus_monate(date(d.year, d.month, 1), n)


def monatsende(d):
    return plus_monate(date(d.year, d.month, 1), 1) - timedelta(days=1)


def aenderungen(v):
    return sorted([a for a in v.get('aenderungen', []) if 'kalt' in a], key=lambda a: a['ab'])


def kalt_am(v, d):
    k = F(str(v['miete']['kalt']))
    for a in aenderungen(v):
        if tag(a['ab']) <= d:
            k = F(str(a['kalt']))
    return k


def letzte(v, vor):
    kand = [a for a in aenderungen(v) if tag(a['ab']) < vor and a.get('grund') not in OHNE]
    return (tag(kand[-1]['ab']), kand[-1].get('grund')) if kand else (tag(v['beginn']), 'beginn')


def erhoehungen(v, von, bis, gruende):
    s = F(0)
    for a in aenderungen(v):
        d = tag(a['ab'])
        if von < d <= bis and a.get('grund') in gruende:
            s += F(str(a['kalt'])) - kalt_am(v, d - timedelta(days=1))
    return s


def kappung(ort, eigen, wirksam):
    if eigen:
        return 15
    n = lambda s: re.sub(r'[^a-zäöüß]+', ' ', s.lower()).strip()
    return 15 if date(2026, 1, 1) <= wirksam <= KAPPVO_BIS and n(ort) in {n(g) for g in KAPPVO} else 20


def e558(f):
    v, o, l = f['vertrag'], f['opt'], f['liegenschaft']
    zugang = tag(o['zugang'])
    ld, lg = letzte(v, zugang)
    frueh = plus_monate(ld, 12)
    wirksam = max(erster(zugang, 3), plus_monate(ld, 15))
    vor = wirksam - timedelta(days=1)
    aktuell = kalt_am(v, vor)
    basis = plus_monate(wirksam, -36)
    ausgang = kalt_am(v, basis) if basis >= tag(v['beginn']) else F(str(v['miete']['kalt']))
    mod = erhoehungen(v, max(basis, tag(v['beginn']) - timedelta(days=1)), vor, ('559', '559e'))
    p = kappung(l.get('ort', ''), l.get('kappung15', False), wirksam)
    grenze = ausgang * (100 + p) / 100 + mod
    vergleich = F(str(o['vergleichQm'])) * F(str(l['flaeche']))
    dm = F(str(o.get('drittmittelJahr', 0))) / 12
    hoechst = min(vergleich - dm, grenze)
    neu = max(aktuell, hoechst)
    if o.get('verlangt') and F(str(o['verlangt'])) <= hoechst:
        neu = F(str(o['verlangt']))
    zust = monatsende(erster(zugang, 2))
    return {'zuFrueh': zugang < frueh, 'fruehesterZugang': frueh.isoformat(), 'wirksam': wirksam.isoformat(), 'zustimmungBis': zust.isoformat(),
            'klageBis': monatsende(erster(zust, 3)).isoformat(), 'aktuell': cent(aktuell), 'ausgang': cent(ausgang), 'kappungProzent': p,
            'kappungGrenze': cent(grenze), 'vergleich': cent(vergleich), 'hoechst': cent(hoechst), 'neu': cent(neu), 'erhoehung': cent(neu - aktuell)}


def index(f):
    v, o = f['vertrag'], f['opt']
    zugang = tag(o['zugang'])
    wirksam = erster(zugang, 2)
    idx = [a for a in aenderungen(v) if a.get('grund') == 'index' and a.get('indexWert')]
    if idx:
        b_wert, b_kalt, b_tag = F(str(idx[-1]['indexWert'])), F(str(idx[-1]['kalt'])), tag(idx[-1]['ab'])
    else:
        b_wert, b_kalt, b_tag = F(str(v['index']['basisWert'])), F(str(v['miete']['kalt'])), tag(v['beginn'])
    fest = erhoehungen(v, b_tag - timedelta(days=1), wirksam - timedelta(days=1), ('559', '559e', 'vereinbarung'))
    neu = b_kalt * F(str(o['vpiNeu'])) / b_wert + fest
    ld, _ = letzte(v, wirksam)
    return {'wirksam': wirksam.isoformat(), 'sperre': wirksam < plus_monate(ld, 12), 'aktuell': cent(kalt_am(v, wirksam - timedelta(days=1))),
            'neu': cent(neu), 'aenderungProzent': cent((F(str(o['vpiNeu'])) / b_wert - 1) * 100)}


def modern(f):
    v, o, l = f['vertrag'], f['opt'], f['liegenschaft']
    zugang, verf = tag(o['zugang']), o.get('verfahren', 'regel')
    kosten, zuschuss = F(str(o['kosten'])), F(str(o.get('zuschuss', 0)))
    satz, geltend = F(8), kosten
    if verf == 'vereinfacht':
        grenze = 10000 - F(str(o.get('fruehereKosten5J', 0)))
        geltend = min(kosten, max(F(0), grenze))
        erhaltung = geltend * F(3, 10)
    elif verf == '559e':
        satz = F(10)
        erhaltung = F(str(o.get('erhaltung', 0))) if o.get('heizungGmodg') else kosten * F(15, 100)
    else:
        erhaltung = F(str(o.get('erhaltung', 0)))
    anrechenbar = max(F(0), geltend - erhaltung - zuschuss)
    zins = F(0) if verf == 'vereinfacht' else F(str(o.get('zinsvorteilJahr', 0)))
    jahr = max(F(0), anrechenbar * satz / 100 - zins)
    monat_roh = F(str(cent(jahr / 12)))
    wirksam = erster(zugang, 3)
    ank = o.get('angekuendigt', False)
    if not ank or (o.get('angekuendigtMonat') and monat_roh > F(str(o['angekuendigtMonat'])) * F(11, 10)):
        wirksam = plus_monate(wirksam, 6)
    vor = wirksam - timedelta(days=1)
    fl = F(str(l['flaeche']))
    aktuell = kalt_am(v, vor)
    qm_grenze = 2 if aktuell / fl < 7 else 3
    sechs = plus_monate(wirksam, -72)
    bisher = erhoehungen(v, sechs, vor, ('559', '559e'))
    kappe = qm_grenze * fl - bisher
    if o.get('heizung') or verf == '559e':
        h = F(1, 2) * fl - (erhoehungen(v, sechs, vor, ('559e',)) if verf == '559e' else 0)
        kappe = min(kappe, h)
    monat = min(monat_roh, max(F(0), kappe))
    return {'wirksam': wirksam.isoformat(), 'anrechenbar': cent(anrechenbar), 'jahr': cent(jahr), 'monatRoh': cent(monat_roh),
            'kappungRest': cent(max(F(0), kappe)), 'monat': cent(monat), 'neu': cent(aktuell + monat)}


def mieterhoehung(faelle):
    aus = {'kappvo': sorted(KAPPVO), 'faelle': {}}
    for f in faelle:
        aus['faelle'][f['name']] = {'558': e558, 'index': index, '559': modern}[f['art']](f)
    return aus
