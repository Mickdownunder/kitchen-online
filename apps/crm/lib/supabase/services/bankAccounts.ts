/**
 * Bank account CRUD operations.
 */

import { supabase } from '../client'
import { BankAccount } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBankAccountFromDB(db: Record<string, any>): BankAccount {
  return {
    id: db.id,
    companyId: db.company_id,
    bankName: db.bank_name,
    accountHolder: db.account_holder,
    iban: db.iban,
    bic: db.bic,
    isDefault: db.is_default,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
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
  const dbData = {
    company_id: account.companyId,
    bank_name: account.bankName,
    account_holder: account.accountHolder,
    iban: account.iban,
    bic: account.bic,
    is_default: account.isDefault,
    updated_at: new Date().toISOString(),
  }

  if (account.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(dbData as any)
      .eq('id', account.id)
      .select()
      .single()
    if (error) throw error
    return mapBankAccountFromDB(data)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('bank_accounts').insert(dbData as any).select().single()
    if (error) throw error
    return mapBankAccountFromDB(data)
  }
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
  if (error) throw error
}
