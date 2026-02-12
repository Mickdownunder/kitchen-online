import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { processEmailOutboxBatch } from '@/lib/supabase/services/emailOutbox'

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  if (request.headers.get('x-vercel-cron') === '1') {
    return true
  }
  return false
}

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = Number.parseInt(limitRaw || '20', 10)

  try {
    const result = await processEmailOutboxBatch({
      supabase: supabaseAdmin,
      limit: Number.isFinite(limit) ? limit : 20,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Outbox processing failed',
      },
      { status: 500 },
    )
  }
}
