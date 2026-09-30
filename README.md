# ImmoApp

Native iOS-App mit SwiftUI für Immobilienerfassung und rechnerische Bewertung. Hauptprojekt: `ios/ImmoAppNative.xcodeproj`, Scheme `ImmoApp`, ab iOS 17. [Umfang, Tests und noch offene Übertragungen](docs/Native-iOS-App.md).

Die bisherige offlinefähige PWA bleibt als separate Quellfassung erhalten. Das iOS-Hauptprojekt verwendet keine WebView oder Capacitor.

## Aktuelle Modellprüfung

Fehlende Quellen und Begründungen bleiben als Entwurf sichtbar. Beleihung wird getrennt geprüft; PV-/Energieszenarien und steuerliche Rechtswerte werden vom Marktansatz unterschieden. [Umgesetzte Korrekturen und fachliche Grenzen](docs/Berechnungsprüfung.md).

## Funktionen der bisherigen Gesamtanwendung

- Sachwert, Ertragswert und Vergleichswert mit NHK, Modernisierung und Restnutzungsdauer.
- Belastungen, Erbbaurecht, PV, energetische Qualität, Beleihungswert und Rendite.
- Aufnahmebogen, Fotos, Grundrisse, Bewertungsbericht und Verkaufsexposé.
- Marktdatenbank, Datengrundlagen und Modellkonformität, Kundenakten und Wiedervorlagen.
- Finanzierung, Budget, Investitionsrechnung, Verkäufer-Präsentation, Käuferprofile und Vermarktungsübersicht.
- Echte DOCX- und XLSX-Dateien, PDF und Sicherungsdateien.

Die Anwendung verwendet keinen eigenen Server für Kundendaten. Bewertungen, Kunden und Marktdaten liegen in localStorage/IndexedDB auf dem jeweiligen Gerät. Dateien werden nur auf Nutzeraktion exportiert oder geteilt. Betriebssystem-Sicherungen und externe Links unterliegen den Einstellungen des jeweiligen Geräts. Die optionale Gerätesperre verschlüsselt die Daten nicht.

## Bedienung

Vier Hauptbereiche: **Übersicht, Objekte, Markt und Mehr**. Eine Bewertung hat eine eigene Objektübersicht mit Preis, Fortschritt und nächster fehlender Angabe. Die Arbeitsschritte **Objekt, Besichtigung, Bewertung und Ergebnis** öffnen gezielt einen Formularbereich. Längere Inhalte sind aufklappbar; Prüfhinweise und Suchtreffer führen direkt zum richtigen Feld bzw. Objekt.

Auf dem iPhone steht die Hauptnavigation unten, am Desktop links. Hell-/Dunkelmodus, Tastaturbedienung und Sicherheitsabstände bleiben unterstützt. Screenshots und Details: [App-Bedienung](docs/App-Bedienung.md).

## Start und Tests

Node.js 22 oder neuer:

```sh
npm ci
npm run build
npm run serve
```

Dann `http://127.0.0.1:8790/index.html` öffnen. Zum Bereitstellen den vollständigen Inhalt von `dist/` verwenden. Einzeldatei-Uploads von `index.html` sind nach der Modularisierung nicht mehr ausreichend. Die im Repository enthaltenen Laufzeitdateien können auch direkt statisch bereitgestellt werden.

```sh
npx playwright install chromium webkit
python3 -m pip install python-docx openpyxl pymupdf
npm test
```

Die Python-Bibliotheken öffnen exportierte Office-/PDF-Dateien unabhängig von der Anwendung. Ohne diese Bibliotheken werden die betreffenden Prüfungen als übersprungen angezeigt. `npm run test:unit` prüft den Rechenkern; `npm run test:browser` prüft die vollständigen Browserabläufe. GitHub Actions installiert alle Prüfbibliotheken und baut vor den Tests.

## iOS

```sh
npm run ios:sync
npm run ios:open
```

Das Xcode-Projekt liegt in `ios/App/App.xcodeproj`. Die Hülle verwendet die bestehende Web-Oberfläche und den gleichen Rechenkern; Dateien werden über das native Teilen-Menü ausgegeben. Das lokale Projekt wurde im iPhone-Simulator gebaut und gestartet. Es ist noch keine signierte, auf einem physischen iPhone oder in TestFlight geprüfte Veröffentlichung.

Vorhandene PWA-Daten müssen als Sicherungsdateien exportiert und in der nativen App importiert werden; beide haben getrennte Speicherbereiche. Aufwand und offene Geräteprüfungen: [Verbesserungen und iOS](docs/Verbesserungen-und-iOS.md).

## Struktur

| Pfad | Aufgabe |
|---|---|
| `index.html`, `assets/` | Formular, Layout, lokale Schriftarten |
| `js/kern.js` | DOM-unabhängige Bewertungs- und Finanzierungsfunktionen |
| `js/daten.js`, `js/speicher.js` | Dateiprüfung und atomare Speichermechanik |
| `js/office.js`, `js/pdf.js` | Office-Formate und PDF-Seitenaufteilung |
| `src/` | Fachliche Browsermodule, App-Navigation und native Brücke |
| `src/init.js` | Initialisierung nach dem Laden aller Module |
| `sw.template.js`, `scripts/build.mjs` | vollständig gecachter Build mit Versions-Hash |
| `tests/` | Referenzwerte, Unit- und Browserprüfungen |
| `ios/` | Capacitor-/Swift-Projekt |

## Grenzen

Die Ergebnisse sind rechnerische Preiseinschätzungen und kein Verkehrswertgutachten. Marktparameter und Modellkonformität müssen je Bewertung fachlich geprüft werden. Regelmäßig vollständige Sicherungen außerhalb des Browsers ablegen; beim Löschen von Website- oder App-Daten kann der lokale Bestand verloren gehen.
