# Prompt: Toten Code sicher entfernen (Copy & Paste in anderen Chat)

**Kopiere den Block zwischen BEGINN und ENDE in den anderen Chat. Es werden nur sichere Schritte ausgeführt.**

---

## BEGINN DES PROMPTS

Führe im Projekt **kitchen-online** (Monorepo, Pfad: Workspace-Root) folgende Änderungen aus. **Nur diese Schritte – nichts anderes löschen oder ändern.**

### 1. Tote Dateien löschen (niemand importiert sie)

Lösche diese vier Dateien:

- `apps/crm/lib/supabase/portal-server.ts`
- `apps/crm/lib/utils/cache.ts`
- `apps/crm/components/StatisticsPDF.tsx`
- `apps/crm/components/SignatureCapture.tsx`

### 2. Export aus Index entfernen (weil cache.ts gelöscht wird)

In **`apps/crm/lib/utils/index.ts`**: Entferne die Zeile, die `cache` re-exportiert.

- Suche nach `export * from './cache'` oder `from './cache'` und lösche diese Zeile komplett (und ggf. eine leere Zeile danach, wenn es sonst doppelte Leerzeilen gibt).
- Speichere die Datei.

### 3. .gitignore ergänzen

In der **`.gitignore`** im **Repository-Root** (nicht in apps/crm):

- Wenn `tmp/` noch nicht drin steht: füge eine Zeile `tmp/` hinzu.
- Wenn `test-results/` noch nicht drin steht: füge eine Zeile `test-results/` hinzu.

Wenn die .gitignore in einem Unterordner liegt, nenne mir den Pfad; ansonsten gehe vom Root aus.

---

**Nicht tun:**  
- Keine Ordner `tmp/` oder `test-results/` löschen (nur ignorieren).  
- `apps/crm/app/api/test/route.ts` und `apps/crm/scripts/test-booking-webhook.ts` nicht anfassen.  
- Keine package.json-Dependencies entfernen.  
- Keine anderen Dateien löschen oder umbenennen.

Melde kurz: Was du gelöscht hast, welche Zeile in index.ts entfernt wurde und was in .gitignore ergänzt wurde.

---

## ENDE DES PROMPTS
