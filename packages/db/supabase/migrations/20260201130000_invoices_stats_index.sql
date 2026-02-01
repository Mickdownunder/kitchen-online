-- Index für getInvoiceStats: Abfrage nach user_id + invoice_date-Range
-- Verbessert Performance bei Jahresstatistik (z.B. Statistiken-View)
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_invoice_date
  ON public.invoices USING btree (user_id, invoice_date);
