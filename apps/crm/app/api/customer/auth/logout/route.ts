import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/customer/auth/logout
 * 
 * Invalidiert die aktuelle Customer Session.
 * Funktioniert auch ohne Auth-Header (Client hat bereits signOut gemacht).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Header prüfen (optional)
    const authHeader = request.headers.get('Authorization')
    
    // Wenn kein Token, ist der User bereits ausgeloggt - das ist OK
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: true })
    }

    const token = authHeader.substring(7)

    // 2. Supabase Client mit dem User-Token erstellen
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 3. Session invalidieren
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      // Trotzdem als erfolgreich melden - Token ist möglicherweise schon ungültig
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
