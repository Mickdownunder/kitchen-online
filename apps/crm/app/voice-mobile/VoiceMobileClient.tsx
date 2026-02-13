'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'baleah_voice_token'
const HISTORY_KEY = 'baleah_voice_history'
const API_PATH = '/api/voice/capture'
const MAX_HISTORY = 10

type HistoryEntry = {
  text: string
  status: string
  message: string
  time: string
}

type ApiResponse = {
  ok?: boolean
  status?: string
  message?: string
  error?: string
  taskId?: string
  appointmentId?: string
}

function statusIcon(status: string): string {
  if (status === 'executed') return '\u2705'
  if (status === 'needs_confirmation') return '\u23F3'
  if (status === 'captured') return '\uD83D\uDCE5'
  if (status === 'failed') return '\u274C'
  return '\uD83D\uDCE4'
}

function statusLabel(status: string, message: string): string {
  if (status === 'executed') return message || 'Erledigt!'
  if (status === 'needs_confirmation') return 'Bitte im CRM bestätigen'
  if (status === 'captured') return 'Erfasst'
  if (status === 'failed') return message || 'Fehlgeschlagen'
  return message || status
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  return `vor ${Math.floor(hours / 24)} Tag(en)`
}

export default function VoiceMobileClient() {
  const [token, setTokenState] = useState('')
  const [savedToken, setSavedToken] = useState<string | null>(null)
  const [showTokenSetup, setShowTokenSetup] = useState(false)
  const [listening, setListening] = useState(false)
  const [sending, setSending] = useState(false)
  const [manualText, setManualText] = useState('')
  const [hasSpeechApi, setHasSpeechApi] = useState(false)
  const [lastResult, setLastResult] = useState<{ status: string; message: string } | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(TOKEN_KEY)
    setSavedToken(stored)
    if (stored) setTokenState(stored)
    if (!stored) setShowTokenSetup(true)

    const win = window as unknown as Record<string, unknown>
    setHasSpeechApi(Boolean(win.webkitSpeechRecognition || win.SpeechRecognition))

    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[]
      setHistory(h)
    } catch { /* ignore */ }
  }, [])

  const addHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const saveToken = useCallback(() => {
    const t = token.trim()
    if (!t) { setError('Bitte Token einfügen.'); return }
    localStorage.setItem(TOKEN_KEY, t)
    setSavedToken(t)
    setShowTokenSetup(false)
    setError('')
  }, [token])

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setSavedToken(null)
    setTokenState('')
    setShowTokenSetup(true)
  }, [])

  const showResult = useCallback((status: string, message: string) => {
    setLastResult({ status, message })
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
    resultTimeoutRef.current = setTimeout(() => setLastResult(null), 5000)
  }, [])

  const sendCapture = useCallback(
    async (text: string) => {
      if (!savedToken?.trim()) { setError('Kein Token gespeichert.'); return }
      const trimmed = text.trim()
      if (!trimmed) { setError('Bitte Text eingeben oder diktieren.'); return }

      const idempotencyKey = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      setError('')
      setSending(true)
      setLastResult(null)

      try {
        const res = await fetch(API_PATH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken.trim()}`,
          },
          body: JSON.stringify({ text: trimmed, idempotencyKey, source: 'mobile_app' }),
        })
        const data = (await res.json().catch(() => ({}))) as ApiResponse

        if (!res.ok) {
          const msg = data.message || data.error || `Fehler ${res.status}`
          setError(msg)
          addHistory({ text: trimmed, status: 'failed', message: msg, time: new Date().toISOString() })
          return
        }
        const status = data.status || 'captured'
        const message = data.message || 'Erfasst.'
        showResult(status, message)
        addHistory({ text: trimmed, status, message, time: new Date().toISOString() })
        setManualText('')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Netzwerkfehler'
        setError(msg)
        addHistory({ text: trimmed, status: 'failed', message: msg, time: new Date().toISOString() })
      } finally {
        setSending(false)
      }
    },
    [savedToken, showResult, addHistory],
  )

  const startDictation = useCallback(() => {
    setError('')
    setLastResult(null)
    const win = typeof window !== 'undefined' ? window : null
    const Recognition =
      win &&
      ((win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ??
        (win as unknown as { SpeechRecognition?: unknown }).SpeechRecognition)

    if (!Recognition) {
      setError('Spracherkennung nicht verfügbar.')
      return
    }

    const rec = new (Recognition as new () => {
      start: () => void
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: ((e: { results: unknown }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
    })()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'de-DE'

    setListening(true)
    rec.onresult = (event: { results: unknown }) => {
      const results = event.results as { [i: number]: { [j: number]: { transcript?: string } } }
      const transcript = results[0]?.[0]?.transcript ?? ''
      setListening(false)
      if (transcript.trim()) {
        setManualText(transcript.trim())
        void sendCapture(transcript)
      } else {
        setError('Nichts erkannt.')
      }
    }
    rec.onerror = () => { setListening(false); setError('Mikrofon fehlgeschlagen.') }
    rec.onend = () => setListening(false)
    rec.start()
  }, [sendCapture])

  const handleManualSend = useCallback(() => { void sendCapture(manualText) }, [sendCapture, manualText])

  const isReady = Boolean(savedToken) && !sending

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Safe area spacer for notch */}
      <div className="h-[env(safe-area-inset-top)]" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-2 pt-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Baleah Voice</h1>
          <p className="text-xs text-slate-400">Spracherkennung &middot; CRM</p>
        </div>
        <div className="flex gap-2">
          {savedToken && (
            <button
              type="button"
              onClick={() => setShowHistory(h => !h)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-white backdrop-blur-sm transition-colors active:bg-white/20"
              aria-label="Verlauf"
            >
              {'\uD83D\uDCCB'}
            </button>
          )}
          <button
            type="button"
            onClick={() => savedToken ? clearToken() : setShowTokenSetup(s => !s)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-white backdrop-blur-sm transition-colors active:bg-white/20"
            aria-label="Einstellungen"
          >
            {'\u2699\uFE0F'}
          </button>
        </div>
      </header>

      {/* Token Setup (collapsible) */}
      {showTokenSetup && (
        <div className="mx-5 mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <p className="mb-3 text-sm leading-relaxed text-slate-300">
            Gehe im CRM zu <span className="font-medium text-amber-400">Einstellungen &rarr; Voice</span> und
            erstelle einen Token. Secret hier einfügen:
          </p>
          <textarea
            className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
            placeholder="vct_..."
            rows={2}
            value={token}
            onChange={(e) => setTokenState(e.target.value)}
          />
          <button
            type="button"
            onClick={saveToken}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            Token speichern
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col justify-center px-5">
        {/* Result toast */}
        {lastResult && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-center backdrop-blur-md transition-all duration-300 ${
              lastResult.status === 'executed'
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : lastResult.status === 'failed'
                  ? 'border-rose-500/20 bg-rose-500/10'
                  : 'border-amber-500/20 bg-amber-500/10'
            }`}
          >
            <span className="text-2xl">{statusIcon(lastResult.status)}</span>
            <p className={`mt-1 text-sm font-medium ${
              lastResult.status === 'executed' ? 'text-emerald-300' :
              lastResult.status === 'failed' ? 'text-rose-300' : 'text-amber-300'
            }`}>
              {statusLabel(lastResult.status, lastResult.message)}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-center backdrop-blur-md">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* Mic button */}
        {hasSpeechApi && savedToken && (
          <div className="mb-8 flex justify-center">
            <button
              type="button"
              onClick={startDictation}
              disabled={!isReady || listening}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-all duration-200 active:scale-95 disabled:opacity-40 ${
                listening
                  ? 'bg-rose-500 shadow-rose-500/40'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
              }`}
            >
              {/* Pulse rings when listening */}
              {listening && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-20" />
                  <span className="absolute -inset-3 animate-pulse rounded-full border-2 border-rose-400/30" />
                </>
              )}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`relative z-10 h-12 w-12 ${listening ? 'text-white' : 'text-white'}`}
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          </div>
        )}

        {/* Listening indicator text */}
        {listening && (
          <p className="mb-6 text-center text-sm font-medium text-rose-300 animate-pulse">
            H&ouml;re zu &hellip;
          </p>
        )}

        {/* Text input */}
        {savedToken && (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-base leading-relaxed text-white placeholder-slate-500 outline-none backdrop-blur-sm focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
              placeholder={hasSpeechApi
                ? 'Oder hier tippen / Tastatur-Mikrofon nutzen …'
                : 'Text eingeben oder Tastatur-Mikrofon nutzen …'
              }
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && manualText.trim()) {
                  e.preventDefault()
                  handleManualSend()
                }
              }}
            />
            <button
              type="button"
              onClick={handleManualSend}
              disabled={!isReady || !manualText.trim()}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sende &hellip;
                </span>
              ) : (
                'Absenden'
              )}
            </button>
          </div>
        )}

        {/* Quick hints */}
        {savedToken && !listening && !sending && !lastResult && (
          <div className="mt-6 space-y-1.5">
            <p className="text-center text-xs text-slate-500">Beispiele:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Termin mit Müller morgen um 10:00', 'Aufgabe: Angebot schicken', 'Notiz dringend nachfassen'].map(
                (hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => { setManualText(hint); textareaRef.current?.focus() }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors active:bg-white/10"
                  >
                    {hint}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="mx-5 mb-5 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2.5 backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verlauf</span>
            <button
              type="button"
              onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY) }}
              className="text-xs text-slate-500 transition-colors active:text-rose-400"
            >
              L&ouml;schen
            </button>
          </div>
          {history.map((entry, i) => (
            <div
              key={`${entry.time}-${i}`}
              className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-b-0"
            >
              <span className="mt-0.5 text-base">{statusIcon(entry.status)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{entry.text}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {statusLabel(entry.status, entry.message)} &middot; {timeAgo(entry.time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No token hint */}
      {!savedToken && !showTokenSetup && (
        <div className="px-5 pb-8 text-center">
          <button
            type="button"
            onClick={() => setShowTokenSetup(true)}
            className="text-sm text-amber-400 underline underline-offset-4"
          >
            Token einrichten um loszulegen
          </button>
        </div>
      )}

      {/* Safe area spacer for bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  )
}
