# Module Contract · Design System

**Path:** `src/design-system/`
**Status:** Active in MVP
**Owner module:** Core (для theming dependency)

## Ответственность

Design System предоставляет **переиспользуемые UI-компоненты и design tokens** для всего приложения. Это «строительные блоки» интерфейса. Каждый компонент стилизуется через design tokens (а не inline-цветами), поддерживает светлую и тёмную темы, accessibility, и Dynamic Type.

Design System НЕ содержит экранов или бизнес-логики. Это чисто UI-слой.

## Содержимое

### Design Tokens (`design-system/tokens.ts`)

Центральное место для всех значений дизайна. Цветовые значения каноничны: они
синхронизированы с `03_Mockups/index.html` и зафиксированы в этом контракте
ниже. **Менять их без ADR, обосновывающего эволюцию бренда, нельзя.**
Зафиксировано в PR #26 от 2026-05-02.

#### Цвета (canonical)

**Dark theme** (default — приоритет в кокпитном использовании):

| Token | Value |
|-------|-------|
| `bgPage` | `#0A0E14` |
| `bgScreen` | `#0D1117` |
| `bgCard` / `bgInput` | `#11161F` |
| `textPrimary` | `#E6EDF3` |
| `textSecondary` | `#8B949E` |
| `textTertiary` | `#6E7681` |
| `textOnAccent` | `#001A17` |
| `border` | `rgba(255,255,255,0.08)` |
| `borderStrong` | `rgba(255,255,255,0.16)` |
| `accent` | `#00C2A8` |
| `accentSoft` | `#003C36` |
| `accentText` | `#00C2A8` (text/icon-foreground variant; identical to `accent` in dark — see ADR-0009) |
| `accentOnAccent` | `#001A17` (foreground on `accent`-colored surfaces; identical in both themes for WCAG AA on teal) |
| `accentRing` | `rgba(0,194,168,0.2)` (focus-state outer glow on `NumericInput`; identical in both themes — verified WCAG AA against the focused border) |
| `warn` | `#FFB020` |
| `warnSoft` | `rgba(255,176,32,0.08)` |
| `warnBorder` | `rgba(255,176,32,0.3)` |
| `danger` | `#E5484D` |
| `dangerSoft` | `rgba(229,72,77,0.12)` |
| `success` | `#46A758` |
| `overlay` | `rgba(0,0,0,0.6)` |

**Light theme** (для брифинг-рума и iPad на улице):

| Token | Value |
|-------|-------|
| `bgPage` / `bgScreen` | `#F4F6F9` |
| `bgCard` / `bgInput` | `#FFFFFF` |
| `textPrimary` | `#1F2937` |
| `textSecondary` | `#4B5563` |
| `textTertiary` | `#6B7280` |
| `textOnAccent` | `#001A17` |
| `border` | `rgba(0,0,0,0.08)` |
| `borderStrong` | `rgba(0,0,0,0.16)` |
| `accent` | `#00C2A8` |
| `accentSoft` | `#DEF7F3` |
| `accentText` | `#006B5E` (darker text/icon-foreground variant — ~6:1 on white, passes WCAG AA; see ADR-0009) |
| `accentOnAccent` | `#001A17` (foreground on `accent`-colored surfaces; identical in both themes for WCAG AA on teal) |
| `accentRing` | `rgba(0,194,168,0.2)` (identical to dark theme; the teal ring reads correctly on both surfaces) |
| `warn` | `#9A6700` (тёмнее для AA-контраста на cream-фоне) |
| `warnSoft` | `#FEF6E7` |
| `warnBorder` | `#F0C674` |
| `danger` | `#E5484D` |
| `dangerSoft` | `rgba(229,72,77,0.10)` |
| `success` | `#46A758` |
| `overlay` | `rgba(15,23,42,0.4)` |

#### Typography variants

Все варианты — это запеченные комбинации `fontFamily / fontSize / lineHeight /
fontWeight / letterSpacing`, которые компонент `<Text variant="...">` применяет
одной prop. `letterSpacing` указан в point-ах RN; в скобках — em-эквивалент
для сверки с CSS-мокапом.

