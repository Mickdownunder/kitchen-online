import { createSupabaseAdmin } from './supabase'
import { LoginSchema, type LoginResponse } from '@kitchen/shared-types'

export interface LoginResult {
  success: true
  session: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  user: {
    id: string
    name: string
  }
}

export interface LoginError {
  success: false
  error: string
}

/**
 * Authentifiziert einen Kunden mit seinem Projektcode
 * 
 * @param accessCode - Der Zugangscode des Projekts
 * @returns Session tokens oder Fehler
 * 
 * Flow:
 * 1. Validiere accessCode Format
 * 2. Suche Projekt mit diesem Code
 * 3. Hole Customer-Daten
 * 4. Erstelle Supabase Session mit Custom Claims
 */
export async function loginWithAccessCode(
  accessCode: string
): Promise<LoginResult | LoginError> {
  // 1. Input validieren
  const parsed = LoginSchema.safeParse({ accessCode })
  if (!parsed.success) {
    return {
      success: false,
      error: 'INVALID_ACCESS_CODE_FORMAT',
    }
  }

  const supabase = createSupabaseAdmin()

  // 2. Projekt suchen
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      customer_id,
      customers (
        id,
        name,
        email
      )
    `)
    .eq('access_code', parsed.data.accessCode)
    .single()

  if (projectError || !project) {
    return {
      success: false,
      error: 'INVALID_ACCESS_CODE',
    }
  }

  // 3. Prüfen ob Projekt aktiv ist
  if (project.status === 'Storniert' || project.status === 'Abgeschlossen') {
    return {
      success: false,
      error: 'PROJECT_CLOSED',
    }
  }

  // 4. Customer prüfen
  const customer = project.customers as { id: string; name: string; email: string } | null
  if (!customer) {
    return {
      success: false,
      error: 'NO_CUSTOMER_ASSIGNED',
    }
  }

  // 5. Supabase User erstellen/finden und Session erstellen
  // Wir nutzen eine "magic" Email-Adresse basierend auf dem Projekt
  const magicEmail = `customer-${project.id}@portal.kuechenonline.com`

  // Prüfen ob User existiert
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
      return {
        success: false,
        error: 'SESSION_CREATE_FAILED',
      }
    }

    userId = newUser.user.id
  }

  // 6. Session Token generieren
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: magicEmail,
  })

  if (sessionError || !sessionData) {
    return {
      success: false,
      error: 'SESSION_CREATE_FAILED',
    }
  }

  // 7. Token aus dem Link extrahieren und Session erstellen
  // Alternative: Direkt einen Custom Token erstellen
  const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: magicEmail,
  })

  // Für eine echte Implementation würden wir hier einen
  // Custom JWT mit den Claims erstellen.
  // Fürs Erste geben wir einen Platzhalter zurück.
  
  // TODO: Implementiere proper session token generation
  // Dies erfordert entweder:
  // - Supabase Edge Function für Custom Token
  // - Oder einen anderen Auth-Flow

  return {
    success: true,
    session: {
      access_token: 'TODO_IMPLEMENT_PROPER_TOKEN',
      refresh_token: 'TODO_IMPLEMENT_PROPER_TOKEN',
      expires_in: 3600,
    },
    user: {
      id: customer.id,
      name: customer.name,
    },
  }
}
