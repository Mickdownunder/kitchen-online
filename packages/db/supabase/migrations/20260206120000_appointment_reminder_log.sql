-- Tabelle für Termin-Erinnerungs-Log (verhindert doppelte E-Mails)
CREATE TABLE IF NOT EXISTS appointment_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES planning_appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('1day', '1hour')),
  sent_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_appointment_reminder_log_appointment_id
  ON appointment_reminder_log(appointment_id);

ALTER TABLE appointment_reminder_log ENABLE ROW LEVEL SECURITY;

-- Nur authentifizierte User mit menu_calendar können lesen (für Admin/Log)
CREATE POLICY "appointment_reminder_log_read"
  ON appointment_reminder_log FOR SELECT TO authenticated
  USING (
    has_permission('menu_calendar')
    AND EXISTS (
      SELECT 1 FROM planning_appointments pa
      WHERE pa.id = appointment_reminder_log.appointment_id
      AND pa.company_id = get_current_company_id()
    )
  );

-- Cron nutzt service_role (Supabase Admin), der RLS bypassed

COMMENT ON TABLE appointment_reminder_log IS 'Log der versendeten Termin-Erinnerungen (1 Tag / 1 Stunde vorher)';
