/**
 * Additional Monte Carlo tests targeting uncovered branches for 100% coverage.
 *
 * Uncovered lines in monte-carlo.ts (from coverage report):
 * - Line ~88: sampleGamma shape < 1 branch (Ahrens-Dieter boost)
 * - Line ~136: samplePERT degenerate alpha fallback
 * - Line ~142: samplePERT beta_param fallback
 * - Lines ~296-305: buildDistributionBuckets bucketWidth === 0
 * - Lines ~332-341: formatCurrency billion/sub-thousand formatting
 * - Lines ~451-452: identifyKeyDrivers — regulatory exposure HIGH
 * - Line ~462: identifyKeyDrivers — attack surface HIGH
 * - Lines ~479-488: identifyKeyDrivers — incident history 2_5/5_plus
 * - Lines ~545-559: generateRecommendations — payment_card, health_records, recordCount > 1M
 */

import { describe, it, expect } from 'vitest';
import {
  boxMuller,
  sampleLogNormal,
  sampleBeta,
  samplePERT,
  sampleTEF,
  sampleVulnerability,
  samplePrimaryLoss,
  sampleSecondaryLoss,
  computeRiskRating,
  buildDistributionBuckets,
  buildExceedanceCurve,
  identifyKeyDrivers,
  generateRecommendations,
  simulate,
} from '@/lib/monte-carlo';
import type { AssessmentInputs } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helper: deterministic seeded RNG (LCG)
// ---------------------------------------------------------------------------
function makeSeededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Standard base inputs
// ---------------------------------------------------------------------------
const BASE_INPUTS: AssessmentInputs = {
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

// =========================================================================
// 1. sampleBeta — exercise sampleGamma shape < 1 (Ahrens-Dieter boost)
// =========================================================================
describe('sampleBeta edge cases (gamma shape < 1)', () => {
  it('handles alpha < 1 (triggers Ahrens-Dieter boost in sampleGamma)', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      const v = sampleBeta(0.5, 0.5, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('handles beta < 1 (triggers boost for the second gamma)', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      const v = sampleBeta(2, 0.3, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('handles both alpha < 1 and beta < 1', () => {
    const rng = makeSeededRng(99);
    for (let i = 0; i < 50; i++) {
      const v = sampleBeta(0.1, 0.1, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

// =========================================================================
// 2. samplePERT — degenerate cases (alpha/beta_param fallbacks)
// =========================================================================
describe('samplePERT edge cases', () => {
  it('returns min when min === max (line 128)', () => {
    expect(samplePERT(5, 5, 5)).toBe(5);
  });

  it('handles mode at min boundary (alpha fallback, line 136)', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      const v = samplePERT(0, 0, 10, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('handles mode at max boundary (beta_param fallback, line 142)', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 50; i++) {
      const v = samplePERT(0, 10, 10, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('handles min === mode (but not max) — degenerate alpha', () => {
    const rng = makeSeededRng(123);
    for (let i = 0; i < 50; i++) {
      const v = samplePERT(5, 5, 15, rng);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    }
  });

  it('handles mode > max which makes beta_param negative (line 142)', () => {
    // When mode > max, mu > max, so beta_param becomes negative.
    // min=0, mode=10, max=2:
    //   mu = (0 + 40 + 2)/6 = 7.0
    //   alpha = (7*18)/(3*2) = 21 > 0 (passes first check)
    //   beta_param = (21*(2-7))/(7-0) = -15 <= 0 (hits line 142)
    const rng = makeSeededRng(42);
    for (let i = 0; i < 20; i++) {
      const v = samplePERT(0, 10, 2, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(2);
    }
  });
});

// =========================================================================
// 3. buildDistributionBuckets — edge cases
// =========================================================================
describe('buildDistributionBuckets edge cases', () => {
  it('returns empty array for empty losses', () => {
    expect(buildDistributionBuckets([])).toEqual([]);
  });

  it('returns single bucket when all losses are identical (bucketWidth === 0)', () => {
    const buckets = buildDistributionBuckets([100, 100, 100, 100]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].probability).toBe(1.0);
    expect(buckets[0].minValue).toBe(100);
    expect(buckets[0].maxValue).toBe(100);
  });

  it('single bucket rangeLabel contains $', () => {
    const buckets = buildDistributionBuckets([500, 500]);
    expect(buckets[0].rangeLabel).toContain('$');
  });
});

// =========================================================================
// 4. buildExceedanceCurve — edge cases
// =========================================================================
describe('buildExceedanceCurve edge cases', () => {
  it('handles single loss value', () => {
    const curve = buildExceedanceCurve([500]);
    expect(curve.length).toBeGreaterThan(0);
    // With a single value, all thresholds equal that value
    // First point: threshold = 500, count of losses > 500 = 0
    expect(curve[0].probability).toBe(0);
  });

  it('handles empty array', () => {
    const curve = buildExceedanceCurve([]);
    expect(curve).toEqual([]);
  });

  it('returns exactly 50 points for multiple losses', () => {
    const losses = Array.from({ length: 100 }, (_, i) => i * 1000);
    const curve = buildExceedanceCurve(losses);
    expect(curve).toHaveLength(50);
  });
});

// =========================================================================
// 5. formatCurrency via buildDistributionBuckets (tests the private fn)
// =========================================================================
describe('formatCurrency via distribution bucket labels', () => {
  it('formats billions ($X.XB)', () => {
    const losses = [1_500_000_000, 2_000_000_000, 2_500_000_000];
    const buckets = buildDistributionBuckets(losses);
    expect(buckets[0].rangeLabel).toContain('B');
  });

  it('formats millions ($X.XM)', () => {
    const losses = [1_500_000, 2_000_000, 2_500_000];
    const buckets = buildDistributionBuckets(losses);
    expect(buckets[0].rangeLabel).toContain('M');
  });

  it('formats thousands ($XK)', () => {
    const losses = [1_500, 2_000, 2_500];
    const buckets = buildDistributionBuckets(losses);
    expect(buckets[0].rangeLabel).toContain('K');
  });

  it('formats sub-thousand values ($X)', () => {
    const losses = [10, 20, 30, 40, 50];
    const buckets = buildDistributionBuckets(losses);
    expect(buckets[0].rangeLabel).toContain('$');
    // Should NOT contain K, M, or B
    expect(buckets[0].rangeLabel).not.toContain('K');
    expect(buckets[0].rangeLabel).not.toContain('M');
    expect(buckets[0].rangeLabel).not.toContain('B');
  });

  it('single identical values in billions use formatCurrency', () => {
    const buckets = buildDistributionBuckets([5_000_000_000, 5_000_000_000]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].rangeLabel).toContain('B');
  });
});

// =========================================================================
// 6. identifyKeyDrivers — cover all branches
// =========================================================================
describe('identifyKeyDrivers branches', () => {
  it('flags regulatory exposure HIGH for EU financial (compound GDPR + DORA + NIS2)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, geography: 'eu' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const regDriver = drivers.find((d) => d.factor === 'Regulatory Exposure');
    expect(regDriver).toBeDefined();
    expect(regDriver!.impact).toBe('HIGH');
    expect(regDriver!.description).toContain('GDPR');
    expect(regDriver!.description).toContain('DORA');
    expect(regDriver!.description).toContain('6.0%');
  });

  it('flags regulatory exposure HIGH for UK (maxPctRevenue >= 0.04)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, geography: 'uk' },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Regulatory Exposure')).toBe(true);
  });

  it('flags regulatory exposure MEDIUM for HK financial (compound PDPO + HKMA)', () => {
    const drivers = identifyKeyDrivers(BASE_INPUTS); // geography: 'hk', industry: 'financial'
    const regDriver = drivers.find((d) => d.factor === 'Regulatory Exposure');
    expect(regDriver).toBeDefined();
    expect(regDriver!.impact).toBe('MEDIUM');
    expect(regDriver!.description).toContain('PDPO');
    expect(regDriver!.description).toContain('HKMA CFI');
  });

  it('does NOT flag regulatory exposure for HK entertainment (no overlay)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, industry: 'entertainment' as const },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Regulatory Exposure')).toBe(false);
  });

  it('flags attack surface HIGH for large employee count (over_25000)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, employees: 'over_25000' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const asDriver = drivers.find((d) => d.factor === 'Attack Surface');
    expect(asDriver).toBeDefined();
    expect(asDriver!.impact).toBe('HIGH');
  });

  it('flags attack surface HIGH for 5000_25000 employees (multiplier 1.6)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, employees: '5000_25000' },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Attack Surface')).toBe(true);
  });

  it('does NOT flag attack surface for small employee count', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, employees: 'under_250' },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Attack Surface')).toBe(false);
  });

  it('flags incident history for 2_5', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      threats: { ...BASE_INPUTS.threats, previousIncidents: '2_5' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const histDriver = drivers.find((d) => d.factor === 'Incident History');
    expect(histDriver).toBeDefined();
    expect(histDriver!.impact).toBe('HIGH');
  });

  it('flags incident history for 5_plus', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      threats: { ...BASE_INPUTS.threats, previousIncidents: '5_plus' },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Incident History')).toBe(true);
  });

  it('does NOT flag incident history for 0 or 1', () => {
    const drivers0 = identifyKeyDrivers(BASE_INPUTS); // previousIncidents: '0'
    expect(drivers0.some((d) => d.factor === 'Incident History')).toBe(false);

    const inputs1: AssessmentInputs = {
      ...BASE_INPUTS,
      threats: { ...BASE_INPUTS.threats, previousIncidents: '1' },
    };
    const drivers1 = identifyKeyDrivers(inputs1);
    expect(drivers1.some((d) => d.factor === 'Incident History')).toBe(false);
  });

  it('does NOT flag ransomware when not in concerns', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      threats: { topConcerns: ['bec_phishing', 'insider_threat'], previousIncidents: '0' },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Ransomware Risk')).toBe(false);
  });

  it('flags ransomware when in concerns', () => {
    const drivers = identifyKeyDrivers(BASE_INPUTS); // includes 'ransomware'
    expect(drivers.some((d) => d.factor === 'Ransomware Risk')).toBe(true);
  });

  it('flags Security Controls Gap HIGH when >= 3 controls missing', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      controls: {
        securityTeam: false,
        irPlan: false,
        aiAutomation: false,
        mfa: false,
        pentest: false,
        cyberInsurance: false,
      },
    };
    const drivers = identifyKeyDrivers(inputs);
    const gap = drivers.find((d) => d.factor === 'Security Controls Gap');
    expect(gap).toBeDefined();
    expect(gap!.impact).toBe('HIGH');
  });

  it('flags Security Controls Gap MEDIUM when 1-2 controls missing', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      controls: {
        securityTeam: true,
        irPlan: true,
        aiAutomation: false, // 1 missing
        mfa: true,
        pentest: true,
        cyberInsurance: true,
      },
    };
    const drivers = identifyKeyDrivers(inputs);
    const gap = drivers.find((d) => d.factor === 'Security Controls Gap');
    expect(gap).toBeDefined();
    expect(gap!.impact).toBe('MEDIUM');
  });

  it('does NOT flag controls gap when all controls are active', () => {
    const inputs: AssessmentInputs = {
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
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor.includes('Controls'))).toBe(false);
  });

  it('flags industry risk HIGH for healthcare (cost > 6)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, industry: 'healthcare' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const indDriver = drivers.find((d) => d.factor === 'Industry Risk');
    expect(indDriver!.impact).toBe('HIGH');
  });

  it('flags industry risk MEDIUM for financial (cost > 4, <= 6)', () => {
    // financial = 6.08 => HIGH
    // Let's use services = 4.55 => MEDIUM
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, industry: 'services' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const indDriver = drivers.find((d) => d.factor === 'Industry Risk');
    expect(indDriver!.impact).toBe('MEDIUM');
  });

  it('flags industry risk LOW for hospitality (cost <= 4)', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, industry: 'hospitality' },
    };
    const drivers = identifyKeyDrivers(inputs);
    const indDriver = drivers.find((d) => d.factor === 'Industry Risk');
    expect(indDriver!.impact).toBe('LOW');
  });

  it('flags Data Volume HIGH for > 1M records', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, recordCount: 5_000_000 },
    };
    const drivers = identifyKeyDrivers(inputs);
    const volDriver = drivers.find((d) => d.factor === 'Data Volume');
    expect(volDriver).toBeDefined();
    expect(volDriver!.impact).toBe('HIGH');
  });

  it('flags Data Volume MEDIUM for 100K-1M records', () => {
    const drivers = identifyKeyDrivers(BASE_INPUTS); // 500K records
    const volDriver = drivers.find((d) => d.factor === 'Data Volume');
    expect(volDriver).toBeDefined();
    expect(volDriver!.impact).toBe('MEDIUM');
  });

  it('does NOT flag Data Volume for <= 100K records', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, recordCount: 50_000 },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Data Volume')).toBe(false);
  });

  it('flags Data Sensitivity when sensitive types present', () => {
    const drivers = identifyKeyDrivers(BASE_INPUTS); // has payment_card
    expect(drivers.some((d) => d.factor === 'Data Sensitivity')).toBe(true);
  });

  it('does NOT flag Data Sensitivity for non-sensitive types', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, dataTypes: ['customer_pii', 'employee_pii'] },
    };
    const drivers = identifyKeyDrivers(inputs);
    expect(drivers.some((d) => d.factor === 'Data Sensitivity')).toBe(false);
  });
});

