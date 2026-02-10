'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BankAccount, CompanySettings, CustomerProject, InvoiceItem } from '@/types'
import type { ListInvoice } from '@/hooks/useInvoiceFilters'
import type { InvoiceData } from '@/components/InvoicePDF'
import { getBankAccounts, getCompanySettings, getInvoice, getInvoices, getProject } from '@/lib/supabase/services'
import { calculateNetFromGross, calculateTaxFromGross } from '@/lib/utils/priceCalculations'
import { calculateInvoiceViewAmounts } from '@/lib/utils/invoiceViewAmounts'
import { logger } from '@/lib/utils/logger'

interface PartialInvoiceDisplay {
  id: string
  invoiceNumber: string
  invoiceDate: string
  amount: number
  description?: string
  paymentNet: number
  paymentTax: number
}

interface UseInvoiceViewDataResult {
  isGenerating: boolean
  companySettings: CompanySettings | null
  bankAccount: BankAccount | null
  loadingSettings: boolean
  partialInvoices: ListInvoice[]
  partialInvoiceDisplays: PartialInvoiceDisplay[]
  invoice: ListInvoice
  project: CustomerProject | null
  isDeposit: boolean
  isCredit: boolean
  items: InvoiceItem[]
  totalPartialPayments: number
  projectGrossTotal: number
  projectNetTotal: number
  projectTaxTotal: number
  partialPaymentsNet: number
  partialPaymentsTax: number
  restGross: number
  restNet: number
  restTax: number
  netAmount: number
  taxAmount: number
  companyName: string
  companyAddress: string
  handleDownloadPDF: () => Promise<void>
}

const DEFAULT_INVOICE_TAX_RATE = 20

