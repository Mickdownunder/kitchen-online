-- Lieferzeiten pro Lieferant (für KI: trackLeadTimes / Warnung bei Montageplanung)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS lead_time_weeks numeric;

COMMENT ON COLUMN public.suppliers.lead_time_weeks IS 'Durchschnittliche Lieferzeit in Wochen (für Hinweise bei Terminplanung)';
