import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const ConfirmResetSchema = z.object({
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  token: z.string().min(1),
})

/**
 * POST /api/customer/auth/confirm-reset
 * 
 * Setzt das neue Passwort nach Klick auf Reset-Link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ConfirmResetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { password, token } = parsed.data

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

    // 1. Token verifizieren und User ermitteln
    // Der Token kommt als Access Token nach dem Redirect
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData?.user) {
      logger.warn('Invalid or expired reset token', {
        component: 'api/customer/auth/confirm-reset',
        error: userError?.message,
      })
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    const user = userData.user

    // 2. Neues Passwort setzen
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password,
        user_metadata: {
          ...user.user_metadata,
          password_set: true,
        },
      }
    )

    if (updateError) {
      logger.error('Failed to update password', {
        component: 'api/customer/auth/confirm-reset',
        userId: user.id,
        error: updateError.message,
      })
      return NextResponse.json(
        { success: false, error: 'UPDATE_FAILED' },
        { status: 500 }
      )
    }

    // 3. Neue Session erstellen
    const magicEmail = user.email
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: magicEmail!,
      password,
    })

    if (signInError || !signInData.session) {
      logger.error('Failed to create session after password reset', {
        component: 'api/customer/auth/confirm-reset',
        error: signInError?.message,
      })
      // Passwort wurde trotzdem gesetzt, User kann sich normal einloggen
      return NextResponse.json({
        success: true,
        message: 'Passwort wurde geändert. Bitte melden Sie sich an.',
        requiresLogin: true,
      })
    }

    logger.info('Password reset successful', {
      component: 'api/customer/auth/confirm-reset',
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Passwort wurde erfolgreich geändert.',
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
      },
    })

  } catch (error) {
    logger.error('Confirm reset error', {
      component: 'api/customer/auth/confirm-reset',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
