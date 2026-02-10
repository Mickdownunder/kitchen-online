# Plan: Testing auf Weltklasse

Ziel: Unit-Tests und Integrationstests so ausbauen, dass kritische Pfade abgesichert sind, Coverage ehrlich gemessen wird und CI stabil läuft. Keine README/MD – nur umsetzbarer Plan aus Code-Analyse.

---

## 1. Zielbild „Weltklasse Testing“

| Bereich | Heute | Ziel |
|--------|--------|------|
| **Coverage** | Viele Services von collectCoverageFrom ausgenommen; 80 % nur auf Rest | Alle testbaren lib-Module in Coverage; Thresholds pro Bereich oder ehrliche globale Werte |
| **Kritische Pfade** | API-Helpers/Schema getestet; Route-Handler und Auth-Flows nicht | Booking-Webhook, Publish-Document, Chat-Stream, Auth (Login/Permission) auf Request-/Handler-Ebene abgesichert |
| **Services** | orders, invoices, delivery (teilw.), appointments, etc. getestet; auth, email, chat, projects, supplierInvoices, bankTransactions, portalDocuments excluded | Entweder: Excludes schrittweise entfernen + Tests ergänzen **oder** gezielte Integrationstests für exkludierte Bereiche |
| **E2E** | Playwright: Guards, CRM/Portal-Login (mit Credentials) | Wenige stabile Critical-Path-E2E (z. B. Login → eine Kernaktion); optional Test-User/Seed |
| **CI** | Jest + Playwright (retries in CI) | Flakiness minimiert; klare Trennung Unit vs E2E; schnelle Feedback-Schleife |

---

## 2. Phase 1: Foundation (Config + Mocks)

**Ziel:** Eine klare, ehrliche Coverage-Regel und einheitliche Test-Infrastruktur.

### 2.1 Jest-Config vereinheitlichen

- **Option A (empfohlen):** Excludes schrittweise reduzieren. Pro Sprint 1–2 bisher exkludierte Dateien in `collectCoverageFrom` aufnehmen und Tests so ergänzen, dass Thresholds halten.
- **Option B:** Excludes beibehalten, aber **projektweite** Thresholds senken (z. B. 75 % statements/lines, 60 % branches) und in einem Kommentar in `jest.config.mjs` festhalten: „Diese Werte gelten nur für nicht-exkludierte Module; exkludierte Bereiche werden über gezielte Integrationstests abgedeckt.“

Konkrete Schritte:

1. In `apps/crm/jest.config.mjs` am Anfang von `collectCoverageFrom` einen Kommentar einfügen, der alle Excludes auflistet und den Grund („schwer mockbar“ / „geplant für Integrationstests“) kurz notiert.
2. Entscheidung dokumentieren: „Wir streben an, bis [Datum] folgende Excludes zu entfernen: …“ (z. B. zuerst `lib/supabase/services/auth.ts`, dann `email.ts`, dann `portalDocuments.ts`).

### 2.2 Supabase-Mock erweitern

- In `__tests__/services/__mocks__/supabase.ts` fehlen ggf. Methoden, die exkludierte Services nutzen (z. B. `auth.resetPasswordForEmail`, `auth.updateUser`). Diese hinzufügen, damit zukünftige Auth-Tests den gleichen Mock nutzen können.
- Optional: Ein kleines Hilfsmodul `__tests__/helpers/mockSupabase.ts` das `mockQueryResult`, `mockGetUser`, `mockRpcResult` und `resetMock` re-exportiert und in einer Zeile einrichtet (z. B. `setupSupabaseMocks()`), damit neue Tests einheitlich starten.

### 2.3 Test-Naming und -Struktur

- Beibehalten: `__tests__/**/*.test.ts` neben dem Code (api/, services/, utils/, validations/).
- Konvention festlegen: Ein Testfile pro Modul/Route-Helper; Beschreibungen auf Deutsch oder Englisch einheitlich (z. B. `describe('auth service', () => { … })`).

**Meilenstein Phase 1:** Config kommentiert, Mock erweitert, Entscheidung Option A/B getroffen und im Plan vermerkt.

---

## 3. Phase 2: Unit – Excludes abbauen + Lücken schließen

**Ziel:** Alle sinnvoll unit-testbaren Module in der Coverage haben oder bewusst exkludieren mit Ersatz (Integration).

### 3.1 Priorisierte Liste „Excludes abbauen“

Reihenfolge nach Risiko und Mock-Aufwand (gering → hoch):

