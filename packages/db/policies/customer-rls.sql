-- ============================================
-- Customer RLS Policies (Customer-Centric)
-- ============================================
-- Diese Policies erlauben Kunden Zugriff auf ALLE ihre Projekte
-- basierend auf customer_id aus JWT Claims.
--
-- WICHTIG: Keine project_id mehr in JWT Claims!
-- JWT enthält nur: { customer_id, role: 'customer' }
--
-- Migration: 009_customer_centric_portal.sql

-- ============================================
-- PROJECTS
-- ============================================
-- Kunde sieht ALLE seine Projekte
CREATE POLICY "customer_read_projects" ON projects
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  AND deleted_at IS NULL
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE POLICY "customer_read_documents" ON documents
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND type IN (
    'PLANE', 'INSTALLATIONSPLANE', 'KAUFVERTRAG',
    'RECHNUNGEN', 'LIEFERSCHEINE', 'AUSMESSBERICHT', 'KUNDEN_DOKUMENT'
  )
);

CREATE POLICY "customer_insert_documents" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND type = 'KUNDEN_DOKUMENT'
  AND uploaded_by = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

CREATE POLICY "customer_delete_own_documents" ON documents
FOR DELETE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND type = 'KUNDEN_DOKUMENT'
  AND uploaded_by = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

-- ============================================
-- TICKETS
-- ============================================
CREATE POLICY "customer_read_tickets" ON tickets
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
);

CREATE POLICY "customer_insert_tickets" ON tickets
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND type = 'KUNDENANFRAGE'
  AND created_by = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

-- ============================================
-- TICKET MESSAGES
-- ============================================
CREATE POLICY "customer_read_ticket_messages" ON ticket_messages
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND ticket_id IN (
    SELECT t.id FROM tickets t
    JOIN projects p ON t.project_id = p.id
    WHERE p.customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
);

CREATE POLICY "customer_insert_ticket_messages" ON ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND ticket_id IN (
    SELECT t.id FROM tickets t
    JOIN projects p ON t.project_id = p.id
    WHERE p.customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND author_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  AND is_customer = true
);

-- ============================================
-- PLANNING APPOINTMENTS
-- ============================================
CREATE POLICY "customer_read_appointments" ON planning_appointments
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
);

-- ============================================
-- INVOICES
-- ============================================
CREATE POLICY "customer_read_invoices" ON invoices
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
);

-- ============================================
-- INVOICE ITEMS (Gerätepark)
-- ============================================
CREATE POLICY "customer_read_portal_items" ON invoice_items
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND show_in_portal = true
);

-- ============================================
-- CUSTOMERS (eigene Daten)
-- ============================================
CREATE POLICY "customer_read_self" ON customers
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);
