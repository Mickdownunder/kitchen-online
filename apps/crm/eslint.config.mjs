import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const coreWebVitals = require('eslint-config-next/core-web-vitals')
const typescript = require('eslint-config-next/typescript')

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: ['coverage/**'],
  },
  ...coreWebVitals,
  ...typescript,

  // ──────────────────────────────────────────
  // Global rules for all TS/TSX files
  // ──────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn'] }],
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // ──────────────────────────────────────────
  // Stricter rules for lib/ and hooks/
  // ──────────────────────────────────────────
  {
    files: ['lib/**/*.ts', 'hooks/**/*.ts', 'hooks/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
    },
  },

  {
    files: ['lib/utils/logger.ts'],
    rules: {
      'no-console': ['warn', { allow: ['debug', 'info', 'warn', 'error'] }],
    },
  },

  // Tests rely on module reloading patterns where require() is intentional.
  {
    files: ['__tests__/**/*.ts', '__tests__/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

export default eslintConfig
