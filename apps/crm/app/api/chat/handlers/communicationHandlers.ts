import type { ServerHandler } from '../serverHandlers'
import {
  findProject,
  appendProjectNote,
  getAllowedEmails,
  checkEmailWhitelist,
  formatWhitelistError,
} from '../serverHandlers'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'

export const handleArchiveDocument: ServerHandler = async (args, supabase) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const documentType = args.documentType as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if (args.deliveryDate) updates.delivery_date = args.deliveryDate

  const updatedItems = args.updatedItems as Array<{ description?: string; purchasePrice?: number }> | undefined
  if (updatedItems?.length) {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, description')
      .eq('project_id', project.id)

    if (items) {
      for (const ui of updatedItems) {
        if (!ui.description || !ui.purchasePrice) continue
        const match = items.find((i: { description: string }) =>
          i.description?.toLowerCase().includes(ui.description!.toLowerCase())
        )
        if (match) {
          await supabase
            .from('invoice_items')
            .update({ purchase_price_per_unit: roundTo2Decimals(ui.purchasePrice) })
            .eq('id', match.id)
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('projects').update(updates).eq('id', project.id)
  }

  await appendProjectNote(supabase, project.id, `${documentType} archiviert und Daten aktualisiert.`)
  return { result: `✅ ${documentType} archiviert.`, updatedProjectIds: [project.id] }
}

export const handleScheduleAppointment: ServerHandler = async (args, supabase, userId) => {
  const projectIdArg = args.projectId as string | undefined
  const project = projectIdArg ? await findProject(supabase, projectIdArg) : null
  const appointmentType = args.appointmentType as string
  const appointmentDate = args.date as string
  const appointmentTime = (args.time as string) || '10:00'

  if (!project || appointmentType === 'Planung' || appointmentType === 'Beratung') {
    const customerName = (args.customerName as string) || (project ? project.customer_name : 'Unbekannt')

    const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
    if (companyError || !companyId) {
      return { result: '❌ Keine Firma zugeordnet. Bitte zuerst Firma auswählen.' }
    }

    const { error } = await supabase.from('planning_appointments').insert({
      user_id: userId,
      company_id: companyId,
      customer_id: project?.customer_id ?? null,
      customer_name: customerName,
      date: appointmentDate,
      time: appointmentTime,
      type: 'Consultation',
      notes: (args.notes as string) || null,
      project_id: project?.id ?? null,
    })

    if (error) return { result: `❌ Fehler: ${error.message}` }
    return { result: `✅ Planungstermin für "${customerName}" am ${appointmentDate} um ${appointmentTime} erfasst.` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectUpdates: Record<string, any> = {}
  if (appointmentType === 'Aufmaß' || appointmentType === 'Aufmass') {
    projectUpdates.measurement_date = appointmentDate
  } else if (appointmentType === 'Montage' || appointmentType === 'Installation') {
    projectUpdates.installation_date = appointmentDate
    projectUpdates.is_installation_assigned = true
  } else if (appointmentType === 'Lieferung') {
    projectUpdates.delivery_date = appointmentDate
  }

  if (Object.keys(projectUpdates).length > 0) {
    await supabase.from('projects').update(projectUpdates).eq('id', project.id)
  }

  await appendProjectNote(supabase, project.id, `${appointmentType}-Termin am ${appointmentDate} geplant.`)

  return {
    result: `✅ ${appointmentType}-Termin für ${project.customer_name} am ${appointmentDate} um ${appointmentTime} geplant.`,
    updatedProjectIds: [project.id],
  }
}

export const handleSendEmail: ServerHandler = async (args, supabase, userId) => {
  const emailTo = args.to as string
  const emailSubject = args.subject as string
  const emailBody = args.body as string

  if (!emailTo || !emailSubject || !emailBody) {
    return { result: '❌ E-Mail-Parameter unvollständig. Benötigt: to, subject, body' }
  }

  // SECURITY: Email whitelist check
  const allowed = await getAllowedEmails(supabase, userId, args.projectId as string | undefined)
  const { ok, blocked } = checkEmailWhitelist(emailTo, allowed)
  if (!ok) return { result: formatWhitelistError(blocked) }

  const pdfType = args.pdfType as string | undefined
  const bodyPreview = emailBody.length > 150 ? `${emailBody.slice(0, 150)}...` : emailBody

  if (pdfType) {
    if (!args.projectId) return { result: '❌ projectId ist erforderlich wenn pdfType gesetzt ist.' }
    return {
      result: 'E-Mail-Versand erfordert Bestätigung durch den Nutzer.',
      pendingEmail: {
        functionName: 'sendEmail',
        to: emailTo,
        subject: emailSubject,
        bodyPreview,
        api: '/api/email/send-with-pdf',
        payload: {
          to: emailTo.split(',').map((e: string) => e.trim()),
          subject: emailSubject,
          body: emailBody,
          pdfType,
          projectId: args.projectId,
          invoiceId: args.invoiceId,
          deliveryNoteId: args.deliveryNoteId,
        },
        projectId: args.projectId as string,
      },
    }
  }

  return {
    result: 'E-Mail-Versand erfordert Bestätigung durch den Nutzer.',
    pendingEmail: {
      functionName: 'sendEmail',
      to: emailTo,
      subject: emailSubject,
      bodyPreview,
      api: '/api/email/send',
      payload: {
        to: emailTo.split(',').map((e: string) => e.trim()),
        subject: emailSubject,
        html: emailBody,
        text: emailBody,
      },
      projectId: args.projectId as string | undefined,
    },
  }
}

export const handleSendReminder: ServerHandler = async (args, supabase, userId) => {
  const project = await findProject(supabase, args.projectId as string)
  if (!project) return { result: '❌ Projekt nicht gefunden.' }

  const invoiceIdArg = args.invoiceId as string
  let invoice
  if (invoiceIdArg === 'final') {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, reminders')
      .eq('project_id', project.id)
      .eq('type', 'final')
      .maybeSingle()
    invoice = data
  } else {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, reminders')
      .eq('id', invoiceIdArg)
      .maybeSingle()
    invoice = data
  }

  if (!invoice) return { result: `❌ Rechnung nicht gefunden.` }

  const reminderType = (args.reminderType as string) || 'first'
  const effectiveEmail = (args.recipientEmail as string) || project.email

  if (!effectiveEmail) {
    return { result: '❌ Keine E-Mail-Adresse hinterlegt.' }
  }

  // SECURITY: Email whitelist check
  const allowed = await getAllowedEmails(supabase, userId, project.id)
  const { ok, blocked } = checkEmailWhitelist(effectiveEmail, allowed)
  if (!ok) return { result: formatWhitelistError(blocked) }

  const reminderTypeText = reminderType === 'first' ? '1. Mahnung' : reminderType === 'second' ? '2. Mahnung' : 'Letzte Mahnung'

  return {
    result: 'Mahnung erfordert Bestätigung durch den Nutzer.',
    pendingEmail: {
      functionName: 'sendReminder',
      to: effectiveEmail,
      subject: `${reminderTypeText} – Rechnung ${invoice.invoice_number}`,
      bodyPreview: `${reminderTypeText} für Rechnung ${invoice.invoice_number} (${invoice.amount}€)`,
      api: '/api/reminders/send',
      payload: {
        projectId: project.id,
        invoiceId: invoice.id,
        reminderType,
        recipientEmail: effectiveEmail,
      },
      projectId: project.id,
      reminderType,
    },
  }
}
