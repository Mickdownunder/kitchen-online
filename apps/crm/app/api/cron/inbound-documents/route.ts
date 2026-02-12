import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { processInboundInboxBatch } from '@/lib/inbound/processor'
import { verifyCronRequest } from '@/lib/inbound/security'

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const limitRaw = request.nextUrl.searchParams.get('limit')
  const parsedLimit = Number.parseInt(limitRaw || '20', 10)

  try {
    const result = await processInboundInboxBatch({
      supabase: supabaseAdmin,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Inbound processing failed',
      },
      { status: 500 },
    )
  }
}
