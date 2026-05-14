import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import type { ColorPalette } from '../../tokens';
import { Row } from '../Row/Row';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

export interface ResultPanelMetaItem {
  readonly label: string;
  readonly value: string;
}

export type ResultPanelState =
  | { readonly kind: 'empty'; readonly message: string }
  | {
      readonly kind: 'idle';
      readonly label: string;
      readonly value: string;
      readonly unit: string;
      readonly footnote?: string;
      readonly meta?: readonly ResultPanelMetaItem[];
      readonly sourceChip?: string;
    }
  | { readonly kind: 'error'; readonly headline: string; readonly description?: string }
  | { readonly kind: 'out-of-envelope'; readonly message: string };

export interface ResultPanelProps {
  readonly state: ResultPanelState;
  readonly testID?: string | undefined;
}

const PANEL_MIN_HEIGHT = 160;
const META_BASIS_PERCENT = '48%';
const RESULT_STATUS_LETTER_SPACING = 0.72; // ≈ 0.08em at 9pt — mockup .result-status
const META_LABEL_LETTER_SPACING = 0.36; // ≈ 0.04em at 9pt — mockup .meta-item .meta-label
const KT_SUFFIX_MARGIN_LEFT = 6; // mockup .result-value KT span
const META_VALUE_MARGIN_TOP = 2; // mockup .meta-item .meta-val
const SOURCE_CHIP_PADDING_VERTICAL = 2; // mockup .source-chip
const SOURCE_CHIP_PADDING_HORIZONTAL = 6; // mockup .source-chip

const RESULT_STATUS_STYLE: TextStyle = {
  letterSpacing: RESULT_STATUS_LETTER_SPACING,
  textTransform: 'uppercase',
};
const META_LABEL_STYLE: TextStyle = {
  letterSpacing: META_LABEL_LETTER_SPACING,
  textTransform: 'uppercase',
};
const KT_SUFFIX_STYLE: TextStyle = { marginLeft: KT_SUFFIX_MARGIN_LEFT };
const META_VALUE_STYLE: TextStyle = { marginTop: META_VALUE_MARGIN_TOP };

interface Styles {
  readonly chip: ViewStyle;
  readonly meta: ViewStyle;
  readonly metaItem: ViewStyle;
  readonly root: ViewStyle;
}

function buildStyles(palette: ColorPalette): Styles {
  return StyleSheet.create({
    chip: {
      backgroundColor: palette.bgScreen,
      borderColor: palette.border,
      borderRadius: tokens.radii.sm,
      borderWidth: 1,
      paddingHorizontal: SOURCE_CHIP_PADDING_HORIZONTAL,
      paddingVertical: SOURCE_CHIP_PADDING_VERTICAL,
      position: 'absolute',
      right: tokens.spacing.sm,
      top: tokens.spacing.sm,
    },
    meta: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      paddingTop: tokens.spacing.md,
    },
    metaItem: {
      flexBasis: META_BASIS_PERCENT,
      gap: 0,
    },
    root: {
      backgroundColor: palette.bgCard,
      borderColor: palette.border,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      minHeight: PANEL_MIN_HEIGHT,
      padding: tokens.spacing.lg,
    },
  });
}

function IdleBody(props: {
  readonly state: Extract<ResultPanelState, { kind: 'idle' }>;
  readonly styles: Styles;
}): ReactNode {
  const { state, styles } = props;
  return (
    <Stack gap="md">
      <Text variant="microUppercase" color="accentText" style={RESULT_STATUS_STYLE}>
        {state.label}
      </Text>
      <Row gap="xs" align="baseline" justify="center">
        <Text
          variant="display"
          color="accent"
          allowFontScaling={false}
          accessibilityLabel={`${state.value} ${state.unit}`}
        >
          {state.value}
        </Text>
        <Text variant="monoMedium" color="textSecondary" style={KT_SUFFIX_STYLE}>
          {state.unit}
        </Text>
      </Row>
      {state.footnote !== undefined ? (
        <Text variant="caption" color="textSecondary" align="center">
          {state.footnote}
        </Text>
      ) : null}
      {state.meta !== undefined && state.meta.length > 0 ? (
        <View style={styles.meta}>
          <Row wrap gap="sm">
            {state.meta.map((item) => (
              <View key={item.label} style={styles.metaItem}>
                <Text variant="microUppercase" color="textTertiary" style={META_LABEL_STYLE}>
                  {item.label}
                </Text>
                <Text variant="monoSmall" color="textPrimary" style={META_VALUE_STYLE}>
                  {item.value}
                </Text>
              </View>
            ))}
          </Row>
        </View>
      ) : null}
      {state.sourceChip !== undefined ? (
        <View style={styles.chip}>
          <Text variant="monoMicro" color="textSecondary">
            {state.sourceChip}
          </Text>
        </View>
      ) : null}
    </Stack>
  );
}

function MessageBody(props: {
  readonly headline: string;
  readonly description?: string | undefined;
}): ReactNode {
  return (
    <Stack gap="sm" align="center">
      <Text variant="heading2" color="textSecondary" align="center">
        {props.headline}
      </Text>
      {props.description !== undefined ? (
        <Text variant="body" color="textTertiary" align="center">
          {props.description}
        </Text>
      ) : null}
    </Stack>
  );
}

export function ResultPanel({ state, testID }: ResultPanelProps): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const styles = useMemo(() => buildStyles(palette), [palette]);

  return (
    <View accessibilityRole="summary" style={styles.root} testID={testID}>
      {state.kind === 'idle' ? <IdleBody state={state} styles={styles} /> : null}
      {state.kind === 'empty' ? <MessageBody headline={state.message} /> : null}
      {state.kind === 'error' ? (
        <MessageBody headline={state.headline} description={state.description} />
      ) : null}
      {state.kind === 'out-of-envelope' ? <MessageBody headline={state.message} /> : null}
    </View>
  );
}
