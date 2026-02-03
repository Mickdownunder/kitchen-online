-- Alte Einstellung wiederherstellen: User wieder als Geschäftsführer in Baleah eintragen.
-- Im Baleah-Supabase SQL Editor ausführen. Danach: Rolle wieder "Geschäftsführer", alle Menüpunkte sichtbar.

DO $$
DECLARE
  v_user_id uuid := '5ba3b56f-e0b7-4be0-b5c9-32c96dd3542b';
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM public.company_settings WHERE user_id = v_user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Keine company_settings für user_id % gefunden.', v_user_id;
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role, is_active)
  VALUES (v_company_id, v_user_id, 'geschaeftsfuehrer', true)
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'geschaeftsfuehrer', is_active = true;

  PERFORM public.seed_role_permissions_for_company(v_company_id);

  RAISE NOTICE 'Wiederhergestellt: user_id % ist Geschäftsführer für company_id %', v_user_id, v_company_id;
END $$;
