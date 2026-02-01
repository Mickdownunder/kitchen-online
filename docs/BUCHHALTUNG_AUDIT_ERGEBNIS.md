# Buchhaltung (Accounting) – Audit-Ergebnis

## 1. Kurzfassung

Der Buchhaltungs-Bereich ist **funktional und sicher** aufgestellt: Berechtigung `menu_accounting` wird auf der Seite und im Layout konsequent geprüft, die Middleware schützt `/accounting` für eingeloggte Nutzer, und die Server-Seite leitet bei fehlender Permission auf `/dashboard` um. Alle Datenzugriffe laufen über den User-Client (Anon-Key), RLS ist für `invoices`, `supplier_invoices` und `bank_accounts` aktiv und begrenzt Zugriff auf die eigenen bzw. firmenbezogenen Daten. Exporte nutzen die gleichen gefilterten Daten wie die Anzeige (Zeitraum). **Verbesserungspotenzial** besteht bei: Fehlerbehandlung beim Laden (keine sichtbare Fehlermeldung im UI), optional Middleware-Prüfung von `menu_accounting` für früheren Stopp, und Klarheit bei Multi-Company (supplier_invoices/invoices nur `user_id`, keine `company_id`).

---

## 2. Checkliste

| Prüfpunkt | Status | Kommentar |
|-----------|--------|-----------|
| **Berechtigung Seite** | ✅ erfüllt | `apps/crm/app/accounting/page.tsx` ruft `requirePermission('menu_accounting')` auf; bei Fehlern Redirect nach `/dashboard`. |
| **Berechtigung Layout** | ✅ erfüllt | Menüpunkt „Buchhaltung“ hat `permission: 'menu_accounting'`; `visibleMenuItems` filtert mit `hasPermission(item.permission)` – Eintrag nur sichtbar bei Berechtigung. |
| **Berechtigung Middleware** | ⚠️ teilweise | `/accounting` ist in `protectedRoutes`; Middleware prüft nur Auth (Redirect zu Login wenn nicht eingeloggt). **Keine** Prüfung von `menu_accounting` – Nutzer ohne Permission erreichen die Route, werden aber von der Page sofort nach `/dashboard` umgeleitet. |
| **RLS bank_accounts** | ✅ erfüllt | Zwei Policies: (1) `company_settings.id = company_id` und `company_settings.user_id = auth.uid()`; (2) `has_permission('menu_accounting')` und `company_id = get_current_company_id()`. Nur eigene Firma sichtbar/änderbar. |
| **RLS supplier_invoices** | ✅ erfüllt | SELECT/INSERT/UPDATE/DELETE nur mit `user_id = auth.uid()`. Kein `company_id` in der Tabelle – Isolation nach User. |
| **RLS invoices** | ✅ erfüllt | Policy `employee_manage_invoices`: `user_id = auth.uid()`. Nur eigene Ausgangsrechnungen. |
| **Datenfluss Ausgangsrechnungen** | ✅ erfüllt | `getInvoicesWithProject()` filtert mit `user_id` (von `getCurrentUser()`); RLS greift zusätzlich. Zeitraum-Filter clientseitig in `filteredInvoices`. |
| **Datenfluss Eingangsrechnungen** | ✅ erfüllt | `getSupplierInvoicesByDateRange(start, end)` – keine explizite company_id/user_id in der Query; RLS begrenzt auf `user_id = auth.uid()`. |
| **Datenfluss UVA/Vorsteuer** | ✅ erfüllt | `getInputTaxForUVA(start, end)` nutzt intern `getSupplierInvoicesByDateRange`; gleiche RLS-Isolation. |
| **Datenfluss Bankkonten** | ✅ erfüllt | `getBankAccounts(companyId)` wird mit `companySettings.id` aufgerufen (z. B. Settings-Seite, Rechnung/PDF). RLS schränkt auf eigene Firma ein. |
| **Export-Filter** | ✅ erfüllt | UVA-Excel, Rechnungen-Excel, DATEV, PDF verwenden `filteredInvoices`, `supplierInvoices`, `uvaData`, `inputTaxData` aus State – alles bereits zeitraumgefiltert; kein „Export aller“ ohne Filter. |
| **Leere Zustände** | ✅ erfüllt | Tabellen mit „Keine Rechnungen im ausgewählten Zeitraum“ / „Keine Eingangsrechnungen im Zeitraum“; UVA-Tabellen mit leeren Zeilen; keine Abstürze bei leeren Daten. |
| **DB-Konsistenz** | ✅ erfüllt | `supplier_invoices`: Spalten und Mapping in Service/Komponenten stimmen (inkl. category, datev_account, etc.). Category-Check (material, subcontractor, tools, …) in DB; UI nutzt `CATEGORY_LABELS` mit denselben Werten. `bank_accounts`: Spalten und company.ts (get/save/delete) konsistent. |
| **Fehlerbehandlung** | ⚠️ nicht vollständig | Beim Laden (loadInvoices, loadSupplierInvoices) werden Fehler nur geloggt; State bleibt leer, **keine** Fehlermeldung oder Retry im UI. Export-Fehler: `catch` mit `alert('Fehler beim Export...')` – Nutzer wird informiert. |

