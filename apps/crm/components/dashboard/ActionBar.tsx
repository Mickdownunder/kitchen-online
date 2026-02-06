'use client'

import React from 'react'
import Link from 'next/link'
import { Ruler, ShoppingCart, CalendarClock } from 'lucide-react'
import { CustomerProject } from '@/types'

interface ActionBarProps {
  projects: CustomerProject[]
}

export default function ActionBar({ projects }: ActionBarProps) {
  const pendingMeasurements = projects.filter(p => !p.isMeasured).length
  const pendingOrders = projects.filter(p => p.isMeasured && !p.isOrdered).length
  const pendingInstallations = projects.filter(p => p.isOrdered && !p.installationDate).length
  const totalActions = pendingMeasurements + pendingOrders + pendingInstallations

  if (totalActions === 0) return null

  const items = [
    {
      label: 'Aufmaß offen',
      count: pendingMeasurements,
      icon: Ruler,
      href: '/projects?filter=needs_measurement',
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
    },
    {
      label: 'Bestellung offen',
      count: pendingOrders,
      icon: ShoppingCart,
      href: '/projects?filter=needs_order',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'Terminierung offen',
      count: pendingInstallations,
      icon: CalendarClock,
      href: '/calendar?filter=needs_installation',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ].filter(item => item.count > 0)

  return (
    <div className="glass flex items-center gap-3 rounded-2xl border border-white/50 bg-gradient-to-r from-white to-red-50/20 px-5 py-3 shadow-lg sm:gap-4 sm:px-6 sm:py-4">
      <div className="mr-1 flex items-center gap-2 sm:mr-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <span className="hidden text-xs font-black uppercase tracking-widest text-slate-400 sm:inline">
          Handlungsbedarf
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {items.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center gap-2 rounded-xl border border-white/50 bg-white/80 px-3 py-2 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:px-4 sm:py-2.5"
          >
            <div className={`rounded-lg ${item.iconBg} p-1.5`}>
              <item.icon className={`h-3.5 w-3.5 ${item.iconColor} sm:h-4 sm:w-4`} />
            </div>
            <span className="text-lg font-black text-slate-800 sm:text-xl">{item.count}</span>
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
