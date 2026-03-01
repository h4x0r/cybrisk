import { describe, it, expect } from 'vitest';
import { generateCSV } from '@/lib/csv-export';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';

const INPUTS: AssessmentInputs = {
  company: { organizationName: 'Test Corp', industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
  data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 50 },
  controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
  threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
};

const RESULTS: SimulationResults = {
  ale: { mean: 1_245_000, median: 890_000, p10: 120_000, p90: 3_400_000, p95: 5_200_000 },
  gordonLoebSpend: 462_500,
  riskRating: 'MODERATE',
  industryBenchmark: { yourAle: 1_245_000, industryMedian: 6_080_000, percentileRank: 20 },
  distributionBuckets: [], exceedanceCurve: [],
  keyDrivers: [{ factor: 'Industry Risk', impact: 'HIGH', description: 'High cost sector.' }],
  recommendations: ['Deploy IR plan.'],
  rawLosses: [],
};

describe('generateCSV', () => {
  it('returns a non-empty string', () => {
    expect(generateCSV(INPUTS, RESULTS).length).toBeGreaterThan(0);
  });

  it('contains a header row', () => {
    const csv = generateCSV(INPUTS, RESULTS);
    expect(csv.split('\n')[0]).toBe('Metric,Value');
  });

  it('includes ALE Mean', () => {
    expect(generateCSV(INPUTS, RESULTS)).toContain('ALE Mean,1245000');
  });

  it('includes Risk Rating', () => {
    expect(generateCSV(INPUTS, RESULTS)).toContain('Risk Rating,MODERATE');
  });

  it('includes organization name when provided', () => {
    expect(generateCSV(INPUTS, RESULTS)).toContain('Organization,Test Corp');
  });

  it('omits organization row when name absent', () => {
    const noName = { ...INPUTS, company: { ...INPUTS.company, organizationName: undefined } };
    expect(generateCSV(noName, RESULTS)).not.toContain('Organization,');
  });

  it('escapes commas in values by quoting', () => {
    const withComma = {
      ...INPUTS,
      company: { ...INPUTS.company, organizationName: 'Acme, Inc.' },
    };
    expect(generateCSV(withComma, RESULTS)).toContain('"Acme, Inc."');
  });
});
