# Bestellungen: Gesamtplan Fehlerbehebung & Refactoring

**Stand:** 2026-02-11  
**Betroffener Bereich:** `apps/crm/app/orders/` (Bestellungen), zugehörige Hooks, Services, API-Routen.

---

## 1. Übersicht

| Phase | Inhalt | Risiko | Aufwand (grobe Schätzung) |
|-------|--------|--------|----------------------------|
| **1** | Fehler & Inkonsistenzen beheben | Niedrig | Klein |
| **2** | Browser-Dialoge durch UI-Feedback ersetzen | Niedrig | Klein |
| **3** | Refactoring: Komponenten zerlegen | Mittel | Mittel |
| **4** | A11y, explizite Queue-Reihenfolge, Tests | Niedrig | Klein–Mittel |

Reihenfolge einhalten, damit Refactoring auf stabilem Code stattfindet.

---

## 2. Fehler & Inkonsistenzen (Phase 1)

### 2.1 Bestehende Fehlerquellen

| Nr | Ort | Beschreibung | Aktion |
|----|-----|--------------|--------|
| F1 | `OrdersClient.tsx` ~406 | `ensureOrderBucket` schlägt fehl → `alert()`, kein UI-Feedback im Kontext | In Phase 2: Toast/Banner statt `alert` (siehe 3.1). |
| F2 | `OrdersClient.tsx` ~665–673 | `window.prompt` für E-Mail, `window.confirm` vor Senden | In Phase 2: Inline-Eingabe + Bestätigungs-Dialog in der UI (siehe 3.2). |
| F3 | `OrdersClient.tsx` ~701 | Fehler beim Senden → `alert(message)` | In Phase 2: Fehler-Toast/Banner. |
| F4 | `OrdersClient.tsx` ~712, ~744 | `window.confirm` + `alert` bei „Bereits bestellt“ | In Phase 2: Bestätigungs-Modal + Fehler-Toast. |
| F5 | `OrdersClient.tsx` ~1070 | Wareneingang: keine offenen Positionen → `alert()` | In Phase 2: Hinweis im Modal oder Toast. |
| F6 | `workflowQueue.ts` | Queue-Chip-Reihenfolge von `Object.keys(SUPPLIER_WORKFLOW_QUEUE_META)` abhängig | Explizites Array `SUPPLIER_WORKFLOW_QUEUE_ORDER` einführen und überall nutzen (Phase 4). |

### 2.2 Keine kritischen Daten-/Logik-Bugs

- Editor-Validierung (Auftrag, Lieferant, mind. eine Position, Lieferant pro Position) ist vorhanden.
- `useOrderWorkflow`: `refresh` mit `useCallback(..., [projects])`; `useEffect(() => { refresh() }, [refresh])` lädt beim Mount und bei Projekten-Update – akzeptabel. Kein offensichtlicher Race.

**Phase-1-Maßnahmen (schnell umsetzbar):**

- [ ] **F6:** In `workflowQueue.ts` `SUPPLIER_WORKFLOW_QUEUE_ORDER` definieren und in `OrdersClient` sowie `useOrderWorkflow` (falls dort Queue-Listen genutzt werden) verwenden.
- [ ] Optional: Prüfen, ob nach `replaceSupplierOrderItems` / `createSupplierOrder` ein sofortiger `refresh()` nötig ist (bereits über `runAndRefresh` abgedeckt).

---

## 3. Browser-Dialoge durch UI-Feedback ersetzen (Phase 2)

### 3.1 Fehlermeldungen: Toast oder Banner

- **Ziel:** Keine `alert()` mehr in `OrdersClient`.
- **Option A:** Bestehendes Toast-System im CRM nutzen (falls vorhanden).
- **Option B:** Einfacher Fehler-Banner oben in der Bestellungen-Seite (z. B. `ordersError`, `setOrdersError`), rot, mit Dismiss.
- **Betroffene Stellen:** F1, F3, F4, F5 (alle `alert`-Aufrufe).

