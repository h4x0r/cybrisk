import { describe, it, expect } from 'vitest';
import { optimalSpend } from '@/lib/gordon-loeb';

describe('gordon-loeb', () => {
  it('computes basic optimal spend', () => {
    // v=0.5, ale=$1M, revenue=$100M → 0.37 * 0.5 * 1_000_000 = 185_000
    expect(optimalSpend(0.5, 1_000_000, 100_000_000)).toBe(185_000);
  });

  it('caps at 5% of revenue when Gordon-Loeb exceeds it', () => {
    // v=1.0, ale=$50M, revenue=$10M → 0.37*1*50M=18.5M, but 5% of 10M=500K
    expect(optimalSpend(1.0, 50_000_000, 10_000_000)).toBe(500_000);
  });

  it('returns 0 when vulnerability is 0', () => {
    expect(optimalSpend(0, 1_000_000, 100_000_000)).toBe(0);
  });

  it('returns 0 when ALE is 0', () => {
    expect(optimalSpend(1.0, 0, 100_000_000)).toBe(0);
  });

  it('handles very small vulnerability', () => {
    // v=0.01, ale=$500K, revenue=$50M → 0.37 * 0.01 * 500K = 1,850
    expect(optimalSpend(0.01, 500_000, 50_000_000)).toBeCloseTo(1_850, 0);
  });

  it('uses revenue cap for high-risk small company', () => {
    // v=0.8, ale=$10M, revenue=$5M → 0.37*0.8*10M=2.96M, 5% of 5M=250K
    expect(optimalSpend(0.8, 10_000_000, 5_000_000)).toBe(250_000);
  });
});
