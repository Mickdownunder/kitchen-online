BEGIN;

ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS ab_document_url text,
  ADD COLUMN IF NOT EXISTS ab_document_name text,
  ADD COLUMN IF NOT EXISTS ab_document_mime_type text;

COMMENT ON COLUMN public.supplier_orders.ab_document_url IS 'Storage path der AB-Datei (intern)';
COMMENT ON COLUMN public.supplier_orders.ab_document_name IS 'Original-Dateiname der AB (intern)';
COMMENT ON COLUMN public.supplier_orders.ab_document_mime_type IS 'MIME-Type der AB-Datei (intern)';

COMMIT;
