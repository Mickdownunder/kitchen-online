import Link from 'next/link'
import {
  Calendar,
  ChevronRight,
  Coffee,
  ExternalLink,
  Flame,
  Mail,
  Package,
  Phone,
  Refrigerator,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Waves,
  Wind,
} from 'lucide-react'

export interface Appliance {
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

const categoryColors: Record<string, { bg: string; text: string; iconBg: string }> = {
  Kühlschrank: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  'Kühl-Gefrier-Kombi': { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  Gefrierschrank: { bg: 'bg-cyan-50', text: 'text-cyan-700', iconBg: 'bg-cyan-100' },
  Backofen: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  Kochfeld: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
  Mikrowelle: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  Dunstabzug: { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-100' },
  Geschirrspüler: { bg: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-100' },
  Kaffeevollautomat: { bg: 'bg-amber-50', text: 'text-amber-800', iconBg: 'bg-amber-100' },
}

function CategoryIcon({ category, className }: { category: string; className: string }) {
  switch (category) {
    case 'Kühlschrank':
    case 'Kühl-Gefrier-Kombi':
    case 'Gefrierschrank':
    case 'Weinkühlschrank':
      return <Refrigerator className={className} />
    case 'Backofen':
    case 'Kochfeld':
    case 'Mikrowelle':
    case 'Wärmeschublade':
      return <Flame className={className} />
    case 'Dunstabzug':
    case 'Trockner':
      return <Wind className={className} />
    case 'Geschirrspüler':
    case 'Waschmaschine':
      return <Waves className={className} />
    case 'Kaffeevollautomat':
      return <Coffee className={className} />
    default:
      return <Package className={className} />
  }
}

function getCategoryColors(category: string) {
  return categoryColors[category] || { bg: 'bg-slate-50', text: 'text-slate-700', iconBg: 'bg-slate-100' }
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return '-'
  }
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
  color: string
  bgColor: string
} {
  if (!warrantyUntil) {
    return {
      status: 'unknown',
      text: 'Keine Angabe',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
    }
  }

  const warranty = new Date(warrantyUntil)
  const now = new Date()
  const threeMonths = new Date()
  threeMonths.setMonth(threeMonths.getMonth() + 3)

  if (warranty < now) {
    return {
      status: 'expired',
      text: 'Abgelaufen',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    }
  }

  if (warranty < threeMonths) {
    return {
      status: 'expiring',
      text: `Bis ${formatDate(warrantyUntil)}`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    }
  }

  return {
    status: 'active',
    text: `Bis ${formatDate(warrantyUntil)}`,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  }
}

export function ApplianceCard({ appliance }: { appliance: Appliance }) {
  const colors = getCategoryColors(appliance.category)
  const warranty = getWarrantyStatus(appliance.warranty_until)

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${colors.iconBg} opacity-50 blur-2xl transition-opacity group-hover:opacity-70`}
      />

      <div className="relative">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors.iconBg}`}>
            <CategoryIcon category={appliance.category} className={`h-7 w-7 ${colors.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-slate-900">{appliance.manufacturer}</p>
            <p className="text-slate-500">{appliance.model}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
            >
              {appliance.category}
            </span>
          </div>
        </div>

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

          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${warranty.bgColor}`}>
            {warranty.status === 'expired' && <ShieldX className={`h-5 w-5 ${warranty.color}`} />}
            {warranty.status === 'expiring' && (
              <ShieldAlert className={`h-5 w-5 ${warranty.color}`} />
            )}
            {warranty.status === 'active' && <ShieldCheck className={`h-5 w-5 ${warranty.color}`} />}
            {warranty.status === 'unknown' && <Shield className={`h-5 w-5 ${warranty.color}`} />}
            <div>
              <span className={`text-sm font-medium ${warranty.color}`}>Garantie: {warranty.text}</span>
            </div>
          </div>
        </div>

        {(appliance.manufacturer_support_phone ||
          appliance.manufacturer_support_email ||
          appliance.manufacturer_support_url) && (
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
