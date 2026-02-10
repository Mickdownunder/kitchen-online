'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { portalSupabase } from '@/lib/supabase/portal-client'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Supabase adds the token info as hash fragments after redirect
        // We need to exchange them for a session
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'recovery' && access_token && refresh_token) {
          // Set the session
          const { error } = await portalSupabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            console.warn('Session error:', error)
            setError('Der Link ist ungültig oder abgelaufen.')
            setTokenValid(false)
          } else {
            setAccessToken(access_token)
            setTokenValid(true)
          }
        } else {
          // Check if we already have a valid session from recovery
          const { data: { session } } = await portalSupabase.auth.getSession()
          if (session) {
            setAccessToken(session.access_token)
            setTokenValid(true)
          } else {
            setError('Kein gültiger Reset-Link gefunden.')
            setTokenValid(false)
          }
        }
      } catch (err) {
        console.warn('Token validation error:', err)
        setError('Ein Fehler ist aufgetreten.')
        setTokenValid(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen haben.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/customer/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token: accessToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'INVALID_TOKEN') {
          setError('Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.')
        } else {
          setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
        }
        return
      }

      // Success!
      if (data.session) {
        // Set the new session
        await portalSupabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }

      setSuccess(true)

      // Redirect to portal after short delay
      setTimeout(() => {
        router.push('/portal')
      }, 2000)

    } catch (err) {
      console.warn('Reset error:', err)
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-4 text-slate-600">Link wird überprüft...</p>
      </div>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Link ungültig</h2>
        <p className="mt-2 text-sm text-slate-600">
          {error || 'Der Link ist ungültig oder abgelaufen.'}
        </p>
        <Link
          href="/portal/forgot-password"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          Neuen Link anfordern
        </Link>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Passwort geändert!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Ihr Passwort wurde erfolgreich geändert. Sie werden weitergeleitet...
        </p>
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-emerald-500" />
      </div>
    )
  }

  // Form state
  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">Neues Passwort setzen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Geben Sie Ihr neues Passwort ein.
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
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Neues Passwort
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
              minLength={8}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Passwort bestätigen
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
              minLength={8}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            'Passwort ändern'
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
  )
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-4 text-slate-600">Wird geladen...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
