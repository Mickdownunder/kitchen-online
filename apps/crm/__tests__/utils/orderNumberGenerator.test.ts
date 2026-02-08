import { generateOrderNumber } from '@/lib/utils/orderNumberGenerator'

describe('generateOrderNumber', () => {
  it('matches format K-YYYY-XXXX', () => {
    const orderNumber = generateOrderNumber()
    expect(orderNumber).toMatch(/^K-\d{4}-\d{4}$/)
  })

  it('uses the current year', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2027-06-15T00:00:00Z'))

    const orderNumber = generateOrderNumber()
    expect(orderNumber).toMatch(/^K-2027-\d{4}$/)

    jest.useRealTimers()
  })

  it('generates random numbers in range 1000-9999', () => {
    const numbers: number[] = []
    for (let i = 0; i < 200; i++) {
      const result = generateOrderNumber()
      const num = parseInt(result.split('-')[2], 10)
      numbers.push(num)
    }

    for (const num of numbers) {
      expect(num).toBeGreaterThanOrEqual(1000)
      expect(num).toBeLessThanOrEqual(9999)
    }
  })

  it('produces varying results (not always the same)', () => {
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(generateOrderNumber())
    }
    // With random 4-digit numbers, 50 calls should produce at least 2 unique values
    expect(results.size).toBeGreaterThan(1)
  })
})
