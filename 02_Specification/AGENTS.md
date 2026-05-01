# AGENTS.md — Instructions for AI Coding Agents

> **For Claude Code, Cursor, and other AI coding assistants working in this repository.**
>
> This file is your operational charter. Read it in full before any task.

---

## Project context

**B787 Calculator** is an iOS/iPadOS application written in TypeScript using React Native + Expo SDK. It is a public App Store advisory calculator for Boeing 787 pilots. The single most important architectural goal is **clean code, clean architecture, and long-term maintainability**.

The developer (referred to as "the user" in this document) does not perform deep code review. They review functionality through Expo Go on iPhone. Therefore, **automated quality gates are your second pair of eyes** — never bypass them.

---

## Required reading before any task

You MUST read these files before starting any non-trivial task. Do not start coding until you have read all relevant files.

**Always required:**
- `CLAUDE.md` (root of repo) — project-level rules.
- `02_Specification/AGENTS.md` (this file).
- `02_Specification/01-vision.md` — what we're building and why.
- `02_Specification/02-architecture.md` — architectural rules.

**Required when relevant to the task:**
- `02_Specification/03-tech-stack.md` — when adding/updating dependencies.
- `02_Specification/04-domain-model.md` — when working with types or data models.
- `02_Specification/05-crosswind-algorithm.md` — when working on crosswind calculation logic.
- `02_Specification/06-ui-spec.md` — when working on UI/screens.
- `02_Specification/07-app-store-compliance.md` — when working on disclaimers, Privacy Manifest, or App Store Listing.
- `02_Specification/08-quality-gates.md` — always relevant.
- `02_Specification/09-cicd-and-ops.md` — when working on CI/CD or release process.
- `02_Specification/module-contracts/<module>.md` — when working on a specific module.
- Relevant `02_Specification/ADR/*.md` — when relevant decisions are referenced.

If a prompt explicitly lists files — those are the minimum, but you may read additional files if useful. **Never skip listed files.**

---

## Behavior rules

### Rule 1 · Specification is the source of truth

If your understanding of the project conflicts with the specification documents — the specification is correct. If you believe the specification is wrong — STOP and ask the user. Do not silently deviate.

### Rule 2 · Stop on ambiguity

If any aspect of the task is ambiguous, unclear, or appears underspecified — STOP and ask the user before proceeding. Do not make assumptions. Examples of when to ask:
- Spec says X in one place and Y in another (contradiction).
- Spec doesn't mention how to handle a specific edge case.
- A library has multiple usage patterns, and the spec doesn't specify which.
- An architectural decision needs to be made that isn't covered by an existing ADR.

When asking, be specific: quote the conflicting passages, describe the edge case, list the alternatives.

### Rule 3 · Never bypass quality gates

If any of the following is true, your task is **not done**:
- ESLint reports any error or warning.
- TypeScript reports any error.
- Jest tests fail.
- Coverage thresholds are not met.
- Any architectural lint rule (no-restricted-paths) fails.

Fix the root cause. Never disable a rule or use `// eslint-disable-next-line` without an extremely strong reason documented in a comment, and never commit a `--no-verify` bypass.

### Rule 4 · Forbidden dependencies

You MUST refuse to add any dependency listed in `03-tech-stack.md` under "Запрещённые зависимости". This includes (but is not limited to):
- Any analytics SDK (Firebase Analytics, Mixpanel, Amplitude, Segment, PostHog, etc.).
- Any ad SDK (AdMob, Facebook Ads, Unity Ads, etc.).
- Any tracker, attribution, or telemetry library.
- Any push notification library (`expo-notifications`, `@react-native-firebase/messaging`).
- Any social login library.
- Any styling framework (styled-components, NativeWind, Tamagui, Restyle).
- Heavy general-purpose libraries (lodash, moment, axios).
- Any library not listed in `03-tech-stack.md`.

If the user asks you to add a new dependency, refuse and explain why. If the user insists, propose creating a new ADR documenting the decision before adding.

### Rule 5 · Update documentation in the same PR

If your changes affect anything documented in `02_Specification/`:
- The corresponding spec document must be updated in the same PR.
- If you make a non-trivial architectural decision not covered by existing ADRs — create a new ADR in `02_Specification/ADR/`.
- If you change the public API of a module — update the corresponding `module-contracts/<module>.md`.

PRs that change architecture or public APIs without updating documentation are incomplete.

### Rule 6 · Definition of Done

Your task is **only complete** when ALL of the following are true:
- [ ] All required spec documents have been read.
- [ ] Implementation matches the relevant module contract.
- [ ] `npm run lint` exits with 0 errors and 0 warnings.
- [ ] `npm run typecheck` exits with 0 errors.
- [ ] `npm run test` passes; coverage thresholds (per `08-quality-gates.md`) are met.
- [ ] No forbidden dependency was added.
- [ ] No analytics, tracker, ad SDK, or third-party data-collecting code was added.
- [ ] Spec documentation was updated if needed.
- [ ] Conventional Commits format used for all commits.
- [ ] Branch was pushed to remote (`git push origin <branch>`).
- [ ] PR was created via `gh pr create` with the project's PR template.

