'use client'

import React, { useMemo, useState } from 'react'
import { Loader2, Mail, Paperclip, Send, X } from 'lucide-react'
import type { OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

export interface SupplierOrderAttachment {
  filename: string
  content: string
  contentType: string
}

interface SendOrderConfirmProps {
  open: boolean
  row: OrderWorkflowRow | null
  busy?: boolean
  onClose: () => void
  onConfirm: (recipientEmail: string, attachment?: SupplierOrderAttachment) => Promise<void> | void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export function SendOrderConfirm({
  open,
  row,
  busy = false,
  onClose,
  onConfirm,
}: SendOrderConfirmProps) {
  // Parent passes key={row?.key} so state resets on row change without effect
  const [recipient, setRecipient] = useState(() => (row?.supplierOrderEmail || '').trim())
  const [confirmed, setConfirmed] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return confirmed && recipient.trim().length > 0 && EMAIL_PATTERN.test(recipient.trim())
  }, [confirmed, recipient])

  if (!row) {
    return null
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Bestellung senden"
      description={`${row.supplierName} · Auftrag #${row.projectOrderNumber}`}
      maxWidthClassName="max-w-lg"
    >
      <label className="mt-4 block text-xs font-black uppercase tracking-widest text-slate-500">
        Empfänger-E-Mail
        <div className="relative mt-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value)
              setError(null)
            }}
            placeholder="lieferant@example.com"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
          />
        </div>
      </label>

      <label className="mt-3 block text-xs font-black uppercase tracking-widest text-slate-500">
        Anhang (optional)
        <div className="mt-1 flex items-center gap-2">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.dwg"
            onChange={(event) => {
              const file = event.target.files?.[0]
              setSelectedFile(file || null)
              setError(null)
            }}
            className="block w-full max-w-sm text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
          {selectedFile && (
            <span className="flex items-center gap-1 text-sm text-slate-600">
              <Paperclip className="h-4 w-4" />
              {selectedFile.name}
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Anhang entfernen"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          z. B. Plan, Zeichnung – wird mit der Bestell-E-Mail mitgesendet (PDF, Bilder, Office, DWG).
        </p>
      </label>

      <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        />
        <span>Ich bestätige den Versand der Bestellung an diese E-Mail-Adresse.</span>
      </label>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={async () => {
            const trimmed = recipient.trim()
            if (!trimmed) {
              setError('Empfänger-E-Mail ist erforderlich.')
              return
            }
            if (!EMAIL_PATTERN.test(trimmed)) {
              setError('Bitte eine gültige E-Mail-Adresse eingeben.')
              return
            }
            if (!confirmed) {
              setError('Bitte den Versand bestätigen.')
              return
            }
            const maxSizeBytes = 10 * 1024 * 1024
            if (selectedFile && selectedFile.size > maxSizeBytes) {
              setError('Datei ist zu groß (max. 10 MB).')
              return
            }
            setError(null)
            let attachment: SupplierOrderAttachment | undefined
            if (selectedFile) {
              const content = await readFileAsBase64(selectedFile)
              attachment = {
                filename: selectedFile.name,
                content,
                contentType: selectedFile.type || 'application/octet-stream',
              }
            }
            await onConfirm(trimmed, attachment)
          }}
          disabled={busy || !canSubmit}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Senden
        </button>
      </div>
    </ModalShell>
  )
}
