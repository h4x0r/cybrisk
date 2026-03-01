import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

const HISTORY_KEY = 'cybrisk_history';
const MAX_ENTRIES = 20;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1_000; // 24 hours

export interface HistoryEntry {
  id: string;
  savedAt: string;       // ISO 8601
  label: string;         // "{industry} · {geography} · {date}"
  inputs: AssessmentInputs;
  results: SimulationResults;
  currency: Currency;
}

/** Minimal injectable storage interface (real: localStorage, test: in-memory). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Lazy accessor so window is evaluated at call time, not module load — enables testing both branches. */
function getBrowserStorage(): StorageLike {
  if (typeof window !== 'undefined') return window.localStorage;
  return { getItem: () => null, setItem: () => {} };
}

/** Load history from storage, sorted newest-first. */
export function loadHistory(storage: StorageLike = getBrowserStorage()): HistoryEntry[] {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as HistoryEntry[];
    return entries.sort((a, b) =>
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );
  } catch {
    return [];
  }
}

/** Save a new entry, deduplicating identical inputs within DEDUP_WINDOW_MS. Caps at MAX_ENTRIES. */
export function saveToHistory(entry: HistoryEntry, storage: StorageLike = getBrowserStorage()): void {
  const existing = loadHistory(storage);
  const entryTime = new Date(entry.savedAt).getTime();
  const inputsStr = JSON.stringify(entry.inputs);

  const isDuplicate = existing.some(e => {
    const timeDiff = Math.abs(new Date(e.savedAt).getTime() - entryTime);
    return timeDiff < DEDUP_WINDOW_MS && JSON.stringify(e.inputs) === inputsStr;
  });

  if (isDuplicate) return;

  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  storage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/** Remove the entry with the given id. */
export function deleteFromHistory(id: string, storage: StorageLike = getBrowserStorage()): void {
  const existing = loadHistory(storage);
  if (!existing.some(e => e.id === id)) return;
  const updated = existing.filter(e => e.id !== id);
  storage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
