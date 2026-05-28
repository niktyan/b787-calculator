# 10 · Glossary

## Назначение документа

Краткий справочник терминов проекта. Объединяет авиационные термины, специфичные для проекта понятия, технические концепции и процедурную лексику. Используется как быстрый lookup при чтении других документов спеки и при работе с кодом.

Если в любом другом документе встречается непонятный термин — он должен быть здесь. Если его здесь нет — это пробел, который заполняется в том же PR, где термин впервые используется.

---

## Авиационные термины

| Термин | Расшифровка / значение |
|--------|------------------------|
| **ACAP** | Airport Characteristics for Airport Planning. Публичный документ Boeing с физическими характеристиками самолёта (габариты, опорные веса, performance). Источник опорных значений для приложения. |
| **AFM** | Airplane Flight Manual. Юридически обязательный документ от производителя, утверждённый авиавластями. |
| **ATC** | Air Traffic Control. Управление воздушным движением. |
| **BFL** | Balanced Field Length. Расчётная сбалансированная длина ВПП. |
| **CG** | Center of Gravity. Центр тяжести самолёта. Выражается в %MAC. |
| **Crosswind** | Боковая составляющая ветра относительно направления ВПП. |
| **Crosswind component** | Произведение скорости ветра на синус угла между ветром и направлением ВПП. |
| **Dry runway** | Сухая ВПП — стандартное состояние без воды и контаминантов. |
| **EFB** | Electronic Flight Bag. Электронный пилотский планшет, заменяющий бумажные документы и карты. Бывает Type A (общий) и Type B (операционный, требует одобрения авиавластей). |
| **Envelope** | Допустимый диапазон параметров (например, weight envelope, CG envelope), внутри которого самолёт может безопасно эксплуатироваться. |
| **FAA** | Federal Aviation Administration. Авиавласть США. |
| **FCOM** | Flight Crew Operations Manual. Основной операционный мануал производителя для конкретного типа ВС. |
| **Flight phase** | Фаза полёта (takeoff, climb, cruise, descent, landing). |
| **FMS** | Flight Management System. Бортовая навигационная система. |
| **Gust** | Порыв ветра, превышающий среднюю скорость. |
| **ICAO** | International Civil Aviation Organization. Международная организация гражданской авиации, задаёт стандарты включая RWYCC. |
| **KT** | Knots, узлы. Стандартная единица измерения скорости ветра в авиации. 1 KT = 1.852 km/h. |
| **Landing weight** | Посадочный вес самолёта. Должен быть ≤ MLW. |
| **LDR** | Landing Distance Required. Требуемая длина ВПП для посадки. |
| **Line pilot** | Действующий пилот, выполняющий регулярные коммерческие полёты. |
| **MAC** | Mean Aerodynamic Chord. Средняя аэродинамическая хорда крыла. CG выражается как процент длины MAC. |
| **MLW** | Maximum Landing Weight. Максимально допустимый посадочный вес. |
| **OEW** | Operating Empty Weight. Эксплуатационный пустой вес самолёта. |
| **OM-A** | Operations Manual Part A. Общие операционные процедуры авиакомпании. |
| **OM-B** | Operations Manual Part B. Type-specific операционные процедуры авиакомпании. |
| **QRH** | Quick Reference Handbook. Краткий справочник для cockpit-использования с процедурами и таблицами. |
| **RWY** | Runway. Взлётно-посадочная полоса. |
| **RWYCC** | Runway Condition Code. ICAO-стандарт состояния полосы, шкала 1–6 (1 — наихудшее, 6 — сухая). |
| **TOW** | Take-Off Weight. Взлётный вес. |
| **V1/VR/V2** | Decision speed / Rotation speed / Takeoff safety speed. Ключевые скорости при взлёте. |
| **Wet runway** | Влажная ВПП с тонким слоем воды (< 3 mm). |
| **Contaminated runway** | Полоса с загрязнением (вода ≥ 3 mm, снег, лёд, slush). Описывается через RWYCC. |
| **Demonstrated crosswind** | Boeing-опубликованное значение бокового ветра, при котором самолёт прошёл сертификационные испытания. Для B787: 35 KT takeoff, 33 KT landing. |

