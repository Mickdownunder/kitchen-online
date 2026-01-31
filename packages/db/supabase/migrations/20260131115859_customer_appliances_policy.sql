-- Align customer appliances policy with customer_id-based auth
DROP POLICY IF EXISTS "customer_read_appliances" ON "public"."project_appliances";

CREATE POLICY "customer_read_appliances"
  ON "public"."project_appliances"
  FOR SELECT
  TO "authenticated"
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'customer'
    AND project_id IN (
      SELECT id
      FROM public.projects
      WHERE customer_id = ((auth.jwt() -> 'app_metadata' ->> 'customer_id'))::uuid
    )
  );
