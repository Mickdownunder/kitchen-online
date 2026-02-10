import { NextRequest } from 'next/server'
import { PublishRequestSchema, type PublishRequest } from './schema'

export async function parsePublishRequest(request: NextRequest): Promise<PublishRequest | null> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return null
  }

  const parsed = PublishRequestSchema.safeParse(body)
  if (!parsed.success) {
    return null
  }

  return parsed.data
}
