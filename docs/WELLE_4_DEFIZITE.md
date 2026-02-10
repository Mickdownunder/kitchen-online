# Welle 4 – Was genau falsch oder fehlt

Kurzfassung: Wo die Umsetzung vom Plan abweicht und was konkret zu tun wäre.

---

## 1. Portal-Seiten: „Nur Komposition + orchestrierende Hooks“

**Plan:** Seiten nur als Komposition + orchestrierende Hooks (dünne Pages, Richtwert ≤ 300–400 LOC).

### 1.1 `app/portal/page.tsx` (518 LOC)

**Was falsch/fehlt:**

- Die Page enthält **viele lokale Konstanten und Hilfsfunktionen** statt sie in Hooks/Utils/Components auszulagern:
  - **Zeilen 26–33:** `statusSteps` – Array mit Workflow-Schritten (gehört in Konstante/Config oder Hook).
  - **Zeilen 35–66:** `getStatusIndex(status)` – Status-Mapping-Logik (gehört in Hook oder `lib/`/Utils).
  - **Zeilen 68–74:** `getGreeting()` – reine Hilfsfunktion (kann in Util oder kleinen Hook).
- **Zeilen 76–ca. 120+:** Komponente `StatusTimelineMobile` ist **inline in der Page** definiert statt in z. B. `portal/components/StatusTimelineMobile.tsx`.
- Weitere **große Blöcke JSX** (Dashboard-Karten, Links, Aktionen) stehen direkt in der Page statt in wiederverwendbaren Presentational Components.
- **Ergebnis:** Page ist „dick“, mischt Orchestrierung mit Darstellung und Logik. Sie sollte im Idealfall nur:
  - Hooks aufrufen (z. B. `useProjectData`, `useProject`),
  - wenige geschnittene Components rendern und
  - keine eigenen `statusSteps`/`getStatusIndex`/`getGreeting`/`StatusTimelineMobile` enthalten.

**Konkret fehlt:**

- Auslagerung von `statusSteps` und Status-Mapping in z. B. `portal/constants/statusSteps.ts` oder Hook.
- Auslagerung von `getGreeting` in Util oder Hook.
- Extraktion von `StatusTimelineMobile` (und ggf. weiterer Blöcke) in `portal/components/…`.
- Page auf unter ~300–400 LOC reduzieren durch „nur Komposition + Hooks“.

---

### 1.2 `app/portal/documents/page.tsx` (478 LOC)

**Was falsch/fehlt:**

- **Zeilen 33–41:** `typeConfig` – großes Objekt für Dokumenttypen (Labels/Farben) ist **inline**; gehört in z. B. `portal/constants/documentTypes.ts` oder Shared-Config.
- **Zeilen 43–61:** `formatFileSize`, `formatDate` – reine Formatierer **inline**; gehören in `lib/utils/` oder kleinen Hook.
- **Zeilen 63–66:** `getFileIcon(mimeType)` – **inline**; kann Util oder kleine Komponente sein.
- **Zeilen 68–…:** Komponente `DocumentCard` ist **in der gleichen Datei** definiert statt in z. B. `portal/components/DocumentCard.tsx`.
- Weitere Listen-/Detail-UI liegt direkt in der Page.
- **Ergebnis:** Page enthält Konfig, Utils und Presentational-Komponenten; sie sollte nur Komposition + Hooks sein.

**Konkret fehlt:**

- `typeConfig` in gemeinsame Constants/Config auslagern.
- `formatFileSize`, `formatDate`, `getFileIcon` in Utils oder Hook.
- `DocumentCard` (und ggf. weitere Karten/Listen) als eigene Component-Datei(en).
- Page schlank halten (Ziel ≤ 300–400 LOC).

---

### 1.3 Weitere Portal-Pages (ohne Einzelnachweis)

- **`app/portal/service/[id]/page.tsx`** (570 LOC), **`app/portal/termine/page.tsx`** (476), **`app/portal/zahlungen/page.tsx`** (401), **`app/portal/service/page.tsx`** (434), **`app/portal/appliances/page.tsx`** (359):  
  Alle **deutlich über dem Richtwert** 300–400 LOC. Vermutlich ebenfalls viel Inline-UI und Logik.  
- **Konkret fehlt:** Für jede dieser Pages prüfen: Welche Blöcke sind reine Darstellung → in Components auslagern; welche Logik → in Hooks/Utils; Page am Ende nur noch Komposition + Hooks und unter der LOC-Grenze.

---

## 2. API-Routen: Feste Pipeline

### 2.1 Chat-API: Kein Input-Schema (Zod)

**Datei:** `app/api/chat/request.ts`

**Was falsch/fehlt:**

- **Zeilen 22–44:** `parseChatRequest(body)` prüft **manuell**:
  - ob `body` ein Objekt ist,
  - `message` als String (default `''`),
  - `projects` als Array (ohne Strukturprüfung der Elemente).
- Es gibt **kein Zod-Schema** (oder anderes deklariertes Schema) für den Request-Body.
- **Folgen:**
  - `projects` wird als `CustomerProject[]` gecastet, **ohne** zu prüfen, ob jedes Element die nötigen Felder/Typen hat.
  - Keine zentrale, dokumentierte Form des Inputs; Fehlerbehandlung bei ungültigen Feldern ist implizit.

