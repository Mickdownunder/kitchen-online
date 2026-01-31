import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs, logAuditEvent } from '@/lib/supabase/services/audit'
import { logger } from '@/lib/utils/logger'

// GET - Read audit logs
export async function GET(request: NextRequest) {
  const apiLogger = logger.api('/api/audit-logs', 'GET')
  apiLogger.start()

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    const logs = await getAuditLogs({
      limit,
      offset,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    })

    apiLogger.complete({ logCount: logs.length })
    return NextResponse.json({ logs })
  } catch (error) {
    apiLogger.error(error as Error)
    logger.error(
      'Audit logs API error',
      {
        component: 'api/audit-logs',
      },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

// POST - Create audit log entry
export async function POST(request: NextRequest) {
  const apiLogger = logger.api('/api/audit-logs', 'POST')
  apiLogger.start()

  try {
    const body = await request.json()
    const { action, entityType, entityId, changes, metadata } = body

    if (!action || !entityType) {
      return NextResponse.json(
        { error: 'action and entityType are required' },
        { status: 400 }
      )
    }

    const logId = await logAuditEvent({
      action,
      entityType,
      entityId,
      changes,
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    apiLogger.complete({ logId })
    return NextResponse.json({ success: true, logId })
  } catch (error) {
    apiLogger.error(error as Error)
    logger.error(
      'Audit log creation API error',
      {
        component: 'api/audit-logs',
      },
      error as Error
    )
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
