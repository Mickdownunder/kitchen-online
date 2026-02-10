# Plan: Test-Coverage auf 75 % (Stand: 2026-02-10)

## Ausgangslage (vor Phasen 1–4)

- **Jest** misst nur `lib/**` (ohne app, components, exkludierte Services).
- **Werte vor Umsetzung:**
  - Statements: **73,35 %** (Ziel 80 %)
  - Branches: **61,04 %** (Ziel 62 % / Welle-5-Ziel > 70 %)
  - Lines: **76,55 %** (Ziel 80 %)
  - Functions: **83,47 %** (Ziel 80 % ✓)

- **Ziel dieses Plans:** Alle genannten Metriken auf mindestens **75 %** bringen (Branches prioritär, da größte Lücke).

---

## Stand nach Phasen 1–4 + Branch-Tests (umgesetzt 2026-02-10)

- **Aktuelle Werte** (nach Phasen 1–4 und vorgeschlagenen Branch-Tests):
  - Statements: **83,87 %** ✓ (Ziel 75 %)
  - Branches: **71,51 %** (Ziel 75 % – noch ~3,5 % Lücke)
  - Functions: **93,33 %** ✓
  - Lines: **87,65 %** ✓ (Ziel 75 %)

- **Umgesetzt:** Phasen 1–4 (supplierInvoices, projects, delivery, orders, permissions). Zusätzlich Branch-Tests: delivery (createDeliveryNote/createGoodsReceipt mit Items, createCustomerDeliveryNote 42P01/„does not exist“), projects (upsertItems Update/Delete/Fehler), permissions (getCurrentCompanyId Fallback + zweite Abfrage + PGRST116, getEffectivePermissions P0001). **737 Tests** bestanden.

---

## Nicht umgesetzt (wie besprochen)

**Portal auth/reset/invite (Welle 5, Punkt 5)** – bewusst **nicht** umgesetzt. Soll **erst nach dem Welle-4-Merge** laufen, um Konflikte mit den Portal-Reparaturen (dünne Seiten, Komposition, Hooks) zu vermeiden. Dafür wurden **keine** Tests geschrieben – wie besprochen. Sobald Welle 4 abgeschlossen ist: Tests für Portal-Login, Passwort-Reset und Einladungs-Flows ergänzen und in diesem Plan als Phase 5 umsetzen.

---

## Phasen bis 75 %+

### Phase 1: supplierInvoices Service-Tests (größter Hebel)

**Ziel:** `supplierInvoices/commands.ts` und `queries.ts` von 0 % auf ~70 %+.

| Aufgabe | Beschreibung |
|--------|--------------|
| Neue Testdatei | `__tests__/services/supplierInvoices.test.ts` (analog `invoices.test.ts`, `delivery.test.ts`) |
| Supabase-Mock | Bestehenden Mock aus `__tests__/services/__mocks__/supabase.ts` nutzen |
| Queries | `getSupplierInvoices`, `getSupplierInvoice` (mit/ohne Filter, Fehler) |
| Commands | `createSupplierInvoice`, `updateSupplierInvoice`, `markSupplierInvoicePaid`/`Unpaid`, `deleteSupplierInvoice` |
| Optional | Custom Categories (get/set), wenn in Queries/Commands abgebildet |

**Abnahme:** Coverage für `supabase/services/supplierInvoices` Branches von ~50 % auf > 65 %; globaler Branch-Wert steigt spürbar.

---

### Phase 2: projects/commands.ts vertiefen

**Ziel:** Branches in `projects/commands.ts` von ~33 % auf > 55 %.

| Aufgabe | Beschreibung |
|--------|--------------|
| In `projects.test.ts` oder eigener Suite | Create mit Items, Update (Teil-/Vollupdate, Items leeren), Delete (inkl. Abhängigkeiten) |
| Fehlerpfade | Nicht gefunden, Validierungsfehler, Transaktions-Rollback |
| Ruhige Zweige | Optional: Zugangscode, Rechnungszuordnung |

**Abnahme:** `supabase/services/projects` Branches von ~57 % auf > 65 %.

---

### Phase 3: delivery/commands + orders/commands

