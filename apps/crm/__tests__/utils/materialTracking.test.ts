import type { CustomerProject, InvoiceItem } from '@/types'
import { ProjectStatus } from '@/types'
import {
  applyItemMaterialUpdate,
  getItemMaterialSnapshot,
  getUpcomingInstallationMaterialSnapshots,
  resolveItemDeliveryStatus,
} from '@/lib/utils/materialTracking'

function createItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: 'item-1',
    position: 1,
    description: 'Arbeitsplatte',
    quantity: 2,
    unit: 'Stk',
    pricePerUnit: 100,
    taxRate: 20,
    netTotal: 200,
    taxAmount: 40,
    grossTotal: 240,
    ...overrides,
  }
}

function createProject(overrides: Partial<CustomerProject> = {}): CustomerProject {
  return {
    id: 'project-1',
    customerName: 'Testkunde',
    orderNumber: 'K-2026-0001',
    status: ProjectStatus.ORDERED,
    items: [],
    totalAmount: 0,
    netAmount: 0,
    taxAmount: 0,
    depositAmount: 0,
    isDepositPaid: false,
    isFinalPaid: false,
    isMeasured: true,
    isOrdered: true,
    isInstallationAssigned: true,
    documents: [],
    complaints: [],
    notes: '',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveItemDeliveryStatus', () => {
  it('returns delivered when delivered quantity reaches planned quantity', () => {
    const status = resolveItemDeliveryStatus({
      quantity: 2,
      quantityOrdered: 2,
      quantityDelivered: 2,
      currentStatus: 'ordered',
    })

    expect(status).toBe('delivered')
  })

  it('keeps missing marker when item is not yet fully delivered', () => {
    const status = resolveItemDeliveryStatus({
      quantity: 3,
      quantityOrdered: 3,
      quantityDelivered: 1,
      currentStatus: 'missing',
    })

    expect(status).toBe('missing')
  })
})

describe('getItemMaterialSnapshot', () => {
  it('infers ordered quantity from ordered status when no quantity_ordered exists', () => {
    const item = createItem({
      quantity: 4,
      deliveryStatus: 'ordered',
      quantityOrdered: undefined,
      quantityDelivered: 0,
    })

    const snapshot = getItemMaterialSnapshot(item)

    expect(snapshot.orderedQuantity).toBe(4)
    expect(snapshot.isFullyOrdered).toBe(true)
    expect(snapshot.isFullyDelivered).toBe(false)
    expect(snapshot.status).toBe('ordered')
  })
})

describe('applyItemMaterialUpdate', () => {
  it('does not wipe delivered quantity when someone toggles to not_ordered', () => {
    const item = createItem({
      quantity: 2,
      deliveryStatus: 'partially_delivered',
      quantityOrdered: 2,
      quantityDelivered: 1,
    })

    const updates = applyItemMaterialUpdate(item, {
      deliveryStatus: 'not_ordered',
    })

    expect(updates.quantityDelivered).toBe(1)
    expect(updates.deliveryStatus).toBe('partially_delivered')
  })

  it('marks delivered and syncs quantities when delivered is selected', () => {
    const item = createItem({
      quantity: 3,
      deliveryStatus: 'ordered',
      quantityOrdered: 1,
      quantityDelivered: 0,
    })

    const updates = applyItemMaterialUpdate(item, {
      deliveryStatus: 'delivered',
    })

    expect(updates.deliveryStatus).toBe('delivered')
    expect(updates.quantityDelivered).toBe(3)
    expect(updates.quantityOrdered).toBe(3)
  })
})

describe('getUpcomingInstallationMaterialSnapshots', () => {
  const now = new Date('2026-02-10T08:00:00.000Z')

  it('returns projects inside 14-day horizon and sorts by risk first', () => {
    const criticalProject = createProject({
      id: 'critical',
      customerName: 'Critical GmbH',
      orderNumber: 'K-2026-0100',
      installationDate: '2026-02-12',
      items: [
        createItem({
          id: 'critical-item',
          quantity: 2,
          quantityOrdered: 2,
          quantityDelivered: 0,
          deliveryStatus: 'ordered',
        }),
      ],
    })

    const warningProject = createProject({
      id: 'warning',
      customerName: 'Warning GmbH',
      orderNumber: 'K-2026-0101',
      installationDate: '2026-02-20',
      items: [
        createItem({
          id: 'warning-item',
          quantity: 1,
          quantityOrdered: 0,
          quantityDelivered: 0,
          deliveryStatus: 'not_ordered',
        }),
      ],
    })

    const readyProject = createProject({
      id: 'ready',
      customerName: 'Ready GmbH',
      orderNumber: 'K-2026-0102',
      installationDate: '2026-02-13',
      items: [
        createItem({
          id: 'ready-item',
          quantity: 1,
          quantityOrdered: 1,
          quantityDelivered: 1,
          deliveryStatus: 'delivered',
        }),
      ],
    })

    const outOfRangeProject = createProject({
      id: 'future',
      customerName: 'Future GmbH',
      orderNumber: 'K-2026-0199',
      installationDate: '2026-03-10',
      items: [createItem({ id: 'future-item' })],
    })

    const snapshots = getUpcomingInstallationMaterialSnapshots(
      [warningProject, readyProject, criticalProject, outOfRangeProject],
      14,
      now,
    )

    expect(snapshots).toHaveLength(3)
    expect(snapshots[0].projectId).toBe('critical')
    expect(snapshots[0].riskLevel).toBe('critical')
    expect(snapshots[1].projectId).toBe('warning')
    expect(snapshots[1].riskLevel).toBe('warning')
    expect(snapshots[2].projectId).toBe('ready')
    expect(snapshots[2].riskLevel).toBe('ok')
  })
})

