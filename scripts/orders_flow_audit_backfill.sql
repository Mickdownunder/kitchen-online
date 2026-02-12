-- Orders Flow Audit + Backfill (safe, procurement-aware)
-- Usage:
--   1) Dry run counts/details: execute section "A) AUDIT"
--   2) Apply fixes: execute whole file in one transaction
--
-- Scope:
-- - invoice_items procurement flow fields
-- - projects delivery rollup recomputation

BEGIN;

-- ============================================================
-- A) AUDIT
-- ============================================================

WITH anomalies AS (
  SELECT
    COUNT(*) FILTER (
      WHERE procurement_type = 'internal_stock'
        AND NOT (
          delivery_status = 'delivered'
          AND COALESCE(quantity_delivered, 0) >= COALESCE(quantity, 0)
        )
    ) AS internal_stock_not_fulfilled,
    COUNT(*) FILTER (
      WHERE procurement_type = 'internal_stock'
        AND COALESCE(actual_delivery_date, NULL) IS NULL
    ) AS internal_stock_missing_delivery_date,
    COUNT(*) FILTER (
      WHERE procurement_type = 'reservation_only'
        AND (
          delivery_status <> 'not_ordered'
          OR COALESCE(quantity_ordered, 0) <> 0
          OR COALESCE(quantity_delivered, 0) <> 0
          OR actual_delivery_date IS NOT NULL
        )
    ) AS reservation_only_has_material_progress,
    COUNT(*) FILTER (
      WHERE procurement_type = 'external_order'
        AND delivery_status = 'delivered'
        AND COALESCE(quantity_delivered, 0) = 0
    ) AS external_delivered_with_zero_delivered_qty
  FROM public.invoice_items
)
SELECT * FROM anomalies;

-- Optional detail view for manual spot-check (top 200 by update recency)
SELECT
  id,
  project_id,
  procurement_type,
  delivery_status,
  quantity,
  quantity_ordered,
  quantity_delivered,
  actual_delivery_date,
  updated_at
FROM public.invoice_items
WHERE
  (
    procurement_type = 'internal_stock'
    AND NOT (
      delivery_status = 'delivered'
      AND COALESCE(quantity_delivered, 0) >= COALESCE(quantity, 0)
    )
  )
  OR (
    procurement_type = 'reservation_only'
    AND (
      delivery_status <> 'not_ordered'
      OR COALESCE(quantity_ordered, 0) <> 0
      OR COALESCE(quantity_delivered, 0) <> 0
      OR actual_delivery_date IS NOT NULL
    )
  )
ORDER BY updated_at DESC NULLS LAST
LIMIT 200;

-- ============================================================
-- B) BACKFILL
-- ============================================================

-- 1) Internal stock must be fully material-fulfilled
UPDATE public.invoice_items
SET
  quantity_ordered = GREATEST(
    COALESCE(quantity_ordered, 0),
    COALESCE(quantity_delivered, 0),
    GREATEST(COALESCE(quantity, 0), 1)
  ),
  quantity_delivered = GREATEST(
    COALESCE(quantity_delivered, 0),
    GREATEST(COALESCE(quantity, 0), 1)
  ),
  delivery_status = 'delivered',
  actual_delivery_date = COALESCE(actual_delivery_date, CURRENT_DATE)
WHERE procurement_type = 'internal_stock';

-- 2) Reservation-only positions must not carry material ordering progress
UPDATE public.invoice_items
SET
  quantity_ordered = 0,
  quantity_delivered = 0,
  delivery_status = 'not_ordered',
  actual_delivery_date = NULL
WHERE procurement_type = 'reservation_only'
  AND (
    delivery_status <> 'not_ordered'
    OR COALESCE(quantity_ordered, 0) <> 0
    OR COALESCE(quantity_delivered, 0) <> 0
    OR actual_delivery_date IS NOT NULL
  );

-- 3) Recompute projects delivery rollup (reservation_only excluded)
WITH relevant_items AS (
  SELECT
    i.project_id,
    i.delivery_status,
    COALESCE(i.quantity, 0) AS quantity,
    COALESCE(i.quantity_ordered, 0) AS quantity_ordered,
    COALESCE(i.quantity_delivered, 0) AS quantity_delivered
  FROM public.invoice_items i
  WHERE i.procurement_type <> 'reservation_only'
),
project_rollup AS (
  SELECT
    project_id,
    bool_and(
      delivery_status = 'delivered' AND quantity_delivered >= quantity
    ) AS all_delivered,
    bool_or(
      delivery_status = 'partially_delivered'
      OR (quantity_delivered > 0 AND quantity_delivered < quantity)
    ) AS partially_delivered,
    bool_and(
      CASE
        WHEN quantity > 0 THEN GREATEST(quantity_ordered, quantity_delivered) >= quantity
        ELSE delivery_status <> 'not_ordered'
      END
    ) AS all_ordered
  FROM relevant_items
  GROUP BY project_id
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

-- Projects with exclusively reservation-only positions are considered delivery-ready
UPDATE public.projects p
SET
  delivery_status = 'fully_delivered',
  all_items_delivered = TRUE,
  ready_for_assembly_date = COALESCE(p.ready_for_assembly_date, CURRENT_DATE)
WHERE p.id IN (
  SELECT i.project_id
  FROM public.invoice_items i
  GROUP BY i.project_id
  HAVING bool_and(i.procurement_type = 'reservation_only')
);

COMMIT;
