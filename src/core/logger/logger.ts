/**
 * Logger with debug/info/warn/error levels.
 *
 * - In development (`__DEV__ === true`): writes to console.
 * - In production: no-op (no console output, no network).
 *
 * Pure TypeScript. Reads `__DEV__` from globalThis to avoid coupling to react-native.
 *
 * Spec: 02_Specification/module-contracts/core.md (logger),
 *       02_Specification/AGENTS.md (Rule 8 · No console.log).
 */

type LogArg = unknown;

interface LoggerApi {
  debug: (message: string, ...args: LogArg[]) => void;
  info: (message: string, ...args: LogArg[]) => void;
  warn: (message: string, ...args: LogArg[]) => void;
  error: (message: string, ...args: LogArg[]) => void;
}

function isDev(): boolean {
  // `__DEV__` is set by Metro/React Native bundler. In Node test env it is undefined.
  // In tests, jest-expo sets __DEV__ = true. We treat undefined as production-safe (no-op).
  const flag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return flag === true;
}

function format(message: string, args: LogArg[]): [string, ...LogArg[]] {
  return [`[B787] ${message}`, ...args];
}

export const logger: LoggerApi = {
  debug(message, ...args) {
    if (!isDev()) {
      return;
    }
    console.warn(...format(`[debug] ${message}`, args));
  },
  info(message, ...args) {
    if (!isDev()) {
      return;
    }
    console.warn(...format(`[info] ${message}`, args));
  },
  warn(message, ...args) {
    if (!isDev()) {
      return;
    }
    console.warn(...format(`[warn] ${message}`, args));
  },
  error(message, ...args) {
    if (!isDev()) {
      return;
    }
    console.error(...format(`[error] ${message}`, args));
  },
};
