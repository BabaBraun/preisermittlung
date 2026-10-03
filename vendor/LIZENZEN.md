# Mitgelieferte Bibliotheken

| Datei | Herkunft | Lizenz |
|---|---|---|
| `html2pdf.bundle.min.js` | html2pdf.js 0.10.1, unverändert von cdnjs (`https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/`), SHA-512 `GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==` | MIT (html2pdf.js, Erik Koopmans). Das Bündel enthält jsPDF (MIT), html2canvas (MIT, Niklas von Hertzen) und Hilfsbibliotheken wie core-js (MIT). |

| `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs` | pdf.js (Mozilla), Paket `pdfjs-dist` 6.4.299, Ausgabe für ältere Browser (`legacy/build/`), unverändert von jsDelivr (`https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/`), heruntergeladen am 03.10.2026 mit Zustimmung von Fabian. SHA-256 (Base64): `vMwk6nEduORFA2KVGZBKUpLXO52qohS7583MKCsPQlk=` bzw. `FF0t06sMhhUQEdupWs+i1TNuKszVk4jqQ9vuDv3arsY=` (stimmen mit den Angaben von jsDelivr überein) | Apache License 2.0, Lizenztext in `pdfjs/LICENSE`. Nur für die Kachel „PDF schwärzen“ (D53); geladen erst beim ersten Öffnen einer PDF, mit `isEvalSupported: false`. |

Die Dateien liegen im Repository, damit PDF-Erstellung und PDF schwärzen auch offline funktionieren (Service-Worker-Cache).
Beim Laden prüft die App den obigen Hash (Subresource Integrity); eine veränderte Datei wird abgelehnt.
Aktualisieren: neue Fassung herunterladen, Hash neu berechnen
(`openssl dgst -sha512 -binary datei | openssl base64 -A`) und in `html2pdfLaden()` sowie hier eintragen.

## Lokal ergänzte Laufzeitdateien (2026-09-30)

- Schriftdateien unter `assets/fonts/`: IBM Plex Sans/Serif (aus @fontsource 5.3.0), SIL Open Font License 1.1; die Lizenztexte stehen bei den Dateien.

## Daten

- `js/sterbetafel.js`: Statistisches Bundesamt (Destatis), Statistischer Bericht – Sterbetafeln
  (Tabellen 12613-b01/-b02), Datenlizenz Deutschland – Namensnennung – Version 2.0
  (<https://www.govdata.de/dl-de/by-2-0>). Nur ins App-Format übertragen, Werte unverändert.

