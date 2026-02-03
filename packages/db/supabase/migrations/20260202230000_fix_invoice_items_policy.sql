-- invoice_items: Policy wurde in 20260202200000 fälschlich entfernt („keep consolidated“),
-- es gab aber keine consolidated-Policy – nur invoice_items_owner_all.
-- Ohne diese Policy können Mitarbeiter keine Artikel in Aufträgen speichern (RLS blockiert INSERT).
-- Policy wiederherstellen: Zugriff wenn Projekt dem User gehört oder User Firmenkollege des Projekt-Owners ist.

CREATE POLICY "invoice_items_employee_all"
  ON public.invoice_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = invoice_items.project_id
        AND (
          p.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.company_members cm_owner
            JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id AND cm_me.is_active
            WHERE cm_owner.user_id = p.user_id AND cm_owner.is_active
              AND cm_me.user_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = invoice_items.project_id
        AND (
          p.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.company_members cm_owner
            JOIN public.company_members cm_me ON cm_me.company_id = cm_owner.company_id AND cm_me.is_active
            WHERE cm_owner.user_id = p.user_id AND cm_owner.is_active
              AND cm_me.user_id = (SELECT auth.uid())
          )
        )
    )
  );
