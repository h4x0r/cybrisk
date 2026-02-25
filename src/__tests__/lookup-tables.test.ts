import { describe, it, expect } from 'vitest';
import {
  PER_RECORD_COST,
  INDUSTRY_AVG_COST,
  COST_MODIFIERS,
  ATTACK_PATTERN_FREQ,
  INCIDENT_COST_BY_REVENUE,
  REGULATORY_EXPOSURE,
  getRegulatoryCoverage,
  TEF_BY_INDUSTRY,
  BASE_VULNERABILITY,
  REVENUE_MIDPOINTS,
  EMPLOYEE_MULTIPLIERS,
  CLAIM_SEVERITY,
} from '@/lib/lookup-tables';

describe('lookup-tables', () => {
  it('has all 17 industries in INDUSTRY_AVG_COST', () => {
    expect(Object.keys(INDUSTRY_AVG_COST)).toHaveLength(17);
  });

  it('has all 6 data types in PER_RECORD_COST', () => {
    expect(Object.keys(PER_RECORD_COST)).toHaveLength(6);
  });

  it('all per-record costs are positive', () => {
    Object.values(PER_RECORD_COST).forEach((cost) => {
      expect(cost).toBeGreaterThan(0);
    });
  });

  it('IR plan modifier is -0.23', () => {
    expect(COST_MODIFIERS.ir_plan).toBe(-0.23);
  });

  it('EU base regulatory exposure is 4% of revenue', () => {
    expect(REGULATORY_EXPOSURE.eu.maxPctRevenue).toBe(0.04);
  });

  it('getRegulatoryCoverage returns base rate for industries without overlays', () => {
    const profile = getRegulatoryCoverage('eu', 'media');
    expect(profile.maxPctRevenue).toBe(0.04);
    expect(profile.frameworks).toEqual(['GDPR']);
  });

  it('compounds HIPAA on US healthcare', () => {
    const profile = getRegulatoryCoverage('us', 'healthcare');
    expect(profile.maxPctRevenue).toBe(0.025); // 1% + 1.5%
    expect(profile.frameworks).toContain('State breach notification');
    expect(profile.frameworks).toContain('HIPAA');
  });

  it('compounds DORA + NIS2 on EU financial', () => {
    const profile = getRegulatoryCoverage('eu', 'financial');
    expect(profile.maxPctRevenue).toBe(0.06); // 4% + 1.5% + 0.5%
    expect(profile.frameworks).toContain('GDPR');
    expect(profile.frameworks).toContain('DORA');
    expect(profile.frameworks).toContain('NIS2');
  });

  it('compounds FCA on UK financial', () => {
    const profile = getRegulatoryCoverage('uk', 'financial');
    expect(profile.maxPctRevenue).toBe(0.055); // 4% + 1.5%
    expect(profile.frameworks).toContain('UK GDPR');
    expect(profile.frameworks).toContain('FCA / PRA');
  });

  it('returns only base frameworks for geography/industry without overlay', () => {
    const profile = getRegulatoryCoverage('hk', 'entertainment');
    expect(profile.maxPctRevenue).toBe(0.005);
    expect(profile.frameworks).toEqual(['PDPO']);
  });

  it('has all 7 threat types in ATTACK_PATTERN_FREQ', () => {
    expect(Object.keys(ATTACK_PATTERN_FREQ)).toHaveLength(7);
  });

  it('has all 5 revenue bands in INCIDENT_COST_BY_REVENUE', () => {
    expect(Object.keys(INCIDENT_COST_BY_REVENUE)).toHaveLength(5);
  });

  it('TEF_BY_INDUSTRY has valid PERT ranges (min < mode < max)', () => {
    Object.values(TEF_BY_INDUSTRY).forEach((tef) => {
      expect(tef.min).toBeLessThan(tef.mode);
      expect(tef.mode).toBeLessThan(tef.max);
    });
  });

  it('BASE_VULNERABILITY is between 0 and 1', () => {
    expect(BASE_VULNERABILITY).toBeGreaterThan(0);
    expect(BASE_VULNERABILITY).toBeLessThan(1);
  });

  it('REVENUE_MIDPOINTS are positive and increasing', () => {
    const values = Object.values(REVENUE_MIDPOINTS);
    values.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  it('EMPLOYEE_MULTIPLIERS are all positive', () => {
    Object.values(EMPLOYEE_MULTIPLIERS).forEach((m) => {
      expect(m).toBeGreaterThan(0);
    });
  });

  it('CLAIM_SEVERITY has valid PERT-like ordering (min < mode < max)', () => {
    expect(CLAIM_SEVERITY.min).toBeLessThan(CLAIM_SEVERITY.mode);
    expect(CLAIM_SEVERITY.mode).toBeLessThan(CLAIM_SEVERITY.max);
    expect(CLAIM_SEVERITY.p95).toBeLessThan(CLAIM_SEVERITY.max);
  });

  it('has all 6 geographies in REGULATORY_EXPOSURE', () => {
    expect(Object.keys(REGULATORY_EXPOSURE)).toHaveLength(6);
  });

  it('has all 17 industries in TEF_BY_INDUSTRY', () => {
    expect(Object.keys(TEF_BY_INDUSTRY)).toHaveLength(17);
  });

  it('has all 5 employee count bands in EMPLOYEE_MULTIPLIERS', () => {
    expect(Object.keys(EMPLOYEE_MULTIPLIERS)).toHaveLength(5);
  });

  it('has all 5 revenue bands in REVENUE_MIDPOINTS', () => {
    expect(Object.keys(REVENUE_MIDPOINTS)).toHaveLength(5);
  });
});
