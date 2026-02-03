'use client'

import React, { useState, useEffect } from 'react'
import { X, Mail, FileText, Send } from 'lucide-react'

/** Konvertiert bearbeiteten Fließtext in einfaches HTML für die E-Mail (Zeilenumbrüche bleiben erhalten). */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
}

export interface ReminderPreviewData {
  recipientEmail: string
  subject: string
  html: string
  text: string
  reminderTypeLabel: string
  pdfDescription: string
  invoiceNumber: string
  customerName: string
}

interface ReminderPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewData: ReminderPreviewData | null
  loading: boolean
  onSend: (payload: {
    recipientEmail: string
    subject: string
    text: string
    html: string
  }) => Promise<void>
}

export function ReminderPreviewModal({
  isOpen,
  onClose,
  previewData,
  loading,
  onSend,
}: ReminderPreviewModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (previewData) {
      setRecipientEmail(previewData.recipientEmail)
      setSubject(previewData.subject)
      setText(previewData.text)
      setError(null)
    }
  }, [previewData])

  if (!isOpen) return null

  const handleSend = async () => {
    if (!previewData) return
    if (!recipientEmail.trim()) {
      setError('Bitte Empfänger-E-Mail angeben.')
      return
    }
    if (!subject.trim()) {
      setError('Bitte Betreff angeben.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const trimmedText = text.trim()
      await onSend({
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        text: trimmedText,
        html: textToHtml(trimmedText),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">
            Mahnung prüfen und senden
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-amber-100 hover:text-slate-700"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : !previewData ? (
            <p className="text-slate-500">Keine Vorschau geladen.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Prüfen Sie Empfänger, Betreff und E-Mail-Text. Änderungen sind möglich. Nach
                Klick auf „Senden“ wird die E-Mail mit PDF-Anhang versendet.
              </p>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  Empfänger (E-Mail)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="kunde@beispiel.at"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Betreff
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  E-Mail-Text (bearbeitbar)
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={12}
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      PDF-Anhang: {previewData.reminderTypeLabel}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      {previewData.pdfDescription}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !previewData || sending}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {sending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Wird gesendet…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Senden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
