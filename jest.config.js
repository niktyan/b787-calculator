module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.tsx',
    // src/app/** holds Phase B expo-router placeholders that Sprint 3
    // (splash + disclaimer) replaces with the real navigation tree and tests.
    // Including them now reports 0% on code that is about to be deleted.
    // Re-include this path in Sprint 3 when proper screens land.
    '!src/app/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/core/**': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // ./src/features/*/domain/** with 90% threshold will be added in Sprint 5 (Crosswind).
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/.expo/'],
  // transformIgnorePatterns intentionally omitted — jest-expo's preset already
  // sets a pattern that correctly transforms expo-modules-core and other expo-*
  // packages required by Expo SDK 54+. Overriding it here previously dropped
  // expo-modules-core, breaking every test. See PR description for details.
};