---

## Термины проекта

| Термин | Расшифровка |
|--------|-------------|
| **Advisory** | Тип tool: предоставляет справочную информацию, не предписывающую. Окончательное решение всегда за пилотом. |
| **B787 Tools** | Display-имя проекта (App Store / in-app brand). Repository / slug technical name остаётся `b787-calculator` для непрерывности EAS / App Store Connect linking. |
| **Beta-pilot** | Действующий пилот, участвующий в TestFlight-тестировании до публичного релиза. |
| **Conservative advisory limits** | Операционные значения, намеренно более ограничительные, чем Boeing demonstrated values, для дополнительного запаса безопасности. |
| **Coming Soon module** | Неактивная карточка в Main Menu, отображающая будущий модуль. Реализуется через JSON-конфиг, не как настоящий feature-модуль. |
| **Data version** | Версия конкретного набора опорных значений в bundled JSON. Инкрементируется при изменении значений. См. `04-domain-model.md`. |
| **Schema version** | Версия структуры bundled JSON. Инкрементируется major при изменениях структуры (несовместимых со старым кодом). |
| **Breakpoint** | Точка в алгоритме piecewise-linear interpolation: пара (crosswind, intercept). См. `05-crosswind-algorithm.md`. |
| **Threshold** | CG-граница для конкретного breakpoint при текущем весе. Вычисляется как `slope × weightKilolbs + intercept`. |
| **Envelope (project sense)** | Допустимый диапазон входных параметров для алгоритма (`envelope.weight`, `envelope.cg` в JSON). |
| **IFNA-fallback** | Поведение Excel-формулы возвращать 40 KT, если XLOOKUP не находит значения. См. `05-crosswind-algorithm.md`. |
| **Source chip** | UI-элемент на экране результата, показывающий «Reference: 787 FCOM». |
| **Disclaimer flag** | Boolean-флаг в AsyncStorage: подтвердил ли пользователь advisory-дисклеймер. |

---

## Технические термины (TypeScript / React Native / Expo)

| Термин | Расшифровка |
|--------|-------------|
| **AsyncStorage** | API для асинхронного key-value хранения на устройстве. Используется для настроек. |
| **Barrel-файл** | `index.ts`-файл, который re-exports публичный API модуля или папки. |
| **Branded type** | TypeScript-приём: `type WeightInTons = number & { __brand: 'WeightInTons' }`. Создаёт типобезопасную обёртку над примитивом. |
| **Bundled JSON** | JSON-файл, упакованный в bundle приложения при сборке. Доступен через `require()` или `import`. |
| **Clean Architecture** | Архитектурный паттерн с разделением на слои Presentation/Domain/Data и правилом зависимостей direction inward. |
| **DI (Dependency Injection)** | Способ передачи зависимостей в код извне, через параметры или контекст. |
| **EAS Build** | Облачный сервис Expo для сборки iOS/Android приложений. Не требует Mac. |
| **EAS Submit** | Облачный сервис Expo для отправки сборок в App Store Connect / Google Play. |
| **EAS Update** | Облачный сервис Expo для OTA-обновлений (Over-The-Air) без re-submission. |
| **Expo** | Платформа поверх React Native, упрощающая разработку и сборку. |
| **Expo Go** | Mobile-приложение для тестирования development-сборок Expo проектов. |
| **expo-router** | Файлово-системный router для React Native, аналог Next.js. |
| **i18next** | Библиотека для интернационализации (i18n). |
| **Lint** | Статический анализатор кода. В проекте — ESLint. |
| **OTA (Over-The-Air)** | Обновление приложения без переиздания через App Store. См. EAS Update. |
| **Repository pattern** | Абстракция над источником данных (БД, JSON, API) для domain-слоя. |
| **Result-pattern** | Тип `Result<T, E>` для явного возврата успеха или ошибки, без выбрасывания исключений. |
| **strictNullChecks** | Опция TypeScript: запрещает использование null/undefined без явной обработки. |
| **Use Case** | Класс или функция, выполняющая один сценарий бизнес-логики, координируя источники данных. |
| **Value Object** | Immutable объект, представляющий значение с физическим смыслом. См. `04-domain-model.md`. |
| **zod** | Библиотека для runtime-валидации схем данных в TypeScript. |

