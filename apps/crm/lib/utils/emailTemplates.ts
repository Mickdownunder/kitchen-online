import { CustomerProject, PartialPayment, Complaint } from '@/types'
// calculateOverdueDays is handled inline in templates

/**
 * E-Mail-Templates für verschiedene Anlässe
 * companyName wird nun als Parameter übergeben (aus CompanySettings.displayName oder CompanySettings.companyName)
 */

const DEFAULT_COMPANY_NAME = 'Ihr Unternehmen'

export function orderTemplate(
  project: CustomerProject,
  signUrl: string,
  companyName: string = DEFAULT_COMPANY_NAME
): { subject: string; html: string; text: string } {
  return {
    subject: `Ihr Auftrag ${project.orderNumber} – bitte unterschreiben`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0d9488; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .cta { display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
            </div>
            <div class="content">
              <h2>Auftrag ${project.orderNumber}</h2>
              <p>Sehr geehrte/r ${project.customerName},</p>
              <p>anbei erhalten Sie Ihren Auftrag <strong>${project.orderNumber}</strong> zur Bestätigung.</p>
              <p>Bitte prüfen Sie den Auftrag und <strong>unterschreiben Sie ihn online</strong>, indem Sie auf den folgenden Link klicken:</p>
              <p><a href="${signUrl}" class="cta">Jetzt online unterschreiben</a></p>
              <p>Mit Ihrer Unterschrift bestätigen Sie den Auftrag und verzichten auf Ihr 14-tägiges Widerrufsrecht (§ 18 FAGG – Maßanfertigung).</p>
              <p>Das Auftragsdokument ist dieser E-Mail als PDF angehängt.</p>
              <p>Mit freundlichen Grüßen<br>${companyName}</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Auftrag ${project.orderNumber}

Sehr geehrte/r ${project.customerName},

anbei erhalten Sie Ihren Auftrag ${project.orderNumber} zur Bestätigung.

Bitte unterschreiben Sie den Auftrag online: ${signUrl}

Mit Ihrer Unterschrift bestätigen Sie den Auftrag und verzichten auf Ihr 14-tägiges Widerrufsrecht (§ 18 FAGG – Maßanfertigung).

Das Auftragsdokument ist dieser E-Mail als PDF angehängt.

Mit freundlichen Grüßen
${companyName}
    `.trim(),
  }
}

export function deliveryNoteTemplate(
  project: CustomerProject,
  _deliveryNoteId: string,
  companyName: string = DEFAULT_COMPANY_NAME
): { subject: string; html: string; text: string } {
  return {
    subject: `Lieferschein ${project.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
            </div>
            <div class="content">
              <h2>Lieferschein ${project.orderNumber}</h2>
              <p>Sehr geehrte/r ${project.customerName},</p>
              <p>anbei erhalten Sie den Lieferschein für Ihren Auftrag <strong>${project.orderNumber}</strong>.</p>
              <p><strong>Lieferdatum:</strong> ${project.deliveryDate || 'Wird noch bekannt gegeben'}</p>
              ${
                project.items && project.items.length > 0
                  ? `
                <h3>Gelieferte Artikel:</h3>
                <ul>
                  ${project.items
                    .map(
                      item => `
                    <li>${item.description} - ${item.quantity} ${item.unit}</li>
                  `
                    )
                    .join('')}
                </ul>
              `
                  : ''
              }
              <p>Mit freundlichen Grüßen<br>${companyName}</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Lieferschein ${project.orderNumber}

Sehr geehrte/r ${project.customerName},

anbei erhalten Sie den Lieferschein für Ihren Auftrag ${project.orderNumber}.

Lieferdatum: ${project.deliveryDate || 'Wird noch bekannt gegeben'}

${project.items && project.items.length > 0 ? `Gelieferte Artikel:\n${project.items.map(item => `- ${item.description} - ${item.quantity} ${item.unit}`).join('\n')}` : ''}

Mit freundlichen Grüßen
${companyName}
    `.trim(),
  }
}

export function invoiceTemplate(
  project: CustomerProject,
  invoice: PartialPayment | { invoiceNumber: string; amount: number; date: string },
  companyName: string = DEFAULT_COMPANY_NAME
): { subject: string; html: string; text: string } {
  const invoiceNumber = invoice.invoiceNumber
  const amount = invoice.amount
  const date = invoice.date

  return {
    subject: `Rechnung ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .invoice-details { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #1e40af; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
            </div>
            <div class="content">
              <h2>Rechnung ${invoiceNumber}</h2>
              <p>Sehr geehrte/r ${project.customerName},</p>
              <p>anbei erhalten Sie die Rechnung für Ihren Auftrag <strong>${project.orderNumber}</strong>.</p>
              <div class="invoice-details">
                <p><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
                <p><strong>Rechnungsdatum:</strong> ${date}</p>
                <p><strong>Auftragsnummer:</strong> ${project.orderNumber}</p>
                <div class="amount">Betrag: ${amount.toFixed(2)} €</div>
              </div>
              <p>Bitte überweisen Sie den Betrag innerhalb der vereinbarten Zahlungsfrist.</p>
              <p>Mit freundlichen Grüßen<br>${companyName}</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Rechnung ${invoiceNumber}

Sehr geehrte/r ${project.customerName},

anbei erhalten Sie die Rechnung für Ihren Auftrag ${project.orderNumber}.

Rechnungsnummer: ${invoiceNumber}
Rechnungsdatum: ${date}
Auftragsnummer: ${project.orderNumber}

Betrag: ${amount.toFixed(2)} €

Bitte überweisen Sie den Betrag innerhalb der vereinbarten Zahlungsfrist.

Mit freundlichen Grüßen
${companyName}
    `.trim(),
  }
}

export function complaintTemplate(
  complaint: Complaint,
  project: CustomerProject,
  companyName: string = DEFAULT_COMPANY_NAME
): { subject: string; html: string; text: string } {
  return {
    subject: `Reklamation für Auftrag ${project.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .complaint-details { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reklamation</h1>
            </div>
            <div class="content">
              <h2>Reklamation für Auftrag ${project.orderNumber}</h2>
              <p>Sehr geehrte/r ${project.customerName},</p>
              <div class="complaint-details">
                <p><strong>Beschreibung:</strong></p>
                <p>${complaint.description}</p>
                ${complaint.priority ? `<p><strong>Priorität:</strong> ${complaint.priority}</p>` : ''}
                ${complaint.status ? `<p><strong>Status:</strong> ${complaint.status}</p>` : ''}
              </div>
              <p>Wir werden uns umgehend um Ihre Reklamation kümmern und Sie über den Fortschritt informieren.</p>
              <p>Mit freundlichen Grüßen<br>${companyName}</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Reklamation für Auftrag ${project.orderNumber}

Sehr geehrte/r ${project.customerName},

Beschreibung:
${complaint.description}

${complaint.priority ? `Priorität: ${complaint.priority}\n` : ''}${complaint.status ? `Status: ${complaint.status}\n` : ''}
Wir werden uns umgehend um Ihre Reklamation kümmern und Sie über den Fortschritt informieren.

Mit freundlichen Grüßen
${companyName}
    `.trim(),
  }
}

export function reminderTemplate(
  project: CustomerProject,
  invoice:
    | PartialPayment
    | { invoiceNumber: string; amount: number; date: string; dueDate?: string },
  reminderType: 'first' | 'second' | 'final',
  overdueDays: number,
  companyName: string = DEFAULT_COMPANY_NAME
): { subject: string; html: string; text: string } {
  const invoiceNumber = invoice.invoiceNumber
  const amount = invoice.amount
  const dueDate = invoice.dueDate || invoice.date
  const overdueDaysText =
    overdueDays > 0 ? `${overdueDays} Tag${overdueDays !== 1 ? 'e' : ''}` : 'heute'

  // Unterschiedliche Templates je nach Mahnungsstufe
  let title = ''
  let greeting = ''
  let urgencyText = ''
  let paymentDeadline = ''
  let legalNote = ''

  if (reminderType === 'first') {
    title = 'Erste Mahnung'
    greeting = 'Sehr geehrte/r'
    urgencyText = `
      <p>Wir möchten Sie freundlich daran erinnern, dass die Rechnung <strong>${invoiceNumber}</strong> über <strong>${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> noch nicht bei uns eingegangen ist.</p>
      <p>Die Rechnung war fällig am <strong>${new Date(dueDate).toLocaleDateString('de-DE')}</strong> und ist bereits ${overdueDaysText} überfällig.</p>
    `
    paymentDeadline = `
      <p><strong>Bitte überweisen Sie den Betrag innerhalb der nächsten 7 Tage auf unser Konto.</strong></p>
    `
  } else if (reminderType === 'second') {
    title = 'Zweite Mahnung - Dringende Zahlungsaufforderung'
    greeting = 'Sehr geehrte/r'
    urgencyText = `
      <p>Wir müssen Sie erneut auf die ausstehende Zahlung der Rechnung <strong>${invoiceNumber}</strong> über <strong>${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> hinweisen.</p>
      <p>Die Rechnung war fällig am <strong>${new Date(dueDate).toLocaleDateString('de-DE')}</strong> und ist bereits ${overdueDaysText} überfällig.</p>
      <p>Bisher haben wir trotz unserer ersten Mahnung keine Zahlung erhalten.</p>
    `
    paymentDeadline = `
      <p><strong>Wir fordern Sie hiermit dringend auf, den Betrag innerhalb der nächsten 5 Tage zu begleichen.</strong></p>
    `
    legalNote = `
      <p style="color: #dc2626; font-weight: bold;">Sollte die Zahlung nicht innerhalb dieser Frist eingehen, behalten wir uns rechtliche Schritte vor.</p>
    `
  } else {
    // final
    title = 'Letzte Mahnung - Letzte Aufforderung vor rechtlichen Schritten'
    greeting = 'Sehr geehrte/r'
    urgencyText = `
      <p>Wir müssen Sie letztmalig auf die ausstehende Zahlung der Rechnung <strong>${invoiceNumber}</strong> über <strong>${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> hinweisen.</p>
      <p>Die Rechnung war fällig am <strong>${new Date(dueDate).toLocaleDateString('de-DE')}</strong> und ist bereits ${overdueDaysText} überfällig.</p>
      <p>Trotz mehrfacher Mahnungen haben wir bisher keine Zahlung erhalten.</p>
    `
    paymentDeadline = `
      <p><strong>Dies ist unsere letzte Aufforderung. Bitte überweisen Sie den Betrag innerhalb der nächsten 3 Tage.</strong></p>
    `
    legalNote = `
      <p style="color: #dc2626; font-weight: bold; font-size: 16px;">Sollte die Zahlung nicht innerhalb dieser Frist eingehen, werden wir die Forderung an ein Inkassobüro übergeben und rechtliche Schritte einleiten. Dies führt zu zusätzlichen Kosten, die Ihnen in Rechnung gestellt werden.</p>
    `
  }

  const headerColor =
    reminderType === 'first' ? '#f59e0b' : reminderType === 'second' ? '#f97316' : '#dc2626'

  return {
    subject: `${title} - Rechnung ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${headerColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .invoice-details { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid ${headerColor}; }
            .amount { font-size: 24px; font-weight: bold; color: ${headerColor}; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${title}</h1>
            </div>
            <div class="content">
              <h2>Rechnung ${invoiceNumber}</h2>
              <p>${greeting} ${project.customerName},</p>
              ${urgencyText}
              <div class="invoice-details">
                <p><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
                <p><strong>Rechnungsdatum:</strong> ${new Date(invoice.date).toLocaleDateString('de-DE')}</p>
                <p><strong>Fälligkeitsdatum:</strong> ${new Date(dueDate).toLocaleDateString('de-DE')}</p>
                <p><strong>Auftragsnummer:</strong> ${project.orderNumber}</p>
                <p class="amount">Offener Betrag: ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
              ${paymentDeadline}
              ${legalNote}
              <p>Mit freundlichen Grüßen<br>${companyName}</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${title} - Rechnung ${invoiceNumber}

${greeting} ${project.customerName},

${
  reminderType === 'first'
    ? `Wir möchten Sie freundlich daran erinnern, dass die Rechnung ${invoiceNumber} über ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € noch nicht bei uns eingegangen ist.

Die Rechnung war fällig am ${new Date(dueDate).toLocaleDateString('de-DE')} und ist bereits ${overdueDaysText} überfällig.

Bitte überweisen Sie den Betrag innerhalb der nächsten 7 Tage auf unser Konto.`
    : reminderType === 'second'
      ? `Wir müssen Sie erneut auf die ausstehende Zahlung der Rechnung ${invoiceNumber} über ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € hinweisen.

Die Rechnung war fällig am ${new Date(dueDate).toLocaleDateString('de-DE')} und ist bereits ${overdueDaysText} überfällig.

Bisher haben wir trotz unserer ersten Mahnung keine Zahlung erhalten.

Wir fordern Sie hiermit dringend auf, den Betrag innerhalb der nächsten 5 Tage zu begleichen.

Sollte die Zahlung nicht innerhalb dieser Frist eingehen, behalten wir uns rechtliche Schritte vor.`
      : `Wir müssen Sie letztmalig auf die ausstehende Zahlung der Rechnung ${invoiceNumber} über ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € hinweisen.

Die Rechnung war fällig am ${new Date(dueDate).toLocaleDateString('de-DE')} und ist bereits ${overdueDaysText} überfällig.

Trotz mehrfacher Mahnungen haben wir bisher keine Zahlung erhalten.

Dies ist unsere letzte Aufforderung. Bitte überweisen Sie den Betrag innerhalb der nächsten 3 Tage.

Sollte die Zahlung nicht innerhalb dieser Frist eingehen, werden wir die Forderung an ein Inkassobüro übergeben und rechtliche Schritte einleiten. Dies führt zu zusätzlichen Kosten, die Ihnen in Rechnung gestellt werden.`
}

Rechnungsnummer: ${invoiceNumber}
Rechnungsdatum: ${new Date(invoice.date).toLocaleDateString('de-DE')}
Fälligkeitsdatum: ${new Date(dueDate).toLocaleDateString('de-DE')}
Auftragsnummer: ${project.orderNumber}
Offener Betrag: ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €

Mit freundlichen Grüßen
${companyName}
    `.trim(),
  }
}
