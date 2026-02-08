import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  clearMocks: true,
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!lib/pdf/**',
    '!lib/ai/**',
    '!lib/email-templates/**',
    '!lib/auth/**',
    '!app/**',
    '!lib/supabase/client.ts',
    '!lib/supabase/server.ts',
    '!lib/supabase/admin.ts',
    '!lib/supabase/portal-client.ts',
    '!lib/supabase/services/auth.ts',
    '!lib/supabase/services/audit.ts',
    '!lib/supabase/services/email.ts',
    '!lib/supabase/services/chat.ts',
    '!lib/supabase/services/portalDocuments.ts',
    '!lib/supabase/services/bankTransactions.ts',
    '!lib/supabase/services/supplierInvoices.ts',
    '!lib/supabase/services.ts',
    '!lib/supabase/services/index.ts',
    '!lib/supabase/services/projects.ts',
    '!lib/supabase/services/delivery.ts',
    '!lib/utils/logger.ts',
    '!lib/utils/auditLogger.ts',
    '!lib/utils/performance.ts',
    '!lib/utils/index.ts',
    '!lib/constants/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 62,
      functions: 80,
      lines: 80,
    },
  },
}

export default createJestConfig(config)
