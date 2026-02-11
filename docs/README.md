# Dokumentation – kitchen-online / BaLeah CRM

**Hauptindex** aller technischen Dokumentation. Bei Code-Änderungen entsprechend aktualisieren.

---

## Quick Links

| Dokument | Inhalt |
|----------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System-Architektur, Multi-Tenant, Datenfluss |
| [API_REFERENCE.md](./API_REFERENCE.md) | API-Routen, Auth, Fehlercodes |
| [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md) | Code-Stil, Patterns, Supabase-Nutzung |
| [SECURITY.md](./SECURITY.md) | Auth-Flows, RLS, Env-Sicherheit |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, CRON, Webhooks, Env |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Typische Fehler, Checklisten |

---

## Projekt-Setup

| Dokument | Inhalt |
|----------|--------|
| [../README.md](../README.md) | Root: Monorepo, Quick Start |
| [../apps/crm/README.md](../apps/crm/README.md) | CRM-App: Tech-Stack, Setup, API-Übersicht |
| [../apps/crm/docs/ONBOARDING.md](../apps/crm/docs/ONBOARDING.md) | Checkliste für neue Entwickler |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Code-Style, PR-Prozess |

---

## Feature-spezifisch

| Dokument | Inhalt |
|----------|--------|
| [../apps/crm/docs/BOOKING_WEBHOOK_SETUP.md](../apps/crm/docs/BOOKING_WEBHOOK_SETUP.md) | Cal.com Webhook: Setup, Troubleshooting |
| [ORDERS_REFACTOR_AND_FIX_PLAN.md](./ORDERS_REFACTOR_AND_FIX_PLAN.md) | Bestellungen: Fehlerbehebung & Refactoring (Phasen 1–4) |
| [ORDERS_UI_WORKFLOW_REPORT.md](./ORDERS_UI_WORKFLOW_REPORT.md) | Bestellungen: Flow-Check & UI-/Workflow-/Optik-Bewertung (nur Bericht) |
| [ORDERS_REFACTOR_IMPLEMENTATION_REPORT.md](./ORDERS_REFACTOR_IMPLEMENTATION_REPORT.md) | Bestellungen: Umsetzungsbericht zum Refactor-Plan |

---

## Umgebungsvariablen

Vorlage: [../.env.example](../.env.example) – Kopieren nach `apps/crm/.env.local`.

---

## Doc-Update-Regel

Bei Änderungen an **API-Routen, Auth, Env, Services, Architektur** prüfen:

- [ ] `docs/API_REFERENCE.md` – neue/geänderte Endpunkte?
- [ ] `docs/ARCHITECTURE.md` – neue Abhängigkeiten?
- [ ] `docs/SECURITY.md` – Auth-Flow-Änderungen?
- [ ] `.env.example` – neue Env-Variablen?
- [ ] `apps/crm/README.md` – neue Features/Seiten?
