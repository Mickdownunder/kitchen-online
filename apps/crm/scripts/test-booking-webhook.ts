/**
 * Test Script für den Cal.com Booking Webhook
 * 
 * Ausführen mit:
 *   npx tsx apps/crm/scripts/test-booking-webhook.ts
 * 
 * Voraussetzung: Dev Server läuft (pnpm dev)
 */

const TEST_PAYLOAD = {
  triggerEvent: 'BOOKING_CREATED',
  payload: {
    uid: `test-${Date.now()}`,
    title: 'Kostenlose Küchenplanung',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // In 7 Tagen
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 Stunde
    description: 'Test-Buchung via Script',
    attendees: [
      {
        name: 'Max Mustermann',
        email: 'office@kuechenonline.com',
        timeZone: 'Europe/Vienna',
      },
    ],
    organizer: {
      name: 'Verkäufer Test',
      email: 'seller@example.com',
      timeZone: 'Europe/Vienna',
    },
    metadata: {
      videoCallUrl: 'https://meet.google.com/abc-defg-hij',
    },
    responses: {
      attendeePhoneNumber: {
        value: '+43 123 456789',
      },
    },
  },
}

async function testWebhook() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const url = `${baseUrl}/api/booking/webhook`

  console.warn('🧪 Testing Cal.com Webhook...')
  console.warn(`📍 URL: ${url}`)
  console.warn(`📧 Test Email: ${TEST_PAYLOAD.payload.attendees[0].email}`)
  console.warn('')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_PAYLOAD),
    })

    const data = await response.json()

    if (response.ok) {
      console.warn('✅ Webhook erfolgreich!')
      console.warn('')
      console.warn('📋 Ergebnis:')
      console.warn(`   Customer ID: ${data.customerId}`)
      console.warn(`   Project ID:  ${data.projectId}`)
      console.warn(`   Order Number: ${data.orderNumber}`)
      console.warn(`   Access Code: ${data.accessCode}`)
      console.warn('')
      console.warn('📧 Prüfe dein Email-Postfach (auch Spam)!')
      console.warn('')
      console.warn('🔍 Nächste Schritte:')
      console.warn('   1. Im CRM prüfen: Customers → Suche "Max Mustermann"')
      console.warn('   2. Im CRM prüfen: Projects → Suche nach Order Number')
      console.warn('   3. Im CRM prüfen: Calendar → Termin sollte erscheinen')
    } else {
      console.warn('❌ Webhook fehlgeschlagen!')
      console.warn(`   Status: ${response.status}`)
      console.warn(`   Error: ${data.error || JSON.stringify(data)}`)
    }
  } catch (error) {
    console.warn('❌ Verbindungsfehler!')
    console.warn(`   ${error}`)
    console.warn('')
    console.warn('💡 Ist der Dev Server gestartet? (pnpm dev)')
  }
}

testWebhook()
