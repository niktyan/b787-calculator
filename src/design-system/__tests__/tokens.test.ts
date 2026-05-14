import { tokens } from '../tokens';

/**
 * Token-level tests guarding the four forward-signaled additions from
 * PR #27 (см. `02_Specification/module-contracts/design-system.md`):
 *
 *   - `colors.accentOnAccent` — high-contrast foreground on the teal
 *     accent surface (identical in light + dark for WCAG AA).
 *   - `typography.variants.microUppercase` — 9 pt uppercase label.
 *   - `typography.variants.monoSmall` — 11 pt mono.
 *   - `typography.variants.monoMedium` — 24 pt mono.
 *
 * The test asserts numeric values verbatim against spec so an accidental
 * later edit to `tokens.ts` cannot silently drift away from the
 * Visual-treatment subsections that consume them.
 */

describe('design-system tokens · forward-signaled additions', () => {
  describe('colors.accentOnAccent', () => {
    it('exists in the dark palette as #001A17', () => {
      expect(tokens.colors.dark.accentOnAccent).toBe('#001A17');
    });

    it('exists in the light palette as #001A17 (identical to dark for WCAG AA)', () => {
      expect(tokens.colors.light.accentOnAccent).toBe('#001A17');
    });

    it('matches the existing textOnAccent value in both themes', () => {
      // Confirms intent: "accent foreground" is one constant referenced
      // from two differently-named tokens. If they ever diverge, that's
      // a deliberate decision and this test must be updated.
      expect(tokens.colors.dark.accentOnAccent).toBe(tokens.colors.dark.textOnAccent);
      expect(tokens.colors.light.accentOnAccent).toBe(tokens.colors.light.textOnAccent);
    });
  });

  describe('colors.accentText', () => {
    // ADR-0009 — accentText is the text/icon-foreground variant of the
    // brand accent. Dark theme keeps the brand teal; light theme uses a
    // darker variant so the same labels pass WCAG SC 1.4.3 AA on cream
    // and white surfaces.
    it('keeps the brand teal in dark theme', () => {
      expect(tokens.colors.dark.accentText).toBe('#00C2A8');
    });

    it('uses #006B5E in light theme for WCAG AA contrast', () => {
      expect(tokens.colors.light.accentText).toBe('#006B5E');
    });

    it('matches the surface accent in dark (no visible change in cockpit mode)', () => {
      expect(tokens.colors.dark.accentText).toBe(tokens.colors.dark.accent);
    });

    it('diverges from the surface accent in light (brand teal stays for fills)', () => {
      expect(tokens.colors.light.accentText).not.toBe(tokens.colors.light.accent);
    });
  });

  describe('typography.variants.microUppercase', () => {
    it('matches spec: sans 9 / 12, weight 600, letterSpacing 0.54', () => {
      const v = tokens.typography.variants.microUppercase;
      expect(v.fontFamily).toBe(tokens.typography.fontFamily.sans);
      expect(v.fontSize).toBe(9);
      expect(v.lineHeight).toBe(12);
      expect(v.fontWeight).toBe('600');
      expect(v.letterSpacing).toBeCloseTo(0.54, 5);
    });
  });

  describe('typography.variants.monoSmall', () => {
    it('matches spec: mono 11 / 16, weight 400, letterSpacing 0', () => {
      const v = tokens.typography.variants.monoSmall;
      expect(v.fontFamily).toBe(tokens.typography.fontFamily.mono);
      expect(v.fontSize).toBe(11);
      expect(v.lineHeight).toBe(16);
      expect(v.fontWeight).toBe('400');
      expect(v.letterSpacing).toBe(0);
    });
  });

  describe('typography.variants.monoMedium', () => {
    it('matches spec: mono 24 / 28, weight 700, letterSpacing -0.5', () => {
      const v = tokens.typography.variants.monoMedium;
      expect(v.fontFamily).toBe(tokens.typography.fontFamily.mono);
      expect(v.fontSize).toBe(24);
      expect(v.lineHeight).toBe(28);
      expect(v.fontWeight).toBe('700');
      expect(v.letterSpacing).toBeCloseTo(-0.5, 5);
    });
  });

  describe('TypographyToken union (Text variant prop)', () => {
    it('exposes microUppercase, monoSmall, monoMedium as valid variant keys', () => {
      // Compile-time: variant prop on <Text> is `keyof typeof typography.variants`.
      // If any of these is missing from the variants map, this test won't compile.
      const keys: readonly (keyof typeof tokens.typography.variants)[] = [
        'microUppercase',
        'monoSmall',
        'monoMedium',
      ];
      for (const key of keys) {
        expect(tokens.typography.variants[key]).toBeDefined();
      }
    });
  });
});
