# 09 · CI/CD and Operations

## Назначение документа

Описывает **операционный жизненный цикл проекта**: как код попадает из ветки разработчика в App Store, какие автоматизации задействованы, где живут секреты, как версионируется приложение, что делать при инцидентах и как разработчик не теряет данные.

Все процедуры в документе — **финальные и готовые к исполнению**. На них опирается агент-реализатор и разработчик в Phase B и далее.

---

## GitHub repository

**Имя репозитория:** `b787-calculator` (private).

**Создаётся:** в Phase B на личном GitHub-аккаунте разработчика. Доступ — только владельцу.

**Структура:**
- `main` — основная защищённая ветка. Только через PR.
- `feat/<module-name>` — feature-ветки для каждого модуля. Короткоживущие, удаляются после merge.
- `fix/<short-description>` — bug-fixes.
- `chore/<description>` — обновления зависимостей, конфигов и т.п.

**Branch protection rules для `main`:**
- Require pull request before merging.
- Require approvals: 1 (вы как owner).
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners (если будет настроен `CODEOWNERS`).
- Require status checks to pass: `quality`, `build-preview`.
- Require branches to be up to date before merging.
- Require linear history (нет merge-коммитов, только squash или rebase).
- Disallow force pushes.
- Disallow deletions.

**Squash merge как стратегия по умолчанию.** История main остаётся читаемой, каждая фича = один коммит.

---

## Workflow для одного спринта

Шаг за шагом, как агент-реализатор и разработчик проходят через один модуль.

**Шаг 1.** Из main создаётся feature-ветка:
```
git checkout main && git pull
git checkout -b feat/core-module
```

**Шаг 2.** Агент работает в этой ветке: пишет код, делает commits, пушит их на GitHub:
```
git add .
git commit -m "feat(core): add i18n setup"
git push origin feat/core-module
```

**Шаг 3.** После завершения работы агент создаёт Pull Request через GitHub CLI:
```
gh pr create --title "feat(core): initial Core module" --body-file .github/pull_request_template.md
```

**Шаг 4.** GitHub Actions автоматически запускает CI:
- `quality` job: lint, typecheck, tests.
- `build-preview` job: EAS Build preview-профиль.
- Каждый commit в PR → CI прогоняется заново.

**Шаг 5.** Разработчик функционально проверяет:
- Открывает Expo Go на iPhone.
- Сканирует QR-код или ссылку из EAS preview-build.
- Проверяет, что фича работает как ожидается.

**Шаг 6.** Если всё ОК — approve, squash merge в main:
```
gh pr merge --squash --delete-branch
```

**Шаг 7.** main теперь содержит новую функциональность. Следующий спринт — снова с шага 1.

---

## Conventional Commits

Все commit messages следуют формату Conventional Commits. Это обеспечивает читаемую историю и автогенерацию changelog.

**Формат:**
```
<type>(<scope>): <short description>

<optional body>

<optional footer>
```

**Допустимые `type`:**
- `feat` — новая функциональность.
- `fix` — исправление бага.
- `docs` — изменения документации (включая спеку).
- `style` — форматирование, без изменения логики.
- `refactor` — рефакторинг без изменения внешнего поведения.
- `test` — добавление или правка тестов.
- `chore` — обновление зависимостей, конфигов.
- `perf` — улучшение производительности.

**Примеры:**
```
feat(crosswind): add piecewise-linear calculator
fix(splash): handle missing disclaimerAccepted flag
refactor(core): extract storage adapter
chore(deps): bump expo to 51.0.10
docs(spec): update 05-crosswind-algorithm test cases
```

Конфигурация `commitlint` (если внедряется — см. open question в `08-quality-gates.md`) автоматически проверяет формат.

---

## Versioning стратегия

**Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- `MAJOR` (1.0.0 → 2.0.0) — breaking changes для пользователя. Например, существенная переделка UI или несовместимое изменение алгоритма расчёта.
- `MINOR` (1.0.0 → 1.1.0) — новый функциональный модуль или существенная фича.
- `PATCH` (1.0.0 → 1.0.1) — баг-фиксы, обновления опорных данных, мелкие улучшения.

**Где живут версии:**
- `package.json` поле `version` — основная версия.
- `app.json` поля `version` (= package.json) и `ios.buildNumber` (инкрементируется при каждой сборке).
- В About-экране отображается `version` + `(build buildNumber)`.

**Когда инкрементируется:**
- `MAJOR`/`MINOR`/`PATCH` — вручную при релизе через PR `chore(release): bump to X.Y.Z`.
- `buildNumber` — автоматически EAS Build при каждом production-билде (через `autoIncrement: true` в `eas.json`).

**Принцип:** одна версия (X.Y.Z) — много build-ов (`buildNumber`). Build-номер существует для App Store Connect (Apple требует уникальный buildNumber для каждой загруженной сборки).

---

## EAS configuration (`eas.json`)

```json
{
  "cli": {
    "version": ">= 7.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "[apple-id-email]",
        "ascAppId": "[app-store-connect-app-id]",
        "appleTeamId": "[apple-team-id]"
      }
    }
  }
}
```

**Профили:**

- **`development`** — сборка с Dev Client (расширенная версия Expo Go, поддерживающая custom native modules). Используется во время активной разработки. Раздаётся через TestFlight internal.
- **`preview`** — сборка для CI на каждый PR. Без Dev Client. Раздаётся через TestFlight internal или прямую ссылку. Это то, что разработчик проверяет на iPhone после Pull Request.
- **`production`** — финальная сборка для App Store. AutoIncrement buildNumber. Подписана production-сертификатом.

**`appVersionSource: "remote"`** — версия читается из EAS, не из локального package.json. Это упрощает синхронизацию.

---

## Secrets management

Никаких секретов в коде или в репозитории. Все чувствительные значения живут в трёх местах:

**1. Локальные переменные окружения (на машине разработчика):**
Файл `.env.local` (в `.gitignore`):
```
EXPO_TOKEN=<expo-personal-access-token>
APPLE_ID=<email>
APPLE_TEAM_ID=<team-id>
```

**2. EAS Secrets:**
Управляются через `eas secret` CLI:
```
eas secret:create --scope project --name APPLE_ID --value <email>
eas secret:create --scope project --name ASC_APP_ID --value <id>
eas secret:create --scope project --name ASC_APP_SPECIFIC_PASSWORD --value <password>
```
Эти секреты доступны EAS Build и EAS Submit во время облачной сборки.

**3. GitHub Actions Secrets:**
Управляются через Settings → Secrets and variables → Actions:
- `EXPO_TOKEN` — для запуска `eas build` из CI.
- (По мере необходимости — другие).

**Apple credentials:**
- App Store Connect API Key (рекомендуется вместо Apple ID + password) — генерируется в App Store Connect → Users and Access → Keys → App Store Connect API. Скачивается `.p8` файл, хранится в EAS Secrets как многострочное значение.
- Apple Developer Team ID — публичная информация, можно держать в `eas.json` напрямую.

**Принципиально:**
- Никакой `.p8` файл, password, token, sensitive value никогда не коммитится в Git.
- `.gitignore` содержит: `.env.local`, `*.p8`, `*.p12`, `*.cer`, `*.mobileprovision`.
- Если секрет случайно попал в репозиторий — немедленный rotation: revoke в Apple/Expo, создать новый, удалить из истории Git через BFG Repo-Cleaner.

---

## Release process (полностью автоматизирован)

Релиз — это **один git-тег**. После пуша тега всё остальное делает GitHub Actions: собирает, подписывает, отправляет в TestFlight и в App Store Connect, генерирует changelog, создаёт GitHub Release.

### Архитектура автоматизации

