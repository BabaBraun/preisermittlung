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

---

## D23 (2026-10-01) — Bewertungen je Liegenschaft, amtlicher Baupreisindex BW, Eigennutzung

**Anlass:** Die Liegenschaften der Bank werden jährlich zum 31.12. rechnerisch bewertet (Excel-Vordrucke, Substanz-
und Ertragsansatz im Mittel). Gewünscht: die Bewertungen bei den Liegenschaften führen und daraus den nächsten
Stichtag mit aktuellem Baupreisindex erstellen.

**Entscheidung:**
- Baupreisindex: Die Quartalswerte des Statistischen Landesamts BW (Statistischer Bericht M I 4 – vj 2/26, Basis
  2021 = 100, Wohn-, Büro- und gewerbliche Betriebsgebäude, ab 2016) liegen in `js/baupreisindex.js`. Maßgeblich ist
  das letzte Quartal, dessen Berichtsmonat nicht nach dem Stichtag liegt; danach „vorläufig“. Umrechnung auf NHK 2010
  = 100 / Jahresdurchschnitt 2010 (1,4164 / 1,4472 / 1,4368 — dieselben Faktoren wie in den Vordrucken der Bank).
  Der Test prüft die Abschrift (Jahresdurchschnitt = Mittel der Quartale). Die Rechnung selbst ist unverändert
  (Index × Faktor wie bisher), es wird nur der Wert vorgeschlagen.
- Bewertungen je Liegenschaft (`l.bewertungen`): Stichtag, Art, Stand (abgeschlossen/Entwurf), Bodenwert, Substanz,
  Ertrag, Ergebnis, Baupreisindex, Quelle, Notiz, optional verknüpfte Bewertung der Preisermittlung. Ergebnisse
  verknüpfter Bewertungen rechnet der Rechenkern aus den gespeicherten Feldern; der PV-Barwert steht wie in den
  Vordrucken der Bank in Substanz und Ertrag. Fortschreibung = Kopie als Entwurf mit neuem Stichtag, amtlichem Index,
  um die vergangenen Jahre verringerter angepasster Restnutzungsdauer und PV-Laufzeit; alles Übrige bleibt und ist zu
  prüfen.
- Einheiten in Eigennutzung (`eigennutzung`) zählen weder als Leerstand noch als entgangene Miete (auch in der
  Python-Gegenrechnung); ohne Markierung bleibt alles wie bisher.

**Datenschutz:** Echte Bewertungen der Bank gehören nicht ins öffentliche Repository. Sie werden über die üblichen
Sicherungsdateien (Projekte, Verwaltung) auf dem Gerät eingespielt; Tests verwenden nur synthetische Werte.

---

## D24 (2026-10-01) — Jahresbewertung als eigener Bereich, Vordruck der Bank änderbar

**Wunsch des Auftraggebers:** Die Bewertungen 2023 und 2024 der Liegenschaften der Bank unter einem eigenen Punkt
einpflegen, so dass die Angaben noch geändert werden können.

**Entscheidung:** Neuer Bereich „Jahresbewertung“ (Ansicht der Liegenschaftsverwaltung, Kachel und Mehr-Menü). Je
Objekt und Stichtag ein Vordruck (`l.bewertungen[].vordruck`) mit allen Eingaben des Excel-Vordrucks; Rechnung in
`js/jahresbewertung.js` exakt nach dem Excel-Rechenweg einschließlich seiner Rundungen (nicht nach dem Rechenkern
der Preisermittlung, der ohne diese Rundungen und mit einer gemeinsamen RND rechnet). Abgleich: alle 13 Excel-Dateien
der Bank auf den Cent (lokal geprüft, Daten nicht im Repository; der Summenfehler einer Datei wird richtig gerechnet).
Im Repository prüft eine unabhängige Python-Rechnung (Dezimalarithmetik) vier synthetische Fälle.
Ergebnisse des Vordrucks werden beim Speichern in die Felder der Bewertung übernommen (Verlauf, Fristen, Rendite).

**Datenschutz:** Die echten Vordrucke kommen über eine Sicherungsdatei der Verwaltung auf das Gerät; Mieter- und
Mitarbeiternamen aus den Excel-Dateien werden nicht übernommen.

---

## D25 (2026-10-01) — Vordruck anlegen mit Vorlagen; Formularfehler sichtbar

**Anlass:** Rückmeldung des Auftraggebers: Liegenschaft anlegen „funktioniert nicht“, „Vordruck anlegen“ führt zu nichts,
die Bewertungen 2023/2024 sind nicht zu sehen.

**Befund:** (1) Die Fehlermeldung eines Formulars wurde mit `scrollIntoView({block:'nearest'})` an den oberen Rand
gescrollt und lag damit unter der festen Kopfzeile und den Reitern — am PC wie am iPhone; „Speichern“ wirkte, als
passiere nichts (z. B. ohne Bezeichnung). (2) „Vordruck anlegen“ verlangte eine schon angelegte Liegenschaft; ohne
Liegenschaft blieb nur eine Meldung. (3) Die Bewertungen kommen nur über die Sicherungsdatei auf das Gerät (echte Daten
nicht im Repository); der Weg dorthin war in der Jahresbewertung nicht zu sehen.

**Entscheidung:** Fehler werden oben und über den Knöpfen gezeigt, das erste rot markierte Feld wird unterhalb von
Kopfzeile und Reitern in den sichtbaren Bereich geholt. Ohne Bezeichnung gilt die Anschrift. „Vordruck anlegen“ bietet
Vorlagen wie „Neue Bewertung“ und legt bei Bedarf die Liegenschaft mit an (erst beim Speichern des Vordrucks, als
„Objekt der Bank“). Vorlagen in `js/jahresbewertung.js` (`VORLAGEN`, `vorlage()`): Aufbau, Kostenkennwerte, GND,
Bewirtschaftung und Zins wie in den Excel-Vordrucken der Bank (NHK 2010 Stufen 3–5 amtlich), amtlicher Baupreisindex
zum Stichtag; alle Werte änderbar. „Sicherung einspielen“ steht direkt in der Jahresbewertung und auf der leeren Übersicht.

---

## D26 (2026-10-01) — Vordruck der Jahresbewertung im Aufbau der Excel-Mappe, mit Dokument

**Anlass:** Rückmeldung des Auftraggebers: Der Vordruck in der App stimmt nicht mit den Excel-Preiseinschätzungen überein;
die Bewertung der Liegenschaften soll nach diesem Beispiel als Vordruck in der App folgen.

**Befund (alle 13 Mappen, als Seiten gerendert und Zelle für Zelle gelesen):** Die Mappe ist ein Dokument — Deckblatt,
1. Objektdaten (1.1 Allgemein, 1.2 Grundstück, 1.3 Gebäude bzw. Bebauung, Aufstellung der Mieterträge mit Bemerkung),
2. Bodenrichtwert (Erläuterung, 2.1 Grundstücksmerkmale, Karte und BORIS-Auszug), 3. Bautechnische Daten (3.1–3.4),
4. PV-Anlage (nur wenn vorhanden), Preisansatz Grund und Boden, Bausubstanz (RND und Wertminderung, Gebäudepreis,
Grund und Boden, Gebäude und Außenanlagen, Summe), Mietertrag (RND, Daten, Preisansatz je Gebäude, Summe),
Zusammenfassung / Sonstiges (Überblick, Hinweise, Ort und Datum). Die Nummern verschieben sich ohne PV-Kapitel; ohne
Gebäude folgt auf den Grund und Boden gleich die Zusammenfassung. Die App kannte nur die Zahlen, in eigener Gliederung.

