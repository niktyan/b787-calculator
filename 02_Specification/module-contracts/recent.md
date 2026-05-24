# Module Contract · Recent

**Path:** `src/features/recent/`
**Status:** Active in MVP (Sprint D / ADR-0016)
**Owner module:** none (feature module)

## Ответственность

Recent отображает список последних расчётов (до 20 entries), позволяет
пилоту восстановить inputs в калькуляторе одним тапом, и очистить
историю. Storage-слой живёт **не здесь**, а в `core/recent-storage/`
(см. `module-contracts/core.md` § `core/recent-storage`) — Recent
только читает оттуда и реагирует на пользовательские действия.

## Submodules и их функции

### `recent/presentation/`

**Файлы:**
- `RecentCalculationsScreen.tsx` — главный экран, рендерит header
  с Back + Clear All, список entries (или empty state), хендлит
  навигацию по entry таппу.
- `components/RecentListItem.tsx` — одна строка списка: значок модуля,
  inputs summary, result значение, relative-time через
  `date-fns#formatDistanceToNow`.
- `components/RecentEmptyState.tsx` — empty state когда список пуст.
- `useRecentCalculations.ts` — хук-обёртка над `core/recent-storage`:
  возвращает `{ entries, refresh, remove, clear }`, обновляется при
  focus экрана через `expo-router` `useFocusEffect`.

### `recent/__tests__/`

- View-model хук: mount/refresh/remove/clear.
- Screen tests: empty state, list rendering, snapshot dark + light.
- ListItem snapshot tests для обоих module types.

### Public API

`src/features/recent/index.ts` экспортирует:

```typescript
export { RecentCalculationsScreen } from './presentation/RecentCalculationsScreen';
```

Ничего внутреннего не expose — Recent потребляется только
`src/app/(main)/recent.tsx` как route re-export.

## Dependencies

**От других модулей:**
- `core/` — `useTranslation`, `useTheme`, `logger`, **`useRecentEntries`**
  (хук обёртка вокруг recent-storage), типы `RecentEntry` /
  `RecentTakeoffEntry` / `RecentLandingEntry`.
- `core/aviation` — `AircraftVariant`, `RunwayCondition` для рендера
  inputs summary.
- `design-system/` — `Screen`, `Stack`, `Row`, `Text`, `EmptyState`,
  `Card`, `Pressable`, tokens.
- `expo-router` — `useRouter`, `useFocusEffect` (для refresh на focus).

**От библиотек:**
- `date-fns` (уже в package.json) — `formatDistanceToNow` для
  relative-time labels (`"5 minutes ago"`).

**Запрещено:**
- Импорты из `features/crosswind/*` или
  `features/crosswind-landing/*` — Recent не должен знать о их
  domain. Все необходимые данные приходят через `RecentEntry` typed
  shape из `core/recent-storage`.

## Side-effects

- `refresh()` читает AsyncStorage (async).
- `remove(id)` / `clear()` — пишут в AsyncStorage.
- Navigation: при таппе на entry — `router.push('/crosswind?recentEntryId=…')`
  или `/crosswind-landing?recentEntryId=…`. Recent screen НЕ
  изменяет state калькулятора напрямую.

## Layer classification submodules

Все submodules — Presentation. Domain-логики у Recent нет (никаких
расчётов): он показывает данные, которые уже валидированы и
типизированы в `core/recent-storage`. См.
`02-architecture.md` § Layer Responsibility Matrix.

| Submodule | Purity | Допустимые импорты |
|-----------|--------|---------------------|
| `recent/presentation/RecentCalculationsScreen` | 🔵 **React** | core, design-system, expo-router |
| `recent/presentation/components/RecentListItem` | 🔵 **React** | core, design-system, date-fns |
| `recent/presentation/components/RecentEmptyState` | 🔵 **React** | core, design-system |
| `recent/presentation/useRecentCalculations` | 🔵 **React** | core, expo-router |

## Тестирование

**Component tests:**
- `RecentCalculationsScreen.test.tsx` — empty state, list of entries,
  Clear All confirmation flow, snapshot обе темы.
- `RecentListItem.test.tsx` — takeoff entry render, landing entry
  render (autoland vs manual conditional input rendering), snapshot.
- `RecentEmptyState.test.tsx` — snapshot.

**Hook tests:**
- `useRecentCalculations.test.tsx` — mount load, refresh после
  external save, remove/clear обновление.

Coverage threshold: ≥ 70% (feature-level default per
`08-quality-gates.md`).

## Открытые вопросы

1. Пагинация при росте кап-а до больших значений (Phase 3+). MVP cap=20
   умещается без виртуализации.
2. Локализация relative-time. `date-fns/locale` подключение для `ru` —
   если стандартный английский в RU-локали покажется неприемлемым на
   beta-тесте, добавим в follow-up PR.
3. Per-row swipe-to-delete vs single Clear All. Решено: только Clear
   All в MVP, swipe-to-delete в Phase 2 (ADR-0016 § Future).
