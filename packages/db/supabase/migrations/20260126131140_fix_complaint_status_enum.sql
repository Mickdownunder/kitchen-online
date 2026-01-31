-- Migration: Stelle sicher, dass alle benötigten Werte im complaint_status Enum vorhanden sind
-- Diese Migration ist idempotent und kann mehrfach ausgeführt werden

DO $$
DECLARE
  enum_exists BOOLEAN;
  draft_exists BOOLEAN;
  reported_exists BOOLEAN;
  ab_confirmed_exists BOOLEAN;
  delivered_exists BOOLEAN;
  installed_exists BOOLEAN;
  resolved_exists BOOLEAN;
BEGIN
  -- Prüfe ob Enum existiert
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') INTO enum_exists;
  
  IF NOT enum_exists THEN
    -- Erstelle Enum mit allen Werten
    CREATE TYPE complaint_status AS ENUM (
      'draft',
      'reported',
      'ab_confirmed',
      'delivered',
      'installed',
      'resolved'
    );
    RAISE NOTICE 'Enum complaint_status wurde erstellt';
  ELSE
    -- Enum existiert, prüfe welche Werte fehlen und füge sie hinzu
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'draft' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO draft_exists;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'reported' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO reported_exists;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'ab_confirmed' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO ab_confirmed_exists;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'delivered' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO delivered_exists;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'installed' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO installed_exists;
    
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'resolved' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'complaint_status')
    ) INTO resolved_exists;
    
    -- Füge fehlende Werte am Ende hinzu (ohne BEFORE, damit es immer funktioniert)
    IF NOT draft_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'draft';
      RAISE NOTICE 'Wert "draft" wurde hinzugefügt';
    END IF;
    
    IF NOT reported_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'reported';
      RAISE NOTICE 'Wert "reported" wurde hinzugefügt';
    END IF;
    
    IF NOT ab_confirmed_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'ab_confirmed';
      RAISE NOTICE 'Wert "ab_confirmed" wurde hinzugefügt';
    END IF;
    
    IF NOT delivered_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'delivered';
      RAISE NOTICE 'Wert "delivered" wurde hinzugefügt';
    END IF;
    
    IF NOT installed_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'installed';
      RAISE NOTICE 'Wert "installed" wurde hinzugefügt';
    END IF;
    
    IF NOT resolved_exists THEN
      ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'resolved';
      RAISE NOTICE 'Wert "resolved" wurde hinzugefügt';
    END IF;
  END IF;
END $$;
COMMENT ON TYPE complaint_status IS 'Status-Werte für Reklamationen: draft (Erfasst), reported (Gemeldet), ab_confirmed (AB bestätigt), delivered (Geliefert), installed (Montiert), resolved (Erledigt)';
