# Mitgelieferte Bibliotheken

| Datei | Herkunft | Lizenz |
|---|---|---|
| `html2pdf.bundle.min.js` | html2pdf.js 0.10.1, unverändert von cdnjs (`https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/`), SHA-512 `GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==` | MIT (html2pdf.js, Erik Koopmans). Das Bündel enthält jsPDF (MIT), html2canvas (MIT, Niklas von Hertzen) und Hilfsbibliotheken wie core-js (MIT). |

Die Datei liegt im Repository, damit die PDF-Erstellung auch offline funktioniert (Service-Worker-Cache).
Beim Laden prüft die App den obigen Hash (Subresource Integrity); eine veränderte Datei wird abgelehnt.
Aktualisieren: neue Fassung herunterladen, Hash neu berechnen
(`openssl dgst -sha512 -binary datei | openssl base64 -A`) und in `html2pdfLaden()` sowie hier eintragen.

## Lokal ergänzte Laufzeitdateien (2026-09-30)

- `native.js`: aus @capacitor/core 8.5.2, @capacitor/filesystem 8.1.3 und @capacitor/share 8.0.2 gebündelt; MIT-Lizenz (Ionic/OutSystems). Lizenztexte liegen zusätzlich in den npm-Paketen.
- Schriftdateien unter `assets/fonts/`: IBM Plex Sans/Serif, SIL Open Font License 1.1, lokal über @fontsource 5.3.0 eingebunden. OFL-Lizenztexte stehen bei den Dateien.
