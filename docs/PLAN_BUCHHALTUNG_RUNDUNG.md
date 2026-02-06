# Plan: Buchhaltung – Rundung und Präzision auf 100%

## Ausgangslage (Audit-Befunde)

Laut [`docs/BUCHHALTUNG_AUDIT_ERGEBNIS.md`](BUCHHALTUNG_AUDIT_ERGEBNIS.md):

1. **createInvoice**: Netto/MwSt werden bereits mit `roundTo2Decimals` gerundet – korrekt.
2. **updateInvoice**: `netAmount` und `taxAmount` werden **nicht** gerundet vor Speicherung.
3. **Eingangsrechnungen (supplier_invoices)**: `netAmount` wird ungerundet gespeichert; `Math.round` statt zentraler Utility.
4. **Projekte**: `total_amount`, `net_amount`, `tax_amount` und Item-Positionen werden teils ungerundet gespeichert.
5. **KI-Handler** `handleUpdateFinancialAmounts`: Berechnet `netAmount = totalAmount/1.2` ohne Rundung.
6. **UVA-Steuersatz-Buckets**: Nur 0, 10, 13, 20% – Rechnungen mit anderem Satz (z.B. 5%, 7%) landen fälschlich unter 20%.

---

## 1. Zentrale Rundungs-Utility

**Datei:** [`apps/crm/lib/utils/priceCalculations.ts`](apps/crm/lib/utils/priceCalculations.ts)

- `roundTo2Decimals(value: number)` existiert bereits.
- **Regel:** Überall, wo Beträge in die DB geschrieben werden, muss `roundTo2Decimals` verwendet werden – nicht `Math.round(x*100)/100` (Konsistenz).

---

## 2. Ausgangsrechnungen (invoices)

**Datei:** [`apps/crm/lib/supabase/services/invoices.ts`](apps/crm/lib/supabase/services/invoices.ts)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `updateInvoice` (Zeile 296-297) | `net_amount`, `tax_amount` ungerundet | `roundTo2Decimals(updates.netAmount)`, `roundTo2Decimals(updates.taxAmount)` |
| `createInvoice` | Bereits korrekt | – |
| `createCreditNote` | Bereits `roundTo2Decimals` | – |

---

## 3. Eingangsrechnungen (supplier_invoices)

**Datei:** [`apps/crm/lib/supabase/services/supplierInvoices.ts`](apps/crm/lib/supabase/services/supplierInvoices.ts)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `createSupplierInvoice` | `Math.round` für tax/gross; `netAmount` ungerundet | Import `roundTo2Decimals`; `netAmount`, `taxAmount`, `grossAmount`, `skontoAmount` vor Insert runden |
| `updateSupplierInvoice` | Keine Rundung | `net_amount`, `tax_amount`, `gross_amount`, `skonto_amount` mit `roundTo2Decimals` vor Update |

**Logik für Brutto aus Netto+Tax:**  
`grossAmount = roundTo2Decimals(netAmount + taxAmount)` – damit net + tax = gross (auf 2 Dezimalen) konsistent bleibt.

---

## 4. Projekte (projects)

**Datei:** [`apps/crm/lib/supabase/services/projects.ts`](apps/crm/lib/supabase/services/projects.ts)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `createProject` (Zeile 161-163) | `total_amount`, `net_amount`, `tax_amount` ungerundet | `roundTo2Decimals(project.totalAmount)`, etc. |
| `updateProject` (Zeile 393-395) | Keine Rundung | `roundTo2Decimals` für `total_amount`, `net_amount`, `tax_amount` |
| `itemsToInsert` (createProject) | `net_total`, `tax_amount`, `gross_total` aus calculateItemTotals (bereits gerundet) | Zusätzlich: `price_per_unit`, `gross_price_per_unit`, `purchase_price_per_unit` mit `roundTo2Decimals` |
| `updateProjectItems` (upsert) | Analog | Gleiche Rundung für alle Beträge |

---

## 5. useProjectSubmit

**Datei:** [`apps/crm/components/Project/useProjectSubmit.ts`](apps/crm/components/Project/useProjectSubmit.ts)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `totalAmount`, `netAmount`, `taxAmount` | Aus `calculations` (bereits von `calculateProjectTotals` gerundet) | Optional: explizit `roundTo2Decimals` als Sicherheit |
| `depositAmount` | `reduce((sum, p) => sum + p.amount, 0)` | `roundTo2Decimals(...)` – `p.amount` kann Gleitkomma haben |

---

