'use client'

import React from 'react'
import { FileText, Download, Eye, X } from 'lucide-react'
import { CustomerProject, ProjectDocument } from '@/types'

interface ProjectDocsTabProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  previewDoc: ProjectDocument | null
  setPreviewDoc: (doc: ProjectDocument | null) => void
}

export function ProjectDocsTab({
  formData,
  setFormData,
  previewDoc,
  setPreviewDoc,
}: ProjectDocsTabProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = event => {
        const data = event.target?.result as string
        const newDoc: ProjectDocument = {
          id: Date.now().toString(),
          name: file.name,
          mimeType: file.type,
          data: data,
          uploadedAt: new Date().toISOString(),
        }
        setFormData(prev => ({
          ...prev,
          documents: [...(prev.documents || []), newDoc],
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== id),
    }))
  }

  return (
    <>
      <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-black tracking-tight text-slate-900">Dokumente</h4>
            <p className="text-sm text-slate-500">
              ABs vom Lieferanten, Pläne, Verträge und sonstige Unterlagen
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-lg transition-all hover:bg-amber-600 active:scale-95">
            <FileText className="h-4 w-4" /> Dokument hochladen
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(formData.documents || []).map(doc => (
            <div
              key={doc.id}
              className="group flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-amber-100 p-3">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-300"
                >
                  <Eye className="h-4 w-4" /> Ansehen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = doc.data
                    link.download = doc.name
                    link.click()
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-300"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeDocument(doc.id)}
                  className="rounded-xl bg-red-100 px-4 py-2 transition-all hover:bg-red-200"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}

          {(!formData.documents || formData.documents.length === 0) && (
            <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-slate-400" />
              <p className="text-slate-400">Noch keine Dokumente hochgeladen</p>
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-12 backdrop-blur-md">
          <div className="animate-in zoom-in-95 flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[3rem] bg-white">
            <div className="flex items-center justify-between border-b bg-slate-100 p-6">
              <h4 className="font-black text-slate-900">{previewDoc.name}</h4>
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-full p-2 transition-all hover:bg-slate-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-200 p-4">
              {previewDoc.mimeType.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewDoc.data}
                  className="mx-auto max-w-full rounded-lg shadow-2xl"
                  alt="Document Preview"
                />
              ) : (
                <iframe src={previewDoc.data} className="h-full w-full border-none shadow-2xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
