# ADR-0008 · Dependabot major-bump policy for SDK-coordinated packages

**Status:** Accepted
**Date:** 2026-05-13
**Related:** `02_Specification/03-tech-stack.md` § «Версионирование зависимостей», `02_Specification/09-cicd-and-ops.md` § «Dependabot конфигурация» / § «Dependabot major-bump policy», `.github/dependabot.yml`

## Context

Проект жёстко закреплён на Expo SDK 54 (`expo: ~54.0.34`,
`react-native: 0.81.5`, `react: 19.1.0`, плюс семейство `expo-*`
peer-пакетов, версии которых определяются SDK release-ом).
Dependabot настроен запускаться еженедельно и предлагать
обновления зависимостей; по умолчанию он считает все `version-update:semver-major`
бампы равноправными PR-ами и не отличает «безопасный major внутри
своего экосистемного цикла» от «major, который пересекает границу
Expo SDK».

В период 2026-05-09…2026-05-13 это привело к инциденту: Dependabot
открыл четыре PR-а, поднимающих отдельные SDK-coordinated пакеты
до SDK 55:

- **PR #40** — `expo-application` 7.0.8 → 55.0.14 (merged, commit `628988e`)
- **PR #41** — `expo-localization` 17.0.8 → 55.0.13 (merged, commit `e520e8a`)
- **PR #43** — `expo-system-ui` 6.0.9 → 55.0.17 (merged, commit `56754f0`)
- **PR #42** — `expo-router` 6.0.23 → 55.0.14 (open, **caught перед merge**)

Первые три прошли CI (lint / typecheck / tests / build-preview все
зелёные) и были замёрджены без живой функциональной проверки на
устройстве. Это создало **гибридное SDK-состояние**: `expo` и
`react-native` остаются на SDK 54, но три SDK-managed peer-пакета —
уже на SDK 55. Static-CI этого не ловит, потому что:

- Сигнатуры TypeScript-API совместимы между SDK 54 и SDK 55 для
  этих конкретных пакетов.
- Unit-тесты на `jest-expo` мокают нативную сторону.
- ESLint не знает про SDK boundaries.
- `expo-doctor` в нашем CI запускается advisory-only (см.
  `09-cicd-and-ops.md` § «Build-preview opt-in» / closed question
  про `expo-doctor`), не блокирует merge.

Diagnostic перед PR #42 (expo-router — самый видный peer-пакет SDK-
ядра, который точно сломается при mismatch) выявил расхождение:
SDK 54 ядро + SDK 55 peer-пакеты = runtime mismatch на нативной
стороне (несовместимые native-modules versions внутри Expo Go и
EAS preview-build runner-а). PR #42 был закрыт без merge, три
ранее замёрджённых PR-а откачены отдельным revert-PR (этот же PR).

Корень проблемы — **Dependabot не знает о концепции Expo SDK**.
Для него `expo-application` — это просто npm-пакет со своим
независимым semver. Для нас семейство `expo` / `expo-*` /
`react-native` / `react-native-*` / `@react-native/*` — это
координированный bundle, версии которого синхронизированы через
release-cycle Expo SDK. Major-bump любого пакета из этого bundle
без одновременного bump-а остальных создаёт гибридное состояние.

## Decision

Dependabot конфигурируется **пропускать MAJOR-обновления**
(`version-update:semver-major`) для следующих dependency-name
patterns:

- `expo`
- `expo-*`
- `react`
- `react-native`
- `react-native-*`
- `@react-native/*`

PATCH- и MINOR-обновления внутри текущего SDK для этих пакетов
**остаются auto-proposed** — они, как правило, безопасны (bug-
fixes и backwards-compatible enhancements внутри одного SDK-
release-цикла) и мы их хотим.

Реализация — `ignore:` блок в `.github/dependabot.yml`:

```yaml
ignore:
  - dependency-name: 'expo'
    update-types: ['version-update:semver-major']
  - dependency-name: 'expo-*'
    update-types: ['version-update:semver-major']
  - dependency-name: 'react'
    update-types: ['version-update:semver-major']
  - dependency-name: 'react-native'
    update-types: ['version-update:semver-major']
  - dependency-name: 'react-native-*'
    update-types: ['version-update:semver-major']
  - dependency-name: '@react-native/*'
    update-types: ['version-update:semver-major']
```

