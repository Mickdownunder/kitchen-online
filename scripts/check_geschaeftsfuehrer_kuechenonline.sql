-- Prüfen: Ist der Geschäftsführer in KüchenOnline korrekt in company_members?
-- Im KüchenOnline-Supabase SQL Editor ausführen (als eingeloggter User oder service_role).

-- 1) Alle company_members mit Rolle Geschäftsführer
SELECT
  cm.company_id,
  cm.user_id,
  cm.role,
  cm.is_active,
  cs.company_name,
  cs.display_name,
  up.email AS user_email,
  up.full_name AS user_name
FROM public.company_members cm
LEFT JOIN public.company_settings cs ON cs.id = cm.company_id
LEFT JOIN public.user_profiles up ON up.id = cm.user_id
WHERE cm.role = 'geschaeftsfuehrer'
ORDER BY cm.company_id, cm.user_id;

-- 2) Aktueller User: Welche Firma und Rolle?
-- (Nur aussagekräftig, wenn du als der Geschäftsführer eingeloggt bist)
SELECT
  public.get_current_company_id() AS current_company_id,
  public.get_current_role() AS current_role,
  public.is_current_user_geschaeftsfuehrer() AS is_geschaeftsfuehrer;

-- 3) Alle Firmen und deren Geschäftsführer
SELECT
  cs.id AS company_id,
  cs.company_name,
  cs.display_name,
  cs.user_id AS company_settings_owner_user_id,
  (SELECT array_agg(cm.user_id || ' (' || up.email || ')')
   FROM public.company_members cm
   LEFT JOIN public.user_profiles up ON up.id = cm.user_id
   WHERE cm.company_id = cs.id AND cm.role = 'geschaeftsfuehrer' AND cm.is_active
  ) AS geschaeftsfuehrer_user_ids
FROM public.company_settings cs
ORDER BY cs.company_name;
