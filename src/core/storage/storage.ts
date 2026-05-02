import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '../logger';

import { STORAGE_KEYS } from './keys';
import type { StorageKey } from './keys';
import { SCHEMAS } from './schemas';
import type { StorageValueMap } from './schemas';

const DEBOUNCE_MS = 300;

type PendingWrites = { [K in StorageKey]?: StorageValueMap[K] };

const pending: PendingWrites = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (flushTimer !== null) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  const keys = Object.keys(pending) as StorageKey[];
  if (keys.length === 0) {
    return;
  }
  const writes: [string, string][] = keys.map((key) => {
    const value = pending[key];
    delete pending[key];
    return [STORAGE_KEYS[key], JSON.stringify(value)];
  });
  try {
    await AsyncStorage.multiSet(writes);
  } catch (error) {
    logger.error('storage.flush failed', error);
  }
}

async function get<K extends StorageKey>(key: K): Promise<StorageValueMap[K] | null> {
  const cached = pending[key];
  if (cached !== undefined) {
    return cached;
  }
  const raw = await AsyncStorage.getItem(STORAGE_KEYS[key]);
  if (raw === null) {
    return null;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    logger.warn(`storage.get: corrupted JSON for ${key}`, error);
    return null;
  }
  const validation = SCHEMAS[key].safeParse(parsedJson);
  if (!validation.success) {
    logger.warn(`storage.get: schema mismatch for ${key}`, validation.error.message);
    return null;
  }
  return validation.data;
}

function set<K extends StorageKey>(key: K, value: StorageValueMap[K]): void {
  const validation = SCHEMAS[key].safeParse(value);
  if (!validation.success) {
    logger.error(`storage.set: invalid value for ${key}`, validation.error.message);
    return;
  }
  pending[key] = validation.data;
  scheduleFlush();
}

async function remove<K extends StorageKey>(key: K): Promise<void> {
  delete pending[key];
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS[key]);
  } catch (error) {
    logger.error('storage.remove failed', error);
  }
}

async function flushNow(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}

export const storage = {
  get,
  set,
  remove,
  flushNow,
};
