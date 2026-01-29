-- ============================================
-- Customer RLS Policies
-- ============================================
-- Diese Policies erlauben Kunden nur Zugriff auf
-- ihre eigenen Projekt-Daten basierend auf JWT Claims.

-- ============================================
-- DOCUMENTS
-- ============================================

-- Customer kann nur erlaubte Dokumenttypen sehen
CREATE POLICY "customer_read_documents" ON documents
FOR SELECT TO authenticated
USING (
  -- Projekt muss zum Customer gehören
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  -- Nur bestimmte Dokumenttypen sind sichtbar
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

-- Customer kann eigene Dokumente hochladen (nur KUNDEN_DOKUMENT)
CREATE POLICY "customer_insert_documents" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  AND type = 'KUNDEN_DOKUMENT'
  AND uploaded_by = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

-- Customer kann nur eigene KUNDEN_DOKUMENT löschen
CREATE POLICY "customer_delete_own_documents" ON documents
FOR DELETE TO authenticated
USING (
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  AND type = 'KUNDEN_DOKUMENT'
  AND uploaded_by = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

-- ============================================
-- TICKETS
-- ============================================

-- Customer kann eigene Tickets sehen
CREATE POLICY "customer_read_tickets" ON tickets
FOR SELECT TO authenticated
USING (
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
);

-- Customer kann Tickets erstellen
CREATE POLICY "customer_insert_tickets" ON tickets
FOR INSERT TO authenticated
WITH CHECK (
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  AND type = 'KUNDENANFRAGE'
);

-- ============================================
-- TICKET MESSAGES
-- ============================================

-- Customer kann Nachrichten seiner Tickets sehen
CREATE POLICY "customer_read_ticket_messages" ON ticket_messages
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM tickets 
    WHERE project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  )
);

-- Customer kann Nachrichten zu seinen Tickets hinzufügen
CREATE POLICY "customer_insert_ticket_messages" ON ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  ticket_id IN (
    SELECT id FROM tickets 
    WHERE project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  )
  AND author_id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);

-- ============================================
-- APPOINTMENTS
-- ============================================

-- Customer kann eigene Termine sehen
CREATE POLICY "customer_read_appointments" ON appointments
FOR SELECT TO authenticated
USING (
  project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
);

-- ============================================
-- PROJECTS (Read-Only)
-- ============================================

-- Customer kann nur sein eigenes Projekt sehen
CREATE POLICY "customer_read_project" ON projects
FOR SELECT TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
);

-- ============================================
-- CUSTOMERS (Read-Only, eigene Daten)
-- ============================================

-- Customer kann nur seine eigenen Daten sehen
CREATE POLICY "customer_read_self" ON customers
FOR SELECT TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata' ->> 'customer_id')::uuid
);
