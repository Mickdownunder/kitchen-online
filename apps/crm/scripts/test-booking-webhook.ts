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

  console.log('🧪 Testing Cal.com Webhook...')
  console.log(`📍 URL: ${url}`)
  console.log(`📧 Test Email: ${TEST_PAYLOAD.payload.attendees[0].email}`)
  console.log('')

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
      console.log('✅ Webhook erfolgreich!')
      console.log('')
      console.log('📋 Ergebnis:')
      console.log(`   Customer ID: ${data.customerId}`)
      console.log(`   Project ID:  ${data.projectId}`)
      console.log(`   Order Number: ${data.orderNumber}`)
      console.log(`   Access Code: ${data.accessCode}`)
      console.log('')
      console.log('📧 Prüfe dein Email-Postfach (auch Spam)!')
      console.log('')
      console.log('🔍 Nächste Schritte:')
      console.log('   1. Im CRM prüfen: Customers → Suche "Max Mustermann"')
      console.log('   2. Im CRM prüfen: Projects → Suche nach Order Number')
      console.log('   3. Im CRM prüfen: Calendar → Termin sollte erscheinen')
    } else {
      console.log('❌ Webhook fehlgeschlagen!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${data.error || JSON.stringify(data)}`)
    }
  } catch (error) {
    console.log('❌ Verbindungsfehler!')
    console.log(`   ${error}`)
    console.log('')
    console.log('💡 Ist der Dev Server gestartet? (pnpm dev)')
  }
}

testWebhook()
