# Cal.com Booking Webhook - Setup Anleitung

## Übersicht

Dieses Feature ersetzt den bisherigen n8n Flow und integriert Cal.com Buchungen direkt in das CRM.

**Was passiert bei einer Buchung:**
1. Kunde bucht über Cal.com
2. Cal.com sendet Webhook an `/api/booking/webhook`
3. CRM erstellt automatisch:
   - Customer (falls nicht vorhanden)
   - Projekt (Status: Planung, mit Access Code)
   - Planning Appointment
4. Kunde erhält Email mit Portal-Zugang + Meeting-Link

---

## 1. Supabase Migration ausführen

Die Migration für die Dedupe-Tabelle muss einmal ausgeführt werden:

```bash
# Via Supabase CLI
supabase db push

# Oder manuell in Supabase Dashboard > SQL Editor:
# Inhalt von packages/db/supabase/migrations/20260131160000_processed_webhooks.sql ausführen
```

---

## 2. Cal.com einrichten

### 2.1 Account erstellen
1. Gehe zu [cal.com](https://cal.com)
2. Erstelle Account (Free Plan reicht für 1 Verkäufer)
3. Verbinde deinen Google Calendar

### 2.2 Event Type erstellen
1. Gehe zu "Event Types" → "New Event Type"
2. Konfiguriere:
   - **Title:** z.B. "Kostenlose Küchenplanung"
   - **Duration:** 30 oder 60 Minuten
   - **Location:** Google Meet (automatisch)
3. Unter "Advanced" → "Requires confirmation" = Aus

### 2.3 Webhook einrichten
1. Gehe zu "Settings" → "Developer" → "Webhooks"
2. Klicke "New Webhook"
3. Konfiguriere:
   - **Subscriber URL:** `https://DEINE-DOMAIN.com/api/booking/webhook`
   - **Event Triggers:** ✅ `BOOKING_CREATED`
   - **Secret:** (optional, für Signatur-Verifizierung)
4. Speichern

---

## 3. Environment Variables

Stelle sicher, dass diese Env Vars gesetzt sind:

```bash
# Bereits vorhanden (für Supabase)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Bereits vorhanden (für Email)
RESEND_API_KEY=...

# Optional: Portal URL (Default: https://portal.kuechenonline.com)
NEXT_PUBLIC_APP_URL=https://deine-domain.com
```

---

## 4. Testen

### 4.1 Health Check
```bash
curl https://DEINE-DOMAIN.com/api/booking/webhook
# Sollte zurückgeben: {"ok":true,"endpoint":"Cal.com Booking Webhook","version":"1.0.0"}
```

### 4.2 Test-Buchung
1. Öffne deine Cal.com Booking-Seite
2. Buche einen Test-Termin mit deiner Email
3. Prüfe:
   - [ ] Email angekommen mit Portal-Code?
   - [ ] Customer im CRM erstellt?
   - [ ] Projekt mit Status "Planung" erstellt?
   - [ ] Planning Appointment im Kalender?

### 4.3 Webhook Logs
In Cal.com unter "Settings" → "Developer" → "Webhooks" → dein Webhook → "Recent Deliveries" siehst du alle gesendeten Events und deren Status.

---

## 5. Booking Page auf Website einbetten (Optional)

Cal.com bietet mehrere Embed-Optionen:

### Inline Embed
```html
<!-- Cal inline embed code -->
<div id="my-cal-inline"></div>
<script type="text/javascript">
  (function (C, A, L) { 
    let p = function (a, ar) { a.q.push(ar); }; 
    let d = C.document; 
    C.Cal = C.Cal || function () { 
      let cal = C.Cal; 
      let ar = arguments; 
      if (!cal.loaded) { 
        cal.ns = {}; 
        cal.q = cal.q || []; 
        d.head.appendChild(d.createElement("script")).src = A; 
        cal.loaded = true; 
      } 
      if (ar[0] === L) { 
        const api = function () { p(api, arguments); }; 
        const namespace = ar[1]; 
        api.q = api.q || []; 
        typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); 
        return; 
      } 
      p(cal, ar); 
    }; 
  })(window, "https://app.cal.com/embed/embed.js", "init");
  Cal("init", {origin:"https://cal.com"});
  Cal("inline", {
    elementOrSelector:"#my-cal-inline",
    calLink: "DEIN-USERNAME/kuechenplanung",
    layout: "month_view"
  });
</script>
```

### Popup Button
```html
<button data-cal-link="DEIN-USERNAME/kuechenplanung">Termin buchen</button>
<script type="text/javascript">
  // ... Cal.com embed script (siehe oben)
  Cal("ui", {"styles":{"branding":{"brandColor":"#D4AF37"}}});
</script>
```

---

## Dateien

| Datei | Beschreibung |
|-------|--------------|
| `packages/db/supabase/migrations/20260131160000_processed_webhooks.sql` | Dedupe-Tabelle |
| `apps/crm/app/api/booking/webhook/route.ts` | Webhook Handler |
| `apps/crm/lib/email-templates/booking-confirmation.ts` | Email Template |

---

## Troubleshooting

### Webhook kommt nicht an
1. Prüfe ob URL korrekt ist (mit `/api/booking/webhook` am Ende)
2. Prüfe Webhook-Status in Cal.com Developer Settings
3. Prüfe Server-Logs

### Doppelte Einträge
- Die Dedupe-Logik basiert auf `event_id` (Cal.com booking UID)
- Falls trotzdem Duplikate: Prüfe `processed_webhooks` Tabelle

### Email kommt nicht an
1. Prüfe `RESEND_API_KEY`
2. Prüfe Spam-Ordner
3. Prüfe Resend Dashboard für Fehler

### Kein Meeting-Link in Email
- Cal.com muss Google Meet / Zoom als Location haben
- Der Link wird im Webhook-Payload unter `metadata.videoCallUrl` oder `meetingUrl` geliefert
