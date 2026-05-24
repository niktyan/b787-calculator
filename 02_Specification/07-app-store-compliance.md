# 07 · App Store Compliance

## Назначение документа

Документ собирает в одном месте всё, что необходимо для **гарантированного прохождения Apple App Store Review** и долгосрочной работы приложения в App Store без снятия с продажи. Содержит:

- Применимые секции App Store Review Guidelines с пояснением, как мы их закрываем.
- Готовые тексты: Privacy Policy, Terms of Use, App Store Listing, Review Notes, дисклеймеры.
- Точную конфигурацию Privacy Manifest (`PrivacyInfo.xcprivacy`).
- Список Required Reason API деклараций.
- Стратегию при rejection.

Все тексты в этом документе — **финальные и готовые к копированию** в соответствующие места (App Store Connect, hosted policy pages, файлы в репозитории).

---

## Применимые секции App Store Review Guidelines

| Секция | Требование Apple | Как закрываем |
|--------|------------------|---------------|
| **1.4 Physical Harm** | Повышенная проверка приложений, связанных с риском физического вреда | Явный advisory-дисклеймер на первом запуске + видимый source-chip «Reference: 787 FCOM» в каждом результате; описание как «advisory tool» в App Store Listing |
| **1.4.2 Drug Dosage Calculators (аналогия)** | Калькуляторы критичных значений должны исходить от уполномоченной организации или иметь явное обоснование | Позиционируем как «conservative advisory limits validated with active line pilots»; ссылаемся на existing precedents в App Store (Boeing OPT, B737 Performance Handbook) в Review Notes |
| **2.1 App Completeness** | Полная функциональность к моменту ревью | Отправляем только после прохождения внутреннего acceptance с пилотами через TestFlight |
| **2.3 Accurate Metadata** | Описание соответствует функционалу | App Store Listing честно описывает «advisory crosswind calculator for Boeing 787 pilots» |
| **2.5.13 Apps Using ATT** | Если используется App Tracking Transparency | НЕ применимо — мы не отслеживаем |
| **3.1.1 In-App Purchase** | Если есть IAP | НЕ применимо — приложение полностью бесплатно |
| **5.1.1 Privacy — Privacy Policy** | Обязательный Privacy Policy | Хостится на GitHub Pages, ссылка в App Store Listing и в About |
| **5.1.1(v) Privacy Manifest** | Privacy Manifest обязателен с мая 2024 | `PrivacyInfo.xcprivacy` включён в bundle с MVP, декларирует zero data collection |
| **5.1.2 Data Use and Sharing** | Прозрачность использования данных | Privacy Label «No data collected» — потому что это абсолютная правда |
| **5.1.5 Location Services** | Если используются | НЕ применимо — не запрашиваем геолокацию |
| **5.6 Developer Code of Conduct** | Этический кодекс | Соблюдается |

---

## Стратегия прохождения

Apple одобряет авиационные advisory-калькуляторы при правильном позиционировании. Существующие precedents в App Store: Boeing OPT (id 584211407), B737 Performance Handbook (id 871314271), B737 Performance (id 6752240605), iBOEING B-787 Aircraft Apps (id 1629240798).

**Тактика для нашего ревью:**

1. **Strong disclaimer на splash + при каждом запуске.** Текст явный, требует подтверждения.
2. **«Advisory» chip на каждом результате расчёта** + визуальная ссылка на FCOM как источник.
3. **App Store Listing texts** избегают слов «certified», «approved by FAA», «equivalent to FCOM».
4. **App Review Notes** содержит подробное объяснение для ревьюера со ссылками на существующие аналоги (см. шаблон ниже).
5. **App Preview видео 30 сек** показывает дисклеймер и явно произносит «advisory only» в начале (если будет голос).
6. **Privacy Manifest без сторонних SDK** — это даёт «No data collected» Privacy Label, что снимает 90% privacy-вопросов автоматически.

---

## Privacy Manifest (`PrivacyInfo.xcprivacy`)

