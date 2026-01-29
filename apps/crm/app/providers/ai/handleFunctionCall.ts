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

// Handler registry - maps function names to their handlers
const handlerRegistry: Record<string, (ctx: HandlerContext) => Promise<string | void>> = {
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
}): Promise<string | void> {
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
    return await handler(context)
  }

  // Unknown function - return generic success
  return '✅ Aktion ausgeführt.'
}
