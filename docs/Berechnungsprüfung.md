# Fachliche Berechnungsprüfung und umgesetzte Korrekturen

Stand der Umsetzung: 30. September 2026.

## Umgesetzte Korrekturen

- Neue Bewertungen beginnen ohne automatisch angenommene Garage, Außenanlagen oder unbelegte Marktparameter. Positive Garagenwerte brauchen bestätigte Existenz, Stellplatzanzahl und Grundlage.
- Verfahrenswahl, Gewichtung, Marktquellen und Modellübereinstimmung werden dokumentiert. Fehlende Nachweise führen zu einem Entwurf. Diese Vollständigkeitsprüfung bestätigt nicht die Echtheit einer Quelle.
- Beleihung hat einen eigenen Status. Kostenuntergrenzen, höhere tatsächliche Kosten, Nutzungsaufschläge und Sicherheitsabschlag werden berücksichtigt. Widersprüchliche Nutzungen, fehlende Ertrags-/Herstellungswerte und ungültige Zahlen werden erkannt.
- Kurze Restnutzung, Freilegung und nichtpositiver Gebäudeertrag werden getrennt behandelt. Besondere Kontrollbetrachtungen verlangen zusätzliche Begründungen.
- Energie-/PV-Ertragsbarwerte erscheinen als gesonderte Szenarien. Bereits enthaltene Vorteile werden nicht nochmals angerechnet; zusätzliche Marktansätze brauchen eine belegte Abgrenzung.
- Rechte brauchen ausdrücklich angegebene Laufzeit bzw. Kapitalisierung und Umfang. Alter allein erzeugt keine Lebenserwartung; Teilrechte erhalten keine automatische Gesamtmiete. Steuerliche Szenarien werden nicht als Marktbelastung übernommen. Die falsche Rechtszitierung wurde korrigiert.
- Berichte und Office-Ausgaben übernehmen Entwurfsstatus, Grundlagen und die verwendeten Ansätze.

