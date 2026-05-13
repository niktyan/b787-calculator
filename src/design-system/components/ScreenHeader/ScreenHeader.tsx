/**
 * Shared shell-screen header: B7 logo + screen title (left) +
 * NavPills (right) + bottom divider. Used by Settings, About, and any
 * future shell screen that needs the standard navigation chrome
 * (см. `02_Specification/06-ui-spec.md` Экран 3 «Header (app-header)»).
 *
 * On compact widths (`isRegular=false`) the layout collapses to two
 * rows (brand row + full-width NavPills row); on regular widths it
 * stays single-row with `justify: space-between`.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { useTheme } from '../../../core/theming';
import { tokens } from '../../tokens';
import { NavPills } from '../NavPills/NavPills';
import type { NavPillsItem } from '../NavPills/NavPills';
import { Row } from '../Row/Row';
import { Stack } from '../Stack/Stack';
import { Text } from '../Text/Text';

const HEADER_DIVIDER_HEIGHT = 1;

export interface ScreenHeaderProps<TId extends string> {
  readonly title: string;
  readonly tabs: readonly NavPillsItem<TId>[];
  readonly activeTabId: TId;
  readonly onTabChange: (next: TId) => void;
  readonly isRegular: boolean;
  readonly logoLabel?: string;
  readonly logoTestID?: string;
  readonly navTestID?: string;
}

export function ScreenHeader<TId extends string>({
  title,
  tabs,
  activeTabId,
  onTabChange,
  isRegular,
  logoLabel = 'B787 logo',
  logoTestID,
  navTestID,
}: ScreenHeaderProps<TId>): ReactNode {
  const { theme } = useTheme();
  const palette = tokens.colors[theme.resolved];
  const sizing = isRegular ? tokens.sizing.header.regular : tokens.sizing.header.compact;

  const dividerStyle = useMemo<ViewStyle>(
    () => ({ backgroundColor: palette.border, height: HEADER_DIVIDER_HEIGHT }),
    [palette.border],
  );
  const logoStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: sizing.logoRadius,
      height: sizing.logoSize,
      justifyContent: 'center',
      width: sizing.logoSize,
    }),
    [palette.accentSoft, sizing.logoRadius, sizing.logoSize],
  );
  const titleStyle = useMemo(() => ({ fontSize: sizing.titleSize }), [sizing.titleSize]);

  const brand = (
    <Row align="center" gap="sm">
      <View accessibilityLabel={logoLabel} style={logoStyle} testID={logoTestID}>
        <Text variant="mono" color="accent">
          B7
        </Text>
      </View>
      <Text variant="body" style={titleStyle}>
        {title}
      </Text>
    </Row>
  );

  const navPills =
    navTestID === undefined ? (
      <NavPills
        items={tabs}
        activeId={activeTabId}
        onChange={onTabChange}
        grow={!isRegular}
        sizing={sizing}
      />
    ) : (
      <NavPills
        items={tabs}
        activeId={activeTabId}
        onChange={onTabChange}
        testID={navTestID}
        grow={!isRegular}
        sizing={sizing}
      />
    );

  return (
    <Stack gap="md">
      {isRegular ? (
        <Row align="center" justify="space-between">
          {brand}
          {navPills}
        </Row>
      ) : (
        <Stack gap="sm">
          {brand}
          {navPills}
        </Stack>
      )}
      <View style={dividerStyle} />
    </Stack>
  );
}
