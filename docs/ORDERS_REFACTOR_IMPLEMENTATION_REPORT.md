# Bestellungen: Umsetzungsbericht zum Refactor-Plan

**Stand:** 2026-02-11  
**Referenz:** `ORDERS_REFACTOR_AND_FIX_PLAN.md`

---

## 1. Kurzfassung

| Phase | Status | Anmerkung |
|-------|--------|-----------|
| **Phase 1** (F6, Queue-Reihenfolge) | ✅ umgesetzt | `SUPPLIER_WORKFLOW_QUEUE_ORDER` definiert und überall genutzt |
| **Phase 2** (Toast, Modals statt alert/confirm/prompt) | ✅ umgesetzt | Keine `alert`/`confirm`/`prompt` mehr; Toast, SendOrderConfirm, ConfirmDialog |
| **Phase 3** (Komponenten zerlegen) | ✅ umgesetzt | OrdersClient 329 LOC; alle Zielkomponenten vorhanden |
| **Phase 4** (A11y, Queue-Order, Tests) | ✅ umgesetzt | aria-labels, scope="col", Modal Fokus/Esc, workflowQueue-Tests |
| **Phase 7** (Dokumentation) | ✅ teilweise | API_REFERENCE, ARCHITECTURE, CRM README erwähnen Bestellungen |

---

## 2. Phase 1: Fehler & Inkonsistenzen

| Punkt | Plan | Ist | Status |
|-------|------|-----|--------|
| F1–F5 (alert/prompt/confirm) | Phase 2 ersetzen | Erledigt via Phase 2 (Toast, Modals) | ✅ |
| F6 (Queue-Reihenfolge) | `SUPPLIER_WORKFLOW_QUEUE_ORDER` in workflowQueue + OrdersClient + useOrderWorkflow | In `lib/orders/workflowQueue.ts` exportiert; in OrdersClient (Chips), useOrderWorkflow (queueOrderLookup, queueCounts) genutzt | ✅ |

- **workflowQueue.ts:** `SUPPLIER_WORKFLOW_QUEUE_ORDER` als Array exportiert (Zeilen 47–55).
- **OrdersClient:** Chips werden mit `SUPPLIER_WORKFLOW_QUEUE_ORDER.map(...)` gerendert.
- **useOrderWorkflow:** `queueOrderLookup` und `queueCounts` bauen auf `SUPPLIER_WORKFLOW_QUEUE_ORDER`.

---

## 3. Phase 2: Browser-Dialoge durch UI ersetzen

| Punkt | Plan | Ist | Status |
|-------|------|-----|--------|
| Keine alert() | Toast/Banner für Fehler | `useToast()` mit `showError`/`showSuccess`/`showInfo`; ensureOrderBucket, sendOrder, markAsExternallyOrdered, Wareneingang-Hinweis nutzen Toast/Info | ✅ |
| E-Mail + Bestätigung „Senden“ | Modal ohne prompt/confirm | `SendOrderConfirm`-Komponente mit E-Mail-Feld und Bestätigung | ✅ |
| „Bereits bestellt“ bestätigen | Confirm-Modal | `ConfirmDialog` mit Titel/Beschreibung und „Ja, markieren“ | ✅ |
| Kein prompt/confirm/alert in app/orders | – | Grep: 0 Treffer in `app/orders` | ✅ |

- **OrdersClient:** Verwendet `useToast()`, `SendOrderConfirm`, `ConfirmDialog`; keine `window.prompt`/`window.confirm`/`alert`.

---

## 4. Phase 3: Refactoring – Komponenten zerlegen

| Punkt | Plan | Ist | Status |
|-------|------|-----|--------|
| Zielstruktur app/orders/ | page, OrdersClient, useOrderWorkflow, components/ | Vorhanden: page.tsx, OrdersClient.tsx, useOrderWorkflow.ts, types.ts, orderUtils.ts, components/ | ✅ |
| OrderWorkflowTable | Suchfeld, Filter, Tabelle, Rows | OrderWorkflowTable.tsx (146 LOC) | ✅ |
| OrderWorkflowRow | Eine Zeile (Queue, Auftrag+Lieferant, Ablauf, Terminlage, Aktionen) | OrderWorkflowRow.tsx (218 LOC) | ✅ |
| OrderEditorModal | Bestellung bearbeiten, Positionen | OrderEditorModal.tsx (711 LOC) | ⚠️ >350 LOC |
| AbDialog | AB erfassen | AbDialog.tsx (269 LOC) | ✅ |
| DeliveryNoteDialog | Lieferschein erfassen | DeliveryNoteDialog.tsx (266 LOC) | ✅ |
| GoodsReceiptDialog | Wareneingang buchen | GoodsReceiptDialog.tsx (172 LOC) | ✅ |
| SendOrderConfirm | E-Mail + Senden | SendOrderConfirm.tsx (111 LOC) | ✅ |
| Typen + Utils | types.ts, orderUtils.ts | types.ts (119 LOC), orderUtils.ts (190 LOC) | ✅ |
| OrdersClient ~300–350 LOC | – | **329 LOC** | ✅ |
| Lint/Build | Keine neuen Fehler, Build grün | Build erfolgreich (zuletzt geprüft) | ✅ |

