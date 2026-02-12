import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/supabase/services/email'
import {
  EMAIL_OUTBOX_MIGRATION_HINT,
  isEmailOutboxSchemaMissing,
  queueAndSendEmailOutbox,
} from '@/lib/supabase/services/emailOutbox'
import { apiErrors } from '@/lib/utils/errorHandling'
import {
  INSTALLATION_RESERVATION_MIGRATION_HINT,
  PLAN_DOCUMENT_TYPE_SET,
  isReservationSchemaMissing,
  mapInstallationReservation,
  normalizeDateInput,
  normalizeUniqueIds,
  type InstallationReservationRow,
} from '../../helpers'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PLAN_ATTACHMENTS = 5

interface ProjectScopeRow {
  id: string
  order_number: string | null
  customer_name: string | null
  installation_date: string | null
}

interface SupplierOrderScopeRow {
  id: string
}

interface PlanDocumentAttachmentRow {
  id: string
  project_id: string | null
  user_id: string | null
  name: string
  mime_type: string
  file_path: string
  type: string | null
}

function toText(value: unknown): string {
  return String(value || '').trim()
}

function toOptionalText(value: unknown): string | null {
  const trimmed = toText(value)
  return trimmed.length > 0 ? trimmed : null
}

function buildReservationEmail(params: {
  projectOrderNumber: string
  customerName: string
  requestedDate: string | null
  installationDate: string | null
  installerCompany: string
  notes: string | null
}): { subject: string; text: string; html: string } {
  const targetDate = params.requestedDate || params.installationDate || 'offen'

  const subject = `Montage-Reservierung Auftrag #${params.projectOrderNumber}`
  const textParts = [
    'Guten Tag,',
    '',
    `wir möchten eine Montage reservieren für Auftrag #${params.projectOrderNumber}.`,
    `Kunde: ${params.customerName}.`,
    `Gewünschter Montagetermin: ${targetDate}.`,
    '',
    'Die relevanten Pläne sind als Anhang beigefügt.',
    'Bitte um kurze Bestätigung mit Reservierungsreferenz und Termin.',
  ]

  if (params.notes) {
    textParts.push('', `Anmerkung: ${params.notes}`)
  }

  textParts.push('', `Montagepartner: ${params.installerCompany}`)
  const text = textParts.join('\n')

  const html = [
    '<p>Guten Tag,</p>',
    `<p>wir möchten eine Montage reservieren für Auftrag <strong>#${params.projectOrderNumber}</strong>.</p>`,
    `<p>Kunde: ${params.customerName}<br/>Gewünschter Montagetermin: ${targetDate}</p>`,
    '<p>Die relevanten Pläne sind als Anhang beigefügt. Bitte um kurze Bestätigung mit Reservierungsreferenz und Termin.</p>',
    params.notes ? `<p><strong>Anmerkung:</strong> ${params.notes}</p>` : '',
    `<p>Montagepartner: ${params.installerCompany}</p>`,
  ]
    .filter(Boolean)
    .join('')

  return { subject, text, html }
}

