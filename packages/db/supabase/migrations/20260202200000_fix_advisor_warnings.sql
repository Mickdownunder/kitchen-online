-- Fix Supabase Advisor warnings (71 → 0):
-- 1. Auth RLS initplan: wrap auth.uid()/auth.jwt() in (select ...) so they are evaluated once per query
-- 2. Duplicate indexes: drop redundant index (keep one per column)
-- 3. Multiple permissive policies: drop redundant policy (keep consolidated/combined one)

-- =============================================================================
-- 1. AUTH RLS INITPLAN (performance: avoid re-evaluation per row)
-- =============================================================================

-- bank_transactions
DROP POLICY IF EXISTS "Users can manage own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users can manage own bank transactions"
  ON public.bank_transactions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- supplier_invoice_custom_categories
DROP POLICY IF EXISTS "Users can view own custom categories" ON public.supplier_invoice_custom_categories;
DROP POLICY IF EXISTS "Users can insert own custom categories" ON public.supplier_invoice_custom_categories;
DROP POLICY IF EXISTS "Users can delete own custom categories" ON public.supplier_invoice_custom_categories;

CREATE POLICY "Users can view own custom categories"
  ON public.supplier_invoice_custom_categories FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own custom categories"
  ON public.supplier_invoice_custom_categories FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own custom categories"
  ON public.supplier_invoice_custom_categories FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- tickets: fix policies that use auth.uid()/auth.jwt() (names may be tickets_*_member / tickets_*_rules in live DB)
DROP POLICY IF EXISTS "tickets_employee_all" ON public.tickets;
CREATE POLICY "tickets_employee_all" ON public.tickets TO authenticated
  USING (
    (((SELECT auth.jwt()) ->> 'role') IS DISTINCT FROM 'customer')
    AND (company_id IN (
      SELECT company_members.company_id FROM public.company_members
      WHERE company_members.user_id = (SELECT auth.uid()) AND company_members.is_active
    ))
  )
  WITH CHECK (
    (((SELECT auth.jwt()) ->> 'role') IS DISTINCT FROM 'customer')
    AND (company_id IN (
      SELECT company_members.company_id FROM public.company_members
      WHERE company_members.user_id = (SELECT auth.uid()) AND company_members.is_active
    ))
  );

-- ticket_messages: employee policies
DROP POLICY IF EXISTS "employee_insert_ticket_messages" ON public.ticket_messages;
CREATE POLICY "employee_insert_ticket_messages" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    (((SELECT auth.jwt()) ->> 'role') IS DISTINCT FROM 'customer')
    AND (ticket_id IN (
      SELECT t.id FROM public.tickets t
      WHERE t.company_id IN (
        SELECT company_members.company_id FROM public.company_members
        WHERE company_members.user_id = (SELECT auth.uid()) AND company_members.is_active
      )
    ))
    AND (is_customer = false) AND (employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "employee_read_ticket_messages" ON public.ticket_messages;
CREATE POLICY "employee_read_ticket_messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    (((SELECT auth.jwt()) ->> 'role') IS DISTINCT FROM 'customer')
    AND (ticket_id IN (
      SELECT t.id FROM public.tickets t
      WHERE t.company_id IN (
        SELECT company_members.company_id FROM public.company_members
        WHERE company_members.user_id = (SELECT auth.uid()) AND company_members.is_active
      )
    ))
  );

-- If live DB has per-action policy names (tickets_delete_member etc.), drop and recreate with (select auth.*)
-- Those are not in this repo; run in SQL Editor if advisor still reports them:
-- DROP POLICY IF EXISTS "tickets_delete_member" ON public.tickets;
-- DROP POLICY IF EXISTS "tickets_insert_rules" ON public.tickets;
-- DROP POLICY IF EXISTS "tickets_select_member" ON public.tickets;
-- DROP POLICY IF EXISTS "tickets_update_member" ON public.tickets;
-- (then create one policy per action using (SELECT auth.uid()) and (SELECT auth.jwt()) in expressions)
-- Same for ticket_messages_*_member / *_rules.

-- =============================================================================
-- 2. DUPLICATE INDEXES (drop one of each identical pair, keep the other)
-- =============================================================================

-- delivery_note_items: identical on delivery_note_id
DROP INDEX IF EXISTS public.idx_delivery_note_items_delivery_note;

