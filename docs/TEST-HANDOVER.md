# PS Umzug — Testzugang für den Inhaber (Stand 12.09.2026)

Alles unten ist eine **Testumgebung**. Alle Demo-Daten sind mit `DEMO` gekennzeichnet
und sind keine echten Mitarbeiter, Fahrzeuge oder Aufträge.

## 1. Links

| Bereich | Link |
|---|---|
| Website / Offerten-Rechner | `<Vorschau-Link>/de` und `/de/planer` |
| Kundenportal | `<Vorschau-Link>/portal` |
| Verwaltung (Admin) | `<Vorschau-Link>/admin` |
| Disposition | `<Vorschau-Link>/admin/disposition` |
| Finanzen / Zahlungen | `<Vorschau-Link>/admin/finanzen` |
| Crew-App (Handy) | `<Vorschau-Link>/crew` |
| Produktionsbereitschaft | `<Vorschau-Link>/admin/produktionsbereitschaft` |

Die Seite ist für Suchmaschinen gesperrt (kein Indexieren) bis zum Livegang.

## 2. Testzugänge — individuelle temporäre Passwörter

Jedes Konto hat ein eigenes temporäres Passwort (siehe Prüfpaket
`pruefpaket-ps-umzug.md`). Beim ersten Anmelden verlangt das Programm zwingend
ein neues, selbst gewähltes Passwort (mind. 10 Zeichen).

| E-Mail | Rolle | Sieht / darf |
|---|---|---|
| admin.demo@ps-umzug-demo.ch | Super-Admin | Alles: Preise, Recht, Firma, Einstellungen, KI, Auswertung |
| leitung.demo@ps-umzug-demo.ch | Geschäftsleitung | Kennzahlen, Preise, Freigaben, Auswertung |
| betrieb.demo@ps-umzug-demo.ch | Betriebsleitung | Aufträge, Disposition, Teams, Fahrzeuge, Vorfälle |
| disposition.demo@ps-umzug-demo.ch | Disposition | Aufträge, Disposition, Teams/Fahrzeuge, Vorschlagsassistent |
| verkauf.demo@ps-umzug-demo.ch | Verkauf | Leads, Offerten, Kunden, Postfach |
| besichtigung.demo@ps-umzug-demo.ch | Besichtigung | Besichtigungen, Inventaraufnahme, Fotos |
| finanzen.demo@ps-umzug-demo.ch | Finanzen | Rechnungen, Zahlungen, QR-Rechnung |
| team.demo@ps-umzug-demo.ch | Teamleiter | Crew-App: eigener Tagesauftrag, Status, Fotos, Unterschrift |
| fahrer.demo@ps-umzug-demo.ch | Fahrer | Crew-App: eigener Einsatz, Status |
| monteur.demo@ps-umzug-demo.ch | Möbelmonteur | Crew-App: eigener Einsatz, Status |
| reinigung.demo@ps-umzug-demo.ch | Reinigung | Crew-App: Reinigungseinsatz, Checkliste |
| kunde.demo@ps-umzug-demo.ch | Kunde | Kundenportal: Aufträge, Rechnungen, Dokumente hochladen |

Was eine Rolle tatsächlich ändern darf, entscheidet die Datenbank — auch wenn ein
Menüpunkt sichtbar ist, sind fremde Daten nicht zugänglich.

## 3. Demo-Daten

- Teams: DEMO Team Thun, DEMO Team Bern
- Mitarbeiter: 4 (Teamleiter, Fahrer, Möbelmonteure)
- Fahrzeuge: 2
- Aufträge: `PSU-JOB-2026-DJ9PVKL5` (DEMO Familie Meier, Team zugeteilt),
  `PSU-JOB-2026-HZDEDRRV` (DEMO Büro Aebi GmbH, **noch ohne Team** — zum Testen der Disposition)

## 4. Testablauf

1. **Offerte anfragen** — `/de/planer` durchklicken, Adressen, Zimmer, Termin, Optionen.
2. **Lead bearbeiten** — als Verkauf unter *Leads* öffnen, Offerte erstellen, PDF ansehen.
3. **Disposition** — als Disposition den Auftrag „DEMO Büro Aebi GmbH" wählen, den
   Vorschlagsassistenten laufen lassen (Skills, Kapazität, Fahrzeug, Konflikte) und eine
   Zuteilung freigeben. Danach erscheint das Team in der Auftragsliste.
4. **Crew-App** — als Teamleiter am Handy `/crew` öffnen: Status setzen, Fotos, Unterschrift.
5. **Finanzen** — als Finanzen eine Rechnung öffnen, QR-Zahlteil prüfen, Zahlung erfassen.
6. **Kundenportal** — als Kunde Aufträge und Rechnungen ansehen (unbezahlt/in Bearbeitung/
   bezahlt) und eigene Dokumente hochladen.

## 5. Fertig und testbar

Offerten-Rechner, Leads/Verkauf, Offerten im Pflichtformat (3 Seiten, PDF),
4-Stunden-Minimum als harte Sperre, Aufträge und Disposition mit Vorschlagsassistent,
Crew-App, Rechnungen mit Schweizer QR-Zahlteil, Zahlungsstatus im Portal,
Dokumenten-Upload, Recht/AGB, Mehrsprachigkeit DE/FR/IT/EN/AR inkl. RTL,
KI-Assistenz (Fotoinventar, Lead-Triage, Sprachnotizen, Briefing).

## 6. Offen — braucht Angaben oder Zugänge vom Inhaber

| Punkt | Was fehlt |
|---|---|
| E-Mail-Versand (offerten@/rechnung@ps-umzug.ch) | Domain-Einrichtung + DNS-Einträge, dann Testversand |
| Bank-Abgleich | QR-IBAN und Zugangsdaten der Bank für den automatischen Zahlungsabgleich |
| Preisliste 3 (CHF 210) | Schriftliche Freigabe, Teamtarif-Entscheid, genaues Aktivierungsdatum/-zeit |
| MWST-Nummer / UID | Ohne diese sind Rechnungen nicht final |
| KI-Budget | Monatslimit steht auf 0.00 — unter *KI-Assistenz → Einstellungen* setzen |
| Livegang | Produktions-URLs, Indexierung einschalten, SLA-Geheimnis erneuern |

## 7. Bekannte Kleinigkeiten

- Drei Übersetzungstexte im Admin-Dashboard fehlen noch (Fristen-Regeln).
- Echte Mitarbeiter, Teams und Fahrzeuge sind noch nicht erfasst — nur DEMO-Daten.
- Alle Beispiel-Offerten sind als *Entwurf — nicht freigegeben* markiert, solange die
  Preisliste 3 nicht freigegeben ist.
