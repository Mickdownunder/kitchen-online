import { NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import type { PublishRequest } from './schema'
import type { AuthorizationContext } from './types'

export async function validatePublishPayload(
  payload: PublishRequest,
  authorization: AuthorizationContext,
): Promise<NextResponse | null> {
  if (payload.documentType === 'invoice') {
    const invoiceId = payload.invoice?.id
    if (!invoiceId) {
      return apiErrors.badRequest({
        component: 'api/portal/publish-document',
        reason: 'invoice_missing',
      })
    }

    const { data: invoiceRow, error: invoiceError } = await authorization.serviceClient
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .eq('project_id', payload.projectId)
      .maybeSingle()

    if (invoiceError || !invoiceRow) {
      return apiErrors.badRequest({
        component: 'api/portal/publish-document',
        reason: 'invoice_project_mismatch',
      })
    }
  }

  if (payload.documentType === 'delivery_note') {
    const deliveryNoteId = payload.deliveryNote?.id
    if (!deliveryNoteId) {
      return apiErrors.badRequest({
        component: 'api/portal/publish-document',
        reason: 'delivery_note_missing',
      })
    }

    const { data: noteRow, error: noteError } = await authorization.serviceClient
      .from('customer_delivery_notes')
      .select('id')
      .eq('id', deliveryNoteId)
      .eq('project_id', payload.projectId)
      .maybeSingle()

    if (noteError || !noteRow) {
      return apiErrors.badRequest({
        component: 'api/portal/publish-document',
        reason: 'delivery_note_not_customer',
      })
    }
  }

  return null
}
