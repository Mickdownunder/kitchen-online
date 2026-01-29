'use client'

import React, { useState } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface DeliveryNoteUploadProps {
  onUploadComplete: () => void
  onClose: () => void
}

export default function DeliveryNoteUpload({ onUploadComplete, onClose }: DeliveryNoteUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Prüfe Dateigröße (max 50MB - ausreichend für mehrseitige PDFs und hochauflösende Scans)
    const maxSizeMB = 50
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      alert(
        `Datei ist zu groß. Maximale Größe: ${maxSizeMB}MB (Datei: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`
      )
      return
    }

    // Prüfe ob Datei leer ist
    if (selectedFile.size === 0) {
      alert('Die ausgewählte Datei ist leer')
      return
    }

    logger.debug('Datei ausgewählt', {
      component: 'DeliveryNoteUpload',
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
    })

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          setPreview(reader.result as string)
        }
      }
      reader.onerror = () => {
        logger.error('Fehler beim Laden der Vorschau', { component: 'DeliveryNoteUpload' })
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)

      // Konvertiere File zu Base64 im Frontend (umgeht FormData-Parsing-Probleme)
      logger.debug('Converting file to Base64', {
        component: 'DeliveryNoteUpload',
        name: file.name,
        size: file.size,
      })

      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          // Entferne data:image/...;base64, Präfix falls vorhanden
          const base64Data = result.includes(',') ? result.split(',')[1] : result
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const base64Data = await base64Promise
      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')

      logger.debug('Base64 conversion complete', {
        component: 'DeliveryNoteUpload',
        dataLength: base64Data.length,
      })

      // Sende als JSON an API Route (zuverlässiger als FormData)
      const response = await fetch('/api/delivery-notes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Data,
          mimeType,
          supplierName: supplierName || undefined,
          deliveryDate: deliveryDate || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fehlgeschlagen')
      }

      await response.json() // Response wird nicht verwendet, aber wir warten auf Completion
      alert('Lieferschein erfolgreich hochgeladen und analysiert!')

      // Warte kurz, damit die DB-Transaktion abgeschlossen ist
      await new Promise(resolve => setTimeout(resolve, 500))

      onUploadComplete()
      onClose()
    } catch (error: unknown) {
      logger.error('Upload error', { component: 'DeliveryNoteUpload' }, error as Error)
      alert(`Fehler beim Upload: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-2xl font-black text-slate-900">Lieferschein hochladen</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* File Upload */}
          <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-widest text-slate-700">
              Lieferschein-Datei
            </label>
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-amber-500">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-3"
              >
                <Upload className="h-12 w-12 text-slate-400" />
                <div>
                  <span className="font-bold text-amber-500">Datei auswählen</span>
                  <span className="text-slate-500"> oder hier ablegen</span>
                </div>
                <p className="text-xs text-slate-400">PDF oder Bild (JPG, PNG)</p>
              </label>
            </div>
            {file && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-medium text-slate-700">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {preview && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="h-auto max-w-full rounded-xl border border-slate-200"
                />
              </div>
            )}
          </div>

          {/* Supplier Name */}
          <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-widest text-slate-700">
              Lieferant (optional)
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="Name des Lieferanten"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={uploading}
            />
          </div>

          {/* Delivery Date */}
          <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-widest text-slate-700">
              Lieferdatum (optional)
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={uploading}
            />
          </div>

          {/* Info */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              <strong>Hinweis:</strong> Die KI analysiert den Lieferschein automatisch und versucht,
              ihn dem passenden Auftrag zuzuordnen. Du kannst die Zuordnung später manuell
              korrigieren.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 rounded-xl bg-slate-100 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Hochladen & Analysieren
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
