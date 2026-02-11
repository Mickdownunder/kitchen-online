BEGIN;

CREATE TABLE IF NOT EXISTS public.installation_reservations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  supplier_order_id uuid,
  installer_company text NOT NULL,
  installer_contact text,
  installer_email text NOT NULL,
  requested_installation_date date,
  request_notes text,
  plan_document_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  request_email_subject text,
  request_email_to text,
  request_email_message text,
  request_email_sent_at timestamptz,
  confirmation_reference text,
  confirmation_date date,
  confirmation_notes text,
  confirmation_document_url text,
  confirmation_document_name text,
  confirmation_document_mime_type text,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT installation_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT installation_reservations_user_project_key UNIQUE (user_id, project_id),
  CONSTRAINT installation_reservations_status_check CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'requested'::text,
        'confirmed'::text,
        'cancelled'::text
      ]
    )
  ),
  CONSTRAINT installation_reservations_installer_email_check CHECK (
    position('@' in installer_email) > 1
  )
);

ALTER TABLE public.installation_reservations OWNER TO postgres;

CREATE INDEX idx_installation_reservations_project
  ON public.installation_reservations USING btree (project_id);

CREATE INDEX idx_installation_reservations_status
  ON public.installation_reservations USING btree (status);

ALTER TABLE ONLY public.installation_reservations
  ADD CONSTRAINT installation_reservations_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.installation_reservations
  ADD CONSTRAINT installation_reservations_supplier_order_id_fkey
  FOREIGN KEY (supplier_order_id)
  REFERENCES public.supplier_orders(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.installation_reservations
  ADD CONSTRAINT installation_reservations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

CREATE OR REPLACE TRIGGER update_installation_reservations_updated_at
  BEFORE UPDATE ON public.installation_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.installation_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY installation_reservations_select_own
  ON public.installation_reservations
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY installation_reservations_insert_own
  ON public.installation_reservations
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY installation_reservations_update_own
  ON public.installation_reservations
  FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY installation_reservations_delete_own
  ON public.installation_reservations
  FOR DELETE TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.installation_reservations
  TO authenticated;

COMMENT ON TABLE public.installation_reservations IS
  'Montage-Reservierungen pro Auftrag inkl. Reservierungs-Mail, Plan-Anhänge und bestätigter Rückmeldung.';

COMMENT ON COLUMN public.installation_reservations.plan_document_ids IS
  'Ausgewählte Plan-Dokumente (documents.id), die mit der Reservierung versendet wurden.';

COMMENT ON COLUMN public.installation_reservations.request_email_sent_at IS
  'Zeitpunkt des Reservierungs-Mailversands an die Montagefirma.';

COMMENT ON COLUMN public.installation_reservations.confirmation_document_url IS
  'Storage path des Bestätigungsdokuments der Montagefirma.';

COMMIT;
