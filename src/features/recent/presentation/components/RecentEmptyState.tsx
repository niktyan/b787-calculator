import type { ReactNode } from 'react';

import { useTranslation } from '../../../../core';
import { EmptyState } from '../../../../design-system';

export interface RecentEmptyStateProps {
  readonly testID?: string;
}

export function RecentEmptyState({ testID }: RecentEmptyStateProps): ReactNode {
  const { t } = useTranslation();
  const props =
    testID === undefined
      ? { title: t('recent.empty.title'), description: t('recent.empty.subtext') }
      : { title: t('recent.empty.title'), description: t('recent.empty.subtext'), testID };
  return <EmptyState {...props} />;
}
