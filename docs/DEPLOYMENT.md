# Deployment – kitchen-online / BaLeah CRM

## Vercel

- **Build:** `pnpm build` (Turbo)
- **Output:** Next.js Standalone oder Default
- **Env:** Alle Variablen aus `.env.example` in Vercel Project Settings setzen

## Umgebungsvariablen (Produktion)

| Pflicht | Variable |
|---------|----------|
| ✓ | NEXT_PUBLIC_SUPABASE_URL |
| ✓ | NEXT_PUBLIC_SUPABASE_ANON_KEY |
| ✓ | SUPABASE_SERVICE_ROLE_KEY |

| Optional | Variable |
|----------|----------|
| | NEXT_PUBLIC_APP_URL |
| | GEMINI_API_KEY |
| | RESEND_API_KEY |
| | BOOKING_EMAIL_FROM |
| | CRON_SECRET |
| | CALCOM_WEBHOOK_SECRET |
| | INBOUND_EMAIL_WEBHOOK_SECRET |
| | RESEND_WEBHOOK_SECRET |
| | INBOUND_DEFAULT_USER_ID |

## Cron Jobs

Vercel Cron (vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/cron/appointment-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/inbound-documents",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- Läuft stündlich
- `CRON_SECRET` im Header: `Authorization: Bearer <CRON_SECRET>`
- Route prüft Secret, sonst 401

## Webhooks

- **Cal.com:** `POST /api/booking/webhook` auf Production-URL zeigen
- Cal.com: Settings → Developer → Webhooks → Subscriber URL
- **Resend Inbound:** Webhook auf
  `POST /api/inbound/email/webhook?secret=<INBOUND_EMAIL_WEBHOOK_SECRET>` setzen
  (alternativ Header `x-inbound-email-secret`).

## Supabase

- Migrationen: `supabase db push` oder via Dashboard
- Backups: Pro-Plan empfohlen (PITR)
- RLS-Policies prüfen nach Migrationen

### Voice (Siri/Handy-Diktat)

Damit Firmenstammdaten mit Voice-Option und Token-Erstellung funktionieren, muss die Voice-Migration ausgeführt sein:

- **Datei:** `packages/db/supabase/migrations/20260213130000_voice_capture_tasks.sql`
- Enthält: Spalten `voice_capture_enabled`, `voice_auto_execute_enabled` in `company_settings`, Tabellen `voice_api_tokens`, `voice_inbox_entries`, `tasks` (falls noch nicht vorhanden).
- Ohne diese Migration: Speichern der Firmendaten und Erstellen von Voice-Tokens schlagen mit Hinweis auf fehlende Datenbank-Aktualisierung fehl.