```
┌─────────────────────┐
│  git tag v1.0.0     │  ← ваше единственное действие
│  git push --tags    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Actions: release.yml                        │
│                                                     │
│  ① проверки: lint + typecheck + test                │
│  ② EAS Build production (10–20 мин)                 │
│  ③ EAS Submit → App Store Connect → TestFlight     │
│  ④ генерация changelog из conventional commits      │
│  ⑤ создание GitHub Release с changelog             │
│  ⑥ email-уведомление об успехе/ошибке              │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  TestFlight (Apple, 10 мин — несколько часов)       │
│  • internal testers получают сборку автоматически   │
│  • уведомление в TestFlight app на их iPhone        │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  Submit for Review (вручную, один клик в App Store  │
│  Connect; всё уже заполнено)                        │
│  • после первого релиза — заполняется один раз     │
│  • при последующих PATCH-релизах — Submit за 1 клик│
└─────────────────────────────────────────────────────┘
```

### Helper-скрипт для разработчика

Чтобы не помнить команды git tag, в репозитории живёт `scripts/release.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Validate state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean. Commit or stash changes."
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "ERROR: must be on main branch."
  exit 1
fi

git pull --rebase

# Get bump type from arg
BUMP="${1:-patch}"
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Bump version, create commit, create tag, push
npm version "$BUMP" -m "chore(release): bump to %s"
git push origin main
git push origin --tags

echo "Release tag pushed. GitHub Actions will handle the rest."
echo "Monitor progress at: https://github.com/<username>/b787-calculator/actions"
```

Использование:
```bash
./scripts/release.sh patch    # 1.0.0 → 1.0.1
./scripts/release.sh minor    # 1.0.0 → 1.1.0
./scripts/release.sh major    # 1.0.0 → 2.0.0
```

После выполнения скрипта — открыли GitHub Actions tab, наблюдали зелёный статус, через 30–40 минут сборка в TestFlight.

### GitHub Actions workflow `release.yml`

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # required for ncipollo/release-action@v1; without this it fails with 403
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # для генерации changelog

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # Quality gates перед релизом — последняя страховка
      - name: Lint
        run: npm run lint -- --max-warnings=0
      - name: Type check
        run: npm run typecheck
      - name: Test
        run: npm test -- --watchAll=false --passWithNoTests

      # EAS CLI must be installed globally on the runner. `npx eas` pattern fails
      # because eas-cli is not in our package.json deps and npx can't resolve it
      # in the GitHub Actions environment.
      - name: Install EAS CLI
        run: npm install -g eas-cli@latest

      # Production build на серверах Expo
      - name: EAS Build production
        run: eas build --profile production --platform ios --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      # Ждём, пока EAS build завершится, и сразу submit
      - name: EAS Submit to App Store Connect
        run: eas submit --profile production --platform ios --latest --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      # Генерируем changelog из conventional commits
      - name: Generate changelog
        id: changelog
        uses: requarks/changelog-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          tag: ${{ github.ref_name }}

      # Создаём GitHub Release
      - name: Create GitHub Release
        uses: ncipollo/release-action@v1
        with:
          tag: ${{ github.ref_name }}
          body: ${{ steps.changelog.outputs.changes }}
          draft: false
          prerelease: false
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Submit for Review — единственное ручное действие

После того как build автоматически попал в App Store Connect, остаётся **один клик «Submit for Review»**. Все метаданные (description, screenshots, Privacy Policy URL, App Review Notes) **заполнены один раз** и переиспользуются для всех последующих релизов.

При обновлениях:
- App Store Connect помнит большинство полей.
- Меняется только **What's New** (release notes для текущей версии).
- Скриншоты обновляются только при существенном изменении UI.

При **PATCH-релизах** (баг-фиксы) можно использовать опцию **Phased Release** — Apple автоматически раскатывает обновление 7 днями, минимизируя риск.

---

## Полный список автоматизаций

