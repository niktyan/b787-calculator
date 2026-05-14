# Architecture Decision Records (ADR)

Эта папка содержит записи **архитектурных решений** проекта. Каждый ADR — короткий документ с одной структурой:

- **Title:** короткое имя решения.
- **Status:** Proposed / Accepted / Superseded / Deprecated.
- **Context:** проблема, которую решаем; ограничения и силы, влияющие на выбор.
- **Decision:** что именно мы решили.
- **Consequences:** последствия — позитивные, негативные, нейтральные.
- **Alternatives considered:** какие альтернативы рассматривали и почему отвергли.

## Когда создаётся новый ADR

Новый ADR создаётся, когда:
- Принимается архитектурное решение, выходящее за рамки уже принятых.
- Меняется или дополняется существующее решение (новый ADR с пометкой «Supersedes ADR-XXXX»).
- Возникает спор между подходами в коде, и нужно зафиксировать окончательный выбор.

## Когда НЕ создаётся ADR

ADR не нужен для:
- Чисто implementation-выборов (например, имя переменной или порядок параметров).
- Решений, которые уже описаны в спеке (`02_Specification/`) — они там и остаются.
- Личных предпочтений по стилю кода (это в `08-quality-gates.md`).

## Нумерация и формат файлов

`NNNN-title-in-kebab-case.md`, где `NNNN` — это 4-значный счётчик с ведущими нулями (`0001`, `0002`, ...).

## Текущие ADR

| Номер | Заголовок | Статус |
|-------|-----------|--------|
| 0001 | Clean Architecture only at module boundaries | Accepted |
| 0002 | React Native + Expo over native Swift | Accepted |
| 0003 | Bundled JSON with explicit versioning | Accepted |
| 0004 | Coming Soon modules as config, not modules | Accepted |
| 0005 | Flat ESLint config (Expo SDK 54+) | Accepted |
| 0006 | EAS first-build credentials choices | Accepted |
| 0007 | Adopt react-native-svg for crosswind visualization | Accepted |
| 0008 | Dependabot major-bump policy for SDK-coordinated packages | Accepted |
| 0009 | Light-theme accent text contrast — split `accent` into `accent` + `accentText` | Accepted |