SDK upgrade-ы выполняются **только как deliberate single-PR
migrations**, следующие [Expo SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/):
один PR обновляет `expo` вместе со всеми peer-пакетами и
native-конфигом за раз. После merge — обязательный preview-build
с лейблом `preview`, ручная функциональная проверка в Expo Go /
TestFlight на физическом устройстве, и только потом release.

## Consequences

**Позитивные:**

- Невозможно случайно создать гибридное SDK-состояние через
  Dependabot. Failure-mode из PR #40/#41/#43 закрыт на уровне
  policy, а не review-discipline.
- PR-noise снижается: один SDK upgrade = один PR вместо десяти
  point-bumps, рассыпанных по неделям.
- SDK upgrade-ы вынужденно становятся deliberate actions —
  developer обязан прочитать Expo upgrade guide и выполнить
  координированный bump.

**Негативные:**

- Если выйдет important security-fix в major-версии одного из
  SDK-coordinated пакетов, Dependabot security alerts всё равно
  откроют PR (security alerts работают по другому каналу и не
  фильтруются `ignore:` блоком — см.
  [Dependabot docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#ignore)),
  но обычные version-update PR-ы — нет. Это приемлемо: security
  alerts требуют немедленной реакции независимо от SDK boundary,
  а regular major-bumps мы хотим осознанно отложить до полного
  SDK upgrade.
- Eyeballing нового Expo SDK release-а становится ручной задачей:
  раз в квартал/полгода смотреть [Expo SDK changelog](https://expo.dev/changelog)
  и принимать решение о migration. Это уже зафиксировано как
  «раз в квартал» chore в `09-cicd-and-ops.md` § Monitoring.

**Нейтральные:**

- Не влияет на bundle size, performance, Privacy Manifest или
  App Store compliance. Чисто CI/operations-policy.
- Не влияет на возможность ручного `npx expo install <package>` —
  developer может в любой момент выполнить SDK upgrade ручным
  PR-ом; ignore-блок не запрещает обновления, только убирает их
  из автоматического Dependabot потока.

## Alternatives considered

**Alternative 1 · Auto-merge только patch для всех (status quo до
этого ADR).** Это то, что было настроено в `dependabot-auto-merge.yml`:
patch-bumps devDependencies merge-ятся автоматически, остальное
требует ручного review. Не помогло, потому что MAJOR-bumps
SDK-coordinated пакетов **не merge-ились автоматически** —
они проходили manual review, но reviewer (один человек, не
делающий deep code review) видел зелёный CI и approve-ил, не
зная про SDK-boundary гипотезу.

**Alternative 2 · Block all major bumps globally.** Запретить
Dependabot предлагать major-апдейты для **любого** пакета. Слишком
агрессивно: для пакетов вне SDK-bundle (`date-fns`, `zod`,
`typescript`, `eslint`, etc.) major-bumps это нормальная и ожидаемая
часть dependency hygiene. Их мы хотим видеть в виде PR-ов.

**Alternative 3 · Группировать SDK-coordinated пакеты в один
Dependabot group.** Dependabot поддерживает `groups` (мы уже их
используем для production/dev). Можно создать группу
`expo-sdk-bundle`, которая объединит все SDK-coordinated пакеты
в один PR. Звучит привлекательно, но не решает проблему: даже
сгруппированный PR из 6 пакетов на SDK 55 без bump-а `expo` и
`react-native` создаст то же гибридное состояние. Группа полезна
только если она содержит **весь** bundle (включая `expo` и
`react-native`), а тогда это уже SDK upgrade PR — который мы
хотим делать вручную по Expo upgrade guide, а не получать
автоматически.

**Alternative 4 · Полагаться на runtime check (e.g., expo-doctor
required-check в CI).** `expo-doctor` ловит часть SDK-mismatch
проблем (см. его 17 checks). Но: (а) он advisory non-blocking в
нашем CI по решению из Phase B, (б) даже в blocking-режиме он не
гарантирует ловлю всех runtime-divergence cases (mismatch
native-modules versions внутри EAS preview-build runner-а это
runtime concern, не static check). Кроме того, runtime-check
ловит проблему **после** merge, а наша policy ловит её **до**
открытия PR.

Выбран policy-level fix (этот ADR), потому что он работает на
уровне «PR никогда не открывается», а не «PR ловится перед
merge». Defense-in-depth: `expo-doctor` advisory остаётся в CI
как secondary safeguard.

## Reconsider this status when

- Major Expo SDK upgrade выполнен (SDK 54 → 55, или дальше) —
  ADR остаётся в силе, никаких изменений в политике; просто
  baseline `~54.0.x` в `package.json` обновляется на новый SDK.
- Dependabot вводит native поддержку Expo SDK awareness (сейчас
  её нет; маловероятно в обозримом будущем).
- Появляется инструмент типа `renovate` с явным concept of
  «package families» / coordinated upgrades, и проект мигрирует
  с Dependabot на него — тогда этот ADR superseded новым с
  пометкой про инструмент.
- Команда вырастает > 1 разработчика и появляется dedicated
  code-reviewer, способный надёжно ловить SDK-boundary issues
  в обычном PR review — тогда policy можно ослабить (но,
  скорее всего, всё равно не стоит: deliberate single-PR
  migration остаётся правильным паттерном).

---

## Enforcement gaps and refinements (2026-05-13)

Через несколько часов после merge ADR-0008 (PR #46) Dependabot
выкатил три накопленных PR-а (#34, #35, #36). Inspection-проход
по ним выявил **два конкретных пробела** в первоначальных
ignore-правилах. Эта секция фиксирует обнаруженные пробелы и
добавленные refinements. Никаких изменений в Decision /
Consequences / Alternatives выше не делается — там описана
policy intent, которая остаётся в силе; здесь — implementation
fixes для случаев, которые intent покрывает, но регулярное
выражение в `dependabot.yml` мимо них пропустило.

### Gap 1 · 0.X versioning of `react-native` / `react-native-worklets`

**Discovery case:** PR #34 (production-dependencies group)
предлагал bundle с `react-native` 0.81.5 → 0.85.3 и
`react-native-worklets` 0.5.1 → 0.8.3.

**Что происходит:** обе библиотеки используют 0.X.Y versioning.
По semver-спецификации (и по реализации Dependabot) bump
`0.81.X → 0.85.Y` классифицируется как
`version-update:semver-minor`, потому что **major-position
остаётся `0`** — меняется только minor (`81 → 85`). Наше
исходное правило для `react-native` фиксировало только
`semver-major` — оно не сработало.

**Что на практике:** в React Native экосистеме каждый
`0.X` bump — это де-факто major release. RN 0.81 идёт с
Expo SDK 54, RN 0.85 — с SDK 56+. Worklets 0.5 vs 0.8 — это
несовместимые ABI-уровни для нативной части Reanimated 4.x.
То есть `0.X` minor по semver-классификации = SDK-boundary
crossing по нашему intent.

**Fix:** в `.github/dependabot.yml` добавлены явные правила:

```yaml
- dependency-name: 'react-native'
  update-types: ['version-update:semver-minor']
- dependency-name: 'react-native-worklets'
  update-types: ['version-update:semver-minor']
```

**Что остаётся auto-proposed:** patch-bumps внутри 0.X
(`0.81.5 → 0.81.6`) — те, как правило, безопасны (bug-fixes
без breaking native changes).

**Почему только эти два пакета, а не «все RN-stack 0.X»:**
другие react-native-* пакеты (gesture-handler, reanimated,
screens, safe-area-context, vector-icons) используют
**полноценный 1.X / 2.X / 4.X / 5.X / 15.X versioning**, и для
них стандартное semver-major правило работает корректно.
Расширять Gap-1 fix на них — overshoot.

### Gap 2 · Prefix matching не покрывает `eslint-config-expo` / `jest-expo`

**Discovery case:** PR #36 предлагал
`eslint-config-expo` 10.0.0 → 55.0.0 — явный SDK-boundary
crossing (10.x для SDK 54, 55.x для SDK 55).

**Что происходит:** Dependabot pattern matching для
`dependency-name` — **prefix-based glob**. Паттерн `expo-*`
матчит `expo-application`, `expo-localization`, и т.п. — но
**не** `eslint-config-expo` (начинается с `eslint-config-`,
не с `expo-`). Аналогично не матчит `jest-expo` (начинается
с `jest-`). Оба пакета — часть Expo-published ecosystem, и их
major-версии track Expo SDK release cycle.

**Fix:** добавлены explicit-name правила:

```yaml
- dependency-name: 'eslint-config-expo'
  update-types: ['version-update:semver-major']
- dependency-name: 'jest-expo'
  update-types: ['version-update:semver-major']
```

**Почему не глобальный pattern `*expo*`:** слишком жадный —
зацепит сторонние пакеты, имеющие `expo` в имени, но не
координированные с Expo SDK (например, гипотетический
`my-expo-helper@1.x`). Explicit list — predictable.

### Полная картина после refinements

Ignore-block в `.github/dependabot.yml` теперь покрывает:

1. **Все** SDK-coordinated пакеты с нормальным 1+ versioning:
   semver-major для `expo`, `expo-*`, `react`, `react-native`,
   `react-native-*`, `@react-native/*`.
2. **0.X-versioned** RN-stack пакеты: semver-minor для
   `react-native`, `react-native-worklets`.
3. **Misnamed** SDK-coordinated пакеты: semver-major для
   `eslint-config-expo`, `jest-expo`.

PR-noise reduction: ожидается, что Dependabot перестанет
открывать PR-ы для всех трёх категорий вышеперечисленных
SDK-boundary-crossing bumps.

### Acknowledged limitation

Этот refinement-pass не делает enforcement bullet-proof — он
закрывает **только** два пробела, обнаруженные на сегодняшних
трёх PR-ах. Любой **новый именованный SDK-coordinated пакет**,
не подходящий под существующие prefix-патерны и не добавленный
явно (например, гипотетический будущий `metro-react-native-*`
крос, или новый `@expo/some-tool`, или `react-test-renderer-*`
с зависимостью от RN-version), потребует **следующего
amendment cycle**.

**Процесс при обнаружении нового case:**

1. Inspection — открыт Dependabot PR, проверяется, какие пакеты
   и какие версии.
2. Если PR содержит SDK-coordinated пакет, пересекающий
   SDK boundary, — close PR с rationale (ссылка на ADR-0008).
3. **В том же или следующем PR** — extend `.github/dependabot.yml`
   ignore-блок новым правилом + amend этот ADR новой
   sub-section в Enforcement gaps (формат как у Gap 1 / Gap 2:
   discovery case, что происходит, fix, что остаётся
   auto-proposed).

Это превращает каждый случайный mis-pattern из incident в
documented refinement. Со временем ignore-block accumulates
конкретные правила, основанные на наблюдаемом поведении
Dependabot, а не на воображаемом полном списке всех возможных
SDK-coordinated пакетов.

**Manual-review остаётся primary safety net.** Ignore-block —
это PR-noise-reducer и first-line filter, но не замена
inspection-проходу перед merge любого Dependabot PR,
затрагивающего production-dependencies. Inspection-протокол
(см. предыдущий cleanup-prompt от 2026-05-13) воспроизводимо
ловит SDK-boundary issues, даже если правила в
`dependabot.yml` для конкретного пакета ещё не добавлены.

---

## Pre-release tooling stability lock (2026-05-14)

Через сутки после refinement-pass (Gap 1 / Gap 2) Dependabot
выкатил четыре PR-а с major-апдейтами **не-SDK-coordinated**
core-пакетов:

- **PR #53** — `lint-staged` 15.5.2 → 17.0.4 (×2 major).
- **PR #54** — `i18next` 24.2.3 → 26.1.0 (×2 major, production
  runtime).
- **PR #55** — `eslint-plugin-react-hooks` 5.1.0 → 7.1.1 (×2
  major, добавляет ESLint-10 compatibility rules).
- **PR #56** — `typescript` 5.9.2 → 6.0.3 (×1 major).

Ни один из них **не** пересекает SDK boundary — ADR-0008
ignore-block их и не должен был блокировать. Но inspection
выявил отдельную проблему: **major-bumps core dev-tooling /
production-runtime библиотек во время pre-release polish phase
имеют нулевую функциональную выгоду до launch и нетривиальный
breakage surface** (TS 6 stricter inference + новые `lib`
defaults, i18next 26 typing reshape, lint-staged 17 поднимает
Node engine, eslint-plugin-react-hooks 7 — новые правила, которые
могут surface-ить нарушения в текущем codebase).

### Decision

Расширить ignore-block на **четыре конкретные dependency-name**
с правилом `version-update:semver-major`. PATCH + MINOR внутри
текущего major-а остаются auto-proposed (security patches и
bug-fixes проходят).

```yaml
- dependency-name: 'typescript'
  update-types: ['version-update:semver-major']
- dependency-name: 'i18next'
  update-types: ['version-update:semver-major']
- dependency-name: 'lint-staged'
  update-types: ['version-update:semver-major']
- dependency-name: 'eslint-plugin-react-hooks'
  update-types: ['version-update:semver-major']
```

### Why these four

Это не «все non-SDK майоры запрещены навсегда» — это **именно
эти четыре пакета на эту фазу проекта**. Каждый выбран сознательно:

- `typescript` — core dev-tool, держит весь typecheck quality gate.
  Major-bumps традиционно вытаскивают новые errors из third-party
  `@types/*` и из собственного codebase. Нужен dedicated upgrade
  cycle с peer audit.
- `i18next` — production-runtime библиотека под каждым
  `useTranslation()`. Sprint 7 (Localization audit) рассчитывает
  на стабильное состояние; major во время аудита разрушает
  test-baseline.
- `lint-staged` — git-hook orchestrator. v17 поднимает Node
  engine `>=18` → `>=20`; CI на 20 LTS работает, но рассказывает,
  что lint-staged начинает быть picky про Node-version. Безопаснее
  отложить.
- `eslint-plugin-react-hooks` — v7 добавляет ESLint-10 compat
  rules и compiler-lint improvements (`set-state-in-effect`,
  ref validation), которые потенциально surface-ят новые
  warnings в текущем коде. Полезные правила — но не во время
  feature-freeze.

### Consequences

**Позитивные:**

- Pre-release polish phase не прерывается майорами core-инструментов.
- Dependabot не открывает PR-noise для повторных prerelease /
  RC / major-bumps этих пакетов.
- Sprint 7 (Localization audit) и Sprint 8 (App Store submission
  cycle) идут на стабильной tooling-baseline.

**Негативные:**

- Если security advisory выйдет в новой major-версии одного из
  четырёх пакетов, Dependabot security alerts всё равно откроют
  PR (security alerts не фильтруются `ignore:` блоком). Это
  приемлемо.
- Lift-action требует осознанного post-launch шага. Без него
  правила накапливаются и `dependabot.yml` дрейфует от реального
  желания команды.

**Нейтральные:**

- Не влияет на bundle / runtime / Privacy Manifest.

### Lift condition

После **Phase D App Store launch** открыть отдельный PR
«tooling-evaluation sprint», который:

1. Снимает эти четыре `ignore:` записи **по одной**.
2. Для каждого пакета — отдельный child-PR с upgrade-ом, регресс-
   тестом (lint / typecheck / tests / preview-build) и smoke-
   тестом на устройстве (Expo Go), если это runtime-пакет.
3. Решение per-package: merge / postpone / hold.

Tooling-evaluation sprint открывает по одному child-PR, не bundle
из четырёх. Каждый прокатывается через тот же inspection-protocol,
что Sprint 6 follow-up polish (manual review + manual CI verify +
device smoke).

### Reference closed PRs

- #53 lint-staged 15→17 — closed 2026-05-14, comment cites this
  amendment.
- #54 i18next 24→26 — closed 2026-05-14, comment cites this
  amendment.
- #55 eslint-plugin-react-hooks 5→7 — closed 2026-05-14, comment
  cites this amendment.
- #56 typescript 5→6 — closed 2026-05-14, comment cites this
  amendment.
