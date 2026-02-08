# Refactoring-Analyse – große Dateien

Prüfung: Sind Dateien zu groß oder erfüllen zu viele Aufgaben?

---

## Übersicht: Größte Dateien

| Datei | Zeilen | Bewertung |
|-------|--------|-----------|
| `types/database.types.ts` | 2664 | **OK** – auto-generiert, nicht refactoren |
| `ProjectDocumentsTab.tsx` | 1311 | **Refactor sinnvoll** |
| `AccountingView.tsx` | 1286 | **Refactor sinnvoll** |
| `serverHandlers.ts` | 1271 | **Refactor sinnvoll** |
| `SupplierInvoicesView.tsx` | 1182 | **Prüfen** |
| `ProjectList.tsx` | 1130 | **Grenzfall** (Hooks bereits extrahiert) |
| `DeliveriesClient.tsx` | 1042 | **Refactor sinnvoll** |
| `lib/supabase/services/company.ts` | 614 | **Teilen sinnvoll** |
| `lib/supabase/services/projects.ts` | 653 | **OK** (bereits refactored) |
| `lib/ai/agentTools.ts` | 679 | **Grenzfall** (Deklarations-Liste) |

---

## 1. ProjectDocumentsTab.tsx (1311 Zeilen)

**Problem:** Eine Komponente macht zu viel:
- Dokumente laden (Rechnungen, Lieferscheine, Angebote, Aufträge)
- Portal-Publishing
- E-Mail versenden
- Signatur-Modal
- mehrere Modals (CustomerDeliveryNote, OrderDownload, Signature)
- Filter, Suche, Sortierung

**Empfehlung:**
- `useProjectDocuments` Hook – Laden, Published-State, Filter-Logik
- `DocumentPublishActions` – Button-Gruppe für Publish/Share
- `DocumentsList` – Tabellen-/Listen-Rendering
- Modals in eigene Komponenten auslagern (teils schon vorhanden)

**Priorität:** Mittel

---

## 2. AccountingView.tsx (1286 Zeilen)

**Problem:**
- 4 Tabs (Overview, Outgoing, Incoming, Bank)
- Viel State (Zeitraum, Export, Details)
- UVA-Berechnung, DATEV, Excel-Export inline
- `loadInvoices`, `loadSupplierInvoices`, `loadInputTax` – mehrere Daten-Loader

**Empfehlung:**
- `useAccountingData` – alle Loads + Zeitraum-Logik
- Tab-Inhalte in `AccountingOverviewTab`, `OutgoingInvoicesTab`, `IncomingInvoicesTab`, `BankReconciliationTab`
- Export-Logik bleibt in `AccountingExports` (bereits ausgelagert)

**Priorität:** Mittel

---

## 3. serverHandlers.ts (1271 Zeilen)

**Problem:**
- Viele Handler (createProject, updateProjectDetails, sendEmail, …) in einer Datei
- Gemeinsame Helper (findProject, getAllowedEmails, appendProjectNote) schon extrahiert
- Jeder Handler ist ~20–80 Zeilen

**Empfehlung:**
- Handler nach Domäne splitten:
  - `handlers/projectHandlers.ts` – create, update, workflow, note
  - `handlers/financeHandlers.ts` – payment, invoice
  - `handlers/emailHandlers.ts` – sendEmail, etc.
- `serverHandlers.ts` als Index, der alle importiert und die Map exportiert

**Priorität:** Hoch (Wartbarkeit)

---

## 4. company.ts (614 Zeilen)

**Problem:**
- Vermischt: getCompanyIdForUser, getCompanySettings, getBankAccounts, getEmployees
- Rechnungs-/Auftrags-/Lieferscheinnummern-Generierung (getNextInvoiceNumber, getNextOrderNumber, …)
- Viele Mapper (mapCompanySettingsFromDB, mapBankAccountFromDB, mapEmployeeFromDB)

**Empfehlung:**
- `company.ts` – nur Company/Core (getCompanyIdForUser, getCompanySettings, getCompanySettingsById)
- `numbering.ts` – getNextInvoiceNumber, getNextOrderNumber, getNextDeliveryNoteNumber (inkl. peek-Varianten)
- `bankAccounts.ts` – getBankAccounts, saveBankAccount, deleteBankAccount
- `employees.ts` – getEmployees, saveEmployee, deleteEmployee (oder in bestehenden services/ behalten)

**Priorität:** Mittel

---

## 5. DeliveriesClient.tsx (1042 Zeilen)

**Problem:**
- Upload, Analyse, Liste, Matching, Zuordnung – alles in einer Page-Komponente
- Viel State für Modals und Wizards

**Empfehlung:**
- `useDeliveryNotes` – Load, Filter, Analyse-State
- `DeliveryUploadWizard` – Upload + Analyse-Step
- `DeliveryMatchingStep` – Projekt-Matching-UI
- `DeliveryNotesList` – Tabelle

**Priorität:** Mittel

---

## 6. agentTools.ts (679 Zeilen)

**Problem:**
- Lange Liste von FunctionDeclaration-Objekten
- Keine Logik, nur Deklarationen
- Änderungen erfordern Scrollen in großer Datei

**Empfehlung:**
- Nach Domäne aufteilen: `agentTools/projectTools.ts`, `agentTools/financeTools.ts`, `agentTools/emailTools.ts`
- `agentTools/index.ts` – alle zusammenführen und exportieren

**Priorität:** Niedrig (nur Struktur, kein Verhalten)

---

## 7. ProjectList.tsx (1130 Zeilen)

**Status:** Bereits mehrere Hooks extrahiert (useProjectData, useProjectWorkflow, useProjectModals).
- Viel UI-Code (Tabellenzeilen, Dropdowns)
- `ProjectRow` und `LeadRow` bereits ausgelagert

**Empfehlung:**
- Weitere Auslagerung: `ProjectTableBody`, `ProjectFiltersBar` als Sub-Komponenten
- Oder: Akzeptabel bei 1100 Zeilen, wenn strukturell klar

**Priorität:** Niedrig

---

## Reihenfolge für Refactoring

1. **serverHandlers.ts** – Handler nach Domänen splitten (sauber, wenige Risiken)
2. **company.ts** – numbering + bank + employees auslagern
3. **ProjectDocumentsTab** – useProjectDocuments + Sub-Komponenten
4. **AccountingView** – Tabs + useAccountingData
5. **DeliveriesClient** – Wizard + List auslagern
6. **agentTools** – optional, nach Domänen aufteilen

---

## Nicht refactoren

- `database.types.ts` – generiert
- `projects.ts` – bereits mit buildItemRow, validateItems, etc. strukturiert
