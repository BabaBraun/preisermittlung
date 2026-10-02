# -*- coding: utf-8 -*-
"""Unabhängige Vergleichsrechnung für den Rechenkern der ImmoApp.

Rechnet die Fälle aus faelle.json nach den Modellvorschriften (ImmoWertV 2021, Anlage 2 und 4) und dem
Bewertungsmodell der App (gewichtetes Mittel aus Sachwert und Ertragswert, Abzug von Belastungen) —
eigenständig in Python geschrieben, ohne den JavaScript-Code auszuführen oder zu übersetzen.
Ergebnis: sollwerte.json, gegen das tests/unit/referenz.test.mjs den Kern prüft.

Aufruf:  python tests/referenz/sollwerte.py
"""
import json, math, os

HIER = os.path.dirname(os.path.abspath(__file__))

# Anlage 4 ImmoWertV: Wägungsanteile der Bauteile an den Normalherstellungskosten (Summe 1,0)
GEWICHTE = [0.23, 0.15, 0.11, 0.11, 0.11, 0.05, 0.09, 0.09, 0.06]
# Anlage 2 ImmoWertV, Tabelle 3: a, b, c, relatives Alter ab dem die Formel gilt (in %) — Punkte 0 … 20
TABELLE3 = {
    0: (1.2500, 2.6250, 1.5250, 60), 1: (1.2500, 2.6250, 1.5250, 60), 2: (1.0767, 2.2757, 1.3878, 55),
    3: (0.9033, 1.9263, 1.2505, 55), 4: (0.7300, 1.5770, 1.1133, 40), 5: (0.6725, 1.4578, 1.0850, 35),
    6: (0.6150, 1.3385, 1.0567, 30), 7: (0.5575, 1.2193, 1.0283, 25), 8: (0.5000, 1.1000, 1.0000, 20),
    9: (0.4660, 1.0270, 0.9906, 19), 10: (0.4320, 0.9540, 0.9811, 18), 11: (0.3980, 0.8810, 0.9717, 17),
    12: (0.3640, 0.8080, 0.9622, 16), 13: (0.3300, 0.7350, 0.9528, 15), 14: (0.3040, 0.6760, 0.9506, 14),
    15: (0.2780, 0.6170, 0.9485, 13), 16: (0.2520, 0.5580, 0.9463, 12), 17: (0.2260, 0.4990, 0.9442, 11),
    18: (0.2000, 0.4400, 0.9420, 10), 19: (0.2000, 0.4400, 0.9420, 10), 20: (0.2000, 0.4400, 0.9420, 10),
}
# Anlage 2 ImmoWertV, Tabelle 1: Höchstpunkte je Modernisierungselement
HOECHSTPUNKTE = [4, 2, 2, 2, 4, 2, 2, 2]
# Effizienzklassen (GEG, Endenergie kWh/(m²·a)) — Obergrenze je Klasse
KLASSEN = [('A+', 30), ('A', 50), ('B', 75), ('C', 100), ('D', 130), ('E', 160), ('F', 200), ('G', 250), ('H', 10**9)]


def rentenbarwertfaktor(zins_prozent, jahre):
    """Barwertfaktor einer nachschüssigen Zeitrente (Anlage 1 ImmoWertV). Zins 0 → Anzahl der Jahre."""
    if jahre <= 0:
        return 0.0
    q = zins_prozent / 100.0
    if q <= 0:
        return float(jahre)
    return (1 - (1 + q) ** (-jahre)) / q


def restnutzungsdauer(alter, gnd, punkte):
    if gnd <= 0:
        return 0.0
    if alter <= 0:
        return float(gnd)
    a, b, c, schwelle = TABELLE3[max(0, min(20, round(punkte)))]
    if alter / gnd * 100 <= schwelle:
        rnd = gnd - alter
    else:
        rnd = a * alter ** 2 / gnd - b * alter + c * gnd
    return max(0.0, min(float(gnd), rnd))


def kostenkennwert(basis, stufe):
    """Lineare Interpolation zwischen den Kostenkennwerten der Standardstufen 1 … 5."""
    if stufe <= 1:
        return basis[0]
    if stufe >= 5:
        return basis[4]
    unten = int(math.floor(stufe))
    return basis[unten - 1] + (basis[unten] - basis[unten - 1]) * (stufe - unten)


def klasse(kennwert):
    for name, grenze in KLASSEN:
        if kennwert <= grenze:
            return name
    return 'H'