- **Hinweis:** `OrderEditorModal.tsx` hat 711 LOC (Grenze im WORLD_CLASS-Plan: 350 LOC). Inhaltlich vollständig; bei Bedarf weitere Aufteilung (z. B. Editor-Tabelle oder Filter-Bereich in eigene Komponente) möglich.
- Zusätzlich vorhanden: `ConfirmDialog.tsx`, `ModalShell.tsx` (gemeinsame Modal-Basis mit Fokus/Esc).

---

## 5. Phase 4: A11y, Queue-Order, Tests

| Punkt | Plan | Ist | Status |
|-------|------|-----|--------|
| aria-label für Aktionen | Senden, Positionen, AB, Lieferschein, WE, Auftrag | OrderWorkflowRow: alle relevanten Buttons und der Auftrag-Link haben `aria-label` | ✅ |
| Modals: Fokus, Fokus-Falle, Esc | ModalShell | ModalShell: Fokus ins erste fokussierbare Element, Tab-Falle, Esc ruft onClose auf | ✅ |
| Tabellen: scope="col" | OrderWorkflowTable, ggf. weitere | OrderWorkflowTable, OrderEditorModal, GoodsReceiptDialog: `<th scope="col">` gesetzt | ✅ |
| SUPPLIER_WORKFLOW_QUEUE_ORDER | Siehe Phase 1 | Siehe Phase 1 | ✅ |
| Unit-Tests workflowQueue | deriveSupplierWorkflowQueue, toQueueParam/fromQueueParam | `__tests__/utils/workflowQueue.test.ts`: Queue-Order, Roundtrip to/from param, derive (zu_bestellen, ab_fehlt, lieferschein_da, wareneingang_offen, montagebereit, brennt), getAbTimingStatus | ✅ |

---

## 6. Dokumentation (Phase 7)

| Dokument | Plan | Ist | Status |
|----------|------|-----|--------|
| docs/API_REFERENCE.md | supplier-orders Endpunkte prüfen | Send, mark-ordered, documents, document-analysis erwähnt | ✅ |
| docs/ARCHITECTURE.md | Bestellungen-Modul erwähnen | Eintrag zu `app/orders/` mit Bestell-Workflow und modularen Dialogen | ✅ |
| apps/crm/README.md | Bestellungen unter CRM-Funktionen | `/orders` mit Beschreibung „Lieferanten-Workflow mit Queues, Bestell-Editor, AB/Lieferschein/Wareneingang“ | ✅ |
| docs/README.md | Kein neuer Eintrag nötig | – | ✅ |

---

## 7. Abweichungen / Offene Punkte

1. **OrderEditorModal 711 LOC:** Grenze 350 LOC (WORLD_CLASS) wird überschritten. Option: später Editor-Tabelle oder Filter-Bereich auslagern.
2. **useOrderWorkflow 578 LOC:** Plan sah „unverändert (bereits eigener Hook)“ vor; Grenze 220 LOC für Hooks wird überschritten. Keine Änderung im Plan; bei künftiger Qualitätssicherung ggf. Aufteilung (z. B. reine Datenlogik vs. URL/Filter).
3. **Integration/E2E-Tests:** Im Plan optional; derzeit keine zusätzlichen Tests für „Editor speichern“ oder E2E Bestellung angelegt.

---

## 8. Fazit

Der Refactor-Plan ist **inhaltlich umgesetzt**: Phase 1–4 und die dokumentierten Dokumentationsprüfungen sind erfüllt. Keine `alert`/`confirm`/`prompt` mehr, klare Komponentenstruktur, A11y und Queue-Order umgesetzt, workflowQueue durch Unit-Tests abgedeckt. Einzige festgehaltene Abweichung: OrderEditorModal und useOrderWorkflow überschreiten die LOC-Grenzen des WORLD_CLASS-Plans; funktional und architektonisch ist das Modul in Ordnung.
