# ADR-0006 · EAS first-build credentials choices

**Status:** Accepted
**Date:** 2026-04 (retroactive — captured after first EAS build during Phase B)
**Related:** `02_Specification/09-cicd-and-ops.md`

## Context

Во время первого `eas build --profile preview --platform ios` запуска в Phase B EAS интерактивно запросил несколько решений по credentials. Эти решения имеют долгосрочные последствия (стоимость регенерации сертификатов, привязка к конкретному Apple Developer аккаунту, registered devices) и должны быть задокументированы для воспроизводимости — на случай если credentials нужно будет регенерировать или мигрировать на другой инструмент сборки.

## Decisions made

### 1. Apple Distribution Certificate

**Choice: Generate new (Y).**

EAS создал новый iOS Distribution Certificate в Apple Developer аккаунте (`niktyan@bk.ru`, Team ID `47FGD677Z4`). Сертификат хранится на серверах EAS; приватный ключ нам не доступен напрямую (что нормально — security-by-default).

Управляется через `npx eas credentials` (interactive UI с listing/regenerate операциями).

### 2. Provisioning Profile

**Choice: Generate new (Y).**

EAS создал новый ad-hoc Provisioning Profile, включающий iPhone устройство разработчика (UDID зарегистрирован через apple.com/devices). Профиль используется для `preview` distribution через TestFlight Internal.

Для добавления новых TestFlight тестеров (Phase D) — EAS перегенерирует профиль автоматически при `eas device:create`.

### 3. Push Notifications certificate

**Choice: Skip (No).**

Не генерируется. Push notifications **запрещены** для нашего приложения per `03-tech-stack.md` секция «Запрещённые зависимости» (`expo-notifications`, `@react-native-firebase/messaging`). Решение полностью соответствует спеке — приложение полностью офлайн без notifications.

### 4. Devices registered

**Choice: 1 device (architect's iPhone via apple.com website registration).**

Один iPhone разработчика зарегистрирован в Apple Developer портале. UDID получен через автоматическую регистрацию при первом TestFlight install.

Будущие beta-тестеры (Phase D) добавляются через `eas device:create` — EAS отправляет ссылку на регистрацию устройства, тестер открывает её на iPhone, EAS регистрирует UDID и обновляет provisioning profile.

## How to inspect/manage

```bash
npx eas credentials
```

Открывает interactive UI со всеми EAS-managed credentials:
- iOS Distribution Certificate
- Push Key (если будет; у нас нет)
- Provisioning Profiles
- Apple Devices

Из этого UI можно re-issue, view, или (опасно) revoke credentials. Не рекомендуется делать revoke без понимания последствий — все running TestFlight builds станут невалидными.

## Consequences

**Позитивные:**
- EAS управляет жизненным циклом сертификатов автоматически — не нужно вручную скачивать `.p12` файлы.
- Регенерация при истечении (через год) делается через `eas credentials` без участия Apple Developer портала вручную.
- Один источник правды по credentials — EAS dashboard.

**Негативные:**
- Vendor lock-in: при миграции с EAS на другой инструмент (Codemagic, fastlane) credentials придётся экспортировать через `eas credentials --download` и пере-импортировать в новый инструмент. Это multi-step процесс, но возможен.
- Distribution Certificate привязан к одному Apple Developer аккаунту (Individual `niktyan@bk.ru`); миграция на Organization / другой аккаунт потребует пере-выпуска.

**Нейтральные:**
- Apple ограничивает Apple Developer аккаунт двумя active Distribution Certificates одновременно. EAS управляет этим — старые revoke-ятся при создании новых.

## Alternatives considered

**Использовать существующий Distribution Certificate** (если бы был) — отвергнут: у разработчика не было предыдущих iOS-сертификатов на этом Apple Developer аккаунте, нечего использовать.

**Manual upload of `.p12` and provisioning profile** — отвергнут: EAS interactive flow проще и менее error-prone для первого setup. Manual upload остаётся опцией для миграции с других инструментов.

**Apple Developer Enterprise Program** (для in-house distribution без App Store) — не применимо: проект публичный, App Store distribution.
