-- Auftrag: Online-Unterschrift + Widerrufsverzicht
-- Kunde erhält Auftrag per E-Mail, kann online unterschreiben und auf 14-Tage-Widerruf verzichten

-- 1. Felder in projects für unterschriebenen Auftrag
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS order_contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_contract_signed_by text,
  ADD COLUMN IF NOT EXISTS withdrawal_waived_at timestamptz;

COMMENT ON COLUMN public.projects.order_contract_signed_at IS 'Zeitpunkt der Online-Unterschrift des Auftrags';
COMMENT ON COLUMN public.projects.order_contract_signed_by IS 'Name des Unterzeichners (Kunde)';
COMMENT ON COLUMN public.projects.withdrawal_waived_at IS 'Zeitpunkt des Widerrufsverzichts (§ 18 FAGG Maßanfertigung)';

-- 2. Tabelle für Einmal-Tokens (Link in E-Mail, 7 Tage gültig)
CREATE TABLE IF NOT EXISTS public.order_sign_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_sign_tokens_token ON public.order_sign_tokens(token);
CREATE INDEX IF NOT EXISTS idx_order_sign_tokens_project ON public.order_sign_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_order_sign_tokens_expires ON public.order_sign_tokens(expires_at);

-- RLS: Nur service_role/authenticated mit Berechtigung
ALTER TABLE public.order_sign_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access order_sign_tokens"
  ON public.order_sign_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
