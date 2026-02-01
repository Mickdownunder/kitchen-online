# Prompt: Buchhaltung rigoros prüfen (Copy & Paste in neuen Chat)

**Kopiere den Block zwischen BEGINN und ENDE in einen neuen Chat. Die KI soll den Menüpunkt Buchhaltung streng durchgehen.**

---

## BEGINN DES PROMPTS

Du bist Senior-Entwickler und QA-Experte. Deine Aufgabe: **Den Menüpunkt „Buchhaltung“ (Accounting) in diesem CRM-Projekt rigoros prüfen** – Funktionalität, Sicherheit, Datenfluss, UI, Randfälle und Konsistenz mit der Datenbank.

### Kontext des Projekts

- **Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL, Auth, RLS).
- **Buchhaltung:** Interner Menüpunkt für Mitarbeiter mit Berechtigung `menu_accounting`. Zeigt Übersicht (UVA, Ausgangs-/Eingangsrechnungen), Filter (Monat/Quartal/Jahr), Exporte (UVA-Excel, Rechnungen-Excel, DATEV, PDF) und Verwaltung von Bankkonten sowie Lieferantenrechnungen (Eingangsrechnungen).

### Relevante Pfade (vollständig durchgehen)

**Seiten & Einstieg:**
- `apps/crm/app/accounting/page.tsx` – Server-Seite, Permission-Check
- `apps/crm/app/accounting/AccountingClient.tsx` – Client-Wrapper, übergibt `projects` an AccountingView

**Komponenten:**
- `apps/crm/components/AccountingView.tsx` – Haupt-UI: Tabs (Übersicht, Ausgangsrechnungen, Eingangsrechnungen), Filter, Lade-Logik, Export-Buttons
- `apps/crm/components/AccountingExports.tsx` – Export-Funktionen: UVA-Excel, Rechnungen-Excel, DATEV, Buchhaltungs-PDF (SKR03, Typen)
- `apps/crm/components/accounting/SupplierInvoicesView.tsx` – Anzeige/CRUD Lieferantenrechnungen
- `apps/crm/components/accounting/AccountingValidation.tsx` – Validierung (z. B. UVA-Summen, Plausibilität)

**Services & Daten:**
- `apps/crm/lib/supabase/services/supplierInvoices.ts` – CRUD für `supplier_invoices` (Liste, ByDateRange, ById, Insert, Update, Delete)
- `apps/crm/lib/supabase/services/company.ts` – Bankkonten: Lesen, Anlegen, Löschen (`bank_accounts`)
- `apps/crm/lib/supabase/services/invoices.ts` – z. B. `getInvoicesWithProject` (Ausgangsrechnungen)
- `apps/crm/lib/supabase/services/index.ts` – welche Services exportiert werden, inkl. `getInputTaxForUVA`

**Berechtigung & Routing:**
- `apps/crm/lib/auth/requirePermission.ts` – wie `menu_accounting` geprüft wird
- `apps/crm/components/Layout.tsx` – Menüeintrag Buchhaltung, Permission `menu_accounting`
- `apps/crm/middleware.ts` – Pfad `/accounting` geschützt?
- `apps/crm/lib/supabase/services/permissions.ts` – Rolle → `menu_accounting` (true/false)

**Datenbank (Referenz):**
- Tabellen: `bank_accounts` (company_id), `supplier_invoices` (user_id, project_id, company_id?), `invoices` (user_id, project_id)
- RLS: Policies für `bank_accounts`, `supplier_invoices`, `invoices` – wer darf was lesen/schreiben (company_id, user_id)?
- Schema: `packages/db/migrations/001_initial_schema.sql` oder aktueller Dump – Spalten, Constraints, Indizes für diese Tabellen

### Was „rigoros prüfen“ bedeutet

1. **Berechtigung**
   - Wird `menu_accounting` auf der Seite, im Layout und im Middleware konsequent verlangt?
   - Kann ein User ohne `menu_accounting` per direkter URL `/accounting` oder per API/Service trotzdem Daten sehen oder ändern?

