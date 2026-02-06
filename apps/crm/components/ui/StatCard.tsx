'use client'

import React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { GlassCardTint } from './GlassCard'

export type StatCardIconColor =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'purple'
  | 'violet'
  | 'slate'

const iconColorMap: Record<StatCardIconColor, { text: string; bg: string }> = {
  blue: { text: 'text-blue-600', bg: 'bg-blue-100' },
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-100' },
  red: { text: 'text-red-600', bg: 'bg-red-100' },
  purple: { text: 'text-purple-600', bg: 'bg-purple-100' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-100' },
  slate: { text: 'text-slate-600', bg: 'bg-slate-100' },
}

const tintMap: Record<string, string> = {
  blue: 'to-blue-50/30',
  emerald: 'to-emerald-50/30',
  amber: 'to-amber-50/30',
  red: 'to-red-50/30',
  purple: 'to-purple-50/30',
  violet: 'to-violet-50/30',
  slate: 'to-slate-50/30',
}

export interface StatCardProps {
  icon: LucideIcon
  iconColor: StatCardIconColor
  value: string | number
  label: string
  subtitle?: string
  /** Secondary line (e.g. "Vorperiode: X €") */
  subtitleSecondary?: string
  trend?: { value: number; isPositive: boolean }
  decorativeCircle?: boolean
  tint?: GlassCardTint
  alertDot?: boolean
  href?: string
  className?: string
}

export function StatCard({
  icon: Icon,
  iconColor,
  value,
  label,
  subtitle,
  subtitleSecondary,
  trend,
  decorativeCircle = true,
  tint,
  alertDot,
  href,
  className = '',
}: StatCardProps) {
  const colors = iconColorMap[iconColor]
  const effectiveTint = tint ?? (iconColor === 'slate' ? 'slate' : iconColor)
  const gradientClass = tintMap[effectiveTint] ?? 'to-slate-50/30'

  const content = (
    <>
      {decorativeCircle && (
        <div
          className={`absolute right-0 top-0 -mr-10 -mt-10 h-24 w-24 rounded-full ${colors.bg} opacity-20 transition-opacity duration-300 group-hover:opacity-30`}
        />
      )}
      {alertDot && (
        <div className="absolute right-3 top-3 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
      )}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className={`rounded-xl ${colors.bg} p-2.5`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
          {trend !== undefined && (
            <span
              className={`text-xs font-black ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p>
        )}
        {subtitleSecondary && (
          <p className="mt-1 text-xs text-slate-400">{subtitleSecondary}</p>
        )}
      </div>
    </>
  )

  const fullCardClasses = `glass group relative overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-white ${gradientClass} p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${className}`

  if (href) {
    return <Link href={href} className={fullCardClasses}>{content}</Link>
  }

  return <div className={fullCardClasses}>{content}</div>
}
