'use client'

import React, { useState } from 'react'
import { signIn } from '@/lib/supabase/services'
import { supabase } from '@/lib/supabase/client'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import Link from 'next/link'
import Image from 'next/image'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn(email, password)

      if (!result?.user || !result?.session) {
        throw new Error('Anmeldung fehlgeschlagen - Keine Session erstellt')
      }

      logger.info('Login successful', { component: 'LoginForm', userId: result.user.id })

      // Verify session is stored
      const {
        data: { session: verifySession },
      } = await supabase.auth.getSession()
      if (!verifySession) {
        throw new Error('Session wurde nicht gespeichert')
      }

      logger.debug('Session verified in storage', { component: 'LoginForm' })

      // Small delay to ensure cookies are set
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force a full page reload to ensure middleware sees the session
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      logger.error('Login error', { component: 'LoginForm' }, err as Error)
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          {/* Logo/Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 items-center justify-center">
              <Image
                src={LOGO_URL}
                alt="KüchenOnline"
                width={180}
                height={60}
                className="h-auto w-auto max-h-16"
                priority
              />
            </div>
            <h1 className="mb-2 text-2xl font-black text-slate-900">Willkommen zurück</h1>
            <p className="text-sm text-slate-500">Melden Sie sich in Ihrem CRM-Konto an</p>
          </div>

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
              <label className="mb-2 block text-sm font-bold text-slate-700">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Passwort</label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-600 hover:shadow-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Anmeldung...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Anmelden
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Noch kein Konto?{' '}
              <Link
                href="/signup"
                className="font-bold text-amber-600 transition-colors hover:text-amber-700"
              >
                Registrieren
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-400">
          <p>© 2025 KüchenOnline GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  )
}
