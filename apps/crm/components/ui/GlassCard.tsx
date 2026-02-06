'use client'

import React from 'react'

export type GlassCardTint =
  | 'slate'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'purple'
  | 'violet'
  | 'orange'

export type GlassCardSize = 'sm' | 'md' | 'lg'

const tintMap: Record<GlassCardTint, string> = {
  slate: 'to-slate-50/30',
  blue: 'to-blue-50/30',
  emerald: 'to-emerald-50/30',
  amber: 'to-amber-50/30',
  red: 'to-red-50/30',
  purple: 'to-purple-50/30',
  violet: 'to-violet-50/30',
  orange: 'to-orange-50/30',
}

const sizeMap: Record<GlassCardSize, { rounded: string; padding: string }> = {
  sm: { rounded: 'rounded-xl', padding: 'p-4' },
  md: { rounded: 'rounded-2xl', padding: 'p-6' },
  lg: { rounded: 'rounded-3xl', padding: 'p-8' },
}

export interface GlassCardProps {
  children: React.ReactNode
  className?: string
  tint?: GlassCardTint
  size?: GlassCardSize
  hover?: boolean
  onClick?: () => void
  as?: 'div' | 'article' | 'section'
}

export function GlassCard({
  children,
  className = '',
  tint = 'slate',
  size = 'md',
  hover = true,
  onClick,
  as: Component = 'div',
}: GlassCardProps) {
  const { rounded, padding } = sizeMap[size]
  const tintClass = tintMap[tint]

  return (
    <Component
      onClick={onClick}
      className={`glass overflow-hidden border border-white/50 bg-gradient-to-br from-white ${tintClass} ${rounded} ${padding} shadow-lg transition-all duration-300 ${
        hover ? 'hover:scale-[1.02] hover:shadow-xl' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Component>
  )
}
