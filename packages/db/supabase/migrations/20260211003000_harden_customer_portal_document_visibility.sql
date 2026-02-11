BEGIN;

DROP POLICY IF EXISTS "documents_select_merged" ON public.documents;

CREATE POLICY "documents_select_merged"
ON public.documents
FOR SELECT
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = documents.project_id
        AND p.user_id = auth.uid()
    )
  )
  OR (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.company_members cm_owner
        ON cm_owner.user_id = p.user_id
       AND cm_owner.is_active
      JOIN public.company_members cm_me
        ON cm_me.company_id = cm_owner.company_id
       AND cm_me.user_id = auth.uid()
       AND cm_me.is_active
      WHERE p.id = documents.project_id
    )
  )
  OR (
    (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'customer'::text)
    AND documents.project_id IN (
      SELECT projects.id
      FROM public.projects
      WHERE projects.customer_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'customer_id'::text)::uuid)
    )
    AND documents.type = ANY (
      ARRAY[
        'PLANE'::public.document_type,
        'INSTALLATIONSPLANE'::public.document_type,
        'KAUFVERTRAG'::public.document_type,
        'RECHNUNGEN'::public.document_type,
        'LIEFERSCHEINE'::public.document_type,
        'AUSMESSBERICHT'::public.document_type,
        'KUNDEN_DOKUMENT'::public.document_type
      ]
    )
  )
);

COMMIT;
