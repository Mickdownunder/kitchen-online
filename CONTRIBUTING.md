# Contributing – kitchen-online / BaLeah CRM

## Code-Style

- **Prettier:** `pnpm format` vor Commit
- **ESLint:** `pnpm lint` – keine Fehler
- **TypeScript:** Strikt, keine `any` ohne Begründung

## PR-Prozess

1. Branch erstellen (z.B. `feature/xyz`, `fix/abc`)
2. Änderungen entwickeln
3. Tests: `pnpm --filter @kitchen/crm test`
4. Lint: `pnpm lint`
5. PR öffnen, Beschreibung + Kontext
6. Bei API/Architektur-Änderungen: Docs prüfen (siehe docs/README.md)

## Tests

- Neue Utils/Services: Unit-Tests in `__tests__/`
- API-Routen: Guards und Validierung testen
- `jest.config.mjs` – Coverage-Thresholds einhalten

## Docs aktualisieren

Bei Änderungen an:

- API-Routen → `docs/API_REFERENCE.md`
- Auth/Security → `docs/SECURITY.md`
- Env-Variablen → `.env.example`
- Architektur → `docs/ARCHITECTURE.md`