Die fachlichen Grundlagen stehen in [ImmoWertV](https://www.gesetze-im-internet.de/immowertv_2022/BJNR280500021.html) und [BelWertV](https://www.gesetze-im-internet.de/belwertv/BJNR117500006.html). Die Umsetzung umfasst die hier beschriebenen Fälle; sie ist keine vollständige Zertifizierung sämtlicher Sonderfälle.

## Was für eine fachliche Freigabe noch nötig ist

Echte örtliche Marktdaten und deren Ableitungsmodelle müssen für das jeweilige Objekt eingegeben und fachlich beurteilt werden. Weitere Sonderkonstellationen, gemischte Nutzungen, besondere Rechte und steuerliche Faktoren brauchen eine objektspezifische Prüfung. Als nächster fachlicher Nachweis fehlen anonymisierte reale Gutachten mit bekannten Ergebnissen. Die App erfindet dafür keine Quellen.

## Historischer Befund vor der Korrektur

Die folgenden Befunde und Beträge beschreiben den Stand **vor** der Umsetzung. Der ursprüngliche JSON-Nachweis bleibt unverändert erhalten. Aktuelle Vergleichsvarianten stehen in `docs/pruefnachweise/Modellkorrekturen-2026-09-30.json`; die Teständerungen sind in `tests/fixtures/golden-aenderungen.md` erläutert.

Stand: 30. September 2026. Grundlage: aktueller lokaler Rechenkern, 15 kontrollierte Varianten des synthetischen Wohnhaus-Referenzfalls und Abgleich mit den veröffentlichten Verordnungstexten.

**Ergebnis: Die Grundrechnungen sind nachvollziehbar. Die gesamte Preis- und Beleihungswertermittlung ist damit aber noch nicht fachlich belastbar freigegeben.** Vorbelegte Werte, fehlende Sonderfälle und vereinfachte Zuschläge können erhebliche Abweichungen erzeugen. Eine technisch bestandene Testsuite bestätigt die programmierten Modelle, nicht deren Eignung für jeden Bewertungsfall.

Die folgenden Beträge sind ausschließlich kontrollierte Testbeispiele. Es handelt sich nicht um Marktwerte realer Immobilien.

## Die wichtigsten Befunde

| Priorität | Befund | Nachweis / Wirkung |
|---|---|---|
| Hoch | Garage/Carport wird mit 25.000 € vorbelegt | Auch bei 0 Stellplätzen berücksichtigt. Im Referenzfall 472.970,43 € statt 459.673,56 € ohne Garage: **13.296,87 € Unterschied** bei sonst unveränderten Eingaben. |
| Hoch | Mindestkosten im Beleihungsmodul nicht abgesichert | 0 % statt 15 % Kosten erhöht den Beleihungswert von 285.773,30 € auf 331.873,14 €: **46.099,84 € Unterschied**. Allgemeiner Prüfstatus bleibt `ok`. |
| Hoch | Sonderfälle bei kurzer Restnutzungsdauer fehlen | Bei 20 Jahren ergibt der Code 263.462,88 €. Kapitalisierung des gesamten Reinertrags über 20 Jahre als eine gesetzlich vorgesehene Alternative ergibt 184.316,09 €. **79.146,79 € Abweichung im Modellvergleich**, kein pauschaler Korrekturbetrag. |
| Hoch | Gültigkeitsanzeige prüft Beleihungsregeln nicht vollständig | Kosten, Sicherheitsabschlag und Mindestsätze brauchen einen eigenen fachlichen Status. Einzelne UI-Warnungen ersetzen diese Prüfung nicht. |
| Mittel | Preis wird aus voreingestellter Verfahrensgewichtung gemischt | Bei sonst gleichen Eingaben 371.265,31 € nur Ertrag und 574.675,56 € nur Sachwert. Die Gewichtung kann also wesentlich mehr bewirken als eine kleine Rundungsabweichung. |
| Mittel | Energetischer Abschlag ist eine pauschale Modellannahme | Im Referenzfall −36.631,19 €. 2,5 % pro Klassenstufe ist ohne örtliche Marktbegründung kein nachgewiesener Werteinfluss. |
| Mittel | PV und weitere Merkmale können doppelt berücksichtigt werden | Bei 100 % Vergleichswert 580.000 €; zusätzlicher PV-Ansatz macht daraus 601.185,76 €. Das ist problematisch, wenn PV bereits im Vergleichspreis enthalten ist. |
| Mittel | Wohnrechte/Nießbrauch sind stark vereinfacht | Lebensdauer ist eine eigene Altersformel; bei fehlendem Einzelansatz wird die gesamte erfasste Miete verwendet. Bei einem nur auf eine Wohnung beschränkten Recht kann das falsch sein. |
| Mittel | Marktparameter sind nicht automatisch verifiziert | Baupreisindex ist als Näherung vorbelegt, Sachwertfaktor 1,15 und Zinssätze kommen teilweise aus Vorgaben. Quellenfelder existieren, sind aber keine fachliche Freigabe. |

## 1. Vorbelegte Bauteile und Werte

`index.html` setzt Außenanlagen auf 20.000 € und Garage/Carport auf 25.000 €. `js/kern.js` addiert diese Beträge unabhängig von `ek_anz_stell`. Das ist kein Multiplikationsfehler, sondern eine gefährliche Annahme über das tatsächliche Objekt. Eine Immobilie ohne Garage kann damit einen automatisch angesetzten Garagenwert erhalten.

**Empfehlung:** Objektabhängige Geldbeträge ohne belegte Grundlage mit 0 bzw. „noch nicht erfasst“ beginnen. Vorhandene Garage, Zahl der Plätze, Zustand und Wertansatz bewusst erfassen. Widersprüche zur Anzahl der Stellplätze sichtbar prüfen. Außenanlagen ebenfalls nicht als automatisch zutreffenden Betrag behandeln.

## 2. Bewirtschaftungskosten und Sicherheitsabschlag bei BelWertV

Die Verordnung verlangt für die betreffenden Bewirtschaftungskosten insgesamt mindestens 15 % des Rohertrags und berücksichtigt zudem Einzelmindestsätze sowie die tatsächlichen/kalkulierten Kosten. Der Code verwendet dagegen `Math.max(Eingabe, 0)`. Im Gegenbeispiel werden 0 € abgezogen; der allgemeine Prüfstatus bleibt `ok`. Quelle: [§ 11 BelWertV](https://www.gesetze-im-internet.de/belwertv/BJNR117500006.html).

Auch der Sicherheitsabschlag lässt sich auf 0 % setzen. Bei sachwertorientiertem Ansatz liefert das Testmodell 408.949 € statt 389.054,10 € mit 10 %. Eine UI-Warnung ist vorhanden, aber die allgemeine Validitätsprüfung lässt den Fall durch. Der gesetzliche Mindestabschlag beträgt 10 %. Quelle: [§ 16 BelWertV](https://www.gesetze-im-internet.de/belwertv/__16.html).

**Wichtige Einordnung:** Der genutzte Referenzfall setzt außerdem 5 % Kapitalisierungszins an, während das App-Modell hierfür einen Mindestsatz von 5,5 % ausweist. Die App warnt an dieser Stelle. Die Kosten-Gegenüberstellung hält den Zinssatz bewusst unverändert; sie ist deshalb ein isolierter Wirkungsnachweis, keine als vollständig normkonform behauptete Referenzbewertung.

**Empfehlung:** Getrennte Freigabestatus für allgemeine Preiseinschätzung und Beleihungswert. Im Beleihungsmodus alle zwingenden Mindestsätze und zulässigen Ausnahmen mit Begründung prüfen. Regelwidrige Szenarien allenfalls ausdrücklich als Szenario/Entwurf zeigen, nicht als freigegebenen Beleihungswert.

## 3. Kurze Restnutzungsdauer und besondere Ertragsfälle

Der Beleihungsertragswert wird immer als kapitalisierter Gebäudereinertrag plus voller Bodenwert berechnet. Die besondere Behandlung bei Restnutzungsdauer unter 30 Jahren wird nicht umgesetzt: § 13 Absatz 2 nennt die Kapitalisierung auch des Bodenwertanteils am Reinertrag oder alternativ den Abzug ermittelter Abbruchkosten. Bei fehlendem Gebäudereinertrag gelten ebenfalls zusätzliche Anforderungen; der Code setzt hier lediglich einen Bodenwertansatz an. Quelle: [§ 13 BelWertV, Gesamtausgabe](https://www.gesetze-im-internet.de/belwertv/BJNR117500006.html).

Bei 20 Jahren, 14.790 € jährlichem Reinertrag und 5 % Zins ergibt die Gesamt-Reinertragskapitalisierung 184.316,09 €. Der App-Weg liefert 263.462,88 €. Welche Variante für eine konkrete Immobilie anzuwenden ist, hängt von deren Verhältnissen und den sachverständig ermittelten Kosten ab.

**Empfehlung:** Solche Fälle als Sonderfall kennzeichnen und zusätzliche Angaben abfragen. Keine automatische scheinbare Freigabe ohne passende Behandlung.

## 4. Gewichtung, Marktanpassung und Vergleich

Die App berechnet einen gewichteten Mittelwert. Das kann als transparente Szenariorechnung nützlich sein. Es ist aber keine allgemeine fachliche Vorschrift, Sachwert und Ertragswert immer 50:50 oder je Vordruck fest zu mischen. Verfahrenswahl und Ableitung müssen die verfügbaren Daten und deren Aussagefähigkeit berücksichtigen. Quellen: [§ 6 ImmoWertV, Gesamtausgabe](https://www.gesetze-im-internet.de/immowertv_2022/BJNR280500021.html), [§ 10 ImmoWertV](https://www.gesetze-im-internet.de/immowertv_2022/__10.html).

Die unabhängige Python-Rechnung prüft die gleichen gewählten Modellannahmen. Sie belegt daher die zahlenmäßige Umsetzung, nicht die Marktgerechtigkeit einer voreingestellten Gewichtung.

Auch im Beleihungsmodul ist „der niedrigere aus Sachwert und Ertragswert“ eine konservative Vereinfachung. § 4 stellt regelmäßig auf den Ertragswert ab und sieht bei großen Differenzen eine besondere Nachhaltigkeitsprüfung vor. Es handelt sich nicht schlicht um eine allgemeine gesetzliche Minimum-Regel. Quelle: [§ 4 BelWertV](https://www.gesetze-im-internet.de/belwertv/__4.html).

**Empfehlung:** Verfahrenswahl, Gewichtung und Datenqualität begründen; starke Verfahrensabweichungen sichtbar machen. Kein Faktor und kein Liegenschaftszins sollte allein durch eine Vorlage fachlich als passend gelten.

## 5. Energie, PV und Doppelzählung

Der pauschale Energieabschlag hat keine im Modell hinterlegte örtliche Herleitung. Die kapitalisierte Energiekostendifferenz ist eine andere Modellrechnung; Betriebskostenersparnis und Verkaufswertänderung sind nicht automatisch dasselbe.

PV wird unabhängig vom gewählten Verfahren zur Endempfehlung addiert. Ein zusätzlicher Ansatz ist nur sinnvoll, wenn derselbe Vorteil nicht bereits im Grundwert enthalten ist. Gleiches gilt für Sanierung, Modernisierung und energetische Merkmale. Quelle zum Vermeiden bereits anderweitig berücksichtigter Merkmale: [§ 8 Absatz 3 ImmoWertV](https://www.gesetze-im-internet.de/immowertv_2022/__8.html).

**Empfehlung:** Je Merkmal abfragen, ob es bereits in Miete, Vergleichspreis, Gebäudestandard oder Marktanpassung enthalten ist. Zusätzliche Ansätze brauchen Quelle bzw. ausdrückliche Begründung.

## 6. Rechte und Lebensdauer

`restLeben()` ist eine eigene lineare Näherung mit einer Untergrenze von zwei Jahren, keine implementierte amtliche Sterbetafel. Für Kapitalwerte lebenslanger Rechte ist diese Vereinfachung ohne passende Datenbasis zu schwach. Steuerliche Kapitalwerte und marktgerechte Wertminderungen dürfen zudem nicht gleichgesetzt werden.

Der Mietansatz fällt bei `ni_miete = 0` auf die erfasste Gesamtmiete zurück. Die Vorlagen für ein Recht an der Hauptwohnung oder Einliegerwohnung setzen keine entsprechende Teilmiete. Im Test kostet das Gesamtmietrecht 143.376,47 €, der Ansatz mit 6.000 € Teilmiete 61.800,20 €. Ob ein Recht diese Beträge tatsächlich rechtfertigt, ist damit nicht geprüft.

Außerdem ist der Hinweis „§ 48 ImmoWertV“ beim Nießbrauch falsch zugeordnet: § 48 behandelt Erbbaurecht und Erbbaugrundstücke. Quelle: [§ 48 ImmoWertV](https://www.gesetze-im-internet.de/immowertv_2022/__48.html).

**Empfehlung:** Betroffene Einheit, Rechtsinhalt, Kostenpflichten, gesicherte Laufzeit-/Sterbetafelgrundlage und geeigneten Kapitalwert ausdrücklich erfassen. Fehlende Angaben nicht still aus der gesamten Immobilie ableiten.

## Was bereits sinnvoll funktioniert

Bodenwert als Fläche mal angepasstem Bodenrichtwert, Bezug des Gebäudealters auf den Stichtag, technisch stabile Barwertrechnung, Grundstruktur aus Reinertrag/Bodenwertverzinsung/Kapitalisierung, transparente Einzelpositionen, nachvollziehbare Sensitivitätsrechnung sowie technische Sicherungs- und Exportprüfungen sind brauchbare Grundlagen. Auch die bestehende Warnung vor unplausiblen Restnutzungsdauern sehr alter Gebäude ist sinnvoll. Das ersetzt keine objektspezifische Prüfung oder örtliche Marktgrundlage.

## Reihenfolge für die nächste Überarbeitung

1. Automatisch angesetzte Bauteilwerte entfernen und Objektwidersprüche prüfen.
2. Separaten normbezogenen Status für das Beleihungsmodul einführen; Mindestkosten, Sicherheitsabschlag und Zinssätze absichern.
3. Sonderfälle kurzer Restnutzungsdauer und negativer Gebäudereinerträge fachlich korrekt behandeln.
4. Marktparameter, Verfahrenswahl und Gewichtung mit Quellen/Begründung verbinden.
5. Energie-/PV-Doppelzählung und die Bewertung beschränkter Rechte absichern.
6. Gegen echte, anonymisierte Bewertungen mit bekanntem Ergebnis und örtlicher Modellbeschreibung prüfen. Erst daraus eine fachliche Freigabe ableiten.

## Nachweis und Grenzen

Die Ergebnisse stehen in `docs/pruefnachweise/Berechnungspruefung-2026-09-30.json`. Der historische Nachweis ist archiviert; `node docs/pruefnachweise/pruefe-berechnung.mjs` prüft inzwischen den korrigierten Stand. Der Nachweis enthält den SHA-256 des geprüften Rechenkerns.

Dies ist eine fokussierte Prüfung des programmierten Modells, kein vollständiges Verkehrswertgutachten und keine abschließende Prüfung jeder Gesetzesausnahme. Veröffentlichte TestFlight-/App-Versionen sollten die genannten Grenzen verständlich zeigen. In dieser Prüfung wurden keine Produktformeln, gespeicherten Bewertungsdaten oder bisherigen Sollwerte geändert.
