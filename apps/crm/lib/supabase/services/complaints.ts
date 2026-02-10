import { supabase } from '../client'
import { Complaint } from '@/types'
import { getCurrentCompanyId } from './permissions'
import { getCurrentUser } from './auth'
import { getProject } from './projects'
import { logger } from '@/lib/utils/logger'

export async function getComplaints(
  projectId?: string,
  excludeResolved: boolean = false
): Promise<Complaint[]> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) throw new Error('No company ID')

  let query = supabase
    .from('complaints')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  // Performance: Filter resolved auf DB-Seite, nicht im Frontend
  // Wenn projectId vorhanden ist, zeige alle (auch resolved) für Projekt-Context
  if (excludeResolved) {
    query = query.neq('status', 'resolved')
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map(mapComplaintFromDB)
}

export async function getComplaint(id: string): Promise<Complaint | null> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) throw new Error('No company ID')

  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (error) {
    if ((error as Error & { code?: string }).code === 'PGRST116') return null
    throw error
  }

  return data ? mapComplaintFromDB(data) : null
}

export async function createComplaint(
  complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>
): Promise<Complaint> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Nicht authentifiziert. Bitte melde dich an.')
    }

    const companyId = await getCurrentCompanyId()
    if (!companyId) {
      // Detailliertes Logging für Debugging
      logger.error('createComplaint: getCurrentCompanyId returned null', {
        component: 'complaints',
        userId: user.id,
        projectId: complaint.projectId,
      })
      throw new Error(
        'Keine Firma gefunden. Bitte stelle sicher, dass du Mitglied einer Firma bist. Falls das Problem weiterhin besteht, kontaktiere den Administrator.'
      )
    }

    // Validate that project exists and is not deleted
    const projectResult = await getProject(complaint.projectId)
    if (!projectResult.ok) {
      throw new Error(`Projekt mit ID ${complaint.projectId} nicht gefunden oder gelöscht`)
    }

    const dbData = {
      company_id: companyId,
      project_id: complaint.projectId,
      description: complaint.description,
      status: complaint.status || 'draft',
      priority: complaint.priority || 'medium',
      affected_item_ids: complaint.affectedItemIds || [],
      supplier_id: complaint.supplierId || null,
      supplier_name: complaint.supplierName || null,
      original_order_number: complaint.originalOrderNumber || null,
      complaint_order_number: complaint.complaintOrderNumber || null,
      reported_at: complaint.reportedAt || null,
      email_sent_at: complaint.emailSentAt || null,
      email_content: complaint.emailContent || null,
      ab_confirmed_at: complaint.abConfirmedAt || null,
      ab_document_url: complaint.abDocumentUrl || null,
      delivered_at: complaint.deliveredAt || null,
      delivery_note_id: complaint.deliveryNoteId || null,
      installation_appointment_id: complaint.installationAppointmentId || null,
      installed_at: complaint.installedAt || null,
      resolved_at: complaint.resolvedAt || null,
      internal_notes: complaint.internalNotes || null,
      supplier_notes: complaint.supplierNotes || null,
      customer_notes: complaint.customerNotes || null,
      created_by_user_id: user.id,
    }

    const { data, error } = await supabase.from('complaints').insert(dbData).select().single()

    if (error) {
      const errObj = error as Error & {
        code?: string
        details?: string
        hint?: string
        stack?: string
      }
      const errorCode = errObj.code
      const errorMessage = error.message

      // Log detailed error information (mit besserer Serialisierung)
      logger.error('createComplaint error', {
        component: 'complaints',
        message: errorMessage,
        code: errorCode,
        details: errObj.details,
        hint: errObj.hint,
        // Serialisiere Error-Objekt richtig
        errorString: error.toString(),
        errorStack: errObj.stack,
        dbData: {
          company_id: companyId,
          project_id: complaint.projectId,
          description: complaint.description,
          status: complaint.status || 'draft',
        },
      })

      // Check for specific PostgreSQL error code 42P01 (relation does not exist)
      if (errorCode === '42P01') {
        throw new Error(
          'Table complaints does not exist. Please run the SQL migration: supabase/migrations/create_complaints_table.sql'
        )
      }

      // Check for foreign key constraint violations
      if (errorCode === '23503' || errorMessage.includes('foreign key')) {
        throw new Error(
          `Foreign key constraint violation: Projekt mit ID ${complaint.projectId} existiert nicht oder wurde gelöscht`
        )
      }

      // Check for RLS/permissions issues
      if (
        errorCode === '42501' ||
        errorMessage.includes('permission') ||
        errorMessage.includes('RLS')
      ) {
        throw new Error(
          'Keine Berechtigung zum Erstellen von Reklamationen. Bitte prüfe deine Berechtigungen.'
        )
      }

      throw error
    }

    return mapComplaintFromDB(data)
  } catch (error: unknown) {
    // Verbesserte Fehlerbehandlung mit besserer Serialisierung
    const errObj = error as Error & { code?: string }
    const errorInfo = {
      message: errObj?.message || 'Unbekannter Fehler',
      code: errObj?.code,
      stack: errObj?.stack,
      errorString: errObj?.toString(),
      name: errObj?.name,
    }
    logger.error('createComplaint failed', { component: 'complaints', ...errorInfo })

    // Wirf einen benutzerfreundlichen Fehler
    if (errObj?.message) {
      throw error
    } else {
      throw new Error(`Fehler beim Erstellen der Reklamation: ${JSON.stringify(errorInfo)}`)
    }
  }
}

