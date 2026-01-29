'use client'

import React from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { CustomerProject } from '@/types'
import { isSecondPaymentDue } from '@/lib/utils/paymentSchedule'

interface PaymentReminderBannerProps {
  projects: CustomerProject[]
  onViewClick?: () => void
}

export function PaymentReminderBanner({ projects, onViewClick }: PaymentReminderBannerProps) {
  // Zähle Projekte mit fälliger zweiter Anzahlung
  const dueCount = projects.filter(project => {
    if (!project.paymentSchedule || !project.deliveryDate) return false
    if (project.secondPaymentCreated) return false
    return isSecondPaymentDue(project)
  }).length

  if (dueCount === 0) {
    return null
  }

  return (
    <div className="shadow-lg/30 mb-6 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-amber-100/80 to-amber-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              {dueCount} {dueCount === 1 ? 'zweite Anzahlung ist' : 'zweite Anzahlungen sind'}{' '}
              fällig
            </p>
            <p className="text-sm text-amber-700">
              {dueCount === 1
                ? 'Eine zweite Anzahlung sollte erstellt werden.'
                : 'Mehrere zweite Anzahlungen sollten erstellt werden.'}
            </p>
          </div>
        </div>
        {onViewClick && (
          <button
            onClick={onViewClick}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600"
          >
            Anzeigen
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
