/**
 * Unit tests for customer name parser utilities.
 */

import { parseCustomerName, formatCustomerName } from '@/lib/utils/customerNameParser'

describe('parseCustomerName', () => {
  it('returns empty object for null, undefined, empty string', () => {
    const empty = { salutation: '', firstName: '', lastName: '' }
    expect(parseCustomerName('')).toEqual(empty)
    expect(parseCustomerName('   ')).toEqual(empty)
  })

  it('parses simple name without salutation', () => {
    expect(parseCustomerName('Max Mustermann')).toEqual({
      salutation: '',
      firstName: 'Max',
      lastName: 'Mustermann',
    })
  })

  it('parses Herr', () => {
    expect(parseCustomerName('Herr Max Mustermann')).toEqual({
      salutation: 'Herr',
      firstName: 'Max',
      lastName: 'Mustermann',
    })
  })

  it('parses Frau', () => {
    expect(parseCustomerName('Frau Maria Musterfrau')).toEqual({
      salutation: 'Frau',
      firstName: 'Maria',
      lastName: 'Musterfrau',
    })
  })

  it('parses Dr.', () => {
    expect(parseCustomerName('Dr. Hans Schmidt')).toEqual({
      salutation: 'Dr.',
      firstName: 'Hans',
      lastName: 'Schmidt',
    })
  })

  it('parses Prof.', () => {
    expect(parseCustomerName('Prof. Anna Weber')).toEqual({
      salutation: 'Prof.',
      firstName: 'Anna',
      lastName: 'Weber',
    })
  })

  it('parses Prof. Dr. (most specific first)', () => {
    expect(parseCustomerName('Prof. Dr. Klaus Müller')).toEqual({
      salutation: 'Prof. Dr.',
      firstName: 'Klaus',
      lastName: 'Müller',
    })
  })

  it('parses Herr und Frau', () => {
    expect(parseCustomerName('Herr und Frau Familie Maier')).toEqual({
      salutation: 'Herr und Frau',
      firstName: 'Familie',
      lastName: 'Maier',
    })
  })

  it('parses Familie', () => {
    expect(parseCustomerName('Familie Maier')).toEqual({
      salutation: 'Familie',
      firstName: 'Maier',
      lastName: '',
    })
  })

  it('parses Firma', () => {
    expect(parseCustomerName('Firma Küchen GmbH')).toEqual({
      salutation: 'Firma',
      firstName: 'Küchen',
      lastName: 'GmbH',
    })
  })

  it('handles multiple last names', () => {
    expect(parseCustomerName('Herr Max von der Heide')).toEqual({
      salutation: 'Herr',
      firstName: 'Max',
      lastName: 'von der Heide',
    })
  })

  it('handles single name after salutation', () => {
    expect(parseCustomerName('Herr Mustermann')).toEqual({
      salutation: 'Herr',
      firstName: 'Mustermann',
      lastName: '',
    })
  })
})

describe('formatCustomerName', () => {
  it('joins all parts', () => {
    expect(formatCustomerName('Herr', 'Max', 'Mustermann')).toBe('Herr Max Mustermann')
  })

  it('filters empty parts', () => {
    expect(formatCustomerName('', 'Max', 'Mustermann')).toBe('Max Mustermann')
    expect(formatCustomerName('Herr', '', 'Mustermann')).toBe('Herr Mustermann')
  })

  it('returns empty string when all empty', () => {
    expect(formatCustomerName('', '', '')).toBe('')
  })

  it('trims result', () => {
    expect(formatCustomerName('Herr', 'Max', '')).toBe('Herr Max')
  })
})
