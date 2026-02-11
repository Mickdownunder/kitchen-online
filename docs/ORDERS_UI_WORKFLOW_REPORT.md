# Bestellungen: Flow-Check & UI-/Workflow-/Optik-Bewertung

**Stand:** 2026-02-11  
**Nur Bericht** – keine Code- oder Plan-Änderungen. Referenz für Umsetzung: `ORDERS_REFACTOR_AND_FIX_PLAN.md`.

---

## Kontext (fachlicher Flow)

Aufträge mit Artikeln anlegen → irgendwann bestellen (Bereich Bestellungen). Artikel per Mail manuell oder per KI bestellen; dann AB mit Liefertermin (KI erfassen); dann Lieferschein einbuchen/kontrollieren; erst dann Auftrag lieferfähig. Zusätzlich: Artikel wie Danküchen über anderes Programm bestellen → Möglichkeit „als bestellt“ manuell zu markieren.

---

## 1. Ist der beschriebene Flow umgesetzt?

| Schritt (fachlich) | Umsetzung im Code | Status |
|--------------------|--------------------|--------|
| Aufträge mit Artikeln anlegen | Auftrag (Projekt) mit invoice_items; im Bestellungen-Bereich „Positionen aus Auftrag laden“ | ✓ |
| Bestellung: per Mail oder „extern“ | **Senden** (CRM-Mail an Lieferant-E-Mail) oder **Bereits bestellt** (mark-ordered, kein Mail) | ✓ |
| „Per KI bestellen“ | Bestellung selbst: manuell (Senden/Bereits bestellt). KI wird für **AB-** und **Lieferschein-Dokumente** genutzt (Upload → Analyse → Felder vorausfüllen) | ✓ (KI = Erfassen, nicht Versand) |
| Ware bestellen (zuerst) | Queue „Zu bestellen“ → Positionen anlegen → Senden oder Bereits bestellt → Status „sent“/extern | ✓ |
| AB mit Liefertermin erfassen | Dialog „AB erfassen“: AB-Nummer, bestätigter Liefertermin, Abweichungen, Notiz; optional **AB-Dokument** → „Mit KI aus Dokument auslesen“ | ✓ |
| Lieferschein einbuchen/kontrollieren | Dialog „Lieferanten-Lieferschein erfassen“: Nummer, Datum, Notiz; optional **Lieferschein-Dokument** → KI; dann Verknüpfung mit Bestellung | ✓ |
| Erst dann lieferfähig | Queue **Montagebereit** erst nach Wareneingang (goods_receipt_booked / ready_for_installation) | ✓ |
| Extern bestellte Artikel (z. B. Danküchen) | **Bereits bestellt**-Button: mark-ordered ohne Mail; Kanal „extern markiert“; Filter „Alle Bestellwege“ / „extern markiert“ | ✓ |

**Fazit:** Der beschriebene Flow ist fachlich korrekt abgebildet. Klarstellung: „Per KI bestellen“ bedeutet im aktuellen Stand „Bestellung manuell senden oder als bestellt markieren“; KI unterstützt beim **Erfassen** von AB und Lieferschein aus hochgeladenen Dokumenten.

---

## 2. UI-/Workflow-Vorschläge (nur Bericht)

- **Lesbarkeit des Flows:** Die fünf Spalten (Queue, Auftrag+Lieferant, Ablauf, Terminlage, Nächste Aktion) und die fünf Steps (Bestellung → AB → Lieferschein → Wareneingang → Montage) bilden den Ablauf klar ab. Die „Nächste Aktion“-Texte aus `workflowQueue` sind verständlich.
- **Reihenfolge der Aktionen:** Buttons erscheinen kontextabhängig (z. B. nur „AB erfassen“, wenn noch kein AB). Optional: Die Reihenfolge der Buttons in einer Zeile könnte der Ablauf-Reihenfolge entsprechen (z. B. Positionen → Senden/Bereits bestellt → AB → Lieferschein → Wareneingang → Auftrag), damit man von links nach rechts „durch den Flow“ klickt.
- **Zwei Wege deutlich machen:** „Senden“ (Mail) vs. „Bereits bestellt“ (extern) sind beide in „Zu bestellen“ sichtbar. Optional: Kurzer Hinweis unter der Queue „Zu bestellen“ oder in der Kopfzeile, z. B. „Per CRM-Mail senden oder als extern bestellt markieren (z. B. Danküchen).“
- **Modals:** Editor, AB, Lieferschein, Wareneingang sind klar getrennt. Optional: Beim Schließen eines Modals Fokus zurück auf die zugehörige Zeile oder den zugehörigen Button, damit die Orientierung bleibt.
- **Fehler/Erfolg:** Aktuell teilweise `alert`/`confirm`/`prompt`. Für „maximal sauber“: einheitlich Toast/Banner und Inline-Bestätigung (siehe Phase 2 in `ORDERS_REFACTOR_AND_FIX_PLAN.md`).

---

## 3. Optik-Vorschläge (nur Bericht)

- **Konsistenz:** Queues und Steps nutzen bereits ein klares Farbsystem (z. B. amber für „Zu bestellen“, orange für AB, blue für Lieferschein, indigo für WE, emerald für Montage). Das unterstützt die Orientierung.
- **Hierarchie:** Überschrift „Bestellungen“ + Untertitel sind klar. Optional: Die Queue-Chips als horizontale „Pipeline“ visuell noch stärker als einen durchgängigen Ablauf lesbar machen (z. B. leichte Verbindung zwischen Chips oder kleine Pfeile), damit auf einen Blick klar ist: von links (Lieferant fehlt / Brennt) nach rechts (Montagebereit).
- **Tabelle:** Ausreichend Abstand und klare Spalten. Optional: Leichte Zebra-Streifen oder Hover auf der Zeile, damit lange Listen besser scanbar sind.
- **Buttons in der Zeile:** Viele kleine Buttons (Positionen, Senden, Bereits bestellt, AB, Lieferschein, WE, Auftrag). Optisch schon nach Aktion gruppiert (Farbe). Optional: Primäraktion (z. B. der eine „nächste“ Schritt) etwas größer oder kräftiger, Sekundäraktionen (Positionen, Auftrag) dezenter, damit die wichtigste Aktion pro Zeile sofort ins Auge fällt.
- **Modals:** Einheitliche Abstände und gleiche Titel-Struktur (h2 + kurzer Kontext). Editor ist breiter (max-w-[1760px]) für die Positionen-Tabelle – passt. Optisch kein Widerspruch zum Rest der App.

---

## 4. Kurzfassung

- **Flow:** Entspricht der Beschreibung (Bestellung → AB → Lieferschein → Wareneingang → lieferfähig; Senden vs. Bereits bestellt für extern).
- **UI/Workflow:** Logisch und klar; Verbesserungen optional (Button-Reihenfolge, Hinweis zu „Mail vs. extern“, Fokus nach Modal).
- **Optik:** Konsistent und lesbar; optional Pipeline-Visualisierung der Queues, stärkere Hervorhebung der primären Aktion pro Zeile.

Es wird **nichts geändert** – nur bewertet und vorgeschlagen.