**Entscheidung:** Vordruck und Dokument folgen der Mappe: gleiche Kapitel, Nummern (`kapitel()`), Beschriftungen und
Zwischenzeilen (`modell()`, aus derselben Rechnung wie bisher — die Ergebnisse aller 13 Mappen stimmen weiter auf den
Cent). Neue Angaben im Vordruck: Deckblatt, Objektdaten mit frei benennbaren Merkmalszeilen, Bodenrichtwert-Merkmale,
Bautechnik 3.1–3.4, Erläuterungstexte, Ort, Bemerkung je Mietzeile, „gewerblich“ (Anteil gewerbliche Kaltmiete),
Bemerkung zum Gewerbeabschlag, PV-Nutzungsgrad, Bilder der Bodenrichtwertkarte (Anhänge der Liegenschaft). Das
Dokument steht im Bericht (#report) mit Drucken, PDF, Word und Teilen. Bei zwei Gebäuden ist die Nummerierung durchgehend
(die Mappe vergibt dort 5.2 doppelt).

**Texte:** Die Erläuterungstexte im Repository sind eigene Formulierungen; die Texte der Bank kommen mit der
Sicherungsdatei auf das Gerät, und neue Vordrucke übernehmen die Texte des zuletzt bearbeiteten Vordrucks. Kein Logo,
kein Foto des Ansprechpartners — der Ansprechpartner auf dem Deckblatt kommt aus „Absender“.

---

## D27 (2026-10-01) — Bereich „Liegenschaften“; Liegenschaftsverwaltung entfernt; Update auf Tipp

**Wunsch des Auftraggebers:** Den Bereich nicht „Jahresbewertung“ nennen, sondern „Liegenschaften“; die
Liegenschaftsverwaltung ganz aus der App entfernen. Außerdem: Am Schluss kam als Ergebnis 0 heraus, und der Vordruck
folgte nicht der Reihenfolge der Excel-Mappe.

**Entscheidung:**
- Die Liegenschaftsverwaltung (Mietverwaltung, Nebenkosten, Instandhaltung, WEG, Mieterhöhung, Kontoauszug, Berichte,
  Dokumente, Fristen, Dienstleister; D15–D18, D21) ist entfernt — Module, Tests und Vergleichsrechnungen. Geblieben
  ist ein eigener, kleiner Bereich „Liegenschaften“: Liegenschaften mit ihren Preiseinschätzungen je Stichtag
  (Vordruck, D24–D26), Ansprechpartner fürs Deckblatt, Datensicherung. Kern `js/liegenschaften.js`, Fenster
  `js/liegenschaften-ui.js`.
- **Daten bleiben erhalten:** Speicher ist weiter die Datenbank `ia_verwaltung`; Angaben früherer Fassungen (Einheiten,
  Verträge …) bleiben beim Bereinigen unverändert im Dokument stehen, werden aber nicht mehr angezeigt. Sicherungen der
  früheren Verwaltung lassen sich einspielen.
- **Ergebnis 0:** nachgestellt — wer den Bodenrichtwert wie in der Mappe unter 2.1 „Richtwert“ einträgt, ließ den
  „Preisansatz“ leer (Bodenwert 0); der „Leere Vordruck“ hatte weder NHK noch Baupreisindex noch Mietzeilen (alles 0).
  Jetzt übernimmt der Preisansatz den Richtwert, solange er nicht abweichend eingetragen ist; die leere Vorlage ist
  entfallen; unter dem Ergebnis steht „Noch offen: …“ mit der Ziffer im Vordruck.
- **Reihenfolge:** Die NHK-Tabelle steht wie im Blatt „Preis m² BGF“ vor 6.1.
- **Updates:** Eine neue Version wartete bisher, bis alle Fenster geschlossen waren — am iPhone sind Home-Bildschirm-Apps
  selten ganz geschlossen, Änderungen kamen daher nicht an. Jetzt erscheint „Neue Version — Jetzt aktualisieren“; ein
  Tipp übernimmt die wartende Fassung (skipWaiting) und lädt neu. Beim Zurückkehren in die App wird nach Updates gesucht.

---

## D28 (2026-10-01) — Jede Zahl im Vordruck änderbar (wie eine Excel-Zelle)

**Wunsch des Auftraggebers:** Alles, was eine Zahl ist, muss sich bearbeiten lassen; es darf keine Felder geben, deren
Zahlen man nicht ändern kann. Dazu der Hinweis, die Reihenfolge der Excel-Mappe genau einzuhalten und „Ergebnis 0“ zu prüfen.

**Befund:** Der Bodenrichtwert stand in 1.2 nur als Anzeige — wer der Mappe folgend dort eintragen wollte, konnte es
nicht, und der Bodenwert blieb 0. Ebenso waren Baujahr, Restnutzungsdauer und Sätze in 6.1/7.1–7.3 nur Anzeige, alle
gerechneten Zwischenwerte (Alter, Wertminderung, NHK, Index, Gebäudepreis, Vervielfältiger, Summen, Ergebnis) ebenfalls.

**Entscheidung:** Jede Zahl ist ein Eingabefeld. Eingaben, die an mehreren Stellen stehen, sind dieselbe Angabe. Jede
gerechnete Zahl hat einen Schlüssel in `v.manuell`; der Rechenkern (`rechnen`) nimmt an jeder Zwischenstufe den
eingetragenen Wert, die folgenden Zeilen rechnen damit weiter — wie eine überschriebene Formelzelle in Excel. Ohne
Einträge bleibt die Rechnung unverändert (alle 13 Mappen weiter auf den Cent). Überschriebene Felder sind gelb, „↺“
setzt zurück. Die Wägungsanteile der NHK-Tabelle sind je Gebäude änderbar. Der frühere „feste Abschlag“ wird zum
eingetragenen Wert in der Zeile „- Abschlag für gewerbliche Vermietung“ (wie Zelle C33 der Mappe). Fortschreiben und
Kopie übernehmen eingetragene Werte wie eine kopierte Excel-Datei und listen sie zum Prüfen auf. Einheiten in der Eingabe
(€/m², Jahre, kWh, kWp) werden überlesen.

---

## D29 (2026-10-01) — Historischer Vergleich zweier Stichtage

**Wunsch des Auftraggebers:** Ein „Historischer Vergleich“ nach seiner Vorlage (Kennzahlen zweier Stichtage, Veränderung
grün/rot, Bausubstanz und Mittelwert hervorgehoben). Eckdaten wie Gebäudegröße dürfen genannt werden; keine Namen, keine
Angabe, woher eine Miete stammt, keine genaue Anschrift — und die Felder müssen bearbeitbar bleiben.

**Entscheidung:** Kein fest eingebauter Datensatz einer echten Liegenschaft (die Vorlage sah eine Datei mit Anschrift
und Werten vor), sondern ein allgemeiner Vergleich je Liegenschaft aus den eigenen Vordrucken — die echten Zahlen
kommen nur aus der Sicherungsdatei auf dem Gerät; im Repository stehen weiter nur synthetische Testdaten. Gezeigt werden
Eckdaten (Fläche, Bodenrichtwert, Abschlag, BGF, Baujahr, Restnutzungsdauer, Baupreisindex, Gebäudepreis je m²,
Monatsmiete als Summe, bei mehreren Gebäuden je Gebäude) und Preisansätze mit Veränderung in € und %. Der
Baupreisindex steht auf Basis 2010 (Index × Faktor wie im Vordruck), weil die Vordrucke verschiedene Basisjahre nutzen
(2015 bzw. 2021) — sonst sähe ein Basiswechsel wie ein Rückgang aus. Jede Zahl ist ein Feld; eine Änderung geht in den
Vordruck des Stichtags (Eingabe bzw. eingetragener Wert wie in D28) und wird erst mit „Speichern“ übernommen — so gibt
es keine zweite, abweichende Zahl neben dem Vordruck. Die Monatsmiete je Gebäude geht als Jahresrohertrag des Gebäudes
(× 12) in den Vordruck. Ein kurzer Hinweistext nennt nur die Zahlen (keine Begründungen). Anzeige und Dokument nennen
Objektart und Ort, aber weder Straße noch Hausnummer, Namen oder Mietzeilen.

---

## D30 (2026-10-01) — Neue Bewertung: nur die Objektart wählen

**Wunsch des Auftraggebers:** Am Anfang nur grob nach Objektart unterteilen (Eigentumswohnung, Wohnhaus, Gewerbe,
Büro …); die zweite Unterteilung (Wohnhaus mit PV, mit Anbau und Nießbrauch, ETW mit Nießbrauch …) ist unnötig, weil
das in der Bewertung ohnehin enthalten ist.

**Entscheidung:** Der Startbildschirm hat nur noch eine Stufe mit vier Kacheln, die direkt die Bewertung öffnen:
Eigentumswohnung (Vergleichs- + Ertragswert), Wohnhaus (Substanz + Ertrag), Laden / Büro / Praxis (Geschäftshaus) und
Gewerbe / Betrieb (Betriebs- und Werkstattgebäude) — die beiden früheren Gewerbe-Vordrucke unterscheiden sich in
Gebäudeart und NHK und sind deshalb eigene Objektarten. Die früheren Untervarianten setzten nur Schalter (PV-Anlage,
Anbau, Nießbrauch) und in einem Fall die Gewichtung 40 : 60; diese Schalter stehen in den Abschnitten der Bewertung,
die Gewichtung in der Preisempfehlung. Rechnung, Felder und gespeicherte Bewertungen bleiben unverändert (ältere
Bewertungen behalten ihre Vordruck-Bezeichnung).

---

## D31 (2026-10-02) — Klicktest der ganzen App, Befunde behoben

**Wunsch des Auftraggebers:** Die ganze App auf ihre Funktion testen — jeder Knopf, jedes Auf- und Zuklappen, jedes
Eingabefeld —, ohne dabei an der Rechnung etwas zu ändern; danach die Befunde beheben.

**Vorgehen:** Ein Prüfprogramm (außerhalb des Repositorys) öffnete am PC (Chromium) und in der iPhone-Ansicht (WebKit)
38 Bereiche mit Musterdaten, klappte jeden Abschnitt und Block auf und zu, füllte jedes Feld bzw. stellte jeden
Schalter und jede Auswahl um und las den Wert zurück, klickte jeden Knopf und Link und prüfte, ob etwas passiert
(Ansicht, Inhalt, Feldwerte, Meldung, Download, Druck, Teilen) und kein Skriptfehler auftritt — rund 3.900 Elemente am
PC, 2.400 in der iPhone-Ansicht. Gegenproben: Klick ins Leere zählt als „ohne Wirkung“, App-Sperre mit simuliertem Face ID, Grundriss mit echtem
Plan-Code, Foto, Selbsttest. Keine Skriptfehler, alle Downloads vollständig, falsche Dateien sauber abgewiesen.

**Befunde und Korrektur:**
- iPhone: Die unteren sechs Einträge des Export-Menüs lagen hinter der unteren Leiste bzw. unterhalb des Bildschirms
  (die Kopfzeile scrollt nicht mit). Das Menü endet jetzt über der Leiste und hat einen eigenen Bildlauf.
- Effizienzklasse: Bei eingetragenem Energiekennwert ersetzte die Neuberechnung beim ersten Auswählen die Klasse von
  Hand durch die errechnete (das „input“-Ereignis kam vor „change“). Die Auswahl gilt jetzt schon beim „input“.
- iPhone: Kopfzeilen-Knöpfe in Finanzierung, Marktüberblick und Liegenschaften zeigten nur ein Symbol (↓ sah wie
  „Herunterladen“ aus, meint aber „Aus Bewertung“) und hatten keinen Namen für die Sprachausgabe — jetzt Symbol mit
  kurzer Beschriftung darunter, wie die untere Leiste.
- Sanierungsweg: „Aus Aufnahmebogen und Energetischer Qualität übernehmen“ meldet jetzt, wenn nichts einzutragen ist.
- Dateinamen ohne Anschrift: „Preisermittlung.pdf/.docx/.xlsx“ statt „Preisermittlung Preisermittlung“.
- Tabellen: Handzeiger nur noch, wo ein Klick etwas tut (Sortieren, Objekt öffnen) — nicht im Tilgungsplan und nicht
  in den Tabellen der Liegenschaften.

Kein Befund: Knöpfe „ohne Wirkung“ waren aktive Reiter, bereits offene Ansichten, leere Eingaben (dann springt der
Cursor ins Feld) und Tabellenzeilen; „NaN Tage“ trat nur in der Testumgebung auf (WebKit unter Windows kennt keine
Datumsfelder, das iPhone zeigt immer den Datumswähler). Rechnung unverändert.

---

## D32 (2026-10-02) — Klicktest dauerhaft; neue Bewertung aus der Kundenakte; Verlauf der Liegenschaften

**Wunsch des Auftraggebers:** Vorschläge 4 und 7 umsetzen — den Klicktest dauerhaft einbauen, eine Bewertung direkt aus
der Kundenakte beginnen, den Verlauf der Liegenschaften als Diagramm zeigen (und den Mietertrag je Gebäude rechnen, D33).

**Klicktest:** `tests/klick/klicktest.mjs` (aus dem Prüfprogramm von D31) startet einen eigenen Testserver, arbeitet nur
mit Musterdaten und ruft keine fremden Seiten auf. Rot werden Skriptfehler, Felder oder Klappbereiche ohne Funktion,
verdeckte Knöpfe und NaN schon mit dem Musterfall. Knöpfe „ohne Wirkung“ sind oft richtig (aktiver Reiter, schon offene
Ansicht, leere Eingabe) — sie werden mit einer festgehaltenen Liste verglichen, neue melden sich als Warnung statt den
Lauf rot zu machen. Er dauert rund eine Stunde je Gerät, deshalb ein eigener GitHub-Ablauf (bei Änderungen und
wöchentlich), nicht Teil von `npm test`. Die Sonderabläufe (App-Sperre mit virtuellem Authenticator, Grundriss,
Fotos, Präsentation, Übernahme-Knöpfe, Vergleichssuche) laufen als schneller Browsertest in der normalen Testreihe.

**Neue Bewertung aus der Kundenakte:** Knopf in der Akte → dieselbe Objektart-Wahl wie „Neue Bewertung“ mit dem Hinweis,
für wen → leeres Formular, Kunde zugeordnet und als Auftraggeber eingetragen. Eine angefangene Bewertung (eigene
Eingaben, Fotos, Grundrisse — Auswahlfelder und Vorgaben der Objektart zählen nicht) wird nach Rückfrage als Projekt
gesichert; ohne Name und Anschrift unter „Wertermittlung <Datum Uhrzeit>“, damit kein anderes Projekt überschrieben
wird. Das leere Formular entsteht wie bei „Neue leere Bewertung“ über einen Neustart; Objektart und Kunde werden danach
übernommen. „Neue Bewertung“ auf der Startseite bleibt unverändert.

**Verlauf der Liegenschaften:** Diagramm im historischen Vergleich über alle Stichtage mit Vordruck: Mittelwert,
Bausubstanz, Mietertrag (Grund und Boden nur ohne Gebäude — er steckt in beiden Ansätzen und würde die Achse bis 0 €
dehnen). Entwürfe hohl, verglichene Stichtage hinterlegt, rechnet beim Eintippen mit; eigenes SVG ohne Bibliothek, in
der App so breit wie der Platz (lesbar am iPhone), im Dokument mit festen Farben und für Word als Bild.

---

## D33 (2026-10-02) — Mietertrag je Gebäude in der Preisermittlung

**Wunsch des Auftraggebers:** Vorschlag 7 — den Mietertrag in der normalen Bewertung getrennt je Gebäude rechnen, wie bei
Bank- und Lagergebäude in Gronau.

**Befund:** Die Preisermittlung rechnete den Anbau / das Nebengebäude in der Bausubstanz mit eigener Restnutzungsdauer,
kapitalisierte im Ertragswert aber den ganzen Gebäudereinertrag mit der Restnutzungsdauer des Hauptgebäudes.

**Beleg:** Der Vordruck der Bank (Preiseinschätzung Bank- und Lagergebäude, Stichtage 2023/2024) rechnet je Gebäude:
Rohertrag des Gebäudes, Bewirtschaftung und Abschlag, Bodenwert nach dem Mietanteil, Bodenwertverzinsung,
Gebäudereinertrag × Vervielfältiger aus der Restnutzungsdauer des Gebäudes; die Jahresbewertung bildet das seit D24 auf
den Cent nach. ImmoWertV § 27 ff.: Kapitalisiert wird über die Restnutzungsdauer der baulichen Anlagen.

**Entscheidung:** Neues Feld „davon Anbau / Nebengebäude (€/Jahr)“ (nur mit Anbau, nur Haus). Dieser Teil des Rohertrags
trägt Bewirtschaftung, Abschlag und Bodenwert(-verzinsung) nach seinem Mietanteil und wird mit der Restnutzungsdauer
des Anbaus kapitalisiert, der Rest mit der des Hauptgebäudes. Weil alles vor dem Vervielfältiger anteilig ist,
entspricht das einem nach Miete gewichteten Vervielfältiger. Ohne Eintrag (Vorgabe 0) ist der Anteil des Hauptgebäudes
genau 1 — alle bisherigen Ergebnisse bleiben gleich (keine Änderung an golden.json und an den Sollwerten der bisherigen
Fälle). Mehr als der Rohertrag wird auf den ganzen Rohertrag begrenzt, mit Hinweis. Der Beleihungswert (BelWertV) behält
sein eigenes Modell. Geprüft: Handrechnung (Unit-Test und Selbsttest), neuer Fall der unabhängigen Python-Vergleichs-
rechnung (dort jetzt auch Substanz des Anbaus), Browsertest der Anzeige und des Berichts.

---

## D34 (2026-10-02) — Erste vollständige Läufe des Klicktests aus dem Repository

**Anlass:** Der dauerhafte Klicktest (D32) lief zum ersten Mal ganz durch: am PC 307 Klappbereiche, 2.848 Felder und
661 Knöpfe/Links (62 min), in der iPhone-Ansicht 141 / 1.581 / 657 (50 min). Keine Skriptfehler, keine Downloads leer.

**Befunde in der App:**
- Exposé, Fotoauswahl: Bei einem nicht gewählten Foto lag das blasse Bild über dem Haken — ein Element mit
  `opacity` unter 1 bildet eine eigene Ebene und wird nach dem davor stehenden Haken gezeichnet. Der leere Haken war kaum
  zu sehen, ein echter Klick traf das Bild (umgeschaltet hat er trotzdem, weil das Bild im selben Label liegt). Der Haken
  liegt jetzt darüber (`z-index`). Browsertest: Haken mit echtem Mausklick ab und wieder an; ohne die Korrektur
  scheitert er.
- Vermarktung: Ein ungültiges Datum ergab „NaN Tage“ („Am Markt seit“) bzw. „Invalid Date“ („Bericht ab“, Datum eines
  Eintrags). Das Datumsfeld selbst lässt nichts anderes zu, eine ältere oder fremde Projektdatei aber schon — und die
  Testumgebung der iPhone-Ansicht unter Windows kennt kein Datumsfeld. Jetzt zählen nur gültige Daten, sonst „–“
  (Browsertest mit einem Projekt, dessen Datum ungültig ist).

**Fehlalarme des Klicktests behoben:**
- Listen, die die App beim Umschalten neu aufbaut (Berichtsumfang, Exposé-Fotos), machten das gemerkte Feld ungültig;
  der zweite Klick ging ins Leere und erschien als „verdeckt“ oder „Haken ändert sich nicht“. Das Feld wird jetzt über
  seinen Weg im Dokument wiedergefunden — die Beschriftung ändert sich dabei („Titelbild“, „Als Titelbild“). „Verdeckt“
  meldet er nur noch, wenn der Klick auf das vorhandene Feld scheitert, mit Playwrights Begründung (welches Element den
  Klick abfängt).
- Drei Musterfotos gehören zu den Musterdaten: Fotodokumentation, Exposé-Auswahl und Titelbild werden in jedem Bereich
  geprüft, nicht erst nach „Foto hinzufügen“ in einem früheren Bereich.
- Monat und Datum in Knopfnamen (Titelfolie „Ihr Haus Oktober 2026“) ersetzt der Vergleich „ohne Wirkung“ durch
  Platzhalter, sonst meldete er sich jeden Monat neu.

**Listen „ohne Wirkung“** (`tests/klick/ohne-wirkung-desktop.json`, `-iphone.json`) festgehalten, jeder Eintrag geprüft:
aktiver Reiter, schon offene Ansicht, leere Eingabe („Hinzufügen“, „Notiz speichern“), Filter schon zurückgesetzt,
Klick in die Fläche eines Fensters, Budget schon leer, „Alle aufklappen“ bei offenen Abschnitten, „Vorige Folie“ auf
der ersten und „Nächste Folie“ auf der letzten Folie (das Blättern prüft `sonderablaeufe.spec.mjs`).

---

## D35 (2026-10-02) — Gliederung der Bewertung neu; Aufnahmebogen fließt in die Bewertung; Schalter je Abschnitt

**Wunsch des Auftraggebers:** Die Gliederung der Preiseinschätzung verbessern, zuerst beim Wohnhaus, dann ebenso bei
Eigentumswohnung und Gewerbe: 1. Eckdaten nur mit Vordruck, Gebäudetyp, Auftraggeber (mit Adresse, Telefon …),
Objektanschrift, Nutzung, Verwendungszweck und Stichtag; 2. Aufnahmebogen, in dem man während der Besichtigung
erfasst — z. B. wie die Fenster sind — und das in die Bewertung übertragen wird; 3. Objektdaten & Beschreibung;
4. Allgemeines (Grundstücksflächen usw.); dann Hauptgebäude, Anbau … wie bisher. Bei den besonderen
objektspezifischen Merkmalen mehr Auswahl für Plus und Minus und mit ＋ einfügen statt vorbereiteter leerer Zeilen.
Jeder große Punkt mit einem Schalter, um ihn auszuschalten, wenn er nicht mitbewertet werden soll. Der Rest bleibt.

**Gliederung:** Eckdaten · Aufnahmebogen · Objektdaten & Beschreibung · Allgemeine Angaben (neu; Grundstück,
Wohnung/Gemeinschaft, Flächen & Baujahr, Erträge — vorher in den Eckdaten) · Hauptgebäude · Anbau · Datengrundlagen ·
Substanz · Vergleichswert · Ertrag · ab Nießbrauch unverändert. Alle Objektarten teilen sich die Abschnitte; was nicht
passt, ist ausgeblendet — Eigentumswohnung und Gewerbe haben damit dieselbe Reihenfolge. Die Felder behalten ihre
Kennung, die Rechnung liest sie unabhängig von ihrer Stelle: keine Zahl ändert sich (Golden-Test maschinell
verglichen, nur Anzeigetexte, golden-aenderungen.md §11). Die Ortsbesichtigung steht jetzt im Aufnahmebogen; das
doppelte Feld „Besichtigung am“ entfällt (ältere Bewertungen: dessen Datum wird übernommen, wenn die Ortsbesichtigung
leer ist).

**Objektdaten & Beschreibung (Nachtrag, Wunsch des Auftraggebers):** Blöcke in der Reihenfolge Lage (Makro-/Mikrolage) ·
Lage-Check mit amtlichen Karten · Gebäudedaten · Grundstück, Grundbuch & Recht · Planungsrecht · Grundstück & Gebäude ·
Zustand & Bautechnik · Rechtliches & Vermarktung. Nur die Anordnung im Formular; der Bericht behält seinen Aufbau.

**Auftraggeber:** Anschrift, Telefon und E-Mail zeigen die Eckdaten aus der Kundenakte. Personenbezogene Daten bleiben
in der Akte gebündelt, mit Auskunft und Löschung (D8); die Bewertung speichert wie bisher nur Name und Zuordnung.

**Aufnahmebogen → Bewertung (Haus):** „Bauteile & Ausstattungsstandard“ — je Bauteil die Beschreibung der
Standardstufe 1–5 (NHK 2010, Anlage 4 ImmoWertV; dieselben Texte wie die Referenztabelle im Hauptgebäude, jetzt aus
einer Quelle) → Standardstufe im Gebäudepreis. „Modernisierungen“ — Elemente nach ImmoWertV Anlage 2 mit Umfang und
Jahr → „vollständig erneuert“ = Höchstpunktzahl des Elements, „nicht modernisiert“ = 0; „teilweise“ und länger
zurückliegende Maßnahmen legt der Bewerter fest (Anlage 2: dann ggf. weniger als die Höchstpunktzahl), das Jahr steht
in der Punktetabelle. Technik & Ausstattung → Objektdaten (Heizung und Fenster nur bei eindeutigem Stichwort,
Energieausweis, Effizienzklasse, Aufzug), Keller → Unterkellerung, Kennwert und Klasse → Energetische Qualität (wie
bisher der Knopf „Aus Aufnahmebogen“). Übertragen wird nur beim Ändern im Aufnahmebogen, beim Laden nichts; in der
Bewertung bleibt jeder Wert änderbar, übernommene Felder sind markiert. Keine neue Formel — es werden nur Eingaben
gesetzt.

**§ 8 Abs. 3:** zwei Listen, „Wertmindernd“ (Abschläge) und „Werterhöhend“ (Zuschläge), jeweils mit ＋ und einer
Vorschlagsliste typischer Merkmale nach § 8 Abs. 3 ImmoWertV (Baumängel und Bauschäden, besondere
Ertragsverhältnisse, Rechte und Belastungen, Bodenverunreinigungen, Freilegung, Bodenschätze …); Beträge positiv.
Gespeichert wie bisher in 14 Plätzen, zusätzlich die Art (`wk_art`). Ein Zuschlag zählt in der Summe negativ —
genau wie vorher ein negativer Betrag (neuer Fall der Python-Vergleichsrechnung, Gleichheit im Unit-Test). Ältere
Bewertungen: negative Beträge erscheinen als Zuschlag. Die Anzeige zeigt das Vorzeichen (vorher „− -… €“ bei
Zuschlägen); die Vorlage „Typische Positionen einfügen“ und die leeren Zeilen entfallen.

**Schalter je Abschnitt:** oben rechts in der Kopfzeile. Aus = fließt nicht in die Bewertung; darstellende Abschnitte
erscheinen dann auch nicht im Bericht. Die vorhandenen Schalter (Anbau, Vergleichswert, Nießbrauch, Erbbaurecht, PV,
Energie, Sanierungsweg, Beleihungswert) wandern nach oben — gleiche Felder, gleiche Rechnung. Neu: Aufnahmebogen,
Objektdaten & Beschreibung, Datengrundlagen, Fotos, Rendite (Bericht) und § 8 (`wk_aus`: keine Zu- und Abschläge).
Substanz und Ertrag (bei der Wohnung Vergleich und Ertrag) stellen die vorhandene Gewichtung auf „nur …“ und beim
Einschalten auf die vorige zurück; beide aus geht nicht — keine neue Formel. Die neuen Felder heißen `…_aus`: fehlen sie
in älteren Bewertungen oder Referenzfällen, ist der Abschnitt an. Ausgeschaltete Abschnitte zeigen nur Kopfzeile und
Hinweis, ihre Pflichtfelder zählen nicht. Ohne Schalter bleiben Eckdaten, Allgemeine Angaben, Hauptgebäude,
Preisempfehlung und Ersteller (ohne sie keine Bewertung). Exposé, Präsentation und Vermarktung fließen ohnehin nicht in
die Bewertung ein; auf Wunsch des Auftraggebers blendet ihr Schalter sie aus (`ex_aus`, `vp_aus`, `vm_aus`), die
Eingaben bleiben erhalten.

**Geprüft:** 94 Unit-Tests (neu: Zuschlag als Art = früherer negativer Betrag; zwei neue Fälle der
Python-Vergleichsrechnung), 75 Browsertests (neu: Gliederung, Übernahme aus dem Aufnahmebogen, Schalter, § 8,
ältere Bewertung, Kontaktdaten aus der Akte), Golden-Test (nur Anzeigetexte). Klicktest PC 296 Klappbereiche,
2.963 Felder, 670 Knöpfe; iPhone 138 / 1.625 / 666 — Listen „ohne Wirkung“ unverändert. Ein Fehlalarm am
Substanz-Schalter ist im Test behoben: Der Klicktest stellt beim Durchprobieren den Gebäudetyp um, der die Gewichtung
auf den Standard des Typs setzt (Einfamilienhaus: nur Substanz); dann verweigert die App zu Recht, auch die Substanz
auszuschalten, und sagt warum. Ein Haken, der mit Meldung stehen bleibt, gilt jetzt als in Ordnung (Nachprüfung der
Bewertungsbereiche ohne Befund).

---

## D36 (2026-10-02) — Raumliste und Grundrisse zu den Flächen; Wohnfläche änderbar; „Sonstiges“

**Wunsch des Auftraggebers:** Grundrisse und Raumliste aus dem Aufnahmebogen zu „Flächen & Baujahr“ unter den
Allgemeinen Angaben; eine schon genannte Wohnfläche wird übernommen, muss aber änderbar bleiben — die Felder sollen
nicht voneinander abhängen; „Sonstiges“ selbst eintragen können bei Planungsrecht, Modernisierungen, Lage-Check,
besonderen Bauteilen und Unterlagen.

**Umsetzung:** Allgemeine Angaben in Blöcken: Grundstück (bei der Wohnung: Wohnung / Gemeinschaft) · Flächen & Baujahr ·
Grundrisse · Raumliste & Wohnfläche nach WoFlV · Erträge. Die Wohnfläche hat weiter nur ein Feld; die Raumliste füllt
es, solange „übernehmen“ an ist, sperrt es aber nicht mehr (vorher schreibgeschützt). Eine eigene Zahl gilt und
schaltet die Übernahme aus; „übernehmen“ daneben holt die Summe der Raumliste zurück. Eigene Einträge: Planungsrecht
„Sonstiges“ (Freitext), sonstige Modernisierung (Bezeichnung, Umfang, Jahr — nur Dokumentation, keine Punkte, weil
Anlage 2 ImmoWertV nur die acht Elemente kennt), sonstige Bauteile (Freitext, mehrere mit Komma), sonstige Unterlage
(mit „liegt vor“, auch in der Unterlagenliste für den Eigentümer und ihrer Vollständigkeit), eigener Prüfpunkt im
Lage-Check (Bezeichnung, Quelle, Ergebnis, Notiz, Datum). Alles erscheint im Bericht; die Modernisierungen laut
Aufnahmebogen stehen jetzt unter „Feststellungen der Ortsbesichtigung“.

**Bericht:** Die Wohnflächenberechnung stand unter „Feststellungen der Ortsbesichtigung“ und wäre mit ausgeschaltetem
Aufnahmebogen verschwunden. Jetzt lässt der Bericht bei ausgeschaltetem Aufnahmebogen nur dessen Feststellungen weg;
die Wohnflächenberechnung erscheint dann als eigener Teil (im Berichtsumfang weiter unter „Feststellungen … mit
Wohnflächenberechnung“). Keine Rechnung ändert sich.

**Bericht wie das Formular (Nachtrag, Wunsch des Auftraggebers):** Feststellungen der Ortsbesichtigung (Aufnahmebogen) ·
Lage (eigene Überschrift, vorher Teil der Objektbeschreibung) · Lage-Check · Gebäudedaten · Grundstück, Grundbuch & Recht ·
Planungsrecht · Objektbeschreibung · danach wie bisher Grundstück & Bodenwert und die Preisansätze. Im Berichtsumfang
umfasst „Objektbeschreibung (mit Lage)“ auch die Lage.

**Nummern (Fehler behoben):** War ein Abschnitt beim Nummerieren zugeklappt, zählten Blöcke mit, die es nur beim Haus
gibt — bei der Wohnung begannen die Allgemeinen Angaben mit 4.2, im Aufnahmebogen fehlten 2.3 und 2.4. Jetzt zählen
solche Blöcke in der anderen Objektart nicht mit; beim Auf- und Zuklappen wird neu nummeriert (Browsertest).

## D37 (2026-10-02) — Foto an der Feststellung, fehlende Bauteile, Prüfhinweise zusammengeführt, Vergleichswert im Beleihungswert

**Auftrag:** Vorschläge 1, 2, 4, 5 und 7 aus der Liste „Was könnte man noch verbessern“.

**1 · Foto direkt an der Feststellung:** Im Aufnahmebogen („Feststellungen vor Ort“) gibt es Feststellungen mit Foto:
kurzer Text, Foto mit der Kamera, mehrere Fotos je Feststellung. Die Feststellungen stehen als Liste im versteckten Feld
`au_fest` und reisen damit in Speicherstand, Sicherung und Teilen mit. Die Fotos sind gewöhnliche Schadensfotos mit
Verweis auf ihre Feststellung (`fest`) — sie bleiben in der Fotodokumentation sichtbar und liegen wie alle Fotos nur
lokal auf dem Gerät.
Der Bericht zeigt sie unter „Feststellungen mit Foto“ bei ihrem Text und nicht noch einmal unter den Schadensfotos;
ist der Aufnahmebogen ausgeschaltet, stehen sie wie bisher unter den Schadensfotos. Die Bildunterschrift folgt dem Text
der Feststellung (vor Ort wird oft zuerst fotografiert), bis sie in der Fotodokumentation selbst geändert wird; eine
eigene Bildunterschrift zeigt der Bericht unter dem Foto. Löschen der Feststellung löscht nach Rückfrage auch ihre
Fotos. Keine Rechnung ändert sich.

**2 · Fehlende Bauteile (Roadmap #51, offener Teil):** Bisher zählte ein leeres Bauteil in der Preisermittlung wie
Stufe 3 — eine Lagerhalle ohne Heizung bekam Heizungskosten. Jetzt hat jedes Bauteil der Standardstufen den Haken
„fehlt“ (Hauptgebäude und Anbau), im Aufnahmebogen die Auswahl „fehlt“. Quelle: Vordruck der Bank in der
Jahresbewertung (D24) — ein fehlendes Bauteil hat dort die Anteile 0; seine Kosten entfallen, die übrigen Anteile
werden **nicht** auf 100 % hochgerechnet. So rechnet jetzt auch die Preisermittlung (`nhkRechnen`: Anteil × Kennwert,
fehlend = 0). Die Python-Vergleichsrechnung hat dafür den Fall `gewerbe_ohne_heizung_sanitaer`, der Unittest eine
Handrechnung (785 €/m² × 0,82). Ohne Haken ändert sich nichts (golden-aenderungen §12).

**4 · Prüfhinweise zusammengeführt (Roadmap #28) und erweitert:** Die Ergebnis-Plausibilisierung gegen den Marktbericht
stand nur im Abschnitt Preisempfehlung und als Anzeige oben, unverbunden mit der Eingabeprüfung. Sie steht jetzt mit
denselben Stufen wie dort (bis 10 % plausibel, bis 25 % erklärungsbedürftig, darüber erheblich) auch in der Liste der
Prüfhinweise. Neu sind außerdem Gegenproben, die Widersprüche zwischen Aufnahmebogen und Bewertung zeigen:
- Keller und Dachgeschoss laut Aufnahmebogen gegen den Gebäudetyp — an ihm hängen die NHK-Basiswerte;
- Effizienzklasse gegen den Energiekennwert (GEG-Skala, wie die bestehende Klassenermittlung);
- Modernisierungsjahr vor dem Baujahr (Fehler) oder nach dem Stichtag (Warnung);
- „vollständig erneuert“ bei Standardstufe 1–2 des Bauteils (Dach, Fenster und Außentüren, Heizung, Außenwände) —
  die Stufen 1–2 beschreiben alte Bauteile (Anlage 4 ImmoWertV);
- Wohnfläche gegen die Summe der Raumliste (ab 5 % Abweichung), wenn die Übernahme ausgeschaltet ist.

Die Gegenproben gelten nur, solange der Aufnahmebogen eingeschaltet ist. Es sind reine Hinweise, keine Rechnung ändert
sich. Der alte Hinweis „Wohn-/Nutzfläche in ① eintragen“ verweist jetzt auf „Allgemeine Angaben“, wo die Fläche seit
D35 steht (golden-aenderungen §12).

**5 · Vergleichswert im Beleihungswert (Roadmap #29):** Quelle: BelWertV (gesetze-im-internet.de).
- § 19 Abs. 1: Vergleichswert aus nachhaltig erzielbaren Vergleichspreisen, Sicherheitsabschlag von mindestens 10 %.
  Eine kleinere Eingabe rechnet die App mit 10 % und meldet die Korrektur, wie beim Sicherheitsabschlag des Sachwerts
  (§ 16 Abs. 2).
- § 4 Abs. 1: Der Ertragswert ist maßgeblich. Als Kontrollwert dient der Sachwert, bei Ein- und Zweifamilienhäusern
  und Wohnungs- und Teileigentum anstelle des Sachwerts der Vergleichswert. Liegt der Kontrollwert mehr als 20 % unter
  dem Ertragswert, verlangt die App wie bisher die besondere Nachhaltigkeitsprüfung.
- § 4 Abs. 2: Orientierung am Sach- oder Vergleichswert nur bei zweifelsfreier Eignung zur Eigennutzung. Beim Ein- und
  Zweifamilienhaus verlangt die App mindestens fünf aktuelle Vergleichspreise.
- Der Vergleichswert außerhalb von EFH/ZFH und Wohnungseigentum (als Ausgangs- oder Kontrollwert) ist ein Fehler.
- Der Abzug für bestehende Vermietung gilt für Sach- und Vergleichswertorientierung.

„Werte übernehmen“ holt Vergleichswert und Anzahl der Vergleichsobjekte aus dem Abschnitt Vergleichswert. Vorgabe bleibt
Ertragswert mit Sachwert als Kontrolle — bestehende Bewertungen rechnen unverändert (golden-aenderungen §12, neue
Felder mit 0).

**7 · Baupreisindex:** Der Wert für August 2026 (3. Vierteljahr) ist noch nicht veröffentlicht; die neueste
Pressemitteilung des Statistischen Landesamts (17.07.2026) betrifft das 2. Vierteljahr (Mai 2026), der eingebaute
Stand. Stichtage danach sind in der App weiter als „vorläufig“ gekennzeichnet. Roadmap #50 bleibt offen.

**Tests:** Unit- und Python-Vergleichsrechnung wie oben; Browsertests (D37) für Feststellung mit Foto, fehlende
Bauteile, Prüfhinweise und Vergleichswert im Beleihungswert; Klicktest der Bewertungen und des Berichts.

**Klicktest auf GitHub (Nachtrag):** Lauf 11 war am iPhone grün. Am PC kam die App vor „Liegenschaften – Übersicht“
einmal nicht innerhalb von 30 s in Gang („Test abgebrochen“). Alle übrigen Bereiche liefen durch, lokal laufen alle
Liegenschaften-Bereiche ohne Befund. Das war ein Hänger des Testrechners. Der Klicktest lädt bei einem solchen Hänger
jetzt einmal neu und vermerkt das als Hinweis. Hängt der Start auch beim zweiten Mal, bleibt es ein Befund.

## D38 (2026-10-02) — Beratung & Werkzeuge: acht neue Kacheln

**Auftrag:** Nichts Bestehendes umbauen, sondern Neues schaffen, das zur Immobilienberatung, zu den Liegenschaften und zur
Bewertung passt — jede Idee in einer eigenen Kachel: Übergeben & Vererben, Wohnen im Alter, Übergabeprotokoll, Mein Jahr,
Grundstückspotenzial, ETW-Kaufcheck, Mieterhöhung, Wertmonitor.

**Aufbau:** Die Kacheln stehen auf der Startseite unter „Beratung & Werkzeuge“ und im Bereich „Mehr“. Alle öffnen sich in
einem gemeinsamen Fenster (`#wz_overlay`, `src/werkzeuge.js`); jedes Werkzeug ist eine eigene Datei (`src/wz-*.js`). Die
Rechnungen stehen ohne Seitenbezug in `js/beratung.js` (`ImmoBeratung`) und sind in Node und gegen eine unabhängige
Python-Rechnung getestet (`tests/unit/beratung.test.mjs`, `tests/referenz/beratung.py`). Jedes Werkzeug hat „Dokument“:
Die Zusammenfassung erscheint im Bericht wie das Dokument der Liegenschaft — Drucken, PDF, Word, Teilen. Rechner mit
Kundenbezug haben „Beim Kunden ablegen“: Eine kurze Zusammenfassung wird Gesprächsnotiz in der Kundenakte (die Akte selbst
bleibt unverändert). „Aus Bewertung“ übernimmt passende Werte der geöffneten Bewertung (Wert, Wohnfläche, Miete,
Grundstück, Bodenrichtwert, Miteigentumsanteil).

**Daten und Datenschutz:**
- Die Rechner merken sich ihre Eingaben im localStorage („ia_wz“) — Werte, Alter, Verwandtschaftsgrad, aber keine Namen.
- Das Übergabeprotokoll enthält Namen, Fotos und Unterschriften. Es liegt deshalb in der Datenbank auf dem Gerät, im neuen
  Speicher „protokolle“ (Datenbankversion 3), und lässt sich einzeln löschen.
- Die Werkzeug-Felder gehören nicht zur Bewertung: `collect()` lässt `#wz_overlay` aus, Eingaben lösen keine Neuberechnung
  der Bewertung aus.
- Die Gesamtsicherung enthält Protokolle und Rechner-Eingaben. Beim Einspielen gewinnt das neuere Protokoll; Eingaben auf
  dem Gerät bleiben, nur Fehlendes wird ergänzt. Schlüssel wie `__proto__` aus fremden Dateien werden übergangen.
- Die Datenschutzseite beschreibt die neuen Daten.

**Rechenwege und Quellen:**
- **Übergeben & Vererben:**
  - ErbStG: Steuerklassen § 15, Freibeträge § 16, Sätze § 19 Abs. 1 mit Härteausgleich § 19 Abs. 3.
  - Abrundung auf volle 100 € (§ 10 Abs. 1 Satz 6), Zusammenrechnung über 10 Jahre mit Abzug der höheren fiktiven oder
    gezahlten Steuer und Begrenzung auf 50 % des neuen Erwerbs (§ 14), Kleinbetrag bis 50 € (§ 22).
  - Familienheim § 13 Abs. 1 Nr. 4a/4b/4c (bei Kindern bis 200 m², Rest anteilig), vermietete Wohnimmobilie 10 % frei (§ 13d).
  - Lasten nur im Verhältnis des steuerpflichtigen Teils (§ 10 Abs. 6).
  - Nießbrauch und Wohnrecht: Kapitalwert = Jahreswert × Vervielfältiger. Der Vervielfältiger kommt nach § 14 Abs. 1 BewG
    aus der Sterbetafel des Statistischen Bundesamts, 5,5 %, als Mittel aus vor- und nachschüssiger Zahlung.
  - Jahreswert höchstens Wert / 18,6 (§ 16 BewG); bei zwei Berechtigten der höhere Vervielfältiger (§ 14 Abs. 3 BewG).
  - Das Finanzamt nimmt die BMF-Tabelle des Bewertungsjahres, die auf einer älteren Sterbetafel beruhen kann — deshalb lässt
    sich der Tabellenwert eintragen.
  - Zwei Schenkende (Eltern je zur Hälfte) rechnen je Elternteil mit eigenem Freibetrag. Der Vergleich „Erbe später“ rechnet
    das Erbe vom Letztversterbenden mit einem Freibetrag je Kind — der Unterschied, den die Beratung zeigen soll.
  - Nicht gerechnet: Versorgungsfreibetrag (§ 17), Grundbesitzwert nach §§ 176 ff. BewG (Verkehrswert als Näherung, Hinweis
    auf § 198 BewG).
- **Wohnen im Alter:**
  - Barwert einer monatlich vorschüssigen Leibrente aus der Sterbetafel, mit Gleichverteilung der Sterbefälle im Jahr; bei
    zwei Personen bis zum Tod des Letztversterbenden (1 − (1 − p₁)(1 − p₂)). Rentengarantiezeit möglich.
  - Der Faktor weicht vom Woolhouse-Faktor des Rechenkerns (Nießbrauch) um weniger als 0,01 ab (Test).
  - Wege: Verkauf mit Wohnrecht (Wert − Barwert des Wohnrechts), Leibrente aus derselben Summe, Teilverkauf mit
    Nutzungsentgelt und Entgelt beim Verkauf, Verkaufen und zurückmieten (auch verrentet), Behalten.
  - Zins, Wertsteigerung, Abschläge und Entgelte sind Annahmen.
- **Mieterhöhung:**
  - § 558 BGB: Vergleichsmiete, Kappungsgrenze 20 bzw. 15 % auf die Miete vor drei Jahren, 15-Monats- und Jahresfrist.
  - § 558b: Zustimmung bis Ende des zweiten Kalendermonats, Wirkung ab dem dritten, Klage drei Monate.
  - § 559: 8 %, Erhaltungsanteil, Drittmittel (§ 559a), vereinfachtes Verfahren bis 10.000 € mit 30 % (§ 559c), Kappung
    3 bzw. 2 €/m² in sechs Jahren. Wirkung ab dem dritten Monat, ohne Ankündigung sechs Monate später (§ 559b).
  - Mietpreisbremse § 556d–f.
  - § 559e (Heizung nach GEG) ist nur als Hinweis genannt.
- **Grundstückspotenzial:** Residualwert als deduktive Bodenwertermittlung (§ 40 Abs. 3 ImmoWertV). Gerechnet wird Erlös −
  Bau- und Baunebenkosten − Abriss/Erschließung − Bauzinsen (Hälfte der Kosten über die Bauzeit) − Vermarktung − Wagnis und
  Gewinn. Daraus folgt der Grundstückspreis ohne Erwerbsnebenkosten und Grundstücksfinanzierung, abgezinst über die
  Wartezeit. Die Spanne zeigt ±10 % Verkaufspreis und Baukosten. Alle Marktwerte sind Annahmen.
- **ETW-Kaufcheck:**
  - Peters'sche Formel (Herstellungskosten × 1,5 / 80 × Anteil Gemeinschaftseigentum).
  - Rücklage und Zuführung nach Miteigentumsanteil.
  - ~~GEG § 72: Betriebsverbot für Konstanttemperaturkessel vor 1991 bzw. älter als 30 Jahre; fossile Kessel bis 2044.~~ Überholt: seit 29.07.2026 GModG, siehe Nachtrag.
  - Sonderumlage, geplante Maßnahmen, Rechtsstreit, Rückstände und auslaufender Verwaltervertrag als Ampel; zwölf Unterlagen.
- **Mein Jahr:**
  - Liest den Vermarktungsstand der gesicherten Projekte.
  - Provision je Seite bei Halbteilung (§ 656c BGB, Vorgabe 3,57 % inkl. USt), gewichtet mit Abschlusswahrscheinlichkeiten
    je Phase (eigene Erfahrungswerte, änderbar).
  - Herkunft, Kaufpreis und Notartermin je Auftrag stehen nur im Werkzeug.
- **Wertmonitor:**
  - Rechnet jede gesicherte Bewertung mit dem Rechenkern (`ImmoKern.bewerte`) und den gespeicherten Eingaben zweimal:
    einmal zum damaligen Stichtag (Ergebnis = Preisempfehlung der Bewertung, Test) und einmal zu heute.
  - Für heute gelten der amtliche Baupreisindex, das höhere Gebäudealter und, falls eingetragen, ein neuer Bodenrichtwert.
  - Marktanpassung, Mieten und Vergleichspreise bleiben wie in der Bewertung — keine neue Formel.
  - Ab einer Schwelle legt er eine Wiedervorlage mit Kunde an. Die Projekte bleiben unverändert.

**Klicktest und Tests:**
- Zehn neue Bereiche im Klicktest: jedes Werkzeug, die Protokollliste und ein Protokoll, ein Werkzeug-Dokument.
- Browsertests `tests/e2e/werkzeuge.spec.mjs`: Kacheln, Rechnung je Werkzeug wie `ImmoBeratung`, Kundenakte, Dokument.
  Übergabeprotokoll mit Foto, Unterschriften, Sperre nach dem Abschließen, Neuladen und Löschen. Wertmonitor gegen die
  Bewertung, Mein Jahr, Gesamtsicherung hin und zurück.

**Beim Prüfen behoben:**
- Ergebnisse als Karten statt breiter Tabellen.
- Feld „Anteil“ verdeckt.
- Textfelder, die die Ansicht neu aufbauen, verloren beim Tippen den Fokus — jetzt erst beim Verlassen.
- Verwaltervertrag gegen das echte Tagesdatum geprüft.
- Echte Minuszeichen.
- Lange Kachelnamen trennen am iPhone an der Wortfuge (weiche Trennstelle) statt abgeschnitten zu werden.

**Nachtrag: Prüfung der Kacheln gegen die Quellen (2026-10-02, Wunsch des Auftraggebers).** Jede Rechtsgrundlage am
Wortlaut auf gesetze-im-internet.de geprüft, dazu BMF, Verbraucherzentrale und VDI 2067.

Gefunden und korrigiert:
- **Heizung (ETW-Kaufcheck):** Seit 29.07.2026 gilt das Gebäudemodernisierungsgesetz (GModG) statt des GEG. Die §§ 71–73
  (65-%-Regel, Austauschpflicht für alte Kessel) sind weggefallen. Die Prüfung nannte noch ein „Betriebsverbot nach § 72
  GEG“ — falsch.
  - Jetzt: keine gesetzliche Austauschpflicht. Erneuerungsbedarf ab 20 Jahren (rechnerische Nutzungsdauer von Öl- und
    Gaskesseln nach VDI 2067: 18–20 Jahre).
  - Neu eingebaute Öl- und Gasheizungen müssen ab 2029 steigende Anteile klimafreundlicher Brennstoffe nutzen (§ 43 GModG:
    10 %, 2030 15 %, 2035 30 %, 2040 60 %). Die Versorger sollen bis 2045 vollständig auf klimaneutrale Brennstoffe
    umstellen (§ 42a).
  - Die Kesselart ist entfallen.
  - Ebenso angepasst: Hinweis zu § 559e BGB (verweist jetzt auf § 43 GModG) und die Effizienzklassen-Prüfung im
    Aufnahmebogen (Anlage 10 GModG; Grenzen unverändert).
- **Erbschaftsteuer:** Die Mindeststeuer nach § 14 Abs. 1 Satz 4 ErbStG fehlte. Die Steuer auf den letzten Erwerb allein,
  mit vollem Freibetrag, darf durch den Abzug der Steuer auf frühere Erwerbe nicht unterschritten werden. Ergänzt, mit
  Handrechnung im Test.
- **Wertmonitor:** Die Fortschreibung beruhte auf dem Baupreisindex. Das ist ein Kostenindex: Die Werte stiegen mit den
  Baukosten, auch wenn die Kaufpreise fallen — als Gesprächsanlass irreführend.
  - Jetzt rechnet er vorrangig mit einer Preisindexreihe des Marktes (§ 9 Abs. 1, § 18 ImmoWertV): Jahreswerte aus dem
    Grundstücksmarktbericht oder dem Häuserpreisindex, getrennt für Häuser und Wohnungen.
  - Die Rechnung nach Baukosten und Alter steht nur noch zur Information daneben.
  - Neu ist der Hinweis zur Kundenansprache: werbende Anrufe bei Verbrauchern nur mit vorheriger ausdrücklicher
    Einwilligung, E-Mails nach § 7 Abs. 2 und 3 UWG. Dazu die Rechtsgrundlage aus der Kundenakte und der Hinweis im Text
    der Wiedervorlage.
- **Wohnen im Alter:**
  - Die Teilverkaufs-Vorgaben lagen unter dem Markt. Jetzt Nutzungsentgelt 5,0 % (Marktübersichten 2025/26: etwa
    4,75–5,75 %) und Entgelt beim Verkauf 3,5 % (üblich 3–6 %).
  - Neu ist der Weg „Kredit mit Grundschuld über denselben Betrag“ — die Verbraucherzentrale weist darauf hin, dass ein
    Darlehen günstiger sein kann. Der Weg zeigt den Vergleich mit dem Bankprodukt (Beispiel: 225.000 € → Teilverkauf
    938 € im Monat, Erben 258.689 €; Kredit zu 3,5 % 656 € im Monat, Erben 331.320 €).
  - Der Ertragsanteil der Leibrente ist mit Fundstelle genannt.
- **Grundstückspotenzial:** Die Kachel ist keine Bodenwertermittlung nach § 40 Abs. 3 ImmoWertV. Deduktiv darf der
  Bodenwert nur ermittelt werden, wenn Vergleichspreise und Bodenrichtwert fehlen, und dann mit Marktanpassung. Die Kachel
  heißt jetzt Bauträgerkalkulation, als Verhandlungsgrundlage.
- **Übergeben & Vererben:**
  - Das Finanzamt rechnet für Stichtage 2026 mit der BMF-Tabelle vom 21.10.2025 (Sterbetafel 2022/2024); die App rechnet
    nach demselben Verfahren mit der neueren Tafel 2023/2025. Den Tabellenwert trägt man ein; die Tabelle gibt es nur
    als PDF.
  - Der Hinweis zur Grenze der Beratung ist klarer: geschäftsmäßige Hilfe in Steuersachen ist Steuerberatern vorbehalten
    (§ 5 StBerG). Die Kachel ist eine Orientierung mit den gesetzlichen Tarifen zur Vorbereitung des Gesprächs mit
    Steuerberatung und Notar.

Bestätigt: Freibeträge, Steuerklassen, Steuersätze und Härteausgleich (§§ 15, 16, 19 ErbStG), § 13 Abs. 1 Nr. 4a–4c,
§ 13d, § 14 Abs. 3 ErbStG, §§ 14, 16 BewG, § 3 GrEStG, §§ 558, 558b, 559, 559b, 559c, 556d BGB (Verordnungen höchstens bis
31.12.2029), § 656c mit § 656b BGB, Peters'sche Formel, § 22 EStG (Ertragsanteil).

Nutzen für Bank und Beratung (Einschätzung):
- **Hoch:** Übergabeprotokoll, ETW-Kaufcheck (auch für die Baufinanzierung), Wertmonitor (Bestandskunden),
  Übergeben & Vererben und Wohnen im Alter (Generationenberatung, Gesprächsanlass für Finanzierung und Vermittlung).
- **Mittel:** Grundstückspotenzial.
- **Fraglich:**
  - Mein Jahr — doppelt zur Vertriebssteuerung der Bank und nur so gut wie die Vermarktungsstände in der App.
  - Mieterhöhung — Rechtsberatung für Vermieter liegt außerhalb der Kernaufgabe. Als Nebenleistung ist das nur in engen
    Grenzen erlaubt (§ 5 RDG); für gewerbliche Mietverträge (z. B. Bank- und Lagergebäude) gilt § 558 nicht.
  - Die Entscheidung über beide liegt beim Auftraggeber.

**Nachtrag: Vervielfältiger nach der BMF-Tabelle; Kachel „Mieterhöhung“ entfernt (2026-10-03, Entscheidung des
Auftraggebers).**
- **Vervielfältiger:** Mit Freigabe des Auftraggebers wurde das BMF-Schreiben vom 21.10.2025 geladen (Vervielfältiger für
  Stichtage ab 1.1.2026, Sterbetafel 2022/2024). Der Abgleich zeigte einen Fehler im Verfahren der App: Sie rechnete den
  Barwert einer Leibrente (Überlebenswahrscheinlichkeit Jahr für Jahr). Das BMF rechnet eine **Zeitrente über die
  durchschnittliche Lebenserwartung** (Mittel aus vor- und nachschüssig, 5,5 %); alle 202 Werte der Tabelle lassen sich so
  aus der dort genannten Lebenserwartung exakt nachrechnen. Die App lag rund 5 % zu niedrig (Mann 60: 12,075 statt 12,798),
  der Abzug für Nießbrauch und Wohnrecht war also zu klein, die Steuer zu hoch.
  - Jetzt: Stichtage 2026 mit der eingebauten amtlichen Tabelle (Prüfdatei `tests/fixtures/bmf-vervielfaeltiger-2026.json`).
  - Andere Jahre: nach demselben Verfahren mit der Lebenserwartung der eingebauten Sterbetafel; maßgeblich bleibt die
    BMF-Tabelle des Jahres.
  - Die Python-Gegenrechnung bildet alle Tabellenwerte nach.
- **Mieterhöhung:** Die Kachel ist entfernt. Rechtsberatung für Vermieter ist nicht Kernaufgabe des Immobilienberaters
  (§ 5 RDG), und für gewerbliche Mietverträge gilt § 558 BGB nicht. Rechnungen, Tests und Klicktest-Bereich sind mit
  entfernt; die Kacheln sind jetzt sieben.
- **Mein Jahr:** Die Kachel bleibt — der Auftraggeber führt die Vermarktung in der App.
- **Preisindex:** Den Preisindex für den Wertmonitor trägt der Auftraggeber von Hand ein (Grundstücksmarktbericht des
  Gutachterausschusses, regional genauer als der Häuserpreisindex des Bundes).

## D39 (2026-10-03) — Notarauftrag, Portal-Export, Datenstand; Ziel: bessere Maklersoftware

**Auftrag:** „Mache Punkte 2. 3.“ — eine Kachel „Notarauftrag“ (Angaben für den Kaufvertragsentwurf) und eine Kachel
„Datenstand“ (alle Datenquellen mit Erinnerung). Dazu den Portal-Export „schon mal vorbereiten und eine Kachel dafür
anlegen (eventuell eines Tages notwendig, wenn ich die App an die Bank vermitteln kann und sie über den Bank-Server
läuft)“. Erklärtes Ziel des Auftraggebers: die Maklersoftware FIO nachbauen, nur besser. Von FIO wird nichts übernommen —
kein Name, keine Gestaltung, keine Texte; der Funktionsumfang laut fio.de dient nur zum Abgleich (ROADMAP #66–#71).

**Notarauftrag** (`src/wz-notar.js`):
- Erfasst Objekt und Grundbuch, Verkäufer und Käufer (Name, Anschrift, Kontakt, Familienstand, Güterstand), Erwerb bei
  mehreren Käufern, Kaufpreis mit beweglichen Gegenständen, Fälligkeit, Finanzierung des Käufers (Bank, Darlehen,
  Finanzierungsgrundschuld), Besitzübergang und Mietverhältnisse (nur Anzahl und Summen, keine Mieternamen), Belastungen
  Abt. II/III, Baulasten, Erschließung, Maklerprovision, Notariat, Wunschtermin, Unterlagen und weitere Vereinbarungen.
- „Aus der geöffneten Bewertung“ übernimmt Anschrift, Objektart, Grundbuch, Flurstücke, Fläche bzw. Miteigentumsanteil,
  Abt. II/III, Baulasten, Angebotspreis und Käuferprovision; den Kunden der Bewertung als Verkäufer und den Interessenten
  mit der jüngsten Reservierung bzw. dem jüngsten Kaufangebot aus der Vermarktung als Käufer (beide aus der Kundenakte).
- Prüfungen als Ampel:
  - Provision: Bei Wohnung oder Einfamilienhaus und einem Käufer als Verbraucher (§ 656b BGB) nur gleiche Teile, wenn der
    Makler für beide tätig ist (§ 656c), sonst trägt der Käufer höchstens so viel wie der Verkäufer, fällig erst nach dessen
    Zahlung (§ 656d). Zahlt nur der Käufer, ist das zulässig, wenn allein er beauftragt hat — gelber Hinweis.
  - Frist: Bei einem Verbrauchervertrag (Unternehmer verkauft an Verbraucher, z. B. Bauträger oder die Bank mit einer
    eigenen Liegenschaft) soll der Verbraucher den beabsichtigten Text im Regelfall zwei Wochen vor der Beurkundung
    erhalten (§ 17 Abs. 2a Satz 2 Nr. 2 BeurkG). Die App nennt den spätesten Tag; unter 14 Tagen rot. Beim privaten
    Verkauf ist die Frist nicht vorgeschrieben — dort nur Hinweis.
  - Hinweise: Einwilligung des Ehegatten bei Verfügung über das Vermögen im Ganzen (§ 1365 BGB), Zustimmung der Verwaltung
    beim Wohnungsverkauf, wenn die Teilungserklärung sie verlangt (§ 12 WEG). Bewegliche Gegenstände nur mit realistischem
    Zeitwert, steuerliche Fragen beim Steuerberater.
- Ausgaben: Datenblatt „Angaben für den Kaufvertragsentwurf“ (PDF, Word, Teilen), Termin als Kalenderdatei (`.ics`,
  RFC 5545, Ortszeit, Erinnerung am Vortag), Wiedervorlagen (Entwurf prüfen zum spätesten Tag, Notartermin, Übergabe),
  „Übergabeprotokoll anlegen“ mit Anschrift, Datum der Übergabe und den Namen beider Seiten, „Beim Kunden ablegen“.
- Geburtsdaten und Steuer-Identifikationsnummern erfasst die App bewusst nicht: Das Notariat erhebt sie für die Anzeige an
  das Finanzamt selbst (§ 20 GrEStG). Weniger personenbezogene Daten auf dem Gerät (Art. 5 Abs. 1 lit. c DSGVO).

**Portal-Export** (`js/portal.js` ohne Seitenbezug, `src/wz-portal.js`):
- Schreibt gesicherte Projekte mit Vermarktungsstand als ZIP: eine XML-Datei im Austauschformat OpenImmo 1.2.7 und die
  Bilder. Die Formatbeschreibung (Schema 1.2.7d vom Mai 2026) wurde mit Freigabe des Auftraggebers geladen und liegt nur
  lokal zur Prüfung — die Lizenz erlaubt keine Weitergabe, deshalb nicht im Repository. Erzeugte Beispieldateien (Haus,
  Wohnung, Büro, Wohn- und Geschäftshaus ohne Energieausweis, Gesamtbestand, leere Datei) sind gegen das Schema gültig.
  Der Name OpenImmo steht nur als Formatangabe in der Beschreibung, nicht als Name der Kachel.
- Inhalt: Objektart nach den Wertelisten (aus Gebäude- bzw. Wohnungstyp, änderbar), Anschrift, Ansprechpartner (Berater,
  aus dem Exposé), Kaufpreis oder „auf Anfrage“, Hausgeld, Käuferprovision, Flächen, Zimmer, Ausstattung, Baujahr,
  Energieausweis mit den Pflichtangaben nach § 87 GModG (wie das Exposé), Texte des Exposés, Fotoauswahl und Titelbild des
  Exposés, verfügbar ab, Denkmalschutz.
- Zahlen mit Dezimalpunkt, Texte maskiert, leere Angaben entfallen. Feste Objekt-Kennung aus der Projekt-Id: Der zweite
  Export ist eine Änderung (`aktionart="CHANGE"`), „Vom Portal nehmen“ eine Löschung (`DELETE`). „Gesamtbestand“
  (`umfang="VOLL"`) mit Rückfrage, weil das Portal dann alle anderen Objekte des Anbieters vom Markt nimmt.
- Fehlen Pflichtangaben (PLZ, Ort, Ansprechpartner mit E-Mail oder Telefon, Energieausweis), bleibt das Objekt draußen;
  fehlender Preis, Bilder, Beschreibung, Wohnfläche oder Provision sind nur Hinweise.
- Datenschutz: Ohne Freigabe der Anschrift (Vorgabe aus dem Exposé: „nur den Ort zeigen“) gehen nur PLZ und Ort hinaus —
  keine Straße, keine Koordinaten. Kundennamen enthält die Datei nicht. Hinweis zu Personen, Kennzeichen und Namen auf Fotos.
- Übertragung: Die Datei nimmt ein Portal über seine Import-Schnittstelle an (in der Regel ein FTP-Zugang, den das Portal
  einrichtet). Eine direkte Übertragung braucht einen Server — erst, wenn die App über den Server der Bank läuft
  (ROADMAP #67).

**Datenstand** (`src/wz-datenstand.js`, Regeln in `js/beratung.js`, `datenstand`):
- Rechengrundlagen der App: Baupreisindex BW (vierteljährlich; der Bericht für Mai 2026 erschien am 09.07.2026 — erwartet
  wird der nächste Wert um den 10. des zweiten Monats nach dem Berichtsmonat), Sterbetafel (jährlich im Sommer; die
  GitHub-Aktion übernimmt sie selbst), BMF-Tabelle zu § 14 BewG (im Herbst für das Folgejahr; 2026: Schreiben vom
  21.10.2025).
- Marktdaten: Bodenrichtwerte (Stichtag zu Beginn jedes zweiten Kalenderjahres, § 196 Abs. 1 Satz 4 BauGB) mit Zahl der
  Objekte in Vermarktung, deren Bewertungsstichtag davor liegt; Marktberichte des Gutachterausschusses (älter als zwei
  Jahre: prüfen); Preisindex des Wertmonitors.
- Eigene Daten: Gesamtsicherung (nie oder älter als 14 Tage mit Änderungen: fällig — wie die Erinnerung auf der
  Startseite), Liegenschaften mit Preiseinschätzung zum 31.12. (bis Ende März „bald“, danach fällig), Kunden mit
  erreichtem Datum „Löschung prüfen“, erledigte Notaraufträge nach sechs Monaten.
- Rechtsstand: Datum der Prüfung am Wortlaut, nach sechs Monaten erneut prüfen.
- Status je Eintrag (aktuell, bald prüfen, fällig, nicht hinterlegt) mit Stand, nächster Veröffentlichung, was zu tun ist
  und Quelle; Knöpfe zu Sicherung, Marktdaten, Wertmonitor, Liegenschaften, Kunden. Die Kachel auf der Startseite zeigt die
  Zahl der fälligen und bald zu prüfenden Punkte. „Dokument“ als Nachweis der Datenstände.
- Die Erscheinungstermine sind Erfahrungswerte; neue Rechengrundlagen kommen mit einer neuen Fassung der App.

**Datenbank und Sicherung:** Neuer Speicher „notar“ in der Datenbank „ia_bewertungen“ (Version 4). Die Gesamtsicherung
enthält die Notaraufträge; beim Einspielen gewinnt die neuere Fassung, beschädigte Einträge werden verworfen
(`js/daten.js`). Die Datenschutzseite beschreibt Notarauftrag und Portal-Export.

**Tests:**
- `tests/unit/portal.test.mjs`: Anschrift, Objektart und Nutzungsart, Energieträger, Energieausweis und Pflichtangaben,
  Objekt aus Feldern, Prüfung, Kennungen; die erzeugte ZIP-Datei liest Python unabhängig (`tests/referenz/pruefe_openimmo.py`)
  und der Test prüft die Reihenfolge der Elemente laut Formatbeschreibung.
- `tests/unit/notar-datenstand.test.mjs`: Kalenderdatei (CRLF, höchstens 75 Oktette je Zeile, Maskierung, Monats- und
  Jahreswechsel), Entwurfsfrist, alle Regeln des Datenstands mit Grenztagen.
- `tests/unit/daten.test.mjs`: Notaraufträge in der Sicherungsdatei.
- `tests/e2e/werkzeuge-d39.spec.mjs`: Notarauftrag aus Bewertung und Kundenakte mit Ampeln, Dokument, Kalenderdatei,
  Wiedervorlagen, Übergabeprotokoll, Sicherung hin und zurück, Löschen; Portal-Export als ZIP (Neuanlage, Änderung, vom
  Markt nehmen) mit unabhängiger Prüfung; Datenstand mit Zahl auf der Kachel und Sicherung.
- Klicktest: vier neue Bereiche (Notaraufträge, Notarauftrag, Portal-Export, Datenstand).

**Beim Prüfen behoben:**
- Klicktest am iPhone (WebKit): „Wiedervorlagen anlegen“ brach bei einem unfertigen Datum im Terminfeld ab — jetzt zählen
  nur gültige Kalenderdaten, sonst ein Hinweis.
- Die fehlende Firma des Anbieters färbte jedes Objekt rot; sie gilt für alle und wird beim Export geprüft.
- Die Unterlagen im Notarauftrag haben eine eigene Zeilenaufteilung (Haken schmal, Name breit).

## D40 (2026-10-03) — Neun neue Kacheln nach dem Vorbild einer Maklersoftware; Startseite nach Bereichen; Farbschemata

**Auftrag:** Die Nacht durch an der App arbeiten, FIO als Vorbild nehmen und weitere Kacheln erstellen. Bewertungen und
Liegenschaften bleiben unverändert, ihre Kacheln dürfen höchstens verschoben werden; umgestaltet wird nur farblich. Von FIO
übernommen ist nur der Funktionsumfang als Maßstab (Kontakte, Anfragen, Gesuche, Kalender, Vorlagen, Angebotsverfahren,
Bildbearbeitung, Prozesse), kein Name, keine Gestaltung, kein Text.

**Neue Kacheln:**
- **Akquise** (`src/wz-vorgaenge.js`): Eigentümer vom Erstkontakt bis zum Auftrag — Quelle, Anlass, Objektart, Ort, grob
  geschätzter Wert, Status, Verlauf, Wiedervorlage, Termin, „Bewertung beginnen“ (bestehender Ablauf der Kundenakte).
  Übersicht als Spalten je Status mit Summe der Objektwerte und Provision zum eingestellten Satz; Auswertung je Quelle.
- **Interessenten** (gleiche Datei): Anfragen zu Objekten in Vermarktung — Quelle, Status bis Kauf oder Absage mit Grund,
  Verlauf, „Exposé versendet“, Besichtigung im Kalender, Schreiben aus den Vorlagen, Gebot erfassen. **Abgleich:** alle
  Suchprofile der Kundenakte gegen alle Objekte in Vermarktung (Regeln der Käuferkartei), ohne Kunden, die zum Objekt schon eine
  Anfrage haben; mit Hinweis, ob eine Einwilligung zur Werbung vorliegt (§ 7 UWG). **Auswertung:** Trichter je Quelle und je
  Objekt — wie viele Anfragen jede Stufe mindestens erreicht haben (eine Absage nach der Besichtigung zählt als Besichtigung).
- **Bieterverfahren** (`src/wz-bieter.js`): Frist, Mindestgebot, Regeln für die Bieter (Gebote unverbindlich, Eigentümer
  entscheidet frei, Kauf erst mit dem notariellen Vertrag, § 311b Abs. 1 BGB), Gebote mit Finanzierungsstand und Bedingungen,
  Rangfolge mit Abstand zum Angebotspreis (bei Gleichstand das frühere Gebot), Wiedervorlage zur Frist, Übersicht für den
  Eigentümer ohne Namen der Bieter.
- **Fotostudio** (`js/bild.js` ohne Seitenbezug, `src/wz-foto.js`): drehen, begradigen (mit Vergrößerung ohne leere Ecken),
  zuschneiden frei oder im Seitenverhältnis, Helligkeit, Kontrast, Sättigung, Wärme, automatische Tonwertkorrektur,
  Bereiche schwärzen oder verpixeln (Personen, Kennzeichen, Namen, Unterlagen), Speichern als JPEG oder Teilen. Das Original
  bleibt unverändert; Fotos werden nicht gespeichert.
- **Vorlagen** (`src/wz-vorlagen.js`): zehn Schreiben in eigenen Worten (Exposé senden, Besichtigung bestätigen, nach der
  Besichtigung, Objekt reserviert, Unterlagen anfordern, Stand der Vermarktung, nach dem Erstkontakt, Termin zur
  Wertermittlung, Notartermin, Glückwunsch) und eigene Vorlagen. Platzhalter aus Kundenakte, Objekt, Termin und dem
  Ansprechpartner des Exposés; optionale Teile entfallen, wenn ein Wert fehlt. Kopieren, als E-Mail im Mailprogramm öffnen,
  Word, Vermerk in der Kundenakte. Die App versendet selbst nichts. Beim Exposé der Hinweis, die Widerrufsbelehrung und die
  Hinweise der Bank zum Maklervertrag beizufügen (kein eigener Rechtstext).
- **Verkaufsfahrplan** (`src/wz-fahrplan.js`): 23 Schritte in sechs Phasen (Auftrag, Unterlagen, Vermarktung, Besichtigungen,
  Notar, Übergabe). Viele erkennt die App selbst (Bewertung, Energieausweis vollständig nach § 87 GModG, Grundrisse, Fotos,
  Exposé, Preis, Portal-Export, Abgleich, Besichtigungen, Reservierung, Notarauftrag mit Stand, abgeschlossenes
  Übergabeprotokoll); die übrigen hakt der Berater ab. Maklervertrag in Textform als Schritt (§ 656a BGB, am Wortlaut geprüft).
  Fortschritt, nächster Schritt, Wiedervorlage, Übersicht für den Eigentümer.
- **Kalender** (`src/wz-kalender.js`): eigene Termine und — nur gelesen — fällige Wiedervorlagen, Notartermine, Übergaben,
  Gebotsfristen und Besichtigungen aus der Vermarktung; Liste oder Monatsblatt; Kalenderdatei für einen oder alle Termine der
  nächsten 90 Tage (RFC 5545), Kundennamen nur auf Wunsch, weil Gerätekalender oft mit einem Online-Dienst abgleichen.
- **Aushang** (`src/wz-aushang.js`): eine Seite für Schaufenster und Filiale — Titelbild, Titel, Ort (Straße nur auf Wunsch),
  Preis, Käuferprovision, Eckdaten, Kurztext, Pflichtangaben zum Energieausweis (§ 87 GModG gilt für Immobilienanzeigen in
  kommerziellen Medien), Ansprechpartner und Objektnummer; oder eine Übersicht mit bis zu vier Objekten. Fehlen
  Pflichtangaben, zeigt die Kachel sie rot. Ausgabe wie das Exposé (Drucken, PDF, Teilen).
- **Kaufen oder Mieten** (`js/beratung.js`, `kaufMiete`; `src/wz-kaufmiete.js`): monatliche Modellrechnung — Annuitätendarlehen,
  Instandhaltung mit Kostensteigerung, Wertsteigerung; Miete mit Mietsteigerung; die günstigere Seite legt den Unterschied an.
  Ergebnis je Jahr, Jahr, ab dem Kaufen dauerhaft vorn liegt, Diagramm, Dokument. Unabhängig nachgerechnet in Python
  (`tests/referenz/kaufmiete.py`, Abweichung unter 1 µ€). Vorgabe Grunderwerbsteuer Baden-Württemberg 5,0 % — als Annahme
  änderbar.

**Daten und Datenschutz:**
- Neue Speicher „termine“, „vorgaenge“ und „bieter“ in der Datenbank „ia_bewertungen“ (Version 5), Teil der
  Gesamtsicherung; beim Einspielen gewinnt die neuere Fassung, beschädigte Einträge werden verworfen (`js/daten.js`).
- Personen stehen nur in der Kundenakte, die Datensätze merken sich die Kunden-Id. Neue Personen aus Anfrage oder Akquise
  bekommen als Rechtsgrundlage die Anbahnung (Art. 6 Abs. 1 lit. b DSGVO), mit Einwilligung zur Werbung lit. a.
- Kundenakte mit Erweiterungspunkten (`src/customers.js`): Löschen eines Kunden löscht seine Anfragen, Akquise-Einträge und
  Gebote und trägt ihn aus Terminen aus; die Auskunft (Art. 15 DSGVO) führt Anfragen, Termine und Gebote auf; die Akte zeigt
  Anfragen, Akquise und Termine.
- Auswertungen und Dokumente für Eigentümer nennen keine Namen.

**Startseite und „Mehr“:** Die Kacheln von „Beratung & Werkzeuge“ stehen jetzt in vier Bereichen — Akquise & Vermarktung,
Abschluss, Beratung, Organisation — mit je eigener Farbe für Symbol und Bereichsmarke (hell und dunkel, Kontrast mindestens
5,4 : 1). Eine Liste (`src/wz-start.js`) erzeugt Startseite und „Mehr“. Die Kacheln von Bewertung, Marktüberblick,
Finanzierung und Liegenschaften darüber sind unverändert.

**Farbschemata (nur Farben):** Unter „Mehr → Darstellung“ wählt man das Farbschema — Petrol (bisher), Blau, Bordeaux,
Graphit, Waldgrün, jeweils hell und dunkel — und hell, dunkel oder wie das Gerät (`assets/farben.css`, `src/wz-farben.js`).
Jedes Schema setzt Grund, Flächen, Linien, Text und Akzent; alle Texte und Knöpfe mindestens 4,5 : 1 (nachgerechnet). Auch die
große Kachel „Neue Bewertung“ nimmt die Grundfarbe des Schemas an — Inhalt und Lage bleiben. Die Wahl wird schon im Kopf der
Seite gesetzt (kein Aufblitzen). Bericht und Exposé bleiben weiße Dokumente.

**Verknüpfungen:**
- Startseite „Heute und morgen“: eigene Termine, Notartermine, Übergaben, Gebotsfristen und fällige Wiedervorlagen der
  beiden Tage, nur wenn es welche gibt; ein Tipp öffnet den Eintrag.
- Suche (Strg K) findet auch Anfragen, Akquise-Kontakte und Termine (Gruppe „Anfragen und Termine“).
- Kundenakte: Knöpfe „Neue Anfrage“, „Akquise-Kontakt“ und „Termin“ mit diesem Kunden; darunter seine Anfragen, Kontakte
  und Termine.

**Weitere Änderungen:** Wechselt man von einem Werkzeug direkt in ein anderes (z. B. Interessent → Kalender), schließt das
alte Werkzeug sauber ab (speichern, Ansicht zurücksetzen). Neue Symbole: Brief, Eingang, Schild, Bild, Checkliste, Waage.

**Beim Prüfen behoben:**
- Kalender: Beim ersten Öffnen stieß das Laden der Termine das Neuzeichnen in einer Endlosschleife an (Seite hing) — jetzt
  warten alle Aufrufe auf dasselbe Laden; ebenso abgesichert im Datenstand.
- GitHub-Klicktest (PC) zu D39: Die Hintergrundprüfung des Datenstands lief in eine Seite, die gerade neu geladen wurde
  (`ImmoSterbetafel is not defined`) — sie startet jetzt nach dem Laden der Seite und nicht mehr beim Verlassen.
- Bieterverfahren: Die Felder des neuen Gebots und des Verfahrens schrieben in dasselbe Objekt — getrennt.

**Tests:** `tests/unit/d40.test.mjs` (Kalenderdatei mit mehreren Terminen, Monatsblatt, Trichter, Vorlagen, Bieterrang, Kaufen
oder Mieten gegen Python, Bildbearbeitung, Sicherungsdatei), `tests/e2e/werkzeuge-d40.spec.mjs` (Interessenten mit Abgleich,
Kundenakte, Kalender, Vorlage, Auskunft und Löschen; Akquise und Bieterverfahren; Fotostudio mit Schwärzen durch Ziehen;
Verkaufsfahrplan und Kaufen oder Mieten; Aushang; Farbschema; Sicherung hin und zurück), 19 Kacheln in vier Bereichen;
Klicktest mit 18 neuen Bereichen (PC und iPhone ohne Befunde).

## D41 (2026-10-03) — Besichtigungsnachweis im Termin, Kachel „Aktivitäten“

**Besichtigungsnachweis** (`src/wz-kalender.js`): Bei Terminen der Art „Besichtigung“ unterschreibt jeder eingetragene
Teilnehmer auf dem Gerät, dass ihm das Objekt gezeigt wurde — der übliche Beleg für die Nachweis- und Vermittlungstätigkeit.
Der Text ist ein Vorschlag mit Platzhaltern ({objekt}, {datum}, {berater}, {firma}) und lässt sich je Termin anpassen
(Vorgaben der Bank beachten); wer ihn nach einer Unterschrift ändert, entfernt die Unterschriften. „Nachweis als Dokument“
erzeugt das Blatt mit Unterschriften (PDF, Word, Teilen). Die Unterschriften liegen beim Termin in der Datenbank; löscht man
einen Kunden, verschwindet auch seine Unterschrift, die Auskunft nennt sie.

**Aktivitäten** (`src/wz-aktivitaeten.js`, Zeiträume in `js/beratung.js` → `zeitraum`): zählt je Woche, Monat, Quartal oder
Jahr und im Vergleich zum Vorzeitraum — Akquise (neue Eigentümer-Kontakte, Termine, erteilte Aufträge, Kontakte ohne
Auftrag), Vermarktung (neue Anfragen nach Quelle, versendete Exposés, Besichtigungen aus Kalender und Vermarktung, Gebote,
Kaufangebote, Reservierungen, Absagen), Abschluss (Notartermine, Übergaben, Käufe) und Beratung (Gesprächsnotizen nach Art,
Finanzierungsrechnungen), dazu erledigte Wiedervorlagen. Ohne Namen; als Dokument für die Vertriebssteuerung. Statuswechsel
zählen ab ihrem Datum im Verlauf.

**Tests:** Zeiträume (Kalenderwoche ab Montag, Monats-, Quartals- und Jahreswechsel, Schaltjahr) in `tests/unit/d40.test.mjs`;
Browsertests für Nachweis (Unterschrift durch Ziehen, Dokument, Textänderung) und Aktivitäten (Zählung im Monat und im
Vorzeitraum, Dokument ohne Namen); Klicktest-Bereich „Aktivitäten“.

## D42 (2026-10-03) — Kacheln „Kaufnebenkosten“ und „Provision“

**Kaufnebenkosten** (`src/wz-nebenkosten.js`, Rechnung `js/beratung.js` → `gnotkgTabelle`, `gnotkgGebuehr`, `kaufnebenkosten`,
`verkaeuferErloes`): Notar und Grundbuch rechnet die App genau nach dem Gerichts- und Notarkostengesetz statt mit einem Prozentsatz.
- Wertgebühr nach § 34 Abs. 2 GNotKG (Fassung BGBl. 2025 I Nr. 109), Tabelle B für Notare und Grundbuchämter (Kostenverzeichnis
  Teil 1 Hauptabschnitt 4 und Teil 2), auf den Cent gerundet (§ 34 Abs. 4), mindestens 15 € (§ 34 Abs. 5). Die Formel trifft alle
  92 Zeilen der Anlage 2 für beide Tabellen (Einheitstest); darüber die Stufen bis über 30 Mio. €.
- Kaufvertrag: Beurkundung 2,0 (Nr. 21100, mindestens 120 €), Vollzug 0,5 (Nr. 22110) oder — wenn das Notariat nur Bescheinigungen
  nach öffentlichem Recht einholt, etwa zum Vorkaufsrecht der Gemeinde — höchstens 50 € je Bescheinigung (Nr. 22112), Betreuung
  0,5 (Nr. 22200), XML-Strukturdaten 0,1 neben dem Vollzug, sonst 0,2, höchstens 125 € (Nr. 22114, 22115), Pauschale für Post und
  Telekommunikation 20 % der Gebühren, höchstens 20 € (Nr. 32005), geschätzte Auslagen, Umsatzsteuer (Nr. 32014). Geschäftswert ist
  der Kaufpreis (§ 47), für Vollzug und Betreuung derselbe (§§ 112, 113 Abs. 1).
- Grundschuld: Beurkundung 1,0 (Nr. 21200, mindestens 60 €) nach dem Nennbetrag (§ 53 Abs. 1), XML 0,2.
- Grundbuch (ohne Umsatzsteuer): Auflassungsvormerkung 0,5 (Nr. 14150, Wert § 45 Abs. 3), Eigentümer 1,0 (Nr. 14110), Löschung
  der Vormerkung 25 € (Nr. 14152), Grundschuld 1,0 (Nr. 14121).
- Grunderwerbsteuer: Kaufpreis ohne bewegliche Gegenstände (§§ 2, 8, 9 GrEStG), auf volle Euro abgerundet (§ 11 Abs. 2 GrEStG);
  Satz Baden-Württemberg 5 % (§ 1 GrEStFestG BW, gültig seit 05.11.2011, landesrecht-bw.de geprüft). Fälligkeit einen Monat nach
  dem Bescheid (§ 15), Eintragung erst mit der Unbedenklichkeitsbescheinigung (§ 22) — als Hinweis. Vereinbarungen über die Höhe
  der Notarkosten sind unwirksam (§ 125 GNotKG).
- Verkäufer („Was bleibt?“): Provision, Löschung der Grundschulden 0,5 nach dem Nennbetrag (Nr. 14140), Treuhandgebühr 0,5 nach
  dem Ablösebetrag zuzüglich Umsatzsteuer (Nr. 22201, § 113 Abs. 2), Vorfälligkeitsentschädigung, sonstige Kosten, Ablösung.
  Steuern auf einen Veräußerungsgewinn bleiben beim Steuerberater.
- Beispiel (Einheitstest, von Hand nachgerechnet): Kaufpreis 400.000 €, Grundschuld 320.000 € → Notar Kaufvertrag 2.967,27 €,
  Notar Grundschuld 952 €, Grundbuch 1.837,50 € — zusammen 1,44 % des Kaufpreises.

**Provision** (`src/wz-provision.js`, Rechnung `js/beratung.js` → `provisionBetrag`, `provisionPruefen`, `rechnungsnummer`):
- Je Verkauf eine Abrechnung: Objekt (aus den Bewertungen oder aus dem Notarauftrag übernommen), Art, Käufer Verbraucher,
  Kaufpreis, Tag des Kaufvertrags, aufschiebende Bedingung; je Seite Rechnungsempfänger, Maklervertrag ja/nein, Satz oder Festbetrag
  inklusive Umsatzsteuer, Rechnungsnummer und -datum, Zahlungsziel, Zahlungseingang.
- Prüfung am Wortlaut: Textform (§ 656a BGB); Doppeltätigkeit nur in gleicher Höhe, sonst unwirksam (§ 656c BGB); hat nur eine
  Seite beauftragt, trägt die andere höchstens gleich viel und zahlt erst, wenn die beauftragende gezahlt hat und das nachgewiesen
  ist (§ 656d BGB) — die App rechnet den Zahlungstermin erst ab dieser Zahlung und schreibt den Nachweis auf die Rechnung; nur bei
  Wohnung oder Einfamilienhaus und Käufer als Verbraucher (§ 656b BGB). Anspruch erst mit dem Kaufvertrag, bei aufschiebender
  Bedingung mit deren Eintritt (§ 652 Abs. 1 BGB).
- Rechnung mit den Pflichtangaben des § 14 Abs. 4 UStG (Name und Anschrift beider Seiten, Steuernummer oder USt-IdNr.,
  Ausstellungsdatum, fortlaufende Nummer, Art der Leistung, Leistungsdatum, Entgelt, Steuersatz und -betrag). Maklerleistungen
  hängen mit einem Grundstück zusammen (Abschnitt 14.2 Abs. 3 UStAE): Rechnung binnen sechs Monaten (§ 14 Abs. 2 Satz 2 UStG; die
  App warnt 30 Tage vorher) und bei Privatpersonen der Hinweis auf die zweijährige Aufbewahrungspflicht (§ 14 Abs. 4 Nr. 9,
  § 14b Abs. 1 Satz 5 UStG). Fehlen Angaben, fragt die App und zeigt einen „Entwurf“. Unternehmer als Empfänger: bis Ende 2026 noch
  Papier (§ 27 Abs. 38 UStG), danach E-Rechnung (§ 14 Abs. 2 Satz 2 Nr. 1 UStG) über das Buchungssystem der Bank — die Kachel gibt
  dafür „Angaben für die E-Rechnung“ aus, kein eigenes E-Rechnungsformat.
- Übersicht: offen, überfällig, eingegangen im Jahr; Filter; Wiedervorlage zum Zahlungstermin; der Verkaufsfahrplan hakt
  „Provision abgerechnet und eingegangen“ selbst ab.

**Daten und Datenschutz:** Neuer Speicher „abrechnungen“ (Datenbank Version 6), Teil der Gesamtsicherung, beim Einspielen
gewinnt die neuere Fassung. Die Abrechnungen enthalten Name und Anschrift der Rechnungsempfänger (für die Rechnung nötig,
Art. 6 Abs. 1 lit. b und c DSGVO). Löscht man einen Kunden, entfernt die App dort Name und Anschrift; die Auskunft aus der
Kundenakte führt die Abrechnungen auf. Gestellte Rechnungen bewahrt die Bank in ihrer Buchhaltung auf (§ 14b UStG) — die App ist
nur die Arbeitskopie. Angaben zum Rechnungsaussteller bleiben auf dem Gerät. Die Kaufnebenkosten speichern keine Namen.

**Tests:** `tests/unit/d42.test.mjs` (Anlage 2 vollständig, Stufen über 3 Mio. €, Mindest- und Höchstbeträge, Kaufnebenkosten und
Erlös von Hand nachgerechnet, Teilung und Fälligkeit, Sechsmonatsfrist, Rechnungsnummern); Browser `tests/e2e/werkzeuge-d42.spec.mjs`
(Kaufnebenkosten mit Dokument, Abrechnung mit Zahlung, Rechnung, Fahrplan, Notarauftrag, Entwurf, Kundenakte, Sicherung);
Klicktest-Bereiche „Kaufnebenkosten“, „Erlös des Verkäufers“, „Provision“, „Provisionsabrechnung“.

## D43 (2026-10-03) — Kachel „Unterlagen“

**Unterlagen** (`src/wz-unterlagen.js`): je Verkauf alle Unterlagen an einer Stelle, wie die Dokumentenverwaltung einer
Maklersoftware — nur ohne Dateiablage (die Unterlagen selbst bleiben beim Eigentümer und in der Bankakte).
- Liste nach Objektart (Einfamilienhaus, Wohnung, Mehrfamilienhaus oder Gewerbe, Grundstück ohne Gebäude; vorgewählt aus der
  Bewertung), gruppiert nach der Stelle, die sie ausstellt (Eigentümer, Grundbuchamt, Gemeinde, Baurechtsbehörde,
  Vermessungsbehörde, Landratsamt, Hausverwaltung, Bank des Eigentümers, Gutachterausschuss), mit Zweck (Exposé, Notar, Bank des
  Käufers) und Stand: offen, angefordert, liegt vor, entfällt — mit Datum und Notiz; Fortschritt als Balken.
- Was im Aufnahmebogen der gesicherten Bewertung als vorhanden angehakt ist (Grundbuchauszug, Flurkarte, Grundrisse,
  Wohnflächenberechnung, Energieausweis, Teilungserklärung, Protokolle, Hausgeldabrechnung, Mietverträge, Nebenkostenabrechnung,
  Grundsteuerbescheid, Modernisierungen, Baulasten, Altlasten), übernimmt die Kachel als „liegt vor“ (Quelle „Aufnahmebogen“).
  Die Bewertung wird nur gelesen.
- „Anfordern“ je Stelle: alle offenen Unterlagen dieser Stelle als Schreiben (Objekt, Grundbuch, Flurstück, Eigentümer, Hinweis
  auf die Vollmacht) — danach stehen sie auf „angefordert“. „Liste für den Eigentümer“: was er heraussuchen soll und was der
  Berater mit Vollmacht einholt.
- Vollmacht des Eigentümers zum Einholen von Auskünften und Unterlagen: Text mit Platzhaltern (anpassbar; Vorgaben der Bank
  beachten), Eigentümer aus der Kundenakte, Unterschrift auf dem Gerät, Dokument mit Unterschrift. Wer den Text nach der
  Unterschrift ändert, entfernt sie.
- Rechtsgrundlagen am Wortlaut geprüft: Einsicht in das Grundbuch bei berechtigtem Interesse (§ 12 Abs. 1 GBO), Ausdruck 10 €,
  amtlicher Ausdruck 20 € (Nr. 17000, 17001 KV GNotKG); das Baulastenverzeichnis führt die Gemeinde, Einsicht bei berechtigtem
  Interesse (§ 72 Abs. 3 und 4 LBO, Fassung vom 16.03.2026); Zustimmung der Verwaltung nur, wenn die Teilungserklärung sie
  verlangt (§ 12 WEG).
- Verkaufsfahrplan: „Unterlagen angefordert“, „Grundbuchauszug“, „Flurkarte“, „Baulasten“ und die Unterlagen der
  Wohnungseigentümer hakt er jetzt selbst ab; die Schritte öffnen die Kachel.

**Daten und Datenschutz:** Speicher „unterlagen“ (Datenbank Version 7), weil die Vollmacht Namen und Unterschrift enthält; Teil
der Gesamtsicherung. Löscht man den Kunden, entfernt die App Name und Unterschrift aus der Vollmacht; die Auskunft nennt sie.

**Tests:** Browser `tests/e2e/werkzeuge-d43.spec.mjs` (Aufnahmebogen, Stand, Anforderung bei der Gemeinde, Vollmacht mit
Unterschrift, Objektart, Fahrplan, Auskunft, Sicherung, Löschen); Klicktest-Bereiche „Unterlagen“ und „Unterlagen je Objekt“.
Das Unterschriftsfeld steht als `wzUnterschriftPad` in `src/werkzeuge.js` für weitere Werkzeuge bereit.

## D44 (2026-10-03) — Kachel „Social Media“

**Social Media** (`src/wz-social.js`): Bild und Begleittext je Objekt für Instagram, Facebook, LinkedIn oder den Status in
Messengern — die App veröffentlicht nichts selbst (kein Server, keine Zugänge); „Bild speichern“, „Teilen“ (Teilen-Menü des
Geräts) und „Text kopieren“.
- Quelle wie beim Aushang: gesicherte Bewertungen in Vermarktung, Titelbild und Texte des Exposés (`ahDaten`, `js/portal.js`).
- Formate: quadratisch 1080 × 1080, hoch 1080 × 1350, Story 1080 × 1920 (JPEG). Das Foto füllt die Fläche; unten ein dunkler
  Verlauf mit Titel, Ort, Eckdaten, Preis (abschaltbar, bei „Verkauft“ aus) und Pflichtangaben, oben links ein Hinweis (Neu im
  Angebot, Besichtigung, Reserviert, Verkauft, eigener Text) in der Akzentfarbe des gewählten Farbschemas.
- Pflichtangaben: Ein Beitrag in sozialen Medien ist eine Anzeige in einem kommerziellen Medium — die Angaben zum Energieausweis
  (§ 87 GModG, wie Aushang und Portal-Export) stehen im Bild und im Text; fehlen sie, zeigt die Kachel das rot.
- Text: Vorschlag aus Titel, Ort, Eckdaten, Preis mit Käuferprovision, Energieausweis, Ansprechpartner und Schlagworten; eigene
  Änderungen bleiben je Objekt gespeichert, „Vorschlag neu“ setzt zurück. Keine Kundennamen; die Anschrift nur, wenn sie im
  Exposé freigegeben ist.

**Tests:** Browser `tests/e2e/werkzeuge-d44.spec.mjs` (Titelbild im Bild, drei Formate, Hinweis „Verkauft“ ohne Preis, eigener
Text bleibt, JPEG-Datei); Klicktest-Bereich „Social Media“.

## D45 (2026-10-03) — Die neuen Kacheln greifen ineinander

Wie in einer Maklersoftware sollen Vorgänge dort auftauchen, wo man sie sucht:
- **Kalender:** neue Quelle „Zahlungsziele der Provision“ — offene Rechnungen am Tag ihres Zahlungsziels (bei § 656d BGB erst
  ab der Zahlung der beauftragenden Seite); Tippen öffnet die Abrechnung.
- **Aktivitäten:** „Provisionsrechnungen gestellt“ und „Provision eingegangen“ (Abschluss), „Unterlagen angefordert“ und
  „Unterlagen eingegangen“ (Vermarktung; was aus dem Aufnahmebogen kommt, zählt nicht).
- **Suche:** findet Provisionsabrechnungen nach Objekt, Anschrift, Rechnungsnummer und Empfänger; Gruppe „Anfragen und Termine,
  Abrechnungen“.
- **Datenstand (Speicherbegrenzung, Art. 5 Abs. 1 lit. e DSGVO):** meldet bezahlte Provisionsabrechnungen, deren letzte Zahlung
  über zwölf Monate zurückliegt (die Rechnungen bewahrt die Bank auf, § 14b UStG), und Vollmachten zu Objekten, die seit über
  sechs Monaten verkauft sind, zum Löschen. Dafür hat die Kachel „Unterlagen“ jetzt „Löschen“ (die Bewertung bleibt).

**Tests:** `tests/unit/d45.test.mjs` (Datenstand), Browser `tests/e2e/werkzeuge-d45.spec.mjs` (Kalender, Aktivitäten, Suche,
Datenstand, Löschen).

## D46 (2026-10-03) — Kachel „Rundschreiben“

**Rundschreiben** (`src/wz-rundschreiben.js`): ein Schreiben an viele, wie Serienbrief und Massen-E-Mail einer Maklersoftware.
- Empfänger: Suchkunden, deren Suchprofil zum gewählten Objekt passt (gleiche Prüfung wie der Abgleich, ohne den Eigentümer);
  alle Kunden mit Einwilligung zur Werbung; Eigentümer der Objekte in Vermarktung; oder selbst gewählt. Einzelne lassen sich
  abwählen; die Tabelle zeigt Einwilligung, E-Mail und Anschrift.
- Text aus den Vorlagen (auch eigene), Platzhalter je Empfänger; Objekt für alle.
- Serienbrief: je Empfänger mit Anschrift eine Seite mit eigener Anrede (Drucken, PDF, Word mit Seitenumbrüchen).
- E-Mail: an alle in Bcc mit neutraler Anrede „Guten Tag,“ — nur an Kunden mit Einwilligung zur Werbung, denn Werbung per E-Mail
  braucht die vorherige ausdrückliche Einwilligung (§ 7 Abs. 2 Nr. 2 UWG); am Ende der Hinweis, wie man sich abmeldet
  (§ 7 Abs. 2 Nr. 3 Buchst. c UWG). Wortlaut geprüft. Ist der Link für ein Mailprogramm zu lang: „E-Mail-Adressen kopieren“.
- „In der Kundenakte vermerken“ legt bei allen Empfängern eine Notiz „Rundschreiben“ ab. Gespeichert werden nur Auswahl
  (Kunden-Ids) und Einstellungen.

**Tests:** Browser `tests/e2e/werkzeuge-d46.spec.mjs` (Suchkunden zum Objekt, Einwilligung, Serienbrief mit einer Seite je
Empfänger, Bcc nur mit Einwilligung, Notiz in der Kundenakte); Klicktest-Bereich „Rundschreiben“.

## D47 (2026-10-03) — „Mein Jahr“ zeigt die eingegangene Provision

„Mein Jahr“ rechnet die realisierte Provision weiter aus Kaufpreis und Sätzen der verkauften Aufträge (Prognose). Neu daneben:
„Eingegangen {Jahr}“ — die Summe der Zahlungseingänge aus der Kachel „Provision“ im gewählten Jahr (Beträge inklusive
Umsatzsteuer wie die Prognose; erfasster Betrag, sonst der Rechnungsbetrag). So stehen Plan und Ist nebeneinander.

## D48 (2026-10-03) — Vier Fehler behoben, Pflichtangaben der Genossenschaft, Eigentümerbericht aus allen Quellen

Eine Prüfung der App aus fünf Blickwinkeln (FIO, andere Maklersoftware, Bankalltag, Code, Rechtsänderungen) mit Gegenprüfung
fand vier Fehler und eine fehlende Pflicht. Alle Rechtsaussagen wurden vor dem Einbau am Wortlaut geprüft.

**Eigentümerbericht** (`src/wz-eigentuemerbericht.js`, Zusammenführung `wzdVermarktung` in `src/wz-daten.js`): Der Bericht der
Bewertung liest nur deren Protokoll (`vm_daten`). Wer Anfragen in der Kachel „Interessenten“ pflegt, schickte dem Eigentümer
„0 Anfragen“; Gebote und Kalender-Besichtigungen fehlten. Neue Kachel „Eigentümerbericht“ führt Protokoll, Anfragen (Herkunft,
Exposé-Versand, Absagegrund), Besichtigungen (künftige als „geplant“) und Gebote zusammen. Doppelt Erfasstes (gleiche Art,
gleicher Tag, gleicher Kunde) zählt einmal und wird ergänzt. Ohne Namen („Interessent 1, 2, …“), Zeitraum wählbar, Einschätzung
mit Vorschlag aus den Zahlen, Wiedervorlage. Der Verkaufsfahrplan erkennt den Bericht; die Vorlage „Stand der Vermarktung“ zählt
alle Quellen. Der Bericht in der Bewertung bleibt unverändert (Umbau-Grenze).

**Sicherungserinnerung** (`pjAenderungenSeit` in `src/projects.js`): Startseite und Datenstand zählten nur Projekte und meldeten
„Gesichert.“, obwohl Kunden, Termine, Anfragen, Gebote, Abrechnungen, Unterlagen, Notaraufträge, Protokolle, Wiedervorlagen oder
Werkzeug-Eingaben geändert waren. Jetzt zählt die Erinnerung alle Daten der Gesamtsicherung und nennt sie („1 Kunde, 1 Termin“).
Die Werkzeug-Eingaben tragen dafür einen Zeitstempel (`ia_wz_geaendert`).

**Auskunft und Löschen** (Kundenakte): Notarauftrag und Übergabeprotokoll speicherten Namen ohne Bezug zur Kundenakte; sie fehlten
in der Auskunft und blieben nach dem Löschen stehen. Jetzt: Personen im Notarauftrag lassen sich „Aus der Kundenakte“ übernehmen
(Kunden-Id), das daraus angelegte Übergabeprotokoll erbt die Ids. Auskunft und Löschen finden Einträge über die Id oder — bei
älteren Einträgen — den gleichen Namen (Reihenfolge und Satzzeichen egal, `wzdNameGleich`). Beim Löschen ersetzt die App Name und
Kontaktdaten durch „(Kunde gelöscht)“ und entfernt die Unterschrift der betroffenen Seite; der Hinweis beim Löschen nennt das.

**Bodenrichtwerte** (`brwStand` in `js/beratung.js`): Die App nahm Stichtage in geraden Jahren an (01.01.2026) und zitierte
§ 196 Abs. 1 Satz 4 BauGB. Richtig: Die Regel steht in Satz 5 („zu Beginn jedes zweiten Kalenderjahres“); Baden-Württemberg legt
fest: „mindestens auf das Ende jedes geraden Kalenderjahres bis zum 30. Juni des folgenden Jahres“ (§ 12 GuAVO BW) — also
Stichtag 01.01. eines ungeraden Jahres. Für Beilstein, Ilsfeld und Abstatt ist der Gemeinsame Gutachterausschuss südwestlicher
Landkreis Heilbronn (Geschäftsstelle Eppingen) zuständig; aktueller Stichtag 01.01.2025, nächster 01.01.2027, veröffentlicht bis
30.06.2027. Zwischen Stichtag und Veröffentlichung meldet der Datenstand „bald prüfen“. Turnus je Gutachterausschuss einstellbar
(alle zwei Jahre oder jährlich), Knopf „BORIS-BW öffnen“.

**Pflichtangaben der Genossenschaft** (`src/wz-absender.js`, Prüfregeln `pflichtangabenPruefen` in `js/beratung.js`):
§ 25a Abs. 1 GenG verlangt auf Geschäftsbriefen „gleichviel welcher Form“ an einen bestimmten Empfänger — auch E-Mails
(BT-Drs. 16/960 S. 48) — Rechtsform und Sitz, Registergericht und Registernummer, alle Vorstandsmitglieder (auch Stellvertreter,
§ 35 GenG) und den Vorsitzenden des Aufsichtsrats mit Familiennamen und mindestens einem ausgeschriebenen Vornamen. Neue Seite
„Absender und Pflichtangaben“ unter „Mehr“ mit Prüfung: fehlende Felder, Firma ohne „eG“ (§ 3 GenG), Vorname nur als Initiale,
weniger als zwei Vorstandsmitglieder (§ 24 Abs. 2 GenG). Die Rechtsform wird immer ausgeschrieben. Die Ausnahme des § 25a Abs. 2
wendet die App nicht an. Der Baustein steht unter Vorlagen (E-Mail, Zwischenablage, Word, Dokument), Rundschreiben (jede Seite des
Serienbriefs, E-Mail), Rechnung der Provision, Anforderungsschreiben und Liste der Unterlagen, Datenblatt für das Notariat,
Gebotsübersicht und Eigentümerbericht; als kompakte Zeile in der Fußzeile aller anderen Werkzeug-Dokumente. Nicht unter Aushang und
Social Media (unbestimmter Personenkreis) und nicht unter der Vollmacht (Erklärung des Eigentümers). Enthält die Signatur des
Mailprogramms die Angaben, lässt die App sie bei E-Mails und kopierten Texten weg (Bestätigung mit Datum). Die Provision übernimmt
leere Aussteller-Angaben aus dem Absender. Offen: Exposé und Bewertungsbericht (Umbau-Grenze) — Fabian entscheidet.

**Tests:** `tests/e2e/werkzeuge-d48.spec.mjs` (Bericht aus allen Quellen mit Dublettenabgleich, Pflichtangaben in E-Mail, Word,
Rechnung, Bericht und Fußzeile, Signatur-Schalter, Sicherungserinnerung, Auskunft und Löschen, Bodenrichtwert-Stichtag);
`tests/unit/d48.test.mjs` (Prüfregeln § 25a GenG, Bodenrichtwert-Turnus); `tests/unit/notar-datenstand.test.mjs` angepasst.

## D49 (2026-10-03) — Grundlagen für die nächsten Kacheln: Akten, Fristen, Erweiterungspunkte
**Datenbank Version 8** mit dem Speicher `akten`: ein Speicher für Verträge, Prüfungen und Vorgänge der Kacheln ab D49
(`wzdAkten(art, projektId)`, `wzdAkteNeu(art, felder)`). Jeder Eintrag trägt eine Art (`/^[a-z]{2,20}$/`, geprüft beim Einspielen
in `js/daten.js`); Personen stehen nur in der Kundenakte, Auskunft und Löschen melden die Kacheln selbst an. Teil der Gesamtsicherung.

**Fristen** (`js/fristen.js`, ohne Seitenbezug): Tages- und Monatsfristen nach §§ 187, 188 BGB, auf Wunsch mit § 193 BGB (Samstag,
Sonntag, Feiertag → nächster Werktag). Feiertage Baden-Württemberg nach § 1 Feiertagsgesetz BW und der 3. Oktober; Gründonnerstag,
Reformationstag, Buß- und Bettag zählen nicht (nur kirchliche Feiertage, § 2 FTG). Ostersonntag nach der Gaußschen Osterformel.

**Erweiterungspunkte:** `ulPostenErgaenzen(projektId, posten, entfernen)` ergänzt die Unterlagen eines Verkaufs um Posten aus anderen
Kacheln (neue Stellen Nachlass-, Betreuungs-, Familiengericht, Notariat); `FP_AUTO_HOOKS` lässt Kacheln Schritte im
Verkaufsfahrplan als erkannt melden. **Tests:** `tests/unit/fristen.test.mjs`.

## D50 (2026-10-03) — Energieausweis nach dem GModG: Pflichtangaben ab 01.01.2027, Vorlage und Übergabe
Grundlage: Gesetz vom 23.07.2026 (BGBl. 2026 I Nr. 226); Art. 2 gilt ab 01.01.2027 (Art. 9 Abs. 2). Am amtlichen Regelungstext
geprüft, weil gesetze-im-internet.de § 87 noch in der alten Fassung zeigt.

**Pflichtangaben in Anzeigen** (`energiePflicht(E, heute)` in `js/portal.js`): Maßgeblich ist allein das **Ausstellungsdatum**.
Ausweise bis 31.12.2026: wie bisher Art, Endenergie (Nichtwohngebäude Wärme und Strom getrennt), Energieträger, bei Wohngebäuden
Baujahr und Klasse (§ 87 a. F., ab 2027 § 112 Abs. 3 und 4 n. F.). Ausweise ab 01.01.2027: Art nach § 81 oder § 82,
Ausstellungsdatum, Primärenergie in kWh/(m²·a), Klasse und Baujahr (auch Nichtwohngebäude), Energieträger (§ 87 n. F.). Ab
01.01.2027 ist ein fehlendes Ausstellungsdatum rot, weil die App sonst nicht entscheiden kann. Zeile für Aushang und Social Media
aus `energieZeile` (neue Ausweise: „Energieausweis nach § 82 GModG (Verbrauch) · ausgestellt am … · Primärenergie …“).

**Hinweise** (`energieHinweise`): Gültigkeit zehn Jahre (§ 79 Abs. 3; „gültig bis“ leer = ausgestellt plus zehn Jahre minus ein
Tag), abgelaufene und vor dem 01.05.2014 ausgestellte Ausweise rot; Baudenkmal ab 01.01.2027 ohne Ausnahme (§ 79 Abs. 4 n. F.,
nur noch kleine Gebäude unter 50 m², § 3 Abs. 1 Nr. 17 n. F.); Verbrauchsausweis ab 2027 nur für reine Wohngebäude (§ 82 Abs. 1 n. F.); „liegt nicht vor“
gelb mit Hinweis auf § 80 Abs. 3 und 4.

**Portal-Export:** neues Feld „Primärenergie laut Ausweis“; Export als `primaerenergiebedarf` (OpenImmo 1.2.7d, nur bei Ausweisen
nach neuem Recht), Jahrgang `2026` für Ausweise ab 01.01.2027. Aushang, Social Media und Verkaufsfahrplan lesen dieselben Angaben
(`wzdEaEinst`, `wzdEnergie`). Im Fahrplan zählt „liegt nicht vor“ nicht mehr als erledigt (Ausnahme: „nicht erforderlich“).

**Besichtigung** (Kalender): Feld „Bei dieser Besichtigung“ — Original, Kopie, Aushang oder Auslegen (§ 80 Abs. 4 Satz 1 und 2);
vergangener Termin ohne Eintrag rot (Bußgeld § 108 Abs. 1 Nr. 18). Der Besichtigungsnachweis nennt die Vorlage.
**Notarauftrag:** „Energieausweis (oder Kopie) übergeben am“; nach der Beurkundung ohne Datum rot — unverzüglich nach dem
Kaufvertrag, nicht erst bei der Übergabe (§ 80 Abs. 4 Satz 5; § 108 Abs. 1 Nr. 19).

**Offen** (Bank oder Rechtsabteilung): Ob beim Verbrauchsausweis der Primärenergie-Verbrauch anzugeben ist (§ 87 Nr. 2 n. F.
spricht vom Bedarf) — die App beschriftet neutral „Primärenergie laut Energieausweis“. Neue Ausweismuster sind noch nicht im
Bundesanzeiger (Stand 03.10.2026; Nachprüfung Dezember 2026). Baudenkmal ab 2027 nach Landesrecht nicht geprüft.

**Tests:** `tests/unit/portal.test.mjs` (drei Stichtage: alter Ausweis 2026, Ausweis vom 15.12.2026 im Jahr 2027, Ausweis vom
10.01.2027; Baudenkmal vor und nach dem 01.01.2027; XML); bisherige Tests mit festem Tag, damit sie 2027 dasselbe prüfen;
`tests/e2e/werkzeuge-d50.spec.mjs` (Aushang, Portal-Feld, Besichtigung, Notarauftrag, Fahrplan).

## D51 (2026-10-03) — Werbung je Kanal, Werbewiderspruch und Datenschutzinformation in der Kundenakte
Bisher galt die Rechtsgrundlage der Speicherung „Einwilligung“ (Art. 6 Abs. 1 lit. a DSGVO) zugleich als Erlaubnis für Werbe-E-Mails
und -Anrufe, und die Schnellerfassung setzte ein gemeinsames Häkchen für E-Mail und Telefon. Beides trennt die App jetzt
(`js/werbung.js`, Oberfläche `src/kd-werbung.js`): `k.grundlage` bleibt die Rechtsgrundlage der Speicherung, `k.werbung` hält je
Kanal fest, was der Kunde erlaubt hat. Am Wortlaut geprüft (gesetze-im-internet.de, DSGVO im Amtsblatt L 119 vom 04.05.2016).

**Kanäle:** E-Mail nur mit vorheriger ausdrücklicher Einwilligung, auch bei Unternehmern (§ 7 Abs. 2 Nr. 2 UWG), oder als
Bestandskunde mit allen Bedingungen des § 7 Abs. 3 UWG (Häkchen und Datum des Hinweises bei der Erhebung). Telefon bei
Verbrauchern nur mit ausdrücklicher Einwilligung, bei Unternehmern mutmaßlich mit Grund (§ 7 Abs. 2 Nr. 1). Post ohne Einwilligung
(Erwägungsgrund 47 DSGVO), aber nicht nach einem Widerspruch (§ 7 Abs. 1 Satz 2 UWG). Je Kanal: Stand, erteilt am, erfasst am (setzt
die App, nicht änderbar — § 7a Abs. 1 UWG), Form, Fundstelle des Nachweises im Banksystem, Zweck; Widerruf mit Datum und Weg
(Art. 7 Abs. 3 DSGVO). Ohne Form oder Fundstelle bleibt die Ampel gelb. Keine vorbelegten und keine gemeinsamen Häkchen
(Erwägungsgrund 32).

**§ 7a UWG:** Gesprächsnotizen der Art „Telefonat“ lassen sich als „werblicher Anruf“ markieren; die App rechnet die
Aufbewahrung des Nachweises — fünf Jahre ab Erteilung bzw. letzter Verwendung (§§ 187 Abs. 1, 188 Abs. 2 BGB; `js/fristen.js`),
der Widerruf beendet sie nicht. Vor dem Löschen eines Kunden fragt die App nach, ob der Nachweis im Banksystem liegt
(Art. 17 Abs. 3 lit. b DSGVO).

**Werbewiderspruch:** sperrt sofort E-Mail, Telefon und Post ohne Abwägung (Art. 21 Abs. 2 und 3 DSGVO; vorsichtige Vorgabe: jeder
Widerspruch gilt für alle Kanäle). Die App legt eine Wiedervorlage „bestätigen und in die Werbesperre der Bank eintragen“ an, fällig
einen Monat nach Eingang (Art. 12 Abs. 3). Schreiben an Eigentümer im laufenden Auftrag sind keine Werbung und bleiben möglich.

**Datenschutzinformation:** Herkunft der Daten (beim Kunden, von Dritten mit Quelle, aus der Bankbeziehung), gegeben am oder „hat
die Information schon“ mit Fundstelle. Fällig bei der Erhebung (Art. 13 Abs. 1), bei Dritten spätestens einen Monat nach Erhalt
oder beim ersten Kontakt (Art. 14 Abs. 3), bei Zweckänderung vor der Nutzung (Art. 13 Abs. 3). Ältere Akten ohne Angabe bekommen
keine rote Marke, nur einen Hinweis in der Akte.

**Umstellung:** Kunden mit der früheren Angabe „Einwilligung“ gelten für E-Mail und Telefon als eingewilligt mit dem Vermerk „aus
altem Feld übernommen“ — gelb, bis Form und Nachweis geprüft sind. Interessenten und Akquise erfassen zwei getrennte Häkchen,
die Form und „Datenschutzinformation heute gegeben“. Rundschreiben, Abgleich der Suchprofile, Wertmonitor und Auskunft lesen
das neue Modell; die Kundenliste zeigt „Werbung: E-Mail, Telefon“, „Werbesperre“ und „Datenschutzinfo fällig“.

**Offen (Bank, Datenschutzbeauftragter):** Vordrucke für Einwilligungen je Kanal und Datenschutzinformation (welche Version deckt
die Vermittlung ab); wo der § 7a-Nachweis liegt (Empfehlung: Banksystem, in der App nur die Fundstelle); ob eine bankweite
Werbeeinwilligung auch für die Vermittlung gilt; ob eine Portal-Anfrage für die Bestandskunden-Regel genügt; Übertragung in die
zentrale Werbesperre der Bank.

**Tests:** `tests/unit/werbung.test.mjs` (Kanäle, Bestandskunde, mutmaßliche Einwilligung, § 7a-Frist mit 29.02., Widerspruch,
Datenschutzinformation mit Monatsfrist und erstem Kontakt); `tests/e2e/werkzeuge-d51.spec.mjs`.

## D52 (2026-10-03) — Anfrage aus einer Anfrage-Mail übernehmen
Interessenten → „Neue Anfrage“ hat oben ein Feld für den Text einer Anfrage-Mail (Portal oder Website). `js/anfrage.js` liest die
Angaben der Form „Bezeichnung: Wert“ (Anrede, Name, E-Mail, Telefon, Anschrift, Objektnummer, Nachricht über mehrere Zeilen) und
erkennt das Portal am Text; fehlt eine Bezeichnung, sucht die App die E-Mail-Adresse im ganzen Text (ohne Absenderadressen der
Portale) und die Telefonnummer nur in Zeilen mit „Tel“, „Mobil“ oder „Handy“. Das Objekt findet sie über die Objektnummer des
Portal-Exports, einen vorhandenen Kunden über gleiche E-Mail oder Telefonnummer (dann keine zweite Akte). Alles landet nur im
Formular; gespeichert wird erst mit „Anlegen“, der eingefügte Text selbst nie. Keine Schnittstelle zum Postfach und kein Abruf beim
Portal — das braucht einen Server (später auf dem Bankserver). Die Formate der Portale sind nicht nachgebaut; die Tests nutzen frei
erfundene Mails (`tests/unit/anfrage.test.mjs`, `tests/e2e/werkzeuge-d52.spec.mjs`).

## D53 (2026-10-03) — Kachel „PDF schwärzen“
Unterlagen vor der Weitergabe unkenntlich machen (Namen Dritter, Geburtsdaten, Kontonummern, Mieterdaten), ganz auf dem Gerät. Die
Seiten zeigt pdf.js (Mozilla, Apache-2.0, `vendor/pdfjs/`, Ausgabe für ältere Browser; Herkunft und Prüfsummen in
`vendor/LIZENZEN.md`; heruntergeladen nach Rückfrage bei Fabian am 03.10.2026), geladen erst beim ersten Öffnen einer PDF, mit
`isEvalSupported: false`. Flächen: von Hand (Rechteck aufziehen) oder über die Suche im Text der PDF (Begriff, IBAN, E-Mail,
Telefon, Datum; Fläche anteilig nach Zeichen geschätzt und etwas breiter). Seiten lassen sich weglassen.

**Warum eine neue PDF aus Bildern:** Ein schwarzer Kasten über dem Text einer PDF lässt den Text darunter lesbar und kopierbar —
der häufigste Fehler beim Schwärzen. Die App rendert jede Seite (150 dpi, höchstens 2400 Pixel), malt die Flächen ins Bild und
schreibt daraus eine neue PDF (`js/pdfbild.js`: je Seite ein JPEG, keine Textebene, keine Metadaten wie Autor oder Titel). Nachteil:
nicht durchsuchbar, etwas größer. Die Original-PDF wird nicht verändert und nicht gespeichert; beim Schließen ist alles weg.
Höchstens 40 Seiten je Durchgang. Gescannte Seiten enthalten keinen Text — dort findet die Suche nichts (Hinweis in der Kachel).

**Tests:** `tests/unit/pdfbild.test.mjs` (Aufbau der PDF mit Querverweisen, keine Metadaten; Suche und Muster),
`tests/e2e/werkzeuge-d53.spec.mjs` (Text-PDF im Test erzeugt: Suche, Muster, Rechteck, Seite weglassen; die neue PDF enthält weder
den Namen noch Schrift noch Autor, pdf.js findet darin keinen Text), WebKit-Test in `tests/e2e/iphone.spec.mjs`.

## D54 (2026-10-03) — Kachel „Maklerverträge“: Abschlussweg, Textform, Belehrung und Widerrufsfrist
**Maklerverträge** (`src/wz-maklervertrag.js`, Regeln `js/maklervertrag-regeln.js`): Ob der Anspruch auf Provision steht, hängt am Maklervertrag. Bei Wohnung und Einfamilienhaus braucht er Textform (§ 656a BGB). Besteht ein Widerrufsrecht, braucht er eine ordnungsgemäße Belehrung; ohne sie ist ein Widerruf noch nach Notartermin und Zahlung möglich (BGH I ZR 30/15, I ZR 169/19, I ZR 28/22). Die neue Kachel im Bereich „Akquise & Vermarktung“ hält je Vertrag fest:
- Seite und Vertragspartner (Kunden-Id), Objekt (gesicherte Bewertung oder frei) und Art (Alleinauftrag, einfacher Auftrag, Nachweis- oder Vermittlungsvertrag)
- Verbraucher (§ 13), Provision vereinbart (§ 312 Abs. 1), Wohnung oder Einfamilienhaus (§ 656a; BGH I ZR 32/24) und Vertragsschluss
- Abschlussweg als Auswahl mit Folge:
  - Filiale ohne vorherige Ansprache außerhalb: kein Widerrufsrecht
  - beim Kunden oder nach Ansprache außerhalb: § 312b
  - nur E-Mail, Brief oder Telefon: Fernabsatz nach § 312c
  - Online-Oberfläche: zusätzlich § 312j Abs. 3/4 und § 356a
  - noch offen: Die App nimmt ein Widerrufsrecht an.
- Textform mit Form, Datum und Bestimmtheit (BGH I ZR 202/25)
- Belehrung mit Muster-Widerrufsformular: Datum, Form, Zustimmung zum dauerhaften Datenträger und Stand des Bank-Vordrucks
- Verlangen auf vorzeitigen Beginn, Bestätigung zum Erlöschen, Beginn der Tätigkeit
- Abschrift oder Bestätigung (§ 312f), Widerruf (Absendung, Eingang) und Laufzeit des Alleinauftrags

Auf der Käuferseite kommen Exposé, Link, erste Bitte um Besichtigung und Vereinbarung dazu. Die erste Bitte um Besichtigung ist der Vorschlag für den Vertragsschluss (BGH I ZR 30/15). Für das Fristende zählt das späteste Datum.

Die App rechnet:
- **Fristbeginn:** das spätere Datum von Vertragsschluss und ordnungsgemäßer Belehrung. Außerhalb der Geschäftsräume zählt die Belehrung nur auf Papier oder auf einem Datenträger mit Zustimmung, immer mit Formular.
- **Fristende:** nach §§ 187, 188, 193 BGB mit den Feiertagen in Baden-Württemberg (`ImmoFristen`).
- **Höchstfrist** nach § 356 Abs. 4 Satz 1 BGB auf beiden Rechenwegen (BGH I ZR 169/19 Rn. 35 und § 188 Abs. 2/3). Das spätere Datum gilt, danach § 193.
- **Puffer:** 5 Werktage nach dem Fristende, weil für die Frist die Absendung zählt. Das ist eine Empfehlung, keine Norm.
- **Erlöschen und Wertersatz:** Erlöschen (§ 356 Abs. 5 Nr. 2) und Wertersatz (§ 357a Abs. 2) erkennt die App nur, wenn alles dokumentiert ist.
- **Rückzahlung** nach einem Widerruf bis Eingang + 14 Tage.

Ampel zur Provision:
- Rot: Textform fehlt, Schaltfläche „zahlungspflichtig …“ nicht geprüft (BGH I ZR 159/24), Belehrung fehlt, Vertrag widerrufen.
- Rot auch, wenn der Notartermin (aus dem Notarauftrag, nur gelesen) vor dem Fristende liegt und kein Verlangen vermerkt ist.
- Gelb, solange Frist oder Puffer laufen oder der Fristbeginn beim Online-Abschluss unsicher ist.
- Sonst grün.

Die Normzitate folgen der Neufassung vom 19.06.2026 (BGBl. 2026 I Nr. 28). Bei älteren Verträgen nennt die App zusätzlich die alte Stelle. Sie weist darauf hin, wenn der Vordruck älter als die Neufassung ist. Eigene Rechtstexte gibt es nicht.

Fristen gehen als Wiedervorlagen in den Kalender. Die App legt sie nicht doppelt an und schreibt sie beim Verlassen fort. Dazu kommen ein Vermerk in der Kundenakte, ein Prüfbogen und eine Übersicht ohne Namen als Dokument. Gespeichert wird im Speicher „akten“ mit der Art „maklervertrag“, Personen nur als Kunden-Id. Auskunft und Löschen beim Kunden sind angemeldet; beim Löschen bleibt der Vermerk ohne Kunden-Id und Notiz. Der Verkaufsfahrplan erkennt den Schritt „Maklervertrag“ (FP_AUTO_HOOKS). Bewertungen, Notaraufträge und Abrechnungen werden nur gelesen.

Offen, mit Rechtsabteilung oder Verband klären: Freigabe des Belehrungs-Vordrucks, Bedeutung von „unmittelbar zuvor“, gemischte Wege, Rechenweg der Höchstfrist und ob § 193 dafür gilt, Feiertage außerhalb von BW, Laufzeitregeln des Alleinauftrags, Höhe des Wertersatzes.

**Tests:** `tests/unit/maklervertrag.test.mjs` (11 Tests mit allen Fristbeispielen der Rechtsprüfung, auch dem Schaltjahr-Sonderfall) und `tests/e2e/werkzeuge-maklervertrag.spec.mjs` (3 Abläufe).

## D55 (2026-10-03) — Kachel „Geldwäsche-Prüfung“
Als Immobilienmakler muss die Bank die Vertragsparteien des vermittelten Kaufs identifizieren, sobald ernsthaftes Interesse besteht und die Parteien feststehen (§ 11 Abs. 2 GwG; § 2 Abs. 1 Nr. 14, § 10 Abs. 6 Nr. 1); als Kreditinstitut ist sie ohnehin Verpflichtete (§ 2 Abs. 1 Nr. 1). Die Regeln wurden am Wortlaut geprüft (GwG, zuletzt geändert durch Art. 12 Abs. 4 G v. 29.06.2026).

**Kachel** (`src/wz-gwg.js`, Prüfregeln `js/gwg-regeln.js`, Speicher „akten“, Art „gwg“): ein Vorgang je Verkauf (gesicherte Bewertung), darin je Person eine Zeile — Verkäufer, Käufer, auftretende Person (Bevollmächtigter, Betreuer, Testamentsvollstrecker, Eltern, Geschäftsführer) und wirtschaftlich Berechtigter, jede Person einzeln und nur als Verweis auf die Kundenakte. Checkliste je Zeile: Identifizierung „im Banksystem erledigt“ oder „bereits früher identifiziert“ mit Vermerk (§ 11 Abs. 3, § 8 Abs. 2 Satz 6), jeweils mit Datum und Kürzel; Berechtigung der auftretenden Person (§ 10 Abs. 1 Nr. 1); wirtschaftlich Berechtigter abgefragt bzw. bei Gesellschaften beim Vertragspartner erhoben und mit dem Transparenzregister abgeglichen (Nr. 2, § 11 Abs. 5 und 6); Zweck (Nr. 3); PEP-Abgleich im Banksystem, ohne Ergebnis (Nr. 4). Der Abschluss „im Banksystem vollständig dokumentiert“ macht die Zeile grün und geht erst, wenn alles erledigt ist. Grau statt rot: Gegenseite mit eigenem Makler, mit Firmenname (§ 11 Abs. 2 Satz 2), und Mietvermittlung unter 10.000 € Nettokaltmiete (§ 10 Abs. 6 Nr. 2). Ein Datum in der Zukunft lehnt die App ab; wer nach der Übermittlung an das Notariat identifiziert wird, ist orange „nachträglich“ markiert (§ 56 Abs. 1 Satz 1 Nr. 27).

**Ampeln** (Datentabelle `REGELWERKE`): Käufer gelb bei angenommenem Gebot oder Reservierung, rot mit Notarauftrag (§ 11 Abs. 2, § 10 Abs. 9). Verkäufer gelb ab „Auftrag erteilt“ oder dem Haken „Maklervertrag“, rot ab „Reserviert“ und mit Notarauftrag (§ 10 Abs. 3 Nr. 1, § 11 Abs. 1 für das Kreditinstitut). Abgleich mit dem Notarauftrag über die Kunden-Id oder den Namen (`wzdNameGleich`): Jede Person dort braucht eine Zeile, deren Identifizierung nicht mehr offen ist. Kommt eine Person hinzu oder wechselt der Käufer, wird die Seite rot. Wechselt der Notarauftrag von „Entwurf“ auf übermittelt, warnt die App mit den fehlenden Personen; sie sperrt nicht. Die EU-Geldwäscheverordnung (AMLR, ab 10.07.2027, Auslöser: angenommenes Angebot) ist als zweites Regelwerk hinterlegt; umgestellt wird mit einer Einstellung. Der Verkaufsfahrplan erkennt den internen Schritt „Geldwäsche: alle Vertragsparteien identifiziert“ (FP_AUTO_HOOKS). Andere Kacheln wie „Wer verkauft?“ schlagen Personen über `GWG_VORSCHLAG_HOOKS` vor.

**Keine Ausweisdaten auf dem Gerät, nichts nach außen:** Für Ausweisdaten, Geburtsdaten, Staatsangehörigkeit, PEP-Ergebnis, Herkunft der Mittel und Verdacht gibt es keine Felder, auch kein Freitextfeld. Fremde Felder (z. B. aus einer eingespielten Sicherung) entfernt die App beim Öffnen (`bereinigen`). Die Aufzeichnung nach § 8 GwG liegt im Banksystem. Nach Abschluss (Provision eingegangen) schlägt die Kachel deshalb die Löschprüfung vor: Im Banksystem wird 5 Jahre ab Jahresende aufbewahrt und spätestens nach 10 Jahren vernichtet (§ 8 Abs. 3 und 4). Die Daten stehen in keinem Dokument für Dritte und in keiner Notiz (§ 47 Abs. 1). Sie erscheinen nur in der Kachel, in der Gesamtsicherung (die Sicherungserinnerung zählt sie unter „Weitere Akten“) und in der Auskunft: Rolle, Status, Datum, Kürzel. Feste Hinweise: Verdacht nur an den Geldwäschebeauftragten, nichts in der App, niemanden informieren (§ 43, § 47); Barzahlungsverbot (§ 16a Abs. 1); bei Kauf ohne Finanzierung der Zahlungsnachweis (§ 16a Abs. 2 Satz 2). Name und Telefon des Geldwäschebeauftragten sind eine Einstellung. Das Kürzel „durch wen“ wird nicht ausgewertet.

**Offen** (mit Geldwäschebeauftragtem, Datenschutz und Betriebsrat klären): Freigabe der App im GwG-Ablauf (§ 6 Abs. 2 Nr. 4); Grenzen für Gelb; ob die eG selbst vermittelt (§ 11 Abs. 3 oder § 17); Zeitpunkt beim Verkäufer (§ 11 Abs. 1 oder Abs. 2); Auslegungshinweise der BaFin; Sperre statt Warnung; das Kürzel; GwG-Status in der Auskunft; Normen vor Juli 2027 erneut prüfen.

**Tests:** `tests/unit/gwg.test.mjs` (Auslöser, Checkliste, Ausnahmen, Abgleich, nachträglich, Aufbewahrung, Regelwerk, erlaubte Felder); `tests/e2e/werkzeuge-gwg.spec.mjs` (Vorschlag und Kundenakte, Ampeln, Zukunftsdatum, Bestandskunde, eigener Makler, Gesellschaft, Notar-Abgleich mit Warnung, Fahrplan-Hook, Löschprüfung, Auskunft und Löschen, keine Daten im Eigentümerbericht, in der Fahrplan-Übersicht und im Notar-Datenblatt).

## D56 (2026-10-03) — Kachel „Tipps“: Hinweise aus Filialen, von Kollegen und Partnern
Neue Kachel „Tipps“ (`src/wz-tipps.js`, Regeln in `js/tipps-regeln.js`) im Bereich „Akquise & Vermarktung“. Je Tipp: Datum, Tippgeber, Art
(Verkaufsabsicht, Bewertungswunsch, Kaufwunsch, Vermietung), Kunde aus der Kundenakte (oder dort neu angelegt, ohne Werbe-Einwilligung),
Einverständnis des Kunden mit der Kontaktaufnahme (Datum), Stand (neu, Kontakt aufgenommen, Termin, Auftrag, Verkauf, kein Interesse; für die
Auswertung zählt die höchste erreichte Stufe), Verweis auf einen Akquise- oder Anfrage-Eintrag und die Tippgeberprämie als Stand „nach Vorgaben
der Bank“, ohne Berechnung. Der Verweis wird nur gelesen: „Akquise-Kontakt anlegen“ (bei Kaufwunsch „Anfrage anlegen“) öffnet den Entwurf der
passenden Kachel mit Kunde, Quelle (Filiale bzw. Empfehlung), Anlass und Notiz; zurück in „Tipps“ verknüpft die App den neuen Eintrag und schlägt
dessen Stand zur Übernahme vor. Speicher „akten“ mit art 'tipp', Personen nur als Kunden-Id. Die Tippgeber-Liste (Name, Filiale oder Bereich,
Art: Kundenberater, Baufinanzierung, extern; E-Mail für die Rückmeldung) liegt in den Werkzeug-Eingaben auf dem Gerät; der Tipp merkt sich die
Quelle zusätzlich, damit Datenschutzinformation und Auskunft sie auch nennen, wenn ein Tippgeber aus der Liste entfernt ist.

**Datenschutzinformation bei Dritterhebung** (vor dem Einbau am Wortlaut geprüft): längstens einen Monat nach Erlangung der Daten
(Art. 14 Abs. 3 lit. a DSGVO), spätestens beim ersten Kontakt (lit. b) und bei der ersten Weitergabe an einen anderen Empfänger, z. B. die
Baufinanzierung (lit. c). Es zählt der früheste Zeitpunkt, ein geplanter Kontakt schon. Die Monatsfrist rechnet die App vorsichtig: gleiche
Tageszahl, sonst Monatsletzter, ohne Verschiebung vom Wochenende (ob die VO 1182/71 gilt, ist offen). Ampel: gelb ab dem Tipp, rot nach
Fristende oder sobald ein Kontakt ohne Information eingetragen ist („Kontakt aufgenommen“ setzt das Datum des ersten Kontakts). Nachweis mit
Datum, Weg und Version des Bank-Vordrucks (Art. 5 Abs. 2); „bereits informiert“ nur mit Fundstelle (Art. 14 Abs. 5 lit. a, Art. 13 Abs. 4).
Wahlweise Herkunft „Daten aus der Kundenbeziehung der Bank“: Information vor der Weiterverarbeitung (Art. 13 Abs. 3), rot bis erteilt. Die
Quelle gehört in die Information (Art. 14 Abs. 2 lit. f) und in die Auskunft (Art. 15 Abs. 1 lit. g). Wiedervorlage zur Frist. Keine eigenen
Rechtstexte: Der Text der Information kommt aus dem Vordruck der Bank.

**Offen für die Bank** (als Hinweis in der Kachel): Ist ein Tipp aus der Filiale Dritterhebung (Art. 14) oder Zweckänderung (Art. 13 Abs. 3)?
Darf der Kundenberater den Tipp ohne Einverständnis des Kunden weitergeben (Bankgeheimnis)? Ohne vermerktes Einverständnis zeigt die App gelb
„mit Rechtsabteilung und Datenschutzbeauftragtem klären“. Rechtsgrundlage für Kunden, die aus einem Tipp angelegt werden (Vorgabe der
Schnellerfassung: Anbahnung, Art. 6 Abs. 1 lit. b), mit dem Datenschutzbeauftragten klären.

**Rückmeldung an den Tippgeber**: Text mit Datum, Art und Stand, ohne Einzelheiten zum Kunden; „Als E-Mail öffnen“ oder „Kopieren“, mit den
Pflichtangaben der Genossenschaft (D48). Die App merkt sich, zu welchem Stand zuletzt zurückgemeldet wurde („Rückmeldung offen“).

**Auswertung nur je Filiale, nie je Person** (Beschäftigtendatenschutz, Betriebsrat): Tipps je Filiale bis Kontakt, Termin, Auftrag und Verkauf
(Jahr oder Quartal), je Quartal mit Aufträgen und Verkäufen, je Art des Tippgebers und des Tipps; als Dokument ohne Namen. Filialen mit nur einem
Tippgeber im Zeitraum sind markiert, weil die Zeile auf eine Person schließen lässt. Keine Rangliste und keine Zahlen je Tippgeber; die Prämie
steht nicht in der Auswertung.

**Kundenakte**: Abschnitt „Tipps“ mit Quelle und „Öffnen“. Die Auskunft „TIPPS (HINWEISE AUS FILIALEN UND VON PARTNERN)“ nennt Herkunft der Daten,
Einverständnis, Datenschutzinformation, ersten Kontakt, Weitergabe mit Empfänger, Stand und Notiz. Löschen des Kunden entfernt den Personenbezug
(Kunden-Id, Notiz, Einverständnis, Kontakt- und Weitergabedaten, Datenschutzinformation, Verweis); Datum, Art, Quelle und Stand bleiben für die
Auswertung.

**Tests:** `tests/unit/tipps.test.mjs` (Fristen nach Art. 14 Abs. 3 mit den Beispielen der Rechtsprüfung, Ampeln, Prüfpunkte, Stand, Rückmeldung,
Stand aus Akquise und Anfrage, Auswertung ohne Personen); `tests/e2e/werkzeuge-tipps.spec.mjs` (Tippgeber, Tipp mit neuem Kunden, Ampeln,
Rückmeldung ohne Kundendaten, Akquise anlegen und verknüpfen, Auswertung und Dokument ohne Namen, Akte, Auskunft und Löschen); Klicktest-Bereiche
„Tipps“, „Tipps-Auswertung“, „Tippgeber“, „Tipp“; `tests/e2e/werkzeuge.spec.mjs` zählt 27 Kacheln.

## D57 (2026-10-03) — Kachel „Weitergaben“
**Weitergaben** (`src/wz-weitergabe.js`, Regeln `js/weitergabe-regeln.js` → `ImmoWeitergabeRegeln`): Kunden auf ihren Wunsch an Kollegen der Bank übergeben und verfolgen, was daraus wird.
- Anlässe: Baufinanzierung für den Kauf. Nach dem Kauf: Gebäudeversicherung, Modernisierungskredit, Bausparen, Geldanlage des Verkaufserlöses. Dazu Sonstiges.
- Stand: übergeben, Termin vereinbart, Finanzierung zugesagt (bei Anlässen ohne Finanzierung nur „zugesagt“), abgeschlossen, nicht zustande gekommen. Dazu Tag der Rückmeldung, Volumen (optional), Notiz und Verlauf.
- Einwilligung oder Wunsch des Kunden mit Datum und Form ist Pflicht vor dem Speichern. Formen: schriftlich auf dem Vordruck der Bank, elektronisch, mündlich. Grundlage: „Beruht die Verarbeitung auf einer Einwilligung, muss der Verantwortliche nachweisen können, dass die betroffene Person … eingewilligt hat“ (Art. 7 Abs. 1 DSGVO, Wortlaut geprüft).
  - Ein Entwurf wird erst gespeichert, wenn alles vollständig ist.
  - Unvollständige Änderungen an einer gespeicherten Weitergabe speichert die App nicht; beim Verlassen gilt der letzte vollständige Stand.
  - Das Datum darf nicht in der Zukunft und nicht nach der Weitergabe liegen.
  - Mündlich erteilt: gelber Hinweis, den Nachweis zu sichern.
- Ob die Einwilligung auch die Rückmeldung des Kollegen an den Berater umfasst, wird eigens festgehalten.
- Widerruf mit Datum (jederzeit möglich, Art. 7 Abs. 3 DSGVO, Wortlaut geprüft): Die Ampel wird rot, es gibt kein Übergabeblatt mehr, und die Wiedervorlage ist erledigt. Was mit bereits übergebenen Angaben geschieht, klärt der Datenschutzbeauftragte der Bank.
- Keine eigenen Einwilligungstexte: Es gilt der Vordruck der Bank.
- Übergabeblatt: Schreiben an den Kollegen mit den Pflichtangaben der Genossenschaft. Der Name steht immer darauf, alles andere nur mit Freigabe:
  - Telefon und E-Mail, Anschrift (aus der Kundenakte)
  - Ort ohne Straße, Objektart, Wohnfläche, Baujahr, Kaufpreis bzw. Angebotspreis (aus der gesicherten Bewertung, nur gelesen)
  - Anliegen, Einwilligung mit Datum und Form, „Rückmeldung bitte bis“
- Rücklauf: Wiedervorlage „Rücklauf prüfen“ 7 bis 30 Tage (Vorgabe 14) nach der Übergabe oder der letzten Rückmeldung. Fällt der Tag auf ein Wochenende oder einen Feiertag in Baden-Württemberg, gilt der nächste Werktag (`js/fristen.js`). Das ist eine Arbeitsfrist, keine gesetzliche. Die Wiedervorlage zieht mit dem Stand nach. Sie ist erledigt bei „abgeschlossen“, „nicht zustande gekommen“ oder einem Widerruf. Neu angelegt liegt sie nie vor dem heutigen Tag.
- Ansprechpartner (Name, Bereich, Filiale, Telefon, E-Mail) stehen in den Eingaben der Werkzeuge. Kollegen, die zum Anlass passen, stehen zuerst in der Auswahl. Im Entwurf lässt sich ein neuer Ansprechpartner schnell anlegen.
- Auswertung je Anlass und Stand mit Erfolgsquote und Volumen, je Jahr, auch als Dokument ohne Namen. Bewusst nicht je Kollege: keine Rangliste (Beschäftigtendatenschutz, Betriebsrat).
- Anlässe nach dem Kauf als Vorschläge, ausblendbar:
  - Quellen: beurkundete Notaraufträge, Anfragen „Gekauft“ und verkaufte Objekte der letzten zwölf Monate.
  - Käufer: Versicherung, Modernisierung, Bausparen. Verkäufer: Geldanlage.
  - Keine Aussagen zu Fristen der Versicherungen.
- Wege in die Kachel: Kundenakte („An Kollegen weitergeben“, mit Liste der Weitergaben), Übernahme einer Anfrage aus „Interessenten“, Vorschlag nach dem Kauf.
- Verkaufsfahrplan: Erkennungsschlüssel `wg_finanzierung`. Er wirkt, sobald der Schritt „Finanzierungsbestätigung des Käufers“ diesen Schlüssel trägt.

**Daten und Datenschutz:**
- Speicher „akten“ (art 'weitergabe'). Personen stehen nur als Kunden-Id darin. Teil der Gesamtsicherung.
- Kunde gelöscht: Die App entfernt den Personenbezug (Kunde, Anliegen, Notiz, Einwilligungsdaten); die Zählung bleibt.
- Die Auskunft führt alle Weitergaben mit Einwilligung, Freigaben und Stand auf.
- Erledigte Weitergaben, die älter als zwölf Monate sind, meldet die Kachel zum Entfernen des Personenbezugs.
- Hinweis an Anliegen und Notiz: keine Angaben zu Einkommen, Vermögen oder Gesundheit.

**Tests:**
- `tests/unit/weitergabe.test.mjs`: Einwilligung, Pflicht vor dem Speichern, Rücklauf mit Feiertagen, Ampeln, Freigaben, Auswertung ohne Kollegen, Vorschläge, Fahrplan, Personenbezug.
- Browser `tests/e2e/werkzeuge-weitergabe.spec.mjs`.
- Klicktest-Bereiche „Weitergaben“, „Neue Weitergabe“, „Weitergabe“.

## D58 (2026-10-03) — Kachel „Wer verkauft?“ (Verfügungsbefugnis)
Auf dem Land kommen viele Verkäufe aus Nachlässen, oft mit mehreren Erben, Betreuern oder minderjährigen Miterben. Fehlt eine Unterschrift oder Genehmigung, platzt der Notartermin oder der Vertrag bleibt schwebend unwirksam. Die neue Kachel „Wer verkauft?“ (`src/wz-befugnis.js`, Prüfregeln `js/befugnis-regeln.js` als `ImmoBefugnisRegeln`) klärt je Verkauf, wer verfügen darf und was dafür vorliegen muss. Alle Rechtsaussagen kommen aus der Rechtsprüfung vom 03.10.2026, die die Normen am Wortlaut gelesen hat. Unklares steht als grauer Hinweis „mit Notariat oder Rechtsabteilung klären“.

**Aufbau:** Ein Datensatz je Verkauf (gesicherte Bewertung) in der Gerätedatenbank, Speicher „akten“, `art: 'befugnis'`. Einstiegsfragen: (1) Lebt der eingetragene Eigentümer? (2) Wer hat geerbt: ein Erbe, mehrere Erben oder unbekannte Erben (dann Nachlasspfleger)? (3) Testamentsvollstreckung? (4) Vor- und Nacherbfolge? Vertretung (5) und Güterstand (6) werden je Person erfasst. Ein Vermerk zur Testamentsvollstreckung oder ein Nacherbenvermerk in Abt. II (Text aus Bewertung oder Notarauftrag) schaltet den Fall zu (§§ 51, 52 GBO). Ebenso ein Haken „Erbschein nennt …“ (§ 352b FamFG). Personen stehen nur als Kunden-Id darin. Gespeichert werden Rolle, Vertretung, Stand und Daten. Keine Kopien von Urkunden, keine Geburtsdaten, keine Angaben zu Krankheit oder Gründen einer Betreuung (Art. 5 Abs. 1 lit. c, Art. 9 DSGVO).

**Fälle und Ampeln:**
- **Erbengemeinschaft:** Alle Miterben müssen erfasst sein und zustimmen, die Vertretung muss geklärt sein, sonst Rot (§ 2040 Abs. 1 BGB). Bei Streit zeigt die App nur einen Hinweis auf die Teilungsversteigerung.
- **Nachweis der Erbfolge:** Gewählt werden a) bis d) (§ 35 GBO); Gelb, bis der Nachweis vorliegt. Beim Europäischen Nachlasszeugnis ist „gültig bis“ Pflicht: Gelb 30 Tage vorher, Rot nach Ablauf oder wenn der Notartermin danach liegt (Art. 70 Abs. 3 EuErbVO).
- **Erbfall:** Aus dem Datum legt die App eine Wiedervorlage an, drei Monate bevor die zwei gebührenfreien Jahre für die Grundbuchberichtigung enden (Nr. 14110 KV GNotKG).
- **Testamentsvollstrecker:** Er ist Vertragspartner. Gelb, wenn sein Nachweis mehr als 30 Tage vor der Beurkundung geprüft wurde.
- **Vorerbe:** Rot ohne Zustimmung der Nacherben oder Bestätigung des Notariats.
- **Kaufpreis:** Bei Testamentsvollstrecker und Vorerbe Gelb, wenn der Kaufpreis um eine Schwelle unter dem Wert der Bewertung liegt. Die Schwelle legt die Bank fest; es gibt keine Vorgabe.
- **Betreuer:** Geprüft werden Aufgabenkreis, vorläufige Betreuung und selbst genutzter Wohnraum (§ 1833 BGB).
- **Eltern:** Sorge gemeinsam oder allein. Wird das Kind vor dem Vollzug volljährig, genehmigt es selbst.
- **Bevollmächtigter:** Geprüft werden Form, Tod des Vollmachtgebers, Untersagung und § 181 BGB.
- **Interessenkonflikt:** Kauft ein naher Angehöriger des Vertreters, zeigt die App Rot (Ergänzungsbetreuer oder Ergänzungspfleger nötig).
- **Ehegatte:** Zugewinngemeinschaft mit Haken „ganzes Vermögen“ oder Gütergemeinschaft führt zum Posten „Einwilligung“, mit der Frist des § 1366 Abs. 3 BGB. Familien- und Güterstand liest die App aus dem Notarauftrag, wenn die Person dort verknüpft ist.

**Genehmigungskette** (Betreuungs-, Familien- und Nachlassgericht): Erfasst werden beantragt, Beschluss, letzte Bekanntgabe, Rechtskraftzeugnis und Mitteilung an den Käufer. „Frühestens rechtskräftig“ ist die letzte Bekanntgabe plus 2 Wochen (Ende am Wochenende oder Feiertag: nächster Werktag, § 16 Abs. 2 FamFG, § 222 Abs. 2 ZPO) (§ 63 FamFG). Hat der Käufer aufgefordert, steht dort „Mitteilung spätestens am“ (Ablauf des zweiten Monats). Ab 14 Tagen vorher zeigt die App Rot (§ 1856 Abs. 2 BGB). Grün erst mit Rechtskraftzeugnis und Mitteilung.

**Unterlagen:** Jeder Nachweis und jede Genehmigung wird über `ulPostenErgaenzen` ein Posten in „Unterlagen“, mit den Stellen Nachlassgericht, Betreuungs- und Familiengericht, Notariat oder Eigentümer. Der Stand ist dort und hier derselbe. „Beantragt“ setzt die Genehmigung auf „angefordert“, „Beschluss“ auf „liegt vor“. Posten ohne Namen (z. B. „Miterbe 3“). Löscht man den Datensatz, verschwinden die Posten.

**Ausgabe:** Das Dokument „Für das Notariat“ zeigt Vertretene und Vertreter getrennt, mit Nachweisen, Genehmigungen und offenen Punkten. Es trägt die Pflichtangaben der Genossenschaft.

**Kundenakte:** Auskunft und Löschen sind angemeldet (`KD_AUSKUNFT_HOOKS`, `KD_LOESCH_HOOKS`). Beim Löschen verliert die Person alle Angaben im Datensatz; Vertreter, Testamentsvollstrecker und Nachlasspfleger werden ausgetragen.

**Nicht umgesetzt** (bestehende Kacheln unverändert, Umbau-Grenze):
- Ampel im Notarauftrag und Übernahme der Verkäuferdaten dorthin;
- Provision „Anspruch noch nicht entstanden“, bis die Genehmigung grün ist (die Kachel zeigt das nur als Hinweis);
- Schritt im Verkaufsfahrplan.

Die Schnittstellen `bfAmpel(projektId)` und `FP_AUTO_HOOKS` (Schlüssel `befugnis`) sind dafür bereit.

**Offen:** Ob der Vermerk „Betreuung“ ein Gesundheitsdatum ist und welche Löschfristen gelten, klärt der Datenschutzbeauftragte. Die Schwelle legt die Bank fest. Weitere offene Fragen erscheinen in der Kachel als graue Hinweise:
- Unterschriften der Erbengemeinschaft unter dem Maklervertrag;
- Genehmigung des Maklervertrags durch den Betreuer;
- Minderjähriger Miterbe;
- Voreintragung für die Finanzierungsgrundschuld;
- Auslandsbezug.

**Tests:** Einheitstests `tests/unit/befugnis.test.mjs` und Browsertest `tests/e2e/werkzeuge-befugnis.spec.mjs`:
- Erbengemeinschaft bis Grün, mit Posten in „Unterlagen“ und Dokument;
- Betreuer und Ehegatte aus dem Notarauftrag, Löschen;
- Testamentsvollstrecker aus Abt. II mit Schwelle und Erbfall-Wiedervorlage;
- Auskunft und Löschen beim Kunden.

## D59 (2026-10-03) — Kachel „Vermietet verkaufen“
**Warum:** Beim Verkauf vermieteter Wohnungen und Häuser hängen Vorkaufsrecht des Mieters, Kündigungssperrfrist und der Eintritt des Käufers in Mietvertrag und Kaution an wenigen Daten. Bisher kannte die App nur „vermietet“ im Notarauftrag.

**Was:** Neue Kachel im Bereich „Abschluss“ (`src/wz-vermietet.js`). Je Verkauf ein Eintrag im Speicher „akten“ (art `vermietet`): Mieteinheiten ohne Namen (Bezeichnung, überlassen am, Kaltmiete, Kaution mit Art und getrennter Anlage, Schriftform mit Nachträgen, Befristung oder Kündigungsverzicht, Vorauszahlung oder Abtretung), Angaben zum Objekt (Wohnungs- oder Teileigentum, begründet am, Teileigentum zu Wohnzwecken, schon einmal verkauft, erste Veräußerung, Paket oder Aufteilungsabsicht, Wohnungen im Gebäude), zum Käufer als Auswahl ohne Namen (Familien- oder Haushaltsangehöriger, gesetzlicher Erbe, Zwangsversteigerung, Käuferseite, geplante Nutzung) und zum Ablauf (Beurkundung, Übergabe, Umschreibung, Mitteilung an den Mieter, Kaution übertragen). Die Regeln stehen ohne Seitenbezug in `js/vermietet-regeln.js` (Einheitstests), die Gebietsliste der KSpVO BW als Daten in `js/vermietet-gebiete.js`.

**Ampeln:** Vorkaufsrecht (§ 577 BGB) je Mieteinheit: grün ohne Aufteilung, bei Aufteilung vor dem Einzug, bei Familienangehörigen (Abs. 1 Satz 2) oder Zwangsversteigerung (§ 471); gelb „mit Notar klären“ bei gesetzlichem Erben (§ 470), schon verkauft oder unbekannt, Paket (§ 467), Teileigentum zu Wohnzwecken (BGH VIII ZR 201/23) und fehlendem Mietbeginn; rot nach der Beurkundung, solange die Mitteilung fehlt (§ 577 Abs. 2, § 469 Abs. 1). Fristrechner: Zugang plus zwei Monate, Monatsletzter, § 193 BGB mit den Feiertagen BW (`js/fristen.js`); bis zum Ende gelb mit Countdown, danach grün; Termin im Kalender und Wiedervorlage sieben Tage vorher. Eine Ausübung zählt nur schriftlich (§ 577 Abs. 3, § 126); dann rot (§§ 464 Abs. 2, 465). Kündigungssperrfrist (§ 577a Abs. 1 und 1a): vorsichtig ab der Umschreibung, fünf Jahre in Gemeinden der KSpVO BW (Heilbronn), sonst drei (Beilstein, Ilsfeld, Abstatt); ohne gültige Liste gelb „Gebietsliste nicht aktuell“ und vorsichtig fünf Jahre; Hinweise zum Außerkrafttreten am 31.12.2026 und zu Abs. 1a. Eigenbedarf: rot während der Sperrfrist, sonst gelb mit der Kündigungsfrist nach § 573c (3, 6 oder 9 Monate), §§ 573, 574 und beim Zweifamilienhaus § 573a; Kapitalanlage grün (§ 566 Abs. 1). Kaution und Vertrag: §§ 550, 551, 566b und Abgleich mit „Kautionen gesamt“ im Notarauftrag. Nach der Umschreibung: verfrühte Mitteilung rot (§ 566e), fehlende Mitteilung gelb (§ 566 Abs. 2), Kaution nicht übertragen rot (§ 566a). „Leer verkaufen“ gelb (§ 573 Abs. 2 Nr. 3). Anzeigen: Exposé-Text der Bewertung und eingefügte Texte — „bezugsfrei“, „sofort frei“, „frei ab“ rot, fehlendes „vermietet“ und „Mietsteigerungspotenzial“ gelb (§ 558 Abs. 3).

**Verknüpfungen:** Posten für „Unterlagen“ über `ulPostenErgaenzen` (Kautionsnachweis, Mieterhöhungen der letzten drei Jahre, Nachweis der Mitteilung nach § 577 Abs. 2 nur bei Vorkaufsrecht, Nachweis der Mitteilung des Eigentumsübergangs); Verkaufsfahrplan über `FP_AUTO_HOOKS` (Schlüssel `vv_vorkauf`); Notaraufträge mit „vermietet“ stehen in der Liste mit „Anlegen“; `vvNotarHinweis` und `vvAusNotar` für den Notarauftrag. Einmalige Wiedervorlage am 15.12.2026: Neufassung der KSpVO verkündet? Bewertungen, Liegenschaften und Notaraufträge werden nur gelesen.

**Datenschutz:** Keine Namen oder Kontaktdaten der Mieter. Der Eigentümer steht nur als Kunden-Id im Eintrag; Löschen beim Kunden entfernt Verweis und Notiz, die Auskunft hat den Abschnitt „VERMIETET VERKAUFEN“. Keine eigenen Rechtstexte: Mitteilungen kommen vom Notariat oder aus den Vordrucken der Bank.

**Offen:** Die Gebietsliste enthält nur den in der Rechtsprüfung gelesenen Auszug (25 von 130 Namen); andere Gemeinden zeigen gelb, bis die Liste aus dem GBl. 2025 Nr. 146 vollständig übertragen ist. Den Entwurf ab 2027 erst nach der Verkündung übernehmen. Für Rechtsabteilung oder Notariat: fünf Jahre nach dem Außerkrafttreten, § 2 KSpVO bei § 577a Abs. 1a, Vorkaufsrecht nur beim ersten Verkauf, Veräußerung gleich Umschreibung, Verzicht des Mieters, Provision bei Ausübung, Text der Kappungsgrenzenverordnung BW, Vordrucke der Bank für beide Mitteilungen.

**Tests:** `tests/unit/vermietet.test.mjs` (Fristrechner, Gebietsliste, alle Ampeln, Anzeigen, Posten); `tests/e2e/werkzeuge-vermietet.spec.mjs` (Wohnung in Heilbronn mit Frist, Kalender, Unterlagen, Fahrplan und Dokument; Haus in Beilstein aus dem Notarauftrag mit GbR, Eigenbedarf, Kautionen und Übergang; Auskunft und Löschen).

## D60 (2026-10-03) — Kachel „Schlüsselbuch“
**Schlüsselbuch** (`src/wz-schluessel.js`, Regeln `js/schluessel-regeln.js`): je Objekt in Vermarktung, welche Schlüssel der Berater vom Eigentümer übernommen hat, an wen er sie ausgibt und wann sie zurückkommen. Das ist wie die Schlüsselverwaltung einer Maklersoftware, nur mit Quittung auf dem Gerät.
- Übernahme: Der Eigentümer kommt aus der Kundenakte, vorgewählt aus der Bewertung. Die Liste hält Art, Anzahl und Nummer der Schließanlage. Der Eigentümer unterschreibt „übergeben“, der Berater „übernommen“. Beim Unterschreiben merkt sich die App den Stand der Liste. Wer sie danach ändert, bekommt den Hinweis, neu unterschreiben zu lassen. Dokument „Übernahmequittung“ mit den Pflichtangaben der Genossenschaft.
- Ausgaben an Handwerker, Fotograf, Energieberater, Hausverwaltung, Interessent oder Sonstige. Den Empfänger wählt man aus der Kundenakte; nur Firmen gehen auch als Freitext, Interessenten immer aus der Kundenakte. Sieht ein Freitext nach einer Privatperson aus (keine Rechtsform, kein Branchenwort), meldet die Prüfung das gelb. Erfasst werden Datum, vereinbarte Rückgabe, Quittung per Unterschrift des Empfängers und Rückgabe mit Datum. Für die Rückgabe gibt es Vorschläge: am selben Tag, nächster Werktag, in einer Woche. Wochenende und Feiertage in Baden-Württemberg kommen aus `js/fristen.js`; das ist eine Vereinbarung, keine gesetzliche Frist. Dokument „Ausgabequittung“ mit Pflichtangaben.
- Ampel: Eine überfällige Rückgabe steht rot, auch in der Liste aller Objekte und in der Kundenakte des Empfängers. Gelb sind: heute fällig, keine Rückgabe vereinbart, Quittung fehlt oder passt nicht mehr. Die Wiedervorlage zur Rückgabe liegt bei Überfälligkeit auf heute.
- Bestand je Schlüssel: beim Berater, ausgegeben, zurück an den Eigentümer. „Alles beim Berater zurück an den Eigentümer“ trägt die Rückgabe ein, der Eigentümer unterschreibt.
- Übergabe an den Käufer: Die Kachel verweist nur auf das Übergabeprotokoll („Übergabeprotokoll öffnen“) und hält das Datum fest. Danach zählt, was beim Berater lag, als „an den Käufer“. Sind dann noch Schlüssel ausgegeben, steht die Prüfung rot, beim Stand „Notartermin“ gelb.
- „Dokument“: Übersicht für den Eigentümer mit Bestand und Ausgaben, Privatpersonen nur mit ihrer Rolle.
- Keine eigenen Rechtstexte. Verwahrung und Haftung regeln die Vordrucke der Bank; Unklares mit der Rechtsabteilung klären.
- Verkaufsfahrplan: meldet `schluessel_uebernommen` und `schluessel_zurueck` über `FP_AUTO_HOOKS`. Die Schritte selbst fehlen in `FP_PHASEN` noch.

**Daten und Datenschutz:** Speicher „akten“ (art 'schluessel'), ein Eintrag je Objekt, Teil der Gesamtsicherung. Personen stehen nur als Kunden-Id darin, Unterschriften als Bild; keine Ausweisdaten. Löscht man einen Kunden, entfernt die App die Verknüpfung und seine Unterschriften: als Eigentümer bei Übernahme und Rückgabe, als Empfänger die Quittung. Schlüssel, Anzahl und Daten der Ausgabe bleiben für den Bestand. Die Auskunft nennt Übernahmen und Ausgaben („SCHLÜSSELBUCH“). Die Kundenakte zeigt Schlüssel, die der Kunde gerade hat. Wiedervorlagen nennen Privatpersonen nur mit ihrer Rolle. Die Bewertung wird nur gelesen.

**Tests:** `tests/unit/schluessel.test.mjs` prüft Bestand, Status, Vorschläge mit Feiertagen in BW, fällige Rückgaben, Firma oder Privatperson, den Stand beim Unterschreiben und die Prüfpunkte. `tests/e2e/werkzeuge-schluessel.spec.mjs` prüft:
- Übernahme mit Unterschrift, geänderte Liste und Übernahmequittung
- Ausgabe an eine Firma, überfällig, mit Wiedervorlage und Ausgabequittung
- Interessent aus der Kundenakte, Rückgabe an den Eigentümer, Übergabe an den Käufer
- Fahrplan, Kundenakte, Auskunft, Löschen, Sicherung

Klicktest-Bereiche „Schlüsselbuch“ und „Schlüsselbuch je Objekt“.

## D61 (2026-10-03) — Kachel „Objektauskunft“ (Angaben des Eigentümers)
**Objektauskunft** (`src/wz-objektauskunft.js`, Regeln `js/objektauskunft-regeln.js`): Fragebogen zu Beginn des Auftrags. Der Eigentümer unterschreibt ihn auf dem Gerät. Jede Frage hat ja, nein oder unbekannt und eine Erläuterung. Die Fragen:
- bekannte Mängel, Feuchtigkeit, Schädlinge
- Umbauten; die Nachfrage „ohne Genehmigung“ entfällt bei „nein“
- Baulasten, Altlasten, Wege- und Leitungsrechte, Denkmalschutz
- Vermietung: nur Zahl der Einheiten, Nettokaltmiete und Kautionen zusammen, keine Namen der Mieter. Die Prüfung warnt bei „Herr …“ oder „Frau …“.
- bei Wohnungs- oder Teileigentum: Sonderumlagen mit dem Anteil der Wohnung und laufende Verfahren der Gemeinschaft
- Sonstiges

- **Vorbelegung** nur lesend aus der gesicherten Bewertung. Markiert ist sie mit „aus der Bewertung“, nach einer Änderung mit „aus der Bewertung, geändert“.
  - Übernommen: Mängel aus Aufnahmebogen und Objektdaten; Feuchtigkeit und Schädlinge aus Stichworten darin, verneinte Stellen nicht; Baulasten; Altlasten; Rechte aus Abt. II und „Rechte & Lasten“; Denkmalschutz; ob vermietet; Wohnungseigentum.
  - Nicht übernommen: der Standardsatz zu Baumängeln (Beobachtung des Bewerters, keine Angabe des Eigentümers); „nein“ beim Denkmalschutz (Vorgabe des Auswahlfelds, ob jemand es geprüft hat, ist nicht erkennbar); Texte zur Vermietung (sie können Namen enthalten).
  - Vorbelegt werden nur leere Antworten. Die Bewertung bleibt unverändert; der Browsertest vergleicht die gespeicherten Felder vorher und nachher.
- **Prüfung als Ampel:**
  - Rot: offene Fragen, kein Eigentümer.
  - Gelb: „ja“ ohne Erläuterung; Vermietung ohne Zahl und Summen; Namen von Mietern; Sonderumlage ohne Betrag; Umbauten ohne Genehmigung („vor dem Notartermin mit dem Notariat klären“); „unbekannt“ mit Verweis auf die passende Unterlage in der Kachel „Unterlagen“; Denkmalschutz unbekannt („bei der Gemeinde nachfragen“); vorbelegte Antworten („mit dem Eigentümer durchgehen“); Text der Bestätigung ist noch der Vorschlag der App.
  - Grün: unterschrieben.
  - Gelb nach sechs Monaten, berechnet mit der Monatsfrist nach §§ 187, 188 BGB (`ImmoFristen.fristMonate`). Das ist eine Arbeitsregel der App, keine gesetzliche Frist.
- **Unterschrift:** Die Eigentümer kommen aus der Kundenakte, mehrere sind möglich. Die Unterschriftsfelder erscheinen erst, wenn alle Fragen beantwortet sind.
  - Eine Unterschrift gilt für einen Stand: Prüfsumme über Objekt, Antworten, Mieten und Text. Beim Unterschreiben wird der Text eingefroren.
  - Danach sind die Angaben gesperrt. „Angaben ändern“ entfernt die Unterschrift. Das tut auch jede andere Änderung am Stand (z. B. aus einer Sicherung) und eine Änderung des Texts.
  - Ein Verlauf hält fest, was geschah, ohne Namen.
- **Text der Bestätigung:** ein Vorschlag der App ohne Aussagen zur Haftung. Die Bank hinterlegt ihre Vorgabe in der Kachel, mit dem Hinweis „Text mit der Rechtsabteilung abstimmen“. Je Objekt lässt er sich anpassen.
- **Dokument** für Interessenten und Akte: Fragen, Antworten, Erläuterungen, Bestätigung, Unterschrift und die Pflichtangaben der Genossenschaft (§ 25a GenG, `pflicht:true`). Ohne Unterschrift trägt es den Vermerk „Entwurf“.
- **Daten:** Speicher „akten“ mit `art:'objektauskunft'`, ein Eintrag je Objekt, Personen nur als Kunden-Id.
  - Kundenakte: Die Auskunft erscheint mit „Öffnen“.
  - Auskunft nach Art. 15 DSGVO: Abschnitt OBJEKTAUSKÜNFTE mit allen Antworten.
  - Löschen: Verweis und Unterschrift der Person werden entfernt; die übrigen Unterschriften bleiben gültig.
  - Verkaufsfahrplan: Ein Erweiterungspunkt meldet „objektauskunft“, sobald alle Eigentümer gültig unterschrieben haben.

**Tests:**
- `tests/unit/objektauskunft.test.mjs`: Vorbelegung, Fragen, Prüfung, Prüfsumme, Regel nach sechs Monaten.
- Browser `tests/e2e/werkzeuge-objektauskunft.spec.mjs`: Vorbelegung und Herkunft, Ampeln, Unterschrift und Sperre, Dokument mit Pflichtangaben, Änderung entfernt die Unterschrift, Vorgabe der Bank bleibt mit der Unterschrift eingefroren, zwei Eigentümer, Wohnungseigentum, Fahrplan, Kundenakte, Auskunft und Löschen.
- Klicktest: Bereiche „Werkzeug – Objektauskunft“ und „… je Objekt“.

## D54–D61 Zusammenführung (2026-10-03)
Die acht Kacheln sind parallel in eigenen Arbeitskopien entstanden (je Kachel Regeln in `js/*-regeln.js`, Kachel in `src/wz-*.js`,
Einheits- und Browsertests) und hier zusammengeführt:
- **Bereiche:** fünf statt vier. Neu „Objekt & Unterlagen“ (eigene Farbe Petrol-Grün): Unterlagen, Objektauskunft, Wer verkauft?,
  Vermietet verkaufen, Schlüsselbuch, Fotostudio, PDF schwärzen. Tipps und Maklerverträge stehen bei „Akquise & Vermarktung“,
  Geldwäsche-Prüfung und Weitergaben bei „Abschluss“. Bestehende Kacheln sind nur verschoben.
- **Verkaufsfahrplan:** neue Schritte mit Erkennung aus den Kacheln — Maklervertrag (jetzt erkannt), Objektauskunft, Schlüssel
  übernommen und zurück (nur mit Eintrag im Schlüsselbuch), Finanzierungsbestätigung (aus Weitergaben), Geldwäsche (nur intern:
  nicht von Hand abzuhaken und nicht in der Übersicht für den Eigentümer, § 47 Abs. 1 GwG), Verkäuferseite geklärt, Vorkaufsrecht
  des Mieters (nur mit Eintrag in „Vermietet verkaufen“).
- **Notarauftrag:** Feld „Aus anderen Kacheln“ (nur in der Ansicht, nie im Datenblatt): Geldwäsche-Prüfung offen, „Wer verkauft?“
  nicht grün, vermietet ohne Prüfung oder Vorkaufsrecht offen, rote Punkte der Maklerverträge (Widerruf, Textform, Notartermin in
  der Widerrufsfrist) — jeweils mit Knopf in die Kachel.
- **Kundenakte:** Ein Kunde aus einem Tipp bekommt die Datenschutzinformation „von Dritten“ mit Quelle (Filiale, ohne Namen von
  Beschäftigten) und Datum (Art. 14 DSGVO, D51). Der Hinweis beim Löschen nennt die neuen Kacheln.
- **Tests:** `tests/e2e/werkzeuge-d54-d61.spec.mjs` (Fahrplan, Notarauftrag, Tipp → Kundenakte); Kachelliste in
  `tests/e2e/werkzeuge.spec.mjs` mit 35 Kacheln in fünf Bereichen; Klicktest-Bereiche je Kachel.
- **Offen (Bank, Fabian):** Provision „widerrufen“ bzw. „Anspruch noch nicht entstanden“ automatisch aus Maklerverträgen und
  „Wer verkauft?“; Zahlungsweg im Notarauftrag (§ 16a GwG); vollständige Gebietsliste der Kappungs- und Kündigungssperrfrist-
  Verordnung BW (bisher nur geprüfte Gemeinden, sonst gelb); Vordrucke der Bank für Belehrung, Objektauskunft und Weitergabe.

## D62 (2026-10-03) — Unabhängige Prüfung von D48–D53: 28 bestätigte Befunde behoben
Vier Prüfer (Logik, Rechtsangaben am Wortlaut, Datenschutz, Bedienung) und je ein Gegenprüfer, der jeden Befund selbst
nachvollziehen musste. Behoben:
- **Löschen eines Kunden** bei offenem Notarauftrag oder Übergabeprotokoll: Der Editor schrieb die alten Namen zurück. Jetzt wird der
  offene Stand zuerst gesichert und danach der anonymisierte übernommen. Der Namensabgleich zählt nur noch bei Einträgen ohne
  Kunden-Id, ein einzelnes Wort (nur Nachname) genügt nicht mehr, „Muster, Erika, Probe, Max“ und „Vorname Nachname (Firma)“ treffen.
- **Werbung je Kanal:** Die Rechtsgrundlage „Einwilligung“ einer neuen Akte schaltete E-Mail- und Telefonwerbung frei — die Umstellung
  gilt nur noch für Akten aus der Zeit vor D51. Frühere Werbewidersprüche bleiben im Verlauf und in der Auskunft. Eine erteilte
  Einwilligung lässt sich nicht auf „keine“ zurücksetzen (Nachweis bleibt, § 7a UWG). Der Werbewiderspruch fragt das Eingangsdatum ab;
  die Monatsfrist läuft ab Eingang (Art. 12 Abs. 3 DSGVO). Eingaben bauen nur den Kasten neu, Notiz-Entwürfe und Fokus bleiben.
- **Rundschreiben:** Abmeldehinweis mit allen Merkmalen des § 7 Abs. 3 Nr. 4 UWG (jederzeit, nur Übermittlungskosten nach den
  Basistarifen); Notiz nur bei Kunden, die tatsächlich etwas bekommen; klare Meldung, wenn niemand einen Brief bekommen darf.
- **Energieausweis:** Ab 01.01.2027 ist ein kleines Gebäude eines „mit weniger als 50 Quadratmetern Nutzfläche“ (§ 3 Abs. 1 Nr. 17
  n. F.); Fahrplan berücksichtigt das Baudenkmal ab 2027; Verbrauchsausweis ab 2027 nur bei ausschließlicher Wohnnutzung (§ 82 Abs. 1
  n. F.), gemischt genutzte Gebäude gelb; Fundstelle ab 2027 für ältere Ausweise § 112 Abs. 3 (und 4) statt § 87; Ausstellungsdatum
  nicht doppelt gemeldet; Social Media mit getrennten Ampeln wie der Aushang.
- **PDF schwärzen:** pdf.js liegt jetzt im Offline-Cache (`scripts/build.mjs` ließ `.mjs` aus); Suchtreffer auf gedrehten Seiten und
  bei senkrechtem Text liegen richtig; Werte ausgefüllter Formularfelder werden ins Bild gezeichnet und gefunden; eine zweite PDF
  während des Ladens mischt keine Seiten mehr; wiederholte Suche meldet „schon geschwärzt“.
- **Anfrage-Mail:** Anschrift steht sichtbar im Formular; zweites Einfügen lässt keine Reste der ersten Mail.
- **Unterlagen:** Zusatzposten aus anderen Kacheln stehen auch im Anforderungsschreiben.
- **Geldwäsche im Notarauftrag:** grün nur, wenn es zu prüfende Personen gibt (nicht bei „(Kunde gelöscht)“).
Tests: `tests/e2e/werkzeuge-befunde.spec.mjs`, Ergänzungen in `tests/unit/portal.test.mjs`, `werbung.test.mjs`, `pdfbild.test.mjs`.


## D63 (2026-10-04) — Unabhängige Prüfung von D54–D61: 24 bestätigte Befunde behoben; CI-Fehler Datenstand
Vier Prüfer (Logik, Rechtsangaben am Wortlaut, Datenschutz, Bedienung) mit Gegenprüfer; behoben von sechs Agenten mit je eigenen Dateien und Tests.
- **Wer verkauft?:** In der Kachel „Wer verkauft?“ verschieben sich drei Fristen auf den nächsten Werktag, wenn sie an einem Samstag, Sonntag oder Feiertag in BW enden. Das gilt für die Mitteilung der gerichtlichen Genehmigung (§ 1856 Abs. 2 BGB) und für die Genehmigung des Ehegatten (§ 1366 Abs. 3 BGB), jeweils nach § 193 BGB, und für die Beschwerdefrist (§ 63 Abs. 2 Nr. 2, Abs. 3 FamFG) nach § 16 Abs. 2 FamFG und § 222 Abs. 2 ZPO. Den Wortlaut habe ich am 04.10.2026 auf gesetze-im-internet.de geprüft. In D58 sollte statt „letzte Bekanntgabe plus 2 Wochen (Ende am Wochenende oder Feiertag: nächster Werktag, § 16 Abs. 2 FamFG, § 222 Abs. 2 ZPO)“ stehen: „plus 2 Wochen, Ende am Wochenende oder Feiertag: nächster Werktag“. Im Notarauftrag rechnet die Ampel „Wer verkauft?“ jetzt mit dem offenen Auftrag (Termin, Kaufpreis, Familien- und Güterstand), sonst mit NO.liste. Personen-Ids aus Sicherungen werden beim Öffnen bereinigt, und Postenschlüssel stehen nur noch in escapten data-Attributen.
- **Geldwäsche-Prüfung:** Käufer und Verkäufer werden ab angenommenem Gebot, Reservierung oder Notarauftrag rot („fällig“), denn dann besteht ernsthaftes Interesse und die Vertragsparteien sind hinreichend bestimmt (§ 11 Abs. 2 Satz 1 GwG). Gelb bleibt nur als Vorwarnung für den Verkäufer ab Auftrag oder Maklervertrag; als Auslöser zählt jetzt auch der in „Maklerverträge“ erkannte Verkäufervertrag mit Textform, nicht nur der Handhaken. Der Vermerk „bereits früher identifiziert“ stützt sich auf § 11 Abs. 3 Satz 1, § 8 Abs. 2 Satz 5 GwG (nicht Satz 6); dass die Daten in keinem Dokument für Dritte und in der Eigentümer-Übersicht des Fahrplans erscheinen, begründet D55/„Zusammenführung“ künftig mit der Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO), § 47 Abs. 1 GwG nur noch beim Verdacht. Ein Datum in der Zukunft lehnt die App erst beim Verlassen des Feldes ab (beim Tippen nur Prüfpunkt „Datum liegt in der Zukunft“, Felder mit max=heute), und ein abgehakter Abschluss ohne Kürzel wird als „Kürzel „durch wen“ eintragen“ benannt. Offen bleibt die Markierung „nachträglich“ für Identifizierungen zwischen Reservierung und Notarauftrag, weil die App das Datum des Auslösers nicht speichert.
- **Maklerverträge:** Bei Abschluss über eine Online-Oberfläche ab dem 19.06.2026 gehört der Hinweis auf die Widerrufsfunktion zur ordnungsgemäßen Belehrung. Fehlt er, beginnt die Widerrufsfrist nicht, und die App rechnet mit der Höchstfrist (§ 356 Abs. 3 Satz 1, § 356 Abs. 4 Satz 1, § 356a Abs. 1 BGB; Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB). Belehrungs- und Notar-Ampel werden dann rot (§ 357a Abs. 2 BGB); die gelbe Ampel „Fristbeginn unsicher“ gilt nur noch für die fehlende Schaltfläche „Vertrag widerrufen“. Kennzahl und Ampel „nachgeholt“ nennen jetzt den Tag, ab dem die App tatsächlich rechnet: Belehrung oder spätester möglicher Vertragsschluss, das spätere Datum. Rechtsgrundlage ist § 356 Abs. 3 Satz 1 BGB: Die Frist beginnt nicht vor der Belehrung. „Fristen vormerken“ und das Verlassen der Kachel entfernen offene Wiedervorlagen, deren Frist überholt ist (z. B. nach Wegfall der Belehrung oder nach Widerruf); erledigte Einträge bleiben stehen.
- **Objektauskunft, Schlüsselbuch, Vermietet verkaufen, Löschen:** In der Objektauskunft gilt eine Unterschrift nur noch mit echten Bild-Daten (data:image/png, jpeg oder webp, base64). Andere Werte, etwa aus einer eingespielten Sicherung, entfernt die App trotz passender Prüfsumme, weil sich die Prüfsumme nachrechnen lässt. Im Dokument wird das Bild zusätzlich maskiert. wzdLoeschen hält ein ausstehendes verzögertes Speichern (wzdSpeichernBald) vor und nach dem Löschen an, damit kein Eintrag zurückgeschrieben wird. Das gilt für alle Kacheln. Das Schlüsselbuch zeigt in der Kundenakte den Rückgabestatus als Chip (überfällig rot, heute oder ohne Rückgabe gelb, nicht fällig grün), wie in D60 und docs/App-Bedienung.md beschrieben. Unter „Vermietet verkaufen“ lautet der Hinweis „leer verkaufen“ jetzt: Der Verkauf beendet den Mietvertrag nicht (§ 566 Abs. 1 BGB). Eine Verwertungskündigung setzt eine Hinderung an angemessener wirtschaftlicher Verwertung mit erheblichen Nachteilen voraus (§ 573 Abs. 2 Nr. 3 Hs. 1 BGB) und ist bei einem Verkauf im Zusammenhang mit der Begründung von Wohnungseigentum ausgeschlossen (Hs. 3). Der Wortlaut wurde am 04.10.2026 auf gesetze-im-internet.de geprüft.
- **Tipps:** Ein externer Tippgeber ist Dritter (Art. 4 Nr. 10 DSGVO). Er kennt den Kunden, deshalb bekommt er über die Eingangsbestätigung hinaus nur dann eine Rückmeldung zum Stand, wenn das Einverständnis des Kunden mit Datum vermerkt ist (Bankgeheimnis; Art. 6 Abs. 1 lit. a DSGVO). Ohne Einverständnis zeigt die App weder „Rückmeldung offen“ noch die Kennzahl, und pruefen() meldet einen gelben Prüfpunkt. Jede Rückmeldung wird mit Datum, Stand und Empfänger gespeichert und erscheint in der Auskunft (Art. 15 Abs. 1 lit. c DSGVO, Wortlaut geprüft). Ist die Datenschutzinformation im Tipp erteilt oder „bereits informiert“ mit Fundstelle vermerkt, übernimmt die App das in die Kundenakte (k.werbung.dsinfo, D51); eine eigene Eintragung der Akte überschreibt sie nicht. Umgekehrt bietet der Tipp eine Eintragung der Akte nur zur Übernahme an, und nur wenn sie nicht vor dem Tipp liegt, weil sie sonst dessen Quelle nicht nennen kann (Art. 14 Abs. 2 lit. f DSGVO).
- **Weitergaben:** „Personenbezug entfernen“ behält nur noch, was die Auswertung braucht: Anlass, Stand, Tag der Weitergabe, Tag der Rückmeldung, Volumen und den Verlauf der Stände. Objekt (projektId), Kaufpreis, Freigaben, Kollege und der Verweis auf die Wiedervorlage werden entfernt, unbekannte Felder werden nicht übernommen. Sonst wäre der Käufer über Objekt und Volumen oder über die Wiedervorlage wieder bestimmbar; Grundlage sind Datenminimierung nach Art. 5 Abs. 1 lit. c DSGVO und Erwägungsgrund 26 DSGVO (Identifizierbarkeit), beide nicht neu im Code zitiert. Beim Anonymisieren alter erledigter Weitergaben löscht die App außerdem die verknüpfte und ältere erledigte „Rücklauf prüfen“-Wiedervorlagen desselben Kunden und Anlasses; beim Löschen eines Kunden entscheidet wie bisher die Rückfrage in kdLoeschen. Folge: Eine anonymisierte Baufinanzierung zählt im Verkaufsfahrplan nicht mehr als „Finanzierungsbestätigung liegt vor“, und die Ansicht zeigt weder Objekt noch Kollegen noch ein Notizfeld.
- **Werkzeug-Rahmen** (`src/werkzeuge.js`): `zeichnen:true` an Text-, Zahl- und Datumsfeldern wurde bisher nie umgesetzt (betraf u. a. Schlüsselbuch, Weitergaben, Provision, Kalender, Bieterverfahren). Jetzt baut die Kachel beim Verlassen des Feldes neu auf — nicht beim Tippen (Chromium meldet bei Datumsfeldern jeden Zwischenstand), erst nach dem Loslassen des Zeigers (sonst ginge ein Klick verloren), Fokus und Bildlauf bleiben. Ebenso die Datumsfelder unter „Werbung und Datenschutz“ in der Kundenakte (Befund des Klicktests).
- **Datenstand** (Fehler in GitHub ab ed7c2d7): Die Prüfung kurz nach dem Start lief auf dem langsameren CI-Rechner erst nach dem Öffnen der Kachel fertig; die Kachel zeigte den alten Stand. Jetzt baut die offene Kachel neu auf, sobald eine neuere Prüfung vorliegt (Test in `tests/e2e/werkzeuge-d39.spec.mjs`).
- **Klicktest in GitHub** nur noch auf Anfrage (Actions → „Run workflow“, Feld „Bereiche“); lokal nur noch geänderte Bereiche (Wunsch von Fabian, 04.10.2026).

## D64 (2026-10-07) — Kachel „Eckdaten übernehmen“ (Objektunterlagen → neue Bewertung)
Wunsch von Fabian: alle Objektunterlagen zur Verfügung stellen, Claude liest die Eckdaten für die Bewertung heraus. Die App selbst hat
weiter keine KI und keinen Server: Claude liest die Unterlagen (im Chat oder in der Claude-App) nach der Anleitung der Kachel und liefert
eine Eckdaten-Datei (JSON, `immoapp_eckdaten: 1`); die Kachel prüft sie und legt daraus eine **neue** Bewertung an.
- **Bewertungen bleiben unverändert** (Vorgabe: Bewertungen nicht umbauen, Neues als eigene Kachel). Eine angefangene Bewertung wird vorher
  als Projekt gesichert (wie „Neue Bewertung“ aus der Kundenakte), dann beginnt ein leeres Formular (`neuOhneFrage`); nach dem Neustart
  übernimmt die Kachel die gewählten Werte (sessionStorage `ia_uebernahme`, danach gelöscht) und sichert die neue Bewertung unter einem
  freien Namen (gleicher Name → „… (Übernahme TT.MM.JJJJ)“, sonst würde „Projekt sichern“ später das falsche Projekt überschreiben).
- **Feste Feldliste** (`js/uebernahme-regeln.js`, 130 Felder): Objekt, Grundstück/Grundbuch/Planungsrecht, Gebäude, Flächen, Wohnung,
  Mieten, Energieausweis, Ausstattung, Modernisierung, Beschreibungen (Entwurf), Unterlagen, Bauteile; dazu Geschosse der BGF und Räume
  der Raumliste. **Keine Personenfelder** (Auftraggeber, Eigentümer, Mieter); Texte mit „Herr/Frau/Eheleute“ oder Geburtsdatum werden
  markiert. Auswahlfelder nur mit den Werten der Bewertung — die kopierten Listen gleicht `tests/unit/uebernahme.test.mjs` mit
  index.html und den Quelldateien ab.
- **Vorauswahl** nur für Angaben, die als sicher markiert sind, eine Quelle haben, zur Objektart passen und keinen Hinweis tragen. Alles
  andere hakt man nach Prüfung selbst an. Widersprüche, fehlende Angaben und verworfene Werte (mit Grund) stehen sichtbar dabei.
- **Modernisierung als Fakten:** Umfang und Jahr je Bauteil in den Aufnahmebogen; die Punkte nach Anlage 2 ImmoWertV setzt die vorhandene
  Übertragung des Aufnahmebogens (`auUebertragen`: vollständig = Höchstpunkte, nicht modernisiert = 0). Claude vergibt keine Punkte.
  Ebenso laufen Keller, Aufzug, Energieausweis, Fenster und Heizung des Aufnahmebogens über diese Übertragung; ausdrücklich übernommene
  Objektdaten gehen danach vor.
- **Energieausweis:** Art, Kennwert und Klasse fürs Exposé, gespiegelt in Aufnahmebogen und Objektdaten; Ausstellungsdatum, gültig bis und
  Primärenergie beim Portal-Export der neuen Bewertung (D50: das Ausstellungsdatum entscheidet über die Pflichtangaben ab 2027).
- **Zahlen** werden ohne Tausenderpunkt mit Komma geschrieben, damit `zahlLesen` sie in Betrags- und Flächenfeldern gleich liest.
- **Quellennachweis** (Angabe, Wert, Quelle, sicher; Widersprüche, Fehlendes, gelesene Unterlagen) im Speicher `akten`
  (art `uebernahme`), ohne Personen; die Datei selbst wird nicht gespeichert.
- **Datenschutz:** Was Claude liest, wird an Anthropic übertragen. Die Kachel sagt das und empfiehlt, die Verarbeitung echter
  Kundenunterlagen mit dem Datenschutzbeauftragten der Bank zu klären und bis dahin nur geschwärzte Unterlagen zu verwenden.
- Gefunden beim Bauen: `src/app-shell.js` ersetzt `pickVordruck` durch eine Fassung ohne Rückgabewert — Prüfungen auf `=== false`, nicht
  auf „falsy“. Kürzel `ed` (Eckdaten), weil `UB`/`ub…` schon dem Übergabeprotokoll gehören.
- Tests: `tests/unit/uebernahme.test.mjs` (8), `tests/e2e/werkzeuge-uebernahme.spec.mjs` (3), Klicktest-Bereiche „Werkzeug – Eckdaten …“
  (PC und iPhone ohne Befunde); synthetische Beispieldatei `tests/fixtures/eckdaten-beispiel.json`.

## D65 (2026-10-07) — Startseite: „Eckdaten übernehmen“ bei den Schnellaktionen, alle sechs gleich groß
Wunsch von Fabian: die Kachel nach oben zu „Neue Bewertung“, „Objekt erfassen“, „Finanzierung“, „Marktüberblick“ und „Liegenschaften“,
und „Neue Bewertung“ in derselben Größe wie die anderen.
- „Eckdaten übernehmen“ ist die sechste Schnellaktion (index.html) und steht unter „Mehr“ neben „Liegenschaften“; im Bereich
  „Objekt & Unterlagen“ entfällt sie (nicht doppelt). Weiterhin 35 Kacheln in den fünf Bereichen.
- „Neue Bewertung“ (`.app-hero-action`) überspannt nicht mehr die ganze Breite und hat keine größere Schrift mehr; sie bleibt nur farbig
  hervorgehoben. Am PC 3 × 2, alle Zeilen gleich hoch (`grid-auto-rows:1fr`); am Handy wie die übrigen ohne Beschreibung.

## D66 (2026-10-07) — Objektart „Wohn- und Geschäftshaus“ und Abschnitt „Gemischte Nutzung“
Wunsch von Fabian: eine fünfte Objektart für Wohnen und Gewerbe in einem Gebäude (Beispiel: Obergeschoss privat genutzt,
Erd- und Untergeschoss die Firma des Eigentümers), mit zusammengelegten Verfahren. Ausdrücklicher Wunsch → Ausnahme von „Bewertungen nicht
umbauen“: neue Objektart-Kachel und ein **eigener Abschnitt**; bestehende Abschnitte rechnen unverändert, solange er aus ist.
Geprüft am Wortlaut (gesetze-im-internet.de, 07.10.2026):
- **§ 31 Abs. 2 ImmoWertV:** Rohertrag aus den marktüblich erzielbaren Erträgen; tatsächliche nur, wenn sie marktüblich sind →
  Marktmiete je m² für eigengenutzte Teile (auch Vermietung an die eigene Firma), Übernahme in die Allgemeinen Angaben auf Knopfdruck.
- **Anlage 3 ImmoWertV (Modellansätze Bewirtschaftungskosten):** Wohnen Verwaltung je Wohnung (2021: 298 €), Instandhaltung je m²
  (2021: 11,70 €), Mietausfallwagnis 2 %; Gewerbe Verwaltung 3 % und Mietausfallwagnis 4 % des marktüblichen Rohertrags „bei reiner
  und gemischter gewerblicher Nutzung“, Instandhaltung 100 % (Büros, Praxen, Geschäfte), 50 % (SB-Verbrauchermärkte) oder 30 %
  (Lager, Logistik, Produktion) der Instandhaltung für Wohnen. Die Beträge werden jährlich nach dem Verbraucherpreisindex angepasst —
  die Wohnwerte kommen deshalb aus den Feldern „detailliert“ in ⑥ (vom Nutzer zum Stichtag gepflegt), nicht fest aus dem Code.
- **Anlage 4 ImmoWertV (NHK 2010):** 5.1 Wohnhäuser mit Mischnutzung 860/1.085/1.375 €/m² (Fußnote 9: Wohnfläche ca. 75 %, „bei
  deutlich abweichenden Nutzungsanteilen ist eine Ermittlung durch Gebäudemix sinnvoll“), 5.2 Geschäftshäuser mit Wohnungen
  890/1.375/1.720 €/m² (Fußnote 10: Wohnfläche ca. 20–25 %). Gebäudemix = Kostenkennwerte und Gesamtnutzungsdauer zweier Gebäudetypen,
  gewichtet nach dem Wohnanteil (eigene Angabe oder Wohn- zu Nutzfläche). Vorschlag mit eigener Schwelle (rund ±10 Prozentpunkte um die
  Fußnoten): ab 65 % Typ 5.1, 15–30 % Typ 5.2, sonst Gebäudemix. Der Abschnitt schreibt die Werte nach 2.2/2.3 wie ein Wechsel des
  Gebäudetyps (die Gewichtung bleibt) und zieht sie nach, wenn sich Flächen oder der Gebäudetyp ändern; „Gebäudetyp aus ①“ schaltet das ab.
- **§ 249 BewG** (Grundsteuer, nach Wohn- und Nutzfläche): Mietwohngrundstück über 80 % Wohnen, Geschäftsgrundstück über 80 %
  betrieblich, sonst gemischt genutzt; Ein- und Zweifamilienhaus auch mit Mitbenutzung unter 50 %. Nur als Orientierung angezeigt.
- **Rechenkern** (`js/kern.js`, nur mit `mx_aktiv`): Rohertrag nach Wohnen (mit Stellplätzen) und Gewerbe geteilt — aus den Mieten,
  mit Mietrolle deren Summe nach diesen Anteilen, ohne Mieten nach der Fläche; Bewirtschaftungskosten getrennt (`bwQuelle.art 'misch'`);
  Liegenschaftszins wahlweise anteilig nach Rohertrag (+ Zu-/Abschlag aus ⑥). Der „Abschlag gewerbl. Vermietung“ aus ⑥ bleibt, wie er
  ist (Vorgabe der Bank); das Gewerberisiko steckt schon im Mietausfallwagnis von 4 %.
- **Gewichtung** wie der Gebäudetyp „Wohn-/Geschäftshaus“ in der App: 40 : 60 (Substanz : Ertrag), änderbar.
- **Sichtbar** nur beim Wohn- und Geschäftshaus oder sobald der Abschnitt in der Bewertung einmal eingeschaltet war (verstecktes Feld
  `mx_sichtbar`, mit der Bewertung gespeichert) — bei Wohnhaus und Gewerbe bleibt die gewohnte Gliederung samt Nummern. Ausschalten
  lässt ihn stehen (Befund des Klicktests: sonst verschwände der Schalter unter dem Finger).
- Referenzfälle unverändert: neue Ergebnisfelder nur bei eingeschaltetem Abschnitt, Anzeigen heißen `mxo_…` statt `o_…`
  (die Charakterisierung liest alle `o_`-Ausgaben). Prüfhinweise: Gewerbefläche ohne Gewerbemiete, anteiliger Zins ohne Zinssätze,
  keine getrennten Angaben.
- Auch bei „Eckdaten übernehmen“ (D64) als Objektart `gemischt`.
- Tests: `tests/unit/misch.test.mjs` (Sollwerte von Hand), `tests/e2e/bewertung-misch.spec.mjs`, Klicktest-Bereich
  „Bewertung Wohn- und Geschäftshaus – Gemischte Nutzung“ (PC und iPhone ohne Befunde).

## D67 (2026-10-09) — Gebäudetypen für Ein-, Doppel- und Reihenhäuser genau nach NHK 2010
Anlass: Fachprüfung der ganzen App (08.10.2026); Fabian: „prüfe, wie es korrekt ist, halt dich an die NHK 2010“.
- **Geprüft** am 09.10.2026 aus drei unabhängigen Quellen mit gleichem Ergebnis (36 Typen × 5 Stufen, Gegenprüfung je Befund dreifach):
  amtliche Grafik in Anlage 4 ImmoWertV Teil II Nr. 1 (gesetze-im-internet.de, j2805-1_0090.jpg), Sachwertrichtlinie 2012 Anlage 1
  (BAnz AT 18.10.2012 B1, S. 12), Anlage 24 BewG (Regelherstellungskosten „auf Grundlage der NHK 2010 … Kostenstand 2010“).
- **Fehler:** „EFH freistehend · nicht unterkellert, DG ausgeb.“ trug die Werte der Zeile 1.02 (unterkellert, DG NICHT ausgebaut,
  545/605/695/840/1050) — Keller und Dach falsch, Kostenkennwerte 24–31 % zu niedrig. Richtig 1.21 (nur EG, 790 … 1.515) bzw. 1.31
  (EG + OG, 720 … 1.385). Der Kommentar „kreuzvalidiert“ stimmte nicht.
- **Missverständlich:** „unterkellert, DG nicht ausgeb.“ und „unterkellert, Flachdach“ trugen 1.12 und 1.13 (mit OG), die Bezeichnung
  sagte das nicht (1.02/1.03 ohne OG liegen um 5 % daneben).
- **Neu:** alle 33 verschiedenen Zeilen 1.01–3.33 (x.01 und x.11 sind in der Tabelle gleich und bilden einen Typ). Bezeichnung nach
  Hausart · Keller, Geschosse, Dach; NHK-Nummer im Feld `nr`, in der Auswahlliste („— NHK 1.21“, nach Hausart gruppiert) und in der
  Referenztabelle. Gesamtnutzungsdauer 80 Jahre (Anlage 1), alle fünf Stufen amtlich.
- **Gespeicherte Bewertungen:** Die drei gleich gebliebenen Schlüssel (EFH unterkellert DG ausgebaut, Doppel-/Reihenendhaus,
  Reihenmittelhaus) bleiben — Vorlagen, Testfälle, Fixtures unverändert. Frühere Schlüssel werden beim Öffnen umgestellt (`TYP_ALT`
  in src/base.js, `apply()` für ek_typ und den Gebäudemix, `typWert()` der Eckdaten-Übernahme). Gespeicherte Kostenkennwerte
  werden NICHT still geändert; steht beim EFH ohne Keller mit ausgebautem DG noch 545 … 1.050 in 2.3 (oder beim Anbau), nennt eine
  Prüfregel den Grund. Neuer Knopf in 2.3 „Kostenkennwerte aus dem Gebäudetyp übernehmen“ (`nhkAusTyp`, nur die Kostenkennwerte,
  ohne Gewichtung und GND) — nötig, weil eine erneute Wahl des schon gewählten Typs kein change auslöst (Befund der Gegenprüfung).
  Hand-angepasste Werte (z. B. × 1,05) erkennt die Regel nicht — dann bleibt der Typ umgestellt und die Werte sind selbst zu prüfen.
- **Ausnahme Gebäudemix (D66):** Der Abschnitt „Gemischte Nutzung“ rechnet seine Kostenkennwerte bei jedem Öffnen aus den Typen neu.
  Steht dort ein früherer Schlüssel als Wohn- oder Gewerbeteil, wird er umgestellt und der Mix sofort mit den richtigen NHK-Werten
  gerechnet (Sachwert ändert sich beim Öffnen, ohne eigenen Hinweis) — gewollt, weil der Mix nie Werte von Hand trägt.
- Prüfregel Dachgeschoss: „ausbaufähig“ gilt wie „nicht ausgebaut“ (NHK-Spalte „DG nicht ausgebaut“); vorher kein Hinweis.
- Wörter und Anfänge der Bezeichnungen („EFH“, „Doppel“, „Reihen“, „unterkellert/nicht unterkellert“, „DG ausgeb./nicht ausgeb.“,
  „Flachdach“) bleiben, weil Prüfregeln, BelWertV (§ 4 Vergleichswert bei EFH/ZFH), Portal-Export und weitere Stellen sie auswerten.
- **Offen** (nicht Teil dieser Korrektur): Korrekturfaktor 1,05 für freistehende Zweifamilienhäuser (Fußnote der Tabelle),
  Mischkalkulation bei Teilunterkellerung oder teilweise ausgebautem DG (SW-RL Nr. 4.1.1.6), Korrekturfaktoren für MFH.
