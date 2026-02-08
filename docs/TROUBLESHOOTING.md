# Troubleshooting – kitchen-online / BaLeah CRM

## Typische Fehler

### NO_COMPANY / 403 bei Tickets

**Symptom:** Kundenanfragen-Seite zeigt 403, Console: `Error: NO_COMPANY`.

**Ursache:** User hat keine Zuordnung in `company_members` oder `company_settings`.

**Prüfung (Supabase SQL):**
```sql
SELECT * FROM company_members WHERE user_id = 'USER_UUID' AND is_active = true;
SELECT * FROM company_settings WHERE user_id = 'USER_UUID';
```

**Fix:** User in `company_members` eintragen (company_id, role, is_active=true) oder Firma in `company_settings` anlegen.

### permission denied for table company_members

**Symptom:** Client kann `company_members` nicht lesen.

**Ursache:** RLS-Policy oder fehlende EXECUTE-Rechte auf `get_current_company_id`.

**Fix:** Supabase: `GRANT EXECUTE ON FUNCTION get_current_company_id() TO authenticated;` (falls RPC vom Client genutzt wird). Oder: API-Route nutzt Service-Client und liefert company_id – dann Client nicht direkt DB lesen lassen.

### Du bist nicht berechtigt (403)

**Mögliche Ursachen:**
- Kein gültiger Login (Session abgelaufen)
- `role === 'customer'` auf CRM-Route
- Fehlende Permission (z.B. `delete_projects`)
- Keine company_id

**Prüfung:** Auth-Check in API-Route, `has_permission` RPC, company_members.

### Build fehlgeschlagen (Vercel)

- `pnpm build` lokal ausführen, Fehler prüfen
- TypeScript-Fehler, fehlende Env-Variablen
- Node-Version: >= 20

### Cron läuft nicht

- Vercel: CRON_SECRET gesetzt?
- Route prüft `Authorization: Bearer <CRON_SECRET>`
- Vercel Cron nur auf Pro-Plan

## Checkliste bei neuem Setup

1. [ ] `.env.local` aus `.env.example` erstellt
2. [ ] Supabase-Migrationen ausgeführt
3. [ ] User in company_members oder company_settings
4. [ ] RLS-Policies aktiv
5. [ ] Cal.com Webhook-URL auf Production zeigen (falls genutzt)
