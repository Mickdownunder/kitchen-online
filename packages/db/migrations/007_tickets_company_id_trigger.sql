-- ============================================
-- Tickets: ensure company_id is always set
-- ============================================
-- Derive company_id from project -> company_members when missing.

CREATE OR REPLACE FUNCTION set_ticket_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT cm.company_id
    INTO NEW.company_id
    FROM projects p
    JOIN company_members cm
      ON cm.user_id = p.user_id
     AND cm.is_active = true
    WHERE p.id = NEW.project_id
    LIMIT 1;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id could not be resolved for ticket';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tickets_set_company_id ON tickets;
CREATE TRIGGER tickets_set_company_id
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_company_id();
