# Architekturentscheidungen — ImmoApp

Kurz begründet, dann weitergearbeitet (siehe Auftrag). Jede Entscheidung mit Datum, damit sie später
nachvollziehbar bleibt, wenn sich die Lage ändert.

---

## D1 (2026-09-23) — Native App: PWA ausbauen, Capacitor vorbereiten statt Neuschreiben

**Frage:** Capacitor, React Native/Expo, SwiftUI oder eine ausgebaute PWA?

**Entscheidung:** Die PWA bleibt die Primärstrategie und wird gezielt um native Fähigkeiten erweitert
(Kamera, GPS, Geräte-Sperre über Face ID/Touch ID, Offline — siehe unten). Ein Capacitor-Grundgerüst wird
vorbereitet, aber nicht fertig gebaut, weil der letzte Schritt (iOS-Plattform hinzufügen, in Xcode öffnen,
auf ein Gerät bringen) zwingend einen Mac mit Xcode voraussetzt — das kann von einer Windows-Umgebung aus
nicht ausgeführt werden. SwiftUI und React Native/Expo werden verworfen.

**Begründung:**
- Die App ist ein gereiftes, aktiv genutztes Single-File-Projekt mit einem fachlich verifizierten
  Rechenkern (ImmoWertV-Verfahren, gegen Excel-Vorlage und ein reales Gutachten geprüft). Eine
  Neuentwicklung in SwiftUI oder React Native würde diesen Rechenkern komplett neu schreiben oder eine
  zweite, parallel zu pflegende Codebasis erzeugen. Für das Ziel „mittelfristig Gutachter werden" ist das
  unverhältnismäßig — jede Stunde in einem Rewrite ist eine Stunde, die nicht in Bewertungsqualität fließt.
- **Capacitor** wäre der richtige Weg, wenn eine echte App-Store-App gebraucht wird: Es verpackt die
  bestehende HTML/CSS/JS-App fast unverändert in eine native Hülle und gibt über eine Brücke Zugriff auf
  native APIs (Kamera, Dateisystem, Push, Biometrie). Der Aufwand ist gering — aber der iOS-Build läuft
  ausschließlich über Xcode/CocoaPods, und die läuft nur auf macOS. Ohne Mac und ohne (mindestens kostenlose)
  Apple-ID zum Signieren ist dieser letzte Schritt von hier aus nicht möglich. Das Grundgerüst (siehe
  CAPACITOR-SETUP.md) liegt bereit, sobald ein Mac verfügbar ist.
- **Was eine PWA auf dem iPhone bereits heute kann, ganz ohne Apple-Developer-Account:** Installation über
  „Zum Home-Bildschirm" mit eigenem Icon und eigenständigem Fenster (bereits umgesetzt), Offline-Betrieb
  über den Service Worker (bereits umgesetzt und verifiziert), Kamerazugriff über ein Datei-Eingabefeld mit
  `capture="environment"` (öffnet direkt die Rückkamera, kein Umweg über die Fotomediathek), Standortabfrage
  über die Geolocation-API, und eine Geräte-Sperre über die WebAuthn-Plattform-Authentifizierung (Face
  ID/Touch ID) — das läuft vollständig lokal im Browser, ganz ohne eigenen Server.

