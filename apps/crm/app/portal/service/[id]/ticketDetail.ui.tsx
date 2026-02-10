import { useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Headphones,
  Loader2,
  Paperclip,
  Send,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useCustomerApi } from '../../hooks/useCustomerApi'

export interface Ticket {
  id: string
  subject: string
  status: string
  type: string
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  message: string
  file_url: string | null
  is_customer: boolean
  created_at: string
  author_id: string
}

export const ticketStatusConfig: Record<
  string,
  { label: string; icon: LucideIcon; bgColor: string; textColor: string; dotColor: string }
> = {
  OFFEN: {
    label: 'Offen',
    icon: Circle,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  IN_BEARBEITUNG: {
    label: 'In Bearbeitung',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  GESCHLOSSEN: {
    label: 'Geschlossen',
    icon: CheckCircle2,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    dotColor: 'bg-slate-400',
  },
}

function formatTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Heute'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Gestern'
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="rounded-full bg-slate-100 px-4 py-1.5">
        <span className="text-xs font-medium text-slate-500">{formatDate(date)}</span>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: TicketMessage
  isOwn: boolean
  onOpenAttachment: (message: TicketMessage) => Promise<void>
}

export function MessageBubble({ message, isOwn, onOpenAttachment }: MessageBubbleProps) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isOwn ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-slate-600 to-slate-700'
        }`}
      >
        {isOwn ? <User className="h-4 w-4 text-white" /> : <Headphones className="h-4 w-4 text-white" />}
      </div>

      <div className={`flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <span className={`mb-1 text-xs font-medium ${isOwn ? 'text-amber-600' : 'text-slate-500'}`}>
          {isOwn ? 'Sie' : 'KüchenOnline Team'}
        </span>

        <div
          className={`rounded-2xl px-4 py-3 ${
            isOwn
              ? 'rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
              : 'rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{message.message}</p>

          {message.file_url && (
            <button
              type="button"
              onClick={() => onOpenAttachment(message)}
              className={`mt-2 flex items-center gap-1.5 text-sm underline-offset-2 hover:underline ${
                isOwn ? 'text-amber-100' : 'text-amber-600'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Anhang öffnen
            </button>
          )}
        </div>

        <span className="mt-1 text-xs text-slate-400">{formatTime(message.created_at)}</span>
      </div>
    </div>
  )
}

interface ReplyFormProps {
  ticketId: string
  onSuccess: () => void
  disabled: boolean
}

export function ReplyForm({ ticketId, onSuccess, disabled }: ReplyFormProps) {
  const { accessToken } = useCustomerApi()
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!accessToken || !message.trim()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let body: BodyInit
      let headers: HeadersInit = {
        Authorization: `Bearer ${accessToken}`,
      }

      if (file) {
        const formData = new FormData()
        formData.append('message', message)
        formData.append('file', file)
        body = formData
      } else {
        headers = {
          ...headers,
          'Content-Type': 'application/json',
        }
        body = JSON.stringify({ message })
      }

      const response = await fetch(`/api/customer/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers,
        body,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      setMessage('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={disabled ? 'Dieses Ticket ist geschlossen' : 'Schreiben Sie eine Nachricht...'}
            disabled={disabled || isSubmitting}
            rows={1}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 150)}px`
            }}
            className="w-full resize-none rounded-2xl border-0 bg-slate-100 px-4 py-3 pr-12 text-slate-800 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !message.trim()}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          disabled={disabled || isSubmitting}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
        />
      </div>
    </form>
  )
}
