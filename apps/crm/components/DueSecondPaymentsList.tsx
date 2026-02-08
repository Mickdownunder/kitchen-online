'use client'

import React from 'react'
import { AlertCircle, Calendar, Euro, FileText, Plus } from 'lucide-react'
import { CustomerProject } from '@/types'
import {
  isSecondPaymentDue,
  getDaysUntilSecondPaymentDue,
  calculatePaymentAmounts,
  getSecondPaymentDueDate,
} from '@/lib/utils/paymentSchedule'
import { updateProject, createInvoice } from '@/lib/supabase/services'

interface DueSecondPaymentsListProps {
  projects: CustomerProject[]
  onProjectUpdate?: () => void
}

export function DueSecondPaymentsList({ projects, onProjectUpdate }: DueSecondPaymentsListProps) {
  // Filtere Projekte mit fälliger zweiter Anzahlung
  const dueProjects = projects.filter(project => {
    if (!project.paymentSchedule || !project.deliveryDate) return false
    if (project.secondPaymentCreated) return false // Bereits erstellt
    return isSecondPaymentDue(project)
  })

  const handleCreateSecondPayment = async (project: CustomerProject) => {
    try {
      const amounts = calculatePaymentAmounts(project)
      if (!amounts) {
        alert('Fehler: Zweite Anzahlung konnte nicht berechnet werden.')
        return
      }

      const dueDate = getSecondPaymentDueDate(project)

      // Erstelle Rechnung über den neuen invoices-Service
      const createResult = await createInvoice({
        projectId: project.id,
        type: 'partial',
        amount: amounts.second,
        description: `2. Anzahlung (${project.paymentSchedule?.secondPercent || 40}%)`,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        scheduleType: 'second',
      })
      if (!createResult.ok) throw new Error(createResult.message)
      const newInvoice = createResult.data

      // Markiere als erstellt
      await updateProject(project.id, {
        secondPaymentCreated: true,
        notes: `${project.notes || ''}\n${new Date().toLocaleDateString('de-DE')}: Zweite Anzahlung "${newInvoice.invoiceNumber}" (${amounts.second.toFixed(2)}€) erstellt.`,
      })

      if (onProjectUpdate) onProjectUpdate()
      alert(`Zweite Anzahlung "${newInvoice.invoiceNumber}" erfolgreich erstellt!`)
    } catch (error) {
      console.error('Error creating second payment:', error)
      alert('Fehler beim Erstellen der zweiten Anzahlung.')
    }
  }

  if (dueProjects.length === 0) {
    return null
  }

  return (
    <div className="shadow-lg/30 mb-6 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-amber-100/90 p-6">
      <div className="mb-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-bold text-amber-900">
          Fällige zweite Anzahlungen ({dueProjects.length})
        </h3>
      </div>

      <div className="space-y-3">
        {dueProjects.map(project => {
          const amounts = calculatePaymentAmounts(project)
          const daysUntilDue = getDaysUntilSecondPaymentDue(project)
          const dueDate = getSecondPaymentDueDate(project)

          return (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-amber-200/40 bg-white/60 p-4 shadow-sm"
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-slate-900">{project.customerName}</span>
                  <span className="text-sm text-slate-500">({project.orderNumber})</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Lieferung: {new Date(project.deliveryDate!).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {dueDate && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        Fällig: {dueDate.toLocaleDateString('de-DE')}
                      </span>
                      {daysUntilDue !== null && daysUntilDue < 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {Math.abs(daysUntilDue)} Tage überfällig
                        </span>
                      )}
                    </div>
                  )}
                  {amounts && (
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      <span className="font-semibold text-amber-700">
                        {amounts.second.toFixed(2)} €
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleCreateSecondPayment(project)}
                className="ml-4 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600"
              >
                <Plus className="h-4 w-4" />
                Jetzt erstellen
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
