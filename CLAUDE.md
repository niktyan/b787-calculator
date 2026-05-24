# CLAUDE.md — entry point for AI coding agents

> Этот файл читается Claude Code автоматически в начале каждой сессии. Он направляет агента к полному набору правил.

---

## Перед любой задачей прочти

**Обязательно:**

1. [`02_Specification/AGENTS.md`](02_Specification/AGENTS.md) — operational charter, 20 правил поведения, Definition of Done, Forbidden Actions.
2. [`02_Specification/01-vision.md`](02_Specification/01-vision.md) — что мы делаем и зачем.
3. [`02_Specification/02-architecture.md`](02_Specification/02-architecture.md) — структура и правила зависимостей.

**По мере необходимости (per task):**

- [`02_Specification/03-tech-stack.md`](02_Specification/03-tech-stack.md) — при добавлении/обновлении зависимостей.
- [`02_Specification/04-domain-model.md`](02_Specification/04-domain-model.md) — при работе с типами и моделями данных.
- [`02_Specification/05-crosswind-algorithm.md`](02_Specification/05-crosswind-algorithm.md) — при работе с расчётом crosswind.
- [`02_Specification/06-ui-spec.md`](02_Specification/06-ui-spec.md) — при работе с UI.
- [`02_Specification/07-app-store-compliance.md`](02_Specification/07-app-store-compliance.md) — disclaimers, Privacy Manifest, App Store Listing.
- [`02_Specification/08-quality-gates.md`](02_Specification/08-quality-gates.md) — TypeScript / lint / тесты / accessibility.
- [`02_Specification/09-cicd-and-ops.md`](02_Specification/09-cicd-and-ops.md) — CI/CD, EAS, релизы.
- [`02_Specification/module-contracts/<module>.md`](02_Specification/module-contracts) — при работе с конкретным модулем.
- Релевантные ADR в [`02_Specification/ADR/`](02_Specification/ADR).

---

## Quick-reference rules (детали в `AGENTS.md`)

1. **Спека — источник правды.** Если код противоречит спеке — это баг. Любое архитектурное изменение → обновить соответствующий док в том же PR.
2. **Stop on ambiguity.** Если что-то двусмысленно — спросить пользователя, а не догадываться.
3. **Никогда не обходить quality gates.** Lint, typecheck, tests, coverage thresholds — все должны быть зелёными. `--no-verify` запрещён.
4. **Forbidden dependencies.** Никаких analytics/ads/trackers/push/social-login/styling-frameworks/heavy-utils. Полный список в `03-tech-stack.md`.
5. **No console.log.** Используй `core/logger`. `console.warn` / `console.error` — только в крайнем случае.
6. **Localization first.** Все user-facing строки через `useTranslation()`. Авиационные термины (KT, MAC, RWYCC) — НЕ локализуются.
7. **No magic numbers.** Кроме `0, 1, -1, 2, 100` — только именованные константы.
8. **Conventional Commits.** `<type>(<scope>): <description>`. Types: feat, fix, docs, style, refactor, test, chore, perf.
9. **Branch workflow.** Feature-ветка → PR → CI зелёный → merge. Никогда напрямую в main.
10. **Definition of Done в каждом PR.** См. шаблон в `.github/pull_request_template.md`.

---

## Команды

```bash
npm run lint          # ESLint, 0 warnings allowed
npm run typecheck     # tsc --noEmit
npm run test          # jest
npm run test:coverage # jest --coverage
npm run format        # prettier --write
npm start             # expo start
npm run ios           # expo start --ios

./scripts/release.sh patch   # bump 1.1.0 → 1.1.1, push tag
./scripts/release.sh minor   # bump 1.1.0 → 1.2.0
./scripts/release.sh major   # bump 1.1.0 → 2.0.0
```

---

## Структура репозитория

```
b787-calculator/
├── 02_Specification/  — единственный источник правды (документация)
├── 03_Mockups/        — HTML-мокапы
├── src/
│   ├── app/           — expo-router routes + composition root (root _layout.tsx, провайдеры)
│   ├── core/          — i18n, theming, storage, disclaimer, feature-flags, logger
│   ├── design-system/ — UI components + tokens
│   ├── features/      — feature-модули (crosswind, и далее по фазам)
│   └── data/          — bundled JSON-ресурсы (опорные значения)
├── scripts/           — release.sh и другие helper-скрипты
├── .github/           — workflows + dependabot + PR template
└── eas.json           — EAS Build/Submit профили
```

---

## Что точно не делать

См. `02_Specification/AGENTS.md` раздел **Forbidden actions**. Кратко: никакой аналитики, рекламы, трекеров, push-нотификаций, in-app purchase, network requests, hardcoded credentials, force-push в main, modification of bundle ID без согласования.
