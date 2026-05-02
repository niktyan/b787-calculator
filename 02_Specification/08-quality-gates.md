# 08 · Quality Gates

## Назначение документа

Этот документ задаёт **автоматические рамки качества кода**, через которые любой PR обязан пройти перед merge. Гейты реализуются конкретными конфигами TypeScript, ESLint, Prettier, Jest, GitHub Actions, Husky и lint-staged. Любой PR, который красит хотя бы один gate, — заблокирован для merge.

Документ важен особенно потому, что разработчик не делает построчный code review. Quality gates — **компилятор и линтер становятся «второй парой глаз»** и не позволяют агенту-реализатору внести низкокачественный код незаметно.

Все конфиги в этом документе — **финальные и готовые к копированию** в соответствующие файлы репозитория.

---

## TypeScript конфигурация (`tsconfig.json`)

**Цель:** максимально строгая типизация. TypeScript-компилятор отказывается собирать любой код с малейшей неопределённостью.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@design/*": ["src/design-system/*"],
      "@features/*": ["src/features/*"]
    }
  },
  "include": ["src/**/*", "*.ts", "*.tsx", "*.config.ts", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "babel.config.js"]
}
```

**Критические настройки и что они дают:**

- `strict: true` — включает весь набор strict-флагов TypeScript.
- `noUncheckedIndexedAccess` — обращение к массиву `arr[i]` возвращает `T | undefined`, заставляя обрабатывать случай отсутствия элемента. Закрывает класс багов «обращение к несуществующему индексу».
- `exactOptionalPropertyTypes` — `{ x?: string }` не позволяет передавать `{ x: undefined }`. Принуждает к явности.
- `noUnusedLocals/Parameters` — запрещает неиспользуемые переменные. Чище код.
- `noFallthroughCasesInSwitch` — в `switch` обязателен `break`/`return`/`throw` — нельзя случайно «провалиться» на следующий case.
- `noPropertyAccessFromIndexSignature` — нельзя обращаться через точку к свойствам с неопределённым ключом, только через `[key]`. Делает явным, где работа идёт с динамическими ключами.
- **`skipLibCheck: true` — необходимое исключение.** Без него TypeScript падает на конфликте типов между `react-native/src/types/globals.d.ts` (RN-овые `Blob`, `Request`, `WebSocket`, `URL` и т.д.) и `typescript/lib/lib.dom.d.ts` (DOM-овые версии тех же глобалов). Конфликт находится **только** в чужих node_modules — не в нашем коде. Флаг подавляет проверку только third-party `.d.ts` файлов; **наш собственный код по-прежнему полностью type-checked**.

---

## ESLint конфигурация (`eslint.config.js`)

**Цель:** автоматическая проверка стилевых, архитектурных и accessibility-правил.

**Формат конфига:** **flat config** (`eslint.config.js` экспортирует array конфиг-объектов), **не** legacy `.eslintrc.js`. Это требование `eslint-config-expo@10` (для Expo SDK 54+) и ESLint 9+, которые legacy-формат больше не поддерживают. Решение задокументировано в **ADR-0005 · Flat ESLint config (Expo SDK 54+)**.

Структура реального файла (детали см. в `eslint.config.js` в корне репозитория):

```javascript
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
  // ... TypeScript files block with parser, plugins, rules:
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
    // ===== TypeScript =====
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',

    // ===== Complexity =====
    'complexity': ['error', { max: 10 }],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-params': ['error', 4],

    // ===== React / RN =====
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react-native/no-unused-styles': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
    'react-native/no-raw-text': ['error', { skip: ['Trans'] }],

    // ===== Accessibility =====
    'jsx-a11y/no-autofocus': 'error',

    // ===== Imports / Architecture =====
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-default-export': 'off',  // expo-router требует default exports
    'import/no-restricted-paths': ['error', {
      // MVP-simplified zones. eslint-plugin-import не поддерживает glob-синтаксис
      // `!(index.ts)` (negation pattern) и не имеет `<self>` placeholder в `except`.
      // Поэтому правило «feature НЕ импортирует другой feature»
      // (с разрешением self-imports) сейчас не реализуется через no-restricted-paths.
      // Будет реализовано при появлении 2-го feature (Phase 2 / Crosswind Takeoff)
      // через миграцию на `eslint-plugin-boundaries` или `dependency-cruiser`.
      zones: [
        // presentation НЕ может импортировать data напрямую — только через domain
        {
          target: './src/features/*/presentation',
          from: './src/features/*/data',
          message: 'Presentation must not import from data directly. Go through domain.',
        },
        // domain не должен импортировать React Native или Expo
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
    }],

    // ===== General =====
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-magic-numbers': ['error', {
      ignore: [0, 1, -1, 2, 100],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      enforceConst: true,
    }],
  },
  overrides: [
    {
      // Test файлы — менее строгие правила
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'no-magic-numbers': 'off',
        'max-lines-per-function': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // Конфиг-файлы
      files: ['*.config.js', '*.config.ts', 'babel.config.js', 'metro.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
```

**Что эти правила гарантируют:**

- **`no-explicit-any: error`** — нельзя писать `: any` без явного `// eslint-disable-next-line` с обоснованием в комментарии.
- **`complexity: 10`** — функция со сложностью > 10 (по cyclomatic complexity) блокирует merge → агент вынужден разбить её.
- **`max-lines-per-function: 80`** — длинные функции запрещены.
- **`max-lines: 300`** — длинные файлы запрещены, что подталкивает к разбиению.
- **`no-restricted-paths`** — архитектурные границы (см. 02-architecture.md) обеспечиваются автоматически.
- **`react-native/no-inline-styles`** — все стили через `StyleSheet`, никаких `style={{ color: 'red' }}` inline.
- **`react-native/no-color-literals`** — цвета только через design-system tokens, никаких hex-литералов в JSX.
- **`react-native/no-raw-text`** — текст только через локализованные компоненты, никакого `<Text>Hello</Text>` в JSX (заставляет идти через `<Trans>` или `t()`).
- **`no-floating-promises`** — все промисы должны быть либо `await`-нуты, либо явно `void`-нуты. Запрещает «забытые» промисы.
- **`strict-boolean-expressions`** — нельзя использовать non-boolean в условиях (`if (str)` запрещено, нужно `if (str.length > 0)` или `if (str !== '')`).
- **`no-magic-numbers`** — числа вне `[0, 1, -1, 2, 100]` должны быть именованными константами.

---

## Prettier конфигурация (`.prettierrc.js`)

```javascript
module.exports = {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
};
```

Prettier работает в связке с ESLint через `eslint-config-prettier` (отключает конфликтующие ESLint-правила) и lint-staged (auto-format на pre-commit).

---

## Test coverage thresholds

**Финальная конфигурация** (как должно быть к концу Phase C, после Sprint 1 + Sprint 5):

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/features/*/domain/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/core/**': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/.expo/'],
  // transformIgnorePatterns intentionally omitted — jest-expo preset
  // ships the correct default for Expo SDK 54+ (covers
  // expo-modules-core, expo-modules-autolinking, all @expo/*, etc).
  // Overriding here historically led to broken tests because the
  // pattern in old spec drafts didn't include expo-modules-core.
};
```

**Coverage gates:**
- **Domain-слой каждого feature-модуля:** ≥ 90% по всем 4 метрикам (branches, functions, lines, statements). Это критическая бизнес-логика.
- **Core-модуль:** ≥ 80%. Утилитарный код, важен но менее критичен.
- **Глобально:** ≥ 70%. Включая presentation-слой, где snapshot-тестов может быть недостаточно для 90%.

CI блокирует merge при недостаточном coverage. Агент-реализатор инструктирован проверять coverage перед claim-ом «task done».

**Что НЕ включается в coverage:**
- Файлы декларации типов (`*.d.ts`).
- Barrel-файлы (`index.ts`) — они не содержат логики, только re-export.
- Storybook-файлы (если будут в Phase 2+).

### Coverage threshold evolution strategy

`coverageThreshold` в `jest.config.js` добавляется **инкрементально** по мере того как соответствующие пути наполняются файлами. Причина: Jest падает с `Coverage data for X was not found` (exit 1), если threshold-путь не матчит ни одного файла. Per-path thresholds защищают код, который существует — они не могут enforce-ить пустые пути.

**Phase B (текущая на момент initial setup):** только global threshold 70% по всем 4 метрикам. Per-path блоки **не** добавлены, потому что `src/core/` и `src/features/*/domain/` ещё пусты (только `ARCHITECTURE_PLACEHOLDER.md`).

**Sprint 1 (Core module):** добавить `'./src/core/**': { branches: 80, functions: 80, lines: 80, statements: 80 }` в `coverageThreshold`. Update `jest.config.js` как часть `feat(core)` PR.

**Sprint 5 (Crosswind):** добавить `'./src/features/*/domain/**': { 90, 90, 90, 90 }`. Update `jest.config.js` как часть `feat(crosswind)` PR.

Это правило фиксируется в спринт-промптах (`prompts/01-sprint-core.md`, `prompts/05-sprint-crosswind.md`) — агент при имплементации соответствующего модуля **обязан** обновить `jest.config.js`.

**Историческая справка по `setupFilesAfterEnv`:** ранее в этом разделе было `setupFilesAfterEach`. Это была опечатка — настоящая опция Jest 29 называется **`setupFilesAfterEnv`** (от «after Jest test framework env initialization»). Опция `setupFilesAfterEach` Jest-ом не распознаётся. Исправлено в Phase B docs sync.

### Phase B coverage exclusion (temporary)

During Phase B + Sprint 1, `src/app/**` is excluded from `collectCoverageFrom` because it contains placeholder route files that have no real logic. These will be replaced by Sprint 3 (Splash + Disclaimer) with meaningful screens.

Sprint 3 PR MUST:

- Remove the `'!src/app/**'` (or equivalent) exclusion from `jest.config.js`.
- Verify coverage of new screen code (snapshot tests count).
- Update this section of the spec to reflect the new state.

---

## Performance budget

| Метрика | Бюджет | Как измеряется |
|---------|--------|----------------|
| Cold start (от тапа на иконку до отображения Splash) | ≤ 1500 ms | Manual measurement на iPad 9-го gen baseline |
| Splash → Main Menu (после первого запуска, без disclaimer) | ≤ 800 ms | Manual + автоматическая отметка в logger |
| Crosswind calculation (от изменения input до обновлённого result) | ≤ 50 ms | Performance API в development build |
| JSON parse + zod validation (один раз на запуск) | ≤ 100 ms | Performance API |
| Bundle size (App Store .ipa) | ≤ 30 MB | App Store Connect → App Information → File Size |
| Memory footprint в idle | ≤ 100 MB | Xcode Instruments (через TestFlight build) |

**Что делать при превышении бюджета:**
- Cold start > 1500 ms → переоценить, что грузится в `app/_layout.tsx`. Lazy-load feature-модулей.
- Bundle size > 30 MB → проверить, не подтянулись ли тяжёлые зависимости. `npx expo-doctor` плюс `npm run analyze-bundle`.
- Memory > 100 MB → искать утечки в `useEffect` и event listeners (часто RN-специфика).

Бюджеты не блокируют CI напрямую, но проверяются на acceptance-testing перед App Store submission.

---

## Accessibility checklist

Каждый PR с UI-изменениями проходит accessibility checklist. Для одиночных компонентов автоматизировано через `eslint-plugin-jsx-a11y`. Для экранов целиком — manual checklist:

- [ ] Все интерактивные элементы имеют `accessibilityLabel` или явный текст.
- [ ] Иконки без текста сопровождаются `accessibilityLabel`.
- [ ] Все Pressable-компоненты имеют `accessibilityRole`.
- [ ] Все touch-targets ≥ 44×44 pt (проверяется визуально на iOS Simulator с Accessibility Inspector).
- [ ] Контраст текста на фоне ≥ 4.5:1 для основного текста (WCAG AA).
- [ ] Контраст крупного текста ≥ 3:1 (WCAG AA Large).
- [ ] Цвет — никогда единственный сигнал. Все warnings/errors дублируются иконкой и текстом.
- [ ] Поддержка Dynamic Type для текстовых элементов (исключения: фиксированный размер крупного результата расчёта).
- [ ] Поддержка Reduce Motion — все анимации имеют instant-вариант.
- [ ] VoiceOver-навигация по экрану логична (тестируется на физическом iPad с включённым VoiceOver).

Финальный accessibility audit проводится в Phase D перед App Store submission.

---

## Architecture lint (явное обеспечение)

Архитектурные правила из `02-architecture.md` обеспечиваются `eslint-plugin-import` и кастомными правилами:

- **Presentation → Data напрямую запрещён.** Через `no-restricted-paths`.
- **Domain не зависит от React Native / Expo.** Через `no-restricted-paths` запрещены импорты из `react-native` и `expo*` в файлах `src/features/*/domain/*`.
- **Cycle detection.** `import/no-cycle: error` ловит циклические зависимости.
- **Self import.** `import/no-self-import: error`.

**Feature → Feature импорт — DEFERRED.** Спека требует это правило, но `eslint-plugin-import@no-restricted-paths` не поддерживает glob `!(...)` (negation pattern) и `<self>` placeholder в `except`. С одним feature-модулем (Crosswind) в MVP правило де-факто dormant — нет других features для нарушения. **Будет реализовано** при появлении 2-го feature (Phase 2 / Crosswind Takeoff) через миграцию на `eslint-plugin-boundaries` или `dependency-cruiser`. До этого момента — code review человеком как safety-net.

Если PR пытается нарушить любое из реализованных правил — ESLint падает на CI, merge заблокирован.

---

## Additional config files (Windows + cleanliness)

Эти файлы не упомянуты в основных секциях выше, но являются обязательной частью проекта:

- **`.gitattributes`** — форсит LF line endings для shell-скриптов, husky-хуков и `release.sh`. Без этого Windows автоматически конвертирует LF → CRLF при checkout, что ломает husky-хуки (sh не парсит CRLF) и `release.sh` (bash на Linux не запускается с CRLF). Конкретные паттерны: `*.sh text eol=lf`, `*.bash text eol=lf`, `.husky/* text eol=lf`.

- **`.prettierignore`** — explicit ignore list. Prettier 3 не имеет автоматического gitignore-наследования — без `.prettierignore` форматирует `node_modules/`, `02_Specification/`, build-артефакты. Содержит как минимум: `node_modules`, `.expo`, `dist`, `coverage`, `02_Specification`, `03_Mockups`, `package-lock.json`, `android`, `ios`.

- **`.vscode/{settings.json,extensions.json}`** — оставлены из дефолтного `create-expo-app` шаблона. Содержат рекомендованные расширения и settings для VS Code/Cursor. Полезны для onboarding новых контрибьюторов и для восстановления окружения; не содержат личных предпочтений.

- **`.npmrc`** — см. `03-tech-stack.md` секция «.npmrc settings» (legacy-peer-deps + save-exact).

---

## Pre-commit hooks (Husky + lint-staged)

Чтобы агент-реализатор не коммитил незаконченный или некорректный код, на pre-commit запускаются проверки.

`.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

`package.json` секция:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

Это запускает ESLint (с автоисправлением где возможно) и Prettier на изменённых файлах. Если ESLint находит ошибки, которые не может автоисправить, или агент сам не починил — коммит отклоняется.

`.husky/pre-push`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npm run typecheck && npm run test -- --bail --passWithNoTests
```

На pre-push запускается полная проверка типов и все тесты с `--bail` (остановка на первом падении). Если что-то падает — push отклоняется. Это ловит проблемы до того, как они попадут на CI.

**Note:** ранее в этом разделе был флаг `--findRelatedTests`. Он был удалён, потому что Jest требует список путей файлов после этого флага, а Husky pre-push hook этих путей не передаёт — без них Jest падает с `--findRelatedTests option requires file paths to be specified`. Запуск всех тестов с `--bail` даёт тот же эффект «быстро упасть на сломанном тесте» без необходимости в file path discovery.

---

## CI gates (что блокирует merge)

GitHub Actions workflow в `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Lint
        run: npm run lint -- --max-warnings=0
      - name: Type check
        run: npm run typecheck
      # `--passWithNoTests` — required during Phase B before tests exist (Jest exits 0 with no
      # test files). Will be REMOVED after Sprint 1 introduces first tests; revisit in Sprint 1 PR.
      - name: Test
        run: npm test -- --coverage --watchAll=false --passWithNoTests
      - name: Expo doctor (advisory, non-blocking)
        run: npx expo-doctor || true
  build-preview:
    runs-on: ubuntu-latest
    needs: quality
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      # EAS CLI must be installed globally on the runner. `npx eas` fails because
      # eas-cli is not in package.json deps and npx can't resolve it on-the-fly
      # in the GitHub Actions environment.
      - name: Install EAS CLI
        run: npm install -g eas-cli@latest
      - name: EAS Build (preview)
        run: eas build --profile preview --platform ios --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**Branch protection правила в GitHub:**
- main защищена от прямых push.
- PR требует:
  - 1 approval (вы как owner).
  - Проход всех CI checks: `quality`, `build-preview`.
  - Up-to-date с main.

Это означает: если хотя бы один gate красный — PR не merge-ится. Никаких «обхожу для срочности».

---

## Anti-patterns кода (явный запрет, ловится CI)

Эти паттерны автоматически отлавливаются ESLint-конфигом или TypeScript-компилятором:

- `any` без явного `// eslint-disable-next-line @typescript-eslint/no-explicit-any` с обоснованием.
- Inline-стили в JSX (`style={{ ... }}`).
- Хардкоженные цвета (hex/rgb literals в JSX или StyleSheet).
- Сырой `<Text>Hello</Text>` без локализации (через `<Trans>` или `t()`).
- `console.log` в production-сборке (`console.warn`/`console.error` — разрешены).
- Циклические зависимости.
- Cross-feature импорты.
- Direct presentation → data импорт.
- React Native / Expo импорты в Domain-слое.
- Функции > 80 строк или > 10 cyclomatic complexity.
- Файлы > 300 строк.
- `==` (нужно `===`).
- Floating promises.
- Magic numbers вне `[0, 1, -1, 2, 100]`.

---

## Convention: test-only exports

Some modules need to expose internal helpers for unit testing (e.g., resetting a singleton cache, exposing a pure parser used internally). These are exported with a leading underscore:

- `_resetCacheForTesting()` — reset internal state between tests.
- `_parseFoo()` — exposed pure helper for unit testing.

**Convention rules:**

- Always prefix with underscore `_`.
- Always include a comment explaining why this is exported.
- NEVER use these in production code (even from other modules). They are test-only.
- ESLint rule (future): block imports of `_*` from production code. For now: discipline + code review.

---

## Open questions

1. Стоит ли использовать `dependency-cruiser` в дополнение к `import/no-restricted-paths`? Он мощнее в проверке архитектурных правил, но добавляет ещё один tool. По умолчанию: пока нет, если простых ESLint-правил хватит. **Revisit при добавлении 2-го feature** (см. секцию «Architecture lint» выше — нужно для feature→feature enforcement).

## Closed questions

- ~~Стоит ли добавить `commitlint`?~~ → **Deferred (Phase B):** не добавлен в Phase B по приоритетам; перенесён в TODO список в `09-cicd-and-ops.md` для рассмотрения в Phase 2. Conventional Commits соблюдается дисциплиной агента; при росте контрибьюторов или числа коммитов — возвращаемся.
- ~~Стоит ли использовать `expo-doctor` в CI?~~ → **Resolved (Phase B):** добавлен в `ci.yml` как advisory non-blocking step (`npx expo-doctor || true`). Не блокирует merge, но даёт раннее предупреждение о проблемах совместимости версий. См. `09-cicd-and-ops.md`.

---

## Exit-критерии этого документа

- [ ] Конфиги TypeScript, ESLint, Prettier понятны и одобрены к копированию в репо.
- [ ] Coverage thresholds приняты (Domain ≥ 90%, Core ≥ 80%, общий ≥ 70%).
- [ ] Performance budget реалистичен и не вызывает возражений.
- [ ] Accessibility checklist одобрен.
- [ ] CI gates (что блокирует merge) согласованы.
- [ ] Anti-patterns список не пропустил ничего, что разработчик считает запрещённым.
- [ ] Open questions либо закрыты, либо явно отложены.
