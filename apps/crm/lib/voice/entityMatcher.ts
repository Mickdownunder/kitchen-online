import { fail, ok, type ServiceResult } from '@/lib/types/service'
import type { VoiceDbClient } from './types'

interface MatchCandidate {
  id: string
  label: string
  score: number
}

interface EntityMatchResult {
  bestId?: string
  confidence: number
  candidates: MatchCandidate[]
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreTextMatch(hint: string, ...targets: Array<string | null | undefined>): number {
  const normalizedHint = normalize(hint)
  if (!normalizedHint) return 0

  let score = 0
  for (const target of targets) {
    if (!target) continue
    const normalizedTarget = normalize(target)
    if (!normalizedTarget) continue

    if (normalizedTarget === normalizedHint) {
      score = Math.max(score, 1)
      continue
    }

    if (normalizedTarget.startsWith(normalizedHint) || normalizedHint.startsWith(normalizedTarget)) {
      score = Math.max(score, 0.9)
      continue
    }

    if (normalizedTarget.includes(normalizedHint) || normalizedHint.includes(normalizedTarget)) {
      score = Math.max(score, 0.75)
      continue
    }

    const hintWords = normalizedHint.split(' ').filter(Boolean)
    const overlap = hintWords.filter((word) => normalizedTarget.includes(word)).length
    if (hintWords.length > 0 && overlap > 0) {
      const partial = 0.45 + overlap / (hintWords.length * 2)
      score = Math.max(score, Math.min(0.7, partial))
    }
  }

  return score
}

async function loadCompanyUserIds(client: VoiceDbClient, companyId: string): Promise<ServiceResult<string[]>> {
  const { data, error } = await client
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (error) {
    return fail('INTERNAL', error.message || 'Firmenmitglieder konnten nicht geladen werden.', error)
  }

  const userIds = (data || [])
    .map((row) => row.user_id)
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)

  if (userIds.length === 0) {
    return fail('NOT_FOUND', 'Keine aktiven Firmenmitglieder gefunden.')
  }

  return ok(userIds)
}

export async function matchProjectByHint(
  client: VoiceDbClient,
  companyId: string,
  hint?: string,
): Promise<ServiceResult<EntityMatchResult>> {
  if (!hint || hint.trim().length < 2) {
    return ok({ confidence: 0, candidates: [] })
  }

  const userIdsResult = await loadCompanyUserIds(client, companyId)
  if (!userIdsResult.ok) {
    return userIdsResult
  }

  const { data, error } = await client
    .from('projects')
    .select('id, order_number, customer_name, user_id')
    .in('user_id', userIdsResult.data)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    return fail('INTERNAL', error.message || 'Projekte konnten nicht geladen werden.', error)
  }

  const candidates = (data || [])
    .map((row) => {
      const score = scoreTextMatch(hint, row.order_number, row.customer_name)
      return {
        id: row.id,
        label: `${row.order_number} | ${row.customer_name}`,
        score,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const best = candidates[0]

  return ok({
    bestId: best?.id,
    confidence: best?.score || 0,
    candidates,
  })
}

export async function matchCustomerByHint(
  client: VoiceDbClient,
  companyId: string,
  hint?: string,
): Promise<ServiceResult<EntityMatchResult>> {
  if (!hint || hint.trim().length < 2) {
    return ok({ confidence: 0, candidates: [] })
  }

  const userIdsResult = await loadCompanyUserIds(client, companyId)
  if (!userIdsResult.ok) {
    return userIdsResult
  }

  const { data, error } = await client
    .from('customers')
    .select('id, first_name, last_name, company_name, user_id')
    .in('user_id', userIdsResult.data)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    return fail('INTERNAL', error.message || 'Kunden konnten nicht geladen werden.', error)
  }

  const candidates = (data || [])
    .map((row) => {
      const displayName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.company_name || row.id
      const score = scoreTextMatch(hint, displayName, row.company_name)
      return {
        id: row.id,
        label: displayName,
        score,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const best = candidates[0]

  return ok({
    bestId: best?.id,
    confidence: best?.score || 0,
    candidates,
  })
}
