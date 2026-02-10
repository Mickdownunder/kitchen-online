'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CustomerProject } from '@/types'
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
  KeyRound,
} from 'lucide-react'
import CustomerDeliveryNoteViewModal from '../CustomerDeliveryNoteViewModal'
import { useToast } from '@/components/providers/ToastProvider'
import {
  useProjectDocuments,
  buildInvoiceData,
  type DocumentItem,
  type DocumentType,
} from './useProjectDocuments'

// ============================================
// Props
// ============================================

interface ProjectDocumentsTabProps {
  project: CustomerProject
  onPortalAccessSent?: (accessCode: string) => void
}

// ============================================
// UI helpers (pure functions, no state)
// ============================================

function getTypeIcon(type: DocumentItem['type']) {
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

function getTypeColor(type: DocumentItem['type']) {
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

function getTypeLabel(type: DocumentItem['type']) {
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

function getStatusBadge(status?: string) {
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
      router.push(`/deliveries?type=supplier&search=${encodeURIComponent(doc.number || '')}`)
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
      {/* Title */}
      <div>
        <h4 className="text-xl font-black tracking-tight text-slate-900">Auftragsunterlagen</h4>
        <p className="text-sm text-slate-500">
          Auftrag, Rechnungen und Kunden-Lieferscheine für dieses Projekt
        </p>
      </div>

      {/* Portal access */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Kundenportal-Zugang</p>
              <p className="text-sm text-slate-600">
                Projektcode und Link per E-Mail an den Kunden senden (z. B. bei Verkauf im Geschäft).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleSendPortalAccess(
                onPortalAccessSent,
                () => success('Portal-Zugang wurde an den Kunden gesendet.'),
              )
            }
            disabled={sendingPortalAccess}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {sendingPortalAccess ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gesendet…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Portal-Zugang senden
              </>
            )}
          </button>
        </div>
        {portalAccessError && (
          <p className="mt-3 text-sm font-medium text-red-600">{portalAccessError}</p>
        )}
      </div>

      {/* Filter + search */}
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

      {/* Document list */}
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
                      <span className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider ${getTypeColor(doc.type)}`}>
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
                      onClick={loadSignatureAudit}
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
                    type="button"
                    onClick={() => handleView(doc)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                    title="Ansehen"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
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

      {/* Signature modal */}
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
              <Image
                src={project.customerSignature}
                alt="Unterschrift des Kunden"
                width={800}
                height={256}
                unoptimized
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
            {signatureAudit && (signatureAudit.ip_address || signatureAudit.user_agent || signatureAudit.geodata) && (
              <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-slate-700">Audit-Unterlagen</p>
                {signatureAudit.ip_address && (
                  <p>
                    <span className="text-slate-600">IP-Adresse:</span> {signatureAudit.ip_address}
                  </p>
                )}
                {signatureAudit.user_agent && (
                  <p>
                    <span className="text-slate-600">User-Agent:</span>{' '}
                    <span className="break-all text-xs">{signatureAudit.user_agent}</span>
                  </p>
                )}
                {signatureAudit.geodata && (signatureAudit.geodata.lat || signatureAudit.geodata.city) && (
                  <p>
                    <span className="text-slate-600">Standort:</span>{' '}
                    {[
                      signatureAudit.geodata.city,
                      signatureAudit.geodata.country,
                      signatureAudit.geodata.lat != null && signatureAudit.geodata.lon != null
                        ? `(${signatureAudit.geodata.lat.toFixed(4)}, ${signatureAudit.geodata.lon.toFixed(4)})`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' ') || '–'}
                  </p>
                )}
              </div>
            )}
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
                onClick={() => {
                  setShowSignatureModal(false)
                  setSignatureAudit(null)
                }}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
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
