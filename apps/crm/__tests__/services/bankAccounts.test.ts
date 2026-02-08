/**
 * Unit tests for bank account service.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))

import {
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
} from '@/lib/supabase/services/bankAccounts'

beforeEach(() => {
  resetMock()
})

describe('getBankAccounts', () => {
  it('returns empty array when no accounts', async () => {
    mockQueryResult({ data: [], error: null })

    const result = await getBankAccounts('comp-1')

    expect(result).toEqual([])
  })

  it('returns mapped bank accounts', async () => {
    mockQueryResult({
      data: [
        {
          id: 'ba-1',
          company_id: 'comp-1',
          bank_name: 'Sparkasse',
          account_holder: 'Firma GmbH',
          iban: 'AT123456789',
          bic: 'SPKDAT2K',
          is_default: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ],
      error: null,
    })

    const result = await getBankAccounts('comp-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ba-1')
    expect(result[0].bankName).toBe('Sparkasse')
    expect(result[0].accountHolder).toBe('Firma GmbH')
    expect(result[0].iban).toBe('AT123456789')
    expect(result[0].isDefault).toBe(true)
  })

  it('throws when query errors', async () => {
    mockQueryResult({ data: null, error: { message: 'DB error' } })

    await expect(getBankAccounts('comp-1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('saveBankAccount', () => {
  it('inserts new account when no id', async () => {
    mockQueryResult({
      data: {
        id: 'ba-new',
        company_id: 'comp-1',
        bank_name: 'Raiffeisen',
        account_holder: 'Test GmbH',
        iban: 'AT987654321',
        bic: null,
        is_default: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    })

    const result = await saveBankAccount({
      companyId: 'comp-1',
      bankName: 'Raiffeisen',
      accountHolder: 'Test GmbH',
      iban: 'AT987654321',
    })

    expect(result.id).toBe('ba-new')
    expect(result.bankName).toBe('Raiffeisen')
  })

  it('updates existing account when id provided', async () => {
    mockQueryResult({
      data: {
        id: 'ba-1',
        company_id: 'comp-1',
        bank_name: 'Updated Bank',
        account_holder: 'Updated Holder',
        iban: 'AT111111111',
        bic: null,
        is_default: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      error: null,
    })

    const result = await saveBankAccount({
      id: 'ba-1',
      bankName: 'Updated Bank',
      accountHolder: 'Updated Holder',
      iban: 'AT111111111',
    })

    expect(result.id).toBe('ba-1')
    expect(result.bankName).toBe('Updated Bank')
  })

  it('throws when insert errors', async () => {
    mockQueryResult({ data: null, error: { message: 'Insert failed' } })

    await expect(
      saveBankAccount({ companyId: 'comp-1', bankName: 'X', accountHolder: 'Y', iban: 'AT1' })
    ).rejects.toEqual({ message: 'Insert failed' })
  })
})

describe('deleteBankAccount', () => {
  it('succeeds when delete works', async () => {
    mockQueryResult({ data: null, error: null })

    await expect(deleteBankAccount('ba-1')).resolves.toBeUndefined()
  })

  it('throws when delete errors', async () => {
    mockQueryResult({ data: null, error: { message: 'Delete failed' } })

    await expect(deleteBankAccount('ba-1')).rejects.toEqual({ message: 'Delete failed' })
  })
})
