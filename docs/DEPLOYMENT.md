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

## Cron Jobs

Vercel Cron (vercel.json):

```json
{
  "crons": [{
    "path": "/api/cron/appointment-reminders",
    "schedule": "0 * * * *"
  }]
}
```

- Läuft stündlich
- `CRON_SECRET` im Header: `Authorization: Bearer <CRON_SECRET>`
- Route prüft Secret, sonst 401

## Webhooks

- **Cal.com:** `POST /api/booking/webhook` auf Production-URL zeigen
- Cal.com: Settings → Developer → Webhooks → Subscriber URL

## Supabase

- Migrationen: `supabase db push` oder via Dashboard
- Backups: Pro-Plan empfohlen (PITR)
- RLS-Policies prüfen nach Migrationen
