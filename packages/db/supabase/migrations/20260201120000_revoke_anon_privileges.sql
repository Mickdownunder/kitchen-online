-- Migration: Revoke excessive privileges from anon role
-- 
-- Hintergrund: Supabase gibt standardmäßig GRANT ALL auf alle Tabellen für anon.
-- Da wir keine öffentlichen (nicht-authentifizierten) Datenzugriffe benötigen,
-- entfernen wir diese Rechte als Defense-in-Depth Maßnahme.
--
-- Auth-Flows (signUp, signIn, refresh) sind NICHT betroffen, da diese über
-- den Auth-Service laufen und keine DB-Privilegien im public-Schema benötigen.

-- ============================================================================
-- REVOKE table privileges for anon on public schema
-- ============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- ============================================================================
-- REVOKE function/RPC privileges for anon on public schema
-- ============================================================================

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ============================================================================
-- Prevent future auto-grants to anon
-- ============================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- ============================================================================
-- Verify: anon should still have USAGE on schema (required for PostgREST)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon;

-- ============================================================================
-- Note: If you ever need public endpoints, create specific policies like:
--
-- CREATE POLICY "anon_can_read_public_content" ON public.content
--   FOR SELECT TO anon USING (is_public = true);
--
-- And grant minimal permissions:
-- GRANT SELECT ON public.content TO anon;
-- ============================================================================
