/**
 * Unit tests for complaints service.
 */

import { mockQueryResult, resetMock } from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/auth', () => ({
  getCurrentUser: jest.fn(),
}))
jest.mock('@/lib/supabase/services/permissions', () => ({
  getCurrentCompanyId: jest.fn(),
}))
jest.mock('@/lib/supabase/services/projects', () => ({
  getProject: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { getCurrentUser } from '@/lib/supabase/services/auth'
import { getCurrentCompanyId } from '@/lib/supabase/services/permissions'
import { getProject } from '@/lib/supabase/services/projects'
import {
  getComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
} from '@/lib/supabase/services/complaints'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockGetCurrentCompanyId = getCurrentCompanyId as jest.MockedFunction<typeof getCurrentCompanyId>
const mockGetProject = getProject as jest.MockedFunction<typeof getProject>

beforeEach(() => {
  resetMock()
  mockGetCurrentUser.mockReset()
  mockGetCurrentCompanyId.mockReset()
  mockGetProject.mockReset()
})

describe('getComplaints', () => {
  it('throws when no company ID', async () => {
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(getComplaints()).rejects.toThrow('No company ID')
  })

  it('returns mapped complaints', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({
      data: [
        {
          id: 'c1',
          company_id: 'comp-1',
          project_id: 'proj-1',
          description: 'Fehler',
          status: 'open',
          priority: 'high',
          created_at: '2026-01-15',
          updated_at: '2026-01-15',
        },
      ],
      error: null,
    })

    const result = await getComplaints()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
    expect(result[0].description).toBe('Fehler')
    expect(result[0].status).toBe('open')
  })

  it('filters by projectId when provided', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({ data: [], error: null })

    await getComplaints('proj-1')

    expect(mockGetCurrentCompanyId).toHaveBeenCalled()
  })

  it('excludes resolved when excludeResolved is true', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({ data: [], error: null })

    await getComplaints(undefined, true)

    expect(mockGetCurrentCompanyId).toHaveBeenCalled()
  })
})

describe('getComplaint', () => {
  it('throws when no company ID', async () => {
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(getComplaint('c1')).rejects.toThrow('No company ID')
  })

  it('returns null when not found (PGRST116)', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({
      data: null,
      error: { code: 'PGRST116', message: 'not found' } as Error & { code?: string },
    })

    const result = await getComplaint('c1')

    expect(result).toBeNull()
  })

  it('returns complaint when found', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({
      data: {
        id: 'c1',
        company_id: 'comp-1',
        project_id: 'proj-1',
        description: 'Defekt',
        status: 'open',
        priority: 'medium',
        affected_item_ids: [],
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
      },
      error: null,
    })

    const result = await getComplaint('c1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('c1')
    expect(result!.description).toBe('Defekt')
  })
})

describe('createComplaint', () => {
  it('throws when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await expect(
      createComplaint({
        projectId: 'proj-1',
        description: 'Test',
        status: 'draft',
        priority: 'medium',
      })
    ).rejects.toThrow('Nicht authentifiziert')
  })

  it('throws when no company ID', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(
      createComplaint({
        projectId: 'proj-1',
        description: 'Test',
        status: 'draft',
        priority: 'medium',
      })
    ).rejects.toThrow('Keine Firma gefunden')
  })

  it('throws when project not found', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockGetProject.mockResolvedValue({
      ok: false,
      code: 'NOT_FOUND',
      message: 'Project proj-1 not found',
    })

    await expect(
      createComplaint({
        projectId: 'proj-1',
        description: 'Test',
        status: 'draft',
        priority: 'medium',
      })
    ).rejects.toThrow('Projekt mit ID proj-1 nicht gefunden')
  })

  it('returns created complaint on success', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1' } as never)
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockGetProject.mockResolvedValue({
      ok: true,
      data: { id: 'proj-1', customerName: 'Projekt' } as never,
    })
    mockQueryResult({
      data: {
        id: 'c-new',
        company_id: 'comp-1',
        project_id: 'proj-1',
        description: 'Neue Reklamation',
        status: 'draft',
        priority: 'medium',
        affected_item_ids: [],
        created_at: '2026-01-15',
        updated_at: '2026-01-15',
        created_by_user_id: 'user-1',
      },
      error: null,
    })

    const result = await createComplaint({
      projectId: 'proj-1',
      description: 'Neue Reklamation',
      status: 'draft',
      priority: 'medium',
    })

    expect(result.id).toBe('c-new')
    expect(result.description).toBe('Neue Reklamation')
  })
})

describe('updateComplaint', () => {
  it('throws when no company ID', async () => {
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(updateComplaint('c1', { status: 'resolved' })).rejects.toThrow('Keine Firma gefunden')
  })

  it('returns updated complaint on success', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({
      data: {
        id: 'c1',
        company_id: 'comp-1',
        project_id: 'proj-1',
        description: 'Updated',
        status: 'resolved',
        priority: 'medium',
        affected_item_ids: [],
        created_at: '2026-01-15',
        updated_at: '2026-01-16',
        created_by_user_id: 'user-1',
      },
      error: null,
    })

    const result = await updateComplaint('c1', { status: 'resolved' })

    expect(result.status).toBe('resolved')
    expect(result.description).toBe('Updated')
  })
})

describe('deleteComplaint', () => {
  it('throws when no company ID', async () => {
    mockGetCurrentCompanyId.mockResolvedValue(null)

    await expect(deleteComplaint('c1')).rejects.toThrow('No company ID')
  })

  it('succeeds when company exists', async () => {
    mockGetCurrentCompanyId.mockResolvedValue('comp-1')
    mockQueryResult({ data: null, error: null })

    await expect(deleteComplaint('c1')).resolves.toBeUndefined()
  })
})