Это сводный список того, что работает само:

| Автоматизация | Триггер | Что делает |
|---------------|---------|------------|
| CI quality gates | каждый PR и push в main | lint, typecheck, jest, coverage threshold |
| EAS Preview Build | каждый PR | собирает .ipa для тестирования в Expo Go / TestFlight internal |
| Auto-format на pre-commit | git commit | Prettier + ESLint --fix на изменённых файлах |
| Type-check на pre-push | git push | typecheck + связанные тесты |
| Production release | git push tag v* | full quality gates → EAS Build → EAS Submit → GitHub Release |
| Changelog generation | при создании Release | парсит conventional commits, генерирует release notes |
| Dependency updates | еженедельно (Dependabot) | PR с обновлениями зависимостей |
| Auto-merge безопасных deps | dependabot PR + green CI | автоматический merge patch-обновлений devDependencies |
| Privacy Policy / Terms на GitHub Pages | push в main с изменениями PRIVACY_POLICY.md | автодеплой статического сайта |
| Crash reports | автоматически Apple | доступны в App Store Connect, никаких действий с вашей стороны |

### Dependabot конфигурация (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "patch"
          - "minor"
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "patch"
          - "minor"
    labels:
      - "dependencies"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Раз в неделю Dependabot создаёт PR-ы с обновлениями. Они проходят CI как обычные PR. Безопасные обновления (patch для devDependencies) могут merge-иться автоматически (см. ниже).

### Auto-merge безопасных Dependabot PR-ов (`.github/workflows/dependabot-auto-merge.yml`)

```yaml
name: Dependabot Auto-merge
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Get Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Auto-merge patch updates of dev dependencies
        if: |
          steps.metadata.outputs.update-type == 'version-update:semver-patch' &&
          steps.metadata.outputs.dependency-type == 'direct:development'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Что merge-ится автоматически:**
- Только PATCH обновления (1.2.3 → 1.2.4) — backwards-compatible bugs fixes.
- Только devDependencies (jest, eslint, prettier и т.п.) — не влияют на production-bundle.
- Только если CI зелёный.

**Что не merge-ится автоматически:**
- MAJOR обновления (требуют человеческого ревью).
- MINOR обновления (могут содержать новые фичи или поведение).
- Любые production-зависимости (expo, react-native, react) — критичные, требуют тестирования.

### Auto-deploy Privacy Policy / Terms на GitHub Pages (`.github/workflows/deploy-pages.yml`)

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
    paths:
      - 'PRIVACY_POLICY.md'
      - 'TERMS_OF_USE.md'
      - '.github/workflows/deploy-pages.yml'

permissions:
  contents: read
  pages: write
  id-token: write

# GitHub Pages best-practice — prevents concurrent deploys racing.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Generate static pages
        run: |
          mkdir -p _site
          if [ -f PRIVACY_POLICY.md ]; then
            npx --yes markdown-to-html-cli --source PRIVACY_POLICY.md --output _site/privacy-policy.html --title "Privacy Policy"
          fi
          if [ -f TERMS_OF_USE.md ]; then
            npx --yes markdown-to-html-cli --source TERMS_OF_USE.md --output _site/terms-of-use.html --title "Terms of Use"
          fi
          cp -r assets/static-pages/* _site/ 2>/dev/null || true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - uses: actions/deploy-pages@v4
        id: deployment
```

Любое изменение `PRIVACY_POLICY.md` или `TERMS_OF_USE.md` в main автоматически обновляет публичный сайт. Ссылки в App Store Connect никогда не «протухают».

### Windows-specific: `.gitattributes` for line endings

Разработчик работает на Windows 11. Git по умолчанию конвертирует `LF` → `CRLF` при checkout-е на Windows (через `core.autocrlf=true`). Это **ломает** husky-хуки (`sh` парсер не понимает CRLF) и `scripts/release.sh` (bash на CI runner-е тоже не запустит CRLF-скрипт).

