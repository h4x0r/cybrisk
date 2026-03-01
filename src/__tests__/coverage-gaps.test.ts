/**
 * Targeted tests for coverage gaps not reachable through normal test paths.
 *
 * Covers:
 *  - industry-tower-utils: scaleBar(n, 0) → 0
 *  - history-utils: loadHistory catch block, SSR fallback, window.localStorage branch
 *  - monte-carlo: percentile([]) guard, lower===upper, Marsaglia-Tsang u || 1e-10
 *  - api/calculate: rate-limit 429
 */

import { describe, it, expect, vi } from 'vitest';
import { scaleBar } from '@/lib/industry-tower-utils';
import { loadHistory, saveToHistory, deleteFromHistory } from '@/lib/history-utils';
import type { HistoryEntry } from '@/lib/history-utils';
import { simulate, sampleBeta } from '@/lib/monte-carlo';
import { POST } from '@/app/api/calculate/route';
import type { AssessmentInputs } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSeededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const BASE_INPUTS: AssessmentInputs = {
  company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
  data: { dataTypes: ['customer_pii'], recordCount: 10_000, cloudPercentage: 50 },
  controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
  threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
};

const HISTORY_ENTRY: HistoryEntry = {
  id: 'gap-test-1',
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

// ---------------------------------------------------------------------------
// 1. industry-tower-utils: scaleBar when maxCost === 0
// ---------------------------------------------------------------------------
describe('scaleBar()', () => {
  it('returns 0 when maxCost is 0 (avoids division by zero)', () => {
    expect(scaleBar(100, 0)).toBe(0);
    expect(scaleBar(0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. history-utils: loadHistory catch block for corrupted JSON
// ---------------------------------------------------------------------------
describe('loadHistory() catch block', () => {
  it('returns [] when storage contains invalid JSON', () => {
    const brokenStore = {
      getItem: () => '{ this is not valid JSON }{{{',
      setItem: () => {},
    };
    expect(loadHistory(brokenStore)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. history-utils: SSR fallback (no-args calls — Node.js env has no window)
//    getBrowserStorage() returns the SSR fallback when typeof window === 'undefined'
// ---------------------------------------------------------------------------
describe('history-utils SSR fallback (Node.js env: no window)', () => {
  it('loadHistory() returns [] via SSR fallback getItem', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('saveToHistory() no-ops via SSR fallback setItem', () => {
    expect(() => saveToHistory(HISTORY_ENTRY)).not.toThrow();
    expect(loadHistory()).toEqual([]);
  });

  it('deleteFromHistory() silently returns when entry not found', () => {
    expect(() => deleteFromHistory('nonexistent')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. history-utils: window.localStorage branch (covers the 'if typeof window' true arm)
//    Uses vi.stubGlobal to make window defined; getBrowserStorage() is lazy so this works.
// ---------------------------------------------------------------------------
describe('history-utils window.localStorage branch', () => {
  it('getBrowserStorage() returns window.localStorage when window is defined', () => {
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    try {
      const result = loadHistory(); // calls getBrowserStorage() → window.localStorage branch
      expect(result).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. monte-carlo: percentile() with empty sorted array (simulate n=0)
//    Covers: if (sorted.length === 0) return 0
// ---------------------------------------------------------------------------
describe('simulate() with 0 iterations', () => {
  it('handles 0 iterations without throwing (empty percentile guard)', () => {
    const rng = makeSeededRng(1);
    expect(() => simulate(BASE_INPUTS, 0, rng)).not.toThrow();
    const results = simulate(BASE_INPUTS, 0, rng);
    expect(results.rawLosses).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. monte-carlo: percentile() with 1 element — lower === upper branch
//    Covers: if (lower === upper) return sorted[lower]
// ---------------------------------------------------------------------------
describe('simulate() with 1 iteration', () => {
  it('handles 1 iteration (lower === upper in percentile)', () => {
    const rng = makeSeededRng(42);
    expect(() => simulate(BASE_INPUTS, 1, rng)).not.toThrow();
    const results = simulate(BASE_INPUTS, 1, rng);
    expect(results.rawLosses).toHaveLength(1);
    // With one sample, all percentiles collapse to the same value
    expect(results.ale.p10).toBe(results.ale.median);
    expect(results.ale.p90).toBe(results.ale.median);
  });
});

// ---------------------------------------------------------------------------
// 7. monte-carlo: rng() || 1e-10 in Marsaglia-Tsang (line 108)
//    In sampleGamma(shape >= 1): boxMuller uses 2 rng calls, then u = rng() is call 3.
//    Making call 3 return 0 triggers the || 1e-10 branch.
// ---------------------------------------------------------------------------
describe('monte-carlo Marsaglia-Tsang u || 1e-10 branch (line 108)', () => {
  it('triggers || 1e-10 when the 3rd rng call (u in Marsaglia-Tsang) returns 0', () => {
    // sampleGamma(shape >= 1) per iteration: boxMuller (calls 1,2), then u = rng() (call 3)
    // Call 3 = 0 → u = 0 || 1e-10 = 1e-10 → squeeze test passes → returns d*v
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 3) return 0; // exactly the Marsaglia-Tsang u call (line 108)
      return 0.5;
    };
    // sampleBeta(2, 2, rng) calls sampleGamma(2, rng) first — shape >= 1 → Marsaglia-Tsang
    expect(() => sampleBeta(2, 2, rng)).not.toThrow();
    const v = sampleBeta(2, 2, (() => { let n = 0; return () => { n++; return n === 3 ? 0 : 0.5; }; })());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 8. api/calculate: rate-limit 429 response
// ---------------------------------------------------------------------------
describe('POST /api/calculate rate limiting', () => {
  it('returns 429 after exceeding 10 requests per minute from the same IP', async () => {
    const testIp = `test-rate-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    function makeIpRequest() {
      return new Request('http://localhost:3000/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
        body: 'bad-json-body', // invalid JSON → 400, but rate counter still increments
      });
    }

    // Exhaust the 10-request allowance
    for (let i = 0; i < 10; i++) {
      await POST(makeIpRequest() as never);
    }

    // 11th request should be rate-limited
    const res = await POST(makeIpRequest() as never);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Rate limit');
  });
});
