'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import type { CustomerProject, Invoice } from '@/types'
import { getOpenInvoices } from '@/lib/supabase/services/invoices'

interface ProactiveSuggestionsProps {
  projects: CustomerProject[]
  onSelectSuggestion: (suggestion: string) => void
}

export const ProactiveSuggestions: React.FC<ProactiveSuggestionsProps> = ({
  projects,
  onSelectSuggestion,
}) => {
  // Load open invoices from database
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([])

  const loadOpenInvoices = useCallback(async () => {
    const result = await getOpenInvoices()
    if (result.ok) {
      setOpenInvoices(result.data)
    }
  }, [])

  useEffect(() => {
    loadOpenInvoices()
  }, [loadOpenInvoices])

  const suggestions = useMemo(() => {
    const result: string[] = []

    // Check for overdue invoices from the invoices table
    const today = new Date()
    const overdueInvoices = openInvoices.filter(inv => {
      if (!inv.dueDate) return false
      return new Date(inv.dueDate) < today
    })
    if (overdueInvoices.length > 0) {
      result.push(
        `${overdueInvoices.length} Rechnung(en) sind überfällig. Soll ich Mahnungen erstellen?`
      )
    }

    // Check for projects without status update
    const staleProjects = projects.filter(p => {
      if (!p.updatedAt) return false
      const daysSinceUpdate = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceUpdate > 14
    })
    if (staleProjects.length > 0) {
      result.push(
        `${staleProjects.length} Projekt(e) haben seit über 2 Wochen keinen Update. Soll ich nachfragen?`
      )
    }

    // Check for upcoming installations without measurement
    const upcomingInstallations = projects.filter(p => {
      if (!p.installationDate || p.isMeasured) return false
      const installDate = new Date(p.installationDate)
      const daysUntil = (installDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysUntil > 0 && daysUntil < 7
    })
    if (upcomingInstallations.length > 0) {
      result.push(
        `${upcomingInstallations.length} Montage-Termin(e) stehen an, aber Aufmaß fehlt noch. Alarm?`
      )
    }

    // Check for unpaid invoices approaching due date (within 3 days)
    const dueSoonInvoices = openInvoices.filter(inv => {
      if (!inv.dueDate) return false
      const dueDate = new Date(inv.dueDate)
      const daysUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysUntilDue > 0 && daysUntilDue <= 3
    })
    if (dueSoonInvoices.length > 0) {
      result.push(
        `${dueSoonInvoices.length} Rechnung(en) werden in den nächsten 3 Tagen fällig. Zahlungserinnerung senden?`
      )
    }

    return result
  }, [projects, openInvoices])

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion, idx) => (
        <div
          key={idx}
          onClick={() => onSelectSuggestion(suggestion)}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 transition-colors hover:bg-amber-500/20"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs font-medium text-amber-200">{suggestion}</p>
        </div>
      ))}
    </div>
  )
}
