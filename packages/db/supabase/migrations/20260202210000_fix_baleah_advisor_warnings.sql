-- Fix remaining Baleah Advisor warnings (44 → 0)
-- Baleah uses different policy names than KüchenOnline (from pg_dump)
-- Safe: merge into one policy per (table, role, action), then drop redundant

-- =============================================================================
-- 1. AUTH RLS INITPLAN: order_sign_audit
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated read order_sign_audit" ON public.order_sign_audit;
CREATE POLICY "Authenticated read order_sign_audit"
  ON public.order_sign_audit FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- 2. MULTIPLE PERMISSIVE: Drop redundant (Baleah policy names: *_own, *_all)
-- =============================================================================

-- appointments: drop *_own, keep *_consolidated
DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;

-- articles
DROP POLICY IF EXISTS "articles_delete_own" ON public.articles;
DROP POLICY IF EXISTS "articles_select_own" ON public.articles;
DROP POLICY IF EXISTS "articles_update_own" ON public.articles;

-- company_settings: merge admin + self into one
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_self_all" ON public.company_settings;
CREATE POLICY "company_settings_merged"
  ON public.company_settings TO authenticated
  USING (
    (public.has_permission('manage_company') AND id = public.get_current_company_id())
    OR (user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (public.has_permission('manage_company') AND id = public.get_current_company_id())
    OR (user_id = (SELECT auth.uid()))
  );

-- customers
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;

-- delivery_note_items: keep "all", drop per-action
DROP POLICY IF EXISTS "delivery_note_items_delete_authenticated_consolidated" ON public.delivery_note_items;
DROP POLICY IF EXISTS "delivery_note_items_select_authenticated_consolidated" ON public.delivery_note_items;
DROP POLICY IF EXISTS "delivery_note_items_update_authenticated_consolidated" ON public.delivery_note_items;

-- delivery_notes
DROP POLICY IF EXISTS "delivery_notes_delete_own" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_select_own" ON public.delivery_notes;
DROP POLICY IF EXISTS "delivery_notes_update_own" ON public.delivery_notes;

-- documents: merge CRM + customer into one per action
DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "customer_insert_documents" ON public.documents;
CREATE POLICY "documents_insert_merged" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    -- CRM: project owner
    (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.user_id = (SELECT auth.uid())))
    OR
    -- Customer: own project, KUNDEN_DOKUMENT
    (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'customer')
     AND (project_id IN (SELECT id FROM public.projects WHERE customer_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid))
     AND (type = 'KUNDEN_DOKUMENT')
     AND (uploaded_by = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid))
  );

DROP POLICY IF EXISTS "Users can view documents" ON public.documents;
DROP POLICY IF EXISTS "customer_read_documents" ON public.documents;
CREATE POLICY "documents_select_merged" ON public.documents FOR SELECT TO authenticated
  USING (
    -- CRM: project owner
    (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.user_id = (SELECT auth.uid())))
    OR
    -- CRM: company member (project owner shares company with current user)
    (EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.company_members cm_owner ON cm_owner.user_id = p.user_id AND cm_owner.is_active
      JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id AND cm_me.user_id = (SELECT auth.uid()) AND cm_me.is_active
      WHERE p.id = documents.project_id
    ))
    OR
    -- Customer: own project docs
    (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'customer')
     AND (project_id IN (SELECT id FROM public.projects WHERE customer_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid)))
  );

-- goods_receipt_items: keep all, drop per-action
DROP POLICY IF EXISTS "goods_receipt_items_delete_authenticated_consolidated" ON public.goods_receipt_items;
DROP POLICY IF EXISTS "goods_receipt_items_select_authenticated_consolidated" ON public.goods_receipt_items;
DROP POLICY IF EXISTS "goods_receipt_items_update_authenticated_consolidated" ON public.goods_receipt_items;

-- goods_receipts
DROP POLICY IF EXISTS "goods_receipts_delete_own" ON public.goods_receipts;
DROP POLICY IF EXISTS "goods_receipts_select_own" ON public.goods_receipts;
DROP POLICY IF EXISTS "goods_receipts_update_own" ON public.goods_receipts;

