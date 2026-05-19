# Phase D Playbook · App Store Submission

> **Когда использовать:** один раз, после того как Phase C завершена и все
> технические аудиты (i18n, accessibility, contrast) замёрджены в main.
> Этот документ ведёт через **release engineering + App Store submission
> cycle** до момента, когда приложение опубликовано в App Store.
>
> **Это не "одношаговый промпт".** Phase D — это последовательность ~10
> шагов, часть из которых **исполняет пользователь** (всё что требует
> Apple-логина, дизайн-решений, mailbox-провижининга), а часть —
> **исполняет агент** (правка кода/конфига, верификация, релизные команды).
> Каждая секция явно помечает, кто что делает.
>
> **Это не дубль спеки.** Каждый текст / шаблон / параметр живёт в
> `02_Specification/07-app-store-compliance.md` или
> `02_Specification/09-cicd-and-ops.md`. Playbook ссылается, не
> копирует. Если playbook расходится со спекой — спека правее.

---

## Section 0 · Phase D overview

**Что такое Phase D.** Release engineering + App Store submission cycle.
От «main зелёный после accessibility audit» до «приложение скачивается
из App Store в любой точке мира».

**Prerequisites checklist** (всё ниже должно быть TRUE перед началом
Section 1):

- [ ] Apple Developer Program — Individual, активная подписка ($99/год).
      Юрисдикция Узбекистан (см. `01-vision.md` § Stakeholders).
- [ ] Apple Developer Team ID совпадает с `eas.json` → `submit.production.ios.appleTeamId`.
- [ ] Expo account активен, EAS Production plan ($19/мес) подключён ИЛИ
      free tier с лимитом 30 build/мес учитывается (cм. `03-tech-stack.md`
      § EAS).
- [ ] EAS credentials configured — `eas credentials` для iOS production
      profile работает без ошибок.
- [ ] App Store Connect API Key (`.p8`) выпущен и доступен через EAS
      Secrets (см. `09-cicd-and-ops.md` § Secrets management).
- [ ] Bundle ID `com.niktyan.b787calculator` в `app.json` →
      `expo.ios.bundleIdentifier` соответствует записи в App Store
      Connect. **Не менять без согласования** (см.
      `AGENTS.md` § Forbidden actions).
- [ ] `main` ветка зелёная: `npm run lint` / `typecheck` / `test` exit 0,
      все Phase-C аудит-PR замёрджены (i18n, accessibility, accent contrast).
- [ ] GitHub Pages включён (Settings → Pages → Source: GitHub Actions) —
      `deploy-pages.yml` уже на месте, ждёт первый `PRIVACY_POLICY.md` /
      `TERMS_OF_USE.md` в main.

**Total time estimate (wall-clock):**

| Этап | Время |
|------|-------|
| Prep (Sections 1–5) | 3–5 дней |
| Production build + TestFlight beta (Sections 6–7) | 1–2 недели |
| Apple Review + release (Sections 8–9) | 1–3 дня (часы при последующих апдейтах) |
| **Итого до live App Store presence** | **2–4 недели** |

**Output.** Приложение доступно для установки из App Store глобально.
Search-able, downloadable, рейтинг 4+, Privacy Label «No data collected».

**Что играет роль single source of truth для каждого артефакта:**

| Артефакт | Source of truth | Section |
|----------|------------------|---------|
| Privacy Policy + Terms of Use тексты | `07-app-store-compliance.md` § Privacy Policy + § Terms of Use | §2 |
| App Store Listing texts (название, описание, keywords, …) | `07-app-store-compliance.md` § App Store Listing texts | §4 |
| App Review Notes | `07-app-store-compliance.md` § App Review Notes | §4 |
| Disclaimer texts в коде | `07-app-store-compliance.md` § Тексты дисклеймеров | (уже в коде) |
| Privacy Manifest конфиг | `07-app-store-compliance.md` § Privacy Manifest | (уже в bundle) |
| Bundle ID, version, build number | `app.json` + `package.json` | §6 |
| EAS submit конфигурация | `eas.json` | §6 |
| Release script + GitHub Actions release flow | `09-cicd-and-ops.md` § Release process | §6 |
| Rejection strategy | `07-app-store-compliance.md` § Стратегия при rejection | §8 |
| Outstanding placeholders register | `07-app-store-compliance.md` § Outstanding placeholders for Phase D | §2, §3 |

---

## Section 1 · App icon design + assets

> **Status:** ✅ **Completed 2026-05-16** — production icon (Variant A,
> typographic «B7» badge `#00C2A8` on Dark page `#0A0E14`) integrated
> via branch `chore/production-icon`. Splash-screen background aligned
> with icon background (`#0A0E14`, light + dark) for seamless launch
> → icon transition. Design rationale and master-file specifics: see
> `02_Specification/07-app-store-compliance.md` § App Store Listing
> texts → App Icon.

**Цель.** Заменить placeholder Expo-иконку финальной production-иконкой.

### USER DOES (deliberate design work)

1. Решить концепт. Опции для рассмотрения (не исчерпывающий список):
   - Типографический «B787» или «B7» badge на brand-фоне.
   - Силуэт Boeing 787 как монограмма.
   - Геометрическая absrtaction на основе формы крыла / хвоста.
   - Что-то другое — иконка остаётся одним из самых видимых атрибутов
     бренда; разумно потратить время.
