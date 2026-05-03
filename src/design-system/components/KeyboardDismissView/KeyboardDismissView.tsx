import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export interface KeyboardDismissViewProps {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string | undefined;
}

/**
 * Outer wrapper for screens that contain text inputs. Tapping anywhere
 * outside an input dismisses the soft keyboard via `Keyboard.dismiss()`.
 *
 * Behavior contract (see `02_Specification/06-ui-spec.md` § "Экран 4 ·
 * Crosswind Calculator" subsection "Keyboard behavior"):
 *  - Taps on inputs are captured by the input as usual — the wrapper
 *    does not interfere because `<Pressable>` only fires when the
 *    target is the wrapper itself, not its descendants. (No
 *    `accessible`-grouping, no shadow over scroll/touch handlers.)
 *  - Scroll gestures pass through to nested ScrollView children; this
 *    wrapper is a Pressable, not a TouchableWithoutFeedback over a
 *    capturing layer.
 *  - `accessible={false}` keeps VoiceOver from announcing the wrapper
 *    as a tappable region; the inputs themselves remain the focus
 *    targets.
 *
 * Use only on screens with text input (Crosswind Calculator). Do NOT
 * wrap Splash, Disclaimer, Main Menu, Settings, About, Coming Soon
 * Modal — none of those have inputs.
 */
export function KeyboardDismissView({
  children,
  style,
  testID,
}: KeyboardDismissViewProps): ReactNode {
  return (
    <Pressable
      accessible={false}
      onPress={(): void => Keyboard.dismiss()}
      style={[styles.root, style]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
