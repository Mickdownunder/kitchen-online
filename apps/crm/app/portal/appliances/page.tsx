'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Package } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { ApplianceCard, type Appliance } from './appliances.ui'

export default function AppliancesPage() {
  const { accessToken, isReady, fetchWithAuth } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [appliances, setAppliances] = useState<Appliance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAppliances = useCallback(
    async (projectId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithAuth<{ appliances: Appliance[] }>(
          `/api/customer/appliances?projectId=${projectId}`,
        )

        if (response.success && response.data) {
          setAppliances(response.data.appliances)
        } else {
          setError(response.error || 'Fehler beim Laden')
        }
      } catch {
        setError('Fehler beim Laden der Geräte')
      } finally {
        setIsLoading(false)
      }
    },
    [fetchWithAuth],
  )

  useEffect(() => {
    if (!isReady || projectLoading) {
      return
    }

    if (!accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
      return
    }

    if (!selectedProject?.id) {
      return
    }

    loadAppliances(selectedProject.id)
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadAppliances])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-4 text-slate-500">Geräte werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error === 'NOT_AUTHENTICATED') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Nicht angemeldet</h2>
          <p className="mt-2 text-slate-500">Bitte melden Sie sich erneut an.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meine Geräte</h1>
        <p className="mt-1 text-slate-500">
          Übersicht aller installierten Geräte mit Garantie-Informationen
        </p>
      </div>

      {appliances.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Noch keine Geräte</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            Die Geräte werden nach der Installation von Ihrem Küchenberater hinzugefügt.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {appliances.map((appliance) => (
            <ApplianceCard key={appliance.id} appliance={appliance} />
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 ring-1 ring-blue-200/50">
        <p className="text-sm text-blue-800">
          <strong className="text-blue-900">Tipp:</strong> Bei Problemen mit einem Gerät können Sie
          direkt den Hersteller-Kundendienst kontaktieren oder über &quot;Problem melden&quot; ein
          Ticket an uns senden.
        </p>
      </div>
    </div>
  )
}
