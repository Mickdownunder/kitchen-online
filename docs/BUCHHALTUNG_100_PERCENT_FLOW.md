# Buchhaltung 100 % reibungslos – Was das CRM kann & wie wir es machen

## Was Sie wollen

1. **Eingangsrechnungen** – meist PDFs, manchmal Kassabelege → erfassen, Beleg dabeihaben, für UVA/Vorsteuer nutzen.
2. **Ausgangsrechnungen** – sind schon im CRM → sollen **automatisch erkannt** werden (z. B. bei Bankabgleich).
3. **Bank** – mit dem einen Konto wird alles bezahlt → **alles** (Eingang + Ausgang) soll damit abgeglichen sein und reibungslos funktionieren.

---

## Was das CRM heute schon kann

| Thema | Heute im CRM |
|-------|-------------------------------|
| **Eingangsrechnungen** | Manuelle Erfassung (Lieferant, Nr., Datum, Beträge, Kategorie). Kein Upload, kein Scan, kein Beleg-Link. |
| **Ausgangsrechnungen** | ✅ Voll im CRM: Rechnungen aus Aufträgen, mit Nr., Betrag, Datum, „bezahlt“-Status. |
| **Bank** | Nur **Bankverbindung** (IBAN/BIC) für Rechnungs-PDFs. **Kein** Kontoauszug, **keine** Bewegungen, **kein** Abgleich. |

**Fazit:** Den durchgängigen Ablauf (Beleg → Erfassung → Zahlung → Bankabgleich) gibt es so **noch nicht**. Wir müssen ihn bauen.

---

## Vorschlag: So machen wir es (100 % reibungslos)

### Drei Bausteine, ein Flow

```
Eingangsrechnungen (PDF/Kassabeleg)  →  Upload + optional Auto-Auslesen  →  Erfassung mit Beleg
Ausgangsrechnungen                    →  Bereits im CRM                    →  Automatisch beim Abgleich vorgeschlagen
Bank (ein Konto)                     →  Kontoauszug importieren           →  Jede Bewegung zuordnen → Rechnungen „bezahlt“
```

---

### 1. Eingangsrechnungen – PDF/Kassabeleg

- **Upload:** Beim Anlegen/Bearbeiten: PDF oder Foto (Kassabeleg) hochladen → Speicherung in Storage, Link in der Rechnung.
- **Optional – Auto-Auslesen:** Nach Upload: KI (Gemini) liest Lieferant, Rechnungsnr., Datum, Beträge aus → Formular wird **vorausgefüllt** → Sie prüfen einmal und speichern.
- **Ergebnis:** Jede Eingangsrechnung hat einen Beleg, wenig Tipparbeit, sauber für UVA/Vorsteuer.

**Technik:** Neue Route Upload (z. B. `/api/accounting/supplier-invoices/upload`), optional Analyze-Route für Vorausfüllung, in der Buchhaltung UI: Upload-Feld + „Beleg anzeigen“.

---

### 2. Ausgangsrechnungen – automatisch erkannt

- **Bereits im CRM:** Alle Ausgangsrechnungen sind in der Tabelle `invoices` (Rechnungsnr., Betrag, Datum, Kunde, `is_paid`).
- **„Automatisch erkannt“ beim Bankabgleich:** Beim Zuordnen einer **Gutschrift** (positiver Betrag) zeigt das System **Vorschläge**: offene Ausgangsrechnungen, bei denen **Betrag** (und optional Verwendungszweck/Rechnungsnr.) passt. Sie wählen die richtige → Rechnung wird „bezahlt“, die Bewegung ist zugeordnet.
- **Ergebnis:** Ausgangsrechnungen müssen nicht extra „erkannt“ werden – sie sind schon da; das CRM schlägt sie beim Abgleich automatisch vor.

**Technik:** Beim Bankabgleich (siehe unten) bei positivem Betrag: Abfrage offene `invoices` (user_id, is_paid = false), Filter/Sortierung nach Betrag und Datum; optional Textsuche im Verwendungszweck nach Rechnungsnummer.

---

### 3. Bank – ein Konto, alles wird damit bezahlt

#### Kann Raiffeisen (oder eine andere Bank) verbunden werden?

- **Ja, theoretisch:** Raiffeisen bietet PSD2-APIs (Kontostand, Buchungen abrufbar). Dafür braucht man in der Regel ein **eIDAS QWAC-Zertifikat** und die Anmeldung als Account Information Service Provider (AISP) bzw. Nutzung eines Aggregators – für viele kleine Betriebe zu aufwendig.
- **Pragmatischer Weg:** **Bank-Monatsliste (Kontoauszug) als PDF einspielen** – das geht mit jeder Bank (Raiffeisen, Sparkasse, etc.), ohne API und ohne Zertifikat.

