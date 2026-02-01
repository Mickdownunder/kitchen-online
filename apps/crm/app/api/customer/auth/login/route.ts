import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rateLimit'
import crypto from 'crypto'

// Types for database queries
interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface ProjectRow {
  id: string
  customer_name: string
  status: string
  customer_id: string | null
  order_number: string
}

// Schema für Login-Request (Code oder Email/Passwort)
const CodeLoginSchema = z.object({
  accessCode: z.string().min(6).max(20),
  email: z.undefined().optional(),
  password: z.undefined().optional(),
})

const EmailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  accessCode: z.undefined().optional(),
})

/**
 * POST /api/customer/auth/login
 * 
 * Authentifiziert einen Kunden mit:
 * - Projektcode (Erstlogin) ODER
 * - Email + Passwort (wiederkehrender Login)
 * 
 * Bei Erstlogin wird geprüft ob Passwort gesetzt werden muss.
 */
export async function POST(request: NextRequest) {
  try {
    const limitCheck = await rateLimit(request)
    if (!limitCheck || !limitCheck.allowed) {
      const resetTime = limitCheck?.resetTime || Date.now() + 60000
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', resetTime },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          },
        }
      )
    }

    const body = await request.json()

    // Supabase Admin Client
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

    // Prüfen ob Email/Passwort oder Code Login
    const emailParsed = EmailLoginSchema.safeParse(body)
    
    if (emailParsed.success) {
      // ========================================
      // EMAIL/PASSWORT LOGIN
      // ========================================
      return handleEmailLogin(supabase, emailParsed.data.email, emailParsed.data.password)
    }

    const codeParsed = CodeLoginSchema.safeParse(body)
    
    if (codeParsed.success && codeParsed.data.accessCode) {
      // ========================================
      // PROJEKTCODE LOGIN
      // ========================================
      return handleCodeLogin(supabase, codeParsed.data.accessCode)
    }

    return NextResponse.json(
      { success: false, error: 'INVALID_REQUEST' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * Login mit Email und Passwort (für wiederkehrende Kunden)
 */
async function handleEmailLogin(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  // 1. Kunde mit dieser Email finden
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email')
    .eq('email', email)
    .single() as { data: CustomerRow | null; error: unknown }

  if (customerError || !customer) {
    return NextResponse.json(
      { success: false, error: 'INVALID_CREDENTIALS' },
      { status: 401 }
    )
  }

  // 2. Magic Email für diesen Kunden
  const magicEmail = `customer-${customer.id}@portal.kuechenonline.com`

  // 3. Login versuchen
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email: magicEmail,
    password: password,
  })

  if (sessionError || !sessionData.session) {
    return NextResponse.json(
      { success: false, error: 'INVALID_CREDENTIALS' },
      { status: 401 }
    )
  }

  // 4. Alle Projekte des Kunden laden
  const { data: projects } = await supabase
    .from('projects')
    .select('id, customer_name, status, order_number')
    .eq('customer_id', customer.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false }) as { data: ProjectRow[] | null }

  const customerName = `${customer.first_name} ${customer.last_name}`.trim()

  return NextResponse.json({
    success: true,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in || 3600,
    },
    user: {
      id: customer.id,
      name: customerName,
      email: customer.email,
    },
    projects: projects || [],
    needsPasswordSetup: false,
  })
}

/**
 * Login mit Projektcode (Erstlogin oder Code-basiert)
 */
async function handleCodeLogin(
  supabase: SupabaseClient,
  accessCode: string
) {
  // 1. Projekt mit diesem Access Code suchen
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, customer_name, status, customer_id, order_number')
    .eq('access_code', accessCode)
    .single() as { data: ProjectRow | null; error: unknown }

  if (projectError || !project) {
    return NextResponse.json(
      { success: false, error: 'INVALID_ACCESS_CODE' },
      { status: 401 }
    )
  }

  // 2. Customer-Daten laden
  if (!project.customer_id) {
    return NextResponse.json(
      { success: false, error: 'NO_CUSTOMER_ASSIGNED' },
      { status: 403 }
    )
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email')
    .eq('id', project.customer_id)
    .single() as { data: CustomerRow | null; error: unknown }

  if (customerError || !customer) {
    return NextResponse.json(
      { success: false, error: 'CUSTOMER_NOT_FOUND' },
      { status: 403 }
    )
  }

  const customerName = `${customer.first_name} ${customer.last_name}`.trim()

  // 3. Magic Email für diesen KUNDEN (nicht Projekt!)
  const magicEmail = `customer-${customer.id}@portal.kuechenonline.com`

  // 4. Prüfen ob User existiert
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === magicEmail)

  let userId: string
  let needsPasswordSetup = false

  if (existingUser) {
    userId = existingUser.id
    
    // Prüfen ob Passwort gesetzt wurde (user_metadata.password_set)
    const passwordAlreadySet = existingUser.user_metadata?.password_set === true
    
    if (passwordAlreadySet) {
      // ❌ Passwort ist bereits gesetzt → Projektcode nicht mehr erlaubt!
      // Kunde muss sich mit E-Mail + Passwort einloggen
      return NextResponse.json(
        { 
          success: false, 
          error: 'PASSWORD_ALREADY_SET',
          message: 'Ihr Zugang ist bereits eingerichtet. Bitte loggen Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort ein.',
          customerEmail: customer.email,
        },
        { status: 403 }
      )
    }
    
    needsPasswordSetup = true
    
    // Claims und Metadaten aktualisieren
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        customer_id: customer.id,
        role: 'customer',
      },
      user_metadata: {
        ...existingUser.user_metadata,
        customer_email: customer.email,
        customer_name: customerName,
        full_name: customerName, // For Supabase display name column
        name: customerName, // Alternative field some UIs use
      },
    })
  } else {
    // Neuen User erstellen - Erstlogin!
    needsPasswordSetup = true
    
    const userMetadataToSet = {
      password_set: false,
      customer_email: customer.email,
      customer_name: customerName,
      full_name: customerName, // For Supabase display name column
      name: customerName, // Alternative field some UIs use
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: magicEmail,
      email_confirm: true,
      app_metadata: {
        customer_id: customer.id,
        role: 'customer',
      },
      user_metadata: userMetadataToSet,
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

  // 5. Temporäres Passwort für Session (kryptographisch sicher)
  const tempPassword = crypto.randomBytes(32).toString('base64url')
  
  await supabase.auth.admin.updateUserById(userId, {
    password: tempPassword,
  })

  // 6. Session erstellen
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

  // 7. Alle Projekte des Kunden laden
  const { data: projects } = await supabase
    .from('projects')
    .select('id, customer_name, status, order_number')
    .eq('customer_id', customer.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false }) as { data: ProjectRow[] | null }

  // 8. Response
  return NextResponse.json({
    success: true,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in || 3600,
    },
    user: {
      id: customer.id,
      name: customerName,
      email: customer.email,
    },
    projects: projects || [],
    needsPasswordSetup,
    // Aktuelles Projekt (für Rückwärtskompatibilität)
    project: {
      id: project.id,
      name: project.customer_name,
      status: project.status,
    },
  })
}
