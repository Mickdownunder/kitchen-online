import {
  getDefaultPaymentSchedule,
  validatePaymentSchedule,
  calculatePaymentAmounts,
  isSecondPaymentDue,
  getSecondPaymentDueDate,
  getDaysUntilSecondPaymentDue,
} from '@/lib/utils/paymentSchedule'
import type { CustomerProject, PaymentSchedule } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal CustomerProject stub with required fields for payment tests. */
function makeProject(overrides: Partial<CustomerProject> = {}): CustomerProject {
  return {
    id: 'proj-1',
    customerName: 'Test Kunde',
    items: [],
    totalAmount: 10000,
    netAmount: 8333.33,
    taxAmount: 1666.67,
    depositAmount: 0,
    isDepositPaid: false,
    isFinalPaid: false,
    isMeasured: false,
    isOrdered: false,
    isInstallationAssigned: false,
    status: 'offer',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as CustomerProject
}

function makeSchedule(overrides: Partial<PaymentSchedule> = {}): PaymentSchedule {
  return {
    firstPercent: 40,
    secondPercent: 40,
    finalPercent: 20,
    secondDueDaysBeforeDelivery: 21,
    autoCreateFirst: true,
    autoCreateSecond: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getDefaultPaymentSchedule
// ---------------------------------------------------------------------------
describe('getDefaultPaymentSchedule', () => {
  it('returns 40/40/20 schedule', () => {
    const schedule = getDefaultPaymentSchedule()
    expect(schedule.firstPercent).toBe(40)
    expect(schedule.secondPercent).toBe(40)
    expect(schedule.finalPercent).toBe(20)
  })

  it('sums to 100%', () => {
    const s = getDefaultPaymentSchedule()
    expect(s.firstPercent + s.secondPercent + s.finalPercent).toBe(100)
  })

  it('defaults secondDueDaysBeforeDelivery to 21', () => {
    expect(getDefaultPaymentSchedule().secondDueDaysBeforeDelivery).toBe(21)
  })

  it('returns a new object each call', () => {
    const a = getDefaultPaymentSchedule()
    const b = getDefaultPaymentSchedule()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
// validatePaymentSchedule
// ---------------------------------------------------------------------------
describe('validatePaymentSchedule', () => {
  it('returns true for valid 40/40/20', () => {
    expect(validatePaymentSchedule(makeSchedule())).toBe(true)
  })

  it('returns true for 50/30/20', () => {
    expect(validatePaymentSchedule(makeSchedule({ firstPercent: 50, secondPercent: 30, finalPercent: 20 }))).toBe(true)
  })

  it('returns false when sum exceeds 100', () => {
    expect(validatePaymentSchedule(makeSchedule({ firstPercent: 50, secondPercent: 50, finalPercent: 50 }))).toBe(false)
  })

  it('returns false when sum is below 100', () => {
    expect(validatePaymentSchedule(makeSchedule({ firstPercent: 20, secondPercent: 20, finalPercent: 20 }))).toBe(false)
  })

  it('tolerates floating-point rounding near 100', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(validatePaymentSchedule(
      makeSchedule({ firstPercent: 33.33, secondPercent: 33.33, finalPercent: 33.34 }),
    )).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// calculatePaymentAmounts
// ---------------------------------------------------------------------------
describe('calculatePaymentAmounts', () => {
  it('calculates amounts from 40/40/20 on 10000', () => {
    const project = makeProject({
      totalAmount: 10000,
      paymentSchedule: makeSchedule(),
    })
    const result = calculatePaymentAmounts(project)
    expect(result).toEqual({ first: 4000, second: 4000, final: 2000 })
  })

  it('returns null when project has no paymentSchedule', () => {
    const project = makeProject({ paymentSchedule: undefined })
    expect(calculatePaymentAmounts(project)).toBeNull()
  })

  it('handles non-round amounts', () => {
    const project = makeProject({
      totalAmount: 9999,
      paymentSchedule: makeSchedule({ firstPercent: 33, secondPercent: 33, finalPercent: 34 }),
    })
    const result = calculatePaymentAmounts(project)!
    expect(result.first).toBe(3299.67)
    expect(result.second).toBe(3299.67)
    expect(result.final).toBe(3399.66)
  })

  it('handles totalAmount = 0', () => {
    const project = makeProject({ totalAmount: 0, paymentSchedule: makeSchedule() })
    const result = calculatePaymentAmounts(project)
    expect(result).toEqual({ first: 0, second: 0, final: 0 })
  })
})

// ---------------------------------------------------------------------------
// isSecondPaymentDue
// ---------------------------------------------------------------------------
describe('isSecondPaymentDue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns false when no paymentSchedule', () => {
    const project = makeProject({ deliveryDate: '2026-03-01' })
    expect(isSecondPaymentDue(project)).toBe(false)
  })

  it('returns false when no deliveryDate', () => {
    const project = makeProject({ paymentSchedule: makeSchedule() })
    expect(isSecondPaymentDue(project)).toBe(false)
  })

  it('returns false when secondPaymentCreated is true', () => {
    const project = makeProject({
      paymentSchedule: makeSchedule(),
      deliveryDate: '2026-02-01',
      secondPaymentCreated: true,
    })
    expect(isSecondPaymentDue(project)).toBe(false)
  })

  it('returns true when today is past the due date', () => {
    // deliveryDate = March 1, secondDueDaysBeforeDelivery = 21
    // dueDate = Feb 8 => today Feb 10 -> due
    jest.setSystemTime(new Date('2026-02-10T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(isSecondPaymentDue(project)).toBe(true)
  })

  it('returns false when today is before the due date', () => {
    // dueDate = March 1 - 21 = Feb 8
    // today = Feb 1 -> not yet due
    jest.setSystemTime(new Date('2026-02-01T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(isSecondPaymentDue(project)).toBe(false)
  })

  it('returns true on the exact due date', () => {
    // dueDate = March 1 - 21 = Feb 8
    jest.setSystemTime(new Date('2026-02-08T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(isSecondPaymentDue(project)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getSecondPaymentDueDate
// ---------------------------------------------------------------------------
describe('getSecondPaymentDueDate', () => {
  it('returns null when no paymentSchedule', () => {
    const project = makeProject({ deliveryDate: '2026-03-01' })
    expect(getSecondPaymentDueDate(project)).toBeNull()
  })

  it('returns null when no deliveryDate', () => {
    const project = makeProject({ paymentSchedule: makeSchedule() })
    expect(getSecondPaymentDueDate(project)).toBeNull()
  })

  it('calculates due date correctly', () => {
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    const dueDate = getSecondPaymentDueDate(project)!
    // March 1 - 21 days = Feb 8
    expect(dueDate.getFullYear()).toBe(2026)
    expect(dueDate.getMonth()).toBe(1) // Feb = 1
    expect(dueDate.getDate()).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// getDaysUntilSecondPaymentDue
// ---------------------------------------------------------------------------
describe('getDaysUntilSecondPaymentDue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns null when no paymentSchedule', () => {
    const project = makeProject({ deliveryDate: '2026-03-01' })
    expect(getDaysUntilSecondPaymentDue(project)).toBeNull()
  })

  it('returns null when no deliveryDate', () => {
    const project = makeProject({ paymentSchedule: makeSchedule() })
    expect(getDaysUntilSecondPaymentDue(project)).toBeNull()
  })

  it('returns positive days when due date is in the future', () => {
    // dueDate = Feb 8, today = Feb 1 => 7 days
    jest.setSystemTime(new Date('2026-02-01T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(getDaysUntilSecondPaymentDue(project)).toBe(7)
  })

  it('returns negative days when due date is in the past', () => {
    // dueDate = Feb 8, today = Feb 15 => -7
    jest.setSystemTime(new Date('2026-02-15T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(getDaysUntilSecondPaymentDue(project)).toBe(-7)
  })

  it('returns 0 on the exact due date', () => {
    jest.setSystemTime(new Date('2026-02-08T12:00:00Z'))
    const project = makeProject({
      paymentSchedule: makeSchedule({ secondDueDaysBeforeDelivery: 21 }),
      deliveryDate: '2026-03-01',
    })
    expect(getDaysUntilSecondPaymentDue(project)).toBe(0)
  })
})
