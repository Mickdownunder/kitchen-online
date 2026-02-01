-- Benutzerdefinierte Kategorien für Eingangsrechnungen (bei Bedarf hinzufügen)
CREATE TABLE IF NOT EXISTS public.supplier_invoice_custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_supplier_invoice_custom_categories_user ON public.supplier_invoice_custom_categories(user_id);

ALTER TABLE public.supplier_invoice_custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom categories"
  ON public.supplier_invoice_custom_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom categories"
  ON public.supplier_invoice_custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom categories"
  ON public.supplier_invoice_custom_categories FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.supplier_invoice_custom_categories IS 'Benutzerdefinierte Kategorien für Eingangsrechnungen (Dropdown-Erweiterung)';

-- Kategorie-Check entfernen: category darf beliebiger Text sein (Standard-Codes + benutzerdefinierte Namen)
ALTER TABLE public.supplier_invoices DROP CONSTRAINT IF EXISTS supplier_invoices_category_check;

-- Skonto für Steuerberater: Vorsteuer bezieht sich auf den tatsächlich gezahlten Betrag
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS skonto_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS skonto_amount numeric(12,2);

COMMENT ON COLUMN public.supplier_invoices.skonto_percent IS 'Skonto in % – wird beim Steuerberater separat angegeben';
COMMENT ON COLUMN public.supplier_invoices.skonto_amount IS 'Skontobetrag in EUR – reduziert den Zahlungsbetrag (Vorsteuer auf tatsächlich gezahlten Betrag)';

GRANT SELECT, INSERT, DELETE ON public.supplier_invoice_custom_categories TO authenticated;
