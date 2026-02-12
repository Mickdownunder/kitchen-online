BEGIN;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS inbound_email text,
  ADD COLUMN IF NOT EXISTS inbound_email_ab text,
  ADD COLUMN IF NOT EXISTS inbound_email_invoices text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_inbound_email_unique
  ON public.company_settings (lower(inbound_email))
  WHERE inbound_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_inbound_email_ab_unique
  ON public.company_settings (lower(inbound_email_ab))
  WHERE inbound_email_ab IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_inbound_email_invoices_unique
  ON public.company_settings (lower(inbound_email_invoices))
  WHERE inbound_email_invoices IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inbound_document_inbox (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  company_id uuid,
  source_provider text DEFAULT 'resend'::text NOT NULL,
  source_message_id text NOT NULL,
  source_attachment_id text NOT NULL,
  dedupe_key text NOT NULL,
  sender_email text,
  sender_name text,
  recipient_email text,
  subject text,
  received_at timestamptz DEFAULT now() NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  content_sha256 text NOT NULL,
  document_kind text DEFAULT 'unknown'::text NOT NULL,
  processing_status text DEFAULT 'received'::text NOT NULL,
  processing_error text,
  extracted_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  assignment_candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
  assignment_confidence double precision,
  assigned_supplier_order_id uuid,
  assigned_project_id uuid,
  assigned_supplier_invoice_id uuid,
  confirmed_by_user_id uuid,
  confirmed_at timestamptz,
  rejected_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT inbound_document_inbox_pkey PRIMARY KEY (id),
  CONSTRAINT inbound_document_inbox_dedupe_key_key UNIQUE (dedupe_key),
  CONSTRAINT inbound_document_inbox_document_kind_check CHECK (
    document_kind = ANY (ARRAY['ab'::text, 'supplier_delivery_note'::text, 'supplier_invoice'::text, 'unknown'::text])
  ),
  CONSTRAINT inbound_document_inbox_processing_status_check CHECK (
    processing_status = ANY (
      ARRAY[
        'received'::text,
        'classified'::text,
        'preassigned'::text,
        'needs_review'::text,
        'confirmed'::text,
        'rejected'::text,
        'failed'::text
      ]
    )
  ),
  CONSTRAINT inbound_document_inbox_file_size_check CHECK (file_size IS NULL OR file_size >= 0)
);

ALTER TABLE public.inbound_document_inbox OWNER TO postgres;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.company_settings(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_assigned_supplier_order_id_fkey
  FOREIGN KEY (assigned_supplier_order_id)
  REFERENCES public.supplier_orders(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_assigned_project_id_fkey
  FOREIGN KEY (assigned_project_id)
  REFERENCES public.projects(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_assigned_supplier_invoice_id_fkey
  FOREIGN KEY (assigned_supplier_invoice_id)
  REFERENCES public.supplier_invoices(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.inbound_document_inbox
  ADD CONSTRAINT inbound_document_inbox_confirmed_by_user_id_fkey
  FOREIGN KEY (confirmed_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_document_inbox_user_status_received
  ON public.inbound_document_inbox USING btree (user_id, processing_status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_document_inbox_user_kind_received
  ON public.inbound_document_inbox USING btree (user_id, document_kind, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_document_inbox_message_attachment
  ON public.inbound_document_inbox USING btree (user_id, source_message_id, source_attachment_id);

CREATE TABLE IF NOT EXISTS public.inbound_document_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inbox_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT inbound_document_events_pkey PRIMARY KEY (id),
  CONSTRAINT inbound_document_events_event_type_check CHECK (
    event_type = ANY (
      ARRAY[
        'received'::text,
        'classified'::text,
        'preassigned'::text,
        'needs_review'::text,
        'confirmed'::text,
        'reassigned'::text,
        'rejected'::text,
        'failed'::text
      ]
    )
  )
);

ALTER TABLE public.inbound_document_events OWNER TO postgres;

ALTER TABLE ONLY public.inbound_document_events
  ADD CONSTRAINT inbound_document_events_inbox_item_id_fkey
  FOREIGN KEY (inbox_item_id)
  REFERENCES public.inbound_document_inbox(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.inbound_document_events
  ADD CONSTRAINT inbound_document_events_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inbound_document_events_item_created
  ON public.inbound_document_events USING btree (inbox_item_id, created_at DESC);

CREATE OR REPLACE TRIGGER update_inbound_document_inbox_updated_at
  BEFORE UPDATE ON public.inbound_document_inbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.inbound_document_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbound_document_inbox_select_own
  ON public.inbound_document_inbox
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY inbound_document_inbox_insert_own
  ON public.inbound_document_inbox
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY inbound_document_inbox_update_own
  ON public.inbound_document_inbox
  FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY inbound_document_inbox_delete_own
  ON public.inbound_document_inbox
  FOR DELETE TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY inbound_document_events_select_own
  ON public.inbound_document_events
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY inbound_document_events_insert_own
  ON public.inbound_document_events
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.inbound_document_inbox
  TO authenticated;

GRANT SELECT, INSERT
  ON TABLE public.inbound_document_events
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.inbound_document_inbox
  TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.inbound_document_events
  TO service_role;

COMMENT ON COLUMN public.company_settings.inbound_email IS
  'Optionales Postfach für Inbound-Dokumente (AB/Lieferschein/Rechnung) zur automatischen Zuordnung.';

COMMENT ON COLUMN public.company_settings.inbound_email_ab IS
  'Dedizierte Eingangsadresse für Auftragsbestätigungen (AB) pro Firma.';

COMMENT ON COLUMN public.company_settings.inbound_email_invoices IS
  'Dedizierte Eingangsadresse für Lieferantenrechnungen pro Firma.';

COMMENT ON TABLE public.inbound_document_inbox IS
  'Eingangs-Dokumente aus Lieferanten-E-Mails inkl. KI-Vorzuweisung und Review-Status.';

COMMENT ON TABLE public.inbound_document_events IS
  'Status- und Audit-Events für den Inbound-Dokument-Workflow.';

COMMIT;
