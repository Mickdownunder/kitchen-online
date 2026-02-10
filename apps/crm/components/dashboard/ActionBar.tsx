'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Ruler, ShoppingCart, CalendarClock, ClipboardList, AlertTriangle } from 'lucide-react'
import { CustomerProject } from '@/types'
import { OpenProjectsOverview } from '@/components/OpenProjectsOverview'

interface ActionBarProps {
  projects: CustomerProject[]
}

export default function ActionBar({ projects }: ActionBarProps) {
  const [showOverview, setShowOverview] = useState(false)

  const pendingMeasurements = projects.filter(p => !p.isMeasured).length
  const pendingOrders = projects.filter(p => p.isMeasured && !p.isOrdered).length
  const pendingInstallations = projects.filter(p => p.isOrdered && !p.installationDate).length

  const items = [
    {
      label: 'Aufmaß',
      count: pendingMeasurements,
      icon: Ruler,
      href: '/projects?filter=needs_measurement',
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
    },
    {
      label: 'Bestellung',
      count: pendingOrders,
      icon: ShoppingCart,
      href: '/projects?filter=needs_order',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'Terminierung',
      count: pendingInstallations,
      icon: CalendarClock,
      href: '/calendar?filter=needs_installation',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Materialrisiko',
      count: undefined,
      icon: AlertTriangle,
      href: '/projects?filter=material_risk',
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
    },
  ]

  return (
    <>
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-slate-50/40 px-5 py-3 shadow-lg sm:gap-4 sm:px-6 sm:py-4">
        <div className="mr-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Schnellzugriff
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center gap-2 rounded-xl border border-white/50 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:px-4 sm:py-2.5"
            >
              <div className={`rounded-lg ${item.iconBg} p-1.5`}>
                <item.icon className={`h-3.5 w-3.5 ${item.iconColor} sm:h-4 sm:w-4`} />
              </div>
              {typeof item.count === 'number' && (
                <span className="text-lg font-black text-slate-800 sm:text-xl">{item.count}</span>
              )}
              <span className="text-xs font-semibold text-slate-500">{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setShowOverview(true)}
            className="group flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:px-4 sm:py-2.5"
          >
            <div className="rounded-lg bg-amber-100 p-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-amber-700 sm:h-4 sm:w-4" />
            </div>
            <span className="text-xs font-semibold text-amber-800">Bestandsübersicht</span>
          </button>
        </div>
      </div>

      {showOverview && (
        <OpenProjectsOverview projects={projects} onClose={() => setShowOverview(false)} />
      )}
    </>
  )
}
