import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    console.error('Geocoding error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
}