Решение — `.gitattributes` в корне репо с явным форсом `LF` для shell/husky файлов:

```gitattributes
* text=auto eol=lf
*.sh text eol=lf
*.bash text eol=lf
.husky/* text eol=lf
```

Без этого файла husky pre-commit/pre-push могут молча не исполняться на свежем clone из Windows-окружения, а `scripts/release.sh` упадёт при запуске из CI на Linux.

### Email-уведомления о статусе релизов

В Settings → Notifications GitHub-аккаунта включаются email-уведомления для:
- Failed Actions (при падении любого workflow — приходит email).
- New Releases (при создании GitHub Release — подтверждение релиза).
- Dependabot security alerts (немедленно при обнаружении уязвимости).

Это даёт zero-effort мониторинг — ничего не нужно проверять, узнаёте о проблемах сразу.

---

## OTA updates стратегия (EAS Update)

**В MVP не используется.** Включается в Phase 2+, когда возникнет необходимость в быстрых обновлениях без App Store review.

**Что MOG обновляться через OTA (без re-submit):**
- Текстовые правки (i18n strings).
- Обновление значений в bundled JSON, если структура (`schemaVersion`) не меняется.
- Bug-fixes в TypeScript-коде, не требующие изменения native-зависимостей.

**Что НЕ может обновляться через OTA:**
- Любое изменение Native кода (нечасто в Expo, но бывает).
- Добавление/удаление/обновление native-зависимостей.
- Изменение Privacy Manifest или Info.plist.
- Major-обновления Expo SDK.

**Стратегия каналов:**
- `production` channel — для всех публичных пользователей.
- `preview` channel — для TestFlight beta-тестеров.

**Команда обновления (Phase 2+):**
```
npx eas update --branch production --message "Update operational reference values to 2026-09 revision"
```

**Откат при проблемах:**
```
npx eas update:republish --branch production --update-id <previous-good-update-id>
```

В MVP игнорируем — все обновления идут через App Store. После того как накопится опыт, и проект созреет — настраиваем OTA.

---

## Hotfix process

Если в production обнаруживается критический баг:

**Triage 1: Можно ли исправить через OTA (Phase 2+)?**
- Если bug в TypeScript-коде, не затрагивает native — OTA в production-канал.
- Откат через `eas update:republish` если новое тоже сломано.

**Triage 2: Если OTA не помогает или не настроен — App Store hotfix:**
1. Из `main` создать ветку `fix/critical-<short-name>`.
2. Минимальный фикс — только то, что нужно.
3. Bump PATCH версию (1.0.0 → 1.0.1).
4. PR → merge.
5. EAS Build production → EAS Submit.
6. В App Store Connect использовать **Expedited Review** (одна экстренная заявка на год бесплатно от Apple) — это сокращает review до часов.

**Triage 3: Pull from sale (крайний случай):**
- Если bug критичен и нет быстрого фикса (~24 часа) — временно снимаем приложение с продажи в App Store Connect → Pricing and Availability.
- После фикса — возвращаем availability.

---

## Apple-native crash reporting

Crash-репорты собираются Apple автоматически. Доступны через:
- **App Store Connect → Apps → [your app] → TestFlight → [build] → Crashes** (для бета-сборок).
- **App Store Connect → Apps → [your app] → Analytics → Crashes** (для production).
- **Xcode → Window → Organizer → Crashes** (если у вас будет Mac в будущем — для symbolicated stack traces).

**Crash-репорты содержат:**
- Stack trace (символика Apple делает автоматически из dSYM-файлов, которые EAS Build загружает).
- Версия приложения и ОС.
- Тип устройства.
- НЕ содержат: пользовательских данных, логов из вашего приложения.

**Регулярная процедура:**
- Раз в неделю проверяете Crashes в App Store Connect.
- Если рост crash rate > 0.5% активных установок — расследовать.
- Воспроизводимые краши → создать issue → fix → hotfix-релиз.

