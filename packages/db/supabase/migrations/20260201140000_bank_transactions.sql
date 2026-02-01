-- Bankabgleich: Kontobewegungen aus Monatsliste (PDF) und Zuordnung zu Rechnungen
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  transaction_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  reference text,
  counterparty_name text,
  counterparty_iban text,
  supplier_invoice_id uuid REFERENCES public.supplier_invoices(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.bank_transactions IS 'Kontobewegungen für Bankabgleich; amount > 0 = Gutschrift, amount < 0 = Abbuchung';
COMMENT ON COLUMN public.bank_transactions.amount IS 'Betrag: positiv = Eingang, negativ = Ausgang';
COMMENT ON COLUMN public.bank_transactions.supplier_invoice_id IS 'Zuordnung zu Eingangsrechnung (bei Abbuchung)';
COMMENT ON COLUMN public.bank_transactions.invoice_id IS 'Zuordnung zu Ausgangsrechnung (bei Gutschrift)';

CREATE INDEX idx_bank_transactions_user_date ON public.bank_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_bank_transactions_bank_account ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_supplier_invoice ON public.bank_transactions(supplier_invoice_id) WHERE supplier_invoice_id IS NOT NULL;
CREATE INDEX idx_bank_transactions_invoice ON public.bank_transactions(invoice_id) WHERE invoice_id IS NOT NULL;

-- updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_bank_transactions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_bank_transactions_updated_at();

-- RLS: Nutzer sieht nur eigene Bewegungen
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bank transactions"
  ON public.bank_transactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