2. Использовать существующую палитру (см. `02_Specification/06-ui-spec.md`
   § Темы и design tokens):
   - Brand accent `#00C2A8`.
   - Soft accent `#003C36`.
   - Dark page `#0A0E14`.
3. Сделать 1024×1024 RGB master в инструменте на выбор (Figma, Sketch,
   Affinity Designer, Procreate на iPad).
4. **Экспортировать как PNG без alpha-канала.** Apple отклоняет иконки
   App Store с прозрачностью.
5. Сохранить как `assets/images/icon.png` в репозитории (замещая
   текущий placeholder). Имя файла должно совпадать с тем, что
   указано в `app.json` → `expo.icon`.
6. **Опционально:** проектировать adaptive icon для Android. Defer для
   MVP — App Store submission ориентирован на iOS only.

### AGENT DOES (config + verification)

Через отдельный PR (рекомендуемый branch: `chore/production-icon`):

1. Открыть `assets/images/icon.png` и убедиться, что:
   - Размер строго 1024×1024 пикселей.
   - RGB color mode, **без alpha-канала**.
   - PNG-формат, не JPEG (App Store требует PNG).
2. Проверить `app.json` → `expo.icon` указывает на правильный путь
   (`./assets/images/icon.png` на момент Phase B — изменений не требуется).
3. Запустить `npx expo prebuild` для регенерации iOS native артефактов
   (если используется bare workflow; для managed Expo workflow — не
   обязательно, EAS Build делает prebuild автоматически).
4. Опционально, при наличии Mac или iOS Simulator — проверить, что
   иконка корректно отображается на home screen. Иначе — через Expo Go.
5. Открыть PR с заголовком `chore(assets): final app icon for production`.

### DoD

- [ ] `assets/images/icon.png` существует, 1024×1024 RGB, без alpha.
- [ ] `app.json` ссылается на корректный путь.
- [ ] Иконка визуально проверена на устройстве (Expo Go / Simulator).
- [ ] Старый placeholder больше не присутствует ни в одном bundle-артефакте.
- [ ] CI green; PR merged в main.

---

## Section 2 · Privacy Policy + Terms of Use publication

> **Status:** ✅ **Complete 2026-05-19.** `PRIVACY_POLICY.md` и
> `TERMS_OF_USE.md` опубликованы в корне репозитория через PR #78
> с разрешёнными плейсхолдерами: support email →
> `supportb787calculator@protonmail.com`; effective + last-updated
> dates → `19 May 2026`. `deploy-pages.yml` задеплоил HTML-копии на
> GitHub Pages; обе URL верифицированы 200 OK:
> `https://niktyan.github.io/b787-calculator/privacy-policy.html`,
> `https://niktyan.github.io/b787-calculator/terms-of-use.html`.
> `src/core/constants.ts` обновлён до production-значений через
> PR #79 (Phase D Section 2+3 closure).

**Цель.** Опубликовать Privacy Policy и Terms of Use по стабильным
публичным URL, заменить плейсхолдеры в `src/core/constants.ts`.

> **Backbone уже на месте.** В репозитории живёт workflow
> `.github/workflows/deploy-pages.yml` (см. `09-cicd-and-ops.md` §
> «Auto-deploy Privacy Policy / Terms на GitHub Pages»), который
> автоматически конвертирует `PRIVACY_POLICY.md` и `TERMS_OF_USE.md`
> из корня репозитория в HTML и публикует на GitHub Pages при push в
> main. GitHub Pages должен быть включён в Settings → Pages → Source:
> GitHub Actions (см. Prerequisites checklist).

### USER DOES

1. Выбрать хостинг. Рекомендация: **GitHub Pages** (нативно через уже
   готовый workflow, бесплатно, URL шаблон
   `https://niktyan.github.io/b787-calculator/privacy-policy.html`).
   Альтернативы (Notion public page, Vercel static) допустимы, но
   потребуют ручного обновления URL вместо auto-deploy.
2. Финализировать **support email** (см. Section 3) — обе политики
   ссылаются на него в секции «Contact».
3. Финализировать дату вступления — обычно дата первого публичного
   релиза, либо дата начала бета-тестирования.

### AGENT DOES

В отдельном PR (рекомендуемый branch: `chore/phase-d-privacy-terms`):

1. Создать `PRIVACY_POLICY.md` в корне репозитория с текстом из
   `02_Specification/07-app-store-compliance.md` § «Privacy Policy
   (полный текст)». Заменить `[Phase B finalization date]` и
   `[support email]` на реальные значения.
2. Создать `TERMS_OF_USE.md` в корне репозитория с текстом из
   `02_Specification/07-app-store-compliance.md` § «Terms of Use
   (полный текст)». Те же замены плейсхолдеров.
3. Обновить `src/core/constants.ts`:
   - `PRIVACY_POLICY_URL` → `https://niktyan.github.io/b787-calculator/privacy-policy.html`
     (или альтернативный финальный URL).
   - `TERMS_OF_USE_URL` → `https://niktyan.github.io/b787-calculator/terms-of-use.html`.
   - Удалить JSDoc-комментарий «Phase D placeholders» — он становится
     неверным.
