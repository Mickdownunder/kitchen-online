/**
 * Custom hook that encapsulates all data loading, state management
 * and actions for the ProjectDocumentsTab.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CustomerProject,
  CustomerDeliveryNote,
  CompanySettings,
  BankAccount,
  Invoice,
} from '@/types'
import {
  getDeliveryNotes,
  getCustomerDeliveryNotes,
  getCompanySettings,
  getInvoices,
  publishInvoiceToPortal,
  publishDeliveryNoteToPortal,
  publishOrderToPortal,
} from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { InvoiceData } from '../InvoicePDF'

// ============================================
// Types
// ============================================

export type DocumentType =
  | 'all'
  | 'invoices'
  | 'customer-delivery-notes'
  | 'supplier-delivery-notes'
  | 'offers'
  | 'plans'
  | 'orders'

export interface DocumentItem {
  id: string
  type:
    | 'invoice'
    | 'customer-delivery-note'
    | 'supplier-delivery-note'
    | 'offer'
    | 'plan'
    | 'order'
    | 'other'
  title: string
  date: string
  number?: string
  status?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

// ============================================
// Helper: Build InvoiceData for PDF
// ============================================

/**
 * Builds the InvoiceData payload needed for PDF generation.
 * Fetches fresh invoice data from the API to ensure isPaid status is current.
 * Falls back to cached doc.data.invoice when the fresh fetch fails.
 */
export async function buildInvoiceData(
  doc: DocumentItem,
  project: CustomerProject,
  companySettings: CompanySettings | null,
  bankAccount: BankAccount | null,
): Promise<InvoiceData | null> {
  let currentInvoice: Invoice | null = null
  let priorInvoices: {
    id: string
    invoiceNumber: string
    amount: number
    date: string
    description?: string
  }[] = []

  try {
    const allInvoicesResult = await getInvoices(project.id)
    if (!allInvoicesResult.ok) throw new Error('Failed to load invoices')
    const allInvoices = allInvoicesResult.data

    currentInvoice = allInvoices.find(inv => inv.id === doc.id) || null

    if (currentInvoice && currentInvoice.type === 'final') {
      priorInvoices = allInvoices
        .filter(inv => inv.type === 'partial' && inv.invoiceNumber !== currentInvoice!.invoiceNumber)
        .map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          date: inv.invoiceDate,
          description: inv.description,
        }))
    }
  } catch (error) {
    logger.debug('Could not load invoices for PDF', { component: 'ProjectDocumentsTab', error })
  }

  // Fallback to cached data
  if (!currentInvoice) {
    currentInvoice = doc.data.invoice
  }

  if (!currentInvoice) {
    return null
  }

  return {
    type: currentInvoice.type === 'credit'
      ? 'credit'
      : currentInvoice.type === 'partial'
        ? 'deposit'
        : 'final',
    invoiceNumber: currentInvoice.invoiceNumber,
    amount: currentInvoice.amount,
    date: currentInvoice.invoiceDate,
    description: currentInvoice.description,
    isPaid: currentInvoice.isPaid,
    paidDate: currentInvoice.paidDate,
    originalInvoiceNumber: currentInvoice.originalInvoiceNumber,
    project: {
      customerName: project.customerName,
      address: project.address,
      phone: project.phone,
      email: project.email,
      orderNumber: project.orderNumber,
      customerId: project.customerId,
      id: project.id,
      items: project.items,
    },
    priorInvoices,
    company: companySettings,
    bankAccount: bankAccount,
  }
}

// ============================================
// isAbortError helper
// ============================================

function isAbort(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('aborted') || error.name === 'AbortError'
}

// ============================================
// Hook
// ============================================

