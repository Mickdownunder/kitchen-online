# Plan: 66 Build-Fehler beheben

## Übersicht
Es gibt 66 TypeScript-Fehler im CRM-Build. Ursachen:
1. **Database Types veraltet** (~45 Fehler): `database.types.ts` fehlen Tabellen/Spalten
2. **Code-Bugs** (~21 Fehler): fehlende Variablen, Typen, Duplikate

## Phase 1: database.types.ts aktualisieren

### Fehlende Tabellen hinzufügen:
- `bank_transactions`
- `order_sign_tokens`
- `supplier_invoice_custom_categories`

### Fehlende Spalten in bestehenden Tabellen:
- **company_settings**: `order_prefix`, `next_order_number`, `delivery_note_prefix`, `next_delivery_note_number`
- **projects**: `order_contract_signed_at`, `order_contract_signed_by`
- **delivery_notes**: `delivery_note_number` (Hinweis: Schema hat nur supplier_delivery_note_number – company.ts muss customer_delivery_notes nutzen)

## Phase 2: Code-Fixes (unabhängig von DB-Types)

| Datei | Problem | Fix |
|-------|---------|-----|
| DeliveryNoteList.tsx | sortField, sortDirection, handleSort fehlen | useState für Sortierung hinzufügen |
| ArticleForm.tsx | Duplicate property 'description' | Spread-Reihenfolge anpassen |
| CustomerDeliveryNoteModal.tsx | deliveryNoteNumber: undefined nicht erlaubt | createCustomerDeliveryNote akzeptiert optional – Typ anpassen |
| InvoicePDF.tsx, InvoicePDFServer.tsx | `isCredit && { backgroundColor }` → false | Ternary: `isCredit ? { backgroundColor } : undefined` |
| useProjectSubmit.ts | orderNumber: string \| undefined | Fallback auf leeren String oder Typ anpassen |
| pdfGenerator.ts | ReactElement<unknown> nicht assignable | Type assertion für DocumentProps |
| supplierInvoices.ts | inv.category: string vs SupplierInvoiceCategory | Type assertion `as SupplierInvoiceCategory` |
| company.ts | delivery_notes hat kein delivery_note_number | customer_delivery_notes statt delivery_notes abfragen |

## Phase 3: Verifikation
- `pnpm build` muss durchlaufen
- `ignoreBuildErrors` in next.config.js auf false lassen (oder entfernen)