4. Убедиться, что `npm run lint` / `typecheck` / `test` зелёные.
5. Открыть PR с заголовком `chore(constants): Phase D — replace
   Privacy/Terms placeholders with live URLs`.

После merge в main:

- `deploy-pages.yml` автоматически опубликует HTML-копии.
- В течение ~1 минуты обе URL начнут отдавать 200 OK.

### DoD

- [ ] `PRIVACY_POLICY.md` и `TERMS_OF_USE.md` в корне репозитория, без
      плейсхолдеров.
- [ ] Обе финальные URL возвращают 200 OK и читаемый текст.
- [ ] About → Privacy policy / Terms of use rows в приложении открывают
      корректные страницы через `WebBrowser.openBrowserAsync`.
- [ ] Старый `<github-username>` placeholder отсутствует во всём
      codebase (`grep`-проверка).
- [ ] `07-app-store-compliance.md` § Outstanding placeholders — отметить
      этот пункт как закрытый (см. § «Outstanding placeholders» в
      следующем `docs(spec)` PR или в этом же PR).
- [ ] CI green; PR merged.

---

## Section 3 · Support email setup

> **Status:** ✅ **Complete 2026-05-19.** Mailbox
> `supportb787calculator@protonmail.com` зарегистрирован на ProtonMail
> и активен. `SUPPORT_EMAIL` в `src/core/constants.ts` обновлён через
> PR #79 (Phase D Section 2+3 closure) — этой правки достаточно, чтобы
> покрыть About → Support row и error-screen «Contact support» button
> за одно изменение. Placeholder `[support email]` в App Review Notes
> (см. `07-app-store-compliance.md` § App Review Notes) намеренно
> оставлен как template — будет заменён одноразово на этапе Section 4
> при копировании текста в App Store Connect → App Review Information.

**Цель.** Активный, регулярно проверяемый mailbox, на который ссылаются
About-row, error-screen, App Store Connect → Support URL и App Review
Notes.

### USER DOES

1. Зарегистрировать почтовый ящик. Опции:
   - **Personal alias** — `niktyan+b787@protonmail.com` (быстрое решение,
     не требует домена).
   - **Dedicated address** — `support@b787calculator.app` (требует
     домена + mail-провайдера; более профессионально, но за деньги и
     dns-настройки).
2. **Критично:** настроить уведомления — Apple Review реально кликает
   `mailto:` ссылку в Support URL и в App Review Notes. Bouncing /
   non-existent адрес = гарантированный rejection по гайдлайну 1.5 или
   5.6 (см. `07-app-store-compliance.md` § Стратегия при rejection).
3. Записать выбранный адрес — он понадобится в Sections 2 и 4.

### AGENT DOES

В рамках того же PR, что и Section 2 (`chore/phase-d-privacy-terms`),
либо в отдельном PR `chore/phase-d-support-email`:

1. Обновить `src/core/constants.ts` → `SUPPORT_EMAIL` на финальный
   адрес.
2. Убедиться, что:
   - `src/app/error.tsx` использует ту же константу через `mailto:`.
   - `src/app/(main)/about.tsx` Support row использует ту же константу.
   (Это уже правда по `07-app-store-compliance.md` § Outstanding
   placeholders → Support mailto target.)
3. Проверить, что `[support email]` placeholder больше не встречается
   в `PRIVACY_POLICY.md`, `TERMS_OF_USE.md` (Section 2 их должна была
   заменить — финал-checkpoint здесь).

### DoD

- [ ] `SUPPORT_EMAIL` константа — реальный валидный адрес.
- [ ] Inbox активно мониторится пользователем.
- [ ] About → Support row открывает mail-композер с правильным `To:` и
      `Subject: B787 Calculator support`.
- [ ] error.tsx «Contact support» — тот же адрес.
- [ ] Все `[support email]` / `support@example.com` плейсхолдеры
      удалены из репозитория.
- [ ] CI green; PR merged.

---

## Section 4 · App Store Connect initial setup

**Цель.** Завести запись приложения в App Store Connect, заполнить все
metadata-поля, подготовить версию 1.0.0 к загрузке сборки.

> **Status check.** В `eas.json` уже указаны реальные `appleId`,
> `ascAppId: 6765644993`, `appleTeamId: 47FGD677Z4` — это значит, что
> App-record в App Store Connect **уже создан** в Phase B (см.
> `09-cicd-and-ops.md` § Phase B чек-лист, пункт «Создать в App Store
> Connect новое приложение, получить ASC App ID»). Section 4 — это
> верификация полноты metadata и подготовка версии 1.0.0 к submission,
> не создание записи с нуля.

### USER DOES — entirely

> **AGENT FORBIDDEN.** Все действия ниже требуют Apple-аккаунта.
> `AGENTS.md` § Forbidden actions запрещает агенту: «Changing Apple
> Developer credentials, certificates, or signing settings» и любое
> взаимодействие с creds. Агент может ассистировать в формулировке
> текстов (через ссылки на спеку), но не входит в App Store Connect UI.