**Ziel:** Delivery- und Orders-Commands stärker abdecken.

| Bereich | Tests |
|---------|--------|
| delivery/commands | `createGoodsReceipt` (mit Items), `createCustomerDeliveryNote`, `updateCustomerDeliveryNote`, `addCustomerSignature`, `deleteCustomerDeliveryNote`; Fehlerfälle |
| orders/commands | `sendOrder`, `confirmOrder`, `cancelOrder`, `upsertOrderForProject`; Fehler und Randfälle |

**Abnahme:** Delivery Branches > 60 %, Orders Branches > 68 %.

---

### Phase 4: permissions + Restlücken

**Ziel:** `getEffectivePermissions` und weitere Zweige in `permissions.ts` abdecken.

| Aufgabe | Beschreibung |
|--------|--------------|
| permissions | RPC-Erfolg, leere/ungültige Daten, unbekannte Rolle; restriktive Matrix (Verkaeufer/Monteur) |
| Sonstige | Gezielt Dateien mit < 75 % Statements/Lines in `lib/` nachziehen (z. B. appointments, articles, company, complaints) – nur wenn Aufwand gering |

**Abnahme:** Permissions Branches von ~36 % auf > 55 %; globale Metriken nähern sich 75 %.

---

### Phase 5: Portal auth/reset/invite (nach Welle-4-Merge)

**Voraussetzung:** Welle 4 (Portal-Seiten dünn, API-Routen gehärtet) ist gemergt.

| Aufgabe | Beschreibung |
|--------|--------------|
| Portal Auth | Login-Flow (Erfolg/Fehler), Session-Handling |
| Reset | Passwort-Reset (Token gültig/ungültig/abgelaufen) |
| Invite | Einladung annehmen, Link ungültig, bereits eingeloggt |

**Abnahme:** Kritische Portal-Flows durch Tests abgesichert; Coverage für betroffene `lib/`-Module steigt.

---

## Reihenfolge & Meilensteine

1. **Phase 1** → ausführen, Coverage laufen lassen → Ziel: Branches global > 65 %.
2. **Phase 2** → ausführen → Ziel: Branches > 70 %, Statements/Lines näher an 75 %.
3. **Phase 3** → ausführen → Ziel: Branches ≥ 72 %, Statements/Lines ≥ 75 %.
4. **Phase 4** → ausführen → Ziel: **alle Metriken ≥ 75 %** (global über `lib/`).
5. **Phase 5** → nach Welle-4-Merge einplanen; hält Coverage und schützt Portal-Flows.

Nach jeder Phase: `cd apps/crm && CI=true pnpm test -- --coverage` und Werte in dieser Doc oder im Refactor-Report kurz festhalten.

---

## Vorschläge: Branch-Tests für ~75 % Branches

Aktuell **68,59 %** Branches. Um auf **~75 %** zu kommen, lohnen sich vor allem folgende Zweige (priorisiert nach Hebel):

### 1. delivery/commands.ts

| Zweig / Funktion | Test-Idee |
|-------------------|-----------|
| `createDeliveryNote` mit `items.length > 0` | Ein Lieferschein mit Items anlegen; Mock: insert Lieferschein, dann insert `delivery_note_items`; prüfen, dass `getDeliveryNote(data.id)` aufgerufen wird. |
| `createGoodsReceipt` mit Items | `createGoodsReceipt` mit `items: [{ projectItemId, quantityReceived }]`; Mocks für insert goods_receipt, insert goods_receipt_items, ggf. `updateInvoiceItemDeliveryStatus` / `updateProjectDeliveryStatus` (oder mocken). |
| `createCustomerDeliveryNote` Fehlercode 42P01 | RPC/DB-Fehler mit `code === '42P01'` oder Message „does not exist“ → prüfen, dass INTERNAL mit Hinweis auf Tabelle zurückkommt. |

### 2. projects/commands.ts

