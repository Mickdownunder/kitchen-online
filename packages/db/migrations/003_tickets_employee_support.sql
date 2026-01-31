-- ============================================
-- Tickets Employee Support Schema Updates
-- ============================================
-- Enables employees to respond to customer tickets.
-- Adds company_id for multi-tenant filtering.
-- NOTE: company_settings is the company table, company_members links users to companies.

-- 1) Add company_id to tickets (required for employee RLS)
-- References company_settings.id (not "companies")
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES company_settings(id) ON DELETE CASCADE;

-- Backfill company_id from project creator's company membership
-- Projects don't have company_id directly, so we get it via the user who created the project
UPDATE tickets t
SET company_id = (
  SELECT cm.company_id 
  FROM projects p
  JOIN company_members cm ON cm.user_id = p.user_id AND cm.is_active = true
  WHERE p.id = t.project_id
  LIMIT 1
)
WHERE t.company_id IS NULL;

CREATE INDEX IF NOT EXISTS tickets_company_id_idx
  ON tickets(company_id);

CREATE INDEX IF NOT EXISTS tickets_status_idx
  ON tickets(status);

-- 2) Fix ticket_messages.author_id to allow both customers AND employees
-- Remove the FK constraint to customers only, since employees can also be authors.

-- First, drop the existing FK constraint (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_messages_author_id_fkey' 
    AND table_name = 'ticket_messages'
  ) THEN
    ALTER TABLE ticket_messages DROP CONSTRAINT ticket_messages_author_id_fkey;
  END IF;
END $$;

-- Add a column to track author type for clarity
ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS author_type text DEFAULT 'customer';

-- Update existing messages to have correct author_type
UPDATE ticket_messages
SET author_type = CASE WHEN is_customer THEN 'customer' ELSE 'employee' END
WHERE author_type IS NULL OR author_type = 'customer';

-- 3) Add employee_id to ticket_messages for employee responses
-- References auth.users directly (employees are in auth.users)
ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS employee_id uuid;

-- 4) Add assigned_to for ticket assignment to employees
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx
  ON tickets(assigned_to);

-- 5) Optional: Add source_ticket_id to complaints for linking
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS source_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS complaints_source_ticket_id_idx
  ON complaints(source_ticket_id);

-- 6) Create trigger to auto-update updated_at on tickets
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_updated_at_trigger ON tickets;
CREATE TRIGGER tickets_updated_at_trigger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_updated_at();
