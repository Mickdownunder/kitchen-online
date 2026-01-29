'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

/**
 * Loading spinner component
 */
export function Spinner({ size = 'md', className = '', text }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && <p className="text-sm text-slate-600">{text}</p>}
    </div>
  )
}

/**
 * Full-page loading spinner
 */
export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner size="lg" text={text || 'Lade..."'} />
    </div>
  )
}

/**
 * Inline loading spinner (for buttons, etc.)
 */
export function InlineSpinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />
}
