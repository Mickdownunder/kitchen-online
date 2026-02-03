-- Geschäftsführer uneingeschränkte Rechte (KüchenOnline / alle Instanzen)
-- 1. has_permission: Geschäftsführer bekommt immer true (explizit in Migration)
-- 2. Zusätzliche RLS-Policies: Geschäftsführer darf alle Zeilen der eigenen Firma(en) lesen/schreiben,
--    unabhängig von get_current_company_id() (vermeidet Probleme bei mehreren Firmen oder fehlendem Kontext)

-- =============================================================================
-- 1. has_permission: Geschäftsführer immer true
-- =============================================================================
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_code text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO pg_temp, public, auth
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_allowed boolean;
BEGIN
  SELECT cm.company_id, cm.role::text INTO v_company_id, v_role
  FROM company_members cm
  WHERE cm.user_id = auth.uid() AND cm.is_active = true
  ORDER BY cm.company_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;
  -- Geschäftsführer: uneingeschränkt alle Rechte
  IF v_role = 'geschaeftsfuehrer' THEN
    RETURN true;
  END IF;

  SELECT rp.allowed INTO v_allowed
  FROM role_permissions rp
  WHERE rp.company_id = v_company_id
    AND rp.role::text = v_role
    AND rp.permission_code = p_permission_code;

  RETURN COALESCE(v_allowed, false);
END;
$$;

-- =============================================================================
-- 2. Zusätzliche Policies: Geschäftsführer voller Zugriff auf eigene Firma(en)
--    (Policies werden OR-verknüpft; damit reicht eine erfüllte Policy)
-- =============================================================================

-- audit_logs
DROP POLICY IF EXISTS "audit_logs_geschaeftsfuehrer_all" ON public.audit_logs;
CREATE POLICY "audit_logs_geschaeftsfuehrer_all" ON public.audit_logs
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- bank_accounts
DROP POLICY IF EXISTS "bank_accounts_geschaeftsfuehrer_all" ON public.bank_accounts;
CREATE POLICY "bank_accounts_geschaeftsfuehrer_all" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- company_settings (Spalte ist "id" = company id)
DROP POLICY IF EXISTS "company_settings_geschaeftsfuehrer_all" ON public.company_settings;
CREATE POLICY "company_settings_geschaeftsfuehrer_all" ON public.company_settings
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND id IN (SELECT public.get_my_company_ids())
  );

-- complaints
DROP POLICY IF EXISTS "complaints_geschaeftsfuehrer_all" ON public.complaints;
CREATE POLICY "complaints_geschaeftsfuehrer_all" ON public.complaints
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- employees
DROP POLICY IF EXISTS "employees_geschaeftsfuehrer_all" ON public.employees;
CREATE POLICY "employees_geschaeftsfuehrer_all" ON public.employees
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- pending_invites
DROP POLICY IF EXISTS "pending_invites_geschaeftsfuehrer_all" ON public.pending_invites;
CREATE POLICY "pending_invites_geschaeftsfuehrer_all" ON public.pending_invites
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- planning_appointments
DROP POLICY IF EXISTS "planning_appointments_geschaeftsfuehrer_all" ON public.planning_appointments;
CREATE POLICY "planning_appointments_geschaeftsfuehrer_all" ON public.planning_appointments
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );

-- role_permissions (hat bereits is_current_user_geschaeftsfuehrer in einigen Policies;
-- zusätzliche Policy für vollen Zugriff auf alle eigenen Firmen)
DROP POLICY IF EXISTS "role_permissions_geschaeftsfuehrer_all" ON public.role_permissions;
CREATE POLICY "role_permissions_geschaeftsfuehrer_all" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  )
  WITH CHECK (
    public.is_current_user_geschaeftsfuehrer()
    AND company_id IN (SELECT public.get_my_company_ids())
  );