Файл лежит в корне Expo-проекта и автоматически включается в bundle при сборке через EAS. Точное содержимое:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

**Расшифровка:**

- `NSPrivacyTracking: false` — не используем ATT/трекинг.
- `NSPrivacyTrackingDomains: []` — нет трекинговых доменов (мы вообще не делаем сетевые запросы).
- `NSPrivacyCollectedDataTypes: []` — НЕ собираем никакие категории данных.
- `NSPrivacyAccessedAPITypes` — единственная задекларированная required-reason категория:
  - `NSPrivacyAccessedAPICategoryUserDefaults` — мы используем `UserDefaults` (через AsyncStorage).
  - Reason code `CA92.1` — «Access info from same app, per documentation» (используется для хранения собственных настроек приложения).

**Если в Phase 2+ добавится Sentry или другая третья сторона** — Privacy Manifest придётся существенно расширить. Это специально не делается в MVP, чтобы Privacy Label оставался максимально чистым.

### Export compliance flag (`ITSAppUsesNonExemptEncryption`)

App Store Connect требует декларации export compliance для каждой iOS-сборки. У нашего приложения нет custom-крипто (всё полностью офлайн, никаких сетевых запросов / шифрования собственными силами), поэтому декларируется `ITSAppUsesNonExemptEncryption: false` в `Info.plist` через `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    }
  }
}
```

Это поле автоматически добавляется EAS Build при первом запуске; **уже сконфигурировано** в `app.json` репозитория (Phase B). Без него App Store Connect требует ручного заполнения формы при каждой загрузке сборки. Со значением `false` — submit идёт без дополнительных шагов.

«false» означает: мы НЕ используем non-exempt cryptography (ATS/HTTPS используется системой iOS, что попадает под exemption; собственного crypto-кода у нас нет).

---

## App Privacy Label (App Store Connect)

В App Store Connect → App Privacy раздел заполняется так:

**Data Used to Track You:** None
**Data Linked to You:** None
**Data Not Linked to You:** None

На вопрос «Do you or your third-party partners collect data from this app?» — ответ **«No, we do not collect data from this app»**.

Все остальные подразделы заполняются автоматически при выборе «No».

---

## Privacy Policy (полный текст)

Файл: `PRIVACY_POLICY.md` в корне репозитория. Хостится на GitHub Pages (URL генерируется в Phase B; шаблон: `https://<github-username>.github.io/b787-calculator/privacy-policy.html`).

```markdown
# Privacy Policy

**Effective date:** [Phase B finalization date]
**Last updated:** [date of last edit]

## Overview

B787 Tools ("the App") is an offline advisory tool for Boeing 787 pilots. We are committed to protecting your privacy. This Privacy Policy explains our complete approach: we do not collect, store, transmit, or share any personal data.

## What data the App accesses or stores

The App stores the following information **locally on your device only**:

- Your selected language (English or Russian).
- Your selected theme (Auto, Light, Dark).
- A flag indicating whether you have accepted the disclaimer.

This information never leaves your device. There is no synchronization, no cloud backup of these settings, and no transmission to any server.

## What data we collect

**None.** Specifically:

- We do not collect personal information.
- We do not collect identifiers (IDFA, device ID, advertising ID).
- We do not collect usage statistics or analytics.
- We do not collect location data.
- We do not collect crash reports through any third-party service.
- We do not have user accounts or registration.
- We do not transmit any data over the network.

## Network requests

The App does not make any network requests. It works fully offline. Calculations are performed locally based on bundled reference data.

## Third-party services

The App does not integrate any third-party SDKs that collect data. We do not use analytics, advertising networks, attribution platforms, or social-media SDKs.

## Children's privacy

The App is intended for licensed pilots and aviation professionals. It is not directed at children under 13 and does not collect any data from children or anyone else.

## Changes to this policy

If we make changes, we will update this page and adjust the "Last updated" date. Significant changes will trigger a new disclaimer screen on next app launch.

## Your rights

Because we do not collect any data, there is nothing to access, correct, export, or delete on our side. You may delete locally stored settings at any time by uninstalling the App.

## Contact

For questions about this Privacy Policy, contact: [support email]

## Jurisdiction

This Privacy Policy is governed by the laws of the Republic of Uzbekistan.
```

