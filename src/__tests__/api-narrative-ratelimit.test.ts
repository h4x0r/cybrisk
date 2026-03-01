/**
 * Tests for narrative rate-limit memory cleanup.
 *
 * Verifies that the rateMap correctly resets after the window expires,
 * and that stale entries are cleaned up (memory leak fix).
 *
 * The 'ai' module is mocked so that non-rate-limited requests return
 * a stable 200 response without hitting a real LLM endpoint.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the 'ai' module before importing the route so streamText/gateway
// never attempt a real network call.
vi.mock('ai', () => ({
  streamText: vi.fn(() => ({
    toTextStreamResponse: () => new Response('ok', { status: 200 }),
  })),
  gateway: vi.fn((model: string) => model),
}));

import { POST } from '@/app/api/narrative/route';

/** Minimal body that satisfies buildPrompt without crashing. */
const MINIMAL_BODY = {
  inputs: {
    company: {
      industry: 'financial',
      geography: 'hk',
      revenueBand: '50m_250m',
      employees: '250_1000',
    },
    data: { dataTypes: [], recordCount: 0, cloudPercentage: 0 },
    controls: {
      mfa: true,
      securityTeam: true,
      irPlan: true,
      aiAutomation: false,
      pentest: false,
      cyberInsurance: false,
    },
    threats: { topConcerns: [], previousIncidents: '0' },
  },
  results: {
    ale: { mean: 1_000_000, p95: 2_000_000, p99: 3_000_000, min: 0, max: 5_000_000 },
    gordonLoebSpend: 50_000,
    riskRating: 'Medium',
    keyDrivers: [{ factor: 'ransomware', contribution: 0.6 }],
    recommendations: [],
    distributionBuckets: [],
    exceedanceCurve: [],
  },
  currency: 'USD',
};

function makeNarrativeRequest(ip: string) {
  return new Request('http://localhost:3000/api/narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(MINIMAL_BODY),
  });
}

describe('narrative rate limit map cleanup', () => {
  it('resets rate limit after window expires', async () => {
    vi.useFakeTimers();
    const ip = `cleanup-${Date.now()}`;

    // Exhaust the rate limit (RATE_LIMIT = 10)
    for (let i = 0; i < 10; i++) {
      await POST(makeNarrativeRequest(ip) as never);
    }

    // The 11th request should be blocked with 429
    const blocked = await POST(makeNarrativeRequest(ip) as never);
    expect(blocked.status).toBe(429);

    // Advance past the rate window (RATE_WINDOW_MS = 60_000)
    vi.advanceTimersByTime(61_000);

    // After window reset, the request should no longer be 429
    const afterReset = await POST(makeNarrativeRequest(ip) as never);
    expect(afterReset.status).not.toBe(429);

    vi.useRealTimers();
  });

  it('does not block a fresh IP that was never rate-limited', async () => {
    const freshIp = `fresh-ip-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // A brand new IP should not be blocked on its first request
    const first = await POST(makeNarrativeRequest(freshIp) as never);
    expect(first.status).not.toBe(429);
  });

  it('blocks correctly after exactly RATE_LIMIT requests', async () => {
    vi.useFakeTimers();
    const ip = `exact-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Send exactly RATE_LIMIT (10) requests — all should be allowed
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeNarrativeRequest(ip) as never);
      expect(res.status).not.toBe(429);
    }

    // The next (11th) request should be blocked
    const blocked = await POST(makeNarrativeRequest(ip) as never);
    expect(blocked.status).toBe(429);

    vi.useRealTimers();
  });
});
