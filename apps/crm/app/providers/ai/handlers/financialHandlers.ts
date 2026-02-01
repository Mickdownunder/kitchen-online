import {
  updateProject,
  createInvoice,
  updateInvoice,
  getInvoices,
  markInvoicePaid,
  markInvoiceUnpaid,
} from '@/lib/supabase/services'
import type { HandlerContext } from '../utils/handlerTypes'

export async function handleCreatePartialPayment(ctx: HandlerContext): Promise<string> {
  const { args, findProject } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  const amount = args.amount as number | undefined
  if (!amount || amount <= 0) return '❌ Betrag muss größer als 0 sein.'
  if (amount > project.totalAmount)
    return `❌ Anzahlung (${amount}€) kann nicht größer sein als Gesamtbetrag (${project.totalAmount}€).`

  try {
    // Lade existierende Rechnungen um die Anzahl zu bestimmen
    const existingInvoices = await getInvoices(project.id)
    const partialCount = existingInvoices.filter(inv => inv.type === 'partial').length

    const description = (args.description as string) || `Anzahlung ${partialCount + 1}`
    const date = (args.date as string) || new Date().toISOString().split('T')[0]

    // Neue Rechnung über den invoices-Service erstellen
    const newInvoice = await createInvoice({
      projectId: project.id,
      type: 'partial',
      amount,
      invoiceDate: date,
      description,
      invoiceNumber: args.invoiceNumber as string | undefined,
    })

    const noteDate = new Date().toLocaleDateString('de-DE')
    await updateProject(project.id, {
      notes: `${project.notes || ''}\n${noteDate}: Anzahlung "${description}" (${amount}€) erfolgreich erfasst. Rechnungsnummer: ${newInvoice.invoiceNumber}`,
    })

    return `✅ Anzahlung "${description}" über ${amount}€ erfolgreich erfasst. Rechnungsnummer: ${newInvoice.invoiceNumber}`
  } catch (error: unknown) {
    console.error('Error creating partial payment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Erstellen der Anzahlung: ${errorMessage}`
  }
}

export async function handleUpdatePartialPayment(ctx: HandlerContext): Promise<string> {
  const { args, findProject, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  const invoiceId = args.paymentId as string
  if (!invoiceId) return '❌ paymentId (Invoice-ID) fehlt.'

  try {
    // Update über den invoices-Service
    const updates: Record<string, unknown> = {}
    if (args.isPaid !== undefined) {
      if (args.isPaid as boolean) {
        await markInvoicePaid(invoiceId, (args.paidDate as string) || undefined)
      } else {
        await markInvoiceUnpaid(invoiceId)
      }
    }
    if (args.amount !== undefined) updates.amount = args.amount as number
    if (args.description) updates.description = args.description as string

    if (Object.keys(updates).length > 0) {
      await updateInvoice(invoiceId, updates)
    }

    await updateProject(project.id, {
      notes: `${project.notes || ''}\n${timestamp}: KI aktualisierte Rechnung.`,
    })

    return `✅ Rechnung aktualisiert.`
  } catch (error) {
    console.error('Error updating partial payment:', error)
    return '❌ Fehler beim Aktualisieren.'
  }
}

export async function handleCreateFinalInvoice(ctx: HandlerContext): Promise<string> {
  const { args, findProject } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  try {
    // Prüfe ob bereits eine Schlussrechnung existiert
    const existingInvoices = await getInvoices(project.id)
    const existingFinal = existingInvoices.find(inv => inv.type === 'final')

    if (existingFinal) {
      return `⚠️ Schlussrechnung existiert bereits: ${existingFinal.invoiceNumber} (${existingFinal.amount}€)`
    }

    const totalPartial = existingInvoices
      .filter(inv => inv.type === 'partial')
      .reduce((sum, inv) => sum + inv.amount, 0)
    const finalAmount = project.totalAmount - totalPartial

    if (finalAmount <= 0) {
      return `❌ Kein Restbetrag vorhanden. Gesamtbetrag: ${project.totalAmount}€, Anzahlungen: ${totalPartial}€`
    }

    // Neue Schlussrechnung über den invoices-Service erstellen
    const newInvoice = await createInvoice({
      projectId: project.id,
      type: 'final',
      amount: finalAmount,
      invoiceDate: (args.date as string) || new Date().toISOString().split('T')[0],
      description: 'Schlussrechnung',
      invoiceNumber: args.invoiceNumber as string | undefined,
    })

    const noteDate = new Date().toLocaleDateString('de-DE')
    await updateProject(project.id, {
      notes: `${project.notes || ''}\n${noteDate}: Schlussrechnung "${newInvoice.invoiceNumber}" über ${finalAmount.toFixed(2)}€ erfolgreich erstellt.`,
    })

    return `✅ Schlussrechnung "${newInvoice.invoiceNumber}" über ${finalAmount.toFixed(2)}€ erfolgreich erstellt.`
  } catch (error: unknown) {
    console.error('Error creating final invoice:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Erstellen der Schlussrechnung: ${errorMessage}`
  }
}

export async function handleSendReminder(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  // Finde die Rechnung in der neuen invoices-Tabelle (invoiceId "final" = Schlussrechnung)
  const invoiceIdArg = args.invoiceId as string
  const invoices = await getInvoices(project.id)
  const invoice =
    invoiceIdArg === 'final'
      ? invoices.find(inv => inv.type === 'final')
      : invoices.find(inv => inv.id === invoiceIdArg)

  if (!invoice) {
    return invoiceIdArg === 'final'
      ? '❌ Keine Schlussrechnung für dieses Projekt gefunden.'
      : `❌ Rechnung ${invoiceIdArg} nicht gefunden.`
  }

  const invoiceId = invoice.id

  // Bestimme reminderType automatisch, falls nicht angegeben
  let reminderType = args.reminderType as string | undefined
  if (!reminderType) {
    const { getNextReminderType } = await import('@/hooks/useInvoiceCalculations')
    reminderType = getNextReminderType(invoice.reminders) || 'first'
  }

  if (!['first', 'second', 'final'].includes(reminderType)) {
    return `❌ Ungültiger reminderType: ${reminderType}. Muss "first", "second" oder "final" sein.`
  }

  // E-Mail-Whitelist (Best Practice): Nur an im Projekt hinterlegte Kunden-E-Mail
  const recipientEmail = args.recipientEmail as string | undefined
  const projectEmail = project.email?.trim().toLowerCase()
  if (recipientEmail) {
    const allowed = projectEmail ? [projectEmail] : []
    if (allowed.length > 0 && !allowed.includes(recipientEmail.trim().toLowerCase())) {
      return `❌ E-Mail-Adresse "${recipientEmail}" ist nicht als Empfänger freigegeben. Bitte nur an im Projekt hinterlegte Kunden-E-Mail versenden.`
    }
  }
  const effectiveEmail = recipientEmail || project.email

  try {
    const response = await fetch('/api/reminders/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        invoiceId,
        reminderType,
        recipientEmail: effectiveEmail || undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Fehler beim Senden der Mahnung')
    }

    const reminderTypeText =
      reminderType === 'first'
        ? '1. Mahnung'
        : reminderType === 'second'
          ? '2. Mahnung'
          : 'Letzte Mahnung'

    // Lade Projekt neu, um Reminder zu aktualisieren
    const { getProject } = await import('@/lib/supabase/services/projects')
    const updatedProject = await getProject(project.id)
    if (updatedProject) {
      setProjects(prev => prev.map(p => (p.id === project.id ? updatedProject : p)))
    }

    return `✅ ${reminderTypeText} für Rechnung ${invoice.invoiceNumber} erfolgreich gesendet an ${effectiveEmail || project.email || 'Kunde'}.`
  } catch (error: unknown) {
    console.error('Error sending reminder:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Senden der Mahnung: ${errorMessage}`
  }
}

export async function handleConfigurePaymentSchedule(ctx: HandlerContext): Promise<string> {
  const { args, findProject, setProjects, timestamp } = ctx

  const project = findProject(args.projectId as string)
  if (!project) return '❌ Projekt nicht gefunden.'

  // Validiere Summe = 100%
  const firstPercent = args.firstPercent as number
  const secondPercent = args.secondPercent as number
  const finalPercent = args.finalPercent as number
  const sum = firstPercent + secondPercent + finalPercent
  if (Math.abs(sum - 100) > 0.01) {
    return `❌ Summe muss 100% ergeben (aktuell: ${sum}%).`
  }

  try {
    const secondDueDaysBeforeDelivery = (args.secondDueDaysBeforeDelivery as number) || 21
    const paymentSchedule = {
      firstPercent,
      secondPercent,
      finalPercent,
      secondDueDaysBeforeDelivery,
      autoCreateFirst:
        args.autoCreateFirst !== undefined ? (args.autoCreateFirst as boolean) : true,
      autoCreateSecond:
        args.autoCreateSecond !== undefined ? (args.autoCreateSecond as boolean) : true,
    }

    const updated = await updateProject(project.id, {
      paymentSchedule,
      notes: `${project.notes || ''}\n${timestamp}: Zahlungsschema konfiguriert: ${firstPercent}% - ${secondPercent}% - ${finalPercent}% (${paymentSchedule.secondDueDaysBeforeDelivery} Tage vor Liefertermin).`,
    })

    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)))
    return `✅ Zahlungsschema konfiguriert: ${firstPercent}% - ${secondPercent}% - ${finalPercent}%`
  } catch (error: unknown) {
    console.error('Error configuring payment schedule:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return `❌ Fehler beim Konfigurieren des Zahlungsschemas: ${errorMessage}`
  }
}
