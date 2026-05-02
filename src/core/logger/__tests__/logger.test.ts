import { logger } from '../logger';

type DevGlobals = { __DEV__?: boolean };

describe('logger', () => {
  const originalDev = (globalThis as DevGlobals).__DEV__;

  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    if (originalDev === undefined) {
      delete (globalThis as DevGlobals).__DEV__;
    } else {
      (globalThis as DevGlobals).__DEV__ = originalDev;
    }
  });

  describe('in development (__DEV__ = true)', () => {
    beforeEach(() => {
      (globalThis as DevGlobals).__DEV__ = true;
    });

    it('debug() writes to console.warn with [debug] prefix', () => {
      logger.debug('hello', { extra: 1 });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[B787]') as string,
        expect.anything(),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[debug] hello') as string,
        expect.anything(),
      );
    });

    it('info() writes to console.warn with [info] prefix', () => {
      logger.info('msg');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[info] msg') as string);
    });

    it('warn() writes to console.warn with [warn] prefix', () => {
      logger.warn('careful');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[warn] careful') as string);
    });

    it('error() writes to console.error with [error] prefix', () => {
      logger.error('boom', { code: 500 });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[error] boom') as string,
        expect.anything(),
      );
    });
  });

  describe('in production (__DEV__ = false)', () => {
    beforeEach(() => {
      (globalThis as DevGlobals).__DEV__ = false;
    });

    it('debug/info/warn/error are no-ops', () => {
      logger.debug('x');
      logger.info('x');
      logger.warn('x');
      logger.error('x');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('when __DEV__ is undefined', () => {
    beforeEach(() => {
      delete (globalThis as DevGlobals).__DEV__;
    });

    it('treats absent __DEV__ as production (no-op)', () => {
      logger.warn('x');
      logger.error('x');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