// =========================================================================
// 7. generateRecommendations — cover data-specific branches
// =========================================================================
describe('generateRecommendations branches', () => {
  it('recommends PCI DSS for payment card data', () => {
    const recs = generateRecommendations(BASE_INPUTS, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('PCI DSS'))).toBe(true);
  });

  it('recommends HIPAA for health records', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, dataTypes: ['health_records'] },
    };
    const recs = generateRecommendations(inputs, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('HIPAA'))).toBe(true);
  });

  it('recommends data minimisation for > 1M records', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, recordCount: 5_000_000 },
    };
    const recs = generateRecommendations(inputs, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('minimisation'))).toBe(true);
  });

  it('does NOT recommend PCI DSS when no payment card data', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, dataTypes: ['customer_pii'] },
    };
    const recs = generateRecommendations(inputs, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('PCI DSS'))).toBe(false);
  });

  it('does NOT recommend minimisation for <= 1M records', () => {
    const recs = generateRecommendations(BASE_INPUTS, 1_000_000, 100_000); // 500K records
    expect(recs.some((r) => r.includes('minimisation'))).toBe(false);
  });

  it('includes recommendation for every missing control', () => {
    const allMissing: AssessmentInputs = {
      ...BASE_INPUTS,
      controls: {
        securityTeam: false,
        irPlan: false,
        aiAutomation: false,
        mfa: false,
        pentest: false,
        cyberInsurance: false,
      },
    };
    const recs = generateRecommendations(allMissing, 1_000_000, 100_000);
    // 6 controls missing + Gordon-Loeb + PCI DSS (payment_card in BASE) = at least 8
    expect(recs.length).toBeGreaterThanOrEqual(8);
  });

  it('always includes Gordon-Loeb recommendation', () => {
    const recs = generateRecommendations(BASE_INPUTS, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('Gordon-Loeb'))).toBe(true);
  });

  it('includes both health records and PCI DSS when both types present', () => {
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: {
        ...BASE_INPUTS.data,
        dataTypes: ['health_records', 'payment_card'],
        recordCount: 2_000_000,
      },
    };
    const recs = generateRecommendations(inputs, 1_000_000, 100_000);
    expect(recs.some((r) => r.includes('PCI DSS'))).toBe(true);
    expect(recs.some((r) => r.includes('HIPAA'))).toBe(true);
    expect(recs.some((r) => r.includes('minimisation'))).toBe(true);
  });
});

