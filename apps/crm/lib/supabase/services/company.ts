import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../client'
import { BankAccount, CompanySettings, Employee } from '@/types'
import { getCurrentUser } from './auth'
import { audit, logAudit } from '@/lib/utils/auditLogger'
import { logger } from '@/lib/utils/logger'

export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Ignore aborted requests
    const errObj = error as Error & { code?: string }
    if (error && errObj.code !== 'PGRST116') {
      // Check if it's an AbortError
      if (error?.message?.includes('aborted') || errObj.name === 'AbortError') {
        return null
      }
      logger.error('Error loading company settings', { component: 'company' }, error as Error)
      return null
    }

    return data ? mapCompanySettingsFromDB(data) : null
  } catch (error: unknown) {
    // Ignore aborted requests
    const errMessage = error instanceof Error ? error.message : ''
    const errName = error instanceof Error ? error.name : ''
    if (errMessage.includes('aborted') || errName === 'AbortError') {
      return null
    }
    logger.error('Error loading company settings', { component: 'company' }, error as Error)
    return null
  }
}

/**
 * Lädt Firmeneinstellungen per company_settings.id (company_id aus get_current_company_id).
 * Für API-Routes: Server-Client übergeben, da getCompanySettings() mit Browser-Client in API-Kontext oft null liefert.
 */
export async function getCompanySettingsById(
  companyId: string,
  client?: SupabaseClient
): Promise<CompanySettings | null> {
  try {
    const sb = client ?? supabase
    const { data, error } = await sb
      .from('company_settings')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) {
      logger.error('Error loading company settings by id', { component: 'company', companyId }, error as Error)
      return null
    }
    return data ? mapCompanySettingsFromDB(data) : null
  } catch (error: unknown) {
    logger.error('Error loading company settings by id', { component: 'company', companyId }, error as Error)
    return null
  }
}

