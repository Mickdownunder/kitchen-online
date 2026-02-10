import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  Package,
  PenLine,
  Receipt,
  Share2,
  Truck,
} from 'lucide-react'
import { CustomerProject } from '@/types'
import type { DocumentItem, DocumentType } from '../useProjectDocuments'

interface DocumentsListProps {
  filteredDocuments: DocumentItem[]
  filter: DocumentType
  project: CustomerProject
  publishingDoc: string | null
  sendingOrderEmail: boolean
  canPublish: (doc: DocumentItem) => boolean
  isPublished: (doc: DocumentItem) => boolean
  onView: (doc: DocumentItem) => void
  onDownload: (doc: DocumentItem) => void
  onPublish: (doc: DocumentItem) => void
  onSendOrderEmail: () => void
  onLoadSignatureAudit: () => void
}

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

export function DocumentsList({
  filteredDocuments,
  filter,
  project,
  publishingDoc,
  sendingOrderEmail,
  canPublish,
  isPublished,
  onView,
  onDownload,
  onPublish,
  onSendOrderEmail,
  onLoadSignatureAudit,
}: DocumentsListProps) {
  if (filteredDocuments.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FileText className="mx-auto mb-4 h-16 w-16 text-slate-300" />
        <p className="text-lg font-bold text-slate-600">Keine Dokumente gefunden</p>
        <p className="mt-2 text-sm text-slate-400">
          {filter === 'all'
            ? 'Für dieses Projekt wurden noch keine Dokumente erfasst.'
            : `Keine ${filter === 'orders' ? 'Aufträge' : getTypeLabel(filter as DocumentItem['type'])} vorhanden.`}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {filteredDocuments.map((doc) => (
        <div
          key={doc.id}
          className="group rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start gap-4">
              <div className={`rounded-xl p-3 ${getTypeColor(doc.type)}`}>{getTypeIcon(doc.type)}</div>
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
                  onClick={onLoadSignatureAudit}
                  className="flex items-center gap-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100"
                  title="Unterschrift als Nachweis anzeigen"
                >
                  <PenLine className="h-4 w-4" />
                  Unterschrift anzeigen
                </button>
              )}
              {doc.type === 'order' && (
                <button
                  onClick={onSendOrderEmail}
                  disabled={sendingOrderEmail || !project.email?.trim()}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500"
                  title={!project.email?.trim() ? 'E-Mail-Adresse fehlt' : 'Auftrag per E-Mail senden (mit Link zur Online-Unterschrift)'}
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
                onClick={() => onView(doc)}
                className="rounded-lg bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                title="Ansehen"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="rounded-lg bg-slate-100 p-2 text-slate-700 transition-all hover:bg-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
              {canPublish(doc) && (
                <button
                  onClick={() => onPublish(doc)}
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
  )
}
