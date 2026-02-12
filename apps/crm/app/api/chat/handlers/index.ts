/**
 * Handler barrel export.
 * Re-exports all domain-specific handler functions for use in the registry.
 */

export {
  handleUpdateProjectDetails,
  handleUpdateCustomerInfo,
  handleUpdateWorkflowStatus,
  handleAddProjectNote,
  handleCreateProject,
  handleFindProjectsByCriteria,
  handleExecuteWorkflow,
} from './projectHandlers'

export {
  handleUpdateFinancialAmounts,
  handleUpdatePaymentStatus,
  handleCreatePartialPayment,
  handleUpdatePartialPayment,
  handleCreateFinalInvoice,
  handleUpdateInvoiceNumber,
  handleConfigurePaymentSchedule,
  handleGetFinancialReport,
  handleAutomaticPaymentMatch,
} from './financeHandlers'

export {
  handleAddItemToProject,
  handleUpdateItem,
} from './itemHandlers'

export {
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
} from './entityHandlers'

export {
  handleArchiveDocument,
  handleScheduleAppointment,
  handleUpdateAppointment,
  handleDeleteAppointment,
  handleGetCalendarView,
  handleAnalyzeKitchenPlan,
  handleSendEmail,
  handleSendReminder,
} from './communicationHandlers'

export {
  handleConfirmOrder,
  handleGetLeadTimes,
  handleSetLeadTime,
} from './orderHandlers'
