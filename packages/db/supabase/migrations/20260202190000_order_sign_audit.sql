-- Audit-Unterlagen für Auftrags-Unterschrift (IP, User-Agent, Geodaten)
-- Rechtlicher Nachweis: Wer hat wann von wo unterschrieben?

CREATE TABLE IF NOT EXISTS public.order_sign_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_by text NOT NULL,
  ip_address text,
  user_agent text,
  -- Geodaten (aus IP-Lookup oder Client), z.B. { "country", "city", "lat", "lon" }
  geodata jsonb,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.order_sign_audit IS 'Audit-Trail für Online-Unterschriften: IP, User-Agent, Geodaten als Nachweis';
COMMENT ON COLUMN public.order_sign_audit.geodata IS 'Geodaten z.B. country, city, region, lat, lon (aus IP oder Client)';

CREATE INDEX IF NOT EXISTS idx_order_sign_audit_project ON public.order_sign_audit(project_id);
CREATE INDEX IF NOT EXISTS idx_order_sign_audit_signed_at ON public.order_sign_audit(signed_at DESC);

ALTER TABLE public.order_sign_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access order_sign_audit"
  ON public.order_sign_audit FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authentifizierte CRM-User mit Zugriff auf Projekt können lesen (Projekt-Owner)
CREATE POLICY "Authenticated read order_sign_audit"
  ON public.order_sign_audit FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );
