# Technische Prüfung — Stand 30. September 2026

Grundlage ist die lokale Umsetzung auf GitHub-Stand `7fa7d96`, der vollständige Testlauf (42 Unit- und 39 Browsertests), unabhängige Export-/Sollwertprüfungen und eine zusätzliche Codeprüfung des iOS-/Offline-Teils. Der ältere Audit liegt unter `docs/historisch/`.

## Architektur und Korrektheit

Die Berechnungen und Dateiprüfungen in `js/` sind vom DOM getrennt. Browseradapter sind in fachliche Module gegliedert. Die globalen Schnittstellen bleiben zur Kompatibilität erhalten; Initialisierung erst nach dem Laden aller Skripte. Eine spätere Umstellung auf vollständig gekapselte ES-Module wäre möglich, ist für diese statische Anwendung aber keine Voraussetzung.

Stichtagsbezug, Beleihungswert-Höchstnutzungsdauer, Vorzeichen, ungültige/fehlende Eingaben und konsistente Cockpit-Anzeigen sind Bestandteil des übernommenen und erneut geprüften Stands. Zusätzlich sind die numerische Stabilität bei kleinen Zinsen und die Restschuld zu Beginn korrigiert.

## Daten und Exporte

Datei-Prüfungen erfolgen vor dem Import. Datenbanktransaktionen und Verhalten bei vollem/gesperrtem Speicher sind getestet. Vollständige Projekte mit Fotos, Grundrissen und Unterschrift sowie Marktobjekte mit PDF-Anhängen wurden über Sicherungen übertragen. Lokale Speicherung braucht weiterhin regelmäßige externe Sicherungen.

Office-Dateien wurden mit unabhängigen Bibliotheken geöffnet. PDF-Erstellung und Druck wurden auf Seitenformat, vollständige lange Texte und Bilder geprüft. Maskierungstests fanden im geprüften Ablauf keine Ausführung eingeschleuster HTML-Inhalte. Eine vollständige Sicherheitsprüfung aller denkbaren Eingaben ist damit nicht behauptet.

## Offline und Abhängigkeiten

Runtime und Schriftarten liegen lokal. `cache.addAll()` verhindert die Aktivierung unvollständiger Builds. Aktive alte Fenster behalten ihre Version; die neue Version aktiviert sich nach deren Schließen. Caches anderer Anwendungen werden nicht gelöscht. Das Verhalten ist mit einem Versionswechseltest belegt.

Die npm-Abhängigkeitsprüfung meldete zum Prüfzeitpunkt null bekannte Sicherheitslücken. Sie ersetzt keine Prüfung der selbst enthaltenen Bibliotheken oder eine fachliche Freigabe.

## iOS

Controller und DeviceLock-Plugin wurden verbunden, Filesystem/Share für native Dateiausgabe eingebaut, Berechtigungsbeschreibungen und Privacy Manifest angelegt. Mehrere erfolgreiche Simulator-Builds und Starts; Gerätetest und Veröffentlichung fehlen weiterhin. Auch eine funktionsfähige Gerätesperre verschlüsselt weder IndexedDB noch exportierte Dateien.

## Offen

Physische iPhone-Prüfung (Biometrie, Kamera, GPS, Dateiabläufe, Hintergrund), finales App-Branding, Signierung, TestFlight, fachliche Freigabe und je Bewertung aktuelle örtliche Marktparameter. Details in `ROADMAP.md` und `docs/Verbesserungen-und-iOS.md`.

## App-Oberfläche

Die neue App-Navigation erhält Eingaben beim Bereichswechsel. UI-Selektoren werden nicht als Bewertungsdaten gespeichert. Prüfhinweise öffnen den korrekten Abschnitt und geschlossene Details. Die globale Suche wechselt nach erfolgreichem Projektladen bzw. Öffnen der aktuellen Bewertung ausdrücklich zur Objektübersicht. Die unabhängige Codeprüfung hat diesen zunächst fehlenden Wechsel gefunden; er ist mit zwei Regressionstests korrigiert.

## Ergänzende fachliche Modellprüfung

Die fokussierte Prüfung nach dem Layoutumbau zeigt erhebliche Modell- und Validierungslücken trotz korrekter technischer Testausführung. Der allgemeine Prüfstatus ist keine Freigabe eines BelWertV-konformen Beleihungswerts. Siehe `docs/Berechnungsprüfung.md` und die reproduzierbaren 15 Gegenbeispiele unter `docs/pruefnachweise/`. Produktformeln und bisherige Sollwerte wurden in dieser Prüfung nicht verändert.