Зайти в [App Store Connect](https://appstoreconnect.apple.com/) → My
Apps → B787 Calculator, и пройти все sub-разделы:

**1. App Information**
   - **Bundle ID:** должен совпадать с `app.json` →
     `expo.ios.bundleIdentifier` (= `com.niktyan.b787calculator`).
   - **Name:** «B787 Calculator» (см. `07-app-store-compliance.md`
     § App Name).
   - **Subtitle:** копировать из `07-app-store-compliance.md`
     § Subtitle.
   - **Primary Language:** English. Russian отдельно как локализация
     (см. ниже).
   - **Category:** Primary = **Reference**. Secondary — оставить
     пустым (`07-app-store-compliance.md` § Category — secondary не
     выбирается).
   - **Content Rights:** Does Your App Contain, Show, or Access
     Third-Party Content? → **No**.
   - **Age Rating:** заполнить опросник — все ответы **None** → итог
     **4+** (см. `07-app-store-compliance.md` § Age Rating).

**2. Pricing and Availability**
   - **Price:** Free.
   - **Availability:** Worldwide (все доступные регионы).

**3. App Privacy**
   - На вопрос «Do you or your third-party partners collect data from
     this app?» → **No, we do not collect data from this app**.
   - Все остальные подразделы заполняются автоматически при выборе No.
   - Это должно полностью соответствовать `PrivacyInfo.xcprivacy` в
     bundle (см. `07-app-store-compliance.md` § Privacy Manifest).
   - Privacy Policy URL: вписать `PRIVACY_POLICY_URL` (Section 2).

**4. Version 1.0.0 — first version record**

Создать новый version 1.0.0. Заполнить:

   - **What's New (English):** копировать из
     `07-app-store-compliance.md` § «What's New» (шаблон для первого
     релиза). Заполнить для обеих локалей (EN + RU).
   - **Promotional Text:** копировать из `07-app-store-compliance.md`
     § Promotional Text.
   - **Description:** копировать из `07-app-store-compliance.md`
     § Description (4000-char block).
   - **Keywords:** копировать из `07-app-store-compliance.md`
     § Keywords (comma-separated, без пробелов).
   - **Support URL:** ссылка на GitHub Pages или
     `mailto:<SUPPORT_EMAIL>` — рекомендуется HTML-страница, не
     mailto (App Review предпочитает clickable web URL).
   - **Marketing URL (optional):** можно оставить пустым (см.
     `07-app-store-compliance.md` § Marketing URL).
   - **Copyright:** `© 2026 Nikolay Tyan` (или эквивалент).

**5. App Review Information**
   - First name / Last name / Phone / Email — реальные контактные
     данные пользователя (Apple звонит / пишет при сложных rejection-ах).
   - **Notes:** копировать целиком из `07-app-store-compliance.md`
     § App Review Notes. **Заменить плейсхолдер `[support email]`** на
     `SUPPORT_EMAIL` из Section 3.
   - **Demo account:** Not required (приложение не имеет аккаунтов —
     см. `07-app-store-compliance.md` § Demo account).

**6. Export Compliance (один раз)**
   - **ITSAppUsesNonExemptEncryption:** уже декларирован в `app.json` =
     `false` (см. `07-app-store-compliance.md` § Export compliance flag).
     App Store Connect должен auto-detect это значение из загруженной
     сборки. Если просит ручное подтверждение — выбрать
     **«None of the algorithms mentioned above»** / **No**.

**7. Локализация (RU)**
   - В App Store Connect → языковой селектор → добавить **Russian
     (Russia)**.
   - Перевести Subtitle / Promotional Text / Description / Keywords /
     What's New в русские эквиваленты.
   - **Note:** аккуратно переводить — описания «advisory only» / «not
     for primary operational use» обязаны сохранять смысл, иначе
     возможен rejection по 2.3 (Accurate Metadata). При сомнениях —
     консультироваться со словарём авиационной терминологии (KT, MAC,
     RWYCC, FCOM — не переводятся, см.
     `02_Specification/06-ui-spec.md` § Локализация).

### DoD

- [ ] App-record существует, Bundle ID совпадает с `app.json`.
- [ ] Все listing-тексты (EN + RU) сохранены без плейсхолдеров.
- [ ] Age Rating = 4+.
- [ ] App Privacy декларирует No-data-collected.
- [ ] App Review Notes содержит реальный `SUPPORT_EMAIL`.
- [ ] Version 1.0.0 record создан и готов принять build (status: «Prepare
      for Submission»).

---

## Section 5 · Screenshots

**Цель.** Загрузить набор скриншотов, которые Apple показывает на App
Store page приложения.

### USER DOES — entirely manual

1. **Required device sizes** (Apple требование на момент Phase D):
   - 6.7" iPhone (iPhone 14 Pro Max / 15 Pro Max / эквивалент).
     1290×2796 px portrait.
   - 12.9" iPad Pro (6th generation+). 2048×2732 px portrait.
2. **Optional sizes** для расширенного покрытия:
   - 5.5" iPhone (iPhone 8 Plus / эквивалент). 1242×2208 px portrait.
