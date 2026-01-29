'use client'

import React, { useState, useEffect } from 'react'
import { updatePassword } from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, CheckCircle, AlertCircle, KeyRound, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInvited = searchParams.get('invited') === 'true'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  // Prüfe ob eine gültige Recovery-Session existiert
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Supabase setzt automatisch eine Session wenn der User über den Reset-Link kommt
      setIsValidSession(!!session)
    }

    checkSession()

    // Höre auf Auth-Änderungen (z.B. wenn User über Link reinkommt)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      } else if (session) {
        setIsValidSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validierung
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      await updatePassword(password)
      setSuccess(true)

      // Nach 3 Sekunden weiterleiten
      setTimeout(() => {
        // Eingeladene User direkt zum Dashboard, andere zum Login
        router.push(isInvited ? '/dashboard' : '/login')
      }, 3000)
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : (err as { name?: string })?.name
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === 'string'
            ? (err as { message: string }).message
            : 'Fehler beim Aktualisieren des Passworts'

      // AbortError / "operation aborted" – z. B. bei Navigation oder abgebrochenem Request
      if (name === 'AbortError' || /aborted|operation was aborted/i.test(msg)) {
        setError('Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut.')
        return
      }

      const isWeak = /weak|easy to guess|zu schwach|bekannt/i.test(msg)
      setError(
        isWeak
          ? 'Das Passwort ist zu unsicher. Bitte wählen Sie ein stärkeres Passwort (z. B. mit Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen).'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  // Loading-State während Session-Check
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  // Keine gültige Session
  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="mb-2 text-2xl font-black text-slate-900">Link ungültig</h1>
              <p className="text-sm text-slate-500">
                Der Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
              </p>
            </div>

            <Link
              href="/forgot-password"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 font-bold text-white transition-all hover:bg-amber-600"
            >
              Neuen Link anfordern
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${isInvited ? 'bg-green-100' : 'bg-amber-100'}`}
            >
              {isInvited ? (
                <UserPlus className="h-8 w-8 text-green-600" />
              ) : (
                <KeyRound className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <h1 className="mb-2 text-2xl font-black text-slate-900">
              {isInvited ? 'Willkommen!' : 'Neues Passwort setzen'}
            </h1>
            <p className="text-sm text-slate-500">
              {isInvited
                ? 'Sie wurden eingeladen. Bitte setzen Sie Ihr Passwort, um Ihr Konto zu aktivieren.'
                : 'Geben Sie Ihr neues Passwort ein. Es muss mindestens 6 Zeichen lang sein.'}
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="font-bold text-green-800">
                    {isInvited ? 'Konto aktiviert!' : 'Passwort aktualisiert!'}
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    {isInvited
                      ? 'Ihr Konto wurde erfolgreich erstellt. Sie werden zum Dashboard weitergeleitet...'
                      : 'Ihr Passwort wurde erfolgreich geändert. Sie werden zum Login weitergeleitet...'}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Neues Passwort
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mindestens 6 Zeichen"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Passwort bestätigen
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Passwort wiederholen"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-2 text-sm text-red-500">Passwörter stimmen nicht überein</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 font-bold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Wird gespeichert...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Passwort speichern
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-400">
          <p>© 2025 Management System. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  )
}
