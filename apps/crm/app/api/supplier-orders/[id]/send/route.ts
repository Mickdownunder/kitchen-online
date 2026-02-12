import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueAndSendEmailOutbox } from '@/lib/supabase/services/emailOutbox'
import { apiErrors } from '@/lib/utils/errorHandling'
import type { Json } from '@/types/database.types'
import {
  collectSupplierOrderCandidateInvoiceItemIds,
  deriveProjectDeliveryStatus,
  toFiniteNumber,
} from '@/lib/orders/orderFulfillment'
import {
  buildSupplierOrderTemplate,
  supplierOrderPdfFileName,
  type SupplierOrderTemplateInput,
} from '@/lib/orders/supplierOrderTemplate'
import { SupplierOrderPDFDocumentServer } from '@/lib/pdf/SupplierOrderPDFServer'

interface SupplierOrderRouteRow {
  id: string
  user_id: string
  project_id: string
  supplier_id: string
  order_number: string
  status: string
  created_by_type: string
  sent_at: string | null
  sent_to_email: string | null
  idempotency_key: string | null
  delivery_calendar_week: string | null
  installation_reference_date: string | null
  notes: string | null
  suppliers:
    | {
        id: string
        name: string
        email: string | null
        order_email: string | null
      }
    | {
        id: string
        name: string
        email: string | null
        order_email: string | null
      }[]
    | null
  projects:
    | {
        id: string
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }
    | {
        id: string
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }[]
    | null
  supplier_order_items: Array<{
    invoice_item_id: string | null
    position_number: number
    description: string
    quantity: number
    unit: string
    model_number: string | null
    manufacturer: string | null
    expected_delivery_date: string | null
  }> | null
}

type InvoiceItemProcurementType = 'external_order' | 'internal_stock' | 'reservation_only'

interface SupplierRelation {
  id: string
  name: string
  email: string | null
  order_email: string | null
}

interface ProjectRelation {
  id: string
  order_number: string | null
  customer_name: string | null
  installation_date: string | null
}

function relationToSingle<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null
  }

  return Array.isArray(value) ? value[0] || null : value
}

function toNumber(value: unknown): number {
  return toFiniteNumber(value)
}