3. **Per device size — 3–6 скриншотов**, покрывающие основной user
   flow:
   - Splash (с дисклеймером, если на момент скриншота он активен).
   - Main Menu — Modules с active Crosswind · Takeoff card и
     coming-soon Crosswind · Landing teaser.
   - Crosswind input filled — pre-result state с осмысленными
     значениями (например, TOW = 170, CG = 32, RWYCC = Dry).
   - Crosswind result — large numeric value (например, 34 KT).
   - Settings — Language / Theme / Modules section.
   - About — Version / Validation / Data source / Privacy / Terms /
     Support rows.
4. **Опционально — overlays.** Простые лейблы поверх скриншотов
   («Crosswind limit in seconds», «Reference: 787 FCOM», «Offline.
   No tracking.»). Добавляются в image editor поверх PNG до загрузки.
5. Загрузить в App Store Connect → 1.0.0 → Media Manager → по слотам
   соответствующих device size.

**Captured environment recommendations:**
- Темная + светлая темы оба представлены (например, 50/50 split, или
  alternating). Apple ценит наглядность поддержки тем.
- Real iOS device или Simulator (Mac обязателен для Simulator). Через
  Expo Go снять скриншот системной кнопкой → отправить себе в Telegram
  / iMessage → сохранить на Mac/PC.
- Status bar чистый — без carrier name, без личного имени iPhone, время
  стандартно 9:41 (HIG-convention) либо оставить как есть. Никаких
  личных уведомлений в notch.

### AGENT DOES

Nothing — секция полностью ручная.

### DoD

- [ ] Минимум **3 скриншота на каждый required device size** загружены
      в App Store Connect.
- [ ] Скриншоты показывают **валидные input states** — не пустой
      экран, не error state.
- [ ] Status bar чист (нет личной информации).
- [ ] Темная и светлая темы оба представлены хотя бы в одном слоте
      на размер (рекомендуется).
- [ ] App Store Connect → 1.0.0 показывает status «Prepare for
      Submission», все required-screenshot слоты зелёные.

---

## Section 6 · Production EAS Build

**Цель.** Собрать .ipa с подписью production-сертификатом, загрузить
в App Store Connect.

> **Backbone уже на месте.** В репозитории живёт
> `.github/workflows/release.yml` (см. `09-cicd-and-ops.md` § Release
> process), который автоматизирует EAS Build + EAS Submit при push
> git tag вида `v*`. Helper-скрипт `scripts/release.sh` инкрементирует
> версию, создаёт коммит, ставит тег и пушит — всё в одной команде.

### USER DOES — version bump decision

1. Решить тип bump-а. Текущая версия `0.1.0` (см. `app.json`,
   `package.json`). Для **первого публичного App Store релиза**
   рекомендуется bump до **1.0.0** — это `major` bump (`0.x → 1.0`)
   по semver.
2. Подтвердить в чате решение: «production release as major bump»
   (или другой тип bump-а, если есть причина оставить `0.x` —
   например, явная сигнализация «pre-release stage» в App Store
   listing — но обычно нет смысла).
3. Убедиться, что working tree чистый, локальный `main` up-to-date
   (`git pull --rebase`).

### AGENT DOES — release execution

В консоли репозитория, на ветке `main`:

```bash
./scripts/release.sh major
```

Что произойдёт автоматически (см. `09-cicd-and-ops.md` §
«Release process» — Архитектура автоматизации):

1. `release.sh` валидирует чистый working tree + branch == main.
2. `npm version major` инкрементирует `package.json` →
   `1.0.0`, создаёт commit `chore(release): bump to 1.0.0`, создаёт
   git tag `v1.0.0`.
3. Push commit + tag в origin.
4. GitHub Actions подхватывает push tag → запускает `release.yml`:
   - Quality gates (lint / typecheck / tests) — последняя страховка.
   - `eas build --profile production --platform ios --non-interactive --no-wait`.
   - Ждёт ~15–25 минут пока EAS build не завершится.
   - `eas submit --profile production --platform ios --latest --non-interactive` — загружает .ipa в App Store Connect.
   - Генерирует changelog из conventional commits → создаёт GitHub Release.
5. Email-уведомления GitHub: success / failure (см.
   `09-cicd-and-ops.md` § Email-уведомления).

Агент мониторит:
- GitHub Actions tab — все шаги зелёные?
- expo.dev dashboard → Project → Builds — последний build status =
  Successful.
- App Store Connect → 1.0.0 → Build section — через ~30 минут после
  EAS Submit появляется новый build с auto-incremented buildNumber.

### Альтернатива — manual build (если автоматизация недоступна)

Если `release.yml` workflow по какой-то причине не сработал, агент
может собрать вручную:

```bash
eas build --profile production --platform ios --non-interactive
eas submit --profile production --latest
```

Это требует `EXPO_TOKEN` в окружении (см. `09-cicd-and-ops.md` §
Secrets management). Не рекомендуется как основной путь — release
script + workflow дают воспроизводимость и changelog generation.

### DoD

- [ ] `package.json` / `app.json` версия = `1.0.0`.
- [ ] Git tag `v1.0.0` существует и запушен в origin.
- [ ] GitHub Actions `Release` workflow — все шаги зелёные.
- [ ] expo.dev → Builds → последний `production` build = Successful.
- [ ] App Store Connect → 1.0.0 → Build section показывает upload
      build с правильным buildNumber.
