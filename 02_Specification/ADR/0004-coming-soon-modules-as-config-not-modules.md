# ADR-0004 · Coming Soon modules as config, not modules

**Status:** Accepted
**Date:** 2026-04
**Related:** `01-vision.md`, `06-ui-spec.md`

## Context

Согласно `01-vision.md`, в Main Menu приложения должны отображаться не только активные модули, но и «coming soon» карточки — будущие модули с явной маркировкой фазы их появления. Цель: показать пользователю растущую экосистему, создать ожидание расширений.

Возможные подходы реализации:

1. **«Coming soon» как настоящие feature-модули** — папка `src/features/<future-module>/` с заглушкой-screen-ом, которая показывает «Coming soon»-сообщение. При тапе — навигация на этот заглушка-экран.
2. **«Coming soon» как пункты в JSON-конфиге** — список модулей с метаданными (id, name, description, phase) хранится в `src/core/coming-soon-modules.json` или подобном. UI Main Menu рендерит активные feature-модули + строки из конфига. При тапе на «coming soon» — modal-окно объясняющее, что модуль планируется.

Подход 1 даёт «настоящие» модули с возможностью развивать их потом, но создаёт overhead: пустые папки, заглушки, которые потом заменяются. Подход 2 — лёгкий, не создаёт лишних артефактов, но требует чёткого разделения «активный модуль» vs «тизер».

## Decision

**Coming Soon модули — это пункты JSON-конфига, не настоящие feature-модули.**

Конфиг живёт в `src/core/coming-soon-modules.json` (или эквивалент):

```json
[
  {
    "id": "crosswind-takeoff",
    "name": "Crosswind · Takeoff",
    "description": "Same logic for departure phase",
    "icon": "TO",
    "phase": "Phase 2"
  },
  {
    "id": "weight-balance",
    "name": "Weight & Balance",
    "description": "CG envelope, MAC%, loading sheet",
    "icon": "WB",
    "phase": "Phase 3"
  },
  {
    "id": "performance",
    "name": "Performance",
    "description": "V1/VR/V2, LDR, ASDA, BFL",
    "icon": "PF",
    "phase": "Phase 4"
  }
]
```

Main Menu UI рендерит:
- Активные feature-модули (импортируются из `src/features/*` через barrel-файлы).
- Затем — все элементы из coming-soon JSON.

Тап на coming-soon карточку открывает modal с текстом «This module is planned for an upcoming release. Stay tuned.» и кнопкой OK. Никакой навигации на отдельный экран.

Когда модуль превращается из «coming soon» в активный (например, в Phase 2 — Crosswind Takeoff):
1. Создаётся настоящий feature-модуль `src/features/crosswind-takeoff/`.
2. Module добавляется в Main Menu как активная карточка (через свой barrel-export).
3. Из coming-soon JSON удаляется соответствующая запись.

## Consequences

**Позитивные:**
- Никаких пустых папок и заглушек в `src/features/`.
- Список coming-soon обновляется простой правкой JSON, не требует кода.
- В Phase 2+ можно использовать EAS Update для обновления roadmap без re-submission (если JSON обновляется, структура совместима).
- Чёткое архитектурное разделение «реальные модули» vs «маркетинговая roadmap».
- Защита от случайного навигационного входа на нереализованный экран.

**Негативные:**
- Нужно чётко документировать, что coming-soon JSON — это UI-конфиг, не часть domain-логики (зафиксировано в `01-vision.md`).
- При превращении coming-soon в активный требуется правка двух мест (JSON и Main Menu), но это естественно.

**Нейтральные:**
- JSON живёт в `src/core/`, потому что используется Main Menu (Application Shell в App), а не одним feature-модулем.

## Alternatives considered

**Coming soon как настоящие модули с заглушками.** Отвергнут: создаёт лишние пустые папки и риск, что заглушка-screen будет случайно использоваться или тестироваться.

**Hardcoded в Main Menu component.** Отвергнут: усложняет обновление roadmap (требует кода-PR), нарушает разделение data/code.

**Внешний remote-конфиг.** Отвергнут: противоречит политике полного офлайна.
