# Onboarding – neue Entwickler

## Checkliste

1. **Repo klonen**
   ```bash
   git clone <repo>
   cd kitchen-online
   pnpm install
   ```

2. **Env anlegen**
   - `.env.example` aus Root nach `apps/crm/.env.local` kopieren
   - Supabase-URL und Keys eintragen (Supabase Dashboard → Settings → API)

3. **Datenbank**
   - Migrationen: `pnpm --filter @kitchen/db migrate` oder `supabase db push`
   - Ggf. lokales Supabase-Projekt oder Shared Dev-DB

4. **App starten**
   ```bash
   pnpm dev
   ```
   - CRM: http://localhost:3000
   - Login: Mitarbeiter-Account mit company_members-Zuordnung

5. **Dokumentation lesen**
   - [docs/README.md](../../../docs/README.md) – Hauptindex
   - [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) – Architektur
   - [docs/CODE_CONVENTIONS.md](../../../docs/CODE_CONVENTIONS.md) – Konventionen

## Häufige Stolpersteine

- **NO_COMPANY:** User muss in company_members sein (siehe TROUBLESHOOTING.md)
- **SERVICE_ROLE im Browser:** Nur ANON_KEY im Client
- **Migrationen:** Immer in packages/db/supabase/migrations, nie manuell im Dashboard (außer einmalig)
