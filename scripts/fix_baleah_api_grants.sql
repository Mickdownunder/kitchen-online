-- Fix: PostgREST/Supabase API braucht GRANTs für authenticated/anon
-- Im Baleah-Supabase SQL Editor ausführen

-- Schema-Zugriff
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Alle Tabellen für authenticated (RLS regelt den eigentlichen Zugriff)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Alle Sequenzen
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Alle Funktionen/RPCs
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Default für zukünftige Tabellen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
