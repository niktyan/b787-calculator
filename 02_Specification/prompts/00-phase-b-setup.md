# Prompt 00 · Phase B Setup

> **Когда использовать:** один раз, в самом начале проекта, после того как вы сами выполнили предварительные шаги (см. ниже).
>
> **Что произойдёт после:** Claude Code инициализирует Expo-проект, настроит TypeScript, ESLint, Prettier, Husky, GitHub Actions, EAS, создаст первый коммит и запустит preview-build.

---

## ⚠️ ПЕРЕД ВСТАВКОЙ ПРОМПТА — выполните эти шаги вручную

Эти действия может сделать только человек (требуют интерактивных действий в браузере и оплаты):

1. **Установите** на Windows 11:
   - Node.js 20 LTS — https://nodejs.org/en/download/
   - Git for Windows — https://git-scm.com/download/win
   - GitHub CLI — https://cli.github.com/
   - Claude Code — следуйте инструкциям Anthropic.
   - Expo Go на iPhone — App Store, бесплатно.

2. **Зарегистрируйтесь** (если ещё нет):
   - GitHub account — https://github.com/.
   - Apple Developer Program ($99/год) — https://developer.apple.com/programs/. Юрисдикция: Узбекистан, тип: Individual.
   - Expo account — https://expo.dev/signup, бесплатно.

3. **Создайте Apple credentials:**
   - Войдите в https://appstoreconnect.apple.com/.
   - Перейдите в Users and Access → Keys → App Store Connect API.
   - Сгенерируйте новый ключ с правами «Admin».
   - Скачайте `.p8` файл и сохраните в безопасном месте (1Password, Bitwarden или зашифрованный USB).
   - Запишите Key ID и Issuer ID.

4. **Получите Expo Personal Access Token:**
   - Войдите в https://expo.dev/.
   - Account Settings → Access Tokens → Create token.
   - Скопируйте сгенерированный токен (показывается один раз).

5. **Создайте private GitHub repository:**
   - Имя: `b787-calculator`.
   - Visibility: Private.
   - НЕ инициализируйте README, .gitignore или license — Claude сделает.
   - Запишите URL: `https://github.com/<your-username>/b787-calculator`.

6. **Откройте терминал** в папке `C:\Users\Николай\Desktop\Проект B787` и запустите:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your-email@example.com"
   gh auth login
   ```
   Авторизуйтесь в GitHub CLI.

7. **Запустите Claude Code:**
   ```bash
   claude
   ```

После этого вставьте текст ниже в окно Claude Code.

---

## ⬇️ ПРОМПТ ДЛЯ КОПИРОВАНИЯ ⬇️

```
You are Claude Code working on the b787-calculator project. This is the Phase B
setup task — initializing the project from scratch.

# Required reading (in this order, before any action)

Read all of these files in full before doing anything:

- 02_Specification/README.md
- 02_Specification/AGENTS.md
- 02_Specification/01-vision.md
- 02_Specification/02-architecture.md
- 02_Specification/03-tech-stack.md
- 02_Specification/08-quality-gates.md
- 02_Specification/09-cicd-and-ops.md
- 02_Specification/ADR/0001-clean-architecture-only-at-module-boundaries.md
- 02_Specification/ADR/0002-react-native-expo-over-native-swift.md

After reading, summarize in 10 bullet points:
- What is the project.
- What stack we're using (with key versions).
- What architectural rules apply.
- What quality gates exist.
- What CI/CD automations are required.

WAIT for me to say "go" before proceeding to setup.

# Task: initialize the project

After my "go", perform these steps in order. Push commits to GitHub frequently
(after each major step), so I can see progress in the Actions tab.

1. Initialize Expo project at the workspace root (parallel to 02_Specification):
   `npx create-expo-app . --template default-typescript`
   Use latest stable Expo SDK as recommended by `03-tech-stack.md`.

2. Configure TypeScript per `08-quality-gates.md`:
   - Replace tsconfig.json with the strict config from the spec.
   - Set up path aliases (@/, @core/, @design/, @features/).

3. Configure ESLint:
   - Install all required plugins per `08-quality-gates.md`.
   - Create .eslintrc.js with the full ruleset from the spec.
   - Verify `npm run lint` exits cleanly on the empty project.

