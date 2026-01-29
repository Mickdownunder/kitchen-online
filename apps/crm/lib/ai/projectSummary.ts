import type { CustomerProject, Invoice } from '@/types'

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

      const partialPaymentsList =
        partialInvoices.length > 0
          ? partialInvoices
              .map(
                inv => `${inv.invoiceNumber}: ${inv.amount}€ (${inv.isPaid ? 'bezahlt' : 'offen'})`
              )
              .join('; ')
          : 'KEINE ANZAHLUNGEN'

      const finalInvoice = finalInvoices[0]
      const finalInvoiceInfo = finalInvoice
        ? `Schlussrechnung: ${finalInvoice.invoiceNumber} - ${finalInvoice.amount}€ (${
            finalInvoice.isPaid ? 'bezahlt' : 'offen'
          })`
        : 'KEINE SCHLUSSRECHNUNG'

      return `PROJEKT ${p.orderNumber} (${p.id}):
- Kunde: ${p.customerName}
- Status: ${p.status}
- Gesamtbetrag: ${p.totalAmount?.toFixed(2) || 0}€
- Artikel (${p.items?.length || 0} Stück): ${itemsList}
- Anzahlungen: ${partialPaymentsList}
- ${finalInvoiceInfo}
- Verkäufer: ${p.salespersonName || 'nicht zugewiesen'}
- Reklamationen: ${
        p.complaints?.length > 0 ? p.complaints.map(c => c.description).join('; ') : 'keine'
      }
- Notizen: ${(p.notes || '').slice(-300)}`
    })
    .join('\n\n')
}