- [ ] GitHub Release создан с changelog.

---

## Section 7 · TestFlight beta

**Цель.** Распределить production-сборку внутренним и (опционально)
внешним тестерам, собрать фидбек 1–2 недели перед App Store submission.

### AGENT DOES

Section 6 уже выполнил `eas submit` — build автоматически попал в App
Store Connect. Никаких дополнительных команд от агента не требуется,
кроме мониторинга:

1. App Store Connect → TestFlight → iOS Builds. Подождать пока статус
   build-а перейдёт из «Processing» в «Ready to Submit» (~10–30 минут
   после `eas submit`).
2. Если status = «Missing Compliance» — это означает, что
   `ITSAppUsesNonExemptEncryption` не был auto-detected. Сообщить
   пользователю; пользователь подтверждает «No / None» в Compliance
   модалке (см. Section 4 пункт 6).

### USER DOES — TestFlight distribution

В App Store Connect → TestFlight:

1. **Internal Testers (рекомендуется первым шагом):**
   - Создать internal testing group (если ещё нет).
   - Добавить себя как internal tester (max 100 internal testers через
     Apple ID, привязанные к команде).
   - Установить TestFlight app на iPhone → авторизоваться Apple ID →
     получить уведомление о новой сборке → нажать Install.
   - Прогнать smoke test (Splash → Disclaimer → Main Menu → Crosswind
     валидный input → result → Settings → About).
2. **External Testers (опционально, для beta-пилотов):**
   - Создать external testing group.
   - Добавить email-адреса beta-пилотов (до 10,000 человек через
     public link).
   - **Внимание:** external testing требует первого Apple Beta App
     Review (отдельно от App Store Review) — обычно ~24 часа.
   - После approval — пилоты получают public link для установки.
3. **Сбор фидбека:**
   - TestFlight app позволяет тестерам отправлять feedback + screenshots
     прямо из приложения.
   - Параллельно — собирать фидбек через `SUPPORT_EMAIL`.
4. **Период наблюдения — 1–2 недели:**
   - Минимум — успех `01-vision.md` § Success criteria: «Минимум 5
     пилотов B787 проходят функциональное тестирование через TestFlight
     перед публичным релизом».

### Если найдены критические баги

Не итерировать через App Store. Workflow:

1. Создать issue + локальный fix branch.
2. Merge fix → main.
3. `./scripts/release.sh patch` (1.0.0 → 1.0.1).
4. Push tag → release.yml автоматически собирает + submitt-ит.
5. TestFlight через ~30 минут получает новый build.
6. Internal/external тестеры получают push-уведомление.

Это валидный цикл до релиза — App Store ничего ещё не видит, версия
1.0.0 в App Store Connect остаётся «Prepare for Submission» с
последним TestFlight build-ом.

### DoD

- [ ] Build появился в TestFlight Internal Testing в течение 30
      минут после EAS Submit.
- [ ] Пользователь установил build на iPhone через TestFlight app —
      приложение запускается и работает.
- [ ] Минимум 3 internal тестера (или 5+ external) прогнали smoke
      test, не нашли критических багов.
- [ ] (Опционально) Net Promoter Score среди тестовых пилотов ≥ 50
      после 1 недели использования — соответствует `01-vision.md` §
      Success criteria → Пользовательские.

---

## Section 8 · App Store submission + Apple Review

**Цель.** Перейти от TestFlight build-а к Apple Review approval.

### USER DOES

1. В App Store Connect → 1.0.0 → Build section выбрать конкретный
   TestFlight build, который пойдёт на review (обычно последний
   стабильный).
2. Прокрутить страницу — проверить что все секции зелёные:
   - App Information ✓
   - Pricing and Availability ✓
   - App Privacy ✓
   - Version 1.0.0 metadata ✓
   - Screenshots ✓
   - Build selected ✓
3. **Version Release method** — выбрать **«Manually release this
   version»** (рекомендация для первого релиза). Это даёт контроль
   над launch-моментом — после approval вы решаете когда нажать
   «Release».
   Альтернатива «Automatically release this version» допустима для
   PATCH-обновлений; для первого релиза лучше manual.
4. Нажать **«Submit for Review»**.
5. Статус version меняется на **«Waiting for Review»** → через ~24
   часа **«In Review»** → ~24–48 часов **«Pending Developer Release»**
   (approved) ИЛИ **«Rejected»**.

### AWAIT Apple Review

- **Первая submission:** обычно 1–3 дня wall-clock.
- **Последующие апдейты:** часто < 24 часов.
- Apple отправляет email при каждом change of state.

### Outcome A · Approved

→ Section 9.

### Outcome B · Rejected

Apple присылает email + Resolution Center thread в App Store Connect.

**USER DOES:**
1. Открыть Resolution Center → прочитать reason полностью.
2. Категоризировать причину (см. `07-app-store-compliance.md` §
   Стратегия при rejection):
   - **Technical** (crash, broken button) → агенту фиксить в коде →
     новый release patch → resubmit.
   - **Metadata** (неточный текст, скриншоты) → правка в App Store
     Connect → resubmit без новой сборки.
   - **Policy concern** (1.4 Physical Harm, 5.1.1 Privacy, 2.5.1
     Software Requirements) → отвечать в Resolution Center thread
     **до** изменений в коде.

