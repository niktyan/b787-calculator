/**
 * Centred-modal presentation branch for `RunwayConditionPicker` —
 * used on iPhone any orientation, iPad 11" portrait, and iPad 13"
 * portrait (ADR-0018 § UI Layout, F2 visual fix v5).
 *
 * Pattern: transparent `<Modal animationType="fade">` containing a
 * flex-centred overlay whose only direct child is a card `<Pressable>`.
 * Collapsing the card into a single Pressable (instead of overlay →
 * Pressable wrapper → card View) keeps the percentage `maxHeight`
 * cascade from breaking: the card's `maxHeight: 90%` resolves against
 * the overlay's height, which is the full Modal root.
 *
 * Card content (title + 7 rows + Cancel) lives in the shared
 * `OptionList` so this branch and the anchored-right branch render
 * pixel-identical inner content.
 *
 * iPhone-landscape edge case: 7 rows + title + Cancel may exceed the
 * viewport height (~393 pt). When landscape is detected the card
 * wraps content in a `ScrollView`. Portrait viewports never scroll —
 * the card grows to content (no fixed height) and is centred.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { ColorPalette, SegmentedControlOption } from '../../../../design-system';
import { tokens } from '../../../../design-system';

import { OptionList } from './RunwayConditionPicker.parts';
import type { PickerSizing } from './RunwayConditionPicker.sizing';

const OVERLAY_BACKDROP_FALLBACK = 'rgba(0, 0, 0, 0.5)';
const CARD_MAX_WIDTH = 520;
const CARD_MAX_HEIGHT_PERCENT: `${number}%` = '90%';

export interface RunwaySheetProps<TValue extends string> {
  readonly visible: boolean;
  readonly title: string;
  readonly closeAccessibilityLabel: string;
  readonly palette: ColorPalette;
  readonly sizing: PickerSizing;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly selectedValue: TValue;
  readonly onSelect: (next: TValue) => void;
  readonly onClose: () => void;
  readonly testID: string | undefined;
}

export function RunwaySheet<TValue extends string>(props: RunwaySheetProps<TValue>): ReactNode {
  const { visible, palette, testID, onClose, closeAccessibilityLabel } = props;
  const overlayStyle = useMemo<ViewStyle>(
    () => ({
      ...styles.overlay,
      backgroundColor: palette.overlay ?? OVERLAY_BACKDROP_FALLBACK,
    }),
    [palette.overlay],
  );
  const modalTestId = testID === undefined ? undefined : `${testID}-modal`;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...(modalTestId === undefined ? {} : { testID: modalTestId })}
    >
      <Pressable
        accessibilityLabel={closeAccessibilityLabel}
        accessibilityRole="button"
        onPress={onClose}
        style={overlayStyle}
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
      >
        <Card {...props} />
      </Pressable>
    </Modal>
  );
}

function Card<TValue extends string>(props: RunwaySheetProps<TValue>): ReactNode {
  const { title, palette, sizing, options, selectedValue, onSelect, testID } = props;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const cardStyle = useMemo<ViewStyle>(
    () => ({
      ...styles.card,
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      maxHeight: CARD_MAX_HEIGHT_PERCENT,
    }),
    [palette.bgCard, palette.border],
  );
  const content = (
    <OptionList
      title={title}
      palette={palette}
      sizing={sizing}
      options={options}
      selectedValue={selectedValue}
      onSelect={onSelect}
      testID={testID}
    />
  );
  return (
    <Pressable
      // Inner Pressable absorbs taps on the card so they don't
      // propagate to the dismiss backdrop. `accessible={false}` keeps
      // it out of the VoiceOver order — it's a passive surface.
      accessible={false}
      onPress={(): void => undefined}
      style={cardStyle}
      testID={testID === undefined ? undefined : `${testID}-card`}
    >
      {isLandscape ? (
        <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    maxWidth: CARD_MAX_WIDTH,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
});
