import {
  getStatusesForPreset,
  parseInboundCandidates,
  parseInboundSignals,
} from '@/components/accounting/inboundInbox.utils'
import type { InboundInboxItem } from '@/components/accounting/inboundInbox.types'

describe('inboundInbox.utils', () => {
  it('maps status presets to expected values', () => {
    expect(getStatusesForPreset('review')).toEqual(['preassigned', 'needs_review', 'failed'])
    expect(getStatusesForPreset('all')).toEqual([])
  })

  it('parses candidate json and skips invalid entries', () => {
    const parsed = parseInboundCandidates([
      { orderId: 'order-1', orderNumber: 'SO-1', score: 0.92, reasons: ['order_number'] },
      { orderNumber: 'SO-2' },
      null,
    ])

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      orderId: 'order-1',
      orderNumber: 'SO-1',
      score: 0.92,
      reasons: ['order_number'],
    })
  })

  it('reads extracted signals from inbox row payload', () => {
    const row = {
      id: 'inbox-1',
      file_name: 'ab.pdf',
      mime_type: 'application/pdf',
      file_size: 1200,
      sender_email: 'supplier@example.com',
      sender_name: null,
      recipient_email: 'ab@baleah.at',
      subject: 'AB 123',
      received_at: '2026-02-12T10:00:00.000Z',
      document_kind: 'ab',
      processing_status: 'needs_review',
      processing_error: null,
      extracted_payload: {
        signals: {
          kind: 'ab',
          abNumber: 'AB-123',
          confirmedDeliveryDate: '2026-03-10',
          warnings: ['Lieferwoche unklar'],
        },
      },
      assignment_candidates: [],
      assignment_confidence: 0.8,
      assigned_supplier_order_id: null,
      assigned_project_id: null,
      assigned_supplier_invoice_id: null,
      confirmed_at: null,
      rejected_reason: null,
    } satisfies InboundInboxItem

    const parsed = parseInboundSignals(row)
    expect(parsed.kind).toBe('ab')
    expect(parsed.abNumber).toBe('AB-123')
    expect(parsed.confirmedDeliveryDate).toBe('2026-03-10')
    expect(parsed.warnings).toEqual(['Lieferwoche unklar'])
  })
})

