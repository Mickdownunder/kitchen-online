# @kitchen/crm

Das CRM (Employee‑UI) und das Customer Portal (Web) für KüchenOnline.

## Setup

1. `pnpm install` im Root
2. `apps/crm/.env.local` anlegen
3. `pnpm dev` starten

### Benötigte Env Vars

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=... # optional (AI features)
```

## Struktur

```
crm/
├── app/              # Next.js App Router (CRM + Portal)
│   ├── api/          # Server routes
│   ├── portal/       # Customer portal pages
│   └── tickets/      # CRM tickets UI
├── components/       # React Components
├── hooks/            # Custom Hooks
├── lib/              # Utilities, Services
├── public/           # Static Assets
└── types.ts          # Type Definitions
```

## Customer API Routes

Die Customer API Routes liegen unter:
```
app/api/customer/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── set-password/route.ts
├── documents/route.ts
├── documents/[id]/route.ts
├── documents/[id]/download/route.ts
├── tickets/route.ts
├── tickets/[id]/messages/route.ts
├── tickets/[id]/messages/[messageId]/download/route.ts
├── appliances/route.ts
└── project/route.ts
```

Hinweis:
- Downloads laufen über Signed URLs (private Storage).
- Customer‑Sessions sind customer_id‑basiert (multi‑project ready).

## Smoke Tests (Playwright)

Playwright ist für kurze Smoke‑Tests eingerichtet.

Voraussetzung: App läuft lokal (Standard `http://localhost:3000`).

```bash
pnpm --filter @kitchen/crm test:e2e
```

Optional (UI‑Runner):
```bash
pnpm --filter @kitchen/crm test:e2e:ui
```

Benötigte Env‑Vars für Login‑Tests:
```bash
PW_BASE_URL=http://localhost:3000
PW_CRM_EMAIL=...
PW_CRM_PASSWORD=...

# Portal: entweder Projektcode oder E‑Mail Login
PW_PORTAL_ACCESS_CODE=...
# oder
PW_PORTAL_EMAIL=...
PW_PORTAL_PASSWORD=...
```
