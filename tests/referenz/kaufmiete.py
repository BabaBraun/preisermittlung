# -*- coding: utf-8 -*-
"""Unabhängige Gegenrechnung „Kaufen oder Mieten“ (D40) — gleiche Annahmen wie js/beratung.js (kaufMiete), eigene Umsetzung
mit Decimal-freier, aber getrennt geschriebener Monatsrechnung. Aufruf mit JSON der Eingaben als Argument, Ausgabe JSON:
{darlehen, rate, abJahr, kauf: [...], miete: [...], restschuld: [...]} je Jahr 0 … n."""
import json, sys
import nur_json


def rechne(e):
    preis = max(0.0, float(e.get('preis', 0)))
    nk = max(0.0, float(e.get('nk', 0))) / 100
    ek = max(0.0, float(e.get('ek', 0)))
    zins = max(0.0, float(e.get('zins', 0))) / 100
    tilg = max(0.0, float(e.get('tilgung', 0))) / 100
    jahre = int(round(float(e.get('jahre', 30))))
    inst0 = max(0.0, float(e.get('instandhaltung', 0)))
    kost = float(e.get('kostensteigerung', 0)) / 100
    wert_p = float(e.get('wertsteigerung', 0)) / 100
    miete0 = max(0.0, float(e.get('miete', 0)))
    mst = float(e.get('mietsteigerung', 0)) / 100
    anl = float(e.get('anlagezins', 0)) / 100

    kaufkosten = preis * (1 + nk)
    darlehen = kaufkosten - ek if kaufkosten > ek else 0.0
    rate = darlehen * (zins + tilg) / 12
    i_monat = (1 + anl) ** (1 / 12) - 1
    w_monat = (1 + wert_p) ** (1 / 12) - 1
    schuld = darlehen
    depot_k = ek - kaufkosten if ek > kaufkosten else 0.0
    depot_m = ek
    wert = preis
    kauf, miete, rs = [wert - schuld + depot_k], [depot_m], [schuld]
    for j in range(1, jahre + 1):
        miete_monat = miete0 * (1 + mst) ** (j - 1)
        inst_monat = inst0 * (1 + kost) ** (j - 1) / 12
        for _ in range(12):
            zahlung = 0.0
            if schuld > 0:
                zinsen = schuld * zins / 12
                zahlung = min(rate, schuld + zinsen)
                schuld = schuld + zinsen - zahlung
                if schuld < 1e-6:
                    schuld = 0.0
            last = zahlung + inst_monat
            depot_k *= 1 + i_monat
            depot_m *= 1 + i_monat
            if last > miete_monat:
                depot_m += last - miete_monat
            else:
                depot_k += miete_monat - last
            wert *= 1 + w_monat
        kauf.append(wert - schuld + depot_k)
        miete.append(depot_m)
        rs.append(schuld)
    ab = None
    for j in range(1, jahre + 1):
        if kauf[j] >= miete[j]:
            if ab is None:
                ab = j
        else:
            ab = None
    return {'darlehen': darlehen, 'rate': rate, 'abJahr': ab, 'kauf': kauf, 'miete': miete, 'restschuld': rs}


if __name__ == '__main__':
    ausgeben = nur_json.umlenken()
    ausgeben([rechne(e) for e in json.loads(sys.argv[1])])
