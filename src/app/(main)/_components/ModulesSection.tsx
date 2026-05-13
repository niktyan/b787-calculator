import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import type { Module } from '../../../core/modules';
import { Stack, Text, ToggleSettingsRow, tokens } from '../../../design-system';

/**
 * Settings → Modules section: an uppercase section title plus one
 * `ToggleSettingsRow` per known module (см. `02_Specification/06-ui-spec.md`
 * § Экран 5 «Modules»). The toggles drive `useModuleVisibility` so the
 * user can hide active modules and coming-soon teasers from the Main
 * Menu independently. Module display names come from `data.json` and
 * are not localised (product names, like aviation terms).
 */

export interface ModulesSectionProps {
  readonly title: string;
  readonly modules: readonly Module[];
  readonly isVisible: (moduleId: string) => boolean;
  readonly onToggle: (moduleId: string) => void;
  readonly isRegular: boolean;
  readonly listGap: number;
}

const SECTION_TITLE_LETTER_SPACING = 1;
const SECTION_TITLE_WEIGHT: TextStyle['fontWeight'] = '600';

export function ModulesSection({
  title,
  modules,
  isVisible,
  onToggle,
  isRegular,
  listGap,
}: ModulesSectionProps): ReactNode {
  const sectionTitleSize = isRegular
    ? tokens.sizing.settingsRow.regular.sectionTitleSize
    : tokens.sizing.settingsRow.compact.sectionTitleSize;
  const listStyle = useMemo<ViewStyle>(() => ({ gap: listGap }), [listGap]);
  const titleStyle = useMemo<TextStyle>(
    () => ({
      fontSize: sectionTitleSize,
      fontWeight: SECTION_TITLE_WEIGHT,
      letterSpacing: SECTION_TITLE_LETTER_SPACING,
    }),
    [sectionTitleSize],
  );

  return (
    <Stack gap="sm" testID="settings-section-modules">
      <Text variant="body" color="textSecondary" accessibilityLabel={title} style={titleStyle}>
        {title.toUpperCase()}
      </Text>
      <View style={listStyle}>
        {modules.map((m) => (
          <ToggleSettingsRow
            key={m.id}
            label={m.name}
            value={isVisible(m.id)}
            onChange={(): void => onToggle(m.id)}
            testID={`settings-row-module-${m.id}`}
            isRegular={isRegular}
          />
        ))}
      </View>
    </Stack>
  );
}
