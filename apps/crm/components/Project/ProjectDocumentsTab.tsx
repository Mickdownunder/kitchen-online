'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { CustomerProject } from '@/types'
import { logger } from '@/lib/utils/logger'
import { AlertTriangle, FileText } from 'lucide-react'
import CustomerDeliveryNoteViewModal from '../CustomerDeliveryNoteViewModal'
import { useToast } from '@/components/providers/ToastProvider'
import {
  useProjectDocuments,
  buildInvoiceData,
  type DocumentItem,
} from './useProjectDocuments'
import { DocumentsHeader } from './documents/DocumentsHeader'
import { DocumentsFilterBar } from './documents/DocumentsFilterBar'
import { DocumentsList } from './documents/DocumentsList'
import { SignatureProofModal } from './documents/SignatureProofModal'

// ============================================
// Props
// ============================================

interface ProjectDocumentsTabProps {
  project: CustomerProject
  onPortalAccessSent?: (accessCode: string) => void
}

// ============================================
// Component
// ============================================

export function ProjectDocumentsTab({ project, onPortalAccessSent }: ProjectDocumentsTabProps) {
  const router = useRouter()
  const { success } = useToast()

  const {
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
    isPublished,
    canPublish,
    handlePublishToPortal,
    handleSendOrderEmail,
    handleSendPortalAccess,
    loadSignatureAudit,
  } = useProjectDocuments(project)

  // ── Download handler ──────────────────────────────────────────

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
        const invoiceData = await buildInvoiceData(doc, project, companySettings, bankAccount)
        if (!invoiceData) {
          alert('Rechnungsdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.')
          return
        }
        const { downloadInvoicePDF } = await import('../InvoicePDF')
        await downloadInvoicePDF(invoiceData)
      } else if (doc.type === 'customer-delivery-note') {
        const { downloadCustomerDeliveryNotePDF } = await import('../CustomerDeliveryNotePDF')
        await downloadCustomerDeliveryNotePDF(doc.data.note, doc.data.project, companySettings)
      } else if (doc.type === 'supplier-delivery-note') {
        alert('PDF-Download für Lieferanten-Lieferscheine wird noch implementiert.')
      } else {
        if (doc.data.document?.url) {
          window.open(doc.data.document.url, '_blank')
        } else {
          alert('Kein Download verfügbar für dieses Dokument.')
        }
      }
    } catch (error) {
      logger.error('Error downloading document', { component: 'ProjectDocumentsTab' }, error as Error)
      alert('Fehler beim Download des Dokuments.')
    }
  }

  // ── View handler ──────────────────────────────────────────────

  const handleView = async (doc: DocumentItem) => {
    if (doc.type === 'order') {
      if (!companySettings) {
        alert('Bitte Firmenstammdaten hinterlegen.')
        return
      }
      const win = window.open('', '_blank')
      if (!win) {
        alert('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite und versuchen Sie es erneut.')
        return
      }
      try {
        const { openOrderPDFInNewTab } = await import('../OrderPDF')
        await openOrderPDFInNewTab(project, companySettings, {
          appendAgb: !!companySettings.agbText?.trim(),
          targetWindow: win,
        })
      } catch (err) {
        logger.error('Error opening order PDF', { component: 'ProjectDocumentsTab' }, err as Error)
        win.close()
        alert('Fehler beim Öffnen der PDF-Vorschau.')
      }
      return
    }

    if (doc.type === 'invoice') {
      if (!companySettings) {
        alert('Bitte Firmenstammdaten hinterlegen.')
        return
      }
      const win = window.open('', '_blank')
      if (!win) {
        alert('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite und versuchen Sie es erneut.')
        return
      }
      try {
        const invoiceData = await buildInvoiceData(doc, project, companySettings, bankAccount)
        if (!invoiceData) {
          win.close()
          alert('Rechnungsdaten konnten nicht geladen werden. Bitte versuchen Sie es erneut.')
          return
        }
        const { openInvoicePDFInNewTab } = await import('../InvoicePDF')
        await openInvoicePDFInNewTab(invoiceData, win)
      } catch (err) {
        logger.error('Error opening invoice PDF', { component: 'ProjectDocumentsTab' }, err as Error)
        if (win && !win.closed) win.close()
        alert('Fehler beim Öffnen der PDF-Vorschau.')
      }
      return
    }

    if (doc.type === 'customer-delivery-note') {
      setViewCustomerDeliveryNote(doc.data.note)
      return
    }

    if (doc.type === 'supplier-delivery-note') {
      router.push(`/orders?queue=lieferschein-da&search=${encodeURIComponent(doc.number || '')}`)
      return
    }

    if (doc.data?.document?.url) {
      window.open(doc.data.document.url, '_blank')
    }
  }

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DocumentsHeader
        sendingPortalAccess={sendingPortalAccess}
        portalAccessError={portalAccessError}
        onSendPortalAccess={() =>
          handleSendPortalAccess(
            onPortalAccessSent,
            () => success('Portal-Zugang wurde an den Kunden gesendet.'),
          )
        }
      />

      <DocumentsFilterBar
        searchTerm={searchTerm}
        filter={filter}
        onSearchTermChange={setSearchTerm}
        onFilterChange={setFilter}
      />

      <DocumentsList
        filteredDocuments={filteredDocuments}
        filter={filter}
        project={project}
        publishingDoc={publishingDoc}
        sendingOrderEmail={sendingOrderEmail}
        canPublish={canPublish}
        isPublished={isPublished}
        onView={handleView}
        onDownload={handleDownload}
        onPublish={handlePublishToPortal}
        onSendOrderEmail={handleSendOrderEmail}
        onLoadSignatureAudit={loadSignatureAudit}
      />

      {viewCustomerDeliveryNote && (
        <CustomerDeliveryNoteViewModal
          note={viewCustomerDeliveryNote}
          projectId={project.id}
          onClose={() => setViewCustomerDeliveryNote(null)}
        />
      )}

      {showSignatureModal && project.customerSignature && (
        <SignatureProofModal
          project={project}
          signatureAudit={signatureAudit}
          onClose={() => {
            setShowSignatureModal(false)
            setSignatureAudit(null)
          }}
        />
      )}

      {/* Order download modal */}
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
                    const { downloadOrderPDF } = await import('../OrderPDF')
                    await downloadOrderPDF(project, companySettings!, {
                      showUnitPrices: false,
                      appendAgb: orderDownloadAppendAgb,
                    })
                    setShowOrderDownloadModal(false)
                  } catch (err) {
                    logger.error('Error downloading order PDF', { component: 'ProjectDocumentsTab' }, err as Error)
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

      {/* Complaints link */}
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

      {/* Statistics */}
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
