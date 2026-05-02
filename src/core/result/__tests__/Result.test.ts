import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  unwrap,
  unwrapOr,
  unwrapOrElse,
} from '../Result';
import type { Result } from '../Result';

describe('Result', () => {
  describe('constructors', () => {
    it('ok() creates a success Result', () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      expect(r.value).toBe(42);
    });

    it('err() creates an error Result', () => {
      const r = err('boom');
      expect(r.ok).toBe(false);
      expect(r.error).toBe('boom');
    });
  });

  describe('type guards', () => {
    it('isOk returns true for Ok and false for Err', () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err('x'))).toBe(false);
    });

    it('isErr returns true for Err and false for Ok', () => {
      expect(isErr(err('x'))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });

    it('narrows the type for Ok', () => {
      const r: Result<number, string> = ok(7);
      if (isOk(r)) {
        expect(r.value).toBe(7);
      } else {
        throw new Error('expected Ok');
      }
    });

    it('narrows the type for Err', () => {
      const r: Result<number, string> = err('nope');
      if (isErr(r)) {
        expect(r.error).toBe('nope');
      } else {
        throw new Error('expected Err');
      }
    });
  });

  describe('map', () => {
    it('transforms the success value', () => {
      const r = map(ok(2), (x) => x * 10);
      expect(r).toEqual(ok(20));
    });

    it('passes errors through unchanged', () => {
      const r: Result<number, string> = err('fail');
      const mapped = map(r, (x: number) => x * 10);
      expect(mapped).toEqual(err('fail'));
    });

    it('does not call fn for Err', () => {
      const fn = jest.fn();
      map(err('x'), fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('mapErr', () => {
    it('transforms the error value', () => {
      const r = mapErr(err('low'), (e) => e.toUpperCase());
      expect(r).toEqual(err('LOW'));
    });

    it('passes Ok through unchanged', () => {
      const r: Result<number, string> = ok(3);
      const mapped = mapErr(r, (e: string) => e.length);
      expect(mapped).toEqual(ok(3));
    });

    it('does not call fn for Ok', () => {
      const fn = jest.fn();
      mapErr(ok(1), fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('flatMap', () => {
    it('chains successful Results', () => {
      const r = flatMap(ok(2), (x) => ok(x + 1));
      expect(r).toEqual(ok(3));
    });

    it('short-circuits on first Err', () => {
      const r: Result<number, string> = flatMap(err('e1'), () => ok(99));
      expect(r).toEqual(err('e1'));
    });

    it('propagates inner Err', () => {
      const r: Result<number, string> = flatMap(ok(2), () => err('inner'));
      expect(r).toEqual(err('inner'));
    });
  });

  describe('unwrap', () => {
    it('returns value for Ok', () => {
      expect(unwrap(ok('hi'))).toBe('hi');
    });

    it('throws for Err', () => {
      expect(() => unwrap(err({ kind: 'fail' }))).toThrow(/Called unwrap on Err/);
    });
  });

  describe('unwrapOr', () => {
    it('returns value for Ok', () => {
      expect(unwrapOr(ok(5), 0)).toBe(5);
    });

    it('returns fallback for Err', () => {
      expect(unwrapOr(err('x') as Result<number, string>, 99)).toBe(99);
    });
  });

  describe('unwrapOrElse', () => {
    it('returns value for Ok', () => {
      expect(unwrapOrElse(ok(5), () => 0)).toBe(5);
    });

    it('computes fallback from error for Err', () => {
      const r: Result<number, string> = err('abc');
      expect(unwrapOrElse(r, (e) => e.length)).toBe(3);
    });
  });
});
