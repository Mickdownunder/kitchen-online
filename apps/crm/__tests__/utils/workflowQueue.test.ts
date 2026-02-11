import {
  deriveSupplierWorkflowQueue,
  fromQueueParam,
  getAbTimingStatus,
  SUPPLIER_WORKFLOW_QUEUE_ORDER,
  toQueueParam,
  type SupplierWorkflowQueueSnapshot,
} from '@/lib/orders/workflowQueue'

const NOW = new Date('2026-02-10T08:00:00.000Z')

function buildSnapshot(
  overrides: Partial<SupplierWorkflowQueueSnapshot> = {},
): SupplierWorkflowQueueSnapshot {
  return {
    hasOrder: true,
    orderStatus: 'sent',
    sentAt: '2026-02-01T09:00:00.000Z',
    abNumber: 'AB-1',
    abReceivedAt: '2026-02-02T09:00:00.000Z',
    abConfirmedDeliveryDate: '2026-02-12',
    supplierDeliveryNoteId: undefined,
    goodsReceiptId: undefined,
    bookedAt: undefined,
    installationDate: '2026-02-20',
    openOrderItems: 0,
    openDeliveryItems: 1,
    ...overrides,
  }
}

describe('workflowQueue', () => {
  it('keeps explicit queue order stable', () => {
    expect(SUPPLIER_WORKFLOW_QUEUE_ORDER).toEqual([
      'zu_bestellen',
      'brennt',
      'ab_fehlt',
      'wareneingang_offen',
      'montagebereit',
      'erledigt',
    ])
  })

  it('maps queue params as roundtrip', () => {
    SUPPLIER_WORKFLOW_QUEUE_ORDER.forEach((queue) => {
      const param = toQueueParam(queue)
      expect(fromQueueParam(param)).toBe(queue)
    })

    expect(fromQueueParam('lieferant-fehlt')).toBe('zu_bestellen')
    expect(fromQueueParam('lieferschein-da')).toBe('wareneingang_offen')
    expect(fromQueueParam('unknown')).toBeNull()
  })

  it('classifies missing order as zu_bestellen', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        hasOrder: false,
        orderStatus: undefined,
        sentAt: undefined,
      }),
      NOW,
    )

    expect(result.queue).toBe('zu_bestellen')
  })

  it('classifies sent order without AB as ab_fehlt', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        abNumber: undefined,
        abReceivedAt: undefined,
        abConfirmedDeliveryDate: undefined,
      }),
      NOW,
    )

    expect(result.queue).toBe('ab_fehlt')
  })

  it('classifies delivery note without goods receipt as wareneingang_offen', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        supplierDeliveryNoteId: 'dn-1',
        goodsReceiptId: undefined,
      }),
      NOW,
    )

    expect(result.queue).toBe('wareneingang_offen')
  })

  it('classifies open goods receipt as wareneingang_offen', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        supplierDeliveryNoteId: 'dn-1',
        goodsReceiptId: 'gr-1',
        openDeliveryItems: 2,
      }),
      NOW,
    )

    expect(result.queue).toBe('wareneingang_offen')
  })

  it('classifies completed flow as montagebereit', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        supplierDeliveryNoteId: 'dn-1',
        goodsReceiptId: 'gr-1',
        bookedAt: '2026-02-11T08:00:00.000Z',
        openDeliveryItems: 0,
      }),
      NOW,
    )

    expect(result.queue).toBe('montagebereit')
  })

  it('classifies montagebereit rows with reached target date as erledigt', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        supplierDeliveryNoteId: 'dn-1',
        goodsReceiptId: 'gr-1',
        bookedAt: '2026-02-11T08:00:00.000Z',
        openDeliveryItems: 0,
        installationDate: '2026-02-10',
      }),
      NOW,
    )

    expect(result.queue).toBe('erledigt')
  })

  it('classifies near-term missing material as brennt', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        orderStatus: 'draft',
        sentAt: undefined,
        installationDate: '2026-02-11',
        openOrderItems: 1,
      }),
      NOW,
    )

    expect(result.queue).toBe('brennt')
  })

  it('moves ordered rows with missing AB to ab_fehlt even when target is close', () => {
    const result = deriveSupplierWorkflowQueue(
      buildSnapshot({
        installationDate: '2026-02-11',
        abNumber: undefined,
        abReceivedAt: undefined,
        abConfirmedDeliveryDate: undefined,
      }),
      NOW,
    )

    expect(result.queue).toBe('ab_fehlt')
  })

  it('evaluates AB timing against goods receipt booking', () => {
    expect(getAbTimingStatus('2026-02-10', '2026-02-10T12:00:00.000Z')).toBe('on_time')
    expect(getAbTimingStatus('2026-02-10', '2026-02-11T12:00:00.000Z')).toBe('late')
    expect(getAbTimingStatus('2026-02-10', undefined)).toBe('open')
  })
})