| Variant | Family | Size | LH | Weight | LetterSpacing |
|---------|--------|------|----|--------|---------------|
| `display` | mono | 48 | 56 | 700 | -0.5 (≈ -0.01em) |
| `heading1` | sans | 28 | 34 | 600 | 0 |
| `heading2` | sans | 22 | 28 | 600 | 0 |
| `heading3` | sans | 18 | 22 | 600 | -0.18 (≈ -0.01em) |
| `body` | sans | 16 | 22 | 400 | 0 |
| `bodySmall` | sans | 11 | 16 | 400 | 0 |
| `caption` | sans | 12 | 16 | 400 | 0 |
| `label` | sans | 12 | 16 | 600 | 0.6 (≈ 0.05em) |
| `chipLabel` | sans | 11 | 16 | 600 | 0.44 (≈ 0.04em) — uppercase callers |
| `microUppercase` | sans | 9 | 12 | 600 | 0.54 (≈ 0.06em) — uppercase callers; used by Crosswind input labels (compact) and result-status label (compact). Meta-item-label use-site removed alongside the meta-grid in takeoff rebrand Block 5. |
| `mono` | mono | 16 | 22 | 500 | 0 |
| `monoSmall` | mono | 11 | 16 | 400 | 0 — used by Crosswind input field unit suffix (compact) and Settings/About row values. Result-meta use-site removed alongside the meta-grid in takeoff rebrand Block 5. |
| `monoMedium` | mono | 24 | 28 | 700 | -0.5 (≈ -0.02em) — used by the "KT" suffix on the Crosswind result value |
| `monoLarge` | mono | 22 | 28 | 700 | 0 |
| `monoMicro` | mono | 8 | 12 | 400 | 0 — no current consumer (the Crosswind result-panel source chip was removed in PR `feat/crosswind-polish-2`; the variant is kept for future small chip / badge use-cases). |
| `segmentLabel` | sans | 10 | 14 | 500 | 0 — used by `SegmentedControl` segment labels |
| `monoXL` | mono | 36 | 40 | 700 | 0 — used by the iPad-regular variant of the "KT" suffix on the Crosswind result value (paired with `displayLarge`); compact-width keeps `monoMedium` (24 pt) |
| `displayLarge` | mono | 72 | 80 | 700 | -1 (≈ -0.014em) — used by the iPad-regular variant of the Crosswind result value; compact-width keeps `display` (48 pt) |

Шрифтовые семейства: sans = `'System'` (RN-резолвится в SF Pro на iOS,
Roboto на Android), mono = `'Menlo'` (iOS-системный моноширинный).

#### Прочие категории

- `spacing` — стандартные размеры отступов (4, 8, 12, 16, 24, 32, 48).
- `radii` — border-radius (4, 8, 12, 16). Disclaimer-карточка использует
  локальную константу 10 (см. mockup `.disclaimer`); B7-логотип — 14.
- `shadows` — тени для карточек (минимальные, плоский дизайн).
- `breakpoints` — размеры для адаптивности: `compact` (480 pt, phone
  landscape floor для 2-колонной module grid), `regular` (1024 pt,
  iPad landscape) и `regularHeader` (768 pt, iPad-mini portrait floor —
  переключатель compact ↔ regular sizing для Main Menu).
- `motion.press` — параметры press-feedback анимации: `scaleFrom`,
  `scaleTo`, `opacityFrom`, `opacityTo`, `durationInMs`,
  `durationOutMs`. Потребляется хуком `useScaleOnPress` (см. ниже).
- `sizing` (живёт в `src/design-system/sizing.ts`, re-exported через
  `tokens.sizing`) — три группы по два набора: `moduleCard.{compact,
  regular}` для размеров карточки/иконки/типографики/бейджа,
  `header.{compact, regular}` для лого, заголовка приложения и
  NavPills, и `settingsRow.{compact, regular}` для row-сетки
  Settings / About / BottomSheetOption — единый sizing-bundle для
  всех list-row поверхностей в приложении (см. `06-ui-spec.md`
  § Адаптивность iPad ↔ iPhone «Единое правило для всех list-row
  поверхностей»). Правила использования и точные значения — в
  `06-ui-spec.md` § Экран 3 / Экран 5 Visual treatment.

### Hooks

