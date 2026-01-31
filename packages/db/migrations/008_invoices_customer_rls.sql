-- ============================================
-- Migration: Customer RLS for Invoices
-- ============================================
-- Erlaubt Kunden, ihre eigenen Rechnungen im Portal zu sehen
-- UND stellt sicher dass CRM-Mitarbeiter weiterhin Zugriff haben

-- 1) RLS auf invoices aktivieren (falls nicht bereits aktiv)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 2) Policy für CRM-Mitarbeiter (user_id basiert)
-- CRM Nutzer können ihre eigenen Rechnungen verwalten
CREATE POLICY "employee_manage_invoices" ON invoices
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- 3) Policy für Kunden-Lesezugriff
-- Nutzt das project_id aus den JWT app_metadata
CREATE POLICY "customer_read_invoices" ON invoices
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
  AND project_id = (auth.jwt() -> 'app_metadata' ->> 'project_id')::uuid
);