---

## Terms of Use (полный текст)

Файл: `TERMS_OF_USE.md` в корне репозитория. Хостится на GitHub Pages.

```markdown
# Terms of Use

**Effective date:** [Phase B finalization date]
**Last updated:** [date of last edit]

## 1. Acceptance

By installing and using B787 Tools ("the App"), you agree to these Terms of Use. If you do not agree, do not use the App.

## 2. Advisory nature of calculations

**The App provides advisory information only.** All calculations represent conservative reference values and are not a substitute for official Boeing 787 Flight Crew Operations Manual (FCOM), Quick Reference Handbook (QRH), or your operator's Operations Manual (OM-A/OM-B).

You are solely responsible for verifying any calculation against official documentation before making operational decisions. The App is not certified by Boeing, the FAA, EASA, or any other aviation authority.

## 3. Not for primary operational use

The App must not be used as a primary tool for:

- Flight planning that requires regulatory compliance.
- Real-time decision-making during flight operations.
- Replacing certified Electronic Flight Bag (EFB) software.

The App is intended as a quick-reference advisory tool to supplement, not replace, official documentation and procedures.

## 4. Disclaimer of warranties

The App is provided "AS IS" without warranties of any kind. We do not warrant that the App is error-free, accurate, or suitable for any particular purpose. Aviation calculations involve numerous variables; any reliance on the App's output is at your sole risk.

## 5. Limitation of liability

To the maximum extent permitted by law, the developer of the App shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from the use or inability to use the App. This includes, but is not limited to, financial loss, operational disruption, or any safety-related incident.

## 6. Intellectual property

All rights to the App's source code, design, and presentation belong to the developer. Reference data within the App is derived from publicly available Boeing 787 Airport Characteristics for Airport Planning (787 ACAP), ICAO standards, and conservative operational practice. Boeing, Dreamliner, and related trademarks are the property of The Boeing Company; their use in this App is descriptive only and does not imply endorsement.

## 7. Updates

The developer may update the App at any time. Changes to operational reference values will be reflected in the "Data version" displayed in the About screen. We strongly recommend always using the latest version available in the App Store.

## 8. Termination

We reserve the right to remove the App from distribution at any time. Existing installations remain functional until uninstalled by the user.

## 9. Governing law

These Terms are governed by the laws of the Republic of Uzbekistan, without regard to conflict-of-law principles.

## 10. Contact

For questions, contact: [support email]
```

---

## App Store Listing texts

### App Name (30 chars max)

```
B787 Tools
```

### Subtitle (30 chars max)

```
Advisory crosswind reference
```

### Promotional Text (170 chars max, can be updated without re-review)

```
Quick advisory crosswind reference for Boeing 787 pilots. Calculates conservative limits based on weight, CG, and runway condition. Always verify against FCOM.
```

### Description (4000 chars max)

