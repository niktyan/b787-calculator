/**
 * Recent-calculations storage layer (ADR-0016).
 *
 * Backed by `AsyncStorage` under a single key. Failures (corrupted
 * JSON, schema mismatch, AsyncStorage exception) resolve to an empty
 * list and log through `core/logger` — the screen never crashes
 * because of a bad payload.
 *
 * Public API:
 *   - `loadRecent()`             — read the entries (newest first).
 *   - `saveRecent(prepared)`     — insert at head, dedupe by
 *                                  fingerprint, FIFO cap 20.
 *   - `removeRecent(id)`         — drop one entry.
 *   - `clearRecent()`            — wipe the list.
 *
 * `prepared` is the shape produced by view-models — see
 * `prepareTakeoffEntry` / `prepareLandingEntry` below: the caller
 * passes inputs + result, the storage layer assigns id, timestamp,
 * and fingerprint. The result is the persisted `RecentEntry`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '../logger';

import {
  RECENT_MAX_ENTRIES,
  RECENT_SCHEMA_VERSION,
  computeFingerprint,
  recentStorageFileSchema,
} from './types';
import type {
  RecentEntry,
  RecentLandingEntry,
  RecentLandingInputs,
  RecentStorageFile,
  RecentTakeoffEntry,
  RecentTakeoffInputs,
} from './types';

export const RECENT_STORAGE_KEY = 'b787.recentCalculations';

// Random suffix length for entry ids — short enough to keep keys
// readable, long enough to avoid Date.now collisions within a single
// millisecond. ID generation is local-only; no security implication.
const ID_RANDOM_LENGTH = 8;
// `Math.random().toString(BASE_36)` returns "0.<digits>"; slice the
// leading "0." away to get a clean base-36 string. The combined id
// shape is `${millis}-${randomBase36}`.
const BASE_36 = 36;
const RANDOM_SLICE_START = 2;
const RANDOM_SLICE_END = RANDOM_SLICE_START + ID_RANDOM_LENGTH;

function generateId(): string {
  const millis = Date.now().toString();
  const random = Math.random().toString(BASE_36).slice(RANDOM_SLICE_START, RANDOM_SLICE_END);
  return `${millis}-${random}`;
}

function emptyFile(): RecentStorageFile {
  return { schemaVersion: RECENT_SCHEMA_VERSION, entries: [] };
}

async function readFile(): Promise<RecentStorageFile> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
  } catch (error) {
    logger.error('recent-storage.read failed', error);
    return emptyFile();
  }
  if (raw === null) {
    return emptyFile();
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    logger.warn('recent-storage.read: corrupted JSON', error);
    return emptyFile();
  }
  const parsed = recentStorageFileSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn('recent-storage.read: schema mismatch', parsed.error.message);
    return emptyFile();
  }
  return parsed.data;
}

async function writeFile(file: RecentStorageFile): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(file));
  } catch (error) {
    logger.error('recent-storage.write failed', error);
  }
}

export async function loadRecent(): Promise<readonly RecentEntry[]> {
  const file = await readFile();
  return file.entries;
}

export interface PreparedTakeoffEntry {
  readonly module: 'takeoff';
  readonly inputs: RecentTakeoffInputs;
  readonly result: number;
}

export interface PreparedLandingEntry {
  readonly module: 'landing';
  readonly inputs: RecentLandingInputs;
  readonly result: number;
}

export type PreparedRecentEntry = PreparedTakeoffEntry | PreparedLandingEntry;

function materialise(prepared: PreparedRecentEntry): RecentEntry {
  const base = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    result: prepared.result,
    fingerprint: computeFingerprint(prepared.module, prepared.inputs),
  };
  if (prepared.module === 'takeoff') {
    const entry: RecentTakeoffEntry = {
      ...base,
      module: 'takeoff',
      inputs: prepared.inputs,
    };
    return entry;
  }
  const entry: RecentLandingEntry = {
    ...base,
    module: 'landing',
    inputs: prepared.inputs,
  };
  return entry;
}

export async function saveRecent(prepared: PreparedRecentEntry): Promise<RecentEntry> {
  const file = await readFile();
  const fresh = materialise(prepared);
  // Dedupe: drop any prior entry with the same fingerprint, then
  // insert at head, then enforce FIFO cap. Order matters — we want
  // the new (refreshed) entry to count toward the cap, not the
  // stale one.
  const withoutDuplicate = file.entries.filter((e) => e.fingerprint !== fresh.fingerprint);
  const next = [fresh, ...withoutDuplicate].slice(0, RECENT_MAX_ENTRIES);
  await writeFile({ schemaVersion: RECENT_SCHEMA_VERSION, entries: next });
  return fresh;
}

export async function removeRecent(id: string): Promise<void> {
  const file = await readFile();
  const next = file.entries.filter((e) => e.id !== id);
  if (next.length === file.entries.length) {
    return;
  }
  await writeFile({ schemaVersion: RECENT_SCHEMA_VERSION, entries: next });
}

export async function clearRecent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
  } catch (error) {
    logger.error('recent-storage.clear failed', error);
  }
}

export async function findRecentById(id: string): Promise<RecentEntry | null> {
  const entries = await loadRecent();
  return entries.find((e) => e.id === id) ?? null;
}
