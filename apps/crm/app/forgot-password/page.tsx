'use client'

import React, { useState } from 'react'
import { resetPasswordForEmail } from '@/lib/supabase/services'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await resetPasswordForEmail(email)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden der E-Mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
              <Mail className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="mb-2 text-2xl font-black text-slate-900">Passwort vergessen?</h1>
            <p className="text-sm text-slate-500">
              Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
            </p>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="font-bold text-green-800">E-Mail gesendet!</p>
                  <p className="mt-1 text-sm text-green-700">
                    Wir haben einen Link zum Zurücksetzen an <strong>{email}</strong> gesendet.
                    Bitte prüfen Sie auch Ihren Spam-Ordner.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-4 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zum Login
              </Link>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    E-Mail-Adresse
                  </label>
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

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-4 font-bold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Reset-Link senden
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-amber-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück zum Login
                </Link>
              </div>
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