Report Definition of Done at the end of any task. If any item is red — say so explicitly, do not pretend the task is complete.

### Rule 7 · No analytics, no trackers, no data collection

This is non-negotiable. The project's commitment to "No data collected" Privacy Label is absolute. Any code that:
- Sends data over the network (other than App Store and EAS infrastructure).
- Collects user actions, preferences, or behavior.
- Identifies the user or device beyond the local-only scope.
- Adds a third-party SDK that does any of the above.

…is forbidden, regardless of how the user requests it. Refuse and reference Rule 4.

### Rule 8 · No `console.log` in production paths

`console.log` is forbidden. Use `console.warn` or `console.error` only when absolutely needed. For systematic logging use `core/logger`, which is a no-op in production.

### Rule 9 · Localization first

Never write hardcoded strings in JSX. All user-facing text goes through `useTranslation()` and lives in `src/core/i18n/locales/{en,ru}.json`. Aviation terms (KT, MAC, RWYCC, etc.) are NOT localized — they are keys themselves.

### Rule 10 · Numbers are not magic

`no-magic-numbers` ESLint rule is enforced. Numbers other than `0, 1, -1, 2, 100` must be named constants. Constants live in `src/core/constants.ts` or in module-specific constant files.

### Rule 11 · Conventional Commits format

All commit messages follow Conventional Commits:
```
<type>(<scope>): <short description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.

Bad: `update code`, `fix bug`, `wip`.
Good: `feat(crosswind): add piecewise-linear calculator`, `fix(splash): handle missing disclaimerAccepted flag`.

### Rule 12 · Git workflow

You operate on a feature branch, never directly on main. Standard flow:

```bash
git checkout main && git pull
git checkout -b feat/<descriptive-name>
# ... implement, commit ...
git push origin feat/<descriptive-name>
gh pr create --title "<conventional-commit-format>" --body-file .github/pull_request_template.md
```

Always push commits to remote (`git push origin <branch>`) — do not leave them only locally. Always use `gh pr create` to open PRs from the terminal.

### Rule 13 · Tests are part of the implementation

Every feature includes its tests. Tests are written either before or alongside production code (TDD or interleaved), never as a follow-up. PR without tests for new functionality is incomplete.

For domain logic — full unit test coverage from `05-crosswind-algorithm.md` test table is required.

### Rule 14 · One file at a time discipline

Avoid touching unrelated files in the same PR. If you find a bug elsewhere while implementing your task — note it as a TODO referencing a new GitHub Issue, do NOT fix it in this PR. Atomic PRs are easier to review and revert.

### Rule 15 · Respect the architectural escalation triggers

The architecture is designed pragmatically (`02-architecture.md`). If during implementation you trigger one of the **escalation triggers** (file > 200 lines, function > 80 lines, complexity > 10, multiple data sources in a feature, presentation layer doing business logic, etc.) — escalate the architecture before completing the task. This means:
- For complexity issue: refactor into smaller functions.
- For multi-source feature: introduce explicit Use Case classes.
- For presentation business logic: move to domain.

Do NOT silently accept code that triggers a quality concern. Fix it as part of the same task.

### Rule 16 · No silent decisions

If you make a decision that isn't explicitly covered by the spec — surface it. Either:
- Pause and ask the user (preferred).
- Make the decision but document it in the PR description, listed as "Decisions made not in spec — these may need to become ADRs".

The user will then decide whether to formalize as ADR or revert.

### Rule 17 · You don't access secrets

You do not have access to `.env.local`, EAS secrets, or GitHub Actions secrets. If a task requires a secret value (e.g., Apple ID, EXPO_TOKEN) — ask the user, do not invent or guess.

### Rule 18 · Performance budget

Be aware of the performance budget in `08-quality-gates.md`. If your implementation might exceed it (e.g., loading large JSON synchronously on startup, complex computations on every keystroke) — flag it and propose lazy loading or memoization.

### Rule 19 · Expo SDK compatibility

Always check that any new dependency is compatible with the current Expo SDK version. Use Expo's `npx expo install <package>` for managed dependencies whenever available. Do not install raw `npm install` versions of packages that have an Expo wrapper (e.g., `react-native-async-storage` — install via Expo, not directly).

### Rule 20 · Communication style

When reporting on completed work:
- Be concise. Bullet points over paragraphs.
- List what was implemented, what tests were added, what was NOT done (and why if applicable).
- Provide the PR URL.
- Confirm Definition of Done item-by-item.

When asking for clarification:
- Quote the relevant spec passage.
- Describe the ambiguity precisely.
- List 2–3 alternative interpretations and your recommendation.

---

## Work-flow within a single sprint

A "sprint" in this project means: implement one module per the corresponding prompt and module contract. Typical structure:

**Step 1 · Read.**
Read all required files. After reading, summarize in 5–10 bullet points your understanding of the task. Wait for user confirmation ("go") before proceeding to Step 2.

**Step 2 · Plan.**
Outline the files you intend to create/modify. List in order of implementation. Wait for user confirmation if the plan deviates from what the spec implies.

**Step 3 · Scaffold.**
Create the module's folder structure. Create empty files with their public API signatures and TODO comments. Verify structure compiles (typecheck passes).

**Step 4 · Implement domain.**
Domain layer first (types, calculation logic, validators). Write tests alongside.

**Step 5 · Implement data.**
Data layer (repository, JSON loading, schema validation). Tests for repository.

**Step 6 · Implement presentation.**
Presentation layer (screens, view-models, hooks). Snapshot/component tests where reasonable.

**Step 7 · Wire up.**
Wire the module into App Shell (navigation, providers). Run the app via `npx expo start` and verify functionally (you can ask user to do this through Expo Go if needed).

**Step 8 · Verify Definition of Done.**
Run full quality gate suite locally. Fix any failures. Repeat until all green.

**Step 9 · Create PR.**
Push to remote, create PR with proper description and Definition of Done checklist.

**Step 10 · Report.**
Summary of what was done, link to PR, confirmation of Definition of Done.

---

## Forbidden actions

These actions are explicitly forbidden. If a user request asks for any of these — refuse and explain.

- Adding analytics, ads, trackers, telemetry of any kind.
- Adding push notifications, social login, in-app purchase.
- Bypassing CI gates.
- Editing main branch directly.
- Force-pushing to main or any protected branch.
- Committing `.env.local`, `*.p8`, `*.p12`, or any secret file.
- Hardcoding API keys, tokens, or credentials in code.
- Adding network requests (the app is fully offline).
- Disabling Privacy Manifest or modifying it to hide data collection.
- Adding TODO comments without an associated GitHub Issue.
- Changing Apple Developer credentials, certificates, or signing settings.
- Modifying spec documents marked as "принят" without an ADR.
- Adding dependencies not in `03-tech-stack.md` without prior ADR.
- Committing build artifacts (`*.ipa`, `dist/`, `.expo/`).
- Modifying `app.json` Bundle ID without coordination with user (it ties to App Store Connect).

---

## Required PR template

Every PR includes the following sections (template lives at `.github/pull_request_template.md`):

```markdown
## What this PR does

