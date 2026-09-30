# Prüfung der gemeldeten Nullpreise

30. September 2026, Build 3.

Gemeldet wurden 0 € bei den Testimmobilien auf dem iPhone. Der vollständige Weg über Testdatenimport, gespeicherte Objekte, Neustart, JavaScriptCore und Ergebnisansicht wurde zusätzlich geprüft.

Die direkte Diagnose auf dem iPhone ergab nach dem Neustart bei fünf Testfällen positive Preise und keinerlei abweichende Feldwerte gegenüber dem synthetischen Ausgangsdatensatz. Der Fall „Unvollständige Erstaufnahme“ liefert bewusst 0 als internen Rechenwert. Die ursprüngliche Behauptung, alle fünf vollständigen Fälle hätten intern 0 ergeben, konnte bei der direkten Prüfung nicht reproduziert werden.

Die Anzeige war bei unvollständigen Fällen irreführend. Außerdem war die tatsächliche Empfehlung erst über einen weiteren Navigationsschritt zu sehen; die Parameterseite hieß ebenfalls Preisempfehlung.

## Korrekturen

- Der berechnete Preis steht direkt auf der Objektseite und weiterhin im Ergebnis.
- Fehlende/ungültige Grundlagen oder kein positiver Wert zeigen „Noch nicht berechenbar“ statt einer scheinbaren Empfehlung von 0 €.
- Positive, noch nicht vollständig dokumentierte Ergebnisse heißen „Vorläufiger Rechenwert“.
- Der PDF-Bericht übernimmt dieselbe Darstellung.
- Die Parameterseite heißt „Gewichtung und Preisspanne“.
- Fehlende oder nicht endliche Preise aus dem Rechenkern führen zu einem sichtbaren Berechnungsfehler; sie werden nicht mehr still als 0 dargestellt.

## Nachweise

16 native Tests bestanden, keine Fehler oder übersprungenen Tests. Ergänzt wurden explizite Preisprüfungen aller gespeicherten Testfälle nach Neustart sowie ein UI-Test des EFH-Preises sowohl am Objekt als auch im Ergebnis. Die Verordnungsformeln und die vorhandenen Bewertungsdaten wurden nicht geändert.

Die Gerätediagnose exportiert keine gespeicherten Feldwerte und keine privaten Preise. Die numerischen Werte im Nachweis stammen ausschließlich aus den öffentlichen fiktiven Beispieldaten; für die vorhandenen Testobjekte werden nur Statusflags und Namen abweichender Felder ausgegeben.