| Zweig / Funktion | Test-Idee |
|-------------------|-----------|
| `upsertItems`: bestehendes Item aktualisieren | `updateProject` mit `items: [{ id: 'existing-uuid', description: 'Geändert', ... }]`; Mock: select existing items liefert `['existing-uuid']`, dann update für dieses Item, dann getProject. |
| `upsertItems`: Items löschen (toDelete) | Update mit weniger Items als vorher; Mock: existing items [id1, id2], incoming nur [id1] → delete für id2 muss vorkommen. |
| `maybeCreateFirstPayment` | CreateProject mit `paymentSchedule: { autoCreateFirst: true, firstPercent: 20 }` und passenden Amounts; getInvoices mocken (leer), createInvoice mocken; prüfen, dass createInvoice aufgerufen wird (oder Ergebnis ok). |

### 3. permissions.ts

| Zweig / Funktion | Test-Idee |
|-------------------|-----------|
| `getCurrentCompanyId` Fallback (ohne RPC) | Mock: RPC liefert null/Fehler, dann `getCurrentUser` liefert User, dann `from('company_members').select()...maybeSingle()` liefert company_id; prüfen, dass diese company_id zurückkommt. |
| `getCurrentCompanyId` mit `is_active` und Fallback ohne Filter | Erst Abfrage mit is_active liefert nichts, zweite ohne is_active liefert company_id; prüfen, dass company_id aus zweiter Abfrage kommt. |
| `getEffectivePermissions` RPC-Fehler code P0001 | mockRpcResult({ error: { code: 'P0001' } }) → Fallback auf defaultPermissionsForRole (z. B. verkaeufer). |

### 4. orders/commands.ts und queries

| Zweig / Funktion | Test-Idee |
|-------------------|-----------|
| `updateOrder` INTERNAL bei Fehler | Mock: update liefert error → Ergebnis ok: false, code INTERNAL. |
| `getOrderByProject` NOT_FOUND | Bereits indirekt über upsertOrderForProject; ggf. explizit getOrderByProject mit PGRST116 testen. |

### 5. invoices (falls noch Lücken)

| Zweig / Funktion | Test-Idee |
|-------------------|-----------|
| `getInvoiceStats` mit Overdue-Logik | Mehrere Rechnungen, eine davon unpaid und due_date < today; prüfen, dass overdueCount korrekt. |
| `createCreditNote` mit partialAmount genau gleich remaining | remainingAmount = 700, partialAmount = 700; prüfen, dass Credit Note mit -700 erstellt wird. |

### 6. Sonstige lib/** mit vielen Zweigen

- **company.ts / numbering:** getNextDeliveryNoteNumber, getNextInvoiceNumber etc. – wenn in `lib/` und von Commands genutzt: Erfolg und Fehler mocken.
- **Validators:** In `projects/validators.ts`, `invoices/validators.ts` etc. Randfälle (leer, ungültige UUID, negative Beträge) abdecken, um Branch-Coverage der Validatoren zu erhöhen.

**Empfehlung:** Zuerst 1 (delivery mit Items) und 2 (projects upsertItems Update/Delete) umsetzen, dann Coverage erneut laufen lassen; danach 3 (permissions getCurrentCompanyId). So sollte die Branch-Coverage nahe oder über 75 % liegen.

---

## Optional: Jest-Thresholds anpassen

Falls ihr die globalen Schwellen vor Erreichen von 75 % Branches an den aktuellen Stand anpassen wollt (um CI grün zu halten), in `apps/crm/jest.config.mjs` z. B.:

- **Aktuell (nach Phasen 1–4 + Branch-Tests):** `statements: 83`, `branches: 71`, `lines: 87`, `functions: 93`
- Branches schrittweise auf 75 erhöhen, sobald weitere Branch-Tests (z. B. maybeCreateFirstPayment, orders updateOrder Fehler) umgesetzt sind.

Empfehlung: Thresholds erst anheben, wenn 75 % erreicht sind; bis dahin können sie auf aktuellem Stand bleiben oder temporär auskommentiert werden, damit CI nicht wegen Coverage fehlschlägt.

---

## Referenzen

- Refactor-Plan: `docs/WORLD_CLASS_REFACTOR_PLAN_2026-02-10.md` (Welle 5)
- Welle-4-Defizite: `docs/WELLE_4_DEFIZITE.md`
- Jest-Config: `apps/crm/jest.config.mjs` (`collectCoverageFrom`, `coverageThreshold`)
