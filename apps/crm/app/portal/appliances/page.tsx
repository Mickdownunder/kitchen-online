'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCustomerApi } from '../hooks/useCustomerApi'
import { useProject } from '../context/ProjectContext'
import Link from 'next/link'
import { 
  Refrigerator, 
  Flame,
  Wind,
  Waves,
  Coffee,
  Loader2,
  AlertCircle,
  Calendar,
  Shield,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Package,
  ShieldCheck,
  ShieldAlert,
  ShieldX
} from 'lucide-react'

interface Appliance {
  id: string
  manufacturer: string
  model: string
  category: string
  serial_number: string | null
  purchase_date: string | null
  installation_date: string | null
  warranty_until: string | null
  manufacturer_support_url: string | null
  manufacturer_support_phone: string | null
  manufacturer_support_email: string | null
  notes: string | null
}

// Category icons
const categoryIcons: Record<string, typeof Refrigerator> = {
  'Kühlschrank': Refrigerator,
  'Kühl-Gefrier-Kombi': Refrigerator,
  'Gefrierschrank': Refrigerator,
  'Backofen': Flame,
  'Kochfeld': Flame,
  'Mikrowelle': Flame,
  'Dunstabzug': Wind,
  'Geschirrspüler': Waves,
  'Waschmaschine': Waves,
  'Trockner': Wind,
  'Kaffeevollautomat': Coffee,
  'Wärmeschublade': Flame,
  'Weinkühlschrank': Refrigerator,
}

// Category colors
const categoryColors: Record<string, { bg: string; text: string; iconBg: string }> = {
  'Kühlschrank': { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  'Kühl-Gefrier-Kombi': { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  'Gefrierschrank': { bg: 'bg-cyan-50', text: 'text-cyan-700', iconBg: 'bg-cyan-100' },
  'Backofen': { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  'Kochfeld': { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
  'Mikrowelle': { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  'Dunstabzug': { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-100' },
  'Geschirrspüler': { bg: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-100' },
  'Kaffeevollautomat': { bg: 'bg-amber-50', text: 'text-amber-800', iconBg: 'bg-amber-100' },
}

function getCategoryIcon(category: string) {
  return categoryIcons[category] || Package
}

function getCategoryColors(category: string) {
  return categoryColors[category] || { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-100' }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

function getWarrantyStatus(warrantyUntil: string | null): { 
  status: 'active' | 'expiring' | 'expired' | 'unknown'
  text: string
  icon: typeof Shield
  color: string
  bgColor: string
} {
  if (!warrantyUntil) return { 
    status: 'unknown', 
    text: 'Keine Angabe', 
    icon: Shield,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100'
  }
  
  const warranty = new Date(warrantyUntil)
  const now = new Date()
  const threeMonths = new Date()
  threeMonths.setMonth(threeMonths.getMonth() + 3)
  
  if (warranty < now) {
    return { 
      status: 'expired', 
      text: 'Abgelaufen', 
      icon: ShieldX,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  } else if (warranty < threeMonths) {
    return { 
      status: 'expiring', 
      text: `Bis ${formatDate(warrantyUntil)}`, 
      icon: ShieldAlert,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    }
  } else {
    return { 
      status: 'active', 
      text: `Bis ${formatDate(warrantyUntil)}`, 
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  }
}

function ApplianceCard({ appliance }: { appliance: Appliance }) {
  const Icon = getCategoryIcon(appliance.category)
  const colors = getCategoryColors(appliance.category)
  const warranty = getWarrantyStatus(appliance.warranty_until)
  const WarrantyIcon = warranty.icon
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
      {/* Background decoration */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${colors.iconBg} opacity-50 blur-2xl transition-opacity group-hover:opacity-70`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors.iconBg}`}>
            <Icon className={`h-7 w-7 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-900">{appliance.manufacturer}</p>
            <p className="text-slate-500">{appliance.model}</p>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
              {appliance.category}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="mt-5 space-y-3">
          {appliance.serial_number && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
              <span className="text-sm text-slate-500">E-Nr:</span>
              <span className="font-mono font-semibold text-slate-800">{appliance.serial_number}</span>
            </div>
          )}
          
          {appliance.installation_date && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Installiert am {formatDate(appliance.installation_date)}</span>
            </div>
          )}

          {/* Warranty Status */}
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${warranty.bgColor}`}>
            <WarrantyIcon className={`h-5 w-5 ${warranty.color}`} />
            <div>
              <span className={`text-sm font-medium ${warranty.color}`}>Garantie: {warranty.text}</span>
            </div>
          </div>
        </div>

        {/* Support Links */}
        {(appliance.manufacturer_support_phone || appliance.manufacturer_support_email || appliance.manufacturer_support_url) && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hersteller-Support
            </p>
            <div className="flex flex-wrap gap-2">
              {appliance.manufacturer_support_phone && (
                <a
                  href={`tel:${appliance.manufacturer_support_phone}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200"
                >
                  <Phone className="h-4 w-4" />
                  Anrufen
                </a>
              )}
              {appliance.manufacturer_support_email && (
                <a
                  href={`mailto:${appliance.manufacturer_support_email}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200"
                >
                  <Mail className="h-4 w-4" />
                  E-Mail
                </a>
              )}
              {appliance.manufacturer_support_url && (
                <a
                  href={appliance.manufacturer_support_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* Report Issue Link */}
        <div className="mt-5">
          <Link
            href={`/portal/service?appliance=${appliance.id}&subject=Problem mit ${appliance.manufacturer} ${appliance.model}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-200/50 transition-all hover:from-amber-100 hover:to-orange-100"
          >
            Problem melden
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AppliancesPage() {
  const { accessToken, isReady, fetchWithAuth } = useCustomerApi()
  const { selectedProject, isLoading: projectLoading } = useProject()
  const [appliances, setAppliances] = useState<Appliance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAppliances = useCallback(async (projectId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetchWithAuth<{ appliances: Appliance[] }>(
        `/api/customer/appliances?projectId=${projectId}`
      )
      
      if (response.success && response.data) {
        setAppliances(response.data.appliances)
      } else {
        setError(response.error || 'Fehler beim Laden')
      }
    } catch (err) {
      console.error('Error loading appliances:', err)
      setError('Fehler beim Laden der Geräte')
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    if (!isReady || projectLoading) return
    if (!accessToken) {
      setIsLoading(false)
      setError('NOT_AUTHENTICATED')
      return
    }
    if (!selectedProject?.id) return

    loadAppliances(selectedProject.id)
  }, [isReady, accessToken, selectedProject?.id, projectLoading, loadAppliances])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meine Geräte</h1>
        <p className="mt-1 text-slate-500">
          Übersicht aller installierten Geräte mit Garantie-Informationen
        </p>
      </div>

      {/* Appliances Grid */}
      {appliances.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Noch keine Geräte</h2>
          <p className="mt-2 text-slate-500 max-w-md mx-auto">
            Die Geräte werden nach der Installation von Ihrem Küchenberater hinzugefügt.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {appliances.map(appliance => (
            <ApplianceCard key={appliance.id} appliance={appliance} />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 ring-1 ring-blue-200/50">
        <p className="text-sm text-blue-800">
          <strong className="text-blue-900">Tipp:</strong> Bei Problemen mit einem Gerät können
          Sie direkt den Hersteller-Kundendienst kontaktieren oder über
          &quot;Problem melden&quot; ein Ticket an uns senden.
        </p>
      </div>
    </div>
  )
}
