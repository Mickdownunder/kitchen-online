import { useState } from 'react'
import { Download, File, FileCheck, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'

export interface PortalDocument {
  id: string
  name: string
  type: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string | null
  uploaded_by: string | null
}

export const documentTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PLANE: { label: 'Pläne', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  INSTALLATIONSPLANE: { label: 'Installationspläne', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  KAUFVERTRAG: { label: 'Kaufvertrag', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  RECHNUNGEN: { label: 'Rechnungen', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  LIEFERSCHEINE: { label: 'Lieferscheine', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  AUSMESSBERICHT: { label: 'Aufmaßbericht', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  KUNDEN_DOKUMENT: { label: 'Meine Dokumente', color: 'text-rose-700', bgColor: 'bg-rose-50' },
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) {
    return '-'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return '-'
  }

  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function getFileIcon(mimeType: string | null) {
  if (mimeType?.startsWith('image/')) {
    return ImageIcon
  }

  if (mimeType === 'application/pdf') {
    return FileCheck
  }

  return File
}

interface DocumentCardProps {
  document: PortalDocument
  onDelete: () => void
  onDownload: () => Promise<void>
  canDelete: boolean
  isDeleting: boolean
}

export function DocumentCard({ document, onDelete, onDownload, canDelete, isDeleting }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const FileIcon = getFileIcon(document.mime_type)
  const config =
    documentTypeConfig[document.type] ||
    ({ label: document.type, color: 'text-slate-700', bgColor: 'bg-slate-50' } as const)

  const handleDownload = async () => {
    setIsDownloading(true)

    try {
      await onDownload()
    } catch {
      alert('Fehler beim Download')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.bgColor}`}>
          <FileIcon className={`h-6 w-6 ${config.color}`} />
        </div>
        <div>
          <p className="font-medium text-slate-900">{document.name}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>{formatFileSize(document.file_size)}</span>
            <span className="text-slate-300">•</span>
            <span>{formatDate(document.uploaded_at)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          title="Herunterladen"
        >
          {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Löschen"
          >
            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  )
}
