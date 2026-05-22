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
  // Defaults for the production-like screen (iPad landscape) — wide enough
  // that the right side of any field always has room for a 280-pt popover.
  const IPAD_LANDSCAPE = { width: 1024, height: 768 };
  const KEYPAD_SIZE = { width: 280, height: 320 };

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

  it('horizontally centers the popover when neither side has room', () => {
    // Narrow iPhone-portrait-like screen; field hugs the right edge.
    const screen = { width: 360, height: 800 };
    const anchor: FieldAnchor = { x: 40, y: 100, width: 280, height: 44 };
    const position = computeKeypadPosition(anchor, screen, KEYPAD_SIZE);
    // Centered: (360 - 280) / 2 = 40
    expect(position.left).toBe(40);
  });

  it('aligns vertically with the top of the field by default', () => {
    const anchor: FieldAnchor = { x: 100, y: 200, width: 160, height: 44 };
    const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
    expect(position.top).toBe(200);
  });

  it('clamps the vertical position so the popover never spills off-screen', () => {
    // Anchor near the bottom of the screen: top would push popover below
    // screen.height - SCREEN_MARGIN.
    const anchor: FieldAnchor = { x: 100, y: 600, width: 160, height: 44 };
    const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
    // maxTop = 768 - 320 - 16 = 432
    expect(position.top).toBe(432);
  });

  it('clamps the vertical position to the top safe margin', () => {
    // Anchor near the top of the screen.
    const anchor: FieldAnchor = { x: 100, y: 4, width: 160, height: 44 };
    const position = computeKeypadPosition(anchor, IPAD_LANDSCAPE, KEYPAD_SIZE);
    expect(position.top).toBe(16);
  });
});
