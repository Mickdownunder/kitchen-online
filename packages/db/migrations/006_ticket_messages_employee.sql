-- ============================================
-- Ticket Messages: Allow Employee Replies
-- ============================================
-- 1) Allow employee replies (author_id nullable)
-- 2) Enforce that either customer OR employee authored the message

ALTER TABLE ticket_messages
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE ticket_messages
  DROP CONSTRAINT IF EXISTS ticket_messages_author_check;

ALTER TABLE ticket_messages
  ADD CONSTRAINT ticket_messages_author_check
  CHECK (
    (is_customer = true AND author_id IS NOT NULL AND employee_id IS NULL)
    OR (is_customer = false AND employee_id IS NOT NULL AND author_id IS NULL)
  );
