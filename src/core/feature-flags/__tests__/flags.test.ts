import { getFlag, resetFlags, setFlag, subscribe } from '../flags';

describe('feature-flags store', () => {
  beforeEach(() => {
    resetFlags();
  });

  it('returns the bundled default values', () => {
    expect(getFlag('enableDataVersionBanner')).toBe(true);
    expect(getFlag('showCalcTimeOnResult')).toBe(false);
  });

  it('setFlag updates the value and is observable via getFlag', () => {
    setFlag('showCalcTimeOnResult', true);
    expect(getFlag('showCalcTimeOnResult')).toBe(true);
  });

  it('resetFlags restores all flags to bundled defaults', () => {
    setFlag('enableDataVersionBanner', false);
    setFlag('showCalcTimeOnResult', true);
    resetFlags();
    expect(getFlag('enableDataVersionBanner')).toBe(true);
    expect(getFlag('showCalcTimeOnResult')).toBe(false);
  });

  describe('subscribe', () => {
    it('notifies subscribers when a flag changes', () => {
      const cb = jest.fn();
      const unsubscribe = subscribe(cb);
      setFlag('showCalcTimeOnResult', true);
      expect(cb).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('does not notify when setFlag is called with the same value', () => {
      const cb = jest.fn();
      const unsubscribe = subscribe(cb);
      setFlag('showCalcTimeOnResult', false); // same as default
      expect(cb).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('unsubscribe stops further notifications', () => {
      const cb = jest.fn();
      const unsubscribe = subscribe(cb);
      unsubscribe();
      setFlag('showCalcTimeOnResult', true);
      expect(cb).not.toHaveBeenCalled();
    });

    it('resetFlags notifies subscribers when state changes', () => {
      setFlag('showCalcTimeOnResult', true);
      const cb = jest.fn();
      const unsubscribe = subscribe(cb);
      resetFlags();
      expect(cb).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('resetFlags does not notify when nothing changes', () => {
      const cb = jest.fn();
      const unsubscribe = subscribe(cb);
      resetFlags(); // already at defaults
      expect(cb).not.toHaveBeenCalled();
      unsubscribe();
    });
  });
});
