import { describe, it, expect } from 'vitest';

describe('narrative buildPrompt', () => {
  it('includes organizationName when provided', async () => {
    const { buildPrompt } = await import('@/app/api/narrative/route');
    const inputs = {
      company: { organizationName: 'Acme Corp', industry: 'financial' as const, revenueBand: '50m_250m' as const, employees: '250_1000' as const, geography: 'us' as const },
      data: { dataTypes: ['customer_pii' as const], recordCount: 100_000, cloudPercentage: 50 },
      controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
      threats: { topConcerns: ['ransomware' as const], previousIncidents: '0' as const },
    };
    const results = {
      ale: { mean: 1_000_000, median: 800_000, p10: 100_000, p90: 2_000_000, p95: 3_000_000 },
      gordonLoebSpend: 200_000, riskRating: 'MODERATE' as const,
      industryBenchmark: { yourAle: 1_000_000, industryMedian: 5_000_000, percentileRank: 20 },
      distributionBuckets: [], exceedanceCurve: [], keyDrivers: [{ factor: 'Test', impact: 'HIGH' as const, description: 'x' }],
      recommendations: [], rawLosses: [],
    };
    const prompt = buildPrompt(inputs as any, results as any, 'USD');
    expect(prompt).toContain('Acme Corp');
  });

  it('omits organization line when organizationName is absent', async () => {
    const { buildPrompt } = await import('@/app/api/narrative/route');
    const inputs = {
      company: { industry: 'financial' as const, revenueBand: '50m_250m' as const, employees: '250_1000' as const, geography: 'us' as const },
      data: { dataTypes: ['customer_pii' as const], recordCount: 100_000, cloudPercentage: 50 },
      controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
      threats: { topConcerns: ['ransomware' as const], previousIncidents: '0' as const },
    };
    const results = {
      ale: { mean: 1_000_000, median: 800_000, p10: 100_000, p90: 2_000_000, p95: 3_000_000 },
      gordonLoebSpend: 200_000, riskRating: 'MODERATE' as const,
      industryBenchmark: { yourAle: 1_000_000, industryMedian: 5_000_000, percentileRank: 20 },
      distributionBuckets: [], exceedanceCurve: [], keyDrivers: [{ factor: 'Test', impact: 'HIGH' as const, description: 'x' }],
      recommendations: [], rawLosses: [],
    };
    const prompt = buildPrompt(inputs as any, results as any, 'USD');
    expect(prompt).not.toContain('Organization:');
  });
});