---

## 3. Befunde

1. **Middleware prüft nicht `menu_accounting`**  
   Pfad `/accounting` wird nur als geschützte Route behandelt (Login erforderlich). Ein Nutzer ohne `menu_accounting` kann die URL aufrufen und wird erst in der Server-Komponente nach `/dashboard` umgeleitet. Kein Sicherheitsloch, aber unnötiger Server-Roundtrip.

2. **Keine sichtbare Fehlerbehandlung beim Laden der Buchhaltungsdaten**  
   In `AccountingView`: `loadInvoices` und `loadSupplierInvoices` fangen Fehler ab, loggen sie und setzen keine Error-State. Bei Netzwerkfehlern oder 403/500 sieht der Nutzer weiterhin leere Listen ohne Hinweis oder Retry.

3. **SupplierInvoicesView lädt alle Eingangsrechnungen**  
   Im Tab „Eingangsrechnungen“ wird `getSupplierInvoices()` ohne Datumsfilter aufgerufen; Filter (Kategorie, Status, Suche) sind nur clientseitig. Das ist konsistent mit „Verwaltung aller Lieferantenrechnungen“; der Übersicht-Tab nutzt dagegen `getSupplierInvoicesByDateRange` für den gewählten Zeitraum. Kein Fehler, nur zur Klarstellung.

4. **Invoices/Supplier_invoices ohne company_id**  
   Tabellen `invoices` und `supplier_invoices` haben nur `user_id`, keine `company_id`. RLS und Services filtern nach User. Bei mehreren Nutzern pro Firma sieht jeder nur die eigenen Rechnungen – gewollt oder Lücke für künftige Multi-User-Pro-Firma-Nutzung (nur dokumentieren).

5. **Bankkonten: company_settings.id vs. get_current_company_id()**  
   Bankkonten werden mit `company_settings.id` verknüpft und in der UI mit `getBankAccounts(settings.id)` geladen. RLS erlaubt Zugriff zusätzlich über `get_current_company_id()` und `menu_accounting`. Wenn Ihr Modell „eine company_settings pro User“ ist, ist das konsistent; bei mehreren Firmen pro User sollte geklärt werden, ob `company_id` in `bank_accounts` immer `company_settings.id` oder `company_members.company_id` sein soll.

---

## 4. Fix-Vorschläge

