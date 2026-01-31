'use client'

import { useProjectData } from './hooks/useCustomerApi'
import { useProject } from './context/ProjectContext'
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
// Customer gets portal access at "Planung" stage (Lead maps to Planung for portal view)
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
  // Lead status maps to Planung for portal view
  const statusMap: Record<string, string> = {
    'LEAD': 'Planung',
    'Lead': 'Planung',
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

// Glassmorphism Quick Action Card - Mobile optimized
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
      className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-white/70 backdrop-blur-sm p-3.5 md:p-5 shadow-sm ring-1 ring-white/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:bg-white"
    >
      {/* Gradient blob */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40 group-hover:scale-150 ${gradient}`} />
      
      <div className="relative">
        <div className={`mb-2 md:mb-3 inline-flex rounded-lg md:rounded-xl p-2 md:p-2.5 ${iconBg}`}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        <p className="text-xs md:text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl md:text-2xl font-bold text-slate-900">
          {value !== undefined ? value : description}
        </p>
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

// Termin-Typen ins Deutsche übersetzen
function getAppointmentLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'Planung': 'Planungstermin',
    'Consultation': 'Planungstermin',
    'FirstMeeting': 'Erstgespräch',
    'Aufmaß': 'Aufmaßtermin',
    'Measurement': 'Aufmaßtermin',
    'Lieferung': 'Liefertermin',
    'Delivery': 'Liefertermin',
    'Montage': 'Montagetermin',
    'Installation': 'Montagetermin',
  }
  return typeLabels[type] || type
}

export default function PortalDashboardPage() {
  const { selectedProject, isLoading: projectLoading } = useProject()
  const { data, isLoading: dataLoading, error } = useProjectData(selectedProject?.id)
  
  const isLoading = projectLoading || dataLoading

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
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Section - Emerald themed */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 md:p-8 text-white shadow-2xl shadow-emerald-500/20">
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
          <h1 className="mt-1 text-xl md:text-4xl font-bold tracking-tight">
            {data.customer.name}
          </h1>
          <p className="mt-2 text-emerald-100 max-w-lg text-sm md:text-base leading-relaxed">
            Willkommen in Ihrem persönlichen Kundenportal.
          </p>
        </div>
      </div>

      {/* Nächster Termin - ganz oben nach der Begrüßung */}
      {data.nextAppointment && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 p-5 md:p-6 text-white shadow-xl shadow-purple-500/20">
          {/* Decorative elements */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-indigo-400/20 blur-xl" />
          
          {/* Badge */}
          <div className="absolute right-3 top-3 md:right-4 md:top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 text-xs font-semibold text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Nächster Termin
            </span>
          </div>

          <div className="relative flex items-start gap-3 md:gap-4">
            <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
              <Calendar className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-medium text-purple-100">Ihr nächster Termin</p>
              <h3 className="mt-0.5 text-lg md:text-xl font-bold text-white truncate">
                {getAppointmentLabel(data.nextAppointment.title)}
              </h3>
              
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 text-purple-100">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm md:text-base font-semibold text-white">{formatDate(data.nextAppointment.startTime)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <Link 
            href="/portal/termine"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/30 w-full"
          >
            Alle Termine anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Quick Actions - Mobile optimized grid */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-5">
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
      <div className="rounded-xl md:rounded-2xl bg-white/80 backdrop-blur-sm p-4 md:p-6 shadow-sm ring-1 ring-slate-200/50">
        <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Ihr Projektstatus</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5 truncate">
              {data.project.orderNumber && `Auftrag ${data.project.orderNumber}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <span className="relative flex h-2 w-2 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-emerald-500"></span>
            </span>
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-semibold text-white shadow-md shadow-emerald-500/25">
              {data.project.status === 'Lead' ? 'Planung' : data.project.status}
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

      {/* Ansprechpartner - Vollbreite auf Mobile */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-4 md:p-6 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Ihr Ansprechpartner</h2>
            <p className="text-xs text-slate-500">Direkter Kontakt</p>
          </div>
        </div>
        {data.salesperson ? (
          <div className="space-y-2 md:space-y-3">
            <p className="text-base md:text-lg font-bold text-slate-900">{data.salesperson.name}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a 
                href={`mailto:${data.salesperson.email}`} 
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{data.salesperson.email}</span>
              </a>
              {data.salesperson.phone && (
                <a 
                  href={`tel:${data.salesperson.phone}`} 
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{data.salesperson.phone}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 md:p-6 text-center">
            <User className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="mt-2 text-slate-500 text-sm">Kein Ansprechpartner zugewiesen</p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
        
        <div className="relative">
          <div className="text-white">
            <h2 className="text-lg md:text-2xl font-bold">Haben Sie Fragen?</h2>
            <p className="mt-1 md:mt-2 text-slate-300 text-sm md:text-base max-w-md">
              Unser Team steht Ihnen jederzeit zur Verfügung.
            </p>
          </div>
          <Link
            href="/portal/service"
            className="mt-4 w-full md:w-auto group inline-flex items-center justify-center gap-2 md:gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 md:px-6 md:py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
            Anfrage stellen
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