```
B787 Tools is a fast, offline advisory tool for Boeing 787 pilots.
It calculates the maximum allowed crosswind component for takeoff based on four inputs: aircraft variant, TOW (takeoff weight), center of gravity, and runway condition.

CONSERVATIVE ADVISORY LIMITS

The calculations use conservative operational values that are intentionally more restrictive than Boeing demonstrated values, providing an additional safety margin. Reference values are validated with active Boeing 787 line pilots.

KEY FEATURES

- Pure advisory: results are reference values, not operational decisions.
- Fast: enter aircraft, TOW, CG, runway condition; result appears in seconds.
- Offline: works completely without internet. No tracking, no analytics, no data collection.
- Dark and light themes for cockpit and briefing-room use.
- Localized in English and Russian.

FOR WHOM

The App is intended for licensed Boeing 787 pilots, type-rating candidates, instructors, and aviation professionals familiar with operational performance reference materials.

NOT FOR

The App must not be used as a primary navigation, planning, or operational tool. It does not replace certified Electronic Flight Bag software or official Boeing 787 documentation. Final operational decisions must always be based on Boeing 787 FCOM/QRH and your operator's procedures.

PRIVACY

We collect no data. The App makes no network requests. All settings are stored locally on your device. The App does not include any third-party SDKs for analytics, advertising, or attribution.

ROADMAP

The current version focuses on Crosswind Takeoff for Boeing 787-8 on Dry runway. Phase 2 will add Crosswind Landing, Boeing 787-9 variant, and the remaining RWYCC runway conditions (Good, Medium to Good, Medium, Medium to Poor, Poor). Later phases: Weight & Balance, Performance V-speeds, Fuel Planning.
```

### Keywords (100 chars max, comma-separated, no spaces around commas)

```
boeing,787,crosswind,pilot,takeoff,advisory,FCOM,EFB,aviation,calculator,reference,limit
```

### What's New (release notes, ≤ 4000 chars per release)

Шаблон для первого релиза:
```
First public release.

- Crosswind Takeoff module for Boeing 787-8 on Dry runway.
- Aircraft selector (B787-8 active, B787-9 ready for Phase 2).
- RWYCC runway-condition selector (Dry active in MVP).
- Localization in English and Russian.
- Light and dark themes.
- Fully offline. No data collection.
```

### Support URL

```
https://[github-username].github.io/b787-calculator/support.html
```

### Marketing URL (optional)

Можно не указывать в MVP. Если будет landing page — добавляется здесь.

### Category

- **Primary:** Reference
- **Secondary:** (не выбирается, оставляем пустым)

### Age Rating

При заполнении опросника в App Store Connect:
- All other categories: **None**.
- Result: **4+**.

### Supported Devices

- iPhone (с iOS 16.0+)
- iPad (с iPadOS 16.0+)

### Available Regions

- Worldwide (все доступные).

### App Icon

- **Source master:** `assets/images/icon.png` — 1024×1024, 8-bit RGB, **no alpha** (Apple App Store hard requirement; alpha channels cause submission rejection).
- **Design:** typographic «B7» badge in brand accent `#00C2A8` on Dark page background `#0A0E14`. Both color tokens are defined in `02_Specification/06-ui-spec.md` § Темы.
- **Splash-screen continuity:** the `expo-splash-screen` plugin in `app.json` uses `backgroundColor: "#0A0E14"` for both light and dark variants, so the iOS launch screen background matches the icon background — no visual jump on app launch.
- **Variant decision:** Variant A (typographic «B7») was selected from two drafts and approved by the developer prior to Phase D Section 1 integration. Master file was originally exported as 16-bit RGBA with fully opaque alpha; converted to 8-bit RGB during integration as a no-op visual normalization for App Store compliance (RGB values byte-identical at all 1,048,576 pixels).

---

## App Review Notes (заполняется в App Store Connect → App Review Information)

