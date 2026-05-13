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
