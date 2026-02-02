-- Fortlaufende Auftrags- und Lieferscheinnummern (wie Rechnungen)
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS order_prefix text DEFAULT 'K-',
  ADD COLUMN IF NOT EXISTS next_order_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delivery_note_prefix text DEFAULT 'LS-',
  ADD COLUMN IF NOT EXISTS next_delivery_note_number integer DEFAULT 1;

COMMENT ON COLUMN public.company_settings.order_prefix IS 'Präfix für Auftragsnummern (z.B. K-2026-0001)';
COMMENT ON COLUMN public.company_settings.next_order_number IS 'Nächste fortlaufende Auftragsnummer';
COMMENT ON COLUMN public.company_settings.delivery_note_prefix IS 'Präfix für Lieferscheinnummern (z.B. LS-2026-0001)';
COMMENT ON COLUMN public.company_settings.next_delivery_note_number IS 'Nächste fortlaufende Lieferscheinnummer';