function resolveSentOrderStatus(currentStatus: string): string {
  const advancedStates = new Set([
    'ab_received',
    'delivery_note_received',
    'goods_receipt_open',
    'goods_receipt_booked',
    'ready_for_installation',
  ])
  return advancedStates.has(currentStatus) ? currentStatus : 'sent'
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

  const invoiceItemIdsFromOrder = new Set<string>(
    (orderItemRows || [])
      .map((row) => (typeof row.invoice_item_id === 'string' ? row.invoice_item_id : null))
      .filter((value): value is string => Boolean(value)),
  )

  const candidateIds = collectSupplierOrderCandidateInvoiceItemIds(
    (itemRows || []).map((row) => ({
      id: String(row.id),
      supplierId: getSupplierIdFromRelation(
        row.articles as { supplier_id: string | null } | { supplier_id: string | null }[] | null,
      ),
      procurementType: row.procurement_type as InvoiceItemProcurementType | undefined,
    })),
    supplierId,
    invoiceItemIdsFromOrder,
  )
  const candidateItems = (itemRows || []).filter((row) => candidateIds.has(String(row.id)))

  for (const item of candidateItems) {
    if ((item.procurement_type as InvoiceItemProcurementType | null) !== 'external_order') {
      continue
    }

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

async function resolveCompanyName(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data: companyId } = await supabase.rpc('get_current_company_id')
  if (!companyId) {
    return 'Ihr Unternehmen'
  }

  const { data: company } = await supabase
    .from('company_settings')
    .select('display_name, company_name')
    .eq('id', companyId)
    .maybeSingle()

  if (!company) {
    return 'Ihr Unternehmen'
  }

  return (company.display_name || company.company_name || 'Ihr Unternehmen') as string
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
    const toEmailOverride = typeof body.toEmail === 'string' ? body.toEmail.trim() : ''

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/supplier-orders/send' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/supplier-orders/send' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/supplier-orders/send' })
    }

    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .select(
        `
        id,
        user_id,
        project_id,
        supplier_id,
        order_number,
        status,
        created_by_type,
        sent_at,
        sent_to_email,
        idempotency_key,
        delivery_calendar_week,
        installation_reference_date,
        notes,
        suppliers (id, name, email, order_email),
        projects (id, order_number, customer_name, installation_date),
        supplier_order_items (
          invoice_item_id,
          position_number,
          description,
          quantity,
          unit,
          model_number,
          manufacturer,
          expected_delivery_date
        )
      `,
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (orderError) {
      return apiErrors.internal(new Error(orderError.message), {
        component: 'api/supplier-orders/send',
      })
    }

    if (!orderData) {
      return apiErrors.notFound({ component: 'api/supplier-orders/send', orderId: id })
    }

    const row = orderData as SupplierOrderRouteRow
    const supplier = relationToSingle<SupplierRelation>(row.suppliers)
    const project = relationToSingle<ProjectRelation>(row.projects)

    if (!supplier || !project) {
      return apiErrors.badRequest({ component: 'api/supplier-orders/send', reason: 'missing_relations' })
    }

    const recipientEmail = toEmailOverride || supplier.order_email || supplier.email || ''
    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Für diesen Lieferanten ist keine Bestell-E-Mail hinterlegt.',
        },
        { status: 400 },
      )
    }

    let existingDispatchLog:
      | {
          id: string
          sent_at: string
          to_email: string
          template_version: string
          payload: Json
        }
      | null = null
    if (idempotencyKey) {
      const { data: existingLog, error: existingLogError } = await supabase
        .from('supplier_order_dispatch_logs')
        .select('id, sent_at, to_email, template_version, payload')
        .eq('supplier_order_id', id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingLogError) {
        return apiErrors.internal(new Error(existingLogError.message), {
          component: 'api/supplier-orders/send',
        })
      }

      existingDispatchLog = existingLog
    }

    const alreadySentWithSameKey = Boolean(
      idempotencyKey &&
        row.idempotency_key &&
        row.idempotency_key === idempotencyKey &&
        row.sent_at,
    )
    if (alreadySentWithSameKey || existingDispatchLog?.id) {
      const nowIso = new Date().toISOString()

      await markProjectItemsOrderedForSupplier(supabase, row.id, row.project_id, row.supplier_id)

      const { error: orderSyncError } = await supabase
        .from('supplier_orders')
        .update({
          status: resolveSentOrderStatus(row.status),
          sent_to_email: row.sent_to_email || existingDispatchLog?.to_email || recipientEmail,
          sent_at: row.sent_at || existingDispatchLog?.sent_at || nowIso,
          approved_by_user_id: user.id,
          approved_at: nowIso,
          idempotency_key: idempotencyKey || row.idempotency_key || null,
          template_version: existingDispatchLog?.template_version || undefined,
          template_snapshot: existingDispatchLog?.payload || undefined,
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (orderSyncError) {
        return apiErrors.internal(new Error(orderSyncError.message), {
          component: 'api/supplier-orders/send',
        })
      }

      return NextResponse.json({
        success: true,
        alreadySent: true,
        message: 'Bestellung wurde mit diesem Idempotency-Key bereits versendet.',
      })
    }

    const items = (row.supplier_order_items || []).map((item, index) => ({
      positionNumber: item.position_number || index + 1,
      description: item.description,
      quantity: Math.max(0, toNumber(item.quantity)),
      unit: item.unit || 'Stk',
      modelNumber: item.model_number || undefined,
      manufacturer: item.manufacturer || undefined,
      expectedDeliveryDate: item.expected_delivery_date || undefined,
    }))

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Die Bestellung enthält keine Positionen.',
        },
        { status: 400 },
      )
    }

    const companyName = await resolveCompanyName(supabase)

    const templateInput: SupplierOrderTemplateInput = {
      orderNumber: row.order_number,
      projectOrderNumber: project.order_number || row.project_id,
      projectCustomerName: project.customer_name || 'Unbekannt',
      supplierName: supplier.name,
      supplierEmail: recipientEmail,
      companyName,
      deliveryCalendarWeek: row.delivery_calendar_week || undefined,
      installationReferenceDate:
        row.installation_reference_date || project.installation_date || undefined,
      notes: row.notes || undefined,
      items,
    }

    const template = buildSupplierOrderTemplate(templateInput)

    const pdfElement = React.createElement(SupplierOrderPDFDocumentServer, {
      templateInput,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as never)
    const pdfContent = pdfBuffer.toString('base64')
    const pdfFileName = supplierOrderPdfFileName(row.order_number, supplier.name)

    const outboxResult = await queueAndSendEmailOutbox({
      supabase,
      userId: user.id,
      kind: 'supplier_order_dispatch',
      dedupeKey: idempotencyKey ? `supplier-order:${id}:${idempotencyKey}` : null,
      payload: {
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfContent,
            contentType: 'application/pdf',
          },
        ],
      },
      metadata: {
        supplierOrderId: id,
        projectId: row.project_id,
        supplierId: row.supplier_id,
      } as Json,
    })

    const nowIso = outboxResult.sentAt

    const { error: logError } = await supabase.from('supplier_order_dispatch_logs').insert({
      supplier_order_id: id,
      user_id: user.id,
      sent_by_type: row.created_by_type === 'ai' ? 'ai' : 'user',
      to_email: recipientEmail,
      subject: template.subject,
      template_version: template.version,
      payload: {
        ...template.snapshot,
        recipientEmail,
        pdfFileName,
        outboxId: outboxResult.outboxId,
        outboxProviderMessageId: outboxResult.providerMessageId,
      } as Json,
      idempotency_key: idempotencyKey || null,
      sent_at: nowIso,
    })

    if (logError) {
      const code = (logError as { code?: string }).code
      if (code !== '23505') {
        return apiErrors.internal(new Error(logError.message), {
          component: 'api/supplier-orders/send',
        })
      }
    }

    await markProjectItemsOrderedForSupplier(supabase, row.id, row.project_id, row.supplier_id)

    const { error: orderUpdateError } = await supabase
      .from('supplier_orders')
      .update({
        status: resolveSentOrderStatus(row.status),
        sent_to_email: recipientEmail,
        sent_at: row.sent_at || nowIso,
        approved_by_user_id: user.id,
        approved_at: nowIso,
        template_version: template.version,
        template_snapshot: template.snapshot as Json,
        idempotency_key: idempotencyKey || row.idempotency_key || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (orderUpdateError) {
      return apiErrors.internal(new Error(orderUpdateError.message), {
        component: 'api/supplier-orders/send',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Bestellung ${row.order_number} wurde an ${recipientEmail} versendet.`,
      templateVersion: template.version,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/supplier-orders/send',
    })
  }
}
