BEGIN;

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  dedupe_key text,
  status text DEFAULT 'queued'::text NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  last_error text,
  provider_message_id text,
  processing_started_at timestamptz,
  sent_at timestamptz,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT email_outbox_pkey PRIMARY KEY (id),
  CONSTRAINT email_outbox_status_check CHECK (
    status = ANY (ARRAY['queued'::text, 'processing'::text, 'sent'::text, 'failed'::text])
  ),
  CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0)
);

ALTER TABLE public.email_outbox OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
  ON public.email_outbox USING btree (status, created_at);

CREATE INDEX IF NOT EXISTS idx_email_outbox_user_created
  ON public.email_outbox USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_outbox_dedupe_key
  ON public.email_outbox USING btree (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE ONLY public.email_outbox
  ADD CONSTRAINT email_outbox_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

CREATE OR REPLACE TRIGGER update_email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_outbox_select_own
  ON public.email_outbox
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY email_outbox_insert_own
  ON public.email_outbox
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

CREATE POLICY email_outbox_update_own
  ON public.email_outbox
  FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = (SELECT auth.uid() AS uid)));

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.email_outbox
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.email_outbox
  TO service_role;

COMMENT ON TABLE public.email_outbox IS
  'Transaktionale E-Mail-Outbox mit dedupe-Key und Retry-Status für robuste Versandabläufe.';

COMMENT ON COLUMN public.email_outbox.dedupe_key IS
  'Idempotenzschlüssel pro fachlichem Versandvorgang; verhindert doppelte E-Mails.';

COMMENT ON COLUMN public.email_outbox.payload IS
  'Vollständige E-Mail-Nutzdaten (Empfänger, Betreff, Inhalt, Anhänge) als JSON.';

COMMIT;
