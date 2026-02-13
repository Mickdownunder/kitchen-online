# API-Referenz – kitchen-online / BaLeah CRM

## Auth

| Typ | Methode | Beschreibung |
|-----|---------|--------------|
| Mitarbeiter | Cookie (Supabase Session) | Alle CRM-Routen unter `/api/*` (außer customer, booking, cron, voice) |
| Kunde | Bearer Token (JWT) | `Authorization: Bearer <token>` für `/api/customer/*` |
| Voice (Siri/Shortcut) | Bearer Token (persönlicher Token) | `Authorization: Bearer <personal_voice_token>` für `/api/voice/capture`, `/api/voice/session`, `/api/voice/function` |
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
| `/api/supplier-orders/[id]/send` | POST | Lieferantenbestellung per CRM-Mail versenden (Body: toEmail?, idempotencyKey?, attachments? – optionale Anhänge z. B. Plan/Zeichnung) |
| `/api/supplier-orders/[id]/mark-ordered` | POST | Lieferantenbestellung als extern bestellt markieren |
| `/api/supplier-orders/[id]/documents` | POST | AB/Lieferschein-Dokument zur Bestellung hochladen |
| `/api/supplier-orders/[id]/document-analysis` | POST | AB/Lieferschein-Dokument mit KI analysieren |
| `/api/inbound/email/webhook` | POST | Inbound-Lieferantenmails empfangen (Anhänge in Dokument-Inbox). Auth via Header `x-inbound-email-secret` oder Query `?secret=...` |
| `/api/document-inbox` | GET | Dokument-Inbox abrufen (Filter: kinds/statuses/limit) |
| `/api/document-inbox/[id]/confirm` | POST | Vorzuweisung prüfen und fachlich bestätigen/buchen |
| `/api/document-inbox/[id]/reassign` | POST | Vorzuweisung korrigieren |
| `/api/document-inbox/[id]/reject` | POST | Dokument ablehnen |
| `/api/document-inbox/[id]/file` | GET | Signierte Beleg-URL für Inbox-Dokument öffnen |
| `/api/chat` | POST | AI-Chat |
| `/api/chat/stream` | POST | AI-Chat (Stream) |
| `/api/email/send` | POST | E-Mail senden |
| `/api/invoice/pdf` | POST | Rechnung als PDF |
| `/api/delivery-note/pdf` | POST | Lieferschein als PDF |
| `/api/reminders/send` | POST | Mahnung senden |
| `/api/geocode` | GET | Adress-Autocomplete |
| `/api/analyze-document` | POST | Dokument (PDF) analysieren (Prompt + Base64) |
| `/api/analyze-kitchen-plan` | POST | Küchenplan-PDF (DAN, Blanco, Bosch) → strukturierte Artikel-Liste (Base64) |

## Voice-API (Siri / Shortcuts)

Basis: `Authorization: Bearer <personal_voice_token>`. Token werden in den Einstellungen (Voice-Tab) erzeugt; das Secret wird nur einmal angezeigt. Pro Firma müssen die Feature-Flags `voice_capture_enabled` (und optional `voice_auto_execute_enabled`) aktiv sein.

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/voice/capture` | POST | Voice-Text erfassen (Body: `text`, `idempotencyKey`; optional: `source`, `locale`, `contextHints`). Antwort: `status` (stored \| executed \| needs_confirmation \| failed), `message`, `entryId`; bei Ausführung ggf. `taskId`, `appointmentId`. Idempotenz über `(company_id, idempotency_key)`. Rate-Limit pro Token. |
| `/api/voice/inbox` | GET | Voice-Inbox-Einträge (Filter: status, limit). Cookie-Session (Mitarbeiter). |
| `/api/voice/inbox/[id]/confirm` | POST | needs_confirmation-Eintrag bestätigen und ausführen. |
| `/api/voice/inbox/[id]/retry` | POST | Fehlgeschlagenen Eintrag erneut ausführen. |
| `/api/voice/inbox/[id]/discard` | POST | Eintrag verwerfen. |
| `/api/voice/tokens` | GET, POST | Voice-Tokens auflisten / erstellen (Cookie-Session). |
| `/api/voice/tokens/[id]/revoke` | POST | Token widerrufen. |
| `/api/voice/session` | POST | Gemini Live Session-Config abrufen (API-Key, System-Prompt mit CRM-Kontext, Tool-Deklarationen). Auth: Voice-Token (URL-Param `token`, Body, oder Bearer-Header). Client nutzt Antwort für direkte WebSocket-Verbindung zu Gemini Live API. |
| `/api/voice/function` | POST | CRM-Funktion ausführen (Body: `functionName`, `args`). Auth: Voice-Token. Proxy für Gemini Live Tool-Calls – Client ruft diesen Endpoint wenn Gemini einen Function-Call anfordert, sendet Ergebnis zurück an WebSocket. |

Erlaubte Aktionen (v1 – Schnellerfassung): `create_task`, `create_appointment`, `add_project_note`. Bei hoher Confidence und aktiviertem Auto-Execute wird direkt ausgeführt; sonst `needs_confirmation` (Bestätigung in der Voice-Inbox).

KI-Assistent (v2 – Gemini Live): Voller Zugriff auf alle CRM-Tools via Sprachgespräch. Die `/voice-mobile`-Seite verbindet sich per WebSocket direkt mit Gemini Live API (Audio-Streaming). Function-Calls werden über `/api/voice/function` an den Server delegiert.

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
| `/api/cron/inbound-documents` | GET | CRON_SECRET | Inbound-Dokumente klassifizieren/vorzuweisen |
