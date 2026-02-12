import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { requireInboxAccess } from '@/lib/inbound/access'
import { confirmInboxItem } from '@/lib/inbound/confirmActions'
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
      return apiErrors.notFound({ component: 'api/document-inbox/confirm', id })
    }

    if (existing.processing_status === 'confirmed') {
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Dokument wurde bereits bestätigt.',
      })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const result = await confirmInboxItem({
      supabase,
      row: existing,
      userId: access.user.id,
      body,
    })

    const confirmed = await updateInboxItem(supabase, id, access.user.id, {
      processing_status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by_user_id: access.user.id,
      rejected_reason: null,
      processing_error: null,
      assigned_supplier_order_id: result.supplierOrderId || existing.assigned_supplier_order_id,
      assigned_project_id: result.projectId || existing.assigned_project_id,
      assigned_supplier_invoice_id: result.supplierInvoiceId || existing.assigned_supplier_invoice_id,
    })

    await insertInboundEvent({
      supabase,
      inboxItemId: confirmed.id,
      userId: access.user.id,
      eventType: 'confirmed',
      fromStatus: toInboundProcessingStatus(existing.processing_status),
      toStatus: 'confirmed',
      payload: {
        kind: result.kind,
        supplierOrderId: result.supplierOrderId || null,
        projectId: result.projectId || null,
        supplierInvoiceId: result.supplierInvoiceId || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: confirmed,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/document-inbox/confirm' })
  }
}
