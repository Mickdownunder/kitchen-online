# RLS / Policies Audit

## Situation

Viele Migrationen haben nacheinander Policies angepasst (DROP + CREATE, verschiedene Namen). Das kann zu:
- doppelten/überlappenden Policies
- vergessenen Tabellen ohne Policy
- Inkonsistenzen zwischen Instanzen (KüchenOnline vs. Baleah)

führen. **Daten und Tabellen bleiben unberührt** – nur Policies sind betroffen.

---

## Tabellen mit RLS (aus Migrationen + Code)

| Tabelle | App nutzt | Policies (aus Migrations) |
|---------|-----------|---------------------------|
| `invoices` | ✅ | invoices_select_merged, invoices_write_employee, invoices_update_employee, invoices_delete_employee |
| `projects` | ✅ | projects_select_merged, projects_write_owner, projects_update_owner, projects_delete_owner, projects_update_company_member, geschaeftsfuehrer_all |
| `company_settings` | ✅ | company_settings_merged, geschaeftsfuehrer_all |
| `bank_accounts` | ✅ | geschaeftsfuehrer_all (+ evtl. ältere) |
| `employees` | ✅ | geschaeftsfuehrer_all (+ evtl. ältere) |
| `invoice_items` | ✅ | invoice_items_employee_all |
| `articles` | ✅ | (nach fix_advisor: keine *_own mehr, consolidated?) |
| `customers` | ✅ | (merged/consolidated) |
| `delivery_notes` | ✅ | (merged) |
| `delivery_note_items` | ✅ | (merged) |
| `goods_receipts` | ✅ | (merged) |
| `goods_receipt_items` | ✅ | (merged) |
| `documents` | ✅ | documents_insert_merged, documents_select_merged |
| `orders` | ✅ | (merged) |
| `planning_appointments` | ✅ | planning_appointments_merged, geschaeftsfuehrer_all |
| `tickets` | ✅ | tickets_employee_all (+ evtl. ticket_messages) |
| `ticket_messages` | ✅ | employee_insert/read (+ DROP alter Namen) |
| `audit_logs` | ✅ | geschaeftsfuehrer_all |
| `role_permissions` | ✅ | role_permissions_select_merged, _write, _update, _delete, geschaeftsfuehrer_all |
| `pending_invites` | ✅ | geschaeftsfuehrer_all |
| `complaints` | ✅ | geschaeftsfuehrer_all |
| `order_sign_audit` | ✅ | Authenticated read, Service role full |
| `order_sign_tokens` | ✅ | Service role full |
| `user_profiles` | ✅ | (meist service/auth) |
| `company_members` | ✅ | (auth/API) |
| `supplier_invoices` | (API) | (evtl. user_id-basiert) |
| `supplier_invoice_custom_categories` | ✅ | Users can view/insert/delete own |
| `bank_transactions` | ✅ | Users can manage own |
| `chat_sessions` / `chat_messages` | ✅ | (prüfen ob Policy existiert) |
| `project_appliances` | ✅ | customer_read_appliances |
| `processed_webhooks` | ✅ | RLS an, keine Policy = nur service_role |

---

## Empfohlener Weg (ohne Daten zu löschen)

### Option 1: Nur prüfen (schnell)

1. In Supabase Dashboard: **Database → Policies** – alle Tabellen durchgehen.
2. Pro Tabelle: Ist RLS aktiv? Gibt es mind. eine Policy pro Aktion (SELECT/INSERT/UPDATE/DELETE), die die App braucht?
3. Fehlt eine Policy oder ist eine falsch → **eine neue Migration** die nur diese eine Policy anpasst (DROP alte, CREATE neue).

### Option 2: Sauber konsolidieren (einmalig)

1. **Neue Migration** (z. B. `20260204100000_rls_consolidate.sql`):
   - Am Anfang: Für jede betroffene Tabelle `DROP POLICY IF EXISTS "..." ON public.tabelle;` für **alle** bekannten Policy-Namen (aus allen bisherigen Migrationen).
   - Danach: Pro Tabelle **genau eine** Policy pro Aktion (oder eine FOR ALL), die das gewünschte Verhalten abbildet (user_id, company_id, Geschäftsführer, Kunde etc.).
2. **Nur in Staging/Test** anwenden und alle Flows testen (Login, Rechnungen, Projekte, Portal-Kunde, etc.).
3. Wenn alles passt: dieselbe Migration in Produktion ausführen.

### Option 3: Alles raus, schrittweise neu (radikal)

1. Pro Tabelle: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` und alle Policies droppen.
2. App testen (wird alles erlaubt – nur in Dev/Staging).
3. Pro Tabelle wieder `ENABLE ROW LEVEL SECURITY` und **eine** klare Policy-Set pro Tabelle erstellen.
4. Nach jeder Tabelle testen.

---

## Wichtig

- **Keine Tabellen oder Daten löschen** – nur `DROP POLICY` und `CREATE POLICY` (und ggf. `ENABLE/DISABLE ROW LEVEL SECURITY`).
- **Geschäftsführer**: `has_permission()` gibt bereits immer `true`; zusätzlich gibt es pro Tabelle eine `*_geschaeftsfuehrer_all` Policy.
- **Kunde (Portal)**: Nutzer mit `app_metadata.role = 'customer'` – eigene Projekte/Rechnungen/Dokumente/Tickets über eigene Policies.

Wenn du willst, kann als nächster Schritt **eine einzige Konsolidierungs-Migration** entworfen werden, die alle bestehenden Policy-Namen droppt und ein klares, einheitliches Set neu anlegt (ohne Tabellen/Data zu ändern).
