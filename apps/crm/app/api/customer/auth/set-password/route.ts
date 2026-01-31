import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(100, 'Passwort darf maximal 100 Zeichen haben'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

/**
 * POST /api/customer/auth/set-password
 * 
 * Setzt das Passwort für einen Kunden nach dem Erstlogin.
 * Erfordert eine gültige Session (Bearer Token).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Header prüfen
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. Request Body parsen
    const body = await request.json()
    const parsed = SetPasswordSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PASSWORD', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { password } = parsed.data

    // 3. Supabase Admin Client
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

    // 4. User aus Token validieren
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SESSION' },
        { status: 401 }
      )
    }

    // 5. Prüfen ob Customer-Rolle
    if (user.app_metadata?.role !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'NOT_A_CUSTOMER' },
        { status: 403 }
      )
    }

    // 6. Passwort setzen und password_set Flag auf true
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
      user_metadata: {
        ...user.user_metadata,
        password_set: true,
        password_set_at: new Date().toISOString(),
      },
    })

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { success: false, error: 'PASSWORD_UPDATE_FAILED' },
        { status: 500 }
      )
    }

    // 7. Neue Session erstellen mit neuem Passwort
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    })

    if (sessionError || !sessionData.session) {
      // Passwort wurde gesetzt, aber Session-Erstellung fehlgeschlagen
      // User muss sich neu einloggen
      return NextResponse.json({
        success: true,
        message: 'PASSWORD_SET_RELOGIN_REQUIRED',
        session: null,
      })
    }

    // 8. Erfolg
    return NextResponse.json({
      success: true,
      message: 'PASSWORD_SET',
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in || 3600,
      },
    })

  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
