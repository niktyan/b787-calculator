const expoConfig = require('eslint-config-expo/flat');
const tseslintPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactNativePlugin = require('eslint-plugin-react-native');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const importPlugin = require('eslint-plugin-import');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  importPlugin.flatConfigs.recommended,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'react-native': reactNativePlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      ...tseslintPlugin.configs['recommended-type-checked'].rules,

      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-color-literals': 'error',
      'react-native/no-raw-text': ['error', { skip: ['Trans', 'MonoText'] }],
      'react-native/split-platform-components': 'error',
      'react-native/no-single-element-style-arrays': 'error',
      'react-native/sort-styles': 'error',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',

      complexity: ['error', { max: 10 }],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],

      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      'jsx-a11y/no-autofocus': 'error',

      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-default-export': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/features/*/presentation',
              from: './src/features/*/data',
              message: 'Presentation must not import from data directly. Go through domain.',
            },
            {
              target: './src/features/*/domain',
              from: './node_modules/react-native',
              message: 'Domain layer must be pure TypeScript without React Native dependencies.',
            },
            {
              target: './src/features/*/domain',
              from: './node_modules/expo',
              message: 'Domain layer must be pure TypeScript without Expo dependencies.',
            },
          ],
        },
      ],

      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1, 2, 100],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
    },
  },

  {
    files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // jest.requireActual and the React test renderer's toJSON() are typed as
      // `any`; the unsafe-* rules flag every snapshot assertion. Test files are
      // not production paths, so we relax the type-soundness checks here.
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  {
    // Design-system components compose theme-aware styles inside `useMemo`
    // (palette comes from `useTheme()` at runtime). The static-analysis rule
    // `react-native/no-unused-styles` cannot trace style usage through that
    // closure and produces false positives on every component. The other style
    // rules (no-inline-styles, no-color-literals, sort-styles) still apply.
    files: ['src/design-system/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'react-native/no-unused-styles': 'off',
    },
  },

  {
    files: [
      '*.config.js',
      '*.config.ts',
      'babel.config.js',
      'metro.config.js',
      'eslint.config.js',
      'jest.config.js',
      'jest-setup*.js',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  prettierConfig,

  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      '_expo_init/*',
      'assets/**',
      'coverage/**',
      '02_Specification/**',
      '03_Mockups/**',
    ],
  },
];
