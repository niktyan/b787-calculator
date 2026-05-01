# src/features — Feature modules

Каждый feature-модуль (`crosswind`, `weight-balance`, `performance`, ...) живёт здесь как отдельная папка. Структура каждого модуля:

```
features/<name>/
├── presentation/   — screens, view-models
├── domain/         — entities, calculation logic, validators
├── data/           — repository, JSON loading, schemas
├── __tests__/      — unit и acceptance тесты
└── index.ts        — публичный API модуля (barrel)
```

**Жёсткие правила (enforce-нуты ESLint-ом):**

- Feature НЕ может импортировать другой feature (`import/no-restricted-paths`).
- `presentation` → `data` напрямую запрещён, только через `domain`.
- `domain` НЕ зависит от `react-native` или `expo*` — pure TypeScript.

См. `02_Specification/02-architecture.md` и `module-contracts/<feature>.md`.

В MVP: только `crosswind/` (см. Phase C спринт-промпта).
