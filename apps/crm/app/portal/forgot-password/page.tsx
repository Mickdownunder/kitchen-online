'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/customer/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'RATE_LIMITED') {
          setError('Zu viele Anfragen. Bitte warten Sie einen Moment.')
        } else {
          setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      console.warn('Reset password error:', err)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 px-4">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src={LOGO_URL}
          alt="KüchenOnline"
          width={180}
          height={50}
          className="h-12 w-auto mx-auto"
          unoptimized
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
        {success ? (
          // Success State
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">E-Mail gesendet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Wenn ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Bitte prüfen Sie auch Ihren Spam-Ordner.
            </p>
            <Link
              href="/portal/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Login
            </Link>
          </div>
        ) : (
          // Form State
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-900">Passwort vergessen?</h2>
              <p className="mt-2 text-sm text-slate-600">
                Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  E-Mail-Adresse
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  'Link senden'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/portal/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zum Login
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} KüchenOnline GmbH</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <a 
            href="https://kuechenonline.com/impressum" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            Impressum
          </a>
          <span>·</span>
          <a 
            href="https://kuechenonline.com/datenschutz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            Datenschutz
          </a>
        </div>
      </div>
    </div>
  )
}
