-- ============================================
-- Project Appliances (Gerätepark)
-- ============================================
-- Tracks installed appliances per project with serial numbers,
-- warranty info, and manufacturer support contacts.

-- 1) Create project_appliances table
CREATE TABLE IF NOT EXISTS project_appliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES company_settings(id) ON DELETE CASCADE,
  
  -- Appliance details
  manufacturer text NOT NULL,  -- e.g., "Miele", "Bosch", "Siemens"
  model text NOT NULL,         -- e.g., "G 7000 SCi"
  category text NOT NULL,      -- e.g., "Geschirrspüler", "Backofen", "Kühlschrank"
  
  -- Serial number (E-Nummer) - entered after installation
  serial_number text,
  
  -- Dates
  purchase_date date,
  installation_date date,
  warranty_until date,
  
  -- Manufacturer support
  manufacturer_support_url text,
  manufacturer_support_phone text,
  manufacturer_support_email text,
  
  -- Optional: Link to article catalog
  article_id uuid,
  
  -- Notes
  notes text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid  -- Employee who added this
);

-- Indexes
CREATE INDEX IF NOT EXISTS project_appliances_project_id_idx 
  ON project_appliances(project_id);

CREATE INDEX IF NOT EXISTS project_appliances_company_id_idx 
  ON project_appliances(company_id);

CREATE INDEX IF NOT EXISTS project_appliances_category_idx 
  ON project_appliances(category);

-- 2) Enable RLS
ALTER TABLE project_appliances ENABLE ROW LEVEL SECURITY;

-- 3) Trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_appliances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_appliances_updated_at_trigger ON project_appliances;
CREATE TRIGGER project_appliances_updated_at_trigger
  BEFORE UPDATE ON project_appliances
  FOR EACH ROW
  EXECUTE FUNCTION update_project_appliances_updated_at();

-- 4) Common appliance categories (for reference)
COMMENT ON TABLE project_appliances IS 'Installed appliances per project (Gerätepark)';
COMMENT ON COLUMN project_appliances.category IS 'Categories: Backofen, Geschirrspüler, Kühlschrank, Gefrierschrank, Kühl-Gefrier-Kombi, Dunstabzug, Kochfeld, Mikrowelle, Kaffeevollautomat, Wärmeschublade, Weinkühlschrank, Waschmaschine, Trockner, Spüle, Armatur, Sonstiges';
COMMENT ON COLUMN project_appliances.serial_number IS 'E-Nummer / Seriennummer - wird nach Montage eingetragen';