**Если concern по 1.4 Physical Harm (вероятнее всего для авиа-приложения):**

См. `07-app-store-compliance.md` § Стратегия при rejection → Шаг 3.
Кратко:
- Подчеркнуть в ответе: «advisory only», «conservative limits», «used
  to supplement, not replace, official documentation».
- Ссылаться на existing precedents (Boeing OPT, B737 Performance
  Handbook — см. `07-app-store-compliance.md` § App Review Notes).
- Предложить strengthening disclaimer текста, если ревьюер указывает
  конкретное место.
- Не паниковать — большинство таких возражений снимаются через диалог.

**AGENT DOES (если потребуется code-fix):**
- Создать fix branch (`fix/apple-review-<short-name>`).
- Внести минимальный fix.
- `./scripts/release.sh patch` → новый build → resubmit.
- Update App Review Notes если необходимо (через App Store Connect UI,
  это делает пользователь).

### Шаг повышения — App Review Board

При повторном rejection после доработки → запрос на App Review Board
(см. App Store Connect → Resolution Center → дополнительная опция).
Это вторая инстанция Apple, иногда снимает неоднозначные rejections.

### Buffer времени

Спека закладывает **2–3 итерации rejection→fix→resubmit** как
норму для аэрокосмических advisory-приложений (см.
`07-app-store-compliance.md` § Стратегия при rejection → Buffer
времени).

### DoD

- [ ] Status в App Store Connect = «Pending Developer Release»
      (approved).
- [ ] **ИЛИ** каждый rejection cycle документирован: причина,
      категория (technical / metadata / policy), действия,
      финальный outcome.

---

## Section 9 · Release

**Цель.** Перевести приложение из «Pending Developer Release» в
«Ready for Sale» — публичный App Store.

### USER DOES

1. App Store Connect → 1.0.0 → нажать **«Release this version»**.
2. Apple раскатывает приложение глобально — обычно в течение ~24
   часов попадает во все регионы.
3. Уведомить beta-пилотов (через личный канал коммуникации) — теперь
   можно ставить через публичный App Store, не TestFlight.

### Smoke test post-release

1. Открыть [App Store на iPhone] → поиск «B787 Calculator» (или
   прямая ссылка на app page).
2. Скачать + установить.
3. Прогнать тот же smoke test, что и в TestFlight (Section 7):
   - Splash + disclaimer.
   - Main Menu.
   - Crosswind input → result.
   - Settings (Language switch, Theme switch).
   - About → Privacy / Terms / Support — каждая ссылка открывает
     корректную URL.
4. Убедиться, что версия в About = 1.0.0 (или 1.0.X если был
   hotfix между submission и release).

### DoD

- [ ] App searchable в App Store в течение 24 часов после release
      click.
- [ ] Download + install с iPhone работает.
- [ ] Privacy Policy URL, Terms of Use URL, Support email — все
      функциональны в production-сборке.
- [ ] **Zero production crash reports** в первые 24 часа после
      release (App Store Connect → Analytics → Crashes — см.
      `09-cicd-and-ops.md` § Apple-native crash reporting).
- [ ] `01-vision.md` § Success criteria → Технические + Регуляторные
      пункты — все выполнены.

---

## Section 10 · Post-launch immediate followups

**Цель.** Закрыть Phase D правильно — задействовать backlog-items,
которые были отложены до post-launch.

### Открыть tooling-evaluation sprint (high priority)

ADR-0008 § «Pre-release tooling stability lock» заблокировал
major-bumps четырёх инструментов (`typescript`, `i18next`,
`lint-staged`, `eslint-plugin-react-hooks`) на время Phase D. После
1.0.0 release — снять блокировки **по одному пакету за PR** с
функциональным регресс-тестом для каждого (см. `09-cicd-and-ops.md`
§ «Dependabot major-bump policy» → Pre-release tooling stability lock).

Рекомендуемый порядок:
1. `typescript` (largest breakage surface — делать первым на свежую
   голову).
2. `lint-staged` (минимальный risk).
3. `eslint-plugin-react-hooks`.
4. `i18next` (потенциальный breaking-change для locale-loading API).

### Phase 2 data update — Wet/Contaminated runway conditions

См. `01-vision.md` § Open questions → пункт 1: «Точные числовые значения
для Wet и Contaminated runway — будут предоставлены в Phase 2 на
основе аналогичной таблицы коэффициентов».

Когда данные финализированы:
- Использовать `prompts/99-update-data-template.md`.
- Новые лимиты добавляются как entries в bundled JSON; код
  Crosswind модуля не меняется.
- Bump dataVersion + ship через App Store update (или OTA через EAS
  Update — Phase 2 включает настройку EAS Update, см.
  `09-cicd-and-ops.md` § OTA updates стратегия).

### User feedback monitoring (ongoing)

Раз в неделю (~10 минут, см. `09-cicd-and-ops.md` § Monitoring):
- App Store Connect → Crashes — crash rate ≤ 0.5%.
- App Store Connect → Reviews — отвечать на осмысленные.
- `SUPPORT_EMAIL` inbox — обрабатывать запросы.

### First patch release window

