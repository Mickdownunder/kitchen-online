import { buildAssignmentDecision } from '@/lib/inbound/matching'

describe('buildAssignmentDecision', () => {
  const candidates = [
    {
      orderId: 'order-1',
      orderNumber: '2026-LAB',
      projectId: 'project-1',
      projectOrderNumber: 'AB-1001',
      supplierName: 'Muster Lieferant',
      supplierOrderEmail: 'ab@supplier.test',
      supplierEmail: 'office@supplier.test',
    },
    {
      orderId: 'order-2',
      orderNumber: '2026-LZZ',
      projectId: 'project-2',
      projectOrderNumber: 'AB-2002',
      supplierName: 'Andere GmbH',
      supplierOrderEmail: 'orders@other.test',
      supplierEmail: 'office@other.test',
    },
  ]

  it('returns preassigned for high-confidence exact order match', () => {
    const decision = buildAssignmentDecision({
      signals: {
        kind: 'ab',
        confidence: 0.8,
        orderNumbers: ['2026-LAB'],
        projectOrderNumbers: [],
        warnings: [],
        source: 'heuristic',
      },
      senderEmail: 'ab@supplier.test',
      searchableText: 'Auftragsbestaetigung Muster Lieferant',
      candidates,
    })

    expect(decision.status).toBe('preassigned')
    expect(decision.assignedSupplierOrderId).toBe('order-1')
    expect(decision.assignedProjectId).toBe('project-1')
    expect(decision.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('returns needs_review if confidence is too low', () => {
    const decision = buildAssignmentDecision({
      signals: {
        kind: 'unknown',
        confidence: 0.2,
        orderNumbers: [],
        projectOrderNumbers: [],
        warnings: [],
        source: 'heuristic',
      },
      senderEmail: 'unknown@example.com',
      searchableText: 'Beliebiges Dokument',
      candidates,
    })

    expect(decision.status).toBe('needs_review')
    expect(decision.assignedSupplierOrderId).toBeUndefined()
  })
})
