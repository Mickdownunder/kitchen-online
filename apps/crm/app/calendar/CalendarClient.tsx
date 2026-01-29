'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CalendarView from '@/components/CalendarView'
import { useApp } from '../providers'
import AIAgentButton from '@/components/AIAgentButton'
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/supabase/services'
import { PlanningAppointment } from '@/types'
import { logger } from '@/lib/utils/logger'

function CalendarPageContent() {
  const { projects, setProjects, appointments, setAppointments } = useApp()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  // Filter projects if needed_installation filter is set
  const filteredProjects =
    filterParam === 'needs_installation'
      ? projects.filter(p => p.isOrdered && !p.installationDate)
      : projects

  const handleAddAppointment = async (appointment: PlanningAppointment) => {
    try {
      // If appointment has a temp ID (starts with 'appt-'), save it to database
      if (appointment.id.startsWith('appt-')) {
        logger.debug('Saving appointment to database', {
          component: 'calendar',
          appointmentId: appointment.id,
        })
        const saved = await createAppointment(appointment)
        logger.debug('Successfully saved appointment', { component: 'calendar', savedId: saved.id })
        setAppointments(prev => [...prev.filter(a => a.id !== appointment.id), saved])
      } else {
        // Already saved, just update state
        setAppointments(prev => [...prev, appointment])
      }
    } catch (error: unknown) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      logger.error(
        'Error saving appointment',
        {
          component: 'calendar',
          errorCode: errObj?.code,
          errorDetails: errObj?.details,
          errorHint: errObj?.hint,
        },
        errObj
      )

      // Show user-friendly error message
      const errorMessage = errObj?.message || 'Fehler beim Speichern des Termins'
      const errorCode = errObj?.code

      if (
        errorCode === 'PGRST116' ||
        errorMessage.includes('relation') ||
        errorMessage.includes('does not exist')
      ) {
        alert(
          'Fehler: Die Datenbank-Tabelle existiert nicht. Bitte führe die SQL-Migration aus:\n\nsupabase/migrations/create_planning_appointments.sql'
        )
      } else if (errorMessage.includes('company')) {
        alert(
          'Fehler: Keine Firma zugewiesen. Bitte stelle sicher, dass du einer Firma zugeordnet bist.'
        )
      } else {
        alert(`Fehler beim Speichern des Termins: ${errorMessage}`)
      }

      // Still add to state for UI, but mark as unsaved
      setAppointments(prev => [...prev, { ...appointment, id: `unsaved-${Date.now()}` }])
    }
  }

  const handleUpdateAppointment = async (updated: PlanningAppointment) => {
    try {
      // Only save if not a temp appointment
      if (!updated.id.startsWith('temp-') && !updated.id.startsWith('appt-')) {
        await updateAppointment(updated.id, updated)
      }
      setAppointments(prev => prev.map(a => (a.id === updated.id ? updated : a)))
    } catch (error: unknown) {
      logger.error('Error updating appointment', { component: 'calendar' }, error as Error)
      // Still update state for UI
      setAppointments(prev => prev.map(a => (a.id === updated.id ? updated : a)))
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    try {
      // Only delete from DB if not a temp appointment
      if (!id.startsWith('temp-') && !id.startsWith('appt-')) {
        await deleteAppointment(id)
      }
      setAppointments(prev => prev.filter(a => a.id !== id))
    } catch (error: unknown) {
      logger.error('Error deleting appointment', { component: 'calendar' }, error as Error)
      // Still remove from state for UI
      setAppointments(prev => prev.filter(a => a.id !== id))
    }
  }

  return (
    <>
      <CalendarView
        projects={filteredProjects}
        appointments={appointments}
        onUpdateProject={up => setProjects(prev => prev.map(p => (p.id === up.id ? up : p)))}
        onAddAppointment={handleAddAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onDeleteAppointment={handleDeleteAppointment}
      />
      <AIAgentButton />
    </>
  )
}

export default function CalendarClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  )
}