Запланировать **2–4 недели после launch** — собрать накопленный фидбек,
выпустить 1.0.1 / 1.1.0 с приоритетными улучшениями. Использовать
`prompts/99-hotfix-template.md` для критичных багов или обычный sprint
flow для feature-обновлений.

### Roadmap activation — Phase 2 modules

Phase 2 модули (см. `01-vision.md` § Future Enhancements → Phase 2):
- Boeing 787-9 variant.
- Non-dry RWYCC runway conditions (Good / Medium to Good / Medium /
  Medium to Poor / Poor).
- Crosswind Landing.
- Wind direction + runway heading inputs.

Когда любой модуль входит в активную разработку — соответствующий
sprint prompt (или новый prompt по тому же шаблону), feature branch,
PR, обычный workflow Phase C.

### DoD

- [ ] GitHub Issue открыт для tooling-evaluation sprint.
- [ ] GitHub Issue открыт для Phase 2 data update (Wet/Contaminated).
- [ ] Расписание weekly check-in (calendar reminder, либо ритуал).
- [ ] First patch release window забронирован в календаре (~2–4 недели
      после launch).

---

## Appendix · Cross-reference index

Где живёт каждый артефакт Phase D в спеке:

| Артефакт | Файл | Секция |
|----------|------|--------|
| Apple Developer Program requirements | `09-cicd-and-ops.md` | § Phase B чек-лист |
| EAS profiles (`development`/`preview`/`production`) | `09-cicd-and-ops.md` | § EAS configuration |
| EAS Submit credentials (already in `eas.json`) | `eas.json` | (file) |
| Bundle ID, version, build number sources | `app.json`, `package.json` | (file) |
| Privacy Manifest содержание | `07-app-store-compliance.md` | § Privacy Manifest |
| Privacy Policy + Terms of Use тексты | `07-app-store-compliance.md` | § Privacy Policy, § Terms of Use |
| App Store Listing texts (name / subtitle / promo / description / keywords / What's New / Support URL) | `07-app-store-compliance.md` | § App Store Listing texts |
| App Review Notes текст | `07-app-store-compliance.md` | § App Review Notes |
| Age Rating, Category, Supported Devices, Available Regions | `07-app-store-compliance.md` | § App Store Listing texts |
| Disclaimer in-app texts | `07-app-store-compliance.md` | § Тексты дисклеймеров в приложении |
| Stratergy при rejection | `07-app-store-compliance.md` | § Стратегия при rejection |
| Outstanding placeholders register | `07-app-store-compliance.md` | § Outstanding placeholders for Phase D |
| Release script + workflow | `09-cicd-and-ops.md` | § Release process |
| Helper-скрипт `scripts/release.sh` usage | `09-cicd-and-ops.md` | § Helper-скрипт для разработчика |
| GitHub Actions `release.yml` | `09-cicd-and-ops.md` | § GitHub Actions workflow |
| TestFlight + Crash reporting | `09-cicd-and-ops.md` | § Apple-native crash reporting |
| Hotfix process после release | `09-cicd-and-ops.md` | § Hotfix process |
| Disaster recovery scenarios | `09-cicd-and-ops.md` | § Backup и Disaster Recovery |
| Forbidden actions for agent | `AGENTS.md` | § Forbidden actions |
| Success criteria для MVP | `01-vision.md` | § Success criteria для MVP |
| Phase D backlog (post-launch follow-ups) | `09-cicd-and-ops.md` | § Follow-ups / TODO list |
| ADR-0008 tooling stability lock | `02_Specification/ADR/0008-...md` | § Pre-release tooling stability lock |

---

## Appendix · Phase D execution checklist (one-glance)

Распечатывается / держится открытым на втором мониторе на время Phase
D. Каждый пункт = одна секция этого playbook.

- [ ] **§ 0** Prerequisites checklist пройден.
- [x] **§ 1** Production app icon merged в main.
- [x] **§ 2** Privacy Policy + Terms of Use опубликованы на стабильных
      URL; `src/core/constants.ts` обновлён. (✅ PR #78 markdown
      files + Pages deploy; PR #79 constants.ts URLs.)
- [x] **§ 3** Support email активен и мониторится; `SUPPORT_EMAIL`
      обновлён. (✅ PR #79 constants.ts.)
- [ ] **§ 4** App Store Connect → 1.0.0 metadata + Privacy + Review
      Notes заполнены (EN + RU).
- [ ] **§ 5** Screenshots загружены для всех required device sizes.
- [ ] **§ 6** `v1.0.0` tag создан → EAS Build + EAS Submit прошли
      успешно.
- [ ] **§ 7** Build в TestFlight; ≥ 3 internal / ≥ 5 external тестеров
      прогнали smoke test без critical bugs.
- [ ] **§ 8** «Submit for Review» нажата; Apple Review approved
      (после возможных итераций rejection).
- [ ] **§ 9** «Release this version» нажата; приложение в публичном
      App Store; smoke test проходит на скачанной из App Store сборке.
- [ ] **§ 10** Post-launch follow-ups (tooling sprint, data update,
      monitoring, first patch window) — запланированы.

После закрытия всех пунктов: **MVP relased. Phase E (ongoing
operations) начинается.**
