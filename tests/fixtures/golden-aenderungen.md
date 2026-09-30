# Fachliche Änderungen am Rechenkern

`tests/fixtures/golden.json` hält die Rechenergebnisse der Vergleichsfälle fest. Der Stand wurde am
2026-09-29 **vor** dem Umbau des Rechenkerns aufgenommen; der Umbau selbst war ergebnisgleich (Commit
„Rechenkern in js/kern.js ausgelagert“). Jede spätere Abweichung ist hier mit Quelle und Vorher/Nachher
belegt. Ohne Eintrag hier darf sich golden.json nicht ändern.

---

## 1. Gebäudealter bezieht sich auf den Wertermittlungsstichtag

- **Quelle:** § 4 Abs. 1 ImmoWertV 2021 — das Alter ergibt sich aus der Differenz zwischen dem
  Kalenderjahr des maßgeblichen Stichtags und dem Baujahr.
- **Fehler vorher:** Die App rechnete mit dem laufenden Kalenderjahr. Eine gespeicherte Bewertung
  änderte dadurch jedes Jahr beim Öffnen ihren Wert, und eine Bewertung auf einen zurückliegenden
  Stichtag war falsch.
- **Nachher:** Bezugsjahr ist das Jahr aus „Wertermittlungsstichtag“; ohne Stichtag wie bisher das
  laufende Jahr.
- **Beispiel** (Referenzfall Wohnhaus, Baujahr 1985, Stichtag 01.09.2026, geöffnet im Jahr 2027):
  vorher Alter 42 → Restnutzungsdauer 43,35 J; nachher Alter 41 → 43,99 J (wie am Stichtag).
  Nachgewiesen im Test `tests/unit/kern.test.mjs` („Alter bezieht sich auf das Stichtagsjahr“).
- **golden.json:** keine Änderung, weil alle Vergleichsfälle den Stichtag 2026 bzw. die feste Testuhr
  2026 verwenden.

## 2. Restnutzungsdauer bei einem Alter über der Gesamtnutzungsdauer — keine Formeländerung

- **Befund:** Die Formel der Anlage 2 ImmoWertV (RND = a·Alter²/GND − b·Alter + c·GND) ist eine nach oben
  offene Parabel. Jenseits ihres Scheitels (bei 0 Punkten ab 1,05 × GND) steigt die Restnutzungsdauer mit
  zunehmendem Alter wieder an; im Vergleichsfall `extremwerte` (Baujahr 1850, GND 80, 9 Punkte) ergeben sich
  78,93 Jahre (98,7 % der GND).
- **Prüfung:** Anlage 2 und die gefundenen Kommentierungen regeln den Fall Alter > GND nicht ausdrücklich.
  Das Modell „geht davon aus, dass die Restnutzungsdauer auf maximal 70 Prozent der jeweiligen
  Gesamtnutzungsdauer gestreckt wird“. Ein reales Verkehrswertgutachten (Referenz „ALEX99“, Alter 121,
  GND 80, 8 Punkte) wendet die Formel unbegrenzt an und kommt auf 38,41 Jahre.
- **Entscheidung:** Kein Eingriff in die Formel, weil ein Fehler nicht nachgewiesen ist. Stattdessen meldet
  die Eingabeprüfung einen Hinweis, sobald das Alter die GND übersteigt und keine Restnutzungsdauer von
  Hand gesetzt ist, und bei einem Ergebnis über 70 % der GND einen kritischen Hinweis — die Bewertung
  erscheint dann nicht unbemerkt als plausibel.
- **golden.json:** keine Änderung.

## 3. Höchst-Restnutzungsdauer im Beleihungswert je Objektart

- **Quelle:** Anlage 2 BelWertV (Höchstnutzungsdauern) — die Auswahl „Objektart“ im Abschnitt 9c.
- **Fehler vorher:** Der gewählte Wert wurde als Feldname statt als Zahl gelesen (`num('60')`) und war
  deshalb immer 0 → es galt stets 80 Jahre, auch bei Geschäfts-/Bürohaus (60), Hotel/Lager (40) und
  Freizeitimmobilie (30).
- **Nachher:** Die Auswahl wird als Zahl gelesen.
- **Beispiel:** Geschäftshaus, Restnutzungsdauer-Eingabe 70 J: vorher 70 J angesetzt, nachher auf
  60 J gekürzt (Test `tests/unit/kern.test.mjs`, „Höchst-RND im Beleihungswert“).
- **golden.json:** keine Änderung (alle Vergleichsfälle nutzen „Wohnhaus — max. 80 Jahre“).

## 4. Minuszeichen „−“ (U+2212) und Gedankenstrich werden als Minus gelesen

- **Fehler vorher:** „−3.000“ (typografisches Minus, z. B. aus einem kopierten Bericht) wurde als
  +3.000 gelesen — das Vorzeichen ging still verloren.
- **Nachher:** −, ‒ und – vor einer Zahl gelten als Minus.
- **golden.json:** keine Änderung.
