# Prompt: KI-Funktion vollständig prüfen (Copy & Paste in neuen Chat)

**Kopiere den folgenden Block in einen neuen Chat und sende ihn ab. Die KI soll prüfen, ob die AI-Assistenten-Funktion überall und in alle Richtungen 100 % funktioniert.**

---

## BEGINN DES PROMPTS (alles ab hier kopieren)

Du bist ein Senior-Entwickler und QA-Experte. Deine Aufgabe: **Die KI-/AI-Funktion in diesem Projekt vollständig prüfen und sicherstellen, dass sie überall und in alle Richtungen zu 100 % funktioniert.**

### Kontext des Projekts

- **Stack:** Next.js 16 (App Router), React 19, Supabase (PostgreSQL, Auth, Storage), Google Gemini (`@google/genai`).
- **App:** CRM für Küchenfachbetriebe (KMU) + Kundenportal. Die **AI-Funktion** ist ein **Assistent (Chat)** für eingeloggte CRM-Mitarbeiter: Sie können mit dem Assistenten chatten, Projekte/Kunden/Rechnungen/Tickets etc. ansprechen, und der Assistent führt **Function Calls** aus (z. B. Projekt anlegen, Status ändern, E-Mail senden, Dokument archivieren).
- **Relevante Pfade:**
  - **UI:** `apps/crm/components/AIAgentButton.tsx`, `apps/crm/components/AIAgentSidebar.tsx`, `apps/crm/hooks/useChatSession.ts`
  - **API:** `apps/crm/app/api/chat/stream/route.ts` (Streaming-Chat mit Gemini), `apps/crm/app/api/chat/route.ts` (falls vorhanden)
  - **AI-Logik:** `apps/crm/lib/ai/` (agentTools, systemInstruction, projectSummary, workflows, monitoring)
  - **Handler (Function Calls):** `apps/crm/app/providers/ai/handleFunctionCall.ts` und alle Dateien unter `apps/crm/app/providers/ai/handlers/` (projectHandlers, financialHandlers, itemHandlers, complaintHandlers, masterDataHandlers, documentHandlers, emailHandlers, workflowHandlers)
  - **Integration in Seiten:** Der AI-Button erscheint auf: Dashboard, Projekte, Kalender, Rechnungen, Tickets, Reklamationen, Buchhaltung, Statistiken, Einstellungen (jeweils die entsprechenden Client-Komponenten)

### Was „100 % in alle Richtungen“ bedeutet

1. **Überall sichtbar und nutzbar:** Auf jeder CRM-Seite, auf der der Assistent angeboten wird, muss der Button erscheinen, die Sidebar sich öffnen, die Nachrichten an `/api/chat/stream` gesendet werden und die Antwort (inkl. Function Calls) korrekt zurückkommen und dargestellt werden.
2. **Alle Function-Call-Tools:** Jede in `lib/ai/agentTools.ts` deklarierte Funktion muss einen Handler in `handleFunctionCall.ts` haben, und der Handler muss korrekt mit der Datenbank/Supabase arbeiten (Berechtigungen, company_id, Fehlerbehandlung).
3. **Kontext:** Projekt-Kontext (z. B. aktuelle Projekte, Projekt-Zusammenfassung) muss korrekt an den Stream übergeben werden und vom Modell genutzt werden können.
4. **Fehlerfälle und Ränder:**
   - Kein `GEMINI_API_KEY` gesetzt → klare Meldung, kein Absturz.
   - Nutzer nicht eingeloggt / keine Berechtigung `edit_projects` → 401/403, keine Datenleck.
   - Rate-Limit überschritten → 429, verständliche Meldung.
   - Modell antwortet mit ungültigem Function Call oder unbekannter Funktion → saubere Fehlerbehandlung, keine uncaught exceptions.
   - Sehr großer Request-Body (viele Projekte) → entweder Kürzung oder stabiler Lauf ohne Timeout/Crash.
5. **Streaming:** Antworten müssen als Stream ankommen und im UI fortlaufend angezeigt werden; Function-Call-Ergebnisse müssen in den Chat eingebettet erscheinen.
6. **Richtungen:** Nicht nur „Chat öffnen und Text senden“, sondern auch: Function Call auslösen → Handler läuft → Ergebnis wird angezeigt; mehrere Function Calls nacheinander; Mix aus Text und Function Calls; Wechsel zwischen Seiten mit offenem Assistenten (falls state erhalten bleibt oder sauber neu lädt).

### Deine Aufgaben

1. **Code durchgehen:** Lese die genannten Dateien (API-Route Chat/Stream, agentTools, systemInstruction, projectSummary, handleFunctionCall, alle Handler, AIAgentSidebar, useChatSession). Prüfe:
   - Ist jede in `agentTools` deklarierte Funktion im `handlerRegistry` in `handleFunctionCall.ts` registriert und wird sie korrekt aufgerufen?
   - Werden alle Handler-Parameter aus dem Gemini-Function-Call korrekt gelesen und an Supabase/DB weitergegeben (inkl. company_id, user_id, RLS)?
   - Gibt es fehlende Fehlerbehandlungen (try/catch, fehlender API-Key, Permission-Check)?
2. **Lücken finden:** Liste alle Stellen, an denen die KI-Funktion abbrechen könnte, falsche Daten schreiben könnte oder in einer Richtung nicht funktioniert (z. B. bestimmter Function Call nicht implementiert, bestimmte Seite ohne Button, State-Verlust beim Seitenwechsel).
3. **Konkrete Checkliste:** Erstelle eine Prüfliste (z. B. als Tabelle oder Liste) mit Einträgen wie: „Stream mit GEMINI_API_KEY fehlt → Fehlermeldung“, „createProject-Handler prüft company_id“, „Rate-Limit auf /api/chat/stream aktiv“, „AIAgentButton auf Dashboard sichtbar“, etc. Markiere jeweils: erfüllt / nicht erfüllt / unklar.
4. **Fix-Vorschläge:** Für jede Lücke oder jedes „nicht erfüllt“: konkrete Code- oder Konfigurationsänderung vorschlagen (Datei, Stelle, vorgeschlagener Fix), damit die KI-Funktion dort 100 % funktioniert.

### Ausgabeformat

- **Kurzfassung:** 2–3 Sätze, ob die KI-Funktion deiner Einschätzung nach „überall und in alle Richtungen“ 100 % funktioniert oder wo die größten Risiken liegen.
- **Checkliste:** Tabelle/Liste wie oben beschrieben.
- **Lücken und Fixes:** Nummerierte Liste der Lücken mit je einem konkreten Fix-Vorschlag (ohne Code zu ändern, nur Vorschlag).
- Optional: Schrittfolge für manuellen Test (z. B. „1. Ohne GEMINI_API_KEY starten, Chat öffnen, Nachricht senden → erwarte Fehlermeldung XY“).

Am Ende: Wenn du denkst, alles ist abgedeckt, schreibe „KI-Funktion bereit für 100 %-Betrieb“; wo nicht, „KI-Funktion: folgende Punkte müssen noch behoben werden“ und die Punkte auflisten.

---

## ENDE DES PROMPTS

---

*Nach dem Einfügen im neuen Chat: Bei Bedarf ergänzen „Das Projekt liegt unter [Pfad]. Bitte die genannten Dateien lesen und die Prüfung durchführen.“*
