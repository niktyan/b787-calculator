import type { ReactNode } from 'react';

import { useTranslation } from '../../../core';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import { NumericKeypad } from './NumericKeypad';
import { useNumericKeypadContext } from './NumericKeypadContext';

const HOST_TEST_ID = 'numeric-keypad-host';
const KEYPAD_TEST_ID = 'numeric-keypad';

export function NumericKeypadHost(): ReactNode {
  const { activeFieldId, activeIsRegular, clearActiveField, pressKey, done } =
    useNumericKeypadContext();
  const { t } = useTranslation();
  const visible = activeFieldId !== null;

  return (
    <BottomSheet
      visible={visible}
      onClose={clearActiveField}
      closeAccessibilityLabel={t('keypad.closeAccessibilityLabel')}
      testID={HOST_TEST_ID}
    >
      <NumericKeypad
        onKeyPress={pressKey}
        onDone={done}
        isRegular={activeIsRegular}
        testID={KEYPAD_TEST_ID}
      />
    </BottomSheet>
  );
}
