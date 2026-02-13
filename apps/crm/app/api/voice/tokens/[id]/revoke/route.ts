import { NextRequest, NextResponse } from 'next/server'
import { apiErrors } from '@/lib/utils/errorHandling'
import { revokeVoiceApiToken } from '@/lib/voice/tokenService'
import { requireVoiceRouteAccess } from '@/lib/voice/routeAccess'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireVoiceRouteAccess({ request, requireManageCompany: true })
    if (access instanceof Response) {
      return access
    }

    const { id } = await params

    const result = await revokeVoiceApiToken({
      client: access.serviceSupabase,
      companyId: access.companyId,
      tokenId: id,
      revokedByUserId: access.user.id,
    })

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        return apiErrors.notFound({ component: 'api/voice/tokens/revoke', id })
      }
      return apiErrors.internal(new Error(result.message), { component: 'api/voice/tokens/revoke' })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    return apiErrors.internal(error as Error, { component: 'api/voice/tokens/revoke' })
  }
}
