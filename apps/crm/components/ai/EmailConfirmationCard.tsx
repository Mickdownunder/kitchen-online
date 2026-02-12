'use client'

import React, { useState } from 'react'
import { Mail, Paperclip, Send, X, Loader2 } from 'lucide-react'
import type { PendingEmailAction } from '@/app/providers/ai/types/pendingEmail'

interface EmailConfirmationCardProps {
  pending: PendingEmailAction
  functionCallId: string
  onConfirm: (extraPayload?: Record<string, unknown>) => Promise<string | void>
  onCancel: () => void
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64 ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const isSupplierOrder = (pending: PendingEmailAction) => pending.functionName === 'sendSupplierOrderEmail'

export const EmailConfirmationCard: React.FC<EmailConfirmationCardProps> = ({
  pending,
  functionCallId,
  onConfirm,
  onCancel,
}) => {
  void functionCallId
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleConfirm = async () => {
    setIsSending(true)
    setError(null)
    try {
      let extraPayload: Record<string, unknown> | undefined
      if (isSupplierOrder(pending) && selectedFile) {
        if (selectedFile.size > MAX_ATTACHMENT_BYTES) {
          setError('Datei ist zu groß (max. 10 MB).')
          setIsSending(false)
          return
        }
        const content = await readFileAsBase64(selectedFile)
        extraPayload = {
          attachments: [
            {
              filename: selectedFile.name,
              content,
              contentType: selectedFile.type || 'application/octet-stream',
            },
          ],
        }
      }
      await onConfirm(extraPayload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="rounded-[2.5rem] rounded-tl-none border border-amber-500/30 bg-slate-800/80 p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/20 p-2">
          <Mail className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            E-Mail-Bestätigung
          </p>
          <p className="text-sm font-medium text-slate-200">
            {pending.functionName === 'sendSupplierOrderEmail'
              ? 'Bestellung versenden'
              : pending.functionName === 'sendReminder'
                ? 'Mahnung versenden'
                : 'E-Mail versenden'}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-300">
        <p>
          <span className="text-slate-500">An:</span>{' '}
          <strong className="text-white">{pending.to}</strong>
        </p>
        <p>
          <span className="text-slate-500">Betreff:</span>{' '}
          <span className="text-slate-200">{pending.subject}</span>
        </p>
        {pending.bodyPreview && (
          <p className="line-clamp-2 text-slate-400">{pending.bodyPreview}</p>
        )}
      </div>

      {isSupplierOrder(pending) && (
        <label className="mt-3 block text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Anhang (optional)</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.dwg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block max-w-[220px] text-[11px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-600 file:px-2 file:py-1 file:text-slate-200"
            />
            {selectedFile && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Paperclip className="h-3.5 w-3.5" />
                {selectedFile.name}
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-700 hover:text-white"
                  aria-label="Anhang entfernen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">z. B. Plan/Zeichnung (PDF, Bilder, Office, DWG)</p>
        </label>
      )}

      <p className="mt-3 text-xs text-amber-400/90">
        Bitte auf „Senden“ klicken – die E-Mail geht erst nach deiner Bestätigung raus.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={isSending}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Senden
        </button>
        <button
          onClick={onCancel}
          disabled={isSending}
          className="flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
      </div>
    </div>
  )
}
