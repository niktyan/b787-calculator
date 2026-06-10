import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '../../../../core/theming';
import { positionBottomDocked } from '../../../anchored-popover/computeAnchoredPosition';
import { computeKeypadPosition, NumericKeypadHost } from '../NumericKeypadHost';
import { NumericKeypadProvider } from '../NumericKeypadProvider';
import { useNumericKeypadContext } from '../NumericKeypadContext';
import type {
  FieldAnchor,
  NumericKeypadContextValue,
  RegisteredField,
} from '../NumericKeypadContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Drive `useWindowDimensions()` from per-test fixtures. Default is the
// iPad-landscape size that exercises the wide branch (anchored popover);
// individual tests override via `setWindowDimensions(...)` before render.
// The `mock*` prefix is required so jest.mock's hoisted factory can
// reference the binding (jest blocks non-`mock`-prefixed out-of-scope
// names inside mock factories).
let mockWindow = { width: 1024, height: 768, fontScale: 1, scale: 2 };

function setWindowDimensions(width: number, height: number): void {
  mockWindow = { ...mockWindow, width, height };
}

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: (): { width: number; height: number; fontScale: number; scale: number } => mockWindow,
}));

interface HarnessSetup {
  readonly tree: ReturnType<typeof render>;
  readonly sink: { value: NumericKeypadContextValue | null };
}

// Default insets — overridden in bottom-dock tests where a non-zero
// bottom mirrors a real iPhone home-indicator safe area.
const ZERO_INSETS: Metrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 0, height: 0 },
};

function renderHost(initialMetrics: Metrics = ZERO_INSETS): HarnessSetup {
  const sink: { value: NumericKeypadContextValue | null } = { value: null };
  function Tap(): ReactElement {
    const ctx = useNumericKeypadContext();
    sink.value = ctx;
    return null as unknown as ReactElement;
  }
  const tree = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider initialMode="dark">
        <NumericKeypadProvider>
          <Tap />
          <NumericKeypadHost />
        </NumericKeypadProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { tree, sink };
}

function withInsets(bottom: number): Metrics {
  return {
    insets: { top: 0, right: 0, bottom, left: 0 },
    frame: { x: 0, y: 0, width: 0, height: 0 },
  };
}

function valueRef(initial: string): { current: string } {
  return { current: initial };
}

const TEST_ANCHOR: FieldAnchor = { x: 100, y: 200, width: 160, height: 44 };

function fieldOn(state: { current: string }, id: string, isRegular = false): RegisteredField {
  return {
    id,
    getValue: () => state.current,
    setValue: (next): void => {
      state.current = next;
    },
    isRegular,
    getAnchor: () => Promise.resolve(TEST_ANCHOR),
  };
}

// Registration triggers `field.getAnchor().then(setActiveAnchor)`. The promise
// resolves on the next microtask, so tests must flush it before asserting on
// the rendered Modal contents.
async function registerAndFlush(
  sink: { value: NumericKeypadContextValue | null },
  field: RegisteredField,
): Promise<void> {
  await act(async () => {
    sink.value?.registerField(field);
    await Promise.resolve();
  });
}