---

## Backup и Disaster Recovery

**Что бэкапится:**

- **Код:** автоматически на GitHub при каждом push. Bus factor решён — даже если ваш компьютер сгорит, всё на GitHub.
- **Спецификация:** часть репозитория, бэкапится с кодом.
- **Apple Developer credentials:** App Store Connect API Key (`.p8` файл) храните в **двух местах**: на машине разработчика (`.env.local`) и в безопасном секретном хранилище (1Password, Bitwarden, или зашифрованный USB).
- **EAS credentials и provisioning profiles:** управляются Expo автоматически. Можно при необходимости скачать через `eas credentials` CLI.

**Recovery scenarios:**

**Scenario 1 · Компьютер разработчика отказал.**
- Купить/получить новый компьютер.
- Установить Node, Git, VS Code, Claude Code.
- `git clone https://github.com/<username>/b787-calculator.git`.
- `npm ci`.
- Восстановить `.env.local` из секретного хранилища.
- Продолжить работу. Время восстановления: ~1 час.

**Scenario 2 · Apple Developer Account заблокирован/проблемы с оплатой.**
- Связаться с Apple Developer Support через https://developer.apple.com/contact/.
- В случае невозможности восстановить — создаётся новый аккаунт.
- Приложение пересобирается под новый Bundle ID и сабмитится заново.
- Существующие установки продолжают работать (но не получают обновления).
- Это значимое событие, не рутина. Цель — избегать через своевременную оплату подписки и compliance.

**Scenario 3 · GitHub repository недоступен.**
- На GitHub бывают outages (обычно < 1 часа).
- Локальный клон работоспособен — продолжаем разработку, push при восстановлении.
- В случае длительного outage (> 24 часа) — рассматривается миграция на GitLab или Bitbucket. Маловероятный сценарий.

**Scenario 4 · Случайное удаление main (force push, accidental delete).**
- Branch protection rules запрещают это в первую очередь.
- Если каким-то образом произошло — GitHub хранит reflog, и main можно восстановить через support: https://support.github.com/.

---

## Monitoring (минимизированный)

Большая часть мониторинга автоматизирована — вы не делаете рутины. Вот что остаётся ручного:

**Каждый раз, когда приходит email** (триггер, не расписание):
- Apple App Review notification (approval / rejection / metadata-issue) — реагируете на содержимое.
- GitHub Actions failure — проверяете, что упало (обычно — flaky test, можно re-run).
- Dependabot security alert — ставите в приоритет, обновляете уязвимую библиотеку.

**Раз в неделю** (10–15 минут):
- App Store Connect → Crashes: один взгляд на crash rate (норма ≤ 0.5%).
- App Store Connect → Reviews: при появлении новых отзывов — ответить, если осмысленно.
- GitHub Releases tab: подтвердить, что релизы прошли успешно.

**Раз в квартал** (1–2 часа):
- Ревизия roadmap.
- Чтение Apple Developer News на предмет новых гайдлайнов.
- Major-обновление Expo SDK (если выходило новое) — это всё ещё ручной процесс, потому что MAJOR Expo SDK иногда содержит breaking changes.

**Что больше НЕ делается вручную (благодаря автоматизации):**
- Проверка `npm outdated` — Dependabot создаёт PR автоматически.
- Создание `chore(deps)` PR-ов — Dependabot создаёт.
- Проверка lint/test перед релизом — release.yml workflow проверяет.
- Генерация changelog — workflow генерирует из commits.
- Создание GitHub Release — workflow создаёт.
- Загрузка Privacy Policy на хостинг — deploy-pages.yml автоматически.

---

## Phase B чек-лист (одноразовые setup-задачи)

Эти задачи выполняются один раз при старте Phase B и больше не повторяются. Чек-лист хранится здесь как reference.

