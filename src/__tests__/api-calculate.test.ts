/**
 * Tests for the /api/calculate route handler.
 *
 * Since Next.js Route Handlers expect NextRequest/NextResponse,
 * we test the POST function directly by constructing Request objects.
 */

import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/calculate/route';
import type { AssessmentInputs } from '@/lib/types';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_INPUTS: AssessmentInputs = {
  company: {
    industry: 'financial',
    revenueBand: '50m_250m',
    employees: '250_1000',
    geography: 'hk',
  },
  data: {
    dataTypes: ['customer_pii', 'payment_card'],
    recordCount: 500_000,
    cloudPercentage: 70,
  },
  controls: {
    securityTeam: true,
    irPlan: true,
    aiAutomation: false,
    mfa: true,
    pentest: true,
    cyberInsurance: false,
  },
  threats: {
    topConcerns: ['ransomware', 'bec_phishing', 'third_party'],
    previousIncidents: '0',
  },
};

describe('POST /api/calculate', () => {
  it('exports a POST handler function', async () => {
    expect(typeof POST).toBe('function');
  });

  it('returns 200 with valid inputs', async () => {
    const req = makeRequest(VALID_INPUTS);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ale).toBeDefined();
    expect(data.ale.mean).toBeGreaterThan(0);
    expect(data.riskRating).toBeDefined();
    expect(data.gordonLoebSpend).toBeGreaterThan(0);
    expect(data.distributionBuckets).toBeDefined();
    expect(data.exceedanceCurve).toBeDefined();
    expect(data.keyDrivers).toBeDefined();
    expect(data.recommendations).toBeDefined();
    // rawLosses should be stripped from the response
    expect(data.rawLosses).toBeUndefined();
  });

  it('returns 400 for missing required fields with fieldErrors', async () => {
    const req = makeRequest({ company: { industry: 'financial' } });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    expect(data.fieldErrors).toBeDefined();
  });

  it('returns 400 when company is missing', async () => {
    const req = makeRequest({
      data: VALID_INPUTS.data,
      controls: VALID_INPUTS.controls,
      threats: VALID_INPUTS.threats,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when data is missing', async () => {
    const req = makeRequest({
      company: VALID_INPUTS.company,
      controls: VALID_INPUTS.controls,
      threats: VALID_INPUTS.threats,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when controls is missing', async () => {
    const req = makeRequest({
      company: VALID_INPUTS.company,
      data: VALID_INPUTS.data,
      threats: VALID_INPUTS.threats,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when threats is missing', async () => {
    const req = makeRequest({
      company: VALID_INPUTS.company,
      data: VALID_INPUTS.data,
      controls: VALID_INPUTS.controls,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json-{{{',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid JSON body');
  });

  it('returns identical results for the same seed on repeated calls', async () => {
    const body = { ...VALID_INPUTS, seed: 12345 };
    const res1 = await POST(makeRequest(body) as any);
    const res2 = await POST(makeRequest(body) as any);
    const d1 = await res1.json();
    const d2 = await res2.json();
    expect(d1.ale.mean).toBe(d2.ale.mean);
    expect(d1.ale.p95).toBe(d2.ale.p95);
    expect(d1.gordonLoebSpend).toBe(d2.gordonLoebSpend);
  });

  it('returns 200 with seed omitted (non-deterministic)', async () => {
    const req = makeRequest(VALID_INPUTS);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});
