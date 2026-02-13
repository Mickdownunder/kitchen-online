import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrors } from '@/lib/utils/errorHandling'
import { createVoiceApiToken, listVoiceApiTokensForCompany } from '@/lib/voice/tokenService'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

const CreateTokenSchema = z.object({
  label: z.string().min(1).max(120),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})

function getExpiryIso(days: number): string {
  const now = new Date()
  now.setDate(now.getDate() + days)
  return now.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireManageCompany: true })
    if (access instanceof Response) {
      return access
    }

    const result = await listVoiceApiTokensForCompany(access.serviceSupabase, access.companyId)
    if (!result.ok) {
      return apiErrors.internal(new Error(result.message), { component: 'api/voice/tokens' })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/tokens' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireManageCompany: true })
    if (access instanceof Response) {
      return access
    }

    const body = await request.json().catch(() => ({}))
    const parsed = CreateTokenSchema.safeParse(body)
    if (!parsed.success) {
      return apiErrors.validation({
        component: 'api/voice/tokens',
        validationMessage: parsed.error.issues[0]?.message || 'Ungültiger Body.',
      })
    }

    const expiresInDays = parsed.data.expiresInDays || 180
    const result = await createVoiceApiToken({
      client: access.serviceSupabase,
      companyId: access.companyId,
      userId: access.user.id,
      label: parsed.data.label,
      expiresAt: getExpiryIso(expiresInDays),
      scopes: ['voice_capture'],
    })

    if (!result.ok) {
      if (result.code === 'VALIDATION') {
        return apiErrors.validation({ component: 'api/voice/tokens', validationMessage: result.message })
      }
      return apiErrors.internal(new Error(result.message), { component: 'api/voice/tokens' })
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 },
    )
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/tokens' })
  }
}
