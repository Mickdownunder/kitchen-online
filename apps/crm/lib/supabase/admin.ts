import { createClient } from '@supabase/supabase-js'
import type { User, AuthError } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Server-side only admin client with service role key
// NEVER import this file in client-side code!
// This client bypasses RLS and should only be used in API routes

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set - admin functions will not work')
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Helper to check if admin client is available
export function requireAdminClient(): NonNullable<typeof supabaseAdmin> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available - SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  return supabaseAdmin
}

// Invite user by email using Supabase Admin API
export async function inviteUserByEmail(email: string): Promise<{ user: User | null; error: AuthError | null }> {
  const admin = requireAdminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?invited=true`,
  })

  return { user: data?.user, error }
}

// Get user by email (to check if already exists)
export async function getUserByEmail(email: string): Promise<{ user: User | null; error: AuthError | null }> {
  const admin = requireAdminClient()

  // List users and find by email
  const { data, error } = await admin.auth.admin.listUsers()

  if (error) {
    return { user: null, error }
  }

  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  return { user: user || null, error: null }
}

// Create pending invite and send email
export async function createInviteAndSendEmail(
  companyId: string,
  email: string,
  role: string,
  invitedBy: string
): Promise<{ success: boolean; error?: string; inviteId?: string }> {
  const admin = requireAdminClient()

  try {
    // 1. Check if user already exists
    const { user: existingUser } = await getUserByEmail(email)

    if (existingUser) {
      // User exists - check if already member of this company
      const { data: membership } = await admin
        .from('company_members')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', existingUser.id)
        .single()

      if (membership) {
        return { success: false, error: 'Benutzer ist bereits Mitglied dieser Firma' }
      }

      // User exists but not member - use RPC to handle enum type casting
      // The RPC casts the text role to company_role_new enum type
      const { error: memberError } = await admin.rpc('add_existing_user_to_company', {
        p_company_id: companyId,
        p_user_id: existingUser.id,
        p_role: role,
      })

      if (memberError) {
        console.warn('Error adding existing user to company:', memberError)

        // Check if RPC doesn't exist
        if (memberError.code === 'PGRST202' || memberError.message?.includes('does not exist')) {
          return {
            success: false,
            error:
              'Die Funktion add_existing_user_to_company existiert nicht. ' +
              'Bitte führen Sie die Migration supabase/migrations/20260128_add_existing_user_rpc.sql aus.',
          }
        }

        return { success: false, error: memberError.message }
      }

      return { success: true }
    }

    // 2. User doesn't exist - create pending invite
    const { data: inviteData, error: inviteError } = await admin.rpc('create_pending_invite', {
      p_company_id: companyId,
      p_email: email,
      p_role: role,
      p_invited_by: invitedBy,
    })

    if (inviteError) {
      console.warn('Error creating pending invite:', inviteError)
      return { success: false, error: inviteError.message }
    }

    // 3. Send Supabase invite email
    const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?invited=true`,
      data: {
        company_id: companyId,
        invited_role: role,
      },
    })

    if (emailError) {
      console.warn('Error sending invite email:', emailError)
      // Delete pending invite if email fails
      await admin.from('pending_invites').delete().eq('id', inviteData)
      return { success: false, error: `E-Mail konnte nicht gesendet werden: ${emailError.message}` }
    }

    return { success: true, inviteId: inviteData }
  } catch (error: unknown) {
    console.warn('Invite error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' }
  }
}

// Process pending invite when user logs in
export async function processPendingInviteForUser(userId: string, email: string): Promise<boolean> {
  const admin = requireAdminClient()

  try {
    const { data, error } = await admin.rpc('process_pending_invite', {
      p_user_id: userId,
      p_email: email,
    })

    if (error) {
      console.warn('Error processing pending invite:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.warn('Error processing invite:', error)
    return false
  }
}