1. **`lib/supabase/services/auth.ts`**  
   - Mit bestehendem Supabase-Mock + `getCompanySettings`/`getEmployees` mocken.  
   - Tests: `getCurrentUser`, `getCurrentUserProfile` (mit/ohne User, mit „not found“ → Profile anlegen), `signIn`/`signOut` (Erfolg/Fehler), `resetPasswordForEmail`, `updatePassword` (nur Aufruf + Fehlerbehandlung).  
   - `signUp` + `linkEmployeeToUser` können vereinfacht getestet werden (z. B. nur signUp ohne Link, oder Link mit gemocktem Company/Employees).

2. **`lib/supabase/services/email.ts`**  
   - Transport (z. B. Resend/Fetch) mocken; Tests: „send mit gültigen Parametern“, „Fehler vom Transport“, „ungültige Parameter“.

3. **`lib/supabase/services/portalDocuments.ts`**  
   - Supabase-Aufrufe mocken; Tests: Lesen/Schreiben/Fehlerfälle.

4. **`lib/supabase/services/chat.ts`**  
   - Supabase + optional AI-Mock; Fokus auf reine DB/Logik-Äste.

5. **`lib/supabase/services/bankTransactions.ts`** / **`supplierInvoices.ts`**  
   - Analog zu orders/invoices: gleicher Mock-Pattern, Queries/Commands testen.

6. **`lib/supabase/services/projects.ts`** / **`delivery.ts`**  
   - Bereits Tests vorhanden (`projects.test.ts`, `delivery.test.ts`); nur Exclude in jest.config.mjs entfernen und prüfen, ob Coverage-Thresholds halten. Wenn nicht: gezielt fehlende Zweige testen.

### 3.2 Lücken in bestehenden Tests

- **API-Helper:**  
  - `app/api/booking/webhook/workflow.ts`: Mind. 1 Test (z. B. „calls createProjectAndOrderWithItems with correct payload“ mit gemocktem workflow).  
  - `app/api/chat/stream/request.ts` / `context.ts`: Bereits Tests; sicherstellen, dass alle Parse-/Auth-Fehlerfälle abgedeckt sind.  
  - `app/api/portal/publish-document/usecase.ts` + `persist.ts`: Mit gemocktem render + Supabase: „success path“, „render error“, „persist error“.

- **Middleware:**  
  - `lib/middleware/validateRequest.ts`: Bereits getestet; `sanitizeString`/`sanitizeObject` auf XSS-relevante Fälle prüfen.

**Meilenstein Phase 2:** Entweder (A) 3–4 der priorisierten Services aus den Excludes entfernt und grün **oder** (B) Thresholds angepasst + 2–3 gezielte Unit-Tests für die wichtigsten exkludierten Module (auth, email) geschrieben.

---

## 4. Phase 3: API / Integration (Route-Handler oder Request-Level)

**Ziel:** Kritische API-Flows ohne Browser testen – Request in, Response/Status prüfen.

### 3.1 Welche Routen zuerst?

1. **POST /api/booking/webhook**  
   - Gültige Signatur + Payload → 200, Body enthält projectId/orderNumber.  
   - Ungültige Signatur (Production) → 401.  
   - Ungültiges JSON → 400.  
   - Duplicate eventId → 200, skipped.

2. **POST /api/portal/publish-document**  
   - Unauthorized → 401.  
   - Authorized, gültiger Body → 200 (mit gemocktem Persist/Render).

3. **POST /api/chat/stream**  
   - Unauthorized → 401.  
   - Authorized, gültiger Body → 200/Stream (kann vereinfacht werden: z. B. nur prüfen, dass 200 und Content-Type stimmen, ohne Stream-Inhalt zu parsen).

### 3.2 Umsetzung

- **Variante A:** Next.js Route-Handler direkt aufrufen (z. B. `POST`-Request mit `NextRequest`), Supabase und externe Services (E-Mail, AI) mocken. Dafür müssen ggf. `createClient`/`createServiceClient` in den Routen über Dependency Injection oder env-basierte Test-Umgebung gemockt werden.
- **Variante B:** Einen kleinen „API-Integration“-Runner nutzen: echten Server starten (z. B. `next start` auf Test-Port), mit `fetch()` gegen localhost. Nur für wenige Critical-Path-Tests; Credentials/DB-State über Seed oder Test-User.