---

## Apple App Store термины

| Термин | Расшифровка |
|--------|-------------|
| **App Privacy Label** | Раздел в App Store Listing, описывающий какие данные собирает приложение. |
| **App Review** | Процесс модерации приложений Apple перед публикацией. |
| **App Review Guidelines** | Правила Apple, которые приложение обязано соблюдать. |
| **App Review Notes** | Текстовые комментарии разработчика для App Reviewer-а в App Store Connect. |
| **App Store Connect** | Веб-портал Apple для управления приложениями. |
| **App Store Listing** | Публичная страница приложения в App Store (имя, описание, скриншоты, etc). |
| **Custom App** | Приватное распространение приложения через Apple Business Manager (не используется в нашем MVP). |
| **DUNS Number** | Идентификатор юридического лица для регистрации Apple Developer Organization. |
| **Expedited Review** | Ускоренный App Review, доступен для критичных hotfix-ов. |
| **Phased Release** | Постепенное раскатывание обновления в App Store за 7 дней. |
| **Privacy Manifest** | `PrivacyInfo.xcprivacy` файл, декларирующий использование данных. Обязателен с мая 2024. |
| **Required Reason API** | API, использование которых требует декларации обоснования в Privacy Manifest. |
| **TestFlight** | Apple-сервис для бета-тестирования iOS приложений. |

---

## Процедурные термины

| Термин | Расшифровка |
|--------|-------------|
| **ADR** | Architecture Decision Record. Краткий документ, фиксирующий архитектурное решение и его обоснование. |
| **AGENTS.md** | Файл с инструкциями для AI-агентов работающих с проектом. |
| **CLAUDE.md** | Файл с инструкциями специально для Claude Code. |
| **Conventional Commits** | Формат commit-сообщений: `type(scope): message`. См. `09-cicd-and-ops.md`. |
| **CI/CD** | Continuous Integration / Continuous Deployment. Автоматизация проверок и деплоя. |
| **Definition of Done (DoD)** | Чек-лист критериев, при выполнении которых задача считается завершённой. |
| **Dependabot** | GitHub-сервис для автоматического обновления зависимостей. |
| **MVP** | Minimum Viable Product. Минимальная функциональная версия для первого релиза. |
| **OKR / KPI** | Не используются явно в проекте, см. Success Criteria в `01-vision.md`. |
| **Phase A/B/C/D/E/F** | Этапы проекта: Spec / Setup / Implementation / Pre-submission / Submission / Post-launch. |
| **PR (Pull Request)** | Запрос на слияние feature-ветки в main с обязательным review и CI. |
| **Sprint** | Один цикл реализации одного модуля: спека-промпт-код-тесты-PR-merge. |
| **Squash merge** | Стратегия merge: вся ветка склеивается в один коммит. Используется в проекте. |
| **TestFlight beta** | Период тестирования на TestFlight перед App Store submission. |
| **Trunk-based development** | Стратегия с одной долгоживущей веткой `main` и короткими feature-ветками. Используется в проекте. |

---

## Exit-критерии этого документа

- [ ] Все термины, используемые в документах 01–09, присутствуют здесь.
- [ ] Расшифровки понятны без обращения к внешним источникам.
- [ ] Документ обновляется при добавлении новых терминов в код или спеку.
