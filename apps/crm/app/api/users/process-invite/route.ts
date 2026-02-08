import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPendingInviteForUser } from '@/lib/supabase/admin'
import { apiErrors } from '@/lib/utils/errorHandling'

// Called after user logs in to check for pending invites
export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiErrors.unauthorized()
    }

    if (!user.email) {
      return NextResponse.json({ processed: false, message: 'Keine E-Mail' })
    }

    // Process any pending invite for this user
    const processed = await processPendingInviteForUser(user.id, user.email)

    return NextResponse.json({
      processed,
      message: processed ? 'Einladung angenommen - Willkommen!' : 'Keine ausstehende Einladung',
    })
  } catch (error: unknown) {
    console.error('Process invite API error:', error)
    return apiErrors.internal(error as Error, { component: 'api/users/process-invite' })
  }
}