describe('NumericKeypadHost', () => {
  // Existing test suite defaults to iPad landscape (1024 × 768), which
  // exercises the wide-screen anchored-popover branch. The bottom-dock
  // describe block below overrides to iPhone widths before each test
  // and resets afterwards.
  beforeEach(() => {
    setWindowDimensions(1024, 768);
  });

  it('renders the popover hidden when no field is active', () => {
    const { tree } = renderHost();
    // Modal is rendered with visible=false; querying the keypad confirms
    // the popover content tree is not present yet.
    expect(tree.queryByTestId('numeric-keypad')).toBeNull();
  });

  it('shows the keypad after a field is registered and the anchor resolves', async () => {
    const { tree, sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    expect(tree.getByTestId('numeric-keypad')).toBeTruthy();
  });

  it('forwards key presses to the active field', async () => {
    const { tree, sink } = renderHost();
    const state = valueRef('17');
    await registerAndFlush(sink, fieldOn(state, 'weight'));
    fireEvent.press(tree.getByTestId('numeric-keypad-key-0'));
    expect(state.current).toBe('170');
  });

  it('closes the keypad when Done is tapped', async () => {
    const { tree, sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    expect(tree.queryByTestId('numeric-keypad')).toBeTruthy();
    fireEvent.press(tree.getByTestId('numeric-keypad-done'));
    expect(sink.value?.activeFieldId).toBeNull();
  });

  it('closes the keypad when the backdrop is tapped', async () => {
    const { tree, sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    fireEvent.press(tree.getByTestId('numeric-keypad-host-backdrop'));
    expect(sink.value?.activeFieldId).toBeNull();
  });

  it('propagates the active field isRegular flag through the context', async () => {
    // Regular vs. compact sizing is visually pinned by snapshot tests in
    // NumericKeypad.test.tsx; here we only verify the Host's data path.
    const { sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight', true));
    expect(sink.value?.activeIsRegular).toBe(true);
  });

  it('exposes the resolved anchor through the context', async () => {
    const { sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    expect(sink.value?.activeAnchor).toEqual(TEST_ANCHOR);
  });

  it('clears the anchor when the active field is cleared', async () => {
    const { sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    act(() => {
      sink.value?.clearActiveField();
    });
    expect(sink.value?.activeAnchor).toBeNull();
  });

  it('renders the Modal with animationType="none" (no fade lag)', async () => {
    // Fade animation in Modal added ~250-300ms to tap-to-keypad latency.
    // ADR-0011 Iteration 3 §2 switches it off. Modal is hidden until a
    // field registers — we need to register first so the Modal tree mounts.
    const { tree, sink } = renderHost();
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const host = tree.getByTestId('numeric-keypad-host');
    expect(host.props.animationType).toBe('none');
  });
});

describe('computeKeypadPosition', () => {
  // Width / height combinations represent the two algorithmic branches:
  //  - IPAD_LANDSCAPE (>= 768 pt wide) → "beside the field" cascade
  //    (right / left / above-or-below fallback)
  //  - IPHONE_PORTRAIT (< 768 pt wide) → "above / below" cascade
  // See ADR-0011 Iteration 2 §3 for the rationale.
  const IPAD_LANDSCAPE = { width: 1024, height: 768 };
  const IPHONE_PORTRAIT = { width: 390, height: 844 };
  const KEYPAD_SIZE = { width: 280, height: 320 };

  describe('wide screen (>= 768 pt) — beside-the-field cascade', () => {
    it('places the popover to the right of the field when there is room', () => {
      const anchor: FieldAnchor = { x: 100, y: 200, width: 160, height: 44 };
      const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
      // anchor.x + anchor.width + ANCHOR_OFFSET = 100 + 160 + 8 = 268
      expect(position.left).toBe(268);
    });

    it('falls back to the left side when the right side has no room', () => {
      const anchor: FieldAnchor = { x: 700, y: 200, width: 160, height: 44 };
      const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
      // rightSpace = 1024 - 860 = 164 < 280+8+16=304 → left
      // anchor.x - keypadWidth - ANCHOR_OFFSET = 700 - 280 - 8 = 412
      expect(position.left).toBe(412);
    });

    it('falls back to above/below when neither side has horizontal room', () => {
      // Narrow iPad-mini portrait with a very wide field hugging the
      // middle of the screen.
      const screen = { width: 768, height: 1024 };
      const anchor: FieldAnchor = { x: 200, y: 400, width: 460, height: 44 };
      const position = computeKeypadPosition(anchor, screen, KEYPAD_SIZE);
      // topSpace = 400 ≥ 320+8+16=344 → above field
      // top = 400 - 320 - 8 = 72
      expect(position.top).toBe(72);
      // Horizontally centered on field: center = 430, left = 430 - 140 = 290
      expect(position.left).toBe(290);
    });

    it('aligns vertically with the top of the field by default', () => {
      const anchor: FieldAnchor = { x: 100, y: 200, width: 160, height: 44 };
      const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
      expect(position.top).toBe(200);
    });

    it('clamps the vertical position so the popover never spills off-screen', () => {
      const anchor: FieldAnchor = { x: 100, y: 600, width: 160, height: 44 };
      const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
      // maxTop = 768 - 320 - 16 = 432
      expect(position.top).toBe(432);
    });

    it('clamps the vertical position to the top safe margin', () => {
      const anchor: FieldAnchor = { x: 100, y: 4, width: 160, height: 44 };
      const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
      expect(position.top).toBe(16);
    });
  });

  describe('compact screen (< 768 pt) — above-or-below cascade', () => {
    it('places the popover above the field when there is room above', () => {
      const anchor: FieldAnchor = { x: 16, y: 400, width: 358, height: 44 };
      const position = computeKeypadPosition(anchor, IPHONE_PORTRAIT, KEYPAD_SIZE);
      // topSpace = 400 ≥ 320+8+16=344 → above
      // top = 400 - 320 - 8 = 72
      expect(position.top).toBe(72);
    });

    it('falls back to below the field when there is no room above', () => {
      const anchor: FieldAnchor = { x: 16, y: 80, width: 358, height: 44 };
      const position = computeKeypadPosition(anchor, IPHONE_PORTRAIT, KEYPAD_SIZE);
      // topSpace = 80 < 344; bottomSpace = 844 - 124 = 720 ≥ 344 → below
      // top = 80 + 44 + 8 = 132
      expect(position.top).toBe(132);
    });

    it('horizontally centers the popover on the field', () => {
      // Field centered on screen: fieldCenter = 16 + 358/2 = 195
      // left = 195 - 280/2 = 55
      const anchor: FieldAnchor = { x: 16, y: 400, width: 358, height: 44 };
      const position = computeKeypadPosition(anchor, IPHONE_PORTRAIT, KEYPAD_SIZE);
      expect(position.left).toBe(55);
    });

    it('clamps the popover to the left screen margin', () => {
      // Field hugs the left edge — centered popover would go off-screen left.
      const anchor: FieldAnchor = { x: 0, y: 400, width: 80, height: 44 };
      const position = computeKeypadPosition(anchor, IPHONE_PORTRAIT, KEYPAD_SIZE);
      expect(position.left).toBe(16);
    });

    it('clamps the popover to the right screen margin', () => {
      // Field hugs the right edge — centered popover would go off-screen right.
      const anchor: FieldAnchor = { x: 310, y: 400, width: 80, height: 44 };
      const position = computeKeypadPosition(anchor, IPHONE_PORTRAIT, KEYPAD_SIZE);
      // maxLeft = 390 - 280 - 16 = 94
      expect(position.left).toBe(94);
    });

    it('clamps to the top margin when neither above nor below fits but more room is above', () => {
      // Short compact screen with a field below middle.
      //   topSpace = 300, bottomSpace = 550 - 344 = 206 — both < 344.
      //   topSpace > bottomSpace → clamp to top margin.
      const screen = { width: 390, height: 550 };
      const anchor: FieldAnchor = { x: 16, y: 300, width: 358, height: 44 };
      const position = computeKeypadPosition(anchor, screen, KEYPAD_SIZE);
      expect(position.top).toBe(16);
    });

    it('clamps to the bottom margin when neither above nor below fits but more room is below', () => {
      // Field near the top — both sides under 344 but bottom has more.
      //   topSpace = 100, bottomSpace = 550 - 144 = 406 ≥ 344 → below fits.
      // We want both insufficient — use a smaller screen height:
      const screen = { width: 390, height: 480 };
      const anchor: FieldAnchor = { x: 16, y: 100, width: 358, height: 44 };
      // topSpace = 100, bottomSpace = 480 - 144 = 336 — both < 344.
      // bottomSpace > topSpace → clamp to bottom: 480 - 320 - 16 = 144.
      const position = computeKeypadPosition(anchor, screen, KEYPAD_SIZE);
      expect(position.top).toBe(144);
    });
  });
});

// ADR-0011 Iteration 4 — bottom-dock on iPhone-compact.
//
// `positionBottomDocked` is a pure helper; the host wires it on
// `screen.width < COMPACT_WIDTH_BREAKPOINT` and substitutes
// `useSafeAreaInsets().bottom` for the inset arg. These tests exercise
// the helper directly + the host-level integration (Modal popover top +
// height vs. screen height − safe-area).
describe('positionBottomDocked (ADR-0011 Iteration 4)', () => {
  // iPhone 15 Pro logical size + home-indicator safe inset.
  const IPHONE_15 = { width: 393, height: 852 };
  const HOME_INDICATOR_INSET = 34;
  const KEYPAD_COMPACT_FULL_WIDTH = { width: 393, height: 304 };

  it('docks the popover so its bottom edge sits on the safe-area top', () => {
    const pos = positionBottomDocked(IPHONE_15, KEYPAD_COMPACT_FULL_WIDTH, HOME_INDICATOR_INSET);
    // top + height === screen.height - safeAreaBottom
    expect(pos.top + KEYPAD_COMPACT_FULL_WIDTH.height).toBe(
      IPHONE_15.height - HOME_INDICATOR_INSET,
    );
  });

  it('places a full-width popover at left=0', () => {
    const pos = positionBottomDocked(IPHONE_15, KEYPAD_COMPACT_FULL_WIDTH, HOME_INDICATOR_INSET);
    expect(pos.left).toBe(0);
  });

  it('horizontally centres a narrower popover on the screen', () => {
    const narrow = { width: 280, height: 304 };
    const pos = positionBottomDocked(IPHONE_15, narrow, HOME_INDICATOR_INSET);
    // (393 - 280) / 2 = 56.5
    expect(pos.left).toBe((IPHONE_15.width - narrow.width) / 2);
  });

  it('ignores the anchor — same dock position regardless of field y', () => {
    // The helper has no `anchor` argument by design. Two different
    // logical scenarios (CG vs TOW active) produce identical dock
    // positions because the only inputs are screen + popover + inset.
    const dockFromCG = positionBottomDocked(
      IPHONE_15,
      KEYPAD_COMPACT_FULL_WIDTH,
      HOME_INDICATOR_INSET,
    );
    const dockFromTOW = positionBottomDocked(
      IPHONE_15,
      KEYPAD_COMPACT_FULL_WIDTH,
      HOME_INDICATOR_INSET,
    );
    expect(dockFromCG).toEqual(dockFromTOW);
  });

  it('handles safeAreaBottom=0 (older iPhones / test environment)', () => {
    const pos = positionBottomDocked(IPHONE_15, KEYPAD_COMPACT_FULL_WIDTH, 0);
    expect(pos.top + KEYPAD_COMPACT_FULL_WIDTH.height).toBe(IPHONE_15.height);
  });
});

describe('NumericKeypadHost — bottom-dock integration on iPhone-compact', () => {
  const IPHONE_PORTRAIT = { width: 393, height: 852 };
  const HOME_INDICATOR_INSET = 34;
  const KEYPAD_HEIGHT_COMPACT = 304;

  // Helper: extracts the rendered popover's flat style. The inner
  // Pressable is the second matching popover surface inside the host
  // Modal — find it by walking from the backdrop.
  function popoverStyle(tree: ReturnType<typeof render>): {
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
    readonly borderTopLeftRadius?: number;
    readonly borderTopRightRadius?: number;
    readonly borderRadius?: number;
    readonly borderTopWidth?: number;
    readonly borderWidth?: number;
  } {
    const backdrop = tree.getByTestId('numeric-keypad-host-backdrop');
    // The popover Pressable is the only direct child of the backdrop.
    const popover = backdrop.children[0] as { props: { style: unknown } };
    return popover.props.style as ReturnType<typeof popoverStyle>;
  }

  beforeEach(() => {
    setWindowDimensions(IPHONE_PORTRAIT.width, IPHONE_PORTRAIT.height);
  });

  it('renders the keypad bottom-flush against the safe-area inset', async () => {
    const { tree, sink } = renderHost(withInsets(HOME_INDICATOR_INSET));
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const style = popoverStyle(tree);
    // top + height === screen.height - safeAreaBottom
    expect(style.top + style.height).toBe(IPHONE_PORTRAIT.height - HOME_INDICATOR_INSET);
    expect(style.height).toBe(KEYPAD_HEIGHT_COMPACT);
  });

  it('keypad is full-width on iPhone (no horizontal margin)', async () => {
    const { tree, sink } = renderHost(withInsets(HOME_INDICATOR_INSET));
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const style = popoverStyle(tree);
    expect(style.width).toBe(IPHONE_PORTRAIT.width);
    expect(style.left).toBe(0);
  });

  it('rounds only the top corners (sheet-style anchor to the bottom edge)', async () => {
    const { tree, sink } = renderHost(withInsets(HOME_INDICATOR_INSET));
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const style = popoverStyle(tree);
    // Top-rounded only on dock variant; the all-corners `borderRadius`
    // from the anchored variant must not appear here.
    expect(style.borderTopLeftRadius).toBeGreaterThan(0);
    expect(style.borderTopRightRadius).toBeGreaterThan(0);
    expect(style.borderRadius).toBeUndefined();
    expect(style.borderTopWidth).toBeGreaterThan(0);
    expect(style.borderWidth).toBeUndefined();
  });

  // Done button (the only interactive surface at the bottom of the
  // keypad popover) sits one popover-padding above the popover's bottom
  // edge. The popover bottom edge equals `screen.height - safeAreaBottom`
  // by construction (ADR-0011 Iteration 4). This assertion is the
  // regression net — if a future change drifts safe-area handling or
  // KEYPAD_HEIGHT, the Done button no longer sits at the safe edge and
  // the test fails loudly. Range is generous (60 pt) to absorb future
  // padding tweaks without forcing a test update.
  it('Done button bottom Y stays clamped near the safe-area edge', async () => {
    const { tree, sink } = renderHost(withInsets(HOME_INDICATOR_INSET));
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const style = popoverStyle(tree);
    const popoverBottomY = style.top + style.height;
    const safeEdge = IPHONE_PORTRAIT.height - HOME_INDICATOR_INSET;
    // Not below the safe-area top (would cut into the home-indicator).
    expect(popoverBottomY).toBeLessThan(safeEdge + 1);
    // Not too far above the safe-area top (would leave a visible gap
    // between the keypad and the bottom edge of the screen).
    expect(popoverBottomY).toBeGreaterThan(safeEdge - 60);
  });

  it('shows the keypad even when the anchor has not resolved yet (dock ignores anchor)', () => {
    // Unlike the wide-screen branch, the bottom-dock path is anchor-
    // independent. Registering a field without flushing the anchor
    // promise must still surface the keypad — the visibility gate
    // collapses to `activeFieldId !== null` on compact.
    const { tree, sink } = renderHost(withInsets(HOME_INDICATOR_INSET));
    act(() => {
      sink.value?.registerField(fieldOn(valueRef(''), 'weight'));
    });
    expect(tree.getByTestId('numeric-keypad')).toBeTruthy();
  });

  it('respects safeAreaBottom=0 (older iPhones without home indicator)', async () => {
    const { tree, sink } = renderHost(withInsets(0));
    await registerAndFlush(sink, fieldOn(valueRef(''), 'weight'));
    const style = popoverStyle(tree);
    // With no safe-area, the popover bottom sits exactly on the screen edge.
    expect(style.top + style.height).toBe(IPHONE_PORTRAIT.height);
  });
});
