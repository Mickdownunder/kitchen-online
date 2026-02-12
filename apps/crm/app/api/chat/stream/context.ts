import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomerProject } from '@/types'
import { buildProjectSummaryFromSupabase } from '../summaryContext'

interface BuildChatStreamContextResult {
  projectSummary: string
  appointmentsSummary: string
}

async function loadAppointmentsSummary(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const { data: planningAppointments } = await supabase
    .from('planning_appointments')
    .select('id, customer_name, date, time, type, notes')
    .eq('company_id', companyId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (!planningAppointments?.length) {
    return ''
  }

  const lines = planningAppointments.map(
    (appointment: {
      id: string
      customer_name: string
      date: string
      time: string | null
      type: string
      notes: string | null
    }) => {
      const time = appointment.time ? ` ${appointment.time}` : ''
      const notes = appointment.notes
        ? ` - ${appointment.notes.slice(0, 80)}${appointment.notes.length > 80 ? '...' : ''}`
        : ''
      return `id=${appointment.id} | ${appointment.date}${time} | ${appointment.type} | ${appointment.customer_name}${notes}`
    },
  )

  return lines.join('\n')
}

export async function buildChatStreamContext(
  supabase: SupabaseClient,
  companyId: string,
  projects: CustomerProject[],
): Promise<BuildChatStreamContextResult> {
  const [projectSummary, appointmentsSummary] = await Promise.all([
    buildProjectSummaryFromSupabase(supabase, projects),
    loadAppointmentsSummary(supabase, companyId),
  ])

  return {
    projectSummary,
    appointmentsSummary,
  }
}
