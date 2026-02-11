'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, PackageCheck } from 'lucide-react'
import type { CustomerProject } from '@/types'
import {
  getUpcomingInstallationMaterialSnapshots,
  type MaterialRiskLevel,
  type ProjectMaterialSnapshot,
} from '@/lib/utils/materialTracking'

interface MorningReadinessBoardProps {
  projects: CustomerProject[]
}

const RISK_META: Record<
  MaterialRiskLevel,
  { label: string; badgeClass: string; cardClass: string; hintClass: string }
> = {
  critical: {
    label: 'Brennt',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    cardClass: 'border-red-200 bg-red-50/40',
    hintClass: 'text-red-700',
  },
  warning: {
    label: 'Achtung',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    cardClass: 'border-amber-200 bg-amber-50/40',
    hintClass: 'text-amber-700',
  },
  ok: {
    label: 'Bereit',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cardClass: 'border-emerald-200 bg-emerald-50/40',
    hintClass: 'text-emerald-700',
  },
}

function formatInstallationDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }
  return parsed.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function formatDaysLabel(daysUntilInstallation: number): string {
  if (daysUntilInstallation === 0) {
    return 'Heute'
  }
  if (daysUntilInstallation === 1) {
    return 'Morgen'
  }
  return `In ${daysUntilInstallation} Tagen`
}

function getRiskHint(snapshot: ProjectMaterialSnapshot): string {
  if (snapshot.totalItems === 0) {
    return 'Keine Positionen im Auftrag vorhanden.'
  }
  if (snapshot.missingItems > 0) {
    return `${snapshot.missingItems} Position(en) als Fehlteile markiert.`
  }
  if (snapshot.openOrderItems > 0) {
    return `${snapshot.openOrderItems} Position(en) noch nicht vollständig bestellt.`
  }
  if (snapshot.openDeliveryItems > 0) {
    return `${snapshot.openDeliveryItems} Position(en) noch nicht vollständig im Wareneingang.`
  }
  return 'Alle Positionen sind für die Montage bereit.'
}

export default function MorningReadinessBoard({ projects }: MorningReadinessBoardProps) {
  const [showReady, setShowReady] = useState(false)
  const upcoming = useMemo(() => getUpcomingInstallationMaterialSnapshots(projects, 14), [projects])
  const visibleUpcoming = useMemo(
    () => (showReady ? upcoming : upcoming.filter((item) => item.riskLevel !== 'ok')),
    [upcoming, showReady],
  )

  const totalInstallations = upcoming.length
  const allOrdered = upcoming.filter((item) => item.openOrderItems === 0 && item.totalItems > 0).length
  const criticalCount = upcoming.filter((item) => item.riskLevel === 'critical').length
  const readyCount = upcoming.filter((item) => item.riskLevel === 'ok').length

  return (
    <section
      id="morning-readiness"
      className="glass rounded-2xl border border-white/50 bg-gradient-to-br from-white via-slate-50/40 to-amber-50/30 p-6 shadow-lg sm:rounded-3xl sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
            Morgen-Cockpit
          </div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Montage in 14 Tagen: Materialstatus
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Sie sehen sofort, was bestellt ist, was im Wareneingang fehlt und wo es brennt.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => setShowReady((prev) => !prev)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
          >
            {showReady ? 'Bereit ausblenden' : 'Bereit anzeigen'}
          </button>
          <Link
            href="/orders?queue=brennt"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            Risiko-Liste <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Montagen (14 Tage)
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totalInstallations}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
            Vollständig bestellt
          </p>
          <p className="mt-1 text-2xl font-black text-blue-700">{allOrdered}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            Montagebereit
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-700">{readyCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Brennt</p>
          <p className="mt-1 text-2xl font-black text-red-700">{criticalCount}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {visibleUpcoming.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
            <CalendarClock className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Keine kritischen Montagen in den nächsten 14 Tagen.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {showReady
                ? 'Sobald Termine gesetzt sind, erscheint hier automatisch die Material-Risikoansicht.'
                : 'Aktivieren Sie "Bereit anzeigen", um alle Termine der nächsten 14 Tage zu sehen.'}
            </p>
          </div>
        )}

        {visibleUpcoming.map((item) => {
          const riskMeta = RISK_META[item.riskLevel]
          return (
            <article
              key={item.projectId}
              className={`rounded-2xl border p-4 shadow-sm ${riskMeta.cardClass}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">{item.customerName}</p>
                  <p className="text-xs font-semibold text-slate-500">#{item.orderNumber}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Montage: {formatInstallationDate(item.installationDate)} ({formatDaysLabel(item.daysUntilInstallation)})
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${riskMeta.badgeClass}`}
                >
                  {item.riskLevel === 'critical' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : item.riskLevel === 'ok' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <PackageCheck className="h-3.5 w-3.5" />
                  )}
                  {riskMeta.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2">
                  <p className="font-black uppercase tracking-wider text-slate-500">Bestellt</p>
                  <p className="mt-0.5 font-bold text-slate-800">
                    {item.fullyOrderedItems}/{item.totalItems}
                  </p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2">
                  <p className="font-black uppercase tracking-wider text-slate-500">Wareneingang</p>
                  <p className="mt-0.5 font-bold text-slate-800">
                    {item.fullyDeliveredItems}/{item.totalItems}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs font-semibold ${riskMeta.hintClass}`}>{getRiskHint(item)}</p>
                <Link
                  href={`/projects?projectId=${item.projectId}`}
                  className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:text-slate-900"
                >
                  Auftrag öffnen <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