2. **Sicherheit & RLS**
   - Alle Lesezugriffe auf `invoices`, `supplier_invoices`, `bank_accounts` laufen mit dem User-Client (nicht Service-Role)? Wenn ja, RLS greift.
   - Sind die RLS-Policies für diese Tabellen so formuliert, dass nur Daten der eigenen Firma (company_id) bzw. des eigenen Users (user_id) sichtbar/änderbar sind?
   - Werden nirgends Bankdaten oder Lieferantenrechnungen anderer Firmen angezeigt (z. B. fehlender company_id-Filter)?

3. **Datenfluss**
   - Woher kommen Ausgangsrechnungen (invoices)? `getInvoicesWithProject` – Filter nach company/user?
   - Woher kommen Eingangsrechnungen (supplier_invoices)? `getSupplierInvoicesByDateRange` – Filter nach company/user?
   - UVA/Vorsteuer: `getInputTaxForUVA` – welche Tabelle, welcher Filter?
   - Bankkonten: nur Lesen/Anlegen/Löschen über company – wird `company_id` immer aus dem aktuellen Kontext (get_current_company_id o. ä.) gesetzt?

4. **UI & Logik**
   - Tabs „Übersicht“, „Ausgangsrechnungen“, „Eingangsrechnungen“ – laden sie die richtigen Daten für den gewählten Zeitraum (Monat/Quartal/Jahr)?
   - Exporte: UVA-Excel, Rechnungen-Excel, DATEV, PDF – verwenden sie dieselben gefilterten Daten wie die Anzeige? Keine Exporte „aller“ Daten ohne Filter?
   - Leere Zustände: Keine Abstürze, wenn keine Rechnungen/Bankkonten vorhanden sind.
   - Datumsfilter: Grenzfälle (z. B. Monat ohne Rechnungen, falsches Jahr)?

5. **Konsistenz mit DB**
   - Spalten von `supplier_invoices` (invoice_number, invoice_date, due_date, supplier_name, category, datev_account, net_amount, tax_amount, is_paid, project_id, user_id, …) – werden sie in Services und Komponenten korrekt gelesen/geschrieben?
   - `supplier_invoices.category` – CHECK-Constraint (material, subcontractor, tools, …) – wird in der UI nur erlaubte Kategorien angeboten?
   - `bank_accounts` – Spalten und RLS (company_id) – stimmen mit company.ts überein?

6. **Randfälle & Fehlerbehandlung**
   - Fehler beim Laden (Netzwerk, 403, 500) – werden sie angezeigt, ohne die ganze Seite zu crashen?
   - Export fehlgeschlagen – Meldung an den User?
   - Validierung (AccountingValidation): Wird sie auf den richtigen Daten ausgeführt, und werden Abweichungen sinnvoll gemeldet?

### Deine Ausgabe

1. **Kurzfassung (2–3 Sätze):** Ist der Buchhaltungs-Bereich deiner Einschätzung nach funktional und sicher, oder wo liegen die größten Lücken/Risiken?

2. **Checkliste (Tabelle):** Pro Prüfpunkt (Berechtigung Seite/Layout/Middleware, RLS bank_accounts/supplier_invoices/invoices, Datenfluss Ausgangs/Eingangs/UVA/Bank, Export-Filter, Leere Zustände, DB-Konsistenz, Fehlerbehandlung) – erfüllt / nicht erfüllt / unklar, plus kurzer Kommentar.

3. **Befunde:** Nummerierte Liste der konkreten Befunde (z. B. „Export X filtert nicht nach company_id“, „Permission Y wird auf Route Z nicht geprüft“).

4. **Fix-Vorschläge:** Pro Befund ein konkreter Vorschlag (Datei, Stelle, was ändern), ohne Code zu ändern – nur Empfehlung.

5. **Optional:** Schritte für manuellen Test (z. B. „1. Als User ohne menu_accounting auf /accounting gehen → erwarte Redirect/403“, „2. Export DATEV für Monat X ausführen → prüfe, ob nur Daten der eigenen Firma in der Datei sind“).

Am Ende: Wenn alles in Ordnung ist, schreibe „Buchhaltung: Prüfung abgeschlossen, keine kritischen Mängel“. Wenn nicht: „Buchhaltung: folgende Punkte müssen behoben werden“ und die Punkte auflisten.

---

## ENDE DES PROMPTS

---

*Nach dem Einfügen im neuen Chat optional ergänzen: „Projektpfad: [Workspace-Pfad]. Bitte die genannten Dateien lesen und die Prüfung durchführen.“*
