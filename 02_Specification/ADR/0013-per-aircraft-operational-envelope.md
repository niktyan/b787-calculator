# ADR-0013 · Operational envelope moves from top-level to per-aircraft

**Status:** Accepted
**Date:** 2026-05-23
**Related:** `02_Specification/04-domain-model.md` § «JSON Schema bundled данных»,
`02_Specification/04-domain-model.md` § «Two distinct envelope concepts»,
`02_Specification/module-contracts/crosswind.md`,
`02_Specification/01-vision.md`,
`src/features/crosswind/data/schema.ts`,
`src/features/crosswind/data/b787-takeoff.json`,
`src/features/crosswind/data/crosswindRepository.ts`,
`src/features/crosswind/presentation/useCrosswindCalculator.ts`

## Context

До Sprint B `b787-takeoff.json` содержал ОДИН top-level
`operationalEnvelope` объект для всего файла. Значения соответствовали
B787-8 FCOM (weight `[104.1, 227.93]` t, CG `[6, 39.5]` %MAC).
Schema 2.2.0.

Sprint B активирует variant B787-9. FCOM-bounds для B787-9:

- weight: `[110.677, 259.228]` t (MTOW заметно выше B787-8 за счёт
  удлинённого фюзеляжа).
- CG: `[8, 37.5]` %MAC (отличается от B787-8 `[6, 39.5]`).

Эти envelope-bounds **разные для двух ВС**. Top-level envelope не
позволяет различить — потребуются:

- **Union envelope** (минимум из OEW, максимум из MTOW) — приведёт к
  ложным "in-envelope" для пилота B787-8 вводящего вес >227.93 t,
  выглядящего OK потому что он <259.228 t (B787-9 MTOW). Safety risk:
  пилот видит advisory-число для веса вне сертифицированного диапазона
  своего ВС.
- **Per-aircraft envelope** — точный per-FCOM, корректно flag-it
  out-of-spec для каждого ВС независимо.

Same reasoning applies к нижней границе CG: B787-9 OEW-CG 8 %MAC —
B787-8 пилот, вводящий CG=6, был бы ложно отвергнут под union-envelope
которая берёт `max(6, 8) = 8`.

## Decision

Перенести `operationalEnvelope` из top-level `CrosswindDataFile` в
каждый `byAircraft.<variant>` entry. Schema migration `2.2.0 → 2.3.0`
(minor breaking — structural).

After migration:

```jsonc
{
  "schemaVersion": "2.3.0",
  "byAircraft": {
    "b787_8": {
      "operationalEnvelope": { "weight": { ... }, "cg": { ... } }, // FCOM B787-8
      "dry": { ... }, "good": { ... }, ...
    },
    "b787_9": {
      "operationalEnvelope": { "weight": { ... }, "cg": { ... } }, // FCOM B787-9
      "dry": { ... }, "good": { ... }, ...
    }
  }
}
```

zod-схема обновлена под новый shape. `schemaVersion` regex
ужесточён до `^2\.3\.\d+$` чтобы legacy 2.2.x файлы (с top-level
envelope) валились loudly при load, а не загружались silently без
envelope-валидации.

Business-rule walker (`checkBusinessRules`) теперь ходит по
`byAircraft.*` и валидирует envelope каждого aircraft entry
(`minTons < maxTons`, `minPercent < maxPercent`) вместо одного
top-level check.

Repository экспортирует helper:

```typescript
function resolveOperationalEnvelope(
  data: CrosswindDataFile,
  aircraft: AircraftVariant,
): OperationalEnvelope | null;
```

View-model `useCrosswindCalculator.compute()` теперь resolve envelope
per active aircraft через `resolveOperationalEnvelope(data, inputs.aircraft)`.

Если выбранный aircraft отсутствует в `byAircraft` (data corruption
или future variant в не-готовом ещё data drop) — view-model переходит
в `data-not-available` state с `reason: 'aircraft-not-implemented'`,
тот же сигнал что и existing `resolveStrategy`-path. Per-field
envelope validation skipped (нет envelope против чего сравнивать).

## Consequences

**Positive:**

- Каждый ВС имеет свой точный FCOM-envelope. Safety-critical separation
  maintained.
- Easy to add future variants (B787-10 если когда-нибудь) — просто
  новый `byAircraft.<v>` entry со своим envelope. Schema не нужно
  дальше менять.
- Архитектурно корректно: envelope относится к конкретному aircraft
  type, не к "файлу данных как целому".
- Tightened `schemaVersion` regex даёт fail-loud поведение для
  старых JSON-файлов (включая случайные роллбэки или
  partially-deployed бандлы).

**Negative:**

- Breaking schema change: старые data files (2.2.0) не загружаются.
  Migration требует обновления JSON. Мы единственный consumer формата,
  так что это контролируемый рефактор, не публичный API.
- Чуть более verbose JSON: envelope дублируется per-aircraft (даже
  если совпадает). Для B787-8 vs B787-9 они разные, поэтому реального
  дублирования нет.

**Future:**

- Sprint C (Crosswind Landing) будет следовать той же patterned
  per-aircraft structure (`b787-landing.json` тоже будет per-aircraft
  envelope).
- Если когда-либо появится phase-dependent envelope (например, более
  рестриктивный MLW vs MTOW для landing) — это уже решено через
  отдельный JSON per phase, не требует дополнительных schema changes.

## Alternatives considered

**(a) Union envelope at top level.**
Take `min(oew_788, oew_789)` and `max(mtow_788, mtow_789)`. Rejected:
safety risk. A B787-8 pilot entering weight=240 t would not see a
field error because 240 < 259.228 (B787-9 MTOW), even though it is
above B787-8 MTOW 227.93. Advisory number would render for an
out-of-spec input.

**(b) Per-aircraft envelope passed as parameter to validators (no
schema change).**
Keep the top-level envelope as a default and let the use-case layer
pass an override per active aircraft. Rejected: the data layer is the
right home for envelope facts (they come from FCOM and version with
data drops). Threading per-aircraft envelopes through the use-case
boundary would mean either hard-coding bounds in view-model (worse
than the current code) or shipping a parallel envelope-lookup table
outside the JSON (more places to keep in sync).

**(c) Add `envelopeOverride: { b787_9: { ... } }` field, keep top-level
envelope as default.**
Backwards-compatible: existing files load as-is, override only kicks
in when present. Rejected: more complexity than the per-aircraft
restructure. Two envelope concepts (default + override) instead of one
(per-aircraft). Future variants would need to remember to set the
override; forgetting silently inherits the default. Per-aircraft has
no default to forget.

**(d) Defer Sprint B until after first App Store approval, ship B787-8
only.**
Rejected by user direction: Apple cited the app under Guideline 4.2
(Minimum Functionality). Sprint A closed three UX bugs; Sprint B
adds the functional depth that justifies the calculator's existence
as a domain tool rather than a single-formula novelty. Without B787-9
the resubmit risks repeating the same rejection.