Brief 1–2 sentence summary.

## Spec references

- Implements: [path to spec doc / module-contract]
- Related ADRs: [list]
- Closes Issues: [list]

## Implementation notes

Key decisions, trade-offs made.

## Decisions not in spec

Any decisions you made that aren't explicitly covered by the spec, requiring user review.

## Definition of Done

- [ ] Required spec documents read.
- [ ] Implementation matches module contract.
- [ ] `npm run lint` exits with 0 errors / 0 warnings.
- [ ] `npm run typecheck` exits with 0 errors.
- [ ] `npm run test` passes; coverage thresholds met.
- [ ] No forbidden dependency added.
- [ ] No analytics / tracker / ad SDK / data-collecting code added.
- [ ] Spec docs updated if needed.
- [ ] Conventional Commits used.
- [ ] Branch pushed to remote.

## Manual testing instructions

What the reviewer (the user) should do in Expo Go to verify functionality. Concrete steps.
```

---

## How the user reviews your PR

The user does **functional review through Expo Go**, not deep code review. Their workflow:

1. Open the PR URL in the browser.
2. Read your PR description (especially "Manual testing instructions").
3. Connect iPhone to computer (or via local network).
4. Open Expo Go on iPhone.
5. Scan the QR code from the EAS preview build (linked in CI output) or from `npx expo start --tunnel`.
6. Test the functionality per your instructions.
7. If it works as expected — approve and merge via GitHub UI.
8. If something is off — leave a GitHub PR comment describing what they observed.

For this to work smoothly:
- Always include clear, concrete "Manual testing instructions" in the PR description.
- Always make sure the EAS preview build succeeded (CI is green).
- Always describe the expected user-visible outcomes.

---

## When you're stuck

If you cannot complete a task:

1. **Document where you are.** What is implemented, what isn't, why.
2. **Document the blocker.** Specific error message, ambiguity in spec, missing information.
3. **Propose options.** 2–3 paths forward, with your recommendation.
4. **Stop and ask the user.** Do not commit incomplete or broken code.

A half-done task left as a draft PR with clear blocker description is much better than a "completed" task that doesn't actually work.

---

## Final note

This file is part of the project specification. If you find that following these rules would prevent you from completing a task — that is a signal that either the task or the spec needs adjustment. **Surface this to the user immediately.** Do not silently bend the rules.

The user is depending on these rules to ensure that the code quality and architectural integrity remain high without their direct supervision. Honor this trust.
