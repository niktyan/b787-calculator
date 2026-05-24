# 01 · Vision и Scope

## Один абзац о проекте

**B787 Calculator** — это бесплатное iOS-приложение для пилотов Boeing 787 (iPhone и iPad), которое заменяет ручную работу с бумажными графиками FCOM/OM-B на быстрый advisory-калькулятор. Первый модуль рассчитывает максимально допустимый боковой ветер (crosswind limit) при посадке в зависимости от посадочного веса, центровки и состояния ВПП. Приложение распространяется глобально через Apple App Store. Расчёты являются consultative conservative advisory limits и явно сопровождаются дисклеймером «не для primary operational use». Архитектура спроектирована так, чтобы в будущем добавлять новые модули (Crosswind Takeoff, Weight & Balance, Performance, Fuel) без переработки существующего кода.

---

## Проблема, которую мы решаем

Пилоты Boeing 787 при подготовке к посадке должны определять допустимый боковой ветер с учётом текущего веса, центровки и состояния ВПП. На практике это делается по бумажным таблицам/графикам в FCOM или OM-B авиакомпании. У этого подхода три недостатка:

1. **Время.** Поиск нужной строки в таблице, интерполяция между точками, сверка с состоянием полосы — занимает несколько минут в условиях, когда время критично.
2. **Удобство.** В кокпите при пониженном освещении и при ограниченном пространстве работа с бумажным документом неудобна.
3. **Риск ошибки.** Ручная интерполяция между точками таблицы — потенциальный источник арифметических ошибок.

---

## Решение

Лёгкое iOS-приложение (с iPad-first дизайном, адаптируемое для iPhone), в котором пилот вводит три значения (вес, центровка, состояние ВПП) и за секунды получает максимально допустимый crosswind в виде крупного числа. Расчёт основан на тех же принципах, что и таблица FCOM, но реализован программно с автоматической интерполяцией. Результат всегда снабжается ссылкой на источник правды (FCOM), что напоминает пилоту: окончательное решение — на основании официального документа.

Приложение полностью офлайн: никаких сетевых запросов, аналитики, серверного backend. Всё хранится локально на iPad, работает в любой точке мира без интернета.

---

## Целевая аудитория

**Основная:** пилоты Boeing 787, использующие iPad как EFB или вспомогательное устройство в брифинг-руме / кокпите. Аудитория профессиональная, технически грамотная, работающая в авиационной среде.

**Вторичная:** кандидаты на тип-рейтинг B787, инструкторы, сотрудники Flight Operations авиакомпаний-операторов B787, авиационные энтузиасты, заинтересованные в performance-инструментах.

**НЕ целевая аудитория:** пассажиры, диспетчеры, специалисты по другим типам ВС, авиамоделисты.

---

## Что входит в MVP

MVP — это первая публичная версия в App Store. Осознанно минимальная по функциональности, чтобы быстро получить обратную связь и пройти первое прохождение App Store Review.

**MVP включает:**

1. **Два функциональных модуля — Crosswind Operations Suite для Boeing 787 (оба варианта).**
   - **Crosswind · Takeoff.** RWYCC coverage 6/6 для обоих ВС (Dry through Poor) после crosswind expansion series (PR 2-7) и активации B787-9 в Sprint B (см. ADR-0013). RWYCC 0 (TAKE OFF NOT ALLOWED) intentionally not implemented — operationally a prohibition, not a calculation. Входы: вариант ВС (Aircraft — оба активны: B787-8 / B787-9, каждый со своим FCOM-сертифицированным operational envelope), TOW actual (тонны), центровка (% MAC), runway condition (RWYCC scale). Выход: одно число — максимально допустимый боковой ветер в узлах.
   - **Crosswind · Landing.** Добавлен в Sprint C (см. ADR-0014). Categorical lookup по FCOM Tab 2.29.3 + page 2-105 с тремя FCOM CAUTION корректировками. Входы: 6 категорий — aircraft (B787-8 / B787-9), runway condition (те же 6 RWYCC), landing mode (Manual / Autoland), Asymmetric Reverse Thrust (No / Yes), CAT II-III (No / Yes), ONE ENG INOP (No / Yes); последние два видны только в Autoland. Выход: одно целое число KT.

   Итого MVP: 2 модуля × 2 ВС × 6 RWYCC = 24 calculation matrices + landing CAUTION adjustments. Этот объём — основной аргумент для closing Apple Guideline 4.2 (Minimum Functionality) на resubmit.
