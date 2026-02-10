# World-Class Refactor Plan (Stand: 2026-02-10)

## Stand: umgesetzt

Alle Wellen dieses Plans sind umgesetzt:

- **Welle 1:** Projekt-Flow entkoppelt (ProjectList, ProjectBasicsTab, ProjectItemsTab, ProjectDocumentsTab, useProjectDocuments; Zerlegung in Container/Toolbar/Table/Stats, Sections, UI-Module).
- **Welle 2:** Rechnungen, Payments, Accounting stabilisiert (Query/Mutation-Layer, Headless/Presentational, Hooks, zentrale Money-Utilities).
- **Welle 3:** Service-Layer domänenscharf (projects, invoices, delivery, supplierInvoices, orders mit queries/commands/mappers/validators).
- **Welle 4:** Portal + API-Routen gehärtet: Portal-Seiten dünn (Komposition + Hooks, UI/Utils ausgelagert in z. B. dashboard.ui, documents.ui); Chat-API mit Zod-Schema + safeParse; publish-document Route schlank, Use-Case/Mappers in eigene Module; Booking-Webhook mit Retry/Backoff.
- **Welle 5:** Test-Hardening umgesetzt (Invoice/Payment, Delivery, Project, Permissions; Branch-Coverage > 70 %). Portal auth/reset/invite (Punkt 5) bleibt wie vereinbart nach Welle-4-Merge.
- **Welle 6:** Platform-Standards wie beschrieben (PR-Checkliste, CI Gates).

Details zu Coverage siehe `docs/COVERAGE_PLAN_75.md`, zu Architektur `docs/ARCHITECTURE.md`.

---

## Baseline (ist bereits erreicht)
- Monorepo `lint`: grün
- Monorepo `build`: grün
- Monorepo `test`: grün (mit `CI=true`)
- `apps/crm`: `0 errors`, `0 warnings`, `27/27` Tests grün

## Zielbild (World-Class)
1. Jede produktive Datei hat genau einen klaren Zweck.
2. Große Dateien sind in testbare Module zerlegt.
3. Geschäftslogik sitzt in Domain-Hooks/Services, nicht in UI-Komponenten.
4. Kritische Flows sind durch Integrations- und Branch-Tests abgesichert.
5. Performance, Observability und Security sind als Standard-Gates verankert.

## Harte Qualitätsgrenzen
- Components: <= 350 LOC
- Pages: <= 300-400 LOC
- Hooks: <= 220 LOC
- Services: <= 300-400 LOC pro Modul
- API-Routen: <= 220 LOC
- Keine neue Datei > Grenze ohne dokumentierte Ausnahme

## Ausführungsstrategie (in genau dieser Reihenfolge)

### Welle 1: Projekt-Flow entkoppeln (höchster ROI)
Betroffene Dateien:
- `apps/crm/components/ProjectList.tsx`
- `apps/crm/components/Project/ProjectBasicsTab.tsx`
- `apps/crm/components/Project/ProjectItemsTab.tsx`
- `apps/crm/components/Project/ProjectDocumentsTab.tsx`
- `apps/crm/components/Project/useProjectDocuments.ts`

Zerlegung:
1. `ProjectList.tsx` split in:
   - `ProjectListContainer` (state + orchestration)
   - `ProjectListToolbar`
   - `ProjectListTable`
   - `ProjectListStats`
2. `ProjectBasicsTab.tsx` split in:
   - `CustomerSection`
   - `SalesSection`
   - `ScheduleSection`
   - `AddressSection`
3. `ProjectItemsTab.tsx` split in:
   - `ItemsTable`
   - `ItemRowEditor`
   - `ItemTotalsPanel`
4. `ProjectDocumentsTab.tsx` split in:
   - `DocumentsHeader`
   - `DocumentsFilterBar`
   - `DocumentsList`
   - `SignatureProofModal`
5. `useProjectDocuments.ts` split in:
   - query hook
   - actions hook
   - pure mapper utilities