```
Hello App Review team,

This is an offline advisory calculator for Boeing 787 pilots. The app calculates a conservative reference value (maximum allowed crosswind for takeoff) based on four inputs: aircraft variant, TOW (takeoff weight), center of gravity, and runway condition. The output is intended as a quick-reference reminder; the user is expected to verify against official Boeing 787 FCOM/QRH and their operator's procedures before any operational decision.

The advisory nature is communicated to the user three ways:
1. A first-launch disclaimer screen requires explicit acknowledgment before the app can be used.
2. The About screen exposes a "Data source" row showing the bundled FCOM revision (e.g. "Boeing 787 FCOM · 2026-05-05.001"), keeping the user one tap away from the source of truth.
3. The App Store Listing description and Subtitle ("Advisory crosswind reference") emphasize the advisory nature.

Reference values are derived from publicly available Boeing 787 Airport Characteristics for Airport Planning (787 ACAP), ICAO Annex 14 standards, and conservative operational practice. Values are validated with active Boeing 787 line pilots in pre-release beta testing. The values are intentionally MORE RESTRICTIVE than Boeing demonstrated crosswind values for additional safety margin.

The app is fully offline. It makes no network requests, contains no third-party SDKs, no analytics, no advertising, and no user accounts. The Privacy Manifest declares zero data collection and is verified by the App Privacy Label "No data collected".

Existing precedents for similar advisory aviation calculators in the App Store:
- Boeing OPT (id 584211407) — official Boeing tool with full Boeing 787 support.
- B737 Performance Handbook (id 871314271) — third-party advisory calculator for Boeing 737, available for years.
- B737 Performance (id 6752240605) — solo developer's performance calculator for Boeing 737-800.
- iBOEING B-787 Aircraft Apps (id 1629240798) — Boeing 787 specific reference and training app.

To test the app:
1. Launch the app — you will see the disclaimer. Tap "I understand · Continue".
2. On the Main Menu, tap "Crosswind · Takeoff".
3. Enter test values: Aircraft = B787-8, TOW actual = 170, CG = 32, Runway condition = Dry.
4. The result should appear: 34 KT.
5. Settings, About, and back navigation should work without issue.

Please contact me if you have any questions about the app's purpose, data sources, or compliance approach. I am happy to provide additional documentation if helpful.

Thank you for reviewing.
```

### Demo account

Не требуется — приложение не имеет аккаунтов.

### Notes для technical contact

- Email: [support email]
- App is fully offline and self-contained.
- No special hardware or environment is needed for testing.

---

## Тексты дисклеймеров в приложении

### Splash Disclaimer (только при первом запуске)

**Заголовок:** `Advisory only`

**Тело (фиксированный английский, не локализуется):**

```
Advisory only. Calculations provide conservative reference values for Boeing 787 operations. Final operational decisions must always be based on official Boeing FCOM/QRH and your operator's procedures. Not for primary navigation or operational use.
```

**Кнопка:** `I understand · Continue`

### Source chip в результате расчёта

```
Reference: 787 FCOM
```

### About screen — раздел Disclaimer

```
This application provides advisory calculations only. All values represent conservative reference based on publicly available aircraft characteristics and operational practice. They do not replace official Boeing FCOM, QRH, AFM, or operator-specific OM-A/OM-B documentation. Always verify before operational use.
```

---

## Стратегия при rejection

App Store rejection — нормальная ситуация для авиационных приложений на первом сабмите. План действий:

**Шаг 1 · Прочитать reason code и письмо ревьюера полностью.** Никогда не отвечать сразу. Большинство rejections содержат конкретные пункты, которые нужно адресовать.

**Шаг 2 · Категоризировать причину:**
- **Technical issue** (краш, неработающая кнопка) — фиксим в коде, выпускаем новую версию.
- **Metadata issue** (неточное описание, скриншоты) — правим в App Store Connect, повторяем без новой сборки.
- **Policy concern** (1.4 Physical Harm, 5.1.1 Privacy) — отвечаем через App Review дискуссию **до** изменений в коде.

**Шаг 3 · Если concern по 1.4 (Physical Harm):**
- Подчеркнуть в ответе: «advisory only», «conservative limits», «used to supplement, not replace, official documentation».
- Сослаться на существующие precedents в App Store (Boeing OPT, B737 Performance Handbook).
- Предложить добавить дополнительный текст дисклеймера в нужном месте (если конкретное предложение от ревьюера).
- Не паниковать. Большинство таких возражений снимаются через диалог.

**Шаг 4 · При повторном rejection после доработки** — запрос на App Review Board (правее в App Store Connect), это вторая инстанция Apple.

**Шаг 5 · Если третий rejection несмотря на все усилия** — рассмотреть существенную смену позиционирования (например, явное упоминание «for educational purposes only»), либо выпуск через Custom App в Apple Business Manager (если авиакомпания готова поддержать).

