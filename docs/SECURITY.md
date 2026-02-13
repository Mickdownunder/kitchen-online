# Sicherheit – kitchen-online / BaLeah CRM

## Auth-Flows

### Mitarbeiter (CRM)

1. Login über Supabase Auth (E-Mail/Passwort)
2. Session in Cookies, JWT mit `user.id`, `app_metadata.role`
3. API-Routen: `createClient()` → `supabase.auth.getUser()`
4. Company: `getCompanyIdForUser(user.id, serviceClient)` oder RPC `get_current_company_id`
5. Permissions: RPC `has_permission(p_permission_code)`

### Kunde (Portal)

1. Login per Projektcode oder E-Mail/Passwort
2. JWT mit `app_metadata.role = 'customer'`, `app_metadata.customer_id`
3. API-Routen: `requireCustomerSession()` prüft Bearer Token
4. Alle Abfragen gefiltert nach `customer_id`

## Supabase Keys

| Key | Wo | Nutzung |
|-----|-----|---------|
| ANON_KEY | Browser, Server (createClient) | RLS gilt, Auth via Session |
| SERVICE_ROLE | Nur Server (createServiceClient) | RLS bypass, Admin-Operationen |

**Wichtig:** SERVICE_ROLE niemals im Browser oder in Client-Code.

## RLS (Row Level Security)

- Tabellen mit `company_id`: Zugriff nur für Firmenmitglieder
- `company_members` / `company_settings`: Zuordnung user → company
- Customer-Tabellen: `customer_id` Filter
- `get_current_company_id` RPC: EXECUTE für authenticated (falls Client liest)

## Voice-Token (Siri / Shortcuts)

- **Auth:** Dedizierter persönlicher Token pro User, kein Cookie, kein Service-Role-Key im Shortcut.
- **Speicherung:** Nur Hash (z. B. SHA-256 + optionaler Pepper aus `VOICE_TOKEN_PEPPER`) in `voice_api_tokens`; das Token-Secret wird nur einmal bei Erstellung angezeigt.
- **Company-Auflösung:** `getCompanyIdForUser(userId, serviceClient)` nach Token-Lookup, nicht `get_current_company_id()` (Session).
- **Rate-Limit:** Pro Token/User; Burst-Schutz für `/api/voice/capture`.
- **Widerruf:** Token in Einstellungen widerrufbar; Ablaufdatum pro Token.

## Env-Variablen

- Keine Secrets in Code oder Repo
- `CRON_SECRET` für Cron-Endpunkte (Vercel setzt automatisch)
- `CALCOM_WEBHOOK_SECRET` optional für Webhook-Signatur
- `VOICE_TOKEN_PEPPER` optional für stärkeres Hashing der Voice-Tokens (empfohlen in Produktion)
