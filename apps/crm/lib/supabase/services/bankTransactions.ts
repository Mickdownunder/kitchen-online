/**
 * Bank Transactions Service
 * Kontobewegungen für Bankabgleich (Monatsliste PDF)
 * amount > 0 = Gutschrift (Eingang), amount < 0 = Abbuchung (Ausgang)
 */

import { supabase } from '../client'
import { BankTransaction } from '@/types'
import { getCurrentUser } from './auth'
import { markSupplierInvoicePaid } from './supplierInvoices'
import { markInvoicePaid } from './invoices'
import { logger } from '@/lib/utils/logger'

interface DBBankTransaction {
  id: string
  user_id: string
  bank_account_id: string | null
  transaction_date: string
  amount: number
  reference: string | null
  counterparty_name: string | null
  counterparty_iban: string | null
  supplier_invoice_id: string | null
  invoice_id: string | null
  created_at: string
  updated_at: string
}

function mapFromDB(row: DBBankTransaction): BankTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    bankAccountId: row.bank_account_id || null,
    transactionDate: row.transaction_date,
    amount: parseFloat(String(row.amount)) || 0,
    reference: row.reference || null,
    counterpartyName: row.counterparty_name || null,
    counterpartyIban: row.counterparty_iban || null,
    supplierInvoiceId: row.supplier_invoice_id || null,
    invoiceId: row.invoice_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Liste aller Kontobewegungen (optional gefiltert nach Konto/Zeitraum)
 */
export async function getBankTransactions(options?: {
  bankAccountId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}): Promise<BankTransaction[]> {
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('bank_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.bankAccountId) {
    query = query.eq('bank_account_id', options.bankAccountId)
  }
  if (options?.dateFrom) {
    query = query.gte('transaction_date', options.dateFrom)
  }
  if (options?.dateTo) {
    query = query.lte('transaction_date', options.dateTo)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching bank transactions', { component: 'bankTransactions' }, error as Error)
    return []
  }

  return (data as DBBankTransaction[]).map(mapFromDB)
}

/**
 * Eine Kontobewegung laden
 */
export async function getBankTransaction(id: string): Promise<BankTransaction | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null
    logger.error('Error fetching bank transaction', { component: 'bankTransactions' }, error as Error)
    return null
  }

  return mapFromDB(data as DBBankTransaction)
}

export interface CreateBankTransactionInput {
  bankAccountId?: string | null
  transactionDate: string
  amount: number
  reference?: string | null
  counterpartyName?: string | null
  counterpartyIban?: string | null
}

/**
 * Eine Kontobewegung anlegen (z. B. nach PDF-Import)
 */
export async function createBankTransaction(
  input: CreateBankTransactionInput
): Promise<BankTransaction> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data, error } = await supabase
    .from('bank_transactions')
    .insert({
      user_id: user.id,
      bank_account_id: input.bankAccountId || null,
      transaction_date: input.transactionDate,
      amount: input.amount,
      reference: input.reference || null,
      counterparty_name: input.counterpartyName || null,
      counterparty_iban: input.counterpartyIban || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapFromDB(data as DBBankTransaction)
}

/**
 * Mehrere Kontobewegungen anlegen (Batch nach PDF-Import)
 */
export async function createBankTransactions(
  inputs: CreateBankTransactionInput[]
): Promise<BankTransaction[]> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  if (inputs.length === 0) return []

  const rows = inputs.map(input => ({
    user_id: user.id,
    bank_account_id: input.bankAccountId || null,
    transaction_date: input.transactionDate,
    amount: input.amount,
    reference: input.reference || null,
    counterparty_name: input.counterpartyName || null,
    counterparty_iban: input.counterpartyIban || null,
  }))

  const { data, error } = await supabase.from('bank_transactions').insert(rows).select()

  if (error) throw error
  return (data as DBBankTransaction[]).map(mapFromDB)
}

/**
 * Bewegung einer Eingangsrechnung zuordnen und als bezahlt markieren
 */
export async function assignTransactionToSupplierInvoice(
  transactionId: string,
  supplierInvoiceId: string
): Promise<BankTransaction> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: tx, error: fetchError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !tx) throw new Error('Kontobewegung nicht gefunden')

  const { data, error } = await supabase
    .from('bank_transactions')
    .update({
      supplier_invoice_id: supplierInvoiceId,
      invoice_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  await markSupplierInvoicePaid(supplierInvoiceId, (tx as DBBankTransaction).transaction_date)

  return mapFromDB(data as DBBankTransaction)
}

/**
 * Bewegung einer Ausgangsrechnung zuordnen und als bezahlt markieren
 */
export async function assignTransactionToOutgoingInvoice(
  transactionId: string,
  invoiceId: string
): Promise<BankTransaction> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: tx, error: fetchError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !tx) throw new Error('Kontobewegung nicht gefunden')

  const { data, error } = await supabase
    .from('bank_transactions')
    .update({
      invoice_id: invoiceId,
      supplier_invoice_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error

  await markInvoicePaid(invoiceId, (tx as DBBankTransaction).transaction_date)

  return mapFromDB(data as DBBankTransaction)
}

/**
 * Zuordnung einer Bewegung aufheben (Rechnung bleibt bezahlt – nur Verknüpfung lösen)
 */
export async function unassignTransaction(transactionId: string): Promise<BankTransaction> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data, error } = await supabase
    .from('bank_transactions')
    .update({
      supplier_invoice_id: null,
      invoice_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return mapFromDB(data as DBBankTransaction)
}

/**
 * Eine Kontobewegung löschen
 */
export async function deleteBankTransaction(id: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { error } = await supabase
    .from('bank_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}
