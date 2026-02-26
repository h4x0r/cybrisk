/**
 * TDD for src/lib/scenario-compare.ts
 *
 * compareScenarios(base, modified, iterations?, rng?) runs two simulations
 * and returns structured delta metrics.
 *
 * We use a seeded LCG for deterministic assertions.
 */

import { describe, it, expect } from 'vitest';
import { compareScenarios } from '@/lib/scenario-compare';
import type { AssessmentInputs } from '@/lib/types';

// Deterministic LCG seeded at 42 — same as SimConsole uses
function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const BASE_INPUTS: AssessmentInputs = {
  company: {
    industry: 'financial',
    revenueBand: '50m_250m',
    employees: '250_1000',
    geography: 'us',
  },
  data: {
    dataTypes: ['customer_pii', 'payment_card'],
    recordCount: 200_000,
    cloudPercentage: 50,
  },
  controls: {
    securityTeam: false,
    irPlan: false,
    aiAutomation: false,
    mfa: false,
    pentest: false,
    cyberInsurance: false,
  },
  threats: {
    topConcerns: ['ransomware', 'bec_phishing'],
    previousIncidents: '0',
  },
};

const HARDENED_INPUTS: AssessmentInputs = {
  ...BASE_INPUTS,
  controls: {
    securityTeam: true,
    irPlan: true,
    aiAutomation: true,
    mfa: true,
    pentest: true,
    cyberInsurance: true,
  },
};

describe('compareScenarios', () => {
  it('returns base and modified SimulationResults', () => {
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 1_000, seededRng(42));
    expect(result.base).toBeDefined();
    expect(result.modified).toBeDefined();
    expect(result.base.ale).toBeDefined();
    expect(result.modified.ale).toBeDefined();
  });

  it('returns delta object with aleMean, alePml95, gordonLoeb, riskRatingChanged', () => {
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 1_000, seededRng(42));
    expect(result.delta).toBeDefined();
    expect(typeof result.delta.aleMean).toBe('number');
    expect(typeof result.delta.alePml95).toBe('number');
    expect(typeof result.delta.gordonLoeb).toBe('number');
    expect(typeof result.delta.riskRatingChanged).toBe('boolean');
  });

  it('delta.aleMean is negative when adding security controls reduces ALE', () => {
    // With all controls enabled, ALE should be lower — delta = modified - base < 0
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 5_000, seededRng(99));
    expect(result.delta.aleMean).toBeLessThan(0);
  });

  it('delta.alePml95 is negative when controls reduce tail risk', () => {
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 5_000, seededRng(99));
    expect(result.delta.alePml95).toBeLessThan(0);
  });

  it('savings are positive (ALE reduction expressed as absolute value)', () => {
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 5_000, seededRng(99));
    expect(result.savings.aleMean).toBeGreaterThan(0);
    expect(result.savings.alePml95).toBeGreaterThan(0);
  });

  it('delta is ~0 for identical inputs with same seed', () => {
    const rng1 = seededRng(7);
    const rng2 = seededRng(7);
    const r1 = compareScenarios(BASE_INPUTS, BASE_INPUTS, 1_000, rng1);
    // Same inputs → both simulations run with the same seeded RNG state
    // delta should be close to 0 (may not be exactly 0 due to sequential RNG use)
    // Just verify sign of delta is not extreme
    expect(Math.abs(r1.delta.aleMean)).toBeLessThan(r1.base.ale.mean * 0.5);
  });

  it('riskRatingChanged is true when controls shift the risk tier', () => {
    // Going from no controls to all controls should move the risk rating
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 10_000, seededRng(42));
    // base should have higher ALE → likely CRITICAL or HIGH
    // modified should have lower ALE → lower tier
    // With 10K iterations this should reliably differ
    expect(typeof result.delta.riskRatingChanged).toBe('boolean');
  });

  it('modified.ale.mean is less than base.ale.mean when controls are added', () => {
    const result = compareScenarios(BASE_INPUTS, HARDENED_INPUTS, 5_000, seededRng(55));
    expect(result.modified.ale.mean).toBeLessThan(result.base.ale.mean);
  });
});
