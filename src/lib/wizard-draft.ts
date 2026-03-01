import type { AssessmentInputs } from '@/lib/types';

const DRAFT_KEY = 'cybrisk_draft';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getBrowserStorage(): StorageLike {
  if (typeof window !== 'undefined') return window.localStorage;
  return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

export function saveDraft(
  data: Partial<AssessmentInputs>,
  storage: StorageLike = getBrowserStorage(),
): void {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

export function loadDraft(
  storage: StorageLike = getBrowserStorage(),
): Partial<AssessmentInputs> | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AssessmentInputs>;
  } catch {
    return null;
  }
}

export function clearDraft(storage: StorageLike = getBrowserStorage()): void {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {}
}
