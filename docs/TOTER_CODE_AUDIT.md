# Audit: Toter Code und unbrauchbare Dateien

**Stand:** 2025-02-01  
**Hinweis:** Es wird **nichts** gelöscht, bis du ausdrücklich zustimmst. Diese Liste dient zur Prüfung.

---

## 1. Dateien/Ordner zum Entfernen (nach deiner Zustimmung)

### 1.1 Temporäre / Build-Artefakte

| Pfad | Begründung |
|------|------------|
| **`tmp/`** (ganzer Ordner) | Enthält `customer-test.pdf` und `schema.sql` – typische temporäre Dateien, werden nirgends importiert. Sollte entweder gelöscht oder in `.gitignore` (z. B. `tmp/`) aufgenommen werden. |
| **`apps/crm/test-results/`** | Playwright-Testergebnisse (z. B. `.last-run.json`). Sollten nicht versioniert werden. Empfehlung: In `.gitignore` eintragen (`test-results/`), dann Ordner löschen. |

### 1.2 Ungenutzter Code (niemand importiert)

| Pfad | Begründung |
|------|------------|
| **`apps/crm/lib/supabase/portal-server.ts`** | Exportiert `createPortalClient()`. Wird **nirgends** importiert – in `middleware.ts` ist eine eigene, inline `createPortalClient()` implementiert. Die Datei ist damit tot. |
| **`apps/crm/lib/utils/cache.ts`** | Exportiert `getCache`, `setCache`, `cachedFetch`. Diese Funktionen werden **nur** in `lib/utils/index.ts` re-exportiert, aber von keiner anderen Datei genutzt. Der gesamte Cache-Code ist ungenutzt. |
| **`apps/crm/components/StatisticsPDF.tsx`** | Exportiert `downloadStatisticsPDF` und eine PDF-Komponente. Wird **nirgends** verwendet – `StatisticsView` nutzt ausschließlich `StatisticsPDFAdvanced`. Alte Variante, ersetzt. |
| **`apps/crm/components/SignatureCapture.tsx`** | Komponente wird **nirgends** importiert. Toter Code. |

### 1.3 Optional (Dev/Test – nur entfernen, wenn du sie nicht brauchst)

| Pfad | Begründung |
|------|------------|
| **`apps/crm/app/api/test/route.ts`** | Reiner Test-Endpoint (z. B. für Gemini). In Production liefert er 404. Nur sinnvoll für manuelle Tests – kann weg, wenn ihr ihn nicht mehr nutzt. |
| **`apps/crm/scripts/test-booking-webhook.ts`** | Manuelles Test-Skript für den Booking-Webhook (nicht in die App eingebunden). Behalten, wenn ihr es für Tests ausführt; sonst optional entfernen. |

---

## 2. Potentiell doppelte / obsolete Strukturen (nur prüfen)

| Thema | Details |
|-------|--------|
| **Root `supabase/` vs. `packages/db/supabase/`** | Im Root gibt es nur `supabase/.temp/` (CLI-Cache). Die echten Migrationen liegen in `packages/db/supabase/migrations/`. Wenn die Supabase-CLI nur aus `packages/db` genutzt wird, ist der Root-Ordner `supabase/` überflüssig; `.temp` könnte dort gelöscht oder ignoriert werden. |

---

## 3. Ungenutzte Exports / Schemas (nicht löschen, nur im Blick behalten)

| Ort | Details |
|-----|--------|
| **`apps/crm/lib/validations/`** | Genutzt werden nur `validations/users` und `validations/email`. Die Exports aus `validations/projects`, `validations/customers`, `validations/articles` werden nirgends importiert – entweder für künftige Nutzung gedacht oder tot. |
| **`apps/crm` – Pakete `@kitchen/auth` und `@kitchen/shared-types`** | Stehen in `package.json`, aber im **CRM-Quellcode** gibt es **keine** Imports von `@kitchen/auth` oder `@kitchen/shared-types`. Die Kunden-Auth läuft über eigene API-Routen und lokale Schemas. Die Pakete werden nur von `packages/auth` (untereinander) genutzt. Entweder geplant für CRM/Portal oder überflüssige Dependency – prüfen, ob CRM sie jemals brauchen soll. |

---

## 4. Kurzüberblick: Was kann weg?

- **Sofort kandidaten (toter Code):**  
  `portal-server.ts`, `lib/utils/cache.ts`, `StatisticsPDF.tsx`, `SignatureCapture.tsx`
- **Aufräumen:**  
  `tmp/`, `test-results/` (plus `.gitignore` für `test-results/`)
- **Optional:**  
  `app/api/test/route.ts`, ggf. `scripts/test-booking-webhook.ts`
- **Struktur prüfen:**  
  Root-`supabase/`, ungenutzte Validations-Exports, CRM-Nutzung von `@kitchen/auth` / `@kitchen/shared-types`

Wenn du möchtest, kann als Nächstes z. B. nur **Abschnitt 1.2** umgesetzt werden (Löschen der vier toten Dateien) oder zuerst `.gitignore` für `tmp/` und `test-results/` ergänzt werden – sag einfach, womit wir anfangen sollen und was du löschen willst.
