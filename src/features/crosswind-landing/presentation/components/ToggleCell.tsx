/**
 * Crosswind Landing 2-column toggle cell — atomic building block of the
 * static input-form grid introduced in F3 / ADR-0019.
 *
 * One cell = section label above + SegmentedControl below, stretched to
 * fill its container (the half-column produced by `<Row gap="md">` in
 * `CrosswindLandingInputForm`).
 *
 * Reserved-slot pattern (`hidden === true`):
 *   - opacity: 0
 *   - pointerEvents: 'none'
 *   - accessibilityElementsHidden: true
 *   - importantForAccessibility: 'no-hide-descendants'
 *
 * The cell still occupies its natural layout height when hidden — that
 * is the whole point of "reserved slot": when Landing flips Manual ↔
 * Autoland, the CAT II/III + ONE ENG INOP toggles light up IN PLACE
 * without shifting the result panel by a single pixel.
 *
 * The `hidden` transition is instant (no animation), matching the
 * "no animation on overlay-style controls" precedent from ADR-0011
 * (Iteration 3 §2: instant Modal appearance).
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { SegmentedControl, Stack, Text } from '../../../../design-system';
import type {
  SegmentedControlOption,
  SegmentedControlSize,
  SpacingToken,
  TextVariant,
} from '../../../../design-system';

export interface ToggleCellProps<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange: (next: TValue) => void;
  readonly size: SegmentedControlSize;
  readonly hidden?: boolean;
  readonly labelNumberOfLines?: number | undefined;
  readonly testID?: string | undefined;
}

const HIDDEN_OPACITY = 0;
const VISIBLE_OPACITY = 1;
const COMPACT_LABEL_VARIANT: TextVariant = 'caption';
const REGULAR_LABEL_VARIANT: TextVariant = 'body';
const COMPACT_LABEL_GAP: SpacingToken = 'xs';
const REGULAR_LABEL_GAP: SpacingToken = 'sm';
const REGULAR_LABEL_LETTER_SPACING = 1;
const REGULAR_LABEL_FONT_WEIGHT = '600';
const REGULAR_LABEL_STYLE: TextStyle = {
  fontWeight: REGULAR_LABEL_FONT_WEIGHT,
  letterSpacing: REGULAR_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};
const COMPACT_LABEL_LETTER_SPACING = 0.6;
const COMPACT_LABEL_STYLE: TextStyle = {
  letterSpacing: COMPACT_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};

export function ToggleCell<TValue extends string>(props: ToggleCellProps<TValue>): ReactNode {
  const {
    label,
    value,
    options,
    onChange,
    size,
    hidden = false,
    labelNumberOfLines,
    testID,
  } = props;
  const isRegular = size === 'regular';
  const labelVariant = isRegular ? REGULAR_LABEL_VARIANT : COMPACT_LABEL_VARIANT;
  const labelStyle = isRegular ? REGULAR_LABEL_STYLE : COMPACT_LABEL_STYLE;
  const labelGap = isRegular ? REGULAR_LABEL_GAP : COMPACT_LABEL_GAP;
  const containerStyle = useMemo<ViewStyle>(
    () => ({ flex: 1, opacity: hidden ? HIDDEN_OPACITY : VISIBLE_OPACITY }),
    [hidden],
  );
  const labelTextProps =
    labelNumberOfLines === undefined ? {} : { numberOfLines: labelNumberOfLines };

  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      pointerEvents={hidden ? 'none' : 'auto'}
      style={containerStyle}
      testID={testID === undefined ? undefined : `${testID}-cell`}
    >
      <Stack gap={labelGap}>
        <Text variant={labelVariant} color="textSecondary" style={labelStyle} {...labelTextProps}>
          {label}
        </Text>
        <SegmentedControl<TValue>
          value={value}
          options={options}
          onChange={onChange}
          size={size}
          accessibilityLabel={label}
          {...(testID === undefined ? {} : { testID })}
        />
      </Stack>
    </View>
  );
}
