/**
 * Unit tests for address formatter utilities.
 */

import {
  formatCustomerAddress,
  parseAddressFromDB,
  formatAddressForDB,
  type ParsedAddress,
} from '@/lib/utils/addressFormatter'
import type { Customer } from '@/types'

describe('formatCustomerAddress', () => {
  it('returns empty string when customer is null', () => {
    expect(formatCustomerAddress(null as never)).toBe('')
  })

  it('returns empty string when customer has no address', () => {
    expect(formatCustomerAddress({} as Customer)).toBe('')
    expect(formatCustomerAddress({ address: undefined } as unknown as Customer)).toBe('')
  })

  it('formats address with street, house number, postal code, city', () => {
    const customer: Customer = {
      id: '1',
      firstName: 'Max',
      lastName: 'Mustermann',
      address: {
        street: 'Musterstraße',
        houseNumber: '42',
        postalCode: '1010',
        city: 'Wien',
      },
      contact: { phone: '', email: '' },
      createdAt: '',
      updatedAt: '',
    }
    expect(formatCustomerAddress(customer)).toBe('Musterstraße 42, 1010, Wien')
  })

  it('formats address without house number', () => {
    const customer: Customer = {
      id: '1',
      firstName: 'Max',
      lastName: 'Mustermann',
      address: {
        street: 'Musterstraße',
        postalCode: '1010',
        city: 'Wien',
      },
      contact: { phone: '', email: '' },
      createdAt: '',
      updatedAt: '',
    }
    expect(formatCustomerAddress(customer)).toBe('Musterstraße, 1010, Wien')
  })

  it('filters out empty parts', () => {
    const customer: Customer = {
      id: '1',
      firstName: 'Max',
      lastName: 'Mustermann',
      address: {
        street: 'Musterstraße',
        houseNumber: '',
        postalCode: '',
        city: 'Wien',
      },
      contact: { phone: '', email: '' },
      createdAt: '',
      updatedAt: '',
    }
    expect(formatCustomerAddress(customer)).toBe('Musterstraße, Wien')
  })
})

describe('parseAddressFromDB', () => {
  const empty: ParsedAddress = { street: '', houseNumber: '', postalCode: '', city: '' }

  it('returns empty object for null, undefined, or empty string', () => {
    expect(parseAddressFromDB(null)).toEqual(empty)
    expect(parseAddressFromDB(undefined)).toEqual(empty)
    expect(parseAddressFromDB('')).toEqual(empty)
    expect(parseAddressFromDB('   ')).toEqual(empty)
  })

  it('returns empty object for non-string input', () => {
    expect(parseAddressFromDB(123 as never)).toEqual(empty)
  })

  it('parses full address format "Straße Hausnr, PLZ Stadt"', () => {
    expect(parseAddressFromDB('Musterstraße 42, 1010 Wien')).toEqual({
      street: 'Musterstraße',
      houseNumber: '42',
      postalCode: '1010',
      city: 'Wien',
    })
  })

  it('parses address without comma (street + house only)', () => {
    expect(parseAddressFromDB('Musterstraße 42')).toEqual({
      street: 'Musterstraße',
      houseNumber: '42',
      postalCode: '',
      city: '',
    })
  })

  it('parses address with 5-digit postal code', () => {
    expect(parseAddressFromDB('Hauptstraße 1, 12345 Berlin')).toEqual({
      street: 'Hauptstraße',
      houseNumber: '1',
      postalCode: '12345',
      city: 'Berlin',
    })
  })

  it('handles street with comma present', () => {
    const result = parseAddressFromDB('Lange Straße, 1010 Wien')
    expect(result.postalCode).toBe('1010')
    expect(result.city).toBe('Wien')
    expect(result.street).toBeDefined()
    expect(result.houseNumber).toBeDefined()
  })

  it('trims whitespace', () => {
    expect(parseAddressFromDB('  Musterstraße 42 , 1010 Wien  ')).toEqual({
      street: 'Musterstraße',
      houseNumber: '42',
      postalCode: '1010',
      city: 'Wien',
    })
  })
})

describe('formatAddressForDB', () => {
  it('builds full address from parts', () => {
    expect(formatAddressForDB('Musterstraße', '42', '1010', 'Wien')).toBe(
      'Musterstraße 42, 1010 Wien'
    )
  })

  it('handles missing optional parts', () => {
    expect(formatAddressForDB('Musterstraße', undefined, '1010', 'Wien')).toBe(
      'Musterstraße, 1010 Wien'
    )
  })

  it('returns empty string when all parts empty', () => {
    expect(formatAddressForDB()).toBe('')
  })

  it('filters empty strings', () => {
    expect(formatAddressForDB('', '42', '', 'Wien')).toBe('42, Wien')
  })
})
