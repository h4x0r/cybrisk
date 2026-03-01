import { describe, it, expect } from 'vitest';
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
  label: 'financial · us · 2026-01-01',
  inputs: {
    company: { industry: 'financial', geography: 'us', revenueBand: '50m_250m', employees: '1000_5000' },
    data: { dataTypes: ['customer_pii'], recordCount: 50_000, cloudPercentage: 40 },
    controls: { securityTeam: true, irPlan: false, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
    threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
  },
  results: {
    ale: { mean: 2_000_000, median: 1_500_000, p10: 500_000, p90: 4_000_000, p95: 5_000_000 },
    gordonLoebSpend: 400_000,
    riskRating: 'HIGH',
    industryBenchmark: { yourAle: 2_000_000, industryMedian: 1_800_000, percentileRank: 60 },
    distributionBuckets: [],
    exceedanceCurve: [],
    keyDrivers: [],
    recommendations: [],
    rawLosses: [],
  },
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
      const base = new Date('2026-01-01T00:00:00Z').getTime();
      for (let i = 0; i < 21; i++) {
        saveToHistory({
          ...ENTRY,
          id: `entry-${i}`,
          savedAt: new Date(base + i * 25 * 60 * 60 * 1_000).toISOString(), // 25h apart — avoids dedup window
        }, store);
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

    it('deduplicates identical inputs at the same timestamp', () => {
      const store = makeStore();
      saveToHistory(ENTRY, store);
      saveToHistory({ ...ENTRY, id: 'test-dup' }, store);
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

    it('does nothing when id does not exist', () => {
      const store = makeStore();
      saveToHistory(ENTRY, store);
      deleteFromHistory('does-not-exist', store);
      expect(loadHistory(store)).toHaveLength(1);
    });

    it('leaves other entries intact', () => {
      const store = makeStore();
      const entryB = {
        ...ENTRY,
        id: 'test-2',
        inputs: {
          ...ENTRY.inputs,
          company: { ...ENTRY.inputs.company, industry: 'healthcare' },
        } as HistoryEntry['inputs'],
      };
      saveToHistory(ENTRY, store);
      saveToHistory(entryB, store);
      deleteFromHistory('test-1', store);
      const history = loadHistory(store);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-2');
    });
  });
});
