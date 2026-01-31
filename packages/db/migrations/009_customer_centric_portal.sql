-- ============================================
-- Migration: Customer-Centric Portal
-- ============================================
-- Ändert alle Kunden-RLS-Policies von project_id auf customer_id
-- Ermöglicht: Ein Kunde sieht ALLE seine Projekte im Portal
--
-- WICHTIG: Diese Migration muss in Supabase SQL Editor ausgeführt werden!

-- ============================================
-- 1) ALTE POLICIES LÖSCHEN
-- ============================================

-- Documents
DROP POLICY IF EXISTS "customer_read_documents" ON documents;
DROP POLICY IF EXISTS "customer_insert_documents" ON documents;
DROP POLICY IF EXISTS "customer_delete_own_documents" ON documents;

-- Tickets
DROP POLICY IF EXISTS "customer_read_tickets" ON tickets;
DROP POLICY IF EXISTS "customer_insert_tickets" ON tickets;

-- Ticket Messages
DROP POLICY IF EXISTS "customer_read_ticket_messages" ON ticket_messages;
DROP POLICY IF EXISTS "customer_insert_ticket_messages" ON ticket_messages;

-- Planning Appointments
DROP POLICY IF EXISTS "customer_read_appointments" ON planning_appointments;

-- Projects
DROP POLICY IF EXISTS "customer_read_project" ON projects;

-- Invoices
DROP POLICY IF EXISTS "customer_read_invoices" ON invoices;

-- Invoice Items (für Geräte)
DROP POLICY IF EXISTS "customer_read_portal_items" ON invoice_items;

-- ============================================
-- 2) NEUE POLICIES MIT CUSTOMER_ID
-- ============================================

-- Helper: Alle Projekt-IDs eines Kunden
-- Diese Subquery wird in allen Policies verwendet:
-- SELECT id FROM projects WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid

-- ============================================
-- PROJECTS
-- ============================================
-- Kunde sieht ALLE seine Projekte (nicht nur eins!)
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
-- Kunde sieht Dokumente aller seiner Projekte
CREATE POLICY "customer_read_documents" ON documents
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id IN (
    SELECT id FROM projects 
    WHERE customer_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
  )
  AND type IN (
    'PLANE',
    'INSTALLATIONSPLANE', 
    'KAUFVERTRAG',
    'RECHNUNGEN',
    'LIEFERSCHEINE',
    'AUSMESSBERICHT',
    'KUNDEN_DOKUMENT'
  )
);

-- Kunde kann Dokumente zu seinen Projekten hochladen
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

-- Kunde kann eigene Dokumente löschen
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
-- INVOICE ITEMS (für Gerätepark)
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
-- CUSTOMERS (Read-Only, eigene Daten)
-- ============================================
-- Bleibt gleich - customer_id war schon korrekt
CREATE POLICY "customer_read_self" ON customers
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);
