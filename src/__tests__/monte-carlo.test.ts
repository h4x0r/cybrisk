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

// Helper: create a seeded RNG for reproducible tests
function makeSeededRng(seed: number) {
  // Simple LCG for testing
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const SAMPLE_INPUTS: AssessmentInputs = {
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

describe('boxMuller', () => {
  it('generates values with mean ~ 0 over many samples', () => {
    const rng = makeSeededRng(42);
    const samples = Array.from({ length: 10_000 }, () => boxMuller(rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
  });

  it('generates values with stddev ~ 1 over many samples', () => {
    const rng = makeSeededRng(42);
    const samples = Array.from({ length: 10_000 }, () => boxMuller(rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.1);
  });
});

describe('sampleLogNormal', () => {
  it('produces positive values', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(sampleLogNormal(12, 2, rng)).toBeGreaterThan(0);
    }
  });

  it('mean approximates exp(mu + sigma^2/2)', () => {
    const rng = makeSeededRng(42);
    const mu = 12,
      sigma = 1.5;
    const samples = Array.from({ length: 10_000 }, () =>
      sampleLogNormal(mu, sigma, rng)
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const expectedMean = Math.exp(mu + (sigma * sigma) / 2);
    // Within 50-200% — log-normal is heavy-tailed
    expect(mean).toBeGreaterThan(expectedMean * 0.5);
    expect(mean).toBeLessThan(expectedMean * 2.0);
  });
});

describe('sampleBeta', () => {
  it('values are in [0, 1]', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const v = sampleBeta(2, 5, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('mean approximates alpha/(alpha+beta)', () => {
    const rng = makeSeededRng(42);
    const alpha = 2,
      beta = 5;
    const samples = Array.from({ length: 10_000 }, () =>
      sampleBeta(alpha, beta, rng)
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean - alpha / (alpha + beta))).toBeLessThan(0.05);
  });
});

describe('samplePERT', () => {
  it('values are within [min, max]', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const v = samplePERT(1, 5, 10, rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('mean approximates (min + 4*mode + max) / 6', () => {
    const rng = makeSeededRng(42);
    const min = 1,
      mode = 5,
      max = 10;
    const samples = Array.from({ length: 10_000 }, () =>
      samplePERT(min, mode, max, rng)
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const expectedMean = (min + 4 * mode + max) / 6;
    expect(Math.abs(mean - expectedMean)).toBeLessThan(expectedMean * 0.15);
  });
});

describe('sampleTEF', () => {
  it('returns positive number', () => {
    const rng = makeSeededRng(42);
    expect(sampleTEF(SAMPLE_INPUTS, rng)).toBeGreaterThan(0);
  });
});

describe('sampleVulnerability', () => {
  it('is between 0 and 1', () => {
    const rng = makeSeededRng(42);
    for (let i = 0; i < 100; i++) {
      const v = sampleVulnerability(SAMPLE_INPUTS, rng);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is lower with more controls active', () => {
    const rng1 = makeSeededRng(42);
    const rng2 = makeSeededRng(42);
    const noControls: AssessmentInputs = {
      ...SAMPLE_INPUTS,
      controls: {
        securityTeam: false,
        irPlan: false,
        aiAutomation: false,
        mfa: false,
        pentest: false,
        cyberInsurance: false,
      },
    };
    const samples1 = Array.from({ length: 1000 }, () =>
      sampleVulnerability(SAMPLE_INPUTS, rng1)
    );
    const samples2 = Array.from({ length: 1000 }, () =>
      sampleVulnerability(noControls, rng2)
    );
    const mean1 = samples1.reduce((a, b) => a + b, 0) / samples1.length;
    const mean2 = samples2.reduce((a, b) => a + b, 0) / samples2.length;
    expect(mean1).toBeLessThan(mean2);
  });
});

describe('samplePrimaryLoss', () => {
  it('returns positive number', () => {
    const rng = makeSeededRng(42);
    expect(samplePrimaryLoss(SAMPLE_INPUTS, rng)).toBeGreaterThan(0);
  });
});

describe('sampleSecondaryLoss', () => {
  it('returns positive number', () => {
    const rng = makeSeededRng(42);
    const primaryLoss = 1_000_000;
    expect(
      sampleSecondaryLoss(SAMPLE_INPUTS, primaryLoss, rng)
    ).toBeGreaterThan(0);
  });

  it('is reduced when cyber insurance is active', () => {
    const rng1 = makeSeededRng(42);
    const rng2 = makeSeededRng(42);
    const primaryLoss = 5_000_000;
    const withInsurance: AssessmentInputs = {
      ...SAMPLE_INPUTS,
      controls: { ...SAMPLE_INPUTS.controls, cyberInsurance: true },
    };
    const samples1 = Array.from({ length: 500 }, () =>
      sampleSecondaryLoss(SAMPLE_INPUTS, primaryLoss, rng1)
    );
    const samples2 = Array.from({ length: 500 }, () =>
      sampleSecondaryLoss(withInsurance, primaryLoss, rng2)
    );
    const mean1 = samples1.reduce((a, b) => a + b, 0) / samples1.length;
    const mean2 = samples2.reduce((a, b) => a + b, 0) / samples2.length;
    expect(mean2).toBeLessThan(mean1);
  });
});

describe('computeRiskRating', () => {
  it('LOW when ALE < 1% of revenue', () => {
    expect(computeRiskRating(100_000, 100_000_000)).toBe('LOW');
  });
  it('MODERATE when ALE 1-3% of revenue', () => {
    expect(computeRiskRating(2_000_000, 100_000_000)).toBe('MODERATE');
  });
  it('HIGH when ALE 3-7% of revenue', () => {
    expect(computeRiskRating(5_000_000, 100_000_000)).toBe('HIGH');
  });
  it('CRITICAL when ALE > 7% of revenue', () => {
    expect(computeRiskRating(10_000_000, 100_000_000)).toBe('CRITICAL');
  });
});

describe('buildDistributionBuckets', () => {
  it('returns buckets that sum to ~1.0 probability', () => {
    const losses = Array.from({ length: 1000 }, (_, i) => i * 100);
    const buckets = buildDistributionBuckets(losses);
    const totalProb = buckets.reduce((sum, b) => sum + b.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 1);
  });
});

describe('buildExceedanceCurve', () => {
  it('starts near 1.0 and ends near 0', () => {
    const losses = Array.from({ length: 1000 }, (_, i) => i * 100);
    const curve = buildExceedanceCurve(losses);
    expect(curve[0].probability).toBeGreaterThan(0.9);
    expect(curve[curve.length - 1].probability).toBeLessThan(0.1);
  });
});

describe('identifyKeyDrivers', () => {
  it('returns at least one driver', () => {
    const drivers = identifyKeyDrivers(SAMPLE_INPUTS);
    expect(drivers.length).toBeGreaterThan(0);
  });

  it('each driver has required fields', () => {
    const drivers = identifyKeyDrivers(SAMPLE_INPUTS);
    for (const d of drivers) {
      expect(d.factor).toBeTruthy();
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(d.impact);
      expect(d.description).toBeTruthy();
    }
  });
});

describe('generateRecommendations', () => {
  it('returns recommendations for missing controls', () => {
    const recs = generateRecommendations(SAMPLE_INPUTS, 5_000_000, 1_000_000);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('returns more recommendations when more controls are missing', () => {
    const noControls: AssessmentInputs = {
      ...SAMPLE_INPUTS,
      controls: {
        securityTeam: false,
        irPlan: false,
        aiAutomation: false,
        mfa: false,
        pentest: false,
        cyberInsurance: false,
      },
    };
    const recs1 = generateRecommendations(
      SAMPLE_INPUTS,
      5_000_000,
      1_000_000
    );
    const recs2 = generateRecommendations(noControls, 5_000_000, 1_000_000);
    expect(recs2.length).toBeGreaterThan(recs1.length);
  });
});

describe('simulate', () => {
  it('returns valid SimulationResults', () => {
    const rng = makeSeededRng(42);
    const results = simulate(SAMPLE_INPUTS, 1000, rng);
    expect(results.ale.mean).toBeGreaterThan(0);
    expect(results.ale.p10).toBeLessThanOrEqual(results.ale.median);
    expect(results.ale.median).toBeLessThanOrEqual(results.ale.p90);
    expect(results.ale.p90).toBeLessThanOrEqual(results.ale.p95);
    expect(results.gordonLoebSpend).toBeGreaterThan(0);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(
      results.riskRating
    );
    expect(results.distributionBuckets.length).toBeGreaterThan(0);
    expect(results.exceedanceCurve.length).toBeGreaterThan(0);
    expect(results.keyDrivers.length).toBeGreaterThan(0);
    expect(results.recommendations.length).toBeGreaterThan(0);
    expect(results.rawLosses.length).toBe(1000);
  });

  it('populates industryBenchmark fields', () => {
    const rng = makeSeededRng(42);
    const results = simulate(SAMPLE_INPUTS, 1000, rng);
    expect(results.industryBenchmark.yourAle).toBeGreaterThan(0);
    expect(results.industryBenchmark.industryMedian).toBeGreaterThan(0);
    expect(results.industryBenchmark.percentileRank).toBeGreaterThanOrEqual(0);
    expect(results.industryBenchmark.percentileRank).toBeLessThanOrEqual(100);
  });

  it('produces higher ALE for industries with higher breach costs', () => {
    const rng1 = makeSeededRng(42);
    const rng2 = makeSeededRng(42);
    const healthcare = {
      ...SAMPLE_INPUTS,
      company: { ...SAMPLE_INPUTS.company, industry: 'healthcare' as const },
    };
    const hospitality = {
      ...SAMPLE_INPUTS,
      company: { ...SAMPLE_INPUTS.company, industry: 'hospitality' as const },
    };
    const r1 = simulate(healthcare, 1000, rng1);
    const r2 = simulate(hospitality, 1000, rng2);
    expect(r1.ale.mean).toBeGreaterThan(r2.ale.mean);
  });
});

// BASE_INPUTS fixture for sampleTEF threat multiplier tests
const BASE_INPUTS: AssessmentInputs = {
  company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
  data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 50 },
  controls: { securityTeam: false, irPlan: false, aiAutomation: false, mfa: false, pentest: false, cyberInsurance: false },
  threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
};

describe('sampleTEF threat multiplier', () => {
  it('ransomware selection produces higher mean TEF than lost_stolen', () => {
    const seededRng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    };
    const highThreat = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: ['ransomware'] as any } };
    const lowThreat  = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: ['lost_stolen'] as any } };

    const N = 1000;
    let highSum = 0, lowSum = 0;
    for (let i = 0; i < N; i++) {
      highSum += sampleTEF(highThreat, seededRng(i));
      lowSum  += sampleTEF(lowThreat,  seededRng(i));
    }
    expect(highSum / N).toBeGreaterThan(lowSum / N);
  });

  it('threat multiplier is clamped to [0.8, 1.5]', () => {
    const rng = () => 0.5;
    // Use a neutral baseline (empty topConcerns → multiplier = 1.0) as reference
    const neutralInputs = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: [] as any } };
    const highInputs    = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: ['ransomware'] as any } };
    const lowInputs     = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: ['lost_stolen'] as any } };
    const neutralTEF = sampleTEF(neutralInputs, rng);
    // ransomware freq/baseline >> 1.5 → clamped at 1.5
    expect(sampleTEF(highInputs, rng) / neutralTEF).toBeLessThanOrEqual(1.5);
    // lost_stolen freq/baseline << 0.8 → clamped at 0.8
    expect(sampleTEF(lowInputs, rng) / neutralTEF).toBeGreaterThanOrEqual(0.8);
  });

  it('empty topConcerns returns a positive value without throwing', () => {
    const rng = () => 0.5;
    const noThreats = { ...BASE_INPUTS, threats: { ...BASE_INPUTS.threats, topConcerns: [] as any } };
    expect(sampleTEF(noThreats, rng)).toBeGreaterThan(0);
  });
});

describe('samplePrimaryLoss cloud modifier', () => {
  const mkInputs = (cloudPct: number): AssessmentInputs => ({
    company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
    data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: cloudPct },
    controls: { securityTeam: false, irPlan: false, aiAutomation: false, mfa: false, pentest: false, cyberInsurance: false },
    threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
  });

  it('100% cloud produces higher mean primary loss than 0% cloud', () => {
    const seededRng = (seed: number) => {
      let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    };
    let highSum = 0, lowSum = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      highSum += samplePrimaryLoss(mkInputs(100), seededRng(i));
      lowSum  += samplePrimaryLoss(mkInputs(0),   seededRng(i));
    }
    expect(highSum / N).toBeGreaterThan(lowSum / N);
  });

  it('cloud modifier is at most 1.12× (IBM 2025 bound)', () => {
    const rng = () => 0.5;
    const high = samplePrimaryLoss(mkInputs(100), rng);
    const zero = samplePrimaryLoss(mkInputs(0),   rng);
    expect(high / zero).toBeLessThanOrEqual(1.13); // 12% max + small float tolerance
  });
});
