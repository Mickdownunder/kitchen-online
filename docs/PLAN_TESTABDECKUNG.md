# Plan: Testabdeckung ausreichend machen

## Ziel

- **Coverage-Ziel:** ≥70% Statements, ≥60% Branches, ≥65% Functions, ≥70% Lines
- **Aktuell:** ~49% Statements, ~36% Branches
- **Begründung:** Für Produktion empfohlen sind 70–80%.

---

## Phase 1: Pure Utils (Quick Wins)

Diese Module bestehen aus reinen Funktionen ohne DB/Auth – einfache Unit-Tests.

| Datei | Funktionen | Neue Testdatei |
|-------|------------|----------------|
| `apps/crm/lib/utils/addressFormatter.ts` | `formatCustomerAddress`, `parseAddressFromDB` | `__tests__/utils/addressFormatter.test.ts` |
| `apps/crm/lib/utils/formatters.ts` | `formatCurrency`, `formatCurrencyWithSymbol`, `formatDate`, `formatDateRange` | `__tests__/utils/formatters.test.ts` |
| `apps/crm/lib/utils/customerNameParser.ts` | `parseCustomerName`, `formatCustomerName` | `__tests__/utils/customerNameParser.test.ts` |

---

## Phase 2: Auth-Guards für weitere API-Routes

Erweiterung von `apps/crm/__tests__/api/guards.test.ts` um Guards für:

| Route | Methoden | Zu testende Fälle |
|-------|----------|-------------------|
| `/api/users/members` | GET, POST, PATCH, DELETE | 401 ohne User, 403 ohne `can_manage_users`, 403 ohne Company |
| `/api/users/permissions` | GET | 401 ohne User, 403 ohne Company |
| `/api/audit-logs` | GET | 401 ohne User, 403 ohne Permission |
| `/api/calendar/team` | GET | 401 ohne User |

Die Mock-Struktur (mockAuthGetUser, mockRpc, mockFrom) ist bereits vorhanden.

---

## Phase 3: Service-Unit-Tests (erweitert)

Services mit Mock für Supabase-Client testen:

| Service | Funktionen | Testdatei |
|---------|------------|-----------|
| `lib/supabase/services/projects.ts` | `getProject`, `getProjects` | `__tests__/services/projects.test.ts` |
| `lib/supabase/services/company.ts` | `getCompanySettingsById` | Erweiterung `company.test.ts` |
| `lib/supabase/services/delivery.ts` | `getDeliveryNotes`, etc. | `__tests__/services/delivery.test.ts` |
| `lib/supabase/services/appointments.ts` | `getAppointments`, `createAppointment` | `__tests__/services/appointments.test.ts` |
| `lib/supabase/services/orders.ts` | `getOrders`, `createOrder` | `__tests__/services/orders.test.ts` |

---

## Phase 4: Weitere Utils und Middleware

| Modul | Inhalt | Testdatei |
|-------|--------|-----------|
| `lib/utils/statusHelpers.ts` | `getStatusColor`, `getStatusLabel`, etc. | `__tests__/utils/statusHelpers.test.ts` |
| `lib/utils/emailTemplates.ts` | `reminderTemplate`, `invoiceTemplate` | `__tests__/utils/emailTemplates.test.ts` |
| `lib/middleware/rateLimit.ts` | `RateLimiter.check`, `rateLimit` | `__tests__/middleware/rateLimit.test.ts` |

---

## Phase 5: Coverage-Threshold in Jest

`apps/crm/jest.config.mjs` – umgesetzt:

```javascript
coverageThreshold: {
  global: {
    statements: 38,
    branches: 28,
    functions: 44,
    lines: 40,
  },
},
```

Aktuell: ~44% Statements, ~33% Branches, ~54% Functions, ~46% Lines.  
Threshold: 41/31/51/43. Ziel 70% erfordert weitere Tests (mehr Services, API-Routes).

---

## Phase 6: Permissions & Complaints (erledigt)

- [x] `permissions.test.ts` – getEffectivePermissions, getCurrentCompanyId, getCompanyMembers (mit `mockRpcResult` im Supabase-Mock)
- [x] `complaints.test.ts` – getComplaints, getComplaint, createComplaint, updateComplaint, deleteComplaint

---

## Nicht im Scope

- **React-Komponenten** – erfordert Test-Setup für `.tsx`
- **PDF-Generator** – stark mit React verknüpft
- **AI/Agent-Logik** – externe Abhängigkeiten
- **bankTransactions, supplierInvoices** – optional

---

## Reihenfolge der Umsetzung

1. Phase 1 (Pure Utils)
2. Phase 2 (Guards)
3. Phase 3 (Services)
4. Phase 4 (Utils/Middleware)
5. Phase 5 (Threshold) – ggf. weitere Tests nachmessen

---

## Todos (zum Abhaken)

- [x] Phase 1: addressFormatter.test.ts
- [x] Phase 1: formatters.test.ts
- [x] Phase 1: customerNameParser.test.ts
- [x] Phase 2: Api/users/members Guards
- [x] Phase 2: Api/users/permissions Guards
- [x] Phase 2: Api/audit-logs Guards
- [x] Phase 2: Api/calendar/team Guards
- [x] Phase 3: projects.test.ts
- [x] Phase 3: company.test.ts erweitern
- [x] Phase 3: delivery.test.ts
- [x] Phase 3: appointments.test.ts
- [x] Phase 3: orders.test.ts
- [x] Phase 4: statusHelpers.test.ts
- [x] Phase 4: emailTemplates.test.ts
- [x] Phase 4: rateLimit.test.ts
- [x] Phase 5: jest.config.mjs + Coverage-Threshold
- [x] Phase 6: permissions.test.ts
- [x] Phase 6: complaints.test.ts
