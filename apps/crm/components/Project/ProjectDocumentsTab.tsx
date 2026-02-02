'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  FileText,
  Download,
  Eye,
  Receipt,
  Package,
  Truck,
  FileCheck,
  Calendar,
  Search,
  Filter,
  AlertTriangle,
  ClipboardList,
  Share2,
  CheckCircle2,
  Loader2,
  Mail,
  PenLine,
  X,
} from 'lucide-react'
// PDF functions are dynamically imported when needed to reduce initial bundle size (~300KB saving)
// The InvoiceData type is imported separately for type checking
import type { InvoiceData } from '../InvoicePDF'
import CustomerDeliveryNoteViewModal from '../CustomerDeliveryNoteViewModal'

interface ProjectDocumentsTabProps {
  project: CustomerProject
}

type DocumentType =
  | 'all'
  | 'invoices'
  | 'customer-delivery-notes'
  | 'supplier-delivery-notes'
  | 'offers'
  | 'plans'
  | 'orders'

interface DocumentItem {
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
  data: any // Document data can vary by type
}

export function ProjectDocumentsTab({ project }: ProjectDocumentsTabProps) {
  const router = useRouter()
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
  
  // Portal publishing state
  const [publishedDocs, setPublishedDocs] = useState<Set<string>>(new Set())
  const [publishingDoc, setPublishingDoc] = useState<string | null>(null)
  const [sendingOrderEmail, setSendingOrderEmail] = useState(false)

  const loadCompanySettings = useCallback(async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      logger.error(
        'Error loading company settings',
        { component: 'ProjectDocumentsTab' },
        error as Error
      )
    }
  }, [])

  const loadBankAccount = useCallback(async () => {
    try {
      if (!companySettings?.id) {
        // Warte auf Company Settings
        return
      }
      const { getBankAccounts } = await import('@/lib/supabase/services')
      const accounts = await getBankAccounts(companySettings.id)
      // Get default bank or first one
      const defaultBank = accounts.find(b => b.isDefault) || accounts[0]
      setBankAccount(defaultBank || null)
    } catch (error) {
      logger.error(
        'Error loading bank account',
        { component: 'ProjectDocumentsTab' },
        error as Error
      )
      // Ignoriere Fehler - Bank Account ist optional
    }
  }, [companySettings?.id])

  // Load which documents are already published to the customer portal
  const loadPublishedDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('name, type')
        .eq('project_id', project.id)
        .in('type', ['RECHNUNGEN', 'LIEFERSCHEINE', 'KAUFVERTRAG'])
      
      if (error) throw error
      
      // Create a set of published document identifiers
      const published = new Set<string>()
      data?.forEach(doc => {
        // Extract invoice/delivery note number from filename
        // Format: "Teilrechnung_R-2026-001.pdf" or "Lieferschein_LS-2026-001.pdf"
        const match = doc.name.match(/_([\w-]+)\.pdf$/)
        if (match) {
          published.add(match[1].replace(/-/g, '/'))
        }
      })
      setPublishedDocs(published)
    } catch (error) {
      logger.error(
        'Error loading published documents',
        { component: 'ProjectDocumentsTab' },
        error as Error
      )
    }
  }, [project.id])

  // Publish a document to the customer portal
  const handlePublishToPortal = async (doc: DocumentItem) => {
    if (!companySettings) {
      alert('Bitte Firmenstammdaten hinterlegen.')
      return
    }

    setPublishingDoc(doc.id)
    
    try {
      if (doc.type === 'invoice') {
        const result = await publishInvoiceToPortal({
          invoice: doc.data.invoice || doc.data.payment,
          project,
        })
        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else if (doc.type === 'customer-delivery-note') {
        const result = await publishDeliveryNoteToPortal({
          deliveryNote: doc.data.note,
          project,
        })
        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else if (doc.type === 'order') {
        const result = await publishOrderToPortal({
          project,
          appendAgb: !!companySettings.agbText?.trim(),
        })
        if (!result.success) {
          throw new Error(result.error || 'Fehler beim Veröffentlichen')
        }
      } else {
        alert('Dieser Dokumenttyp kann nicht ins Portal veröffentlicht werden.')
        return
      }

      // Update published state
      setPublishedDocs(prev => new Set([...prev, doc.number || doc.id]))
      
      // Show success message
      alert(`"${doc.title}" wurde im Kundenportal veröffentlicht.`)
    } catch (error) {
      logger.error('Error publishing to portal', { component: 'ProjectDocumentsTab', doc: doc.id }, error as Error)
      alert(`Fehler beim Veröffentlichen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setPublishingDoc(null)
    }
  }

  // Auftrag per E-Mail senden (mit Unterschriften-Link)
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
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }
      alert('Auftrag wurde per E-Mail versendet. Der Kunde erhält den Link zur Online-Unterschrift.')
    } catch (error) {
      logger.error('Error sending order email', { component: 'ProjectDocumentsTab' }, error as Error)
      alert(
        `Fehler beim Senden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      )
    } finally {
      setSendingOrderEmail(false)
    }
  }

  // Check if a document is published
  const isPublished = (doc: DocumentItem): boolean => {
    if (doc.number) {
      return publishedDocs.has(doc.number)
    }
    return publishedDocs.has(doc.id)
  }

  // Check if a document can be published
  const canPublish = (doc: DocumentItem): boolean => {
    return ['invoice', 'customer-delivery-note', 'order'].includes(doc.type)
  }

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const allDocs: DocumentItem[] = []

      // 1. Rechnungen aus der neuen invoices-Tabelle
      try {
        const invoices = await getInvoices(project.id)
        invoices.forEach((invoice: Invoice) => {
          const isPartial = invoice.type === 'partial'
          allDocs.push({
            id: invoice.id,
            type: 'invoice',
            title: isPartial
              ? `Teilrechnung ${invoice.invoiceNumber}`
              : `Schlussrechnung ${invoice.invoiceNumber}`,
            date: invoice.invoiceDate,
            number: invoice.invoiceNumber,
            status: invoice.isPaid ? 'bezahlt' : 'offen',
            data: {
              type: isPartial ? 'partial' : 'final',
              invoice,
              // Für PDF-Kompatibilität
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
        const errMessage = error instanceof Error ? error.message : ''
        const errName = error instanceof Error ? error.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          return
        }
        logger.debug('Could not load invoices', {
          component: 'ProjectDocumentsTab',
          error,
        })
      }

      // 2. Kunden-Lieferscheine
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
        // Ignore aborted requests
        const errMessage = error instanceof Error ? error.message : ''
        const errName = error instanceof Error ? error.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          return
        }
        logger.debug('Could not load customer delivery notes', {
          component: 'ProjectDocumentsTab',
          error,
        })
      }

      // 3. Lieferanten-Lieferscheine (gefiltert nach matchedProjectId)
      try {
        const supplierDeliveryNotes = await getDeliveryNotes()
        const matchedNotes = supplierDeliveryNotes.filter(
          note => note.matchedProjectId === project.id
        )
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
        // Ignore aborted requests
        const errMessage = error instanceof Error ? error.message : ''
        const errName = error instanceof Error ? error.name : ''
        if (errMessage.includes('aborted') || errName === 'AbortError') {
          return
        }
        logger.debug('Could not load supplier delivery notes', {
          component: 'ProjectDocumentsTab',
          error,
        })
      }

      // 4. Angebote/ABs aus documents
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

      // 5. Auftrag (sauberes PDF zum Ausdrucken/Unterschreiben), nur wenn Positionen vorhanden
      if (project.items && project.items.length > 0) {
        allDocs.push({
          id: 'order-pdf',
          type: 'order',
          title: `Auftrag ${project.orderNumber}`,
          date:
            project.offerDate || project.orderDate || project.updatedAt || new Date().toISOString(),
          number: project.orderNumber,
          data: { project },
        })
      }

      // Sortiere nach Datum (neueste zuerst)
      allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setDocuments(allDocs)
    } catch (error) {
      logger.error('Error loading documents', { component: 'ProjectDocumentsTab' }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    loadDocuments()
    loadCompanySettings()
    loadPublishedDocuments()
  }, [loadDocuments, loadCompanySettings, loadPublishedDocuments])

  // Load bank account after company settings are loaded
  useEffect(() => {
    if (companySettings?.id) {
      loadBankAccount()
    }
  }, [companySettings?.id, loadBankAccount])

  // Auftragsunterlagen: Nur Auftrag, Rechnungen und Kunden-Lieferscheine
  // KEINE Lieferanten-Lieferscheine, Angebote oder Pläne (die gehören in den Dokumente-Tab)
  const allowedTypes: DocumentItem['type'][] = ['order', 'invoice', 'customer-delivery-note']
  
  const filteredDocuments = documents.filter(doc => {
    // Erst prüfen ob der Dokumenttyp überhaupt erlaubt ist
    if (!allowedTypes.includes(doc.type)) {
      return false
    }
    
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

  const handleDownload = async (doc: DocumentItem) => {
    try {
      if (doc.type === 'order') {
        if (!companySettings) {
          alert('Bitte Firmenstammdaten hinterlegen.')
          return
        }
        setOrderDownloadAppendAgb(!!companySettings?.agbText?.trim())
        setShowOrderDownloadModal(true)
        return
      }
      if (doc.type === 'invoice') {
        // Always fetch latest invoice data to ensure isPaid status is current
        let currentInvoice: Invoice | null = null
        let priorInvoices: {
          id: string
          invoiceNumber: string
          amount: number
          date: string
          description?: string
        }[] = []

        try {
          const allInvoices = await getInvoices(project.id)
          
          // Find the current invoice with fresh data (works for both partial and final)
          currentInvoice = allInvoices.find(inv => inv.id === doc.id) || null
          
          // Get prior partial invoices for final invoice PDFs
          if (currentInvoice && currentInvoice.type === 'final') {
            priorInvoices = allInvoices
              .filter(
                inv =>
                  inv.type === 'partial' && inv.invoiceNumber !== currentInvoice!.invoiceNumber
              )
              .map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount: inv.amount,
                date: inv.invoiceDate,
                description: inv.description,
              }))
          }
        } catch (error) {
          logger.debug('Could not load invoices for PDF', {
            component: 'ProjectDocumentsTab',
            error,
          })
        }

        // Fallback to cached data if fresh fetch failed
        if (!currentInvoice) {
          currentInvoice = doc.data.invoice
        }

        if (!currentInvoice) {
          logger.error('[ProjectDocumentsTab] No invoice data available for PDF', { component: 'ProjectDocumentsTab' })
          return
        }

        // Debug logging before creating invoice data for download
        logger.debug('[ProjectDocumentsTab] handleDownload - Creating PDF data', {
          docDataType: doc.data.type,
          currentInvoiceIsPaid: currentInvoice?.isPaid,
          currentInvoicePaidDate: currentInvoice?.paidDate,
          invoiceNumber: currentInvoice?.invoiceNumber,
        })

        const invoiceData: InvoiceData = {
          type: currentInvoice.type === 'partial' ? 'deposit' : 'final',
          invoiceNumber: currentInvoice.invoiceNumber,
          amount: currentInvoice.amount,
          date: currentInvoice.invoiceDate,
          description: currentInvoice.description,
          isPaid: currentInvoice.isPaid,
          paidDate: currentInvoice.paidDate,
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
        // Dynamic import to reduce initial bundle size
        const { downloadInvoicePDF } = await import('../InvoicePDF')
        await downloadInvoicePDF(invoiceData)
      } else if (doc.type === 'customer-delivery-note') {
        // Dynamic import to reduce initial bundle size
        const { downloadCustomerDeliveryNotePDF } = await import('../CustomerDeliveryNotePDF')
        await downloadCustomerDeliveryNotePDF(doc.data.note, doc.data.project, companySettings)
      } else if (doc.type === 'supplier-delivery-note') {
        // TODO: PDF für Lieferanten-Lieferscheine
        alert('PDF-Download für Lieferanten-Lieferscheine wird noch implementiert.')
      } else {
        // Für andere Dokumente: Download des ursprünglichen Dokuments
        if (doc.data.document?.url) {
          window.open(doc.data.document.url, '_blank')
        } else {
          alert('Kein Download verfügbar für dieses Dokument.')
        }
      }
    } catch (error) {
      logger.error(
        'Error downloading document',
        { component: 'ProjectDocumentsTab' },
        error as Error
      )
      alert('Fehler beim Download des Dokuments.')
    }
  }

  const handleView = async (doc: DocumentItem) => {
    if (doc.type === 'order') {
      if (!companySettings) {
        alert('Bitte Firmenstammdaten hinterlegen.')
        return
      }
      try {
        // Dynamic import to reduce initial bundle size
        const { openOrderPDFInNewTab } = await import('../OrderPDF')
        await openOrderPDFInNewTab(project, companySettings, {
          appendAgb: !!companySettings.agbText?.trim(),
        })
      } catch (err) {
        logger.error('Error opening order PDF', { component: 'ProjectDocumentsTab' }, err as Error)
        alert('Fehler beim Öffnen der PDF-Vorschau.')
      }
      return
    }

    if (doc.type === 'invoice') {
      if (!companySettings) {
        alert('Bitte Firmenstammdaten hinterlegen.')
        return
      }
      try {
        // Always fetch latest invoice data to ensure isPaid status is current
        let currentInvoice: Invoice | null = null
        let priorInvoices: {
          id: string
          invoiceNumber: string
          amount: number
          date: string
          description?: string
        }[] = []

        try {
          const allInvoices = await getInvoices(project.id)
          
          // Find the current invoice with fresh data (works for both partial and final)
          currentInvoice = allInvoices.find(inv => inv.id === doc.id) || null
          
          // Get prior partial invoices for final invoice PDFs
          if (currentInvoice && currentInvoice.type === 'final') {
            priorInvoices = allInvoices
              .filter(
                inv =>
                  inv.type === 'partial' && inv.invoiceNumber !== currentInvoice!.invoiceNumber
              )
              .map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount: inv.amount,
                date: inv.invoiceDate,
                description: inv.description,
              }))
          }
        } catch (error) {
          logger.debug('Could not load invoices for PDF', {
            component: 'ProjectDocumentsTab',
            error,
          })
        }

        // Fallback to cached data if fresh fetch failed
        if (!currentInvoice) {
          currentInvoice = doc.data.invoice
        }

        if (!currentInvoice) {
          logger.error('[ProjectDocumentsTab] No invoice data available for PDF preview', { component: 'ProjectDocumentsTab' })
          return
        }

        const invoiceData: InvoiceData = {
          type: currentInvoice.type === 'partial' ? 'deposit' : 'final',
          invoiceNumber: currentInvoice.invoiceNumber,
          amount: currentInvoice.amount,
          date: currentInvoice.invoiceDate,
          description: currentInvoice.description,
          isPaid: currentInvoice.isPaid,
          paidDate: currentInvoice.paidDate,
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
        // Dynamic import to reduce initial bundle size
        const { openInvoicePDFInNewTab } = await import('../InvoicePDF')
        await openInvoicePDFInNewTab(invoiceData)
      } catch (err) {
        logger.error(
          'Error opening invoice PDF',
          { component: 'ProjectDocumentsTab' },
          err as Error
        )
        alert('Fehler beim Öffnen der PDF-Vorschau.')
      }
      return
    }

    if (doc.type === 'customer-delivery-note') {
      setViewCustomerDeliveryNote(doc.data.note as CustomerDeliveryNote)
      return
    }

    if (doc.type === 'supplier-delivery-note') {
      router.push(`/deliveries?type=supplier&search=${encodeURIComponent(doc.number || '')}`)
      return
    }

    if (doc.data?.document?.url) {
      window.open(doc.data.document.url, '_blank')
    }
  }

  const getTypeIcon = (type: DocumentItem['type']) => {
    switch (type) {
      case 'invoice':
        return <Receipt className="h-5 w-5" />
      case 'customer-delivery-note':
        return <Truck className="h-5 w-5" />
      case 'supplier-delivery-note':
        return <Package className="h-5 w-5" />
      case 'offer':
        return <FileCheck className="h-5 w-5" />
      case 'plan':
        return <FileText className="h-5 w-5" />
      case 'order':
        return <ClipboardList className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: DocumentItem['type']) => {
    switch (type) {
      case 'invoice':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'customer-delivery-note':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'supplier-delivery-note':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'offer':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'plan':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'order':
        return 'bg-teal-100 text-teal-700 border-teal-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTypeLabel = (type: DocumentItem['type']) => {
    switch (type) {
      case 'invoice':
        return 'Rechnung'
      case 'customer-delivery-note':
        return 'Kunden-Lieferschein'
      case 'supplier-delivery-note':
        return 'Lieferanten-Lieferschein'
      case 'offer':
        return 'Angebot'
      case 'plan':
        return 'Plan'
      case 'order':
        return 'Auftrag'
      default:
        return 'Dokument'
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusLower = status.toLowerCase()
    let color = 'bg-slate-100 text-slate-700'

    if (statusLower === 'bezahlt' || statusLower === 'paid' || statusLower === 'completed') {
      color = 'bg-emerald-100 text-emerald-700'
    } else if (statusLower === 'offen' || statusLower === 'open' || statusLower === 'draft') {
      color = 'bg-amber-100 text-amber-700'
    } else if (statusLower === 'sent' || statusLower === 'delivered') {
      color = 'bg-blue-100 text-blue-700'
    }

    return (
      <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider ${color}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Titel */}
      <div>
        <h4 className="text-xl font-black tracking-tight text-slate-900">Auftragsunterlagen</h4>
        <p className="text-sm text-slate-500">
          Auftrag, Rechnungen und Kunden-Lieferscheine für dieses Projekt
        </p>
      </div>

      {/* Header mit Filter und Suche */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
          <input
            type="text"
            placeholder="Unterlagen durchsuchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as DocumentType)}
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
          >
            <option value="all">Alle Unterlagen</option>
            <option value="orders">Aufträge</option>
            <option value="invoices">Rechnungen</option>
            <option value="customer-delivery-notes">Kunden-Lieferscheine</option>
          </select>
        </div>
      </div>

      {/* Dokumentenliste */}
      {filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-slate-300" />
          <p className="text-lg font-bold text-slate-600">Keine Dokumente gefunden</p>
          <p className="mt-2 text-sm text-slate-400">
            {filter === 'all'
              ? 'Für dieses Projekt wurden noch keine Dokumente erfasst.'
              : `Keine ${filter === 'orders' ? 'Aufträge' : getTypeLabel(filter as DocumentItem['type'])} vorhanden.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="group rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className={`rounded-xl p-3 ${getTypeColor(doc.type)}`}>
                    {getTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-black text-slate-900">{doc.title}</h3>
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider ${getTypeColor(doc.type)}`}
                      >
                        {getTypeLabel(doc.type)}
                      </span>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      {doc.number && <span className="font-bold">Nr. {doc.number}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(doc.date).toLocaleDateString('de-DE')}
                      </span>
                      {doc.type === 'order' && project.orderFooterText?.trim() ? (
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          Mit Auftragshinweisen
                        </span>
                      ) : null}
                      {doc.type === 'order' && project.orderContractSignedAt ? (
                        <span
                          className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          title={`Unterschrieben am ${new Date(project.orderContractSignedAt).toLocaleString('de-DE')} von ${project.orderContractSignedBy || 'Kunde'}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Unterschrieben
                          {project.orderContractSignedBy && (
                            <span className="text-emerald-600">({project.orderContractSignedBy})</span>
                          )}
                        </span>
                      ) : null}
                      {canPublish(doc) && isPublished(doc) && (
                        <span className="flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Im Portal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.type === 'order' && project.orderContractSignedAt && project.customerSignature && (
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100"
                      title="Unterschrift als Nachweis anzeigen"
                    >
                      <PenLine className="h-4 w-4" />
                      Unterschrift anzeigen
                    </button>
                  )}
                  {doc.type === 'order' && (
                    <button
                      onClick={handleSendOrderEmail}
                      disabled={sendingOrderEmail || !project.email?.trim()}
                      className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500"
                      title={
                        !project.email?.trim()
                          ? 'E-Mail-Adresse fehlt'
                          : 'Auftrag per E-Mail senden (mit Link zur Online-Unterschrift)'
                      }
                    >
                      {sendingOrderEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Auftrag per E-Mail senden
                    </button>
                  )}
                  <button
                    onClick={() => handleView(doc)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                    title="Ansehen"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700"
                    title="Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  {canPublish(doc) && (
                    <button
                      onClick={() => handlePublishToPortal(doc)}
                      disabled={publishingDoc === doc.id || isPublished(doc)}
                      className={`rounded-lg p-2 transition-all ${
                        isPublished(doc)
                          ? 'bg-green-100 text-green-600 cursor-default'
                          : publishingDoc === doc.id
                          ? 'bg-slate-100 text-slate-400 cursor-wait'
                          : 'bg-slate-100 text-slate-700 hover:bg-orange-100 hover:text-orange-700 group-hover:bg-orange-100 group-hover:text-orange-700'
                      }`}
                      title={isPublished(doc) ? 'Im Kundenportal verfügbar' : 'Im Kundenportal veröffentlichen'}
                    >
                      {publishingDoc === doc.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isPublished(doc) ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Share2 className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewCustomerDeliveryNote && (
        <CustomerDeliveryNoteViewModal
          note={viewCustomerDeliveryNote}
          projectId={project.id}
          onClose={() => setViewCustomerDeliveryNote(null)}
        />
      )}

      {/* Unterschrift-Nachweis-Modal */}
      {showSignatureModal && project.customerSignature && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 pr-8 text-lg font-bold text-slate-900">Unterschrift – Nachweis</h3>
            <p className="mb-4 text-sm text-slate-600">
              Auftrag {project.orderNumber} · Online unterschrieben
            </p>
            <div className="mb-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
              <img
                src={project.customerSignature}
                alt="Unterschrift des Kunden"
                className="mx-auto max-h-32 w-full object-contain"
              />
            </div>
            <div className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm">
              <p>
                <span className="font-bold text-slate-700">Unterzeichner:</span>{' '}
                {project.orderContractSignedBy || '–'}
              </p>
              <p>
                <span className="font-bold text-slate-700">Unterzeichnet am:</span>{' '}
                {project.orderContractSignedAt
                  ? new Date(project.orderContractSignedAt).toLocaleString('de-DE')
                  : '–'}
              </p>
              <p>
                <span className="font-bold text-slate-700">Widerrufsverzicht:</span>{' '}
                {project.withdrawalWaivedAt
                  ? new Date(project.withdrawalWaivedAt).toLocaleString('de-DE') + ' (§ 18 FAGG Maßanfertigung)'
                  : '–'}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Dieses Dokument dient als Nachweis der Online-Unterschrift des Auftrags.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = project.customerSignature!
                  link.download = `Unterschrift_Auftrag_${project.orderNumber || project.id}.png`
                  link.click()
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Als Bild speichern
              </button>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auftrag-Download-Modal (Kunden-PDF: keine Einzelpreise) */}
      {showOrderDownloadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Auftrag herunterladen</h3>
            {companySettings?.agbText?.trim() ? (
              <div className="mb-6">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={orderDownloadAppendAgb}
                    onChange={e => setOrderDownloadAppendAgb(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700">AGB anhängen</span>
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Fügt die in den Einstellungen hinterlegten AGB als letzte Seite ans PDF an.
                </p>
              </div>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOrderDownloadModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Dynamic import to reduce initial bundle size
                    const { downloadOrderPDF } = await import('../OrderPDF')
                    await downloadOrderPDF(project, companySettings!, {
                      showUnitPrices: false,
                      appendAgb: orderDownloadAppendAgb,
                    })
                    setShowOrderDownloadModal(false)
                  } catch (err) {
                    logger.error(
                      'Error downloading order PDF',
                      { component: 'ProjectDocumentsTab' },
                      err as Error
                    )
                    alert('Fehler beim Erstellen der PDF.')
                  }
                }}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
              >
                Herunterladen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reklamationen Link */}
      <div className="mt-8">
        <button
          onClick={() => router.push(`/complaints?projectId=${project.id}`)}
          className="flex w-full items-center justify-between rounded-xl border-2 border-red-200 bg-red-50 p-4 transition-all hover:border-red-300 hover:bg-red-100"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="text-left">
              <p className="font-bold text-red-900">Reklamationen</p>
              <p className="text-xs text-red-700">Zu Reklamations-Zentrale</p>
            </div>
          </div>
          <FileText className="h-5 w-5 text-red-600" />
        </button>
      </div>

      {/* Statistiken */}
      <div className="mt-8 grid grid-cols-5 gap-4">
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-2xl font-black text-purple-700">
            {documents.filter(d => d.type === 'invoice').length}
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-purple-600">
            Rechnungen
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-2xl font-black text-blue-700">
            {documents.filter(d => d.type === 'customer-delivery-note').length}
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            Kunden-LS
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-2xl font-black text-amber-700">
            {documents.filter(d => d.type === 'supplier-delivery-note').length}
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-amber-600">
            Lieferanten-LS
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-2xl font-black text-emerald-700">
            {documents.filter(d => d.type === 'offer').length}
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-600">
            Angebote
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-2xl font-black text-slate-700">{documents.length}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-600">
            Gesamt
          </div>
        </div>
      </div>
    </div>
  )
}
