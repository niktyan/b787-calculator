import { renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { resetFlags, setFlag } from '../../feature-flags';
import { useHapticFeedback } from '../useHapticFeedback';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

const impactAsyncMock = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;
const notificationAsyncMock = Haptics.notificationAsync as jest.MockedFunction<
  typeof Haptics.notificationAsync
>;

describe('useHapticFeedback', () => {
  beforeEach(() => {
    resetFlags();
    impactAsyncMock.mockClear();
    notificationAsyncMock.mockClear();
  });

  describe('when enableHapticFeedback is true (default)', () => {
    it('invokes Haptics.impactAsync(Light) for lightImpact', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.lightImpact();
      expect(impactAsyncMock).toHaveBeenCalledTimes(1);
      expect(impactAsyncMock).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('invokes Haptics.impactAsync(Medium) for mediumImpact', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.mediumImpact();
      expect(impactAsyncMock).toHaveBeenCalledTimes(1);
      expect(impactAsyncMock).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('invokes Haptics.notificationAsync(Warning) for warningNotification', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.warningNotification();
      expect(notificationAsyncMock).toHaveBeenCalledTimes(1);
      expect(notificationAsyncMock).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    });

    it('invokes Haptics.notificationAsync(Success) for successNotification', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.successNotification();
      expect(notificationAsyncMock).toHaveBeenCalledTimes(1);
      expect(notificationAsyncMock).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('returns a stable object across renders while the flag stays on', () => {
      const { result, rerender } = renderHook(() => useHapticFeedback());
      const first = result.current;
      rerender({});
      expect(result.current).toBe(first);
    });
  });

  describe('when enableHapticFeedback is false (kill-switch)', () => {
    beforeEach(() => {
      setFlag('enableHapticFeedback', false);
    });

    it('does not call Haptics.impactAsync for lightImpact', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.lightImpact();
      expect(impactAsyncMock).not.toHaveBeenCalled();
    });

    it('does not call Haptics.impactAsync for mediumImpact', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.mediumImpact();
      expect(impactAsyncMock).not.toHaveBeenCalled();
    });

    it('does not call Haptics.notificationAsync for warningNotification', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.warningNotification();
      expect(notificationAsyncMock).not.toHaveBeenCalled();
    });

    it('does not call Haptics.notificationAsync for successNotification', () => {
      const { result } = renderHook(() => useHapticFeedback());
      result.current.successNotification();
      expect(notificationAsyncMock).not.toHaveBeenCalled();
    });
  });
});