export function useProjectDocuments(project: CustomerProject) {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DocumentType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [viewCustomerDeliveryNote, setViewCustomerDeliveryNote] =
    useState<CustomerDeliveryNote | null>(null)
  const [showOrderDownloadModal, setShowOrderDownloadModal] = useState(false)
  const [orderDownloadAppendAgb, setOrderDownloadAppendAgb] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureAudit, setSignatureAudit] = useState<{
    ip_address: string | null
    user_agent: string | null
    geodata: { country?: string; city?: string; lat?: number; lon?: number } | null
  } | null>(null)
  const [publishedDocs, setPublishedDocs] = useState<Set<string>>(new Set())
  const [publishingDoc, setPublishingDoc] = useState<string | null>(null)
  const [sendingOrderEmail, setSendingOrderEmail] = useState(false)
  const [sendingPortalAccess, setSendingPortalAccess] = useState(false)
  const [portalAccessError, setPortalAccessError] = useState<string | null>(null)

  // ── Data loading ──────────────────────────────────────────────

  const loadCompanySettings = useCallback(async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      logger.error('Error loading company settings', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [])

  const loadBankAccount = useCallback(async () => {
    try {
      if (!companySettings?.id) return
      const { getBankAccounts } = await import('@/lib/supabase/services')
      const accounts = await getBankAccounts(companySettings.id)
      const defaultBank = accounts.find(b => b.isDefault) || accounts[0]
      setBankAccount(defaultBank || null)
    } catch (error) {
      logger.error('Error loading bank account', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [companySettings?.id])

  const loadPublishedDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('name, type')
        .eq('project_id', project.id)
        .in('type', ['RECHNUNGEN', 'LIEFERSCHEINE', 'KAUFVERTRAG'])

      if (error) throw error

      const published = new Set<string>()
      data?.forEach(doc => {
        const match = doc.name.match(/_([\w-]+)\.pdf$/)
        if (match) {
          published.add(match[1].replace(/-/g, '/'))
        }
      })
      setPublishedDocs(published)
    } catch (error) {
      logger.error('Error loading published documents', { component: 'ProjectDocumentsTab' }, error as Error)
    }
  }, [project.id])

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const allDocs: DocumentItem[] = []

      // 1. Invoices
      try {
        const invoicesResult = await getInvoices(project.id)
        if (!invoicesResult.ok) throw new Error('Failed to load invoices')
        invoicesResult.data.forEach((invoice: Invoice) => {
          const isPartial = invoice.type === 'partial'
          const isCredit = invoice.type === 'credit'
          allDocs.push({
            id: invoice.id,
            type: 'invoice',
            title: isCredit
              ? `Stornorechnung ${invoice.invoiceNumber}`
              : isPartial
                ? `Teilrechnung ${invoice.invoiceNumber}`
                : `Schlussrechnung ${invoice.invoiceNumber}`,
            date: invoice.invoiceDate,
            number: invoice.invoiceNumber,
            status: isCredit ? 'storniert' : invoice.isPaid ? 'bezahlt' : 'offen',
            data: {
              type: isCredit ? 'credit' : isPartial ? 'partial' : 'final',
              invoice,
              payment: isPartial
                ? {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: invoice.amount,
                    date: invoice.invoiceDate,
                    isPaid: invoice.isPaid,
                    paidDate: invoice.paidDate,
                    description: invoice.description,
                  }
                : undefined,
              project,
            },
          })
        })
      } catch (error: unknown) {
        if (isAbort(error)) return
        logger.debug('Could not load invoices', { component: 'ProjectDocumentsTab', error })
      }

      // 2. Customer delivery notes
      try {
        const customerDeliveryNotes = await getCustomerDeliveryNotes(project.id)
        customerDeliveryNotes.forEach(note => {
          allDocs.push({
            id: `customer-ls-${note.id}`,
            type: 'customer-delivery-note',
            title: `Kunden-Lieferschein ${note.deliveryNoteNumber}`,
            date: note.deliveryDate,
            number: note.deliveryNoteNumber,
            status: note.status,
            data: { note, project },
          })
        })
      } catch (error: unknown) {
        if (isAbort(error)) return
        logger.debug('Could not load customer delivery notes', { component: 'ProjectDocumentsTab', error })
      }

      // 3. Supplier delivery notes
      try {
        const supplierDeliveryNotes = await getDeliveryNotes()
        const matchedNotes = supplierDeliveryNotes.filter(note => note.matchedProjectId === project.id)
        matchedNotes.forEach(note => {
          allDocs.push({
            id: `supplier-ls-${note.id}`,
            type: 'supplier-delivery-note',
            title: `Lieferanten-Lieferschein ${note.supplierDeliveryNoteNumber}`,
            date: note.deliveryDate,
            number: note.supplierDeliveryNoteNumber,
            status: note.status,
            data: { note, project },
          })
        })
      } catch (error: unknown) {
        if (isAbort(error)) return
        logger.debug('Could not load supplier delivery notes', { component: 'ProjectDocumentsTab', error })
      }

      // 4. Documents (offers/plans)
      if (project.documents && project.documents.length > 0) {
        project.documents.forEach((doc, idx) => {
          const docType = doc.type?.toLowerCase() || 'other'
          let type: DocumentItem['type'] = 'other'
          if (docType.includes('angebot') || docType.includes('offer') || docType.includes('ab')) {
            type = 'offer'
          } else if (docType.includes('plan') || docType.includes('zeichnung')) {
            type = 'plan'
          }
          allDocs.push({
            id: `doc-${idx}`,
            type,
            title: doc.name || `Dokument ${idx + 1}`,
            date: doc.uploadedAt || new Date().toISOString(),
            data: { document: doc, project },
          })
        })
      }

      // 5. Order PDF (only when items exist)
      if (project.items && project.items.length > 0) {
        allDocs.push({
          id: 'order-pdf',
          type: 'order',
          title: `Auftrag ${project.orderNumber}`,
          date: project.offerDate || project.orderDate || project.updatedAt || new Date().toISOString(),
          number: project.orderNumber,
          data: { project },
        })
      }

      allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setDocuments(allDocs)
    } catch (error) {
      logger.error('Error loading documents', { component: 'ProjectDocumentsTab' }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [project])

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    loadDocuments()
    loadCompanySettings()
    loadPublishedDocuments()
  }, [loadDocuments, loadCompanySettings, loadPublishedDocuments])

  useEffect(() => {
    if (companySettings?.id) {
      loadBankAccount()
    }
  }, [companySettings?.id, loadBankAccount])

  // ── Filtering ─────────────────────────────────────────────────

  const allowedTypes: DocumentItem['type'][] = ['order', 'invoice', 'customer-delivery-note']

  const filteredDocuments = documents.filter(doc => {
    if (!allowedTypes.includes(doc.type)) return false
    const matchesFilter =
      filter === 'all' ||
      (filter === 'invoices' && doc.type === 'invoice') ||
      (filter === 'customer-delivery-notes' && doc.type === 'customer-delivery-note') ||
      (filter === 'orders' && doc.type === 'order')
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.status?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // ── Actions ───────────────────────────────────────────────────

  const isPublished = (doc: DocumentItem): boolean => {
    return publishedDocs.has(doc.number || doc.id)
  }

  const canPublish = (doc: DocumentItem): boolean => {
    return ['invoice', 'customer-delivery-note', 'order'].includes(doc.type)
  }

  const handlePublishToPortal = async (doc: DocumentItem) => {
    if (!companySettings) {
      alert('Bitte Firmenstammdaten hinterlegen.')
      return
    }

    setPublishingDoc(doc.id)
    try {
      if (doc.type === 'invoice') {
        const result = await publishInvoiceToPortal({ invoice: doc.data.invoice || doc.data.payment, project })
        if (!result.success) throw new Error(result.error || 'Fehler beim Veröffentlichen')
      } else if (doc.type === 'customer-delivery-note') {
        const result = await publishDeliveryNoteToPortal({ deliveryNote: doc.data.note, project })
        if (!result.success) throw new Error(result.error || 'Fehler beim Veröffentlichen')
      } else if (doc.type === 'order') {
        const result = await publishOrderToPortal({ project, appendAgb: !!companySettings.agbText?.trim() })
        if (!result.success) throw new Error(result.error || 'Fehler beim Veröffentlichen')
      } else {
        alert('Dieser Dokumenttyp kann nicht ins Portal veröffentlicht werden.')
        return
      }
      setPublishedDocs(prev => new Set([...prev, doc.number || doc.id]))
      alert(`"${doc.title}" wurde im Kundenportal veröffentlicht.`)
    } catch (error) {
      logger.error('Error publishing to portal', { component: 'ProjectDocumentsTab', doc: doc.id }, error as Error)
      alert(`Fehler beim Veröffentlichen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setPublishingDoc(null)
    }
  }

  const handleSendOrderEmail = async () => {
    if (!project.email?.trim()) {
      alert('Bitte E-Mail-Adresse des Kunden im Projekt hinterlegen.')
      return
    }
    if (!companySettings) {
      alert('Bitte Firmenstammdaten hinterlegen.')
      return
    }

    setSendingOrderEmail(true)
    try {
      const res = await fetch('/api/email/send-with-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: project.email.trim(),
          subject: `Auftrag ${project.orderNumber} zur Unterschrift`,
          pdfType: 'order',
          projectId: project.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
      alert('Auftrag wurde per E-Mail versendet. Der Kunde erhält den Link zur Online-Unterschrift.')
    } catch (error) {
      logger.error('Error sending order email', { component: 'ProjectDocumentsTab' }, error as Error)
      alert(`Fehler beim Senden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setSendingOrderEmail(false)
    }
  }

  const handleSendPortalAccess = async (
    onPortalAccessSent?: (accessCode: string) => void,
    onSuccess?: () => void,
  ) => {
    if (!project.email?.trim()) {
      setPortalAccessError('Bitte zuerst die Kunden-E-Mail in den Stammdaten eintragen.')
      return
    }
    setSendingPortalAccess(true)
    setPortalAccessError(null)
    try {
      const res = await fetch('/api/projects/send-portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPortalAccessError(data.error || 'Fehler beim Senden')
        return
      }
      if (data.accessCode && onPortalAccessSent) {
        onPortalAccessSent(data.accessCode)
      }
      onSuccess?.()
    } catch {
      setPortalAccessError('Fehler beim Senden')
    } finally {
      setSendingPortalAccess(false)
    }
  }

  const loadSignatureAudit = async () => {
    setShowSignatureModal(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/order-sign-audit`)
      const data = await res.json()
      setSignatureAudit(
        res.ok && data
          ? {
              ip_address: data.ip_address ?? null,
              user_agent: data.user_agent ?? null,
              geodata: data.geodata ?? null,
            }
          : null
      )
    } catch {
      setSignatureAudit(null)
    }
  }

  return {
    // State
    documents,
    filteredDocuments,
    loading,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    companySettings,
    bankAccount,
    viewCustomerDeliveryNote,
    setViewCustomerDeliveryNote,
    showOrderDownloadModal,
    setShowOrderDownloadModal,
    orderDownloadAppendAgb,
    setOrderDownloadAppendAgb,
    showSignatureModal,
    setShowSignatureModal,
    signatureAudit,
    setSignatureAudit,
    publishingDoc,
    sendingOrderEmail,
    sendingPortalAccess,
    portalAccessError,

    // Actions
    isPublished,
    canPublish,
    handlePublishToPortal,
    handleSendOrderEmail,
    handleSendPortalAccess,
    loadSignatureAudit,
  }
}
