# ImmoApp

Web-App für Immobilienberater: rechnerische Preisermittlung nach ImmoWertV –
Substanz-(Sachwert-), Ertrags- und Vergleichswertverfahren, Aufnahmebogen für den
Ortstermin, Fotodokumentation und druckfertiger Bericht.

Die App läuft vollständig im Browser. **Alle Eingaben bleiben auf dem Gerät**
(localStorage); es werden keine Daten an einen Server übertragen.

## Aufruf

Als installierbare App (PWA) über GitHub Pages – siehe
[ANLEITUNG-App-aufs-Handy.md](ANLEITUNG-App-aufs-Handy.md).

## Funktionsumfang

- **9 Vordrucke** in drei Kategorien: Eigentumswohnung, Wohnhaus, Gewerbe
- **Sachwert** über NHK 2010 (Anlage 4 ImmoWertV) mit Standardstufen je Bauteil,
  Baupreisindex und Regionalfaktor
- **Restnutzungsdauer** nach Modernisierungspunkten (Anlage 2 ImmoWertV)
- **Ertragswert** mit Mietrolle, Bewirtschaftungskosten nach § 32 und Vervielfältiger
- **Vergleichswert** mit Vergleichsobjekt-Tabelle
- **Belastungen**: Nießbrauch, Wohnungsrecht, Leibrente, Erbbaurecht
- **Wertkorrekturen** nach § 8 Abs. 3 ImmoWertV
- **PV-Anlage** über Barwert des Solarertrags
- Aufnahmebogen, Unterlagen-Checkliste, Sensitivitätsanalyse, Renditekennzahlen
- Bericht mit Deckblatt, Inhaltsverzeichnis, Fotos und Unterschriftsfeld
- Export als PDF, Word und Excel

## Marktdatenbank

Über den Schalter **📊 Marktdaten** in der Kopfzeile: eine eigene Sammlung von
Angebots- und Kaufpreisen als Grundlage für den Vergleichswert und für die
laufende Marktbeobachtung.

- **Erfassen** – 48 Objektmerkmale, Preisverlauf mit Datum, Exposé-PDF als Anhang.
  Der Exposé-Text lässt sich einfügen; ein Parser füllt das Formular vor.
- **Bestand** – filter- und sortierbare Liste, CSV-Export für Excel.
- **Übersicht** – Kennzahlen-Kacheln (Median €/m², Trend, Vermarktungsdauer,
  Reduzierungsquote, eigene Abschlagsquote) und sechs Diagramme: Preisentwicklung
  je Quartal, Ortsvergleich, Flächendegression, Baujahr, Vermarktung, eigene
  Bewertung gegen Markt. Unter fünf Fällen wird keine Aussage ausgewiesen.
- **Vergleich** – sucht zu einem Zielobjekt die ähnlichsten Fälle, leitet einen
  Vergleichspreis ab und übergibt ihn in den Vordruck. Umgekehrt lässt sich ein
  bewertetes Objekt aus der Preisermittlung in die Datenbank übernehmen.
- **Datensicherung** – dauerhafter Speicher, Speicheranzeige, automatische
  Zweitkopie ohne Anhänge, Sicherung als Datei (schlank oder vollständig).

Angebots- und Kaufpreise werden getrennt geführt: Portalpreise sind
Angebotspreise, echte Kaufpreise stammen aus eigenen Vermittlungen. Aus Fällen mit
beidem berechnet die App die eigene Abschlagsquote, mit der sich Angebotspreise
näherungsweise auf Kaufpreisniveau umrechnen lassen.

Die Sammlung liegt in der IndexedDB des jeweiligen Geräts und wird **nicht**
zwischen Geräten synchronisiert – Austausch über die Sicherungsdatei.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | die komplette App (Icons eingebettet) |
| `manifest.webmanifest` | App-Name, Icon, Farben |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `icons/` | App-Icons |
| `Wertermittlung.html` | alte Adresse, leitet auf `index.html` weiter |

## Hinweis

Die Ergebnisse sind eine rechnerische Preiseinschätzung und **kein
Verkehrswertgutachten**. Marktparameter (Baupreisindex, Sachwertfaktor,
Liegenschaftszinssätze) sind vor jeder Ermittlung anhand der Daten des örtlichen
Gutachterausschusses zu prüfen.
