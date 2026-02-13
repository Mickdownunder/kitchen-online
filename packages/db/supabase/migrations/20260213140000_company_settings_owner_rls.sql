-- RLS: Inhaber (user_id = auth.uid()) dürfen ihre company_settings-Zeile immer lesen/schreiben.
-- Behebt "new row violates row-level security" beim Speichern der Firmendaten.
-- Einzelne FOR-Klauseln für Kompatibilität mit älteren Postgres-Versionen (FOR ALL nicht überall unterstützt).
BEGIN;

DROP POLICY IF EXISTS company_settings_owner_own_row ON public.company_settings;
DROP POLICY IF EXISTS company_settings_owner_own_row_insert ON public.company_settings;
DROP POLICY IF EXISTS company_settings_owner_own_row_update ON public.company_settings;
DROP POLICY IF EXISTS company_settings_owner_own_row_delete ON public.company_settings;

CREATE POLICY company_settings_owner_own_row
  ON public.company_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY company_settings_owner_own_row_insert
  ON public.company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY company_settings_owner_own_row_update
  ON public.company_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY company_settings_owner_own_row_delete
  ON public.company_settings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
