import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Schema für Login-Request
const LoginSchema = z.object({
  accessCode: z
    .string()
    .min(6, 'Zugangscode muss mindestens 6 Zeichen haben')
    .max(20, 'Zugangscode darf maximal 20 Zeichen haben'),
})

/**
 * POST /api/customer/auth/login
 * 
 * Authentifiziert einen Kunden mit seinem Projektcode.
 * Erstellt eine Supabase Session mit Custom Claims.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Request Body parsen
    const body = await request.json()
    
    // 2. Input validieren
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ACCESS_CODE_FORMAT' },
        { status: 400 }
      )
    }

    const { accessCode } = parsed.data

    // 3. Supabase Admin Client erstellen
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

    // 4. Projekt mit diesem Access Code suchen
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        customer_id,
        order_number
      `)
      .eq('access_code', accessCode)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ACCESS_CODE' },
        { status: 401 }
      )
    }

    // 5. Prüfen ob Projekt aktiv ist
    const closedStatuses = ['Storniert', 'Abgeschlossen']
    if (closedStatuses.includes(project.status)) {
      return NextResponse.json(
        { success: false, error: 'PROJECT_CLOSED' },
        { status: 403 }
      )
    }

    // 6. Customer-Daten laden
    if (!project.customer_id) {
      return NextResponse.json(
        { success: false, error: 'NO_CUSTOMER_ASSIGNED' },
        { status: 403 }
      )
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('id', project.customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'CUSTOMER_NOT_FOUND' },
        { status: 403 }
      )
    }

    // 7. Magic Email für diesen Customer/Projekt erstellen
    const magicEmail = `customer-${project.id}@portal.kuechenonline.com`

    // 8. Prüfen ob User existiert, sonst erstellen
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    let userId: string

    const existingUser = existingUsers?.users?.find(u => u.email === magicEmail)

    if (existingUser) {
      userId = existingUser.id
      
      // Claims aktualisieren
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          project_id: project.id,
          customer_id: customer.id,
          role: 'customer',
        },
      })
    } else {
      // Neuen User erstellen
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: magicEmail,
        email_confirm: true,
        app_metadata: {
          project_id: project.id,
          customer_id: customer.id,
          role: 'customer',
        },
      })

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError)
        return NextResponse.json(
          { success: false, error: 'SESSION_CREATE_FAILED' },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // 9. Session Token generieren
    // Wir nutzen signInWithPassword mit einem generierten Passwort
    // Alternative: Custom JWT - aber das ist komplexer
    const tempPassword = `temp-${project.id}-${Date.now()}`
    
    // Passwort setzen
    await supabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
    })

    // Einloggen um Session zu bekommen
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: magicEmail,
      password: tempPassword,
    })

    if (sessionError || !sessionData.session) {
      console.error('Failed to create session:', sessionError)
      return NextResponse.json(
        { success: false, error: 'SESSION_CREATE_FAILED' },
        { status: 500 }
      )
    }

    // 10. Erfolgreiche Response
    return NextResponse.json({
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in || 3600,
      },
      user: {
        id: customer.id,
        name: customer.name,
      },
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
