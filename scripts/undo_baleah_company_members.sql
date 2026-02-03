-- UNDO: Verknüpfung User ↔ Firma in Baleah wieder entfernen.
-- Nach dem Lauf: get_current_company_id() ist wieder null, Audit-Logs laden nicht,
-- CRM startet wieder schneller (lädt keine Firma/Logs). Stammdaten (company_settings) bleiben unverändert.
-- Im Baleah-Supabase SQL Editor ausführen.

DELETE FROM public.company_members
WHERE user_id = '5ba3b56f-e0b7-4be0-b5c9-32c96dd3542b'
  AND company_id = (SELECT id FROM public.company_settings WHERE user_id = '5ba3b56f-e0b7-4be0-b5c9-32c96dd3542b' LIMIT 1);