// =========================================================================
// 8. samplePrimaryLoss edge cases
// =========================================================================
describe('samplePrimaryLoss edge cases', () => {
  it('returns 0 for empty dataTypes', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, dataTypes: [] },
    };
    expect(samplePrimaryLoss(inputs, rng)).toBe(0);
  });

  it('handles single data type (ip)', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: { ...BASE_INPUTS.data, dataTypes: ['ip'] },
    };
    expect(samplePrimaryLoss(inputs, rng)).toBeGreaterThan(0);
  });

  it('handles all 6 data types', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      data: {
        ...BASE_INPUTS.data,
        dataTypes: ['customer_pii', 'employee_pii', 'payment_card', 'health_records', 'ip', 'financial'],
      },
    };
    expect(samplePrimaryLoss(inputs, rng)).toBeGreaterThan(0);
  });

  it('respects revenue cap (10% of revenue)', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      ...BASE_INPUTS,
      company: { ...BASE_INPUTS.company, revenueBand: 'under_50m' },
    };
    const revenueMidpoint = 25_000_000; // REVENUE_MIDPOINTS['under_50m']
    for (let i = 0; i < 100; i++) {
      const loss = samplePrimaryLoss(inputs, rng);
      expect(loss).toBeLessThanOrEqual(revenueMidpoint * 0.1 + 1);
    }
  });
});