- `useReduceMotion` (file `src/design-system/hooks/useReduceMotion.ts`)
  — small subscription hook that returns the current value of the iOS
  "Reduce Motion" accessibility preference and updates live on
  `reduceMotionChanged`. Consumed by `useScaleOnPress` (existing) and
  the Crosswind result-panel transition / envelope-bar marker
  animation (PR `feat/crosswind-polish-2`). Public, extracted so
  motion primitives outside `useScaleOnPress` can share the
  subscription instead of duplicating it.
- `useScaleOnPress` (file `src/design-system/hooks/useScaleOnPress.ts`)
  — общая press-feedback анимация для интерактивных surface-ов
  (Button, NavPills per-pill, module cards в Main Menu). Возвращает
  `{ animatedStyle, onPressIn, onPressOut }`: caller прокидывает
  press-handler-ы в `<Pressable>` и оборачивает visible surface в
  `<Animated.View style={[..., animatedStyle]}>`. Каждый вызов хука
  держит независимую пару `useSharedValue`-ей — несколько consumers на
  одном экране анимируются независимо. Reduce Motion (через
  `AccessibilityInfo`) обнуляет анимацию: identity `animatedStyle` +
  press-handler-ы становятся no-op-ами; подписка на
  `reduceMotionChanged` обновляет поведение live. Параметры — в
  `tokens.motion.press`. Полная спецификация поведения — в
  `06-ui-spec.md` § «Анимации».

### Components

Каждый компонент в `design-system/components/<ComponentName>/`:
- `<ComponentName>.tsx` — реализация.
- `__tests__/<ComponentName>.test.tsx` — snapshot и behavior тесты. Subfolder
  `__tests__/` обязателен, потому что `jest.config.js` matches только тестовые
  файлы под этим путём (см. `08-quality-gates.md`).
- `index.ts` — barrel.

Общий test-helper `src/design-system/_testing/renderWithTheme.tsx` оборачивает
компонент в `<ThemeProvider>` (light / dark) для snapshot-тестов. Файл лежит вне
`__tests__/`, чтобы Jest не запускал его как тест.

**Список компонентов MVP:**

#### Layout
- `Screen` — обёртка для экрана: SafeAreaView + правильный фон + отступы.
- `Stack` — vertical stack с одинаковыми gap между элементами.
- `Row` — horizontal stack.
- `Card` — surface с фоном, скруглением и тонкой границей.

#### Text
- `Text` — основной текстовый компонент. Типографические варианты — см. таблицу «Typography variants» выше (15 вариантов на момент Sprint 6). Поддержка Dynamic Type.
- `MonoText` — для числовых значений и кодов (моноширинный шрифт).

#### Inputs
- `NumericInput` — числовое поле ввода. Системная iOS-клавиатура полностью отключена через `showSoftInputOnFocus={false}` (см. ADR-0011); ввод идёт через `<NumericKeypad>` family — поле автоматически регистрируется в `NumericKeypadProvider` через хук `useNumericKeypad` при тапе на field-область. `keyboardType="decimal-pad"` + `inputMode="decimal"` + `autoCorrect`/`autoComplete`/`spellCheck` выключены + `textContentType="none"` + sanitizer в `onChangeText` остаются как defence-in-depth для Bluetooth hardware-клавиатур (код — `src/design-system/components/NumericInput/sanitizeDecimalInput.ts`). Field-область обёрнута в `Pressable` с `onPress → handleFieldPress` из хука; `accessible={false}` на обёртке, чтобы VoiceOver продолжал ходить через сам TextInput. Focus ring выставляется по `isActive` из хука (поле сейчас активно в Provider), не локальным `useState(focused)` — единый source of truth, нет двойного re-render при переходе между полями. Error state, `returnKeyType="done"` + `onSubmitEditing → Keyboard.dismiss()`. Optional **`size?: 'compact' | 'regular'`** prop (default `compact`). `compact` = 44 pt minHeight, mono 16 pt value, `microUppercase` 9 pt label, `monoSmall` unit. `regular` = 64 pt minHeight, padding 14×20, `monoMedium` 24 pt value, `label` 12 pt label, `body` 16 pt unit — используется в iPad-regular Crosswind input column. **Reserved warning slot**: под полем всегда рендерится `<View>` с фиксированным `minHeight` (20 pt compact / 24 pt regular) под `testID={`${testID}-error-slot`}`. Когда `error` set, в слот помещается `<Text variant="caption" color="danger">`; иначе слот пустой. Это предотвращает layout-shift при появлении / исчезновении warning-а (см. 06-ui-spec.md § Экран 4 «Warning text reserved slot»).
- `SegmentedControl` — segmented selector. Optional **`size?: 'compact' | 'regular'`** (default `compact`) и **`wrap?: boolean`** (default `false`). `regular` = 56 pt track height, `caption` segment label. `wrap=true` + `options.length >= 5` → segments split into two equal rows inside one bordered surface (used by the 6-segment RWYCC runway-condition control on compact widths).
- `Toggle` — boolean toggle с feedback.
- `Button` — primary, secondary, ghost варианты.
- `KeyboardDismissView` — внешняя обёртка экранов с текстовыми полями. Pressable на flex:1, при тапе вне inputа вызывает `Keyboard.dismiss()`. `accessible={false}`, поэтому VoiceOver не рассматривает обёртку как тапаемую область — фокус уходит на inputs. Используется ТОЛЬКО на экранах с inputs (Crosswind Calculator). Splash, Disclaimer, Main Menu, Settings, About, Coming Soon Modal не оборачиваются — у них нет полей ввода.