export function useInvoiceViewData(invoiceProp: ListInvoice): UseInvoiceViewDataResult {
  const [isGenerating, setIsGenerating] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [partialInvoices, setPartialInvoices] = useState<ListInvoice[]>([])
  const [currentInvoice, setCurrentInvoice] = useState(invoiceProp)
  const [projectData, setProjectData] = useState<CustomerProject | null>(invoiceProp.project || null)

  useEffect(() => {
    setCurrentInvoice(invoiceProp)
    setProjectData(invoiceProp.project || null)
  }, [invoiceProp])

  const invoice = currentInvoice
  const project = projectData
  const isDeposit = invoice.type === 'partial'
  const isCredit = invoice.type === 'credit'
  const items = useMemo<InvoiceItem[]>(
    () => ((isDeposit || isCredit ? [] : project?.items) || []),
    [isCredit, isDeposit, project?.items],
  )

  useEffect(() => {
    let isActive = true

    const loadFreshInvoice = async (): Promise<void> => {
      const result = await getInvoice(invoiceProp.id)
      if (!isActive) {
        return
      }

      if (result.ok && result.data) {
        const freshInvoice = result.data
        setCurrentInvoice({
          ...invoiceProp,
          ...freshInvoice,
          date: freshInvoice.invoiceDate,
          status: freshInvoice.isPaid ? 'paid' : 'sent',
        } as ListInvoice)
      } else if (!result.ok) {
        logger.error('Error loading fresh invoice', { component: 'InvoiceView' }, new Error(result.message))
      }
    }

    void loadFreshInvoice()
    return () => {
      isActive = false
    }
  }, [invoiceProp])

  useEffect(() => {
    let isActive = true

    const loadProjectWithItems = async (): Promise<void> => {
      const projectId = project?.id || invoice.projectId
      if (!projectId || isDeposit) {
        return
      }
      if (project?.items && project.items.length > 0) {
        return
      }

      try {
        const fullProject = await getProject(projectId)
        if (isActive && fullProject) {
          setProjectData(fullProject)
        }
      } catch (error) {
        logger.error('Error loading project details', { component: 'InvoiceView' }, error as Error)
      }
    }

    void loadProjectWithItems()
    return () => {
      isActive = false
    }
  }, [invoice.projectId, isDeposit, project?.id, project?.items])

  useEffect(() => {
    let isActive = true

    const loadPartials = async (): Promise<void> => {
      if (isDeposit || !(project?.id || invoice.projectId)) {
        return
      }

      const result = await getInvoices(project?.id || invoice.projectId)
      if (!isActive) {
        return
      }

      const allInvoices = result.ok ? result.data : []
      const partials = allInvoices.filter((invoiceItem) => invoiceItem.type === 'partial')
      setPartialInvoices(partials as unknown as ListInvoice[])
    }

    void loadPartials()
    return () => {
      isActive = false
    }
  }, [invoice.projectId, isDeposit, project?.id])

  const totalPartialPayments = useMemo(
    () => partialInvoices.reduce((sum, partialInvoice) => sum + partialInvoice.amount, 0),
    [partialInvoices],
  )
  const partialInvoiceDisplays = useMemo<PartialInvoiceDisplay[]>(
    () =>
      partialInvoices.map((partialInvoice) => ({
        id: partialInvoice.id,
        invoiceNumber: partialInvoice.invoiceNumber,
        invoiceDate: partialInvoice.invoiceDate,
        amount: partialInvoice.amount,
        description: partialInvoice.description,
        paymentNet:
          partialInvoice.netAmount ??
          calculateNetFromGross(partialInvoice.amount, DEFAULT_INVOICE_TAX_RATE),
        paymentTax:
          partialInvoice.taxAmount ??
          calculateTaxFromGross(partialInvoice.amount, DEFAULT_INVOICE_TAX_RATE),
      })),
    [partialInvoices],
  )

  const {
    projectGrossTotal,
    projectNetTotal,
    projectTaxTotal,
    partialPaymentsNet,
    partialPaymentsTax,
    restGross,
    restNet,
    restTax,
  } = useMemo(
    () =>
      calculateInvoiceViewAmounts({
        projectItems: project?.items,
        fallbackGrossAmount: invoice.amount + totalPartialPayments,
        totalPartialPayments,
        taxRate: DEFAULT_INVOICE_TAX_RATE,
      }),
    [invoice.amount, project?.items, totalPartialPayments],
  )

  const netAmount = invoice.netAmount || (
    isDeposit ? calculateNetFromGross(invoice.amount, DEFAULT_INVOICE_TAX_RATE) : restNet
  )
  const taxAmount = invoice.taxAmount || (
    isDeposit ? calculateTaxFromGross(invoice.amount, DEFAULT_INVOICE_TAX_RATE) : restTax
  )

  useEffect(() => {
    let isActive = true

    const loadSettings = async (): Promise<void> => {
      try {
        const settings = await getCompanySettings()
        if (!isActive) {
          return
        }
        setCompanySettings(settings)

        if (settings?.id) {
          const banks = await getBankAccounts(settings.id)
          if (!isActive) {
            return
          }
          const defaultBank = banks.find((bank) => bank.isDefault) || banks[0]
          setBankAccount(defaultBank || null)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ''
        const errorName = error instanceof Error ? error.name : ''
        if (errorMessage.includes('aborted') || errorName === 'AbortError') {
          return
        }
        logger.error('Error loading company settings', { component: 'InvoiceView' }, error as Error)
      } finally {
        if (isActive) {
          setLoadingSettings(false)
        }
      }
    }

    void loadSettings()
    return () => {
      isActive = false
    }
  }, [])

  const companyName = companySettings?.companyName
    ? `${companySettings.companyName}${companySettings.legalForm ? ` ${companySettings.legalForm}` : ''}`
    : 'Ihr Unternehmen GmbH'
  const companyAddress = companySettings
    ? `${companySettings.street || ''} ${companySettings.houseNumber || ''} · ${companySettings.postalCode || ''} ${companySettings.city || ''} · ${companySettings.country || 'Österreich'}`
    : 'Musterstraße 123 · 1010 Wien · Österreich'

  const handleDownloadPDF = useCallback(async (): Promise<void> => {
    setIsGenerating(true)
    try {
      const result = await getInvoice(invoice.id)
      const invoiceForPdf = result.ok && result.data ? result.data : invoice

      const partialPaymentsForPDF = partialInvoices.map((partialInvoice) => ({
        id: partialInvoice.id,
        invoiceNumber: partialInvoice.invoiceNumber,
        amount: partialInvoice.amount,
        date: partialInvoice.invoiceDate,
        isPaid: partialInvoice.isPaid,
        paidDate: partialInvoice.paidDate,
        description: partialInvoice.description,
      }))

      logger.debug('[InvoiceView] Creating PDF data', {
        'currentInvoice.isPaid': invoiceForPdf.isPaid,
        'currentInvoice.paidDate': invoiceForPdf.paidDate,
        invoiceNumber: invoiceForPdf.invoiceNumber,
        invoiceType: invoiceForPdf.type,
      })

      const invoiceData: InvoiceData = {
        type:
          invoiceForPdf.type === 'credit'
            ? 'credit'
            : invoiceForPdf.type === 'partial'
              ? 'deposit'
              : 'final',
        invoiceNumber: invoiceForPdf.invoiceNumber,
        amount: invoiceForPdf.amount,
        date: invoiceForPdf.invoiceDate || invoice.date,
        description: invoiceForPdf.description,
        isPaid: invoiceForPdf.isPaid,
        paidDate: invoiceForPdf.paidDate,
        originalInvoiceNumber: invoiceForPdf.originalInvoiceNumber,
        project: {
          customerName: project?.customerName || '',
          address: project?.address,
          phone: project?.phone,
          email: project?.email,
          orderNumber: project?.orderNumber || '',
          customerId: project?.customerId,
          id: project?.id || invoice.projectId,
          items: project?.items,
        },
        priorInvoices: partialPaymentsForPDF,
        company: companySettings,
        bankAccount,
      }

      const { downloadInvoicePDF } = await import('@/components/InvoicePDF')
      await downloadInvoicePDF(invoiceData)
    } catch (error) {
      logger.error('Error generating PDF', { component: 'InvoiceView' }, error as Error)
      alert('Fehler beim Erstellen der PDF. Bitte versuchen Sie es erneut.')
    } finally {
      setIsGenerating(false)
    }
  }, [bankAccount, companySettings, invoice, partialInvoices, project])

  return {
    isGenerating,
    companySettings,
    bankAccount,
    loadingSettings,
    partialInvoices,
    partialInvoiceDisplays,
    invoice,
    project,
    isDeposit,
    isCredit,
    items,
    totalPartialPayments,
    projectGrossTotal,
    projectNetTotal,
    projectTaxTotal,
    partialPaymentsNet,
    partialPaymentsTax,
    restGross,
    restNet,
    restTax,
    netAmount,
    taxAmount,
    companyName,
    companyAddress,
    handleDownloadPDF,
  }
}
