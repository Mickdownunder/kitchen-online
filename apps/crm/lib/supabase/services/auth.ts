import { supabase } from '../client'
import { UserProfile, UserRole } from '@/types'
import { getCompanySettings, getEmployees } from './company'
import { logger } from '@/lib/utils/logger'

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'verkaeufer'
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  })

  if (error) throw error

  // Profile will be automatically created by database trigger
  // But we can verify it was created after a short delay
  if (data.user) {
    // Wait a bit for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify profile was created (optional - just for debugging)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (profileError && (profileError as Error & { code?: string }).code !== 'PGRST116') {
      // PGRST116 means no rows found, which is OK if trigger hasn't run yet
      console.warn('Profile may not be created yet:', profileError)
    }

    // Verknüpfung mit Employee über E-Mail-Matching
    try {
      await linkEmployeeToUser(email, data.user.id)
    } catch (linkError) {
      // Nicht kritisch - Verknüpfung kann später manuell erfolgen
      console.warn('Could not link employee to user:', linkError)
    }
  }

  return data
}

/**
 * Verknüpft einen Employee mit einem User über E-Mail-Matching
 * Erstellt automatisch company_members Eintrag wenn Employee gefunden wird
 */
async function linkEmployeeToUser(email: string, userId: string): Promise<void> {
  // 1. Company Settings laden um companyId zu bekommen
  const companySettings = await getCompanySettings()
  if (!companySettings?.id) {
    console.warn('No company settings found, cannot link employee')
    return
  }

  // 2. Employee mit dieser E-Mail suchen
  const employees = await getEmployees(companySettings.id)
  const matchingEmployee = employees.find(emp => emp.email?.toLowerCase() === email.toLowerCase())

  if (!matchingEmployee) {
    logger.debug('No employee found with email', { component: 'auth', email })
    return
  }

  // 3. Employee mit user_id verknüpfen
  const { error: updateError } = await supabase
    .from('employees')
    .update({ user_id: userId })
    .eq('id', matchingEmployee.id)

  if (updateError) {
    console.error('Error linking employee to user:', updateError)
    throw updateError
  }

  // 4. company_members Eintrag erstellen (falls noch nicht vorhanden)
  const { data: existingMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companySettings.id)
    .eq('user_id', userId)
    .single()

  if (!existingMember) {
    const { error: memberError } = await supabase.from('company_members').insert({
      company_id: companySettings.id,
      user_id: userId,
      role: matchingEmployee.role, // Verwende Rolle vom Employee
      is_active: matchingEmployee.isActive,
    })

    if (memberError) {
      console.error('Error creating company_member:', memberError)
      // Nicht werfen - Verknüpfung ist bereits erfolgt
    } else {
      logger.info('Successfully linked employee and created company_member', {
        component: 'auth',
        employeeId: matchingEmployee.id,
        userId,
        role: matchingEmployee.role,
      })
    }
  } else {
    logger.debug('Company member already exists for user', { component: 'auth', userId })
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('❌ Sign in error:', error)
    throw error
  }

  if (!data.session) {
    console.error('❌ No session returned from signIn')
    throw new Error('Keine Session erstellt')
  }

  logger.info('Sign in successful', {
    component: 'auth',
    userId: data.session.user.id,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
  })

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, create it (fallback if trigger didn't run)
  if (error) {
    // Get error details once
    const errObj = error as Error & {
      code?: string
      error_code?: string
      message?: string
      details?: string
      hint?: string
    }
    const errorCode = errObj?.code || errObj?.error_code
    const errorMessage = errObj?.message || String(error)

    // Check for infinite recursion error first
    if (errorCode === '42P17' || errorMessage.includes('infinite recursion')) {
      console.error(
        'RLS Policy Recursion Error - Run supabase/fix_infinite_recursion.sql in Supabase SQL Editor'
      )
      return null
    }

    // Check if it's a "not found" error
    const isNotFound =
      errorCode === 'PGRST116' ||
      errorMessage?.includes('No rows') ||
      errorMessage?.includes('not found') ||
      errorMessage?.includes('No rows returned')

    if (isNotFound) {
      // Profile doesn't exist, create it
      logger.debug('Profile not found, creating', {
        component: 'auth',
        userId: user.id,
        email: user.email,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          role: (user.user_metadata?.role as UserRole) || 'verkaeufer',
        } as any)
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', JSON.stringify(createError, null, 2))
        return null
      }

      logger.info('Profile created successfully', { component: 'auth', userId: newProfile.id })
      return newProfile as unknown as UserProfile
    }

    // For other errors, log details
    console.error('Error loading profile:', {
      code: errorCode,
      message: errorMessage,
      details: errObj?.details,
      hint: errObj?.hint,
    })
    return null
  }

  return data as unknown as UserProfile
}

/**
 * Sendet eine Passwort-Reset E-Mail an die angegebene Adresse
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'https://app.baleah.at/reset-password'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    logger.error('Password reset email failed', { component: 'auth', email }, error)
    throw error
  }

  logger.info('Password reset email sent', { component: 'auth', email })
}

/**
 * Aktualisiert das Passwort des aktuell eingeloggten Users
 * (Wird nach Klick auf Reset-Link aufgerufen)
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    const isAbort =
      (error as { name?: string }).name === 'AbortError' ||
      String((error as { message?: string }).message ?? '')
        .toLowerCase()
        .includes('aborted')
    if (!isAbort) {
      logger.error('Password update failed', { component: 'auth' }, error)
    }
    throw error
  }

  logger.info('Password updated successfully', { component: 'auth' })
}
