/**
 * Unit tests for auth service.
 */

import {
  mockGetUser,
  mockQueryResult,
  mockSignInResult,
  mockSignOutResult,
  mockResetPasswordForEmail,
  mockUpdateUser,
  resetMock,
} from './__mocks__/supabase'

jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
jest.mock('@/lib/supabase/services/company', () => ({
  getCompanySettings: jest.fn(),
  getEmployees: jest.fn(),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import {
  getCurrentUser,
  getCurrentUserProfile,
  signIn,
  signOut,
  resetPasswordForEmail,
  updatePassword,
} from '@/lib/supabase/services/auth'

beforeEach(() => {
  resetMock()
})

describe('auth service', () => {
  describe('getCurrentUser', () => {
    it('returns null when no user', async () => {
      mockGetUser(null)
      const result = await getCurrentUser()
      expect(result).toBeNull()
    })

    it('returns user when authenticated', async () => {
      const user = { id: 'user-1', email: 'u@test.com' }
      mockGetUser(user)
      const result = await getCurrentUser()
      expect(result).toEqual(user)
    })

    it('returns null when auth.getUser returns error', async () => {
      mockGetUser(null, new Error('Session expired'))
      const result = await getCurrentUser()
      expect(result).toBeNull()
    })
  })

  describe('getCurrentUserProfile', () => {
    it('returns null when no user', async () => {
      mockGetUser(null)
      const result = await getCurrentUserProfile()
      expect(result).toBeNull()
    })

    it('returns profile when user and profile exist', async () => {
      const user = { id: 'user-1', email: 'u@test.com' }
      mockGetUser(user)
      const profile = { id: 'user-1', full_name: 'Test', email: 'u@test.com', role: 'verkaeufer' }
      mockQueryResult({ data: profile, error: null })
      const result = await getCurrentUserProfile()
      expect(result).toEqual(profile)
    })

    it('returns null on profile load error (non-PGRST116)', async () => {
      const user = { id: 'user-1', email: 'u@test.com' }
      mockGetUser(user)
      mockQueryResult({ data: null, error: { code: 'OTHER', message: 'DB error' } })
      const result = await getCurrentUserProfile()
      expect(result).toBeNull()
    })

    it('creates profile when not found (PGRST116) and returns new profile', async () => {
      const user = {
        id: 'user-1',
        email: 'u@test.com',
        user_metadata: { full_name: 'Test User' },
      }
      mockGetUser(user)
      mockQueryResult({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      const newProfile = { id: 'user-1', full_name: 'Test User', email: 'u@test.com', role: 'verkaeufer' }
      mockQueryResult({ data: newProfile, error: null })
      const result = await getCurrentUserProfile()
      expect(result).toEqual(newProfile)
    })
  })

  describe('signIn', () => {
    it('returns session data on success', async () => {
      const sessionData = {
        session: { user: { id: 'u1' }, expires_at: 1234567890 },
        user: { id: 'u1' },
      }
      mockSignInResult({ data: sessionData, error: null })
      const result = await signIn('u@test.com', 'secret')
      expect(result).toEqual(sessionData)
    })

    it('throws on auth error', async () => {
      const err = new Error('Invalid credentials')
      mockSignInResult({ data: { session: null, user: null }, error: err })
      await expect(signIn('u@test.com', 'wrong')).rejects.toThrow('Invalid credentials')
    })

    it('throws when no session returned', async () => {
      mockSignInResult({ data: { session: null, user: null }, error: null })
      await expect(signIn('u@test.com', 'secret')).rejects.toThrow('Keine Session erstellt')
    })
  })

  describe('signOut', () => {
    it('succeeds when no error', async () => {
      mockSignOutResult(null)
      await expect(signOut()).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      mockSignOutResult(new Error('Network error'))
      await expect(signOut()).rejects.toThrow('Network error')
    })
  })

  describe('resetPasswordForEmail', () => {
    it('succeeds when no error', async () => {
      mockResetPasswordForEmail({ data: {}, error: null })
      await expect(resetPasswordForEmail('u@test.com')).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      mockResetPasswordForEmail({ error: new Error('Rate limited') })
      await expect(resetPasswordForEmail('u@test.com')).rejects.toThrow('Rate limited')
    })
  })

  describe('updatePassword', () => {
    it('succeeds when no error', async () => {
      mockUpdateUser({ data: {}, error: null })
      await expect(updatePassword('newSecret')).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      mockUpdateUser({ error: new Error('Weak password') })
      await expect(updatePassword('123')).rejects.toThrow('Weak password')
    })
  })
})
