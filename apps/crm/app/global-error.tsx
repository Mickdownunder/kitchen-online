'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
            <h1 className="mb-4 text-2xl font-black text-slate-900">Etwas ist schiefgelaufen</h1>
            <p className="mb-6 text-slate-600">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </p>
            {error.digest && (
              <p className="mb-4 text-xs text-slate-400">Fehler-ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="w-full rounded-xl bg-amber-500 px-6 py-3 font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