- [ ] Установить Node 20 LTS, Git, VS Code, Claude Code на Windows 11.
- [ ] Установить Expo Go на iPhone.
- [ ] Создать GitHub account (если нет).
- [ ] Создать private GitHub repository `b787-calculator`.
- [ ] Настроить branch protection rules в Settings → Branches.
- [ ] Зарегистрироваться в Apple Developer Program ($99/год, юрисдикция Узбекистан, тип Individual).
- [ ] Создать App Store Connect API Key. Скачать `.p8` файл, сохранить в безопасном месте.
- [ ] Зарегистрироваться в Expo (https://expo.dev), получить Personal Access Token.
- [ ] Создать `.env.local` с EXPO_TOKEN и Apple credentials.
- [ ] В GitHub Actions Secrets добавить `EXPO_TOKEN`.
- [ ] Создать в App Store Connect новое приложение «B787 Calculator», получить ASC App ID.
- [ ] Заполнить базовые метаданные в App Store Connect.
- [ ] Создать Privacy Policy и Terms of Use на GitHub Pages из шаблонов в `07-app-store-compliance.md`.
- [ ] Инициализировать Expo проект: `npx create-expo-app . --template default`. **Note:** `default-typescript` шаблон удалён из `create-expo-app` в 2025+. Шаблон `default` теперь TypeScript-by-default и включает `expo-router`. Удалить из шаблона лишние deps согласно `03-tech-stack.md` секция «Removed from default template».
- [ ] Скопировать `tsconfig.json`, `eslint.config.js` (flat config — см. ADR-0005), `.prettierrc.js`, `eas.json` из `08-quality-gates.md` и `09-cicd-and-ops.md`.
- [ ] Создать `babel.config.js` с `babel-preset-expo` + `react-native-worklets/plugin` (последним в plugins; обязателен для `react-native-reanimated@4.x`, который использует `expo-router`).
- [ ] Создать `metro.config.js` с `getDefaultConfig(__dirname)` из `expo/metro-config`.
- [ ] Создать `.npmrc` с `legacy-peer-deps=true` и `save-exact=true` (см. `03-tech-stack.md`).
- [ ] Создать `.gitattributes` с LF-форсингом для shell-скриптов и husky-хуков (см. `08-quality-gates.md` секция «Additional config files»).
- [ ] Установить Husky и настроить pre-commit/pre-push hooks.
- [ ] Скопировать GitHub Actions workflows: `ci.yml`, `release.yml`, `deploy-pages.yml`, `dependabot-auto-merge.yml`.
- [ ] Создать `.github/dependabot.yml`.
- [ ] Создать `scripts/release.sh` и сделать `chmod +x`.
- [ ] Включить GitHub Pages: Settings → Pages → Source: GitHub Actions.
- [ ] Настроить branch protection в Settings → Branches: required CI checks (`quality`, `build-preview`).
- [ ] Включить email notifications: Settings → Notifications → Watching → выбрать «All Activity» для своего репозитория.
- [ ] Создать первый коммит, push в main.
- [ ] Запустить первый EAS preview build, протестировать загрузку в Expo Go.
- [ ] Создать `CLAUDE.md` и `AGENTS.md` (см. отдельный документ).

После прохождения этого чек-листа — Phase B завершена, начинается Phase C (реализация по модулям).

---

## Follow-ups / TODO list (из Phase B exit checkpoint)

Эти пункты не блокируют Phase C, но должны быть адресованы в отдельных PR. Зафиксированы здесь как памятка.

| # | Item | Severity | Когда сделать |
|---|------|----------|---------------|
| T1 | `commitlint` для проверки формата Conventional Commits — не добавлен в Phase B по приоритетам. Низко-затратный gate, можно добавить отдельным PR в любой момент. | low | Phase 2 (или раньше при росте числа коммитов / контрибьюторов) |
| T2 | Dead template assets `assets/images/{partial-react-logo,react-logo,react-logo@2x,react-logo@3x}.png` — оставлены из шаблона `create-expo-app`, не используются нашим кодом. Удалить в chore PR вместе с patch-обновлениями. | low | вместе с `chore(deps)` PR |
| T3 | 22 transitive npm vulnerabilities (4 low + 16 moderate + 2 в dev-deps) — найдены через `npm audit`. Все в transitive deps Expo CLI / sub-tooling. Dependabot security alerts будут отлавливать high/critical и открывать PR-ы. | monitor | passive — Dependabot driven |
| T4 | Migration к `eslint-plugin-boundaries` или `dependency-cruiser` для feature→feature import enforcement (см. `08-quality-gates.md` Architecture lint). | medium | Phase 2 при добавлении 2-го feature |
| T5 | Patch updates: 4 пакета на 1-2 patch отстают (`expo`, `expo-linking`, `@types/react`, `jest-expo`) согласно `expo-doctor`. | low | следующий `chore(deps)` PR |
| T6 | GitHub Actions Node.js 20 deprecation: warning от GitHub — `actions/checkout@v4` и `actions/setup-node@v4` будут принудительно использовать Node 24 с июня 2026. Обновить версии actions заранее. | medium | до июня 2026 |

---

## Open questions

1. App-Specific Password vs App Store Connect API Key для EAS Submit: рекомендуется API Key (более безопасный, не привязан к учётной записи). Решение по умолчанию: API Key.
2. Стоит ли настроить **Slack-уведомления** через GitHub Actions для важных событий (failed release, security alert)? Решение по умолчанию: пока нет, email-уведомлений GitHub достаточно. Добавляем в Phase 2+ если будет потребность.

## Closed questions

- ~~Использование `expo-doctor` в CI?~~ → **Resolved (Phase B):** добавлен в `ci.yml` как advisory non-blocking step (`npx expo-doctor || true`). Не блокирует merge, даёт раннее предупреждение о проблемах совместимости.

---

## Что делает разработчик (минимизированный список)

После того как Phase B настроена, ваш список рутинных действий:

**Для каждой фичи (~30–60 минут):**
1. Запустить Claude Code с подготовленным промптом.
2. Дождаться открытия PR.
3. Открыть PR в браузере — проверить, что CI зелёный.
4. Установить preview-build из PR на iPhone через Expo Go или TestFlight, протестировать функционально.
5. Approve и Merge.

**Для каждого релиза (~2 минуты):**
1. Открыть терминал в проекте.
2. Запустить `./scripts/release.sh patch` (или `minor`/`major`).
3. Открыть GitHub Actions tab — наблюдать за прогрессом.
4. Через ~30 минут получить email о готовности сборки в TestFlight.
5. Один раз — заполнить App Store Connect метаданные (для первого релиза). Все последующие — клик «Submit for Review».

**Каждую неделю (~10 минут):**
1. Проверить App Store Connect → Crashes (один взгляд).
2. Прочитать новые user reviews, ответить если нужно.
3. Просмотреть Dependabot PR-ы, замёрджить осмысленные (большую часть он замержит сам).

**Всё остальное** делается автоматически. Вы не пишете команды git tag, не запускаете eas build вручную, не следите за устареванием зависимостей, не генерируете changelog.

---

## Exit-критерии этого документа

- [ ] Branch strategy (trunk-based + squash merge) одобрена.
- [ ] EAS profiles понятны и не вызывают возражений.
- [ ] Стратегия secrets management одобрена.
- [ ] Versioning стратегия (semver) и автоматизация через `release.sh` одобрены.
- [ ] Release process от тега до публикации понятен.
- [ ] Полная картина автоматизаций (Dependabot, auto-merge, release workflow, GitHub Pages) одобрена.
- [ ] Phase B чек-лист содержит все необходимые шаги для setup автоматизаций.
- [ ] Open questions либо закрыты, либо явно отложены.
