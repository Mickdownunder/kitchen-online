# API-Referenz – kitchen-online / BaLeah CRM

## Auth

| Typ | Methode | Beschreibung |
|-----|---------|--------------|
| Mitarbeiter | Cookie (Supabase Session) | Alle CRM-Routen unter `/api/*` (außer customer, booking, cron) |
| Kunde | Bearer Token (JWT) | `Authorization: Bearer <token>` für `/api/customer/*` |
| Cron | Header | `Authorization: Bearer <CRON_SECRET>` für `/api/cron/*` |
| Webhook | Optional | `CALCOM_WEBHOOK_SECRET` für Signatur |

## Fehlercodes

| Code | HTTP | Bedeutung |
|------|------|-----------|
| UNAUTHORIZED | 401 | Nicht eingeloggt |
| FORBIDDEN | 403 | Keine Berechtigung |
| NO_COMPANY | 403 | Keine Firma zugeordnet |
| NOT_FOUND | 404 | Ressource nicht gefunden |
| VALIDATION_ERROR | 400 | Ungültige Eingabe |
| RATE_LIMITED | 429 | Zu viele Anfragen |
| INTERNAL_ERROR | 500 | Serverfehler |

## CRM-API (Mitarbeiter)

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/tickets` | GET | Ticket-Liste |
| `/api/tickets/[id]` | GET, PATCH | Ticket-Detail |
| `/api/projects/delete` | DELETE | Projekt löschen (Query: id) |
| `/api/appliances` | GET, POST | Geräte |
| `/api/appliances/[id]` | GET, PATCH, DELETE | Gerät-Detail |
| `/api/users/members` | GET, POST, PATCH, DELETE | Team-Mitglieder |
| `/api/users/permissions` | GET | Berechtigungen |
| `/api/users/invite` | POST | Einladung senden |
| `/api/audit-logs` | GET | Audit-Log |
| `/api/calendar/team` | GET | Team-Termine |
| `/api/delivery-notes/upload` | POST | Lieferschein hochladen |
| `/api/delivery-notes/analyze` | POST | Lieferschein analysieren |
| `/api/chat` | POST | AI-Chat |
| `/api/chat/stream` | POST | AI-Chat (Stream) |
| `/api/email/send` | POST | E-Mail senden |
| `/api/invoice/pdf` | POST | Rechnung als PDF |
| `/api/delivery-note/pdf` | POST | Lieferschein als PDF |
| `/api/reminders/send` | POST | Mahnung senden |
| `/api/geocode` | GET | Adress-Autocomplete |

## Customer-API (Kundenportal)

Basis: `Authorization: Bearer <customer_jwt>`.

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/customer/auth/login` | POST | Login (Projektcode oder E-Mail/Passwort) |
| `/api/customer/auth/logout` | POST | Logout |
| `/api/customer/auth/set-password` | POST | Passwort setzen |
| `/api/customer/auth/reset-password` | POST | Reset anfordern |
| `/api/customer/auth/confirm-reset` | POST | Reset bestätigen |
| `/api/customer/project` | GET | Dashboard-Daten |
| `/api/customer/documents` | GET, POST | Dokumente |
| `/api/customer/documents/[id]/download` | GET | Download-URL |
| `/api/customer/tickets` | GET, POST | Tickets |
| `/api/customer/tickets/[id]/messages` | GET, POST | Nachrichten |
| `/api/customer/appliances` | GET | Geräte |
| `/api/customer/order/sign` | POST | Auftrag unterschreiben |

## Webhooks & Cron

| Route | Methode | Auth | Beschreibung |
|-------|---------|------|--------------|
| `/api/booking/webhook` | POST | Cal.com Payload | Buchung → Lead/Kunde/Projekt |
| `/api/cron/appointment-reminders` | GET | CRON_SECRET | Termin-Erinnerungen |
