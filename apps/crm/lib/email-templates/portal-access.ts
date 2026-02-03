/**
 * E-Mail-Template: Portal-Zugang senden (für Verkauf im Geschäft / manuell angelegte Projekte)
 * Sendet Projektcode und Portal-Link an den Kunden
 */

export interface PortalAccessData {
  customerName: string
  customerEmail: string
  accessCode: string
  portalUrl: string
  companyName?: string
  orderNumber?: string
}

const BRAND_GOLD = '#D4AF37'
const BRAND_BLUE = '#003366'
const LOGO_URL =
  'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export function portalAccessTemplate(data: PortalAccessData): {
  to: string
  subject: string
  html: string
  text: string
} {
  const companyName = data.companyName || 'KüchenOnline'

  return {
    to: data.customerEmail,
    subject: `Ihr Kundenportal-Zugang – ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 3px solid ${BRAND_GOLD}; }
            .content { padding: 30px 20px; }
            .greeting { color: ${BRAND_GOLD}; font-size: 20px; font-weight: 600; margin-bottom: 15px; }
            .section { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${BRAND_GOLD}; }
            .section-title { color: ${BRAND_BLUE}; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; }
            .code-box { background: white; border: 2px dashed ${BRAND_GOLD}; border-radius: 8px; padding: 16px; text-align: center; margin: 12px 0; }
            .access-code { font-family: monospace; font-size: 22px; font-weight: 700; letter-spacing: 0.15em; color: ${BRAND_BLUE}; }
            .button { display: inline-block; background: ${BRAND_GOLD}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <img src="${LOGO_URL}" alt="${companyName}" style="max-width: 200px; height: auto;" />
              </div>
              <div class="content">
                <p class="greeting">Hallo ${data.customerName},</p>
                <p>Sie haben Zugang zu Ihrem persönlichen Kundenportal erhalten. Dort können Sie jederzeit den Status Ihres Projekts einsehen, Dokumente herunterladen und mit uns in Kontakt treten.</p>
                ${data.orderNumber ? `<p><strong>Auftragsnummer:</strong> ${data.orderNumber}</p>` : ''}
                <div class="section">
                  <h3 class="section-title">🔐 Ihr Kundenportal-Zugang</h3>
                  <div class="code-box">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Ihr Projektcode:</p>
                    <span class="access-code">${data.accessCode}</span>
                  </div>
                  <p style="margin: 12px 0 0 0; font-size: 14px;">Gehen Sie zum Portal und melden Sie sich mit diesem Code an (oder mit Ihrer E-Mail und Passwort, falls bereits eingerichtet).</p>
                  <a href="${data.portalUrl}" class="button">Zum Kundenportal</a>
                </div>
                <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br><strong>Ihr Team von ${companyName}</strong></p>
              </div>
              <div class="footer">
                <p>Diese E-Mail wurde automatisch generiert.<br>Bei Fragen antworten Sie gerne auf diese E-Mail.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hallo ${data.customerName},

Sie haben Zugang zu Ihrem persönlichen Kundenportal erhalten. Dort können Sie jederzeit den Status Ihres Projekts einsehen, Dokumente herunterladen und mit uns in Kontakt treten.

${data.orderNumber ? `Auftragsnummer: ${data.orderNumber}\n\n` : ''}🔐 IHR KUNDENPORTAL-ZUGANG
--------------------------
Portal: ${data.portalUrl}
Ihr Projektcode: ${data.accessCode}

Gehen Sie zum Portal und melden Sie sich mit diesem Code an (oder mit Ihrer E-Mail und Passwort, falls bereits eingerichtet).

Mit freundlichen Grüßen,
Ihr Team von ${companyName}
    `.trim(),
  }
}
