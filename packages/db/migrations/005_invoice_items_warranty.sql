-- ============================================
-- Invoice Items - Warranty/Appliance Fields
-- ============================================
-- Adds fields to mark items as customer-visible appliances
-- with warranty info and manufacturer support contacts.
-- 
-- ALREADY EXECUTED - This file documents the schema change.

-- 1) Add new columns to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS show_in_portal boolean DEFAULT false;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS installation_date date;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS warranty_until date;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS manufacturer_support_url text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS manufacturer_support_phone text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS manufacturer_support_email text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS appliance_category text;

-- 2) Index for portal queries
CREATE INDEX IF NOT EXISTS invoice_items_portal_idx 
  ON invoice_items(project_id, show_in_portal) 
  WHERE show_in_portal = true;

-- 3) Comments
COMMENT ON COLUMN invoice_items.show_in_portal IS 'If true, this item appears in the customer portal as an appliance';
COMMENT ON COLUMN invoice_items.serial_number IS 'E-Nummer / Seriennummer - eingetragen nach Montage';
COMMENT ON COLUMN invoice_items.installation_date IS 'Datum der Installation';
COMMENT ON COLUMN invoice_items.warranty_until IS 'Garantie-Ende Datum';
COMMENT ON COLUMN invoice_items.appliance_category IS 'Gerätekategorie für Portal-Anzeige (z.B. Backofen, Geschirrspüler)';

-- 4) RLS Policy for customers to read their project's appliances
CREATE POLICY "customer_read_portal_items" ON invoice_items
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
  AND show_in_portal = true
);