2. **Splash-экран с обязательным advisory-дисклеймером** при первом запуске. Подтверждение пользователя сохраняется и больше не показывается.
3. **Главное меню — crosswind-семья (две активные карточки).** В MVP Main Menu показывает оба модуля как активные карточки, в порядке хронологии фазы полёта:
   - **Crosswind · Takeoff** — активная карточка (слот #1), открывает Takeoff Calculator (`/crosswind`).
   - **Crosswind · Landing** — активная карточка (слот #2), открывает Landing Calculator (`/crosswind-landing`).

   В MVP coming-soon тизеров нет — карточная инфраструктура (`ComingSoonModal`, `ComingSoonCard`) сохранена в `core/modules/` для Phase 3+ (Weight & Balance, Performance, Fuel). До Sprint C Landing был Phase-2-тизером в слоте #1; ADR-0014 promotes его в активный модуль.
4. **Settings** — выбор языка (RU/EN), переключение темы (Auto/Light/Dark), управление видимостью модулей (toggle per module, изменения отражаются в Main Menu и empty state если все скрыты). Единицы измерения **зафиксированы на MVP-permanent уровне**: Tons (t) для веса, Knots (KT) для ветра — рендерятся как info-rows без переключателей. Альтернативы (Pounds / m/s) явно вынесены за скобки и в дальнейших релизах не появятся, если только это не пересмотрено отдельным ADR (см. Sprint 6 follow-up Block 2). Это единственный документ, в котором фиксируется «permanent units»-решение — см. `06-ui-spec.md` § Экран 5 для UI-следствий.
5. **About** — версия приложения, ссылка на Privacy Policy, ссылка на Terms of Use, контактный email поддержки.
6. **Полная локализация на русский и английский языки.**
7. **Полная поддержка тёмной и светлой темы.**
8. **Privacy Manifest, Privacy Policy, Terms of Use** — все требования App Store закрыты.
9. **Tactile feedback (haptics).** Light impact на keypad keys и SegmentedControl selection, medium impact на Done/Reset, warning haptic на envelope-violation transition в Takeoff и success haptic на recovery. Через `expo-haptics` (iOS Taptic Engine). Kill-switch через feature flag `enableHapticFeedback`. См. ADR-0015.
10. **Recent Calculations.** Local-only история последних 20 расчётов (Takeoff + Landing). Auto-save 500 ms после ввода, dedupe по содержимому, FIFO eviction. Тап по entry восстанавливает inputs в исходном калькуляторе через route query param `recentEntryId`. См. ADR-0016.

**Важное архитектурное замечание про неактивные карточки.** Они являются **визуальными элементами Main Menu**, не отдельными модулями. Они не имеют собственного домена, данных или экранов в MVP — только содержимое в JSON-конфиге `src/core/modules/data.json` (rename из `coming-soon-modules` в Sprint 6 follow-up Block 4 — теперь реестр включает и активные модули с их `route`, и тизеры с `phase`). Это позволяет: (а) безопасно показывать roadmap без риска навигации в нереализованный модуль, (б) обновлять roadmap без перевыпуска приложения через EAS Update в будущем, (в) превращать карточку из «coming soon» в активную одной правкой конфига (`active: false` → `active: true` + добавить `route`) при выкладке Phase 2.

### Long-term backlog (post-MVP)

Эти модули обсуждались как часть roadmap, но **в MVP Main Menu не отображаются ни в каком виде** — ни активной карточкой, ни тизером. Они переехали в этот backlog, чтобы не перегружать первое публичное меню тизерами модулей, чьи сроки не определены, и снизить риск завышенных ожиданий у пилота-пользователя.

- **Weight & Balance** — CG envelope, MAC%, load sheet generation. Возвращается в Main Menu (либо как активный модуль, либо как тизер) одновременно со стартом разработки соответствующего sprint в Phase 3+.
- **Performance** — V1/VR/V2, LDR, ASDA, BFL. Возвращается в Main Menu в Phase 4+ по тому же паттерну.
- **Fuel Planning** — trip / contingency / alternate / final reserve / taxi. Phase 4+ или позже.

Когда любой из этих модулей входит в активную разработку, в `data.json` добавляется соответствующий entry (для тизера) или создаётся `src/features/<module>/` (для активного), и Main Menu автоматически его подхватит — изменения кода Main Menu для этого не требуются (см. `02_Specification/06-ui-spec.md` § Экран 3 и ADR-0004).

---

## Что НЕ входит в MVP (явно вынесено за скобки)

Следующие фичи **не включены** в MVP. Они задокументированы как Future Enhancements в `01-vision.md` (этот документ, секция ниже) и ADR `0001-mvp-scope.md` (создаётся в Phase B).

- ~~Boeing 787-9~~ — **активирован в Sprint B** (см. ADR-0013): полный 6/6 RWYCC coverage с собственным FCOM operational envelope, эквивалентный B787-8. Прежняя редакция этого документа отмечала B787-9 как disabled-сегмент в Phase 2; после Sprint B оба варианта равноправно активны в MVP.
- ~~Lower-RWYCC runway conditions~~ — все 6 RWYCC (Dry → Poor) активны после crosswind expansion series PR 2-7. RWYCC 0 (TAKE OFF NOT ALLOWED) intentionally not implemented в bundled data — operationally это prohibition state, not a numeric advisory. Pilot decision tree обрабатывает RWYCC 0 → "do not take off" вне приложения. Может revisit в post-launch evaluation.
- Wind direction + runway heading inputs с автоматическим расчётом crosswind component — Phase 2.
- Save / History calculations с экспортом в PDF — Phase 2/3.
- ~~Crosswind Landing модуль~~ — **активирован в Sprint C** (см. ADR-0014): categorical lookup + FCOM CAUTION adjustments для обоих ВС. Phase-2 запись сохранена для исторической трассируемости backlog'а; алгоритм оказался **проще** piecewise-linear модели takeoff'а (categorical, без weight/CG зависимости), поэтому реализация уложилась в один sprint.
- Weight & Balance модуль (CG envelope, MAC%, load sheet) — Phase 4.
- Performance V-speeds (V1/VR/V2, LDR, ASDA, BFL) — Phase 4+.
- Fuel Planning (trip / contingency / alternate / final reserve / taxi) — Phase 4+.
- Online-обновления bundled data через EAS Update — Phase 2.
- iCloud-синхронизация настроек между iPad-ами одного пилота — Phase 3+.
- Узбекский язык в локализации — Phase 2 при необходимости.
- Поддержка других моделей: Boeing 737, Boeing 777 — по запросу.
- Custom App version через Apple Business Manager для конкретных авиакомпаний — отдельная commercial-ветвь, по запросу.
- Apple Watch companion для быстрого взгляда на лимит — Phase 4+.
- Интерактивные графики зависимости лимита от веса/CG — Phase 3+.
- Интеграция с другими EFB-приложениями (ForeFlight, Lido) через export/import — по запросу.

---

## Категорические non-goals (никогда)

Эти направления приложение **никогда** не будет занимать, независимо от роста или фидбека. Они зафиксированы здесь, чтобы избежать scope creep в будущем.

- **Замена сертифицированного EFB.** Приложение всегда остаётся advisory-инструментом. Никогда не претендует на статус EFB Type B и не требует одобрения авиавластей.
- **Primary navigation, FMS-интеграция, ATC-данные.** Это компетенция Jeppesen FliteDeck Pro, ForeFlight и аналогичных сертифицированных продуктов.
- **Сбор персональных данных пилота.** Никаких аккаунтов, регистрации, отслеживания, аналитики поведения. Полная privacy by design.
- **Реклама в приложении.** Не размещается никогда.
- **Прямое копирование таблиц/страниц FCOM** в виде PDF, скриншотов или цифровых копий с одинаковыми значениями. Boeing IP не нарушается.
- **Брендинг авиакомпаний.** Логотипы, цвета или явные отсылки к конкретным операторам не используются в публичной версии.
- **Утверждения о сертификации.** Нигде в приложении или App Store Listing не пишется «Certified by Boeing», «Approved by FAA», «Equivalent to FCOM».

---

## Success criteria для MVP

MVP считается успешным, если выполнены **все** следующие критерии:

**Технические:**
- Приложение опубликовано в Public App Store без существенных замечаний от App Review.
- Все автоматические quality gates зелёные (lint, type-check, tests, build) на момент релиза.
- Coverage Domain-слоя ≥ 90 % unit-тестами.
- Минимум 30 acceptance-тест-кейсов на алгоритм Crosswind проходят.
- Время от запуска приложения до получения результата расчёта — не более 10 секунд для опытного пользователя.
- Приложение работает offline 100% времени, без единого сетевого запроса (proverify через Network logs).

**Регуляторные:**
- App Store Review пройден без отклонений по 1.4 (Physical Harm), 5.1.1 (Privacy), 2.3 (Accurate Metadata).
- Privacy Manifest присутствует, Privacy Label в App Store показывает «No data collected».
- Privacy Policy и Terms of Use доступны по ссылкам в App Store Listing и в About.

**Пользовательские:**
- Минимум 5 пилотов B787 проходят функциональное тестирование через TestFlight перед публичным релизом.
- Net Promoter Score среди тестовых пилотов ≥ 50 после 1 недели использования.
- Минимум 50 уникальных установок за первый месяц после публичного релиза.

**Архитектурные:**
- Добавление нового модуля не требует изменений в существующих модулях (проверяется на тестовом упражнении: добавляем «hello world»-модуль в отдельной ветке).
- Обновление bundled JSON-данных не требует изменений в коде (только bump dataVersion + замена JSON).

---

## Future Enhancements — register для памяти

Этот список фиксирует все идеи, которые мы обсуждали и которые потенциально интересны, но осознанно отложены. По мере реализации фичей или их отбраковки список обновляется.

**Phase 2 (после первого публичного релиза):**
- ~~Boeing 787-9 variant~~ — **shipped in MVP** (Sprint B / ADR-0013); запись сохранена для исторической трассируемости backlog'а.
- ~~Non-dry RWYCC runway conditions~~ — shipped в crosswind expansion series PR 2-7 (Good / Medium to Good / Medium / Medium to Poor / Poor). Сохранено для исторической трассируемости.
- ~~Crosswind Landing~~ — **shipped in MVP** (Sprint C / ADR-0014); реализован как categorical lookup + FCOM CAUTION adjustments, а не piecewise-linear модель. Запись сохранена для исторической трассируемости backlog'а.
- Wind direction + runway heading inputs → автоматический crosswind component → Within limit / Exceeded badge.
- Save / History calculations с экспортом в PDF.
- OTA-обновления bundled data через EAS Update.

**Phase 3+:**
- Weight & Balance модуль (CG envelope, MAC%, load sheet generation).
- Performance V-speeds (V1/VR/V2, LDR, ASDA, BFL).
- Fuel Planning (trip / contingency / alternate / final reserve / taxi).
- iCloud-синхронизация настроек между iPad-ами одного пилота.
- Интерактивные графики зависимости лимита от параметров.

**По запросу или demand:**
- Узбекский язык в локализации.
- Поддержка Boeing 737, Boeing 777.
- Custom App через Apple Business Manager для конкретных авиакомпаний.
- Apple Watch companion.
- Интеграция export/import с другими EFB.
- In-app purchase для премиум-функций (если возникнет смысл монетизации).

---

## Stakeholders

**Разработчик** — соло-разработчик проекта, действующий пилот Boeing 787. Оформлен как Apple Developer Individual, юрисдикция Узбекистан. Несёт полную ответственность за архитектуру, кодинг (через AI-ассистента Claude Code), App Store submission, поддержку.

**Beta-пилоты** — 5–10 действующих line pilots Boeing 787, привлечённых лично разработчиком. Тестируют через TestFlight перед публичным релизом, дают обратную связь по UX и корректности расчётов. Без формальных контрактов.

**Apple** — платформенный gatekeeper. App Store Review, Apple Developer Program, технические требования к приложению.

**Конечные пользователи** — любые пилоты Boeing 787, скачавшие приложение из App Store.

---

## Открытые вопросы (open questions)

Эти моменты **намеренно не закрыты** в этом документе. Их закрытие требует либо дополнительных входных данных, либо они правомерно откладываются до соответствующей Phase.

1. Точные числовые значения для Wet и Contaminated runway — будут предоставлены в Phase 2 на основе аналогичной таблицы коэффициентов.
2. Финальный список пилотов для бета-тестирования — формируется в Phase 1 ближе к завершению разработки MVP.
3. Финальная иконка приложения — Phase 0 финализирует, на момент написания спеки — placeholder «B7».
4. Финальные тексты Privacy Policy и Terms of Use — черновики в `07-app-store-compliance.md`, финализация — Phase B.
5. Стратегия будущей монетизации — не определена и не блокирует MVP. Архитектурно сохраняется возможность добавить in-app purchase без переписывания.

---

## Exit-критерии этого документа

Документ считается «принятым» (готовым к фиксации в репо), когда:

- [ ] Разработчик прочитал документ и не имеет несогласий с формулировками.
- [ ] Все секции «Что входит в MVP» и «Что НЕ входит в MVP» читаются однозначно — нет двусмысленностей.
- [ ] Список Future Enhancements не упускает ни одну ранее обсуждавшуюся идею.
- [ ] Категорические non-goals читаются как абсолютные ограничения, без «если что — может быть».
- [ ] Success criteria измеримы (содержат числа или однозначные критерии).
- [ ] Раздел Open Questions содержит только то, что правомерно отложено, а не то, что мы забыли обсудить.

После прохождения review статус документа в `README.md` меняется на «принят».