#### Feedback
- `Disclaimer` — visual блок с warning-иконкой и текстом.
- `ResultPanel` — крупное число + units + metadata + source chip. Поддержка состояний empty/idle/error.
- `EmptyState` — экран без данных с иконкой и подсказкой.
- `ErrorState` — экран с ошибкой с retry-кнопкой.

#### Navigation
- `BackButton` — стандартная кнопка возврата.
- `NavPills` — segmented navigation (Modules / Settings / About).
- `ScreenHeader` — shared shell-screen header: B7-логотип + название
  экрана + NavPills + bottom divider. Reused by Main Menu, Settings,
  About; collapses to two rows on compact widths и single-row на
  `isRegular`. Title font reads `tokens.sizing.header.{compact,regular}.titleSize`.

#### Settings/About list rows
- `NavigableSettingsRow` — label + value + chevron, whole row
  tappable. Открывает sub-screen или bottom-sheet. Chevron всегда
  рендерится через `<Ionicons name="chevron-forward" />` (Unicode
  глиф `›` запрещён — у него нестабильный baseline в системном
  fallback iOS, см. Sprint 6 follow-up Polish-Block-2). Опциональный
  prop `valueColor?: 'textSecondary' | 'accent'` (default
  `textSecondary`); при `'accent'` value-текст + chevron
  переключаются на accent-палитру для сильного external-destination
  signal (About → Privacy / Terms / Support).
- `ToggleSettingsRow` — label + Toggle. Используется для boolean
  preferences (например, в Modules section Settings-экрана).
- `InfoSettingsRow` — label + value pair, read-only (без chevron,
  без Pressable). Используется и для MVP-permanent rows (Weight /
  Wind units в Settings), и для read-only фактов в About (Version /
  Validation / Data source / Distribution).
  Все три варианта принимают `isRegular?: boolean` и переключают
  sizing-bundle (`tokens.sizing.settingsRow.{compact, regular}`)
  по этому флагу. Это единственный sizing-bundle для всех
  list-row-ов в приложении — `BottomSheetOption` и Main Menu module
  cards тоже консьюмят его (см. 06-ui-spec.md § Адаптивность iPad
  ↔ iPhone «Единое правило для всех list-row поверхностей»).

#### Overlays · BottomSheet
- `BottomSheet` — модальный slide-up sheet (см. 06-ui-spec.md
  § Экран 5 Bottom-sheet).
- `BottomSheetOption` — option-row внутри `<BottomSheet>` с
  selected-индикатором (✓). Принимает `isRegular?: boolean` и
  использует тот же `tokens.sizing.settingsRow.{compact, regular}`
  bundle, что и `NavigableSettingsRow` — picker-row на iPad regular
  имеет ту же высоту и label-фонт, что и open-сь row, который его
  вызвал.

#### Inputs · RunwayConditionPicker