def bewerte(f, jahr):
    z = lambda k: float(f.get(k, 0) or 0)
    an = lambda k: bool(f.get(k, False))
    wohnung = f.get('ek_modus') == 'wohnung'
    r = {}

    # Bodenwert: Fläche × Bodenrichtwert × (1 − Abschlag)
    boden = 0.0 if wohnung else z('ek_gs_flaeche') * z('ek_brw') * (1 - z('ek_gs_abschlag') / 100)
    r['bodenwert'] = boden

    # Bruttogrundfläche und Normalherstellungskosten
    bgf = sum(z('bgfhg_l%d' % i) * z('bgfhg_b%d' % i) + z('bgfhg_e%d' % i) for i in range(6))
    basis_txt = f.get('nhkhg_base', '')
    basis = [float(x.strip().replace(',', '.')) for x in basis_txt.replace(';', ',').split(',') if x.strip()] if basis_txt else []
    if len(basis) < 5:
        basis = [615, 685, 785, 945, 1180]
    # fehlendes Bauteil (nhkhg_f<i>): Kostenanteil 0, die übrigen Anteile bleiben (Vordruck der Bank)
    nhk2010 = sum(0 if an('nhkhg_f%d' % i) else g * kostenkennwert(basis, z('nhkhg_s%d' % i) or 3) for i, g in enumerate(GEWICHTE))
    punkte = sum(min(max(z('mod_p%d' % i), 0), h) for i, h in enumerate(HOECHSTPUNKTE))
    gnd = z('nhkhg_gnd') or 80
    baujahr = z('ek_baujahr')
    alter = max(jahr - baujahr, 0) if baujahr > 0 else 0
    rnd = z('nhkhg_rnd') if z('nhkhg_rnd') > 0 else restnutzungsdauer(alter, gnd, punkte)
    alterswertminderung = min(max((gnd - rnd) / gnd, 0), 1)
    nhk_stichtag = nhk2010 * (z('bpi_faktor') or 1) * (z('bpi') or 100) / 100 * (z('nhk_regional') or 1)
    gebaeude = bgf * nhk_stichtag * (1 - alterswertminderung)
    r.update(bgf=bgf, nhk2010=nhk2010, punkte=punkte, rnd=rnd, gebaeude_je_m2=nhk_stichtag * (1 - alterswertminderung))

    # Vergleichswert (Wohnung: ersetzt den Sachwert; Haus: optional gewichtet)
    vergleich = z('ek_wohnflaeche') * z('vw_preis') + z('vw_garage') + z('vw_sonst')
    r['vergleichswert'] = vergleich

    # Anbau / Nebengebäude: eigenes Baujahr, eigene Normalherstellungskosten und Restnutzungsdauer
    # (Modernisierungspunkte wie beim Hauptgebäude), Außenanlagen des Anbaus
    anbau = an('anbau_aktiv') and not wohnung
    anbau_vorlaeufig, rnd_anbau = 0.0, 0.0
    if anbau:
        bgf_an = sum(z('bgfan_l%d' % i) * z('bgfan_b%d' % i) + z('bgfan_e%d' % i) for i in range(6))
        txt_an = f.get('nhkan_base', '')
        basis_an = [float(x.strip().replace(',', '.')) for x in txt_an.replace(';', ',').split(',') if x.strip()] if txt_an else []
        if len(basis_an) < 5:
            basis_an = [615, 685, 785, 945, 1180]
        nhk_an = sum(0 if an('nhkan_f%d' % i) else g * kostenkennwert(basis_an, z('nhkan_s%d' % i) or 3) for i, g in enumerate(GEWICHTE))
        gnd_an = z('nhkan_gnd') or 80
        alter_an = max(jahr - z('an_baujahr'), 0) if z('an_baujahr') > 0 else 0
        rnd_anbau = z('nhkan_rnd') if z('nhkan_rnd') > 0 else restnutzungsdauer(alter_an, gnd_an, punkte)
        wm_an = min(max((gnd_an - rnd_anbau) / gnd_an, 0), 1)
        an_je_m2 = nhk_an * (z('bpi_faktor') or 1) * (z('bpi') or 100) / 100 * (z('nhk_regional') or 1) * (1 - wm_an)
        anbau_vorlaeufig = bgf_an * an_je_m2 + z('an_aussen')
        r.update(rnd_anbau=rnd_anbau, anbau_je_m2=an_je_m2)

    # Sachwert: vorläufiger Sachwert × Sachwertfaktor
    faktor = z('markt_faktor') or 1
    vorlaeufig = boden + gebaeude + z('hg_aussen') + z('hg_garage') + anbau_vorlaeufig
    sachwert = vergleich if wohnung else vorlaeufig * faktor + z('sub_zuschlag') + z('sub_abschlag')
    r['substanz'] = sachwert

    # Ertragswert (allgemeines Verfahren): Reinertrag − Bodenwertverzinsung, kapitalisiert, + Bodenwert
    lz = z('er_zins_basis') + z('er_zins_adj')
    if an('er_mietrolle'):
        roh = sum((z('mr_fl%d' % i) * z('mr_pm2%d' % i) + z('mr_pau%d' % i)) * 12 for i in range(14))
    else:
        roh = z('ek_miete_wohnen') + z('ek_miete_gewerbe') + z('ek_miete_stellplatz')
    if an('er_bwmodus'):
        bewirt = (z('ek_anz_we') * z('er_bw_verw_we') + z('ek_anz_stell') * z('er_bw_verw_sp')
                  + z('ek_wohnflaeche') * z('er_bw_inst_m2') + z('ek_anz_stell') * z('er_bw_inst_sp')
                  + roh * z('er_bw_mietausfall') / 100 + z('er_bw_nuk'))
    elif wohnung and z('ek_hausgeld_nu') > 0:
        bewirt = z('ek_hausgeld_nu') * 12
    else:
        bewirt = roh * z('er_bewirt') / 100
    rnd_ertrag = z('er_rnd_override') if (wohnung and z('er_rnd_override') > 0) else rnd
    # Mietertrag je Gebäude wie im Vordruck der Bank (Bank- und Lagergebäude): Jedes Gebäude trägt seinen Teil des
    # Rohertrags, der Bewirtschaftung und des Bodenwerts (nach Mietanteil) und wird mit seiner eigenen
    # Restnutzungsdauer kapitalisiert. Ohne Miete für den Anbau gibt es nur das Hauptgebäude.
    roh_anbau = min(max(z('er_miete_anbau'), 0), max(roh, 0)) if anbau else 0.0
    teile = [(roh - roh_anbau, rnd_ertrag)] + ([(roh_anbau, rnd_anbau)] if roh_anbau > 0 else [])
    gebaeudewert = 0.0
    for roh_teil, rnd_teil in teile:
        anteil = roh_teil / roh if roh > 0 else 1.0
        rein_teil = (roh_teil - bewirt * anteil) * (1 - z('er_gewerbe') / 100)
        gebaeude_rein_teil = rein_teil - boden * anteil * lz / 100
        gebaeudewert += gebaeude_rein_teil * rentenbarwertfaktor(lz, rnd_teil)
    gebaeude_rein = (roh - bewirt) * (1 - z('er_gewerbe') / 100) - boden * lz / 100
    v = gebaeudewert / gebaeude_rein if gebaeude_rein else rentenbarwertfaktor(lz, rnd_ertrag)
    ertrag = gebaeudewert + z('er_aussen') + z('er_objekt') + boden
    r.update(roh=roh, bewirt=bewirt, vf=v, ertrag=ertrag)

    # Gewichtung
    g = float(f.get('gewichtung') or 0.5)
    mittel = g * sachwert + (1 - g) * ertrag
    if not wohnung and an('vw_aktiv'):
        gv = min(max(z('gew_vergleich'), 0), 100) / 100
        mittel = (1 - gv) * mittel + gv * vergleich
    r['mittel'] = mittel

    # PV-Anlage: Barwert des Reinertrags aus Stromerlös
    pv = 0.0
    if an('pv_aktiv'):
        pv = max(z('pv_ertrag_kwh') * z('pv_erloes') * (1 - z('pv_bewirt') / 100) * rentenbarwertfaktor(z('pv_zins'), z('pv_rnd')), 0)
    if f.get('pv_basis') == 'enthalten':
        pv = 0.0
    elif f.get('pv_basis') == 'teilweise':
        pv = z('pv_markt_ansatz')
    r['pvWert'] = pv

    # Energetische Qualität
    energie = 0.0
    if an('en_aktiv'):
        kl = klasse(z('en_kennwert')) if z('en_kennwert') > 0 else f.get('en_klasse', 'D')
        namen = [k for k, _ in KLASSEN]
        ref = f.get('en_ref_klasse', 'D')
        if f.get('en_modus') == 'kosten':
            ref_kennwert = dict(KLASSEN)[ref] if ref != 'H' else 300
            mehr = (z('en_kennwert') - ref_kennwert) * z('ek_wohnflaeche') if z('en_kennwert') > 0 else 0
            energie = z('en_markt_ansatz')  # Marktansatz separat eingegeben; Kostenbarwert ist nur ein Szenario.
        else:
            stufen = namen.index(kl) - namen.index(ref)
            energie = mittel * (-stufen * z('en_pct_stufe')) / 100
    if f.get('en_basis') == 'enthalten':
        energie = 0.0
    elif f.get('en_basis') == 'teilweise':
        energie = z('en_markt_ansatz')
    r['energieWert'] = energie

    # Belastungen: Nießbrauch / Wohnungsrecht / Leibrente — Jahreswert × Kapitalwert der Leibrente
    belastung = 0.0
    if an('niess_aktiv'):
        art = f.get('ni_art', 'niessbrauch')
        miete = z('ni_miete') if z('ni_miete') > 0 else (z('ek_miete_wohnen') + z('ek_miete_gewerbe') if f.get('ni_umfang') == 'gesamt' else 0)
        grundsteuer = z('ni_grundst') if z('ni_grundst') > 0 else (z('ek_grundsteuer') if f.get('ni_umfang') == 'gesamt' else 0)
        if art == 'leibrente':
            jahreswert = z('ni_rente') * 12
        elif art == 'wohnrecht':          # Grundsteuer trägt der Eigentümer
            jahreswert = miete * (1 - z('ni_nuk') / 100)
        else:
            jahreswert = miete - grundsteuer - miete * z('ni_nuk') / 100
        kw = z('ni_kapwert') if z('ni_kapwert') > 0 else rentenbarwertfaktor(z('ni_zins'), z('ni_leben'))
        belastung = max(jahreswert * kw, 0)
    r['niessWert'] = belastung

    # Erbbaurecht: Abzug = Bodenwert − Barwert (Bodenwertverzinsung − Erbbauzins), zuzüglich Abschlag
    erbbau = 0.0
    if not wohnung and an('eb_aktiv'):
        vz = z('eb_verzinsung') if z('eb_verzinsung') > 0 else lz
        roh_abzug = boden - (boden * vz / 100 - z('eb_zins_eur')) * rentenbarwertfaktor(vz, z('eb_restlaufzeit'))
        erbbau = max(roh_abzug * (1 + z('eb_abschlag') / 100), 0)
    r['erbbauAbzug'] = erbbau

    # § 8 Abs. 3: Abschläge positiv, Zuschläge (wk_art = 'plus') mit umgekehrtem Vorzeichen, ältere Fälle nur mit
    # Vorzeichen (negativ = Zuschlag); Abschnitt ausgeschaltet (wk_aus): keine Zu- und Abschläge
    wk = 0.0 if an('wk_aus') else sum(-abs(z('wk_val%d' % i)) if f.get('wk_art%d' % i) == 'plus' else z('wk_val%d' % i) for i in range(14))
    extras = z('xemp1_val') + z('xemp2_val')
    empfehlung = mittel + pv + energie - belastung - erbbau - wk + extras
    vh = z('verhandlung') / 100
    r.update(wkSumme=wk, empfehlung=empfehlung, spanne_unten=empfehlung * (1 - vh), spanne_oben=empfehlung * (1 + vh))

    # Rendite
    kp = z('re_kaufpreis') if z('re_kaufpreis') > 0 else empfehlung
    r['reBrutto'] = roh / kp * 100 if kp > 0 else 0
    r['reFaktor'] = kp / roh if roh > 0 else 0
    return r


def main():
    with open(os.path.join(HIER, 'faelle.json'), encoding='utf-8') as fh:
        faelle = json.load(fh)
    soll = {}
    for name, fall in faelle.items():
        if name.startswith('_'):
            continue
        soll[name] = {k: round(v, 6) for k, v in bewerte(fall['felder'], fall['jahr']).items()}
    with open(os.path.join(HIER, 'sollwerte.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(soll, fh, ensure_ascii=False, indent=1)
    for name, werte in soll.items():
        print('%-36s Empfehlung %14.2f  Sachwert %14.2f  Ertrag %14.2f  RND %7.3f' % (
            name, werte['empfehlung'], werte['substanz'], werte['ertrag'], werte['rnd']))


if __name__ == '__main__':
    main()