-- invoices: merge customer + employee
DROP POLICY IF EXISTS "customer_read_invoices" ON public.invoices;
DROP POLICY IF EXISTS "employee_manage_invoices" ON public.invoices;
CREATE POLICY "invoices_select_merged" ON public.invoices FOR SELECT TO authenticated
  USING (
    -- Customer: own project invoices
    (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'customer')
     AND (project_id IN (SELECT id FROM public.projects WHERE customer_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid)))
    OR
    -- Employee: own invoices
    (user_id = (SELECT auth.uid()))
  );
CREATE POLICY "invoices_write_employee" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "invoices_update_employee" ON public.invoices FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "invoices_delete_employee" ON public.invoices FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- orders: keep all, drop per-action
DROP POLICY IF EXISTS "orders_delete_authenticated_consolidated" ON public.orders;
DROP POLICY IF EXISTS "orders_select_authenticated_consolidated" ON public.orders;
DROP POLICY IF EXISTS "orders_update_authenticated_consolidated" ON public.orders;

-- planning_appointments: merge member + permission + customer
DROP POLICY IF EXISTS "planning_member_all" ON public.planning_appointments;
DROP POLICY IF EXISTS "planning_permission_all" ON public.planning_appointments;
DROP POLICY IF EXISTS "customer_read_appointments" ON public.planning_appointments;
CREATE POLICY "planning_appointments_merged" ON public.planning_appointments TO authenticated
  USING (
    -- Customer: own project appointments
    (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'customer')
     AND (project_id IN (SELECT id FROM public.projects WHERE customer_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid)))
    OR public.is_user_company_member(company_id)
    OR (public.has_permission('menu_calendar') AND company_id = public.get_current_company_id())
  )
  WITH CHECK (
    public.is_user_company_member(company_id)
    OR (public.has_permission('menu_calendar') AND company_id = public.get_current_company_id())
  );

-- projects: merge owner + consolidated + customer for SELECT; separate write policies
DROP POLICY IF EXISTS "projects_select_authenticated_consolidated" ON public.projects;
DROP POLICY IF EXISTS "customer_read_projects" ON public.projects;
DROP POLICY IF EXISTS "projects_owner_all" ON public.projects;
CREATE POLICY "projects_select_merged" ON public.projects FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM public.company_members cm_owner
      JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id
      WHERE cm_owner.user_id = projects.user_id AND cm_owner.is_active
        AND cm_me.user_id = (SELECT auth.uid()) AND cm_me.is_active
    ))
    OR (
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'customer')
      AND (customer_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'customer_id')::uuid)
      AND (deleted_at IS NULL)
    )
  );
CREATE POLICY "projects_write_owner" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "projects_update_owner" ON public.projects FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- role_permissions: merge read + write for SELECT; keep write for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "role_permissions_read_consolidated" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_write_consolidated" ON public.role_permissions;
CREATE POLICY "role_permissions_select_merged" ON public.role_permissions FOR SELECT TO authenticated
  USING (
    (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = (SELECT auth.uid()) AND is_active))
    OR (public.has_permission('manage_users') AND company_id = public.get_current_company_id())
    OR public.is_current_user_geschaeftsfuehrer()
  );
CREATE POLICY "role_permissions_write" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_permission('manage_users') AND company_id = public.get_current_company_id())
    OR public.is_current_user_geschaeftsfuehrer()
  );
CREATE POLICY "role_permissions_update" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (
    (public.has_permission('manage_users') AND company_id = public.get_current_company_id())
    OR public.is_current_user_geschaeftsfuehrer()
  )
  WITH CHECK (
    (public.has_permission('manage_users') AND company_id = public.get_current_company_id())
    OR public.is_current_user_geschaeftsfuehrer()
  );
CREATE POLICY "role_permissions_delete" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (
    (public.has_permission('manage_users') AND company_id = public.get_current_company_id())
    OR public.is_current_user_geschaeftsfuehrer()
  );

-- ticket_messages: keep employee + customer, drop redundant consolidated
DROP POLICY IF EXISTS "ticket_messages_all_authenticated_consolidated" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_select_authenticated_consolidated" ON public.ticket_messages;

-- tickets: keep tickets_employee_all, drop redundant
DROP POLICY IF EXISTS "tickets_all_authenticated_consolidated" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_authenticated_consolidated" ON public.tickets;
