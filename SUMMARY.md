## Preis-Anzeige korrigiert (Build 3)

Preis direkt am Objekt; fehlende Grundlagen statt scheinbarer Empfehlung von 0 Euro. Fünf vollständige Testfälle auf dem iPhone korrekt berechnet. 16 native Tests bestanden. [Prüfung und Grenzen](docs/Preis-Anzeigeprüfung.md).

## Neue Eingabeführung auf iOS

Build 2 ersetzt lange Formularlisten durch kurze Schritte mit Zurück/Weiter und Feldnavigation. 357 skalare Zahlenfelder sind explizit als Ganzzahl, Dezimalzahl oder vorzeichenbehaftete Zahl definiert. Optionale Angaben und ungenutzte Tabellenzeilen bleiben ausgeblendet; bestehende Angaben erhalten. Zwölf native Tests bestanden. [Details](docs/Native-Eingabeführung.md).

# Aktueller Stand: native iOS-App

Das iOS-Hauptprojekt ist jetzt eine SwiftUI-App unter `ios/ImmoAppNative.xcodeproj`. Native Erfassung, Objektverwaltung, Berechnung, Prüfhinweise, Fotos, JSON-Sicherungen, PDF-Berichte und Gerätesperre sind umgesetzt. Keine HTML-Oberfläche, keine WebView, kein Capacitor im App-Bundle. Der bewährte Rechenkern läuft lokal über JavaScriptCore.

**Sieben native Tests bestanden**, einschließlich zehn Referenzfälle und eines echten UI-Ablaufs. Weitere eigenständige Zusatzfunktionen der früheren PWA sind noch zu übertragen; der vollständige Umfang steht in [Native iOS-App](docs/Native-iOS-App.md).

Die folgenden Abschnitte dokumentieren die vorherigen Ausbaustufen.

# Zusammenfassung — Stand 30. September 2026

Die lokale Umsetzung übernimmt die zwischenzeitlich aktualisierte GitHub-Fassung `7fa7d96` und ergänzt sie um vollständige Modularisierung, lokale Schriftarten, atomare Offline-Updates, weitere Grenzfalltests und ein konkret gebautes iOS-Projekt. Historische Berichte liegen unter `docs/historisch/`.

## Fachliche Modellkorrekturen

Die im Audit gefundenen Fehler wurden behoben: unbelegte Vorgaben entfernt, eigener Beleihungsstatus, Mindestansätze und Sonderfälle abgesichert, Quellen und Gewichtung verpflichtend dokumentiert, PV/Energie-Doppelzählung verhindert und Rechte ohne erfundene Lebensdauer bewertet. Berichte unterscheiden wirtschaftliche Szenarien und Marktansätze. Details und verbleibende fachliche Grenzen: [Berechnungsprüfung](docs/Berechnungsprüfung.md).

Der vollständige abschließende Lauf besteht aus **67 Unit-Tests und 43 Browsertests**, ohne Fehler oder übersprungene Tests. Die neue Prüfung ergänzt 25 Unit- und 4 Browsertests. Der abschließende vollständige Nachweis steht unter `docs/pruefnachweise/Modellkorrekturen-Tests-2026-09-30.txt`. Die früher unten aufgeführten Zahlen dokumentieren die vorangegangene Ausbaustufe.

## Neue App-Bedienung

Vier Hauptbereiche, Objektübersicht mit Fortschritt, vier Bewertungsgruppen und jeweils nur ein sichtbarer Formularabschnitt. Aufklappbare Details vermeiden ein endloses Formular. Projekt-/Marktseiten sind in die Navigation eingebettet; gespeicherte Daten und Rechenverfahren bleiben erhalten. Touch-Ziele, Tastatur, Browser-Zurück, globale Suche und beide Farbschemata sind geprüft.

Der neue vollständige Testlauf steht unter `docs/pruefnachweise/App-Layout-Tests-2026-09-30.txt`; die ergänzte Dunkelmodus-Kontrastprüfung unter `docs/pruefnachweise/iPhone-Kontrast-2026-09-30.txt`. Der aktualisierte iOS-Simulator-Build ist ebenfalls erfolgreich kompiliert; reale Geräteprüfungen bleiben offen.

## Ergebnis

- HTML und CSS getrennt; fachliche Browsermodule in `src/`. Die Initialisierung läuft nach allen Moduldefinitionen.
- Bestehender DOM-unabhängiger Rechenkern, Datenprüfung, Speichermechanik und echte DOCX/XLSX/PDF-Exporte erhalten.
- Vollständige lokale Laufzeitdateien; keine Cloud-Migration. Neue PWA-Versionen installieren sich atomar und aktivieren sich nach dem Schließen alter Fenster.
- Zusätzliche Fehler bei sehr kleinen positiven Zinsen und bei `restNach(0)` behoben und dokumentiert.
- Native PDF-/Office-/JSON-Ausgabe über Filesystem/Share. Bei Abbruch oder Fehler wird eine Sicherung nicht als erfolgreich markiert.
- README, Installationsanleitung, Entscheidungen, Roadmap und CI aktualisiert.

## Frühere Prüfungen vor den Modellkorrekturen

- `npm test`: **42 Unit-Tests und 39 Browsertests bestanden**, keine Fehler, keine übersprungenen Tests.
- Browser: installiertes Chrome für Desktop, WebKit für die iPhone-Ansicht.
- Exporte unabhängig mit python-docx, openpyxl und PyMuPDF geöffnet; PDF-Seitenformat, langer Text, Fotos, Exposé und Querformat-Präsentation geprüft.
- Unabhängige Python-Sollwerte neu berechnet; keine Änderung der festgehaltenen Sollwertdatei.
- `npm run build`: 54 lokale Offline-Dateien, circa 1,9 MB statische Ausgabe.
- `npm audit`: keine gemeldeten bekannten Sicherheitslücken in den installierten npm-Abhängigkeiten zum Prüfzeitpunkt.
- Xcode: iOS-Simulator-Build erfolgreich, App `de.immoapp.preisermittlung` installiert und gestartet; Laufzeitlog bestätigt geladenen WebView.
- Unabhängige Codeprüfung: Controller-Registrierung, nativer PDF-Weg und Share-Fehlerbehandlung korrigiert; Regressionstests für native Dateiausgabe und Sicherungsabbrüche ergänzt.

Der vollständige Testlauf liegt unter `docs/pruefnachweise/Tests-2026-09-30.txt`. Die Suite erfasst mehrere vollständige Referenzfälle und zahlreiche Abläufe innerhalb eines Tests; eine bestandene Suite ist keine fachliche Zertifizierung sämtlicher Bewertungsmodelle.

## iOS-Grenzen

Die installierbare Capacitor-App verwendet weiterhin die Web-Oberfläche. Eine vollständige SwiftUI-Version wurde nicht gebaut. Physisches iPhone, reale Biometrie/Gerätecode, Kamera, GPS, native Dateifreigabe, Hintergrundwechsel, endgültiges Branding, Signierung und TestFlight-Verfügbarkeit sind noch gesondert zu prüfen. Es wurde nichts veröffentlicht.

PWA und native App speichern getrennt; vorhandene Daten werden über Sicherungsdateien übertragen. Die Gerätesperre ist keine Datenverschlüsselung. Aufwand und Startbefehle: `docs/Verbesserungen-und-iOS.md`.
