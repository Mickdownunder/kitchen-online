import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { requireInboxAccess } from '@/lib/inbound/access'
import { insertInboundEvent, loadInboxItemByIdForUser, updateInboxItem } from '@/lib/inbound/repository'
import { toInboundProcessingStatus } from '@/lib/inbound/status'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const access = await requireInboxAccess(supabase)
    if (!access.ok) {
      return access.response
    }

    const existing = await loadInboxItemByIdForUser(supabase, id, access.user.id)
    if (!existing) {
      return apiErrors.notFound({ component: 'api/document-inbox/reassign', id })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const supplierOrderId = typeof body.supplierOrderId === 'string' ? body.supplierOrderId : null
    const projectId = typeof body.projectId === 'string' ? body.projectId : null
    const supplierInvoiceId = typeof body.supplierInvoiceId === 'string' ? body.supplierInvoiceId : null
    const confidence =
      typeof body.confidence === 'number' && Number.isFinite(body.confidence)
        ? Math.max(0, Math.min(1, body.confidence))
        : existing.assignment_confidence

    const updated = await updateInboxItem(supabase, id, access.user.id, {
      assigned_supplier_order_id: supplierOrderId,
      assigned_project_id: projectId,
      assigned_supplier_invoice_id: supplierInvoiceId,
      assignment_confidence: confidence,
      processing_status: 'needs_review',
      processing_error: null,
      rejected_reason: null,
    })

    await insertInboundEvent({
      supabase,
      inboxItemId: updated.id,
      userId: access.user.id,
      eventType: 'reassigned',
      fromStatus: toInboundProcessingStatus(existing.processing_status),
      toStatus: 'needs_review',
      payload: {
        supplierOrderId,
        projectId,
        supplierInvoiceId,
        confidence,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/document-inbox/reassign' })
  }
}
