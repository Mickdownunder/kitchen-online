import { PublishRequestSchema } from '@/app/api/portal/publish-document/schema'

const baseProject = {
  id: 'project-1',
  customerName: 'Max Mustermann',
}

describe('PublishRequestSchema', () => {
  it('accepts a valid invoice payload', () => {
    const result = PublishRequestSchema.safeParse({
      documentType: 'invoice',
      projectId: 'project-1',
      project: baseProject,
      invoice: {
        id: 'inv-1',
        invoiceNumber: 'R-2026-001',
        type: 'final',
        amount: '1250',
        date: '2026-02-10',
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invoice?.amount).toBe(1250)
    }
  })

  it('rejects invoice documentType when invoice is missing', () => {
    const result = PublishRequestSchema.safeParse({
      documentType: 'invoice',
      projectId: 'project-1',
      project: baseProject,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'invoice')).toBe(true)
    }
  })

  it('rejects delivery_note documentType when deliveryNote is missing', () => {
    const result = PublishRequestSchema.safeParse({
      documentType: 'delivery_note',
      projectId: 'project-1',
      project: baseProject,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'deliveryNote')).toBe(true)
    }
  })

  it('rejects payload when project.id does not match projectId', () => {
    const result = PublishRequestSchema.safeParse({
      documentType: 'order',
      projectId: 'project-1',
      project: {
        ...baseProject,
        id: 'project-2',
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'project.id')).toBe(true)
    }
  })
})
