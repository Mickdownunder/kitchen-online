'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { ModalShell } from './ModalShell'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
  busy?: boolean
  tone?: 'default' | 'danger' | 'warning'
}

const confirmButtonByTone: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  default:
    'border-slate-200 bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60',
  danger:
    'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60',
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  onConfirm,
  onClose,
  busy = false,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <ModalShell open={open} title={title} description={description} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm()}
          disabled={busy}
          className={`inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${confirmButtonByTone[tone]}`}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