Single-line dropdown поле выбора runway condition с гибридной
презентацией (ADR-0018 § UI Layout; промоушен в design-system —
ADR-0021). Generic on `TValue extends string` — потребитель всегда
передаёт `options: readonly SegmentedControlOption<TValue>[]`; внутри
компонента нет ни одной feature-таксономии (Landing передаёт 7
значений `LandingRunwayCondition`, Takeoff — 6 значений
`RunwayCondition`).

- Props: `value`, `options`, `onChange(next)`,
  `accessibilityLabel?`, `testID?`, `size?: SegmentedControlSize`
  (default `compact`) — sizing маршрутизируется через
  `tokens.sizing.settingsRow.{compact, regular}`, так что closed field
  по высоте/шрифту совпадает с соседними SegmentedControl.
- Презентация резолвится внутри компонента:
  `width >= breakpoints.regular && width > height` → anchored popover
  справа от поля (через `AnchoredPopoverHost`); иначе — центрированный
  fade-in modal. Высота anchored-поверхности вычисляется из
  `options.length` (chrome + rows × rowMinHeight + buffer).
- i18n: заголовок шита и accessibility-label бэкдропа берутся из
  component-scoped неймспейса `runwayPicker.*` (`sheetTitle`,
  `sheetCancel`) — по прецеденту `keypad.*`. Option-labels приходят от
  потребителя и по Rule 9 (aviation terms) не локализуются.
- A11y-контракт: closed field — `role="button"`,
  `accessibilityState.expanded`, `accessibilityValue.text` = label
  текущего значения; список — `role="radiogroup"`; строка —
  `role="radio"` + `selected`.

#### Overlays · NumericKeypad

Замена системной iOS-клавиатуры для всех `NumericInput`. См. ADR-0011
для архитектурной мотивации и 06-ui-spec.md § Экран 4 «Keyboard
behavior» для UX-описания.

- `NumericKeypad` — presentational компонент: grid 4×3 клавиш (digits
  0-9, decimal separator, backspace) + полноширинный `<Button
  variant="primary">` Done. Compact (48 pt keys) для iPhone / iPad
  portrait; regular (56 pt keys) для iPad landscape. Каждый key-label
  имеет explicit `lineHeight` (28 pt compact / 36 pt regular) +
  `fontWeight: 600` чтобы digit-glyphs не клипались (см. ADR-0011
  Iteration 1 §3). Props: `onKeyPress(NumericKeypadKey)`, `onDone()`,
  `isRegular?: boolean` (default `false`), `testID?: string`. Каждая
  клавиша имеет `accessibilityRole="button"` и accessibilityLabel из i18n
  (`keypad.backspace`, `keypad.decimalSeparator`) или сам digit для 0-9.
  Это первый DS-примитив, который потребляет `useTranslation()`
  напрямую — оправдано тем, что labels — keypad-content, не
  caller-content (см. ADR-0011 § Consequences).
- `NumericKeypadProvider` — React Context + state machine, оборачивается
  вокруг root в `src/app/_layout.tsx`. Хранит `activeFieldId` +
  `activeIsRegular` + `activeAnchor` (window-relative geometry активного
  поля для positioning popover) — single reactive triplet — и ref на
  регистрационные данные активного поля (`getValue`/`setValue`/`isRegular`/
  `getAnchor`). Ref-pattern избегает stale closures на re-renders.
  Re-register того же `id` — no-op для `activeFieldId`, но anchor
  re-measure всё равно делается (orientation changes). `pressKey`
  собирает `value + key` через активный getValue, прогоняет через
  `sanitizeDecimalInput` и пишет обратно через setValue (backspace —
  через `slice(0, -1)` без sanitizer'а, т.к. slice от валидной строки
  остаётся валидным).
- `NumericKeypadHost` — `<Modal transparent animationType="fade">` с
  absolutely-positioned popover внутри, рендерится в app shell снаружи
  `<Stack>`. Фиксированный размер 280×320 pt; позиция вычисляется через
  pure-функцию `computeKeypadPosition(anchor, screen, keypadSize)`
  (экспортируется для unit-тестов): prefer right-of-field → fallback
  left-of-field → fallback centered. Vertical clamped в screen bounds.
  Visible когда `activeFieldId !== null && activeAnchor !== null`. Backdrop
  тап / Done button → `clearActiveField` → Modal hide. Когда активного
  поля нет — Modal `visible={false}`, оверлей не рендерится.
