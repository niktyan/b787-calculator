# ADR-0005 · Flat ESLint config (Expo SDK 54+)

**Status:** Accepted
**Date:** 2026-04 (retroactive — fixed during Phase B implementation)
**Related:** `02_Specification/08-quality-gates.md`

## Context

Когда Phase B инициализировал проект на Expo SDK 54, потребовалось зафиксировать формат ESLint-конфига:

- **`eslint-config-expo@10`** (поддерживаемая версия для SDK 54) поставляется только в виде flat config. Legacy `.eslintrc.js` не поддерживается.
- **ESLint 9+** по умолчанию использует flat config; legacy формат становится опциональным режимом и в перспективе будет удалён.
- Оригинальный шаблон спеки (`08-quality-gates.md`) был написан в legacy `.eslintrc.js` формате (CommonJS-объект с `extends`-массивом).

Возможные пути:

1. **Pin к старой версии ESLint и `eslint-config-expo`** — для сохранения legacy конфига.
2. **Migrate к flat config** — `eslint.config.js` экспортирует array конфиг-объектов.

## Decision

**Используем flat config.** Конфиг живёт в `eslint.config.js` в корне репозитория, экспортирует array конфиг-объектов через `module.exports = [ ... ]`.

Все правила, описанные в `08-quality-gates.md` (в historical legacy-формате на момент написания спеки), сохранены семантически — изменилось только синтаксическое оформление. Real-world реализация в `eslint.config.js` обновлена параллельно с этим ADR в Phase B docs sync PR.

## Consequences

**Позитивные:**
- Совместимость out-of-the-box с Expo SDK 54+ и ESLint 9+.
- Не требуется vendor-pinning к outdated tooling.
- Future-proof — flat config это официальное направление ESLint.
- `eslint-config-expo@10` impоrtируется через `require('eslint-config-expo/flat')` без compat shims.

**Негативные:**
- Migration cost при будущих breaking changes flat config (редко; стабилизировался в ESLint 9).
- Некоторые ESLint-плагины ещё не имеют нативной flat-config поддержки — в этом случае нужен `@eslint/compat` shim. На момент Phase B все наши плагины (typescript-eslint, react, react-hooks, react-native, jsx-a11y, import) либо имеют flat-конфиги в exports, либо работают как plain plugin objects.

**Нейтральные:**
- Спека (`08-quality-gates.md`) обновлена для отражения flat-конфига.
- Разработчики, привыкшие к legacy `.eslintrc.js`, проходят небольшую кривую изучения flat-конфигов.

## Alternatives considered

**Pin ESLint 8 + legacy `eslint-config-expo@<10`.** Отвергнут: блокирует апгрейд на SDK 54, тянет за собой outdated tooling chain. Краткосрочная экономия — долгосрочный технический долг.

**Использовать `@eslint/compat` для миграции legacy конфига внутрь flat config**. Отвергнут: добавляет лишний слой абстракции без преимуществ для нового проекта; полезен только при миграции существующего legacy конфига.