function buildReservationRequestDedupeKey(params: {
  projectId: string
  supplierOrderId: string | null
  installerEmail: string
  requestedInstallationDate: string | null
  planDocumentIds: string[]
  requestNotes: string | null
}): string {
  const normalized = JSON.stringify({
    projectId: params.projectId,
    supplierOrderId: params.supplierOrderId,
    installerEmail: params.installerEmail,
    requestedInstallationDate: params.requestedInstallationDate,
    planDocumentIds: [...params.planDocumentIds].sort(),
    requestNotes: params.requestNotes || null,
  })

  return `installation-reservation:${params.projectId}:${createHash('sha256').update(normalized).digest('hex')}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))

    const installerCompany = toText(body.installerCompany)
    const installerContact = toOptionalText(body.installerContact)
    const installerEmail = toText(body.installerEmail).toLowerCase()
    const requestedInstallationDate = normalizeDateInput(body.requestedInstallationDate)
    const requestNotes = toOptionalText(body.requestNotes)
    const supplierOrderId = toOptionalText(body.supplierOrderId)
    const selectedPlanDocumentIds = normalizeUniqueIds(body.planDocumentIds)

    if (!installerCompany) {
      return NextResponse.json({ success: false, error: 'Montagefirma ist erforderlich.' }, { status: 400 })
    }

    if (!installerEmail || !EMAIL_PATTERN.test(installerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Bitte eine gültige E-Mail-Adresse für die Montagefirma eingeben.' },
        { status: 400 },
      )
    }

    if (selectedPlanDocumentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bitte mindestens einen Plan für die Reservierungs-Mail auswählen.' },
        { status: 400 },
      )
    }

    if (selectedPlanDocumentIds.length > MAX_PLAN_ATTACHMENTS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximal ${MAX_PLAN_ATTACHMENTS} Plan-Anhänge sind pro Reservierungs-Mail erlaubt.`,
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized({ component: 'api/installation-reservations/request' })
    }

    if (user.app_metadata?.role === 'customer') {
      return apiErrors.forbidden({ component: 'api/installation-reservations/request' })
    }

    const { data: hasPermission, error: permissionError } = await supabase.rpc('has_permission', {
      p_permission_code: 'edit_projects',
    })

    if (permissionError || !hasPermission) {
      return apiErrors.forbidden({ component: 'api/installation-reservations/request' })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, order_number, customer_name, installation_date')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (projectError) {
      return apiErrors.internal(new Error(projectError.message), {
        component: 'api/installation-reservations/request',
      })
    }

    const scopedProject = project as ProjectScopeRow | null
    if (!scopedProject?.id) {
      return apiErrors.notFound({ component: 'api/installation-reservations/request', projectId })
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
          component: 'api/installation-reservations/request',
        })
      }

      if (!(order as SupplierOrderScopeRow | null)?.id) {
        return NextResponse.json(
          { success: false, error: 'Die ausgewählte Lieferanten-Bestellung ist für diesen Auftrag nicht gültig.' },
          { status: 400 },
        )
      }
    }

    const { data: planDocuments, error: planDocumentsError } = await supabase
      .from('documents')
      .select('id, project_id, user_id, name, mime_type, file_path, type')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('id', selectedPlanDocumentIds)

    if (planDocumentsError) {
      return apiErrors.internal(new Error(planDocumentsError.message), {
        component: 'api/installation-reservations/request',
      })
    }

    const documents = (planDocuments || []) as PlanDocumentAttachmentRow[]
    if (documents.length !== selectedPlanDocumentIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mindestens ein ausgewählter Plan wurde nicht gefunden oder gehört nicht zu diesem Auftrag.',
        },
        { status: 400 },
      )
    }

    const documentById = new Map(documents.map((doc) => [doc.id, doc]))
    const orderedDocuments: PlanDocumentAttachmentRow[] = []

    for (const planId of selectedPlanDocumentIds) {
      const document = documentById.get(planId)
      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Ungültige Plan-Auswahl. Bitte neu laden und erneut versuchen.' },
          { status: 400 },
        )
      }

      if (!document.file_path) {
        return NextResponse.json(
          {
            success: false,
            error: `Plan "${document.name}" hat keinen gültigen Speicherpfad und kann nicht angehängt werden.`,
          },
          { status: 400 },
        )
      }

      if (!PLAN_DOCUMENT_TYPE_SET.has(String(document.type || ''))) {
        return NextResponse.json(
          {
            success: false,
            error: `Dokument "${document.name}" ist kein Plan-Dokument (PLANE/INSTALLATIONSPLANE).`,
          },
          { status: 400 },
        )
      }

      orderedDocuments.push(document)
    }

    const serviceClient = await createServiceClient()
    const attachments: Array<{ filename: string; content: string; contentType: string }> = []

    for (const document of orderedDocuments) {
      const { data: fileBlob, error: downloadError } = await serviceClient.storage
        .from('documents')
        .download(document.file_path)

      if (downloadError || !fileBlob) {
        return apiErrors.internal(
          new Error(`Plan-Anhang "${document.name}" konnte nicht geladen werden: ${downloadError?.message || 'unknown'}`),
          {
            component: 'api/installation-reservations/request',
          },
        )
      }

      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
      attachments.push({
        filename: document.name,
        content: fileBuffer.toString('base64'),
        contentType: document.mime_type || 'application/octet-stream',
      })
    }

    const emailContent = buildReservationEmail({
      projectOrderNumber: scopedProject.order_number || scopedProject.id,
      customerName: scopedProject.customer_name || 'Unbekannt',
      requestedDate: requestedInstallationDate,
      installationDate: scopedProject.installation_date,
      installerCompany,
      notes: requestNotes,
    })

    const { data: existingReservation, error: existingReservationError } = await supabase
      .from('installation_reservations')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingReservationError && !isReservationSchemaMissing(existingReservationError)) {
      return apiErrors.internal(new Error(existingReservationError.message), {
        component: 'api/installation-reservations/request',
      })
    }

    if (existingReservationError && isReservationSchemaMissing(existingReservationError)) {
      return NextResponse.json(
        { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
        { status: 400 },
      )
    }

    let persistedReservation: InstallationReservationRow | null = null

    if ((existingReservation as InstallationReservationRow | null)?.id) {
      const { data, error: updateError } = await supabase
        .from('installation_reservations')
        .update({
          supplier_order_id: supplierOrderId,
          installer_company: installerCompany,
          installer_contact: installerContact,
          installer_email: installerEmail,
          requested_installation_date: requestedInstallationDate,
          request_notes: requestNotes,
          plan_document_ids: selectedPlanDocumentIds,
          status: 'draft',
        })
        .eq('id', (existingReservation as InstallationReservationRow).id)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (updateError) {
        if (isReservationSchemaMissing(updateError)) {
          return NextResponse.json(
            { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
            { status: 400 },
          )
        }

        return apiErrors.internal(new Error(updateError.message), {
          component: 'api/installation-reservations/request',
        })
      }

      persistedReservation = data as InstallationReservationRow
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
          requested_installation_date: requestedInstallationDate,
          request_notes: requestNotes,
          plan_document_ids: selectedPlanDocumentIds,
          status: 'draft',
        })
        .select('*')
        .single()

      if (insertError) {
        if (isReservationSchemaMissing(insertError)) {
          return NextResponse.json(
            { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
            { status: 400 },
          )
        }

        return apiErrors.internal(new Error(insertError.message), {
          component: 'api/installation-reservations/request',
        })
      }

      persistedReservation = data as InstallationReservationRow
    }

    if (!persistedReservation?.id) {
      return apiErrors.internal(new Error('Reservierung konnte nicht vorbereitet werden.'), {
        component: 'api/installation-reservations/request',
      })
    }

    const emailPayload = {
      to: installerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments,
    }

    let outboxResult: {
      outboxId: string
      alreadySent: boolean
      sentAt: string
      providerMessageId: string | null
    }

    try {
      outboxResult = await queueAndSendEmailOutbox({
        supabase,
        userId: user.id,
        kind: 'installation_reservation_request',
        dedupeKey: buildReservationRequestDedupeKey({
          projectId,
          supplierOrderId,
          installerEmail,
          requestedInstallationDate,
          planDocumentIds: selectedPlanDocumentIds,
          requestNotes,
        }),
        payload: emailPayload,
        metadata: {
          projectId,
          supplierOrderId,
        },
      })
    } catch (outboxError) {
      if (!isEmailOutboxSchemaMissing(outboxError)) {
        throw outboxError
      }

      const providerMessageId = await sendEmail(emailPayload)
      outboxResult = {
        outboxId: 'legacy-direct-send',
        alreadySent: false,
        sentAt: new Date().toISOString(),
        providerMessageId,
      }
    }

    const nowIso = outboxResult.sentAt
    const { data: finalizedReservation, error: finalizeError } = await supabase
      .from('installation_reservations')
      .update({
        request_email_subject: emailContent.subject,
        request_email_to: installerEmail,
        request_email_message: emailContent.text,
        request_email_sent_at: nowIso,
        status: 'requested',
      })
      .eq('id', persistedReservation.id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (finalizeError) {
      if (isReservationSchemaMissing(finalizeError)) {
        return NextResponse.json(
          { success: false, error: INSTALLATION_RESERVATION_MIGRATION_HINT },
          { status: 400 },
        )
      }

      return apiErrors.internal(new Error(finalizeError.message), {
        component: 'api/installation-reservations/request',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Montage-Reservierung wurde an ${installerEmail} versendet.`,
      data: {
        reservation: mapInstallationReservation(finalizedReservation as InstallationReservationRow),
      },
    })
  } catch (error) {
    const err = error as Error
    if (isEmailOutboxSchemaMissing(err)) {
      return NextResponse.json(
        {
          success: false,
          error: EMAIL_OUTBOX_MIGRATION_HINT,
        },
        { status: 400 },
      )
    }
    if (err.message.includes('RESEND_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'E-Mail-Versand ist nicht konfiguriert. Bitte RESEND_API_KEY setzen.',
        },
        { status: 503 },
      )
    }
    if (err.message.includes('E-Mail-Versand fehlgeschlagen')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reservierungs-E-Mail konnte beim Versanddienst nicht zugestellt werden. Bitte erneut versuchen.',
        },
        { status: 502 },
      )
    }
    return apiErrors.internal(error as Error, {
      component: 'api/installation-reservations/request',
    })
  }
}
