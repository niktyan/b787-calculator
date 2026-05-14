/**
 * Locale parity test — guards against keys present in one locale file but
 * missing from the other. Both directions are checked so neither file can
 * silently become the source of truth: a key added to `en.json` without a
 * Russian translation fails the test, and the symmetric orphan in
 * `ru.json` fails it too.
 *
 * Disclaimer-body keys (`disclaimer.title`, `disclaimer.body`,
 * `about.disclaimer`) intentionally ship the same English string in both
 * locales per `02_Specification/06-ui-spec.md` § Локализация (юридическая
 * однозначность). The parity check only enforces key presence, not value
 * difference, so this invariant lives outside the test.
 */

import en from '../locales/en.json';
import ru from '../locales/ru.json';

function flattenKeys(obj: unknown, prefix = ''): readonly string[] {
  if (obj === null || typeof obj !== 'object') {
    return [prefix];
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  return entries.flatMap(([key, value]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (value !== null && typeof value === 'object') {
      return flattenKeys(value, path);
    }
    return [path];
  });
}

describe('i18n locale parity (en ↔ ru)', () => {
  const enKeys = new Set(flattenKeys(en));
  const ruKeys = new Set(flattenKeys(ru));

  it('every key in en.json has a translation in ru.json', () => {
    const missingInRu = [...enKeys].filter((k) => !ruKeys.has(k)).sort();
    expect(missingInRu).toEqual([]);
  });

  it('every key in ru.json has a translation in en.json', () => {
    const orphansInRu = [...ruKeys].filter((k) => !enKeys.has(k)).sort();
    expect(orphansInRu).toEqual([]);
  });

  it('both files expose the same set of keys', () => {
    expect([...enKeys].sort()).toEqual([...ruKeys].sort());
  });
});
