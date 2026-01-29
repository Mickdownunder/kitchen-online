'use client'

import React, { useState } from 'react'
import { signUp } from '@/lib/supabase/services'
import { useRouter } from 'next/navigation'
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react'

export default function SignUpForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      setLoading(false)
      return
    }

    try {
      await signUp(email, password, fullName, 'verkaeufer')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-black text-slate-900">Neues Konto erstellen</h1>
            <p className="text-slate-500">Registrieren Sie sich für das Management System</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-widest text-slate-700">
                Vollständiger Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-widest text-slate-700">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-widest text-slate-700">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black uppercase tracking-widest text-slate-700">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-4 text-sm font-black uppercase tracking-widest text-blue-900 transition-all hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  Registrierung...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Registrieren
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Bereits ein Konto?{' '}
              <a href="/login" className="font-bold text-yellow-600 hover:text-yellow-700">
                Anmelden
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