Buffer времени в Phase E (App Store submission cycle) — **2–3 итерации**, это заложено.

---

## Open questions

1. **Точное GitHub-username** для генерации URL Privacy Policy и Terms of Use — финализируется в Phase B при создании репозитория.
2. **Точный support email** — определяется в Phase B (личный или специально созданный alias).
3. **Effective date** в Privacy Policy и Terms of Use — заполняется датой первого публичного релиза (или прохождения beta, если хотим раньше).

---

## Outstanding placeholders for Phase D

> **Status:** ✅ **All items resolved 2026-05-19** via PR #78
> (markdown files + Pages deploy) и PR #79 (`src/core/constants.ts`
> production-значения). Раздел сохранён ниже для audit trail —
> inline-аннотации к каждому owner-action пункту фиксируют, какой
> PR закрыл задачу. Единственный сохранённый template-placeholder —
> `[support email]` в § App Review Notes ниже — намеренно остаётся
> до Section 4 (копирование в App Store Connect).

Перед App Store submission все плейсхолдеры из этого списка **должны** быть
заменены на реальные значения. Каждый пункт связан с действием reviewer-а в
процессе ревью; нерезолвенный плейсхолдер ≈ rejection.

### Support mailto target

- **Где сейчас:** `src/core/constants.ts` экспортирует `SUPPORT_EMAIL =
  "support@example.com"` (Phase-D placeholder). Эту константу читают
  `src/app/error.tsx` (Contact support button) и `src/app/(main)/about.tsx`
  (Support row). Соседние константы `PRIVACY_POLICY_URL` и
  `TERMS_OF_USE_URL` устроены тем же образом — все три заменяются в
  Phase D одной правкой constants-файла.
- **Где ещё ожидается:** Privacy Policy и Terms of Use
  (`PRIVACY_POLICY.md`, `TERMS_OF_USE.md`) ссылаются на «[support email]»
  как контакт. Шаблон App Review Notes в этом документе содержит ту же
  заглушку.
- **Owner action в Phase D:**
  1. ✅ **Resolved by PR #78** — почтовый ящик
     `supportb787calculator@protonmail.com` провижинен на ProtonMail.
  2. ✅ **Resolved by PR #79** — `SUPPORT_EMAIL` в
     `src/core/constants.ts` теперь
     `supportb787calculator@protonmail.com`. Покрывает error-screen
     и About-screen за одно изменение.
  3. 🔄 **Partially resolved by PR #78** — `PRIVACY_POLICY.md` и
     `TERMS_OF_USE.md` в корне репозитория теперь содержат реальный
     адрес. Placeholder `[support email]` в App Review Notes этого
     документа намеренно оставлен как template — будет заменён
     одноразово на этапе Section 4 (копирование текста в App Store
     Connect → App Review Information).
  4. ✅ **Resolved by PR #79** — `PRIVACY_POLICY_URL` /
     `TERMS_OF_USE_URL` в `src/core/constants.ts` указывают на
     финальные production URL под `niktyan.github.io`. Обе URL
     верифицированы 200 OK 2026-05-19.
  5. ✅ **Resolved by PR #79** — все ключевые пункты (1–2, 4)
     закрыты; пункт 3 закрывается на этапе Section 4 как template.
     Раздел оставлен в спеке для audit trail (см. Status block выше).
- **Hard rule:** до App Store submission плейсхолдер должен быть закрыт.
  Apple-ревьюеры реально кликают по контактным ссылкам; non-existent или
  bouncing-адрес — гарантированный rejection по 1.5 / 5.6.

---

## Exit-критерии этого документа

- [ ] Все тексты в документе одобрены и готовы к копированию в App Store Connect и репозиторий.
- [ ] Privacy Manifest содержание понятно и не вызывает возражений.
- [ ] App Review Notes шаблон одобрен.
- [ ] Стратегия при rejection согласована (особенно «не паниковать на первый rejection — это нормально»).
- [ ] Open questions явно отложены на Phase B.
