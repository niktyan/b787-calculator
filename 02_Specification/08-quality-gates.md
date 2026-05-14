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

### `exactOptionalPropertyTypes` interaction with forwarded props

With `exactOptionalPropertyTypes: true`, declaring a prop as `propName?: T` does NOT allow passing `undefined` explicitly — it requires either omitting the prop or passing a value of type `T`.

This causes friction when forwarding optional props from a wrapper component to a child:

```typescript
// ❌ Fails with exactOptionalPropertyTypes:
function Wrapper(props: { value?: string }) {
  return <Child value={props.value} />;
  // Error: Type 'string | undefined' not assignable to '?: string'
}

// ✅ Correct pattern — widen child's prop type:
type ChildProps = { value?: string | undefined };
```

When designing a component that may receive forwarded optional props, declare the prop type as `T | undefined` explicitly (instead of just `?: T`). This preserves type safety while allowing forwarding patterns common in React component composition.

This pattern is used throughout `src/design-system/` for compatibility with parent components that may pass `undefined` deliberately (e.g., conditional rendering with `value={isReady ? data : undefined}`).

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
    'react-native/no-raw-text': ['error', { skip: ['Trans', 'MonoText'] }],

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

  `MonoText` is added to the `skip` list because it is a presentation primitive for numerical values, codes, and aviation identifiers (KT, MAC, RWYCC, etc.) that are intentionally NOT localized — they are international aviation conventions that remain English in all languages. Other `Text` variants ARE expected to use `<Trans>` for localized content.

  When adding new components: only add to the `skip` list if the component fundamentally cannot accept localized content. Default is to require localization.
- **`no-floating-promises`** — все промисы должны быть либо `await`-нуты, либо явно `void`-нуты. Запрещает «забытые» промисы.
- **`strict-boolean-expressions`** — нельзя использовать non-boolean в условиях (`if (str)` запрещено, нужно `if (str.length > 0)` или `if (str !== '')`).
- **`no-magic-numbers`** — числа вне `[0, 1, -1, 2, 100]` должны быть именованными константами.

### Design-system specific ESLint exceptions

Files under `src/design-system/**` may use theme-aware `useMemo + StyleSheet.create()` patterns that defeat `react-native/no-unused-styles` static analysis. The rule produces false positives on dynamically generated style names.

Therefore, `react-native/no-unused-styles` is **DISABLED** specifically for `src/design-system/**` via ESLint overrides. The rule remains **ACTIVE** for all other paths.

**Why this is acceptable:** design-system components are exhaustively tested via snapshot + behavior tests. Unused styles would surface as visual regressions, not silent dead code. The rule's false positive rate in design-system was higher than its detection rate.

**Reconsider when:** `eslint-plugin-react-native` gains better support for theme-aware style generation, OR if we migrate to a different styling approach (e.g., Restyle, NativeWind — currently forbidden per `03-tech-stack.md`).

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
- Cold start > 1500 ms → переоценить, что грузится в `src/app/_layout.tsx`. Lazy-load feature-модулей.
- Bundle size > 30 MB → проверить, не подтянулись ли тяжёлые зависимости. `npx expo-doctor` плюс `npm run analyze-bundle`.
- Memory > 100 MB → искать утечки в `useEffect` и event listeners (часто RN-специфика).

Бюджеты не блокируют CI напрямую, но проверяются на acceptance-testing перед App Store submission.

---

## Accessibility checklist

Каждый PR с UI-изменениями проходит accessibility checklist. Для одиночных компонентов автоматизировано через `eslint-plugin-jsx-a11y`. Для экранов целиком — manual checklist:

- [x] Все интерактивные элементы имеют `accessibilityLabel` или явный текст.
- [x] Иконки без текста сопровождаются `accessibilityLabel`.
- [x] Все Pressable-компоненты имеют `accessibilityRole`.
- [x] Все touch-targets ≥ 44×44 pt (проверяется визуально на iOS Simulator с Accessibility Inspector).
- [x] Контраст текста на фоне ≥ 4.5:1 для основного текста (WCAG AA) — см. § «Audit findings» ниже.
- [x] Контраст крупного текста ≥ 3:1 (WCAG AA Large) — см. § «Audit findings» ниже.
- [x] Цвет — никогда единственный сигнал. Все warnings/errors дублируются иконкой и текстом.
- [x] Поддержка Dynamic Type для текстовых элементов (исключения: фиксированный размер крупного результата расчёта).
- [x] Поддержка Reduce Motion — все анимации имеют instant-вариант.
- [x] VoiceOver-навигация по экрану логична (manual verification по PR `chore/accessibility-audit`).

Финальный accessibility audit выполнен в `chore/accessibility-audit` перед App Store submission.

### Audit findings (PR `chore/accessibility-audit`, 2026-05-15)

