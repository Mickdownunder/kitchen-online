import type { ServerHandler } from '../serverHandlers'
import {
  findProject,
  appendProjectNote,
  getAllowedEmails,
  checkEmailWhitelist,
  formatWhitelistError,
} from '../serverHandlers'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { buildSupplierOrderTemplate } from '@/lib/orders/supplierOrderTemplate'

interface SupplierOrderAgentRow {
  id: string
  project_id: string
  order_number: string
  delivery_calendar_week: string | null
  installation_reference_date: string | null
  notes: string | null
  suppliers:
    | {
        name: string
        email: string | null
        order_email: string | null
      }
    | {
        name: string
        email: string | null
        order_email: string | null
      }[]
    | null
  projects:
    | {
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }
    | {
        order_number: string | null
        customer_name: string | null
        installation_date: string | null
      }[]
    | null
  supplier_order_items:
    | Array<{
        position_number: number
        description: string
        quantity: number
        unit: string
        model_number: string | null
        manufacturer: string | null
        expected_delivery_date: string | null
      }>
    | null
}

function relationToSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

async function resolveCompanyNameForSupplierOrder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string> {
  const { data: companyId } = await supabase.rpc('get_current_company_id')
  if (!companyId) return 'Ihr Unternehmen'

  const { data: company } = await supabase
    .from('company_settings')
    .select('display_name, company_name')
    .eq('id', companyId)
    .maybeSingle()

  return (company?.display_name || company?.company_name || 'Ihr Unternehmen') as string
}

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

export const handleUpdateAppointment: ServerHandler = async (args, supabase) => {
  let appointmentId = (args.appointmentId as string)?.trim() ?? ''
  if (appointmentId.startsWith('id=')) appointmentId = appointmentId.slice(3).trim()
  if (!appointmentId) return { result: '❌ appointmentId fehlt.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (args.date !== undefined && args.date !== null) updates.date = String(args.date)
  if (args.time !== undefined && args.time !== null) updates.time = String(args.time)
  if (args.customerName !== undefined && args.customerName !== null)
    updates.customer_name = String(args.customerName)
  if (args.type !== undefined && args.type !== null) updates.type = String(args.type)
  if (args.notes !== undefined && args.notes !== null) updates.notes = String(args.notes)

  if (Object.keys(updates).length === 0) {
    return { result: '❌ Mindestens ein Feld angeben (date, time, customerName, type oder notes).' }
  }

  const { data, error } = await supabase
    .from('planning_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select('date, time, customer_name, type')
    .single()

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return { result: '❌ Termin nicht gefunden oder keine Berechtigung.' }
    }
    return { result: `❌ Fehler: ${error.message}` }
  }

  const d = data as { date: string; time: string | null; customer_name: string; type: string }
  const timeStr = d.time ? ` um ${d.time}` : ''
  return {
    result: `✅ Termin aktualisiert: ${d.customer_name} am ${d.date}${timeStr} (${d.type}).`,
  }
}

export const handleDeleteAppointment: ServerHandler = async (args, supabase) => {
  let appointmentId = (args.appointmentId as string)?.trim() ?? ''
  if (appointmentId.startsWith('id=')) appointmentId = appointmentId.slice(3).trim()
  if (!appointmentId) return { result: '❌ appointmentId fehlt.' }

  const { error } = await supabase.from('planning_appointments').delete().eq('id', appointmentId)

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return { result: '❌ Termin nicht gefunden oder keine Berechtigung.' }
    }
    return { result: `❌ Fehler: ${error.message}` }
  }
  return { result: '✅ Termin gelöscht.' }
}

export const handleGetCalendarView: ServerHandler = async (args, supabase) => {
  const dateStr = (args.date as string)?.trim()
  if (!dateStr) return { result: '❌ date (YYYY-MM-DD) fehlt.' }

  const { data: companyId, error: companyError } = await supabase.rpc('get_current_company_id')
  if (companyError || !companyId) {
    return { result: '❌ Keine Firma zugeordnet.' }
  }

  const range = ((args.range as string) || 'day').toLowerCase()
  const isWeek = range === 'week'
  const startDate = dateStr
  let endDate = dateStr
  if (isWeek) {
    const d = new Date(dateStr + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 6)
    endDate = d.toISOString().slice(0, 10)
  }

  let query = supabase
    .from('planning_appointments')
    .select('id, customer_name, date, time, type, notes')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  const { data: rows, error } = await query

  if (error) return { result: `❌ Fehler: ${error.message}` }
  if (!rows?.length) {
    return { result: `Keine Termine für ${isWeek ? `${startDate} bis ${endDate}` : startDate}.` }
  }

  const lines = rows.map(
    (r: { id: string; customer_name: string; date: string; time: string | null; type: string; notes: string | null }) => {
      const time = r.time ? ` ${r.time}` : ''
      const notes = r.notes ? ` - ${r.notes.slice(0, 60)}` : ''
      return `id=${r.id} | ${r.date}${time} | ${r.type} | ${r.customer_name}${notes}`
    },
  )
  return { result: lines.join('\n') }
}

