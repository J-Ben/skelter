import type { Config } from 'jest';

/**
 * Jest configuration for Skelter.
 *
 * - Uses ts-jest to run TypeScript tests directly
 * - Mocks React Native to avoid native module errors in Node
 * - Maps 'skelter' imports to the mock for clean component testing
 * - Coverage threshold set to 70% — realistic for v0.1
 */
const config: Config = {
  preset: 'ts-jest',

  /**
   * Node environment — no DOM needed for unit tests.
   * Use 'jsdom' for web adapter tests if needed.
   */
  testEnvironment: 'node',

  /**
   * Module name mappings :
   * - react-native → minimal mock to avoid native module errors
   * - skelter → mock that disables all skeleton behavior in tests
   */
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^skelter$': '<rootDir>/src/__mocks__/index.ts',
  },

  /**
   * TypeScript transform via ts-jest.
   * Uses the project tsconfig.json.
   */
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  /**
   * Test file pattern — all .test.ts and .test.tsx files
   * inside __tests__ directories.
   */
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],

  /**
   * Coverage configuration.
   * Run with: npm run test:coverage
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/__mocks__/**',
    '!src/**/*.d.ts',
    '!node_modules/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;