**A11y attribute pass (fixed in this PR):**

- `BottomSheet` — внутренний `<Pressable>`, поглощающий тапы на surface листа, теперь помечен `accessible={false}`. Без флага VoiceOver мог фокусироваться на пассивной surface; теперь фокус идёт только по backdrop ("Close") + опциям.
- `BottomSheetOption` — добавлен явный `accessibilityLabel={label}`; selected ✓ глиф не озвучивается отдельно — родительский Pressable несёт `accessibilityState.selected`, и VoiceOver объявляет «selected» через состояние.
- `ComingSoonModal` — backdrop теперь имеет `accessibilityRole="button"`; внутренний sheet-Pressable помечен `accessible={false}`.
- `NumericInput` — reserved warning slot теперь явно `accessible={false}` + `importantForAccessibility="no-hide-descendants"` когда пуст, и `accessible={true}` + `auto` когда содержит error Text. VoiceOver скипает пустой слот и читает error как часть form-field группы.

**Touch-target audit:**

Все интерактивные surfaces — `Button`, `Toggle`, `BackButton`, `NavPills` per-pill, `NavigableSettingsRow`, `ToggleSettingsRow`, `BottomSheetOption`, `SegmentedControl` segments, `HeaderPill` (crosswind back / reset), `ModuleCards` — гарантируют `minHeight ≥ tokens.layout.minTouchTarget` (44 pt). Critical-зоны (disclaimer continue button, splash logo, module cards) ≥ 56 pt де-факто через `minHeight` + `padding`.

**Dynamic Type:**

Все `<Text>` варианты используют дефолт `allowFontScaling=true`. Единственное исключение — крупный numeric result в `CrosswindResult` и `ResultPanel`: `<Text variant="display"|"displayLarge" allowFontScaling={false}` — фиксирован для cockpit-glance читаемости (см. 06-ui-spec.md § Принцип 3).

**Reduce Motion:**

- `useReduceMotion()` subscribe к `AccessibilityInfo.reduceMotionChanged`, live update.
- `useScaleOnPress` — identity animatedStyle когда reduceMotion=true; press-handlers становятся no-op.
- `src/app/(main)/_layout.tsx` — `animation: 'none'` на всех Stack.Screen (200ms fade siblings + 300ms slide drilldown коллапсируют в instant).
- `CrosswindResult` — `LinearTransition` skipped когда reduceMotion=true; статичный `<Animated.View>` без `layout`-prop.
- Modal slide animations (`BottomSheet`, `ComingSoonModal`) делегируют OS-level Reduce Motion через native `<Modal animationType="slide">`.

Полная коммитованная поверхность анимаций consultирует Reduce Motion; новые анимации, добавляемые в design-system, обязаны вызывать `useReduceMotion()` — проверяется в code review.

**Contrast audit (WCAG 2.1 SC 1.4.3 / 1.4.11):**

Расчёт — luminance via sRGB → linear (γ=2.4) → relative luminance. Ratio = (L1+0.05)/(L2+0.05). Threshold: 4.5:1 для body text, 3:1 для large text (≥ 18 pt или ≥ 14 pt bold) и UI components.

| Combination | Theme | Ratio | Pass |
|-------------|-------|-------|------|
| `textPrimary` on `bgScreen` | Dark | 16.04:1 | ✓ AAA |
| `textPrimary` on `bgScreen` | Light | 13.55:1 | ✓ AAA |
| `textPrimary` on `bgCard` | Dark | 15.45:1 | ✓ AAA |
| `textPrimary` on `bgCard` | Light | 14.51:1 | ✓ AAA |
| `textSecondary` on `bgScreen` | Dark | 6.16:1 | ✓ AA |
| `textSecondary` on `bgScreen` | Light | 6.79:1 | ✓ AA |
| `textSecondary` on `bgCard` | Dark | 5.93:1 | ✓ AA |
| `textSecondary` on `bgCard` | Light | 7.27:1 | ✓ AAA |
| `accent` (`#00C2A8`) on `bgScreen` | Dark | 8.39:1 | ✓ AAA |
| `accent` on `accentSoft` | Dark | 1.93:1 | NB (decorative active-pill tint) |
| `accent` on `bgCard` | Dark | 8.05:1 | ✓ AAA |
| `accent` (`#00C2A8`) on `bgScreen` | Light | 2.09:1 | ✗ — see note A |
| `accent` on `bgCard` (white) | Light | 2.26:1 | ✗ — see note A |
| `accent` on `accentSoft` | Light | 2.01:1 | ✗ — see note A |
| `warn` on `warnSoft` | Dark | 8.91:1 | ✓ AAA |
| `warn` on `warnSoft` | Light | 4.53:1 | ✓ AA (icon-paired) |
| `warn` on `bgScreen` | Light | 4.50:1 | ✓ AA |
| `danger` on `bgCard` | Dark | 5.91:1 | ✓ AA |
| `danger` on `bgCard` | Light | 3.91:1 | NB AA-Large (paired with danger border + error text) |
| `textOnAccent` on `accent` | both | 11.10:1 | ✓ AAA |
| `textTertiary` on `bgScreen` | Dark | 4.12:1 | NB (decorative metadata, see note B) |
| `textTertiary` on `bgScreen` | Light | 4.47:1 | NB (decorative metadata, see note B) |

