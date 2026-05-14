import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme, useTranslation } from '../../../core';
import type { ComingSoonModule } from '../../../core/modules';
import { Button, Stack, Text, tokens } from '../../../design-system';

/**
 * Modal shown when the user taps a coming-soon module card on the Main Menu
 * (см. `02_Specification/06-ui-spec.md` Экран 3.1). Slide-up appearance is
 * delegated to React Native's `Modal` (iOS/Android default 300 ms slide).
 *
 * Closes on:
 *   - Tap on the OK button.
 *   - Tap on the dimmed backdrop.
 *   - System back gesture / hardware back (via `onRequestClose`).
 */

const MODAL_HORIZONTAL_INSET = 24;
const MODAL_RADIUS = 16;
const ICON_SIZE = 56;
const ICON_RADIUS = 14;

export interface ComingSoonModalProps {
  readonly module: ComingSoonModule | null;
  readonly onClose: () => void;
  readonly testID?: string;
}

export function ComingSoonModal({ module, onClose, testID }: ComingSoonModalProps): ReactNode {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          alignItems: 'center',
          backgroundColor: palette.overlay,
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: MODAL_HORIZONTAL_INSET,
        },
        sheet: {
          backgroundColor: palette.bgCard,
          borderColor: palette.border,
          borderRadius: MODAL_RADIUS,
          borderWidth: 1,
          padding: tokens.spacing.lg,
          width: '100%',
        },
      }),
    [palette.bgCard, palette.border, palette.overlay],
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      transparent
      visible={module !== null}
    >
      <Pressable
        accessibilityLabel={t('common.cancel')}
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
      >
        {/*
         * Inner Pressable swallows taps so they don't bubble to the backdrop.
         * `accessible={false}` keeps it out of the VoiceOver focus order —
         * the sheet surface is passive, not a tappable target.
         */}
        <Pressable
          accessible={false}
          onPress={(): void => undefined}
          style={styles.sheet}
          testID={testID === undefined ? undefined : `${testID}-sheet`}
        >
          {module !== null ? <ModalBody module={module} onClose={onClose} testID={testID} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ModalBodyProps {
  readonly module: ComingSoonModule;
  readonly onClose: () => void;
  readonly testID?: string | undefined;
}

function ModalBody({ module, onClose, testID }: ModalBodyProps): ReactNode {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        icon: {
          alignItems: 'center',
          backgroundColor: palette.accentSoft,
          borderRadius: ICON_RADIUS,
          height: ICON_SIZE,
          justifyContent: 'center',
          width: ICON_SIZE,
        },
      }),
    [palette.accentSoft],
  );

  return (
    <Stack gap="md" align="center">
      <View style={styles.icon}>
        <Text variant="monoLarge" color="accent">
          {module.icon}
        </Text>
      </View>
      <Text variant="heading3" align="center">
        {module.name}
      </Text>
      <Text variant="chipLabel" color="textTertiary" align="center">
        {module.phase}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {t('comingSoonModal.body')}
      </Text>
      <Button
        label={t('comingSoonModal.close')}
        onPress={onClose}
        testID={testID === undefined ? undefined : `${testID}-close`}
      />
    </Stack>
  );
}
