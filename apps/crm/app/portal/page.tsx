'use client'

import { useProjectData } from './hooks/useCustomerApi'
import { 
  FileText, 
  MessageSquare, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Package,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'

// Project status steps - matches CRM workflow
// Customer gets portal access at "Planung" stage
const statusSteps = [
  { id: 'Planung', label: 'Planung', icon: '🎨' },
  { id: 'Aufmaß', label: 'Aufmaß', icon: '📐' },
  { id: 'Bestellt', label: 'Bestellt', icon: '✍️' },
  { id: 'Lieferung', label: 'Lieferung', icon: '🚚' },
  { id: 'Montage', label: 'Montage', icon: '🔧' },
  { id: 'Abgeschlossen', label: 'Fertig', icon: '🎉' },
]

function getStatusIndex(status: string): number {
  // Normalize status to match our steps (handle different CRM formats)
  const statusMap: Record<string, string> = {
    'PLANUNG': 'Planung',
    'Planung': 'Planung',
    'AUFMASS': 'Aufmaß',
    'Aufmaß': 'Aufmaß',
    'BESTELLT': 'Bestellt',
    'Bestellt': 'Bestellt',
    'ORDERED': 'Bestellt',
    'Ordered': 'Bestellt',
    'LIEFERUNG': 'Lieferung',
    'Lieferung': 'Lieferung',
    'MONTAGE': 'Montage',
    'Montage': 'Montage',
    'ABGESCHLOSSEN': 'Abgeschlossen',
    'Abgeschlossen': 'Abgeschlossen',
    'FERTIG': 'Abgeschlossen',
    'Fertig': 'Abgeschlossen',
    // Legacy mappings
    'Angebot': 'Planung',
    'ANGEBOT': 'Planung',
    'Auftrag': 'Bestellt',
    'AUFTRAG': 'Bestellt',
  }
  
  const normalizedStatus = statusMap[status] || status
  const index = statusSteps.findIndex(s => s.id === normalizedStatus)
  return index >= 0 ? index : 0
}

// Time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

// Mobile-friendly vertical timeline
function StatusTimelineMobile({ currentStatus }: { currentStatus: string }) {
  const currentIndex = getStatusIndex(currentStatus)

  return (
    <div className="space-y-0">
      {statusSteps.map((step, index) => {
        const isComplete = index <= currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === statusSteps.length - 1

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Vertical line */}
            {!isLast && (
              <div className={`absolute left-5 top-10 h-full w-0.5 ${
                isComplete ? 'bg-gradient-to-b from-emerald-500 to-emerald-400' : 'bg-slate-200'
              }`} />
            )}
            
            {/* Step circle */}
            <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-100 border-2 border-slate-200'
            } ${isCurrent ? 'scale-110 ring-4 ring-emerald-100' : ''}`}>
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <span className="text-slate-400">{step.icon}</span>
              )}
            </div>
            
            {/* Step content */}
            <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
              <p className={`font-semibold ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="mt-1 text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Aktueller Schritt
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Desktop horizontal timeline
function StatusTimelineDesktop({ currentStatus }: { currentStatus: string }) {
  const currentIndex = getStatusIndex(currentStatus)

  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute left-0 top-5 h-1.5 w-full rounded-full bg-slate-100" />
      
      {/* Progress bar filled with animation */}
      <div 
        className="absolute left-0 top-5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-1000 ease-out"
        style={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {statusSteps.map((step, index) => {
          const isComplete = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.id} className="flex flex-col items-center group">
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                } ${isCurrent ? 'scale-125 ring-4 ring-emerald-100' : 'group-hover:scale-110'}`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-base">{step.icon}</span>
                )}
              </div>
              <span className={`mt-3 text-xs font-semibold transition-colors ${
                isComplete ? 'text-slate-900' : 'text-slate-400'
              } ${isCurrent ? 'text-emerald-600' : ''}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Glassmorphism Quick Action Card
function QuickActionCard({ 
  icon: Icon, 
  label, 
  description,
  value, 
  href,
  gradient,
  iconBg,
}: { 
  icon: React.ElementType
  label: string
  description: string
  value?: number
  href: string
  gradient: string
  iconBg: string
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm p-5 md:p-6 shadow-sm ring-1 ring-white/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:bg-white"
    >
      {/* Gradient blob */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40 group-hover:scale-150 ${gradient}`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className={`mb-3 inline-flex rounded-xl p-2.5 ${iconBg}`}>
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl md:text-3xl font-bold text-slate-900">
            {value !== undefined ? value : description}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:bg-emerald-100 group-hover:scale-110">
          <ArrowRight className="h-4 w-4 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600" />
        </div>
      </div>
    </Link>
  )
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export default function PortalDashboardPage() {
  const { data, isLoading, error } = useProjectData()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-40 animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-6 text-slate-500 font-medium">Ihre Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Fehler beim Laden</h2>
          <p className="mt-3 text-slate-500">
            {error === 'NOT_AUTHENTICATED' 
              ? 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
              : 'Die Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.'}
          </p>
          {error === 'NOT_AUTHENTICATED' && (
            <Link
              href="/portal/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
            >
              Zum Login
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  const greeting = getGreeting()

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section - Emerald themed */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 md:p-8 text-white shadow-2xl shadow-emerald-500/20">
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 md:h-64 md:w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 md:h-48 md:w-48 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="absolute right-10 bottom-10 h-20 w-20 rounded-full bg-emerald-400/30 blur-xl" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-100">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">{greeting}</p>
          </div>
          <h1 className="mt-2 text-2xl md:text-4xl font-bold tracking-tight">
            {data.customer.name}
          </h1>
          <p className="mt-3 text-emerald-100 max-w-lg text-sm md:text-base leading-relaxed">
            Willkommen in Ihrem persönlichen Kundenportal. Hier haben Sie alles im Blick.
          </p>
          
          {/* Quick stats on welcome */}
          <div className="mt-6 flex flex-wrap gap-4 md:gap-6">
            <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{data.stats.documentsCount} Dokumente</span>
            </div>
            {data.stats.openTicketsCount > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">{data.stats.openTicketsCount} offene Anfragen</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - Responsive grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <QuickActionCard
          icon={Calendar}
          label="Termine"
          description="Ansehen"
          value={data.stats.upcomingAppointmentsCount}
          href="/portal/termine"
          gradient="bg-violet-500"
          iconBg="bg-violet-100 text-violet-600"
        />
        <QuickActionCard
          icon={CreditCard}
          label="Zahlungen"
          description="Ansehen"
          href="/portal/zahlungen"
          gradient="bg-amber-500"
          iconBg="bg-amber-100 text-amber-600"
        />
        <QuickActionCard
          icon={FileText}
          label="Dokumente"
          description="Ansehen"
          value={data.stats.documentsCount}
          href="/portal/documents"
          gradient="bg-blue-500"
          iconBg="bg-blue-100 text-blue-600"
        />
        <QuickActionCard
          icon={Package}
          label="Geräte"
          description="Ansehen"
          href="/portal/appliances"
          gradient="bg-slate-500"
          iconBg="bg-slate-100 text-slate-600"
        />
        <QuickActionCard
          icon={HelpCircle}
          label="Hilfe"
          description="Anfragen"
          value={data.stats.openTicketsCount}
          href="/portal/service"
          gradient="bg-rose-500"
          iconBg="bg-rose-100 text-rose-600"
        />
      </div>

      {/* Project Status Card */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 md:p-6 shadow-sm ring-1 ring-slate-200/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ihr Projektstatus</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {data.project.orderNumber && `Auftrag ${data.project.orderNumber}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25">
              {data.project.status}
            </span>
          </div>
        </div>
        
        {/* Mobile Timeline */}
        <div className="md:hidden">
          <StatusTimelineMobile currentStatus={data.project.status} />
        </div>
        
        {/* Desktop Timeline */}
        <div className="hidden md:block">
          <StatusTimelineDesktop currentStatus={data.project.status} />
        </div>
      </div>

      {/* Two Column Layout - Better tablet support */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        {/* Next Appointment */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 md:p-6 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-50">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Nächster Termin</h2>
              <p className="text-xs text-slate-500">Ihre geplanten Termine</p>
            </div>
          </div>
          {data.nextAppointment ? (
            <div className="mt-5 rounded-xl bg-purple-50 p-4">
              <p className="text-lg font-bold text-slate-900">{data.nextAppointment.title}</p>
              <p className="mt-2 text-sm text-purple-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatDate(data.nextAppointment.startTime)}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-slate-500 text-sm">Aktuell keine Termine geplant</p>
            </div>
          )}
        </div>

        {/* Salesperson Contact */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 md:p-6 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Ihr Ansprechpartner</h2>
              <p className="text-xs text-slate-500">Direkter Kontakt</p>
            </div>
          </div>
          {data.salesperson ? (
            <div className="mt-5 space-y-3">
              <p className="text-lg font-bold text-slate-900">{data.salesperson.name}</p>
              <a 
                href={`mailto:${data.salesperson.email}`} 
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">{data.salesperson.email}</span>
              </a>
              {data.salesperson.phone && (
                <a 
                  href={`tel:${data.salesperson.phone}`} 
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-sm font-medium">{data.salesperson.phone}</span>
                </a>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center">
              <User className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="mt-2 text-slate-500 text-sm">Kein Ansprechpartner zugewiesen</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="text-white">
            <h2 className="text-xl md:text-2xl font-bold">Haben Sie Fragen?</h2>
            <p className="mt-2 text-slate-300 text-sm md:text-base max-w-md">
              Unser Team steht Ihnen jederzeit zur Verfügung. Stellen Sie einfach eine Anfrage.
            </p>
          </div>
          <Link
            href="/portal/service"
            className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            <MessageSquare className="h-5 w-5" />
            Anfrage stellen
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
