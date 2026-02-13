'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'baleah_voice_token'
const API_PATH = '/api/voice/capture'

export default function VoiceMobileClient() {
  const [token, setTokenState] = useState<string>('')
  const [savedToken, setSavedToken] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [listening, setListening] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>('')
  const [manualText, setManualText] = useState('')
  const [hasSpeechApi, setHasSpeechApi] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(TOKEN_KEY)
    setSavedToken(stored)
    if (stored) setTokenState(stored)
    // Detect Speech API support
    const win = window as unknown as Record<string, unknown>
    setHasSpeechApi(Boolean(win.webkitSpeechRecognition || win.SpeechRecognition))
  }, [])

  const saveToken = useCallback(() => {
    const t = token.trim()
    if (!t) {
      setError('Bitte Token einfügen.')
      return
    }
    localStorage.setItem(TOKEN_KEY, t)
    setSavedToken(t)
    setError('')
    setStatus('Token gespeichert.')
  }, [token])

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setSavedToken(null)
    setTokenState('')
    setStatus('')
  }, [])

  const sendCapture = useCallback(
    async (text: string) => {
      if (!savedToken?.trim()) {
        setError('Kein Token. Bitte oben Token eintragen und speichern.')
        return
      }
      const trimmed = text.trim()
      if (!trimmed) {
        setError('Bitte Text eingeben oder diktieren.')
        return
      }
      const idempotencyKey = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      setStatus('Sende …')
      setError('')
      setSending(true)

      try {
        const res = await fetch(API_PATH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken.trim()}`,
          },
          body: JSON.stringify({
            text: trimmed,
            idempotencyKey,
            source: 'mobile_app',
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          status?: string
          message?: string
          error?: string
        }

        if (!res.ok) {
          setError(data.message || data.error || `Fehler ${res.status}`)
          setStatus('')
          return
        }
        setStatus(data.message || 'Erfasst.')
        setManualText('')
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Netzwerkfehler')
        setStatus('')
      } finally {
        setSending(false)
      }
    },
    [savedToken],
  )

  const startDictation = useCallback(() => {
    setError('')
    const win = typeof window !== 'undefined' ? window : null
    const Recognition =
      win &&
      ((win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ??
        (win as unknown as { SpeechRecognition?: unknown }).SpeechRecognition)

    if (!Recognition) {
      setError('Spracherkennung nicht verfügbar. Nutze das Textfeld oder die iPhone-Tastatur-Diktierfunktion.')
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
      if (transcript.trim()) void sendCapture(transcript)
      else setStatus('Nichts erkannt. Bitte erneut versuchen.')
    }
    rec.onerror = () => {
      setListening(false)
      setError('Mikrofon fehlgeschlagen. Erlaube Mikrofon-Zugriff und versuche es nochmal.')
    }
    rec.onend = () => setListening(false)
    rec.start()
  }, [sendCapture])

  const handleManualSend = useCallback(() => {
    void sendCapture(manualText)
  }, [sendCapture, manualText])

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">Baleah Voice</h1>

        {/* Token setup */}
        {!savedToken ? (
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="mb-2 text-sm text-slate-600">
              Token einmal eintragen (CRM: Einstellungen &rarr; Voice &rarr; Token erstellen &rarr; Secret kopieren).
            </p>
            <textarea
              className="mb-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
              placeholder="Token hier einfügen …"
              rows={3}
              value={token}
              onChange={(e) => setTokenState(e.target.value)}
            />
            <button
              type="button"
              onClick={saveToken}
              className="w-full rounded-lg bg-amber-500 py-3 font-medium text-white"
            >
              Token speichern
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="mb-2 text-sm text-slate-600">Token ist gespeichert.</p>
            <button type="button" onClick={clearToken} className="text-sm text-amber-600 underline">
              Token löschen
            </button>
          </div>
        )}

        {/* Dictation button (only if Speech API available) */}
        {hasSpeechApi && (
          <div className="rounded-xl bg-white p-4 shadow">
            <button
              type="button"
              onClick={startDictation}
              disabled={!savedToken || listening || sending}
              className="w-full rounded-lg bg-slate-800 py-4 font-medium text-white disabled:opacity-50"
            >
              {listening ? 'Höre zu …' : 'Diktieren'}
            </button>
          </div>
        )}

        {/* Manual text input — always visible as fallback */}
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="mb-2 text-sm text-slate-500">
            {hasSpeechApi
              ? 'Oder Text eingeben / per Tastatur-Mikrofon diktieren:'
              : 'Text eingeben oder per Tastatur-Mikrofon diktieren:'}
          </p>
          <textarea
            ref={textareaRef}
            className="mb-3 w-full rounded-lg border border-slate-300 p-3 text-base leading-relaxed"
            placeholder="z.B. Aufgabe: Angebot an Müller schicken bis Freitag"
            rows={3}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
          <button
            type="button"
            onClick={handleManualSend}
            disabled={!savedToken || sending || !manualText.trim()}
            className="w-full rounded-lg bg-amber-500 py-3 font-medium text-white disabled:opacity-50"
          >
            {sending ? 'Sende …' : 'Absenden'}
          </button>
        </div>

        {/* Status / Error */}
        {(status || error) && (
          <div
            className={`rounded-xl p-4 ${error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}
          >
            {error || status}
          </div>
        )}
      </div>
    </div>
  )
}
