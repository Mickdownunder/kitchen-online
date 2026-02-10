/**
 * Welle 5: Project workflow transitions.
 * Tests pure logic for status/step transitions (computeStepUpdate, pickPersistableFields).
 */

import type { CustomerProject } from '@/types'
import { ProjectStatus } from '@/types'
import { computeStepUpdate, pickPersistableFields } from '@/lib/utils/projectWorkflow'

const TODAY = '2026-02-10'

function baseProject(overrides: Partial<CustomerProject> = {}): CustomerProject {
  return {
    id: 'proj-1',
    status: ProjectStatus.PLANNING,
    isMeasured: false,
    isOrdered: false,
    isDelivered: false,
    isInstallationAssigned: false,
    isCompleted: false,
    measurementDate: undefined,
    orderDate: undefined,
    deliveryDate: undefined,
    installationDate: undefined,
    completionDate: undefined,
    ...overrides,
  } as CustomerProject
}

describe('computeStepUpdate', () => {
  describe('measured', () => {
    it('turning on sets MEASURING and measurementDate', () => {
      const current = baseProject({ status: ProjectStatus.PLANNING, isMeasured: false })
      const out = computeStepUpdate(current, 'measured', TODAY)
      expect(out.status).toBe(ProjectStatus.MEASURING)
      expect(out.isMeasured).toBe(true)
      expect(out.measurementDate).toBe(TODAY)
    })

    it('turning off sets PLANNING and clears measurementDate', () => {
      const current = baseProject({
        status: ProjectStatus.MEASURING,
        isMeasured: true,
        measurementDate: '2026-02-01',
      })
      const out = computeStepUpdate(current, 'measured', TODAY)
      expect(out.status).toBe(ProjectStatus.PLANNING)
      expect(out.isMeasured).toBe(false)
      expect(out.measurementDate).toBeUndefined()
    })
  })

  describe('ordered', () => {
    it('turning on sets ORDERED and cascades isMeasured', () => {
      const current = baseProject({ status: ProjectStatus.MEASURING, isOrdered: false })
      const out = computeStepUpdate(current, 'ordered', TODAY)
      expect(out.status).toBe(ProjectStatus.ORDERED)
      expect(out.isOrdered).toBe(true)
      expect(out.isMeasured).toBe(true)
      expect(out.orderDate).toBe(TODAY)
    })

    it('turning off sets MEASURING', () => {
      const current = baseProject({ status: ProjectStatus.ORDERED, isOrdered: true })
      const out = computeStepUpdate(current, 'ordered', TODAY)
      expect(out.status).toBe(ProjectStatus.MEASURING)
      expect(out.isOrdered).toBe(false)
    })
  })

  describe('delivered', () => {
    it('turning on sets DELIVERY and cascades previous steps', () => {
      const current = baseProject({ status: ProjectStatus.ORDERED, isDelivered: false })
      const out = computeStepUpdate(current, 'delivered', TODAY)
      expect(out.status).toBe(ProjectStatus.DELIVERY)
      expect(out.isDelivered).toBe(true)
      expect(out.isOrdered).toBe(true)
      expect(out.isMeasured).toBe(true)
      expect(out.deliveryDate).toBe(TODAY)
    })

    it('turning off sets ORDERED', () => {
      const current = baseProject({ status: ProjectStatus.DELIVERY, isDelivered: true })
      const out = computeStepUpdate(current, 'delivered', TODAY)
      expect(out.status).toBe(ProjectStatus.ORDERED)
      expect(out.isDelivered).toBe(false)
    })
  })

  describe('installation', () => {
    it('turning on sets INSTALLATION and cascades', () => {
      const current = baseProject({
        status: ProjectStatus.DELIVERY,
        isInstallationAssigned: false,
      })
      const out = computeStepUpdate(current, 'installation', TODAY)
      expect(out.status).toBe(ProjectStatus.INSTALLATION)
      expect(out.isInstallationAssigned).toBe(true)
      expect(out.isDelivered).toBe(true)
      expect(out.installationDate).toBe(TODAY)
    })

    it('turning off sets DELIVERY', () => {
      const current = baseProject({
        status: ProjectStatus.INSTALLATION,
        isInstallationAssigned: true,
      })
      const out = computeStepUpdate(current, 'installation', TODAY)
      expect(out.status).toBe(ProjectStatus.DELIVERY)
      expect(out.isInstallationAssigned).toBe(false)
    })
  })

  describe('completed', () => {
    it('turning on sets COMPLETED and completionDate', () => {
      const current = baseProject({
        status: ProjectStatus.INSTALLATION,
        isCompleted: false,
      })
      const out = computeStepUpdate(current, 'completed', TODAY)
      expect(out.status).toBe(ProjectStatus.COMPLETED)
      expect(out.isCompleted).toBe(true)
      expect(out.completionDate).toBe(TODAY)
    })

    it('turning off sets INSTALLATION', () => {
      const current = baseProject({
        status: ProjectStatus.COMPLETED,
        isCompleted: true,
      })
      const out = computeStepUpdate(current, 'completed', TODAY)
      expect(out.status).toBe(ProjectStatus.INSTALLATION)
      expect(out.isCompleted).toBe(false)
    })
  })

  it('unknown step returns empty object', () => {
    const current = baseProject()
    const out = computeStepUpdate(current, 'unknown' as 'measured', TODAY)
    expect(out).toEqual({})
  })
})

describe('pickPersistableFields', () => {
  it('picks only workflow-persisted fields', () => {
    const updates: Partial<CustomerProject> = {
      status: ProjectStatus.ORDERED,
      isOrdered: true,
      isMeasured: true,
      orderDate: '2026-02-10',
      deliveryDate: '2026-02-15', // not in pick list
      customerName: 'Test', // not workflow
    }
    const out = pickPersistableFields(updates)
    expect(out.status).toBe(ProjectStatus.ORDERED)
    expect(out.isOrdered).toBe(true)
    expect(out.isMeasured).toBe(true)
    expect(out.orderDate).toBe('2026-02-10')
    expect(out.deliveryDate).toBeUndefined()
    expect(out.customerName).toBeUndefined()
  })

  it('includes installationDate and measurementDate when set', () => {
    const updates: Partial<CustomerProject> = {
      measurementDate: '2026-01-01',
      installationDate: '2026-02-01',
    }
    const out = pickPersistableFields(updates)
    expect(out.measurementDate).toBe('2026-01-01')
    expect(out.installationDate).toBe('2026-02-01')
  })

  it('omits undefined values', () => {
    const out = pickPersistableFields({})
    expect(Object.keys(out)).toHaveLength(0)
  })
})
