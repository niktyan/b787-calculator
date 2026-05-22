import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../../../../core/theming';
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

interface HarnessSetup {
  readonly tree: ReturnType<typeof render>;
  readonly sink: { value: NumericKeypadContextValue | null };
}

function renderHost(): HarnessSetup {
  const sink: { value: NumericKeypadContextValue | null } = { value: null };
  function Tap(): ReactElement {
    const ctx = useNumericKeypadContext();
    sink.value = ctx;
    return null as unknown as ReactElement;
  }
  const tree = render(
    <ThemeProvider initialMode="dark">
      <NumericKeypadProvider>
        <Tap />
        <NumericKeypadHost />
      </NumericKeypadProvider>
    </ThemeProvider>,
  );
  return { tree, sink };
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
