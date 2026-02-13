'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Loader2, ShieldCheck, Trash2, Volume2 } from 'lucide-react'
import type { CompanySettings, VoiceApiToken } from '@/types'
import { useToast } from '@/components/providers/ToastProvider'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string
}

interface CreatedTokenPayload {
  token: VoiceApiToken
  secret: string
}

export function VoiceTab({
  companySettings,
  setCompanySettings,
  saving,
  onSaveCompany,
}: {
  companySettings: Partial<CompanySettings>
  setCompanySettings: React.Dispatch<React.SetStateAction<Partial<CompanySettings>>>
  saving: boolean
  onSaveCompany: () => Promise<void>
}) {
  const { success, error } = useToast()

  const [tokens, setTokens] = useState<VoiceApiToken[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [creatingToken, setCreatingToken] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null)
  const [newTokenLabel, setNewTokenLabel] = useState('Siri Shortcut')
  const [newTokenDays, setNewTokenDays] = useState(180)
  const [newTokenSecret, setNewTokenSecret] = useState<string | null>(null)

  async function loadTokens() {
    setLoadingTokens(true)

    try {
      const response = await fetch('/api/voice/tokens', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<VoiceApiToken[]>

      if (!response.ok || body.success === false) {
        throw new Error(body.error || 'Voice-Tokens konnten nicht geladen werden.')
      }

      setTokens(Array.isArray(body.data) ? body.data : [])
    } catch (loadError) {
      error(loadError instanceof Error ? loadError.message : 'Voice-Tokens konnten nicht geladen werden.')
    } finally {
      setLoadingTokens(false)
    }
  }

  useEffect(() => {
    void loadTokens()
  }, [])

  async function createToken() {
    if (!newTokenLabel.trim()) {
      error('Bitte ein Token-Label eingeben.')
      return
    }

    setCreatingToken(true)

    try {
      const response = await fetch('/api/voice/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          label: newTokenLabel.trim(),
          expiresInDays: newTokenDays,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<CreatedTokenPayload>
      if (!response.ok || body.success === false || !body.data) {
        throw new Error(body.error || 'Voice-Token konnte nicht erstellt werden.')
      }

      setNewTokenSecret(body.data.secret)
      setTokens((current) => [body.data!.token, ...current])
      success('Voice-Token wurde erstellt. Secret jetzt sicher speichern.')
    } catch (createError) {
      error(createError instanceof Error ? createError.message : 'Voice-Token konnte nicht erstellt werden.')
    } finally {
      setCreatingToken(false)
    }
  }

  async function revokeToken(tokenId: string) {
    if (!confirm('Token wirklich widerrufen?')) {
      return
    }

    setRevokingTokenId(tokenId)

    try {
      const response = await fetch(`/api/voice/tokens/${tokenId}/revoke`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      const body = (await response.json().catch(() => ({}))) as ApiEnvelope<VoiceApiToken>
      if (!response.ok || body.success === false || !body.data) {
        throw new Error(body.error || 'Token konnte nicht widerrufen werden.')
      }

      setTokens((current) => current.map((token) => (token.id === tokenId ? body.data! : token)))
      success('Token wurde widerrufen.')
    } catch (revokeError) {
      error(revokeError instanceof Error ? revokeError.message : 'Token konnte nicht widerrufen werden.')
    } finally {
      setRevokingTokenId(null)
    }
  }

  function formatDate(value?: string): string {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('de-DE')
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
          <Volume2 className="h-5 w-5 text-amber-500" />
          Voice Feature Flags
        </h3>

        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={Boolean(companySettings.voiceCaptureEnabled)}
              onChange={(event) =>
                setCompanySettings((prev) => ({
                  ...prev,
                  voiceCaptureEnabled: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">Voice Capture aktivieren</span>
              <span className="block text-xs text-slate-500">
                Erlaubt Siri/Voice-Capture Requests für diese Firma.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={Boolean(companySettings.voiceAutoExecuteEnabled)}
              onChange={(event) =>
                setCompanySettings((prev) => ({
                  ...prev,
                  voiceAutoExecuteEnabled: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">Auto-Execution aktivieren</span>
              <span className="block text-xs text-slate-500">
                Führt High-Confidence Voice-Intents automatisch aus.
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            void onSaveCompany()
          }}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Voice-Einstellungen speichern
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
          <KeyRound className="h-5 w-5 text-blue-500" />
          Siri API Tokens
        </h3>

        <div className="grid gap-3 md:grid-cols-[1.4fr_140px_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Label</label>
            <input
              type="text"
              value={newTokenLabel}
              onChange={(event) => setNewTokenLabel(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="z. B. iPhone Shortcut"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Tage</label>
            <input
              type="number"
              min={1}
              max={3650}
              value={newTokenDays}
              onChange={(event) => setNewTokenDays(Number(event.target.value) || 180)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void createToken()
            }}
            disabled={creatingToken}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Token erstellen
          </button>
        </div>

        {newTokenSecret && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-black">Token Secret (nur einmal sichtbar)</p>
            <code className="mt-1 block break-all rounded-lg bg-white p-2 text-xs">{newTokenSecret}</code>
            <p className="mt-2 text-xs">Dieses Secret wird nicht erneut angezeigt.</p>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {loadingTokens ? (
            <div className="flex items-center py-4 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lade Tokens...
            </div>
          ) : tokens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
              Noch keine Voice-Tokens vorhanden.
            </p>
          ) : (
            tokens.map((token) => {
              const revoking = revokingTokenId === token.id
              return (
                <article key={token.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{token.label}</p>
                      <p className="text-xs text-slate-500">
                        Prefix: {token.tokenPrefix} · Läuft ab: {formatDate(token.expiresAt)} · Zuletzt genutzt:{' '}
                        {formatDate(token.lastUsedAt)}
                      </p>
                      {token.revokedAt && (
                        <p className="text-xs font-bold text-rose-600">Widerrufen: {formatDate(token.revokedAt)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(token.revokedAt) || revoking}
                      onClick={() => {
                        void revokeToken(token.id)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Widerrufen
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