export async function saveCompanySettings(
  settings: Partial<CompanySettings>
): Promise<CompanySettings> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const dbData = {
    user_id: user.id,
    company_name: settings.companyName,
    display_name: settings.displayName,
    legal_form: settings.legalForm,
    street: settings.street,
    house_number: settings.houseNumber,
    postal_code: settings.postalCode,
    city: settings.city,
    country: settings.country,
    phone: settings.phone,
    fax: settings.fax,
    email: settings.email,
    website: settings.website,
    uid: settings.uid,
    company_register_number: settings.companyRegisterNumber,
    court: settings.court,
    tax_number: settings.taxNumber,
    logo_url: settings.logoUrl,
    logo_base64: settings.logoBase64,
    invoice_prefix: settings.invoicePrefix,
    offer_prefix: settings.offerPrefix,
    default_payment_terms: settings.defaultPaymentTerms,
    default_tax_rate: settings.defaultTaxRate,
    payment_terms_options: settings.paymentTermsOptions || [0, 7, 14, 30, 60],
    invoice_footer_text: settings.invoiceFooterText,
    agb_text: settings.agbText ?? null,
    order_footer_templates: settings.orderFooterTemplates ?? [],
    reminder_days_between_first: settings.reminderDaysBetweenFirst,
    reminder_days_between_second: settings.reminderDaysBetweenSecond,
    reminder_days_between_final: settings.reminderDaysBetweenFinal,
    reminder_late_payment_interest: settings.reminderLatePaymentInterest,
    reminder_email_template: settings.reminderEmailTemplate,
    next_invoice_number: settings.nextInvoiceNumber,
    order_prefix: settings.orderPrefix,
    next_order_number: settings.nextOrderNumber,
    delivery_note_prefix: settings.deliveryNotePrefix,
    next_delivery_note_number: settings.nextDeliveryNoteNumber,
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('company_settings')
    .upsert(dbData as any, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error

  const savedSettings = mapCompanySettingsFromDB(data)

  // Audit logging
  audit.companySettingsUpdated(savedSettings.id, {}, {
    companyName: savedSettings.companyName,
    updatedFields: Object.keys(settings).filter(k => settings[k as keyof typeof settings] !== undefined),
  })

  return savedSettings
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompanySettingsFromDB(db: Record<string, any>): CompanySettings {
  return {
    id: db.id,
    userId: db.user_id,
    companyName: db.company_name,
    displayName: db.display_name,
    legalForm: db.legal_form,
    street: db.street,
    houseNumber: db.house_number,
    postalCode: db.postal_code,
    city: db.city,
    country: db.country,
    phone: db.phone,
    fax: db.fax,
    email: db.email,
    website: db.website,
    uid: db.uid,
    companyRegisterNumber: db.company_register_number,
    court: db.court,
    taxNumber: db.tax_number,
    logoUrl: db.logo_url,
    logoBase64: db.logo_base64,
    invoicePrefix: db.invoice_prefix,
    offerPrefix: db.offer_prefix,
    defaultPaymentTerms: db.default_payment_terms,
    defaultTaxRate: db.default_tax_rate,
    paymentTermsOptions: db.payment_terms_options || [0, 7, 14, 30, 60],
    invoiceFooterText: db.invoice_footer_text,
    agbText: db.agb_text ?? undefined,
    orderFooterTemplates: Array.isArray(db.order_footer_templates) ? db.order_footer_templates : [],
    reminderDaysBetweenFirst: db.reminder_days_between_first,
    reminderDaysBetweenSecond: db.reminder_days_between_second,
    reminderDaysBetweenFinal: db.reminder_days_between_final,
    reminderLatePaymentInterest: db.reminder_late_payment_interest,
    reminderEmailTemplate: db.reminder_email_template,
    nextInvoiceNumber: db.next_invoice_number ?? 1,
    orderPrefix: db.order_prefix,
    nextOrderNumber: db.next_order_number ?? 1,
    deliveryNotePrefix: db.delivery_note_prefix,
    nextDeliveryNoteNumber: db.next_delivery_note_number ?? 1,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

// ============================================
// FORTLAUFENDE RECHNUNGSNUMMERN
// ============================================

/**
 * Extrahiert die laufende Nummer aus Rechnungsnummern.
 * Unterstützt: R2026-1108, R-2026-1108, R-2026-1001-A1 (nimmt Basisnummer).
 */
function parseInvoiceNumberSegment(year: number, invoiceNumber: string): number | null {
  if (!invoiceNumber?.trim()) return null
  const match = invoiceNumber.match(new RegExp(`${year}-(\\d+)`))
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Generiert die nächste freie Rechnungsnummer (füllt Lücken: gelöschte Nummern werden wiederverwendet).
 * Format: {prefix}{jahr}-{nummer} z.B. "R-2026-0001"
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, invoice_prefix, next_invoice_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.invoice_prefix || 'R-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)

  const used = new Set<number>()
  for (const row of existing || []) {
    const n = parseInvoiceNumberSegment(year, row.invoice_number ?? '')
    if (n != null) used.add(n)
  }

  const maxUsed = used.size > 0 ? Math.max(...used) : 0
  let n = 1
  while (n <= maxUsed && used.has(n)) n++
  if (n > maxUsed) n = maxUsed + 1

  const invoiceNumber = `${prefix}${year}-${String(n).padStart(4, '0')}`

  const nextCounter = Math.max(settings.next_invoice_number || 1, n + 1)
  const { error: updateError } = await supabase
    .from('company_settings')
    .update({
      next_invoice_number: nextCounter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id)

  if (updateError) {
    throw new Error('Fehler beim Aktualisieren des Rechnungszählers: ' + updateError.message)
  }

  return invoiceNumber
}

/**
 * Gibt die nächste freie Rechnungsnummer zurück, ohne sie zu vergeben (Vorschau).
 * Berücksichtigt Lücken wie getNextInvoiceNumber.
 */
export async function peekNextInvoiceNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) return 'R-' + new Date().getFullYear() + '-0001'

  const settings = await getCompanySettings()
  if (!settings) return 'R-' + new Date().getFullYear() + '-0001'

  const prefix = settings.invoicePrefix || 'R-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', user.id)

  const used = new Set<number>()
  for (const row of existing || []) {
    const n = parseInvoiceNumberSegment(year, row.invoice_number ?? '')
    if (n != null) used.add(n)
  }

  const maxUsed = used.size > 0 ? Math.max(...used) : 0
  let n = 1
  while (n <= maxUsed && used.has(n)) n++
  if (n > maxUsed) n = maxUsed + 1

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

// ============================================
// FORTLAUFENDE AUFTRAGSNUMMERN
// ============================================

/**
 * Extrahiert die laufende Nummer aus Auftragsnummern (K2026-0001, K-2026-0001, etc.).
 */
function parseOrderNumberSegment(year: number, orderNumber: string): number | null {
  if (!orderNumber?.trim()) return null
  const match = orderNumber.match(new RegExp(`${year}-(\\d+)`))
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Generiert die nächste freie Auftragsnummer (füllt Lücken: gelöschte Nummern werden wiederverwendet).
 * Format: {prefix}{jahr}-{nummer} z.B. "K-2026-0001"
 */
export async function getNextOrderNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, order_prefix, next_order_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.order_prefix || 'K-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('projects')
    .select('order_number')
    .eq('user_id', user.id)

  const used = new Set<number>()
  for (const row of existing || []) {
    const n = parseOrderNumberSegment(year, row.order_number ?? '')
    if (n != null) used.add(n)
  }

  const maxUsed = used.size > 0 ? Math.max(...used) : 0
  let n = 1
  while (n <= maxUsed && used.has(n)) n++
  if (n > maxUsed) n = maxUsed + 1

  const orderNumber = `${prefix}${year}-${String(n).padStart(4, '0')}`

  const nextCounter = Math.max(settings.next_order_number || 1, n + 1)
  const { error: updateError } = await supabase
    .from('company_settings')
    .update({
      next_order_number: nextCounter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id)

  if (updateError) {
    throw new Error('Fehler beim Aktualisieren des Auftragszählers: ' + updateError.message)
  }

  return orderNumber
}

/**
 * Gibt die nächste freie Auftragsnummer zurück, ohne sie zu vergeben (Vorschau).
 */
export async function peekNextOrderNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) return 'K-' + new Date().getFullYear() + '-0001'

  const settings = await getCompanySettings()
  if (!settings) return 'K-' + new Date().getFullYear() + '-0001'

  const prefix = settings.orderPrefix || 'K-'
  const year = new Date().getFullYear()

  const { data: existing } = await supabase
    .from('projects')
    .select('order_number')
    .eq('user_id', user.id)

  const used = new Set<number>()
  for (const row of existing || []) {
    const n = parseOrderNumberSegment(year, row.order_number ?? '')
    if (n != null) used.add(n)
  }

  const maxUsed = used.size > 0 ? Math.max(...used) : 0
  let n = 1
  while (n <= maxUsed && used.has(n)) n++
  if (n > maxUsed) n = maxUsed + 1

  return `${prefix}${year}-${String(n).padStart(4, '0')}`
}

// ============================================
// FORTLAUFENDE LIEFERSCHEINNUMMERN
// ============================================

/**
 * Generiert die nächste fortlaufende Lieferscheinnummer und erhöht den Zähler.
 * Format: {prefix}{jahr}-{nummer} z.B. "LS-2026-0001"
 */
export async function getNextDeliveryNoteNumber(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data: settings, error: loadError } = await supabase
    .from('company_settings')
    .select('id, delivery_note_prefix, next_delivery_note_number')
    .eq('user_id', user.id)
    .single()

  if (loadError || !settings) {
    throw new Error('Firmeneinstellungen nicht gefunden. Bitte zuerst Einstellungen speichern.')
  }

  const prefix = settings.delivery_note_prefix || 'LS-'
  const currentNumber = settings.next_delivery_note_number || 1
  const year = new Date().getFullYear()
  const deliveryNoteNumber = `${prefix}${year}-${String(currentNumber).padStart(4, '0')}`

  const { error: updateError } = await supabase
    .from('company_settings')
    .update({
      next_delivery_note_number: currentNumber + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id)

  if (updateError) {
    throw new Error('Fehler beim Aktualisieren des Lieferscheinzählers: ' + updateError.message)
  }

  return deliveryNoteNumber
}

/**
 * Gibt die nächste Lieferscheinnummer zurück, ohne sie zu vergeben.
 */
export async function peekNextDeliveryNoteNumber(): Promise<string> {
  const settings = await getCompanySettings()
  if (!settings) return 'LS-' + new Date().getFullYear() + '-0001'
  const prefix = settings.deliveryNotePrefix || 'LS-'
  const currentNumber = settings.nextDeliveryNoteNumber || 1
  const year = new Date().getFullYear()
  return `${prefix}${year}-${String(currentNumber).padStart(4, '0')}`
}

// ============================================
// BANK ACCOUNTS SERVICES
// ============================================

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

// ============================================
// EMPLOYEES SERVICES
// ============================================

export async function getEmployees(companyId?: string): Promise<Employee[]> {
  // If companyId is provided, use it directly
  if (companyId) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('last_name')

    if (error) throw error
    return (data || []).map(mapEmployeeFromDB)
  }

  // Otherwise, get employees for the current user's company
  const settings = await getCompanySettings()
  if (!settings?.id) {
    return []
  }

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', settings.id)
    .order('last_name')

  if (error) throw error
  return (data || []).map(mapEmployeeFromDB)
}

export async function saveEmployee(employee: Partial<Employee>): Promise<Employee> {
  const dbData = {
    company_id: employee.companyId,
    first_name: employee.firstName,
    last_name: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    department: employee.department,
    is_active: employee.isActive,
    commission_rate: employee.commissionRate,
    notes: employee.notes,
    user_id: employee.userId,
    updated_at: new Date().toISOString(),
  }

  if (employee.id) {
    const { data, error } = await supabase
      .from('employees')
      .update(dbData)
      .eq('id', employee.id)
      .select()
      .single()
    if (error) throw error

    const savedEmployee = mapEmployeeFromDB(data)

    // Audit logging for employee update
    audit.userRoleChanged(employee.id, {}, {
      name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
      role: savedEmployee.role,
      isActive: savedEmployee.isActive,
    })

    return savedEmployee
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('employees').insert(dbData as any).select().single()
    if (error) throw error

    const savedEmployee = mapEmployeeFromDB(data)

    // Audit logging for new employee
    logAudit({
      action: 'employee.created',
      entityType: 'employee',
      entityId: savedEmployee.id,
      changes: {
        after: {
          name: `${savedEmployee.firstName} ${savedEmployee.lastName}`,
          role: savedEmployee.role,
          email: savedEmployee.email,
        },
      },
    })

    return savedEmployee
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployeeFromDB(db: Record<string, any>): Employee {
  return {
    id: db.id,
    companyId: db.company_id,
    firstName: db.first_name,
    lastName: db.last_name,
    email: db.email,
    phone: db.phone,
    role: db.role,
    department: db.department,
    isActive: db.is_active,
    commissionRate: db.commission_rate ? parseFloat(db.commission_rate) : undefined,
    notes: db.notes,
    userId: db.user_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
