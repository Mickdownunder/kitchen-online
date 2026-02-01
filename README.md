# kitchen-online

Monorepo für **KüchenOnline**: CRM (Mitarbeiter-UI) und Kundenportal für Küchenfachbetriebe (KMU).

---

## Struktur

| Bereich | Beschreibung |
|--------|--------------|
| **apps/crm** | Haupt-App: CRM + Kundenportal (Next.js 16, Supabase). [→ README](apps/crm/README.md) |
| **apps/customer-app** | (Scaffold) Geplante Kunden-App (Expo). [→ README](apps/customer-app/README.md) |
| **packages/auth** | Session-Helfer für Kunden (Access-Code-Login, requireCustomerSession) |
| **packages/db** | Supabase-Migrationen + Baseline-Schema. [→ README](packages/db/README.md) |
| **packages/shared-types** | Gemeinsame Zod-Schemas (Auth, Document, Project, Ticket) |

---

## Voraussetzungen

- **Node.js** >= 20
- **pnpm** 9.x (`packageManager` im Root)

---

## Quick Start

```bash
# Abhängigkeiten installieren
pnpm install

# Entwicklung starten (CRM-App auf http://localhost:3000)
pnpm dev
```

Nur CRM-App starten:

```bash
pnpm --filter @kitchen/crm dev
```

---

## Skripte (Root)

| Befehl | Beschreibung |
|--------|--------------|
| `pnpm dev` | Turbo: alle Apps mit `dev` starten (persistent) |
| `pnpm build` | Turbo: Build aller Apps/Packages |
| `pnpm lint` | Turbo: Lint aller Workspaces |
| `pnpm test` | Turbo: Tests aller Workspaces |

---

## Env & Datenbank

- **CRM-App:** Env-Datei `apps/crm/.env.local` anlegen. Benötigte Variablen siehe [apps/crm/README.md#umgebungsvariablen](apps/crm/README.md#umgebungsvariablen).
- **Datenbank:** Migrationen liegen in `packages/db/supabase/migrations/`. Anwenden z. B. mit Supabase CLI (`supabase db push`) oder Dashboard. Details: [packages/db/README.md](packages/db/README.md).

---

## Weitere Infos

- **CRM + Portal (Setup, API, Tests, Deployment):** [apps/crm/README.md](apps/crm/README.md)
- **Datenbank (Migrationen, Befehle):** [packages/db/README.md](packages/db/README.md)
- **Cal.com-Buchungs-Webhook:** [apps/crm/docs/BOOKING_WEBHOOK_SETUP.md](apps/crm/docs/BOOKING_WEBHOOK_SETUP.md)
