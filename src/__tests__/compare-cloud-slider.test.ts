import { describe, it, expect } from 'vitest';
import { applyCloudOverride } from '@/lib/compare-utils';
import type { AssessmentInputs } from '@/lib/types';

const BASE: AssessmentInputs = {
  company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
  data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 30 },
  controls: { securityTeam: true, irPlan: true, aiAutomation: false, mfa: true, pentest: false, cyberInsurance: false },
  threats: { topConcerns: ['ransomware'], previousIncidents: '0' },
};

describe('applyCloudOverride', () => {
  it('overrides cloudPercentage with the given value', () => {
    const result = applyCloudOverride(BASE, 75);
    expect(result.data.cloudPercentage).toBe(75);
  });

  it('does not mutate the original inputs', () => {
    applyCloudOverride(BASE, 90);
    expect(BASE.data.cloudPercentage).toBe(30);
  });

  it('clamps cloudPercentage to [0, 100]', () => {
    expect(applyCloudOverride(BASE, -10).data.cloudPercentage).toBe(0);
    expect(applyCloudOverride(BASE, 150).data.cloudPercentage).toBe(100);
  });
});
