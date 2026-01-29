'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, CheckCircle2 } from 'lucide-react'

export default function ClearDataPage() {
  const router = useRouter()
  const [cleared, setCleared] = useState(false)

  const clearAllData = () => {
    // Clear localStorage
    localStorage.removeItem('kp_projects')
    localStorage.removeItem('kp_appointments')

    setCleared(true)

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-black text-slate-900">Alle Daten löschen</h1>
          <p className="text-slate-500">
            Dies löscht alle Projekte und Termine aus dem Browser-Speicher
          </p>
        </div>

        {cleared ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <p className="mb-2 font-bold text-green-600">Daten gelöscht!</p>
            <p className="text-sm text-slate-500">Weiterleitung zum Dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="mb-2 text-sm font-bold text-red-700">⚠️ Warnung</p>
              <p className="text-xs text-red-600">
                Dies löscht alle lokalen Daten (Projekte, Termine). Daten in Supabase werden NICHT
                gelöscht.
              </p>
            </div>

            <button
              onClick={clearAllData}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-red-600"
            >
              <Trash2 className="h-5 w-5" />
              Alle Daten löschen
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