### 3.2 Senden: E-Mail-Eingabe & Bestätigung in der UI

- **Aktuell:** `window.prompt` für E-Mail, `window.confirm` vor Versand.
- **Ziel:** Kleines Modal oder Inline-Bereich: E-Mail-Feld, optional „An [E-Mail] senden?“-Bestätigung (Button „Senden“ → ggf. zweiter Klick „Ja, senden“ oder Checkbox).
- **Stellen:** `handleSendOrder` (~656–704).

### 3.3 „Bereits bestellt“: Bestätigung in der UI

- **Aktuell:** `window.confirm`.
- **Ziel:** Eigenes kleines Confirm-Modal (oder Wiederverwendung eines App-weiten Confirm-Modals), danach Fehler nur noch per Toast/Banner (F4).

### 3.4 Checkliste Phase 2

- [ ] Toast/Banner für Fehler einführen und alle `alert()` ersetzen.
- [ ] E-Mail-Eingabe + Bestätigung für „Senden“ in UI auslagern (ohne `prompt`/`confirm`).
- [ ] Bestätigung „Bereits bestellt“ als Modal/Confirm-Komponente.
- [ ] Keine `window.prompt` / `window.confirm` / `alert` mehr in `app/orders`.

---

## 4. Refactoring: Komponenten zerlegen (Phase 3)

**Referenz:** `docs/WORLD_CLASS_REFACTOR_PLAN_2026-02-10.md` – Grenzen z. B. Components ≤ 350 LOC, Hooks ≤ 220 LOC.  
`OrdersClient.tsx` hat ~2040 LOC → muss zerlegt werden.

### 4.1 Zielstruktur

```
app/orders/
  page.tsx                    # unverändert (dünn)
  OrdersClient.tsx            # nur Layout, Queues, Tabelle, Modal-Container, Handler (~300–350 LOC)
  useOrderWorkflow.ts         # unverändert (bereits eigener Hook)
  components/                 # NEU
    OrderWorkflowTable.tsx    # Tabelle inkl. Kopf, Body, eine Zeile pro row
    OrderWorkflowRow.tsx      # Eine Zeile: Queue, Auftrag+Lieferant, Ablauf, Terminlage, Aktionen
    OrderEditorModal.tsx      # Modal „Bestellung bearbeiten“ inkl. Positionen-Tabelle
    AbDialog.tsx              # Modal „AB erfassen“
    DeliveryNoteDialog.tsx    # Modal „Lieferanten-Lieferschein erfassen“
    GoodsReceiptDialog.tsx    # Modal „Wareneingang buchen“
    SendOrderConfirm.tsx      # (optional) Kleines Modal für E-Mail + „Senden?“ (Phase 2)
```

### 4.2 Auslagerung im Detail

| Komponente | Verantwortung | Props / State |
|------------|----------------|----------------|
| **OrderWorkflowTable** | Suchfeld, Kanal-Filter, `<table>`, Kopf, `loading`/`error`/leer, Map über `rows` → `OrderWorkflowRow`. | `visibleRows`, `loading`, `error`, `activeQueue`, `search`, `setSearch`, `channelFilter`, `setChannelFilter`, `queueCounts`, `onQueueChange`, Handler (openEditor, send, mark, AB, Lieferschein, WE, Link Auftrag), `busyKey`. |
| **OrderWorkflowRow** | Eine `<tr>`: Queue-Chip, Auftrag+Lieferant+Kanal, Ablauf-Steps, Terminlage, Buttons. | `row`, `isBusy`, `busyKey`, Handlers. |
| **OrderEditorModal** | Öffnen/Schließen, Auftrag/Lieferant, „Positionen aus Auftrag laden“, Filter (Alle/Ausgewählt/Lieferant fehlt), Positionen-Tabelle, Speichern/Abbrechen/Bereits bestellt. | `open`, `onClose`, `editorRow`, `editorProjectId`, `editorSupplierId`, `editorItems`, `editorViewFilter`, `editorError`, `suppliers`, `projects`, `supplierLocked`, Callbacks (updateItem, loadFromProject, save, setViewFilter, selection helpers). |
| **AbDialog** | AB-Nummer, Termin, Abweichungen, Notiz, Datei-Upload, KI-Auswertung, Speichern/Abbrechen. | `open`, `row`, state (abNumber, abConfirmedDate, …), `onClose`, `onSubmit`, `busyKey`, `analyzeAbDocument`. |
| **DeliveryNoteDialog** | Lieferscheinnummer, Datum, Notiz, Datei, KI, Speichern/Abbrechen. | Analog zu AbDialog. |
| **GoodsReceiptDialog** | Positionen-Tabelle mit Restmenge/Buchen-Menge, Buchen/Abbrechen. | `open`, `row`, `items`, `onClose`, `onSubmit`, `setItems`, `error`, `busyKey`. |

