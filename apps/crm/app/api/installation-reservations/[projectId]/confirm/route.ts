import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import {
  INSTALLATION_RESERVATION_MIGRATION_HINT,
  isReservationSchemaMissing,
  mapInstallationReservation,
  normalizeDateInput,
  sanitizeFileName,
  type InstallationReservationRow,
} from '../../helpers'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_CONFIRM_FILE_SIZE_BYTES = 15 * 1024 * 1024

interface ProjectScopeRow {
  id: string
}

interface SupplierOrderScopeRow {
  id: string
}

function toText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toOptionalText(value: FormDataEntryValue | null): string | null {
  const trimmed = toText(value)
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const formData = await request.formData()

    const supplierOrderId = toOptionalText(formData.get('supplierOrderId'))
    const installerCompanyInput = toOptionalText(formData.get('installerCompany'))
    const installerContactInput = toOptionalText(formData.get('installerContact'))
    const installerEmailInput = toOptionalText(formData.get('installerEmail'))?.toLowerCase() || null
    const confirmationReference = toOptionalText(formData.get('confirmationReference'))
    const confirmationDate = normalizeDateInput(toOptionalText(formData.get('confirmationDate')))
    const confirmationNotes = toOptionalText(formData.get('confirmationNotes'))
    const confirmationFile = formData.get('confirmationFile')

    const hasConfirmationContent =
      Boolean(confirmationReference) ||
      Boolean(confirmationDate) ||
      Boolean(confirmationNotes) ||
      confirmationFile instanceof File

    if (!hasConfirmationContent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte mindestens eine Bestätigungsinformation (Referenz, Termin, Notiz oder Dokument) erfassen.',
        },
        { status: 400 },
      )
    }

    if (confirmationFile instanceof File) {
      if (!confirmationFile.size || confirmationFile.size > MAX_CONFIRM_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Bestätigungsdokument ist leer oder größer als 15 MB.' },
          { status: 400 },
        )
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/installation-reservations/confirm' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/installation-reservations/confirm' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/installation-reservations/confirm' })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (projectError) {
      return apiErrors.internal(new Error(projectError.message), {
        component: 'api/installation-reservations/confirm',
      })
    }

    if (!(project as ProjectScopeRow | null)?.id) {
      return apiErrors.notFound({ component: 'api/installation-reservations/confirm', projectId })
    }

    if (supplierOrderId) {
      const { data: order, error: orderError } = await supabase
        .from('supplier_orders')
        .select('id')
        .eq('id', supplierOrderId)
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (orderError) {
        return apiErrors.internal(new Error(orderError.message), {
          component: 'api/installation-reservations/confirm',
        })
      }

      if (!(order as SupplierOrderScopeRow | null)?.id) {
        return NextResponse.json(
          { success: false, error: 'Die ausgewählte Lieferanten-Bestellung ist für diesen Auftrag nicht gültig.' },
          { status: 400 },
        )
      }
    }

    const { data: existingReservationData, error: existingReservationError } = await supabase
      .from('installation_reservations')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingReservationError && !isReservationSchemaMissing(existingReservationError)) {
      return apiErrors.internal(new Error(existingReservationError.message), {
        component: 'api/installation-reservations/confirm',
      })
    }

    if (existingReservationError && isReservationSchemaMissing(existingReservationError)) {
      return NextResponse.json(
        { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
        { status: 400 },
      )
    }

    const existingReservation = existingReservationData as InstallationReservationRow | null

    const installerCompany = installerCompanyInput || existingReservation?.installer_company || ''
    const installerContact =
      installerContactInput !== null
        ? installerContactInput
        : (existingReservation?.installer_contact ?? null)
    const installerEmail = installerEmailInput || existingReservation?.installer_email || ''

    if (!installerCompany) {
      return NextResponse.json({ success: false, error: 'Montagefirma ist erforderlich.' }, { status: 400 })
    }

    if (!installerEmail || !EMAIL_PATTERN.test(installerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Bitte eine gültige E-Mail-Adresse für die Montagefirma eingeben.' },
        { status: 400 },
      )
    }

    let uploadedStoragePath: string | null = null
    let uploadedFileName: string | null = null
    let uploadedMimeType: string | null = null

    if (confirmationFile instanceof File) {
      const safeName = sanitizeFileName(confirmationFile.name || 'montage-bestaetigung')
      const storagePath = `installation-reservations/${projectId}/confirmation/${Date.now()}_${safeName}`

      const serviceClient = await createServiceClient()
      const fileBuffer = Buffer.from(await confirmationFile.arrayBuffer())
      const { error: uploadError } = await serviceClient.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: confirmationFile.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        return apiErrors.internal(new Error(uploadError.message), {
          component: 'api/installation-reservations/confirm',
        })
      }

      uploadedStoragePath = storagePath
      uploadedFileName = safeName
      uploadedMimeType = confirmationFile.type || null
    }

    const updatePayload = {
      supplier_order_id: supplierOrderId || existingReservation?.supplier_order_id || null,
      installer_company: installerCompany,
      installer_contact: installerContact,
      installer_email: installerEmail,
      confirmation_reference: confirmationReference,
      confirmation_date: confirmationDate,
      confirmation_notes: confirmationNotes,
      confirmation_document_url:
        uploadedStoragePath || existingReservation?.confirmation_document_url || null,
      confirmation_document_name:
        uploadedFileName || existingReservation?.confirmation_document_name || null,
      confirmation_document_mime_type:
        uploadedMimeType || existingReservation?.confirmation_document_mime_type || null,
      status: 'confirmed',
    } as const

    let savedReservation: InstallationReservationRow | null = null

    if (existingReservation?.id) {
      const { data, error: updateError } = await supabase
        .from('installation_reservations')
        .update(updatePayload)
        .eq('id', existingReservation.id)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (updateError) {
        if (uploadedStoragePath) {
          const serviceClient = await createServiceClient()
          await serviceClient.storage.from('documents').remove([uploadedStoragePath])
        }

        return apiErrors.internal(new Error(updateError.message), {
          component: 'api/installation-reservations/confirm',
        })
      }

      savedReservation = data as InstallationReservationRow
    } else {
      const { data, error: insertError } = await supabase
        .from('installation_reservations')
        .insert({
          user_id: user.id,
          project_id: projectId,
          supplier_order_id: supplierOrderId,
          installer_company: installerCompany,
          installer_contact: installerContact,
          installer_email: installerEmail,
          plan_document_ids: [],
          status: 'confirmed',
          confirmation_reference: confirmationReference,
          confirmation_date: confirmationDate,
          confirmation_notes: confirmationNotes,
          confirmation_document_url: uploadedStoragePath,
          confirmation_document_name: uploadedFileName,
          confirmation_document_mime_type: uploadedMimeType,
        })
        .select('*')
        .single()

      if (insertError) {
        if (uploadedStoragePath) {
          const serviceClient = await createServiceClient()
          await serviceClient.storage.from('documents').remove([uploadedStoragePath])
        }

        if (isReservationSchemaMissing(insertError)) {
          return NextResponse.json(
            { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
            { status: 400 },
          )
        }

        return apiErrors.internal(new Error(insertError.message), {
          component: 'api/installation-reservations/confirm',
        })
      }

      savedReservation = data as InstallationReservationRow
    }

    return NextResponse.json({
      success: true,
      message: 'Bestätigte Montage-Reservierung wurde gespeichert.',
      data: {
        reservation: mapInstallationReservation(savedReservation),
      },
    })
  } catch (error) {
    return apiErrors.internal(error as Error, {
      component: 'api/installation-reservations/confirm',
    })
  }
}