| Nr. | Befund | Vorschlag |
|-----|--------|-----------|
| 1 | Middleware prüft nicht `menu_accounting` | **Optional:** In `middleware.ts` für `/accounting` nach erfolgreicher CRM-Auth die Permission `menu_accounting` prüfen (z. B. per RPC `has_permission`) und bei false direkt nach `/dashboard` redirecten. Reduziert Roundtrip; aktuell ist die Page-Prüfung ausreichend. |
| 2 | Keine Fehleranzeige beim Laden | In `AccountingView.tsx`: Beim Fehler in `loadInvoices` / `loadSupplierInvoices` einen State `loadError: string | null` setzen und im UI eine dezente Meldung (Banner/Inline) anzeigen inkl. „Erneut versuchen“-Button, der die jeweilige load-Funktion erneut aufruft. |
| 3 | (Info) SupplierInvoicesView lädt alle | Kein Fix nötig. Optional: in der UI beim Tab „Eingangsrechnungen“ einen Hinweis anzeigen, dass alle Rechnungen (unabhängig vom gewählten Zeitraum) angezeigt werden. |
| 4 | (Info) Keine company_id bei invoices/supplier_invoices | Kein unmittelbarer Fix. Wenn später „Firma-weite“ Sicht gewünscht ist: Schema um `company_id` ergänzen, RLS und Services anpassen (Filter nach company + ggf. Rolle). |
| 5 | (Info) Bank company_id-Konsistenz | Kein Code-Fix nötig. In Doku/Architektur festhalten: `bank_accounts.company_id` = `company_settings.id`; bei Multi-Company prüfen, ob get_current_company_id() dasselbe liefert wie die verwendete company_settings. |

---

## 5. Optionale manuelle Tests

1. **Berechtigung**  
   Als Nutzer **ohne** `menu_accounting` (z. B. Rolle „Verkäufer“) einloggen, direkt `/accounting` aufrufen → erwartet: Redirect auf `/dashboard`. Menü „Buchhaltung“ darf nicht sichtbar sein.

2. **Export DATEV**  
   Zeitraum „Monat Januar 2026“ wählen, DATEV-Export ausführen → CSV öffnen und prüfen: Nur Rechnungen mit Belegdatum im Januar 2026, nur eigene Ausgangs-/Eingangsrechnungen (keine fremden Firmen/User).

3. **Leere Zustände**  
   Zeitraum wählen, in dem weder Ausgangs- noch Eingangsrechnungen existieren → UVA-Übersicht und Tabellen zeigen „Keine Rechnungen …“ ohne Fehler oder leere weiße Fläche.

4. **Fehlerfall**  
   (z. B. in Dev) Supabase temporär nicht erreichbar oder RLS so anpassen, dass ein Zugriff 403 liefert → prüfen: Seite crasht nicht; idealerweise erscheint eine Fehlermeldung und „Erneut versuchen“ (nach Implementierung von Fix 2).

---

## 6. Berechnungsprüfung (Genauigkeit)

### Was korrekt ist

- **Netto aus Brutto:** `calculateNetFromGross(gross, taxRate)` = `gross / (1 + taxRate/100)`, gerundet auf 2 Dezimalen – formelrichtig.
- **Steuer aus Brutto:** In `filteredInvoices` wird `taxAmount = grossAmount - netAmount` verwendet (bei Ableitung aus Brutto), damit gilt exakt net + tax = gross.
- **Zahllast:** `totals.totalTax - inputTaxTotals.totalTax`, gerundet – korrekt für UVA.
- **Vorsteuer (getInputTaxForUVA):** Summierung aus gespeicherten `net_amount`/`tax_amount` der Eingangsrechnungen, gruppiert nach Steuersatz, gerundet – korrekt.
- **Totals:** Summen aus `uvaData` (Umsatzsteuer) und `inputTaxTotals` (Vorsteuer) – konsistent mit den zugrunde liegenden Daten.
- **Plausibilitätsprüfung:** Erwartete MwSt = `netAmount * (taxRate/100)`; Abweichung &gt; 0,02 € wird als Rundungswarnung gemeldet – sinnvoll.

### Was nicht 100 % genau ist (Rundung / Logik)

