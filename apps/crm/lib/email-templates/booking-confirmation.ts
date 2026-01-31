/**
 * Email Template für Buchungsbestätigung (Cal.com Webhook)
 * Sendet Portal-Zugang + Meeting-Link an den Kunden
 */

interface BookingConfirmationData {
  customerName: string
  customerEmail: string
  appointmentTitle: string
  appointmentDate: string // ISO string
  appointmentTime: string // z.B. "14:00"
  meetingUrl: string
  accessCode: string
  portalUrl: string
  companyName?: string
}

// Brand Colors
const BRAND_GOLD = '#D4AF37'
const BRAND_BLUE = '#003366'

// Logo URL
const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

export function bookingConfirmationTemplate(data: BookingConfirmationData): {
  to: string
  subject: string
  html: string
  text: string
} {
  const companyName = data.companyName || 'KüchenOnline'
  
  // Format date for German locale
  const formattedDate = new Date(data.appointmentDate).toLocaleDateString('de-AT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    to: data.customerEmail,
    subject: `Willkommen bei ${companyName}! Ihr Planungstermin & Portal-Zugang`,
    html: `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header { 
              background: #ffffff;
              padding: 30px 20px;
              text-align: center;
              border-bottom: 3px solid ${BRAND_GOLD};
            }
            .header img {
              max-width: 200px;
              height: auto;
            }
            .content { 
              padding: 30px 20px;
            }
            .greeting {
              color: ${BRAND_GOLD};
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            .section {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid ${BRAND_GOLD};
            }
            .section-title {
              color: ${BRAND_BLUE};
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 12px 0;
            }
            .info-row {
              display: flex;
              margin: 8px 0;
            }
            .info-label {
              color: #666;
              min-width: 120px;
            }
            .info-value {
              color: #333;
              font-weight: 500;
            }
            .button {
              display: inline-block;
              background: ${BRAND_GOLD};
              color: ${BRAND_BLUE} !important;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 5px 10px 0;
            }
            .button-secondary {
              background: ${BRAND_BLUE};
              color: white !important;
            }
            .code-box {
              background: #fff3cd;
              border: 2px dashed ${BRAND_GOLD};
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              margin: 15px 0;
            }
            .access-code {
              font-family: 'Courier New', monospace;
              font-size: 24px;
              font-weight: bold;
              color: ${BRAND_BLUE};
              letter-spacing: 2px;
            }
            .footer { 
              padding: 20px;
              text-align: center;
              font-size: 12px; 
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <img src="${LOGO_URL}" alt="${companyName}" />
              </div>
              <div class="content">
                <p class="greeting">Hallo ${data.customerName},</p>
                
                <p>vielen Dank für Ihr Vertrauen und die Buchung Ihres persönlichen Planungstermins.</p>
                <p>Wir freuen uns darauf, mit Ihnen gemeinsam Ihre Traumküche zu gestalten.</p>
                
                <div class="section">
                  <h3 class="section-title">📅 Ihr Planungstermin</h3>
                  <div class="info-row">
                    <span class="info-label">Termin:</span>
                    <span class="info-value">${data.appointmentTitle}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Datum:</span>
                    <span class="info-value">${formattedDate}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Uhrzeit:</span>
                    <span class="info-value">${data.appointmentTime} Uhr</span>
                  </div>
                  <p style="margin-top: 15px;">Der Termin findet online statt. Bitte klicken Sie zum vereinbarten Zeitpunkt auf den folgenden Link:</p>
                  <a href="${data.meetingUrl}" class="button">🎥 Am Meeting teilnehmen</a>
                </div>

                <div class="section">
                  <h3 class="section-title">🔐 Ihr Kundenportal-Zugang</h3>
                  <p>Im Kundenportal können Sie jederzeit den Status Ihres Projekts einsehen, Dokumente herunterladen und mit uns in Kontakt treten.</p>
                  <div class="code-box">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Ihr Zugangscode:</p>
                    <span class="access-code">${data.accessCode}</span>
                  </div>
                  <a href="${data.portalUrl}" class="button button-secondary">Zum Kundenportal</a>
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

vielen Dank für Ihr Vertrauen und die Buchung Ihres persönlichen Planungstermins.
Wir freuen uns darauf, mit Ihnen gemeinsam Ihre Traumküche zu gestalten.

📅 IHR PLANUNGSTERMIN
---------------------
Termin: ${data.appointmentTitle}
Datum: ${formattedDate}
Uhrzeit: ${data.appointmentTime} Uhr

Der Termin findet online statt.
Meeting-Link: ${data.meetingUrl}

🔐 IHR KUNDENPORTAL-ZUGANG
--------------------------
Im Kundenportal können Sie jederzeit den Status Ihres Projekts einsehen, 
Dokumente herunterladen und mit uns in Kontakt treten.

Portal: ${data.portalUrl}
Ihr Zugangscode: ${data.accessCode}

Mit freundlichen Grüßen,
Ihr Team von ${companyName}
    `.trim(),
  }
}
