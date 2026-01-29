import { supabase } from '../client'
import { PlanningAppointment } from '@/types'
import { getCurrentUser } from './auth'
import { getCurrentCompanyId } from './permissions'
import { logger } from '@/lib/utils/logger'

/**
 * Get all appointments for the current user's company
 */
export async function getAppointments(): Promise<PlanningAppointment[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      logger.debug('getAppointments: No user authenticated, returning empty array', {
        component: 'appointments',
      })
      return []
    }

    const companyId = await getCurrentCompanyId()
    if (!companyId) {
      logger.debug('getAppointments: No company_id found for user', {
        component: 'appointments',
        userId: user.id,
      })
      return []
    }

    logger.debug('getAppointments: Fetching appointments', { component: 'appointments', companyId })

    // Debug: Check if user is in company_members
    const { data: memberCheck, error: memberError } = await supabase
      .from('company_members')
      .select('id, is_active, role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .single()

    if (memberError) {
      logger.debug('getAppointments: User not found in company_members', {
        component: 'appointments',
        userId: user.id,
        companyId: companyId,
        errorCode: (memberError as Error & { code?: string }).code,
      })
    } else {
      logger.debug('getAppointments: User company_members check passed', {
        component: 'appointments',
        memberRole: memberCheck?.role,
      })
    }

    const { data, error } = await supabase
      .from('planning_appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      const errorCode = errObj.code
      const _errorMessage = error.message || String(error)
      const errorDetails = errObj.details
      const errorHint = errObj.hint

      // ONLY check for specific PostgreSQL error code 42P01 (relation does not exist)
      if (errorCode === '42P01') {
        logger.error('getAppointments: Table planning_appointments does not exist', {
          component: 'appointments',
          hint: 'Run migration: supabase/migrations/create_planning_appointments.sql',
        })
      } else {
        logger.error(
          'getAppointments error',
          {
            component: 'appointments',
            errorCode,
            errorDetails,
            errorHint,
          },
          error as Error
        )
      }
      // Don't throw - return empty array to prevent app crash
      return []
    }

    logger.debug('getAppointments: Found appointments', {
      component: 'appointments',
      count: data?.length || 0,
    })
    return (data || []).map(mapAppointmentFromDB)
  } catch (error: unknown) {
    // Ignore aborted requests (normal during page navigation)
    const err = error as { message?: string; name?: string; code?: string; stack?: string }
    if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
      return []
    }
    logger.error('getAppointments failed', {
      component: 'appointments',
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      fullError: error,
    })
    return []
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  appointment: Omit<PlanningAppointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlanningAppointment> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const companyId = await getCurrentCompanyId()
    if (!companyId) {
      logger.error('createAppointment: No company_id found for user', {
        component: 'appointments',
        userId: user.id,
      })
      throw new Error('No company found. Please ensure you are assigned to a company.')
    }

    logger.debug('createAppointment: Creating appointment', {
      component: 'appointments',
      companyId,
      customerName: appointment.customerName,
      date: appointment.date,
      type: appointment.type,
    })

    const { data, error } = await supabase
      .from('planning_appointments')
      .insert({
        user_id: user.id,
        company_id: companyId,
        customer_id: appointment.customerId || null,
        customer_name: appointment.customerName,
        phone: appointment.phone || null,
        date: appointment.date,
        time: appointment.time || null,
        type: appointment.type,
        notes: appointment.notes || null,
        assigned_user_id: appointment.assignedUserId || null,
        project_id: null, // Can be linked later if needed
      })
      .select()
      .single()

    if (error) {
      const errObj = error as Error & { code?: string; details?: string; hint?: string }
      const errorCode = errObj.code
      const _errorMessage = error.message

      // ONLY check for specific PostgreSQL error code 42P01 (relation does not exist)
      if (errorCode === '42P01') {
        const errorMsg =
          'Table planning_appointments does not exist. Please run the SQL migration: supabase/migrations/create_planning_appointments.sql'
        logger.error('createAppointment: Table missing', {
          component: 'appointments',
          hint: errorMsg,
        })
        throw new Error(errorMsg)
      }

      logger.error(
        'createAppointment error',
        {
          component: 'appointments',
          errorCode,
          errorDetails: errObj.details,
          errorHint: errObj.hint,
        },
        error as Error
      )
      throw error
    }

    logger.debug('createAppointment: Successfully created', {
      component: 'appointments',
      appointmentId: data.id,
    })
    return mapAppointmentFromDB(data)
  } catch (error: unknown) {
    const err = error as { code?: string }
    logger.error(
      'createAppointment failed',
      { component: 'appointments', errorCode: err?.code },
      error instanceof Error ? error : undefined
    )
    throw error
  }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
  id: string,
  appointment: Partial<PlanningAppointment>
): Promise<PlanningAppointment> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}

    if (appointment.customerId !== undefined) updateData.customer_id = appointment.customerId
    if (appointment.customerName !== undefined) updateData.customer_name = appointment.customerName
    if (appointment.phone !== undefined) updateData.phone = appointment.phone
    if (appointment.date !== undefined) updateData.date = appointment.date
    if (appointment.time !== undefined) updateData.time = appointment.time
    if (appointment.type !== undefined) updateData.type = appointment.type
    if (appointment.notes !== undefined) updateData.notes = appointment.notes
    if (appointment.assignedUserId !== undefined)
      updateData.assigned_user_id = appointment.assignedUserId

    if (Object.keys(updateData).length === 0) {
      // No changes, return existing appointment
      const existing = await getAppointments()
      const found = existing.find(a => a.id === id)
      if (!found) throw new Error('Appointment not found')
      return found
    }

    logger.debug('updateAppointment: Updating', { component: 'appointments', appointmentId: id })

    const { data, error } = await supabase
      .from('planning_appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error(
        'updateAppointment error',
        {
          component: 'appointments',
          errorCode: (error as Error & { code?: string; hint?: string }).code,
          errorHint: (error as Error & { code?: string; hint?: string }).hint,
        },
        error as Error
      )
      throw error
    }

    logger.debug('updateAppointment: Successfully updated', {
      component: 'appointments',
      appointmentId: data.id,
    })
    return mapAppointmentFromDB(data)
  } catch (error: unknown) {
    logger.error(
      'updateAppointment failed',
      { component: 'appointments' },
      error instanceof Error ? error : undefined
    )
    throw error
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    logger.debug('deleteAppointment: Deleting', { component: 'appointments', appointmentId: id })

    const { error } = await supabase.from('planning_appointments').delete().eq('id', id)

    if (error) {
      logger.error(
        'deleteAppointment error',
        {
          component: 'appointments',
          errorCode: (error as Error & { code?: string; hint?: string }).code,
          errorHint: (error as Error & { code?: string; hint?: string }).hint,
        },
        error as Error
      )
      throw error
    }

    logger.debug('deleteAppointment: Successfully deleted', {
      component: 'appointments',
      appointmentId: id,
    })
  } catch (error: unknown) {
    logger.error(
      'deleteAppointment failed',
      { component: 'appointments' },
      error instanceof Error ? error : undefined
    )
    throw error
  }
}

/**
 * Map database row to PlanningAppointment
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointmentFromDB(dbAppointment: Record<string, any>): PlanningAppointment {
  return {
    id: dbAppointment.id,
    customerId: dbAppointment.customer_id,
    customerName: dbAppointment.customer_name,
    phone: dbAppointment.phone,
    date: dbAppointment.date,
    time: dbAppointment.time,
    type: dbAppointment.type as PlanningAppointment['type'],
    notes: dbAppointment.notes,
    assignedUserId: dbAppointment.assigned_user_id,
  }
}