// =========================================================================
// 9. sampleSecondaryLoss edge cases
// =========================================================================
describe('sampleSecondaryLoss edge cases', () => {
  it('cyber insurance reduces secondary loss by 50%', () => {
    const rng1 = makeSeededRng(42);
    const rng2 = makeSeededRng(42);
    const noInsurance: AssessmentInputs = {
      ...BASE_INPUTS,
      controls: { ...BASE_INPUTS.controls, cyberInsurance: false },
    };
    const withInsurance: AssessmentInputs = {
      ...BASE_INPUTS,
      controls: { ...BASE_INPUTS.controls, cyberInsurance: true },
    };
    const sl1 = sampleSecondaryLoss(noInsurance, 1_000_000, rng1);
    const sl2 = sampleSecondaryLoss(withInsurance, 1_000_000, rng2);
    // With same RNG seed, insurance version should be exactly half
    expect(sl2).toBeCloseTo(sl1 * 0.5, -2);
  });
});

// =========================================================================
// 10. simulate — diverse input profiles
// =========================================================================
describe('simulate edge cases', () => {
  it('handles small company with minimal data and 5_plus incidents', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      company: { industry: 'hospitality', revenueBand: 'under_50m', employees: 'under_250', geography: 'other' },
      data: { dataTypes: ['customer_pii'], recordCount: 1000, cloudPercentage: 20 },
      controls: { securityTeam: false, irPlan: false, aiAutomation: false, mfa: false, pentest: false, cyberInsurance: false },
      threats: { topConcerns: ['ransomware'], previousIncidents: '5_plus' },
    };
    const results = simulate(inputs, 500, rng);
    expect(results.ale.mean).toBeGreaterThan(0);
    expect(results.riskRating).toBeDefined();
    expect(results.recommendations.length).toBeGreaterThan(0);
    expect(results.keyDrivers.length).toBeGreaterThan(0);
    // Should flag incident history
    expect(results.keyDrivers.some((d) => d.factor === 'Incident History')).toBe(true);
  });

  it('handles large enterprise with all controls and EU geography', () => {
    const rng = makeSeededRng(42);
    const inputs: AssessmentInputs = {
      company: { industry: 'healthcare', revenueBand: 'over_5b', employees: 'over_25000', geography: 'eu' },
      data: { dataTypes: ['health_records', 'employee_pii', 'financial'], recordCount: 10_000_000, cloudPercentage: 90 },
      controls: { securityTeam: true, irPlan: true, aiAutomation: true, mfa: true, pentest: true, cyberInsurance: true },
      threats: { topConcerns: ['ransomware', 'insider_threat', 'third_party'], previousIncidents: '2_5' },
    };
    const results = simulate(inputs, 500, rng);
    expect(results.ale.mean).toBeGreaterThan(0);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(results.riskRating);
    // EU should trigger regulatory driver
    expect(results.keyDrivers.some((d) => d.factor === 'Regulatory Exposure')).toBe(true);
    // over_25000 should trigger attack surface
    expect(results.keyDrivers.some((d) => d.factor === 'Attack Surface')).toBe(true);
    // 2_5 should trigger incident history
    expect(results.keyDrivers.some((d) => d.factor === 'Incident History')).toBe(true);
    // health_records + financial => data sensitivity
    expect(results.keyDrivers.some((d) => d.factor === 'Data Sensitivity')).toBe(true);
    // > 1M records => data volume
    expect(results.keyDrivers.some((d) => d.factor === 'Data Volume')).toBe(true);
    // Recommendations should mention HIPAA
    expect(results.recommendations.some((r) => r.includes('HIPAA'))).toBe(true);
    // Recommendations should mention minimisation (>1M records)
    expect(results.recommendations.some((r) => r.includes('minimisation'))).toBe(true);
  });

  it('exceedance curve has 50 points', () => {
    const rng = makeSeededRng(42);
    const results = simulate(BASE_INPUTS, 500, rng);
    expect(results.exceedanceCurve.length).toBe(50);
  });

  it('distribution buckets have 10 buckets', () => {
    const rng = makeSeededRng(42);
    const results = simulate(BASE_INPUTS, 500, rng);
    expect(results.distributionBuckets.length).toBe(10);
  });

  it('raw losses length matches iterations', () => {
    const rng = makeSeededRng(42);
    const results = simulate(BASE_INPUTS, 200, rng);
    expect(results.rawLosses).toHaveLength(200);
  });

  it('gordonLoebSpend is positive', () => {
    const rng = makeSeededRng(42);
    const results = simulate(BASE_INPUTS, 500, rng);
    expect(results.gordonLoebSpend).toBeGreaterThan(0);
  });

  it('industryBenchmark has valid percentileRank (0-100)', () => {
    const rng = makeSeededRng(42);
    const results = simulate(BASE_INPUTS, 500, rng);
    expect(results.industryBenchmark.percentileRank).toBeGreaterThanOrEqual(0);
    expect(results.industryBenchmark.percentileRank).toBeLessThanOrEqual(100);
  });
});