4. Configure Prettier:
   - Create .prettierrc.js per the spec.
   - Verify formatting works.

5. Set up Husky and lint-staged:
   - Install husky.
   - Configure pre-commit and pre-push hooks per `08-quality-gates.md`.
   - Verify hooks block bad commits (test with intentionally bad file).

6. Create folder structure per `02-architecture.md`:
   - src/app/, src/core/, src/design-system/, src/features/, src/data/.
   - Add empty index.ts barrels in each.
   - Add ARCHITECTURE_PLACEHOLDER.md in each empty folder explaining purpose.

7. Configure expo-router per `03-tech-stack.md`:
   - Set up app/ directory with _layout.tsx and a placeholder index.tsx.

8. Set up CI/CD:
   - Create .github/workflows/ci.yml per `08-quality-gates.md`.
   - Create .github/workflows/release.yml per `09-cicd-and-ops.md`.
   - Create .github/workflows/deploy-pages.yml per `09-cicd-and-ops.md`.
   - Create .github/workflows/dependabot-auto-merge.yml per `09-cicd-and-ops.md`.
   - Create .github/dependabot.yml per `09-cicd-and-ops.md`.

9. Create scripts/release.sh per `09-cicd-and-ops.md`. Make it executable.

10. Create EAS config:
    - eas.json per `09-cicd-and-ops.md` (development, preview, production profiles).
    - Replace placeholder values with what I provide (Apple ID, ASC App ID,
      Apple Team ID — ASK ME for these before writing).

11. Create .gitignore that excludes:
    - node_modules, .expo, dist, *.ipa, *.p8, *.p12, .env*, but NOT .env.example.

12. Create .env.example with placeholder structure for EXPO_TOKEN and Apple credentials.

13. Create CLAUDE.md at root linking to 02_Specification/AGENTS.md and quick-reference rules.

14. Create .github/pull_request_template.md per the template in `AGENTS.md`.

15. Create root README.md with project overview, links to spec, basic developer instructions.

16. Set up git remote, commit everything, push to GitHub:
    git init (if not already)
    git remote add origin https://github.com/<asks-me-for-username>/b787-calculator.git
    git add .
    git commit -m "chore: initial project setup with Expo, TypeScript, CI/CD"
    git push -u origin main

17. Verify CI runs successfully on GitHub. If anything is red — fix it.

18. Trigger first preview build via EAS:
    `npx eas build --profile preview --platform ios`
    This requires my interactive input for Apple credentials the first time.
    Pause and let me complete that interactively.

# Definition of Done

- [ ] All required files read.
- [ ] All 18 setup steps completed.
- [ ] `npm run lint` passes with 0 errors.
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npm run test` passes (no tests yet, but config works).
- [ ] CI workflow on GitHub passes for the initial commit.
- [ ] First EAS preview build successfully started.
- [ ] All changes pushed to main on GitHub.

# Hard constraints

- ASK me for Apple credentials and GitHub username — do not assume.
- ASK me for support email — do not assume.
- Do NOT add any dependency not listed in `03-tech-stack.md`.
- Do NOT commit any secret (.p8 file, tokens, passwords).
- If something fails — STOP and ask me, do not proceed with workarounds.

# When done

Report:
1. Brief summary of what was set up.
2. Confirmation of Definition of Done.
3. Link to first GitHub Action run.
4. Link to EAS build status page.
5. Any decisions you made not in the spec.
```

---

## После завершения

Когда Claude Code отчитается о завершении:

1. **Откройте GitHub** в браузере: https://github.com/<your-username>/b787-calculator/actions
2. Убедитесь, что initial CI прошёл зелёным.
3. **Откройте https://expo.dev/accounts/[your-account]/projects/b787-calculator/builds**
4. Дождитесь завершения первого preview-build (10–20 минут).
5. Когда build готов — отсканируйте QR код через Camera на iPhone, откроется через Expo Go (или TestFlight, если настроено).
6. Должен открыться placeholder Expo-экран — это ожидаемо. Реальный UI появится после следующих спринтов.

После успешного теста — переходите к следующему промпту: `01-sprint-core.md`.
