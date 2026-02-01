# Bericht: Doppelte Ladebalken im Kundenportal

## Befund

Im Kundenportal unter `/portal` sind **zwei verschiedene Ladezustände** sichtbar:

| Reihenfolge | Quelle | Text | Datei |
|-------------|--------|------|--------|
| 1. | Next.js Route Loading | „Wird geladen...“ | `apps/crm/app/portal/loading.tsx` |
| 2. | Dashboard-Seite (Daten-Fetch) | „Ihre Daten werden geladen...“ | `apps/crm/app/portal/page.tsx` |

## Ursache

1. **`loading.tsx` (Route-Segment)**  
   Next.js App Router zeigt automatisch `app/portal/loading.tsx`, sobald zu `/portal` (oder einer Unterseite) navigiert wird. Das ist das **Suspense-Fallback** für das gesamte Portal-Segment – also der erste sichtbare Ladezustand mit „Wird geladen...“.

2. **`page.tsx` (Dashboard)**  
   Sobald die Route geladen ist, rendert die Dashboard-Seite (`page.tsx`). Sie ist eine Client-Komponente und nutzt `useProjectData()` / `useProject()`. Solange Projekte bzw. Kundendaten noch laden, bleibt `isLoading === true` und die Seite rendert ihren **eigenen** Ladezustand mit „Ihre Daten werden geladen...“ (inkl. aufwändigerem Spinner).

**Ablauf für den Nutzer:**

1. Navigation zu `/portal` → sofort wird **loading.tsx** angezeigt: „Wird geladen...“ (einfacher Spinner).
2. Segment geladen → **page.tsx** wird gerendert.
3. `page.tsx` hat noch `isLoading === true` → zeigt „Ihre Daten werden geladen...“ (größerer Spinner mit Ping/Pulse).
4. Daten da → Dashboard-Inhalt.

Dadurch wirken **zwei** aufeinanderfolgende Ladebildschirme mit unterschiedlichem Text und unterschiedlichem Design.

## Lösung (umgesetzt)

Die **route-level** `loading.tsx` wurde angepasst:

- **Einheitlicher Text:** „Ihre Daten werden geladen...“ (wie auf der Dashboard-Seite).
- **Gleiches Design:** Derselbe Spinner (Loader2, Gradient, Ping/Pulse) wie in `page.tsx`, damit der Übergang von Route-Loading zu Seiten-Loading nahtlos wirkt.

Ergebnis: Es gibt weiterhin zwei technische Ladephasen (Route → Seite/Daten), aber **ein** konsistenter Ladezustand für den Nutzer (ein Text, ein Spinner).

## Weitere Portal-Seiten

Andere Portal-Seiten haben teils eigene Lade-Texte (z. B. „Dokumente werden geladen...“, „Termine werden geladen...“). Die gemeinsame `loading.tsx` gilt für alle Portal-Routen; bei schnellem Wechsel zwischen Unterseiten kann kurz der allgemeine Text „Ihre Daten werden geladen...“ erscheinen, bevor die jeweilige Seite ihren spezifischen Text anzeigt. Das ist technisch bedingt und für Nutzer in der Regel unkritisch.