### 4.3 Gemeinsame Typen & Hilfsfunktionen

- Typen (`OrderWorkflowRow`, `EditableOrderItem`, `GoodsReceiptDraftItem`, …) und reine Hilfsfunktionen (`formatDate`, `toNumber`, `formatConfidence`, `confidenceClass`, `renderStep`, `createEmptyEditableItem`, `mapRowItemsToEditableItems`) in eine gemeinsame Datei, z. B. `app/orders/types.ts` und `app/orders/orderUtils.ts` (oder in `lib/orders/` wenn app-übergreifend).
- `QUEUE_STYLES` und evtl. Queue-Labels aus `workflowQueue` nutzen; nur eine Stelle für Queue-Order (siehe F6).

### 4.4 Reihenfolge der Auslagerung (empfohlen)

1. **Typen + Utils** nach `types.ts` / `orderUtils.ts` verschieben.
2. **OrderWorkflowRow** extrahieren → weniger Duplikation in OrdersClient.
3. **OrderWorkflowTable** (mit Row darin) → OrdersClient behält nur Header, Queues, Suchfeld, Table-Komponente.
4. **GoodsReceiptDialog** (kleinstes Modal) → dann AbDialog, dann DeliveryNoteDialog.
5. **OrderEditorModal** zuletzt (größtes Modal).

Nach jedem Schritt: Lint, Build, manueller Smoke-Test (Bestellungen öffnen, Queue wechseln, Editor öffnen, AB/Lieferschein/WE).

### 4.5 Checkliste Phase 3

- [ ] `SUPPLIER_WORKFLOW_QUEUE_ORDER` nutzen (bereits in Phase 1/4).
- [ ] Typen und reine Utils aus OrdersClient in `types.ts` / `orderUtils.ts` auslagern.
- [ ] OrderWorkflowRow-Komponente.
- [ ] OrderWorkflowTable-Komponente.
- [ ] GoodsReceiptDialog, AbDialog, DeliveryNoteDialog.
- [ ] OrderEditorModal.
- [ ] OrdersClient unter ~350 LOC (oder dokumentierte Ausnahme mit Begründung).
- [ ] Keine neuen Linter-Fehler, Build grün.

---

## 5. A11y, Queue-Order, Tests (Phase 4)

### 5.1 Accessibility

- [ ] Alle Icon-Only-Buttons mit `aria-label` (z. B. Senden, Positionen, AB erfassen, Lieferschein, Wareneingang, Auftrag).
- [ ] Modals: Fokus beim Öffnen ins erste fokussierbare Element; Fokus-Falle; Esc schließt (wenn gewünscht).
- [ ] Tabellen: `thead`/`tbody`, ggf. `scope="col"` für Header.

### 5.2 Explizite Queue-Reihenfolge

- [ ] In `workflowQueue.ts`:  
  `export const SUPPLIER_WORKFLOW_QUEUE_ORDER: SupplierWorkflowQueue[] = ['lieferant_fehlt','brennt','zu_bestellen','ab_fehlt','lieferschein_da','wareneingang_offen','montagebereit']`