**Konkret fehlt:**

- Zod-Schema für den Chat-Request, z. B. in `app/api/chat/schema.ts`:
  - `message`: string, max. 10_000 Zeichen.
  - `projects`: Array von Objekten mit definierten Feldern (id, status, … je nach Bedarf).
- In der Route: `ChatRequestSchema.safeParse(body)` (oder nach `request.json()`), bei `!parsed.success` → `apiErrors.validation()` mit optional `parsed.error.flatten()`.
- `request.ts` kann dann das geparste Ergebnis nur noch typisieren/weiterreichen; die Validierung läuft über das Schema.

---

### 2.2 publish-document: Route zu lang (LOC)

**Datei:** `app/api/portal/publish-document/route.ts` (388 LOC, Plan: API-Routen ≤ 220 LOC)

**Was falsch/fehlt:**

- Die **gesamte Logik** liegt in einer Datei:
  - `parsePublishRequest`, `authorizePublish`, `renderDocumentPdf`, `persistDocument`, `mapInvoiceItemsForInvoicePdf`, `mapInvoiceItemsForOrderPdf`, `sanitizeFileName` sowie der `POST`-Handler.
- **Konkret fehlt:** Aufteilung in mehrere Module, z. B.:
  - **Route** (`route.ts`): nur Lesen des Requests, `parsePublishRequest`, `authorizePublish`, Aufruf Use-Case, Error-Mapping (Ziel deutlich unter 220 LOC).
  - **Use-Case** (z. B. `publishDocument.ts` oder `actions/publishDocument.ts`): `renderDocumentPdf` + `persistDocument` (oder je eine Datei).
  - **Mappings/Helpers** (z. B. `mappers.ts` oder `helpers.ts`): `mapInvoiceItemsForInvoicePdf`, `mapInvoiceItemsForOrderPdf`, `sanitizeFileName`.
- So bleibt die **Public API** der Route dünn und die Pipeline (Schema → Auth → Use-Case → Error) klar; LOC-Grenze wird eingehalten.

---

## 3. Webhook: Retry

**Datei:** `app/api/booking/webhook/route.ts` bzw. `workflow.ts`

**Was fehlt:**

- **Plan:** „Retry/idempotency bei externen Webhook-Flows.“
- **Idempotenz:** Vorhanden (`reserveWebhookEvent`, Duplicate-Erkennung, 200 mit `skipped: true`).
- **Retry:** Es gibt **keinen** expliziten Retry bei temporären Fehlern (z. B. DB nicht erreichbar, E-Mail-Provider kurz down). Bei `catch` wird einmal 500 zurückgegeben, der Aufrufer (Cal.com) müsste ggf. selbst erneut senden.

**Konkret fehlt (optional, aber plan-konform):**

- Entweder:
  - **Im Code:** Bei bestimmten Fehlertypen (z. B. Netzwerk, Timeout, 5xx-ähnliche Fehler) begrenztes Retry mit Backoff (z. B. 2–3 Versuche) in `workflow.ts` oder Route, dann erst 500; oder
  - **Dokumentation:** In DEPLOYMENT.md oder API-Doku festhalten, dass Retry ausschließlich durch den Sender (Cal.com) bzw. Infrastruktur erfolgt und der Endpoint idempotent ist.

---

## 4. Übersichtstabelle

| Bereich | Datei / Ort | Was falsch/fehlt |
|--------|-------------|-------------------|
| Portal | `portal/page.tsx` | statusSteps, getStatusIndex, getGreeting, StatusTimelineMobile und weitere UI inline; Page zu dick (518 LOC). Soll: nur Komposition + Hooks, Komponenten/Utils ausgelagert. |
| Portal | `portal/documents/page.tsx` | typeConfig, formatFileSize, formatDate, getFileIcon, DocumentCard inline; Page zu dick (478 LOC). Soll: Constants/Utils/Components auslagern, Page dünn. |
| Portal | Weitere Portal-Pages | Mehrere Pages 359–570 LOC; vermutlich ähnliches Muster. Soll: pro Page prüfen, Komposition + Hooks, LOC ≤ 300–400. |
| API Chat | `api/chat/request.ts` | Kein Zod-Schema; nur manuelle Prüfung von message/projects; projects nicht strukturvalidiert. Soll: Zod-Schema + safeParse in Route, dann apiErrors.validation(). |
| API publish-document | `api/portal/publish-document/route.ts` | 388 LOC (≥ 220); gesamte Logik in einer Datei. Soll: Route dünn, Use-Case + Mappers in eigene Module. |
| API Webhook | `api/booking/webhook/` | Retry bei temporären Fehlern fehlt. Soll: Retry mit Backoff oder klare Doku, dass Retry extern erfolgt. |

---

Wenn du willst, kann als Nächstes für einen der Punkte (z. B. Chat-Schema oder Aufteilung publish-document) ein konkreter Patch-Vorschlag (Dateien + Codeänderungen) formuliert werden.
