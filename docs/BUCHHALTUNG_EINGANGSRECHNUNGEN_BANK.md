# Eingangsrechnungen: Scannen & Bankabgleich – Konzept

## Aktueller Stand

- **Eingangsrechnungen:** Manuelle Erfassung in Buchhaltung → Tab „Eingangsrechnungen“. Felder: Lieferant, UID, Rechnungsnr., Datum, Fälligkeit, Netto, MwSt, Kategorie, Notizen. Status „Bezahlt“ wird manuell gesetzt (Datum, Zahlungsart). Die DB hat bereits `document_url` und `document_name` – die UI zeigt sie aber **nicht** und es gibt **keinen Upload**.
- **Bank:** Es gibt nur **Bankverbindungen** (IBAN, BIC etc.) für Rechnungs-PDFs. **Kein Kontoauszug**, keine Kontobewegungen, **kein Abgleich** mit Zahlungen.

---

## 1. Eingangsrechnungen einscannen – Zielablauf

### Idealer Ablauf („perfekt“)

1. **Beleg erfassen**
   - Nutzer klickt „Neue Rechnung“ → wählt **„Rechnung scannen/hochladen“**.
   - Upload: PDF oder Foto (JPG/PNG) – z. B. aus Scanner, Smartphone, E-Mail-Anhang.
   - Datei wird in **Supabase Storage** gespeichert (z. B. `supplier-invoices/{userId}/{invoiceId}.pdf`) und die URL in `supplier_invoices.document_url` / `document_name` gespeichert.

2. **Optional: Automatisches Auslesen (OCR/Vision)**
   - Nach Upload: API sendet Bild/PDF an **Gemini** (wie bei Lieferscheinen).
   - Prompt: „Extrahiere aus dieser Rechnung: Lieferantenname, UID, Rechnungsnummer, Rechnungsdatum, Fälligkeitsdatum, Netto-Betrag, MwSt-Satz, Brutto.“
   - Antwort als strukturierte Daten (JSON) → Formular wird **vorausgefüllt**, Nutzer prüft und speichert.
   - So reduziert sich Tipparbeit und Fehler; der Ablauf bleibt „Scan → ggf. Korrektur → Speichern“.

3. **Im Formular**
   - Feld **„Beleg (PDF/Bild)“**: Upload oder „Später hinzufügen“.
   - Nach Speichern: Link **„Beleg anzeigen“** in der Liste/Detailansicht (öffnet `document_url` in neuem Tab oder zeigt Preview).
   - Beim Bearbeiten: Beleg ersetzen oder nachträglich hochladen möglich.

4. **Technik (kurz)**
   - **Neue API-Route** z. B. `POST /api/accounting/supplier-invoices/upload`: FormData mit `file` (+ optional `invoiceId` für Nachweis bei bestehender Rechnung). Speichern in Storage, Rückgabe `{ documentUrl, documentName }`. Permission: `menu_accounting`.
   - **Optional:** `POST /api/accounting/supplier-invoices/analyze`: Base64 + MimeType (wie Lieferschein-Upload), Gemini extrahiert Rechnungsdaten, Rückgabe JSON für Formular-Vorausfüllung.
   - **SupplierInvoicesView:** Im Formular Upload-Komponente (Drag & Drop oder Dateiauswahl), nach Upload `formData.documentUrl` / `documentName` setzen; bei „Neue Rechnung“ mit Vorausfüllung: Analyze aufrufen, dann Formular füllen.
   - Storage-Bucket: z. B. `documents` (vorhanden) mit Unterpfad `supplier-invoices/{userId}/{uuid}.pdf`; RLS so, dass nur der eigene User lesen/schreiben kann.

Damit läuft die Eingangsrechnung **perfekt** im Sinne von: einscannen/hochladen → Beleg ist dauerhaft dabei → optional wenig manuell tippen.

---

## 2. Bankabgleich – Abstimmung mit der Bank

### Was „Abstimmung mit der Bank“ bedeutet

- **Kontoauszug** (Bewegungen) irgendwo her haben: Import aus Online-Banking (MT940, CAMT.053, CSV) oder manuell.
- **Zuordnung:** Eine Abbuchung (z. B. -1.200 €) wird einer **Eingangsrechnung** zugeordnet → Rechnung wird „bezahlt“ (Datum + ggf. Verwendungszweck aus Bewegung). Eine Gutschrift (z. B. +5.000 €) wird einer **Kunden-Zahlung** / Ausgangsrechnung zugeordnet → Rechnung „bezahlt“.

So ist klar: Was ist schon bezahlt? Was fehlt noch? Passt die Buchhaltung zur Bank?

### Vorschlag: Stufenweise Einführung

#### Stufe A: Manueller Abgleich (ohne Import)

- In der **Eingangsrechnungen-Liste**: Bei „Bezahlt“-Dialog zusätzlich **Verwendungszweck / Referenz** speichern (optionales Feld, z. B. in `supplier_invoices` oder in Notizen).
- In **Zahlungen** (Ausgangsrechnungen) bleibt es wie jetzt: „Als bezahlt markieren“ mit Datum.
- **Kein** eigener „Bank“-Tab nötig; Abgleich erfolgt mental/über Excel, bis Stufe B da ist.

