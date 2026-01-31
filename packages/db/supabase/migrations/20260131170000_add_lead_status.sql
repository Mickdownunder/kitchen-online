-- Migration: Add 'Lead' status to project_status enum
-- Leads are potential customers from Cal.com bookings who haven't purchased yet

-- Add 'Lead' to the project_status enum
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Lead' BEFORE 'Planung';

-- Comment explaining the new status
COMMENT ON TYPE public.project_status IS 'Project status workflow: Lead (from booking) → Planung → Aufmaß → Bestellt → Lieferung → Montage → Abgeschlossen | Reklamation';
