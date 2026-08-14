# Rechnerische Preisermittlung

Web-App zur rechnerischen Preisermittlung von Immobilien nach ImmoWertV –
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