#### Stufe B: Kontobewegungen erfassen + zuordnen

1. **Datenmodell**
   - Neue Tabelle z. B. `bank_transactions`:
     - `id`, `company_id` (oder `user_id` je nach eurem Modell), `bank_account_id` (Referenz auf `bank_accounts`),
     - `date`, `amount` (positiv = Eingang, negativ = Ausgang), `reference` / `remittance_info` (Verwendungszweck),
     - `counterparty_name`, `counterparty_iban` (optional),
     - `supplier_invoice_id` (optional, FK), `invoice_id` (optional, FK für Ausgangsrechnung),
     - `created_at`, `updated_at`.
   - So kann eine Bewegung genau **einer** Eingangsrechnung und **einer** Ausgangsrechnung zugeordnet werden (oder keiner = „noch nicht zugeordnet“).

2. **Import**
   - **CSV-Import:** Route z. B. `POST /api/accounting/bank-transactions/import`: CSV hochladen (Spalten: Datum, Betrag, Verwendungszweck, …). Parsing (z. B. per Papa Parse), Validierung, Insert in `bank_transactions` mit `company_id`/`user_id` und `bank_account_id`.
   - **MT940/CAMT** (später): Gleiche Tabelle, Parser für Standardformate; gleiche Zuordnungslogik.

3. **UI: Bankabgleich**
   - Neuer Bereich unter Buchhaltung, z. B. Tab **„Bankabgleich“** oder Unterseite `/accounting/bank`:
     - **Kontobewegungen** (Tabelle): Datum, Betrag, Verwendungszweck, Zuordnung (Eingangsrechnung X / Ausgangsrechnung Y / „—“).
     - **Zuordnung:** Pro Zeile Button „Zuordnen“ → Modal: Bei **negativem** Betrag: Suche/Liste **offene Eingangsrechnungen** (Filter: Lieferant, Betrag, Datum), Auswahl verknüpft `supplier_invoice_id` und markiert Rechnung als bezahlt (Datum = Bewegungsdatum). Bei **positivem** Betrag: Suche **offene Ausgangsrechnungen** (Kunde, Betrag), Auswahl verknüpft `invoice_id` und markiert Rechnung als bezahlt.
   - Optional: **Autovorschlag** (z. B. Verwendungszweck enthält Rechnungsnummer oder Betrag passt zu einer offenen Rechnung).

4. **Abstimmung mit der Bank**
   - Summe der **zugeordneten** Bewegungen pro Konto/Zeitraum vs. Summe „als bezahlt“ markierter Rechnungen – sollte übereinstimmen.
   - Einfache Kennzahl: „X Bewegungen noch ohne Zuordnung“, „Y offene Eingangsrechnungen ohne passende Bewegung“.

#### Stufe C: Automatisierung (später)

- Automatische Zuordnung per Verwendungszweck/Rechnungsnummer/Betrag (Matching-Regeln).
- Anbindung Bank-API (PSD2), falls gewünscht und verfügbar.

---

## 3. Empfohlene Reihenfolge

| Phase | Inhalt | Nutzen |
|-------|--------|--------|
| **1** | Eingangsrechnungen: **Upload Beleg** (PDF/Bild) + Speicherung in Storage, Anzeige/Link in Liste & Formular | Jede Rechnung hat einen Beleg, Prüfung/Steuerberater einfach. |
| **2** | Optional: **Analyze-API** für Eingangsrechnungen (Gemini) + Vorausfüllung des Formulars | Schnellere Erfassung, weniger Tippfehler. |
| **3** | **Bankabgleich Stufe B:** Tabelle `bank_transactions`, CSV-Import, UI „Kontobewegungen“ + Zuordnung zu Eingangs- und Ausgangsrechnungen | Klarheit: Was ist bezahlt? Abstimmung mit der Bank. |
| **4** | Nach Bedarf: MT940/CAMT, Autovorschläge, Kennzahlen „Abgleich-Status“. | Noch weniger manuelle Arbeit. |

---

## 4. Kurz: „Perfekt“ für Sie

- **Eingangsrechnungen:** Scannen/Foto/PDF hochladen → Beleg ist gespeichert und sichtbar; optional automatisches Auslesen → Formular vorausgefüllt → einmal prüfen, speichern. **Das ist der Ablauf, der perfekt abläuft.**
- **Bank:** Kontobewegungen importieren (z. B. CSV) → in der Buchhaltung jede Bewegung **einer** Eingangsrechnung bzw. **einer** Ausgangsrechnung zuordnen → System markiert die Rechnungen als bezahlt. So wird alles mit der Bank abgestimmt; offene Posten und „noch nicht zugeordnet“ sind sichtbar.

Wenn Sie möchten, kann als Nächstes **Phase 1** (nur Upload + Anzeige Beleg) konkret in Code umgesetzt werden (API-Route + Anpassung SupplierInvoicesView).
