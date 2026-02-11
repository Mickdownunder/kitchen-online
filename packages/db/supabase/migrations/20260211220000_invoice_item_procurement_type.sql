-- Beschaffungsart pro Auftragsposition (invoice_items)
-- Ziel:
-- 1) Externe Bestellung (Standard-Flow)
-- 2) Interne Lagerware (kein AB/Lieferschein/WE-Flow)
-- 3) Reservierung-only (Montage/Lieferung wird reserviert, nicht bestellt)

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS procurement_type text;

UPDATE public.invoice_items
SET procurement_type = 'external_order'
WHERE procurement_type IS NULL OR btrim(procurement_type) = '';

ALTER TABLE public.invoice_items
  ALTER COLUMN procurement_type SET DEFAULT 'external_order';

ALTER TABLE public.invoice_items
  ALTER COLUMN procurement_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoice_items_procurement_type_check'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_procurement_type_check
      CHECK (procurement_type = ANY (ARRAY['external_order', 'internal_stock', 'reservation_only']));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_invoice_items_procurement_type
  ON public.invoice_items USING btree (procurement_type);

COMMENT ON COLUMN public.invoice_items.procurement_type IS
  'Beschaffungsart pro Position: external_order | internal_stock | reservation_only';

-- Konservativer Backfill für explizite Lagerwaren-Lieferanten
-- (kein heuristischer Text-Match auf Positionsbeschreibung im Live-Betrieb)
UPDATE public.invoice_items ii
SET procurement_type = 'internal_stock'
FROM public.articles a
JOIN public.suppliers s ON s.id = a.supplier_id
WHERE ii.article_id = a.id
  AND lower(btrim(s.name)) IN ('baleah eigen', 'lagerware', 'lager');

-- Interne Lagerware direkt als materialseitig erfüllt markieren
UPDATE public.invoice_items
SET
  quantity_ordered = GREATEST(
    COALESCE(quantity_ordered, 0),
    COALESCE(quantity_delivered, 0),
    COALESCE(quantity, 0)
  ),
  quantity_delivered = GREATEST(COALESCE(quantity_delivered, 0), COALESCE(quantity, 0)),
  delivery_status = 'delivered',
  actual_delivery_date = COALESCE(actual_delivery_date, CURRENT_DATE)
WHERE procurement_type = 'internal_stock';

-- Projekt-Materialstatus nach Backfill neu berechnen
WITH project_rollup AS (
  SELECT
    i.project_id,
    bool_and(
      i.delivery_status = 'delivered'
      AND COALESCE(i.quantity_delivered, 0) >= COALESCE(i.quantity, 0)
    ) AS all_delivered,
    bool_or(
      i.delivery_status = 'partially_delivered'
      OR (
        COALESCE(i.quantity_delivered, 0) > 0
        AND COALESCE(i.quantity_delivered, 0) < COALESCE(i.quantity, 0)
      )
    ) AS partially_delivered,
    bool_and(
      CASE
        WHEN COALESCE(i.quantity, 0) > 0
          THEN GREATEST(COALESCE(i.quantity_ordered, 0), COALESCE(i.quantity_delivered, 0)) >= COALESCE(i.quantity, 0)
        ELSE i.delivery_status <> 'not_ordered'
      END
    ) AS all_ordered
  FROM public.invoice_items i
  GROUP BY i.project_id
)
UPDATE public.projects p
SET
  delivery_status = CASE
    WHEN r.all_delivered THEN 'fully_delivered'
    WHEN r.partially_delivered THEN 'partially_delivered'
    WHEN r.all_ordered THEN 'fully_ordered'
    ELSE 'partially_ordered'
  END,
  all_items_delivered = r.all_delivered,
  ready_for_assembly_date = CASE
    WHEN r.all_delivered THEN COALESCE(p.ready_for_assembly_date, CURRENT_DATE)
    ELSE NULL
  END
FROM project_rollup r
WHERE p.id = r.project_id;