## 6. KI-Handler (projectHandlers)

**Datei:** [`apps/crm/app/providers/ai/handlers/projectHandlers.ts`](apps/crm/app/providers/ai/handlers/projectHandlers.ts)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `handleUpdateFinancialAmounts` | `netAmount = totalAmount/1.2`, `taxAmount = totalAmount - totalAmount/1.2` ungerundet | `roundTo2Decimals(totalAmount)`, `roundTo2Decimals(net)`, `taxAmount = amountRounded - netRounded` (damit net+tax=amount) |

---

## 7. SupplierInvoicesView (Formular)

**Datei:** [`apps/crm/components/accounting/SupplierInvoicesView.tsx`](apps/crm/components/accounting/SupplierInvoicesView.tsx)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| `handleSubmit` | `formData` wird direkt an `createSupplierInvoice`/`updateSupplierInvoice` übergeben | Vor dem Aufruf: `netAmount`, `taxAmount`, `grossAmount`, `skontoAmount` mit `roundTo2Decimals` normalisieren |
| `parseFloat` bei Eingabe | Kann viele Nachkommastellen liefern | Beim Speichern immer runden; Anzeige bleibt `toLocaleString` |

---

## 8. AccountingView (UVA/Darstellung)

**Datei:** [`apps/crm/components/AccountingView.tsx`](apps/crm/components/AccountingView.tsx)

| Stelle | Aktuell | Fix |
|--------|---------|-----|
| UVA-Entries (Zeile 328-330) | `Math.round(x*100)/100` | `roundTo2Decimals(x)` – Konsistenz mit Rest der App |
| UVA-Steuersatz-Buckets | Nur 0, 10, 13, 20% | **Dynamisch:** Buckets aus tatsächlich vorkommenden `invoice.taxRate`-Werten bilden; keine Rechnung fällt fälschlich unter 20% |

---

## 9. Weitere Stellen (Vollständigkeit)

| Datei | Prüfung |
|-------|---------|
| [`apps/crm/app/payments/page.tsx`](apps/crm/app/payments/page.tsx) | Bereits `roundTo2Decimals` – ok |
| [`apps/crm/app/api/accounting/bank-transactions/import-pdf/route.ts`](apps/crm/app/api/accounting/bank-transactions/import-pdf/route.ts) | `Math.round(t.amount*100)/100` – auf `roundTo2Decimals` umstellen (Import aus priceCalculations) |
| [`apps/crm/hooks/useInvoiceCalculations.ts`](apps/crm/hooks/useInvoiceCalculations.ts) | `calculateLatePaymentInterest` nutzt `Math.round` – auf `roundTo2Decimals` umstellen |

---

## 10. UVA-Steuersatz-Buckets (dynamisch)

**Problem:** Rechnungen mit Steuersatz 5%, 7% etc. landen in `uva[invoice.taxRate] || uva[20]` und werden unter 20% ausgewiesen.

**Lösung:** In `AccountingView` die UVA-Struktur dynamisch aus den tatsächlichen `taxRate`-Werten der `filteredInvoices` aufbauen – kein festes Objekt mit nur 0, 10, 13, 20.

```typescript
// Statt festen Buckets: uva[rate] aus invoice.taxRate ableiten
const uva: Record<number, UVAEntry> = {}
filteredInvoices.forEach(invoice => {
  const rate = invoice.taxRate
  if (!uva[rate]) uva[rate] = { taxRate: rate, netAmount: 0, taxAmount: 0, grossAmount: 0, invoiceCount: 0 }
  // ...
})
```

---

## Implementierungsreihenfolge

1. **supplierInvoices.ts** – create/update mit `roundTo2Decimals`
2. **invoices.ts** – `updateInvoice` net/tax runden
3. **projects.ts** – create/update + Items runden
4. **projectHandlers.ts** – `handleUpdateFinancialAmounts` runden
5. **useProjectSubmit.ts** – `depositAmount` runden
6. **SupplierInvoicesView.tsx** – formData vor Speichern runden
7. **AccountingView.tsx** – `roundTo2Decimals` + dynamische UVA-Buckets
8. **bank-transactions import** + **useInvoiceCalculations** – `roundTo2Decimals` nutzen

---

## Konsistenz-Regel

**Vor jedem DB-Insert/Update von Geldbeträgen:**  
`roundTo2Decimals(value)` anwenden.  
**Bei abgeleiteten Werten (net+tax=gross):** Netto runden, MwSt = Brutto − Netto (damit exakt net+tax=gross).
