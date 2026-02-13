'use client'

import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'baleah_voice_token'
const API_PATH = '/api/voice/capture'

export default function VoiceMobileClient() {
  const [token, setTokenState] = useState<string>('')
  const [savedToken, setSavedToken] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(TOKEN_KEY)
    setSavedToken(stored)
    if (stored) setTokenState(stored)
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
    setStatus('Token gespeichert. Du kannst jetzt diktieren.')
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
      const idempotencyKey = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      setStatus('Sende …')
      setError('')

      try {
        const res = await fetch(API_PATH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken.trim()}`,
          },
          body: JSON.stringify({
            text: text.trim(),
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
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Netzwerkfehler')
        setStatus('')
      }
    },
    [savedToken]
  )

  const startDictation = useCallback(() => {
    setError('')
    const win = typeof window !== 'undefined' ? window : null
    const Recognition = win && ((win as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ?? (win as unknown as { SpeechRecognition?: unknown }).SpeechRecognition)

    if (!Recognition) {
      setError('Diktierfunktion wird in diesem Browser nicht unterstützt. Bitte Safari auf dem iPhone verwenden.')
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

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">Baleah Voice (Handy)</h1>

        {!savedToken ? (
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="mb-2 text-sm text-slate-600">
              Token einmal eintragen (aus dem CRM: Einstellungen → Voice → Token erstellen → Secret kopieren).
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

        <div className="rounded-xl bg-white p-4 shadow">
          <button
            type="button"
            onClick={startDictation}
            disabled={!savedToken || listening}
            className="w-full rounded-lg bg-slate-800 py-4 font-medium text-white disabled:opacity-50"
          >
            {listening ? 'Höre zu …' : 'Diktieren'}
          </button>
        </div>

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
