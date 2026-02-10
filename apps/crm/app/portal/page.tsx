'use client'

import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Sparkles,
  User,
} from 'lucide-react'
import { useProject } from './context/ProjectContext'
import { useProjectData } from './hooks/useCustomerApi'
import {
  formatDashboardDate,
  getAppointmentLabel,
  getGreeting,
  QuickActionCard,
  StatusTimelineDesktop,
  StatusTimelineMobile,
} from './dashboard.ui'

export default function PortalDashboardPage() {
  const { selectedProject, isLoading: projectLoading } = useProject()
  const { data, isLoading: dataLoading, error } = useProjectData(selectedProject?.id)

  const isLoading = projectLoading || dataLoading

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-40" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
          <p className="mt-6 font-medium text-slate-500">Ihre Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/30"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 text-white shadow-2xl shadow-emerald-500/20 md:rounded-3xl md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl md:h-64 md:w-64" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl md:h-48 md:w-48" />
        <div className="absolute bottom-10 right-10 h-20 w-20 rounded-full bg-emerald-400/30 blur-xl" />

        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-100">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">{greeting}</p>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight md:text-4xl">{data.customer.name}</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-emerald-100 md:text-base">
            Willkommen in Ihrem persönlichen Kundenportal.
          </p>
        </div>
      </div>

      {data.nextAppointment && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 p-5 text-white shadow-xl shadow-purple-500/20 md:p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-indigo-400/20 blur-xl" />

          <div className="absolute right-3 top-3 md:right-4 md:top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm md:px-3 md:py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Nächster Termin
            </span>
          </div>

          <div className="relative flex items-start gap-3 md:gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm md:h-14 md:w-14">
              <Calendar className="h-6 w-6 text-white md:h-7 md:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-purple-100 md:text-sm">Ihr nächster Termin</p>
              <h3 className="mt-0.5 truncate text-lg font-bold text-white md:text-xl">
                {getAppointmentLabel(data.nextAppointment.title)}
              </h3>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 text-purple-100">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-semibold text-white md:text-base">
                    {formatDashboardDate(data.nextAppointment.startTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/portal/termine"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
          >
            Alle Termine anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

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

      <div className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-sm md:rounded-2xl md:p-6">
        <div className="mb-5 flex items-start justify-between gap-3 md:mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 md:text-lg">Ihr Projektstatus</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500 md:text-sm">
              {data.project.orderNumber && `Auftrag ${data.project.orderNumber}`}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5 md:gap-2">
            <span className="relative flex h-2 w-2 md:h-3 md:w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 md:h-3 md:w-3" />
            </span>
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 md:px-4 md:py-1.5 md:text-sm">
              {data.project.status === 'Lead' ? 'Planung' : data.project.status}
            </span>
          </div>
        </div>

        <div className="md:hidden">
          <StatusTimelineMobile currentStatus={data.project.status} />
        </div>
        <div className="hidden md:block">
          <StatusTimelineDesktop currentStatus={data.project.status} />
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/50 backdrop-blur-sm transition-all hover:shadow-md md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 md:h-11 md:w-11">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Ihr Ansprechpartner</h2>
            <p className="text-xs text-slate-500">Direkter Kontakt</p>
          </div>
        </div>
        {data.salesperson ? (
          <div className="space-y-2 md:space-y-3">
            <p className="text-base font-bold text-slate-900 md:text-lg">{data.salesperson.name}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={`mailto:${data.salesperson.email}`}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium">{data.salesperson.email}</span>
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
          <div className="rounded-xl bg-slate-50 p-4 text-center md:p-6">
            <User className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Kein Ansprechpartner zugewiesen</p>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 md:rounded-2xl md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />

        <div className="relative">
          <div className="text-white">
            <h2 className="text-lg font-bold md:text-2xl">Haben Sie Fragen?</h2>
            <p className="mt-1 max-w-md text-sm text-slate-300 md:mt-2 md:text-base">
              Unser Team steht Ihnen jederzeit zur Verfügung.
            </p>
          </div>
          <Link
            href="/portal/service"
            className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 md:w-auto md:gap-3 md:px-6 md:py-4"
          >
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
            Anfrage stellen
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 md:h-5 md:w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
