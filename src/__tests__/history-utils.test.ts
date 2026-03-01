import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveToHistory,
  loadHistory,
  deleteFromHistory,
  type HistoryEntry,
} from '@/lib/history-utils';

// Injectable storage for tests (avoids real localStorage)
const makeStore = () => {
  let data: string | null = null;
  return {
    getItem: (_key: string) => data,
    setItem: (_key: string, value: string) => { data = value; },
    removeItem: (_key: string) => { data = null; },
  };
};

const ENTRY: HistoryEntry = {
  id: 'test-1',
  savedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  label: 'Finance · USA · 2026-01-01',
  inputs: {
    company: { industry: 'Finance', geography: 'USA', revenue: '$100M-$500M' },
    controls: { mfa: true, edr: true, soc: false, encryption: true, patchCadence: 'monthly', backups: true },
    threats: { insiderThreat: false, nationState: false, publicFacing: true, thirdPartyRisk: false },
  } as HistoryEntry['inputs'],
  results: { ale: { mean: 2_000_000, p95: 5_000_000 }, riskRating: 'High', gordonLoebSpend: 400_000, keyDrivers: [] } as HistoryEntry['results'],
  currency: 'USD',
};

describe('history utils', () => {
  describe('loadHistory()', () => {
    it('returns empty array when storage is empty', () => {
      const store = makeStore();
      expect(loadHistory(store)).toEqual([]);
    });

    it('returns entries sorted newest-first', () => {
      const store = makeStore();
      const older = { ...ENTRY, id: 'old', savedAt: '2026-01-01T00:00:00Z' };
      const newer = { ...ENTRY, id: 'new', savedAt: '2026-01-02T00:00:00Z' };
      store.setItem('cybrisk_history', JSON.stringify([older, newer]));
      const history = loadHistory(store);
      expect(history[0].id).toBe('new');
      expect(history[1].id).toBe('old');
    });
  });

  describe('saveToHistory()', () => {
    it('saves a new entry', () => {
      const store = makeStore();
      saveToHistory(ENTRY, store);
      const history = loadHistory(store);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-1');
    });

    it('caps history at 20 entries', () => {
      const store = makeStore();
      for (let i = 0; i < 21; i++) {
        saveToHistory({ ...ENTRY, id: `entry-${i}`, savedAt: new Date(i * 1000).toISOString() }, store);
      }
      expect(loadHistory(store)).toHaveLength(20);
    });

    it('deduplicates identical inputs within 24 hours', () => {
      const store = makeStore();
      const base = new Date('2026-01-01T12:00:00Z');
      saveToHistory({ ...ENTRY, savedAt: base.toISOString() }, store);
      // Same inputs, 1 hour later — should be skipped
      saveToHistory({ ...ENTRY, id: 'test-2', savedAt: new Date(base.getTime() + 3_600_000).toISOString() }, store);
      expect(loadHistory(store)).toHaveLength(1);
    });

    it('allows same inputs after 24 hours', () => {
      const store = makeStore();
      const base = new Date('2026-01-01T12:00:00Z');
      saveToHistory({ ...ENTRY, savedAt: base.toISOString() }, store);
      // Same inputs, 25 hours later — should be saved
      saveToHistory({ ...ENTRY, id: 'test-2', savedAt: new Date(base.getTime() + 90_000_000).toISOString() }, store);
      expect(loadHistory(store)).toHaveLength(2);
    });
  });

  describe('deleteFromHistory()', () => {
    it('removes the entry with the matching id', () => {
      const store = makeStore();
      saveToHistory(ENTRY, store);
      deleteFromHistory('test-1', store);
      expect(loadHistory(store)).toHaveLength(0);
    });

    it('leaves other entries intact', () => {
      const store = makeStore();
      saveToHistory(ENTRY, store);
      saveToHistory({ ...ENTRY, id: 'test-2' }, store);
      deleteFromHistory('test-1', store);
      const history = loadHistory(store);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-2');
    });
  });
});
