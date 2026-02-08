import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { logger } from '@/lib/utils/logger'
import { apiErrors } from '@/lib/utils/errorHandling'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiErrors.unauthorized()
  }

  if (user.app_metadata?.role === 'customer') {
    return apiErrors.forbidden()
  }

  // Rate Limiting
  const limitCheck = await rateLimit(request, user.id)
  if (!limitCheck?.allowed) {
    return apiErrors.rateLimit()
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // OpenStreetMap Nominatim API (kostenlos, keine API-Key nötig)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=at,de&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Kitchen-Ki-APP/1.0', // Nominatim erfordert User-Agent
          'Accept-Language': 'de,en',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: response.status })
    }

    const data = await response.json()
    const suggestions = data.map(
      (item: {
        address?: {
          road?: string
          house_number?: string
          postcode?: string
          city?: string
          town?: string
          village?: string
        }
        display_name?: string
      }) => {
        const address = item.address || {}
        const street = address.road || ''
        const houseNumber = address.house_number || ''
        const postalCode = address.postcode || ''
        const city = address.city || address.town || address.village || ''
        const fullAddress = `${street} ${houseNumber}, ${postalCode} ${city}`.trim()
        return {
          display: (item.display_name || '').split(',')[0] + (city ? `, ${city}` : ''),
          full: fullAddress || item.display_name,
        }
      }
    )

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    logger.error('Geocoding error', { component: 'api/geocode' }, error as Error)
    return apiErrors.internal(error as Error, { component: 'api/geocode' })
  }
}