Empfehlung: Zuerst **Variante A** für Webhook + Publish-Document (Handler mit gemocktem Supabase/Env). Dafür in den Route-Files prüfen, ob sich `createClient()`/`createServiceClient()` einmalig über `process.env.TEST` o. ä. auf einen Test-Client umleiten lässt; wenn nicht, Handler-Logik in „pure“ Funktionen auslagern und diese unit-testen (bereits teilweise so bei helpers/usecase).

**Meilenstein Phase 3:** Mind. 2 kritische API-Flows (z. B. Webhook + Publish-Document) mit Request/Response-Tests abgedeckt.

---

## 5. Phase 4: E2E (Playwright) ausbauen

**Ziel:** Wenige stabile E2E-Tests für Critical Path; keine großen Flaky-Suiten.

### 4.1 Beibehalten

- Unauthenticated guards (Redirects, API 401).  
- CRM-/Portal-Login, wenn Credentials gesetzt (optional: Test-User in DB-Seed).

### 4.2 Erweiterungen (optional, niedrige Priorität)

- **Ein** E2E nach Login: z. B. „CRM Login → Dashboard sichtbar“ oder „Portal Login → Dokumentenliste sichtbar“.  
- Alle E2E mit `test.skip()` wenn nötige Env (z. B. `PW_CRM_EMAIL`) fehlt, damit CI ohne Credentials trotzdem grün ist.

### 4.3 Stabilität

- Timeouts großzügig (bereits 30s); bei Flakiness: `trace: 'on-first-retry'` nutzen und lokale Runs mit `--trace on` analysieren.  
- Keine E2E für reine API-Coverage – die gehört in Phase 3.

**Meilenstein Phase 4:** Guards + Login stabil; optional 1 weiterer E2E-Schritt; CI dokumentiert (welche Env für E2E nötig).

---

## 6. Phase 5: CI und Regeln

### 6.1 CI

- **Unit:** `pnpm test` (Jest) bei jedem Push/PR; Coverage-Report als Artefakt (z. B. `jest --coverage`).  
- **E2E:** Playwright in CI mit `retries: 2`; nur wenn sinnvoll (z. B. auf main oder vor Release). Env-Variablen für E2E in CI-Docs auflisten.

### 6.2 Regeln (für das Team)

- Neue lib-Module (services, utils, middleware): Mind. 1 Testfile; keine pauschalen Excludes für neue Dateien.  
- Neue API-Route mit kritischer Logik: Entweder Unit-Tests für Helper/Use-Case **oder** ein Integrationstest (Phase 3).  
- Coverage-Thresholds nicht senken, um „grün“ zu werden – stattdessen Tests ergänzen oder gezielt exkludieren mit Begründung im Config-Kommentar.

---

## 7. Kurz-Checkliste (Reihenfolge)

- [x] **Phase 1:** Jest-Config kommentieren (Excludes + Strategie); Supabase-Mock um fehlende Auth-Methoden erweitern; Option A festgelegt.  
- [x] **Phase 2:** Auth-Tests ergänzt (`auth.service.test.ts`); projects/delivery Exclude entfernt, Coverage hält.  
- [x] **Phase 2:** publish-document usecase + persist Tests (`publishDocument.usecase.test.ts`, `publishDocument.persist.test.ts`).  
- [x] **Phase 3:** Webhook POST (`bookingWebhook.route.test.ts`) und Publish-Document Route (`publishDocument.route.test.ts`) als API-Tests.  
- [x] **Phase 4:** E2E-Guards + Login mit `test.skip()` wenn Credentials fehlen (bereits in `tests/smoke.spec.ts`).  
- [ ] **Phase 5:** CI-Setup dokumentieren; Team-Regel „neue Module = mind. 1 Test“ in Contributing/Onboarding erwähnen.  
  **Hinweis:** Unit-Tests: `pnpm test` (Jest, Coverage); E2E: `pnpm test:e2e` (Playwright). Ohne Credentials laufen E2E-Login-Tests per `test.skip()` durch.

---

## 8. Geschätzter Aufwand (Orientierung)

| Phase | Aufwand (Personentage) |
|-------|------------------------|
| Phase 1 | 0,5–1 |
| Phase 2 (ohne alle Excludes) | 2–4 (auth + email + 1–2 Services) |
| Phase 3 (2 API-Flows) | 1–2 |
| Phase 4 (E2E stabil + 1 Schritt) | 0,5–1 |
| Phase 5 (CI + Regeln) | 0,5 |
| **Summe** | **~5–9 Tage** |

Mit diesem Plan arbeitet ihr Testing auf ein weltklasse-taugliches Niveau: ehrliche Coverage, abgesicherte kritische Pfade und stabile CI.
