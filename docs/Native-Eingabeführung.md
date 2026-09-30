# Überarbeitete native Eingabe

Stand: 30. September 2026, Build 2.

Die vorherigen langen Formularlisten wurden ersetzt. Auf der Objektseite stehen der geführte Einstieg, das Ergebnis und zusätzliche Angaben im Vordergrund.

- Die normale Bewertung führt durch kurze, thematisch abgegrenzte Seiten mit maximal vier Feldern: Objekt, Flächen, Einheiten, Grundstück bzw. Vergleichspreis, Gebäudeflächen, Marktparameter, Miete, Gewichtung und Nachweise.
- „Zurück“ und „Weiter“ bleiben am unteren Rand erreichbar. Ein Fortschrittsbalken und ein Schrittmenü zeigen den Ablauf. Die Eingabe kann verlassen und beim gespeicherten Schritt fortgesetzt werden.
- 357 skalare Zahlenfelder haben explizite Feldarten. Ganzzahlen verwenden die Zahlentastatur, Dezimalzahlen die Dezimaltastatur. Ungültige Buchstaben und mehrere Dezimaltrennzeichen werden nicht übernommen. Die nativen Zahleneingaben speichern Dezimaltrennzeichen eindeutig, ohne Indexfaktoren wie 1.406 zu verfälschen.
- Über der Zahlentastatur stehen vorheriges Feld, nächstes Feld und Fertig zur Verfügung; bei vorzeichenbehafteten Korrekturen außerdem ein Vorzeichenwechsel.
- Wohnungen erhalten keine Grundstücks-/Gebäudefragen des Hausmodells. Optionale Module zeigen ihre Detailfragen erst nach Aktivierung. Raumlisten und Mietrollen erscheinen nur bei Verwendung. Zusätzliche Zeilen werden über „Hinzufügen“ geöffnet; bereits ausgefüllte importierte Zeilen bleiben zugänglich.
- Prüfhinweise führen zum betreffenden Eingabeschritt. Die Dokumentations- und Entwurfsregeln wurden beibehalten.

Die gespeicherten Bewertungsdaten und die Rechenformeln wurden bei dieser Überarbeitung nicht migriert oder ersetzt. Die bisherigen zehn Vergleichsfälle bleiben in der nativen Testsuite unverändert geprüft.

## Nachweis

12 native Tests bestanden, keine Fehler oder übersprungenen Tests. Der UI-Test erfasst eine Dezimalfläche, wechselt per Tastatur zum Baujahr, prüft Zurück/Weiter, gespeicherte Werte und Fortsetzen der Eingabe. Die ergänzenden Tests prüfen numerische Feldarten, kurze Seiten, Wohnungsfragen, optionale Module und importierte wiederholte Zeilen.

Testprotokoll: `docs/pruefnachweise/Native-Eingabe-Tests-2026-09-30.txt`.
