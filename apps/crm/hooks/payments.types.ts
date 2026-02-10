import type { CustomerProject, Invoice } from '@/types'

export interface PaymentFormData {
  amount?: number
  description?: string
  date?: string
}

export interface ProjectCalculations {
  grossTotal: number
  netTotal: number
  taxTotal: number
}

export interface UsePaymentFlowOptions {
  projects: CustomerProject[]
  projectIdParam: string | null
}

export interface UsePaymentFlowResult {
  selectedProject: CustomerProject | null
  editingPaymentId: string | null
  newPaymentForm: PaymentFormData | null
  setNewPaymentForm: (value: PaymentFormData | null) => void
  percentInput: string
  editingPercentInput: string
  invoices: Invoice[]
  loadingInvoices: boolean
  invoiceNumber: string
  setInvoiceNumber: (value: string) => void
  suggestedInvoiceNumber: string
  partialPayments: Invoice[]
  finalInvoice: Invoice | undefined
  calculations: ProjectCalculations
  showProjectList: boolean
  resetForm: () => void
  handleSelectProject: (project: CustomerProject) => void
  handleQuickPercent: (percent: number) => void
  handlePercentChange: (value: string, fromAmountField?: boolean) => void
  handlePercentBlur: () => void
  handleEditingPercentChange: (value: string, fromAmountField?: boolean) => void
  handleEditingPercentBlur: () => void
  handleSavePayment: (projectId: string) => Promise<void>
  handleDeletePayment: (projectId: string, paymentId: string) => Promise<void>
  handleMarkPaymentPaid: (paymentId: string, paidDate: string) => Promise<void>
  handleUnmarkPaymentPaid: (paymentId: string) => Promise<void>
  handleGenerateFinalInvoice: (invoiceDate: string) => Promise<void>
  handleMarkFinalInvoicePaid: (paidDate: string) => Promise<void>
  handleUnmarkFinalInvoicePaid: () => Promise<void>
  handleDeleteFinalInvoice: () => Promise<void>
  startNewPayment: () => Promise<void>
  startEditPayment: (invoice: Invoice) => void
}
