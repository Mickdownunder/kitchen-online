'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CloudUpload, FileText, FolderOpen, Loader2, Upload } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'
import { useProject } from '../context/ProjectContext'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { DocumentCard, documentTypeConfig, type PortalDocument } from './documents.ui'

export default function PortalDocumentsPage() {
  const { accessToken, isReady } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async (projectId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await portalSupabase.auth.getUser()

      if (user?.app_metadata?.customer_id) {
        setCustomerId(user.app_metadata.customer_id)
      }

      const { data, error: fetchError } = await portalSupabase
        .from('documents')
        .select('id, name, type, file_path, file_size, mime_type, uploaded_at, uploaded_by')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setDocuments(data || [])
    } catch {
      setError('Dokumente konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && accessToken && selectedProject?.id && !projectLoading) {
      loadDocuments(selectedProject.id)
    } else if (isReady && accessToken && !projectLoading && !selectedProject?.id) {
      setIsLoading(false)
      setError('NO_PROJECT')
    } else if (isReady && !accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
    }
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadDocuments])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !accessToken) {
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/customer/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          NO_FILE_PROVIDED: 'Keine Datei ausgewählt.',
          FILE_TOO_LARGE: 'Die Datei ist zu groß (max. 10 MB).',
          INVALID_FILE_TYPE: 'Nur PDF, JPG, PNG und HEIC Dateien erlaubt.',
          UPLOAD_FAILED: 'Upload fehlgeschlagen. Bitte erneut versuchen.',
          DATABASE_ERROR: 'Datenbankfehler. Bitte erneut versuchen.',
        }
        throw new Error(errorMessages[data.error] || 'Upload fehlgeschlagen')
      }

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)

      if (selectedProject?.id) {
        await loadDocuments(selectedProject.id)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (document: PortalDocument) => {
    if (!accessToken) {
      return
    }

    if (!confirm(`Dokument "${document.name}" wirklich löschen?`)) {
      return
    }

    setDeletingId(document.id)

    try {
      const response = await fetch(`/api/customer/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Löschen fehlgeschlagen')
      }

      setDocuments((prev) => prev.filter((item) => item.id !== document.id))
    } catch {
      alert('Fehler beim Löschen des Dokuments')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (document: PortalDocument) => {
    if (!accessToken) {
      throw new Error('NOT_AUTHENTICATED')
    }

    const response = await fetch(`/api/customer/documents/${document.id}/download`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok || !data?.url) {
      throw new Error(data?.error || 'DOWNLOAD_FAILED')
    }

    const fileResponse = await fetch(data.url)
    if (!fileResponse.ok) {
      throw new Error('DOWNLOAD_FAILED')
    }

    const blob = await fileResponse.blob()
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.name || 'download'
    window.document.body.appendChild(anchor)
    anchor.click()
    window.document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = []
      }
      acc[doc.type].push(doc)
      return acc
    },
    {} as Record<string, PortalDocument[]>,
  )

  const sortedTypes = Object.keys(groupedDocuments).sort((a, b) => {
    if (a === 'KUNDEN_DOKUMENT') {
      return -1
    }
    if (b === 'KUNDEN_DOKUMENT') {
      return 1
    }

    const labelA = documentTypeConfig[a]?.label || a
    const labelB = documentTypeConfig[b]?.label || b
    return labelA.localeCompare(labelB)
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Dokumente werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Nicht angemeldet</h2>
          <p className="mt-2 text-slate-500">Bitte melden Sie sich erneut an.</p>
        </div>
      </div>
    )
  }

  if (error === 'NO_PROJECT') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Kein Projekt gefunden</h2>
          <p className="mt-2 text-slate-500">
            Ihrem Portal-Zugang ist aktuell kein Projekt zugeordnet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dokumente</h1>
          <p className="mt-1 text-slate-500">Alle Dokumente zu Ihrem Küchenprojekt</p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 ${
              isUploading ? 'cursor-wait opacity-50' : ''
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Wird hochgeladen...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Dokument hochladen</span>
              </>
            )}
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-200/50">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200/50">
          <CloudUpload className="h-5 w-5 flex-shrink-0" />
          <span>Dokument erfolgreich hochgeladen!</span>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-4 ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-700">Tipp:</strong> Sie können eigene Dokumente (PDF, JPG, PNG,
          HEIC) bis max. 10 MB hochladen. Diese erscheinen in der Kategorie &quot;Meine Dokumente&quot;.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FolderOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Keine Dokumente</h2>
          <p className="mt-2 text-slate-500">Für Ihr Projekt sind noch keine Dokumente verfügbar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedTypes.map((type) => {
            const config =
              documentTypeConfig[type] ||
              ({ label: type, color: 'text-slate-700', bgColor: 'bg-slate-50' } as const)

            return (
              <div key={type}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgColor}`}>
                    <FileText className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {groupedDocuments[type].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedDocuments[type].map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDelete={() => handleDelete(doc)}
                      onDownload={() => handleDownload(doc)}
                      canDelete={doc.type === 'KUNDEN_DOKUMENT' && doc.uploaded_by === customerId}
                      isDeleting={deletingId === doc.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
