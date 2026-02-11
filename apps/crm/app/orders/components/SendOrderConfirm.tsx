'use client'

import React, { useMemo, useState } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import type { OrderWorkflowRow } from '../types'
import { ModalShell } from './ModalShell'

interface SendOrderConfirmProps {
  open: boolean
  row: OrderWorkflowRow | null
  busy?: boolean
  onClose: () => void
  onConfirm: (recipientEmail: string) => Promise<void> | void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SendOrderConfirm({
  open,
  row,
  busy = false,
  onClose,
  onConfirm,
}: SendOrderConfirmProps) {
  const [recipient, setRecipient] = useState(() => (row?.supplierOrderEmail || '').trim())
  const [confirmed, setConfirmed] = useState(false)
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
            setError(null)
            await onConfirm(trimmed)
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
