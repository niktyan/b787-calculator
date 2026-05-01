# B787 Calculator

Бесплатное iOS/iPadOS приложение для пилотов Boeing 787: advisory-калькулятор максимально допустимого бокового ветра при посадке. Работает полностью офлайн. **Не для primary operational use** — справочный инструмент, окончательное решение принимается на основании FCOM.

> Распространяется через Apple App Store. iOS 16+ (iPhone + iPad). Полная локализация RU/EN, dark/light тема, нулевой сбор данных (Privacy Label «No data collected»).

---

## Документация

**Спецификация — единственный источник правды:**

- 📘 [`02_Specification/`](02_Specification/) — полный набор документов (vision, architecture, tech-stack, domain model, UI spec, quality gates, CI/CD).
- 🧭 [`02_Specification/AGENTS.md`](02_Specification/AGENTS.md) — operational charter для AI-агентов (читать первым).
- 🏗️ [`02_Specification/02-architecture.md`](02_Specification/02-architecture.md) — архитектура и правила зависимостей.
- 🧱 [`02_Specification/ADR/`](02_Specification/ADR/) — Architecture Decision Records.

**Для AI-агентов:** [`CLAUDE.md`](CLAUDE.md) — entry point с quick-reference rules.

**Мокапы:** [`03_Mockups/`](03_Mockups/) — HTML-прототипы UI.

---

## Tech stack (выдержка)

- **Платформа:** iOS / iPadOS 16+
- **Язык:** TypeScript 5.9 (strict)
- **Фреймворк:** React Native 0.81 + Expo SDK 54 (managed workflow)
- **Навигация:** expo-router (file-based)
- **Стили:** только `StyleSheet.create()` + design tokens (никаких styled-components / NativeWind / Tamagui)
- **State:** React Context + hooks (никаких Redux / Zustand для MVP)
- **Validation:** zod
- **Локализация:** i18next + react-i18next
- **Тесты:** jest + jest-expo + @testing-library/react-native
- **Сборка:** EAS Build (облачные iOS-серверы Expo) — Mac не нужен

Полный список и обоснования — [`02_Specification/03-tech-stack.md`](02_Specification/03-tech-stack.md).

---

## Quick start (для разработчика)

**Окружение:**

- Node 20 LTS (CI и спека требуют именно 20).
- npm 10.x (без yarn / pnpm).
- Git ≥ 2.40, GitHub CLI (`gh`).
- iPhone + Expo Go (для функционального тестирования).

**Setup:**

```bash
git clone https://github.com/niktyan/b787-calculator.git
cd b787-calculator
npm ci
cp .env.example .env.local        # заполни EXPO_TOKEN и Apple credentials
```

**Команды:**

```bash
npm start             # expo start (development)
npm run ios           # expo start --ios
npm run lint          # ESLint, --max-warnings=0
npm run typecheck     # tsc --noEmit
npm run test          # jest
npm run test:coverage # jest --coverage
npm run format        # prettier --write .
```

**Pre-commit / pre-push hooks** установлены через Husky:

- pre-commit: `lint-staged` (ESLint --fix + Prettier на изменённых файлах).
- pre-push: typecheck + связанные тесты.

---

## Workflow для одного спринта

1. `git checkout main && git pull`
2. `git checkout -b feat/<feature-name>` (или `fix/`, `chore/`)
3. Работаешь, делаешь commits в Conventional Commits формате.
4. `git push origin feat/<feature-name>`
5. `gh pr create --title "<conventional-commit>" --body-file .github/pull_request_template.md`
6. CI прогоняет lint / typecheck / tests / EAS preview build.
7. Тестируешь preview-сборку через Expo Go / TestFlight.
8. Approve + squash merge.

Подробнее — [`02_Specification/09-cicd-and-ops.md`](02_Specification/09-cicd-and-ops.md).

---

## Релиз

```bash
./scripts/release.sh patch    # 0.1.0 → 0.1.1
./scripts/release.sh minor    # 0.1.0 → 0.2.0
./scripts/release.sh major    # 0.1.0 → 1.0.0
```

Скрипт делает `npm version` + push коммита и тега. Дальше всё автоматически: GitHub Actions запускает release.yml → EAS Build production → EAS Submit → TestFlight → готово к Submit for Review (один клик в App Store Connect).

---

## Структура

```
b787-calculator/
├── 02_Specification/   спека (единственный источник правды)
├── 03_Mockups/         HTML-мокапы UI
├── app/                expo-router routes
├── src/
│   ├── app/            composition root, providers
│   ├── core/           i18n, theming, storage, disclaimer, feature-flags, logger
│   ├── design-system/  UI компоненты + tokens
│   ├── features/       feature-модули (crosswind в MVP)
│   └── data/           bundled JSON-ресурсы
├── scripts/release.sh  helper для релизов
├── .github/workflows/  CI / Release / Pages / Dependabot
├── eas.json            EAS Build/Submit профили
└── CLAUDE.md           entry point для AI-агентов
```

---

## Privacy & Compliance

- **No data collected.** Никакой аналитики, рекламы, трекеров, network requests.
- **Privacy Manifest** соответствует требованиям Apple (см. `07-app-store-compliance.md`).
- **Privacy Policy & Terms of Use** хостятся на GitHub Pages, ссылки — в App Store Listing и в About-экране.
- **Advisory only** — все расчёты сопровождаются дисклеймером «не для primary operational use».

---

## Лицензия и контакты

Single-developer проект. Поддержка: niktyan@bk.ru.
