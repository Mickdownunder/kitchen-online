# @kitchen/crm

CRM (Mitarbeiter-UI) und Kundenportal (Web) für KüchenOnline – eine All-in-One-Anwendung für Küchenfachbetriebe (KMU).

---

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Tech-Stack](#tech-stack)
- [Monorepo-Struktur](#monorepo-struktur)
- [Setup](#setup)
- [Umgebungsvariablen](#umgebungsvariablen)
- [CRM-Funktionen](#crm-funktionen)
- [Kundenportal](#kundenportal)
- [API-Routen](#api-routen)
- [Datenbank & Migrationen](#datenbank--migrationen)
- [Tests](#tests)
- [Dokumentation](#dokumentation)
- [Deployment](#deployment)

---

## Überblick

Die App besteht aus **zwei Nutzerwelten** in einer Next.js-Anwendung:

| Bereich | Zielgruppe | Pfad | Beschreibung |
|--------|------------|------|--------------|
| **CRM** | Mitarbeiter (Verkauf, Buchhaltung, Montage, …) | `/`, `/projects`, `/invoices`, … | Interne Oberfläche: Projekte, Kunden, Rechnungen, Termine, Tickets, Statistiken, Einstellungen |
| **Portal** | Endkunden (Küchenkäufer) | `/portal` | Kundenportal: Login per Projektcode oder E-Mail/Passwort, Projekte, Dokumente, Tickets, Termine, Geräte, Zahlungen |

- **Multi-Tenant:** Pro Firma (Company) eigene Daten; Rollen (Geschäftsführer, Administration, Buchhaltung, Verkäufer, Monteur) mit Berechtigungen.
- **Customer-Sessions:** Kunden sind `customer_id`-basiert und können mehrere Projekte haben (multi-project ready).
- **Cal.com-Integration:** Buchungen erzeugen automatisch Lead, Kunde, Projekt und Termin; E-Mail mit Portal-Zugang und Meeting-Link.

---

## Tech-Stack

| Kategorie | Technologie |
|-----------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS, Headless UI, Lucide Icons |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Storage, RLS) |
| **PDF** | @react-pdf/renderer (Rechnungen, Lieferscheine, Aufträge, Mahnungen) |
| **AI** | Google Gemini (optional: Chat, Projekt-Zusammenfassungen, Workflows) |
| **E-Mail** | Resend (optional, z. B. Buchungsbestätigung) |
| **Validierung** | Zod (@kitchen/shared-types) |
| **Charts** | Recharts (Statistiken) |
| **E2E-Tests** | Playwright |
| **Monorepo** | pnpm Workspaces, Turbo |

---

## Monorepo-Struktur

```
kitchen-online/
├── apps/
│   ├── crm/                    # Diese App (CRM + Portal)
│   └── customer-app/            # (Scaffold) Geplante Expo Mobile App
├── packages/
│   ├── auth/                    # Session-Helfer (Access-Code-Login, requireCustomerSession)
│   ├── db/                      # Supabase-Migrationen + Baseline-Schema
│   └── shared-types/            # Zod-Schemas (Auth, Document, Project, Ticket)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Wichtige Abhängigkeiten dieser App:**

- `@kitchen/auth` – Kunden-Session (Access-Code, requireCustomerSession)
- `@kitchen/shared-types` – gemeinsame Typen/Schemas
- Datenbank-Schema und Migrationen liegen in `packages/db`

---

## Setup

### Voraussetzungen

- **Node.js** >= 20
- **pnpm** 9.x (laut `packageManager` im Root)

### Schritte

1. **Im Repo-Root:**

   ```bash
   pnpm install
   ```

2. **Env-Datei anlegen:**

   Erstelle `apps/crm/.env.local` mit den [Umgebungsvariablen](#umgebungsvariablen).

3. **Entwicklungsserver starten:**

   ```bash
   pnpm dev
   ```

   Oder nur diese App:

   ```bash
   pnpm --filter @kitchen/crm dev
   ```

   App erreichbar unter **http://localhost:3000**.

4. **Datenbank:** Migrationen mit Supabase CLI oder Dashboard ausführen (siehe [Datenbank & Migrationen](#datenbank--migrationen)).

---

## Umgebungsvariablen

### Pflicht (Supabase)

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon/Public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (nur server-seitig, z. B. Customer-API, Webhooks) |

### Optional

| Variable | Beschreibung |
|----------|--------------|
| `GEMINI_API_KEY` | Google Gemini für AI-Features (Chat, Projekt-Zusammenfassung) |
| `RESEND_API_KEY` | Resend für E-Mail-Versand (z. B. Buchungsbestätigung) |
| `NEXT_PUBLIC_APP_URL` | Basis-URL der App (z. B. Einladungs-Links, Portal-Links) |
| `BOOKING_EMAIL_FROM` | Absender für Buchungs-E-Mails (Fallback: office@kuechenonline.com) |

### E2E-Tests (Playwright)

| Variable | Beschreibung |
|----------|--------------|
| `PW_BASE_URL` | Basis-URL (Default: http://localhost:3000) |
| `PW_CRM_EMAIL` / `PW_CRM_PASSWORD` | CRM-Login (Mitarbeiter) |
| `PW_PORTAL_ACCESS_CODE` | Oder `PW_PORTAL_EMAIL` / `PW_PORTAL_PASSWORD` für Portal-Login |

---

## CRM-Funktionen

### Seiten & Module

| Pfad | Modul | Kurzbeschreibung |
|------|--------|------------------|
| `/` | Dashboard | Übersicht, KPIs |
| `/login` | Login | Mitarbeiter-Login (E-Mail/Passwort) |
| `/projects` | Projekte | Projektliste, Filter, Lead/Planung/… |
| `/customers` | Kunden | Kundendatenbank |
| `/invoices` | Rechnungen | Rechnungsliste, Filter, PDF |
| `/deliveries` | Lieferungen | Lieferscheine, Upload, Analyse |
| `/calendar` | Kalender | Termine (Planung, Aufmaß, Lieferung, Montage), Drag & Drop |
| `/tickets` | Tickets | Support-Tickets, Nachrichten |
| `/complaints` | Reklamationen | Kanban, Status-Workflow |
| `/articles` | Artikel | Artikelkatalog |
| `/accounting` | Buchhaltung | Lieferantenrechnungen, Exporte |
| `/payments` | Zahlungen | Zahlungsübersicht, Raten |
| `/statistics` | Statistiken | Umsatz, Projekte, Kunden, Lieferungen; PDF/Excel-Export |
| `/settings` | Einstellungen | Firma, Bank, Lieferanten, Mitarbeiter, Benutzer, Rechte, Audit-Log, AGB, Auftrag/Rechnung |

### Zusatzfeatures

- **AI-Assistent:** Chat mit Projekt-Kontext, Aktionen (E-Mail, Dokumente, Status, …)
- **PDF-Generierung:** Rechnung, Lieferschein, Auftrag, Mahnung
- **Adress-Autocomplete:** Geocoding-API (optional)
- **Offline-Indikator:** Hinweis bei fehlender Netzverbindung

---

## Kundenportal

### Pfad: `/portal`

| Seite | Beschreibung |
|-------|--------------|
| `/portal/login` | Login mit **Projektcode** (Erstzugang) oder **E-Mail + Passwort** |
| `/portal` | Dashboard: Projektauswahl, nächster Termin, Dokumente/Tickets-Zähler |
| `/portal/documents` | Dokumente einsehen und herunterladen; Upload (KUNDEN_DOKUMENT) |
| `/portal/termine` | Termine (Aufmaß, Lieferung, Montage) |
| `/portal/service` | Tickets: Liste und Detail; Nachrichten, Anhänge |
| `/portal/appliances` | Geräte (Projekt-Appliances) |
| `/portal/zahlungen` | Zahlungsübersicht |
| `/portal/setup-password` | Passwort setzen (nach Erstlogin mit Code) |
| `/portal/forgot-password` | Passwort vergessen |
| `/portal/reset-password` | Reset mit Token |

### Sicherheit

- Kunden-Session: JWT mit `app_metadata.role = 'customer'` und `app_metadata.customer_id`.
- Customer-API-Routen prüfen Token und `customer_id`; Abfragen sind auf die Daten des Kunden beschränkt (inkl. RLS-Policies in der DB).
- Kein Zugriff auf CRM-Daten oder andere Kunden.

---

## API-Routen

### CRM (authentifizierte Mitarbeiter)

| Bereich | Beispiele |
|---------|-----------|
| **Projekte** | `DELETE /api/projects/delete` |
| **Tickets** | `GET/POST /api/tickets`, `GET/PATCH /api/tickets/[id]` |
| **Appliances** | `GET/POST /api/appliances`, `GET/PATCH/DELETE /api/appliances/[id]` |
| **Nutzer** | `POST /api/users/invite`, `GET /api/users/members`, `POST /api/users/process-invite`, Permissions |
| **PDF** | `/api/invoice/pdf`, `/api/delivery-note/pdf` |
| **E-Mail** | `/api/email/send`, `/api/email/send-with-pdf` |
| **Delivery Notes** | Upload, Analyze, Delete |
| **Sonstiges** | Geocode, Audit-Logs, Chat/Stream (AI), Reminders, Portal Publish-Document |

### Kundenportal (Customer-API)

Alle unter `app/api/customer/`; Zugriff nur mit gültigem Customer-JWT (Bearer Token).

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/customer/auth/login` | POST | Login (Projektcode oder E-Mail/Passwort) |
| `/api/customer/auth/logout` | POST | Logout |
| `/api/customer/auth/set-password` | POST | Passwort setzen |
| `/api/customer/auth/reset-password` | POST | Passwort-Reset anfordern |
| `/api/customer/auth/confirm-reset` | POST | Reset mit Token bestätigen |
| `/api/customer/project` | GET | Dashboard-Daten (Projekte, Termine, Stats) |
| `/api/customer/documents` | GET, POST | Liste, Upload (KUNDEN_DOKUMENT) |
| `/api/customer/documents/[id]` | GET, DELETE | Metadaten, Löschen |
| `/api/customer/documents/[id]/download` | GET | Signed URL für Download |
| `/api/customer/tickets` | GET, POST | Liste, neues Ticket |
| `/api/customer/tickets/[id]/messages` | GET, POST | Nachrichten, ggf. Anhang-Download |
| `/api/customer/tickets/[id]/messages/[messageId]/download` | GET | Anhang-Download |
| `/api/customer/appliances` | GET | Geräte des Kunden (pro Projekt) |

- Downloads laufen über Signed URLs (privater Storage).
- Customer-Sessions sind `customer_id`-basiert und multi-project-fähig.

### Webhooks

| Route | Beschreibung |
|-------|--------------|
| `POST /api/booking/webhook` | Cal.com BOOKING_CREATED: Lead/Kunde/Projekt/Termin anlegen, E-Mail senden. Siehe `docs/BOOKING_WEBHOOK_SETUP.md`. |

---

## Datenbank & Migrationen

- **Autoritativ:** `packages/db/supabase/migrations/` (Supabase CLI, `supabase db push`).
- **Referenz:** `packages/db/migrations/001_initial_schema.sql` (Baseline-Schema, Dokumentation/Rebuilds).

### Befehle (im Paket `@kitchen/db`)

```bash
# Migrationen an die verbundene DB anwenden
pnpm --filter @kitchen/db migrate
# bzw. supabase db push (wenn CLI auf das Projekt zeigt)

# TypeScript-Typen aus der DB erzeugen
pnpm --filter @kitchen/db generate-types

# DB zurücksetzen (Gefahr!)
pnpm --filter @kitchen/db reset
```

### Wichtige Migrationen (Auswahl)

- `20260131115859_customer_appliances_policy.sql` – RLS-Policy für Kunden-Geräte (customer_id-basiert).
- `20260131160000_processed_webhooks.sql` – Tabelle für Cal.com-Webhook-Deduplizierung.
- `20260131170000_add_lead_status.sql` – Projekt-Status „Lead“.
- `20260201120000_revoke_anon_privileges.sql` – Entfernt überflüssige anon-Rechte im public-Schema.
- `20260201130000_invoices_stats_index.sql` – Index für Rechnungs-Statistiken.

Details und Sicherheitshinweise siehe Audit/Dokumentation im Repo.

---

## Tests

### E2E (Playwright)

Smoke-Tests für CRM und Portal. App muss laufen (z. B. `http://localhost:3000`).

```bash
pnpm --filter @kitchen/crm test:e2e
```

Mit UI:

```bash
pnpm --filter @kitchen/crm test:e2e:ui
```

Env für Login-Tests: `PW_BASE_URL`, `PW_CRM_EMAIL`, `PW_CRM_PASSWORD`; für Portal `PW_PORTAL_ACCESS_CODE` oder `PW_PORTAL_EMAIL`/`PW_PORTAL_PASSWORD`.

### Unit (Jest)

```bash
pnpm --filter @kitchen/crm test
```

---

## Dokumentation

| Dokument | Inhalt |
|----------|--------|
| `docs/README.md` | Hauptindex aller Dokumentation |
| `docs/API_REFERENCE.md` | API-Routen, Auth, Fehlercodes |
| `docs/ARCHITECTURE.md` | System-Architektur, Multi-Tenant |
| `docs/CODE_CONVENTIONS.md` | Code-Stil, Patterns |
| `docs/SECURITY.md` | Auth-Flows, RLS |
| `docs/DEPLOYMENT.md` | Vercel, CRON, Env |
| `docs/TROUBLESHOOTING.md` | Typische Fehler |
| `apps/crm/docs/BOOKING_WEBHOOK_SETUP.md` | Cal.com-Webhook: Setup, Test |
| `apps/crm/docs/ONBOARDING.md` | Checkliste für neue Entwickler |

---

## Deployment

- **Build:** `pnpm build` (Turbo baut abhängige Packages und die App).
- **Start:** `pnpm start` (oder `next start` im App-Verzeichnis).
- **Env:** Alle `NEXT_PUBLIC_*` und Server-Variablen (Supabase, optional Gemini, Resend, App-URL) in der Hosting-Umgebung setzen.
- **Supabase:** Projekt mit passender URL/Keys; Migrationen ausgeführt; Backups/PITR je nach Plan (Pro empfohlen).
- **Cal.com:** Webhook-URL auf die productive Domain zeigen (z. B. `https://<domain>/api/booking/webhook`).

---

## Kurzreferenz: Ordnerstruktur (CRM-App)

```
apps/crm/
├── app/                    # Next.js App Router
│   ├── api/                # API-Routen (CRM + Customer + Webhooks)
│   ├── portal/             # Portal-Seiten + Layout
│   ├── accounting/         # Buchhaltung
│   ├── articles/           # Artikel
│   ├── calendar/            # Kalender
│   ├── complaints/         # Reklamationen
│   ├── customers/          # Kunden
│   ├── dashboard/          # Dashboard
│   ├── deliveries/         # Lieferungen
│   ├── invoices/           # Rechnungen
│   ├── payments/            # Zahlungen
│   ├── projects/           # Projekte
│   ├── settings/           # Einstellungen
│   ├── statistics/         # Statistiken
│   ├── tickets/            # Tickets (CRM)
│   ├── login/, logout/, reset-password/, ...
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React-Komponenten (UI, Modals, Listen, …)
├── hooks/                  # Custom Hooks (Auth, Kalender, Projekte, …)
├── lib/                    # Supabase-Clients, Services, PDF, AI, Validierung, Utils
├── providers/              # React Context, AI-Handler, Caches
├── types/                  # Typdefinitionen
├── tests/                  # E2E-Tests (Playwright)
├── docs/                   # Anleitungen (z. B. Booking-Webhook)
├── playwright.config.ts
├── package.json
└── README.md               # Diese Datei
```
