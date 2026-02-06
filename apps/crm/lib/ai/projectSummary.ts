import type { CustomerProject, Invoice, Reminder } from '@/types'

/**
 * Build project summary for AI context
 *
 * NOTE: This now uses the invoices parameter from the new invoices table.
 * Legacy fields (project.partialPayments, project.finalInvoice) are ignored.
 */
export function buildProjectSummary(
  projects: CustomerProject[] | undefined | null,
  invoices?: Invoice[]
): string {
  if (!projects || projects.length === 0) return 'Keine Projekte'

  // Build invoice lookup by project ID
  const invoicesByProject = new Map<string, Invoice[]>()
  if (invoices) {
    invoices.forEach(inv => {
      if (!invoicesByProject.has(inv.projectId)) {
        invoicesByProject.set(inv.projectId, [])
      }
      invoicesByProject.get(inv.projectId)!.push(inv)
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return projects
    .map((p: CustomerProject) => {
      const itemsList =
        p.items && p.items.length > 0
          ? p.items
              .map((item, idx) => {
                const price =
                  item.grossPricePerUnit ||
                  (item.grossTotal && item.quantity ? item.grossTotal / item.quantity : 0)
                return `POS ${item.position || idx + 1}: ${item.description}${
                  item.modelNumber ? ` (${item.modelNumber})` : ''
                } - ${item.quantity}x ${item.unit || 'Stk'} à ${price.toFixed(2)}€ = ${
                  item.grossTotal?.toFixed(2) || '0.00'
                }€`
              })
              .join(' | ')
          : 'KEINE ARTIKEL'

      // Get invoices for this project from the invoices parameter
      const projectInvoices = invoicesByProject.get(p.id) || []
      const partialInvoices = projectInvoices.filter(inv => inv.type === 'partial')
      const finalInvoices = projectInvoices.filter(inv => inv.type === 'final')
      const creditNotes = projectInvoices.filter(inv => inv.type === 'credit')

      // Format each invoice with full details
      const formatInvoiceDetail = (inv: Invoice): string => {
        const typeLabel = inv.type === 'partial' ? 'Anzahlung' : inv.type === 'final' ? 'Schlussrechnung' : 'Stornorechnung'
        const statusLabel = inv.isPaid ? 'BEZAHLT' : 'OFFEN'
        const paidInfo = inv.isPaid && inv.paidDate ? ` am ${formatDate(inv.paidDate)}` : ''

        let overdueInfo = ''
        if (!inv.isPaid && inv.dueDate) {
          const dueDate = new Date(inv.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays > 0) {
            overdueInfo = `, ${diffDays} Tage ÜBERFÄLLIG`
          } else if (diffDays >= -3) {
            overdueInfo = `, fällig in ${Math.abs(diffDays)} Tag(en)`
          }
        }

        const reminderInfo = formatReminderStatus(inv.reminders)
        const dueDateInfo = inv.dueDate ? `, fällig ${formatDate(inv.dueDate)}` : ''

        return `${inv.invoiceNumber} (${typeLabel}): ${inv.amount.toFixed(2)}€ brutto (${inv.netAmount.toFixed(2)}€ netto + ${inv.taxAmount.toFixed(2)}€ MwSt ${inv.taxRate}%)${dueDateInfo}, ${statusLabel}${paidInfo}${overdueInfo}${reminderInfo}`
      }

      const allInvoiceDetails = [...partialInvoices, ...finalInvoices, ...creditNotes]
        .map(formatInvoiceDetail)

      const invoiceSection = allInvoiceDetails.length > 0
        ? allInvoiceDetails.join('\n  ')
        : 'KEINE RECHNUNGEN'

      // Calculate open amount
      const openAmount = projectInvoices
        .filter(inv => !inv.isPaid)
        .reduce((sum, inv) => sum + inv.amount, 0)
      const openInfo = openAmount > 0 ? `\n- Offene Forderungen: ${openAmount.toFixed(2)}€` : ''

      return `PROJEKT ${p.orderNumber} (${p.id}):
- Kunde: ${p.customerName}
- Status: ${p.status}
- Gesamtbetrag: ${p.totalAmount?.toFixed(2) || 0}€ (netto: ${p.netAmount?.toFixed(2) || 0}€, MwSt: ${p.taxAmount?.toFixed(2) || 0}€)
- Artikel (${p.items?.length || 0}): ${itemsList}
- Rechnungen: ${invoiceSection}${openInfo}
- Verkäufer: ${p.salespersonName || 'nicht zugewiesen'}
- Termine: ${formatDates(p)}
- Reklamationen: ${
        p.complaints?.length > 0 ? p.complaints.map(c => c.description?.slice(0, 100)).join('; ') : 'keine'
      }
- Notizen: ${(p.notes || '').slice(-200)}`
    })
    .join('\n\n')
}

/** Format a date string (YYYY-MM-DD) to DD.MM.YYYY */
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

/** Format project dates compactly */
function formatDates(p: CustomerProject): string {
  const parts: string[] = []
  if (p.measurementDate) parts.push(`Aufmaß ${formatDate(p.measurementDate)}`)
  if (p.orderDate) parts.push(`Bestellt ${formatDate(p.orderDate)}`)
  if (p.deliveryDate) parts.push(`Lieferung ${formatDate(p.deliveryDate)}`)
  if (p.installationDate) parts.push(`Montage ${formatDate(p.installationDate)}`)
  return parts.length > 0 ? parts.join(', ') : 'keine Termine'
}

/** Format reminder status compactly */
function formatReminderStatus(reminders?: Reminder[]): string {
  if (!reminders || reminders.length === 0) return ''
  const lastReminder = reminders[reminders.length - 1]
  const typeLabels: Record<string, string> = {
    first: '1. Mahnung',
    second: '2. Mahnung',
    final: 'Letzte Mahnung',
  }
  const label = typeLabels[lastReminder.type] || `${reminders.length}. Mahnung`
  const sentAt = lastReminder.sentAt ? ` am ${formatDate(lastReminder.sentAt)}` : ''
  return `, ${label} gesendet${sentAt}`
}