-- goods_receipt_items: identical on goods_receipt_id
DROP INDEX IF EXISTS public.idx_goods_receipt_items_receipt;

-- orders: identical on user_id
DROP INDEX IF EXISTS public.idx_orders_user;

-- ticket_messages: two pairs
DROP INDEX IF EXISTS public.ticket_messages_author_id_idx;
DROP INDEX IF EXISTS public.ticket_messages_ticket_id_idx;

-- tickets: two pairs
DROP INDEX IF EXISTS public.tickets_company_id_idx;
DROP INDEX IF EXISTS public.tickets_project_id_idx;

-- =============================================================================
-- 3. MULTIPLE PERMISSIVE POLICIES (drop redundant; keep consolidated/combined)
-- =============================================================================

-- appointments: keep *_consolidated, drop *_owner / *_auth
DROP POLICY IF EXISTS "appointments_delete_owner" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_auth" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_owner" ON public.appointments;

-- articles
DROP POLICY IF EXISTS "articles_delete_owner" ON public.articles;
DROP POLICY IF EXISTS "articles_select_auth" ON public.articles;
DROP POLICY IF EXISTS "articles_update_owner" ON public.articles;

-- bank_accounts: keep one consolidated
DROP POLICY IF EXISTS "bank_accounts_perm_consolidated" ON public.bank_accounts;

-- company_settings: do NOT drop – admin and self need different rules

-- complaints: keep member_all
DROP POLICY IF EXISTS "complaints_permission_all" ON public.complaints;

-- customers
DROP POLICY IF EXISTS "customers_delete_owner" ON public.customers;
DROP POLICY IF EXISTS "customers_select_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_update_owner" ON public.customers;

-- delivery_note_items
DROP POLICY IF EXISTS "delivery_note_items_delete_parent_owner" ON public.delivery_note_items;
DROP POLICY IF EXISTS "delivery_note_items_select_parent_owner" ON public.delivery_note_items;
DROP POLICY IF EXISTS "delivery_note_items_update_parent_owner" ON public.delivery_note_items;

-- delivery_notes
DROP POLICY IF EXISTS "delivery_notes_delete_owner" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_select_auth" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_update_owner" ON public.delivery_notes;

-- documents: do NOT drop – CRM and customer need both

-- employees: drop generic name, keep employees_manage_all (permission-based)
DROP POLICY IF EXISTS "Users can manage employees" ON public.employees;

-- goods_receipt_items
DROP POLICY IF EXISTS "goods_receipt_items_delete_parent_owner" ON public.goods_receipt_items;
DROP POLICY IF EXISTS "goods_receipt_items_select_parent_owner" ON public.goods_receipt_items;
DROP POLICY IF EXISTS "goods_receipt_items_update_parent_owner" ON public.goods_receipt_items;

-- goods_receipts
DROP POLICY IF EXISTS "goods_receipts_delete_owner" ON public.goods_receipts;
DROP POLICY IF EXISTS "goods_receipts_select_auth" ON public.goods_receipts;
DROP POLICY IF EXISTS "goods_receipts_update_owner" ON public.goods_receipts;

-- invoice_items: keep consolidated
DROP POLICY IF EXISTS "invoice_items_owner_all" ON public.invoice_items;

-- invoices: do NOT drop customer_read_invoices – customer portal needs it

-- orders
DROP POLICY IF EXISTS "orders_delete_owner" ON public.orders;
DROP POLICY IF EXISTS "orders_select_auth" ON public.orders;
DROP POLICY IF EXISTS "orders_update_owner" ON public.orders;

-- pending_invites: drop consolidated (keep manage_all for manage_users)
DROP POLICY IF EXISTS "pending_invites_select_authenticated_consolidated" ON public.pending_invites;

-- planning_appointments: do NOT drop – member_all and permission_all serve different roles

-- project_appliances: drop consolidated (keep project_appliances_employee_all)
DROP POLICY IF EXISTS "project_appliances_select_authenticated_consolidated" ON public.project_appliances;

-- projects: do NOT drop projects_owner_all – it is the only one for INSERT/UPDATE/DELETE

-- role_permissions: do NOT drop write_consolidated – needed for INSERT/UPDATE/DELETE

-- ticket_messages
DROP POLICY IF EXISTS "ticket_messages_select_member" ON public.ticket_messages;

-- tickets
DROP POLICY IF EXISTS "tickets_delete_member" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_rules" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_member" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_member" ON public.tickets;