- [ ] In `OrdersClient` (bzw. OrderWorkflowTable): Chips und Filter nach `SUPPLIER_WORKFLOW_QUEUE_ORDER` rendern, nicht nach `Object.keys(SUPPLIER_WORKFLOW_QUEUE_META)`.
- [ ] In `useOrderWorkflow`: `queueCounts`-Reihenfolge kann weiter aus META-Keys kommen oder aus `SUPPLIER_WORKFLOW_QUEUE_ORDER` für Konsistenz.

### 5.3 Tests

- [ ] **Unit:** `deriveSupplierWorkflowQueue` (workflowQueue.ts) mit ausgewählten Snapshots (z. B. zu_bestellen, brennt, ab_fehlt, montagebereit).
- [ ] **Unit:** `toQueueParam` / `fromQueueParam` (Roundtrip, ungültige Werte).
- [ ] Optional: Integration für „Editor speichern“ (mit Mock-Services) oder E2E für „Bestellung anlegen → Positionen laden → Speichern“ (wenn gewünscht).

### 5.4 Checkliste Phase 4

- [ ] A11y: aria-labels, Modal-Fokus/Esc.
- [ ] `SUPPLIER_WORKFLOW_QUEUE_ORDER` eingeführt und überall genutzt.
- [ ] Unit-Tests für workflowQueue (derive, to/from param).
- [ ] Optional: Integration/E2E wie oben.

---

## 6. Abhängigkeiten zwischen Phasen

```
Phase 1 (Fixes, F6) ──► Phase 2 (Toast/Modal statt alert/confirm)
       │                           │
       └──────────────┬─────────────┘
                     ▼
              Phase 3 (Refactoring)
                     │
                     ▼
              Phase 4 (A11y, Queue-Order, Tests)
```

- Phase 2 kann parallel zu F6 (Phase 1) geplant werden.
- Phase 3 sollte nach Phase 2 starten, damit neue Komponenten von vornherein Toast/Confirm-Modal nutzen.
- Phase 4 (A11y, Queue-Order, Tests) kann teilweise parallel zu Phase 3 (z. B. Queue-Order und Tests für workflowQueue unabhängig von UI-Zerlegung).

---

## 7. Dokumentations-Updates (nach Umsetzung)

- [ ] **docs/API_REFERENCE.md:** Keine neuen API-Routen durch diesen Plan; nur prüfen, ob supplier-orders Endpunkte vollständig beschrieben sind.
- [ ] **docs/ARCHITECTURE.md:** Wenn neue Ordner/Struktur (`app/orders/components/`, `orderUtils.ts`) – einen Satz zu Bestellungen-Modul ergänzen.
- [ ] **apps/crm/README.md:** Unter „CRM-Funktionen“ den Menüpunkt Bestellungen kurz beschreiben (Workflow-Queues, Editor, AB/Lieferschein/WE).
- [ ] **docs/README.md:** Kein neuer Eintrag nötig, sofern kein neues Doc-Format eingeführt wird.

---

## 8. Kurzfassung

| Was | Wo | Wann |
|-----|-----|------|
| Fehler nur noch per UI (kein alert) | OrdersClient + neue Toast/Banner/Modals | Phase 2 |
| prompt/confirm durch UI ersetzen | SendOrderConfirm, Confirm-Modal „Bereits bestellt“ | Phase 2 |
| Queue-Reihenfolge explizit | workflowQueue.ts, OrdersClient/Table | Phase 1 + 4 |
| OrdersClient zerlegen | OrderWorkflowTable, Row, EditorModal, AbDialog, DeliveryNoteDialog, GoodsReceiptDialog | Phase 3 |
| A11y + Tests | OrdersClient + workflowQueue | Phase 4 |
| Docs prüfen | API_REFERENCE, ARCHITECTURE, CRM README | Nach Abschluss |

Damit ist der Gesamtplan Fehlerbehebung + Refactoring für das Bestellungen-Modul abgedeckt.
