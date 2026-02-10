'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export default function SetupPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      const { data: { session } } = await portalSupabase.auth.getSession()
      if (!session?.access_token) {
        // No session - redirect to login
        router.push('/portal/login')
        return
      }
      setAccessToken(session.access_token)
    }
    getSession()
  }, [router])

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    matches: password === confirmPassword && password.length > 0,
  }
  
  const isValid = Object.values(passwordChecks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || !accessToken) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/customer/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password, confirmPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          UNAUTHORIZED: 'Nicht angemeldet. Bitte loggen Sie sich erneut ein.',
          INVALID_PASSWORD: 'Ungültiges Passwort.',
          INVALID_SESSION: 'Session abgelaufen. Bitte loggen Sie sich erneut ein.',
          PASSWORD_UPDATE_FAILED: 'Passwort konnte nicht gesetzt werden.',
          INTERNAL_ERROR: 'Ein Fehler ist aufgetreten.',
        }
        setError(errorMessages[data.error] || data.error || 'Fehler beim Setzen des Passworts')
        return
      }

      // Update session if returned
      if (data.session?.access_token && data.session?.refresh_token) {
        await portalSupabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }

      // Success - redirect to portal
      router.push('/portal')
      router.refresh()

    } catch (err) {
      console.warn('Set password error:', err)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 px-4 py-12">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6">
            <Image
              src={LOGO_URL}
              alt="KüchenOnline"
              width={200}
              height={60}
              className="h-14 w-auto mx-auto"
              unoptimized
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Passwort erstellen</h1>
          <p className="mt-2 text-slate-500">
            Erstellen Sie ein Passwort für zukünftige Anmeldungen
          </p>
        </div>

        {/* Setup Card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Neues Passwort
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="block w-full rounded-xl border-0 bg-slate-100 py-4 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Anforderungen</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {passwordChecks.length ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                  <span>Mind. 8 Zeichen</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasLetter ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {passwordChecks.hasLetter ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                  <span>Buchstabe</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {passwordChecks.hasNumber ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                  <span>Zahl</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.matches ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {passwordChecks.matches ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                  <span>Stimmt überein</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                Passwort bestätigen
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  autoComplete="new-password"
                  className="block w-full rounded-xl border-0 bg-slate-100 py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200/50">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Wird gespeichert...</span>
                </>
              ) : (
                <span>Passwort speichern</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Nach dem Speichern können Sie sich mit Ihrer E-Mail und diesem Passwort anmelden.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} KüchenOnline. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  )
}
