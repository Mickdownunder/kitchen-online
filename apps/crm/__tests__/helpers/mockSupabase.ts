/**
 * Re-exports Supabase mock helpers for use in api/ and services/ tests.
 * Call setupSupabaseMocks() in beforeEach to reset mock state.
 */

import {
  mockQueryResult,
  mockGetUser,
  mockRpcResult,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockSignInResult,
  mockSignOutResult,
  mockSignUpResult,
  resetMock,
} from '../services/__mocks__/supabase'

export {
  mockQueryResult,
  mockGetUser,
  mockRpcResult,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockSignInResult,
  mockSignOutResult,
  mockSignUpResult,
  resetMock,
}

/** Resets all Supabase mock state. Use in beforeEach. */
export function setupSupabaseMocks(): void {
  resetMock()
}
