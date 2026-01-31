-- ============================================
-- Employee Ticket RLS Policies
-- ============================================
-- Allows employees to read and respond to customer tickets.
-- Uses company_members table to determine company membership.
-- company_settings.id is the company identifier.

-- ============================================
-- TICKETS (Employee Access)
-- ============================================

-- Employee can read all tickets in their company
CREATE POLICY "employee_read_tickets" ON tickets
FOR SELECT TO authenticated
USING (
  -- Must NOT be a customer (employees have no 'customer' role)
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  -- Company filter via company_members
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Employee can update tickets in their company (status, assigned_to)
CREATE POLICY "employee_update_tickets" ON tickets
FOR UPDATE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- TICKET MESSAGES (Employee Access)
-- ============================================

-- Employee can read all messages for tickets in their company
CREATE POLICY "employee_read_ticket_messages" ON ticket_messages
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  AND ticket_id IN (
    SELECT t.id FROM tickets t
    WHERE t.company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Employee can insert messages to tickets in their company
CREATE POLICY "employee_insert_ticket_messages" ON ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'customer'
  -- Must be for a ticket in their company
  AND ticket_id IN (
    SELECT t.id FROM tickets t
    WHERE t.company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  -- Must be marked as employee message
  AND is_customer = false
  -- employee_id must match current user
  AND employee_id = auth.uid()
);
