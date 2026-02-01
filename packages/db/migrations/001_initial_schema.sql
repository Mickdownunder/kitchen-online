


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "public"."appointment_type" AS ENUM (
    'Consultation',
    'FirstMeeting',
    'Measurement',
    'Installation'
);


ALTER TYPE "public"."appointment_type" OWNER TO "postgres";


CREATE TYPE "public"."article_category" AS ENUM (
    'Kitchen',
    'Appliance',
    'Accessory',
    'Service',
    'Material',
    'Other'
);


ALTER TYPE "public"."article_category" OWNER TO "postgres";


CREATE TYPE "public"."company_role_new" AS ENUM (
    'geschaeftsfuehrer',
    'administration',
    'buchhaltung',
    'verkaeufer',
    'monteur'
);


ALTER TYPE "public"."company_role_new" OWNER TO "postgres";


CREATE TYPE "public"."complaint_status" AS ENUM (
    'Open',
    'Resolved',
    'draft',
    'reported',
    'ab_confirmed',
    'delivered',
    'installed',
    'resolved'
);


ALTER TYPE "public"."complaint_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."complaint_status" IS 'Status-Werte für Reklamationen: draft (Erfasst), reported (Gemeldet), ab_confirmed (AB bestätigt), delivered (Geliefert), installed (Montiert), resolved (Erledigt)';



CREATE TYPE "public"."document_type" AS ENUM (
    'Invoice',
    'Order',
    'Offer',
    'Contract',
    'Other',
    'PLANE',
    'INSTALLATIONSPLANE',
    'KAUFVERTRAG',
    'RECHNUNGEN',
    'LIEFERSCHEINE',
    'AUSMESSBERICHT',
    'KUNDEN_DOKUMENT'
);


ALTER TYPE "public"."document_type" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'Lead',
    'Planung',
    'Aufmaß',
    'Bestellt',
    'Lieferung',
    'Montage',
    'Abgeschlossen',
    'Reklamation'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."salutation_type" AS ENUM (
    'Herr',
    'Frau',
    'Firma'
);


ALTER TYPE "public"."salutation_type" OWNER TO "postgres";


CREATE TYPE "public"."tax_rate" AS ENUM (
    '10',
    '13',
    '20'
);


ALTER TYPE "public"."tax_rate" OWNER TO "postgres";


CREATE TYPE "public"."unit_type" AS ENUM (
    'Stk',
    'Pkg',
    'Std',
    'Paush',
    'm',
    'm²',
    'lfm'
);


ALTER TYPE "public"."unit_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'manager',
    'employee',
    'viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."add_existing_user_to_company"("p_company_id" "uuid", "p_user_id" "uuid", "p_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
declare
begin
  -- original body preserved
  -- NOTE: We are not changing function logic here. If this placeholder fails, we will re-create using existing definition.
  null;
end;
$$;


