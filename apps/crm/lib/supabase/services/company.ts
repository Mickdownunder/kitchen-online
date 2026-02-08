/**
 * Company settings service.
 *
 * Core company settings CRUD + company-ID resolution.
 * Domain-specific concerns are split into separate modules:
 *   - numbering.ts     (invoice, order, delivery note number generation)
 *   - bankAccounts.ts  (bank account CRUD)
 *   - employees.ts     (employee CRUD)
 *
 * All functions are re-exported here so that existing import paths
 * (`from '@/lib/supabase/services/company'`) continue to work.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../client'
import { logger } from '@/lib/utils/logger'
import { CompanySettings } from '@/types'
import { getCurrentUser } from './auth'
import { audit } from '@/lib/utils/auditLogger'

// ============================================
// Re-exports (preserves existing import paths)
// ============================================

export {
  getNextInvoiceNumber,
  peekNextInvoiceNumber,
  getNextOrderNumber,
  peekNextOrderNumber,
  getNextDeliveryNoteNumber,
  peekNextDeliveryNoteNumber,
} from './numbering'

export {
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
} from './bankAccounts'

export {
  getEmployees,
  saveEmployee,
  deleteEmployee,
} from './employees'

// ============================================
// Company ID resolution
// ============================================

/**
 * Holt company_id für einen User: zuerst company_members, Fallback company_settings.
 * Für API-Routes: Supabase Service-Client übergeben.
 */
export async function getCompanyIdForUser(
  userId: string,
  client: SupabaseClient
): Promise<string | null> {
  const { data: member, error: memberError } = await client
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (memberError) {
    logger.warn('getCompanyIdForUser company_members error', { userId, error: memberError.message })
  }
  if (member?.company_id) return member.company_id

  const { data: settings, error: settingsError } = await client
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (settingsError) {
    logger.warn('getCompanyIdForUser company_settings error', { userId, error: settingsError.message })
  }
  if (settings?.id) return settings.id

  logger.warn('getCompanyIdForUser no company found', { userId })
  return null
}

// ============================================
// Company Settings CRUD
// ============================================

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
      if (error?.message?.includes('aborted') || errObj.name === 'AbortError') {
        return null
      }
      logger.error('Error loading company settings', { component: 'company' }, error as Error)
      return null
    }

    return data ? mapCompanySettingsFromDB(data) : null
  } catch (error: unknown) {
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

// ============================================
// DB → Application type mapping
// ============================================

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
