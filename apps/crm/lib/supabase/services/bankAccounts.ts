/**
 * Bank account CRUD operations.
 */

import { supabase } from '../client'
import { BankAccount } from '@/types'
import type { Database } from '@/types/database.types'

type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row']
type BankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert']

function mapBankAccountFromDB(db: BankAccountRow): BankAccount {
  return {
    id: String(db.id ?? ''),
    companyId: String(db.company_id ?? ''),
    bankName: String(db.bank_name ?? ''),
    accountHolder: String(db.account_holder ?? ''),
    iban: String(db.iban ?? ''),
    bic: String(db.bic ?? ''),
    isDefault: Boolean(db.is_default),
    createdAt: String(db.created_at ?? ''),
    updatedAt: String(db.updated_at ?? ''),
  }
}

export async function getBankAccounts(companyId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })

  if (error) throw error
  return (data || []).map(mapBankAccountFromDB)
}

export async function saveBankAccount(account: Partial<BankAccount>): Promise<BankAccount> {
  const dbData: BankAccountInsert = {
    company_id: account.companyId ?? '',
    bank_name: account.bankName ?? '',
    account_holder: account.accountHolder ?? '',
    iban: account.iban ?? '',
    bic: account.bic ?? '',
    is_default: account.isDefault ?? false,
    updated_at: new Date().toISOString(),
  }

  if (account.id) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(dbData)
      .eq('id', account.id)
      .select()
      .single()
    if (error) throw error
    return mapBankAccountFromDB(data)
  } else {
    const { data, error } = await supabase.from('bank_accounts').insert(dbData).select().single()
    if (error) throw error
    return mapBankAccountFromDB(data)
  }
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
  if (error) throw error
}
