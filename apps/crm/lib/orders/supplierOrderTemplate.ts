export const SUPPLIER_ORDER_TEMPLATE_VERSION = 'supplier-order-v1'

export interface SupplierOrderTemplateItem {
  positionNumber: number
  description: string
  quantity: number
  unit: string
  modelNumber?: string
  manufacturer?: string
  expectedDeliveryDate?: string
}

export interface SupplierOrderTemplateInput {
  orderNumber: string
  projectOrderNumber: string
  projectCustomerName: string
  supplierName: string
  supplierEmail?: string
  companyName: string
  deliveryCalendarWeek?: string
  installationReferenceDate?: string
  notes?: string
  items: SupplierOrderTemplateItem[]
}

export interface SupplierOrderTemplateResult {
  version: string
  subject: string
  html: string
  text: string
  snapshot: Record<string, unknown>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(value?: string): string {
  if (!value) {
    return 'offen'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('de-DE')
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function buildSupplierOrderTemplate(
  input: SupplierOrderTemplateInput,
): SupplierOrderTemplateResult {
  const subject = `Bestellung ${input.orderNumber} (${input.projectOrderNumber})`

  const rowsHtml = input.items
    .map((item) => {
      const details = [item.modelNumber, item.manufacturer].filter(Boolean).join(' · ')
      const expectedDate = item.expectedDeliveryDate ? formatDate(item.expectedDeliveryDate) : '-'
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">${item.positionNumber}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
          ${escapeHtml(item.description)}${details ? `<div style="color:#64748b;font-size:12px;margin-top:2px;">${escapeHtml(details)}</div>` : ''}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;">${formatQuantity(item.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(item.unit)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(expectedDate)}</td>
      </tr>`
    })
    .join('')

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body style="font-family:Arial,sans-serif;line-height:1.45;color:#0f172a;margin:0;padding:24px;background:#f8fafc;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;color:#fff;padding:18px 24px;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Bestellung</div>
            <h1 style="margin:6px 0 0 0;font-size:22px;">${escapeHtml(input.orderNumber)}</h1>
          </div>

          <div style="padding:20px 24px;">
            <p>Guten Tag ${escapeHtml(input.supplierName)},</p>
            <p>bitte liefern Sie die folgenden Positionen zu Auftrag <strong>${escapeHtml(input.projectOrderNumber)}</strong> (${escapeHtml(input.projectCustomerName)}).</p>

            <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
              <thead>
                <tr style="text-align:left;background:#f1f5f9;">
                  <th style="padding:8px;">Pos.</th>
                  <th style="padding:8px;">Artikel</th>
                  <th style="padding:8px;text-align:right;">Menge</th>
                  <th style="padding:8px;">Einheit</th>
                  <th style="padding:8px;">Termin</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div style="margin-top:18px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
              <div><strong>Lieferwoche:</strong> ${escapeHtml(input.deliveryCalendarWeek || 'offen')}</div>
            </div>

            ${input.notes ? `<p style="margin-top:14px;"><strong>Hinweis:</strong> ${escapeHtml(input.notes)}</p>` : ''}

            <p style="margin-top:18px;">Bitte senden Sie uns die Auftragsbestätigung mit bestätigtem Liefertermin zurück.</p>
            <p style="margin-top:22px;">Mit freundlichen Grüßen<br/>${escapeHtml(input.companyName)}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const textLines = [
    `Bestellung ${input.orderNumber}`,
    '',
    `Auftrag: ${input.projectOrderNumber} (${input.projectCustomerName})`,
    `Lieferant: ${input.supplierName}`,
    input.supplierEmail ? `E-Mail: ${input.supplierEmail}` : null,
    `Lieferwoche: ${input.deliveryCalendarWeek || 'offen'}`,
    '',
    'Positionen:',
    ...input.items.map((item) => {
      const details = [item.modelNumber, item.manufacturer].filter(Boolean).join(' · ')
      const expectedDate = item.expectedDeliveryDate ? ` (Termin ${formatDate(item.expectedDeliveryDate)})` : ''
      return `${item.positionNumber}. ${item.description}${details ? ` [${details}]` : ''} - ${formatQuantity(item.quantity)} ${item.unit}${expectedDate}`
    }),
    '',
    input.notes ? `Hinweis: ${input.notes}` : null,
    'Bitte senden Sie die AB mit bestätigtem Liefertermin zurück.',
    '',
    'Mit freundlichen Grüßen',
    input.companyName,
  ].filter(Boolean)

  return {
    version: SUPPLIER_ORDER_TEMPLATE_VERSION,
    subject,
    html,
    text: textLines.join('\n'),
    snapshot: {
      orderNumber: input.orderNumber,
      projectOrderNumber: input.projectOrderNumber,
      projectCustomerName: input.projectCustomerName,
      supplierName: input.supplierName,
      supplierEmail: input.supplierEmail || null,
      companyName: input.companyName,
      deliveryCalendarWeek: input.deliveryCalendarWeek || null,
      installationReferenceDate: input.installationReferenceDate || null,
      notes: input.notes || null,
      itemCount: input.items.length,
      items: input.items,
    },
  }
}

export function supplierOrderPdfFileName(orderNumber: string, supplierName: string): string {
  const safeOrder = orderNumber.replace(/\//g, '-')
  const safeSupplier = supplierName.replace(/\s+/g, '_')
  return `Bestellung_${safeOrder}_${safeSupplier}.pdf`
}
