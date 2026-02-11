import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { deriveProjectDeliveryStatus, toFiniteNumber } from '@/lib/orders/orderFulfillment'
import {
  appendExternalOrderedNote,
  toExternallyOrderedStatus,
} from '@/lib/orders/externalOrderState'

interface SupplierOrderMarkRouteRow {
  id: string
  user_id: string
  project_id: string
  supplier_id: string
  status: string
  sent_at: string | null
  notes: string | null
  idempotency_key: string | null
}

type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

function toNumber(value: unknown): number {
  return toFiniteNumber(value)
}

function getSupplierIdFromRelation(
  relation:
    | {
        supplier_id: string | null
      }
    | {
        supplier_id: string | null
      }[]
    | null,
): string | null {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0]?.supplier_id || null
  }

  return relation.supplier_id || null
}

async function markProjectItemsOrderedForSupplier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  projectId: string,
  supplierId: string,
): Promise<void> {
  const { data: itemRows, error: itemRowsError } = await supabase
    .from('invoice_items')
    .select(
      `
      id,
      quantity,
      quantity_ordered,
      quantity_delivered,
      delivery_status,
      procurement_type,
      articles (supplier_id)
    `,
    )
    .eq('project_id', projectId)

  if (itemRowsError) {
    throw new Error(itemRowsError.message)
  }

  const { data: orderItemRows, error: orderItemRowsError } = await supabase
    .from('supplier_order_items')
    .select('invoice_item_id')
    .eq('supplier_order_id', orderId)
    .not('invoice_item_id', 'is', null)

  if (orderItemRowsError) {
    throw new Error(orderItemRowsError.message)
  }

  const explicitOrderItemIds = new Set<string>(
    (orderItemRows || [])
      .map((row) => (typeof row.invoice_item_id === 'string' ? row.invoice_item_id : null))
      .filter((value): value is string => Boolean(value)),
  )

  const candidateItems = (itemRows || []).filter((item) => {
    const procurementType = (item.procurement_type as InvoiceItemProcurementType | null) || 'external_order'
    if (procurementType !== 'external_order') {
      return false
    }

    const itemId = String(item.id)
    if (explicitOrderItemIds.has(itemId)) {
      return true
    }

    const relationSupplierId = getSupplierIdFromRelation(
      item.articles as { supplier_id: string | null } | { supplier_id: string | null }[] | null,
    )
    return relationSupplierId === supplierId
  })

  for (const item of candidateItems) {
    const quantity = Math.max(0, toNumber(item.quantity))
    const delivered = Math.max(0, toNumber(item.quantity_delivered))
    const ordered = Math.max(toNumber(item.quantity_ordered), quantity, delivered)

    let deliveryStatus = 'ordered'
    if (quantity > 0 && delivered >= quantity) {
      deliveryStatus = 'delivered'
    } else if (delivered > 0) {
      deliveryStatus = 'partially_delivered'
    }

    const { error: updateError } = await supabase
      .from('invoice_items')
      .update({
        quantity_ordered: ordered,
        delivery_status: deliveryStatus,
      })
      .eq('id', item.id)

    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  const { data: refreshedRows, error: refreshedRowsError } = await supabase
    .from('invoice_items')
    .select('delivery_status, quantity, quantity_ordered, quantity_delivered, procurement_type')
    .eq('project_id', projectId)

  if (refreshedRowsError) {
    throw new Error(refreshedRowsError.message)
  }

  const rows = refreshedRows || []
  if (rows.length === 0) {
    return
  }

  const deliveryState = deriveProjectDeliveryStatus(rows)

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      delivery_status: deliveryState.status,
      all_items_delivered: deliveryState.allDelivered,
      ready_for_assembly_date: deliveryState.allDelivered
        ? new Date().toISOString().split('T')[0]
        : null,
    })
    .eq('id', projectId)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/supplier-orders/mark-ordered' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/supplier-orders/mark-ordered' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/supplier-orders/mark-ordered' })
    }

    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .select('id, user_id, project_id, supplier_id, status, sent_at, notes, idempotency_key')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (orderError) {
      return apiErrors.internal(new Error(orderError.message), {
        component: 'api/supplier-orders/mark-ordered',
      })
    }

    if (!orderData) {
      return apiErrors.notFound({ component: 'api/supplier-orders/mark-ordered', orderId: id })
    }

    const row = orderData as SupplierOrderMarkRouteRow
    const nowIso = new Date().toISOString()
    const alreadyMarkedWithSameKey = Boolean(
      idempotencyKey &&
        row.idempotency_key &&
        row.idempotency_key === idempotencyKey &&
        row.sent_at,
    )

    if (!alreadyMarkedWithSameKey) {
      const { error: orderUpdateError } = await supabase
        .from('supplier_orders')
        .update({
          status: toExternallyOrderedStatus(row.status),
          sent_at: row.sent_at || nowIso,
          approved_by_user_id: user.id,
          approved_at: nowIso,
          idempotency_key: idempotencyKey || row.idempotency_key || null,
          notes: appendExternalOrderedNote(row.notes, nowIso),
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (orderUpdateError) {
        return apiErrors.internal(new Error(orderUpdateError.message), {
          component: 'api/supplier-orders/mark-ordered',
        })
      }
    }

    await markProjectItemsOrderedForSupplier(supabase, row.id, row.project_id, row.supplier_id)

    return NextResponse.json({
      success: true,
      alreadyMarked: alreadyMarkedWithSameKey,
      message: 'Bestellung wurde als extern bereits bestellt markiert.',
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/supplier-orders/mark-ordered',
    })
  }
}