1. **UVA-Steuersatz-Buckets nur 0, 10, 13, 20 %**  
   In `AccountingView` gibt es feste Einträge nur für 0, 10, 13 und 20 %. Rechnungen mit anderem Steuersatz (z. B. 5 %, 7 %) landen in `uva[invoice.taxRate] || uva[20]` und werden fälschlich unter 20 % ausgewiesen. **Folge:** UVA-Aufstellung kann für abweichende Sätze falsch zugeordnet sein.

2. **createInvoice: Netto/MwSt nicht auf 2 Dezimalen gerundet vor Speicherung**  
   Es wird `netAmount = amount / (1 + taxRate/100)` und `taxAmount = amount - netAmount` berechnet und ungerundet in die DB geschrieben. Dadurch können viele Nachkommastellen entstehen; Netto + MwSt kann rechnerisch nicht exakt Brutto ergeben (Gleitkomma), und spätere Summen/Aggregationen können minimal abweichen. **Empfehlung:** Netto auf 2 Dezimalen runden, MwSt als `amount - round(net)` speichern, damit in der DB immer net + tax = amount (auf 2 Dezimalen) gilt.

3. **UVA-Summen: Netto, MwSt und Brutto getrennt gerundet**  
   Pro Steuersatz werden `netAmount`, `taxAmount` und `grossAmount` jeweils mit `Math.round(…*100)/100` gerundet. Dadurch kann in der Anzeige `net + tax ≠ gross` (Abweichung typisch 1 Cent) sein. Für die **Abgabe** relevant sind Umsatzsteuer- und Vorsteuer-Summen sowie Zahllast; diese sind konsistent. Die 1‑Cent-Differenz betrifft nur die Darstellung Netto/Brutto in der Übersicht.

4. **Eingangsrechnungen: Brutto aus Netto + MwSt gerundet**  
   In `createSupplierInvoice` ist `grossAmount = round((netAmount + taxAmount) * 100) / 100`. Damit kann net + tax und angezeigtes Brutto um 1 Cent differieren – üblich und für die Buchhaltung vertretbar.

### Fazit Berechnungen

- **Fachlich (UVA/Zahllast):** Umsatzsteuer, Vorsteuer und Zahllast sind korrekt berechnet und für die Abgabe geeignet.
- **Nicht 100 %:** (1) Falsche Zuordnung von Rechnungen mit Steuersatz ≠ 0/10/13/20 % in der UVA-Übersicht, (2) fehlende 2‑Dezimalen-Rundung beim Speichern von Ausgangsrechnungen, (3) mögliche 1‑Cent-Differenz Netto+Tax vs. Brutto in der Anzeige (nur Darstellung).

---

## Fazit

**Buchhaltung: Prüfung abgeschlossen, keine kritischen Mängel.**

Die folgenden Punkte sollten behoben bzw. beachtet werden:

- **Empfohlen:** Sichtbare Fehlerbehandlung beim Laden (State + Meldung + Retry) in `AccountingView`.
- **Empfohlen (Berechnungen):** UVA-Steuersatz-Buckets dynamisch nach tatsächlichen Sätzen bilden (oder alle vorkommenden Sätze abdecken), damit keine Rechnung fälschlich unter 20 % fällt; in `createInvoice` Netto/MwSt auf 2 Dezimalen runden und MwSt als `amount - round(net)` speichern.
- **Optional:** Middleware-Prüfung von `menu_accounting` für `/accounting` für konsistentes Verhalten und weniger Roundtrips.
- **Dokumentation:** Mehrnutzer-/Multi-Company-Modell (user_id vs. company_id) und Bankkonten-Kontext (company_settings.id vs. get_current_company_id()) festhalten.

Sicherheit (Berechtigung, RLS, keine Exporte ohne Filter) und Datenkonsistenz mit der DB sind gegeben. UVA-/Zahllast-Berechnungen sind fachlich korrekt; Genauigkeit der Darstellung wird durch die genannten Anpassungen (Buckets, Rundung beim Speichern) auf 100 % gebracht.