- `useNumericKeypad({value, onChange, isRegular, disabled})` — хук для
  `NumericInput`. Возвращает `{isActive, handleFieldPress, anchorRef}`.
  Консьюмер должен привязать `anchorRef` к **inner bordered field box**
  (не к outer tap-target wrapper) — Provider использует ref для
  `measureInWindow` при register / re-register (см. ADR-0011 Iteration 1
  §2 для anchor measurement и Iteration 2 §2 для разделения tap-target /
  anchor). `handleFieldPress` идёт на outer `<Pressable>` всего поля
  (label + field + slot), чтобы любой тап открывал keypad.
  Регистрирует поле при первом тапе через `useId()`-сгенерированный
  stable id; re-press того же поля — no-op для state, но anchor
  re-measure. На unmount пока field active — автоматически вызывает
  `clearActiveField`.
- `useNumericKeypadContext()` — низкоуровневый accessor для Provider;
  бросает explicit error если provider не смонтирован. Не экспортируется
  на уровне design-system barrel — внешние модули используют
  `useNumericKeypad` или `NumericKeypadHost`, не контекст напрямую.

## Public API

`src/design-system/index.ts`:

```typescript
// Hooks
export { useScaleOnPress, useReduceMotion } from './hooks';
export type { UseScaleOnPressResult } from './hooks';

// Tokens
export { tokens } from './tokens';
export type {
  BreakpointToken,
  ColorPalette,
  ColorToken,
  ColorTokens,
  RadiusToken,
  ShadowToken,
  SpacingToken,
  TypographyToken,
  TypographyVariant,
} from './tokens';

// Layout
export { Screen, Stack, Row, Card } from './components';
export type { ScreenProps, StackProps, RowProps, CardProps } from './components';

// Text
export { Text, MonoText } from './components';
export type { TextProps, TextVariant, MonoTextProps } from './components';

// Inputs
export {
  NumericInput,
  RunwayConditionPicker,
  SegmentedControl,
  Toggle,
  Button,
  KeyboardDismissView,
} from './components';
export type {
  ButtonProps,
  ButtonVariant,
  KeyboardDismissViewProps,
  NumericInputProps,
  NumericInputSize,
  RunwayConditionPickerProps,
  SegmentedControlOption,
  SegmentedControlProps,
  SegmentedControlSize,
  ToggleProps,
} from './components';

// Feedback
export { Disclaimer, ResultPanel, EmptyState, ErrorState } from './components';
export type {
  DisclaimerProps,
  EmptyStateProps,
  ErrorStateProps,
  ResultPanelMetaItem,
  ResultPanelProps,
  ResultPanelState,
} from './components';

// Navigation
export { BackButton, NavPills, ScreenHeader } from './components';
export type {
  BackButtonProps,
  NavPillsItem,
  NavPillsProps,
  NavPillsSizing,
  ScreenHeaderProps,
} from './components';

// Overlays
export { BottomSheet, BottomSheetOption } from './components';
export type { BottomSheetProps, BottomSheetOptionProps } from './components';
export {
  NumericKeypad,
  NumericKeypadProvider,
  NumericKeypadHost,
  useNumericKeypad,
} from './components';
export type {
  NumericKeypadProps,
  NumericKeypadKey,
  NumericKeypadDigit,
  UseNumericKeypadArgs,
  UseNumericKeypadResult,
} from './components';

// Settings/About list rows
export { NavigableSettingsRow, ToggleSettingsRow, InfoSettingsRow } from './components';
export type {
  NavigableSettingsRowProps,
  NavigableSettingsRowValueColor,
  ToggleSettingsRowProps,
  InfoSettingsRowProps,
} from './components';
```

`ResultPanelState` — discriminated union по полю `kind`:

```typescript
type ResultPanelState =
  | { kind: 'empty'; message: string }
  | { kind: 'idle'; label: string; value: string; unit: string;
      footnote?: string; meta?: readonly ResultPanelMetaItem[]; sourceChip?: string }
  | { kind: 'error'; headline: string; description?: string }
  | { kind: 'out-of-envelope'; message: string };
```

Это позволяет presentation-слою выразить все 4 состояния result-секции из
`06-ui-spec.md` Экран 4 одной prop без runtime-разветвлений в caller-коде.

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
