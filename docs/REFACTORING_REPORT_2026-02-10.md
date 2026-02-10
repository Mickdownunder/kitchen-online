# Refactoring-Bericht (Stand: 2026-02-10)

## Kontext
- Repo: `/Users/michaellabitzke/kitchen-online`
- Branch: `main`
- Letzter Commit: `12208c2` (`fix: KI sieht Kalender-Termine, scheduleAppointment schreibt in planning_appointments`)
- Scope dieses Berichts: `apps/crm` (TypeScript, React, Next.js)

## Executive Summary
- Das große Refactoring hat die Basis stark verbessert: Tests sind stabil und breit vorhanden.
- Der aktuelle Hauptblocker ist die Lint-Qualität: `45 Errors` verhindern ein sauberes Quality Gate.
- Testlage ist sehr gut: `27/27` Suites und `538/538` Tests grün.
- Coverage ist ordentlich, aber mit klarer Branch-Lücke:
  - Statements `80.53%`
  - Branches `62.64%`
  - Functions `92.07%`
  - Lines `84.55%`
- Für Top-Niveau ist der nächste Schritt klar: erst Lint-Errors auf `0`, dann Warnungen reduzieren, dann gezielte Struktur-Refactorings bei den größten Dateien.

## Messdaten

### Lint
- Ergebnis: `45 Errors`, `230 Warnings`
- Top-Regeln:
  - `no-console`: `110`
  - `@typescript-eslint/explicit-function-return-type`: `63`
  - `@typescript-eslint/no-unused-vars`: `26`
  - `@typescript-eslint/no-require-imports`: `18`
  - `react-hooks/set-state-in-effect`: `16`

### Tests
- Kommando: `pnpm exec jest --runInBand --watchman=false`
- Ergebnis: `27 passed`, `538 passed`

### Coverage
- Kommando:
  `pnpm exec jest --runInBand --watchman=false --coverage --coverageDirectory=/tmp/crm-coverage --coverageReporters=text-summary`
- Ergebnis:
  - Statements: `80.53%` (`1316/1634`)
  - Branches: `62.64%` (`607/969`)
  - Functions: `92.07%` (`186/202`)
  - Lines: `84.55%` (`1199/1418`)

### Größen-Hotspots (Code, ohne `.next`)
- `apps/crm/components/accounting/SupplierInvoicesView.tsx` (`1182` LOC)
- `apps/crm/components/ProjectList.tsx` (`1130` LOC)
- `apps/crm/components/AccountingExports.tsx` (`954` LOC)
- `apps/crm/components/Project/ProjectItemsTab.tsx` (`867` LOC)
- `apps/crm/components/InvoicePDF.tsx` (`814` LOC)
- `apps/crm/lib/supabase/services/projects.ts` (`738` LOC)

## Priorisierte Befunde

### P0 (direkt): Lint-Errors mit Stabilitäts-/Wartungsrisiko
1. `require()` in Tests (18x, blockiert Lint)
   - Beispiele:
     - `apps/crm/__tests__/api/validation.test.ts:107`
     - `apps/crm/__tests__/services/company.test.ts:7`
     - `apps/crm/__tests__/services/projects.test.ts:7`

2. React-Hooks-Fehler mit realem Runtime-Risiko
   - Beispiele:
     - `apps/crm/app/customers/CustomersClient.tsx:18` (`loadCustomers` vor Deklaration genutzt)
     - `apps/crm/hooks/useEmployees.ts:17` (`loadEmployees` vor Deklaration genutzt)
     - `apps/crm/components/invoices/InvoiceTable.tsx:89` (Mutation im Render-Pfad)
     - `apps/crm/hooks/useAISpeech.ts:29` (Ref-Zugriff/Update im Render)
     - `apps/crm/components/ai/ProactiveSuggestions.tsx:49` (`Date.now()` in rendernaher Berechnung)

### P1 (kurzfristig): Warnungen, die technische Schuld erhöhen
1. `no-console` (110x) in produktionsnahem Code.
2. Fehlende Return-Types (63x) in Hooks/Utils/Services.
3. `any` weiter präsent (`157` Treffer im Non-Test-Code-Scope).

### P2 (mittelfristig): Große Dateien als Änderungsrisiko
- Mehrere produktive Dateien sind deutlich >700 LOC.
- Folgen: höhere Merge-Konflikt-Rate, schwächere Test-Isolation, langsamere Reviews.

## Empfohlener Refactoring-Plan

### Phase 1: Lint-Blocker auflösen (1-2 Tage)
- Ziele:
  - `eslint errors = 0`
  - Tests weiterhin komplett grün
- Maßnahmen:
  - `require()` in Tests auf ES-Imports migrieren.
  - Hooks-Verstöße korrekt beheben (kein Rule-Silencing):
    - Funktionsdeklarationen vor `useEffect`-Nutzung.
    - Render-Mutationen entfernen, deterministisch ableiten.
    - Impure Berechnungen außerhalb Render-Pfad ziehen.

### Phase 2: Warnungsabbau mit Standards (2-4 Tage)
- Ziele:
  - Warnungen < `80`
  - `no-console` nur in explizit erlaubten Skripten
- Maßnahmen:
  - Logging-Policy vereinheitlichen (`logger` für Runtime-Code).
  - Return-Types zuerst in kritischen Hooks/Services.
  - `any` entlang API-Response-/Service-Grenzen systematisch ersetzen.

### Phase 3: Struktur-Hardening (1-2 Wochen)
- Ziele:
  - Keine produktive Datei > `600` LOC (Ausnahmen dokumentiert)
  - Branch Coverage > `70%`
- Maßnahmen:
  - Große UI-Dateien in Container + Domain-Hooks + Presentational Components splitten.
  - Service-Module entlang Use-Cases schneiden (`projects`, `delivery`, `invoices`).
  - Fehlende Branch-Tests bei Zahlungs-/Status-/Terminlogik ergänzen.

## Sofortige nächste Arbeitspakete
1. Lint-P0 beheben bis `eslint errors = 0`.
2. `no-console` in API-Routen/Supabase-Layer bereinigen.
3. Erstes Struktur-Refactoring in:
   - `apps/crm/components/ProjectList.tsx`
   - `apps/crm/components/accounting/SupplierInvoicesView.tsx`
4. Branch-Tests für Rechnungs- und Zahlungsflüsse hinzufügen.

## Reproduzierbare Kommandos
- `pnpm -C apps/crm lint`
- `pnpm exec eslint . -f json -o /tmp/crm-eslint.json`
- `pnpm exec jest --runInBand --watchman=false`
- `pnpm exec jest --runInBand --watchman=false --coverage --coverageDirectory=/tmp/crm-coverage --coverageReporters=text-summary`
