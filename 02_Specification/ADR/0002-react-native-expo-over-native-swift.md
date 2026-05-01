# ADR-0002 · React Native + Expo over native Swift

**Status:** Accepted
**Date:** 2026-04
**Related:** `03-tech-stack.md`, `09-cicd-and-ops.md`

## Context

Разработчик работает на Windows 11. Apple iOS-приложения требуют Mac с Xcode для финальной сборки и подписи. Возможные пути:

1. **Native Swift + cloud Mac** — аренда удалённого Mac (MacInCloud, AWS EC2 Mac), $20–50/месяц, RDP с Windows.
2. **Native Swift + покупка Mac mini** — единоразовые $600.
3. **React Native + Expo + EAS Build** — облачная сборка на серверах Expo, Mac не нужен совсем.
4. **Flutter + Codemagic** — аналогично RN, но Dart как язык.

Дополнительные ограничения:
- Разработчик — пилот с небольшим опытом в разработке.
- Использование AI-ассистента (Claude Code) для большей части кодинга.
- MVP функционально простой: ~5 экранов, локальные расчёты, без сетевых запросов, без сложных нативных интеграций.
- Долгосрочная поддержка важна: проект будет расширяться годами.
- Apple App Store должен пропустить приложение без специфических вопросов.

## Decision

**Используем React Native + Expo SDK + EAS Build.**

- Язык: TypeScript.
- Фреймворк: React Native через managed workflow Expo.
- Сборка: EAS Build (облачные iOS-серверы Expo).
- Submit: EAS Submit.
- Тестирование: Expo Go на iPhone разработчика во время разработки, TestFlight для бета-тестирования.

Mac не требуется ни на одном этапе. Разработчик работает на Windows 11 без ограничений.

## Consequences

**Позитивные:**
- 100% совместимость с Windows-окружением разработчика.
- Огромная AI-поддержка (RN/TS — один из самых популярных стеков для AI-кодирования).
- Bundle размер и performance вполне приемлемы для приложения такой простоты.
- App Store успешно одобряет RN-приложения массово (Discord, Shopify, Coinbase, и в авиационной нише — обсуждено в `07-app-store-compliance.md`).
- Возможность бесплатной кросс-платформенной поддержки Android в будущем (одна кодовая база — два таргета).
- EAS Build бесплатный тариф (30 build/мес) покрывает потребности MVP.

**Негативные:**
- Зависимость от Expo как vendor-а. Если Expo сильно изменит pricing или закроет EAS — миграция потребует усилий (хотя миграция возможна — с EAS на Codemagic, например).
- React Native имеет свои quirks по сравнению с native Swift (некоторые нативные API недоступны без custom modules).
- Bundle размер чуть больше native Swift (но в пределах нашего performance budget — 30 MB).
- Производительность чуть ниже native Swift, но для калькулятора это незаметно.
- При попадании в специфичный нативный сценарий (что маловероятно для нашего scope) потребуется native module — а тут Mac начнёт быть нужным.

**Нейтральные:**
- TypeScript vs Swift — оба зрелые языки. TypeScript более распространён, Swift более expressive для iOS-специфики.

## Alternatives considered

**Native Swift + cloud Mac.** Отвергнут: дополнительная плата $20–50/мес, более сложный workflow (RDP, синхронизация файлов, два окружения). AI-ассистенты слабее в Swift, чем в TypeScript.

**Native Swift + Mac mini.** Отвергнут на этапе MVP: $600 единоразовых трат необязательны при доступности EAS Build. При росте проекта может быть пересмотрено через новый ADR.

**Flutter + Codemagic.** Отвергнут: Dart менее популярен среди AI-ассистентов, экосистема меньше. RN + Expo более mature и имеет больше precedents.

**Capacitor / Ionic / Cordova.** Отвергнут: web-based wrappers создают «не-native» feel, который Apple часто отклоняет под Guideline 4.2 «Minimum Functionality».