export async function updateComplaint(
  id: string,
  updates: Partial<Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>>
): Promise<Complaint> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) {
    logger.error('updateComplaint: No company ID found', {
      component: 'complaints',
      complaintId: id,
      updates: Object.keys(updates),
    })
    throw new Error('Keine Firma gefunden. Bitte stelle sicher, dass du Mitglied einer Firma bist.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbData: Record<string, any> = {}

  if (updates.description !== undefined) dbData.description = updates.description
  if (updates.status !== undefined) dbData.status = updates.status
  if (updates.priority !== undefined) dbData.priority = updates.priority
  if (updates.affectedItemIds !== undefined) dbData.affected_item_ids = updates.affectedItemIds
  if (updates.supplierId !== undefined) dbData.supplier_id = updates.supplierId || null
  if (updates.supplierName !== undefined) dbData.supplier_name = updates.supplierName || null
  if (updates.originalOrderNumber !== undefined)
    dbData.original_order_number = updates.originalOrderNumber || null
  if (updates.complaintOrderNumber !== undefined)
    dbData.complaint_order_number = updates.complaintOrderNumber || null
  if (updates.reportedAt !== undefined) dbData.reported_at = updates.reportedAt || null
  if (updates.emailSentAt !== undefined) dbData.email_sent_at = updates.emailSentAt || null
  if (updates.emailContent !== undefined) dbData.email_content = updates.emailContent || null
  if (updates.abConfirmedAt !== undefined) dbData.ab_confirmed_at = updates.abConfirmedAt || null
  if (updates.abDocumentUrl !== undefined) dbData.ab_document_url = updates.abDocumentUrl || null
  if (updates.deliveredAt !== undefined) dbData.delivered_at = updates.deliveredAt || null
  if (updates.deliveryNoteId !== undefined) dbData.delivery_note_id = updates.deliveryNoteId || null
  if (updates.installationAppointmentId !== undefined)
    dbData.installation_appointment_id = updates.installationAppointmentId || null
  if (updates.installedAt !== undefined) dbData.installed_at = updates.installedAt || null
  if (updates.resolvedAt !== undefined) dbData.resolved_at = updates.resolvedAt || null
  if (updates.internalNotes !== undefined) dbData.internal_notes = updates.internalNotes || null
  if (updates.supplierNotes !== undefined) dbData.supplier_notes = updates.supplierNotes || null
  if (updates.customerNotes !== undefined) dbData.customer_notes = updates.customerNotes || null

  const { data, error } = await supabase
    .from('complaints')
    .update(dbData)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    logger.error('updateComplaint: Supabase error', {
      component: 'complaints',
      complaintId: id,
      companyId,
      errorCode: (error as Error & { code?: string }).code,
      errorMessage: error.message,
      updates: Object.keys(updates),
    })
    throw new Error(`Fehler beim Aktualisieren: ${error.message}`)
  }

  if (!data) {
    throw new Error('Reklamation nicht gefunden oder keine Berechtigung')
  }

  return mapComplaintFromDB(data)
}

export async function deleteComplaint(id: string): Promise<void> {
  const companyId = await getCurrentCompanyId()
  if (!companyId) throw new Error('No company ID')

  const { error } = await supabase
    .from('complaints')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComplaintFromDB(db: Record<string, any>): Complaint {
  return {
    id: db.id,
    projectId: db.project_id,
    description: db.description,
    status: db.status,
    priority: db.priority,
    affectedItemIds: db.affected_item_ids || [],
    supplierId: db.supplier_id,
    supplierName: db.supplier_name,
    originalOrderNumber: db.original_order_number,
    complaintOrderNumber: db.complaint_order_number,
    reportedAt: db.reported_at,
    emailSentAt: db.email_sent_at,
    emailContent: db.email_content,
    abConfirmedAt: db.ab_confirmed_at,
    abDocumentUrl: db.ab_document_url,
    deliveredAt: db.delivered_at,
    deliveryNoteId: db.delivery_note_id,
    installationAppointmentId: db.installation_appointment_id,
    installedAt: db.installed_at,
    resolvedAt: db.resolved_at,
    internalNotes: db.internal_notes,
    supplierNotes: db.supplier_notes,
    customerNotes: db.customer_notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at || db.created_at || new Date().toISOString(),
    createdByUserId: db.created_by_user_id,
    // Legacy-Felder für Rückwärtskompatibilität
    resolutionNotes: db.internal_notes,
  }
}
