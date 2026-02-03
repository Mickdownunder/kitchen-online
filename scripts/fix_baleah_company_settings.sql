-- Baleah: get_current_company_id() liefert null, wenn der User nicht in company_members ist.
-- Dieses Script nutzt die bestehende company_settings-Zeile (Stammdaten) und trägt den User
-- in company_members als Geschäftsführer ein. Im Baleah-Supabase SQL Editor ausführen (einmalig).

DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_inserted boolean := false;
BEGIN
  -- Ersten User aus auth.users nehmen (oder feste UUID eintragen)
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kein User in auth.users gefunden.';
  END IF;

  -- Bestehende company_settings-Zeile für diesen User verwenden
  SELECT id INTO v_company_id FROM public.company_settings WHERE user_id = v_user_id LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Fallback: keine Zeile vorhanden → anlegen (mit Trigger aus)
    v_inserted := true;
    ALTER TABLE public.company_settings DISABLE TRIGGER trigger_auto_create_owner;
    ALTER TABLE public.company_settings DISABLE TRIGGER after_company_insert_seed_permissions;
    INSERT INTO public.company_settings (
      user_id, company_name, country, invoice_prefix, offer_prefix, display_name
    ) VALUES (
      v_user_id, 'Baleah', 'Österreich', 'R-', 'A-', 'Baleah'
    )
    RETURNING id INTO v_company_id;
  END IF;

  -- User als Geschäftsführer in company_members eintragen (fehlte bisher → get_current_company_id() war null)
  INSERT INTO public.company_members (company_id, user_id, role, is_active)
  VALUES (v_company_id, v_user_id, 'geschaeftsfuehrer', true)
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'geschaeftsfuehrer', is_active = true;

  -- Rollen-Berechtigungen für die Company (menu_settings etc.)
  PERFORM public.seed_role_permissions_for_company(v_company_id);

  IF v_inserted THEN
    ALTER TABLE public.company_settings ENABLE TRIGGER trigger_auto_create_owner;
    ALTER TABLE public.company_settings ENABLE TRIGGER after_company_insert_seed_permissions;
  END IF;

  RAISE NOTICE 'Company verknüpft: id = %, user_id = % (als Geschäftsführer in company_members)', v_company_id, v_user_id;
END $$;