ALTER FUNCTION "public"."add_existing_user_to_company"("p_company_id" "uuid", "p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_role"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
  select cm.role
  from company_members cm
  where cm.user_id = p_user_id
  order by cm.is_active desc, cm.updated_at desc nulls last
  limit 1;
$$;


ALTER FUNCTION "public"."admin_get_role"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_is_geschaeftsfuehrer"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
  select exists (
    select 1 from company_members cm
    where cm.user_id = p_user_id
      and cm.role = 'geschaeftsfuehrer'
      and coalesce(cm.is_active, true) = true
  );
$$;


ALTER FUNCTION "public"."admin_is_geschaeftsfuehrer"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_owner_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO company_members(company_id, user_id, role, is_active) VALUES (NEW.id, NEW.user_id, 'owner', TRUE) ON CONFLICT DO NOTHING;
  PERFORM seed_default_permissions(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_owner_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_invoice_item_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.net_total = NEW.quantity * NEW.price_per_unit;
  NEW.tax_amount = NEW.net_total * (CAST(NEW.tax_rate AS INTEGER) / 100.0);
  NEW.gross_total = NEW.net_total + NEW.tax_amount;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_invoice_item_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_users"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE v_role TEXT; BEGIN
  SELECT cm.role::TEXT INTO v_role
  FROM company_members cm
  WHERE cm.user_id = auth.uid() AND cm.is_active = true
  ORDER BY cm.company_id
  LIMIT 1;

  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role = 'geschaeftsfuehrer' THEN RETURN true; END IF;

  RETURN has_permission_v2('manage_users');
END; $$;


ALTER FUNCTION "public"."can_manage_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_pending_invite"("p_company_id" "uuid", "p_email" "text", "p_role" "text", "p_invited_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
DECLARE
  v_invite_id UUID := gen_random_uuid();
BEGIN
  IF p_role NOT IN ('geschaeftsfuehrer','administration','buchhaltung','verkaeufer','monteur') THEN
    RAISE EXCEPTION 'Ungültige Rolle: %', p_role
      USING HINT = 'Erlaubt: geschaeftsfuehrer, administration, buchhaltung, verkaeufer, monteur';
  END IF;

  INSERT INTO pending_invites (id, company_id, email, invited_by, role, expires_at, created_at)
  VALUES (
    v_invite_id,
    p_company_id,
    lower(p_email),
    p_invited_by,
    p_role::company_role_new,
    now() + interval '7 days',
    now()
  );

  RETURN v_invite_id;
END;
$$;


ALTER FUNCTION "public"."create_pending_invite"("p_company_id" "uuid", "p_email" "text", "p_role" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
  -- Platzhalter: Falls es nur eine Firma gibt und deren ID bekannt ist,
  -- kannst du hier die UUID hart eintragen. Vorläufig geben wir NULL zurück.
  select null::uuid;
$$;


ALTER FUNCTION "public"."current_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_pending_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT can_manage_users() THEN RAISE EXCEPTION 'Keine Berechtigung'; END IF;
  DELETE FROM pending_invites WHERE id = p_invite_id AND company_id = get_current_company_id();
END;
$$;


ALTER FUNCTION "public"."delete_pending_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audit_logs"("p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0, "p_action" "text" DEFAULT NULL::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("id" "uuid", "user_id" "uuid", "company_id" "uuid", "action" "text", "entity_type" "text", "entity_id" "uuid", "changes" "jsonb", "ip_address" "text", "user_agent" "text", "request_id" "text", "metadata" "jsonb", "created_at" timestamp without time zone, "user_email" "text", "user_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get current user's company
  SELECT company_id INTO v_company_id
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM company_settings
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- Return audit logs for company with filters
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.company_id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.changes,
    al.ip_address,
    al.user_agent,
    al.request_id,
    al.metadata,
    al.created_at,
    up.email AS user_email,
    up.full_name AS user_name
  FROM audit_logs al
  LEFT JOIN user_profiles up ON up.id = al.user_id
  WHERE al.company_id = v_company_id
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_entity_id IS NULL OR al.entity_id = p_entity_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_members"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "email" "text", "full_name" "text", "role" "text", "is_active" boolean, "created_at" timestamp without time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT cm.id, cm.user_id, COALESCE(up.email, au.email), up.full_name, cm.role, cm.is_active, cm.created_at
  FROM company_members cm
  LEFT JOIN user_profiles up ON up.id = cm.user_id
  LEFT JOIN auth.users au ON au.id = cm.user_id
  WHERE cm.company_id = get_current_company_id()
  ORDER BY cm.created_at;
$$;


ALTER FUNCTION "public"."get_company_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_company_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE v_company_id UUID; BEGIN
  SELECT company_id INTO v_company_id
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY company_id
  LIMIT 1;
  RETURN v_company_id;
END; $$;


ALTER FUNCTION "public"."get_current_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE v_role TEXT; BEGIN
  SELECT role::TEXT INTO v_role
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY company_id
  LIMIT 1;
  RETURN v_role;
END; $$;


ALTER FUNCTION "public"."get_current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_effective_permissions"() RETURNS TABLE("permission_code" "text", "allowed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE
  v_company_id UUID;
  v_role TEXT;
BEGIN
  SELECT cm.company_id, cm.role::TEXT
    INTO v_company_id, v_role
  FROM company_members cm
  WHERE cm.user_id = auth.uid()
    AND cm.is_active = true
  ORDER BY cm.company_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'geschaeftsfuehrer' THEN
    RETURN QUERY
    SELECT p.code::TEXT, true::BOOLEAN
    FROM permissions p
    ORDER BY p.sort_order;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.code::TEXT,
    COALESCE(rp.allowed, false)::BOOLEAN
  FROM permissions p
  LEFT JOIN role_permissions rp
    ON rp.permission_code = p.code
   AND rp.company_id = v_company_id
   AND rp.role::TEXT = v_role
  ORDER BY p.sort_order;
END;
$$;


ALTER FUNCTION "public"."get_effective_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_company_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT company_id
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = true;
$$;


ALTER FUNCTION "public"."get_my_company_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_invites_for_company"() RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "invited_by_name" "text", "expires_at" timestamp without time zone, "created_at" timestamp without time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT pi.id, pi.email, pi.role, COALESCE(up.full_name, 'System'), pi.expires_at, pi.created_at
  FROM pending_invites pi LEFT JOIN user_profiles up ON up.id = pi.invited_by
  WHERE pi.company_id = get_current_company_id() AND pi.expires_at > NOW()
  ORDER BY pi.created_at DESC;
$$;


ALTER FUNCTION "public"."get_pending_invites_for_company"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("p_permission_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE v_company_id UUID; v_role TEXT; v_allowed BOOLEAN; BEGIN
  SELECT cm.company_id, cm.role::TEXT INTO v_company_id, v_role
  FROM company_members cm
  WHERE cm.user_id = auth.uid() AND cm.is_active = true
  ORDER BY cm.company_id
  LIMIT 1;

  IF v_company_id IS NULL THEN RETURN false; END IF;
  IF v_role = 'geschaeftsfuehrer' THEN RETURN true; END IF;

  SELECT rp.allowed INTO v_allowed
  FROM role_permissions rp
  WHERE rp.company_id = v_company_id
    AND rp.role::TEXT = v_role
    AND rp.permission_code = p_permission_code;

  RETURN COALESCE(v_allowed, false);
END; $$;


ALTER FUNCTION "public"."has_permission"("p_permission_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_geschaeftsfuehrer"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
  select exists (
    select 1 from company_members cm
    where cm.user_id = (select auth.uid())
      and cm.role = 'geschaeftsfuehrer'
      and coalesce(cm.is_active, true) = true
  );
$$;


ALTER FUNCTION "public"."is_current_user_geschaeftsfuehrer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_company_member"("p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Bypass RLS durch SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.company_id = p_company_id
    AND cm.is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_user_company_member"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_user_company_member"("p_company_id" "uuid") IS 'Helper-Funktion um RLS-Rekursion zu vermeiden. Verwendet SECURITY DEFINER um RLS zu bypassen.';



CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_changes" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_company_id UUID;
  v_log_id UUID;
BEGIN
  -- Get company ID for user
  SELECT company_id INTO v_company_id
  FROM company_members
  WHERE user_id = p_user_id AND is_active = TRUE
  LIMIT 1;
  
  -- If no company found, try to get from company_settings (for owner)
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM company_settings
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    user_agent,
    request_id,
    metadata
  ) VALUES (
    p_user_id,
    v_company_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_ip_address,
    p_user_agent,
    p_request_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_changes" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_request_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_pending_invite"("p_user_id" "uuid", "p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM pending_invites WHERE LOWER(email) = LOWER(p_email) AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1;
  IF v_invite IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM company_members WHERE company_id = v_invite.company_id AND user_id = p_user_id) THEN
    DELETE FROM pending_invites WHERE id = v_invite.id; RETURN FALSE;
  END IF;
  INSERT INTO company_members(company_id, user_id, role, is_active) VALUES (v_invite.company_id, p_user_id, v_invite.role, TRUE);
  DELETE FROM pending_invites WHERE id = v_invite.id;
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."process_pending_invite"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_company_id UUID; v_target_user_id UUID;
BEGIN
  IF NOT can_manage_users() THEN RAISE EXCEPTION 'Keine Berechtigung'; END IF;
  SELECT company_id, user_id INTO v_company_id, v_target_user_id FROM company_members WHERE id = p_member_id;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Nicht gefunden'; END IF;
  IF v_target_user_id = auth.uid() THEN
    IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = v_company_id AND role = 'owner' AND user_id != auth.uid() AND is_active = TRUE) THEN
      RAISE EXCEPTION 'Mindestens ein Owner erforderlich';
    END IF;
  END IF;
  UPDATE company_members SET is_active = FALSE, updated_at = NOW() WHERE id = p_member_id;
END;
$$;


ALTER FUNCTION "public"."remove_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_permissions"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_perm RECORD; v_role TEXT;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['owner','admin','manager','employee','viewer'] LOOP
    FOR v_perm IN SELECT code FROM permissions LOOP
      INSERT INTO role_permissions(company_id, role, permission_code, allowed) VALUES (
        p_company_id, v_role, v_perm.code,
        CASE
          WHEN v_role = 'owner' THEN TRUE
          WHEN v_role = 'admin' THEN v_perm.code != 'manage_company'
          WHEN v_role = 'manager' THEN v_perm.code LIKE 'menu_%' OR v_perm.code IN ('view_purchase_prices','edit_purchase_prices','view_margins','edit_projects','create_invoices','mark_payments','export_data')
          WHEN v_role = 'employee' THEN v_perm.code IN ('menu_dashboard','menu_projects','menu_customers','menu_articles','menu_deliveries','menu_calendar','menu_complaints','edit_projects')
          WHEN v_role = 'viewer' THEN v_perm.code = 'menu_dashboard'
          ELSE FALSE
        END
      ) ON CONFLICT (company_id, role, permission_code) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."seed_default_permissions"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_role_permissions_for_company"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    -- Geschäftsführer (alle Rechte)
    INSERT INTO role_permissions (company_id, role, permission_code, allowed) VALUES
        (p_company_id, 'geschaeftsfuehrer', 'menu_dashboard', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_projects', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_customers', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_articles', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_deliveries', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_calendar', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_complaints', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_invoices', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_statistics', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_accounting', true),
        (p_company_id, 'geschaeftsfuehrer', 'menu_settings', true),
        (p_company_id, 'geschaeftsfuehrer', 'view_purchase_prices', true),
        (p_company_id, 'geschaeftsfuehrer', 'edit_purchase_prices', true),
        (p_company_id, 'geschaeftsfuehrer', 'view_margins', true),
        (p_company_id, 'geschaeftsfuehrer', 'edit_projects', true),
        (p_company_id, 'geschaeftsfuehrer', 'delete_projects', true),
        (p_company_id, 'geschaeftsfuehrer', 'create_invoices', true),
        (p_company_id, 'geschaeftsfuehrer', 'mark_payments', true),
        (p_company_id, 'geschaeftsfuehrer', 'manage_users', true),
        (p_company_id, 'geschaeftsfuehrer', 'manage_company', true),
        (p_company_id, 'geschaeftsfuehrer', 'export_data', true)
    ON CONFLICT (company_id, role, permission_code) DO NOTHING;

    -- Administration (alle Rechte)
    INSERT INTO role_permissions (company_id, role, permission_code, allowed) VALUES
        (p_company_id, 'administration', 'menu_dashboard', true),
        (p_company_id, 'administration', 'menu_projects', true),
        (p_company_id, 'administration', 'menu_customers', true),
        (p_company_id, 'administration', 'menu_articles', true),
        (p_company_id, 'administration', 'menu_deliveries', true),
        (p_company_id, 'administration', 'menu_calendar', true),
        (p_company_id, 'administration', 'menu_complaints', true),
        (p_company_id, 'administration', 'menu_invoices', true),
        (p_company_id, 'administration', 'menu_statistics', true),
        (p_company_id, 'administration', 'menu_accounting', true),
        (p_company_id, 'administration', 'menu_settings', true),
        (p_company_id, 'administration', 'view_purchase_prices', true),
        (p_company_id, 'administration', 'edit_purchase_prices', true),
        (p_company_id, 'administration', 'view_margins', true),
        (p_company_id, 'administration', 'edit_projects', true),
        (p_company_id, 'administration', 'delete_projects', true),
        (p_company_id, 'administration', 'create_invoices', true),
        (p_company_id, 'administration', 'mark_payments', true),
        (p_company_id, 'administration', 'manage_users', true),
        (p_company_id, 'administration', 'manage_company', true),
        (p_company_id, 'administration', 'export_data', true)
    ON CONFLICT (company_id, role, permission_code) DO NOTHING;

    -- Buchhaltung (eingeschränkt)
    INSERT INTO role_permissions (company_id, role, permission_code, allowed) VALUES
        (p_company_id, 'buchhaltung', 'menu_dashboard', true),
        (p_company_id, 'buchhaltung', 'menu_projects', false),
        (p_company_id, 'buchhaltung', 'menu_customers', false),
        (p_company_id, 'buchhaltung', 'menu_articles', false),
        (p_company_id, 'buchhaltung', 'menu_deliveries', false),
        (p_company_id, 'buchhaltung', 'menu_calendar', false),
        (p_company_id, 'buchhaltung', 'menu_complaints', false),
        (p_company_id, 'buchhaltung', 'menu_invoices', true),
        (p_company_id, 'buchhaltung', 'menu_statistics', true),
        (p_company_id, 'buchhaltung', 'menu_accounting', true),
        (p_company_id, 'buchhaltung', 'menu_settings', false),
        (p_company_id, 'buchhaltung', 'view_purchase_prices', true),
        (p_company_id, 'buchhaltung', 'edit_purchase_prices', false),
        (p_company_id, 'buchhaltung', 'view_margins', true),
        (p_company_id, 'buchhaltung', 'edit_projects', false),
        (p_company_id, 'buchhaltung', 'delete_projects', false),
        (p_company_id, 'buchhaltung', 'create_invoices', true),
        (p_company_id, 'buchhaltung', 'mark_payments', true),
        (p_company_id, 'buchhaltung', 'manage_users', false),
        (p_company_id, 'buchhaltung', 'manage_company', false),
        (p_company_id, 'buchhaltung', 'export_data', true)
    ON CONFLICT (company_id, role, permission_code) DO NOTHING;

    -- Verkäufer (projektbasiert, ohne Finanzen)
    INSERT INTO role_permissions (company_id, role, permission_code, allowed) VALUES
        (p_company_id, 'verkaeufer', 'menu_dashboard', true),
        (p_company_id, 'verkaeufer', 'menu_projects', true),
        (p_company_id, 'verkaeufer', 'menu_customers', true),
        (p_company_id, 'verkaeufer', 'menu_articles', true),
        (p_company_id, 'verkaeufer', 'menu_deliveries', true),
        (p_company_id, 'verkaeufer', 'menu_calendar', true),
        (p_company_id, 'verkaeufer', 'menu_complaints', true),
        (p_company_id, 'verkaeufer', 'menu_invoices', false),
        (p_company_id, 'verkaeufer', 'menu_statistics', false),
        (p_company_id, 'verkaeufer', 'menu_accounting', false),
        (p_company_id, 'verkaeufer', 'menu_settings', false),
        (p_company_id, 'verkaeufer', 'view_purchase_prices', false),
        (p_company_id, 'verkaeufer', 'edit_purchase_prices', false),
        (p_company_id, 'verkaeufer', 'view_margins', false),
        (p_company_id, 'verkaeufer', 'edit_projects', true),
        (p_company_id, 'verkaeufer', 'delete_projects', false),
        (p_company_id, 'verkaeufer', 'create_invoices', false),
        (p_company_id, 'verkaeufer', 'mark_payments', false),
        (p_company_id, 'verkaeufer', 'manage_users', false),
        (p_company_id, 'verkaeufer', 'manage_company', false),
        (p_company_id, 'verkaeufer', 'export_data', false)
    ON CONFLICT (company_id, role, permission_code) DO NOTHING;

    -- Monteur (minimal)
    INSERT INTO role_permissions (company_id, role, permission_code, allowed) VALUES
        (p_company_id, 'monteur', 'menu_dashboard', true),
        (p_company_id, 'monteur', 'menu_projects', true),
        (p_company_id, 'monteur', 'menu_customers', false),
        (p_company_id, 'monteur', 'menu_articles', false),
        (p_company_id, 'monteur', 'menu_deliveries', true),
        (p_company_id, 'monteur', 'menu_calendar', true),
        (p_company_id, 'monteur', 'menu_complaints', true),
        (p_company_id, 'monteur', 'menu_invoices', false),
        (p_company_id, 'monteur', 'menu_statistics', false),
        (p_company_id, 'monteur', 'menu_accounting', false),
        (p_company_id, 'monteur', 'menu_settings', false),
        (p_company_id, 'monteur', 'view_purchase_prices', false),
        (p_company_id, 'monteur', 'edit_purchase_prices', false),
        (p_company_id, 'monteur', 'view_margins', false),
        (p_company_id, 'monteur', 'edit_projects', true),
        (p_company_id, 'monteur', 'delete_projects', false),
        (p_company_id, 'monteur', 'create_invoices', false),
        (p_company_id, 'monteur', 'mark_payments', false),
        (p_company_id, 'monteur', 'manage_users', false),
        (p_company_id, 'monteur', 'manage_company', false),
        (p_company_id, 'monteur', 'export_data', false)
    ON CONFLICT (company_id, role, permission_code) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."seed_role_permissions_for_company"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_ticket_company_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT cm.company_id
    INTO NEW.company_id
    FROM projects p
    JOIN company_members cm
      ON cm.user_id = p.user_id
     AND cm.is_active = true
    WHERE p.id = NEW.project_id
    LIMIT 1;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id could not be resolved for ticket';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_ticket_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_seed_company_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    PERFORM seed_role_permissions_for_company(NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_seed_company_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_complaints_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_complaints_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_role"("p_member_id" "uuid", "p_role" "text", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_company_id UUID; v_target_user_id UUID;
BEGIN
  IF NOT can_manage_users() THEN RAISE EXCEPTION 'Keine Berechtigung'; END IF;
  SELECT company_id, user_id INTO v_company_id, v_target_user_id FROM company_members WHERE id = p_member_id;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Nicht gefunden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = v_company_id AND user_id = auth.uid() AND is_active = TRUE) THEN RAISE EXCEPTION 'Nicht Mitglied'; END IF;
  IF v_target_user_id = auth.uid() AND p_role != 'owner' THEN
    IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = v_company_id AND role = 'owner' AND user_id != auth.uid() AND is_active = TRUE) THEN
      RAISE EXCEPTION 'Mindestens ein Owner erforderlich';
    END IF;
  END IF;
  UPDATE company_members SET role = p_role, is_active = p_is_active, updated_at = NOW() WHERE id = p_member_id;
END;
$$;


ALTER FUNCTION "public"."update_member_role"("p_member_id" "uuid", "p_role" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_orders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_planning_appointments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_planning_appointments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_appliances_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_appliances_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE projects
  SET
    net_amount = COALESCE((
      SELECT SUM(net_total) FROM invoice_items
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    tax_amount = COALESCE((
      SELECT SUM(tax_amount) FROM invoice_items
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    total_amount = COALESCE((
      SELECT SUM(gross_total) FROM invoice_items
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_project_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_supplier_invoices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'auth', 'storage', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_supplier_invoices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_role_permission"("p_company_id" "uuid", "p_role" "text", "p_permission_code" "text", "p_allowed" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_temp', 'public', 'auth'
    AS $$
DECLARE v_can_manage BOOLEAN; v_user_company_id UUID; BEGIN
  v_can_manage := can_manage_users();
  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Keine Berechtigung zum Verwalten von Berechtigungen';
  END IF;

  SELECT company_id INTO v_user_company_id
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = true AND company_id = p_company_id
  LIMIT 1;

  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'Keine Berechtigung für diese Firma';
  END IF;

  INSERT INTO role_permissions (company_id, role, permission_code, allowed)
  VALUES (p_company_id, p_role, p_permission_code, p_allowed)
  ON CONFLICT (company_id, role, permission_code)
  DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = NOW();
END; $$;


ALTER FUNCTION "public"."upsert_role_permission"("p_company_id" "uuid", "p_role" "text", "p_permission_code" "text", "p_allowed" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."write_audit_log"("event_type" "text", "actor_id" "uuid", "resource" "text", "details" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_logs (event_type, actor_id, resource, details)
  VALUES (event_type, actor_id, resource, details);
END;
$$;


ALTER FUNCTION "public"."write_audit_log"("event_type" "text", "actor_id" "uuid", "resource" "text", "details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';



CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "phone" "text",
    "date" "date" NOT NULL,
    "time" time without time zone,
    "notes" "text",
    "type" "public"."appointment_type" DEFAULT 'Consultation'::"public"."appointment_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "sku" "text" NOT NULL,
    "manufacturer" "text",
    "model_number" "text",
    "category" "public"."article_category" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "default_purchase_price" numeric(10,2) NOT NULL,
    "default_sale_price" numeric(10,2) NOT NULL,
    "tax_rate" "public"."tax_rate" DEFAULT '20'::"public"."tax_rate" NOT NULL,
    "unit" "public"."unit_type" DEFAULT 'Stk'::"public"."unit_type" NOT NULL,
    "in_stock" boolean DEFAULT true,
    "stock_quantity" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"german"'::"regconfig", ((((((COALESCE("sku", ''::"text") || ' '::"text") || COALESCE("name", ''::"text")) || ' '::"text") || COALESCE("manufacturer", ''::"text")) || ' '::"text") || COALESCE("model_number", ''::"text")))) STORED
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "changes" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "request_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."audit_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "bank_name" "text" NOT NULL,
    "account_holder" "text" NOT NULL,
    "iban" "text" NOT NULL,
    "bic" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."bank_accounts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "function_calls" "jsonb",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'model'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "role" "public"."company_role_new" NOT NULL,
    CONSTRAINT "company_members_role_check" CHECK (("role" = ANY (ARRAY['geschaeftsfuehrer'::"public"."company_role_new", 'administration'::"public"."company_role_new", 'buchhaltung'::"public"."company_role_new", 'verkaeufer'::"public"."company_role_new", 'monteur'::"public"."company_role_new"])))
);

ALTER TABLE ONLY "public"."company_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_members"."role" IS 'Rolle des Firmenmitglieds: geschaeftsfuehrer, administration, buchhaltung, verkaeufer, monteur';



CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "company_name" "text" NOT NULL,
    "legal_form" "text",
    "street" "text",
    "house_number" "text",
    "postal_code" "text",
    "city" "text",
    "country" "text" DEFAULT 'Österreich'::"text",
    "phone" "text",
    "fax" "text",
    "email" "text",
    "website" "text",
    "uid" "text",
    "company_register_number" "text",
    "court" "text",
    "tax_number" "text",
    "logo_url" "text",
    "logo_base64" "text",
    "invoice_prefix" "text" DEFAULT 'R-'::"text",
    "offer_prefix" "text" DEFAULT 'A-'::"text",
    "default_payment_terms" integer DEFAULT 14,
    "default_tax_rate" integer DEFAULT 20,
    "invoice_footer_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_terms_options" "jsonb" DEFAULT '[0, 7, 14, 30, 60]'::"jsonb",
    "display_name" "text",
    "agb_text" "text",
    "order_footer_templates" "jsonb" DEFAULT '[]'::"jsonb",
    "next_invoice_number" integer DEFAULT 1
);

ALTER TABLE ONLY "public"."company_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_settings"."display_name" IS 'Anzeigename für die UI (z.B. "Designstudio BaLeah"), unabhängig vom Firmennamen';



CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "description" "text" NOT NULL,
    "status" "public"."complaint_status" DEFAULT 'Open'::"public"."complaint_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "company_id" "uuid" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "affected_item_ids" "uuid"[],
    "supplier_id" "uuid",
    "supplier_name" "text",
    "original_order_number" "text",
    "complaint_order_number" "text",
    "reported_at" timestamp with time zone,
    "email_sent_at" timestamp with time zone,
    "email_content" "text",
    "ab_confirmed_at" timestamp with time zone,
    "ab_document_url" "text",
    "delivered_at" timestamp with time zone,
    "delivery_note_id" "uuid",
    "installation_appointment_id" "uuid",
    "installed_at" timestamp with time zone,
    "internal_notes" "text",
    "supplier_notes" "text",
    "customer_notes" "text",
    "created_by_user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source_ticket_id" "uuid",
    CONSTRAINT "complaints_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"])))
);

ALTER TABLE ONLY "public"."complaints" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaints" OWNER TO "postgres";


COMMENT ON TABLE "public"."complaints" IS 'Reklamations-Management: Professionelle Verwaltung von Mängeln und Reklamationen';



COMMENT ON COLUMN "public"."complaints"."status" IS 'Workflow-Status: draft, reported, ab_confirmed, delivered, installed, resolved';



COMMENT ON COLUMN "public"."complaints"."priority" IS 'Priorität: low, medium, high, urgent';



COMMENT ON COLUMN "public"."complaints"."affected_item_ids" IS 'Array von invoice_items IDs die von der Reklamation betroffen sind';



COMMENT ON COLUMN "public"."complaints"."original_order_number" IS 'AB-Nummer der ursprünglichen Bestellung';



COMMENT ON COLUMN "public"."complaints"."complaint_order_number" IS 'AB-Nummer der Reklamations-Bestellung';



COMMENT ON COLUMN "public"."complaints"."delivery_note_id" IS 'Verknüpfung zu Lieferanten-Lieferschein';



COMMENT ON COLUMN "public"."complaints"."installation_appointment_id" IS 'Verknüpfung zu Nachmontage-Termin';



COMMENT ON COLUMN "public"."complaints"."updated_at" IS 'Timestamp when the complaint was last updated. Automatically maintained by trigger.';



CREATE TABLE IF NOT EXISTS "public"."customer_delivery_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "delivery_note_number" "text" NOT NULL,
    "delivery_date" "date" NOT NULL,
    "delivery_address" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "customer_signature" "text",
    "customer_signature_date" "date",
    "signed_by" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "items" "jsonb",
    CONSTRAINT "customer_delivery_notes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'delivered'::"text", 'signed'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."customer_delivery_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "salutation" "public"."salutation_type",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "company_name" "text",
    "street" "text" NOT NULL,
    "house_number" "text",
    "postal_code" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" DEFAULT 'Österreich'::"text",
    "phone" "text" NOT NULL,
    "mobile" "text",
    "email" "text" NOT NULL,
    "alternative_email" "text",
    "tax_id" "text",
    "payment_terms" integer DEFAULT 14,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"german"'::"regconfig", ((((((((COALESCE("first_name", ''::"text") || ' '::"text") || COALESCE("last_name", ''::"text")) || ' '::"text") || COALESCE("company_name", ''::"text")) || ' '::"text") || COALESCE("email", ''::"text")) || ' '::"text") || COALESCE("phone", ''::"text")))) STORED
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_note_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "delivery_note_id" "uuid" NOT NULL,
    "position_number" integer,
    "description" "text" NOT NULL,
    "model_number" "text",
    "manufacturer" "text",
    "quantity_ordered" numeric(10,2) NOT NULL,
    "quantity_received" numeric(10,2) NOT NULL,
    "unit" "text" DEFAULT 'Stk'::"text",
    "matched_project_item_id" "uuid",
    "ai_matched" boolean DEFAULT false,
    "ai_confidence" numeric(3,2),
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "delivery_note_items_ai_confidence_check" CHECK ((("ai_confidence" >= (0)::numeric) AND ("ai_confidence" <= (1)::numeric))),
    CONSTRAINT "delivery_note_items_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'verified'::"text", 'booked'::"text"])))
);


ALTER TABLE "public"."delivery_note_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supplier_name" "text" NOT NULL,
    "supplier_delivery_note_number" "text" NOT NULL,
    "delivery_date" "date" NOT NULL,
    "received_date" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "ai_matched" boolean DEFAULT false,
    "ai_confidence" numeric(3,2),
    "matched_project_id" "uuid",
    "matched_by_user_id" "uuid",
    "matched_at" timestamp without time zone,
    "document_url" "text",
    "raw_text" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "delivery_notes_ai_confidence_check" CHECK ((("ai_confidence" >= (0)::numeric) AND ("ai_confidence" <= (1)::numeric))),
    CONSTRAINT "delivery_notes_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'matched'::"text", 'processed'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."delivery_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" bigint,
    "type" "public"."document_type",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "department" "text",
    "is_active" boolean DEFAULT true,
    "commission_rate" numeric(5,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "role" "public"."company_role_new" NOT NULL
);

ALTER TABLE ONLY "public"."employees" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."user_id" IS 'Verknüpfung zum Benutzer-Konto (user_profiles.id)';



COMMENT ON COLUMN "public"."employees"."role" IS 'Rolle des Mitarbeiters: geschaeftsfuehrer, administration, buchhaltung, verkaeufer, monteur';



CREATE TABLE IF NOT EXISTS "public"."goods_receipt_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "goods_receipt_id" "uuid" NOT NULL,
    "project_item_id" "uuid" NOT NULL,
    "delivery_note_item_id" "uuid",
    "quantity_received" numeric(10,2) NOT NULL,
    "quantity_expected" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "goods_receipt_items_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'verified'::"text", 'damaged'::"text", 'missing'::"text"])))
);


ALTER TABLE "public"."goods_receipt_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goods_receipts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "delivery_note_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "receipt_date" timestamp without time zone DEFAULT "now"(),
    "receipt_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "goods_receipts_receipt_type_check" CHECK (("receipt_type" = ANY (ARRAY['partial'::"text", 'complete'::"text"]))),
    CONSTRAINT "goods_receipts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'booked'::"text"])))
);


ALTER TABLE "public"."goods_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid",
    "article_id" "uuid",
    "position" integer NOT NULL,
    "description" "text" NOT NULL,
    "model_number" "text",
    "manufacturer" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "quantity" numeric(10,3) NOT NULL,
    "unit" "public"."unit_type" DEFAULT 'Stk'::"public"."unit_type" NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "purchase_price_per_unit" numeric(10,2),
    "tax_rate" "text" DEFAULT '20'::"public"."tax_rate" NOT NULL,
    "net_total" numeric(10,2) NOT NULL,
    "tax_amount" numeric(10,2) NOT NULL,
    "gross_total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" "text" DEFAULT 'not_ordered'::"text",
    "expected_delivery_date" "date",
    "actual_delivery_date" "date",
    "quantity_ordered" numeric(10,2),
    "quantity_delivered" numeric(10,2) DEFAULT 0,
    "gross_price_per_unit" numeric(10,2),
    "show_in_portal" boolean DEFAULT false,
    "serial_number" "text",
    "installation_date" "date",
    "warranty_until" "date",
    "manufacturer_support_url" "text",
    "manufacturer_support_phone" "text",
    "manufacturer_support_email" "text",
    "appliance_category" "text",
    CONSTRAINT "invoice_items_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['not_ordered'::"text", 'ordered'::"text", 'partially_delivered'::"text", 'delivered'::"text", 'missing'::"text"])))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "net_amount" numeric(12,2),
    "tax_amount" numeric(12,2),
    "tax_rate" numeric(5,2) DEFAULT 20,
    "invoice_date" "date" NOT NULL,
    "due_date" "date",
    "is_paid" boolean DEFAULT false,
    "paid_date" "date",
    "description" "text",
    "notes" "text",
    "schedule_type" "text",
    "reminders" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoices_schedule_type_check" CHECK (("schedule_type" = ANY (ARRAY['first'::"text", 'second'::"text", 'manual'::"text"]))),
    CONSTRAINT "invoices_type_check" CHECK (("type" = ANY (ARRAY['partial'::"text", 'final'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Zentrale Rechnungstabelle für Anzahlungen (partial) und Schlussrechnungen (final)';



COMMENT ON COLUMN "public"."invoices"."type" IS 'partial = Anzahlung, final = Schlussrechnung';



COMMENT ON COLUMN "public"."invoices"."schedule_type" IS 'first = 1. Anzahlung, second = 2. Anzahlung, manual = manuell erstellt';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "order_number" "text" NOT NULL,
    "order_date" "date",
    "status" "text" DEFAULT 'draft'::"text",
    "footer_text" "text",
    "agb_snapshot" "text",
    "sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'confirmed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Auftragstabelle mit Status-Tracking und Workflow-Unterstützung';



COMMENT ON COLUMN "public"."orders"."status" IS 'draft = Entwurf, sent = Versendet, confirmed = Vom Kunden bestätigt, cancelled = Storniert';



COMMENT ON COLUMN "public"."orders"."agb_snapshot" IS 'AGB-Text zum Zeitpunkt der Auftragserstellung für rechtliche Nachvollziehbarkeit';



CREATE TABLE IF NOT EXISTS "public"."pending_invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid",
    "expires_at" timestamp without time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "role" "public"."company_role_new"
);

ALTER TABLE ONLY "public"."pending_invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'general'::"text",
    "sort_order" integer DEFAULT 100
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planning_appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "phone" "text",
    "date" "date" NOT NULL,
    "time" time without time zone,
    "type" "text" NOT NULL,
    "notes" "text",
    "assigned_user_id" "uuid",
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "planning_appointments_type_check" CHECK (("type" = ANY (ARRAY['Consultation'::"text", 'FirstMeeting'::"text", 'Measurement'::"text", 'Installation'::"text", 'Service'::"text", 'ReMeasurement'::"text", 'Delivery'::"text", 'Other'::"text", 'Planung'::"text"])))
);

ALTER TABLE ONLY "public"."planning_appointments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."processed_webhooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."processed_webhooks" IS 'Stores processed Cal.com webhook event IDs to prevent duplicate processing';



CREATE TABLE IF NOT EXISTS "public"."project_appliances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "manufacturer" "text" NOT NULL,
    "model" "text" NOT NULL,
    "category" "text" NOT NULL,
    "serial_number" "text",
    "purchase_date" "date",
    "installation_date" "date",
    "warranty_until" "date",
    "manufacturer_support_url" "text",
    "manufacturer_support_phone" "text",
    "manufacturer_support_email" "text",
    "article_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."project_appliances" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_appliances" IS 'Installed appliances per project (Gerätepark)';



COMMENT ON COLUMN "public"."project_appliances"."category" IS 'Categories: Backofen, Geschirrspüler, Kühlschrank, Gefrierschrank, Kühl-Gefrier-Kombi, Dunstabzug, Kochfeld, Mikrowelle, Kaffeevollautomat, Wärmeschublade, Weinkühlschrank, Waschmaschine, Trockner, Spüle, Armatur, Sonstiges';



COMMENT ON COLUMN "public"."project_appliances"."serial_number" IS 'E-Nummer / Seriennummer - wird nach Montage eingetragen';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "order_number" "text" NOT NULL,
    "offer_number" "text",
    "invoice_number" "text",
    "contract_number" "text",
    "status" "public"."project_status" DEFAULT 'Planung'::"public"."project_status" NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0,
    "net_amount" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "deposit_amount" numeric(10,2) DEFAULT 0,
    "is_deposit_paid" boolean DEFAULT false,
    "is_final_paid" boolean DEFAULT false,
    "offer_date" "date",
    "measurement_date" "date",
    "is_measured" boolean DEFAULT false,
    "order_date" "date",
    "is_ordered" boolean DEFAULT false,
    "delivery_date" "date",
    "installation_date" "date",
    "is_installation_assigned" boolean DEFAULT false,
    "completion_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "partial_payments" "jsonb" DEFAULT '[]'::"jsonb",
    "final_invoice" "jsonb",
    "customer_address" "text",
    "customer_phone" "text",
    "customer_email" "text",
    "assigned_employee_id" "uuid",
    "salesperson_id" "uuid",
    "salesperson_name" "text",
    "complaints" "jsonb" DEFAULT '[]'::"jsonb",
    "delivery_status" "text" DEFAULT 'not_ordered'::"text",
    "all_items_delivered" boolean DEFAULT false,
    "ready_for_assembly_date" "date",
    "documents" "jsonb" DEFAULT '[]'::"jsonb",
    "is_delivered" boolean DEFAULT false,
    "is_completed" boolean DEFAULT false,
    "delivery_note_number" "text",
    "customer_signature" "text",
    "customer_signature_date" "date",
    "measurement_time" "text",
    "delivery_time" "text",
    "installation_time" "text",
    "deleted_at" timestamp with time zone,
    "payment_schedule" "jsonb",
    "second_payment_created" boolean DEFAULT false,
    "delivery_type" "text",
    "order_footer_text" "text",
    "access_code" "text",
    CONSTRAINT "projects_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['not_ordered'::"text", 'partially_ordered'::"text", 'fully_ordered'::"text", 'partially_delivered'::"text", 'fully_delivered'::"text", 'ready_for_assembly'::"text"]))),
    CONSTRAINT "projects_delivery_type_check" CHECK (("delivery_type" = ANY (ARRAY['delivery'::"text", 'pickup'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."partial_payments" IS 'JSONB Array von PartialPayment Objekten. Jedes PartialPayment kann ein "reminders" Array enthalten mit Reminder-Objekten: {id, type, sentAt, sentByUserId, emailSent, pdfGenerated, notes}';



COMMENT ON COLUMN "public"."projects"."final_invoice" IS 'JSONB Objekt mit finalInvoice Daten. Kann "dueDate", "reminders" Array und "overdueDays" enthalten.';



COMMENT ON COLUMN "public"."projects"."documents" IS 'Array von Projekt-Dokumenten (Base64-encoded)';



COMMENT ON COLUMN "public"."projects"."deleted_at" IS 'Soft delete timestamp. NULL means project is active, non-NULL means deleted.';



COMMENT ON COLUMN "public"."projects"."payment_schedule" IS 'Zahlungsschema-Konfiguration: {firstPercent, secondPercent, finalPercent, secondDueDaysBeforeDelivery, autoCreateFirst, autoCreateSecond}';



COMMENT ON COLUMN "public"."projects"."second_payment_created" IS 'Flag: wurde die zweite Anzahlung bereits automatisch erstellt?';



COMMENT ON COLUMN "public"."projects"."delivery_type" IS 'Type of delivery: delivery (Lieferung und Montage) or pickup (Abholer)';



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "permission_code" "text" NOT NULL,
    "allowed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "role_permissions_role_check" CHECK (("role" = ANY (ARRAY['geschaeftsfuehrer'::"text", 'administration'::"text", 'buchhaltung'::"text", 'verkaeufer'::"text", 'monteur'::"text"])))
);

ALTER TABLE ONLY "public"."role_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supplier_name" "text" NOT NULL,
    "supplier_uid" "text",
    "supplier_address" "text",
    "invoice_number" "text" NOT NULL,
    "invoice_date" "date" NOT NULL,
    "due_date" "date",
    "net_amount" numeric(12,2) NOT NULL,
    "tax_amount" numeric(12,2) NOT NULL,
    "gross_amount" numeric(12,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 20,
    "is_paid" boolean DEFAULT false,
    "paid_date" "date",
    "payment_method" "text",
    "category" "text" DEFAULT 'material'::"text" NOT NULL,
    "project_id" "uuid",
    "document_url" "text",
    "document_name" "text",
    "notes" "text",
    "datev_account" "text",
    "cost_center" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "supplier_invoices_category_check" CHECK (("category" = ANY (ARRAY['material'::"text", 'subcontractor'::"text", 'tools'::"text", 'rent'::"text", 'insurance'::"text", 'vehicle'::"text", 'office'::"text", 'marketing'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."supplier_invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."supplier_invoices" IS 'Eingangsrechnungen von Lieferanten für Buchhaltung und Vorsteuerabzug';



COMMENT ON COLUMN "public"."supplier_invoices"."supplier_uid" IS 'UID-Nummer des Lieferanten - wichtig für Vorsteuerabzug bei EU-Geschäften';



COMMENT ON COLUMN "public"."supplier_invoices"."tax_amount" IS 'Vorsteuer - kann von der Umsatzsteuer abgezogen werden';



COMMENT ON COLUMN "public"."supplier_invoices"."category" IS 'Kategorie für Buchhaltungszwecke: material=Wareneinkauf, subcontractor=Subunternehmer, tools=Werkzeuge, etc.';



COMMENT ON COLUMN "public"."supplier_invoices"."datev_account" IS 'DATEV Sachkonto (SKR03/04) für automatischen Export';



CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "message" "text" NOT NULL,
    "file_url" "text",
    "is_customer" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_type" "text" DEFAULT 'customer'::"text",
    "employee_id" "uuid",
    CONSTRAINT "ticket_messages_author_check" CHECK (((("is_customer" = true) AND ("author_id" IS NOT NULL) AND ("employee_id" IS NULL)) OR (("is_customer" = false) AND ("employee_id" IS NOT NULL) AND ("author_id" IS NULL))))
);

ALTER TABLE ONLY "public"."ticket_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'OFFEN'::"text" NOT NULL,
    "type" "text" DEFAULT 'KUNDENANFRAGE'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "assigned_to" "uuid"
);

ALTER TABLE ONLY "public"."tickets" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_code" "text" NOT NULL,
    "allowed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'employee'::"public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_user_id_key" UNIQUE ("company_id", "user_id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_delivery_notes"
    ADD CONSTRAINT "customer_delivery_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_note_items"
    ADD CONSTRAINT "delivery_note_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_notes"
    ADD CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goods_receipt_items"
    ADD CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_invoice_number_key" UNIQUE ("user_id", "invoice_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_order_number_key" UNIQUE ("user_id", "order_number");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_company_id_email_key" UNIQUE ("company_id", "email");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_webhooks"
    ADD CONSTRAINT "processed_webhooks_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."processed_webhooks"
    ADD CONSTRAINT "processed_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_appliances"
    ADD CONSTRAINT "project_appliances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("company_id", "role", "permission_code");



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_company_id_user_id_permission_code_key" UNIQUE ("company_id", "user_id", "permission_code");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "complaints_source_ticket_id_idx" ON "public"."complaints" USING "btree" ("source_ticket_id");



CREATE INDEX "documents_uploaded_by_idx" ON "public"."documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_appointments_customer_id" ON "public"."appointments" USING "btree" ("customer_id");



CREATE INDEX "idx_appointments_date" ON "public"."appointments" USING "btree" ("date");



CREATE INDEX "idx_appointments_user_id" ON "public"."appointments" USING "btree" ("user_id");



CREATE INDEX "idx_articles_active" ON "public"."articles" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_articles_category" ON "public"."articles" USING "btree" ("category");



CREATE INDEX "idx_articles_search" ON "public"."articles" USING "gin" ("search_vector");



CREATE INDEX "idx_articles_sku" ON "public"."articles" USING "btree" ("sku");



CREATE INDEX "idx_articles_user_id" ON "public"."articles" USING "btree" ("user_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_company_id" ON "public"."audit_logs" USING "btree" ("company_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_entity_id" ON "public"."audit_logs" USING "btree" ("entity_id");



CREATE INDEX "idx_audit_logs_entity_type" ON "public"."audit_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_bank_accounts_company_id" ON "public"."bank_accounts" USING "btree" ("company_id");



CREATE INDEX "idx_chat_messages_created_at" ON "public"."chat_messages" USING "btree" ("created_at");



CREATE INDEX "idx_chat_messages_session_id" ON "public"."chat_messages" USING "btree" ("session_id");



CREATE INDEX "idx_chat_sessions_updated_at" ON "public"."chat_sessions" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_chat_sessions_user_id" ON "public"."chat_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_company_members_active" ON "public"."company_members" USING "btree" ("is_active");



CREATE INDEX "idx_company_members_company_id" ON "public"."company_members" USING "btree" ("company_id");



CREATE INDEX "idx_company_members_user_active" ON "public"."company_members" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_company_members_user_company" ON "public"."company_members" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_company_members_user_id" ON "public"."company_members" USING "btree" ("user_id");



CREATE INDEX "idx_company_settings_user_id" ON "public"."company_settings" USING "btree" ("user_id");



CREATE INDEX "idx_complaints_affected_items" ON "public"."complaints" USING "gin" ("affected_item_ids");



CREATE INDEX "idx_complaints_company_id" ON "public"."complaints" USING "btree" ("company_id");



CREATE INDEX "idx_complaints_created_at" ON "public"."complaints" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_complaints_created_by_user_id" ON "public"."complaints" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_complaints_delivery_note_id" ON "public"."complaints" USING "btree" ("delivery_note_id");



CREATE INDEX "idx_complaints_installation_appointment_id" ON "public"."complaints" USING "btree" ("installation_appointment_id");



CREATE INDEX "idx_complaints_priority" ON "public"."complaints" USING "btree" ("priority");



CREATE INDEX "idx_complaints_project_id" ON "public"."complaints" USING "btree" ("project_id");



CREATE INDEX "idx_complaints_status" ON "public"."complaints" USING "btree" ("status");



CREATE INDEX "idx_complaints_supplier_name" ON "public"."complaints" USING "btree" ("supplier_name") WHERE ("supplier_name" IS NOT NULL);



CREATE INDEX "idx_complaints_user_id" ON "public"."complaints" USING "btree" ("user_id");



CREATE INDEX "idx_customer_delivery_notes_project_id" ON "public"."customer_delivery_notes" USING "btree" ("project_id");



CREATE INDEX "idx_customer_delivery_notes_status" ON "public"."customer_delivery_notes" USING "btree" ("status");



CREATE INDEX "idx_customer_delivery_notes_user_id" ON "public"."customer_delivery_notes" USING "btree" ("user_id");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_customers_search" ON "public"."customers" USING "gin" ("search_vector");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "idx_delivery_note_items_delivery_note" ON "public"."delivery_note_items" USING "btree" ("delivery_note_id");



CREATE INDEX "idx_delivery_note_items_project_item" ON "public"."delivery_note_items" USING "btree" ("matched_project_item_id");



CREATE INDEX "idx_delivery_notes_matched_by_user_id" ON "public"."delivery_notes" USING "btree" ("matched_by_user_id");



CREATE INDEX "idx_delivery_notes_matched_project" ON "public"."delivery_notes" USING "btree" ("matched_project_id");



CREATE INDEX "idx_delivery_notes_status" ON "public"."delivery_notes" USING "btree" ("status");



CREATE INDEX "idx_delivery_notes_supplier" ON "public"."delivery_notes" USING "btree" ("supplier_name");



CREATE INDEX "idx_delivery_notes_user_id" ON "public"."delivery_notes" USING "btree" ("user_id");



CREATE INDEX "idx_documents_project_id" ON "public"."documents" USING "btree" ("project_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_documents_uploaded_by" ON "public"."documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_documents_user_id" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_employees_company_id" ON "public"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_email" ON "public"."employees" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_goods_receipt_items_delivery_note_item_id" ON "public"."goods_receipt_items" USING "btree" ("delivery_note_item_id");



CREATE INDEX "idx_goods_receipt_items_project_item" ON "public"."goods_receipt_items" USING "btree" ("project_item_id");



CREATE INDEX "idx_goods_receipt_items_receipt" ON "public"."goods_receipt_items" USING "btree" ("goods_receipt_id");



CREATE INDEX "idx_goods_receipts_delivery_note_id" ON "public"."goods_receipts" USING "btree" ("delivery_note_id");



CREATE INDEX "idx_goods_receipts_project" ON "public"."goods_receipts" USING "btree" ("project_id");



CREATE INDEX "idx_goods_receipts_user_id" ON "public"."goods_receipts" USING "btree" ("user_id");



CREATE INDEX "idx_invoice_items_article_id" ON "public"."invoice_items" USING "btree" ("article_id");



CREATE INDEX "idx_invoice_items_delivery_status" ON "public"."invoice_items" USING "btree" ("delivery_status");



CREATE INDEX "idx_invoice_items_gross_price" ON "public"."invoice_items" USING "btree" ("gross_price_per_unit");



CREATE INDEX "idx_invoice_items_position" ON "public"."invoice_items" USING "btree" ("project_id", "position");



CREATE INDEX "idx_invoice_items_project_id" ON "public"."invoice_items" USING "btree" ("project_id");



CREATE INDEX "idx_invoice_items_show_in_portal" ON "public"."invoice_items" USING "btree" ("show_in_portal");



CREATE INDEX "idx_invoices_date" ON "public"."invoices" USING "btree" ("invoice_date");



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date") WHERE ("is_paid" = false);



CREATE INDEX "idx_invoices_is_paid" ON "public"."invoices" USING "btree" ("is_paid");



CREATE INDEX "idx_invoices_project" ON "public"."invoices" USING "btree" ("project_id");



CREATE INDEX "idx_invoices_project_id" ON "public"."invoices" USING "btree" ("project_id");



CREATE INDEX "idx_invoices_type" ON "public"."invoices" USING "btree" ("type");



CREATE INDEX "idx_invoices_user" ON "public"."invoices" USING "btree" ("user_id");



CREATE INDEX "idx_invoices_user_id" ON "public"."invoices" USING "btree" ("user_id");



CREATE INDEX "idx_invoices_user_id_invoice_date" ON "public"."invoices" USING "btree" ("user_id", "invoice_date");



CREATE INDEX "idx_orders_date" ON "public"."orders" USING "btree" ("order_date");



CREATE INDEX "idx_orders_project" ON "public"."orders" USING "btree" ("project_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_pending_invites_company_id" ON "public"."pending_invites" USING "btree" ("company_id");



CREATE INDEX "idx_pending_invites_email" ON "public"."pending_invites" USING "btree" ("lower"("email"));



CREATE INDEX "idx_pending_invites_invited_by" ON "public"."pending_invites" USING "btree" ("invited_by");



CREATE INDEX "idx_planning_appointments_assigned_user_id" ON "public"."planning_appointments" USING "btree" ("assigned_user_id");



CREATE INDEX "idx_planning_appointments_company_id" ON "public"."planning_appointments" USING "btree" ("company_id");



CREATE INDEX "idx_planning_appointments_customer_id" ON "public"."planning_appointments" USING "btree" ("customer_id");



CREATE INDEX "idx_planning_appointments_date" ON "public"."planning_appointments" USING "btree" ("date");



CREATE INDEX "idx_planning_appointments_project_id" ON "public"."planning_appointments" USING "btree" ("project_id");



CREATE INDEX "idx_planning_appointments_user_id" ON "public"."planning_appointments" USING "btree" ("user_id");



CREATE INDEX "idx_processed_webhooks_event_id" ON "public"."processed_webhooks" USING "btree" ("event_id");



CREATE INDEX "idx_project_appliances_company_id" ON "public"."project_appliances" USING "btree" ("company_id");



CREATE INDEX "idx_project_appliances_project_id" ON "public"."project_appliances" USING "btree" ("project_id");



CREATE INDEX "idx_projects_assigned_employee_id" ON "public"."projects" USING "btree" ("assigned_employee_id");



CREATE INDEX "idx_projects_customer_id" ON "public"."projects" USING "btree" ("customer_id");



CREATE INDEX "idx_projects_deleted_at" ON "public"."projects" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_delivery_status" ON "public"."projects" USING "btree" ("delivery_status");



CREATE INDEX "idx_projects_documents" ON "public"."projects" USING "gin" ("documents");



CREATE INDEX "idx_projects_final_invoice_due_date" ON "public"."projects" USING "gin" ("final_invoice");



CREATE INDEX "idx_projects_order_number" ON "public"."projects" USING "btree" ("order_number");



CREATE INDEX "idx_projects_partial_payments_due_date" ON "public"."projects" USING "gin" ("partial_payments");



CREATE INDEX "idx_projects_payment_schedule" ON "public"."projects" USING "gin" ("payment_schedule");



CREATE INDEX "idx_projects_salesperson_id" ON "public"."projects" USING "btree" ("salesperson_id");



CREATE INDEX "idx_projects_second_payment_created" ON "public"."projects" USING "btree" ("second_payment_created") WHERE ("second_payment_created" = false);



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_projects_user_deleted" ON "public"."projects" USING "btree" ("user_id", "deleted_at");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "idx_role_permissions_company_id" ON "public"."role_permissions" USING "btree" ("company_id");



CREATE INDEX "idx_role_permissions_company_role" ON "public"."role_permissions" USING "btree" ("company_id", "role");



CREATE INDEX "idx_role_permissions_company_role_perm" ON "public"."role_permissions" USING "btree" ("company_id", "role", "permission_code", "allowed");



CREATE INDEX "idx_role_permissions_permission_code" ON "public"."role_permissions" USING "btree" ("permission_code");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role");



CREATE INDEX "idx_supplier_invoices_category" ON "public"."supplier_invoices" USING "btree" ("category");



CREATE INDEX "idx_supplier_invoices_date" ON "public"."supplier_invoices" USING "btree" ("invoice_date");



CREATE INDEX "idx_supplier_invoices_due_date" ON "public"."supplier_invoices" USING "btree" ("due_date") WHERE ("is_paid" = false);



CREATE INDEX "idx_supplier_invoices_is_paid" ON "public"."supplier_invoices" USING "btree" ("is_paid");



CREATE INDEX "idx_supplier_invoices_project" ON "public"."supplier_invoices" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_supplier_invoices_supplier" ON "public"."supplier_invoices" USING "btree" ("supplier_name");



CREATE INDEX "idx_supplier_invoices_user" ON "public"."supplier_invoices" USING "btree" ("user_id");



CREATE INDEX "idx_ticket_messages_author_id" ON "public"."ticket_messages" USING "btree" ("author_id");



CREATE INDEX "idx_ticket_messages_employee_id" ON "public"."ticket_messages" USING "btree" ("employee_id");



CREATE INDEX "idx_ticket_messages_ticket_id" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_company_id" ON "public"."tickets" USING "btree" ("company_id");



CREATE INDEX "idx_tickets_project_id" ON "public"."tickets" USING "btree" ("project_id");



CREATE INDEX "idx_user_permissions_company_id" ON "public"."user_permissions" USING "btree" ("company_id");



CREATE INDEX "idx_user_permissions_company_user" ON "public"."user_permissions" USING "btree" ("company_id", "user_id");



CREATE INDEX "idx_user_permissions_permission_code" ON "public"."user_permissions" USING "btree" ("permission_code");



CREATE INDEX "idx_user_permissions_user_id" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "invoice_items_portal_idx" ON "public"."invoice_items" USING "btree" ("project_id", "show_in_portal") WHERE ("show_in_portal" = true);



CREATE INDEX "project_appliances_category_idx" ON "public"."project_appliances" USING "btree" ("category");



CREATE INDEX "project_appliances_company_id_idx" ON "public"."project_appliances" USING "btree" ("company_id");



CREATE INDEX "project_appliances_project_id_idx" ON "public"."project_appliances" USING "btree" ("project_id");



CREATE UNIQUE INDEX "projects_access_code_key" ON "public"."projects" USING "btree" ("access_code");



CREATE INDEX "ticket_messages_author_id_idx" ON "public"."ticket_messages" USING "btree" ("author_id");



CREATE INDEX "ticket_messages_ticket_id_idx" ON "public"."ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "tickets_assigned_to_idx" ON "public"."tickets" USING "btree" ("assigned_to");



CREATE INDEX "tickets_company_id_idx" ON "public"."tickets" USING "btree" ("company_id");



CREATE INDEX "tickets_created_by_idx" ON "public"."tickets" USING "btree" ("created_by");



CREATE INDEX "tickets_project_id_idx" ON "public"."tickets" USING "btree" ("project_id");



CREATE INDEX "tickets_status_idx" ON "public"."tickets" USING "btree" ("status");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "after_company_insert_seed_permissions" AFTER INSERT ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_seed_company_permissions"();



CREATE OR REPLACE TRIGGER "calculate_totals" BEFORE INSERT OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_item_totals"();



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoices_updated_at"();



CREATE OR REPLACE TRIGGER "orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_orders_updated_at"();



CREATE OR REPLACE TRIGGER "project_appliances_updated_at_trigger" BEFORE UPDATE ON "public"."project_appliances" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_appliances_updated_at"();



CREATE OR REPLACE TRIGGER "supplier_invoices_updated_at" BEFORE UPDATE ON "public"."supplier_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_supplier_invoices_updated_at"();



CREATE OR REPLACE TRIGGER "tickets_set_company_id" BEFORE INSERT ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_ticket_company_id"();



CREATE OR REPLACE TRIGGER "trigger_auto_create_owner" AFTER INSERT ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_owner_membership"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_articles_updated_at" BEFORE UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_complaints_updated_at" BEFORE UPDATE ON "public"."complaints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_delivery_notes_updated_at" BEFORE UPDATE ON "public"."delivery_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goods_receipts_updated_at" BEFORE UPDATE ON "public"."goods_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoice_items_updated_at" BEFORE UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_planning_appointments_updated_at" BEFORE UPDATE ON "public"."planning_appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_planning_appointments_updated_at"();



CREATE OR REPLACE TRIGGER "update_project_totals_on_item_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_totals"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "chat_messages_session_id_fkey" ON "public"."chat_messages" IS 'Foreign key to chat_sessions with CASCADE DELETE - deleting a session automatically deletes all its messages';



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "public"."delivery_notes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_installation_appointment_id_fkey" FOREIGN KEY ("installation_appointment_id") REFERENCES "public"."planning_appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_source_ticket_id_fkey" FOREIGN KEY ("source_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_delivery_notes"
    ADD CONSTRAINT "customer_delivery_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_delivery_notes"
    ADD CONSTRAINT "customer_delivery_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_note_items"
    ADD CONSTRAINT "delivery_note_items_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "public"."delivery_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_note_items"
    ADD CONSTRAINT "delivery_note_items_matched_project_item_id_fkey" FOREIGN KEY ("matched_project_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_notes"
    ADD CONSTRAINT "delivery_notes_matched_by_user_id_fkey" FOREIGN KEY ("matched_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_notes"
    ADD CONSTRAINT "delivery_notes_matched_project_id_fkey" FOREIGN KEY ("matched_project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_notes"
    ADD CONSTRAINT "delivery_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goods_receipt_items"
    ADD CONSTRAINT "goods_receipt_items_delivery_note_item_id_fkey" FOREIGN KEY ("delivery_note_item_id") REFERENCES "public"."delivery_note_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goods_receipt_items"
    ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goods_receipt_items"
    ADD CONSTRAINT "goods_receipt_items_project_item_id_fkey" FOREIGN KEY ("project_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "public"."delivery_notes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planning_appointments"
    ADD CONSTRAINT "planning_appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_appliances"
    ADD CONSTRAINT "project_appliances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_appliances"
    ADD CONSTRAINT "project_appliances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can view pending invites" ON "public"."pending_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."company_members" "cm"
  WHERE (("cm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("cm"."is_active" = true) AND ("cm"."role" = ANY (ARRAY['geschaeftsfuehrer'::"public"."company_role_new", 'administration'::"public"."company_role_new"]))))));



CREATE POLICY "Enable read access for authenticated users" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can delete delivery note items for own notes" ON "public"."delivery_note_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."delivery_notes" "dn"
  WHERE (("dn"."id" = "delivery_note_items"."delivery_note_id") AND ("dn"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete goods receipt items for own receipts" ON "public"."goods_receipt_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."goods_receipts" "gr"
  WHERE (("gr"."id" = "goods_receipt_items"."goods_receipt_id") AND ("gr"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete own appointments" ON "public"."appointments" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own articles" ON "public"."articles" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own customer delivery notes" ON "public"."customer_delivery_notes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own customers" ON "public"."customers" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own delivery notes" ON "public"."delivery_notes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own goods receipts" ON "public"."goods_receipts" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own orders" ON "public"."orders" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own supplier invoices" ON "public"."supplier_invoices" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert chat messages in own sessions" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_sessions" "s"
  WHERE (("s"."id" = "chat_messages"."session_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert delivery note items for own notes" ON "public"."delivery_note_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."delivery_notes" "dn"
  WHERE (("dn"."id" = "delivery_note_items"."delivery_note_id") AND ("dn"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "documents"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert goods receipt items for own receipts" ON "public"."goods_receipt_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."goods_receipts" "gr"
  WHERE (("gr"."id" = "goods_receipt_items"."goods_receipt_id") AND ("gr"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert own appointments" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own articles" ON "public"."articles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own chat sessions" ON "public"."chat_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own customer delivery notes" ON "public"."customer_delivery_notes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own customers" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own delivery notes" ON "public"."delivery_notes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own goods receipts" ON "public"."goods_receipts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own orders" ON "public"."orders" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own supplier invoices" ON "public"."supplier_invoices" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage employees" ON "public"."employees" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."company_settings" "cs"
  WHERE (("cs"."id" = "employees"."company_id") AND ("cs"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_settings" "cs"
  WHERE (("cs"."id" = "employees"."company_id") AND ("cs"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can read own articles" ON "public"."articles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update delivery note items for own notes" ON "public"."delivery_note_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."delivery_notes" "dn"
  WHERE (("dn"."id" = "delivery_note_items"."delivery_note_id") AND ("dn"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."delivery_notes" "dn"
  WHERE (("dn"."id" = "delivery_note_items"."delivery_note_id") AND ("dn"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update goods receipt items for own receipts" ON "public"."goods_receipt_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."goods_receipts" "gr"
  WHERE (("gr"."id" = "goods_receipt_items"."goods_receipt_id") AND ("gr"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."goods_receipts" "gr"
  WHERE (("gr"."id" = "goods_receipt_items"."goods_receipt_id") AND ("gr"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update own appointments" ON "public"."appointments" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own articles" ON "public"."articles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own chat sessions" ON "public"."chat_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own customer delivery notes" ON "public"."customer_delivery_notes" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own customers" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own delivery notes" ON "public"."delivery_notes" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own goods receipts" ON "public"."goods_receipts" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own orders" ON "public"."orders" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own supplier invoices" ON "public"."supplier_invoices" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view chat messages in own sessions" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_sessions" "s"
  WHERE (("s"."id" = "chat_messages"."session_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view delivery note items for own notes" ON "public"."delivery_note_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."delivery_notes" "dn"
  WHERE (("dn"."id" = "delivery_note_items"."delivery_note_id") AND ("dn"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view documents" ON "public"."documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "documents"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view goods receipt items for own receipts" ON "public"."goods_receipt_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."goods_receipts" "gr"
  WHERE (("gr"."id" = "goods_receipt_items"."goods_receipt_id") AND ("gr"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own appointments" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own chat sessions" ON "public"."chat_sessions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own customer delivery notes" ON "public"."customer_delivery_notes" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own customers" ON "public"."customers" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own delivery notes" ON "public"."delivery_notes" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own goods receipts" ON "public"."goods_receipts" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own permissions" ON "public"."user_permissions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own supplier invoices" ON "public"."supplier_invoices" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_delete" ON "public"."audit_logs" FOR DELETE TO "authenticated" USING (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())));



CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())));



CREATE POLICY "audit_logs_select_consolidated" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("company_id" IN ( SELECT "cm"."company_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("cm"."is_active" = true)))) OR ("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"()))));



CREATE POLICY "audit_logs_update" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())));



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bank_accounts_manage_consolidated" ON "public"."bank_accounts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."company_settings" "cs"
  WHERE (("cs"."id" = "bank_accounts"."company_id") AND ("cs"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."company_settings" "cs"
  WHERE (("cs"."id" = "bank_accounts"."company_id") AND ("cs"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "bank_accounts_perm_consolidated" ON "public"."bank_accounts" TO "authenticated" USING (("public"."has_permission"('menu_accounting'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('menu_accounting'::"text") AND ("company_id" = "public"."get_current_company_id"())));



ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_members_all_consolidated" ON "public"."company_members" TO "authenticated" USING (("company_id" IN ( SELECT "public"."get_my_company_ids"() AS "get_my_company_ids"))) WITH CHECK (("company_id" IN ( SELECT "public"."get_my_company_ids"() AS "get_my_company_ids")));



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_settings_admin_all" ON "public"."company_settings" TO "authenticated" USING (("public"."has_permission"('manage_company'::"text") AND ("id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('manage_company'::"text") AND ("id" = "public"."get_current_company_id"())));



CREATE POLICY "company_settings_self_all" ON "public"."company_settings" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaints_member_all" ON "public"."complaints" TO "authenticated" USING ("public"."is_user_company_member"("company_id")) WITH CHECK ("public"."is_user_company_member"("company_id"));



CREATE POLICY "complaints_permission_all" ON "public"."complaints" TO "authenticated" USING (("public"."has_permission"('menu_complaints'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('menu_complaints'::"text") AND ("company_id" = "public"."get_current_company_id"())));



CREATE POLICY "customer_delete_own_documents" ON "public"."documents" FOR DELETE TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("type" = 'KUNDEN_DOKUMENT'::"public"."document_type") AND ("uploaded_by" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")));



ALTER TABLE "public"."customer_delivery_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_insert_documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("type" = 'KUNDEN_DOKUMENT'::"public"."document_type") AND ("uploaded_by" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")));



CREATE POLICY "customer_insert_ticket_messages" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("ticket_id" IN ( SELECT "t"."id"
   FROM ("public"."tickets" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("author_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid") AND ("is_customer" = true)));



CREATE POLICY "customer_insert_tickets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("type" = 'KUNDENANFRAGE'::"text") AND ("created_by" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")));



CREATE POLICY "customer_read_appliances" ON "public"."project_appliances" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")))));



CREATE POLICY "customer_read_appointments" ON "public"."planning_appointments" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")))));



CREATE POLICY "customer_read_documents" ON "public"."documents" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("type" = ANY (ARRAY['PLANE'::"public"."document_type", 'INSTALLATIONSPLANE'::"public"."document_type", 'KAUFVERTRAG'::"public"."document_type", 'RECHNUNGEN'::"public"."document_type", 'LIEFERSCHEINE'::"public"."document_type", 'AUSMESSBERICHT'::"public"."document_type", 'KUNDEN_DOKUMENT'::"public"."document_type"]))));



CREATE POLICY "customer_read_invoices" ON "public"."invoices" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")))));



CREATE POLICY "customer_read_portal_items" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid"))) AND ("show_in_portal" = true)));



CREATE POLICY "customer_read_projects" ON "public"."projects" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "customer_read_self" ON "public"."customers" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")));



CREATE POLICY "customer_read_ticket_messages" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("ticket_id" IN ( SELECT "t"."id"
   FROM ("public"."tickets" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")))));



CREATE POLICY "customer_read_tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = 'customer'::"text") AND ("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."customer_id" = (((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'customer_id'::"text"))::"uuid")))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_note_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_insert_ticket_messages" ON "public"."ticket_messages" FOR INSERT TO "authenticated" WITH CHECK (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("ticket_id" IN ( SELECT "t"."id"
   FROM "public"."tickets" "t"
  WHERE ("t"."company_id" IN ( SELECT "company_members"."company_id"
           FROM "public"."company_members"
          WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true)))))) AND ("is_customer" = false) AND ("employee_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "employee_manage_invoices" ON "public"."invoices" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "employee_read_ticket_messages" ON "public"."ticket_messages" FOR SELECT TO "authenticated" USING (((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("ticket_id" IN ( SELECT "t"."id"
   FROM "public"."tickets" "t"
  WHERE ("t"."company_id" IN ( SELECT "company_members"."company_id"
           FROM "public"."company_members"
          WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true))))))));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_manage_all" ON "public"."employees" TO "authenticated" USING (("public"."has_permission"('manage_company'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('manage_company'::"text") AND ("company_id" = "public"."get_current_company_id"())));



ALTER TABLE "public"."goods_receipt_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goods_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_items_owner_all" ON "public"."invoice_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "invoice_items"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "invoice_items"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pending_invites_manage_all" ON "public"."pending_invites" TO "authenticated" USING (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())));



ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planning_appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "planning_member_all" ON "public"."planning_appointments" TO "authenticated" USING ("public"."is_user_company_member"("company_id")) WITH CHECK ("public"."is_user_company_member"("company_id"));



CREATE POLICY "planning_permission_all" ON "public"."planning_appointments" TO "authenticated" USING (("public"."has_permission"('menu_calendar'::"text") AND ("company_id" = "public"."get_current_company_id"()))) WITH CHECK (("public"."has_permission"('menu_calendar'::"text") AND ("company_id" = "public"."get_current_company_id"())));



ALTER TABLE "public"."processed_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_appliances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_appliances_employee_all" ON "public"."project_appliances" TO "authenticated" USING ((((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("company_id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true)))))) WITH CHECK ((((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("company_id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true))))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_owner_all" ON "public"."projects" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_read_consolidated" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING ((("company_id" IN ( SELECT "cm"."company_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("cm"."is_active" = true)))) OR ("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())) OR ( SELECT "public"."is_current_user_geschaeftsfuehrer"() AS "is_current_user_geschaeftsfuehrer")));



CREATE POLICY "role_permissions_write_consolidated" ON "public"."role_permissions" TO "authenticated" USING ((("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())) OR ( SELECT "public"."is_current_user_geschaeftsfuehrer"() AS "is_current_user_geschaeftsfuehrer"))) WITH CHECK ((("public"."has_permission"('manage_users'::"text") AND ("company_id" = "public"."get_current_company_id"())) OR ( SELECT "public"."is_current_user_geschaeftsfuehrer"() AS "is_current_user_geschaeftsfuehrer")));



ALTER TABLE "public"."supplier_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_employee_all" ON "public"."tickets" TO "authenticated" USING ((((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("company_id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true)))))) WITH CHECK ((((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") IS DISTINCT FROM 'customer'::"text") AND ("company_id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("company_members"."is_active" = true))))));



ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."add_existing_user_to_company"("p_company_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_existing_user_to_company"("p_company_id" "uuid", "p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_role"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_is_geschaeftsfuehrer"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_owner_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_owner_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_invoice_item_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_invoice_item_totals"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_pending_invite"("p_company_id" "uuid", "p_email" "text", "p_role" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pending_invite"("p_company_id" "uuid", "p_email" "text", "p_role" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_pending_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_pending_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_members"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_current_company_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_effective_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_effective_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_permissions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_company_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_company_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_company_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_invites_for_company"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_invites_for_company"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("p_permission_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("p_permission_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_geschaeftsfuehrer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_geschaeftsfuehrer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_company_member"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_company_member"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_event"("p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_changes" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_request_id" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_changes" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_request_id" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_pending_invite"("p_user_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_pending_invite"("p_user_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_member"("p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_member"("p_member_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_permissions"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_permissions"("p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."seed_role_permissions_for_company"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."seed_role_permissions_for_company"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_role_permissions_for_company"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_ticket_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_ticket_company_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_seed_company_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_seed_company_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_seed_company_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_complaints_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_complaints_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_role"("p_member_id" "uuid", "p_role" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_role"("p_member_id" "uuid", "p_role" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_orders_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_planning_appointments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_planning_appointments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_appliances_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_appliances_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_supplier_invoices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_supplier_invoices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_role_permission"("p_company_id" "uuid", "p_role" "text", "p_permission_code" "text", "p_allowed" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_role_permission"("p_company_id" "uuid", "p_role" "text", "p_permission_code" "text", "p_allowed" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_role_permission"("p_company_id" "uuid", "p_role" "text", "p_permission_code" "text", "p_allowed" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."write_audit_log"("event_type" "text", "actor_id" "uuid", "resource" "text", "details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."write_audit_log"("event_type" "text", "actor_id" "uuid", "resource" "text", "details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."write_audit_log"("event_type" "text", "actor_id" "uuid", "resource" "text", "details" "jsonb") TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_client_states" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."customer_delivery_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_delivery_notes" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_note_items" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_note_items" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_notes" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."goods_receipt_items" TO "authenticated";
GRANT ALL ON TABLE "public"."goods_receipt_items" TO "service_role";



GRANT ALL ON TABLE "public"."goods_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."goods_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pending_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_invites" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."planning_appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."planning_appointments" TO "service_role";



GRANT ALL ON TABLE "public"."processed_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."project_appliances" TO "authenticated";
GRANT ALL ON TABLE "public"."project_appliances" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




