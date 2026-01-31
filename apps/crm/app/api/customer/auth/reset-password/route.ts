import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { logger } from '@/lib/utils/logger'
import { sendEmail } from '@/lib/supabase/services/email'

const RequestResetSchema = z.object({
  email: z.string().email(),
})

/**
 * POST /api/customer/auth/reset-password
 * 
 * Sendet eine Passwort-Reset-E-Mail an den Kunden
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const limitCheck = await rateLimit(request)
    if (!limitCheck || !limitCheck.allowed) {
      const resetTime = limitCheck?.resetTime || Date.now() + 60000
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', resetTime },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = RequestResetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_EMAIL' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Prüfen ob ein Kunde mit dieser E-Mail existiert
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    if (customerError || !customer) {
      // Aus Sicherheitsgründen keine Info ob E-Mail existiert
      logger.info('Password reset requested for unknown email', {
        component: 'api/customer/auth/reset-password',
        email,
      })
      return NextResponse.json({
        success: true,
        message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
      })
    }

    // 2. Prüfen ob ein Auth-User für diesen Kunden existiert
    // Magic email format: customer-{customer_id}@portal.kuechenonline.com
    const magicEmail = `customer-${customer.id}@portal.kuechenonline.com`

    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === magicEmail)

    if (!authUser) {
      // Kein Portal-Zugang eingerichtet
      logger.info('Password reset requested but no portal access', {
        component: 'api/customer/auth/reset-password',
        customerId: customer.id,
      })
      return NextResponse.json({
        success: true,
        message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
      })
    }

    // 3. Passwort-Reset-Link generieren
    // Wir nutzen den OTP-Mechanismus von Supabase
    const { data: otpData, error: otpError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: magicEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/reset-password`,
      },
    })

    if (otpError || !otpData?.properties?.hashed_token) {
      logger.error('Failed to generate reset link', {
        component: 'api/customer/auth/reset-password',
        error: otpError?.message,
      })
      return NextResponse.json(
        { success: false, error: 'RESET_FAILED' },
        { status: 500 }
      )
    }

    // 4. E-Mail an die echte Kunden-E-Mail senden
    const resetLink = otpData.properties.action_link
    const customerName = `${customer.first_name} ${customer.last_name}`.trim()

    try {
      await sendEmail({
        to: email,
        subject: 'Passwort zurücksetzen - KüchenOnline Kundenportal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">KüchenOnline</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Kundenportal</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #334155; font-size: 16px;">Hallo ${customerName},</p>
              
              <p style="color: #334155; font-size: 16px;">
                Sie haben angefordert, Ihr Passwort zurückzusetzen. 
                Klicken Sie auf den folgenden Button, um ein neues Passwort zu erstellen:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); 
                          color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 16px;">
                  Passwort zurücksetzen
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">
                Dieser Link ist 24 Stunden gültig. Falls Sie diese Anfrage nicht gestellt haben, 
                können Sie diese E-Mail ignorieren.
              </p>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${resetLink}" style="color: #10b981; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <div style="padding: 20px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} KüchenOnline. Alle Rechte vorbehalten.
              </p>
            </div>
          </div>
        `,
        text: `Hallo ${customerName},\n\nSie haben angefordert, Ihr Passwort zurückzusetzen.\n\nKlicken Sie auf den folgenden Link, um ein neues Passwort zu erstellen:\n${resetLink}\n\nDieser Link ist 24 Stunden gültig.\n\nFalls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.\n\nMit freundlichen Grüßen\nIhr KüchenOnline Team`,
      })

      logger.info('Password reset email sent', {
        component: 'api/customer/auth/reset-password',
        customerId: customer.id,
        customerEmail: email,
      })
    } catch (emailError) {
      logger.error('Failed to send reset email', {
        component: 'api/customer/auth/reset-password',
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      })
      // Trotzdem Erfolg zurückgeben (Sicherheit)
    }

    return NextResponse.json({
      success: true,
      message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
    })

  } catch (error) {
    logger.error('Password reset error', {
      component: 'api/customer/auth/reset-password',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
