# @kitchen/customer-app

React Native (Expo) App für Kunden.

## Features

- Login mit Projektcode
- Dashboard mit Projektstatus
- Dokumente ansehen
- Tickets erstellen und verfolgen
- Termine einsehen

## Setup

```bash
# Dependencies installieren
pnpm install

# iOS Simulator starten
pnpm ios

# Android Emulator starten
pnpm android

# Web (für Entwicklung)
pnpm web
```

## Struktur

```
customer-app/
├── app/              # Expo Router (file-based routing)
│   ├── (auth)/       # Auth screens (login)
│   ├── (tabs)/       # Main tab navigation
│   │   ├── index.tsx # Dashboard
│   │   ├── documents.tsx
│   │   ├── tickets.tsx
│   │   └── appointments.tsx
│   └── _layout.tsx
├── components/       # Shared components
├── hooks/            # Custom hooks
└── lib/              # Utilities
```

## Tech Stack

- Expo SDK 52
- Expo Router (file-based routing)
- Supabase (Auth + Database)
- @kitchen/shared-types (Zod schemas)
- @kitchen/auth (Session management)
