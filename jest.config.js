module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest-setup.reanimated.js',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.tsx',
    // App-shell layouts only compose providers and routes; their behaviour is
    // covered transitively by the screen tests. Excluded from coverage so the
    // global threshold reflects logic, not boilerplate.
    '!src/app/_layout.tsx',
    '!src/app/**/_layout.tsx',
    '!src/app/**/index.tsx',
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
    './src/features/*/domain/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/.expo/'],
  // transformIgnorePatterns intentionally omitted — jest-expo's preset already
  // sets a pattern that correctly transforms expo-modules-core and other expo-*
  // packages required by Expo SDK 54+. Overriding it here previously dropped
  // expo-modules-core, breaking every test. See PR description for details.
};
