/**
 * Central Supabase client mock for service tests.
 *
 * Provides a chainable query builder that mirrors the Supabase PostgREST API:
 *   supabase.from('table').select().eq('id', x).single()
 *
 * Usage in tests:
 *   1. jest.mock('@/lib/supabase/client', () => require('./__mocks__/supabase'))
 *   2. Import `mockSupabase` and `mockQueryResult` to control responses.
 */

// ─── Chainable query builder ─────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown; count?: number | null }

/** Stores the result that terminal methods will resolve with. */
let _nextResult: QueryResult = { data: null, error: null }

/** Stores any queued results (per-from-call) for multi-call tests. */
const _resultQueue: QueryResult[] = []

/**
 * Sets the result for the *next* terminal query call (.single(), awaited select, etc.).
 * Call this in your test **before** invoking the service function.
 */
export function mockQueryResult(result: Partial<QueryResult>): void {
  const full: QueryResult = { data: null, error: null, ...result }
  _resultQueue.push(full)
  _nextResult = full
}

/** Resets the mock state between tests. */
export function resetMock(): void {
  _nextResult = { data: null, error: null }
  _resultQueue.length = 0
  _getUserResult = { data: { user: null }, error: null }
  _rpcResult = { data: null, error: null }
  _resetPasswordResult = { data: null, error: null }
  _updateUserResult = { data: null, error: null }
  _signUpResult = { data: null, error: null }
  _signInResult = { data: null, error: null }
  _signOutResult = { error: null }
}

function dequeueResult(): QueryResult {
  if (_resultQueue.length > 0) {
    return _resultQueue.shift()!
  }
  return _nextResult
}

/** Creates a builder that chains all PostgREST-style methods and resolves with the queued result. */
function createQueryBuilder(): Record<string, unknown> {
  const builder: Record<string, (...args: unknown[]) => unknown> = {}

  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'lt', 'lte', 'gt', 'gte',
    'like', 'ilike', 'is', 'in', 'or', 'not',
    'order', 'limit', 'range', 'filter',
  ]

  for (const method of chainMethods) {
    builder[method] = jest.fn().mockImplementation(() => builder)
  }

  // Terminal methods that resolve the query
  builder.single = jest.fn().mockImplementation(() => {
    const result = dequeueResult()
    return Promise.resolve(result)
  })

  builder.maybeSingle = jest.fn().mockImplementation(() => {
    const result = dequeueResult()
    return Promise.resolve(result)
  })

  // Make the builder itself thenable so `await query` works without .single()
  builder.then = jest.fn().mockImplementation(
    (resolve: (value: QueryResult) => void) => {
      const result = dequeueResult()
      return Promise.resolve(result).then(resolve)
    },
  )

  return builder
}

// ─── Auth mock ──────────────────────────────────────────────────────────

let _getUserResult: { data: { user: unknown }; error: unknown } = {
  data: { user: null },
  error: null,
}

/** Sets the result for `supabase.auth.getUser()`. */
export function mockGetUser(user: Record<string, unknown> | null, error: unknown = null): void {
  _getUserResult = { data: { user }, error }
}

// ─── Auth: resetPasswordForEmail, updateUser, signUp, signIn, signOut ─────

let _resetPasswordResult: { data: unknown; error: unknown } = { data: null, error: null }
let _updateUserResult: { data: unknown; error: unknown } = { data: null, error: null }
let _signUpResult: { data: unknown; error: unknown } = { data: null, error: null }
let _signInResult: { data: { session?: unknown; user?: unknown }; error: unknown } = {
  data: { session: null, user: null },
  error: null,
}
let _signOutResult: { error: unknown } = { error: null }

export function mockResetPasswordForEmail(result: Partial<{ data: unknown; error: unknown }>): void {
  _resetPasswordResult = { data: null, error: null, ...result }
}

export function mockUpdateUser(result: Partial<{ data: unknown; error: unknown }>): void {
  _updateUserResult = { data: null, error: null, ...result }
}

export function mockSignUpResult(result: Partial<{ data: unknown; error: unknown }>): void {
  _signUpResult = { data: null, error: null, ...result }
}

export function mockSignInResult(result: Partial<{ data: { session?: unknown; user?: unknown }; error: unknown }>): void {
  _signInResult = { data: { session: null, user: null }, error: null, ...result }
}

export function mockSignOutResult(error: unknown = null): void {
  _signOutResult = { error }
}

// ─── RPC mock ────────────────────────────────────────────────────────────

let _rpcResult: { data: unknown; error: unknown } = { data: null, error: null }

/** Sets the result for `supabase.rpc(name)`. */
export function mockRpcResult(result: Partial<{ data: unknown; error: unknown }>): void {
  _rpcResult = { data: null, error: null, ...result }
}

// ─── Supabase client ────────────────────────────────────────────────────

export const supabase = {
  from: jest.fn().mockImplementation(() => createQueryBuilder()),
  rpc: jest.fn().mockImplementation(() => Promise.resolve(_rpcResult)),
  auth: {
    getUser: jest.fn().mockImplementation(() => Promise.resolve(_getUserResult)),
    signUp: jest.fn().mockImplementation(() => Promise.resolve(_signUpResult)),
    signInWithPassword: jest.fn().mockImplementation(() => Promise.resolve(_signInResult)),
    signOut: jest.fn().mockImplementation(() => Promise.resolve(_signOutResult)),
    resetPasswordForEmail: jest.fn().mockImplementation(() => Promise.resolve(_resetPasswordResult)),
    updateUser: jest.fn().mockImplementation(() => Promise.resolve(_updateUserResult)),
  },
}
