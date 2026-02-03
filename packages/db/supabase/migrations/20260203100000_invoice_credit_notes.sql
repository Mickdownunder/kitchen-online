-- Migration: Stornorechnungen (Gutschriften) Support
-- Ermöglicht das Erstellen von Stornorechnungen mit negativen Beträgen
-- Österreichische Best Practice nach § 11 UStG

-- 1. InvoiceType erweitern um 'credit' (Stornorechnung/Gutschrift)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_type_check 
  CHECK (type = ANY (ARRAY['partial'::text, 'final'::text, 'credit'::text]));

COMMENT ON COLUMN public.invoices.type IS 'partial = Anzahlung, final = Schlussrechnung, credit = Stornorechnung/Gutschrift';

-- 2. Neue Spalte: Referenz zur Originalrechnung (bei Stornierung)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.original_invoice_id IS 'Bei Stornorechnung: Verweis auf die stornierte Originalrechnung';

-- 3. Index für schnelle Abfragen von Stornorechnungen zu einer Originalrechnung
CREATE INDEX IF NOT EXISTS idx_invoices_original_invoice_id ON public.invoices(original_invoice_id) WHERE original_invoice_id IS NOT NULL;

-- 4. Hinweis: Keine CHECK-Constraints für negative Beträge nötig
-- Die Spalten amount, net_amount, tax_amount sind bereits numeric(12,2) ohne Einschränkung
-- Negative Beträge sind für Stornorechnungen erlaubt und erforderlich

-- 5. Dokumentation
COMMENT ON TABLE public.invoices IS 'Zentrale Rechnungstabelle für Anzahlungen (partial), Schlussrechnungen (final) und Stornorechnungen (credit). Bei credit-Typ sind alle Beträge negativ.';