#### Hauptweg: Monatsliste als PDF einspielen

- **Ablauf:** Sie laden im Buchhaltungs-Bereich „Bankabgleich“ die **Monatsübersicht / Kontoauszug als PDF** hoch (so wie Sie ihn aus dem Online-Banking herunterladen).
- **Einspielen:** Das System liest das PDF (per KI/Vision, z. B. Gemini – wie bei Lieferscheinen/Eingangsrechnungen) und extrahiert die **Buchungszeilen**: Datum, Betrag (Eingang/ Ausgang), Verwendungszweck, ggf. Gegenkonto. Diese Zeilen werden als **Kontobewegungen** in der Tabelle gespeichert.
- **Danach:** Wie geplant – jede Bewegung können Sie einer **Eingangsrechnung** (Abbuchung) oder **Ausgangsrechnung** (Gutschrift) zuordnen; das CRM schlägt offene Rechnungen automatisch vor.
- **Ergebnis:** Keine Bank-API nötig, funktioniert mit Raiffeisen und allen anderen Banken, solange ein PDF-Kontoauszug verfügbar ist.

**Optional später:** Wenn Sie doch eine direkte Anbindung wollen (z. B. Raiffeisen PSD2), kann man das separat einplanen; der Abgleich (Zuordnung zu Rechnungen) bleibt derselbe.

#### Technik (PDF-Weg)

- **Tabelle „Kontobewegungen“:** wie oben (user_id/company_id, bank_account_id, date, amount, reference, supplier_invoice_id, invoice_id).
- **Import:** Neue Route z. B. `POST /api/accounting/bank-transactions/import-pdf`: PDF hochladen → an Gemini senden mit Prompt „Extrahiere alle Buchungszeilen: Datum, Betrag (Vorzeichen: + Einnahme, − Ausgabe), Verwendungszweck“ → strukturierte Liste zurück → in `bank_transactions` speichern.
- **UI:** Tab „Bankabgleich“: Button „Monatsliste (PDF) einspielen“, danach Tabelle der Bewegungen + „Zuordnen“ wie beschrieben.
- **Optional zusätzlich:** CSV-Import (falls die Bank CSV exportiert), gleiche Tabelle, gleiche Zuordnungslogik.

---

## Reihenfolge der Umsetzung

| Schritt | Inhalt | Nutzen |
|--------|--------|--------|
| **1** | Eingangsrechnungen: **Beleg-Upload** (PDF/Bild) + Link „Beleg anzeigen“ | Beleg immer dabeihaben, reibungslos für Steuer/UVA. |
| **2** | Eingangsrechnungen: **Auto-Auslesen** (Analyze-API, Vorausfüllung) | Noch weniger Tippen, auch Kassabelege schnell erfasst. |
| **3** | **Bank:** Tabelle Kontobewegungen + **PDF-Monatsliste einspielen** (KI extrahiert Zeilen) + UI „Bankabgleich“ | Kontoauszug im System, funktioniert mit Raiffeisen und allen Banken. |
| **4** | **Bankabgleich:** Zuordnung Abbuchung → Eingangsrechnung, Gutschrift → Ausgangsrechnung, inkl. **Autovorschläge** für Ausgangsrechnungen (Betrag/Rechnungsnr.) | Ausgangsrechnungen „automatisch erkannt“, alles mit der Bank abgeglichen. |

---

## Kurzantwort

- **Kann das CRM das schon?** Eingangsrechnungen nur manuell ohne Beleg, Ausgangsrechnungen ja, Bank nur als IBAN/BIC – den **kompletten reibungslosen Ablauf** nicht.
- **Wie machen wir es?** Wie oben: (1) Eingangsrechnungen mit Upload + optional KI-Vorausfüllung, (2) Ausgangsrechnungen bleiben im CRM und werden beim Bankabgleich automatisch vorgeschlagen, (3) Bank mit Kontobewegungen und Zuordnung zu beiden Rechnungsarten. So funktioniert alles mit 100 % Ablauf: Beleg → Erfassung → Zahlung → Bank.

Wenn Sie wollen, kann als Nächstes **Schritt 1** (nur Beleg-Upload für Eingangsrechnungen) konkret umgesetzt werden.