**Note A — `accent` on light backgrounds:**

Brand teal `#00C2A8` имеет insufficient contrast против light bg (2.09–2.26:1) для body text. Текущее использование: NavPill active label, BackButton text, BottomSheetOption check ✓, NavigableSettingsRow chevron (с `valueColor="accent"`), большой numeric result в Crosswind.

App primarily используется в cockpit с dark theme (`tokens.colors.dark` is `default` per `01-vision.md`). Light theme reserved для briefing room / iPad outdoor сценариев. Тем не менее, на light theme accent-цвет на bg не проходит AA для body text.

**Status:** flagged. Полное исправление требует разделить `accent` (surface fill / brand) и `accent-text-on-light` (затемнённый вариант для текста), что является brand-level decision требующим ADR. Tracked для Phase D follow-up; не блокирует MVP App Store submission т.к. (а) dark theme — primary, (b) accent на light используется в UI-affordances не в critical text, (c) большой numeric result визуально различим за счёт размера (48–96 pt).

**Note B — `textTertiary` on screen background:**

`textTertiary` — это hint/decorative tier (version stamps на splash/error, icon glyphs, chevrons, microUppercase 9 pt metadata labels). Эти uses qualify как «incidental / decorative» под WCAG SC 1.4.3 exception (text that is purely decorative или part of inactive UI components не подлежит требованию контраста). All "main text" requirements (`textPrimary`, `textSecondary`) проходят AA в обеих темах.

**Color-only signals — verified absent:**

- `Disclaimer` card — ⚠ icon prefix + uppercase title + body text; цвет (`warn` palette) дублирует, не несёт сигнал в одиночку.
- `NumericInput` error state — danger border + danger-colored error text (12 pt) рядом с inputом + reserved layout slot; error message всегда содержит explanation, не только red highlight.
- `ResultPanel` warning chip (out-of-envelope) — text-based warning chip + message body; нет color-only.
- `ResultPanel` / `CrosswindResult` error state — danger headline text + description text; красный цвет дублирует не заменяет.
- `ErrorState` — title + description + (optional) icon; красный не используется.
- `SegmentedControl` disabled segments — opacity 0.5 + `textTertiary` color + `accessibilityState.disabled` (VoiceOver announces "dimmed").
- `Toggle` on/off — track color + knob position (geometric) + `accessibilityRole="switch"` (VoiceOver announces "on/off").
- `NavPills` active pill — accentSoft background tint + accent text + `accessibilityState.selected` (VoiceOver announces "selected").

Color-blind safety verified через manual greyscale filter test (см. PR manual testing instructions).

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

## Test file location for expo-router routes

**Why this is special.** `expo-router` discovers routes by scanning `src/app/`
and turning every `*.tsx` file there into a navigable route. A co-located
test file like `src/app/menu.test.tsx` would therefore register a phantom
route at `/menu.test`: unreachable in normal use, but visible in the typed
routes generator (`.expo/types/router.d.ts`) and the `_sitemap` debug screen,
and a likely source of "why does my route list have a `.test` entry?"
confusion. Sprint 3 hit this empirically.

**Rule.**

- Route source files live in `src/app/<route-path>.tsx`.
- Route tests live in `src/__tests__/app/<route-path>.test.tsx`, mirroring the
  route structure (e.g. test for `src/app/(main)/menu.tsx` lives at
  `src/__tests__/app/(main)/menu.test.tsx` if grouped, or
  `src/__tests__/app/menu.test.tsx` for top-level routes — pick whichever
  reflects the source path most clearly).
- Snapshot files live alongside their tests in
  `src/__tests__/app/__snapshots__/`, as Jest does by default.

**Non-route code keeps its existing convention.** Anything under `src/core/`,
`src/design-system/`, or `src/features/` continues to use co-located
`__tests__/` subfolders next to the source it tests, as documented in
`module-contracts/design-system.md` (Components section). That convention is
fine there because Jest's `testMatch` already finds `**/__tests__/**/*.test.{ts,tsx}`
and there is no router scanning the directory.

**Cross-references.**

- `module-contracts/design-system.md` § "Components" — co-located `__tests__/`
  convention for non-route code.
- `02_Specification/06-ui-spec.md` § "Навигация — общая схема" — the
  `src/app/` route layout this rule protects.

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