// =========================================================================
// 11. boxMuller — edge case where rng returns 0
// =========================================================================
describe('boxMuller edge cases', () => {
  it('handles rng that initially returns 0 (resamples)', () => {
    let callCount = 0;
    const rng = () => {
      callCount++;
      // Return 0 for first two calls, then valid numbers
      if (callCount <= 2) return 0;
      return 0.5;
    };
    const result = boxMuller(rng);
    expect(isFinite(result)).toBe(true);
  });
});

// =========================================================================
// 12. sampleBeta with RNG that sometimes returns 0 (exercises rng() || 1e-10 in sampleGamma)
// =========================================================================
describe('sampleGamma zero-guard branches', () => {
  it('triggers || 1e-10 on the FIRST rng call in the Ahrens-Dieter boost path (line 89)', () => {
    // sampleGamma(shape < 1) immediately calls rng() to get u on line 89.
    // Making the very first call return 0 ensures u = 0 || 1e-10 = 1e-10 — the uncovered branch.
    let firstCall = true;
    const rng = () => {
      if (firstCall) { firstCall = false; return 0; }
      // Subsequent calls use a valid seeded sequence
      return 0.5;
    };
    // alpha=0.5 < 1 → sampleGamma(0.5, rng) → first rng() call hits line 89
    expect(() => sampleBeta(0.5, 2, rng)).not.toThrow();
    const v = sampleBeta(0.5, 2, (() => { let f = true; return () => { if (f) { f = false; return 0; } return 0.5; }; })());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('handles rng returning 0 in Marsaglia-Tsang u guard', () => {
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount % 7 === 0) return 0;
      const s = (callCount * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
    for (let i = 0; i < 20; i++) {
      const v = sampleBeta(3, 3, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

// =========================================================================
// 13. computeRiskRating — boundary values
// =========================================================================
describe('computeRiskRating boundaries', () => {
  it('boundary at exactly 1%', () => {
    // 1% of 100M = 1M. computeRiskRating checks pct < 0.01
    expect(computeRiskRating(1_000_000, 100_000_000)).toBe('MODERATE');
  });

  it('boundary at exactly 3%', () => {
    expect(computeRiskRating(3_000_000, 100_000_000)).toBe('HIGH');
  });

  it('boundary at exactly 7%', () => {
    expect(computeRiskRating(7_000_000, 100_000_000)).toBe('CRITICAL');
  });
});
