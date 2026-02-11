# Architektur – kitchen-online / BaLeah CRM

## Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 16 App (apps/crm)                                        │
│  ├── App Router (app/)                                            │
│  ├── Components (components/)                                    │
│  └── Hooks (hooks/)                                               │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                   │
             │ createClient()                    │ createServiceClient()
             │ (ANON_KEY, Cookies)               │ (SERVICE_ROLE)
             ▼                                   ▼
┌────────────────────────────┐    ┌────────────────────────────────┐
│  Supabase Auth              │    │  Supabase DB (RLS)             │
│  - Mitarbeiter: JWT         │    │  - company_id, user_id         │
│  - Kunde: JWT + customer_id │    │  - company_members              │
└────────────────────────────┘    └────────────────────────────────┘
```

## Multi-Tenant

- **Firma:** `company_id` auf allen relevanten Tabellen
- **Zuordnung:** `company_members` (user_id → company_id) oder `company_settings` (user_id → id)
- **Server:** `getCompanyIdForUser(userId, serviceClient)` für API-Routes
- **Client:** `getCurrentCompanyId()` nutzt Browser-Client (ANON_KEY) + RLS

## Datenfluss

| Kontext | Supabase-Client | Nutzung |
|---------|-----------------|---------|
| Browser (React) | `client.ts` | ANON_KEY, Session via Cookies |
| Server (API, SSR) | `server.ts` → `createClient()` | ANON_KEY, Cookies für Auth |
| Server (API, DB-Admin) | `server.ts` → `createServiceClient()` | SERVICE_ROLE, bypass RLS |

## Wichtige Ordner

| Pfad | Inhalt |
|------|--------|
| `lib/supabase/` | Client, Server, Services (company, projects, invoices, …) |
| `lib/auth/` | requireUser, requirePermission |
| `lib/utils/` | errorHandling, formatters, priceCalculations, logger |
| `lib/middleware/` | rateLimit, validateRequest |
| `app/api/` | API-Routen (CRM, Customer, Webhooks, Cron) |
| `app/orders/` | Bestell-Workflow (Queue-Ansicht, modulare Dialoge für Editor, AB, Lieferschein, Wareneingang) |

## Abhängigkeiten

- **packages/db** – Migrationen, Schema
- **packages/auth** – requireCustomerSession (Kunden-Portal)
- **packages/shared-types** – Zod-Schemas

## Externe Dienste

- **Supabase** – Auth, PostgreSQL, Storage
- **Resend** – E-Mail
- **Google Gemini** – AI (Chat, Lieferschein-Analyse, etc.)
- **Cal.com** – Buchungs-Webhook (optional)
