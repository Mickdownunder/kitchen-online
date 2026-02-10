/**
 * Server-Side AI Function Call Handlers
 *
 * These handlers run inside the /api/chat/stream API route on the server.
 * They use the server Supabase client (with user auth from cookies).
 * Unlike the browser handlers, they don't touch React state (setProjects).
 * Instead they return which project IDs were modified so the browser can refresh.
 *
 * Handler implementations are split by domain in ./handlers/:
 *   - projectHandlers.ts     (project CRUD, search, workflow)
 *   - financeHandlers.ts     (payments, invoices, financial amounts)
 *   - itemHandlers.ts        (invoice items / articles on projects)
 *   - entityHandlers.ts      (customers, employees, articles, complaints, company)
 *   - communicationHandlers.ts (email, reminders, appointments, documents)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Import all handler implementations from domain-specific files
import {
  handleCreateProject,
  handleUpdateProjectDetails,
  handleUpdateCustomerInfo,
  handleUpdateWorkflowStatus,
  handleAddProjectNote,
  handleFindProjectsByCriteria,
  handleExecuteWorkflow,
} from './handlers/projectHandlers'

import {
  handleUpdateFinancialAmounts,
  handleUpdatePaymentStatus,
  handleCreatePartialPayment,
  handleUpdatePartialPayment,
  handleCreateFinalInvoice,
  handleUpdateInvoiceNumber,
  handleConfigurePaymentSchedule,
} from './handlers/financeHandlers'

import {
  handleAddItemToProject,
  handleUpdateItem,
} from './handlers/itemHandlers'

import {
  handleCreateComplaint,
  handleUpdateComplaintStatus,
  handleCreateArticle,
  handleUpdateArticle,
  handleCreateSupplier,
  handleListSuppliers,
  handleCreateCustomer,
  handleUpdateCustomer,
  handleCreateEmployee,
  handleUpdateEmployee,
  handleUpdateCompanySettings,
} from './handlers/entityHandlers'

import {
  handleArchiveDocument,
  handleScheduleAppointment,
  handleSendEmail,
  handleSendReminder,
} from './handlers/communicationHandlers'

// ============================================
// Types
// ============================================

type Args = Record<string, unknown>

export interface ServerHandlerResult {
  result: string
  updatedProjectIds?: string[]
  pendingEmail?: PendingEmailInfo
}

export interface PendingEmailInfo {
  functionName: string
  to: string
  subject: string
  bodyPreview: string
  api: string
  payload: Record<string, unknown>
  projectId?: string
  reminderType?: string
}

export type ServerHandler = (
  args: Args,
  supabase: SupabaseClient,
  userId: string
) => Promise<ServerHandlerResult>

// ============================================
// Blocked functions
// ============================================

const blockedFunctions = new Set([
  'deleteProject',
  'deleteComplaint',
  'deleteCustomer',
  'deleteArticle',
  'deleteEmployee',
  'removeItemFromProject',
])

// ============================================
// Shared helpers (exported for handler files)
// ============================================

export function timestamp(): string {
  return new Date().toLocaleDateString('de-DE')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findProject(supabase: SupabaseClient, idOrName: string): Promise<any | null> {
  if (!idOrName) return null

  // Try by UUID
  if (idOrName.length >= 32) {
    const { data } = await supabase.from('projects').select('*').eq('id', idOrName).maybeSingle()
    if (data) return data
  }

  // Try by order number
  const { data: byOrder } = await supabase
    .from('projects')
    .select('*')
    .eq('order_number', idOrName)
    .maybeSingle()
  if (byOrder) return byOrder

  // Try by customer name (partial match)
  const { data: byName } = await supabase
    .from('projects')
    .select('*')
    .ilike('customer_name', `%${idOrName}%`)
    .limit(1)
    .maybeSingle()
  return byName
}

export async function appendProjectNote(
  supabase: SupabaseClient,
  projectId: string,
  note: string
): Promise<void> {
  const { data: project } = await supabase
    .from('projects')
    .select('notes')
    .eq('id', projectId)
    .single()
  const existingNotes = (project?.notes as string) || ''
  await supabase
    .from('projects')
    .update({ notes: `${existingNotes}\n${timestamp()}: ${note}` })
    .eq('id', projectId)
}

// ============================================
// Email Whitelist (server-side)
// ============================================

/**
 * Collects allowed email addresses from projects and employees.
 * This is the server-side equivalent of lib/ai/emailWhitelist.ts
 * but uses the server Supabase client instead of browser services.
 */
export async function getAllowedEmails(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string
): Promise<Set<string>> {
  const allowed = new Set<string>()

  // Collect project emails
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('email')
      .eq('id', projectId)
      .maybeSingle()
    if (project?.email) allowed.add((project.email as string).trim().toLowerCase())
  } else {
    const { data: projects } = await supabase
      .from('projects')
      .select('email')
      .not('email', 'is', null)
    if (projects) {
      for (const p of projects) {
        if (p.email) allowed.add((p.email as string).trim().toLowerCase())
      }
    }
  }

  // Collect employee emails
  const { data: settings } = await supabase
    .from('company_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (settings?.id) {
    const { data: employees } = await supabase
      .from('employees')
      .select('email')
      .eq('company_id', settings.id)
      .eq('is_active', true)
      .not('email', 'is', null)
    if (employees) {
      for (const e of employees) {
        if (e.email) allowed.add((e.email as string).trim().toLowerCase())
      }
    }
  }

  return allowed
}

