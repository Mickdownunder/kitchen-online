import type React from 'react'
import type { CustomerProject, PlanningAppointment } from '@/types'
import {
  type FunctionCallArgs,
  type HandlerContext,
  createFindProject,
  getTimestamp,
} from './utils/handlerTypes'

// Import handlers
import {
  handleCreateProject,
  handleUpdateProjectDetails,
  handleUpdateCustomerInfo,
  handleUpdateWorkflowStatus,
  handleAddProjectNote,
  handleUpdateFinancialAmounts,
  handleUpdatePaymentStatus,
  handleUpdateInvoiceNumber,
} from './handlers/projectHandlers'

import {
  handleCreatePartialPayment,
  handleUpdatePartialPayment,
  handleCreateFinalInvoice,
  handleSendReminder,
  handleConfigurePaymentSchedule,
} from './handlers/financialHandlers'

import { handleAddItemToProject, handleUpdateItem } from './handlers/itemHandlers'

import { handleCreateComplaint, handleUpdateComplaintStatus } from './handlers/complaintHandlers'

import {
  handleCreateArticle,
  handleUpdateArticle,
  handleCreateCustomer,
  handleUpdateCustomer,
  handleCreateEmployee,
  handleUpdateEmployee,
  handleUpdateCompanySettings,
} from './handlers/masterDataHandlers'

import { handleArchiveDocument, handleScheduleAppointment } from './handlers/documentHandlers'

import { handleSendEmail } from './handlers/emailHandlers'

import { handleExecuteWorkflow, handleFindProjectsByCriteria } from './handlers/workflowHandlers'

import { logFunctionCall } from '@/lib/ai/monitoring'
import { logAudit } from '@/lib/utils/auditLogger'
import { isPendingEmailAction, type PendingEmailAction } from './types/pendingEmail'

// Handler registry - maps function names to their handlers
const handlerRegistry: Record<
  string,
  (ctx: HandlerContext) => Promise<string | void | PendingEmailAction>
> = {
  // Project handlers
  createProject: handleCreateProject,
  updateProjectDetails: handleUpdateProjectDetails,
  updateCustomerInfo: handleUpdateCustomerInfo,
  updateWorkflowStatus: handleUpdateWorkflowStatus,
  addProjectNote: handleAddProjectNote,
  updateFinancialAmounts: handleUpdateFinancialAmounts,
  updatePaymentStatus: handleUpdatePaymentStatus,
  updateInvoiceNumber: handleUpdateInvoiceNumber,

  // Financial handlers
  createPartialPayment: handleCreatePartialPayment,
  updatePartialPayment: handleUpdatePartialPayment,
  createFinalInvoice: handleCreateFinalInvoice,
  sendReminder: handleSendReminder,
  configurePaymentSchedule: handleConfigurePaymentSchedule,

  // Item handlers
  addItemToProject: handleAddItemToProject,
  updateItem: handleUpdateItem,

  // Complaint handlers
  createComplaint: handleCreateComplaint,
  updateComplaintStatus: handleUpdateComplaintStatus,

  // Master data handlers
  createArticle: handleCreateArticle,
  updateArticle: handleUpdateArticle,
  createCustomer: handleCreateCustomer,
  updateCustomer: handleUpdateCustomer,
  createEmployee: handleCreateEmployee,
  updateEmployee: handleUpdateEmployee,
  updateCompanySettings: handleUpdateCompanySettings,

  // Document & appointment handlers
  archiveDocument: handleArchiveDocument,
  scheduleAppointment: handleScheduleAppointment,

  // Email handler
  sendEmail: handleSendEmail,

  // Workflow handlers
  executeWorkflow: handleExecuteWorkflow,
  findProjectsByCriteria: handleFindProjectsByCriteria,
}

// Blocked delete functions
const blockedFunctions = new Set([
  'deleteProject',
  'deleteComplaint',
  'deleteCustomer',
  'deleteArticle',
  'deleteEmployee',
  'removeItemFromProject',
])

export async function handleFunctionCallImpl(opts: {
  name: string
  args: FunctionCallArgs
  projects: CustomerProject[]
  setProjects: React.Dispatch<React.SetStateAction<CustomerProject[]>>
  setAppointments?: React.Dispatch<React.SetStateAction<PlanningAppointment[]>>
}): Promise<string | void | PendingEmailAction> {
  const { name, args, projects, setProjects, setAppointments } = opts

  // Check for blocked functions
  if (blockedFunctions.has(name)) {
    return '⛔ Chef, Löschen ist aus Sicherheitsgründen nur manuell in der Benutzeroberfläche möglich.'
  }

  // Create handler context
  const context: HandlerContext = {
    args,
    projects,
    setProjects,
    setAppointments,
    findProject: createFindProject(projects),
    timestamp: getTimestamp(),
  }

  // Get handler from registry
  const handler = handlerRegistry[name]

  if (handler) {
    const start = Date.now()
    try {
      const result = await handler(context)
      const duration = Date.now() - start
      const logResult = isPendingEmailAction(result)
        ? 'pending: E-Mail-Bestätigung erforderlich'
        : result
      logFunctionCall(name, args as Record<string, unknown>, logResult, duration)
      logAudit({
        action: 'ai.assistant.function_called',
        entityType: 'ai_action',
        entityId: (args.projectId as string) || (args.customerId as string) || (args.articleId as string) || undefined,
        metadata: {
          functionName: name,
          resultSummary: isPendingEmailAction(result)
            ? 'pendingEmail'
            : typeof result === 'string'
              ? result.slice(0, 300)
              : undefined,
          durationMs: duration,
        },
      })
      return result
    } catch (error: unknown) {
      const duration = Date.now() - start
      const errMsg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logFunctionCall(name, args as Record<string, unknown>, `❌ ${errMsg}`, duration)
      logAudit({
        action: 'ai.assistant.function_called',
        entityType: 'ai_action',
        metadata: { functionName: name, error: errMsg, durationMs: duration },
      })
      throw error
    }
  }

  // Unbekannte Funktion – ehrliche Fehlermeldung (Best Practice)
  return `⚠️ Unbekannte Aktion „${name}" – bitte manuell prüfen oder andere Formulierung wählen.`
}
