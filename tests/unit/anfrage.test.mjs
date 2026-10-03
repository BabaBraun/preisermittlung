// Einheitstests zu js/anfrage.js (D52): Anfrage-Mail lesen. Die Beispiele sind frei erfunden (keine Vorlagen der Portale), nur
// synthetische Daten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../../js/anfrage.js');

const MAIL1 = `Von: Portal <noreply@immobilienscout24.de>
Betreff: Neue Kontaktanfrage zu Ihrem Objekt

Sie haben eine neue Anfrage über ImmobilienScout24 erhalten.

Objekt-Nr.: IA-2026-007
Anrede: Frau
Vorname: Erika
Nachname: Beispiel
E-Mail: erika.beispiel@example.org
Telefon: +49 7062 123456
Straße: Musterweg 3
PLZ/Ort: 74360 Ilsfeld

Nachricht:
Guten Tag,
wir interessieren uns für das Haus.
Ist eine Besichtigung am Samstag möglich?

Viele Grüße`;

const MAIL2 = `Anfrage über Immowelt
Name: Herr Max Probe
Ihre E-Mail-Adresse: <max.probe@example.com>
Mobil: 0171 / 555 66 77
Ihre Nachricht: Bitte senden Sie mir das Exposé.
Externe Objekt-ID: IA 2026 / 012`;

test('Bezeichnungen und Nachricht über mehrere Zeilen, Portal erkannt', () => {
  const r = A.lesen(MAIL1);
  assert.deepEqual([r.quelle, r.anrede, r.vorname, r.nachname, r.email, r.telefon, r.strasse, r.plzort, r.objektnr],
    ['ImmoScout24', 'Frau', 'Erika', 'Beispiel', 'erika.beispiel@example.org', '+49 7062 123456', 'Musterweg 3', '74360 Ilsfeld', 'IA-2026-007']);
  assert.equal(r.nachricht, 'Guten Tag,\nwir interessieren uns für das Haus.\nIst eine Besichtigung am Samstag möglich?\n\nViele Grüße');
  assert.deepEqual(r.gefunden, ['Name', 'E-Mail', 'Telefon', 'Anschrift', 'Objektnummer', 'Nachricht', 'Portal']);
});

test('Name in einer Zeile mit Anrede, Adresse in spitzen Klammern, Mobilnummer', () => {
  const r = A.lesen(MAIL2);
  assert.deepEqual([r.quelle, r.anrede, r.vorname, r.nachname, r.email, r.telefon, r.objektnr], ['Immowelt', 'Herr', 'Max', 'Probe', 'max.probe@example.com', '0171 / 555 66 77', 'IA 2026 / 012']);
  assert.deepEqual(A.lesen('Name: Probe, Ida').vorname, 'Ida');
});

test('ohne Bezeichnungen: E-Mail aus dem Text (nicht die Absenderadresse des Portals), Telefon nur aus einer Zeile mit „Tel“', () => {
  const r = A.lesen('Von: noreply@immowelt.de\nHallo, bitte melden Sie sich bei ida@example.net oder Tel 07062 9876.\nObjekt 4711');
  assert.equal(r.email, 'ida@example.net'); assert.equal(r.telefon, '07062 9876');
  assert.equal(A.lesen('Preis 450000 Euro, Baujahr 1972').telefon, '');
  assert.deepEqual(A.lesen('').gefunden, []);
});

test('Objekt zur Objektnummer und vorhandener Kunde', () => {
  const liste = [{ id: 'p1', nr: 'IA-2026-007' }, { id: 'p2', nr: 'IA 2026/012' }, { id: 'p3', nr: '' }];
  assert.equal(A.objektFinden(A.lesen(MAIL1), liste, MAIL1), 'p1');
  assert.equal(A.objektFinden(A.lesen(MAIL2), liste, MAIL2), 'p2');
  assert.equal(A.objektFinden({ objektnr: '' }, liste, 'Ihr Objekt IA-2026-007 gefällt mir'), 'p1');
  assert.equal(A.objektFinden({ objektnr: 'XY-1' }, liste, ''), '');
  const kunden = [{ id: 'k1', email: 'Erika.Beispiel@example.org' }, { id: 'k2', telefon: '0171 5556677' }];
  assert.equal(A.kundeFinden(A.lesen(MAIL1), kunden).id, 'k1');
  assert.equal(A.kundeFinden(A.lesen(MAIL2), kunden).id, 'k2');
  assert.equal(A.kundeFinden({ email: '', telefon: '12' }, kunden), null);
});
