'use client'

import React, { useState } from 'react'
import { Mail, Send, X, Loader2 } from 'lucide-react'
import type { PendingEmailAction } from '@/app/providers/ai/types/pendingEmail'

interface EmailConfirmationCardProps {
  pending: PendingEmailAction
  functionCallId: string
  onConfirm: () => Promise<string | void>
  onCancel: () => void
}

export const EmailConfirmationCard: React.FC<EmailConfirmationCardProps> = ({
  pending,
  functionCallId,
  onConfirm,
  onCancel,
}) => {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsSending(true)
    setError(null)
    try {
      await onConfirm()
      // onConfirm handles clearing state and follow-up; no error = success
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
            {pending.functionName === 'sendReminder'
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
