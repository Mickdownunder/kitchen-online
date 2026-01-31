# @kitchen/customer-app

Customer Mobile App (Expo).  
Status: **Scaffold only** — source code not yet migrated into this repo.

Aktueller Kunden‑UI‑Pfad: `apps/crm/app/portal` (Web‑Portal).

## Setup

```bash
# Dependencies installieren (im Repo-Root)
pnpm install

# App starten
pnpm --filter @kitchen/customer-app start

# iOS Simulator
pnpm --filter @kitchen/customer-app ios

# Android Emulator
pnpm --filter @kitchen/customer-app android

# Web (Entwicklung)
pnpm --filter @kitchen/customer-app web
```

## Struktur (aktuell)

```
customer-app/
├── package.json
└── README.md
```

## Tech Stack (geplant)

- Expo SDK 52
- Expo Router
- Supabase (Auth + Database)
- @kitchen/shared-types (Zod)
- @kitchen/auth (Session)
