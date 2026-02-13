BEGIN;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS voice_capture_enabled boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_auto_execute_enabled boolean DEFAULT false NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'appointment_type'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'Service';
    ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'ReMeasurement';
    ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'Delivery';
    ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'Other';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_user_id uuid,
  completed_by_user_id uuid,
  project_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text NOT NULL,
  priority text DEFAULT 'normal'::text NOT NULL,
  source text DEFAULT 'manual'::text NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_title_check CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT tasks_status_check CHECK (
    status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])
  ),
  CONSTRAINT tasks_priority_check CHECK (
    priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])
  ),
  CONSTRAINT tasks_source_check CHECK (
    source = ANY (ARRAY['manual'::text, 'voice'::text, 'system'::text])
  ),
  CONSTRAINT tasks_completion_consistency_check CHECK (
    (status = 'completed'::text AND completed_at IS NOT NULL)
    OR (status <> 'completed'::text)
  )
);

ALTER TABLE public.tasks OWNER TO postgres;

ALTER TABLE ONLY public.tasks
  ADD CONSTRAINT tasks_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.company_settings(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
  ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
  ADD CONSTRAINT tasks_assigned_user_id_fkey
  FOREIGN KEY (assigned_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.tasks
  ADD CONSTRAINT tasks_completed_by_user_id_fkey
  FOREIGN KEY (completed_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.tasks
  ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_company_status_due
  ON public.tasks USING btree (company_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_company_created
  ON public.tasks USING btree (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_due
  ON public.tasks USING btree (assigned_user_id, status, due_at);

CREATE TABLE IF NOT EXISTS public.voice_api_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  label text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL,
  scopes text[] DEFAULT ARRAY['voice_capture'::text] NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT voice_api_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT voice_api_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT voice_api_tokens_label_check CHECK (char_length(btrim(label)) > 0),
  CONSTRAINT voice_api_tokens_prefix_check CHECK (char_length(btrim(token_prefix)) >= 8),
  CONSTRAINT voice_api_tokens_expires_at_check CHECK (expires_at > created_at)
);

ALTER TABLE public.voice_api_tokens OWNER TO postgres;

ALTER TABLE ONLY public.voice_api_tokens
  ADD CONSTRAINT voice_api_tokens_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.company_settings(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.voice_api_tokens
  ADD CONSTRAINT voice_api_tokens_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.voice_api_tokens
  ADD CONSTRAINT voice_api_tokens_revoked_by_user_id_fkey
  FOREIGN KEY (revoked_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voice_api_tokens_company_active
  ON public.voice_api_tokens USING btree (company_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_voice_api_tokens_user_created
  ON public.voice_api_tokens USING btree (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_inbox_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_id uuid,
  source text DEFAULT 'siri_shortcut'::text NOT NULL,
  locale text,
  idempotency_key text NOT NULL,
  input_text text NOT NULL,
  context_hints jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'captured'::text NOT NULL,
  intent_version text DEFAULT 'v1'::text NOT NULL,
  intent_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  confidence double precision,
  execution_action text,
  execution_result jsonb DEFAULT '{}'::jsonb NOT NULL,
  error_message text,
  needs_confirmation_reason text,
  execution_attempts integer DEFAULT 0 NOT NULL,
  last_executed_at timestamptz,
  executed_task_id uuid,
  executed_appointment_id uuid,
  confirmed_by_user_id uuid,
  confirmed_at timestamptz,
  discarded_by_user_id uuid,
  discarded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT voice_inbox_entries_pkey PRIMARY KEY (id),
  CONSTRAINT voice_inbox_entries_company_idempotency_key_key UNIQUE (company_id, idempotency_key),
  CONSTRAINT voice_inbox_entries_source_check CHECK (
    source = ANY (ARRAY['siri_shortcut'::text, 'mobile_app'::text, 'web'::text, 'system'::text])
  ),
  CONSTRAINT voice_inbox_entries_status_check CHECK (
    status = ANY (
      ARRAY[
        'captured'::text,
        'parsed'::text,
        'needs_confirmation'::text,
        'executed'::text,
        'failed'::text,
        'discarded'::text
      ]
    )
  ),
  CONSTRAINT voice_inbox_entries_input_text_check CHECK (char_length(btrim(input_text)) > 0),
  CONSTRAINT voice_inbox_entries_execution_attempts_check CHECK (execution_attempts >= 0),
  CONSTRAINT voice_inbox_entries_confidence_check CHECK (
    confidence IS NULL OR (confidence >= 0::double precision AND confidence <= 1::double precision)
  )
);

ALTER TABLE public.voice_inbox_entries OWNER TO postgres;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.company_settings(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_token_id_fkey
  FOREIGN KEY (token_id)
  REFERENCES public.voice_api_tokens(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_executed_task_id_fkey
  FOREIGN KEY (executed_task_id)
  REFERENCES public.tasks(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_executed_appointment_id_fkey
  FOREIGN KEY (executed_appointment_id)
  REFERENCES public.planning_appointments(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_confirmed_by_user_id_fkey
  FOREIGN KEY (confirmed_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE ONLY public.voice_inbox_entries
  ADD CONSTRAINT voice_inbox_entries_discarded_by_user_id_fkey
  FOREIGN KEY (discarded_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voice_inbox_entries_company_status_created
  ON public.voice_inbox_entries USING btree (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_inbox_entries_company_created
  ON public.voice_inbox_entries USING btree (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_inbox_entries_user_status_created
  ON public.voice_inbox_entries USING btree (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_inbox_entries_token_created
  ON public.voice_inbox_entries USING btree (token_id, created_at DESC);

CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_voice_api_tokens_updated_at
  BEFORE UPDATE ON public.voice_api_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_voice_inbox_entries_updated_at
  BEFORE UPDATE ON public.voice_inbox_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_inbox_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_company_member ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_company_member ON public.tasks;
DROP POLICY IF EXISTS tasks_update_company_member ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_company_member ON public.tasks;

CREATE POLICY tasks_select_company_member
  ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = tasks.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY tasks_insert_company_member
  ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = tasks.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY tasks_update_company_member
  ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = tasks.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = tasks.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY tasks_delete_company_member
  ON public.tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = tasks.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

DROP POLICY IF EXISTS voice_api_tokens_select_access ON public.voice_api_tokens;
DROP POLICY IF EXISTS voice_api_tokens_insert_own ON public.voice_api_tokens;
DROP POLICY IF EXISTS voice_api_tokens_update_access ON public.voice_api_tokens;
DROP POLICY IF EXISTS voice_api_tokens_delete_access ON public.voice_api_tokens;

CREATE POLICY voice_api_tokens_select_access
  ON public.voice_api_tokens
  FOR SELECT TO authenticated
  USING (
    (
      user_id = auth.uid()
      OR COALESCE(public.has_permission('manage_company'), false)
    )
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_api_tokens.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_api_tokens_insert_own
  ON public.voice_api_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_api_tokens.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_api_tokens_update_access
  ON public.voice_api_tokens
  FOR UPDATE TO authenticated
  USING (
    (
      user_id = auth.uid()
      OR COALESCE(public.has_permission('manage_company'), false)
    )
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_api_tokens.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  )
  WITH CHECK (
    (
      user_id = auth.uid()
      OR COALESCE(public.has_permission('manage_company'), false)
    )
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_api_tokens.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_api_tokens_delete_access
  ON public.voice_api_tokens
  FOR DELETE TO authenticated
  USING (
    (
      user_id = auth.uid()
      OR COALESCE(public.has_permission('manage_company'), false)
    )
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_api_tokens.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

DROP POLICY IF EXISTS voice_inbox_entries_select_company_member ON public.voice_inbox_entries;
DROP POLICY IF EXISTS voice_inbox_entries_insert_own ON public.voice_inbox_entries;
DROP POLICY IF EXISTS voice_inbox_entries_update_company_member ON public.voice_inbox_entries;
DROP POLICY IF EXISTS voice_inbox_entries_delete_company_member ON public.voice_inbox_entries;

CREATE POLICY voice_inbox_entries_select_company_member
  ON public.voice_inbox_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_inbox_entries.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_inbox_entries_insert_own
  ON public.voice_inbox_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_inbox_entries.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_inbox_entries_update_company_member
  ON public.voice_inbox_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_inbox_entries.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_inbox_entries.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY voice_inbox_entries_delete_company_member
  ON public.voice_inbox_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = voice_inbox_entries.company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.tasks
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.voice_api_tokens
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.voice_inbox_entries
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.tasks
  TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.voice_api_tokens
  TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.voice_inbox_entries
  TO service_role;

COMMENT ON COLUMN public.company_settings.voice_capture_enabled IS
  'Aktiviert Siri/Voice-Capture Eingänge für diese Firma.';

COMMENT ON COLUMN public.company_settings.voice_auto_execute_enabled IS
  'Erlaubt automatische Ausführung von High-Confidence Voice-Intents.';

COMMENT ON TABLE public.tasks IS
  'Aufgabenliste (Tasks) für operative CRM-Arbeit inkl. Voice- und manueller Erfassung.';

COMMENT ON TABLE public.voice_api_tokens IS
  'Widerrufbare API-Tokens für Siri/Voice-Capture. Token werden ausschließlich gehasht gespeichert.';

COMMENT ON TABLE public.voice_inbox_entries IS
  'Persistente Voice-Inbox mit Idempotency, Intent-Auswertung und Ausführungsstatus.';

COMMIT;