export function checkEmailWhitelist(
  to: string,
  allowed: Set<string>
): { ok: boolean; blocked: string[] } {
  const addresses = to.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const blocked = addresses.filter(addr => !allowed.has(addr))
  return { ok: blocked.length === 0, blocked }
}

export function formatWhitelistError(blocked: string[]): string {
  return `❌ E-Mail-Adresse(n) "${blocked.join(', ')}" nicht freigegeben. Nur an im Projekt hinterlegte Kunden-E-Mails oder Mitarbeiter-E-Mails erlaubt.`
}

// ============================================
// Audit Logging (server-side, direct to DB)
// ============================================

async function logAuditToDB(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | undefined,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
    })
  } catch (err) {
    // Audit logging should never break the main operation
    logger.error('Failed to write audit log', {
      component: 'serverHandlers',
      error: err instanceof Error ? err.message : 'unknown',
    })
  }
}

export async function getNextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: settings } = await supabase
    .from('company_settings')
    .select('invoice_prefix, next_invoice_number')
    .eq('user_id', userId)
    .maybeSingle()

  const prefix = (settings?.invoice_prefix as string) || 'RE'
  const nextNum = (settings?.next_invoice_number as number) || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  if (settings) {
    await supabase
      .from('company_settings')
      .update({ next_invoice_number: nextNum + 1 })
      .eq('user_id', userId)
  }

  return invoiceNumber
}

// ============================================
// Handler registry
// ============================================

const handlerRegistry: Record<string, ServerHandler> = {
  createProject: handleCreateProject,
  updateProjectDetails: handleUpdateProjectDetails,
  updateCustomerInfo: handleUpdateCustomerInfo,
  updateWorkflowStatus: handleUpdateWorkflowStatus,
  addProjectNote: handleAddProjectNote,
  updateFinancialAmounts: handleUpdateFinancialAmounts,
  updatePaymentStatus: handleUpdatePaymentStatus,
  updateInvoiceNumber: handleUpdateInvoiceNumber,
  createPartialPayment: handleCreatePartialPayment,
  updatePartialPayment: handleUpdatePartialPayment,
  createFinalInvoice: handleCreateFinalInvoice,
  sendReminder: handleSendReminder,
  configurePaymentSchedule: handleConfigurePaymentSchedule,
  addItemToProject: handleAddItemToProject,
  updateItem: handleUpdateItem,
  createComplaint: handleCreateComplaint,
  updateComplaintStatus: handleUpdateComplaintStatus,
  createArticle: handleCreateArticle,
  updateArticle: handleUpdateArticle,
  createSupplier: handleCreateSupplier,
  listSuppliers: handleListSuppliers,
  createCustomer: handleCreateCustomer,
  updateCustomer: handleUpdateCustomer,
  createEmployee: handleCreateEmployee,
  updateEmployee: handleUpdateEmployee,
  updateCompanySettings: handleUpdateCompanySettings,
  archiveDocument: handleArchiveDocument,
  scheduleAppointment: handleScheduleAppointment,
  sendEmail: handleSendEmail,
  executeWorkflow: handleExecuteWorkflow,
  findProjectsByCriteria: handleFindProjectsByCriteria,
}

// ============================================
// Main execution function
// ============================================

export async function executeServerFunctionCall(
  name: string,
  args: Args,
  supabase: SupabaseClient,
  userId: string
): Promise<ServerHandlerResult> {
  // Block dangerous functions
  if (blockedFunctions.has(name)) {
    await logAuditToDB(supabase, userId, 'ai.function_blocked', 'ai_action', undefined, {
      functionName: name,
      reason: 'delete_blocked',
    })
    return { result: '⛔ Löschen ist aus Sicherheitsgründen nur manuell möglich.' }
  }

  const handler = handlerRegistry[name]
  if (!handler) {
    return { result: `⚠️ Unbekannte Aktion „${name}".` }
  }

  const start = Date.now()
  try {
    const result = await handler(args, supabase, userId)
    const duration = Date.now() - start
    const success = result.result.startsWith('✅')

    logger.info('Server function call executed', {
      component: 'serverHandlers',
      functionName: name,
      success,
      duration,
    })

    // Audit log: Write to DB for traceability
    const entityId = (args.projectId as string) || (args.customerId as string) || (args.articleId as string) || undefined
    await logAuditToDB(supabase, userId, 'ai.function_called', 'ai_action', entityId, {
      functionName: name,
      success,
      durationMs: duration,
      result: result.result.slice(0, 200),
      hasPendingEmail: !!result.pendingEmail,
      updatedProjectIds: result.updatedProjectIds,
    })

    return result
  } catch (error) {
    const duration = Date.now() - start
    const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
    logger.error('Server function call failed', {
      component: 'serverHandlers',
      functionName: name,
      error: errMsg,
      duration,
    })

    // Audit log: Write error to DB
    await logAuditToDB(supabase, userId, 'ai.function_failed', 'ai_action', undefined, {
      functionName: name,
      error: errMsg,
      durationMs: duration,
    })

    return { result: `❌ Fehler bei ${name}: ${errMsg}` }
  }
}