const KITCHEN_PLAN_ANALYSIS_INSTRUCTION =
  'Für die Küchenplan-Analyse (DAN, Blanco, Bosch etc.): Dokument unter **Dokumentenanalyse** hochladen und den Prompt verwenden: "Küchenplan: Extrahiere alle Artikel mit Artikelnummer, Menge, Einzelpreis und Gesamtpreis in einer Liste." Die Liste kannst du dann zur Freigabe nutzen oder in ein Projekt übernehmen.'

export const handleAnalyzeKitchenPlan: ServerHandler = async () => {
  return { result: KITCHEN_PLAN_ANALYSIS_INSTRUCTION }
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

export const handleSendSupplierOrderEmail: ServerHandler = async (args, supabase) => {
  const supplierOrderId = args.supplierOrderId as string
  const toEmailOverride = (args.toEmail as string | undefined)?.trim()
  const idempotencyKey =
    (args.idempotencyKey as string | undefined)?.trim() ||
    `ai-${supplierOrderId}-${Date.now()}`

  if (!supplierOrderId) {
    return { result: '❌ supplierOrderId fehlt.' }
  }

  const { data: orderData } = await supabase
    .from('supplier_orders')
    .select(
      `\n      id,\n      project_id,\n      order_number,\n      delivery_calendar_week,\n      installation_reference_date,\n      notes,\n      suppliers (name, email, order_email),\n      projects (order_number, customer_name, installation_date),\n      supplier_order_items (\n        position_number,\n        description,\n        quantity,\n        unit,\n        model_number,\n        manufacturer,\n        expected_delivery_date\n      )\n    `,
    )
    .eq('id', supplierOrderId)
    .maybeSingle()

  if (!orderData) {
    return { result: '❌ Lieferanten-Bestellung nicht gefunden.' }
  }

  const order = orderData as SupplierOrderAgentRow
  const supplier = relationToSingle(order.suppliers)
  const project = relationToSingle(order.projects)

  if (!supplier || !project) {
    return { result: '❌ Lieferant oder Auftrag fehlt in der Bestellung.' }
  }

  const recipientEmail = toEmailOverride || supplier.order_email || supplier.email || ''
  if (!recipientEmail) {
    return { result: '❌ Für diesen Lieferanten ist keine Bestell-E-Mail hinterlegt.' }
  }

  const companyName = await resolveCompanyNameForSupplierOrder(supabase)
  const items = (order.supplier_order_items || []).map((item, index) => ({
    positionNumber: item.position_number || index + 1,
    description: item.description,
    quantity: Math.max(0, toNumber(item.quantity)),
    unit: item.unit || 'Stk',
    modelNumber: item.model_number || undefined,
    manufacturer: item.manufacturer || undefined,
    expectedDeliveryDate: item.expected_delivery_date || undefined,
  }))

  if (items.length === 0) {
    return { result: '❌ Die Bestellung enthält keine Positionen.' }
  }

  const template = buildSupplierOrderTemplate({
    orderNumber: order.order_number,
    projectOrderNumber: project.order_number || order.project_id,
    projectCustomerName: project.customer_name || 'Unbekannt',
    supplierName: supplier.name,
    supplierEmail: recipientEmail,
    companyName,
    deliveryCalendarWeek: order.delivery_calendar_week || undefined,
    installationReferenceDate:
      order.installation_reference_date || project.installation_date || undefined,
    notes: order.notes || undefined,
    items,
  })

  const bodyPreview = template.text.length > 150 ? `${template.text.slice(0, 150)}...` : template.text

  return {
    result: `Darf ich an ${recipientEmail} senden?`,
    pendingEmail: {
      functionName: 'sendSupplierOrderEmail',
      to: recipientEmail,
      subject: template.subject,
      bodyPreview,
      api: `/api/supplier-orders/${supplierOrderId}/send`,
      payload: {
        toEmail: recipientEmail,
        idempotencyKey,
      },
      projectId: order.project_id,
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