Abnahme:
- Keine Verhaltensänderung
- Gleiches UI/UX
- Test-Coverage für Mapping/Filter/Actions ergänzt

### Welle 2: Rechnungen + Payments + Accounting stabilisieren
Betroffene Dateien:
- `apps/crm/components/accounting/SupplierInvoicesView.tsx`
- `apps/crm/components/InvoiceList.tsx`
- `apps/crm/components/InvoiceView.tsx`
- `apps/crm/app/payments/page.tsx`
- `apps/crm/components/AccountingView.tsx`
- `apps/crm/components/useAccountingData.ts`

Zerlegung:
1. Separate Query/Mutation-Layer für Rechnungen/Eingangsrechnungen.
2. UI in Headless-Logik + Presentational Components aufteilen.
3. Form-Logik in dedizierte Hooks (`useInvoiceForm`, `useSupplierInvoiceForm`, `usePaymentFlow`).
4. Alle Money-Berechnungen nur über zentrale Utilities.

Abnahme:
- Alle Zahlungsszenarien regression-getestet
- Keine doppelte Berechnungslogik

### Welle 3: Service-Layer domänenscharf schneiden
Betroffene Dateien:
- `apps/crm/lib/supabase/services/projects.ts`
- `apps/crm/lib/supabase/services/invoices.ts`
- `apps/crm/lib/supabase/services/delivery.ts`
- `apps/crm/lib/supabase/services/supplierInvoices.ts`
- `apps/crm/lib/supabase/services/orders.ts`

Zerlegung je Domain:
1. `queries.ts` (read paths)
2. `commands.ts` (write paths)
3. `mappers.ts` (DTO -> Domain)
4. `validators.ts` (input/output guards)

Abnahme:
- Einheitliche Error-Objekte
- Kein Inline-SQL/Mapping-Mix in Public API
- Unit-Tests pro Mapper/Validator

### Welle 4: Portal + API-Routen härten
Betroffene Bereiche:
- `apps/crm/app/portal/**/page.tsx` (größte Seiten zuerst)
- `apps/crm/app/api/chat/**`
- `apps/crm/app/api/booking/webhook/route.ts`
- `apps/crm/app/api/portal/publish-document/route.ts`

Ziele:
1. Seiten nur als Komposition + orchestrierende Hooks.
2. API-Routen mit fixer Pipeline:
   - input schema validation
   - auth/permission guard
   - use-case call
   - error mapping
3. Retry/idempotency bei externen Webhook-Flows.

### Welle 5: Test-Hardening für kritische Geschäftslogik
Pflichttests:
1. Invoice/Payment state machine
2. Delivery status transitions
3. Project workflow transitions
4. Permission edge-cases
5. Portal auth/reset/invite flows

Ziel:
- Branch-Coverage > 70%

### Welle 6: Platform-Standards (Dauerhaft)
1. PR-Template mit Checkliste:
   - boundaries respected
   - tests added
   - security impact reviewed
2. CI Gates:
   - lint
   - tests
   - build
   - changed-files LOC cap warning
3. Optional:
   - bundle budget checks
   - route performance budget

## Nicht verhandelbare Regeln pro Refactor-PR
1. Kleine, logisch abgeschlossene Pakete (kein Big-Bang).
2. Verhalten bleibt identisch, außer explizit geändert.
3. Nach jedem Paket:
   - `pnpm lint`
   - `CI=true pnpm test`
   - `pnpm build`
4. Neue Dateien nur mit klarer Verantwortlichkeit.
5. Keine Architektur-Schulden durch schnelle Workarounds.

## Konkreter Start (jetzt)
1. Welle 1, Paket A:
   - `ProjectList.tsx` + `useProjectDocuments.ts`
2. Welle 1, Paket B:
   - `ProjectBasicsTab.tsx` + `ProjectItemsTab.tsx`
3. Welle 1, Paket C:
   - `ProjectDocumentsTab.tsx`

Das ist die Reihenfolge für maximalen Nutzen bei minimalem Regressionsrisiko.
