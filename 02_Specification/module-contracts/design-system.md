# Module Contract · Design System

**Path:** `src/design-system/`
**Status:** Active in MVP
**Owner module:** Core (для theming dependency)

## Ответственность

Design System предоставляет **переиспользуемые UI-компоненты и design tokens** для всего приложения. Это «строительные блоки» интерфейса. Каждый компонент стилизуется через design tokens (а не inline-цветами), поддерживает светлую и тёмную темы, accessibility, и Dynamic Type.

Design System НЕ содержит экранов или бизнес-логики. Это чисто UI-слой.

## Содержимое

### Design Tokens (`design-system/tokens.ts`)

Центральное место для всех значений дизайна.

**Категории:**
- `colors` — цвета по категориям (background, text, border, accent, status). Различаются для светлой и тёмной темы.
- `typography` — font families (`SF Pro`, `SF Mono`), font sizes (12, 14, 16, 22, 28, 36, 48, 64), line heights, weights.
- `spacing` — стандартные размеры отступов (4, 8, 12, 16, 24, 32, 48).
- `radii` — border-radius (4, 8, 12, 16).
- `shadows` — тени для карточек (минимальные, плоский дизайн).
- `breakpoints` — размеры для адаптивности (compact phone width, regular tablet width, etc).

### Components

Каждый компонент в `design-system/components/<ComponentName>/`:
- `<ComponentName>.tsx` — реализация.
- `<ComponentName>.test.tsx` — snapshot и behavior тесты.
- `index.ts` — barrel.

**Список компонентов MVP:**

#### Layout
- `Screen` — обёртка для экрана: SafeAreaView + правильный фон + отступы.
- `Stack` — vertical stack с одинаковыми gap между элементами.
- `Row` — horizontal stack.
- `Card` — surface с фоном, скруглением и тонкой границей.

#### Text
- `Text` — основной текстовый компонент. Типографические варианты: `display`, `heading1`, `heading2`, `body`, `caption`, `label`. Поддержка Dynamic Type.
- `MonoText` — для числовых значений и кодов (моноширинный шрифт).

#### Inputs
- `NumericInput` — числовое поле ввода с keyboard `numeric-pad` или `decimal-pad`. Поддержка валидации, error state.
- `SegmentedControl` — segmented selector (например, для Dry/Wet/Contaminated).
- `Toggle` — boolean toggle с feedback.
- `Button` — primary, secondary, ghost варианты.

#### Feedback
- `Disclaimer` — visual блок с warning-иконкой и текстом.
- `ResultPanel` — крупное число + units + metadata + source chip. Поддержка состояний empty/idle/error.
- `EmptyState` — экран без данных с иконкой и подсказкой.
- `ErrorState` — экран с ошибкой с retry-кнопкой.

#### Navigation
- `BackButton` — стандартная кнопка возврата.
- `NavPills` — segmented navigation (Modules / Settings / About).

## Public API

`src/design-system/index.ts`:

```typescript
// Tokens
export { tokens } from './tokens';
export type { ColorToken, SpacingToken, RadiusToken, TypographyToken } from './tokens';

// Layout
export { Screen, Stack, Row, Card } from './components';

// Text
export { Text, MonoText } from './components';
export type { TextVariant } from './components';

// Inputs
export { NumericInput, SegmentedControl, Toggle, Button } from './components';
export type { NumericInputProps, SegmentedControlOption } from './components';

// Feedback
export { Disclaimer, ResultPanel, EmptyState, ErrorState } from './components';
export type { ResultPanelState } from './components';

// Navigation
export { BackButton, NavPills } from './components';
export type { NavPillsItem } from './components';
```

## Dependencies

**От других модулей:**
- `core/theming` — `useTheme()` хук для доступа к токенам с учётом текущей темы.

**От библиотек:**
- `react`, `react-native` — базовые примитивы.
- `react-native-safe-area-context` — для `Screen` компонента.

**НЕ зависит от:**
- Любых feature-модулей. Это foundation для них.
- `i18n` — design-system принимает текст как proп, не локализует сам.
- Бизнес-логики.

## Side-effects

Никаких. Все компоненты — pure presentation.

## Правила использования

**Что МОЖНО:**
- Использовать любой компонент из barrel в любом feature-модуле или App Shell.
- Расширять design-system новыми компонентами через PR (с обновлением этого контракта).
- Добавлять новые токены через расширение `tokens.ts`.

**Что НЕЛЬЗЯ:**
- Прямо импортировать из `design-system/components/<X>/<X>.tsx` минуя barrel — только через `import { X } from '@design'`.
- Использовать inline-стили в feature-модулях вместо компонентов design-system.
- Хардкодить цвета или размеры в feature-модулях — всё через токены.

ESLint правило `react-native/no-inline-styles` и `react-native/no-color-literals` это автоматически ловят.

## Тестирование

**Snapshot-тесты** для всех statics-компонентов: `Card`, `Disclaimer`, `EmptyState`. Снимок генерируется один раз и при изменении компонента updated осмысленно.

**Behavior-тесты** для interactive-компонентов: `Button` (onPress), `Toggle` (state), `NumericInput` (validation, focus), `SegmentedControl` (selection change).

**Visual-проверки** для тем: каждый компонент протестирован в светлой и тёмной теме (через mocked theme provider).

**Accessibility:**
- Каждый interactive-компонент имеет `accessibilityLabel` или принимает его как prop.
- Touch-targets минимум 44×44 pt (проверяется в snapshot или вручную).

**Coverage threshold:** ≥ 70% общая (snapshot-тесты дают высокое покрытие без явного assertions; behavior-тесты добавляют coverage критичных путей).

## Открытые вопросы

1. Стоит ли создать Storybook для дизайн-системы для visual-документации? Решение для MVP: нет, излишне. Phase 2+ можем добавить.
2. Как организовать иконки? Используем `@expo/vector-icons` (входит в Expo SDK). Конкретные иконки определяются по мере появления необходимости.