**Grenze, die ehrlich benannt werden muss — echte Push-Benachrichtigungen:** Web Push funktioniert seit
iOS 16.4 auch für zum Home-Bildschirm hinzugefügte Web-Apps, **braucht aber zwingend einen Server**, der die
Push-Nachricht auslöst (VAPID-signierter Aufruf an Apples Push-Dienst) — das App selbst kann sich nicht
selbst anstoßen, wenn sie geschlossen ist. Diese App hat aktuell keinerlei Backend. Echte
Hintergrund-Benachrichtigungen sind deshalb ohne zusätzliche Server-Infrastruktur nicht erreichbar. Statt
eine halbfertige, unzuverlässige Push-Funktion zu bauen (verboten laut Auftrag: „keine Features halb fertig
liegen lassen"), werden Wiedervorlagen/Aufgaben zunächst als **In-App-Liste mit Fällig-/Überfällig-Anzeige**
umgesetzt — funktioniert vollständig offline, ohne Server, zeigt sich beim nächsten Öffnen der App. Echte
Push-Benachrichtigungen bleiben eine dokumentierte spätere Ausbaustufe (z. B. über einen kleinen Cloudflare
Worker als Mini-Backend), wenn der Bedarf entsteht.

---

## D2 (2026-09-23) — Datenhaltung bleibt lokal, kein Server-Sync

**Entscheidung:** Kein Wechsel auf eine Cloud-Datenbank oder einen eigenen Server. Bewertungen und
Marktüberblick bleiben in localStorage/IndexedDB auf dem jeweiligen Gerät.

**Begründung:** Deckt sich mit der DSGVO-Minimierung (keine Kundendaten verlassen das Gerät), erfordert
keinen Betrieb/keine Kosten für ein Backend, und passt zum bisherigen Ansatz. Kehrseite (kein Sync zwischen
Geräten, Verlustrisiko bei defektem Gerät) ist durch die vorhandene Export-/Backup-Funktion bereits
gemildert, wird aber in ROADMAP.md als Komfortlücke vermerkt.

---

## D3 (2026-09-23) — PDF-Erzeugung bleibt html2pdf.js, aber mit Integritätsschutz

**Entscheidung:** Kein Wechsel der PDF-Bibliothek. Der bestehende Ansatz (html2pdf.js vom CDN, Fallback auf
den Browser-Druckdialog wenn offline) bleibt, wird aber um einen Subresource-Integrity-Hash ergänzt.

**Begründung:** Die Bibliothek funktioniert, ein Wechsel wäre Aufwand ohne erkennbaren Nutzen für den
Berater. Der fehlende Integritätsschutz ist dagegen eine kleine, konkrete Sicherheitslücke (siehe AUDIT.md
Abschnitt 4) und wird als Quick Win behoben.

---

## D4 (2026-09-23) — Keine Namen in der Marktdatenbank bleibt verbindlicher Grundsatz

**Entscheidung:** Die bereits gelebte Praxis (keine Käufer-/Verkäufernamen im Marktüberblick) wird als
festes Prinzip fortgeschrieben, nicht nur als Zufall des aktuellen Feldschemas. Neue Felder werden daraufhin
geprüft, bevor sie ergänzt werden.

**Begründung:** Der Marktüberblick lebt von Masse an Objektdaten, nicht von Personenbezug — die
Kaufpreissammlung eines Gutachterausschusses macht es genauso. Personenbezogene Daten wären hier ein
unnötiges DSGVO-Risiko ohne fachlichen Mehrwert.

---

## D5 (2026-09-23) — App-Sperre über WebAuthn (Face ID/Touch ID) als lokales Gerätegate

**Entscheidung:** Eine optionale App-Sperre wird ergänzt, die die Plattform-Biometrie (Face ID, Touch ID,
Windows Hello, Android-Fingerabdruck) über die WebAuthn-API nutzt, um die App zu entsperren.

**Begründung/Grenzen:** Das ist **kein** echtes Server-Auth (es gibt keinen Server, der etwas verifiziert)
und auch keine eigene kryptografische Signaturprüfung im Code — implementiert ist der Standard-Ablauf
`navigator.credentials.create()`/`.get()` mit `userVerification:'required'`. Eine erfolgreich aufgelöste
`get()`-Anfrage beweist, dass Betriebssystem und Browser auf diesem Gerät gerade eine Face-ID-/Touch-ID-/
Gerätecode-Prüfung verlangt und bestanden haben — die App vertraut dieser Plattform-Zusicherung, statt selbst
eine COSE-Public-Key-Signatur zu verifizieren (das würde einen CBOR-Parser erfordern und stünde in keinem
Verhältnis zum Sicherheitsgewinn, da ohne Server ohnehin kein unabhängiger zweiter Prüfpfad existiert). Das
schützt zuverlässig vor einem kurzen Blick auf das offen herumliegende Handy (die App zeigt bis zur
erfolgreichen Prüfung nichts an und blockiert auch die Bedienung), schützt aber nicht vor jemandem mit
direktem technischen Zugriff auf den Browserspeicher (z. B. über die Entwicklertools). **Bewusst kein
Wiederherstellungscode:** Funktioniert die Biometrie auf diesem Gerät später nicht mehr, ist der einzige
Weg zurück das Löschen der Website-Daten (Datenverlust, wenn keine Sicherung vorliegt) — ein Recovery-Code
wäre entweder eine Sicherheitslücke (Umgehung der Sperre) oder unverhältnismäßiger Aufwand für ein rein
lokales Gate; die Einrichtung weist deshalb ausdrücklich darauf hin, vorher eine Sicherung anzulegen. Eine
vollständige Verschlüsselung der IndexedDB-Inhalte wäre der nächste, deutlich aufwendigere Schritt und wird
in der Roadmap als spätere Ausbaustufe vermerkt, nicht jetzt umgesetzt.

---

## D6 (2026-09-29) — Grundrisse: Claude liest das Bild, die App zeichnet aus einem Datenformat

**Entscheidung:** Die App erkennt Grundrisse nicht selbst. Den fotografierten Plan liest Claude außerhalb der
App (claude.ai-Projekt, Claude-App am Handy oder Claude Code am PC) nach `GRUNDRISS-ANLEITUNG.md` und gibt
einen JSON-Code aus. Die App liest diesen Code, zeichnet daraus den Plan als SVG in vier Darstellungen und
übernimmt die Räume in die Raumliste. Gespeichert wird der Code des Geschosses, nicht die Zeichnung.

**Begründung:** Eine Bilderkennung in der App bräuchte entweder einen Server mit KI-Zugang (widerspricht D2,
dazu ein API-Schlüssel, der in einer öffentlichen App nicht sicher abzulegen ist) oder eine Erkennung im
Browser, die Maßzahlen und Wände aus Fotos nicht verlässlich genug liest. Das Datenformat trennt die zwei
Aufgaben sauber: Lesen (fehleranfällig, braucht Rückfragen und Prüfsummen) und Zeichnen (deterministisch,
prüfbar). Weil die Zeichnung erst beim Anzeigen entsteht, lassen sich alle vier Darstellungen aus denselben
Daten erzeugen, Korrekturen laufen über den Code, und der Plan ist wenige KB groß statt eines Bildes.

**Grenzen:** Genau wird der Plan nur so weit, wie die Maße im Original stehen. Ohne Maße ist er
proportional und wird als „nicht maßstäblich“ gekennzeichnet, bis ein bekanntes Maß eingetragen ist.
Die Raumliste übernimmt auf Wunsch des Nutzers die Fläche laut Plan; die aus den Maßen berechnete Fläche
dient als Kontrolle (Markierung ab 3 % Abweichung). Das Foto geht an Anthropic — deshalb der Hinweis, den
Plankopf mit Eigentümer und Adresse abzudecken.

---

## D7 (2026-09-29) — Projekte und Fotos in die IndexedDB

**Entscheidung:** Gesicherte Projekte (samt Fotos) und die Fotos der laufenden Bewertung liegen in der
IndexedDB `ia_bewertungen`. Im localStorage bleibt nur der kleine Arbeitsstand (Felder, Grundrisse,
Unterschrift) mit dem Merker `fotosInDb`. Beim ersten Start übernimmt die App den Altbestand und löscht den
alten Schlüssel erst, nachdem sie geprüft hat, dass jedes Projekt in der Datenbank angekommen ist.

**Begründung:** Der localStorage fasst auf dem iPhone rund 5 MB. Nach zwei, drei Objekten mit
Fotodokumentation schlug das Sichern fehl, und die automatische Zwischenspeicherung ließ die Fotos
stillschweigend weg. Die IndexedDB hat um Größenordnungen mehr Platz, trägt `navigator.storage.persist()`
und wird vom Marktüberblick bereits genutzt (D2 bleibt gewahrt: alles lokal, kein Server).

**Umsetzung und Grenzen:** Die Projektliste ohne Fotos liegt zusätzlich im Arbeitsspeicher, damit
Startseite und Suche synchron lesen können; Fotos werden erst beim Öffnen geholt. Fotos der laufenden
Bewertung werden gebündelt (400 ms) und beim Wechsel in den Hintergrund sofort geschrieben. Schlägt ein
Schreibvorgang fehl, erscheint ein roter Hinweis mit „Als Datei sichern“ — es gibt keinen stillen Verlust
mehr. Ohne IndexedDB (manche privaten Fenster) arbeitet die App wie vorher mit dem localStorage weiter und
übernimmt diesen Bestand beim nächsten Start mit Datenbank. Die Datenbank verschwindet weiterhin, wenn die
App vom Home-Bildschirm gelöscht wird; dafür gibt es die Gesamtsicherung aller Projekte als Datei mit
Erinnerung auf der Startseite (nach 14 Tagen bzw. wenn seitdem Projekte geändert wurden).

---

## D8 (2026-09-29) — Kundenakte: personenbezogene Daten nur lokal, mit Auskunft und Löschung

**Entscheidung:** Die Kundenakte speichert Kunden (Stammdaten, Rechtsgrundlage, Löschprüfdatum,
Gesprächsnotizen, abgelegte Finanzierungsrechnungen) im Speicher `kunden` der IndexedDB
`ia_bewertungen` (Version 2). Bewertungen verweisen über das versteckte Feld `ek_kunde_id` auf den Kunden,
Wiedervorlagen über `kundeId`. Kundennamen gelangen nie in den Marktüberblick (D4 bleibt).

**Begründung:** Die App wird im Beratungsalltag für Kunden genutzt; ohne Akte landen dieselben Daten
verstreut im Auftraggeberfeld, in Aufgabentexten und Notizzetteln — schlechter geschützt und nicht löschbar.
Eine Akte bündelt sie und macht die DSGVO-Pflichten handhabbar: Rechtsgrundlage je Kunde (Art. 6 Abs. 1
lit. a oder b), Löschprüfdatum mit Markierung in der Liste (Speicherbegrenzung), Auskunft als lesbare
Textdatei (Art. 15), vollständige Löschung je Kunde (Art. 17). Hinweis auf die App-Sperre, sobald
Kunden gespeichert sind.

**Umsetzung und Grenzen:** Beim Löschen eines Kunden bleiben zugeordnete Bewertungen erhalten, nur die
Zuordnung wird gelöst; seine Wiedervorlagen werden auf Nachfrage gelöscht oder ohne Kundenbezug behalten.
Die Gesamtsicherung enthält Kunden und Wiedervorlagen (Dateiversion 2). Das Datenbank-Upgrade von
Version 1 auf 2 wartet, statt abzubrechen, wenn ein älteres Fenster die Datenbank noch offen hält — ein
Abbruch hätte die App auf den leeren localStorage zurückfallen lassen. Ohne IndexedDB (manche privaten
Fenster) ist die Kundenakte nicht verfügbar; die App sagt das, statt Kundendaten ungeschützter abzulegen.

---

## D9 (2026-09-29) — Marktdaten des Gutachterausschusses: Struktur ja, vorbelegte Werte nein

**Entscheidung:** Sachwertfaktoren und Liegenschaftszinssätze werden je Immobilienmarktbericht als Datensatz
mit Quelle, Stand, Gebiet und Modell (NHK, Gesamtnutzungsdauer, Restnutzungsdauer, Alterswertminderung)
gepflegt. Die App gibt keine Werte vor. Jede Bewertung merkt sich den verwendeten Satz und je Ansatz die
Quelle; der Bericht weist beides im Abschnitt „Datengrundlagen und Modellkonformität“ aus.

**Begründung:** Zuständig für Abstatt, Beilstein und Ilsfeld ist der Gemeinsame Gutachterausschuss
südwestlicher Landkreis Heilbronn (Geschäftsstelle Eppingen). Er stellt online nur die Bodenrichtwerte
bereit; einen frei verfügbaren Marktbericht mit Sachwertfaktoren und Liegenschaftszinsen gab es bei der
Recherche nicht. Werte aus anderen Berichten (etwa Stadt Heilbronn) zu übernehmen wäre fachlich falsch.
Nach § 10 ImmoWertV dürfen die Daten zudem nur im Modell ihrer Ableitung angewendet werden — deshalb
vergleicht die App das Modell des Satzes mit der Bewertung und warnt bei Abweichungen.

**Umsetzung:** Datensätze im localStorage (`ia_parameter`), teilbar als Datei für Kolleginnen und Kollegen
und Teil der Gesamtsicherung. Die Abfrage des Sachwertfaktors wählt die Zeile, in deren Spanne der
vorläufige Sachwert fällt; liegt er außerhalb, die nächste Klasse mit Hinweis.

---

## D10 (2026-09-30) — Module ohne Build-Schritt, Tests mit Node und Playwright

**Entscheidung:** Rechenkern (`js/kern.js`), Speicherschicht (`js/speicher.js`), Prüfung von Sicherungsdateien
(`js/daten.js`), Office-Export (`js/office.js`) und PDF-Seitenaufteilung (`js/pdf.js`) liegen als eigene
Dateien neben `index.html`. Es sind klassische Skripte (kein ES-Modul, kein Bundler): Sie hängen ein Objekt an
`globalThis` (`ImmoKern`, `ImmoSpeicher`, …) und exportieren dasselbe per `module.exports` für Node. Die
Oberfläche bleibt in `index.html`.

**Begründung:** Die Bereitstellung als statische PWA (GitHub Pages, keine Installation, kein Build) bleibt
unverändert; der Service Worker cacht die zusätzlichen Dateien. ES-Module hätten den Start über `file://`
verhindert und einen Build nahegelegt. Der Rechenkern liest keine Seitenelemente mehr, sondern bekommt einen
Eingabe-Leser `{n, v, an}` — damit ist er in Node ohne Browser prüfbar. Die frühere Anforderung „läuft als
einzelne hochgeladene Datei“ (Netlify Drop) gilt nicht mehr, seit die App auf GitHub Pages liegt.

**Absicherung des Umbaus:** Vor dem Umbau wurden zehn synthetische Bewertungen im Browser gerechnet und alle
Zahlen aus `window._R` sowie alle angezeigten Ergebnisse festgehalten (`tests/fixtures/golden.json`). Der
Umbau war ergebnisgleich; jede spätere Abweichung ist in `tests/fixtures/golden-aenderungen.md` mit Quelle
und Vorher/Nachher begründet.

---

## D11 (2026-09-30) — Word und Excel als echte Office-Dateien, selbst erzeugt

**Entscheidung:** `.docx` und `.xlsx` werden in `js/office.js` direkt als Office Open XML geschrieben,
einschließlich des ZIP-Containers (Einträge unkomprimiert). Keine fremde Bibliothek.

**Begründung:** Die bisherigen Exporte waren HTML-Dateien mit `.doc`/`.xls`-Endung (Office warnt beim Öffnen,
Excel speicherte Zahlen als Text, Werte wurden unmaskiert eingesetzt). Bibliotheken wie `docx` oder SheetJS
wären mehrere hundert Kilobyte groß und für den kleinen Funktionsumfang (Überschriften, Absätze, Tabellen,
Bilder; Zellen mit Zahlenformat) nicht nötig. Die erzeugten Dateien werden in den Tests mit python-docx,
openpyxl und zipfile geöffnet und wurden zusätzlich manuell in Word, Excel und LibreOffice geprüft.

---

## D12 (2026-09-30) — PDF: html2pdf lokal, Seitenumbrüche selbst gesetzt

**Entscheidung:** html2pdf 0.10.1 liegt unverändert in `vendor/` (Integritäts-Hash wie zuvor beim CDN, das
nur noch als Rückfall dient) und im Service-Worker-Cache. Die Seitenumbrüche setzt `js/pdf.js` selbst;
html2pdfs eigene Umbruchlogik ist abgeschaltet.

**Begründung:** Offline war bisher kein PDF möglich. html2pdfs Umbruchlogik misst relativ zum Fenster, kennt
keine Raster und rechnet mit der Breite des Berichts statt der des gerenderten Containers — Grundriss und
Fotos wurden zerschnitten, Präsentationsfolien verrutschten. Die eigene Aufteilung misst im Container von
html2pdf, hält Überschriften bei ihrem Block, teilt Fotoraster in Zeilen und lange Texte in Absätze und
setzt jede Folie auf genau eine Seite. Die Druckansicht des Browsers (echter Text, durchsuchbar) bleibt der
empfohlene Weg für das Bewertungsdokument; der PDF-Download ist ein Bild-PDF.

---

## D13 (2026-09-30) — Keine Preisempfehlung aus ungültigen oder fehlenden Angaben

**Entscheidung:** `ImmoKern.pruefen()` prüft jedes Feld, das die Rechnung gelesen hat, und die Mindestangaben.
Bei Fehlern oder fehlenden Angaben zeigen Seitenleiste, Handyleiste und Abschnitt ⑨ „–“ mit Begründung;
der Bericht erscheint mit Entwurfshinweis und weist den Wert als „Entwurf“ aus. Die Rechnung selbst läuft
unverändert weiter (wichtig für Zwischenstände).

**Begründung:** Vorher zeigte ein leeres Formular 25.875 €, „abc“ wurde still als 0 gerechnet, negative
Bodenrichtwerte liefen durch. Ein Wert, der plausibel aussieht, aber auf ungültigen Eingaben beruht, ist
gefährlicher als gar keiner.

---

## D14 (2026-09-30) — Restnutzungsdauer jenseits der Gesamtnutzungsdauer: Hinweis statt Formeländerung

**Entscheidung:** Die Formel der Anlage 2 ImmoWertV bleibt unverändert, auch wenn das Alter die
Gesamtnutzungsdauer übersteigt. Die Eingabeprüfung meldet diesen Fall (bei einem Ergebnis über 70 % der
GND als kritisch) und empfiehlt, die Restnutzungsdauer sachverständig zu prüfen und von Hand einzutragen.

**Begründung:** Die Formel steigt jenseits ihres Scheitels wieder an; die Anlage 2 regelt diesen Bereich nicht
ausdrücklich, und ein reales Gutachten (Referenz ALEX99) wendet sie dort an. Ein Eingriff wäre nicht
nachgewiesen gewesen. Anders beim Gebäudealter: § 4 Abs. 1 ImmoWertV bezieht es eindeutig auf das
Stichtagsjahr — das wurde korrigiert (siehe `tests/fixtures/golden-aenderungen.md`).

---

## D15 (2026-09-30) — Liegenschaftsverwaltung als eigenes Modul mit eigener Datenbank

**Entscheidung:** Die Verwaltung (Kachel „Liegenschaftsverwaltung“) hat einen eigenen Rechenkern ohne DOM
(`js/verwaltung.js`, `ImmoVerwaltung`), eine eigene Oberfläche (`js/verwaltung-ui.js`) und eine eigene
IndexedDB `ia_verwaltung` (ein Dokument je Liegenschaft mit Einheiten, Verträgen, Zahlungen und Mahnungen).
Fachliche Regeln:
- Fälligkeit am dritten Werktag (§ 556b Abs. 1 BGB); der Samstag zählt dabei nicht (BGH VIII ZR 129/09),
  Feiertage nach dem Feiertagsgesetz Baden-Württemberg.
- Sollstellung je Monat, anteilig nur bei Beginn, Ende oder Änderung innerhalb des Monats (Kalendertage).
- Zahlungen zuerst auf den bestimmten Monat, sonst auf die älteste Schuld (§ 366 BGB); Rücklastschriften als
  neue Forderung am Buchungstag, Gutschriften wie Zahlungen.
- Verzugszinsen mit dem jeweils gültigen Basiszins (Tabelle der Bundesbank, je Liegenschaft ergänzbar),
  + 5 Pp. bei Wohnraum, + 9 Pp. bei Gewerbe (§ 288 BGB).
- Kündigungsschwelle (§ 543 Abs. 2 Nr. 3, § 569 Abs. 3 Nr. 1 BGB) und Kaution über drei Nettokaltmieten
  (§ 551 BGB) nur als Hinweis „prüfen“, nie als Rechtsfolge.

**Begründung:** Getrennte Datenbank, damit ein Fehler oder ein voller Speicher in der Verwaltung Bewertungen
und Kundenakte nicht berührt und die Sicherung einzeln möglich ist. Ein Dokument je Liegenschaft hält
Änderungen atomar (eine Transaktion) und die Sicherung einfach; bei den erwarteten Mengen (einige Tausend
Zahlungen je Objekt) ist das schnell genug. Der Rechenkern ist gegen eine unabhängige Python-Rechnung
(`tests/referenz/verwaltung_sollwerte.py`) auf den Cent geprüft.

---

## D16 (2026-09-30) — Betriebs- und Heizkostenabrechnung: Regeln und Vereinfachungen

**Entscheidung:** `js/verwaltung-nk.js` (`ImmoNebenkosten`) rechnet die Abrechnung aus den erfassten Kosten und
gespeicherten Einstellungen jedes Mal neu; erst „Zustellung vermerken und buchen“ schreibt Nachzahlung bzw.
Guthaben ins Mietkonto und passt die Vorauszahlungen an (§ 560 Abs. 4 BGB) — mit vollständiger Rücknahme.
- Kosten mit Leistungszeitraum (z. B. Versicherungsjahr) werden tagesgenau auf den Abrechnungszeitraum
  abgegrenzt; innerhalb des Zeitraums wird nach Nutzungstagen verteilt, Leerstand trägt der Vermieter.
- Umlage nach Personen: leere Einheiten zählen mit einer einstellbaren Personenzahl (Vorgabe 1), damit der
  Leerstand nicht auf die Mieter abgewälzt wird.
- Heizung/Warmwasser: selbst nach HeizkostenV verteilen oder die Beträge des Messdienstes übernehmen. Beim
  eigenen Verteilen gibt es keine Zwischenablesung; bei Mieterwechsel gilt § 9b Abs. 3 (Heizung nach
  Gradtagszahlen oder zeitanteilig, Warmwasser zeitanteilig) — mit Hinweis in der Abrechnung.
- CO2-Kosten: Einstufung nach der Anlage zum CO2KostAufG (Nichtwohngebäude 50 %), Anteil je Mieter wie seine
  Heiz- und Warmwasserkosten.
- Vorauszahlungen: vereinbarte (Soll) als Vorgabe, Rückstände bleiben im Mietkonto; wahlweise tatsächlich
  gezahlte (Ist).
- Rundung auf Cent je Mieter und Position; die Rundungsdifferenz wird in der Kontrolle ausgewiesen.

**Begründung:** Die Rechnung bleibt nachvollziehbar und jederzeit korrigierbar, solange nicht gebucht ist; die
Buchung ist der bewusste Schritt „Abrechnung ist raus“. Die Vereinfachungen (keine Zwischenablesung, fiktive
Person bei Leerstand) sind in der Abrechnung sichtbar und bei Messdienst-Abrechnungen nicht nötig. Der Kern
ist gegen eine unabhängige Python-Rechnung (Tag-für-Tag-Belegung, exakte Brüche) auf den Cent geprüft.

---

## D17 (2026-09-30) — Instandhaltung und Prüfpflichten: Katalog als Richtwert, Kosten aus Vorgängen

**Entscheidung:** `js/verwaltung-ih.js` (`ImmoInstandhaltung`) führt Vorgänge (gemeldet → beauftragt → in Arbeit →
erledigt → abgerechnet) mit Verlauf, Fotos und Dienstleister sowie Pflichten mit Turnus und letzter Erledigung.
- Der Pflichtenkatalog nennt je Eintrag Rechtsgrundlage, „Pflicht“ oder „Empfehlung“ und den üblichen Turnus
  (u. a. LBO BW § 15 Abs. 7 Rauchwarnmelder, § 31 TrinkwV Legionellen, BetrSichV Aufzug, SchfHwG, AwSV, GEG).
  Er wird nicht automatisch angewendet — der Nutzer übernimmt, was für die Liegenschaft zutrifft.
- Pflichten ohne eingetragene letzte Erledigung erscheinen sofort als Frist („letzte Erledigung eintragen“).
- Abgerechnete Vorgänge erscheinen automatisch in den Kosten der Liegenschaft (Instandhaltung nicht umlagefähig,
  Wartung wahlweise als vereinbarte Betriebskostenart), mit Arbeitskosten nach § 35a Abs. 3 EStG; beim
  Zurücksetzen oder Löschen des Vorgangs verschwinden sie wieder.
- Dienstleister gelten für alle Liegenschaften; Fotos liegen als Anhänge in der Datenbank der Verwaltung.

**Begründung:** Prüfpflichten hängen von Anlage, Größe, Nutzung und Bescheiden ab (z. B. Legionellen nur bei
Großanlagen, Heizöltank nach Größe und Schutzgebiet); ein automatisch angelegter Katalog würde falsche Fristen
erzeugen. Die Verknüpfung Vorgang → Kosten vermeidet doppelte Erfassung und hält die Nebenkostenabrechnung
und die Eigentümerauswertung konsistent.

---

## D18 (2026-09-30) — WEG-Verwaltung: Hausgeld über dieselbe Kontoführung, Stimmrecht nach Gesetz

**Entscheidung:** `js/verwaltung-weg.js` (`ImmoWeg`) mit Reiter „WEG“ (nur bei Liegenschaften der Art WEG):
- Eigentümer je Einheit mit „seit“-Datum; Miteigentümer tragen dasselbe Datum, ein späterer Eintrag ist ein
  Eigentümerwechsel. Einzelwirtschaftsplan und Abstimmung nehmen den Eigentümer zum jeweiligen Tag.
- Hausgeld aus dem beschlossenen Wirtschaftsplan (Fortgeltung nur mit Beschluss), fällig am 3. Werktag,
  Sonderumlagen und gebuchte Abrechnungsspitzen — alles über dieselbe Kontoführung wie das Mietkonto
  (`ImmoVerwaltung.kontoFuehren`: § 366 BGB, Verzugszinsen).
- Jahresabrechnung: Kostenanteil nach MEA oder abweichendem Schlüssel, Heizkosten je Einheit laut Messdienst,
  Kosten aus der Erhaltungsrücklage nicht umgelegt; Abrechnungsspitze = Kostenanteil + Soll-Zuführung −
  Soll-Vorschüsse (§ 28 Abs. 2 WEG); Vermögensbericht (§ 28 Abs. 4 WEG).
- Abstimmung: Kopfprinzip als gesetzliche Regel (§ 25 Abs. 2 WEG), Wert- oder Objektprinzip wählbar;
  Enthaltungen zählen nicht; widersprüchliche Stimmen desselben Eigentümers werden nicht gewertet;
  bauliche Veränderung nach § 21 Abs. 2 Nr. 1 WEG. Einladungsfrist drei Wochen (§ 24 Abs. 4 WEG).
- Beschluss-Sammlung fortlaufend nummeriert mit Vermerken (§ 24 Abs. 7 WEG).

**Begründung:** Eine gemeinsame Kontoführung vermeidet zwei unterschiedliche Zuordnungsregeln für Miete und
Hausgeld. Der Kern ist gegen eine unabhängige Python-Rechnung geprüft (Einzelpläne, Jahresabrechnung,
Rücklage, Rückstände, fünf Abstimmungen einschließlich Kopfprinzip mit mehreren Einheiten und Widerspruch).

---

## D19 (2026-09-30) — Übernahme aus dem Fork maxschlecht2000-code/preisermittlung (ohne iOS-App)

**Entscheidung:** Aus dem Fork von Henry (github.com/maxschlecht2000-code/preisermittlung) übernommen, nach
Durchsicht des Codes (keine fremden Netzwerkziele, nur synthetische Testdaten) und Prüfung der Rechtsgrundlagen:
- **Beleihungswert nach BelWertV** (`js/modell.js`): Ertragswert als regulärer Ausgangswert, Sachwert als
  Kontrolle (§ 4); mindestens 15 % Bewirtschaftungskosten mit den Einzelansätzen der Anlage 1 (§ 11);
  Mindest-Kapitalisierungszins je Nutzungsart mit Aufschlägen der Anlage 3 (§ 12); Sicherheitsabschlag
  mindestens 10 %, Außenanlagen und Baunebenkosten begrenzt (§ 16). Fehlende Grundlagen bleiben „Entwurf“.
- **Rechenfehler:** Barwertfaktor mit `expm1`/`log1p` (stabil bei Zinsen nahe 0); `restNach(0)` ist die
  Darlehenssumme zu Beginn statt der Restschuld am Planende.
- **PV und energetischer Zustand nicht doppelt:** Ist der Vorteil/Nachteil bereits im Grundwert enthalten,
  wird er nicht nochmals addiert/abgezogen; Energiekosten-Barwerte nur als getrenntes Szenario.
- **Quellenpflicht:** Gewichtung, Sachwertfaktor, Liegenschaftszins, Miete, Bewirtschaftung, PV, Energetik
  und Rechte brauchen eine dokumentierte Quelle; fehlende Angaben ändern den sichtbaren Prüfstatus.
- **Umbau in Module:** Oberfläche aus `index.html` in `src/*.js` (28 Module, `src/init.js` zuletzt), Styles in
  `assets/`, Schriften IBM Plex lokal (OFL), App-Navigation Übersicht/Objekte/Markt/Mehr.
- **Service Worker aus dem Inhalt:** `npm run build` erzeugt `sw.js` mit Inhalts-Hash als Version und
  vollständiger Dateiliste; GitHub Actions prüft, dass `sw.js` zum Inhalt passt (ROADMAP #41).

**Nicht übernommen:** die native iOS-App (Capacitor, Xcode-Projekt, native Brücke, iOS-Workflow) — Wunsch des
Auftraggebers; die App bleibt eine reine PWA ohne App-Store und ohne Backend. Ebenfalls nicht übernommen:
Überarbeitungen von README, AUDIT, SUMMARY, DECISIONS und ANLEITUNG, die iOS-Inhalte an die Stelle der
bisherigen Dokumentation gesetzt hätten. Die Regel „keine Lebenserwartung aus dem Alter“ des Forks ist durch
D20 ersetzt.

**Anpassungen bei der Übernahme:** Liegenschaftsverwaltung (D15–D18) in die neue Navigation eingehängt (Kachel,
„Mehr“-Menü, Fristen-Hinweis); Build-Hash mit einheitlichen Zeilenenden (Windows und Linux ergeben dieselbe
Version); der Service Worker lädt beim Installieren am HTTP-Cache vorbei (`cache: 'reload'`), sonst konnte
GitHub Pages bis zu zehn Minuten alte Dateien in eine neue Version mischen.

---

## D20 (2026-09-30) — Nießbrauch, Wohnungsrecht, Leibrente: amtliche Sterbetafel oder eigene Laufzeit

**Entscheidung:** Auswahl „Laufzeit des Rechts“:
- **Amtliche Sterbetafel (lebenslang)** — Standard. Fernere Lebenserwartung und Leibrentenbarwertfaktor aus der
  Periodensterbetafel für Deutschland des Statistischen Bundesamts (derzeit 2023/2025, `js/sterbetafel.js`),
  nach Alter (vollendete Jahre) und Geschlecht. Faktor monatlich vorschüssig:
  ä(12)x ≈ ax + 13/24 mit ax = Σ v^t · l(x+t)/l(x) (Woolhouse); über 100 Jahre mit der
  Überlebenswahrscheinlichkeit des Alters 100 fortgesetzt.
- **Eigene Laufzeit in Jahren** — für befristete Rechte oder eine belegte abweichende Laufzeit; Zeitrente
  (Barwertfaktor). Dann ist eine Quelle Pflicht.
- Ein eingetragener Kapitalisierungsfaktor hat immer Vorrang (Quelle Pflicht).
- Ältere Bewertungen mit eingetragener Laufzeit werden beim Laden auf „Eigene Laufzeit“ gestellt und rechnen
  unverändert.

**Aktualisierung:** `scripts/sterbetafel.py` sucht auf destatis.de die neueste Ausgabe des Statistischen
Berichts „Sterbetafeln“, prüft sie (lx fallend ab 100.000, ex plausibel, Frauen > Männer) und ersetzt die
Tafel nur bei neuerem Zeitraum. Die GitHub-Action „Sterbetafel“ läuft monatlich, baut den Service Worker neu,
führt alle Tests aus und übernimmt die neue Tafel nur bei grünen Tests. Datenlizenz Deutschland –
Namensnennung – Version 2.0; die Quelle steht im Bericht.

**Begründung:** Die Periodensterbetafel ist die übliche amtliche Grundlage für Leibrenten- und
Nießbrauchsbarwerte in der Verkehrswertermittlung; eine selbst geschätzte Lebenserwartung (wie in der früheren
Näherung) ist nicht belegbar, eine Pflicht zur freien Eingabe (wie im Fork) für lebenslange Rechte unnötig
aufwendig. Die Sterbetafel des Statistischen Bundesamts ist kein Kapitalisierungszins: der Zins bleibt eine
eigene, belegte Eingabe (i. d. R. der Liegenschaftszins). Der Kern ist gegen eine unabhängige Rechnung mit
Kommutationszahlen in Python geprüft (64 Fälle, Abweichung < 1e-9). Die Sollwerte der Tests werden aus der
jeweils geladenen Tafel berechnet, damit eine neue Ausgabe die Tests nicht bricht.

---

## D21 (2026-09-30) — Liegenschaftsverwaltung Stufe 5: Miete sichtbar, Mieterhöhung, Kontoauszug, Jahresbericht, Dokumente

**Miete sichtbar (Rückmeldung des Auftraggebers):** Die Miete stand bisher nur im Vertrag. Jetzt: Mietaufstellung im
Überblick jeder Liegenschaft, Miete und €/m² in der Einheitenliste, „Vermieten“ für leere Einheiten und beim Anlegen
einer Liegenschaft optional gleich Einheit, Mieter und Miete (nur vollständig: Mieter, Beginn, Kaltmiete).

**Mieterhöhung (`js/verwaltung-mh.js`):** Wortlaut §§ 557a, 557b, 558, 558a, 558b, 559, 559a, 559b, 559c, 559e BGB
geprüft (gesetze-im-internet.de, 30.09.2026). Auslegungen: Jahressperrfrist auch ab Mietbeginn; bei zu frühem
Wirksamwerden (15 Monate) verschiebt sich der Termin; Ausgangsmiete der Kappungsgrenze ist die Miete drei Jahre vor
dem Wirksamwerden, Modernisierungserhöhungen in diesem Zeitraum kommen hinzu; Indexanpassung auf die Miete der
letzten Anpassung, spätere Modernisierungserhöhungen bleiben als fester Betrag. Kappungsgrenze 15 % für die 130
Gemeinden der KappVO BW vom 16.12.2025 (GBl. 2025 Nr. 145, gültig 01.01.–31.12.2026; im Gesetzblatt geprüft,
Heilbronn ja, Ilsfeld/Beilstein/Abstatt nein); außerhalb BW oder nach Ablauf über das Häkchen in den Stammdaten.
Eintragen erst nach Zustimmung (§ 558) bzw. Zugang (§§ 557b, 559).

**Kontoauszug (`js/verwaltung-bank.js`):** CAMT (ISO 20022, eigener kleiner XML-Leser, damit er auch in Node testbar
ist) und CSV mit Spaltenerkennung. Nur gebuchte Umsätze; Sammelbuchungen einzeln. Vorschläge nur, wenn eindeutig
(Punkte aus IBAN früherer Buchungen, Name, Einheit, Betrag); gebucht wird nur, was bestätigt ist. Kennung gegen
Doppelbuchungen; die IBAN des Zahlers wird an der Zahlung gespeichert, um sie wiederzuerkennen.

**Kontoführung korrigiert:** Eine Zahlung wird nicht mehr auf eine Rücklastschrift angerechnet, die erst nach ihr
entsteht (Randfall Rückbuchung nach Vorauszahlung). Vergleichsrechnung angepasst; bisherige Sollwerte unverändert.

**Jahresbericht (`js/verwaltung-bericht.js`):** Zuflussprinzip mit Zehn-Tage-Regel (§ 11 Abs. 1 Satz 2 EStG; Fälligkeit
im Zeitraum nach BFH X R 44/16), Zuordnung über die Kontoführung; Aufteilung im Verhältnis der Sollmiete; Ausgaben
nach Datum. Anlage V ohne Zeilennummern (ändern sich jährlich); AfA und Zinsen ergänzt der Eigentümer.

**Dokumente (`js/verwaltung-dok.js`):** Dateien als Anhang in der Verwaltungsdatenbank (nur lokal, in der Sicherung,
unverschlüsselt), bis 25 MB je Datei, Speicherprüfung vorher. Löschen einer Liegenschaft löscht jetzt auch ihre
Anhänge (vorher blieben Fotos der Instandhaltung zurück — Datenschutz).

**Begründung:** Alles offline und ohne Dienst Dritter; Kern jeweils gegen eine unabhängige Python-Rechnung geprüft
(15 Mieterhöhungsfälle, 5 Jahresberichte) bzw. gegen Beispieldateien (CAMT, drei CSV-Formate).

---

## D22 (2026-09-30) — Bewertung wieder als durchgehende Liste, auf- und zuklappbar

**Rückmeldung des Auftraggebers:** Die Aufteilung aus dem Fork (Objektübersicht, vier Schritte, jeweils nur ein
Abschnitt sichtbar) gefiel weniger als die frühere Darstellung, in der alle Abschnitte untereinander standen.

**Entscheidung:** In einer Bewertung stehen wieder alle Abschnitte untereinander mit Nummer (① … ⑬), links die
Abschnittsliste mit Status, rechts das Ergebnis (am Handy: Leiste oben, Ergebniskarte über der Liste). Neu: jeder
Abschnitt und jeder Block (Unterüberschrift, z. B. „4.4 Lage“) ist auf- und zuklappbar; der Zustand wird je Gerät im
Browserspeicher gemerkt (nur eine Anzeigeeinstellung, keine Daten). Die Hauptnavigation des Forks (Übersicht,
Objekte, Markt, Mehr) bleibt. Formularfelder, Rechenkern und Berichte sind unverändert — der Abgleich aller
Referenzbewertungen (golden.json) ist unverändert grün.

**Nachtrag (2026-09-30):** Die festen Nummern aus früheren Erweiterungen (⑦, ⑦c, ⑦d, ⑦b, ⑦e … bzw. Lücken bei der
Wohnung) passten nicht zur Reihenfolge. Jetzt fortlaufend 1 … N in der angezeigten Reihenfolge, Blöcke N.1 … (neu
berechnet, wenn Abschnitte je nach Vordruck ein- oder ausgeblendet werden); Verweise in Texten nennen den Abschnitt
beim Namen statt mit Nummer. Fehler behoben: Der Titel „Preisansatz nach Vergleichswert“ wurde bei jeder Berechnung
neu geschrieben und verlor dabei Pfeil und Nummer — der Abschnitt ließ sich nicht mehr zuklappen.

