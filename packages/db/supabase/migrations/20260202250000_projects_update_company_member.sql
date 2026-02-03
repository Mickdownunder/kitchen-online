-- projects: Erlaube UPDATE für Firmenmitglieder (gleiche Firma wie Projekt-Owner)
-- Bisher durfte nur der Owner (user_id = auth.uid()) updaten. Kollegen konnten z.B. keinen
-- Portal-Zugangscode setzen (send-portal-access schreibt access_code) → 0 Zeilen, ggf. 500/Fehler.
-- Policy ergänzen: Wer das Projekt lesen darf (Owner oder Firmenkollege), darf es auch updaten.

CREATE POLICY "projects_update_company_member" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm_owner
      JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id AND cm_me.is_active
      WHERE cm_owner.user_id = projects.user_id AND cm_owner.is_active
        AND cm_me.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm_owner
      JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id AND cm_me.is_active
      WHERE cm_owner.user_id = projects.user_id AND cm_owner.is_active
        AND cm_me.user_id = (SELECT auth.uid())
    )
  );
