'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { KeyRound, Loader2, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

type LoginMode = 'code' | 'email'

export default function PortalLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('code')
  
  // Code login
  const [accessCode, setAccessCode] = useState('')
  
  // Email login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const body = mode === 'code' 
        ? { accessCode: accessCode.trim() }
        : { email: email.trim(), password }

      const response = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        // Spezialfall: Passwort bereits gesetzt → zum E-Mail Login wechseln
        if (data.error === 'PASSWORD_ALREADY_SET') {
          setMode('email')
          if (data.customerEmail) {
            setEmail(data.customerEmail)
          }
          setError('Ihr Zugang ist bereits eingerichtet. Bitte loggen Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort ein.')
          return
        }
        
        const errorMessages: Record<string, string> = {
          INVALID_ACCESS_CODE_FORMAT: 'Ungültiges Format. Der Projektcode muss mindestens 6 Zeichen haben.',
          INVALID_ACCESS_CODE: 'Ungültiger Projektcode. Bitte überprüfen Sie Ihre Eingabe.',
          INVALID_CREDENTIALS: 'E-Mail oder Passwort falsch.',
          INVALID_REQUEST: 'Ungültige Anfrage.',
          PROJECT_CLOSED: 'Dieses Projekt ist abgeschlossen.',
          NO_CUSTOMER_ASSIGNED: 'Diesem Projekt ist kein Kunde zugeordnet.',
          CUSTOMER_NOT_FOUND: 'Kundendaten nicht gefunden.',
          SESSION_CREATE_FAILED: 'Session konnte nicht erstellt werden.',
          INTERNAL_ERROR: 'Ein interner Fehler ist aufgetreten.',
        }
        setError(errorMessages[data.error] || data.error || 'Anmeldung fehlgeschlagen')
        return
      }

      // Set the session
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: sessionError } = await portalSupabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })

        if (sessionError) {
          console.error('Session set error:', sessionError)
          setError('Session konnte nicht gespeichert werden.')
          return
        }
      }

      // Check if password setup is needed
      if (data.needsPasswordSetup) {
        router.push('/portal/setup-password')
      } else {
        router.push('/portal')
      }
      router.refresh()

    } catch (err) {
      console.error('Login error:', err)
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
          <h1 className="text-2xl font-bold text-slate-900">Kundenportal</h1>
          <p className="mt-2 text-slate-500">
            {mode === 'code' 
              ? 'Melden Sie sich mit Ihrem Projektcode an'
              : 'Melden Sie sich mit E-Mail und Passwort an'}
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
          {/* Mode Tabs */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('code'); setError(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'code'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Projektcode
            </button>
            <button
              type="button"
              onClick={() => { setMode('email'); setError(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                mode === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              E-Mail Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'code' ? (
              // Code Login
              <div>
                <label htmlFor="accessCode" className="block text-sm font-semibold text-slate-700">
                  Projektcode
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="z.B. ABC-1234"
                    required
                    autoFocus
                    autoComplete="off"
                    className="block w-full rounded-xl border-0 bg-slate-100 py-4 pl-12 pr-4 text-center text-lg font-mono tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            ) : (
              // Email Login
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                    E-Mail Adresse
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ihre@email.de"
                      required
                      autoFocus
                      autoComplete="email"
                      className="block w-full rounded-xl border-0 bg-slate-100 py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Passwort
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="block w-full rounded-xl border-0 bg-slate-100 py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <a href="/portal/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    Passwort vergessen?
                  </a>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200/50">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (mode === 'code' ? !accessCode.trim() : !email.trim() || !password)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Wird angemeldet...</span>
                </>
              ) : (
                <>
                  <span>Anmelden</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            {mode === 'code' ? (
              <>
                <p className="text-sm text-slate-500">
                  Ihren Projektcode haben Sie per E-Mail erhalten.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Bereits registriert? Wechseln Sie zum E-Mail Login.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Noch kein Passwort? Nutzen Sie den Projektcode für den ersten Login.
              </p>
            )}
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
